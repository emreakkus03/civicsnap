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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { Query } from 'react-native-appwrite';

import { useAuthContext } from "@components/functional/Auth/authProvider";
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";
import { API } from "@core/networking/api";
import { Variables } from "@style/theme";
import { LinearGradient } from "expo-linear-gradient";

import { Functions, ExecutionMethod } from "react-native-appwrite";
import RewardCard from "@components/design/Reward/RewardCard";
import RewardModal from "@components/design/Reward/RewardModal";
import CouponModal from "@components/design/Reward/CouponModal";
import CouponCard from "@components/design/Reward/CouponCard";
import BonusBanner from "@/components/design/Reward/BonusBanner";
import FilterBar from "@/components/design/Reward/FilterBar";

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
  
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
 const [currentOrgName, setCurrentOrgName] = useState<string>("Lokaal");
  const [locationLoading, setLocationLoading] = useState(true);

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
    }, []),
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

  // --- GPS & Lokale Gemeente Bepalen ---
  useEffect(() => {
    const determineLocalMunicipality = async () => {
      try {
        setLocationLoading(true);
        
        // 1. Vraag toestemming aan de gebruiker
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Geen toestemming voor locatie');
          setCurrentOrgId(profile?.organization_id || null); // Fallback naar thuis-gemeente
          return;
        }

        // 2. Haal de huidige GPS locatie op
        let location = await Location.getCurrentPositionAsync({});
        
        // 3. Vertaal GPS naar een Postcode (Reverse Geocoding)
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode.length > 0) {
          const postalCode = geocode[0].postalCode; // bijv. "9220"
          
          if (postalCode) {
            // 4. Zoek de gemeente in jouw Appwrite database via de postcode
            // Let op: controleer of API.config.organizationsCollectionId klopt in jouw api.ts!
            const orgResponse = await API.database.listDocuments(
              API.config.databaseId,
              API.config.organizationsCollectionId, // De collectie met alle gemeentes
              [Query.search("zip_codes", postalCode)] 
            );

           if (orgResponse.documents.length > 0) {
              // Gemeente gevonden!
             const foundOrg = orgResponse.documents[0];
              setCurrentOrgId(foundOrg.$id);
              
             
              let cleanName = foundOrg.name;
              if (cleanName.toLowerCase().startsWith("gemeente ")) {
                cleanName = cleanName.substring(9);
              } else if (cleanName.toLowerCase().startsWith("stad ")) {
                cleanName = cleanName.substring(5); 
              }
              
              setCurrentOrgName(cleanName);
            } else {
              setCurrentOrgId(profile?.organization_id || null);
              setCurrentOrgName("Lokaal"); 
            }
          }
        }
      } catch (error) {
        console.error("Fout bij ophalen GPS:", error);
        setCurrentOrgId(profile?.organization_id || null);
      } finally {
        setLocationLoading(false);
      }
    };

    determineLocalMunicipality();
  }, [profile?.organization_id]);


  const filteredRewards = rewards.filter((r: any) => {
    const typeMatch = selectedFilter === "all" || r.type === selectedFilter;
    
    let locationMatch = false;

    if (selectedLocation === "all" || selectedLocation === "local") {

      locationMatch = r.location_filter === "all" || (r.organization_id && r.organization_id === currentOrgId);
    } else {
   
      locationMatch = r.location_filter === "all" || r.location_filter === selectedLocation;
    }

    return typeMatch && locationMatch;
  });

 
  const sortedRewards = [...filteredRewards].sort((a, b) => {
    const aIsLocal = a.organization_id && a.organization_id === currentOrgId;
    const bIsLocal = b.organization_id && b.organization_id === currentOrgId;

    if (aIsLocal && !bIsLocal) return -1;
    if (!aIsLocal && bIsLocal) return 1;
    return 0;
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
          <BonusBanner />

          {/* --- Filters --- */}
         <FilterBar
  selectedFilter={selectedFilter}
  selectedLocation={selectedLocation}
  showLocationDropdown={showLocationDropdown}
  filters={filters}
  locations={locations}
  onFilterChange={setSelectedFilter}
  onLocationChange={(key) => { setSelectedLocation(key); setShowLocationDropdown(false); }}
  onDropdownToggle={() => setShowLocationDropdown(!showLocationDropdown)}
/>

          {/* --- Rewards grid --- */}
          {loading ? (
            <ActivityIndicator
              color={Variables.colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : sortedRewards.length === 0 ? (
            <Text style={styles.emptyText}>Geen rewards beschikbaar.</Text>
          ) : (
          <View style={styles.rewardsGrid}>
              {sortedRewards.map((reward: any) => {
                
                const displayLocation = reward.location_filter === "local" 
                  ? currentOrgName 
                  : reward.location_filter;

                return (
                  <RewardCard
                    key={reward.$id}
                    reward={{ ...reward, location_filter: displayLocation }} 
                    points={points}
                    onPress={() => setSelectedReward({ ...reward, location_filter: displayLocation })}
                    onClaim={() => handlePurchase(reward)}
                  />
                );
              })}
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
                <CouponCard
                  key={ur.$id}
                  coupon={ur}
                  onPress={() => setSelectedCoupon(ur)}
                />
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* --- Reward detail modal --- */}
      {selectedReward && (
        <RewardModal
          reward={selectedReward}
          points={points}
          purchasing={purchasing}
          onClose={() => setSelectedReward(null)}
          onPurchase={() => handlePurchase(selectedReward)}
        />
      )}

      {/* --- Coupon detail modal --- */}
      {selectedCoupon && (
        <CouponModal
          coupon={selectedCoupon}
          onClose={() => setSelectedCoupon(null)}
        />
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

  
  
  

  // --- Rewards grid ---
  rewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Variables.sizes.md,
    gap: Variables.sizes.md,
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
});
