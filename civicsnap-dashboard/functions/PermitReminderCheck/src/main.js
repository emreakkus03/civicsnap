import { Client, Databases, Query, Messaging, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const messaging = new Messaging(client);

  // Zoek alle mail logs ouder dan 3 dagen zonder antwoord en zonder reminder
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  const logs = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.PERMIT_MAIL_LOGS_COLLECTION_ID,
    [
      Query.equal('responded', false),
      Query.equal('reminder_sent', false),
      Query.lessThan('sent_at', threeDaysAgo),
      Query.limit(50),
    ]
  );

  log(`${logs.documents.length} openstaande mails gevonden voor reminder`);

  for (const mailLog of logs.documents) {
    try {
      await messaging.createEmail(
        ID.unique(),
        `Herinnering: burgersmelding wacht op uw reactie`,
        `
          <p>Geachte,</p>
          <p>
            Dit is een automatische herinnering. U ontving eerder een melding 
            van CivicSnap in verband met een burgersmelding 
            (referentie: ${mailLog.report_id}).
          </p>
          <p>
            We hebben nog geen reactie ontvangen. Gelieve dit te bekijken 
            en indien nodig actie te ondernemen.
          </p>
          <p>Met vriendelijke groeten,<br/>CivicSnap</p>
        `,
        [mailLog.contractor_email],
        [],
        [],
        [],
        true
      );

      // Markeer als reminder verstuurd zodat we niet dubbel sturen
      await databases.updateDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.PERMIT_MAIL_LOGS_COLLECTION_ID,
        mailLog.$id,
        { reminder_sent: true }
      );

      log(`Reminder verstuurd naar ${mailLog.contractor_email}`);
    } catch (err) {
      error(`Fout bij reminder voor log ${mailLog.$id}: ${err.message}`);
    }
  }

  return res.json({ success: true, reminders_sent: logs.documents.length });
};