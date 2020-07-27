import {CheckApp} from '../check/check-app.interface';
import {ObservationClient} from './observation/observation-client.interface';
import {TimeseriesApp} from '../timeseries/timeseries-app.interface';
import {cloneDeep} from 'lodash';
import * as logger from 'node-logger';
import * as checkTypes from 'check-types';


export function applyChecksToObservation(checks: CheckApp[], observation: ObservationClient, timeseries?: TimeseriesApp): ObservationClient {

  const checkFuncs: any = {};
  checkFuncs.persistence = applyPersistenceCheckToObservation;
  checkFuncs['lower-bound'] = applyLowerBoundCheckToObservation;
  checkFuncs['upper-bound'] = applyUpperBoundCheckToObservation;

  const obsCopy = cloneDeep(observation);

  const checkedObservation = checks.reduce((obsSoFar, check) => {
    const updatedObs = checkFuncs[check.checkType](check, obsSoFar, timeseries);
    return updatedObs;
  }, obsCopy);

  return checkedObservation;

}


export function addFlagToObservation(observation: ObservationClient, flag: string): ObservationClient {

  const flaggedObservation = cloneDeep(observation);

  if (!observation.hasResult.flags) {
    flaggedObservation.hasResult.flags = [flag];
  } else {
    if (!observation.hasResult.flags.includes(flag)) {
      flaggedObservation.hasResult.flags.push(flag);
    }
  }

  return flaggedObservation;

}


//------------------------
// persistence
//------------------------
export function applyPersistenceCheckToObservation(check: CheckApp, observation: ObservationClient, timeseries: TimeseriesApp): ObservationClient {

  let updatedObservation = cloneDeep(observation);

  if (timeseries && timeseries.persistence) {
    const thresholdExceeded = timeseries.persistence.nRepeats > check.config.nRepeatsAllowed;
    let timespanExceeded = true;
    if (checkTypes.assigned(check.config.minSpanInSeconds)) {
      const timespan = (new Date(observation.resultTime).getTime() - timeseries.lastObsTime.getTime()) / 1000; // in seconds
      timespanExceeded = timespan > check.config.minSpanInSeconds;
    }
    if (thresholdExceeded && timespanExceeded) {
      updatedObservation = addFlagToObservation(updatedObservation, 'persistence');
    }
  }

  return updatedObservation;

}


//------------------------
// lower-bound
//------------------------
export function applyLowerBoundCheckToObservation(check: CheckApp, observation: ObservationClient): ObservationClient {

  let updatedObservation = cloneDeep(observation);

  if (checkTypes.number(observation.hasResult.value)) {
    if (observation.hasResult.value < check.config.minValue) {
      updatedObservation = addFlagToObservation(updatedObservation, 'lower-bound');
    }
  } else {
    logger.warn('Trying to run a lower-bound check on a observation with a non-numeric value', observation);
  }

  return updatedObservation;

}


//------------------------
// upper-bound
//------------------------
export function applyUpperBoundCheckToObservation(check: CheckApp, observation: ObservationClient): ObservationClient {

  let updatedObservation = cloneDeep(observation);

  if (checkTypes.number(observation.hasResult.value)) {
    if (observation.hasResult.value > check.config.maxValue) {
      updatedObservation = addFlagToObservation(updatedObservation, 'upper-bound');
    }
  } else {
    logger.warn('Trying to run an upper-bound check on an observation with a non-numeric value', observation);
  }

  return updatedObservation;

}