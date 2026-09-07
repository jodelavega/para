import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { Router } from "@angular/router";
import { AlertController } from "@ionic/angular";
import { ToastController } from "@ionic/angular";
import { Subscription } from "rxjs";
import * as L from "leaflet";
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

  private map!: L.Map;
  private pickupMarker?: L.Marker;
  private destinationMarker?: L.Marker;
  private driverMarker?: L.Marker;
  private routePolyline?: L.Polyline;
  private driverApproachPolyline?: L.Polyline;
  private animationFrameId?: number;
  private subscriptions: Subscription[] = [];

  constructor(
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
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    const lat = 40.7484;
    const lng = -73.9856;

    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    this.map = L.map("map", {
      zoomControl: false
    }).setView([lat, lng], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: "abcd",
      maxZoom: 19
    }).addTo(this.map);

    const pickupIcon = L.divIcon({
      className: "custom-pickup-pin",
      html: `
        <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 30px; height: 30px; background: #0066FF; opacity: 0.3; border-radius: 50%;"></div>
          <div style="width: 14px; height: 14px; background: #0066FF; border: 3px solid white; border-radius: 50%; z-index: 1; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    this.pickupMarker = L.marker([lat, lng], { icon: pickupIcon }).addTo(this.map);
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
    const pickup: Location = { lat: 40.7484, lng: -73.9856, address: this.currentAddress };
    this.destinationLocation = { lat: result.lat, lng: result.lng, address: result.address };
    this.destination = result.name;
    this.distance = Math.round(this.pricingService.calculateDistance(
      pickup.lat, pickup.lng, result.lat, result.lng) * 10) / 10;
    this.duration = Math.round(this.distance * 5);
    this.closeSearch();
    this.showCategories = true;

    this.updateMapRoute(pickup, this.destinationLocation);
  }

  private updateMapRoute(pickup: Location, destination: Location) {
    if (!this.map) return;

    if (this.destinationMarker) this.destinationMarker.remove();
    if (this.routePolyline) this.routePolyline.remove();

    const dropoffIcon = L.divIcon({
      className: "custom-dropoff-pin",
      html: `
        <div style="display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#222428"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    this.destinationMarker = L.marker([destination.lat, destination.lng], { icon: dropoffIcon }).addTo(this.map);

    const points: L.LatLngExpression[] = [
      [pickup.lat, pickup.lng],
      [destination.lat, destination.lng]
    ];

    this.routePolyline = L.polyline(points, {
      color: "#0066FF",
      weight: 4,
      opacity: 0.8,
      dashArray: "6, 8"
    }).addTo(this.map);

    const bounds = L.latLngBounds(points);
    this.map.fitBounds(bounds, { padding: [40, 40] });
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
    const pickup: Location = { lat: 40.7484, lng: -73.9856, address: this.currentAddress };
    const fare = this.getFare(this.selectedCategory);
    const ride = this.rideService.createRideRequest(
      user.id, user.username, pickup, this.destinationLocation,
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

    const startLat = ride.ownerLocation?.lat ?? (pickupLat - 0.012);
    const startLng = ride.ownerLocation?.lng ?? (pickupLng - 0.015);

    const totalDistKm = this.calculateDistance(startLat, startLng, pickupLat, pickupLng);
    const totalMins = Math.max(1, Math.round(totalDistKm * 2.5 + 2));

    this.driverDistance = `${totalDistKm.toFixed(1)} km`;
    this.driverTimeRemaining = `${totalMins} mins`;
    this.driverProgressPercent = 0;

    if (this.driverMarker) { this.driverMarker.remove(); }
    if (this.driverApproachPolyline) { this.driverApproachPolyline.remove(); }

    const carIconHtml = `
      <div class="animated-car-marker" style="
        position: relative; width: 44px; height: 44px;
        background: linear-gradient(135deg, #10b981, #059669);
        border: 3px solid #ffffff; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5);
        color: white;
      ">
        <div style="
          position: absolute; width: 52px; height: 52px;
          border-radius: 50%; border: 2px solid rgba(16, 185, 129, 0.5);
          animation: carPulse 1.8s infinite ease-out;
        "></div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.28 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01ZM6.5 16C5.67 16 5 15.33 5 14.5C5 13.67 5.67 13 6.5 13C7.33 13 8 13.67 8 14.5C8 15.33 7.33 16 6.5 16ZM17.5 16C16.67 16 16 15.33 16 14.5C16 13.67 16.67 13 17.5 13C18.33 13 19 13.67 19 14.5C19 15.33 18.33 16 17.5 16ZM5 11L6.5 6.5H17.5L19 11H5Z" fill="currentColor"/>
        </svg>
      </div>
    `;

    const carIcon = L.divIcon({
      className: "driver-car-div-icon",
      html: carIconHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    this.driverMarker = L.marker([startLat, startLng], { icon: carIcon }).addTo(this.map);

    this.driverApproachPolyline = L.polyline([
      [startLat, startLng],
      [pickupLat, pickupLng]
    ], { color: "#10b981", weight: 5, opacity: 0.85, dashArray: "8, 6" }).addTo(this.map);

    const bounds = L.latLngBounds([
      [startLat, startLng],
      [pickupLat, pickupLng]
    ]);
    this.map.fitBounds(bounds, { padding: [50, 50] });

    const startTime = performance.now();
    const durationMs = 8000;

    const animateStep = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      const currentLat = startLat + (pickupLat - startLat) * easeProgress;
      const currentLng = startLng + (pickupLng - startLng) * easeProgress;

      if (this.driverMarker) {
        this.driverMarker.setLatLng([currentLat, currentLng]);
      }

      if (this.driverApproachPolyline) {
        this.driverApproachPolyline.setLatLngs([
          [currentLat, currentLng],
          [pickupLat, pickupLng]
        ]);
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
    if (this.destinationMarker) { this.destinationMarker.remove(); this.destinationMarker = undefined; }
    if (this.driverMarker) { this.driverMarker.remove(); this.driverMarker = undefined; }
    if (this.routePolyline) { this.routePolyline.remove(); this.routePolyline = undefined; }
    if (this.driverApproachPolyline) { this.driverApproachPolyline.remove(); this.driverApproachPolyline = undefined; }

    const lat = 40.7484;
    const lng = -73.9856;

    if (this.map) {
      this.map.setView([lat, lng], 14);
      if (!this.pickupMarker) {
        const pickupIcon = L.divIcon({
          className: "custom-pickup-pin",
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 32px; height: 32px; background: #0066FF; opacity: 0.3; border-radius: 50%;"></div>
              <div style="width: 14px; height: 14px; background: #0066FF; border: 3px solid white; border-radius: 50%; z-index: 1; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        this.pickupMarker = L.marker([lat, lng], { icon: pickupIcon }).addTo(this.map);
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
