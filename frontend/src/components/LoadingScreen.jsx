import { useEffect, useState } from "react";

export const LoadingScreen = () => {
  const [dots, setDots] = useState("");
  const [tip, setTip] = useState(0);

  const tips = [
    "💡 Start investing early - even small amounts compound over time!",
    "📊 Diversification reduces risk - don't put all eggs in one basket",
    "🎯 Set clear financial goals and track your progress regularly",
    "💰 The best time to start investing was yesterday, the second best time is today",
    "📈 Historical stock market returns average 10% annually",
    "🏦 Keep 3-6 months of expenses as an emergency fund",
    "⏰ Time in the market beats timing the market",
  ];

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    const tipInterval = setInterval(() => {
      setTip(prev => (prev + 1) % tips.length);
    }, 4000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(tipInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50 flex items-center justify-center">
      <div className="text-center px-4 max-w-2xl">
        {/* Animated Logo */}
        <div className="mb-8 relative">
          <div className="p-3 rounded-2xl bg-white shadow-lg mx-auto inline-block">
            <img 
              src="/vaulton-logo.png" 
              alt="Vaulton" 
              className="w-32 h-auto mx-auto animate-pulse object-contain"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 border-4 border-emerald-400 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        {/* Loading Text */}
        <p className="text-xl text-gray-600 mb-8">
          Waking up servers{dots}
        </p>

        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-2xl p-6 shadow-lg max-w-lg mx-auto">
          <p className="text-sm text-gray-500 mb-2">💡 Quick Tip</p>
          <p className="text-gray-700 font-medium transition-all duration-500">
            {tips[tip]}
          </p>
        </div>

        {/* Status */}
        <p className="text-sm text-gray-500 mt-8">
          This may take up to 5 minutes on first load...
        </p>
      </div>
    </div>
  );
};
