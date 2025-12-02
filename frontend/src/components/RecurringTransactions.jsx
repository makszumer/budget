import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, Power, PowerOff, Plus } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categoryOptions = {
  expense: {
    "Living & Housing": ["Rent / Mortgage", "Utilities", "Home Insurance"],
    "Transportation": ["Car Payment / Lease", "Insurance"],
    "Health & Wellness": ["Health Insurance", "Gym / Fitness / Sports"],
    "Personal & Lifestyle": ["Subscriptions"],
    "Financial Obligations": ["Debt Payments"],
  },
  income: {
    "Employment Income": ["Salary / wages"],
    "Other Income": ["Recurring payments"],
  },
};

export const RecurringTransactions = ({ currencies }) => {
  const [recurring, setRecurring] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    category: "",
    currency: "USD",
    frequency: "monthly",
    day_of_month: "1",
    day_of_week: "0",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  useEffect(() => {
    fetchRecurring();
  }, []);

  const fetchRecurring = async () => {
    try {
      const response = await axios.get(`${API}/recurring-transactions`);
      setRecurring(response.data);
    } catch (error) {
      console.error("Error fetching recurring transactions:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/recurring-transactions`, {
        ...formData,
        amount: parseFloat(formData.amount),
        day_of_month: formData.frequency === "monthly" ? parseInt(formData.day_of_month) : null,
        day_of_week: formData.frequency === "weekly" ? parseInt(formData.day_of_week) : null,
        end_date: formData.end_date || null,
      });
      
      toast.success("Standing order created");
      setShowForm(false);
      setFormData({
        type: "expense",
        amount: "",
        description: "",
        category: "",
        currency: "USD",
        frequency: "monthly",
        day_of_month: "1",
        day_of_week: "0",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
      });
      fetchRecurring();
    } catch (error) {
      toast.error("Failed to create standing order");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/recurring-transactions/${id}`);
      toast.success("Standing order deleted");
      fetchRecurring();
    } catch (error) {
      toast.error("Failed to delete standing order");
    }
  };

  const handleToggle = async (id) => {
    try {
      await axios.put(`${API}/recurring-transactions/${id}/toggle`);
      toast.success("Standing order updated");
      fetchRecurring();
    } catch (error) {
      toast.error("Failed to update standing order");
    }
  };

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Standing Orders / Recurring Payments</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically create transactions on schedule
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Standing Order
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value, category: ""})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(curr => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="e.g., Netflix, Gym membership"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryOptions[formData.type]).map(([group, items]) => (
                        <SelectGroup key={group}>
                          <SelectLabel>{group}</SelectLabel>
                          {items.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData({...formData, frequency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.frequency === "monthly" && (
                  <div className="space-y-2">
                    <Label>Day of Month (1-31)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({...formData, day_of_month: e.target.value})}
                    />
                  </div>
                )}

                {formData.frequency === "weekly" && (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select value={formData.day_of_week} onValueChange={(value) => setFormData({...formData, day_of_week: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Monday</SelectItem>
                        <SelectItem value="1">Tuesday</SelectItem>
                        <SelectItem value="2">Wednesday</SelectItem>
                        <SelectItem value="3">Thursday</SelectItem>
                        <SelectItem value="4">Friday</SelectItem>
                        <SelectItem value="5">Saturday</SelectItem>
                        <SelectItem value="6">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Standing Order</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {recurring.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No standing orders yet. Create one to automate your recurring transactions!
            </p>
          ) : (
            <div className="space-y-3">
              {recurring.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{rec.description}</span>
                      <Badge variant={rec.type === "income" ? "default" : "destructive"}>
                        {rec.type}
                      </Badge>
                      <Badge variant="outline">{rec.frequency}</Badge>
                      {!rec.active && <Badge variant="secondary">Paused</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rec.category} • {formatAmount(rec.amount, rec.currency)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(rec.id)}
                      title={rec.active ? "Pause" : "Activate"}
                    >
                      {rec.active ? <Power className="h-4 w-4 text-green-600" /> : <PowerOff className="h-4 w-4 text-gray-400" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rec.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
