import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export const CryptoGuide = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Cryptocurrency</h1>
        <p className="text-gray-600 text-lg">Digital assets and blockchain technology</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What is Cryptocurrency?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Cryptocurrency is a digital or virtual currency that uses cryptography for security. Unlike traditional currencies issued by governments, cryptocurrencies operate on decentralized networks based on blockchain technology—a distributed ledger enforced by a network of computers.
          </p>
          <p className="text-gray-700">
            Bitcoin, created in 2009, was the first cryptocurrency. Since then, thousands of alternative cryptocurrencies with various functions and specifications have been created, including Ethereum, Solana, and many others.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Safety Rating</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-red-600 mb-2">2/5</div>
            <Badge variant="destructive" className="mb-4">High Risk</Badge>
            <p className="text-sm text-gray-600">
              Extremely volatile, regulatory uncertainty, potential for significant losses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Average ROI</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-purple-600 mb-2">Varies</div>
            <Badge className="bg-purple-600 mb-4">Highly Variable</Badge>
            <p className="text-sm text-gray-600">
              Can range from -90% to +1000%+ annually. Bitcoin historically ~100% average annual return (2013-2023)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Time Horizon</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-bold text-orange-600 mb-2">3-10</div>
            <Badge className="bg-orange-600 mb-4">Years</Badge>
            <p className="text-sm text-gray-600">
              Best for long-term holders who can withstand extreme volatility
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Characteristics</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>Decentralized:</strong> No central authority controls the network
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>Limited Supply:</strong> Many cryptocurrencies have a capped maximum supply
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>24/7 Trading:</strong> Markets never close, unlike traditional stock markets
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>High Volatility:</strong> Prices can swing dramatically in short periods
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <div>
                <strong>Global Access:</strong> Anyone with internet access can participate
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Important Warnings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-red-800">
            <strong>High Risk:</strong> Only invest money you can afford to lose completely. Crypto is the most volatile major asset class.
          </p>
          <p className="text-red-800">
            <strong>No FDIC Insurance:</strong> Unlike bank deposits, crypto holdings are not insured by governments.
          </p>
          <p className="text-red-800">
            <strong>Regulatory Risk:</strong> Government regulations are still evolving and can impact prices significantly.
          </p>
          <p className="text-red-800">
            <strong>Recommended Allocation:</strong> Most financial advisors suggest keeping crypto to 5-10% or less of your total investment portfolio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};