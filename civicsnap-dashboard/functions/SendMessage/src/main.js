import { Client, Databases, Permission, Role, ID } from 'node-appwrite';

async function sendPushNotification(token, title, body) {
    try {
        await fetch(process.env.EXPO_PUSH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: token, title: title, body: body, sound: "default" }),
        });
    } catch (e) {
        console.error("Push error:", e);
    }
}

export default async ({ req, res, log, error }) => {
    // 1. Veilig de payload parsen die vanuit React wordt meegestuurd
    let payload = {};
    try {
        payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.json({ success: false, error: 'Invalid payload' }, 400);
    }

    const { conversation_id, text, sender_id, organization_id } = payload;

    if (!conversation_id || !text || !sender_id || !organization_id) {
        return res.json({ success: false, message: 'Missing fields' }, 400);
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
        // 2. Haal de conversatie op om te weten wie de burger (user_id) is
        const conversation = await databases.getDocument(
            process.env.DATABASE_ID,
            process.env.CONVERSATIONS_COLLECTION_ID,
            conversation_id
        );

        // 3. Zet de strikte permissies vast voor dit specifieke bericht
        const permissions = [
            Permission.read(Role.user(conversation.user_id)), // Burger mag lezen
            Permission.read(Role.team(organization_id, 'org_admin')), // Admin mag lezen
            Permission.read(Role.team(organization_id, 'org_officer')) // Officer mag lezen
            // org_viewer staat er niet bij en kan dus niet meelezen!
        ];

        // 4. Maak het bericht VEILIG aan in de database als "Admin" (via de API key)
        const newMsg = await databases.createDocument(
            process.env.DATABASE_ID,
            process.env.MESSAGES_COLLECTION_ID,
            ID.unique(),
            {
                conversation_id,
                sender_id,
                text,
                organization_id
            },
            permissions
        );

        log(`Bericht opgeslagen: ${newMsg.$id}`);

        if (sender_id !== conversation.user_id) {
            await databases.updateDocument(
                process.env.DATABASE_ID,
                process.env.CONVERSATIONS_COLLECTION_ID,
                conversation_id,
                { has_unread_user: true } 
            );
        } else {
           
            await databases.updateDocument(
                process.env.DATABASE_ID,
                process.env.CONVERSATIONS_COLLECTION_ID,
                conversation_id,
                { has_unread_admin: true } 
            );
        }

        // 5. Pushnotificatie sturen (Alleen als iemand anders dan de burger het stuurt)
        if (sender_id !== conversation.user_id) {
            const userProfile = await databases.getDocument(
                process.env.DATABASE_ID,
                process.env.PROFILES_COLLECTION_ID,
                conversation.user_id
            );

            if (userProfile.push_token) {
                // Maak een korte preview van de tekst (max 40 tekens)
                const preview = text.length > 40 ? text.substring(0, 40) + '...' : text;
                await sendPushNotification(userProfile.push_token, "Nieuw bericht 💬", preview);
            }
        }

        // Stuur het complete opgeslagen bericht terug naar je React dashboard!
        return res.json({ success: true, message: newMsg });

    } catch (err) {
        error(`Fout bij sturen bericht: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};