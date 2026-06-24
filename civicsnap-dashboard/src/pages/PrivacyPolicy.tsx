import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex justify-center bg-[#F5F7FA] font-inter p-4 sm:p-8">
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-lg w-full max-w-3xl">
                
                {/* Header */}
                <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="mr-4 p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors focus:outline-none rounded-lg hover:bg-gray-50"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-inter-bold text-gray-900">
                        Privacybeleid
                    </h1>
                </div>

                {/* Content */}
                <div className="text-gray-700 font-inter-regular text-sm sm:text-base space-y-6">
                    <p className="text-gray-500 text-xs sm:text-sm">Laatst bijgewerkt op: 11 juni 2026</p>

                    <p className="leading-relaxed">
                        Welkom bij CivicSnap! Wij hechten veel waarde aan jouw privacy en de bescherming van jouw persoonsgegevens. Dit beleid is opgesteld in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG/GDPR). CivicSnap is uitsluitend bedoeld voor gebruikers van 16 jaar en ouder.
                    </p>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">1. Welke persoonsgegevens wij verzamelen</h2>
                        <p className="mb-2">Wij verzamelen en verwerken de volgende gegevens:</p>
                        <ul className="list-disc pl-5 space-y-2 text-gray-600">
                            <li><span className="font-inter-bold text-gray-900">Account & Profiel:</span> Naam, e-mailadres, wachtwoord en (optioneel) je profielfoto.</li>
                            <li><span className="font-inter-bold text-gray-900">Locatiegegevens:</span> Om problemen accuraat te melden, vragen wij uitdrukkelijke toestemming tot de GPS-locatie van je apparaat.</li>
                            <li><span className="font-inter-bold text-gray-900">Media (Camera & Galerij):</span> Foto's die je uploadt bij een melding of als profielfoto via de camera of fotogalerij.</li>
                            <li><span className="font-inter-bold text-gray-900">Communicatie:</span> Berichten die via de interne chatfunctie tussen jou en de gemeente worden uitgewisseld.</li>
                            <li><span className="font-inter-bold text-gray-900">Pushnotificaties:</span> Om je op de hoogte te houden van statusupdates over jouw meldingen of nieuwe chatberichten, vragen we toestemming om pushnotificaties te sturen. Je kunt deze te allen tijde in- of uitschakelen via de instellingen van je telefoon of browser.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">2. Zichtbaarheid en Delen van gegevens</h2>
                        <ul className="list-disc pl-5 space-y-2 text-gray-600">
                            <li><span className="font-inter-bold text-gray-900">Publieke Kaart:</span> Jouw meldingen (inclusief foto, beschrijving, AI-label en status) zijn anoniem zichtbaar voor andere gebruikers op de openbare kaart. Jouw persoonlijke accountgegevens worden hierbij verborgen voor medeburgers.</li>
                            <li><span className="font-inter-bold text-gray-900">De Gemeente:</span> De gemeente ontvangt via ons afgeschermde dashboard wél de volledige melding, inclusief de exacte locatie en jouw naam als melder, om het probleem efficiënt te kunnen verhelpen of contact met je op te nemen via de chat.</li>
                            <li><span className="font-inter-bold text-gray-900">Externe API's:</span> Wij maken gebruik van Google Maps en Apple Maps voor kaartweergave, en de Google Cloud Vision API om meldingen via AI in categorieën in te delen. Foto's worden niet permanent door Google opgeslagen.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">3. Dataminimalisatie en Bewaartermijnen</h2>
                        <p className="leading-relaxed">
                            Alle gegevens (waaronder meldingen, verzamelde XP, diamanten en coupons) worden veilig in onze database opgeslagen om jouw in-app voortgang te behouden en de gemeente inzicht te geven in de oploshistorie. In jouw eigen profiel tonen wij de meldingen van de afgelopen 3 maanden. Je persoonsgegevens blijven bewaard zolang je account actief is. Zodra je jouw account via de instellingen verwijdert, worden je persoonsgegevens gewist conform de AVG.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">4. Jouw Rechten</h2>
                        <p className="leading-relaxed mb-3">
                            Je hebt te allen tijde het recht om je gegevens in te zien of te corrigeren. Daarnaast bieden wij een directe knop aan om je account en alle daaraan gekoppelde persoonlijke gegevens permanent te verwijderen.
                        </p>
                        <p className="leading-relaxed">
                            Voor vragen over jouw privacy kun je contact met ons opnemen via: <a href="mailto:privacy@civicsnap.be" className="text-[#0870C4] hover:underline font-inter-bold">privacy@civicsnap.be</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}