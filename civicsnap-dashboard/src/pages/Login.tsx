import React, { useState } from "react";
import { account, teams, databases, appwriteConfig } from "@core/appwrite";
import { useAuth } from "@core/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

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
    const [showPassword, setShowPassword] = useState(false);

    const { checkAuth } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [forgotError, setForgotError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await account.createEmailPasswordSession(email, password);
            await checkAuth();
            navigate("/");
        } catch (error: any) {
            setError(error.message || t('login.error.loginFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            try {
                await teams.updateMembershipStatus(teamId!, membershipId!, userId!, secret!);
            } catch (error: any) {
                if (error.message.includes("already") || error.code === 409) {
                    setError(t('login.error.inviteAlreadyAccepted'));
                } else {
                    throw error;
                }
            }

            const userAccount = await account.get();
            await account.updateName(name);

            let wasExistingUser = false;
            try {
                await account.updatePassword(password);
            } catch (error: any) {
                wasExistingUser = true;
                console.log(t('login.error.passwordNotOverwritten'));
            }

            const memberships = await teams.listMemberships(teamId!);
            const myMembership = memberships.memberships.find(m => m.userId === userId);

            let assignedRole = 'org_viewer';
            if (myMembership) {
                if (myMembership.roles.includes('org_admin')) {
                    assignedRole = 'org_admin';
                } else if (myMembership.roles.includes('org_officer')) {
                    assignedRole = 'org_officer';
                }
            }

            try {
                await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.profilesCollectionId, userId!);
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.profilesCollectionId,
                    userId!,
                    {
                        full_name: name,
                        role: assignedRole,
                        organization_id: teamId,
                    }
                );
            } catch (error) {
                await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.profilesCollectionId,
                    userId!,
                    {
                        email: userAccount.email,
                        full_name: name,
                        role: assignedRole,
                        organization_id: teamId,
                        current_points: 0,
                        lifetime_points: 1,
                        is_banned: false,
                        avatar_url: null
                    }
                );
            }

            await checkAuth();

            if (wasExistingUser) {
                toast.success(t('login.success.existingUser'));
            }

            navigate("/");
        } catch (error: any) {
            setError(error.message || t('login.error.inviteAcceptFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError("");
        setIsSendingReset(true);
        try {
            const resetUrl = `${process.env.REACT_APP_DASHBOARD_RESET_URL}`;
            await account.createRecovery(forgotEmail, resetUrl);
            setShowForgotModal(false);
            setForgotEmail("");
            toast.success(t("login.forgotPassword.successToast"));
        } catch (err: any) {
            setForgotError(err.message || t("login.forgotPassword.errorFallback"));
        } finally {
            setIsSendingReset(false);
        }
    };

    return (
        // --- AANGEPAST: p-4 toegevoegd zodat de kaart niet tegen de randen botst op mobiel ---
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] font-inter p-4">
            
            {/* --- AANGEPAST: Responsive padding (p-6 tot md:p-10) --- */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-lg w-full max-w-md text-center">
                
                {/* --- AANGEPAST: Variabele tekstgrootte --- */}
                <h1 className="text-2xl sm:text-3xl font-inter-bold text-gray-900 mb-2">
                    {isInviteFlow ? t('login.titleInviteFlow') : t('login.titleNormal')}
                </h1>

                <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 font-inter-regular">
                    {isInviteFlow ? t('login.descriptionInviteFlow') : t('login.descriptionNormal')}
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-inter-medium">
                        {error}
                    </div>
                )}

                {isInviteFlow ? (
                    <form onSubmit={handleAcceptInvite} className="flex flex-col gap-3 sm:gap-4">
                        <input
                            type="text"
                            placeholder={t('login.registerNamePlaceholder')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular text-sm sm:text-base"
                            required
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={t('login.registerPasswordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular pr-12 text-sm sm:text-base"
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 sm:mt-4 p-3 sm:p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                        >
                            {loading ? t('login.buttonAccept') : t('login.buttonAccountMaking')}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="flex flex-col gap-3 sm:gap-4">
                        <input
                            type="email"
                            placeholder={t('login.loginEmailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular text-sm sm:text-base"
                            required
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={t('login.loginPasswordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular pr-12 text-sm sm:text-base"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 sm:mt-4 p-3 sm:p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                        >
                            {loading ? t('login.buttonLoading') : t('login.buttonLogin')}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setForgotEmail(email); setShowForgotModal(true); }}
                            className="text-sm text-[#0870C4] hover:underline font-inter-regular mt-1"
                        >
                            {t("login.forgotPassword.button")}
                        </button>
                    </form>
                )}

                {showForgotModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8">
                            <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-2 text-left">
                                {t("login.forgotPassword.modalTitle")}
                            </h2>
                            <p className="text-gray-500 text-xs sm:text-sm font-inter-regular mb-6 text-left">
                                {t("login.forgotPassword.modalSubtitle")}
                            </p>

                            {forgotError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-left">
                                    {forgotError}
                                </div>
                            )}

                            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4 text-left">
                                <input
                                    type="email"
                                    placeholder={t("login.forgotPassword.emailPlaceholder")}
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular text-sm sm:text-base"
                                    required
                                />
                                
                                {/* --- AANGEPAST: Knoppen flex-col-reverse op mobiel (opslaan bovenaan), flex-row op tablet --- */}
                                <div className="flex flex-col-reverse sm:flex-row gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(false)}
                                        className="flex-1 p-3 rounded-xl bg-gray-100 text-gray-700 font-inter-bold hover:bg-gray-200 transition-colors text-sm sm:text-base"
                                    >
                                        {t("login.forgotPassword.cancelButton")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSendingReset}
                                        className="flex-1 p-3 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm sm:text-base flex items-center justify-center"
                                    >
                                        {isSendingReset ? t("login.forgotPassword.loadingButton") : t("login.forgotPassword.submitButton")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}