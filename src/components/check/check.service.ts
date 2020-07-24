import Check from './check.model';
import {CheckApp} from './check-app.interface';
import {ObservationClient} from '../quality-control/observation/observation-client.interface';
import {FindChecksForObservationFail} from './errors/FindChecksForObservationFail';


export async function findChecksForObservation(observation: ObservationClient): Promise<CheckApp> {

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

  const where = {};

  // TODO

  return where;

}



// TODO
// export async function createCheck(check: any): Promise<CheckApp> {

//   // Make sure the disciplines are sorted alphabetically before saving. Leave the hostedByPath and usedProcedures as they are.

// }



function checkDbToApp(checkDb: any): CheckApp {
  const checkApp = checkDb.toObject();
  checkApp.id = checkApp._id.toString();
  delete checkApp._id;
  delete checkApp.__v;
  return checkApp;
}