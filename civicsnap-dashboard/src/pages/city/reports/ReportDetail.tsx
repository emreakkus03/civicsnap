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

// --- Icon imports (User toegevoegd!) ---
import { Sparkles, ArrowLeft, Image as ImageIcon, User } from "lucide-react";

// --- Auth context hook ---
import { useAuth } from "@core/AuthProvider";
import { useChat } from "@components/context/ChatContext";
import { useRealtime } from "@components/context/RealtimeProvider";

/**
 * ReportDetail page component.
 * Displays full details of a single report, including photo, map location,
 * description, admin actions (status + notes), and any duplicate reports.
 */
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
  
  // --- NIEUW: State voor de gegevens van de melder ---
  const [reporter, setReporter] = useState<any>(null);

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
        // 1. Fetch main report
        const response = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.reportsCollectionId,
          id,
        );
        setReport(response);
        setStatus(response.status);
        setAdminNote(response.admin_notes || "");

        // 2. NIEUW: Fetch profiel van de melder op basis van user_id in de report
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

        // 3. Fetch duplicates
        const duplicatesResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.reportsCollectionId,
          [
            Query.equal("original_report_id", id),
            Query.orderDesc("$createdAt"),
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
    if (
      !window.confirm(
        "Weet je zeker dat je deze melder onzichtbaar wilt maken? Al zijn/haar meldingen verdwijnen uit het dashboard.",
      )
    )
      return;

    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.profilesCollectionId,
        report.user_id,
        { is_shadowbanned: true },
      );

      toast.success(
        "Gebruiker is geshadowbanned! De server is nu bezig met opruimen.",
      );
      // Optioneel: Update de lokale reporter state zodat de UI meteen meegaat
      setReporter((prev: any) => ({ ...prev, is_shadowbanned: true }));
      // navigate("/reports"); // Mss beter om op de pagina te blijven om het resultaat te zien!
    } catch (error) {
      console.error("Fout bij shadowbannen:", error);
      toast.error("Er ging iets mis bij het bannen van de gebruiker.");
    }
  };

  const handleStartChat = async () => {
    const subject = prompt("Geef een kort onderwerp op voor deze chat (bijv. 'Vraag over locatie'):");
    
    if (subject) {
      await startNewChat(report, subject);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-inter-medium">
        {t("general.loading")}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center font-inter-medium">
        {t("reportsDetail.notFound")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-inter">
      <Header />

      <div className="flex">
        <Sidebar activeItem="reports" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => navigate("/reports")}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("reportsDetail.title")}
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* --- Column 1: Report photo --- */}
              <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative min-h-[400px]">
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
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                    <Sparkles size={16} className="text-orange-500" />
                    <span className="text-sm font-bold text-gray-800">
                      AI: {report.ai_detected_category} {t("reportsDetail.recognized")}
                    </span>
                  </div>
                )}
              </div>

              {/* --- Column 2: Map, Description AND Reporter Info --- */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="w-full h-48 rounded-xl overflow-hidden mb-3">
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        center={{
                          lat: report.location_lat,
                          lng: report.location_long,
                        }}
                        zoom={15}
                        options={{ disableDefaultUI: true }}
                      >
                        <Marker
                          position={{
                            lat: report.location_lat,
                            lng: report.location_long,
                          }}
                        />
                      </GoogleMap>
                    ) : (
                      <div className="w-full h-full bg-gray-100"></div>
                    )}
                  </div>
                  <p className="text-center text-sm font-semibold text-gray-600">
                    {report.address}
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {t("reportsDetail.descriptionLabel")}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    "{report.description}"
                  </p>
                </div>

                {/* --- NIEUW: Melder Informatie Kaart --- */}
                {reporter && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User size={20} className="text-[#0870C4]" />
                      Gegevens Melder
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {reporter.avatar_url ? (
                          <img src={reporter.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{reporter.full_name}</p>
                        <p className="text-sm text-gray-500">{reporter.email}</p>
                      </div>
                    </div>
                    
                    {/* Toon een rode badge als de gebruiker een shadowban heeft */}
                    {reporter.is_shadowbanned && (
                      <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-2 rounded-lg inline-block">
                        ⚠️ Let op: Deze melder is momenteel geshadowbanned.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* --- Column 3: Admin action panel --- */}
              <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {t("reportsDetail.actionPanel.title")}
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("reportsDetail.actionPanel.statusLabel")}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={profile?.role === "org_viewer"}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4]"
                  >
                    <option value="new">{t("reportsDetail.actionPanel.statusOptions.new")}</option>
                    <option value="approved">{t("reportsDetail.actionPanel.statusOptions.approved")}</option>
                    <option value="in_progress">{t("reportsDetail.actionPanel.statusOptions.in_progress")}</option>
                    <option value="invalid">{t("reportsDetail.actionPanel.statusOptions.invalid")}</option>
                    <option value="resolved">{t("reportsDetail.actionPanel.statusOptions.resolved")}</option>
                  </select>
                </div>

                <div className="mb-8 flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("reportsDetail.actionPanel.internNotesLabel")}
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder={t("reportsDetail.actionPanel.internNotesPlaceholder")}
                    disabled={profile?.role === "org_viewer"}
                    className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] resize-none"
                  />
                </div>

                {profile?.role !== "org_viewer" && (
                  <div className="flex flex-col gap-3 mt-4">
                    <button
    onClick={handleSave}
    disabled={isSaving}
    className={`w-full text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md ${
      isSaving 
        ? "bg-blue-300 cursor-not-allowed shadow-none" 
        : "bg-[#0870C4] hover:bg-blue-700 shadow-blue-200"
    }`}
  >
    {isSaving ? "Bezig met opslaan..." : t("general.saveButton")}
  </button>

                    <button
                      onClick={handleShadowbanUser}
                      disabled={reporter?.is_shadowbanned}
                      className={`w-full font-bold py-3 px-4 rounded-xl border transition-colors ${
                        reporter?.is_shadowbanned 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700'
                      }`}
                    >
                      {reporter?.is_shadowbanned ? "👻 Melder is geshadowbanned" : "👻 Shadowban Melder"}
                    </button>

                    <button
                      onClick={handleStartChat}
                      className="w-full bg-green-50 text-green-700 font-bold py-3 px-4 rounded-xl border border-green-200 hover:bg-green-100 transition-colors flex justify-center items-center gap-2"
                    >
                      💬 Start Chat met Melder
                    </button>
                  </div>
                )}

                {profile?.role === "org_viewer" && (
                  <p className="text-sm text-gray-500 text-center font-medium mt-4">
                    {t("reportsDetail.actionPanel.viewRights")}
                  </p>
                )}
              </div>
            </div>

            {/* --- Duplicates Section --- */}
            {duplicates.length > 0 && (
              <div className="mt-8 ">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {t("reportsDetail.duplicates.title", { count: duplicates.length })}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {duplicates.map((dup) => (
                    <div
                      key={dup.$id}
                      onClick={() => setSelectedDuplicate(dup)}
                      className="hover:cursor-pointer bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                    >
                      <div className="h-32 bg-gray-100 relative">
                        {dup.photo_url ? (
                          <img
                            src={dup.photo_url}
                            alt={t("reportsDetail.duplicates.altImage")}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="text-gray-300" size={24} />
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-xs text-gray-500 mb-2">
                          {new Date(dup.$createdAt).toLocaleDateString("nl-BE")}
                        </p>
                        <p className="text-sm text-gray-800 line-clamp-3">
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
                    <h3 className="text-lg font-bold text-gray-900">
                      {t("reportsDetail.duplicates.modalTitle")}
                    </h3>
                    <button
                      onClick={() => setSelectedDuplicate(null)}
                      className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full"
                    >
                      <span className="font-bold text-xl leading-none">
                        &times;
                      </span>
                    </button>
                  </div>

                  <div className="overflow-y-auto p-6">
                    <div className="w-full h-64 bg-gray-100 rounded-xl mb-6 overflow-hidden relative">
                      {selectedDuplicate.photo_url ? (
                        <img
                          src={selectedDuplicate.photo_url}
                          alt={t("reportsDetail.duplicates.altImage")}
                          className="w-full h-full object-contain bg-black/5"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {t("reportsDetail.noPhoto")}
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {t("reportsDetail.duplicates.descriptionLabel")}
                    </h4>
                    <p className="text-gray-800 bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                      "{selectedDuplicate.description}"
                    </p>

                    <div className="flex gap-4 text-sm text-gray-500">
                      <p>
                        <strong>
                          {t("reportsDetail.duplicates.reportedOn")}
                        </strong>{" "}
                        {new Date(
                          selectedDuplicate.$createdAt,
                        ).toLocaleDateString("nl-BE")}
                      </p>
                      {selectedDuplicate.ai_detected_category && (
                        <p>
                          <strong>
                            {t("reportsDetail.duplicates.aiDetection")}
                          </strong>{" "}
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