from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["expense", "income", "investment"]
    amount: float
    description: str
    category: str
    date: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    type: Literal["expense", "income", "investment"]
    amount: float
    description: str
    category: str
    date: str

class TransactionSummary(BaseModel):
    totalIncome: float
    totalExpenses: float
    totalInvestments: float
    balance: float

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Financial Tracker API"}

# Transaction endpoints
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    trans_dict = transaction.model_dump()
    trans_obj = Transaction(**trans_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = trans_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.transactions.insert_one(doc)
    return trans_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions():
    # Exclude MongoDB's _id field from the query results
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for trans in transactions:
        if isinstance(trans['createdAt'], str):
            trans['createdAt'] = datetime.fromisoformat(trans['createdAt'])
    
    # Sort by date (newest first)
    transactions.sort(key=lambda x: x['createdAt'], reverse=True)
    
    return transactions

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Transaction deleted successfully"}

@api_router.get("/transactions/summary", response_model=TransactionSummary)
async def get_summary():
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    total_investments = sum(t['amount'] for t in transactions if t['type'] == 'investment')
    
    balance = total_income - total_expenses - total_investments
    
    return TransactionSummary(
        totalIncome=total_income,
        totalExpenses=total_expenses,
        totalInvestments=total_investments,
        balance=balance
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()