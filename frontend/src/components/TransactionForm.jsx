import { useState, useEffect } from "react";
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
import { Plus, ArrowRightLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getCurrencySymbol, CURRENCIES } from "@/components/CurrencyPreferences";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categoryOptions = {
  expense: {
    "Living & Housing": ["Rent / Mortgage", "Utilities", "Home Maintenance / Repairs", "Property Tax", "Home Insurance"],
    "Transportation": ["Car Payment / Lease", "Fuel / Gas", "Public Transport", "Maintenance & Repairs", "Parking & Tolls", "Insurance"],
    "Food & Dining": ["Groceries", "Restaurants / Cafes", "Takeout / Delivery", "Work Lunches / Snacks"],
    "Health & Wellness": ["Health Insurance", "Doctor / Dentist Visits", "Prescriptions", "Gym / Fitness / Sports", "Mental Health Services"],
    "Personal & Lifestyle": ["Clothing & Shoes", "Haircuts / Grooming", "Beauty & Cosmetics", "Hobbies", "Subscriptions"],
    "Family & Education": ["Childcare / School Fees", "Tuition / Courses / Learning Apps", "Pet Care"],
    "Financial Obligations": ["Debt Payments", "Savings / Investments", "Taxes", "Bank Fees", "Budget Allocation / Envelope Transfer"],
    "Entertainment & Leisure": ["Travel / Vacations", "Movies / Concerts / Events", "Gifts & Celebrations"],
    "Miscellaneous": ["Donations / Charity", "Unexpected Expenses", "Other / Uncategorized"],
  },
  income: {
    "Employment Income": ["Salary / wages", "Overtime / bonuses", "Commissions / tips"],
    "Self-Employment / Business": ["Freelance income", "Business sales", "Consulting / side hustle"],
    "Transfers & Support": ["Government benefits", "Family support / alimony", "Reimbursements"],
    "Other Income": ["Gifts", "Lottery / windfalls", "One-time payments"],
  },
  investment: ["Stocks", "Bonds", "Real Estate", "Crypto", "Retirement", "Other"],
};

export const TransactionForm = ({ type, onAddTransaction }) => {
  const { token, primaryCurrency } = useAuth();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState({});
  const [customCategories, setCustomCategories] = useState([]);
  
  // Multi-currency state
  const [showCurrencyConversion, setShowCurrencyConversion] = useState(false);
  const [foreignCurrency, setForeignCurrency] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [conversionPreview, setConversionPreview] = useState(null);

  // Fetch custom categories on mount
  useEffect(() => {
    const fetchCustomCategories = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${API}/categories/custom`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCustomCategories(response.data);
      } catch (error) {
        console.error('Error fetching custom categories:', error);
      }
    };
    fetchCustomCategories();
  }, [token]);

  // Filter custom categories by type
  const userCustomCategories = customCategories.filter(cat => cat.type === type);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!amount) newErrors.amount = "Amount is required";
    if (!category) newErrors.category = "Category is required";
    if (!date) newErrors.date = "Date is required";

    const numAmount = parseFloat(amount);
    if (amount && (isNaN(numAmount) || numAmount <= 0)) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields");
      return;
    }

    onAddTransaction({
      type,
      amount: numAmount,
      description,
      category,
      date,
      currency: primaryCurrency, // Always use primary currency
    });

    // Reset form
    setAmount("");
    setDescription("");
    setCategory("");
    setDate(new Date().toISOString().split("T")[0]);
    setErrors({});

    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`);
  };

  const typeLabels = {
    expense: "Add Expense",
    income: "Add Income",
    investment: "Add Investment",
  };

  const currencySymbol = getCurrencySymbol(primaryCurrency);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{typeLabels[type]}</CardTitle>
          <span className="text-sm text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {currencySymbol} {primaryCurrency}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`amount-${type}`}>
              Amount ({currencySymbol}) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id={`amount-${type}`}
                data-testid={`amount-input-${type}`}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors(prev => ({ ...prev, amount: "" }));
                }}
                className={`pl-8 ${errors.amount ? "border-destructive" : ""}`}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`description-${type}`}>
              Description (Optional)
            </Label>
            <Input
              id={`description-${type}`}
              data-testid={`description-input-${type}`}
              placeholder="Add notes (optional)"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors(prev => ({ ...prev, description: "" }));
              }}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`category-${type}`}>
              Category <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={category} 
              onValueChange={(value) => {
                setCategory(value);
                setErrors(prev => ({ ...prev, category: "" }));
              }}
            >
              <SelectTrigger 
                id={`category-${type}`}
                data-testid={`category-select-${type}`}
                className={errors.category ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {/* Custom Categories Section */}
                {userCustomCategories.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-purple-600 font-semibold">✨ Custom Categories</SelectLabel>
                    {userCustomCategories.map((cat) => (
                      <SelectItem key={`custom-${cat.id}`} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                
                {/* Default Categories */}
                {(type === "expense" || type === "income") ? (
                  Object.entries(categoryOptions[type]).map(([group, items]) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {items.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                ) : (
                  categoryOptions[type].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`date-${type}`}>
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`date-${type}`}
              data-testid={`date-input-${type}`}
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

          <Button type="submit" className="w-full" data-testid={`submit-btn-${type}`}>
            <Plus className="mr-2 h-4 w-4" />
            Add {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
