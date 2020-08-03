import * as joi from '@hapi/joi';
import {InvalidCheck} from './errors/InvalidCheck';
import {belowRangeConfigSchema} from './schemas/below-range-config.schema';
import {persistenceConfigSchema} from './schemas/persistence-config.schema';
import {aboveRangeConfigSchema} from './schemas/above-range-config.schema';
import * as checkService from './check.service';
import {CheckClient} from './check-client.interface';
import * as logger from 'node-logger';
import {CheckApp} from './check-app.interface';
import {BadRequest} from '../../errors/BadRequest';


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

  // TODO: Might be worth checking that a check with this exact set of appliesToProperties doesn't already exist.

  const createdCheck = await checkService.createCheck(check);

  return checkService.checkAppToClient(createdCheck);

}


export async function getCheck(id: string): Promise<CheckClient> {
  const check: CheckApp = await checkService.getCheck(id);
  logger.debug('Check found', check);
  return checkService.checkAppToClient(check);
}


const getChecksWhereSchema = joi.object({
  id: joi.object({
    in: joi.array().items(joi.string()).min(1)
  }),
  checkType: joi.string(),
  madeBySensor: joi.string(),
  observedProperty: joi.string(),
  unit: joi.string(),
  hasFeatureOfInterest: joi.string(),
  hasDeployment: joi.alternatives().try(
    joi.string(),
    joi.object({
      in: joi.array().items(joi.string()).min(1),
      exists: joi.boolean()
    })
  ),
  aggregation: joi.string(),
  disciplines: joi.array().items(joi.string()).min(1),
  disciplinesIncludes: joi.string(),
  hostedByPath: joi.array().items(joi.string()).min(1), // exact match
  hostedByPathIncludes: joi.string(),
  usedProcedures: joi.array().items(joi.string()).min(1),
  usedProceduresIncludes: joi.string(),
  // This 'or' array is useful, for example, when getting checks that don't apply to a specific deployment and thus everyone can access, in addition to checks that apply to deployments that the given user has access to.
  or: joi.array().min(1).items(joi.object({
    hasDeployment: joi.object({
      in: joi.array().items(joi.string()).min(1),
      exists: joi.boolean()
    })
  })), 
}).required();

const getChecksOptionsSchema = joi.object({
  limit: joi.number().integer().positive(),
  offset: joi.number().integer().min(0),
  sortBy: joi.string().valid('id'),
  sortOrder: joi.string().valid('asc', 'desc')
}).required();

export async function getChecks(where = {}, options = {}): Promise<{data: CheckClient[], meta: any}> {

  const {error: whereErr, value: validWhere} = getChecksWhereSchema.validate(where);
  if (whereErr) throw new BadRequest(`Invalid 'where' object: ${whereErr.message}`);

  const {error: optionsErr, value: validOptions} = getChecksOptionsSchema.validate(options);
  if (optionsErr) throw new BadRequest(`Invalid 'options' object: ${optionsErr.message}`);

  const {data: checks, count, total} = await checkService.getChecks(validWhere, validOptions);
  logger.debug(`${checks.length} check found`);
  const checksForClient = checks.map(checkService.checkAppToClient);

  return {
    data: checksForClient,
    meta: {
      count,
      total
    }
  };

}



export async function deleteCheck(id: string): Promise<void> {
  await checkService.deleteCheck(id);
  return;
}