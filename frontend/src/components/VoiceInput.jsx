import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Loader2, HelpCircle, Search, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// First-time instructions modal component
const VoiceInstructionsModal = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            How to Use Voice Input
          </DialogTitle>
          <DialogDescription>
            Speak naturally to add transactions. Here are some examples:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Income Examples */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-600 flex items-center gap-2">
              💰 For Income (money coming in):
            </h4>
            <div className="bg-green-50 p-3 rounded-lg space-y-1.5 text-sm">
              <p className="text-slate-700">"I <strong>earned</strong> 500 dollars from salary"</p>
              <p className="text-slate-700">"<strong>Received</strong> 100 dollars in tips"</p>
              <p className="text-slate-700">"<strong>Got paid</strong> 2000 dollars"</p>
            </div>
          </div>
          
          {/* Expense Examples */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
              💸 For Expenses (money going out):
            </h4>
            <div className="bg-red-50 p-3 rounded-lg space-y-1.5 text-sm">
              <p className="text-slate-700">"I <strong>spent</strong> 50 dollars on groceries"</p>
              <p className="text-slate-700">"<strong>Paid</strong> 30 dollars for gas"</p>
              <p className="text-slate-700">"<strong>Bought</strong> coffee for 5 dollars"</p>
            </div>
          </div>
          
          {/* Tips */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Use keywords like "earned", "received", "got paid" for income, 
              and "spent", "paid", "bought" for expenses. I'll always ask you to confirm the category!
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Got it, let's start!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Searchable Category Selector Component
const CategorySelector = ({ 
  allCategories, 
  matchedCategories, 
  selectedCategory, 
  onSelect,
  transactionType 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  
  // Flatten all categories for searching
  const flatCategories = useMemo(() => {
    const result = [];
    if (allCategories) {
      Object.entries(allCategories).forEach(([group, items]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            result.push({ group, name: item });
          });
        }
      });
    }
    return result;
  }, [allCategories]);
  
  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return allCategories;
    
    const query = searchQuery.toLowerCase();
    const filtered = {};
    
    Object.entries(allCategories || {}).forEach(([group, items]) => {
      if (Array.isArray(items)) {
        const matchingItems = items.filter(item => 
          item.toLowerCase().includes(query)
        );
        if (matchingItems.length > 0) {
          filtered[group] = matchingItems;
        }
      }
    });
    
    return filtered;
  }, [allCategories, searchQuery]);
  
  const hasResults = Object.keys(filteredCategories || {}).length > 0;
  
  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {/* Matched Categories (Best Matches) */}
      {matchedCategories && matchedCategories.length > 0 && !searchQuery && (
        <div className="space-y-2">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Best Matches</Label>
          <div className="flex flex-wrap gap-2">
            {matchedCategories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedCategory === cat 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-slate-100"
                }`}
                onClick={() => onSelect(cat)}
              >
                {selectedCategory === cat && <Check className="h-3 w-3 mr-1" />}
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* All Categories */}
      <ScrollArea className="h-[250px] rounded-md border p-2">
        {hasResults ? (
          Object.entries(filteredCategories).map(([group, items]) => (
            <div key={group} className="mb-4 last:mb-0">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                {group === "Custom Categories" ? "✨ " + group : group}
              </Label>
              <div className="space-y-1">
                {Array.isArray(items) && items.map((item) => (
                  <button
                    key={item}
                    onClick={() => onSelect(item)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center justify-between ${
                      selectedCategory === item
                        ? "bg-blue-100 text-blue-800 font-medium"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>{item}</span>
                    {selectedCategory === item && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No categories found for "{searchQuery}"</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export const VoiceInput = ({ onTransactionCreated }) => {
  const { token, user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);
  
  // Instructions modal state
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasSeenInstructions, setHasSeenInstructions] = useState(false);
  
  // Type clarification state (income vs expense)
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [pendingTypeData, setPendingTypeData] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  
  // Category clarification state
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [allCategories, setAllCategories] = useState(null);
  const [matchedCategories, setMatchedCategories] = useState([]);

  useEffect(() => {
    // Check if user has seen instructions
    const seen = localStorage.getItem('voiceInstructionsSeen');
    setHasSeenInstructions(seen === 'true');
    
    // Setup speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        await processVoiceInput(text);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error("Could not understand. Please try again.");
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const processVoiceInput = async (text) => {
    setProcessing(true);
    
    try {
      const response = await axios.post(`${API}/parse-voice-transaction`, {
        text: text,
        user_id: user?.id || null
      });

      const result = response.data;
      
      if (result.needs_type_clarification) {
        // Need to ask: income or expense?
        setPendingTypeData({
          amount: result.parsed_amount,
          description: result.parsed_description,
          originalText: text
        });
        setSelectedType("");
        setTypeDialogOpen(true);
      } else if (result.needs_clarification) {
        // Need user to confirm category - ALWAYS happens now
        setPendingTransaction({
          amount: result.parsed_amount,
          type: result.parsed_type,
          description: result.parsed_description,
        });
        setAllCategories(result.all_categories || {});
        setMatchedCategories(result.matched_categories || []);
        setSelectedCategory("");
        setClarificationOpen(true);
      } else if (result.success && result.data) {
        // Direct success (shouldn't happen anymore with new logic)
        await onTransactionCreated(result.data);
        toast.success(`${result.data.type.charAt(0).toUpperCase() + result.data.type.slice(1)} of $${result.data.amount} added!`);
      } else {
        toast.error(result.message || "Could not understand the transaction");
      }
    } catch (error) {
      console.error("Error processing voice input:", error);
      toast.error("Failed to process voice input");
    } finally {
      setProcessing(false);
      setTranscript("");
    }
  };

  // Handle type selection (income vs expense)
  const handleTypeConfirm = async () => {
    if (!selectedType || !pendingTypeData) {
      toast.error("Please select income or expense");
      return;
    }

    setTypeDialogOpen(false);
    setProcessing(true);
    
    try {
      // Re-process with the selected type hint
      const enhancedText = selectedType === "income" 
        ? `earned ${pendingTypeData.amount} dollars ${pendingTypeData.description || ''}`
        : `spent ${pendingTypeData.amount} dollars ${pendingTypeData.description || ''}`;
      
      const response = await axios.post(`${API}/parse-voice-transaction`, {
        text: enhancedText,
        user_id: user?.id || null
      });

      const result = response.data;
      
      if (result.needs_clarification) {
        // Now need category confirmation
        setPendingTransaction({
          amount: result.parsed_amount,
          type: selectedType,
          description: result.parsed_description,
        });
        setAllCategories(result.all_categories || {});
        setMatchedCategories(result.matched_categories || []);
        setSelectedCategory("");
        setClarificationOpen(true);
      } else {
        toast.error(result.message || "Failed to process");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to process transaction");
    } finally {
      setProcessing(false);
      setPendingTypeData(null);
      setSelectedType("");
    }
  };

  const handleClarificationConfirm = async () => {
    if (!selectedCategory || !pendingTransaction) {
      toast.error("Please select a category");
      return;
    }

    setProcessing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const transactionData = {
        type: pendingTransaction.type,
        amount: pendingTransaction.amount,
        description: pendingTransaction.description || `${pendingTransaction.type} via voice`,
        category: selectedCategory,
        date: today,
        currency: "USD"
      };
      
      await onTransactionCreated(transactionData);
      toast.success(`${transactionData.type.charAt(0).toUpperCase() + transactionData.type.slice(1)} of $${transactionData.amount} added!`);
      setClarificationOpen(false);
      setPendingTransaction(null);
      setSelectedCategory("");
      setAllCategories(null);
      setMatchedCategories([]);
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to create transaction");
    } finally {
      setProcessing(false);
    }
  };

  const handleClarificationCancel = () => {
    setClarificationOpen(false);
    setTypeDialogOpen(false);
    setPendingTransaction(null);
    setPendingTypeData(null);
    setSelectedCategory("");
    setSelectedType("");
    setAllCategories(null);
    setMatchedCategories([]);
    toast.info("Transaction cancelled");
  };

  const startListening = () => {
    // Show instructions on first use
    if (!hasSeenInstructions) {
      setShowInstructions(true);
      return;
    }
    
    if (!recognition) {
      toast.error("Voice input not supported in this browser");
      return;
    }

    setTranscript("");
    setIsListening(true);
    recognition.start();
    toast.info("Listening... Speak now!");
  };

  const handleInstructionsDismiss = () => {
    setShowInstructions(false);
    setHasSeenInstructions(true);
    localStorage.setItem('voiceInstructionsSeen', 'true');
    
    // Start listening after dismissing instructions
    if (recognition) {
      setTranscript("");
      setIsListening(true);
      recognition.start();
      toast.info("Listening... Speak now!");
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
  };

  const showHelp = () => {
    setShowInstructions(true);
  };

  if (processing) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Processing...
      </Button>
    );
  }

  if (isListening) {
    return (
      <Button 
        onClick={stopListening}
        variant="destructive"
        className="gap-2 animate-pulse"
        data-testid="voice-stop"
      >
        <MicOff className="h-4 w-4" />
        Stop Recording
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button 
          onClick={startListening}
          variant="outline"
          className="gap-2"
          data-testid="voice-start"
        >
          <Mic className="h-4 w-4" />
          Voice Input
        </Button>
        <Button
          onClick={showHelp}
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          title="How to use voice input"
        >
          <HelpCircle className="h-4 w-4 text-slate-400" />
        </Button>
      </div>

      {/* First-time Instructions Modal */}
      <VoiceInstructionsModal 
        open={showInstructions} 
        onClose={handleInstructionsDismiss} 
      />

      {/* Type Clarification Dialog (Income vs Expense) */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Is this income or expense?</DialogTitle>
            <DialogDescription>
              I detected ${pendingTypeData?.amount}, but I need to know if this is money coming in or going out.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all ${selectedType === 'income' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-slate-50'}`}
                onClick={() => setSelectedType('income')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">💰</div>
                  <p className="font-semibold text-green-600">Income</p>
                  <p className="text-xs text-slate-500">Money I received</p>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all ${selectedType === 'expense' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-slate-50'}`}
                onClick={() => setSelectedType('expense')}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">💸</div>
                  <p className="font-semibold text-red-600">Expense</p>
                  <p className="text-xs text-slate-500">Money I spent</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClarificationCancel}>
              Cancel
            </Button>
            <Button onClick={handleTypeConfirm} disabled={!selectedType || processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Clarification Dialog with Full Category List */}
      <Dialog open={clarificationOpen} onOpenChange={setClarificationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Category</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span className={pendingTransaction?.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                {pendingTransaction?.type === 'income' ? '💰' : '💸'}
              </span>
              <span>
                {pendingTransaction?.type?.charAt(0).toUpperCase() + pendingTransaction?.type?.slice(1)} of ${pendingTransaction?.amount}
              </span>
              {pendingTransaction?.description && pendingTransaction.description !== `${pendingTransaction?.type?.charAt(0).toUpperCase() + pendingTransaction?.type?.slice(1)} via voice` && (
                <span className="text-slate-500">— {pendingTransaction.description}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label className="text-sm font-medium mb-3 block">
              Which category should this be added to?
            </Label>
            <CategorySelector
              allCategories={allCategories}
              matchedCategories={matchedCategories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
              transactionType={pendingTransaction?.type}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClarificationCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleClarificationConfirm} 
              disabled={!selectedCategory || processing}
              className="min-w-[120px]"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Add Transaction
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
