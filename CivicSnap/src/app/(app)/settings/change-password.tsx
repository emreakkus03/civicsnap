import React, { useState } from "react";
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ---- Context & API ----
import { useAuthContext } from "@components/functional/Auth/authProvider";

import { updatePassword, sendPasswordRecovery } from "@core/modules/auth/api"; 

// ---- Styling ----
import { Variables } from "@style/theme";


export default function ChangePasswordScreen() {
    const router = useRouter();
    const { profile } = useAuthContext();

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);

    
    const handleSave = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert("Fout", "Vul alle velden in.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Fout", "De nieuwe wachtwoorden komen niet overeen.");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Fout", "Je nieuwe wachtwoord moet minimaal 6 tekens lang zijn.");
            return;
        }

        setIsSaving(true);
        try {
            
            await updatePassword(newPassword, oldPassword);
            
            Alert.alert("Succes", "Je wachtwoord is succesvol gewijzigd!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error("Fout bij wachtwoord wijzigen:", error);
            Alert.alert("Fout", error.message || "Het oude wachtwoord is onjuist of er is een netwerkfout.");
        } finally {
            setIsSaving(false);
        }
    };

    
   const handleForgotPassword = async () => {
        if (!profile?.email) {
            Alert.alert("Fout", "We konden je e-mailadres niet vinden.");
            return;
        }

        Alert.alert(
            "Wachtwoord vergeten?",
            `We sturen een herstel-link naar ${profile.email}. Wil je doorgaan?`,
            [
                { text: "Annuleren", style: "cancel" },
                { 
                    text: "Stuur link", 
                    onPress: async () => {
                        setIsSendingReset(true);
                        try {
                            
                            const resetUrl = `${process.env.EXPO_PUBLIC_RESET_URL}?source=settings`;
await sendPasswordRecovery(profile.email, resetUrl);
                            Alert.alert("E-mail verzonden", "Check je inbox en klik op de link om terug te keren naar de app.");
                        } catch (error: any) {
                            Alert.alert("Fout", error.message || "Kon geen herstel-mail sturen.");
                        } finally {
                            setIsSendingReset(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color={Variables.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Wachtwoord wijzigen</Text>
                <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <ActivityIndicator size="small" color={Variables.colors.primary} />
                    ) : (
                        <Text style={styles.saveText}>Klaar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    
                    <View style={styles.instructionContainer}>
                        <Ionicons name="lock-closed-outline" size={48} color={Variables.colors.primary} style={styles.icon} />
                        <Text style={styles.instructionText}>
                            Kies een sterk nieuw wachtwoord van minimaal 6 tekens om je account veilig te houden.
                        </Text>
                    </View>

                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Huidig wachtwoord</Text>
                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Typ je huidige wachtwoord"
                                secureTextEntry={!showOldPassword}
                                value={oldPassword}
                                onChangeText={setOldPassword}
                                placeholderTextColor={Variables.colors.textLight}
                            />
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowOldPassword(!showOldPassword)}>
                                 <Ionicons 
                                                        name={showOldPassword ? "eye-off-outline" : "eye-outline"} 
                                                        size={20} 
                                                        color="#999" 
                                                    />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword} disabled={isSendingReset}>
                            {isSendingReset ? (
                                <ActivityIndicator size="small" color={Variables.colors.primary} />
                            ) : (
                                <Text style={styles.forgotPasswordText}>Ik ben mijn wachtwoord vergeten</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                  
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Nieuw wachtwoord</Text>
                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Typ je nieuwe wachtwoord"
                                secureTextEntry={!showNewPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholderTextColor={Variables.colors.textLight}
                            />
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNewPassword(!showNewPassword)}>
                                 <Ionicons 
                                                        name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                                                        size={20} 
                                                        color="#999" 
                                                    />
                            </TouchableOpacity>
                        </View>
                    </View>

                   
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Bevestig nieuw wachtwoord</Text>
                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="Typ nogmaals"
                                secureTextEntry={!showConfirmPassword}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholderTextColor={Variables.colors.textLight}
                            />
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                <Ionicons 
                                                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                                                        size={20} 
                                                        color="#999" 
                                                    />
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Variables.colors.background,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Variables.sizes.md,
        paddingVertical: Variables.sizes.md,
        backgroundColor: Variables.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5E5",
    },
    headerTitle: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.md,
        color: Variables.colors.text,
    },
    saveText: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.base,
        color: Variables.colors.primary,
    },
    content: {
        padding: Variables.sizes.lg,
        alignItems: "center",
    },
    instructionContainer: {
        alignItems: "center",
        marginVertical: Variables.sizes.xl,
    },
    icon: {
        marginBottom: Variables.sizes.sm,
    },
    instructionText: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.sm,
        color: Variables.colors.textLight,
        textAlign: "center",
        paddingHorizontal: Variables.sizes.md,
        lineHeight: 20,
    },
    inputContainer: {
        width: "100%",
        marginBottom: Variables.sizes.lg,
    },
    label: {
        fontFamily: Variables.fonts.semibold,
        fontSize: Variables.textSizes.sm,
        color: Variables.colors.textLight,
        marginBottom: Variables.sizes.xs,
        marginLeft: 4,
    },
    
    passwordWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Variables.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E5E5",
        height: 56,
    },
    inputWithIcon: {
        flex: 1,
        height: "100%",
        paddingHorizontal: Variables.sizes.md,
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.base,
        color: Variables.colors.text,
    },
    eyeIcon: {
        padding: 15,
        justifyContent: "center",
        alignItems: "center",
    },
    forgotPasswordContainer: {
        marginTop: Variables.sizes.sm,
    },
    forgotPasswordText: {
        fontFamily: Variables.fonts.semibold,
        fontSize: Variables.textSizes.sm,
        color: Variables.colors.primary,
    },
});