import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { account } from "@core/appwrite";
import { Eye, EyeOff } from "lucide-react";

import { useTranslation } from "react-i18next";

export default function ResetPasswordDashboard() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!userId || !secret) {
            setError(t("resetPasswordDashboard.error.invalidLink"));
            return;
        }

        if (password !== confirmPassword) {
            setError(t("resetPasswordDashboard.error.passwordMismatch"));
            return;
        }

        if (password.length < 8) {
            setError(t("resetPasswordDashboard.error.passwordLength"));
            return;
        }

        setLoading(true);
        try {
            await account.updateRecovery(userId, secret, password);
            navigate("/", { state: { message: t("resetPasswordDashboard.successMessage") } });
        } catch (err: any) {
            setError(err.message || t("resetPasswordDashboard.error.fallback"));
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] font-inter">
        <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md text-center">
            <h1 className="text-3xl font-inter-bold text-gray-900 mb-2">
                {t("resetPasswordDashboard.title")}
            </h1>
            <p className="text-gray-500 mb-8 font-inter-regular">
                {t("resetPasswordDashboard.subtitle")}
            </p>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-inter-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleReset} className="flex flex-col gap-4">
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("resetPasswordDashboard.newPasswordPlaceholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular pr-12"
                        required
                        minLength={8}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                <div className="relative">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t("resetPasswordDashboard.confirmPasswordPlaceholder")}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870C4] font-inter-regular pr-12"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 p-4 rounded-xl bg-[#0870C4] text-white font-inter-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {loading ? t("resetPasswordDashboard.loadingButton") : t("resetPasswordDashboard.submitButton")}
                </button>
            </form>
        </div>
    </div>
);
}