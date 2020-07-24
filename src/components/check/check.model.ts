//-------------------------------------------------
// Dependencies
//-------------------------------------------------
import * as mongoose from 'mongoose';


//-------------------------------------------------
// Schema
//-------------------------------------------------
const schema = new mongoose.Schema({
  checkType: {
    type: String,
    required: true,
    enum: ['persistence', 'above-range', 'below-range']
  },
  appliesTo: {
    madeBySensor: String,
    observedProperty: String,
    unit: String,
    featureOfInterest: String,
    hasDeployment: String,
    aggregation: String,
    // Worth having two fields here for array properties, because it gives the option to specify strict matches, but also a simple string value which might be easier to use on the front end.
    disciplines: [String], // exact match
    disciplinesIncludes: String, // observation property array just has to include this value to match
    hostedByPath: [String], // order is important
    hosteByPathIncludes: String,
    usedProcedures: [String],
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
schema.index({observedProperty: 1});
schema.index({hasDeployment: 1});


//-------------------------------------------------
// Create Model (and expose it to our app)
//-------------------------------------------------
export default mongoose.model('Check', schema);