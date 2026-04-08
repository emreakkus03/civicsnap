import { Client, Databases, ID, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    // 1. Veilig de payload parsen (het profiel dat zojuist is geüpdatet)
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // 2. We willen alléén actie ondernemen als de shadowban net op 'true' is gezet
    if (payload.is_shadowbanned !== true) {
        return res.json({ success: true, message: 'Geen shadowban actie nodig.' });
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const dbId = process.env.DATABASE_ID;

    try {
        log(`Shadowban geactiveerd voor user: ${payload.$id}`);

        // 3. Voeg het apparaat toe aan de toxic_devices lijst
        if (payload.device_id) {
            // Check eerst of hij er niet al in staat (voorkomt errors)
            const existingToxic = await databases.listDocuments(dbId, process.env.TOXIC_DEVICES_COLLECTION_ID, [
                Query.equal('device_id', payload.device_id)
            ]);
            
            if (existingToxic.total === 0) {
                await databases.createDocument(
                    dbId,
                    process.env.TOXIC_DEVICES_COLLECTION_ID,
                    ID.unique(),
                    { device_id: payload.device_id }
                );
                log(`Apparaat ${payload.device_id} is nu TOXIC ☠️`);
            }
        }

        // 4. Zoek ALLE oude meldingen van deze spammer
        const userReports = await databases.listDocuments(dbId, process.env.REPORTS_COLLECTION_ID, [
            Query.equal('user_id', payload.$id)
        ]);

        // 5. Verberg al zijn oude meldingen (zet ze ook op is_shadowbanned: true)
        for (const report of userReports.documents) {
            await databases.updateDocument(dbId, process.env.REPORTS_COLLECTION_ID, report.$id, { 
                is_shadowbanned: true 
            });
        }
        
        return res.json({ success: true, message: `${userReports.total} oude meldingen verborgen.` });

    } catch (err) {
        error(`Shadowban error: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};