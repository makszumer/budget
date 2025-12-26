import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const VoiceInput = ({ onTransactionCreated }) => {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);
  
  // Clarification dialog state
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [suggestedCategories, setSuggestedCategories] = useState([]);

  useEffect(() => {
    // Check if browser supports speech recognition
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
        
        // Process the transcript
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
      // Send to backend for AI parsing
      const response = await axios.post(`${API}/parse-voice-transaction`, {
        text: text
      });

      const result = response.data;
      
      if (result.success && result.data) {
        // Direct success - create the transaction
        await onTransactionCreated(result.data);
        toast.success(`${result.data.type.charAt(0).toUpperCase() + result.data.type.slice(1)} of $${result.data.amount} added!`);
      } else if (result.needs_clarification) {
        // Need user to confirm category
        setPendingTransaction({
          amount: result.parsed_amount,
          type: result.parsed_type,
          description: result.parsed_description,
        });
        setSuggestedCategories(result.suggested_categories || []);
        setSelectedCategory("");
        setClarificationOpen(true);
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
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to create transaction");
    } finally {
      setProcessing(false);
    }
  };

  const handleClarificationCancel = () => {
    setClarificationOpen(false);
    setPendingTransaction(null);
    setSelectedCategory("");
    toast.info("Transaction cancelled");
  };

  const startListening = () => {
    if (!recognition) {
      toast.error("Voice input not supported in this browser");
      return;
    }

    setTranscript("");
    setIsListening(true);
    recognition.start();
    toast.info("Listening... Speak now!");
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
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
      <Button 
        onClick={startListening}
        variant="outline"
        className="gap-2"
        data-testid="voice-start"
      >
        <Mic className="h-4 w-4" />
        Voice Input
      </Button>

      {/* Clarification Dialog */}
      <Dialog open={clarificationOpen} onOpenChange={setClarificationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Category</DialogTitle>
            <DialogDescription>
              I detected a {pendingTransaction?.type} of ${pendingTransaction?.amount}, but I'm not sure about the category. 
              Please select the correct category:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {pendingTransaction?.description && (
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <strong>Description:</strong> {pendingTransaction.description}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="category-select">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {suggestedCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClarificationCancel}>
              Cancel
            </Button>
            <Button onClick={handleClarificationConfirm} disabled={!selectedCategory || processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
