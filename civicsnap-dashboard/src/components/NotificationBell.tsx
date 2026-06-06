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
                    Query.orderDesc('$createdAt'),
                    Query.limit(50)
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

    const handleNotificationClick = async (notif: any) => {
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.dashboardNotificationsCollectionId,
                notif.$id, 
                { is_read: true }
            );
            
            setIsOpen(false);
            navigate(`/reports/${notif.report_id}`); 

        } catch (error) {
            console.error("Kon melding niet op gelezen zetten:", error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative flex items-center justify-center p-2 rounded-full hover:bg-white/20 transition-colors focus:outline-none"
                aria-label="Notificaties"
            >
                <Bell className="h-6 w-6 text-white" />
                
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full border-2 border-[#0870C4]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                // --- DE FIX ZIT IN DEZE CLASSES ---
                // fixed inset-x-4 top-20: Zet hem vast op het scherm, gecentreerd met wat marge aan de zijkanten, net onder de header.
                // sm:absolute sm:inset-auto sm:-right-2 sm:top-full sm:mt-3 sm:w-80: Herstelt het normale dropdown gedrag op grotere schermen.
                <div className="fixed inset-x-4 top-[72px] sm:absolute sm:inset-auto sm:-right-2 sm:top-full sm:mt-3 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm sm:text-base">
                        Nieuwe Berichten
                    </div>
                    
                    <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">
                                Geen ongelezen berichten.
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.$id} 
                                    onClick={() => handleNotificationClick(notif)}
                                    className="p-3 sm:p-4 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                    <p className="text-xs sm:text-sm text-gray-800 font-medium break-words leading-relaxed">
                                        {notif.message}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5">
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