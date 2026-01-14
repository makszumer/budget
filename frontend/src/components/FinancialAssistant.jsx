import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { Search, Loader2, MessageCircle, TrendingUp } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const FinancialAssistant = () => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const handleAsk = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error("Please ask a question");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai-assistant`, {
        question: question.trim()
      });
      
      const newEntry = {
        question: question.trim(),
        answer: response.data.answer,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setConversationHistory([newEntry, ...conversationHistory]);
      setAnswer(response.data.answer);
      setQuestion("");
    } catch (error) {
      console.error("Error asking question:", error);
      toast.error(error.response?.data?.detail || "Failed to get answer");
    } finally {
      setLoading(false);
    }
  };

  const exampleQuestions = [
    "How much did I make in tips in November?",
    "How much did I spend on my MacBook in December?",
    "What was my total income last month?",
    "How much did I spend on groceries this week?",
    "What's my biggest expense category?",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Financial Assistant (AI-Powered)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Ask questions about your finances in natural language
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Form */}
          <form onSubmit={handleAsk} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Ask me anything... (e.g., How much did I spend on groceries?)"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Thinking...
                </>
              ) : (
                "Ask"
              )}
            </Button>
          </form>

          {/* Example Questions */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q)}
                  className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="space-y-4">
          {conversationHistory.map((entry, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Question */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">Q</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{entry.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">{entry.timestamp}</p>
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-slate-900 whitespace-pre-wrap">{entry.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {conversationHistory.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ask Your First Question</h3>
            <p className="text-muted-foreground mb-4">
              I can analyze your transactions and answer questions about your spending, income, and financial patterns.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
