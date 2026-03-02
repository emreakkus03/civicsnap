import  React, {createContext, useState, useEffect, useContext} from 'react';
import { account, databases, appwriteConfig } from '@core/appwrite';
import { Models } from 'appwrite';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    loading: boolean;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const currentUser = await account.get();
            setUser(currentUser);
            try {
                const userProfile = await databases.getDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.profilesCollectionId,
                    currentUser.$id
                );
                setProfile(userProfile);
            } catch (error) {
                console.error("Geen profiel gevonden in de database:", error);
                setProfile(null);
            }
        } catch (error) {
            setUser(null);
            setProfile(null);
        }finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await account.deleteSessions();
            setUser(null);
            setProfile(null);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, checkAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}