import * as _actionConstants from './ActionConstants.js';
import * as _appStore from '../store/AppStore.js';

/**
 * Purely for convenience, an Event ("action") Creator ala Flux spec. Follow
 * guidelines for creating actions: https://github.com/acdlite/flux-standard-action
 */
var ActionCreator = {

  setLocalPlayerProps: function (data) {
    return {
      type   : _actionConstants.SET_LOCAL_PLAYER_PROPS,
      payload: {
        data: {
          localPlayer: data
        }
      }
    };
  },

  setRemotePlayerProps: function (data) {
    return {
      type   : _actionConstants.SET_REMOTE_PLAYER_PROPS,
      payload: {
        data: {
          remotePlayer: data
        }
      }
    };
  },

  setSessionProps: function (data) {
    return {
      type   : _actionConstants.SET_SESSION_PROPS,
      payload: {
        data: {
          session: data
        }
      }
    };
  },

  setGamePlayState: function(data) {
    return {
      type   : _actionConstants.SET_GAME_PLAY_STATE,
      payload: {
        data: {
          currentPlayState: data
        }
      }
    };
  },

  setCurrentQuestion: function(data) {
    return {
      type   : _actionConstants.SET_CURRENT_QUESTION,
      payload: {
        data: {
          currentQuestion: data
        }
      }
    };
  },

  resetGame: function () {
    return {
      type   : _actionConstants.RESET_GAME,
      payload: {
        data: {
          currentState: _appStore.gameStates[1],
          session     : {
            roomID    : ''
          },
          localPlayer : _appStore.createPlayerResetObject(),
          remotePlayer: _appStore.createPlayerResetObject()
        }
      }
    };
  }

};

export default ActionCreator;