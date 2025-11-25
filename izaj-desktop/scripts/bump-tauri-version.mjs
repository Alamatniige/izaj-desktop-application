import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tauriConfigPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');

const bumpPatch = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  if (!match) {
    throw new Error(`Invalid semver string "${version}". Expected format: MAJOR.MINOR.PATCH`);
  }

  const [major, minor, patch] = match.slice(1).map(Number);
  return `${major}.${minor}.${patch + 1}`;
};

const syncWindowTitles = (conf, version) => {
  if (!conf?.app?.windows) {
    return;
  }

  conf.app.windows = conf.app.windows.map((windowConfig) => {
    if (typeof windowConfig.title === 'string') {
      const hasVersionSuffix = /v\d+\.\d+\.\d+$/.test(windowConfig.title);
      windowConfig.title = hasVersionSuffix
        ? windowConfig.title.replace(/v\d+\.\d+\.\d+$/, `v${version}`)
        : `${windowConfig.title} v${version}`;
    }
    return windowConfig;
  });
};

const main = async () => {
  const conf = JSON.parse(await readFile(tauriConfigPath, 'utf8'));
  const nextVersion = bumpPatch(conf.version ?? '0.0.0');

  conf.version = nextVersion;
  syncWindowTitles(conf, nextVersion);

  await writeFile(tauriConfigPath, `${JSON.stringify(conf, null, 2)}\n`, 'utf8');
  console.log(`Tauri version bumped to ${nextVersion}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

