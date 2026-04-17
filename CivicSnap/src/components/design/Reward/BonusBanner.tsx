import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Variables } from "@style/theme";
import { useRouter } from "expo-router";

export default function BonusBanner() {
  const router = useRouter();

  return (
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
        <TouchableOpacity style={styles.bonusButton} onPress={() => router.push("/(app)/daily-spin/" as any)}>
          <Text style={styles.bonusButtonText}>SPEEL NU</Text>
        </TouchableOpacity>
      </View>
      <Image
        source={require("@assets/icons/spinning-wheel.png")}
        style={styles.wheelImage}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bonusBanner: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  wheelImage: {
    position: "absolute",
    right: -80,
    width: 300,
    height: 320,
  },
});