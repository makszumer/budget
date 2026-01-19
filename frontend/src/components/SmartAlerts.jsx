import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAccess } from '@/context/AccessContext';
import { HelpTooltip } from '@/components/HelpTooltip';
import { 
  Bell, BellOff, AlertTriangle, Clock, TrendingUp, 
  Wallet, CalendarClock, Lock, Crown, X, Settings
} from 'lucide-react';

/**
 * Smart Alerts - Premium Feature
 * Non-intrusive, opt-in alerts for budget usage, standing orders, spending patterns
 */
export const SmartAlerts = ({ 
  transactions = [],
  recurringTransactions = [],
  budgetEnvelopes = [],
  analytics = null,
  onUpgradeClick,
  onDismiss
}) => {
  const { hasPremiumAccess } = useAccess();
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    return localStorage.getItem('smart_alerts_enabled') === 'true';
  });
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    const saved = localStorage.getItem('dismissed_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSettings, setShowSettings] = useState(false);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('smart_alerts_enabled', alertsEnabled.toString());
  }, [alertsEnabled]);

  useEffect(() => {
    localStorage.setItem('dismissed_alerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  // Generate alerts based on user data
  const alerts = useMemo(() => {
    if (!alertsEnabled && hasPremiumAccess) return [];
    
    const generatedAlerts = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Budget envelope alerts (80% threshold)
    if (budgetEnvelopes && budgetEnvelopes.length > 0) {
      budgetEnvelopes.forEach(envelope => {
        if (envelope.target_amount > 0) {
          const progress = (envelope.current_amount / envelope.target_amount) * 100;
          if (progress >= 80 && progress < 100) {
            generatedAlerts.push({
              id: `envelope-${envelope.id}-80`,
              type: 'budget',
              icon: Wallet,
              color: 'amber',
              title: `${envelope.name} is at ${progress.toFixed(0)}%`,
              message: `You've used most of your ${envelope.name} budget.`,
              priority: 'medium'
            });
          }
        }
      });
    }

    // 2. Standing order due tomorrow
    if (recurringTransactions && recurringTransactions.length > 0) {
      recurringTransactions.forEach(rt => {
        if (rt.is_active) {
          const nextDue = new Date(rt.next_execution_date);
          if (nextDue.toDateString() === tomorrow.toDateString()) {
            generatedAlerts.push({
              id: `recurring-${rt.id}-due`,
              type: 'reminder',
              icon: CalendarClock,
              color: 'blue',
              title: 'Standing order due tomorrow',
              message: `"${rt.description}" (${rt.type === 'expense' ? '-' : '+'}$${rt.amount}) will be processed.`,
              priority: 'low'
            });
          }
        }
      });
    }

    // 3. Spending pattern alert (20%+ increase vs previous month)
    if (transactions.length > 0) {
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      const currentMonthExpenses = transactions
        .filter(t => new Date(t.date) >= thirtyDaysAgo && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const prevMonthExpenses = transactions
        .filter(t => {
          const date = new Date(t.date);
          return date >= sixtyDaysAgo && date < thirtyDaysAgo && t.type === 'expense';
        })
        .reduce((sum, t) => sum + t.amount, 0);

      if (prevMonthExpenses > 0 && currentMonthExpenses > prevMonthExpenses * 1.2) {
        const increase = ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses * 100).toFixed(0);
        generatedAlerts.push({
          id: 'spending-increase',
          type: 'warning',
          icon: TrendingUp,
          color: 'orange',
          title: 'Spending increased this month',
          message: `Your spending is ${increase}% higher than last month.`,
          priority: 'medium'
        });
      }
    }

    // Filter out dismissed alerts
    return generatedAlerts.filter(alert => !dismissedAlerts.includes(alert.id));
  }, [transactions, recurringTransactions, budgetEnvelopes, alertsEnabled, dismissedAlerts, hasPremiumAccess]);

  const dismissAlert = (alertId) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const clearDismissed = () => {
    setDismissedAlerts([]);
    localStorage.removeItem('dismissed_alerts');
  };

  const colorClasses = {
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-amber-500',
      text: 'text-amber-800 dark:text-amber-200'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-500',
      text: 'text-blue-800 dark:text-blue-200'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800',
      icon: 'text-orange-500',
      text: 'text-orange-800 dark:text-orange-200'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-500',
      text: 'text-red-800 dark:text-red-200'
    }
  };

  // FREE users see SUBTLE locked preview - not blocking, not aggressive
  if (!hasPremiumAccess) {
    return (
      <Card className="mb-6 opacity-60" data-testid="smart-alerts-locked">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Bell className="h-5 w-5" />
              Smart Alerts
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-medium rounded">
                <Lock className="h-2.5 w-2.5" />
                Premium
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <button 
            onClick={onUpgradeClick}
            className="w-full text-left hover:opacity-80 transition-opacity"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Budget alerts, payment reminders & spending insights
            </p>
          </button>
        </CardContent>
      </Card>
    );
  }

  // Premium user - show alerts
  return (
    <Card className="mb-6" data-testid="smart-alerts">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Smart Alerts
            <HelpTooltip term="smart_alerts" />
          </CardTitle>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {alertsEnabled ? 'On' : 'Off'}
              </span>
              <Switch
                checked={alertsEnabled}
                onCheckedChange={setAlertsEnabled}
                data-testid="alerts-toggle"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showSettings && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Alert Settings</p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearDismissed}
              className="text-xs"
            >
              Reset dismissed alerts
            </Button>
          </div>
        )}

        {!alertsEnabled ? (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <BellOff className="h-4 w-4" />
            <span className="text-sm">Alerts are disabled</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All caught up! No alerts right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => {
              const colors = colorClasses[alert.color] || colorClasses.blue;
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg} border ${colors.border}`}
                  data-testid={`alert-${alert.id}`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${colors.icon}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${colors.text}`}>{alert.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
