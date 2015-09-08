var _noriActions = require('../../nori/action/ActionCreator'),
    _appView     = require('./AppView'),
    _appStore    = require('../store/AppStore'),
    _template    = require('../../nori/utils/Templating.js');

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

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
    return stats;
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

module.exports = Component;