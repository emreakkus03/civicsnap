import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    let payload = {};
    try {
        payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.json({ success: false, error: 'Invalid payload' }, 400);
    }

    const { conversation_id } = payload;

    if (!conversation_id) {
        return res.json({ success: false, message: 'Missing conversation_id' }, 400);
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
        log(`Start verwijderen van conversatie: ${conversation_id}`);

        // 1. Zoek de berichten
        const messagesList = await databases.listDocuments(
            process.env.DATABASE_ID,
            process.env.MESSAGES_COLLECTION_ID,
            [Query.equal("conversation_id", conversation_id), Query.limit(500)]
        );

        // 2. VEILIGE VERWIJDERING (Eén voor één, voorkomt 408 Timeouts en Rate Limits)
        for (const msg of messagesList.documents) {
            await databases.deleteDocument(
                process.env.DATABASE_ID, 
                process.env.MESSAGES_COLLECTION_ID, 
                msg.$id
            );
        }
        log(`${messagesList.total} berichten verwijderd.`);

        // 3. Verwijder de conversatie zelf
        await databases.deleteDocument(
            process.env.DATABASE_ID,
            process.env.CONVERSATIONS_COLLECTION_ID,
            conversation_id
        );
        log(`Conversatie definitief verwijderd.`);

        return res.json({ success: true, message: 'Conversatie verwijderd' });

    } catch (err) {
        error(`Fout bij verwijderen: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};