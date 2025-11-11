import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, PieChart } from "lucide-react";

export const Dashboard = ({ summary }) => {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const stats = [
    {
      title: "Total Income",
      value: summary.totalIncome,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      testId: "total-income"
    },
    {
      title: "Total Expenses",
      value: summary.totalExpenses,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
      testId: "total-expenses"
    },
    {
      title: "Total Investments",
      value: summary.totalInvestments,
      icon: PieChart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      testId: "total-investments"
    },
    {
      title: "Balance",
      value: summary.balance,
      icon: DollarSign,
      color: summary.balance >= 0 ? "text-green-600" : "text-red-600",
      bgColor: summary.balance >= 0 ? "bg-green-50" : "bg-red-50",
      testId: "balance"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-full`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className={`text-2xl font-bold ${stat.color}`}
                data-testid={stat.testId}
              >
                {formatAmount(stat.value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
