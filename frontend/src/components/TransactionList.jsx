import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EditTransactionModal } from "@/components/EditTransactionModal";

export const TransactionList = ({ transactions, onDeleteTransaction, onEditTransaction, currencies = ["USD"] }) => {
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditClick = (transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedTransaction) => {
    onEditTransaction(updatedTransaction);
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'income':
        return 'bg-green-500 hover:bg-green-600';
      case 'expense':
        return 'bg-red-500 hover:bg-red-600';
      case 'investment':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500';
    }
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No transactions yet. Add your first transaction above!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              data-testid={`transaction-item-${transaction.id}`}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getTypeColor(transaction.type)}>
                    {transaction.type}
                  </Badge>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{transaction.description}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span>{transaction.category}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDate(transaction.date)}</span>
                  {/* Show original currency if converted */}
                  {transaction.original_currency && transaction.original_currency !== transaction.currency && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-xs text-blue-500 dark:text-blue-400">
                        {transaction.original_currency} {transaction.original_amount?.toFixed(2)} → {transaction.currency}
                        {transaction.is_estimated_rate && " (est.)"}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    transaction.type === 'income' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatAmount(transaction.amount, transaction.currency || 'USD')}
                  </span>
                  {/* Show original amount below if converted */}
                  {transaction.original_currency && transaction.original_currency !== transaction.currency && (
                    <p className="text-xs text-muted-foreground">
                      ({transaction.original_currency} {transaction.original_amount?.toFixed(2)})
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`edit-btn-${transaction.id}`}
                  onClick={() => handleEditClick(transaction)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`delete-btn-${transaction.id}`}
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
      <EditTransactionModal
        transaction={editingTransaction}
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        currencies={currencies}
      />
    </Card>
  );
};
