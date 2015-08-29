define('app/App',
  function (require, module, exports) {

    var _rx = require('nori/utils/Rx');

    /**
     * "Controller" for a Nori application. The controller is responsible for
     * bootstrapping the app and possibly handling socket/server interaction.
     * Any additional functionality should be handled in a specific module.
     */
    var App = Nori.createApplication({

      mixins: [],

      /**
       * Create the main Nori App model and view.
       */
      appModel: require('app/model/AppModel'),
      appView : require('app/view/AppView'),
      socket  : require('nori/service/SocketIO'),

      /**
       * Intialize the appilcation, view and model
       */
      initialize: function () {
        this.initializeApplication(); // validates setup

        this.socket.initialize();

        this.view().initialize();

        this.model().initialize(); // model will acquire data dispatch event when complete
        this.model().subscribe('storeInitialized', this.onStoreInitialized.bind(this));
        this.model().loadStore();
      },

      /**
       * After the model data is ready
       */
      onStoreInitialized: function () {
        this.runApplication();
      },

      /**
       * Remove the "Please wait" cover and start the app
       */
      runApplication: function () {
        this.view().removeLoadingMessage();
        this.view().render();

        // View will show based on the current model state
        this.model().setState({currentState:'PLAYER_SELECT'});

        //_rx.interval(500).take(5).subscribe(function() {
        //  this.socket.ping();
        //}.bind(this));
        //_rx.doEvery(1000, function() {
        //  this.socket.ping();
        //}.bind(this));
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
            this.model().setState({socketIOID: payload.id});
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

  });