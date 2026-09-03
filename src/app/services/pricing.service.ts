import { Injectable } from '@angular/core';
import { VehicleCategoryInfo, VehicleCategory, DEFAULT_CATEGORIES } from '../models/vehicle.model';

@Injectable({
  providedIn: 'root'
})
export class PricingService {
  private categories: VehicleCategoryInfo[] = [...DEFAULT_CATEGORIES];

  constructor() {}

  getCategories(): VehicleCategoryInfo[] {
    return this.categories;
  }

  getCategory(id: VehicleCategory): VehicleCategoryInfo | undefined {
    return this.categories.find(c => c.id === id);
  }

  updateCategory(updated: VehicleCategoryInfo): void {
    const index = this.categories.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      this.categories[index] = updated;
    }
  }

  updateAllCategories(categories: VehicleCategoryInfo[]): void {
    this.categories = categories;
  }

  calculateFare(
    category: VehicleCategory,
    distanceKm: number,
    durationMinutes: number,
    pickupDate?: Date
  ): number {
    const cat = this.getCategory(category);
    if (!cat) return 0;

    const now = pickupDate || new Date();
    const surchargeMultiplier = this.getSurchargeMultiplier(cat, now);

    // Fare = baseFare + (distance * baseRate * surcharge)
    const distanceCost = distanceKm * cat.baseRate * surchargeMultiplier;
    // Time-based cost (idle/traffic)
    const timeCost = durationMinutes * 0.5 * surchargeMultiplier;
    const total = cat.baseFare + distanceCost + timeCost;

    return Math.max(total, cat.minFare);
  }

  private getSurchargeMultiplier(category: VehicleCategoryInfo, date: Date): number {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Check night hours first (they take precedence)
    for (const night of category.surcharge.nightHours) {
      if (this.isTimeInRange(timeStr, night.start, night.end, true)) {
        return category.surcharge.nightMultiplier;
      }
    }

    // Check peak hours
    for (const peak of category.surcharge.peakHours) {
      if (this.isTimeInRange(timeStr, peak.start, peak.end, false)) {
        return category.surcharge.peakHourMultiplier;
      }
    }

    return 1.0; // Standard rate
  }

  private isTimeInRange(time: string, start: string, end: string, isOvernight: boolean): boolean {
    if (isOvernight && start > end) {
      // Overnight range (e.g., 22:00 - 06:00)
      return time >= start || time < end;
    }
    return time >= start && time <= end;
  }

  getSurchargeInfo(category: VehicleCategory): { multiplier: number; label: string } {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const cat = this.getCategory(category);
    if (!cat) return { multiplier: 1.0, label: 'Standard rate' };

    for (const night of cat.surcharge.nightHours) {
      if (this.isTimeInRange(timeStr, night.start, night.end, true)) {
        return { multiplier: cat.surcharge.nightMultiplier, label: 'Night rate' };
      }
    }

    for (const peak of cat.surcharge.peakHours) {
      if (this.isTimeInRange(timeStr, peak.start, peak.end, false)) {
        return { multiplier: cat.surcharge.peakHourMultiplier, label: 'Peak hour rate' };
      }
    }

    return { multiplier: 1.0, label: 'Standard rate' };
  }

  // Mock distance calculation between two coordinates (Haversine)
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}