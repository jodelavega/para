import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole, OwnerInfo } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private storageService: StorageService) {
    // Check session storage first
    const sessionUser = this.storageService.getSessionUser();
    if (sessionUser) {
      this.currentUserSubject.next(sessionUser);
    }
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  async login(username: string, password: string, role: UserRole): Promise<User> {
    // Ensure data is loaded
    await this.storageService.initializeData();
    const users = this.storageService.getUsersFromLocalStorage() || [];

    const user = users.find(u => u.username === username && u.role === role);
    
    // Check credentials or provide a fallback if it's a demo
    if (user && (!user.password || user.password === password)) {
      this.currentUserSubject.next(user);
      this.storageService.setSessionUser(user);
      return user;
    } else {
      // Auto-login fallback for demo ease, but store new user if created
      const demoUser = users.find(u => u.role === role);
      if (demoUser) {
        const loginUser: User = {
          id: demoUser.id,
          username: username || demoUser.username,
          email: `${role}@para.com`,
          role: role,
          phone: demoUser.phone || '+1234567890'
        };
        this.currentUserSubject.next(loginUser);
        this.storageService.setSessionUser(loginUser);
        return loginUser;
      }
      throw new Error('Invalid credentials');
    }
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.storageService.clearSession();
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  getOwnerInfo(): OwnerInfo {
    return {
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
    };
  }
}
