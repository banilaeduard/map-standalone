import { TableEntry } from "./TableEntry";

export interface DriverInstance extends TableEntry {
  driverName: string;        // Name of the driver
  driverPhoneNumber: string; // Phone number of the driver
  driverPassKey: string;     // Password or access key
  capabilities?: DriverCapability[]; // List of vehicle categories the driver can operate
  dirty?: boolean;
}

export interface DriverCapability {
  id?: number;
  carTypeId: number;
  driverId?: number;
}