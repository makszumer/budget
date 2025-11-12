import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const CompoundCalculator = () => {
  const [initialInvestment, setInitialInvestment] = useState("10000");
  const [contribution, setContribution] = useState("500");
  const [frequency, setFrequency] = useState("monthly");
  const [interestRate, setInterestRate] = useState("7");
  const [years, setYears] = useState("30");
  const [results, setResults] = useState(null);

  const calculateCompound = () => {
    const principal = parseFloat(initialInvestment) || 0;
    const monthlyContribution = parseFloat(contribution) || 0;
    const rate = (parseFloat(interestRate) || 0) / 100;
    const timeYears = parseInt(years) || 1;

    // Convert contribution to monthly based on frequency
    let monthlyAmount = monthlyContribution;
    if (frequency === "weekly") {
      monthlyAmount = monthlyContribution * 52 / 12;
    } else if (frequency === "daily") {
      monthlyAmount = monthlyContribution * 365 / 12;
    }

    // Calculate month by month for chart data
    const chartData = [];
    let balance = principal;
    const monthlyRate = rate / 12;
    let totalContributed = principal;

    // Add initial point
    chartData.push({
      year: 0,
      balance: principal,
      contributed: principal,
      interest: 0,
    });

    for (let year = 1; year <= timeYears; year++) {
      for (let month = 1; month <= 12; month++) {
        // Add contribution
        balance += monthlyAmount;
        totalContributed += monthlyAmount;
        
        // Apply interest
        balance *= (1 + monthlyRate);
      }

      // Record yearly data
      chartData.push({
        year,
        balance: Math.round(balance),
        contributed: Math.round(totalContributed),
        interest: Math.round(balance - totalContributed),
      });
    }

    const finalBalance = balance;
    const totalInterestEarned = finalBalance - totalContributed;

    setResults({
      finalBalance,
      totalContributed,
      totalInterestEarned,
      chartData,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">Year {payload[0].payload.year}</p>
          <p className="text-sm text-blue-600">Balance: {formatCurrency(payload[0].payload.balance)}</p>
          <p className="text-sm text-green-600">Contributed: {formatCurrency(payload[0].payload.contributed)}</p>
          <p className="text-sm text-purple-600">Interest: {formatCurrency(payload[0].payload.interest)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Compound Interest Calculator</h1>
        <p className="text-gray-600 text-lg">See the power of compound growth</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Investment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initial">Initial Investment ($)</Label>
              <Input
                id="initial"
                type="number"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(e.target.value)}
                placeholder="10000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contribution">Contribution Amount ($)</Label>
              <Input
                id="contribution"
                type="number"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                placeholder="500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Contribution Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Estimated Interest Rate (% per year)</Label>
              <Input
                id="rate"
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="7"
              />
              <p className="text-xs text-gray-500">
                Historical stock market average: ~10%, Conservative: 5-7%, Bonds: 3-5%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="years">Time Period (years)</Label>
              <Input
                id="years"
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="30"
              />
            </div>

            <Button
              onClick={calculateCompound}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Calculate
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Your Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Final Balance</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {formatCurrency(results.finalBalance)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Contributed</p>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(results.totalContributed)}
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Interest Earned</p>
                    <p className="text-xl font-bold text-purple-700">
                      {formatCurrency(results.totalInterestEarned)}
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-orange-900 mb-1">
                    Growth Multiple
                  </p>
                  <p className="text-lg font-bold text-orange-700">
                    {(results.finalBalance / results.totalContributed).toFixed(2)}x your contributions
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Your money grew by {((results.totalInterestEarned / results.totalContributed) * 100).toFixed(0)}%!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chart */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={results.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  label={{ value: 'Years', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Total Balance"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="contributed" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Total Contributed"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="interest" 
                  stroke="#a855f7" 
                  strokeWidth={2}
                  name="Interest Earned"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Educational Note */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-3 text-gray-900">💡 The Magic of Compound Interest</h3>
          <p className="text-gray-700 mb-2">
            Albert Einstein reportedly called compound interest "the eighth wonder of the world." The key insight: You earn returns not just on your original investment, but also on all the returns you've accumulated over time.
          </p>
          <p className="text-gray-700 font-medium">
            The earlier you start, the more powerful it becomes. Time is your greatest asset when it comes to building wealth!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
