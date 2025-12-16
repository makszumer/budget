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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Save } from "lucide-react";

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
    "Employment Income": ["Salary / wages", "Overtime / bonuses", "Commissions / tips"],
    "Self-Employment / Business": ["Freelance income", "Business sales", "Consulting / side hustle"],
    "Transfers & Support": ["Government benefits", "Family support / alimony", "Reimbursements"],
    "Other Income": ["Gifts", "Lottery / windfalls", "One-time payments"],
  },
};

export const EditTransactionModal = ({ transaction, open, onClose, onSave, currencies = ["USD", "EUR", "GBP"] }) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (transaction && open) {
      setAmount(transaction.amount.toString());
      setDescription(transaction.description || "");
      setCategory(transaction.category);
      setDate(transaction.date);
      setCurrency(transaction.currency || "USD");
      setErrors({});
    }
  }, [transaction, open]);

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
      return;
    }

    onSave({
      ...transaction,
      amount: numAmount,
      description,
      category,
      date,
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-amount">
              Amount ($) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-amount"
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
            <Label htmlFor="edit-description">
              Description (Optional)
            </Label>
            <Input
              id="edit-description"
              placeholder="Add notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">
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
                id="edit-category"
                className={errors.category ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {transaction.type === "expense" || transaction.type === "income" ? (
                  Object.entries(categoryOptions[transaction.type]).map(([group, items]) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {items.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                ) : null}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-date"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
