import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { Check, Loader2, Crown, Zap, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PricingPage = ({ onGoBack }) => {
  const { user, token, isPremium } = useAuth();
  const [loadingPackage, setLoadingPackage] = useState(null);

  const handleSubscribe = async (packageId) => {
    if (!token) {
      toast.error('Please log in to subscribe');
      return;
    }

    setLoadingPackage(packageId);
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(
        `${API}/subscription/create-checkout`,
        {
          package_id: packageId,
          origin_url: originUrl
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create checkout session');
      setLoadingPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-600">
            Unlock premium features and remove ads
          </p>
        </div>

        {isPremium && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-800 font-semibold">
              🎉 You are currently a Premium member!
            </p>
            {user?.subscription_expires_at && (
              <p className="text-sm text-green-700 mt-1">
                Expires on: {new Date(user.subscription_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€0</span>
                <span className="text-slate-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>Track income & expenses</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>Investment portfolio tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-start gap-2 text-red-600">
                  <span className="font-semibold">⚠️ Contains ads</span>
                </li>
              </ul>
              <Button className="w-full" variant="outline" disabled>
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Monthly Premium */}
          <Card className="relative border-2 border-blue-500 shadow-xl">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Crown className="h-4 w-4" />
                POPULAR
              </div>
            </div>
            <CardHeader className="pt-8">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-500" />
                Monthly Premium
              </CardTitle>
              <CardDescription>Full access, billed monthly</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€4</span>
                <span className="text-slate-600">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <span className="font-semibold">Everything in Free</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <span className="font-semibold">🎯 Ad-free experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>Export data</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" 
                onClick={() => handleSubscribe('monthly')}
                disabled={loadingPackage === 'monthly' || isPremium}
              >
                {loadingPackage === 'monthly' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isPremium ? (
                  'Current Plan'
                ) : (
                  'Get Monthly Premium'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Yearly Premium */}
          <Card className="md:col-span-2 border-2 border-purple-500">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-6 w-6 text-yellow-500" />
                  <h3 className="text-2xl font-bold">Yearly Premium</h3>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                    SAVE 25%
                  </span>
                </div>
                <p className="text-slate-600 mb-4">Best value - Save €12/year!</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">€36</span>
                  <span className="text-slate-600">/year</span>
                  <span className="text-sm text-slate-500 line-through">€48/year</span>
                </div>
              </div>
              <div className="md:w-64">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700" 
                  size="lg"
                  onClick={() => handleSubscribe('yearly')}
                  disabled={loadingPackage === 'yearly' || isPremium}
                >
                  {loadingPackage === 'yearly' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isPremium ? (
                    'Current Plan'
                  ) : (
                    'Get Yearly Premium'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-12 text-center text-sm text-slate-600">
          <p>All prices in EUR. Cancel anytime. Secure payment powered by Stripe.</p>
        </div>
      </div>
    </div>
  );
};
