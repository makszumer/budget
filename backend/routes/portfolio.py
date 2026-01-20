"""Portfolio routes - Investment portfolio tracking"""
from fastapi import APIRouter
import yfinance as yf
import logging

from models.analytics import PortfolioSummary, PortfolioHolding

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

# Will be injected by main app
db = None

# Price cache to avoid repeated API calls
price_cache = {}


def init_router(database):
    """Initialize the router with database"""
    global db
    db = database


def get_current_price(symbol: str, category: str) -> float:
    """Fetch current price from Yahoo Finance"""
    if symbol in price_cache:
        return price_cache[symbol]
    
    try:
        # Map crypto symbols to Yahoo Finance format
        if category == "Crypto":
            symbol_map = {
                "BTC": "BTC-USD", "ETH": "ETH-USD", "SOL": "SOL-USD",
                "BNB": "BNB-USD", "ADA": "ADA-USD", "DOT": "DOT-USD",
                "MATIC": "MATIC-USD", "AVAX": "AVAX-USD",
            }
            ticker_symbol = symbol_map.get(symbol, f"{symbol}-USD")
        else:
            ticker_symbol = symbol
        
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
        
        if price:
            price_cache[symbol] = price
            return price
    except Exception as e:
        logging.warning(f"Failed to fetch price for {symbol}: {e}")
    
    # Fallback prices
    fallback_prices = {
        "AAPL": 185.50, "GOOGL": 142.30, "MSFT": 378.90, "TSLA": 242.80,
        "AMZN": 155.20, "NVDA": 495.60, "META": 352.40, "NFLX": 485.30,
        "BTC": 43250.00, "ETH": 2280.50, "SOL": 98.75, "BNB": 315.20,
        "ADA": 0.52, "DOT": 6.85, "MATIC": 0.89, "AVAX": 36.40,
    }
    return fallback_prices.get(symbol, 100.0)


@router.get("", response_model=PortfolioSummary)
async def get_portfolio():
    """Get complete portfolio summary with current values"""
    investments = await db.transactions.find(
        {"type": "investment", "asset": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    # Group by asset
    holdings_map = {}
    for inv in investments:
        asset = inv.get('asset')
        if not asset:
            continue
            
        if asset not in holdings_map:
            holdings_map[asset] = {
                'category': inv['category'],
                'total_quantity': 0,
                'total_invested': 0,
                'transactions': []
            }
        
        qty = inv.get('quantity', 0)
        holdings_map[asset]['total_quantity'] += qty
        holdings_map[asset]['total_invested'] += inv['amount']
        holdings_map[asset]['transactions'].append(inv)
    
    # Calculate portfolio
    holdings = []
    total_invested = 0
    current_value = 0
    
    for asset, data in holdings_map.items():
        total_qty = data['total_quantity']
        invested = data['total_invested']
        avg_price = invested / total_qty if total_qty > 0 else 0
        
        current_price = get_current_price(asset, data['category'])
        curr_value = total_qty * current_price
        gain_loss = curr_value - invested
        roi = (gain_loss / invested * 100) if invested > 0 else 0
        
        holdings.append(PortfolioHolding(
            asset=asset,
            category=data['category'],
            total_quantity=total_qty,
            total_invested=invested,
            average_price=avg_price,
            current_price=current_price,
            current_value=curr_value,
            gain_loss=gain_loss,
            roi_percentage=roi
        ))
        
        total_invested += invested
        current_value += curr_value
    
    total_gain_loss = current_value - total_invested
    total_roi = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
    
    return PortfolioSummary(
        holdings=holdings,
        total_invested=total_invested,
        current_value=current_value,
        total_gain_loss=total_gain_loss,
        total_roi_percentage=total_roi
    )
