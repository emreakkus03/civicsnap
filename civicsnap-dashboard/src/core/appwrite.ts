import { Client, Account, Databases, Teams, Storage, Functions } from "appwrite";

export const appwriteConfig = {
    endpoint: process.env.REACT_APP_APPWRITE_ENDPOINT || "",
    projectId: process.env.REACT_APP_APPWRITE_PROJECT_ID || "",
    databaseId: process.env.REACT_APP_APPWRITE_DATABASE_ID || "",
    profilesCollectionId: process.env.REACT_APP_APPWRITE_PROFILES_COLLECTION_ID || "",
    organizationsCollectionId: process.env.REACT_APP_APPWRITE_ORGANIZATIONS_COLLECTION_ID || "",
    reportsCollectionId: process.env.REACT_APP_APPWRITE_REPORTS_COLLECTION_ID || "",
    categoriesCollectionId: process.env.REACT_APP_APPWRITE_CATEGORIES_COLLECTION_ID || "",
    storageBucketId: process.env.REACT_APP_APPWRITE_BUCKET_ID || "",
    announcementsCollectionId: process.env.REACT_APP_APPWRITE_ANNOUNCEMENTS_COLLECTION_ID || "",
    rewardsCollectionId: process.env.REACT_APP_APPWRITE_REWARDS_COLLECTION_ID || "",
    conversationsCollectionId: process.env.REACT_APP_APPWRITE_CONVERSATIONS_COLLECTION_ID || "",
    messagesCollectionId: process.env.REACT_APP_APPWRITE_MESSAGES_COLLECTION_ID || "",
    startChatFunctionId: process.env.REACT_APP_APPWRITE_FUNCTION_START_CHAT_ID || "",
    sendMessageFunctionId: process.env.REACT_APP_APPWRITE_FUNCTION_SEND_MESSAGE_ID || "",
};


export const googleMapsApiKey = process.env.REACT_APP_GOOGLEMAPS_API || "";
const client = new Client()
export const functions = new Functions(client);

client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId); 

export const account = new Account(client);
export const databases = new Databases(client);
export const teams = new Teams(client);
export const storage = new Storage(client);


export default client;