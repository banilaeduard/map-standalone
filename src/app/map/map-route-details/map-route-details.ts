import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BehaviorSubject, filter, map, Observable, of } from 'rxjs';

@Component({
  selector: 'app-map-route-details',
  templateUrl: './map-route-details.html',
  styleUrl: './map-route-details.less',
  standalone: true,
  imports: [CommonModule]
})
export class MapRouteDetails {
  @Input() data!: Observable<any>;
  @Input() collapsed = false;

  isCollapsed = this.collapsed;
  reset() {
    this.collapsed = false;
  }
  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  copyJson() {
    const jsonText = JSON.stringify(this.data, null, 2);
    navigator.clipboard.writeText(jsonText);
  }

  isObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  // ✅ Add these helper methods
  isString(value: any): boolean {
    return typeof value === 'string';
  }

  isNumber(value: any): boolean {
    return typeof value === 'number';
  }

  isBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }
}
