import { Platform } from 'react-native';
import { Client, Account, Databases, Storage, Avatars, Functions } from 'react-native-appwrite';


const CONFIG = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || '',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '',
    bundleId: process.env.EXPO_PUBLIC_APP_BUNDLE_ID || '',
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '',
    storageBucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID || '',
    profilesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID|| '',
    categoriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID || '',
    reportsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID || '',
    organizationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID || '',
    announcementsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ANNOUNCEMENTS_COLLECTION_ID || '',
    rewardsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REWARDS_COLLECTION_ID || '',
    userRewardsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_REWARDS_COLLECTION_ID || '',
    conversationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CONVERSATIONS_COLLECTION_ID || '',
    messagesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID || '',
    sendMessageFunctionId: process.env.EXPO_PUBLIC_APPWRITE_FUNCTION_SEND_MESSAGE_ID || '',
    dailySpinFunctionId: process.env.EXPO_PUBLIC_APPWRITE_FUNCTION_DAILY_SPIN_ID || '',
    visionFunctionId: process.env.EXPO_PUBLIC_APPWRITE_FUNCTION_VISION_ID || '',
    rewardPurchaseFunctionId: process.env.EXPO_PUBLIC_APPWRITE_FUNCTION_REWARD_PURCHASE_ID || '',

    google_maps_api_key: Platform.OS === 'ios' 
        ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY || ''
        : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || '',
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
    functions: new Functions(client),
    
    config: {
        databaseId: CONFIG.databaseId, 
        projectId: CONFIG.projectId,
        storageBucketId: CONFIG.storageBucketId,
        profilesCollectionId: CONFIG.profilesCollectionId,
        categoriesCollectionId: CONFIG.categoriesCollectionId,
        reportsCollectionId: CONFIG.reportsCollectionId,
        organizationsCollectionId: CONFIG.organizationsCollectionId,
        announcementsCollectionId: CONFIG.announcementsCollectionId,
        googleMapsApiKey: CONFIG.google_maps_api_key,
        rewardsCollectionId: CONFIG.rewardsCollectionId,
        userRewardsCollectionId: CONFIG.userRewardsCollectionId,
        conversationsCollectionId: CONFIG.conversationsCollectionId,
        messagesCollectionId: CONFIG.messagesCollectionId,
        sendMessageFunctionId: CONFIG.sendMessageFunctionId,
        dailySpinFunctionId: CONFIG.dailySpinFunctionId,
        visionFunctionId: CONFIG.visionFunctionId,
        rewardPurchaseFunctionId: CONFIG.rewardPurchaseFunctionId,
    }
};