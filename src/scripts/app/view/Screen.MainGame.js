import _noriActions from '../../nori/action/ActionCreator';
import _app from '../App';
import _appView from './AppView';
import _appStore from '../store/AppStore';
import _template from '../../nori/view/Templating.js';
import _appActions from '../action/ActionCreator.js';
import _regionPlayerStats from './Region.PlayerStats.js';
import _regionQuestion from './Region.Question.js';
import _numUtils from '../../nudoru/core/NumberUtils.js';
import _domUtils from '../../nudoru/browser/DOMUtils.js';
import _mixinDOMManipulation from '../../nori/view/MixinDOMManipulation.js';
import _rx from '../../nori/utils/Rx.js';
import _ from '../../vendor/lodash.min.js';

let _cardAnimationSub = null;

// Switch Lodash to use Mustache style templates
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponent({

  mixins: [
    _mixinDOMManipulation
  ],

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
    initialize (initProps) {
    this.bind(_appStore, this.onStoreUpdate.bind(this));
  },

  onStoreUpdate() {
    this.setState(this.getGameState());
  },

  defineRegions () {
    return {
      localPlayerStats : _regionPlayerStats({
        id        : 'game__playerstats',
        mountPoint: '#game__localplayerstats',
        target    : 'local'
      }),
      remotePlayerStats: _regionPlayerStats({
        id        : 'game__playerstats',
        mountPoint: '#game__remoteplayerstats',
        target    : 'remote'
      }),
      questionView     : _regionQuestion({
        id        : 'game__question',
        mountPoint: '#game__questionarea'
      })
    };
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
    getDOMEvents () {
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

  getGameState() {
    let appState = _appStore.getState();
    return {
      sentQuestion: appState.sentQuestion
    };
  },

  sendQuestion(evt) {
    _appView.closeAllAlerts();
    var difficulty = parseInt(evt.target.getAttribute('id').substr(-1, 1));
    _app.sendQuestion(difficulty);
  },

  shouldDelegateEvents(props, state) {
    return this.isShowingCards();
  },

  /**
   * Component HTML was attached to the DOM
   */
    componentDidMount(){
    if (this.isShowingCards()) {
      if (_cardAnimationSub) {
        _cardAnimationSub.dispose();
      }

      this.animateDifficultyCards();
    }
  },

  isShowingCards() {
    return (this.state.sentQuestion.q_difficulty_level === -1);
  },

  animateDifficultyCards() {
    let difficultyCardElIDs = ['#game_question-difficulty1', '#game_question-difficulty2', '#game_question-difficulty3', '#game_question-difficulty4', '#game_question-difficulty5'];

    difficultyCardElIDs.forEach((cardID, i) => {
      this.tweenFromTo(cardID, 0.5, {
        alpha: 0,
        y    : 300
      }, {
        alpha: 1,
        y    : 0,
        delay: i * 0.1,
        ease : Back.easeOut
      });

    });

  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount(){
  },

  template(props, state) {
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
    render(props, state) {
    return this.template(props, state)(state);
  },

  componentWillDispose(){
  }

});

export default Component;