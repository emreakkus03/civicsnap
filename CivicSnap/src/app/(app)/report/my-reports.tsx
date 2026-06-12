import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Query } from "react-native-appwrite";

import { useAuthContext } from "@components/functional/Auth/authProvider";
import { API } from "@core/networking/api";
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";

import { useThemeColors } from "@core/utils/useThemeColors";
import { Variables } from "@style/theme";
import BackButton from "@components/design/Button/BackButton";
import ThemedText from "@components/design/Typography/ThemedText";

const PAGE_SIZE = 20;
const MONTHS_BACK = 3;

export default function MyReportsScreen() {
    const router = useRouter();
    const { profile } = useAuthContext();
    const {  } = useRealtime();

    const [userReports, setUserReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const colors = useThemeColors();
            
    const styles = createStyles(colors);

    const getDateFilter = () => {
        const date = new Date();
        date.setMonth(date.getMonth() - MONTHS_BACK);
        return date.toISOString();
    };

    const fetchReports = useCallback(async (currentOffset: number, replace: boolean) => {
        if (!profile?.$id) return;

        currentOffset === 0 ? setLoading(true) : setLoadingMore(true);

        try {
            const response = await API.database.listDocuments(
                API.config.databaseId,
                API.config.reportsCollectionId,
                [
                    Query.equal("user_id", profile.$id),
                    Query.orderDesc("$createdAt"),
                    Query.greaterThan("$createdAt", getDateFilter()),
                    Query.limit(PAGE_SIZE),
                    Query.offset(currentOffset),
                ]
            );

            setHasMore(response.documents.length === PAGE_SIZE);

            const reportsWithCategories = await Promise.all(
                response.documents.map(async (report: any) => {
                    let fetchedCategoryName = "Problem";
                    if (report.category_id) {
                        try {
                            if (typeof report.category_id === "object" && report.category_id.name) {
                                fetchedCategoryName = report.category_id.name;
                            } else {
                                const categoryData = await API.database.getDocument(
                                    API.config.databaseId,
                                    API.config.categoriesCollectionId,
                                    report.category_id
                                );
                                fetchedCategoryName = categoryData.name || "Problem";
                            }
                        } catch (catError) {
                            console.error(`Could not fetch category for report ${report.$id}:`, catError);
                        }
                    }
                    return { ...report, category_name: fetchedCategoryName };
                })
            );

            setUserReports(prev => replace ? reportsWithCategories : [...prev, ...reportsWithCategories]);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [profile?.$id]);

    useEffect(() => {
        setOffset(0);
        setHasMore(true);
        fetchReports(0, true);
    }, [profile?.$id]);

    const handleLoadMore = () => {
        if (loadingMore || !hasMore) return;
        const newOffset = offset + PAGE_SIZE;
        setOffset(newOffset);
        fetchReports(newOffset, false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("nl-NL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const renderReportCard = ({ item: report }: { item: any }) => {
        const isInvalid = report.status === "invalid" || report.status === "rejected";
        const isResolved = report.status === "resolved";
        const isInProgress = report.status === "approved" || report.status === "in_progress";

        let iconColor = colors.primary;
        let bgColor = colors.primary + "1A";
        let iconName = "document-text";
        let statusText = "Gemeld";

        if (isInvalid) {
            iconColor = colors.error;
            bgColor = colors.error + "1A";
            iconName = "close-circle";
            statusText = "Afgewezen";
        } else if (isResolved) {
            iconColor = "#388E3C";
            bgColor = "#388E3C1A";
            iconName = "checkmark-circle";
            statusText = "Opgelost";
        } else if (isInProgress) {
            iconColor = "#F57C00";
            bgColor = "#F57C001A";
            iconName = "build";
            statusText = "In behandeling";
        }

        return (
            <TouchableOpacity
                style={styles.reportCard}
                onPress={() => router.push(`/(app)/report/${report.$id}` as any)}
            >
                <View style={[styles.statusIconWrapper, { backgroundColor: bgColor }]}>
                    <Ionicons name={iconName as any} size={26} color={iconColor} />
                </View>
                <View style={styles.reportCardContent}>
                    <View style={styles.reportHeaderRow}>
                        <Text style={styles.reportDate}>{formatDate(report.$createdAt)}</Text>
                        <Text style={[styles.statusBadgeText, { color: iconColor }]}>{statusText}</Text>
                    </View>
                    <Text style={styles.reportAddress} numberOfLines={2}>
                        <Text style={{ fontFamily: Variables.fonts.bold }}>{report.category_name}: </Text>
                        {report.address}, {report.zip_code} {report.city}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (loadingMore) return <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />;
        if (!hasMore && userReports.length > 0) return (
            <Text style={styles.endText}>Enkel meldingen van de laatste {MONTHS_BACK} maanden worden getoond.</Text>
        );
        if (hasMore) return (
            <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Laad meer</Text>
            </TouchableOpacity>
        );
        return null;
    };

    return (
        <View style={styles.container}>
            <View style={styles.blueHeader}>
                <View style={styles.backButtonWrapper}>
                    <BackButton color={colors.textInverse} />
                </View>
                <View style={styles.titleContainer}>
                    <ThemedText type="subtitle" color="inverse" style={styles.title}>
                        Mijn Meldingen
                    </ThemedText>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={userReports}
                    keyExtractor={(item) => item.$id}
                    renderItem={renderReportCard}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Je hebt nog geen meldingen aangemaakt.</Text>
                    }
                />
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.background,
    },
    blueHeader: {
        backgroundColor: colors.header,
        paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        position: "relative", borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    },
    backButtonWrapper: {
        position: "absolute", left: 10, zIndex: 10,
        marginTop: 55, transform: [{ scale: 1.5 }], padding: 5,
    },
    titleContainer: { 
        flex: 1, 
        alignItems: "center", 
        marginHorizontal: 40 
    },
    title: {
        fontFamily: Variables.fonts.bold,
        fontSize: Variables.textSizes.lg,
        textAlign: "center", color: colors.textInverse,
    },
    listContainer: { 
        padding: 20, 
        paddingBottom: 40 
    },
    reportCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: colors.surface, borderRadius: 16,
        padding: 15, marginBottom: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    },
    statusIconWrapper: {
        width: 50, height: 50, borderRadius: 25,
        justifyContent: "center", alignItems: "center", marginRight: 15,
    },
    reportCardContent: { 
        flex: 1 
    },
    reportHeaderRow: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 4,
    },
    reportDate: { 
        fontFamily: Variables.fonts.bold, 
        fontSize: 15, 
        color: colors.text 
    },
    statusBadgeText: { 
        fontFamily: Variables.fonts.bold, 
        fontSize: 13 
    },
    reportAddress: {
        fontFamily: Variables.fonts.regular, fontSize: 13,
        color: colors.textLight, lineHeight: 18,
    },
    emptyText: {
        fontFamily: Variables.fonts.regular, color: colors.textLight,
        textAlign: "center", marginTop: 40, fontSize: 16,
    },
    loadMoreButton: {
        marginVertical: 16, marginHorizontal: 40,
        backgroundColor: colors.primary,
        borderRadius: 12, paddingVertical: 12, alignItems: "center",
    },
    loadMoreText: { 
        fontFamily: Variables.fonts.bold, 
        color: colors.textInverse, 
        fontSize: 15 
    },
    endText: {
        fontFamily: Variables.fonts.regular, color: colors.textLight,
        textAlign: "center", marginVertical: 16, fontSize: 13,
    },
});