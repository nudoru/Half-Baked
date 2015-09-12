import * as _noriActions from '../../nori/action/ActionCreator';
import * as _app from '../App';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';
import * as _appActions from '../action/ActionCreator.js';
import * as _socketIO from '../../nori/service/SocketIO.js';
import * as _regionPlayerStats from './Region.PlayerStats.js';
import * as _numUtils from '../../nudoru/core/NumberUtils.js';

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponentView({

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize: function (configProps) {
    //
  },

  answeringQuestion: false,

  defineRegions: function () {
    return {
      localPlayerStats : _regionPlayerStats.default({
        id        : 'game__playerstats',
        mountPoint: '#game__localplayerstats',
        target    : 'local'
      }),
      remotePlayerStats: _regionPlayerStats.default({
        id        : 'game__playerstats',
        mountPoint: '#game__remoteplayerstats',
        target    : 'remote'
      })
    };
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function () {
    return {
      'click #game__button-skip': function () {
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.gameStates[4]}));
      },
      'click #game_question-difficulty1, click #game_question-difficulty2, click #game_question-difficulty3, click #game_question-difficulty4, click #game_question-difficulty5': this.sendQuestion.bind(this),
      'click #game__test'       : function () {
        let state        = _appStore.getState(),
            localScore   = state.localPlayer.score + _numUtils.rndNumber(0, 5),
            localHealth  = state.localPlayer.health -1;

        _appStore.apply(_appActions.setLocalPlayerProps({
          health: localHealth,
          score : localScore
        }));
      }
    };
  },

  sendQuestion: function(evt) {
    var difficulty = parseInt(evt.target.getAttribute('id').substr(-1,1));
    _app.default.sendQuestion(difficulty);
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function () {
    let appState = _appStore.getState();
    return {
      local : appState.localPlayer,
      remote: appState.remotePlayer
    };
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function () {
    return {};
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount: function () {

  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function () {
    //
  }

});

export default Component;