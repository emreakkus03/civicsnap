
import { Client, Databases, Query, Messaging, ID } from 'node-appwrite';


const permitAdapters = {

  /**
   * Generieke REST adapter.
   * Gebruik deze als fallback of als de gemeente een standaard REST API heeft.
   */
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

  /**
   * Hamme-specifieke adapter.
   * Pas de veldnamen aan op wat hun API exact teruggeeft.
   */
 hamme_v1: {
  async getActivePermit(apiUrl, credentials, address, date, zipCode) {
    // address = "Noordstraat 45", zip_code = "9220" — komen apart binnen
    const match = address.match(/^(.+?)\s+(\d+)/);
    if (!match) return null;

    const straat = match[1].trim();   // "Noordstraat"
    const huisnummer = match[2];      // "45"

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

  /**
   * Berlare adapter — voeg je toe als Berlare aansluit.
   * Lees hun API documentatie en pas de veldnamen hieronder aan.
   */
  berlare_v1: {
    async getActivePermit(apiUrl, credentials, address, date) {
      const headers = buildAuthHeaders(credentials);
      const res = await fetch(`${apiUrl}/...`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      // Pas dit aan op hun JSON structuur
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
  },

  // Dendermonde, Lokeren, ... → zelfde structuur, andere veldnamen
};

// ============================================================
// AUTH HELPER
// Bouwt de juiste HTTP headers op basis van het auth type
// dat opgeslagen is in auth_credentials in de database.
// ============================================================
function buildAuthHeaders(credentials) {
  if (!credentials) return {};
  const creds = typeof credentials === 'string'
    ? JSON.parse(credentials)
    : credentials;

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

// ============================================================
// HOOFD FUNCTIE
// Wordt getriggerd bij elke nieuwe report in de database.
// ============================================================
export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const messaging = new Messaging(client);

  const report = req.body;

  if (!report?.$id) {
    error('Geen geldig report object ontvangen');
    return res.json({ success: false, reason: 'invalid_payload' });
  }

  log(`Verwerking report ${report.$id} op adres: ${report.address}`);

  try {
    // Stap 1: Zoek de actieve vergunningen-integratie voor deze organisatie
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

    // Kies de juiste adapter op basis van system_type in de database
    // Valt terug op generic_rest als het type niet herkend wordt
    const adapter = permitAdapters[integration.system_type] ?? permitAdapters['generic_rest'];

    // Stap 2: Haal de ambtenaar email op van de organisatie (voor CC)
    const org = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.ORGANIZATIONS_COLLECTION_ID,
      report.organization_id
    );
    const officialEmail = org.contact_email;

    const today = new Date().toISOString().split('T')[0];

    // ============================================================
    // SCENARIO 1
    // Is er een actieve vergunning op dit adres vandaag?
    // → Mail naar aannemer + CC naar ambtenaar
    // ============================================================
    const activePermit = await adapter.getActivePermit(
  integration.api_url,
  integration.auth_credentials,
  report.address,
  today,
  report.zip_code  
);

    if (activePermit?.contractor_email) {
      log(`Scenario 1: actieve vergunning gevonden op ${report.address}`);

    await messaging.createEmail({
  messageId: ID.unique(),
  subject: `Nieuwe melding op uw werkzone — ${report.address}`,
  content: `
    <p>Geachte ${activePermit.contractor_name},</p>
    <p>
      Er werd een nieuwe burgersmelding ingediend op een adres waar u 
      momenteel een actieve vergunning heeft (<strong>${report.address}</strong>).
    </p>
    <p><strong>Omschrijving:</strong><br/>${report.description}</p>
    <p>Gelieve te bekijken of deze melding verband houdt met uw werkzaamheden.</p>
    <p>Referentie: ${report.$id}</p>
    <p>Met vriendelijke groeten,<br/>CivicSnap</p>
  `,
  topics: [],
  users: [],
  targets: [activePermit.contractor_email],
  cc: [officialEmail],
  bcc: [],
  html: true,
});

      // Sla mail log op voor de reminder function
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

    // ============================================================
    // SCENARIO 2
    // Geen actieve vergunning → wie werkte hier het laatste jaar?
    // → Mail naar laatste aannemer + CC naar ambtenaar
    // ============================================================
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

    await messaging.createEmail({
  messageId: ID.unique(),
  subject: `Vraag omtrent vroegere werken — ${report.address}`,
  content: `
    <p>Geachte ${lastPermit.contractor_name},</p>
    <p>
      Er werd een burgersmelding ingediend op <strong>${report.address}</strong>. 
      Uit onze gegevens blijkt dat u de meest recente vergunninghouder bent 
      voor werken op dit adres (periode: ${lastPermit.valid_from} – ${lastPermit.valid_until}).
    </p>
    <p><strong>Omschrijving:</strong><br/>${report.description}</p>
    <p>We vragen u na te gaan of deze melding mogelijk gerelateerd is aan de eerder uitgevoerde werken.</p>
    <p>Referentie: ${report.$id}</p>
    <p>Met vriendelijke groeten,<br/>CivicSnap</p>
  `,
  topics: [],
  users: [],
  targets: [lastPermit.contractor_email],
  cc: [officialEmail],
  bcc: [],
  html: true,
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