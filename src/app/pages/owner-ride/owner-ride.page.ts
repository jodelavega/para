import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AlertController, ToastController } from "@ionic/angular";
import { Subscription } from "rxjs";
import { GoogleMapsService } from "../../services/google-maps.service";
import { RideService } from "../../services/ride.service";
import { AuthService } from "../../services/auth.service";
import { RideRequest, RideStatus } from "../../models/ride.model";

@Component({
  selector: "app-owner-ride",
  templateUrl: "./owner-ride.page.html",
  styleUrls: ["./owner-ride.page.scss"],
})
export class OwnerRidePage implements OnInit, AfterViewInit, OnDestroy {
  ride: RideRequest | null = null;
  rideId: string | null = null;

  distanceLeft: string = "Calculating...";
  timeLeft: string = "Calculating...";
  currentPhase: "heading_to_pickup" | "arrived_at_pickup" | "trip_in_progress" | "completed" = "heading_to_pickup";

  private map!: google.maps.Map;
  private driverMarker?: google.maps.Marker;
  private pickupMarker?: google.maps.Marker;
  private dropoffMarker?: google.maps.Marker;
  private routePolyline?: google.maps.Polyline;

  private animationFrameId?: number;
  private subscriptions: Subscription[] = [];
  private driverCurrentPos: { lat: number; lng: number } = { lat: 0, lng: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private googleMapsService: GoogleMapsService,
    private rideService: RideService,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.rideId = this.route.snapshot.paramMap.get("id");

    this.subscriptions.push(
      this.rideService.activeRide$.subscribe((activeRide) => {
        if (activeRide) {
          this.ride = activeRide;
          this.updatePhaseFromStatus(activeRide.status);
        } else if (this.rideId) {
          const found = this.rideService.getRideById(this.rideId);
          if (found) {
            this.ride = found;
            this.updatePhaseFromStatus(found.status);
          } else {
            this.router.navigate(["/owner-dashboard"]);
          }
        } else {
          this.router.navigate(["/owner-dashboard"]);
        }
      })
    );
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.ride) {
        this.initMapAndTrack();
      }
    }, 200);
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private updatePhaseFromStatus(status: RideStatus) {
    if (status === "accepted") {
      this.currentPhase = "heading_to_pickup";
    } else if (status === "arrived") {
      this.currentPhase = "arrived_at_pickup";
      this.distanceLeft = "0 m";
      this.timeLeft = "Arrived";
    } else if (status === "in_progress") {
      this.currentPhase = "trip_in_progress";
    } else if (status === "completed") {
      this.currentPhase = "completed";
      this.distanceLeft = "0 m";
      this.timeLeft = "Trip Finished";
    }
  }

  private initMapAndTrack() {
    if (!this.ride) return;

    const pickupLat = this.ride.pickupLocation.lat;
    const pickupLng = this.ride.pickupLocation.lng;
    const pickupCoords = this.googleMapsService.createLatLng(pickupLat, pickupLng);

    const driverStartLat = pickupLat - 0.012;
    const driverStartLng = pickupLng - 0.015;
    this.driverCurrentPos = { lat: driverStartLat, lng: driverStartLng };
    const startCoords = this.googleMapsService.createLatLng(driverStartLat, driverStartLng);

    const mapEl = document.getElementById("owner-map");
    if (!mapEl) return;

    this.map = this.googleMapsService.initMap(mapEl, pickupCoords, 14);

    const pickupIcon = this.googleMapsService.addMarker(
      this.map,
      pickupCoords,
      {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#0066FF',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10
      }
    );
    this.pickupMarker = pickupIcon;

    const dropoffLat = this.ride.dropoffLocation.lat;
    const dropoffLng = this.ride.dropoffLocation.lng;
    const dropoffCoords = this.googleMapsService.createLatLng(dropoffLat, dropoffLng);
    this.dropoffMarker = this.googleMapsService.addMarker(this.map, dropoffCoords, {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#FF4757',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 10
    });

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
      pickupCoords,
    ];
    this.routePolyline = this.googleMapsService.addPolyline(this.map, routeCoords, "#10b981", 5, 0.85, [8, 6]);

    const bounds = this.googleMapsService.createLatLngBounds();
    this.googleMapsService.extendBounds(bounds, startCoords);
    this.googleMapsService.extendBounds(bounds, pickupCoords);
    this.googleMapsService.extendBounds(bounds, dropoffCoords);
    this.googleMapsService.fitBounds(this.map, bounds);

    this.startVehicleAnimationToPickup(startCoords, pickupCoords, 8000);
  }

  private startVehicleAnimationToPickup(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    durationMs: number
  ) {
    const startCoords = this.googleMapsService.createLatLng(start.lat, start.lng);
    const endCoords = this.googleMapsService.createLatLng(end.lat, end.lng);
    const totalDistanceKm = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const totalDurationMins = Math.max(1, Math.round(totalDistanceKm * 2.5 + 2));

    this.distanceLeft = `${totalDistanceKm.toFixed(1)} km`;
    this.timeLeft = `${totalDurationMins} mins`;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      const currentLat = start.lat + (end.lat - start.lat) * easeProgress;
      const currentLng = start.lng + (end.lng - start.lng) * easeProgress;
      this.driverCurrentPos = { lat: currentLat, lng: currentLng };

      const currentCoords = this.googleMapsService.createLatLng(currentLat, currentLng);
      if (this.driverMarker) {
        this.googleMapsService.setMarkerPosition(this.driverMarker, currentCoords);
      }

      const remainingDist = (1 - easeProgress) * totalDistanceKm;
      const remainingMins = Math.ceil((1 - easeProgress) * totalDurationMins);

      if (remainingDist > 0.05) {
        this.distanceLeft = `${remainingDist.toFixed(1)} km`;
        this.timeLeft = `${remainingMins} min${remainingMins > 1 ? "s" : ""}`;
      } else {
        this.distanceLeft = "0 m";
        this.timeLeft = "Arriving now";
      }

      if (this.routePolyline) {
        this.googleMapsService.setPolylinePath(this.routePolyline, [currentCoords, endCoords]);
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.distanceLeft = "0 m";
        this.timeLeft = "Arrived at pickup";
        this.currentPhase = "arrived_at_pickup";
        if (this.ride) {
          this.rideService.updateRideStatus(this.ride.id, "arrived");
        }
        this.showArrivedToast();
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
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

  async showArrivedToast() {
    const toast = await this.toastController.create({
      message: "You have arrived at the passenger pickup point!",
      duration: 3500,
      color: "success",
      position: "top",
    });
    toast.present();
  }

  startTrip() {
    if (!this.ride) return;
    this.currentPhase = "trip_in_progress";
    this.rideService.updateRideStatus(this.ride.id, "in_progress");

    const pickupLat = this.ride.pickupLocation.lat;
    const pickupLng = this.ride.pickupLocation.lng;
    const dropoffLat = this.ride.dropoffLocation.lat;
    const dropoffLng = this.ride.dropoffLocation.lng;

    const pickupCoords = this.googleMapsService.createLatLng(pickupLat, pickupLng);
    const dropoffCoords = this.googleMapsService.createLatLng(dropoffLat, dropoffLng);

    if (this.routePolyline) {
      this.routePolyline.setOptions({ strokeColor: "#0066FF" });
    }

    const tripDist = this.ride.distance || this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const tripDurationMins = this.ride.duration || 10;
    this.distanceLeft = `${tripDist.toFixed(1)} km`;
    this.timeLeft = `${tripDurationMins} mins`;

    const startTime = performance.now();
    const durationMs = 10000;

    const animateTrip = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easeProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      const currentLat = pickupLat + (dropoffLat - pickupLat) * easeProgress;
      const currentLng = pickupLng + (dropoffLng - pickupLng) * easeProgress;

      const currentCoords = this.googleMapsService.createLatLng(currentLat, currentLng);
      if (this.driverMarker) {
        this.googleMapsService.setMarkerPosition(this.driverMarker, currentCoords);
      }

      const remainingDist = (1 - easeProgress) * tripDist;
      const remainingMins = Math.ceil((1 - easeProgress) * tripDurationMins);

      if (remainingDist > 0.05) {
        this.distanceLeft = `${remainingDist.toFixed(1)} km`;
        this.timeLeft = `${remainingMins} min${remainingMins > 1 ? "s" : ""}`;
      } else {
        this.distanceLeft = "0 m";
        this.timeLeft = "Arriving at destination";
      }

      if (this.routePolyline) {
        this.googleMapsService.setPolylinePath(this.routePolyline, [currentCoords, dropoffCoords]);
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animateTrip);
      } else {
        this.currentPhase = "completed";
        this.distanceLeft = "0 m";
        this.timeLeft = "Destination reached";
      }
    };

    this.animationFrameId = requestAnimationFrame(animateTrip);
  }

  async completeRide() {
    if (!this.ride) return;
    this.rideService.updateRideStatus(this.ride.id, "completed");
    const toast = await this.toastController.create({
      message: `Ride completed! $${this.ride.estimatedFare.toFixed(2)} added to earnings.`,
      duration: 3000,
      color: "success",
      position: "top",
    });
    await toast.present();
    this.router.navigate(["/owner-dashboard"]);
  }

  async callPassenger() {
    const alert = await this.alertController.create({
      header: `Calling ${this.ride?.passengerName || "Passenger"}`,
      message: "Connecting to passenger phone line...",
      buttons: ["End Call"],
    });
    await alert.present();
  }

  async cancelRide() {
    const alert = await this.alertController.create({
      header: "Cancel Ride?",
      message: "Are you sure you want to cancel this ride request?",
      buttons: [
        { text: "No", role: "cancel" },
        {
          text: "Yes, Cancel",
          role: "destructive",
          handler: () => {
            if (this.ride) {
              this.rideService.cancelRide(this.ride.id);
              this.router.navigate(["/owner-dashboard"]);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  goBack() {
    this.router.navigate(["/owner-dashboard"]);
  }
}
