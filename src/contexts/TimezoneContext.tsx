'use client';

import { createContext, useContext, ReactNode } from 'react';

// Simple timezone context that just provides the browser's timezone
interface TimezoneContextType {
  timezone: string;
}

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: 'UTC',
});

export const useTimezone = () => useContext(TimezoneContext);

interface TimezoneProviderProps {
  children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  // Get timezone directly from browser
  const timezone = typeof window !== 'undefined' 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone 
    : 'UTC';

  return (
    <TimezoneContext.Provider value={{ timezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}
