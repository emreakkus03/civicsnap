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

//--- Components ---
import ReportPopupScreen from "@components/functional/Report/ReportPopupScreen";
import AnnouncementBanner from "@components/functional/Announcements/AnnouncementBanner";

import { API } from "@core/networking/api";

// --- Theme styling ---
import { Variables } from "@/style/theme";

export default function LocationMap() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportPopupVisible, setReportPopupVisible] = useState(false);
  const router = useRouter();

  const mapRef = React.useRef<MapView>(null);

  const insets = useSafeAreaInsets();

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
    if (!location) {
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
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coords.latitude},${location.coords.longitude}&key=${APIKey}`,
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
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
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

  return (
    <View style={styles.container}>
      {location && (
        <AnnouncementBanner 
          location_lat={location.coords.latitude} 
          location_long={location.coords.longitude} 
        />
      )}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        initialRegion={DEFAULT_REGION}
        showsUserLocation={true}
        showsMyLocationButton={true}
        toolbarEnabled={false}
        mapPadding={{
          top: 20,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Uw huidige locatie"
          >
            <Image
              source={require("@assets/icons/Indicator.png")}
              style={styles.markerImage}
            />
          </Marker>
        )}
      </MapView>
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

      <ReportPopupScreen
        visible={reportPopupVisible}
        onClose={() => setReportPopupVisible(false)}
        onCameraPress={handleOpenCamera}
        onGalleryPress={handleOpenGallery}
        onNotePress={() => handleAddNote()}
      />
      {loading && !location && (
        <View style={styles.overlayCenter}>
          <ActivityIndicator size="large" color={Variables.colors.primary} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
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
    shadowColor: Variables.colors.text || "#000",
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
});
