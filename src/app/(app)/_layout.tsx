import { Redirect,Stack } from "expo-router";
import { useAuthContext } from '@components/functional/Auth/authProvider';

export default function AppLayout() {
  const { isLoggedIn } = useAuthContext();

  if (!isLoggedIn) {
    return <Redirect href="/welcome" />;
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="report" />
    </Stack>
  );
}