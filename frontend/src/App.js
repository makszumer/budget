import { useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import { TransactionForm } from "@/components/TransactionForm";
import { InvestmentForm } from "@/components/InvestmentForm";
import { TransactionList } from "@/components/TransactionList";
import { PortfolioTracker } from "@/components/PortfolioTracker";
import { Dashboard } from "@/components/Dashboard";
import { BudgetAnalytics } from "@/components/BudgetAnalytics";
import { InvestmentAnalytics } from "@/components/InvestmentAnalytics";
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
  const [activeSection, setActiveSection] = useState("budget");

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

        {/* Main Section Switcher */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-xl border-2 border-slate-300 bg-white p-1.5 shadow-lg">
            <button
              onClick={() => setActiveSection("budget")}
              data-testid="budget-section-btn"
              className={`px-8 py-3 rounded-lg font-semibold transition-all text-lg ${
                activeSection === "budget"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md scale-105"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              💼 Budget Manager
            </button>
            <button
              onClick={() => setActiveSection("investments")}
              data-testid="investments-section-btn"
              className={`px-8 py-3 rounded-lg font-semibold transition-all text-lg ${
                activeSection === "investments"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md scale-105"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              📈 Investment Portfolio
            </button>
          </div>
        </div>

        {/* Budget Section */}
        {activeSection === "budget" && (
          <div className="space-y-8">
            {/* Budget Dashboard */}
            <div>
              <Dashboard summary={summary} />
            </div>

            {/* Budget Tabs */}
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="transactions" data-testid="transactions-tab">
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="analytics" data-testid="budget-analytics-tab">
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-8 mt-6">
                {/* Income and Expense Forms Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="border-2 border-green-200 rounded-xl p-1 bg-green-50/50">
                    <TransactionForm
                      type="income"
                      onAddTransaction={handleAddTransaction}
                    />
                  </div>
                  <div className="border-2 border-red-200 rounded-xl p-1 bg-red-50/50">
                    <TransactionForm
                      type="expense"
                      onAddTransaction={handleAddTransaction}
                    />
                  </div>
                </div>

                {/* Transaction List */}
                <TransactionList
                  transactions={transactions.filter(t => t.type !== "investment")}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-6">
                <Charts analytics={analytics} summary={summary} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Investment Section */}
        {activeSection === "investments" && (
          <div className="space-y-8">
            {/* Investment Tabs */}
            <Tabs defaultValue="portfolio" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="portfolio" data-testid="portfolio-tab">
                  Portfolio
                </TabsTrigger>
                <TabsTrigger value="add" data-testid="add-investment-tab">
                  Add Investment
                </TabsTrigger>
              </TabsList>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="space-y-6 mt-6">
                <PortfolioTracker portfolio={portfolio} />
              </TabsContent>

              {/* Add Investment Tab */}
              <TabsContent value="add" className="mt-6">
                <div className="max-w-4xl mx-auto border-2 border-blue-200 rounded-xl p-1 bg-blue-50/50">
                  <InvestmentForm onAddInvestment={handleAddTransaction} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
