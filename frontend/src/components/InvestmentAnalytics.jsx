import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = {
  investments: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
};

export const InvestmentAnalytics = ({ analytics, investmentGrowth }) => {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const investmentData = analytics.investment_breakdown.map(item => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage.toFixed(1),
  }));

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
          <p className="text-sm text-blue-600">Invested: {formatAmount(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry) => {
    return `${entry.percentage}%`;
  };

  if (investmentData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Add investments to see your portfolio analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Growth Chart */}
      {investmentGrowth && investmentGrowth.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-700">📊 Investment Growth Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">Track how your investments grow</p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Invested</p>
                <p className="text-lg font-bold text-blue-600">{formatAmount(investmentGrowth.total_invested)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="text-lg font-bold text-purple-600">{formatAmount(investmentGrowth.current_value)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Gain/Loss</p>
                <p className={`text-lg font-bold ${investmentGrowth.total_gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {investmentGrowth.total_gain >= 0 ? '+' : ''}{formatAmount(investmentGrowth.total_gain)}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={investmentGrowth.data}>
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
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Investment Distribution */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-700">📊 Investment Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">How much is in different investments</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={investmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={120}
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
      </div>
    </div>
  );
};
