import * as joi from '@hapi/joi';


export const aboveRangeConfigSchema = joi.object({
  maxValue: joi.number().required()
});