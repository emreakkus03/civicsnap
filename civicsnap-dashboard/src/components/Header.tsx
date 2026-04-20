import React, { useState, useEffect } from "react";

import { useAuth } from "@core/AuthProvider";
import { useTranslation } from "react-i18next";

import { databases, appwriteConfig } from "@core/appwrite";

import NotificationBell from "@components/NotificationBell";

/**
 * Header component displayed at the top of the dashboard.
 * Shows the organization logo (or fallback text) on the left,
 * and a user profile dropdown menu on the right.
 */
export default function Header() {
    // Get user profile and logout function from the authentication context
    const { profile, logout } = useAuth();

    // State to toggle the visibility of the user dropdown menu
    const [showDropdown, setShowDropdown] = useState(false);

    // Check if the current user is a super admin (affects what is displayed in the header)
    const isSuperAdmin = profile?.role === 'super_admin';

    // Hook for internationalization / translations
    const { t } = useTranslation();

    // State to hold the organization logo URL fetched from the database
    const [orgLogo, setOrgLogo] = useState<string | null>(null);

    // Fetch the organization logo when the user has an organization and is not a super admin
    useEffect(() => {
        if (profile?.organization_id && !isSuperAdmin) {
            const fetchLogo = async () => {
                try {
                    // Retrieve the organization document from the Appwrite database
                    const orgData = await databases.getDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.organizationsCollectionId,
                        profile.organization_id
                    );
                    // If a logo URL exists on the organization document, store it in state
                    if (orgData.logo_url) setOrgLogo(orgData.logo_url);
                } catch (error) {
                    console.error("Error fetching logo:", error);
                }
            };
            fetchLogo();
        }
    }, [profile?.organization_id, isSuperAdmin]);

    return (
        // Main header bar with blue background, white text, and a drop shadow
        <header className="bg-[#0870C4] text-white px-6 py-4 flex justify-between items-center shadow-md relative z-50">

            {/* Left section: Organization branding / logo */}
            <div className="flex items-center">
                {isSuperAdmin ? (
                    // Super admins see a simple text title instead of a logo
                    <h1 className="text-xl font-bold tracking-wide">{t('header.superAdminTitle')}</h1>
                ) : (
                    // Regular users see the organization logo or a fallback placeholder
                    orgLogo ? (
                        // Display the organization logo image with white background container
                        <img
                            src={orgLogo}
                            alt={t('header.logoAlt')}
                            className="h-10 w-auto max-w-[200px] object-contain bg-white px-3 py-1 rounded-md shadow-sm"
                        />
                    ) : (
                        // Fallback: show a styled text badge when no logo is available
                        <div className="bg-[#1DA1F2] bg-opacity-90 px-3 py-2 rounded-md font-bold text-white text-lg flex items-center shadow-sm">
                            {profile?.organization_id ? t('header.municipalityFallback') : t('header.cityFallback')}
                        </div>
                    )
                )}

            </div>

             

           {/* Right section: Notifications & User profile */}
            <div className="flex items-center gap-4">
                
                {/* Notificatie Belletje staat nu netjes rechts */}
                <NotificationBell orgId={profile?.organization_id} />

                {/* User profile button and dropdown menu */}
                <div className="relative">
                    {/* Button that toggles the dropdown menu on click */}
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
                                {t('header.unknownUser')}
                            </div>
                        )}
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl py-2 z-50 text-gray-800 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* User info section at the top of the dropdown */}
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-inter-bold truncate">{profile?.full_name || t('header.fallbackName')}</p>
                                <p className="text-xs text-gray-500 capitalize">{profile?.role.replace('_', ' ')}</p>
                            </div>

                            {/* Logout button */}
                            <button
                                onClick={logout}
                                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 flex items-center gap-3 text-sm font-inter-semibold transition-colors"
                            >
                                {t('general.logoutButton')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}