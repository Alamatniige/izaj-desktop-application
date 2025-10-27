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

  useEffect(() => {
    // Apply or remove dark class to html element
    console.log('Dark mode state:', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to html');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from html');
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

