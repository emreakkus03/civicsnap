import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Variables } from "@style/theme";

interface CouponCardProps {
  coupon: any;
  onPress: () => void;
}

export default function CouponCard({ coupon, onPress }: CouponCardProps) {
  return (
    <TouchableOpacity style={styles.couponCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.couponImageWrapper}>
        {coupon.reward?.image_url ? (
          <Image source={{ uri: coupon.reward.image_url }} style={styles.couponImage} />
        ) : (
          <View style={[styles.couponImage, styles.imagePlaceholder]}>
            <Ionicons name="gift-outline" size={24} color={Variables.colors.textLight} />
          </View>
        )}
      </View>

      <View style={styles.couponInfo}>
        <Text style={styles.couponTitle} numberOfLines={1}>
          {coupon.reward?.title || "Reward"}
        </Text>
        <View style={styles.couponBusinessRow}>

            <Image
                        source={require("@assets/icons/ReportPinMarker.png")}
                        style={{ width: 15, height: 18 }}
                        resizeMode="contain"
                    />
            <Text style={styles.couponBusiness} numberOfLines={1}>
            {coupon.reward?.business_name || ""}
            </Text>
        </View>
        {coupon.reward?.valid_until && (
          <Text style={styles.couponValidity}>
            Geldig t/m {new Date(coupon.reward.valid_until).toLocaleDateString("nl-BE")}
          </Text>
        )}
      </View>

      <View style={[styles.couponStatusBadge, coupon.status === "used" && styles.couponStatusUsed]}>
        <Text style={styles.couponStatusText}>
          {coupon.status === "used" ? "Gebruikt" : "Actief"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
  },
  couponImage: {
    width: 80,
    height: 80,
  },
  imagePlaceholder: {
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
  },
  couponValidity: {
    fontFamily: Variables.fonts.bold,
    fontSize: 11,
    color: Variables.colors.textLight,
  },
  couponStatusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: Variables.sizes.sm,
    paddingVertical: Variables.sizes.xs,
    borderRadius: 10,
    top: -30,
  },
  couponStatusUsed: {
    backgroundColor: "#F5F5F5",
  },
  couponStatusText: {
    fontFamily: Variables.fonts.bold,
    fontSize: 11,
    color: "#388E3C",
  },
  couponBusinessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: Variables.sizes.xs,
  },
});