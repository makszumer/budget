import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

export const CategoryTrends = ({ transactions }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [expandedMonth, setExpandedMonth] = useState(null);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    // Filter transactions by category
    const filtered = transactions.filter(t => 
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by month
    const grouped = {};
    filtered.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthKey,
          month: monthLabel,
          amount: 0,
          count: 0,
          transactions: []
        };
      }
      grouped[monthKey].amount += t.amount;
      grouped[monthKey].count += 1;
      grouped[monthKey].transactions.push(t);
    });

    // Convert to array and sort by date (newest first)
    const data = Object.values(grouped).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    
    // Sort transactions within each month by date (newest first)
    data.forEach(item => {
      item.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    
    setResults(data);
  }, [searchTerm, transactions]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Spending by Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Type category name (e.g., groceries, gym)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {searchTerm.length > 0 && searchTerm.length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Type at least 2 characters to search
          </p>
        )}

        {searchTerm.length >= 2 && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No transactions found for "{searchTerm}"
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Found {results.reduce((sum, r) => sum + r.count, 0)} transactions
            </p>
            <div className="space-y-2">
              {results.map((item, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  {/* Month Header - Clickable */}
                  <div 
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setExpandedMonth(expandedMonth === item.monthKey ? null : item.monthKey)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedMonth === item.monthKey ? (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="font-semibold">{item.month}</span>
                      <span className="text-sm text-gray-600">({item.count} transactions)</span>
                    </div>
                    <span className="font-bold">{formatAmount(item.amount)}</span>
                  </div>

                  {/* Expanded Transactions */}
                  {expandedMonth === item.monthKey && (
                    <div className="divide-y">
                      {item.transactions.map((trans, tIndex) => (
                        <div key={tIndex} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm mb-1">
                                {new Date(trans.date).toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">{trans.category}</span>
                              </div>
                              {trans.description && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {trans.description}
                                </div>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-bold text-red-600">
                                {formatAmount(trans.amount)}
                              </div>
                              {trans.currency && trans.currency !== "USD" && (
                                <div className="text-xs text-gray-500">{trans.currency}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Total */}
              <div className="border rounded-lg p-4 bg-gray-50 font-semibold">
                <div className="flex items-center justify-between">
                  <span>Total ({results.reduce((sum, r) => sum + r.count, 0)} transactions)</span>
                  <span>{formatAmount(results.reduce((sum, r) => sum + r.amount, 0))}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
