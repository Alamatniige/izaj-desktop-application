import { useState } from 'react';
import { versionService, VersionInfo } from '../services/versionService';

export const useVersionCheck = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);
    setVersionInfo(null); // Clear previous results
    
    try {
      const info = await versionService.checkForUpdates();
      setVersionInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
      console.error('Version check error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  return {
    versionInfo,
    isChecking,
    error,
    checkForUpdates,
  };
};