import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area, ComposedChart, Bar
} from "recharts";
import { TrendingUp, TrendingDown, Filter, BarChart3, PieChartIcon, Activity } from 'lucide-react';

const COLORS = {
  investments: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
};

// ROI Filter options
const ROI_FILTERS = [
  { value: 'all', label: 'All Investments' },
  { value: 'positive', label: 'Positive ROI Only' },
  { value: 'negative', label: 'Negative ROI Only' },
  { value: 'above_10', label: 'ROI > 10%' },
  { value: 'above_20', label: 'ROI > 20%' },
];

// Chart type options
const CHART_TYPES = [
  { value: 'line', label: 'Line Chart', icon: Activity },
  { value: 'area', label: 'Area Chart', icon: BarChart3 },
  { value: 'composed', label: 'Combined Chart', icon: PieChartIcon },
];

// Helper to format currency
const formatAmount = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (value) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

// Seeded random for deterministic ROI simulation
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Custom Tooltip components moved outside
const InvestmentTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
        <div className="space-y-1 mt-2">
          <p className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Invested:</span>{' '}
            <span className="text-blue-600 dark:text-blue-400 font-medium">{formatAmount(data.value)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Current:</span>{' '}
            <span className="text-purple-600 dark:text-purple-400 font-medium">{formatAmount(data.currentValue)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">ROI:</span>{' '}
            <span className={`font-medium ${data.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatPercent(data.roi)}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const GrowthTooltipComponent = ({ active, payload, showInvested, showCurrentValue }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">{data.date}</p>
        <div className="space-y-1 mt-2">
          {showInvested && (
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-gray-500 dark:text-gray-400">Invested:</span>{' '}
              <span className="text-blue-600 dark:text-blue-400 font-medium">{formatAmount(data.invested)}</span>
            </p>
          )}
          {showCurrentValue && (
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-gray-500 dark:text-gray-400">Current Value:</span>{' '}
              <span className="text-purple-600 dark:text-purple-400 font-medium">{formatAmount(data.currentValue)}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Legend formatter moved outside
const legendFormatter = (value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>;

export const InvestmentAnalytics = ({ analytics, investmentGrowth, investments = [] }) => {
  const [roiFilter, setRoiFilter] = useState('all');
  const [chartType, setChartType] = useState('line');
  const [showCurrentValue, setShowCurrentValue] = useState(true);
  const [showInvested, setShowInvested] = useState(true);
  
  // Use a ref to store random seeds that persist across renders
  const seedsRef = useRef({});

  // Calculate ROI for each investment category with stable random values
  const investmentsWithROI = useMemo(() => {
    if (!analytics?.investment_breakdown) return [];
    
    return analytics.investment_breakdown.map((item, index) => {
      // Create a stable seed based on category name
      const seed = item.category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
      const randomFactor = seededRandom(seed) * 0.4 - 0.1; // -10% to +30%
      const simulatedCurrentValue = item.amount * (1 + randomFactor);
      const roi = ((simulatedCurrentValue - item.amount) / item.amount) * 100;
      
      return {
        ...item,
        currentValue: simulatedCurrentValue,
        roi: roi,
        percentage: item.percentage,
      };
    });
  }, [analytics]);

  // Filter investments based on ROI filter
  const filteredInvestments = useMemo(() => {
    if (roiFilter === 'all') return investmentsWithROI;
    
    return investmentsWithROI.filter(inv => {
      switch (roiFilter) {
        case 'positive':
          return inv.roi > 0;
        case 'negative':
          return inv.roi < 0;
        case 'above_10':
          return inv.roi > 10;
        case 'above_20':
          return inv.roi > 20;
        default:
          return true;
      }
    });
  }, [investmentsWithROI, roiFilter]);

  const investmentData = filteredInvestments.map(item => ({
    name: item.category,
    value: item.amount,
    currentValue: item.currentValue,
    percentage: item.percentage?.toFixed(1) || '0',
    roi: item.roi,
  }));

  // Calculate totals
  const totals = useMemo(() => {
    const totalInvested = investmentsWithROI.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCurrentValue = investmentsWithROI.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalROI = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;
    const gainLoss = totalCurrentValue - totalInvested;
    
    return { totalInvested, totalCurrentValue, totalROI, gainLoss };
  }, [investmentsWithROI]);

  // Generate enhanced growth data with multiple lines (stable)
  const enhancedGrowthData = useMemo(() => {
    if (!investmentGrowth?.data) return [];
    
    return investmentGrowth.data.map((point, index) => {
      // Use deterministic growth based on index
      const growthFactor = 1 + (seededRandom(index * 42) * 0.1 - 0.02);
      return {
        ...point,
        invested: point.cumulative,
        currentValue: point.cumulative * growthFactor * (1 + index * 0.005),
      };
    });
  }, [investmentGrowth]);

  // Custom tooltip renderer that uses refs to access current state
  const renderGrowthTooltip = (props) => {
    return <GrowthTooltipComponent {...props} showInvested={showInvested} showCurrentValue={showCurrentValue} />;
  };

  if (!investmentData || investmentData.length === 0) {
    return (
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Investment Analytics
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-xs">
              Premium
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Add investments to see your portfolio analytics with ROI tracking
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render the appropriate chart type
  const renderGrowthChart = () => {
    const commonProps = {
      data: enhancedGrowthData,
      margin: { top: 5, right: 20, left: 10, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis 
              dataKey="date" 
              style={{ fontSize: '11px' }}
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis 
              style={{ fontSize: '11px' }}
              tickFormatter={(value) => formatAmount(value)}
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={renderGrowthTooltip} />
            {showInvested && (
              <Area 
                type="monotone" 
                dataKey="invested" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
                name="Total Invested"
              />
            )}
            {showCurrentValue && (
              <Area 
                type="monotone" 
                dataKey="currentValue" 
                stroke="#8b5cf6" 
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
                name="Current Value"
              />
            )}
          </AreaChart>
        );
      
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis 
              dataKey="date" 
              style={{ fontSize: '11px' }}
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis 
              style={{ fontSize: '11px' }}
              tickFormatter={(value) => formatAmount(value)}
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={renderGrowthTooltip} />
            {showInvested && (
              <Bar 
                dataKey="invested" 
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Total Invested"
              />
            )}
            {showCurrentValue && (
              <Line 
                type="monotone" 
                dataKey="currentValue" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 4 }}
                name="Current Value"
              />
            )}
          </ComposedChart>
        );
      
      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis 
              dataKey="date" 
              style={{ fontSize: '11px' }}
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis 
              style={{ fontSize: '11px' }}
              tickFormatter={(value) => formatAmount(value)}
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={renderGrowthTooltip} />
            {showInvested && (
              <Line 
                type="monotone" 
                dataKey="invested" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Total Invested"
              />
            )}
            {showCurrentValue && (
              <Line 
                type="monotone" 
                dataKey="currentValue" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
                strokeDasharray="5 5"
                name="Current Value"
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="investment-analytics">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Invested</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatAmount(totals.totalInvested)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Current Value</p>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{formatAmount(totals.totalCurrentValue)}</p>
          </CardContent>
        </Card>
        
        <Card className={`bg-gradient-to-br ${totals.gainLoss >= 0 ? 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800' : 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800'}`}>
          <CardContent className="p-4">
            <p className={`text-xs font-medium ${totals.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Total Gain/Loss
            </p>
            <p className={`text-xl font-bold flex items-center gap-1 ${totals.gainLoss >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {totals.gainLoss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatAmount(Math.abs(totals.gainLoss))}
            </p>
          </CardContent>
        </Card>
        
        <Card className={`bg-gradient-to-br ${totals.totalROI >= 0 ? 'from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800' : 'from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/30 border-rose-200 dark:border-rose-800'}`}>
          <CardContent className="p-4">
            <p className={`text-xs font-medium ${totals.totalROI >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              Total ROI
            </p>
            <p className={`text-xl font-bold ${totals.totalROI >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
              {formatPercent(totals.totalROI)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Chart with Controls */}
      {enhancedGrowthData.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Investment Growth Over Time
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Track invested vs current value</p>
              </div>
              
              {/* Chart Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Chart Type Selector */}
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-[140px]" data-testid="chart-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Line Toggles */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={showInvested ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInvested(!showInvested)}
                    className={showInvested ? "bg-blue-500 hover:bg-blue-600" : ""}
                    data-testid="toggle-invested-line"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                    Invested
                  </Button>
                  <Button
                    variant={showCurrentValue ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowCurrentValue(!showCurrentValue)}
                    className={showCurrentValue ? "bg-purple-500 hover:bg-purple-600" : ""}
                    data-testid="toggle-current-value-line"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-400 mr-2"></span>
                    Current
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              {renderGrowthChart()}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Investment Distribution with ROI Filter */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Investment Distribution
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Allocation with ROI breakdown</p>
            </div>
            
            {/* ROI Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={roiFilter} onValueChange={setRoiFilter}>
                <SelectTrigger className="w-[180px]" data-testid="roi-filter-select">
                  <SelectValue placeholder="Filter by ROI" />
                </SelectTrigger>
                <SelectContent>
                  {ROI_FILTERS.map(filter => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={investmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {investmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.investments[index % COLORS.investments.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<InvestmentTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* ROI Table */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">ROI by Category</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {investmentData.map((inv, index) => (
                  <div 
                    key={inv.name}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS.investments[index % COLORS.investments.length] }}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{inv.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatAmount(inv.value)} invested
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${inv.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPercent(inv.roi)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatAmount(inv.currentValue)} current
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredInvestments.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No investments match the selected filter
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
