import { useState } from "react";
import { ChevronDown, ChevronRight, LayoutDashboard, BookOpen, Calculator, Repeat, Shield, Wallet, Sparkles, Tag, Moon, Sun, Monitor, Crown, Lock, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export const Sidebar = ({ currentPage, onNavigate }) => {
  const [investingOpen, setInvestingOpen] = useState(false);
  const { user, isPremium, isAdmin, isGuest } = useAuth();
  const { theme, isDark, toggleTheme, setThemeMode } = useTheme();

  const MenuItem = ({ icon: Icon, label, page, active, isPremiumFeature = false }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
        active
          ? "bg-blue-600 text-white shadow-md"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
      data-testid={`menu-${page}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <span className="font-medium">{label}</span>
      </div>
      {isPremiumFeature && !isPremium && !isAdmin && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded">
          <Crown className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  );

  const SubMenuItem = ({ label, page, active }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`w-full flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg text-sm transition-all ${
        active
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
      data-testid={`menu-${page}`}
    >
      <span>{label}</span>
    </button>
  );

  // Determine what button to show (Premium/Admin badge or Upgrade)
  const renderPremiumSection = () => {
    if (isAdmin) {
      return (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <Shield className="h-5 w-5" />
          <span className="font-medium">Admin Access</span>
        </div>
      );
    }
    
    if (isPremium) {
      return (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white">
          <Crown className="h-5 w-5" />
          <span className="font-medium">Premium Member</span>
        </div>
      );
    }
    
    return (
      <button
        onClick={() => onNavigate('pricing')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 shadow-md ${
          currentPage === 'pricing' ? 'ring-2 ring-amber-300' : ''
        }`}
        data-testid="upgrade-premium-btn"
      >
        <Crown className="h-5 w-5" />
        <span className="font-medium">Upgrade to Premium</span>
      </button>
    );
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen overflow-y-auto p-4 flex-shrink-0">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1 rounded-lg bg-white dark:bg-gray-100 shadow-sm">
            <img src="/vaulton-logo.png" alt="Vaulton" className="h-10 w-auto object-contain" />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isGuest ? 'Guest Mode' : `Welcome, ${user?.username || 'User'}`}
        </p>
      </div>

      <nav className="space-y-2">
        {/* Dashboard */}
        <MenuItem
          icon={LayoutDashboard}
          label="Dashboard"
          page="dashboard"
          active={currentPage === "dashboard"}
        />

        {/* Admin Dashboard (only for admin users) */}
        {isAdmin && (
          <MenuItem
            icon={Shield}
            label="Admin Panel"
            page="admin"
            active={currentPage === "admin"}
          />
        )}

        {/* Standing Orders */}
        <MenuItem
          icon={Repeat}
          label="Standing Orders"
          page="recurring"
          active={currentPage === "recurring"}
        />

        {/* Budget Envelopes */}
        <MenuItem
          icon={Wallet}
          label="Budget Envelopes"
          page="budget-envelopes"
          active={currentPage === "budget-envelopes"}
        />

        {/* Custom Categories */}
        <MenuItem
          icon={Tag}
          label="Custom Categories"
          page="custom-categories"
          active={currentPage === "custom-categories"}
        />

        {/* AI Financial Assistant - Premium Feature */}
        <MenuItem
          icon={MessageSquare}
          label="AI Assistant"
          page="ai-assistant"
          active={currentPage === "ai-assistant"}
          isPremiumFeature={true}
        />

        {/* Why Investing */}
        <div className="space-y-1">
          <button
            onClick={() => setInvestingOpen(!investingOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">Why Investing</span>
            </div>
            {investingOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {investingOpen && (
            <div className="space-y-1 mt-1">
              <SubMenuItem
                label="Overview"
                page="investing-overview"
                active={currentPage === "investing-overview"}
              />
              <SubMenuItem
                label="Crypto"
                page="investing-crypto"
                active={currentPage === "investing-crypto"}
              />
              <SubMenuItem
                label="Stocks"
                page="investing-stocks"
                active={currentPage === "investing-stocks"}
              />
              <SubMenuItem
                label="Bonds"
                page="investing-bonds"
                active={currentPage === "investing-bonds"}
              />
              <SubMenuItem
                label="ETFs"
                page="investing-etfs"
                active={currentPage === "investing-etfs"}
              />
              <SubMenuItem
                label="Inflation"
                page="investing-inflation"
                active={currentPage === "investing-inflation"}
              />
            </div>
          )}
        </div>

        {/* Compound Interest Calculator */}
        <MenuItem
          icon={Calculator}
          label="Compound Calculator"
          page="calculator"
          active={currentPage === "calculator"}
        />

        {/* Divider */}
        <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

        {/* Theme Toggle */}
        <div className="px-4 py-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Appearance</p>
          <div className="flex items-center justify-between gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setThemeMode('light')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all ${
                theme === 'light' && !isDark
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              data-testid="theme-light-btn"
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-all ${
                isDark
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              data-testid="theme-dark-btn"
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
          </div>
        </div>

        {/* Premium/Upgrade Section */}
        {renderPremiumSection()}
      </nav>
    </div>
  );
};
