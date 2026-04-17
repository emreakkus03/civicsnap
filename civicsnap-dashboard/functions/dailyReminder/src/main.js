const sdk = require('node-appwrite');

module.exports = async function (context) {
    const client = new sdk.Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

    const databases = new sdk.Databases(client);

    try {
        // 1. Bepaal het begin van vandaag (00:00:00 server tijd)
        const nu = new Date();
        const beginVanVandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()).toISOString();

        // 2. Haal alleen gebruikers op die nog niet gesponnen hebben vandaag
        // We zoeken mensen met een token EN (geen spin datum OF datum voor vandaag)
        const response = await databases.listDocuments(
            process.env.DATABASE_ID,
            process.env.PROFILES_COLLECTION_ID,
            [
                sdk.Query.isNotNull('push_token'),
                sdk.Query.or([
                    sdk.Query.isNull('last_daily_spin'),
                    sdk.Query.lessThan('last_daily_spin', beginVanVandaag)
                ])
            ]
        );

        context.log(`Aantal te sturen notificaties: ${response.documents.length}`);

        // 3. Verstuur de pushnotificaties via Expo
        const notifications = response.documents.map(user => ({
            to: user.push_token,
            title: "Vergeet je dagelijkse spin niet! 🎰",
            body: `Hey ${user.full_name || 'Stadsheld'}, je gratis diamanten staan klaar. Kom draaien!`,
            sound: "default",
            data: { type: "DAILY_SPIN" }
        }));

        // We sturen ze in batches naar Expo (max 100 per keer is aanbevolen)
        if (notifications.length > 0) {
            await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(notifications),
            });
        }

        return context.res.json({ 
            success: true, 
            sentCount: notifications.length 
        });

    } catch (err) {
        context.error("Fout bij uitvoeren reminder: " + err.message);
        return context.res.json({ success: false, error: err.message });
    }
};