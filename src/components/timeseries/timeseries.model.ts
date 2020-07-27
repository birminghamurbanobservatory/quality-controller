//-------------------------------------------------
// Dependencies
//-------------------------------------------------
import * as mongoose from 'mongoose';


//-------------------------------------------------
// Schema
//-------------------------------------------------
const schema = new mongoose.Schema({
  timeseriesId: {
    type: String,
    required: true,
  },
  lastObsTime: {
    type: Date,
    required: true
  },
  // Decided to organise this by the checks being performed, this way we only need to save the information that's required for the checks being perform. I.e. no point in storing the last value if persistence checks aren't being performed.
  persistence: {
    lastValue: {}, // this could be a string, number, boolean, object, array
    nRepeats: { // how many times has the same lastValue been seen consecutively
      type: Number,
      required: true
    }, 
    firstSeen: { // required in order to support the minSpanInSeconds caveat.
      type: Date,
      required: true
    }
  }
}, {
  timestamps: true // automatically adds createdAt and updatedAt fields
});


//-------------------------------------------------
// Indexes
//-------------------------------------------------
schema.index({timeseriesId: 1}, {unique: true});


//-------------------------------------------------
// Create Model (and expose it to our app)
//-------------------------------------------------
export default mongoose.model('Timeseries', schema);