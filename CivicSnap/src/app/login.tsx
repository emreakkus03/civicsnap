import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,  Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import Button from "@components/design/Button/PrimaryButton";
import BackButton from "@components/design/Button/BackButton";
import ThemedText from "@components/design/Typography/ThemedText";
import { useAuthContext } from "@components/functional/Auth/authProvider";

import { Variables } from "@style/theme";

import { sendPasswordRecovery } from "@core/modules/auth/api";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoggedIn } = useAuthContext();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Foutje", "Vul aub alle velden in.");
      return;
    }

    setLoading(true);
    try {
      
      await login({ email, password });
      
      Alert.alert("Succes", "Je bent ingelogd!");
      router.push("/(app)/(tabs)/home");
      
    } catch (error: any) {
      Alert.alert("Login Mislukt", error.message || "Controleer je gegevens.");
    } finally {
      setLoading(false);
    }
  };

 const handleForgotPassword = () => {
    setResetEmail(email);
    setShowResetModal(true);
};

const handleSendReset = async () => {
    if (!resetEmail) {
        Alert.alert("Fout", "Vul je e-mailadres in.");
        return;
    }
    setIsSendingReset(true);
    try {
        const resetUrl = `${process.env.EXPO_PUBLIC_RESET_URL}?source=login`;
        await sendPasswordRecovery(resetEmail, resetUrl);
        setShowResetModal(false);
        Alert.alert("E-mail verzonden", "Check je inbox en klik op de link om terug te keren naar de app.");
    } catch (error: any) {
        Alert.alert("Fout", error.message || "Kon geen herstel-mail sturen.");
    } finally {
        setIsSendingReset(false);
    }
};
  return (
   
      <KeyboardAwareScrollView contentContainerStyle={styles.container} enableOnAndroid={true} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>

          <View style={styles.backButtonWrapper}>
              <BackButton />
          </View>

          <View style={styles.header}>
              <ThemedText type="title" style={styles.headerTitle}>
                  Welkom terug!
              </ThemedText>
              <ThemedText style={styles.subTitle}>
                  Log in om verder te gaan.
              </ThemedText>
          </View>
        </View>

       
        <View style={styles.form}>

            
            <View style={styles.inputContainer}>
                <Image 
                    source={require('@assets/icons/Mail.png')} 
                    style={styles.inputIcon} 
                />
                <TextInput
                    style={styles.inputText}
                    placeholder="E-mailadres"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#666"
                />
            </View>

      
            <View style={styles.inputContainer}>
                <Image 
                    source={require('@assets/icons/Lock.png')} 
                    style={styles.inputIcon} 
                />
                <TextInput
                    style={styles.inputText}
                    placeholder="Wachtwoord"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    placeholderTextColor="#666"
                />
                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                    <Ionicons 
                        name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#999" 
                    />
                </TouchableOpacity>
            </View>

        
            <Button 
                style={{ marginTop: 20 }}
                onPress={handleLogin}
                disabled={loading}
                variant="primary"
            >
                {loading ? "LADEN..." : "INLOGGEN"}
            </Button>

          
            <View style={styles.linksContainer}>
                <TouchableOpacity onPress={handleForgotPassword} disabled={isSendingReset}>
    {isSendingReset ? (
        <ActivityIndicator size="small" color={Variables.colors.primary} />
    ) : (
        <Text style={styles.linkText}>Wachtwoord vergeten?</Text>
    )}
</TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/register')}>
                    <Text style={styles.linkText}>Registreer</Text>
                </TouchableOpacity>
            </View>

        </View>

       
        <View style={styles.footer}>
            <Text style={styles.footerText}>
                Door verder te gaan, accepteer je onze{"\n"}
                <Text style={styles.legalLink}>Gebruiksvoorwaarden</Text> en <Text style={styles.legalLink}>Privacybeleid</Text>
            </Text>
        </View>

{showResetModal && (
    <View style={styles.resetModalOverlay}>
        <View style={styles.resetModalCard}>
            <Text style={styles.resetModalTitle}>Wachtwoord vergeten?</Text>
            <Text style={styles.resetModalSubtitle}>
                Voer je e-mailadres in om een herstellink te ontvangen.
            </Text>

            <View style={styles.inputContainer}>
                <Image source={require('@assets/icons/Mail.png')} style={styles.inputIcon} />
                <TextInput
                    style={styles.inputText}
                    placeholder="E-mailadres"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#666"
                />
            </View>

            <View style={styles.resetModalButtons}>
                <TouchableOpacity style={styles.resetCancelButton} onPress={() => setShowResetModal(false)}>
                    <Text style={styles.resetCancelText}>Annuleren</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetConfirmButton} onPress={handleSendReset} disabled={isSendingReset}>
                    {isSendingReset ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.resetConfirmText}>Stuur link</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    </View>
)}
      </KeyboardAwareScrollView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    justifyContent: 'space-between', 
  },
  backButtonWrapper: {
    position: 'absolute', 
    left: 0,              
    zIndex: 10,           
    marginTop: 28,
    transform: [{ scale: 1.5 }], 
    padding: 5, 
  },
   headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    position: 'relative',
    height: 50,
    width: '100%',
  },
  header: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Variables.fonts.bold || "bold",
    color: Variables.colors.text || "#000",
    marginBottom: 4,
  },
  subTitle: {
    fontSize: Variables.textSizes.base || 16,
    color: Variables.colors.textLight ||  "#747373",
  },
  

  form: {
    width: '100%',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Variables.colors.background || "#F5F7FA",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: Variables.colors.text || "#000",
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    fontSize: Variables.textSizes.base || 16,
    color: Variables.colors.text || "#000",
    height: '100%',
  },

  
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  linkText: {
    color: Variables.colors.primary || "#0870C4", 
    fontFamily: Variables.fonts.default || "medium",
    textDecorationLine: 'underline',
  },


  footer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  footerText: {
    textAlign: 'center',
    color: Variables.colors.textLight || "#747373",
    fontSize: Variables.textSizes.sm || 14,
    lineHeight: 20,
  },
  legalLink: {
    color: Variables.colors.primary || "#0870C4",
    fontFamily: Variables.fonts.semibold || "semibold",
    textDecorationLine: 'underline',
  },
  resetModalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Variables.sizes.lg,
},
resetModalCard: {
    backgroundColor: Variables.colors.surface,
    borderRadius: 20,
    padding: Variables.sizes.lg,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
},
resetModalTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.lg,
    color: Variables.colors.text,
    marginBottom: Variables.sizes.xs,
},
resetModalSubtitle: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
    marginBottom: Variables.sizes.md,
    lineHeight: 20,
},
resetModalButtons: {
    flexDirection: "row",
    gap: Variables.sizes.sm,
    marginTop: Variables.sizes.sm,
},
resetCancelButton: {
    flex: 1,
    paddingVertical: Variables.sizes.md,
    borderRadius: 12,
    backgroundColor: Variables.colors.background,
    alignItems: "center",
},
resetCancelText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.textLight,
},
resetConfirmButton: {
    flex: 1,
    paddingVertical: Variables.sizes.md,
    borderRadius: 12,
    backgroundColor: Variables.colors.primary,
    alignItems: "center",
},
resetConfirmText: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.textInverse,
},
});