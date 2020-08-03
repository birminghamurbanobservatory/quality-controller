export interface ObservationClient {
  id?: string;
  timeseriesId?: string;
  madeBySensor?: string;
  hasResult?: Result;
  resultTime?: string;
  phenomenonTime?: PhenomenonTime;
  hasDeployment?: string;
  hostedByPath?: string[];
  hasFeatureOfInterest?: string;
  observedProperty?: string;
  aggregation?: string;
  disciplines?: string[];
  usedProcedures?: string[];
  location?: Location;
}

interface Result {
  value: any;
  unit?: string;
  flags?: string[];
}

interface PhenomenonTime {
  hasBeginning: string;
  hasEnd: string;
  duration: number;
}

interface Location {
  id?: string; // this is actually the client_id
  geometry: Geometry;
  height?: number;
  validAt?: string;
}

interface Geometry {
  type: string;
  coordinates: any;
}