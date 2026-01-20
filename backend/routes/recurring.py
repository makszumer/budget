"""Recurring transactions routes - Standing orders management"""
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timezone, date as date_module
import calendar

from models.transaction import RecurringTransaction, RecurringTransactionCreate, Transaction, TransactionCreate

router = APIRouter(prefix="/recurring-transactions", tags=["recurring"])

# Will be injected by main app
db = None


def init_router(database):
    """Initialize the router with database"""
    global db
    db = database


def convert_to_usd(amount: float, currency: str) -> float:
    """Convert amount from given currency to USD"""
    rates = {
        "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 149.50,
        "CHF": 0.88, "CAD": 1.36, "AUD": 1.52, "CNY": 7.24,
    }
    if currency == "USD":
        return amount
    rate = rates.get(currency, 1.0)
    return amount / rate


@router.post("", response_model=RecurringTransaction)
async def create_recurring_transaction(recurring: RecurringTransactionCreate):
    """Create a new recurring transaction"""
    rec_dict = recurring.model_dump()
    rec_obj = RecurringTransaction(**rec_dict)
    
    doc = rec_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.recurring_transactions.insert_one(doc)
    return rec_obj


@router.get("", response_model=List[RecurringTransaction])
async def get_recurring_transactions():
    """Get all recurring transactions"""
    recurring = await db.recurring_transactions.find({}, {"_id": 0}).to_list(1000)
    
    for rec in recurring:
        if isinstance(rec['createdAt'], str):
            rec['createdAt'] = datetime.fromisoformat(rec['createdAt'])
    
    return recurring


@router.delete("/{recurring_id}")
async def delete_recurring_transaction(recurring_id: str):
    """Delete a recurring transaction"""
    result = await db.recurring_transactions.delete_one({"id": recurring_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    return {"message": "Recurring transaction deleted successfully"}


@router.put("/{recurring_id}/toggle")
async def toggle_recurring_transaction(recurring_id: str):
    """Toggle active status of a recurring transaction"""
    recurring = await db.recurring_transactions.find_one({"id": recurring_id})
    
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    new_active = not recurring.get('active', True)
    await db.recurring_transactions.update_one(
        {"id": recurring_id},
        {"$set": {"active": new_active}}
    )
    
    return {"message": f"Recurring transaction {'activated' if new_active else 'deactivated'}"}


@router.post("/process")
async def process_recurring_transactions():
    """Process due recurring transactions"""
    recurring_list = await db.recurring_transactions.find({"active": True}, {"_id": 0}).to_list(1000)
    created_count = 0
    
    today = date_module.today()
    
    for rec in recurring_list:
        start_date = date_module.fromisoformat(rec['start_date'])
        end_date = date_module.fromisoformat(rec['end_date']) if rec.get('end_date') else None
        last_created = date_module.fromisoformat(rec['last_created']) if rec.get('last_created') else None
        
        should_create = False
        transaction_date = None
        
        if today < start_date:
            continue
        
        if end_date and today > end_date:
            continue
        
        if rec['frequency'] == 'daily':
            if not last_created or last_created < today:
                should_create = True
                transaction_date = today
                
        elif rec['frequency'] == 'weekly':
            if today.weekday() == rec.get('day_of_week', 0):
                if not last_created or (today - last_created).days >= 7:
                    should_create = True
                    transaction_date = today
                    
        elif rec['frequency'] == 'monthly':
            target_day = rec.get('day_of_month', 1)
            last_day_of_month = calendar.monthrange(today.year, today.month)[1]
            effective_day = min(target_day, last_day_of_month)
            
            if today.day == effective_day:
                if not last_created or last_created.month != today.month or last_created.year != today.year:
                    should_create = True
                    transaction_date = today
                    
        elif rec['frequency'] == 'yearly':
            if not last_created or last_created.year < today.year:
                if today.month == start_date.month and today.day == start_date.day:
                    should_create = True
                    transaction_date = today
        
        if should_create and transaction_date:
            trans_create = TransactionCreate(
                type=rec['type'],
                amount=rec['amount'],
                description=rec['description'] + " [Standing Order]",
                category=rec['category'],
                date=transaction_date.isoformat(),
                currency=rec.get('currency', 'USD')
            )
            
            trans_obj = Transaction(**trans_create.model_dump())
            
            doc = trans_obj.model_dump()
            doc['createdAt'] = doc['createdAt'].isoformat()
            doc['is_standing_order'] = True
            doc['standing_order_id'] = rec['id']
            doc['amount_usd'] = convert_to_usd(trans_obj.amount, trans_obj.currency)
            
            await db.transactions.insert_one(doc)
            
            await db.recurring_transactions.update_one(
                {"id": rec['id']},
                {"$set": {"last_created": transaction_date.isoformat()}}
            )
            
            created_count += 1
    
    return {"message": f"Created {created_count} recurring transactions", "created_count": created_count}
