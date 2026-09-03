export type UserRole = 'passenger' | 'owner' | 'administrator';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  photoUrl?: string;
  phone?: string;
}

export type VehicleCategoryType = 'economy' | 'comfort' | 'premium' | 'vanxl';

export interface OwnerInfo {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  carInfo: CarInfo;
  earnings: Earnings;
}

export interface CarInfo {
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  category: VehicleCategoryType;
  seats: number;
}

export interface Earnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
}