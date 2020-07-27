import * as joi from '@hapi/joi';


export const persistenceSchema = joi.object({
  nRepeatsAllowed: joi.number().min(1).max(50).required(),
  minSpanInSeconds: joi.number().min(0) // (optional) resultTimes must span over at least this length of time
});

