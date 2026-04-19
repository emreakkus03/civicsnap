import { Client, Databases } from 'node-appwrite';

async function sendPushNotification(token, title, body, pushUrl) {
    try {
        await fetch(pushUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: token, title: title, body: body, sound: "default", data: { type: "report_updated" },
            }),
        });
    } catch (e) {
        console.error("Push notification error:", e);
    }
}

export default async ({ req, res, log, error }) => {
    if (!req.headers['x-appwrite-event']) {
        return res.json({ success: false, message: 'Moet via event trigger lopen.' }, 400);
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const updatedUserId = payload.user_id;
    const newStatus = payload.status;
    const pointsAwarded = payload.points_awarded || 0;

    // 1. Filter: Nu staat 'rejected' er ook tussen!
    const notifyStatuses = ['approved', 'in_progress', 'resolved', 'rejected'];
    if (!notifyStatuses.includes(newStatus)) {
        log(`Status is '${newStatus}', we sturen geen notificatie.`);
        return res.json({ success: true, message: 'Geen notificatie nodig' });
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
        // 2. Haal profiel van de melder op om de push_token EN shadowban status te vinden
        const userProfile = await databases.getDocument(
            process.env.DATABASE_ID,
            process.env.PROFILES_COLLECTION_ID,
            updatedUserId
        );

        // 🛡️ EXTRA VEILIGHEID: Shadowbanned users krijgen NOOIT deze updates!
        if (userProfile.is_shadowbanned) {
            log(`Gebruiker ${updatedUserId} is shadowbanned. Geen notificatie gestuurd.`);
            return res.json({ success: true, message: 'User shadowbanned, push ignored' });
        }

        // 3. Stuur bericht als ze een token hebben
        if (userProfile.push_token) {
            let body = "";
            let title = "Update over je melding! 🔔";

            if (newStatus === 'approved') {
                body = `Je melding is goedgekeurd! Je ontving ${pointsAwarded} punten. 💎`;
            } else if (newStatus === 'in_progress') {
                body = `Je melding wordt behandeld! Je ontving ${pointsAwarded} punten. 💎`;
            } else if (newStatus === 'resolved') {
                body = `Je melding is opgelost! Je ontving ${pointsAwarded} punten. 💎`;
            } else if (newStatus === 'rejected') {
                // 👇 HIER IS DE NIEUWE TEKST VOOR AFGEWEZEN
                title = "Melding afgewezen ❌";
                body = "Helaas voldoet je melding niet aan de richtlijnen of kunnen we er niets mee doen.";
            }

            await sendPushNotification(
                userProfile.push_token, 
                title, 
                body, 
                process.env.EXPO_PUSH_URL
            );
            log(`Push gestuurd naar ${updatedUserId} voor status ${newStatus}`);
        } else {
            log(`Gebruiker ${updatedUserId} heeft geen push token ingesteld.`);
        }

        return res.json({ success: true });
    } catch (err) {
        error(`Fout: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};