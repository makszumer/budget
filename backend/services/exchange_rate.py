"""
Exchange Rate Service
Provides currency conversion using the ExchangeRate-API (free tier)
Caches rates daily to minimize API calls
"""

import os
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

# Free API - no key required for basic usage
EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest"

# Fallback rates if API is unavailable (updated periodically)
FALLBACK_RATES = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "JPY": 149.50,
    "CHF": 0.88,
    "CAD": 1.36,
    "AUD": 1.53,
    "INR": 83.12,
    "CNY": 7.24,
    "BRL": 4.97,
    "MXN": 17.15,
    "KRW": 1320.50,
    "SGD": 1.34,
    "HKD": 7.82,
    "NOK": 10.65,
    "SEK": 10.42,
    "DKK": 6.87,
    "NZD": 1.64,
    "ZAR": 18.75,
    "RUB": 92.50,
}


class ExchangeRateService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.exchange_rates
        self._cache: Dict[str, Dict] = {}
        self._cache_timestamp: Optional[datetime] = None
    
    async def get_rates(self, base_currency: str = "USD") -> Dict[str, float]:
        """
        Get exchange rates for a base currency.
        First checks cache, then DB, then fetches from API if needed.
        """
        now = datetime.now(timezone.utc)
        cache_key = base_currency.upper()
        
        # Check in-memory cache (valid for 1 hour)
        if (self._cache.get(cache_key) and 
            self._cache_timestamp and 
            (now - self._cache_timestamp) < timedelta(hours=1)):
            return self._cache[cache_key]
        
        # Check database cache (valid for 24 hours)
        db_cache = await self.collection.find_one(
            {"base_currency": cache_key},
            {"_id": 0}
        )
        
        if db_cache:
            cache_time = db_cache.get("fetched_at")
            if isinstance(cache_time, str):
                cache_time = datetime.fromisoformat(cache_time.replace("Z", "+00:00"))
            
            if cache_time and (now - cache_time) < timedelta(hours=24):
                self._cache[cache_key] = db_cache["rates"]
                self._cache_timestamp = now
                return db_cache["rates"]
        
        # Fetch fresh rates from API
        try:
            rates = await self._fetch_rates_from_api(base_currency)
            
            # Store in database
            await self.collection.update_one(
                {"base_currency": cache_key},
                {
                    "$set": {
                        "base_currency": cache_key,
                        "rates": rates,
                        "fetched_at": now.isoformat(),
                        "source": "exchangerate-api.com"
                    }
                },
                upsert=True
            )
            
            # Update in-memory cache
            self._cache[cache_key] = rates
            self._cache_timestamp = now
            
            return rates
            
        except Exception as e:
            logger.error(f"Failed to fetch exchange rates: {e}")
            
            # Return cached DB rates if available (even if stale)
            if db_cache:
                logger.warning("Using stale cached rates")
                return db_cache["rates"]
            
            # Return fallback rates as last resort
            logger.warning("Using fallback rates")
            return self._get_fallback_rates(base_currency)
    
    async def _fetch_rates_from_api(self, base_currency: str) -> Dict[str, float]:
        """Fetch rates from the exchange rate API"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{EXCHANGE_RATE_API_URL}/{base_currency.upper()}")
            response.raise_for_status()
            data = response.json()
            return data.get("rates", {})
    
    def _get_fallback_rates(self, base_currency: str) -> Dict[str, float]:
        """Convert fallback USD rates to requested base currency"""
        if base_currency.upper() == "USD":
            return FALLBACK_RATES.copy()
        
        # Convert from USD base to requested base
        base_rate = FALLBACK_RATES.get(base_currency.upper(), 1.0)
        return {
            currency: rate / base_rate 
            for currency, rate in FALLBACK_RATES.items()
        }
    
    async def convert(
        self, 
        amount: float, 
        from_currency: str, 
        to_currency: str
    ) -> Dict:
        """
        Convert an amount from one currency to another.
        Returns conversion details including rate used.
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        if from_currency == to_currency:
            return {
                "original_amount": amount,
                "original_currency": from_currency,
                "converted_amount": amount,
                "converted_currency": to_currency,
                "exchange_rate": 1.0,
                "conversion_date": datetime.now(timezone.utc).isoformat(),
                "is_estimated": False
            }
        
        try:
            # Get rates with from_currency as base
            rates = await self.get_rates(from_currency)
            rate = rates.get(to_currency)
            
            if rate is None:
                # Try reverse conversion
                rates = await self.get_rates(to_currency)
                reverse_rate = rates.get(from_currency)
                if reverse_rate:
                    rate = 1 / reverse_rate
                else:
                    raise ValueError(f"No rate found for {from_currency} to {to_currency}")
            
            converted_amount = round(amount * rate, 2)
            
            return {
                "original_amount": amount,
                "original_currency": from_currency,
                "converted_amount": converted_amount,
                "converted_currency": to_currency,
                "exchange_rate": round(rate, 6),
                "conversion_date": datetime.now(timezone.utc).isoformat(),
                "is_estimated": False
            }
            
        except Exception as e:
            logger.error(f"Conversion error: {e}")
            
            # Use fallback rates
            fallback = self._get_fallback_rates(from_currency)
            rate = fallback.get(to_currency, 1.0)
            converted_amount = round(amount * rate, 2)
            
            return {
                "original_amount": amount,
                "original_currency": from_currency,
                "converted_amount": converted_amount,
                "converted_currency": to_currency,
                "exchange_rate": round(rate, 6),
                "conversion_date": datetime.now(timezone.utc).isoformat(),
                "is_estimated": True  # Mark as estimated since using fallback
            }
    
    async def get_rate(self, from_currency: str, to_currency: str) -> float:
        """Get the exchange rate between two currencies"""
        result = await self.convert(1.0, from_currency, to_currency)
        return result["exchange_rate"]


# Singleton instance (initialized in server.py)
exchange_service: Optional[ExchangeRateService] = None

def get_exchange_service() -> ExchangeRateService:
    if exchange_service is None:
        raise RuntimeError("Exchange service not initialized")
    return exchange_service

def init_exchange_service(db: AsyncIOMotorDatabase) -> ExchangeRateService:
    global exchange_service
    exchange_service = ExchangeRateService(db)
    return exchange_service
