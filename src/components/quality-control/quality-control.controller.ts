import {ObservationClient} from './observation/observation-client.interface';
import {validateObservation} from './observation/observation-validator';
import {findChecksForObservation} from '../check/check.service';
import {uniq, intersection, isEqual} from 'lodash';
import {getTimeseries, updateTimeseries, createTimeseries, deleteTimeseries} from '../timeseries/timeseries.service';
import {applyChecksToObservation} from './quality-control.service';
import {TimeseriesApp} from '../timeseries/timeseries-app.interface';
import * as logger from 'node-logger';


export async function qualityControlObservation(observation: ObservationClient): Promise<ObservationClient> {
  
  // Validate the observation
  validateObservation(observation);
  
  // Find any checks that match the properties of this observation
  const checks = await findChecksForObservation(observation);

  if (checks.length === 0) {
    // N.B. this means if there's no checks then the timeseries info won't bother being kept up to date.
    return observation;
  }

  const uniqCheckTypes = uniq(checks.map((check) => check.checkType));
  const checksThatInvolveTimeseries = ['persistence'];
  const timeseriesIsInvolved = intersection(uniqCheckTypes, checksThatInvolveTimeseries).length > 0;

  let existingTimeseries: TimeseriesApp;
  let checkedObservation;

  if (timeseriesIsInvolved) {

    try {
      existingTimeseries = await getTimeseries(observation.timeseriesId);
    } catch (err) {
      if (err.name !== 'TimeseriesNotFound') {
        throw err;
      }
    }
    
    checkedObservation = applyChecksToObservation(checks, observation, existingTimeseries);

  } else {
    checkedObservation = applyChecksToObservation(checks, observation);
  }

  if (existingTimeseries || timeseriesIsInvolved) {
    await upsertOrDeleteTimeseries(observation, uniqCheckTypes, existingTimeseries);
  }

  return checkedObservation;

}




export async function upsertOrDeleteTimeseries(observation: ObservationClient, checkTypesToSupport: string[], existingTimeseries?: TimeseriesApp): Promise<TimeseriesApp> {

  let upsertedTimeseries;

  //------------------------
  // Update
  //------------------------
  if (existingTimeseries) {

    const observationIsMoreRecent = new Date(observation.resultTime) > existingTimeseries.lastObsTime; 

    const updates: any = {};

    if (observationIsMoreRecent) {

      updates.lastObsTime = new Date(observation.resultTime);

      if (checkTypesToSupport.includes('persistence')) {
        updates.persistence = {
          lastValue: observation.hasResult.value
        };
        if (existingTimeseries.persistence && isEqual(existingTimeseries.persistence.lastValue, observation.hasResult.value)) {
          updates.persistence.nConsecutive = existingTimeseries.persistence.nConsecutive + 1;
          updates.persistence.firstSeen = existingTimeseries.persistence.firstSeen;
        } else {
          updates.persistence.nConsecutive = 1;
          updates.persistence.firstSeen = new Date(observation.resultTime);
        }
      }

    }

    // Add a $unset clause for any information not required because the corresponding check(s) is not listed.
    const fieldsThatCanBeUnset = [];
    if (!checkTypesToSupport.includes('persistence')) {
      fieldsThatCanBeUnset.push('persistence');
    }
    if (fieldsThatCanBeUnset.length > 0) {
      updates.$unset = {};
      fieldsThatCanBeUnset.forEach((field) => {
        updates.$unset[field] = '';
      });
    }

    upsertedTimeseries = await updateTimeseries(observation.timeseriesId, updates);
    logger.debug('Timeseries upserted', upsertedTimeseries);

    // If the timeseries no longer holds any useful information, then we might as well delete it.
    const keysThatMakeTimeseriesUseful = ['persistence'];
    const overlap = intersection(keysThatMakeTimeseriesUseful, Object.keys(upsertedTimeseries));
    if (overlap.length === 0) {
      await deleteTimeseries(observation.timeseriesId);
      logger.debug(`Timeseries ${observation.timeseriesId} deleted because it is no longer required for the checks that need to be performed.`);
      upsertedTimeseries = undefined;
    }

  //------------------------
  // Insert
  //------------------------
  } else {

    const timeseriesToCreate: TimeseriesApp = {
      timeseriesId: observation.timeseriesId,
      lastObsTime: new Date(observation.resultTime)
    };

    if (checkTypesToSupport.includes('persistence')) {
      timeseriesToCreate.persistence = {
        lastValue: observation.hasResult.value,
        nConsecutive: 1,
        firstSeen: new Date(observation.resultTime)
      };
    }

    upsertedTimeseries = await createTimeseries(timeseriesToCreate);
    logger.debug('New timeseries created', upsertedTimeseries);

  }

  return upsertedTimeseries;

}