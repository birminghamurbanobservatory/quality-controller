import {applyChecksToObservation, applyPersistenceCheckToObservation} from './quality-control.service';


describe('Testing of applyChecksToObservation function', () => {

  test('It can handle pre-existing flags', () => {
    
    const obsBefore = {
      id: 'obsID123',
      timeseriesId: 'aBc',
      resultTime: '2020-05-05T12:30:00.000Z',
      madeBySensor: 'sensor-1',
      hasResult: {
        value: 10.5,
        unit: 'degree-celsius',
        flags: ['below-range']
      },
      observedProperty: 'air-temperature',
      aggregation: 'instant'
    };

    const checks = [
      {
        id: '5e163fa0165784bb92d04243',
        checkType: 'above-range',
        appliesTo: {
          madeBySensor: 'sensor-1'
        },
        config: {
          maxValue: 10
        }
      },
      {
        id: '5e163fa0165784bb92d0429e',
        checkType: 'below-range',
        appliesTo: {
          madeBySensor: 'sensor-1'
        },
        config: {
          minValue: 11
        }
      }
    ];

    const obsAfter = applyChecksToObservation(checks, obsBefore);

    expect(obsAfter.hasResult.flags).toEqual(['below-range', 'above-range']);

  });



  describe('Testing applyPersistenceCheckToObservation function', () => {
  
    test('Does not fail when no timeseries has been provided', () => {
      
      const obsBefore = {
        id: 'obsID123',
        timeseriesId: 'aBc',
        resultTime: '2020-05-05T12:30:00.000Z',
        madeBySensor: 'sensor-1',
        hasResult: {
          value: 10.5,
          unit: 'degree-celsius'
        },
        observedProperty: 'air-temperature',
        aggregation: 'instant'
      };

      const check = {
        id: '5e163fa0165784bb92d04288',
        checkType: 'persistence',
        appliesTo: {
          madeBySensor: 'sensor-1'
        },
        config: {
          nConsecutiveAllowed: 10
        }
      };

      const obsAfter = applyPersistenceCheckToObservation(check, obsBefore);
      expect(obsAfter).toEqual(obsBefore);

    });


    test('Works when when there is no minSpanInSeconds parameter', () => {
      
      const obsBefore = {
        id: 'obsID123',
        timeseriesId: 'aBc',
        resultTime: '2020-05-05T12:30:00.000Z',
        madeBySensor: 'sensor-1',
        hasResult: {
          value: 10.5,
          unit: 'degree-celsius'
        },
        observedProperty: 'air-temperature',
        aggregation: 'instant'
      };

      const check = {
        id: '5e163fa0165784bb92d04288',
        checkType: 'persistence',
        appliesTo: {
          madeBySensor: 'sensor-1'
        },
        config: {
          nConsecutiveAllowed: 10
        }
      };

      const timeseries = {
        timeseriesId: 'aBc',
        lastObsTime: new Date('2020-05-05T12:15:00.000Z'),
        persistence: {
          lastValue: 10.5,
          nConsecutive: 113,
          firstSeen: new Date('2020-04-04T14:45:00.000Z')
        }
      };

      const obsAfter = applyPersistenceCheckToObservation(check, obsBefore, timeseries);
      expect(obsAfter.hasResult.flags).toEqual(['persistence']);

    });


    test('Works when when there is a minSpanInSeconds parameter', () => {
      
      const obsBefore = {
        id: 'obsID123',
        timeseriesId: 'aBc',
        resultTime: '2020-05-05T12:30:00.000Z',
        madeBySensor: 'sensor-1',
        hasResult: {
          value: 10.5,
          unit: 'degree-celsius'
        },
        observedProperty: 'air-temperature',
        aggregation: 'instant'
      };

      const check = {
        id: '5e163fa0165784bb92d04288',
        checkType: 'persistence',
        appliesTo: {
          madeBySensor: 'sensor-1'
        },
        config: {
          nConsecutiveAllowed: 10,
          minSpanInSeconds: 3600 // an hour
        }
      };

      const timeseries = {
        timeseriesId: 'aBc',
        lastObsTime: new Date('2020-05-05T12:15:00.000Z'),
        persistence: {
          lastValue: 10.5,
          nConsecutive: 13,
          firstSeen: new Date('2020-05-05T10:45:00.000Z') // this is old enough
        }
      };

      const obsAfter = applyPersistenceCheckToObservation(check, obsBefore, timeseries);
      expect(obsAfter.hasResult.flags).toEqual(['persistence']);

    });



    test('Will not flag an observation when minSpanInSeconds clause is not met', () => {
      
      const obsBefore = {
        id: 'obsID123',
        timeseriesId: 'aBc',
        resultTime: '2020-05-05T12:30:00.000Z',
        madeBySensor: 'sensor-1',
        hasResult: {
          value: 10.5,
          unit: 'degree-celsius'
        },
        observedProperty: 'air-temperature',
        aggregation: 'instant'
      };

      const check = {
        id: '5e163fa0165784bb92d04288',
        checkType: 'persistence',
        appliesTo: {
          madeBySensor: 'sensor-1'
        },
        config: {
          nConsecutiveAllowed: 10,
          minSpanInSeconds: 3600 // an hour
        }
      };

      const timeseries = {
        timeseriesId: 'aBc',
        lastObsTime: new Date('2020-05-05T12:15:00.000Z'),
        persistence: {
          lastValue: 10.5,
          nConsecutive: 13,
          firstSeen: new Date('2020-05-05T11:45:00.000Z') // this is NOT old enough
        }
      };

      const obsAfter = applyPersistenceCheckToObservation(check, obsBefore, timeseries);
      expect(obsAfter.hasResult.flags).toBeUndefined();

    });
  

  });


});