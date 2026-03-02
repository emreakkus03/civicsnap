import { Client, Account, Databases, Teams } from "appwrite";

export const appwriteConfig = {
    endpoint: process.env.REACT_APP_APPWRITE_ENDPOINT || "",
    projectId: process.env.REACT_APP_APPWRITE_PROJECT_ID || "",
    databaseId: process.env.REACT_APP_APPWRITE_DATABASE_ID || "",
    profilesCollectionId: process.env.REACT_APP_APPWRITE_PROFILES_COLLECTION_ID || "",
    organizationsCollectionId: process.env.REACT_APP_APPWRITE_ORGANIZATIONS_COLLECTION_ID || "",
    reportsCollectionId: process.env.REACT_APP_APPWRITE_REPORTS_COLLECTION_ID || "",
    categoriesCollectionId: process.env.REACT_APP_APPWRITE_CATEGORIES_COLLECTION_ID || "",
};


export const googleMapsApiKey = process.env.REACT_APP_GOOGLEMAPS_API || "";
const client = new Client()

client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId); 

export const account = new Account(client);
export const databases = new Databases(client);
export const teams = new Teams(client);


export default client;