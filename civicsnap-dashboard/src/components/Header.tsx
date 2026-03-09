import React, {useState, useEffect} from "react";

import { useAuth } from "@core/AuthProvider";
import { useTranslation } from "react-i18next";

import { databases, appwriteConfig } from "@core/appwrite";


export default function Header() {
    const { profile, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    const isSuperAdmin = profile?.role === 'super_admin';
        const { t } = useTranslation();

        const [orgLogo, setOrgLogo] = useState<string | null>(null);
        useEffect(() => {
        if (profile?.organization_id && !isSuperAdmin) {
            const fetchLogo = async () => {
                try {
                    const orgData = await databases.getDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.organizationsCollectionId,
                        profile.organization_id
                    );
                    if (orgData.logo_url) setOrgLogo(orgData.logo_url);
                } catch (error) {
                    console.error("Error fetching logo:", error);
                }
            };
            fetchLogo();
        }
    }, [profile?.organization_id, isSuperAdmin]);

    return (
        <header className="bg-[#0870C4] text-white px-6 py-4 flex justify-between items-center shadow-md relative z-50">
<div className="flex items-center">
                {isSuperAdmin ? (
                    <h1 className="text-xl font-bold tracking-wide">CivicSnap Master Admin</h1>
                ) : (
                   
                    orgLogo ? (
                        <img 
                            src={orgLogo} 
                            alt="Gemeente Logo" 
                            className="h-10 w-auto max-w-[200px] object-contain bg-white px-3 py-1 rounded-md shadow-sm"
                        />
                    ) : (
                        <div className="bg-[#1DA1F2] bg-opacity-90 px-3 py-2 rounded-md font-bold text-white text-lg flex items-center shadow-sm">
                            {profile?.organization_id ? 'gemeente:' : 'stad:'}
                        </div>
                    )
                )}
            </div>

            <div className="relative">
                <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none"
                >
                    {profile?.avatar_url ? (
                        <img 
                            src={profile.avatar_url} 
                            alt="profile" 
                            className="w-10 h-10 rounded-full border-2 border-white object-cover bg-white"
                        />
                    ) : (
                        <div className="bg-gray-100 rounded-full text-gray-400 border-2 border-transparent hover:border-white transition-all">
                            user
                        </div>
                    )}
                </button>

                
                {showDropdown && (
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl py-2 z-50 text-gray-800 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-inter-bold truncate">{profile?.full_name || 'Admin'}</p>
                            <p className="text-xs text-gray-500 capitalize">{profile?.role.replace('_', ' ')}</p>
                        </div>
                        <button 
                            onClick={logout}
                            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 flex items-center gap-3 text-sm font-inter-semibold transition-colors"
                        >
                            
                           {t('general.logoutButton')}
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}