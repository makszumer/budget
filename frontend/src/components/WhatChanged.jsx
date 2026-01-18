import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/context/AccessContext';
import { HelpTooltip } from '@/components/HelpTooltip';
import { 
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
  TrendingUp, TrendingDown, Lock, Crown, CalendarRange,
  DollarSign, ShoppingCart, Briefcase, Plus, X
} from 'lucide-react';

/**
 * WhatChanged - Premium Feature
 * Compare current period to previous period with summary
 */
export const WhatChanged = ({ 
  transactions = [],
  recurringTransactions = [],
  investmentGrowth = null,
  analytics = null,
  dateFilter = 'all',
  onUpgradeClick
}) => {
  const { hasPremiumAccess } = useAccess();
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate comparison data
  const comparison = useMemo(() => {
    const now = new Date();
    let currentStart, currentEnd, prevStart, prevEnd;
    let periodLabel = '';

    // Determine date ranges based on filter
    switch (dateFilter) {
      case 'day':
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        currentEnd = now;
        prevStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
        prevEnd = new Date(currentStart.getTime() - 1);
        periodLabel = 'vs yesterday';
        break;
      case 'week':
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        currentEnd = now;
        prevStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(currentStart.getTime() - 1);
        periodLabel = 'vs last week';
        break;
      case 'month':
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = now;
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(currentStart.getTime() - 1);
        periodLabel = 'vs last month';
        break;
      case 'year':
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = now;
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd = new Date(currentStart.getTime() - 1);
        periodLabel = 'vs last year';
        break;
      default: // 'all' - compare last 30 days to previous 30 days
        currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        currentEnd = now;
        prevStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(currentStart.getTime() - 1);
        periodLabel = 'vs previous 30 days';
    }

    // Filter transactions
    const currentTx = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= currentStart && date <= currentEnd;
    });

    const prevTx = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= prevStart && date <= prevEnd;
    });

    // Calculate totals
    const currentIncome = currentTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const prevIncome = prevTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    const currentExpenses = currentTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const prevExpenses = prevTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const currentInvestments = currentTx.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);
    const prevInvestments = prevTx.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);

    // Find category changes
    const currentByCategory = {};
    const prevByCategory = {};

    currentTx.filter(t => t.type === 'expense').forEach(t => {
      currentByCategory[t.category] = (currentByCategory[t.category] || 0) + t.amount;
    });

    prevTx.filter(t => t.type === 'expense').forEach(t => {
      prevByCategory[t.category] = (prevByCategory[t.category] || 0) + t.amount;
    });

    // Find biggest increase and decrease
    let biggestIncrease = { category: null, amount: 0, change: 0 };
    let biggestDecrease = { category: null, amount: 0, change: 0 };

    const allCategories = new Set([...Object.keys(currentByCategory), ...Object.keys(prevByCategory)]);
    allCategories.forEach(category => {
      const current = currentByCategory[category] || 0;
      const prev = prevByCategory[category] || 0;
      const change = current - prev;

      if (change > biggestIncrease.change) {
        biggestIncrease = { category, amount: current, change };
      }
      if (change < biggestDecrease.change) {
        biggestDecrease = { category, amount: current, change };
      }
    });

    // Standing order changes
    const newStandingOrders = [];
    const removedStandingOrders = [];
    // Note: This would require historical standing order data to track properly
    // For now, we just show current active count

    // Investment value change
    let investmentValueChange = 0;
    if (investmentGrowth) {
      investmentValueChange = investmentGrowth.total_gain || 0;
    }

    return {
      periodLabel,
      income: {
        current: currentIncome,
        prev: prevIncome,
        change: currentIncome - prevIncome,
        percentChange: prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0
      },
      expenses: {
        current: currentExpenses,
        prev: prevExpenses,
        change: currentExpenses - prevExpenses,
        percentChange: prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0
      },
      investments: {
        current: currentInvestments,
        prev: prevInvestments,
        change: currentInvestments - prevInvestments,
        percentChange: prevInvestments > 0 ? ((currentInvestments - prevInvestments) / prevInvestments) * 100 : 0
      },
      biggestIncrease,
      biggestDecrease,
      investmentValueChange,
      hasEnoughData: currentTx.length >= 2 && prevTx.length >= 2
    };
  }, [transactions, investmentGrowth, dateFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const ChangeIndicator = ({ value, isExpense = false }) => {
    // For expenses, down is good (green), up is bad (red)
    const isPositive = isExpense ? value < 0 : value > 0;
    const color = value === 0 ? 'text-gray-500' : isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    
    return (
      <span className={`flex items-center gap-1 ${color}`}>
        {value > 0 ? <ArrowUpRight className="h-3 w-3" /> : value < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {formatCurrency(Math.abs(value))}
      </span>
    );
  };

  // FREE users see locked button
  if (!hasPremiumAccess) {
    return (
      <button
        onClick={onUpgradeClick}
        className="w-full mb-4 p-3 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 hover:shadow-md transition-shadow"
        data-testid="what-changed-locked"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-amber-500" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">What Changed?</span>
                <Lock className="h-3 w-3 text-amber-500" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Compare your finances to the previous period
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <Crown className="h-3 w-3" />
            Premium
          </div>
        </div>
      </button>
    );
  }

  // Premium - Collapsed button
  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsExpanded(true)}
        className="w-full mb-4 justify-between"
        data-testid="what-changed-btn"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-500" />
          <span>What changed {comparison.periodLabel}?</span>
          <HelpTooltip term="what_changed" size="sm" />
        </div>
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  // Premium - Expanded view
  return (
    <Card className="mb-4" data-testid="what-changed-expanded">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            What Changed?
            <span className="text-sm font-normal text-muted-foreground">{comparison.periodLabel}</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!comparison.hasEnoughData ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Not enough data to compare periods. Keep adding transactions!
          </p>
        ) : (
          <div className="space-y-4">
            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Income Change */}
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Income</span>
                </div>
                <ChangeIndicator value={comparison.income.change} />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatPercent(comparison.income.percentChange)}
                </p>
              </div>

              {/* Expenses Change */}
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-1 mb-1">
                  <ShoppingCart className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-muted-foreground">Expenses</span>
                </div>
                <ChangeIndicator value={comparison.expenses.change} isExpense />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatPercent(comparison.expenses.percentChange)}
                </p>
              </div>

              {/* Investments Change */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-1 mb-1">
                  <Briefcase className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Invested</span>
                </div>
                <ChangeIndicator value={comparison.investments.change} />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatPercent(comparison.investments.percentChange)}
                </p>
              </div>
            </div>

            {/* Category Changes */}
            <div className="space-y-2">
              {comparison.biggestIncrease.category && comparison.biggestIncrease.change > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/20 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Biggest spending increase: <strong>{comparison.biggestIncrease.category}</strong>
                    </span>
                  </div>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    +{formatCurrency(comparison.biggestIncrease.change)}
                  </span>
                </div>
              )}

              {comparison.biggestDecrease.category && comparison.biggestDecrease.change < 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-950/20 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Biggest spending decrease: <strong>{comparison.biggestDecrease.category}</strong>
                    </span>
                  </div>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(comparison.biggestDecrease.change)}
                  </span>
                </div>
              )}

              {/* Investment Value Change */}
              {comparison.investmentValueChange !== 0 && (
                <div className={`flex items-center justify-between p-2 rounded text-sm ${comparison.investmentValueChange >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-rose-50 dark:bg-rose-950/20'}`}>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Investment portfolio value
                    </span>
                  </div>
                  <span className={`font-medium ${comparison.investmentValueChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {comparison.investmentValueChange >= 0 ? '+' : ''}{formatCurrency(comparison.investmentValueChange)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
