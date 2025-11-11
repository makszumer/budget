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

  const budgetTransactions = transactions.filter(t => t.type !== "investment");
  const investmentTransactions = transactions.filter(t => t.type === "investment");

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
            Complete budgeting and portfolio tracking solution
          </p>
        </div>

        {/* View Switcher */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveView("budget")}
              data-testid="budget-view-btn"
              className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
                activeView === "budget"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wallet className="h-4 w-4" />
              Budget Manager
            </button>
            <button
              onClick={() => setActiveView("investments")}
              data-testid="investments-view-btn"
              className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
                activeView === "investments"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Investment Portfolio
            </button>
          </div>
        </div>

        {/* Budget View */}
        {activeView === "budget" && (
          <div className="space-y-8">
            {/* Budget Dashboard */}
            <div>
              <Dashboard summary={summary} />
            </div>

            {/* Budget Forms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader>
                  <CardTitle className="text-green-700">Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <TransactionForm
                    type="income"
                    onAddTransaction={handleAddTransaction}
                  />
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="text-red-700">Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <TransactionForm
                    type="expense"
                    onAddTransaction={handleAddTransaction}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Budget Transaction List */}
            <div>
              <TransactionList
                transactions={budgetTransactions}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </div>
          </div>
        )}

        {/* Investment View */}
        {activeView === "investments" && (
          <div className="space-y-8">
            {/* Portfolio Tracker */}
            <div>
              <PortfolioTracker portfolio={portfolio} />
            </div>

            {/* Investment Form */}
            <div className="max-w-4xl mx-auto">
              <InvestmentForm onAddInvestment={handleAddTransaction} />
            </div>

            {/* Investment Transaction List */}
            <div className="max-w-4xl mx-auto">
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle>Investment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {investmentTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No investment transactions yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {investmentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          data-testid={`investment-transaction-${transaction.id}`}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold">{transaction.asset || transaction.category}</span>
                              <span className="text-sm text-muted-foreground">
                                {transaction.quantity && `(${transaction.quantity} units)`}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span>{transaction.category}</span>
                              {transaction.description && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>{transaction.description}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                              }).format(transaction.amount)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
