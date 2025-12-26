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
import sys

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Add the backend directory to Python path for imports
sys.path.append(str(ROOT_DIR))

# Import auth and subscription routes
from routes.users import router as users_router
from routes.subscription import router as subscription_router
from routes.admin import router as admin_router
from auth import get_current_user, get_current_user_optional

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

# Custom Category Models
class CustomCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    type: Literal["expense", "income"]  # Which type this category belongs to
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomCategoryCreate(BaseModel):
    name: str
    type: Literal["expense", "income"]

class CustomCategoryUpdate(BaseModel):
    name: str

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
    # Get transaction first to check if it's linked to an envelope
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Delete the transaction
    result = await db.transactions.delete_one({"id": transaction_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If this transaction is linked to an envelope, delete the envelope transaction too
    envelope_transaction_id = transaction.get("envelope_transaction_id")
    if envelope_transaction_id:
        # Get the envelope transaction to adjust envelope balance
        envelope_txn = await db.envelope_transactions.find_one(
            {"id": envelope_transaction_id},
            {"_id": 0}
        )
        
        if envelope_txn:
            envelope_id = envelope_txn.get("envelope_id")
            amount = envelope_txn.get("amount", 0)
            txn_type = envelope_txn.get("type")
            
            # Delete envelope transaction
            await db.envelope_transactions.delete_one({"id": envelope_transaction_id})
            
            # Adjust envelope balance
            if txn_type == "income":
                # Was income, subtract it back
                await db.budget_envelopes.update_one(
                    {"id": envelope_id},
                    {"$inc": {"current_amount": -amount}}
                )
            elif txn_type == "expense":
                # Was expense, add it back
                await db.budget_envelopes.update_one(
                    {"id": envelope_id},
                    {"$inc": {"current_amount": amount}}
                )
    
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

# Custom Categories endpoints
from fastapi import Depends

@api_router.get("/categories/custom")
async def get_custom_categories(user_id: str = Depends(get_current_user)):
    """Get all custom categories for the current user"""
    categories = await db.custom_categories.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).to_list(100)
    return categories

@api_router.post("/categories/custom", response_model=CustomCategory)
async def create_custom_category(
    category: CustomCategoryCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new custom category for the user"""
    # Check if category with same name and type already exists
    existing = await db.custom_categories.find_one({
        "user_id": user_id,
        "name": category.name,
        "type": category.type
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    cat_obj = CustomCategory(
        user_id=user_id,
        name=category.name,
        type=category.type
    )
    
    doc = cat_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.custom_categories.insert_one(doc)
    return cat_obj

@api_router.put("/categories/custom/{category_id}")
async def update_custom_category(
    category_id: str,
    update_data: CustomCategoryUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a custom category"""
    # Check if category exists and belongs to user
    existing = await db.custom_categories.find_one({
        "id": category_id,
        "user_id": user_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if new name already exists
    duplicate = await db.custom_categories.find_one({
        "user_id": user_id,
        "name": update_data.name,
        "type": existing["type"],
        "id": {"$ne": category_id}
    })
    
    if duplicate:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    await db.custom_categories.update_one(
        {"id": category_id},
        {"$set": {"name": update_data.name}}
    )
    
    return {"message": "Category updated successfully"}

@api_router.delete("/categories/custom/{category_id}")
async def delete_custom_category(
    category_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a custom category"""
    result = await db.custom_categories.delete_one({
        "id": category_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}

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

# Recurring transactions endpoints
@api_router.post("/recurring-transactions", response_model=RecurringTransaction)
async def create_recurring_transaction(recurring: RecurringTransactionCreate):
    rec_dict = recurring.model_dump()
    rec_obj = RecurringTransaction(**rec_dict)
    
    doc = rec_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.recurring_transactions.insert_one(doc)
    return rec_obj

@api_router.get("/recurring-transactions", response_model=List[RecurringTransaction])
async def get_recurring_transactions():
    recurring = await db.recurring_transactions.find({}, {"_id": 0}).to_list(1000)
    
    for rec in recurring:
        if isinstance(rec['createdAt'], str):
            rec['createdAt'] = datetime.fromisoformat(rec['createdAt'])
    
    return recurring

@api_router.delete("/recurring-transactions/{recurring_id}")
async def delete_recurring_transaction(recurring_id: str):
    result = await db.recurring_transactions.delete_one({"id": recurring_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    return {"message": "Recurring transaction deleted successfully"}

@api_router.put("/recurring-transactions/{recurring_id}/toggle")
async def toggle_recurring_transaction(recurring_id: str):
    recurring = await db.recurring_transactions.find_one({"id": recurring_id})
    
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    new_active = not recurring.get('active', True)
    await db.recurring_transactions.update_one(
        {"id": recurring_id},
        {"$set": {"active": new_active}}
    )
    
    return {"message": f"Recurring transaction {'activated' if new_active else 'deactivated'}"}

@api_router.post("/recurring-transactions/process")
async def process_recurring_transactions():
    """Check and create due recurring transactions"""
    from datetime import date as date_module, timedelta
    
    recurring_list = await db.recurring_transactions.find({"active": True}, {"_id": 0}).to_list(1000)
    created_count = 0
    
    today = date_module.today()
    
    for rec in recurring_list:
        start_date = date_module.fromisoformat(rec['start_date'])
        end_date = date_module.fromisoformat(rec['end_date']) if rec.get('end_date') else None
        last_created = date_module.fromisoformat(rec['last_created']) if rec.get('last_created') else None
        
        # Check if we should create a transaction
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
            day_of_month = rec.get('day_of_month', 1)
            if today.day == day_of_month:
                if not last_created or last_created.month != today.month or last_created.year != today.year:
                    should_create = True
                    transaction_date = today
                    
        elif rec['frequency'] == 'yearly':
            if not last_created or last_created.year < today.year:
                # Create on same day as start_date
                if today.month == start_date.month and today.day == start_date.day:
                    should_create = True
                    transaction_date = today
        
        if should_create and transaction_date:
            # Create the transaction
            trans_create = TransactionCreate(
                type=rec['type'],
                amount=rec['amount'],
                description=rec['description'] + " (Auto)",
                category=rec['category'],
                date=transaction_date.isoformat(),
                currency=rec.get('currency', 'USD')
            )
            
            trans_obj = Transaction(**trans_create.model_dump())
            trans_obj.amount_usd = convert_to_usd(trans_obj.amount, trans_obj.currency)
            
            doc = trans_obj.model_dump()
            doc['createdAt'] = doc['createdAt'].isoformat()
            
            await db.transactions.insert_one(doc)
            
            # Update last_created
            await db.recurring_transactions.update_one(
                {"id": rec['id']},
                {"$set": {"last_created": transaction_date.isoformat()}}
            )
            
            created_count += 1
    
    return {"message": f"Created {created_count} recurring transactions"}

# Get exchange rates
@api_router.get("/currencies")
async def get_currencies():
    return {
        "currencies": list(EXCHANGE_RATES.keys()),
        "rates": EXCHANGE_RATES
    }

# Budget Envelopes (Savings Goals)
@api_router.get("/budget-envelopes")
async def get_budget_envelopes():
    """Get all budget envelopes"""
    envelopes = await db.budget_envelopes.find({}, {"_id": 0}).to_list(1000)
    return envelopes

@api_router.post("/budget-envelopes")
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

@api_router.post("/budget-envelopes/{envelope_id}/allocate")
async def allocate_to_envelope(envelope_id: str, allocation: dict):
    """Allocate money to a budget envelope and create expense transaction"""
    amount = allocation.get("amount", 0)
    
    envelope = await db.budget_envelopes.find_one({"id": envelope_id}, {"_id": 0})
    if not envelope:
        raise HTTPException(status_code=404, detail="Budget envelope not found")
    
    new_amount = envelope["current_amount"] + amount
    
    # Update envelope
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

@api_router.delete("/budget-envelopes/{envelope_id}")
async def delete_budget_envelope(envelope_id: str):
    """Delete a budget envelope"""
    result = await db.budget_envelopes.delete_one({"id": envelope_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget envelope not found")
    
    # Also delete all transactions associated with this envelope
    await db.envelope_transactions.delete_many({"envelope_id": envelope_id})
    
    return {"message": "Budget envelope deleted successfully"}

# Envelope Transactions
@api_router.get("/budget-envelopes/{envelope_id}/transactions")
async def get_envelope_transactions(envelope_id: str):
    """Get all transactions for a specific envelope"""
    transactions = await db.envelope_transactions.find(
        {"envelope_id": envelope_id},
        {"_id": 0}
    ).to_list(1000)
    return sorted(transactions, key=lambda x: x['date'], reverse=True)

@api_router.post("/budget-envelopes/{envelope_id}/transactions")
async def create_envelope_transaction(envelope_id: str, transaction: dict):
    """Create a transaction for an envelope"""
    # Verify envelope exists
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
    
    # Update envelope current_amount
    amount = transaction.get("amount", 0)
    
    if transaction.get("type") == "income":
        # Add to envelope
        await db.budget_envelopes.update_one(
            {"id": envelope_id},
            {"$inc": {"current_amount": amount}}
        )
        
        # Create expense in main budget (money moved from main account to envelope)
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
            "envelope_transaction_id": transaction_id,  # Link to envelope transaction
        }
        await db.transactions.insert_one(main_transaction_data)
        
    elif transaction.get("type") == "expense":
        # Subtract from envelope
        await db.budget_envelopes.update_one(
            {"id": envelope_id},
            {"$inc": {"current_amount": -amount}}
        )
        
        # ALSO create expense in main budget (spending from the envelope)
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
            "envelope_transaction_id": transaction_id,  # Link to envelope transaction
        }
        await db.transactions.insert_one(main_transaction_data)
    
    return {"id": transaction_id, "message": "Transaction created successfully"}

@api_router.put("/budget-envelopes/{envelope_id}/transactions/{transaction_id}")
async def update_envelope_transaction(envelope_id: str, transaction_id: str, updated_transaction: dict):
    """Update a transaction in an envelope"""
    # Get the old transaction
    old_transaction = await db.envelope_transactions.find_one(
        {"id": transaction_id, "envelope_id": envelope_id},
        {"_id": 0}
    )
    
    if not old_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get envelope
    envelope = await db.budget_envelopes.find_one({"id": envelope_id}, {"_id": 0})
    if not envelope:
        raise HTTPException(status_code=404, detail="Envelope not found")
    
    old_amount = old_transaction.get("amount", 0)
    old_type = old_transaction.get("type")
    new_amount = updated_transaction.get("amount", old_amount)
    new_type = updated_transaction.get("type", old_type)
    
    # Update the envelope transaction
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
    
    # Calculate the difference to adjust envelope balance
    if old_type == new_type:
        # Same type, just adjust the difference
        amount_diff = new_amount - old_amount
        if new_type == "income":
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": amount_diff}}
            )
        else:
            # expense
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": -amount_diff}}
            )
        
        # Update main budget transaction (for both income and expense)
        await db.transactions.update_one(
            {"envelope_transaction_id": transaction_id},
            {"$set": {
                "amount": new_amount,
                "date": updated_transaction.get("date", old_transaction.get("date")),
                "description": f"[{envelope['name']}] {updated_transaction.get('description', updated_transaction.get('category', ''))}",
                "category": transaction.get("category") if new_type == "expense" else "Budget Allocation / Envelope Transfer"
            }}
        )
    else:
        # Type changed - reverse old and apply new
        if old_type == "income":
            # Remove old income from envelope
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": -old_amount}}
            )
        else:
            # Remove old expense from envelope
            await db.budget_envelopes.update_one(
                {"id": envelope_id},
                {"$inc": {"current_amount": old_amount}}
            )
        
        # Delete old main budget transaction
        await db.transactions.delete_one({"envelope_transaction_id": transaction_id})
        
        # Apply new type
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
        
        # Create new main budget transaction
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

@api_router.delete("/budget-envelopes/{envelope_id}/transactions/{transaction_id}")
async def delete_envelope_transaction(envelope_id: str, transaction_id: str):
    """Delete a transaction from an envelope"""
    # Get transaction to know the amount
    transaction = await db.envelope_transactions.find_one(
        {"id": transaction_id, "envelope_id": envelope_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get envelope details
    envelope = await db.budget_envelopes.find_one({"id": envelope_id}, {"_id": 0})
    
    # Delete transaction
    await db.envelope_transactions.delete_one({"id": transaction_id})
    
    # Reverse the amount change in envelope
    amount = transaction.get("amount", 0)
    if transaction.get("type") == "income":
        # Was income, so subtract it back from envelope
        await db.budget_envelopes.update_one(
            {"id": envelope_id},
            {"$inc": {"current_amount": -amount}}
        )
    elif transaction.get("type") == "expense":
        # Was expense, so add it back to envelope
        await db.budget_envelopes.update_one(
            {"id": envelope_id},
            {"$inc": {"current_amount": amount}}
        )
    
    # Delete the linked main budget transaction
    await db.transactions.delete_one({"envelope_transaction_id": transaction_id})
    
    return {"message": "Transaction deleted successfully"}

# AI Assistant Endpoint
@api_router.post("/ai-assistant")
async def ai_assistant(request: dict):
    """Natural language query about finances using AI"""
    question = request.get("question", "")
    
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    
    # Get all transactions
    all_transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    # Pre-calculate summaries for better accuracy
    from collections import defaultdict
    from datetime import datetime as dt
    
    # Calculate totals by type
    total_income = sum(t.get("amount", 0) for t in all_transactions if t.get("type") == "income")
    total_expense = sum(t.get("amount", 0) for t in all_transactions if t.get("type") == "expense")
    
    # Calculate by category
    income_by_category = defaultdict(float)
    expense_by_category = defaultdict(float)
    
    for t in all_transactions:
        amount = t.get("amount", 0)
        category = t.get("category", "Other")
        if t.get("type") == "income":
            income_by_category[category] += amount
        elif t.get("type") == "expense":
            expense_by_category[category] += amount
    
    # Calculate by month
    transactions_by_month = defaultdict(lambda: {"income": 0, "expense": 0})
    
    for t in all_transactions:
        try:
            date_str = t.get("date", "")
            if date_str:
                # Parse date
                date_obj = dt.fromisoformat(date_str.split('T')[0])
                month_key = date_obj.strftime("%B %Y")  # e.g., "November 2024"
                
                amount = t.get("amount", 0)
                if t.get("type") == "income":
                    transactions_by_month[month_key]["income"] += amount
                elif t.get("type") == "expense":
                    transactions_by_month[month_key]["expense"] += amount
        except:
            pass
    
    # Get recent transactions (last 20 for context)
    recent_transactions = []
    for t in all_transactions[-20:]:
        recent_transactions.append({
            "date": t.get("date"),
            "type": t.get("type"),
            "amount": t.get("amount"),
            "category": t.get("category"),
            "description": t.get("description", ""),
        })
    
    # Create structured summary
    data_summary = f"""
FINANCIAL SUMMARY:

TOTAL INCOME: ${total_income:.2f}
TOTAL EXPENSES: ${total_expense:.2f}
NET BALANCE: ${(total_income - total_expense):.2f}

INCOME BY CATEGORY:
{chr(10).join([f'  - {cat}: ${amt:.2f}' for cat, amt in sorted(income_by_category.items(), key=lambda x: -x[1])])}

EXPENSES BY CATEGORY:
{chr(10).join([f'  - {cat}: ${amt:.2f}' for cat, amt in sorted(expense_by_category.items(), key=lambda x: -x[1])])}

MONTHLY BREAKDOWN:
{chr(10).join([f'  {month}: Income ${data["income"]:.2f}, Expenses ${data["expense"]:.2f}' for month, data in sorted(transactions_by_month.items())])}

RECENT TRANSACTIONS (Last 20):
{chr(10).join([f'  {t["date"]}: {t["type"].upper()} ${t["amount"]:.2f} - {t["category"]} ({t["description"]})' for t in recent_transactions])}
"""
    
    # Use emergentintegrations to call OpenAI
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Get Emergent LLM key
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    
    if not llm_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Create prompt
    prompt = f"""User Question: {question}

{data_summary}

CRITICAL INSTRUCTIONS:
1. ALWAYS answer in ENGLISH only, regardless of the question language
2. Use ONLY the exact numbers from "FINANCIAL SUMMARY" section above
3. Do NOT perform any calculations - the numbers are already correct
4. Copy the dollar amounts EXACTLY as shown (including cents)
5. If asked about a specific category, find it in the category lists
6. If asked about a month, use the "MONTHLY BREAKDOWN" section
7. Be direct and concise - just state the numbers

Answer the question in ENGLISH using the exact numbers above."""
    
    try:
        client = LlmChat(
            api_key=llm_key,
            session_id="financial_assistant",
            system_message="You are a financial assistant. ALWAYS respond in ENGLISH. Use ONLY the pre-calculated numbers provided - do NOT recalculate anything. Copy dollar amounts exactly as given."
        ).with_model("openai", "gpt-4o-mini")
        
        # Create user message
        user_msg = UserMessage(text=prompt)
        
        # Send message
        answer = await client.send_message(user_msg)
        
        return {"answer": answer, "question": question}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# Include all routers
api_router.include_router(users_router)
api_router.include_router(subscription_router)
api_router.include_router(admin_router)

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