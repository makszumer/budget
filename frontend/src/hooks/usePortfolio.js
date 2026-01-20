/**
 * usePortfolio Hook
 * Handles investment portfolio data fetching
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/portfolio`);
      setPortfolio(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    portfolio,
    loading,
    error,
    fetchPortfolio,
  };
}

export default usePortfolio;
