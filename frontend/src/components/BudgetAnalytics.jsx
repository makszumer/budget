import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Sector } from "recharts";
import { Eye, EyeOff, Calendar, Loader2, AlertCircle, X } from "lucide-react";
import { CategoryTrends } from "@/components/CategoryTrends";
import { toast } from "sonner";

const COLORS = {
  expenses: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6'],
  income: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
};

// Custom active shape for highlighted pie slice
const renderActiveShape = (props, colorPalette) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300 ease-out"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
        className="transition-all duration-300 ease-out"
      />
    </g>
  );
};

export const BudgetAnalytics = ({ analytics, budgetGrowth, privacyMode = false, transactions = [] }) => {
  const [showExpenseLegend, setShowExpenseLegend] = useState(false);
  const [showIncomeLegend, setShowIncomeLegend] = useState(false);
  const [pieChartFilter, setPieChartFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterError, setFilterError] = useState("");
  
  // Store the active custom range for display
  const [activeCustomRange, setActiveCustomRange] = useState(null);
  
  // State for interactive highlighting
  const [activeExpenseIndex, setActiveExpenseIndex] = useState(null);
  const [activeIncomeIndex, setActiveIncomeIndex] = useState(null);

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

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get current filter label for display
  const getFilterLabel = () => {
    switch (pieChartFilter) {
      case "daily":
        return `Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      case "weekly":
        const now = new Date();
        const currentDay = now.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return `This Week (${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      case "monthly":
        return `This Month (${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
      case "yearly":
        return `Year ${selectedYear}`;
      case "custom":
        return activeCustomRange 
          ? `${formatDateDisplay(activeCustomRange.start)} – ${formatDateDisplay(activeCustomRange.end)}`
          : "Custom Range";
      default:
        return "All Time";
    }
  };

  // Filter transactions based on pie chart filter
  const filteredTransactions = useMemo(() => {
    if (pieChartFilter === "all") return transactions;
    
    const now = new Date();
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      
      if (pieChartFilter === "daily") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return transactionDate >= today && transactionDate < tomorrow;
      } else if (pieChartFilter === "weekly") {
        const currentDay = now.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 7);
        
        return transactionDate >= monday && transactionDate < sunday;
      } else if (pieChartFilter === "monthly") {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return transactionDate >= firstDay && transactionDate <= lastDay;
      } else if (pieChartFilter === "yearly") {
        return transactionDate.getFullYear() === selectedYear;
      } else if (pieChartFilter === "custom" && activeCustomRange) {
        const start = new Date(activeCustomRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(activeCustomRange.end);
        end.setHours(23, 59, 59, 999);
        return transactionDate >= start && transactionDate <= end;
      }
      return true;
    });
  }, [transactions, pieChartFilter, selectedYear, activeCustomRange]);

  // Calculate totals from filtered transactions
  const filteredTotals = useMemo(() => {
    const totals = {
      income: 0,
      expenses: 0,
      investments: 0,
      balance: 0
    };
    
    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        totals.income += t.amount;
      } else if (t.type === 'expense') {
        totals.expenses += t.amount;
      } else if (t.type === 'investment') {
        totals.investments += t.amount;
      }
    });
    
    totals.balance = totals.income - totals.expenses - totals.investments;
    return totals;
  }, [filteredTransactions]);

  // Calculate breakdown from filtered transactions
  const calculateBreakdown = (type) => {
    const filtered = filteredTransactions.filter(t => t.type === type);
    const categoryTotals = {};
    
    filtered.forEach(t => {
      const category = t.category || "Other";
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
    });
    
    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        name: category,
        value: amount,
        percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Calculate filtered budget growth data
  const filteredBudgetGrowth = useMemo(() => {
    if (pieChartFilter === "all" || !budgetGrowth) return budgetGrowth;
    
    // Calculate cumulative balance from filtered transactions
    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    
    const dataByDate = {};
    let cumulative = 0;
    
    sortedTransactions.forEach(t => {
      const dateKey = t.date;
      const amount = t.type === 'income' ? t.amount : -t.amount;
      cumulative += amount;
      
      dataByDate[dateKey] = {
        date: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulative: cumulative
      };
    });
    
    const data = Object.values(dataByDate);
    
    return {
      data,
      total_income: filteredTotals.income,
      total_expenses: filteredTotals.expenses,
      net_savings: filteredTotals.balance
    };
  }, [filteredTransactions, filteredTotals, pieChartFilter, budgetGrowth]);

  const expenseData = useMemo(() => calculateBreakdown("expense"), [filteredTransactions]);
  const incomeData = useMemo(() => calculateBreakdown("income"), [filteredTransactions]);

  // Apply custom date range
  const handleApplyCustomRange = useCallback(() => {
    setFilterError("");
    
    // Validate dates
    if (!startDate || !endDate) {
      setFilterError("Please select both start and end dates");
      toast.error("Please select both start and end dates");
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setFilterError("Start date must be before end date");
      toast.error("Start date must be before end date");
      return;
    }
    
    // Show loading state
    setIsFiltering(true);
    
    // Simulate brief loading for UX feedback
    setTimeout(() => {
      setActiveCustomRange({ start: startDate, end: endDate });
      setPieChartFilter("custom");
      setIsFiltering(false);
      toast.success(`Showing data from ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`);
    }, 300);
  }, [startDate, endDate]);

  // Clear custom range
  const handleClearCustomRange = () => {
    setActiveCustomRange(null);
    setStartDate("");
    setEndDate("");
    setPieChartFilter("all");
    setFilterError("");
    toast.info("Filter cleared - showing all time data");
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    if (filter !== "custom") {
      setActiveCustomRange(null);
      setFilterError("");
    }
    setPieChartFilter(filter);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <p className="font-semibold text-gray-900 dark:text-white">{payload[0].name}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">{formatAmount(payload[0].value)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{payload[0].payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const GrowthTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{payload[0].payload.date}</p>
          <p className="text-sm text-green-600 dark:text-green-400">Balance: {formatAmount(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Only show label if percentage is significant enough
    if (percent < 0.05) return null;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-medium pointer-events-none"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Handle pie slice click
  const handleExpensePieClick = (data, index) => {
    setActiveExpenseIndex(activeExpenseIndex === index ? null : index);
    if (!showExpenseLegend) {
      setShowExpenseLegend(true);
    }
  };

  const handleIncomePieClick = (data, index) => {
    setActiveIncomeIndex(activeIncomeIndex === index ? null : index);
    if (!showIncomeLegend) {
      setShowIncomeLegend(true);
    }
  };

  // Handle legend item click
  const handleExpenseLegendClick = (index) => {
    setActiveExpenseIndex(activeExpenseIndex === index ? null : index);
  };

  const handleIncomeLegendClick = (index) => {
    setActiveIncomeIndex(activeIncomeIndex === index ? null : index);
  };

  // Handle pie slice hover
  const handleExpensePieEnter = (_, index) => {
    setActiveExpenseIndex(index);
  };

  const handleIncomePieEnter = (_, index) => {
    setActiveIncomeIndex(index);
  };

  // No Data Message Component
  const NoDataMessage = ({ type }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
      <p className="text-lg font-medium text-slate-600 dark:text-slate-300">No {type} data for selected range</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Try selecting a different time period or add transactions
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Time Filter for Analytics */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Budget Analytics
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Filter all analytics by time period
                </p>
              </div>
              
              {/* Active Filter Display */}
              {pieChartFilter !== "all" && (
                <Badge variant="secondary" className="text-sm py-1.5 px-3 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  {getFilterLabel()}
                  {pieChartFilter === "custom" && (
                    <button 
                      onClick={handleClearCustomRange}
                      className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </Badge>
              )}
            </div>
            
            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={pieChartFilter === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("daily")}
              >
                Today
              </Button>
              <Button
                variant={pieChartFilter === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("weekly")}
              >
                This Week
              </Button>
              <Button
                variant={pieChartFilter === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("monthly")}
              >
                This Month
              </Button>
              <Button
                variant={pieChartFilter === "yearly" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("yearly")}
              >
                This Year
              </Button>
              <Button
                variant={pieChartFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("all")}
              >
                All Time
              </Button>
            </div>

            {/* Year Selector */}
            {pieChartFilter === "yearly" && (
              <div className="flex items-center gap-4">
                <Label htmlFor="year-select">Select Year:</Label>
                <select
                  id="year-select"
                  className="px-3 py-2 border rounded-md"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Date Range */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Custom Date Range</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1 w-full sm:w-auto">
                  <Label htmlFor="start-date" className="text-xs text-slate-500">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setFilterError("");
                    }}
                    className={filterError && !startDate ? "border-red-500" : ""}
                  />
                </div>
                <div className="flex-1 w-full sm:w-auto">
                  <Label htmlFor="end-date" className="text-xs text-slate-500">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setFilterError("");
                    }}
                    className={filterError && !endDate ? "border-red-500" : ""}
                  />
                </div>
                <Button
                  onClick={handleApplyCustomRange}
                  disabled={isFiltering}
                  variant={pieChartFilter === "custom" ? "default" : "outline"}
                  className="min-w-[150px]"
                >
                  {isFiltering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply Custom Range"
                  )}
                </Button>
              </div>
              {filterError && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {filterError}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtered Summary KPIs */}
      {pieChartFilter !== "all" && (
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Summary for: {getFilterLabel()}
              </p>
              <Badge variant="outline" className="text-xs">
                {filteredTransactions.length} transactions
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Income</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatAmount(filteredTotals.income)}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Expenses</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatAmount(filteredTotals.expenses)}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Investments</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatAmount(filteredTotals.investments)}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Net Balance</p>
                <p className={`text-lg font-bold ${filteredTotals.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatAmount(filteredTotals.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Chart */}
      {filteredBudgetGrowth && filteredBudgetGrowth.data && filteredBudgetGrowth.data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">📈 Budget Growth Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track how your balance grows {pieChartFilter !== "all" && `(${getFilterLabel()})`}
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-lg font-bold text-green-600">{formatAmount(filteredBudgetGrowth.total_income)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-red-600">{formatAmount(filteredBudgetGrowth.total_expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Savings</p>
                <p className={`text-lg font-bold ${filteredBudgetGrowth.net_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(filteredBudgetGrowth.net_savings)}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredBudgetGrowth.data}>
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
      ) : pieChartFilter !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">📈 Budget Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <NoDataMessage type="growth" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-700 dark:text-red-400">💸 Expense Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">
                  What you spend the most on {pieChartFilter !== "all" && `(${getFilterLabel()})`}
                </p>
              </div>
              {expenseData.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowExpenseLegend(!showExpenseLegend);
                    if (showExpenseLegend) setActiveExpenseIndex(null);
                  }}
                >
                  {showExpenseLegend ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showExpenseLegend ? "Hide" : "Show"} Details
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {expenseData.length > 0 ? (
              <>
                {/* Total Display */}
                <div className="text-center mb-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatAmount(filteredTotals.expenses)}
                  </p>
                </div>
                
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
                      activeIndex={activeExpenseIndex}
                      activeShape={(props) => renderActiveShape(props, COLORS.expenses)}
                      onMouseEnter={handleExpensePieEnter}
                      onMouseLeave={() => setActiveExpenseIndex(null)}
                      onClick={handleExpensePieClick}
                      className="cursor-pointer"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS.expenses[index % COLORS.expenses.length]}
                          opacity={activeExpenseIndex === null || activeExpenseIndex === index ? 1 : 0.3}
                          className="transition-opacity duration-200 ease-out"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Interactive Details List with Amount & Percentage */}
                {showExpenseLegend && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Category Details</p>
                      <p className="text-xs text-muted-foreground">Click to highlight</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {expenseData.map((entry, index) => (
                        <button
                          key={index}
                          onClick={() => handleExpenseLegendClick(index)}
                          onMouseEnter={() => setActiveExpenseIndex(index)}
                          onMouseLeave={() => setActiveExpenseIndex(null)}
                          data-testid={`expense-category-${entry.name.toLowerCase().replace(/\s+/g, '-')}`}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ease-out ${
                            activeExpenseIndex === index 
                              ? 'bg-red-100 dark:bg-red-900/40 ring-2 ring-red-400 dark:ring-red-600 scale-[1.02]' 
                              : activeExpenseIndex !== null 
                                ? 'bg-gray-50 dark:bg-gray-800/50 opacity-50' 
                                : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                        >
                          <div 
                            className="w-4 h-4 rounded-sm flex-shrink-0 transition-transform duration-200"
                            style={{ 
                              backgroundColor: COLORS.expenses[index % COLORS.expenses.length],
                              transform: activeExpenseIndex === index ? 'scale(1.2)' : 'scale(1)'
                            }}
                          />
                          <span className="flex-1 font-medium text-gray-900 dark:text-gray-100 truncate">
                            {entry.name}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold text-red-600 dark:text-red-400">
                              {formatAmount(entry.value)}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs min-w-[50px] justify-center transition-colors duration-200 ${
                                activeExpenseIndex === index 
                                  ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' 
                                  : ''
                              }`}
                            >
                              {entry.percentage}%
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Verification Total */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-700 dark:text-red-300">{formatAmount(filteredTotals.expenses)}</span>
                        <Badge variant="outline" className="text-xs">100%</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <NoDataMessage type="expense" />
            )}
          </CardContent>
        </Card>

        {/* Income Sources */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-green-700 dark:text-green-400">💰 Income Sources</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your biggest sources of income {pieChartFilter !== "all" && `(${getFilterLabel()})`}
                </p>
              </div>
              {incomeData.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowIncomeLegend(!showIncomeLegend);
                    if (showIncomeLegend) setActiveIncomeIndex(null);
                  }}
                >
                  {showIncomeLegend ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showIncomeLegend ? "Hide" : "Show"} Details
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {incomeData.length > 0 ? (
              <>
                {/* Total Display */}
                <div className="text-center mb-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total Income</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatAmount(filteredTotals.income)}
                  </p>
                </div>
                
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
                      activeIndex={activeIncomeIndex}
                      activeShape={(props) => renderActiveShape(props, COLORS.income)}
                      onMouseEnter={handleIncomePieEnter}
                      onMouseLeave={() => setActiveIncomeIndex(null)}
                      onClick={handleIncomePieClick}
                      className="cursor-pointer"
                    >
                      {incomeData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS.income[index % COLORS.income.length]}
                          opacity={activeIncomeIndex === null || activeIncomeIndex === index ? 1 : 0.3}
                          className="transition-opacity duration-200 ease-out"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Interactive Details List with Amount & Percentage */}
                {showIncomeLegend && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Source Details</p>
                      <p className="text-xs text-muted-foreground">Click to highlight</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {incomeData.map((entry, index) => (
                        <button
                          key={index}
                          onClick={() => handleIncomeLegendClick(index)}
                          onMouseEnter={() => setActiveIncomeIndex(index)}
                          onMouseLeave={() => setActiveIncomeIndex(null)}
                          data-testid={`income-category-${entry.name.toLowerCase().replace(/\s+/g, '-')}`}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ease-out ${
                            activeIncomeIndex === index 
                              ? 'bg-green-100 dark:bg-green-900/40 ring-2 ring-green-400 dark:ring-green-600 scale-[1.02]' 
                              : activeIncomeIndex !== null 
                                ? 'bg-gray-50 dark:bg-gray-800/50 opacity-50' 
                                : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                        >
                          <div 
                            className="w-4 h-4 rounded-sm flex-shrink-0 transition-transform duration-200"
                            style={{ 
                              backgroundColor: COLORS.income[index % COLORS.income.length],
                              transform: activeIncomeIndex === index ? 'scale(1.2)' : 'scale(1)'
                            }}
                          />
                          <span className="flex-1 font-medium text-gray-900 dark:text-gray-100 truncate">
                            {entry.name}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {formatAmount(entry.value)}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs min-w-[50px] justify-center transition-colors duration-200 ${
                                activeIncomeIndex === index 
                                  ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' 
                                  : ''
                              }`}
                            >
                              {entry.percentage}%
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Verification Total */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700 dark:text-green-300">{formatAmount(filteredTotals.income)}</span>
                        <Badge variant="outline" className="text-xs">100%</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <NoDataMessage type="income" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Trends - Pass filtered transactions */}
      <CategoryTrends transactions={filteredTransactions} />
    </div>
  );
};
