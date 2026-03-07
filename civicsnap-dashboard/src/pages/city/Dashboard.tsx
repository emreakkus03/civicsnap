import React, { useState, useEffect } from "react";
import { Query, Models } from "appwrite";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { MapPin, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// --- importing core ---
import { useAuth } from "@core/AuthProvider";
import { databases, appwriteConfig, googleMapsApiKey } from "@core/appwrite";
// --- importing components ---
import Header from "@components/Header";
import Sidebar from "@components/Sidebar";

interface Report extends Models.Document {
    description: string;
    address: string;
    location_lat: number;
    location_long: number;
    status: 'new' | 'approved' | 'in_progress' | 'resolved' | 'invalid' | string;
    organization_id: string;
    category_id: string;
    category_name?: string;
    created_at: string;
    photo_url?: string;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.75rem'
};

export default function Dashboard() {
    const { profile } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    

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
                        Query.equal('status', 'new'),
                        Query.orderDesc('$createdAt'),
                        Query.limit(10)
                    ]
                );

                const categoryDictionary: Record<string, string> = {};
                try {
                    const categoriesResponse = await databases.listDocuments(
                        appwriteConfig.databaseId,
                        appwriteConfig.categoriesCollectionId
                    );
                    
                    categoriesResponse.documents.forEach(category => {
                        categoryDictionary[category.$id] = category.name;
                    });
                } catch (error) {
                    console.error("Error fetching categories:", error);
                }



                const reportsWithCategoryName = response.documents.map((report: any) => ({
                    ...report,
                    category_name: categoryDictionary[report.category_id]
                }));
                

                setReports(reportsWithCategoryName as unknown as Report[]);
                    
              
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
            case 'new': return { text: 'text-red-600', dot: 'bg-red-500', bg: 'bg-red-50' };
            case 'approved': return { text: 'text-blue-600', dot: 'bg-blue-500', bg: 'bg-blue-50' };
            case 'in progress': return { text: 'text-orange-600', dot: 'bg-orange-500', bg: 'bg-orange-50' };
            case 'resolved': return { text: 'text-green-600', dot: 'bg-green-500', bg: 'bg-green-50' };
            case 'invalid': return { text: 'text-gray-600', dot: 'bg-gray-500', bg: 'bg-gray-50' };
            default: return { text: 'text-gray-600', dot: 'bg-gray-500', bg: 'bg-gray-50' };
        }
    };

 
    const formatDate = (dateString: string) => {
        if(!dateString) return '';
        const date = new Date(dateString);

        return date.toLocaleDateString('nl-BE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });


    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-inter">
            <Header />

            <div className="flex">
               <Sidebar activeItem="dashboard"/>

                <main className="flex-1 flex flex-col min-w-0 overflow-hidden p-8">
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
                                            onClick={() => setSelectedReport(report)}
                                        />
                                    ))}
                                    {selectedReport && (
                                        <InfoWindow
                                            position={{ lat: selectedReport.location_lat, lng: selectedReport.location_long }}
                                            onCloseClick={() => setSelectedReport(null)}
                                            >
                                                <div className="p-1 max-w-[200px]">
                                                    {selectedReport.photo_url ? (
                                                        <img src={selectedReport.photo_url} alt="Report" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center">
                                                            <FileText className="text-gray-300" size={24} />
                                                        </div>
                                                    )}
                                                    <h3 className="font-bold text-sm text-gray-900 mb-1 truncate">
                                                    {selectedReport.category_name }
                                                </h3>
                                                <p className="text-xs text-gray-500 truncate mb-3">
                                                    {selectedReport.address}
                                                </p>
                                                <button 
                                                    onClick={() => navigate(`/reports/${selectedReport.$id}`)}
                                                    className="w-full bg-[#0870C4] text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                                >
                                                    {t('general.reportActionButtonTitle')}
                                                </button>
                                                </div>

                                            </InfoWindow>
                                    )}
                                </GoogleMap>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl">
                                    <MapPin className="text-gray-300 mb-2" size={32} />
                                    <span className="text-gray-400 text-sm font-medium">{t('general.loading')}</span>
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
                                        <span className="text-sm font-medium">{t('general.reportsLoading')}</span>
                                    </div>
                                </div>
                            ) : reports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <FileText size={40} className="mb-3 text-gray-300" />
                                    <span className="text-sm font-medium">{t('general.noReports')}</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.reportsTable.date')}</th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.reportsTable.type')}</th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.reportsTable.location')}</th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.reportsTable.status')}</th>
                                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.reportsTable.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reports.map((report) => {
                                                const statusColors = getStatusColor(report.status);
                                                return (
                                                    <tr key={report.$id} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="py-4 px-6 text-sm text-gray-600">{formatDate(report.$createdAt)}</td>
                                                        <td className="py-4 px-6 text-sm text-gray-600">{report.category_name}</td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-600">
                                                                    {report.address}
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
                                                            <button onClick={() => navigate(`/reports/${report.$id}`)} className="inline-flex items-center px-4 py-2 text-sm font-semibold text-[#0870C4] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200">
                                                                {t('general.reportActionButtonTitle')}
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