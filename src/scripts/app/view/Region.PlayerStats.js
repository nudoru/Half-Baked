var _noriActions = require('../../nori/action/ActionCreator'),
    _appView     = require('./AppView'),
    _appStore    = require('../store/AppStore'),
    _template    = require('../../nori/utils/Templating.js');

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
    this.bindMap(_appStore); // Reducer store, map id string or map object
  },

  configuration: function() {
    return {
      id: 'game__playerstats',
      mountPoint: '#game__localplayerstats'
    }
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
    return _appStore.getState().localPlayer;
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function () {
    return _appStore.getState().localPlayer;
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