from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

# Supported currencies
SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "INR", "CNY", "BRL", "MXN", "KRW", "SGD", "HKD", "NOK", "SEK", "DKK", "NZD", "ZAR", "RUB"]

class UserBase(BaseModel):
    email: EmailStr
    username: str

class User(UserBase):
    id: str
    subscription_level: Literal['free', 'premium'] = 'free'
    subscription_expires_at: Optional[datetime] = None
    primary_currency: str = 'USD'
    created_at: datetime
    is_active: bool = True

class UserResponse(BaseModel):
    user_id: str
    email: str
    username: str
    subscription_level: Literal['free', 'premium']
    subscription_expires_at: Optional[str] = None
    is_premium: bool
    primary_currency: str = 'USD'

class UserPreferencesUpdate(BaseModel):
    primary_currency: Optional[str] = None

class AdminBankInfo(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    iban: Optional[str] = None
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now())

class AdminCredentials(BaseModel):
    username: str
    password: str
