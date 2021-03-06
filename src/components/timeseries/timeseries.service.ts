import Timeseries from './timeseries.model';
import {TimeseriesNotFound} from './errors/TimeseriesNotFound';
import {GetTimeseriesFail} from './errors/GetTimeseriesFail';
import {UpdateTimeseriesFail} from './errors/UpdateTimeseriesFail';
import {TimeseriesApp} from './timeseries-app.interface';
import {CreateTimeseriesFail} from './errors/CreateTimeseriesFail';
import {CountTimeseriesFail} from './errors/CountTimeseriesFail';
import {DeleteTimeseriesFail} from './errors/DeleteTimeseriesFail';


export async function getTimeseries(timeseriesId: string): Promise<TimeseriesApp> {

  let timeseries;
  try {
    timeseries = await Timeseries.findOne(
      {
        timeseriesId
      }       
    ).exec();
  } catch (err) {
    throw new GetTimeseriesFail(undefined, err.message);
  }

  if (!timeseries) {
    throw new TimeseriesNotFound(`A timeseries with id '${timeseriesId}' could not be found`);
  }

  return timeseriesDbToApp(timeseries);

}


export async function createTimeseries(timeseries: TimeseriesApp): Promise<TimeseriesApp> {
  
  let createdTimeseries;
  try {
    createdTimeseries = await Timeseries.create(timeseries);
  } catch (err) {
    throw new CreateTimeseriesFail(undefined, err.message);
  }

  return timeseriesDbToApp(createdTimeseries);

}




export async function updateTimeseries(timeseriesId: string, updates: any): Promise<TimeseriesApp> {

  let updatedTimeseries;
  try {
    updatedTimeseries = await Timeseries.findOneAndUpdate(
      {
        timeseriesId
      }, 
      updates,
      {
        new: true,
        runValidators: true
      }
    ).exec();
  } catch (err) {
    throw new UpdateTimeseriesFail(undefined, err.message);
  }

  if (!updatedTimeseries) {
    throw new TimeseriesNotFound(`A timeseries with id '${timeseriesId}' could not be found`);
  }

  return timeseriesDbToApp(updatedTimeseries);

}


export async function countTimeseries(where = {}): Promise<number> {

  let count;

  try {
    count = await Timeseries.countDocuments(where).exec();
  } catch (err) {
    throw new CountTimeseriesFail(undefined, err.message);
  }

  return count;

}


export async function deleteTimeseries(timeseriesId: string): Promise<TimeseriesApp> {

  let deletedTimeseries;
  try {
    deletedTimeseries = await Timeseries.findOneAndDelete({timeseriesId}).exec();
  } catch (err) {
    throw new DeleteTimeseriesFail(`Failed to delete timeseries '${timeseriesId}'`, err.message);
  }

  if (!deletedTimeseries) {
    throw new TimeseriesNotFound(`A timeseries with timeseriesId '${timeseriesId}' could not be found`);
  }

  return timeseriesDbToApp(deletedTimeseries);

}



function timeseriesDbToApp(timeseriesDb: any): any {
  const timeseriesApp = timeseriesDb.toObject();
  // Don't see much point in leaving in the mongodb id.
  delete timeseriesApp._id;
  delete timeseriesApp.__v;
  return timeseriesApp;
}



