import React, { useEffect, useRef } from "react";
import { useChat } from "@components/context/ChatContext"; // Check of dit pad klopt!
import { useAuth } from "@core/AuthProvider";
import { Send, MessageCircle, ChevronLeft, ChevronRight, Minimize2 } from "lucide-react";

export default function FloatingChatWidget() {
  const {
    isMinimized,
    toggleMinimize,
    view,
    setView,
    conversations,
    activeConversation,
    openChat,
    messages,
    newMessage,
    setNewMessage,
    sendMessage,
  } = useChat();

  const { profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatisch naar beneden scrollen als we in de chat view zitten
  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view, isMinimized]);

  // ─── 1. Bubble View (Geminimaliseerd) ───
  if (isMinimized) {
    // Verberg voor viewers
    if (profile?.role === "org_viewer") return null;

    return (
      <button
        onClick={toggleMinimize}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#0870C4] rounded-full shadow-xl flex items-center justify-center text-white hover:scale-105 transition-transform z-50 animate-in zoom-in duration-300"
        title="Open chats"
      >
        <MessageCircle size={32} />
      </button>
    );
  }

  // ─── 2. Widget View (Inbox of Chat) ───
  return (
    <div className="fixed bottom-6 right-6 w-[400px] bg-white rounded-2xl shadow-2xl shadow-blue-900/20 border border-gray-200 z-50 overflow-hidden flex flex-col h-[600px] animate-in slide-in-from-bottom-5 fade-in duration-300">
      
      {/* ─── Dynamische Header ─── */}
      <div className="bg-[#0870C4] p-4 flex justify-between items-center text-white shadow-sm z-10">
        <div className="flex items-center gap-2 truncate pr-2">
          {view === "chat" && (
            <button
              onClick={() => setView("list")}
              className="text-white hover:bg-blue-600 p-1.5 rounded-full transition-colors shrink-0"
              title="Terug naar overzicht"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex flex-col truncate">
            <span className="font-bold truncate text-sm">
              {view === "list" ? "Mijn Gesprekken" : activeConversation?.subject}
            </span>
            {view === "chat" && activeConversation && (
              <span className="text-xs text-blue-100 opacity-90 mt-0.5">
                {activeConversation.status === "open" ? "🟢 Actief gesprek" : "🔴 Gesloten"}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={toggleMinimize}
          className="text-white hover:bg-blue-600 p-1.5 rounded-full transition-colors shrink-0"
          title="Minimaliseren"
        >
          <Minimize2 size={18} />
        </button>
      </div>

      {/* ─── Body Area ─── */}
      <div className="flex-1 overflow-y-auto bg-[#F5F7FA] flex flex-col relative">
        
        {/* INBOX VIEW */}
        {view === "list" && (
          <div className="flex flex-col divide-y divide-gray-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Er zijn nog geen gesprekken gestart.
              </div>
            ) : (
              conversations.map((convo) => (
                <button
                  key={convo.$id}
                  onClick={() => openChat(convo)}
                  className="p-4 bg-white hover:bg-blue-50/50 text-left transition-colors flex justify-between items-center group"
                >
                  <div className="truncate pr-4">
                    <p className="font-semibold text-gray-800 text-sm truncate">
                      {convo.subject}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span className={convo.status === 'open' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
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
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center mt-10">
                <p className="text-gray-400 text-sm">Start het gesprek. Typ hieronder je eerste bericht!</p>
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
                    <p
                      className={`text-[10px] mt-1.5 text-right font-medium ${
                        isAdmin ? "text-blue-200" : "text-gray-400"
                      }`}
                    >
                      {new Date(msg.$createdAt).toLocaleTimeString("nl-BE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Footer Input Area (Alleen zichtbaar bij open chat) ─── */}
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
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0870C4] focus:bg-white transition-all text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="bg-[#0870C4] text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-[#0870C4] shrink-0"
              >
                <Send size={18} className="ml-0.5" />
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