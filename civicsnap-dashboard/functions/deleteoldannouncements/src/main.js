import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  if (!process.env.APPWRITE_API_KEY || !process.env.DATABASE_ID || !process.env.ANNOUNCEMENTS_COLLECTION_ID) {
    error('Error: Missing environment variables.');
    return res.json({ success: false, error: 'Configuration error' }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const dbId = process.env.DATABASE_ID;
  const collectionId = process.env.ANNOUNCEMENTS_COLLECTION_ID;

  try {
    const now = new Date().toISOString();
    log(`Cleanup started at: ${now}`);

    const expiredAnnouncements = await databases.listDocuments(
      dbId,
      collectionId,
      [
        Query.lessThan('ends_at', now),
        Query.limit(100)
      ]
    );

    const totalFound = expiredAnnouncements.documents.length;
    
    if (totalFound === 0) {
      log('No expired announcements found. Database is clean.');
      return res.json({ success: true, deleted: 0 });
    }

    log(`Found ${totalFound} expired announcement(s). Starting deletion...`);

    const deletePromises = expiredAnnouncements.documents.map((doc) =>
      databases.deleteDocument(dbId, collectionId, doc.$id)
    );

    await Promise.all(deletePromises);

    log(`Success! ${totalFound} announcement(s) permanently deleted.`);
    
    return res.json({ 
      success: true, 
      deleted: totalFound 
    });

  } catch (err) {
    error(`Database error during cleanup: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};