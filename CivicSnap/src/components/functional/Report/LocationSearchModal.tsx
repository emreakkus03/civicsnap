import { Modal, View, StyleSheet, TouchableOpacity } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";

// --- Theme styling ---
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";
import ThemedText from "@components/design/Typography/ThemedText";


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

  const colors = useThemeColors();                                       
  const styles = createStyles(colors);
  
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
            <Ionicons name="close" size={20} color={colors.textInverse} />
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
              description: { color: colors.text }
            }}
            textInputProps={{
              placeholderTextColor: colors.textLight,
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blueHeader: {
    backgroundColor: colors.header,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backButtonWrapper: {
    position: "absolute",
    left: 20,
    top: 55, 
    zIndex: 10,
    transform: [{ scale: 1.5 }],
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface, 
    borderRadius: Variables.sizes.sm,
    paddingHorizontal: 15,
    fontSize: Variables.textSizes.base,
    borderWidth: 1,
    borderColor: colors.border, 
    fontFamily: Variables.fonts.regular,
    color: colors.text,
  } as any,
  searchListView: {
    backgroundColor: colors.surface, 
    borderRadius: Variables.sizes.sm,
    marginTop: Variables.sizes.xs,
  },
  searchRow: {
    paddingVertical: 14,
    backgroundColor: colors.surface, 
  },
});