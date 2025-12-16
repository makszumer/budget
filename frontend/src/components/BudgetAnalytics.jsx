import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Eye, EyeOff, Calendar } from "lucide-react";
import { CategoryTrends } from "@/components/CategoryTrends";

const COLORS = {
  expenses: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6'],
  income: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
};

export const BudgetAnalytics = ({ analytics, budgetGrowth, privacyMode = false, transactions = [] }) => {
  const [showExpenseLegend, setShowExpenseLegend] = useState(false);
  const [showIncomeLegend, setShowIncomeLegend] = useState(false);
  const [pieChartFilter, setPieChartFilter] = useState("all"); // all, daily, weekly, monthly

  const formatAmount = (amount) => {
    if (privacyMode) {
      return "$***,***";
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter transactions based on pie chart filter
  const filteredTransactions = useMemo(() => {
    if (pieChartFilter === "all") return transactions;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      
      if (pieChartFilter === "daily") {
        return transactionDate >= today;
      } else if (pieChartFilter === "weekly") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return transactionDate >= weekAgo;
      } else if (pieChartFilter === "monthly") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return transactionDate >= monthAgo;
      }
      return true;
    });
  }, [transactions, pieChartFilter]);

  // Calculate breakdown from filtered transactions
  const calculateBreakdown = (type) => {
    const filtered = filteredTransactions.filter(t => t.type === type);
    const categoryTotals = {};
    
    filtered.forEach(t => {
      const category = t.category || "Other";
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
    });
    
    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      name: category,
      value: amount,
      percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0,
    }));
  };

  const expenseData = pieChartFilter === "all" 
    ? analytics.expense_breakdown.map(item => ({
        name: item.category,
        value: item.amount,
        percentage: item.percentage.toFixed(1),
      }))
    : calculateBreakdown("expense");

  const incomeData = pieChartFilter === "all"
    ? analytics.income_breakdown.map(item => ({
        name: item.category,
        value: item.amount,
        percentage: item.percentage.toFixed(1),
      }))
    : calculateBreakdown("income");

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-blue-600">{formatAmount(payload[0].value)}</p>
          <p className="text-sm text-gray-600">{payload[0].payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const GrowthTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{payload[0].payload.date}</p>
          <p className="text-sm text-green-600">Balance: {formatAmount(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry) => {
    return `${entry.percentage}%`;
  };

  if (expenseData.length === 0 && incomeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Add income and expenses to see your budget analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Growth Chart */}
      {budgetGrowth && budgetGrowth.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">📈 Budget Growth Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">Track how your balance grows</p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-lg font-bold text-green-600">{formatAmount(budgetGrowth.total_income)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-red-600">{formatAmount(budgetGrowth.total_expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Savings</p>
                <p className={`text-lg font-bold ${budgetGrowth.net_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(budgetGrowth.net_savings)}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={budgetGrowth.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatAmount(value)}
                />
                <Tooltip content={<GrowthTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        {expenseData.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-red-700">💸 Expense Breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground">What you spend the most on</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpenseLegend(!showExpenseLegend)}
                >
                  {showExpenseLegend ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showExpenseLegend ? "Hide" : "Show"} Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.expenses[index % COLORS.expenses.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Scrollable Legend */}
              {showExpenseLegend && (
                <div className="mt-4 max-h-48 overflow-y-auto border-t pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {expenseData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-4 h-4 rounded-sm flex-shrink-0" 
                          style={{ backgroundColor: COLORS.expenses[index % COLORS.expenses.length] }}
                        />
                        <span className="truncate">{entry.name}</span>
                        <span className="text-muted-foreground ml-auto">
                          ({formatAmount(entry.value)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Income Sources */}
        {incomeData.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-green-700">💰 Income Sources</CardTitle>
                  <p className="text-sm text-muted-foreground">Your biggest sources of income</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIncomeLegend(!showIncomeLegend)}
                >
                  {showIncomeLegend ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showIncomeLegend ? "Hide" : "Show"} Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.income[index % COLORS.income.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Scrollable Legend */}
              {showIncomeLegend && (
                <div className="mt-4 max-h-48 overflow-y-auto border-t pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {incomeData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-4 h-4 rounded-sm flex-shrink-0" 
                          style={{ backgroundColor: COLORS.income[index % COLORS.income.length] }}
                        />
                        <span className="truncate">{entry.name}</span>
                        <span className="text-muted-foreground ml-auto">
                          ({formatAmount(entry.value)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category Trends */}
      <CategoryTrends transactions={transactions} />
    </div>
  );
};
