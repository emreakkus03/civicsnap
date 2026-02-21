import { DefaultTheme } from "@react-navigation/native";


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


export const Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Variables.colors.primary,
    background: Variables.colors.background, 
    card: Variables.colors.surface,         
    text: Variables.colors.text,
    border: "transparent",                   
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