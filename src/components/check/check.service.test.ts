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
            {'appliesTo.madeBySensor': 'sensor-1'},
            {'appliesTo.madeBySensor': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.observedProperty': 'air-temperature'},
            {'appliesTo.observedProperty': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.unit': 'degree-celsius'},
            {'appliesTo.unit': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.aggregation': 'instant'},
            {'appliesTo.aggregation': {$exists: false}},
          ]
        },
        {
          'appliesTo.hasFeatureOfInterest': {$exists: false},
        },
        {
          // These exist clauses for properties that don't exist in the observation are crucial
          'appliesTo.hasDeployment': {$exists: false},
        },
        {
          'appliesTo.hostedByPath': {$exists: false},
        },
        {
          'appliesTo.hostedByPathIncludes': {$exists: false},
        },
        {
          'appliesTo.disciplines': {$exists: false},
        },
        {
          'appliesTo.disciplinesIncludes': {$exists: false},
        },
        {
          'appliesTo.usedProcedures': {$exists: false}
        },
        {
          'appliesTo.usedProceduresIncludes': {$exists: false}
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
            {'appliesTo.madeBySensor': 'sensor-1'},
            {'appliesTo.madeBySensor': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.observedProperty': 'air-temperature'},
            {'appliesTo.observedProperty': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.unit': 'degree-celsius'},
            {'appliesTo.unit': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.aggregation': 'instant'},
            {'appliesTo.aggregation': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.hasFeatureOfInterest': 'earth-atmosphere'},
            {'appliesTo.hasFeatureOfInterest': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.hasDeployment': 'deployment-1'},
            {'appliesTo.hasDeployment': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.hostedByPath': ['parent-plat', 'child-plat']},
            {'appliesTo.hostedByPath': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.hostedByPathIncludes': {$exists: false}},
            {'appliesTo.hostedByPathIncludes': 'parent-plat'},
            {'appliesTo.hostedByPathIncludes': 'child-plat'},
          ]
        },
        {
          $or: [
            {'appliesTo.disciplines': ['atmospheric-chemistry', 'meteorology']}, // now sorted
            {'appliesTo.disciplines': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.disciplinesIncludes': {$exists: false}},
            {'appliesTo.disciplinesIncludes': 'meteorology'},
            {'appliesTo.disciplinesIncludes': 'atmospheric-chemistry'},
          ]
        },
        {
          $or: [
            {'appliesTo.usedProcedures': ['b-procedure', 'a-procedure']},
            {'appliesTo.usedProcedures': {$exists: false}},
          ]
        },
        {
          $or: [
            {'appliesTo.usedProceduresIncludes': {$exists: false}},
            {'appliesTo.usedProceduresIncludes': 'b-procedure'},
            {'appliesTo.usedProceduresIncludes': 'a-procedure'},
          ]
        }
      ]
    };

    const where = observationToFindChecksWhere(observation);

    expect(where).toEqual(expected);

  });

});