const Palette = {
  primaryBlue: "#0870C4",      
  darkBlue: "#274373",         
  background: "#F5F7FA",       
  white: "#FFFFFF",            
  black: "#000000",            
  grey: "#747373",            
  red: "#D3465C",             
};

export const Fonts = {
  regular: "inter-regular",
  default: "inter-medium",
  semibold: "inter-semibold",
  bold: "inter-bold",
  extrabold: "inter-extrabold",
};

export const Variables = {
  colors: {
    primary: Palette.primaryBlue,
    secondary: Palette.white,      
    background: Palette.background,
    surface: Palette.white,        
    header: Palette.darkBlue,     
    text: Palette.black,           
    textLight: Palette.grey,       
    textInverse: Palette.white,    
    textHighlight: Palette.primaryBlue, 
    error: Palette.red,            
    border: Palette.primaryBlue,  
  },
  
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

// Dit is het vernieuwde Theme object (compatibel met SDK 56 / React Navigation v7)
export const Theme = {
  dark: false,
  colors: {
    primary: Variables.colors.primary,
    background: Variables.colors.background, 
    card: Variables.colors.surface,         
    text: Variables.colors.text,
    border: "transparent",     
    notification: Variables.colors.error,              
  },
  fonts: {
    regular: { fontFamily: Fonts.regular, fontWeight: "400" as const },
    medium: { fontFamily: Fonts.default, fontWeight: "500" as const },
    bold: { fontFamily: Fonts.bold, fontWeight: "700" as const },
    heavy: { fontFamily: Fonts.extrabold, fontWeight: "800" as const },
  },
};

export const DefaultScreenOptions = {
  headerStyle: {
    backgroundColor: Variables.colors.header, 
  },
  headerTintColor: Variables.colors.textInverse, 
  headerTitleStyle: {
    fontFamily: Fonts.bold,
    fontSize: Variables.textSizes.md,
  },
  tabBarStyle: {
    backgroundColor: Variables.colors.surface, 
    borderTopWidth: 0,
    elevation: 5, 
  },
  tabBarActiveTintColor: Variables.colors.primary, 
  tabBarInactiveTintColor: Variables.colors.textLight, 
};