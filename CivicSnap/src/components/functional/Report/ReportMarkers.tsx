import { useState, useEffect } from "react";
import { Image } from "react-native";
import { Marker } from "react-native-maps";
import { Query } from "react-native-appwrite";

import { View } from "react-native";

import { API } from "@core/networking/api";
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";

const fetchWithTimeout = <T,>(promise: Promise<T>, ms: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: Server reageerde niet binnen ${ms}ms`)), ms)
    ),
  ]);
};

type ReportMarkerProps = {
  location_lat: number;
  location_long: number;
  onReportPress?: (report: any) => void;
};

export default function ReportMarkers({
  location_lat,
  location_long,
  onReportPress,
}: ReportMarkerProps) {
  const [reports, setReports] = useState<any[]>([]);
  const { lastUpdate } = useRealtime();
  const [currentZipCode, setCurrentZipCode] = useState("");

  useEffect(() => {
    if (!location_lat || !location_long) return;

    const fetchZipCode = async () => {
      try {
        const APIKey = API.config.googleMapsApiKey;
        if (!APIKey) return;

        const geoResponse = await fetchWithTimeout(
          fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location_lat},${location_long}&key=${APIKey}`)
        );
        const geoData = await geoResponse.json();

        if (geoData.results && geoData.results.length > 0) {
          const zipComponent = geoData.results[0].address_components.find(
            (c: any) => c.types.includes("postal_code"),
          );
          if (zipComponent) setCurrentZipCode(zipComponent.long_name);
        }
      } catch (error) {
        console.error("Error fetching zipcode (Timeout of Netwerkfout):", error);
      }
    };

    fetchZipCode();
  }, []);

  useEffect(() => {
    if (!currentZipCode) return;

    const fetchReportsByZip = async () => {
      try {
        const orgsResponse = await fetchWithTimeout(
          API.database.listDocuments(
            API.config.databaseId,
            API.config.organizationsCollectionId,
            [Query.search("zip_codes", currentZipCode)],
          )
        );

        if (orgsResponse.documents.length === 0) return;
        const organizationId = orgsResponse.documents[0].$id;

        const reportsResponse = await fetchWithTimeout(
          API.database.listDocuments(
            API.config.databaseId,
            API.config.reportsCollectionId,
            [
              Query.equal("organization_id", organizationId),
              Query.equal("status", ["new", "approved", "in_progress"]),
              Query.equal("is_duplicate", false),
              Query.equal("is_shadowbanned", false),
              Query.orderDesc("$createdAt"),
              Query.limit(50),
            ],
          )
        );

        setReports(reportsResponse.documents);
      } catch (error) {
        console.error("Error fetching reports (Timeout of Netwerkfout):", error);
      }
    };

    fetchReportsByZip();
  }, [currentZipCode, lastUpdate]);

  if (reports.length === 0) return null;

  return (
    <>
      {reports.map((report) => (
        <Marker
          key={report.$id}
          coordinate={{
            latitude: report.location_lat,
            longitude: report.location_long,
          }}
          title={report.category_name || "Melding"}
          description={report.address || "Adres onbekend"}
          onPress={(e) => {
            e.stopPropagation();
            onReportPress && onReportPress(report);
          }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <Image
            source={require("@assets/icons/ReportPinMarker.png")}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </Marker>
      ))}
    </>
  );
}