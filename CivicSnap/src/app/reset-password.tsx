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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ---- Context & API ----
import { resetPasswordWithRecovery } from "@core/modules/auth/api";

// ---- Styling ----
import { Variables } from "@style/theme";

export default function NativeResetPasswordScreen() {
    const router = useRouter();
    
    const { userId, secret, source } = useLocalSearchParams<{ userId: string; secret: string; source: string }>();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!userId || !secret) {
            Alert.alert("Ongeldige link", "Deze link is niet geldig of verlopen. Vraag een nieuwe aan.");
            return;
        }

        if (!newPassword || !confirmPassword) {
            Alert.alert("Fout", "Vul beide velden in.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Fout", "De wachtwoorden komen niet overeen.");
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert("Fout", "Je wachtwoord moet minimaal 8 tekens zijn.");
            return;
        }

        setIsSaving(true);
        try {
            await resetPasswordWithRecovery(userId, secret, newPassword);
            
            Alert.alert("Succes!", "Je wachtwoord is succesvol gewijzigd.", [
    { 
        text: "OK", 
        onPress: () => {
            if (source === "settings") {
                router.replace("/(app)/settings");
            } else {
                router.replace("/login");
            }
        }
    }
]);
        } catch (error: any) {
            Alert.alert("Fout", error.message || "Er ging iets mis bij het resetten.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace("/login")}>
                    <Ionicons name="close" size={28} color={Variables.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nieuw wachtwoord</Text>
                <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <ActivityIndicator size="small" color={Variables.colors.primary} />
                    ) : (
                        <Text style={styles.saveText}>Opslaan</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    
                    <View style={styles.instructionContainer}>
                        <Ionicons name="key-outline" size={48} color={Variables.colors.primary} style={styles.icon} />
                        <Text style={styles.instructionText}>
                            Je hebt succesvol op de herstel-link geklikt. Kies nu een nieuw, veilig wachtwoord.
                        </Text>
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
                                <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={22} color={Variables.colors.textLight} />
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
                                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color={Variables.colors.textLight} />
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Variables.colors.background },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Variables.sizes.md, paddingVertical: Variables.sizes.md, backgroundColor: Variables.colors.surface, borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
    headerTitle: { fontFamily: Variables.fonts.bold, fontSize: Variables.textSizes.md, color: Variables.colors.text },
    saveText: { fontFamily: Variables.fonts.bold, fontSize: Variables.textSizes.base, color: Variables.colors.primary },
    content: { padding: Variables.sizes.lg, alignItems: "center" },
    instructionContainer: { alignItems: "center", marginVertical: Variables.sizes.xl },
    icon: { marginBottom: Variables.sizes.sm },
    instructionText: { fontFamily: Variables.fonts.regular, fontSize: Variables.textSizes.sm, color: Variables.colors.textLight, textAlign: "center", paddingHorizontal: Variables.sizes.md, lineHeight: 20 },
    inputContainer: { width: "100%", marginBottom: Variables.sizes.lg },
    label: { fontFamily: Variables.fonts.semibold, fontSize: Variables.textSizes.sm, color: Variables.colors.textLight, marginBottom: Variables.sizes.xs, marginLeft: 4 },
    passwordWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: Variables.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5", height: 56 },
    inputWithIcon: { flex: 1, height: "100%", paddingHorizontal: Variables.sizes.md, fontFamily: Variables.fonts.regular, fontSize: Variables.textSizes.base, color: Variables.colors.text },
    eyeIcon: { padding: 15, justifyContent: "center", alignItems: "center" }
});