import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "lucide-react";

export const ETFsGuide = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">ETFs (Exchange-Traded Funds)</h1>
        <p className="text-gray-600 text-lg">Diversified portfolios in a single investment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What are ETFs?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Exchange-Traded Funds (ETFs) are investment funds that trade on stock exchanges, just like individual stocks. An ETF holds a collection of assets—stocks, bonds, commodities, or a mix—allowing you to invest in dozens or hundreds of securities with a single purchase.
          </p>
          <p className="text-gray-700">
            ETFs combine the diversification benefits of mutual funds with the trading flexibility of stocks. They're one of the most popular investment vehicles for both beginners and experienced investors due to their low costs and ease of use.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Safety Rating</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-green-600 mb-2">4/5</div>
            <Badge className="bg-green-600 mb-4">Low-Moderate Risk</Badge>
            <p className="text-sm text-gray-600">
              Built-in diversification reduces risk. Varies by ETF type.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Average ROI</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-blue-600 mb-2">8-10%</div>
            <Badge className="bg-blue-600 mb-4">Annually</Badge>
            <p className="text-sm text-gray-600">
              S&P 500 ETFs: ~10%, Bond ETFs: 3-5%, Sector ETFs: varies widely
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Time Horizon</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-purple-600 mb-2">3-30</div>
            <Badge className="bg-purple-600 mb-4">Years</Badge>
            <p className="text-sm text-gray-600">
              Flexible for various time horizons depending on ETF type
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Types of ETFs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Broad Market Index ETFs</h3>
              <p className="text-gray-700">
                Track major market indexes like S&P 500 or total stock market. Examples: VOO, SPY, VTI. Perfect for beginners seeking simple, diversified exposure to the entire market.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Sector ETFs</h3>
              <p className="text-gray-700">
                Focus on specific industries like technology, healthcare, or energy. Examples: XLK (Tech), XLV (Healthcare). Higher returns potential but more concentrated risk.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Bond ETFs</h3>
              <p className="text-gray-700">
                Invest in government or corporate bonds. Examples: BND, AGG. Provide stable income with lower volatility than stock ETFs.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">International ETFs</h3>
              <p className="text-gray-700">
                Invest in foreign markets for global diversification. Examples: VXUS (international stocks), EEM (emerging markets). Adds geographic diversity to portfolios.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Thematic ETFs</h3>
              <p className="text-gray-700">
                Focus on trends or themes like clean energy, AI, or cybersecurity. Examples: ICLN (clean energy), ARKK (innovation). Higher risk but targets specific growth opportunities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Advantages</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Instant Diversification:</strong> Own hundreds of stocks/bonds with one purchase
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Low Costs:</strong> Expense ratios often 0.03-0.20%, much cheaper than mutual funds
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Trading Flexibility:</strong> Buy and sell throughout the day like stocks
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Transparency:</strong> Holdings are disclosed daily, you always know what you own
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Tax Efficiency:</strong> Generally more tax-efficient than mutual funds
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">•</span>
              <div>
                <strong>Low Minimums:</strong> Start with just the cost of one share (often under $100)
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Why ETFs are Perfect for Beginners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-blue-800">
            <strong>Simple Diversification:</strong> No need to pick individual stocks. One ETF gives you instant exposure to an entire market or sector.
          </p>
          <p className="text-blue-800">
            <strong>Low Cost:</strong> No need for expensive financial advisors. Index ETFs offer professional-level diversification for pennies.
          </p>
          <p className="text-blue-800">
            <strong>Proven Strategy:</strong> Index ETFs have historically beaten most actively managed funds over the long term.
          </p>
          <p className="text-blue-800">
            <strong>Easy to Understand:</strong> Want to invest in the entire US stock market? Buy VTI. Want bonds? Buy BND. It's that simple.
          </p>
          <p className="text-blue-800">
            <strong>Recommended for Beginners:</strong> Start with broad market index ETFs like VTI or VOO as the core of your portfolio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};