import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "CivicSnap",
  slug: "CivicSnap",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "civicsnap",
  userInterfaceStyle: "light",
  
  ios: {
    supportsTablet: true,
    bundleIdentifier: "dev.emre.CivicSnap",
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "CivicSnap gebruikt je locatie om te laten zien waar je bent op de kaart.",
      NSCameraUsageDescription: "CivicSnap heeft toegang tot je camera nodig om een foto van het probleem te maken.",
      NSPhotoLibraryUsageDescription: "CivicSnap heeft toegang tot je galerij nodig om een foto te selecteren."
    },
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY,
    }
  },
  
  android: {
    adaptiveIcon: {
      backgroundColor:  "#F5F7FA",
      foregroundImage: "./assets/images/civicsnap-adaptive-icon.png",
    },
    package: "dev.emre.CivicSnap",
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    predictiveBackGestureEnabled: false,
    allowBackup: false,
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY,
      }
    },
  },
  
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        "image": "./assets/images/icon.png",
        "imageWidth": 150,
        "resizeMode": "contain",
        "backgroundColor": "#F5F7FA",
        "dark": {
          "image": "./assets/images/icon.png",
          "backgroundColor": "#274373"
        }
      }
    ],
    [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "CivicSnap gebruikt je locatie om te laten zien waar je bent op de kaart."
        }
    ],
    [
        "expo-notifications",
        {
            "icon": "./assets/images/icon.png",
            "color": "#274373"
        }
    ],
    "expo-font",
    "expo-image",
    "expo-status-bar",
    "expo-web-browser",
    [
      "expo-build-properties",
      {
        "android": {
          "minSdkVersion": 29
        }
      }
    ]
  ],
  
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  },
  extra: {
    eas: {
      projectId: "1a08a2cf-4263-4559-a656-967b802a7750"
    }
  }
});