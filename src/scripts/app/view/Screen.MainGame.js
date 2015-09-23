import * as _noriActions from '../../nori/action/ActionCreator';
import * as _app from '../App';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';
import * as _appActions from '../action/ActionCreator.js';
import * as _regionPlayerStats from './Region.PlayerStats.js';
import * as _regionQuestion from './Region.Question.js';
import * as _numUtils from '../../nudoru/core/NumberUtils.js';
import * as _domUtils from '../../nudoru/browser/DOMUtils.js';
import * as _mixinDOMManipulation from '../../nori/view/MixinDOMManipulation.js';

let _currentQuestionChanged = null,
    _difficultyCardElIDs    = ['#game_question-difficulty1', '#game_question-difficulty2', '#game_question-difficulty3', '#game_question-difficulty4', '#game_question-difficulty5'];

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponentView({

  mixins: [
    _mixinDOMManipulation
  ],

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
    initialize (configProps) {
    this.bindMap(_appStore);
    _currentQuestionChanged = _appStore.subscribe('currentQuestionChange', this.handleOpponentAnswered.bind(this));
  },

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
      questionView     : _regionQuestion.default({
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
      'click #game_question-difficulty1, click #game_question-difficulty2, click #game_question-difficulty3, click #game_question-difficulty4, click #game_question-difficulty5': this.sendQuestion.bind(this)
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
    getInitialState () {
    let appState = _appStore.getState();
    return {
      sentQuestion: appState.sentQuestion,
      local       : appState.localPlayer,
      remote      : appState.remotePlayer
    };
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
    componentWillUpdate () {
    let appState = _appStore.getState();
    return {
      sentQuestion: appState.sentQuestion,
      local       : appState.localPlayer,
      remote      : appState.remotePlayer
    };
  },

  sendQuestion(evt) {
    _appView.default.closeAllAlerts();

    var difficulty = parseInt(evt.target.getAttribute('id').substr(-1, 1));
    _app.default.sendQuestion(difficulty);
    this.showWaitingMessage();
  },

  handleOpponentAnswered() {
    this.showDifficultyCards();
  },

  /**
   * Component HTML was attached to the DOM
   */
    componentDidMount(){
    this.showDifficultyCards();
  },

  showWaitingMessage() {
    this.showEl('.game__question-waiting');
    this.hideEl('.game__question-difficulty');
  },

  showDifficultyCards() {
    this.hideEl('.game__question-waiting');
    this.showEl('.game__question-difficulty');

    this.animateDifficultyCards();

  },

  animateDifficultyCards() {
    _difficultyCardElIDs.forEach((cardID, i) => {

      this.tweenSet(cardID, {
        alpha: 0,
        y    : 300
      });

      this.tweenTo(cardID, 1, {
        alpha: 1,
        y    : 0,
        delay: i * 0.15,
        ease : Back.easeOut
      });

    });
  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount(){
  },

  componentWillDispose(){
    if (_currentQuestionChanged) {
      _currentQuestionChanged.dispose();
    }
  }

})
  ;

export default Component;