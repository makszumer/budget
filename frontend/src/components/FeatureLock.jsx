import { useState } from 'react';
import { useAccess, FEATURE_INFO, FEATURES } from '@/context/AccessContext';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * FeatureLock - Wraps premium features with SUBTLE access control
 * 
 * Design principles:
 * - Not blocking content
 * - Not interrupting user flow
 * - Small lock icons, muted labels, soft opacity
 * - NO aggressive banners or popups
 * 
 * @param {string} feature - Feature key from FEATURES enum
 * @param {React.ReactNode} children - The premium feature content
 * @param {React.ReactNode} lockedContent - Optional custom locked state content
 * @param {boolean} showBadge - Whether to show badge (now subtle)
 * @param {boolean} subtle - Use extra subtle mode (just opacity + small lock)
 * @param {function} onUpgradeClick - Callback when upgrade is clicked
 */
export const FeatureLock = ({ 
  feature, 
  children, 
  lockedContent,
  showBadge = true,
  subtle = false,
  onUpgradeClick,
  className = ''
}) => {
  const { canAccess } = useAccess();
  const [showModal, setShowModal] = useState(false);
  
  const featureInfo = FEATURE_INFO[feature] || {
    name: 'Premium Feature',
    description: 'This feature is available for Premium users.',
    icon: '⭐',
  };
  
  // If user has access, render children normally - clean, no badges
  if (canAccess(feature)) {
    return children;
  }
  
  // Locked state - SUBTLE presentation
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
      {/* Locked content wrapper - SUBTLE */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`relative cursor-pointer ${className}`}
              onClick={handleLockedClick}
              data-testid={`locked-feature-${feature}`}
            >
              {/* Show custom locked content or default subtle overlay */}
              {lockedContent ? (
                lockedContent
              ) : (
                <div className="relative">
                  {/* Render children with SUBTLE dim effect - no blur */}
                  <div className="opacity-60 pointer-events-none select-none">
                    {children}
                  </div>
                  
                  {/* Subtle lock indicator - small, positioned in corner */}
                  {showBadge && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-medium rounded border border-gray-200 dark:border-gray-700">
                        <Lock className="h-2.5 w-2.5" />
                        Premium
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gray-800 text-white text-xs">
            <p>Unlock with Premium</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Upgrade modal - cleaner, less aggressive */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full">
                <span className="text-xl">{featureInfo.icon}</span>
              </div>
              <div>
                <DialogTitle className="text-lg">{featureInfo.name}</DialogTitle>
                <span className="text-xs text-gray-500">Premium Feature</span>
              </div>
            </div>
            <DialogDescription className="text-sm pt-2">
              {featureInfo.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Not Now
              </Button>
              <Button
                onClick={handleUpgrade}
                className="flex-1"
                data-testid="upgrade-btn"
              >
                <Crown className="h-4 w-4 mr-2" />
                View Plans
              </Button>
            </div>
            
            <p className="text-xs text-center text-gray-400">
              Try free for 3 days • Starting at €4/month
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * PremiumBadge - SUBTLE badge to indicate premium features
 */
export const PremiumBadge = ({ className = '', subtle = false }) => {
  if (subtle) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-gray-500 dark:text-gray-400 text-[10px] font-medium ${className}`}>
        <Lock className="h-2.5 w-2.5" />
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-medium rounded ${className}`}>
      <Lock className="h-2.5 w-2.5" />
      Premium
    </span>
  );
};

/**
 * SubtlePremiumIndicator - Very subtle indicator for premium features
 * Just a small lock icon with tooltip
 */
export const SubtlePremiumIndicator = ({ feature, onUpgradeClick, className = '' }) => {
  const { canAccess } = useAccess();
  const [showModal, setShowModal] = useState(false);
  
  const featureInfo = FEATURE_INFO[feature] || {
    name: 'Premium Feature',
    description: 'This feature is available for Premium users.',
    icon: '⭐',
  };
  
  // Premium users see nothing
  if (canAccess(feature)) {
    return null;
  }
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setShowModal(true)}
              className={`inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${className}`}
            >
              <Lock className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Unlock with Premium</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{featureInfo.name}</DialogTitle>
            <DialogDescription>{featureInfo.description}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
              Not Now
            </Button>
            <Button onClick={() => { setShowModal(false); onUpgradeClick?.(); }} className="flex-1">
              <Crown className="h-4 w-4 mr-2" />
              View Plans
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              {...buttonProps}
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                setShowModal(true);
              }}
              className={`relative opacity-60 ${buttonProps.className || ''}`}
            >
              <Lock className="h-3 w-3 mr-2 text-gray-400" />
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Unlock with Premium</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{featureInfo.name}</DialogTitle>
            <DialogDescription>{featureInfo.description}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
              Not Now
            </Button>
            <Button onClick={() => { setShowModal(false); onUpgradeClick?.(); }} className="flex-1">
              <Crown className="h-4 w-4 mr-2" />
              View Plans
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { FEATURES };
