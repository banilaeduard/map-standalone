import { TableEntry } from "./TableEntry";

export interface CarInstance extends TableEntry {
    id?: number;
    carPlateNumber: string;
    carCategory: number;
    trailer1PlateNumber?: string;
    trailer2PlateNumber?: string;
    dirty?: boolean;
}