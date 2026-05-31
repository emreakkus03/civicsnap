import { Client, Databases, Query, ID } from 'node-appwrite';
import nodemailer from 'nodemailer';

const permitAdapters = {
  generic_rest: {
    async getActivePermit(apiUrl, credentials, address, date) {
      const headers = buildAuthHeaders(credentials);
      const url = `${apiUrl}/permits/active?address=${encodeURIComponent(address)}&date=${date}`;
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data?.[0];
      if (!raw) return null;
      return {
        contractor_email: raw.contractor_email,
        contractor_name: raw.contractor_name,
        valid_from: raw.valid_from,
        valid_until: raw.valid_until,
      };
    },
    async getLastPermit(apiUrl, credentials, address, withinDays = 365) {
      const headers = buildAuthHeaders(credentials);
      const since = new Date(Date.now() - withinDays * 86400000).toISOString().split('T')[0];
      const url = `${apiUrl}/permits/history?address=${encodeURIComponent(address)}&since=${since}&limit=1`;
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data?.[0];
      if (!raw) return null;
      return {
        contractor_email: raw.contractor_email,
        contractor_name: raw.contractor_name,
        valid_from: raw.valid_from,
        valid_until: raw.valid_until,
      };
    }
  },
  hamme_v1: {
    async getActivePermit(apiUrl, credentials, address, date, zipCode) {
      const match = address.match(/^(.+?)\s+(\d+)/);
      if (!match) return null;
      const straat = match[1].trim();
      const huisnummer = match[2];
      const url = `${apiUrl}/api/check-vergunning?postcode=${zipCode}&straat=${encodeURIComponent(straat)}&huisnummer=${huisnummer}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== "ACTIVE" || !data.data) return null;
      return {
        contractor_email: data.data.bedrijf_email,
        contractor_name:  data.data.bedrijf_naam,
        valid_from:       data.data.start_datum,
        valid_until:      data.data.eind_datum,
      };
    },
    async getLastPermit(apiUrl, credentials, address, withinDays = 365, zipCode) {
      const match = address.match(/^(.+?)\s+(\d+)/);
      if (!match) return null;
      const straat = match[1].trim();
      const huisnummer = match[2];
      const url = `${apiUrl}/api/check-vergunning?postcode=${zipCode}&straat=${encodeURIComponent(straat)}&huisnummer=${huisnummer}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== "HISTORICAL" || !data.data) return null;
      return {
        contractor_email: data.data.bedrijf_email,
        contractor_name:  data.data.bedrijf_naam,
        valid_from:       data.data.start_datum,
        valid_until:      data.data.eind_datum,
      };
    }
  },
  berlare_v1: {
    async getActivePermit(apiUrl, credentials, address, date) {
      const headers = buildAuthHeaders(credentials);
      const res = await fetch(`${apiUrl}/...`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data.data.permits.active[0];
      if (!raw) return null;
      return {
        contractor_email: raw.contractor.contact.email,
        contractor_name: raw.contractor.name,
        valid_from: raw.period.start,
        valid_until: raw.period.end,
      };
    },
    async getLastPermit(apiUrl, credentials, address, withinDays = 365) {
      const headers = buildAuthHeaders(credentials);
      const since = new Date(Date.now() - withinDays * 86400000).toISOString().split('T')[0];
      const res = await fetch(`${apiUrl}/...`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data.data.permits.history[0];
      if (!raw) return null;
      return {
        contractor_email: raw.contractor.contact.email,
        contractor_name: raw.contractor.name,
        valid_from: raw.period.start,
        valid_until: raw.period.end,
      };
    }
  }
};

function buildAuthHeaders(credentials) {
  if (!credentials) return {};
  const creds = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
  switch (creds.type) {
    case 'api_key':
      return { 'X-API-Key': creds.key };
    case 'bearer':
      return { 'Authorization': `Bearer ${creds.token}` };
    case 'basic':
      const encoded = btoa(`${creds.username}:${creds.password}`);
      return { 'Authorization': `Basic ${encoded}` };
    default:
      return {};
  }
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const report = req.body;

  if (!report?.$id) {
    error('Geen geldig report object ontvangen');
    return res.json({ success: false, reason: 'invalid_payload' });
  }

  log(`Verwerking report ${report.$id} op adres: ${report.address}`);

  try {
    // -------------------------------------------------------------------
    // STAP 1: HAAL DE CATEGORIE NAAM OP EN CHECK OF DEZE RELEVANT IS
    // -------------------------------------------------------------------
    if (!report.category_id) {
      log('Geen category_id meegegeven in het report, melding genegeerd.');
      return res.json({ success: true, action: 'ignored_no_category_id' });
    }

    const categoryDoc = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.CATEGORIES_COLLECTION_ID,
      report.category_id
    );

    const allowedCategories = ["schade aan trottoir", "schade aan wegdek"];
    const reportCategoryName = (categoryDoc.name || "").toLowerCase();

    if (!allowedCategories.includes(reportCategoryName)) {
      log(`Melding genegeerd: categorie "${categoryDoc.name}" is niet relevant voor aannemers.`);
      return res.json({ success: true, action: 'ignored_category' });
    }

    // -------------------------------------------------------------------
    // STAP 2: SETUP NODEMAILER & VERVOLG DE NORMALE FLOW
    // -------------------------------------------------------------------
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const integrations = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.INTEGRATIONS_COLLECTION_ID,
      [
        Query.equal('organization_id', report.organization_id),
        Query.equal('service_type', 'permits'),
        Query.equal('is_active', true),
        Query.limit(1),
      ]
    );

    if (integrations.documents.length === 0) {
      log(`Geen actieve integratie voor organisatie ${report.organization_id}`);
      return res.json({ success: true, action: 'no_integration' });
    }

    const integration = integrations.documents[0];
    const adapter = permitAdapters[integration.system_type] ?? permitAdapters['generic_rest'];

    const org = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.ORGANIZATIONS_COLLECTION_ID,
      report.organization_id
    );
    const officialEmail = org.contact_email;
    const today = new Date().toISOString().split('T')[0];

    const imageUrl = report.photo_url || null;

    const activePermit = await adapter.getActivePermit(
      integration.api_url,
      integration.auth_credentials,
      report.address,
      today,
      report.zip_code
    );

    if (activePermit?.contractor_email) {
      log(`Scenario 1: actieve vergunning gevonden op ${report.address}`);

      await transporter.sendMail({
        from: `"CivicSnap" <${process.env.SMTP_FROM}>`,
        to: activePermit.contractor_email,
        cc: officialEmail,
        subject: `Nieuwe melding op uw werkzone — ${report.address}`,
        html: `
          <p>Geachte ${activePermit.contractor_name},</p>
          <p>Er werd een nieuwe burgersmelding ingediend op een adres waar u momenteel een actieve vergunning heeft (<strong>${report.address}</strong>).</p>
          <p><strong>Omschrijving:</strong><br/>${report.description}</p>
          ${imageUrl ? `<p><img src="${imageUrl}" alt="Foto van de melding" style="max-width: 400px; border-radius: 8px;" /></p>` : ''}
          <p>Gelieve te bekijken of deze melding verband houdt met uw werkzaamheden.</p>
          <p>Referentie: ${report.$id}</p>
          <p>Met vriendelijke groeten,<br/>CivicSnap</p>
        `,
        attachments: imageUrl ? [{ filename: `civicsnap-foto-${report.$id}.jpg`, path: imageUrl }] : []
      });

      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.PERMIT_MAIL_LOGS_COLLECTION_ID,
        ID.unique(),
        {
          report_id: report.$id,
          contractor_email: activePermit.contractor_email,
          organization_id: report.organization_id,
          sent_at: new Date().toISOString(),
          scenario: 1,
          responded: false,
          reminder_sent: false,
        }
      );

      return res.json({ success: true, action: 'scenario_1_mail_sent' });
    }

    log(`Scenario 2: geen actieve vergunning, zoek laatste vergunninghouder`);

    const lastPermit = await adapter.getLastPermit(
      integration.api_url,
      integration.auth_credentials,
      report.address,
      365,
      report.zip_code
    );

    if (lastPermit?.contractor_email) {
      log(`Scenario 2: laatste vergunninghouder gevonden: ${lastPermit.contractor_name}`);

      await transporter.sendMail({
        from: `"CivicSnap" <${process.env.SMTP_FROM}>`,
        to: lastPermit.contractor_email,
        cc: officialEmail,
        subject: `Vraag omtrent vroegere werken — ${report.address}`,
        html: `
          <p>Geachte ${lastPermit.contractor_name},</p>
          <p>Er werd een burgersmelding ingediend op <strong>${report.address}</strong>. Uit onze gegevens blijkt dat u de meest recente vergunninghouder bent voor werken op dit adres (periode: ${lastPermit.valid_from} – ${lastPermit.valid_until}).</p>
          <p><strong>Omschrijving:</strong><br/>${report.description}</p>
          ${imageUrl ? `<p><img src="${imageUrl}" alt="Foto van de melding" style="max-width: 400px; border-radius: 8px;" /></p>` : ''}
          <p>We vragen u na te gaan of deze melding mogelijk gerelateerd is aan de eerder uitgevoerde werken.</p>
          <p>Referentie: ${report.$id}</p>
          <p>Met vriendelijke groeten,<br/>CivicSnap</p>
        `,
        attachments: imageUrl ? [{ filename: `civicsnap-foto-${report.$id}.jpg`, path: imageUrl }] : []
      });

      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.PERMIT_MAIL_LOGS_COLLECTION_ID,
        ID.unique(),
        {
          report_id: report.$id,
          contractor_email: lastPermit.contractor_email,
          organization_id: report.organization_id,
          sent_at: new Date().toISOString(),
          scenario: 2,
          responded: false,
          reminder_sent: false,
        }
      );

      return res.json({ success: true, action: 'scenario_2_mail_sent' });
    }

    log(`Geen vergunninghouder gevonden voor ${report.address}`);
    return res.json({ success: true, action: 'no_permit_found' });

  } catch (err) {
    error(`Fout bij verwerking report ${report.$id}: ${err.message}`);
    return res.json({ success: false, error: err.message });
  }
};