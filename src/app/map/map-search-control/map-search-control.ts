import { Component, ElementRef, Inject, Input, OnDestroy, ViewChild } from '@angular/core';
import * as atlas from 'azure-maps-control';
import * as atlasService from 'azure-maps-rest';
import { Subscription } from 'rxjs';
import { MapHelper } from '../map-helper';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MapPoint } from '../MapPoint';
import { RouteHelperService } from '../route-helper.service';
import { MapRouteService } from '../store-services/map-route.service';
import { SearchInput } from './search-input/search-input';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-map-search-control',
  templateUrl: './map-search-control.html',
  styleUrl: './map-search-control.less',
  standalone: true,
  imports: [SearchInput, ReactiveFormsModule, CommonModule]
})
export class MapSearchControl implements OnDestroy {
  @Input("map") map!: atlas.Map;
  @Input("countrySet") countrySet!: string[];
  @Input("popup") public popup!: atlas.Popup;

  @ViewChild('resultpanel') set resultpanel(el: ElementRef<HTMLUListElement> | undefined) {
    if (el) {
      // *ngIf* just created the container
      setTimeout(() => this.scrollToSelected(el.nativeElement), 0);
    }
  }

  public featureSet: Map<string, MapPoint[]> = new Map<string, MapPoint[]>();
  public selectedSet: Map<string, MapPoint> = new Map<string, MapPoint>();
  public currentKey: string = "";
  public datasource!: atlas.source.DataSource;

  private obs: Subscription[] = [];

  constructor(
    private mapHelper: MapHelper,
    private routeHelper: RouteHelperService,
    private fb: FormBuilder,
    private mapSearchService: MapRouteService) {
    this.form = this.fb.group({
      start: [''],
      end: [''],
      inter: this.fb.array([])
    });
  }

  scrollToSelected(nativeElement: HTMLUListElement) {
    const selected = nativeElement.querySelector('.selected');
    if (selected) {
      selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  form: FormGroup;

  ngOnDestroy(): void {
    for (let o of this.obs) {
      o.unsubscribe();
    }
    this.obs = [];
  }

  public initComponent() {
    this.datasource = <atlas.source.DataSource>this.map.sources.getById("searchDatasource") ?? new atlas.source.DataSource("searchDatasource", {
      cluster: false,
    });

    if (!this.map.sources.getById("searchDatasource")) {
      this.map.sources.add(this.datasource);

      var searchLayer = new atlas.layer.SymbolLayer(this.datasource, "route_symbol_layer", {
        iconOptions: {
          image: 'pin-round-darkblue',
          anchor: 'center',
          allowOverlap: true,
          offset: [5, 5]
        },
        filter: ['!=', ['get', 'isVisible'], false]
      });
      this.map.layers.add(searchLayer);

      this.map.layers.add(new atlas.layer.LineLayer(this.datasource, "route_line", {
        strokeColor: '#2272B9',
        strokeWidth: 5,
        lineJoin: 'round',
        lineCap: 'round',
        filter: ['!=', ['get', 'isVisible'], false]
      }));

      this.map.events.add('ready', () => {
        // Start updating location
        this.obs = [
          this.mapHelper.markerOpen.asObservable().subscribe(x => this.currentKey = ""),
          this.form.controls.start.valueChanges.subscribe(x => {
            if (!x?.length) {
              this.featureSet.delete('start');
              this.selectedSet.delete('start');
              if (!this.isRouteVisible)
                this.ensureSourceNameShape('start').addProperty('isVisible', false);
            }
          }),
          this.form.controls.end.valueChanges.subscribe(x => {
            if (!x?.length) {
              this.featureSet.delete('end');
              this.selectedSet.delete('end');
              if (!this.isRouteVisible)
                this.ensureSourceNameShape('end').addProperty('isVisible', false);
            }
          }),
          this.formControls.valueChanges.subscribe(x => {
            for (let current of x) {
              if (!current.input?.length) {
                this.featureSet.delete(current.key);
                this.selectedSet.delete(current.key);
                if (!this.isRouteVisible)
                  this.ensureSourceNameShape(current.key).addProperty('isVisible', false);
              }
            }
          })
        ];
      });
    }
  }

  public clearSearch(clearSource: boolean = true) {
    this.featureSet.clear();
    this.selectedSet.clear();
    this.popup.close();
    this.form.reset();
    this.form.controls.inter = this.fb.array([]);
    this.currentKey = "";
    this.routeHelper.stopCurrentRoute();
    this.datasource.getShapeById('id-route')?.addProperty('isVisible', false);
    if (clearSource) this.datasource.clear();
  }

  public itemClicked = (id: string) => {
    if (!this.currentKey.length) return;
    const features = this.featureSet.get(this.currentKey)!;
    if (features?.length) {
      const feature = features.find(f => f.id == id);
      const placeHolderShape = this.ensureSourceNameShape(this.currentKey);

      if (feature) {
        this.currentInput?.setValue(feature.properties?.name ?? feature.properties?.title ?? feature.properties?.address?.freeformAddress);
        this.selectedSet.set(this.currentKey!, feature);
        const placeHolderShape = this.ensureSourceNameShape(this.currentKey);
        placeHolderShape.setProperties({ ...feature.properties, isVisible: true });
        placeHolderShape.setCoordinates(feature.coordinates as any);
      }
      else {
        placeHolderShape.setProperties({ isVisible: true });
        this.selectedSet.delete(this.currentKey);
      }
    }
    this.currentKey = "";
  }

  public get canRoute(): boolean {
    return this.selectedSet.has("start") && this.selectedSet.has("end");
  }

  public get isRouteVisible(): boolean {
    return this.datasource.getShapeById(`id-route`)?.getProperties().isVisible === true;
  }

  private ensureSourceNameShape(sourceName: string, template: atlas.data.Feature<any, any> | undefined = undefined): atlas.Shape {
    let shape = this.datasource.getShapeById(`id-${sourceName}`);
    if (!shape) {
      shape = new atlas.Shape(template?.geometry ?? new atlas.data.Point([0, 0]), `id-${sourceName}`, {
        isVisible: false,
        name: sourceName
      });

      this.datasource.add(shape);
    }

    return shape;
  }

  public addPosition(sourceName: string | number) {
    const selected = this.mapHelper.selectedShapes.getValue().map(this.mapHelper.getShapeMeta) ?? [];

    if (this.popup.isOpen() || selected.length) {
      if (selected.length) {
        if (selected.length == 1) {
          let meta = selected[0];
          this.setFormValue(sourceName, meta.properties.name ?? meta.properties.title);
          this.handleCachedResults2(sourceName?.toString(), selected);
        }
        else {
          this.setFormValue(sourceName, 'Select a value from cluster');
          this.handleCachedResults2(sourceName?.toString(), selected);
        }
      }
      this.popup.close();
    }
  }

  public startRoute = () => {
    if (this.canRoute) {
      const points = this.getRouteMeta();
      this.mapSearchService.getRoute(points.map(x => x?.coordinates!), this.routeHelper.currentVehicle.value)
        .subscribe((directions: atlasService.CalculateRouteDirectionsResponse) => {
          let route = directions.geojson.getFeatures();
          var routeShape = this.ensureSourceNameShape('route', route.features[0]);

          routeShape.setCoordinates(route.features[0].geometry.coordinates);
          routeShape.addProperty('isVisible', true);
          // Optionally zoom the map to fit the route
          this.map.setCamera({
            bounds: atlas.data.BoundingBox.fromData(route),
            padding: 80
          });

          var routeData = directions.routes![0];
          var names = points.map(x => x.properties.title ?? x.properties.name);
          points.forEach(x => {
            x.properties.summary = routeData.summary;
            x.properties.names = names;
            x.properties.legSummaries = routeData.legs?.map(x => x.summary);
          });
          this.routeHelper.currentRoute.next({ route: directions, points });
        });
    }
  }

  private getRouteMeta(): MapPoint[] {
    const points: MapPoint[] = [];
    points.push(this.mapHelper.getShapeMeta(this.ensureSourceNameShape('start')));
    if (this.formControls?.length) {
      for (const val of this.formControls.controls) {
        points.push(this.mapHelper.getShapeMeta(this.ensureSourceNameShape(val.value.key)));
      }
    }
    points.push(this.mapHelper.getShapeMeta(this.ensureSourceNameShape('end')));

    return points;
  }

  performSearch = (query: String, searchSource: String | number) => {
    if (!query) return;
    const currentLocation = this.routeHelper.currentLocation.value;
    var pos = currentLocation ? currentLocation : this.map.getCamera().center ?? [0, 0];
    this.mapSearchService.searchAddress(query.toString(), pos, this.countrySet)
      .subscribe((results: atlasService.SearchAddressResponse) => {
        var data = results.geojson.getFeatures();
        this.handleCachedResults(searchSource.toString(), data);
      });
  }

  private setFormValue(searchSource: string | number, value: string | undefined) {
    if (!isNaN(+searchSource)) {
      this.formControls.at(+searchSource).controls.input.setValue(value);
    } else {
      this.form.controls[searchSource as keyof typeof this.form.controls].setValue(value);
    }
  }

  private handleCachedResults2(searchSource: string, data: MapPoint[]) {
    if (!isNaN(+searchSource)) {
      searchSource = this.formControls.at(+searchSource).value.key;
    }
    this.currentKey = searchSource;
    this.featureSet.set(searchSource, data);
    const placeHolderShape = this.ensureSourceNameShape(searchSource);

    if (data?.length === 1) {
      this.selectedSet.set(this.currentKey, data[0]);
      placeHolderShape.setProperties({ ...data[0].properties, isVisible: true });
      placeHolderShape.setCoordinates(data[0].coordinates as any);
    }

    this.tryRecenterCamera();
  }

  private handleCachedResults(searchSource: string, data: atlas.data.FeatureCollection) {
    if (!isNaN(+searchSource)) {
      searchSource = this.formControls.at(+searchSource).value.key;
    }
    if (this.featureSet.has(searchSource)) {
      this.featureSet.get(searchSource)!.forEach(f => {
        this.datasource.removeById(f.id!);
      });
    }

    this.currentKey = searchSource;
    const placeHolderShape = this.ensureSourceNameShape(searchSource);
    const mapPoints = data.features.map(this.mapHelper.getShapeMeta);
    this.featureSet.set(searchSource, mapPoints);
    if (mapPoints.length === 1) {
      this.selectedSet.set(this.currentKey, mapPoints[0]);
      placeHolderShape.setProperties({ ...mapPoints[0].properties, isVisible: true });
      placeHolderShape.setCoordinates(mapPoints[0].coordinates as any);
    }
    this.tryRecenterCamera();
  }

  private tryRecenterCamera() {
    if (this.featureSet.values.length > 1) {
      let fCol = [];
      for (let val of this.featureSet.entries()) {
        const f = val[1]?.filter(s => !!s.geometry).map(s => s.geometry!);
        if (f) fCol.push(f);
      }
      fCol = fCol.flatMap(x => x);
      this.map.setCamera({
        bounds: atlas.data.BoundingBox.fromData(fCol),
        padding: 80,
        type: "ease",
        maxZoom: 8
      });
    }
  }


  reset() {
    this.currentKey = "";
  }

  get formControls(): FormArray<FormGroup> {
    return this.form.get('inter') as FormArray;
  }

  get currentFeatures(): any[] {
    return this.featureSet.get(this.currentKey ?? '') ?? [];
  }

  get currentInput(): AbstractControl | undefined {
    if (!this.currentKey.length) return;
    let currentInput = this.formControls.controls.find(x => x?.value.key == this.currentKey)?.get('input');
    if (!currentInput) {
      if (this.currentKey == 'start') currentInput = this.form.get('start')!;
      if (this.currentKey == 'end') currentInput = this.form.get('end')!;
    }

    return currentInput ?? undefined;
  }
}