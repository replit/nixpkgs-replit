import { IExperimentationService } from 'tas-client';
export default class TelemetryDisabledExperimentationService implements IExperimentationService {
    initializePromise: Promise<void>;
    initialFetch: Promise<void>;
    isFlightEnabled(flight: string): boolean;
    isCachedFlightEnabled(flight: string): Promise<boolean>;
    isFlightEnabledAsync(flight: string): Promise<boolean>;
    getTreatmentVariable<T extends string | number | boolean>(configId: string, name: string): T | undefined;
    getTreatmentVariableAsync<T extends string | number | boolean>(configId: string, name: string): Promise<T | undefined>;
}
