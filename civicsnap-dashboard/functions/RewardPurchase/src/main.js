import { Client, Databases, ID, Query, Permission, Role } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    // 1. Check: deze mag NIET via een database trigger draaien
    if (req.headers['x-appwrite-event']) {
        return res.json({ success: false, error: 'Deze functie moet via de app (HTTP) worden aangeroepen.' }, 400);
    }

    // 2. Payload veilig parsen
    let payload;
    try {
        payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.json({ success: false, error: 'Ongeldige payload' }, 400);
    }

    const { userId, rewardId } = payload;
    if (!userId || !rewardId) {
        return res.json({ success: false, error: 'userId en rewardId zijn verplicht.' }, 400);
    }

    // 3. Client Setup
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
        // 4. Haal reward op en check status/geldigheid
        const reward = await databases.getDocument(process.env.DATABASE_ID, process.env.REWARDS_COLLECTION_ID, rewardId);
        
        if (!reward.is_active) return res.json({ success: false, error: 'Deze beloning is niet meer beschikbaar.' }, 400);
        
        if (reward.valid_until && new Date(reward.valid_until) < new Date()) {
            await databases.updateDocument(process.env.DATABASE_ID, process.env.REWARDS_COLLECTION_ID, rewardId, { is_active: false });
            return res.json({ success: false, error: 'Deze beloning is verlopen.' }, 400);
        }

        // 5. Check saldo van de burger
        const profile = await databases.getDocument(process.env.DATABASE_ID, process.env.PROFILES_COLLECTION_ID, userId);
        if (profile.current_points < reward.cost_points) {
            return res.json({ success: false, error: 'Onvoldoende punten.' }, 400);
        }

        // 6. Heeft de gebruiker deze al?
        const existingReward = await databases.listDocuments(process.env.DATABASE_ID, process.env.USER_REWARDS_COLLECTION_ID, [
            Query.equal('user_id', userId),
            Query.equal('reward_id', rewardId)
        ]);
        if (existingReward.total > 0) return res.json({ success: false, error: 'Je hebt deze beloning al.' }, 400);

        // 7. Genereer code, schrijf punten af, en sla aankoop op
        const code = `CS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        await databases.updateDocument(process.env.DATABASE_ID, process.env.PROFILES_COLLECTION_ID, userId, {
            current_points: profile.current_points - reward.cost_points
        });

        await databases.createDocument(
            process.env.DATABASE_ID, 
            process.env.USER_REWARDS_COLLECTION_ID, 
            ID.unique(),
            { user_id: userId, reward_id: rewardId, code: code, status: 'active', redeemed_at: null },
            [Permission.read(Role.user(userId)), Permission.update(Role.user(userId))]
        );

        log(`Aankoop geslaagd: Reward ${rewardId} door ${userId}`);
        return res.json({ success: true, code: code, pointsLeft: profile.current_points - reward.cost_points });

    } catch (err) {
        error(`Aankoop mislukt: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};