import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    // 1. Setup Appwrite Client
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

    const databases = new Databases(client);
    
    // 2. Veilig parsen van de body
    let payload;
    try {
        payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.json({ success: false, error: 'Ongeldige data ontvangen' }, 400);
    }
    
    const userId = payload.user_id;
    if (!userId) return res.json({ success: false, error: 'User ID ontbreekt' }, 400);

    try {
        const profile = await databases.getDocument(
            process.env.DATABASE_ID,
            process.env.PROFILES_COLLECTION_ID,
            userId
        );

        // 3. Datum Check (Server-tijd)
        const nu = new Date();
        const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()).getTime();

        if (profile.last_daily_spin) {
            const laatsteSpin = new Date(profile.last_daily_spin);
            const laatsteSpinDag = new Date(laatsteSpin.getFullYear(), laatsteSpin.getMonth(), laatsteSpin.getDate()).getTime();

            if (vandaag === laatsteSpinDag) {
                return res.json({ success: false, error: 'Je hebt vandaag al gedraaid! Kom morgen terug.' });
            }
        }

        // 4. Het Rad (8 vakjes) & STRENGE Kansen
        // Indexen: 0=Helaas, 1=5pt, 2=Helaas, 3=15pt, 4=Helaas, 5=50pt, 6=5pt, 7=100pt
        const rand = Math.random() * 100;
        let winst = 0;
        let index = 0;

        if (rand > 99.5) { winst = 100; index = 7; }    // 0,5% kans: Jackpot (Vakje 7)
        else if (rand > 97) { winst = 50; index = 5; }  // 2,5% kans: Groot (Vakje 5)
        else if (rand > 85) { winst = 15; index = 3; }  // 12% kans: Mooi (Vakje 3)
        else if (rand > 60) { 
            winst = 5; 
            index = Math.random() > 0.5 ? 1 : 6;        // 25% kans: Klein (Vakje 1 of 6)
        } 
        else { 
            winst = 0; 
            const empty = [0, 2, 4];                    // 60% kans: NIETS (Vakjes 0, 2, 4)
            index = empty[Math.floor(Math.random() * empty.length)];
        }

        // 5. Database updaten
        await databases.updateDocument(
            process.env.DATABASE_ID,
            process.env.PROFILES_COLLECTION_ID,
            userId,
            {
                current_points: (profile.current_points || 0) + winst,
                lifetime_points: (profile.lifetime_points || 0) + winst,
                last_daily_spin: nu.toISOString()
            }
        );

        log(`User ${userId} won ${winst} punten op index ${index}`);

        return res.json({ 
            success: true, 
            won: winst, 
            wheelIndex: index 
        });

    } catch (err) {
        error("Fout bij draaien: " + err.message);
        return res.json({ success: false, error: "Database error: " + err.message }, 500);
    }
};