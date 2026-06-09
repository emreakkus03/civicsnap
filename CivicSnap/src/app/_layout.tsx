import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";

// Alleen nog je eigen Variables importeren, Theme is hier niet meer nodig
import { Variables } from "@style/theme";

import AuthProvider, {
  useAuthContext,
} from "@components/functional/Auth/authProvider";

SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const { isLoggedIn, isInitialized } = useAuthContext();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isInitialized) return;

    const inAppGroups = segments.filter((segment) =>
      segment.startsWith("(app)"),
    );

    if (!isLoggedIn && inAppGroups.length > 0) {
      router.push("/welcome");
    } else if (isLoggedIn && segments[0] === "welcome") {
      router.push("/(app)/(tabs)/home");
    }
  }, [isLoggedIn, isInitialized, segments]);

  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Variables.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Variables.colors.primary} />
      </View>
    );
  }

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        // Dit vervangt de oude ThemeProvider logica en is SDK 56 proof!
        contentStyle: { backgroundColor: Variables.colors.background } 
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
};

export default function RootLayout() {
  const [loaded] = useFonts({
    "inter-regular": require("@assets/fonts/Inter_18pt-Regular.ttf"),
    "inter-medium": require("@assets/fonts/Inter_18pt-Medium.ttf"),
    "inter-semibold": require("@assets/fonts/Inter_18pt-SemiBold.ttf"),
    "inter-bold": require("@assets/fonts/Inter_18pt-Bold.ttf"),
    "inter-extrabold": require("@assets/fonts/Inter_18pt-ExtraBold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <InitialLayout />
        <StatusBar style="auto" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}