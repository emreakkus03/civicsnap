import { useState, useEffect } from "react"; 
import { StyleSheet, View, TouchableOpacity } from "react-native"; 
import { Query } from "react-native-appwrite"; 
import { Ionicons } from "@expo/vector-icons"; 
import { useSafeAreaInsets } from "react-native-safe-area-context"; 

import { API } from "@core/networking/api"; 
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";
import ThemedText from "@components/design/Typography/ThemedText"; 

import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider"; 

const fetchWithTimeout = <T,>(promise: Promise<T>, ms: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: Server reageerde niet binnen ${ms}ms`)), ms)
    ),
  ]);
};

type Props = {
  location_lat: number; 
  location_long: number; 
}; 

export default function AnnouncementBanner({ location_lat, location_long }: Props) { 
  const [activeAnnouncement, setActiveAnnouncement] = useState<any | null>(null); 
  const [showAnnouncements, setShowAnnouncements] = useState(true); 
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string | null>(null); 

  const insets = useSafeAreaInsets();
  const { lastUpdate } = useRealtime();

  const roundedLat = location_lat ? Math.round(location_lat * 100) / 100 : null;
  const roundedLong = location_long ? Math.round(location_long * 100) / 100 : null;
              const colors = useThemeColors();                                       
              const styles = createStyles(colors);

  useEffect(() => {
    if (!roundedLat || !roundedLong) {
      return; 
    }

    const fetchLocalAnnouncements = async () => {
      try {
        const APIKey = API.config.googleMapsApiKey;
        if (!APIKey) return; 

        const geoResponse = await fetchWithTimeout(
          fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${roundedLat},${roundedLong}&key=${APIKey}`)
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

        const orgsResponse = await fetchWithTimeout(
          API.database.listDocuments(
            API.config.databaseId,
            API.config.organizationsCollectionId,
            [Query.equal("zip_codes", currentZipCode)]
          )
        ); 

        if (orgsResponse.documents.length === 0) return; 
        const organizationId = orgsResponse.documents[0].$id; 

        const now = new Date().toISOString(); 
        
        const announcementsResponse = await fetchWithTimeout(
          API.database.listDocuments(
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
          )
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
        console.error("Error while fetching local announcements (Timeout of Netwerkfout):", error); 
      }
    }; 

    fetchLocalAnnouncements(); 
    
  }, [roundedLat, roundedLong, lastUpdate]);

  if (!activeAnnouncement || !showAnnouncements) return null; 

  const getBannerColor = () => {
    switch (activeAnnouncement.priority) {
      case "high":
        return "#E63946"; 
      case "medium":
        return "#F4A261"; 
      case "low":
        return "#2A9D8F"; 
      default:
        return colors.primary; 
    }
  }; 

  return (
    <View style={[styles.announcementBanner, { top: insets.top + 15, borderLeftColor: getBannerColor() }]}>
      <View style={styles.announcementContent}>
        <View style={styles.announcementHeader}>
          <View style={styles.titleWrapper}>
            <Ionicons name="megaphone" size={16} color={getBannerColor()} style={{ marginRight: 6 }} />
            <ThemedText style={[styles.announcementTitle, { color: getBannerColor() }]} numberOfLines={1}>
              {activeAnnouncement.title}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowAnnouncements(false); 
              setDismissedAnnouncements(activeAnnouncement.$id); 
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.announcementText} numberOfLines={2}>
          {activeAnnouncement.content}
        </ThemedText>
      </View>
    </View>
  ); 
} 

const createStyles = (colors: any) => StyleSheet.create({
  announcementBanner: {
    position: "absolute", 
    left: Variables.sizes.md, 
    right: Variables.sizes.md, 
    zIndex: 100, 
    backgroundColor: colors.surface, 
    borderRadius: Variables.sizes.sm, 
    shadowColor: colors.text, 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 10, 
    elevation: 8, 
    borderLeftWidth: 5, 
  },
  announcementContent: {
    padding: Variables.sizes.md, 
  },
  announcementHeader: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: Variables.sizes.xs, 
  },
  titleWrapper: {
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1, 
    marginRight: Variables.sizes.sm, 
  },
  announcementTitle: {
    fontSize: Variables.textSizes.base, 
    fontFamily: Variables.fonts.bold, 
    flex: 1, 
  },
  announcementText: {
    fontSize: Variables.textSizes.sm, 
    color: colors.textLight, 
    lineHeight: 20, 
    fontFamily: Variables.fonts.regular, 
  },
  closeButton: {
    padding: Variables.sizes.xs, 
    backgroundColor: colors.background, 
    borderRadius: 20, 
  },
});