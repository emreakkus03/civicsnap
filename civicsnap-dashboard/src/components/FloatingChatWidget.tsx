import React, { useEffect, useRef } from "react";
import { useChat } from "@components/context/ChatContext"; // Zorg dat dit pad klopt
import { useAuth } from "@core/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Send, MessageCircle, ChevronLeft, ChevronRight, Minimize2, ExternalLink, Loader2, User, MapPin, Trash2 } from "lucide-react"; // Trash2 toegevoegd

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

  if (!profile) return null;

  // ─── 1. Bubble View ───
  if (isMinimized) {
    if (profile?.role === "org_viewer") return null;
    return (
      <button
        onClick={toggleMinimize}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#0870C4] rounded-full shadow-xl flex items-center justify-center text-white hover:scale-105 transition-transform z-50 animate-in zoom-in duration-300"
      >
        <MessageCircle size={32} />
      </button>
    );
  }

  // ─── 2. Widget View ───
  return (
    <div className="fixed bottom-6 right-6 w-[400px] bg-white rounded-2xl shadow-2xl shadow-blue-900/20 border border-gray-200 z-50 overflow-hidden flex flex-col h-[600px] animate-in slide-in-from-bottom-5 fade-in duration-300">
      
      {/* ─── Dynamische Header ─── */}
      <div className="bg-[#0870C4] p-4 flex justify-between items-start text-white shadow-sm z-10 shrink-0">
        <div className="flex items-start gap-2 truncate pr-2 w-full">
          {view === "chat" && (
            <button onClick={() => setView("list")} className="text-white hover:bg-blue-600 p-1 rounded-full transition-colors shrink-0 mt-0.5">
              <ChevronLeft size={20} />
            </button>
          )}
          
          <div className="flex flex-col truncate w-full">
            <span className="font-bold truncate text-sm">
              {view === "list" ? "Mijn Gesprekken" : activeConversation?.subject}
            </span>
            
            {view === "chat" && activeChatDetails && (
              <div className="mt-1 flex flex-col gap-0.5 opacity-90">
                <div className="flex items-center gap-1.5 text-xs text-blue-100">
                  <User size={12} /> <span className="truncate">{activeChatDetails.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-blue-100">
                  <MapPin size={12} /> <span className="truncate">{activeChatDetails.location}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* NIEUW: Prullenbak knop voor admins als de chat gesloten is */}
          {view === "chat" && activeConversation?.status === "closed" && profile?.role === "org_admin" && (
            <button
              onClick={() => deleteConversation(activeConversation.$id)}
              className="text-white hover:bg-red-500 p-1.5 rounded-full transition-colors mr-1"
              title="Gesprek definitief verwijderen"
            >
              <Trash2 size={16} />
            </button>
          )}

          {view === "chat" && activeConversation && (
            <button
              onClick={() => navigate(`/reports/${activeConversation.report_id}`)}
              className="text-white hover:bg-blue-600 p-1.5 rounded-full transition-colors"
              title="Bekijk de originele melding"
            >
              <ExternalLink size={16} />
            </button>
          )}
          <button onClick={toggleMinimize} className="text-white hover:bg-blue-600 p-1.5 rounded-full transition-colors" title="Minimaliseren">
            <Minimize2 size={18} />
          </button>
        </div>
      </div>

      {/* ─── TAB BAR (Alleen in Inbox view) ─── */}
      {view === "list" && (
        <div className="flex border-b border-gray-200 bg-white shadow-sm z-10 shrink-0">
          <button
            onClick={() => setInboxTab("open")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${inboxTab === "open" ? "text-[#0870C4]" : "text-gray-500 hover:text-gray-700"}`}
          >
            Open
            {inboxTab === "open" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>}
          </button>
          <button
            onClick={() => setInboxTab("closed")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${inboxTab === "closed" ? "text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
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
              <div className="p-8 text-center text-gray-500 text-sm">
                Geen {inboxTab === "open" ? "openstaande" : "gesloten"} gesprekken gevonden.
              </div>
            ) : (
              conversations.map((convo) => (
                <button
                  key={convo.$id}
                  onClick={() => openChat(convo)}
                  className="p-4 bg-white hover:bg-blue-50/50 text-left transition-colors flex justify-between items-center group"
                >
                  <div className="truncate pr-4">
                    <p className="font-semibold text-gray-800 text-sm truncate">{convo.subject}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span className={convo.status === 'open' ? 'text-green-600 font-medium' : 'text-gray-500 font-medium'}>
                        {convo.status === 'open' ? 'Open' : 'Gesloten'}
                      </span>
                      • {new Date(convo.$createdAt).toLocaleDateString('nl-BE')}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-[#0870C4] transition-colors" />
                </button>
              ))
            )}
          </div>
        )}

        {/* CHAT VIEW */}
        {view === "chat" && (
          <div className="flex flex-col gap-3 p-4">
            
            {activeConversation?.status === "open" && (
              <div className="flex justify-center mb-2">
                <button 
                  onClick={endConversation}
                  className="text-xs bg-red-50 text-red-600 font-medium px-4 py-1.5 rounded-full border border-red-100 hover:bg-red-100 transition-colors"
                >
                  Gesprek afronden / sluiten
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center mt-10">
                <p className="text-gray-400 text-sm">Typ hieronder je eerste bericht naar de melder.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.sender_id === profile?.$id;
                return (
                  <div
                    key={msg.$id}
                    className={`max-w-[85%] p-3 text-sm ${
                      isAdmin
                        ? "bg-[#0870C4] text-white self-end rounded-2xl rounded-tr-sm shadow-sm"
                        : "bg-white border border-gray-200 text-gray-800 self-start rounded-2xl rounded-tl-sm shadow-sm"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1.5 text-right font-medium ${isAdmin ? "text-blue-200" : "text-gray-400"}`}>
                      {new Date(msg.$createdAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="max-w-[85%] p-3 text-sm bg-[#0870C4] text-white self-end rounded-2xl rounded-tr-sm shadow-sm opacity-60 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Aan het verzenden...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Footer Input Area ─── */}
      {view === "chat" && activeConversation && (
        <div className="bg-white border-t border-gray-100">
          {activeConversation.status === "open" ? (
            <div className="p-3 flex gap-2 items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Typ een bericht..."
                disabled={isSending}
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0870C4] focus:bg-white transition-all text-sm disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
                className="bg-[#0870C4] text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-[#0870C4] shrink-0"
              >
                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 text-center text-gray-500 text-sm font-medium">
              Dit gesprek is gesloten door de gemeente.
            </div>
          )}
        </div>
      )}
    </div>
  );
}