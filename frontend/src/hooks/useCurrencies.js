/**
 * useCurrencies Hook
 * Handles currency data fetching
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useCurrencies() {
  const [currencies, setCurrencies] = useState(["USD"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/currencies`);
      setCurrencies(response.data.currencies);
      return response.data.currencies;
    } catch (err) {
      console.error("Error fetching currencies:", err);
      setError(err);
      return currencies;
    } finally {
      setLoading(false);
    }
  }, [currencies]);

  return {
    currencies,
    loading,
    error,
    fetchCurrencies,
  };
}

export default useCurrencies;
