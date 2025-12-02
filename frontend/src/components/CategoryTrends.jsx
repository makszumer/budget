import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Search, TrendingUp } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const CategoryTrends = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [groupBy, setGroupBy] = useState("month");
  const [chartData, setChartData] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Extract unique categories
    const uniqueCategories = [...new Set(transactions.map(t => t.category))].sort();
    setCategories(uniqueCategories);
  }, [transactions]);

  useEffect(() => {
    if (selectedCategory) {
      generateChartData();
    }
  }, [selectedCategory, groupBy, transactions]);

  const generateChartData = () => {
    const filtered = transactions.filter(t => t.category === selectedCategory);
    
    if (filtered.length === 0) {
      setChartData([]);
      return;
    }

    const grouped = {};

    filtered.forEach(t => {
      const date = new Date(t.date);
      let key;

      if (groupBy === "day") {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      } else if (groupBy === "year") {
        key = date.getFullYear().toString();
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          amount: 0,
          count: 0,
        };
      }

      grouped[key].amount += t.amount;
      grouped[key].count += 1;
    });

    // Convert to array and sort by period
    const data = Object.values(grouped).sort((a, b) => 
      a.period.localeCompare(b.period)
    );

    // Format period labels
    data.forEach(item => {
      if (groupBy === "day") {
        const date = new Date(item.period);
        item.label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } else if (groupBy === "month") {
        const [year, month] = item.period.split('-');
        const date = new Date(year, parseInt(month) - 1);
        item.label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        item.label = item.period;
      }
    });

    setChartData(data);
  };

  const filteredCategories = categories.filter(cat => 
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{payload[0].payload.label}</p>
          <p className="text-sm text-blue-600">Amount: {formatAmount(payload[0].value)}</p>
          <p className="text-sm text-gray-600">Transactions: {payload[0].payload.count}</p>
        </div>
      );
    }
    return null;
  };

  const totalSpent = chartData.reduce((sum, item) => sum + item.amount, 0);
  const avgSpent = chartData.length > 0 ? totalSpent / chartData.length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Category Spending Trends
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your spending patterns by category over time
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Search Category</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No categories found</div>
                ) : (
                  filteredCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Group By</Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart */}
        {!selectedCategory ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Select a category to see spending trends</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No data available for {selectedCategory}</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="text-lg font-bold text-purple-700">{formatAmount(totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average Per Period</p>
                <p className="text-lg font-bold text-purple-700">{formatAmount(avgSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Number of Periods</p>
                <p className="text-lg font-bold text-purple-700">{chartData.length}</p>
              </div>
            </div>

            {/* Bar Chart */}
            <div>
              <h3 className="font-semibold mb-4 text-purple-700">{selectedCategory} - Spending Over Time</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="label" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" fill="#9333ea" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line Chart */}
            <div>
              <h3 className="font-semibold mb-4 text-purple-700">Trend Line</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="label" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#9333ea" 
                    strokeWidth={3}
                    dot={{ fill: '#9333ea', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
