import { TableEntry } from "./TableEntry";

export interface LocationGeo extends TableEntry {
    latitude: number;
    longitude: number;
    address: string;
    locationName: string;
    isActive: boolean;
    dirty?: boolean;
}