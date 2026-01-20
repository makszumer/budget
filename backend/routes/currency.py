"""Currency routes - Exchange rates and currency conversion"""
from fastapi import APIRouter, HTTPException
import logging

router = APIRouter(tags=["currency"])

# Will be injected by main app
db = None
exchange_service = None

logger = logging.getLogger(__name__)

# Fallback exchange rates
EXCHANGE_RATES = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 149.50, "CHF": 0.88,
    "CAD": 1.36, "AUD": 1.52, "CNY": 7.24, "INR": 83.12, "BRL": 4.97,
    "MXN": 17.15, "KRW": 1320.50, "SGD": 1.34, "HKD": 7.82, "NOK": 10.65,
    "SEK": 10.42, "DKK": 6.87, "NZD": 1.64, "ZAR": 18.75, "RUB": 92.50,
}


def init_router(database, exchange_svc):
    """Initialize the router with database and exchange service"""
    global db, exchange_service
    db = database
    exchange_service = exchange_svc


@router.get("/currencies")
async def get_currencies():
    """Get supported currencies with current exchange rates"""
    try:
        rates = await exchange_service.get_rates("USD")
        return {
            "currencies": list(rates.keys()),
            "rates": rates,
            "source": "live",
            "base": "USD"
        }
    except Exception as e:
        logger.error(f"Failed to get live rates: {e}")
        return {
            "currencies": list(EXCHANGE_RATES.keys()),
            "rates": EXCHANGE_RATES,
            "source": "fallback",
            "base": "USD"
        }


@router.get("/exchange-rates/{base_currency}")
async def get_exchange_rates(base_currency: str):
    """Get exchange rates for a specific base currency"""
    try:
        rates = await exchange_service.get_rates(base_currency.upper())
        return {
            "base": base_currency.upper(),
            "rates": rates,
            "source": "live"
        }
    except Exception as e:
        logger.error(f"Failed to get rates for {base_currency}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch exchange rates")


@router.post("/convert-currency")
async def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str
):
    """Convert an amount between currencies"""
    try:
        result = await exchange_service.convert(amount, from_currency, to_currency)
        return result
    except Exception as e:
        logger.error(f"Conversion failed: {e}")
        raise HTTPException(status_code=500, detail="Currency conversion failed")
