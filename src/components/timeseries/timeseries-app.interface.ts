export interface TimeseriesApp {
  timeseriesId: string;
  lastObsTime: Date;
  persistence?: any;
  createdAt?: Date;
  updatedAt?: Date;
}
