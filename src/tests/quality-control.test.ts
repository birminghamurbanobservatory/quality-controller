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
    
    expect.assertions(14);

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

  });


  test('Real-world meteorology example', async () => {
    // On an early iteration of this microservice obervations were being wrongly flagged when the setup was a below.
    
    expect.assertions(1);

    const checksClient = [
      {
        checkType: 'above-range',
        appliesTo: {
          observedProperty: 'relative-humidity',
          unit: 'percent'
        },
        config: {
          maxValue: 100
        }
      },
      {
        checkType: 'below-range',
        appliesTo: {
          observedProperty: 'relative-humidity',
          unit: 'percent'
        },
        config: {
          minValue: 0
        }
      },
      {
        checkType: 'persistence',
        appliesTo: {
          observedProperty: 'air-pressure',
          hasFeatureOfInterest: 'earth-atmosphere',
          disciplinesIncludes: 'meteorology'
        },
        config: {
          nConsecutiveAllowed: 10,
          minSpanInSeconds: 3600
        }
      },
      {
        checkType: 'below-range',
        appliesTo: {
          observedProperty: 'precipitation-rate'
        },
        config: {
          minValue: 0
        }
      },
      {
        checkType: 'below-range',
        appliesTo: {
          observedProperty: 'precipitation-depth'
        },
        config: {
          minValue: 0
        }
      },
      {
        checkType: 'below-range',
        appliesTo: {
          observedProperty: 'relative-humidity',
          unit: 'percent',
          hasFeatureOfInterest: 'earth-atmosphere',
          disciplinesIncludes: 'meteorology'
        },
        config: {
          minValue: 1
        }
      },
      {
        checkType: 'persistence',
        appliesTo: {
          observedProperty: 'air-temperature',
          hasFeatureOfInterest: 'earth-atmosphere',
          disciplinesIncludes: 'meteorology'
        },
        config: {
          nConsecutiveAllowed: 10,
          minSpanInSeconds: 3600
        }
      },
      {
        checkType: 'below-range',
        appliesTo: {
          observedProperty: 'air-temperature',
          unit: 'degree-celsius'
        },
        config: {
          minValue: -273.15
        }
      }
    ];

    // Create these checks
    const checks = await Promise.map(checksClient, async (checkClient) => {
      const check = await createCheck(checkClient);
      return check;
    });

    // This is an obs that was flagged when there was a bug in the code when it should not have been.
    const obs1Before = {
      id: 'o6een4vLDtmmFAQ',
      timeseriesId: 'JZZ',
      resultTime: '2020-08-03T22:49:13.000Z',
      hasResult: {
        value: 325,
        unit: 'degree'
      },
      madeBySensor: 'netatmo-06-00-00-03-e2-f4-wind',
      observedProperty: 'wind-direction',
      aggregation: 'average',
      hasFeatureOfInterest: 'earth-atmosphere',
      hasDeployment: 'netatmo-gatekeepers',
      hostedByPath: [
        'b38-garden',
        'netatmo-06-00-00-03-e2-f4-wind-module-r0m'
      ],
      location: {
        id: '78b9aa16-b58e-4476-b854-5956afae5d59',
        geometry: {
          type: 'Point',
          coordinates: [
            -1.9001989,
            52.382618
          ]
        },
        validAt: '2020-07-13T14:04:24.623Z'
      },
      disciplines: [
        'meteorology'
      ],
      phenomenonTime: {
        hasBeginning: '2020-08-03T22:44:12.000Z',
        hasEnd: '2020-08-03T22:49:13.000Z',
        duration: 301
      },
      usedProcedures: [
        'netatmo-wind-direction-5-min-average'
      ]
    };

    const obs1After = await qualityControlObservation(obs1Before);

    // Obs should be exactly the same after
    expect(obs1After).toEqual(obs1Before);


  });


});