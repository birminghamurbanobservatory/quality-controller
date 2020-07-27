import * as joi from '@hapi/joi';


export const aboveRange = joi.object({
  maxValue: joi.number().required()
});