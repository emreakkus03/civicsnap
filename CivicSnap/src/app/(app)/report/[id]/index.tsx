import React, { useEffect, useState } from "react"; // React hooks
import { View, StyleSheet, ScrollView, Image, ActivityIndicator, Text } from "react-native"; // React Native UI components
import { useLocalSearchParams } from "expo-router"; // Access route params
import { Ionicons } from "@expo/vector-icons"; // Timeline icons

import BackButton from "@components/design/Button/BackButton"; // Reusable back button
import ThemedText from "@components/design/Typography/ThemedText"; // Themed typography component
import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";
import { API } from "@core/networking/api"; // API client for Appwrite

import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider"; // Realtime update hook

export default function ReportDetailScreen() {
    const { id } = useLocalSearchParams(); // Get report ID from route
    const [report, setReport] = useState<any>(null); // Report state
    const [loading, setLoading] = useState(true); // Loading state

    const { lastUpdate } = useRealtime(); // Re-fetch trigger from realtime updates
    const colors = useThemeColors();
    const styles = createStyles(colors);

    // Fetch report data when screen loads or realtime updates change
    useEffect(() => {
        if (!id) return; // Guard: no ID means no fetch

        const fetchReportDetails = async () => {
            try {
                // 1) Fetch the report document
                const data = await API.database.getDocument(
                    API.config.databaseId,
                    API.config.reportsCollectionId,
                    id as string
                );

                // 2) Resolve category name (relationship object or separate category fetch)
                let fetchedCategoryName = "Probleem";
                if (data.category_id) {
                    try {
                        // If relationship is already expanded as an object
                        if (typeof data.category_id === "object" && data.category_id.name) {
                            fetchedCategoryName = data.category_id.name;
                        } else {
                            // Otherwise fetch category from categories collection
                            const categoryData = await API.database.getDocument(
                                API.config.databaseId,
                                API.config.categoriesCollectionId,
                                data.category_id
                            );
                            fetchedCategoryName = categoryData.name || "Probleem";
                        }
                    } catch (catError) {
                        console.error("Could not fetch category:", catError); // Category fetch error
                    }
                }

                // 3) Store combined report + category name in state
                setReport({ ...data, category_name: fetchedCategoryName });
            } catch (error) {
                console.error("Error while fetching report:", error); // Main fetch error
            } finally {
                setLoading(false); // Stop loading regardless of result
            }
        };

        fetchReportDetails(); // Execute async fetch
    }, [id, lastUpdate]); // Re-run on ID or realtime update

    // Loading UI
    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Fallback UI if report does not exist
    if (!report) {
        return (
            <View style={[styles.container, styles.center]}>
                <ThemedText>Melding niet gevonden.</ThemedText>
            </View>
        );
    }

    // Date formatter helper
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const reportedDate = formatDate(report.$createdAt); // Created date
    const updatedDate = formatDate(report.$updatedAt); // Last updated date

    // Timeline status helpers
    const isInProgress =
        report.status === "approved" ||
        report.status === "in_progress" ||
        report.status === "resolved";
    const isResolved = report.status === "resolved";
    const isInvalid = report.status === "invalid";

    return (
        <ScrollView style={styles.container} bounces={false}>
            {/* 1) Blue header */}
            <View style={styles.blueHeader}>
                <View style={styles.backButtonWrapper}>
                    <BackButton color="white" />
                </View>

                <View style={styles.titleContainer}>
                    <ThemedText type="subtitle" color="inverse" style={styles.title}>
                        {report.address || "Locatie onbekend"}
                    </ThemedText>

                    {/* Zip code and city on second line */}
                    {(report.zip_code || report.city) && (
                        <ThemedText color="inverse" style={styles.subCity}>
                            {report.zip_code} {report.city}
                        </ThemedText>
                    )}
                </View>
            </View>

            <View style={styles.contentPadding}>
               <View style={styles.imageContainer}>
    {report.photo_url ? (
        <>
            <Image
                source={{ uri: report.photo_url }}
                style={styles.mainImage}
            />
            <View style={styles.aiBadgeCenterWrapper}>
                <View style={styles.aiBadgeSuccess}>
                    <Ionicons
                        name="sparkles"
                        size={14}
                        color="white"
                        style={styles.aiBadgeIcon}
                    />
                    <Text style={styles.aiBadgeText}>AI: {report.category_name} herkend</Text>
                </View>
            </View>
        </>
    ) : (
        <View style={styles.noPhotoPlaceholder}>
            <Ionicons name="image-outline" size={40} color="#9CA3AF" />
            <Text style={styles.noPhotoText}>Geen foto toegevoegd</Text>
        </View>
    )}
</View>

                {/* 3) Metadata and description */}
                <Text style={styles.infoText}>
                    <Text style={{ fontFamily: Variables.fonts.bold }}>Gemeld op: </Text>
                    {reportedDate}
                </Text>

                <Text style={[styles.infoText, { fontFamily: Variables.fonts.bold, marginTop: 20 }]}>
                    Beschrijving:
                </Text>
                <Text style={styles.descriptionText}>
                    {report.description
                        ? `"${report.description}"`
                        : '"Geen beschrijving meegegeven door de melder."'}
                </Text>

                {/* 4) Timeline */}
                <View style={styles.timelineWrapper}>
                    {/* Step 1: Reported (always active) */}
                    <View style={styles.timelineRow}>
                        <View style={styles.timelineIconColumn}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    { backgroundColor: colors.primary || "#1976D2" },
                                ]}
                            >
                                <Ionicons name="document-text" size={16} color="white" />
                            </View>
                            {/* If invalid -> red line, else orange/gray */}
                            <View
                                style={[
                                    styles.verticalLine,
                                    {
                                        backgroundColor: isInvalid
                                            ? "#D32F2F"
                                            : isInProgress
                                            ? "#F57C00"
                                            : "#E0E0E0",
                                    },
                                ]}
                            />
                        </View>
                        <View style={styles.timelineTextColumn}>
                            <Text style={styles.timelineText}>
                                <Text style={{ fontFamily: Variables.fonts.bold }}>{reportedDate}</Text> - Gemeld
                            </Text>
                        </View>
                    </View>

                    {/* Invalid branch vs normal process branch */}
                    {isInvalid ? (
                        // Invalid status branch
                        <View style={styles.timelineRow}>
                            <View style={styles.timelineIconColumn}>
                                <View style={[styles.iconCircle, { backgroundColor: "#D32F2F" }]}>
                                    <Ionicons name="close" size={18} color="white" />
                                </View>
                            </View>
                            <View style={styles.timelineTextColumn}>
                                <Text style={[styles.timelineText, { color: "#D32F2F" }]}>
                                    <Text style={{ fontFamily: Variables.fonts.bold }}>{updatedDate}</Text> - Melding
                                    Afgewezen
                                </Text>
                                <Text style={[styles.descriptionText, { marginTop: 2, fontSize: 13 }]}>
                                    Deze melding is gemarkeerd als ongeldig.
                                </Text>
                            </View>
                        </View>
                    ) : (
                        // Normal process branch
                        <>
                            {/* Step 2: In progress */}
                            <View style={styles.timelineRow}>
                                <View style={styles.timelineIconColumn}>
                                    <View
                                        style={[
                                            styles.iconCircle,
                                            { backgroundColor: isInProgress ? "#F57C00" : "#E0E0E0" },
                                        ]}
                                    >
                                        <Ionicons name="build" size={16} color="white" />
                                    </View>
                                    <View
                                        style={[
                                            styles.verticalLine,
                                            { backgroundColor: isResolved ? "#388E3C" : "#E0E0E0" },
                                        ]}
                                    />
                                </View>
                                <View style={styles.timelineTextColumn}>
                                    <Text
                                        style={[
                                            styles.timelineText,
                                            !isInProgress && { color: colors.textLight },
                                        ]}
                                    >
                                        {isInProgress ? (
                                            <>
                                                <Text style={{ fontFamily: Variables.fonts.bold }}>
                                                    {!isResolved ? `${updatedDate} - ` : ""}
                                                </Text>
                                                In behandeling genomen
                                            </>
                                        ) : (
                                            "In behandeling genomen"
                                        )}
                                    </Text>
                                </View>
                            </View>

                            {/* Step 3: Resolved */}
                            <View style={styles.timelineRow}>
                                <View style={styles.timelineIconColumn}>
                                    <View
                                        style={[
                                            styles.iconCircle,
                                            { backgroundColor: isResolved ? "#388E3C" : "#E0E0E0" },
                                        ]}
                                    >
                                        <Ionicons name="checkmark" size={18} color="white" />
                                    </View>
                                </View>
                                <View style={styles.timelineTextColumn}>
                                    <Text
                                        style={[
                                            styles.timelineText,
                                            !isResolved && { color: colors.textLight },
                                        ]}
                                    >
                                        {isResolved ? (
                                            <>
                                                <Text style={{ fontFamily: Variables.fonts.bold }}>{updatedDate}</Text> -
                                                Opgelost
                                            </>
                                        ) : (
                                            "Opgelost"
                                        )}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1, // Fill available space
        backgroundColor: colors.background || "#F8F9FA", // Screen background
    },
    center: {
        justifyContent: "center", // Vertical center
        alignItems: "center", // Horizontal center
    },
    blueHeader: {
        backgroundColor: colors.header || "#2C4365", // Header background
        paddingTop: 60, // Top spacing
        paddingBottom: 40, // Bottom spacing
        paddingHorizontal: 20, // Horizontal spacing
        flexDirection: "row", // Row layout
        alignItems: "center", // Vertical align children
        justifyContent: "center", // Center title area
        position: "relative", // Anchor absolute children
        borderBottomLeftRadius: 16, // Bottom-left rounding
        borderBottomRightRadius: 16, // Bottom-right rounding
    },
    backButtonWrapper: {
        position: "absolute", // Float button over header
        left: 10, // Left offset
        zIndex: 10, // Keep above content
        marginTop: 55, // Vertical offset
        transform: [{ scale: 1.5 }], // Larger tap target
        padding: 5, // Extra touch area
    },
    contentPadding: {
        padding: 20, // Screen content padding
    },
    imageContainer: {
        position: "relative", // Anchor badge to image
        marginBottom: 30, // Space below image
        marginTop: 10, // Space above image
        borderRadius: 12, // Rounded corners
        shadowColor: "#000", // Shadow color
        shadowOffset: { width: 0, height: 4 }, // Shadow offset
        shadowOpacity: 0.1, // Shadow opacity
        shadowRadius: 6, // Shadow blur
        elevation: 4, // Android shadow
    },
    mainImage: {
        width: "100%", // Full width
        height: 180, // Fixed height
        borderRadius: 12, // Rounded corners
        resizeMode: "cover", // Crop to fill
    },
    aiBadge: {
        position: "absolute", // Unused legacy style
        bottom: -15, // Vertical offset
        alignSelf: "center", // Center horizontally
        backgroundColor: "#FFFFFF", // Badge background
        paddingVertical: 8, // Vertical padding
        paddingHorizontal: 16, // Horizontal padding
        borderRadius: 20, // Pill shape
        shadowColor: "#000", // Shadow color
        shadowOffset: { width: 0, height: 2 }, // Shadow offset
        shadowOpacity: 0.1, // Shadow opacity
        shadowRadius: 4, // Shadow blur
        elevation: 3, // Android shadow
    },
    infoText: {
        fontSize: Variables.textSizes.base, // Base text size
        color: colors.text, // Primary text color
        fontFamily: Variables.fonts.regular, // Regular font
    },
    descriptionText: {
        fontSize: Variables.textSizes.base, // Base text size
        color: colors.textLight || "#666", // Secondary text color
        fontFamily: Variables.fonts.regular, // Regular font
        fontStyle: "italic", // Italic style
        marginTop: 5, // Top spacing
        lineHeight: 22, // Readable line height
    },
    timelineWrapper: {
        marginTop: 30, // Space above timeline
        paddingLeft: 10, // Left inset
    },
    timelineRow: {
        flexDirection: "row", // Icon + text columns
    },
    timelineIconColumn: {
        width: 40, // Fixed icon column width
        alignItems: "center", // Center icons
    },
    iconCircle: {
        width: 32, // Circle width
        height: 32, // Circle height
        borderRadius: 16, // Full circle
        justifyContent: "center", // Center icon vertically
        alignItems: "center", // Center icon horizontally
    },
    verticalLine: {
        width: 2, // Line thickness
        height: 30, // Line height
        marginVertical: 4, // Spacing around line
    },
    timelineTextColumn: {
        flex: 1, // Use remaining width
        justifyContent: "flex-start", // Align to top
        paddingTop: 6, // Align with icon center
        paddingLeft: 10, // Space from icon column
    },
    timelineText: {
        fontSize: Variables.textSizes.base, // Base text size
        color: colors.text, // Default text color
        fontFamily: Variables.fonts.regular, // Regular font
    },
    titleContainer: {
        flex: 1, // Expand available space
        alignItems: "center", // Center content
        marginHorizontal: 40, // Reserve side space
    },
    title: {
        fontFamily: Variables.fonts.bold, // Bold font
        fontSize: Variables.textSizes.lg, // Large title size
        textAlign: "center", // Center text
        color: "#FFFFFF", // White text
    },
    subCity: {
        fontFamily: Variables.fonts.regular, // Regular font
        fontSize: Variables.textSizes.base, // Base text size
        textAlign: "center", // Center text
        color: "#E0E0E0", // Light contrast text
        marginTop: 2, // Small top spacing
    },
    aiBadgeCenterWrapper: {
        position: "absolute", // Overlay on image
        bottom: 2, // Near bottom edge
        alignSelf: "center", // Horizontally centered
    },
    aiBadgeSuccess: {
        backgroundColor: colors.primary, // Primary badge color
        paddingHorizontal: 12, // Horizontal padding
        paddingVertical: 6, // Vertical padding
        borderRadius: 20, // Rounded pill
        flexDirection: "row", // Icon + text
        alignItems: "center", // Center content vertically
        shadowColor: colors.text, // Shadow color
        shadowOffset: { width: 0, height: 2 }, // Shadow offset
        shadowOpacity: 0.3, // Shadow opacity
        shadowRadius: 3, // Shadow blur
        elevation: 5, // Android shadow
    },
    aiBadgeText: {
        color: colors.textInverse || "#FFFFFF", // Badge text color
        fontSize: Variables.textSizes.sm - 2, // Slightly smaller text
        fontWeight: "bold", // Bold text
    },
    aiBadgeIcon: {
        marginRight: 6, // Spacing between icon and text
    },
    noPhotoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
},
noPhotoText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9CA3AF",
},
});