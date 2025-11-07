import { Injectable } from '@angular/core';
import { CalculateRouteDirectionsResponse } from 'azure-maps-rest';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { MapPoint } from './MapPoint';
import * as atlas from 'azure-maps-control';

@Injectable({
  providedIn: 'root'
})
export class RouteHelperService {
  public currentRoute: BehaviorSubject<{ route: CalculateRouteDirectionsResponse, points: MapPoint[] } | undefined> =
    new BehaviorSubject<{ route: CalculateRouteDirectionsResponse, points: MapPoint[] } | undefined>(undefined);
  public currentLocation: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([]);
  public currentVehicle: BehaviorSubject<any | undefined>
    = new BehaviorSubject<any | undefined>(undefined);

  public interval: any;

  followCurrentLocation(map: atlas.Map) {
    this.stopFollowingCurrentLocation();
    this.interval = setInterval(() => this.intervalInternal(map), 3000);
    this.intervalInternal(map);
  }

  intervalInternal(map: atlas.Map) {
    if (this.currentLocation.value?.length) {
      map.setCamera({
        center: [this.currentLocation.value[0], this.currentLocation.value[1]],
        maxzoom: 13,
        type: 'ease',
        duration: 1000
      });
      return;
    }

    if (this.currentRoute.value) {
      map.setCamera({
        bounds: atlas.data.BoundingBox.fromData(this.currentRoute.value.route?.geojson.getFeatures()),
        padding: 160
      });
    }
  }

  stopFollowingCurrentLocation() {
    this.interval && clearInterval(this.interval);
    this.interval = undefined;
  }

  getCurrentLocation(): Observable<number[]> {
    return this.currentLocation.asObservable().pipe(filter(x => !!x?.length));
  }

  public stopCurrentRoute() {
    this.currentRoute.next(undefined);
  }
}
