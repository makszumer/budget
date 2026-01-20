"""Transaction-related Pydantic models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, List
from datetime import datetime, timezone
import uuid


class Transaction(BaseModel):
    """Base transaction model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["expense", "income", "investment"]
    amount: float
    description: Optional[str] = ""
    category: str
    date: str
    # Investment specific fields
    asset: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None
    currency: str = "USD"
    # Multi-currency support
    original_amount: Optional[float] = None
    original_currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    conversion_date: Optional[str] = None
    is_estimated_rate: Optional[bool] = False
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransactionCreate(BaseModel):
    """Model for creating a transaction"""
    type: Literal["expense", "income", "investment"]
    amount: float
    description: Optional[str] = ""
    category: str
    date: str
    asset: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None
    currency: Optional[str] = None
    convert_from_currency: Optional[str] = None


class TransactionSummary(BaseModel):
    """Summary of all transactions"""
    totalIncome: float
    totalExpenses: float
    totalInvestments: float
    balance: float


class RecurringTransaction(BaseModel):
    """Recurring transaction (standing order) model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    last_created: Optional[str] = None
    active: bool = True
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RecurringTransactionCreate(BaseModel):
    """Model for creating a recurring transaction"""
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


class CustomCategory(BaseModel):
    """Custom category model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    type: Literal["expense", "income"]
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CustomCategoryCreate(BaseModel):
    """Model for creating a custom category"""
    name: str
    type: Literal["expense", "income"]


class CustomCategoryUpdate(BaseModel):
    """Model for updating a custom category"""
    name: str
