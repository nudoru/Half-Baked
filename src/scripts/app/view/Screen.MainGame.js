import * as _noriActions from '../../nori/action/ActionCreator';
import * as _app from '../App';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';
import * as _appActions from '../action/ActionCreator.js';
import * as _socketIO from '../../nori/service/SocketIO.js';
import * as _regionPlayerStats from './Region.PlayerStats.js';
import * as _regionQuestion from './Region.Question.js';
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
  initialize (configProps) {
    //
  },

  answeringQuestion: false,

  defineRegions () {
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
      }),
      questionView: _regionQuestion.default({
        id        : 'game__question',
        mountPoint: '#game__questionarea'
      })
    };
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents () {
    return {
      'click #game__button-skip' () {
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.gameStates[4]}));
      },
      'click #game_question-difficulty1, click #game_question-difficulty2, click #game_question-difficulty3, click #game_question-difficulty4, click #game_question-difficulty5': this.sendQuestion.bind(this),
      'click #game__test'        () {
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

  sendQuestion(evt) {
    var difficulty = parseInt(evt.target.getAttribute('id').substr(-1,1));
    _app.default.sendQuestion(difficulty);
  },

  receiveQuestion(questionObj) {
    console.log('Main game view received question', questionObj);
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState () {
    let appState = _appStore.getState();
    return {
      local : appState.localPlayer,
      remote: appState.remotePlayer
    };
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate () {
    return {};
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount () {

  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount () {
    //
  }

});

export default Component;