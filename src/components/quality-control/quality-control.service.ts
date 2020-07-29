import {CheckApp} from '../check/check-app.interface';
import {ObservationClient} from './observation/observation-client.interface';
import {TimeseriesApp} from '../timeseries/timeseries-app.interface';
import {cloneDeep, isEqual} from 'lodash';
import * as logger from 'node-logger';
import * as ck from 'check-types';


export function applyChecksToObservation(checks: CheckApp[], observation: ObservationClient, timeseries?: TimeseriesApp): ObservationClient {

  const checkFuncs: any = {};
  checkFuncs.persistence = applyPersistenceCheckToObservation;
  checkFuncs['below-range'] = applyBelowRangeCheckToObservation;
  checkFuncs['above-range'] = applyAboveRangeCheckToObservation;

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

  // N.B. the timeseries hasn't been updated by this new observation yet, so we'll need to perform an equality check to make sure the same value still persists.
  if (timeseries && timeseries.persistence && isEqual(observation.hasResult.value, timeseries.persistence.lastValue)) {
    // Because the tally doesn't include this observation yet we'll want to use >= rather than >.
    const thresholdExceeded = timeseries.persistence.nConsecutive >= check.config.nConsecutiveAllowed;
    let timespanExceeded = true;
    if (ck.assigned(check.config.minSpanInSeconds)) {
      const timespan = (new Date(observation.resultTime).getTime() - timeseries.persistence.firstSeen.getTime()) / 1000; // in seconds
      timespanExceeded = timespan > check.config.minSpanInSeconds;
    }
    if (thresholdExceeded && timespanExceeded) {
      updatedObservation = addFlagToObservation(updatedObservation, 'persistence');
    }
  }

  return updatedObservation;

}


//------------------------
// below range
//------------------------
export function applyBelowRangeCheckToObservation(check: CheckApp, observation: ObservationClient): ObservationClient {

  let updatedObservation = cloneDeep(observation);

  if (ck.number(observation.hasResult.value)) {
    if (observation.hasResult.value < check.config.minValue) {
      updatedObservation = addFlagToObservation(updatedObservation, 'below-range');
    }
  } else {
    logger.warn('Trying to run a below-range check on a observation with a non-numeric value', observation);
  }

  return updatedObservation;

}


//------------------------
// above-range
//------------------------
export function applyAboveRangeCheckToObservation(check: CheckApp, observation: ObservationClient): ObservationClient {

  let updatedObservation = cloneDeep(observation);

  if (ck.number(observation.hasResult.value)) {
    if (observation.hasResult.value > check.config.maxValue) {
      updatedObservation = addFlagToObservation(updatedObservation, 'above-range');
    }
  } else {
    logger.warn('Trying to run an above-range check on an observation with a non-numeric value', observation);
  }

  return updatedObservation;

}