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
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";

const investmentAssets = {
  "Stocks": [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "GOOGL", name: "Alphabet (Google)" },
    { symbol: "MSFT", name: "Microsoft" },
    { symbol: "TSLA", name: "Tesla" },
    { symbol: "AMZN", name: "Amazon" },
    { symbol: "NVDA", name: "NVIDIA" },
    { symbol: "META", name: "Meta (Facebook)" },
    { symbol: "NFLX", name: "Netflix" },
  ],
  "Crypto": [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "SOL", name: "Solana" },
    { symbol: "BNB", name: "Binance Coin" },
    { symbol: "ADA", name: "Cardano" },
    { symbol: "DOT", name: "Polkadot" },
    { symbol: "MATIC", name: "Polygon" },
    { symbol: "AVAX", name: "Avalanche" },
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!category) newErrors.category = "Category is required";
    if (!asset) newErrors.asset = "Asset is required";
    if (!amount) newErrors.amount = "Total amount is required";
    if (!quantity) newErrors.quantity = "Quantity is required";
    if (!purchasePrice) newErrors.purchasePrice = "Purchase price is required";
    if (!date) newErrors.date = "Date is required";

    const numAmount = parseFloat(amount);
    const numQuantity = parseFloat(quantity);
    const numPrice = parseFloat(purchasePrice);

    if (amount && (isNaN(numAmount) || numAmount <= 0)) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }
    if (quantity && (isNaN(numQuantity) || numQuantity <= 0)) {
      newErrors.quantity = "Please enter a valid quantity greater than 0";
    }
    if (purchasePrice && (isNaN(numPrice) || numPrice <= 0)) {
      newErrors.purchasePrice = "Please enter a valid price greater than 0";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields");
      return;
    }

    onAddInvestment({
      type: "investment",
      amount: numAmount,
      description,
      category,
      date,
      asset,
      quantity: numQuantity,
      purchase_price: numPrice,
    });

    // Reset form
    setCategory("");
    setAsset("");
    setAmount("");
    setQuantity("");
    setPurchasePrice("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setErrors({});

    toast.success("Investment added successfully");
  };

  const availableAssets = category ? investmentAssets[category] || [] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Add Investment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investment-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={category} 
                onValueChange={(value) => {
                  setCategory(value);
                  setAsset(""); // Reset asset when category changes
                  setErrors(prev => ({ ...prev, category: "" }));
                }}
              >
                <SelectTrigger 
                  id="investment-category"
                  data-testid="investment-category-select"
                  className={errors.category ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(investmentAssets).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="investment-asset">
                Asset <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={asset} 
                onValueChange={(value) => {
                  setAsset(value);
                  setErrors(prev => ({ ...prev, asset: "" }));
                }}
                disabled={!category}
              >
                <SelectTrigger 
                  id="investment-asset"
                  data-testid="investment-asset-select"
                  className={errors.asset ? "border-destructive" : ""}
                >
                  <SelectValue placeholder={category ? "Select asset" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      {asset.symbol} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.asset && (
                <p className="text-sm text-destructive">{errors.asset}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investment-quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="investment-quantity"
                data-testid="investment-quantity-input"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setErrors(prev => ({ ...prev, quantity: "" }));
                }}
                className={errors.quantity ? "border-destructive" : ""}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="investment-price">
                Price per Unit ($) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="investment-price"
                data-testid="investment-price-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => {
                  setPurchasePrice(e.target.value);
                  setErrors(prev => ({ ...prev, purchasePrice: "" }));
                }}
                className={errors.purchasePrice ? "border-destructive" : ""}
              />
              {errors.purchasePrice && (
                <p className="text-sm text-destructive">{errors.purchasePrice}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="investment-amount">
                Total Amount ($) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="investment-amount"
                data-testid="investment-amount-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors(prev => ({ ...prev, amount: "" }));
                }}
                className={errors.amount ? "border-destructive" : ""}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investment-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="investment-date"
                data-testid="investment-date-input"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors(prev => ({ ...prev, date: "" }));
                }}
                className={errors.date ? "border-destructive" : ""}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="investment-description">
                Description (Optional)
              </Label>
              <Input
                id="investment-description"
                data-testid="investment-description-input"
                placeholder="Add notes (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="investment-submit-btn">
            <TrendingUp className="mr-2 h-4 w-4" />
            Add Investment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
