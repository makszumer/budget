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
from openai import AsyncOpenAI

router = APIRouter(tags=["ai"])

db = None
logger = logging.getLogger(__name__)


def init_router(database):
    global db
    db = database


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


def get_quarter_dates(quarter: int, year: int):
    quarter_months = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}
    start_month, end_month = quarter_months[quarter]
    start_date = date_module(year, start_month, 1)
    last_day = calendar.monthrange(year, end_month)[1]
    end_date = date_module(year, end_month, last_day)
    return start_date, end_date


def parse_date_reference(text: str, data_years: List[int]) -> tuple:
    text_lower = text.lower()
    today = date_module.today()
    current_year = today.year
    current_month = today.month
    most_recent_year = max(data_years) if data_years else current_year

    if "today" in text_lower:
        return today, today, "today"
    if "this week" in text_lower:
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6), "this week"
    if "last week" in text_lower:
        start = today - timedelta(days=today.weekday() + 7)
        return start, start + timedelta(days=6), "last week"
    if "this month" in text_lower:
        start = date_module(current_year, current_month, 1)
        last_day = calendar.monthrange(current_year, current_month)[1]
        return start, date_module(current_year, current_month, last_day), f"{calendar.month_name[current_month]} {current_year}"
    if "last month" in text_lower:
        month = 12 if current_month == 1 else current_month - 1
        year = current_year - 1 if current_month == 1 else current_year
        start = date_module(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        return start, date_module(year, month, last_day), f"{calendar.month_name[month]} {year}"
    if "this year" in text_lower:
        return date_module(current_year, 1, 1), date_module(current_year, 12, 31), f"{current_year}"
    if "last year" in text_lower:
        year = current_year - 1
        return date_module(year, 1, 1), date_module(year, 12, 31), f"{year}"

    last_n_days = re.search(r"last\s+(\d+)\s+days?", text_lower)
    if last_n_days:
        n = int(last_n_days.group(1))
        return today - timedelta(days=n), today, f"last {n} days"

    last_n_weeks = re.search(r"last\s+(\d+)\s+weeks?", text_lower)
    if last_n_weeks:
        n = int(last_n_weeks.group(1))
        return today - timedelta(weeks=n), today, f"last {n} weeks"

    last_n_months = re.search(r"last\s+(\d+)\s+months?", text_lower)
    if last_n_months:
        n = int(last_n_months.group(1))
        month = current_month - n
        year = current_year
        while month <= 0:
            month += 12
            year -= 1
        return date_module(year, month, 1), today, f"last {n} months"

    quarter_match = re.search(r"q([1-4])\s*(\d{4})?", text_lower)
    if quarter_match:
        q = int(quarter_match.group(1))
        year = int(quarter_match.group(2)) if quarter_match.group(2) else most_recent_year
        start, end = get_quarter_dates(q, year)
        return start, end, f"Q{q} {year}"

    month_names = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4,
        "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
    }
    for month_name, month_num in month_names.items():
        if month_name in text_lower:
            year_match = re.search(r"(\d{4})", text_lower)
            if year_match:
                year = int(year_match.group(1))
                start = date_module(year, month_num, 1)
                last_day = calendar.monthrange(year, month_num)[1]
                return start, date_module(year, month_num, last_day), f"{calendar.month_name[month_num]} {year}"
            else:
                return ("month_only", month_num, f"{calendar.month_name[month_num]} (all years)")

    return None, None, "all time"


def parse_transaction_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.split('T')[0]).date()
    except ValueError:
        return None


def match_category(text: str, categories: List[str]) -> List[str]:
    text_lower = text.lower()
    matched = []
    for cat in categories:
        if cat.lower() in text_lower:
            matched.append(cat)
    if matched:
        return matched

    synonym_groups = {
        "food": ["Groceries", "Restaurants / Cafes", "Takeout / Delivery", "Work Lunches / Snacks"],
        "dining": ["Restaurants / Cafes", "Takeout / Delivery"],
        "tips": ["Commissions / tips", "tips"],
        "investments": ["Stocks", "ETFs", "Crypto", "Bonds", "Real Estate", "Retirement"],
        "transport": ["Public Transport", "Fuel / Gas", "Car Payment / Lease", "Parking & Tolls"],
        "housing": ["Rent / Mortgage", "Home Maintenance / Repairs", "Property Tax"],
        "medical": ["Health Insurance", "Doctor / Dentist Visits", "Prescriptions"],
    }
    for keyword, group_categories in synonym_groups.items():
        if keyword in text_lower:
            for target in group_categories:
                for cat in categories:
                    if target.lower() in cat.lower() or cat.lower() in target.lower():
                        if cat not in matched:
                            matched.append(cat)
    if matched:
        return matched

    specific_keywords = {
        "groceries": ["Groceries"], "grocery": ["Groceries"],
        "restaurant": ["Restaurants / Cafes"], "salary": ["Salary / wages"],
        "rent": ["Rent / Mortgage"], "bonus": ["Overtime / bonuses"],
        "travel": ["Travel / Vacations"], "gym": ["Gym / Fitness / Sports"],
        "netflix": ["Subscriptions"], "spotify": ["Subscriptions"],
    }
    for keyword, target_categories in specific_keywords.items():
        if keyword in text_lower:
            for target in target_categories:
                for cat in categories:
                    if target.lower() in cat.lower() or cat.lower() in target.lower():
                        if cat not in matched:
                            matched.append(cat)
    return matched


def match_asset(text: str, assets: List[str]) -> List[str]:
    text_lower = text.lower()
    matched = [asset for asset in assets if asset.lower() in text_lower]
    crypto_synonyms = {
        "bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL",
        "cardano": "ADA", "dogecoin": "DOGE", "ripple": "XRP",
    }
    for synonym, symbol in crypto_synonyms.items():
        if synonym in text_lower:
            for asset in assets:
                if asset.upper() == symbol and asset not in matched:
                    matched.append(asset)
    return matched


@router.post("/ai-assistant")
async def ai_assistant(request: dict):
    question = request.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    all_transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    if not all_transactions:
        return {"answer": "There are no transactions recorded yet. Start by adding some income, expenses, or investments!", "data_provided": True}

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

    text_lower = question.lower()
    query_type = None
    if any(kw in text_lower for kw in ["summary", "overview", "balance", "net worth", "financial health", "total", "savings"]):
        query_type = "summary"
    elif any(kw in text_lower for kw in ["spend", "spent", "expense", "cost", "paid", "bought"]):
        query_type = "expense"
    elif any(kw in text_lower for kw in ["earn", "earned", "income", "received", "salary", "tips", "made money"]):
        query_type = "income"
    elif any(kw in text_lower for kw in ["invest", "invested", "investment", "portfolio", "stock", "etf", "crypto", "profit", "loss", "roi"]):
        query_type = "investment"

    start_date, end_date, period_desc = parse_date_reference(question, list(all_years))
    matched_categories = match_category(question, list(all_categories))
    matched_assets = match_asset(question, list(all_assets))

    if query_type == "summary":
        return await _generate_ai_response(question, parsed_transactions, all_categories, all_assets, all_years)

    filtered = []
    month_only_filter = None
    if isinstance(start_date, str) and start_date == "month_only":
        month_only_filter = end_date
        start_date = None
        end_date = None

    for t in parsed_transactions:
        if query_type in ["expense", "income", "investment"]:
            if t["type"] != query_type:
                continue
        if month_only_filter and t["date"]:
            if t["date"].month != month_only_filter:
                continue
        elif start_date and end_date and t["date"]:
            if not (start_date <= t["date"] <= end_date):
                continue
        if matched_categories and t["category"] not in matched_categories:
            continue
        if matched_assets and t["asset"] not in matched_assets:
            continue
        filtered.append(t)

    if not filtered and (query_type or matched_categories or matched_assets):
        return {"answer": f"There are no recorded {query_type or ''} transactions for {period_desc}.", "data_provided": True}

    if query_type == "expense":
        return await _calculate_expense_response(filtered, period_desc, matched_categories)
    elif query_type == "income":
        return await _calculate_income_response(filtered, period_desc, matched_categories)
    elif query_type == "investment":
        return await _calculate_investment_response(filtered, period_desc, matched_assets, matched_categories)

    return await _generate_ai_response(question, parsed_transactions, all_categories, all_assets, all_years)


async def _calculate_expense_response(transactions, period, categories):
    total = sum(t["amount"] for t in transactions)
    count = len(transactions)
    category_str = f" on {categories[0]}" if categories else ""
    by_category = defaultdict(float)
    for t in transactions:
        by_category[t["category"]] += t["amount"]
    if count == 0:
        return {"answer": f"There are no recorded expenses{category_str} for {period}.", "data_provided": True}
    response = f"**Total spent{category_str} in {period}: ${total:,.2f}**\n({count} transaction{'s' if count != 1 else ''})\n\n"
    if len(by_category) > 1:
        response += "**Breakdown by category:**\n"
        for cat, amt in sorted(by_category.items(), key=lambda x: x[1], reverse=True)[:10]:
            response += f"• {cat}: ${amt:,.2f}\n"
    return {"answer": response.strip(), "data_provided": True}


async def _calculate_income_response(transactions, period, categories):
    total = sum(t["amount"] for t in transactions)
    count = len(transactions)
    category_str = f" from {categories[0]}" if categories else ""
    by_category = defaultdict(float)
    for t in transactions:
        by_category[t["category"]] += t["amount"]
    if count == 0:
        return {"answer": f"There are no recorded income transactions{category_str} for {period}.", "data_provided": True}
    response = f"**Total income{category_str} in {period}: ${total:,.2f}**\n({count} transaction{'s' if count != 1 else ''})\n\n"
    if len(by_category) > 1:
        response += "**Breakdown by category:**\n"
        for cat, amt in sorted(by_category.items(), key=lambda x: x[1], reverse=True)[:10]:
            response += f"• {cat}: ${amt:,.2f}\n"
    return {"answer": response.strip(), "data_provided": True}


async def _calculate_investment_response(transactions, period, assets, categories):
    total_invested = sum(t["amount"] for t in transactions)
    count = len(transactions)
    by_asset = defaultdict(lambda: {"invested": 0, "quantity": 0})
    by_category = defaultdict(float)
    for t in transactions:
        asset = t["asset"] or t["category"]
        by_asset[asset]["invested"] += t["amount"]
        if t["quantity"]:
            by_asset[asset]["quantity"] += t["quantity"]
        by_category[t["category"]] += t["amount"]

    if count == 0:
        return {"answer": f"There are no recorded investments for {period}.", "data_provided": True}

    if assets:
        response = f"**Investment in {assets[0]} ({period})**\n"
    elif categories:
        response = f"**Investment in {categories[0]} ({period})**\n"
    else:
        response = f"**Investment Summary ({period})**\n"

    response += f"Total invested: **${total_invested:,.2f}**\n({count} transaction{'s' if count != 1 else ''})\n\n"
    response += "**Holdings by Asset:**\n"
    for asset, data in sorted(by_asset.items(), key=lambda x: x[1]["invested"], reverse=True)[:10]:
        qty_str = f" ({data['quantity']:.4f} units)" if data['quantity'] else ""
        response += f"• {asset}: ${data['invested']:,.2f}{qty_str}\n"

    if len(by_category) > 1:
        response += "\n**By Asset Type:**\n"
        for cat, amt in sorted(by_category.items(), key=lambda x: x[1], reverse=True):
            response += f"• {cat}: ${amt:,.2f}\n"

    return {"answer": response.strip(), "data_provided": True}


async def _generate_ai_response(question, transactions, categories, assets, years):
    today = date_module.today()
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    total_investments = sum(t["amount"] for t in transactions if t["type"] == "investment")

    expense_by_cat = defaultdict(float)
    income_by_cat = defaultdict(float)
    for t in transactions:
        if t["type"] == "expense":
            expense_by_cat[t["category"]] += t["amount"]
        elif t["type"] == "income":
            income_by_cat[t["category"]] += t["amount"]

    data_summary = f"""
TODAY: {today.isoformat()}
TOTAL TRANSACTIONS: {len(transactions)}
Total Income: ${total_income:,.2f}
Total Expenses: ${total_expenses:,.2f}
Total Investments: ${total_investments:,.2f}
Net Savings: ${(total_income - total_expenses):,.2f}

TOP EXPENSE CATEGORIES:
{chr(10).join([f"• {cat}: ${amt:,.2f}" for cat, amt in sorted(expense_by_cat.items(), key=lambda x: x[1], reverse=True)[:10]])}

TOP INCOME SOURCES:
{chr(10).join([f"• {cat}: ${amt:,.2f}" for cat, amt in sorted(income_by_cat.items(), key=lambda x: x[1], reverse=True)[:10]])}
"""

    try:
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            return {"answer": "AI assistant requires an OpenAI API key. Please configure OPENAI_API_KEY in your environment.", "data_provided": False}

        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are a financial assistant. Use ONLY this data to answer:\n{data_summary}"},
                {"role": "user", "content": question}
            ],
            max_tokens=500
        )
        return {"answer": response.choices[0].message.content, "data_provided": True}

    except Exception as e:
        logger.error(f"AI assistant error: {e}")
        return {"answer": "Error processing your question. Please try a more specific query like 'How much did I spend on food last month?'", "data_provided": False}


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
    "Groceries": ["grocery", "groceries", "supermarket", "food shopping", "walmart", "costco", "whole foods"],
    "Restaurants / Cafes": ["restaurant", "cafe", "coffee", "starbucks", "eating out", "dining"],
    "Takeout / Delivery": ["takeout", "delivery", "doordash", "ubereats", "grubhub"],
    "Fuel / Gas": ["gas", "gasoline", "fuel", "petrol", "filling station"],
    "Public Transport": ["uber", "lyft", "taxi", "bus", "train", "metro", "subway", "transit"],
    "Utilities": ["electricity", "water", "internet", "wifi", "utility", "utilities", "phone bill"],
    "Rent / Mortgage": ["rent", "mortgage", "housing", "apartment", "lease"],
    "Salary / wages": ["salary", "paycheck", "wages", "pay"],
    "Overtime / bonuses": ["bonus", "overtime"],
    "Commissions / tips": ["commission", "tip", "tips", "gratuity"],
    "Freelance income": ["freelance", "gig", "side hustle", "contract"],
    "Subscriptions": ["subscription", "netflix", "spotify", "hulu", "streaming"],
    "Gym / Fitness / Sports": ["gym", "fitness", "workout", "yoga", "sports"],
    "Travel / Vacations": ["travel", "vacation", "trip", "hotel", "flight"],
}


@router.post("/parse-voice-transaction", response_model=VoiceTransactionResponse)
async def parse_voice_transaction(request: VoiceTransactionRequest, user_id: Optional[str] = None):
    text = request.text.lower()
    try:
        amount_patterns = [r'\$?(\d+(?:\.\d{2})?)', r'(\d+)\s*dollars?', r'(\d+)\s*bucks?', r'€(\d+(?:\.\d{2})?)']
        amount = None
        for pattern in amount_patterns:
            match = re.search(pattern, text)
            if match:
                amount = float(match.group(1))
                break

        if not amount:
            return VoiceTransactionResponse(success=False, message="Could not detect amount. Please say the dollar amount clearly (e.g., '50 dollars' or '$50').")

        income_keywords = ["earned", "income", "salary", "wages", "received", "got paid", "bonus", "commission", "tip", "tips"]
        expense_keywords = ["spent", "paid for", "bought", "purchased", "cost", "bill", "rent", "groceries"]
        investment_keywords = ["invested", "bought stock", "bought crypto", "etf"]

        income_score = sum(1 for kw in income_keywords if kw in text)
        expense_score = sum(1 for kw in expense_keywords if kw in text)
        investment_score = sum(1 for kw in investment_keywords if kw in text)

        transaction_type = None
        type_confident = False

        if investment_score > 0:
            transaction_type = "investment"
            type_confident = True
        elif income_score > expense_score:
            transaction_type = "income"
            type_confident = income_score >= 1
        elif expense_score > income_score:
            transaction_type = "expense"
            type_confident = expense_score >= 1

        if not type_confident:
            return VoiceTransactionResponse(success=False, needs_type_clarification=True, message="Is this money you received (income) or money you spent (expense)?", parsed_amount=amount, parsed_description=text[:100])

        match_scores = {}
        for category, synonyms in CATEGORY_SYNONYMS.items():
            score = sum(2 for s in synonyms if s in text)
            if score > 0:
                match_scores[category] = score

        matched_categories = [cat for cat, _ in sorted(match_scores.items(), key=lambda x: x[1], reverse=True)[:5]]

        description = re.sub(r'\$?(\d+(?:\.\d{2})?)', '', text)
        description = re.sub(r'\b(spent|paid|bought|earned|received|for|on|at|today|dollars?)\b', '', description).strip()
        if not description or len(description) < 3:
            description = f"{transaction_type.capitalize()} via voice"

        custom_cats = []
        user_id_to_use = request.user_id or user_id
        if user_id_to_use:
            try:
                cat_type = "expense" if transaction_type == "expense" else "income"
                user_cats = await db.custom_categories.find({"user_id": user_id_to_use, "type": cat_type}, {"_id": 0, "name": 1}).to_list(50)
                custom_cats = [c["name"] for c in user_cats]
            except Exception:
                pass

        if transaction_type == "expense":
            all_categories = {"Custom Categories": custom_cats, **DEFAULT_EXPENSE_CATEGORIES}
        elif transaction_type == "income":
            all_categories = {"Custom Categories": custom_cats, **DEFAULT_INCOME_CATEGORIES}
        else:
            all_categories = {"Custom Categories": custom_cats, "Investment Types": DEFAULT_INVESTMENT_CATEGORIES}

        all_categories = {k: v for k, v in all_categories.items() if v}

        return VoiceTransactionResponse(success=False, needs_clarification=True, message=f"Which category should this {transaction_type} be added to?", all_categories=all_categories, matched_categories=matched_categories or None, parsed_amount=amount, parsed_type=transaction_type, parsed_description=description[:100])

    except Exception as e:
        logger.error(f"Error parsing voice transaction: {e}")
        return VoiceTransactionResponse(success=False, message="Could not parse transaction. Please try again.")


FAMOUS_QUOTES = {
    "investor_wisdom": [
        ("The stock market is a device for transferring money from the impatient to the patient.", "Warren Buffett"),
        ("Risk comes from not knowing what you're doing.", "Warren Buffett"),
        ("Price is what you pay. Value is what you get.", "Warren Buffett"),
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
    today = date_module.today().isoformat()
    existing_quote = await db.daily_quotes.find_one({"date": today}, {"_id": 0})
    if existing_quote:
        return existing_quote
    category = random.choice(list(FAMOUS_QUOTES.keys()))
    quote_text, author = random.choice(FAMOUS_QUOTES[category])
    new_quote = {"quote": quote_text, "author": author, "date": today, "category": category, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.daily_quotes.insert_one(new_quote)
    return {"quote": new_quote["quote"], "author": new_quote["author"], "date": new_quote["date"], "category": new_quote["category"]}
