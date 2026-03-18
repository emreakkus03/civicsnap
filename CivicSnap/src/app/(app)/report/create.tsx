import React from "react";
import { View,StyleSheet, ScrollView, TouchableOpacity} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import BackButton from "@components/design/Button/BackButton";

// ---- Custom Design Components ---- //
import ThemedText from "@components/design/Typography/ThemedText";
import { Variables } from "@style/theme";

// ---- Functional Components ---- //
import CreateReportForm from "@components/functional/Report/CreateReportForm";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function CreateReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const latitude = parseFloat(params.latitude as string);
    const longitude = parseFloat(params.longitude as string);
    const address = params.address as string;
    const city = params.city as string;
    const zipcode = params.zipcode as string;
    const photoUri = params.photoUri as string;
    const hasPhoto = params.hasPhoto === "true";

    return (
    <KeyboardAwareScrollView 
  style={styles.container} 
  bounces={false}
  enableOnAndroid={true}
  extraScrollHeight={80}
  keyboardShouldPersistTaps="handled"
>
      
      <View style={styles.blueHeader}>
         <View  style={styles.backButtonWrapper}>
            <BackButton color="white" />
         </View>
         <ThemedText type="subtitle" color="inverse" style={styles.title}>
            Melding controleren
         </ThemedText>
      </View>

      
      <CreateReportForm 
        latitude={latitude} 
        longitude={longitude} 
        address={address} 
        city={city} 
        zipcode={zipcode} 
        photoUri={photoUri}
        hasPhoto={hasPhoto}
      />
      
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Variables.colors.background 
  },
  blueHeader: {
    backgroundColor: Variables.colors.header, 
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
 backButtonWrapper: {
    position: 'absolute', 
    left: 20,          
    zIndex: 10,           
    marginTop: 30,
    transform: [{ scale: 1.5 }], 
    padding: 5, 
  },
title: {
  fontFamily: Variables.fonts.bold,
  fontSize: Variables.textSizes.lg,
  textAlign: 'center',
},
});