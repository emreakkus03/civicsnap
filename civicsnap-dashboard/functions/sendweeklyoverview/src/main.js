import { Client, Databases, Query } from 'node-appwrite';
import nodemailer from 'nodemailer';

export default async ({ res }) => {
  if (!process.env.APPWRITE_API_KEY || !process.env.DATABASE_ID || !process.env.PROFILES_COLLECTION_ID || !process.env.ORGANIZATIONS_COLLECTION_ID || !process.env.REPORTS_COLLECTION_ID) {
    return res.json({ success: false, error: 'Missing config' }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const orgsRes = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.ORGANIZATIONS_COLLECTION_ID,
      [Query.limit(100)]
    );

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekISO = lastWeek.toISOString();

    for (const org of orgsRes.documents) {
      const profilesRes = await databases.listDocuments(
        process.env.DATABASE_ID,
        process.env.PROFILES_COLLECTION_ID,
        [Query.equal('organization_id', org.$id), Query.limit(100)]
      );

      const targetEmails = [];
      for (const profile of profilesRes.documents) {
        if (profile.preferences) {
          try {
            const prefs = JSON.parse(profile.preferences);
            if (prefs.weekly_summary === true && profile.email) {
              targetEmails.push(profile.email);
            }
          } catch (e) {}
        }
      }

      if (targetEmails.length > 0) {
        const [newReports, resolvedReports] = await Promise.all([
          databases.listDocuments(process.env.DATABASE_ID, process.env.REPORTS_COLLECTION_ID, [
            Query.equal('organization_id', org.$id),
            Query.greaterThanEqual('$createdAt', lastWeekISO),
            Query.limit(1)
          ]),
          databases.listDocuments(process.env.DATABASE_ID, process.env.REPORTS_COLLECTION_ID, [
            Query.equal('organization_id', org.$id),
            Query.greaterThanEqual('$updatedAt', lastWeekISO),
            Query.equal('status', 'resolved'),
            Query.limit(1)
          ])
        ]);

        const mailOptions = {
          from: `"CivicSnap" <${process.env.SMTP_USER}>`,
          to: targetEmails.join(','),
          subject: `CivicSnap Wekelijks Overzicht - ${org.name}`,
          html: `
            <h2>Wekelijks overzicht voor ${org.name}</h2>
            <p>Hier is de stand van zaken van de afgelopen 7 dagen:</p>
            <ul>
              <li><strong>Nieuwe meldingen binnengekomen:</strong> ${newReports.total}</li>
              <li><strong>Meldingen opgelost:</strong> ${resolvedReports.total}</li>
            </ul>
            <a href="https://civicsnap-phi.vercel.app/">Ga naar het dashboard</a>
          `
        };

        await transporter.sendMail(mailOptions);
      }
    }

    return res.json({ success: true });

  } catch (err) {
    return res.json({ success: false, error: err.message }, 500);
  }
};