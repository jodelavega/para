export type VehicleCategory = 'economy' | 'comfort' | 'premium' | 'vanxl';

export interface VehicleCategoryInfo {
  id: VehicleCategory;
  name: string;
  description: string;
  icon: string;
  baseRate: number; // per km
  baseFare: number; // starting fare
  minFare: number;
  surcharge: SurchargeConfig;
  imageUrl?: string;
  maxPassengers: number;
}

export interface SurchargeConfig {
  peakHourMultiplier: number;
  nightMultiplier: number;
  peakHours: { start: string; end: string }[];
  nightHours: { start: string; end: string }[];
}

export const DEFAULT_CATEGORIES: VehicleCategoryInfo[] = [
  {
    id: 'economy',
    name: 'Economy',
    description: 'Affordable rides for everyday trips',
    icon: 'car-sport-outline',
    baseRate: 8,
    baseFare: 25,
    minFare: 30,
    maxPassengers: 4,
    surcharge: {
      peakHourMultiplier: 1.5,
      nightMultiplier: 1.25,
      peakHours: [{ start: '07:00', end: '09:00' }, { start: '17:00', end: '19:00' }],
      nightHours: [{ start: '22:00', end: '06:00' }]
    }
  },
  {
    id: 'comfort',
    name: 'Comfort',
    description: 'Newer cars with extra legroom',
    icon: 'car-outline',
    baseRate: 12,
    baseFare: 35,
    minFare: 45,
    maxPassengers: 4,
    surcharge: {
      peakHourMultiplier: 1.5,
      nightMultiplier: 1.25,
      peakHours: [{ start: '07:00', end: '09:00' }, { start: '17:00', end: '19:00' }],
      nightHours: [{ start: '22:00', end: '06:00' }]
    }
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Luxury vehicles with professional drivers',
    icon: 'car-outline',
    baseRate: 20,
    baseFare: 50,
    minFare: 70,
    maxPassengers: 4,
    surcharge: {
      peakHourMultiplier: 1.75,
      nightMultiplier: 1.5,
      peakHours: [{ start: '07:00', end: '09:00' }, { start: '17:00', end: '19:00' }],
      nightHours: [{ start: '22:00', end: '06:00' }]
    }
  },
  {
    id: 'vanxl',
    name: 'Van / XL',
    description: 'Spacious vehicles for groups or luggage',
    icon: 'bus-outline',
    baseRate: 15,
    baseFare: 40,
    minFare: 55,
    maxPassengers: 7,
    surcharge: {
      peakHourMultiplier: 1.5,
      nightMultiplier: 1.25,
      peakHours: [{ start: '07:00', end: '09:00' }, { start: '17:00', end: '19:00' }],
      nightHours: [{ start: '22:00', end: '06:00' }]
    }
  }
];