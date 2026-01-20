"""AI routes - AI assistant, voice parsing, and daily quotes"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, date as date_module
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


# ========== QUOTE MODELS ==========

class DailyQuote(BaseModel):
    quote: str
    author: str = "Financial Wisdom"
    date: str
    category: str = "finance"


# Famous investor and entrepreneur quotes
FAMOUS_QUOTES = {
    "investor_wisdom": [
        ("The stock market is a device for transferring money from the impatient to the patient.", "Warren Buffett"),
        ("Risk comes from not knowing what you're doing.", "Warren Buffett"),
        ("Someone's sitting in the shade today because someone planted a tree a long time ago.", "Warren Buffett"),
        ("Price is what you pay. Value is what you get.", "Warren Buffett"),
        ("The best investment you can make is in yourself.", "Warren Buffett"),
        ("It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.", "Warren Buffett"),
        ("Spend each day trying to be a little wiser than you were when you woke up.", "Charlie Munger"),
        ("The big money is not in the buying and selling, but in the waiting.", "Charlie Munger"),
        ("Knowing what you don't know is more useful than being brilliant.", "Charlie Munger"),
        ("Know what you own, and know why you own it.", "Peter Lynch"),
        ("In the short run, the market is a voting machine. In the long run, it's a weighing machine.", "Benjamin Graham"),
        ("The four most dangerous words in investing are: 'This time it's different.'", "Sir John Templeton"),
    ],
    "financial_freedom": [
        ("Wealth is the ability to fully experience life.", "Henry David Thoreau"),
        ("Financial freedom is available to those who learn about it and work for it.", "Robert Kiyosaki"),
        ("Money is a terrible master but an excellent servant.", "P.T. Barnum"),
        ("Don't let making a living prevent you from making a life.", "John Wooden"),
        ("Time is more valuable than money. You can get more money, but you cannot get more time.", "Jim Rohn"),
        ("The goal isn't more money. The goal is living life on your own terms.", "Chris Brogan"),
        ("Retirement is not the end of the road. It is the beginning of the open highway.", "Unknown"),
        ("The secret to wealth is simple: Find a way to do more for others than anyone else.", "Tony Robbins"),
    ],
    "discipline": [
        ("Do not save what is left after spending; instead spend what is left after saving.", "Warren Buffett"),
        ("A budget is telling your money where to go instead of wondering where it went.", "Dave Ramsey"),
        ("Beware of little expenses. A small leak will sink a great ship.", "Benjamin Franklin"),
        ("It's not your salary that makes you rich, it's your spending habits.", "Charles A. Jaffe"),
        ("Every time you borrow money, you're robbing your future self.", "Nathan W. Morris"),
        ("Compound interest is the eighth wonder of the world. He who understands it, earns it.", "Albert Einstein"),
        ("The habit of saving is itself an education.", "George S. Clason"),
        ("Rich people stay rich by living like they're broke. Broke people stay broke by living like they're rich.", "Unknown"),
    ],
    "motivation": [
        ("Formal education will make you a living; self-education will make you a fortune.", "Jim Rohn"),
        ("The only way to do great work is to love what you do.", "Steve Jobs"),
        ("Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill"),
        ("The question isn't who is going to let me; it's who is going to stop me.", "Ayn Rand"),
        ("Seek wealth, not money or status. Wealth is having assets that earn while you sleep.", "Naval Ravikant"),
        ("Play long-term games with long-term people.", "Naval Ravikant"),
        ("Learn to sell. Learn to build. If you can do both, you will be unstoppable.", "Naval Ravikant"),
        ("Specific knowledge is knowledge that you cannot be trained for.", "Naval Ravikant"),
    ],
    "mindset": [
        ("An investment in knowledge pays the best interest.", "Benjamin Franklin"),
        ("Empty pockets never held anyone back. Only empty heads and empty hearts can do that.", "Norman Vincent Peale"),
        ("Wealth is not about having a lot of money; it's about having a lot of options.", "Chris Rock"),
        ("Money grows on the tree of persistence.", "Japanese Proverb"),
        ("The more you learn, the more you earn.", "Warren Buffett"),
        ("Never depend on a single income. Make investment to create a second source.", "Warren Buffett"),
        ("If you don't find a way to make money while you sleep, you will work until you die.", "Warren Buffett"),
        ("Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.", "Dave Ramsey"),
    ],
}


# ========== CATEGORY SYNONYMS FOR VOICE PARSING ==========

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

DEFAULT_INVESTMENT_CATEGORIES = ["Stocks", "Bonds", "Real Estate", "Crypto", "Retirement", "Other"]

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


# ========== VOICE PARSING ENDPOINT ==========

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
        income_keywords = [
            "earned", "income", "salary", "wages", "paycheck", 
            "paid me", "received", "got paid", "made money",
            "bonus", "commission", "tip", "tips", "refund",
            "profit", "revenue", "freelance", "gig money"
        ]
        
        expense_keywords = [
            "spent", "expense", "paid for", "bought", "purchased",
            "cost me", "charged", "paid", "payment", "bill",
            "subscription", "rent", "groceries", "food", "gas",
            "utilities", "shopping"
        ]
        
        investment_keywords = [
            "invested", "investment", "bought stock", "bought stocks",
            "bought crypto", "stock purchase", "etf", "mutual fund"
        ]
        
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
            all_categories = {
                "Custom Categories": custom_cats if custom_cats else [],
                **DEFAULT_EXPENSE_CATEGORIES
            }
        elif transaction_type == "income":
            all_categories = {
                "Custom Categories": custom_cats if custom_cats else [],
                **DEFAULT_INCOME_CATEGORIES
            }
        else:
            all_categories = {
                "Custom Categories": custom_cats if custom_cats else [],
                "Investment Types": DEFAULT_INVESTMENT_CATEGORIES
            }
        
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


# ========== AI ASSISTANT ENDPOINT ==========

@router.post("/ai-assistant")
async def ai_assistant(request: dict):
    """Natural language query about finances using AI"""
    question = request.get("question", "")
    
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    
    today = date_module.today()
    current_month = today.month
    current_year = today.year
    
    all_transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    standing_orders = await db.recurring_transactions.find({"active": True}, {"_id": 0}).to_list(1000)
    
    def parse_date(date_str):
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.split('T')[0]).date()
        except:
            return None
    
    # Build data summary
    all_data = {
        "total_income": 0,
        "total_expenses": 0,
        "income_by_category": defaultdict(float),
        "expense_by_category": defaultdict(float),
        "income_by_month": defaultdict(float),
        "expense_by_month": defaultdict(float),
        "income_categories": set(),
        "expense_categories": set(),
        "date_range": {"earliest": None, "latest": None}
    }
    
    for t in all_transactions:
        amount = t.get("amount", 0)
        trans_type = t.get("type", "")
        category = t.get("category", "Other")
        date = parse_date(t.get("date"))
        
        if not date:
            continue
        
        if all_data["date_range"]["earliest"] is None or date < all_data["date_range"]["earliest"]:
            all_data["date_range"]["earliest"] = date
        if all_data["date_range"]["latest"] is None or date > all_data["date_range"]["latest"]:
            all_data["date_range"]["latest"] = date
        
        month_name = f"{calendar.month_name[date.month]} {date.year}"
        
        if trans_type == "income":
            all_data["total_income"] += amount
            all_data["income_by_category"][category] += amount
            all_data["income_by_month"][month_name] += amount
            all_data["income_categories"].add(category)
        elif trans_type == "expense":
            all_data["total_expenses"] += amount
            all_data["expense_by_category"][category] += amount
            all_data["expense_by_month"][month_name] += amount
            all_data["expense_categories"].add(category)
    
    # Build summary for AI
    data_summary = f"""
TODAY: {today.isoformat()}
DATA RANGE: {all_data["date_range"]["earliest"]} to {all_data["date_range"]["latest"]}
TOTAL TRANSACTIONS: {len(all_transactions)}

TOTALS:
- Total Income: ${all_data["total_income"]:.2f}
- Total Expenses: ${all_data["total_expenses"]:.2f}
- Net Balance: ${(all_data["total_income"] - all_data["total_expenses"]):.2f}

INCOME BY CATEGORY:
{chr(10).join([f"  • {cat}: ${amt:.2f}" for cat, amt in sorted(all_data["income_by_category"].items())])}

EXPENSE BY CATEGORY:
{chr(10).join([f"  • {cat}: ${amt:.2f}" for cat, amt in sorted(all_data["expense_by_category"].items())])}

STANDING ORDERS ({len(standing_orders)} active):
{chr(10).join([f"  • {so.get('description')}: ${so.get('amount'):.2f} ({so.get('frequency')})" for so in standing_orders[:10]])}
"""

    # Use AI to answer
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        
        if not llm_key:
            return {
                "answer": "AI assistant is not configured. Please check your API key.",
                "data_provided": False
            }
        
        client = LlmChat(
            api_key=llm_key,
            session_id="financial_assistant",
            system_message=f"""You are a helpful financial assistant. Use ONLY the data provided below.
Never make up numbers. If you can't answer from the data, say so.

{data_summary}"""
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
            "answer": f"Error processing your question. Please try again.",
            "data_provided": False
        }


# ========== QUOTE OF THE DAY ENDPOINT ==========

@router.get("/quote-of-day")
async def get_quote_of_day():
    """Get the quote of the day"""
    today = date_module.today().isoformat()
    
    # Check if we already have a quote for today
    existing_quote = await db.daily_quotes.find_one({"date": today}, {"_id": 0})
    
    if existing_quote:
        return existing_quote
    
    # Get recent quotes to avoid repetition
    recent_quotes = await db.daily_quotes.find(
        {}, 
        {"_id": 0, "quote": 1}
    ).sort("date", -1).limit(30).to_list(30)
    
    recent_quote_texts = set(q.get("quote", "")[:50] for q in recent_quotes)
    
    # 50% chance to use a famous quote, 50% to generate with AI
    use_famous_quote = random.random() < 0.5
    
    if use_famous_quote:
        category = random.choice(list(FAMOUS_QUOTES.keys()))
        quotes_list = FAMOUS_QUOTES[category]
        
        available_quotes = [q for q in quotes_list if q[0][:50] not in recent_quote_texts]
        
        if not available_quotes:
            all_quotes = [(q, cat) for cat, quotes in FAMOUS_QUOTES.items() for q in quotes]
            available_quotes = [q for q, cat in all_quotes if q[0][:50] not in recent_quote_texts]
            
            if available_quotes:
                quote_tuple = random.choice(available_quotes)
            else:
                quote_tuple = random.choice(quotes_list)
        else:
            quote_tuple = random.choice(available_quotes)
        
        quote_text, author = quote_tuple
        
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
    
    # Try to generate with AI
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        
        if not llm_key:
            return await _get_fallback_quote(today)
        
        themes = [
            "long-term investing and patience",
            "financial discipline and saving habits",
            "wealth building and compound growth",
            "financial freedom and independence",
            "smart money management",
            "overcoming financial obstacles",
        ]
        theme = random.choice(themes)
        
        avoid_text = "\n".join(list(recent_quote_texts)[:10]) if recent_quote_texts else ""
        
        client = LlmChat(
            api_key=llm_key,
            session_id="daily_quote_generator",
            system_message="You are a wise financial mentor who creates inspiring, practical quotes about money and wealth."
        ).with_model("openai", "gpt-4o-mini")
        
        prompt = f"""Generate ONE unique, inspiring quote about {theme}.
Keep it SHORT: 1-2 sentences maximum.
Do NOT include quotation marks or attribution.
{"AVOID similar themes to: " + avoid_text if avoid_text else ""}
Respond with ONLY the quote text."""

        user_msg = UserMessage(text=prompt)
        quote_text = await client.send_message(user_msg)
        quote_text = quote_text.strip().strip('"').strip("'")
        
        categories = ["investor_wisdom", "financial_freedom", "discipline", "motivation", "mindset"]
        category = random.choice(categories)
        
        new_quote = {
            "quote": quote_text,
            "author": "Daily Financial Wisdom",
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
        
    except Exception as e:
        logger.error(f"Error generating quote: {e}")
        return await _get_fallback_quote(today)


async def _get_fallback_quote(today: str):
    """Return a fallback quote if AI generation fails"""
    all_quotes = []
    for category, quotes in FAMOUS_QUOTES.items():
        for quote, author in quotes:
            all_quotes.append((quote, author, category))
    
    last_quote = await db.daily_quotes.find_one({}, {"_id": 0}, sort=[("date", -1)])
    
    if last_quote:
        return last_quote
    
    quote_text, author, category = random.choice(all_quotes)
    
    return {
        "quote": quote_text,
        "author": author,
        "date": today,
        "category": category
    }
