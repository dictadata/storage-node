/**
 * Convert api.census.gov style URL query parameters to a storage pattern.
 *
 * get=field1,field2,...
 * for=field:value|*
 * in=field:value|*
 */

function census_params(pattern) {

  // support api.census.gov geo pattern
  if (Object.hasOwn(pattern, "get")) {
    pattern.fields = pattern.get.split(',');
    delete pattern.get;

    if (Object.hasOwn(pattern, "for")) {
      if (!Object.hasOwn(pattern, "match"))
        pattern.match = {};

      let [ name, value ] = pattern.for.split(':');
      if (value === '*')
        pattern.match[ name ] = { exists: true };
      else
        pattern.match[ name ] = value;

      delete pattern.for;
    }

    if (Object.hasOwn(pattern, "in")) {
      if (!Object.hasOwn(pattern, "match"))
        pattern.match = {};

      let [ name, value ] = pattern.for.split(':');
      if (value === '*')
        pattern.match[ name ] = { exists: true };
      else
        pattern.match[ name ] = value;

      delete pattern.in;
    }

  }

}
