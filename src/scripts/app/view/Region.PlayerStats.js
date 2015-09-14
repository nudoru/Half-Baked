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
    return this.getHUDState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function () {
    return this.getHUDState();
  },

  getHUDState: function() {
    var appState = _appStore.getState(),
        stats;

    if (this.getConfigProps().target === 'local') {
      stats = appState.localPlayer;
      stats.playerImage = this.getPlayerHUDImage(appState.currentPlayState, stats.appearance);
    } else {
      stats = appState.remotePlayer;
      stats.playerImage = this.getPlayerHUDImage(this.getOppositePlayState(appState.currentPlayState), stats.appearance);
    }

    return stats;
  },

  //'CHOOSE', 'ANSWERING', 'WAITING'
  getOppositePlayState: function(playState) {
    //if(playState === 'CHOOSE') {
    //
    //} else if(playState === 'ANSWERING') {
    //
    //}
    return 'WAITING';
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