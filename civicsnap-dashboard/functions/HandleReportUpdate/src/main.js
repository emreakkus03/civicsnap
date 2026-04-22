import { Client, Databases, Query, Functions } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  // 1. VEILIG PARSEN
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { reportId, status, adminNote, profileId, fullName } = payload;

  log(`Update gestart voor report: ${reportId} met status: ${status}`);

  // 2. CONTROLEER ENVIRONMENT VARIABELEN (Nieuw)
  const requiredEnvs = [
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'APPWRITE_DATABASE_ID',
    'APPWRITE_REPORTS_COLLECTION_ID',
    'APPWRITE_PROFILES_COLLECTION_ID',
    'APPWRITE_CATEGORIES_COLLECTION_ID',
    'APPWRITE_FUNCTION_NOTIFY_INTERNAL_NOTE_ID'
  ];

  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  if (missingEnvs.length > 0) {
    const errorMsg = `Configuratiefout: Ontbrekende environment variabelen - ${missingEnvs.join(', ')}`;
    error(errorMsg);
    return res.json({ success: false, error: errorMsg }, 500);
  }

  // 3. INIT CLIENT
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); // Zorg dat deze API Key "Database" én "Execution" rechten heeft

  const databases = new Databases(client);
  const serverFunctions = new Functions(client);

  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const reportsId = process.env.APPWRITE_REPORTS_COLLECTION_ID;
  const profilesId = process.env.APPWRITE_PROFILES_COLLECTION_ID;
  const categoriesId = process.env.APPWRITE_CATEGORIES_COLLECTION_ID;

  try {
    // 4. Haal het rapport op
    const report = await databases.getDocument(databaseId, reportsId, reportId);
    const positiveStatuses = ["approved", "in_progress", "resolved"];
    const pointsAlreadyAwarded = report.points_awarded > 0;
    let newPointsAwarded = report.points_awarded;

    // 5. Ken punten toe aan de originele melder indien nodig
    if (positiveStatuses.includes(status) && !pointsAlreadyAwarded) {
      const category = await databases.getDocument(databaseId, categoriesId, report.category_id);
      const pointsToAward = category.default_points || 0;

      const userProfile = await databases.getDocument(databaseId, profilesId, report.user_id);
      await databases.updateDocument(databaseId, profilesId, report.user_id, {
        current_points: (userProfile.current_points || 0) + pointsToAward
      });
      newPointsAwarded = pointsToAward;
      log(`Punten uitgedeeld: ${pointsToAward} aan user ${report.user_id}`);
    }

    // 6. Update het hoofdrapport
    await databases.updateDocument(databaseId, reportsId, reportId, {
      status: status,
      admin_notes: adminNote,
      points_awarded: newPointsAwarded
    });

    // 7. Update duplicaten
    const duplicates = await databases.listDocuments(databaseId, reportsId, [
      Query.equal("original_report_id", reportId)
    ]);

    for (const dup of duplicates.documents) {
      const dupAlreadyAwarded = dup.points_awarded > 0;
      let dupPoints = dup.points_awarded;

      if (positiveStatuses.includes(status) && !dupAlreadyAwarded) {
        const dupReward = 5;
        const dupProfile = await databases.getDocument(databaseId, profilesId, dup.user_id);
        await databases.updateDocument(databaseId, profilesId, dup.user_id, {
          current_points: (dupProfile.current_points || 0) + dupReward
        });
        dupPoints = dupReward;
      }

      await databases.updateDocument(databaseId, reportsId, dup.$id, {
        status: status,
        admin_notes: adminNote ? `Gekoppeld aan hoofdmeldpunt: ${adminNote}` : "Afgehandeld via originele melding",
        points_awarded: dupPoints
      });
    }

    // 8. Optioneel: Trigger de interne notificatie functie
    if (adminNote && adminNote.trim() !== "") {
      await serverFunctions.createExecution(
        process.env.APPWRITE_FUNCTION_NOTIFY_INTERNAL_NOTE_ID,
        JSON.stringify({ report_id: reportId, org_id: report.organization_id, author_name: fullName })
      );
      log("Notificatie functie succesvol aangeroepen.");
    }

    return res.json({ success: true, message: "Report succesvol geüpdatet en punten berekend." });
  } catch (err) {
    error(err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};