import * as joi from '@hapi/joi';


export const persistenceConfigSchema = joi.object({
  nConsecutiveAllowed: joi.number().min(1).max(50).required(),
  minSpanInSeconds: joi.number().min(0) // (optional) resultTimes must span over at least this length of time
});

