/**
 * accounts/encoding
 */
"use strict";

module.exports = {
  "_storagePath": "*|*|api_accounts|*",
  "model": "*",
  "location": "*",
  "schema": "api_accounts",
  "key": "*",
  "fields": {
    "userid": {
      "type": "keyword",
      "size": 0,
      "default": null,
      "isNullable": true,
      "isKey": false,
      "elastic_property": {
        "type": "keyword",
        "ignore_above": 256
      }
    },
    "password": {
      "type": "keyword",
      "size": 0,
      "default": null,
      "isNullable": true,
      "isKey": false,
      "elastic_property": {
        "type": "keyword",
        "ignore_above": 256
      }
    },
    "roles": {
      "type": "keyword",
      "size": 0,
      "default": null,
      "isNullable": true,
      "isKey": false,
      "elastic_property": {
        "type": "keyword",
        "ignore_above": 32
      }
    },
    "dateCreated": {
      "type": "date",
      "size": 0,
      "default": null,
      "isNullable": false,
      "isKey": false,
      "elastic_property": {
        "type": "date"
      }
    },
    "dateUpdated": {
      "type": "date",
      "size": 0,
      "default": null,
      "isNullable": true,
      "isKey": false,
      "elastic_property": {
        "type": "date"
      }
    },
    "lastLogin": {
      "type": "date",
      "size": 0,
      "default": null,
      "isNullable": true,
      "isKey": false,
      "elastic_property": {
        "type": "date"
      }
    }
  }
};
