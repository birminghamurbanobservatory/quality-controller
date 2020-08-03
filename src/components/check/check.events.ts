import * as event from 'event-stream';
import * as logger from 'node-logger';
import {Promise} from 'bluebird'; 
import {logCensorAndRethrow} from '../../events/handle-event-handler-error';
import * as joi from '@hapi/joi';
import {BadRequest} from '../../errors/BadRequest';
import {CheckClient} from './check-client.interface';
import {createCheck, deleteCheck, getCheck, getChecks} from './check.controller';


export async function subscribeToCheckEvents(): Promise<void> {

  const subscriptionFunctions = [
    subscribeToCheckCreateRequests,
    subscribeToCheckGetRequests,
    subscribeToChecksGetRequests,
    subscribeToCheckDeleteRequests
  ];

  // I don't want later subscriptions to be prevented, just because an earlier attempt failed, as I want my event-stream module to have all the event names and handler functions added to its list of subscriptions so it can add them again upon a reconnect.
  await Promise.mapSeries(subscriptionFunctions, async (subscriptionFunction): Promise<void> => {
    try {
      await subscriptionFunction();
    } catch (err) {
      if (err.name === 'NoEventStreamConnection') {
        // If it failed to subscribe because the event-stream connection isn't currently down, I still want it to continue adding the other subscriptions, so that the event-stream module has all the event names and handler functions added to its list of subscriptions so it can add them again upon a reconnect.
        logger.warn(`Failed to subscribe due to event-stream connection being down`);
      } else {
        throw err;
      }
    }
    return;
  });

  return;
}


//-------------------------------------------------
// Create check
//-------------------------------------------------
async function subscribeToCheckCreateRequests(): Promise<any> {
  
  // N.B. The event-stream package changes the configuration of a queue based on whether it contains the work 'request'. Here we leave it out because we want the queue to be durable and lazy to aid the processing of many observations in bulk.
  const eventName = 'check.create.request';

  const checkCreateRequestSchema = joi.object({
    new: joi.object({
      // Let the controller check this
    }).unknown().required()
  }).required();

  await event.subscribe(eventName, async (message): Promise<void> => {

    logger.debug(`New ${eventName} message.`, message);

    let createdCheck: CheckClient;
    try {
      const {error: err} = checkCreateRequestSchema.validate(message);
      if (err) throw new BadRequest(`Invalid ${eventName} request: ${err.message}`);    
      createdCheck = await createCheck(message.new);
    } catch (err) {
      logCensorAndRethrow(eventName, err);
    }

    return createdCheck;
  });

  logger.debug(`Subscribed to ${eventName} requests`);
  return;

}



//-------------------------------------------------
// Get Check
//-------------------------------------------------
async function subscribeToCheckGetRequests(): Promise<any> {

  const eventName = 'check.get.request';

  const checkGetRequestSchema = joi.object({
    where: joi.object({
      id: joi.string().required()
    })
    .required()
  })
  .required();

  await event.subscribe(eventName, async (message): Promise<void> => {

    logger.debug(`New ${eventName} message.`, message);

    let check: CheckClient;
    try {
      const {error: err} = checkGetRequestSchema.validate(message);
      if (err) throw new BadRequest(`Invalid ${eventName} request: ${err.message}`);
      check = await getCheck(message.where.id);
    } catch (err) {
      logCensorAndRethrow(eventName, err);
    }

    return check;
  });

  logger.debug(`Subscribed to ${eventName} requests`);
  return;  

}



//-------------------------------------------------
// Get Checks
//-------------------------------------------------
async function subscribeToChecksGetRequests(): Promise<any> {

  const eventName = 'checks.get.request';

  const checksGetRequestSchema = joi.object({
    where: joi.object({}).unknown(), // let the controller check this
    options: joi.object({}).unknown() // let the controller check this
  })
  .required();

  await event.subscribe(eventName, async (message): Promise<void> => {

    logger.debug(`New ${eventName} message.`, message);

    let response;
    try {
      const {error: err} = checksGetRequestSchema.validate(message);
      if (err) throw new BadRequest(`Invalid ${eventName} request: ${err.message}`);
      response = await getChecks(message.where, message.options);
    } catch (err) {
      logCensorAndRethrow(eventName, err);
    }

    return response;
  });

  logger.debug(`Subscribed to ${eventName} requests`);
  return;  

}



//-------------------------------------------------
// Delete Check
//-------------------------------------------------
async function subscribeToCheckDeleteRequests(): Promise<any> {
  
  const eventName = 'check.delete.request';
  const checkDeleteRequestSchema = joi.object({
    where: joi.object({
      id: joi.string().required()
    })
    .required()
  }).required();

  await event.subscribe(eventName, async (message): Promise<void> => {

    logger.debug(`New ${eventName} message.`, message);

    try {
      const {error: err} = checkDeleteRequestSchema.validate(message);
      if (err) throw new BadRequest(`Invalid ${eventName} request: ${err.message}`);      
      await deleteCheck(message.where.id);
    } catch (err) {
      logCensorAndRethrow(eventName, err);
    }

    return;
  });

  logger.debug(`Subscribed to ${eventName} requests`);
  return;
}