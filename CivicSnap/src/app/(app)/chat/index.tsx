import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Query } from "react-native-appwrite";

import { useAuthContext } from "@components/functional/Auth/authProvider";
import { API } from "@core/networking/api";
import { Variables } from "@/style/theme";
// NIEUW: Importeer jouw eigen realtime provider!
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";

export default function ChatListScreen() {
    const router = useRouter();
    const { profile } = useAuthContext();
    const { lastUpdate } = useRealtime(); // NIEUW: Haal de trigger op
    
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChats = async () => {
            if (!profile?.$id) return;
            try {
                const res = await API.database.listDocuments(
                    API.config.databaseId,
                    API.config.conversationsCollectionId,
                    [
                        Query.equal("user_id", profile.$id),
                        Query.orderDesc("$updatedAt") // Realtime zorgt dat de nieuwste direct bovenaan springt
                    ]
                );

                const convosWithOrg = await Promise.all(res.documents.map(async (convo) => {
                    try {
                        const org = await API.database.getDocument(
                            API.config.databaseId,
                            API.config.organizationsCollectionId,
                            convo.organization_id
                        );
                        return { ...convo, org_name: org.name };
                    } catch (e) {
                        return { ...convo, org_name: "Gemeente" };
                    }
                }));

                setConversations(convosWithOrg);
            } catch (error) {
                console.error("Fout bij ophalen chats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChats();
    }, [profile?.$id, lastUpdate]); // NIEUW: lastUpdate toegevoegd aan dependency array!

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
                    <Ionicons name="arrow-back" size={24} color={Variables.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mijn Gesprekken</Text>
                <View style={{ width: 34 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={Variables.colors.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.$id}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Je hebt nog geen berichten van de gemeente.</Text>
                    }
                  renderItem={({ item }) => {
                        // Check of deze specifieke conversatie het unread veld op 'true' heeft staan
                        const hasNewMessage = item.has_unread_user === true;

                        return (
                            <TouchableOpacity
                                style={[styles.card, hasNewMessage && { borderColor: Variables.colors.primary, borderWidth: 1 }]}
                                onPress={() => router.push({
                                    pathname: `/(app)/chat/[id]`,
                                    params: { id: item.$id, subject: item.subject, status: item.status, org_id: item.organization_id, org_name: item.org_name }
                                })}
                            >
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <Text style={styles.orgName}>{item.org_name}</Text>
                                        
                                        {/* NIEUW: Blauw labeltje 'Nieuw Bericht' */}
                                        {hasNewMessage && (
                                            <View style={{ backgroundColor: Variables.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                                                <Text style={{ color: 'white', fontSize: 10, fontFamily: Variables.fonts.bold }}>NIEUW</Text>
                                            </View>
                                        )}
                                    </View>
                                    
                                    <Text style={[styles.subject, hasNewMessage && { color: Variables.colors.primary }]} numberOfLines={1}>{item.subject}</Text>
                                    <Text style={[styles.status, { color: item.status === 'open' ? '#388E3C' : Variables.colors.textLight }]}>
                                        {item.status === 'open' ? 'Gemeente is bereikbaar' : 'Gesprek gesloten'} • {new Date(item.$updatedAt).toLocaleDateString('nl-NL')}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Variables.colors.textLight} />
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Variables.colors.background || "#F8F9FA" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee", backgroundColor: "white" },
    headerTitle: { fontFamily: Variables.fonts.bold, fontSize: 18, color: Variables.colors.text },
    card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 15, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    orgName: { fontFamily: Variables.fonts.bold, fontSize: 12, color: Variables.colors.primary, marginBottom: 2, textTransform: "uppercase" },
    subject: { fontFamily: Variables.fonts.bold, fontSize: 16, color: Variables.colors.text, marginBottom: 4 },
    status: { fontFamily: Variables.fonts.regular, fontSize: 12 },
    emptyText: { fontFamily: Variables.fonts.regular, color: Variables.colors.textLight, textAlign: "center", marginTop: 40 },
});