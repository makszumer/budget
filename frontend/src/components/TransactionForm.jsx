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
import { Plus } from "lucide-react";
import { toast } from "sonner";

const categoryOptions = {
  expense: {
    "Living & Housing": ["Rent / Mortgage", "Utilities", "Home Maintenance / Repairs", "Property Tax", "Home Insurance"],
    "Transportation": ["Car Payment / Lease", "Fuel / Gas", "Public Transport", "Maintenance & Repairs", "Parking & Tolls", "Insurance"],
    "Food & Dining": ["Groceries", "Restaurants / Cafes", "Takeout / Delivery", "Work Lunches / Snacks"],
    "Health & Wellness": ["Health Insurance", "Doctor / Dentist Visits", "Prescriptions", "Gym / Fitness / Sports", "Mental Health Services"],
    "Personal & Lifestyle": ["Clothing & Shoes", "Haircuts / Grooming", "Beauty & Cosmetics", "Hobbies", "Subscriptions"],
    "Family & Education": ["Childcare / School Fees", "Tuition / Courses / Learning Apps", "Pet Care"],
    "Financial Obligations": ["Debt Payments", "Savings / Investments", "Taxes", "Bank Fees"],
    "Entertainment & Leisure": ["Travel / Vacations", "Movies / Concerts / Events", "Gifts & Celebrations"],
    "Miscellaneous": ["Donations / Charity", "Unexpected Expenses", "Other / Uncategorized"],
  },
  income: {
    "👩‍💼 Employment Income": ["Salary / wages", "Overtime / bonuses", "Commissions / tips"],
    "💼 Self-Employment / Business": ["Freelance income", "Business sales", "Consulting / side hustle"],
    "🏦 Transfers & Support": ["Government benefits", "Family support / alimony", "Reimbursements"],
    "🎁 Other Income": ["Gifts", "Lottery / windfalls", "One-time payments"],
  },
  investment: ["Stocks", "Bonds", "Real Estate", "Crypto", "Retirement", "Other"],
};

export const TransactionForm = ({ type, onAddTransaction }) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!amount) newErrors.amount = "Amount is required";
    if (!description) newErrors.description = "Description is required";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{typeLabels[type]}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`amount-${type}`}>
              Amount ($) <span className="text-destructive">*</span>
            </Label>
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
              className={errors.amount ? "border-destructive" : ""}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`description-${type}`}>
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`description-${type}`}
              data-testid={`description-input-${type}`}
              placeholder="Enter description"
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
