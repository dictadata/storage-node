/**
 * account.js
 */
"use strict";

const roles = require('./roles');
const crypto = require("crypto");

module.exports = class Account {

  /**
   * account constructor
   * @param {*} userid
   */
  constructor(userid = '') {
    this.clear();
    this.userid = userid;
  }

  clear() {
    this.userid = '';
    this.password = '';
    this.roles = [roles.Public];
    this.dateCreated = null;
    this.dateUpdated = null;
    this.lastLogin = null;

    // note, state can be updated by runtime
    // but should not be copied, saved or communicated
    this.state = {
      isAuthenticated: false
    };

    this.profile = {
      provider: '', // The provider with which the account authenticated (facebook, twitter, etc.).
      id: '', // A unique identifier for the account, as generated by the service provider.
      displayName: '', // The name of this account, suitable for display.
      name: {
        familyName: '', // The family name of this user, or "last name" in most Western languages.
        givenName: '', // The given name of this user, or "first name" in most Western languages.
        middleName: '' // The middle name of this user.
      },
      emails: [{
        value: '', // The actual email address.
        type: '' // The type of email address (home, work, etc.).
      }],
      photos: [{
        value: '' // The URL of the image.
      }]
    };

    this.settings = {
      prefix: ''
    };
  }

  /**
   * Hash plain text passwords.
   *
   * @param pwd The string to be hashed.
   * @returns {*} A string containing the hash results.
   */
  static hashPwd(pwd) {
    let hash = crypto.createHash("sha1");
    hash.update(pwd, "utf8");
    return hash.digest("base64");
  }

  get isAuthenticated() {
    return this.state.isAuthenticated;
  }
  set isAuthenticated(value) {
    this.state.isAuthenticated = value;
  }

  /**
   * isAuthorized returns true if user has at least one of the requested role(s).
   * @param {*} role as a string or array of strings
   */
  isAuthorized(roles) {
    if (Array.isArray(roles)) {
      for (let i = 0; i < roles.length; i++)
        if (this.roles.includes(roles[i]))
          return true;
    } else if (roles)
      return this.roles.includes(roles);

    return false;
  }

  // shallow copy of all non-function properties
  copy(a2) {
    let a1 = this;

    Object.keys(a2).forEach(function (key) {
      let t = typeof a2[key];
      if (t !== "undefined" && t !== "function") {
        a1[key] = a2[key];
      }
    });
  }

  // shallow copy of non-function properties
  // excluding userid, password, roles, state
  update(a2) {
    let a1 = this;

    Object.keys(a2).forEach(function (key) {
      let t = typeof a2[key];

      if (key === 'userid' || key === 'password' || key === 'roles' || key === 'state') {
        //
      } else if (t !== "undefined" && t !== "function") {
        a1[key] = a2[key];
      }
    });
  }

  /**
   * Copy of account properties for sending to client apps.
   * Stripped of password, state.
   */
  packet() {
    let a1 = {};
    let a2 = this;

    Object.keys(this).forEach(function (key) {
      let t = typeof a2[key];

      if (key === 'password' || key === 'state') {
        // skip
      } else if (t !== "undefined" && t !== "function") {
        a1[key] = a2[key];
      }
    });

    return a1;
  }

  /**
   * shallow-copy representation of construct for storage.
   * 
   * @param {*} pack 
   */
  encode() {
    let construct = {
      userid:      this.userid,
      password:    this.password,
      roles:       this.roles,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      lastLogin:   this.lastLogin,
      profile:     this.profile,
      settings:    this.settings
    }
    return construct;
  }
}