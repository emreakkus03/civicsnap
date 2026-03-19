import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();

    useEffect(() => {
        const userId = searchParams.get("userId");
        const secret = searchParams.get("secret");
        const source = searchParams.get("source");

       if (userId && secret) {
        const deepLink = `civicsnap://reset-password?userId=${userId}&secret=${secret}${source ? `&source=${source}` : ''}`;
        window.location.href = deepLink;
    }
    }, [searchParams]);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p>{t("resetPassword.redirecting")}</p>
        </div>
    );
}