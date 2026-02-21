import { Modal, View, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";

// --- Theme styling ---
import { Variables } from "@style/theme";
import ThemedText from "@components/design/Typography/ThemedText";
import BackButton from "@components/design/Button/BackButton";

import { API } from "@/core/networking/api";

type LocationSearchModalData = {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  zipcode: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (data: LocationSearchModalData) => void;
};

export default function LocationSearchModal({
  visible,
  onClose,
  onLocationSelect,
}: Props) {
  const handleSelect = (data: any, details: any) => {
    if (!details) {
      return;
    }

    const lat = details.geometry.location.lat;
    const lng = details.geometry.location.lng;

    let street = "";
    let number = "";
    let city = "";
    let zipcode = "";

    details.address_components.forEach((component: any) => {
      const types = component.types;
      if (types.includes("route")) street = component.long_name;
      if (types.includes("street_number")) number = component.long_name;
      if (types.includes("locality")) city = component.long_name;
      if (types.includes("postal_code")) zipcode = component.long_name;
    });

    const address = `${street} ${number}`.trim() || "Unknown street";

    onLocationSelect({
      latitude: lat,
      longitude: lng,
      address: address,
      city: city,
      zipcode: zipcode,
    });
    onClose();
  };

 return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.blueHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backButtonWrapper} >
            <Ionicons name="close" size={20} color={Variables.colors.textInverse} />
          </TouchableOpacity>
          <ThemedText type="subtitle" color="inverse" style={styles.title}>
            Locatie zoeken
          </ThemedText>
        </View>

        <View style={styles.searchContainer}>
          <GooglePlacesAutocomplete
            debounce={300}
            minLength={3}
            placeholder="Zoek een locatie..."
            fetchDetails={true}
            onPress={handleSelect}
            query={{
              key: API.config.googleMapsApiKey,
              language: "nl",
              components: "country:be",
            }}
            enablePoweredByContainer={false}
            keyboardShouldPersistTaps="handled"
            listViewDisplayed="auto"
            keepResultsAfterBlur={true}
            styles={{
              textInput: styles.searchInput,
              listView: styles.searchListView,
              row: styles.searchRow,
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Variables.colors.background,
  },
  blueHeader: {
    backgroundColor: Variables.colors.header,
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.lg,
    paddingTop: 35,
    paddingBottom: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backButtonWrapper: {
    position: "absolute",
    color: Variables.colors.textInverse,
    left: 30,
    top: 38,
    zIndex: 10,
    transform: [{ scale: 1.7 }],
    padding: 5,
  },
  title: {
    fontFamily: Variables.fonts.bold,
    fontSize: Variables.textSizes.lg,
    textAlign: "center",
  },
  searchContainer: {
     position: "relative",
    width: "100%",
    backgroundColor: Variables.colors.background,
    top: -40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderRadius: 20,
    marginBottom: 40,
    flex: 1,
    padding: Variables.sizes.lg,
    zIndex: 10,
  },
  searchInput: {
    height: 50,
    backgroundColor: Variables.colors.textInverse,
    borderRadius: Variables.sizes.sm,
    paddingHorizontal: 15,
    fontSize: Variables.textSizes.base,
    borderWidth: 1,
    borderColor: Variables.colors.textLight,
    fontFamily: Variables.fonts.regular,
  },
  searchListView: {
    backgroundColor: Variables.colors.textInverse,
    borderRadius: Variables.sizes.sm,
    marginTop: Variables.sizes.xs,
  },
  searchRow: {
    paddingVertical: 14,
  },
});