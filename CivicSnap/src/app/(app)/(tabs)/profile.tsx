import React, { useEffect, useState, useRef } from "react";
import { Animated } from "react-native";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Query } from "react-native-appwrite";

import { useAuthContext } from "@components/functional/Auth/authProvider";
import { API } from "@core/networking/api";
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";

import { Variables } from "@/style/theme";

const getLevelTitle = (level: number): string => {
  if (level < 5) return "Scout";
  if (level < 10) return "Verkenner";
  if (level < 15) return "Beschermer";
  if (level < 20) return "Stadsheld";
  return "Legende";
};

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const { lastUpdate } = useRealtime();

  const [userReports, setUserReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState(
    profile?.full_name || "Gebruiker",
  );
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url);
  const [points, setPoints] = useState(profile?.current_points || 0);
  const [currentLevel, setCurrentLevel] = useState(
    profile?.lifetime_points || 1,
  );

  const animatedProgress = useRef(new Animated.Value(0)).current;
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.full_name || "Gebruiker");
      setAvatarUrl(profile.avatar_url);
      setPoints(profile.current_points || 0);
      setCurrentLevel(profile.lifetime_points || 1);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.$id) return;

    const fetchUserReports = async () => {
      try {
        const response = await API.database.listDocuments(
          API.config.databaseId,
          API.config.reportsCollectionId,
        );

        let myReports = response.documents.filter(
          (doc: any) => doc.user_id === profile.$id,
        );
        myReports.sort(
          (a: any, b: any) =>
            new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime(),
        );

        const reportsWithCategories = await Promise.all(
          myReports.map(async (report: any) => {
            let fetchedCategoryName = "Probleem";

            if (report.category_id) {
              try {
                if (
                  typeof report.category_id === "object" &&
                  report.category_id.name
                ) {
                  fetchedCategoryName = report.category_id.name;
                } else {
                  const categoryData = await API.database.getDocument(
                    API.config.databaseId,
                    API.config.categoriesCollectionId,
                    report.category_id,
                  );
                  fetchedCategoryName = categoryData.name || "Probleem";
                }
              } catch (catError) {
                console.error(
                  `Could not fetch category for report ${report.$id}:`,
                  catError,
                );
              }
            }

            return { ...report, category_name: fetchedCategoryName };
          }),
        );

        setUserReports(reportsWithCategories);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    const checkUnreadMessages = async () => {
      try {
        const response = await API.database.listDocuments(
          API.config.databaseId,
          API.config.conversationsCollectionId,
          [
            Query.equal("user_id", profile.$id),
            Query.equal("has_unread_user", true), // 👇 Zorg dat je dit veld in Appwrite hebt!
          ],
        );

        setHasUnreadMessages(response.documents.length > 0);
      } catch (error) {
        console.log("Error checking unread messages:", error);
      }
    };

    fetchUserReports();
    checkUnreadMessages();
  }, [profile?.$id, lastUpdate]);

  useEffect(() => {
    if (!profile?.$id) return;

    const fetchFreshProfile = async () => {
      try {
        const freshData = await API.database.getDocument(
          API.config.databaseId,
          API.config.profilesCollectionId,
          profile.$id,
        );

        setDisplayName(freshData.full_name || "Gebruiker");
        setAvatarUrl(freshData.avatar_url);
        setPoints(freshData.current_points || 0);
        setCurrentLevel(freshData.lifetime_points || 1);
      } catch (error) {
        console.error("Error updating profile in realtime:", error);
      }
    };

    fetchFreshProfile();
  }, [lastUpdate, profile?.$id]);

  const totalReports = userReports.length;
  const resolvedReports = userReports.filter(
    (r) => r.status === "resolved",
  ).length;

  const calculateLevelInfo = (totalXp: number) => {
    let tempLevel = 1;
    let xpForNextTier = 1000;
    let remainingXp = totalXp;

    while (remainingXp >= xpForNextTier) {
      remainingXp -= xpForNextTier;
      tempLevel++;
      xpForNextTier += 500;
    }

    const percentage = (remainingXp / xpForNextTier) * 100;
    const needed = xpForNextTier - remainingXp;

    return {
      calculatedLevel: tempLevel,
      progressPercent: percentage,
      pointsNeeded: needed,
    };
  };

  const { calculatedLevel, progressPercent, pointsNeeded } =
    calculateLevelInfo(currentLevel);

  const currentTitle = getLevelTitle(calculatedLevel);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progressPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView bounces={true} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
  {/* Linkerkant: Berichten */}
  <TouchableOpacity 
    onPress={() => router.push("/(app)/chat" as any)} 
    style={styles.headerIconContainer}
  >
    <Ionicons
      name="chatbubbles-outline"
      size={26}
      color={Variables.colors.textLight}
    />
    {hasUnreadMessages && <View style={styles.unreadBadge} />}
  </TouchableOpacity>

  {/* Midden: Titel */}
  <Text style={styles.headerTitle}>Profiel</Text>

  {/* Rechterkant: Settings */}
  <TouchableOpacity 
    onPress={() => router.push("/(app)/settings" as any)}
    style={styles.headerIconContainer}
  >
    <Ionicons
      name="settings-outline"
      size={26}
      color={Variables.colors.textLight}
    />
  </TouchableOpacity>
</View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                avatarUrl
                  ? { uri: avatarUrl }
                  : require("@assets/icons/User.png")
              }
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => router.push("/(app)/settings/edit-profile" as any)}
            >
              <Ionicons name="pencil" size={14} color="white" />
            </TouchableOpacity>
          </View>

          <Text style={styles.nameText}>{displayName}</Text>

        
          <View style={styles.badgeContainer}>
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={Variables.colors.primary}
            />
            <Text style={styles.badgeText}>
              Lvl {calculatedLevel} • {currentTitle}
            </Text>
          </View>

          <View style={styles.levelPointsRow}>
            {/* Je hebt hier alleen nog de punten nodig, level staat in de badge */}
            <View style={styles.pointsGroup}>
              <Text style={styles.pointsText}>{points}</Text>
              <Image
                source={require("@assets/icons/Diamant.png")}
                style={styles.diamondIcon}
              />
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/report/my-reports" as any)}
          >
            <Text style={styles.statCardTitle}>
              Totaal aantal{"\n"}meldingen
            </Text>
            <Text style={styles.statCardNumber}>
              {loading ? "-" : totalReports}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/report/my-reports" as any)}
          >
            <Text style={styles.statCardTitle}>Opgeloste{"\n"}meldingen</Text>
            <Text style={styles.statCardNumber}>
              {loading ? "-" : resolvedReports}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mijn level</Text>

          <View style={styles.levelBarWrapper}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: animatedProgress.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              >
                <View style={styles.progressAvatarWrapper}>
                  <Image
                    source={
                      avatarUrl
                        ? { uri: avatarUrl }
                        : require("@assets/icons/User.png")
                    }
                    style={styles.progressAvatar}
                  />
                </View>
              </Animated.View>
            </View>

            <View style={styles.levelLabelsRow}>
              <Text
                style={[
                  styles.levelLabelText,
                  { color: Variables.colors.primary },
                ]}
              >
                Level {calculatedLevel}
              </Text>

              <Text style={styles.pointsNeededText}>
                nog {pointsNeeded > 0 ? pointsNeeded : 0} punten
              </Text>

              <Text style={styles.levelLabelText}>
                Level {calculatedLevel + 1}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mijn meldingen</Text>
            {userReports.length > 3 && (
              <TouchableOpacity
                onPress={() => router.push("/(app)/report/my-reports" as any)}
              >
                <Text style={styles.viewAllText}>Bekijk alles</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color={Variables.colors.primary}
              style={{ marginTop: 20 }}
            />
          ) : userReports.length === 0 ? (
            <Text style={styles.emptyText}>
              Je hebt nog geen meldingen gemaakt.
            </Text>
          ) : (
            userReports.slice(0, 3).map((report: any) => {
              const isInvalid = report.status === "invalid";
              const isResolved = report.status === "resolved";
              const isInProgress =
                report.status === "approved" || report.status === "in_progress";

              let bgColor = "#E3F2FD";
              let iconColor = "#1976D2";
              let iconName = "document-text";
              let statusText = "Gemeld";

              if (isInvalid) {
                bgColor = "#FFEBEE";
                iconColor = "#D32F2F";
                iconName = "close-circle";
                statusText = "Afgewezen";
              } else if (isResolved) {
                bgColor = "#E8F5E9";
                iconColor = "#388E3C";
                iconName = "checkmark-circle";
                statusText = "Opgelost";
              } else if (isInProgress) {
                bgColor = "#FFF3E0";
                iconColor = "#F57C00";
                iconName = "build";
                statusText = "In behandeling";
              }

              return (
                <TouchableOpacity
                  key={report.$id}
                  style={styles.reportCard}
                  onPress={() =>
                    router.push(`/(app)/report/${report.$id}` as any)
                  }
                >
                  <View
                    style={[
                      styles.statusIconWrapper,
                      { backgroundColor: bgColor },
                    ]}
                  >
                    <Ionicons
                      name={iconName as any}
                      size={26}
                      color={iconColor}
                    />
                  </View>

                  <View style={styles.reportCardContent}>
                    <View style={styles.reportHeaderRow}>
                      <Text style={styles.reportDate}>
                        {formatDate(report.$createdAt)}
                      </Text>
                      <Text
                        style={[styles.statusBadgeText, { color: iconColor }]}
                      >
                        {statusText}
                      </Text>
                    </View>
                    <Text style={styles.reportAddress} numberOfLines={2}>
                      <Text style={{ fontFamily: Variables.fonts.bold }}>
                        {report.category_name || "Probleem"}:
                      </Text>{" "}
                      {report.address}, {report.zip_code} {report.city}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Variables.colors.textLight}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Variables.colors.background || "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerIconContainer: {
  width: 40, // Geef beide kanten exact dezelfde breedte
  alignItems: "center",
  justifyContent: "center",
},
  headerTitle: {
    flex: 1, // Neemt alle beschikbare ruimte in het midden in
  textAlign: "center", // Centreert de tekst binnen die ruimte
  fontFamily: Variables.fonts.bold,
  fontSize: Variables.textSizes.xl,
  color: Variables.colors.text,
  },
  profileSection: {
    alignItems: "center",
    marginTop: 20,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E0E0E0",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Variables.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Variables.colors.background,
  },
  nameText: {
    fontFamily: Variables.fonts.bold,
    fontSize: 22,
    marginTop: 15,
    color: Variables.colors.text,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Variables.colors.primary + "1A", // 10% transparantie voor een lichtblauwe tint
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  badgeText: {
    fontFamily: Variables.fonts.bold,
    fontSize: 14,
    color: Variables.colors.primary,
    textTransform: "uppercase",
  },
  levelPointsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 25,
  },
  pointsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  levelText: {
    fontFamily: Variables.fonts.regular,
    fontSize: 16,
    color: Variables.colors.textLight,
  },
  pointsText: {
    fontFamily: Variables.fonts.bold,
    fontSize: 18,
    color: Variables.colors.text,
  },
  diamondIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 30,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  statCardTitle: {
    fontFamily: Variables.fonts.regular,
    fontSize: 13,
    color: Variables.colors.textLight,
    textAlign: "center",
    marginBottom: 10,
  },
  statCardNumber: {
    fontFamily: Variables.fonts.bold,
    fontSize: 28,
    color: Variables.colors.text,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 35,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: 20,
    color: Variables.colors.text,
    marginBottom: 15,
  },

  levelBarWrapper: {
    marginTop: 10,
  },
  progressBarBackground: {
    width: "100%",
    height: 18,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Variables.colors.primary || "#1976D2",
    borderRadius: 10,
    position: "relative",
  },
  progressAvatarWrapper: {
    position: "absolute",
    right: -15,
    top: -8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Variables.colors.primary || "#1976D2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },

  pointsNeededText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: 12,
    color: Variables.colors.primary || "#1976D2",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: "hidden",
  },
  progressAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  levelLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  levelLabelText: {
    fontFamily: Variables.fonts.regular,
    fontSize: 12,
    color: Variables.colors.textLight,
  },

  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statusIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  reportCardContent: {
    flex: 1,
  },
  reportDate: {
    fontFamily: Variables.fonts.bold,
    fontSize: 15,
    color: Variables.colors.text,
  },
  reportAddress: {
    fontFamily: Variables.fonts.regular,
    fontSize: 13,
    color: Variables.colors.textLight,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: Variables.fonts.regular,
    color: Variables.colors.textLight,
    textAlign: "center",
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  viewAllText: {
    fontFamily: Variables.fonts.bold,
    color: Variables.colors.primary,
    fontSize: 14,
    marginBottom: 15,
  },
  reportHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statusBadgeText: {
    fontFamily: Variables.fonts.bold,
    fontSize: 13,
  },
  unreadBadge: {
    position: 'absolute',
  top: 0,
  right: 5,
  backgroundColor: Variables.colors.error, 
  width: 10,
  height: 10,
  borderRadius: 5,
  borderWidth: 1.5,
  borderColor: Variables.colors.background,
  },
});
