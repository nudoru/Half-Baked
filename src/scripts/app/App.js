var _rx             = require('../nori/utils/Rx.js'),
    _appActions     = require('./action/ActionCreator.js'),
    _noriActions    = require('../nori/action/ActionCreator.js'),
    _socketIOEvents = require('../nori/service/SocketIOEvents.js');

/**
 * "Controller" for a Nori application. The controller is responsible for
 * bootstrapping the app and possibly handling socket/server interaction.
 * Any additional functionality should be handled in a specific module.
 */
var App = Nori.createApplication({

  mixins: [],

  /**
   * Create the main Nori App store and view.
   */
  store : require('./store/AppStore.js'),
  view  : require('./view/AppView.js'),
  socket: require('../nori/service/SocketIO.js'),

  /**
   * Intialize the appilcation, view and store
   */
  initialize: function () {
    this.socket.initialize();
    this.socket.subscribe(this.handleSocketMessage.bind(this));

    this.view.initialize();

    this.store.initialize(); // store will acquire data dispatch event when complete
    this.store.subscribe('storeInitialized', this.onStoreInitialized.bind(this));
    this.store.loadStore();
  },

  /**
   * After the store data is ready
   */
  onStoreInitialized: function () {
    this.runApplication();
  },

  /**
   * Remove the "Please wait" cover and start the app
   */
  runApplication: function () {
    this.view.removeLoadingMessage();

    // View will show based on the current store state
    this.store.setState({currentState: 'PLAYER_SELECT'});
  },

  /**
   * All messages from the Socket.IO server will be forwarded here
   * @param payload
   */
  handleSocketMessage: function (payload) {
    if (!payload) {
      return;
    }

    console.log("from Socket.IO server", payload);

    switch (payload.type) {
      case (_socketIOEvents.CONNECT):
        this.handleConnect(payload.id);
        return;
      case (_socketIOEvents.JOIN_ROOM):
        console.log("join room", payload.payload);
        this.handleJoinNewlyCreatedRoom(payload.payload.roomID);
        return;
      case (_socketIOEvents.GAME_START):
        console.log("GAME STARTED");
        this.handleGameStart(payload.payload);
        return;
      case (_socketIOEvents.GAME_ABORT):
        this.handleGameAbort(payload);
        return;
      case (_socketIOEvents.SYSTEM_MESSAGE):
      case (_socketIOEvents.BROADCAST):
      case (_socketIOEvents.MESSAGE):
        this.view.alert(payload.payload, payload.type);
        return;
      default:
        console.warn("Unhandled SocketIO message type", payload);
        return;
    }
  },

  handleConnect: function (socketID) {
    var setSessionID = _appActions.setSessionProps({socketIOID: socketID}),
        setLocalID   = _appActions.setLocalPlayerProps({id: socketID});

    this.store.apply([setSessionID, setLocalID]);
  },

  handleJoinNewlyCreatedRoom: function (roomID) {
    var setRoom               = _appActions.setSessionProps({roomID: roomID}),
        setWaitingScreenState = _noriActions.changeStoreState({currentState: this.store.gameStates[2]});

    this.store.apply([setRoom, setWaitingScreenState]);
  },

  handleGameStart: function (payload) {
    var remotePlayer     = this.pluckRemotePlayer(payload.players),
        setRemotePlayer  = _appActions.setRemotePlayerProps(remotePlayer),
        setGamePlayState = _noriActions.changeStoreState({currentState: this.store.gameStates[3]});

    this.store.apply([setRemotePlayer, setGamePlayState]);
  },

  pluckRemotePlayer: function (playersArry) {
    var localPlayerID = this.store.getState().localPlayer.id;
    console.log('filtering for', localPlayerID, playersArry);
    return playersArry.filter(function (player) {
      return !(player.id === localPlayerID);
    })[0];
  },

  handleGameAbort: function (payload) {
    this.view.alert(payload.payload, payload.type);
    var setPlayerSelect = _noriActions.changeStoreState({currentState: this.store.gameStates[1]}),
        resetSession    = _appActions.setSessionProps({roomID: ''}),
        resetPlayer     = _appActions.setLocalPlayerProps(this.store.createPlayerResetObject());

    this.store.apply([resetPlayer, resetSession, setPlayerSelect]);
  },

});

module.exports = App;