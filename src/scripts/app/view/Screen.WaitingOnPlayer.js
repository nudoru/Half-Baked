import _noriActions from '../../nori/action/ActionCreator';
import _appView from './AppView';
import _appStore from '../store/AppStore';
import _template from '../../nori/view/Templating.js';
import _appActions from '../action/ActionCreator.js';

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponent({

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
      'click #waiting__button-skip'() {
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.getState().gameStates[3]}));
      },
      'click #waiting__button-goback'() {
        _appStore.apply(_appActions.resetGame());
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getDefaultState() {
    var appState = _appStore.getState();
    return {
      name      : appState.localPlayer.name,
      appearance: appState.localPlayer.appearance,
      roomID    : appState.session.roomID
    };
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate() {
    var appState = _appStore.getState();
    return {
      name      : appState.localPlayer.name,
      appearance: appState.localPlayer.appearance,
      roomID    : appState.session.roomID
    };
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount() {
    //
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount() {
    //
  }

});

export default Component;