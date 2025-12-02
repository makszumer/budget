import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const VoiceInput = ({ onTransactionCreated }) => {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);

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

      const transaction = response.data;
      
      if (transaction.success) {
        // Create the transaction
        await onTransactionCreated(transaction.data);
        toast.success(`${transaction.data.type.charAt(0).toUpperCase() + transaction.data.type.slice(1)} of $${transaction.data.amount} added!`);
      } else {
        toast.error(transaction.message || "Could not understand the transaction");
      }
    } catch (error) {
      console.error("Error processing voice input:", error);
      toast.error("Failed to process voice input");
    } finally {
      setProcessing(false);
      setTranscript("");
    }
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
    <Button 
      onClick={startListening}
      variant="outline"
      className="gap-2"
      data-testid="voice-start"
    >
      <Mic className="h-4 w-4" />
      Voice Input
    </Button>
  );
};
