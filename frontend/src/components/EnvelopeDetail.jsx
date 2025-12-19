import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categoryOptions = {
  expense: {
    "Vacation": ["Flight", "Hotel", "Restaurant", "Activities", "Shopping", "Transportation", "Other"],
    "Food & Dining": ["Groceries", "Restaurants", "Takeout"],
    "Entertainment": ["Movies", "Events", "Attractions"],
    "Shopping": ["Clothes", "Souvenirs", "Gifts"],
    "Transportation": ["Gas", "Parking", "Tolls", "Car Rental"],
  },
  income: {
    "Contributions": ["Salary allocation", "Savings transfer", "Gift", "Other"],
  },
};

export const EnvelopeDetail = ({ envelope, onBack, onUpdate }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    category: "",
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchTransactions();
  }, [envelope.id]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/budget-envelopes/${envelope.id}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingTransaction) {
        // Update existing transaction
        await axios.put(
          `${API}/budget-envelopes/${envelope.id}/transactions/${editingTransaction.id}`,
          {
            ...formData,
            amount: parseFloat(formData.amount),
          }
        );
        toast.success("Transaction updated!");
        setEditingTransaction(null);
      } else {
        // Create new transaction
        await axios.post(`${API}/budget-envelopes/${envelope.id}/transactions`, {
          ...formData,
          amount: parseFloat(formData.amount),
        });
        toast.success("Transaction added!");
      }
      
      setShowAddForm(false);
      setFormData({
        type: "expense",
        amount: "",
        description: "",
        category: "",
        date: new Date().toISOString().split('T')[0],
      });
      fetchTransactions();
      onUpdate(); // Refresh envelope data
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast.error("Failed to save transaction");
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description || "",
      category: transaction.category,
      date: transaction.date,
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setShowAddForm(false);
    setFormData({
      type: "expense",
      amount: "",
      description: "",
      category: "",
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleDelete = async (transactionId) => {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      await axios.delete(`${API}/budget-envelopes/${envelope.id}/transactions/${transactionId}`);
      toast.success("Transaction deleted");
      fetchTransactions();
      onUpdate();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const calculateTotals = () => {
    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  };

  const { totalIncome, totalExpense, balance } = calculateTotals();
  const progress = (envelope.current_amount / envelope.target_amount) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Envelopes</span>
            </button>
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold">{envelope.name}</h2>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Envelope Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Target</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatAmount(envelope.target_amount, envelope.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Current</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatAmount(envelope.current_amount, envelope.currency)}
            </p>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(0)}% reached</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatAmount(totalIncome, envelope.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatAmount(totalExpense, envelope.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Transaction Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{editingTransaction ? "Edit Transaction" : "Transactions"}</CardTitle>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            )}
            {showAddForm && (
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="border-t">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value, category: "" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income (Add Money)</SelectItem>
                      <SelectItem value="expense">Expense (Spend Money)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({envelope.currency}) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryOptions[formData.type] || {}).map(([group, items]) => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {items.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Add notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingTransaction ? "Update Transaction" : "Add Transaction"}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet. Add your first transaction above!
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{transaction.description || transaction.category}</span>
                      <span className="text-xs px-2 py-1 bg-slate-100 rounded">
                        {transaction.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatAmount(transaction.amount, envelope.currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(transaction);
                      }}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(transaction.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
