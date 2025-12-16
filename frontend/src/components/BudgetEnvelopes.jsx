import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnvelopeDetail } from "@/components/EnvelopeDetail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";
import { Plus, Target, DollarSign, Edit, Trash2, TrendingUp, Wallet } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const BudgetEnvelopes = ({ currencies }) => {
  const [envelopes, setEnvelopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [selectedEnvelope, setSelectedEnvelope] = useState(null);
  const [viewingEnvelope, setViewingEnvelope] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: 0,
    currency: "USD",
    description: "",
  });

  const [allocateAmount, setAllocateAmount] = useState("");

  useEffect(() => {
    fetchEnvelopes();
  }, []);

  const fetchEnvelopes = async () => {
    try {
      const response = await axios.get(`${API}/budget-envelopes`);
      setEnvelopes(response.data);
    } catch (error) {
      console.error("Error fetching envelopes:", error);
      toast.error("Failed to load budget envelopes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.target_amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await axios.post(`${API}/budget-envelopes`, {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        current_amount: 0,
      });
      
      toast.success("Budget envelope created successfully!");
      setDialogOpen(false);
      setFormData({
        name: "",
        target_amount: "",
        current_amount: 0,
        currency: "USD",
        description: "",
      });
      fetchEnvelopes();
    } catch (error) {
      console.error("Error creating envelope:", error);
      toast.error("Failed to create budget envelope");
    }
  };

  const handleAllocate = async () => {
    if (!allocateAmount || parseFloat(allocateAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await axios.post(`${API}/budget-envelopes/${selectedEnvelope.id}/allocate`, {
        amount: parseFloat(allocateAmount),
      });
      
      toast.success("Money allocated successfully!");
      setAllocateDialogOpen(false);
      setAllocateAmount("");
      setSelectedEnvelope(null);
      fetchEnvelopes();
    } catch (error) {
      console.error("Error allocating money:", error);
      toast.error("Failed to allocate money");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this budget envelope?")) {
      return;
    }

    try {
      await axios.delete(`${API}/budget-envelopes/${id}`);
      toast.success("Budget envelope deleted");
      fetchEnvelopes();
    } catch (error) {
      console.error("Error deleting envelope:", error);
      toast.error("Failed to delete budget envelope");
    }
  };

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show envelope detail view
  if (viewingEnvelope) {
    return (
      <EnvelopeDetail
        envelope={viewingEnvelope}
        onBack={() => setViewingEnvelope(null)}
        onUpdate={fetchEnvelopes}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Budget Envelopes
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Set specific budgets for goals like vacations, savings, etc.
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Envelope
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Budget Envelope</DialogTitle>
                  <DialogDescription>
                    Set up a dedicated budget for a specific goal
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Miami Vacation, Madrid Trip"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target">Target Amount *</Label>
                    <Input
                      id="target"
                      type="number"
                      step="0.01"
                      placeholder="4000"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      className="w-full px-3 py-2 border rounded-md"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      {currencies.map((curr) => (
                        <option key={curr} value={curr}>
                          {curr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="Two weeks in Miami"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Create Envelope
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {envelopes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Budget Envelopes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first envelope to start saving for specific goals
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Envelope
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {envelopes.map((envelope) => {
            const progress = calculateProgress(envelope.current_amount, envelope.target_amount);
            const remaining = envelope.target_amount - envelope.current_amount;
            
            return (
              <Card 
                key={envelope.id} 
                className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setViewingEnvelope(envelope)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{envelope.name}</CardTitle>
                      {envelope.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {envelope.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(envelope.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current</span>
                      <span className="font-bold text-green-600">
                        {envelope.currency} {envelope.current_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Target</span>
                      <span className="font-bold text-blue-600">
                        {envelope.currency} {envelope.target_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Remaining</span>
                      <span className="font-bold text-orange-600">
                        {envelope.currency} {Math.max(remaining, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Allocate Button */}
                  <Button
                    className="w-full"
                    variant={progress >= 100 ? "outline" : "default"}
                    onClick={() => {
                      setSelectedEnvelope(envelope);
                      setAllocateDialogOpen(true);
                    }}
                    disabled={progress >= 100}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {progress >= 100 ? "Goal Reached! 🎉" : "Allocate Money"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Allocate Money Dialog */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Money</DialogTitle>
            <DialogDescription>
              Add money to: {selectedEnvelope?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allocate">Amount</Label>
              <Input
                id="allocate"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={allocateAmount}
                onChange={(e) => setAllocateAmount(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Currency: {selectedEnvelope?.currency}
              </p>
            </div>
            <Button onClick={handleAllocate} className="w-full">
              Allocate {allocateAmount} {selectedEnvelope?.currency}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
