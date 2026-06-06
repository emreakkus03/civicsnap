import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, AppStateStatus, LogBox } from "react-native";
import { API } from "@core/networking/api"; 

if (global.WebSocket) {
  const originalSend = global.WebSocket.prototype.send;
  global.WebSocket.prototype.send = function (data) {
    try {
      if (this.readyState === 1) {
        originalSend.call(this, data);
      }
    } catch (error) {
    }
  };
}

LogBox.ignoreLogs([
  "realtime got disconnected", 
  "Software caused connection abort",
  "Invalid state error"
]);

interface RealtimeContextType {
  lastUpdate: number;
  triggerUpdate: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  lastUpdate: Date.now(),
  triggerUpdate: () => {},
});

export const RealtimeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const triggerUpdate = () => {
    console.log("🔄 Data refresh getriggerd...");
    setLastUpdate(Date.now());
  };

  const subscribeToRealtime = () => {
    if (unsubscribeRef.current) return;

    console.log("🔌 Verbinden met Appwrite Realtime...");
    const channels = [
      `databases.${API.config.databaseId}.collections.${API.config.reportsCollectionId}.documents`,
      `databases.${API.config.databaseId}.collections.${API.config.announcementsCollectionId}.documents`,
      `databases.${API.config.databaseId}.collections.${API.config.profilesCollectionId}.documents`
    ];

    unsubscribeRef.current = API.client.subscribe(channels, () => {
      console.log("⚡ Appwrite Realtime event ontvangen!");
      triggerUpdate();
    });
  };

  const unsubscribeFromRealtime = () => {
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current();
        console.log("🛑 Verbinding met Appwrite Realtime netjes verbroken...");
      } catch (error) {
      }
      unsubscribeRef.current = null;
    }
  };

  useEffect(() => {
    subscribeToRealtime();

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          console.log("📱 App back in focus! Verse connectie opzetten...");
          subscribeToRealtime();
          triggerUpdate();
        } else if (nextAppState === "background") {
          console.log("🌙 App gaat slapen, realtime opruimen...");
          unsubscribeFromRealtime();
        }
      }
    );

    return () => {
      subscription.remove();
      unsubscribeFromRealtime();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ lastUpdate, triggerUpdate }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);