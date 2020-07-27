import * as event from 'event-stream';
import * as logger from 'node-logger';
import {Promise} from 'bluebird'; 
import {logCensorAndRethrow} from '../../events/handle-event-handler-error';
import * as joi from '@hapi/joi';
import {BadRequest} from '../../errors/BadRequest';
import {qualityControlObservation} from './quality-control.controller';
import {ObservationClient} from './observation/observation-client.interface';


export async function subscribeToQualityControlEvents(): Promise<void> {

  const subscriptionFunctions = [
    subscribeToObservationQualityControlRequests
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


async function subscribeToObservationQualityControlRequests(): Promise<any> {
  
  // N.B. The event-stream package changes the configuration of a queue based on whether it contains the work 'request'. Here we leave it out because we want the queue to be durable and lazy to aid the processing of many observations in bulk.
  const eventName = 'observation.quality-control';

  const observationQualityControlSchema = joi.object({
    observation: joi.object({
      // Let the controller check this
    }).unknown().required()
  }).required();

  await event.subscribe(eventName, async (message): Promise<void> => {

    logger.debug(`New ${eventName} message.`, message);

    let qualityControlledObservation: ObservationClient;
    try {
      const {error: err} = observationQualityControlSchema.validate(message);
      if (err) throw new BadRequest(`Invalid ${eventName} request: ${err.message}`);    
      qualityControlledObservation = await qualityControlObservation(message.observation);
    } catch (err) {
      logCensorAndRethrow(eventName, err);
    }

    return qualityControlledObservation;
  });

  logger.debug(`Subscribed to ${eventName} requests`);
  return;

}