import React, { useState, useEffect } from "react";
import { Query, Models } from "appwrite";
import {
    GoogleMap,
    useJsApiLoader,
    Marker,
    InfoWindow,
} from "@react-google-maps/api";
import { MapPin, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// --- Importing core utilities ---
import { useAuth } from "@core/AuthProvider";
import { databases, appwriteConfig, googleMapsApiKey } from "@core/appwrite";
import { useRealtime } from "@components/context/RealtimeProvider"; 

// --- Importing UI components ---
import Header from "@components/Header";
import Sidebar from "@components/Sidebar";
import { toast } from "react-hot-toast";

interface Report extends Models.Document {
    description: string;
    address: string;
    location_lat: number;
    location_long: number;
    status: "new" | "approved" | "in_progress" | "resolved" | "invalid" | string;
    organization_id: string;
    category_id: string;
    category_name?: string; 
    created_at: string;
    photo_url?: string;
    is_duplicate: boolean;
}

const mapContainerStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "0.75rem",
};

export default function Dashboard() {
    const { profile } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { lastUpdate } = useRealtime();

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const [kpi, setKpi] = useState({ open: 0, resolvedThisMonth: 0 });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: googleMapsApiKey,
    });

    useEffect(() => {
        const fetchReportsForOrganization = async () => {
            if (!profile?.organization_id) return;

            setLoading(true);

            try {
                const orgResponse = await databases.getDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.organizationsCollectionId,
                    profile.organization_id,
                );

                const zipCodes = orgResponse.zip_codes;

                if (!zipCodes) {
                    console.log("No zip codes found for organization");
                    setReports([]);
                    setLoading(false);
                    return;
                }

                const zipCodesArray = zipCodes
                    .split(",")
                    .map((zip: string) => zip.trim());

                // 1. Haal laatste 10 meldingen op voor de kaart en tabel
                const response = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.reportsCollectionId,
                    [
                        Query.equal("zip_code", zipCodesArray),
                        Query.equal("status", "new"),
                        Query.equal("is_duplicate", false),
                        Query.equal("is_shadowbanned", false),
                        Query.orderDesc("$createdAt"),
                        Query.limit(10),
                    ],
                );

                // 2. Tel alle openstaande meldingen
                const openReportsResponse = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.reportsCollectionId,
                    [
                        Query.equal("zip_code", zipCodesArray),
                        Query.equal("status", ["new", "in_progress"]),
                        Query.equal("is_duplicate", false),
                        Query.equal("is_shadowbanned", false),
                        Query.limit(1)
                    ]
                );

                // 3. Tel alle opgeloste meldingen van deze maand
                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
                const resolvedResponse = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.reportsCollectionId,
                    [
                        Query.equal("zip_code", zipCodesArray),
                        Query.equal("status", "resolved"),
                        Query.greaterThanEqual("$updatedAt", startOfMonth),
                        Query.equal("is_duplicate", false),
                        Query.equal("is_shadowbanned", false),
                        Query.limit(1)
                    ]
                );

                setKpi({
                    open: openReportsResponse.total,
                    resolvedThisMonth: resolvedResponse.total
                });

                // 4. Verwerk de categorie namen
                const categoryDictionary: Record<string, string> = {};
                try {
                    const categoriesResponse = await databases.listDocuments(
                        appwriteConfig.databaseId,
                        appwriteConfig.categoriesCollectionId,
                    );

                    categoriesResponse.documents.forEach((category) => {
                        categoryDictionary[category.$id] = category.name;
                    });
                } catch (error) {
                    console.error("Error fetching categories:", error);
                }

                const reportsWithCategoryName = response.documents.map(
                    (report: any) => ({
                        ...report,
                        category_name: categoryDictionary[report.category_id],
                    }),
                );

                setReports(reportsWithCategoryName as unknown as Report[]);
            } catch (error) {
                console.error(t("dashboard.toast.fetchError"), error);
                toast.error(t("dashboard.toast.fetchError"));
            } finally {
                setLoading(false);
            }
        };

        fetchReportsForOrganization();
    }, [profile?.organization_id, t, lastUpdate]);

    const defaultCenter =
        reports.length > 0
            ? {
                    lat: reports[reports.length - 1].location_lat,
                    lng: reports[reports.length - 1].location_long,
                }
            : { lat: 51.0543, lng: 3.7174 };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "new":
                return { text: "text-red-600", dot: "bg-red-500", bg: "bg-red-50" };
            case "approved":
                return { text: "text-blue-600", dot: "bg-blue-500", bg: "bg-blue-50" };
            case "in progress":
            case "in_progress":
                return {
                    text: "text-orange-600",
                    dot: "bg-orange-500",
                    bg: "bg-orange-50",
                };
            case "resolved":
                return {
                    text: "text-green-600",
                    dot: "bg-green-500",
                    bg: "bg-green-50",
                };
            case "invalid":
                return { text: "text-gray-600", dot: "bg-gray-500", bg: "bg-gray-50" };
            default:
                return { text: "text-gray-600", dot: "bg-gray-500", bg: "bg-gray-50" };
        }
    };

    const getDisplayStatus = (status: string) => {
        const normStatus = status.toLowerCase().trim();
        switch (normStatus) {
            case "new":
                return t("dashboard.status.new");
            case "approved":
                return t("dashboard.status.approved");
            case "in_progress":
            case "in progress":
                return t("dashboard.status.in_progress");
            case "resolved":
                return t("dashboard.status.resolved");
            case "invalid":
                return t("dashboard.status.invalid");
            default:
                return t("dashboard.status.unknown");
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);

        return date.toLocaleDateString("nl-BE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div className="flex flex-col h-screen bg-[#F5F7FA] font-inter">
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar 
                    activeItem="dashboard" 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)} 
                />

                {/* --- AANGEPAST: Responsive padding, overflow scroll en main layout wrapper --- */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
                    {/* Max width zorgt voor centrering op hele grote schermen */}
                    <div className="max-w-7xl w-full mx-auto space-y-6 md:space-y-8">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                            {t("dashboard.title")}
                        </h1>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 flex items-center gap-4">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle size={24} className="text-orange-500 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        Openstaande Meldingen
                                    </p>
                                    <p className="text-2xl md:text-3xl font-bold text-gray-900">
                                        {kpi.open}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 flex items-center gap-4">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 size={24} className="text-green-500 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        Opgelost Deze Maand
                                    </p>
                                    <p className="text-2xl md:text-3xl font-bold text-gray-900">
                                        {kpi.resolvedThisMonth}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* --- AANGEPAST: Variabele hoogte voor de Google Map afhankelijk van schermgrootte --- */}
                        <div className="w-full h-[300px] md:h-[420px] bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-3">
                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={defaultCenter}
                                    zoom={12}
                                    options={{
                                        disableDefaultUI: false,
                                        zoomControl: true,
                                        styles: [
                                            { featureType: "poi", stylers: [{ visibility: "off" }] },
                                        ],
                                    }}
                                >
                                    {reports.map((report) => (
                                        <Marker
                                            key={report.$id}
                                            position={{
                                                lat: report.location_lat,
                                                lng: report.location_long,
                                            }}
                                            onClick={() => setSelectedReport(report)}
                                        />
                                    ))}

                                    {selectedReport && (
                                        <InfoWindow
                                            position={{
                                                lat: selectedReport.location_lat,
                                                lng: selectedReport.location_long,
                                            }}
                                            onCloseClick={() => setSelectedReport(null)}
                                        >
                                            <div className="p-1 max-w-[180px] md:max-w-[200px]">
                                                {selectedReport.photo_url ? (
                                                    <img
                                                        src={selectedReport.photo_url}
                                                        alt={t("dashboard.map.imageAlt")}
                                                        className="w-full h-full object-cover rounded-md mb-2"
                                                    />
                                                ) : (
                                                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-20 md:h-24 mb-2 flex items-center justify-center">
                                                        <FileText className="text-gray-300" size={24} />
                                                    </div>
                                                )}
                                                <h3 className="font-bold text-sm text-gray-900 mb-1 truncate">
                                                    {selectedReport.category_name ||
                                                        t("dashboard.categoryUnknown")}
                                                </h3>
                                                <p className="text-xs text-gray-500 truncate mb-3">
                                                    {selectedReport.address ||
                                                        t("dashboard.addressUnknown")}
                                                </p>
                                                <button
                                                    onClick={() =>
                                                        navigate(`/reports/${selectedReport.$id}`)
                                                    }
                                                    className="w-full bg-[#0870C4] text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                                >
                                                    {t("general.reportActionButtonTitle")}
                                                </button>
                                            </div>
                                        </InfoWindow>
                                    )}
                                </GoogleMap>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl">
                                    <MapPin className="text-gray-300 mb-2" size={32} />
                                    <span className="text-gray-400 text-sm font-medium">
                                        {t("general.loading")}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ===== REPORTS TABLE SECTION ===== */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100">
                                <h2 className="text-base md:text-lg font-bold text-gray-900">
                                    {t("dashboard.latest_reports")}
                                </h2>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-12 md:py-16">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span className="text-sm font-medium">
                                            {t("general.reportsLoading")}
                                        </span>
                                    </div>
                                </div>
                            ) : reports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 md:py-16 text-gray-400">
                                    <FileText size={40} className="mb-3 text-gray-300" />
                                    <span className="text-sm font-medium">
                                        {t("general.noReports")}
                                    </span>
                                </div>
                            ) : (
                                // --- AANGEPAST: Table overflow en whitespace nowrap ---
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[700px]">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="text-left py-3 px-4 md:px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                    {t("dashboard.reportsTable.date")}
                                                </th>
                                                <th className="text-left py-3 px-4 md:px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                    {t("dashboard.reportsTable.type")}
                                                </th>
                                                <th className="text-left py-3 px-4 md:px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                    {t("dashboard.reportsTable.location")}
                                                </th>
                                                <th className="text-left py-3 px-4 md:px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                    {t("dashboard.reportsTable.status")}
                                                </th>
                                                <th className="text-left py-3 px-4 md:px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                    {t("dashboard.reportsTable.actions")}
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-gray-100">
                                            {reports.map((report) => {
                                                const statusColors = getStatusColor(report.status);
                                                return (
                                                    <tr
                                                        key={report.$id}
                                                        className="hover:bg-gray-50 transition-colors duration-150"
                                                    >
                                                        <td className="py-3 md:py-4 px-4 md:px-6 text-sm text-gray-600 whitespace-nowrap">
                                                            {formatDate(report.$createdAt)}
                                                        </td>
                                                        <td className="py-3 md:py-4 px-4 md:px-6 text-sm text-gray-600 whitespace-nowrap">
                                                            {report.category_name}
                                                        </td>
                                                        <td className="py-3 md:py-4 px-4 md:px-6">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-600 line-clamp-1">
                                                                    {report.address}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text}`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`}></span>
                                                                {getDisplayStatus(report.status)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">
                                                            <button
                                                                onClick={() =>
                                                                    navigate(`/reports/${report.$id}`)
                                                                }
                                                                className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-[#0870C4] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                                                            >
                                                                {t("general.reportActionButtonTitle")}
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
                </main>
            </div>
        </div>
    );
}