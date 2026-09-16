import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface MapCoordinates {
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private apiKey: string = environment.googleMapsApiKey;

  constructor() {}

  private getApiKey(): string {
    return this.apiKey;
  }

  initMap(mapElement: HTMLElement, coords: MapCoordinates, zoom: number = 14): google.maps.Map {
    return new google.maps.Map(mapElement, {
      center: coords,
      zoom: zoom,
      zoomControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      rotateControl: false,
      mapId: 'para-ride-dark-map',
      styles: [
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ color: '#1a252f' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#95a5a6' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#1a252f' }]
        },
        {
          featureType: 'administrative',
          elementType: 'geometry',
          stylers: [{ color: '#2c3e50' }]
        },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#4ca1af' }]
        },
        {
          featureType: 'landscape',
          elementType: 'all',
          stylers: [{ color: '#243342' }]
        },
        {
          featureType: 'poi',
          elementType: 'all',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'road',
          elementType: 'all',
          stylers: [{ color: '#2c3e50' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#4ca1af', lightness: 20 }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#2c3e50' }]
        },
        {
          featureType: 'transit',
          elementType: 'all',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'water',
          elementType: 'all',
          stylers: [{ color: '#1e293b' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#4ca1af' }]
        }
      ]
    });
  }

  addMarker(map: google.maps.Map, coords: MapCoordinates, iconConfig?: { path: string; fillColor: string; fillOpacity: number; strokeColor: string; strokeWeight: number; scale: number }): google.maps.Marker {
    const marker = new google.maps.Marker({
      position: coords,
      map: map,
      icon: iconConfig || {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#0066FF',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8
      }
    });
    return marker;
  }

  addPolyline(map: google.maps.Map, path: MapCoordinates[], color: string, weight: number = 4, opacity: number = 0.8, dashArray?: number[]): google.maps.Polyline {
    const polyline = new google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: opacity,
      strokeWeight: weight,
      strokeDashArray: dashArray,
      map: map
    });
    return polyline;
  }

  fitBounds(map: google.maps.Map, bounds: google.maps.LatLngBounds) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  createLatLng(lat: number, lng: number): google.maps.LatLngLiteral {
    return { lat, lng };
  }

  createLatLngBounds(): google.maps.LatLngBounds {
    return new google.maps.LatLngBounds();
  }

  extendBounds(bounds: google.maps.LatLngBounds, latlng: google.maps.LatLngLiteral) {
    bounds.extend(latlng);
  }

  setMarkerPosition(marker: google.maps.Marker, latlng: google.maps.LatLngLiteral) {
    marker.setPosition(latlng);
  }

  setPolylinePath(polyline: google.maps.Polyline, path: google.maps.LatLngLiteral[]) {
    polyline.setPath(path);
  }

  getDirection(latLng: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral): Promise<{ distance: number; duration: number }> {
    return new Promise((resolve, reject) => {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: latLng,
          destination: destination,
          travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const route = result.routes[0];
            const leg = route.legs[0];
            resolve({
              distance: leg.distance.value,
              duration: leg.duration.value
            });
          } else {
            reject(status);
          }
        }
      );
    });
  }

  createCarIcon(): google.maps.Symbol {
    return {
      path: 'M -1.547 12l 0.917 3.083h 4.132l 1.067 -3.083h 3.199l -5.266 7.35 -5.266 -7.35h 3.199z',
      fillColor: '#10b981',
      fillOpacity: 0.9,
      strokeColor: '#ffffff',
      strokeWeight: 1.5,
      scale: 0.8,
      rotation: 0
    };
  }
}
