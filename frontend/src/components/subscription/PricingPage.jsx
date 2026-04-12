import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import {
  Check, X, Loader2, Crown, Zap, ArrowLeft, Sparkles,
  MessageSquare, Mic, LineChart, Globe, TrendingUp,
  Gift, Percent, Shield, Clock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const REVENUECAT_IOS_KEY = 'appl_tTLUAIDqZYxMKuordyfuFhTREVy';

const FREE_FEATURES = [
  { name: 'Budget Manager & Tracking', included: true },
  { name: 'Standing Orders (Recurring)', included: true },
  { name: 'Budget Envelopes', included: true },
  { name: 'Custom Categories', included: true },
  { name: 'Why Investing Education', included: true },
  { name: 'Compound Calculator', included: true },
  { name: 'Basic Analytics', included: true },
];

const PREMIUM_FEATURES = [
  { name: 'Everything in Free', included: true, highlight: false, icon: Check },
  { name: 'AI Financial Assistant', included: true, highlight: true, icon: MessageSquare, description: 'Get personalized advice' },
  { name: 'Voice Input', included: true, highlight: true, icon: Mic, description: 'Add transactions hands-free' },
  { name: 'Investment Portfolio & ROI', included: true, highlight: true, icon: TrendingUp, description: 'Track your investments' },
  { name: 'Advanced Analytics & Charts', included: true, highlight: true, icon: LineChart, description: 'Deep insights & trends' },
  { name: 'Multi-Currency Conversion', included: true, highlight: true, icon: Globe, description: 'Live exchange rates' },
  { name: 'Daily Financial Wisdom', included: true, highlight: false, icon: Sparkles },
  { name: 'Priority Support', included: true, highlight: false, icon: Shield },
  { name: 'Future Premium Features', included: true, highlight: false },
];

const isNativeIOS = () => Capacitor.getPlatform() === 'ios';

export const PricingPage = ({ onGoBack }) => {
  const { user, token, isPremium, isAdmin, refreshUserProfile, isOnTrial, trialUsed, discountEligible, discountUsed } = useAuth();
  const [loadingPackage, setLoadingPackage] = useState(null);
  const [rcInitialized, setRcInitialized] = useState(false);

  useEffect(() => {
    if (isNativeIOS() && !rcInitialized) {
      initRevenueCat();
    }
  }, []);

  const initRevenueCat = async () => {
    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
      if (user?.id) {
        await Purchases.logIn({ appUserID: user.id });
      }
      setRcInitialized(true);
    } catch (e) {
      console.error('RevenueCat init error:', e);
    }
  };

  const handleIOSPurchase = async (productId) => {
    if (!token) {
      toast.error('Please log in to subscribe');
      return;
    }
    setLoadingPackage(productId);
    try {
      if (!rcInitialized) {
        await initRevenueCat();
      }
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      if (!currentOffering) {
        throw new Error('No offerings available. Please try again later.');
      }
      const packageToBuy = currentOffering.availablePackages.find(pkg =>
        pkg.product.identifier === productId
      );
      if (!packageToBuy) {
        throw new Error(`Product ${productId} not found.`);
      }
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: packageToBuy
      });
      const customerInfo = purchaseResult.customerInfo;
      const transaction = purchaseResult.transaction;
      await axios.post(
        `${API}/subscription/verify-apple-iap`,
        {
          transaction_id: transaction.transactionIdentifier,
          product_id: productId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refreshUserProfile();
      toast.success('🎉 Premium activated! Welcome to Vaulton Premium.');
    } catch (error) {
      if (error?.code === 'USER_CANCELLED' || error?.userCancelled) {
        toast.info('Purchase cancelled');
      } else {
        console.error('IAP error:', error);
        toast.error(error?.message || 'Purchase failed. Please try again.');
      }
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleStripeSubscribe = async (packageId, isDiscounted = false) => {
    if (!token) {
      toast.error('Please log in to subscribe');
      return;
    }
    setLoadingPackage(packageId);
    try {
      const originUrl = "https://budget-production-9881.up.railway.app";
      const response = await axios.post(
        `${API}/subscription/create-checkout`,
        { package_id: packageId, origin_url: originUrl, apply_discount: isDiscounted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const checkoutUrl = response.data.checkout_url;
      if (checkoutUrl) {
        await Browser.open({ url: checkoutUrl });
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create checkout session');
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoadingPackage('restore');
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.activeSubscriptions.length > 0) {
        await axios.post(
          `${API}/subscription/verify-apple-iap`,
          { restore: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await refreshUserProfile();
        toast.success('Purchases restored successfully!');
      } else {
        toast.info('No previous purchases found.');
      }
    } catch (error) {
      toast.error('Failed to restore purchases. Please try again.');
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleSubscribe = (packageId, isDiscounted = false) => {
    if (isNativeIOS()) {
      const productMap = {
        'monthly': 'com.makszumer.budget.monthly',
        'yearly': 'com.makszumer.budget.yearly',
      };
      const productId = productMap[packageId];
      if (productId) {
        handleIOSPurchase(productId);
      } else {
        toast.error('This offer is not available in the App Store.');
      }
    } else {
      handleStripeSubscribe(packageId, isDiscounted);
    }
  };

  const handleStartTrial = async () => {
    if (!token) {
      toast.error('Please log in to start your free trial');
      return;
    }
    setLoadingPackage('trial');
    try {
      await axios.post(
        `${API}/subscription/start-trial`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('🎉 Your 3-day free trial has started!');
      await refreshUserProfile();
    } catch (error) {
      console.error('Trial error:', error);
      toast.error(error.response?.data?.detail || 'Failed to start trial');
    } finally {
      setLoadingPackage(null);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!user?.trial_expires_at) return null;
    const expiryDate = new Date(user.trial_expires_at);
    const diffDays = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const trialDaysRemaining = getTrialDaysRemaining();
  const onIOS = isNativeIOS();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {onGoBack && (
          <button
            onClick={onGoBack}
            style={{touchAction: 'manipulation'}}
            className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Unlock AI-powered insights, voice input, investment tracking, and advanced analytics.
          </p>
        </div>

        {isAdmin && (
          <div className="mb-8 p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <p className="text-purple-800 dark:text-purple-200 font-semibold">Admin Access — All Premium features unlocked</p>
            </div>
          </div>
        )}

        {isOnTrial && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Free Trial Active — {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">Enjoying Premium? Subscribe to keep it!</p>
              </div>
            </div>
          </div>
        )}

        {isPremium && !isOnTrial && !isAdmin && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <p className="text-green-800 dark:text-green-200 font-semibold">You are a Premium member!</p>
            </div>
            {user?.subscription_expires_at && (
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Renews on: {new Date(user.subscription_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {!onIOS && discountEligible && !discountUsed && !isPremium && (
          <div className="mb-8 p-6 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 border-2 border-pink-300 dark:border-pink-700 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Special Offer: 50% Off! 🎉</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Your trial has ended. Get 50% off — available on our website.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => handleStripeSubscribe('monthly_discount', true)} disabled={loadingPackage === 'monthly_discount'} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600" style={{touchAction: 'manipulation'}}>
                    {loadingPackage === 'monthly_discount' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Percent className="h-4 w-4 mr-2" />}
                    €2/mo for 6 months
                  </Button>
                  <Button onClick={() => handleStripeSubscribe('yearly_discount', true)} disabled={loadingPackage === 'yearly_discount'} variant="outline" className="border-purple-400 text-purple-600 dark:text-purple-400" style={{touchAction: 'manipulation'}}>
                    {loadingPackage === 'yearly_discount' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    €18/year (was €36)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
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
                {['AI Financial Assistant', 'Voice Input', 'Investment Portfolio'].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-400 dark:text-gray-500">
                    <X className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant="outline" disabled style={{touchAction: 'manipulation'}}>
                {!isPremium && !isOnTrial ? 'Current Plan' : 'Free Plan'}
              </Button>
            </CardContent>
          </Card>

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
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">Most Popular</Badge>
              </div>
              <CardDescription>Full power for your finances</CardDescription>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">€3.99</span>
                <span className="text-slate-600 dark:text-slate-400">/month</span>
                <span className="text-sm text-slate-500 dark:text-slate-500">or €35.99/year (save 25%)</span>
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

              <div className="space-y-3">
                {!isPremium && !isOnTrial && !trialUsed && (
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white" onClick={handleStartTrial} disabled={loadingPackage === 'trial'} style={{touchAction: 'manipulation'}}>
                    {loadingPackage === 'trial' ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting Trial...</>
                    ) : (
                      <><Gift className="mr-2 h-4 w-4" />Start 3-Day Free Trial</>
                    )}
                  </Button>
                )}

                <Button className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold" onClick={() => handleSubscribe('monthly')} disabled={loadingPackage === 'monthly'} style={{touchAction: 'manipulation'}}>
                  {loadingPackage === 'monthly' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  ) : (
                    <><Zap className="mr-2 h-4 w-4" />Get Monthly — €3.99/mo</>
                  )}
                </Button>

                <Button variant="outline" className="w-full border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={() => handleSubscribe('yearly')} disabled={loadingPackage === 'yearly'} style={{touchAction: 'manipulation'}}>
                  {loadingPackage === 'yearly' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  ) : (
                    <><Crown className="mr-2 h-4 w-4" />Get Yearly — €35.99/yr (Save 25%)</>
                  )}
                </Button>

                <button
                  onClick={handleRestorePurchases}
                  disabled={loadingPackage === 'restore'}
                  style={{touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'}}
                  className="w-full text-sm text-blue-600 dark:text-blue-400 underline py-2 mt-2 font-medium"
                >
                  {loadingPackage === 'restore' ? 'Restoring...' : 'Restore Purchases'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <span className="flex items-center gap-1"><Shield className="h-4 w-4" />Secure Payment</span>
            <span>•</span>
            <span>Cancel Anytime</span>
            <span>•</span>
            <span>{onIOS ? 'Powered by Apple' : 'Powered by Stripe'}</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {onIOS
              ? 'Payment processed by Apple. Manage subscriptions in iOS Settings → Apple ID → Subscriptions.'
              : 'All prices in EUR. 3-day free trial available. No credit card required for trial.'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">By subscribing you agree to our <a href="https://makszumer.github.io/vaulton-legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Terms of Use</a> and <a href="https://makszumer.github.io/vaulton-legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Privacy Policy</a>.</p>
        </div>
      </div>
    </div>
  );
};