/**
 * useRecurringTransactions Hook
 * Handles recurring transactions (standing orders) data
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useRecurringTransactions() {
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecurringTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/recurring-transactions`);
      setRecurringTransactions(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching recurring transactions:", err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const processRecurringTransactions = useCallback(async () => {
    try {
      await axios.post(`${API}/recurring-transactions/process`);
    } catch (err) {
      console.error("Error processing recurring transactions:", err);
    }
  }, []);

  return {
    recurringTransactions,
    loading,
    error,
    fetchRecurringTransactions,
    processRecurringTransactions,
  };
}

export default useRecurringTransactions;
