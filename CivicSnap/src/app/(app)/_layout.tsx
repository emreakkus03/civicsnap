import { Redirect,Stack } from "expo-router";
import { useAuthContext } from '@components/functional/Auth/authProvider';

import { RealtimeProvider } from "@core/modules/realtimeProvider/RealtimeProvider";

export default function AppLayout() {
  const { isLoggedIn } = useAuthContext();

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