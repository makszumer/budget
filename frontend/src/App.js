import { useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import { Sidebar } from "@/components/Sidebar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TransactionForm } from "@/components/TransactionForm";
import { InvestmentForm } from "@/components/InvestmentForm";
import { TransactionList } from "@/components/TransactionList";
import { InvestmentTransactionList } from "@/components/InvestmentTransactionList";
import { PortfolioTracker } from "@/components/PortfolioTracker";
import { Dashboard } from "@/components/Dashboard";
import { BudgetAnalytics } from "@/components/BudgetAnalytics";
import { InvestmentAnalytics } from "@/components/InvestmentAnalytics";
import { CompoundCalculator } from "@/components/CompoundCalculator";
import { InvestingOverview } from "@/components/education/InvestingOverview";
import { CryptoGuide } from "@/components/education/CryptoGuide";
import { StocksGuide } from "@/components/education/StocksGuide";
import { BondsGuide } from "@/components/education/BondsGuide";
import { ETFsGuide } from "@/components/education/ETFsGuide";
import { InflationGuide } from "@/components/education/InflationGuide";
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
  const [budgetGrowth, setBudgetGrowth] = useState(null);
  const [investmentGrowth, setInvestmentGrowth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("budget");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serverAwake, setServerAwake] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [dateFilter, setDateFilter] = useState("all"); // all, day, week, month, year
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Fetch budget growth
  const fetchBudgetGrowth = async () => {
    try {
      const response = await axios.get(`${API}/analytics/budget-growth`);
      setBudgetGrowth(response.data);
    } catch (error) {
      console.error("Error fetching budget growth:", error);
    }
  };

  // Fetch investment growth
  const fetchInvestmentGrowth = async () => {
    try {
      const response = await axios.get(`${API}/analytics/investment-growth`);
      setInvestmentGrowth(response.data);
    } catch (error) {
      console.error("Error fetching investment growth:", error);
    }
  };

  // Keep-alive ping to prevent server sleep
  useEffect(() => {
    const keepAlive = async () => {
      try {
        await axios.get(`${API}/`, { timeout: 5000 });
        if (!serverAwake) {
          setServerAwake(true);
        }
      } catch (error) {
        console.log("Keep-alive ping failed, server may be sleeping");
      }
    };

    // Ping immediately
    keepAlive();

    // Then ping every 3 minutes to keep server awake
    const interval = setInterval(keepAlive, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(interval);
  }, [serverAwake]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Try to load data with retry logic
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          await Promise.all([
            fetchTransactions(), 
            fetchSummary(), 
            fetchPortfolio(), 
            fetchAnalytics(),
            fetchBudgetGrowth(),
            fetchInvestmentGrowth()
          ]);
          setServerAwake(true);
          setLoading(false);
          break;
        } catch (error) {
          retries++;
          console.log(`Attempt ${retries} failed, retrying...`);
          if (retries < maxRetries) {
            // Wait 10 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 10000));
          } else {
            console.error("Failed to load data after retries");
            setLoading(false);
          }
        }
      }
    };
    loadData();
  }, []);

  // Add transaction
  const handleAddTransaction = async (transaction) => {
    try {
      const response = await axios.post(`${API}/transactions`, transaction);
      setTransactions([response.data, ...transactions]);
      await Promise.all([fetchSummary(), fetchAnalytics(), fetchBudgetGrowth()]);
      if (transaction.type === "investment") {
        await Promise.all([fetchPortfolio(), fetchInvestmentGrowth()]);
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
      await Promise.all([
        fetchSummary(), 
        fetchPortfolio(), 
        fetchAnalytics(),
        fetchBudgetGrowth(),
        fetchInvestmentGrowth()
      ]);
      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return renderDashboard();
      case "investing-overview":
        return <InvestingOverview />;
      case "investing-crypto":
        return <CryptoGuide />;
      case "investing-stocks":
        return <StocksGuide />;
      case "investing-bonds":
        return <BondsGuide />;
      case "investing-etfs":
        return <ETFsGuide />;
      case "investing-inflation":
        return <InflationGuide />;
      case "calculator":
        return <CompoundCalculator />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Dashboard
        </h1>
        <p className="text-slate-600">
          Your financial overview and management
        </p>
      </div>

      {/* Dashboard */}
      <div className="mb-8">
        <Dashboard summary={summary} />
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
              {/* Expense and Income Forms Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border-2 border-red-200 rounded-xl p-1 bg-red-50/50">
                  <TransactionForm
                    type="expense"
                    onAddTransaction={handleAddTransaction}
                  />
                </div>
                <div className="border-2 border-green-200 rounded-xl p-1 bg-green-50/50">
                  <TransactionForm
                    type="income"
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
              <BudgetAnalytics analytics={analytics} budgetGrowth={budgetGrowth} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Investment Section */}
      {activeSection === "investments" && (
        <div className="space-y-8">
          {/* Investment Tabs */}
          <Tabs defaultValue="portfolio" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-3xl mx-auto">
              <TabsTrigger value="portfolio" data-testid="portfolio-tab">
                Portfolio
              </TabsTrigger>
              <TabsTrigger value="add" data-testid="add-investment-tab">
                Add Investment
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="investment-history-tab">
                History
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="investment-analytics-tab">
                Analytics
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

            {/* History Tab */}
            <TabsContent value="history" className="mt-6">
              <div className="max-w-4xl mx-auto">
                <InvestmentTransactionList
                  transactions={transactions.filter(t => t.type === "investment")}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-6">
              <InvestmentAnalytics analytics={analytics} investmentGrowth={investmentGrowth} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false); // Close sidebar after navigation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex relative">
      <Toaster />
      
      {/* Menu Button (Three Dots) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-6 left-6 z-50 p-3 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all border border-gray-200"
        data-testid="menu-toggle"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {sidebarOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <>
              <circle cx="12" cy="5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </>
          )}
        </svg>
      </button>

      {/* Server Status Indicator */}
      {serverAwake && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg shadow-md">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-700 font-medium">Server Active</span>
        </div>
      )}

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full z-40 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full">
        <div className="container mx-auto px-8 py-8">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default App;
