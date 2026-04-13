import { useState, useEffect } from "react"; // Import React hooks for state and lifecycle handling.
import { StyleSheet, View, TouchableOpacity } from "react-native"; // Import React Native UI primitives and stylesheet utility.
import { Query } from "react-native-appwrite"; // Import Appwrite query builder helpers.
import { Ionicons } from "@expo/vector-icons"; // Import Ionicons icon set from Expo.
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Import safe area inset hook for notch/status bar spacing.

import { API } from "@core/networking/api"; // Import centralized API client/config.
import { Variables } from "@style/theme"; // Import theme variables (colors, sizes, fonts).
import ThemedText from "@components/design/Typography/ThemedText"; // Import project-specific themed text component.

import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider"; // Import realtime hook for server update triggers.

type Props = {
  location_lat: number; // Latitude for current user location.
  location_long: number; // Longitude for current user location.
}; // Define component props type.

export default function AnnouncementBanner({ location_lat, location_long }: Props) { // Define and export the announcement banner component.
  const [activeAnnouncement, setActiveAnnouncement] = useState<any | null>(null); // Store the currently active announcement document.
  const [showAnnouncements, setShowAnnouncements] = useState(true); // Control banner visibility state.
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string | null>(null); // Store dismissed announcement ID to avoid immediate re-show.

 const insets = useSafeAreaInsets();
  const { lastUpdate } = useRealtime();

  // 👇 DE FIX: Afronden op 2 of 3 decimalen voorkomt de infinite loop crash!
  // 2 decimalen is ~1 kilometer nauwkeurig. Genoeg om te weten of je in een andere stad bent.
  const roundedLat = location_lat ? Math.round(location_lat * 100) / 100 : null;
  const roundedLong = location_long ? Math.round(location_long * 100) / 100 : null;

  useEffect(() => {
    // Check nu op de afgeronde waarden
    if (!roundedLat || !roundedLong) {
      return; 
    }

    const fetchLocalAnnouncements = async () => {
      try {
        const APIKey = await API.config.googleMapsApiKey; 
        if (!APIKey) return; 

        // 👇 Gebruik de afgeronde waarden voor de Google Maps call
        const geoResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${roundedLat},${roundedLong}&key=${APIKey}`
        );

        const geoData = await geoResponse.json(); 

        let currentZipCode = ""; 

        if (geoData.results && geoData.results.length > 0) {
          const addressComponents = geoData.results[0].address_components; 
          const zipComponent = addressComponents.find((c: any) => c.types.includes("postal_code")); 
          if (zipComponent) currentZipCode = zipComponent.long_name; 
        }

        if (!currentZipCode) {
          return; 
        }

        const orgsResponse = await API.database.listDocuments(
          API.config.databaseId,
          API.config.organizationsCollectionId,
          [Query.equal("zip_codes", currentZipCode)]
        ); 

        if (orgsResponse.documents.length === 0) return; 
        const organizationId = orgsResponse.documents[0].$id; 

        const now = new Date().toISOString(); 
        const announcementsResponse = await API.database.listDocuments(
          API.config.databaseId,
          API.config.announcementsCollectionId,
          [
            Query.equal("organization_id", organizationId), 
            Query.equal("is_active", true), 
            Query.lessThanEqual("start_at", now), 
            Query.greaterThan("ends_at", now), 
            Query.orderDesc("priority"), 
            Query.limit(1), 
          ]
        ); 

        if (announcementsResponse.documents.length > 0) {
          const newAnnouncement = announcementsResponse.documents[0]; 
          setActiveAnnouncement(newAnnouncement); 

          if (newAnnouncement.$id !== dismissedAnnouncements) {
            setShowAnnouncements(true); 
          }
        } else {
          setActiveAnnouncement(null); 
        }
      } catch (error) {
        console.error("Error while fetching local announcements:", error); 
      }
    }; 

    fetchLocalAnnouncements(); 
    
  
  }, [roundedLat, roundedLong, lastUpdate]);

  if (!activeAnnouncement || !showAnnouncements) return null; // Render nothing when no active item or banner is hidden.

  const getBannerColor = () => {
    // Return left-border/title color based on priority value.
    switch (activeAnnouncement.priority) {
      // Branch by priority level.
      case "high":
        return "#E63946"; // High priority color.
      case "medium":
        return "#F4A261"; // Medium priority color.
      case "low":
        return "#2A9D8F"; // Low priority color.
      default:
        return Variables.colors.primary; // Fallback theme primary color.
    }
  }; // End color helper function.

  return (
    <View style={[styles.announcementBanner, { top: insets.top + 15, borderLeftColor: getBannerColor() }]}>
      {/* Outer banner container with safe-area top offset and dynamic border color. */}
      <View style={styles.announcementContent}>
        {/* Inner content wrapper with padding. */}
        <View style={styles.announcementHeader}>
          {/* Header row containing icon/title and close action. */}
          <View style={styles.titleWrapper}>
            {/* Wrapper for icon and title text. */}
            <Ionicons name="megaphone" size={16} color={getBannerColor()} style={{ marginRight: 6 }} />
            {/* Megaphone icon with dynamic color. */}
            <ThemedText style={[styles.announcementTitle, { color: getBannerColor() }]} numberOfLines={1}>
              {/* Single-line announcement title with dynamic color. */}
              {activeAnnouncement.title}
              {/* Render announcement title value. */}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowAnnouncements(false); // Hide banner immediately on close.
              setDismissedAnnouncements(activeAnnouncement.$id); // Remember dismissed announcement ID.
            }}
            style={styles.closeButton}
          >
            {/* Close button container. */}
            <Ionicons name="close" size={20} color={Variables.colors.textLight} />
            {/* Close icon. */}
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.announcementText} numberOfLines={2}>
          {/* Two-line announcement body text. */}
          {activeAnnouncement.content}
          {/* Render announcement content value. */}
        </ThemedText>
      </View>
    </View>
  ); // Return banner UI tree.
} // End component.

const styles = StyleSheet.create({
  announcementBanner: {
    position: "absolute", // Float banner over page content.
    left: Variables.sizes.md, // Horizontal left inset.
    right: Variables.sizes.md, // Horizontal right inset.
    zIndex: 100, // Ensure banner appears above other elements.
    backgroundColor: Variables.colors.surface, // Banner background color.
    borderRadius: Variables.sizes.sm, // Rounded corner radius.
    shadowColor: Variables.colors.text, // iOS shadow color.
    shadowOffset: { width: 0, height: 6 }, // iOS shadow offset.
    shadowOpacity: 0.12, // iOS shadow opacity.
    shadowRadius: 10, // iOS shadow blur radius.
    elevation: 8, // Android shadow elevation.
    borderLeftWidth: 5, // Left accent border width.
  },
  announcementContent: {
    padding: Variables.sizes.md, // Inner spacing around banner content.
  },
  announcementHeader: {
    flexDirection: "row", // Place title and close button in a row.
    justifyContent: "space-between", // Push title and button to row edges.
    alignItems: "center", // Vertically center row items.
    marginBottom: Variables.sizes.xs, // Space below header.
  },
  titleWrapper: {
    flexDirection: "row", // Place icon and title text side-by-side.
    alignItems: "center", // Vertically align icon and title text.
    flex: 1, // Let title wrapper use available width.
    marginRight: Variables.sizes.sm, // Space between title and close button.
  },
  announcementTitle: {
    fontSize: Variables.textSizes.base, // Title text size.
    fontFamily: Variables.fonts.bold, // Title font weight/style.
    flex: 1, // Allow title to truncate within available space.
  },
  announcementText: {
    fontSize: Variables.textSizes.sm, // Body text size.
    color: Variables.colors.textLight, // Body text color.
    lineHeight: 20, // Body text line height.
    fontFamily: Variables.fonts.regular, // Body text font family.
  },
  closeButton: {
    padding: Variables.sizes.xs, // Touch target padding.
    backgroundColor: Variables.colors.background, // Button background color.
    borderRadius: 20, // Make close button circular.
  },
}); // End stylesheet.
