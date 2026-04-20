import React, { useState, useEffect, useRef, useCallback } from 'react';
import { databases, appwriteConfig } from "@core/appwrite";
import client from "@core/appwrite";
import { Query } from 'appwrite';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell({ orgId }: { orgId: string }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]); 
    const [isOpen, setIsOpen] = useState(false); 
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async () => {
        if (!orgId) return;
        try {
            const response = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.dashboardNotificationsCollectionId,
                [
                    Query.equal('org_id', orgId),
                    Query.equal('is_read', false),
                    Query.orderDesc('$createdAt')
                ]
            );
            setUnreadCount(response.total);
            setNotifications(response.documents);
        } catch (e) {
            console.error("Fout bij ophalen:", e);
        }
    }, [orgId]);

    useEffect(() => {
        fetchNotifications();

        const unsubscribe = client.subscribe(
            `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.dashboardNotificationsCollectionId}.documents`, 
            (response) => {
                if (response.events.some(e => e.includes('.create') || e.includes('.update'))) {
                    fetchNotifications();
                }
            }
        );

        return () => unsubscribe();
    }, [fetchNotifications]);


    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- HIER GEBEURT HET: De klik op een specifieke melding ---
    const handleNotificationClick = async (notif: any) => {
        console.log("Klik op melding:", notif.$id, "voor rapport:", notif.report_id);
        
        try {
            // 1. Markeer deze SPECIFIEKE melding als gelezen in de database
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.dashboardNotificationsCollectionId,
                notif.$id, // Gebruik het ID van de notificatie zelf
                { is_read: true }
            );
            
            // 2. Sluit het menu
            setIsOpen(false);
            
            // 3. Navigeer direct naar de detailpagina van dit specifieke rapport
            // Jouw route in App.tsx is "/reports/:id"
            navigate(`/reports/${notif.report_id}`); 

        } catch (error) {
            console.error("Kon melding niet op gelezen zetten:", error);
        }
    };

    return (
        <div className="relative bg-blue rounded-full " ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative cursor-pointer p-2 rounded-full hover:bg-gray-100 transition"
            >
                <Bell className="h-6 w-6 hover:text-blue-500" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </div>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800">
                        Nieuwe Berichten
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">
                                Geen ongelezen berichten.
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.$id} 
                                    onClick={() => handleNotificationClick(notif)}
                                    className="p-4 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                    <p className="text-sm text-gray-800 font-medium">{notif.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(notif.$createdAt).toLocaleString('nl-BE')}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}