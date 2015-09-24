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
import * as _rx from '../../nori/utils/Rx.js';

let _cardAnimationSub = null;

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
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.getState().gameStates[4]}));
      },
      'click #game_question-difficulty1, click #game_question-difficulty2, click #game_question-difficulty3, click #game_question-difficulty4, click #game_question-difficulty5': this.sendQuestion.bind(this)
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
    getInitialState () {
    return this.getGameState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
    componentWillUpdate () {
    return this.getGameState();
  },

  getGameState() {
    let appState = _appStore.getState();
    return {
      sentQuestion: appState.sentQuestion
    };
  },

  sendQuestion(evt) {
    _appView.default.closeAllAlerts();
    var difficulty = parseInt(evt.target.getAttribute('id').substr(-1, 1));
    _app.default.sendQuestion(difficulty);
  },

  shouldDelegateEvents() {
    return this.isShowingCards();
  },

  /**
   * Component HTML was attached to the DOM
   */
    componentDidMount(){
    //if (this.isShowingCards()) {
    //  if (_cardAnimationSub) {
    //    _cardAnimationSub.dispose();
    //  }
    //
    //  // Needs a 1ms delay
    //  _cardAnimationSub = _rx.doEvery(10, 1, this.animateDifficultyCards.bind(this));
    //  //this.animateDifficultyCards();
    //}
  },

  isShowingCards() {
    return (this.getState().sentQuestion.q_difficulty_level === -1);
  },

  animateDifficultyCards() {
    let difficultyCardElIDs = ['#game_question-difficulty1', '#game_question-difficulty2', '#game_question-difficulty3', '#game_question-difficulty4', '#game_question-difficulty5'];

    difficultyCardElIDs.forEach((cardID, i) => {

      this.tweenFromTo(cardID, 1, {
        alpha: 0,
        y    : 300
      }, {
        alpha: 1,
        y    : 0,
        delay: i * 0.15,
        ease : Back.easeOut
      });

    });

    _cardAnimationSub.dispose();

  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount(){
  },

  template(state) {
    if (state.sentQuestion.q_difficulty_level === -1) {
      var cardsHTML = _template.getSource('game__choose');
      return _.template(cardsHTML);
    } else {
      var remoteHTML = _template.getSource('game__remote');
      return _.template(remoteHTML);
    }
  },

  /**
   * Only renders if there is a current question
   */
    render(state) {
    return this.template(state)(state);
  },

  componentWillDispose(){
  }

});

export default Component;