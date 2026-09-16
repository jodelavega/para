// Type declarations for Google Maps JavaScript API
// Reference: https://developers.google.com/maps/documentation/javascript/typescript-bootcamp

declare const google: GoogleMapsNamespace;

interface GoogleMapsNamespace {
  maps: {
    Map: { new (element: HTMLElement, options: MapOptions): google.maps.Map };
    Marker: { new (options: MarkerOptions): google.maps.Marker };
    Polyline: { new (options: PolylineOptions): google.maps.Polyline };
    LatLngBounds: { new (): google.maps.LatLngBounds };
    DirectionsService: { new (): google.maps.DirectionsService };
    SymbolPath: { CIRCLE: string };
    TravelMode: { DRIVING: string };
    DirectionsStatus: { OK: string };
    Size: { new (width: number, height: number): google.maps.Size };
    Point: { new (x: number, y: number): google.maps.Point };
  };
}

declare namespace google.maps {
  interface Map {
    setCenter(latlng: LatLngLiteral): void;
    setZoom(zoom: number): void;
    fitBounds(bounds: LatLngBounds, padding?: { padding: number[] }): void;
    setMapTypeId(typeId: string): void;
  }
  interface Marker {
    setPosition(latlng: LatLngLiteral): void;
    setMap(map: Map | null): void;
  }
  interface Polyline {
    setPath(path: LatLngLiteral[]): void;
    setOptions(options: Partial<PolylineOptions>): void;
    setMap(map: Map | null): void;
  }
  interface LatLngBounds {
    extend(latlng: LatLngLiteral): void;
    getCenter(): LatLngLiteral;
  }
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  interface Size {
    width: number;
    height: number;
  }
  interface Point {
    x: number;
    y: number;
  }
  interface MapOptions {
    center: LatLngLiteral;
    zoom: number;
    zoomControl?: boolean;
    mapTypeControl?: boolean;
    fullscreenControl?: boolean;
    streetViewControl?: boolean;
    rotateControl?: boolean;
    mapId?: string;
    styles?: MapStyle[];
  }
  interface MapStyle {
    featureType: string;
    elementType: string;
    stylers: Array<{ color?: string; visibility?: string; lightness?: number }>;
  }
  interface MarkerOptions {
    position: LatLngLiteral;
    map?: Map;
    icon?: Symbol | string | Icon;
  }
  interface Icon {
    url: string;
    scaledSize: Size;
    anchor: Point;
  }
  interface PolylineOptions {
    path: LatLngLiteral[];
    geodesic?: boolean;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    strokeDashArray?: number[];
    map?: Map;
  }
  interface DirectionsService {
    route(request: DirectionsRequest, callback: (result: DirectionsResult | null, status: DirectionsStatus) => void): void;
  }
  interface DirectionsRequest {
    origin: LatLngLiteral;
    destination: LatLngLiteral;
    travelMode: string;
  }
  interface DirectionsResult {
    routes: DirectionsRoute[];
  }
  interface DirectionsRoute {
    legs: DirectionsLeg[];
  }
  interface DirectionsLeg {
    distance: { value: number };
    duration: { value: number };
  }
  type DirectionsStatus = string;
  interface Symbol {
    path: string;
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeWeight: number;
    scale: number;
    rotation?: number;
  }
}
