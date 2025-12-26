import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const QuoteOfDay = () => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canRefresh, setCanRefresh] = useState(false);

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
    
    // Allow one refresh per day
    setCanRefresh(lastRefresh !== today);
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
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 mb-6">
        <CardContent className="py-4 flex items-center justify-center">
          <div className="animate-pulse h-6 w-3/4 bg-blue-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!quote) return null;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 mb-6 overflow-hidden">
      <CardContent className="py-5 px-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            <Sparkles className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-grow">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-2">
              Quote of the Day
            </p>
            <p className="text-slate-700 text-base leading-relaxed italic">
              "{quote.quote}"
            </p>
            <p className="text-xs text-slate-500 mt-2">
              — {quote.author}
            </p>
          </div>
          {canRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
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
