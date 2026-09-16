import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RideService } from '../../services/ride.service';
import { OwnerInfo } from '../../models/user.model';
import { RideRequest, Location } from '../../models/ride.model';

@Component({
  selector: 'app-owner-dashboard',
  templateUrl: './owner-dashboard.page.html',
  styleUrls: ['./owner-dashboard.page.scss'],
})
export class OwnerDashboardPage implements OnInit {
  ownerInfo: OwnerInfo | null = null;
  isOnline: boolean = false;
  pendingRequests: RideRequest[] = [];
  ownerLocation: Location | null = null;

  constructor(
    private authService: AuthService,
    private rideService: RideService,
    private router: Router
  ) {}

  ngOnInit() {
    this.ownerInfo = this.authService.getOwnerInfo();
    this.ownerLocation = { lat: 40.7580, lng: -73.9750, address: 'Owner Current Location' };
    this.loadRequests();
  }

  private loadRequests() {
    this.rideService.rideRequests$.subscribe(requests => {
      this.pendingRequests = requests.filter(r => r.status === 'pending');
    });
  }

  toggleOnline() {
    this.isOnline = !this.isOnline;
  }

  acceptRide(rideId: string) {
    const user = this.authService.currentUser;
    if (user) {
      const ownerInfo = this.authService.getOwnerInfo();
      this.rideService.acceptRide(rideId, user.id, this.ownerLocation?? undefined, {
        name: ownerInfo.fullName,
        phone: ownerInfo.phone,
        carModel: `${ownerInfo.carInfo.make} ${ownerInfo.carInfo.model}`,
        carPlate: ownerInfo.carInfo.plateNumber,
        carColor: ownerInfo.carInfo.color,
        photo: 'https://i.pravatar.cc/150?img=12',
        rating: 4.9
      });
      this.router.navigate(['/owner-ride', rideId]);
    }
  }
}
