import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export const InvestmentTransactionList = ({ transactions, onDeleteTransaction }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (transactions.length === 0) {
    return (
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle>Investment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No investment transactions yet. Start building your portfolio!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle>Investment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              data-testid={`investment-transaction-${transaction.id}`}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{transaction.asset || transaction.category}</span>
                  {transaction.quantity && (
                    <span className="text-sm text-muted-foreground">
                      ({transaction.quantity.toFixed(8)} units @ {formatAmount(transaction.purchase_price)})
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{transaction.category}</span>
                  {transaction.description && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{transaction.description}</span>
                    </>
                  )}
                  <span className="mx-2">•</span>
                  <span>{formatDate(transaction.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {formatAmount(transaction.amount)}
                  </div>
                  {transaction.purchase_price && transaction.quantity && (
                    <div className="text-xs text-muted-foreground">
                      Total invested
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`delete-investment-btn-${transaction.id}`}
                  onClick={() => onDeleteTransaction(transaction.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
