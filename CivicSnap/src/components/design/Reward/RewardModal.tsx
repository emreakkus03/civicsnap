import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";

interface RewardModalProps {
  reward: any;
  points: number;
  purchasing: boolean;
  onClose: () => void;
  onPurchase: () => void;
}

const LOCATION_LABELS: Record<string, string> = {
  all: "Alle steden",
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

export default function RewardModal({
  reward,
  points,
  purchasing,
  onClose,
  onPurchase,
}: RewardModalProps) {
      const colors = useThemeColors();                                       
      const styles = createStyles(colors);
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalImageWrapper}>
              {reward.image_url ? (
                <Image
                  source={{ uri: reward.image_url }}
                  style={styles.modalImage}
                />
              ) : (
                <View style={[styles.modalImage, styles.imagePlaceholder]}>
                  <Ionicons
                    name="gift-outline"
                    size={48}
                    color={colors.textLight}
                  />
                </View>
              )}
            </View>

            <Text style={styles.modalTitle}>{reward.title}</Text>
            <View style={styles.modalBusinessRow}>
    <Image
        source={require("@assets/icons/ReportPinMarker.png")}
        style={styles.markerIcon}
        resizeMode="contain"
    />
    <Text style={styles.modalBusiness}>
        {reward.business_name} · {LOCATION_LABELS[reward.location_filter] || reward.location_filter}
    </Text>
</View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Beschrijving</Text>
              <Text style={styles.modalDescription}>{reward.description}</Text>
            </View>

            {reward.valid_until && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Geldig tot</Text>
                <Text style={styles.modalValidity}>
                  {new Date(reward.valid_until).toLocaleDateString("nl-BE")}
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Kosten</Text>
              <View style={styles.modalCostRow}>
                <Image
                  source={require("@assets/icons/Diamant.png")}
                  style={styles.modalDiamond}
                  resizeMode="contain"
                />
                <Text style={styles.modalCost}>
                  {reward.cost_points} diamanten
                </Text>
              </View>
            </View>

            {points < reward.cost_points && (
              <Text style={styles.modalInsufficientText}>
                Je hebt onvoldoende diamanten. Nog {reward.cost_points - points}{" "}
                💎 tekort.
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.modalPurchaseButton,
                (points < reward.cost_points || purchasing) &&
                  styles.buttonDisabled,
              ]}
              onPress={onPurchase}
              disabled={points < reward.cost_points || purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalPurchaseText}>
                  {points < reward.cost_points
                    ? "Onvoldoende diamanten"
                    : "KOPEN"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  section: {
    marginBottom: Variables.sizes.md,
    paddingBottom: Variables.sizes.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  sectionLabel: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.sm,
    color: colors.text,
    marginBottom: Variables.sizes.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Variables.sizes.lg,
    paddingBottom: Variables.sizes.xl + Variables.sizes.lg,
    maxHeight: "90%",
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
  imagePlaceholder: {
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.lg,
    color: colors.text,
    marginBottom: Variables.sizes.xs,
  },
  modalBusinessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Variables.sizes.xs,
    marginBottom: Variables.sizes.sm,
  },
  markerIcon: {
    width: 16,
    height: 20,
  },
  modalBusiness: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: colors.textLight,
  },
  modalDescription: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.base,
    color: colors.text,
    lineHeight: 22,
  },
  modalValidity: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: colors.textLight,
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
    color: colors.text,
  },
  modalInsufficientText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: colors.error,
    marginBottom: Variables.sizes.md,
    textAlign: "center",
  },
  modalPurchaseButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: Variables.sizes.md,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#C0C0C0",
  },
  modalPurchaseText: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: colors.textInverse,
    letterSpacing: 1,
  },
});
