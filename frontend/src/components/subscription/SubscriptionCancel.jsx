import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export const SubscriptionCancel = ({ onGoHome }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Subscription Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="py-8">
            <XCircle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
            <p className="text-lg text-slate-900 mb-2">
              Payment Cancelled
            </p>
            <p className="text-slate-600">
              You cancelled the subscription process. No charges were made.
            </p>
            <div className="mt-6 space-y-2">
              <Button onClick={onGoHome} className="w-full">
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => window.location.href = '/pricing'} 
                variant="outline" 
                className="w-full"
              >
                View Pricing Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
