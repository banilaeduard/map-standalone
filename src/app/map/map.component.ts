import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import * as atlas from 'azure-maps-control';
import * as atlasService from 'azure-maps-rest';
import { MapSearchControl } from './map-search-control/map-search-control';
import { MapPoiControl } from './map-poi-control/map-poi-control';
import { MapHelper } from './map-helper';
import { MapControl } from './map.control';
import { MapRouteDetails } from './map-route-details/map-route-details';
import { debounceTime, map, takeWhile } from 'rxjs';
import { MapLayerView } from './map-layer-view/map-layer-view';
import { StoreLocations } from './store-locations/store-locations';
import { RouteHelperService } from './route-helper.service';
import { ConfigService } from './config.service';
import { LogisticStoreService } from './store-services/logistic-store.service';
import { MapRouteService } from './store-services/map-route.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrl: './map.component.less',
    standalone: true,
    imports: [CommonModule,
    ReactiveFormsModule]
})
export class MapComponent implements OnDestroy {
    @ViewChild('mapElement', { static: true }) mapElement!: ElementRef;

    public map!: atlas.Map | undefined;
    public countrySet: string[] = ["RO"];
    public popup!: atlas.Popup | undefined;
    public userMarker!: atlas.HtmlMarker;

    private lastInteraction = 0;
    private cooldown = 10 * 1000;
    constructor(private config: ConfigService,
        private mapHelper: MapHelper,
        private routeHelper: RouteHelperService,
        private mapCtrl: MapControl,
        private logisticStoreService: LogisticStoreService,
        private mapSearchService: MapRouteService) {
    }

    ngOnDestroy(): void {
        this.popup?.remove();
        this.popup = undefined;
        if (this.map) {
            console.log('Destroying Azure map...');
            this.map.dispose();
            this.map = undefined;
        }
        this.mapCtrl.onRemove();
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' || event.key === 'Esc') {
            this.popup?.close();
        }
    }

    ngAfterViewInit(): void {
        this.initialize();
        this.routeHelper.currentLocation.asObservable().pipe(
            debounceTime(15 * 1000),
            takeWhile(_ => Date.now() - this.lastInteraction > this.cooldown),
        ).subscribe(coords => this.map?.setCamera({
            center: [coords[0], coords[1]],
            maxzoom: 13,
            type: 'ease',
            duration: 1000
        }));
        this.registerInteractionListeners(this.map!);
    }

    initialize = () => {
        //Initialize a map instance.
        this.map = new atlas.Map('myMap', {
            center: [25.32, 44.71],
            zoom: 8,
            view: 'Auto',
            //Add your Azure Maps subscription key to the map SDK.
            authOptions: {
                authType: atlas.AuthenticationType.subscriptionKey,
                subscriptionKey: this.config.items.azureMapsKey
            }
        });
        //Create a pop-up window, but leave it closed so we can update it and display it later.
        this.popup = new atlas.Popup({
        });

        this.setupUserMarker();
        //Wait until the map resources are ready.
        this.map.events.add('ready', () => {
            //Add the zoom control to the map.
            this.map!.controls.add(new atlas.control.ZoomControl(), {
                position: atlas.ControlPosition.BottomRight
            });

            this.map!.controls.add(new atlas.control.TrafficControl(), {
                position: atlas.ControlPosition.BottomLeft
            });

            this.map!.controls.add(this.mapCtrl, {
                position: atlas.ControlPosition.TopRight,
                options: [{
                    name: 'MapSearchControl', type: MapSearchControl, inputs: {
                        countrySet: this.countrySet,
                        popup: this.popup,
                        map: this.map
                    }
                },
                {
                    name: 'MapPoiControl', type: MapPoiControl, inputs: {
                        countrySet: this.countrySet,
                        popup: this.popup,
                        map: this.map
                    }
                },
                {
                    name: 'Current vehicle', type: MapRouteDetails, inputs: {
                        data: this.routeHelper.currentVehicle.asObservable()
                    }
                },
                {
                    name: 'MapLayerView', type: MapLayerView, inputs: {
                        map: this.map
                    }
                }
                ]
            });

            this.setupReverseSearch();
            this.setupClickInteraction();

            this.mapCtrl.open2(StoreLocations, {
                map: this.map,
                data: this.logisticStoreService.allLocations$.pipe(map(x => x.filter(loc => !(loc.latitude > 0.1 && loc.latitude < 0.1 && loc.isActive)))),
                popup: this.popup,
            });
        });
    }

    registerInteractionListeners(map: atlas.Map) {
        const updateInteraction = () => { this.lastInteraction = Date.now(); };

        // Azure Maps interaction events
        map.events.add('mousedown', updateInteraction);
        map.events.add('mouseup', updateInteraction);
        map.events.add('touchstart', updateInteraction);
        map.events.add('touchend', updateInteraction);
        map.events.add('wheel', updateInteraction);
        map.events.add('movestart', updateInteraction);
        map.events.add('moveend', updateInteraction);
        map.events.add('zoom', updateInteraction);

        // Fallback: handle WebView-level touch events (e.g., iOS WKWebView, Android WebView)
        window.addEventListener('touchstart', updateInteraction, { passive: true });
        window.addEventListener('touchend', updateInteraction, { passive: true });
        window.addEventListener('scroll', updateInteraction, { passive: true });
    }

    setupUserMarker() {
        this.userMarker = new atlas.HtmlMarker({
            color: 'DodgerBlue',
            text: '🚗',
            position: [44.74008, 25.35271],
        });
        this.map!.markers.add(this.userMarker);
        this.map!.events.add("click", this.userMarker, (e: any) => {
            var shape = new atlas.Shape(new atlas.data.Feature(new atlas.data.Point(e.target.options.position)));
            shape.setProperties({
                name: 'User Location',
                address: { coordinates: `[${e.target.options.position[0]}, ${e.target.options.position[1]}]` }
            });
            if (e.target.options.position) {
                this.mapHelper.showPopup(shape, this.popup!, this.map!, e.target.options.position);
                this.mapHelper.markerOpen.next(true);
            } else {
                this.popup!.close();
            }
        });
        this.routeHelper.getCurrentLocation().subscribe(coords => {
            this.userMarker.setOptions({ position: [coords[0], coords[1]] });
        });
    }

    setupReverseSearch() {
        const datasource = new atlas.source.DataSource('reverse-search');
        const reverseLayer = new atlas.layer.SymbolLayer(datasource, "reverse_search_layer", {
            iconOptions: {
                image: 'pin-round-blue',
                anchor: 'center',
                allowOverlap: true
            }
        });
        this.map?.sources.add(datasource);
        this.map?.layers.add(reverseLayer);

        this.map!.setUserInteraction({
            dblClickZoomInteraction: false
        });

        this.map!.events.add("dblclick", this.map!.layers.getLayers(), (e: any) => {
            //Make sure the event occurred on a shape feature.
            console.log(e);
            var shape = new atlas.Shape(new atlas.data.Feature(new atlas.data.Point(e.position)));
            shape.setProperties({
                title: 'Reverse Search',
                name: `[${e.position[0]}, ${e.position[1]}]`,
                address: {
                    coordinates: `[${e.position[0]}, ${e.position[1]}]`
                },
                coordinates: [e.position[0], e.position[1]],
                onClick: (properties: any) => {
                    this.mapSearchService.searchAddressReverse(properties.coordinates)
                        .subscribe((result: atlasService.SearchAddressReverseResponse) => {
                            if (result.addresses && result.addresses.length > 0) {
                                var data = result.geojson.getFeatures();
                                for (const f of data.features) {
                                    f.properties = f.properties ?? {};
                                    f.properties.title = f.properties.address.freeformAddress;
                                    f.properties.name = f.properties.address.freeformAddress;
                                }
                                datasource.add(data);
                                this.popup!.close();
                                this.mapHelper.showPopup(<any>data.features[0], this.popup!, this.map!, e.position);
                                this.mapHelper.markerOpen.next(true);
                            }
                        });
                }
            });
            this.mapHelper.showPopup(shape, this.popup!, this.map!, e.position);
            this.mapHelper.markerOpen.next(true);
        });
    }

    setupClickInteraction() {
        const layerMap = new Map<string, boolean>();
        const relevantLayers = ['reverse_search_layer', 'store_locations_layer', 'poi_layer', 'route_symbol_layer'];
        const layers = this.map?.layers.getLayers().filter(l => relevantLayers.find(x => x == l.getId()))!;

        if (layers) {
            for (const l of layers)
                layerMap.set(l.getId(), true);
            this.map!.events.add("click", layers, (e: atlas.MapMouseEvent) => {
                this.clickInteraction(e);
            });
        }
        this.map!.events.add('layeradded', (layer) => {
            if (!relevantLayers.find(x => x == layer.getId()) || layerMap.get(layer.getId())) return;
            layerMap.set(layer.getId(), true);
            this.map!.events.add("click", layer, (e: atlas.MapMouseEvent) => {
                this.clickInteraction(e);
            });
        });
    }

    private clickInteraction(e: atlas.MapMouseEvent) {
        const shapes = e.shapes as (atlas.data.Feature<atlas.data.Geometry, any> | atlas.Shape)[];
        if (shapes?.length) {
            const shape = (shapes.find((x: atlas.data.Feature<atlas.data.Geometry, any> | atlas.Shape) => {
                return this.mapHelper.shapeCache.has(x) && this.mapHelper.shapeCache.get(x)?.properties.summary;
            })) ?? shapes[0];
            var shape2 = this.mapHelper.getShapeMeta(shape);
            if (shape2.cluster) {
                this.mapHelper.showCluster(shape, this.popup!, this.map!);
            } else {
                this.mapHelper.showPopup(shape, this.popup!, this.map!, e.position as any);
            }
            this.mapHelper.markerOpen.next(true);
        }
    }
}
