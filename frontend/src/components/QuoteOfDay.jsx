import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/context/AccessContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * QuoteOfDay - Daily financial wisdom
 * 
 * FREE users: Blurred/obscured with "Premium" label (visible but not readable)
 * PREMIUM users: Fully visible, enhanced presentation
 */
export const QuoteOfDay = ({ onUpgradeClick }) => {
  const { hasPremiumAccess } = useAccess();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canRefresh, setCanRefresh] = useState(false);

  useEffect(() => {
    fetchQuote();
    checkRefreshEligibility();
  }, []);

  const fetchQuote = async () => {
    setLoading(true);
    
    const cachedQuote = localStorage.getItem('dailyQuote');
    const cachedDate = localStorage.getItem('dailyQuoteDate');
    const today = new Date().toISOString().split('T')[0];
    
    if (cachedQuote && cachedDate === today) {
      setQuote(JSON.parse(cachedQuote));
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/quote-of-day`);
      const quoteData = response.data;
      
      localStorage.setItem('dailyQuote', JSON.stringify(quoteData));
      localStorage.setItem('dailyQuoteDate', today);
      
      setQuote(quoteData);
    } catch (error) {
      console.error('Error fetching quote:', error);
      if (cachedQuote) {
        setQuote(JSON.parse(cachedQuote));
      }
    } finally {
      setLoading(false);
    }
  };

  const checkRefreshEligibility = () => {
    const lastRefresh = localStorage.getItem('quoteLastRefresh');
    const today = new Date().toISOString().split('T')[0];
    setCanRefresh(lastRefresh !== today);
  };

  const handleRefresh = async () => {
    if (!canRefresh || !hasPremiumAccess) return;
    
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('quoteLastRefresh', today);
    localStorage.removeItem('dailyQuote');
    localStorage.removeItem('dailyQuoteDate');
    
    setCanRefresh(false);
    await fetchQuote();
  };

  if (loading) {
    return (
      <Card className="mb-4 bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="py-3 flex items-center justify-center">
          <div className="animate-pulse h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!quote) return null;

  // FREE users - Blurred quote with Premium indicator
  if (!hasPremiumAccess) {
    return (
      <Card 
        className="mb-4 bg-gray-50/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-800/70 transition-colors" 
        onClick={onUpgradeClick}
        data-testid="quote-blurred"
      >
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div className="flex-grow min-w-0 relative">
              {/* Blurred quote text */}
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed blur-[4px] select-none">
                &ldquo;{quote.quote}&rdquo;
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 blur-[3px] select-none">
                — {quote.author}
              </p>
            </div>
            {/* Subtle Premium indicator */}
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-medium rounded">
              <Lock className="h-2.5 w-2.5" />
              Premium
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PREMIUM users - Fully visible, enhanced
  return (
    <Card 
      className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800" 
      data-testid="quote-premium"
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
              &ldquo;{quote.quote}&rdquo;
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              — {quote.author}
            </p>
          </div>
          {canRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-7 w-7 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              onClick={handleRefresh}
              title="Get a new quote (once per day)"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
