import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { AlertController } from "@ionic/angular";
import { Subscription } from "rxjs";
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
export class PassengerHomePage implements OnInit, OnDestroy {
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
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private pricingService: PricingService,
    private rideService: RideService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.categories = this.pricingService.getCategories();
    this.loadCurrentLocation();
    this.subscriptions.push(
      this.rideService.activeRide$.subscribe(ride => {
        this.activeRide = ride;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
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
      if (ride.status === "pending") { this.rideService.acceptRide(ride.id, "driver-1"); }
    }, 5000);
  }

  cancelRide() {
    if (this.activeRide) {
      this.rideService.cancelRide(this.activeRide.id);
      this.selectedCategory = null;
      this.showCategories = false;
      this.destination = "";
    }
  }

  showProfile() { this.router.navigate(["/login"]); }
}
