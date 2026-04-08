import { Client, Users } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    // 1. Enkel via database triggers
    if (!req.headers['x-appwrite-event']) {
        return res.json({ success: false, message: 'Moet via event trigger lopen.' }, 400);
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const deletedUserId = payload.$id;

    if (!deletedUserId) return res.json({ success: false, message: 'Geen ID gevonden' }, 400);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);

    try {
        // 2. Verwijder het account uit het Auth systeem
        await users.delete(deletedUserId);
        log(`Auth account ${deletedUserId} succesvol verwijderd.`);
        return res.json({ success: true, message: 'Account gewist' });
    } catch (err) {
        // Als het account toevallig al weg was, loggen we het, maar we gooien geen error 500
        // anders blijft Appwrite het event mogelijk opnieuw proberen.
        error(`Fout bij verwijderen auth account: ${err.message}`);
        return res.json({ success: true, error: err.message });
    }
};