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
    description: Optional[str] = ""
    category: str
    date: str
    # Investment specific fields
    asset: Optional[str] = None  # Stock ticker, crypto symbol, etc.
    quantity: Optional[float] = None  # Number of shares/coins
    purchase_price: Optional[float] = None  # Price per unit at purchase
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    type: Literal["expense", "income", "investment"]
    amount: float
    description: Optional[str] = ""
    category: str
    date: str
    asset: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None

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

# Portfolio specific endpoints
class PortfolioHolding(BaseModel):
    asset: str
    category: str
    total_quantity: float
    total_invested: float
    average_price: float
    current_price: float
    current_value: float
    gain_loss: float
    roi_percentage: float

class PortfolioSummary(BaseModel):
    holdings: List[PortfolioHolding]
    total_invested: float
    current_value: float
    total_gain_loss: float
    total_roi_percentage: float

# Mock current prices for demonstration
MOCK_PRICES = {
    # Stocks
    "AAPL": 185.50, "GOOGL": 142.30, "MSFT": 378.90, "TSLA": 242.80,
    "AMZN": 155.20, "NVDA": 495.60, "META": 352.40, "NFLX": 485.30,
    # Crypto
    "BTC": 43250.00, "ETH": 2280.50, "SOL": 98.75, "BNB": 315.20,
    "ADA": 0.52, "DOT": 6.85, "MATIC": 0.89, "AVAX": 36.40,
}

@api_router.get("/portfolio", response_model=PortfolioSummary)
async def get_portfolio():
    investments = await db.transactions.find(
        {"type": "investment", "asset": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    # Group by asset
    holdings_map = {}
    for inv in investments:
        asset = inv.get('asset')
        if not asset:
            continue
            
        if asset not in holdings_map:
            holdings_map[asset] = {
                'category': inv['category'],
                'total_quantity': 0,
                'total_invested': 0,
                'transactions': []
            }
        
        qty = inv.get('quantity', 0)
        holdings_map[asset]['total_quantity'] += qty
        holdings_map[asset]['total_invested'] += inv['amount']
        holdings_map[asset]['transactions'].append(inv)
    
    # Calculate portfolio
    holdings = []
    total_invested = 0
    current_value = 0
    
    for asset, data in holdings_map.items():
        total_qty = data['total_quantity']
        invested = data['total_invested']
        avg_price = invested / total_qty if total_qty > 0 else 0
        
        # Get current price (mock)
        current_price = MOCK_PRICES.get(asset, avg_price * 1.1)  # Default 10% gain
        curr_value = total_qty * current_price
        gain_loss = curr_value - invested
        roi = (gain_loss / invested * 100) if invested > 0 else 0
        
        holdings.append(PortfolioHolding(
            asset=asset,
            category=data['category'],
            total_quantity=total_qty,
            total_invested=invested,
            average_price=avg_price,
            current_price=current_price,
            current_value=curr_value,
            gain_loss=gain_loss,
            roi_percentage=roi
        ))
        
        total_invested += invested
        current_value += curr_value
    
    total_gain_loss = current_value - total_invested
    total_roi = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
    
    return PortfolioSummary(
        holdings=holdings,
        total_invested=total_invested,
        current_value=current_value,
        total_gain_loss=total_gain_loss,
        total_roi_percentage=total_roi
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