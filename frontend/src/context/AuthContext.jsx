import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    if (!token) {
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
      // This prevents logout on network errors or other issues
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/users/login`, { email, password });
    const { access_token, user_id, is_premium } = response.data;
    
    localStorage.setItem('access_token', access_token);
    setToken(access_token);
    
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
    setToken(access_token);
    
    // Fetch full user profile
    await fetchUserProfile();
    
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  const refreshUserProfile = async () => {
    if (token) {
      await fetchUserProfile();
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshUserProfile,
    isAuthenticated: !!user,
    isPremium: user?.is_premium || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
