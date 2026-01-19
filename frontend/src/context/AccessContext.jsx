import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

// Define feature access levels
export const FEATURES = {
  // FREE features (always available)
  BUDGET_MANAGER: 'budget_manager',
  STANDING_ORDERS: 'standing_orders',
  WHY_INVESTING: 'why_investing',
  COMPOUND_CALCULATOR: 'compound_calculator',
  BASIC_TRANSACTIONS: 'basic_transactions',
  BUDGET_ENVELOPES: 'budget_envelopes',
  CUSTOM_CATEGORIES: 'custom_categories',
  FINANCIAL_HEALTH: 'financial_health', // FREE with Premium enhancements
  HELP_TOOLTIPS: 'help_tooltips', // Always FREE
  
  // PREMIUM features (require subscription, trial, or admin)
  AI_ASSISTANT: 'ai_assistant',
  VOICE_INPUT: 'voice_input',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  CURRENCY_CONVERSION: 'currency_conversion',
  DAILY_QUOTES: 'daily_quotes',
  PRIORITY_SUPPORT: 'priority_support',
  INVESTMENT_PORTFOLIO: 'investment_portfolio',
  WHAT_CHANGED: 'what_changed',
};

// Features available in free tier
const FREE_FEATURES = new Set([
  FEATURES.BUDGET_MANAGER,
  FEATURES.STANDING_ORDERS,
  FEATURES.WHY_INVESTING,
  FEATURES.COMPOUND_CALCULATOR,
  FEATURES.BASIC_TRANSACTIONS,
  FEATURES.BUDGET_ENVELOPES,
  FEATURES.CUSTOM_CATEGORIES,
  FEATURES.FINANCIAL_HEALTH,
  FEATURES.HELP_TOOLTIPS,
]);

// Admin email whitelist
const ADMIN_EMAILS = ['admin@financehub.com'];

const AccessContext = createContext(null);

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
};

export const AccessProvider = ({ children }) => {
  const { user, isAuthenticated, isPremium, isOnTrial } = useAuth();
  
  const accessState = useMemo(() => {
    // Determine user role
    const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
    const isGuest = !isAuthenticated || user?.role === 'guest';
    const hasPremiumAccess = isAdmin || isPremium || isOnTrial;
    
    // Check if a specific feature is accessible
    const canAccess = (feature) => {
      // Admins have full access
      if (isAdmin) return true;
      
      // Premium users and trial users have full access
      if (isPremium || isOnTrial) return true;
      
      // Free and guest users can only access free features
      return FREE_FEATURES.has(feature);
    };
    
    // Get list of locked features for current user
    const getLockedFeatures = () => {
      if (hasPremiumAccess) return [];
      return Object.values(FEATURES).filter(f => !FREE_FEATURES.has(f));
    };
    
    // Get user's subscription tier label
    const getTierLabel = () => {
      if (isAdmin) return 'Admin';
      if (isOnTrial) return 'Trial';
      if (isPremium) return 'Premium';
      if (isGuest) return 'Guest';
      return 'Free';
    };
    
    return {
      // User state
      isAdmin,
      isGuest,
      isPremium,
      isOnTrial,
      hasPremiumAccess,
      isAuthenticated,
      tier: getTierLabel(),
      
      // Feature access
      canAccess,
      getLockedFeatures,
      
      // Quick checks for common features
      canUseAI: hasPremiumAccess,
      canUseVoice: hasPremiumAccess,
      canUseCurrencyConversion: hasPremiumAccess,
      canExportData: hasPremiumAccess,
      canSeeQuotes: hasPremiumAccess,
      canUseInvestmentPortfolio: hasPremiumAccess,
    };
  }, [user, isAuthenticated, isPremium, isOnTrial]);
  
  return (
    <AccessContext.Provider value={accessState}>
      {children}
    </AccessContext.Provider>
  );
};

// Feature descriptions for locked feature modals
export const FEATURE_INFO = {
  [FEATURES.AI_ASSISTANT]: {
    name: 'AI Financial Assistant',
    description: 'Get personalized financial advice and insights powered by AI. Ask questions about your spending, get budget recommendations, and more.',
    icon: '🤖',
  },
  [FEATURES.VOICE_INPUT]: {
    name: 'Voice Input',
    description: 'Add transactions hands-free using voice commands. Simply speak your expenses or income and let AI do the rest.',
    icon: '🎤',
  },
  [FEATURES.ADVANCED_ANALYTICS]: {
    name: 'Advanced Analytics',
    description: 'Deep dive into your financial data with advanced charts, trends, and insights. Track your progress over time.',
    icon: '📊',
  },
  [FEATURES.CURRENCY_CONVERSION]: {
    name: 'Multi-Currency Support',
    description: 'Track expenses in any currency with automatic conversion. Perfect for travel and international transactions.',
    icon: '💱',
  },
  [FEATURES.DAILY_QUOTES]: {
    name: 'Daily Financial Wisdom',
    description: 'Get inspired every day with quotes from legendary investors and financial experts.',
    icon: '💡',
  },
  [FEATURES.PRIORITY_SUPPORT]: {
    name: 'Priority Support',
    description: 'Get faster responses and dedicated support for any issues or questions.',
    icon: '⚡',
  },
  [FEATURES.INVESTMENT_PORTFOLIO]: {
    name: 'Investment Portfolio & Analytics',
    description: 'Track your investment portfolio with advanced analytics including ROI tracking, growth charts, and allocation breakdown.',
    icon: '📈',
  },
  [FEATURES.WHAT_CHANGED]: {
    name: 'Period Comparison',
    description: 'Quickly see what changed compared to your previous period - biggest increases, decreases, and investment changes.',
    icon: '📅',
  },
};
