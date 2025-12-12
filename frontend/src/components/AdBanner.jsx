import { useAuth } from '@/context/AuthContext';

export const AdBanner = ({ placement = 'bottom', className = '' }) => {
  const { isPremium, isAuthenticated } = useAuth();

  // Don't show ads if user is premium or not authenticated (during loading)
  if (isPremium || !isAuthenticated) {
    return null;
  }

  const bottomStyles = 'fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg';
  const sectionStyles = 'w-full my-6 bg-gray-50 border border-gray-200 rounded-lg';
  const containerClass = placement === 'bottom' ? bottomStyles : sectionStyles;

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex items-center justify-center p-4">
        {/* Placeholder for Google AdMob ads */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">Advertisement</p>
          <div className="bg-gradient-to-r from-gray-200 to-gray-300 px-8 py-6 rounded">
            <p className="text-sm text-gray-600 font-medium">
              📢 Ad Space - Upgrade to Premium to remove ads
            </p>
            <button
              onClick={() => window.location.href = '/pricing'}
              className="mt-2 px-4 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Go Ad-Free
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
