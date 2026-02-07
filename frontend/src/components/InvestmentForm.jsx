import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Search } from "lucide-react";
import { toast } from "sonner";

// ========== COMPREHENSIVE INVESTMENT ASSETS ==========

const investmentAssets = {
  "ETFs": [
    // Top 25 ETFs by AUM
    { symbol: "VOO", name: "Vanguard S&P 500 ETF" },
    { symbol: "IVV", name: "iShares Core S&P 500 ETF" },
    { symbol: "SPY", name: "State Street SPDR S&P 500 ETF Trust" },
    { symbol: "VTI", name: "Vanguard Total Stock Market ETF" },
    { symbol: "QQQ", name: "Invesco QQQ Trust Series I" },
    { symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF" },
    { symbol: "VUG", name: "Vanguard Growth ETF" },
    { symbol: "GLD", name: "SPDR Gold Shares" },
    { symbol: "IEFA", name: "iShares Core MSCI EAFE ETF" },
    { symbol: "VTV", name: "Vanguard Value ETF" },
    { symbol: "BND", name: "Vanguard Total Bond Market ETF" },
    { symbol: "IEMG", name: "iShares Core MSCI Emerging Markets ETF" },
    { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF" },
    { symbol: "VXUS", name: "Vanguard Total International Stock ETF" },
    { symbol: "IWF", name: "iShares Russell 1000 Growth ETF" },
    { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF" },
    { symbol: "VGT", name: "Vanguard Information Technology ETF" },
    { symbol: "IJH", name: "iShares Core S&P Mid-Cap ETF" },
    { symbol: "SPYM", name: "State Street SPDR Portfolio S&P 500 ETF" },
    { symbol: "VIG", name: "Vanguard Dividend Appreciation ETF" },
    { symbol: "IJR", name: "iShares Core S&P Small-Cap ETF" },
    { symbol: "VO", name: "Vanguard Mid-Cap ETF" },
    { symbol: "XLK", name: "State Street Technology Select Sector SPDR ETF" },
    { symbol: "ITOT", name: "iShares Core S&P Total U.S. Stock Market ETF" },
    { symbol: "RSP", name: "Invesco S&P 500 Equal Weight ETF" },
  ],
  "Stocks": [
    // Top 100 Stocks by Market Cap
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corporation" },
    { symbol: "GOOGL", name: "Alphabet Inc. (Google)" },
    { symbol: "AMZN", name: "Amazon.com Inc." },
    { symbol: "NVDA", name: "NVIDIA Corporation" },
    { symbol: "META", name: "Meta Platforms Inc." },
    { symbol: "BRK.B", name: "Berkshire Hathaway Inc." },
    { symbol: "TSLA", name: "Tesla Inc." },
    { symbol: "LLY", name: "Eli Lilly and Company" },
    { symbol: "V", name: "Visa Inc." },
    { symbol: "UNH", name: "UnitedHealth Group Inc." },
    { symbol: "JPM", name: "JPMorgan Chase & Co." },
    { symbol: "XOM", name: "Exxon Mobil Corporation" },
    { symbol: "JNJ", name: "Johnson & Johnson" },
    { symbol: "WMT", name: "Walmart Inc." },
    { symbol: "MA", name: "Mastercard Inc." },
    { symbol: "PG", name: "Procter & Gamble Co." },
    { symbol: "AVGO", name: "Broadcom Inc." },
    { symbol: "HD", name: "The Home Depot Inc." },
    { symbol: "CVX", name: "Chevron Corporation" },
    { symbol: "MRK", name: "Merck & Co. Inc." },
    { symbol: "COST", name: "Costco Wholesale Corporation" },
    { symbol: "ABBV", name: "AbbVie Inc." },
    { symbol: "KO", name: "The Coca-Cola Company" },
    { symbol: "PEP", name: "PepsiCo Inc." },
    { symbol: "ADBE", name: "Adobe Inc." },
    { symbol: "CRM", name: "Salesforce Inc." },
    { symbol: "TMO", name: "Thermo Fisher Scientific Inc." },
    { symbol: "BAC", name: "Bank of America Corporation" },
    { symbol: "NFLX", name: "Netflix Inc." },
    { symbol: "ACN", name: "Accenture plc" },
    { symbol: "MCD", name: "McDonald's Corporation" },
    { symbol: "AMD", name: "Advanced Micro Devices Inc." },
    { symbol: "CSCO", name: "Cisco Systems Inc." },
    { symbol: "LIN", name: "Linde plc" },
    { symbol: "ABT", name: "Abbott Laboratories" },
    { symbol: "ORCL", name: "Oracle Corporation" },
    { symbol: "DHR", name: "Danaher Corporation" },
    { symbol: "INTC", name: "Intel Corporation" },
    { symbol: "WFC", name: "Wells Fargo & Company" },
    { symbol: "NKE", name: "NIKE Inc." },
    { symbol: "DIS", name: "The Walt Disney Company" },
    { symbol: "TXN", name: "Texas Instruments Inc." },
    { symbol: "PM", name: "Philip Morris International Inc." },
    { symbol: "VZ", name: "Verizon Communications Inc." },
    { symbol: "CMCSA", name: "Comcast Corporation" },
    { symbol: "COP", name: "ConocoPhillips" },
    { symbol: "NEE", name: "NextEra Energy Inc." },
    { symbol: "RTX", name: "RTX Corporation" },
    { symbol: "QCOM", name: "Qualcomm Inc." },
    { symbol: "IBM", name: "International Business Machines" },
    { symbol: "LOW", name: "Lowe's Companies Inc." },
    { symbol: "UNP", name: "Union Pacific Corporation" },
    { symbol: "SPGI", name: "S&P Global Inc." },
    { symbol: "HON", name: "Honeywell International Inc." },
    { symbol: "BA", name: "The Boeing Company" },
    { symbol: "INTU", name: "Intuit Inc." },
    { symbol: "GE", name: "General Electric Company" },
    { symbol: "ISRG", name: "Intuitive Surgical Inc." },
    { symbol: "CAT", name: "Caterpillar Inc." },
    { symbol: "AMAT", name: "Applied Materials Inc." },
    { symbol: "BMY", name: "Bristol-Myers Squibb Company" },
    { symbol: "GS", name: "The Goldman Sachs Group Inc." },
    { symbol: "PFE", name: "Pfizer Inc." },
    { symbol: "BKNG", name: "Booking Holdings Inc." },
    { symbol: "NOW", name: "ServiceNow Inc." },
    { symbol: "T", name: "AT&T Inc." },
    { symbol: "AXP", name: "American Express Company" },
    { symbol: "BLK", name: "BlackRock Inc." },
    { symbol: "SYK", name: "Stryker Corporation" },
    { symbol: "MDLZ", name: "Mondelez International Inc." },
    { symbol: "SBUX", name: "Starbucks Corporation" },
    { symbol: "DE", name: "Deere & Company" },
    { symbol: "MMC", name: "Marsh & McLennan Companies" },
    { symbol: "ELV", name: "Elevance Health Inc." },
    { symbol: "GILD", name: "Gilead Sciences Inc." },
    { symbol: "ADI", name: "Analog Devices Inc." },
    { symbol: "LMT", name: "Lockheed Martin Corporation" },
    { symbol: "TJX", name: "The TJX Companies Inc." },
    { symbol: "VRTX", name: "Vertex Pharmaceuticals Inc." },
    { symbol: "PLD", name: "Prologis Inc." },
    { symbol: "CVS", name: "CVS Health Corporation" },
    { symbol: "MO", name: "Altria Group Inc." },
    { symbol: "AMT", name: "American Tower Corporation" },
    { symbol: "CI", name: "The Cigna Group" },
    { symbol: "REGN", name: "Regeneron Pharmaceuticals Inc." },
    { symbol: "MS", name: "Morgan Stanley" },
    { symbol: "ETN", name: "Eaton Corporation plc" },
    { symbol: "ZTS", name: "Zoetis Inc." },
    { symbol: "CB", name: "Chubb Limited" },
    { symbol: "ADP", name: "Automatic Data Processing Inc." },
    { symbol: "LRCX", name: "Lam Research Corporation" },
    { symbol: "SCHW", name: "The Charles Schwab Corporation" },
    { symbol: "SO", name: "The Southern Company" },
    { symbol: "PANW", name: "Palo Alto Networks Inc." },
    { symbol: "DUK", name: "Duke Energy Corporation" },
    { symbol: "MU", name: "Micron Technology Inc." },
    { symbol: "FI", name: "Fiserv Inc." },
    { symbol: "BSX", name: "Boston Scientific Corporation" },
    { symbol: "SLB", name: "Schlumberger Limited" },
  ],
  "Crypto": [
    // Top 25 Cryptocurrencies by Market Cap
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "BNB", name: "Binance Coin" },
    { symbol: "SOL", name: "Solana" },
    { symbol: "XRP", name: "Ripple" },
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "ADA", name: "Cardano" },
    { symbol: "DOGE", name: "Dogecoin" },
    { symbol: "TRX", name: "TRON" },
    { symbol: "AVAX", name: "Avalanche" },
    { symbol: "LINK", name: "Chainlink" },
    { symbol: "SHIB", name: "Shiba Inu" },
    { symbol: "DOT", name: "Polkadot" },
    { symbol: "TON", name: "Toncoin" },
    { symbol: "MATIC", name: "Polygon" },
    { symbol: "BCH", name: "Bitcoin Cash" },
    { symbol: "LTC", name: "Litecoin" },
    { symbol: "NEAR", name: "NEAR Protocol" },
    { symbol: "UNI", name: "Uniswap" },
    { symbol: "ICP", name: "Internet Computer" },
    { symbol: "APT", name: "Aptos" },
    { symbol: "ETC", name: "Ethereum Classic" },
    { symbol: "STX", name: "Stacks" },
    { symbol: "FIL", name: "Filecoin" },
  ],
  "Real Estate": [
    { symbol: "RESIDENTIAL", name: "Residential Property" },
    { symbol: "COMMERCIAL", name: "Commercial Property" },
    { symbol: "REIT", name: "Real Estate Investment Trust" },
    { symbol: "LAND", name: "Land" },
  ],
  "Bonds": [
    { symbol: "US-TREASURY", name: "US Treasury Bonds" },
    { symbol: "CORPORATE", name: "Corporate Bonds" },
    { symbol: "MUNICIPAL", name: "Municipal Bonds" },
    { symbol: "INTERNATIONAL", name: "International Bonds" },
  ],
  "Retirement": [
    { symbol: "401K", name: "401(k)" },
    { symbol: "IRA", name: "Traditional IRA" },
    { symbol: "ROTH-IRA", name: "Roth IRA" },
    { symbol: "PENSION", name: "Pension Fund" },
  ],
  "Other": [
    { symbol: "COMMODITIES", name: "Commodities" },
    { symbol: "PRECIOUS-METALS", name: "Precious Metals" },
    { symbol: "COLLECTIBLES", name: "Collectibles" },
    { symbol: "OTHER", name: "Other Investment" },
  ],
};

export const InvestmentForm = ({ onAddInvestment }) => {
  const [category, setCategory] = useState("");
  const [asset, setAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState({});
  const [assetSearch, setAssetSearch] = useState("");

  // Filter assets based on search
  const getFilteredAssets = () => {
    if (!category || !investmentAssets[category]) return [];
    
    const assets = investmentAssets[category];
    if (!assetSearch.trim()) return assets;
    
    const searchLower = assetSearch.toLowerCase();
    return assets.filter(
      a => a.symbol.toLowerCase().includes(searchLower) || 
           a.name.toLowerCase().includes(searchLower)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!category) newErrors.category = "Category is required";
    if (!asset) newErrors.asset = "Asset is required";
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      newErrors.amount = "Valid amount required";
    }
    if (!date) newErrors.date = "Date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Find asset details
    const assetDetails = investmentAssets[category]?.find(a => a.symbol === asset);
    
    onAddInvestment({
      type: "investment",
      category,
      asset,
      amount: parseFloat(amount),
      quantity: quantity ? parseFloat(quantity) : null,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      description: description || `Investment in ${assetDetails?.name || asset}`,
      date,
    });

    // Reset form
    setCategory("");
    setAsset("");
    setAmount("");
    setQuantity("");
    setPurchasePrice("");
    setDescription("");
    setAssetSearch("");
    setDate(new Date().toISOString().split("T")[0]);
    setErrors({});
    toast.success("Investment recorded successfully!");
  };

  const selectedAsset = category && asset 
    ? investmentAssets[category]?.find(a => a.symbol === asset) 
    : null;

  const filteredAssets = getFilteredAssets();
  const showSearchHint = category && (category === "Stocks" || category === "ETFs" || category === "Crypto");

  return (
    <Card className="w-full" data-testid="investment-form">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Record Investment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(val) => {
                setCategory(val);
                setAsset("");
                setAssetSearch("");
              }}
            >
              <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(investmentAssets).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({investmentAssets[cat].length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Asset Selection with Search */}
          {category && (
            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              
              {/* Search input for large categories */}
              {showSearchHint && (
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={`Search ${category}...`}
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              )}
              
              <Select
                value={asset}
                onValueChange={setAsset}
              >
                <SelectTrigger className={errors.asset ? "border-red-500" : ""}>
                  <SelectValue placeholder={`Select ${category.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectGroup>
                    <SelectLabel>{category} ({filteredAssets.length})</SelectLabel>
                    {filteredAssets.map((a) => (
                      <SelectItem key={a.symbol} value={a.symbol}>
                        <span className="font-medium">{a.symbol}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                    {filteredAssets.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No assets found matching "{assetSearch}"
                      </div>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.asset && (
                <p className="text-xs text-red-500">{errors.asset}</p>
              )}
              {selectedAsset && (
                <p className="text-xs text-muted-foreground">
                  {selectedAsset.name}
                </p>
              )}
            </div>
          )}

          {/* Amount and Quantity Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="1000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (optional)</Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                min="0"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* Purchase Price */}
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Price per Unit (optional)</Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="100.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={errors.date ? "border-red-500" : ""}
            />
            {errors.date && (
              <p className="text-xs text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Input
              id="description"
              placeholder="Additional notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Record Investment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
