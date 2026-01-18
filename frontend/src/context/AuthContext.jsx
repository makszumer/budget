import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin email whitelist
const ADMIN_EMAILS = ['admin@financehub.com'];

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [isGuest, setIsGuest] = useState(localStorage.getItem('is_guest') === 'true');

  const fetchUserProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    // If guest, don't fetch profile
    if (isGuest) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Only logout if it's a 401 error (unauthorized)
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, isGuest]);

  useEffect(() => {
    if (token && !isGuest) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token, isGuest, fetchUserProfile]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/users/login`, { email, password });
    const { access_token, user_id, is_premium } = response.data;
    
    localStorage.setItem('access_token', access_token);
    localStorage.removeItem('is_guest');
    setToken(access_token);
    setIsGuest(false);
    
    // Fetch full user profile
    await fetchUserProfile();
    
    return response.data;
  };

  const register = async (email, username, password) => {
    const response = await axios.post(`${API}/users/register`, {
      email,
      username,
      password
    });
    
    const { access_token, user_id, is_premium } = response.data;
    
    localStorage.setItem('access_token', access_token);
    localStorage.removeItem('is_guest');
    setToken(access_token);
    setIsGuest(false);
    
    // Fetch full user profile
    await fetchUserProfile();
    
    return response.data;
  };

  const loginAsGuest = async () => {
    // Create guest session locally (no backend call needed)
    const guestUser = {
      user_id: 'guest-' + Date.now(),
      email: null,
      username: 'Guest',
      subscription_level: 'free',
      is_premium: false,
      primary_currency: 'USD',
      role: 'guest'
    };
    
    // Store guest state
    localStorage.setItem('is_guest', 'true');
    localStorage.removeItem('access_token');
    
    setUser(guestUser);
    setToken(null);
    setIsGuest(true);
    setLoading(false);
    
    return guestUser;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('is_guest');
    setToken(null);
    setUser(null);
    setIsGuest(false);
  };

  const refreshUserProfile = async () => {
    if (token && !isGuest) {
      await fetchUserProfile();
    }
  };

  const updatePrimaryCurrency = async (currency) => {
    if (!token || isGuest) {
      // For guests, just update local state
      if (isGuest) {
        setUser(prev => ({ ...prev, primary_currency: currency }));
        return true;
      }
      return;
    }
    
    try {
      await axios.put(`${API}/users/preferences`, 
        { primary_currency: currency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local user state
      setUser(prev => ({ ...prev, primary_currency: currency }));
      return true;
    } catch (error) {
      console.error('Failed to update primary currency:', error);
      throw error;
    }
  };

  // Computed values
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
  const isOnTrial = user?.is_trial || false;
  const isPremium = isAdmin || user?.is_premium || isOnTrial || false;
  const isAuthenticated = !!user;

  const value = {
    user,
    token,
    loading,
    login,
    register,
    loginAsGuest,
    logout,
    refreshUserProfile,
    updatePrimaryCurrency,
    isAuthenticated,
    isPremium,
    isAdmin,
    isGuest,
    isOnTrial,
    trialExpiresAt: user?.trial_expires_at || null,
    trialUsed: user?.trial_used || false,
    discountEligible: user?.discount_eligible || false,
    discountUsed: user?.discount_used || false,
    primaryCurrency: user?.primary_currency || 'USD'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
