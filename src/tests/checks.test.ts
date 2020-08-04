import {config} from '../config';
import * as logger from 'node-logger';
import {connectDb, disconnectDb} from '../db/mongodb-service';
import * as MongodbMemoryServer from 'mongodb-memory-server';
import * as ck from 'check-types';
import {createCheck, getChecks} from '../components/check/check.controller';
import {findChecksForObservation, checkAppToClient} from '../components/check/check.service';
import {CheckAlreadyExists} from '../components/check/errors/CheckAlreadyExists';



describe('Testing various things related to quality control checks', () => {

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


  test('Creating and querying checks', async () => {
    
    expect.assertions(12);

    const check1Client = {
      checkType: 'persistence',
      appliesTo: {
        observedProperty: 'air-temperature',
        hasFeatureOfInterest: 'earth-atmosphere',
        disciplinesIncludes: 'meteorology'
      },
      config: {
        nConsecutiveAllowed: 5
      }
    };

    const check2Client = {
      checkType: 'below-range',
      appliesTo: {
        observedProperty: 'relative-humidity',
        unit: 'percent',
        disciplinesIncludes: 'meteorology'
      },
      config: {
        minValue: 10
      }
    };

    const check3Client = {
      checkType: 'above-range',
      appliesTo: {
        observedProperty: 'air-temperature',
        hasFeatureOfInterest: 'earth-atmosphere',
        disciplinesIncludes: 'meteorology',
        hasDeployment: 'birmingham-weather-stations'
      },
      config: {
        maxValue: 45
      }
    };

    const check4Client = {
      checkType: 'above-range',
      appliesTo: {
        observedProperty: 'ozone-mass-concentration',
        hasFeatureOfInterest: 'earth-atmosphere',
        disciplinesIncludes: 'atmospheric-chemistry',
        hasDeployment: 'birmingham-air-quality'
      },
      config: {
        maxValue: 45
      }
    };

    const check1 = await createCheck(check1Client);
    const check2 = await createCheck(check2Client);
    const check3 = await createCheck(check3Client);
    const check4 = await createCheck(check4Client);

    expect(check1).toMatchObject(check1Client);
    expect(ck.nonEmptyString(check1.id)).toBe(true);
    expect(ck.nonEmptyString(check1.updatedAt)).toBe(true);
    expect(ck.nonEmptyString(check1.createdAt)).toBe(true);

    // Ask for all checks
    const {data: allChecks, meta: allChecksMeta} = await getChecks();
    expect(allChecks.length).toBe(4);
    expect(allChecksMeta).toEqual({
      count: 4,
      total: 4
    });

    // Check pagination works
    const {data: pagedChecks, meta: pagedChecksMeta} = await getChecks({}, {limit: 2});
    expect(pagedChecks.length).toBe(2);
    expect(pagedChecksMeta).toEqual({
      count: 2,
      total: 4
    });

    // query by appliesTo properties
    const {data: tempMetChecks, meta: tempMetChecksMeta} = await getChecks({
      observedProperty: 'air-temperature',
      disciplinesIncludes: 'meteorology'
    });
    expect(tempMetChecks.length).toBe(2);
    expect(tempMetChecksMeta).toEqual({
      count: 2,
      total: 2
    });


    // Perform a query using the "or" property
    const {data: orChecks, meta: orChecksMeta} = await getChecks({
      or: [
        {hasDeployment: {exists: false}},
        {hasDeployment: {in: ['birmingham-weather-stations']}}
      ]
    });
    expect(orChecks.length).toBe(3);
    expect(orChecksMeta).toEqual({
      count: 3,
      total: 3
    });


  });


  test('Checking findChecksForObservation function works ok', async () => {

    expect.assertions(2);
    
    const check1Client = {
      checkType: 'persistence',
      appliesTo: {
        observedProperty: 'air-temperature',
        hasFeatureOfInterest: 'earth-atmosphere',
        disciplinesIncludes: 'meteorology'
      },
      config: {
        nConsecutiveAllowed: 5
      }
    };

    const check2Client = {
      checkType: 'below-range',
      appliesTo: {
        observedProperty: 'relative-humidity',
        unit: 'percent',
        disciplinesIncludes: 'meteorology'
      },
      config: {
        minValue: 10
      }
    };

    const check1 = await createCheck(check1Client);
    const check2 = await createCheck(check2Client);

    const obs1 = {
      id: 'o6een4vLDtmmFAQ',
      timeseriesId: 'JZZ',
      resultTime: '2020-08-03T22:49:13.000Z',
      hasResult: {
        value: 68,
        unit: 'percent'
      },
      madeBySensor: 'humid-sensor-1',
      observedProperty: 'relative-humidity',
      aggregation: 'instant',
      hasFeatureOfInterest: 'earth-atmosphere',
      hasDeployment: 'weather-stations',
      hostedByPath: [
        'b38-garden',
        'weather-station-2'
      ],
      disciplines: [
        'meteorology'
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
    };

    const matchingChecks = await findChecksForObservation(obs1);
    // Should only match with one of the checks
    expect(matchingChecks.length).toBe(1);
    // Need to convert to client format so that updatedAt and createdAt are strings like they are return when a check is created with the check.controller.
    const matchinChecksClientFormat = matchingChecks.map(checkAppToClient);
    expect(matchinChecksClientFormat).toEqual([check2]);

  });


  test('Should not allow more than one test with the same appliesTo properties', async () => {
    
    expect.assertions(4);

    const check1Client = {
      checkType: 'persistence',
      appliesTo: {
        observedProperty: 'air-temperature',
        hasFeatureOfInterest: 'earth-atmosphere',
        disciplinesIncludes: 'meteorology'
      },
      config: {
        nConsecutiveAllowed: 5
      }
    };

    const check1 = await createCheck(check1Client);
    expect(check1).toMatchObject(check1Client);

    // Although the config is different here, the checkType and appliesTo properties are exactly the same and thus the code should prevent this client form being created
    const check2Client = {
      checkType: 'persistence',
      appliesTo: {
        observedProperty: 'air-temperature',
        hasFeatureOfInterest: 'earth-atmosphere',
        disciplinesIncludes: 'meteorology'
      },
      config: {
        nConsecutiveAllowed: 11
      }
    };

    await expect(createCheck(check2Client)).rejects.toThrowError(CheckAlreadyExists);

    // Although this check has the same appliesTo properties, the checkType is different and thus we do want to allow this to be created. 
    const check3Client = {
      checkType: 'below-range',
      appliesTo: {
        observedProperty: 'air-temperature',
        hasFeatureOfInterest: 'earth-atmosphere',
        disciplinesIncludes: 'meteorology'
      },
      config: {
        minValue: 0
      }
    };

    const check3 = await createCheck(check3Client);
    expect(check3).toMatchObject(check3Client);


    // Likwise if a check as the same checkType and appliesTo properties as an existig check, but it has extra appliesTo properties on top of that then we should also allow it to be created.
    const check4Client = {
      checkType: 'persistence',
      appliesTo: {
        observedProperty: 'air-temperature',
        hasFeatureOfInterest: 'earth-atmosphere',
        disciplinesIncludes: 'meteorology',
        unit: 'degree-celsius' // this is extra
      },
      config: {
        nConsecutiveAllowed: 5
      }
    };

    const check4 = await createCheck(check4Client);
    expect(check4).toMatchObject(check4Client);


  });


});