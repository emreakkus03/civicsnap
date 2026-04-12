import React, { createContext, useContext, useState, useEffect, useCallback} from "react";
import { databases, appwriteConfig, functions } from "@core/appwrite";
import { Query } from "appwrite";
import { useAuth } from "@core/AuthProvider";
import toast from "react-hot-toast";

interface ChatContextType {
  isMinimized: boolean;
  view: "list" | "chat";
  inboxTab: "open" | "closed";
  conversations: any[];
  activeConversation: any | null;
  activeChatDetails: { name: string; email: string; location: string } | null;
  messages: any[];
  newMessage: string;
  isSending: boolean;
  setInboxTab: (tab: "open" | "closed") => void;
  setNewMessage: (msg: string) => void;
  toggleMinimize: () => void;
  setView: (view: "list" | "chat") => void;
  openChat: (conversation: any) => void;
  fetchConversations: () => Promise<void>;
  sendMessage: () => Promise<void>;
  startNewChat: (report: any, subject: string) => Promise<void>;
  endConversation: () => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  
  const [isMinimized, setIsMinimized] = useState(true);
  const [view, setView] = useState<"list" | "chat">("list");
  const [inboxTab, setInboxTab] = useState<"open" | "closed">("open"); // NIEUW: Tab state
  const [conversations, setConversations] = useState<any[]>([]);
  
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [activeChatDetails, setActiveChatDetails] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);


 // NIEUW: useCallback toegevoegd zodat ESLint/Vercel blij is
  const fetchConversations = useCallback(async () => {
    if (!profile?.organization_id) return;
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.conversationsCollectionId,
        [
          Query.equal("organization_id", profile.organization_id),
          Query.equal("status", inboxTab),
          Query.orderDesc("$updatedAt"), 
          Query.limit(30) 
        ]
      );
      setConversations(res.documents);
    } catch (err) {
      console.error("Fout bij laden gesprekken:", err);
    }
  }, [profile?.organization_id, inboxTab]);


  useEffect(() => {
    if (!isMinimized && view === "list") {
      fetchConversations();
    }
  }, [isMinimized, view, fetchConversations]);

 
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

      const fetchDetails = async () => {
        try {
          const [userRes, reportRes] = await Promise.all([
            databases.getDocument(appwriteConfig.databaseId, appwriteConfig.profilesCollectionId, activeConversation.user_id).catch(() => null),
            databases.getDocument(appwriteConfig.databaseId, appwriteConfig.reportsCollectionId, activeConversation.report_id).catch(() => null)
          ]);
          
          setActiveChatDetails({
            name: userRes?.full_name || "Onbekende burger",
            email: userRes?.email || "",
            location: reportRes?.address || reportRes?.location || "Bekijk melding voor locatie"
          });
        } catch (error) {
          console.error("Fout bij ophalen details", error);
        }
      };

      fetchMessages();
      fetchDetails();
    } else {
      setMessages([]);
      setActiveChatDetails(null);
    }
  }, [activeConversation, view]);

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
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
        setInboxTab("open"); // Zorg dat we in de open tab staan
        await fetchConversations();
        openChat(convo);
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Kon chat niet starten.");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || isSending) return;

    try {
      setIsSending(true);
      const textToSend = newMessage;
      setNewMessage("");

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
      setNewMessage(newMessage);
    } finally {
      setIsSending(false);
    }
  };

  const endConversation = async () => {
    if (!activeConversation) return;
    if (!window.confirm("Weet je zeker dat je dit gesprek wilt sluiten? Je kunt hierna geen berichten meer sturen.")) return;

    const toastId = toast.loading("Gesprek sluiten...");
    try {
      const updatedConvo = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.conversationsCollectionId,
        activeConversation.$id,
        { status: 'closed' }
      );
      
      setActiveConversation(updatedConvo);
      toast.success("Gesprek succesvol gesloten.", { id: toastId });
    } catch (error) {
      toast.error("Kon gesprek niet sluiten.", { id: toastId });
    }
  };

  // NIEUW: Gesprek definitief verwijderen (via de Server Function)
  const deleteConversation = async (conversationId: string) => {
    if (!window.confirm("Weet je zeker dat je dit hele gesprek en alle berichten permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;

    const toastId = toast.loading("Gesprek verwijderen...");
    try {
      const response = await functions.createExecution(
        appwriteConfig.deleteConversationFunctionId, // ZORG DAT DEZE IN JE APPWRITE.TS STAAT!
        JSON.stringify({ conversation_id: conversationId })
      );

      const result = JSON.parse(response.responseBody);
      if (result.success) {
        toast.success("Gesprek permanent verwijderd.", { id: toastId });
        setView("list");
        fetchConversations();
      } else {
        toast.error("Verwijderen mislukt.", { id: toastId });
      }
    } catch (err) {
      toast.error("Serverfout bij verwijderen.", { id: toastId });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isMinimized, view, inboxTab, conversations, activeConversation, activeChatDetails, messages, newMessage, isSending,
        setInboxTab, setNewMessage, toggleMinimize, setView, openChat, fetchConversations, sendMessage, startNewChat, endConversation, deleteConversation
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