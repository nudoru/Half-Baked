var _rx = require('../nori/utils/Rx.js');

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

    _rx.doEvery(1000, 3, () => this.socket.ping());
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
      case (this.socket.events().CONNECT):
        console.log("Connected!");
        this.store.setState({socketIOID: payload.id});
        return;
      case (this.socket.events().USER_CONNECTED):
        console.log("Another client connected");
        return;
      case (this.socket.events().USER_DISCONNECTED):
        console.log("Another client disconnected");
        return;
      case (this.socket.events().DROPPED):
        console.log("You were dropped!", payload.payload);
        return;
      case (this.socket.events().SYSTEM_MESSAGE):
        console.log("System message", payload.payload);
        return;
      case (this.socket.events().CREATE_ROOM):
        console.log("create room");
        return;
      case (this.socket.events().JOIN_ROOM):
        console.log("join room");
        return;
      case (this.socket.events().LEAVE_ROOM):
        console.log("leave room");
        return;
      default:
        console.warn("Unhandled SocketIO message type", payload);
        return;
    }
  }

});

module.exports = App;