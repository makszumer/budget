import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Loader2, UserCircle2 } from 'lucide-react';

export const LoginPage = ({ onSwitchToRegister, onLoginSuccess }) => {
  const { login, loginAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await loginAsGuest();
      if (onLoginSuccess) onLoginSuccess();
    } catch (error) {
      setError('Failed to login as guest');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-8 py-12">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center mb-4">
            <div className="p-2 rounded-xl bg-white dark:bg-gray-100 shadow-sm">
              <img
                src="/vaulton-logo.png"
                alt="Vaulton"
                className="h-24 w-auto object-contain"
              />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign in to your financial tracking account
          </p>
        </div>
        <div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email or Username</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="text"
                  placeholder="your@email.com or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={loading || guestLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  disabled={loading || guestLoading}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center mt-2 font-medium">
                {error}
              </div>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              className="w-full"
              disabled={loading || guestLoading}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-50 dark:bg-gray-950 px-2 text-gray-500 dark:text-gray-400">
                Or
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGuestLogin}
            disabled={loading || guestLoading}
            data-testid="guest-login-btn"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            {guestLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <UserCircle2 className="mr-2 h-4 w-4" />
                Continue as Guest
              </>
            )}
          </Button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            Explore the app with limited features. No account needed.
          </p>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-blue-600 hover:text-blue-700 font-semibold"
                disabled={loading || guestLoading}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
