import * as _noriActions from '../../nori/action/ActionCreator';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponentView({

  /**
   * configProps passed in from region definition on parent View
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize: function (configProps) {
    this.bindMap(_appStore); // Reducer store, map id string or map object
  },


  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function () {
    return null;
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function () {
    var appState = _appStore.getState(),
        stats    = appState.localPlayer;

    if (this.getConfigProps().target === 'remote') {
      stats = appState.remotePlayer;
    }
    
    stats.playerImage = this.getPlayerHUDImage(appState.currentPlayState, stats.appearance);

    return stats;
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function () {
    var appState = _appStore.getState(),
        stats    = appState.localPlayer;

    if (this.getConfigProps().target === 'remote') {
      stats = appState.remotePlayer;
    }

    stats.playerImage = this.getPlayerHUDImage(appState.currentPlayState, stats.appearance);

    return stats;
  },

  getPlayerHUDImage: function (state, color) {
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

  template: function () {
    var html = _template.getSource('game__playerstats');
    return _.template(html);
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