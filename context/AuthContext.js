// AuthContext.js — Global authentication state management using Supabase

import React, { createContext, useState, useContext, useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import {
  authSignInWithPassword,
  authSignUpWithPassword,
  authSignInWithGoogle,
  authSignInWithOtp,
  authVerifyOtp,
  fetchOrCreateProfile,
  updateProfile,
  supabaseSignOut,
} from '../services/supabaseService';

const AuthContext = createContext(null);
const SESSION_KEY = 'supabase_session';

const mapProfile = (profile) => ({
  id: profile.id,
  name: profile.name || 'Traveller',
  phone: profile.phone || '',
  email: profile.email || '',
  role: profile.role || 'user',
  joinedDate: profile.created_at ? profile.created_at.split('T')[0] : '',
  createdAt: profile.created_at,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    const subscription = Linking.addEventListener('url', handleUrl);

    restoreSession();
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription?.remove();
  }, []);

  const handleUrl = async (event) => {
    const rawUrl = typeof event === 'string' ? event : event?.url;
    console.log('Deep link received:', rawUrl);

    if (!rawUrl || (!rawUrl.includes('auth/callback') && !rawUrl.includes('access_token') && !rawUrl.includes('code='))) {
      return;
    }

    try {
      console.log('Processing auth callback...');

      // Robust extraction for both ?query and #hash parameters
      const extractParams = (url) => {
        const params = {};
        const queryString = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
        const hashString = url.includes('#') ? url.split('#')[1] : '';

        const parseString = (str) => {
          if (!str) return;
          str.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k && v) params[k] = decodeURIComponent(v);
          });
        };

        parseString(queryString);
        parseString(hashString);
        return params;
      };

      const params = extractParams(rawUrl);
      
      let sessionData = null;
      let sessionError = null;

      if (params.code) {
        console.log('PKCE code found, exchanging for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
        sessionData = data;
        sessionError = error;
      } else if (params.access_token && params.refresh_token) {
        console.log('Implicit flow tokens found, setting session directly...');
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        sessionData = data;
        sessionError = error;
      } else {
        console.log('No valid auth tokens found in deep link URL:', rawUrl);
        return;
      }

      if (sessionError) {
        console.log('Deep link auth session error:', sessionError);
        return;
      }

      const session = sessionData?.session;
      if (!session) {
        console.log('No session in callback data');
        return;
      }

      console.log('Session obtained from callback, storing...');
      await storeSession(session);

      const { data: profile, error: profileError } = await fetchOrCreateProfile(session.user.id, {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Traveller',
      });
      if (!profileError && profile) {
        setUser(mapProfile(profile));
        console.log('User profile loaded successfully');
      } else {
        console.log('Profile load error:', profileError);
      }
    } catch (err) {
      console.log('Deep link auth parse error:', err);
    }
  };

  const storeSession = async (sessionData) => {
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      await supabase.auth.setSession(sessionData);
      setSession(sessionData);
    } catch (error) {
      console.log('Session store error:', error);
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      setSession(null);
      setUser(null);
    } catch (error) {
      console.log('Session clear error:', error);
    }
  };

  const restoreSession = async () => {
    try {
      const stored = await AsyncStorage.getItem(SESSION_KEY);
      if (stored) {
        const sessionData = JSON.parse(stored);
        const { error } = await supabase.auth.setSession(sessionData);
        if (!error) {
          const { data: profile, error: profileError } = await fetchOrCreateProfile(sessionData.user.id, {
             email: sessionData.user.email,
             name: sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name || 'Traveller',
          });
          if (!profileError && profile) {
            setUser(mapProfile(profile));
          }
          setSession(sessionData);
        }
      }
    } catch (error) {
      console.log('Restore session error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await authSignInWithPassword(email, password);
      if (error) {
        return { success: false, error: error.message || JSON.stringify(error) || 'Unable to sign in' };
      }

      if (data?.session) {
        await storeSession(data.session);
      }

      if (data?.profile) {
        setUser(mapProfile(data.profile));
      }

      if (data?.requiresEmailConfirmation) {
        return {
          success: false,
          error: data.message || 'Please confirm your email before signing in.',
        };
      }

      return { success: true };
    } catch (exception) {
      return { success: false, error: exception.message || JSON.stringify(exception) };
    }
  };

  const signUpWithEmail = async (email, password, name = null) => {
    console.log('Starting email signup for:', email);
    try {
      const { data, error } = await authSignUpWithPassword(email, password, name);
      console.log('Signup result:', { hasData: !!data, hasError: !!error, error: error?.message });

      if (error) {
        return { success: false, error: error.message || JSON.stringify(error) || 'Unable to sign up' };
      }

      if (data?.session) {
        console.log('Session available, storing...');
        await storeSession(data.session);
      }

      if (data?.profile) {
        setUser(mapProfile(data.profile));
      }

      if (data?.requiresEmailConfirmation) {
        console.log('Email confirmation required');
        return { success: true, message: data.message };
      }

      console.log('Signup completed successfully');
      return { success: true };
    } catch (exception) {
      console.log('Signup exception:', exception);
      return { success: false, error: exception.message || JSON.stringify(exception) };
    }
  };

  const signInWithGoogle = async () => {
    console.log('Starting Google OAuth sign-in...');
    try {
      const redirectTo = Linking.createURL('auth/callback');
      console.log('Using redirect URL:', redirectTo);

      const { data, error } = await authSignInWithGoogle(redirectTo);
      console.log('Google OAuth result:', { hasData: !!data, hasError: !!error, error: error?.message });

      if (error) {
        return { success: false, error: error.message || JSON.stringify(error) || 'Unable to sign in with Google' };
      }

      if (data?.url) {
        console.log('Opening Google OAuth URL with WebBrowser:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        if (result.type === 'success') {
          console.log('WebBrowser auth success, processing callback...');
          const { url } = result;
          await handleUrl({ url });
          return { success: true };
        } else {
          console.log('WebBrowser auth cancelled or failed:', result.type);
          return { success: false, error: 'Google sign-in was cancelled or failed.' };
        }
      }

      return { success: false, error: 'Unable to open Google sign-in flow.' };
    } catch (exception) {
      console.log('Google sign-in exception:', exception);
      return { success: false, error: exception.message || JSON.stringify(exception) };
    }
  };

  const sendOtp = async (email) => {
    console.log('Sending OTP to:', email);
    try {
      const { error } = await authSignInWithOtp(email);
      if (error) {
        return { success: false, error: error.message || JSON.stringify(error) };
      }
      return { success: true };
    } catch (exception) {
      return { success: false, error: exception.message || JSON.stringify(exception) };
    }
  };

  const verifyOtp = async (email, token, name = null) => {
    console.log('Verifying OTP for:', email);
    try {
      const { data, error } = await authVerifyOtp(email, token);
      if (error) {
        return { success: false, error: error.message || JSON.stringify(error) };
      }

      if (data?.session) {
        await storeSession(data.session);
        const { data: profile, error: profileError } = await fetchOrCreateProfile(data.session.user.id, {
          email,
          name: name || data.session.user.user_metadata?.name || 'Traveller',
        });

        if (!profileError && profile) {
          setUser(mapProfile(profile));
        }
      }

      return { success: true };
    } catch (exception) {
      return { success: false, error: exception.message || JSON.stringify(exception) };
    }
  };

  const updateUser = async (updatedData) => {
    if (!session?.user?.id) {
      return { success: false, error: 'No active user session' };
    }

    const { profile, error } = await updateProfile(session.user.id, updatedData);
    if (error) {
      return { success: false, error: error.message || 'Unable to update profile' };
    }

    setUser(mapProfile(profile));
    return { success: true };
  };

  const logout = async () => {
    try {
      await supabaseSignOut();
    } catch (error) {
      console.log('Supabase logout error:', error);
    }
    await clearSession();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, sendOtp, verifyOtp, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
