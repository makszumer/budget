"""Budget envelope routes - Savings goals and envelope budgeting"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/budget-envelopes", tags=["envelopes"])

# Will be injected by main app
db = None


def init_router(database):
    """Initialize the router with database"""
    global db
    db = database


@router.get("")
async def get_budget_envelopes():
    """Get all budget envelopes"""
    envelopes = await db.budget_envelopes.find({}, {"_id": 0}).to_list(1000)
    return envelopes


@router.post("")
async def create_budget_envelope(envelope: dict):
    """Create a new budget envelope"""
    envelope_id = str(uuid.uuid4())
    envelope_data = {
        "id": envelope_id,
        "name": envelope.get("name"),
        "target_amount": envelope.get("target_amount"),
        "current_amount": envelope.get("current_amount", 0),
        "currency": envelope.get("currency", "USD"),
        "description": envelope.get("description", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.budget_envelopes.insert_one(envelope_data)
    return {"id": envelope_id, "message": "Budget envelope created successfully"}


@router.post("/{envelope_id}/allocate")
async def allocate_to_envelope(envelope_id: str, allocation: dict):
    """Allocate money to a budget envelope"""
    amount = allocation.get("amount", 0)
    
    envelope = await db.budget_envelopes.find_one({"id": envelope_id}, {"_id": 0})
    if not envelope:
        raise HTTPException(status_code=404, detail="Budget envelope not found")
    
    new_amount = envelope["current_amount"] + amount
    
    await db.budget_envelopes.update_one(
        {"id": envelope_id},
        {"$set": {"current_amount": new_amount}}
    )
    
    # Create expense transaction in main budget
    transaction_id = str(uuid.uuid4())
    transaction_data = {
        "id": transaction_id,
        "type": "expense",
        "amount": amount,
        "description": f"Allocated to {envelope['name']}",
        "category": "Budget Allocation / Envelope Transfer",
        "date": datetime.now(timezone.utc).isoformat().split('T')[0],
        "currency": envelope.get("currency", "USD"),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.transactions.insert_one(transaction_data)
    
    return {
        "message": "Money allocated successfully and expense recorded",
        "new_amount": new_amount,
        "transaction_id": transaction_id
    }


@router.delete("/{envelope_id}")
async def delete_budget_envelope(envelope_id: str):
    """Delete a budget envelope"""
    result = await db.budget_envelopes.delete_one({"id": envelope_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget envelope not found")
    
    await db.envelope_transactions.delete_many({"envelope_id": envelope_id})
    
    return {"message": "Budget envelope deleted successfully"}


@router.get("/{envelope_id}/transactions")
async def get_envelope_transactions(envelope_id: str):
    """Get all transactions for a specific envelope"""
    transactions = await db.envelope_transactions.find(
        {"envelope_id": envelope_id},
        {"_id": 0}
    ).to_list(1000)
    return sorted(transactions, key=lambda x: x['date'], reverse=True)


@router.post("/{envelope_id}/transactions")
async def create_envelope_transaction(envelope_id: str, transaction: dict):
    """Create a transaction for an envelope"""
    envelope = await db.budget_envelopes.find_one({"id": envelope_id}, {"_id": 0})
    if not envelope:
        raise HTTPException(status_code=404, detail="Budget envelope not found")
    
    transaction_id = str(uuid.uuid4())
    transaction_data = {
        "id": transaction_id,
        "envelope_id": envelope_id,
        "type": transaction.get("type"),
        "amount": transaction.get("amount"),
        "description": transaction.get("description", ""),
        "category": transaction.get("category"),
        "date": transaction.get("date"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.envelope_transactions.insert_one(transaction_data)
    
    amount = transaction.get("amount", 0)
    
    if transaction.get("type") == "income":
        await db.budget_envelopes.update_one(
            {"id": envelope_id},
            {"$inc": {"current_amount": amount}}
        )
        
        main_transaction_id = str(uuid.uuid4())
        main_transaction_data = {
            "id": main_transaction_id,
            "type": "expense",
            "amount": amount,
            "description": f"[{envelope['name']}] {transaction.get('description', transaction.get('category', 'Allocation'))}",
            "category": "Budget Allocation / Envelope Transfer",
            "date": transaction.get("date"),
            "currency": envelope.get("currency", "USD"),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "envelope_transaction_id": transaction_id,
        }
        await db.transactions.insert_one(main_transaction_data)
        
    elif transaction.get("type") == "expense":
        await db.budget_envelopes.update_one(
            {"id": envelope_id},
            {"$inc": {"current_amount": -amount}}
        )
        
        main_transaction_id = str(uuid.uuid4())
        main_transaction_data = {
            "id": main_transaction_id,
            "type": "expense",
            "amount": amount,
            "description": f"[{envelope['name']}] {transaction.get('description', transaction.get('category', 'Expense'))}",
            "category": transaction.get("category"),
            "date": transaction.get("date"),
            "currency": envelope.get("currency", "USD"),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "envelope_transaction_id": transaction_id,
        }
        await db.transactions.insert_one(main_transaction_data)
    
    return {"id": transaction_id, "message": "Transaction created successfully"}


@router.put("/{envelope_id}/transactions/{transaction_id}")
async def update_envelope_transaction(envelope_id: str, transaction_id: str, updated_transaction: dict):
    """Update a transaction in an envelope"""
    old_transaction = await db.envelope_transactions.find_one(
        {"id": transaction_id, "envelope_id": envelope_id},
        {"_id": 0}
    )
    
    if not old_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    envelope = await db.budget_envelopes.find_one({"id": envelope_id}, {"_id": 0})
    if not envelope:
        raise HTTPException(status_code=404, detail="Envelope not found")
    
    old_amount = old_transaction.get("amount", 0)
    old_type = old_transaction.get("type")
    new_amount = updated_transaction.get("amount", old_amount)
    new_type = updated_transaction.get("type", old_type)
    
    await db.envelope_transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "type": new_type,
            "amount": new_amount,
            "description": updated_transaction.get("description", ""),
            "category": updated_transaction.get("category", ""),
            "date": updated_transaction.get("date", old_transaction.get("date")),
        }}
    )
    
    if old_type == new_type:
        amount_diff = new_amount - old_amount
        if new_type == "income":
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": amount_diff}}
            )
        else:
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": -amount_diff}}
            )
        
        await db.transactions.update_one(
            {"envelope_transaction_id": transaction_id},
            {"$set": {
                "amount": new_amount,
                "date": updated_transaction.get("date", old_transaction.get("date")),
                "description": f"[{envelope['name']}] {updated_transaction.get('description', updated_transaction.get('category', ''))}",
                "category": updated_transaction.get("category") if new_type == "expense" else "Budget Allocation / Envelope Transfer"
            }}
        )
    else:
        if old_type == "income":
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": -old_amount}}
            )
        else:
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": old_amount}}
            )
        
        await db.transactions.delete_one({"envelope_transaction_id": transaction_id})
        
        if new_type == "income":
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": new_amount}}
            )
        else:
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": -new_amount}}
            )
        
        main_transaction_id = str(uuid.uuid4())
        main_transaction_data = {
            "id": main_transaction_id,
            "type": "expense",
            "amount": new_amount,
            "description": f"[{envelope['name']}] {updated_transaction.get('description', updated_transaction.get('category', ''))}",
            "category": updated_transaction.get("category") if new_type == "expense" else "Budget Allocation / Envelope Transfer",
            "date": updated_transaction.get("date"),
            "currency": envelope.get("currency", "USD"),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "envelope_transaction_id": transaction_id,
        }
        await db.transactions.insert_one(main_transaction_data)
    
    return {"message": "Transaction updated successfully"}


@router.delete("/{envelope_id}/transactions/{transaction_id}")
async def delete_envelope_transaction(envelope_id: str, transaction_id: str):
    """Delete a transaction from an envelope"""
    transaction = await db.envelope_transactions.find_one(
        {"id": transaction_id, "envelope_id": envelope_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    await db.envelope_transactions.delete_one({"id": transaction_id})
    
    amount = transaction.get("amount", 0)
    if transaction.get("type") == "income":
        await db.budget_envelopes.update_one(
            {"id": envelope_id},
            {"$inc": {"current_amount": -amount}}
        )
    elif transaction.get("type") == "expense":
        await db.budget_envelopes.update_one(
            {"id": envelope_id},
            {"$inc": {"current_amount": amount}}
        )
    
    await db.transactions.delete_one({"envelope_transaction_id": transaction_id})
    
    return {"message": "Transaction deleted successfully"}
