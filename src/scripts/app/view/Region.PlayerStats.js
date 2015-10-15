import _noriActions from '../../nori/action/ActionCreator';
import _appView from './AppView';
import _appStore from '../store/AppStore';
import _template from '../../nori/utils/Templating.js';
import _mixinDOMManipulation from '../../nori/view/MixinDOMManipulation.js';
import _domUtils from '../../nudoru/browser/DOMUtils.js';
import _rx from '../../nori/utils/Rx.js';

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
    this.bind(_appStore); // Reducer store, map id string or map object
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
        playState,
        dlevel,
        dimage   = 'null.png';

    if (this.props.target === 'local') {
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

    stats.localQ  = localQ;
    stats.remoteQ = remoteQ;

    playState = this.getPlayState(stats);

    // TODO remote needs to be opposite local
    stats.playerImage             = this.getPlayerHUDImage(playState, stats.appearance);
    stats.questionDifficultyImage = dimage;

    return stats;
  },

  getPlayState(playState) {
    let isLocal = this.props.target === 'local',
        local   = playState.localQ,
        remote  = playState.remoteQ;

    if (!local && !remote) {
      return 'CHOOSE';
    }

    if ((isLocal && local) || (!isLocal && remote)) {
      return 'ANSWERING';
    }

    return 'WAITING';

  },

  //'CHOOSE', 'ANSWERING', 'WAITING'
  getOppositePlayState(playState) {
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
    //_foodAnimationSub = _rx.doEvery(1, 1, this.animateFoodToss.bind(this));
    this.animateFoodToss();
  },

  // TODO will not animate to local player
  animateFoodToss() {
    if (this.state.questionDifficultyImage !== 'null.png') {

      let foodImage = this.getDOMElement().querySelector('.game__playerstats-food'),
          startS, startX, endRot;

      endX = _domUtils.position(foodImage).left;

      if (this.props.target === 'local') {
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
    }
  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount() {
  }

});

export default Component;