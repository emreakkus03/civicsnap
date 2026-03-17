import React from "react";
import { useTranslation } from "react-i18next";

// Import icons from the lucide-react icon library
import { LayoutDashboard, FileText, Megaphone, Settings,  Gift, Building2 } from "lucide-react";

import { useAuth } from "@core/AuthProvider";

// Define the props interface for the Sidebar component
// activeItem determines which menu item is currently highlighted
interface SidebarProps {
    activeItem: 'dashboard' | 'reports' | 'users' | 'announcements' | 'settings' | 'rewards' | 'organizations';
}

// Sidebar component: renders a vertical navigation menu on the left side of the page
export default function Sidebar({ activeItem }: SidebarProps) {
    // Hook to access translation functions for multi-language support
    const { t } = useTranslation();
    const { profile } = useAuth();

    // Define the list of navigation menu items
    // Each item has a translated label, an icon component, a link (href), and an active state
    const cityMenuItems = [
            { label: t('dashboard.menu.dashboard'), icon: LayoutDashboard, href: '/', active: activeItem === 'dashboard' },
            { label: t('dashboard.menu.reports'), icon: FileText, href: '/reports', active: activeItem === 'reports' },
            { label: t('dashboard.menu.announcements'), icon: Megaphone, href: '/announcements', active: activeItem === 'announcements' },
            { label: t('dashboard.menu.settings'), icon: Settings, href: '/settings', active: activeItem === 'settings'},
    ];

    const superAdminMenuItems = [
         { label: t('dashboard.menu.organizations'), icon: Building2, href: '/', active: activeItem === 'organizations' },
        { label: t('dashboard.menu.rewards'), icon: Gift, href: '/rewards', active: activeItem === 'rewards' },
        { label: t('dashboard.menu.settings'), icon: Settings, href: '/settings', active: activeItem === 'settings' },
    ];

    const menuItems = profile?.role === 'super_admin' ? superAdminMenuItems : cityMenuItems;

     return (
         // Sidebar container: fixed width, full height minus header (64px), sticky positioning,
         // white background with a right border, and vertical scrolling if content overflows
         <aside className="w-64 h-[calc(100vh-64px)] sticky top-0 bg-white border-r border-gray-200 px-4 py-6 flex-shrink-0 overflow-y-auto z-10">
                    {/* Navigation wrapper */}
                    <nav>
                        {/* List of menu items with small vertical spacing between them */}
                        <ul className="space-y-1">
                            {/* Loop through each menu item and render it */}
                            {menuItems.map((item) => (
                                <li key={item.label}>
                                    {/* Menu link: styled differently based on whether it is the active item or not */}
                                    <a
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                            item.active
                                                // Active state: blue background, white text, and a subtle shadow
                                                ? 'bg-[#0870C4] text-white shadow-md shadow-blue-200'
                                                // Inactive state: gray text with a hover effect that lightens the background
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        {/* Render the icon component for this menu item */}
                                        <item.icon size={18} />
                                        {/* Render the translated label text */}
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
    );
}
