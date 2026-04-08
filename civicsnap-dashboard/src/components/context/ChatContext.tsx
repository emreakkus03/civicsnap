import React, { createContext, useContext, useState, useEffect } from "react";
import { databases, appwriteConfig, functions } from "@core/appwrite";
import { Query } from "appwrite";
import { useAuth } from "@core/AuthProvider";
import toast from "react-hot-toast";

// De 'vorm' van onze nieuwe chat-data
interface ChatContextType {
  isMinimized: boolean;
  view: "list" | "chat";
  conversations: any[];
  activeConversation: any | null;
  messages: any[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  toggleMinimize: () => void;
  setView: (view: "list" | "chat") => void;
  openChat: (conversation: any) => void;
  fetchConversations: () => Promise<void>;
  sendMessage: () => Promise<void>;
  startNewChat: (report: any, subject: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  
  // Nieuwe states voor het minimaliseren en de inbox-lijst
  const [isMinimized, setIsMinimized] = useState(true);
  const [view, setView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<any[]>([]);
  
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Haal alle conversaties van deze specifieke gemeente op
  const fetchConversations = async () => {
    if (!profile?.organization_id) return;
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.conversationsCollectionId,
        [
          Query.equal("organization_id", profile.organization_id),
          Query.orderDesc("$createdAt") // Toon de nieuwste bovenaan
        ]
      );
      setConversations(res.documents);
    } catch (err) {
      console.error("Fout bij laden gesprekken:", err);
    }
  };

  // Haal berichten op zodra er een chat actief wordt
  useEffect(() => {
    if (activeConversation && view === "chat") {
      const fetchMessages = async () => {
        try {
          const res = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.messagesCollectionId,
            [
              Query.equal("conversation_id", activeConversation.$id),
              Query.orderAsc("$createdAt")
            ]
          );
          setMessages(res.documents);
        } catch (err) {
          console.error("Fout bij laden berichten:", err);
        }
      };
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [activeConversation, view]);

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
    // Als we hem openen, haal dan altijd even de nieuwste lijst op
    if (isMinimized) {
      fetchConversations();
    }
  };

  const openChat = (conversation: any) => {
    setActiveConversation(conversation);
    setView("chat");
    setIsMinimized(false);
  };

  const startNewChat = async (report: any, subject: string) => {
    try {
      toast.loading("Chat initialiseren...");
      const response = await functions.createExecution(
        appwriteConfig.startChatFunctionId,
        JSON.stringify({
          report_id: report.$id,
          user_id: report.user_id,
          organization_id: report.organization_id,
          subject: subject
        })
      );

      const result = JSON.parse(response.responseBody);
      if (result.success) {
        toast.dismiss();
        const convo = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.conversationsCollectionId,
          result.conversation_id
        );
        
        // Ververs de lijst en open direct het nieuwe gesprek
        await fetchConversations();
        openChat(convo);
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Kon chat niet starten.");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const textToSend = newMessage;
      setNewMessage(""); // Optimistische UI

      const response = await functions.createExecution(
        appwriteConfig.sendMessageFunctionId,
        JSON.stringify({
          conversation_id: activeConversation.$id,
          sender_id: profile?.$id || "admin",
          text: textToSend,
          organization_id: activeConversation.organization_id
        })
      );

      const result = JSON.parse(response.responseBody);
      if (result.success) {
        setMessages((prev) => [...prev, result.message]);
      }
    } catch (err) {
      toast.error("Bericht niet verzonden.");
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isMinimized,
        view,
        conversations,
        activeConversation,
        messages,
        newMessage,
        setNewMessage,
        toggleMinimize,
        setView,
        openChat,
        fetchConversations,
        sendMessage,
        startNewChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat moet binnen ChatProvider");
  return context;
};