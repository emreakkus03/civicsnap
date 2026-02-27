import React, { useState, useEffect } from "react";
import { useAuth } from "@core/AuthProvider";
import { databases, appwriteConfig, googleMapsApiKey } from "@core/appwrite";
import { Query, Models } from "appwrite";
import Header from "@components/Header";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { LayoutDashboard, Bell, Users, Settings, MapPin, FileText, Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Report extends Models.Document {
    title: string;
    description: string;
    location_lat: number;
    location_long: number;
    status: 'New' | 'In Progress' | 'Resolved' | 'Invalid' | string;
    organization_id: string;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.75rem'
};

export default function Dashboard() {
    const { profile } = useAuth();
    const { t } = useTranslation();

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: googleMapsApiKey
    });

    useEffect(() => {
        const fetchReportsForOrganization = async () => {
            if (!profile?.organization_id) return;

            setLoading(true);

            try {
                const orgResponse = await databases.getDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.organizationsCollectionId,
                    profile.organization_id
                );

                const zipCodes = orgResponse.zip_codes;

                if (!zipCodes) {
                    console.log("No zip codes found for organization");
                    setReports([]);
                    setLoading(false);
                    return;
                }

                const zipCodesArray = zipCodes.split(',').map((zip: string) => zip.trim());
                
                const response = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.reportsCollectionId,
                    [
                        Query.equal('zip_code', zipCodesArray),
                        Query.orderDesc('$createdAt'),
                        Query.limit(10)
                    ]
                );
                setReports(response.documents as unknown as Report[]);
            } catch (error) {
                console.error("Error fetching reports:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReportsForOrganization();
    }, [profile?.organization_id]);

    const defaultCenter = reports.length > 0
        ? { lat: reports[reports.length - 1].location_lat, lng: reports[reports.length - 1].location_long }
        : { lat: 51.0543, lng: 3.7174 };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return { text: 'text-red-600', dot: 'bg-red-500', bg: 'bg-red-50' };
            case 'In Progress': return { text: 'text-orange-600', dot: 'bg-orange-500', bg: 'bg-orange-50' };
            case 'Resolved': return { text: 'text-green-600', dot: 'bg-green-500', bg: 'bg-green-50' };
            case 'Invalid': return { text: 'text-gray-600', dot: 'bg-gray-500', bg: 'bg-gray-50' };
            default: return { text: 'text-gray-600', dot: 'bg-gray-500', bg: 'bg-gray-50' };
        }
    };

    const menuItems = [
        { label: t('dashboard.menu.dashboard'), icon: LayoutDashboard, href: '/', active: true },
        { label: t('dashboard.menu.reports'), icon: FileText, href: '/', active: false },
        { label: t('dashboard.menu.users'), icon: Users, href: '/', active: false },
        { label: t('dashboard.menu.announcements'), icon: Megaphone, href: '/', active: false },
        { label: t('dashboard.menu.settings'), icon: Settings, href: '/', active: false },
    ];

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-inter">
            <Header />

            <div className="flex">
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

                <section className="flex-1 flex flex-col min-w-0 overflow-hidden p-8">
                    <div className="max-w-6xl w-full mx-auto space-y-8">
                        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

                        <div className="w-full h-[420px] bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={defaultCenter}
                                    zoom={12}
                                    options={{
                                        disableDefaultUI: false,
                                        zoomControl: true,
                                        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
                                    }}
                                >
                                    {reports.map((report) => (
                                        <Marker
                                            key={report.$id}
                                            position={{ lat: report.location_lat, lng: report.location_long }}
                                            title="Report Location"
                                        />
                                    ))}
                                </GoogleMap>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl">
                                    <MapPin className="text-gray-300 mb-2" size={32} />
                                    <span className="text-gray-400 text-sm font-medium">Kaart laden...</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900">{t('dashboard.latest_reports')}</h2>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span className="text-sm font-medium">Meldingen ophalen...</span>
                                    </div>
                                </div>
                            ) : reports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <FileText size={40} className="mb-3 text-gray-300" />
                                    <span className="text-sm font-medium">Geen meldingen gevonden.</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Locatie</th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actie</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reports.map((report) => {
                                                const statusColors = getStatusColor(report.status);
                                                return (
                                                    <tr key={report.$id} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-2">
                                                                <MapPin size={14} className="text-gray-400" />
                                                                <span className="text-sm text-gray-600">
                                                                    {report.location_lat.toFixed(4)}, {report.location_long.toFixed(4)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`}></span>
                                                                {report.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <button className="inline-flex items-center px-4 py-2 text-sm font-semibold text-[#0870C4] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200">
                                                                Bekijk
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}