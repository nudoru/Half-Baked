var _rx          = require('../nori/utils/Rx.js'),
    _appActions  = require('./action/ActionCreator.js'),
    _noriActions = require('../nori/action/ActionCreator.js'),
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
    this.view.render();

    // View will show based on the current store state
    this.store.setState({currentState: 'PLAYER_SELECT'});

    // Test ping
    //_rx.doEvery(1000, 3, () => this.socket.ping());
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
        //console.log("Connected!");
        this.store.setState({socketIOID: payload.id});
        return;
      case (_socketIOEvents.USER_CONNECTED):
        //console.log("Another client connected");
        return;
      case (_socketIOEvents.USER_DISCONNECTED):
        //console.log("Another client disconnected");
        return;
      case (_socketIOEvents.DROPPED):
        //console.log("You were dropped!", payload.payload);
        return;
      case (_socketIOEvents.SYSTEM_MESSAGE):
        console.log("System message", payload.payload);
        return;
      case (_socketIOEvents.CREATE_ROOM):
        //console.log("create room");
        return;
      case (_socketIOEvents.JOIN_ROOM):
        //console.log("join room", payload.payload);
        this.handleJoinNewlyCreatedRoom(payload.payload.roomID);
        return;
      case (_socketIOEvents.LEAVE_ROOM):
        //console.log("leave room");
        return;
      case (_socketIOEvents.GAME_START):
        console.log("GAME STARTED");
        this.handleGameStart();
        return;
      case (_socketIOEvents.GAME_END):
        //console.log("Game ended");
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

  handleJoinNewlyCreatedRoom: function (roomID) {
    var setRoom               = _appActions.setSessionProps({roomID: roomID}),
        setWaitingScreenState = _noriActions.changeStoreState({currentState: this.store.gameStates[2]});

    this.store.apply(setRoom);
    this.store.apply(setWaitingScreenState);
  },

  handleGameStart: function (roomID) {
    console.log('Starting game');
    var setGamePlayState = _noriActions.changeStoreState({currentState: this.store.gameStates[3]});
    this.store.apply(setGamePlayState);
  }

});

module.exports = App;