import * as atlas from "azure-maps-control";

export class MapPoint {
    id?: string | number | undefined;
    source?: string;
    properties: any;
    geometry?: atlas.data.Geometry;
    coordinates?: [number, number];
    cluster?: number;
    type?: string;
    extraProps: any;
}
