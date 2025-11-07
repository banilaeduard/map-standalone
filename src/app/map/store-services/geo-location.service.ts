import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocationGeo } from '../models/LocationGeo';

@Injectable({
  providedIn: 'root'
})
export class GeoLocationService {
  constructor(private httpClient: HttpClient) { }

  public getGeoLocation(partition: string): Observable<LocationGeo[]> {
    return this.httpClient.get<LocationGeo[]>(`datakeylocation/geo/${partition}`);
  }

  public updateGeoLocation(items: LocationGeo[]): Observable<any> {
    return this.httpClient.patch<any>('datakeylocation/geo', items);
  }
}
