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
import {paginationOptionsToMongoFindOptions} from '../../utils/pagination-options-to-mongo-find-options';
import {whereToMongoFind} from '../../utils/where-to-mongo-find';
import {renameProperties} from '../../utils/rename';
import {GetChecksFail} from './errors/GetChecksFail';
import * as logger from 'node-logger';
import {ConfirmCheckDoesNotAlreadyExistFail} from './errors/ConfirmCheckDoesNotAlreadyExistFail';
import {CheckAlreadyExists} from './errors/CheckAlreadyExists';


export const validCheckTypes = ['below-range', 'above-range', 'persistence'];

const appliesToProps = [
  'madeBySensor',
  'observedProperty',
  'unit',
  'hasFeatureOfInterest',
  'hasDeployment',
  'aggregation',
  'disciplines',
  'disciplinesIncludes',
  'hostedByPath',
  'hostedByPathIncludes',
  'usedProcedures',
  'usedProceduresIncludes'
];


export async function findChecksForObservation(observation: ObservationClient): Promise<CheckApp[]> {

  // The challenge here is to find all the checks whose appliesTo exactly matches properties of the observation whilst not excluding other checks that have a different subset of matching propeties. The solution is to make heavy use of the $or operator.
  const where = observationToFindChecksWhere(observation);
  logger.debug(`where object to find checks for observation ${observation.id}`, where);

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
        {'appliesTo.madeBySensor': observation.madeBySensor},
        {'appliesTo.madeBySensor': {$exists: false}}
      ]
    };
  } else {
    madeBySensorObj = {'appliesTo.madeBySensor': {$exists: false}};
  }
  andArray.push(madeBySensorObj);

  // observedProperty
  let observedPropertyObj;
  if (ck.nonEmptyString(observation.observedProperty)) {
    observedPropertyObj = {
      $or: [
        {'appliesTo.observedProperty': observation.observedProperty},
        {'appliesTo.observedProperty': {$exists: false}}
      ]
    };
  } else {
    observedPropertyObj = {'appliesTo.observedProperty': {$exists: false}};
  }
  andArray.push(observedPropertyObj);

  // unit
  let unitObj;
  if (ck.nonEmptyString(observation.hasResult.unit)) {
    unitObj = {
      $or: [
        {'appliesTo.unit': observation.hasResult.unit},
        {'appliesTo.unit': {$exists: false}}
      ]
    };
  } else {
    unitObj = {'appliesTo.unit': {$exists: false}};
  }
  andArray.push(unitObj);

  // aggregation
  let aggregationObj;
  if (ck.nonEmptyString(observation.aggregation)) {
    aggregationObj = {
      $or: [
        {'appliesTo.aggregation': observation.aggregation},
        {'appliesTo.aggregation': {$exists: false}}
      ]
    };
  } else {
    aggregationObj = {'appliesTo.aggregation': {$exists: false}};
  }
  andArray.push(aggregationObj);

  // featureOfInterest
  let hasFeatureOfInterestObj;
  if (ck.nonEmptyString(observation.hasFeatureOfInterest)) {
    hasFeatureOfInterestObj = {
      $or: [
        {'appliesTo.hasFeatureOfInterest': observation.hasFeatureOfInterest},
        {'appliesTo.hasFeatureOfInterest': {$exists: false}}
      ]
    };
  } else {
    hasFeatureOfInterestObj = {'appliesTo.hasFeatureOfInterest': {$exists: false}};
  }
  andArray.push(hasFeatureOfInterestObj);

  // hasDeployment
  let hasDeploymentObj;
  if (ck.nonEmptyString(observation.hasDeployment)) {
    hasDeploymentObj = {
      $or: [
        {'appliesTo.hasDeployment': observation.hasDeployment},
        {'appliesTo.hasDeployment': {$exists: false}}
      ]
    };
  } else {
    hasDeploymentObj = {'appliesTo.hasDeployment': {$exists: false}};
  }
  andArray.push(hasDeploymentObj);

  // hostedByPath
  let hostedByPathObj;
  if (ck.nonEmptyArray(observation.hostedByPath)) {
    hostedByPathObj = {
      $or: [
        {'appliesTo.hostedByPath': observation.hostedByPath},
        {'appliesTo.hostedByPath': {$exists: false}}
      ]
    };
  } else {
    hostedByPathObj = {'appliesTo.hostedByPath': {$exists: false}};
  }
  andArray.push(hostedByPathObj);

  // hostedByPathIncludes
  let hostedByPathIncludesObj;
  if (ck.nonEmptyArray(observation.hostedByPath)) {
    hostedByPathIncludesObj = {
      $or: [
        {'appliesTo.hostedByPathIncludes': {$exists: false}}
      ]
    };
    observation.hostedByPath.forEach((platform) => {
      hostedByPathIncludesObj.$or.push({'appliesTo.hostedByPathIncludes': platform});
    });
  } else {
    hostedByPathIncludesObj = {'appliesTo.hostedByPathIncludes': {$exists: false}};
  }
  andArray.push(hostedByPathIncludesObj);

  // disciplines
  let disciplinesObj;
  if (ck.nonEmptyArray(observation.disciplines)) {
    disciplinesObj = {
      $or: [
        // disciplines array will be sorted before creating a new check, thus important we sort here too to ensure match.
        {'appliesTo.disciplines': sortBy(observation.disciplines)},
        {'appliesTo.disciplines': {$exists: false}}
      ]
    };
  } else {
    disciplinesObj = {'appliesTo.disciplines': {$exists: false}};
  }
  andArray.push(disciplinesObj);

  // disciplinesIncludes
  let disciplinesIncludesObj;
  if (ck.nonEmptyArray(observation.disciplines)) {
    disciplinesIncludesObj = {
      $or: [
        {'appliesTo.disciplinesIncludes': {$exists: false}}
      ]
    };
    observation.disciplines.forEach((platform) => {
      disciplinesIncludesObj.$or.push({'appliesTo.disciplinesIncludes': platform});
    });
  } else {
    disciplinesIncludesObj = {'appliesTo.disciplinesIncludes': {$exists: false}};
  }
  andArray.push(disciplinesIncludesObj);

  // usedProcedures
  let usedProceduresObj;
  if (ck.nonEmptyArray(observation.usedProcedures)) {
    usedProceduresObj = {
      $or: [
        {'appliesTo.usedProcedures': observation.usedProcedures},
        {'appliesTo.usedProcedures': {$exists: false}}
      ]
    };
  } else {
    usedProceduresObj = {'appliesTo.usedProcedures': {$exists: false}};
  }
  andArray.push(usedProceduresObj);

  // usedProceduresIncludes
  let usedProceduresIncludesObj;
  if (ck.nonEmptyArray(observation.usedProcedures)) {
    usedProceduresIncludesObj = {
      $or: [
        {'appliesTo.usedProceduresIncludes': {$exists: false}}
      ]
    };
    observation.usedProcedures.forEach((platform) => {
      usedProceduresIncludesObj.$or.push({'appliesTo.usedProceduresIncludes': platform});
    });
  } else {
    usedProceduresIncludesObj = {'appliesTo.usedProceduresIncludes': {$exists: false}};
  }
  andArray.push(usedProceduresIncludesObj);


  const where = {
    $and: andArray
  };

  return where;

}


export async function createCheck(check: CheckApp): Promise<CheckApp> {

  await confirmCheckDoesNotAlreadyExist(check);

  const checkToCreate = checkAppToDb(check);
  
  let createdCheck;
  try {
    createdCheck = await Check.create(checkToCreate);
  } catch (err) {
    throw new CreateCheckFail(undefined, err.message);
  }

  return checkDbToApp(createdCheck);

}


export async function confirmCheckDoesNotAlreadyExist(check: CheckApp): Promise<void> {

  const where = {
    checkType: check.checkType
  };
  // Crucially here we need to specify that appliesTo properties not included in the check must not exist.
  appliesToProps.forEach((key) => {
    if (ck.assigned(check.appliesTo[key])) {
      where[`appliesTo.${key}`] = check.appliesTo[key];
    } else {
      where[`appliesTo.${key}`] = {$exists: false};
    }
  });

  if (check.config.nConsecutiveAllowed === 11) {
    throw new CheckAlreadyExists('Whoops');
  }

  let found;
  try {
    found = await Check.findOne(where).exec();
  } catch (err) {
    throw new ConfirmCheckDoesNotAlreadyExistFail(undefined, err.message);
  }

  if (found) {
    throw new CheckAlreadyExists(`A '${check.checkType}' check with the same appliesTo properties already exists.`);
  } else {
    return;
  }

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




export async function getChecks(where: any = {}, options: any = {}): Promise<{data: CheckApp[], count: number; total: number}> {

  // sort the disciplines alpabetically before querying
  if (where.disciplines) {
    where.disciplines = sortBy(where.disciplines);
  }

  const mappings = {};  
  appliesToProps.forEach((key) => {
    mappings[key] = `appliesTo.${key}`;
  });

  // Will need prefix most of the where properties with "appliesTo."
  const whereRenamed = renameProperties(cloneDeep(where), mappings);
  if (whereRenamed.or) {
    whereRenamed.or = whereRenamed.or.map((item) => renameProperties(item, mappings));
  }
  
  const findWhere = whereToMongoFind(whereRenamed);

  const findOptions = paginationOptionsToMongoFindOptions(options);
  const limitAssigned = ck.assigned(options.limit);

  let found;
  try {
    found = await Check.find(findWhere, null, findOptions).exec();
  } catch (err) {
    throw new GetChecksFail(undefined, err.message);
  }

  const count = found.length;
  let total;

  if (limitAssigned) {
    if (count < findOptions.limit && findOptions.skip === 0) {
      total = count;
    } else {
      total = await Check.countDocuments(findWhere);
    }
  } else {
    total = count;
  }

  const forApp = found.map(checkDbToApp);

  return {
    data: forApp,
    count,
    total
  };

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
  if (checkDb.appliesTo.disciplines) {
    checkDb.appliesTo.disciplines = sortBy(checkDb.appliesTo.disciplines);
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