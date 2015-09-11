import * as _noriActions from '../../nori/action/ActionCreator';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

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
      'click #waiting__button-skip': function () {
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.gameStates[3]}));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function () {
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
  componentWillUpdate: function () {
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
  componentDidMount: function () {
    //
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function () {
    //
  }

});

export default Component;