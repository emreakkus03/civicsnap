import { Client, Databases, Query } from 'node-appwrite';

// XP formula: 100 + floor(totalReports/20)²
function calculateXP(totalReports) {
  const multiplier = Math.floor(totalReports / 20);
  return 100 + (multiplier * multiplier);
}

export default async ({ req, res, log, error }) => {
  if (!req.headers['x-appwrite-event']) {
    return res.json({ success: false, message: 'Moet via event trigger lopen.' }, 400);
  }

  const newReport = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  
  // Als het direct al als duplicate is gemarkeerd (bijv. door de frontend), geef dan geen XP.
  // Let op: als de andere Server Function hem pas *later* als duplicate aanmerkt, wordt er wel XP gegeven.
  // Dit is meestal prima (beloning voor de moeite).
  if (newReport.is_duplicate || newReport.original_report_id) {
     log('Report is a duplicate. No XP awarded.');
     return res.json({ success: true, message: "Duplicate report. XP skipped." });
  }

  const userId = newReport.user_id;
  if (!userId) {
    log('No user_id found, XP skipped.');
    return res.json({ success: false, message: "No user_id found." }, 400);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.DATABASE_ID;
  const collectionId = process.env.REPORTS_COLLECTION_ID;
  const profilesCollectionId = process.env.PROFILES_COLLECTION_ID;

  try {
    // 1. Count how many reports this user has in total (including this new one)
    const userReportsResponse = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.equal('user_id', userId),
        Query.limit(1000)
      ]
    );
    const totalReports = userReportsResponse.total;
    log(`User ${userId} has ${totalReports} reports in total`);

    // 2. Calculate XP
    const xpToAward = calculateXP(totalReports);
    log(`XP to award for this report: ${xpToAward}`);

    // 3. Fetch the current profile
    const profile = await databases.getDocument(
      databaseId,
      profilesCollectionId,
      userId
    );

    const currentLifetimePoints = profile.lifetime_points || 0;
    const newLifetimePoints = currentLifetimePoints + xpToAward;

    // 4. Update lifetime_points in the profile
    await databases.updateDocument(
      databaseId,
      profilesCollectionId,
      userId,
      {
        lifetime_points: newLifetimePoints,
      }
    );

    log(`XP updated for user ${userId}: ${currentLifetimePoints} → ${newLifetimePoints}`);
    return res.json({ success: true, message: `${xpToAward} XP awarded.` });

  } catch (err) {
    error(`Error during XP award: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};