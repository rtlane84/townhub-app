import { useCallback, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { LocateFixed, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  foodTruckDirectionsUrl,
  formatFoodTruckTimeWindow,
  type FoodTruckMapPoint,
} from "@/lib/food-truck-utils";
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

function fitMapToPoints(map: L.Map, positions: [number, number][]) {
  if (positions.length === 0) return;
  if (positions.length === 1) {
    map.setView(positions[0], 14);
    return;
  }
  map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 14 });
}

function MapViewportControls({ points }: { points: FoodTruckMapPoint[] }) {
  const map = useMap();
  const positions = useMemo(
    () => points.map((point) => [point.lat, point.lng] as [number, number]),
    [points],
  );

  const recenter = useCallback(() => {
    fitMapToPoints(map, positions);
  }, [map, positions]);

  useEffect(() => {
    recenter();
  }, [recenter]);

  return (
    <div className="absolute bottom-3 right-3 z-[1000]">
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-10 w-10 rounded-full border border-black/10 bg-card shadow-md"
        onClick={recenter}
        aria-label="Recenter map on trucks"
        data-testid="button-food-truck-map-recenter"
      >
        <LocateFixed className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
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

export default function FoodTruckMapCanvas({ trucks }: { trucks: FoodTruckMapPoint[] }) {
  const initialCenter = trucks[0] ? ([trucks[0].lat, trucks[0].lng] as [number, number]) : DEFAULT_CENTER;
  const initialZoom = trucks.length === 1 ? 14 : DEFAULT_ZOOM;

  return (
    <div className="food-truck-map relative h-[min(420px,60vh)] w-full overflow-hidden rounded-[1.25rem] border-0">
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
        <MapViewportControls points={trucks} />
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
