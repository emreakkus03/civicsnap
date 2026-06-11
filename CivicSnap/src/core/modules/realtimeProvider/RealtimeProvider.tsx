import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, AppStateStatus, LogBox, Platform } from "react-native";
import { API } from "@core/networking/api"; 

// FIX 1: Gebruik globalThis in plaats van global, en typeer 'data' als any
if (globalThis.WebSocket) {
  const originalSend = globalThis.WebSocket.prototype.send;
  globalThis.WebSocket.prototype.send = function (this: any, data: any) {
    try {
      if (this.readyState === 1) {
        originalSend.call(this, data);
      }
    } catch (error) {
      // Stilzwijgend opvangen
    }
  };
}

// FIX 2: Hoofdlettergevoelige logs toegevoegd om de Metro popups definitief te muten
LogBox.ignoreLogs([
  "Realtime got disconnected", 
  "realtime got disconnected",
  "Stream end encountered",
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
        // Al verbroken op de achtergrond
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
          // OPTIMALISATIE: Eerst eventuele zombie-connecties killen voordat we een nieuwe openen
          unsubscribeFromRealtime(); 
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