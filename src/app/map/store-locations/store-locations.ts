import { Component, Input, OnDestroy } from '@angular/core';
import * as atlas from 'azure-maps-control';
import { Observable } from 'rxjs';
import { MapHelper } from '../map-helper';
import { LocationGeo } from '../models/LocationGeo';

@Component({
  selector: 'app-store-locations',
  templateUrl: './store-locations.html',
  styleUrl: './store-locations.less'
})
export class StoreLocations implements OnDestroy {
  @Input("map") map!: atlas.Map;
  @Input() data!: Observable<LocationGeo[]>;
  @Input("popup") public popup!: atlas.Popup;

  sub: any;
  storeSource: atlas.source.DataSource | undefined;
  constructor(private mapHelper: MapHelper) { }

  ngOnDestroy(): void {
    this.sub && this.sub.unsubscribe();
  }

  public initComponent() {
    this.storeSource = <atlas.source.DataSource>this.map.sources.getById("storeSource") ?? new atlas.source.DataSource("storeSource", {
      cluster: true,
      clusterRadius: 35,
    });
    if (!this.map.sources.getById("storeSource")) {
      this.map.sources.add(this.storeSource);
      var storeLayer = new atlas.layer.SymbolLayer(this.storeSource, "store_locations_layer", {
        iconOptions: {
          image: 'marker-yellow',
          size: 1,
          opacity: 0.8,
          allowOverlap: true,
        },
        textOptions: {
          textField: [
            'coalesce',
            ['get', 'name'],
            ['get', 'point_count_abbreviated'],
            '•'
          ],
          offset: [0, -1.2],
          size: 14,
          allowOverlap: true,
        },
        minZoom: 0
      });

      this.map.layers.add(storeLayer, 'route_symbol_layer');
    }
    this.sub?.unsubscribe();
    this.sub = this.data.subscribe(locations => {
      this.storeSource!.clear();
      this.storeSource!.add(this.mapPoints(locations));
    });
  }

  mapPoints(locations: LocationGeo[]): atlas.Shape[] {
    return locations.map(loc => new atlas.Shape(new atlas.data.Feature(new atlas.data.Point([loc.longitude, loc.latitude]), {
      name: loc.locationName,
      address: { freeformAddress: loc.address },
      location: { ...loc }
    })));
  }
}
