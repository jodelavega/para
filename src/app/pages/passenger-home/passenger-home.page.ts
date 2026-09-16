import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { Router } from "@angular/router";
import { AlertController } from "@ionic/angular";
import { ToastController } from "@ionic/angular";
import { Subscription } from "rxjs";
import { GoogleMapsService } from "../../services/google-maps.service";
import { AuthService } from "../../services/auth.service";
import { PricingService } from "../../services/pricing.service";
import { RideService } from "../../services/ride.service";
import { VehicleCategoryInfo } from "../../models/vehicle.model";
import { RideRequest, RideStatus, Location, RIDE_STATUS_LABELS } from "../../models/ride.model";

interface SearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

@Component({
  selector: "app-passenger-home",
  templateUrl: "./passenger-home.page.html",
  styleUrls: ["./passenger-home.page.scss"],
})
export class PassengerHomePage implements OnInit, OnDestroy, AfterViewInit {
  categories: VehicleCategoryInfo[] = [];
  selectedCategory: VehicleCategoryInfo | null = null;
  currentAddress: string = "123 Main Street, New York";
  destination: string = "";
  destinationLocation: Location | null = null;
  distance: number = 0;
  duration: number = 0;
  showSearch: boolean = false;
  showCategories: boolean = false;
  searchQuery: string = "";
  searchResults: SearchResult[] = [];
  activeRide: RideRequest | null = null;

  driverDistance: string = "Calculating...";
  driverTimeRemaining: string = "Calculating...";
  driverProgressPercent: number = 0;

  private map!: google.maps.Map;
  private pickupMarker?: google.maps.Marker;
  private destinationMarker?: google.maps.Marker;
  private driverMarker?: google.maps.Marker;
  private routePolyline?: google.maps.Polyline;
  private driverApproachPolyline?: google.maps.Polyline;
  private animationFrameId?: number;
  private subscriptions: Subscription[] = [];

  constructor(
    private googleMapsService: GoogleMapsService,
    private authService: AuthService,
    private pricingService: PricingService,
    private rideService: RideService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.categories = this.pricingService.getCategories();
    this.loadCurrentLocation();
    this.subscriptions.push(
      this.rideService.activeRide$.subscribe(ride => {
        const previousStatus = this.activeRide?.status;
        this.activeRide = ride;

        if (ride) {
          if (ride.status === "accepted" && previousStatus !== "accepted") {
            this.simulateDriverMovementToPickup(ride);
          } else if (ride.status === "arrived") {
            this.driverDistance = "0 m";
            this.driverTimeRemaining = "Arrived";
            this.driverProgressPercent = 100;
          }
        }
      })
    );
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    const coords = this.googleMapsService.createLatLng(40.7484, -73.9856);
    this.map = this.googleMapsService.initMap(mapEl, coords, 14);

    const pickupIcon = this.googleMapsService.addMarker(this.map, coords);
    this.pickupMarker = pickupIcon;
  }

  private loadCurrentLocation() {
    this.currentAddress = "350 5th Ave, New York, NY 10118";
  }

  openSearch() {
    this.showSearch = true;
    this.showCategories = false;
    this.selectedCategory = null;
  }

  closeSearch() {
    this.showSearch = false;
    this.searchQuery = "";
    this.searchResults = [];
  }

  onSearchInput() {
    if (this.searchQuery.length < 2) { this.searchResults = []; return; }
    const query = this.searchQuery.toLowerCase();
    this.searchResults = [
      { name: "Times Square", address: "Manhattan, NY 10036", lat: 40.7580, lng: -73.9855 },
      { name: "Empire State Building", address: "350 5th Ave, New York, NY 10118", lat: 40.7484, lng: -73.9857 },
      { name: "Central Park", address: "New York, NY 10024", lat: 40.7851, lng: -73.9683 },
      { name: "JFK Airport", address: "Queens, NY 11430", lat: 40.6413, lng: -73.7781 },
      { name: "Brooklyn Bridge", address: "New York, NY 10038", lat: 40.7061, lng: -73.9969 },
      { name: "One World Trade Center", address: "285 Fulton St, New York, NY 10007", lat: 40.7127, lng: -74.0134 }
    ].filter(r => r.name.toLowerCase().includes(query) || r.address.toLowerCase().includes(query));
  }

  selectDestination(result: SearchResult) {
    const pickupCoords = this.googleMapsService.createLatLng(40.7484, -73.9856);
    const destCoords = this.googleMapsService.createLatLng(result.lat, result.lng);
    this.destinationLocation = { lat: result.lat, lng: result.lng, address: result.address };
    this.destination = result.name;
    this.distance = Math.round(this.pricingService.calculateDistance(
      40.7484, -73.9856, result.lat, result.lng) * 10) / 10;
    this.duration = Math.round(this.distance * 5);
    this.closeSearch();
    this.showCategories = true;

    this.updateMapRoute(pickupCoords, destCoords);
  }

  private updateMapRoute(pickup: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    if (!this.map) return;

    const pickupCoords = this.googleMapsService.createLatLng(pickup.lat, pickup.lng);
    const destCoords = this.googleMapsService.createLatLng(destination.lat, destination.lng);

    if (this.destinationMarker) this.destinationMarker.setMap(null);
    if (this.routePolyline) this.routePolyline.setMap(null);

    const dropoffIcon = this.googleMapsService.addMarker(
      this.map,
      destCoords,
      {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#222428',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10
      }
    );
    this.destinationMarker = dropoffIcon;

    const points: google.maps.LatLngLiteral[] = [
      pickupCoords,
      destCoords
    ];

    this.routePolyline = this.googleMapsService.addPolyline(this.map, points, "#0066FF", 4, 0.8, [6, 8]);

    const bounds = this.googleMapsService.createLatLngBounds();
    this.googleMapsService.extendBounds(bounds, pickupCoords);
    this.googleMapsService.extendBounds(bounds, destCoords);
    this.googleMapsService.fitBounds(this.map, bounds);
  }

  setQuickDestination(place: string) {
    const quickDestinations: Record<string, SearchResult> = {
      "Airport": { name: "JFK Airport", address: "Queens, NY 11430", lat: 40.6413, lng: -73.7781 },
      "Work": { name: "Office", address: "123 Business Ave, New York", lat: 40.7549, lng: -73.9840 },
      "Home": { name: "Home", address: "456 Park Ave, New York", lat: 40.7614, lng: -73.9776 },
      "Restaurant": { name: "The Italian Place", address: "789 Broadway, New York", lat: 40.7589, lng: -73.9851 }
    };
    const destination = quickDestinations[place];
    if (destination) this.selectDestination(destination);
  }

  selectCategory(category: VehicleCategoryInfo) { this.selectedCategory = category; }

  getFare(category: VehicleCategoryInfo): number {
    return this.pricingService.calculateFare(category.id, this.distance, this.duration);
  }

  getSurcharge(category: VehicleCategoryInfo): { multiplier: number; label: string } {
    return this.pricingService.getSurchargeInfo(category.id);
  }

  getStatusLabel(status: RideStatus): string { return RIDE_STATUS_LABELS[status] || status; }

  async requestRide() {
    if (!this.selectedCategory || !this.destinationLocation) return;
    const user = this.authService.currentUser;
    if (!user) { this.router.navigate(["/login"]); return; }
    const pickup = this.googleMapsService.createLatLng(40.7484, -73.9856);
    const dest = this.googleMapsService.createLatLng(this.destinationLocation.lat, this.destinationLocation.lng);
    const fare = this.getFare(this.selectedCategory);
    const ride = this.rideService.createRideRequest(
      user.id, user.username,
      { lat: 40.7484, lng: -73.9856, address: this.currentAddress },
      this.destinationLocation,
      this.selectedCategory.id, fare, this.distance, this.duration
    );
    setTimeout(() => {
      if (ride.status === "pending") {
        this.rideService.acceptRide(ride.id, "driver-1");
      }
    }, 3500);
  }

  private simulateDriverMovementToPickup(ride: RideRequest) {
    if (!this.map) return;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const pickupLat = ride.pickupLocation.lat;
    const pickupLng = ride.pickupLocation.lng;
    const pickupCoords = this.googleMapsService.createLatLng(pickupLat, pickupLng);

    const startLat = ride.ownerLocation?.lat ?? (pickupLat - 0.012);
    const startLng = ride.ownerLocation?.lng ?? (pickupLng - 0.015);
    const startCoords = this.googleMapsService.createLatLng(startLat, startLng);

    const totalDistKm = this.calculateDistance(startLat, startLng, pickupLat, pickupLng);
    const totalMins = Math.max(1, Math.round(totalDistKm * 2.5 + 2));

    this.driverDistance = `${totalDistKm.toFixed(1)} km`;
    this.driverTimeRemaining = `${totalMins} mins`;
    this.driverProgressPercent = 0;

    if (this.driverMarker) { this.driverMarker.setMap(null); }
    if (this.driverApproachPolyline) { this.driverApproachPolyline.setMap(null); }

    const carIcon = this.googleMapsService.addMarker(
      this.map,
      startCoords,
      {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#10b981',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 12
      }
    );
    this.driverMarker = carIcon;

    const routeCoords: google.maps.LatLngLiteral[] = [
      startCoords,
      pickupCoords
    ];
    this.driverApproachPolyline = this.googleMapsService.addPolyline(this.map, routeCoords, "#10b981", 5, 0.85, [8, 6]);

    const bounds = this.googleMapsService.createLatLngBounds();
    this.googleMapsService.extendBounds(bounds, startCoords);
    this.googleMapsService.extendBounds(bounds, pickupCoords);
    this.googleMapsService.fitBounds(this.map, bounds);

    const startTime = performance.now();
    const durationMs = 8000;

    const animateStep = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      const currentLat = startLat + (pickupLat - startLat) * easeProgress;
      const currentLng = startLng + (pickupLng - startLng) * easeProgress;
      const currentCoords = this.googleMapsService.createLatLng(currentLat, currentLng);

      if (this.driverMarker) {
        this.googleMapsService.setMarkerPosition(this.driverMarker, currentCoords);
      }

      if (this.driverApproachPolyline) {
        this.googleMapsService.setPolylinePath(this.driverApproachPolyline, [currentCoords, pickupCoords]);
      }

      const remainingDist = (1 - easeProgress) * totalDistKm;
      const remainingMins = Math.ceil((1 - easeProgress) * totalMins);

      this.driverProgressPercent = Math.round(progress * 100);

      if (remainingDist > 0.05) {
        this.driverDistance = `${remainingDist.toFixed(1)} km`;
        this.driverTimeRemaining = `${remainingMins} min${remainingMins > 1 ? "s" : ""}`;
      } else {
        this.driverDistance = "0 m";
        this.driverTimeRemaining = "Arriving now";
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animateStep);
      } else {
        this.driverDistance = "0 m";
        this.driverTimeRemaining = "Arrived";
        this.driverProgressPercent = 100;
        this.rideService.updateRideStatus(ride.id, "arrived");
        this.presentArrivedToast();
      }
    };

    this.animationFrameId = requestAnimationFrame(animateStep);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async presentArrivedToast() {
    const toast = await this.toastController.create({
      message: "Your driver has arrived at the pickup point!",
      duration: 3500,
      color: "success",
      position: "top"
    });
    toast.present();
  }

  cancelRide() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.activeRide) {
      this.rideService.cancelRide(this.activeRide.id);
      this.selectedCategory = null;
      this.showCategories = false;
      this.destination = "";
      this.resetMap();
    }
  }

  private resetMap() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.destinationMarker) { this.destinationMarker.setMap(null); this.destinationMarker = undefined; }
    if (this.driverMarker) { this.driverMarker.setMap(null); this.driverMarker = undefined; }
    if (this.routePolyline) { this.routePolyline.setMap(null); this.routePolyline = undefined; }
    if (this.driverApproachPolyline) { this.driverApproachPolyline.setMap(null); this.driverApproachPolyline = undefined; }

    const lat = 40.7484;
    const lng = -73.9856;
    const pickupCoords = this.googleMapsService.createLatLng(lat, lng);

    if (this.map) {
      this.map.setCenter(pickupCoords);
      this.map.setZoom(14);
      if (!this.pickupMarker) {
        const pickupIcon = this.googleMapsService.addMarker(this.map, pickupCoords);
        this.pickupMarker = pickupIcon;
      } else {
        this.googleMapsService.setMarkerPosition(this.pickupMarker, pickupCoords);
      }
    }
  }

  showProfile() { this.router.navigate(["/login"]); }
  async callDriver() {
    const alert = await this.alertController.create({
      header: `Calling ${this.activeRide?.ownerInfo?.name || "Driver"}`,
      message: `Connecting to ${this.activeRide?.ownerInfo?.phone || "driver"}...`,
      buttons: ["End Call"],
    });
    await alert.present();
  }
}
