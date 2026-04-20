import { Client, Databases, Permission, Role } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const { report_id, org_id, author_name } = payload;

    if (!report_id || !org_id) return res.json({ success: false });

    const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);

    try {
        await databases.createDocument(
            process.env.DATABASE_ID,
            process.env.DASHBOARD_NOTIFICATIONS_ID,
            'unique()',
            {
                report_id: report_id,
                message: `Nieuwe notitie van ${author_name || 'een collega'}`,
                org_id: org_id,
                is_read: false
            },
            [Permission.read(Role.team(org_id)), Permission.update(Role.team(org_id))]
        );
        return res.json({ success: true });
    } catch (err) {
        return res.json({ success: false, error: err.message }, 500);
    }
};