import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemeProvider } from "@react-navigation/native";
import { Theme, Variables } from "@style/theme";

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
    <Stack screenOptions={{ headerShown: false }}>
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
      <ThemeProvider value={Theme}>
        <AuthProvider>
          <InitialLayout />
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
