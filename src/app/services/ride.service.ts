import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RideRequest, Location, RideStatus } from '../models/ride.model';
import { VehicleCategory } from '../models/vehicle.model';

@Injectable({
  providedIn: 'root'
})
export class RideService {
  private rideRequestsSubject = new BehaviorSubject<RideRequest[]>([]);
  public rideRequests$: Observable<RideRequest[]> = this.rideRequestsSubject.asObservable();

  private activeRideSubject = new BehaviorSubject<RideRequest | null>(null);
  public activeRide$: Observable<RideRequest | null> = this.activeRideSubject.asObservable();

  private rideHistorySubject = new BehaviorSubject<RideRequest[]>([]);
  public rideHistory$: Observable<RideRequest[]> = this.rideHistorySubject.asObservable();

  private requestIdCounter = 0;

  constructor() {
    // Add some mock pending rides for owner view
    this.addMockRideRequests();
  }

  private addMockRideRequests(): void {
    const mockRequests: RideRequest[] = [
      {
        id: 'req-1',
        passengerId: 'p1',
        passengerName: 'Alice Johnson',
        passengerPhoto: 'https://i.pravatar.cc/150?img=1',
        pickupLocation: { lat: 40.7580, lng: -73.9855, address: '350 5th Ave, New York, NY' },
        dropoffLocation: { lat: 40.7484, lng: -73.9857, address: 'Empire State Building' },
        pickupAddress: 'Times Square',
        dropoffAddress: 'Empire State Building',
        category: 'economy',
        estimatedFare: 12.50,
        distance: 2.5,
        duration: 12,
        status: 'pending',
        createdAt: new Date()
      },
      {
        id: 'req-2',
        passengerId: 'p2',
        passengerName: 'Bob Williams',
        passengerPhoto: 'https://i.pravatar.cc/150?img=3',
        pickupLocation: { lat: 40.7614, lng: -73.9776, address: '5th Ave & W 42nd St' },
        dropoffLocation: { lat: 40.7527, lng: -73.9772, address: '5th Ave & W 38th St' },
        pickupAddress: 'New York Public Library',
        dropoffAddress: 'Bryant Park',
        category: 'comfort',
        estimatedFare: 18.75,
        distance: 1.8,
        duration: 8,
        status: 'pending',
        createdAt: new Date()
      },
      {
        id: 'req-3',
        passengerId: 'p3',
        passengerName: 'Carol Davis',
        passengerPhoto: 'https://i.pravatar.cc/150?img=5',
        pickupLocation: { lat: 40.7589, lng: -73.9851, address: 'Broadway & W 42nd St' },
        dropoffLocation: { lat: 40.7484, lng: -73.9857, address: '34th St & 5th Ave' },
        pickupAddress: 'Broadway Theatre',
        dropoffAddress: 'Macy\'s Herald Square',
        category: 'premium',
        estimatedFare: 45.00,
        distance: 3.2,
        duration: 15,
        status: 'pending',
        createdAt: new Date()
      }
    ];

    this.rideRequestsSubject.next(mockRequests);
  }

  createRideRequest(
    passengerId: string,
    passengerName: string,
    pickup: Location,
    dropoff: Location,
    category: VehicleCategory,
    estimatedFare: number,
    distance: number,
    duration: number
  ): RideRequest {
    this.requestIdCounter++;
    const request: RideRequest = {
      id: `req-${Date.now()}`,
      passengerId,
      passengerName,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      pickupAddress: pickup.address,
      dropoffAddress: dropoff.address,
      category,
      estimatedFare,
      distance,
      duration,
      status: 'pending',
      createdAt: new Date()
    };

    // Add to pending requests
    const current = this.rideRequestsSubject.value;
    this.rideRequestsSubject.next([...current, request]);

    // Set as active ride for the passenger
    this.activeRideSubject.next(request);

    return request;
  }

  acceptRide(rideId: string, ownerId: string): void {
    const requests = this.rideRequestsSubject.value;
    const index = requests.findIndex(r => r.id === rideId);
    if (index !== -1) {
      requests[index].status = 'accepted';
      requests[index].ownerId = ownerId;
      this.rideRequestsSubject.next([...requests]);

      // Update active ride if this is the one
      const active = this.activeRideSubject.value;
      if (active && active.id === rideId) {
        this.activeRideSubject.next({ ...requests[index] });
      }
    }
  }

  updateRideStatus(rideId: string, status: RideStatus): void {
    const requests = this.rideRequestsSubject.value;
    const index = requests.findIndex(r => r.id === rideId);
    if (index !== -1) {
      requests[index].status = status;
      this.rideRequestsSubject.next([...requests]);

      const active = this.activeRideSubject.value;
      if (active && active.id === rideId) {
        this.activeRideSubject.next({ ...requests[index] });
      }

      // If completed, add to history
      if (status === 'completed') {
        const history = this.rideHistorySubject.value;
        this.rideHistorySubject.next([...history, { ...requests[index] }]);
        this.activeRideSubject.next(null);
      }
    }
  }

  getPendingRequests(): RideRequest[] {
    return this.rideRequestsSubject.value.filter(r => r.status === 'pending');
  }

  cancelRide(rideId: string): void {
    this.updateRideStatus(rideId, 'cancelled');
    this.activeRideSubject.next(null);
  }
}