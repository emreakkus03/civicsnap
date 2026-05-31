import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, AppStateStatus, LogBox } from "react-native";
import { API } from "@core/networking/api"; 

LogBox.ignoreLogs(["realtime got disconnected", "Software caused connection abort"]);

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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const triggerUpdate = () => {
    console.log("🔄 Data refresh getriggerd...");
    setLastUpdate(Date.now());
  };

  useEffect(() => {
    const channels = [
      `databases.${API.config.databaseId}.collections.${API.config.reportsCollectionId}.documents`,
      `databases.${API.config.databaseId}.collections.${API.config.announcementsCollectionId}.documents`
    ];

    const unsubscribeRealtime = API.client.subscribe(channels, (response) => {
      console.log("⚡ Appwrite Realtime event ontvangen!", response.events);
      if (appStateRef.current === "active") {
        triggerUpdate();
      }
    });

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          console.log("📱 App back in focus! Forceer een data update...");
          triggerUpdate(); 
        }
        appStateRef.current = nextAppState;
      }
    );

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