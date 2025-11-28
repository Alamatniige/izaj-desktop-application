// components/RefreshButton.tsx
import { Icon } from '@iconify/react';

interface RefreshButtonProps {
  onClick: () => void;
  tooltip?: string;
  isLoading?: boolean;
}

export function RefreshButton({ onClick, tooltip = "Refresh", isLoading = false }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="flex items-center justify-center px-3 py-3 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 relative group disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <Icon icon="mdi:refresh" className={`text-lg ${isLoading ? 'animate-spin' : ''}`} />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-slate-900 text-white dark:text-slate-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {isLoading ? "Refreshing..." : tooltip}
      </div>
    </button>
  );
}