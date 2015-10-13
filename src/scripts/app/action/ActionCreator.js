import _actionConstants from './ActionConstants.js';
import _appStore from '../store/AppStore.js';

/**
 * Purely for convenience, an Event ("action") Creator ala Flux spec. Follow
 * guidelines for creating actions: https://github.com/acdlite/flux-standard-action
 */
var ActionCreator = {

  setQuestionBank(data) {
    return {
      type   : _actionConstants.SET_QUESTION_BANK,
      payload: {
        data: {
          questionBank: data
        }
      }
    };
  },

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

  setSentQuestion: function (question, risk) {
    return {
      type   : _actionConstants.SET_SENT_QUESTION,
      payload: {
        data: {
          sentQuestion: question,
          questionRisk: risk
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

  applyRisk: function (risk) {
    var state  = _appStore.getState(),
        health = state.localPlayer.health - risk,
        score  = state.localPlayer.score;

    return {
      type   : _actionConstants.APPLY_RISK,
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