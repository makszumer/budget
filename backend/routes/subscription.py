from fastapi import APIRouter, HTTPException, Depends, Request, status
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
sys.path.append('/app/backend')

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional, Literal
import uuid

router = APIRouter(prefix="/subscription", tags=["subscription"])

# Database dependency
def get_db():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    return client[os.environ['DB_NAME']]

# Trial duration in days
TRIAL_DURATION_DAYS = 3

# Subscription packages (FIXED PRICES - NEVER FROM FRONTEND)
PACKAGES = {
    "monthly": {"amount": 4.00, "duration_days": 30, "name": "Monthly Premium"},
    "yearly": {"amount": 36.00, "duration_days": 365, "name": "Yearly Premium"},
    # Discounted packages (50% off)
    "monthly_discount": {"amount": 2.00, "duration_days": 30, "name": "Monthly Premium (50% Off)", "discount_months": 6},
    "yearly_discount": {"amount": 18.00, "duration_days": 365, "name": "Yearly Premium (50% Off)"},
}

class CheckoutRequest(BaseModel):
    package_id: Literal["monthly", "yearly", "monthly_discount", "yearly_discount"]
    origin_url: str
    apply_discount: bool = False

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

class CheckoutStatusRequest(BaseModel):
    session_id: str

@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    current_user_id: str = Depends(get_current_user)
):
    """Create a Stripe checkout session for subscription"""
    db = get_db()
    
    # Validate package
    if request.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    package = PACKAGES[request.package_id]
    amount = package["amount"]
    
    # Get user info
    user = await db.users.find_one({"id": current_user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if trying to use discount packages
    if request.package_id in ["monthly_discount", "yearly_discount"]:
        # Verify user is eligible for discount (trial ended but not subscribed)
        if user.get('discount_used', False):
            raise HTTPException(status_code=400, detail="Discount has already been used")
        
        # Mark discount as used when they proceed to checkout
        await db.users.update_one(
            {"id": current_user_id},
            {"$set": {"discount_used": True}}
        )
    
    # Initialize Stripe
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    webhook_url = f"{request.origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session
    success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/subscription/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user_id,
            "package_id": request.package_id,
            "email": user['email'],
            "username": user['username'],
            "is_discounted": request.package_id in ["monthly_discount", "yearly_discount"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Store payment transaction
    payment_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": current_user_id,
        "email": user['email'],
        "package_id": request.package_id,
        "amount": amount,
        "currency": "eur",
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "metadata": checkout_request.metadata
    }
    
    await db.payment_transactions.insert_one(payment_doc)
    
    return CheckoutResponse(
        checkout_url=session.url,
        session_id=session.session_id
    )

@router.post("/check-payment-status")
async def check_payment_status(
    request: CheckoutStatusRequest,
    current_user_id: str = Depends(get_current_user)
):
    """Check the status of a payment session"""
    db = get_db()
    
    # Get payment record
    payment = await db.payment_transactions.find_one(
        {"session_id": request.session_id, "user_id": current_user_id},
        {"_id": 0}
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If already processed, return the status
    if payment['payment_status'] == 'paid':
        return {"status": "success", "message": "Payment already processed"}
    
    # Initialize Stripe
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    # Check status from Stripe
    try:
        checkout_status = await stripe_checkout.get_checkout_status(request.session_id)
        
        # Update payment record
        await db.payment_transactions.update_one(
            {"session_id": request.session_id},
            {
                "$set": {
                    "payment_status": checkout_status.payment_status,
                    "status": checkout_status.status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # If payment is successful and not yet processed
        if checkout_status.payment_status == 'paid' and payment['payment_status'] != 'paid':
            # Upgrade user to premium
            package = PACKAGES[payment['package_id']]
            expires_at = datetime.now(timezone.utc) + timedelta(days=package['duration_days'])
            
            await db.users.update_one(
                {"id": current_user_id},
                {
                    "$set": {
                        "subscription_level": "premium",
                        "subscription_expires_at": expires_at.isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            return {
                "status": "success",
                "message": "Payment successful! You are now a premium user.",
                "expires_at": expires_at.isoformat()
            }
        
        elif checkout_status.status == 'expired':
            return {"status": "expired", "message": "Payment session expired"}
        
        else:
            return {"status": "pending", "message": "Payment is being processed"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking payment status: {str(e)}")

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    db = get_db()
    
    # Get webhook body and signature
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": webhook_response.session_id},
            {
                "$set": {
                    "payment_status": webhook_response.payment_status,
                    "event_type": webhook_response.event_type,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # If payment successful, upgrade user
        if webhook_response.payment_status == 'paid':
            payment = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )
            
            if payment:
                user_id = payment['user_id']
                package_id = payment['package_id']
                package = PACKAGES[package_id]
                
                expires_at = datetime.now(timezone.utc) + timedelta(days=package['duration_days'])
                
                await db.users.update_one(
                    {"id": user_id},
                    {
                        "$set": {
                            "subscription_level": "premium",
                            "subscription_expires_at": expires_at.isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
        
        return {"status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
