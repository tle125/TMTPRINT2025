export interface TruckBed {
    name: string;
    length: number;
}

export interface CalculationResult {
    totalLengthMm: number;
    recommendedBed: TruckBed | null;
    errorMessage: string | null;
}

export interface CustomerEquipment {
    customerName: string;
    equipment: string;
}
