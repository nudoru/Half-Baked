/*
 TODO
 [ ] Set appearance drop down on selected appearance state


 */

var _noriActions = require('../../nori/action/ActionCreator.js'),
    _appActions  = require('../action/ActionCreator.js'),
    _appView     = require('./AppView.js'),
    _appStore    = require('../store/AppStore.js'),
    _socketIO    = require('../../nori/service/SocketIO.js'),
    _numUtils    = require('../../nudoru/core/NumberUtils.js');

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
      'blur #select__playername'        : this.setPlayerName.bind(this),
      'change #select__playertype'      : this.setPlayerAppearance.bind(this),
      'click #select__button-joinroom'  : this.onJoinRoom.bind(this),
      'click #select__button-createroom': this.onCreateRoom.bind(this),
      'click #select__button-go'        : function () {
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.gameStates[2]}));
      }
    };
  },

  setPlayerName: function () {
    //console.log('player name: ', document.querySelector('#select__playername').value);
    var action = _appActions.setLocalPlayerProps({
      name: document.querySelector('#select__playername').value
    });
    _appStore.apply(action);
  },

  setPlayerAppearance: function () {
    //console.log('player appearance: ', document.querySelector('#select__playertype').value);
    var action = _appActions.setLocalPlayerProps({
      appearance: document.querySelector('#select__playertype').value
    });
    _appStore.apply(action);
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function () {
    var appState = _appStore.getState();
    return {
      name      : appState.localPlayer.name || 'Mystery Player ' + _numUtils.rndNumber(100, 999),
      appearance: appState.localPlayer.appearance
    };
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function () {
    var appState = _appStore.getState();
    return {
      name      : appState.localPlayer.name,
      appearance: appState.localPlayer.appearance
    };
  },

  /**
   * Component HTML was attached to the DOM
   */
  //componentDidMount: function () {
  //  //
  //},

  onJoinRoom: function () {
    var roomID = document.querySelector('#select__roomid').value;
    console.log('Join room ' + roomID);
    if (this.validateRoomID(roomID)) {
      console.log('Room ID OK');
      _socketIO.notifyServer(_socketIO.events().JOIN_ROOM, {
        id        : roomID,
        playerName: this.getState().name
      });
    } else {
      _appView.alert('Bad Room ID', 'The room ID is not correct. Must be a 5 digit number.');
    }
  },

  /**
   * Room ID must be an integer and 5 digits
   * @param roomID
   * @returns {boolean}
   */
  validateRoomID: function (roomID) {
    if (isNaN(parseInt(roomID))) {
      return false;
    } else if (roomID.length !== 5) {
      return false;
    }
    return true;
  },

  onCreateRoom: function () {
    console.log('create room');
    _socketIO.notifyServer(_socketIO.events().CREATE_ROOM, {playerName: this.getState().name});
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function () {
    //
  }

});

module.exports = Component;