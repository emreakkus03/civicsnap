import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@core/AuthProvider";
import { databases, appwriteConfig } from "@core/appwrite";
import { Query, Models } from "appwrite";

// --- importing components ---
import Header from "@components/Header";
import Sidebar from "@components/Sidebar";
import {
  Search,
  MoreHorizontal,
  Image as ImageIcon,
  FileText,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
}

export default function Reports() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  const [sortOrderDirection, setSortOrderDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setStatusFilter('all');
  }, [activeTab]);

  useEffect(() => {
    const fetchAllReports = async () => {
      if (!profile?.organization_id) return;
      setLoading(true);

      try {
        const orgResponse = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.organizationsCollectionId,
          profile.organization_id,
        );

        const zipCodes = orgResponse.zip_codes || [];
        if (!zipCodes) {
          setReports([]);
          setLoading(false);
          return;
        }

        const zipCodesArray = zipCodes
          .split(",")
          .map((zip: string) => zip.trim());

        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.reportsCollectionId,
          [
            Query.equal("zip_code", zipCodesArray),
            Query.orderDesc("$createdAt"),
            Query.limit(100),
          ],
        );

        const categoriesResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.categoriesCollectionId,
        );

        const fetchedCategories = categoriesResponse.documents.map(
          (category) => ({
            id: category.$id,
            name: category.name,
          }),
        );
        setCategories(fetchedCategories);
        const categoryDictionary: Record<string, string> = {};
        categoriesResponse.documents.forEach((category) => {
          categoryDictionary[category.$id] = category.name;
        });

        const reportsWithCategoryName = response.documents.map(
          (report: any) => ({
            ...report,
            category_name: categoryDictionary[report.category_id],
          }),
        );

        setReports(reportsWithCategoryName as unknown as Report[]);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllReports();
  }, [profile?.organization_id]);

  const filteredReports = reports.filter((report) => {
    const normalizedStatus = report.status.toLowerCase().trim();

    const isActiveTab = activeTab === 'active';
    const isReportActive = ['new', 'approved', 'in_progress'].includes(normalizedStatus);
    const isReportArchived = ['resolved', 'invalid'].includes(normalizedStatus);

    if (isActiveTab && !isReportActive) return false;
    if (!isActiveTab && !isReportArchived) return false;


    const matchesSearch = report.address
      .toLowerCase()
      .includes(searchTerm.toLowerCase());


    const matchesStatus =
      statusFilter === "all" || normalizedStatus === statusFilter;

    const matchesCategory =
      categoryFilter === "all" || report.category_name === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  }).sort((a, b) => {
    const dateA = new Date(a.$createdAt).getTime();
    const dateB = new Date(b.$createdAt).getTime();

    if (sortOrderDirection === 'desc'){
      return dateB - dateA; 
    } else {
      return dateA - dateB;
    }

  });

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
  return (
    <div className="min-h-screen bg-[#F5F7FA] font-inter">
      <Header />

      <div className="flex">
        <Sidebar activeItem="reports" />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden p-8">
          <div className="max-w-6xl w-full mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              {t("reports.title")}
            </h1>

            <div className="flex border-b border-gray-200 mb-6">
              <button onClick={()=> setActiveTab('active')} className={`pb-4 px-6 text-sm font-semibold transition-colors relative ${
                        activeTab === 'active' ? "text-[#0870C4]" : "text-gray-500 hover:text-gray-700"
                    }`}>

                      {t('reports.pages.active')}
                      {activeTab === 'active' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                    )}

              </button>
              <button onClick={() => setActiveTab('archive')}
                className={`pb-4 px-6 text-sm font-semibold transition-colors relative ${
                        activeTab === 'archive' ? "text-[#0870C4]" : "text-gray-500 hover:text-gray-700"
                    }`}>

                      {t('reports.pages.archive')}
                      {activeTab === 'archive' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0870C4] rounded-t-full"></span>
                    )}

              </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0870C4] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("reports.filterSection.statusLabel")}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4] cursor-pointer"
                >
                  <option value="all">{t("reports.filterSection.statusOptions.all")}</option>
                  {activeTab === 'active' ? (
                    <>

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
                  ): (
                    <>
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

              <div className="w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('reports.filterSection.categoryLabel')}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0870C4] cursor-pointer"
                >
                  <option value="all">Alle</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <span className="text-sm font-medium">
                    {t('general.reportsLoading')}
                  </span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileText size={40} className="mb-3 text-gray-300" />
                  <span className="text-sm font-medium">
                   {t('reports.filterSection.noResultsForFilters')}
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-20">
                          {t('reports.table.photo')}
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider hover:cursor-pointer"
                        onClick={()=> setSortOrderDirection(sortOrderDirection === 'desc' ? 'asc' : 'desc')}>
                          {t('reports.table.date')}
                          {sortOrderDirection === 'desc' ? (
                            <ArrowDown size={14} className="inline-block ml-1 text-gray-400" />
                          ) : (
                            <ArrowUp size={14} className="inline-block ml-1 text-gray-400" />
                          )}
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {t('reports.table.type')}
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {t('reports.table.location')}
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {t('reports.table.status')}
                        </th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                          {t('reports.table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredReports.map((report) => {
                        const statusColors = getStatusColor(report.status);
                        return (
                          <tr
                            key={report.$id}
                            onClick={() => navigate(`/reports/${report.$id}`)}
                            className="hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer"
                          >
                            <td className="py-3 px-6">
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                {report.photo_url ? (
                                  <img
                                    src={report.photo_url}
                                    alt="Melding"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon
                                    size={20}
                                    className="text-gray-300"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-600">
                              {formatDate(report.$createdAt)}
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-800 font-medium">
                              {report.category_name}
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-gray-600">
                                {report.address || "Adres onbekend"}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${statusColors.text} ${statusColors.bg}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`}
                                ></span>
                                {getDisplayStatus(report.status)}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button className="p-2 text-gray-400 hover:text-[#0870C4] hover:bg-blue-50 rounded-lg transition-colors">
                                <MoreHorizontal size={20} />
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
