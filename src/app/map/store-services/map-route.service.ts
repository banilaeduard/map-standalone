import { Injectable } from '@angular/core';
import * as atlasService from 'azure-maps-rest';
import { VehicleCategory } from '../models/VehicleCategory';
import { from, map, Observable } from 'rxjs';
import { ConfigService } from '../config.service';

@Injectable({
  providedIn: 'root'
})
export class MapRouteService {
  pipeline: atlasService.Pipeline;
  routeURL: atlasService.RouteURL;
  searchURL: atlasService.SearchURL;

  constructor(private config: ConfigService) {
    this.pipeline = atlasService.MapsURL.newPipeline(new atlasService.SubscriptionKeyCredential(this.config.items.azureMapsKey));
    this.routeURL = new atlasService.RouteURL(this.pipeline);
    this.searchURL = new atlasService.SearchURL(this.pipeline);
  }

  public getRoute(coords: [number, number][], vehicleInfo: VehicleCategory | undefined): Observable<atlasService.CalculateRouteDirectionsResponse> {
    {
      return from(this.routeURL.calculateRouteDirections(
        atlasService.Aborter.timeout(10000),
        coords,
        {
          travelMode: <any>vehicleInfo?.vehicleType ?? 'car',
          ...vehicleInfo,
          computeBestOrder: true,
          routeType: <any>'shortest',
          traffic: false
        }
      )).pipe(
        map((directions: atlasService.CalculateRouteDirectionsResponse) => {
          (<any>directions.routes![0].summary).optimizedWaypoints = directions.optimizedWaypoints;
          return directions;
        })
      );
    }
  }

  public searchAddressReverse(coords: number[]): Observable<atlasService.SearchAddressReverseResponse> {
    return from(this.searchURL.searchAddressReverse(atlasService.Aborter.timeout(10000), [coords[0], coords[1]]));
  }

  public searchAddress(query: string, coords: number[], countrySet: string[]): Observable<atlasService.SearchAddressResponse> {
    return from(this.searchURL.searchAddress(atlasService.Aborter.timeout(10000), query, {
      lon: coords[0],
      lat: coords[1],
      maxFuzzyLevel: 2,
      countrySet: countrySet,
      limit: 10,
      view: 'Auto'
    }));
  }
}
