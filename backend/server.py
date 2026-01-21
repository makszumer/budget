"""
Financial Tracker API - Main Server
===================================
This is the main entry point for the FastAPI application.
All routes are modularized into separate files under /routes/
"""
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, Literal
import sys

# Setup
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
sys.path.append(str(ROOT_DIR))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize exchange rate service
from services.exchange_rate import init_exchange_service
exchange_service = init_exchange_service(db)

# Import route modules
from routes.users import router as users_router
from routes.subscription import router as subscription_router
from routes.admin import router as admin_router
from routes.transactions import router as transactions_router
from routes.transactions import init_router as init_transactions_router
from routes.analytics import router as analytics_router
from routes.analytics import init_router as init_analytics_router
from routes.portfolio import router as portfolio_router
from routes.portfolio import init_router as init_portfolio_router, get_portfolio
from routes.recurring import router as recurring_router
from routes.recurring import init_router as init_recurring_router
from routes.budget_envelopes import router as budget_envelopes_router
from routes.budget_envelopes import init_router as init_envelopes_router
from routes.currency import router as currency_router
from routes.currency import init_router as init_currency_router
from routes.categories import router as categories_router
from routes.categories import init_router as init_categories_router
from routes.ai import router as ai_router
from routes.ai import init_router as init_ai_router

# Initialize all route modules with database
init_transactions_router(db, exchange_service)
init_analytics_router(db, get_portfolio)
init_portfolio_router(db)
init_recurring_router(db)
init_envelopes_router(db)
init_currency_router(db, exchange_service)
init_categories_router(db)
init_ai_router(db)

# Create FastAPI app
app = FastAPI(
    title="Vaulton API",
    description="Vaulton - A comprehensive API for tracking personal finances, investments, and budgets",
    version="2.0.0"
)

# Create main API router with /api prefix
api_router = APIRouter(prefix="/api")


# ========== ROOT ENDPOINT ==========

@api_router.get("/")
async def root():
    """API health check endpoint"""
    return {"message": "Financial Tracker API", "status": "healthy"}


# ========== RECURRING TRANSACTION UPDATE (additional endpoint) ==========

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
    existing = await db.recurring_transactions.find_one({"id": recurring_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Standing order not found")
    
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
    
    updated = await db.recurring_transactions.find_one({"id": recurring_id}, {"_id": 0})
    return updated


# ========== INCLUDE ALL ROUTERS ==========

# Auth and subscription routes
api_router.include_router(users_router)
api_router.include_router(subscription_router)
api_router.include_router(admin_router)

# Core feature routes
api_router.include_router(transactions_router)
api_router.include_router(analytics_router)
api_router.include_router(portfolio_router)
api_router.include_router(recurring_router)
api_router.include_router(budget_envelopes_router)
api_router.include_router(currency_router)
api_router.include_router(categories_router)
api_router.include_router(ai_router)

# Mount the API router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== APP STARTUP/SHUTDOWN ==========

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Financial Tracker API starting up...")
    logger.info(f"Connected to MongoDB: {os.environ['DB_NAME']}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Financial Tracker API shutting down...")
    client.close()
