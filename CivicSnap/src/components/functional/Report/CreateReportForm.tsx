import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ID } from "react-native-appwrite";
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import { API } from "@/core/networking/api";
import { useAuthContext } from "@components/functional/Auth/authProvider";

// ---- Custom Design Components ---- //
import { Variables } from "@/style/theme";
import Button from "@components/design/Button/PrimaryButton";
import EditButton from "@components/design/Button/EditButton";
import ThemedText from "@components/design/Typography/ThemedText";

//---- custom functional components ----//
import LocationSearchModal from "@components/functional/Report/LocationSearchModal";

import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system/next";

import { Image } from "expo-image";

type Props = {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  zipcode: string;
  photoUri?: string;
  hasPhoto: boolean;
};

export default function CreateReportForm({
  latitude,
  longitude,
  address,
  city,
  zipcode,
  photoUri,
  hasPhoto,
}: Props) {
  const router = useRouter();
  const { user } = useAuthContext();

  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string; keywords?: string[] }[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    keywords?: string[];
  } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(
    photoUri || null,
  );
  const [imageKey, setImageKey] = useState(0);
  const [isPhotoReport] = useState(!!photoUri);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [aiDetectedLabel, setAiDetectedLabel] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const [hasAnalyzedInitial, setHasAnalyzedInitial] = useState(false);

  const [currentLatitude, setCurrentLatitude] = useState(latitude);
  const [currentLongitude, setCurrentLongitude] = useState(longitude);
  const [currentAddress, setCurrentAddress] = useState(address);
  const [currentCity, setCurrentCity] = useState(city);
  const [currentZipcode, setCurrentZipcode] = useState(zipcode);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await API.database.listDocuments(
          API.config.databaseId,
          API.config.categoriesCollectionId,
        );
        const mapped = response.documents.map((doc: any) => ({
          id: doc.$id,
          name: doc.name,
          keywords: doc.keywords || [],
        }));
        setCategories(mapped);
        if (mapped.length > 0) {
          setSelectedCategory(mapped[0]);
        }
      } catch (error) {
        console.error("Can't fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

 useEffect(() => {
    const analyzeInitialPhoto = async () => {
      if (photoUri && categories.length > 0 && !hasAnalyzedInitial) {
        setHasAnalyzedInitial(true);
        try {
          const file = new File(photoUri);
          const base64 = await file.base64();
          await analyzeImageWithAI(base64);
        } catch (error) {
          console.log("Error analyzing initial photo:", error);
        }
      }
    };
    analyzeInitialPhoto();
  }, [photoUri, categories, hasAnalyzedInitial]);

  const mapVisionDataToCategory = (
    annotations: any[],
    availableCategories: any[],
  ) => {
    for (const annotation of annotations) {
      const label = annotation.description.toLowerCase();
      const score = Math.round(annotation.score * 100);

      for (const category of availableCategories) {
        if (category.keywords && category.keywords.length > 0) {
          const isMatch = category.keywords.some((keyword: string) => {
            const words = keyword.split(',').map(w => w.trim().toLowerCase());
            return words.some(word => word !== "" && (label.includes(word) || word.includes(label)));
        });
          
          if (isMatch) return { category: category, confidence: score };
        }
    }
  }

  const fallback = availableCategories.find(cat => cat.name.toLowerCase().includes("ander"));
    
    return { category: fallback || null, confidence: 1 };
};
   

  const analyzeImageWithAI = async (base64String: string) => {
    setIsAnalyzing(true);
    setAiDetectedLabel(null);
    setAiConfidence(0);

    try {
      const apiKey = API.config.googleMapsApiKey;
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64String },
                features: [{ type: "LABEL_DETECTION", maxResults: 10 }],
              },
            ],
          }),
        },
      );

      const data = await response.json();

      if (data.responses && data.responses[0].labelAnnotations) {
        const annotations = data.responses[0].labelAnnotations;

        let currentCats = categories;
        if (currentCats.length === 0) {
            const res = await API.database.listDocuments(API.config.databaseId, API.config.categoriesCollectionId);
            currentCats = res.documents.map((doc: any) => ({
                id: doc.$id, name: doc.name, keywords: doc.keywords || []
            }));
            setCategories(currentCats);
        }

        const matchResult = mapVisionDataToCategory(annotations, currentCats);
        if (matchResult && matchResult.category) {
          setSelectedCategory(matchResult.category);
          setAiDetectedLabel(matchResult.category.name);
          setAiConfidence(matchResult.confidence);
        } else {
          console.log("Geen bijpassende categorie gevonden in de database.");
        }
      }
    } catch (error) {
      console.error("AI Analyse error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    let result;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    };

    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission denied",
          "Camera access is required to take a photo.",
        );
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission denied",
          "Media library access is required to select a photo.",
        );
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const originalUri = result.assets[0].uri;
      const base64Data = result.assets[0].base64;

      const newFileName = `photo_${Date.now()}.jpg`;
      const source = new File(originalUri);
      const destination = new File(Paths.cache, newFileName);

      try {
        source.copy(destination);
        setLocalPhotoUri(destination.uri);
        setImageKey((prev) => prev + 1);

        if (base64Data) {
          await analyzeImageWithAI(base64Data);
        }
      } catch (e) {
        setLocalPhotoUri(originalUri);
        setImageKey((prev) => prev + 1);
      }
    } else {
      console.log("Selection canceled or no assets returned:");
    }
  };

  const handleSubmit = async () => {
    if (!description) {
      Alert.alert("Error", "Please enter a short description.");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a report.");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category.");
      return;
    }
    setLoading(true);
    try {
      let uploadedPhotoUri = "";
      if (localPhotoUri) {
        try {
          const type = localPhotoUri.endsWith(".png")
            ? "image/png"
            : "image/jpeg";
          const file = {
            uri: localPhotoUri,
            name: `report_${Date.now()}.jpg`,
            type: type,
            size: 0,
          };

          const uploaded = await API.storage.createFile(
            API.config.storageBucketId,
            ID.unique(),
            file as any,
          );

          const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
          const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
          const bucketId = API.config.storageBucketId;
          const fileId = uploaded.$id;

          uploadedPhotoUri = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
        } catch (uploadError) {
          Alert.alert(
            "Upload failed",
            "The photo could not be processed. Please try again.",
          );
          setLoading(false);
          return;
        }
      }

      let matchedOrgId = null;
      try{
        const orgsResponse = await API.database.listDocuments(
          API.config.databaseId,
          API.config.organizationsCollectionId,
        );

        const findOrg = orgsResponse.documents.find((org: any) => 
          org.zip_codes && org.zip_codes.includes(currentZipcode)
        );

        if(findOrg) {
          matchedOrgId = findOrg.$id;

        } else {
          console.log("No matching organization found for zipcode:", currentZipcode);
        }
      } catch(orgError) {
        console.error("Error fetching organizations:", orgError);

      }
      

      await API.database.createDocument(
        API.config.databaseId,
        API.config.reportsCollectionId,
        ID.unique(),
        {
          user_id: user.id,
          description: description,
          category_id: selectedCategory.id,
          address: currentAddress,
          city: currentCity,
          zip_code: currentZipcode,
          location_lat: currentLatitude,
          location_long: currentLongitude,
          status: "new",
          is_duplicate: false,
          points_awarded: 0,
          ai_detected_category: aiDetectedLabel ? aiDetectedLabel.substring(0, 50) : null,
          ai_confidence: aiConfidence > 0 ? aiConfidence : null,
          organization_id: matchedOrgId,
          ...(uploadedPhotoUri ? { photo_url: uploadedPhotoUri } : {}),
        },
      );
      Alert.alert(
        "Melding succesvol aangemaakt!",
        "Bedankt voor je bijdrage aan een betere leefomgeving.",
      );
      router.push("/(app)/(tabs)/home");
    } catch (error) {
      console.error("Error creating report:", error);
      Alert.alert(
        "Error",
        "Er is een fout opgetreden bij het aanmaken van de melding. Probeer het later opnieuw.",
      );
    } finally {
      setLoading(false);
    }
  };

 return (
    <View  style={styles.formCard}>
      {(hasPhoto || localPhotoUri) &&
        (localPhotoUri ? (
          <View style={styles.photoPreviewContainer}>
            <Image
              source={{ uri: localPhotoUri }}
              style={styles.photoPreviewImage}
              key={imageKey}
              contentFit="cover"
              cachePolicy="none"
            />

            {isAnalyzing && (
              <View style={styles.aiBadgeAnalyzing}>
                  <ActivityIndicator size="small" color="white" style={styles.aiBadgeIcon} />
                  <ThemedText style={styles.aiBadgeText}>AI analyseert...</ThemedText>
              </View>
            )}
            
            {!isAnalyzing && aiDetectedLabel !== null && (
  <View style={styles.aiBadgeCenterWrapper}>
    <View style={styles.aiBadgeSuccess}>
      <Ionicons name="sparkles" size={14} color="white" style={styles.aiBadgeIcon} />
      <ThemedText style={styles.aiBadgeText}>
        AI: {aiDetectedLabel} {aiConfidence ? `(${aiConfidence}%)` : ''} herkend
      </ThemedText>
    </View>
  </View>
)}
            <TouchableOpacity
              style={styles.deleteButtonTouchable}
              onPress={() => {setLocalPhotoUri(null); setAiDetectedLabel(null); setAiConfidence(0);}}
            >
              <Image
                style={styles.deleteButtonImage}
                source={require("@assets/icons/Delete-Button.png")}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyPhotoContainer}>
            <ThemedText style={styles.emptyPhotoText}>
              Voeg een foto toe (optioneel)
            </ThemedText>
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={() => pickImage(true)}
              >
                <Ionicons
                  name="camera"
                  size={22}
                  style={styles.icon}
                />
                <ThemedText style={styles.iconLabel}>
                  Camera
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={() => pickImage(false)}
              >
                <Ionicons
                  name="image"
                  size={22}
                  style={styles.icon}
                />
                <ThemedText style={styles.iconLabel}>
                  Galerij
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}

      <View style={styles.inputGroup}>
        <View style={styles.row}>
          <ThemedText style={styles.locationLabel}>Locatie: </ThemedText>
          <ThemedText style={styles.locationInfo} numberOfLines={1}>
            {currentAddress}, {currentZipcode} {currentCity}
          </ThemedText>
          <View style={styles.editButtonWrapper}>
            <EditButton onPress={() => setLocationModalVisible(true)} />
          </View>
        </View>
      </View>

      <View style={[styles.inputGroup, styles.categoryGroup]}>
        <ThemedText style={styles.categoryLabel}>Categorie</ThemedText>
        <TouchableOpacity
          style={styles.dropdownSelector}
          onPress={() => setDropdownOpen(!dropdownOpen)}
          activeOpacity={0.7}
        >
          <ThemedText>
            {selectedCategory ? selectedCategory.name : "Laden..."}
          </ThemedText>
          <Ionicons
            name={dropdownOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={Variables.colors.textLight}
          />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownList}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedCategory(cat);
                  setDropdownOpen(false);
                  setAiDetectedLabel(null);
                  setAiConfidence(0);
                }}
              >
                <ThemedText>{cat.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TextInput
        style={styles.textArea}
        placeholder="Typ hier extra info..."
        multiline
        numberOfLines={6}
        value={description}
        onChangeText={setDescription}
        onFocus={() => setDropdownOpen(false)}
      />

      <Button
        onPress={handleSubmit}
        disabled={loading}
        style={styles.submitButton}
      >
        {loading ? "BEZIG MET VERSTUREN..." : "VERSTUREN"}
      </Button>

      <LocationSearchModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onLocationSelect={(data) => {
          setCurrentLatitude(data.latitude);
          setCurrentLongitude(data.longitude);
          setCurrentAddress(data.address);
          setCurrentCity(data.city);
          setCurrentZipcode(data.zipcode);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Photo preview ---
  photoPreviewContainer: {
    width: "100%",
    height: 200,
    marginBottom: Variables.sizes.lg,
    borderRadius: 12,
    overflow: "visible",
  },
  photoPreviewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },

  // --- AI badges ---
  aiBadgeAnalyzing: {
    position: "absolute",
    bottom: 15,
    left: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
 aiBadgeCenterWrapper: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    alignItems: "center",
},
aiBadgeSuccess: {
    backgroundColor: Variables.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Variables.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
},
  aiBadgeText: {
    color: Variables.colors.textInverse,
    fontSize: Variables.textSizes.sm - 2,
    fontWeight: "bold",
  },
  aiBadgeIcon: {
    marginRight: 6,
  },

  // --- Delete button ---
  deleteButtonTouchable: {
    position: "absolute",
    top: -15,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: Variables.colors.textInverse,
    borderWidth: 1,
    borderColor: Variables.colors.textLight,
    padding: 5,
    zIndex: 10,
  },
  deleteButtonImage: {
    position: "absolute",
    width: 25,
    height: 25,
    top: 0,
    right: 0,
    marginRight: 7,
    marginTop: 7,
    borderRadius: 30,
    zIndex: 10,
  },

  // --- Empty photo ---
  emptyPhotoContainer: {
    width: "100%",
    padding: 20,
    marginBottom: Variables.sizes.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Variables.colors.primary,
    borderStyle: "dashed",
    alignItems: "center",
    backgroundColor: Variables.colors.background,
  },
  emptyPhotoText: {
    marginBottom: 12,
    color: Variables.colors.textLight,
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Variables.colors.textInverse,
    borderWidth: 1,
    borderColor: Variables.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: Variables.sizes.md,
    borderRadius: Variables.sizes.sm,
  },
  icon: {
    color: Variables.colors.primary,
  },
  iconLabel: {
    marginLeft: Variables.sizes.sm,
    color: Variables.colors.primary,
    fontWeight: "bold",
  },

  // --- Form card ---
  formCard: {
    position: "relative",
    width: "100%",
    backgroundColor: Variables.colors.background,
    zIndex: 50,
    top: -40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderRadius: 20,
    padding: Variables.sizes.lg,
    marginBottom: 40,
  },

  // --- Inputs ---
  inputGroup: {
    marginBottom: Variables.sizes.lg,
  },
  categoryGroup: {
    zIndex: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "98%",
  },
  editButtonWrapper: {
    top: -10,
  },
  locationLabel: {
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.md,
  },
  locationInfo: {
    flex: 1,
    marginLeft: Variables.sizes.xs,
  },
  categoryLabel: {
    marginBottom: Variables.sizes.sm,
    fontFamily: Variables.fonts.semibold,
    fontSize: Variables.textSizes.md,
  },

  // --- Dropdown ---
  dropdownSelector: {
    borderWidth: 1,
    borderColor: Variables.colors.textLight,
    borderRadius: Variables.sizes.sm,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Variables.colors.textInverse,
  },
  dropdownList: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    backgroundColor: Variables.colors.textInverse,
    borderWidth: 1,
    borderColor: Variables.colors.textLight,
    borderRadius: Variables.sizes.sm,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Variables.colors.textLight,
  },

  // --- Text area ---
  textArea: {
    borderWidth: 1,
    borderColor: Variables.colors.textLight,
    borderRadius: 12,
    padding: Variables.sizes.md,
    height: 120,
    textAlignVertical: "top",
    marginBottom: Variables.sizes.lg,
    fontFamily: Variables.fonts.regular,
    fontSize: Variables.textSizes.base,
    backgroundColor: Variables.colors.textInverse,
  },

  // --- Submit ---
  submitButton: {
    width: "100%",
  },
});