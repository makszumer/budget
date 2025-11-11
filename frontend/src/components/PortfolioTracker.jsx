import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";

export const PortfolioTracker = ({ portfolio }) => {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  if (!portfolio || portfolio.holdings.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              Investment Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              No investments yet. Start building your portfolio!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Invested",
      value: portfolio.total_invested,
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Current Value",
      value: portfolio.current_value,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Gain/Loss",
      value: portfolio.total_gain_loss,
      icon: portfolio.total_gain_loss >= 0 ? TrendingUp : TrendingDown,
      color: portfolio.total_gain_loss >= 0 ? "text-green-600" : "text-red-600",
      bgColor: portfolio.total_gain_loss >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      title: "ROI",
      value: formatPercent(portfolio.total_roi_percentage),
      icon: portfolio.total_roi_percentage >= 0 ? TrendingUp : TrendingDown,
      color: portfolio.total_roi_percentage >= 0 ? "text-green-600" : "text-red-600",
      bgColor: portfolio.total_roi_percentage >= 0 ? "bg-green-50" : "bg-red-50",
      isPercent: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-blue-200">
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
                  data-testid={`portfolio-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {stat.isPercent ? stat.value : formatAmount(stat.value)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Holdings List */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {portfolio.holdings.map((holding, index) => (
              <div
                key={index}
                data-testid={`holding-${holding.asset}`}
                className="p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{holding.asset}</h3>
                      <Badge variant="outline" className="text-xs">
                        {holding.category}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{holding.total_quantity.toFixed(8)} units</span>
                      <span className="mx-2">•</span>
                      <span>Avg Price: {formatAmount(holding.average_price)}</span>
                    </div>
                  </div>
                  <div className={`text-right ${holding.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="font-bold text-xl flex items-center gap-1">
                      {holding.roi_percentage >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatPercent(holding.roi_percentage)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Invested</p>
                    <p className="font-semibold">{formatAmount(holding.total_invested)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Price</p>
                    <p className="font-semibold">{formatAmount(holding.current_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Value</p>
                    <p className="font-semibold text-blue-600">{formatAmount(holding.current_value)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gain/Loss</p>
                    <p className={`font-semibold ${holding.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {holding.gain_loss >= 0 ? '+' : ''}{formatAmount(holding.gain_loss)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
