import { Component, OnInit } from "@angular/core";
import { AuthService } from "../../services/auth.service";
import { RideService } from "../../services/ride.service";
import { OwnerInfo } from "../../models/user.model";
import { RideRequest } from "../../models/ride.model";

@Component({
  selector: "app-owner-dashboard",
  templateUrl: "./owner-dashboard.page.html",
  styleUrls: ["./owner-dashboard.page.scss"],
})
export class OwnerDashboardPage implements OnInit {
  ownerInfo: OwnerInfo | null = null;
  isOnline: boolean = false;
  pendingRequests: RideRequest[] = [];

  constructor(
    private authService: AuthService,
    private rideService: RideService
  ) {}

  ngOnInit() {
    this.ownerInfo = this.authService.getOwnerInfo();
    this.loadRequests();
  }

  private loadRequests() {
    this.rideService.rideRequests$.subscribe(requests => {
      this.pendingRequests = requests.filter(r => r.status === "pending");
    });
  }

  toggleOnline() {
    this.isOnline = !this.isOnline;
  }

  acceptRide(rideId: string) {
    const user = this.authService.currentUser;
    if (user) {
      this.rideService.acceptRide(rideId, user.id);
    }
  }
}
