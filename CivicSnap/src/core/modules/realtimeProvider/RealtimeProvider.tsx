import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";

import { API } from "@core/networking/api"; 

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
  const appStateRef = useRef<AppStateStatus>("active");

  const triggerUpdate = () => {
    console.log("🔄 Data refresh getriggerd...");
    setLastUpdate(Date.now());
  };

  useEffect(() => {
    // 1. AppState listener (voor als app uit achtergrond ontwaakt)
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          console.log("📱 App back in focus! Refreshing immediately...");
          triggerUpdate();
        }
        appStateRef.current = nextAppState;
      },
    );

    const channels = [
      `databases.${API.config.databaseId}.collections.${API.config.reportsCollectionId}.documents`
    ];


    const unsubscribeRealtime = API.client.subscribe(channels, (response) => {
      console.log("⚡ Appwrite Realtime event ontvangen!", response.events);
      
      if (appStateRef.current === "active") {
        triggerUpdate();
      }
    });

    return () => {
      subscription.remove();
      unsubscribeRealtime(); 
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ lastUpdate, triggerUpdate }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);