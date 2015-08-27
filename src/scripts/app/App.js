define('app/App',
  function (require, module, exports) {

    var _noriEventConstants = require('nori/events/EventConstants');

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
      //socket  : require('nori/service/SocketIO'),

      /**
       * Intialize the appilcation, view and model
       */
      initialize: function () {
        // listen for the model loaded event
        Nori.dispatcher().subscribe(_noriEventConstants.APP_MODEL_INITIALIZED, this.onModelInitialized.bind(this), true);

        //this.socket.initialize();
        //this.socket.subscribe(this.handleSocketMessage.bind(this));

        this.initializeApplication(); // validates setup

        this.view().initialize();
        this.model().initialize(); // model will acquire data dispatch event when complete
      },

      /**
       * After the model data is ready
       */
      onModelInitialized: function () {
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