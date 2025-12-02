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
    currency: str = "USD"
    amount_usd: Optional[float] = None  # Converted amount in USD
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
    currency: Optional[str] = "USD"

# Recurring transactions (standing orders)
class RecurringTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["expense", "income"]
    amount: float
    description: str
    category: str
    currency: str = "USD"
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    day_of_month: Optional[int] = None  # For monthly (1-31)
    day_of_week: Optional[int] = None   # For weekly (0=Monday, 6=Sunday)
    start_date: str
    end_date: Optional[str] = None
    last_created: Optional[str] = None
    active: bool = True
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecurringTransactionCreate(BaseModel):
    type: Literal["expense", "income"]
    amount: float
    description: str
    category: str
    currency: str = "USD"
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    start_date: str
    end_date: Optional[str] = None

# Exchange rates (mock data - in production, fetch from API)
EXCHANGE_RATES = {
    "USD": 1.0,      # US Dollar (base)
    "EUR": 0.92,     # Euro
    "GBP": 0.79,     # British Pound
    "JPY": 149.50,   # Japanese Yen
    "CHF": 0.88,     # Swiss Franc
    "CAD": 1.36,     # Canadian Dollar
    "AUD": 1.52,     # Australian Dollar
    "CNY": 7.24,     # Chinese Yuan
    "INR": 83.12,    # Indian Rupee
    "BRL": 4.97,     # Brazilian Real
}

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
def convert_to_usd(amount: float, currency: str) -> float:
    """Convert amount from given currency to USD"""
    if currency == "USD":
        return amount
    rate = EXCHANGE_RATES.get(currency, 1.0)
    return amount / rate

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    trans_dict = transaction.model_dump()
    trans_obj = Transaction(**trans_dict)
    
    # Convert amount to USD for calculations
    trans_obj.amount_usd = convert_to_usd(trans_obj.amount, trans_obj.currency)
    
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

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction: TransactionCreate):
    # Find and update the transaction
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update with new data but keep the original id and createdAt
    updated_doc = transaction.model_dump()
    updated_doc['id'] = transaction_id
    updated_doc['createdAt'] = existing['createdAt']
    
    await db.transactions.replace_one({"id": transaction_id}, updated_doc)
    
    # Convert createdAt back to datetime for response
    if isinstance(updated_doc['createdAt'], str):
        updated_doc['createdAt'] = datetime.fromisoformat(updated_doc['createdAt'])
    
    return Transaction(**updated_doc)

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
    
    # Investments count as positive (savings), not negative
    balance = total_income - total_expenses
    
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

import yfinance as yf
from collections import defaultdict

# Cache for prices to avoid repeated API calls
price_cache = {}

def get_current_price(symbol, category):
    """Fetch current price from Yahoo Finance"""
    if symbol in price_cache:
        return price_cache[symbol]
    
    try:
        # Map crypto symbols to Yahoo Finance format
        if category == "Crypto":
            symbol_map = {
                "BTC": "BTC-USD",
                "ETH": "ETH-USD",
                "SOL": "SOL-USD",
                "BNB": "BNB-USD",
                "ADA": "ADA-USD",
                "DOT": "DOT-USD",
                "MATIC": "MATIC-USD",
                "AVAX": "AVAX-USD",
            }
            ticker_symbol = symbol_map.get(symbol, f"{symbol}-USD")
        else:
            ticker_symbol = symbol
        
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        
        # Try different price fields
        price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
        
        if price:
            price_cache[symbol] = price
            return price
    except Exception as e:
        logging.warning(f"Failed to fetch price for {symbol}: {e}")
    
    # Fallback to mock prices if API fails
    fallback_prices = {
        "AAPL": 185.50, "GOOGL": 142.30, "MSFT": 378.90, "TSLA": 242.80,
        "AMZN": 155.20, "NVDA": 495.60, "META": 352.40, "NFLX": 485.30,
        "BTC": 43250.00, "ETH": 2280.50, "SOL": 98.75, "BNB": 315.20,
        "ADA": 0.52, "DOT": 6.85, "MATIC": 0.89, "AVAX": 36.40,
    }
    return fallback_prices.get(symbol, 100.0)

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
        
        # Get current price from Yahoo Finance
        current_price = get_current_price(asset, data['category'])
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

# Analytics endpoints
class CategoryBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float

class AnalyticsData(BaseModel):
    expense_breakdown: List[CategoryBreakdown]
    income_breakdown: List[CategoryBreakdown]
    investment_breakdown: List[CategoryBreakdown]

@api_router.get("/analytics", response_model=AnalyticsData)
async def get_analytics():
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    
    # Expense breakdown
    expense_by_category = {}
    for t in transactions:
        if t['type'] == 'expense':
            cat = t['category']
            expense_by_category[cat] = expense_by_category.get(cat, 0) + t['amount']
    
    total_expenses = sum(expense_by_category.values())
    expense_breakdown = [
        CategoryBreakdown(
            category=cat,
            amount=amt,
            percentage=(amt / total_expenses * 100) if total_expenses > 0 else 0
        )
        for cat, amt in expense_by_category.items()
    ]
    
    # Income breakdown
    income_by_category = {}
    for t in transactions:
        if t['type'] == 'income':
            cat = t['category']
            income_by_category[cat] = income_by_category.get(cat, 0) + t['amount']
    
    total_income = sum(income_by_category.values())
    income_breakdown = [
        CategoryBreakdown(
            category=cat,
            amount=amt,
            percentage=(amt / total_income * 100) if total_income > 0 else 0
        )
        for cat, amt in income_by_category.items()
    ]
    
    # Investment breakdown
    investment_by_category = {}
    for t in transactions:
        if t['type'] == 'investment':
            cat = t['category']
            investment_by_category[cat] = investment_by_category.get(cat, 0) + t['amount']
    
    total_investments = sum(investment_by_category.values())
    investment_breakdown = [
        CategoryBreakdown(
            category=cat,
            amount=amt,
            percentage=(amt / total_investments * 100) if total_investments > 0 else 0
        )
        for cat, amt in investment_by_category.items()
    ]
    
    return AnalyticsData(
        expense_breakdown=expense_breakdown,
        income_breakdown=income_breakdown,
        investment_breakdown=investment_breakdown
    )

# Growth analytics
class GrowthDataPoint(BaseModel):
    date: str
    value: float
    cumulative: float

class BudgetGrowth(BaseModel):
    data: List[GrowthDataPoint]
    total_income: float
    total_expenses: float
    net_savings: float

class InvestmentGrowth(BaseModel):
    data: List[GrowthDataPoint]
    total_invested: float
    current_value: float
    total_gain: float

@api_router.get("/analytics/budget-growth", response_model=BudgetGrowth)
async def get_budget_growth():
    transactions = await db.transactions.find(
        {"type": {"$in": ["income", "expense"]}},
        {"_id": 0}
    ).to_list(1000)
    
    # Sort by date
    transactions.sort(key=lambda x: x['date'])
    
    # Calculate cumulative balance over time
    cumulative_balance = 0
    growth_data = []
    date_map = defaultdict(float)
    
    for t in transactions:
        date = t['date']
        amount = t['amount'] if t['type'] == 'income' else -t['amount']
        date_map[date] += amount
    
    for date in sorted(date_map.keys()):
        cumulative_balance += date_map[date]
        growth_data.append(GrowthDataPoint(
            date=date,
            value=date_map[date],
            cumulative=cumulative_balance
        ))
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    
    return BudgetGrowth(
        data=growth_data,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=total_income - total_expenses
    )

@api_router.get("/analytics/investment-growth", response_model=InvestmentGrowth)
async def get_investment_growth():
    investments = await db.transactions.find(
        {"type": "investment"},
        {"_id": 0}
    ).to_list(1000)
    
    # Sort by date
    investments.sort(key=lambda x: x['date'])
    
    # Calculate cumulative investment over time
    cumulative_invested = 0
    growth_data = []
    date_map = defaultdict(float)
    
    for inv in investments:
        date = inv['date']
        date_map[date] += inv['amount']
    
    for date in sorted(date_map.keys()):
        cumulative_invested += date_map[date]
        growth_data.append(GrowthDataPoint(
            date=date,
            value=date_map[date],
            cumulative=cumulative_invested
        ))
    
    # Get current portfolio value
    portfolio = await get_portfolio()
    
    return InvestmentGrowth(
        data=growth_data,
        total_invested=cumulative_invested,
        current_value=portfolio.current_value,
        total_gain=portfolio.total_gain_loss
    )

# Voice input parsing
import re
from datetime import date as date_module

class VoiceTransactionRequest(BaseModel):
    text: str

class VoiceTransactionResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[TransactionCreate] = None

@api_router.post("/parse-voice-transaction", response_model=VoiceTransactionResponse)
async def parse_voice_transaction(request: VoiceTransactionRequest):
    text = request.text.lower()
    
    try:
        # Extract amount
        amount_patterns = [
            r'\$?(\d+(?:\.\d{2})?)',
            r'(\d+)\s*dollars?',
            r'(\d+)\s*bucks?'
        ]
        
        amount = None
        for pattern in amount_patterns:
            match = re.search(pattern, text)
            if match:
                amount = float(match.group(1))
                break
        
        if not amount:
            return VoiceTransactionResponse(
                success=False,
                message="Could not detect amount. Please say the dollar amount clearly."
            )
        
        # Determine transaction type
        transaction_type = "expense"  # default
        if any(word in text for word in ["earned", "income", "salary", "paid me", "received", "got paid"]):
            transaction_type = "income"
        elif any(word in text for word in ["invested", "bought stock", "bought crypto", "investment"]):
            transaction_type = "investment"
        
        # Extract category based on keywords
        category_keywords = {
            "expense": {
                "groceries": ["grocery", "groceries", "food shopping", "supermarket"],
                "restaurants": ["restaurant", "eating out", "dinner", "lunch out", "coffee shop", "cafe"],
                "gas": ["gas", "fuel", "petrol"],
                "utilities": ["electricity", "water bill", "utility", "utilities", "internet"],
                "rent": ["rent", "mortgage"],
                "car": ["car payment", "auto"],
                "gym": ["gym", "fitness", "workout"],
                "clothing": ["clothes", "clothing", "shirt", "shoes"],
                "entertainment": ["movie", "concert", "entertainment", "netflix", "spotify"],
                "transport": ["uber", "lyft", "taxi", "bus", "train", "transportation"]
            },
            "income": {
                "salary": ["salary", "paycheck", "wages"],
                "freelance": ["freelance", "gig", "side hustle"],
                "bonus": ["bonus", "overtime"]
            }
        }
        
        category = "Other"
        if transaction_type in category_keywords:
            for cat, keywords in category_keywords[transaction_type].items():
                if any(keyword in text for keyword in keywords):
                    category = cat.capitalize()
                    break
        
        # Map to actual category names
        category_map = {
            "groceries": "Groceries",
            "restaurants": "Restaurants / Cafes",
            "gas": "Fuel / Gas",
            "utilities": "Utilities",
            "rent": "Rent / Mortgage",
            "car": "Car Payment / Lease",
            "gym": "Gym / Fitness / Sports",
            "clothing": "Clothing & Shoes",
            "entertainment": "Movies / Concerts / Events",
            "transport": "Public Transport",
            "salary": "Salary / wages",
            "freelance": "Freelance income",
            "bonus": "Overtime / bonuses"
        }
        
        category = category_map.get(category.lower(), "Other / Uncategorized")
        
        # Extract description (remaining text after removing amount)
        description = text
        for pattern in amount_patterns:
            description = re.sub(pattern, "", description)
        
        # Clean up description
        description = re.sub(r'\b(spent|paid|bought|earned|received|got|for|on|at|today|yesterday)\b', '', description)
        description = description.strip()
        if not description:
            description = f"{transaction_type.capitalize()} via voice"
        
        # Use today's date
        today = date_module.today().isoformat()
        
        transaction_data = TransactionCreate(
            type=transaction_type,
            amount=amount,
            description=description[:100],  # Limit length
            category=category,
            date=today
        )
        
        return VoiceTransactionResponse(
            success=True,
            data=transaction_data,
            message=f"Created {transaction_type} of ${amount}"
        )
        
    except Exception as e:
        logging.error(f"Error parsing voice transaction: {e}")
        return VoiceTransactionResponse(
            success=False,
            message="Could not parse transaction. Please try again."
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