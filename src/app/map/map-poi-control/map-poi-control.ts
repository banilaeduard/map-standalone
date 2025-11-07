import { Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import * as atlas from 'azure-maps-control';
import * as atlasService from 'azure-maps-rest';
import { MapHelper } from '../map-helper';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RouteHelperService } from '../route-helper.service';
import { CommonModule } from '@angular/common';
import { SearchInput } from '../map-search-control/search-input/search-input';

@Component({
  selector: 'app-map-poi-control',
  templateUrl: './map-poi-control.html',
  styleUrl: './map-poi-control.less',
  standalone: true,
  imports: [CommonModule, SearchInput, ReactiveFormsModule]
})
export class MapPoiControl implements OnDestroy {
  public route: atlasService.CalculateRouteDirectionsResponse | undefined;
  @ViewChild('searchContainer', { static: true }) searchContainer!: ElementRef<HTMLDivElement>;

  constructor(
    private mapHelper: MapHelper,
    private routeHelper: RouteHelperService,
    private fb: FormBuilder) {
    this.form = this.fb.group({
      start: [''],
      inter: this.fb.array([])
    });
  }

  ngOnDestroy(): void {
    for (let o of this.obs) {
      o.unsubscribe();
    }
    this.obs = [];
  }

  form: FormGroup;

  @Input("map") map!: atlas.Map;
  @Input("countrySet") countrySet!: string[];
  @Input("popup") public popup!: atlas.Popup;
  public obs: Subscription[] = [];
  public featureSet: Map<string, any> = new Map<string, any>();
  public poiSource!: atlas.source.DataSource;
  private searchURL!: atlasService.SearchURL;

  public initComponent() {
    var pipeline = atlasService.MapsURL.newPipeline(new atlasService.MapControlCredential(this.map));
    this.searchURL = new atlasService.SearchURL(pipeline);

    this.poiSource = <atlas.source.DataSource>this.map.sources.getById("poiDataSource") ?? new atlas.source.DataSource("poiDataSource", {
      cluster: true,
      clusterRadius: 35,
    });
    if (!this.map.sources.getById("poiDataSource")) {
      this.map.sources.add(this.poiSource);
      var poiLayer = new atlas.layer.SymbolLayer(this.poiSource, "poi_layer", {
        iconOptions: {
          image: 'marker-blue',  // built-in Azure Maps icon
          size: 0.75
        },
        textOptions: {
          textField: [
            'coalesce',
            ['get', 'name'],
            ['get', 'point_count_abbreviated'],
            '•'
          ],   // show POI name
          offset: [0, 1.2]
        }
      });
      this.map.layers.add(poiLayer);
    }
    for (let o of this.obs ?? []) {
      o.unsubscribe();
    }
    this.obs = [
      this.routeHelper.currentRoute.asObservable().subscribe(inf => this.route = inf?.route),
      this.form.controls.start.valueChanges.subscribe(x => this.clearFeatureSet('start')),
      this.formControls.valueChanges.subscribe(x => {
        for (let current of x) {
          if (!current.input?.length) {
            this.clearFeatureSet(current.key);
          }
        }
      })
    ]
  }

  reset() {
    this.searchContainer.nativeElement.style.display = 'flex';
  }

  clearMarkers() {
    this.featureSet.clear();
    this.popup.close();
    this.form.reset();
    this.form.controls.inter = this.fb.array([]);
    this.poiSource.clear();
  }

  private sampleCoords(coords: number[][], size: number = 100): number[][] {
    if (size == 0) size = 100;
    if (size > coords?.length) return coords;
    let take = Math.floor(coords.length / size);

    const result: number[][] = [];
    for (let i = 0; i < size; i++) {
      result.push(this.mapHelper.getMidpointByDistance([coords[i * take], coords[(i + 1) * take - 1]]));
    }

    return result;
  }

  searchAlongRoute() {
    const legs = this.route?.routes![0]?.legs;
    if (legs) {
      let coordinates = legs
        .flatMap(x => x.points)
        .filter((points: any) => points && points.longitude !== undefined && points.latitude !== undefined)
        .map((p: any) => [p.longitude, p.latitude]);
      const geoJsonLineString: atlasService.Models.LineString = {
        type: "LineString",
        coordinates: this.sampleCoords(coordinates)
      };
      this.searchURL.searchAlongRoute(atlasService.Aborter.timeout(10000), "PARKING", 3600,
        {
          route: geoJsonLineString
        },
        {
          limit: 20
        }).then((result: atlasService.SearchAlongRouteResponse) => {
          console.log(result);
          if (result.results?.length) {
            var data = result.geojson.getFeatures();
            this.clearFeatureSet('route');

            for (const f of result.results) {
              const ff = data.features.find(x => x.id == f.id)!;
              ff.properties!.name = f.poi?.name
            }
            this.poiSource.add(data);
            this.featureSet.set('route', data);
            this.popup.close();
          }
        });
    }
  }

  searchPOI(coords: number[], sourceName: string) {
    if (!isNaN(+sourceName)) {
      sourceName = this.formControls.at(+sourceName).value.key;
    }
    this.searchURL.searchPOI(atlasService.Aborter.timeout(10000), "PARKING", {
      lon: coords[0],
      lat: coords[1],
      limit: 25,
    }).then((result: atlasService.SearchPOICategoryResponse) => {
      if (result.results?.length) {
        var data = result.geojson.getFeatures();
        this.clearFeatureSet(sourceName);

        for (const f of result.results) {
          const ff = data.features.find(x => x.id == f.id)!;
          ff.properties!.name = f.poi?.name
        }
        this.poiSource.add(data);
        this.featureSet.set(sourceName, data);
        this.popup.close();
      }
    });
  }

  public clearFeatureSet(searchSource: string) {
    for (let feature of this.featureSet.get(searchSource)?.features ?? []) {
      this.poiSource.remove(feature);
    }
    this.featureSet.delete(searchSource);
  }

  get formControls(): FormArray<FormGroup> {
    return this.form.get('inter') as FormArray;
  }

  private setFormValue(searchSource: string | number, value: string | undefined) {
    if (!isNaN(+searchSource)) {
      this.formControls.at(+searchSource).controls.input.setValue(value);
    } else {
      this.form.controls[searchSource as keyof typeof this.form.controls].setValue(value);
    }
  }

  public addPosition(sourceName: string | number) {
    if (this.popup.isOpen()) {
      this.setFormValue(sourceName, this.popup.getOptions().position?.toString());
      this.searchPOI(this.popup.getOptions().position!, sourceName.toString());
    }
  }
}
