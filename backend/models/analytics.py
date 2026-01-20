"""Analytics-related Pydantic models"""
from pydantic import BaseModel
from typing import List


class CategoryBreakdown(BaseModel):
    """Breakdown of amounts by category"""
    category: str
    amount: float
    percentage: float


class AnalyticsData(BaseModel):
    """Complete analytics data"""
    expense_breakdown: List[CategoryBreakdown]
    income_breakdown: List[CategoryBreakdown]
    investment_breakdown: List[CategoryBreakdown]


class GrowthDataPoint(BaseModel):
    """Single data point for growth tracking"""
    date: str
    value: float
    cumulative: float


class BudgetGrowth(BaseModel):
    """Budget growth over time"""
    data: List[GrowthDataPoint]
    total_income: float
    total_expenses: float
    net_savings: float


class InvestmentGrowth(BaseModel):
    """Investment growth over time"""
    data: List[GrowthDataPoint]
    total_invested: float
    current_value: float
    total_gain: float


class PortfolioHolding(BaseModel):
    """Single portfolio holding"""
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
    """Complete portfolio summary"""
    holdings: List[PortfolioHolding]
    total_invested: float
    current_value: float
    total_gain_loss: float
    total_roi_percentage: float
