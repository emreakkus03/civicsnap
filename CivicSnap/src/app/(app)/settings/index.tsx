import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
  Image,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";
import { API } from "@core/networking/api";

import { useAuthContext } from "@components/functional/Auth/authProvider";
import BackButton from "@components/design/Button/BackButton";

import { Variables } from "@style/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, logout } = useAuthContext();
  const { lastUpdate } = useRealtime();
  const [freshProfile, setFreshProfile] = useState<any>(null);

  const [darkMode, setDarkMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deleteConfirmText, setDeleteConfirmText] = useState("");
const CONFIRM_PHRASE = "VERWIJDEREN";

  useEffect(() => {
    if (!profile?.$id) return;
    const fetchFresh = async () => {
      try {
        const data = await API.database.getDocument(
          API.config.databaseId,
          API.config.profilesCollectionId,
          profile.$id,
        );
        setFreshProfile(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchFresh();
  }, [lastUpdate, profile?.$id]);

  // --- Logout handler ---
  const handleLogout = () => {
    Alert.alert("Uitloggen", "Ben je zeker dat je wilt uitloggen?", [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Uitloggen",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  // --- Delete account handler ---
  const handleDeleteAccount = () => {
    if(freshProfile?.organization_id && freshProfile.organization_id !== "NULL" ) {
        Alert.alert(
            "Niet mogelijk",
            "Je account is gekoppeld aan een organisatie. Contacteer je beheerder om je account te verwijderen.",
            [{ text: "OK" }]
        );
        return;
    }

    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== CONFIRM_PHRASE) {
      Alert.alert("Fout", "De ingevoerde tekst komt niet overeen. Typ exact: " + CONFIRM_PHRASE);
      return;
    }

    try {
        await API.database.deleteDocument(
            API.config.databaseId,
            API.config.profilesCollectionId,
            profile!.$id
        );
        await API.auth.deleteSessions();

        setShowDeleteModal(false);
        await logout();
        router.replace("/welcome");
    } catch (error) {
        console.error("Error deleting account:", error);
        Alert.alert("Fout", "Er is een fout opgetreden bij het verwijderen van je account.");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* --- Header --- */}
      <View style={styles.header}>
        <View style={styles.backButtonWrapper}>
          <BackButton />
        </View>
        <Text style={styles.headerTitle}>Instellingen</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        {/* --- Profile card --- */}
        <View style={styles.profileCard}>
          <Image
            source={
              freshProfile?.avatar_url || profile?.avatar_url
                ? { uri: freshProfile?.avatar_url || profile?.avatar_url }
                : require("@assets/icons/User.png")
            }
            style={styles.profileAvatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {" "}
              {freshProfile?.full_name || profile?.full_name || "Gebruiker"}
            </Text>
            <Text style={styles.profileEmail}>{profile?.email || ""}</Text>
          </View>
        </View>

        {/* --- Account and profile --- */}
        <Text style={styles.sectionTitle}>Account en profiel</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/(app)/settings/edit-profile" as any)}
          >
            <Image
              source={require("@assets/icons/User.png")}
              style={[styles.rowIcon]}
            />

            <Text style={styles.rowLabel}>Profiel bewerken</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Variables.colors.textLight}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              router.push("/(app)/settings/change-password" as any)
            }
          >
            <Image
              source={require("@assets/icons/Lock.png")}
              style={[styles.rowIcon]}
            />
            <Text style={styles.rowLabel}>Wachtwoord wijzigen</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Variables.colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* --- App preferences --- */}
        <Text style={styles.sectionTitle}>App voorkeuren</Text>
        <View style={[styles.sectionCard, { paddingVertical: 0 }]}>
          <View style={[styles.row, { paddingVertical: 0, height: 54 }]}>
            <Image
              source={require("@assets/icons/Moon.png")}
              style={[styles.rowIcon]}
            />
            <Text style={styles.rowLabel}>Dark mode</Text>
            <Switch
              value={darkMode}
              onValueChange={(val) => setDarkMode(val)}
              trackColor={{ false: "#E0E0E0", true: Variables.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* --- Other --- */}
        <Text style={styles.sectionTitle}>Overig</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row}>
            <Image
              source={require("@assets/icons/Help.png")}
              style={[styles.rowIcon]}
            />
            <Text style={styles.rowLabel}>Hulp & ondersteuning</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Variables.colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* --- Logout button --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>UITLOGGEN</Text>
        </TouchableOpacity>

        {/* --- Delete account --- */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteText}>Account verwijderen</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
    visible={showDeleteModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowDeleteModal(false)}
>
    <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Account verwijderen</Text>
            <Text style={styles.modalDescription}>
                Dit kan niet ongedaan gemaakt worden. Al je meldingen en punten worden permanent verwijderd.
            </Text>
            <Text style={styles.modalInstruction}>
                Typ <Text style={styles.modalPhrase}>"{CONFIRM_PHRASE}"</Text> om te bevestigen:
            </Text>
            <TextInput
                style={styles.modalInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={CONFIRM_PHRASE}
                placeholderTextColor={Variables.colors.textLight}
                autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
                <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowDeleteModal(false)}
                >
                    <Text style={styles.modalCancelText}>Annuleren</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.modalDeleteButton,
                        deleteConfirmText !== CONFIRM_PHRASE && styles.modalDeleteButtonDisabled
                    ]}
                    onPress={handleConfirmDelete}
                    disabled={deleteConfirmText !== CONFIRM_PHRASE}
                >
                    <Text style={styles.modalDeleteText}>Verwijderen</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
</Modal>
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
    justifyContent: "space-between",
    paddingHorizontal: Variables.sizes.md,
    paddingVertical: Variables.sizes.sm,
    backgroundColor: Variables.colors.background,
  },
  backButton: {
    width: 26,
  },
  headerTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.xl,
    color: Variables.colors.text,
  },

  // --- Profile card ---
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Variables.colors.primary,
    marginHorizontal: Variables.sizes.md,
    marginTop: Variables.sizes.sm,
    marginBottom: Variables.sizes.lg,
    borderRadius: 16,
    padding: Variables.sizes.md,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Variables.colors.surface,
    marginRight: Variables.sizes.sm + 6,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.md,
    color: Variables.colors.textInverse,
  },
  profileEmail: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.textInverse,
    marginTop: Variables.sizes.xs,
    opacity: 0.8,
  },

  // --- Sections ---
  sectionTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
    marginHorizontal: Variables.sizes.md,
    marginBottom: Variables.sizes.sm,
    marginTop: Variables.sizes.xs,
  },
  sectionCard: {
    backgroundColor: Variables.colors.surface,
    borderRadius: 16,
    marginHorizontal: Variables.sizes.md,
    marginBottom: Variables.sizes.md + 4,
    paddingVertical: Variables.sizes.xs,
    shadowColor: Variables.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Variables.sizes.md,
    paddingVertical: Variables.sizes.sm + 7,
  },
  rowIcon: {
    marginRight: Variables.sizes.sm + 6,
    width: 24,
    height: 24,
  },
  rowLabel: {
    flex: 1,
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Variables.colors.background,
    marginHorizontal: Variables.sizes.md,
  },

  // --- Logout & Delete ---
  logoutButton: {
    backgroundColor: Variables.colors.error,
    marginHorizontal: Variables.sizes.md,
    borderRadius: 14,
    paddingVertical: Variables.sizes.md,
    alignItems: "center",
    marginTop: Variables.sizes.sm + 2,
    marginBottom: Variables.sizes.sm + 4,
  },
  logoutText: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.md,
    color: Variables.colors.textInverse,
    letterSpacing: 1,
  },
  deleteButton: {
    alignItems: "center",
    paddingBottom: Variables.sizes.md,
},
  deleteText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.md,
    color: Variables.colors.error,
  },
  backButtonWrapper: {
    top: 15,
    left: 5,
    zIndex: 10,
    transform: [{ scale: 1.5 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Variables.sizes.md,
},
modalCard: {
    backgroundColor: Variables.colors.surface,
    borderRadius: 20,
    padding: Variables.sizes.lg,
    width: "100%",
},
modalTitle: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.md,
    color: Variables.colors.text,
    marginBottom: Variables.sizes.sm,
},
modalDescription: {
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.textLight,
    marginBottom: Variables.sizes.md,
    lineHeight: 20,
},
modalInstruction: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.sm,
    color: Variables.colors.text,
    marginBottom: Variables.sizes.sm,
},
modalPhrase: {
    fontFamily: Variables.fonts.bold,
    color: Variables.colors.error,
},
modalInput: {
    backgroundColor: Variables.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: Variables.sizes.md,
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
    marginBottom: Variables.sizes.md,
},
modalButtons: {
    flexDirection: "row",
    gap: Variables.sizes.sm,
},
modalCancelButton: {
    flex: 1,
    backgroundColor: Variables.colors.background,
    borderRadius: 12,
    paddingVertical: Variables.sizes.md,
    alignItems: "center",
},
modalCancelText: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.text,
},
modalDeleteButton: {
    flex: 1,
    backgroundColor: Variables.colors.error,
    borderRadius: 12,
    paddingVertical: Variables.sizes.md,
    alignItems: "center",
},
modalDeleteButtonDisabled: {
    opacity: 0.4,
},
modalDeleteText: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.base,
    color: Variables.colors.textInverse,
},
});
