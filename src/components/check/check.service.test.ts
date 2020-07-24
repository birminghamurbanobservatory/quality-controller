import {observationToFindChecksWhere} from './check.service';


describe('Testing of observationToFindChecksWhere function', () => {

  test('Should convert simple observation as expected', () => {

    const observation = {
      id: 'aB1e2',
      timeseriesId: 'eka38Hajn1',
      hasResult: {
        value: 12.2,
        unit: 'degree-celsius'
      },
      madeBySensor: 'sensor-1',
      observedProperty: 'air-temperature',
      aggregation: 'instant',
    };

    const expected = {
      // The order of this array will need to match the processing order of the function.
      $and: [
        {
          $or: [
            {madeBySensor: 'sensor-1'},
            {madeBySensor: {$exists: false}},
          ]
        },
        {
          // These exist clauses for properties that don't exist in the observation are crucial
          hasDeployment: {$exists: false},
        },
        {
          hostedByPath: {$exists: false},
        },
        {
          hostedByPathIncludes: {$exists: false},
        },
        {
          hasFeatureOfInterest: {$exists: false},
        },
        {
          $or: [
            {observedProperty: 'airTemperature'},
            {observedProperty: {$exists: false}},
          ]
        },
        {
          $or: [
            {aggregation: 'instant'},
            {aggregation: {$exists: false}},
          ]
        },
        {
          disciplines: {$exists: false},
        },
        {
          disciplinesIncludes: {$exists: false},
        },
        {
          usedProcedures: {$exists: false}
        },
        {
          usedProceduresIncludes: {$exists: false}
        }
      ]
    };

    const where = observationToFindChecksWhere(observation);

    expect(where).toEqual(expected);

  });



  test('Should convert complex observation as expected', () => {

    const observation = {
      id: 'aB1e2',
      timeseriesId: 'eka38Hajn1',
      hasResult: {
        value: 12.2,
        unit: 'degree-celsius'
      },
      madeBySensor: 'sensor-1',
      hasDeployment: 'deployment-1',
      hostedByPath: ['parent-plat', 'child-plat'], // this should NOT be reordered
      hasFeatureOfInterest: 'earth-atmosphere',
      observedProperty: 'air-temperature',
      aggregation: 'instant',
      disciplines: ['meteorology', 'atmospheric-chemistry'], // should be ordered alphabetically (normally will be anyway)
      usedProcedures: ['b-procedure', 'a-procedure'] // this should NOT be reordered
    };

    const expected = {
      // The order of this array will need to match the processing order of the function.
      $and: [
        {
          $or: [
            {unit: 'degree-celsius'},
            {unit: {$exists: false}},
          ]
        },
        {
          $or: [
            {madeBySensor: 'sensor-1'},
            {madeBySensor: {$exists: false}},
          ]
        },
        {
          $or: [
            {hasDeployment: 'deployment-1'},
            {hasDeployment: {$exists: false}},
          ]
        },
        {
          $or: [
            {hostedByPath: ['parent-plat', 'child-plat']},
            {hostedByPath: {$exists: false}},
          ]
        },
        {
          $or: [
            {hostedByPathIncludes: 'parent-plat'},
            {hostedByPathIncludes: 'child-plat'},
            {hostedByPathIncludes: {$exists: false}},
          ]
        },
        {
          $or: [
            {hasFeatureOfInterest: 'earth-atmosphere'},
            {hasFeatureOfInterest: {$exists: false}},
          ]
        },
        {
          $or: [
            {observedProperty: 'airTemperature'},
            {observedProperty: {$exists: false}},
          ]
        },
        {
          $or: [
            {aggregation: 'instant'},
            {aggregation: {$exists: false}},
          ]
        },
        {
          $or: [
            {disciplines: ['atmospheric-chemistry', 'meteorology']}, // now sorted
            {disciplines: {$exists: false}},
          ]
        },
        {
          $or: [
            {disciplinesIncludes: 'atmospheric-chemistry'},
            {disciplinesIncludes: 'meteorology'},
            {disciplinesIncludes: {$exists: false}},
          ]
        },
        {
          $or: [
            {usedProcedures: ['b-procedure', 'a-procedure']},
            {usedProcedures: {$exists: false}},
          ]
        },
        {
          $or: [
            {usedProceduresIncludes: 'b-procedure'},
            {usedProceduresIncludes: 'a-procedure'},
            {usedProceduresIncludes: {$exists: false}},
          ]
        }
      ]
    };

    const where = observationToFindChecksWhere(observation);

    expect(where).toEqual(expected);

  });

});