import * as _noriActions from '../../nori/action/ActionCreator';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';
import * as _mixinDOMManipulation from '../../nori/view/MixinDOMManipulation.js';
import * as _domUtils from '../../nudoru/browser/DOMUtils.js';
import * as _rx from '../../nori/utils/Rx.js';

let _difficultyImages = ['pastry_cookie01.png', 'pastry_poptart01.png', 'pastry_donut.png', 'pastry_pie.png', 'pastry_cupcake.png'],
    _gamePlayStates   = ['CHOOSE', 'ANSWERING', 'WAITING'],
    _foodAnimationSub = null;

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
    let appState = _appStore.getState(),
        stats,
        localQ   = false,
        remoteQ  = false,
        dlevel,
        dimage   = 'null.png';

    if (this.getConfigProps().target === 'local') {
      stats = appState.localPlayer;
      if (appState.currentQuestion) {
        localQ = true;
        dlevel = appState.currentQuestion.question.q_difficulty_level - 1;
        dimage = _difficultyImages[dlevel];
      }
    } else {
      stats = appState.remotePlayer;
      if (appState.sentQuestion.q_difficulty_level >= 0) {
        remoteQ = true;
        dlevel  = appState.sentQuestion.q_difficulty_level - 1;
        dimage  = _difficultyImages[dlevel];
      }
    }

    // TODO determine state from questions, present or not
    // TODO remote needs to be opposite local
    stats.playerImage             = this.getPlayerHUDImage('CHOOSE', stats.appearance);
    stats.questionDifficultyImage = dimage;
    stats.localQ                  = localQ;
    stats.remoteQ                 = remoteQ;

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

  /**
   * Component HTML was attached to the DOM
   */
    componentDidMount() {
    if (_foodAnimationSub) {
      _foodAnimationSub.dispose();
    }

    // Needs a 1ms delay
    _foodAnimationSub = _rx.doEvery(1, 1, this.animateFoodToss.bind(this));
  },

  // TODO will not animate to local player
  animateFoodToss() {
    // && this.getConfigProps().target === 'remote'
    if (this.getState().questionDifficultyImage !== 'null.png') {

      let foodImage = this.getDOMElement().querySelector('.game__playerstats-food'),
          startS, startX, endRot;

      endX = _domUtils.position(foodImage).left;

      if (this.getConfigProps().target === 'local') {
        startX = 700;
        endRot = -125;
        startS = 15;
      } else {
        startX = -700;
        endRot = 125;
        startS = 2;
      }

      this.tweenFromTo(foodImage, 1, {
        x       : startX,
        rotation: -720,
        scale   : startS
      }, {
        scale   : 1,
        x       : 0,
        rotation: endRot,
        ease    : Circ.easeOut
      });
    } else {
      //
    }

    _foodAnimationSub.dispose();
  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount() {
  }

});

export default Component;