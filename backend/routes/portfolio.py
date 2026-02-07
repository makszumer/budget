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
                "MATIC": "MATIC-USD", "AVAX": "AVAX-USD", "XRP": "XRP-USD",
                "DOGE": "DOGE-USD", "USDT": "USDT-USD", "USDC": "USDC-USD",
                "TRX": "TRX-USD", "LINK": "LINK-USD", "SHIB": "SHIB-USD",
                "TON": "TON11419-USD", "BCH": "BCH-USD", "LTC": "LTC-USD",
                "NEAR": "NEAR-USD", "UNI": "UNI7083-USD", "ICP": "ICP-USD",
                "APT": "APT21794-USD", "ETC": "ETC-USD", "STX": "STX4847-USD",
                "FIL": "FIL-USD",
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
    
    # Comprehensive fallback prices (stocks, ETFs, crypto)
    fallback_prices = {
        # Top Stocks
        "AAPL": 185.50, "MSFT": 378.90, "GOOGL": 142.30, "AMZN": 155.20,
        "NVDA": 495.60, "META": 352.40, "TSLA": 242.80, "BRK.B": 362.50,
        "LLY": 582.30, "V": 258.40, "UNH": 528.70, "JPM": 172.80,
        "XOM": 104.20, "JNJ": 156.80, "WMT": 162.40, "MA": 428.60,
        "PG": 156.90, "AVGO": 862.40, "HD": 348.20, "CVX": 152.80,
        "MRK": 108.40, "COST": 578.60, "ABBV": 162.30, "KO": 59.80,
        "PEP": 172.40, "ADBE": 582.60, "CRM": 248.90, "TMO": 528.40,
        "BAC": 34.20, "NFLX": 485.30, "ACN": 328.60, "MCD": 292.80,
        "AMD": 142.60, "CSCO": 52.40, "INTC": 42.80, "DIS": 92.40,
        "NKE": 98.60, "IBM": 168.40, "BA": 218.60, "GE": 128.40,
        
        # Top ETFs
        "VOO": 428.50, "IVV": 468.20, "SPY": 472.80, "VTI": 238.60,
        "QQQ": 398.40, "VEA": 48.20, "VUG": 328.60, "GLD": 182.40,
        "IEFA": 72.80, "VTV": 148.60, "BND": 72.40, "IEMG": 52.80,
        "AGG": 98.60, "VXUS": 58.40, "IWF": 298.60, "VWO": 42.80,
        "VGT": 498.60, "IJH": 268.40, "SPYM": 52.40, "VIG": 172.80,
        "IJR": 108.60, "VO": 228.40, "XLK": 198.60, "ITOT": 108.40,
        "RSP": 162.80,
        
        # Top Crypto
        "BTC": 43250.00, "ETH": 2280.50, "USDT": 1.00, "BNB": 315.20,
        "SOL": 98.75, "XRP": 0.62, "USDC": 1.00, "ADA": 0.52,
        "DOGE": 0.082, "TRX": 0.108, "AVAX": 36.40, "LINK": 14.80,
        "SHIB": 0.0000092, "DOT": 6.85, "TON": 2.42, "MATIC": 0.89,
        "BCH": 248.60, "LTC": 72.40, "NEAR": 4.28, "UNI": 6.82,
        "ICP": 12.40, "APT": 8.62, "ETC": 24.80, "STX": 1.42,
        "FIL": 5.82,
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
