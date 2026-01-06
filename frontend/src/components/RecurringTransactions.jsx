import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Play, Pause, Pencil, RefreshCw, Calendar, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const expenseCategories = [
  "Rent / Mortgage", "Utilities", "Car Payment / Lease", "Insurance",
  "Subscriptions", "Gym / Fitness / Sports", "Internet / Phone",
  "Groceries", "Fuel / Gas", "Other / Uncategorized"
];

const incomeCategories = [
  "Salary / wages", "Freelance income", "Rental income", "Dividends",
  "Government benefits", "Other Income"
];

export const RecurringTransactions = ({ currencies = ["USD"] }) => {
  const [recurringList, setRecurringList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    description: "",
    category: "",
    frequency: "monthly",
    day_of_month: "1",
    day_of_week: "0",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    currency: "USD"
  });
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    fetchRecurring();
  }, []);

  const fetchRecurring = async () => {
    try {
      const response = await axios.get(`${API}/recurring-transactions`);
      setRecurringList(response.data);
    } catch (error) {
      console.error("Error fetching recurring transactions:", error);
      toast.error("Failed to load standing orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setProcessing(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        day_of_month: parseInt(formData.day_of_month),
        day_of_week: parseInt(formData.day_of_week),
        end_date: formData.end_date || null
      };
      
      await axios.post(`${API}/recurring-transactions`, payload);
      toast.success("Standing order created successfully");
      
      setFormData({
        type: "expense",
        amount: "",
        description: "",
        category: "",
        frequency: "monthly",
        day_of_month: "1",
        day_of_week: "0",
        start_date: new Date().toISOString().split('T')[0],
        end_date: "",
        currency: "USD"
      });
      setShowForm(false);
      fetchRecurring();
    } catch (error) {
      console.error("Error creating standing order:", error);
      toast.error("Failed to create standing order");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggle = async (id, currentActive) => {
    try {
      await axios.put(`${API}/recurring-transactions/${id}/toggle`);
      setRecurringList(prev => prev.map(item => 
        item.id === id ? { ...item, active: !currentActive } : item
      ));
      toast.success(currentActive ? "Standing order paused" : "Standing order resumed");
    } catch (error) {
      console.error("Error toggling standing order:", error);
      toast.error("Failed to update standing order");
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditFormData({
      amount: item.amount.toString(),
      description: item.description,
      category: item.category,
      frequency: item.frequency,
      day_of_month: (item.day_of_month || 1).toString(),
      day_of_week: (item.day_of_week || 0).toString(),
      end_date: item.end_date || ""
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.amount || !editFormData.description || !editFormData.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setProcessing(true);
    try {
      const payload = {
        amount: parseFloat(editFormData.amount),
        description: editFormData.description,
        category: editFormData.category,
        frequency: editFormData.frequency,
        day_of_month: parseInt(editFormData.day_of_month),
        day_of_week: parseInt(editFormData.day_of_week),
        end_date: editFormData.end_date || null
      };
      
      await axios.put(`${API}/recurring-transactions/${editingItem.id}`, payload);
      toast.success("Standing order updated successfully");
      setEditDialogOpen(false);
      setEditingItem(null);
      fetchRecurring();
    } catch (error) {
      console.error("Error updating standing order:", error);
      toast.error("Failed to update standing order");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    setProcessing(true);
    try {
      await axios.delete(`${API}/recurring-transactions/${itemToDelete.id}`);
      setRecurringList(prev => prev.filter(item => item.id !== itemToDelete.id));
      toast.success("Standing order deleted");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting standing order:", error);
      toast.error("Failed to delete standing order");
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessNow = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/recurring-transactions/process`);
      toast.success(response.data.message);
      fetchRecurring();
    } catch (error) {
      console.error("Error processing standing orders:", error);
      toast.error("Failed to process standing orders");
    } finally {
      setProcessing(false);
    }
  };

  const formatFrequency = (item) => {
    if (item.frequency === "monthly") {
      const day = item.day_of_month || 1;
      const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
      return `Monthly on the ${day}${suffix}`;
    } else if (item.frequency === "weekly") {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      return `Weekly on ${days[item.day_of_week || 0]}`;
    } else if (item.frequency === "daily") {
      return "Daily";
    } else if (item.frequency === "yearly") {
      return "Yearly";
    }
    return item.frequency;
  };

  const getCategoryOptions = (type) => {
    return type === "expense" ? expenseCategories : incomeCategories;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Standing Orders</h1>
          <p className="text-slate-600">
            Manage your recurring expenses and income
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleProcessNow}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Process Now
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Standing Order
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How Standing Orders Work</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Transactions are automatically created on the scheduled day each month</li>
                <li>If the selected day doesn't exist (e.g., 31st in February), the last day of the month is used</li>
                <li>All auto-created transactions are marked with <Badge variant="outline" className="ml-1 text-xs">Standing Order</Badge></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Standing Order</CardTitle>
            <CardDescription>
              Set up a recurring expense or income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({...formData, type: v, category: ""})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="flex-1"
                    />
                    <Select 
                      value={formData.currency} 
                      onValueChange={(v) => setFormData({...formData, currency: v})}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input
                    placeholder="e.g., Netflix, Rent, Gym Membership"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({...formData, category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategoryOptions(formData.type).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(v) => setFormData({...formData, frequency: v})}
                  >
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

                {/* Day of Month (for monthly) */}
                {formData.frequency === "monthly" && (
                  <div className="space-y-2">
                    <Label>Day of Month *</Label>
                    <Select 
                      value={formData.day_of_month} 
                      onValueChange={(v) => setFormData({...formData, day_of_month: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Day of Week (for weekly) */}
                {formData.frequency === "weekly" && (
                  <div className="space-y-2">
                    <Label>Day of Week *</Label>
                    <Select 
                      value={formData.day_of_week} 
                      onValueChange={(v) => setFormData({...formData, day_of_week: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, i) => (
                          <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Start Date */}
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>

                {/* End Date (optional) */}
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={processing}>
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Standing Order
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Standing Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Standing Orders</CardTitle>
          <CardDescription>
            {recurringList.length} standing order{recurringList.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recurringList.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No standing orders yet</p>
              <p className="text-sm text-slate-500">
                Create a standing order to automate recurring expenses like rent, subscriptions, etc.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringList.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg ${
                    item.active === false ? "bg-slate-50 opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.description}</h3>
                        <Badge variant={item.type === "expense" ? "destructive" : "default"}>
                          {item.type}
                        </Badge>
                        {item.active === false && (
                          <Badge variant="outline" className="text-orange-600">
                            Paused
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p className="flex items-center gap-2">
                          <span className={`font-semibold ${item.type === "expense" ? "text-red-600" : "text-green-600"}`}>
                            ${item.amount.toFixed(2)} {item.currency}
                          </span>
                          <span>•</span>
                          <span>{item.category}</span>
                        </p>
                        <p className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3" />
                          {formatFrequency(item)}
                          {item.last_created && (
                            <>
                              <span>•</span>
                              <span>Last created: {new Date(item.last_created).toLocaleDateString()}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(item.id, item.active !== false)}
                        title={item.active === false ? "Resume" : "Pause"}
                      >
                        {item.active === false ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(item)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Standing Order</DialogTitle>
            <DialogDescription>
              Update the details of this recurring transaction
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.amount || ""}
                  onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  value={editFormData.category || ""} 
                  onValueChange={(v) => setEditFormData({...editFormData, category: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategoryOptions(editingItem?.type || "expense").map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={editFormData.description || ""}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select 
                  value={editFormData.frequency || "monthly"} 
                  onValueChange={(v) => setEditFormData({...editFormData, frequency: v})}
                >
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

              {editFormData.frequency === "monthly" && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select 
                    value={editFormData.day_of_month || "1"} 
                    onValueChange={(v) => setEditFormData({...editFormData, day_of_month: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>End Date (leave empty for no end)</Label>
              <Input
                type="date"
                value={editFormData.end_date || ""}
                onChange={(e) => setEditFormData({...editFormData, end_date: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Standing Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{itemToDelete?.description}"? This action cannot be undone.
              Past transactions created by this standing order will remain in your history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
