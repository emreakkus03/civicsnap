const Palette = {
  primaryBlue: "#0870C4",
  darkBlue: "#274373",
  backgroundLight: "#F5F7FA",
  backgroundDark: "#0F172A",
  white: "#FFFFFF",
  black: "#000000",
  surfaceDark: "#1E293B",
  greyLight: "#747373",
  greyDark: "#94A3B8",
  red: "#D3465C",
};

export const Fonts = {
  regular: "inter-regular",
  default: "inter-medium",
  semibold: "inter-semibold",
  bold: "inter-bold",
  extrabold: "inter-extrabold",
};

export const Colors = {
  light: {
    primary: Palette.primaryBlue,
    secondary: Palette.white,
    background: Palette.backgroundLight,
    surface: Palette.white,
    header: Palette.darkBlue,
    text: Palette.black,
    textLight: Palette.greyLight,
    textInverse: Palette.white,
    textHighlight: Palette.primaryBlue,
    error: Palette.red,
    border: Palette.primaryBlue,
  },
  dark: {
    primary: Palette.primaryBlue,
    secondary: Palette.surfaceDark,
    background: Palette.backgroundDark,
    surface: Palette.surfaceDark,
    header: Palette.backgroundDark,
    text: Palette.white,
    textLight: Palette.greyDark,
    textInverse: Palette.white,
    textHighlight: Palette.primaryBlue,
    error: Palette.red,
    border: Palette.primaryBlue,
  }
};

export const Variables = {
  sizes: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  textSizes: {
    sm: 14,
    base: 16,
    md: 18,
    lg: 22,
    xl: 28,
  },
  fonts: {
    ...Fonts,
  },
};

export const getTheme = (isDark: boolean) => ({
  dark: isDark,
  colors: {
    primary: isDark ? Colors.dark.primary : Colors.light.primary,
    background: isDark ? Colors.dark.background : Colors.light.background,
    card: isDark ? Colors.dark.surface : Colors.light.surface,
    text: isDark ? Colors.dark.text : Colors.light.text,
    border: "transparent",
    notification: isDark ? Colors.dark.error : Colors.light.error,
  },
  fonts: {
    regular: { fontFamily: Fonts.regular, fontWeight: "400" as const },
    medium: { fontFamily: Fonts.default, fontWeight: "500" as const },
    bold: { fontFamily: Fonts.bold, fontWeight: "700" as const },
    heavy: { fontFamily: Fonts.extrabold, fontWeight: "800" as const },
  },
});

export const getDefaultScreenOptions = (isDark: boolean) => {
  const activeColors = isDark ? Colors.dark : Colors.light;
  
  return {
    headerStyle: {
      backgroundColor: activeColors.header,
    },
    headerTintColor: activeColors.textInverse,
    headerTitleStyle: {
      fontFamily: Fonts.bold,
      fontSize: Variables.textSizes.md,
    },
    tabBarStyle: {
      backgroundColor: activeColors.surface,
      borderTopWidth: 0,
      elevation: 5,
    },
    tabBarActiveTintColor: activeColors.primary,
    tabBarInactiveTintColor: activeColors.textLight,
  };
};