import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { processOfflineQueue } from '../lib/offlineQueue';

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
      const isAdminEmail = email === 'admin@voltdesk.hu' || email === 'avar.szilveszter@gmail.com';
      const enforcedRole = isAdminEmail ? 'admin' : 'worker';

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // Ha a profil nem található (PGRST116) és van aktív session, hozzuk létre automatikusan!
        if (error.code === 'PGRST116' && sessionUser) {
          const fullName = sessionUser.user_metadata?.full_name || (isAdminEmail ? 'Adminisztrátor' : 'Szerelő');
          
          const { data: newProfile, error: insertErr } = await supabase
            .from('profiles')
            .insert([{
              id: userId,
              full_name: fullName,
              role: enforcedRole,
              serial_number: enforcedRole === 'admin' ? 'ADM-01' : 'EMP-99'
            }])
            .select()
            .single();
          
          if (insertErr) throw insertErr;
          setUser({ ...newProfile, email, role: enforcedRole });
          return;
        }
        throw error;
      }
      setUser({ ...data, email, role: enforcedRole });
    } catch (err) {
      console.error("Hiba a felhasználói profil betöltésekor:", err);
      // Biztonsági mentőöv: offline profil állapot, hogy az app zökkenőmentesen fusson
      if (sessionUser) {
        const isAdminEmail = email === 'admin@voltdesk.hu' || email === 'avar.szilveszter@gmail.com';
        const enforcedRole = isAdminEmail ? 'admin' : 'worker';
        setUser({
          id: userId,
          email,
          full_name: sessionUser.user_metadata?.full_name || (isAdminEmail ? 'Adminisztrátor' : 'Szerelő'),
          role: enforcedRole,
          serial_number: enforcedRole === 'admin' ? 'ADM-01' : 'EMP-99'
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

  useEffect(() => {
    if (!user) return;

    const handleOnline = async () => {
      console.log("Hálózat visszaállt, offline sor ellenőrzése...");
      try {
        const result = await processOfflineQueue(supabase);
        if (result.success && result.count > 0) {
          alert(`Sikeresen feltöltöttünk ${result.count} db korábban offline rögzített fényképet!`);
        }
      } catch (err) {
        console.error("Hiba az offline szinkronizáció során:", err);
      }
    };

    window.addEventListener('online', handleOnline);

    // Ha most jelentkezik be és online van, ellenőrizzük a sort
    if (navigator.onLine) {
      processOfflineQueue(supabase).then(result => {
        if (result.success && result.count > 0) {
          alert(`Sikeresen feltöltöttünk ${result.count} db korábban offline rögzített fényképet!`);
        }
      }).catch(err => {
        console.error("Hiba a bejelentkezéskori szinkronizációkor:", err);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
