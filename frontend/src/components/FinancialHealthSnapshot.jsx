import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccess } from '@/context/AccessContext';
import { HelpTooltip } from '@/components/HelpTooltip';
import { 
  TrendingUp, TrendingDown, Minus, PiggyBank, 
  ArrowUpRight, ArrowDownRight, Activity, Lightbulb,
  Lock, Crown
} from 'lucide-react';

/**
 * Financial Health Snapshot
 * FREE: Savings rate, Net cash flow (30 days), Budget status
 * PREMIUM: Trend indicators, Investment performance, Smart suggestions
 */
export const FinancialHealthSnapshot = ({ 
  transactions = [], 
  summary = {},
  investmentGrowth = null,
  analytics = null,
  privacyMode = false,
  onUpgradeClick
}) => {
  const { hasPremiumAccess } = useAccess();

  // Calculate financial health metrics
  const healthMetrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Filter transactions for last 30 days
    const last30DaysTx = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= thirtyDaysAgo && txDate <= now && t.type !== 'investment';
    });

    // Filter for previous 30 days (for trends)
    const prev30DaysTx = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= sixtyDaysAgo && txDate < thirtyDaysAgo && t.type !== 'investment';
    });

    // Calculate last 30 days
    const income30d = last30DaysTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses30d = last30DaysTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netCashFlow = income30d - expenses30d;

    // Calculate previous 30 days
    const prevIncome = prev30DaysTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const prevExpenses = prev30DaysTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const prevNetCashFlow = prevIncome - prevExpenses;

    // Savings rate (income - expenses) / income * 100
    const savingsRate = income30d > 0 ? ((income30d - expenses30d) / income30d) * 100 : 0;
    const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevExpenses) / prevIncome) * 100 : 0;

    // Budget status based on spending pattern
    let budgetStatus = 'on';
    let budgetMessage = 'On track';
    if (expenses30d > income30d * 1.1) {
      budgetStatus = 'over';
      budgetMessage = 'Over budget';
    } else if (expenses30d < income30d * 0.7) {
      budgetStatus = 'under';
      budgetMessage = 'Under budget';
    }

    // Trends (premium)
    const cashFlowTrend = netCashFlow - prevNetCashFlow;
    const savingsRateTrend = savingsRate - prevSavingsRate;

    // Investment performance (premium)
    let investmentROI = 0;
    let investmentChange = 0;
    if (investmentGrowth) {
      const { total_invested = 0, current_value = 0 } = investmentGrowth;
      if (total_invested > 0) {
        investmentROI = ((current_value - total_invested) / total_invested) * 100;
        investmentChange = current_value - total_invested;
      }
    }

    // Generate suggestions (premium)
    const suggestions = [];
    if (savingsRate < 20) {
      suggestions.push('Try to save at least 20% of your income');
    }
    if (expenses30d > prevExpenses * 1.2) {
      suggestions.push('Your spending increased by 20%+ this month');
    }
    if (netCashFlow < 0) {
      suggestions.push('Consider reducing non-essential expenses');
    }
    if (investmentROI < 0) {
      suggestions.push('Your investments are down - stay the course!');
    }
    if (savingsRate > 30) {
      suggestions.push('Great savings rate! Consider investing more');
    }

    return {
      savingsRate,
      netCashFlow,
      budgetStatus,
      budgetMessage,
      income30d,
      expenses30d,
      // Premium metrics
      cashFlowTrend,
      savingsRateTrend,
      investmentROI,
      investmentChange,
      suggestions,
      hasEnoughData: transactions.length >= 3
    };
  }, [transactions, investmentGrowth]);

  const formatCurrency = (amount) => {
    if (privacyMode) return '$***';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value) => {
    if (privacyMode) return '**%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Budget status styling
  const budgetStatusColors = {
    under: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    on: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    over: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' }
  };

  const statusStyle = budgetStatusColors[healthMetrics.budgetStatus];

  if (!healthMetrics.hasEnoughData) {
    return (
      <Card className="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Financial Health
            <HelpTooltip term="financial_health" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Not enough data yet. Add a few transactions to see your financial health snapshot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900" data-testid="financial-health-snapshot">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Financial Health
          <HelpTooltip term="financial_health" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FREE: Core Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {/* Savings Rate */}
          <div className="text-center p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 mb-1">
              <PiggyBank className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Savings Rate</span>
              <HelpTooltip term="savings_rate" size="sm" />
            </div>
            <p className={`text-xl font-bold ${healthMetrics.savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : healthMetrics.savingsRate >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
              {privacyMode ? '**%' : `${healthMetrics.savingsRate.toFixed(0)}%`}
            </p>
            {/* Premium: Trend indicator */}
            {hasPremiumAccess && healthMetrics.savingsRateTrend !== 0 && (
              <div className={`text-xs flex items-center justify-center gap-1 mt-1 ${healthMetrics.savingsRateTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {healthMetrics.savingsRateTrend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {formatPercent(healthMetrics.savingsRateTrend)} vs last month
              </div>
            )}
          </div>

          {/* Net Cash Flow */}
          <div className="text-center p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 mb-1">
              {healthMetrics.netCashFlow >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Net Cash Flow</span>
              <HelpTooltip term="net_cash_flow" size="sm" />
            </div>
            <p className={`text-xl font-bold ${healthMetrics.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(healthMetrics.netCashFlow)}
            </p>
            <p className="text-[10px] text-muted-foreground">Last 30 days</p>
            {/* Premium: Trend indicator */}
            {hasPremiumAccess && (
              <div className={`text-xs flex items-center justify-center gap-1 mt-1 ${healthMetrics.cashFlowTrend > 0 ? 'text-green-600' : healthMetrics.cashFlowTrend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {healthMetrics.cashFlowTrend > 0 ? <ArrowUpRight className="h-3 w-3" /> : healthMetrics.cashFlowTrend < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {formatCurrency(healthMetrics.cashFlowTrend)} vs prev
              </div>
            )}
          </div>

          {/* Budget Status */}
          <div className={`text-center p-3 rounded-lg ${statusStyle.bg} border ${statusStyle.border}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-xs text-muted-foreground">Budget Status</span>
              <HelpTooltip term="budget_status" size="sm" />
            </div>
            <p className={`text-xl font-bold ${statusStyle.text}`}>
              {healthMetrics.budgetMessage}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {privacyMode ? '$*** spent' : `${formatCurrency(healthMetrics.expenses30d)} spent`}
            </p>
          </div>
        </div>

        {/* PREMIUM: Investment Performance */}
        {hasPremiumAccess && investmentGrowth && investmentGrowth.total_invested > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Investment Performance</span>
                <HelpTooltip term="investment_performance" size="sm" />
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${healthMetrics.investmentROI >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercent(healthMetrics.investmentROI)} ROI
                </p>
                <p className={`text-xs ${healthMetrics.investmentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(healthMetrics.investmentChange)} {healthMetrics.investmentChange >= 0 ? 'gain' : 'loss'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PREMIUM: Smart Suggestions */}
        {hasPremiumAccess && healthMetrics.suggestions.length > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Smart Insights</span>
            </div>
            <ul className="space-y-1">
              {healthMetrics.suggestions.slice(0, 2).map((suggestion, i) => (
                <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
