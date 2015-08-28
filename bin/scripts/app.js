define('app/App',
  function (require, module, exports) {

    var _noriActionConstants = require('nori/action/ActionConstants');

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
        this.initializeApplication(); // validates setup

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

define('app/action/ActionConstants',
  function (require, module, exports) {
    var objUtils = require('nudoru/core/ObjectUtils');

    /**
     * Event name string constants
     */

    _.merge(module.exports, objUtils.keyMirror({
      CHANGE_GAME_STATE: null,
      LOCAL_PLAYER_CONNECT: null,
      SELECT_PLAYER: null,
      REMOTE_PLAYER_CONNECT: null,
      GAME_START: null,
      LOCAL_QUESTION: null,
      REMOTE_QUESTION: null,
      LOCAL_PLAYER_HEALTH_CHANGE: null,
      REMOTE_PLAYER_HEALTH_CHANGE: null,
      GAME_OVER: null
    }));
  });

define('app/Action/ActionCreator',
  function (require, module, exports) {

    var _actionConstants = require('app/action/ActionConstants');

    /**
     * Purely for convenience, an Event ("action") Creator ala Flux spec. Follow
     * guidelines for creating actions: https://github.com/acdlite/flux-standard-action
     */
    var ActionCreator = {

      mutateSomeData: function (data) {
        var actionObj = {
          type   : _actionConstants.MUTATION_TYPE,
          payload: {
            data: data
          }
        };

        return actionObj;
      }

    };

    module.exports = ActionCreator;

  });

define('app/model/AppModel',
  function (require, module, exports) {

    var _noriActions             = require('nori/action/ActionCreator'),
        _noriActionConstants     = require('nori/action/ActionConstants'),
        _mixinMapFactory        = require('nori/model/MixinMapFactory'),
        _mixinObservableSubject = require('nori/utils/MixinObservableSubject'),
        _mixinReducerModel      = require('nori/model/MixinReducerModel');

    /**
     * This application model contains "reducer model" functionality based on Redux.
     * The model state may only be changed from events as applied in reducer functions.
     * The model received all events from the event bus and forwards them to all
     * reducer functions to modify state as needed. Once they have run, the
     * handleStateMutation function is called to dispatch an event to the bus, or
     * notify subscribers via an observable.
     *
     * Events => handleApplicationEvents => applyReducers => handleStateMutation => Notify
     */
    var AppModel = Nori.createApplicationModel({

      mixins: [
        _mixinMapFactory,
        _mixinReducerModel,
        _mixinObservableSubject()
      ],

      gameStates: ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],

      initialize: function () {
        this.addReducer(this.defaultReducerFunction);
        this.initializeReducerModel();
        this.setState(Nori.config());
        this.createSubject('storeInitialized');
      },

      /**
       * Set or load any necessary data and then broadcast a initialized event.
       */
      loadStore: function () {
        this.setState({
          currentState: this.gameStates[0],
          localPlayer : {},
          remotePlayer: {},
          questionBank: []
        });

        this.notifySubscribersOf('storeInitialized');
      },

      createUserObject: function (id, type, name, appearance, behaviors) {
        return {
          id        : id,
          type      : type,
          name      : name,
          health    : health || 6,
          appearance: appearance,
          behaviors : behaviors || []
        };
      },

      createQuestionObject: function (prompt, distractors, pointValue) {
        return {
          prompt     : prompt,
          distractors: distractors,
          pointVaule : pointValue
        };
      },

      /**
       * Modify state based on incoming events. Returns a copy of the modified
       * state and does not modify the state directly.
       * Can compose state transformations
       * return _.assign({}, state, otherStateTransformer(state));
       * @param state
       * @param event
       * @returns {*}
       */
      defaultReducerFunction: function (state, event) {
        state = state || {};

        switch (event.type) {

          case _noriActionConstants.CHANGE_MODEL_STATE:
            return _.assign({}, state, event.payload.data);

          default:
            return state;
        }
      },

      /**
       * Called after all reducers have run to broadcast possible updates. Does
       * not check to see if the state was actually updated.
       */
      handleStateMutation: function () {
        //_noriActions.modelStateChanged(); // Eventbus
        this.notifySubscribers(this.getState());
      }

    });

    module.exports = AppModel;

  });


define('app/view/AppView',
  function (require, module, exports) {

    var _noriActions             = require('nori/action/ActionCreator'),
        _noriActionConstants     = require('nori/action/ActionConstants'),
        _mixinApplicationView   = require('nori/view/ApplicationView'),
        _mixinNudoruControls    = require('nori/view/MixinNudoruControls'),
        _mixinComponentViews    = require('nori/view/MixinComponentViews'),
        _mixinModelStateViews   = require('nori/view/MixinModelStateViews'),
        _mixinEventDelegator    = require('nori/view/MixinEventDelegator'),
        _mixinObservableSubject = require('nori/utils/MixinObservableSubject');

    /**
     * View for an application.
     */

    var AppView = Nori.createApplicationView({

      mixins: [
        _mixinApplicationView,
        _mixinNudoruControls,
        _mixinComponentViews,
        _mixinModelStateViews,
        _mixinEventDelegator(),
        _mixinObservableSubject()
      ],

      initialize: function () {
        this.initializeApplicationView(['applicationscaffold', 'applicationcomponentsscaffold']);
        this.initializeStateViews();
        this.initializeNudoruControls();

        this.configureViews();
      },

      configureViews: function () {
        var screenTitle           = require('app/view/Screen.Title')(),
            screenPlayerSelect    = require('app/view/Screen.PlayerSelect')(),
            screenWaitingOnPlayer = require('app/view/Screen.WaitingOnPlayer')(),
            screenMainGame        = require('app/view/Screen.MainGame')(),
            screenGameOver        = require('app/view/Screen.GameOver')(),
            gameStates            = Nori.model().gameStates;

        this.setViewMountPoint('#contents');

        this.mapStateToViewComponent(gameStates[0], 'title', screenTitle);
        this.mapStateToViewComponent(gameStates[1], 'playerselect', screenPlayerSelect);
        this.mapStateToViewComponent(gameStates[2], 'waitingonplayer', screenWaitingOnPlayer);
        this.mapStateToViewComponent(gameStates[3], 'game', screenMainGame);
        this.mapStateToViewComponent(gameStates[4], 'gameover', screenGameOver);

      },

      /**
       * Draw and UI to the DOM and set events
       */
      render: function () {
        /* Sample event delegator syntax
         this.setEvents({
         'click #button-id': handleButton
         });
         this.delegateEvents();
         */
      },

    });

    module.exports = AppView;

  });

define('app/view/DebugControlsTestingSubView',
  function (require, module, exports) {

    /**
     * Module for testing Nudoru component classes and any thing else
     */
    var DebugComponent = function () {

      var _lIpsum             = require('nudoru/browser/Lorem'),
          _toolTip            = require('nudoru/component/ToolTipView'),
          _noriActionConstants = require('nori/action/ActionConstants'),
          _actionOneEl,
          _actionTwoEl,
          _actionThreeEl,
          _actionFourEl,
          _actionFiveEl,
          _actionSixEl;

      function initialize(initObj) {
        _lIpsum.initialize();
      }

      function componentDidMount() {
        console.log(this.getID() + ', subview did mount');

        _actionOneEl   = document.getElementById('action-one');
        _actionTwoEl   = document.getElementById('action-two');
        _actionThreeEl = document.getElementById('action-three');
        _actionFourEl  = document.getElementById('action-four');
        _actionFiveEl  = document.getElementById('action-five');
        _actionSixEl   = document.getElementById('action-six');

        //_toolTip.add({title:'', content:"This is a button, it's purpose is unknown.", position:'TR', targetEl: _actionFourEl, type:'information'});
        //_toolTip.add({title:'', content:"This is a button, click it and rainbows will appear.", position:'BR', targetEl: _actionFourEl, type:'success'});
        //_toolTip.add({title:'', content:"This is a button, it doesn't make a sound.", position:'BL', targetEl: _actionFourEl, type:'warning'});
        //_toolTip.add({title:'', content:"This is a button, behold the magic and mystery.", position:'TL', targetEl: _actionFourEl, type:'danger'});

        _toolTip.add({
          title   : '',
          content : "This is a button, you click it dummy. This is a button, you click it dummy. ",
          position: 'L',
          targetEl: _actionFourEl,
          type    : 'information'
        });
        _toolTip.add({
          title   : '',
          content : "This is a button, you click it dummy. This is a button, you click it dummy. ",
          position: 'B',
          targetEl: _actionFourEl,
          type    : 'information'
        });
        _toolTip.add({
          title   : '',
          content : "This is a button, you click it dummy. This is a button, you click it dummy. This is a button, you click it dummy. ",
          position: 'R',
          targetEl: _actionFourEl,
          type    : 'information'
        });
        _toolTip.add({
          title   : '',
          content : "This is a button, you click it dummy. This is a button, you click it dummy. This is a button, you click it dummy. This is a button, you click it dummy. ",
          position: 'T',
          targetEl: _actionFourEl,
          type    : 'information'
        });


        _actionOneEl.addEventListener('click', function actOne(e) {
          Nori.view().addMessageBox({
            title  : _lIpsum.getSentence(2, 4),
            content: _lIpsum.getParagraph(2, 4),
            type   : 'warning',
            modal  : true,
            width  : 500
          });
        });

        _actionTwoEl.addEventListener('click', function actTwo(e) {
          Nori.view().addMessageBox({
            title  : _lIpsum.getSentence(10, 20),
            content: _lIpsum.getParagraph(2, 4),
            type   : 'default',
            modal  : false,
            buttons: [
              {
                label  : 'Yes',
                id     : 'yes',
                type   : 'default',
                icon   : 'check',
                onClick: function () {
                  console.log('yes');
                }
              },
              {
                label  : 'Maybe',
                id     : 'maybe',
                type   : 'positive',
                icon   : 'cog',
                onClick: function () {
                  console.log('maybe');
                }
              },
              {
                label: 'Nope',
                id   : 'nope',
                type : 'negative',
                icon : 'times'
              }
            ]
          });
        });

        _actionThreeEl.addEventListener('click', function actThree(e) {
          Nori.view().addNotification({
            title  : _lIpsum.getSentence(3, 6),
            type   : 'information',
            content: _lIpsum.getParagraph(1, 2)
          });

          _toolTip.remove(_actionFourEl);
        });

        _actionFourEl.addEventListener('click', function actFour(e) {
          console.log('Four');
        });

        _actionFiveEl.addEventListener('click', function actFour(e) {
          Nori.dispatcher().publish({
            type   : _noriActionConstants.CHANGE_ROUTE,
            payload: {
              route: '/one',
              data : {prop: 'some data', moar: '25'}
            }
          });
        });

        _actionSixEl.addEventListener('click', function actFour(e) {
          Nori.dispatcher().publish({
            type   : _noriActionConstants.CHANGE_ROUTE,
            payload: {route: '/styles', data: 'test'}
          });
        });

      }

      return {
        initialize       : initialize,
        componentDidMount: componentDidMount
      };

    };

    module.exports = DebugComponent;


  });

define('app/view/Screen.GameOver',
  function (require, module, exports) {

    var _noriActions = require('nori/action/ActionCreator'),
        _appEvents = require('app/action/ActionConstants');

    /**
     * Module for a dynamic application view for a route or a persistent view
     */
    var Component = Nori.view().createComponentView({

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
      defineEvents: function() {
        return {
          'click #gameover__button-replay': function() {
            APP.model().apply(_noriActions.changeModelState({currentState:Nori.model().gameStates[1]}));
          }
        };
      },

      /**
       * Set initial state properties. Call once on first render
       */
      getInitialState: function () {
        return APP.model().getState();
      },

      /**
       * State change on bound models (map, etc.) Return nextState object
       */
      componentWillUpdate: function () {
        var nextState = APP.model().getState();
        nextState.greeting += ' (updated)';
        return nextState;
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

  });

define('app/view/Screen.MainGame',
  function (require, module, exports) {

    var _noriActions = require('nori/action/ActionCreator'),
        _appEvents = require('app/action/ActionConstants');

    /**
     * Module for a dynamic application view for a route or a persistent view
     */
    var Component = Nori.view().createComponentView({

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
      defineEvents: function() {
        return {
          'click #game__button-skip': function() {
            APP.model().apply(_noriActions.changeModelState({currentState:Nori.model().gameStates[4]}));
          }
        };
      },

      /**
       * Set initial state properties. Call once on first render
       */
      getInitialState: function () {
        return APP.model().getState();
      },

      /**
       * State change on bound models (map, etc.) Return nextState object
       */
      componentWillUpdate: function () {
        var nextState = APP.model().getState();
        nextState.greeting += ' (updated)';
        return nextState;
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

  });

define('app/view/Screen.PlayerSelect',
  function (require, module, exports) {

    var _noriActions = require('nori/action/ActionCreator'),
        _appEvents  = require('app/action/ActionConstants');

    /**
     * Module for a dynamic application view for a route or a persistent view
     */
    var Component = Nori.view().createComponentView({

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
      defineEvents: function() {
        return {
          'click #select__button-joinroom'  : this.onJoinRoom.bind(this),
          'click #select__button-createroom': this.onCreateRoom.bind(this),
          'click #select__button-go'        : function () {
            APP.model().apply(_noriActions.changeModelState({currentState:Nori.model().gameStates[2]}));
          }
        };
      },

      /**
       * Set initial state properties. Call once on first render
       */
      getInitialState: function () {
        return APP.model().getState();
      },

      /**
       * State change on bound models (map, etc.) Return nextState object
       */
      componentWillUpdate: function () {
        var nextState = APP.model().getState();
        nextState.greeting += ' (updated)';
        return nextState;
      },

      /**
       * Component HTML was attached to the DOM
       */
      componentDidMount: function () {

      },

      onJoinRoom: function () {
        var roomID = document.querySelector('#select__roomid').value;
        console.log('Join room '+roomID);
        if(this.validateRoomID(roomID)) {
          console.log('Room ID OK');
          _noriActions.notifyUser('','Room ID ok!');
        } else {
          _noriActions.alertUser('Bad Room ID','The room ID is not correct. Must be a 5 digit number.');
        }
      },

      /**
       * Room ID must be an integer and 5 digits
       * @param roomID
       * @returns {boolean}
       */
      validateRoomID: function(roomID) {
        if(isNaN(parseInt(roomID))) {
          return false;
        } else if(roomID.length !== 5) {
          return false;
        }
        return true;
      },

      onCreateRoom: function () {
        console.log('create room');
      },

      /**
       * Component will be removed from the DOM
       */
      componentWillUnmount: function () {
        //
      }

    });

    module.exports = Component;

  });

define('app/view/Screen.Title',
  function (require, module, exports) {

    var _noriActions = require('nori/action/ActionCreator'),
        _appEvents = require('app/action/ActionConstants');

    /**
     * Module for a dynamic application view for a route or a persistent view
     */
    var Component = Nori.view().createComponentView({

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
      defineEvents: function() {
        return {
          'click #title__button-start': function() {
            APP.model().apply(_noriActions.changeModelState({currentState:Nori.model().gameStates[1]}));
          }
        };
      },

      /**
       * Set initial state properties. Call once on first render
       */
      getInitialState: function () {
        return APP.model().getState();
      },

      /**
       * State change on bound models (map, etc.) Return nextState object
       */
      componentWillUpdate: function () {
        var nextState = APP.model().getState();
        nextState.greeting += ' (updated)';
        return nextState;
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

  });

define('app/view/Screen.WaitingOnPlayer',
  function (require, module, exports) {

    var _noriActions = require('nori/action/ActionCreator'),
        _appEvents = require('app/action/ActionConstants');

    /**
     * Module for a dynamic application view for a route or a persistent view
     */
    var Component = Nori.view().createComponentView({

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
      defineEvents: function() {
        return {
          'click #waiting__button-skip': function() {
            APP.model().apply(_noriActions.changeModelState({currentState:Nori.model().gameStates[3]}));
          }
        };
      },

      /**
       * Set initial state properties. Call once on first render
       */
      getInitialState: function () {
        return APP.model().getState();
      },

      /**
       * State change on bound models (map, etc.) Return nextState object
       */
      componentWillUpdate: function () {
        var nextState = APP.model().getState();
        nextState.greeting += ' (updated)';
        return nextState;
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

  });

define('app/view/TemplateViewComponent',
  function (require, module, exports) {

    /**
     * Module for a dynamic application view for a route or a persistent view
     */

    var Component = Nori.view().createComponentView({
      /**
       * Mixins are other modules/objects that multiple components share, provides
       * common functionality between then.
       */
      //mixins: [
      //  {
      //    render: function () {
      //      return '<h1>MIXIN!</h1>';
      //    }
      //  }
      //],

      /**
       * Initialize and bind, called once on first render. Parent component is
       * initialized from app view
       * @param configProps
       */
      initialize: function (configProps) {
        //Bind to a map, update will be called on changes to the map
        //this.bindMap(map id string or map object);
        //this.bindMap(APP.model());
        //custom init below here
        //this.setTemplate('<h1>{{ greeting }}</h1>'); // set custom HTML template
      },

      /**
       * Create an object to be used to define events on DOM elements
       * @returns {}
       */
      //defineEvents: function() {
      //  return {
      //    'click #button-id': handleButton
      //  };
      //},

      /**
       * Set initial state properties. Call once on first render
       */
      getInitialState: function () {
        return APP.model().getState();
      },

      /**
       * State change on bound models (map, etc.) Return nextState object
       */
      componentWillUpdate: function () {
        var nextState = APP.model().getState();
        nextState.greeting += ' (updated)';
        return nextState;
      },

      /**
       * Determine if update/redraw should occur
       * @param nextState
       * @returns {*}
       */
      //shouldComponentUpdate: function(nextState) {
      //  // Test for differences between nextState and this.getState()
      //},

      /**
       * Render override must return HTML.
       */
      //render: function() {
      //  var state = this.getState();
      //  return '<h1>'+state.greeting+'</h1>';
      //},

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
        // Clean up
      }

    });

    module.exports = Component;

  });

define('app/view/TemplateViewComponentFactory',
  function (require, module, exports) {

    /**
     * Module for a dynamic application view for a route or a persistent view
     * implemented as a factory module.
     */
    var Component = function () {

      /**
       * Initialize subview
       * @param configProps {id, template, mountPoint}
       */
      function initialize(configProps) {
        //this.bindMap(map id string or map object);
        // custom init below here
      }

      /**
       * State change on bound models (map, etc.) Update the component state
       */
      function componentWillUpdate() {
        var obj = Object.create(null);
        // Update state from stores
        this.setState(obj);
      }

      /**
       * Component HTML was attached to the DOM
       */
      function componentDidMount() {
        /*
         this.setEvents({
         'click #button-id': handleButton
         });
         this.delegateEvents();
         */
      }

      /**
       * Component will be removed from the DOM
       */
      function componentWillUnmount() {
        // cleanup
      }

      return {
        initialize          : initialize,
        componentWillUpdate : componentWillUpdate,
        componentDidMount   : componentDidMount,
        componentWillUnmount: componentWillUnmount
      };

    };

    module.exports = Component;

  });

(function () {

  var _browserInfo = require('nudoru/browser/BrowserInfo');

  /**
   * IE versions 9 and under are blocked, others are allowed to proceed
   */
  if(_browserInfo.notSupported || _browserInfo.isIE9) {

    document.querySelector('body').innerHTML = '<h3>For the best experience, please use Internet Explorer 10+, Firefox, Chrome or Safari to view this application.</h3>';

  } else {

    /**
     * Create the application module and initialize
     */
    window.onload = function() {
      window.APP = require('app/App');
      APP.initialize()
    };

  }

}());