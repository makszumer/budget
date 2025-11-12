import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Target, Clock } from "lucide-react";

export const InvestingOverview = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Why Investing Matters</h1>
        <p className="text-gray-600 text-lg">Build wealth and secure your financial future</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The Power of Investing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Investing is one of the most powerful tools for building long-term wealth. Rather than letting your money sit idle in a savings account, investing allows your money to work for you and grow over time through the power of compound returns.
          </p>
          <p className="text-gray-700">
            Whether you're saving for retirement, a down payment on a house, or your children's education, investing can help you reach your financial goals faster than saving alone.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Wealth Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Historical data shows the stock market has returned an average of 10% annually. Compare this to a typical savings account at 0.5-2%, and the difference is dramatic over time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Beat Inflation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Inflation erodes purchasing power over time. Investing helps your money grow faster than inflation, preserving and increasing your wealth in real terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Achieve Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Whether it's early retirement, buying a home, or funding education, investing provides the growth potential needed to reach significant financial milestones.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Time Advantage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              The earlier you start investing, the more time compound interest has to work its magic. Even small amounts invested early can grow into substantial sums over decades.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Key Takeaway</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-800 font-medium">
            Investing isn't just for the wealthy—it's a crucial tool for anyone who wants to build financial security and achieve their long-term goals. The key is to start early, stay consistent, and diversify your investments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
