import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { VehicleCategory } from '../models/VehicleCategory';
import { CarInstance } from '../models/CarInstance';
import { DriverInstance } from '../models/DriverInstance';

@Injectable({
  providedIn: 'root'
})
export class LogisticService {
  constructor(private httpClient: HttpClient
  ) { }

  public getVehicleCategories(): Observable<VehicleCategory[]> {
    return this.httpClient.get<VehicleCategory[]>(`logisticConfiguration/vehicleCategories`);
  }

  public upsertVehicleCategories(vehicles: VehicleCategory[]): Observable<VehicleCategory[]> {
    return this.httpClient.patch<VehicleCategory[]>(`logisticConfiguration/vehicleCategories`, vehicles);
  }

  public getVehicles(): Observable<CarInstance[]> {
    return this.httpClient.get<CarInstance[]>(`logisticConfiguration/carInstances`);
  }

  public upsertVehicles(vehicles: CarInstance[]): Observable<CarInstance[]> {
    return this.httpClient.patch<CarInstance[]>(`logisticConfiguration/carInstances`, vehicles);
  }

  public getDrivers(): Observable<DriverInstance[]> {
    return this.httpClient.get<DriverInstance[]>(`logisticConfiguration/drivers`);
  }

  public upsertDrivers(vehicles: DriverInstance[]): Observable<DriverInstance[]> {
    return this.httpClient.patch<DriverInstance[]>(`logisticConfiguration/drivers`, vehicles);
  }
}
