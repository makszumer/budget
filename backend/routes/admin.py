from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
sys.path.append('/app/backend')

from models import AdminBankInfo, AdminCredentials
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])

# Admin credentials (in production, use environment variables)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"  # In production, hash this!

# Database dependency
def get_db():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    return client[os.environ['DB_NAME']]

async def verify_admin(credentials: AdminCredentials):
    """Verify admin credentials"""
    if credentials.username != ADMIN_USERNAME or credentials.password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid admin credentials'
        )
    return True

@router.post("/bank-info", response_model=AdminBankInfo)
async def update_bank_info(
    credentials: AdminCredentials,
    bank_info: AdminBankInfo
):
    """Update admin bank information (admin only)"""
    await verify_admin(credentials)
    
    db = get_db()
    
    # Update or create bank info
    bank_data = bank_info.model_dump()
    bank_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.admin_bank_info.update_one(
        {},
        {"$set": bank_data},
        upsert=True
    )
    
    return bank_info

@router.post("/bank-info/view")
async def get_bank_info(credentials: AdminCredentials):
    """Get admin bank information (admin only)"""
    await verify_admin(credentials)
    
    db = get_db()
    
    bank_info = await db.admin_bank_info.find_one({}, {"_id": 0})
    
    if not bank_info:
        raise HTTPException(status_code=404, detail='No bank information found')
    
    return bank_info

@router.get("/stats")
async def get_admin_stats(username: str, password: str):
    """Get admin statistics"""
    credentials = AdminCredentials(username=username, password=password)
    await verify_admin(credentials)
    
    db = get_db()
    
    # Get user statistics
    total_users = await db.users.count_documents({})
    premium_users = await db.users.count_documents({"subscription_level": "premium"})
    free_users = total_users - premium_users
    
    # Get payment statistics
    total_payments = await db.payment_transactions.count_documents({})
    successful_payments = await db.payment_transactions.count_documents({"payment_status": "paid"})
    
    # Calculate revenue
    payments = await db.payment_transactions.find(
        {"payment_status": "paid"},
        {"_id": 0, "amount": 1}
    ).to_list(1000)
    
    total_revenue = sum(p.get('amount', 0) for p in payments)
    
    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "free_users": free_users,
        "total_payments": total_payments,
        "successful_payments": successful_payments,
        "total_revenue": total_revenue,
        "currency": "EUR"
    }
