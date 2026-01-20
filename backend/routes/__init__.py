"""Routes package for the financial tracker API"""
from .users import router as users_router
from .subscription import router as subscription_router
from .admin import router as admin_router
from .transactions import router as transactions_router
from .analytics import router as analytics_router
from .portfolio import router as portfolio_router
from .recurring import router as recurring_router
from .budget_envelopes import router as budget_envelopes_router
from .currency import router as currency_router
from .categories import router as categories_router
from .ai import router as ai_router

__all__ = [
    "users_router",
    "subscription_router", 
    "admin_router",
    "transactions_router",
    "analytics_router",
    "portfolio_router",
    "recurring_router",
    "budget_envelopes_router",
    "currency_router",
    "categories_router",
    "ai_router",
]
