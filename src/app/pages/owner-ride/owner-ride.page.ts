import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AlertController, ToastController } from "@ionic/angular";
import { Subscription } from "rxjs";
import * as L from "leaflet";
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

  private map!: L.Map;
  private driverMarker?: L.Marker;
  private pickupMarker?: L.Marker;
  private dropoffMarker?: L.Marker;
  private routePolyline?: L.Polyline;

  private animationFrameId?: number;
  private subscriptions: Subscription[] = [];
  private driverCurrentPos: [number, number] = [0, 0];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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
    if (this.map) {
      this.map.remove();
    }
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

    const driverStartLat = pickupLat - 0.012;
    const driverStartLng = pickupLng - 0.015;
    this.driverCurrentPos = [driverStartLat, driverStartLng];

    const mapEl = document.getElementById("owner-map");
    if (!mapEl) return;

    this.map = L.map("owner-map", {
      zoomControl: false,
    }).setView([pickupLat, pickupLng], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(this.map);

    const pickupIcon = L.divIcon({
      className: "custom-pickup-pin",
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; background: #0066FF; opacity: 0.25; border-radius: 50%;"></div>
          <div style="width: 16px; height: 16px; background: #0066FF; border: 3px solid white; border-radius: 50%; z-index: 2; box-shadow: 0 2px 8px rgba(0,102,255,0.5);"></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    this.pickupMarker = L.marker([pickupLat, pickupLng], { icon: pickupIcon })
      .addTo(this.map)
      .bindPopup(`<b>Pickup:</b> ${this.ride.pickupAddress}`);

    const dropoffLat = this.ride.dropoffLocation.lat;
    const dropoffLng = this.ride.dropoffLocation.lng;
    const dropoffIcon = L.divIcon({
      className: "custom-dropoff-pin",
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 16px; height: 16px; background: #FF4757; border: 3px solid white; border-radius: 4px; transform: rotate(45deg); z-index: 2; box-shadow: 0 2px 8px rgba(255,71,87,0.5);"></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    this.dropoffMarker = L.marker([dropoffLat, dropoffLng], { icon: dropoffIcon })
      .addTo(this.map)
      .bindPopup(`<b>Destination:</b> ${this.ride.dropoffAddress}`);

    const carIconHtml = `
      <div class="animated-car-marker" style="
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #10b981, #059669);
        border: 3px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5);
        color: white;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.28 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01ZM6.5 16C5.67 16 5 15.33 5 14.5C5 13.67 5.67 13 6.5 13C7.33 13 8 13.67 8 14.5C8 15.33 7.33 16 6.5 16ZM17.5 16C16.67 16 16 15.33 16 14.5C16 13.67 16.67 13 17.5 13C18.33 13 19 13.67 19 14.5C19 15.33 18.33 16 17.5 16ZM5 11L6.5 6.5H17.5L19 11H5Z" fill="currentColor"/>
        </svg>
      </div>
    `;

    const carIcon = L.divIcon({
      className: "driver-car-div-icon",
      html: carIconHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    this.driverMarker = L.marker([driverStartLat, driverStartLng], { icon: carIcon }).addTo(this.map);

    const routeCoords: L.LatLngExpression[] = [
      [driverStartLat, driverStartLng],
      [pickupLat, pickupLng],
    ];
    this.routePolyline = L.polyline(routeCoords, {
      color: "#10b981",
      weight: 5,
      opacity: 0.85,
      dashArray: "8, 6",
    }).addTo(this.map);

    const bounds = L.latLngBounds([
      [driverStartLat, driverStartLng],
      [pickupLat, pickupLng],
      [dropoffLat, dropoffLng],
    ]);
    this.map.fitBounds(bounds, { padding: [60, 60] });

    this.startVehicleAnimationToPickup([driverStartLat, driverStartLng], [pickupLat, pickupLng], 8000);
  }

  private startVehicleAnimationToPickup(
    start: [number, number],
    end: [number, number],
    durationMs: number
  ) {
    const totalDistanceKm = this.calculateDistance(start[0], start[1], end[0], end[1]);
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

      const currentLat = start[0] + (end[0] - start[0]) * easeProgress;
      const currentLng = start[1] + (end[1] - start[1]) * easeProgress;
      this.driverCurrentPos = [currentLat, currentLng];

      if (this.driverMarker) {
        this.driverMarker.setLatLng([currentLat, currentLng]);
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
        this.routePolyline.setLatLngs([
          [currentLat, currentLng],
          [end[0], end[1]],
        ]);
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

    if (this.routePolyline) {
      this.routePolyline.setStyle({ color: "#0066FF" });
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

      if (this.driverMarker) {
        this.driverMarker.setLatLng([currentLat, currentLng]);
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
        this.routePolyline.setLatLngs([
          [currentLat, currentLng],
          [dropoffLat, dropoffLng],
        ]);
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