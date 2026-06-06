import React, { useEffect, useRef } from "react";
import { useChat } from "@components/context/ChatContext"; // Zorg dat dit pad klopt
import { useAuth } from "@core/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Send, MessageCircle, ChevronLeft, ChevronRight, Minimize2, ExternalLink, Loader2, User, MapPin, Trash2 } from "lucide-react";
import { databases, appwriteConfig } from "@core/appwrite";

export default function FloatingChatWidget() {
  const {
    isMinimized, toggleMinimize, view, setView, inboxTab, setInboxTab, conversations, activeConversation, activeChatDetails,
    openChat, messages, newMessage, setNewMessage, sendMessage, isSending, endConversation, deleteConversation
  } = useChat();

  const { profile } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view, isMinimized, isSending]);


  const hasUnreadAdmin = conversations.some(c => c.has_unread_admin === true);

  
  useEffect(() => {
    if (view === "chat" && activeConversation && activeConversation.has_unread_admin) {
      const markAsRead = async () => {
        try {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.conversationsCollectionId,
            activeConversation.$id,
            { has_unread_admin: false }
          );
          activeConversation.has_unread_admin = false; 
        } catch (error) {
          console.error("Fout bij markeren als gelezen:", error);
        }
      };
      markAsRead();
    }
  }, [view, activeConversation]);

  if (!profile) return null;


 
  if (isMinimized) {
    if (profile?.role === "org_viewer") return null;
    return (
      <button
        onClick={toggleMinimize}
        // --- AANGEPAST: Marges en grootte schalen mee ---
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 bg-[#0870C4] rounded-full shadow-xl flex items-center justify-center text-white hover:scale-105 transition-transform z-50 animate-in zoom-in duration-300 focus:outline-none"
      >
        <MessageCircle className="w-7 h-7 md:w-8 md:h-8" />
        {hasUnreadAdmin && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </button>
    );
  }

  return (
    // --- AANGEPAST: Breedte en hoogte schalen mee, dynamische marges ---
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100vw-2rem)] md:w-[400px] h-[75vh] md:h-[600px] max-h-[800px] bg-white rounded-2xl shadow-2xl shadow-blue-900/20 border border-gray-200 z-50 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
      
      {/* ─── Dynamische Header ─── */}
      <div className="bg-[#0870C4] p-3 md:p-4 flex justify-between items-start text-white shadow-sm z-10 shrink-0">
        <div className="flex items-start gap-2 truncate pr-2 w-full">
          {view === "chat" && (
            <button onClick={() => setView("list")} className="text-white hover:bg-blue-600 p-1 rounded-full transition-colors shrink-0 mt-0.5 focus:outline-none">
              <ChevronLeft size={20} />
            </button>
          )}
          
          <div className="flex flex-col truncate w-full">
            <span className="font-bold truncate text-sm md:text-base">
              {view === "list" ? "Mijn Gesprekken" : activeConversation?.subject}
            </span>
            
            {view === "chat" && activeChatDetails && (
              <div className="mt-1 flex flex-col gap-0.5 opacity-90">
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-blue-100">
                  <User size={12} className="shrink-0" /> <span className="truncate">{activeChatDetails.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-blue-100">
                  <MapPin size={12} className="shrink-0" /> <span className="truncate">{activeChatDetails.location}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {view === "chat" && activeConversation?.status === "closed" && profile?.role === "org_admin" && (
            <button
              onClick={() => deleteConversation(activeConversation.$id)}
              className="text-white hover:bg-red-500 p-1.5 rounded-full transition-colors mr-1 focus:outline-none"
              title="Gesprek definitief verwijderen"
            >
              <Trash2 size={16} />
            </button>
          )}

          {view === "chat" && activeConversation && (
            <button
              onClick={() => navigate(`/reports/${activeConversation.report_id}`)}
              className="text-white hover:bg-blue-600 p-1.5 rounded-full transition-colors focus:outline-none"
              title="Bekijk de originele melding"
            >
              <ExternalLink size={16} />
            </button>
          )}
          <button onClick={toggleMinimize} className="text-white hover:bg-blue-600 p-1.5 rounded-full transition-colors focus:outline-none" title="Minimaliseren">
            <Minimize2 size={18} />
          </button>
        </div>
      </div>

      {/* ─── TAB BAR (Alleen in Inbox view) ─── */}
      {view === "list" && (
        <div className="flex border-b border-gray-200 bg-white shadow-sm z-10 shrink-0">
          <button
            onClick={() => setInboxTab("open")}
            className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-semibold transition-colors relative focus:outline-none ${inboxTab === "open" ? "text-[#0870C4]" : "text-gray-500 hover:text-gray-700"}`}
          >
            Open
            {inboxTab === "open" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>}
          </button>
          <button
            onClick={() => setInboxTab("closed")}
            className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-semibold transition-colors relative focus:outline-none ${inboxTab === "closed" ? "text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
          >
            Gesloten
            {inboxTab === "closed" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-800 rounded-t-full"></span>}
          </button>
        </div>
      )}

      {/* ─── Body Area ─── */}
      <div className="flex-1 overflow-y-auto bg-[#F5F7FA] flex flex-col relative">
        
        {/* INBOX VIEW */}
        {view === "list" && (
          <div className="flex flex-col divide-y divide-gray-100">
            {conversations.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-gray-500 text-xs md:text-sm">
                Geen {inboxTab === "open" ? "openstaande" : "gesloten"} gesprekken gevonden.
              </div>
            ) : (
              conversations.map((convo) => {
                const isUnread = convo.has_unread_admin === true;

                return (
                  <button
                    key={convo.$id}
                    onClick={() => openChat(convo)}
                    className={`p-3 md:p-4 hover:bg-blue-50/50 text-left transition-colors flex justify-between items-center group focus:outline-none ${isUnread ? "bg-blue-50/40 border-l-4 border-[#0870C4]" : "bg-white border-l-4 border-transparent"}`}
                  >
                    <div className="truncate pr-3 md:pr-4 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-xs md:text-sm truncate ${isUnread ? "font-bold text-[#0870C4]" : "font-semibold text-gray-800"}`}>
                          {convo.subject}
                        </p>
                       
                        {isUnread && (
                          <span className="bg-[#0870C4] text-white text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full shrink-0">
                            NIEUW
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-400 flex items-center gap-2">
                        <span className={convo.status === 'open' ? 'text-green-600 font-medium' : 'text-gray-500 font-medium'}>
                          {convo.status === 'open' ? 'Open' : 'Gesloten'}
                        </span>
                        • {new Date(convo.$createdAt).toLocaleDateString('nl-BE')}
                      </p>
                    </div>
                    <ChevronRight size={18} className={`${isUnread ? "text-[#0870C4]" : "text-gray-300"} group-hover:text-[#0870C4] transition-colors shrink-0`} />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* CHAT VIEW */}
        {view === "chat" && (
          <div className="flex flex-col gap-3 p-3 md:p-4">
            
            {activeConversation?.status === "open" && (
              <div className="sticky top-0 z-10 flex justify-center py-2 backdrop-blur-sm">
                <button 
                  onClick={endConversation}
                  className="text-[10px] md:text-xs bg-red-50 text-red-600 font-medium px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-red-100 hover:bg-red-100 transition-colors shadow-sm focus:outline-none"
                >
                  Gesprek afronden / sluiten
                </button>
              </div>
            )}

           {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center mt-10">
                <p className="text-gray-400 text-xs md:text-sm px-4">Typ hieronder je eerste bericht naar de melder.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.sender_id === profile?.$id;
                return (
                  <div
                    key={msg.$id}
                    className={`max-w-[90%] md:max-w-[85%] p-2.5 md:p-3 text-xs md:text-sm ${
                      isAdmin
                        ? "bg-[#0870C4] text-white self-end rounded-2xl rounded-tr-sm shadow-sm"
                        : "bg-white border border-gray-200 text-gray-800 self-start rounded-2xl rounded-tl-sm shadow-sm"
                    }`}
                  >
                    <p className="leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-[9px] md:text-[10px] mt-1.5 text-right font-medium ${isAdmin ? "text-blue-200" : "text-gray-400"}`}>
                      {new Date(msg.$createdAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="max-w-[90%] md:max-w-[85%] p-2.5 md:p-3 text-xs md:text-sm bg-[#0870C4] text-white self-end rounded-2xl rounded-tr-sm shadow-sm opacity-60 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Aan het verzenden...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Footer Input Area ─── */}
      {view === "chat" && activeConversation && (
        <div className="bg-white border-t border-gray-100 shrink-0">
          {activeConversation.status === "open" ? (
            <div className="p-2 md:p-3 flex gap-2 items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Typ een bericht..."
                disabled={isSending}
                className="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0870C4] focus:bg-white transition-all text-sm disabled:opacity-50 min-w-0"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
                className="bg-[#0870C4] text-white w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-[#0870C4] shrink-0 focus:outline-none"
              >
                {isSending ? <Loader2 size={16} className="animate-spin md:w-[18px] md:h-[18px]" /> : <Send size={16} className="ml-0.5 md:w-[18px] md:h-[18px]" />}
              </button>
            </div>
          ) : (
            <div className="p-3 md:p-4 bg-gray-50 text-center text-gray-500 text-xs md:text-sm font-medium">
              Dit gesprek is gesloten door de gemeente.
            </div>
          )}
        </div>
      )}
    </div>
  );
}