import { Client, Databases, Permission, Role } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    if (!req.bodyRaw) return res.send('Geen document data gevonden.');

    const payload = JSON.parse(req.bodyRaw);
    const documentId = payload.$id;
    const orgId = payload.organization_id;
    const userId = payload.user_id;

    if (!orgId || !userId) {
        log('Geen organization_id of user_id gevonden, we slaan deze over.');
        return res.json({ success: true });
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
        const newPermissions = [
            // Burger mag zijn eigen melding beheren
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
            
            // Ambtenaren Team rechten
            Permission.read(Role.team(orgId)),
            Permission.update(Role.team(orgId, 'org_admin')),
            Permission.update(Role.team(orgId, 'org_officer')),
            Permission.delete(Role.team(orgId, 'org_admin'))
        ];

        await databases.updateDocument(
            process.env.DATABASE_ID,
            process.env.REPORTS_COLLECTION_ID,
            documentId,
            {}, 
            newPermissions
        );

        log(`🎉 Rechten succesvol vastgezet voor melding: ${documentId}`);
        return res.json({ success: true });

    } catch (err) {
        error(`❌ Fout: ${err.message}`);
        return res.json({ success: false, error: err.message });
    }
};