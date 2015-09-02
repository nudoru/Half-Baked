var _actionConstants = require('./ActionConstants.js');

/**
 * Purely for convenience, an Event ("action") Creator ala Flux spec. Follow
 * guidelines for creating actions: https://github.com/acdlite/flux-standard-action
 */
var ActionCreator = {

  setLocalPlayerProps: function (data) {
    var actionObj = {
      type   : _actionConstants.SET_LOCAL_PLAYER_PROPS,
      payload: {
        data: {
          localPlayer: data
        }
      }
    };

    return actionObj;
  },

  setRemotePlayerProps: function (data) {
    var actionObj = {
      type   : _actionConstants.SET_REMOTE_PLAYER_PROPS,
      payload: {
        data: {
          remotePlayer: data
        }
      }
    };

    return actionObj;
  },

  setSessionProps: function (data) {
    var actionObj = {
      type   : _actionConstants.SET_REMOTE_PLAYER_PROPS,
      payload: {
        data: {
          session: data
        }
      }
    };

    return actionObj;
  }

};

module.exports = ActionCreator;