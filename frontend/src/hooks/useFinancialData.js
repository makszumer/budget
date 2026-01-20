/**
 * useFinancialData Hook
 * Combines all financial data hooks into one unified interface
 * Use this hook for the main App component to simplify data management
 */
import { useState, useEffect, useCallback } from 'react';
import { useTransactions } from './useTransactions';
import { useSummary } from './useSummary';
import { usePortfolio } from './usePortfolio';
import { useAnalytics } from './useAnalytics';
import { useCurrencies } from './useCurrencies';
import { useRecurringTransactions } from './useRecurringTransactions';
import { useBudgetEnvelopes } from './useBudgetEnvelopes';

export function useFinancialData() {
  const [loading, setLoading] = useState(true);
  const [serverAwake, setServerAwake] = useState(false);

  // Individual hooks
  const transactions = useTransactions();
  const summary = useSummary();
  const portfolio = usePortfolio();
  const analytics = useAnalytics();
  const currencies = useCurrencies();
  const recurring = useRecurringTransactions();
  const envelopes = useBudgetEnvelopes();

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        await Promise.all([
          transactions.fetchTransactions(),
          summary.fetchSummary(),
          portfolio.fetchPortfolio(),
          analytics.fetchAllAnalytics(),
          currencies.fetchCurrencies(),
          recurring.fetchRecurringTransactions(),
          envelopes.fetchBudgetEnvelopes(),
          recurring.processRecurringTransactions(),
        ]);
        setServerAwake(true);
        setLoading(false);
        break;
      } catch (error) {
        retries++;
        console.log(`Attempt ${retries} failed, retrying...`);
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          console.error("Failed to load data after retries");
          setLoading(false);
        }
      }
    }
  }, [transactions, summary, portfolio, analytics, currencies, recurring, envelopes]);

  // Refresh data after transaction changes
  const refreshAfterTransaction = useCallback(async (transactionType) => {
    await Promise.all([
      summary.fetchSummary(),
      analytics.fetchAnalytics(),
      analytics.fetchBudgetGrowth(),
    ]);
    
    if (transactionType === "investment") {
      await Promise.all([
        portfolio.fetchPortfolio(),
        analytics.fetchInvestmentGrowth(),
      ]);
    }
  }, [summary, portfolio, analytics]);

  // Refresh all data after delete/edit
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      summary.fetchSummary(),
      portfolio.fetchPortfolio(),
      analytics.fetchAllAnalytics(),
    ]);
  }, [summary, portfolio, analytics]);

  return {
    // State
    loading,
    serverAwake,
    setServerAwake,
    
    // Transaction data & methods
    transactions: transactions.transactions,
    setTransactions: transactions.setTransactions,
    addTransaction: transactions.addTransaction,
    updateTransaction: transactions.updateTransaction,
    deleteTransaction: transactions.deleteTransaction,
    
    // Summary
    summary: summary.summary,
    getFilteredSummary: summary.getFilteredSummary,
    
    // Portfolio
    portfolio: portfolio.portfolio,
    
    // Analytics
    analytics: analytics.analytics,
    budgetGrowth: analytics.budgetGrowth,
    investmentGrowth: analytics.investmentGrowth,
    
    // Currencies
    currencies: currencies.currencies,
    
    // Recurring transactions
    recurringTransactions: recurring.recurringTransactions,
    
    // Budget envelopes
    budgetEnvelopes: envelopes.budgetEnvelopes,
    
    // Methods
    loadAllData,
    refreshAfterTransaction,
    refreshAllData,
    fetchTransactions: transactions.fetchTransactions,
  };
}

export default useFinancialData;
