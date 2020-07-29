import * as joi from '@hapi/joi';


export const belowRangeConfigSchema = joi.object({
  minValue: joi.number().required()
});

