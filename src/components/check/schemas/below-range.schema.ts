import * as joi from '@hapi/joi';


export const aboveRange = joi.object({
  minValue: joi.number().required()
});

