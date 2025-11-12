import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, AlertTriangle } from "lucide-react";

export const InflationGuide = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Inflation</h1>
        <p className="text-gray-600 text-lg">Understanding the silent wealth eroder</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What is Inflation?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Inflation is the rate at which the general level of prices for goods and services rises, consequently eroding purchasing power. In simple terms, inflation means your money buys less over time. If inflation is 3% per year, something that costs $100 today will cost $103 next year.
          </p>
          <p className="text-gray-700">
            Central banks, like the Federal Reserve in the US, typically target around 2% annual inflation. This moderate level is considered healthy for economic growth. However, high inflation can devastate purchasing power and savings.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">US Historical Average</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-orange-600 mb-2">3.3%</div>
            <Badge className="bg-orange-600 mb-4">Per Year</Badge>
            <p className="text-sm text-gray-600">
              Average US inflation rate from 1913-2023
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Recent Rate (2024)</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-red-600 mb-2">3.4%</div>
            <Badge className="bg-red-600 mb-4">Per Year</Badge>
            <p className="text-sm text-gray-600">
              Current inflation running above historical average
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            The Real Impact of Inflation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Example: The $10,000 Over 30 Years</h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>At 0% inflation:</strong> $10,000 remains $10,000 in value</p>
                <p><strong>At 2% inflation:</strong> $10,000 is worth only $5,520 in today's dollars</p>
                <p><strong>At 3% inflation:</strong> $10,000 is worth only $4,110 in today's dollars</p>
                <p><strong>At 4% inflation:</strong> $10,000 is worth only $3,080 in today's dollars</p>
              </div>
            </div>
            <p className="text-gray-700">
              This demonstrates why keeping all your money in cash or low-interest savings accounts is actually losing you money over time, even though the number stays the same!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Causes Inflation?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <div>
                <strong>Demand-Pull Inflation:</strong> When demand for goods and services exceeds supply, prices rise. Example: Housing shortage leading to higher home prices.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <div>
                <strong>Cost-Push Inflation:</strong> When production costs increase (materials, wages, energy), companies pass costs to consumers. Example: Oil price increases affecting transportation costs.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <div>
                <strong>Monetary Expansion:</strong> When too much money is printed, currency value decreases. Example: Quantitative easing by central banks.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <div>
                <strong>Built-in Inflation:</strong> Wage increases lead to price increases which lead to more wage demands, creating an upward spiral.
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Inflation Affects You</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="destructive">Negative</Badge>
              <p className="text-gray-700">
                <strong>Savings Erosion:</strong> Money in savings accounts loses purchasing power faster than it earns interest
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="destructive">Negative</Badge>
              <p className="text-gray-700">
                <strong>Fixed Income Hit:</strong> Retirees on fixed incomes struggle as their buying power decreases
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="destructive">Negative</Badge>
              <p className="text-gray-700">
                <strong>Cost of Living:</strong> Essential goods like food, housing, and healthcare become more expensive
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-green-600">Positive</Badge>
              <p className="text-gray-700">
                <strong>Debt Reduction:</strong> Fixed-rate debt becomes easier to pay as dollars are worth less
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-green-600">Positive</Badge>
              <p className="text-gray-700">
                <strong>Asset Values:</strong> Real assets like real estate and stocks often increase with inflation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-orange-50 border-orange-200">
        <CardHeader>
          <CardTitle className="text-orange-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Protecting Yourself from Inflation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-orange-800">
            <strong>Invest, Don't Save:</strong> Keep only 3-6 months emergency fund in savings. Invest the rest in inflation-beating assets.
          </p>
          <p className="text-orange-800">
            <strong>Stocks & Real Estate:</strong> Historically outpace inflation over long periods. Companies can raise prices, real estate appreciates.
          </p>
          <p className="text-orange-800">
            <strong>TIPS & I-Bonds:</strong> Treasury Inflation-Protected Securities adjust with inflation, protecting principal.
          </p>
          <p className="text-orange-800">
            <strong>Increase Income:</strong> Negotiate raises, develop new skills, or start side hustles to keep pace with rising costs.
          </p>
          <p className="text-orange-800">
            <strong>The Key Message:</strong> Inflation is why investing is not optional—it's necessary to maintain your wealth. A 10% stock return with 3% inflation = 7% real return. A 1% savings account with 3% inflation = -2% real return (you're losing money).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};