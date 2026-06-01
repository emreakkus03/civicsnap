import { useEffect, useState } from "react";
import { useAuth } from "@core/AuthProvider";
import { databases, appwriteConfig } from "@core/appwrite";
import { Query } from "appwrite";
import Header from "@components/Header";
import Sidebar from "@components/Sidebar";
import { BarChart3, Filter } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const COLORS = ["#0870C4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

export default function Statistics() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("month");
  
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState({ total: 0, resolved: 0, avgTime: 0 });

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!profile?.organization_id) return;
      setLoading(true);

      try {
        const orgResponse = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.organizationsCollectionId,
          profile.organization_id
        );

        const zipCodesArray = orgResponse.zip_codes.split(",").map((zip: string) => zip.trim());

        const queries = [
          Query.equal("zip_code", zipCodesArray),
          Query.equal("is_duplicate", false),
          Query.equal("is_shadowbanned", false),
          Query.limit(5000)
        ];

        const now = new Date();
        if (timeFilter === "month") {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          queries.push(Query.greaterThanEqual("$createdAt", startOfMonth));
        } else if (timeFilter === "year") {
          const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
          queries.push(Query.greaterThanEqual("$createdAt", startOfYear));
        }

        const categoriesResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.categoriesCollectionId
        );
        const categoryDict: Record<string, string> = {};
        categoriesResponse.documents.forEach(cat => {
          categoryDict[cat.$id] = cat.name;
        });

        const reportsResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.reportsCollectionId,
          queries
        );

        const reports = reportsResponse.documents;

        const total = reports.length;
        const resolved = reports.filter(r => r.status === "resolved").length;
        setKpiData({ total, resolved, avgTime: 0 });

        const catCounts: Record<string, number> = {};
        reports.forEach(report => {
          const catName = categoryDict[report.category_id] || t("statistics.unknown");
          catCounts[catName] = (catCounts[catName] || 0) + 1;
        });
        
        const formattedCatData = Object.keys(catCounts).map(key => ({
          name: key,
          value: catCounts[key]
        })).sort((a, b) => b.value - a.value);
        
        setCategoryData(formattedCatData);

        const currentLanguage = i18n.language || "nl-BE";
        const incomingKey = t("statistics.charts.incoming");
        const resolvedKey = t("statistics.charts.resolved");
        const monthlyCounts: Record<string, { [key: string]: number }> = {};
        
        if (timeFilter === "year" || timeFilter === "all") {
          for (let i = 0; i <= now.getMonth(); i++) {
             const dummyDate = new Date(now.getFullYear(), i, 1);
             const monthStr = dummyDate.toLocaleDateString(currentLanguage, { month: "short" });
             monthlyCounts[monthStr] = { [incomingKey]: 0, [resolvedKey]: 0 };
          }
        }

        reports.forEach(report => {
          const date = new Date(report.$createdAt);
          const monthStr = date.toLocaleDateString(currentLanguage, { month: "short" });
          
          if (!monthlyCounts[monthStr]) {
            monthlyCounts[monthStr] = { [incomingKey]: 0, [resolvedKey]: 0 };
          }
          
          monthlyCounts[monthStr][incomingKey] = (monthlyCounts[monthStr][incomingKey] || 0) + 1;
          if (report.status === "resolved") {
            monthlyCounts[monthStr][resolvedKey] = (monthlyCounts[monthStr][resolvedKey] || 0) + 1;
          }
        });

        const formattedMonthData = Object.keys(monthlyCounts).map(key => ({
          month: key,
          ...monthlyCounts[key]
        }));
        
        setMonthlyData(formattedMonthData);

      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error(t("statistics.toast.loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [profile?.organization_id, timeFilter, t, i18n.language]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-inter">
      <Header />
      <div className="flex">
        <Sidebar activeItem="statistics" />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden p-8">
          <div className="max-w-6xl w-full mx-auto space-y-8">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 text-[#0870C4]">
                  <BarChart3 size={24} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t("statistics.title")}
                </h1>
              </div>

              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="bg-transparent font-medium text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="month">{t("statistics.filter.month")}</option>
                  <option value="year">{t("statistics.filter.year")}</option>
                  <option value="all">{t("statistics.filter.all")}</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-400 font-medium">{t("statistics.loading")}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{t("statistics.kpi.total")}</p>
                    <p className="text-4xl font-black text-gray-900">{kpiData.total}</p>
                    <p className="text-sm text-gray-400 mt-1">{t("statistics.kpi.periodDescription")}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{t("statistics.kpi.resolved")}</p>
                    <p className="text-4xl font-black text-green-600">{kpiData.resolved}</p>
                    <p className="text-sm text-gray-400 mt-1">{t("statistics.kpi.periodDescription")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">{t("statistics.charts.categoriesTitle")}</h3>
                    <div className="h-72">
                      {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: any) => [`${value ?? 0} ${t("statistics.charts.reportsCount")}`, t("statistics.charts.countLabel")]} 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">{t("statistics.charts.noData")}</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">{t("statistics.charts.trendTitle")}</h3>
                    <div className="h-72">
                      {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                            <Tooltip 
                               cursor={{fill: '#F3F4F6'}}
                               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar dataKey={t("statistics.charts.incoming")} fill="#0870C4" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey={t("statistics.charts.resolved")} fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                         <div className="h-full flex items-center justify-center text-gray-400">{t("statistics.charts.noData")}</div>
                      )}
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}