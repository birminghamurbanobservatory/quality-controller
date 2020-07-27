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
          $or: [
            {observedProperty: 'air-temperature'},
            {observedProperty: {$exists: false}},
          ]
        },
        {
          $or: [
            {unit: 'degree-celsius'},
            {unit: {$exists: false}},
          ]
        },
        {
          $or: [
            {aggregation: 'instant'},
            {aggregation: {$exists: false}},
          ]
        },
        {
          hasFeatureOfInterest: {$exists: false},
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
            {madeBySensor: 'sensor-1'},
            {madeBySensor: {$exists: false}},
          ]
        },
        {
          $or: [
            {observedProperty: 'air-temperature'},
            {observedProperty: {$exists: false}},
          ]
        },
        {
          $or: [
            {unit: 'degree-celsius'},
            {unit: {$exists: false}},
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
            {hasFeatureOfInterest: 'earth-atmosphere'},
            {hasFeatureOfInterest: {$exists: false}},
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
            {hostedByPathIncludes: {$exists: false}},
            {hostedByPathIncludes: 'parent-plat'},
            {hostedByPathIncludes: 'child-plat'},
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
            {disciplinesIncludes: {$exists: false}},
            {disciplinesIncludes: 'meteorology'},
            {disciplinesIncludes: 'atmospheric-chemistry'},
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
            {usedProceduresIncludes: {$exists: false}},
            {usedProceduresIncludes: 'b-procedure'},
            {usedProceduresIncludes: 'a-procedure'},
          ]
        }
      ]
    };

    const where = observationToFindChecksWhere(observation);

    expect(where).toEqual(expected);

  });

});