import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, PieChart } from "lucide-react";

export const Dashboard = ({ summary, privacyMode = false }) => {
  const formatAmount = (amount) => {
    if (privacyMode) {
      return "$***,***";
    }
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
      color: "text-[#1C3D2E]",
      bgColor: "bg-[#F5F2EC] dark:bg-gray-800",
      testId: "total-income"
    },
    {
      title: "Total Expenses",
      value: summary.totalExpenses,
      icon: TrendingDown,
      color: "text-[#7C2D2D]",
      bgColor: "bg-[#F5F2EC] dark:bg-gray-800",
      testId: "total-expenses"
    },
    {
      title: "Total Investments",
      value: summary.totalInvestments,
      icon: PieChart,
      color: "text-[#6B6B67]",
      bgColor: "bg-[#F5F2EC] dark:bg-gray-800",
      testId: "total-investments"
    },
    {
      title: "Balance",
      value: summary.balance,
      icon: DollarSign,
      color: "text-[#1C3D2E]",
      bgColor: "bg-[#F5F2EC] dark:bg-gray-800",
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
