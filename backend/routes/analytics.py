"""Analytics routes - Budget and investment analytics"""
from fastapi import APIRouter
from collections import defaultdict

from models.analytics import (
    AnalyticsData, CategoryBreakdown, BudgetGrowth, InvestmentGrowth, GrowthDataPoint
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Will be injected by main app
db = None
get_portfolio_func = None


def init_router(database, portfolio_func=None):
    """Initialize the router with database"""
    global db, get_portfolio_func
    db = database
    get_portfolio_func = portfolio_func


@router.get("", response_model=AnalyticsData)
async def get_analytics():
    """Get category breakdowns for expenses, income, and investments"""
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


@router.get("/budget-growth", response_model=BudgetGrowth)
async def get_budget_growth():
    """Get budget growth over time"""
    transactions = await db.transactions.find(
        {"type": {"$in": ["income", "expense"]}},
        {"_id": 0}
    ).to_list(1000)
    
    transactions.sort(key=lambda x: x['date'])
    
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


@router.get("/investment-growth", response_model=InvestmentGrowth)
async def get_investment_growth():
    """Get investment growth over time"""
    investments = await db.transactions.find(
        {"type": "investment"},
        {"_id": 0}
    ).to_list(1000)
    
    investments.sort(key=lambda x: x['date'])
    
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
    current_value = 0
    total_gain = 0
    if get_portfolio_func:
        portfolio = await get_portfolio_func()
        current_value = portfolio.current_value
        total_gain = portfolio.total_gain_loss
    
    return InvestmentGrowth(
        data=growth_data,
        total_invested=cumulative_invested,
        current_value=current_value,
        total_gain=total_gain
    )
