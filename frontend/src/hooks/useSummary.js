/**
 * useSummary Hook
 * Handles transaction summary data fetching
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useSummary() {
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/transactions/summary`);
      setSummary(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching summary:", err);
      setError(err);
      return summary;
    } finally {
      setLoading(false);
    }
  }, [summary]);

  // Calculate filtered summary from transactions
  const getFilteredSummary = useCallback((transactions, dateFilter, selectedDate) => {
    const filtered = filterTransactionsByDate(transactions, dateFilter, selectedDate);
    const totalIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalInvestments = filtered.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalIncome,
      totalExpenses,
      totalInvestments,
      balance: totalIncome - totalExpenses
    };
  }, []);

  return {
    summary,
    loading,
    error,
    fetchSummary,
    getFilteredSummary,
  };
}

// Helper function to filter transactions by date
function filterTransactionsByDate(transactions, dateFilter, selectedDate) {
  if (dateFilter === "all") return transactions;

  const now = selectedDate;
  return transactions.filter(t => {
    const transDate = new Date(t.date);
    
    if (dateFilter === "day") {
      return transDate.toDateString() === now.toDateString();
    } else if (dateFilter === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return transDate >= weekStart && transDate < weekEnd;
    } else if (dateFilter === "month") {
      return transDate.getMonth() === now.getMonth() && 
             transDate.getFullYear() === now.getFullYear();
    } else if (dateFilter === "year") {
      return transDate.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

export default useSummary;
