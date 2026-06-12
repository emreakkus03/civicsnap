import React from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Pressable,
  Image,
  Text,
} from "react-native";

//--- Custom Desing components ---
import Button from "@/components/design/Button/PrimaryButton";
import ThemedText from "@/components/design/Typography/ThemedText";

//--- Theme Style ---
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCameraPress: () => void;
  onGalleryPress: () => void;
  onNotePress: () => void;
};

export default function ReportPopupScreen({
  visible,
  onClose,
  onCameraPress,
  onGalleryPress,
  onNotePress,
}: Props) {
                    const colors = useThemeColors();                                       
                    const styles = createStyles(colors);
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          <View style={styles.popup}>
            <ThemedText style={styles.title}>Nieuwe Melding</ThemedText>
            <Image
              source={require("@assets/icons/Close.png")}
              style={styles.closeImage}
            />
          </View>
          <TouchableOpacity style={styles.buttonRow} onPress={onCameraPress}>
            <Image
              source={require("@assets/icons/Camera.png")}
              style={styles.iconImage}
            />
            <Button style={styles.buttonReportOptions} onPress={onCameraPress} variant="primary">
              Camera Openen
            </Button>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonRow} onPress={onGalleryPress}>
            <Image
              source={require("@assets/icons/Image.png")}
              style={styles.iconImage}
            />
            <Button style={styles.buttonReportOptions} onPress={onGalleryPress} variant="secondary">
              Foto Kiezen
            </Button>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonRow} onPress={onNotePress}>
            <Image
              source={require("@assets/icons/File.png")}
              style={styles.iconImage}
            />
            <Button  style={styles.buttonReportOptions} onPress={onNotePress} variant="secondary">
              Notitie Toevoegen
            </Button>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Variables.sizes.lg,
  },
  content: {
    width: "100%",
    backgroundColor: colors.surface || "white",
    borderRadius: Variables.sizes.xl,
    padding: Variables.sizes.lg,
    alignItems: "center",
  },
  popup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Variables.sizes.md,
    width: "100%",
  },
  title: {
    fontFamily: Variables.fonts.extrabold || "extrabold",
    fontSize: Variables.textSizes.lg || 18,
    textAlign: "center",
    flex: 1,
  },
  button: {
    width: "100%",
  },
  closeImage: {
    position: "absolute",
    right: 0,
    width: 28,
    height: 28,
  },
  iconImage: {
    position: "absolute",
    zIndex: 1,
    left: 35,
  },
  buttonRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  buttonReportOptions: {
    width: "100%",
    borderRadius: Variables.sizes.md,
    alignItems: "flex-start",
    paddingLeft: "30%",
  },
});
