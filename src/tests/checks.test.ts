import {config} from '../config';
import * as logger from 'node-logger';
import {connectDb, disconnectDb} from '../db/mongodb-service';
import * as MongodbMemoryServer from 'mongodb-memory-server';
import * as ck from 'check-types';
import {createCheck, getChecks} from '../components/check/check.controller';



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
    
    expect.assertions(6);

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

    const check1 = await createCheck(check1Client);
    const check2 = await createCheck(check2Client);
    const check3 = await createCheck(check3Client);

    expect(check1).toMatchObject(check1Client);
    expect(ck.nonEmptyString(check1.id)).toBe(true);
    expect(ck.nonEmptyString(check1.updatedAt)).toBe(true);
    expect(ck.nonEmptyString(check1.createdAt)).toBe(true);

    // Ask for all checks
    const {data: allChecks, meta: allChecksMeta} = await getChecks();
    expect(allChecks.length).toBe(3);
    expect(allChecksMeta).toEqual({
      count: 3,
      total: 3
    });

    // Check pagination works


  });




});