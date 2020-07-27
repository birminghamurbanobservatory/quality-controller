import Check from './check.model';
import {CheckApp} from './check-app.interface';
import {ObservationClient} from '../quality-control/observation/observation-client.interface';
import {FindChecksForObservationFail} from './errors/FindChecksForObservationFail';
import * as checkTypes from 'check-types';
import {sortBy, cloneDeep} from 'lodash';
import {CreateCheckFail} from './errors/CreateCheckFail';


export async function findChecksForObservation(observation: ObservationClient): Promise<CheckApp[]> {

  // The challenge here is to find all the checks whose appliesTo exactly matches properties of the observation whilst not excluding other checks that have a different subset of matching propeties. The solution is to make heavy use of the $or operator.
  const where = observationToFindChecksWhere(observation);

  let checks;

  try {
    checks = Check.find(where).exec();
  } catch (err) {
    throw new FindChecksForObservationFail(`Failed to find checks for observation ${observation.id}`, err.message);
  }

  return checks.map(checkDbToApp);

}


export function observationToFindChecksWhere(observation: ObservationClient): any {

  const andArray = [];

  // madeBySensor
  let madeBySensorObj;
  if (checkTypes.nonEmptyString(observation.madeBySensor)) {
    madeBySensorObj = {
      $or: [
        {madeBySensor: observation.madeBySensor},
        {madeBySensor: {$exists: false}}
      ]
    };
  } else {
    madeBySensorObj = {madeBySensor: {$exists: false}};
  }
  andArray.push(madeBySensorObj);

  // observedProperty
  let observedPropertyObj;
  if (checkTypes.nonEmptyString(observation.observedProperty)) {
    observedPropertyObj = {
      $or: [
        {observedProperty: observation.observedProperty},
        {observedProperty: {$exists: false}}
      ]
    };
  } else {
    observedPropertyObj = {observedProperty: {$exists: false}};
  }
  andArray.push(observedPropertyObj);

  // unit
  let unitObj;
  if (checkTypes.nonEmptyString(observation.hasResult.unit)) {
    unitObj = {
      $or: [
        {unit: observation.hasResult.unit},
        {unit: {$exists: false}}
      ]
    };
  } else {
    unitObj = {unit: {$exists: false}};
  }
  andArray.push(unitObj);

  // aggregation
  let aggregationObj;
  if (checkTypes.nonEmptyString(observation.aggregation)) {
    aggregationObj = {
      $or: [
        {aggregation: observation.aggregation},
        {aggregation: {$exists: false}}
      ]
    };
  } else {
    aggregationObj = {aggregation: {$exists: false}};
  }
  andArray.push(aggregationObj);

  // featureOfInterest
  let hasFeatureOfInterestObj;
  if (checkTypes.nonEmptyString(observation.hasFeatureOfInterest)) {
    hasFeatureOfInterestObj = {
      $or: [
        {hasFeatureOfInterest: observation.hasFeatureOfInterest},
        {hasFeatureOfInterest: {$exists: false}}
      ]
    };
  } else {
    hasFeatureOfInterestObj = {hasFeatureOfInterest: {$exists: false}};
  }
  andArray.push(hasFeatureOfInterestObj);

  // hasDeployment
  let hasDeploymentObj;
  if (checkTypes.nonEmptyString(observation.hasDeployment)) {
    hasDeploymentObj = {
      $or: [
        {hasDeployment: observation.hasDeployment},
        {hasDeployment: {$exists: false}}
      ]
    };
  } else {
    hasDeploymentObj = {hasDeployment: {$exists: false}};
  }
  andArray.push(hasDeploymentObj);

  // hostedByPath
  let hostedByPathObj;
  if (checkTypes.nonEmptyArray(observation.hostedByPath)) {
    hostedByPathObj = {
      $or: [
        {hostedByPath: observation.hostedByPath},
        {hostedByPath: {$exists: false}}
      ]
    };
  } else {
    hostedByPathObj = {hostedByPath: {$exists: false}};
  }
  andArray.push(hostedByPathObj);

  // hostedByPathIncludes
  let hostedByPathIncludesObj;
  if (checkTypes.nonEmptyArray(observation.hostedByPath)) {
    hostedByPathIncludesObj = {
      $or: [
        {hostedByPathIncludes: {$exists: false}}
      ]
    };
    observation.hostedByPath.forEach((platform) => {
      hostedByPathIncludesObj.$or.push({hostedByPathIncludes: platform});
    });
  } else {
    hostedByPathIncludesObj = {hostedByPathIncludes: {$exists: false}};
  }
  andArray.push(hostedByPathIncludesObj);

  // disciplines
  let disciplinesObj;
  if (checkTypes.nonEmptyArray(observation.disciplines)) {
    disciplinesObj = {
      $or: [
        // disciplines array will be sorted before creating a new check, thus important we sort here too to ensure match.
        {disciplines: sortBy(observation.disciplines)},
        {disciplines: {$exists: false}}
      ]
    };
  } else {
    disciplinesObj = {disciplines: {$exists: false}};
  }
  andArray.push(disciplinesObj);

  // disciplinesIncludes
  let disciplinesIncludesObj;
  if (checkTypes.nonEmptyArray(observation.disciplines)) {
    disciplinesIncludesObj = {
      $or: [
        {disciplinesIncludes: {$exists: false}}
      ]
    };
    observation.disciplines.forEach((platform) => {
      disciplinesIncludesObj.$or.push({disciplinesIncludes: platform});
    });
  } else {
    disciplinesIncludesObj = {disciplinesIncludes: {$exists: false}};
  }
  andArray.push(disciplinesIncludesObj);

  // usedProcedures
  let usedProceduresObj;
  if (checkTypes.nonEmptyArray(observation.usedProcedures)) {
    usedProceduresObj = {
      $or: [
        {usedProcedures: observation.usedProcedures},
        {usedProcedures: {$exists: false}}
      ]
    };
  } else {
    usedProceduresObj = {usedProcedures: {$exists: false}};
  }
  andArray.push(usedProceduresObj);

  // usedProceduresIncludes
  let usedProceduresIncludesObj;
  if (checkTypes.nonEmptyArray(observation.usedProcedures)) {
    usedProceduresIncludesObj = {
      $or: [
        {usedProceduresIncludes: {$exists: false}}
      ]
    };
    observation.usedProcedures.forEach((platform) => {
      usedProceduresIncludesObj.$or.push({usedProceduresIncludes: platform});
    });
  } else {
    usedProceduresIncludesObj = {usedProceduresIncludes: {$exists: false}};
  }
  andArray.push(usedProceduresIncludesObj);


  const where = {
    $and: andArray
  };

  return where;

}


export async function createCheck(check: CheckApp): Promise<CheckApp> {

  const checkToCreate = checkAppToDb(check);
  
  let createdCheck;
  try {
    createdCheck = await Check.create(checkToCreate);
  } catch (err) {
    throw new CreateCheckFail(undefined, err.message);
  }

  return checkDbToApp(createdCheck);

}



function checkAppToDb(checkApp: any): any {
  const checkDb = cloneDeep(checkApp);
  // Sort disciplines alphabetically
  if (checkDb.disciplines) {
    checkDb.disciplines = sortBy(checkDb.disciplines);
  }
  return checkDb;
}


function checkDbToApp(checkDb: any): CheckApp {
  const checkApp = checkDb.toObject();
  checkApp.id = checkApp._id.toString();
  delete checkApp._id;
  delete checkApp.__v;
  return checkApp;
}