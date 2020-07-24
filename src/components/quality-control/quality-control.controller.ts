import {ObservationClient} from './observation/observation-client.interface';
import {validateObservation} from './observation/observation-validator';


export async function qualityControlObservation(observation: ObservationClient): Promise<ObservationClient> {
  
  // Validate the observation
  const obs = validateObservation(observation);
  
  // Find any checks that match the properties of this observation

  return obs; // <-- TODO: change this

}