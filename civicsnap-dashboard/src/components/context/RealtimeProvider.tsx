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
    let unsubscribe: (() => void) | null = null;
    
    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.reportsCollectionId}.documents`
    ];

    // Helper functie om de WebSocket vers op te starten
    const connectRealtime = () => {
      if (!unsubscribe) {
        unsubscribe = client.subscribe(channels, (response) => {
          triggerUpdate();
        });
      }
    };

    // Helper functie om de WebSocket netjes af te breken
    const disconnectRealtime = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    // 1. Start de connectie als de component mount
    connectRealtime();

    // 2. Beheer de connectie op basis van tab-zichtbaarheid
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Gebruiker is terug: maak een frisse connectie en haal laatste data op
        connectRealtime();
        triggerUpdate(); 
      } else {
        // Tab is onzichtbaar/naar de achtergrond: verbreek de connectie om zombie-sockets te voorkomen
        disconnectRealtime();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Cleanup als de hele provider unmount
    return () => {
      disconnectRealtime();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ lastUpdate, triggerUpdate }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => useContext(RealtimeContext);