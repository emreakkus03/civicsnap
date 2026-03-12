import { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import {Query} from "react-native-appwrite";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {API} from "@core/networking/api";
import { Variables } from "@style/theme";
import ThemedText from "@components/design/Typography/ThemedText";

import {useRealtime} from "@core/modules/realtimeProvider/RealtimeProvider";


type Props = {
    location_lat: number;
    location_long: number;
};

export default function AnnouncementBanner({ location_lat, location_long }: Props) {
    const [activeAnnouncement, setActiveAnnouncement] = useState<any | null>(null);
    const [showAnnouncements, setShowAnnouncements] = useState(true);
    const insets = useSafeAreaInsets();
    const { lastUpdate } = useRealtime();

    useEffect(() => {
        if (!location_lat && !location_long) {
            return;
        };

        const fetchLocalAnnouncements = async () => {
            try {
                const APIKey = await API.config.googleMapsApiKey;
                if (!APIKey) {
                    return;
                }

                const geoResponse = await fetch (
                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location_lat},${location_long}&key=${APIKey}`
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
            Query.limit(1)
          ]
        );

        if (announcementsResponse.documents.length > 0) {
       
          setActiveAnnouncement(announcementsResponse.documents[0]);
          setShowAnnouncements(true); 
        } else {
         
          setActiveAnnouncement(null);
          
        }
            } catch (error) {
                console.error("Fout bij ophalen lokale aankondigingen:", error);
            }
        };

        fetchLocalAnnouncements();
    }, [location_lat, location_long, lastUpdate]);


    if (!activeAnnouncement || !showAnnouncements) return null;

    const getBannerColor = () => {
        switch (activeAnnouncement.priority) {
            case "high": return "#E63946"; 
            case "medium": return "#F4A261"; 
            case "low": return "#2A9D8F";
            default: return Variables.colors.primary;
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
          <TouchableOpacity onPress={() => setShowAnnouncements(false)} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={Variables.colors.textLight} />
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.announcementText} numberOfLines={2}>
          {activeAnnouncement.content}
        </ThemedText>
        
      </View>
    </View>
    )
};

const styles = StyleSheet.create({
  announcementBanner: {
    position: 'absolute',
    left: Variables.sizes.md,
    right: Variables.sizes.md,
    zIndex: 100, 
    backgroundColor: Variables.colors.surface,
    borderRadius: Variables.sizes.sm,
    shadowColor: Variables.colors.text,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Variables.sizes.xs,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: Variables.colors.textLight,
    lineHeight: 20,
    fontFamily: Variables.fonts.regular,
  },
  closeButton: {
    padding: Variables.sizes.xs,
    backgroundColor: Variables.colors.background,
    borderRadius: 20,
  },
});

