import React from "react";
import { View, StyleSheet, ScrollView, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// ---- Components ---- //
// --- Design ---
import Button from "@components/design/Button/PrimaryButton";
import ThemedText from "@components/design/Typography/ThemedText";
// --- Functional ---
import { useAuthContext } from "@components/functional/Auth/authProvider";
import LocationMap from "@components/functional/Map/LocationMap";
// ---- CustomStyles ---- //
import { Variables } from "@style/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuthContext();

  const displayName = profile?.full_name?.split(" ")[0] || "Gebruiker";
  const points = profile?.current_points || 0;
  const currentLevel = profile?.lifetime_points || 1;
  const avatarUrl = profile?.avatar_url;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
            <View style={styles.profileGroup}>
              <Image
                source={
                  avatarUrl
                    ? { uri: avatarUrl }
                    : require("@assets/icons/User.png")
                }
                style={styles.avatar}
              />
              <View>
                <ThemedText style={styles.greeting}>
                  Hoi, {displayName}
                </ThemedText>
           
                <Text style={styles.levelText}>Level {currentLevel}</Text> 
              </View>
            </View>

         
            <View style={styles.pointsGroup}>
              <Text style={styles.pointsValue}>{points}</Text>
              <Image
                source={require("@assets/icons/Diamant.png")}
                style={{ width: 28, height: 28 }}
                resizeMode="contain"
              />
            </View>
          </View>

        <View style={styles.section}>
          <LocationMap />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Variables.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Variables.sizes.lg || 20,
    paddingBottom: 0,
    paddingHorizontal: Variables.sizes.lg || 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", 
    width: "100%",
    marginBottom: 30, 
  },
  profileGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12, 
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E0E0E0",
  },
  greeting: {
    fontFamily: Variables.fonts.bold || "bold",
    fontSize: Variables.textSizes.lg || 22,
    color: Variables.colors.text || "#000",
  },
  levelText: {
    fontSize: Variables.textSizes.md || 16,
    color: Variables.colors.textLight || "#747373", 
    marginTop: 2,
  },
  pointsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6, 
  },
  pointsValue: {
    fontSize: Variables.textSizes.lg || 22, 
    fontFamily: Variables.fonts.bold || "bold",
    color: Variables.colors.text || "#000",
  },
  section: {
    flex: 1,
    marginTop: 0,
    marginHorizontal: -(Variables.sizes.lg || 20),
  },
});
