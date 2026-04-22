import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

// Helper functions for cross-platform storage
const storage = {
  get: async (key) => {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return localStorage.getItem(key);
    }
  },
  set: async (key, value) => {
    try {
      await Preferences.set({ key, value });
      localStorage.setItem(key, value);
    } catch {
      localStorage.setItem(key, value);
    }
  },
  remove: async (key) => {
    try {
      await Preferences.remove({ key });
      localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnTrial, setIsOnTrial] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const [discountEligible, setDiscountEligible] = useState(false);
  const [discountUsed, setDiscountUsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from storage on startup
  useEffect(() => {
    const loadToken = async () => {
      const savedToken = await storage.get('access_token');
      const savedIsGuest = await storage.get('is_guest');
      if (savedToken) {
        try {
          const payload = JSON.parse(atob(savedToken.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            await storage.remove('access_token');
            setIsLoading(false);
            return;
          }
        } catch {
          await storage.remove('access_token');
          setIsLoading(false);
          return;
        }
        setToken(savedToken);
      }
      if (savedIsGuest === 'true') {
        setIsGuest(true);
      }
      setIsLoading(false);
    };
    loadToken();
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (!token || isGuest) return;
    try {
      const response = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = response.data;
      setUser(userData);
      setIsPremium(userData.is_premium || false);
      setIsAdmin(userData.is_admin || false);

      // Fetch trial status
      try {
        const trialResponse = await axios.get(`${API}/subscription/trial-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const trialData = trialResponse.data;
        setIsOnTrial(trialData.is_trial_active || false);
        setTrialUsed(trialData.trial_used || false);
        setDiscountEligible(trialData.discount_eligible || false);
        setDiscountUsed(trialData.discount_used || false);
      } catch (e) {
        // Trial status fetch failed, ignore
      }
    } catch (error) {
      if (error.response?.status === 401) {
        await logout();
      }
    }
  }, [token, isGuest]);

  useEffect(() => {
    if (token && !isGuest) {
      fetchUserProfile();
    }
  }, [token, isGuest, fetchUserProfile]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/users/login`, { email, password });
    const { access_token, user_id, is_premium } = response.data;
    await storage.set('access_token', access_token);
    await storage.remove('is_guest');
    setToken(access_token);
    setIsGuest(false);
    setIsPremium(is_premium || false);
    return response.data;
  };

  const register = async (email, password, username) => {
    const response = await axios.post(`${API}/users/register`, { email, password, username });
    const { access_token, user_id, is_premium } = response.data;
    await storage.set('access_token', access_token);
    await storage.remove('is_guest');
    setToken(access_token);
    setIsGuest(false);
    setIsPremium(is_premium || false);
    return response.data;
  };

  const loginAsGuest = async () => {
    await storage.set('is_guest', 'true');
    await storage.remove('access_token');
    setIsGuest(true);
    setToken(null);
  };

  const logout = async () => {
    await storage.remove('access_token');
    await storage.remove('is_guest');
    setToken(null);
    setIsGuest(false);
    setUser(null);
    setIsPremium(false);
    setIsAdmin(false);
    setIsOnTrial(false);
    setTrialUsed(false);
    setDiscountEligible(false);
    setDiscountUsed(false);
  };
  const deleteAccount = async () => {
    await axios.delete(`${API}/users/delete-account`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await logout();
  };

  const refreshUserProfile = async () => {
    await fetchUserProfile();
  };

  const isAuthenticated = !isLoading && (!!token || isGuest);

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isPremium,
      isAdmin,
      isGuest,
      isOnTrial,
      trialUsed,
      discountEligible,
      discountUsed,
      isLoading,
      isAuthenticated,
      login,
      register,
      loginAsGuest,
      logout,
      deleteAccount,
      refreshUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
