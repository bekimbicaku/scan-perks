const fs = require('fs');
const path = require('path');

const appConfig = require('../app.config.js');
const expo = appConfig.expo;

const publicDir = path.join(__dirname, '..', 'public');
const versionFile = path.join(publicDir, 'version.json');

let buildNumber = 1;

if (fs.existsSync(versionFile)) {
  try {
    const existing = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    buildNumber = Number(existing.buildNumber) || 1;
    if (existing.version === expo.version) {
      buildNumber += 1;
    }
  } catch {
    // Keep default build number when the existing manifest cannot be parsed.
  }
}

const versionPayload = {
  version: expo.version,
  buildNumber,
  iosBuildNumber: String(buildNumber),
  releasedAt: new Date().toISOString(),
  releaseNotes: process.env.RELEASE_NOTES || 'Performance improvements and bug fixes.',
  webUrl: process.env.EXPO_PUBLIC_APP_URL || 'https://app.scan-perks.com',
  androidUrl:
    process.env.EXPO_PUBLIC_ANDROID_STORE_URL ||
    'https://play.google.com/store/apps/details?id=com.scanperks.app',
  iosUrl:
    process.env.EXPO_PUBLIC_IOS_STORE_URL || 'https://apps.apple.com/app/id6744923279',
};

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(versionFile, `${JSON.stringify(versionPayload, null, 2)}\n`);

console.log(`Synced version.json → v${versionPayload.version} (build ${versionPayload.buildNumber})`);
