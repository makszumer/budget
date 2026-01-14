import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DollarSign, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Currency data with symbols and names
const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
];

export const getCurrencySymbol = (code) => {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.symbol || code;
};

export const getCurrencyName = (code) => {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.name || code;
};

export const CurrencyPreferences = ({ compact = false }) => {
  const { primaryCurrency, updatePrimaryCurrency } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCurrencyChange = async (newCurrency) => {
    if (newCurrency === primaryCurrency) return;
    
    setIsUpdating(true);
    try {
      await updatePrimaryCurrency(newCurrency);
      toast.success(`Primary currency changed to ${getCurrencyName(newCurrency)} (${newCurrency})`);
    } catch (error) {
      toast.error("Failed to update currency. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <Select value={primaryCurrency} onValueChange={handleCurrencyChange} disabled={isUpdating}>
          <SelectTrigger className="w-[120px] h-8 text-sm" data-testid="currency-selector-compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{currency.code}</span>
                  <span className="text-muted-foreground text-xs">{currency.symbol}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
          <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">Primary Currency</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Used for all new transactions
          </p>
        </div>
      </div>
      
      <Select value={primaryCurrency} onValueChange={handleCurrencyChange} disabled={isUpdating}>
        <SelectTrigger className="w-full" data-testid="currency-selector">
          <SelectValue>
            {primaryCurrency && (
              <span className="flex items-center gap-2">
                <span className="font-medium">{getCurrencySymbol(primaryCurrency)}</span>
                <span>{getCurrencyName(primaryCurrency)}</span>
                <span className="text-muted-foreground">({primaryCurrency})</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <span className="flex items-center gap-3 w-full">
                <span className="w-8 text-center font-medium">{currency.symbol}</span>
                <span className="flex-1">{currency.name}</span>
                <span className="text-muted-foreground text-sm">{currency.code}</span>
                {currency.code === primaryCurrency && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {isUpdating && (
        <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 dark:text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating...
        </div>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Changing currency only affects new transactions. Existing transactions keep their original currency.
      </p>
    </div>
  );
};

export { CURRENCIES };
