export interface CheckClient {
  id?: string;
  checkType: string;
  appliesTo: AppliesTo;
  config: any;
  createdAt?: string;
  updatedAt?: string;
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