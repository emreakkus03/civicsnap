import React from "react";
import { useTranslation } from "react-i18next";

import { LayoutDashboard, FileText, Users, Megaphone, Settings } from "lucide-react";

interface SidebarProps {
    activeItem: 'dashboard' | 'reports' | 'users' | 'announcements' | 'settings';
}

export default function Sidebar({ activeItem }: SidebarProps) {
    const { t } = useTranslation();

    const menuItems = [
            { label: t('dashboard.menu.dashboard'), icon: LayoutDashboard, href: '/', active: activeItem === 'dashboard' },
            { label: t('dashboard.menu.reports'), icon: FileText, href: '/reports', active: activeItem === 'reports' },
            { label: t('dashboard.menu.users'), icon: Users, href: '/', active: false },
            { label: t('dashboard.menu.announcements'), icon: Megaphone, href: '/', active: false },
            { label: t('dashboard.menu.settings'), icon: Settings, href: '/', active: false },
    ];

     return (
         <aside className="w-64 min-h-[calc(100vh-64px)] bg-white border-r border-gray-200 px-4 py-6 flex-shrink-0">
                    <nav>
                        <ul className="space-y-1">
                            {menuItems.map((item) => (
                                <li key={item.label}>
                                    <a
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                            item.active
                                                ? 'bg-[#0870C4] text-white shadow-md shadow-blue-200'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <item.icon size={18} />
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
    );
}
