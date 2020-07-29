import * as joi from '@hapi/joi';
import {InvalidCheck} from './errors/InvalidCheck';
import {belowRangeConfigSchema} from './schemas/below-range-config.schema';
import {persistenceConfigSchema} from './schemas/persistence-config.schema';
import {aboveRangeConfigSchema} from './schemas/above-range-config.schema';
import * as checkService from './check.service';
import {CheckClient} from './check-client.interface';

const validCheckTypes = checkService.validCheckTypes;

const newCheckSchema = joi.object({
  checkType: joi.string().valid(...validCheckTypes).required(),
  appliesTo: joi.object({
    madeBySensor: joi.string(),
    observedProperty: joi.string(),
    unit: joi.string(),
    hasFeatureOfInterest: joi.string(),
    hasDeployment: joi.string(),
    aggregation: joi.string(),
    disciplines: joi.array().min(1).items(joi.string()),
    disciplinesIncludes: joi.string(), 
    hostedByPath: joi.array().min(1).items(joi.string()),
    hostedByPathIncludes: joi.string(),
    usedProcedures: joi.array().min(1).items(joi.string()),
    usedProceduresIncludes: joi.string()
  })
    .min(1)
    .oxor('disciplines', 'disciplinesIncludes')
    .oxor('hostedByPath', 'hostedByPathIncludes')
    .oxor('usedProcedures', 'usedProceduresIncludes')
    .required(),
  config: joi.object().when('checkType', [
    {is: 'below-range', then: belowRangeConfigSchema},
    {is: 'above-range', then: aboveRangeConfigSchema},
    {is: 'persistence', then: persistenceConfigSchema}
  ]).required()
});



export async function createCheck(check: any): Promise<CheckClient> {

  const {error: err} = newCheckSchema.validate(check);
  if (err) throw new InvalidCheck(err.message);

  const createdCheck = await checkService.createCheck(check);

  return checkService.checkAppToClient(createdCheck);

}


export async function deleteCheck(id: any): Promise<void> {
  await checkService.deleteCheck(id);
  return;
}