import { Client, Databases, Query, ID } from 'node-appwrite';

export default async ({ req, res }) => {
  if (!process.env.APPWRITE_API_KEY || !process.env.DATABASE_ID || !process.env.REPORTS_COLLECTION_ID || !process.env.STATS_COLLECTION_ID || !process.env.CATEGORIES_COLLECTION_ID) {
    return res.json({ success: false, error: 'Configuration error' }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const dbId = process.env.DATABASE_ID;
  const reportsId = process.env.REPORTS_COLLECTION_ID;
  const statsId = process.env.STATS_COLLECTION_ID;
  const categoriesId = process.env.CATEGORIES_COLLECTION_ID;

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const orgId = payload.organization_id;

    if (!orgId) {
      return res.json({ success: true, message: 'Skipped' });
    }

    const [totalRes, resolvedRes] = await Promise.all([
      databases.listDocuments(dbId, reportsId, [Query.equal('organization_id', orgId), Query.limit(1)]),
      databases.listDocuments(dbId, reportsId, [Query.equal('organization_id', orgId), Query.equal('status', 'resolved'), Query.limit(1)])
    ]);

    const categoriesRes = await databases.listDocuments(dbId, categoriesId, [Query.limit(100)]);
    const categoryCounts = {};

    for (const cat of categoriesRes.documents) {
      const catCountRes = await databases.listDocuments(dbId, reportsId, [
        Query.equal('organization_id', orgId),
        Query.equal('category_id', cat.$id),
        Query.limit(1)
      ]);
      if (catCountRes.total > 0) {
        categoryCounts[cat.name] = catCountRes.total;
      }
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthlyCounts = {};

    for (let i = 0; i <= now.getMonth(); i++) {
      const startOfMonth = new Date(currentYear, i, 1).toISOString();
      const endOfMonth = new Date(currentYear, i + 1, 1).toISOString();
      const monthKey = i.toString();

      const [incomingMonth, resolvedMonth] = await Promise.all([
        databases.listDocuments(dbId, reportsId, [
          Query.equal('organization_id', orgId),
          Query.greaterThanEqual('$createdAt', startOfMonth),
          Query.lessThan('$createdAt', endOfMonth),
          Query.limit(1)
        ]),
        databases.listDocuments(dbId, reportsId, [
          Query.equal('organization_id', orgId),
          Query.greaterThanEqual('$createdAt', startOfMonth),
          Query.lessThan('$createdAt', endOfMonth),
          Query.equal('status', 'resolved'),
          Query.limit(1)
        ])
      ]);

      monthlyCounts[monthKey] = {
        incoming: incomingMonth.total,
        resolved: resolvedMonth.total
      };
    }

    const statsData = {
      organization_id: orgId,
      total_reports: totalRes.total,
      active_reports: totalRes.total - resolvedRes.total,
      resolved_reports: resolvedRes.total,
      category_counts: JSON.stringify(categoryCounts),
      monthly_counts: JSON.stringify(monthlyCounts)
    };

    const existingStats = await databases.listDocuments(dbId, statsId, [
      Query.equal('organization_id', orgId),
      Query.limit(1)
    ]);

    if (existingStats.documents.length > 0) {
      await databases.updateDocument(dbId, statsId, existingStats.documents[0].$id, statsData);
    } else {
      await databases.createDocument(dbId, statsId, ID.unique(), statsData);
    }

    return res.json({ success: true });

  } catch (err) {
    return res.json({ success: false, error: err.message }, 500);
  }
};