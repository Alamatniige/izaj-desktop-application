import React from 'react';

export const Loading: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-14 w-14 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading"
        />
        <p className="text-sm text-foreground/80">Loading...</p>
      </div>
    </div>
  );
};


