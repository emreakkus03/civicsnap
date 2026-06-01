import React, { useState, useEffect } from "react";
import { Query, Models } from "appwrite";
import {
    GoogleMap,
    useJsApiLoader,
    Marker,
    InfoWindow,
} from "@react-google-maps/api";
import { MapPin, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// --- Importing core utilities ---
import { useAuth } from "@core/AuthProvider";
import { databases, appwriteConfig, googleMapsApiKey } from "@core/appwrite";
import { useRealtime } from "@components/context/RealtimeProvider"; // --- NIEUW: Realtime import ---

// --- Importing UI components ---
import Header from "@components/Header";
import Sidebar from "@components/Sidebar";
import { toast } from "react-hot-toast";

/**
 * Report interface extending the Appwrite Document model.
 * Represents a citizen report with location, status, and category info.
 */
interface Report extends Models.Document {
    description: string;
    address: string;
    location_lat: number;
    location_long: number;
    status: "new" | "approved" | "in_progress" | "resolved" | "invalid" | string;
    organization_id: string;
    category_id: string;
    category_name?: string; // Resolved category name (not stored in DB, added client-side)
    created_at: string;
    photo_url?: string;
    is_duplicate: boolean;
}

/** Styling for the Google Map container */
const mapContainerStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "0.75rem",
};

/**
 * Dashboard page component for city officials.
 * Displays a map with report markers and a table of the latest reports
 * filtered by the organization's zip codes.
 */
export default function Dashboard() {
    // Get the authenticated user's profile from the auth context
    const { profile } = useAuth();
    // Translation hook for i18n support
    const { t } = useTranslation();
    // Navigation hook for programmatic routing
    const navigate = useNavigate();
    
    // --- NIEUW: Realtime hook aanroepen ---
    const { lastUpdate } = useRealtime();

    // State: list of reports fetched from the database
    const [reports, setReports] = useState<Report[]>([]);
    // State: loading indicator while fetching data
    const [loading, setLoading] = useState(true);
    // State: currently selected report (for the map InfoWindow popup)
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    // Load the Google Maps JavaScript API
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: googleMapsApiKey,
    });

    /**
     * Effect: Fetch reports belonging to the user's organization.
     * Runs when the organization ID changes.
     */
    useEffect(() => {
        const fetchReportsForOrganization = async () => {
            // Exit early if the user has no associated organization
            if (!profile?.organization_id) return;

            setLoading(true);

            try {
                // Step 1: Fetch the organization document to get its zip codes
                const orgResponse = await databases.getDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.organizationsCollectionId,
                    profile.organization_id,
                );

                const zipCodes = orgResponse.zip_codes;

                // If no zip codes are configured, there are no reports to show
                if (!zipCodes) {
                    console.log("No zip codes found for organization");
                    setReports([]);
                    setLoading(false);
                    return;
                }

                // Step 2: Parse the comma-separated zip codes into an array
                const zipCodesArray = zipCodes
                    .split(",")
                    .map((zip: string) => zip.trim());

                // Step 3: Query reports that match the organization's zip codes,
                // are new, not duplicates, sorted by newest first, limited to 10
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

                // Step 4: Build a category ID -> name dictionary for display purposes
                const categoryDictionary: Record<string, string> = {};
                try {
                    const categoriesResponse = await databases.listDocuments(
                        appwriteConfig.databaseId,
                        appwriteConfig.categoriesCollectionId,
                    );

                    // Map each category document ID to its name
                    categoriesResponse.documents.forEach((category) => {
                        categoryDictionary[category.$id] = category.name;
                    });
                } catch (error) {
                    console.error("Error fetching categories:", error);
                }

                // Step 5: Enrich each report with its resolved category name
                const reportsWithCategoryName = response.documents.map(
                    (report: any) => ({
                        ...report,
                        category_name: categoryDictionary[report.category_id],
                    }),
                );

                // Update state with the enriched reports
                setReports(reportsWithCategoryName as unknown as Report[]);
            } catch (error) {
                // Show an error toast if fetching fails
                console.error(t("dashboard.toast.fetchError"), error);
                toast.error(t("dashboard.toast.fetchError"));
            } finally {
                // Always stop the loading indicator
                setLoading(false);
            }
        };

        fetchReportsForOrganization();
    }, [profile?.organization_id, t, lastUpdate]); // --- NIEUW: lastUpdate toegevoegd ---

    // Determine the default map center: use the last report's location,
    // or fall back to Ghent, Belgium coordinates
    const defaultCenter =
        reports.length > 0
            ? {
                    lat: reports[reports.length - 1].location_lat,
                    lng: reports[reports.length - 1].location_long,
                }
            : { lat: 51.0543, lng: 3.7174 };

    /**
     * Returns Tailwind CSS color classes based on the report status.
     * Used for styling status badges in the table and elsewhere.
     */
    const getStatusColor = (status: string) => {
        switch (status) {
            case "new":
                return { text: "text-red-600", dot: "bg-red-500", bg: "bg-red-50" };
            case "approved":
                return { text: "text-blue-600", dot: "bg-blue-500", bg: "bg-blue-50" };
            case "in progress":
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

    /**
     * Returns a translated, human-readable display label for a given status string.
     * Normalizes the status to lowercase before matching.
     */
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

    /**
     * Formats an ISO date string into a localized short date (Belgian Dutch locale).
     * Example output: "05 jan. 2025"
     */
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
        <div className="min-h-screen bg-[#F5F7FA] font-inter">
            {/* Top navigation header */}
            <Header />

            <div className="flex">
                {/* Left sidebar navigation with "dashboard" highlighted as the active item */}
                <Sidebar activeItem="dashboard" />

                {/* Main content area */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden p-8">
                    <div className="max-w-6xl w-full mx-auto space-y-8">
                        {/* Page title */}
                        <h1 className="text-2xl font-bold text-gray-900">
                            {t("dashboard.title")}
                        </h1>

                        {/* ===== MAP SECTION ===== */}
                        <div className="w-full h-[420px] bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                            {isLoaded ? (
                                // Render the Google Map once the API has loaded
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={defaultCenter}
                                    zoom={12}
                                    options={{
                                        disableDefaultUI: false,
                                        zoomControl: true,
                                        // Hide points of interest for a cleaner map
                                        styles: [
                                            { featureType: "poi", stylers: [{ visibility: "off" }] },
                                        ],
                                    }}
                                >
                                    {/* Place a marker on the map for each report */}
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

                                    {/* Show an InfoWindow popup when a marker is clicked */}
                                    {selectedReport && (
                                        <InfoWindow
                                            position={{
                                                lat: selectedReport.location_lat,
                                                lng: selectedReport.location_long,
                                            }}
                                            onCloseClick={() => setSelectedReport(null)}
                                        >
                                            <div className="p-1 max-w-[200px]">
                                                {/* Display the report photo if available, otherwise show a placeholder */}
                                                {selectedReport.photo_url ? (
                                                    <img
                                                        src={selectedReport.photo_url}
                                                        alt={t("dashboard.map.imageAlt")}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center">
                                                        <FileText className="text-gray-300" size={24} />
                                                    </div>
                                                )}
                                                {/* Report category name */}
                                                <h3 className="font-bold text-sm text-gray-900 mb-1 truncate">
                                                    {selectedReport.category_name ||
                                                        t("dashboard.categoryUnknown")}
                                                </h3>
                                                {/* Report address */}
                                                <p className="text-xs text-gray-500 truncate mb-3">
                                                    {selectedReport.address ||
                                                        t("dashboard.addressUnknown")}
                                                </p>
                                                {/* Button to navigate to the full report detail page */}
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
                                // Show a loading placeholder while the Google Maps API is loading
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
                            {/* Table header / title */}
                            <div className="px-6 py-5 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {t("dashboard.latest_reports")}
                                </h2>
                            </div>

                            {/* Conditional rendering: loading spinner, empty state, or the data table */}
                            {loading ? (
                                // Loading state: show a spinner with a message
                                <div className="flex items-center justify-center py-16">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        <span className="text-sm font-medium">
                                            {t("general.reportsLoading")}
                                        </span>
                                    </div>
                                </div>
                            ) : reports.length === 0 ? (
                                // Empty state: no reports found for this organization
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <FileText size={40} className="mb-3 text-gray-300" />
                                    <span className="text-sm font-medium">
                                        {t("general.noReports")}
                                    </span>
                                </div>
                            ) : (
                                // Data table: list of reports with details and action buttons
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        {/* Table column headers */}
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {t("dashboard.reportsTable.date")}
                                                </th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {t("dashboard.reportsTable.type")}
                                                </th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {t("dashboard.reportsTable.location")}
                                                </th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {t("dashboard.reportsTable.status")}
                                                </th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {t("dashboard.reportsTable.actions")}
                                                </th>
                                            </tr>
                                        </thead>

                                        {/* Table body: one row per report */}
                                        <tbody className="divide-y divide-gray-100">
                                            {reports.map((report) => {
                                                // Get the color scheme for this report's status
                                                const statusColors = getStatusColor(report.status);
                                                return (
                                                    <tr
                                                        key={report.$id}
                                                        className="hover:bg-gray-50 transition-colors duration-150"
                                                    >
                                                        {/* Date column */}
                                                        <td className="py-4 px-6 text-sm text-gray-600">
                                                            {formatDate(report.$createdAt)}
                                                        </td>
                                                        {/* Category/type column */}
                                                        <td className="py-4 px-6 text-sm text-gray-600">
                                                            {report.category_name}
                                                        </td>
                                                        {/* Address/location column */}
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-600">
                                                                    {report.address}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        {/* Status badge column */}
                                                        <td className="py-4 px-6">
                                                            <span
                                                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text}`}
                                                            >
                                                                {/* Small colored dot indicator */}
                                                                <span
                                                                    className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`}
                                                                ></span>
                                                                {getDisplayStatus(report.status)}
                                                            </span>
                                                        </td>
                                                        {/* Action button column: navigates to the report detail page */}
                                                        <td className="py-4 px-6">
                                                            <button
                                                                onClick={() =>
                                                                    navigate(`/reports/${report.$id}`)
                                                                }
                                                                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-[#0870C4] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
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