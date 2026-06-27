import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { FoodTruckLocationWithBusiness } from "@workspace/api-client-react";
import { MapPin, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  foodTruckDirectionsUrl,
  formatFoodTruckTimeWindow,
  getMappableFoodTrucks,
  type FoodTruckMapPoint,
} from "@/lib/food-truck-utils";
import { getFoodTruckMapEmptyMessage } from "@/lib/food-truck-location-form";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

const truckMarkerIcon = L.divIcon({
  className: "food-truck-map-marker",
  html: `<div class="food-truck-map-marker-pin" aria-hidden="true"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -26],
});

function FitMapToMarkers({ points }: { points: FoodTruckMapPoint[] }) {
  const map = useMap();
  const positions = useMemo(
    () => points.map((point) => [point.lat, point.lng] as [number, number]),
    [points],
  );

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 14 });
  }, [map, positions]);

  return null;
}

function FoodTruckMapPopup({ truck }: { truck: FoodTruckMapPoint }) {
  const timeWindow = formatFoodTruckTimeWindow(truck.startTime, truck.endTime);
  const slug = truck.businessSlug ?? String(truck.businessId);
  const businessName = truck.businessName ?? "Food truck";
  const locationLine = truck.address?.trim()
    ? `${truck.locationName} · ${truck.address}`
    : truck.locationName;

  return (
    <div className="min-w-[200px] max-w-[240px] space-y-2 text-sm">
      <div>
        <p className="font-serif text-base font-bold text-foreground">{businessName}</p>
        <p className="mt-1 text-muted-foreground">{locationLine}</p>
        {timeWindow && <p className="mt-1 text-xs text-muted-foreground">{timeWindow}</p>}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link href={`/businesses/${slug}`}>
          <Button size="sm" className="h-8 rounded-full px-3 text-xs">
            View Business
          </Button>
        </Link>
        <a href={foodTruckDirectionsUrl(truck)} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs">
            <Navigation className="mr-1 h-3 w-3" />
            Directions
          </Button>
        </a>
      </div>
    </div>
  );
}

function FoodTruckMapCanvas({ trucks }: { trucks: FoodTruckMapPoint[] }) {
  const initialCenter = trucks[0] ? ([trucks[0].lat, trucks[0].lng] as [number, number]) : DEFAULT_CENTER;
  const initialZoom = trucks.length === 1 ? 14 : DEFAULT_ZOOM;

  return (
    <div className="food-truck-map h-[min(420px,60vh)] w-full overflow-hidden rounded-xl border border-border/50">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={false}
        className="h-full w-full"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitMapToMarkers points={trucks} />
        {trucks.map((truck) => (
          <Marker key={truck.id} position={[truck.lat, truck.lng]} icon={truckMarkerIcon}>
            <Popup className="food-truck-map-popup" minWidth={220}>
              <FoodTruckMapPopup truck={truck} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

type FoodTruckMapSectionProps = {
  todayTrucks: FoodTruckLocationWithBusiness[];
};

export function FoodTruckMapSection({ todayTrucks }: FoodTruckMapSectionProps) {
  const mappableTrucks = useMemo(() => getMappableFoodTrucks(todayTrucks), [todayTrucks]);
  const emptyMessage = getFoodTruckMapEmptyMessage(todayTrucks.length);

  return (
    <section>
      <h2 className="mb-6 font-serif text-2xl font-bold text-foreground">Today&apos;s Map</h2>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5">
          {mappableTrucks.length > 0 ? (
            <FoodTruckMapCanvas trucks={mappableTrucks} />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-50" />
              <p className="font-medium text-foreground">{emptyMessage.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{emptyMessage.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
