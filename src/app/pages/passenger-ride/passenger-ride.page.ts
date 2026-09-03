import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { RideService } from "../../services/ride.service";
import { RideRequest, RideStatus, RIDE_STATUS_LABELS } from "../../models/ride.model";

@Component({
  selector: "app-passenger-ride",
  templateUrl: "./passenger-ride.page.html",
  styleUrls: ["./passenger-ride.page.scss"],
})
export class PassengerRidePage implements OnInit {
  ride: RideRequest | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rideService: RideService
  ) {}

  ngOnInit() {
    this.rideService.activeRide$.subscribe(ride => {
      this.ride = ride;
      if (!ride) this.router.navigate(["/passenger-home"]);
    });
  }

  get statusIcon(): string {
    switch (this.ride?.status) {
      case "pending": return "search-outline";
      case "accepted": return "car-outline";
      case "arrived": return "location-outline";
      case "in_progress": return "navigate-outline";
      case "completed": return "checkmark-circle-outline";
      case "cancelled": return "close-circle-outline";
      default: return "car-outline";
    }
  }

  getStatusLabel(status: RideStatus): string {
    return RIDE_STATUS_LABELS[status] || status;
  }

  cancelRide() {
    if (this.ride) {
      this.rideService.cancelRide(this.ride.id);
      this.router.navigate(["/passenger-home"]);
    }
  }
}
