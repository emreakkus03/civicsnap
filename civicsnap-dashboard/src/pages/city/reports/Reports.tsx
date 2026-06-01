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
  Download // --- NIEUW: Download icon toegevoegd ---
} from "lucide-react";
import { useTranslation } from "react-i18next";

import toast from "react-hot-toast";

// --- Report type definition extending Appwrite's base Document model ---
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
  // --- Auth context to get the current user's profile ---
  const { profile } = useAuth();

  const { lastUpdate } = useRealtime();

  // --- i18n translation hook ---
  const { t } = useTranslation();

  // --- React Router navigation hook ---
  const navigate = useNavigate();

  // --- State: list of reports and total count for pagination ---
  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);

  // --- State: available categories for the category filter dropdown ---
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );

  // --- State: loading indicator while fetching data ---
  const [loading, setLoading] = useState(true);

  // --- State: pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;

  // --- State: search input value ---
  const [searchTerm, setSearchTerm] = useState("");

  // --- State: selected status filter (e.g. "all", "new", "resolved") ---
  const [statusFilter, setStatusFilter] = useState("all");

  // --- State: selected category filter ---
  const [categoryFilter, setCategoryFilter] = useState("all");

  // --- State: active tab – "active" shows open reports, "archive" shows closed ones ---
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");

  // --- State: sort direction for the date column ---
  const [sortOrderDirection, setSortOrderDirection] = useState<"asc" | "desc">(
    "desc",
  );

  // --- State: tracks which report's action menu (three-dot menu) is currently open ---
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // --- Reset the status filter whenever the user switches between active/archive tabs ---
  useEffect(() => {
    setStatusFilter("all");
  }, [activeTab]);

  // --- Reset pagination back to page 1 whenever any filter or sort option changes ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, activeTab, sortOrderDirection]);

  // --- Fetch reports from the API whenever filters, pagination, or sort order change ---
  useEffect(() => {
    const loadData = async () => {
      // Don't fetch if we don't have an organization ID yet
      if (!profile?.organization_id) return;
      setLoading(true);

      try {
        // Call the API with all current filter/sort/pagination parameters
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

        // Update reports list and total count
        setReports(data.reports as unknown as Report[]);
        setTotalReports(data.total);

        // Only set categories once to prevent infinite re-renders
        if (categories.length === 0) setCategories(data.categories);
      } catch (error) {
        // Show an error toast if the API call fails
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

  /**
   * Formats an ISO date string into a localized short date (e.g. "05 Jun 2025").
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

  /**
   * Returns Tailwind CSS color classes (text, dot, background) based on the report status.
   */
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

  /**
   * Returns the translated display label for a given status string.
   */
  const getDisplayStatus = (status: string) => {
    if (!status) return "";
    const normStatus = status.toLowerCase().trim();
    switch (normStatus) {
      case "new":
        return t("reports.filterSection.statusOptions.new");
      case "approved":
        return t("reports.filterSection.statusOptions.approved");
      case "in_progress":
        return t("reports.filterSection.statusOptions.in_progress");
      case "resolved":
        return t("reports.filterSection.statusOptions.resolved");
      case "invalid":
        return t("reports.filterSection.statusOptions.invalid");
      default:
        return status;
    }
  };

  // --- NIEUW: Export to CSV functie ---
  const exportToCSV = () => {
    if (reports.length === 0) {
      toast.error(t("general.noReports") || "Geen data om te exporteren.");
      return;
    }

    // Definieer de headers voor het CSV bestand
    const headers = [
      t("reports.table.date") || "Datum",
      t("reports.table.type") || "Categorie",
      t("reports.table.location") || "Adres",
      t("reports.table.status") || "Status",
      "Omschrijving" // Extra kolom, handig voor Excel!
    ];

    // Helper functie om te zorgen dat kommas in tekst de CSV niet breken
    const escapeCSV = (str: string | undefined) => {
      if (!str) return '""';
      // Vervang quotes door dubbele quotes en omsluit met quotes
      return `"${str.replace(/"/g, '""')}"`;
    };

    // Bouw de rijen op
    const csvRows = reports.map(report => {
      return [
        escapeCSV(formatDate(report.$createdAt)),
        escapeCSV(report.category_name),
        escapeCSV(report.address),
        escapeCSV(getDisplayStatus(report.status)),
        escapeCSV(report.description)
      ].join(",");
    });

    // Combineer headers en rijen
    const csvContent = [
      headers.join(","),
      ...csvRows
    ].join("\n");

    // Maak een Blob en download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Bepaal een duidelijke bestandsnaam met de huidige datum
    const dateString = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `CivicSnap_Export_${activeTab}_${dateString}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Export succesvol gedownload!");
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-inter">
      {/* --- Top navigation header --- */}
      <Header />

      <div className="flex">
        {/* --- Left sidebar with navigation links, "reports" highlighted --- */}
        <Sidebar activeItem="reports" />

        {/* --- Main content area --- */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden p-8">
          <div className="max-w-6xl w-full mx-auto space-y-6">
            
            {/* --- Page title EN Export Knop --- */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                {t("reports.title")}
              </h1>
              
              {/* Export Knop */}
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 hover:text-[#0870C4] transition-colors shadow-sm"
              >
                <Download size={18} />
                <span>Exporteer CSV</span>
              </button>
            </div>

            {/* --- Tab switcher: Active reports vs Archived reports --- */}
            <div className="flex border-b border-gray-200 mb-6">
              {/* Active tab button */}
              <button
                onClick={() => setActiveTab("active")}
                className={`pb-4 px-6 text-sm font-semibold transition-colors relative ${
                  activeTab === "active"
                    ? "text-[#0870C4]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("reports.pages.active")}
                {/* Blue underline indicator for the active tab */}
                {activeTab === "active" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                )}
              </button>

              {/* Archive tab button */}
              <button
                onClick={() => setActiveTab("archive")}
                className={`pb-4 px-6 text-sm font-semibold transition-colors relative ${
                  activeTab === "archive"
                    ? "text-[#0870C4]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("reports.pages.archive")}
                {/* Blue underline indicator for the archive tab */}
                {activeTab === "archive" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                )}
              </button>
            </div>

            {/* --- Filter bar: search input, status dropdown, category dropdown --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-end">
              {/* Search input field */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("reports.filterSection.filterLabel")}
                </label>
                <div className="relative">
                  {/* Search icon inside the input */}
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={t("reports.filterSection.filterPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0870C4] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Status filter dropdown */}
              <div className="w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("reports.filterSection.statusLabel")}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4] cursor-pointer"
                >
                  {/* "All" option is always visible */}
                  <option value="all">
                    {t("reports.filterSection.statusOptions.all")}
                  </option>

                  {/* Show different status options depending on the active tab */}
                  {activeTab === "active" ? (
                    <>
                      {/* Active tab statuses: new, approved, in progress */}
                      <option value="new">
                        {t("reports.filterSection.statusOptions.new")}
                      </option>
                      <option value="approved">
                        {t("reports.filterSection.statusOptions.approved")}
                      </option>
                      <option value="in_progress">
                        {t("reports.filterSection.statusOptions.in_progress")}
                      </option>
                    </>
                  ) : (
                    <>
                      {/* Archive tab statuses: resolved, invalid */}
                      <option value="resolved">
                        {t("reports.filterSection.statusOptions.resolved")}
                      </option>
                      <option value="invalid">
                        {t("reports.filterSection.statusOptions.invalid")}
                      </option>
                    </>
                  )}
                </select>
              </div>

              {/* Category filter dropdown */}
              <div className="w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("reports.filterSection.categoryLabel")}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4] cursor-pointer"
                >
                  {/* "All categories" option */}
                  <option value="all">{t("reports.categories.all")}</option>
                  {/* Dynamically rendered category options from the API */}
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* --- Reports table container --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Show loading state */}
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <span className="text-sm font-medium">
                    {t("general.reportsLoading")}
                  </span>
                </div>
              ) : reports.length === 0 ? (
                /* Show empty state when no reports match the filters */
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileText size={40} className="mb-3 text-gray-300" />
                  <span className="text-sm font-medium">
                    {t("reports.filterSection.noResultsForFilters")}
                  </span>
                </div>
              ) : (
                /* Render the reports table when data is available */
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    {/* --- Table header row --- */}
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {/* Photo column header */}
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-20">
                          {t("reports.table.photo")}
                        </th>

                        {/* Date column header – clickable to toggle sort direction */}
                        <th
                          className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider hover:cursor-pointer"
                          onClick={() =>
                            setSortOrderDirection(
                              sortOrderDirection === "desc" ? "asc" : "desc",
                            )
                          }
                        >
                          {t("reports.table.date")}
                          {/* Show arrow icon indicating current sort direction */}
                          {sortOrderDirection === "desc" ? (
                            <ArrowDown
                              size={14}
                              className="inline-block ml-1 text-gray-400"
                            />
                          ) : (
                            <ArrowUp
                              size={14}
                              className="inline-block ml-1 text-gray-400"
                            />
                          )}
                        </th>

                        {/* Category/type column header */}
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {t("reports.table.type")}
                        </th>

                        {/* Location/address column header */}
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {t("reports.table.location")}
                        </th>

                        {/* Status column header */}
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {t("reports.table.status")}
                        </th>

                        {/* Actions column header (three-dot menu) */}
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                          {t("reports.table.actions")}
                        </th>
                      </tr>
                    </thead>

                    {/* --- Table body: one row per report --- */}
                    <tbody className="divide-y divide-gray-100">
                      {reports.map((report) => {
                        // Get the color classes for this report's status
                        const statusColors = getStatusColor(report.status);
                        return (
                          <tr
                            key={report.$id}
                            // Clicking anywhere on the row navigates to the report detail page
                            onClick={() => navigate(`/reports/${report.$id}`)}
                            className="hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer"
                          >
                            {/* Photo thumbnail cell */}
                            <td className="py-3 px-6">
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                {report.photo_url ? (
                                  // Show the report's photo if available
                                  <img
                                    src={report.photo_url}
                                    alt={t("reports.imageAlt")}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  // Show a placeholder icon if no photo exists
                                  <ImageIcon
                                    size={20}
                                    className="text-gray-300"
                                  />
                                )}
                              </div>
                            </td>

                            {/* Date cell */}
                            <td className="py-4 px-6 text-sm text-gray-600">
                              {formatDate(report.$createdAt)}
                            </td>

                            {/* Category name cell */}
                            <td className="py-4 px-6 text-sm text-gray-800 font-medium">
                              {report.category_name}
                            </td>

                            {/* Address/location cell */}
                            <td className="py-4 px-6">
                              <span className="text-sm text-gray-600">
                                {report.address || t("reports.addressUnknown")}
                              </span>
                            </td>

                            {/* Status badge cell */}
                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${statusColors.text} ${statusColors.bg}`}
                              >
                                {/* Colored dot indicator */}
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`}
                                ></span>
                                {getDisplayStatus(report.status)}
                              </span>
                            </td>

                            {/* Actions menu cell (three-dot button + dropdown) */}
                            <td className="py-4 px-6 text-center relative">
                              {/* Three-dot menu toggle button */}
                              <button
                                onClick={(e) => {
                                  // Prevent the row click from triggering navigation
                                  e.stopPropagation();
                                  // Toggle the action menu open/closed for this report
                                  setOpenActionMenuId(
                                    openActionMenuId === report.$id
                                      ? null
                                      : report.$id,
                                  );
                                }}
                                className={`p-2 rounded-lg transition-colors ${openActionMenuId === report.$id ? "text-[#0870C4] bg-blue-50" : "text-gray-400 hover:text-[#0870C4] hover:bg-blue-50"}`}
                              >
                                <MoreHorizontal size={20} />
                              </button>

                              {/* Dropdown action menu – only visible when this report's menu is open */}
                              {openActionMenuId === report.$id && (
                                <div className="absolute right-10 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-2 overflow-hidden text-left">
                                  {/* Action: View report details */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/reports/${report.$id}`);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                  >
                                    <FileText
                                      size={16}
                                      className="text-gray-400"
                                    />
                                    {t("reports.actionMenu.viewDetails")}
                                  </button>

                                  {/* Action: Open location in Google Maps */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(
                                        `https://maps.google.com/?q=${report.location_lat},${report.location_long}`,
                                        "_blank",
                                      );
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                  >
                                    <MapPin
                                      size={16}
                                      className="text-gray-400"
                                    />
                                    {t("reports.actionMenu.routeMaps")}
                                  </button>

                                  {/* Action: Copy address to clipboard */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(
                                        report.address || "",
                                      );
                                      setOpenActionMenuId(null);
                                      // Show a success toast confirming the address was copied
                                      toast.success(
                                        t("reports.toast.addressCopied", {
                                          address: report.address,
                                        }),
                                      );
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

              {/* --- Pagination controls – only shown when there are more reports than fit on one page --- */}
              {totalReports > reportsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  {/* Text showing the current range of displayed reports (e.g. "1 to 10 of 42") */}
                  <span className="text-sm text-gray-500">
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

                  {/* Previous / Next page buttons */}
                  <div className="flex gap-2">
                    {/* Previous page button – disabled on the first page */}
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {t("reports.pagination.previous")}
                    </button>

                    {/* Next page button – disabled on the last page */}
                    <button
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={currentPage * reportsPerPage >= totalReports}
                      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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