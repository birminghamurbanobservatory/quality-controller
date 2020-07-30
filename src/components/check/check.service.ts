import Check from './check.model';
import {CheckApp} from './check-app.interface';
import {ObservationClient} from '../quality-control/observation/observation-client.interface';
import {FindChecksForObservationFail} from './errors/FindChecksForObservationFail';
import * as ck from 'check-types';
import {sortBy, cloneDeep} from 'lodash';
import {CreateCheckFail} from './errors/CreateCheckFail';
import {CheckClient} from './check-client.interface';
import {CheckNotFound} from './errors/CheckNotFound';
import {DeleteCheckFail} from './errors/DeleteCheckFail';
import {GetCheckFail} from './errors/GetCheckFail';


export const validCheckTypes = ['below-range', 'above-range', 'persistence'];


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
  if (ck.nonEmptyString(observation.madeBySensor)) {
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
  if (ck.nonEmptyString(observation.observedProperty)) {
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
  if (ck.nonEmptyString(observation.hasResult.unit)) {
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
  if (ck.nonEmptyString(observation.aggregation)) {
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
  if (ck.nonEmptyString(observation.hasFeatureOfInterest)) {
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
  if (ck.nonEmptyString(observation.hasDeployment)) {
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
  if (ck.nonEmptyArray(observation.hostedByPath)) {
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
  if (ck.nonEmptyArray(observation.hostedByPath)) {
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
  if (ck.nonEmptyArray(observation.disciplines)) {
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
  if (ck.nonEmptyArray(observation.disciplines)) {
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
  if (ck.nonEmptyArray(observation.usedProcedures)) {
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
  if (ck.nonEmptyArray(observation.usedProcedures)) {
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



export async function getCheck(id: string): Promise<CheckApp> {

  let check;
  try {
    check = await Check.findById(id).exec();
  } catch (err) {
    throw new GetCheckFail(`Failed to get check with id '${id}'`, err.message);
  }

  if (!check) {
    throw new CheckNotFound(`A check with id '${id}' could not be found`);
  }

  return checkDbToApp(check);

}







export async function deleteCheck(id: string): Promise<CheckApp> {

  let deletedCheck;
  try {
    deletedCheck = await Check.findByIdAndDelete(id).exec();
  } catch (err) {
    throw new DeleteCheckFail(`Failed to delete check with id '${id}'`, err.message);
  }

  if (!deletedCheck) {
    throw new CheckNotFound(`A check with id '${id}' could not be found`);
  }

  return checkDbToApp(deletedCheck);

}



export function checkClientToApp(checkClient: CheckClient): CheckApp {
  const checkApp: any = cloneDeep(checkClient);
  return checkApp;
}


export function checkAppToClient(checkApp: CheckApp): CheckClient {
  const checkClient: any = cloneDeep(checkApp);
  checkClient.createdAt = checkClient.updatedAt.toISOString();
  checkClient.updatedAt = checkClient.updatedAt.toISOString();
  return checkClient;
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