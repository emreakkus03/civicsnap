import React, { createContext, useContext, useEffect, useState } from "react";
import client, { appwriteConfig } from "@core/appwrite";

interface RealtimeContextType {
  lastUpdate: number;
  triggerUpdate: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  lastUpdate: Date.now(),
  triggerUpdate: () => {},
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const triggerUpdate = () => {
    setLastUpdate(Date.now());
  };

  useEffect(() => {
    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.reportsCollectionId}.documents`
    ];

    const unsubscribe = client.subscribe(channels, (response) => {
      triggerUpdate();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerUpdate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ lastUpdate, triggerUpdate }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);