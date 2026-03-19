import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Variables } from "@style/theme";

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

interface RewardCardProps {
  reward: any;
  points: number;
  onPress: () => void;
  onClaim: () => void;
}

export default function RewardCard({ reward, points, onPress, onClaim }: RewardCardProps) {
  return (
    <TouchableOpacity style={styles.rewardCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.locationBadge}>
        <Text style={styles.locationBadgeText}>
          {LOCATION_LABELS[reward.location_filter] || reward.location_filter}
        </Text>
      </View>

      <View style={styles.rewardImageWrapper}>
        {reward.image_url ? (
          <Image source={{ uri: reward.image_url }} style={styles.rewardImage} />
        ) : (
          <View style={[styles.rewardImage, styles.rewardImagePlaceholder]}>
            <Ionicons name="gift-outline" size={32} color={Variables.colors.textLight} />
          </View>
        )}
      </View>

      <View style={styles.rewardInfo}>
        <Text style={styles.rewardTitle} numberOfLines={1}>{reward.title}</Text>
        <View style={styles.rewardBusinessRow}>
          <Image
            source={require("@assets/icons/ReportPinMarker.png")}
            style={{ width: 15, height: 18 }}
            resizeMode="contain"
          />
          <Text style={styles.rewardBusiness} numberOfLines={1}>{reward.business_name}</Text>
        </View>
        <View style={styles.rewardCostRow}>
          <Image
            source={require("@assets/icons/Diamant.png")}
            style={styles.rewardDiamond}
            resizeMode="contain"
          />
          <Text style={styles.rewardCost}>{reward.cost_points} pnt</Text>
        </View>
        {reward.valid_until && (
          <Text style={styles.rewardValidity}>
            Geldig t/m {new Date(reward.valid_until).toLocaleDateString("nl-BE")}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.claimButton, points < reward.cost_points && styles.claimButtonDisabled]}
        onPress={onClaim}
      >
        <Text style={styles.claimButtonText}>CLAIMEN</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 15,
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
});