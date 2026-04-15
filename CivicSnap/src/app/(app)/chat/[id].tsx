import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Keyboard } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Query } from "react-native-appwrite";

import { useAuthContext } from "@components/functional/Auth/authProvider";
import { API } from "@core/networking/api";
import { Variables } from "@/style/theme";
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";

export default function ChatDetailScreen() {
    const router = useRouter();
    const { id, subject, status, org_id, org_name } = useLocalSearchParams();
    const { profile } = useAuthContext();
    
    const insets = useSafeAreaInsets(); 
    const { lastUpdate } = useRealtime(); 

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    // Luister of het toetsenbord open of dicht is (voor de perfecte padding onderaan)
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!id) return;
            try {
                const res = await API.database.listDocuments(
                    API.config.databaseId,
                    API.config.messagesCollectionId,
                    [
                        Query.equal("conversation_id", id as string),
                        Query.orderDesc("$createdAt") 
                    ]
                );
                setMessages(res.documents);
            } catch (error) {
                console.error("Fout bij laden berichten:", error);
            }
        };
        fetchMessages();
    }, [id, lastUpdate]);

    
    useEffect(() => {
        if (!id) return;

        const markAsRead = async () => {
            try {
                await API.database.updateDocument(
                    API.config.databaseId,
                    API.config.conversationsCollectionId,
                    id as string,
                    { has_unread_user: false } 
                );
            } catch (error) {
                console.error("Fout bij markeren als gelezen:", error);
            }
        };

        markAsRead();
    }, [id]);

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return;

        try {
            setIsSending(true);
            const textToSend = newMessage;
            setNewMessage(""); 

            const response = await API.functions.createExecution(
                API.config.sendMessageFunctionId,
                JSON.stringify({
                    conversation_id: id,
                    sender_id: profile?.$id,
                    text: textToSend,
                    organization_id: org_id
                })
            );

            const result = JSON.parse(response.responseBody);
            if (!result.success) {
                setNewMessage(textToSend); 
            }
        } catch (error) {
            setNewMessage(newMessage); 
        } finally {
            setIsSending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* We zetten de KeyboardAvoidingView rondom ALLES, inclusief de header */}
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0} // Een kleine offset voor iOS
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
                        <Ionicons name="arrow-back" size={24} color={Variables.colors.text} />
                    </TouchableOpacity>
                    
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{subject}</Text>
                        {org_name ? (
                            <Text style={styles.headerSubtitle} numberOfLines={1}>{org_name}</Text>
                        ) : null}
                    </View>

                    <View style={{ width: 34 }} />
                </View>

                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.$id}
                    inverted 
                    keyboardShouldPersistTaps="handled" // Zorgt dat je nog knoppen kunt indrukken als keyboard open is
                    contentContainerStyle={{ padding: 15, paddingTop: 30 }}
                    renderItem={({ item }) => {
                        const isMe = item.sender_id === profile?.$id;
                        return (
                            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                                <Text style={{ color: isMe ? "white" : Variables.colors.text, fontSize: 15, fontFamily: Variables.fonts.regular }}>
                                    {item.text}
                                </Text>
                                <Text style={{ color: isMe ? "rgba(255,255,255,0.7)" : Variables.colors.textLight, fontSize: 10, alignSelf: 'flex-end', marginTop: 4 }}>
                                    {new Date(item.$createdAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                                </Text>
                            </View>
                        );
                    }}
                />

                {status === 'open' ? (
                    <View style={[
                        styles.inputContainer, 
                        // Als het toetsenbord open is, hoeven we de 'bottom notch' padding van iPhones niet meer toe te voegen
                        { paddingBottom: isKeyboardVisible ? 15 : Math.max(insets.bottom, 15) }
                    ]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Typ een bericht..."
                            placeholderTextColor={Variables.colors.textLight}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                        />
                        <TouchableOpacity 
                            onPress={handleSend}
                            disabled={!newMessage.trim() || isSending}
                            style={[styles.sendButton, { opacity: (!newMessage.trim() || isSending) ? 0.5 : 1 }]}
                        >
                            {isSending ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="send" size={18} color="white" style={{ marginLeft: 3 }} />}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.closedContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <Text style={styles.closedText}>Dit gesprek is afgerond door de gemeente.</Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Variables.colors.background || "#F8F9FA" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee", backgroundColor: "white", zIndex: 10 },
    headerTextContainer: { flex: 1, alignItems: "center", marginHorizontal: 10 },
    headerTitle: { fontFamily: Variables.fonts.bold, fontSize: 16, color: Variables.colors.text, textAlign: "center" },
    headerSubtitle: { fontFamily: Variables.fonts.regular, fontSize: 12, color: Variables.colors.textLight, textAlign: "center", marginTop: 2 },
    messageBubble: { maxWidth: "80%", padding: 12, borderRadius: 20, marginVertical: 4 },
    myMessage: { alignSelf: "flex-end", backgroundColor: Variables.colors.primary, borderBottomRightRadius: 4 },
    theirMessage: { alignSelf: "flex-start", backgroundColor: "white", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#eee" },
    inputContainer: { flexDirection: "row", padding: 15, backgroundColor: "white", borderTopWidth: 1, borderColor: "#eee", alignItems: "flex-end" },
    input: { flex: 1, backgroundColor: "#F5F7FA", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, borderRadius: 20, fontSize: 15, maxHeight: 100, fontFamily: Variables.fonts.regular },
    sendButton: { backgroundColor: Variables.colors.primary, justifyContent: "center", alignItems: "center", width: 44, height: 44, borderRadius: 22, marginLeft: 10, marginBottom: 2 },
    closedContainer: { padding: 20, backgroundColor: "#E0E0E0", alignItems: "center" },
    closedText: { fontFamily: Variables.fonts.regular, color: Variables.colors.textLight },
});