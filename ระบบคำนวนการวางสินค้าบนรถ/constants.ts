
import type { TruckBed } from './types';

export const SEPARATOR_WIDTH_MM: number = 76.2; // 3 inches in mm

export const TRUCK_BEDS: TruckBed[] = [
    { name: '3.0 เมตร', length: 3000 },
    { name: '3.5 เมตร', length: 3500 }
].sort((a, b) => a.length - b.length); // Sort by length ascending, important for finding the smallest suitable bed
