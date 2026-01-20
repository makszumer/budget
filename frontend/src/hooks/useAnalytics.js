/**
 * useAnalytics Hook
 * Handles analytics data fetching including budget and investment growth
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useAnalytics() {
  const [analytics, setAnalytics] = useState({
    expense_breakdown: [],
    income_breakdown: [],
    investment_breakdown: [],
  });
  const [budgetGrowth, setBudgetGrowth] = useState(null);
  const [investmentGrowth, setInvestmentGrowth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err);
      return analytics;
    } finally {
      setLoading(false);
    }
  }, [analytics]);

  const fetchBudgetGrowth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/analytics/budget-growth`);
      setBudgetGrowth(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching budget growth:", err);
      return null;
    }
  }, []);

  const fetchInvestmentGrowth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/analytics/investment-growth`);
      setInvestmentGrowth(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching investment growth:", err);
      return null;
    }
  }, []);

  const fetchAllAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAnalytics(),
        fetchBudgetGrowth(),
        fetchInvestmentGrowth(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics, fetchBudgetGrowth, fetchInvestmentGrowth]);

  return {
    analytics,
    budgetGrowth,
    investmentGrowth,
    loading,
    error,
    fetchAnalytics,
    fetchBudgetGrowth,
    fetchInvestmentGrowth,
    fetchAllAnalytics,
  };
}

export default useAnalytics;
