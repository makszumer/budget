"""Models package for the financial tracker API

This package contains Pydantic models for the API.
User-related models remain in the root /app/backend/models.py for backward compatibility.
"""

# Import new modular models (avoid importing from root models.py to prevent circular imports)
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
