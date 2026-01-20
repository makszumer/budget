"""Models package for the financial tracker API"""

# Import from root models.py for backward compatibility with user models
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from models import (
    UserBase, User, UserResponse, UserPreferencesUpdate,
    AdminBankInfo, AdminCredentials, SUPPORTED_CURRENCIES
)

# Import new modular models
from .transaction import (
    Transaction,
    TransactionCreate,
    TransactionSummary,
    RecurringTransaction,
    RecurringTransactionCreate,
    CustomCategory,
    CustomCategoryCreate,
    CustomCategoryUpdate,
)
from .analytics import (
    CategoryBreakdown,
    AnalyticsData,
    GrowthDataPoint,
    BudgetGrowth,
    InvestmentGrowth,
    PortfolioHolding,
    PortfolioSummary,
)

__all__ = [
    # User models (from root models.py)
    "UserBase",
    "User",
    "UserResponse",
    "UserPreferencesUpdate",
    "AdminBankInfo",
    "AdminCredentials",
    "SUPPORTED_CURRENCIES",
    # Transaction models
    "Transaction",
    "TransactionCreate",
    "TransactionSummary",
    "RecurringTransaction",
    "RecurringTransactionCreate",
    "CustomCategory",
    "CustomCategoryCreate",
    "CustomCategoryUpdate",
    # Analytics models
    "CategoryBreakdown",
    "AnalyticsData",
    "GrowthDataPoint",
    "BudgetGrowth",
    "InvestmentGrowth",
    "PortfolioHolding",
    "PortfolioSummary",
]

