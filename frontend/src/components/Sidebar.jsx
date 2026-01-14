import { useState } from "react";
import { ChevronDown, ChevronRight, LayoutDashboard, BookOpen, Calculator, Repeat, Shield, Wallet, Sparkles, Tag, Moon, Sun, Monitor } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export const Sidebar = ({ currentPage, onNavigate }) => {
  const [investingOpen, setInvestingOpen] = useState(false);
  const { user } = useAuth();
  const { theme, isDark, toggleTheme, setThemeMode } = useTheme();

  const MenuItem = ({ icon: Icon, label, page, active }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        active
          ? "bg-blue-600 text-white shadow-md"
          : "text-gray-700 hover:bg-gray-100"
      }`}
      data-testid={`menu-${page}`}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  const SubMenuItem = ({ label, page, active }) => (
    <button
      onClick={() => onNavigate(page)}
      className={`w-full flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg text-sm transition-all ${
        active
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-gray-600 hover:bg-gray-50"
      }`}
      data-testid={`menu-${page}`}
    >
      <span>{label}</span>
    </button>
  );

  return (
    <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen overflow-y-auto p-4 flex-shrink-0">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">💰 FinanceHub</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your Financial Companion</p>
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
        {user?.email === 'admin@financehub.com' && (
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

        {/* AI Financial Assistant */}
        <MenuItem
          icon={Sparkles}
          label="AI Assistant"
          page="ai-assistant"
          active={currentPage === "ai-assistant"}
        />

        {/* Why Investing */}
        <div className="space-y-1">
          <button
            onClick={() => setInvestingOpen(!investingOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
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

        {/* Upgrade to Premium */}
        <button
          onClick={() => onNavigate('pricing')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md ${
            currentPage === 'pricing' ? 'ring-2 ring-blue-300' : ''
          }`}
        >
          <span className="font-medium">⭐ Upgrade to Premium</span>
        </button>
      </nav>
    </div>
  );
};
