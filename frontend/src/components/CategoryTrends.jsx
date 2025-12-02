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
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Month</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Amount</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{item.month}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">{formatAmount(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-sm">Total</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatAmount(results.reduce((sum, r) => sum + r.amount, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {results.reduce((sum, r) => sum + r.count, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
