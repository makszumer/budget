from fastapi import FastAPI, APIRouter, HTTPException, Depends
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
from services.exchange_rate import init_exchange_service, get_exchange_service

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize exchange rate service
exchange_service = init_exchange_service(db)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["expense", "income", "investment"]
    amount: float  # Amount in primary currency (converted if needed)
    description: Optional[str] = ""
    category: str
    date: str
    # Investment specific fields
    asset: Optional[str] = None  # Stock ticker, crypto symbol, etc.
    quantity: Optional[float] = None  # Number of shares/coins
    purchase_price: Optional[float] = None  # Price per unit at purchase
    currency: str = "USD"  # Primary currency (what amount is stored in)
    # Multi-currency support
    original_amount: Optional[float] = None  # Original amount if different currency
    original_currency: Optional[str] = None  # Original currency code
    exchange_rate: Optional[float] = None  # Rate used for conversion
    conversion_date: Optional[str] = None  # When conversion was done
    is_estimated_rate: Optional[bool] = False  # True if fallback rate was used
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
    currency: Optional[str] = None  # Optional: if provided and different from primary, will convert
    # For explicit conversion
    convert_from_currency: Optional[str] = None  # Currency of the entered amount

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
    "MXN": 17.15,    # Mexican Peso
    "KRW": 1320.50,  # South Korean Won
    "SGD": 1.34,     # Singapore Dollar
    "HKD": 7.82,     # Hong Kong Dollar
    "NOK": 10.65,    # Norwegian Krone
    "SEK": 10.42,    # Swedish Krona
    "DKK": 6.87,     # Danish Krone
    "NZD": 1.64,     # New Zealand Dollar
    "ZAR": 18.75,    # South African Rand
    "RUB": 92.50,    # Russian Ruble
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
    """Convert amount from given currency to USD (fallback method)"""
    if currency == "USD":
        return amount
    rate = EXCHANGE_RATES.get(currency, 1.0)
    return amount / rate

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(
    transaction: TransactionCreate,
    current_user_id: str = Depends(get_current_user_optional)
):
    """
    Create a new transaction with optional currency conversion.
    If convert_from_currency is provided and different from the user's primary currency,
    the amount will be converted automatically.
    """
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
        # Perform currency conversion
        try:
            conversion = await exchange_service.convert(
                amount=transaction.amount,
                from_currency=source_currency,
                to_currency=primary_currency
            )
            
            # Store both original and converted amounts
            trans_dict['original_amount'] = transaction.amount
            trans_dict['original_currency'] = source_currency.upper()
            trans_dict['amount'] = conversion['converted_amount']
            trans_dict['currency'] = primary_currency
            trans_dict['exchange_rate'] = conversion['exchange_rate']
            trans_dict['conversion_date'] = conversion['conversion_date']
            trans_dict['is_estimated_rate'] = conversion['is_estimated']
            
        except Exception as e:
            logger.error(f"Currency conversion failed: {e}")
            # Fallback to simple conversion
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
        # No conversion needed
        trans_dict['currency'] = primary_currency
        trans_dict['original_amount'] = None
        trans_dict['original_currency'] = None
        trans_dict['exchange_rate'] = None
        trans_dict['conversion_date'] = None
        trans_dict['is_estimated_rate'] = False
    
    # Remove the convert_from_currency field as it's not stored
    trans_dict.pop('convert_from_currency', None)
    
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
    user_id: Optional[str] = None  # To fetch user's custom categories

class VoiceTransactionResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[TransactionCreate] = None
    needs_clarification: bool = False
    needs_type_clarification: bool = False
    all_categories: Optional[dict] = None  # All available categories grouped
    matched_categories: Optional[List[str]] = None  # Best matches found
    parsed_amount: Optional[float] = None
    parsed_type: Optional[str] = None
    parsed_description: Optional[str] = None

# Complete list of all default categories
DEFAULT_EXPENSE_CATEGORIES = {
    "Living & Housing": ["Rent / Mortgage", "Utilities", "Home Maintenance / Repairs", "Property Tax", "Home Insurance"],
    "Transportation": ["Car Payment / Lease", "Fuel / Gas", "Public Transport", "Maintenance & Repairs", "Parking & Tolls", "Insurance"],
    "Food & Dining": ["Groceries", "Restaurants / Cafes", "Takeout / Delivery", "Work Lunches / Snacks"],
    "Health & Wellness": ["Health Insurance", "Doctor / Dentist Visits", "Prescriptions", "Gym / Fitness / Sports", "Mental Health Services"],
    "Personal & Lifestyle": ["Clothing & Shoes", "Haircuts / Grooming", "Beauty & Cosmetics", "Hobbies", "Subscriptions"],
    "Family & Education": ["Childcare / School Fees", "Tuition / Courses / Learning Apps", "Pet Care"],
    "Financial Obligations": ["Debt Payments", "Savings / Investments", "Taxes", "Bank Fees", "Budget Allocation / Envelope Transfer"],
    "Entertainment & Leisure": ["Travel / Vacations", "Movies / Concerts / Events", "Gifts & Celebrations"],
    "Miscellaneous": ["Donations / Charity", "Unexpected Expenses", "Other / Uncategorized"],
}

DEFAULT_INCOME_CATEGORIES = {
    "Employment Income": ["Salary / wages", "Overtime / bonuses", "Commissions / tips"],
    "Self-Employment / Business": ["Freelance income", "Business sales", "Consulting / side hustle"],
    "Transfers & Support": ["Government benefits", "Family support / alimony", "Reimbursements"],
    "Other Income": ["Gifts", "Lottery / windfalls", "One-time payments"],
}

DEFAULT_INVESTMENT_CATEGORIES = ["Stocks", "Bonds", "Real Estate", "Crypto", "Retirement", "Other"]

# Comprehensive synonym mapping for better matching
CATEGORY_SYNONYMS = {
    # Expense categories
    "Groceries": ["grocery", "groceries", "supermarket", "food shopping", "walmart", "costco", "trader joe", "whole foods", "aldi", "kroger", "market"],
    "Restaurants / Cafes": ["restaurant", "restaurants", "cafe", "coffee", "starbucks", "mcdonalds", "eating out", "dine", "dining", "dinner out", "lunch out", "brunch", "fast food", "takeout", "doordash", "ubereats", "grubhub"],
    "Takeout / Delivery": ["takeout", "delivery", "doordash", "ubereats", "grubhub", "postmates", "seamless"],
    "Fuel / Gas": ["gas", "gasoline", "fuel", "petrol", "shell", "chevron", "exxon", "bp", "filling station", "gas station"],
    "Public Transport": ["uber", "lyft", "taxi", "cab", "bus", "train", "metro", "subway", "transit", "transportation", "commute", "fare"],
    "Utilities": ["electricity", "electric", "power", "water", "gas bill", "internet", "wifi", "utility", "utilities", "cable", "phone bill", "mobile"],
    "Rent / Mortgage": ["rent", "mortgage", "housing", "apartment", "lease"],
    "Car Payment / Lease": ["car payment", "auto payment", "vehicle payment", "car lease"],
    "Maintenance & Repairs": ["car repair", "mechanic", "oil change", "tire", "auto repair", "car maintenance"],
    "Insurance": ["insurance", "car insurance", "auto insurance"],
    "Health Insurance": ["health insurance", "medical insurance", "healthcare"],
    "Doctor / Dentist Visits": ["doctor", "dentist", "medical", "hospital", "clinic", "checkup", "appointment"],
    "Prescriptions": ["prescription", "pharmacy", "medicine", "medication", "drugs", "cvs", "walgreens"],
    "Gym / Fitness / Sports": ["gym", "fitness", "workout", "exercise", "yoga", "pilates", "crossfit", "sports", "planet fitness"],
    "Clothing & Shoes": ["clothes", "clothing", "shirt", "pants", "shoes", "dress", "jacket", "apparel", "fashion", "zara", "h&m", "nike", "adidas"],
    "Haircuts / Grooming": ["haircut", "barber", "salon", "grooming", "spa"],
    "Beauty & Cosmetics": ["makeup", "cosmetics", "beauty", "skincare", "sephora", "ulta"],
    "Subscriptions": ["subscription", "netflix", "spotify", "hulu", "disney", "amazon prime", "youtube premium", "apple music", "streaming"],
    "Movies / Concerts / Events": ["movie", "movies", "cinema", "concert", "show", "event", "ticket", "theater", "theatre", "entertainment"],
    "Travel / Vacations": ["travel", "vacation", "trip", "hotel", "airbnb", "flight", "airline", "booking"],
    "Gifts & Celebrations": ["gift", "gifts", "present", "birthday", "christmas", "anniversary", "celebration"],
    "Pet Care": ["pet", "dog", "cat", "vet", "veterinarian", "pet food", "pet store"],
    "Donations / Charity": ["donation", "charity", "donate", "nonprofit", "giving"],
    "Other / Uncategorized": ["other", "misc", "miscellaneous"],
    # Income categories  
    "Salary / wages": ["salary", "paycheck", "wages", "pay", "income", "work"],
    "Overtime / bonuses": ["bonus", "overtime", "extra pay"],
    "Commissions / tips": ["commission", "tip", "tips", "gratuity"],
    "Freelance income": ["freelance", "gig", "side hustle", "contract", "consulting"],
    "Business sales": ["business", "sales", "revenue"],
    "Reimbursements": ["reimbursement", "refund", "expense report"],
    "Gifts": ["gift", "present", "birthday money"],
}

@api_router.post("/parse-voice-transaction", response_model=VoiceTransactionResponse)
async def parse_voice_transaction(
    request: VoiceTransactionRequest,
    user_id: Optional[str] = None
):
    text = request.text.lower()
    
    try:
        # Extract amount
        amount_patterns = [
            r'\$?(\d+(?:\.\d{2})?)',
            r'(\d+)\s*dollars?',
            r'(\d+)\s*bucks?',
            r'(\d+)\s*euros?',
            r'€(\d+(?:\.\d{2})?)'
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
                message="Could not detect amount. Please say the dollar amount clearly (e.g., '50 dollars' or '$50')."
            )
        
        # ============ INTENT DETECTION (Income vs Expense) ============
        income_keywords = [
            "earned", "income", "salary", "wages", "paycheck", 
            "paid me", "received", "got paid", "made money",
            "bonus", "commission", "tip", "tips", "refund",
            "profit", "revenue", "freelance", "gig money"
        ]
        
        expense_keywords = [
            "spent", "expense", "paid for", "bought", "purchased",
            "cost me", "charged", "paid", "payment", "bill",
            "subscription", "rent", "groceries", "food", "gas",
            "utilities", "shopping"
        ]
        
        investment_keywords = [
            "invested", "investment", "bought stock", "bought stocks",
            "bought crypto", "stock purchase", "etf", "mutual fund"
        ]
        
        income_score = sum(1 for kw in income_keywords if kw in text)
        expense_score = sum(1 for kw in expense_keywords if kw in text)
        investment_score = sum(1 for kw in investment_keywords if kw in text)
        
        transaction_type = None
        type_confident = False
        
        if investment_score > 0 and investment_score >= income_score and investment_score >= expense_score:
            transaction_type = "investment"
            type_confident = True
        elif income_score > expense_score:
            transaction_type = "income"
            type_confident = income_score >= 1
        elif expense_score > income_score:
            transaction_type = "expense"
            type_confident = expense_score >= 1
        else:
            type_confident = False
        
        # If type is not confident, ask for clarification FIRST
        if not type_confident:
            return VoiceTransactionResponse(
                success=False,
                needs_type_clarification=True,
                message="Is this money you received (income) or money you spent (expense)?",
                parsed_amount=amount,
                parsed_description=text[:100]
            )
        
        # ============ CATEGORY MATCHING WITH SYNONYMS ============
        # Find ALL matching categories based on synonyms
        matched_categories = []
        match_scores = {}
        
        for category, synonyms in CATEGORY_SYNONYMS.items():
            score = 0
            for synonym in synonyms:
                if synonym in text:
                    # Partial word matching - check if synonym is part of any word
                    score += 2  # Exact match gets higher score
                elif any(synonym in word or word in synonym for word in text.split()):
                    score += 1  # Partial match
            
            if score > 0:
                match_scores[category] = score
        
        # Sort by score and get top matches
        if match_scores:
            sorted_matches = sorted(match_scores.items(), key=lambda x: x[1], reverse=True)
            matched_categories = [cat for cat, score in sorted_matches[:5]]  # Top 5 matches
        
        # Extract description
        description = text
        for pattern in amount_patterns:
            description = re.sub(pattern, "", description)
        description = re.sub(r'\b(spent|paid|bought|earned|received|got|for|on|at|today|yesterday|dollars?|bucks?|add|an?)\b', '', description)
        description = description.strip()
        if not description or len(description) < 3:
            description = f"{transaction_type.capitalize()} via voice"
        
        # ============ ALWAYS ASK FOR CATEGORY CONFIRMATION ============
        # Get user's custom categories
        custom_cats = []
        user_id_to_use = request.user_id or user_id
        if user_id_to_use:
            try:
                cat_type = "expense" if transaction_type == "expense" else "income"
                user_cats = await db.custom_categories.find(
                    {"user_id": user_id_to_use, "type": cat_type},
                    {"_id": 0, "name": 1}
                ).to_list(50)
                custom_cats = [c["name"] for c in user_cats]
            except:
                pass
        
        # Build complete category list
        if transaction_type == "expense":
            all_categories = {
                "Custom Categories": custom_cats if custom_cats else [],
                **DEFAULT_EXPENSE_CATEGORIES
            }
        elif transaction_type == "income":
            all_categories = {
                "Custom Categories": custom_cats if custom_cats else [],
                **DEFAULT_INCOME_CATEGORIES
            }
        else:
            all_categories = {
                "Custom Categories": custom_cats if custom_cats else [],
                "Investment Types": DEFAULT_INVESTMENT_CATEGORIES
            }
        
        # Remove empty groups
        all_categories = {k: v for k, v in all_categories.items() if v}
        
        # ALWAYS return needs_clarification - never auto-save
        return VoiceTransactionResponse(
            success=False,
            needs_clarification=True,
            message=f"Which category should this {transaction_type} be added to?",
            all_categories=all_categories,
            matched_categories=matched_categories if matched_categories else None,
            parsed_amount=amount,
            parsed_type=transaction_type,
            parsed_description=description[:100]
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
    """Check and create due recurring transactions with proper edge case handling"""
    from datetime import date as date_module, timedelta
    import calendar
    
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
            target_day = rec.get('day_of_month', 1)
            # Get the last day of current month
            last_day_of_month = calendar.monthrange(today.year, today.month)[1]
            
            # If target day doesn't exist in this month, use last day
            effective_day = min(target_day, last_day_of_month)
            
            if today.day == effective_day:
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
            # Create the transaction with Standing Order marker
            trans_create = TransactionCreate(
                type=rec['type'],
                amount=rec['amount'],
                description=rec['description'] + " [Standing Order]",
                category=rec['category'],
                date=transaction_date.isoformat(),
                currency=rec.get('currency', 'USD')
            )
            
            trans_obj = Transaction(**trans_create.model_dump())
            trans_obj.amount_usd = convert_to_usd(trans_obj.amount, trans_obj.currency)
            
            doc = trans_obj.model_dump()
            doc['createdAt'] = doc['createdAt'].isoformat()
            doc['is_standing_order'] = True  # Mark as standing order
            doc['standing_order_id'] = rec['id']  # Link to standing order
            
            await db.transactions.insert_one(doc)
            
            # Update last_created
            await db.recurring_transactions.update_one(
                {"id": rec['id']},
                {"$set": {"last_created": transaction_date.isoformat()}}
            )
            
            created_count += 1
    
    return {"message": f"Created {created_count} recurring transactions", "created_count": created_count}

# Get exchange rates
@api_router.get("/currencies")
async def get_currencies():
    """Get supported currencies with current exchange rates"""
    try:
        # Try to get live rates
        rates = await exchange_service.get_rates("USD")
        return {
            "currencies": list(rates.keys()),
            "rates": rates,
            "source": "live",
            "base": "USD"
        }
    except Exception as e:
        logger.error(f"Failed to get live rates: {e}")
        return {
            "currencies": list(EXCHANGE_RATES.keys()),
            "rates": EXCHANGE_RATES,
            "source": "fallback",
            "base": "USD"
        }

@api_router.get("/exchange-rates/{base_currency}")
async def get_exchange_rates(base_currency: str):
    """Get exchange rates for a specific base currency"""
    try:
        rates = await exchange_service.get_rates(base_currency.upper())
        return {
            "base": base_currency.upper(),
            "rates": rates,
            "source": "live"
        }
    except Exception as e:
        logger.error(f"Failed to get rates for {base_currency}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch exchange rates")

@api_router.post("/convert-currency")
async def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str
):
    """Convert an amount between currencies"""
    try:
        result = await exchange_service.convert(amount, from_currency, to_currency)
        return result
    except Exception as e:
        logger.error(f"Conversion failed: {e}")
        raise HTTPException(status_code=500, detail="Currency conversion failed")

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

# AI Assistant Endpoint - Upgraded for accuracy and reliability
@api_router.post("/ai-assistant")
async def ai_assistant(request: dict):
    """Natural language query about finances using AI - Data-Driven and Accurate"""
    question = request.get("question", "")
    
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    
    from collections import defaultdict
    from datetime import datetime as dt, date as date_module
    import calendar
    
    # Get today's date for reference
    today = date_module.today()
    current_month = today.month
    current_year = today.year
    
    # Get all transactions and standing orders
    all_transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    standing_orders = await db.recurring_transactions.find({"active": True}, {"_id": 0}).to_list(1000)
    
    # Helper function to parse dates
    def parse_date(date_str):
        if not date_str:
            return None
        try:
            return dt.fromisoformat(date_str.split('T')[0]).date()
        except:
            return None
    
    # Organize transactions by various dimensions
    all_data = {
        "total_income": 0,
        "total_expenses": 0,
        "income_by_category": defaultdict(float),
        "expense_by_category": defaultdict(float),
        "income_by_month": defaultdict(float),
        "expense_by_month": defaultdict(float),
        "income_by_category_and_month": defaultdict(lambda: defaultdict(float)),  # NEW: Track income source by month
        "expense_by_category_and_month": defaultdict(lambda: defaultdict(float)),  # NEW: Track expense category by month
        "transactions_by_month": defaultdict(list),
        "all_categories": set(),
        "income_categories": set(),  # NEW: Track income categories specifically
        "expense_categories": set(),  # NEW: Track expense categories specifically
        "date_range": {"earliest": None, "latest": None}
    }
    
    # Process all transactions
    for t in all_transactions:
        amount = t.get("amount", 0)
        trans_type = t.get("type", "")
        category = t.get("category", "Other")
        date = parse_date(t.get("date"))
        description = t.get("description", "")
        is_standing = t.get("is_standing_order", False) or "[Standing Order]" in description
        
        if not date:
            continue
        
        # Track date range
        if all_data["date_range"]["earliest"] is None or date < all_data["date_range"]["earliest"]:
            all_data["date_range"]["earliest"] = date
        if all_data["date_range"]["latest"] is None or date > all_data["date_range"]["latest"]:
            all_data["date_range"]["latest"] = date
        
        month_key = f"{date.year}-{date.month:02d}"
        month_name = f"{calendar.month_name[date.month]} {date.year}"
        
        all_data["all_categories"].add(category)
        
        trans_info = {
            "date": date.isoformat(),
            "month": month_name,
            "type": trans_type,
            "amount": amount,
            "category": category,
            "description": description,
            "is_standing_order": is_standing
        }
        
        all_data["transactions_by_month"][month_key].append(trans_info)
        
        if trans_type == "income":
            all_data["total_income"] += amount
            all_data["income_by_category"][category] += amount
            all_data["income_by_month"][month_name] += amount
            all_data["income_by_category_and_month"][category][month_name] += amount  # NEW
            all_data["income_categories"].add(category)  # NEW
        elif trans_type == "expense":
            all_data["total_expenses"] += amount
            all_data["expense_by_category"][category] += amount
            all_data["expense_by_month"][month_name] += amount
            all_data["expense_by_category_and_month"][category][month_name] += amount  # NEW
            all_data["expense_categories"].add(category)  # NEW
    
    # Count standing orders
    standing_order_count = len(standing_orders)
    standing_orders_summary = []
    for so in standing_orders:
        standing_orders_summary.append({
            "description": so.get("description"),
            "amount": so.get("amount"),
            "category": so.get("category"),
            "frequency": so.get("frequency"),
            "type": so.get("type")
        })
    
    # Build detailed income source breakdown by month
    income_source_details = []
    for category in sorted(all_data["income_categories"]):
        cat_total = all_data["income_by_category"][category]
        monthly_breakdown = all_data["income_by_category_and_month"][category]
        months_str = ", ".join([f"{m}: ${amt:.2f}" for m, amt in sorted(monthly_breakdown.items())])
        income_source_details.append(f"  • {category}: ${cat_total:.2f} total")
        if months_str:
            income_source_details.append(f"    Monthly: {months_str}")
    
    # Build detailed expense category breakdown by month
    expense_category_details = []
    for category in sorted(all_data["expense_categories"]):
        cat_total = all_data["expense_by_category"][category]
        monthly_breakdown = all_data["expense_by_category_and_month"][category]
        months_str = ", ".join([f"{m}: ${amt:.2f}" for m, amt in sorted(monthly_breakdown.items())])
        expense_category_details.append(f"  • {category}: ${cat_total:.2f} total")
        if months_str:
            expense_category_details.append(f"    Monthly: {months_str}")
    
    # Build comprehensive data summary
    data_summary = f"""
===== YOUR FINANCIAL DATA (EXACT VALUES - DO NOT MODIFY) =====

TODAY'S DATE: {today.isoformat()}
CURRENT MONTH: {calendar.month_name[current_month]} {current_year}
PREVIOUS MONTH: {calendar.month_name[current_month - 1 if current_month > 1 else 12]} {current_year if current_month > 1 else current_year - 1}

DATA RANGE: {all_data["date_range"]["earliest"]} to {all_data["date_range"]["latest"]}
TOTAL TRANSACTIONS: {len(all_transactions)}

--- LIFETIME TOTALS ---
TOTAL INCOME (all time): ${all_data["total_income"]:.2f}
TOTAL EXPENSES (all time): ${all_data["total_expenses"]:.2f}
NET BALANCE (all time): ${(all_data["total_income"] - all_data["total_expenses"]):.2f}

--- ACTIVE STANDING ORDERS ({standing_order_count} total) ---
{chr(10).join([f"  • {so['description']}: ${so['amount']:.2f} ({so['frequency']}, {so['type']}, category: {so['category']})" for so in standing_orders_summary]) if standing_orders_summary else "  None"}

--- INCOME BY SOURCE/CATEGORY (DETAILED) ---
Income Sources: {', '.join(sorted(all_data["income_categories"])) if all_data["income_categories"] else "None recorded"}
{chr(10).join(income_source_details) if income_source_details else "  No income recorded"}

--- EXPENSES BY CATEGORY (DETAILED) ---
Expense Categories: {', '.join(sorted(all_data["expense_categories"])) if all_data["expense_categories"] else "None recorded"}
{chr(10).join(expense_category_details) if expense_category_details else "  No expenses recorded"}

--- INCOME BY MONTH (TOTALS) ---
{chr(10).join([f"  • {month}: ${amt:.2f}" for month, amt in sorted(all_data["income_by_month"].items())]) if all_data["income_by_month"] else "  No income recorded"}

--- EXPENSES BY MONTH (TOTALS) ---
{chr(10).join([f"  • {month}: ${amt:.2f}" for month, amt in sorted(all_data["expense_by_month"].items())]) if all_data["expense_by_month"] else "  No expenses recorded"}

===== END OF DATA =====
"""

    # Use emergentintegrations to call OpenAI
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    
    if not llm_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    system_prompt = """You are an ACCURATE financial assistant that ONLY uses the exact data provided. You MUST follow these rules:

CRITICAL RULES:
1. ONLY use numbers from the data provided. NEVER estimate, guess, or calculate values yourself.
2. If asked about a time period not in the data, say "No data found for [period]"
3. If a question is ambiguous, ask for clarification BEFORE answering. Examples:
   - "this month" vs "last month" - ask which they mean
   - Unclear income source - list available sources and ask which one
4. ALWAYS respond in ENGLISH
5. Your answers MUST match what the user would see on their dashboard

INCOME SOURCE QUERIES (CRITICAL):
- When asked about income sources like "tips", "salary", "freelance", "bonus":
  - Look in the "INCOME BY SOURCE/CATEGORY (DETAILED)" section
  - Common income categories: "Salary / wages", "Commissions / tips", "Freelance income", "Overtime / bonuses"
  - If the exact source isn't found, say "No income recorded for [source]. Available income sources are: [list]"
  - For "tips" → look for "Commissions / tips" or similar
  - For "salary" → look for "Salary / wages"
  - For "freelance" → look for "Freelance income"

TIME PERIOD HANDLING:
- "this month" = use CURRENT MONTH from TODAY'S DATE
- "last month" = use PREVIOUS MONTH
- For specific month queries, find the month in the DETAILED section showing per-month amounts

IF NO DATA EXISTS:
- Say clearly: "I don't have any [category] income/expense data for [time period]"
- List what IS available: "However, I do have data for: [list sources/months]"
- DO NOT make up numbers

CONSISTENCY CHECK:
- Your numbers must match the analytics charts and dashboard totals
- Always cite the exact category name as shown in the data"""

    prompt = f"""User Question: {question}

{data_summary}

Answer the user's question accurately using ONLY the data above. 
- For income source questions (tips, salary, etc.), check the DETAILED income breakdown.
- If the question is ambiguous or data doesn't exist, say so clearly and list what IS available."""
    
    try:
        client = LlmChat(
            api_key=llm_key,
            session_id="financial_assistant_v2",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
        
        user_msg = UserMessage(text=prompt)
        answer = await client.send_message(user_msg)
        
        return {"answer": answer, "question": question}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# Daily Quote of the Day - Enhanced with Famous Investor Quotes
class QuoteOfDay(BaseModel):
    quote: str
    author: str = "Financial Wisdom"
    date: str
    category: str = "finance"

# Famous investor and entrepreneur quotes organized by category
FAMOUS_QUOTES = {
    "investor_wisdom": [
        ("The stock market is a device for transferring money from the impatient to the patient.", "Warren Buffett"),
        ("Risk comes from not knowing what you're doing.", "Warren Buffett"),
        ("Someone's sitting in the shade today because someone planted a tree a long time ago.", "Warren Buffett"),
        ("Price is what you pay. Value is what you get.", "Warren Buffett"),
        ("The best investment you can make is in yourself.", "Warren Buffett"),
        ("It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.", "Warren Buffett"),
        ("Spend each day trying to be a little wiser than you were when you woke up.", "Charlie Munger"),
        ("The big money is not in the buying and selling, but in the waiting.", "Charlie Munger"),
        ("Knowing what you don't know is more useful than being brilliant.", "Charlie Munger"),
        ("Know what you own, and know why you own it.", "Peter Lynch"),
        ("In the short run, the market is a voting machine. In the long run, it's a weighing machine.", "Benjamin Graham"),
        ("The four most dangerous words in investing are: 'This time it's different.'", "Sir John Templeton"),
    ],
    "financial_freedom": [
        ("Wealth is the ability to fully experience life.", "Henry David Thoreau"),
        ("Financial freedom is available to those who learn about it and work for it.", "Robert Kiyosaki"),
        ("Money is a terrible master but an excellent servant.", "P.T. Barnum"),
        ("Don't let making a living prevent you from making a life.", "John Wooden"),
        ("Time is more valuable than money. You can get more money, but you cannot get more time.", "Jim Rohn"),
        ("The goal isn't more money. The goal is living life on your own terms.", "Chris Brogan"),
        ("Retirement is not the end of the road. It is the beginning of the open highway.", "Unknown"),
        ("The secret to wealth is simple: Find a way to do more for others than anyone else.", "Tony Robbins"),
    ],
    "discipline": [
        ("Do not save what is left after spending; instead spend what is left after saving.", "Warren Buffett"),
        ("A budget is telling your money where to go instead of wondering where it went.", "Dave Ramsey"),
        ("Beware of little expenses. A small leak will sink a great ship.", "Benjamin Franklin"),
        ("It's not your salary that makes you rich, it's your spending habits.", "Charles A. Jaffe"),
        ("Every time you borrow money, you're robbing your future self.", "Nathan W. Morris"),
        ("Compound interest is the eighth wonder of the world. He who understands it, earns it.", "Albert Einstein"),
        ("The habit of saving is itself an education.", "George S. Clason"),
        ("Rich people stay rich by living like they're broke. Broke people stay broke by living like they're rich.", "Unknown"),
    ],
    "motivation": [
        ("Formal education will make you a living; self-education will make you a fortune.", "Jim Rohn"),
        ("The only way to do great work is to love what you do.", "Steve Jobs"),
        ("Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill"),
        ("The question isn't who is going to let me; it's who is going to stop me.", "Ayn Rand"),
        ("Seek wealth, not money or status. Wealth is having assets that earn while you sleep.", "Naval Ravikant"),
        ("Play long-term games with long-term people.", "Naval Ravikant"),
        ("Learn to sell. Learn to build. If you can do both, you will be unstoppable.", "Naval Ravikant"),
        ("Specific knowledge is knowledge that you cannot be trained for.", "Naval Ravikant"),
    ],
    "mindset": [
        ("An investment in knowledge pays the best interest.", "Benjamin Franklin"),
        ("Empty pockets never held anyone back. Only empty heads and empty hearts can do that.", "Norman Vincent Peale"),
        ("Wealth is not about having a lot of money; it's about having a lot of options.", "Chris Rock"),
        ("Money grows on the tree of persistence.", "Japanese Proverb"),
        ("The more you learn, the more you earn.", "Warren Buffett"),
        ("Never depend on a single income. Make investment to create a second source.", "Warren Buffett"),
        ("If you don't find a way to make money while you sleep, you will work until you die.", "Warren Buffett"),
        ("Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.", "Dave Ramsey"),
    ],
}

@api_router.get("/quote-of-day")
async def get_quote_of_day():
    """Get the quote of the day - generates a new one daily using AI or famous quotes"""
    from datetime import date as date_obj
    import random
    
    today = date_obj.today().isoformat()
    
    # Check if we already have a quote for today
    existing_quote = await db.daily_quotes.find_one({"date": today}, {"_id": 0})
    
    if existing_quote:
        return existing_quote
    
    # Get recent quotes to avoid repetition
    recent_quotes = await db.daily_quotes.find(
        {}, 
        {"_id": 0, "quote": 1}
    ).sort("date", -1).limit(30).to_list(30)
    
    recent_quote_texts = set(q.get("quote", "")[:50] for q in recent_quotes)
    
    # 50% chance to use a famous quote, 50% to generate with AI
    use_famous_quote = random.random() < 0.5
    
    if use_famous_quote:
        # Select a random category
        category = random.choice(list(FAMOUS_QUOTES.keys()))
        quotes_list = FAMOUS_QUOTES[category]
        
        # Try to find a non-repeated quote
        available_quotes = [q for q in quotes_list if q[0][:50] not in recent_quote_texts]
        
        if not available_quotes:
            # All quotes used recently, pick from any category
            all_quotes = [(q, cat) for cat, quotes in FAMOUS_QUOTES.items() for q in quotes]
            available_quotes = [q for q, cat in all_quotes if q[0][:50] not in recent_quote_texts]
            
            if available_quotes:
                quote_tuple = random.choice(available_quotes)
            else:
                quote_tuple = random.choice(quotes_list)
        else:
            quote_tuple = random.choice(available_quotes)
        
        quote_text, author = quote_tuple
        
        new_quote = {
            "quote": quote_text,
            "author": author,
            "date": today,
            "category": category,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.daily_quotes.insert_one(new_quote)
        
        return {
            "quote": new_quote["quote"],
            "author": new_quote["author"],
            "date": new_quote["date"],
            "category": new_quote["category"]
        }
    
    # Try to generate with AI
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        
        if not llm_key:
            return await get_fallback_quote(today)
        
        # Pick a random theme for variety
        themes = [
            "long-term investing and patience",
            "financial discipline and saving habits",
            "wealth building and compound growth",
            "financial freedom and independence",
            "smart money management",
            "overcoming financial obstacles",
        ]
        theme = random.choice(themes)
        
        avoid_text = "\n".join(list(recent_quote_texts)[:10]) if recent_quote_texts else ""
        
        client = LlmChat(
            api_key=llm_key,
            session_id="daily_quote_generator",
            system_message="You are a wise financial mentor who creates inspiring, practical quotes about money and wealth. Your quotes should feel authentic and timeless, like something Warren Buffett, Charlie Munger, or Naval Ravikant might say."
        ).with_model("openai", "gpt-4o-mini")
        
        prompt = f"""Generate ONE unique, inspiring quote about {theme}.

REQUIREMENTS:
- Keep it SHORT: 1-2 sentences maximum
- Be practical and actionable
- Sound wise and timeless
- Do NOT include quotation marks
- Do NOT attribute it to anyone

{"AVOID similar themes to these recent quotes:" + chr(10) + avoid_text if avoid_text else ""}

Respond with ONLY the quote text, nothing else."""

        user_msg = UserMessage(text=prompt)
        quote_text = await client.send_message(user_msg)
        
        quote_text = quote_text.strip().strip('"').strip("'")
        
        categories = ["investor_wisdom", "financial_freedom", "discipline", "motivation", "mindset"]
        category = random.choice(categories)
        
        new_quote = {
            "quote": quote_text,
            "author": "Daily Financial Wisdom",
            "date": today,
            "category": category,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.daily_quotes.insert_one(new_quote)
        
        return {
            "quote": new_quote["quote"],
            "author": new_quote["author"],
            "date": new_quote["date"],
            "category": new_quote["category"]
        }
        
    except Exception as e:
        logging.error(f"Error generating quote: {e}")
        return await get_fallback_quote(today)

async def get_fallback_quote(today: str):
    """Return a fallback quote if AI generation fails"""
    import random
    
    # Use famous quotes as fallback
    all_quotes = []
    for category, quotes in FAMOUS_QUOTES.items():
        for quote, author in quotes:
            all_quotes.append((quote, author, category))
    
    # Try to get the last successful quote
    last_quote = await db.daily_quotes.find_one({}, {"_id": 0}, sort=[("date", -1)])
    
    if last_quote:
        return last_quote
    
    # Use a random famous quote
    quote_text, author, category = random.choice(all_quotes)
    
    return {
        "quote": quote_text,
        "author": author,
        "date": today,
        "category": category
    }

# Include all routers
api_router.include_router(users_router)
api_router.include_router(subscription_router)
api_router.include_router(admin_router)

# Add edit endpoint for recurring transactions
class RecurringTransactionUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    frequency: Optional[Literal["daily", "weekly", "monthly", "yearly"]] = None
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    end_date: Optional[str] = None

@api_router.put("/recurring-transactions/{recurring_id}")
async def update_recurring_transaction(recurring_id: str, update_data: RecurringTransactionUpdate):
    """Update a recurring transaction / standing order"""
    # Check if exists
    existing = await db.recurring_transactions.find_one({"id": recurring_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Standing order not found")
    
    # Build update dict
    update_dict = {}
    if update_data.amount is not None:
        update_dict["amount"] = update_data.amount
    if update_data.description is not None:
        update_dict["description"] = update_data.description
    if update_data.category is not None:
        update_dict["category"] = update_data.category
    if update_data.frequency is not None:
        update_dict["frequency"] = update_data.frequency
    if update_data.day_of_month is not None:
        update_dict["day_of_month"] = update_data.day_of_month
    if update_data.day_of_week is not None:
        update_dict["day_of_week"] = update_data.day_of_week
    if update_data.end_date is not None:
        update_dict["end_date"] = update_data.end_date
    
    if update_dict:
        await db.recurring_transactions.update_one(
            {"id": recurring_id},
            {"$set": update_dict}
        )
    
    return {"message": "Standing order updated successfully"}

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

@app.on_event("startup")
async def startup_event():
    """Process any due recurring transactions on startup"""
    import asyncio
    
    logger.info("Processing recurring transactions on startup...")
    try:
        # Run the recurring transaction processor
        result = await process_recurring_transactions()
        logger.info(f"Startup processing complete: {result}")
    except Exception as e:
        logger.error(f"Error processing recurring transactions on startup: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()