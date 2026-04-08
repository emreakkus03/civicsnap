import { Client, Databases, Permission, Role, ID } from 'node-appwrite';

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
                data: { type: "chat_started" },
            }),
        });
    } catch (e) {
        console.error("Push notification error:", e);
    }
}

export default async ({ req, res, log, error }) => {
    // 1. Veilig de payload parsen (dit komt vanuit het React Dashboard)
    let payload = {};
    try {
        payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.json({ success: false, error: 'Invalid request body' }, 400);
    }

    const { report_id, user_id, organization_id, subject } = payload;

    if (!report_id || !user_id || !organization_id || !subject) {
        return res.json({ success: false, message: 'Missing required fields' }, 400);
    }

    // 2. Appwrite Client Setup
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
        log(`Starting conversation for report: ${report_id} by org: ${organization_id}`);

        const permissions = [
            // De burger mag het uiteraard lezen
            Permission.read(Role.user(user_id)), 
            
            // Alléén Admins en Officers mogen lezen (Viewers zijn expliciet buitengesloten!)
            Permission.read(Role.team(organization_id, 'org_admin')),
            Permission.read(Role.team(organization_id, 'org_officer')),
            
            // Alléén Admins en Officers mogen updaten (bijv. de chat sluiten)
            Permission.update(Role.team(organization_id, 'org_admin')),
            Permission.update(Role.team(organization_id, 'org_officer'))
        ];

        // 4. Maak de conversatie aan in de database
        const conversation = await databases.createDocument(
            process.env.DATABASE_ID,
            process.env.CONVERSATIONS_COLLECTION_ID,
            ID.unique(),
            {
                report_id: report_id,
                user_id: user_id,
                organization_id: organization_id,
                subject: subject,
                status: 'open'
            },
            permissions
        );

        log(`Conversation created successfully: ${conversation.$id}`);

        // 5. Haal user profiel op voor de Push Notificatie
        try {
            const userProfile = await databases.getDocument(
                process.env.DATABASE_ID,
                process.env.PROFILES_COLLECTION_ID,
                user_id
            );
            
            if (userProfile.push_token) {
                await sendPushNotification(
                    userProfile.push_token,
                    "Nieuw bericht van de gemeente 💬",
                    `De gemeente heeft een chat gestart over: ${subject}`
                );
                log(`Push notification sent to user: ${user_id}`);
            }
        } catch (pushErr) {
            error(`Error sending push notification: ${pushErr.message}`);
        }

        return res.json({ success: true, conversation_id: conversation.$id });

    } catch (err) {
        error(`Error creating conversation: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};