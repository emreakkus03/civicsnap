import { Client, Databases, Query } from 'node-appwrite';

// Mathematical formula to calculate distance in meters between 2 GPS coordinates
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 + 
        Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Helper function to check how many labels two arrays have in common
function calculateLabelOverlap(labels1, labels2) {
  if (!labels1 || !labels2 || !Array.isArray(labels1) || !Array.isArray(labels2)) return 0;
  const set2 = new Set(labels2);
  const intersection = labels1.filter(label => set2.has(label));
  return intersection.length;
}

export default async ({ req, res, log, error }) => {
  if (!req.headers['x-appwrite-event']) {
    return res.json({ success: false, message: 'Moet via event trigger lopen.' }, 400);
  }

  const newReport = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  
  if (newReport.original_report_id) {
    return res.json({ success: true, message: "Report is already linked as duplicate." });
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.DATABASE_ID;
  const collectionId = process.env.REPORTS_COLLECTION_ID;

  try {
    log(`Searching for duplicates for report ${newReport.$id} in category ${newReport.category_id}`);

    // 1. Search for other active reports with the exact same category and organization
    const existingReports = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.equal('organization_id', newReport.organization_id),
        Query.equal('category_id', newReport.category_id),
        Query.equal('status', ['new', 'approved', 'in_progress']),
        Query.notEqual('$id', newReport.$id),
        Query.isNull('original_report_id')
      ]
    );

    let foundOriginalId = null;

    // 2. Loop through the results and check GPS distance & AI labels
    for (const report of existingReports.documents) {
      const distance = getDistanceFromLatLonInMeters(
        newReport.location_lat, newReport.location_long, 
        report.location_lat, report.location_long
      );

      log(`Distance to ${report.$id}: ${Math.round(distance)} meters`);

      if (distance <= 50) {
        const newLabels = newReport.vision_labels || [];
        const oldLabels = report.vision_labels || [];

        if (newLabels.length > 0 && oldLabels.length > 0) {
          const sharedWordsCount = calculateLabelOverlap(newLabels, oldLabels);
          log(`Shared AI labels with ${report.$id}: ${sharedWordsCount} words`);

          if (sharedWordsCount >= 2) {
             foundOriginalId = report.$id;
             log(`AI MATCH! Original ID becomes: ${foundOriginalId}`);
             break;
          } else {
             log(`No AI match. These are different objects in the same area.`);
          }
        } else {
          foundOriginalId = report.$id;
          log(`GPS MATCH (No AI data available). Original ID becomes: ${foundOriginalId}`);
          break;
        }
      }
    }

    // 3. If we found a match, update the new report as duplicate
    if (foundOriginalId) {
      await databases.updateDocument(
        databaseId,
        collectionId,
        newReport.$id,
        {
          original_report_id: foundOriginalId,
          is_duplicate: true
        }
      );
      log(`Duplicate linked to ${foundOriginalId}.`);
      return res.json({ success: true, message: `Duplicate successfully linked to ${foundOriginalId}` });
    }

    log("No duplicates found.");
    return res.json({ success: true, message: "No duplicates found." });

  } catch (err) {
    error(`Error during duplicate check: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};