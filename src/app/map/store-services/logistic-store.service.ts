import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { LogisticService } from './logistic-service';
import { GeoLocationService } from './geo-location.service';
import { CarInstance } from '../models/CarInstance';
import { DriverInstance } from '../models/DriverInstance';
import { LocationGeo } from '../models/LocationGeo';
import { VehicleCategory } from '../models/VehicleCategory';

@Injectable({
  providedIn: 'root'
})
export class LogisticStoreService {
  constructor(private logisticService: LogisticService,
    private locationGeolocation: GeoLocationService
  ) { }
  public vehicleCategories$ = new BehaviorSubject<VehicleCategory[]>([]);
  public vehicleInstances$ = new BehaviorSubject<CarInstance[]>([]);
  public driverInstances$ = new BehaviorSubject<DriverInstance[]>([]);

  public mainLocations$: BehaviorSubject<LocationGeo[]> =
    new BehaviorSubject<LocationGeo[]>([]);

  public proxyLocations$: BehaviorSubject<LocationGeo[]> =
    new BehaviorSubject<LocationGeo[]>([]);

  get allLocations$() {
    return combineLatest([this.mainLocations$, this.proxyLocations$]).pipe(
      map(([aList, bList]) => [...aList.filter(X => X.latitude && X.longitude), ...bList.filter(X => X.latitude && X.longitude)])
    );
  }

  public loadAllData(): void {
    this.locationGeolocation.getGeoLocation('main').subscribe(locations => this.mainLocations$.next(locations));
    this.locationGeolocation.getGeoLocation('proxy').subscribe(locations => this.proxyLocations$.next(locations));
    this.logisticService.getVehicleCategories().subscribe(cars => this.vehicleCategories$.next(cars.sort((x, y) => x.id! - y.id!)));
    this.logisticService.getVehicles().subscribe(vehicles => this.vehicleInstances$.next(vehicles.sort((x, y) => x.id! - y.id!)));
    this.logisticService.getDrivers().subscribe(drivers => this.driverInstances$.next(drivers.sort((x, y) => x.id! - y.id!)));
  }
}
