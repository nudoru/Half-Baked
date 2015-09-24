import * as _actionConstants from './ActionConstants.js';
import * as _appStore from '../store/AppStore.js';

/**
 * Purely for convenience, an Event ("action") Creator ala Flux spec. Follow
 * guidelines for creating actions: https://github.com/acdlite/flux-standard-action
 */
var ActionCreator = {

  setLocalPlayerProps(data) {
    return {
      type   : _actionConstants.SET_LOCAL_PLAYER_PROPS,
      payload: {
        data: {
          localPlayer: data
        }
      }
    };
  },

  setRemotePlayerProps(data) {
    return {
      type   : _actionConstants.SET_REMOTE_PLAYER_PROPS,
      payload: {
        data: {
          remotePlayer: data
        }
      }
    };
  },

  setSessionProps(data) {
    return {
      type   : _actionConstants.SET_SESSION_PROPS,
      payload: {
        data: {
          session: data
        }
      }
    };
  },

  setCurrentQuestion: function (data) {
    return {
      type   : _actionConstants.SET_CURRENT_QUESTION,
      payload: {
        data: {
          currentQuestion: data
        }
      }
    };
  },

  setSentQuestion: function (data) {
    return {
      type   : _actionConstants.SET_SENT_QUESTION,
      payload: {
        data: {
          sentQuestion: data
        }
      }
    };
  },

  clearQuestion: function () {
    return {
      type   : _actionConstants.CLEAR_QUESTION,
      payload: {
        data: {}
      }
    };
  },

  answeredCorrect: function (points) {
    var state  = _appStore.getState(),
        health = state.localPlayer.health,
        score  = state.localPlayer.score + points;

    return {
      type   : _actionConstants.ANSWERED_CORRECT,
      payload: {
        data: {
          localPlayer: {
            health: health,
            score : score
          }
        }
      }
    };
  },

  answeredIncorrect: function (points) {
    var state  = _appStore.getState(),
        health = state.localPlayer.health - points,
        score  = state.localPlayer.score;

    return {
      type   : _actionConstants.ANSWERED_INCORRECT,
      payload: {
        data: {
          localPlayer: {
            health: health,
            score : score
          }
        }
      }
    };
  },

  opponentAnswered: function (result) {
    return {
      type   : _actionConstants.OPPONENT_ANSWERED,
      payload: {
        data: result
      }
    };
  },

  resetGame() {
    return {
      type   : _actionConstants.RESET_GAME,
      payload: {
        data: {
          currentState: _appStore.getState().gameStates[1],
          //session     : {
          //  roomID: ''
          //},
          localPlayer : _appStore.createPlayerResetObject(),
          remotePlayer: _appStore.createPlayerResetObject()
        }
      }
    };
  }

};

export default ActionCreator;