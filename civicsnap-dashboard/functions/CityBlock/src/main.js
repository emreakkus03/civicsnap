import { Client, Users, Teams } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    // 1. Controleer of de functie is geactiveerd door een database-event
    if (!req.headers['x-appwrite-event']) {
        return res.json({ success: false, message: 'Geen event trigger herkend.' });
    }

    // Het document van de organisatie die is aangepast
    const organisatieDocument = req.body; 
    const teamId = organisatieDocument.$id; 
    const nieuweStatus = organisatieDocument.status; // 'active' of 'blocked'

    // 2. Setup de Appwrite Admin Client
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);
    const teams = new Teams(client);

    try {
        // 3. Haal alle leden (ambtenaren) op die bij deze organisatie horen
        const teamLeden = await teams.listMemberships(teamId);
        const magInloggen = nieuweStatus === 'active';

        log(`Actie: Stad ${organisatieDocument.name} staat nu op ${nieuweStatus}. Accounts updaten: ${teamLeden.total}`);

        // 4. Loop door alle teamleden en pas hun accountstatus aan
        for (const lid of teamLeden.memberships) {
            // Blokkeer of deblokkeer het account
            await users.updateStatus(lid.userId, magInloggen);
            log(`Status van user ${lid.userId} aangepast naar: ${magInloggen}`);

            // 5. Als de status 'blocked' is, verwijder dan direct alle actieve sessies
            if (!magInloggen) {
                try {
                    await users.deleteSessions(lid.userId);
                    log(`Alle actieve sessies beëindigd voor user: ${lid.userId}`);
                } catch (sessionErr) {
                    // Als een user geen actieve sessies heeft, geeft Appwrite een 404. 
                    // Dat vangen we hier op zodat de rest van de loop gewoon doorgaat.
                    log(`Geen actieve sessies gevonden voor ${lid.userId}, overslaan.`);
                }
            }
        }

        return res.json({ 
            success: true, 
            message: `Systeem bijgewerkt voor ${organisatieDocument.name}.` 
        });

    } catch (err) {
        error(`Systeemfout: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};