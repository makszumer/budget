import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Check, X, Loader2, Crown, Zap, ArrowLeft, Sparkles, 
  MessageSquare, Mic, LineChart, Globe, TrendingUp, Clock,
  Gift, Percent, Shield
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Feature lists for comparison
const FREE_FEATURES = [
  { name: 'Budget Manager & Tracking', included: true, highlight: false },
  { name: 'Standing Orders (Recurring)', included: true, highlight: false },
  { name: 'Budget Envelopes', included: true, highlight: false },
  { name: 'Custom Categories', included: true, highlight: false },
  { name: 'Why Investing Education', included: true, highlight: false },
  { name: 'Compound Calculator', included: true, highlight: false },
  { name: 'Basic Analytics', included: true, highlight: false },
];

const PREMIUM_FEATURES = [
  { name: 'Everything in Free', included: true, highlight: false, icon: Check },
  { name: 'AI Financial Assistant', included: true, highlight: true, icon: MessageSquare, description: 'Get personalized advice' },
  { name: 'Voice Input', included: true, highlight: true, icon: Mic, description: 'Add transactions hands-free' },
  { name: 'Investment Portfolio & ROI', included: true, highlight: true, icon: TrendingUp, description: 'Track your investments' },
  { name: 'Advanced Analytics & Charts', included: true, highlight: true, icon: LineChart, description: 'Deep insights & trends' },
  { name: 'Multi-Currency Conversion', included: true, highlight: true, icon: Globe, description: 'Live exchange rates' },
  { name: 'Daily Financial Wisdom', included: true, highlight: false, icon: Sparkles },
  { name: 'Data Export (CSV/PDF)', included: true, highlight: false },
  { name: 'Priority Support', included: true, highlight: false, icon: Shield },
  { name: 'Future Premium Features', included: true, highlight: false },
];

export const PricingPage = ({ onGoBack }) => {
  const { user, token, isPremium, isAdmin, refreshUserProfile, isOnTrial, trialUsed, discountEligible, discountUsed } = useAuth();
  const [loadingPackage, setLoadingPackage] = useState(null);

  const handleSubscribe = async (packageId, isDiscounted = false) => {
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
          origin_url: originUrl,
          apply_discount: isDiscounted
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const checkoutUrl = response.data.checkout_url;
      
      if (checkoutUrl) {
        toast.success('Redirecting to checkout...');
        setTimeout(() => {
          window.location.assign(checkoutUrl);
        }, 500);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create checkout session');
      setLoadingPackage(null);
    }
  };

  const handleStartTrial = async () => {
    if (!token) {
      toast.error('Please log in to start your free trial');
      return;
    }

    setLoadingPackage('trial');
    
    try {
      const response = await axios.post(
        `${API}/subscription/start-trial`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('🎉 Your 3-day free trial has started!');
      await refreshUserProfile();
      setLoadingPackage(null);
    } catch (error) {
      console.error('Trial error:', error);
      toast.error(error.response?.data?.detail || 'Failed to start trial');
      setLoadingPackage(null);
    }
  };

  // Calculate trial expiry
  const getTrialDaysRemaining = () => {
    if (!user?.trial_expires_at) return null;
    const expiryDate = new Date(user.trial_expires_at);
    const now = new Date();
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Unlock AI-powered insights, voice input, investment tracking, and advanced analytics to take control of your finances.
          </p>
        </div>

        {/* Admin Badge */}
        {isAdmin && (
          <div className="mb-8 p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <p className="text-purple-800 dark:text-purple-200 font-semibold">
                Admin Access - All Premium features are unlocked
              </p>
            </div>
          </div>
        )}

        {/* Trial Banner */}
        {isOnTrial && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Free Trial Active - {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Enjoying Premium features? Subscribe to keep them!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Premium Status */}
        {isPremium && !isOnTrial && !isAdmin && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <p className="text-green-800 dark:text-green-200 font-semibold">
                You are a Premium member!
              </p>
            </div>
            {user?.subscription_expires_at && (
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Renews on: {new Date(user.subscription_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Retention Discount Offer */}
        {discountEligible && !discountUsed && !isPremium && (
          <div className="mb-8 p-6 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 border-2 border-pink-300 dark:border-pink-700 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Special Offer: 50% Off! 🎉
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Your trial has ended. Get 50% off your first 6 months (monthly) or first year (yearly)!
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleSubscribe('monthly_discount', true)}
                    disabled={loadingPackage === 'monthly_discount'}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    data-testid="discount-monthly-btn"
                  >
                    {loadingPackage === 'monthly_discount' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Percent className="h-4 w-4 mr-2" />
                    )}
                    €2/mo for 6 months
                  </Button>
                  <Button
                    onClick={() => handleSubscribe('yearly_discount', true)}
                    disabled={loadingPackage === 'yearly_discount'}
                    variant="outline"
                    className="border-purple-400 text-purple-600 dark:text-purple-400"
                    data-testid="discount-yearly-btn"
                  >
                    {loadingPackage === 'yearly_discount' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    €18/year (was €36)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="relative bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">Free</CardTitle>
              <CardDescription>Get started with budgeting</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">€0</span>
                <span className="text-slate-600 dark:text-slate-400">/forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {FREE_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{feature.name}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-gray-400 dark:text-gray-500">
                  <X className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>AI Financial Assistant</span>
                </li>
                <li className="flex items-start gap-2 text-gray-400 dark:text-gray-500">
                  <X className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>Voice Input</span>
                </li>
                <li className="flex items-start gap-2 text-gray-400 dark:text-gray-500">
                  <X className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>Investment Portfolio</span>
                </li>
              </ul>
              <Button className="w-full" variant="outline" disabled>
                {!isPremium && !isOnTrial ? 'Current Plan' : 'Free Plan'}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-amber-400 dark:border-amber-500 shadow-xl bg-white dark:bg-gray-800">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                <Crown className="h-4 w-4" />
                RECOMMENDED
              </div>
            </div>
            <CardHeader className="pt-8">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl text-gray-900 dark:text-white">Premium</CardTitle>
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
                  Most Popular
                </Badge>
              </div>
              <CardDescription>Full power for your finances</CardDescription>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">€4</span>
                <span className="text-slate-600 dark:text-slate-400">/month</span>
                <span className="text-sm text-slate-500 dark:text-slate-500">or €36/year (save 25%)</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {PREMIUM_FEATURES.map((feature, i) => (
                  <li key={i} className={`flex items-start gap-2 ${feature.highlight ? 'font-medium' : ''}`}>
                    {feature.icon ? (
                      <feature.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${feature.highlight ? 'text-amber-500' : 'text-green-600 dark:text-green-400'}`} />
                    ) : (
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <span className={feature.highlight ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}>
                        {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{feature.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              
              {/* CTA Buttons */}
              <div className="space-y-3">
                {/* Free Trial Button - Only show if not already premium and not used trial */}
                {!isPremium && !isOnTrial && !user?.trial_used && (
                  <Button 
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                    onClick={handleStartTrial}
                    disabled={loadingPackage === 'trial'}
                  >
                    {loadingPackage === 'trial' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting Trial...
                      </>
                    ) : (
                      <>
                        <Gift className="mr-2 h-4 w-4" />
                        Start 3-Day Free Trial
                      </>
                    )}
                  </Button>
                )}
                
                {/* Monthly Button */}
                <Button 
                  className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold" 
                  onClick={() => handleSubscribe('monthly')}
                  disabled={loadingPackage === 'monthly'}
                >
                  {loadingPackage === 'monthly' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Get Monthly - €4/mo
                    </>
                  )}
                </Button>
                
                {/* Yearly Button */}
                <Button 
                  variant="outline"
                  className="w-full border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30" 
                  onClick={() => handleSubscribe('yearly')}
                  disabled={loadingPackage === 'yearly'}
                >
                  {loadingPackage === 'yearly' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Get Yearly - €36/yr (Save €12)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Signals */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <span className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Secure Payment
            </span>
            <span>•</span>
            <span>Cancel Anytime</span>
            <span>•</span>
            <span>Powered by Stripe</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            All prices in EUR. 3-day free trial available for new users. No credit card required for trial.
          </p>
        </div>
      </div>
    </div>
  );
};
