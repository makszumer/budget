import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

export const AppearanceToggle = () => {
  const { theme, isDark, setThemeMode, followSystem } = useTheme();

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Theme:</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setThemeMode('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            !isDark && !followSystem
              ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          data-testid="dashboard-theme-light"
          title="Light mode"
        >
          <Sun className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Light</span>
        </button>
        <button
          onClick={() => setThemeMode('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            isDark && !followSystem
              ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          data-testid="dashboard-theme-dark"
          title="Dark mode"
        >
          <Moon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Dark</span>
        </button>
        <button
          onClick={() => setThemeMode('system')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            followSystem
              ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          data-testid="dashboard-theme-system"
          title="Follow system preference"
        >
          <Monitor className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">System</span>
        </button>
      </div>
    </div>
  );
};
