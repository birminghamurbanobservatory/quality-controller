import * as joi from '@hapi/joi';
import {InvalidObservation} from './InvalidObservation';
import {ObservationClient} from './observation-client.interface';



const createObservationSchema = joi.object({
  id: joi.string().required(), // important line
  timeseriesId: joi.string().required(),  // important line
  madeBySensor: joi.string(),
  hasResult: joi.object({
    value: joi.any().required(),
    unit: joi.string(), 
    flags: joi.array().min(1).items(joi.string()) // may already have flags, e.g. from the ingesters
  }).required(),
  resultTime: joi.string().isoDate().required(),
  phenomenonTime: joi.object({
    hasBeginning: joi.string().isoDate(),
    hasEnd: joi.string().isoDate(),
    duration: joi.number().min(0)
  }).min(2),
  hasDeployment: joi.string(),
  hostedByPath: joi.array().min(1).items(joi.string()),
  hasFeatureOfInterest: joi.string(),
  observedProperty: joi.string(),
  aggregation: joi.string(),
  disciplines: joi.array().min(1).items(joi.string()),
  usedProcedures: joi.array().min(1).items(joi.string()),
  location: joi.object({
    id: joi.string().guid(), // this is the client_id, a uuid,
    validAt: joi.string().isoDate(),
    height: joi.number(),
    geometry: joi.object({
      type: joi.string().required(),
      coordinates: joi.array().min(2).required()
    })
    .required()
  })
}).required();



export function validateObservation(observation: ObservationClient): ObservationClient {

  const {error: validationErr, value: validObservation} = createObservationSchema.validate(observation);
  if (validationErr) {
    throw new InvalidObservation(`Observation is invalid. Reason: ${validationErr.message}`);
  }

  return validObservation;

}



