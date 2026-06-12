import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "@components/design/Button/BackButton";
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";

export default function TermsScreen() {
              const colors = useThemeColors();
                                  
              const styles = createStyles(colors);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <View style={styles.backButtonWrapper}>
                    <BackButton />
                </View>
                <Text style={styles.headerTitle}>Gebruiksvoorwaarden</Text>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={styles.lastUpdated}>Laatst bijgewerkt op: 11 juni 2026</Text>

                <Text style={styles.intro}>
                    Welkom bij CivicSnap. Om deze app te gebruiken, moet je minimaal 16 jaar oud zijn. Door de app te downloaden en te gebruiken, ga je akkoord met de onderstaande voorwaarden. Lees deze zorgvuldig door.
                </Text>

                <Text style={styles.sectionTitle}>1. Acceptabel Gebruik & Moderatie</Text>
                <Text style={styles.paragraph}>
                    CivicSnap is ontwikkeld als een communicatiemiddel om samen de leefbaarheid en veiligheid in gemeentes te verbeteren. Je bent als gebruiker persoonlijk verantwoordelijk voor de inhoud van de meldingen die je verstuurt. Het is ten strengste verboden om de app te gebruiken voor:
                </Text>
                <Text style={styles.bullet}>• Het plaatsen van valse, misleidende of 'spam' meldingen.</Text>
                <Text style={styles.bullet}>• Het uploaden van haatdragende, illegale, of seksueel expliciete foto's.</Text>
                <Text style={styles.bullet}>• Het taggen van ongepaste content op specifieke geografische locaties.</Text>
                
                <Text style={styles.paragraph}>
                    Bij detectie van misbruik behouden wij ons het recht voor om maatregelen te nemen, zoals het verwijderen van meldingen of het beperken van een account via een zogenaamde "shadowban". Bij een shadowban ontvang je géén waarschuwing of notificatie. De app lijkt voor jou nog volledig normaal te werken, maar jouw gemaakte meldingen worden onzichtbaar gemaakt en niet langer doorgestuurd naar de gemeente.
                </Text>

                <Text style={styles.sectionTitle}>2. Eigendomsrecht & Licentie Media</Text>
                <Text style={styles.paragraph}>
                    Wanneer je een foto uploadt bij een melding, behoud jij het eigendomsrecht van deze foto. Je verleent CivicSnap en de bevoegde gemeente echter een kosteloze, permanente licentie om deze foto te gebruiken voor het documenteren, analyseren en oplossen van het gemelde probleem.
                </Text>

                <Text style={styles.sectionTitle}>3. Gamification (XP, Diamanten & Coupons)</Text>
                <Text style={styles.paragraph}>
                    CivicSnap bevat een loyaliteitssysteem waarbij gebruikers XP (voor levels) en diamanten kunnen verdienen via goedgekeurde meldingen of de "Daily Spin" minigame. Deze diamanten kunnen in de in-app shop worden ingewisseld voor kortingscoupons.
                </Text>
                <Text style={styles.paragraph}>
                    Let op: XP, diamanten en coupons hebben géén monetaire waarde, kunnen niet worden gekocht met echt geld en kunnen onder geen enkel beding worden ingewisseld voor contant geld. Wij behouden ons het recht voor om in-app beloningen of shop-aanbiedingen op elk moment te wijzigen of te beëindigen.
                </Text>

                <Text style={styles.sectionTitle}>4. Communicatie & Chat</Text>
                <Text style={styles.paragraph}>
                    De app bevat een interne chatfunctie. Deze functionaliteit is uitsluitend bedoeld voor gemeentelijke opvolging; de gemeente kan indien nodig een chat met jou initiëren. Als burger kun je geen nieuwe chat starten met de gemeente, maar wel reageren op een gestart gesprek.
                </Text>

                <Text style={styles.sectionTitle}>5. Regels omtrent het gebruik van de Kaart</Text>
                <Text style={styles.paragraph}>De interactieve kaart wordt geleverd door Google Maps en Apple Maps. Het is verboden om:</Text>
                <Text style={styles.bullet}>• Geografische data of adressen uit de app te kopiëren of te scrapen.</Text>
                <Text style={styles.bullet}>• De data van Google Maps weer te geven op diensten van derde partijen.</Text>

                <Text style={styles.sectionTitle}>6. Beperking van Aansprakelijkheid</Text>
                <Text style={styles.paragraph}>
                    CivicSnap is op geen enkele wijze verantwoordelijk voor de termijn waarbinnen een gemeente een probleem oppakt, de manier waarop een gemeente een melding oplost, of eventuele schade die voortvloeit uit onopgeloste meldingen.
                </Text>

                <Text style={styles.paragraph}>
                    Door CivicSnap te gebruiken, bevestig je dat je deze voorwaarden hebt gelezen, begrepen en ermee akkoord gaat.
                </Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Variables.sizes.md,
        paddingVertical: Variables.sizes.sm,
        backgroundColor: colors.background,
    },
    backButtonWrapper: {
        width: 40,
        top: 15,
        left: 5,
        zIndex: 10,
        transform: [{ scale: 1.5 }],
    },
    headerTitle: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.xl,
        color: colors.text,
        flex: 1,
        textAlign: "center",
    },
    content: {
        padding: Variables.sizes.md,
    },
    lastUpdated: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.sm,
        color: colors.textLight,
        marginBottom: Variables.sizes.md,
    },
    intro: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.base,
        color: colors.text,
        lineHeight: 22,
        marginBottom: Variables.sizes.md,
    },
    sectionTitle: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.md,
        color: colors.text,
        marginTop: Variables.sizes.md,
        marginBottom: Variables.sizes.sm,
    },
    paragraph: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.base,
        color: colors.text,
        lineHeight: 22,
        marginBottom: Variables.sizes.sm,
    },
    bullet: {
        fontFamily: Variables.fonts.regular,
        fontSize: Variables.textSizes.base,
        color: colors.text,
        lineHeight: 22,
        marginBottom: Variables.sizes.sm,
        paddingLeft: Variables.sizes.xs,
    },
});