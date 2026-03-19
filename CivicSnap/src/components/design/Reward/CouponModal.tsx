import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-qr-code";

import { Variables } from "@style/theme";

interface CouponModalProps {
  coupon: any;
  onClose: () => void;
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

export default function CouponModal({ coupon, onClose }: CouponModalProps) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={24} color={Variables.colors.text} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
           <View style={styles.modalImageWrapper}>
    {coupon.reward?.image_url ? (
        <Image source={{ uri: coupon.reward.image_url }} style={styles.modalImage} />
    ) : (
        <View style={[styles.modalImage, styles.imagePlaceholder]}>
            <Ionicons name="gift-outline" size={48} color={Variables.colors.textLight} />
        </View>
    )}
</View>

<Text style={styles.modalTitle}>{coupon.reward?.title || "Reward"}</Text>

<View style={styles.section}>
    <View style={styles.businessRow}>
        <Image source={require("@assets/icons/ReportPinMarker.png")} style={styles.markerIcon} resizeMode="contain" />
        <Text style={styles.modalBusiness}>
            {coupon.reward?.business_name || ""} · {LOCATION_LABELS[coupon.reward?.location_filter] || coupon.reward?.location_filter}
        </Text>
    </View>
</View>



<View style={styles.section}>
    <Text style={styles.sectionLabel}>Jouw QR Code</Text>
    <View style={styles.qrContainer}>
        <QRCode value={coupon.code} size={180} color={Variables.colors.text} />
    </View>
</View>


<View style={styles.section}>
    <Text style={styles.sectionLabel}>Coupon Code</Text>
    <View style={styles.codeBox}>
        <Text style={styles.codeText}>{coupon.code}</Text>
    </View>
</View>




{coupon.reward?.valid_until && (
    <View style={styles.section}>
        <Text style={styles.sectionLabel}>Geldig tot</Text>
        <Text style={styles.modalValidity}>
            {new Date(coupon.reward.valid_until).toLocaleDateString("nl-BE")}
        </Text>
    </View>
)}


<View style={styles.section}>
    <Text style={styles.sectionLabel}>Hoe inwisselen?</Text>
    <Text style={styles.codeInstructions}>
        Toon deze code aan de kassa om je reward in te wisselen.
    </Text>
</View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    section: {
    marginBottom: Variables.sizes.md,
    paddingBottom: Variables.sizes.md,
    borderBottomWidth: 1,
    borderBottomColor: Variables.colors.background,
},
sectionLabel: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.text,
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
    backgroundColor: Variables.colors.surface,
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
    color: Variables.colors.text,
    marginBottom: Variables.sizes.xs,
  },
  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Variables.sizes.xs,
    marginBottom: Variables.sizes.md,
  },
  markerIcon: {
    width: 16,
    height: 20,
  },
  modalBusiness: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.textLight,
  },
  modalValidity: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
    marginBottom: Variables.sizes.md,
    textAlign: "center",
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Variables.sizes.md,
    padding: Variables.sizes.md,
    backgroundColor: Variables.colors.surface,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
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
