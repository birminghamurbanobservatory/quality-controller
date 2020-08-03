//-------------------------------------------------
// Dependencies
//-------------------------------------------------
import * as mongoose from 'mongoose';
import {validCheckTypes} from './check.service';


//-------------------------------------------------
// Schema
//-------------------------------------------------
const schema = new mongoose.Schema({
  checkType: {
    type: String,
    required: true,
    enum: validCheckTypes
  },
  appliesTo: {
    madeBySensor: String,
    observedProperty: String,
    unit: String,
    hasFeatureOfInterest: String,
    hasDeployment: String,
    aggregation: String,
    // Worth having two fields here for array properties, because it gives the option to specify strict matches, but also a simple string value which might be easier to use on the front end.
    disciplines: {
      type: [String],
      default: undefined // so it doesn't assign an empty array by default
    }, // exact match
    disciplinesIncludes: String, // observation property array just has to include this value to match
    hostedByPath: { // order is important
      type: [String],
      default: undefined // so it doesn't assign an empty array by default
    }, 
    hostedByPathIncludes: String,
    usedProcedures: { // order is important
      type: [String],
      default: undefined // so it doesn't assign an empty array by default
    },
    usedProceduresIncludes: String
  },
  // Because the config below will depend on the checkType we'll allow anything here, and handle the validation elsewhere.
  config: {}
}, {
  timestamps: true // automatically adds createdAt and updatedAt fields
});


//-------------------------------------------------
// Indexes
//-------------------------------------------------
// These indexes should be enough to speed up most queries.
schema.index({'appliesTo.observedProperty': 1});
schema.index({'appliesTo.hasDeployment': 1});


//-------------------------------------------------
// Create Model (and expose it to our app)
//-------------------------------------------------
export default mongoose.model('Check', schema);