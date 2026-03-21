import React, { useState } from "react";
import { account, teams, databases, appwriteConfig } from "@core/appwrite";
import { useAuth } from "@core/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
    // Extract query parameters from the URL (used for team invite links)
    const [searchParams] = useSearchParams();
    const teamId = searchParams.get("teamId");
    const membershipId = searchParams.get("membershipId");
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    // Determine if the user arrived via an invite link (all 4 params must be present)
    const isInviteFlow = teamId && membershipId && userId && secret;

    // Form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Auth context helper to refresh the current auth state after login
    const { checkAuth } = useAuth();
    // React Router navigation hook
    const navigate = useNavigate();

    // i18n translation hook
    const { t } = useTranslation();

    const [showForgotModal, setShowForgotModal] = useState(false);
const [forgotEmail, setForgotEmail] = useState("");
const [isSendingReset, setIsSendingReset] = useState(false);
const [forgotError, setForgotError] = useState("");

    /**
     * Handles a normal email/password login (non-invite flow).
     * Creates an Appwrite session and navigates to the home page on success.
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Create an email/password session via Appwrite
            await account.createEmailPasswordSession(email, password);
            // Refresh the global auth state so the rest of the app knows the user is logged in
            await checkAuth();
            // Redirect to the dashboard home page
            navigate("/");
        } catch (error: any) {
            // Display the error message from Appwrite, or a generic fallback
            setError(error.message || t('login.error.loginFailed'));
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles the invite-accept flow when a user clicks a team invitation link.
     * Steps:
     *  1. Accept the team membership via Appwrite Teams API.
     *  2. Update the user's name and (optionally) password.
     *  3. Determine the role assigned via the membership.
     *  4. Create or update the user's profile document in the database.
     *  5. Redirect to the home page.
     */
    const handleAcceptInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Step 1: Try to accept the team membership invitation
            try {
                await teams.updateMembershipStatus(teamId!, membershipId!, userId!, secret!);
            } catch (error: any) {
                // If the invite was already accepted (HTTP 409 / "already" message), show a friendly error
                if (error.message.includes("already") || error.code === 409) {
                    setError(t('login.error.inviteAlreadyAccepted'));
                } else {
                    // Re-throw any other unexpected error
                    throw error;
                }
            }

            // Step 2: Fetch the current user account and update their display name
            const userAccount = await account.get();
            await account.updateName(name);

            // Track whether this user already had a password set (i.e. an existing user)
            let wasExistingUser = false;
            try {
                // Attempt to set the password; this will fail for users who already have one
                await account.updatePassword(password);
            } catch (error: any) {
                // Password update failed — the user already has a password, so we leave it as-is
                wasExistingUser = true;
                console.log(t('login.error.passwordNotOverwritten'));
            }

            // Step 3: Determine the role from the team membership
            const memberships = await teams.listMemberships(teamId!);
            const myMembership = memberships.memberships.find(m => m.userId === userId);

            // Default role is "org_viewer"; upgrade if the membership includes a higher role
            let assignedRole = 'org_viewer';
            if (myMembership) {
                if (myMembership.roles.includes('org_admin')) {
                    assignedRole = 'org_admin';
                } else if (myMembership.roles.includes('org_officer')) {
                    assignedRole = 'org_officer';
                }
            }

            // Step 4: Create or update the user's profile document in the database
            try {
                // Check if a profile document already exists for this user
                await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.profilesCollectionId, userId!);

                // Profile exists — update it with the new name, role, and organization
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
                // Profile does not exist yet — create a brand-new profile document
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

            // Step 5: Refresh global auth state and navigate to the home page
            await checkAuth();

            // Show a toast if the user already existed (their password was not changed)
            if (wasExistingUser) {
                toast.success(t('login.success.existingUser'));
            }

            navigate("/");
        } catch (error: any) {
            // Catch-all error for the entire invite flow
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
        // Full-screen centered container with a light gray background
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] font-inter">
            {/* White card wrapper */}
            <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md text-center">
                {/* Page title — changes depending on whether it's an invite flow or normal login */}
                <h1 className="text-3xl font-inter-bold text-gray-900 mb-2">
                    {isInviteFlow ? t('login.titleInviteFlow') : t('login.titleNormal')}
                </h1>

                {/* Subtitle / description */}
                <p className="text-gray-500 mb-8 font-inter-regular">
                    {isInviteFlow
                        ? t('login.descriptionInviteFlow')
                        : t('login.descriptionNormal')}
                </p>

                {/* Error banner — only shown when there is an error message */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-inter-medium">
                        {error}
                    </div>
                )}

                {isInviteFlow ? (
                    /* ========== INVITE FLOW FORM ========== */
                    <form onSubmit={handleAcceptInvite} className="flex flex-col gap-4">
                        {/* Full name input (required for new account setup) */}
                        <input
                            type="text"
                            placeholder={t('login.registerNamePlaceholder')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular"
                            required
                        />

                        {/* Password input with show/hide toggle */}
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={t('login.registerPasswordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular pr-12"
                                required
                                minLength={8}
                            />
                            {/* Toggle password visibility button */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {/* Submit button — label changes while loading */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? t('login.buttonAccept') : t('login.buttonAccountMaking')}
                        </button>
                    </form>
                ) : (
                    /* ========== NORMAL LOGIN FORM ========== */
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        {/* Email input */}
                        <input
                            type="email"
                            placeholder={t('login.loginEmailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular"
                            required
                        />

                        {/* Password input with show/hide toggle */}
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={t('login.loginPasswordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular pr-12"
                                required
                            />
                            {/* Toggle password visibility button */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {/* Submit button — label changes while loading */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
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
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <h2 className="text-xl font-inter-bold text-gray-900 mb-2">
                {t("login.forgotPassword.modalTitle")}
            </h2>
            <p className="text-gray-500 text-sm font-inter-regular mb-6">
                {t("login.forgotPassword.modalSubtitle")}
            </p>

            {forgotError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                    {forgotError}
                </div>
            )}

            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <input
                    type="email"
                    placeholder={t("login.forgotPassword.emailPlaceholder")}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular"
                    required
                />
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setShowForgotModal(false)}
                        className="flex-1 p-3 rounded-xl bg-gray-100 text-gray-700 font-inter-bold hover:bg-gray-200 transition-colors"
                    >
                        {t("login.forgotPassword.cancelButton")}
                    </button>
                    <button
                        type="submit"
                        disabled={isSendingReset}
                        className="flex-1 p-3 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
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