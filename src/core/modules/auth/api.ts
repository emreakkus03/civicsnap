import { API } from "@/core/networking/api";
import { ID, Models } from "react-native-appwrite";
import {UserProfile} from "@core/networking/database.types";



const filePreparingForUploadingFiles = (fileUri: string, fileName: string) => {
  const type = fileUri.endsWith('.png') ? 'image/png' : 'image/jpeg';

  return {
    uri: fileUri,
    name: fileName,
    type: type, 
    size: 0,
  };
}

export type LoginBody ={
    email: string;
    password: string;
};

export type RegisterBody = {
    email: string;
    password: string;
    fullname: string;
    avatarUri?: string;
};

export const getCurrentSession = async (): Promise<Models.User<Models.Preferences> | null> => {
  try {
    
    const user = await API.auth.get();
    return user;
  } catch (error) {
  
    return null;
  }
};

export const login = async ({ email, password }: LoginBody) => {
  try {

    const session = await API.auth.createEmailPasswordSession(email, password);
    
 
    const user = await API.auth.get();
    return user; 
  } catch (error) {
    
    return Promise.reject(error);
  }
};

export const register = async ({ email, password, fullname, avatarUri }: RegisterBody) => {
  try {

    const newAccount = await API.auth.create(ID.unique(), email, password, fullname);
    
    
    await API.auth.createEmailPasswordSession(email, password);

    let avatarUrl = null;
    
    
    if (avatarUri) {
      try {
        
        const file = filePreparingForUploadingFiles(avatarUri, `avatar_${newAccount.$id}.jpg`);
        
        const uploadResponse = await API.storage.createFile(
            API.config.storageBucketId, 
            ID.unique(), 
            file
        );
   
    
       const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
        const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
        const bucketId = API.config.storageBucketId;
        const fileId = uploadResponse.$id;

        
        avatarUrl = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;

        console.log("7. Generated URL:", avatarUrl);
      } catch (uploadError) {
        console.log("Avatar upload error.", uploadError);
      }
    }


    await API.database.createDocument(
        API.config.databaseId,      
        API.config.profilesCollectionId, 
        newAccount.$id, 
        {
            email: email,
            full_name: fullname,
            avatar_url: avatarUrl,
            current_points: 0,
            lifetime_points: 0,
            role: "citizen",
            is_banned: false
        }
    );
    
  
    return await API.auth.get();

  } catch (error) {
    return Promise.reject(error);
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const profile = await API.database.getDocument(
      API.config.databaseId,
      API.config.profilesCollectionId,
      userId
    );
    return profile as unknown as UserProfile;
  } catch (error) {
    return null;
  }
};

export const logout = async () => {
  try {
    await API.auth.deleteSession('current');
    return Promise.resolve();
  } catch (error: any) {
    if (error?.message?.includes('missing scopes') || error?.message?.includes('guests')) {
      console.log('Session already invalidated, proceeding with logout.');
      return Promise.resolve();
    }
    return Promise.reject(error);
  }
};