import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";
import Button from "@components/design/Button/PrimaryButton";
import ThemedText from "@/components/design/Typography/ThemedText";

export default function WelcomeScreen() {
  const router = useRouter();

                const colors = useThemeColors();
                                    
                const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      
      
      <View style={styles.header}>
        <ThemedText 
          style={styles.title} 
          weight="extrabold" 
        >
          CIVICSNAP
        </ThemedText>
        
        <ThemedText 
          type="subtitle" 
          style={styles.subtitle}
        >
          Meld, spaar & verbeter – waar{"\n"}je ook bent.
        </ThemedText>
      </View>

     
      <View style={styles.imageContainer}>
        
        <Image 
          source={require("@assets/images/welcome-illustration.png")} 
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      
      <View style={styles.footer}>
        <Button 
          variant="primary" 
          onPress={() => router.push('/register')} 
        >
          AAN DE SLAG
        </Button>
        
        <Button 
          variant="secondary" 
          onPress={() => router.push('/login')}
        >
          AL EEN ACCOUNT? LOG IN
        </Button>

      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    paddingHorizontal: Variables.sizes.lg, 
    paddingTop: 80, 
    paddingBottom: 50, 
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 45, 
    color: colors.header || "#274373",  
    letterSpacing: 1, 
    marginBottom: Variables.sizes.sm,
    textTransform: 'uppercase', 
  },
  subtitle: {
    textAlign: 'center',
    color: colors.text || "#000000",
    paddingHorizontal: 20,
    lineHeight: 24, 
  },
  imageContainer: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300, 
  },
  footer: {
    width: '100%',
  }
});