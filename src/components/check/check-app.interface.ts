export interface CheckApp {
  id?: string;
  checkType: string;
  appliesTo: AppliesTo;
  config: any;
  createdAt?: Date;
  updatedAt?: Date;
}


interface AppliesTo {
  madeBySensor?: string;
  observedProperty?: string;
  unit?: string;
  hasFeatureOfInterest?: string;
  hasDeployment?: string;
  aggregation?: string;
  disciplines?: string[];
  disciplinesIncludes?: string; 
  hostedByPath?: string[];
  hostedByPathIncludes?: string;
  usedProcedures?: string[];
  usedProceduresIncludes?: string;
}