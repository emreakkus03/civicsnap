import { useColorScheme } from "react-native";
import { Colors } from "@style/theme";
import { useAuthContext } from "@components/functional/Auth/authProvider";

export const useThemeColors = () => {
  const systemTheme = useColorScheme();
  const { profile } = useAuthContext();

  let isDark = systemTheme === "dark";

  if (profile?.preferences) {
    try {
      const prefs = typeof profile.preferences === "string"
        ? JSON.parse(profile.preferences)
        : profile.preferences;

      if (prefs.dark_mode !== undefined) {
        isDark = prefs.dark_mode;
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  return isDark ? Colors.dark : Colors.light;
};