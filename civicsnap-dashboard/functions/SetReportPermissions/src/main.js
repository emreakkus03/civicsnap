import { Client, Databases, Users, Permission, Role, ID, Query } from 'node-appwrite';


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

const event = req.headers['x-appwrite-event'] || '';
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
    return res.json({ success: false, error: 'Invalid request body' });
}

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const users = new Users(client);

    // --- 1. REWARD PURCHASE (HTTP call, no database event) ---
    if (!event) {
        const { userId, rewardId } = payload;

        if (!userId || !rewardId) {
            return res.json({ success: false, error: 'userId and rewardId are required.' });
        }

        try {
            // Fetch the reward document
            const reward = await databases.getDocument(
                process.env.DATABASE_ID,
                process.env.REWARDS_COLLECTION_ID,
                rewardId
            );

            // Check if reward is active
            if (!reward.is_active) {
                return res.json({ success: false, error: 'This reward is no longer available.' });
            }

            // Check if reward is still valid
            if (reward.valid_until && new Date(reward.valid_until) < new Date()) {
                // Set reward to inactive
                await databases.updateDocument(
                    process.env.DATABASE_ID,
                    process.env.REWARDS_COLLECTION_ID,
                    rewardId,
                    { is_active: false }
                );
                return res.json({ success: false, error: 'This reward has expired.' });
            }

            // Fetch the user profile
            const profile = await databases.getDocument(
                process.env.DATABASE_ID,
                process.env.PROFILES_COLLECTION_ID,
                userId
            );

            // Check if user has enough diamonds
            if (profile.current_points < reward.cost_points) {
                return res.json({ success: false, error: 'Insufficient diamonds.' });
            }

            // Check if user already owns this reward
            const existingReward = await databases.listDocuments(
                process.env.DATABASE_ID,
                process.env.USER_REWARDS_COLLECTION_ID,
                [
                    Query.equal('user_id', userId),
                    Query.equal('reward_id', rewardId),
                ]
            );

            if (existingReward.total > 0) {
                return res.json({ success: false, error: 'You already own this reward.' });
            }

            // Generate unique redemption code
            const code = `CS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            // Deduct diamonds from user profile
            await databases.updateDocument(
                process.env.DATABASE_ID,
                process.env.PROFILES_COLLECTION_ID,
                userId,
                {
                    current_points: profile.current_points - reward.cost_points
                }
            );

            // Create user_rewards document
            await databases.createDocument(
    process.env.DATABASE_ID,
    process.env.USER_REWARDS_COLLECTION_ID,
    ID.unique(),
    {
        user_id: userId,
        reward_id: rewardId,
        code: code,
        status: 'active',
        redeemed_at: null,
    },
    [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
    ]
);

            log(`Reward ${rewardId} purchased by user ${userId} for ${reward.cost_points} diamonds`);
            return res.json({ success: true, code: code, pointsLeft: profile.current_points - reward.cost_points });

        } catch (err) {
            error(`Error during reward purchase: ${err.message}`);
            return res.json({ success: false, error: err.message });
        }
    }

    // --- 2. PROFILE DELETE EVENT ---
    if (event.includes('profiles') && event.includes('delete')) {
        const deletedUserId = payload.$id;
        try {
            await users.delete(deletedUserId);
            log(`Auth account ${deletedUserId} deleted`);
        } catch (err) {
            error(`Could not delete auth account: ${err.message}`);
        }
        return res.empty();
    }

    // --- 3. ORIGINAL REPORT PERMISSIONS LOGIC ---
    const documentId = payload.$id;
    const orgId = payload.organization_id;
    const userId = payload.user_id;

    if (!orgId || !userId) {
        log('No organization_id or user_id found, skipping.');
        return res.json({ success: true });
    }

    try {
        const newPermissions = [
            // Citizen can manage their own report
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),

            // Organization team permissions
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

        log(`Permissions successfully set for report: ${documentId}`);

        try {
    const userProfile = await databases.getDocument(
        process.env.DATABASE_ID,
        process.env.PROFILES_COLLECTION_ID,
        userId
    );
    if (userProfile.push_token) {
        await sendPushNotification(
            userProfile.push_token,
            "Melding ontvangen! 📍",
            "Je melding is succesvol ingediend. We gaan ermee aan de slag!"
        );
    }
} catch (e) {
    error(`Error sending push notification: ${e.message}`);
}
        return res.json({ success: true });

    } catch (err) {
        error(`Error: ${err.message}`);
        return res.json({ success: false, error: err.message });
    }
};