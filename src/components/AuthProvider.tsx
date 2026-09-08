import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchApi, getToken } from '../lib/api';

export type User = { id: string; email: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, setUser: () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await fetchApi('/auth/me');
        if (data.user) {
          setUser(data.user);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
