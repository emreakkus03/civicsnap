import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  // Validate that all required environment variables are present
  if (!process.env.APPWRITE_API_KEY || !process.env.DATABASE_ID || !process.env.REWARDS_COLLECTION_ID) {
    error('Error: Missing environment variables.');
    return res.json({ success: false, error: 'Configuration error' }, 500);
  }

  // Initialize the Appwrite Client with full admin privileges
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const dbId = process.env.DATABASE_ID;
  const collectionId = process.env.REWARDS_COLLECTION_ID;

  try {
    const now = new Date().toISOString();
    log(`Rewards check started at: ${now}`);

    // Find rewards that are expired AND still marked as active
    // We cap this at 100 per run to prevent timeout issues
    const expiredActiveRewards = await databases.listDocuments(
      dbId,
      collectionId,
      [
        Query.lessThan('valid_until', now),
        Query.equal('is_active', true),
        Query.limit(100)
      ]
    );

    const totalFound = expiredActiveRewards.documents.length;
    
    if (totalFound === 0) {
      log('No expired active rewards found. Everything is up to date.');
      return res.json({ success: true, deactivated: 0 });
    }

    log(`Found ${totalFound} expired reward(s) that need deactivation. Processing...`);

    // Loop through the expired rewards and update their status to false
    // This keeps the data safe for historical statistics, but hides it from citizens
    const updatePromises = expiredActiveRewards.documents.map((doc) =>
      databases.updateDocument(dbId, collectionId, doc.$id, {
        is_active: false
      })
    );

    await Promise.all(updatePromises);

    log(`Success! ${totalFound} reward(s) have been successfully deactivated.`);
    
    return res.json({ 
      success: true, 
      deactivated: totalFound 
    });

  } catch (err) {
    error(`Database error during rewards processing: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};