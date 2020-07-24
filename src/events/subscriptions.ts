import {subscribeToQualityControlEvents} from '../components/quality-control/quality-control.events';


export async function invokeAllSubscriptions(): Promise<void> {
  // TODO: Subscibe to events for CRUDing checks.
  await subscribeToQualityControlEvents();
}