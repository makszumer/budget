import { useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { Dashboard } from "@/components/Dashboard";
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

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTransactions(), fetchSummary()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Add transaction
  const handleAddTransaction = async (transaction) => {
    try {
      const response = await axios.post(`${API}/transactions`, transaction);
      setTransactions([response.data, ...transactions]);
      await fetchSummary();
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
      await fetchSummary();
      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
            💰 Financial Tracker
          </h1>
          <p className="text-slate-600">
            Track your income, expenses, and investments
          </p>
        </div>

        {/* Dashboard */}
        <div className="mb-8">
          <Dashboard summary={summary} />
        </div>

        {/* Transaction Forms */}
        <Tabs defaultValue="expense" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
            <TabsTrigger value="expense" data-testid="expense-tab">
              Expenses
            </TabsTrigger>
            <TabsTrigger value="income" data-testid="income-tab">
              Income
            </TabsTrigger>
            <TabsTrigger value="investment" data-testid="investment-tab">
              Investments
            </TabsTrigger>
          </TabsList>
          <div className="mt-6 max-w-2xl mx-auto">
            <TabsContent value="expense">
              <TransactionForm
                type="expense"
                onAddTransaction={handleAddTransaction}
              />
            </TabsContent>
            <TabsContent value="income">
              <TransactionForm
                type="income"
                onAddTransaction={handleAddTransaction}
              />
            </TabsContent>
            <TabsContent value="investment">
              <TransactionForm
                type="investment"
                onAddTransaction={handleAddTransaction}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Transaction List */}
        <div className="max-w-4xl mx-auto">
          <TransactionList
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
