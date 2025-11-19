import { createContext, useContext, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';

interface SessionContextType {
  session: Session | null;
  setSession: (session: Session | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) {
    // Return default values instead of throwing error to prevent crashes
    console.warn('useSessionContext used outside SessionProvider, returning default values');
    return { session: null, setSession: () => {} };
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider = ({ children }: SessionProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  );
};

