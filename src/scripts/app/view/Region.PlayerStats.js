import * as _noriActions from '../../nori/action/ActionCreator';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';
import * as _mixinDOMManipulation from '../../nori/view/MixinDOMManipulation.js';
import * as _domUtils from '../../nudoru/browser/DOMUtils.js';

let _difficultyImages = ['pastry_cookie01.png', 'pastry_poptart01.png', 'pastry_donut.png', 'pastry_pie.png', 'pastry_cupcake.png'];

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponentView({

  mixins: [
    _mixinDOMManipulation
  ],

  /**
   * configProps passed in from region definition on parent View
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
    initialize(configProps) {
    this.bindMap(_appStore); // Reducer store, map id string or map object
  },


  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
    defineEvents() {
    return null;
  },

  /**
   * Set initial state properties. Call once on first render
   */
    getInitialState() {
    return this.getHUDState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
    componentWillUpdate() {
    return this.getHUDState();
  },

  getHUDState: function () {
    let appState         = _appStore.getState(),
        stats;

    if (this.getConfigProps().target === 'local') {
      stats             = appState.localPlayer;
      stats.playerImage = this.getPlayerHUDImage(appState.currentPlayState, stats.appearance);
      if (appState.currentQuestion) {
        let dlevel                    = appState.currentQuestion.question.q_difficulty_level - 1;
        stats.questionDifficultyImage = _difficultyImages[dlevel];
      } else {
        stats.questionDifficultyImage = 'null.png';
      }
    } else {
      stats             = appState.remotePlayer;
      stats.playerImage = this.getPlayerHUDImage(this.getOppositePlayState(appState.currentPlayState), stats.appearance);
      // there will be a dummy sent question rather than null
      if (appState.sentQuestion.q_difficulty_level >= 0) {
        let dlevel                    = appState.sentQuestion.q_difficulty_level - 1;
        stats.questionDifficultyImage = _difficultyImages[dlevel];
      } else {
        stats.questionDifficultyImage = 'null.png';
      }
    }
    return stats;
  },

  //'CHOOSE', 'ANSWERING', 'WAITING'
  getOppositePlayState: function (playState) {
    if (playState === 'WAITING') {
      return 'ANSWERING';
    }
    return 'WAITING';
  },

  getPlayerHUDImage(state, color) {
    let prefix    = 'alien',
        postfix   = '.png',
        statePart = '_front';
    switch (state) {
      case('CHOOSE'):
        statePart = '_jump';
        break;
      case('ANSWERING'):
        statePart = '_hit';
        break;
      case('WAITING'):
        statePart = '_swim1';
        break;
    }
    return prefix + color + statePart + postfix;
  },

  template() {
    var html = _template.getSource('game__playerstats');
    return _.template(html);
  },

  /**
   * Component HTML was attached to the DOM
   */
    componentDidMount() {
    this.animateFoodToss();
  },

  // TODO will not animate to local player
  animateFoodToss() {
    if (this.getState().questionDifficultyImage !== 'null.png' && this.getConfigProps().target === 'remote') {
      let foodImage = this.getDOMElement().querySelector('.game__playerstats-food'),
          startX, endX, endRot;

      endX = _domUtils.position(foodImage).left;

      startX = -700;
      endRot = 125;

      this.tweenSet(foodImage, {
        x       : startX,
        rotation: -360,
        scale   : 2
      });

      this.tweenTo(foodImage, 1, {
        scale   : 1,
        x       : 0,
        rotation: endRot,
        ease    : Quad.easeOut
      });
    }
  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount() {
  }

});

export default Component;