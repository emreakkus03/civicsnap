import React, { createContext, useContext, useEffect, useState } from "react";
import { API } from "@core/networking/api";

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

  useEffect(() => {
    const unsubscribe = API.client.subscribe(
      [
        `databases.${API.config.databaseId}.collections.${API.config.reportsCollectionId}.documents`,
        `databases.${API.config.databaseId}.collections.${API.config.announcementsCollectionId}.documents`,
      ],
      (response) => {
        setLastUpdate(Date.now());
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ lastUpdate }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);