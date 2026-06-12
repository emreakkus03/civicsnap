import {
  Text,
  type TextProps,
  StyleSheet,
  TextStyle,
  StyleProp,
} from "react-native";

import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";

export type ThemedTextProps = TextProps & {
  
  type?: "default" | "title" | "subtitle" | "center" | "small" | "error" | "button";
  
  
  color?: "default" | "light" | "inverse" | "blue" | "red";
  
  
  weight?: "normal" | "bold" | "semibold" | "extrabold";
  
  
  style?: StyleProp<TextStyle>;
};

const ThemedText = ({
  style,
  type = "default",
  color = "default",
  weight = "normal",
  ...rest
}: ThemedTextProps) => {
        const colors = useThemeColors();                                       
        const styles = createStyles(colors);
  return (
    <Text
      style={[
       
        styles.default,
        
       
        type === "title" && styles.title,
        type === "subtitle" && styles.subtitle,
        type === "center" && styles.center,
        type === "small" && styles.small,
        type === "button" && styles.button,
       
        color === "light" && styles.light,
        color === "inverse" && styles.inverse,
        color === "blue" && styles.blue,
        color === "red" && styles.error,      
        
        
        weight === "bold" && styles.bold,
        weight === "semibold" && styles.semibold,
        weight === "extrabold" && styles.extrabold,
        
       
        style,
      ]}
      {...rest}
    />
  );
};

const createStyles = (colors: any) => StyleSheet.create({
 
  default: {
    fontSize: Variables.textSizes.base,   
    fontFamily: Variables.fonts.default,   
    color: colors.text,         
  },
  
  
  title: {
    fontSize: Variables.textSizes.lg,      
    fontFamily: Variables.fonts.bold,    
    marginBottom: Variables.sizes.xs,      
  },
  subtitle: {
    fontSize: Variables.textSizes.md,      
    fontFamily: Variables.fonts.semibold, 
  },
  small: {
    fontSize: Variables.textSizes.sm,      
  },
  center: {
    textAlign: "center",
  },
  
 
  light: {
    color: colors.textLight,    
  },
  inverse: {
    color: colors.textInverse,   
  },
  blue: {
    color: colors.textHighlight,
  },
  error: {
    color: colors.error,         
  },


  bold: {
    fontFamily: Variables.fonts.bold,      
  },
  semibold: {
    fontFamily: Variables.fonts.semibold,  
  },
  extrabold: { fontFamily: Variables.fonts.extrabold },
  button: {
    fontSize: Variables.textSizes.md,     
    fontFamily: Variables.fonts.semibold, 
    textAlign: "center",                  
  },
});

export default ThemedText;