import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const SubscriptionSuccess = ({ onGoHome }) => {
  const { token, refreshUserProfile } = useAuth();
  const [status, setStatus] = useState('checking'); // checking, success, failed, expired
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    
    if (!sessionId) {
      setStatus('failed');
      setMessage('No session ID found');
      return;
    }

    checkPaymentStatus(sessionId);
  }, []);

  const checkPaymentStatus = async (sessionId) => {
    if (attempts >= maxAttempts) {
      setStatus('failed');
      setMessage('Payment verification timed out. Please contact support if you were charged.');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/subscription/check-payment-status`,
        { session_id: sessionId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        setStatus('success');
        setMessage(response.data.message);
        await refreshUserProfile();
        toast.success('You are now a premium member!');
      } else if (response.data.status === 'expired') {
        setStatus('expired');
        setMessage(response.data.message);
      } else {
        // Still pending, retry after delay
        setAttempts(prev => prev + 1);
        setTimeout(() => checkPaymentStatus(sessionId), 2000);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      setStatus('failed');
      setMessage(error.response?.data?.detail || 'Failed to verify payment');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'checking' && 'Processing Payment...'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
            {status === 'expired' && 'Session Expired'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'checking' && (
            <div className="py-8">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Verifying your payment...</p>
              <p className="text-sm text-slate-500 mt-2">
                Attempt {attempts + 1} of {maxAttempts}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900 mb-2">
                Welcome to Premium!
              </p>
              <p className="text-slate-600">{message}</p>
              <Button onClick={onGoHome} className="mt-6">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'failed' && (
            <div className="py-8">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900 mb-2">
                Payment Failed
              </p>
              <p className="text-slate-600 mb-6">{message}</p>
              <div className="space-y-2">
                <Button onClick={onGoHome} variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
                <Button onClick={() => window.location.href = '/pricing'} className="w-full">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {status === 'expired' && (
            <div className="py-8">
              <AlertCircle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900 mb-2">
                Session Expired
              </p>
              <p className="text-slate-600 mb-6">{message}</p>
              <Button onClick={() => window.location.href = '/pricing'} className="w-full">
                Return to Pricing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
