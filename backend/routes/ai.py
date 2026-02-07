"""AI routes - Data-driven financial engine, voice parsing, and daily quotes"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, date as date_module, timedelta
from collections import defaultdict
import calendar
import logging
import random
import re
import os

router = APIRouter(tags=["ai"])

# Will be injected by main app
db = None

logger = logging.getLogger(__name__)


def init_router(database):
    """Initialize the router with database"""
    global db
    db = database


# ========== VOICE INPUT MODELS ==========

class VoiceTransactionRequest(BaseModel):
    text: str
    user_id: Optional[str] = None


class VoiceTransactionResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[dict] = None
    needs_clarification: bool = False
    needs_type_clarification: bool = False
    all_categories: Optional[dict] = None
    matched_categories: Optional[List[str]] = None
    parsed_amount: Optional[float] = None
    parsed_type: Optional[str] = None
    parsed_description: Optional[str] = None


# ========== DATE PARSING UTILITIES ==========

def get_quarter_dates(quarter: int, year: int):
    """Get start and end dates for a quarter"""
    quarter_months = {
        1: (1, 3),   # Q1: Jan-Mar
        2: (4, 6),   # Q2: Apr-Jun
        3: (7, 9),   # Q3: Jul-Sep
        4: (10, 12)  # Q4: Oct-Dec
    }
    start_month, end_month = quarter_months[quarter]
    start_date = date_module(year, start_month, 1)
    last_day = calendar.monthrange(year, end_month)[1]
    end_date = date_module(year, end_month, last_day)
    return start_date, end_date


def parse_date_reference(text: str, data_years: List[int]) -> tuple:
    """
    Parse date references from natural language.
    Returns (start_date, end_date, period_description)
    """
    text_lower = text.lower()
    today = date_module.today()
    current_year = today.year
    current_month = today.month
    
    # Use most recent year from data if available
    most_recent_year = max(data_years) if data_years else current_year
    
    # Today
    if "today" in text_lower:
        return today, today, "today"
    
    # This week
    if "this week" in text_lower:
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start, end, "this week"
    
    # Last week
    if "last week" in text_lower:
        start = today - timedelta(days=today.weekday() + 7)
        end = start + timedelta(days=6)
        return start, end, "last week"
    
    # This month
    if "this month" in text_lower:
        start = date_module(current_year, current_month, 1)
        last_day = calendar.monthrange(current_year, current_month)[1]
        end = date_module(current_year, current_month, last_day)
        return start, end, f"{calendar.month_name[current_month]} {current_year}"
    
    # Last month
    if "last month" in text_lower:
        if current_month == 1:
            month = 12
            year = current_year - 1
        else:
            month = current_month - 1
            year = current_year
        start = date_module(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        end = date_module(year, month, last_day)
        return start, end, f"{calendar.month_name[month]} {year}"
    
    # This year
    if "this year" in text_lower:
        start = date_module(current_year, 1, 1)
        end = date_module(current_year, 12, 31)
        return start, end, f"{current_year}"
    
    # Last year
    if "last year" in text_lower:
        year = current_year - 1
        start = date_module(year, 1, 1)
        end = date_module(year, 12, 31)
        return start, end, f"{year}"
    
    # Last N days/weeks/months
    last_n_days = re.search(r"last\s+(\d+)\s+days?", text_lower)
    if last_n_days:
        n = int(last_n_days.group(1))
        start = today - timedelta(days=n)
        return start, today, f"last {n} days"
    
    last_n_weeks = re.search(r"last\s+(\d+)\s+weeks?", text_lower)
    if last_n_weeks:
        n = int(last_n_weeks.group(1))
        start = today - timedelta(weeks=n)
        return start, today, f"last {n} weeks"
    
    last_n_months = re.search(r"last\s+(\d+)\s+months?", text_lower)
    if last_n_months:
        n = int(last_n_months.group(1))
        month = current_month - n
        year = current_year
        while month <= 0:
            month += 12
            year -= 1
        start = date_module(year, month, 1)
        return start, today, f"last {n} months"
    
    # Quarters (Q1, Q2, Q3, Q4)
    quarter_match = re.search(r"q([1-4])\s*(\d{4})?", text_lower)
    if quarter_match:
        q = int(quarter_match.group(1))
        year = int(quarter_match.group(2)) if quarter_match.group(2) else most_recent_year
        start, end = get_quarter_dates(q, year)
        return start, end, f"Q{q} {year}"
    
    # Specific month names
    month_names = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4,
        "jun": 6, "jul": 7, "aug": 8, "sep": 9,
        "oct": 10, "nov": 11, "dec": 12
    }
    
    for month_name, month_num in month_names.items():
        if month_name in text_lower:
            # Check for year in text
            year_match = re.search(r"(\d{4})", text_lower)
            if year_match:
                year = int(year_match.group(1))
            else:
                # Use most recent year from data
                year = most_recent_year
            
            start = date_module(year, month_num, 1)
            last_day = calendar.monthrange(year, month_num)[1]
            end = date_module(year, month_num, last_day)
            return start, end, f"{calendar.month_name[month_num]} {year}"
    
    # Default: all time
    return None, None, "all time"


def parse_transaction_date(date_str):
    """Parse a date string from transaction data"""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.split('T')[0]).date()
    except ValueError:
        return None


# ========== CATEGORY/ASSET MATCHING ==========

CATEGORY_KEYWORDS = {
    # Expenses
    "food": ["food", "groceries", "restaurants", "cafes", "takeout", "delivery", "dining"],
    "groceries": ["groceries", "grocery", "supermarket", "food shopping"],
    "restaurants": ["restaurants", "cafes", "dining", "eating out", "restaurant"],
    "transport": ["transport", "transportation", "fuel", "gas", "uber", "lyft", "taxi", "public transport"],
    "rent": ["rent", "mortgage", "housing"],
    "utilities": ["utilities", "electricity", "water", "internet", "phone"],
    "subscriptions": ["subscriptions", "netflix", "spotify", "streaming"],
    "entertainment": ["entertainment", "movies", "concerts", "events"],
    "health": ["health", "medical", "doctor", "dentist", "pharmacy", "gym", "fitness"],
    "shopping": ["shopping", "clothing", "clothes", "shoes"],
    # Income
    "salary": ["salary", "wages", "paycheck", "pay"],
    "tips": ["tips", "tip", "gratuity"],
    "bonus": ["bonus", "bonuses"],
    "freelance": ["freelance", "consulting", "side hustle", "gig"],
    # Investments
    "stocks": ["stocks", "stock", "shares"],
    "etfs": ["etfs", "etf", "index fund", "index funds"],
    "crypto": ["crypto", "cryptocurrency", "bitcoin", "ethereum"],
    "bonds": ["bonds", "bond"],
    "real estate": ["real estate", "property", "reit"],
}


def match_category(text: str, categories: List[str]) -> List[str]:
    """Match text to transaction categories"""
    text_lower = text.lower()
    matched = []
    
    # First, check for exact category name matches
    for cat in categories:
        if cat.lower() in text_lower:
            matched.append(cat)
    
    # Then check keyword matches
    for keyword, synonyms in CATEGORY_KEYWORDS.items():
        if any(syn in text_lower for syn in synonyms):
            for cat in categories:
                cat_lower = cat.lower()
                if keyword in cat_lower or any(syn in cat_lower for syn in synonyms):
                    if cat not in matched:
                        matched.append(cat)
    
    return matched


def match_asset(text: str, assets: List[str]) -> List[str]:
    """Match text to investment assets"""
    text_lower = text.lower()
    matched = []
    
    for asset in assets:
        if asset.lower() in text_lower:
            matched.append(asset)
    
    return matched


# ========== AI ASSISTANT - DATA-DRIVEN FINANCIAL ENGINE ==========

@router.post("/ai-assistant")
async def ai_assistant(request: dict):
    """
    Data-driven financial analysis engine.
    ALWAYS searches and calculates from stored data before answering.
    """
    question = request.get("question", "")
    
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    
    # ========== FETCH ALL DATA ==========
    all_transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    if not all_transactions:
        return {
            "answer": "There are no transactions recorded yet. Start by adding some income, expenses, or investments!",
            "data_provided": True
        }
    
    # Parse all transactions and extract metadata
    parsed_transactions = []
    all_categories = set()
    all_assets = set()
    all_years = set()
    
    for t in all_transactions:
        date = parse_transaction_date(t.get("date"))
        if date:
            all_years.add(date.year)
        
        category = t.get("category", "Other")
        asset = t.get("asset", "")
        all_categories.add(category)
        if asset:
            all_assets.add(asset)
        
        parsed_transactions.append({
            "type": t.get("type", ""),
            "amount": t.get("amount", 0),
            "category": category,
            "asset": asset,
            "date": date,
            "description": t.get("description", ""),
            "quantity": t.get("quantity"),
            "purchase_price": t.get("purchase_price"),
        })
    
    # ========== PARSE USER QUERY ==========
    text_lower = question.lower()
    
    # Determine query type
    query_type = None
    if any(kw in text_lower for kw in ["spend", "spent", "expense", "cost", "paid", "bought"]):
        query_type = "expense"
    elif any(kw in text_lower for kw in ["earn", "earned", "income", "made", "received", "salary", "tips"]):
        query_type = "income"
    elif any(kw in text_lower for kw in ["invest", "invested", "investment", "portfolio", "stock", "etf", "crypto", "profit", "loss", "roi"]):
        query_type = "investment"
    elif any(kw in text_lower for kw in ["total", "balance", "net", "savings", "overview", "summary"]):
        query_type = "summary"
    
    # Parse date range
    start_date, end_date, period_desc = parse_date_reference(question, list(all_years))
    
    # Parse category/asset filters
    matched_categories = match_category(question, list(all_categories))
    matched_assets = match_asset(question, list(all_assets))
    
    # ========== FILTER TRANSACTIONS ==========
    filtered = []
    for t in parsed_transactions:
        # Filter by type if specified
        if query_type in ["expense", "income", "investment"]:
            if t["type"] != query_type:
                continue
        
        # Filter by date range
        if start_date and end_date and t["date"]:
            if not (start_date <= t["date"] <= end_date):
                continue
        
        # Filter by category
        if matched_categories:
            if t["category"] not in matched_categories:
                continue
        
        # Filter by asset
        if matched_assets:
            if t["asset"] not in matched_assets:
                continue
        
        filtered.append(t)
    
    # ========== CALCULATE RESULTS ==========
    
    # No results found
    if not filtered and (query_type or matched_categories or matched_assets):
        category_str = f" in category '{matched_categories[0]}'" if matched_categories else ""
        asset_str = f" for {matched_assets[0]}" if matched_assets else ""
        type_str = f" {query_type}" if query_type else ""
        return {
            "answer": f"There are no recorded{type_str} transactions{category_str}{asset_str} for {period_desc}.",
            "data_provided": True
        }
    
    # ========== BUILD RESPONSE BASED ON QUERY TYPE ==========
    
    if query_type == "expense":
        return await _calculate_expense_response(filtered, period_desc, matched_categories)
    
    elif query_type == "income":
        return await _calculate_income_response(filtered, period_desc, matched_categories)
    
    elif query_type == "investment":
        return await _calculate_investment_response(filtered, period_desc, matched_assets, matched_categories)
    
    elif query_type == "summary" or not query_type:
        # General summary or unrecognized query - use AI for complex interpretation
        return await _generate_ai_response(question, parsed_transactions, all_categories, all_assets, all_years)
    
    # Fallback to AI for complex queries
    return await _generate_ai_response(question, parsed_transactions, all_categories, all_assets, all_years)


async def _calculate_expense_response(transactions: List[Dict], period: str, categories: List[str]) -> Dict:
    """Calculate and format expense response"""
    total = sum(t["amount"] for t in transactions)
    count = len(transactions)
    
    if categories:
        category_str = f" on {categories[0]}"
    else:
        category_str = ""
    
    # Group by category for breakdown
    by_category = defaultdict(float)
    for t in transactions:
        by_category[t["category"]] += t["amount"]
    
    if count == 0:
        return {
            "answer": f"There are no recorded expenses{category_str} for {period}.",
            "data_provided": True
        }
    
    # Build response
    response = f"**Total spent{category_str} in {period}: ${total:,.2f}**\n"
    response += f"({count} transaction{'s' if count != 1 else ''})\n\n"
    
    if len(by_category) > 1:
        response += "**Breakdown by category:**\n"
        for cat, amt in sorted(by_category.items(), key=lambda x: x[1], reverse=True)[:10]:
            response += f"• {cat}: ${amt:,.2f}\n"
    
    return {"answer": response.strip(), "data_provided": True}


async def _calculate_income_response(transactions: List[Dict], period: str, categories: List[str]) -> Dict:
    """Calculate and format income response"""
    total = sum(t["amount"] for t in transactions)
    count = len(transactions)
    
    if categories:
        category_str = f" from {categories[0]}"
    else:
        category_str = ""
    
    # Group by category for breakdown
    by_category = defaultdict(float)
    for t in transactions:
        by_category[t["category"]] += t["amount"]
    
    if count == 0:
        return {
            "answer": f"There are no recorded income transactions{category_str} for {period}.",
            "data_provided": True
        }
    
    # Build response
    response = f"**Total income{category_str} in {period}: ${total:,.2f}**\n"
    response += f"({count} transaction{'s' if count != 1 else ''})\n\n"
    
    if len(by_category) > 1:
        response += "**Breakdown by category:**\n"
        for cat, amt in sorted(by_category.items(), key=lambda x: x[1], reverse=True)[:10]:
            response += f"• {cat}: ${amt:,.2f}\n"
    
    return {"answer": response.strip(), "data_provided": True}


async def _calculate_investment_response(transactions: List[Dict], period: str, assets: List[str], categories: List[str]) -> Dict:
    """Calculate and format investment response"""
    total_invested = sum(t["amount"] for t in transactions)
    count = len(transactions)
    
    # Group by asset
    by_asset = defaultdict(lambda: {"amount": 0, "quantity": 0})
    for t in transactions:
        asset = t["asset"] or t["category"]
        by_asset[asset]["amount"] += t["amount"]
        if t["quantity"]:
            by_asset[asset]["quantity"] += t["quantity"]
    
    # Group by category (ETFs, Stocks, Crypto, etc.)
    by_category = defaultdict(float)
    for t in transactions:
        by_category[t["category"]] += t["amount"]
    
    if count == 0:
        filter_str = ""
        if assets:
            filter_str = f" in {assets[0]}"
        elif categories:
            filter_str = f" in {categories[0]}"
        return {
            "answer": f"There are no recorded investments{filter_str} for {period}.",
            "data_provided": True
        }
    
    # Build response
    if assets:
        response = f"**Total invested in {assets[0]} ({period}): ${total_invested:,.2f}**\n"
    elif categories:
        response = f"**Total invested in {categories[0]} ({period}): ${total_invested:,.2f}**\n"
    else:
        response = f"**Total invested in {period}: ${total_invested:,.2f}**\n"
    
    response += f"({count} transaction{'s' if count != 1 else ''})\n\n"
    
    # Category breakdown
    if len(by_category) > 1:
        response += "**By asset type:**\n"
        for cat, amt in sorted(by_category.items(), key=lambda x: x[1], reverse=True):
            response += f"• {cat}: ${amt:,.2f}\n"
        response += "\n"
    
    # Asset breakdown (top 10)
    if len(by_asset) > 0:
        response += "**By asset:**\n"
        sorted_assets = sorted(by_asset.items(), key=lambda x: x[1]["amount"], reverse=True)[:10]
        for asset, data in sorted_assets:
            qty_str = f" ({data['quantity']:.4f} units)" if data['quantity'] else ""
            response += f"• {asset}: ${data['amount']:,.2f}{qty_str}\n"
    
    return {"answer": response.strip(), "data_provided": True}


async def _generate_ai_response(question: str, transactions: List[Dict], categories: set, assets: set, years: set) -> Dict:
    """Use AI for complex queries that need natural language understanding"""
    
    # Build comprehensive data summary
    today = date_module.today()
    
    # Calculate totals
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    total_investments = sum(t["amount"] for t in transactions if t["type"] == "investment")
    
    # Category breakdowns
    expense_by_cat = defaultdict(float)
    income_by_cat = defaultdict(float)
    investment_by_cat = defaultdict(float)
    investment_by_asset = defaultdict(float)
    
    # Monthly breakdowns
    expense_by_month = defaultdict(float)
    income_by_month = defaultdict(float)
    investment_by_month = defaultdict(float)
    
    for t in transactions:
        amount = t["amount"]
        category = t["category"]
        asset = t["asset"]
        date = t["date"]
        
        if date:
            month_key = f"{calendar.month_name[date.month]} {date.year}"
        else:
            month_key = "Unknown"
        
        if t["type"] == "expense":
            expense_by_cat[category] += amount
            expense_by_month[month_key] += amount
        elif t["type"] == "income":
            income_by_cat[category] += amount
            income_by_month[month_key] += amount
        elif t["type"] == "investment":
            investment_by_cat[category] += amount
            investment_by_month[month_key] += amount
            if asset:
                investment_by_asset[asset] += amount
    
    # Build data summary for AI
    data_summary = f"""
TODAY: {today.isoformat()}
DATA YEARS: {sorted(years)}
TOTAL TRANSACTIONS: {len(transactions)}

TOTALS:
• Total Income: ${total_income:,.2f}
• Total Expenses: ${total_expenses:,.2f}
• Total Investments: ${total_investments:,.2f}
• Net Savings: ${(total_income - total_expenses):,.2f}

TOP EXPENSE CATEGORIES:
{chr(10).join([f"• {cat}: ${amt:,.2f}" for cat, amt in sorted(expense_by_cat.items(), key=lambda x: x[1], reverse=True)[:10]])}

TOP INCOME SOURCES:
{chr(10).join([f"• {cat}: ${amt:,.2f}" for cat, amt in sorted(income_by_cat.items(), key=lambda x: x[1], reverse=True)[:10]])}

INVESTMENTS BY CATEGORY:
{chr(10).join([f"• {cat}: ${amt:,.2f}" for cat, amt in sorted(investment_by_cat.items(), key=lambda x: x[1], reverse=True)[:10]]) if investment_by_cat else "• No investments recorded"}

INVESTMENTS BY ASSET:
{chr(10).join([f"• {asset}: ${amt:,.2f}" for asset, amt in sorted(investment_by_asset.items(), key=lambda x: x[1], reverse=True)[:15]]) if investment_by_asset else "• No specific assets recorded"}

MONTHLY EXPENSES (Recent):
{chr(10).join([f"• {month}: ${amt:,.2f}" for month, amt in sorted(expense_by_month.items())[-6:]])}

MONTHLY INCOME (Recent):
{chr(10).join([f"• {month}: ${amt:,.2f}" for month, amt in sorted(income_by_month.items())[-6:]])}

MONTHLY INVESTMENTS (Recent):
{chr(10).join([f"• {month}: ${amt:,.2f}" for month, amt in sorted(investment_by_month.items())[-6:]]) if investment_by_month else "• No monthly investment data"}
"""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        
        if not llm_key:
            return {
                "answer": "AI assistant is not configured. Please check your API key.",
                "data_provided": False
            }
        
        system_prompt = f"""You are a financial calculator inside Vaulton, a personal finance app.

CRITICAL RULES:
1. Use ONLY the data provided below - NEVER make up numbers
2. Always calculate and show specific amounts with $ and commas
3. If data exists, compute the answer. If zero results, say "There are no transactions for that"
4. Be concise and factual - show totals, periods, and categories
5. Format currency as $X,XXX.XX

{data_summary}"""

        client = LlmChat(
            api_key=llm_key,
            session_id="vaulton_calculator",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
        
        user_msg = UserMessage(text=question)
        answer = await client.send_message(user_msg)
        
        return {
            "answer": answer,
            "data_provided": True
        }
        
    except Exception as e:
        logger.error(f"AI assistant error: {e}")
        return {
            "answer": "Error processing your question. Please try a more specific query like 'How much did I spend on food last month?'",
            "data_provided": False
        }


# ========== VOICE PARSING (unchanged) ==========

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

DEFAULT_INVESTMENT_CATEGORIES = ["Stocks", "Bonds", "Real Estate", "Crypto", "Retirement", "Other", "ETFs"]

CATEGORY_SYNONYMS = {
    "Groceries": ["grocery", "groceries", "supermarket", "food shopping", "walmart", "costco", "trader joe", "whole foods", "aldi", "kroger", "market"],
    "Restaurants / Cafes": ["restaurant", "restaurants", "cafe", "coffee", "starbucks", "mcdonalds", "eating out", "dine", "dining", "dinner out", "lunch out", "brunch", "fast food"],
    "Takeout / Delivery": ["takeout", "delivery", "doordash", "ubereats", "grubhub", "postmates", "seamless"],
    "Fuel / Gas": ["gas", "gasoline", "fuel", "petrol", "shell", "chevron", "exxon", "bp", "filling station", "gas station"],
    "Public Transport": ["uber", "lyft", "taxi", "cab", "bus", "train", "metro", "subway", "transit", "transportation", "commute", "fare"],
    "Utilities": ["electricity", "electric", "power", "water", "gas bill", "internet", "wifi", "utility", "utilities", "cable", "phone bill", "mobile"],
    "Rent / Mortgage": ["rent", "mortgage", "housing", "apartment", "lease"],
    "Salary / wages": ["salary", "paycheck", "wages", "pay", "income", "work"],
    "Overtime / bonuses": ["bonus", "overtime", "extra pay"],
    "Commissions / tips": ["commission", "tip", "tips", "gratuity"],
    "Freelance income": ["freelance", "gig", "side hustle", "contract", "consulting"],
    "Subscriptions": ["subscription", "netflix", "spotify", "hulu", "disney", "amazon prime", "youtube premium", "apple music", "streaming"],
    "Gym / Fitness / Sports": ["gym", "fitness", "workout", "exercise", "yoga", "pilates", "crossfit", "sports", "planet fitness"],
    "Clothing & Shoes": ["clothes", "clothing", "shirt", "pants", "shoes", "dress", "jacket", "apparel", "fashion", "zara", "h&m", "nike", "adidas"],
    "Doctor / Dentist Visits": ["doctor", "dentist", "medical", "hospital", "clinic", "checkup", "appointment"],
    "Prescriptions": ["prescription", "pharmacy", "medicine", "medication", "drugs", "cvs", "walgreens"],
    "Movies / Concerts / Events": ["movie", "movies", "cinema", "concert", "show", "event", "ticket", "theater", "theatre", "entertainment"],
    "Travel / Vacations": ["travel", "vacation", "trip", "hotel", "airbnb", "flight", "airline", "booking"],
    "Gifts & Celebrations": ["gift", "gifts", "present", "birthday", "christmas", "anniversary", "celebration"],
    "Pet Care": ["pet", "dog", "cat", "vet", "veterinarian", "pet food", "pet store"],
    "Donations / Charity": ["donation", "charity", "donate", "nonprofit", "giving"],
    "Other / Uncategorized": ["other", "misc", "miscellaneous"],
    "Reimbursements": ["reimbursement", "refund", "expense report"],
    "Gifts": ["gift", "present", "birthday money"],
}


@router.post("/parse-voice-transaction", response_model=VoiceTransactionResponse)
async def parse_voice_transaction(
    request: VoiceTransactionRequest,
    user_id: Optional[str] = None
):
    """Parse voice input to create a transaction"""
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
        
        # Intent detection
        income_keywords = ["earned", "income", "salary", "wages", "paycheck", "paid me", "received", "got paid", "made money", "bonus", "commission", "tip", "tips", "refund", "profit", "revenue", "freelance", "gig money"]
        expense_keywords = ["spent", "expense", "paid for", "bought", "purchased", "cost me", "charged", "paid", "payment", "bill", "subscription", "rent", "groceries", "food", "gas", "utilities", "shopping"]
        investment_keywords = ["invested", "investment", "bought stock", "bought stocks", "bought crypto", "stock purchase", "etf", "mutual fund"]
        
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
        
        if not type_confident:
            return VoiceTransactionResponse(
                success=False,
                needs_type_clarification=True,
                message="Is this money you received (income) or money you spent (expense)?",
                parsed_amount=amount,
                parsed_description=text[:100]
            )
        
        # Category matching
        matched_categories = []
        match_scores = {}
        
        for category, synonyms in CATEGORY_SYNONYMS.items():
            score = 0
            for synonym in synonyms:
                if synonym in text:
                    score += 2
                elif any(synonym in word or word in synonym for word in text.split()):
                    score += 1
            
            if score > 0:
                match_scores[category] = score
        
        if match_scores:
            sorted_matches = sorted(match_scores.items(), key=lambda x: x[1], reverse=True)
            matched_categories = [cat for cat, score in sorted_matches[:5]]
        
        # Extract description
        description = text
        for pattern in amount_patterns:
            description = re.sub(pattern, "", description)
        description = re.sub(r'\b(spent|paid|bought|earned|received|got|for|on|at|today|yesterday|dollars?|bucks?|add|an?)\b', '', description)
        description = description.strip()
        if not description or len(description) < 3:
            description = f"{transaction_type.capitalize()} via voice"
        
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
            except Exception:
                pass
        
        # Build category list
        if transaction_type == "expense":
            all_categories = {"Custom Categories": custom_cats if custom_cats else [], **DEFAULT_EXPENSE_CATEGORIES}
        elif transaction_type == "income":
            all_categories = {"Custom Categories": custom_cats if custom_cats else [], **DEFAULT_INCOME_CATEGORIES}
        else:
            all_categories = {"Custom Categories": custom_cats if custom_cats else [], "Investment Types": DEFAULT_INVESTMENT_CATEGORIES}
        
        all_categories = {k: v for k, v in all_categories.items() if v}
        
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
        logger.error(f"Error parsing voice transaction: {e}")
        return VoiceTransactionResponse(
            success=False,
            message="Could not parse transaction. Please try again."
        )


# ========== QUOTE OF THE DAY (unchanged) ==========

FAMOUS_QUOTES = {
    "investor_wisdom": [
        ("The stock market is a device for transferring money from the impatient to the patient.", "Warren Buffett"),
        ("Risk comes from not knowing what you're doing.", "Warren Buffett"),
        ("Someone's sitting in the shade today because someone planted a tree a long time ago.", "Warren Buffett"),
        ("Price is what you pay. Value is what you get.", "Warren Buffett"),
        ("The best investment you can make is in yourself.", "Warren Buffett"),
    ],
    "financial_freedom": [
        ("Wealth is the ability to fully experience life.", "Henry David Thoreau"),
        ("Financial freedom is available to those who learn about it and work for it.", "Robert Kiyosaki"),
        ("Money is a terrible master but an excellent servant.", "P.T. Barnum"),
    ],
    "discipline": [
        ("Do not save what is left after spending; instead spend what is left after saving.", "Warren Buffett"),
        ("A budget is telling your money where to go instead of wondering where it went.", "Dave Ramsey"),
        ("Beware of little expenses. A small leak will sink a great ship.", "Benjamin Franklin"),
    ],
}


@router.get("/quote-of-day")
async def get_quote_of_day():
    """Get the quote of the day"""
    today = date_module.today().isoformat()
    
    existing_quote = await db.daily_quotes.find_one({"date": today}, {"_id": 0})
    if existing_quote:
        return existing_quote
    
    # Select random quote
    category = random.choice(list(FAMOUS_QUOTES.keys()))
    quote_text, author = random.choice(FAMOUS_QUOTES[category])
    
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
