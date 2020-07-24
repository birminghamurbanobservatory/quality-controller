import * as joi from '@hapi/joi';


export const persistenceSchema = joi.object({
  nConsecutiveAllowed: joi.number().min(1).max(10).required() // TODO: could set this max higher if the timeseries document just stores the last value and the amount of times it has seen it consecutively.
  // TODO: Optional parameter for these consecutive observations needing to span over a minimum amount of time? E.g. if you have a sensor uploading every second then it wouldn't be unusual for the value to stay the same.
});

