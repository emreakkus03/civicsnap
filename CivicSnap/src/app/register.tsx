import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Text,
} from "react-native";

import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import Button from "@components/design/Button/PrimaryButton";
import BackButton from "@components/design/Button/BackButton";
import ThemedText from "@components/design/Typography/ThemedText";
import { useAuthContext } from "@components/functional/Auth/authProvider";
import { Variables } from "@style/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthContext();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const pickImage = async () => {
   
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.granted) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setAvatarUri(result.assets[0].uri);
      }
    }
  };

  const handleRegister = async () => {
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Foutje", "Vul aub alle velden in.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Foutje", "Wachtwoorden komen niet overeen.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Foutje", "Wachtwoord moet minstens 6 tekens bevatten.");
      return;
    }

    try {
      setLoading(true);
      await register({
        email: email,
        password: password,
        fullname: name,
        avatarUri,
      });
      Alert.alert("Succes", "Je account is aangemaakt!");
      router.push("/(app)/(tabs)/home");
    } catch (err: any) {
      console.log("Error response:", err.response);

      setError(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container} enableOnAndroid={true} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          extraScrollHeight={50}>
        <View style={styles.headerRow}>
            <View style={styles.backButtonWrapper}>
                <BackButton />
            </View>
            <ThemedText type="title" style={styles.headerTitle}>
                Account aanmaken
            </ThemedText>
        </View>

        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <View style={styles.avatarPlaceholder}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Image 
                    source={require('@assets/icons/User.png')} 
                    style={{ width: 60, height: 60, }} 
                    resizeMode="contain"
                />
              )}
              
              <View style={styles.plusBadge}>
                  <Ionicons name="add" size={20} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarText}>Kies je profielfoto</Text>
        </View>

        <View style={styles.form}>
          
         
          <View style={styles.inputContainer}>
            <Image 
                source={require('@assets/icons/User.png')} 
                style={styles.inputIcon} 
            />
            <TextInput
              placeholder="Volledige naam"
              value={name}
              onChangeText={setName}
              style={styles.inputText}
              placeholderTextColor="#666"
            />
          </View>

         
          <View style={styles.inputContainer}>
            <Image 
                source={require('@assets/icons/Mail.png')} 
                style={styles.inputIcon} 
            />
            <TextInput
              placeholder="E-mailadres"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.inputText}
              placeholderTextColor="#666"
            />
          </View>

        
          <View style={styles.inputContainer}>
            <Image 
                source={require('@assets/icons/Lock.png')} 
                style={styles.inputIcon} 
            />
            <TextInput
              placeholder="Wachtwoord"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible} 
              style={styles.inputText}
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

       
          <View style={styles.inputContainer}>
            <Image 
                source={require('@assets/icons/Lock.png')} 
                style={styles.inputIcon} 
            />
            <TextInput
              placeholder="Wachtwoord bevestigen"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!isConfirmPasswordVisible} 
              style={styles.inputText}
              placeholderTextColor="#666"
            />
            <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                <Ionicons 
                    name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#999" 
                />
            </TouchableOpacity>
          </View>

         
          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

         
          <Button
            onPress={handleRegister}
            disabled={loading}
            variant="primary"
            style={{ marginTop: 20 }}
          >
            {loading ? "LADEN..." : "REGISTREREN"}
          </Button>

        </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
                Door verder te gaan, accepteer je onze{"\n"}
                <Text style={styles.linkText}>Gebruiksvoorwaarden</Text> en <Text style={styles.linkText}>Privacybeleid</Text>
            </Text>
        </View>

      </KeyboardAwareScrollView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60, 
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    height: 50,
    width: '100%',
  },
  headerTitle: {
    fontSize: 25,
    fontFamily: Variables.fonts.bold || "bold",
    alignSelf: 'center',
    color: Variables.colors.text || '#000',
  },
 backButtonWrapper: {
    position: 'absolute', 
    left: 0,              
    zIndex: 10,           
    marginTop: 28,
    transform: [{ scale: 1.5 }], 
    padding: 5, 
  },
  

  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EFEFEF", 
    justifyContent: "center",
    alignItems: "center",
    position: 'relative', 
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Variables.colors.primary || '#0870C4',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarText: {
    marginTop: 12,
    fontSize: Variables.textSizes.md || 18,
    color: Variables.colors.textLight || "#747373",
    fontFamily: Variables.fonts.default || "Medium",
  },


  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: "#FFF",
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
    tintColor: '#000', 
    marginRight: 12,
  },
  inputText: {
    flex: 1, 
    fontSize: Variables.textSizes.base || 16,
    color: Variables.colors.text || '#000',
    height: '100%',
  },
  
  errorText: {
    color: Variables.colors.error || "#D3465C",
    textAlign: "center",
    marginBottom: 10,
  },
  footer: {
      marginTop: 10,
      alignItems: 'center',
  },
  footerText: {
      textAlign: 'center',
    color: Variables.colors.textLight || "#747373",
    fontSize: Variables.textSizes.sm || 14,
      lineHeight: 20,
  },
  linkText: {
     color: Variables.colors.primary || "#0870C4",
    fontFamily: Variables.fonts.semibold || "semibold",
      textDecorationLine: 'underline',
  }
});