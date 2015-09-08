var _noriActions       = require('../../nori/action/ActionCreator.js'),
    _appActions        = require('../action/ActionCreator.js'),
    _appView           = require('./AppView.js'),
    _appStore          = require('../store/AppStore.js'),
    _socketIO          = require('../../nori/service/SocketIO.js'),
    _template          = require('../../nori/utils/Templating.js'),
    _regionPlayerStats = require('./Region.PlayerStats.js');

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

  defineRegions: function() {
    return {
      localPlayerStats: _regionPlayerStats()
    };
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function () {
    return {
      'click #game__button-skip': function () {
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.gameStates[4]}));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function () {
    var appState = _appStore.getState();
    console.log(appState);
    return {
      local : appState.localPlayer,
      remote: appState.remotePlayer
    };
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

  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function () {
    //
  }

});

module.exports = Component;