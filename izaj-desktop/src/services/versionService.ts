import API_URL from '../../config/api';

export interface VersionInfo {
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    downloadUrl: string;
    releaseNotes: string;
}

export const versionService = {
    getCurrentVersion: async (): Promise<VersionInfo> => {
        try {
            const { getVersion } = await import('@tauri-apps/api/app');
            return {
                currentVersion: await getVersion(),
                latestVersion: '',
                updateAvailable: false,
                downloadUrl: '',
                releaseNotes: '',
            };
        } catch (error) {
            console.error('Failed to get current version:', error);
            return {
                currentVersion: '1.0.5',
                latestVersion: '',
                updateAvailable: false,
                downloadUrl: '',
                releaseNotes: '',
            };
        }
    },
    checkForUpdates: async (): Promise<VersionInfo | null> => {
        try {
          const currentVersionInfo = await versionService.getCurrentVersion();
          const currentVersion = currentVersionInfo.currentVersion;
          
          // Call backend API with current version as query parameter
          const response = await fetch(`${API_URL}/api/version/check?version=${encodeURIComponent(currentVersion)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
    
          if (!response.ok) {
            throw new Error(`Failed to check for updates: ${response.status} ${response.statusText}`);
          }
    
          const data = await response.json();
          
          // Validate response data
          if (!data.latestVersion) {
            throw new Error('Invalid response from version check endpoint');
          }
          
          return {
            currentVersion: currentVersion,
            latestVersion: data.latestVersion,
            updateAvailable: data.updateAvailable || versionService.compareVersions(currentVersion, data.latestVersion) < 0,
            downloadUrl: data.downloadUrl || '',
            releaseNotes: data.releaseNotes || '',
          };
        } catch (error) {
          console.error('Error checking for updates:', error);
          // Return null to indicate check failed, but don't throw
          // This allows the app to continue functioning even if version check fails
          return null;
        }
      },

      compareVersions: (v1: string, v2: string): number => {
        const parseVersion = (version: string): number[] => {
          return version.split('.').map(Number);
        };
    
        const v1Parts = parseVersion(v1);
        const v2Parts = parseVersion(v2);
    
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
          const v1Part = v1Parts[i] || 0;
          const v2Part = v2Parts[i] || 0;
    
          if (v1Part < v2Part) return -1;
          if (v1Part > v2Part) return 1;
        }
    
        return 0;
      },
}