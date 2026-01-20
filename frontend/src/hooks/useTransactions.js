/**
 * useTransactions Hook
 * Handles all transaction-related data fetching and mutations
 */
import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(err);
      toast.error("Failed to load transactions");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = useCallback(async (transaction) => {
    try {
      const response = await axios.post(`${API}/transactions`, transaction);
      setTransactions(prev => [response.data, ...prev]);
      toast.success("Transaction added successfully");
      return response.data;
    } catch (err) {
      console.error("Error adding transaction:", err);
      toast.error("Failed to add transaction");
      throw err;
    }
  }, []);

  const updateTransaction = useCallback(async (updatedTransaction) => {
    try {
      const response = await axios.put(
        `${API}/transactions/${updatedTransaction.id}`,
        {
          type: updatedTransaction.type,
          amount: updatedTransaction.amount,
          description: updatedTransaction.description,
          category: updatedTransaction.category,
          date: updatedTransaction.date,
          asset: updatedTransaction.asset,
          quantity: updatedTransaction.quantity,
          purchase_price: updatedTransaction.purchase_price
        }
      );
      
      setTransactions(prev =>
        prev.map(t => t.id === updatedTransaction.id ? response.data : t)
      );
      
      toast.success("Transaction updated successfully");
      return response.data;
    } catch (err) {
      console.error("Error updating transaction:", err);
      toast.error("Failed to update transaction");
      throw err;
    }
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success("Transaction deleted successfully");
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error("Failed to delete transaction");
      throw err;
    }
  }, []);

  return {
    transactions,
    setTransactions,
    loading,
    error,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

export default useTransactions;
