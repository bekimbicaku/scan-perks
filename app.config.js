const path = require('path');

module.exports = {
  expo: {
    name: "ScanPerks",
    slug: "scan-perks",
    owner: "bekimb",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "scanperks",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/favicon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.scanperks.app",
      infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: "We use the camera to scan QR codes at participating businesses and unlock rewards.",
      NSLocationWhenInUseUsageDescription: "We use your location to show nearby businesses where you can scan QR codes and earn rewards."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.scanperks.app",
      permissions: [
        "CAMERA",
        "ACCESS_FINE_LOCATION"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera.",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos."
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true
    },
    extra: {
      // Automatically load all EXPO_PUBLIC_ environment variables
      ...Object.fromEntries(
        Object.entries(process.env)
          .filter(([key]) => key.startsWith('EXPO_PUBLIC_'))
          .map(([key, value]) => [key.replace('EXPO_PUBLIC_', ''), value])
      ),
      eas: {
        projectId: "c5472ecf-b98c-43a6-b987-86ce074f2a47"
      }
    }
  }
};