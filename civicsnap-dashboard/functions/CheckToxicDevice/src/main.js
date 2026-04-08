import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Als er geen device_id is meegestuurd, hoeven we niks te doen.
    if (!payload.device_id) {
        return res.json({ success: true, message: 'Geen device_id gevonden bij dit nieuwe account.' });
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const dbId = process.env.DATABASE_ID;

    try {
        log(`Nieuw profiel aangemaakt. Controleren of apparaat ${payload.device_id} toxic is...`);

        // 1. Zoek dit apparaat op in de zwarte lijst
        const toxicCheck = await databases.listDocuments(
            dbId,
            process.env.TOXIC_DEVICES_COLLECTION_ID,
            [Query.equal('device_id', payload.device_id)]
        );

        // 2. KLAP DE VALSTRIK DICHT!
        if (toxicCheck.total > 0) {
            log(`🚨 TOXIC DEVICE GEDETECTEERD! Account ${payload.$id} wordt direct onzichtbaar gemaakt.`);

            // Zet het gloednieuwe profiel direct op is_shadowbanned: true
            await databases.updateDocument(
                dbId,
                process.env.PROFILES_COLLECTION_ID,
                payload.$id,
                { is_shadowbanned: true }
            );

            return res.json({ success: true, message: 'Valstrik geactiveerd. Spammer verbannen.' });
        }

        log('Apparaat is veilig. Geen actie nodig.');
        return res.json({ success: true, message: 'Veilig apparaat.' });

    } catch (err) {
        error(`Fout bij controleren toxic device: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};