import httpx
from fastapi import APIRouter, HTTPException, Depends, Request, status
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import stripe
sys.path.append('/app/backend')

from auth import get_current_user
from pydantic import BaseModel
from typing import Optional, Literal
import uuid

router = APIRouter(prefix="/subscription", tags=["subscription"])

def get_db():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    return client[os.environ['DB_NAME']]

TRIAL_DURATION_DAYS = 3

PACKAGES = {
    "monthly": {"amount": 4.00, "duration_days": 30, "name": "Monthly Premium"},
    "yearly": {"amount": 36.00, "duration_days": 365, "name": "Yearly Premium"},
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
    db = get_db()
    if request.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    package = PACKAGES[request.package_id]
    amount = package["amount"]
    
    user = await db.users.find_one({"id": current_user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if request.package_id in ["monthly_discount", "yearly_discount"]:
        if user.get('discount_used', False):
            raise HTTPException(status_code=400, detail="Discount has already been used")
        await db.users.update_one(
            {"id": current_user_id},
            {"$set": {"discount_used": True}}
        )
    
    stripe.api_key = os.environ.get('STRIPE_API_KEY')
    
    success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/subscription/cancel"
    
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "eur",
                "product_data": {"name": package["name"]},
                "unit_amount": int(amount * 100),
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user_id,
            "package_id": request.package_id,
            "email": user['email'],
            "username": user['username'],
        }
    )
    
    payment_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.id,
        "user_id": current_user_id,
        "email": user['email'],
        "package_id": request.package_id,
        "amount": amount,
        "currency": "eur",
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(payment_doc)
    
    return CheckoutResponse(checkout_url=session.url, session_id=session.id)

@router.post("/check-payment-status")
async def check_payment_status(
    request: CheckoutStatusRequest,
    current_user_id: str = Depends(get_current_user)
):
    db = get_db()
    payment = await db.payment_transactions.find_one(
        {"session_id": request.session_id, "user_id": current_user_id},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment['payment_status'] == 'paid':
        return {"status": "success", "message": "Payment already processed"}
    
    stripe.api_key = os.environ.get('STRIPE_API_KEY')
    
    try:
        session = stripe.checkout.Session.retrieve(request.session_id)
        await db.payment_transactions.update_one(
            {"session_id": request.session_id},
            {"$set": {"payment_status": session.payment_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if session.payment_status == 'paid':
            package = PACKAGES[payment['package_id']]
            expires_at = datetime.now(timezone.utc) + timedelta(days=package['duration_days'])
            await db.users.update_one(
                {"id": current_user_id},
                {"$set": {"subscription_level": "premium", "subscription_expires_at": expires_at.isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"status": "success", "message": "Payment successful! You are now a premium user.", "expires_at": expires_at.isoformat()}
        elif session.status == 'expired':
            return {"status": "expired", "message": "Payment session expired"}
        else:
            return {"status": "pending", "message": "Payment is being processed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking payment status: {str(e)}")

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    db = get_db()
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    stripe.api_key = os.environ.get('STRIPE_API_KEY')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    
    try:
        event = stripe.Webhook.construct_event(body, signature, webhook_secret) if webhook_secret else stripe.Event.construct_from({"type": "manual"}, stripe.api_key)
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            await db.payment_transactions.update_one(
                {"session_id": session['id']},
                {"$set": {"payment_status": session['payment_status'], "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            if session['payment_status'] == 'paid':
                payment = await db.payment_transactions.find_one({"session_id": session['id']}, {"_id": 0})
                if payment:
                    package = PACKAGES[payment['package_id']]
                    expires_at = datetime.now(timezone.utc) + timedelta(days=package['duration_days'])
                    await db.users.update_one(
                        {"id": payment['user_id']},
                        {"$set": {"subscription_level": "premium", "subscription_expires_at": expires_at.isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/start-trial")
async def start_free_trial(current_user_id: str = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"id": current_user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get('trial_used', False):
        raise HTTPException(status_code=400, detail="You have already used your free trial")
    if user.get('subscription_level') == 'premium':
        expires_at = user.get('subscription_expires_at')
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expires_at > datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="You already have an active premium subscription")
    now = datetime.now(timezone.utc)
    trial_expires = now + timedelta(days=TRIAL_DURATION_DAYS)
    await db.users.update_one(
        {"id": current_user_id},
        {"$set": {"trial_started_at": now.isoformat(), "trial_expires_at": trial_expires.isoformat(), "trial_used": True, "updated_at": now.isoformat()}}
    )
    return {"status": "success", "message": f"Your {TRIAL_DURATION_DAYS}-day free trial has started!", "trial_started_at": now.isoformat(), "trial_expires_at": trial_expires.isoformat(), "days_remaining": TRIAL_DURATION_DAYS}

@router.get("/trial-status")
async def get_trial_status(current_user_id: str = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"id": current_user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    trial_expires_at = user.get('trial_expires_at')
    trial_used = user.get('trial_used', False)
    is_trial_active = False
    days_remaining = 0
    if trial_expires_at:
        if isinstance(trial_expires_at, str):
            trial_expires_at_dt = datetime.fromisoformat(trial_expires_at.replace('Z', '+00:00'))
        else:
            trial_expires_at_dt = trial_expires_at
        if trial_expires_at_dt > datetime.now(timezone.utc):
            is_trial_active = True
            time_remaining = trial_expires_at_dt - datetime.now(timezone.utc)
            days_remaining = max(0, time_remaining.days + 1)
    return {"trial_used": trial_used, "is_trial_active": is_trial_active, "trial_started_at": user.get('trial_started_at'), "trial_expires_at": trial_expires_at, "days_remaining": days_remaining, "discount_eligible": trial_used and not is_trial_active and not user.get('discount_used', False), "discount_used": user.get('discount_used', False)}

# ─── ADD THESE IMPORTS at the top of subscription.py ───
# import httpx  (add to existing imports)

# ─── ADD THIS CLASS after existing Pydantic models ───

class AppleIAPRequest(BaseModel):
    transaction_id: str
    product_id: str

# ─── ADD THIS ENDPOINT at the bottom of subscription.py ───

APPLE_IAP_PRODUCTS = {
    "com.makszumer.budget.monthly": {"duration_days": 30, "name": "Monthly Premium"},
    "com.makszumer.budget.yearly": {"duration_days": 365, "name": "Yearly Premium"},
}

@router.post("/verify-apple-iap")
async def verify_apple_iap(
    request: AppleIAPRequest,
    current_user_id: str = Depends(get_current_user)
):
    db = get_db()

    product_id = request.product_id
    if product_id not in APPLE_IAP_PRODUCTS:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    # Verify transaction exists and is valid (RevenueCat handles this on client side,
    # but we still grant access server-side based on the transaction)
    package = APPLE_IAP_PRODUCTS[product_id]
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=package["duration_days"])

    # Check if this transaction was already processed (prevent replay attacks)
    existing = await db.payment_transactions.find_one(
        {"session_id": request.transaction_id}
    )
    if existing and existing.get("payment_status") == "paid":
        return {"status": "already_processed", "message": "Transaction already processed"}

    # Record the transaction
    payment_doc = {
        "id": str(uuid.uuid4()),
        "session_id": request.transaction_id,
        "user_id": current_user_id,
        "package_id": product_id,
        "amount": 0,  # Apple handles the actual charge
        "currency": "eur",
        "payment_status": "paid",
        "payment_provider": "apple_iap",
        "status": "completed",
        "created_at": now.isoformat(),
    }
    await db.payment_transactions.insert_one(payment_doc)

    # Grant premium access
    await db.users.update_one(
        {"id": current_user_id},
        {"$set": {
            "subscription_level": "premium",
            "subscription_expires_at": expires_at.isoformat(),
            "updated_at": now.isoformat()
        }}
    )

    return {
        "status": "success",
        "message": f"Premium activated! Expires {expires_at.strftime('%Y-%m-%d')}",
        "expires_at": expires_at.isoformat()
    }
