import { useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import { TransactionForm } from "@/components/TransactionForm";
import { InvestmentForm } from "@/components/InvestmentForm";
import { TransactionList } from "@/components/TransactionList";
import { PortfolioTracker } from "@/components/PortfolioTracker";
import { Dashboard } from "@/components/Dashboard";
import { Charts } from "@/components/Charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    balance: 0,
  });
  const [portfolio, setPortfolio] = useState(null);
  const [analytics, setAnalytics] = useState({
    expense_breakdown: [],
    income_breakdown: [],
    investment_breakdown: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    }
  };

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/transactions/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  // Fetch portfolio
  const fetchPortfolio = async () => {
    try {
      const response = await axios.get(`${API}/portfolio`);
      setPortfolio(response.data);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTransactions(), fetchSummary(), fetchPortfolio(), fetchAnalytics()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Add transaction
  const handleAddTransaction = async (transaction) => {
    try {
      const response = await axios.post(`${API}/transactions`, transaction);
      setTransactions([response.data, ...transactions]);
      await Promise.all([fetchSummary(), fetchAnalytics()]);
      if (transaction.type === "investment") {
        await fetchPortfolio();
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id) => {
    try {
      await axios.delete(`${API}/transactions/${id}`);
      setTransactions(transactions.filter((t) => t.id !== id));
      await Promise.all([fetchSummary(), fetchPortfolio(), fetchAnalytics()]);
      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Toaster />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            💰 Financial Management Platform
          </h1>
          <p className="text-slate-600">
            Complete budgeting and portfolio tracking with analytics
          </p>
        </div>

        {/* Dashboard */}
        <div className="mb-8">
          <Dashboard summary={summary} />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="budget" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 max-w-3xl mx-auto">
            <TabsTrigger value="budget" data-testid="budget-tab">
              Budget
            </TabsTrigger>
            <TabsTrigger value="investments" data-testid="investments-tab">
              Investments
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-8">
            {/* Income and Expense Forms Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TransactionForm
                type="income"
                onAddTransaction={handleAddTransaction}
              />
              <TransactionForm
                type="expense"
                onAddTransaction={handleAddTransaction}
              />
            </div>

            {/* Transaction List */}
            <TransactionList
              transactions={transactions.filter(t => t.type !== "investment")}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </TabsContent>

          {/* Investments Tab */}
          <TabsContent value="investments" className="space-y-8">
            {/* Portfolio Tracker */}
            <PortfolioTracker portfolio={portfolio} />

            {/* Investment Form */}
            <div className="max-w-4xl mx-auto">
              <InvestmentForm onAddInvestment={handleAddTransaction} />
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Charts analytics={analytics} summary={summary} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
