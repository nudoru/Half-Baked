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
      localPlayerStats: _regionPlayerStats({
        id: 'game__playerstats',
        mountPoint: '#game__localplayerstats',
        target: 'local'
      }),
      remotePlayerStats: _regionPlayerStats({
        id: 'game__playerstats',
        mountPoint: '#game__remoteplayerstats',
        target: 'remote'
      })
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
      },
      'click #game__test': function () {
        var state = _appStore.getState(),
            localHealth = state.localPlayer.health+1;
            remoteHealth = state.remotePlayer.health-1;

        _appStore.apply(_appActions.setLocalPlayerProps({health: localHealth}));
        _appStore.apply(_appActions.setRemotePlayerProps({health: remoteHealth}));
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