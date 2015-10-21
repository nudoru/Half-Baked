import _noriActions from '../../nori/action/ActionCreator';
import _appView from './AppView';
import _appStore from '../store/AppStore';
import _template from '../../nori/view/Templating.js';
import _appActions from '../action/ActionCreator.js';
import _mixinDOMManipulation from '../../nori/view/MixinDOMManipulation.js';

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
    initialize(configProps) {
    //
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
    getDOMEvents() {
    return {
      'click #gameover__button-replay'() {
        _appStore.apply(_appActions.resetGame());
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
    getInitialState() {
    let appState = _appStore.getState(),
        state    = {
          name       : appState.localPlayer.name,
          appearance : appState.localPlayer.appearance,
          localScore : appState.localPlayer.score,
          remoteScore: appState.remotePlayer.score,
          localWin   : appState.localPlayer.score > appState.remotePlayer.score,
          remoteWin  : appState.localPlayer.score < appState.remotePlayer.score,
          tieWin     : appState.localPlayer.score === appState.remotePlayer.score,
          playerImage: ''
        };

    state = this.getPlayerImage(state);

    return state;
  },

  getPlayerImage(state) {
    let prefix    = 'alien',
        color     = state.appearance,
        postfix   = '.png',
        statePart = '_swim2';

    if(state.remoteWin) {
      statePart = '_hit';
    } else if(state.tieWin) {
      statePart = '_duck';
    }

    state.playerImage = prefix + color + statePart + postfix;

    return state;
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
    componentWillUpdate() {
    return {};
  },

  /**
   * Component HTML was attached to the DOM
   */
    componentDidMount() {
    let state = this.state;

    this.hideEl('#gameover__win');
    this.hideEl('#gameover__tie');
    this.hideEl('#gameover__loose');

    if (state.localWin) {
      this.showEl('#gameover__win');
    } else if (state.remoteWin) {
      this.showEl('#gameover__loose');
    } else if (state.tieWin) {
      this.showEl('#gameover__tie');
    }
  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount() {
    //
  }

});

export default Component;