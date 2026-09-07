import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { VehicleCategoryInfo, VehicleCategory, DEFAULT_CATEGORIES } from '../models/vehicle.model';
import { User, OwnerInfo } from '../models/user.model';
import { RideRequest } from '../models/ride.model';
import { StorageService } from './storage.service';

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
  private readonly SETTINGS_KEY = 'para_settings';
  private readonly OWNERS_KEY = 'para_owners';
  private readonly RIDES_KEY = 'para_rides';

  private settingsSubject = new BehaviorSubject<AdminSettings>(this.getDefaultSettings());
  public settings$: Observable<AdminSettings> = this.settingsSubject.asObservable();

  private ownersSubject = new BehaviorSubject<OwnerInfo[]>([]);
  public owners$: Observable<OwnerInfo[]> = this.ownersSubject.asObservable();

  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$: Observable<User[]> = this.usersSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.initData();
  }

  private async initData() {
    await this.storageService.initializeData();

    // Load or initialize settings
    const savedSettings = this.storageService.getItem<AdminSettings>(this.SETTINGS_KEY);
    if (savedSettings) {
      this.settingsSubject.next(savedSettings);
    } else {
      const defaultSettings = this.getDefaultSettings();
      this.storageService.setItem(this.SETTINGS_KEY, defaultSettings);
      this.settingsSubject.next(defaultSettings);
    }

    // Load or initialize owners
    const savedOwners = this.storageService.getItem<OwnerInfo[]>(this.OWNERS_KEY);
    if (savedOwners && savedOwners.length > 0) {
      this.ownersSubject.next(savedOwners);
    } else {
      const defaultOwners: OwnerInfo[] = [
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
      ];
      this.storageService.setItem(this.OWNERS_KEY, defaultOwners);
      this.ownersSubject.next(defaultOwners);
    }

    // Load users from storage
    const users = this.storageService.getUsersFromLocalStorage() || [];
    this.usersSubject.next(users);
  }

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
    this.storageService.setItem(this.SETTINGS_KEY, settings);
    this.settingsSubject.next(settings);
  }

  getOwners(): OwnerInfo[] {
    return this.ownersSubject.value;
  }

  addOwner(owner: OwnerInfo): void {
    const current = this.ownersSubject.value;
    const updated = [...current, owner];
    this.storageService.setItem(this.OWNERS_KEY, updated);
    this.ownersSubject.next(updated);
  }

  removeOwner(userId: string): void {
    const current = this.ownersSubject.value;
    const updated = current.filter(o => o.userId !== userId);
    this.storageService.setItem(this.OWNERS_KEY, updated);
    this.ownersSubject.next(updated);
  }

  updateOwner(owner: OwnerInfo): void {
    const current = this.ownersSubject.value;
    const index = current.findIndex(o => o.userId === owner.userId);
    if (index !== -1) {
      current[index] = owner;
      this.storageService.setItem(this.OWNERS_KEY, current);
      this.ownersSubject.next([...current]);
    }
  }

  getUsers(): User[] {
    return this.storageService.getUsersFromLocalStorage() || [];
  }

  addUser(user: User): void {
    this.storageService.addUser(user);
    this.usersSubject.next(this.storageService.getUsersFromLocalStorage() || []);
  }

  removeUser(userId: string): void {
    const current = this.getUsers();
    const updated = current.filter(u => u.id !== userId);
    this.storageService.saveUsersToLocalStorage(updated);
    this.usersSubject.next(updated);
  }

  updateUser(user: User): void {
    const current = this.getUsers();
    const index = current.findIndex(u => u.id === user.id);
    if (index !== -1) {
      current[index] = user;
      this.storageService.saveUsersToLocalStorage(current);
      this.usersSubject.next([...current]);
    }
  }

  getAllRides(): RideRequest[] {
    return this.storageService.getItem<RideRequest[]>(this.RIDES_KEY) || [];
  }
}
