import { useState } from "react";
import { ChevronDown, ChevronRight, LayoutDashboard, BookOpen, Calculator, Repeat, Shield, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Sidebar = ({ currentPage, onNavigate }) => {
  const [investingOpen, setInvestingOpen] = useState(false);
  const { user } = useAuth();

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
    <div className="w-72 bg-white border-r border-gray-200 h-screen overflow-y-auto p-4 flex-shrink-0">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">💰 FinanceHub</h2>
        <p className="text-sm text-gray-500">Your Financial Companion</p>
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
        <div className="my-4 border-t border-gray-200"></div>

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
