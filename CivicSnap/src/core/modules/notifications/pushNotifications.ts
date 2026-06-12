import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { API } from "@core/networking/api";

export async function registerForPushNotifications(userId: string) {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    console.log('Push notificaties genegeerd in Android Expo Go om crash te voorkomen.');
    return null;
  }

     if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    
     try {
        await API.database.updateDocument(
            API.config.databaseId,
            API.config.profilesCollectionId,
            userId,
            { push_token: token }
        );
    } catch (e) {
        console.error("Error saving push token:", e);
    }

    return token;
}