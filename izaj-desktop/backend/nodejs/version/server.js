import express from 'express';

const router = express.Router();

const LATEST_VERSION = '1.0.7';
const PRODUCT_NAME = 'Izaj Lighting Centre';
const GITHUB_USERNAME = 'Alamatniige';
const GITHUB_REPO = 'izaj-desktop-application';
const DOWNLOAD_BASE_URL = `https://github.com/${GITHUB_USERNAME}/${GITHUB_REPO}/releases/download/`;

const compareVersions = (v1, v2) => {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }
  return 0;
};

router.get('/check', async (req, res) => {
  try {
    // Get current version from query parameter (sent by frontend)
    const currentVersion = req.query.version || '1.0.0';
    
    const updateAvailable = compareVersions(currentVersion, LATEST_VERSION) < 0;
    
    // GitHub Releases URL format: /releases/download/v{VERSION}/{FILENAME}
    const filename = `${PRODUCT_NAME}_${LATEST_VERSION}_x64-setup.exe`;
    const downloadUrl = updateAvailable 
      ? `${DOWNLOAD_BASE_URL}v${LATEST_VERSION}/${filename}`
      : null;

    res.json({
      currentVersion,
      latestVersion: LATEST_VERSION,
      updateAvailable,
      downloadUrl,
      releaseNotes: updateAvailable 
        ? 'Bug fixes and performance improvements. Please download the latest version for the best experience.'
        : null,
    });
  } catch (error) {
    console.error('Version check error:', error);
    res.status(500).json({ error: 'Failed to check version' });
  }
});

export default router;