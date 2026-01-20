/**
 * useBudgetEnvelopes Hook
 * Handles budget envelope data fetching
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useBudgetEnvelopes() {
  const [budgetEnvelopes, setBudgetEnvelopes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBudgetEnvelopes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/budget-envelopes`);
      setBudgetEnvelopes(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching budget envelopes:", err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    budgetEnvelopes,
    loading,
    error,
    fetchBudgetEnvelopes,
  };
}

export default useBudgetEnvelopes;
