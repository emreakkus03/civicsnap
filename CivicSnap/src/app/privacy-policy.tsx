import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import BackButton from "@components/design/Button/BackButton";
import { Variables } from "@style/theme";

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <View style={styles.backButtonWrapper}>
                    <BackButton />
                </View>
                <Text style={styles.headerTitle}>Privacybeleid</Text>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={styles.lastUpdated}>Laatst bijgewerkt op: 11 juni 2026</Text>

                <Text style={styles.intro}>
                    Welkom bij CivicSnap! Wij hechten veel waarde aan jouw privacy en de bescherming van jouw persoonsgegevens. Dit beleid is opgesteld in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG/GDPR). CivicSnap is uitsluitend bedoeld voor gebruikers van 16 jaar en ouder.
                </Text>

                <Text style={styles.sectionTitle}>1. Welke persoonsgegevens wij verzamelen</Text>
                <Text style={styles.paragraph}>Wij verzamelen en verwerken de volgende gegevens:</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Account & Profiel:</Text> Naam, e-mailadres, wachtwoord en (optioneel) je profielfoto.</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Locatiegegevens:</Text> Om problemen accuraat te melden, vragen wij uitdrukkelijke toestemming tot de GPS-locatie van je apparaat.</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Media (Camera & Galerij):</Text> Foto's die je uploadt bij een melding of als profielfoto via de camera of fotogalerij.</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Communicatie:</Text> Berichten die via de interne chatfunctie tussen jou en de gemeente worden uitgewisseld.</Text>
                {/* 🔥 HIER IS DE NIEUWE NOTIFICATIE BULLET 🔥 */}
                <Text style={styles.bullet}>• <Text style={styles.bold}>Pushnotificaties:</Text> Om je op de hoogte te houden van statusupdates over jouw meldingen of nieuwe chatberichten, vragen we toestemming om pushnotificaties te sturen. Je kunt deze te allen tijde in- of uitschakelen via de instellingen van je telefoon.</Text>

                <Text style={styles.sectionTitle}>2. Zichtbaarheid en Delen van gegevens</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Publieke Kaart:</Text> Jouw meldingen (inclusief foto, beschrijving, AI-label en status) zijn anoniem zichtbaar voor andere gebruikers op de openbare kaart. Jouw persoonlijke accountgegevens worden hierbij verborgen voor medeburgers.</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>De Gemeente:</Text> De gemeente ontvangt via ons afgeschermde dashboard wél de volledige melding, inclusief de exacte locatie en jouw naam als melder, om het probleem efficiënt te kunnen verhelpen of contact met je op te nemen via de chat.</Text>
                <Text style={styles.bullet}>• <Text style={styles.bold}>Externe API's:</Text> Wij maken gebruik van Google Maps (Android) en Apple Maps (iOS) voor kaartweergave, en de Google Cloud Vision API om meldingen via AI in categorieën in te delen. Foto's worden niet permanent door Google opgeslagen.</Text>

                <Text style={styles.sectionTitle}>3. Dataminimalisatie en Bewaartermijnen</Text>
                <Text style={styles.paragraph}>
                    Alle gegevens (waaronder meldingen, verzamelde XP, diamanten en coupons) worden veilig in onze database opgeslagen om jouw in-app voortgang te behouden en de gemeente inzicht te geven in de oploshistorie. In jouw eigen profiel tonen wij de meldingen van de afgelopen 3 maanden. Je persoonsgegevens blijven bewaard zolang je account actief is. Zodra je jouw account via de instellingen in de app verwijdert, worden je persoonsgegevens gewist conform de AVG.
                </Text>

                <Text style={styles.sectionTitle}>4. Jouw Rechten</Text>
                <Text style={styles.paragraph}>
                    Je hebt te allen tijde het recht om je gegevens in te zien of te corrigeren. Daarnaast bieden wij in de app een directe knop aan om je account en alle daaraan gekoppelde persoonlijke gegevens permanent te verwijderen.
                </Text>
                <Text style={styles.paragraph}>
                    Voor vragen over jouw privacy kun je contact met ons opnemen via: privacy@civicsnap.be
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Variables.colors.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Variables.sizes.md,
        paddingVertical: Variables.sizes.sm,
        backgroundColor: Variables.colors.background,
    },
    backButtonWrapper: {
        top: 15,
        left: 5,
        zIndex: 10,
        transform: [{ scale: 1.5 }],
    },
    headerTitle: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.xl,
        color: Variables.colors.text,
    },
    content: {
        padding: Variables.sizes.md,
    },
    lastUpdated: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.sm,
        color: Variables.colors.textLight,
        marginBottom: Variables.sizes.md,
    },
    intro: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.base,
        color: Variables.colors.text,
        lineHeight: 22,
        marginBottom: Variables.sizes.md,
    },
    sectionTitle: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.md,
        color: Variables.colors.text,
        marginTop: Variables.sizes.md,
        marginBottom: Variables.sizes.sm,
    },
    paragraph: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.base,
        color: Variables.colors.text,
        lineHeight: 22,
        marginBottom: Variables.sizes.sm,
    },
    bullet: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.base,
        color: Variables.colors.text,
        lineHeight: 22,
        marginBottom: Variables.sizes.sm,
        paddingLeft: Variables.sizes.xs,
    },
    bold: {
        fontFamily: Variables.fonts.bold,
    },
});