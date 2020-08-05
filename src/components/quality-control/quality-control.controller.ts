import {ObservationClient} from './observation/observation-client.interface';
import {validateObservation} from './observation/observation-validator';
import {findChecksForObservation} from '../check/check.service';
import {uniq, intersection, isEqual} from 'lodash';
import {getTimeseries, updateTimeseries, createTimeseries, deleteTimeseries} from '../timeseries/timeseries.service';
import {applyChecksToObservation} from './quality-control.service';
import {TimeseriesApp} from '../timeseries/timeseries-app.interface';
import * as logger from 'node-logger';
import * as event from 'event-stream'; 

export async function qualityControlObservation(observation: ObservationClient): Promise<ObservationClient> {
  
  // Validate the observation
  validateObservation(observation);
  
  // Find any checks that match the properties of this observation
  const checks = await findChecksForObservation(observation);

  if (checks.length === 0) {
    // N.B. this means if there's no checks then the timeseries info won't bother being kept up to date.
    // It also means we don't bother deleting timeseries that are no longer useful before there are no matching checks. Although this would be nice to do, the trade-off is that every time an observations comes in we'd have to look to see if its timeseries exists. Decided it wasn't worth LOTS of the extra queries just to delete some absolete timeseries.
    return observation;
  }

  logger.debug(`Found ${checks.length} check(s) to perform on observation ${observation.id}.`, {
    observation,
    checks
  });

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
    await upsertTimeseries(observation, uniqCheckTypes, existingTimeseries);
  }

  // Tell the observations-manager to update its records
  if (!isEqual(observation.hasResult.flags, checkedObservation.hasResult.flags)) {
    try {
      await updateObservation(observation.id, checkedObservation.hasResult.flags);
    } catch (err) {
      if (err) {
        logger.error(`Failed to update observation ${observation.id}`, err);
      }
    }
  }

  // Still makes sense to return the checkedObservation, as the incoming-observation-manager might want to do something with it.
  return checkedObservation;
}


async function updateObservation(observationId: string, newFlags: string[]): Promise<ObservationClient> {

  const updated = await event.publishExpectingResponse('observation.update.request', {
    where: {
      id: observationId
    },
    updates: {
      hasResult: {
        flags: newFlags
      }
    }
  });
  return updated;

}


export async function upsertTimeseries(observation: ObservationClient, checkTypesToSupport: string[], existingTimeseries?: TimeseriesApp): Promise<TimeseriesApp> {

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
    logger.debug(`Timeseries ${upsertedTimeseries.timeseriesId} updated`, upsertedTimeseries);

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
    logger.debug(`New timeseries ${upsertedTimeseries.timeseriesId} created`, upsertedTimeseries);

  }

  return upsertedTimeseries;

}