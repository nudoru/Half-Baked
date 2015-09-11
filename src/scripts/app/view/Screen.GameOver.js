import * as _noriActions from '../../nori/action/ActionCreator';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';
import * as _appActions from '../action/ActionCreator.js';
import * as _mixinDOMManipulation from '../../nori/view/MixinDOMManipulation.js';

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
  initialize: function (configProps) {
    //
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function () {
    return {
      'click #gameover__button-replay': function () {
        _appStore.apply(_appActions.resetGame());
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function () {
    let appState = _appStore.getState(),
        state    = {
          name       : appState.localPlayer.name,
          appearance : appState.localPlayer.appearance,
          localScore : appState.localPlayer.score,
          remoteScore: appState.remotePlayer.score,
          localWin   : appState.localPlayer.score > appState.remotePlayer.score,
          remoteWin  : appState.localPlayer.score < appState.remotePlayer.score,
          tieWin     : appState.localPlayer.score === appState.remotePlayer.score
        };
    return state;
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
    let state = this.getState();

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
  componentWillUnmount: function () {
    //
  }

});

export default Component;