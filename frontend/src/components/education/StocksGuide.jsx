import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export const StocksGuide = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Stocks</h1>
        <p className="text-gray-600 text-lg">Ownership shares in companies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What are Stocks?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Stocks, also known as equities, represent ownership shares in a company. When you buy a stock, you become a partial owner of that company and may benefit from its growth and profits. Companies sell stocks to raise capital for business operations and expansion.
          </p>
          <p className="text-gray-700">
            Stock prices fluctuate based on company performance, market conditions, and investor sentiment. Investors can profit through capital appreciation (price increase) and dividends (profit distributions).
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Safety Rating</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-yellow-600 mb-2">3/5</div>
            <Badge className="bg-yellow-600 mb-4">Moderate Risk</Badge>
            <p className="text-sm text-gray-600">
              Moderate volatility, diversification reduces risk, long-term track record
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Average ROI</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-green-600 mb-2">10%</div>
            <Badge className="bg-green-600 mb-4">Annually</Badge>
            <p className="text-sm text-gray-600">
              S&P 500 historical average return (1926-2023). Individual stocks vary widely.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Time Horizon</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-blue-600 mb-2">5-30</div>
            <Badge className="bg-blue-600 mb-4">Years</Badge>
            <p className="text-sm text-gray-600">
              Best for medium to long-term investors
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Types of Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Growth Stocks</h3>
              <p className="text-gray-700">
                Companies expected to grow faster than the market average. They typically reinvest profits rather than paying dividends. Higher potential returns but more volatile. Examples: Technology companies.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Value Stocks</h3>
              <p className="text-gray-700">
                Established companies trading below their intrinsic value. Often pay dividends and have stable earnings. Lower volatility but slower growth. Examples: Banks, utilities.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Dividend Stocks</h3>
              <p className="text-gray-700">
                Companies that regularly distribute profits to shareholders. Provide passive income and tend to be less volatile. Popular for retirement portfolios.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Long-term Growth:</strong> Historically outperforms most asset classes over long periods
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Liquidity:</strong> Easy to buy and sell during market hours
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Ownership:</strong> Actual stake in companies with voting rights
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Dividends:</strong> Potential for regular income in addition to price appreciation
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Diversification:</strong> Access to various sectors and industries
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Investment Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-blue-800">
            <strong>Diversification:</strong> Don't put all eggs in one basket. Spread investments across different sectors and companies.
          </p>
          <p className="text-blue-800">
            <strong>Long-term Focus:</strong> Time in the market beats timing the market. Stay invested through market cycles.
          </p>
          <p className="text-blue-800">
            <strong>Dollar-Cost Averaging:</strong> Invest regularly regardless of price to reduce timing risk.
          </p>
          <p className="text-blue-800">
            <strong>Research:</strong> Understand the companies you invest in—their business model, financials, and competitive position.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};