import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/context/AccessContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * QuoteOfDay - Daily financial wisdom
 * 
 * FREE users: Subtle presentation (smaller, muted)
 * PREMIUM users: Enhanced presentation
 */
export const QuoteOfDay = ({ subtle = false }) => {
  const { hasPremiumAccess } = useAccess();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canRefresh, setCanRefresh] = useState(false);

  // Determine if we should use subtle styling
  const isSubtle = subtle || !hasPremiumAccess;

  useEffect(() => {
    fetchQuote();
    checkRefreshEligibility();
  }, []);

  const fetchQuote = async () => {
    setLoading(true);
    
    // Check localStorage for cached quote
    const cachedQuote = localStorage.getItem('dailyQuote');
    const cachedDate = localStorage.getItem('dailyQuoteDate');
    const today = new Date().toISOString().split('T')[0];
    
    // If we have a cached quote for today, use it
    if (cachedQuote && cachedDate === today) {
      setQuote(JSON.parse(cachedQuote));
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/quote-of-day`);
      const quoteData = response.data;
      
      // Cache the quote
      localStorage.setItem('dailyQuote', JSON.stringify(quoteData));
      localStorage.setItem('dailyQuoteDate', today);
      
      setQuote(quoteData);
    } catch (error) {
      console.error('Error fetching quote:', error);
      // Try to use cached quote even if outdated
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
    
    // Allow one refresh per day (premium only)
    setCanRefresh(lastRefresh !== today && hasPremiumAccess);
  };

  const handleRefresh = async () => {
    if (!canRefresh) return;
    
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('quoteLastRefresh', today);
    localStorage.removeItem('dailyQuote');
    localStorage.removeItem('dailyQuoteDate');
    
    setCanRefresh(false);
    await fetchQuote();
  };

  if (loading) {
    return (
      <Card className={`mb-4 ${isSubtle ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800'}`}>
        <CardContent className={`${isSubtle ? 'py-3' : 'py-4'} flex items-center justify-center`}>
          <div className={`animate-pulse h-4 w-3/4 ${isSubtle ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-200 dark:bg-blue-700'} rounded`}></div>
        </CardContent>
      </Card>
    );
  }

  if (!quote) return null;

  // SUBTLE version for free users - smaller, muted, at bottom
  if (isSubtle) {
    return (
      <Card className="bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 mb-4" data-testid="quote-subtle">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-grow min-w-0">
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed italic truncate">
                &ldquo;{quote.quote}&rdquo;
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                — {quote.author}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PREMIUM version - enhanced presentation
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800 mb-4 overflow-hidden" data-testid="quote-premium">
      <CardContent className="py-5 px-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            <Sparkles className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="flex-grow">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide mb-2">
              Daily Financial Wisdom
            </p>
            <p className="text-slate-700 dark:text-slate-200 text-base leading-relaxed italic">
              &ldquo;{quote.quote}&rdquo;
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              — {quote.author}
            </p>
          </div>
          {canRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              onClick={handleRefresh}
              title="Get a new quote (once per day)"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
