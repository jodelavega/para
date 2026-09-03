import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole, OwnerInfo } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private mockUsers: User[] = [
    { id: '1', username: 'passenger1', email: 'passenger@para.com', role: 'passenger' },
    { id: '2', username: 'owner1', email: 'owner@para.com', role: 'owner' },
    { id: '3', username: 'admin1', email: 'admin@para.com', role: 'administrator' }
  ];

  constructor() {}

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string, role: UserRole): Promise<User> {
    return new Promise((resolve, reject) => {
      const user = this.mockUsers.find(u => u.username === username && u.role === role);
      if (user) {
        this.currentUserSubject.next(user);
        resolve(user);
      } else {
        // Auto-login with demo account based on role
        const demoUser = this.mockUsers.find(u => u.role === role);
        if (demoUser) {
          // For demo purposes, allow login
          const loginUser: User = {
            id: demoUser.id,
            username: username || demoUser.username,
            email: `${role}@para.com`,
            role: role,
            phone: '+1234567890'
          };
          this.currentUserSubject.next(loginUser);
          resolve(loginUser);
        } else {
          reject(new Error('Invalid credentials'));
        }
      }
    });
  }

  logout(): void {
    this.currentUserSubject.next(null);
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