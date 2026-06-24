import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
                        Gebruiksvoorwaarden
                    </h1>
                </div>

                {/* Content */}
                <div className="text-gray-700 font-inter-regular text-sm sm:text-base space-y-6">
                    <p className="text-gray-500 text-xs sm:text-sm">Laatst bijgewerkt op: 11 juni 2026</p>

                    <p className="leading-relaxed">
                        Welkom bij CivicSnap. Om dit platform te gebruiken, moet je minimaal 16 jaar oud zijn. Door gebruik te maken van de webapplicatie en diensten, ga je akkoord met de onderstaande voorwaarden. Lees deze zorgvuldig door.
                    </p>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">1. Acceptabel Gebruik & Moderatie</h2>
                        <p className="leading-relaxed mb-2">
                            CivicSnap is ontwikkeld als een communicatiemiddel om samen de leefbaarheid en veiligheid in gemeentes te verbeteren. Je bent als gebruiker persoonlijk verantwoordelijk voor de inhoud van de meldingen die je verstuurt. Het is ten strengste verboden om het platform te gebruiken voor:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-4">
                            <li>Het plaatsen van valse, misleidende of 'spam' meldingen.</li>
                            <li>Het uploaden van haatdragende, illegale, of seksueel expliciete foto's.</li>
                            <li>Het taggen van ongepaste content op specifieke geografische locaties.</li>
                        </ul>
                        <p className="leading-relaxed">
                            Bij detectie van misbruik behouden wij ons het recht voor om maatregelen te nemen, zoals het verwijderen van meldingen of het beperken van een account via een zogenaamde "shadowban". Bij een shadowban ontvang je géén waarschuwing of notificatie. Alles lijkt normaal te werken, maar jouw gemaakte meldingen worden onzichtbaar gemaakt en niet langer doorgestuurd naar de gemeente.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">2. Eigendomsrecht & Licentie Media</h2>
                        <p className="leading-relaxed">
                            Wanneer je een foto uploadt bij een melding, behoud jij het eigendomsrecht van deze foto. Je verleent CivicSnap en de bevoegde gemeente echter een kosteloze, permanente licentie om deze foto te gebruiken voor het documenteren, analyseren en oplossen van het gemelde probleem.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">3. Gamification (XP, Diamanten & Coupons)</h2>
                        <p className="leading-relaxed mb-3">
                            CivicSnap bevat een loyaliteitssysteem waarbij gebruikers XP (voor levels) en diamanten kunnen verdienen via goedgekeurde meldingen of de "Daily Spin" minigame. Deze diamanten kunnen in de in-app shop worden ingewisseld voor kortingscoupons.
                        </p>
                        <p className="leading-relaxed">
                            Let op: XP, diamanten en coupons hebben géén monetaire waarde, kunnen niet worden gekocht met echt geld en kunnen onder geen enkel beding worden ingewisseld voor contant geld. Wij behouden ons het recht voor om beloningen of shop-aanbiedingen op elk moment te wijzigen of te beëindigen.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">4. Communicatie & Chat</h2>
                        <p className="leading-relaxed">
                            Het platform bevat een interne chatfunctie. Deze functionaliteit is uitsluitend bedoeld voor gemeentelijke opvolging; de gemeente kan indien nodig een chat met jou initiëren. Als burger kun je geen nieuwe chat starten met de gemeente, maar wel reageren op een gestart gesprek.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">5. Regels omtrent het gebruik van de Kaart</h2>
                        <p className="leading-relaxed mb-2">De interactieve kaart wordt geleverd door kaartdiensten zoals Google Maps en Apple Maps. Het is verboden om:</p>
                        <ul className="list-disc pl-5 space-y-2 text-gray-600">
                            <li>Geografische data of adressen uit de applicatie te kopiëren of te scrapen.</li>
                            <li>De kaartdata weer te geven op diensten van derde partijen.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg sm:text-xl font-inter-bold text-gray-900 mb-3">6. Beperking van Aansprakelijkheid</h2>
                        <p className="leading-relaxed mb-3">
                            CivicSnap is op geen enkele wijze verantwoordelijk voor de termijn waarbinnen een gemeente een probleem oppakt, de manier waarop een gemeente een melding oplost, of eventuele schade die voortvloeit uit onopgeloste meldingen.
                        </p>
                        <p className="leading-relaxed font-inter-bold text-gray-900">
                            Door CivicSnap te gebruiken, bevestig je dat je deze voorwaarden hebt gelezen, begrepen en ermee akkoord gaat.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}