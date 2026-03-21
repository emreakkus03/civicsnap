import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "CivicSnap",
  slug: "CivicSnap",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "civicsnap",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  
  ios: {
    supportsTablet: true,
    bundleIdentifier: "dev.emre.CivicSnap",
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "CivicSnap gebruikt je locatie om te laten zien waar je bent op de kaart."
    },
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    }
  },
  
  android: {
    adaptiveIcon: {
      backgroundColor:  "#F5F7FA",
       foregroundImage: "./assets/images/icon.png",
    },
    package: "dev.emre.CivicSnap",
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION"
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      }
    }
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