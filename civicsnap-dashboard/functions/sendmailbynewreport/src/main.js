import { Client, Databases, Query } from 'node-appwrite';
import nodemailer from 'nodemailer';

export default async ({ req, res }) => {
  if (!process.env.APPWRITE_API_KEY || !process.env.DATABASE_ID || !process.env.PROFILES_COLLECTION_ID) {
    return res.json({ success: false, error: 'Missing config' }, 500);
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const orgId = payload.organization_id;

  if (!orgId) return res.json({ success: true, message: 'Skipped: No org_id' });

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
    const profilesRes = await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.PROFILES_COLLECTION_ID,
      [Query.equal('organization_id', orgId), Query.limit(100)]
    );

    const targetEmails = [];

    for (const profile of profilesRes.documents) {
      if (profile.preferences) {
        try {
          const prefs = JSON.parse(profile.preferences);
          if (prefs.email_on_new_report === true && profile.email) {
            targetEmails.push(profile.email);
          }
        } catch (e) {}
      }
    }

    if (targetEmails.length === 0) {
      return res.json({ success: true, message: 'No users subscribed' });
    }

    const imageUrl = payload.photo_url || null;

    const mailOptions = {
      from: `"CivicSnap" <${process.env.SMTP_USER}>`,
      to: targetEmails.join(','),
      subject: `Nieuwe melding in CivicSnap: ${payload.category_id || 'Onbekend'}`,
      html: `
        <h2>Er is een nieuwe melding gemaakt!</h2>
        <p><strong>Locatie:</strong> ${payload.address || 'Onbekend adres'}, ${payload.city || ''}</p>
        <p><strong>Beschrijving:</strong> ${payload.description || 'Geen beschrijving'}</p>
        ${imageUrl ? `<p><img src="${imageUrl}" alt="Foto van de melding" style="max-width: 400px; border-radius: 8px;" /></p>` : ''}
        <br/>
        <a href="https://civicsnap-phi.vercel.app/reports/${payload.$id}">Bekijk melding in dashboard</a>
      `,
      attachments: imageUrl ? [{ filename: `civicsnap-foto-${payload.$id}.jpg`, path: imageUrl }] : []
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, recipients: targetEmails.length });

  } catch (err) {
    return res.json({ success: false, error: err.message }, 500);
  }
};