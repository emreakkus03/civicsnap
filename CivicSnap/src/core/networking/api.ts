import { Client, Account, Databases, Storage, Avatars } from 'react-native-appwrite';


const CONFIG = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '',
    bundleId: process.env.EXPO_PUBLIC_APP_BUNDLE_ID || '',
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 'CivicSnapDB',
    storageBucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID || 'avatars',
    profilesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID|| 'profiles',
    categoriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID || 'categories',
    reportsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID || 'reports',
    google_maps_api_key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    organizationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID || 'organizations',
};


const client = new Client();

client
    .setEndpoint(CONFIG.endpoint)
    .setProject(CONFIG.projectId)
    .setPlatform(CONFIG.bundleId);


export const API = {
    client: client,                 
    auth: new Account(client),      
    database: new Databases(client),
    storage: new Storage(client),   
    avatars: new Avatars(client),   
    
    
    config: {

        databaseId: CONFIG.databaseId, 
        storageBucketId: CONFIG.storageBucketId,
        profilesCollectionId: CONFIG.profilesCollectionId,
        categoriesCollectionId: CONFIG.categoriesCollectionId,
        reportsCollectionId: CONFIG.reportsCollectionId,
        organizationsCollectionId: CONFIG.organizationsCollectionId,
        googleMapsApiKey: CONFIG.google_maps_api_key,
    }
};