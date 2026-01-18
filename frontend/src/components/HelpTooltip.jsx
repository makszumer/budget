import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Help definitions for financial terms and UI elements
 */
const HELP_DEFINITIONS = {
  // Financial Terms
  financial_health: {
    title: 'Financial Health',
    description: 'A snapshot of your overall financial well-being based on your savings rate, cash flow, and budget status. Think of it as a quick health check for your money.',
  },
  savings_rate: {
    title: 'Savings Rate',
    description: 'The percentage of your income that you save. Calculated as (Income - Expenses) ÷ Income × 100. A healthy savings rate is typically 20% or higher.',
  },
  net_cash_flow: {
    title: 'Net Cash Flow',
    description: 'The difference between money coming in (income) and money going out (expenses) over a period. Positive = you\'re saving money. Negative = you\'re spending more than you earn.',
  },
  budget_status: {
    title: 'Budget Status',
    description: 'Shows if you\'re spending within your means. "Under budget" means spending less than 70% of income. "On track" is 70-110%. "Over budget" means spending more than 110% of income.',
  },
  investment_performance: {
    title: 'Investment Performance',
    description: 'Shows how your investments are doing. ROI (Return on Investment) is the percentage gain or loss on your invested money.',
  },
  roi: {
    title: 'ROI (Return on Investment)',
    description: 'A measure of how much money you\'ve gained or lost on an investment, expressed as a percentage. ROI = (Current Value - Amount Invested) ÷ Amount Invested × 100.',
  },
  net_invested: {
    title: 'Net Invested',
    description: 'The total amount of money you\'ve put into investments, not including any gains or losses.',
  },
  current_value: {
    title: 'Current Value',
    description: 'What your investments are worth right now. This includes your original investment plus any gains (or minus any losses).',
  },
  total_gain_loss: {
    title: 'Total Gain/Loss',
    description: 'The difference between your current investment value and what you originally invested. Positive = profit, Negative = loss.',
  },
  compound_interest: {
    title: 'Compound Interest',
    description: 'Interest calculated on both the initial amount AND previously earned interest. It\'s "interest on interest" - this is how investments can grow significantly over time.',
  },
  principal: {
    title: 'Principal',
    description: 'The original amount of money you invest or save, before any interest or returns are added.',
  },
  standing_order: {
    title: 'Standing Order',
    description: 'A recurring transaction that happens automatically at regular intervals (e.g., monthly rent, weekly savings). Set it once and it repeats automatically.',
  },
  budget_envelope: {
    title: 'Budget Envelope',
    description: 'A method to organize your budget by putting money into virtual "envelopes" for specific purposes (e.g., vacation fund, emergency savings). Helps track progress toward goals.',
  },
  // Analytics & Charts
  expense_breakdown: {
    title: 'Expense Breakdown',
    description: 'A visual chart showing where your money goes, split by category. Helps identify your biggest spending areas.',
  },
  income_breakdown: {
    title: 'Income Breakdown',
    description: 'A chart showing your income sources and how much comes from each. Useful for seeing income diversity.',
  },
  trend_indicator: {
    title: 'Trend Indicator',
    description: 'An arrow showing if a value is going up ↑ or down ↓ compared to the previous period. Green up = good, Red down = needs attention (for most metrics).',
  },
  // Smart Alerts
  smart_alerts: {
    title: 'Smart Alerts',
    description: 'Helpful notifications that keep you informed about your finances - like when you\'re close to a budget limit or have an upcoming payment.',
  },
  // Comparison
  what_changed: {
    title: 'What Changed?',
    description: 'A comparison showing the key differences between this period and the last. Quickly see what\'s improved or needs attention.',
  },
};

/**
 * HelpTooltip - Shows contextual help for financial terms
 * Always available for FREE and Premium users
 * 
 * @param {string} term - Key from HELP_DEFINITIONS
 * @param {string} size - 'sm' | 'md' (default: 'md')
 * @param {string} className - Additional CSS classes
 */
export const HelpTooltip = ({ term, size = 'md', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const definition = HELP_DEFINITIONS[term];

  if (!definition) {
    console.warn(`HelpTooltip: Unknown term "${term}"`);
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full ${className}`}
          aria-label={`Help: ${definition.title}`}
          data-testid={`help-tooltip-${term}`}
        >
          <HelpCircle className={iconSize} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
        sideOffset={5}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              {definition.title}
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {definition.description}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * InlineHelp - For inline explanations within text
 */
export const InlineHelp = ({ term, children }) => {
  const definition = HELP_DEFINITIONS[term];
  
  if (!definition) {
    return children;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <HelpTooltip term={term} size="sm" />
    </span>
  );
};

// Export definitions for use elsewhere
export { HELP_DEFINITIONS };
