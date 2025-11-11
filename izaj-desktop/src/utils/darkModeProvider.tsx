import React, { createContext, useContext, useState, useEffect } from 'react';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if there's a saved preference in localStorage
    try {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }
    // Default to false (light mode)
    return false;
  });

  // Apply dark class on initial mount based on state
  useEffect(() => {
    // Apply or remove dark class to html element immediately
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []); // Run once on mount

  useEffect(() => {
    // Apply or remove dark class to html element when state changes
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference to localStorage
    try {
      localStorage.setItem('darkMode', isDarkMode.toString());
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    console.log('Toggle dark mode clicked');
    setIsDarkMode(prev => {
      console.log('Previous state:', prev);
      return !prev;
    });
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

