import React from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, FileText, Megaphone, Settings, Gift, Building2, BarChart3, X } from "lucide-react";
import { useAuth } from "@core/AuthProvider";

interface SidebarProps {
    activeItem: 'dashboard' | 'reports' | 'users' | 'announcements' | 'settings' | 'rewards' | 'organizations' | 'statistics';
    isOpen?: boolean;       // Nieuw
    onClose?: () => void;   // Nieuw
}

export default function Sidebar({ activeItem, isOpen, onClose }: SidebarProps) {
    const { t } = useTranslation();
    const { profile } = useAuth();

    const cityMenuItems = [
        { label: t('dashboard.menu.dashboard'), icon: LayoutDashboard, href: '/', active: activeItem === 'dashboard' },
        { label: t('dashboard.menu.reports'), icon: FileText, href: '/reports', active: activeItem === 'reports' },
        { label: t('dashboard.menu.statistics'), icon: BarChart3, href: '/statistics', active: activeItem === 'statistics' },
        { label: t('dashboard.menu.announcements'), icon: Megaphone, href: '/announcements', active: activeItem === 'announcements' },
        { label: t('dashboard.menu.rewards'), icon: Gift, href: '/rewards', active: activeItem === 'rewards' },
        { label: t('dashboard.menu.settings'), icon: Settings, href: '/settings', active: activeItem === 'settings'},
    ];

    const superAdminMenuItems = [
        { label: t('dashboard.menu.organizations'), icon: Building2, href: '/', active: activeItem === 'organizations' },
        { label: t('dashboard.menu.rewards'), icon: Gift, href: '/rewards', active: activeItem === 'rewards' },
        { label: t('dashboard.menu.settings'), icon: Settings, href: '/settings', active: activeItem === 'settings' },
    ];

    const menuItems = profile?.role === 'super_admin' ? superAdminMenuItems : cityMenuItems;

    return (
        <>
            {/* Achtergrond overlay voor mobiel: klik er op om sidebar te sluiten */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
                    onClick={onClose}
                />
            )}

            <aside 
                className={`
                    fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                    lg:relative lg:translate-x-0 lg:h-[calc(100vh-64px)] 
                    flex-shrink-0 overflow-y-auto
                `}
            >
                {/* Sluit-knop bovenaan de sidebar voor mobiele gebruikers */}
                <div className="flex justify-between items-center p-4 lg:hidden border-b border-gray-100">
                    <span className="font-bold text-gray-700">Menu</span>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                <nav className="p-4">
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
        </>
    );
}