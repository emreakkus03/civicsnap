import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "@components/design/Button/BackButton";
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";

export default function SupportScreen() {
    const router = useRouter();

    const colors = useThemeColors();
                        
    const styles = createStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <View style={styles.backButtonWrapper}>
                    <BackButton />
                </View>
                <Text style={styles.headerTitle}>Hulp & ondersteuning</Text>
                <View style={{ width: 26 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Juridisch</Text>
                <View style={styles.sectionCard}>
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push("/privacy-policy" as any)}
                    >
                        <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} style={styles.rowIcon} />
                        <Text style={styles.rowLabel}>Privacybeleid</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => router.push("/terms" as any)}
                    >
                        <Ionicons name="document-text-outline" size={24} color={colors.primary} style={styles.rowIcon} />
                        <Text style={styles.rowLabel}>Gebruiksvoorwaarden</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Contact</Text>
                <View style={styles.sectionCard}>
                    <View style={styles.row}>
                        <Ionicons name="mail-outline" size={24} color={colors.primary} style={styles.rowIcon} />
                        <Text style={styles.rowLabel}>support@civicsnap.be</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Variables.sizes.md,
    paddingVertical: Variables.sizes.sm,
    backgroundColor: colors.background,
},
backButtonWrapper: {
    width: 40, 
    top: 15,
    left: 5,
    zIndex: 10,
    transform: [{ scale: 1.5 }],
},
    headerTitle: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.xl,
        color: colors.text,
          flex: 1, 
    textAlign: "center", 
    },
    content: {
        padding: Variables.sizes.md,
        marginTop: Variables.sizes.md,
    },
    sectionTitle: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.base,
        color: colors.text,
        marginBottom: Variables.sizes.sm,
        marginLeft: Variables.sizes.xs,
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginBottom: Variables.sizes.lg,
        paddingVertical: Variables.sizes.xs,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Variables.sizes.md,
        paddingVertical: Variables.sizes.sm + 7,
    },
    rowIcon: {
        marginRight: Variables.sizes.sm + 6,
    },
    rowLabel: {
        flex: 1,
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.base,
        color: colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: colors.background,
        marginHorizontal: Variables.sizes.md,
    },
});