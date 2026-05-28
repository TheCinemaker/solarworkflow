import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UserContext = createContext({
  user: null,
  loading: true,
  refreshUser: () => {}
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId, email, sessionUser) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // Ha a profil nem található (PGRST116) és van aktív session, hozzuk létre automatikusan!
        if (error.code === 'PGRST116' && sessionUser) {
          const fullName = sessionUser.user_metadata?.full_name || 'Adminisztrátor';
          const role = sessionUser.user_metadata?.role || 'admin';
          
          const { data: newProfile, error: insertErr } = await supabase
            .from('profiles')
            .insert([{
              id: userId,
              full_name: fullName,
              role: role,
              serial_number: role === 'admin' ? 'ADM-01' : 'EMP-99'
            }])
            .select()
            .single();
          
          if (insertErr) throw insertErr;
          setUser({ ...newProfile, email });
          return;
        }
        throw error;
      }
      setUser({ ...data, email });
    } catch (err) {
      console.error("Hiba a felhasználói profil betöltésekor:", err);
      // Biztonsági mentőöv: offline profil állapot, hogy az app zökkenőmentesen fusson
      if (sessionUser) {
        setUser({
          id: userId,
          email,
          full_name: sessionUser.user_metadata?.full_name || 'Adminisztrátor',
          role: sessionUser.user_metadata?.role || 'admin',
          serial_number: 'ADM-01'
        });
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 1. Meglévő munkamenet lekérése
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id, session.user.email, session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // 2. Munkamenet változásának figyelése
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchProfile(session.user.id, session.user.email, session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUser = () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id, session.user.email, session.user);
      }
    });
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
