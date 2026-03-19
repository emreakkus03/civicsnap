import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuthContext } from "@components/functional/Auth/authProvider";
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";
import { API } from "@core/networking/api";
import { Variables } from "@style/theme";
import { LinearGradient } from "expo-linear-gradient";

import { Functions, ExecutionMethod  } from "react-native-appwrite";

// --- Location labels ---
const LOCATION_LABELS: Record<string, string> = {
  all: "Alle",
  antwerp: "Antwerpen",
  ghent: "Gent",
  brussels: "Brussel",
  bruges: "Brugge",
  hasselt: "Hasselt",
  courtrai: "Kortrijk",
  namur: "Namen",
  liege: "Luik",
  charleroi: "Charleroi",
};

export default function ShopScreen() {
  const { profile } = useAuthContext();
  const { lastUpdate, triggerUpdate } = useRealtime();

  const [rewards, setRewards] = useState<any[]>([]);
  const [userRewards, setUserRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rewards" | "coupons">("rewards");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [points, setPoints] = useState(profile?.current_points || 0);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  const [selectedLocation, setSelectedLocation] = useState("all");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const locations = Object.entries(LOCATION_LABELS).map(([key, label]) => ({
    key,
    label,
  }));

  // --- Filters ---
  const filters = [
    { key: "all", label: "Alles" },
    { key: "discount", label: "Korting" },
    { key: "free_product", label: "Gratis" },
    { key: "ticket", label: "Ticket" },
    { key: "voucher", label: "Voucher" },
    { key: "good_cause", label: "Goed Doel" },
  ];

  // --- Fetch fresh profile points ---
  useEffect(() => {
    if (!profile?.$id) return;
    const fetchPoints = async () => {
      try {
        const data = await API.database.getDocument(
          API.config.databaseId,
          API.config.profilesCollectionId,
          profile.$id,
        );
        setPoints(data.current_points || 0);
      } catch (e) {
        console.error(e);
      }
    };
    fetchPoints();
  }, [lastUpdate, profile?.$id]);

  // --- Fetch rewards ---
 useFocusEffect(
    useCallback(() => {
        const fetchRewards = async () => {
            setLoading(true);
            try {
                const response = await API.database.listDocuments(
                    API.config.databaseId,
                    API.config.rewardsCollectionId,
                );
                const now = new Date();
                const valid = response.documents.filter(
                    (r: any) =>
                        r.is_active && (!r.valid_until || new Date(r.valid_until) > now),
                );
                setRewards(valid);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchRewards();
    }, [])
);

  // --- Fetch user rewards (coupons) ---
  useEffect(() => {
    if (!profile?.$id) return;
    const fetchUserRewards = async () => {
      try {
        const response = await API.database.listDocuments(
          API.config.databaseId,
          API.config.userRewardsCollectionId,
        );
        const mine = response.documents.filter(
          (r: any) => r.user_id === profile.$id,
        );
        // Enrich with reward details
        const enriched = await Promise.all(
          mine.map(async (ur: any) => {
            try {
              const reward = await API.database.getDocument(
                API.config.databaseId,
                API.config.rewardsCollectionId,
                ur.reward_id,
              );
              return { ...ur, reward };
            } catch {
              return ur;
            }
          }),
        );
        setUserRewards(enriched);
      } catch (e) {
        console.error(e);
      }
    };
    fetchUserRewards();
  }, [lastUpdate, profile?.$id]);

  // --- Filter rewards ---
  const filteredRewards = rewards.filter((r: any) => {
    const typeMatch = selectedFilter === "all" || r.type === selectedFilter;
    const locationMatch =
      selectedLocation === "all" ||
      r.location_filter === selectedLocation ||
      r.location_filter === "all";
    return typeMatch && locationMatch;
  });

  // --- Purchase reward ---
  const handlePurchase = async (reward: any) => {
    if (!profile?.$id) return;

    if (points < reward.cost_points) {
      Alert.alert(
        "Onvoldoende diamanten",
        `Je hebt ${points} 💎 maar hebt ${reward.cost_points} 💎 nodig.`,
      );
      return;
    }

    Alert.alert(
      "Reward kopen",
      `Wil je "${reward.title}" kopen voor ${reward.cost_points} 💎?`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Kopen",
          onPress: async () => {
            setPurchasing(true);
            try {
              const functions = new Functions(API.client);
              const execution = await functions.createExecution(
                "69a6f7c3000d5bad35f4",
                JSON.stringify({
                  userId: profile.$id,
                  rewardId: reward.$id,
                }),
                false,
                "/",
                ExecutionMethod.POST,
                { "Content-Type": "application/json" },
              );

              const result = JSON.parse(execution.responseBody);
              console.log("Result:", JSON.stringify(result));

              if (result.success) {
                setPoints(result.pointsLeft);
                triggerUpdate();
                setSelectedReward(null);
                Alert.alert(
                  "Gelukt! 🎉",
                  `Je coupon code is: ${result.code}\n\nJe vindt hem ook terug onder "Mijn Coupons".`,
                );
              } else {
                Alert.alert("Fout", result.error || "Er is iets misgegaan.");
              }
            } catch (e) {
              console.error(e);
              Alert.alert(
                "Fout",
                "Kon de aankoop niet verwerken. Probeer later opnieuw.",
              );
            } finally {
              setPurchasing(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* --- Header with points --- */}
      <LinearGradient
        colors={["#274373", "#3E69B2", "#3E69B2", "#274373"]}
        locations={[0, 0.35, 0.63, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.pointsCenter}>
          <Image
            source={require("@assets/icons/Diamant.png")}
            style={styles.diamondIconLarge}
            resizeMode="contain"
          />
          <Text style={styles.pointsTextLarge}>{points.toLocaleString()}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* --- Tabs --- */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "rewards" && styles.tabActive]}
          onPress={() => setActiveTab("rewards")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "rewards" && styles.tabTextActive,
            ]}
          >
            REWARDS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "coupons" && styles.tabActive]}
          onPress={() => setActiveTab("coupons")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "coupons" && styles.tabTextActive,
            ]}
          >
            MIJN COUPONS
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "rewards" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* --- Daily bonus banner --- */}
          <LinearGradient
            colors={["#A24291", "#8551A2", "#3A7ECF", "#31ACE4"]}
            locations={[0, 0.24, 0.51, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bonusBanner}
          >
            <View style={styles.bonusTextWrapper}>
              <Text style={styles.bonusTitle}>Dagelijkse Bonus!</Text>
              <Text style={styles.bonusSubtitle}>
                Draai aan het rad en win extra punten!
              </Text>
              <TouchableOpacity style={styles.bonusButton}>
                <Text style={styles.bonusButtonText}>SPEEL NU</Text>
              </TouchableOpacity>
            </View>
            <Image
              source={require("@assets/icons/spinning-wheel.png")}
              style={styles.wheelImage}
              resizeMode="contain"
            />
          </LinearGradient>

          {/* --- Filters --- */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            style={styles.filtersScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === "all" &&
                  selectedLocation === "all" &&
                  styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedFilter("all");
                setSelectedLocation("all");
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === "all" &&
                    selectedLocation === "all" &&
                    styles.filterChipTextActive,
                ]}
              >
                Alles
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                styles.locationChip,
                selectedLocation !== "all" && styles.filterChipActive,
              ]}
              onPress={() => setShowLocationDropdown(!showLocationDropdown)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedLocation !== "all" && styles.filterChipTextActive,
                ]}
              >
                {selectedLocation === "all"
                  ? "Stad"
                  : LOCATION_LABELS[selectedLocation]}
              </Text>
              <Ionicons
                name={showLocationDropdown ? "chevron-up" : "chevron-down"}
                size={12}
                color={
                  selectedLocation !== "all"
                    ? Variables.colors.textInverse
                    : Variables.colors.textLight
                }
              />
            </TouchableOpacity>

            {filters
              .filter((f) => f.key !== "all")
              .map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.key && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(filter.key)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === filter.key &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>

          {/* Dropdown buiten ScrollView */}
          {showLocationDropdown && (
            <View style={styles.locationDropdown}>
              {locations.map((loc) => (
                <TouchableOpacity
                  key={loc.key}
                  style={[
                    styles.locationDropdownItem,
                    selectedLocation === loc.key &&
                      styles.locationDropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedLocation(loc.key);
                    setShowLocationDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.locationDropdownText,
                      selectedLocation === loc.key &&
                        styles.locationDropdownTextActive,
                    ]}
                  >
                    {loc.label}
                  </Text>
                  {selectedLocation === loc.key && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={Variables.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* --- Rewards grid --- */}
          {loading ? (
            <ActivityIndicator
              color={Variables.colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : filteredRewards.length === 0 ? (
            <Text style={styles.emptyText}>Geen rewards beschikbaar.</Text>
          ) : (
            <View style={styles.rewardsGrid}>
              {filteredRewards.map((reward: any) => (
                <TouchableOpacity
                  key={reward.$id}
                  style={styles.rewardCard}
                  onPress={() => setSelectedReward(reward)}
                  activeOpacity={0.85}
                >
                  {/* Location badge */}
                  <View style={styles.locationBadge}>
                    <Text style={styles.locationBadgeText}>
                      {LOCATION_LABELS[reward.location_filter] ||
                        reward.location_filter}
                    </Text>
                  </View>

                  {/* Image */}
                  <View style={styles.rewardImageWrapper}>
                    {reward.image_url ? (
                      <Image
                        source={{ uri: reward.image_url }}
                        style={styles.rewardImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.rewardImage,
                          styles.rewardImagePlaceholder,
                        ]}
                      >
                        <Ionicons
                          name="gift-outline"
                          size={32}
                          color={Variables.colors.textLight}
                        />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardTitle} numberOfLines={1}>
                      {reward.title}
                    </Text>
                    <View style={styles.rewardBusinessRow}>
                      <Image
  source={require("@assets/icons/ReportPinMarker.png")}
  style={{ width: 15, height: 18 }}
  resizeMode="contain"
/>
                      <Text style={styles.rewardBusiness} numberOfLines={1}>
                        {reward.business_name}
                      </Text>
                    </View>
                    <View style={styles.rewardCostRow}>
                      <Image
                        source={require("@assets/icons/Diamant.png")}
                        style={styles.rewardDiamond}
                        resizeMode="contain"
                      />
                      <Text style={styles.rewardCost}>
                        {reward.cost_points} pnt
                      </Text>
                    </View>
                    {reward.valid_until && (
                      <Text style={styles.rewardValidity}>
                        Geldig t/m{" "}
                        {new Date(reward.valid_until).toLocaleDateString(
                          "nl-BE",
                        )}
                      </Text>
                    )}
                  </View>

                  {/* Claim button */}
                  <TouchableOpacity
                    style={[
                      styles.claimButton,
                      points < reward.cost_points && styles.claimButtonDisabled,
                    ]}
                    onPress={() => handlePurchase(reward)}
                  >
                    <Text style={styles.claimButtonText}>CLAIMEN</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        // --- Coupons tab ---
        <ScrollView showsVerticalScrollIndicator={false}>
          {userRewards.length === 0 ? (
            <View style={styles.emptyCoupons}>
              <Ionicons
                name="ticket-outline"
                size={64}
                color={Variables.colors.textLight}
              />
              <Text style={styles.emptyText}>Je hebt nog geen coupons.</Text>
              <Text style={styles.emptySubText}>
                Koop een reward om hier je coupons te zien!
              </Text>
            </View>
          ) : (
            <View style={styles.couponsWrapper}>
              {userRewards.map((ur: any) => (
                <TouchableOpacity
                  key={ur.$id}
                  style={styles.couponCard}
                  onPress={() => setSelectedCoupon(ur)}
                  activeOpacity={0.85}
                >
                  {/* Image */}
                  <View style={styles.couponImageWrapper}>
                    {ur.reward?.image_url ? (
                      <Image
                        source={{ uri: ur.reward.image_url }}
                        style={styles.couponImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.couponImage,
                          styles.rewardImagePlaceholder,
                        ]}
                      >
                        <Ionicons
                          name="gift-outline"
                          size={24}
                          color={Variables.colors.textLight}
                        />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.couponInfo}>
                    <Text style={styles.couponTitle} numberOfLines={1}>
                      {ur.reward?.title || "Reward"}
                    </Text>
                    <Text style={styles.couponBusiness} numberOfLines={1}>
                      {ur.reward?.business_name || ""}
                    </Text>
                    {ur.reward?.valid_until && (
                      <Text style={styles.couponValidity}>
                        Geldig t/m{" "}
                        {new Date(ur.reward.valid_until).toLocaleDateString(
                          "nl-BE",
                        )}
                      </Text>
                    )}
                  </View>

                  {/* Status badge */}
                  <View
                    style={[
                      styles.couponStatusBadge,
                      ur.status === "used" && styles.couponStatusUsed,
                    ]}
                  >
                    <Text style={styles.couponStatusText}>
                      {ur.status === "used" ? "Gebruikt" : "Actief"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* --- Reward detail modal --- */}
      {selectedReward && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedReward(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Close button */}
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedReward(null)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={Variables.colors.text}
                />
              </TouchableOpacity>

              {/* Image */}
              <View style={styles.modalImageWrapper}>
                {selectedReward.image_url ? (
                  <Image
                    source={{ uri: selectedReward.image_url }}
                    style={styles.modalImage}
                  />
                ) : (
                  <View
                    style={[styles.modalImage, styles.rewardImagePlaceholder]}
                  >
                    <Ionicons
                      name="gift-outline"
                      size={48}
                      color={Variables.colors.textLight}
                    />
                  </View>
                )}
              </View>

              {/* Info */}
              <Text style={styles.modalTitle}>{selectedReward.title}</Text>
              <View style={styles.modalBusinessRow}>
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={Variables.colors.textLight}
                />
                <Text style={styles.modalBusiness}>
                  {selectedReward.business_name}
                </Text>
              </View>
              <Text style={styles.modalDescription}>
                {selectedReward.description}
              </Text>

              {selectedReward.valid_until && (
                <Text style={styles.modalValidity}>
                  Geldig tot{" "}
                  {new Date(selectedReward.valid_until).toLocaleDateString(
                    "nl-BE",
                  )}
                </Text>
              )}

              {/* Cost */}
              <View style={styles.modalCostRow}>
                <Image
                  source={require("@assets/icons/Diamant.png")}
                  style={styles.modalDiamond}
                  resizeMode="contain"
                />
                <Text style={styles.modalCost}>
                  {selectedReward.cost_points} diamanten
                </Text>
              </View>

              {/* Balance check */}
              {points < selectedReward.cost_points && (
                <Text style={styles.modalInsufficientText}>
                  Je hebt onvoldoende diamanten. Nog{" "}
                  {selectedReward.cost_points - points} 💎 tekort.
                </Text>
              )}

              {/* Purchase button */}
              <TouchableOpacity
                style={[
                  styles.modalPurchaseButton,
                  (points < selectedReward.cost_points || purchasing) &&
                    styles.claimButtonDisabled,
                ]}
                onPress={() => handlePurchase(selectedReward)}
                disabled={points < selectedReward.cost_points || purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalPurchaseText}>
                    {points < selectedReward.cost_points
                      ? "Onvoldoende diamanten"
                      : "KOPEN"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* --- Coupon detail modal --- */}
      {selectedCoupon && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedCoupon(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedCoupon(null)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={Variables.colors.text}
                />
              </TouchableOpacity>

              <View style={styles.modalImageWrapper}>
                {selectedCoupon.reward?.image_url ? (
                  <Image
                    source={{ uri: selectedCoupon.reward.image_url }}
                    style={styles.modalImage}
                  />
                ) : (
                  <View
                    style={[styles.modalImage, styles.rewardImagePlaceholder]}
                  >
                    <Ionicons
                      name="gift-outline"
                      size={48}
                      color={Variables.colors.textLight}
                    />
                  </View>
                )}
              </View>

              <Text style={styles.modalTitle}>
                {selectedCoupon.reward?.title || "Reward"}
              </Text>
              <Text style={styles.modalBusiness}>
                {selectedCoupon.reward?.business_name || ""}
              </Text>

              {/* Code box */}
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Jouw coupon code</Text>
                <Text style={styles.codeText}>{selectedCoupon.code}</Text>
              </View>

              {selectedCoupon.reward?.valid_until && (
                <Text style={styles.modalValidity}>
                  Geldig tot{" "}
                  {new Date(
                    selectedCoupon.reward.valid_until,
                  ).toLocaleDateString("nl-BE")}
                </Text>
              )}

              <Text style={styles.codeInstructions}>
                Toon deze code aan de kassa om je reward in te wisselen.
              </Text>
            </View>
          </View>
        </Modal>
      )}
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Variables.sizes.md,
    paddingTop: Variables.sizes.xxl,
    paddingBottom: Variables.sizes.xxl,
    marginBottom: -20,
  },
  pointsCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Variables.sizes.sm,
  },
  diamondIconLarge: {
    width: 36,
    height: 36,
  },
  pointsTextLarge: {
    fontFamily: Variables.fonts.extrabold,
    fontSize: Variables.textSizes.xl,
    color: Variables.colors.textInverse,
  },
  // --- Tabs ---
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: Variables.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Variables.colors.background,
    borderTopColor: "#000000",
    borderWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: Variables.sizes.md,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Variables.colors.primary,
  },
  tabText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
  },
  tabTextActive: {
    color: Variables.colors.primary,
  },

  // --- Bonus banner ---
  bonusBanner: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Variables.colors.primary,
    margin: Variables.sizes.md,
    borderRadius: 16,
    padding: Variables.sizes.md,
  },
  bonusTextWrapper: {
    flex: 1,
  },
  bonusTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.md,
    color: Variables.colors.textInverse,
    marginBottom: Variables.sizes.xs,
  },
  bonusSubtitle: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.sm,
    color: "rgba(255,255,255,0.85)",
    marginBottom: Variables.sizes.sm,
    width: 160,
  },
  bonusButton: {
    backgroundColor: Variables.colors.textInverse,
    paddingHorizontal: Variables.sizes.md,
    paddingVertical: Variables.sizes.xs,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  bonusButtonText: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.primary,
  },
  bonusEmoji: {
    fontSize: 48,
    marginLeft: Variables.sizes.md,
  },
  wheelImage: {
    position: "absolute",
    right: -80,
    width: 300,
    height: 320,
  },

  // --- Filters ---
  filtersScroll: {
    marginBottom: Variables.sizes.sm,
  },
  filtersContent: {
    paddingHorizontal: Variables.sizes.md,
    gap: Variables.sizes.sm,
    alignItems: "center",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Variables.sizes.xs,
  },
  locationDropdown: {
    marginHorizontal: Variables.sizes.md,
    marginBottom: Variables.sizes.sm,
    backgroundColor: Variables.colors.surface,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  locationDropdownItem: {
    paddingHorizontal: Variables.sizes.md,
    paddingVertical: Variables.sizes.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Variables.colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationDropdownItemActive: {
    backgroundColor: Variables.colors.primary + "15",
  },
  locationDropdownText: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
  },
  locationDropdownTextActive: {
    fontFamily: Variables.fonts.bold,
    color: Variables.colors.primary,
  },
  filterChip: {
    paddingHorizontal: Variables.sizes.md,
    paddingVertical: Variables.sizes.xs,
    borderRadius: 20,
    backgroundColor: Variables.colors.surface,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  filterChipActive: {
    backgroundColor: Variables.colors.primary,
    borderColor: Variables.colors.primary,
  },
  filterChipText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
  },
  filterChipTextActive: {
    color: Variables.colors.textInverse,
  },

  // --- Rewards grid ---
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Variables.sizes.md,
    gap: Variables.sizes.md,
  },
  rewardCard: {
    width: "47%",
    backgroundColor: Variables.colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  locationBadge: {
    position: "absolute",
    top: Variables.sizes.sm,
    right: Variables.sizes.sm,
    backgroundColor: Variables.colors.primary,
    paddingHorizontal: Variables.sizes.sm,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  locationBadgeText: {
    fontFamily: Variables.fonts.bold,
    fontSize: 12,
    color: Variables.colors.textInverse,
  },
  rewardImageWrapper: {
    width: "100%",
    height: 110,
  },
  rewardImage: {
    width: "100%",
    height: "100%",
  },
  rewardImagePlaceholder: {
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardInfo: {
    padding: Variables.sizes.sm,
  },
  rewardTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
    marginBottom: 2,
  },
  rewardBusinessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: Variables.sizes.xs,
  },
  rewardBusiness: {
    fontFamily: Variables.fonts.default,
    fontSize: 13,
    color: Variables.colors.text,
  },
  rewardCostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Variables.sizes.xs,
    marginBottom: 2,
  },
  rewardDiamond: {
    width: 15,
    height: 18,
  },
  rewardCost: {
    fontFamily: Variables.fonts.default,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
  },
  rewardValidity: {
    fontFamily: Variables.fonts.bold,
    fontSize: 11,
    color: Variables.colors.textLight,
  },
  claimButton: {
    backgroundColor: Variables.colors.primary,
    margin: Variables.sizes.sm,
    marginTop: 0,
    paddingVertical: Variables.sizes.sm,
    borderRadius: 10,
    alignItems: "center",
  },
  claimButtonDisabled: {
    backgroundColor: "#C0C0C0",
  },
  claimButtonText: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textInverse,
  },

  // --- Empty states ---
  emptyText: {
    fontFamily: Variables.fonts.regular,
    color: Variables.colors.textLight,
    textAlign: "center",
    marginTop: 40,
  },
  emptyCoupons: {
    alignItems: "center",
    marginTop: 60,
    gap: Variables.sizes.sm,
  },
  emptySubText: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
    textAlign: "center",
    paddingHorizontal: Variables.sizes.xl,
  },

  // --- Coupons ---
  couponsWrapper: {
    padding: Variables.sizes.md,
    gap: Variables.sizes.md,
  },
  couponCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Variables.colors.surface,
    borderRadius: 16,
    padding: Variables.sizes.md,
    gap: Variables.sizes.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  couponImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
  },
  couponImage: {
    width: 60,
    height: 60,
  },
  couponInfo: {
    flex: 1,
  },
  couponTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
  },
  couponBusiness: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
  },
  couponValidity: {
    fontFamily: Variables.fonts.regular,
    fontSize: 11,
    color: Variables.colors.textLight,
    marginTop: 2,
  },
  couponStatusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: Variables.sizes.sm,
    paddingVertical: Variables.sizes.xs,
    borderRadius: 10,
  },
  couponStatusUsed: {
    backgroundColor: "#F5F5F5",
  },
  couponStatusText: {
    fontFamily: Variables.fonts.bold,
    fontSize: 11,
    color: "#388E3C",
  },

  // --- Modals ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Variables.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Variables.sizes.lg,
    paddingBottom: Variables.sizes.xl + Variables.sizes.lg,
  },
  modalClose: {
    alignSelf: "flex-end",
    marginBottom: Variables.sizes.sm,
  },
  modalImageWrapper: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: Variables.sizes.md,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.lg,
    color: Variables.colors.text,
    marginBottom: Variables.sizes.xs,
  },
  modalBusinessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Variables.sizes.xs,
    marginBottom: Variables.sizes.sm,
  },
  modalBusiness: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
  },
  modalDescription: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
    lineHeight: 22,
    marginBottom: Variables.sizes.md,
  },
  modalValidity: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
    marginBottom: Variables.sizes.md,
  },
  modalCostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Variables.sizes.sm,
    marginBottom: Variables.sizes.md,
  },
  modalDiamond: {
    width: 24,
    height: 24,
  },
  modalCost: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.md,
    color: Variables.colors.text,
  },
  modalInsufficientText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.error,
    marginBottom: Variables.sizes.md,
    textAlign: "center",
  },
  modalPurchaseButton: {
    backgroundColor: Variables.colors.primary,
    borderRadius: 14,
    paddingVertical: Variables.sizes.md,
    alignItems: "center",
  },
  modalPurchaseText: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.textInverse,
    letterSpacing: 1,
  },

  // --- Code box ---
  codeBox: {
    backgroundColor: Variables.colors.background,
    borderRadius: 14,
    padding: Variables.sizes.md,
    alignItems: "center",
    marginVertical: Variables.sizes.md,
    borderWidth: 2,
    borderColor: Variables.colors.primary,
    borderStyle: "dashed",
  },
  codeLabel: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
    marginBottom: Variables.sizes.xs,
  },
  codeText: {
    fontFamily: Variables.fonts.extrabold,
    fontSize: Variables.textSizes.lg,
    color: Variables.colors.primary,
    letterSpacing: 3,
  },
  codeInstructions: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
});
