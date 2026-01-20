"""Transaction routes - CRUD operations for transactions"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import logging

from models.transaction import Transaction, TransactionCreate, TransactionSummary
from auth import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["transactions"])

# These will be injected by the main app
db = None
exchange_service = None

# Fallback exchange rates
EXCHANGE_RATES = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 149.50, "CHF": 0.88,
    "CAD": 1.36, "AUD": 1.52, "CNY": 7.24, "INR": 83.12, "BRL": 4.97,
    "MXN": 17.15, "KRW": 1320.50, "SGD": 1.34, "HKD": 7.82, "NOK": 10.65,
    "SEK": 10.42, "DKK": 6.87, "NZD": 1.64, "ZAR": 18.75, "RUB": 92.50,
}


def init_router(database, exchange_svc):
    """Initialize the router with database and exchange service"""
    global db, exchange_service
    db = database
    exchange_service = exchange_svc


def convert_to_usd(amount: float, currency: str) -> float:
    """Convert amount from given currency to USD (fallback method)"""
    if currency == "USD":
        return amount
    rate = EXCHANGE_RATES.get(currency, 1.0)
    return amount / rate


@router.post("", response_model=Transaction)
async def create_transaction(
    transaction: TransactionCreate,
    current_user_id: str = Depends(get_current_user_optional)
):
    """Create a new transaction with optional currency conversion"""
    trans_dict = transaction.model_dump()
    
    # Get user's primary currency if authenticated
    primary_currency = "USD"
    if current_user_id:
        user = await db.users.find_one({"id": current_user_id}, {"_id": 0})
        if user:
            primary_currency = user.get("primary_currency", "USD")
    
    # Check if conversion is needed
    source_currency = transaction.convert_from_currency or transaction.currency
    needs_conversion = source_currency and source_currency.upper() != primary_currency.upper()
    
    if needs_conversion and source_currency:
        try:
            conversion = await exchange_service.convert(
                amount=transaction.amount,
                from_currency=source_currency,
                to_currency=primary_currency
            )
            
            trans_dict['original_amount'] = transaction.amount
            trans_dict['original_currency'] = source_currency.upper()
            trans_dict['amount'] = conversion['converted_amount']
            trans_dict['currency'] = primary_currency
            trans_dict['exchange_rate'] = conversion['exchange_rate']
            trans_dict['conversion_date'] = conversion['conversion_date']
            trans_dict['is_estimated_rate'] = conversion['is_estimated']
            
        except Exception as e:
            logger.error(f"Currency conversion failed: {e}")
            rate = EXCHANGE_RATES.get(source_currency.upper(), 1.0) / EXCHANGE_RATES.get(primary_currency, 1.0)
            converted_amount = round(transaction.amount / rate, 2) if rate != 0 else transaction.amount
            
            trans_dict['original_amount'] = transaction.amount
            trans_dict['original_currency'] = source_currency.upper()
            trans_dict['amount'] = converted_amount
            trans_dict['currency'] = primary_currency
            trans_dict['exchange_rate'] = round(1/rate if rate != 0 else 1.0, 6)
            trans_dict['conversion_date'] = datetime.now(timezone.utc).isoformat()
            trans_dict['is_estimated_rate'] = True
    else:
        trans_dict['currency'] = primary_currency
        trans_dict['original_amount'] = None
        trans_dict['original_currency'] = None
        trans_dict['exchange_rate'] = None
        trans_dict['conversion_date'] = None
        trans_dict['is_estimated_rate'] = False
    
    trans_dict.pop('convert_from_currency', None)
    trans_obj = Transaction(**trans_dict)
    
    doc = trans_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.transactions.insert_one(doc)
    return trans_obj


@router.get("", response_model=List[Transaction])
async def get_transactions():
    """Get all transactions sorted by date (newest first)"""
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    
    for trans in transactions:
        if isinstance(trans['createdAt'], str):
            trans['createdAt'] = datetime.fromisoformat(trans['createdAt'])
    
    transactions.sort(key=lambda x: x['createdAt'], reverse=True)
    return transactions


@router.put("/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction: TransactionCreate):
    """Update an existing transaction"""
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    updated_doc = transaction.model_dump()
    updated_doc['id'] = transaction_id
    updated_doc['createdAt'] = existing['createdAt']
    
    await db.transactions.replace_one({"id": transaction_id}, updated_doc)
    
    if isinstance(updated_doc['createdAt'], str):
        updated_doc['createdAt'] = datetime.fromisoformat(updated_doc['createdAt'])
    
    return Transaction(**updated_doc)


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: str):
    """Delete a transaction and clean up related envelope transactions"""
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    result = await db.transactions.delete_one({"id": transaction_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Clean up linked envelope transactions
    envelope_transaction_id = transaction.get("envelope_transaction_id")
    if envelope_transaction_id:
        envelope_txn = await db.envelope_transactions.find_one(
            {"id": envelope_transaction_id}, {"_id": 0}
        )
        
        if envelope_txn:
            envelope_id = envelope_txn.get("envelope_id")
            amount = envelope_txn.get("amount", 0)
            txn_type = envelope_txn.get("type")
            
            await db.envelope_transactions.delete_one({"id": envelope_transaction_id})
            
            if txn_type == "income":
                await db.budget_envelopes.update_one(
                    {"id": envelope_id},
                    {"$inc": {"current_amount": -amount}}
                )
            elif txn_type == "expense":
                await db.budget_envelopes.update_one(
                    {"id": envelope_id},
                    {"$inc": {"current_amount": amount}}
                )
    
    return {"message": "Transaction deleted successfully"}


@router.get("/summary", response_model=TransactionSummary)
async def get_summary():
    """Get transaction summary totals"""
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    total_investments = sum(t['amount'] for t in transactions if t['type'] == 'investment')
    balance = total_income - total_expenses
    
    return TransactionSummary(
        totalIncome=total_income,
        totalExpenses=total_expenses,
        totalInvestments=total_investments,
        balance=balance
    )
