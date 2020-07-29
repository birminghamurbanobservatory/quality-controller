import {config} from '../config';
import * as logger from 'node-logger';
import {connectDb, disconnectDb} from '../db/mongodb-service';
import * as MongodbMemoryServer from 'mongodb-memory-server';
import {createCheck, deleteCheck} from '../components/check/check.controller';
import * as ck from 'check-types';
import {qualityControlObservation} from '../components/quality-control/quality-control.controller';
import {cloneDeep} from 'lodash';
import {countTimeseries, getTimeseries} from '../components/timeseries/timeseries.service';
import {add} from 'date-fns';
import * as Promise from 'bluebird';

describe('Tests of full quality control process', () => {

  let mongoServer;

  beforeAll(() => {
    // Configure the logger
    logger.configure(config.logger);
  });

  beforeEach(() => {
    // Create fresh database
    mongoServer = new MongodbMemoryServer.MongoMemoryServer();
    return mongoServer.getConnectionString()
    .then((url) => {
      return connectDb(url);
    });
  });

  afterEach(() => {
    // Disconnect from, then stop, database.
    return disconnectDb()
    .then(() => {
      mongoServer.stop();
      return;
    });
  });


  test('Example with a below-range check', async () => {
    
    expect.assertions(7);

    const checkClient = {
      checkType: 'below-range',
      appliesTo: {
        observedProperty: 'air-temperature',
        unit: 'degree-celsius',
      },
      config: {
        minValue: -273.15
      }
    };

    const check = await createCheck(checkClient);

    expect(check).toMatchObject(checkClient);
    expect(ck.nonEmptyString(check.id)).toBe(true);
    expect(ck.nonEmptyString(check.createdAt)).toBe(true);
    expect(ck.nonEmptyString(check.updatedAt)).toBe(true);

    const goodObsBefore = {
      id: 'obsID123',
      timeseriesId: 'aBc',
      resultTime: '2020-05-05T12:32:00.124Z',
      madeBySensor: 'sensor-1',
      hasResult: {
        value: 12.2,
        unit: 'degree-celsius'
      },
      observedProperty: 'air-temperature',
      aggregation: 'instant'
    };

    const goodObsAfter = await qualityControlObservation(goodObsBefore);

    // Obs should be exactly the same after
    expect(goodObsAfter).toEqual(goodObsBefore);

    const badObsBefore = {
      id: 'obsID456',
      timeseriesId: 'dEf',
      resultTime: '2020-05-05T12:32:00.124Z',
      madeBySensor: 'sensor-1',
      hasResult: {
        value: -999.9,
        unit: 'degree-celsius'
      },
      observedProperty: 'air-temperature',
      aggregation: 'instant'
    };

    const badObsAfter = await qualityControlObservation(badObsBefore);

    // Should now have a flag
    const expectedBadObsAfter: any = cloneDeep(badObsBefore);
    expectedBadObsAfter.hasResult.flags = ['below-range'];
    expect(badObsAfter).toEqual(expectedBadObsAfter);

    // No timeseries should have been created in this process.
    const timeseriesCount = await countTimeseries();
    expect(timeseriesCount).toBe(0);

  });



  test('Example with a persistence check', async () => {
    
    expect.assertions(16);

    const initialObservationBefore = {
      id: 'obsID123',
      timeseriesId: 'aBc',
      resultTime: '2020-05-05T12:30:00.000Z',
      madeBySensor: 'sensor-1',
      hasResult: {
        value: 12.2,
        unit: 'degree-celsius'
      },
      observedProperty: 'air-temperature',
      aggregation: 'instant'
    };

    const initialObservationAfter = await qualityControlObservation(initialObservationBefore);

    expect(initialObservationAfter).toEqual(initialObservationBefore);

    // No timeseries should have been created by this point, because no check created yet.
    const timeseriesCountBeforeCheckAdded = await countTimeseries();
    expect(timeseriesCountBeforeCheckAdded).toBe(0);

    // Now to create the check
    const checkClient = {
      checkType: 'persistence',
      appliesTo: {
        observedProperty: 'air-temperature',
        unit: 'degree-celsius',
      },
      config: {
        nConsecutiveAllowed: 5,
        minSpanInSeconds: 3600
      }
    };

    const check = await createCheck(checkClient);

    expect(check).toMatchObject(checkClient);
    expect(ck.nonEmptyString(check.id)).toBe(true);
    expect(ck.nonEmptyString(check.createdAt)).toBe(true);
    expect(ck.nonEmptyString(check.updatedAt)).toBe(true);

    const sequentialObservationsBefore = [];
    const nObs = 8;
    const intervalInMinutes = 15;
    let rollingResultTime = new Date(initialObservationBefore.resultTime);
    for (let idx = 0; idx < nObs; idx++) {
      const obs = cloneDeep(initialObservationBefore);
      rollingResultTime = add(rollingResultTime, {minutes: intervalInMinutes});
      obs.resultTime = rollingResultTime.toISOString();
      sequentialObservationsBefore.push(obs);
    }

    const sequentialObservationsAfter = await Promise.mapSeries(sequentialObservationsBefore, async (obsBefore) => {
      const obsAfter =  await qualityControlObservation(obsBefore);
      return obsAfter;
    });

    expect(ck.assigned(sequentialObservationsAfter[0].hasResult.flags)).toBe(false);
    expect(ck.assigned(sequentialObservationsAfter[checkClient.config.nConsecutiveAllowed - 1].hasResult.flags)).toBe(false);
    expect(sequentialObservationsAfter[checkClient.config.nConsecutiveAllowed].hasResult.flags).toEqual(['persistence']);
    expect(sequentialObservationsAfter[nObs - 1].hasResult.flags).toEqual(['persistence']);

    const timeseriesCountAfterObsProcessed = await countTimeseries();
    expect(timeseriesCountAfterObsProcessed).toBe(1);

    const timeseriesAfterSequential = await getTimeseries(initialObservationBefore.timeseriesId);
    expect(timeseriesAfterSequential).toMatchObject({
      timeseriesId: initialObservationBefore.timeseriesId,
      lastObsTime: new Date(sequentialObservationsBefore[nObs - 1].resultTime),
      persistence: {
        lastValue: initialObservationBefore.hasResult.value,
        nConsecutive: nObs,
        firstSeen: new Date(sequentialObservationsBefore[0].resultTime)
      }
    });

    // Check the timeseries resets ok when an obs when a non-persistent value comes in.
    const goodObsBefore = cloneDeep(sequentialObservationsBefore[nObs - 1]);
    goodObsBefore.resultTime = add(new Date(goodObsBefore.resultTime), {minutes: intervalInMinutes}).toISOString();
    goodObsBefore.hasResult.value = 13.1;

    const goodObsAfter = await qualityControlObservation(goodObsBefore);
    expect(goodObsAfter).toEqual(goodObsBefore);

    const timeseriesAfterGood = await getTimeseries(goodObsBefore.timeseriesId);
    expect(timeseriesAfterGood).toMatchObject({
      timeseriesId: goodObsBefore.timeseriesId,
      lastObsTime: new Date(goodObsBefore.resultTime),
      persistence: {
        lastValue: goodObsBefore.hasResult.value,
        nConsecutive: 1,
        firstSeen: new Date(goodObsBefore.resultTime)
      }
    });

    // Check a timeseries is deleted if there's no longer any tests that require it.
    await deleteCheck(check.id);

    // The timeseries won't be deleted until we quality control another observation 
    const noChecksObsBefore = cloneDeep(goodObsBefore);
    noChecksObsBefore.resultTime = add(new Date(noChecksObsBefore.resultTime), {minutes: intervalInMinutes}).toISOString();
    const noChecksObsAfter = await qualityControlObservation(noChecksObsBefore);
    expect(noChecksObsAfter).toEqual(noChecksObsBefore);

    const timeseriesCountAfterCheckDeleted = await countTimeseries();
    expect(timeseriesCountAfterCheckDeleted).toBe(0);

  });



});