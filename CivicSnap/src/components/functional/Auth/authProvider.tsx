import React, { createContext, useContext } from "react";
import { User } from "@core/modules/auth/types";
import { Models } from "react-native-appwrite";
import useAppwriteAuth from "./useAppwriteAuth"; 
import { LoginBody, RegisterBody } from "@core/modules/auth/api";
import { UserProfile } from "@core/networking/database.types";

type AuthContextType = {
  isLoggedIn: boolean;
  isInitialized: boolean;
  user?: User | null;
  profile?: UserProfile | null;
  auth: Models.User<Models.Preferences> | null; 
  login: (body: LoginBody) => Promise<void>; 
  logout: () => Promise<void>;
  register: (body: RegisterBody) => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isInitialized: false,
  user: null,
  profile: null,
  auth: null,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  setProfile: () => {},
});

type Props = {
  children: React.ReactNode;
};

const AuthProvider = ({ children }: Props) => {
  const { 
    isLoggedIn, 
    isInitialized, 
    auth, 
    user, 
    profile, 
    logout, 
    register, 
    login,
    setProfile 
  } = useAppwriteAuth();

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isInitialized,
        user,
        profile,
        auth,
        login,
        logout,
        register,
        setProfile
      }}
    >
      {isInitialized ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  return useContext(AuthContext);
};

export default AuthProvider;