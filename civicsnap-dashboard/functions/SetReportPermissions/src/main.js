import { Client, Databases, Permission, Role } from 'node-appwrite';

// Hulpfunctie voor push notificaties
async function sendPushNotification(token, title, body) {
    try {
        await fetch(process.env.EXPO_PUSH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: token,
                title: title,
                body: body,
                sound: "default",
                data: { type: "report_created" },
            }),
        });
    } catch (e) {
        console.error("Push notification error:", e);
    }
}

export default async ({ req, res, log, error }) => {
    // 1. Veilig de payload parsen
    let payload = {};
    try {
        if (req.body) {
            payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            if (payload.data) {
                payload = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
            }
        }
    } catch (e) {
        error(`Failed to parse request body: ${e.message}`);
        return res.json({ success: false, error: 'Invalid request body' }, 400);
    }

    const documentId = payload.$id;
    const orgId = payload.organization_id;
    const userId = payload.user_id;

    if (!orgId || !userId || !documentId) {
        log('No organization_id, user_id, or document_id found, skipping.');
        return res.json({ success: false, message: 'Missing required IDs' }, 400);
    }

    // 2. Appwrite Client Setup
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
        // --- AANGEPAST: We halen het profiel hier direct bovenaan op ---
        const userProfile = await databases.getDocument(
            process.env.DATABASE_ID,
            process.env.PROFILES_COLLECTION_ID,
            userId
        );

        // Bepaal of de user geband is
        const isBanned = userProfile.is_shadowbanned === true;

        // 3. Permissies instellen
        const newPermissions = [
            // Burger kan eigen report beheren
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),

            // Ambtenaren permissies op basis van hun Team Role
            Permission.read(Role.team(orgId)),
            Permission.update(Role.team(orgId, 'org_admin')),
            Permission.update(Role.team(orgId, 'org_officer')),
            Permission.delete(Role.team(orgId, 'org_admin'))
        ];

        // --- AANGEPAST: We sturen de shadowban status van de user mee naar de melding ---
        await databases.updateDocument(
            process.env.DATABASE_ID,
            process.env.REPORTS_COLLECTION_ID,
            documentId,
            { is_shadowbanned: isBanned }, // Dit kopieert de status direct naar de reports tabel!
            newPermissions
        );

        log(`Permissions and shadowban status set for report: ${documentId}`);

        // 4. Push notificatie sturen (ALLEEN als de gebruiker NIET is geshadowbanned)
        if (!isBanned) {
            try {
                if (userProfile.push_token) {
                    await sendPushNotification(
                        userProfile.push_token,
                        "Melding ontvangen! 📍",
                        "Je melding is succesvol ingediend. We gaan ermee aan de slag!"
                    );
                    log(`Push notification sent to user: ${userId}`);
                }
            } catch (pushErr) {
                error(`Error sending push notification: ${pushErr.message}`);
            }
        }

        return res.json({ success: true, message: 'Permissions set and notification handled' });

    } catch (err) {
        error(`Error setting permissions: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};