

// TODO: I.e. once you support the event-stream events and the api-gateway has a /checks endpoint.
export async function createCheck(check: any): Promise<any> {

  // Probably don't want to allow a check to have both disciplines and disciplineIncludes defined, likewise for the other array properties. Allow just one or the other.

  // Also make sure at least one appliesTo property is defined.

  // Validate the config based on what checkType is specified.

}