import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Query } from "appwrite";
import {
  databases,
  appwriteConfig,
  googleMapsApiKey,
  functions
} from "@core/appwrite";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

// --- Component imports ---
import Header from "@components/Header";
import Sidebar from "@components/Sidebar";

// --- Icon imports ---
import { Sparkles, ArrowLeft, Image as ImageIcon, User, X } from "lucide-react";

// --- Auth context hook ---
import { useAuth } from "@core/AuthProvider";
import { useChat } from "@components/context/ChatContext";
import { useRealtime } from "@components/context/RealtimeProvider";

import { sanitizeUrl } from '@components/utils/sanitizeUrl';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useTranslation();

  const [report, setReport] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [selectedDuplicate, setSelectedDuplicate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [reporter, setReporter] = useState<any>(null);
  
  // --- AANGEPAST: State voor mobiele sidebar ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { lastUpdate } = useRealtime();
  const { startNewChat } = useChat();

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsApiKey,
  });

  useEffect(() => {
    const fetchReportAndDuplicates = async () => {
      if (!id) return;
      try {
        const response = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.reportsCollectionId,
          id,
        );
        setReport(response);
        setStatus(response.status);
        setAdminNote(response.admin_notes || "");

        if (response.user_id) {
          try {
            const userProfile = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.profilesCollectionId,
              response.user_id
            );
            setReporter(userProfile);
          } catch (err) {
            console.error("Melder kon niet worden geladen (misschien account verwijderd)", err);
          }
        }

        const duplicatesResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.reportsCollectionId,
          [
            Query.equal("original_report_id", id),
            Query.orderDesc("$createdAt"),
            Query.limit(50)
          ],
        );
        setDuplicates(duplicatesResponse.documents);
      } catch (error) {
        toast.error(t("reportsDetail.toast.fetchError"));
      } finally {
        setLoading(false);
      }
    };
    fetchReportAndDuplicates();
  }, [id, t, lastUpdate]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await functions.createExecution(
        appwriteConfig.handleReportUpdateFunctionId, 
        JSON.stringify({
          reportId: id,
          status: status,
          adminNote: adminNote,
          profileId: profile?.$id,
          fullName: profile?.full_name
        }),
        true
      );
      toast.success(t("reportsDetail.updateSuccess"));
      navigate("/reports");
    } catch (error) {
      console.error("Error saving report via function:", error);
      toast.error(t("reportsDetail.toast.saveError"));
      setIsSaving(false);
    }
  };

  const handleShadowbanUser = async () => {
    if (!window.confirm("Weet je zeker dat je deze melder onzichtbaar wilt maken? Al zijn/haar meldingen verdwijnen uit het dashboard.")) return;
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.profilesCollectionId,
        report.user_id,
        { is_shadowbanned: true },
      );
      toast.success("Gebruiker is geshadowbanned! De server is nu bezig met opruimen.");
      setReporter((prev: any) => ({ ...prev, is_shadowbanned: true }));
    } catch (error) {
      console.error("Fout bij shadowbannen:", error);
      toast.error("Er ging iets mis bij het bannen van de gebruiker.");
    }
  };

  const handleStartChat = async () => {
    const subject = prompt("Geef een kort onderwerp op voor deze chat (bijv. 'Vraag over locatie'):");
    if (subject) await startNewChat(report, subject);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-inter-medium">{t("general.loading")}</div>;
  }

  if (!report) {
    return <div className="min-h-screen flex items-center justify-center font-inter-medium">{t("reportsDetail.notFound")}</div>;
  }

  return (
    // --- AANGEPAST: Vaste flex-col h-screen layout ---
    <div className="flex flex-col h-screen bg-[#F5F7FA] font-inter">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeItem="reports" 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />

        {/* --- AANGEPAST: overflow-y-auto en meeschalende padding --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
          <div className="max-w-7xl w-full mx-auto">
            
            {/* Header sectie met terugknop */}
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <button
                onClick={() => navigate("/reports")}
                className="p-1.5 md:p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors focus:outline-none"
                aria-label="Terug"
              >
                <ArrowLeft size={20} className="text-gray-600 md:w-6 md:h-6" />
              </button>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                {t("reportsDetail.title")}
              </h1>
            </div>

            {/* --- AANGEPAST: grid-cols-1 op mobiel, md:grid-cols-2 op tablet, lg:grid-cols-3 op desktop --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              
              {/* --- Column 1: Report photo --- */}
              {/* --- AANGEPAST: min-h verkleind op mobiel --- */}
              <div className="col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[300px] md:min-h-[400px]">
                {report.photo_url ? (
                  <img
                    src={report.photo_url}
                    alt={t("reportsDetail.altMainImage")}
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center absolute inset-0 text-gray-400">
                    {t("reportsDetail.noPhoto")}
                  </div>
                )}

                {report.ai_detected_category && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 backdrop-blur px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-1.5 md:gap-2 shadow-lg w-11/12 md:w-auto max-w-full justify-center">
                    <Sparkles size={16} className="text-orange-500 shrink-0" />
                    <span className="text-xs md:text-sm font-bold text-gray-800 truncate">
                      AI: {report.ai_detected_category} {t("reportsDetail.recognized")}
                    </span>
                  </div>
                )}
              </div>

              {/* --- Column 2: Map, Description AND Reporter Info --- */}
              <div className="col-span-1 flex flex-col gap-4 md:gap-6">
                
                {/* Kaart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4">
                  <div className="w-full h-40 md:h-48 rounded-xl overflow-hidden mb-3">
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        center={{ lat: report.location_lat, lng: report.location_long }}
                        zoom={15}
                        options={{ disableDefaultUI: true }}
                      >
                        <Marker position={{ lat: report.location_lat, lng: report.location_long }} />
                      </GoogleMap>
                    ) : (
                      <div className="w-full h-full bg-gray-100"></div>
                    )}
                  </div>
                  <p className="text-center text-xs md:text-sm font-semibold text-gray-600 px-2 line-clamp-2">
                    {report.address}
                  </p>
                </div>

                {/* Beschrijving */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
                    {t("reportsDetail.descriptionLabel")}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                    "{report.description}"
                  </p>
                </div>

                {/* Melder Info */}
                {reporter && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
                      <User size={18} className="text-[#0870C4] md:w-5 md:h-5" />
                      Gegevens Melder
                    </h3>
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {reporter.avatar_url ? (
                          <img src={sanitizeUrl(reporter.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-gray-400 md:w-6 md:h-6" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm md:text-base truncate">{reporter.full_name}</p>
                        <p className="text-xs md:text-sm text-gray-500 truncate">{reporter.email}</p>
                      </div>
                    </div>
                    
                    {reporter.is_shadowbanned && (
                      <div className="mt-3 md:mt-4 bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm font-bold px-3 py-2 rounded-lg break-words">
                        ⚠️ Let op: Deze melder is momenteel geshadowbanned.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* --- Column 3: Admin action panel --- */}
              {/* --- AANGEPAST: Neemt op tablet (md) de volledige breedte in (col-span-2), maar op desktop weer 1 kolom --- */}
              <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">
                  {t("reportsDetail.actionPanel.title")}
                </h2>

                <div className="mb-4">
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                    {t("reportsDetail.actionPanel.statusLabel")}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={profile?.role === "org_viewer"}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4] text-sm md:text-base"
                  >
                    <option value="new">{t("reportsDetail.actionPanel.statusOptions.new")}</option>
                    <option value="approved">{t("reportsDetail.actionPanel.statusOptions.approved")}</option>
                    <option value="in_progress">{t("reportsDetail.actionPanel.statusOptions.in_progress")}</option>
                    <option value="invalid">{t("reportsDetail.actionPanel.statusOptions.invalid")}</option>
                    <option value="resolved">{t("reportsDetail.actionPanel.statusOptions.resolved")}</option>
                  </select>
                </div>

                <div className="mb-6 md:mb-8 flex-1 min-h-[120px]">
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                    {t("reportsDetail.actionPanel.internNotesLabel")}
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder={t("reportsDetail.actionPanel.internNotesPlaceholder")}
                    disabled={profile?.role === "org_viewer"}
                    className="w-full h-full min-h-[120px] px-3 md:px-4 py-2.5 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] resize-none text-sm md:text-base"
                  />
                </div>

                {profile?.role !== "org_viewer" && (
                  <div className="flex flex-col gap-2.5 md:gap-3 mt-auto">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className={`w-full text-white font-bold py-2.5 md:py-3 px-4 rounded-xl transition-colors shadow-md text-sm md:text-base ${
                        isSaving ? "bg-blue-300 cursor-not-allowed shadow-none" : "bg-[#0870C4] hover:bg-blue-700 shadow-blue-200"
                      }`}
                    >
                      {isSaving ? "Bezig met opslaan..." : t("general.saveButton")}
                    </button>

                    <button
                      onClick={handleShadowbanUser}
                      disabled={reporter?.is_shadowbanned}
                      className={`w-full font-bold py-2.5 md:py-3 px-4 rounded-xl border transition-colors text-sm md:text-base ${
                        reporter?.is_shadowbanned 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700'
                      }`}
                    >
                      {reporter?.is_shadowbanned ? "👻 Melder is geshadowbanned" : "👻 Shadowban Melder"}
                    </button>

                    <button
                      onClick={handleStartChat}
                      className="w-full bg-green-50 text-green-700 font-bold py-2.5 md:py-3 px-4 rounded-xl border border-green-200 hover:bg-green-100 transition-colors flex justify-center items-center gap-2 text-sm md:text-base"
                    >
                      💬 Start Chat met Melder
                    </button>
                  </div>
                )}

                {profile?.role === "org_viewer" && (
                  <p className="text-xs md:text-sm text-gray-500 text-center font-medium mt-4">
                    {t("reportsDetail.actionPanel.viewRights")}
                  </p>
                )}
              </div>
            </div>

            {/* --- Duplicates Section --- */}
            {duplicates.length > 0 && (
              <div className="mt-6 md:mt-8">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">
                  {t("reportsDetail.duplicates.title", { count: duplicates.length })}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {duplicates.map((dup) => (
                    <div
                      key={dup.$id}
                      onClick={() => setSelectedDuplicate(dup)}
                      className="hover:cursor-pointer bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group transition-shadow hover:shadow-md"
                    >
                      <div className="h-28 md:h-32 bg-gray-100 relative">
                        {dup.photo_url ? (
                          <img src={sanitizeUrl(dup.photo_url)} alt={t("reportsDetail.duplicates.altImage")} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="text-gray-300" size={24} />
                          </div>
                        )}
                      </div>
                      <div className="p-3 md:p-4 flex-1 flex flex-col">
                        <p className="text-[10px] md:text-xs text-gray-500 mb-1.5 md:mb-2">
                          {new Date(dup.$createdAt).toLocaleDateString("nl-BE")}
                        </p>
                        <p className="text-xs md:text-sm text-gray-800 line-clamp-3">
                          "{dup.description}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Duplicate Modal --- */}
            {selectedDuplicate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 truncate pr-4">
                      {t("reportsDetail.duplicates.modalTitle")}
                    </h3>
                    <button
                      onClick={() => setSelectedDuplicate(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full focus:outline-none shrink-0"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-4 md:p-6">
                    <div className="w-full h-48 md:h-64 bg-gray-100 rounded-xl mb-4 md:mb-6 overflow-hidden relative">
                      {selectedDuplicate.photo_url ? (
                        <img
                          src={sanitizeUrl(selectedDuplicate.photo_url)}
                          alt={t("reportsDetail.duplicates.altImage")}
                          className="w-full h-full object-contain bg-black/5"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm md:text-base">
                          {t("reportsDetail.noPhoto")}
                        </div>
                      )}
                    </div>

                    <h4 className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">
                      {t("reportsDetail.duplicates.descriptionLabel")}
                    </h4>
                    <p className="text-sm md:text-base text-gray-800 bg-gray-50 p-3 md:p-4 rounded-xl mb-4 border border-gray-100 break-words whitespace-pre-wrap">
                      "{selectedDuplicate.description}"
                    </p>

                    {/* --- AANGEPAST: flex-col op mobiel zodat de tekst niet afbreekt --- */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs md:text-sm text-gray-500">
                      <p>
                        <strong className="text-gray-700">{t("reportsDetail.duplicates.reportedOn")}</strong>{" "}
                        {new Date(selectedDuplicate.$createdAt).toLocaleDateString("nl-BE")}
                      </p>
                      {selectedDuplicate.ai_detected_category && (
                        <p>
                          <strong className="text-gray-700">{t("reportsDetail.duplicates.aiDetection")}</strong>{" "}
                          {selectedDuplicate.ai_detected_category}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}