import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export const BondsGuide = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Bonds</h1>
        <p className="text-gray-600 text-lg">Fixed-income securities for stable returns</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What are Bonds?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Bonds are debt securities where you lend money to a government or corporation for a set period. In return, they promise to pay you regular interest payments (called the coupon) and return your principal when the bond matures.
          </p>
          <p className="text-gray-700">
            Think of bonds as IOUs: you're the lender, and the bond issuer is the borrower. Bonds are generally considered safer than stocks but offer lower potential returns. They're a cornerstone of conservative investment portfolios.
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
            <Badge className="bg-green-600 mb-4">Low Risk</Badge>
            <p className="text-sm text-gray-600">
              Stable, predictable returns. Government bonds are extremely safe.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Average ROI</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-blue-600 mb-2">3-6%</div>
            <Badge className="bg-blue-600 mb-4">Annually</Badge>
            <p className="text-sm text-gray-600">
              Varies by type and credit rating. Government bonds: 3-4%, Corporate bonds: 4-6%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Time Horizon</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-purple-600 mb-2">1-30</div>
            <Badge className="bg-purple-600 mb-4">Years</Badge>
            <p className="text-sm text-gray-600">
              Short-term (1-5 years), Medium-term (5-10), Long-term (10-30)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Types of Bonds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Government Bonds (Treasury)</h3>
              <p className="text-gray-700">
                Issued by national governments. Considered the safest bonds with virtually no default risk. Examples: US Treasury Bonds, T-Bills. Lower yields but maximum security.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Municipal Bonds</h3>
              <p className="text-gray-700">
                Issued by state and local governments for public projects. Often tax-exempt, making them attractive for high-income investors. Generally safe with moderate yields.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Corporate Bonds</h3>
              <p className="text-gray-700">
                Issued by companies to fund operations or expansion. Higher yields than government bonds but more risk. Credit rating is crucial—investment-grade vs high-yield (junk) bonds.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">International Bonds</h3>
              <p className="text-gray-700">
                Bonds issued by foreign governments or corporations. Offer diversification but include currency risk and potentially different credit standards.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Characteristics</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>Fixed Income:</strong> Regular, predictable interest payments
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>Principal Protection:</strong> Get your initial investment back at maturity (if no default)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>Lower Volatility:</strong> Prices fluctuate less than stocks
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>Interest Rate Sensitivity:</strong> Bond prices move inversely to interest rates
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>Credit Risk:</strong> Risk that issuer may default on payments
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            When to Invest in Bonds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-green-800">
            <strong>Nearing Retirement:</strong> Preserve capital and generate stable income as you approach retirement age.
          </p>
          <p className="text-green-800">
            <strong>Risk Reduction:</strong> Balance portfolio risk when stocks are overheated or markets are volatile.
          </p>
          <p className="text-green-800">
            <strong>Income Needs:</strong> Generate predictable cash flow for regular expenses or living costs.
          </p>
          <p className="text-green-800">
            <strong>Diversification:</strong> Bonds often move differently than stocks, providing portfolio balance.
          </p>
          <p className="text-green-800">
            <strong>Typical Allocation:</strong> Many advisors suggest age-based allocation (e.g., if you're 30, hold 30% in bonds, 70% in stocks).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};