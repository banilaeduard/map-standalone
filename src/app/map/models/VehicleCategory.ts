import { TableEntry } from "./TableEntry";

export interface VehicleCategory extends TableEntry {
  categoryName: string;       // Name of the category
  capacity: number;           // Capacity of the vehicle
  vehicleLength: number;      // Length in meters (or your unit)
  vehicleHeight: number;      // Height in meters
  vehicleWidth: number;       // Width in meters
  vehicleMaxSpeed: number;    // Max speed in km/h (or your unit)
  vehicleWeight: number;      // Weight in kg (or your unit)
  vehicleType: string;        // Type of vehicle
  dirty?: boolean;            // Indicates if the record has unsaved changes
}