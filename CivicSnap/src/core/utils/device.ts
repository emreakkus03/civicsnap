import * as Application from 'expo-application';
import { Platform } from 'react-native';

export async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      return await Application.getAndroidId();
    } else {
      return await Application.getIosIdForVendorAsync();
    }
  } catch (error) {
    console.error("Fout bij ophalen device ID", error);
    return null;
  }
}