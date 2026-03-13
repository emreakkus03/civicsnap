import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";

interface RealtimeContextType {
  lastUpdate: number;
}

const RealtimeContext = createContext<RealtimeContextType>({
  lastUpdate: Date.now(),
});

export const RealtimeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const appStateRef = useRef<AppStateStatus>("active");

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only poll when the app is active
      if (appStateRef.current === "active") {
        setLastUpdate(Date.now());
      }
    }, 10000);

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          console.log("📱 App back in focus! Refreshing immediately...");
          setLastUpdate(Date.now());
        }
        appStateRef.current = nextAppState;
      },
    );

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ lastUpdate }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);