import { ApplicationRef, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Injectable, Injector, Renderer2, RendererFactory2, Type } from '@angular/core';
import * as atlas from 'azure-maps-control';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { MapRouteDetails } from './map-route-details/map-route-details';
import { MapPoint } from './MapPoint';
import { DatePipe } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class MapHelper {
  public markerOpen: Subject<boolean>;
  public selectedShapes: BehaviorSubject<(atlas.Shape | atlas.data.Feature<any, any>)[]>;
  public shapeCache: WeakMap<atlas.Shape | atlas.data.Feature<any, any>, MapPoint>;

  renderer: Renderer2
  constructor(rendererFactory: RendererFactory2,
    private injector: Injector,
    private appRef: ApplicationRef,
    private date: DatePipe,
    private cfr: ComponentFactoryResolver) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.shapeCache = new WeakMap<atlas.Shape | atlas.data.Feature<any, any>, MapPoint>();
    this.selectedShapes = new BehaviorSubject<(atlas.Shape | atlas.data.Feature<any, any>)[]>([]);
    this.markerOpen = new Subject<boolean>();
  }

  showCluster = (_shape: atlas.Shape | atlas.data.Feature<any, any>, popup: atlas.Popup, map: atlas.Map) => {
    let shape = this.getShapeMeta(_shape);
    const dataSource = (<atlas.source.DataSource>map.sources.getById(shape.source!));
    //Create the HTML content of the POI to show in the popup.
    var html = this.renderer.createElement('div');
    this.renderer.addClass(html, 'poi-box');

    var title = this.renderer.createElement('div');
    this.renderer.addClass(title, 'poi-title-box');

    var titleText = this.renderer.createElement('span');
    this.renderer.setStyle(titleText, 'vertical-align', 'middle');
    this.renderer.setProperty(titleText, 'innerText', ` CLUSTER - ${shape.cluster!}`);

    var magnifier = this.renderer.createElement('span');
    this.renderer.addClass(magnifier, 'magnifier-svg');
    this.renderer.appendChild(magnifier, this.drawMagnifier());
    this.renderer.listen(magnifier, 'click', () => {
      dataSource.getClusterExpansionZoom(shape.cluster!).then(zoom => {
        map.setCamera({
          center: shape.geometry?.coordinates,
          zoom: zoom
        });
        popup.close();
      });
    });

    this.renderer.appendChild(title, titleText);
    this.renderer.appendChild(title, magnifier);

    var content = this.renderer.createElement('div');
    this.renderer.addClass(content, 'poi-content-box');
    this.renderer.setStyle(content, 'max-height', '25vh');
    var liContainer = this.renderer.createElement('ul');
    this.renderer.appendChild(content, liContainer);
    this.renderer.addClass(liContainer, 'pretty-list');

    dataSource.getClusterLeaves(shape.cluster!, 50, 0)
      .then(ls => {
        this.selectedShapes.next(ls);

        for (const shape of ls) {
          var meta = this.getShapeMeta(shape);
          const li = this.renderer.createElement('li');
          const liTitle = this.renderer.createElement('span');
          const liAddress = this.renderer.createElement('span');

          this.renderer.setStyle(liAddress, 'font-size', 'small');
          this.renderer.appendChild(li, liTitle);
          this.renderer.appendChild(li, liAddress);
          this.renderer.appendChild(liContainer, li);
          this.renderer.listen(li, 'click', () => {
            navigator.clipboard.writeText(meta.properties.address?.freeformAddress ?? meta.properties.name);
          });
          const titleText = meta.properties.title ?? meta.properties.poi?.name ?? meta.properties.name;
          this.renderer.setProperty(liTitle, 'innerText', `${titleText} :`);
          const locationText = meta.properties.address?.freeformAddress ?? meta.properties.address?.coordinates;
          this.renderer.setProperty(liAddress, 'innerText', locationText);
        }

        this.renderer.appendChild(html, title);
        this.renderer.appendChild(html, content);
        popup.setOptions({
          position: this.getCoords(shape),
          content: html,
        });

        popup.open(map);
      });
  }

  getShapeMeta = (shape2: atlas.Shape | atlas.data.Feature<any, any>): MapPoint => {
    const cacheKey = this.shapeCache.get(shape2);
    if (cacheKey) return cacheKey;
    let mp = new MapPoint();

    if (shape2 instanceof atlas.Shape) {
      const shape = shape2 as atlas.Shape;
      mp.id = shape.getId();
      mp.coordinates = shape.getCoordinates() as any;
      mp.properties = shape.getProperties();
      mp.geometry = (<any>shape).geometry ?? (<any>shape)._geometry ?? shape.getCoordinates() as any;
      mp.cluster = shape.getProperties().cluster_id;
      mp.source = (<any>shape).source;
      mp.type = shape.getType();
    } else if ('geometry' in shape2) {
      // atlas.data.Feature has a 'geometry' property
      const feature = shape2 as atlas.data.Feature<any, any>;
      mp.id = feature.id;
      mp.coordinates = feature.geometry.coordinates;
      mp.properties = feature.properties;
      mp.geometry = feature.geometry;
      mp.cluster = feature.properties?.cluster_id;
      mp.type = feature.geometry.type;
      mp.source = (<any>feature).source;
    }

    this.shapeCache.set(shape2, mp);
    return mp;
  }


  getCoords(shape: MapPoint): any {
    return shape.type == 'Point' ? shape.coordinates : undefined;
  }

  showPopup = (shape2: atlas.Shape | atlas.data.Feature<any, any>, popup: atlas.Popup, map: atlas.Map, defaultPosition: [number, number]) => {
    const shape = this.getShapeMeta(shape2);
    var properties = shape.properties;
    //Create the HTML content of the POI to show in the popup.
    var html = this.renderer.createElement('div');
    this.renderer.addClass(html, 'poi-box');

    var content = this.renderer.createElement('div');
    this.renderer.addClass(content, 'poi-content-box');

    if (properties.summary || shape.type == 'MultiLineString') {
      this.renderMulti(content, properties, popup);
      this.renderer.appendChild(html, content);
    }
    else {
      this.renderPoint(content, properties);
      var title = this.renderer.createElement('div');
      this.renderer.addClass(title, 'poi-title-box');
      this.renderer.setStyle(title, 'vertical-align', 'middle');

      this.renderer.appendChild(html, title);
      this.renderer.appendChild(html, content);

      const titleText = properties.title ?? properties.poi?.name ?? properties.name;
      if (titleText) {
        this.renderer.setProperty(title, 'innerText', ` ${titleText} `);
      } else {
        this.renderer.setProperty(title, 'innerText', ` ${properties.address?.freeformAddress ?? 'Info'} `);
      }
      //Create a container for the body of the content of the popup.

      var liContainer = this.renderer.createElement('ul');
      this.renderer.appendChild(content, liContainer);
      this.renderer.addClass(liContainer, 'pretty-list');

      this.renderer.appendChild(html, title);
      this.renderer.appendChild(html, content);
    }

    var coords = this.getCoords(shape);
    popup.setOptions({
      position: coords ?? defaultPosition,
      content: html
    });
    this.selectedShapes.next([shape2]);
    popup.open(map);
  }

  private displayH(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil(seconds % 3600 / 60);

    return `${hours.toFixed(2)}:${minutes.toFixed(2)}`;
  }

  private conditionalAddProp(objYes: any, condition: boolean) {
    return condition ? (typeof objYes === "function" ? objYes() : objYes) : {};
  }

  private renderMulti(content: any, properties: any, popup: atlas.Popup) {
    const traficDelay = properties.summary.trafficDelayInSeconds;
    var summary = {
      length: `${Math.round(properties.summary.lengthInMeters / 1000)} km`,
      travelTime: this.displayH(properties.summary.travelTimeInSeconds),
      arrivalTime: `${this.date.transform(Date.parse(properties.summary.arrivalTime), 'hh:mm')}`,
      departureTime: `${this.date.transform(Date.parse(properties.summary.departureTime), 'hh:mm')}`,
      ...this.conditionalAddProp({ trafficDelay: this.displayH(traficDelay) }, !!traficDelay),
    };
    // if (properties.sections?.length > 1) {
    //   Object.assign(summary, { sections: properties.sections });
    // }
    if (properties.legSummaries?.length > 1) {
      var optimizedMap = properties.summary.optimizedWaypoints;
      var originalDestNames = properties.names;
      Object.assign(summary, {
        legSummaries: properties.legSummaries.map((leg: any, idx: number) => Object.assign({}, {
          ...this.conditionalAddProp(() => {
            return { direction: `${originalDestNames[optimizedMap[idx]?.optimizedIndex ?? idx]} - ${originalDestNames[optimizedMap[idx + 1]?.optimizedIndex ?? idx + 1]}` }
          },
            optimizedMap.length < originalDestNames.length && idx < originalDestNames.length
          ),
          length: `${Math.round(leg.lengthInMeters / 1000)} km`,
          arrival: `${this.date.transform(Date.parse(leg.arrivalTime), 'hh:mm')}`,
          ...this.conditionalAddProp({ travelTime: this.displayH(leg.travelTimeInSeconds) }, !!leg.travelTimeInSeconds),
          ...this.conditionalAddProp({ trafficDelay: this.displayH(leg.trafficDelayInSeconds) }, !!leg.trafficDelayInSeconds),
        }))
      });
    }

    this.open2(MapRouteDetails, {
      data: of(summary),
      toggleCollapse: () => popup.close()
    }, content);
  }

  private renderPoint(content: any, properties: any) {
    var liContainer = this.renderer.createElement('ul');
    this.renderer.appendChild(content, liContainer);
    this.renderer.addClass(liContainer, 'pretty-list');

    var locationInfo = this.renderer.createElement('li');
    const locationText = properties.address?.freeformAddress ?? properties.address?.coordinates;
    this.renderer.addClass(locationInfo, 'info');
    this.renderer.addClass(locationInfo, 'location');
    this.renderer.setProperty(locationInfo, 'innerText', ` ${locationText} `);
    this.renderer.listen(locationInfo, 'click', () => {
      if (properties.onClick) properties.onClick(properties);
      else navigator.clipboard.writeText(locationText ?? '');
    });
    this.renderer.appendChild(liContainer, locationInfo);

    if (properties.poi) {
      if (properties.poi.phone) {
        var phoneInfo = this.renderer.createElement('li');
        this.renderer.addClass(phoneInfo, 'info');
        this.renderer.addClass(phoneInfo, 'phone');
        this.renderer.setProperty(phoneInfo, 'innerText', ` ${properties.poi.phone} `);
        this.renderer.listen(phoneInfo, 'click', () => {
          navigator.clipboard.writeText(properties.poi.phone);
        });
        this.renderer.appendChild(liContainer, phoneInfo);
      }

      if (properties.poi.url) {
        var urlInfo = this.renderer.createElement('a');
        this.renderer.addClass(urlInfo, 'info');
        this.renderer.addClass(urlInfo, 'website');
        this.renderer.setProperty(urlInfo, 'innerText', `http://${properties.poi.url} `);
        this.renderer.setAttribute(urlInfo, 'target', 'blank');
        this.renderer.setAttribute(urlInfo, 'href', `http://${properties.poi.url}`);
        this.renderer.appendChild(liContainer, urlInfo);
      }
    }
  }

  getMidpointByDistance(coords: number[][]): number[] {
    // Basic haversine formula for distance between two [lon, lat] points
    const distance = (a: number[], b: number[]) => {
      const R = 6371e3; // Earth radius in meters
      const toRad = (d: number) => d * Math.PI / 180;
      const dLat = toRad(b[1] - a[1]);
      const dLon = toRad(b[0] - a[0]);
      const lat1 = toRad(a[1]);
      const lat2 = toRad(b[1]);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };

    // Total route distance
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += distance(coords[i - 1], coords[i]);
    }

    const half = total / 2;
    let acc = 0;
    for (let i = 1; i < coords.length; i++) {
      const seg = distance(coords[i - 1], coords[i]);
      if (acc + seg >= half) {
        // interpolate between coords[i-1] and coords[i]
        const ratio = (half - acc) / seg;
        const lon = coords[i - 1][0] + ratio * (coords[i][0] - coords[i - 1][0]);
        const lat = coords[i - 1][1] + ratio * (coords[i][1] - coords[i - 1][1]);
        return [lon, lat];
      }
      acc += seg;
    }

    // fallback
    return coords[Math.floor(coords.length / 2)];
  }

  private drawMagnifier(width: number = 25, height: number = 25) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const size = Math.min(width, height); // keep square ratio

    // === SVG Base ===
    const svg = this.renderer.createElement('svg', svgNS);
    this.renderer.setAttribute(svg, 'width', width.toString());
    this.renderer.setAttribute(svg, 'height', height.toString());
    this.renderer.setAttribute(svg, 'viewBox', '0 0 150 150');
    this.renderer.setStyle(svg, 'display', 'block');
    this.renderer.setStyle(svg, 'margin', '0.5em');
    this.renderer.setStyle(svg, 'max-width', '100%');

    // === Definitions: Gradients ===
    const defs = this.renderer.createElement('defs', svgNS);

    const glassGradient = this.renderer.createElement('radialGradient', svgNS);
    this.renderer.setAttribute(glassGradient, 'id', 'glassGrad');
    this.renderer.setAttribute(glassGradient, 'cx', '50%');
    this.renderer.setAttribute(glassGradient, 'cy', '50%');
    this.renderer.setAttribute(glassGradient, 'r', '50%');

    const stop1 = this.renderer.createElement('stop', svgNS);
    this.renderer.setAttribute(stop1, 'offset', '0%');
    this.renderer.setAttribute(stop1, 'stop-color', '#ffffff');
    this.renderer.setAttribute(stop1, 'stop-opacity', '0.6');

    const stop2 = this.renderer.createElement('stop', svgNS);
    this.renderer.setAttribute(stop2, 'offset', '100%');
    this.renderer.setAttribute(stop2, 'stop-color', '#aee0ff');
    this.renderer.setAttribute(stop2, 'stop-opacity', '0.9');

    this.renderer.appendChild(glassGradient, stop1);
    this.renderer.appendChild(glassGradient, stop2);

    const metalGradient = this.renderer.createElement('linearGradient', svgNS);
    this.renderer.setAttribute(metalGradient, 'id', 'metalGrad');
    this.renderer.setAttribute(metalGradient, 'x1', '0%');
    this.renderer.setAttribute(metalGradient, 'x2', '100%');
    this.renderer.setAttribute(metalGradient, 'y1', '0%');
    this.renderer.setAttribute(metalGradient, 'y2', '100%');

    const m1 = this.renderer.createElement('stop', svgNS);
    this.renderer.setAttribute(m1, 'offset', '0%');
    this.renderer.setAttribute(m1, 'stop-color', '#ccc');

    const m2 = this.renderer.createElement('stop', svgNS);
    this.renderer.setAttribute(m2, 'offset', '100%');
    this.renderer.setAttribute(m2, 'stop-color', '#666');

    this.renderer.appendChild(metalGradient, m1);
    this.renderer.appendChild(metalGradient, m2);

    this.renderer.appendChild(defs, glassGradient);
    this.renderer.appendChild(defs, metalGradient);
    this.renderer.appendChild(svg, defs);

    // === Glass circle ===
    const glass = this.renderer.createElement('circle', svgNS);
    this.renderer.setAttribute(glass, 'cx', '70');
    this.renderer.setAttribute(glass, 'cy', '70');
    this.renderer.setAttribute(glass, 'r', '45');
    this.renderer.setAttribute(glass, 'fill', 'url(#glassGrad)');
    this.renderer.setAttribute(glass, 'stroke', 'url(#metalGrad)');
    this.renderer.setAttribute(glass, 'stroke-width', '5');

    // === Handle ===
    const handle = this.renderer.createElement('rect', svgNS);
    this.renderer.setAttribute(handle, 'x', '100');
    this.renderer.setAttribute(handle, 'y', '100');
    this.renderer.setAttribute(handle, 'width', '12');
    this.renderer.setAttribute(handle, 'height', '50');
    this.renderer.setAttribute(handle, 'rx', '3');
    this.renderer.setAttribute(handle, 'fill', 'url(#metalGrad)');
    this.renderer.setAttribute(handle, 'transform', 'rotate(45 100 100)');

    // === Highlight ===
    const highlight = this.renderer.createElement('ellipse', svgNS);
    this.renderer.setAttribute(highlight, 'cx', '55');
    this.renderer.setAttribute(highlight, 'cy', '55');
    this.renderer.setAttribute(highlight, 'rx', '15');
    this.renderer.setAttribute(highlight, 'ry', '8');
    this.renderer.setAttribute(highlight, 'fill', '#fff');
    this.renderer.setAttribute(highlight, 'opacity', '0.3');
    this.renderer.setAttribute(highlight, 'transform', 'rotate(-20 55 55)');

    // Append elements
    this.renderer.appendChild(svg, handle);
    this.renderer.appendChild(svg, glass);
    this.renderer.appendChild(svg, highlight);

    // Optional: scale proportionally based on given dimensions
    // const scaleX = width / 150;
    // const scaleY = height / 150;
    // this.renderer.setStyle(svg, 'transform', `scale(${scaleX}, ${scaleY})`);
    // this.renderer.setStyle(svg, 'transform-origin', 'top left');

    return svg;
  }

  open2<T>(componentType: Type<T>, inputs: Partial<T> | undefined = undefined, container: any): ComponentRef<T> {
    const factory = this.cfr.resolveComponentFactory(componentType);
    const compRef = factory.create(this.injector);
    let instance = compRef.instance as any;
    if (inputs) {
      Object.assign(compRef.instance as any, inputs); // pass input values
    }
    if (instance.initComponent)
      instance.initComponent();
    this.appRef.attachView(compRef.hostView);
    const domElem = (compRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
    this.renderer.appendChild(container, domElem);
    return compRef;
  }
}