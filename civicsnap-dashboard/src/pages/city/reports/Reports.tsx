import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@core/AuthProvider";
import { useRealtime } from "@components/context/RealtimeProvider";

import { Models } from "appwrite";

// --- Importing API functions ---
import { getFilteredReports } from "@api/reportsApi";

// --- Importing UI components ---
import Header from "@components/Header";
import Sidebar from "@components/Sidebar";
import {
  Search,
  MoreHorizontal,
  Image as ImageIcon,
  FileText,
  ArrowDown,
  ArrowUp,
  MapPin,
  Copy,
  Download 
} from "lucide-react";
import { useTranslation } from "react-i18next";

import toast from "react-hot-toast";

interface Report extends Models.Document {
  description: string;
  address: string;
  location_lat: number;
  location_long: number;
  status: string;
  organization_id: string;
  category_id: string;
  category_name?: string;
  photo_url?: string;
  created_at: string;
  is_duplicate: boolean;
}

export default function Reports() {
  const { profile } = useAuth();
  const { lastUpdate } = useRealtime();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
  const [sortOrderDirection, setSortOrderDirection] = useState<"asc" | "desc">("desc");
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // --- AANGEPAST: State voor mobiele sidebar ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setStatusFilter("all");
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, activeTab, sortOrderDirection]);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.organization_id) return;
      setLoading(true);

      try {
        const data = await getFilteredReports({
          organizationId: profile.organization_id,
          searchTerm,
          statusFilter,
          categoryFilter,
          activeTab,
          sortOrderDirection,
          currentPage,
          reportsPerPage,
        });

        setReports(data.reports as unknown as Report[]);
        setTotalReports(data.total);

        if (categories.length === 0) setCategories(data.categories);
      } catch (error) {
        toast.error(t("reports.toast.loadError"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    profile?.organization_id,
    searchTerm,
    statusFilter,
    categoryFilter,
    activeTab,
    sortOrderDirection,
    currentPage,
    categories.length,
    t,
    lastUpdate,
  ]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);

    return date.toLocaleDateString("nl-BE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return { text: "text-red-600", dot: "bg-red-500", bg: "bg-red-50" };
      case "approved":
        return { text: "text-blue-600", dot: "bg-blue-500", bg: "bg-blue-50" };
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
    if (!status) return "";
    const normStatus = status.toLowerCase().trim();
    switch (normStatus) {
      case "new": return t("reports.filterSection.statusOptions.new");
      case "approved": return t("reports.filterSection.statusOptions.approved");
      case "in_progress": return t("reports.filterSection.statusOptions.in_progress");
      case "resolved": return t("reports.filterSection.statusOptions.resolved");
      case "invalid": return t("reports.filterSection.statusOptions.invalid");
      default: return status;
    }
  };

  const exportToCSV = () => {
    if (reports.length === 0) {
      toast.error(t("general.noReports") || "Geen data om te exporteren.");
      return;
    }

    const headers = [
      t("reports.table.date") || "Datum",
      t("reports.table.type") || "Categorie",
      t("reports.table.location") || "Adres",
      t("reports.table.status") || "Status",
      "Omschrijving" 
    ];

    const escapeCSV = (str: string | undefined) => {
      if (!str) return '""';
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = reports.map(report => {
      return [
        escapeCSV(formatDate(report.$createdAt)),
        escapeCSV(report.category_name),
        escapeCSV(report.address),
        escapeCSV(getDisplayStatus(report.status)),
        escapeCSV(report.description)
      ].join(",");
    });

    const csvContent = [
      headers.join(","),
      ...csvRows
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const dateString = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `CivicSnap_Export_${activeTab}_${dateString}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Export succesvol gedownload!");
  };

  return (
    // --- AANGEPAST: Vaste scherm layout ---
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
          <div className="max-w-7xl w-full mx-auto space-y-4 md:space-y-6">
            
            {/* --- AANGEPAST: Flex-col op mobiel, row op grotere schermen --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 md:mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t("reports.title")}
              </h1>
              
              <button
                onClick={exportToCSV}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-medium hover:bg-gray-50 hover:text-[#0870C4] transition-colors shadow-sm text-sm md:text-base"
              >
                <Download size={18} />
                <span>Exporteer CSV</span>
              </button>
            </div>

            {/* --- Tab switcher --- */}
            <div className="flex border-b border-gray-200 mb-4 md:mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab("active")}
                className={`pb-3 md:pb-4 px-4 md:px-6 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                  activeTab === "active"
                    ? "text-[#0870C4]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("reports.pages.active")}
                {activeTab === "active" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("archive")}
                className={`pb-3 md:pb-4 px-4 md:px-6 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                  activeTab === "archive"
                    ? "text-[#0870C4]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("reports.pages.archive")}
                {activeTab === "archive" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                )}
              </button>
            </div>

            {/* --- AANGEPAST: Filters staan op mobiel onder elkaar (flex-col), en springen naar een rij vanaf md --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-end">
              <div className="w-full md:flex-1 md:min-w-[200px]">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                  {t("reports.filterSection.filterLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={t("reports.filterSection.filterPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0870C4] focus:border-transparent transition-all text-sm md:text-base"
                  />
                </div>
              </div>

              <div className="w-full md:w-48">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                  {t("reports.filterSection.statusLabel")}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg md:rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4] cursor-pointer text-sm md:text-base"
                >
                  <option value="all">
                    {t("reports.filterSection.statusOptions.all")}
                  </option>
                  {activeTab === "active" ? (
                    <>
                      <option value="new">{t("reports.filterSection.statusOptions.new")}</option>
                      <option value="approved">{t("reports.filterSection.statusOptions.approved")}</option>
                      <option value="in_progress">{t("reports.filterSection.statusOptions.in_progress")}</option>
                    </>
                  ) : (
                    <>
                      <option value="resolved">{t("reports.filterSection.statusOptions.resolved")}</option>
                      <option value="invalid">{t("reports.filterSection.statusOptions.invalid")}</option>
                    </>
                  )}
                </select>
              </div>

              <div className="w-full md:w-48">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                  {t("reports.filterSection.categoryLabel")}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg md:rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4] cursor-pointer text-sm md:text-base"
                >
                  <option value="all">{t("reports.categories.all")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12 md:py-16 text-gray-400">
                  <span className="text-sm font-medium">
                    {t("general.reportsLoading")}
                  </span>
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 md:py-16 text-gray-400">
                  <FileText size={40} className="mb-3 text-gray-300" />
                  <span className="text-sm font-medium text-center px-4">
                    {t("reports.filterSection.noResultsForFilters")}
                  </span>
                </div>
              ) : (
                // --- AANGEPAST: overflow-x-auto met min-width en whitespace-nowrap ---
                <div className="overflow-x-auto pb-4 md:pb-0">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-16 md:w-20 whitespace-nowrap">
                          {t("reports.table.photo")}
                        </th>
                        <th
                          className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider hover:cursor-pointer whitespace-nowrap select-none"
                          onClick={() => setSortOrderDirection(sortOrderDirection === "desc" ? "asc" : "desc")}
                        >
                          {t("reports.table.date")}
                          {sortOrderDirection === "desc" ? (
                            <ArrowDown size={14} className="inline-block ml-1 text-gray-400" />
                          ) : (
                            <ArrowUp size={14} className="inline-block ml-1 text-gray-400" />
                          )}
                        </th>
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {t("reports.table.type")}
                        </th>
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {t("reports.table.location")}
                        </th>
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {t("reports.table.status")}
                        </th>
                        <th className="py-3 md:py-4 px-4 md:px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                          {t("reports.table.actions")}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {reports.map((report) => {
                        const statusColors = getStatusColor(report.status);
                        return (
                          <tr
                            key={report.$id}
                            onClick={() => navigate(`/reports/${report.$id}`)}
                            className="hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer"
                          >
                            <td className="py-2 md:py-3 px-4 md:px-6">
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                {report.photo_url ? (
                                  <img src={report.photo_url} alt={t("reports.imageAlt")} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon size={20} className="text-gray-300" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 md:py-4 px-4 md:px-6 text-sm text-gray-600 whitespace-nowrap">
                              {formatDate(report.$createdAt)}
                            </td>
                            <td className="py-3 md:py-4 px-4 md:px-6 text-sm text-gray-800 font-medium whitespace-nowrap">
                              {report.category_name}
                            </td>
                            <td className="py-3 md:py-4 px-4 md:px-6">
                              <span className="text-sm text-gray-600 line-clamp-1 max-w-[200px] md:max-w-xs">
                                {report.address || t("reports.addressUnknown")}
                              </span>
                            </td>
                            <td className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-bold ${statusColors.text} ${statusColors.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`}></span>
                                {getDisplayStatus(report.status)}
                              </span>
                            </td>
                            <td className="py-3 md:py-4 px-4 md:px-6 text-center relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(openActionMenuId === report.$id ? null : report.$id);
                                }}
                                className={`p-1.5 md:p-2 rounded-lg transition-colors focus:outline-none ${openActionMenuId === report.$id ? "text-[#0870C4] bg-blue-50" : "text-gray-400 hover:text-[#0870C4] hover:bg-blue-50"}`}
                              >
                                <MoreHorizontal size={20} />
                              </button>

                              {openActionMenuId === report.$id && (
                                <div className="absolute right-10 top-10 md:top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-2 overflow-hidden text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/reports/${report.$id}`);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                  >
                                    <FileText size={16} className="text-gray-400" />
                                    {t("reports.actionMenu.viewDetails")}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`https://maps.google.com/?q=${report.location_lat},${report.location_long}`, "_blank");
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                  >
                                    <MapPin size={16} className="text-gray-400" />
                                    {t("reports.actionMenu.routeMaps")}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(report.address || "");
                                      setOpenActionMenuId(null);
                                      toast.success(t("reports.toast.addressCopied", { address: report.address }));
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors border-t border-gray-50"
                                  >
                                    <Copy size={16} className="text-gray-400" />
                                    {t("reports.actionMenu.copyAddress")}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* --- AANGEPAST: Paginatie controls flex-col op mobiel --- */}
              {totalReports > reportsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 md:px-6 py-4 border-t border-gray-100 bg-gray-50/50 gap-4">
                  <span className="text-xs md:text-sm text-gray-500 text-center sm:text-left">
                    {t("reports.pagination.showing")}{" "}
                    <span className="font-semibold text-gray-900">
                      {(currentPage - 1) * reportsPerPage + 1}
                    </span>{" "}
                    {t("reports.pagination.to")}{" "}
                    <span className="font-semibold text-gray-900">
                      {Math.min(currentPage * reportsPerPage, totalReports)}
                    </span>{" "}
                    {t("reports.pagination.of")}{" "}
                    <span className="font-semibold text-gray-900">
                      {totalReports}
                    </span>{" "}
                    {t("reports.pagination.reportsCount")}
                  </span>

                  <div className="flex gap-2 w-full sm:w-auto justify-center">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1 sm:flex-none text-center"
                    >
                      {t("reports.pagination.previous")}
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={currentPage * reportsPerPage >= totalReports}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1 sm:flex-none text-center"
                    >
                      {t("reports.pagination.next")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}