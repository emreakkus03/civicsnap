import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import ThemedText from "@components/design/Typography/ThemedText";
import { useAuthContext } from "@components/functional/Auth/authProvider";
import LocationMap from "@components/functional/Map/LocationMap";

import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";

import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";
import { API } from "@core/networking/api";
import * as Notifications from 'expo-notifications';

const getLevelTitle = (level: number): string => {
  if (level < 5) return "Scout";
  if (level < 10) return "Verkenner";
  if (level < 15) return "Beschermer";
  if (level < 20) return "Stadsheld";
  return "Legende";
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const { lastUpdate } = useRealtime();

  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [points, setPoints] = useState(profile?.current_points || 0);
  const [lifetimeXp, setLifetimeXp] = useState(profile?.lifetime_points || 0);

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url);
  const [displayName, setDisplayName] = useState(profile?.full_name?.split(" ")[0] || "User");

  useEffect(() => {
    if (profile) {
      setPoints(profile.current_points || 0);
      setLifetimeXp(profile.lifetime_points || 0);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.$id) return;

    const fetchLatestProfile = async () => {
      try {
        const data = await API.database.getDocument(
          API.config.databaseId,
          API.config.profilesCollectionId,
          profile.$id
        );
        setPoints(data.current_points || 0);
        setLifetimeXp(data.lifetime_points || 0);
        setAvatarUrl(data.avatar_url);
        setDisplayName(data.full_name?.split(" ")[0] || "User");
      } catch (error) {
        console.error("Error while realtime-updating profile:", error);
      }
    };

    fetchLatestProfile();
  }, [lastUpdate, profile?.$id]);

  useEffect(() => {
    const requestNotificationPermissions = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Gebruiker heeft notificaties geweigerd.');
        return;
      }
    };

    requestNotificationPermissions();
  }, []);

  const calculateLevel = (totalXp: number) => {
    let tempLevel = 1;
    let xpForNextTier = 1000;
    let remainingXp = totalXp;
    while (remainingXp >= xpForNextTier) {
        remainingXp -= xpForNextTier;
        tempLevel++;
        xpForNextTier += 500;
    }
    return tempLevel;
  };

  const calculatedLevel = calculateLevel(lifetimeXp);
  const currentTitle = getLevelTitle(calculatedLevel);

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
                Hi, {displayName}
              </ThemedText>

              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  Lvl {calculatedLevel} • {currentTitle}
                </Text>
              </View>
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text || "#000",
  },
  badgeContainer: {
    backgroundColor: colors.primary + "1A", 
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: "flex-start", 
  },
  badgeText: {
    fontFamily: Variables.fonts.bold,
    fontSize: 12,
    color: colors.primary,
    textTransform: "uppercase",
  },
  levelText: {
    fontSize: Variables.textSizes.md || 16,
    color: colors.textLight || "#747373",
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
    color: colors.text || "#000",
  },
  section: {
    flex: 1,
    marginTop: 0,
    marginHorizontal: -(Variables.sizes.lg || 20),
  },
});