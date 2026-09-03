import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { VehicleCategoryInfo, VehicleCategory, DEFAULT_CATEGORIES } from '../models/vehicle.model';
import { User, OwnerInfo } from '../models/user.model';
import { RideRequest } from '../models/ride.model';

export interface AdminSettings {
  categories: VehicleCategoryInfo[];
  pricing: {
    baseMultiplier: number;
    peakHourMultiplier: number;
    nightMultiplier: number;
    surgePricing: boolean;
  };
  system: {
    appName: string;
    supportEmail: string;
    commissionRate: number;
    minimumDriverRating: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private settingsSubject = new BehaviorSubject<AdminSettings>(this.getDefaultSettings());
  public settings$: Observable<AdminSettings> = this.settingsSubject.asObservable();

  private ownersSubject = new BehaviorSubject<OwnerInfo[]>([
    {
      userId: '2',
      fullName: 'John Driver',
      phone: '+1 (555) 123-4567',
      email: 'owner@para.com',
      carInfo: {
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
        color: 'Silver',
        plateNumber: 'ABC-1234',
        category: 'comfort',
        seats: 4
      },
      earnings: {
        today: 185.50,
        thisWeek: 1240.00,
        thisMonth: 4850.00,
        total: 28450.00
      }
    },
    {
      userId: '4',
      fullName: 'Sarah Miller',
      phone: '+1 (555) 234-5678',
      email: 'sarah@para.com',
      carInfo: {
        make: 'Mercedes',
        model: 'E-Class',
        year: 2024,
        color: 'Black',
        plateNumber: 'XYZ-5678',
        category: 'premium',
        seats: 4
      },
      earnings: {
        today: 320.00,
        thisWeek: 2100.00,
        thisMonth: 8200.00,
        total: 52000.00
      }
    }
  ]);
  public owners$: Observable<OwnerInfo[]> = this.ownersSubject.asObservable();

  private usersSubject = new BehaviorSubject<User[]>([
    { id: '1', username: 'passenger1', email: 'passenger@para.com', role: 'passenger', phone: '+1 (555) 111-1111' },
    { id: '2', username: 'owner1', email: 'owner@para.com', role: 'owner', phone: '+1 (555) 222-2222' },
    { id: '3', username: 'admin1', email: 'admin@para.com', role: 'administrator', phone: '+1 (555) 333-3333' },
    { id: '4', username: 'sarah_owner', email: 'sarah@para.com', role: 'owner', phone: '+1 (555) 444-4444' }
  ]);
  public users$: Observable<User[]> = this.usersSubject.asObservable();

  constructor() {}

  private getDefaultSettings(): AdminSettings {
    return {
      categories: DEFAULT_CATEGORIES,
      pricing: {
        baseMultiplier: 1.0,
        peakHourMultiplier: 1.5,
        nightMultiplier: 1.25,
        surgePricing: true
      },
      system: {
        appName: 'Para',
        supportEmail: 'support@para.com',
        commissionRate: 0.15,
        minimumDriverRating: 4.5
      }
    };
  }

  getSettings(): AdminSettings {
    return this.settingsSubject.value;
  }

  updateSettings(settings: AdminSettings): void {
    this.settingsSubject.next(settings);
  }

  getOwners(): OwnerInfo[] {
    return this.ownersSubject.value;
  }

  addOwner(owner: OwnerInfo): void {
    const current = this.ownersSubject.value;
    this.ownersSubject.next([...current, owner]);
  }

  removeOwner(userId: string): void {
    const current = this.ownersSubject.value;
    this.ownersSubject.next(current.filter(o => o.userId !== userId));
  }

  updateOwner(owner: OwnerInfo): void {
    const current = this.ownersSubject.value;
    const index = current.findIndex(o => o.userId === owner.userId);
    if (index !== -1) {
      current[index] = owner;
      this.ownersSubject.next([...current]);
    }
  }

  getUsers(): User[] {
    return this.usersSubject.value;
  }

  addUser(user: User): void {
    const current = this.usersSubject.value;
    this.usersSubject.next([...current, user]);
  }

  removeUser(userId: string): void {
    const current = this.usersSubject.value;
    this.usersSubject.next(current.filter(u => u.id !== userId));
  }

  updateUser(user: User): void {
    const current = this.usersSubject.value;
    const index = current.findIndex(u => u.id === user.id);
    if (index !== -1) {
      current[index] = user;
      this.usersSubject.next([...current]);
    }
  }

  getAllRides(): RideRequest[] {
    // Return mock data
    return [];
  }
}