import { useEffect, useState, useCallback, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AccessProvider, useAccess, FEATURES } from "@/context/AccessContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { RegisterPage } from "@/components/auth/RegisterPage";
import { PricingPage } from "@/components/subscription/PricingPage";
import { SubscriptionSuccess } from "@/components/subscription/SubscriptionSuccess";
import { SubscriptionCancel } from "@/components/subscription/SubscriptionCancel";
import { Sidebar } from "@/components/Sidebar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { DateFilter } from "@/components/DateFilter";
import { VoiceInput } from "@/components/VoiceInput";
import { QuoteOfDay } from "@/components/QuoteOfDay";
import { AppearanceToggle } from "@/components/AppearanceToggle";
import { CurrencyPreferences } from "@/components/CurrencyPreferences";
import { FeatureLock, PremiumBadge } from "@/components/FeatureLock";
import { FinancialHealthSnapshot } from "@/components/FinancialHealthSnapshot";
import { WhatChanged } from "@/components/WhatChanged";
import { Eye, EyeOff, LogOut, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { InvestmentForm } from "@/components/InvestmentForm";
import { TransactionList } from "@/components/TransactionList";
import { InvestmentTransactionList } from "@/components/InvestmentTransactionList";
import { PortfolioTracker } from "@/components/PortfolioTracker";
import { Dashboard } from "@/components/Dashboard";
import { BudgetAnalytics } from "@/components/BudgetAnalytics";
import { InvestmentAnalytics } from "@/components/InvestmentAnalytics";
import { CompoundCalculator } from "@/components/CompoundCalculator";
import { RecurringTransactions } from "@/components/RecurringTransactions";
import { BudgetEnvelopes } from "@/components/BudgetEnvelopes";
import { FinancialAssistant } from "@/components/FinancialAssistant";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { CustomCategoryManager } from "@/components/CustomCategoryManager";
import { InvestingOverview } from "@/components/education/InvestingOverview";
import { CryptoGuide } from "@/components/education/CryptoGuide";
import { StocksGuide } from "@/components/education/StocksGuide";
import { BondsGuide } from "@/components/education/BondsGuide";
import { ETFsGuide } from "@/components/education/ETFsGuide";
import { InflationGuide } from "@/components/education/InflationGuide";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useScrollDirection } from "@/hooks/useScrollDirection";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function MainApp() {
  const { user, loading: authLoading, logout, isPremium, isAuthenticated, isAdmin, isGuest, primaryCurrency, isOnTrial } = useAuth();
  const access = useAccess();
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
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currencies, setCurrencies] = useState(["USD"]);
  const [authView, setAuthView] = useState('login');
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [budgetEnvelopes, setBudgetEnvelopes] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { isVisible: actionsVisible } = useScrollDirection(15);

  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path.includes('/subscription/success') || search.includes('session_id')) {
      setCurrentPage('subscription-success');
    } else if (path.includes('/subscription/cancel')) {
      setCurrentPage('subscription-cancel');
    } else if (path.includes('/pricing')) {
      setCurrentPage('pricing');
    }
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/transactions/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get(`${API}/portfolio`);
      setPortfolio(response.data);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const fetchBudgetGrowth = async () => {
    try {
      const response = await axios.get(`${API}/analytics/budget-growth`);
      setBudgetGrowth(response.data);
    } catch (error) {
      console.error("Error fetching budget growth:", error);
    }
  };

  const fetchInvestmentGrowth = async () => {
    try {
      const response = await axios.get(`${API}/analytics/investment-growth`);
      setInvestmentGrowth(response.data);
    } catch (error) {
      console.error("Error fetching investment growth:", error);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(`${API}/currencies`);
      setCurrencies(response.data.currencies);
    } catch (error) {
      console.error("Error fetching currencies:", error);
    }
  };

  const fetchRecurringTransactions = async () => {
    try {
      const response = await axios.get(`${API}/recurring-transactions`);
      setRecurringTransactions(response.data);
    } catch (error) {
      console.error("Error fetching recurring transactions:", error);
    }
  };

  const fetchBudgetEnvelopes = async () => {
    try {
      const response = await axios.get(`${API}/budget-envelopes`);
      setBudgetEnvelopes(response.data);
    } catch (error) {
      console.error("Error fetching budget envelopes:", error);
    }
  };

  const processRecurringTransactions = async () => {
    try {
      await axios.post(`${API}/recurring-transactions/process`);
      await fetchTransactions();
      await fetchSummary();
    } catch (error) {
      console.error("Error processing recurring transactions:", error);
    }
  };

  useEffect(() => {
    const keepAlive = async () => {
      try {
        await axios.get(`${API}/`, { timeout: 5000 });
        if (!serverAwake) setServerAwake(true);
      } catch (error) {
        console.log("Keep-alive ping failed, server may be sleeping");
      }
    };
    keepAlive();
    const interval = setInterval(keepAlive, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [serverAwake]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
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
            fetchInvestmentGrowth(),
            fetchCurrencies(),
            fetchRecurringTransactions(),
            fetchBudgetEnvelopes(),
            processRecurringTransactions()
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
    };
    loadData();
  }, []);

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

  const handleEditTransaction = async (updatedTransaction) => {
    try {
      const response = await axios.put(`${API}/transactions/${updatedTransaction.id}`, {
        type: updatedTransaction.type,
        amount: updatedTransaction.amount,
        description: updatedTransaction.description,
        category: updatedTransaction.category,
        date: updatedTransaction.date,
        asset: updatedTransaction.asset,
        quantity: updatedTransaction.quantity,
        purchase_price: updatedTransaction.purchase_price
      });
      setTransactions(transactions.map(t =>
        t.id === updatedTransaction.id ? response.data : t
      ));
      await Promise.all([
        fetchSummary(),
        fetchPortfolio(),
        fetchAnalytics(),
        fetchBudgetGrowth(),
        fetchInvestmentGrowth()
      ]);
      toast.success("Transaction updated successfully");
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
    }
  };

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

  if (loading) return <LoadingScreen />;

  const handleNavigateToPricing = () => setCurrentPage("pricing");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return renderDashboard();
      case "recurring": return <RecurringTransactions currencies={currencies} />;
      case "budget-envelopes": return <BudgetEnvelopes currencies={currencies} />;
      case "custom-categories": return <CustomCategoryManager />;
      case "ai-assistant":
        return (
          <FeatureLock feature={FEATURES.AI_ASSISTANT} onUpgradeClick={handleNavigateToPricing}>
            <FinancialAssistant />
          </FeatureLock>
        );
      case "admin": return <AdminDashboard />;
      case "investing-overview": return <InvestingOverview />;
      case "investing-crypto": return <CryptoGuide />;
      case "investing-stocks": return <StocksGuide />;
      case "investing-bonds": return <BondsGuide />;
      case "investing-etfs": return <ETFsGuide />;
      case "investing-inflation": return <InflationGuide />;
      case "calculator": return <CompoundCalculator />;
      case "pricing": return <PricingPage onGoBack={() => setCurrentPage("dashboard")} />;
      default: return renderDashboard();
    }
  };

  const renderDashboard = () => {
    const filteredTransactions = getFilteredTransactions();
    const filteredSummary = getFilteredSummary();
    return (
      <div className="space-y-8" data-testid="dashboard-container">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1 rounded-lg bg-white dark:bg-gray-100 shadow-sm">
                <img src="/vaulton-logo.png" alt="Vaulton" className="h-12 w-auto object-contain" />
              </div>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full">
                  <Shield className="h-3 w-3" />Admin
                </span>
              )}
              {isGuest && (
                <span className="inline-flex items-center px-2 py-0.5 bg-gray-500 text-white text-xs font-bold rounded-full">
                  Guest
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400">Your financial overview and management</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <CurrencyPreferences compact />
            <AppearanceToggle />
            <FeatureLock feature={FEATURES.VOICE_INPUT} onUpgradeClick={handleNavigateToPricing}>
              <VoiceInput onTransactionCreated={handleAddTransaction} />
            </FeatureLock>
          </div>
        </div>

        <DateFilter
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />

        <QuoteOfDay onUpgradeClick={handleNavigateToPricing} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="transaction-forms">
          <div className="border-2 border-red-200 dark:border-red-800 rounded-xl p-1 bg-red-50/50 dark:bg-red-950/30">
            <TransactionForm type="expense" onAddTransaction={handleAddTransaction} />
          </div>
          <div className="border-2 border-green-200 dark:border-green-800 rounded-xl p-1 bg-green-50/50 dark:bg-green-950/30">
            <TransactionForm type="income" onAddTransaction={handleAddTransaction} />
          </div>
        </div>

        <Dashboard summary={filteredSummary} privacyMode={privacyMode} />

        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-xl border-2 border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 shadow-lg">
            <button
              onClick={() => setActiveSection("budget")}
              data-testid="budget-section-btn"
              className={`px-8 py-3 rounded-lg font-semibold transition-all text-lg ${
                activeSection === "budget"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md scale-105"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-700"
              }`}
            >
              💼 Budget Manager
            </button>
            <button
              onClick={() => setActiveSection("investments")}
              data-testid="investments-section-btn"
              className={`px-8 py-3 rounded-lg font-semibold transition-all text-lg relative ${
                activeSection === "investments"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md scale-105"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-700"
              }`}
            >
              📈 Investment Portfolio
              {!access.canUseInvestmentPortfolio && (
                <span className="absolute -top-2 -right-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  PRO
                </span>
              )}
            </button>
          </div>
        </div>

        {activeSection === "budget" && (
          <div className="space-y-6">
            <div className="flex justify-center gap-3">
              <Button
                variant={showTransactions ? "default" : "outline"}
                onClick={() => { setShowTransactions(!showTransactions); setShowAnalytics(false); }}
                className="flex items-center gap-2"
                data-testid="show-transactions-btn"
              >
                {showTransactions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Transactions
              </Button>
              <Button
                variant={showAnalytics ? "default" : "outline"}
                onClick={() => { setShowAnalytics(!showAnalytics); setShowTransactions(false); }}
                className="flex items-center gap-2"
                data-testid="show-analytics-btn"
              >
                {showAnalytics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Analytics
              </Button>
            </div>
            {showTransactions && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <TransactionList
                  transactions={filteredTransactions.filter(t => t.type !== "investment")}
                  onDeleteTransaction={handleDeleteTransaction}
                  onEditTransaction={handleEditTransaction}
                  currencies={currencies}
                />
              </div>
            )}
            {showAnalytics && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <BudgetAnalytics
                  analytics={analytics}
                  budgetGrowth={budgetGrowth}
                  privacyMode={privacyMode}
                  transactions={filteredTransactions.filter(t => t.type !== "investment")}
                />
              </div>
            )}
          </div>
        )}

        {activeSection === "investments" && (
          <FeatureLock feature={FEATURES.INVESTMENT_PORTFOLIO} onUpgradeClick={handleNavigateToPricing}>
            <div className="space-y-8">
              <Tabs defaultValue="portfolio" className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-3xl mx-auto">
                  <TabsTrigger value="portfolio" data-testid="portfolio-tab">Portfolio</TabsTrigger>
                  <TabsTrigger value="add" data-testid="add-investment-tab">Add Investment</TabsTrigger>
                  <TabsTrigger value="history" data-testid="investment-history-tab">History</TabsTrigger>
                  <TabsTrigger value="analytics" data-testid="investment-analytics-tab">Analytics</TabsTrigger>
                </TabsList>
                <TabsContent value="portfolio" className="space-y-6 mt-6">
                  <PortfolioTracker portfolio={portfolio} />
                </TabsContent>
                <TabsContent value="add" className="mt-6">
                  <div className="max-w-4xl mx-auto border-2 border-blue-200 dark:border-blue-800 rounded-xl p-1 bg-blue-50/50 dark:bg-blue-950/30">
                    <InvestmentForm onAddInvestment={handleAddTransaction} />
                  </div>
                </TabsContent>
                <TabsContent value="history" className="mt-6">
                  <div className="max-w-4xl mx-auto">
                    <InvestmentTransactionList
                      transactions={transactions.filter(t => t.type === "investment")}
                      onDeleteTransaction={handleDeleteTransaction}
                      onEditTransaction={handleEditTransaction}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="analytics" className="mt-6">
                  <InvestmentAnalytics analytics={analytics} investmentGrowth={investmentGrowth} />
                </TabsContent>
              </Tabs>
            </div>
          </FeatureLock>
        )}

        <FinancialHealthSnapshot
          transactions={transactions}
          summary={filteredSummary}
          investmentGrowth={investmentGrowth}
          analytics={analytics}
          privacyMode={privacyMode}
          onUpgradeClick={handleNavigateToPricing}
        />

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <WhatChanged
            transactions={transactions}
            recurringTransactions={recurringTransactions}
            investmentGrowth={investmentGrowth}
            analytics={analytics}
            dateFilter={dateFilter}
            onUpgradeClick={handleNavigateToPricing}
          />
        </div>
      </div>
    );
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  const getFilteredTransactions = () => {
    if (dateFilter === "all") return transactions;
    const now = selectedDate;
    return transactions.filter(t => {
      const transDate = new Date(t.date);
      if (dateFilter === "day") return transDate.toDateString() === now.toDateString();
      if (dateFilter === "week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return transDate >= weekStart && transDate < weekEnd;
      }
      if (dateFilter === "month") return transDate.getMonth() === now.getMonth() && transDate.getFullYear() === now.getFullYear();
      if (dateFilter === "year") return transDate.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const getFilteredSummary = () => {
    const filtered = getFilteredTransactions();
    const totalIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalInvestments = filtered.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome, totalExpenses, totalInvestments, balance: totalIncome - totalExpenses };
  };

  if (authLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} onRegisterSuccess={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} onLoginSuccess={() => {}} />;
  }

  if (currentPage === 'pricing') return <PricingPage onGoBack={() => setCurrentPage('dashboard')} />;
  if (currentPage === 'subscription-success') return <SubscriptionSuccess onGoHome={() => setCurrentPage('dashboard')} />;
  if (currentPage === 'subscription-cancel') return <SubscriptionCancel onGoHome={() => setCurrentPage('dashboard')} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 flex relative">
      <Toaster />

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{top: "calc(env(safe-area-inset-top, 20px) + 0.5rem)"}}
        className={`fixed left-6 z-50 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
          actionsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        data-testid="menu-toggle"
      >
        <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <>
              <circle cx="12" cy="5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </>
          )}
        </svg>
      </button>

      <div style={{top: "calc(env(safe-area-inset-top, 20px) + 0.5rem)"}} className={`fixed right-6 z-50 flex items-center gap-2 transition-all duration-300 ease-in-out ${
        actionsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <button
          onClick={() => setPrivacyMode(!privacyMode)}
          className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
          data-testid="privacy-toggle"
          title={privacyMode ? "Show amounts" : "Hide amounts"}
        >
          {privacyMode ? (
            <EyeOff className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          ) : (
            <Eye className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          )}
        </button>
        <button
          onClick={logout}
          className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Logout"
        >
          <LogOut className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed left-0 top-0 h-full z-40 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      </div>

      <div className="flex-1 overflow-auto w-full">
        <div className="container mx-auto px-8 pb-8" style={{paddingTop: "calc(env(safe-area-inset-top, 20px) + 5rem)"}}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AccessProvider>
          <MainApp />
        </AccessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
