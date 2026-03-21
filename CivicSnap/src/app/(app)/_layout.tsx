import { useEffect } from "react";
import { Redirect,Stack } from "expo-router";
import { useAuthContext } from '@components/functional/Auth/authProvider';

import { RealtimeProvider } from "@core/modules/realtimeProvider/RealtimeProvider";
import { registerForPushNotifications } from "@core/modules/notifications/pushNotifications";

export default function AppLayout() {
  const { isLoggedIn, profile } = useAuthContext();

  useEffect(() => {
    if (profile?.$id) {
        registerForPushNotifications(profile.$id);
    }
}, [profile?.$id]);

  if (!isLoggedIn) {
    return <Redirect href="/welcome" />;
  }
  return (
    <RealtimeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report" />
      </Stack>
    </RealtimeProvider>
  );
}