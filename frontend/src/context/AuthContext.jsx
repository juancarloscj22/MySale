import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuthContext } from './authContext.js';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, blocked')
      .eq('id', userId)
      .single();

    if (error) {
      setProfile(null);
      setProfileError(error.message);
      return;
    }

    setProfile(data);
    setProfileError('');
  }, []);

  useEffect(() => {
    let active = true;

    const applySession = async (nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setProfile(null);

      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfileError('');
      }

      if (active) setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return applySession(data.session);
      })
      .catch((error) => {
        if (!active) return;
        setProfileError(error.message);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => void applySession(nextSession), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
    });

    if (error) throw error;
    return data;
  }, []);

  const updateProfile = useCallback(async ({ fullName, phone }) => {
    if (!session?.user) throw new Error('Debes iniciar sesión para actualizar tu perfil.');

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() })
      .eq('id', session.user.id)
      .select('id, full_name, phone, role, blocked')
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  }, [session]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [loadProfile, session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        profileError,
        signIn,
        signUp,
        updateProfile,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
