import {subscribeToQualityControlEvents} from '../components/quality-control/quality-control.events';
import {subscribeToCheckEvents} from '../components/check/check.events';


export async function invokeAllSubscriptions(): Promise<void> {
  await subscribeToQualityControlEvents();
  await subscribeToCheckEvents();
}