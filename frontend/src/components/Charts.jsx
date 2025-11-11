import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = {
  expenses: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6'],
  income: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
  investments: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
  savings: ['#10b981', '#ef4444', '#3b82f6'],
};

export const Charts = ({ analytics, summary }) => {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare data for charts
  const expenseData = analytics.expense_breakdown.map(item => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage.toFixed(1),
  }));

  const incomeData = analytics.income_breakdown.map(item => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage.toFixed(1),
  }));

  const investmentData = analytics.investment_breakdown.map(item => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage.toFixed(1),
  }));

  // Savings rate data
  const savingsData = [
    {
      name: 'Invested',
      value: summary.totalInvestments,
      percentage: summary.totalIncome > 0 
        ? ((summary.totalInvestments / summary.totalIncome) * 100).toFixed(1)
        : 0,
    },
    {
      name: 'Expenses',
      value: summary.totalExpenses,
      percentage: summary.totalIncome > 0 
        ? ((summary.totalExpenses / summary.totalIncome) * 100).toFixed(1)
        : 0,
    },
    {
      name: 'Remaining',
      value: Math.max(0, summary.balance),
      percentage: summary.totalIncome > 0 
        ? ((Math.max(0, summary.balance) / summary.totalIncome) * 100).toFixed(1)
        : 0,
    },
  ];

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

  const renderLabel = (entry) => {
    return `${entry.percentage}%`;
  };

  if (expenseData.length === 0 && incomeData.length === 0 && investmentData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Add some transactions to see your financial analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        {expenseData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-700">💸 Expense Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">What you spend the most on</p>
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
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => `${value} (${formatAmount(entry.payload.value)})`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Income Sources */}
        {incomeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">💰 Income Sources</CardTitle>
              <p className="text-sm text-muted-foreground">Your biggest sources of income</p>
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
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => `${value} (${formatAmount(entry.payload.value)})`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Investment Distribution */}
        {investmentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">📊 Investment Distribution</CardTitle>
              <p className="text-sm text-muted-foreground">How much is in different investments</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={investmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {investmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.investments[index % COLORS.investments.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => `${value} (${formatAmount(entry.payload.value)})`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Savings & Investment Rate */}
        {summary.totalIncome > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-700">📈 Income Allocation</CardTitle>
              <p className="text-sm text-muted-foreground">How you allocate your income</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={savingsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {savingsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.savings[index % COLORS.savings.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => `${value} (${formatAmount(entry.payload.value)})`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Investment Rate</p>
                  <p className="text-lg font-bold text-green-600">
                    {((summary.totalInvestments / summary.totalIncome) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expense Rate</p>
                  <p className="text-lg font-bold text-red-600">
                    {((summary.totalExpenses / summary.totalIncome) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Savings Rate</p>
                  <p className="text-lg font-bold text-blue-600">
                    {((Math.max(0, summary.balance) / summary.totalIncome) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
