import { useEffect, useState, useMemo } from "react";
import { Models } from "react-native-appwrite";
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  getCurrentSession,
  getUserProfile,
  LoginBody,
  RegisterBody,
} from "@core/modules/auth/api";
import { User } from "@core/modules/auth/types";
import { UserProfile } from "@core/networking/database.types";

const useAppwriteAuth = () => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [auth, setAuth] = useState<Models.User<Models.Preferences> | null>(null);
  const [session, setSession] = useState<Models.Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentSession();
        setAuth(user);
        if (user) {
          const userProfile = await getUserProfile(user.$id);
          setProfile(userProfile);
        }
      } catch (error) {
        setAuth(null);
      } finally {
        setIsInitialized(true);
      }
    };
    checkAuth();
  }, []);

  const login = async (body: LoginBody) => {
    await apiLogin(body);
    const user = await getCurrentSession();
    setAuth(user);
    if (user) {
      const userProfile = await getUserProfile(user.$id);
      setProfile(userProfile);
    }
  };

  const logout = async () => {
    await apiLogout();
    setAuth(null);
    setSession(null);
    setProfile(null);
  };

  const register = async (body: RegisterBody) => {
    await apiRegister(body);
    const user = await getCurrentSession();
    setAuth(user);
    if (user) {
      const userProfile = await getUserProfile(user.$id);
      setProfile(userProfile);
    }
  };

  const isLoggedIn = !!auth;

  const user: User | null = useMemo(() => {
    return auth
      ? {
          id: auth.$id,
          email: auth.email,
          name: auth.name,
        }
      : null;
  }, [auth]);

  return {
    isLoggedIn,
    isInitialized,
    auth, 
    user, 
    profile,
    session,
    login,
    logout,
    register,
    setProfile,
  };
};

export default useAppwriteAuth;