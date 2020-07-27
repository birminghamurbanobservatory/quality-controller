export interface CheckApp {
  checkType: string;
  appliesTo: AppliesTo;
  config: any;
  createdAt: Date;
  updatedAt: Date;
}


interface AppliesTo {
  madeBySensor: string;
  observedProperty: string;
  unit: string;
  featureOfInterest: string;
  hasDeployment: string;
  aggregation: string;
  disciplines: string[];
  disciplinesIncludes: string; 
  hostedByPath: string[];
  hosteByPathIncludes: string;
  usedProcedures: string[];
  usedProceduresIncludes: string;
}