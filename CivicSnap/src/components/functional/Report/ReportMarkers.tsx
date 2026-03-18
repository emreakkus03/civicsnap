import { useState, useEffect } from "react";
import { Image } from "react-native";
import { Marker } from "react-native-maps";
import { Query } from "react-native-appwrite";

import { View } from "react-native";

import { API } from "@core/networking/api";
import { useRealtime } from "@core/modules/realtimeProvider/RealtimeProvider";

type ReportMarkerProps = {
    location_lat: number;
    location_long: number;
    onReportPress?:(report: any) => void;
};

export default function ReportMarkers({location_lat, location_long, onReportPress}: ReportMarkerProps) {
    const [reports, setReports] = useState<any[]>([]);
    const { lastUpdate } = useRealtime();

    useEffect(() => {
        if (!location_lat || !location_long) return;

        const fetchLocalReports = async () => {
            try {
                const APIKey = API.config.googleMapsApiKey;
                if (!APIKey) return;

                const geoResponse = await fetch (`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location_lat},${location_long}&key=${APIKey}`);
                const geoData = await geoResponse.json();

                let currentZipCode = "";
                if(geoData.results && geoData.results.length > 0) {
                    const addressComponents = geoData.results[0].address_components;
                    const zipComponent = addressComponents.find((component: any) => component.types.includes("postal_code"))
                    if (zipComponent) currentZipCode = zipComponent.long_name;
                }

                if(!currentZipCode) return;

                const orgsResponse = await API.database.listDocuments(
          API.config.databaseId,
          API.config.organizationsCollectionId,
          [Query.search("zip_codes", currentZipCode)]
        );

        if (orgsResponse.documents.length === 0) return;
        const organizationId = orgsResponse.documents[0].$id;

        const reportsResponse = await API.database.listDocuments(
          API.config.databaseId,
          API.config.reportsCollectionId,
          [
            Query.equal("organization_id", organizationId),
            Query.equal("status", ["new", "approved", "in_progress"]), 
            Query.equal("is_duplicate", false), 
            Query.orderDesc("$createdAt"), 
            Query.limit(50) 
          ]
        );

        setReports(reportsResponse.documents);
            } catch (error) {
                console.error("Error fetching local reports:", error);
            }
        };
        fetchLocalReports();

    }, [location_lat, location_long, lastUpdate]);

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
          onPress={(e) =>{e.stopPropagation(); onReportPress && onReportPress(report);} }
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
};