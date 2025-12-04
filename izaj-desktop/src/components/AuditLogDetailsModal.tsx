import React from 'react';
import { Icon } from '@iconify/react';
import { AuditLog } from '../types/index';

interface AuditLogDetailsModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

export function AuditLogDetailsModal({ log, onClose }: AuditLogDetailsModalProps) {
  if (!log) return null;

  // Parse details if it's a string
  let detailsObj: any = null;
  try {
    if (typeof log.details === 'string') {
      detailsObj = JSON.parse(log.details);
    } else if (log.details) {
      detailsObj = log.details;
    }
  } catch (e) {
    // If parsing fails, treat as plain string
    detailsObj = log.details;
  }

  const formatDetails = (obj: any, indent = 0): React.ReactNode => {
    if (obj === null || obj === undefined) {
      return <span className="text-gray-400 dark:text-slate-500">null</span>;
    }

    if (typeof obj === 'string') {
      return <span className="text-gray-900 dark:text-slate-100">{obj}</span>;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return <span className="text-blue-600 dark:text-blue-400">{String(obj)}</span>;
    }

    if (Array.isArray(obj)) {
      return (
        <div className="ml-4">
          {obj.map((item, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500 dark:text-slate-400">[{index}]</span> {formatDetails(item, indent + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof obj === 'object') {
      return (
        <div className="ml-4 space-y-1">
          {Object.entries(obj).map(([key, value]) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
              <span className="font-semibold text-gray-700 dark:text-slate-300 min-w-[120px] sm:min-w-[150px]">
                {key}:
              </span>
              <div className="flex-1">
                {typeof value === 'object' && value !== null ? (
                  formatDetails(value, indent + 1)
                ) : (
                  <span className={typeof value === 'string' 
                    ? 'text-gray-900 dark:text-slate-100' 
                    : 'text-blue-600 dark:text-blue-400'
                  }>
                    {String(value)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <span>{String(obj)}</span>;
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('CANCEL')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('APPROVE')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
    if (action.includes('VIEW')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-slate-200';
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4 sm:p-6 overflow-y-auto" 
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all relative flex flex-col my-4 sm:my-6"
        style={{ boxShadow: '0 20px 60px 0 rgba(0, 0, 0, 0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-slate-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-amber-500 transition-all z-10"
          aria-label="Close"
        >
          <Icon icon="mdi:close" className="text-xl" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-gray-100 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Icon icon="mdi:file-document-outline" className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Audit Log Details</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Icon icon="mdi:information-outline" className="text-yellow-500" />
              Basic Information
            </h3>
            
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="font-semibold text-gray-700 dark:text-slate-300 min-w-[120px]">Action:</span>
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="font-semibold text-gray-700 dark:text-slate-300 min-w-[120px]">User:</span>
                <span className="text-gray-900 dark:text-slate-100">{log.userName}</span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="font-semibold text-gray-700 dark:text-slate-300 min-w-[120px]">User ID:</span>
                <span className="text-gray-900 dark:text-slate-100 font-mono text-sm">{log.userId}</span>
              </div>
              
              {log.ip_address && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-slate-300 min-w-[120px]">IP Address:</span>
                  <span className="text-gray-900 dark:text-slate-100 font-mono text-sm">{log.ip_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          {detailsObj && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Icon icon="mdi:code-json" className="text-yellow-500" />
                Details
                {detailsObj.product_id && (
                  <span className="ml-2 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                    Product ID: {detailsObj.product_id}
                  </span>
                )}
              </h3>
              
              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="space-y-2 text-sm">
                  {formatDetails(detailsObj)}
                </div>
              </div>
            </div>
          )}

          {!detailsObj && (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
              No additional details available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-slate-800 p-6 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

