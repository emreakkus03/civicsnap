import React, {useState} from "react";
import { account, teams, databases, appwriteConfig } from "@core/appwrite";
import { useAuth } from "@core/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

export default function Login() {
    const [searchParams] = useSearchParams();
    const teamId = searchParams.get("teamId");
    const membershipId = searchParams.get("membershipId");
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    const isInviteFlow = teamId && membershipId && userId && secret;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { checkAuth } = useAuth();
    const navigate = useNavigate();

    const { t } = useTranslation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await account.createEmailPasswordSession(email, password);
            await checkAuth();
            navigate("/");
        } catch (error: any) {
            setError(error.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await teams.updateMembershipStatus(teamId!, membershipId!, userId!, secret!);
            const userAccount = await account.get();
            await account.updateName(name);
            await account.updatePassword(password);

            await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.profilesCollectionId,
                userId!,
                {
                    email: userAccount.email,
                    full_name: name,
                    role: 'org_admin',
                    organization_id: teamId,
                    current_points: 0,
                    lifetime_points: 1,
                    is_banned: false,
                    avatar_url: null
                }
            );

            await checkAuth();
            navigate("/");
        } catch (error: any) {
            setError(error.message || "Failed to accept invite. Please try again.");
        } finally {
            setLoading(false);
        }
    };

   return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] font-inter">
            <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md text-center">
                <h1 className="text-3xl font-inter-bold text-gray-900 mb-2">{isInviteFlow ? t('login.titleInviteFlow') : t('login.titleNormal')}</h1>
                <p className="text-gray-500 mb-8 font-inter-regular">{isInviteFlow 
                        ? t('login.descriptionInviteFlow') 
                        : t('login.descriptionNormal')}</p>
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-inter-medium">
                        {error}
                    </div>
                )}
{isInviteFlow ? (
               <form onSubmit={handleAcceptInvite} className="flex flex-col gap-4">
                        <input 
                            type="text" 
                            placeholder={t('login.registerNamePlaceholder')} 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular"
                            required
                        />
                        <input 
                            type="password" 
                            placeholder={t('login.registerPasswordPlaceholder')} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular"
                            required
                            minLength={8}
                        />
                        <button type="submit" disabled={loading} className="mt-4 p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {loading ? t('login.buttonAccept') : t('login.buttonAccountMaking')}
                        </button>
                    </form>
) : (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <input 
                            type="email" 
                            placeholder={t('login.loginEmailPlaceholder')} 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular"
                            required
                        />
                        <input 
                            type="password" 
                            placeholder={t('login.loginPasswordPlaceholder')} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular"
                            required
                        />
                        <button type="submit" disabled={loading} className="mt-4 p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {loading ? t('login.buttonLoading') : t('login.buttonLogin')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );

};