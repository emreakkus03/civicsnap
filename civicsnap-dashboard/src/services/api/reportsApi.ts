import {databases, appwriteConfig} from "@core/appwrite";
import { Query } from "appwrite";


interface FetchReportsParams {
    organizationId: string;
    searchTerm: string;
    statusFilter: string;
    categoryFilter: string;
    activeTab: 'active' | 'archive';
    sortOrderDirection: 'asc' | 'desc';
    currentPage: number;
    reportsPerPage: number;
}

export const getFilteredReports = async (params: FetchReportsParams) => {
    const {
        organizationId,
        searchTerm,
        statusFilter,
        categoryFilter,
        activeTab,
        sortOrderDirection,
        currentPage,
        reportsPerPage,
    } = params;

    try {
        const orgResponse = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.organizationsCollectionId,
            organizationId
        );

        const zipCodesArray = (orgResponse.zip_codes || "").split(",").map((z: string) => z.trim());
        
        if (!zipCodesArray.length) {
            return { reports: [], total: 0, categories: [] };
        }

        const queries = [
            Query.equal("zip_code", zipCodesArray),
            Query.equal("is_duplicate", false),
            Query.equal("is_shadowbanned", false),
            Query.limit(reportsPerPage),
            Query.offset((currentPage - 1) * reportsPerPage),
            sortOrderDirection === 'desc' ? Query.orderDesc("$createdAt") : Query.orderAsc("$createdAt")
        ];

        if (statusFilter !== "all") {
            queries.push(Query.equal("status", statusFilter));
        } else {
            if (activeTab === 'active') {
                queries.push(Query.equal("status", ['new', 'approved', 'in_progress']));
            } else {
                queries.push(Query.equal("status", ['resolved', 'invalid']));
            }
        }

        if (categoryFilter !== "all") {
            queries.push(Query.equal("category_id", categoryFilter));
        }

        if (searchTerm) {
            queries.push(Query.search("address", searchTerm));
        }

        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.reportsCollectionId,
            queries
        );

        const catRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.categoriesCollectionId
        );
        
        const catDict: Record<string, string> = {};
        const fetchedCategories = catRes.documents.map((c: any) => {
            catDict[c.$id] = c.name;
            return { id: c.$id, name: c.name };
        });

        const mappedReports = response.documents.map((r: any) => ({
            ...r,
            category_name: catDict[r.category_id] || "Onbekend"
        }));

        return { 
            reports: mappedReports, 
            total: response.total, 
            categories: fetchedCategories 
        };
    } catch (error) {
        console.error("API Error fetching reports:", error);
        throw error;
    }
};