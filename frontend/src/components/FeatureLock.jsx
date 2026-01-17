import { useState } from 'react';
import { useAccess, FEATURE_INFO, FEATURES } from '@/context/AccessContext';
import { Lock, Crown, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * FeatureLock - Wraps premium features with access control
 * 
 * @param {string} feature - Feature key from FEATURES enum
 * @param {React.ReactNode} children - The premium feature content
 * @param {React.ReactNode} lockedContent - Optional custom locked state content
 * @param {boolean} showBadge - Whether to show "Premium" badge on locked features
 * @param {function} onUpgradeClick - Callback when upgrade is clicked
 */
export const FeatureLock = ({ 
  feature, 
  children, 
  lockedContent,
  showBadge = true,
  onUpgradeClick,
  className = ''
}) => {
  const { canAccess, tier } = useAccess();
  const [showModal, setShowModal] = useState(false);
  
  const featureInfo = FEATURE_INFO[feature] || {
    name: 'Premium Feature',
    description: 'This feature is available for Premium users.',
    icon: '⭐',
  };
  
  // If user has access, render children normally
  if (canAccess(feature)) {
    return children;
  }
  
  // Locked state
  const handleLockedClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };
  
  const handleUpgrade = () => {
    setShowModal(false);
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };
  
  return (
    <>
      {/* Locked content wrapper */}
      <div 
        className={`relative cursor-pointer group ${className}`}
        onClick={handleLockedClick}
        data-testid={`locked-feature-${feature}`}
      >
        {/* Show custom locked content or default overlay */}
        {lockedContent ? (
          lockedContent
        ) : (
          <div className="relative">
            {/* Render children with blur/dim effect */}
            <div className="opacity-50 pointer-events-none select-none filter blur-[1px]">
              {children}
            </div>
            
            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-[2px] rounded-lg">
              <div className="text-center p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-3 shadow-lg">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {featureInfo.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Click to unlock
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Premium badge */}
        {showBadge && (
          <div className="absolute -top-2 -right-2 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-md">
              <Crown className="h-3 w-3" />
              Premium
            </span>
          </div>
        )}
      </div>
      
      {/* Upgrade modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full">
                <span className="text-2xl">{featureInfo.icon}</span>
              </div>
              <div>
                <DialogTitle className="text-xl">{featureInfo.name}</DialogTitle>
                <span className="text-xs text-amber-600 font-semibold">Premium Feature</span>
              </div>
            </div>
            <DialogDescription className="text-base pt-2">
              {featureInfo.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Upgrade to Premium to unlock this feature and many more!
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Maybe Later
              </Button>
              <Button
                onClick={handleUpgrade}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                data-testid="upgrade-btn"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
            
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Starting at €4/month • Cancel anytime
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * PremiumBadge - Simple badge to indicate premium features
 */
export const PremiumBadge = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full ${className}`}>
    <Crown className="h-3 w-3" />
    Premium
  </span>
);

/**
 * LockedButton - A button that shows locked state for premium features
 */
export const LockedButton = ({ 
  feature, 
  children, 
  onUpgradeClick,
  ...buttonProps 
}) => {
  const { canAccess } = useAccess();
  const [showModal, setShowModal] = useState(false);
  
  const featureInfo = FEATURE_INFO[feature] || {
    name: 'Premium Feature',
    description: 'This feature is available for Premium users.',
    icon: '⭐',
  };
  
  if (canAccess(feature)) {
    return <Button {...buttonProps}>{children}</Button>;
  }
  
  return (
    <>
      <Button
        {...buttonProps}
        onClick={(e) => {
          e.preventDefault();
          setShowModal(true);
        }}
        className={`relative ${buttonProps.className || ''}`}
      >
        <Lock className="h-4 w-4 mr-2" />
        {children}
        <PremiumBadge className="absolute -top-2 -right-2" />
      </Button>
      
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full">
                <span className="text-2xl">{featureInfo.icon}</span>
              </div>
              <div>
                <DialogTitle className="text-xl">{featureInfo.name}</DialogTitle>
                <span className="text-xs text-amber-600 font-semibold">Premium Feature</span>
              </div>
            </div>
            <DialogDescription className="text-base pt-2">
              {featureInfo.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                setShowModal(false);
                if (onUpgradeClick) onUpgradeClick();
              }}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { FEATURES };
