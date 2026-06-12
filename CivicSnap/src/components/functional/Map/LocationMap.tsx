import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

//--- Components ---
import ReportPopupScreen from "@components/functional/Report/ReportPopupScreen";
import AnnouncementBanner from "@components/functional/Announcements/AnnouncementBanner";

import ReportMarkers from "@components/functional/Report/ReportMarkers";

import { API } from "@core/networking/api";

// --- Theme styling ---
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";
import { Colors } from "@style/theme";

export default function LocationMap() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  const [targetLocation, setTargetLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportPopupVisible, setReportPopupVisible] = useState(false);

  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [hasPanned, setHasPanned] = useState(false);

  const router = useRouter();

  const mapRef = React.useRef<MapView>(null);

  const insets = useSafeAreaInsets();
  const colors = useThemeColors();                                       
  const styles = createStyles(colors);
const isDarkMode = colors.background === Colors.dark.background;

  const DEFAULT_REGION = {
    latitude: 51.0956,
    longitude: 4.1642,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Toestemming voor locatie toegang geweigerd");
          setLoading(false);
          return;
        }

        let lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          setLocation(lastKnown);
        }

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(resolve, 10000),
        );

        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const currentLocation = (await Promise.race([
          locationPromise,
          timeoutPromise,
        ])) as Location.LocationObject;

        setLocation(currentLocation);
        setTargetLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        mapRef.current?.animateToRegion(
          {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        );
      } catch (error: any) {
        if (error.message === "TIMEOUT") {
          setErrorMsg(
            "Locatie zoeken duurt te lang. Probeer het buiten of check je verbinding.",
          );
        } else {
          setErrorMsg("Er ging iets mis bij het bepalen van je locatie.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, []);

  const handleAddNote = async (photoUri?: string) => {
    if (!targetLocation) {
      alert("We couldn't get your location. Please try again.");
      return;
    }

    setReportPopupVisible(false);
    let address = "Unknown address";
    let city = "";
    let zipcode = "";

    try {
      const APIKey = API.config.googleMapsApiKey;

      if (APIKey) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${targetLocation.latitude},${targetLocation.longitude}&key=${APIKey}`,
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const addressComponents = data.results[0].address_components;
          let street = "";
          let number = "";

          addressComponents.forEach((component: any) => {
            if (component.types.includes("route")) street = component.long_name;
            if (component.types.includes("street_number"))
              number = component.long_name;
            if (component.types.includes("locality"))
              city = component.long_name;
            if (component.types.includes("postal_code"))
              zipcode = component.long_name;
          });

          address = `${street} ${number}`.trim();
          if (!address) address = "Unknown street";
        }
      }
    } catch (error) {
      console.error("Error fetching address from Google Maps API:", error);
      address = "Unknown address";
    }
    router.push({
      pathname: "/(app)/report/create" as any,
      params: {
        latitude: targetLocation?.latitude,
        longitude: targetLocation?.longitude,
        address,
        city,
        zipcode,
        photoUri: photoUri || "",
        hasPhoto: photoUri ? "true" : "false",
      },
    });
  };

  const handleOpenCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Camera access is required to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      handleAddNote(result.assets[0].uri);
    }
  };

  const handleOpenGallery = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Gallery access is required to select a photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      handleAddNote(result.assets[0].uri);
    }
  };

  const goToMyLocation = () => {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
      setHasPanned(false);
    }
  };

  return (
    <View style={styles.container}>
      {location && (
        <AnnouncementBanner 
          location_lat={location.coords.latitude} 
          location_long={location.coords.longitude} 
        />
      )}
      <MapView
      key={isDarkMode ? "dark-map-force" : "light-map-force"}
        ref={mapRef}
        style={styles.map}
        userInterfaceStyle={isDarkMode ? "dark" : "light"}
        customMapStyle={isDarkMode ? darkMapStyle : []}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        initialRegion={DEFAULT_REGION}
        showsUserLocation={true}
        showsMyLocationButton={true}
        toolbarEnabled={false}
        onPress={() => setSelectedReport(null)}
        mapPadding={{
          top: 20,
          right: 0,
          bottom: 0,
          left: 0,
        }}

        onPanDrag={() => setHasPanned(true)}
       onRegionChange={(region, details) => {
          
          if (details?.isGesture) {
            setHasPanned(true);
          }
        }}
        onRegionChangeComplete={(region, details) => {
          setTargetLocation({
            latitude: region.latitude,
            longitude: region.longitude,
          });

          if (details && details.isGesture === false) {
            setHasPanned(false);
          }
        }}
      >
        {location && (
          <ReportMarkers 
            location_lat={location.coords.latitude} 
            location_long={location.coords.longitude} 
           onReportPress={(report) => setSelectedReport(report)}
          />
        )}
      </MapView>
      {Platform.OS === "ios" && (
      <TouchableOpacity
        style={[styles.locationButton, {  top: insets.top + 10 }]}
        onPress={goToMyLocation}
      >
        <Ionicons name="locate" size={24} color={colors.primary} />
      </TouchableOpacity>
      )}
      {hasPanned && (
      <View style={styles.centerPinContainer} pointerEvents="none">
        <Image 
          
          source={require("@assets/icons/Indicator.png")} 
          style={styles.centerPinImage} 
        />
      </View>
      )}
      {!selectedReport && (
        <TouchableOpacity
          style={[styles.plus, { bottom: insets.bottom + 0 }]}
          onPress={() => setReportPopupVisible(true)}
          activeOpacity={0.8}
        >
          <Image
            source={require("@assets/icons/Plus-Circle.png")}
            style={styles.plusImage}
          />
        </TouchableOpacity>
      )}

      {/* NIEUW: De Bottom Sheet die verschijnt bij een klik op een pin */}
      {/* De Bottom Sheet die verschijnt bij een klik op een pin */}
      {selectedReport && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
          
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetCategory}>
                {selectedReport.category_name || "Algemene Melding"}
              </Text>
              <Text style={styles.sheetStatus}>
                {selectedReport.status === "new" ? "Nieuw" : 
                 selectedReport.status === "in_progress" ? "In behandeling" : 
                 selectedReport.status === "approved" ? "Goedgekeurd" : selectedReport.status}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setSelectedReport(null)} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>

      
          {selectedReport.photo_url && (
            <Image 
              source={{ uri: selectedReport.photo_url }} 
              style={styles.sheetImage} 
            />
          )}

         
          <View style={styles.addressRow}>
            <Image 
              source={require("@assets/icons/ReportPinMarker.png")} 
              style={styles.addressIcon} 
            />
            <Text style={styles.sheetAddress}>
              {selectedReport.address || "Adres onbekend"}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => router.push(`/(app)/report/${selectedReport.$id}` as any)}
          >
            <Text style={styles.detailButtonText}>Bekijk volledige details</Text>
          </TouchableOpacity>
        </View>
      )}

      <ReportPopupScreen
        visible={reportPopupVisible}
        onClose={() => setReportPopupVisible(false)}
        onCameraPress={handleOpenCamera}
        onGalleryPress={handleOpenGallery}
        onNotePress={() => handleAddNote()}
      />
      {loading && !location && (
        <View style={styles.overlayCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Locatie laden...</Text>
        </View>
      )}
      {errorMsg && (
        <View style={styles.gdprWarning}>
          <Text style={styles.gdprText}>Locatie gedeeld: Nee</Text>
        </View>
      )}
    </View>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  map: {
    flex: 1,
  },
  markerImage: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  loadingContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorContainer: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffebee",
    borderRadius: 16,
    marginTop: 20,
  },
  errorText: {
    color: "red",
  },
  copyright: {
    position: "absolute",
    bottom: 5,
    right: 5,
    fontSize: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 2,
    borderRadius: 4,
  },

  plus: {
    position: "absolute",
    right: 10,
    backgroundColor: "transparent",
    shadowColor: colors.text || "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  plusImage: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  overlayCenter: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  gdprWarning: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(255,0,0,0.7)",
    padding: 5,
    borderRadius: 5,
  },
  gdprText: { color: "white", fontSize: 12 },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20, 
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sheetCategory: {
    fontSize: Variables.textSizes.lg,
    fontFamily: Variables.fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  sheetStatus: {
    fontSize: Variables.textSizes.sm,
    fontFamily: Variables.fonts.bold,
    color: colors.primary, 
    textTransform: "uppercase",
  },
  closeButton: {
    padding: 4,
    backgroundColor: colors.background,
    borderRadius: 20,
  },
  sheetAddress: {
    fontSize: Variables.textSizes.base,
    fontFamily: Variables.fonts.bold,
    color: colors.textLight,
  },
  detailButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  detailButtonText: {
    color: colors.textInverse,
    fontSize: Variables.textSizes.base,
    fontFamily: Variables.fonts.bold,
  },
  sheetImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#E0E0E0",
    resizeMode: "cover",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  addressIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    resizeMode: "contain",
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -50,  
    zIndex: 10,
  },
  centerPinImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  locationButton: {
    position: "absolute",
    right: 15,
    backgroundColor: colors.surface,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
});
