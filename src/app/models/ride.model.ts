import { VehicleCategory } from './vehicle.model';

export interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhoto?: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  pickupAddress: string;
  dropoffAddress: string;
  category: VehicleCategory;
  estimatedFare: number;
  distance: number; // in km
  duration: number; // in minutes
  status: RideStatus;
  createdAt: Date;
  ownerId?: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export type RideStatus = 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

export interface RideHistory {
  id: string;
  date: Date;
  pickup: string;
  dropoff: string;
  category: VehicleCategory;
  fare: number;
  status: RideStatus;
  driverName?: string;
  driverPhoto?: string;
}

export const RIDE_STATUS_LABELS: Record<RideStatus, string> = {
  pending: 'Looking for a driver',
  accepted: 'Driver is on the way',
  arrived: 'Driver has arrived',
  in_progress: 'On the way',
  completed: 'Completed',
  cancelled: 'Cancelled'
};