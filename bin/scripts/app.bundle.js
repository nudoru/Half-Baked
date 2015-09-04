(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var _rx = require('../nori/utils/Rx.js'),
    _appActions = require('./action/ActionCreator.js'),
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
  store: require('./store/AppStore.js'),
  view: require('./view/AppView.js'),
  socket: require('../nori/service/SocketIO.js'),

  /**
   * Intialize the appilcation, view and store
   */
  initialize: function initialize() {
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
  onStoreInitialized: function onStoreInitialized() {
    this.runApplication();
  },

  /**
   * Remove the "Please wait" cover and start the app
   */
  runApplication: function runApplication() {
    this.view.removeLoadingMessage();
    this.view.render();

    // View will show based on the current store state
    this.store.setState({ currentState: 'PLAYER_SELECT' });

    // Test ping
    //_rx.doEvery(1000, 3, () => this.socket.ping());
  },

  /**
   * All messages from the Socket.IO server will be forwarded here
   * @param payload
   */
  handleSocketMessage: function handleSocketMessage(payload) {
    if (!payload) {
      return;
    }

    console.log("from Socket.IO server", payload);
    switch (payload.type) {
      case _socketIOEvents.CONNECT:
        //console.log("Connected!");
        this.store.setState({ socketIOID: payload.id });
        return;
      case _socketIOEvents.USER_CONNECTED:
        //console.log("Another client connected");
        return;
      case _socketIOEvents.USER_DISCONNECTED:
        //console.log("Another client disconnected");
        return;
      case _socketIOEvents.DROPPED:
        //console.log("You were dropped!", payload.payload);
        return;
      case _socketIOEvents.SYSTEM_MESSAGE:
        console.log("System message", payload.payload);
        return;
      case _socketIOEvents.CREATE_ROOM:
        //console.log("create room");
        return;
      case _socketIOEvents.JOIN_ROOM:
        //console.log("join room", payload.payload);
        this.handleJoinNewlyCreatedRoom(payload.payload.roomID);
        return;
      case _socketIOEvents.LEAVE_ROOM:
        //console.log("leave room");
        return;
      case _socketIOEvents.GAME_START:
        console.log("GAME STARTED");
        this.handleGameStart();
        return;
      case _socketIOEvents.GAME_END:
        //console.log("Game ended");
        return;
      case _socketIOEvents.SYSTEM_MESSAGE:
      case _socketIOEvents.BROADCAST:
      case _socketIOEvents.MESSAGE:
        this.view.alert(payload.payload, payload.type);
        return;
      default:
        console.warn("Unhandled SocketIO message type", payload);
        return;
    }
  },

  handleJoinNewlyCreatedRoom: function handleJoinNewlyCreatedRoom(roomID) {
    var setRoom = _appActions.setSessionProps({ roomID: roomID }),
        setWaitingScreenState = _noriActions.changeStoreState({ currentState: this.store.gameStates[2] });

    this.store.apply(setRoom);
    this.store.apply(setWaitingScreenState);
  },

  handleGameStart: function handleGameStart(roomID) {
    console.log('Starting game');
    var setGamePlayState = _noriActions.changeStoreState({ currentState: this.store.gameStates[3] });
    this.store.apply(setGamePlayState);
  }

});

module.exports = App;

},{"../nori/action/ActionCreator.js":14,"../nori/service/SocketIO.js":15,"../nori/service/SocketIOEvents.js":16,"../nori/utils/Rx.js":23,"./action/ActionCreator.js":3,"./store/AppStore.js":4,"./view/AppView.js":5}],2:[function(require,module,exports){
module.exports = {
  LOCAL_PLAYER_CONNECT: 'LOCAL_PLAYER_CONNECT',
  SET_SESSION_PROPS: 'SET_SESSION_PROPS',
  SET_LOCAL_PLAYER_PROPS: 'SET_LOCAL_PLAYER_PROPS',
  SET_LOCAL_PLAYER_NAME: 'SET_LOCAL_PLAYER_NAME',
  SET_LOCAL_PLAYER_APPEARANCE: 'SET_LOCAL_PLAYER_APPEARANCE',
  SET_REMOTE_PLAYER_PROPS: 'SET_REMOTE_PLAYER_PROPS'
  //SELECT_PLAYER              : 'SELECT_PLAYER',
  //REMOTE_PLAYER_CONNECT      : 'REMOTE_PLAYER_CONNECT',
  //GAME_START                 : 'GAME_START',
  //LOCAL_QUESTION             : 'LOCAL_QUESTION',
  //REMOTE_QUESTION            : 'REMOTE_QUESTION',
  //LOCAL_PLAYER_HEALTH_CHANGE : 'LOCAL_PLAYER_HEALTH_CHANGE',
  //REMOTE_PLAYER_HEALTH_CHANGE: 'REMOTE_PLAYER_HEALTH_CHANGE',
  //GAME_OVER                  : 'GAME_OVER'
};

},{}],3:[function(require,module,exports){
var _actionConstants = require('./ActionConstants.js');

/**
 * Purely for convenience, an Event ("action") Creator ala Flux spec. Follow
 * guidelines for creating actions: https://github.com/acdlite/flux-standard-action
 */
var ActionCreator = {

  setLocalPlayerProps: function setLocalPlayerProps(data) {
    return {
      type: _actionConstants.SET_LOCAL_PLAYER_PROPS,
      payload: {
        data: {
          localPlayer: data
        }
      }
    };
  },

  setRemotePlayerProps: function setRemotePlayerProps(data) {
    return {
      type: _actionConstants.SET_REMOTE_PLAYER_PROPS,
      payload: {
        data: {
          remotePlayer: data
        }
      }
    };
  },

  setSessionProps: function setSessionProps(data) {
    return {
      type: _actionConstants.SET_REMOTE_PLAYER_PROPS,
      payload: {
        data: {
          session: data
        }
      }
    };
  }

};

module.exports = ActionCreator;

},{"./ActionConstants.js":2}],4:[function(require,module,exports){
var _noriActionConstants = require('../../nori/action/ActionConstants.js'),
    _appActionConstants = require('../action/ActionConstants.js'),
    _mixinObservableSubject = require('../../nori/utils/MixinObservableSubject.js'),
    _mixinReducerStore = require('../../nori/store/MixinReducerStore.js'),
    _numUtils = require('../../nudoru/core/NumberUtils.js');

/**
 * This application store contains "reducer store" functionality based on Redux.
 * The store state may only be changed from events as applied in reducer functions.
 * The store received all events from the event bus and forwards them to all
 * reducer functions to modify state as needed. Once they have run, the
 * handleStateMutation function is called to dispatch an event to the bus, or
 * notify subscribers via an observable.
 *
 * Events => handleApplicationEvents => applyReducers => handleStateMutation => Notify
 */
var AppStore = Nori.createStore({

  mixins: [_mixinReducerStore, _mixinObservableSubject()],

  gameStates: ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],

  initialize: function initialize() {
    this.addReducer(this.mainStateReducer);
    this.initializeReducerStore();
    this.setState(Nori.config());
    this.createSubject('storeInitialized');
  },

  /**
   * Set or load any necessary data and then broadcast a initialized event.
   */
  loadStore: function loadStore() {
    this.setState({
      currentState: this.gameStates[0],
      session: {
        roomID: ''
      },
      localPlayer: {
        id: '',
        type: '',
        name: 'Mystery Player ' + _numUtils.rndNumber(100, 999),
        health: 6,
        appearance: 'green',
        behaviors: []
      },
      remotePlayer: {
        id: '',
        type: '',
        name: '',
        health: 6,
        appearance: '',
        behaviors: []
      },
      questionBank: []
    });

    this.notifySubscribersOf('storeInitialized');
  },

  createQuestionObject: function createQuestionObject(prompt, distractors, pointValue) {
    return {
      prompt: prompt,
      distractors: distractors,
      pointValue: pointValue
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
  mainStateReducer: function mainStateReducer(state, event) {
    state = state || {};

    switch (event.type) {

      case _noriActionConstants.CHANGE_STORE_STATE:
      case _appActionConstants.SET_LOCAL_PLAYER_PROPS:
      case _appActionConstants.SET_REMOTE_PLAYER_PROPS:
      case _appActionConstants.SET_SESSION_PROPS:
        return _.merge({}, state, event.payload.data);
      case undefined:
        return state;
      default:
        console.warn('Reducer store, unhandled event type: ' + event.type);
        return state;
    }
  },

  /**
   * Called after all reducers have run to broadcast possible updates. Does
   * not check to see if the state was actually updated.
   */
  handleStateMutation: function handleStateMutation() {
    this.notifySubscribers(this.getState());
  }

});

module.exports = AppStore();

},{"../../nori/action/ActionConstants.js":13,"../../nori/store/MixinReducerStore.js":18,"../../nori/utils/MixinObservableSubject.js":20,"../../nudoru/core/NumberUtils.js":39,"../action/ActionConstants.js":2}],5:[function(require,module,exports){
var _appStore = require('../store/AppStore.js'),
    _mixinApplicationView = require('../../nori/view/ApplicationView.js'),
    _mixinNudoruControls = require('../../nori/view/MixinNudoruControls.js'),
    _mixinComponentViews = require('../../nori/view/MixinComponentViews.js'),
    _mixinStoreStateViews = require('../../nori/view/MixinStoreStateViews.js'),
    _mixinEventDelegator = require('../../nori/view/MixinEventDelegator.js'),
    _mixinObservableSubject = require('../../nori/utils/MixinObservableSubject.js');

/**
 * View for an application.
 */

var AppView = Nori.createView({

  mixins: [_mixinApplicationView, _mixinNudoruControls, _mixinComponentViews, _mixinStoreStateViews, _mixinEventDelegator(), _mixinObservableSubject()],

  initialize: function initialize() {
    this.initializeApplicationView(['applicationscaffold', 'applicationcomponentsscaffold']);
    this.initializeStateViews(_appStore);
    this.initializeNudoruControls();

    this.configureViews();
  },

  configureViews: function configureViews() {
    var screenTitle = require('./Screen.Title.js')(),
        screenPlayerSelect = require('./Screen.PlayerSelect.js')(),
        screenWaitingOnPlayer = require('./Screen.WaitingOnPlayer.js')(),
        screenMainGame = require('./Screen.MainGame.js')(),
        screenGameOver = require('./Screen.GameOver.js')(),
        gameStates = _appStore.gameStates;

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
  render: function render() {
    //
  }

});

module.exports = AppView();

},{"../../nori/utils/MixinObservableSubject.js":20,"../../nori/view/ApplicationView.js":25,"../../nori/view/MixinComponentViews.js":26,"../../nori/view/MixinEventDelegator.js":27,"../../nori/view/MixinNudoruControls.js":28,"../../nori/view/MixinStoreStateViews.js":29,"../store/AppStore.js":4,"./Screen.GameOver.js":6,"./Screen.MainGame.js":7,"./Screen.PlayerSelect.js":8,"./Screen.Title.js":9,"./Screen.WaitingOnPlayer.js":10}],6:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore'),
    _template = require('../../nori/utils/Templating.js');

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize: function initialize(configProps) {
    //
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function defineEvents() {
    return {
      'click #gameover__button-replay': function clickGameover__buttonReplay() {
        _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[1] }));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    return {};
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    return {};
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount: function componentDidMount() {
    //
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator":14,"../../nori/utils/Templating.js":24,"../store/AppStore":4,"./AppView":5}],7:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore'),
    _template = require('../../nori/utils/Templating.js');

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize: function initialize(configProps) {
    //
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function defineEvents() {
    return {
      'click #game__button-skip': function clickGame__buttonSkip() {
        _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[4] }));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    return {};
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    return {};
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount: function componentDidMount() {},

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator":14,"../../nori/utils/Templating.js":24,"../store/AppStore":4,"./AppView":5}],8:[function(require,module,exports){
/*
 TODO

 */

var _noriActions = require('../../nori/action/ActionCreator.js'),
    _appActions = require('../action/ActionCreator.js'),
    _appView = require('./AppView.js'),
    _appStore = require('../store/AppStore.js'),
    _socketIO = require('../../nori/service/SocketIO.js'),
    _template = require('../../nori/utils/Templating.js');

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize: function initialize(configProps) {
    //
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function defineEvents() {
    return {
      'blur #select__playername': this.setPlayerName.bind(this),
      'change #select__playertype': this.setPlayerAppearance.bind(this),
      'click #select__button-joinroom': this.onJoinRoom.bind(this),
      'click #select__button-createroom': this.onCreateRoom.bind(this),
      'click #select__button-go': function clickSelect__buttonGo() {
        _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[2] }));
      }
    };
  },

  setPlayerName: function setPlayerName(value) {
    var action = _appActions.setLocalPlayerProps({
      name: value
    });
    _appStore.apply(action);
  },

  setPlayerAppearance: function setPlayerAppearance(value) {
    var action = _appActions.setLocalPlayerProps({
      appearance: value
    });
    _appStore.apply(action);
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    var appState = _appStore.getState();
    return {
      name: appState.localPlayer.name,
      appearance: appState.localPlayer.appearance
    };
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    var appState = _appStore.getState();
    return {
      name: appState.localPlayer.name,
      appearance: appState.localPlayer.appearance
    };
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount: function componentDidMount() {
    document.querySelector('#select__playertype').value = this.getState().appearance;
  },

  onJoinRoom: function onJoinRoom() {
    var roomID = document.querySelector('#select__roomid').value;
    if (this.validateRoomID(roomID)) {
      _socketIO.notifyServer(_socketIO.events().JOIN_ROOM, {
        roomID: roomID,
        playerName: this.getState().name
      });
    } else {
      _appView.alert('The room ID is not correct. Must be a 5 digit number.', 'Bad Room ID');
    }
  },

  validateUserDetailsInput: function validateUserDetailsInput() {
    var name = document.querySelector('#select__playername').value,
        appearance = document.querySelector('#select__playertype').value;

    if (!name.length || !appearance) {
      _appView.alert('Make sure you\'ve typed a name for yourself and selected an appearance');
      return false;
    }
    return true;
  },

  /**
   * Room ID must be an integer and 5 digits
   * @param roomID
   * @returns {boolean}
   */
  validateRoomID: function validateRoomID(roomID) {
    if (isNaN(parseInt(roomID))) {
      return false;
    } else if (roomID.length !== 5) {
      return false;
    }
    return true;
  },

  onCreateRoom: function onCreateRoom() {
    if (this.validateUserDetailsInput()) {
      _socketIO.notifyServer(_socketIO.events().CREATE_ROOM, { playerName: this.getState().name });
    }
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator.js":14,"../../nori/service/SocketIO.js":15,"../../nori/utils/Templating.js":24,"../action/ActionCreator.js":3,"../store/AppStore.js":4,"./AppView.js":5}],9:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore'),
    _template = require('../../nori/utils/Templating.js');

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize: function initialize(configProps) {
    //
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function defineEvents() {
    return {
      'click #title__button-start': function clickTitle__buttonStart() {
        _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[1] }));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    return {};
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    return {};
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount: function componentDidMount() {
    //
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator":14,"../../nori/utils/Templating.js":24,"../store/AppStore":4,"./AppView":5}],10:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore'),
    _template = require('../../nori/utils/Templating.js');

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize: function initialize(configProps) {
    //
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function defineEvents() {
    return {
      'click #waiting__button-skip': function clickWaiting__buttonSkip() {
        _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[3] }));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    var appState = _appStore.getState();
    return {
      name: appState.localPlayer.name,
      appearance: appState.localPlayer.appearance,
      roomID: appState.session.roomID
    };
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    return {};
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount: function componentDidMount() {
    //
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator":14,"../../nori/utils/Templating.js":24,"../store/AppStore":4,"./AppView":5}],11:[function(require,module,exports){
/**
 * Initial file for the Application
 */

(function () {

  var _browserInfo = require('./nudoru/browser/BrowserInfo.js');

  /**
   * IE versions 9 and under are blocked, others are allowed to proceed
   */
  if (_browserInfo.notSupported || _browserInfo.isIE9) {
    document.querySelector('body').innerHTML = '<h3>For the best experience, please use Internet Explorer 10+, Firefox, Chrome or Safari to view this application.</h3>';
  } else {

    /**
     * Create the application module and initialize
     */
    window.onload = function () {
      window.Nori = require('./nori/Nori.js');
      window.APP = require('./app/App.js');
      APP.initialize();
    };
  }
})();

},{"./app/App.js":1,"./nori/Nori.js":12,"./nudoru/browser/BrowserInfo.js":31}],12:[function(require,module,exports){
/*  weak */

var Nori = function Nori() {

  var _dispatcher = require('./utils/Dispatcher.js'),
      _router = require('./utils/Router.js');

  // Switch Lodash to use Mustache style templates
  _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

  //----------------------------------------------------------------------------
  //  Accessors
  //----------------------------------------------------------------------------

  function getDispatcher() {
    return _dispatcher;
  }

  function getRouter() {
    return _router;
  }

  function getConfig() {
    return _.assign({}, window.APP_CONFIG_DATA || {});
  }

  function getCurrentRoute() {
    return _router.getCurrentRoute();
  }

  //----------------------------------------------------------------------------
  //  Factories - concatenative inheritance, decorators
  //----------------------------------------------------------------------------

  /**
   * Merges a collection of objects
   * @param target
   * @param sourceArray
   * @returns {*}
   */
  function assignArray(target, sourceArray) {
    sourceArray.forEach(function (source) {
      target = _.assign(target, source);
    });
    return target;
  }

  /**
   * Create a new Nori application instance
   * @param custom
   * @returns {*}
   */
  function createApplication(custom) {
    custom.mixins.push(this);
    return buildFromMixins(custom);
  }

  /**
   * Creates main application store
   * @param custom
   * @returns {*}
   */
  function createStore(custom) {
    return function cs() {
      return _.assign({}, buildFromMixins(custom));
    };
  }

  /**
   * Creates main application view
   * @param custom
   * @returns {*}
   */
  function createView(custom) {
    return function cv() {
      return _.assign({}, buildFromMixins(custom));
    };
  }

  /**
   * Mixes in the modules specified in the custom application object
   * @param sourceObject
   * @returns {*}
   */
  function buildFromMixins(sourceObject) {
    var mixins;

    if (sourceObject.mixins) {
      mixins = sourceObject.mixins;
    }

    mixins.push(sourceObject);
    return assignArray({}, mixins);
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    config: getConfig,
    dispatcher: getDispatcher,
    router: getRouter,
    createApplication: createApplication,
    createStore: createStore,
    createView: createView,
    buildFromMixins: buildFromMixins,
    getCurrentRoute: getCurrentRoute,
    assignArray: assignArray
  };
};

module.exports = Nori();

},{"./utils/Dispatcher.js":19,"./utils/Router.js":22}],13:[function(require,module,exports){
/*  weak */

module.exports = {
  CHANGE_STORE_STATE: 'CHANGE_STORE_STATE'
};

},{}],14:[function(require,module,exports){
/*  weak */

/**
 * Action Creator
 * Based on Flux Actions
 * For more information and guidelines: https://github.com/acdlite/flux-standard-action
 */
var _noriActionConstants = require('./ActionConstants.js');

var NoriActionCreator = {

  changeStoreState: function changeStoreState(data, id) {
    return {
      type: _noriActionConstants.CHANGE_STORE_STATE,
      payload: {
        id: id,
        data: data
      }
    };
  }

};

module.exports = NoriActionCreator;

},{"./ActionConstants.js":13}],15:[function(require,module,exports){
/*  weak */

var SocketIOConnector = function SocketIOConnector() {

  var _subject = new Rx.BehaviorSubject(),
      _socketIO = io(),
      _log = [],
      _connectionID,
      _events = require('./SocketIOEvents.js');

  function initialize() {
    _socketIO.on(_events.NOTIFY_CLIENT, onNotifyClient);
  }

  /**
   * All notifications from Socket.io come here
   * @param payload {type, id, time, payload}
   */
  function onNotifyClient(payload) {
    _log.push(payload);

    if (payload.type === _events.PING) {
      notifyServer(_events.PONG, {});
    } else if (payload.type === _events.PONG) {
      console.log('SOCKET.IO PONG!');
    } else if (payload.type === _events.CONNECT) {
      _connectionID = payload.id;
    }
    notifySubscribers(payload);
  }

  function ping() {
    notifyServer(_events.PING, {});
  }

  /**
   * All communications to the server should go through here
   * @param type
   * @param payload
   */
  function notifyServer(type, payload) {
    _socketIO.emit(_events.NOTIFY_SERVER, {
      type: type,
      connectionID: _connectionID,
      payload: payload
    });
  }

  //function emit(message, payload) {
  //  message = message || _events.MESSAGE;
  //  payload = payload || {};
  //  _socketIO.emit(message, payload);
  //}
  //
  //function on(event, handler) {
  //  _socketIO.on(event, handler);
  //}

  /**
   * Subscribe handler to updates
   * @param handler
   * @returns {*}
   */
  function subscribe(handler) {
    return _subject.subscribe(handler);
  }

  /**
   * Called from update or whatever function to dispatch to subscribers
   * @param payload
   */
  function notifySubscribers(payload) {
    _subject.onNext(payload);
  }

  /**
   * Gets the last payload that was dispatched to subscribers
   * @returns {*}
   */
  function getLastNotification() {
    return _subject.getValue();
  }

  function getEventConstants() {
    return _.assign({}, _events);
  }

  return {
    events: getEventConstants,
    initialize: initialize,
    ping: ping,
    notifyServer: notifyServer,
    subscribe: subscribe,
    notifySubscribers: notifySubscribers,
    getLastNotification: getLastNotification
  };
};

module.exports = SocketIOConnector();

},{"./SocketIOEvents.js":16}],16:[function(require,module,exports){
/*  weak */

module.exports = {
  PING: 'ping',
  PONG: 'pong',
  NOTIFY_CLIENT: 'notify_client',
  NOTIFY_SERVER: 'notify_server',
  CONNECT: 'connect',
  DROPPED: 'dropped',
  USER_CONNECTED: 'user_connected',
  USER_DISCONNECTED: 'user_disconnected',
  EMIT: 'emit',
  BROADCAST: 'broadcast',
  SYSTEM_MESSAGE: 'system_message',
  MESSAGE: 'message',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  GAME_START: 'game_start',
  GAME_END: 'game_end'
};

},{}],17:[function(require,module,exports){
/*  weak */

/**
 * Wraps Immutable.js's Map in the same syntax as the SimpleStore module
 *
 * View Docs http://facebook.github.io/immutable-js/docs/#/Map
 */

var immutable = require('../../vendor/immutable.min.js');

var ImmutableMap = function ImmutableMap() {
  var _map = immutable.Map();

  /**
   * Returns the Map object
   * @returns {*}
   */
  function getMap() {
    return _map;
  }

  /**
   * Return a copy of the state
   * @returns {void|*}
   */
  function getState() {
    return _map.toJS();
  }

  /**
   * Sets the state
   * @param next
   */
  function setState(next) {
    _map = _map.merge(next);
  }

  return {
    getState: getState,
    setState: setState,
    getMap: getMap
  };
};

module.exports = ImmutableMap;

},{"../../vendor/immutable.min.js":41}],18:[function(require,module,exports){
/*  weak */

/**
 * Mixin for Nori stores to add functionality similar to Redux' Reducer and single
 * object state tree concept. Mixin should be composed to nori/store/ApplicationStore
 * during creation of main AppStore
 *
 * https://gaearon.github.io/redux/docs/api/Store.html
 * https://gaearon.github.io/redux/docs/basics/Reducers.html
 *
 * Created 8/13/15
 */
var MixinReducerStore = function MixinReducerStore() {
  var _this,
      _state,
      _stateReducers = [];

  //----------------------------------------------------------------------------
  //  Accessors
  //----------------------------------------------------------------------------

  /**
   * _state might not exist if subscribers are added before this store is initialized
   */
  function getState() {
    if (_state) {
      return _state.getState();
    }
    return {};
  }

  function setState(state) {
    if (!_.isEqual(state, _state)) {
      _state.setState(state);
      _this.notifySubscribers({});
    }
  }

  function setReducers(reducerArray) {
    _stateReducers = reducerArray;
  }

  function addReducer(reducer) {
    _stateReducers.push(reducer);
  }

  //----------------------------------------------------------------------------
  //  Init
  //----------------------------------------------------------------------------

  /**
   * Set up event listener/receiver
   */
  function initializeReducerStore() {
    if (!this.createSubject) {
      console.warn('nori/store/MixinReducerStore needs nori/utils/MixinObservableSubject to notify');
    }

    _this = this;
    _state = require('./ImmutableMap.js')();

    if (!_stateReducers) {
      throw new Error('ReducerStore, must set a reducer before initialization');
    }

    // Set initial state from empty event
    applyReducers({});
  }

  /**
   * Apply the action object to the reducers to change state
   * are sent to all reducers to update the state
   * @param actionObject
   */
  function apply(actionObject) {
    applyReducers(actionObject);
  }

  function applyReducers(actionObject) {
    var nextState = applyReducersToState(getState(), actionObject);
    setState(nextState);
    _this.handleStateMutation();
  }

  /**
   * API hook to handle state updates
   */
  function handleStateMutation() {}
  // override this

  /**
   * Creates a new state from the combined reduces and action object
   * Store state isn't modified, current state is passed in and mutated state returned
   * @param state
   * @param action
   * @returns {*|{}}
   */
  function applyReducersToState(state, action) {
    state = state || {};
    // TODO should this actually use array.reduce()?
    _stateReducers.forEach(function applyStateReducerFunction(reducerFunc) {
      state = reducerFunc(state, action);
    });
    return state;
  }

  /**
   * Template reducer function
   * Store state isn't modified, current state is passed in and mutated state returned
    function templateReducerFunction(state, event) {
        state = state || {};
        switch (event.type) {
          case _noriActionConstants.MODEL_DATA_CHANGED:
            // can compose other reducers
            // return _.merge({}, state, otherStateTransformer(state));
            return _.merge({}, state, {prop: event.payload.value});
          case undefined:
            return state;
          default:
            console.warn('Reducer store, unhandled event type: '+event.type);
            return state;
        }
      }
   */

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    initializeReducerStore: initializeReducerStore,
    getState: getState,
    setState: setState,
    apply: apply,
    setReducers: setReducers,
    addReducer: addReducer,
    applyReducers: applyReducers,
    applyReducersToState: applyReducersToState,
    handleStateMutation: handleStateMutation
  };
};

module.exports = MixinReducerStore();

},{"./ImmutableMap.js":17}],19:[function(require,module,exports){
/*  weak */

/*
 Matt Perkins, 6/12/15

 publish payload object

 {
 type: EVT_TYPE,
 payload: {
 key: value
 }
 }

 */
var Dispatcher = function Dispatcher() {

  var _subjectMap = {},
      _receiverMap = {},
      _id = 0,
      _log = [],
      _queue = [],
      _timerObservable,
      _timerSubscription,
      _timerPausable;

  /**
   * Add an event as observable
   * @param evtStr Event name string
   * @param handler onNext() subscription function
   * @param onceOrContext optional, either the context to execute the hander or once bool
   * @param once will complete/dispose after one fire
   * @returns {*}
   */
  function subscribe(evtStr, handler, onceOrContext, once) {
    var handlerContext = window;

    //console.log('dispatcher subscribe', evtStr, handler, onceOrContext, once);

    if (is.falsey(evtStr)) {
      console.warn('Dispatcher: Fasley event string passed for handler', handler);
    }

    if (is.falsey(handler)) {
      console.warn('Dispatcher: Fasley handler passed for event string', evtStr);
    }

    if (onceOrContext || onceOrContext === false) {
      if (onceOrContext === true || onceOrContext === false) {
        once = onceOrContext;
      } else {
        handlerContext = onceOrContext;
      }
    }

    if (!_subjectMap[evtStr]) {
      _subjectMap[evtStr] = [];
    }

    var subject = new Rx.Subject();

    _subjectMap[evtStr].push({
      once: once,
      priority: 0,
      handler: handler,
      context: handlerContext,
      subject: subject,
      type: 0
    });

    return subject.subscribe(handler.bind(handlerContext));
  }

  /**
   * Initialize the event processing timer or resume a paused timer
   */
  function initTimer() {
    if (_timerObservable) {
      _timerPausable.onNext(true);
      return;
    }

    _timerPausable = new Rx.Subject();
    _timerObservable = Rx.Observable.interval(1).pausable(_timerPausable);
    _timerSubscription = _timerObservable.subscribe(processNextEvent);
  }

  /**
   * Shift next event to handle off of the queue and dispatch it
   */
  function processNextEvent() {
    var evt = _queue.shift();
    if (evt) {
      dispatchToReceivers(evt);
      dispatchToSubscribers(evt);
    } else {
      _timerPausable.onNext(false);
    }
  }

  /**
   * Push event to the stack and begin execution
   * @param payloadObj type:String, payload:data
   * @param data
   */
  function publish(payloadObj) {
    _log.push(payloadObj);
    _queue.push(payloadObj);

    initTimer();
  }

  /**
   * Send the payload to all receivers
   * @param payload
   */
  function dispatchToReceivers(payload) {
    for (var id in _receiverMap) {
      _receiverMap[id].handler(payload);
    }
  }

  /**
   * Subscribers receive all payloads for a given event type while handlers are targeted
   * @param payload
   */
  function dispatchToSubscribers(payload) {
    var subscribers = _subjectMap[payload.type],
        i;
    if (!subscribers) {
      return;
    }

    i = subscribers.length;

    while (i--) {
      var subjObj = subscribers[i];
      if (subjObj.type === 0) {
        subjObj.subject.onNext(payload);
      }
      if (subjObj.once) {
        unsubscribe(payload.type, subjObj.handler);
      }
    }
  }

  /**
   * Remove a handler
   * @param evtStr
   * @param hander
   */
  function unsubscribe(evtStr, handler) {
    if (_subjectMap[evtStr] === undefined) {
      return;
    }

    var subscribers = _subjectMap[evtStr],
        handlerIdx = -1;

    for (var i = 0, len = subscribers.length; i < len; i++) {
      if (subscribers[i].handler === handler) {
        handlerIdx = i;
        subscribers[i].subject.onCompleted();
        subscribers[i].subject.dispose();
        subscribers[i] = null;
      }
    }

    if (handlerIdx === -1) {
      return;
    }

    subscribers.splice(handlerIdx, 1);

    if (subscribers.length === 0) {
      delete _subjectMap[evtStr];
    }
  }

  /**
   * Return a copy of the log array
   * @returns {Array.<T>}
   */
  function getLog() {
    return _log.slice(0);
  }

  /**
   * Simple receiver implementation based on Flux
   * Registered receivers will get every published event
   * https://github.com/facebook/flux/blob/master/src/Dispatcher.js
   *
   * Usage:
   *
   * _dispatcher.registerReceiver(function (payload) {
       *    console.log('receiving, ',payload);
       * });
   *
   * @param handler
   * @returns {string}
   */
  function registerReceiver(handler) {
    var id = 'ID_' + _id++;
    _receiverMap[id] = {
      id: id,
      handler: handler
    };
    return id;
  }

  /**
   * Remove a receiver handler
   * @param id
   */
  function unregisterReceiver(id) {
    if (_receiverMap.hasOwnProperty(id)) {
      delete _receiverMap[id];
    }
  }

  return {
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    publish: publish,
    getLog: getLog,
    registerReceiver: registerReceiver,
    unregisterReceiver: unregisterReceiver
  };
};

module.exports = Dispatcher();

},{}],20:[function(require,module,exports){
/*  weak */

/**
 * Add RxJS Subject to a module.
 *
 * Add one simple observable subject or more complex ability to create others for
 * more complex eventing needs.
 */
var MixinObservableSubject = function MixinObservableSubject() {

  var _subject = new Rx.Subject(),
      _subjectMap = {};

  /**
   * Create a new subject
   * @param name
   * @returns {*}
   */
  function createSubject(name) {
    if (!_subjectMap.hasOwnProperty(name)) {
      _subjectMap[name] = new Rx.Subject();
    }
    return _subjectMap[name];
  }

  /**
   * Subscribe handler to updates. If the handler is a string, the new subject
   * will be created.
   * @param handler
   * @returns {*}
   */
  function subscribe(handlerOrName, optHandler) {
    if (is.string(handlerOrName)) {
      return createSubject(handlerOrName).subscribe(optHandler);
    } else {
      return _subject.subscribe(handlerOrName);
    }
  }

  /**
   * Dispatch updated to subscribers
   * @param payload
   */
  function notifySubscribers(payload) {
    _subject.onNext(payload);
  }

  /**
   * Dispatch updated to named subscribers
   * @param name
   * @param payload
   */
  function notifySubscribersOf(name, payload) {
    if (_subjectMap.hasOwnProperty(name)) {
      _subjectMap[name].onNext(payload);
    } else {
      console.warn('MixinObservableSubject, no subscribers of ' + name);
    }
  }

  return {
    subscribe: subscribe,
    createSubject: createSubject,
    notifySubscribers: notifySubscribers,
    notifySubscribersOf: notifySubscribersOf
  };
};

module.exports = MixinObservableSubject;

},{}],21:[function(require,module,exports){
/*  weak */

/**
 * Utility to handle all view DOM attachment tasks
 */

var Renderer = function Renderer() {
  var _domUtils = require('../../nudoru/browser/DOMUtils.js');

  function render(payload) {
    var targetSelector = payload.target,
        html = payload.html,
        domEl,
        mountPoint = document.querySelector(targetSelector),
        cb = payload.callback;

    mountPoint.innerHTML = '';

    if (html) {
      domEl = _domUtils.HTMLStrToNode(html);
      mountPoint.appendChild(domEl);
    }

    if (cb) {
      cb(domEl);
    }

    return domEl;
  }

  return {
    render: render
  };
};

module.exports = Renderer();

},{"../../nudoru/browser/DOMUtils.js":32}],22:[function(require,module,exports){
/*  weak */

/**
 * Simple router
 * Supporting IE9 so using hashes instead of the history API for now
 */

var Router = function Router() {

  var _subject = new Rx.Subject(),
      _hashChangeObservable,
      _objUtils = require('../../nudoru/core/ObjectUtils.js');

  /**
   * Set event handlers
   */
  function initialize() {
    _hashChangeObservable = Rx.Observable.fromEvent(window, 'hashchange').subscribe(notifySubscribers);
  }

  /**
   * subscribe a handler to the url change events
   * @param handler
   * @returns {*}
   */
  function subscribe(handler) {
    return _subject.subscribe(handler);
  }

  /**
   * Notify of a change in route
   * @param fromApp True if the route was caused by an app event not URL or history change
   */
  function notifySubscribers() {
    var eventPayload = {
      routeObj: getCurrentRoute(), // { route:, data: }
      fragment: getURLFragment()
    };

    _subject.onNext(eventPayload);
  }

  /**
   * Parses the route and query string from the current URL fragment
   * @returns {{route: string, query: {}}}
   */
  function getCurrentRoute() {
    var fragment = getURLFragment(),
        parts = fragment.split('?'),
        route = '/' + parts[0],
        queryStr = decodeURIComponent(parts[1]),
        queryStrObj = parseQueryStr(queryStr);

    if (queryStr === '=undefined') {
      queryStrObj = {};
    }

    return { route: route, data: queryStrObj };
  }

  /**
   * Parses a query string into key/value pairs
   * @param queryStr
   * @returns {{}}
   */
  function parseQueryStr(queryStr) {
    var obj = {},
        parts = queryStr.split('&');

    parts.forEach(function (pairStr) {
      var pairArr = pairStr.split('=');
      obj[pairArr[0]] = pairArr[1];
    });

    return obj;
  }

  /**
   * Combines a route and data object into a proper URL hash fragment
   * @param route
   * @param dataObj
   */
  function set(route, dataObj) {
    var path = route,
        data = [];
    if (!_objUtils.isNull(dataObj)) {
      path += "?";
      for (var prop in dataObj) {
        if (prop !== 'undefined' && dataObj.hasOwnProperty(prop)) {
          data.push(prop + '=' + encodeURIComponent(dataObj[prop]));
        }
      }
      path += data.join('&');
    }

    updateURLFragment(path);
  }

  /**
   * Returns everything after the 'whatever.html#' in the URL
   * Leading and trailing slashes are removed
   * @returns {string}
   */
  function getURLFragment() {
    var fragment = location.hash.slice(1);
    return fragment.toString().replace(/\/$/, '').replace(/^\//, '');
  }

  /**
   * Set the URL hash fragment
   * @param path
   */
  function updateURLFragment(path) {
    window.location.hash = path;
  }

  return {
    initialize: initialize,
    subscribe: subscribe,
    notifySubscribers: notifySubscribers,
    getCurrentRoute: getCurrentRoute,
    set: set
  };
};

var r = Router();
r.initialize();

module.exports = r;

},{"../../nudoru/core/ObjectUtils.js":40}],23:[function(require,module,exports){
/*  weak */

/**
 * RxJS Helpers
 * @type {{dom: Function, from: Function, interval: Function, doEvery: Function, just: Function, empty: Function}}
 */

module.exports = {
  dom: function dom(selector, event) {
    var el = document.querySelector(selector);
    if (!el) {
      console.warn('nori/utils/Rx, dom, invalid DOM selector: ' + selector);
      return;
    }
    return Rx.Observable.fromEvent(el, event.trim());
  },

  from: function from(ittr) {
    return Rx.Observable.from(ittr);
  },

  interval: function interval(ms) {
    return Rx.Observable.interval(ms);
  },

  doEvery: function doEvery(ms) {
    if (is['function'](arguments[1])) {
      return this.interval(ms).subscribe(arguments[1]);
    }
    return this.interval(ms).take(arguments[1]).subscribe(arguments[2]);
  },

  just: function just(value) {
    return Rx.Observable.just(value);
  },

  empty: function empty() {
    return Rx.Observable.empty();
  }

};

},{}],24:[function(require,module,exports){
/*  weak */

/*
 Simple wrapper for Underscore / HTML templates
 Matt Perkins
 4/7/15
 */
var Templating = function Templating() {

  var _templateMap = Object.create(null),
      _templateHTMLCache = Object.create(null),
      _templateCache = Object.create(null),
      _DOMUtils = require('../../nudoru/browser/DOMUtils.js');

  function addTemplate(id, html) {
    _templateMap[id] = html;
  }

  function getSourceFromTemplateMap(id) {
    var source = _templateMap[id];
    if (source) {
      return cleanTemplateHTML(source);
    }
    return;
  }

  function getSourceFromHTML(id) {
    var src = document.getElementById(id),
        srchtml;

    if (src) {
      srchtml = src.innerHTML;
    } else {
      console.warn('nudoru/core/Templating, template not found: "' + id + '"');
      srchtml = '<div>Template not found: ' + id + '</div>';
    }

    return cleanTemplateHTML(srchtml);
  }

  /**
   * Get the template html from the script tag with id
   * @param id
   * @returns {*}
   */
  function getSource(id) {
    if (_templateHTMLCache[id]) {
      return _templateHTMLCache[id];
    }

    var sourcehtml = getSourceFromTemplateMap(id);

    if (!sourcehtml) {
      sourcehtml = getSourceFromHTML(id);
    }

    _templateHTMLCache[id] = sourcehtml;
    return sourcehtml;
  }

  /**
   * Returns all IDs belonging to text/template type script tags
   * @returns {Array}
   */
  function getAllTemplateIDs() {
    var scriptTags = Array.prototype.slice.call(document.getElementsByTagName('script'), 0);

    return scriptTags.filter(function (tag) {
      return tag.getAttribute('type') === 'text/template';
    }).map(function (tag) {
      return tag.getAttribute('id');
    });
  }

  /**
   * Returns an underscore template
   * @param id
   * @returns {*}
   */
  function getTemplate(id) {
    if (_templateCache[id]) {
      return _templateCache[id];
    }
    var templ = _.template(getSource(id));
    _templateCache[id] = templ;
    return templ;
  }

  /**
   * Processes the template and returns HTML
   * @param id
   * @param obj
   * @returns {*}
   */
  function asHTML(id, obj) {
    var temp = getTemplate(id);
    return temp(obj);
  }

  /**
   * Processes the template and returns an HTML Element
   * @param id
   * @param obj
   * @returns {*}
   */
  function asElement(id, obj) {
    return _DOMUtils.HTMLStrToNode(asHTML(id, obj));
  }

  /**
   * Cleans template HTML
   */
  function cleanTemplateHTML(str) {
    return str.trim();
  }

  /**
   * Remove returns, spaces and tabs
   * @param str
   * @returns {XML|string}
   */
  function removeWhiteSpace(str) {
    return str.replace(/(\r\n|\n|\r|\t)/gm, '').replace(/>\s+</g, '><');
  }

  /**
   * Iterate over all templates, clean them up and log
   * Util for SharePoint projects, <script> blocks aren't allowed
   * So this helps create the blocks for insertion in to the DOM
   */
  function processForDOMInsertion() {
    var ids = getAllTemplateIDs();
    ids.forEach(function (id) {
      var src = removeWhiteSpace(getSource(id));
      console.log(id, src);
    });
  }

  /**
   * Add a template script tag to the DOM
   * Util for SharePoint projects, <script> blocks aren't allowed
   * @param id
   * @param html
   */
  //function addClientSideTemplateToDOM(id, html) {
  //  var s       = document.createElement('script');
  //  s.type      = 'text/template';
  //  s.id        = id;
  //  s.innerHTML = html;
  //  document.getElementsByTagName('head')[0].appendChild(s);
  //}

  return {
    addTemplate: addTemplate,
    getSource: getSource,
    getAllTemplateIDs: getAllTemplateIDs,
    processForDOMInsertion: processForDOMInsertion,
    getTemplate: getTemplate,
    asHTML: asHTML,
    asElement: asElement
  };
};

module.exports = Templating();

},{"../../nudoru/browser/DOMUtils.js":32}],25:[function(require,module,exports){
/*  weak */

var ApplicationView = function ApplicationView() {

  var _this,
      _template = require('../utils/Templating.js'),
      _domUtils = require('../../nudoru/browser/DOMUtils.js');

  //----------------------------------------------------------------------------
  //  Initialization
  //----------------------------------------------------------------------------

  /**
   * Initialize
   * @param scaffoldTemplates template IDs to attached to the body for the app
   */
  function initializeApplicationView(scaffoldTemplates) {
    _this = this;

    attachApplicationScaffolding(scaffoldTemplates);
  }

  /**
   * Attach app HTML structure
   * @param templates
   */
  function attachApplicationScaffolding(templates) {
    if (!templates) {
      return;
    }

    var bodyEl = document.querySelector('body');

    templates.forEach(function (templ) {
      bodyEl.appendChild(_domUtils.HTMLStrToNode(_template.getSource(templ, {})));
    });
  }

  /**
   * After app initialization, remove the loading message
   */
  function removeLoadingMessage() {
    var cover = document.querySelector('#initialization__cover'),
        message = document.querySelector('.initialization__message');

    TweenLite.to(cover, 1, {
      alpha: 0, ease: Quad.easeOut, onComplete: function onComplete() {
        cover.parentNode.removeChild(cover);
      }
    });

    TweenLite.to(message, 2, {
      top: "+=50px", ease: Quad.easeIn, onComplete: function onComplete() {
        cover.removeChild(message);
      }
    });
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    initializeApplicationView: initializeApplicationView,
    removeLoadingMessage: removeLoadingMessage
  };
};

module.exports = ApplicationView();

},{"../../nudoru/browser/DOMUtils.js":32,"../utils/Templating.js":24}],26:[function(require,module,exports){
/*  weak */

/**
 * Mixin view that allows for component views
 */

var MixinComponentViews = function MixinComponentViews() {

  var _componentViewMap = Object.create(null);

  /**
   * Map a component to a mounting point. If a string is passed,
   * the correct object will be created from the factory method, otherwise,
   * the passed component object is used.
   *
   * @param componentID
   * @param componentIDorObj
   * @param mountPoint
   */
  function mapViewComponent(componentID, componentIDorObj, mountPoint) {
    var componentObj;

    if (typeof componentIDorObj === 'string') {
      var componentFactory = require(componentIDorObj);
      componentObj = createComponentView(componentFactory())();
    } else {
      componentObj = componentIDorObj;
    }

    _componentViewMap[componentID] = {
      controller: componentObj,
      mountPoint: mountPoint
    };
  }

  /**
   * Factory to create component view modules by concating multiple source objects
   * @param componentSource Custom module source
   * @returns {*}
   */
  function createComponentView(componentSource) {
    return function () {
      var componentViewFactory = require('./ViewComponent.js'),
          eventDelegatorFactory = require('./MixinEventDelegator.js'),
          observableFactory = require('../utils/MixinObservableSubject.js'),
          stateObjFactory = require('../store/ImmutableMap.js'),
          componentAssembly,
          finalComponent,
          previousInitialize;

      componentAssembly = [componentViewFactory(), eventDelegatorFactory(), observableFactory(), stateObjFactory(), componentSource];

      if (componentSource.mixins) {
        componentAssembly = componentAssembly.concat(componentSource.mixins);
      }

      finalComponent = Nori.assignArray({}, componentAssembly);

      // Compose a new initialize function by inserting call to component super module
      previousInitialize = finalComponent.initialize;
      finalComponent.initialize = function initialize(initObj) {
        finalComponent.initializeComponent(initObj);
        previousInitialize.call(finalComponent, initObj);
      };

      return _.assign({}, finalComponent);
    };
  }

  /**
   * Show a mapped componentView
   * @param componentID
   * @param dataObj
   */
  function showViewComponent(componentID, mountPoint) {
    var componentView = _componentViewMap[componentID];
    if (!componentView) {
      console.warn('No componentView mapped for id: ' + componentID);
      return;
    }

    if (!componentView.controller.isInitialized()) {
      mountPoint = mountPoint || componentView.mountPoint;
      componentView.controller.initialize({
        id: componentID,
        template: componentView.htmlTemplate,
        mountPoint: mountPoint
      });
    } else {
      componentView.controller.update();
    }

    componentView.controller.componentRender();
    componentView.controller.mount();
  }

  /**
   * Returns a copy of the map object for component views
   * @returns {null}
   */
  function getComponentViewMap() {
    return _.assign({}, _componentViewMap);
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    mapViewComponent: mapViewComponent,
    createComponentView: createComponentView,
    showViewComponent: showViewComponent,
    getComponentViewMap: getComponentViewMap
  };
};

module.exports = MixinComponentViews();

},{"../store/ImmutableMap.js":17,"../utils/MixinObservableSubject.js":20,"./MixinEventDelegator.js":27,"./ViewComponent.js":30}],27:[function(require,module,exports){
/*  weak */

/**
 * Convenience mixin that makes events easier for views
 *
 * Based on Backbone
 * Review this http://blog.marionettejs.com/2015/02/12/understanding-the-event-hash/index.html
 *
 * Example:
 * this.setEvents({
 *        'click #btn_main_projects': handleProjectsButton,
 *        'click #btn_foo, click #btn_bar': handleFooBarButtons
 *      });
 * this.delegateEvents();
 *
 */

var MixinEventDelegator = function MixinEventDelegator() {

  var _eventsMap,
      _eventSubscribers,
      _rx = require('../utils/Rx'),
      _browserInfo = require('../../nudoru/browser/BrowserInfo.js');

  function setEvents(evtObj) {
    _eventsMap = evtObj;
  }

  function getEvents() {
    return _eventsMap;
  }

  /**
   * Automates setting events on DOM elements.
   * 'evtStr selector':callback
   * 'evtStr selector, evtStr selector': sharedCallback
   */
  function delegateEvents() {
    if (!_eventsMap) {
      return;
    }

    _eventSubscribers = Object.create(null);

    for (var evtStrings in _eventsMap) {
      if (_eventsMap.hasOwnProperty(evtStrings)) {

        var mappings = evtStrings.split(','),
            eventHandler = _eventsMap[evtStrings];

        if (!is['function'](eventHandler)) {
          console.warn('EventDelegator, handler for ' + evtStrings + ' is not a function');
          return;
        }

        /* jshint -W083 */
        // https://jslinterrors.com/dont-make-functions-within-a-loop
        mappings.forEach(function (evtMap) {
          evtMap = evtMap.trim();
          var eventStr = evtMap.split(' ')[0].trim(),
              selector = evtMap.split(' ')[1].trim();

          if (_browserInfo.mobile.any()) {
            eventStr = convertMouseToTouchEventStr(eventStr);
          }

          _eventSubscribers[evtStrings] = createHandler(selector, eventStr, eventHandler);
        });
        /* jshint +W083 */
      }
    }
  }

  /**
   * Map common mouse events to touch equivalents
   * @param eventStr
   * @returns {*}
   */
  function convertMouseToTouchEventStr(eventStr) {
    switch (eventStr) {
      case 'click':
        return 'touchend';
      case 'mousedown':
        return 'touchstart';
      case 'mouseup':
        return 'touchend';
      case 'mousemove':
        return 'touchmove';
      default:
        return eventStr;
    }
  }

  function createHandler(selector, eventStr, eventHandler) {
    var observable = _rx.dom(selector, eventStr),
        auto = true,
        el = document.querySelector(selector),
        tag = el.tagName.toLowerCase(),
        type = el.getAttribute('type');

    if (auto) {
      if (tag === 'input') {
        if (eventStr === 'blur' || eventStr === 'focus') {
          return observable.map(function (evt) {
            return evt.target.value;
          }).subscribe(eventHandler);
        } else if (eventStr === 'keyup' || eventStr === 'keydown') {
          return observable.throttle(100).map(function (evt) {
            return evt.target.value;
          }).subscribe(eventHandler);
        }
      } else if (tag === 'select') {
        if (eventStr === 'change') {
          return observable.map(function (evt) {
            return evt.target.value;
          }).subscribe(eventHandler);
        }
      }
    }

    //console.log("adding ", eventStr, 'to element type', document.querySelector(selector).tagName, document.querySelector(selector).getAttribute('type'));

    return observable.subscribe(eventHandler);
  }

  /**
   * Cleanly remove events
   */
  function undelegateEvents() {
    if (!_eventsMap) {
      return;
    }

    for (var event in _eventSubscribers) {
      _eventSubscribers[event].dispose();
      delete _eventSubscribers[event];
    }

    _eventSubscribers = Object.create(null);
  }

  return {
    setEvents: setEvents,
    getEvents: getEvents,
    undelegateEvents: undelegateEvents,
    delegateEvents: delegateEvents
  };
};

module.exports = MixinEventDelegator;

},{"../../nudoru/browser/BrowserInfo.js":31,"../utils/Rx":23}],28:[function(require,module,exports){
/*  weak */

var MixinNudoruControls = function MixinNudoruControls() {

  var _notificationView = require('../../nudoru/components/ToastView.js'),
      _toolTipView = require('../../nudoru/components/ToolTipView.js'),
      _messageBoxView = require('../../nudoru/components/MessageBoxView.js'),
      _messageBoxCreator = require('../../nudoru/components/MessageBoxCreator.js'),
      _modalCoverView = require('../../nudoru/components/ModalCoverView.js');

  function initializeNudoruControls() {
    _toolTipView.initialize('tooltip__container');
    _notificationView.initialize('toast__container');
    _messageBoxView.initialize('messagebox__container');
    _modalCoverView.initialize();
  }

  function mbCreator() {
    return _messageBoxCreator;
  }

  function addMessageBox(obj) {
    return _messageBoxView.add(obj);
  }

  function removeMessageBox(id) {
    _messageBoxView.remove(id);
  }

  function alert(message, title) {
    return mbCreator().alert(title || 'Alert', message);
  }

  function addNotification(obj) {
    return _notificationView.add(obj);
  }

  function notify(message, title, type) {
    return addNotification({
      title: title || '',
      type: type || _notificationView.type().DEFAULT,
      message: message
    });
  }

  return {
    initializeNudoruControls: initializeNudoruControls,
    mbCreator: mbCreator,
    addMessageBox: addMessageBox,
    removeMessageBox: removeMessageBox,
    addNotification: addNotification,
    alert: alert,
    notify: notify
  };
};

module.exports = MixinNudoruControls();

},{"../../nudoru/components/MessageBoxCreator.js":34,"../../nudoru/components/MessageBoxView.js":35,"../../nudoru/components/ModalCoverView.js":36,"../../nudoru/components/ToastView.js":37,"../../nudoru/components/ToolTipView.js":38}],29:[function(require,module,exports){
/*  weak */

/**
 * Mixin view that allows for component views to be display on store state changes
 */

var MixinStoreStateViews = function MixinStoreStateViews() {

  var _this,
      _watchedStore,
      _currentViewID,
      _currentStoreState,
      _stateViewMountPoint,
      _stateViewIDMap = Object.create(null);

  /**
   * Set up listeners
   */
  function initializeStateViews(store) {
    _this = this; // mitigation, Due to events, scope may be set to the window object
    _watchedStore = store;

    this.createSubject('viewChange');

    _watchedStore.subscribe(function onStateChange() {
      handleStateChange();
    });
  }

  /**
   * Show route from URL hash on change
   * @param routeObj
   */
  function handleStateChange() {
    showViewForCurrentStoreState();
  }

  function showViewForCurrentStoreState() {
    var state = _watchedStore.getState().currentState;
    if (state) {
      if (state !== _currentStoreState) {
        _currentStoreState = state;
        showStateViewComponent.bind(_this)(_currentStoreState);
      }
    }
  }

  /**
   * Set the location for the view to mount on route changes, any contents will
   * be removed prior
   * @param elID
   */
  function setViewMountPoint(elID) {
    _stateViewMountPoint = elID;
  }

  function getViewMountPoint() {
    return _stateViewMountPoint;
  }

  /**
   * Map a route to a module view controller
   * @param templateID
   * @param componentIDorObj
   */
  function mapStateToViewComponent(state, templateID, componentIDorObj) {
    _stateViewIDMap[state] = templateID;
    this.mapViewComponent(templateID, componentIDorObj, _stateViewMountPoint);
  }

  /**
   * Show a view (in response to a route change)
   * @param state
   */
  function showStateViewComponent(state) {
    var componentID = _stateViewIDMap[state];
    if (!componentID) {
      console.warn("No view mapped for route: " + state);
      return;
    }

    removeCurrentView();

    _currentViewID = componentID;
    this.showViewComponent(_currentViewID);

    // Transition new view in
    TweenLite.set(_stateViewMountPoint, { alpha: 0 });
    TweenLite.to(_stateViewMountPoint, 0.25, { alpha: 1, ease: Quad.easeIn });

    this.notifySubscribersOf('viewChange', componentID);
  }

  /**
   * Remove the currently displayed view
   */
  function removeCurrentView() {
    if (_currentViewID) {
      _this.getComponentViewMap()[_currentViewID].controller.unmount();
    }
    _currentViewID = '';
  }

  return {
    initializeStateViews: initializeStateViews,
    showViewForCurrentStoreState: showViewForCurrentStoreState,
    showStateViewComponent: showStateViewComponent,
    setViewMountPoint: setViewMountPoint,
    getViewMountPoint: getViewMountPoint,
    mapStateToViewComponent: mapStateToViewComponent
  };
};

module.exports = MixinStoreStateViews();

},{}],30:[function(require,module,exports){
/*  weak */

/**
 * Base module for components
 * Must be extended with custom modules
 */

var _template = require('../utils/Templating.js');

var ViewComponent = function ViewComponent() {

  var _isInitialized = false,
      _configProps,
      _id,
      _templateObjCache,
      _html,
      _DOMElement,
      _mountPoint,
      _children = [],
      _isMounted = false,
      _renderer = require('../utils/Renderer');

  /**
   * Initialization
   * @param configProps
   */
  function initializeComponent(configProps) {
    _configProps = configProps;
    _id = configProps.id;
    _mountPoint = configProps.mountPoint;

    this.setState(this.getInitialState());
    this.setEvents(this.defineEvents());

    this.createSubject('update');
    this.createSubject('mount');
    this.createSubject('unmount');

    _isInitialized = true;
  }

  function defineEvents() {
    return undefined;
  }

  /**
   * Bind updates to the map ID to this view's update
   * @param mapIDorObj Object to subscribe to or ID. Should implement nori/store/MixinObservableStore
   */
  function bindMap(mapIDorObj) {
    var map;

    if (is.object(mapIDorObj)) {
      map = mapIDorObj;
    } else {
      map = Nori.store().getMap(mapIDorObj) || Nori.store().getMapCollection(mapIDorObj);
    }

    if (!map) {
      console.warn('ViewComponent bindMap, map or mapcollection not found: ' + mapIDorObj);
      return;
    }

    if (!is['function'](map.subscribe)) {
      console.warn('ViewComponent bindMap, map or mapcollection must be observable: ' + mapIDorObj);
      return;
    }

    map.subscribe(this.update.bind(this));
  }

  /**
   * Add a child
   * @param child
   */
  //function addChild(child) {
  //  _children.push(child);
  //}

  /**
   * Remove a child
   * @param child
   */
  //function removeChild(child) {
  //  var idx = _children.indexOf(child);
  //  _children[idx].unmount();
  //  _children.splice(idx, 1);
  //}

  /**
   * Before the view updates and a rerender occurs
   * Returns nextState of component
   */
  function componentWillUpdate() {
    return this.getState();
  }

  function update() {
    var currentState = this.getState();
    var nextState = this.componentWillUpdate();

    if (this.shouldComponentUpdate(nextState)) {
      this.setState(nextState);
      //_children.forEach(function updateChild(child) {
      //  child.update();
      //});

      if (_isMounted) {
        if (this.shouldComponentRender(currentState)) {
          this.unmount();
          this.componentRender();
          this.mount();
        }
      }
      this.notifySubscribersOf('update', this.getID());
    }
  }

  /**
   * Compare current state and next state to determine if updating should occur
   * @param nextState
   * @returns {*}
   */
  function shouldComponentUpdate(nextState) {
    return is.existy(nextState);
  }

  /**
   * Render it, need to add it to a parent container, handled in higher level view
   * @returns {*}
   */
  function componentRender() {
    //_children.forEach(function renderChild(child) {
    //  child.componentRender();
    //});
    if (!_templateObjCache) {
      _templateObjCache = this.template();
    }

    _html = this.render(this.getState());
  }

  /**
   * Returns a Lodash client side template function by getting the HTML source from
   * the matching <script type='text/template'> tag in the document. OR you may
   * specify the custom HTML to use here.
   *
   * The method is called only on the first render and cached to speed up renders
   *
   * @returns {Function}
   */
  function template() {
    // assumes the template ID matches the component's ID as passed on initialize
    var html = _template.getSource(this.getID());
    return _.template(html);
  }

  /**
   * May be overridden in a submodule for custom rendering
   * Should return HTML
   * @returns {*}
   */
  function render(state) {
    return _templateObjCache(state);
  }

  /**
   * Append it to a parent element
   * @param mountEl
   */
  function mount() {
    if (!_html) {
      throw new Error('Component ' + _id + ' cannot mount with no HTML. Call render() first?');
    }

    _isMounted = true;

    _DOMElement = _renderer.render({
      target: _mountPoint,
      html: _html
    });

    if (this.delegateEvents) {
      this.delegateEvents();
    }

    if (this.componentDidMount) {
      this.componentDidMount();
    }

    this.notifySubscribersOf('mount', this.getID());
  }

  /**
   * Call after it's been added to a view
   */
  function componentDidMount() {}
  // stub

  /**
   * Call when unloading
   */
  function componentWillUnmount() {
    // stub
  }

  function unmount() {
    this.componentWillUnmount();
    _isMounted = false;

    if (this.undelegateEvents) {
      this.undelegateEvents();
    }

    _renderer.render({
      target: _mountPoint,
      html: ''
    });

    _html = '';
    _DOMElement = null;
    this.notifySubscribersOf('unmount', this.getID());
  }

  //----------------------------------------------------------------------------
  //  Utils
  //----------------------------------------------------------------------------

  /**
   * http://mithril.js.org/mithril.withAttr.html
   * This is an event handler factory. It returns a method that can be bound to a
   * DOM element's event listener.
   *
   * This method is provided to decouple the browser's event model from the
   * controller/logic model.
   *
   * You should use this method and implement similar ones when extracting values
   * from a browser's Event object, instead of hard-coding the extraction code
   * into controllers (or model methods).
   * @param prop
   * @param callback
   * @param context
   * @returns {Function}
   */
  function withAttr(prop, callback, context) {
    return function (e) {
      e = e || event;

      var currentTarget = e.currentTarget || this,
          cntx = context || this;

      callback.call(cntx, prop in currentTarget ? currentTarget[prop] : currentTarget.getAttribute(prop));
    };
  }

  //----------------------------------------------------------------------------
  //  Accessors
  //----------------------------------------------------------------------------

  function isInitialized() {
    return _isInitialized;
  }

  function getConfigProps() {
    return _configProps;
  }

  function isMounted() {
    return _isMounted;
  }

  function getInitialState() {
    this.setState({});
  }

  function getID() {
    return _id;
  }

  function getDOMElement() {
    return _DOMElement;
  }

  //function getChildren() {
  //  return _children.slice(0);
  //}

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    initializeComponent: initializeComponent,
    defineEvents: defineEvents,
    isInitialized: isInitialized,
    getConfigProps: getConfigProps,
    getInitialState: getInitialState,
    getID: getID,
    template: template,
    getDOMElement: getDOMElement,
    isMounted: isMounted,

    bindMap: bindMap,

    componentWillUpdate: componentWillUpdate,
    shouldComponentUpdate: shouldComponentUpdate,
    update: update,

    componentRender: componentRender,
    render: render,

    mount: mount,
    componentDidMount: componentDidMount,

    componentWillUnmount: componentWillUnmount,
    unmount: unmount,

    withAttr: withAttr

    //addChild   : addChild,
    //removeChild: removeChild,
    //getChildren: getChildren
  };
};

module.exports = ViewComponent;

},{"../utils/Renderer":21,"../utils/Templating.js":24}],31:[function(require,module,exports){
var browserInfo = {

  appVersion: navigator.appVersion,
  userAgent: navigator.userAgent,
  isIE: -1 < navigator.userAgent.indexOf("MSIE "),
  isIE6: this.isIE && -1 < navigator.appVersion.indexOf("MSIE 6"),
  isIE7: this.isIE && -1 < navigator.appVersion.indexOf("MSIE 7"),
  isIE8: this.isIE && -1 < navigator.appVersion.indexOf("MSIE 8"),
  isIE9: this.isIE && -1 < navigator.appVersion.indexOf("MSIE 9"),
  isFF: -1 < navigator.userAgent.indexOf("Firefox/"),
  isChrome: -1 < navigator.userAgent.indexOf("Chrome/"),
  isMac: -1 < navigator.userAgent.indexOf("Macintosh,"),
  isMacSafari: -1 < navigator.userAgent.indexOf("Safari") && -1 < navigator.userAgent.indexOf("Mac") && -1 === navigator.userAgent.indexOf("Chrome"),

  hasTouch: 'ontouchstart' in document.documentElement,
  notSupported: this.isIE6 || this.isIE7 || this.isIE8 || this.isIE9,

  mobile: {
    Android: function Android() {
      return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function BlackBerry() {
      return navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/BB10; Touch/);
    },
    iOS: function iOS() {
      return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function Opera() {
      return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function Windows() {
      return navigator.userAgent.match(/IEMobile/i);
    },
    any: function any() {
      return (this.Android() || this.BlackBerry() || this.iOS() || this.Opera() || this.Windows()) !== null;
    }

  },

  // TODO filter for IE > 9
  enhanced: function enhanced() {
    return !_browserInfo.isIE && !_browserInfo.mobile.any();
  },

  mouseDownEvtStr: function mouseDownEvtStr() {
    return this.mobile.any() ? "touchstart" : "mousedown";
  },

  mouseUpEvtStr: function mouseUpEvtStr() {
    return this.mobile.any() ? "touchend" : "mouseup";
  },

  mouseClickEvtStr: function mouseClickEvtStr() {
    return this.mobile.any() ? "touchend" : "click";
  },

  mouseMoveEvtStr: function mouseMoveEvtStr() {
    return this.mobile.any() ? "touchmove" : "mousemove";
  }

};

module.exports = browserInfo;

},{}],32:[function(require,module,exports){
module.exports = {

  // http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
  // element must be entirely on screen
  isElementEntirelyInViewport: function isElementEntirelyInViewport(el) {
    var rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
  },

  // element may be partialy on screen
  isElementInViewport: function isElementInViewport(el) {
    var rect = el.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0 && rect.left < (window.innerWidth || document.documentElement.clientWidth) && rect.top < (window.innerHeight || document.documentElement.clientHeight);
  },

  isDomObj: function isDomObj(obj) {
    return !!(obj.nodeType || obj === window);
  },

  position: function position(el) {
    return {
      left: el.offsetLeft,
      top: el.offsetTop
    };
  },

  // from http://jsperf.com/jquery-offset-vs-offsetparent-loop
  offset: function offset(el) {
    var ol = 0,
        ot = 0;
    if (el.offsetParent) {
      do {
        ol += el.offsetLeft;
        ot += el.offsetTop;
      } while (el = el.offsetParent); // jshint ignore:line
    }
    return {
      left: ol,
      top: ot
    };
  },

  removeAllElements: function removeAllElements(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  },

  //http://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro
  HTMLStrToNode: function HTMLStrToNode(str) {
    var temp = document.createElement('div');
    temp.innerHTML = str;
    return temp.firstChild;
  },

  wrapElement: function wrapElement(wrapperStr, el) {
    var wrapperEl = this.HTMLStrToNode(wrapperStr),
        elParent = el.parentNode;

    wrapperEl.appendChild(el);
    elParent.appendChild(wrapperEl);
    return wrapperEl;
  },

  // http://stackoverflow.com/questions/15329167/closest-ancestor-matching-selector-using-native-dom
  closest: function closest(el, selector) {
    var matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
    while (el) {
      if (matchesSelector.bind(el)(selector)) {
        return el;
      } else {
        el = el.parentElement;
      }
    }
    return false;
  },

  // from youmightnotneedjquery.com
  hasClass: function hasClass(el, className) {
    if (el.classList) {
      el.classList.contains(className);
    } else {
      new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
    }
  },

  addClass: function addClass(el, className) {
    if (el.classList) {
      el.classList.add(className);
    } else {
      el.className += ' ' + className;
    }
  },

  removeClass: function removeClass(el, className) {
    if (el.classList) {
      el.classList.remove(className);
    } else {
      el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  },

  toggleClass: function toggleClass(el, className) {
    if (this.hasClass(el, className)) {
      this.removeClass(el, className);
    } else {
      this.addClass(el, className);
    }
  },

  // From impress.js
  applyCSS: function applyCSS(el, props) {
    var key, pkey;
    for (key in props) {
      if (props.hasOwnProperty(key)) {
        el.style[key] = props[key];
      }
    }
    return el;
  },

  // from impress.js
  // `computeWindowScale` counts the scale factor between window size and size
  // defined for the presentation in the config.
  computeWindowScale: function computeWindowScale(config) {
    var hScale = window.innerHeight / config.height,
        wScale = window.innerWidth / config.width,
        scale = hScale > wScale ? wScale : hScale;

    if (config.maxScale && scale > config.maxScale) {
      scale = config.maxScale;
    }

    if (config.minScale && scale < config.minScale) {
      scale = config.minScale;
    }

    return scale;
  },

  /**
   * Get an array of elements in the container returned as Array instead of a Node list
   */
  getQSElementsAsArray: function getQSElementsAsArray(el, cls) {
    return Array.prototype.slice.call(el.querySelectorAll(cls), 0);
  },

  centerElementInViewPort: function centerElementInViewPort(el) {
    var vpH = window.innerHeight,
        vpW = window.innerWidth,
        elR = el.getBoundingClientRect(),
        elH = elR.height,
        elW = elR.width;

    el.style.left = vpW / 2 - elW / 2 + 'px';
    el.style.top = vpH / 2 - elH / 2 + 'px';
  },

  /**
   * Creates an object from the name (or id) attribs and data of a form
   * @param el
   * @returns {null}
   */
  captureFormData: function captureFormData(el) {
    var dataObj = Object.create(null),
        textareaEls,
        inputEls,
        selectEls;

    textareaEls = Array.prototype.slice.call(el.querySelectorAll('textarea'), 0);
    inputEls = Array.prototype.slice.call(el.querySelectorAll('input'), 0);
    selectEls = Array.prototype.slice.call(el.querySelectorAll('select'), 0);

    textareaEls.forEach(getInputFormData);
    inputEls.forEach(getInputFormData);
    selectEls.forEach(getSelectFormData);

    return dataObj;

    function getInputFormData(formEl) {
      dataObj[getElNameOrID(formEl)] = formEl.value;
    }

    function getSelectFormData(formEl) {
      var sel = formEl.selectedIndex,
          val = '';
      if (sel >= 0) {
        val = formEl.options[sel].value;
      }
      dataObj[getElNameOrID(formEl)] = val;
    }

    function getElNameOrID(formEl) {
      var name = 'no_name';
      if (formEl.getAttribute('name')) {
        name = formEl.getAttribute('name');
      } else if (formEl.getAttribute('id')) {
        name = formEl.getAttribute('id');
      }
      return name;
    }
  }

};

},{}],33:[function(require,module,exports){
module.exports = {

  /**
   * Create shared 3d perspective for all children
   * @param el
   */
  apply3DToContainer: function apply3DToContainer(el) {
    TweenLite.set(el, {
      css: {
        perspective: 800,
        perspectiveOrigin: '50% 50%'
      }
    });
  },

  /**
   * Apply basic CSS props
   * @param el
   */
  apply3DToElement: function apply3DToElement(el) {
    TweenLite.set(el, {
      css: {
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        transformOrigin: '50% 50%'
      }
    });
  },

  /**
   * Apply basic 3d props and set unique perspective for children
   * @param el
   */
  applyUnique3DToElement: function applyUnique3DToElement(el) {
    TweenLite.set(el, {
      css: {
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        transformPerspective: 600,
        transformOrigin: '50% 50%'
      }
    });
  }

};

},{}],34:[function(require,module,exports){
var MessageBoxCreator = function MessageBoxCreator() {

  var _messageBoxView = require('./MessageBoxView');

  function alert(title, message, modal, cb) {
    return _messageBoxView.add({
      title: title,
      content: '<p>' + message + '</p>',
      type: _messageBoxView.type().DANGER,
      modal: modal,
      width: 400,
      buttons: [{
        label: 'Close',
        id: 'Close',
        type: '',
        icon: 'times',
        onClick: cb
      }]
    });
  }

  function confirm(title, message, okCB, modal) {
    return _messageBoxView.add({
      title: title,
      content: '<p>' + message + '</p>',
      type: _messageBoxView.type().DEFAULT,
      modal: modal,
      width: 400,
      buttons: [{
        label: 'Cancel',
        id: 'Cancel',
        type: 'negative',
        icon: 'times'
      }, {
        label: 'Proceed',
        id: 'proceed',
        type: 'positive',
        icon: 'check',
        onClick: okCB
      }]
    });
  }

  function prompt(title, message, okCB, modal) {
    return _messageBoxView.add({
      title: title,
      content: '<p class="text-center padding-bottom-double">' + message + '</p><textarea name="response" class="input-text" type="text" style="width:400px; height:75px; resize: none" autofocus="true"></textarea>',
      type: _messageBoxView.type().DEFAULT,
      modal: modal,
      width: 450,
      buttons: [{
        label: 'Cancel',
        id: 'Cancel',
        type: 'negative',
        icon: 'times'
      }, {
        label: 'Proceed',
        id: 'proceed',
        type: 'positive',
        icon: 'check',
        onClick: okCB
      }]
    });
  }

  function choice(title, message, selections, okCB, modal) {
    var selectHTML = '<select class="spaced" style="width:450px;height:200px" name="selection" autofocus="true" size="20">';

    selections.forEach(function (opt) {
      selectHTML += '<option value="' + opt.value + '" ' + (opt.selected === 'true' ? 'selected' : '') + '>' + opt.label + '</option>';
    });

    selectHTML += '</select>';

    return _messageBoxView.add({
      title: title,
      content: '<p class="text-center padding-bottom-double">' + message + '</p><div class="text-center">' + selectHTML + '</div>',
      type: _messageBoxView.type().DEFAULT,
      modal: modal,
      width: 500,
      buttons: [{
        label: 'Cancel',
        id: 'Cancel',
        type: 'negative',
        icon: 'times'
      }, {
        label: 'OK',
        id: 'ok',
        type: 'positive',
        icon: 'check',
        onClick: okCB
      }]
    });
  }

  return {
    alert: alert,
    confirm: confirm,
    prompt: prompt,
    choice: choice
  };
};

module.exports = MessageBoxCreator();

},{"./MessageBoxView":35}],35:[function(require,module,exports){
var MessageBoxView = function MessageBoxView() {

  var _children = [],
      _counter = 0,
      _highestZ = 1000,
      _defaultWidth = 400,
      _types = {
    DEFAULT: 'default',
    INFORMATION: 'information',
    SUCCESS: 'success',
    WARNING: 'warning',
    DANGER: 'danger'
  },
      _typeStyleMap = {
    'default': '',
    'information': 'messagebox__information',
    'success': 'messagebox__success',
    'warning': 'messagebox__warning',
    'danger': 'messagebox__danger'
  },
      _mountPoint,
      _buttonIconTemplateID = 'template__messagebox--button-icon',
      _buttonNoIconTemplateID = 'template__messagebox--button-noicon',
      _template = require('../../nori/utils/Templating.js'),
      _modal = require('./ModalCoverView.js'),
      _browserInfo = require('../../nudoru/browser/BrowserInfo.js'),
      _domUtils = require('../../nudoru/browser/DOMUtils.js'),
      _componentUtils = require('../../nudoru/browser/ThreeDTransforms.js');

  /**
   * Initialize and set the mount point / box container
   * @param elID
   */
  function initialize(elID) {
    _mountPoint = document.getElementById(elID);
  }

  /**
   * Add a new message box
   * @param initObj
   * @returns {*}
   */
  function add(initObj) {
    var type = initObj.type || _types.DEFAULT,
        boxObj = createBoxObject(initObj);

    // setup
    _children.push(boxObj);
    _mountPoint.appendChild(boxObj.element);
    assignTypeClassToElement(type, boxObj.element);
    configureButtons(boxObj);

    _componentUtils.applyUnique3DToElement(boxObj.element);

    // Set 3d CSS props for in/out transition
    TweenLite.set(boxObj.element, {
      css: {
        zIndex: _highestZ,
        width: initObj.width ? initObj.width : _defaultWidth
      }
    });

    // center after width has been set
    _domUtils.centerElementInViewPort(boxObj.element);

    // Make it draggable
    Draggable.create('#' + boxObj.id, {
      bounds: window,
      onPress: function onPress() {
        _highestZ = Draggable.zIndex;
      }
    });

    // Show it
    transitionIn(boxObj.element);

    // Show the modal cover
    if (initObj.modal) {
      _modal.showNonDismissable(true);
    }

    return boxObj.id;
  }

  /**
   * Assign a type class to it
   * @param type
   * @param element
   */
  function assignTypeClassToElement(type, element) {
    if (type !== 'default') {
      _domUtils.addClass(element, _typeStyleMap[type]);
    }
  }

  /**
   * Create the object for a box
   * @param initObj
   * @returns {{dataObj: *, id: string, modal: (*|boolean), element: *, streams: Array}}
   */
  function createBoxObject(initObj) {
    var id = 'js__messagebox-' + (_counter++).toString(),
        obj = {
      dataObj: initObj,
      id: id,
      modal: initObj.modal,
      element: _template.asElement('template__messagebox--default', {
        id: id,
        title: initObj.title,
        content: initObj.content
      }),
      streams: []
    };

    return obj;
  }

  /**
   * Set up the buttons
   * @param boxObj
   */
  function configureButtons(boxObj) {
    var buttonData = boxObj.dataObj.buttons;

    // default button if none
    if (!buttonData) {
      buttonData = [{
        label: 'Close',
        type: '',
        icon: 'times',
        id: 'default-close'
      }];
    }

    var buttonContainer = boxObj.element.querySelector('.footer-buttons');

    _domUtils.removeAllElements(buttonContainer);

    buttonData.forEach(function makeButton(buttonObj) {
      buttonObj.id = boxObj.id + '-button-' + buttonObj.id;

      var buttonEl;

      if (buttonObj.hasOwnProperty('icon')) {
        buttonEl = _template.asElement(_buttonIconTemplateID, buttonObj);
      } else {
        buttonEl = _template.asElement(_buttonNoIconTemplateID, buttonObj);
      }

      buttonContainer.appendChild(buttonEl);

      var btnStream = Rx.Observable.fromEvent(buttonEl, _browserInfo.mouseClickEvtStr()).subscribe(function () {
        if (buttonObj.hasOwnProperty('onClick')) {
          if (buttonObj.onClick) {
            buttonObj.onClick.call(this, captureFormData(boxObj.id));
          }
        }
        remove(boxObj.id);
      });
      boxObj.streams.push(btnStream);
    });
  }

  /**
   * Returns data from the form on the box contents
   * @param boxID
   * @returns {*}
   */
  function captureFormData(boxID) {
    return _domUtils.captureFormData(getObjByID(boxID).element);
  }

  /**
   * Remove a box from the screen / container
   * @param id
   */
  function remove(id) {
    var idx = getObjIndexByID(id),
        boxObj;

    if (idx > -1) {
      boxObj = _children[idx];
      transitionOut(boxObj.element);
    }
  }

  /**
   * Show the box
   * @param el
   */
  function transitionIn(el) {
    TweenLite.to(el, 0, { alpha: 0, rotationX: 45, scale: 2 });
    TweenLite.to(el, 0.5, {
      alpha: 1,
      rotationX: 0,
      scale: 1,
      ease: Circ.easeOut
    });
  }

  /**
   * Remove the box
   * @param el
   */
  function transitionOut(el) {
    TweenLite.to(el, 0.25, {
      alpha: 0,
      rotationX: -45,
      scale: 0.25,
      ease: Circ.easeIn, onComplete: function onComplete() {
        onTransitionOutComplete(el);
      }
    });
  }

  /**
   * Clean up after the transition out animation
   * @param el
   */
  function onTransitionOutComplete(el) {
    var idx = getObjIndexByID(el.getAttribute('id')),
        boxObj = _children[idx];

    boxObj.streams.forEach(function (stream) {
      stream.dispose();
    });

    Draggable.get('#' + boxObj.id).disable();

    _mountPoint.removeChild(el);

    _children[idx] = null;
    _children.splice(idx, 1);

    checkModalStatus();
  }

  /**
   * Determine if any open boxes have modal true
   */
  function checkModalStatus() {
    var isModal = false;

    _children.forEach(function (boxObj) {
      if (boxObj.modal === true) {
        isModal = true;
      }
    });

    if (!isModal) {
      _modal.hide(true);
    }
  }

  /**
   * Utility to get the box object index by ID
   * @param id
   * @returns {number}
   */
  function getObjIndexByID(id) {
    return _children.map(function (child) {
      return child.id;
    }).indexOf(id);
  }

  /**
   * Utility to get the box object by ID
   * @param id
   * @returns {number}
   */
  function getObjByID(id) {
    return _children.filter(function (child) {
      return child.id === id;
    })[0];
  }

  function getTypes() {
    return _types;
  }

  return {
    initialize: initialize,
    add: add,
    remove: remove,
    type: getTypes
  };
};

module.exports = MessageBoxView();

},{"../../nori/utils/Templating.js":24,"../../nudoru/browser/BrowserInfo.js":31,"../../nudoru/browser/DOMUtils.js":32,"../../nudoru/browser/ThreeDTransforms.js":33,"./ModalCoverView.js":36}],36:[function(require,module,exports){
var ModalCoverView = function ModalCoverView() {

  var _mountPoint = document,
      _modalCoverEl,
      _modalBackgroundEl,
      _modalCloseButtonEl,
      _modalClickStream,
      _isVisible,
      _notDismissible,
      _browserInfo = require('../../nudoru/browser/BrowserInfo.js');

  function initialize() {

    _isVisible = true;

    _modalCoverEl = _mountPoint.getElementById('modal__cover');
    _modalBackgroundEl = _mountPoint.querySelector('.modal__background');
    _modalCloseButtonEl = _mountPoint.querySelector('.modal__close-button');

    var modalBGClick = Rx.Observable.fromEvent(_modalBackgroundEl, _browserInfo.mouseClickEvtStr()),
        modalButtonClick = Rx.Observable.fromEvent(_modalCloseButtonEl, _browserInfo.mouseClickEvtStr());

    _modalClickStream = Rx.Observable.merge(modalBGClick, modalButtonClick).subscribe(function () {
      onModalClick();
    });

    hide(false);
  }

  function getIsVisible() {
    return _isVisible;
  }

  function onModalClick() {
    if (_notDismissible) {
      return;
    }
    hide(true);
  }

  function showModalCover(shouldAnimate) {
    _isVisible = true;
    var duration = shouldAnimate ? 0.25 : 0;
    TweenLite.to(_modalCoverEl, duration, {
      autoAlpha: 1,
      ease: Quad.easeOut
    });
    TweenLite.to(_modalBackgroundEl, duration, {
      alpha: 1,
      ease: Quad.easeOut
    });
  }

  function show(shouldAnimate) {
    if (_isVisible) {
      return;
    }

    _notDismissible = false;

    showModalCover(shouldAnimate);

    TweenLite.set(_modalCloseButtonEl, { scale: 2, alpha: 0 });
    TweenLite.to(_modalCloseButtonEl, 1, {
      autoAlpha: 1,
      scale: 1,
      ease: Bounce.easeOut,
      delay: 1
    });
  }

  /**
   * A 'hard' modal view cannot be dismissed with a click, must be via code
   * @param shouldAnimate
   */
  function showNonDismissable(shouldAnimate) {
    if (_isVisible) {
      return;
    }

    _notDismissible = true;

    showModalCover(shouldAnimate);
    TweenLite.to(_modalCloseButtonEl, 0, { autoAlpha: 0 });
  }

  function hide(shouldAnimate) {
    if (!_isVisible) {
      return;
    }
    _isVisible = false;
    _notDismissible = false;
    var duration = shouldAnimate ? 0.25 : 0;
    TweenLite.killDelayedCallsTo(_modalCloseButtonEl);
    TweenLite.to(_modalCoverEl, duration, {
      autoAlpha: 0,
      ease: Quad.easeOut
    });
    TweenLite.to(_modalCloseButtonEl, duration / 2, {
      autoAlpha: 0,
      ease: Quad.easeOut
    });
  }

  function setOpacity(opacity) {
    if (opacity < 0 || opacity > 1) {
      console.log('nudoru/component/ModalCoverView: setOpacity: opacity should be between 0 and 1');
      opacity = 1;
    }
    TweenLite.to(_modalBackgroundEl, 0.25, {
      alpha: opacity,
      ease: Quad.easeOut
    });
  }

  function setColor(r, g, b) {
    TweenLite.to(_modalBackgroundEl, 0.25, {
      backgroundColor: 'rgb(' + r + ',' + g + ',' + b + ')',
      ease: Quad.easeOut
    });
  }

  return {
    initialize: initialize,
    show: show,
    showNonDismissable: showNonDismissable,
    hide: hide,
    visible: getIsVisible,
    setOpacity: setOpacity,
    setColor: setColor
  };
};

module.exports = ModalCoverView();

},{"../../nudoru/browser/BrowserInfo.js":31}],37:[function(require,module,exports){
var ToastView = function ToastView() {

  var _children = [],
      _counter = 0,
      _defaultExpireDuration = 7000,
      _types = {
    DEFAULT: 'default',
    INFORMATION: 'information',
    SUCCESS: 'success',
    WARNING: 'warning',
    DANGER: 'danger'
  },
      _typeStyleMap = {
    'default': '',
    'information': 'toast__information',
    'success': 'toast__success',
    'warning': 'toast__warning',
    'danger': 'toast__danger'
  },
      _mountPoint,
      _template = require('../../nori/utils/Templating.js'),
      _browserInfo = require('../../nudoru/browser/BrowserInfo.js'),
      _domUtils = require('../../nudoru/browser/DOMUtils.js'),
      _componentUtils = require('../../nudoru/browser/ThreeDTransforms.js');

  function initialize(elID) {
    _mountPoint = document.getElementById(elID);
  }

  //obj.title, obj.content, obj.type
  function add(initObj) {
    initObj.type = initObj.type || _types.DEFAULT;

    var toastObj = createToastObject(initObj.title, initObj.message);

    _children.push(toastObj);

    _mountPoint.insertBefore(toastObj.element, _mountPoint.firstChild);

    assignTypeClassToElement(initObj.type, toastObj.element);

    _componentUtils.apply3DToContainer(_mountPoint);
    _componentUtils.apply3DToElement(toastObj.element);

    var closeBtn = toastObj.element.querySelector('.toast__item-controls > button'),
        closeBtnSteam = Rx.Observable.fromEvent(closeBtn, _browserInfo.mouseClickEvtStr()),
        expireTimeStream = Rx.Observable.interval(_defaultExpireDuration);

    toastObj.defaultButtonStream = Rx.Observable.merge(closeBtnSteam, expireTimeStream).take(1).subscribe(function () {
      remove(toastObj.id);
    });

    transitionIn(toastObj.element);

    return toastObj.id;
  }

  function assignTypeClassToElement(type, element) {
    if (type !== 'default') {
      _domUtils.addClass(element, _typeStyleMap[type]);
    }
  }

  function createToastObject(title, message) {
    var id = 'js__toast-toastitem-' + (_counter++).toString(),
        obj = {
      id: id,
      element: _template.asElement('template__component--toast', {
        id: id,
        title: title,
        message: message
      }),
      defaultButtonStream: null
    };

    return obj;
  }

  function remove(id) {
    var idx = getObjIndexByID(id),
        toast;

    if (idx > -1) {
      toast = _children[idx];
      rearrange(idx);
      transitionOut(toast.element);
    }
  }

  function transitionIn(el) {
    TweenLite.to(el, 0, { alpha: 0 });
    TweenLite.to(el, 1, { alpha: 1, ease: Quad.easeOut });
    rearrange();
  }

  function transitionOut(el) {
    TweenLite.to(el, 0.25, {
      rotationX: -45,
      alpha: 0,
      ease: Quad.easeIn, onComplete: function onComplete() {
        onTransitionOutComplete(el);
      }
    });
  }

  function onTransitionOutComplete(el) {
    var idx = getObjIndexByID(el.getAttribute('id')),
        toastObj = _children[idx];

    toastObj.defaultButtonStream.dispose();

    _mountPoint.removeChild(el);
    _children[idx] = null;
    _children.splice(idx, 1);
  }

  function rearrange(ignore) {
    var i = _children.length - 1,
        current,
        y = 0;

    for (; i > -1; i--) {
      if (i === ignore) {
        continue;
      }
      current = _children[i];
      TweenLite.to(current.element, 0.75, { y: y, ease: Bounce.easeOut });
      y += 10 + current.element.clientHeight;
    }
  }

  function getObjIndexByID(id) {
    return _children.map(function (child) {
      return child.id;
    }).indexOf(id);
  }

  function getTypes() {
    return _types;
  }

  return {
    initialize: initialize,
    add: add,
    remove: remove,
    type: getTypes
  };
};

module.exports = ToastView();

},{"../../nori/utils/Templating.js":24,"../../nudoru/browser/BrowserInfo.js":31,"../../nudoru/browser/DOMUtils.js":32,"../../nudoru/browser/ThreeDTransforms.js":33}],38:[function(require,module,exports){
var ToolTipView = function ToolTipView() {

  var _children = [],
      _counter = 0,
      _defaultWidth = 200,
      _types = {
    DEFAULT: 'default',
    INFORMATION: 'information',
    SUCCESS: 'success',
    WARNING: 'warning',
    DANGER: 'danger',
    COACHMARK: 'coachmark'
  },
      _typeStyleMap = {
    'default': '',
    'information': 'tooltip__information',
    'success': 'tooltip__success',
    'warning': 'tooltip__warning',
    'danger': 'tooltip__danger',
    'coachmark': 'tooltip__coachmark'
  },
      _positions = {
    T: 'T',
    TR: 'TR',
    R: 'R',
    BR: 'BR',
    B: 'B',
    BL: 'BL',
    L: 'L',
    TL: 'TL'
  },
      _positionMap = {
    'T': 'tooltip__top',
    'TR': 'tooltip__topright',
    'R': 'tooltip__right',
    'BR': 'tooltip__bottomright',
    'B': 'tooltip__bottom',
    'BL': 'tooltip__bottomleft',
    'L': 'tooltip__left',
    'TL': 'tooltip__topleft'
  },
      _mountPoint,
      _template = require('../../nori/utils/Templating.js'),
      _domUtils = require('../../nudoru/browser/DOMUtils.js');

  function initialize(elID) {
    _mountPoint = document.getElementById(elID);
  }

  //obj.title, obj.content, obj.type, obj.target, obj.position
  function add(initObj) {
    initObj.type = initObj.type || _types.DEFAULT;

    var tooltipObj = createToolTipObject(initObj.title, initObj.content, initObj.position, initObj.targetEl, initObj.gutter, initObj.alwaysVisible);

    _children.push(tooltipObj);
    _mountPoint.appendChild(tooltipObj.element);

    tooltipObj.arrowEl = tooltipObj.element.querySelector('.arrow');
    assignTypeClassToElement(initObj.type, initObj.position, tooltipObj.element);

    TweenLite.set(tooltipObj.element, {
      css: {
        autoAlpha: tooltipObj.alwaysVisible ? 1 : 0,
        width: initObj.width ? initObj.width : _defaultWidth
      }
    });

    // cache these values, 3d transforms will alter size
    tooltipObj.width = tooltipObj.element.getBoundingClientRect().width;
    tooltipObj.height = tooltipObj.element.getBoundingClientRect().height;

    assignEventsToTargetEl(tooltipObj);
    positionToolTip(tooltipObj);

    if (tooltipObj.position === _positions.L || tooltipObj.position === _positions.R) {
      centerArrowVertically(tooltipObj);
    }

    if (tooltipObj.position === _positions.T || tooltipObj.position === _positions.B) {
      centerArrowHorizontally(tooltipObj);
    }

    return tooltipObj.element;
  }

  function assignTypeClassToElement(type, position, element) {
    if (type !== 'default') {
      _domUtils.addClass(element, _typeStyleMap[type]);
    }
    _domUtils.addClass(element, _positionMap[position]);
  }

  function createToolTipObject(title, message, position, target, gutter, alwaysVisible) {
    var id = 'js__tooltip-tooltipitem-' + (_counter++).toString(),
        obj = {
      id: id,
      position: position,
      targetEl: target,
      alwaysVisible: alwaysVisible || false,
      gutter: gutter || 15,
      elOverStream: null,
      elOutStream: null,
      height: 0,
      width: 0,
      element: _template.asElement('template__component--tooltip', {
        id: id,
        title: title,
        message: message
      }),
      arrowEl: null
    };

    return obj;
  }

  function assignEventsToTargetEl(tooltipObj) {
    if (tooltipObj.alwaysVisible) {
      return;
    }

    tooltipObj.elOverStream = Rx.Observable.fromEvent(tooltipObj.targetEl, 'mouseover').subscribe(function (evt) {
      showToolTip(tooltipObj.id);
    });

    tooltipObj.elOutStream = Rx.Observable.fromEvent(tooltipObj.targetEl, 'mouseout').subscribe(function (evt) {
      hideToolTip(tooltipObj.id);
    });
  }

  function showToolTip(id) {
    var tooltipObj = getObjByID(id);

    if (tooltipObj.alwaysVisible) {
      return;
    }

    positionToolTip(tooltipObj);
    transitionIn(tooltipObj.element);
  }

  function positionToolTip(tooltipObj) {
    var gutter = tooltipObj.gutter,
        xPos = 0,
        yPos = 0,
        tgtProps = tooltipObj.targetEl.getBoundingClientRect();

    if (tooltipObj.position === _positions.TL) {
      xPos = tgtProps.left - tooltipObj.width;
      yPos = tgtProps.top - tooltipObj.height;
    } else if (tooltipObj.position === _positions.T) {
      xPos = tgtProps.left + (tgtProps.width / 2 - tooltipObj.width / 2);
      yPos = tgtProps.top - tooltipObj.height - gutter;
    } else if (tooltipObj.position === _positions.TR) {
      xPos = tgtProps.right;
      yPos = tgtProps.top - tooltipObj.height;
    } else if (tooltipObj.position === _positions.R) {
      xPos = tgtProps.right + gutter;
      yPos = tgtProps.top + (tgtProps.height / 2 - tooltipObj.height / 2);
    } else if (tooltipObj.position === _positions.BR) {
      xPos = tgtProps.right;
      yPos = tgtProps.bottom;
    } else if (tooltipObj.position === _positions.B) {
      xPos = tgtProps.left + (tgtProps.width / 2 - tooltipObj.width / 2);
      yPos = tgtProps.bottom + gutter;
    } else if (tooltipObj.position === _positions.BL) {
      xPos = tgtProps.left - tooltipObj.width;
      yPos = tgtProps.bottom;
    } else if (tooltipObj.position === _positions.L) {
      xPos = tgtProps.left - tooltipObj.width - gutter;
      yPos = tgtProps.top + (tgtProps.height / 2 - tooltipObj.height / 2);
    }

    TweenLite.set(tooltipObj.element, {
      x: xPos,
      y: yPos
    });
  }

  function centerArrowHorizontally(tooltipObj) {
    var arrowProps = tooltipObj.arrowEl.getBoundingClientRect();
    TweenLite.set(tooltipObj.arrowEl, { x: tooltipObj.width / 2 - arrowProps.width / 2 });
  }

  function centerArrowVertically(tooltipObj) {
    var arrowProps = tooltipObj.arrowEl.getBoundingClientRect();
    TweenLite.set(tooltipObj.arrowEl, { y: tooltipObj.height / 2 - arrowProps.height / 2 - 2 });
  }

  function hideToolTip(id) {
    var tooltipObj = getObjByID(id);

    if (tooltipObj.alwaysVisible) {
      return;
    }

    transitionOut(tooltipObj.element);
  }

  function transitionIn(el) {
    TweenLite.to(el, 0.5, {
      autoAlpha: 1,
      ease: Circ.easeOut
    });
  }

  function transitionOut(el) {
    TweenLite.to(el, 0.05, {
      autoAlpha: 0,
      ease: Circ.easeOut
    });
  }

  function remove(el) {
    getObjByElement(el).forEach(function (tooltip) {
      if (tooltip.elOverStream) {
        tooltip.elOverStream.dispose();
      }
      if (tooltip.elOutStream) {
        tooltip.elOutStream.dispose();
      }

      TweenLite.killDelayedCallsTo(tooltip.element);

      _mountPoint.removeChild(tooltip.element);

      var idx = getObjIndexByID(tooltip.id);

      _children[idx] = null;
      _children.splice(idx, 1);
    });
  }

  function getObjByID(id) {
    return _children.filter(function (child) {
      return child.id === id;
    })[0];
  }

  function getObjIndexByID(id) {
    return _children.map(function (child) {
      return child.id;
    }).indexOf(id);
  }

  function getObjByElement(el) {
    return _children.filter(function (child) {
      return child.targetEl === el;
    });
  }

  function getTypes() {
    return _types;
  }

  function getPositions() {
    return _positions;
  }

  return {
    initialize: initialize,
    add: add,
    remove: remove,
    type: getTypes,
    position: getPositions
  };
};

module.exports = ToolTipView();

},{"../../nori/utils/Templating.js":24,"../../nudoru/browser/DOMUtils.js":32}],39:[function(require,module,exports){
module.exports = {

  isInteger: function isInteger(str) {
    return (/^-?\d+$/.test(str)
    );
  },

  rndNumber: function rndNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  clamp: function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  inRange: function inRange(val, min, max) {
    return val > min && val < max;
  },

  distanceTL: function distanceTL(point1, point2) {
    var xd = point2.left - point1.left,
        yd = point2.top - point1.top;
    return Math.sqrt(xd * xd + yd * yd);
  }

};

},{}],40:[function(require,module,exports){
module.exports = {

  /**
   * Test for
   * Object {"": undefined}
   * Object {undefined: undefined}
   * @param obj
   * @returns {boolean}
   */
  isNull: function isNull(obj) {
    var isnull = false;

    if (is.falsey(obj)) {
      return true;
    }

    for (var prop in obj) {
      if (prop === undefined || obj[prop] === undefined) {
        isnull = true;
      }
      break;
    }

    return isnull;
  },

  dynamicSort: function dynamicSort(property) {
    return function (a, b) {
      return a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
    };
  },

  searchObjects: (function (_searchObjects) {
    function searchObjects(_x, _x2, _x3) {
      return _searchObjects.apply(this, arguments);
    }

    searchObjects.toString = function () {
      return _searchObjects.toString();
    };

    return searchObjects;
  })(function (obj, key, val) {
    var objects = [];
    for (var i in obj) {
      if (typeof obj[i] === 'object') {
        objects = objects.concat(searchObjects(obj[i], key, val));
      } else if (i === key && obj[key] === val) {
        objects.push(obj);
      }
    }
    return objects;
  }),

  getObjectFromString: function getObjectFromString(obj, str) {
    var i = 0,
        path = str.split('.'),
        len = path.length;

    for (; i < len; i++) {
      obj = obj[path[i]];
    }
    return obj;
  },

  getObjectIndexFromId: function getObjectIndexFromId(obj, id) {
    if (typeof obj === "object") {
      for (var i = 0; i < obj.length; i++) {
        if (typeof obj[i] !== "undefined" && typeof obj[i].id !== "undefined" && obj[i].id === id) {
          return i;
        }
      }
    }
    return false;
  },

  // extend and deep extend from http://youmightnotneedjquery.com/
  extend: function extend(out) {
    out = out || {};

    for (var i = 1; i < arguments.length; i++) {
      if (!arguments[i]) {
        continue;
      }

      for (var key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          out[key] = arguments[i][key];
        }
      }
    }

    return out;
  },

  deepExtend: (function (_deepExtend) {
    function deepExtend(_x4) {
      return _deepExtend.apply(this, arguments);
    }

    deepExtend.toString = function () {
      return _deepExtend.toString();
    };

    return deepExtend;
  })(function (out) {
    out = out || {};

    for (var i = 1; i < arguments.length; i++) {
      var obj = arguments[i];

      if (!obj) {
        continue;
      }

      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object') {
            deepExtend(out[key], obj[key]);
          } else {
            out[key] = obj[key];
          }
        }
      }
    }

    return out;
  }),

  /**
   * Simplified implementation of Stamps - http://ericleads.com/2014/02/prototypal-inheritance-with-stamps/
   * https://www.barkweb.co.uk/blog/object-composition-and-prototypical-inheritance-in-javascript
   *
   * Prototype object requires a methods object, private closures and state is optional
   *
   * @param prototype
   * @returns New object using prototype.methods as source
   */
  basicFactory: function basicFactory(prototype) {
    var proto = prototype,
        obj = Object.create(proto.methods);

    if (proto.hasOwnProperty('closure')) {
      proto.closures.forEach(function (closure) {
        closure.call(obj);
      });
    }

    if (proto.hasOwnProperty('state')) {
      for (var key in proto.state) {
        obj[key] = proto.state[key];
      }
    }

    return obj;
  },

  /**
   * Copyright 2013-2014 Facebook, Inc.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *
   */
  /**
   * Constructs an enumeration with keys equal to their value.
   *
   * https://github.com/STRML/keymirror
   *
   * For example:
   *
   *   var COLORS = keyMirror({blue: null, red: null});
   *   var myColor = COLORS.blue;
   *   var isColorValid = !!COLORS[myColor];
   *
   * The last line could not be performed if the values of the generated enum were
   * not equal to their keys.
   *
   *   Input:  {key1: val1, key2: val2}
   *   Output: {key1: key1, key2: key2}
   *
   * @param {object} obj
   * @return {object}
   */
  keyMirror: function keyMirror(obj) {
    var ret = {};
    var key;
    if (!(obj instanceof Object && !Array.isArray(obj))) {
      throw new Error('keyMirror(...): Argument must be an object.');
    }
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        ret[key] = key;
      }
    }
    return ret;
  }

};

},{}],41:[function(require,module,exports){
/**
 *  Copyright (c) 2014-2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */
!(function (t, e) {
  "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : t.Immutable = e();
})(this, function () {
  "use strict";function t(t, e) {
    e && (t.prototype = Object.create(e.prototype)), t.prototype.constructor = t;
  }function e(t) {
    return (t.value = !1, t);
  }function r(t) {
    t && (t.value = !0);
  }function n() {}function i(t, e) {
    e = e || 0;for (var r = Math.max(0, t.length - e), n = Array(r), i = 0; r > i; i++) n[i] = t[i + e];return n;
  }function o(t) {
    return (void 0 === t.size && (t.size = t.__iterate(s)), t.size);
  }function u(t, e) {
    if ("number" != typeof e) {
      var r = e >>> 0;if ("" + r !== e || 4294967295 === r) return NaN;e = r;
    }return 0 > e ? o(t) + e : e;
  }function s() {
    return !0;
  }function a(t, e, r) {
    return (0 === t || void 0 !== r && -r >= t) && (void 0 === e || void 0 !== r && e >= r);
  }function h(t, e) {
    return c(t, e, 0);
  }function f(t, e) {
    return c(t, e, e);
  }function c(t, e, r) {
    return void 0 === t ? r : 0 > t ? Math.max(0, e + t) : void 0 === e ? t : Math.min(e, t);
  }function _(t) {
    return y(t) ? t : O(t);
  }function p(t) {
    return d(t) ? t : x(t);
  }function v(t) {
    return m(t) ? t : k(t);
  }function l(t) {
    return y(t) && !g(t) ? t : A(t);
  }function y(t) {
    return !(!t || !t[vr]);
  }function d(t) {
    return !(!t || !t[lr]);
  }function m(t) {
    return !(!t || !t[yr]);
  }function g(t) {
    return d(t) || m(t);
  }function w(t) {
    return !(!t || !t[dr]);
  }function S(t) {
    this.next = t;
  }function z(t, e, r, n) {
    var i = 0 === t ? e : 1 === t ? r : [e, r];return (n ? n.value = i : n = { value: i, done: !1 }, n);
  }function I() {
    return { value: void 0, done: !0 };
  }function b(t) {
    return !!M(t);
  }function q(t) {
    return t && "function" == typeof t.next;
  }function D(t) {
    var e = M(t);return e && e.call(t);
  }function M(t) {
    var e = t && (Sr && t[Sr] || t[zr]);return "function" == typeof e ? e : void 0;
  }function E(t) {
    return t && "number" == typeof t.length;
  }function O(t) {
    return null === t || void 0 === t ? T() : y(t) ? t.toSeq() : C(t);
  }function x(t) {
    return null === t || void 0 === t ? T().toKeyedSeq() : y(t) ? d(t) ? t.toSeq() : t.fromEntrySeq() : W(t);
  }function k(t) {
    return null === t || void 0 === t ? T() : y(t) ? d(t) ? t.entrySeq() : t.toIndexedSeq() : B(t);
  }function A(t) {
    return (null === t || void 0 === t ? T() : y(t) ? d(t) ? t.entrySeq() : t : B(t)).toSetSeq();
  }function j(t) {
    this._array = t, this.size = t.length;
  }function R(t) {
    var e = Object.keys(t);this._object = t, this._keys = e, this.size = e.length;
  }function U(t) {
    this._iterable = t, this.size = t.length || t.size;
  }function K(t) {
    this._iterator = t, this._iteratorCache = [];
  }function L(t) {
    return !(!t || !t[br]);
  }function T() {
    return qr || (qr = new j([]));
  }function W(t) {
    var e = Array.isArray(t) ? new j(t).fromEntrySeq() : q(t) ? new K(t).fromEntrySeq() : b(t) ? new U(t).fromEntrySeq() : "object" == typeof t ? new R(t) : void 0;if (!e) throw new TypeError("Expected Array or iterable object of [k, v] entries, or keyed object: " + t);return e;
  }function B(t) {
    var e = J(t);if (!e) throw new TypeError("Expected Array or iterable object of values: " + t);return e;
  }function C(t) {
    var e = J(t) || "object" == typeof t && new R(t);if (!e) throw new TypeError("Expected Array or iterable object of values, or keyed object: " + t);return e;
  }function J(t) {
    return E(t) ? new j(t) : q(t) ? new K(t) : b(t) ? new U(t) : void 0;
  }function N(t, e, r, n) {
    var i = t._cache;if (i) {
      for (var o = i.length - 1, u = 0; o >= u; u++) {
        var s = i[r ? o - u : u];if (e(s[1], n ? s[0] : u, t) === !1) return u + 1;
      }return u;
    }return t.__iterateUncached(e, r);
  }function P(t, e, r, n) {
    var i = t._cache;if (i) {
      var o = i.length - 1,
          u = 0;return new S(function () {
        var t = i[r ? o - u : u];return u++ > o ? I() : z(e, n ? t[0] : u - 1, t[1]);
      });
    }return t.__iteratorUncached(e, r);
  }function H() {
    throw TypeError("Abstract");
  }function V() {}function Y() {}function Q() {}function X(t, e) {
    if (t === e || t !== t && e !== e) return !0;if (!t || !e) return !1;if ("function" == typeof t.valueOf && "function" == typeof e.valueOf) {
      if ((t = t.valueOf(), e = e.valueOf(), t === e || t !== t && e !== e)) return !0;if (!t || !e) return !1;
    }return "function" == typeof t.equals && "function" == typeof e.equals && t.equals(e) ? !0 : !1;
  }function F(t, e) {
    return e ? G(e, t, "", { "": t }) : Z(t);
  }function G(t, e, r, n) {
    return Array.isArray(e) ? t.call(n, r, k(e).map(function (r, n) {
      return G(t, r, n, e);
    })) : $(e) ? t.call(n, r, x(e).map(function (r, n) {
      return G(t, r, n, e);
    })) : e;
  }function Z(t) {
    return Array.isArray(t) ? k(t).map(Z).toList() : $(t) ? x(t).map(Z).toMap() : t;
  }function $(t) {
    return t && (t.constructor === Object || void 0 === t.constructor);
  }function tt(t) {
    return t >>> 1 & 1073741824 | 3221225471 & t;
  }function et(t) {
    if (t === !1 || null === t || void 0 === t) return 0;if ("function" == typeof t.valueOf && (t = t.valueOf(), t === !1 || null === t || void 0 === t)) return 0;if (t === !0) return 1;var e = typeof t;if ("number" === e) {
      var r = 0 | t;for (r !== t && (r ^= 4294967295 * t); t > 4294967295;) t /= 4294967295, r ^= t;return tt(r);
    }if ("string" === e) return t.length > jr ? rt(t) : nt(t);if ("function" == typeof t.hashCode) return t.hashCode();if ("object" === e) return it(t);if ("function" == typeof t.toString) return nt("" + t);throw Error("Value type " + e + " cannot be hashed.");
  }function rt(t) {
    var e = Kr[t];return (void 0 === e && (e = nt(t), Ur === Rr && (Ur = 0, Kr = {}), Ur++, Kr[t] = e), e);
  }function nt(t) {
    for (var e = 0, r = 0; t.length > r; r++) e = 31 * e + t.charCodeAt(r) | 0;return tt(e);
  }function it(t) {
    var e;if (xr && (e = Dr.get(t), void 0 !== e)) return e;if ((e = t[Ar], void 0 !== e)) return e;if (!Or) {
      if ((e = t.propertyIsEnumerable && t.propertyIsEnumerable[Ar], void 0 !== e)) return e;if ((e = ot(t), void 0 !== e)) return e;
    }if ((e = ++kr, 1073741824 & kr && (kr = 0), xr)) Dr.set(t, e);else {
      if (void 0 !== Er && Er(t) === !1) throw Error("Non-extensible objects are not allowed as keys.");if (Or) Object.defineProperty(t, Ar, { enumerable: !1, configurable: !1, writable: !1, value: e });else if (void 0 !== t.propertyIsEnumerable && t.propertyIsEnumerable === t.constructor.prototype.propertyIsEnumerable) t.propertyIsEnumerable = function () {
        return this.constructor.prototype.propertyIsEnumerable.apply(this, arguments);
      }, t.propertyIsEnumerable[Ar] = e;else {
        if (void 0 === t.nodeType) throw Error("Unable to set a non-enumerable property on object.");t[Ar] = e;
      }
    }return e;
  }function ot(t) {
    if (t && t.nodeType > 0) switch (t.nodeType) {case 1:
        return t.uniqueID;case 9:
        return t.documentElement && t.documentElement.uniqueID;}
  }function ut(t, e) {
    if (!t) throw Error(e);
  }function st(t) {
    ut(t !== 1 / 0, "Cannot perform this action with an infinite size.");
  }function at(t, e) {
    this._iter = t, this._useKeys = e, this.size = t.size;
  }function ht(t) {
    this._iter = t, this.size = t.size;
  }function ft(t) {
    this._iter = t, this.size = t.size;
  }function ct(t) {
    this._iter = t, this.size = t.size;
  }function _t(t) {
    var e = jt(t);return (e._iter = t, e.size = t.size, e.flip = function () {
      return t;
    }, e.reverse = function () {
      var e = t.reverse.apply(this);return (e.flip = function () {
        return t.reverse();
      }, e);
    }, e.has = function (e) {
      return t.includes(e);
    }, e.includes = function (e) {
      return t.has(e);
    }, e.cacheResult = Rt, e.__iterateUncached = function (e, r) {
      var n = this;return t.__iterate(function (t, r) {
        return e(r, t, n) !== !1;
      }, r);
    }, e.__iteratorUncached = function (e, r) {
      if (e === wr) {
        var n = t.__iterator(e, r);return new S(function () {
          var t = n.next();if (!t.done) {
            var e = t.value[0];t.value[0] = t.value[1], t.value[1] = e;
          }return t;
        });
      }return t.__iterator(e === gr ? mr : gr, r);
    }, e);
  }function pt(t, e, r) {
    var n = jt(t);return (n.size = t.size, n.has = function (e) {
      return t.has(e);
    }, n.get = function (n, i) {
      var o = t.get(n, cr);return o === cr ? i : e.call(r, o, n, t);
    }, n.__iterateUncached = function (n, i) {
      var o = this;return t.__iterate(function (t, i, u) {
        return n(e.call(r, t, i, u), i, o) !== !1;
      }, i);
    }, n.__iteratorUncached = function (n, i) {
      var o = t.__iterator(wr, i);return new S(function () {
        var i = o.next();if (i.done) return i;var u = i.value,
            s = u[0];return z(n, s, e.call(r, u[1], s, t), i);
      });
    }, n);
  }function vt(t, e) {
    var r = jt(t);return (r._iter = t, r.size = t.size, r.reverse = function () {
      return t;
    }, t.flip && (r.flip = function () {
      var e = _t(t);return (e.reverse = function () {
        return t.flip();
      }, e);
    }), r.get = function (r, n) {
      return t.get(e ? r : -1 - r, n);
    }, r.has = function (r) {
      return t.has(e ? r : -1 - r);
    }, r.includes = function (e) {
      return t.includes(e);
    }, r.cacheResult = Rt, r.__iterate = function (e, r) {
      var n = this;return t.__iterate(function (t, r) {
        return e(t, r, n);
      }, !r);
    }, r.__iterator = function (e, r) {
      return t.__iterator(e, !r);
    }, r);
  }function lt(t, e, r, n) {
    var i = jt(t);return (n && (i.has = function (n) {
      var i = t.get(n, cr);return i !== cr && !!e.call(r, i, n, t);
    }, i.get = function (n, i) {
      var o = t.get(n, cr);return o !== cr && e.call(r, o, n, t) ? o : i;
    }), i.__iterateUncached = function (i, o) {
      var u = this,
          s = 0;return (t.__iterate(function (t, o, a) {
        return e.call(r, t, o, a) ? (s++, i(t, n ? o : s - 1, u)) : void 0;
      }, o), s);
    }, i.__iteratorUncached = function (i, o) {
      var u = t.__iterator(wr, o),
          s = 0;return new S(function () {
        for (;;) {
          var o = u.next();if (o.done) return o;var a = o.value,
              h = a[0],
              f = a[1];if (e.call(r, f, h, t)) return z(i, n ? h : s++, f, o);
        }
      });
    }, i);
  }function yt(t, e, r) {
    var n = Lt().asMutable();return (t.__iterate(function (i, o) {
      n.update(e.call(r, i, o, t), 0, function (t) {
        return t + 1;
      });
    }), n.asImmutable());
  }function dt(t, e, r) {
    var n = d(t),
        i = (w(t) ? Ie() : Lt()).asMutable();
    t.__iterate(function (o, u) {
      i.update(e.call(r, o, u, t), function (t) {
        return (t = t || [], t.push(n ? [u, o] : o), t);
      });
    });var o = At(t);return i.map(function (e) {
      return Ot(t, o(e));
    });
  }function mt(_x, _x2, _x3, _x4) {
    var _again = true;

    _function: while (_again) {
      var t = _x,
          e = _x2,
          r = _x3,
          n = _x4;
      i = o = s = c = _ = p = undefined;
      _again = false;
      var i = t.size;if ((void 0 !== e && (e = 0 | e), void 0 !== r && (r = 0 | r), a(e, r, i))) return t;var o = h(e, i),
          s = f(r, i);if (o !== o || s !== s) {
        _x = t.toSeq().cacheResult();
        _x2 = e;
        _x3 = r;
        _x4 = n;
        _again = true;
        continue _function;
      }var c,
          _ = s - o;_ === _ && (c = 0 > _ ? 0 : _);var p = jt(t);return (p.size = 0 === c ? c : t.size && c || void 0, !n && L(t) && c >= 0 && (p.get = function (e, r) {
        return (e = u(this, e), e >= 0 && c > e ? t.get(e + o, r) : r);
      }), p.__iterateUncached = function (e, r) {
        var i = this;if (0 === c) return 0;if (r) return this.cacheResult().__iterate(e, r);var u = 0,
            s = !0,
            a = 0;return (t.__iterate(function (t, r) {
          return s && (s = u++ < o) ? void 0 : (a++, e(t, n ? r : a - 1, i) !== !1 && a !== c);
        }), a);
      }, p.__iteratorUncached = function (e, r) {
        if (0 !== c && r) return this.cacheResult().__iterator(e, r);var i = 0 !== c && t.__iterator(e, r),
            u = 0,
            s = 0;return new S(function () {
          for (; u++ < o;) i.next();if (++s > c) return I();var t = i.next();return n || e === gr ? t : e === mr ? z(e, s - 1, void 0, t) : z(e, s - 1, t.value[1], t);
        });
      }, p);
    }
  }function gt(t, e, r) {
    var n = jt(t);return (n.__iterateUncached = function (n, i) {
      var o = this;if (i) return this.cacheResult().__iterate(n, i);var u = 0;return (t.__iterate(function (t, i, s) {
        return e.call(r, t, i, s) && ++u && n(t, i, o);
      }), u);
    }, n.__iteratorUncached = function (n, i) {
      var o = this;if (i) return this.cacheResult().__iterator(n, i);var u = t.__iterator(wr, i),
          s = !0;return new S(function () {
        if (!s) return I();var t = u.next();if (t.done) return t;var i = t.value,
            a = i[0],
            h = i[1];return e.call(r, h, a, o) ? n === wr ? t : z(n, a, h, t) : (s = !1, I());
      });
    }, n);
  }function wt(t, e, r, n) {
    var i = jt(t);return (i.__iterateUncached = function (i, o) {
      var u = this;if (o) return this.cacheResult().__iterate(i, o);var s = !0,
          a = 0;return (t.__iterate(function (t, o, h) {
        return s && (s = e.call(r, t, o, h)) ? void 0 : (a++, i(t, n ? o : a - 1, u));
      }), a);
    }, i.__iteratorUncached = function (i, o) {
      var u = this;if (o) return this.cacheResult().__iterator(i, o);var s = t.__iterator(wr, o),
          a = !0,
          h = 0;return new S(function () {
        var t, o, f;do {
          if ((t = s.next(), t.done)) return n || i === gr ? t : i === mr ? z(i, h++, void 0, t) : z(i, h++, t.value[1], t);var c = t.value;o = c[0], f = c[1], a && (a = e.call(r, f, o, u));
        } while (a);
        return i === wr ? t : z(i, o, f, t);
      });
    }, i);
  }function St(t, e) {
    var r = d(t),
        n = [t].concat(e).map(function (t) {
      return (y(t) ? r && (t = p(t)) : t = r ? W(t) : B(Array.isArray(t) ? t : [t]), t);
    }).filter(function (t) {
      return 0 !== t.size;
    });if (0 === n.length) return t;if (1 === n.length) {
      var i = n[0];if (i === t || r && d(i) || m(t) && m(i)) return i;
    }var o = new j(n);return (r ? o = o.toKeyedSeq() : m(t) || (o = o.toSetSeq()), o = o.flatten(!0), o.size = n.reduce(function (t, e) {
      if (void 0 !== t) {
        var r = e.size;if (void 0 !== r) return t + r;
      }
    }, 0), o);
  }function zt(t, e, r) {
    var n = jt(t);return (n.__iterateUncached = function (n, i) {
      function o(t, a) {
        var h = this;t.__iterate(function (t, i) {
          return ((!e || e > a) && y(t) ? o(t, a + 1) : n(t, r ? i : u++, h) === !1 && (s = !0), !s);
        }, i);
      }var u = 0,
          s = !1;return (o(t, 0), u);
    }, n.__iteratorUncached = function (n, i) {
      var o = t.__iterator(n, i),
          u = [],
          s = 0;return new S(function () {
        for (; o;) {
          var t = o.next();if (t.done === !1) {
            var a = t.value;if ((n === wr && (a = a[1]), e && !(e > u.length) || !y(a))) return r ? t : z(n, s++, a, t);u.push(o), o = a.__iterator(n, i);
          } else o = u.pop();
        }return I();
      });
    }, n);
  }function It(t, e, r) {
    var n = At(t);return t.toSeq().map(function (i, o) {
      return n(e.call(r, i, o, t));
    }).flatten(!0);
  }function bt(t, e) {
    var r = jt(t);return (r.size = t.size && 2 * t.size - 1, r.__iterateUncached = function (r, n) {
      var i = this,
          o = 0;return (t.__iterate(function (t) {
        return (!o || r(e, o++, i) !== !1) && r(t, o++, i) !== !1;
      }, n), o);
    }, r.__iteratorUncached = function (r, n) {
      var i,
          o = t.__iterator(gr, n),
          u = 0;return new S(function () {
        return (!i || u % 2) && (i = o.next(), i.done) ? i : u % 2 ? z(r, u++, e) : z(r, u++, i.value, i);
      });
    }, r);
  }function qt(t, e, r) {
    e || (e = Ut);var n = d(t),
        i = 0,
        o = t.toSeq().map(function (e, n) {
      return [n, e, i++, r ? r(e, n, t) : e];
    }).toArray();return (o.sort(function (t, r) {
      return e(t[3], r[3]) || t[2] - r[2];
    }).forEach(n ? function (t, e) {
      o[e].length = 2;
    } : function (t, e) {
      o[e] = t[1];
    }), n ? x(o) : m(t) ? k(o) : A(o));
  }function Dt(t, e, r) {
    if ((e || (e = Ut), r)) {
      var n = t.toSeq().map(function (e, n) {
        return [e, r(e, n, t)];
      }).reduce(function (t, r) {
        return Mt(e, t[1], r[1]) ? r : t;
      });return n && n[0];
    }return t.reduce(function (t, r) {
      return Mt(e, t, r) ? r : t;
    });
  }function Mt(t, e, r) {
    var n = t(r, e);return 0 === n && r !== e && (void 0 === r || null === r || r !== r) || n > 0;
  }function Et(t, e, r) {
    var n = jt(t);return (n.size = new j(r).map(function (t) {
      return t.size;
    }).min(), n.__iterate = function (t, e) {
      for (var r, n = this.__iterator(gr, e), i = 0; !(r = n.next()).done && t(r.value, i++, this) !== !1;);return i;
    }, n.__iteratorUncached = function (t, n) {
      var i = r.map(function (t) {
        return (t = _(t), D(n ? t.reverse() : t));
      }),
          o = 0,
          u = !1;return new S(function () {
        var r;return (u || (r = i.map(function (t) {
          return t.next();
        }), u = r.some(function (t) {
          return t.done;
        })), u ? I() : z(t, o++, e.apply(null, r.map(function (t) {
          return t.value;
        }))));
      });
    }, n);
  }function Ot(t, e) {
    return L(t) ? e : t.constructor(e);
  }function xt(t) {
    if (t !== Object(t)) throw new TypeError("Expected [K, V] tuple: " + t);
  }function kt(t) {
    return (st(t.size), o(t));
  }function At(t) {
    return d(t) ? p : m(t) ? v : l;
  }function jt(t) {
    return Object.create((d(t) ? x : m(t) ? k : A).prototype);
  }function Rt() {
    return this._iter.cacheResult ? (this._iter.cacheResult(), this.size = this._iter.size, this) : O.prototype.cacheResult.call(this);
  }function Ut(t, e) {
    return t > e ? 1 : e > t ? -1 : 0;
  }function Kt(t) {
    var e = D(t);if (!e) {
      if (!E(t)) throw new TypeError("Expected iterable or array-like: " + t);e = D(_(t));
    }return e;
  }function Lt(t) {
    return null === t || void 0 === t ? Qt() : Tt(t) && !w(t) ? t : Qt().withMutations(function (e) {
      var r = p(t);st(r.size), r.forEach(function (t, r) {
        return e.set(r, t);
      });
    });
  }function Tt(t) {
    return !(!t || !t[Lr]);
  }function Wt(t, e) {
    this.ownerID = t, this.entries = e;
  }function Bt(t, e, r) {
    this.ownerID = t, this.bitmap = e, this.nodes = r;
  }function Ct(t, e, r) {
    this.ownerID = t, this.count = e, this.nodes = r;
  }function Jt(t, e, r) {
    this.ownerID = t, this.keyHash = e, this.entries = r;
  }function Nt(t, e, r) {
    this.ownerID = t, this.keyHash = e, this.entry = r;
  }function Pt(t, e, r) {
    this._type = e, this._reverse = r, this._stack = t._root && Vt(t._root);
  }function Ht(t, e) {
    return z(t, e[0], e[1]);
  }function Vt(t, e) {
    return { node: t, index: 0, __prev: e };
  }function Yt(t, e, r, n) {
    var i = Object.create(Tr);return (i.size = t, i._root = e, i.__ownerID = r, i.__hash = n, i.__altered = !1, i);
  }function Qt() {
    return Wr || (Wr = Yt(0));
  }function Xt(t, r, n) {
    var i, o;if (t._root) {
      var u = e(_r),
          s = e(pr);if ((i = Ft(t._root, t.__ownerID, 0, void 0, r, n, u, s), !s.value)) return t;o = t.size + (u.value ? n === cr ? -1 : 1 : 0);
    } else {
      if (n === cr) return t;o = 1, i = new Wt(t.__ownerID, [[r, n]]);
    }return t.__ownerID ? (t.size = o, t._root = i, t.__hash = void 0, t.__altered = !0, t) : i ? Yt(o, i) : Qt();
  }function Ft(t, e, n, i, o, u, s, a) {
    return t ? t.update(e, n, i, o, u, s, a) : u === cr ? t : (r(a), r(s), new Nt(e, i, [o, u]));
  }function Gt(t) {
    return t.constructor === Nt || t.constructor === Jt;
  }function Zt(t, e, r, n, i) {
    if (t.keyHash === n) return new Jt(e, n, [t.entry, i]);var o,
        u = (0 === r ? t.keyHash : t.keyHash >>> r) & fr,
        s = (0 === r ? n : n >>> r) & fr,
        a = u === s ? [Zt(t, e, r + ar, n, i)] : (o = new Nt(e, n, i), s > u ? [t, o] : [o, t]);return new Bt(e, 1 << u | 1 << s, a);
  }function $t(t, e, r, i) {
    t || (t = new n());for (var o = new Nt(t, et(r), [r, i]), u = 0; e.length > u; u++) {
      var s = e[u];o = o.update(t, 0, void 0, s[0], s[1]);
    }return o;
  }function te(t, e, r, n) {
    for (var i = 0, o = 0, u = Array(r), s = 0, a = 1, h = e.length; h > s; s++, a <<= 1) {
      var f = e[s];void 0 !== f && s !== n && (i |= a, u[o++] = f);
    }return new Bt(t, i, u);
  }function ee(t, e, r, n, i) {
    for (var o = 0, u = Array(hr), s = 0; 0 !== r; s++, r >>>= 1) u[s] = 1 & r ? e[o++] : void 0;return (u[n] = i, new Ct(t, o + 1, u));
  }function re(t, e, r) {
    for (var n = [], i = 0; r.length > i; i++) {
      var o = r[i],
          u = p(o);y(o) || (u = u.map(function (t) {
        return F(t);
      })), n.push(u);
    }return ie(t, e, n);
  }function ne(t) {
    return function (e, r, n) {
      return e && e.mergeDeepWith && y(r) ? e.mergeDeepWith(t, r) : t ? t(e, r, n) : r;
    };
  }function ie(t, e, r) {
    return (r = r.filter(function (t) {
      return 0 !== t.size;
    }), 0 === r.length ? t : 0 !== t.size || t.__ownerID || 1 !== r.length ? t.withMutations(function (t) {
      for (var n = e ? function (r, n) {
        t.update(n, cr, function (t) {
          return t === cr ? r : e(t, r, n);
        });
      } : function (e, r) {
        t.set(r, e);
      }, i = 0; r.length > i; i++) r[i].forEach(n);
    }) : t.constructor(r[0]));
  }function oe(t, e, r, n) {
    var i = t === cr,
        o = e.next();if (o.done) {
      var u = i ? r : t,
          s = n(u);return s === u ? t : s;
    }ut(i || t && t.set, "invalid keyPath");var a = o.value,
        h = i ? cr : t.get(a, cr),
        f = oe(h, e, r, n);return f === h ? t : f === cr ? t.remove(a) : (i ? Qt() : t).set(a, f);
  }function ue(t) {
    return (t -= t >> 1 & 1431655765, t = (858993459 & t) + (t >> 2 & 858993459), t = t + (t >> 4) & 252645135, t += t >> 8, t += t >> 16, 127 & t);
  }function se(t, e, r, n) {
    var o = n ? t : i(t);return (o[e] = r, o);
  }function ae(t, e, r, n) {
    var i = t.length + 1;if (n && e + 1 === i) return (t[e] = r, t);for (var o = Array(i), u = 0, s = 0; i > s; s++) s === e ? (o[s] = r, u = -1) : o[s] = t[s + u];return o;
  }function he(t, e, r) {
    var n = t.length - 1;if (r && e === n) return (t.pop(), t);for (var i = Array(n), o = 0, u = 0; n > u; u++) u === e && (o = 1), i[u] = t[u + o];return i;
  }function fe(t) {
    var e = le();if (null === t || void 0 === t) return e;if (ce(t)) return t;var r = v(t),
        n = r.size;return 0 === n ? e : (st(n), n > 0 && hr > n ? ve(0, n, ar, null, new _e(r.toArray())) : e.withMutations(function (t) {
      t.setSize(n), r.forEach(function (e, r) {
        return t.set(r, e);
      });
    }));
  }function ce(t) {
    return !(!t || !t[Nr]);
  }function _e(t, e) {
    this.array = t, this.ownerID = e;
  }function pe(t, e) {
    function r(t, e, r) {
      return 0 === e ? n(t, r) : i(t, e, r);
    }function n(t, r) {
      var n = r === s ? a && a.array : t && t.array,
          i = r > o ? 0 : o - r,
          h = u - r;return (h > hr && (h = hr), function () {
        if (i === h) return Vr;var t = e ? --h : i++;return n && n[t];
      });
    }function i(t, n, i) {
      var s,
          a = t && t.array,
          h = i > o ? 0 : o - i >> n,
          f = (u - i >> n) + 1;return (f > hr && (f = hr), function () {
        for (;;) {
          if (s) {
            var t = s();if (t !== Vr) return t;s = null;
          }if (h === f) return Vr;var o = e ? --f : h++;s = r(a && a[o], n - ar, i + (o << n));
        }
      });
    }var o = t._origin,
        u = t._capacity,
        s = ze(u),
        a = t._tail;return r(t._root, t._level, 0);
  }function ve(t, e, r, n, i, o, u) {
    var s = Object.create(Pr);return (s.size = e - t, s._origin = t, s._capacity = e, s._level = r, s._root = n, s._tail = i, s.__ownerID = o, s.__hash = u, s.__altered = !1, s);
  }function le() {
    return Hr || (Hr = ve(0, 0, ar));
  }function ye(t, r, n) {
    if ((r = u(t, r), r !== r)) return t;if (r >= t.size || 0 > r) return t.withMutations(function (t) {
      0 > r ? we(t, r).set(0, n) : we(t, 0, r + 1).set(r, n);
    });r += t._origin;var i = t._tail,
        o = t._root,
        s = e(pr);return (r >= ze(t._capacity) ? i = de(i, t.__ownerID, 0, r, n, s) : o = de(o, t.__ownerID, t._level, r, n, s), s.value ? t.__ownerID ? (t._root = o, t._tail = i, t.__hash = void 0, t.__altered = !0, t) : ve(t._origin, t._capacity, t._level, o, i) : t);
  }function de(t, e, n, i, o, u) {
    var s = i >>> n & fr,
        a = t && t.array.length > s;if (!a && void 0 === o) return t;var h;if (n > 0) {
      var f = t && t.array[s],
          c = de(f, e, n - ar, i, o, u);return c === f ? t : (h = me(t, e), h.array[s] = c, h);
    }return a && t.array[s] === o ? t : (r(u), h = me(t, e), void 0 === o && s === h.array.length - 1 ? h.array.pop() : h.array[s] = o, h);
  }function me(t, e) {
    return e && t && e === t.ownerID ? t : new _e(t ? t.array.slice() : [], e);
  }function ge(t, e) {
    if (e >= ze(t._capacity)) return t._tail;if (1 << t._level + ar > e) {
      for (var r = t._root, n = t._level; r && n > 0;) r = r.array[e >>> n & fr], n -= ar;return r;
    }
  }function we(t, e, r) {
    void 0 !== e && (e = 0 | e), void 0 !== r && (r = 0 | r);var i = t.__ownerID || new n(),
        o = t._origin,
        u = t._capacity,
        s = o + e,
        a = void 0 === r ? u : 0 > r ? u + r : o + r;
    if (s === o && a === u) return t;if (s >= a) return t.clear();for (var h = t._level, f = t._root, c = 0; 0 > s + c;) f = new _e(f && f.array.length ? [void 0, f] : [], i), h += ar, c += 1 << h;c && (s += c, o += c, a += c, u += c);for (var _ = ze(u), p = ze(a); p >= 1 << h + ar;) f = new _e(f && f.array.length ? [f] : [], i), h += ar;var v = t._tail,
        l = _ > p ? ge(t, a - 1) : p > _ ? new _e([], i) : v;if (v && p > _ && u > s && v.array.length) {
      f = me(f, i);for (var y = f, d = h; d > ar; d -= ar) {
        var m = _ >>> d & fr;y = y.array[m] = me(y.array[m], i);
      }y.array[_ >>> ar & fr] = v;
    }if ((u > a && (l = l && l.removeAfter(i, 0, a)), s >= p)) s -= p, a -= p, h = ar, f = null, l = l && l.removeBefore(i, 0, s);else if (s > o || _ > p) {
      for (c = 0; f;) {
        var g = s >>> h & fr;if (g !== p >>> h & fr) break;g && (c += (1 << h) * g), h -= ar, f = f.array[g];
      }f && s > o && (f = f.removeBefore(i, h, s - c)), f && _ > p && (f = f.removeAfter(i, h, p - c)), c && (s -= c, a -= c);
    }return t.__ownerID ? (t.size = a - s, t._origin = s, t._capacity = a, t._level = h, t._root = f, t._tail = l, t.__hash = void 0, t.__altered = !0, t) : ve(s, a, h, f, l);
  }function Se(t, e, r) {
    for (var n = [], i = 0, o = 0; r.length > o; o++) {
      var u = r[o],
          s = v(u);s.size > i && (i = s.size), y(u) || (s = s.map(function (t) {
        return F(t);
      })), n.push(s);
    }return (i > t.size && (t = t.setSize(i)), ie(t, e, n));
  }function ze(t) {
    return hr > t ? 0 : t - 1 >>> ar << ar;
  }function Ie(t) {
    return null === t || void 0 === t ? De() : be(t) ? t : De().withMutations(function (e) {
      var r = p(t);st(r.size), r.forEach(function (t, r) {
        return e.set(r, t);
      });
    });
  }function be(t) {
    return Tt(t) && w(t);
  }function qe(t, e, r, n) {
    var i = Object.create(Ie.prototype);return (i.size = t ? t.size : 0, i._map = t, i._list = e, i.__ownerID = r, i.__hash = n, i);
  }function De() {
    return Yr || (Yr = qe(Qt(), le()));
  }function Me(t, e, r) {
    var n,
        i,
        o = t._map,
        u = t._list,
        s = o.get(e),
        a = void 0 !== s;if (r === cr) {
      if (!a) return t;u.size >= hr && u.size >= 2 * o.size ? (i = u.filter(function (t, e) {
        return void 0 !== t && s !== e;
      }), n = i.toKeyedSeq().map(function (t) {
        return t[0];
      }).flip().toMap(), t.__ownerID && (n.__ownerID = i.__ownerID = t.__ownerID)) : (n = o.remove(e), i = s === u.size - 1 ? u.pop() : u.set(s, void 0));
    } else if (a) {
      if (r === u.get(s)[1]) return t;n = o, i = u.set(s, [e, r]);
    } else n = o.set(e, u.size), i = u.set(u.size, [e, r]);return t.__ownerID ? (t.size = n.size, t._map = n, t._list = i, t.__hash = void 0, t) : qe(n, i);
  }function Ee(t) {
    return null === t || void 0 === t ? ke() : Oe(t) ? t : ke().unshiftAll(t);
  }function Oe(t) {
    return !(!t || !t[Qr]);
  }function xe(t, e, r, n) {
    var i = Object.create(Xr);return (i.size = t, i._head = e, i.__ownerID = r, i.__hash = n, i.__altered = !1, i);
  }function ke() {
    return Fr || (Fr = xe(0));
  }function Ae(t) {
    return null === t || void 0 === t ? Ke() : je(t) && !w(t) ? t : Ke().withMutations(function (e) {
      var r = l(t);st(r.size), r.forEach(function (t) {
        return e.add(t);
      });
    });
  }function je(t) {
    return !(!t || !t[Gr]);
  }function Re(t, e) {
    return t.__ownerID ? (t.size = e.size, t._map = e, t) : e === t._map ? t : 0 === e.size ? t.__empty() : t.__make(e);
  }function Ue(t, e) {
    var r = Object.create(Zr);return (r.size = t ? t.size : 0, r._map = t, r.__ownerID = e, r);
  }function Ke() {
    return $r || ($r = Ue(Qt()));
  }function Le(t) {
    return null === t || void 0 === t ? Be() : Te(t) ? t : Be().withMutations(function (e) {
      var r = l(t);st(r.size), r.forEach(function (t) {
        return e.add(t);
      });
    });
  }function Te(t) {
    return je(t) && w(t);
  }function We(t, e) {
    var r = Object.create(tn);return (r.size = t ? t.size : 0, r._map = t, r.__ownerID = e, r);
  }function Be() {
    return en || (en = We(De()));
  }function Ce(t, e) {
    var r,
        n = function n(o) {
      if (o instanceof n) return o;if (!(this instanceof n)) return new n(o);if (!r) {
        r = !0;var u = Object.keys(t);Pe(i, u), i.size = u.length, i._name = e, i._keys = u, i._defaultValues = t;
      }this._map = Lt(o);
    },
        i = n.prototype = Object.create(rn);return (i.constructor = n, n);
  }function Je(t, e, r) {
    var n = Object.create(Object.getPrototypeOf(t));return (n._map = e, n.__ownerID = r, n);
  }function Ne(t) {
    return t._name || t.constructor.name || "Record";
  }function Pe(t, e) {
    try {
      e.forEach(He.bind(void 0, t));
    } catch (r) {}
  }function He(t, e) {
    Object.defineProperty(t, e, { get: function get() {
        return this.get(e);
      }, set: function set(t) {
        ut(this.__ownerID, "Cannot set on an immutable record."), this.set(e, t);
      } });
  }function Ve(t, e) {
    if (t === e) return !0;if (!y(e) || void 0 !== t.size && void 0 !== e.size && t.size !== e.size || void 0 !== t.__hash && void 0 !== e.__hash && t.__hash !== e.__hash || d(t) !== d(e) || m(t) !== m(e) || w(t) !== w(e)) return !1;if (0 === t.size && 0 === e.size) return !0;var r = !g(t);if (w(t)) {
      var n = t.entries();return e.every(function (t, e) {
        var i = n.next().value;return i && X(i[1], t) && (r || X(i[0], e));
      }) && n.next().done;
    }var i = !1;if (void 0 === t.size) if (void 0 === e.size) "function" == typeof t.cacheResult && t.cacheResult();else {
      i = !0;var o = t;t = e, e = o;
    }var u = !0,
        s = e.__iterate(function (e, n) {
      return (r ? t.has(e) : i ? X(e, t.get(n, cr)) : X(t.get(n, cr), e)) ? void 0 : (u = !1, !1);
    });return u && t.size === s;
  }function Ye(t, e, r) {
    if (!(this instanceof Ye)) return new Ye(t, e, r);if ((ut(0 !== r, "Cannot step a Range by 0"), t = t || 0, void 0 === e && (e = 1 / 0), r = void 0 === r ? 1 : Math.abs(r), t > e && (r = -r), this._start = t, this._end = e, this._step = r, this.size = Math.max(0, Math.ceil((e - t) / r - 1) + 1), 0 === this.size)) {
      if (nn) return nn;nn = this;
    }
  }function Qe(t, e) {
    if (!(this instanceof Qe)) return new Qe(t, e);if ((this._value = t, this.size = void 0 === e ? 1 / 0 : Math.max(0, e), 0 === this.size)) {
      if (on) return on;on = this;
    }
  }function Xe(t, e) {
    var r = function r(_r2) {
      t.prototype[_r2] = e[_r2];
    };return (Object.keys(e).forEach(r), Object.getOwnPropertySymbols && Object.getOwnPropertySymbols(e).forEach(r), t);
  }function Fe(t, e) {
    return e;
  }function Ge(t, e) {
    return [e, t];
  }function Ze(t) {
    return function () {
      return !t.apply(this, arguments);
    };
  }function $e(t) {
    return function () {
      return -t.apply(this, arguments);
    };
  }function tr(t) {
    return "string" == typeof t ? JSON.stringify(t) : t;
  }function er() {
    return i(arguments);
  }function rr(t, e) {
    return e > t ? 1 : t > e ? -1 : 0;
  }function nr(t) {
    if (t.size === 1 / 0) return 0;var e = w(t),
        r = d(t),
        n = e ? 1 : 0,
        i = t.__iterate(r ? e ? function (t, e) {
      n = 31 * n + or(et(t), et(e)) | 0;
    } : function (t, e) {
      n = n + or(et(t), et(e)) | 0;
    } : e ? function (t) {
      n = 31 * n + et(t) | 0;
    } : function (t) {
      n = n + et(t) | 0;
    });return ir(i, n);
  }function ir(t, e) {
    return (e = Mr(e, 3432918353), e = Mr(e << 15 | e >>> -15, 461845907), e = Mr(e << 13 | e >>> -13, 5), e = (e + 3864292196 | 0) ^ t, e = Mr(e ^ e >>> 16, 2246822507), e = Mr(e ^ e >>> 13, 3266489909), e = tt(e ^ e >>> 16));
  }function or(t, e) {
    return t ^ e + 2654435769 + (t << 6) + (t >> 2) | 0;
  }var ur = Array.prototype.slice,
      sr = "delete",
      ar = 5,
      hr = 1 << ar,
      fr = hr - 1,
      cr = {},
      _r = { value: !1 },
      pr = { value: !1 };t(p, _), t(v, _), t(l, _), _.isIterable = y, _.isKeyed = d, _.isIndexed = m, _.isAssociative = g, _.isOrdered = w, _.Keyed = p, _.Indexed = v, _.Set = l;var vr = "@@__IMMUTABLE_ITERABLE__@@",
      lr = "@@__IMMUTABLE_KEYED__@@",
      yr = "@@__IMMUTABLE_INDEXED__@@",
      dr = "@@__IMMUTABLE_ORDERED__@@",
      mr = 0,
      gr = 1,
      wr = 2,
      Sr = "function" == typeof Symbol && Symbol.iterator,
      zr = "@@iterator",
      Ir = Sr || zr;S.prototype.toString = function () {
    return "[Iterator]";
  }, S.KEYS = mr, S.VALUES = gr, S.ENTRIES = wr, S.prototype.inspect = S.prototype.toSource = function () {
    return "" + this;
  }, S.prototype[Ir] = function () {
    return this;
  }, t(O, _), O.of = function () {
    return O(arguments);
  }, O.prototype.toSeq = function () {
    return this;
  }, O.prototype.toString = function () {
    return this.__toString("Seq {", "}");
  }, O.prototype.cacheResult = function () {
    return (!this._cache && this.__iterateUncached && (this._cache = this.entrySeq().toArray(), this.size = this._cache.length), this);
  }, O.prototype.__iterate = function (t, e) {
    return N(this, t, e, !0);
  }, O.prototype.__iterator = function (t, e) {
    return P(this, t, e, !0);
  }, t(x, O), x.prototype.toKeyedSeq = function () {
    return this;
  }, t(k, O), k.of = function () {
    return k(arguments);
  }, k.prototype.toIndexedSeq = function () {
    return this;
  }, k.prototype.toString = function () {
    return this.__toString("Seq [", "]");
  }, k.prototype.__iterate = function (t, e) {
    return N(this, t, e, !1);
  }, k.prototype.__iterator = function (t, e) {
    return P(this, t, e, !1);
  }, t(A, O), A.of = function () {
    return A(arguments);
  }, A.prototype.toSetSeq = function () {
    return this;
  }, O.isSeq = L, O.Keyed = x, O.Set = A, O.Indexed = k;var br = "@@__IMMUTABLE_SEQ__@@";O.prototype[br] = !0, t(j, k), j.prototype.get = function (t, e) {
    return this.has(t) ? this._array[u(this, t)] : e;
  }, j.prototype.__iterate = function (t, e) {
    for (var r = this._array, n = r.length - 1, i = 0; n >= i; i++) if (t(r[e ? n - i : i], i, this) === !1) return i + 1;return i;
  }, j.prototype.__iterator = function (t, e) {
    var r = this._array,
        n = r.length - 1,
        i = 0;return new S(function () {
      return i > n ? I() : z(t, i, r[e ? n - i++ : i++]);
    });
  }, t(R, x), R.prototype.get = function (t, e) {
    return void 0 === e || this.has(t) ? this._object[t] : e;
  }, R.prototype.has = function (t) {
    return this._object.hasOwnProperty(t);
  }, R.prototype.__iterate = function (t, e) {
    for (var r = this._object, n = this._keys, i = n.length - 1, o = 0; i >= o; o++) {
      var u = n[e ? i - o : o];if (t(r[u], u, this) === !1) return o + 1;
    }return o;
  }, R.prototype.__iterator = function (t, e) {
    var r = this._object,
        n = this._keys,
        i = n.length - 1,
        o = 0;return new S(function () {
      var u = n[e ? i - o : o];return o++ > i ? I() : z(t, u, r[u]);
    });
  }, R.prototype[dr] = !0, t(U, k), U.prototype.__iterateUncached = function (t, e) {
    if (e) return this.cacheResult().__iterate(t, e);var r = this._iterable,
        n = D(r),
        i = 0;if (q(n)) for (var o; !(o = n.next()).done && t(o.value, i++, this) !== !1;);
    return i;
  }, U.prototype.__iteratorUncached = function (t, e) {
    if (e) return this.cacheResult().__iterator(t, e);var r = this._iterable,
        n = D(r);if (!q(n)) return new S(I);var i = 0;return new S(function () {
      var e = n.next();return e.done ? e : z(t, i++, e.value);
    });
  }, t(K, k), K.prototype.__iterateUncached = function (t, e) {
    if (e) return this.cacheResult().__iterate(t, e);for (var r = this._iterator, n = this._iteratorCache, i = 0; n.length > i;) if (t(n[i], i++, this) === !1) return i;for (var o; !(o = r.next()).done;) {
      var u = o.value;if ((n[i] = u, t(u, i++, this) === !1)) break;
    }return i;
  }, K.prototype.__iteratorUncached = function (t, e) {
    if (e) return this.cacheResult().__iterator(t, e);var r = this._iterator,
        n = this._iteratorCache,
        i = 0;return new S(function () {
      if (i >= n.length) {
        var e = r.next();if (e.done) return e;n[i] = e.value;
      }return z(t, i, n[i++]);
    });
  };var qr;t(H, _), t(V, H), t(Y, H), t(Q, H), H.Keyed = V, H.Indexed = Y, H.Set = Q;var Dr,
      Mr = "function" == typeof Math.imul && -2 === Math.imul(4294967295, 2) ? Math.imul : function (t, e) {
    t = 0 | t, e = 0 | e;var r = 65535 & t,
        n = 65535 & e;return r * n + ((t >>> 16) * n + r * (e >>> 16) << 16 >>> 0) | 0;
  },
      Er = Object.isExtensible,
      Or = (function () {
    try {
      return (Object.defineProperty({}, "@", {}), !0);
    } catch (t) {
      return !1;
    }
  })(),
      xr = "function" == typeof WeakMap;xr && (Dr = new WeakMap());var kr = 0,
      Ar = "__immutablehash__";"function" == typeof Symbol && (Ar = Symbol(Ar));var jr = 16,
      Rr = 255,
      Ur = 0,
      Kr = {};t(at, x), at.prototype.get = function (t, e) {
    return this._iter.get(t, e);
  }, at.prototype.has = function (t) {
    return this._iter.has(t);
  }, at.prototype.valueSeq = function () {
    return this._iter.valueSeq();
  }, at.prototype.reverse = function () {
    var t = this,
        e = vt(this, !0);return (this._useKeys || (e.valueSeq = function () {
      return t._iter.toSeq().reverse();
    }), e);
  }, at.prototype.map = function (t, e) {
    var r = this,
        n = pt(this, t, e);return (this._useKeys || (n.valueSeq = function () {
      return r._iter.toSeq().map(t, e);
    }), n);
  }, at.prototype.__iterate = function (t, e) {
    var r,
        n = this;return this._iter.__iterate(this._useKeys ? function (e, r) {
      return t(e, r, n);
    } : (r = e ? kt(this) : 0, function (i) {
      return t(i, e ? --r : r++, n);
    }), e);
  }, at.prototype.__iterator = function (t, e) {
    if (this._useKeys) return this._iter.__iterator(t, e);var r = this._iter.__iterator(gr, e),
        n = e ? kt(this) : 0;
    return new S(function () {
      var i = r.next();return i.done ? i : z(t, e ? --n : n++, i.value, i);
    });
  }, at.prototype[dr] = !0, t(ht, k), ht.prototype.includes = function (t) {
    return this._iter.includes(t);
  }, ht.prototype.__iterate = function (t, e) {
    var r = this,
        n = 0;return this._iter.__iterate(function (e) {
      return t(e, n++, r);
    }, e);
  }, ht.prototype.__iterator = function (t, e) {
    var r = this._iter.__iterator(gr, e),
        n = 0;return new S(function () {
      var e = r.next();return e.done ? e : z(t, n++, e.value, e);
    });
  }, t(ft, A), ft.prototype.has = function (t) {
    return this._iter.includes(t);
  }, ft.prototype.__iterate = function (t, e) {
    var r = this;return this._iter.__iterate(function (e) {
      return t(e, e, r);
    }, e);
  }, ft.prototype.__iterator = function (t, e) {
    var r = this._iter.__iterator(gr, e);return new S(function () {
      var e = r.next();return e.done ? e : z(t, e.value, e.value, e);
    });
  }, t(ct, x), ct.prototype.entrySeq = function () {
    return this._iter.toSeq();
  }, ct.prototype.__iterate = function (t, e) {
    var r = this;return this._iter.__iterate(function (e) {
      if (e) {
        xt(e);var n = y(e);return t(n ? e.get(1) : e[1], n ? e.get(0) : e[0], r);
      }
    }, e);
  }, ct.prototype.__iterator = function (t, e) {
    var r = this._iter.__iterator(gr, e);return new S(function () {
      for (;;) {
        var e = r.next();if (e.done) return e;var n = e.value;if (n) {
          xt(n);var i = y(n);return z(t, i ? n.get(0) : n[0], i ? n.get(1) : n[1], e);
        }
      }
    });
  }, ht.prototype.cacheResult = at.prototype.cacheResult = ft.prototype.cacheResult = ct.prototype.cacheResult = Rt, t(Lt, V), Lt.prototype.toString = function () {
    return this.__toString("Map {", "}");
  }, Lt.prototype.get = function (t, e) {
    return this._root ? this._root.get(0, void 0, t, e) : e;
  }, Lt.prototype.set = function (t, e) {
    return Xt(this, t, e);
  }, Lt.prototype.setIn = function (t, e) {
    return this.updateIn(t, cr, function () {
      return e;
    });
  }, Lt.prototype.remove = function (t) {
    return Xt(this, t, cr);
  }, Lt.prototype.deleteIn = function (t) {
    return this.updateIn(t, function () {
      return cr;
    });
  }, Lt.prototype.update = function (t, e, r) {
    return 1 === arguments.length ? t(this) : this.updateIn([t], e, r);
  }, Lt.prototype.updateIn = function (t, e, r) {
    r || (r = e, e = void 0);var n = oe(this, Kt(t), e, r);return n === cr ? void 0 : n;
  }, Lt.prototype.clear = function () {
    return 0 === this.size ? this : this.__ownerID ? (this.size = 0, this._root = null, this.__hash = void 0, this.__altered = !0, this) : Qt();
  }, Lt.prototype.merge = function () {
    return re(this, void 0, arguments);
  }, Lt.prototype.mergeWith = function (t) {
    var e = ur.call(arguments, 1);return re(this, t, e);
  }, Lt.prototype.mergeIn = function (t) {
    var e = ur.call(arguments, 1);return this.updateIn(t, Qt(), function (t) {
      return "function" == typeof t.merge ? t.merge.apply(t, e) : e[e.length - 1];
    });
  }, Lt.prototype.mergeDeep = function () {
    return re(this, ne(void 0), arguments);
  }, Lt.prototype.mergeDeepWith = function (t) {
    var e = ur.call(arguments, 1);return re(this, ne(t), e);
  }, Lt.prototype.mergeDeepIn = function (t) {
    var e = ur.call(arguments, 1);return this.updateIn(t, Qt(), function (t) {
      return "function" == typeof t.mergeDeep ? t.mergeDeep.apply(t, e) : e[e.length - 1];
    });
  }, Lt.prototype.sort = function (t) {
    return Ie(qt(this, t));
  }, Lt.prototype.sortBy = function (t, e) {
    return Ie(qt(this, e, t));
  }, Lt.prototype.withMutations = function (t) {
    var e = this.asMutable();return (t(e), e.wasAltered() ? e.__ensureOwner(this.__ownerID) : this);
  }, Lt.prototype.asMutable = function () {
    return this.__ownerID ? this : this.__ensureOwner(new n());
  }, Lt.prototype.asImmutable = function () {
    return this.__ensureOwner();
  }, Lt.prototype.wasAltered = function () {
    return this.__altered;
  }, Lt.prototype.__iterator = function (t, e) {
    return new Pt(this, t, e);
  }, Lt.prototype.__iterate = function (t, e) {
    var r = this,
        n = 0;return (this._root && this._root.iterate(function (e) {
      return (n++, t(e[1], e[0], r));
    }, e), n);
  }, Lt.prototype.__ensureOwner = function (t) {
    return t === this.__ownerID ? this : t ? Yt(this.size, this._root, t, this.__hash) : (this.__ownerID = t, this.__altered = !1, this);
  }, Lt.isMap = Tt;var Lr = "@@__IMMUTABLE_MAP__@@",
      Tr = Lt.prototype;Tr[Lr] = !0, Tr[sr] = Tr.remove, Tr.removeIn = Tr.deleteIn, Wt.prototype.get = function (t, e, r, n) {
    for (var i = this.entries, o = 0, u = i.length; u > o; o++) if (X(r, i[o][0])) return i[o][1];return n;
  }, Wt.prototype.update = function (t, e, n, o, u, s, a) {
    for (var h = u === cr, f = this.entries, c = 0, _ = f.length; _ > c && !X(o, f[c][0]); c++);var p = _ > c;if (p ? f[c][1] === u : h) return this;if ((r(a), (h || !p) && r(s), !h || 1 !== f.length)) {
      if (!p && !h && f.length >= Br) return $t(t, f, o, u);var v = t && t === this.ownerID,
          l = v ? f : i(f);return (p ? h ? c === _ - 1 ? l.pop() : l[c] = l.pop() : l[c] = [o, u] : l.push([o, u]), v ? (this.entries = l, this) : new Wt(t, l));
    }
  }, Bt.prototype.get = function (t, e, r, n) {
    void 0 === e && (e = et(r));var i = 1 << ((0 === t ? e : e >>> t) & fr),
        o = this.bitmap;return 0 === (o & i) ? n : this.nodes[ue(o & i - 1)].get(t + ar, e, r, n);
  }, Bt.prototype.update = function (t, e, r, n, i, o, u) {
    void 0 === r && (r = et(n));var s = (0 === e ? r : r >>> e) & fr,
        a = 1 << s,
        h = this.bitmap,
        f = 0 !== (h & a);if (!f && i === cr) return this;var c = ue(h & a - 1),
        _ = this.nodes,
        p = f ? _[c] : void 0,
        v = Ft(p, t, e + ar, r, n, i, o, u);if (v === p) return this;if (!f && v && _.length >= Cr) return ee(t, _, h, s, v);if (f && !v && 2 === _.length && Gt(_[1 ^ c])) return _[1 ^ c];if (f && v && 1 === _.length && Gt(v)) return v;var l = t && t === this.ownerID,
        y = f ? v ? h : h ^ a : h | a,
        d = f ? v ? se(_, c, v, l) : he(_, c, l) : ae(_, c, v, l);return l ? (this.bitmap = y, this.nodes = d, this) : new Bt(t, y, d);
  }, Ct.prototype.get = function (t, e, r, n) {
    void 0 === e && (e = et(r));var i = (0 === t ? e : e >>> t) & fr,
        o = this.nodes[i];return o ? o.get(t + ar, e, r, n) : n;
  }, Ct.prototype.update = function (t, e, r, n, i, o, u) {
    void 0 === r && (r = et(n));var s = (0 === e ? r : r >>> e) & fr,
        a = i === cr,
        h = this.nodes,
        f = h[s];if (a && !f) return this;var c = Ft(f, t, e + ar, r, n, i, o, u);if (c === f) return this;var _ = this.count;if (f) {
      if (!c && (_--, Jr > _)) return te(t, h, _, s);
    } else _++;var p = t && t === this.ownerID,
        v = se(h, s, c, p);return p ? (this.count = _, this.nodes = v, this) : new Ct(t, _, v);
  }, Jt.prototype.get = function (t, e, r, n) {
    for (var i = this.entries, o = 0, u = i.length; u > o; o++) if (X(r, i[o][0])) return i[o][1];return n;
  }, Jt.prototype.update = function (t, e, n, o, u, s, a) {
    void 0 === n && (n = et(o));var h = u === cr;if (n !== this.keyHash) return h ? this : (r(a), r(s), Zt(this, t, e, n, [o, u]));for (var f = this.entries, c = 0, _ = f.length; _ > c && !X(o, f[c][0]); c++);var p = _ > c;if (p ? f[c][1] === u : h) return this;if ((r(a), (h || !p) && r(s), h && 2 === _)) return new Nt(t, this.keyHash, f[1 ^ c]);var v = t && t === this.ownerID,
        l = v ? f : i(f);return (p ? h ? c === _ - 1 ? l.pop() : l[c] = l.pop() : l[c] = [o, u] : l.push([o, u]), v ? (this.entries = l, this) : new Jt(t, this.keyHash, l));
  }, Nt.prototype.get = function (t, e, r, n) {
    return X(r, this.entry[0]) ? this.entry[1] : n;
  }, Nt.prototype.update = function (t, e, n, i, o, u, s) {
    var a = o === cr,
        h = X(i, this.entry[0]);return (h ? o === this.entry[1] : a) ? this : (r(s), a ? void r(u) : h ? t && t === this.ownerID ? (this.entry[1] = o, this) : new Nt(t, this.keyHash, [i, o]) : (r(u), Zt(this, t, e, et(i), [i, o])));
  }, Wt.prototype.iterate = Jt.prototype.iterate = function (t, e) {
    for (var r = this.entries, n = 0, i = r.length - 1; i >= n; n++) if (t(r[e ? i - n : n]) === !1) return !1;
  }, Bt.prototype.iterate = Ct.prototype.iterate = function (t, e) {
    for (var r = this.nodes, n = 0, i = r.length - 1; i >= n; n++) {
      var o = r[e ? i - n : n];if (o && o.iterate(t, e) === !1) return !1;
    }
  }, Nt.prototype.iterate = function (t) {
    return t(this.entry);
  }, t(Pt, S), Pt.prototype.next = function () {
    for (var t = this._type, e = this._stack; e;) {
      var r,
          n = e.node,
          i = e.index++;if (n.entry) {
        if (0 === i) return Ht(t, n.entry);
      } else if (n.entries) {
        if ((r = n.entries.length - 1, r >= i)) return Ht(t, n.entries[this._reverse ? r - i : i]);
      } else if ((r = n.nodes.length - 1, r >= i)) {
        var o = n.nodes[this._reverse ? r - i : i];if (o) {
          if (o.entry) return Ht(t, o.entry);e = this._stack = Vt(o, e);
        }continue;
      }e = this._stack = this._stack.__prev;
    }return I();
  };var Wr,
      Br = hr / 4,
      Cr = hr / 2,
      Jr = hr / 4;t(fe, Y), fe.of = function () {
    return this(arguments);
  }, fe.prototype.toString = function () {
    return this.__toString("List [", "]");
  }, fe.prototype.get = function (t, e) {
    if ((t = u(this, t), t >= 0 && this.size > t)) {
      t += this._origin;var r = ge(this, t);return r && r.array[t & fr];
    }return e;
  }, fe.prototype.set = function (t, e) {
    return ye(this, t, e);
  }, fe.prototype.remove = function (t) {
    return this.has(t) ? 0 === t ? this.shift() : t === this.size - 1 ? this.pop() : this.splice(t, 1) : this;
  }, fe.prototype.clear = function () {
    return 0 === this.size ? this : this.__ownerID ? (this.size = this._origin = this._capacity = 0, this._level = ar, this._root = this._tail = null, this.__hash = void 0, this.__altered = !0, this) : le();
  }, fe.prototype.push = function () {
    var t = arguments,
        e = this.size;return this.withMutations(function (r) {
      we(r, 0, e + t.length);for (var n = 0; t.length > n; n++) r.set(e + n, t[n]);
    });
  }, fe.prototype.pop = function () {
    return we(this, 0, -1);
  }, fe.prototype.unshift = function () {
    var t = arguments;return this.withMutations(function (e) {
      we(e, -t.length);for (var r = 0; t.length > r; r++) e.set(r, t[r]);
    });
  }, fe.prototype.shift = function () {
    return we(this, 1);
  }, fe.prototype.merge = function () {
    return Se(this, void 0, arguments);
  }, fe.prototype.mergeWith = function (t) {
    var e = ur.call(arguments, 1);return Se(this, t, e);
  }, fe.prototype.mergeDeep = function () {
    return Se(this, ne(void 0), arguments);
  }, fe.prototype.mergeDeepWith = function (t) {
    var e = ur.call(arguments, 1);return Se(this, ne(t), e);
  }, fe.prototype.setSize = function (t) {
    return we(this, 0, t);
  }, fe.prototype.slice = function (t, e) {
    var r = this.size;return a(t, e, r) ? this : we(this, h(t, r), f(e, r));
  }, fe.prototype.__iterator = function (t, e) {
    var r = 0,
        n = pe(this, e);return new S(function () {
      var e = n();return e === Vr ? I() : z(t, r++, e);
    });
  }, fe.prototype.__iterate = function (t, e) {
    for (var r, n = 0, i = pe(this, e); (r = i()) !== Vr && t(r, n++, this) !== !1;);return n;
  }, fe.prototype.__ensureOwner = function (t) {
    return t === this.__ownerID ? this : t ? ve(this._origin, this._capacity, this._level, this._root, this._tail, t, this.__hash) : (this.__ownerID = t, this);
  }, fe.isList = ce;var Nr = "@@__IMMUTABLE_LIST__@@",
      Pr = fe.prototype;Pr[Nr] = !0, Pr[sr] = Pr.remove, Pr.setIn = Tr.setIn, Pr.deleteIn = Pr.removeIn = Tr.removeIn, Pr.update = Tr.update, Pr.updateIn = Tr.updateIn, Pr.mergeIn = Tr.mergeIn, Pr.mergeDeepIn = Tr.mergeDeepIn, Pr.withMutations = Tr.withMutations, Pr.asMutable = Tr.asMutable, Pr.asImmutable = Tr.asImmutable, Pr.wasAltered = Tr.wasAltered, _e.prototype.removeBefore = function (t, e, r) {
    if (r === e ? 1 << e : 0 === this.array.length) return this;var n = r >>> e & fr;if (n >= this.array.length) return new _e([], t);var i,
        o = 0 === n;if (e > 0) {
      var u = this.array[n];if ((i = u && u.removeBefore(t, e - ar, r), i === u && o)) return this;
    }if (o && !i) return this;var s = me(this, t);if (!o) for (var a = 0; n > a; a++) s.array[a] = void 0;return (i && (s.array[n] = i), s);
  }, _e.prototype.removeAfter = function (t, e, r) {
    if (r === (e ? 1 << e : 0) || 0 === this.array.length) return this;var n = r - 1 >>> e & fr;if (n >= this.array.length) return this;var i;if (e > 0) {
      var o = this.array[n];if ((i = o && o.removeAfter(t, e - ar, r), i === o && n === this.array.length - 1)) return this;
    }var u = me(this, t);return (u.array.splice(n + 1), i && (u.array[n] = i), u);
  };var Hr,
      Vr = {};t(Ie, Lt), Ie.of = function () {
    return this(arguments);
  }, Ie.prototype.toString = function () {
    return this.__toString("OrderedMap {", "}");
  }, Ie.prototype.get = function (t, e) {
    var r = this._map.get(t);return void 0 !== r ? this._list.get(r)[1] : e;
  }, Ie.prototype.clear = function () {
    return 0 === this.size ? this : this.__ownerID ? (this.size = 0, this._map.clear(), this._list.clear(), this) : De();
  }, Ie.prototype.set = function (t, e) {
    return Me(this, t, e);
  }, Ie.prototype.remove = function (t) {
    return Me(this, t, cr);
  }, Ie.prototype.wasAltered = function () {
    return this._map.wasAltered() || this._list.wasAltered();
  }, Ie.prototype.__iterate = function (t, e) {
    var r = this;return this._list.__iterate(function (e) {
      return e && t(e[1], e[0], r);
    }, e);
  }, Ie.prototype.__iterator = function (t, e) {
    return this._list.fromEntrySeq().__iterator(t, e);
  }, Ie.prototype.__ensureOwner = function (t) {
    if (t === this.__ownerID) return this;var e = this._map.__ensureOwner(t),
        r = this._list.__ensureOwner(t);return t ? qe(e, r, t, this.__hash) : (this.__ownerID = t, this._map = e, this._list = r, this);
  }, Ie.isOrderedMap = be, Ie.prototype[dr] = !0, Ie.prototype[sr] = Ie.prototype.remove;var Yr;t(Ee, Y), Ee.of = function () {
    return this(arguments);
  }, Ee.prototype.toString = function () {
    return this.__toString("Stack [", "]");
  }, Ee.prototype.get = function (t, e) {
    var r = this._head;for (t = u(this, t); r && t--;) r = r.next;return r ? r.value : e;
  }, Ee.prototype.peek = function () {
    return this._head && this._head.value;
  }, Ee.prototype.push = function () {
    if (0 === arguments.length) return this;for (var t = this.size + arguments.length, e = this._head, r = arguments.length - 1; r >= 0; r--) e = { value: arguments[r], next: e };return this.__ownerID ? (this.size = t, this._head = e, this.__hash = void 0, this.__altered = !0, this) : xe(t, e);
  }, Ee.prototype.pushAll = function (t) {
    if ((t = v(t), 0 === t.size)) return this;st(t.size);var e = this.size,
        r = this._head;return (t.reverse().forEach(function (t) {
      e++, r = { value: t, next: r };
    }), this.__ownerID ? (this.size = e, this._head = r, this.__hash = void 0, this.__altered = !0, this) : xe(e, r));
  }, Ee.prototype.pop = function () {
    return this.slice(1);
  }, Ee.prototype.unshift = function () {
    return this.push.apply(this, arguments);
  }, Ee.prototype.unshiftAll = function (t) {
    return this.pushAll(t);
  }, Ee.prototype.shift = function () {
    return this.pop.apply(this, arguments);
  }, Ee.prototype.clear = function () {
    return 0 === this.size ? this : this.__ownerID ? (this.size = 0, this._head = void 0, this.__hash = void 0, this.__altered = !0, this) : ke();
  }, Ee.prototype.slice = function (t, e) {
    if (a(t, e, this.size)) return this;var r = h(t, this.size),
        n = f(e, this.size);if (n !== this.size) return Y.prototype.slice.call(this, t, e);
    for (var i = this.size - r, o = this._head; r--;) o = o.next;return this.__ownerID ? (this.size = i, this._head = o, this.__hash = void 0, this.__altered = !0, this) : xe(i, o);
  }, Ee.prototype.__ensureOwner = function (t) {
    return t === this.__ownerID ? this : t ? xe(this.size, this._head, t, this.__hash) : (this.__ownerID = t, this.__altered = !1, this);
  }, Ee.prototype.__iterate = function (t, e) {
    if (e) return this.reverse().__iterate(t);for (var r = 0, n = this._head; n && t(n.value, r++, this) !== !1;) n = n.next;return r;
  }, Ee.prototype.__iterator = function (t, e) {
    if (e) return this.reverse().__iterator(t);var r = 0,
        n = this._head;return new S(function () {
      if (n) {
        var e = n.value;return (n = n.next, z(t, r++, e));
      }return I();
    });
  }, Ee.isStack = Oe;var Qr = "@@__IMMUTABLE_STACK__@@",
      Xr = Ee.prototype;Xr[Qr] = !0, Xr.withMutations = Tr.withMutations, Xr.asMutable = Tr.asMutable, Xr.asImmutable = Tr.asImmutable, Xr.wasAltered = Tr.wasAltered;var Fr;t(Ae, Q), Ae.of = function () {
    return this(arguments);
  }, Ae.fromKeys = function (t) {
    return this(p(t).keySeq());
  }, Ae.prototype.toString = function () {
    return this.__toString("Set {", "}");
  }, Ae.prototype.has = function (t) {
    return this._map.has(t);
  }, Ae.prototype.add = function (t) {
    return Re(this, this._map.set(t, !0));
  }, Ae.prototype.remove = function (t) {
    return Re(this, this._map.remove(t));
  }, Ae.prototype.clear = function () {
    return Re(this, this._map.clear());
  }, Ae.prototype.union = function () {
    var t = ur.call(arguments, 0);return (t = t.filter(function (t) {
      return 0 !== t.size;
    }), 0 === t.length ? this : 0 !== this.size || this.__ownerID || 1 !== t.length ? this.withMutations(function (e) {
      for (var r = 0; t.length > r; r++) l(t[r]).forEach(function (t) {
        return e.add(t);
      });
    }) : this.constructor(t[0]));
  }, Ae.prototype.intersect = function () {
    var t = ur.call(arguments, 0);if (0 === t.length) return this;t = t.map(function (t) {
      return l(t);
    });var e = this;return this.withMutations(function (r) {
      e.forEach(function (e) {
        t.every(function (t) {
          return t.includes(e);
        }) || r.remove(e);
      });
    });
  }, Ae.prototype.subtract = function () {
    var t = ur.call(arguments, 0);if (0 === t.length) return this;t = t.map(function (t) {
      return l(t);
    });var e = this;return this.withMutations(function (r) {
      e.forEach(function (e) {
        t.some(function (t) {
          return t.includes(e);
        }) && r.remove(e);
      });
    });
  }, Ae.prototype.merge = function () {
    return this.union.apply(this, arguments);
  }, Ae.prototype.mergeWith = function () {
    var t = ur.call(arguments, 1);return this.union.apply(this, t);
  }, Ae.prototype.sort = function (t) {
    return Le(qt(this, t));
  }, Ae.prototype.sortBy = function (t, e) {
    return Le(qt(this, e, t));
  }, Ae.prototype.wasAltered = function () {
    return this._map.wasAltered();
  }, Ae.prototype.__iterate = function (t, e) {
    var r = this;return this._map.__iterate(function (e, n) {
      return t(n, n, r);
    }, e);
  }, Ae.prototype.__iterator = function (t, e) {
    return this._map.map(function (t, e) {
      return e;
    }).__iterator(t, e);
  }, Ae.prototype.__ensureOwner = function (t) {
    if (t === this.__ownerID) return this;var e = this._map.__ensureOwner(t);return t ? this.__make(e, t) : (this.__ownerID = t, this._map = e, this);
  }, Ae.isSet = je;var Gr = "@@__IMMUTABLE_SET__@@",
      Zr = Ae.prototype;Zr[Gr] = !0, Zr[sr] = Zr.remove, Zr.mergeDeep = Zr.merge, Zr.mergeDeepWith = Zr.mergeWith, Zr.withMutations = Tr.withMutations, Zr.asMutable = Tr.asMutable, Zr.asImmutable = Tr.asImmutable, Zr.__empty = Ke, Zr.__make = Ue;var $r;t(Le, Ae), Le.of = function () {
    return this(arguments);
  }, Le.fromKeys = function (t) {
    return this(p(t).keySeq());
  }, Le.prototype.toString = function () {
    return this.__toString("OrderedSet {", "}");
  }, Le.isOrderedSet = Te;var tn = Le.prototype;tn[dr] = !0, tn.__empty = Be, tn.__make = We;var en;t(Ce, V), Ce.prototype.toString = function () {
    return this.__toString(Ne(this) + " {", "}");
  }, Ce.prototype.has = function (t) {
    return this._defaultValues.hasOwnProperty(t);
  }, Ce.prototype.get = function (t, e) {
    if (!this.has(t)) return e;var r = this._defaultValues[t];return this._map ? this._map.get(t, r) : r;
  }, Ce.prototype.clear = function () {
    if (this.__ownerID) return (this._map && this._map.clear(), this);var t = this.constructor;return t._empty || (t._empty = Je(this, Qt()));
  }, Ce.prototype.set = function (t, e) {
    if (!this.has(t)) throw Error('Cannot set unknown key "' + t + '" on ' + Ne(this));var r = this._map && this._map.set(t, e);return this.__ownerID || r === this._map ? this : Je(this, r);
  }, Ce.prototype.remove = function (t) {
    if (!this.has(t)) return this;var e = this._map && this._map.remove(t);return this.__ownerID || e === this._map ? this : Je(this, e);
  }, Ce.prototype.wasAltered = function () {
    return this._map.wasAltered();
  }, Ce.prototype.__iterator = function (t, e) {
    var r = this;return p(this._defaultValues).map(function (t, e) {
      return r.get(e);
    }).__iterator(t, e);
  }, Ce.prototype.__iterate = function (t, e) {
    var r = this;return p(this._defaultValues).map(function (t, e) {
      return r.get(e);
    }).__iterate(t, e);
  }, Ce.prototype.__ensureOwner = function (t) {
    if (t === this.__ownerID) return this;var e = this._map && this._map.__ensureOwner(t);return t ? Je(this, e, t) : (this.__ownerID = t, this._map = e, this);
  };var rn = Ce.prototype;rn[sr] = rn.remove, rn.deleteIn = rn.removeIn = Tr.removeIn, rn.merge = Tr.merge, rn.mergeWith = Tr.mergeWith, rn.mergeIn = Tr.mergeIn, rn.mergeDeep = Tr.mergeDeep, rn.mergeDeepWith = Tr.mergeDeepWith, rn.mergeDeepIn = Tr.mergeDeepIn, rn.setIn = Tr.setIn, rn.update = Tr.update, rn.updateIn = Tr.updateIn, rn.withMutations = Tr.withMutations, rn.asMutable = Tr.asMutable, rn.asImmutable = Tr.asImmutable, t(Ye, k), Ye.prototype.toString = function () {
    return 0 === this.size ? "Range []" : "Range [ " + this._start + "..." + this._end + (this._step > 1 ? " by " + this._step : "") + " ]";
  }, Ye.prototype.get = function (t, e) {
    return this.has(t) ? this._start + u(this, t) * this._step : e;
  }, Ye.prototype.includes = function (t) {
    var e = (t - this._start) / this._step;return e >= 0 && this.size > e && e === Math.floor(e);
  }, Ye.prototype.slice = function (t, e) {
    return a(t, e, this.size) ? this : (t = h(t, this.size), e = f(e, this.size), t >= e ? new Ye(0, 0) : new Ye(this.get(t, this._end), this.get(e, this._end), this._step));
  }, Ye.prototype.indexOf = function (t) {
    var e = t - this._start;if (e % this._step === 0) {
      var r = e / this._step;if (r >= 0 && this.size > r) return r;
    }return -1;
  }, Ye.prototype.lastIndexOf = function (t) {
    return this.indexOf(t);
  }, Ye.prototype.__iterate = function (t, e) {
    for (var r = this.size - 1, n = this._step, i = e ? this._start + r * n : this._start, o = 0; r >= o; o++) {
      if (t(i, o, this) === !1) return o + 1;i += e ? -n : n;
    }return o;
  }, Ye.prototype.__iterator = function (t, e) {
    var r = this.size - 1,
        n = this._step,
        i = e ? this._start + r * n : this._start,
        o = 0;return new S(function () {
      var u = i;return (i += e ? -n : n, o > r ? I() : z(t, o++, u));
    });
  }, Ye.prototype.equals = function (t) {
    return t instanceof Ye ? this._start === t._start && this._end === t._end && this._step === t._step : Ve(this, t);
  };var nn;t(Qe, k), Qe.prototype.toString = function () {
    return 0 === this.size ? "Repeat []" : "Repeat [ " + this._value + " " + this.size + " times ]";
  }, Qe.prototype.get = function (t, e) {
    return this.has(t) ? this._value : e;
  }, Qe.prototype.includes = function (t) {
    return X(this._value, t);
  }, Qe.prototype.slice = function (t, e) {
    var r = this.size;return a(t, e, r) ? this : new Qe(this._value, f(e, r) - h(t, r));
  }, Qe.prototype.reverse = function () {
    return this;
  }, Qe.prototype.indexOf = function (t) {
    return X(this._value, t) ? 0 : -1;
  }, Qe.prototype.lastIndexOf = function (t) {
    return X(this._value, t) ? this.size : -1;
  }, Qe.prototype.__iterate = function (t) {
    for (var e = 0; this.size > e; e++) if (t(this._value, e, this) === !1) return e + 1;return e;
  }, Qe.prototype.__iterator = function (t) {
    var e = this,
        r = 0;return new S(function () {
      return e.size > r ? z(t, r++, e._value) : I();
    });
  }, Qe.prototype.equals = function (t) {
    return t instanceof Qe ? X(this._value, t._value) : Ve(t);
  };var on;_.Iterator = S, Xe(_, { toArray: function toArray() {
      st(this.size);var t = Array(this.size || 0);return (this.valueSeq().__iterate(function (e, r) {
        t[r] = e;
      }), t);
    }, toIndexedSeq: function toIndexedSeq() {
      return new ht(this);
    }, toJS: function toJS() {
      return this.toSeq().map(function (t) {
        return t && "function" == typeof t.toJS ? t.toJS() : t;
      }).__toJS();
    }, toJSON: function toJSON() {
      return this.toSeq().map(function (t) {
        return t && "function" == typeof t.toJSON ? t.toJSON() : t;
      }).__toJS();
    }, toKeyedSeq: function toKeyedSeq() {
      return new at(this, !0);
    }, toMap: function toMap() {
      return Lt(this.toKeyedSeq());
    }, toObject: function toObject() {
      st(this.size);var t = {};return (this.__iterate(function (e, r) {
        t[r] = e;
      }), t);
    }, toOrderedMap: function toOrderedMap() {
      return Ie(this.toKeyedSeq());
    }, toOrderedSet: function toOrderedSet() {
      return Le(d(this) ? this.valueSeq() : this);
    }, toSet: function toSet() {
      return Ae(d(this) ? this.valueSeq() : this);
    }, toSetSeq: function toSetSeq() {
      return new ft(this);
    }, toSeq: function toSeq() {
      return m(this) ? this.toIndexedSeq() : d(this) ? this.toKeyedSeq() : this.toSetSeq();
    }, toStack: function toStack() {
      return Ee(d(this) ? this.valueSeq() : this);
    }, toList: function toList() {
      return fe(d(this) ? this.valueSeq() : this);
    }, toString: function toString() {
      return "[Iterable]";
    }, __toString: function __toString(t, e) {
      return 0 === this.size ? t + e : t + " " + this.toSeq().map(this.__toStringMapper).join(", ") + " " + e;
    }, concat: function concat() {
      var t = ur.call(arguments, 0);return Ot(this, St(this, t));
    }, includes: function includes(t) {
      return this.some(function (e) {
        return X(e, t);
      });
    }, entries: function entries() {
      return this.__iterator(wr);
    }, every: function every(t, e) {
      st(this.size);var r = !0;return (this.__iterate(function (n, i, o) {
        return t.call(e, n, i, o) ? void 0 : (r = !1, !1);
      }), r);
    }, filter: function filter(t, e) {
      return Ot(this, lt(this, t, e, !0));
    }, find: function find(t, e, r) {
      var n = this.findEntry(t, e);return n ? n[1] : r;
    }, findEntry: function findEntry(t, e) {
      var r;return (this.__iterate(function (n, i, o) {
        return t.call(e, n, i, o) ? (r = [i, n], !1) : void 0;
      }), r);
    }, findLastEntry: function findLastEntry(t, e) {
      return this.toSeq().reverse().findEntry(t, e);
    }, forEach: function forEach(t, e) {
      return (st(this.size), this.__iterate(e ? t.bind(e) : t));
    }, join: function join(t) {
      st(this.size), t = void 0 !== t ? "" + t : ",";var e = "",
          r = !0;return (this.__iterate(function (n) {
        r ? r = !1 : e += t, e += null !== n && void 0 !== n ? "" + n : "";
      }), e);
    }, keys: function keys() {
      return this.__iterator(mr);
    }, map: function map(t, e) {
      return Ot(this, pt(this, t, e));
    }, reduce: function reduce(t, e, r) {
      st(this.size);var n, i;return (arguments.length < 2 ? i = !0 : n = e, this.__iterate(function (e, o, u) {
        i ? (i = !1, n = e) : n = t.call(r, n, e, o, u);
      }), n);
    }, reduceRight: function reduceRight() {
      var t = this.toKeyedSeq().reverse();return t.reduce.apply(t, arguments);
    }, reverse: function reverse() {
      return Ot(this, vt(this, !0));
    }, slice: function slice(t, e) {
      return Ot(this, mt(this, t, e, !0));
    }, some: function some(t, e) {
      return !this.every(Ze(t), e);
    }, sort: function sort(t) {
      return Ot(this, qt(this, t));
    }, values: function values() {
      return this.__iterator(gr);
    }, butLast: function butLast() {
      return this.slice(0, -1);
    }, isEmpty: function isEmpty() {
      return void 0 !== this.size ? 0 === this.size : !this.some(function () {
        return !0;
      });
    }, count: function count(t, e) {
      return o(t ? this.toSeq().filter(t, e) : this);
    }, countBy: function countBy(t, e) {
      return yt(this, t, e);
    }, equals: function equals(t) {
      return Ve(this, t);
    }, entrySeq: function entrySeq() {
      var t = this;if (t._cache) return new j(t._cache);var e = t.toSeq().map(Ge).toIndexedSeq();return (e.fromEntrySeq = function () {
        return t.toSeq();
      }, e);
    }, filterNot: function filterNot(t, e) {
      return this.filter(Ze(t), e);
    }, findLast: function findLast(t, e, r) {
      return this.toKeyedSeq().reverse().find(t, e, r);
    }, first: function first() {
      return this.find(s);
    }, flatMap: function flatMap(t, e) {
      return Ot(this, It(this, t, e));
    }, flatten: function flatten(t) {
      return Ot(this, zt(this, t, !0));
    }, fromEntrySeq: function fromEntrySeq() {
      return new ct(this);
    }, get: function get(t, e) {
      return this.find(function (e, r) {
        return X(r, t);
      }, void 0, e);
    }, getIn: function getIn(t, e) {
      for (var r, n = this, i = Kt(t); !(r = i.next()).done;) {
        var o = r.value;if ((n = n && n.get ? n.get(o, cr) : cr, n === cr)) return e;
      }return n;
    }, groupBy: function groupBy(t, e) {
      return dt(this, t, e);
    }, has: function has(t) {
      return this.get(t, cr) !== cr;
    }, hasIn: function hasIn(t) {
      return this.getIn(t, cr) !== cr;
    }, isSubset: function isSubset(t) {
      return (t = "function" == typeof t.includes ? t : _(t), this.every(function (e) {
        return t.includes(e);
      }));
    }, isSuperset: function isSuperset(t) {
      return (t = "function" == typeof t.isSubset ? t : _(t), t.isSubset(this));
    }, keySeq: function keySeq() {
      return this.toSeq().map(Fe).toIndexedSeq();
    }, last: function last() {
      return this.toSeq().reverse().first();
    }, max: function max(t) {
      return Dt(this, t);
    }, maxBy: function maxBy(t, e) {
      return Dt(this, e, t);
    }, min: function min(t) {
      return Dt(this, t ? $e(t) : rr);
    }, minBy: function minBy(t, e) {
      return Dt(this, e ? $e(e) : rr, t);
    }, rest: function rest() {
      return this.slice(1);
    }, skip: function skip(t) {
      return this.slice(Math.max(0, t));
    }, skipLast: function skipLast(t) {
      return Ot(this, this.toSeq().reverse().skip(t).reverse());
    }, skipWhile: function skipWhile(t, e) {
      return Ot(this, wt(this, t, e, !0));
    }, skipUntil: function skipUntil(t, e) {
      return this.skipWhile(Ze(t), e);
    }, sortBy: function sortBy(t, e) {
      return Ot(this, qt(this, e, t));
    }, take: function take(t) {
      return this.slice(0, Math.max(0, t));
    }, takeLast: function takeLast(t) {
      return Ot(this, this.toSeq().reverse().take(t).reverse());
    }, takeWhile: function takeWhile(t, e) {
      return Ot(this, gt(this, t, e));
    }, takeUntil: function takeUntil(t, e) {
      return this.takeWhile(Ze(t), e);
    }, valueSeq: function valueSeq() {
      return this.toIndexedSeq();
    }, hashCode: function hashCode() {
      return this.__hash || (this.__hash = nr(this));
    } });var un = _.prototype;un[vr] = !0, un[Ir] = un.values, un.__toJS = un.toArray, un.__toStringMapper = tr, un.inspect = un.toSource = function () {
    return "" + this;
  }, un.chain = un.flatMap, un.contains = un.includes, (function () {
    try {
      Object.defineProperty(un, "length", { get: function get() {
          if (!_.noLengthWarning) {
            var t;try {
              throw Error();
            } catch (e) {
              t = e.stack;
            }if (-1 === t.indexOf("_wrapObject")) return (console && console.warn && console.warn("iterable.length has been deprecated, use iterable.size or iterable.count(). This warning will become a silent error in a future version. " + t), this.size);
          }
        } });
    } catch (t) {}
  })(), Xe(p, { flip: function flip() {
      return Ot(this, _t(this));
    }, findKey: function findKey(t, e) {
      var r = this.findEntry(t, e);return r && r[0];
    }, findLastKey: function findLastKey(t, e) {
      return this.toSeq().reverse().findKey(t, e);
    }, keyOf: function keyOf(t) {
      return this.findKey(function (e) {
        return X(e, t);
      });
    }, lastKeyOf: function lastKeyOf(t) {
      return this.findLastKey(function (e) {
        return X(e, t);
      });
    }, mapEntries: function mapEntries(t, e) {
      var r = this,
          n = 0;return Ot(this, this.toSeq().map(function (i, o) {
        return t.call(e, [o, i], n++, r);
      }).fromEntrySeq());
    }, mapKeys: function mapKeys(t, e) {
      var r = this;return Ot(this, this.toSeq().flip().map(function (n, i) {
        return t.call(e, n, i, r);
      }).flip());
    } });var sn = p.prototype;sn[lr] = !0, sn[Ir] = un.entries, sn.__toJS = un.toObject, sn.__toStringMapper = function (t, e) {
    return JSON.stringify(e) + ": " + tr(t);
  }, Xe(v, { toKeyedSeq: function toKeyedSeq() {
      return new at(this, !1);
    }, filter: function filter(t, e) {
      return Ot(this, lt(this, t, e, !1));
    }, findIndex: function findIndex(t, e) {
      var r = this.findEntry(t, e);return r ? r[0] : -1;
    }, indexOf: function indexOf(t) {
      var e = this.toKeyedSeq().keyOf(t);return void 0 === e ? -1 : e;
    }, lastIndexOf: function lastIndexOf(t) {
      return this.toSeq().reverse().indexOf(t);
    }, reverse: function reverse() {
      return Ot(this, vt(this, !1));
    }, slice: function slice(t, e) {
      return Ot(this, mt(this, t, e, !1));
    }, splice: function splice(t, e) {
      var r = arguments.length;if ((e = Math.max(0 | e, 0), 0 === r || 2 === r && !e)) return this;t = h(t, 0 > t ? this.count() : this.size);var n = this.slice(0, t);return Ot(this, 1 === r ? n : n.concat(i(arguments, 2), this.slice(t + e)));
    }, findLastIndex: function findLastIndex(t, e) {
      var r = this.toKeyedSeq().findLastKey(t, e);return void 0 === r ? -1 : r;
    }, first: function first() {
      return this.get(0);
    }, flatten: function flatten(t) {
      return Ot(this, zt(this, t, !1));
    }, get: function get(t, e) {
      return (t = u(this, t), 0 > t || this.size === 1 / 0 || void 0 !== this.size && t > this.size ? e : this.find(function (e, r) {
        return r === t;
      }, void 0, e));
    }, has: function has(t) {
      return (t = u(this, t), t >= 0 && (void 0 !== this.size ? this.size === 1 / 0 || this.size > t : -1 !== this.indexOf(t)));
    }, interpose: function interpose(t) {
      return Ot(this, bt(this, t));
    }, interleave: function interleave() {
      var t = [this].concat(i(arguments)),
          e = Et(this.toSeq(), k.of, t),
          r = e.flatten(!0);return (e.size && (r.size = e.size * t.length), Ot(this, r));
    }, last: function last() {
      return this.get(-1);
    }, skipWhile: function skipWhile(t, e) {
      return Ot(this, wt(this, t, e, !1));
    }, zip: function zip() {
      var t = [this].concat(i(arguments));return Ot(this, Et(this, er, t));
    }, zipWith: function zipWith(t) {
      var e = i(arguments);return (e[0] = this, Ot(this, Et(this, t, e)));
    } }), v.prototype[yr] = !0, v.prototype[dr] = !0, Xe(l, { get: function get(t, e) {
      return this.has(t) ? t : e;
    }, includes: function includes(t) {
      return this.has(t);
    }, keySeq: function keySeq() {
      return this.valueSeq();
    } }), l.prototype.has = un.includes, Xe(x, p.prototype), Xe(k, v.prototype), Xe(A, l.prototype), Xe(V, p.prototype), Xe(Y, v.prototype), Xe(Q, l.prototype);var an = { Iterable: _, Seq: O, Collection: H, Map: Lt, OrderedMap: Ie, List: fe, Stack: Ee, Set: Ae, OrderedSet: Le, Record: Ce, Range: Ye, Repeat: Qe, is: X, fromJS: F };return an;
});

},{}]},{},[11])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3N0b3JlL0FwcFN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L0FwcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLkdhbWVPdmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5NYWluR2FtZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uUGxheWVyU2VsZWN0LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5UaXRsZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uV2FpdGluZ09uUGxheWVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL21haW4uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9Ob3JpLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvU29ja2V0SU9FdmVudHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zdG9yZS9JbW11dGFibGVNYXAuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL0Rpc3BhdGNoZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUmVuZGVyZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9Sb3V0ZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9SeC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L0FwcGxpY2F0aW9uVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvTWl4aW5Db21wb25lbnRWaWV3cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvTWl4aW5FdmVudERlbGVnYXRvci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvTWl4aW5OdWRvcnVDb250cm9scy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvTWl4aW5TdG9yZVN0YXRlVmlld3MuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L1ZpZXdDb21wb25lbnQuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Q3JlYXRvci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Vmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29tcG9uZW50cy9Nb2RhbENvdmVyVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29tcG9uZW50cy9Ub2FzdFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvVG9vbFRpcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvcmUvTnVtYmVyVXRpbHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvcmUvT2JqZWN0VXRpbHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvdmVuZG9yL2ltbXV0YWJsZS5taW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFJLEdBQUcsR0FBWSxPQUFPLENBQUMscUJBQXFCLENBQUM7SUFDN0MsV0FBVyxHQUFJLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQztJQUNuRCxZQUFZLEdBQUcsT0FBTyxDQUFDLGlDQUFpQyxDQUFDO0lBQ3pELGVBQWUsR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQzs7Ozs7OztBQU9uRSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7O0FBRS9CLFFBQU0sRUFBRSxFQUFFOzs7OztBQUtWLE9BQUssRUFBRyxPQUFPLENBQUMscUJBQXFCLENBQUM7QUFDdEMsTUFBSSxFQUFJLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztBQUNwQyxRQUFNLEVBQUUsT0FBTyxDQUFDLDZCQUE2QixDQUFDOzs7OztBQUs5QyxZQUFVLEVBQUUsc0JBQVk7QUFDdEIsUUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztB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Q0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLFFBQVEsSUFBRSxPQUFPLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxVQUFVLEtBQUcsQ0FBQyxFQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFdBQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsS0FBSSxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTSxFQUFDLEtBQUssRUFBQyxLQUFLLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLElBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUMsT0FBTSxVQUFVLElBQUUsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLElBQUUsUUFBUSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFFLFFBQVEsRUFBRSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFDamdFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLGNBQWMsR0FBQyxFQUFFLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLFFBQVEsSUFBRSxPQUFPLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsd0VBQXdFLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLCtDQUErQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLFFBQVEsSUFBRSxPQUFPLENBQUMsSUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsZ0VBQWdFLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsVUFBTSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBQztBQUFDLFdBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFNLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxXQUFXLEtBQUcsTUFBTSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxXQUFXLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLFVBQVUsR0FBQyxVQUFVLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQ3BnRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxVQUFVLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsVUFBVSxHQUFFLENBQUMsSUFBRSxVQUFVLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLGFBQWEsR0FBQyxDQUFDLEdBQUMsb0JBQW9CLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsS0FBRyxFQUFFLEtBQUcsRUFBRSxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxFQUFFLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsQ0FBQyxJQUFHLEVBQUUsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBRSxFQUFDO0FBQUMsV0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLG9CQUFvQixJQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsRUFBQyxVQUFVLEdBQUMsRUFBRSxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQSxFQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxVQUFHLEtBQUssQ0FBQyxLQUFHLEVBQUUsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQyxJQUFHLEVBQUUsRUFBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsRUFBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLEVBQUMsWUFBWSxFQUFDLENBQUMsQ0FBQyxFQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLG9CQUFvQixJQUFFLENBQUMsQ0FBQyxvQkFBb0IsS0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBQyxDQUFDLENBQUMsb0JBQW9CLEdBQUMsWUFBVTtBQUFDLGVBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFJO0FBQUMsWUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsUUFBUSxFQUFDLE1BQU0sS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxRQUFPLENBQUMsQ0FBQyxRQUFRLEdBQUUsS0FBSyxDQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLGVBQWUsSUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQSxDQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxNQUFFLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsbURBQW1ELENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsZUFBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pnRSxFQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDO0FBQUMsZ0JBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO1dBQUMsT0FBTyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxFQUFFLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxLQUFLLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGlCQUFPO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztjQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2NBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLEVBQUUsQ0FBQSxDQUFFLFNBQVMsRUFBRSxDQUFDO0FBQzlnRSxLQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGdCQUFPLENBQUMsR0FBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUU7Ozs4QkFBUztVQUFSLENBQUM7VUFBQyxDQUFDO1VBQUMsQ0FBQztVQUFDLENBQUM7QUFBTSxPQUFDLEdBQXlFLENBQUMsR0FBUSxDQUFDLEdBQXFFLENBQUMsR0FBQyxDQUFDLEdBQTRCLENBQUM7O0FBQTdMLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQzthQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Y0FBQyxDQUFDO2NBQUMsQ0FBQztjQUFDLENBQUM7OztPQUFFLElBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsSUFBRSxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGdCQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxDQUFBO1NBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGlCQUFLLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUM7R0FBQSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsRUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRTtBQUFDLGVBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEVBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO1NBQUMsUUFBTSxDQUFDLEVBQUU7QUFDdmdFLGVBQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLENBQUE7S0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUM7S0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGtCQUFNLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO1NBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLElBQUksQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUU7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQUssQ0FBQyxHQUFFO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLEVBQUUsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxBQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7V0FBQyxNQUFLLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7U0FBQyxPQUFPLENBQUMsRUFBRSxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQU0sQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEtBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEFBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUE7S0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUNoZ0UsYUFBTyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBSSxDQUFDLENBQUMsUUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7U0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsSUFBSSxDQUFBO1NBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQTtTQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyx5QkFBeUIsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQ0FBRSxTQUFTLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFBLEdBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxtQ0FBbUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxNQUFJO0FBQUMsVUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQ2pnRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxXQUFXLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxXQUFXLEtBQUcsRUFBRSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsT0FBTyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxFQUFBLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLE1BQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLGFBQWEsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsQ0FBQTtPQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsQ0FBQyxDQUFBLENBQUUsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEdBQUMsVUFBVSxFQUFDLENBQUMsR0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLFNBQVMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsR0FBQyxTQUFTLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxFQUFFLEVBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxRQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQyxDQUFDLENBQUEsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUNqaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFHLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLElBQUksRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUs7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsWUFBVTtBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQSxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLEVBQUUsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxZQUFVO0FBQUMsaUJBQU87QUFBQyxjQUFHLENBQUMsRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxFQUFFLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQTtXQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLENBQUE7U0FBQztPQUFDLENBQUEsQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxFQUFBO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7QUFDcmtFLFFBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxFQUFFLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEdBQUMsRUFBRSxHQUFFLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQztBQUFDLFdBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBQyxNQUFNLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxJQUFFLEVBQUUsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxFQUFFLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsRUFBRSxJQUFFLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUcsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUEsQUFBQyxDQUFBLElBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxNQUFLLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDcGdFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxTQUFGLENBQUMsQ0FBVSxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsWUFBWSxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxjQUFjLEdBQUMsQ0FBQyxDQUFBO09BQUMsSUFBSSxDQUFDLElBQUksR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsV0FBVyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLEtBQUssSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksSUFBRSxRQUFRLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRztBQUFDLE9BQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQyxFQUFFO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFDLEdBQUcsRUFBQyxlQUFVO0FBQUMsZUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxvQ0FBb0MsQ0FBQyxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsTUFBTSxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFdBQVcsSUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSTtBQUN4aEUsT0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxLQUFLLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQSxBQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsRUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsMEJBQTBCLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLENBQUEsRUFBQztBQUFDLFVBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUE7S0FBQztHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQSxBQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBLEVBQUM7QUFBQyxVQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUMsSUFBSSxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsV0FBUyxHQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsU0FBUyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsUUFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLENBQUMscUJBQXFCLElBQUUsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxZQUFVO0FBQUMsYUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sWUFBVTtBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLFFBQVEsSUFBRSxPQUFPLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBTyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsRUFBRSxFQUFDLFNBQVMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFFLEVBQUUsR0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLFVBQVUsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxFQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFVLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsSUFBSSxFQUFFLEdBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLO01BQUMsRUFBRSxHQUFDLFFBQVE7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxDQUFDLElBQUUsRUFBRTtNQUFDLEVBQUUsR0FBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxFQUFDO01BQUMsRUFBRSxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGFBQWEsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsNEJBQTRCO01BQUMsRUFBRSxHQUFDLHlCQUF5QjtNQUFDLEVBQUUsR0FBQywyQkFBMkI7TUFBQyxFQUFFLEdBQUMsMkJBQTJCO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLE1BQU0sSUFBRSxNQUFNLENBQUMsUUFBUTtNQUFDLEVBQUUsR0FBQyxZQUFZO01BQUMsRUFBRSxHQUFDLEVBQUUsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU0sWUFBWSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLEVBQUUsRUFDcmdFLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFNLEVBQUUsR0FBQyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxZQUFVO0FBQUMsWUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUUsSUFBSSxDQUFDLGlCQUFpQixLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUEsQUFBQyxFQUFDLElBQUksQ0FBQSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUc7QUFDaGtFLFdBQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFFLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxHQUFFO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQSxFQUFDLE1BQUs7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsVUFBVSxJQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEtBQUssR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQSxHQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQSxBQUFDLElBQUUsRUFBRSxLQUFHLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUM7TUFBQyxFQUFFLEdBQUMsTUFBTSxDQUFDLFlBQVk7TUFBQyxFQUFFLEdBQUMsQ0FBQSxZQUFVO0FBQUMsUUFBRztBQUFDLGNBQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsQ0FBQSxFQUFFO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLE9BQU8sQ0FBQyxFQUFFLEtBQUcsRUFBRSxHQUFDLElBQUksT0FBTyxFQUFBLENBQUEsQUFBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsbUJBQW1CLENBQUMsVUFBVSxJQUFFLE9BQU8sTUFBTSxLQUFHLEVBQUUsR0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUU7TUFBQyxFQUFFLEdBQUMsR0FBRztNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxRQUFRLEtBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxLQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxJQUFJLENBQUMsUUFBUSxFQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7QUFDdmdFLFdBQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsRUFBQztBQUFDLFVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQU87QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxZQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQztLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxZQUFVO0FBQUMsYUFBTyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLEtBQUssQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLEVBQzVnRSxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsS0FBSyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFNLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFDLElBQUksQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFBLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLEtBQUssSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHVCQUF1QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLElBQUUsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ25pRSxDQUFDLElBQUUsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQztHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQSxBQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQUksQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsTUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsS0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxFQUFDLE9BQU8sQ0FBQyxHQUFDLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxHQUFFLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3poRSxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBRTtBQUFDLFVBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsS0FBSyxFQUFDO0FBQUMsWUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7T0FBQyxNQUFLLElBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBQztBQUFDLGFBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxNQUFLLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLGNBQUcsQ0FBQyxDQUFDLEtBQUssRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxTQUFRO09BQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7S0FBQyxPQUFPLENBQUMsRUFBRSxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFBLEVBQUM7QUFBQyxPQUFDLElBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLENBQUMsS0FBSyxHQUFDLElBQUksRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxTQUFTLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxLQUFLLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFDO0dBQy9oRSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFBLEtBQUksRUFBRSxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyx3QkFBd0I7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsVUFBVSxHQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUE7S0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLFFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxNQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLEVBQUUsQ0FBQztHQUNuZ0UsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFlBQVksR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBRSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsUUFBRyxDQUFDLEtBQUcsU0FBUyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsU0FBUyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsRUFBQyxLQUFLLEVBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFBO0tBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUMzaUUsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBRyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMseUJBQXlCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxVQUFVLEdBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxTQUFTLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDaGhFLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsdUJBQXVCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFlBQVksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFFBQUcsSUFBSSxDQUFDLFNBQVMsRUFBQyxRQUFPLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLENBQUEsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLDBCQUEwQixHQUFDLENBQUMsR0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQ3RoRSxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVUsR0FBQyxVQUFVLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsR0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUEsQUFBQyxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFBLEdBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU07UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxZQUFZLEVBQUUsR0FBQyxJQUFJLENBQUMsTUFBTSxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsSUFBSSxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxLQUFLLEtBQUcsQ0FBQyxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3BnRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsV0FBVyxHQUFDLFdBQVcsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEdBQUcsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFlBQVksRUFBQyx3QkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsc0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFlBQVksRUFBQyx3QkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLGFBQU0sWUFBWSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsR0FBRyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEdBQUcsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUMvZ0UsVUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLGFBQWEsRUFBQyx1QkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxjQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsUUFBTyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyx1QkFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLEtBQUssQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVU7QUFBQyxlQUFNLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxRQUFPLENBQUMsQ0FBQyxZQUFZLEdBQUMsWUFBVTtBQUFDLGVBQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3hnRSxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksR0FBRTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxFQUFFLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUcsRUFBRSxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFVBQVUsRUFBQyxvQkFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsTUFBTSxLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsZ0JBQWdCLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTSxFQUFFLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLENBQUEsWUFBVTtBQUFDLFFBQUc7QUFBQyxZQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLGNBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFDO0FBQUMsZ0JBQUksQ0FBQyxDQUFDLElBQUc7QUFBQyxvQkFBTSxLQUFLLEVBQUUsQ0FBQTthQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxlQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTthQUFDLElBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBQyxRQUFPLE9BQU8sSUFBRSxPQUFPLENBQUMsSUFBSSxJQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsMklBQTJJLEdBQUMsQ0FBQyxDQUFDLEVBQ3JtRSxJQUFJLENBQUMsSUFBSSxDQUFBLENBQUE7V0FBQztTQUFDLEVBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQyxFQUFFO0dBQUMsQ0FBQSxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyxxQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLGdCQUFnQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsV0FBVyxFQUFDLHFCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxhQUFhLEVBQUMsdUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsS0FBRyxDQUFDLENBQUE7T0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxBQUFDLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN2Z0UsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBQyxRQUFRLEVBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBQyxDQUFDLEVBQUMsVUFBVSxFQUFDLENBQUMsRUFBQyxHQUFHLEVBQUMsRUFBRSxFQUFDLFVBQVUsRUFBQyxFQUFFLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUMsRUFBRSxFQUFDLEdBQUcsRUFBQyxFQUFFLEVBQUMsVUFBVSxFQUFDLEVBQUUsRUFBQyxNQUFNLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFDLEVBQUUsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgX3J4ICAgICAgICAgID0gcmVxdWlyZSgnLi4vbm9yaS91dGlscy9SeC5qcycpLFxuICAgIF9hcHBBY3Rpb25zICA9IHJlcXVpcmUoJy4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfbm9yaUFjdGlvbnMgPSByZXF1aXJlKCcuLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJyksXG4gICAgX3NvY2tldElPRXZlbnRzID0gcmVxdWlyZSgnLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cbi8qKlxuICogXCJDb250cm9sbGVyXCIgZm9yIGEgTm9yaSBhcHBsaWNhdGlvbi4gVGhlIGNvbnRyb2xsZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gKiBib290c3RyYXBwaW5nIHRoZSBhcHAgYW5kIHBvc3NpYmx5IGhhbmRsaW5nIHNvY2tldC9zZXJ2ZXIgaW50ZXJhY3Rpb24uXG4gKiBBbnkgYWRkaXRpb25hbCBmdW5jdGlvbmFsaXR5IHNob3VsZCBiZSBoYW5kbGVkIGluIGEgc3BlY2lmaWMgbW9kdWxlLlxuICovXG52YXIgQXBwID0gTm9yaS5jcmVhdGVBcHBsaWNhdGlvbih7XG5cbiAgbWl4aW5zOiBbXSxcblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBtYWluIE5vcmkgQXBwIHN0b3JlIGFuZCB2aWV3LlxuICAgKi9cbiAgc3RvcmUgOiByZXF1aXJlKCcuL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gIHZpZXcgIDogcmVxdWlyZSgnLi92aWV3L0FwcFZpZXcuanMnKSxcbiAgc29ja2V0OiByZXF1aXJlKCcuLi9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMnKSxcblxuICAvKipcbiAgICogSW50aWFsaXplIHRoZSBhcHBpbGNhdGlvbiwgdmlldyBhbmQgc3RvcmVcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvY2tldC5pbml0aWFsaXplKCk7XG4gICAgdGhpcy5zb2NrZXQuc3Vic2NyaWJlKHRoaXMuaGFuZGxlU29ja2V0TWVzc2FnZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMudmlldy5pbml0aWFsaXplKCk7XG5cbiAgICB0aGlzLnN0b3JlLmluaXRpYWxpemUoKTsgLy8gc3RvcmUgd2lsbCBhY3F1aXJlIGRhdGEgZGlzcGF0Y2ggZXZlbnQgd2hlbiBjb21wbGV0ZVxuICAgIHRoaXMuc3RvcmUuc3Vic2NyaWJlKCdzdG9yZUluaXRpYWxpemVkJywgdGhpcy5vblN0b3JlSW5pdGlhbGl6ZWQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5zdG9yZS5sb2FkU3RvcmUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQWZ0ZXIgdGhlIHN0b3JlIGRhdGEgaXMgcmVhZHlcbiAgICovXG4gIG9uU3RvcmVJbml0aWFsaXplZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucnVuQXBwbGljYXRpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBcIlBsZWFzZSB3YWl0XCIgY292ZXIgYW5kIHN0YXJ0IHRoZSBhcHBcbiAgICovXG4gIHJ1bkFwcGxpY2F0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy52aWV3LnJlbW92ZUxvYWRpbmdNZXNzYWdlKCk7XG4gICAgdGhpcy52aWV3LnJlbmRlcigpO1xuXG4gICAgLy8gVmlldyB3aWxsIHNob3cgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3RvcmUgc3RhdGVcbiAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHtjdXJyZW50U3RhdGU6ICdQTEFZRVJfU0VMRUNUJ30pO1xuXG4gICAgLy8gVGVzdCBwaW5nXG4gICAgLy9fcnguZG9FdmVyeSgxMDAwLCAzLCAoKSA9PiB0aGlzLnNvY2tldC5waW5nKCkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbGwgbWVzc2FnZXMgZnJvbSB0aGUgU29ja2V0LklPIHNlcnZlciB3aWxsIGJlIGZvcndhcmRlZCBoZXJlXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBoYW5kbGVTb2NrZXRNZXNzYWdlOiBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIGlmICghcGF5bG9hZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiZnJvbSBTb2NrZXQuSU8gc2VydmVyXCIsIHBheWxvYWQpO1xuICAgIHN3aXRjaCAocGF5bG9hZC50eXBlKSB7XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuQ09OTkVDVCk6XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJDb25uZWN0ZWQhXCIpO1xuICAgICAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHtzb2NrZXRJT0lEOiBwYXlsb2FkLmlkfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5VU0VSX0NPTk5FQ1RFRCk6XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJBbm90aGVyIGNsaWVudCBjb25uZWN0ZWRcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5VU0VSX0RJU0NPTk5FQ1RFRCk6XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJBbm90aGVyIGNsaWVudCBkaXNjb25uZWN0ZWRcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5EUk9QUEVEKTpcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIllvdSB3ZXJlIGRyb3BwZWQhXCIsIHBheWxvYWQucGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5TWVNURU1fTUVTU0FHRSk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiU3lzdGVtIG1lc3NhZ2VcIiwgcGF5bG9hZC5wYXlsb2FkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkNSRUFURV9ST09NKTpcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNyZWF0ZSByb29tXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuSk9JTl9ST09NKTpcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImpvaW4gcm9vbVwiLCBwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICB0aGlzLmhhbmRsZUpvaW5OZXdseUNyZWF0ZWRSb29tKHBheWxvYWQucGF5bG9hZC5yb29tSUQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuTEVBVkVfUk9PTSk6XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJsZWF2ZSByb29tXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuR0FNRV9TVEFSVCk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR0FNRSBTVEFSVEVEXCIpO1xuICAgICAgICB0aGlzLmhhbmRsZUdhbWVTdGFydCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuR0FNRV9FTkQpOlxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiR2FtZSBlbmRlZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLlNZU1RFTV9NRVNTQUdFKTpcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5CUk9BRENBU1QpOlxuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLk1FU1NBR0UpOlxuICAgICAgICB0aGlzLnZpZXcuYWxlcnQocGF5bG9hZC5wYXlsb2FkLCBwYXlsb2FkLnR5cGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oXCJVbmhhbmRsZWQgU29ja2V0SU8gbWVzc2FnZSB0eXBlXCIsIHBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICB9LFxuXG4gIGhhbmRsZUpvaW5OZXdseUNyZWF0ZWRSb29tOiBmdW5jdGlvbiAocm9vbUlEKSB7XG4gICAgdmFyIHNldFJvb20gICAgICAgICAgICAgICA9IF9hcHBBY3Rpb25zLnNldFNlc3Npb25Qcm9wcyh7cm9vbUlEOiByb29tSUR9KSxcbiAgICAgICAgc2V0V2FpdGluZ1NjcmVlblN0YXRlID0gX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogdGhpcy5zdG9yZS5nYW1lU3RhdGVzWzJdfSk7XG5cbiAgICB0aGlzLnN0b3JlLmFwcGx5KHNldFJvb20pO1xuICAgIHRoaXMuc3RvcmUuYXBwbHkoc2V0V2FpdGluZ1NjcmVlblN0YXRlKTtcbiAgfSxcblxuICBoYW5kbGVHYW1lU3RhcnQ6IGZ1bmN0aW9uIChyb29tSUQpIHtcbiAgICBjb25zb2xlLmxvZygnU3RhcnRpbmcgZ2FtZScpO1xuICAgIHZhciBzZXRHYW1lUGxheVN0YXRlID0gX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogdGhpcy5zdG9yZS5nYW1lU3RhdGVzWzNdfSk7XG4gICAgdGhpcy5zdG9yZS5hcHBseShzZXRHYW1lUGxheVN0YXRlKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHA7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIExPQ0FMX1BMQVlFUl9DT05ORUNUICAgICAgIDogJ0xPQ0FMX1BMQVlFUl9DT05ORUNUJyxcbiAgU0VUX1NFU1NJT05fUFJPUFMgICAgICAgICAgOiAnU0VUX1NFU1NJT05fUFJPUFMnLFxuICBTRVRfTE9DQUxfUExBWUVSX1BST1BTICAgICA6ICdTRVRfTE9DQUxfUExBWUVSX1BST1BTJyxcbiAgU0VUX0xPQ0FMX1BMQVlFUl9OQU1FICAgICAgOiAnU0VUX0xPQ0FMX1BMQVlFUl9OQU1FJyxcbiAgU0VUX0xPQ0FMX1BMQVlFUl9BUFBFQVJBTkNFOiAnU0VUX0xPQ0FMX1BMQVlFUl9BUFBFQVJBTkNFJyxcbiAgU0VUX1JFTU9URV9QTEFZRVJfUFJPUFMgICAgOiAnU0VUX1JFTU9URV9QTEFZRVJfUFJPUFMnXG4gIC8vU0VMRUNUX1BMQVlFUiAgICAgICAgICAgICAgOiAnU0VMRUNUX1BMQVlFUicsXG4gIC8vUkVNT1RFX1BMQVlFUl9DT05ORUNUICAgICAgOiAnUkVNT1RFX1BMQVlFUl9DT05ORUNUJyxcbiAgLy9HQU1FX1NUQVJUICAgICAgICAgICAgICAgICA6ICdHQU1FX1NUQVJUJyxcbiAgLy9MT0NBTF9RVUVTVElPTiAgICAgICAgICAgICA6ICdMT0NBTF9RVUVTVElPTicsXG4gIC8vUkVNT1RFX1FVRVNUSU9OICAgICAgICAgICAgOiAnUkVNT1RFX1FVRVNUSU9OJyxcbiAgLy9MT0NBTF9QTEFZRVJfSEVBTFRIX0NIQU5HRSA6ICdMT0NBTF9QTEFZRVJfSEVBTFRIX0NIQU5HRScsXG4gIC8vUkVNT1RFX1BMQVlFUl9IRUFMVEhfQ0hBTkdFOiAnUkVNT1RFX1BMQVlFUl9IRUFMVEhfQ0hBTkdFJyxcbiAgLy9HQU1FX09WRVIgICAgICAgICAgICAgICAgICA6ICdHQU1FX09WRVInXG59OyIsInZhciBfYWN0aW9uQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9BY3Rpb25Db25zdGFudHMuanMnKTtcblxuLyoqXG4gKiBQdXJlbHkgZm9yIGNvbnZlbmllbmNlLCBhbiBFdmVudCAoXCJhY3Rpb25cIikgQ3JlYXRvciBhbGEgRmx1eCBzcGVjLiBGb2xsb3dcbiAqIGd1aWRlbGluZXMgZm9yIGNyZWF0aW5nIGFjdGlvbnM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBBY3Rpb25DcmVhdG9yID0ge1xuXG4gIHNldExvY2FsUGxheWVyUHJvcHM6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGxvY2FsUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFJlbW90ZVBsYXllclByb3BzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlICAgOiBfYWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcmVtb3RlUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFNlc3Npb25Qcm9wczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX2FjdGlvbkNvbnN0YW50cy5TRVRfUkVNT1RFX1BMQVlFUl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHNlc3Npb246IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBY3Rpb25DcmVhdG9yOyIsInZhciBfbm9yaUFjdGlvbkNvbnN0YW50cyAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcycpLFxuICAgIF9hcHBBY3Rpb25Db25zdGFudHMgICAgID0gcmVxdWlyZSgnLi4vYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcycpLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0ID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyksXG4gICAgX21peGluUmVkdWNlclN0b3JlICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3N0b3JlL01peGluUmVkdWNlclN0b3JlLmpzJyksXG4gICAgX251bVV0aWxzICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvcmUvTnVtYmVyVXRpbHMuanMnKTtcblxuLyoqXG4gKiBUaGlzIGFwcGxpY2F0aW9uIHN0b3JlIGNvbnRhaW5zIFwicmVkdWNlciBzdG9yZVwiIGZ1bmN0aW9uYWxpdHkgYmFzZWQgb24gUmVkdXguXG4gKiBUaGUgc3RvcmUgc3RhdGUgbWF5IG9ubHkgYmUgY2hhbmdlZCBmcm9tIGV2ZW50cyBhcyBhcHBsaWVkIGluIHJlZHVjZXIgZnVuY3Rpb25zLlxuICogVGhlIHN0b3JlIHJlY2VpdmVkIGFsbCBldmVudHMgZnJvbSB0aGUgZXZlbnQgYnVzIGFuZCBmb3J3YXJkcyB0aGVtIHRvIGFsbFxuICogcmVkdWNlciBmdW5jdGlvbnMgdG8gbW9kaWZ5IHN0YXRlIGFzIG5lZWRlZC4gT25jZSB0aGV5IGhhdmUgcnVuLCB0aGVcbiAqIGhhbmRsZVN0YXRlTXV0YXRpb24gZnVuY3Rpb24gaXMgY2FsbGVkIHRvIGRpc3BhdGNoIGFuIGV2ZW50IHRvIHRoZSBidXMsIG9yXG4gKiBub3RpZnkgc3Vic2NyaWJlcnMgdmlhIGFuIG9ic2VydmFibGUuXG4gKlxuICogRXZlbnRzID0+IGhhbmRsZUFwcGxpY2F0aW9uRXZlbnRzID0+IGFwcGx5UmVkdWNlcnMgPT4gaGFuZGxlU3RhdGVNdXRhdGlvbiA9PiBOb3RpZnlcbiAqL1xudmFyIEFwcFN0b3JlID0gTm9yaS5jcmVhdGVTdG9yZSh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluUmVkdWNlclN0b3JlLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0KClcbiAgXSxcblxuICBnYW1lU3RhdGVzOiBbJ1RJVExFJywgJ1BMQVlFUl9TRUxFQ1QnLCAnV0FJVElOR19PTl9QTEFZRVInLCAnTUFJTl9HQU1FJywgJ0dBTUVfT1ZFUiddLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFkZFJlZHVjZXIodGhpcy5tYWluU3RhdGVSZWR1Y2VyKTtcbiAgICB0aGlzLmluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKTtcbiAgICB0aGlzLnNldFN0YXRlKE5vcmkuY29uZmlnKCkpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgnc3RvcmVJbml0aWFsaXplZCcpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgb3IgbG9hZCBhbnkgbmVjZXNzYXJ5IGRhdGEgYW5kIHRoZW4gYnJvYWRjYXN0IGEgaW5pdGlhbGl6ZWQgZXZlbnQuXG4gICAqL1xuICBsb2FkU3RvcmU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRTdGF0ZTogdGhpcy5nYW1lU3RhdGVzWzBdLFxuICAgICAgc2Vzc2lvbiAgICAgOiB7XG4gICAgICAgIHJvb21JRDogJydcbiAgICAgIH0sXG4gICAgICBsb2NhbFBsYXllciA6IHtcbiAgICAgICAgaWQgICAgICAgIDogJycsXG4gICAgICAgIHR5cGUgICAgICA6ICcnLFxuICAgICAgICBuYW1lICAgICAgOiAnTXlzdGVyeSBQbGF5ZXIgJyArIF9udW1VdGlscy5ybmROdW1iZXIoMTAwLCA5OTkpLFxuICAgICAgICBoZWFsdGggICAgOiA2LFxuICAgICAgICBhcHBlYXJhbmNlOiAnZ3JlZW4nLFxuICAgICAgICBiZWhhdmlvcnMgOiBbXVxuICAgICAgfSxcbiAgICAgIHJlbW90ZVBsYXllcjoge1xuICAgICAgICBpZCAgICAgICAgOiAnJyxcbiAgICAgICAgdHlwZSAgICAgIDogJycsXG4gICAgICAgIG5hbWUgICAgICA6ICcnLFxuICAgICAgICBoZWFsdGggICAgOiA2LFxuICAgICAgICBhcHBlYXJhbmNlOiAnJyxcbiAgICAgICAgYmVoYXZpb3JzIDogW11cbiAgICAgIH0sXG4gICAgICBxdWVzdGlvbkJhbms6IFtdXG4gICAgfSk7XG5cbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3N0b3JlSW5pdGlhbGl6ZWQnKTtcbiAgfSxcblxuICBjcmVhdGVRdWVzdGlvbk9iamVjdDogZnVuY3Rpb24gKHByb21wdCwgZGlzdHJhY3RvcnMsIHBvaW50VmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcHJvbXB0ICAgICA6IHByb21wdCxcbiAgICAgIGRpc3RyYWN0b3JzOiBkaXN0cmFjdG9ycyxcbiAgICAgIHBvaW50VmFsdWUgOiBwb2ludFZhbHVlXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZ5IHN0YXRlIGJhc2VkIG9uIGluY29taW5nIGV2ZW50cy4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIG1vZGlmaWVkXG4gICAqIHN0YXRlIGFuZCBkb2VzIG5vdCBtb2RpZnkgdGhlIHN0YXRlIGRpcmVjdGx5LlxuICAgKiBDYW4gY29tcG9zZSBzdGF0ZSB0cmFuc2Zvcm1hdGlvbnNcbiAgICogcmV0dXJuIF8uYXNzaWduKHt9LCBzdGF0ZSwgb3RoZXJTdGF0ZVRyYW5zZm9ybWVyKHN0YXRlKSk7XG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKiBAcGFyYW0gZXZlbnRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBtYWluU3RhdGVSZWR1Y2VyOiBmdW5jdGlvbiAoc3RhdGUsIGV2ZW50KSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcblxuICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXG4gICAgICBjYXNlIF9ub3JpQWN0aW9uQ29uc3RhbnRzLkNIQU5HRV9TVE9SRV9TVEFURTpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfTE9DQUxfUExBWUVSX1BST1BTOlxuICAgICAgY2FzZSBfYXBwQWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTOlxuICAgICAgY2FzZSBfYXBwQWN0aW9uQ29uc3RhbnRzLlNFVF9TRVNTSU9OX1BST1BTOlxuICAgICAgICByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIGV2ZW50LnBheWxvYWQuZGF0YSk7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS53YXJuKCdSZWR1Y2VyIHN0b3JlLCB1bmhhbmRsZWQgZXZlbnQgdHlwZTogJytldmVudC50eXBlKTtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ2FsbGVkIGFmdGVyIGFsbCByZWR1Y2VycyBoYXZlIHJ1biB0byBicm9hZGNhc3QgcG9zc2libGUgdXBkYXRlcy4gRG9lc1xuICAgKiBub3QgY2hlY2sgdG8gc2VlIGlmIHRoZSBzdGF0ZSB3YXMgYWN0dWFsbHkgdXBkYXRlZC5cbiAgICovXG4gIGhhbmRsZVN0YXRlTXV0YXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzKHRoaXMuZ2V0U3RhdGUoKSk7XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwU3RvcmUoKTsiLCJ2YXIgX2FwcFN0b3JlICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZS5qcycpLFxuICAgIF9taXhpbkFwcGxpY2F0aW9uVmlldyAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L0FwcGxpY2F0aW9uVmlldy5qcycpLFxuICAgIF9taXhpbk51ZG9ydUNvbnRyb2xzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluTnVkb3J1Q29udHJvbHMuanMnKSxcbiAgICBfbWl4aW5Db21wb25lbnRWaWV3cyAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpbkNvbXBvbmVudFZpZXdzLmpzJyksXG4gICAgX21peGluU3RvcmVTdGF0ZVZpZXdzICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5TdG9yZVN0YXRlVmlld3MuanMnKSxcbiAgICBfbWl4aW5FdmVudERlbGVnYXRvciAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzJyksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKTtcblxuLyoqXG4gKiBWaWV3IGZvciBhbiBhcHBsaWNhdGlvbi5cbiAqL1xuXG52YXIgQXBwVmlldyA9IE5vcmkuY3JlYXRlVmlldyh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluQXBwbGljYXRpb25WaWV3LFxuICAgIF9taXhpbk51ZG9ydUNvbnRyb2xzLFxuICAgIF9taXhpbkNvbXBvbmVudFZpZXdzLFxuICAgIF9taXhpblN0b3JlU3RhdGVWaWV3cyxcbiAgICBfbWl4aW5FdmVudERlbGVnYXRvcigpLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0KClcbiAgXSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbml0aWFsaXplQXBwbGljYXRpb25WaWV3KFsnYXBwbGljYXRpb25zY2FmZm9sZCcsICdhcHBsaWNhdGlvbmNvbXBvbmVudHNzY2FmZm9sZCddKTtcbiAgICB0aGlzLmluaXRpYWxpemVTdGF0ZVZpZXdzKF9hcHBTdG9yZSk7XG4gICAgdGhpcy5pbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKTtcblxuICAgIHRoaXMuY29uZmlndXJlVmlld3MoKTtcbiAgfSxcblxuICBjb25maWd1cmVWaWV3czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzY3JlZW5UaXRsZSAgICAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5UaXRsZS5qcycpKCksXG4gICAgICAgIHNjcmVlblBsYXllclNlbGVjdCAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLlBsYXllclNlbGVjdC5qcycpKCksXG4gICAgICAgIHNjcmVlbldhaXRpbmdPblBsYXllciA9IHJlcXVpcmUoJy4vU2NyZWVuLldhaXRpbmdPblBsYXllci5qcycpKCksXG4gICAgICAgIHNjcmVlbk1haW5HYW1lICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLk1haW5HYW1lLmpzJykoKSxcbiAgICAgICAgc2NyZWVuR2FtZU92ZXIgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uR2FtZU92ZXIuanMnKSgpLFxuICAgICAgICBnYW1lU3RhdGVzICAgICAgICAgICAgPSBfYXBwU3RvcmUuZ2FtZVN0YXRlcztcblxuICAgIHRoaXMuc2V0Vmlld01vdW50UG9pbnQoJyNjb250ZW50cycpO1xuXG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzBdLCAndGl0bGUnLCBzY3JlZW5UaXRsZSk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzFdLCAncGxheWVyc2VsZWN0Jywgc2NyZWVuUGxheWVyU2VsZWN0KTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbMl0sICd3YWl0aW5nb25wbGF5ZXInLCBzY3JlZW5XYWl0aW5nT25QbGF5ZXIpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1szXSwgJ2dhbWUnLCBzY3JlZW5NYWluR2FtZSk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzRdLCAnZ2FtZW92ZXInLCBzY3JlZW5HYW1lT3Zlcik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERyYXcgYW5kIFVJIHRvIHRoZSBET00gYW5kIHNldCBldmVudHNcbiAgICovXG4gIHJlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXcoKTsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyksXG4gICAgX3RlbXBsYXRlICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICNnYW1lb3Zlcl9fYnV0dG9uLXJlcGxheSc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjZ2FtZV9fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1s0XX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qXG4gVE9ET1xuXG4gKi9cblxudmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfYXBwQWN0aW9ucyAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldy5qcycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX3NvY2tldElPICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJyksXG4gICAgX3RlbXBsYXRlICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2JsdXIgI3NlbGVjdF9fcGxheWVybmFtZScgICAgICAgIDogdGhpcy5zZXRQbGF5ZXJOYW1lLmJpbmQodGhpcyksXG4gICAgICAnY2hhbmdlICNzZWxlY3RfX3BsYXllcnR5cGUnICAgICAgOiB0aGlzLnNldFBsYXllckFwcGVhcmFuY2UuYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tam9pbnJvb20nICA6IHRoaXMub25Kb2luUm9vbS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1jcmVhdGVyb29tJzogdGhpcy5vbkNyZWF0ZVJvb20uYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tZ28nICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzJdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgc2V0UGxheWVyTmFtZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGFjdGlvbiA9IF9hcHBBY3Rpb25zLnNldExvY2FsUGxheWVyUHJvcHMoe1xuICAgICAgbmFtZTogdmFsdWVcbiAgICB9KTtcbiAgICBfYXBwU3RvcmUuYXBwbHkoYWN0aW9uKTtcbiAgfSxcblxuICBzZXRQbGF5ZXJBcHBlYXJhbmNlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYWN0aW9uID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICBhcHBlYXJhbmNlOiB2YWx1ZVxuICAgIH0pO1xuICAgIF9hcHBTdG9yZS5hcHBseShhY3Rpb24pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2VcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICBhcHBlYXJhbmNlOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5hcHBlYXJhbmNlXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVydHlwZScpLnZhbHVlID0gdGhpcy5nZXRTdGF0ZSgpLmFwcGVhcmFuY2U7XG4gIH0sXG5cbiAgb25Kb2luUm9vbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciByb29tSUQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19yb29taWQnKS52YWx1ZTtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVJvb21JRChyb29tSUQpKSB7XG4gICAgICBfc29ja2V0SU8ubm90aWZ5U2VydmVyKF9zb2NrZXRJTy5ldmVudHMoKS5KT0lOX1JPT00sIHtcbiAgICAgICAgcm9vbUlEICAgIDogcm9vbUlELFxuICAgICAgICBwbGF5ZXJOYW1lOiB0aGlzLmdldFN0YXRlKCkubmFtZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9hcHBWaWV3LmFsZXJ0KCdUaGUgcm9vbSBJRCBpcyBub3QgY29ycmVjdC4gTXVzdCBiZSBhIDUgZGlnaXQgbnVtYmVyLicsICdCYWQgUm9vbSBJRCcpO1xuICAgIH1cbiAgfSxcblxuICB2YWxpZGF0ZVVzZXJEZXRhaWxzSW5wdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbmFtZSAgICAgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3BsYXllcm5hbWUnKS52YWx1ZSxcbiAgICAgICAgYXBwZWFyYW5jZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3BsYXllcnR5cGUnKS52YWx1ZTtcblxuICAgIGlmICghbmFtZS5sZW5ndGggfHwgIWFwcGVhcmFuY2UpIHtcbiAgICAgIF9hcHBWaWV3LmFsZXJ0KCdNYWtlIHN1cmUgeW91XFwndmUgdHlwZWQgYSBuYW1lIGZvciB5b3Vyc2VsZiBhbmQgc2VsZWN0ZWQgYW4gYXBwZWFyYW5jZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICAvKipcbiAgICogUm9vbSBJRCBtdXN0IGJlIGFuIGludGVnZXIgYW5kIDUgZGlnaXRzXG4gICAqIEBwYXJhbSByb29tSURcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICB2YWxpZGF0ZVJvb21JRDogZnVuY3Rpb24gKHJvb21JRCkge1xuICAgIGlmIChpc05hTihwYXJzZUludChyb29tSUQpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAocm9vbUlELmxlbmd0aCAhPT0gNSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBvbkNyZWF0ZVJvb206IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVVzZXJEZXRhaWxzSW5wdXQoKSkge1xuICAgICAgX3NvY2tldElPLm5vdGlmeVNlcnZlcihfc29ja2V0SU8uZXZlbnRzKCkuQ1JFQVRFX1JPT00sIHtwbGF5ZXJOYW1lOiB0aGlzLmdldFN0YXRlKCkubmFtZX0pO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjdGl0bGVfX2J1dHRvbi1zdGFydCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjd2FpdGluZ19fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1szXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICByb29tSUQgICAgOiBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qKlxuICogSW5pdGlhbCBmaWxlIGZvciB0aGUgQXBwbGljYXRpb25cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgLyoqXG4gICAqIElFIHZlcnNpb25zIDkgYW5kIHVuZGVyIGFyZSBibG9ja2VkLCBvdGhlcnMgYXJlIGFsbG93ZWQgdG8gcHJvY2VlZFxuICAgKi9cbiAgaWYoX2Jyb3dzZXJJbmZvLm5vdFN1cHBvcnRlZCB8fCBfYnJvd3NlckluZm8uaXNJRTkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuaW5uZXJIVE1MID0gJzxoMz5Gb3IgdGhlIGJlc3QgZXhwZXJpZW5jZSwgcGxlYXNlIHVzZSBJbnRlcm5ldCBFeHBsb3JlciAxMCssIEZpcmVmb3gsIENocm9tZSBvciBTYWZhcmkgdG8gdmlldyB0aGlzIGFwcGxpY2F0aW9uLjwvaDM+JztcbiAgfSBlbHNlIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24gbW9kdWxlIGFuZCBpbml0aWFsaXplXG4gICAgICovXG4gICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgd2luZG93Lk5vcmkgPSByZXF1aXJlKCcuL25vcmkvTm9yaS5qcycpO1xuICAgICAgd2luZG93LkFQUCA9IHJlcXVpcmUoJy4vYXBwL0FwcC5qcycpO1xuICAgICAgQVBQLmluaXRpYWxpemUoKTtcbiAgICB9O1xuXG4gIH1cblxufSgpKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbnZhciBOb3JpID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vdXRpbHMvRGlzcGF0Y2hlci5qcycpLFxuICAgICAgX3JvdXRlciAgICAgPSByZXF1aXJlKCcuL3V0aWxzL1JvdXRlci5qcycpO1xuXG4gIC8vIFN3aXRjaCBMb2Rhc2ggdG8gdXNlIE11c3RhY2hlIHN0eWxlIHRlbXBsYXRlc1xuICBfLnRlbXBsYXRlU2V0dGluZ3MuaW50ZXJwb2xhdGUgPSAve3soW1xcc1xcU10rPyl9fS9nO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGdldERpc3BhdGNoZXIoKSB7XG4gICAgcmV0dXJuIF9kaXNwYXRjaGVyO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Um91dGVyKCkge1xuICAgIHJldHVybiBfcm91dGVyO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgKHdpbmRvdy5BUFBfQ09ORklHX0RBVEEgfHwge30pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRSb3V0ZSgpIHtcbiAgICByZXR1cm4gX3JvdXRlci5nZXRDdXJyZW50Um91dGUoKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgRmFjdG9yaWVzIC0gY29uY2F0ZW5hdGl2ZSBpbmhlcml0YW5jZSwgZGVjb3JhdG9yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogTWVyZ2VzIGEgY29sbGVjdGlvbiBvZiBvYmplY3RzXG4gICAqIEBwYXJhbSB0YXJnZXRcbiAgICogQHBhcmFtIHNvdXJjZUFycmF5XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYXNzaWduQXJyYXkodGFyZ2V0LCBzb3VyY2VBcnJheSkge1xuICAgIHNvdXJjZUFycmF5LmZvckVhY2goZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgICAgdGFyZ2V0ID0gXy5hc3NpZ24odGFyZ2V0LCBzb3VyY2UpO1xuICAgIH0pO1xuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IE5vcmkgYXBwbGljYXRpb24gaW5zdGFuY2VcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUFwcGxpY2F0aW9uKGN1c3RvbSkge1xuICAgIGN1c3RvbS5taXhpbnMucHVzaCh0aGlzKTtcbiAgICByZXR1cm4gYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBtYWluIGFwcGxpY2F0aW9uIHN0b3JlXG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdG9yZShjdXN0b20pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gY3MoKSB7XG4gICAgICByZXR1cm4gXy5hc3NpZ24oe30sIGJ1aWxkRnJvbU1peGlucyhjdXN0b20pKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgbWFpbiBhcHBsaWNhdGlvbiB2aWV3XG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVWaWV3KGN1c3RvbSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBjdigpIHtcbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSkpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTWl4ZXMgaW4gdGhlIG1vZHVsZXMgc3BlY2lmaWVkIGluIHRoZSBjdXN0b20gYXBwbGljYXRpb24gb2JqZWN0XG4gICAqIEBwYXJhbSBzb3VyY2VPYmplY3RcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBidWlsZEZyb21NaXhpbnMoc291cmNlT2JqZWN0KSB7XG4gICAgdmFyIG1peGlucztcblxuICAgIGlmIChzb3VyY2VPYmplY3QubWl4aW5zKSB7XG4gICAgICBtaXhpbnMgPSBzb3VyY2VPYmplY3QubWl4aW5zO1xuICAgIH1cblxuICAgIG1peGlucy5wdXNoKHNvdXJjZU9iamVjdCk7XG4gICAgcmV0dXJuIGFzc2lnbkFycmF5KHt9LCBtaXhpbnMpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBjb25maWcgICAgICAgICAgIDogZ2V0Q29uZmlnLFxuICAgIGRpc3BhdGNoZXIgICAgICAgOiBnZXREaXNwYXRjaGVyLFxuICAgIHJvdXRlciAgICAgICAgICAgOiBnZXRSb3V0ZXIsXG4gICAgY3JlYXRlQXBwbGljYXRpb246IGNyZWF0ZUFwcGxpY2F0aW9uLFxuICAgIGNyZWF0ZVN0b3JlICAgICAgOiBjcmVhdGVTdG9yZSxcbiAgICBjcmVhdGVWaWV3ICAgICAgIDogY3JlYXRlVmlldyxcbiAgICBidWlsZEZyb21NaXhpbnMgIDogYnVpbGRGcm9tTWl4aW5zLFxuICAgIGdldEN1cnJlbnRSb3V0ZSAgOiBnZXRDdXJyZW50Um91dGUsXG4gICAgYXNzaWduQXJyYXkgICAgICA6IGFzc2lnbkFycmF5XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaSgpO1xuXG5cbiIsIi8qIEBmbG93IHdlYWsgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIENIQU5HRV9TVE9SRV9TVEFURTogJ0NIQU5HRV9TVE9SRV9TVEFURSdcbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIEFjdGlvbiBDcmVhdG9yXG4gKiBCYXNlZCBvbiBGbHV4IEFjdGlvbnNcbiAqIEZvciBtb3JlIGluZm9ybWF0aW9uIGFuZCBndWlkZWxpbmVzOiBodHRwczovL2dpdGh1Yi5jb20vYWNkbGl0ZS9mbHV4LXN0YW5kYXJkLWFjdGlvblxuICovXG52YXIgX25vcmlBY3Rpb25Db25zdGFudHMgPSByZXF1aXJlKCcuL0FjdGlvbkNvbnN0YW50cy5qcycpO1xuXG52YXIgTm9yaUFjdGlvbkNyZWF0b3IgPSB7XG5cbiAgY2hhbmdlU3RvcmVTdGF0ZTogZnVuY3Rpb24gKGRhdGEsIGlkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9ub3JpQWN0aW9uQ29uc3RhbnRzLkNIQU5HRV9TVE9SRV9TVEFURSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgaWQgIDogaWQsXG4gICAgICAgIGRhdGE6IGRhdGFcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaUFjdGlvbkNyZWF0b3I7IiwiLyogQGZsb3cgd2VhayAqL1xuXG52YXIgU29ja2V0SU9Db25uZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICA9IG5ldyBSeC5CZWhhdmlvclN1YmplY3QoKSxcbiAgICAgIF9zb2NrZXRJTyA9IGlvKCksXG4gICAgICBfbG9nICAgICAgPSBbXSxcbiAgICAgIF9jb25uZWN0aW9uSUQsXG4gICAgICBfZXZlbnRzICAgPSByZXF1aXJlKCcuL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIF9zb2NrZXRJTy5vbihfZXZlbnRzLk5PVElGWV9DTElFTlQsIG9uTm90aWZ5Q2xpZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgbm90aWZpY2F0aW9ucyBmcm9tIFNvY2tldC5pbyBjb21lIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWQge3R5cGUsIGlkLCB0aW1lLCBwYXlsb2FkfVxuICAgKi9cbiAgZnVuY3Rpb24gb25Ob3RpZnlDbGllbnQocGF5bG9hZCkge1xuICAgIF9sb2cucHVzaChwYXlsb2FkKTtcblxuICAgIGlmIChwYXlsb2FkLnR5cGUgPT09IF9ldmVudHMuUElORykge1xuICAgICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUE9ORywge30pO1xuICAgIH0gZWxzZSBpZiAocGF5bG9hZC50eXBlID09PSBfZXZlbnRzLlBPTkcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTT0NLRVQuSU8gUE9ORyEnKTtcbiAgICB9IGVsc2UgaWYgKHBheWxvYWQudHlwZSA9PT0gX2V2ZW50cy5DT05ORUNUKSB7XG4gICAgICBfY29ubmVjdGlvbklEID0gcGF5bG9hZC5pZDtcbiAgICB9XG4gICAgbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCk7XG4gIH1cblxuICBmdW5jdGlvbiBwaW5nKCkge1xuICAgIG5vdGlmeVNlcnZlcihfZXZlbnRzLlBJTkcsIHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgY29tbXVuaWNhdGlvbnMgdG8gdGhlIHNlcnZlciBzaG91bGQgZ28gdGhyb3VnaCBoZXJlXG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTZXJ2ZXIodHlwZSwgcGF5bG9hZCkge1xuICAgIF9zb2NrZXRJTy5lbWl0KF9ldmVudHMuTk9USUZZX1NFUlZFUiwge1xuICAgICAgdHlwZSAgICAgICAgOiB0eXBlLFxuICAgICAgY29ubmVjdGlvbklEOiBfY29ubmVjdGlvbklELFxuICAgICAgcGF5bG9hZCAgICAgOiBwYXlsb2FkXG4gICAgfSk7XG4gIH1cblxuICAvL2Z1bmN0aW9uIGVtaXQobWVzc2FnZSwgcGF5bG9hZCkge1xuICAvLyAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgX2V2ZW50cy5NRVNTQUdFO1xuICAvLyAgcGF5bG9hZCA9IHBheWxvYWQgfHwge307XG4gIC8vICBfc29ja2V0SU8uZW1pdChtZXNzYWdlLCBwYXlsb2FkKTtcbiAgLy99XG4gIC8vXG4gIC8vZnVuY3Rpb24gb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgLy8gIF9zb2NrZXRJTy5vbihldmVudCwgaGFuZGxlcik7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgaGFuZGxlciB0byB1cGRhdGVzXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3N1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBmcm9tIHVwZGF0ZSBvciB3aGF0ZXZlciBmdW5jdGlvbiB0byBkaXNwYXRjaCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIF9zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBsYXN0IHBheWxvYWQgdGhhdCB3YXMgZGlzcGF0Y2hlZCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExhc3ROb3RpZmljYXRpb24oKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LmdldFZhbHVlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRFdmVudENvbnN0YW50cygpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sIF9ldmVudHMpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBldmVudHMgICAgICAgICAgICAgOiBnZXRFdmVudENvbnN0YW50cyxcbiAgICBpbml0aWFsaXplICAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHBpbmcgICAgICAgICAgICAgICA6IHBpbmcsXG4gICAgbm90aWZ5U2VydmVyICAgICAgIDogbm90aWZ5U2VydmVyLFxuICAgIHN1YnNjcmliZSAgICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVycyAgOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRMYXN0Tm90aWZpY2F0aW9uOiBnZXRMYXN0Tm90aWZpY2F0aW9uXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU29ja2V0SU9Db25uZWN0b3IoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBQSU5HICAgICAgICAgICAgIDogJ3BpbmcnLFxuICBQT05HICAgICAgICAgICAgIDogJ3BvbmcnLFxuICBOT1RJRllfQ0xJRU5UICAgIDogJ25vdGlmeV9jbGllbnQnLFxuICBOT1RJRllfU0VSVkVSICAgIDogJ25vdGlmeV9zZXJ2ZXInLFxuICBDT05ORUNUICAgICAgICAgIDogJ2Nvbm5lY3QnLFxuICBEUk9QUEVEICAgICAgICAgIDogJ2Ryb3BwZWQnLFxuICBVU0VSX0NPTk5FQ1RFRCAgIDogJ3VzZXJfY29ubmVjdGVkJyxcbiAgVVNFUl9ESVNDT05ORUNURUQ6ICd1c2VyX2Rpc2Nvbm5lY3RlZCcsXG4gIEVNSVQgICAgICAgICAgICAgOiAnZW1pdCcsXG4gIEJST0FEQ0FTVCAgICAgICAgOiAnYnJvYWRjYXN0JyxcbiAgU1lTVEVNX01FU1NBR0UgICA6ICdzeXN0ZW1fbWVzc2FnZScsXG4gIE1FU1NBR0UgICAgICAgICAgOiAnbWVzc2FnZScsXG4gIENSRUFURV9ST09NICAgICAgOiAnY3JlYXRlX3Jvb20nLFxuICBKT0lOX1JPT00gICAgICAgIDogJ2pvaW5fcm9vbScsXG4gIExFQVZFX1JPT00gICAgICAgOiAnbGVhdmVfcm9vbScsXG4gIEdBTUVfU1RBUlQgICAgICAgOiAnZ2FtZV9zdGFydCcsXG4gIEdBTUVfRU5EICAgICAgICAgOiAnZ2FtZV9lbmQnXG59OyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBXcmFwcyBJbW11dGFibGUuanMncyBNYXAgaW4gdGhlIHNhbWUgc3ludGF4IGFzIHRoZSBTaW1wbGVTdG9yZSBtb2R1bGVcbiAqXG4gKiBWaWV3IERvY3MgaHR0cDovL2ZhY2Vib29rLmdpdGh1Yi5pby9pbW11dGFibGUtanMvZG9jcy8jL01hcFxuICovXG5cbnZhciBpbW11dGFibGUgPSByZXF1aXJlKCcuLi8uLi92ZW5kb3IvaW1tdXRhYmxlLm1pbi5qcycpO1xuXG52YXIgSW1tdXRhYmxlTWFwID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX21hcCA9IGltbXV0YWJsZS5NYXAoKTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgTWFwIG9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE1hcCgpIHtcbiAgICByZXR1cm4gX21hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBzdGF0ZVxuICAgKiBAcmV0dXJucyB7dm9pZHwqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gICAgcmV0dXJuIF9tYXAudG9KUygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBuZXh0XG4gICAqL1xuICBmdW5jdGlvbiBzZXRTdGF0ZShuZXh0KSB7XG4gICAgX21hcCA9IF9tYXAubWVyZ2UobmV4dCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGdldFN0YXRlOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZTogc2V0U3RhdGUsXG4gICAgZ2V0TWFwICA6IGdldE1hcFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEltbXV0YWJsZU1hcDsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gZm9yIE5vcmkgc3RvcmVzIHRvIGFkZCBmdW5jdGlvbmFsaXR5IHNpbWlsYXIgdG8gUmVkdXgnIFJlZHVjZXIgYW5kIHNpbmdsZVxuICogb2JqZWN0IHN0YXRlIHRyZWUgY29uY2VwdC4gTWl4aW4gc2hvdWxkIGJlIGNvbXBvc2VkIHRvIG5vcmkvc3RvcmUvQXBwbGljYXRpb25TdG9yZVxuICogZHVyaW5nIGNyZWF0aW9uIG9mIG1haW4gQXBwU3RvcmVcbiAqXG4gKiBodHRwczovL2dhZWFyb24uZ2l0aHViLmlvL3JlZHV4L2RvY3MvYXBpL1N0b3JlLmh0bWxcbiAqIGh0dHBzOi8vZ2FlYXJvbi5naXRodWIuaW8vcmVkdXgvZG9jcy9iYXNpY3MvUmVkdWNlcnMuaHRtbFxuICpcbiAqIENyZWF0ZWQgOC8xMy8xNVxuICovXG52YXIgTWl4aW5SZWR1Y2VyU3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyxcbiAgICAgIF9zdGF0ZSxcbiAgICAgIF9zdGF0ZVJlZHVjZXJzID0gW107XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIF9zdGF0ZSBtaWdodCBub3QgZXhpc3QgaWYgc3Vic2NyaWJlcnMgYXJlIGFkZGVkIGJlZm9yZSB0aGlzIHN0b3JlIGlzIGluaXRpYWxpemVkXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICBpZiAoX3N0YXRlKSB7XG4gICAgICByZXR1cm4gX3N0YXRlLmdldFN0YXRlKCk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFN0YXRlKHN0YXRlKSB7XG4gICAgaWYgKCFfLmlzRXF1YWwoc3RhdGUsIF9zdGF0ZSkpIHtcbiAgICAgIF9zdGF0ZS5zZXRTdGF0ZShzdGF0ZSk7XG4gICAgICBfdGhpcy5ub3RpZnlTdWJzY3JpYmVycyh7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0UmVkdWNlcnMocmVkdWNlckFycmF5KSB7XG4gICAgX3N0YXRlUmVkdWNlcnMgPSByZWR1Y2VyQXJyYXk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRSZWR1Y2VyKHJlZHVjZXIpIHtcbiAgICBfc3RhdGVSZWR1Y2Vycy5wdXNoKHJlZHVjZXIpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0XG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgZXZlbnQgbGlzdGVuZXIvcmVjZWl2ZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKSB7XG4gICAgaWYgKCF0aGlzLmNyZWF0ZVN1YmplY3QpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZSBuZWVkcyBub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QgdG8gbm90aWZ5Jyk7XG4gICAgfVxuXG4gICAgX3RoaXMgID0gdGhpcztcbiAgICBfc3RhdGUgPSByZXF1aXJlKCcuL0ltbXV0YWJsZU1hcC5qcycpKCk7XG5cbiAgICBpZiAoIV9zdGF0ZVJlZHVjZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZHVjZXJTdG9yZSwgbXVzdCBzZXQgYSByZWR1Y2VyIGJlZm9yZSBpbml0aWFsaXphdGlvbicpO1xuICAgIH1cblxuICAgIC8vIFNldCBpbml0aWFsIHN0YXRlIGZyb20gZW1wdHkgZXZlbnRcbiAgICBhcHBseVJlZHVjZXJzKHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSB0aGUgYWN0aW9uIG9iamVjdCB0byB0aGUgcmVkdWNlcnMgdG8gY2hhbmdlIHN0YXRlXG4gICAqIGFyZSBzZW50IHRvIGFsbCByZWR1Y2VycyB0byB1cGRhdGUgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25PYmplY3RcbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5KGFjdGlvbk9iamVjdCkge1xuICAgIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KSB7XG4gICAgdmFyIG5leHRTdGF0ZSA9IGFwcGx5UmVkdWNlcnNUb1N0YXRlKGdldFN0YXRlKCksIGFjdGlvbk9iamVjdCk7XG4gICAgc2V0U3RhdGUobmV4dFN0YXRlKTtcbiAgICBfdGhpcy5oYW5kbGVTdGF0ZU11dGF0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogQVBJIGhvb2sgdG8gaGFuZGxlIHN0YXRlIHVwZGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlTXV0YXRpb24oKSB7XG4gICAgLy8gb3ZlcnJpZGUgdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgc3RhdGUgZnJvbSB0aGUgY29tYmluZWQgcmVkdWNlcyBhbmQgYWN0aW9uIG9iamVjdFxuICAgKiBTdG9yZSBzdGF0ZSBpc24ndCBtb2RpZmllZCwgY3VycmVudCBzdGF0ZSBpcyBwYXNzZWQgaW4gYW5kIG11dGF0ZWQgc3RhdGUgcmV0dXJuZWRcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25cbiAgICogQHJldHVybnMgeyp8e319XG4gICAqL1xuICBmdW5jdGlvbiBhcHBseVJlZHVjZXJzVG9TdGF0ZShzdGF0ZSwgYWN0aW9uKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICAvLyBUT0RPIHNob3VsZCB0aGlzIGFjdHVhbGx5IHVzZSBhcnJheS5yZWR1Y2UoKT9cbiAgICBfc3RhdGVSZWR1Y2Vycy5mb3JFYWNoKGZ1bmN0aW9uIGFwcGx5U3RhdGVSZWR1Y2VyRnVuY3Rpb24ocmVkdWNlckZ1bmMpIHtcbiAgICAgIHN0YXRlID0gcmVkdWNlckZ1bmMoc3RhdGUsIGFjdGlvbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlbXBsYXRlIHJlZHVjZXIgZnVuY3Rpb25cbiAgICogU3RvcmUgc3RhdGUgaXNuJ3QgbW9kaWZpZWQsIGN1cnJlbnQgc3RhdGUgaXMgcGFzc2VkIGluIGFuZCBtdXRhdGVkIHN0YXRlIHJldHVybmVkXG5cbiAgIGZ1bmN0aW9uIHRlbXBsYXRlUmVkdWNlckZ1bmN0aW9uKHN0YXRlLCBldmVudCkge1xuICAgICAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcbiAgICAgICAgICBjYXNlIF9ub3JpQWN0aW9uQ29uc3RhbnRzLk1PREVMX0RBVEFfQ0hBTkdFRDpcbiAgICAgICAgICAgIC8vIGNhbiBjb21wb3NlIG90aGVyIHJlZHVjZXJzXG4gICAgICAgICAgICAvLyByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIG90aGVyU3RhdGVUcmFuc2Zvcm1lcihzdGF0ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCB7cHJvcDogZXZlbnQucGF5bG9hZC52YWx1ZX0pO1xuICAgICAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1JlZHVjZXIgc3RvcmUsIHVuaGFuZGxlZCBldmVudCB0eXBlOiAnK2V2ZW50LnR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAqL1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZTogaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSxcbiAgICBnZXRTdGF0ZSAgICAgICAgICAgICAgOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZSAgICAgICAgICAgICAgOiBzZXRTdGF0ZSxcbiAgICBhcHBseSAgICAgICAgICAgICAgICAgOiBhcHBseSxcbiAgICBzZXRSZWR1Y2VycyAgICAgICAgICAgOiBzZXRSZWR1Y2VycyxcbiAgICBhZGRSZWR1Y2VyICAgICAgICAgICAgOiBhZGRSZWR1Y2VyLFxuICAgIGFwcGx5UmVkdWNlcnMgICAgICAgICA6IGFwcGx5UmVkdWNlcnMsXG4gICAgYXBwbHlSZWR1Y2Vyc1RvU3RhdGUgIDogYXBwbHlSZWR1Y2Vyc1RvU3RhdGUsXG4gICAgaGFuZGxlU3RhdGVNdXRhdGlvbiAgIDogaGFuZGxlU3RhdGVNdXRhdGlvblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluUmVkdWNlclN0b3JlKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKlxuIE1hdHQgUGVya2lucywgNi8xMi8xNVxuXG4gcHVibGlzaCBwYXlsb2FkIG9iamVjdFxuXG4ge1xuIHR5cGU6IEVWVF9UWVBFLFxuIHBheWxvYWQ6IHtcbiBrZXk6IHZhbHVlXG4gfVxuIH1cblxuICovXG52YXIgRGlzcGF0Y2hlciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3RNYXAgID0ge30sXG4gICAgICBfcmVjZWl2ZXJNYXAgPSB7fSxcbiAgICAgIF9pZCAgICAgICAgICA9IDAsXG4gICAgICBfbG9nICAgICAgICAgPSBbXSxcbiAgICAgIF9xdWV1ZSAgICAgICA9IFtdLFxuICAgICAgX3RpbWVyT2JzZXJ2YWJsZSxcbiAgICAgIF90aW1lclN1YnNjcmlwdGlvbixcbiAgICAgIF90aW1lclBhdXNhYmxlO1xuXG4gIC8qKlxuICAgKiBBZGQgYW4gZXZlbnQgYXMgb2JzZXJ2YWJsZVxuICAgKiBAcGFyYW0gZXZ0U3RyIEV2ZW50IG5hbWUgc3RyaW5nXG4gICAqIEBwYXJhbSBoYW5kbGVyIG9uTmV4dCgpIHN1YnNjcmlwdGlvbiBmdW5jdGlvblxuICAgKiBAcGFyYW0gb25jZU9yQ29udGV4dCBvcHRpb25hbCwgZWl0aGVyIHRoZSBjb250ZXh0IHRvIGV4ZWN1dGUgdGhlIGhhbmRlciBvciBvbmNlIGJvb2xcbiAgICogQHBhcmFtIG9uY2Ugd2lsbCBjb21wbGV0ZS9kaXNwb3NlIGFmdGVyIG9uZSBmaXJlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGV2dFN0ciwgaGFuZGxlciwgb25jZU9yQ29udGV4dCwgb25jZSkge1xuICAgIHZhciBoYW5kbGVyQ29udGV4dCA9IHdpbmRvdztcblxuICAgIC8vY29uc29sZS5sb2coJ2Rpc3BhdGNoZXIgc3Vic2NyaWJlJywgZXZ0U3RyLCBoYW5kbGVyLCBvbmNlT3JDb250ZXh0LCBvbmNlKTtcblxuICAgIGlmIChpcy5mYWxzZXkoZXZ0U3RyKSkge1xuICAgICAgY29uc29sZS53YXJuKCdEaXNwYXRjaGVyOiBGYXNsZXkgZXZlbnQgc3RyaW5nIHBhc3NlZCBmb3IgaGFuZGxlcicsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmIChpcy5mYWxzZXkoaGFuZGxlcikpIHtcbiAgICAgIGNvbnNvbGUud2FybignRGlzcGF0Y2hlcjogRmFzbGV5IGhhbmRsZXIgcGFzc2VkIGZvciBldmVudCBzdHJpbmcnLCBldnRTdHIpO1xuICAgIH1cblxuICAgIGlmIChvbmNlT3JDb250ZXh0IHx8IG9uY2VPckNvbnRleHQgPT09IGZhbHNlKSB7XG4gICAgICBpZiAob25jZU9yQ29udGV4dCA9PT0gdHJ1ZSB8fCBvbmNlT3JDb250ZXh0ID09PSBmYWxzZSkge1xuICAgICAgICBvbmNlID0gb25jZU9yQ29udGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhhbmRsZXJDb250ZXh0ID0gb25jZU9yQ29udGV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIV9zdWJqZWN0TWFwW2V2dFN0cl0pIHtcbiAgICAgIF9zdWJqZWN0TWFwW2V2dFN0cl0gPSBbXTtcbiAgICB9XG5cbiAgICB2YXIgc3ViamVjdCA9IG5ldyBSeC5TdWJqZWN0KCk7XG5cbiAgICBfc3ViamVjdE1hcFtldnRTdHJdLnB1c2goe1xuICAgICAgb25jZSAgICA6IG9uY2UsXG4gICAgICBwcmlvcml0eTogMCxcbiAgICAgIGhhbmRsZXIgOiBoYW5kbGVyLFxuICAgICAgY29udGV4dCA6IGhhbmRsZXJDb250ZXh0LFxuICAgICAgc3ViamVjdCA6IHN1YmplY3QsXG4gICAgICB0eXBlICAgIDogMFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIuYmluZChoYW5kbGVyQ29udGV4dCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdGhlIGV2ZW50IHByb2Nlc3NpbmcgdGltZXIgb3IgcmVzdW1lIGEgcGF1c2VkIHRpbWVyXG4gICAqL1xuICBmdW5jdGlvbiBpbml0VGltZXIoKSB7XG4gICAgaWYgKF90aW1lck9ic2VydmFibGUpIHtcbiAgICAgIF90aW1lclBhdXNhYmxlLm9uTmV4dCh0cnVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfdGltZXJQYXVzYWJsZSAgICAgPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIF90aW1lck9ic2VydmFibGUgICA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMSkucGF1c2FibGUoX3RpbWVyUGF1c2FibGUpO1xuICAgIF90aW1lclN1YnNjcmlwdGlvbiA9IF90aW1lck9ic2VydmFibGUuc3Vic2NyaWJlKHByb2Nlc3NOZXh0RXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNoaWZ0IG5leHQgZXZlbnQgdG8gaGFuZGxlIG9mZiBvZiB0aGUgcXVldWUgYW5kIGRpc3BhdGNoIGl0XG4gICAqL1xuICBmdW5jdGlvbiBwcm9jZXNzTmV4dEV2ZW50KCkge1xuICAgIHZhciBldnQgPSBfcXVldWUuc2hpZnQoKTtcbiAgICBpZiAoZXZ0KSB7XG4gICAgICBkaXNwYXRjaFRvUmVjZWl2ZXJzKGV2dCk7XG4gICAgICBkaXNwYXRjaFRvU3Vic2NyaWJlcnMoZXZ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX3RpbWVyUGF1c2FibGUub25OZXh0KGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHVzaCBldmVudCB0byB0aGUgc3RhY2sgYW5kIGJlZ2luIGV4ZWN1dGlvblxuICAgKiBAcGFyYW0gcGF5bG9hZE9iaiB0eXBlOlN0cmluZywgcGF5bG9hZDpkYXRhXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqL1xuICBmdW5jdGlvbiBwdWJsaXNoKHBheWxvYWRPYmopIHtcbiAgICBfbG9nLnB1c2gocGF5bG9hZE9iaik7XG4gICAgX3F1ZXVlLnB1c2gocGF5bG9hZE9iaik7XG5cbiAgICBpbml0VGltZXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIHRoZSBwYXlsb2FkIHRvIGFsbCByZWNlaXZlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIGRpc3BhdGNoVG9SZWNlaXZlcnMocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIF9yZWNlaXZlck1hcCkge1xuICAgICAgX3JlY2VpdmVyTWFwW2lkXS5oYW5kbGVyKHBheWxvYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVycyByZWNlaXZlIGFsbCBwYXlsb2FkcyBmb3IgYSBnaXZlbiBldmVudCB0eXBlIHdoaWxlIGhhbmRsZXJzIGFyZSB0YXJnZXRlZFxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2hUb1N1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBfc3ViamVjdE1hcFtwYXlsb2FkLnR5cGVdLCBpO1xuICAgIGlmICghc3Vic2NyaWJlcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdmFyIHN1YmpPYmogPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgIGlmIChzdWJqT2JqLnR5cGUgPT09IDApIHtcbiAgICAgICAgc3Viak9iai5zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJqT2JqLm9uY2UpIHtcbiAgICAgICAgdW5zdWJzY3JpYmUocGF5bG9hZC50eXBlLCBzdWJqT2JqLmhhbmRsZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBoYW5kbGVyXG4gICAqIEBwYXJhbSBldnRTdHJcbiAgICogQHBhcmFtIGhhbmRlclxuICAgKi9cbiAgZnVuY3Rpb24gdW5zdWJzY3JpYmUoZXZ0U3RyLCBoYW5kbGVyKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwW2V2dFN0cl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdWJzY3JpYmVycyA9IF9zdWJqZWN0TWFwW2V2dFN0cl0sXG4gICAgICAgIGhhbmRsZXJJZHggID0gLTE7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc3Vic2NyaWJlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzdWJzY3JpYmVyc1tpXS5oYW5kbGVyID09PSBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJJZHggICAgID0gaTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0uc3ViamVjdC5vbkNvbXBsZXRlZCgpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXS5zdWJqZWN0LmRpc3Bvc2UoKTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0gPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYW5kbGVySWR4ID09PSAtMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN1YnNjcmliZXJzLnNwbGljZShoYW5kbGVySWR4LCAxKTtcblxuICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlbGV0ZSBfc3ViamVjdE1hcFtldnRTdHJdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBsb2cgYXJyYXlcbiAgICogQHJldHVybnMge0FycmF5LjxUPn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExvZygpIHtcbiAgICByZXR1cm4gX2xvZy5zbGljZSgwKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNpbXBsZSByZWNlaXZlciBpbXBsZW1lbnRhdGlvbiBiYXNlZCBvbiBGbHV4XG4gICAqIFJlZ2lzdGVyZWQgcmVjZWl2ZXJzIHdpbGwgZ2V0IGV2ZXJ5IHB1Ymxpc2hlZCBldmVudFxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svZmx1eC9ibG9iL21hc3Rlci9zcmMvRGlzcGF0Y2hlci5qc1xuICAgKlxuICAgKiBVc2FnZTpcbiAgICpcbiAgICogX2Rpc3BhdGNoZXIucmVnaXN0ZXJSZWNlaXZlcihmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgICAgICogICAgY29uc29sZS5sb2coJ3JlY2VpdmluZywgJyxwYXlsb2FkKTtcbiAgICAgICAqIH0pO1xuICAgKlxuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXJSZWNlaXZlcihoYW5kbGVyKSB7XG4gICAgdmFyIGlkICAgICAgICAgICA9ICdJRF8nICsgX2lkKys7XG4gICAgX3JlY2VpdmVyTWFwW2lkXSA9IHtcbiAgICAgIGlkICAgICA6IGlkLFxuICAgICAgaGFuZGxlcjogaGFuZGxlclxuICAgIH07XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cblxuICAvKipcbiAgICogUmVtb3ZlIGEgcmVjZWl2ZXIgaGFuZGxlclxuICAgKiBAcGFyYW0gaWRcbiAgICovXG4gIGZ1bmN0aW9uIHVucmVnaXN0ZXJSZWNlaXZlcihpZCkge1xuICAgIGlmIChfcmVjZWl2ZXJNYXAuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICBkZWxldGUgX3JlY2VpdmVyTWFwW2lkXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1YnNjcmliZSAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIHVuc3Vic2NyaWJlICAgICAgIDogdW5zdWJzY3JpYmUsXG4gICAgcHVibGlzaCAgICAgICAgICAgOiBwdWJsaXNoLFxuICAgIGdldExvZyAgICAgICAgICAgIDogZ2V0TG9nLFxuICAgIHJlZ2lzdGVyUmVjZWl2ZXIgIDogcmVnaXN0ZXJSZWNlaXZlcixcbiAgICB1bnJlZ2lzdGVyUmVjZWl2ZXI6IHVucmVnaXN0ZXJSZWNlaXZlclxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXIoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWRkIFJ4SlMgU3ViamVjdCB0byBhIG1vZHVsZS5cbiAqXG4gKiBBZGQgb25lIHNpbXBsZSBvYnNlcnZhYmxlIHN1YmplY3Qgb3IgbW9yZSBjb21wbGV4IGFiaWxpdHkgdG8gY3JlYXRlIG90aGVycyBmb3JcbiAqIG1vcmUgY29tcGxleCBldmVudGluZyBuZWVkcy5cbiAqL1xudmFyIE1peGluT2JzZXJ2YWJsZVN1YmplY3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICAgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9zdWJqZWN0TWFwID0ge307XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBzdWJqZWN0XG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3ViamVjdChuYW1lKSB7XG4gICAgaWYgKCFfc3ViamVjdE1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgX3N1YmplY3RNYXBbbmFtZV0gPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gX3N1YmplY3RNYXBbbmFtZV07XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIGhhbmRsZXIgdG8gdXBkYXRlcy4gSWYgdGhlIGhhbmRsZXIgaXMgYSBzdHJpbmcsIHRoZSBuZXcgc3ViamVjdFxuICAgKiB3aWxsIGJlIGNyZWF0ZWQuXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXJPck5hbWUsIG9wdEhhbmRsZXIpIHtcbiAgICBpZiAoaXMuc3RyaW5nKGhhbmRsZXJPck5hbWUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3ViamVjdChoYW5kbGVyT3JOYW1lKS5zdWJzY3JpYmUob3B0SGFuZGxlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlck9yTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHVwZGF0ZWQgdG8gc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICBfc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBuYW1lZCBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnNPZihuYW1lLCBwYXlsb2FkKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXS5vbk5leHQocGF5bG9hZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignTWl4aW5PYnNlcnZhYmxlU3ViamVjdCwgbm8gc3Vic2NyaWJlcnMgb2YgJyArIG5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIGNyZWF0ZVN1YmplY3QgICAgICA6IGNyZWF0ZVN1YmplY3QsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnMgIDogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnNPZjogbm90aWZ5U3Vic2NyaWJlcnNPZlxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluT2JzZXJ2YWJsZVN1YmplY3Q7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFV0aWxpdHkgdG8gaGFuZGxlIGFsbCB2aWV3IERPTSBhdHRhY2htZW50IHRhc2tzXG4gKi9cblxudmFyIFJlbmRlcmVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX2RvbVV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiByZW5kZXIocGF5bG9hZCkge1xuICAgIHZhciB0YXJnZXRTZWxlY3RvciA9IHBheWxvYWQudGFyZ2V0LFxuICAgICAgICBodG1sICAgICAgICAgICA9IHBheWxvYWQuaHRtbCxcbiAgICAgICAgZG9tRWwsXG4gICAgICAgIG1vdW50UG9pbnQgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXRTZWxlY3RvciksXG4gICAgICAgIGNiICAgICAgICAgICAgID0gcGF5bG9hZC5jYWxsYmFjaztcblxuICAgIG1vdW50UG9pbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBpZiAoaHRtbCkge1xuICAgICAgZG9tRWwgPSBfZG9tVXRpbHMuSFRNTFN0clRvTm9kZShodG1sKTtcbiAgICAgIG1vdW50UG9pbnQuYXBwZW5kQ2hpbGQoZG9tRWwpO1xuICAgIH1cblxuICAgIGlmIChjYikge1xuICAgICAgY2IoZG9tRWwpO1xuICAgIH1cblxuICAgIHJldHVybiBkb21FbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcmVuZGVyOiByZW5kZXJcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZW5kZXJlcigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBTaW1wbGUgcm91dGVyXG4gKiBTdXBwb3J0aW5nIElFOSBzbyB1c2luZyBoYXNoZXMgaW5zdGVhZCBvZiB0aGUgaGlzdG9yeSBBUEkgZm9yIG5vd1xuICovXG5cbnZhciBSb3V0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICA9IG5ldyBSeC5TdWJqZWN0KCksXG4gICAgICBfaGFzaENoYW5nZU9ic2VydmFibGUsXG4gICAgICBfb2JqVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29yZS9PYmplY3RVdGlscy5qcycpO1xuXG4gIC8qKlxuICAgKiBTZXQgZXZlbnQgaGFuZGxlcnNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG4gICAgX2hhc2hDaGFuZ2VPYnNlcnZhYmxlID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQod2luZG93LCAnaGFzaGNoYW5nZScpLnN1YnNjcmliZShub3RpZnlTdWJzY3JpYmVycyk7XG4gIH1cblxuICAvKipcbiAgICogc3Vic2NyaWJlIGEgaGFuZGxlciB0byB0aGUgdXJsIGNoYW5nZSBldmVudHNcbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlcikge1xuICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogTm90aWZ5IG9mIGEgY2hhbmdlIGluIHJvdXRlXG4gICAqIEBwYXJhbSBmcm9tQXBwIFRydWUgaWYgdGhlIHJvdXRlIHdhcyBjYXVzZWQgYnkgYW4gYXBwIGV2ZW50IG5vdCBVUkwgb3IgaGlzdG9yeSBjaGFuZ2VcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKCkge1xuICAgIHZhciBldmVudFBheWxvYWQgPSB7XG4gICAgICByb3V0ZU9iajogZ2V0Q3VycmVudFJvdXRlKCksIC8vIHsgcm91dGU6LCBkYXRhOiB9XG4gICAgICBmcmFnbWVudDogZ2V0VVJMRnJhZ21lbnQoKVxuICAgIH07XG5cbiAgICBfc3ViamVjdC5vbk5leHQoZXZlbnRQYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIHJvdXRlIGFuZCBxdWVyeSBzdHJpbmcgZnJvbSB0aGUgY3VycmVudCBVUkwgZnJhZ21lbnRcbiAgICogQHJldHVybnMge3tyb3V0ZTogc3RyaW5nLCBxdWVyeToge319fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFJvdXRlKCkge1xuICAgIHZhciBmcmFnbWVudCAgICA9IGdldFVSTEZyYWdtZW50KCksXG4gICAgICAgIHBhcnRzICAgICAgID0gZnJhZ21lbnQuc3BsaXQoJz8nKSxcbiAgICAgICAgcm91dGUgICAgICAgPSAnLycgKyBwYXJ0c1swXSxcbiAgICAgICAgcXVlcnlTdHIgICAgPSBkZWNvZGVVUklDb21wb25lbnQocGFydHNbMV0pLFxuICAgICAgICBxdWVyeVN0ck9iaiA9IHBhcnNlUXVlcnlTdHIocXVlcnlTdHIpO1xuXG4gICAgaWYgKHF1ZXJ5U3RyID09PSAnPXVuZGVmaW5lZCcpIHtcbiAgICAgIHF1ZXJ5U3RyT2JqID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtyb3V0ZTogcm91dGUsIGRhdGE6IHF1ZXJ5U3RyT2JqfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgYSBxdWVyeSBzdHJpbmcgaW50byBrZXkvdmFsdWUgcGFpcnNcbiAgICogQHBhcmFtIHF1ZXJ5U3RyXG4gICAqIEByZXR1cm5zIHt7fX1cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlUXVlcnlTdHIocXVlcnlTdHIpIHtcbiAgICB2YXIgb2JqICAgPSB7fSxcbiAgICAgICAgcGFydHMgPSBxdWVyeVN0ci5zcGxpdCgnJicpO1xuXG4gICAgcGFydHMuZm9yRWFjaChmdW5jdGlvbiAocGFpclN0cikge1xuICAgICAgdmFyIHBhaXJBcnIgICAgID0gcGFpclN0ci5zcGxpdCgnPScpO1xuICAgICAgb2JqW3BhaXJBcnJbMF1dID0gcGFpckFyclsxXTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQ29tYmluZXMgYSByb3V0ZSBhbmQgZGF0YSBvYmplY3QgaW50byBhIHByb3BlciBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcm91dGVcbiAgICogQHBhcmFtIGRhdGFPYmpcbiAgICovXG4gIGZ1bmN0aW9uIHNldChyb3V0ZSwgZGF0YU9iaikge1xuICAgIHZhciBwYXRoID0gcm91dGUsXG4gICAgICAgIGRhdGEgPSBbXTtcbiAgICBpZiAoIV9vYmpVdGlscy5pc051bGwoZGF0YU9iaikpIHtcbiAgICAgIHBhdGggKz0gXCI/XCI7XG4gICAgICBmb3IgKHZhciBwcm9wIGluIGRhdGFPYmopIHtcbiAgICAgICAgaWYgKHByb3AgIT09ICd1bmRlZmluZWQnICYmIGRhdGFPYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICBkYXRhLnB1c2gocHJvcCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChkYXRhT2JqW3Byb3BdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHBhdGggKz0gZGF0YS5qb2luKCcmJyk7XG4gICAgfVxuXG4gICAgdXBkYXRlVVJMRnJhZ21lbnQocGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBldmVyeXRoaW5nIGFmdGVyIHRoZSAnd2hhdGV2ZXIuaHRtbCMnIGluIHRoZSBVUkxcbiAgICogTGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyBhcmUgcmVtb3ZlZFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VVJMRnJhZ21lbnQoKSB7XG4gICAgdmFyIGZyYWdtZW50ID0gbG9jYXRpb24uaGFzaC5zbGljZSgxKTtcbiAgICByZXR1cm4gZnJhZ21lbnQudG9TdHJpbmcoKS5yZXBsYWNlKC9cXC8kLywgJycpLnJlcGxhY2UoL15cXC8vLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcGF0aFxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlVVJMRnJhZ21lbnQocGF0aCkge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICA6IGluaXRpYWxpemUsXG4gICAgc3Vic2NyaWJlICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVyczogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBzZXQgICAgICAgICAgICAgIDogc2V0XG4gIH07XG5cbn07XG5cbnZhciByID0gUm91dGVyKCk7XG5yLmluaXRpYWxpemUoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBSeEpTIEhlbHBlcnNcbiAqIEB0eXBlIHt7ZG9tOiBGdW5jdGlvbiwgZnJvbTogRnVuY3Rpb24sIGludGVydmFsOiBGdW5jdGlvbiwgZG9FdmVyeTogRnVuY3Rpb24sIGp1c3Q6IEZ1bmN0aW9uLCBlbXB0eTogRnVuY3Rpb259fVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBkb206IGZ1bmN0aW9uIChzZWxlY3RvciwgZXZlbnQpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBpZiAoIWVsKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ25vcmkvdXRpbHMvUngsIGRvbSwgaW52YWxpZCBET00gc2VsZWN0b3I6ICcgKyBzZWxlY3Rvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChlbCwgZXZlbnQudHJpbSgpKTtcbiAgfSxcblxuICBmcm9tOiBmdW5jdGlvbiAoaXR0cikge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb20oaXR0cik7XG4gIH0sXG5cbiAgaW50ZXJ2YWw6IGZ1bmN0aW9uIChtcykge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmludGVydmFsKG1zKTtcbiAgfSxcblxuICBkb0V2ZXJ5OiBmdW5jdGlvbiAobXMsIC4uLmFyZ3MpIHtcbiAgICBpZihpcy5mdW5jdGlvbihhcmdzWzBdKSkge1xuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnN1YnNjcmliZShhcmdzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnRha2UoYXJnc1swXSkuc3Vic2NyaWJlKGFyZ3NbMV0pO1xuICB9LFxuXG4gIGp1c3Q6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmp1c3QodmFsdWUpO1xuICB9LFxuXG4gIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZW1wdHkoKTtcbiAgfVxuXG59OyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLypcbiBTaW1wbGUgd3JhcHBlciBmb3IgVW5kZXJzY29yZSAvIEhUTUwgdGVtcGxhdGVzXG4gTWF0dCBQZXJraW5zXG4gNC83LzE1XG4gKi9cbnZhciBUZW1wbGF0aW5nID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGVtcGxhdGVNYXAgICAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX3RlbXBsYXRlSFRNTENhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF90ZW1wbGF0ZUNhY2hlICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfRE9NVXRpbHMgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIGFkZFRlbXBsYXRlKGlkLCBodG1sKSB7XG4gICAgX3RlbXBsYXRlTWFwW2lkXSA9IGh0bWw7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTb3VyY2VGcm9tVGVtcGxhdGVNYXAoaWQpIHtcbiAgICB2YXIgc291cmNlID0gX3RlbXBsYXRlTWFwW2lkXTtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gY2xlYW5UZW1wbGF0ZUhUTUwoc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U291cmNlRnJvbUhUTUwoaWQpIHtcbiAgICB2YXIgc3JjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpLFxuICAgICAgICBzcmNodG1sO1xuXG4gICAgaWYgKHNyYykge1xuICAgICAgc3JjaHRtbCA9IHNyYy5pbm5lckhUTUw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignbnVkb3J1L2NvcmUvVGVtcGxhdGluZywgdGVtcGxhdGUgbm90IGZvdW5kOiBcIicgKyBpZCArICdcIicpO1xuICAgICAgc3JjaHRtbCA9ICc8ZGl2PlRlbXBsYXRlIG5vdCBmb3VuZDogJyArIGlkICsgJzwvZGl2Pic7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFuVGVtcGxhdGVIVE1MKHNyY2h0bWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdGVtcGxhdGUgaHRtbCBmcm9tIHRoZSBzY3JpcHQgdGFnIHdpdGggaWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U291cmNlKGlkKSB7XG4gICAgaWYgKF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdO1xuICAgIH1cblxuICAgIHZhciBzb3VyY2VodG1sID0gZ2V0U291cmNlRnJvbVRlbXBsYXRlTWFwKGlkKTtcblxuICAgIGlmICghc291cmNlaHRtbCkge1xuICAgICAgc291cmNlaHRtbCA9IGdldFNvdXJjZUZyb21IVE1MKGlkKTtcbiAgICB9XG5cbiAgICBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdID0gc291cmNlaHRtbDtcbiAgICByZXR1cm4gc291cmNlaHRtbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCBJRHMgYmVsb25naW5nIHRvIHRleHQvdGVtcGxhdGUgdHlwZSBzY3JpcHQgdGFnc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRBbGxUZW1wbGF0ZUlEcygpIHtcbiAgICB2YXIgc2NyaXB0VGFncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgMCk7XG5cbiAgICByZXR1cm4gc2NyaXB0VGFncy5maWx0ZXIoZnVuY3Rpb24gKHRhZykge1xuICAgICAgcmV0dXJuIHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gJ3RleHQvdGVtcGxhdGUnO1xuICAgIH0pLm1hcChmdW5jdGlvbiAodGFnKSB7XG4gICAgICByZXR1cm4gdGFnLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIHVuZGVyc2NvcmUgdGVtcGxhdGVcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VGVtcGxhdGUoaWQpIHtcbiAgICBpZiAoX3RlbXBsYXRlQ2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gX3RlbXBsYXRlQ2FjaGVbaWRdO1xuICAgIH1cbiAgICB2YXIgdGVtcGwgICAgICAgICAgPSBfLnRlbXBsYXRlKGdldFNvdXJjZShpZCkpO1xuICAgIF90ZW1wbGF0ZUNhY2hlW2lkXSA9IHRlbXBsO1xuICAgIHJldHVybiB0ZW1wbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIEhUTUxcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0hUTUwoaWQsIG9iaikge1xuICAgIHZhciB0ZW1wID0gZ2V0VGVtcGxhdGUoaWQpO1xuICAgIHJldHVybiB0ZW1wKG9iaik7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSBhbmQgcmV0dXJucyBhbiBIVE1MIEVsZW1lbnRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0VsZW1lbnQoaWQsIG9iaikge1xuICAgIHJldHVybiBfRE9NVXRpbHMuSFRNTFN0clRvTm9kZShhc0hUTUwoaWQsIG9iaikpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFucyB0ZW1wbGF0ZSBIVE1MXG4gICAqL1xuICBmdW5jdGlvbiBjbGVhblRlbXBsYXRlSFRNTChzdHIpIHtcbiAgICByZXR1cm4gc3RyLnRyaW0oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgcmV0dXJucywgc3BhY2VzIGFuZCB0YWJzXG4gICAqIEBwYXJhbSBzdHJcbiAgICogQHJldHVybnMge1hNTHxzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVXaGl0ZVNwYWNlKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyfFxcdCkvZ20sICcnKS5yZXBsYWNlKC8+XFxzKzwvZywgJz48Jyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGFsbCB0ZW1wbGF0ZXMsIGNsZWFuIHRoZW0gdXAgYW5kIGxvZ1xuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogU28gdGhpcyBoZWxwcyBjcmVhdGUgdGhlIGJsb2NrcyBmb3IgaW5zZXJ0aW9uIGluIHRvIHRoZSBET01cbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NGb3JET01JbnNlcnRpb24oKSB7XG4gICAgdmFyIGlkcyA9IGdldEFsbFRlbXBsYXRlSURzKCk7XG4gICAgaWRzLmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICB2YXIgc3JjID0gcmVtb3ZlV2hpdGVTcGFjZShnZXRTb3VyY2UoaWQpKTtcbiAgICAgIGNvbnNvbGUubG9nKGlkLCBzcmMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHRlbXBsYXRlIHNjcmlwdCB0YWcgdG8gdGhlIERPTVxuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBodG1sXG4gICAqL1xuICAvL2Z1bmN0aW9uIGFkZENsaWVudFNpZGVUZW1wbGF0ZVRvRE9NKGlkLCBodG1sKSB7XG4gIC8vICB2YXIgcyAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAvLyAgcy50eXBlICAgICAgPSAndGV4dC90ZW1wbGF0ZSc7XG4gIC8vICBzLmlkICAgICAgICA9IGlkO1xuICAvLyAgcy5pbm5lckhUTUwgPSBodG1sO1xuICAvLyAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChzKTtcbiAgLy99XG5cbiAgcmV0dXJuIHtcbiAgICBhZGRUZW1wbGF0ZSAgICAgICAgICAgOiBhZGRUZW1wbGF0ZSxcbiAgICBnZXRTb3VyY2UgICAgICAgICAgICAgOiBnZXRTb3VyY2UsXG4gICAgZ2V0QWxsVGVtcGxhdGVJRHMgICAgIDogZ2V0QWxsVGVtcGxhdGVJRHMsXG4gICAgcHJvY2Vzc0ZvckRPTUluc2VydGlvbjogcHJvY2Vzc0ZvckRPTUluc2VydGlvbixcbiAgICBnZXRUZW1wbGF0ZSAgICAgICAgICAgOiBnZXRUZW1wbGF0ZSxcbiAgICBhc0hUTUwgICAgICAgICAgICAgICAgOiBhc0hUTUwsXG4gICAgYXNFbGVtZW50ICAgICAgICAgICAgIDogYXNFbGVtZW50XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGluZygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxudmFyIEFwcGxpY2F0aW9uVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3RoaXMsXG4gICAgICBfdGVtcGxhdGUgPSByZXF1aXJlKCcuLi91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfZG9tVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgSW5pdGlhbGl6YXRpb25cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVcbiAgICogQHBhcmFtIHNjYWZmb2xkVGVtcGxhdGVzIHRlbXBsYXRlIElEcyB0byBhdHRhY2hlZCB0byB0aGUgYm9keSBmb3IgdGhlIGFwcFxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyhzY2FmZm9sZFRlbXBsYXRlcykge1xuICAgIF90aGlzID0gdGhpcztcblxuICAgIGF0dGFjaEFwcGxpY2F0aW9uU2NhZmZvbGRpbmcoc2NhZmZvbGRUZW1wbGF0ZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGFjaCBhcHAgSFRNTCBzdHJ1Y3R1cmVcbiAgICogQHBhcmFtIHRlbXBsYXRlc1xuICAgKi9cbiAgZnVuY3Rpb24gYXR0YWNoQXBwbGljYXRpb25TY2FmZm9sZGluZyh0ZW1wbGF0ZXMpIHtcbiAgICBpZiAoIXRlbXBsYXRlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBib2R5RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XG5cbiAgICB0ZW1wbGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAodGVtcGwpIHtcbiAgICAgIGJvZHlFbC5hcHBlbmRDaGlsZChfZG9tVXRpbHMuSFRNTFN0clRvTm9kZShfdGVtcGxhdGUuZ2V0U291cmNlKHRlbXBsLCB7fSkpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZnRlciBhcHAgaW5pdGlhbGl6YXRpb24sIHJlbW92ZSB0aGUgbG9hZGluZyBtZXNzYWdlXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVMb2FkaW5nTWVzc2FnZSgpIHtcbiAgICB2YXIgY292ZXIgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbml0aWFsaXphdGlvbl9fY292ZXInKSxcbiAgICAgICAgbWVzc2FnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5pbml0aWFsaXphdGlvbl9fbWVzc2FnZScpO1xuXG4gICAgVHdlZW5MaXRlLnRvKGNvdmVyLCAxLCB7XG4gICAgICBhbHBoYTogMCwgZWFzZTogUXVhZC5lYXNlT3V0LCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdmVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY292ZXIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHdlZW5MaXRlLnRvKG1lc3NhZ2UsIDIsIHtcbiAgICAgIHRvcDogXCIrPTUwcHhcIiwgZWFzZTogUXVhZC5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY292ZXIucmVtb3ZlQ2hpbGQobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXc6IGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcsXG4gICAgcmVtb3ZlTG9hZGluZ01lc3NhZ2UgICAgIDogcmVtb3ZlTG9hZGluZ01lc3NhZ2VcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvblZpZXcoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gdmlldyB0aGF0IGFsbG93cyBmb3IgY29tcG9uZW50IHZpZXdzXG4gKi9cblxudmFyIE1peGluQ29tcG9uZW50Vmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jb21wb25lbnRWaWV3TWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvKipcbiAgICogTWFwIGEgY29tcG9uZW50IHRvIGEgbW91bnRpbmcgcG9pbnQuIElmIGEgc3RyaW5nIGlzIHBhc3NlZCxcbiAgICogdGhlIGNvcnJlY3Qgb2JqZWN0IHdpbGwgYmUgY3JlYXRlZCBmcm9tIHRoZSBmYWN0b3J5IG1ldGhvZCwgb3RoZXJ3aXNlLFxuICAgKiB0aGUgcGFzc2VkIGNvbXBvbmVudCBvYmplY3QgaXMgdXNlZC5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqIEBwYXJhbSBtb3VudFBvaW50XG4gICAqL1xuICBmdW5jdGlvbiBtYXBWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBjb21wb25lbnRJRG9yT2JqLCBtb3VudFBvaW50KSB7XG4gICAgdmFyIGNvbXBvbmVudE9iajtcblxuICAgIGlmICh0eXBlb2YgY29tcG9uZW50SURvck9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBjb21wb25lbnRGYWN0b3J5ID0gcmVxdWlyZShjb21wb25lbnRJRG9yT2JqKTtcbiAgICAgIGNvbXBvbmVudE9iaiAgICAgICAgID0gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRGYWN0b3J5KCkpKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudE9iaiA9IGNvbXBvbmVudElEb3JPYmo7XG4gICAgfVxuXG4gICAgX2NvbXBvbmVudFZpZXdNYXBbY29tcG9uZW50SURdID0ge1xuICAgICAgY29udHJvbGxlcjogY29tcG9uZW50T2JqLFxuICAgICAgbW91bnRQb2ludDogbW91bnRQb2ludFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmFjdG9yeSB0byBjcmVhdGUgY29tcG9uZW50IHZpZXcgbW9kdWxlcyBieSBjb25jYXRpbmcgbXVsdGlwbGUgc291cmNlIG9iamVjdHNcbiAgICogQHBhcmFtIGNvbXBvbmVudFNvdXJjZSBDdXN0b20gbW9kdWxlIHNvdXJjZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudFZpZXcoY29tcG9uZW50U291cmNlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb21wb25lbnRWaWV3RmFjdG9yeSAgPSByZXF1aXJlKCcuL1ZpZXdDb21wb25lbnQuanMnKSxcbiAgICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkgPSByZXF1aXJlKCcuL01peGluRXZlbnREZWxlZ2F0b3IuanMnKSxcbiAgICAgICAgICBvYnNlcnZhYmxlRmFjdG9yeSAgICAgPSByZXF1aXJlKCcuLi91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyksXG4gICAgICAgICAgc3RhdGVPYmpGYWN0b3J5ICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvSW1tdXRhYmxlTWFwLmpzJyksXG4gICAgICAgICAgY29tcG9uZW50QXNzZW1ibHksIGZpbmFsQ29tcG9uZW50LCBwcmV2aW91c0luaXRpYWxpemU7XG5cbiAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gW1xuICAgICAgICBjb21wb25lbnRWaWV3RmFjdG9yeSgpLFxuICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkoKSxcbiAgICAgICAgb2JzZXJ2YWJsZUZhY3RvcnkoKSxcbiAgICAgICAgc3RhdGVPYmpGYWN0b3J5KCksXG4gICAgICAgIGNvbXBvbmVudFNvdXJjZVxuICAgICAgXTtcblxuICAgICAgaWYgKGNvbXBvbmVudFNvdXJjZS5taXhpbnMpIHtcbiAgICAgICAgY29tcG9uZW50QXNzZW1ibHkgPSBjb21wb25lbnRBc3NlbWJseS5jb25jYXQoY29tcG9uZW50U291cmNlLm1peGlucyk7XG4gICAgICB9XG5cbiAgICAgIGZpbmFsQ29tcG9uZW50ID0gTm9yaS5hc3NpZ25BcnJheSh7fSwgY29tcG9uZW50QXNzZW1ibHkpO1xuXG4gICAgICAvLyBDb21wb3NlIGEgbmV3IGluaXRpYWxpemUgZnVuY3Rpb24gYnkgaW5zZXJ0aW5nIGNhbGwgdG8gY29tcG9uZW50IHN1cGVyIG1vZHVsZVxuICAgICAgcHJldmlvdXNJbml0aWFsaXplICAgICAgICA9IGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemU7XG4gICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplID0gZnVuY3Rpb24gaW5pdGlhbGl6ZShpbml0T2JqKSB7XG4gICAgICAgIGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemVDb21wb25lbnQoaW5pdE9iaik7XG4gICAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZS5jYWxsKGZpbmFsQ29tcG9uZW50LCBpbml0T2JqKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgZmluYWxDb21wb25lbnQpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIG1hcHBlZCBjb21wb25lbnRWaWV3XG4gICAqIEBwYXJhbSBjb21wb25lbnRJRFxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1ZpZXdDb21wb25lbnQoY29tcG9uZW50SUQsIG1vdW50UG9pbnQpIHtcbiAgICB2YXIgY29tcG9uZW50VmlldyA9IF9jb21wb25lbnRWaWV3TWFwW2NvbXBvbmVudElEXTtcbiAgICBpZiAoIWNvbXBvbmVudFZpZXcpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gY29tcG9uZW50VmlldyBtYXBwZWQgZm9yIGlkOiAnICsgY29tcG9uZW50SUQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmlzSW5pdGlhbGl6ZWQoKSkge1xuICAgICAgbW91bnRQb2ludCA9IG1vdW50UG9pbnQgfHwgY29tcG9uZW50Vmlldy5tb3VudFBvaW50O1xuICAgICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmluaXRpYWxpemUoe1xuICAgICAgICBpZCAgICAgICAgOiBjb21wb25lbnRJRCxcbiAgICAgICAgdGVtcGxhdGUgIDogY29tcG9uZW50Vmlldy5odG1sVGVtcGxhdGUsXG4gICAgICAgIG1vdW50UG9pbnQ6IG1vdW50UG9pbnRcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmNvbXBvbmVudFJlbmRlcigpO1xuICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5tb3VudCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtYXAgb2JqZWN0IGZvciBjb21wb25lbnQgdmlld3NcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb21wb25lbnRWaWV3TWFwKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2NvbXBvbmVudFZpZXdNYXApO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBtYXBWaWV3Q29tcG9uZW50ICAgOiBtYXBWaWV3Q29tcG9uZW50LFxuICAgIGNyZWF0ZUNvbXBvbmVudFZpZXc6IGNyZWF0ZUNvbXBvbmVudFZpZXcsXG4gICAgc2hvd1ZpZXdDb21wb25lbnQgIDogc2hvd1ZpZXdDb21wb25lbnQsXG4gICAgZ2V0Q29tcG9uZW50Vmlld01hcDogZ2V0Q29tcG9uZW50Vmlld01hcFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluQ29tcG9uZW50Vmlld3MoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQ29udmVuaWVuY2UgbWl4aW4gdGhhdCBtYWtlcyBldmVudHMgZWFzaWVyIGZvciB2aWV3c1xuICpcbiAqIEJhc2VkIG9uIEJhY2tib25lXG4gKiBSZXZpZXcgdGhpcyBodHRwOi8vYmxvZy5tYXJpb25ldHRlanMuY29tLzIwMTUvMDIvMTIvdW5kZXJzdGFuZGluZy10aGUtZXZlbnQtaGFzaC9pbmRleC5odG1sXG4gKlxuICogRXhhbXBsZTpcbiAqIHRoaXMuc2V0RXZlbnRzKHtcbiAqICAgICAgICAnY2xpY2sgI2J0bl9tYWluX3Byb2plY3RzJzogaGFuZGxlUHJvamVjdHNCdXR0b24sXG4gKiAgICAgICAgJ2NsaWNrICNidG5fZm9vLCBjbGljayAjYnRuX2Jhcic6IGhhbmRsZUZvb0JhckJ1dHRvbnNcbiAqICAgICAgfSk7XG4gKiB0aGlzLmRlbGVnYXRlRXZlbnRzKCk7XG4gKlxuICovXG5cbnZhciBNaXhpbkV2ZW50RGVsZWdhdG9yID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfZXZlbnRzTWFwLFxuICAgICAgX2V2ZW50U3Vic2NyaWJlcnMsXG4gICAgICBfcnggICAgICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9SeCcpLFxuICAgICAgX2Jyb3dzZXJJbmZvID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKTtcblxuICBmdW5jdGlvbiBzZXRFdmVudHMoZXZ0T2JqKSB7XG4gICAgX2V2ZW50c01hcCA9IGV2dE9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEV2ZW50cygpIHtcbiAgICByZXR1cm4gX2V2ZW50c01hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdXRvbWF0ZXMgc2V0dGluZyBldmVudHMgb24gRE9NIGVsZW1lbnRzLlxuICAgKiAnZXZ0U3RyIHNlbGVjdG9yJzpjYWxsYmFja1xuICAgKiAnZXZ0U3RyIHNlbGVjdG9yLCBldnRTdHIgc2VsZWN0b3InOiBzaGFyZWRDYWxsYmFja1xuICAgKi9cbiAgZnVuY3Rpb24gZGVsZWdhdGVFdmVudHMoKSB7XG4gICAgaWYgKCFfZXZlbnRzTWFwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yICh2YXIgZXZ0U3RyaW5ncyBpbiBfZXZlbnRzTWFwKSB7XG4gICAgICBpZiAoX2V2ZW50c01hcC5oYXNPd25Qcm9wZXJ0eShldnRTdHJpbmdzKSkge1xuXG4gICAgICAgIHZhciBtYXBwaW5ncyAgICAgPSBldnRTdHJpbmdzLnNwbGl0KCcsJyksXG4gICAgICAgICAgICBldmVudEhhbmRsZXIgPSBfZXZlbnRzTWFwW2V2dFN0cmluZ3NdO1xuXG4gICAgICAgIGlmICghaXMuZnVuY3Rpb24oZXZlbnRIYW5kbGVyKSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybignRXZlbnREZWxlZ2F0b3IsIGhhbmRsZXIgZm9yICcgKyBldnRTdHJpbmdzICsgJyBpcyBub3QgYSBmdW5jdGlvbicpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIGpzaGludCAtVzA4MyAqL1xuICAgICAgICAvLyBodHRwczovL2pzbGludGVycm9ycy5jb20vZG9udC1tYWtlLWZ1bmN0aW9ucy13aXRoaW4tYS1sb29wXG4gICAgICAgIG1hcHBpbmdzLmZvckVhY2goZnVuY3Rpb24gKGV2dE1hcCkge1xuICAgICAgICAgIGV2dE1hcCAgICAgICA9IGV2dE1hcC50cmltKCk7XG4gICAgICAgICAgdmFyIGV2ZW50U3RyID0gZXZ0TWFwLnNwbGl0KCcgJylbMF0udHJpbSgpLFxuICAgICAgICAgICAgICBzZWxlY3RvciA9IGV2dE1hcC5zcGxpdCgnICcpWzFdLnRyaW0oKTtcblxuICAgICAgICAgIGlmIChfYnJvd3NlckluZm8ubW9iaWxlLmFueSgpKSB7XG4gICAgICAgICAgICBldmVudFN0ciA9IGNvbnZlcnRNb3VzZVRvVG91Y2hFdmVudFN0cihldmVudFN0cik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZ0U3RyaW5nc10gPSBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8qIGpzaGludCArVzA4MyAqL1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNYXAgY29tbW9uIG1vdXNlIGV2ZW50cyB0byB0b3VjaCBlcXVpdmFsZW50c1xuICAgKiBAcGFyYW0gZXZlbnRTdHJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjb252ZXJ0TW91c2VUb1RvdWNoRXZlbnRTdHIoZXZlbnRTdHIpIHtcbiAgICBzd2l0Y2ggKGV2ZW50U3RyKSB7XG4gICAgICBjYXNlKCdjbGljaycpOlxuICAgICAgICByZXR1cm4gJ3RvdWNoZW5kJztcbiAgICAgIGNhc2UoJ21vdXNlZG93bicpOlxuICAgICAgICByZXR1cm4gJ3RvdWNoc3RhcnQnO1xuICAgICAgY2FzZSgnbW91c2V1cCcpOlxuICAgICAgICByZXR1cm4gJ3RvdWNoZW5kJztcbiAgICAgIGNhc2UoJ21vdXNlbW92ZScpOlxuICAgICAgICByZXR1cm4gJ3RvdWNobW92ZSc7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gZXZlbnRTdHI7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSGFuZGxlcihzZWxlY3RvciwgZXZlbnRTdHIsIGV2ZW50SGFuZGxlcikge1xuICAgIHZhciBvYnNlcnZhYmxlID0gX3J4LmRvbShzZWxlY3RvciwgZXZlbnRTdHIpLFxuICAgICAgICBhdXRvICAgICAgID0gdHJ1ZSxcbiAgICAgICAgZWwgICAgICAgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpLFxuICAgICAgICB0YWcgICAgICAgID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICB0eXBlICAgICAgID0gZWwuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG5cbiAgICBpZiAoYXV0bykge1xuICAgICAgaWYgKHRhZyA9PT0gJ2lucHV0Jykge1xuICAgICAgICBpZiAoZXZlbnRTdHIgPT09ICdibHVyJyB8fCBldmVudFN0ciA9PT0gJ2ZvY3VzJykge1xuICAgICAgICAgIHJldHVybiBvYnNlcnZhYmxlXG4gICAgICAgICAgICAubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKVxuICAgICAgICAgICAgLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50U3RyID09PSAna2V5dXAnIHx8IGV2ZW50U3RyID09PSAna2V5ZG93bicpIHtcbiAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgLnRocm90dGxlKDEwMClcbiAgICAgICAgICAgIC5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGFnID09PSAnc2VsZWN0Jykge1xuICAgICAgICBpZiAoZXZlbnRTdHIgPT09ICdjaGFuZ2UnKSB7XG4gICAgICAgICAgcmV0dXJuIG9ic2VydmFibGVcbiAgICAgICAgICAgIC5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL2NvbnNvbGUubG9nKFwiYWRkaW5nIFwiLCBldmVudFN0ciwgJ3RvIGVsZW1lbnQgdHlwZScsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpLnRhZ05hbWUsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpLmdldEF0dHJpYnV0ZSgndHlwZScpKTtcblxuICAgIHJldHVybiBvYnNlcnZhYmxlLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFubHkgcmVtb3ZlIGV2ZW50c1xuICAgKi9cbiAgZnVuY3Rpb24gdW5kZWxlZ2F0ZUV2ZW50cygpIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBldmVudCBpbiBfZXZlbnRTdWJzY3JpYmVycykge1xuICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZlbnRdLmRpc3Bvc2UoKTtcbiAgICAgIGRlbGV0ZSBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF07XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRFdmVudHMgICAgICAgOiBzZXRFdmVudHMsXG4gICAgZ2V0RXZlbnRzICAgICAgIDogZ2V0RXZlbnRzLFxuICAgIHVuZGVsZWdhdGVFdmVudHM6IHVuZGVsZWdhdGVFdmVudHMsXG4gICAgZGVsZWdhdGVFdmVudHMgIDogZGVsZWdhdGVFdmVudHNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkV2ZW50RGVsZWdhdG9yOyIsIi8qIEBmbG93IHdlYWsgKi9cblxudmFyIE1peGluTnVkb3J1Q29udHJvbHMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9ub3RpZmljYXRpb25WaWV3ICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcycpLFxuICAgICAgX3Rvb2xUaXBWaWV3ICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvVG9vbFRpcFZpZXcuanMnKSxcbiAgICAgIF9tZXNzYWdlQm94VmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzJyksXG4gICAgICBfbWVzc2FnZUJveENyZWF0b3IgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Q3JlYXRvci5qcycpLFxuICAgICAgX21vZGFsQ292ZXJWaWV3ICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKSB7XG4gICAgX3Rvb2xUaXBWaWV3LmluaXRpYWxpemUoJ3Rvb2x0aXBfX2NvbnRhaW5lcicpO1xuICAgIF9ub3RpZmljYXRpb25WaWV3LmluaXRpYWxpemUoJ3RvYXN0X19jb250YWluZXInKTtcbiAgICBfbWVzc2FnZUJveFZpZXcuaW5pdGlhbGl6ZSgnbWVzc2FnZWJveF9fY29udGFpbmVyJyk7XG4gICAgX21vZGFsQ292ZXJWaWV3LmluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1iQ3JlYXRvcigpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hDcmVhdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTWVzc2FnZUJveChvYmopIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlTWVzc2FnZUJveChpZCkge1xuICAgIF9tZXNzYWdlQm94Vmlldy5yZW1vdmUoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWxlcnQobWVzc2FnZSwgdGl0bGUpIHtcbiAgICByZXR1cm4gbWJDcmVhdG9yKCkuYWxlcnQodGl0bGUgfHwgJ0FsZXJ0JywgbWVzc2FnZSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGROb3RpZmljYXRpb24ob2JqKSB7XG4gICAgcmV0dXJuIF9ub3RpZmljYXRpb25WaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KG1lc3NhZ2UsIHRpdGxlLCB0eXBlKSB7XG4gICAgcmV0dXJuIGFkZE5vdGlmaWNhdGlvbih7XG4gICAgICB0aXRsZSAgOiB0aXRsZSB8fCAnJyxcbiAgICAgIHR5cGUgICA6IHR5cGUgfHwgX25vdGlmaWNhdGlvblZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVOdWRvcnVDb250cm9sczogaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzLFxuICAgIG1iQ3JlYXRvciAgICAgICAgICAgICAgIDogbWJDcmVhdG9yLFxuICAgIGFkZE1lc3NhZ2VCb3ggICAgICAgICAgIDogYWRkTWVzc2FnZUJveCxcbiAgICByZW1vdmVNZXNzYWdlQm94ICAgICAgICA6IHJlbW92ZU1lc3NhZ2VCb3gsXG4gICAgYWRkTm90aWZpY2F0aW9uICAgICAgICAgOiBhZGROb3RpZmljYXRpb24sXG4gICAgYWxlcnQgICAgICAgICAgICAgICAgICAgOiBhbGVydCxcbiAgICBub3RpZnkgICAgICAgICAgICAgICAgICA6IG5vdGlmeVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluTnVkb3J1Q29udHJvbHMoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gdmlldyB0aGF0IGFsbG93cyBmb3IgY29tcG9uZW50IHZpZXdzIHRvIGJlIGRpc3BsYXkgb24gc3RvcmUgc3RhdGUgY2hhbmdlc1xuICovXG5cbnZhciBNaXhpblN0b3JlU3RhdGVWaWV3cyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3RoaXMsXG4gICAgICBfd2F0Y2hlZFN0b3JlLFxuICAgICAgX2N1cnJlbnRWaWV3SUQsXG4gICAgICBfY3VycmVudFN0b3JlU3RhdGUsXG4gICAgICBfc3RhdGVWaWV3TW91bnRQb2ludCxcbiAgICAgIF9zdGF0ZVZpZXdJRE1hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLyoqXG4gICAqIFNldCB1cCBsaXN0ZW5lcnNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVTdGF0ZVZpZXdzKHN0b3JlKSB7XG4gICAgX3RoaXMgPSB0aGlzOyAvLyBtaXRpZ2F0aW9uLCBEdWUgdG8gZXZlbnRzLCBzY29wZSBtYXkgYmUgc2V0IHRvIHRoZSB3aW5kb3cgb2JqZWN0XG4gICAgX3dhdGNoZWRTdG9yZSA9IHN0b3JlO1xuXG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCd2aWV3Q2hhbmdlJyk7XG5cbiAgICBfd2F0Y2hlZFN0b3JlLnN1YnNjcmliZShmdW5jdGlvbiBvblN0YXRlQ2hhbmdlKCkge1xuICAgICAgaGFuZGxlU3RhdGVDaGFuZ2UoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IHJvdXRlIGZyb20gVVJMIGhhc2ggb24gY2hhbmdlXG4gICAqIEBwYXJhbSByb3V0ZU9ialxuICAgKi9cbiAgZnVuY3Rpb24gaGFuZGxlU3RhdGVDaGFuZ2UoKSB7XG4gICAgc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSgpIHtcbiAgICB2YXIgc3RhdGUgPSBfd2F0Y2hlZFN0b3JlLmdldFN0YXRlKCkuY3VycmVudFN0YXRlO1xuICAgIGlmIChzdGF0ZSkge1xuICAgICAgaWYgKHN0YXRlICE9PSBfY3VycmVudFN0b3JlU3RhdGUpIHtcbiAgICAgICAgX2N1cnJlbnRTdG9yZVN0YXRlID0gc3RhdGU7XG4gICAgICAgIHNob3dTdGF0ZVZpZXdDb21wb25lbnQuYmluZChfdGhpcykoX2N1cnJlbnRTdG9yZVN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBsb2NhdGlvbiBmb3IgdGhlIHZpZXcgdG8gbW91bnQgb24gcm91dGUgY2hhbmdlcywgYW55IGNvbnRlbnRzIHdpbGxcbiAgICogYmUgcmVtb3ZlZCBwcmlvclxuICAgKiBAcGFyYW0gZWxJRFxuICAgKi9cbiAgZnVuY3Rpb24gc2V0Vmlld01vdW50UG9pbnQoZWxJRCkge1xuICAgIF9zdGF0ZVZpZXdNb3VudFBvaW50ID0gZWxJRDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFZpZXdNb3VudFBvaW50KCkge1xuICAgIHJldHVybiBfc3RhdGVWaWV3TW91bnRQb2ludDtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXAgYSByb3V0ZSB0byBhIG1vZHVsZSB2aWV3IGNvbnRyb2xsZXJcbiAgICogQHBhcmFtIHRlbXBsYXRlSURcbiAgICogQHBhcmFtIGNvbXBvbmVudElEb3JPYmpcbiAgICovXG4gIGZ1bmN0aW9uIG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KHN0YXRlLCB0ZW1wbGF0ZUlELCBjb21wb25lbnRJRG9yT2JqKSB7XG4gICAgX3N0YXRlVmlld0lETWFwW3N0YXRlXSA9IHRlbXBsYXRlSUQ7XG4gICAgdGhpcy5tYXBWaWV3Q29tcG9uZW50KHRlbXBsYXRlSUQsIGNvbXBvbmVudElEb3JPYmosIF9zdGF0ZVZpZXdNb3VudFBvaW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IGEgdmlldyAoaW4gcmVzcG9uc2UgdG8gYSByb3V0ZSBjaGFuZ2UpXG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1N0YXRlVmlld0NvbXBvbmVudChzdGF0ZSkge1xuICAgIHZhciBjb21wb25lbnRJRCA9IF9zdGF0ZVZpZXdJRE1hcFtzdGF0ZV07XG4gICAgaWYgKCFjb21wb25lbnRJRCkge1xuICAgICAgY29uc29sZS53YXJuKFwiTm8gdmlldyBtYXBwZWQgZm9yIHJvdXRlOiBcIiArIHN0YXRlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZW1vdmVDdXJyZW50VmlldygpO1xuXG4gICAgX2N1cnJlbnRWaWV3SUQgPSBjb21wb25lbnRJRDtcbiAgICB0aGlzLnNob3dWaWV3Q29tcG9uZW50KF9jdXJyZW50Vmlld0lEKTtcblxuICAgIC8vIFRyYW5zaXRpb24gbmV3IHZpZXcgaW5cbiAgICBUd2VlbkxpdGUuc2V0KF9zdGF0ZVZpZXdNb3VudFBvaW50LCB7YWxwaGE6IDB9KTtcbiAgICBUd2VlbkxpdGUudG8oX3N0YXRlVmlld01vdW50UG9pbnQsIDAuMjUsIHthbHBoYTogMSwgZWFzZTogUXVhZC5lYXNlSW59KTtcblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZigndmlld0NoYW5nZScsIGNvbXBvbmVudElEKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGN1cnJlbnRseSBkaXNwbGF5ZWQgdmlld1xuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlQ3VycmVudFZpZXcoKSB7XG4gICAgaWYgKF9jdXJyZW50Vmlld0lEKSB7XG4gICAgICBfdGhpcy5nZXRDb21wb25lbnRWaWV3TWFwKClbX2N1cnJlbnRWaWV3SURdLmNvbnRyb2xsZXIudW5tb3VudCgpO1xuICAgIH1cbiAgICBfY3VycmVudFZpZXdJRCA9ICcnO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplU3RhdGVWaWV3cyAgICAgICAgOiBpbml0aWFsaXplU3RhdGVWaWV3cyxcbiAgICBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlOiBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlLFxuICAgIHNob3dTdGF0ZVZpZXdDb21wb25lbnQgICAgICA6IHNob3dTdGF0ZVZpZXdDb21wb25lbnQsXG4gICAgc2V0Vmlld01vdW50UG9pbnQgICAgICAgICAgIDogc2V0Vmlld01vdW50UG9pbnQsXG4gICAgZ2V0Vmlld01vdW50UG9pbnQgICAgICAgICAgIDogZ2V0Vmlld01vdW50UG9pbnQsXG4gICAgbWFwU3RhdGVUb1ZpZXdDb21wb25lbnQgICAgIDogbWFwU3RhdGVUb1ZpZXdDb21wb25lbnRcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpblN0b3JlU3RhdGVWaWV3cygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBCYXNlIG1vZHVsZSBmb3IgY29tcG9uZW50c1xuICogTXVzdCBiZSBleHRlbmRlZCB3aXRoIGN1c3RvbSBtb2R1bGVzXG4gKi9cblxudmFyIF90ZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3V0aWxzL1RlbXBsYXRpbmcuanMnKTtcblxudmFyIFZpZXdDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9pc0luaXRpYWxpemVkID0gZmFsc2UsXG4gICAgICBfY29uZmlnUHJvcHMsXG4gICAgICBfaWQsXG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSxcbiAgICAgIF9odG1sLFxuICAgICAgX0RPTUVsZW1lbnQsXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF9jaGlsZHJlbiAgICAgID0gW10sXG4gICAgICBfaXNNb3VudGVkICAgICA9IGZhbHNlLFxuICAgICAgX3JlbmRlcmVyICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9SZW5kZXJlcicpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXphdGlvblxuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVDb21wb25lbnQoY29uZmlnUHJvcHMpIHtcbiAgICBfY29uZmlnUHJvcHMgPSBjb25maWdQcm9wcztcbiAgICBfaWQgICAgICAgICAgPSBjb25maWdQcm9wcy5pZDtcbiAgICBfbW91bnRQb2ludCAgPSBjb25maWdQcm9wcy5tb3VudFBvaW50O1xuXG4gICAgdGhpcy5zZXRTdGF0ZSh0aGlzLmdldEluaXRpYWxTdGF0ZSgpKTtcbiAgICB0aGlzLnNldEV2ZW50cyh0aGlzLmRlZmluZUV2ZW50cygpKTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndXBkYXRlJyk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdtb3VudCcpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndW5tb3VudCcpO1xuXG4gICAgX2lzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVmaW5lRXZlbnRzKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQmluZCB1cGRhdGVzIHRvIHRoZSBtYXAgSUQgdG8gdGhpcyB2aWV3J3MgdXBkYXRlXG4gICAqIEBwYXJhbSBtYXBJRG9yT2JqIE9iamVjdCB0byBzdWJzY3JpYmUgdG8gb3IgSUQuIFNob3VsZCBpbXBsZW1lbnQgbm9yaS9zdG9yZS9NaXhpbk9ic2VydmFibGVTdG9yZVxuICAgKi9cbiAgZnVuY3Rpb24gYmluZE1hcChtYXBJRG9yT2JqKSB7XG4gICAgdmFyIG1hcDtcblxuICAgIGlmIChpcy5vYmplY3QobWFwSURvck9iaikpIHtcbiAgICAgIG1hcCA9IG1hcElEb3JPYmo7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1hcCA9IE5vcmkuc3RvcmUoKS5nZXRNYXAobWFwSURvck9iaikgfHwgTm9yaS5zdG9yZSgpLmdldE1hcENvbGxlY3Rpb24obWFwSURvck9iaik7XG4gICAgfVxuXG4gICAgaWYgKCFtYXApIHtcbiAgICAgIGNvbnNvbGUud2FybignVmlld0NvbXBvbmVudCBiaW5kTWFwLCBtYXAgb3IgbWFwY29sbGVjdGlvbiBub3QgZm91bmQ6ICcgKyBtYXBJRG9yT2JqKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWlzLmZ1bmN0aW9uKG1hcC5zdWJzY3JpYmUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1ZpZXdDb21wb25lbnQgYmluZE1hcCwgbWFwIG9yIG1hcGNvbGxlY3Rpb24gbXVzdCBiZSBvYnNlcnZhYmxlOiAnICsgbWFwSURvck9iaik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWFwLnN1YnNjcmliZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBjaGlsZFxuICAgKiBAcGFyYW0gY2hpbGRcbiAgICovXG4gIC8vZnVuY3Rpb24gYWRkQ2hpbGQoY2hpbGQpIHtcbiAgLy8gIF9jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGNoaWxkXG4gICAqIEBwYXJhbSBjaGlsZFxuICAgKi9cbiAgLy9mdW5jdGlvbiByZW1vdmVDaGlsZChjaGlsZCkge1xuICAvLyAgdmFyIGlkeCA9IF9jaGlsZHJlbi5pbmRleE9mKGNoaWxkKTtcbiAgLy8gIF9jaGlsZHJlbltpZHhdLnVubW91bnQoKTtcbiAgLy8gIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIEJlZm9yZSB0aGUgdmlldyB1cGRhdGVzIGFuZCBhIHJlcmVuZGVyIG9jY3Vyc1xuICAgKiBSZXR1cm5zIG5leHRTdGF0ZSBvZiBjb21wb25lbnRcbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVcGRhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgY3VycmVudFN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuICAgIHZhciBuZXh0U3RhdGUgICAgPSB0aGlzLmNvbXBvbmVudFdpbGxVcGRhdGUoKTtcblxuICAgIGlmICh0aGlzLnNob3VsZENvbXBvbmVudFVwZGF0ZShuZXh0U3RhdGUpKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKG5leHRTdGF0ZSk7XG4gICAgICAvL19jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIHVwZGF0ZUNoaWxkKGNoaWxkKSB7XG4gICAgICAvLyAgY2hpbGQudXBkYXRlKCk7XG4gICAgICAvL30pO1xuXG4gICAgICBpZiAoX2lzTW91bnRlZCkge1xuICAgICAgICBpZiAodGhpcy5zaG91bGRDb21wb25lbnRSZW5kZXIoY3VycmVudFN0YXRlKSkge1xuICAgICAgICAgIHRoaXMudW5tb3VudCgpO1xuICAgICAgICAgIHRoaXMuY29tcG9uZW50UmVuZGVyKCk7XG4gICAgICAgICAgdGhpcy5tb3VudCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3VwZGF0ZScsIHRoaXMuZ2V0SUQoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbXBhcmUgY3VycmVudCBzdGF0ZSBhbmQgbmV4dCBzdGF0ZSB0byBkZXRlcm1pbmUgaWYgdXBkYXRpbmcgc2hvdWxkIG9jY3VyXG4gICAqIEBwYXJhbSBuZXh0U3RhdGVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSB7XG4gICAgcmV0dXJuIGlzLmV4aXN0eShuZXh0U3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBpdCwgbmVlZCB0byBhZGQgaXQgdG8gYSBwYXJlbnQgY29udGFpbmVyLCBoYW5kbGVkIGluIGhpZ2hlciBsZXZlbCB2aWV3XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50UmVuZGVyKCkge1xuICAgIC8vX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gcmVuZGVyQ2hpbGQoY2hpbGQpIHtcbiAgICAvLyAgY2hpbGQuY29tcG9uZW50UmVuZGVyKCk7XG4gICAgLy99KTtcbiAgICBpZiAoIV90ZW1wbGF0ZU9iakNhY2hlKSB7XG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSA9IHRoaXMudGVtcGxhdGUoKTtcbiAgICB9XG5cbiAgICBfaHRtbCA9IHRoaXMucmVuZGVyKHRoaXMuZ2V0U3RhdGUoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIExvZGFzaCBjbGllbnQgc2lkZSB0ZW1wbGF0ZSBmdW5jdGlvbiBieSBnZXR0aW5nIHRoZSBIVE1MIHNvdXJjZSBmcm9tXG4gICAqIHRoZSBtYXRjaGluZyA8c2NyaXB0IHR5cGU9J3RleHQvdGVtcGxhdGUnPiB0YWcgaW4gdGhlIGRvY3VtZW50LiBPUiB5b3UgbWF5XG4gICAqIHNwZWNpZnkgdGhlIGN1c3RvbSBIVE1MIHRvIHVzZSBoZXJlLlxuICAgKlxuICAgKiBUaGUgbWV0aG9kIGlzIGNhbGxlZCBvbmx5IG9uIHRoZSBmaXJzdCByZW5kZXIgYW5kIGNhY2hlZCB0byBzcGVlZCB1cCByZW5kZXJzXG4gICAqXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAgICovXG4gIGZ1bmN0aW9uIHRlbXBsYXRlKCkge1xuICAgIC8vIGFzc3VtZXMgdGhlIHRlbXBsYXRlIElEIG1hdGNoZXMgdGhlIGNvbXBvbmVudCdzIElEIGFzIHBhc3NlZCBvbiBpbml0aWFsaXplXG4gICAgdmFyIGh0bWwgPSBfdGVtcGxhdGUuZ2V0U291cmNlKHRoaXMuZ2V0SUQoKSk7XG4gICAgcmV0dXJuIF8udGVtcGxhdGUoaHRtbCk7XG4gIH1cblxuICAvKipcbiAgICogTWF5IGJlIG92ZXJyaWRkZW4gaW4gYSBzdWJtb2R1bGUgZm9yIGN1c3RvbSByZW5kZXJpbmdcbiAgICogU2hvdWxkIHJldHVybiBIVE1MXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVuZGVyKHN0YXRlKSB7XG4gICAgcmV0dXJuIF90ZW1wbGF0ZU9iakNhY2hlKHN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmQgaXQgdG8gYSBwYXJlbnQgZWxlbWVudFxuICAgKiBAcGFyYW0gbW91bnRFbFxuICAgKi9cbiAgZnVuY3Rpb24gbW91bnQoKSB7XG4gICAgaWYgKCFfaHRtbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb25lbnQgJyArIF9pZCArICcgY2Fubm90IG1vdW50IHdpdGggbm8gSFRNTC4gQ2FsbCByZW5kZXIoKSBmaXJzdD8nKTtcbiAgICB9XG5cbiAgICBfaXNNb3VudGVkID0gdHJ1ZTtcblxuICAgIF9ET01FbGVtZW50ID0gKF9yZW5kZXJlci5yZW5kZXIoe1xuICAgICAgdGFyZ2V0OiBfbW91bnRQb2ludCxcbiAgICAgIGh0bWwgIDogX2h0bWxcbiAgICB9KSk7XG5cbiAgICBpZiAodGhpcy5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50KSB7XG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdtb3VudCcsIHRoaXMuZ2V0SUQoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCBhZnRlciBpdCdzIGJlZW4gYWRkZWQgdG8gYSB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAvLyBzdHViXG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB3aGVuIHVubG9hZGluZ1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgZnVuY3Rpb24gdW5tb3VudCgpIHtcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KCk7XG4gICAgX2lzTW91bnRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMudW5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgfVxuXG4gICAgX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiAnJ1xuICAgIH0pO1xuXG4gICAgX2h0bWwgICAgICAgPSAnJztcbiAgICBfRE9NRWxlbWVudCA9IG51bGw7XG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1bm1vdW50JywgdGhpcy5nZXRJRCgpKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgVXRpbHNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIGh0dHA6Ly9taXRocmlsLmpzLm9yZy9taXRocmlsLndpdGhBdHRyLmh0bWxcbiAgICogVGhpcyBpcyBhbiBldmVudCBoYW5kbGVyIGZhY3RvcnkuIEl0IHJldHVybnMgYSBtZXRob2QgdGhhdCBjYW4gYmUgYm91bmQgdG8gYVxuICAgKiBET00gZWxlbWVudCdzIGV2ZW50IGxpc3RlbmVyLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpcyBwcm92aWRlZCB0byBkZWNvdXBsZSB0aGUgYnJvd3NlcidzIGV2ZW50IG1vZGVsIGZyb20gdGhlXG4gICAqIGNvbnRyb2xsZXIvbG9naWMgbW9kZWwuXG4gICAqXG4gICAqIFlvdSBzaG91bGQgdXNlIHRoaXMgbWV0aG9kIGFuZCBpbXBsZW1lbnQgc2ltaWxhciBvbmVzIHdoZW4gZXh0cmFjdGluZyB2YWx1ZXNcbiAgICogZnJvbSBhIGJyb3dzZXIncyBFdmVudCBvYmplY3QsIGluc3RlYWQgb2YgaGFyZC1jb2RpbmcgdGhlIGV4dHJhY3Rpb24gY29kZVxuICAgKiBpbnRvIGNvbnRyb2xsZXJzIChvciBtb2RlbCBtZXRob2RzKS5cbiAgICogQHBhcmFtIHByb3BcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwYXJhbSBjb250ZXh0XG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAgICovXG4gIGZ1bmN0aW9uIHdpdGhBdHRyKHByb3AsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChlKSB7XG4gICAgICBlID0gZSB8fCBldmVudDtcblxuICAgICAgdmFyIGN1cnJlbnRUYXJnZXQgPSBlLmN1cnJlbnRUYXJnZXQgfHwgdGhpcyxcbiAgICAgICAgICBjbnR4ICAgICAgICAgID0gY29udGV4dCB8fCB0aGlzO1xuXG4gICAgICBjYWxsYmFjay5jYWxsKGNudHgsIHByb3AgaW4gY3VycmVudFRhcmdldCA/IGN1cnJlbnRUYXJnZXRbcHJvcF0gOiBjdXJyZW50VGFyZ2V0LmdldEF0dHJpYnV0ZShwcm9wKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGlzSW5pdGlhbGl6ZWQoKSB7XG4gICAgcmV0dXJuIF9pc0luaXRpYWxpemVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnUHJvcHMoKSB7XG4gICAgcmV0dXJuIF9jb25maWdQcm9wcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTW91bnRlZCgpIHtcbiAgICByZXR1cm4gX2lzTW91bnRlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcbiAgICB0aGlzLnNldFN0YXRlKHt9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElEKCkge1xuICAgIHJldHVybiBfaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRET01FbGVtZW50KCkge1xuICAgIHJldHVybiBfRE9NRWxlbWVudDtcbiAgfVxuXG4gIC8vZnVuY3Rpb24gZ2V0Q2hpbGRyZW4oKSB7XG4gIC8vICByZXR1cm4gX2NoaWxkcmVuLnNsaWNlKDApO1xuICAvL31cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVDb21wb25lbnQ6IGluaXRpYWxpemVDb21wb25lbnQsXG4gICAgZGVmaW5lRXZlbnRzICAgICAgIDogZGVmaW5lRXZlbnRzLFxuICAgIGlzSW5pdGlhbGl6ZWQgICAgICA6IGlzSW5pdGlhbGl6ZWQsXG4gICAgZ2V0Q29uZmlnUHJvcHMgICAgIDogZ2V0Q29uZmlnUHJvcHMsXG4gICAgZ2V0SW5pdGlhbFN0YXRlICAgIDogZ2V0SW5pdGlhbFN0YXRlLFxuICAgIGdldElEICAgICAgICAgICAgICA6IGdldElELFxuICAgIHRlbXBsYXRlICAgICAgICAgICA6IHRlbXBsYXRlLFxuICAgIGdldERPTUVsZW1lbnQgICAgICA6IGdldERPTUVsZW1lbnQsXG4gICAgaXNNb3VudGVkICAgICAgICAgIDogaXNNb3VudGVkLFxuXG4gICAgYmluZE1hcDogYmluZE1hcCxcblxuICAgIGNvbXBvbmVudFdpbGxVcGRhdGUgIDogY29tcG9uZW50V2lsbFVwZGF0ZSxcbiAgICBzaG91bGRDb21wb25lbnRVcGRhdGU6IHNob3VsZENvbXBvbmVudFVwZGF0ZSxcbiAgICB1cGRhdGUgICAgICAgICAgICAgICA6IHVwZGF0ZSxcblxuICAgIGNvbXBvbmVudFJlbmRlcjogY29tcG9uZW50UmVuZGVyLFxuICAgIHJlbmRlciAgICAgICAgIDogcmVuZGVyLFxuXG4gICAgbW91bnQgICAgICAgICAgICA6IG1vdW50LFxuICAgIGNvbXBvbmVudERpZE1vdW50OiBjb21wb25lbnREaWRNb3VudCxcblxuICAgIGNvbXBvbmVudFdpbGxVbm1vdW50OiBjb21wb25lbnRXaWxsVW5tb3VudCxcbiAgICB1bm1vdW50ICAgICAgICAgICAgIDogdW5tb3VudCxcblxuICAgIHdpdGhBdHRyOiB3aXRoQXR0clxuXG4gICAgLy9hZGRDaGlsZCAgIDogYWRkQ2hpbGQsXG4gICAgLy9yZW1vdmVDaGlsZDogcmVtb3ZlQ2hpbGQsXG4gICAgLy9nZXRDaGlsZHJlbjogZ2V0Q2hpbGRyZW5cbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3Q29tcG9uZW50OyIsInZhciBicm93c2VySW5mbyA9IHtcblxuICBhcHBWZXJzaW9uIDogbmF2aWdhdG9yLmFwcFZlcnNpb24sXG4gIHVzZXJBZ2VudCAgOiBuYXZpZ2F0b3IudXNlckFnZW50LFxuICBpc0lFICAgICAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJNU0lFIFwiKSxcbiAgaXNJRTYgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDZcIiksXG4gIGlzSUU3ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA3XCIpLFxuICBpc0lFOCAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgOFwiKSxcbiAgaXNJRTkgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDlcIiksXG4gIGlzRkYgICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkZpcmVmb3gvXCIpLFxuICBpc0Nocm9tZSAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJDaHJvbWUvXCIpLFxuICBpc01hYyAgICAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJNYWNpbnRvc2gsXCIpLFxuICBpc01hY1NhZmFyaTogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJTYWZhcmlcIikgJiYgLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJNYWNcIikgJiYgLTEgPT09IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkNocm9tZVwiKSxcblxuICBoYXNUb3VjaCAgICA6ICdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgbm90U3VwcG9ydGVkOiAodGhpcy5pc0lFNiB8fCB0aGlzLmlzSUU3IHx8IHRoaXMuaXNJRTggfHwgdGhpcy5pc0lFOSksXG5cbiAgbW9iaWxlOiB7XG4gICAgQW5kcm9pZCAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0FuZHJvaWQvaSk7XG4gICAgfSxcbiAgICBCbGFja0JlcnJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQmxhY2tCZXJyeS9pKSB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CQjEwOyBUb3VjaC8pO1xuICAgIH0sXG4gICAgaU9TICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQaG9uZXxpUGFkfGlQb2QvaSk7XG4gICAgfSxcbiAgICBPcGVyYSAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvT3BlcmEgTWluaS9pKTtcbiAgICB9LFxuICAgIFdpbmRvd3MgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9JRU1vYmlsZS9pKTtcbiAgICB9LFxuICAgIGFueSAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiAodGhpcy5BbmRyb2lkKCkgfHwgdGhpcy5CbGFja0JlcnJ5KCkgfHwgdGhpcy5pT1MoKSB8fCB0aGlzLk9wZXJhKCkgfHwgdGhpcy5XaW5kb3dzKCkpICE9PSBudWxsO1xuICAgIH1cblxuICB9LFxuXG4gIC8vIFRPRE8gZmlsdGVyIGZvciBJRSA+IDlcbiAgZW5oYW5jZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIV9icm93c2VySW5mby5pc0lFICYmICFfYnJvd3NlckluZm8ubW9iaWxlLmFueSgpO1xuICB9LFxuXG4gIG1vdXNlRG93bkV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2hzdGFydFwiIDogXCJtb3VzZWRvd25cIjtcbiAgfSxcblxuICBtb3VzZVVwRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaGVuZFwiIDogXCJtb3VzZXVwXCI7XG4gIH0sXG5cbiAgbW91c2VDbGlja0V2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2hlbmRcIiA6IFwiY2xpY2tcIjtcbiAgfSxcblxuICBtb3VzZU1vdmVFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNobW92ZVwiIDogXCJtb3VzZW1vdmVcIjtcbiAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJyb3dzZXJJbmZvOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTIzOTk5L2hvdy10by10ZWxsLWlmLWEtZG9tLWVsZW1lbnQtaXMtdmlzaWJsZS1pbi10aGUtY3VycmVudC12aWV3cG9ydFxuICAvLyBlbGVtZW50IG11c3QgYmUgZW50aXJlbHkgb24gc2NyZWVuXG4gIGlzRWxlbWVudEVudGlyZWx5SW5WaWV3cG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gKFxuICAgICAgcmVjdC50b3AgPj0gMCAmJlxuICAgICAgcmVjdC5sZWZ0ID49IDAgJiZcbiAgICAgIHJlY3QuYm90dG9tIDw9ICh3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCkgJiZcbiAgICAgIHJlY3QucmlnaHQgPD0gKHdpbmRvdy5pbm5lcldpZHRoIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aClcbiAgICApO1xuICB9LFxuXG4gIC8vIGVsZW1lbnQgbWF5IGJlIHBhcnRpYWx5IG9uIHNjcmVlblxuICBpc0VsZW1lbnRJblZpZXdwb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiByZWN0LmJvdHRvbSA+IDAgJiZcbiAgICAgIHJlY3QucmlnaHQgPiAwICYmXG4gICAgICByZWN0LmxlZnQgPCAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSAmJlxuICAgICAgcmVjdC50b3AgPCAod2luZG93LmlubmVySGVpZ2h0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpO1xuICB9LFxuXG4gIGlzRG9tT2JqOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iai5ub2RlVHlwZSB8fCAob2JqID09PSB3aW5kb3cpKTtcbiAgfSxcblxuICBwb3NpdGlvbjogZnVuY3Rpb24gKGVsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IGVsLm9mZnNldExlZnQsXG4gICAgICB0b3AgOiBlbC5vZmZzZXRUb3BcbiAgICB9O1xuICB9LFxuXG4gIC8vIGZyb20gaHR0cDovL2pzcGVyZi5jb20vanF1ZXJ5LW9mZnNldC12cy1vZmZzZXRwYXJlbnQtbG9vcFxuICBvZmZzZXQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciBvbCA9IDAsXG4gICAgICAgIG90ID0gMDtcbiAgICBpZiAoZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgICBkbyB7XG4gICAgICAgIG9sICs9IGVsLm9mZnNldExlZnQ7XG4gICAgICAgIG90ICs9IGVsLm9mZnNldFRvcDtcbiAgICAgIH0gd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBsZWZ0OiBvbCxcbiAgICAgIHRvcCA6IG90XG4gICAgfTtcbiAgfSxcblxuICByZW1vdmVBbGxFbGVtZW50czogZnVuY3Rpb24gKGVsKSB7XG4gICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgfSxcblxuICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDk0MTQzL2NyZWF0aW5nLWEtbmV3LWRvbS1lbGVtZW50LWZyb20tYW4taHRtbC1zdHJpbmctdXNpbmctYnVpbHQtaW4tZG9tLW1ldGhvZHMtb3ItcHJvXG4gIEhUTUxTdHJUb05vZGU6IGZ1bmN0aW9uIChzdHIpIHtcbiAgICB2YXIgdGVtcCAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRlbXAuaW5uZXJIVE1MID0gc3RyO1xuICAgIHJldHVybiB0ZW1wLmZpcnN0Q2hpbGQ7XG4gIH0sXG5cbiAgd3JhcEVsZW1lbnQ6IGZ1bmN0aW9uICh3cmFwcGVyU3RyLCBlbCkge1xuICAgIHZhciB3cmFwcGVyRWwgPSB0aGlzLkhUTUxTdHJUb05vZGUod3JhcHBlclN0ciksXG4gICAgICAgIGVsUGFyZW50ICA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICB3cmFwcGVyRWwuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIGVsUGFyZW50LmFwcGVuZENoaWxkKHdyYXBwZXJFbCk7XG4gICAgcmV0dXJuIHdyYXBwZXJFbDtcbiAgfSxcblxuICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE1MzI5MTY3L2Nsb3Nlc3QtYW5jZXN0b3ItbWF0Y2hpbmctc2VsZWN0b3ItdXNpbmctbmF0aXZlLWRvbVxuICBjbG9zZXN0OiBmdW5jdGlvbiAoZWwsIHNlbGVjdG9yKSB7XG4gICAgdmFyIG1hdGNoZXNTZWxlY3RvciA9IGVsLm1hdGNoZXMgfHwgZWwud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLm1vek1hdGNoZXNTZWxlY3RvciB8fCBlbC5tc01hdGNoZXNTZWxlY3RvcjtcbiAgICB3aGlsZSAoZWwpIHtcbiAgICAgIGlmIChtYXRjaGVzU2VsZWN0b3IuYmluZChlbCkoc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsID0gZWwucGFyZW50RWxlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vIGZyb20geW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbVxuICBoYXNDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgICBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3IFJlZ0V4cCgnKF58ICknICsgY2xhc3NOYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xuICAgIH1cbiAgfSxcblxuICBhZGRDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfVxuICB9LFxuXG4gIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgICB9XG4gIH0sXG5cbiAgdG9nZ2xlQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKHRoaXMuaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkpIHtcbiAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIEZyb20gaW1wcmVzcy5qc1xuICBhcHBseUNTUzogZnVuY3Rpb24gKGVsLCBwcm9wcykge1xuICAgIHZhciBrZXksIHBrZXk7XG4gICAgZm9yIChrZXkgaW4gcHJvcHMpIHtcbiAgICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGVsLnN0eWxlW2tleV0gPSBwcm9wc1trZXldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZWw7XG4gIH0sXG5cbiAgLy8gZnJvbSBpbXByZXNzLmpzXG4gIC8vIGBjb21wdXRlV2luZG93U2NhbGVgIGNvdW50cyB0aGUgc2NhbGUgZmFjdG9yIGJldHdlZW4gd2luZG93IHNpemUgYW5kIHNpemVcbiAgLy8gZGVmaW5lZCBmb3IgdGhlIHByZXNlbnRhdGlvbiBpbiB0aGUgY29uZmlnLlxuICBjb21wdXRlV2luZG93U2NhbGU6IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICB2YXIgaFNjYWxlID0gd2luZG93LmlubmVySGVpZ2h0IC8gY29uZmlnLmhlaWdodCxcbiAgICAgICAgd1NjYWxlID0gd2luZG93LmlubmVyV2lkdGggLyBjb25maWcud2lkdGgsXG4gICAgICAgIHNjYWxlICA9IGhTY2FsZSA+IHdTY2FsZSA/IHdTY2FsZSA6IGhTY2FsZTtcblxuICAgIGlmIChjb25maWcubWF4U2NhbGUgJiYgc2NhbGUgPiBjb25maWcubWF4U2NhbGUpIHtcbiAgICAgIHNjYWxlID0gY29uZmlnLm1heFNjYWxlO1xuICAgIH1cblxuICAgIGlmIChjb25maWcubWluU2NhbGUgJiYgc2NhbGUgPCBjb25maWcubWluU2NhbGUpIHtcbiAgICAgIHNjYWxlID0gY29uZmlnLm1pblNjYWxlO1xuICAgIH1cblxuICAgIHJldHVybiBzY2FsZTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGFuIGFycmF5IG9mIGVsZW1lbnRzIGluIHRoZSBjb250YWluZXIgcmV0dXJuZWQgYXMgQXJyYXkgaW5zdGVhZCBvZiBhIE5vZGUgbGlzdFxuICAgKi9cbiAgZ2V0UVNFbGVtZW50c0FzQXJyYXk6IGZ1bmN0aW9uIChlbCwgY2xzKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoY2xzKSwgMCk7XG4gIH0sXG5cbiAgY2VudGVyRWxlbWVudEluVmlld1BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciB2cEggPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgIHZwVyA9IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICBlbFIgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgZWxIID0gZWxSLmhlaWdodCxcbiAgICAgICAgZWxXID0gZWxSLndpZHRoO1xuXG4gICAgZWwuc3R5bGUubGVmdCA9ICh2cFcgLyAyKSAtIChlbFcgLyAyKSArICdweCc7XG4gICAgZWwuc3R5bGUudG9wICA9ICh2cEggLyAyKSAtIChlbEggLyAyKSArICdweCc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb2JqZWN0IGZyb20gdGhlIG5hbWUgKG9yIGlkKSBhdHRyaWJzIGFuZCBkYXRhIG9mIGEgZm9ybVxuICAgKiBAcGFyYW0gZWxcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBjYXB0dXJlRm9ybURhdGE6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciBkYXRhT2JqID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgICAgdGV4dGFyZWFFbHMsIGlucHV0RWxzLCBzZWxlY3RFbHM7XG5cbiAgICB0ZXh0YXJlYUVscyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3RleHRhcmVhJyksIDApO1xuICAgIGlucHV0RWxzICAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgnaW5wdXQnKSwgMCk7XG4gICAgc2VsZWN0RWxzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCdzZWxlY3QnKSwgMCk7XG5cbiAgICB0ZXh0YXJlYUVscy5mb3JFYWNoKGdldElucHV0Rm9ybURhdGEpO1xuICAgIGlucHV0RWxzLmZvckVhY2goZ2V0SW5wdXRGb3JtRGF0YSk7XG4gICAgc2VsZWN0RWxzLmZvckVhY2goZ2V0U2VsZWN0Rm9ybURhdGEpO1xuXG4gICAgcmV0dXJuIGRhdGFPYmo7XG5cbiAgICBmdW5jdGlvbiBnZXRJbnB1dEZvcm1EYXRhKGZvcm1FbCkge1xuICAgICAgZGF0YU9ialtnZXRFbE5hbWVPcklEKGZvcm1FbCldID0gZm9ybUVsLnZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlbGVjdEZvcm1EYXRhKGZvcm1FbCkge1xuICAgICAgdmFyIHNlbCA9IGZvcm1FbC5zZWxlY3RlZEluZGV4LCB2YWwgPSAnJztcbiAgICAgIGlmIChzZWwgPj0gMCkge1xuICAgICAgICB2YWwgPSBmb3JtRWwub3B0aW9uc1tzZWxdLnZhbHVlO1xuICAgICAgfVxuICAgICAgZGF0YU9ialtnZXRFbE5hbWVPcklEKGZvcm1FbCldID0gdmFsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEVsTmFtZU9ySUQoZm9ybUVsKSB7XG4gICAgICB2YXIgbmFtZSA9ICdub19uYW1lJztcbiAgICAgIGlmIChmb3JtRWwuZ2V0QXR0cmlidXRlKCduYW1lJykpIHtcbiAgICAgICAgbmFtZSA9IGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKTtcbiAgICAgIH0gZWxzZSBpZiAoZm9ybUVsLmdldEF0dHJpYnV0ZSgnaWQnKSkge1xuICAgICAgICBuYW1lID0gZm9ybUVsLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYW1lO1xuICAgIH1cbiAgfVxuXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgc2hhcmVkIDNkIHBlcnNwZWN0aXZlIGZvciBhbGwgY2hpbGRyZW5cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBhcHBseTNEVG9Db250YWluZXI6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICBwZXJzcGVjdGl2ZSAgICAgIDogODAwLFxuICAgICAgICBwZXJzcGVjdGl2ZU9yaWdpbjogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGx5IGJhc2ljIENTUyBwcm9wc1xuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5M0RUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB0cmFuc2Zvcm1TdHlsZSAgICA6IFwicHJlc2VydmUtM2RcIixcbiAgICAgICAgYmFja2ZhY2VWaXNpYmlsaXR5OiBcImhpZGRlblwiLFxuICAgICAgICB0cmFuc2Zvcm1PcmlnaW4gICA6ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBcHBseSBiYXNpYyAzZCBwcm9wcyBhbmQgc2V0IHVuaXF1ZSBwZXJzcGVjdGl2ZSBmb3IgY2hpbGRyZW5cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBhcHBseVVuaXF1ZTNEVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGVsLCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgdHJhbnNmb3JtU3R5bGUgICAgICA6IFwicHJlc2VydmUtM2RcIixcbiAgICAgICAgYmFja2ZhY2VWaXNpYmlsaXR5ICA6IFwiaGlkZGVuXCIsXG4gICAgICAgIHRyYW5zZm9ybVBlcnNwZWN0aXZlOiA2MDAsXG4gICAgICAgIHRyYW5zZm9ybU9yaWdpbiAgICAgOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG59O1xuIiwidmFyIE1lc3NhZ2VCb3hDcmVhdG9yID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfbWVzc2FnZUJveFZpZXcgPSByZXF1aXJlKCcuL01lc3NhZ2VCb3hWaWV3Jyk7XG5cbiAgZnVuY3Rpb24gYWxlcnQodGl0bGUsIG1lc3NhZ2UsIG1vZGFsLCBjYikge1xuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwPicgKyBtZXNzYWdlICsgJzwvcD4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5EQU5HRVIsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdDbG9zZScsXG4gICAgICAgICAgaWQgICAgIDogJ0Nsb3NlJyxcbiAgICAgICAgICB0eXBlICAgOiAnJyxcbiAgICAgICAgICBpY29uICAgOiAndGltZXMnLFxuICAgICAgICAgIG9uQ2xpY2s6IGNiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpcm0odGl0bGUsIG1lc3NhZ2UsIG9rQ0IsIG1vZGFsKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHA+JyArIG1lc3NhZ2UgKyAnPC9wPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdQcm9jZWVkJyxcbiAgICAgICAgICBpZCAgICAgOiAncHJvY2VlZCcsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbXB0KHRpdGxlLCBtZXNzYWdlLCBva0NCLCBtb2RhbCkge1xuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwIGNsYXNzPVwidGV4dC1jZW50ZXIgcGFkZGluZy1ib3R0b20tZG91YmxlXCI+JyArIG1lc3NhZ2UgKyAnPC9wPjx0ZXh0YXJlYSBuYW1lPVwicmVzcG9uc2VcIiBjbGFzcz1cImlucHV0LXRleHRcIiB0eXBlPVwidGV4dFwiIHN0eWxlPVwid2lkdGg6NDAwcHg7IGhlaWdodDo3NXB4OyByZXNpemU6IG5vbmVcIiBhdXRvZm9jdXM9XCJ0cnVlXCI+PC90ZXh0YXJlYT4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA0NTAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXG4gICAgICAgICAgaWQgICA6ICdDYW5jZWwnLFxuICAgICAgICAgIHR5cGUgOiAnbmVnYXRpdmUnLFxuICAgICAgICAgIGljb24gOiAndGltZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnUHJvY2VlZCcsXG4gICAgICAgICAgaWQgICAgIDogJ3Byb2NlZWQnLFxuICAgICAgICAgIHR5cGUgICA6ICdwb3NpdGl2ZScsXG4gICAgICAgICAgaWNvbiAgIDogJ2NoZWNrJyxcbiAgICAgICAgICBvbkNsaWNrOiBva0NCXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNob2ljZSh0aXRsZSwgbWVzc2FnZSwgc2VsZWN0aW9ucywgb2tDQiwgbW9kYWwpIHtcbiAgICB2YXIgc2VsZWN0SFRNTCA9ICc8c2VsZWN0IGNsYXNzPVwic3BhY2VkXCIgc3R5bGU9XCJ3aWR0aDo0NTBweDtoZWlnaHQ6MjAwcHhcIiBuYW1lPVwic2VsZWN0aW9uXCIgYXV0b2ZvY3VzPVwidHJ1ZVwiIHNpemU9XCIyMFwiPic7XG5cbiAgICBzZWxlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24gKG9wdCkge1xuICAgICAgc2VsZWN0SFRNTCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBvcHQudmFsdWUgKyAnXCIgJyArIChvcHQuc2VsZWN0ZWQgPT09ICd0cnVlJyA/ICdzZWxlY3RlZCcgOiAnJykgKyAnPicgKyBvcHQubGFiZWwgKyAnPC9vcHRpb24+JztcbiAgICB9KTtcblxuICAgIHNlbGVjdEhUTUwgKz0gJzwvc2VsZWN0Pic7XG5cbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cCBjbGFzcz1cInRleHQtY2VudGVyIHBhZGRpbmctYm90dG9tLWRvdWJsZVwiPicgKyBtZXNzYWdlICsgJzwvcD48ZGl2IGNsYXNzPVwidGV4dC1jZW50ZXJcIj4nICsgc2VsZWN0SFRNTCArICc8L2Rpdj4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA1MDAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXG4gICAgICAgICAgaWQgICA6ICdDYW5jZWwnLFxuICAgICAgICAgIHR5cGUgOiAnbmVnYXRpdmUnLFxuICAgICAgICAgIGljb24gOiAndGltZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnT0snLFxuICAgICAgICAgIGlkICAgICA6ICdvaycsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBhbGVydCAgOiBhbGVydCxcbiAgICBjb25maXJtOiBjb25maXJtLFxuICAgIHByb21wdCA6IHByb21wdCxcbiAgICBjaG9pY2UgOiBjaG9pY2VcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlQm94Q3JlYXRvcigpOyIsInZhciBNZXNzYWdlQm94VmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2NoaWxkcmVuICAgICAgICAgICAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgICAgICAgICAgID0gMCxcbiAgICAgIF9oaWdoZXN0WiAgICAgICAgICAgICAgID0gMTAwMCxcbiAgICAgIF9kZWZhdWx0V2lkdGggICAgICAgICAgID0gNDAwLFxuICAgICAgX3R5cGVzICAgICAgICAgICAgICAgICAgPSB7XG4gICAgICAgIERFRkFVTFQgICAgOiAnZGVmYXVsdCcsXG4gICAgICAgIElORk9STUFUSU9OOiAnaW5mb3JtYXRpb24nLFxuICAgICAgICBTVUNDRVNTICAgIDogJ3N1Y2Nlc3MnLFxuICAgICAgICBXQVJOSU5HICAgIDogJ3dhcm5pbmcnLFxuICAgICAgICBEQU5HRVIgICAgIDogJ2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfdHlwZVN0eWxlTWFwICAgICAgICAgICA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICdtZXNzYWdlYm94X19pbmZvcm1hdGlvbicsXG4gICAgICAgICdzdWNjZXNzJyAgICA6ICdtZXNzYWdlYm94X19zdWNjZXNzJyxcbiAgICAgICAgJ3dhcm5pbmcnICAgIDogJ21lc3NhZ2Vib3hfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAnbWVzc2FnZWJveF9fZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX2J1dHRvbkljb25UZW1wbGF0ZUlEICAgPSAndGVtcGxhdGVfX21lc3NhZ2Vib3gtLWJ1dHRvbi1pY29uJyxcbiAgICAgIF9idXR0b25Ob0ljb25UZW1wbGF0ZUlEID0gJ3RlbXBsYXRlX19tZXNzYWdlYm94LS1idXR0b24tbm9pY29uJyxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfbW9kYWwgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vTW9kYWxDb3ZlclZpZXcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKSxcbiAgICAgIF9jb21wb25lbnRVdGlscyAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBzZXQgdGhlIG1vdW50IHBvaW50IC8gYm94IGNvbnRhaW5lclxuICAgKiBAcGFyYW0gZWxJRFxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBuZXcgbWVzc2FnZSBib3hcbiAgICogQHBhcmFtIGluaXRPYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIHZhciB0eXBlICAgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQsXG4gICAgICAgIGJveE9iaiA9IGNyZWF0ZUJveE9iamVjdChpbml0T2JqKTtcblxuICAgIC8vIHNldHVwXG4gICAgX2NoaWxkcmVuLnB1c2goYm94T2JqKTtcbiAgICBfbW91bnRQb2ludC5hcHBlbmRDaGlsZChib3hPYmouZWxlbWVudCk7XG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGJveE9iai5lbGVtZW50KTtcbiAgICBjb25maWd1cmVCdXR0b25zKGJveE9iaik7XG5cbiAgICBfY29tcG9uZW50VXRpbHMuYXBwbHlVbmlxdWUzRFRvRWxlbWVudChib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBTZXQgM2QgQ1NTIHByb3BzIGZvciBpbi9vdXQgdHJhbnNpdGlvblxuICAgIFR3ZWVuTGl0ZS5zZXQoYm94T2JqLmVsZW1lbnQsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB6SW5kZXg6IF9oaWdoZXN0WixcbiAgICAgICAgd2lkdGggOiBpbml0T2JqLndpZHRoID8gaW5pdE9iai53aWR0aCA6IF9kZWZhdWx0V2lkdGhcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNlbnRlciBhZnRlciB3aWR0aCBoYXMgYmVlbiBzZXRcbiAgICBfZG9tVXRpbHMuY2VudGVyRWxlbWVudEluVmlld1BvcnQoYm94T2JqLmVsZW1lbnQpO1xuXG4gICAgLy8gTWFrZSBpdCBkcmFnZ2FibGVcbiAgICBEcmFnZ2FibGUuY3JlYXRlKCcjJyArIGJveE9iai5pZCwge1xuICAgICAgYm91bmRzIDogd2luZG93LFxuICAgICAgb25QcmVzczogZnVuY3Rpb24gKCkge1xuICAgICAgICBfaGlnaGVzdFogPSBEcmFnZ2FibGUuekluZGV4O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU2hvdyBpdFxuICAgIHRyYW5zaXRpb25Jbihib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBTaG93IHRoZSBtb2RhbCBjb3ZlclxuICAgIGlmIChpbml0T2JqLm1vZGFsKSB7XG4gICAgICBfbW9kYWwuc2hvd05vbkRpc21pc3NhYmxlKHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiBib3hPYmouaWQ7XG4gIH1cblxuICAvKipcbiAgICogQXNzaWduIGEgdHlwZSBjbGFzcyB0byBpdFxuICAgKiBAcGFyYW0gdHlwZVxuICAgKiBAcGFyYW0gZWxlbWVudFxuICAgKi9cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgb2JqZWN0IGZvciBhIGJveFxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcmV0dXJucyB7e2RhdGFPYmo6ICosIGlkOiBzdHJpbmcsIG1vZGFsOiAoKnxib29sZWFuKSwgZWxlbWVudDogKiwgc3RyZWFtczogQXJyYXl9fVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQm94T2JqZWN0KGluaXRPYmopIHtcbiAgICB2YXIgaWQgID0gJ2pzX19tZXNzYWdlYm94LScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGRhdGFPYmo6IGluaXRPYmosXG4gICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgbW9kYWwgIDogaW5pdE9iai5tb2RhbCxcbiAgICAgICAgICBlbGVtZW50OiBfdGVtcGxhdGUuYXNFbGVtZW50KCd0ZW1wbGF0ZV9fbWVzc2FnZWJveC0tZGVmYXVsdCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogaW5pdE9iai50aXRsZSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IGluaXRPYmouY29udGVudFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHN0cmVhbXM6IFtdXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB1cCB0aGUgYnV0dG9uc1xuICAgKiBAcGFyYW0gYm94T2JqXG4gICAqL1xuICBmdW5jdGlvbiBjb25maWd1cmVCdXR0b25zKGJveE9iaikge1xuICAgIHZhciBidXR0b25EYXRhID0gYm94T2JqLmRhdGFPYmouYnV0dG9ucztcblxuICAgIC8vIGRlZmF1bHQgYnV0dG9uIGlmIG5vbmVcbiAgICBpZiAoIWJ1dHRvbkRhdGEpIHtcbiAgICAgIGJ1dHRvbkRhdGEgPSBbe1xuICAgICAgICBsYWJlbDogJ0Nsb3NlJyxcbiAgICAgICAgdHlwZSA6ICcnLFxuICAgICAgICBpY29uIDogJ3RpbWVzJyxcbiAgICAgICAgaWQgICA6ICdkZWZhdWx0LWNsb3NlJ1xuICAgICAgfV07XG4gICAgfVxuXG4gICAgdmFyIGJ1dHRvbkNvbnRhaW5lciA9IGJveE9iai5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mb290ZXItYnV0dG9ucycpO1xuXG4gICAgX2RvbVV0aWxzLnJlbW92ZUFsbEVsZW1lbnRzKGJ1dHRvbkNvbnRhaW5lcik7XG5cbiAgICBidXR0b25EYXRhLmZvckVhY2goZnVuY3Rpb24gbWFrZUJ1dHRvbihidXR0b25PYmopIHtcbiAgICAgIGJ1dHRvbk9iai5pZCA9IGJveE9iai5pZCArICctYnV0dG9uLScgKyBidXR0b25PYmouaWQ7XG5cbiAgICAgIHZhciBidXR0b25FbDtcblxuICAgICAgaWYgKGJ1dHRvbk9iai5oYXNPd25Qcm9wZXJ0eSgnaWNvbicpKSB7XG4gICAgICAgIGJ1dHRvbkVsID0gX3RlbXBsYXRlLmFzRWxlbWVudChfYnV0dG9uSWNvblRlbXBsYXRlSUQsIGJ1dHRvbk9iaik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBidXR0b25FbCA9IF90ZW1wbGF0ZS5hc0VsZW1lbnQoX2J1dHRvbk5vSWNvblRlbXBsYXRlSUQsIGJ1dHRvbk9iaik7XG4gICAgICB9XG5cbiAgICAgIGJ1dHRvbkNvbnRhaW5lci5hcHBlbmRDaGlsZChidXR0b25FbCk7XG5cbiAgICAgIHZhciBidG5TdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChidXR0b25FbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSlcbiAgICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKGJ1dHRvbk9iai5oYXNPd25Qcm9wZXJ0eSgnb25DbGljaycpKSB7XG4gICAgICAgICAgICBpZiAoYnV0dG9uT2JqLm9uQ2xpY2spIHtcbiAgICAgICAgICAgICAgYnV0dG9uT2JqLm9uQ2xpY2suY2FsbCh0aGlzLCBjYXB0dXJlRm9ybURhdGEoYm94T2JqLmlkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbW92ZShib3hPYmouaWQpO1xuICAgICAgICB9KTtcbiAgICAgIGJveE9iai5zdHJlYW1zLnB1c2goYnRuU3RyZWFtKTtcbiAgICB9KTtcblxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgZGF0YSBmcm9tIHRoZSBmb3JtIG9uIHRoZSBib3ggY29udGVudHNcbiAgICogQHBhcmFtIGJveElEXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY2FwdHVyZUZvcm1EYXRhKGJveElEKSB7XG4gICAgcmV0dXJuIF9kb21VdGlscy5jYXB0dXJlRm9ybURhdGEoZ2V0T2JqQnlJRChib3hJRCkuZWxlbWVudCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgYm94IGZyb20gdGhlIHNjcmVlbiAvIGNvbnRhaW5lclxuICAgKiBAcGFyYW0gaWRcbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZShpZCkge1xuICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQoaWQpLFxuICAgICAgICBib3hPYmo7XG5cbiAgICBpZiAoaWR4ID4gLTEpIHtcbiAgICAgIGJveE9iaiA9IF9jaGlsZHJlbltpZHhdO1xuICAgICAgdHJhbnNpdGlvbk91dChib3hPYmouZWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgdGhlIGJveFxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMCwge2FscGhhOiAwLCByb3RhdGlvblg6IDQ1LCBzY2FsZTogMn0pO1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC41LCB7XG4gICAgICBhbHBoYSAgICA6IDEsXG4gICAgICByb3RhdGlvblg6IDAsXG4gICAgICBzY2FsZSAgICA6IDEsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgYm94XG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4yNSwge1xuICAgICAgYWxwaGEgICAgOiAwLFxuICAgICAgcm90YXRpb25YOiAtNDUsXG4gICAgICBzY2FsZSAgICA6IDAuMjUsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZUluLCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbiB1cCBhZnRlciB0aGUgdHJhbnNpdGlvbiBvdXQgYW5pbWF0aW9uXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpIHtcbiAgICB2YXIgaWR4ICAgID0gZ2V0T2JqSW5kZXhCeUlEKGVsLmdldEF0dHJpYnV0ZSgnaWQnKSksXG4gICAgICAgIGJveE9iaiA9IF9jaGlsZHJlbltpZHhdO1xuXG4gICAgYm94T2JqLnN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICBzdHJlYW0uZGlzcG9zZSgpO1xuICAgIH0pO1xuXG4gICAgRHJhZ2dhYmxlLmdldCgnIycgKyBib3hPYmouaWQpLmRpc2FibGUoKTtcblxuICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKGVsKTtcblxuICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG5cbiAgICBjaGVja01vZGFsU3RhdHVzKCk7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIGFueSBvcGVuIGJveGVzIGhhdmUgbW9kYWwgdHJ1ZVxuICAgKi9cbiAgZnVuY3Rpb24gY2hlY2tNb2RhbFN0YXR1cygpIHtcbiAgICB2YXIgaXNNb2RhbCA9IGZhbHNlO1xuXG4gICAgX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGJveE9iaikge1xuICAgICAgaWYgKGJveE9iai5tb2RhbCA9PT0gdHJ1ZSkge1xuICAgICAgICBpc01vZGFsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICghaXNNb2RhbCkge1xuICAgICAgX21vZGFsLmhpZGUodHJ1ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFV0aWxpdHkgdG8gZ2V0IHRoZSBib3ggb2JqZWN0IGluZGV4IGJ5IElEXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0T2JqSW5kZXhCeUlEKGlkKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQuaWQ7XG4gICAgfSkuaW5kZXhPZihpZCk7XG4gIH1cblxuICAvKipcbiAgICogVXRpbGl0eSB0byBnZXQgdGhlIGJveCBvYmplY3QgYnkgSURcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmpCeUlEKGlkKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQuaWQgPT09IGlkO1xuICAgIH0pWzBdO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZUJveFZpZXcoKTsiLCJ2YXIgTW9kYWxDb3ZlclZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tb3VudFBvaW50ICA9IGRvY3VtZW50LFxuICAgICAgX21vZGFsQ292ZXJFbCxcbiAgICAgIF9tb2RhbEJhY2tncm91bmRFbCxcbiAgICAgIF9tb2RhbENsb3NlQnV0dG9uRWwsXG4gICAgICBfbW9kYWxDbGlja1N0cmVhbSxcbiAgICAgIF9pc1Zpc2libGUsXG4gICAgICBfbm90RGlzbWlzc2libGUsXG4gICAgICBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG5cbiAgICBfaXNWaXNpYmxlID0gdHJ1ZTtcblxuICAgIF9tb2RhbENvdmVyRWwgICAgICAgPSBfbW91bnRQb2ludC5nZXRFbGVtZW50QnlJZCgnbW9kYWxfX2NvdmVyJyk7XG4gICAgX21vZGFsQmFja2dyb3VuZEVsICA9IF9tb3VudFBvaW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbF9fYmFja2dyb3VuZCcpO1xuICAgIF9tb2RhbENsb3NlQnV0dG9uRWwgPSBfbW91bnRQb2ludC5xdWVyeVNlbGVjdG9yKCcubW9kYWxfX2Nsb3NlLWJ1dHRvbicpO1xuXG4gICAgdmFyIG1vZGFsQkdDbGljayAgICAgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChfbW9kYWxCYWNrZ3JvdW5kRWwsIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpLFxuICAgICAgICBtb2RhbEJ1dHRvbkNsaWNrID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoX21vZGFsQ2xvc2VCdXR0b25FbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSk7XG5cbiAgICBfbW9kYWxDbGlja1N0cmVhbSA9IFJ4Lk9ic2VydmFibGUubWVyZ2UobW9kYWxCR0NsaWNrLCBtb2RhbEJ1dHRvbkNsaWNrKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uTW9kYWxDbGljaygpO1xuICAgICAgfSk7XG5cbiAgICBoaWRlKGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElzVmlzaWJsZSgpIHtcbiAgICByZXR1cm4gX2lzVmlzaWJsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uTW9kYWxDbGljaygpIHtcbiAgICBpZiAoX25vdERpc21pc3NpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGhpZGUodHJ1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKSB7XG4gICAgX2lzVmlzaWJsZSAgID0gdHJ1ZTtcbiAgICB2YXIgZHVyYXRpb24gPSBzaG91bGRBbmltYXRlID8gMC4yNSA6IDA7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhbHBoYTogMSxcbiAgICAgIGVhc2UgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3coc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NpYmxlID0gZmFsc2U7XG5cbiAgICBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKTtcblxuICAgIFR3ZWVuTGl0ZS5zZXQoX21vZGFsQ2xvc2VCdXR0b25FbCwge3NjYWxlOiAyLCBhbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAxLCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBzY2FsZSAgICA6IDEsXG4gICAgICBlYXNlICAgICA6IEJvdW5jZS5lYXNlT3V0LFxuICAgICAgZGVsYXkgICAgOiAxXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQSAnaGFyZCcgbW9kYWwgdmlldyBjYW5ub3QgYmUgZGlzbWlzc2VkIHdpdGggYSBjbGljaywgbXVzdCBiZSB2aWEgY29kZVxuICAgKiBAcGFyYW0gc2hvdWxkQW5pbWF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd05vbkRpc21pc3NhYmxlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoX2lzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ub3REaXNtaXNzaWJsZSA9IHRydWU7XG5cbiAgICBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgMCwge2F1dG9BbHBoYTogMH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZShzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKCFfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9pc1Zpc2libGUgICAgICA9IGZhbHNlO1xuICAgIF9ub3REaXNtaXNzaWJsZSA9IGZhbHNlO1xuICAgIHZhciBkdXJhdGlvbiAgICA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKF9tb2RhbENsb3NlQnV0dG9uRWwpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDb3ZlckVsLCBkdXJhdGlvbiwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgZHVyYXRpb24gLyAyLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRPcGFjaXR5KG9wYWNpdHkpIHtcbiAgICBpZiAob3BhY2l0eSA8IDAgfHwgb3BhY2l0eSA+IDEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdudWRvcnUvY29tcG9uZW50L01vZGFsQ292ZXJWaWV3OiBzZXRPcGFjaXR5OiBvcGFjaXR5IHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kIDEnKTtcbiAgICAgIG9wYWNpdHkgPSAxO1xuICAgIH1cbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCAwLjI1LCB7XG4gICAgICBhbHBoYTogb3BhY2l0eSxcbiAgICAgIGVhc2UgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldENvbG9yKHIsIGcsIGIpIHtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCAwLjI1LCB7XG4gICAgICBiYWNrZ3JvdW5kQ29sb3I6ICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJyxcbiAgICAgIGVhc2UgICAgICAgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemUgICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBzaG93ICAgICAgICAgICAgICA6IHNob3csXG4gICAgc2hvd05vbkRpc21pc3NhYmxlOiBzaG93Tm9uRGlzbWlzc2FibGUsXG4gICAgaGlkZSAgICAgICAgICAgICAgOiBoaWRlLFxuICAgIHZpc2libGUgICAgICAgICAgIDogZ2V0SXNWaXNpYmxlLFxuICAgIHNldE9wYWNpdHkgICAgICAgIDogc2V0T3BhY2l0eSxcbiAgICBzZXRDb2xvciAgICAgICAgICA6IHNldENvbG9yXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWxDb3ZlclZpZXcoKTsiLCJ2YXIgVG9hc3RWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgICAgICAgICAgID0gMCxcbiAgICAgIF9kZWZhdWx0RXhwaXJlRHVyYXRpb24gPSA3MDAwLFxuICAgICAgX3R5cGVzICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgPSB7XG4gICAgICAgICdkZWZhdWx0JyAgICA6ICcnLFxuICAgICAgICAnaW5mb3JtYXRpb24nOiAndG9hc3RfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ3RvYXN0X19zdWNjZXNzJyxcbiAgICAgICAgJ3dhcm5pbmcnICAgIDogJ3RvYXN0X193YXJuaW5nJyxcbiAgICAgICAgJ2RhbmdlcicgICAgIDogJ3RvYXN0X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfdGVtcGxhdGUgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfYnJvd3NlckluZm8gICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpLFxuICAgICAgX2NvbXBvbmVudFV0aWxzICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLy9vYmoudGl0bGUsIG9iai5jb250ZW50LCBvYmoudHlwZVxuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIGluaXRPYmoudHlwZSA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVDtcblxuICAgIHZhciB0b2FzdE9iaiA9IGNyZWF0ZVRvYXN0T2JqZWN0KGluaXRPYmoudGl0bGUsIGluaXRPYmoubWVzc2FnZSk7XG5cbiAgICBfY2hpbGRyZW4ucHVzaCh0b2FzdE9iaik7XG5cbiAgICBfbW91bnRQb2ludC5pbnNlcnRCZWZvcmUodG9hc3RPYmouZWxlbWVudCwgX21vdW50UG9pbnQuZmlyc3RDaGlsZCk7XG5cbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQoaW5pdE9iai50eXBlLCB0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIF9jb21wb25lbnRVdGlscy5hcHBseTNEVG9Db250YWluZXIoX21vdW50UG9pbnQpO1xuICAgIF9jb21wb25lbnRVdGlscy5hcHBseTNEVG9FbGVtZW50KHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgdmFyIGNsb3NlQnRuICAgICAgICAgPSB0b2FzdE9iai5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy50b2FzdF9faXRlbS1jb250cm9scyA+IGJ1dHRvbicpLFxuICAgICAgICBjbG9zZUJ0blN0ZWFtICAgID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoY2xvc2VCdG4sIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpLFxuICAgICAgICBleHBpcmVUaW1lU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbChfZGVmYXVsdEV4cGlyZUR1cmF0aW9uKTtcblxuICAgIHRvYXN0T2JqLmRlZmF1bHRCdXR0b25TdHJlYW0gPSBSeC5PYnNlcnZhYmxlLm1lcmdlKGNsb3NlQnRuU3RlYW0sIGV4cGlyZVRpbWVTdHJlYW0pLnRha2UoMSlcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKCkge1xuICAgICAgICByZW1vdmUodG9hc3RPYmouaWQpO1xuICAgICAgfSk7XG5cbiAgICB0cmFuc2l0aW9uSW4odG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICByZXR1cm4gdG9hc3RPYmouaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVUb2FzdE9iamVjdCh0aXRsZSwgbWVzc2FnZSkge1xuICAgIHZhciBpZCAgPSAnanNfX3RvYXN0LXRvYXN0aXRlbS0nICsgKF9jb3VudGVyKyspLnRvU3RyaW5nKCksXG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICBpZCAgICAgICAgICAgICAgICAgOiBpZCxcbiAgICAgICAgICBlbGVtZW50ICAgICAgICAgICAgOiBfdGVtcGxhdGUuYXNFbGVtZW50KCd0ZW1wbGF0ZV9fY29tcG9uZW50LS10b2FzdCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgZGVmYXVsdEJ1dHRvblN0cmVhbTogbnVsbFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShpZCkge1xuICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQoaWQpLFxuICAgICAgICB0b2FzdDtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgdG9hc3QgPSBfY2hpbGRyZW5baWR4XTtcbiAgICAgIHJlYXJyYW5nZShpZHgpO1xuICAgICAgdHJhbnNpdGlvbk91dCh0b2FzdC5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uSW4oZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAsIHthbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMSwge2FscGhhOiAxLCBlYXNlOiBRdWFkLmVhc2VPdXR9KTtcbiAgICByZWFycmFuZ2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25PdXQoZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuMjUsIHtcbiAgICAgIHJvdGF0aW9uWDogLTQ1LFxuICAgICAgYWxwaGEgICAgOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VJbiwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgICAgID0gZ2V0T2JqSW5kZXhCeUlEKGVsLmdldEF0dHJpYnV0ZSgnaWQnKSksXG4gICAgICAgIHRvYXN0T2JqICAgPSBfY2hpbGRyZW5baWR4XTtcblxuICAgIHRvYXN0T2JqLmRlZmF1bHRCdXR0b25TdHJlYW0uZGlzcG9zZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFycmFuZ2UoaWdub3JlKSB7XG4gICAgdmFyIGkgPSBfY2hpbGRyZW4ubGVuZ3RoIC0gMSxcbiAgICAgICAgY3VycmVudCxcbiAgICAgICAgeSA9IDA7XG5cbiAgICBmb3IgKDsgaSA+IC0xOyBpLS0pIHtcbiAgICAgIGlmIChpID09PSBpZ25vcmUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjdXJyZW50ID0gX2NoaWxkcmVuW2ldO1xuICAgICAgVHdlZW5MaXRlLnRvKGN1cnJlbnQuZWxlbWVudCwgMC43NSwge3k6IHksIGVhc2U6IEJvdW5jZS5lYXNlT3V0fSk7XG4gICAgICB5ICs9IDEwICsgY3VycmVudC5lbGVtZW50LmNsaWVudEhlaWdodDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvYXN0VmlldygpOyIsInZhciBUb29sVGlwVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2NoaWxkcmVuICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICA9IDAsXG4gICAgICBfZGVmYXVsdFdpZHRoID0gMjAwLFxuICAgICAgX3R5cGVzICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJyxcbiAgICAgICAgQ09BQ0hNQVJLICA6ICdjb2FjaG1hcmsnXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICd0b29sdGlwX19pbmZvcm1hdGlvbicsXG4gICAgICAgICdzdWNjZXNzJyAgICA6ICd0b29sdGlwX19zdWNjZXNzJyxcbiAgICAgICAgJ3dhcm5pbmcnICAgIDogJ3Rvb2x0aXBfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAndG9vbHRpcF9fZGFuZ2VyJyxcbiAgICAgICAgJ2NvYWNobWFyaycgIDogJ3Rvb2x0aXBfX2NvYWNobWFyaydcbiAgICAgIH0sXG4gICAgICBfcG9zaXRpb25zICAgID0ge1xuICAgICAgICBUIDogJ1QnLFxuICAgICAgICBUUjogJ1RSJyxcbiAgICAgICAgUiA6ICdSJyxcbiAgICAgICAgQlI6ICdCUicsXG4gICAgICAgIEIgOiAnQicsXG4gICAgICAgIEJMOiAnQkwnLFxuICAgICAgICBMIDogJ0wnLFxuICAgICAgICBUTDogJ1RMJ1xuICAgICAgfSxcbiAgICAgIF9wb3NpdGlvbk1hcCAgPSB7XG4gICAgICAgICdUJyA6ICd0b29sdGlwX190b3AnLFxuICAgICAgICAnVFInOiAndG9vbHRpcF9fdG9wcmlnaHQnLFxuICAgICAgICAnUicgOiAndG9vbHRpcF9fcmlnaHQnLFxuICAgICAgICAnQlInOiAndG9vbHRpcF9fYm90dG9tcmlnaHQnLFxuICAgICAgICAnQicgOiAndG9vbHRpcF9fYm90dG9tJyxcbiAgICAgICAgJ0JMJzogJ3Rvb2x0aXBfX2JvdHRvbWxlZnQnLFxuICAgICAgICAnTCcgOiAndG9vbHRpcF9fbGVmdCcsXG4gICAgICAgICdUTCc6ICd0b29sdGlwX190b3BsZWZ0J1xuICAgICAgfSxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX3RlbXBsYXRlICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8vb2JqLnRpdGxlLCBvYmouY29udGVudCwgb2JqLnR5cGUsIG9iai50YXJnZXQsIG9iai5wb3NpdGlvblxuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIGluaXRPYmoudHlwZSA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVDtcblxuICAgIHZhciB0b29sdGlwT2JqID0gY3JlYXRlVG9vbFRpcE9iamVjdChpbml0T2JqLnRpdGxlLFxuICAgICAgaW5pdE9iai5jb250ZW50LFxuICAgICAgaW5pdE9iai5wb3NpdGlvbixcbiAgICAgIGluaXRPYmoudGFyZ2V0RWwsXG4gICAgICBpbml0T2JqLmd1dHRlcixcbiAgICAgIGluaXRPYmouYWx3YXlzVmlzaWJsZSk7XG5cbiAgICBfY2hpbGRyZW4ucHVzaCh0b29sdGlwT2JqKTtcbiAgICBfbW91bnRQb2ludC5hcHBlbmRDaGlsZCh0b29sdGlwT2JqLmVsZW1lbnQpO1xuXG4gICAgdG9vbHRpcE9iai5hcnJvd0VsID0gdG9vbHRpcE9iai5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudChpbml0T2JqLnR5cGUsIGluaXRPYmoucG9zaXRpb24sIHRvb2x0aXBPYmouZWxlbWVudCk7XG5cbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouZWxlbWVudCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIGF1dG9BbHBoYTogdG9vbHRpcE9iai5hbHdheXNWaXNpYmxlID8gMSA6IDAsXG4gICAgICAgIHdpZHRoICAgIDogaW5pdE9iai53aWR0aCA/IGluaXRPYmoud2lkdGggOiBfZGVmYXVsdFdpZHRoXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBjYWNoZSB0aGVzZSB2YWx1ZXMsIDNkIHRyYW5zZm9ybXMgd2lsbCBhbHRlciBzaXplXG4gICAgdG9vbHRpcE9iai53aWR0aCAgPSB0b29sdGlwT2JqLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGg7XG4gICAgdG9vbHRpcE9iai5oZWlnaHQgPSB0b29sdGlwT2JqLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuXG4gICAgYXNzaWduRXZlbnRzVG9UYXJnZXRFbCh0b29sdGlwT2JqKTtcbiAgICBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaik7XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5MIHx8IHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuUikge1xuICAgICAgY2VudGVyQXJyb3dWZXJ0aWNhbGx5KHRvb2x0aXBPYmopO1xuICAgIH1cblxuICAgIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlQgfHwgdG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CKSB7XG4gICAgICBjZW50ZXJBcnJvd0hvcml6b250YWxseSh0b29sdGlwT2JqKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdG9vbHRpcE9iai5lbGVtZW50O1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIHBvc2l0aW9uLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3Bvc2l0aW9uTWFwW3Bvc2l0aW9uXSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVUb29sVGlwT2JqZWN0KHRpdGxlLCBtZXNzYWdlLCBwb3NpdGlvbiwgdGFyZ2V0LCBndXR0ZXIsIGFsd2F5c1Zpc2libGUpIHtcbiAgICB2YXIgaWQgID0gJ2pzX190b29sdGlwLXRvb2x0aXBpdGVtLScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGlkICAgICAgICAgICA6IGlkLFxuICAgICAgICAgIHBvc2l0aW9uICAgICA6IHBvc2l0aW9uLFxuICAgICAgICAgIHRhcmdldEVsICAgICA6IHRhcmdldCxcbiAgICAgICAgICBhbHdheXNWaXNpYmxlOiBhbHdheXNWaXNpYmxlIHx8IGZhbHNlLFxuICAgICAgICAgIGd1dHRlciAgICAgICA6IGd1dHRlciB8fCAxNSxcbiAgICAgICAgICBlbE92ZXJTdHJlYW0gOiBudWxsLFxuICAgICAgICAgIGVsT3V0U3RyZWFtICA6IG51bGwsXG4gICAgICAgICAgaGVpZ2h0ICAgICAgIDogMCxcbiAgICAgICAgICB3aWR0aCAgICAgICAgOiAwLFxuICAgICAgICAgIGVsZW1lbnQgICAgICA6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ3RlbXBsYXRlX19jb21wb25lbnQtLXRvb2x0aXAnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGFycm93RWwgICAgICA6IG51bGxcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopIHtcbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdG9vbHRpcE9iai5lbE92ZXJTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh0b29sdGlwT2JqLnRhcmdldEVsLCAnbW91c2VvdmVyJylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBzaG93VG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuXG4gICAgdG9vbHRpcE9iai5lbE91dFN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW91dCcpXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgaGlkZVRvb2xUaXAodG9vbHRpcE9iai5pZCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dUb29sVGlwKGlkKSB7XG4gICAgdmFyIHRvb2x0aXBPYmogPSBnZXRPYmpCeUlEKGlkKTtcblxuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaik7XG4gICAgdHJhbnNpdGlvbkluKHRvb2x0aXBPYmouZWxlbWVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaikge1xuICAgIHZhciBndXR0ZXIgICA9IHRvb2x0aXBPYmouZ3V0dGVyLFxuICAgICAgICB4UG9zICAgICA9IDAsXG4gICAgICAgIHlQb3MgICAgID0gMCxcbiAgICAgICAgdGd0UHJvcHMgPSB0b29sdGlwT2JqLnRhcmdldEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVEwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgKyAoKHRndFByb3BzLndpZHRoIC8gMikgLSAodG9vbHRpcE9iai53aWR0aCAvIDIpKTtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodCAtIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVFIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0ICsgZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkJSKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQ7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbSArIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aCAtIGd1dHRlcjtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgKyAoKHRndFByb3BzLmhlaWdodCAvIDIpIC0gKHRvb2x0aXBPYmouaGVpZ2h0IC8gMikpO1xuICAgIH1cblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICB4OiB4UG9zLFxuICAgICAgeTogeVBvc1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dIb3Jpem9udGFsbHkodG9vbHRpcE9iaikge1xuICAgIHZhciBhcnJvd1Byb3BzID0gdG9vbHRpcE9iai5hcnJvd0VsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5hcnJvd0VsLCB7eDogKHRvb2x0aXBPYmoud2lkdGggLyAyKSAtIChhcnJvd1Byb3BzLndpZHRoIC8gMil9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNlbnRlckFycm93VmVydGljYWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt5OiAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSAtIChhcnJvd1Byb3BzLmhlaWdodCAvIDIpIC0gMn0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZVRvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyYW5zaXRpb25PdXQodG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC41LCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4wNSwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShlbCkge1xuICAgIGdldE9iakJ5RWxlbWVudChlbCkuZm9yRWFjaChmdW5jdGlvbiAodG9vbHRpcCkge1xuICAgICAgaWYgKHRvb2x0aXAuZWxPdmVyU3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdmVyU3RyZWFtLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b29sdGlwLmVsT3V0U3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdXRTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuXG4gICAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQodG9vbHRpcC5pZCk7XG5cbiAgICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5RWxlbWVudChlbCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLnRhcmdldEVsID09PSBlbDtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQb3NpdGlvbnMoKSB7XG4gICAgcmV0dXJuIF9wb3NpdGlvbnM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlcyxcbiAgICBwb3NpdGlvbiAgOiBnZXRQb3NpdGlvbnNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sVGlwVmlldygpOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGlzSW50ZWdlcjogZnVuY3Rpb24gKHN0cikge1xuICAgIHJldHVybiAoL14tP1xcZCskLy50ZXN0KHN0cikpO1xuICB9LFxuXG4gIHJuZE51bWJlcjogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gIH0sXG5cbiAgY2xhbXA6IGZ1bmN0aW9uICh2YWwsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIE1hdGgubWF4KG1pbiwgTWF0aC5taW4obWF4LCB2YWwpKTtcbiAgfSxcblxuICBpblJhbmdlOiBmdW5jdGlvbiAodmFsLCBtaW4sIG1heCkge1xuICAgIHJldHVybiB2YWwgPiBtaW4gJiYgdmFsIDwgbWF4O1xuICB9LFxuXG4gIGRpc3RhbmNlVEw6IGZ1bmN0aW9uIChwb2ludDEsIHBvaW50Mikge1xuICAgIHZhciB4ZCA9IChwb2ludDIubGVmdCAtIHBvaW50MS5sZWZ0KSxcbiAgICAgICAgeWQgPSAocG9pbnQyLnRvcCAtIHBvaW50MS50b3ApO1xuICAgIHJldHVybiBNYXRoLnNxcnQoKHhkICogeGQpICsgKHlkICogeWQpKTtcbiAgfVxuXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBUZXN0IGZvclxuICAgKiBPYmplY3Qge1wiXCI6IHVuZGVmaW5lZH1cbiAgICogT2JqZWN0IHt1bmRlZmluZWQ6IHVuZGVmaW5lZH1cbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzTnVsbDogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBpc251bGwgPSBmYWxzZTtcblxuICAgIGlmIChpcy5mYWxzZXkob2JqKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgIGlmIChwcm9wID09PSB1bmRlZmluZWQgfHwgb2JqW3Byb3BdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaXNudWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBpc251bGw7XG4gIH0sXG5cbiAgZHluYW1pY1NvcnQ6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIGFbcHJvcGVydHldIDwgYltwcm9wZXJ0eV0gPyAtMSA6IGFbcHJvcGVydHldID4gYltwcm9wZXJ0eV0gPyAxIDogMDtcbiAgICB9O1xuICB9LFxuXG4gIHNlYXJjaE9iamVjdHM6IGZ1bmN0aW9uIChvYmosIGtleSwgdmFsKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmpbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9iamVjdHMgPSBvYmplY3RzLmNvbmNhdChzZWFyY2hPYmplY3RzKG9ialtpXSwga2V5LCB2YWwpKTtcbiAgICAgIH0gZWxzZSBpZiAoaSA9PT0ga2V5ICYmIG9ialtrZXldID09PSB2YWwpIHtcbiAgICAgICAgb2JqZWN0cy5wdXNoKG9iaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzO1xuICB9LFxuXG4gIGdldE9iamVjdEZyb21TdHJpbmc6IGZ1bmN0aW9uIChvYmosIHN0cikge1xuICAgIHZhciBpICAgID0gMCxcbiAgICAgICAgcGF0aCA9IHN0ci5zcGxpdCgnLicpLFxuICAgICAgICBsZW4gID0gcGF0aC5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBvYmogPSBvYmpbcGF0aFtpXV07XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgZ2V0T2JqZWN0SW5kZXhGcm9tSWQ6IGZ1bmN0aW9uIChvYmosIGlkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqW2ldICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBvYmpbaV0uaWQgIT09IFwidW5kZWZpbmVkXCIgJiYgb2JqW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvLyBleHRlbmQgYW5kIGRlZXAgZXh0ZW5kIGZyb20gaHR0cDovL3lvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb20vXG4gIGV4dGVuZDogZnVuY3Rpb24gKG91dCkge1xuICAgIG91dCA9IG91dCB8fCB7fTtcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50c1tpXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBvdXRba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICBkZWVwRXh0ZW5kOiBmdW5jdGlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBvYmogPSBhcmd1bWVudHNbaV07XG5cbiAgICAgIGlmICghb2JqKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2Ygb2JqW2tleV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBkZWVwRXh0ZW5kKG91dFtrZXldLCBvYmpba2V5XSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dFtrZXldID0gb2JqW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICAvKipcbiAgICogU2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbiBvZiBTdGFtcHMgLSBodHRwOi8vZXJpY2xlYWRzLmNvbS8yMDE0LzAyL3Byb3RvdHlwYWwtaW5oZXJpdGFuY2Utd2l0aC1zdGFtcHMvXG4gICAqIGh0dHBzOi8vd3d3LmJhcmt3ZWIuY28udWsvYmxvZy9vYmplY3QtY29tcG9zaXRpb24tYW5kLXByb3RvdHlwaWNhbC1pbmhlcml0YW5jZS1pbi1qYXZhc2NyaXB0XG4gICAqXG4gICAqIFByb3RvdHlwZSBvYmplY3QgcmVxdWlyZXMgYSBtZXRob2RzIG9iamVjdCwgcHJpdmF0ZSBjbG9zdXJlcyBhbmQgc3RhdGUgaXMgb3B0aW9uYWxcbiAgICpcbiAgICogQHBhcmFtIHByb3RvdHlwZVxuICAgKiBAcmV0dXJucyBOZXcgb2JqZWN0IHVzaW5nIHByb3RvdHlwZS5tZXRob2RzIGFzIHNvdXJjZVxuICAgKi9cbiAgYmFzaWNGYWN0b3J5OiBmdW5jdGlvbiAocHJvdG90eXBlKSB7XG4gICAgdmFyIHByb3RvID0gcHJvdG90eXBlLFxuICAgICAgICBvYmogICA9IE9iamVjdC5jcmVhdGUocHJvdG8ubWV0aG9kcyk7XG5cbiAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkoJ2Nsb3N1cmUnKSkge1xuICAgICAgcHJvdG8uY2xvc3VyZXMuZm9yRWFjaChmdW5jdGlvbiAoY2xvc3VyZSkge1xuICAgICAgICBjbG9zdXJlLmNhbGwob2JqKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnc3RhdGUnKSkge1xuICAgICAgZm9yICh2YXIga2V5IGluIHByb3RvLnN0YXRlKSB7XG4gICAgICAgIG9ialtrZXldID0gcHJvdG8uc3RhdGVba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gICAqXG4gICAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gICAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAgICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gICAqXG4gICAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICAgKlxuICAgKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gICAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAgICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gICAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAgICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gICAqXG4gICAqL1xuICAvKipcbiAgICogQ29uc3RydWN0cyBhbiBlbnVtZXJhdGlvbiB3aXRoIGtleXMgZXF1YWwgdG8gdGhlaXIgdmFsdWUuXG4gICAqXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9TVFJNTC9rZXltaXJyb3JcbiAgICpcbiAgICogRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqICAgdmFyIENPTE9SUyA9IGtleU1pcnJvcih7Ymx1ZTogbnVsbCwgcmVkOiBudWxsfSk7XG4gICAqICAgdmFyIG15Q29sb3IgPSBDT0xPUlMuYmx1ZTtcbiAgICogICB2YXIgaXNDb2xvclZhbGlkID0gISFDT0xPUlNbbXlDb2xvcl07XG4gICAqXG4gICAqIFRoZSBsYXN0IGxpbmUgY291bGQgbm90IGJlIHBlcmZvcm1lZCBpZiB0aGUgdmFsdWVzIG9mIHRoZSBnZW5lcmF0ZWQgZW51bSB3ZXJlXG4gICAqIG5vdCBlcXVhbCB0byB0aGVpciBrZXlzLlxuICAgKlxuICAgKiAgIElucHV0OiAge2tleTE6IHZhbDEsIGtleTI6IHZhbDJ9XG4gICAqICAgT3V0cHV0OiB7a2V5MToga2V5MSwga2V5Mjoga2V5Mn1cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IG9ialxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqL1xuICBrZXlNaXJyb3I6IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcmV0ID0ge307XG4gICAgdmFyIGtleTtcbiAgICBpZiAoIShvYmogaW5zdGFuY2VvZiBPYmplY3QgJiYgIUFycmF5LmlzQXJyYXkob2JqKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigna2V5TWlycm9yKC4uLik6IEFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0LicpO1xuICAgIH1cbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXRba2V5XSA9IGtleTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG59OyIsIi8qKlxuICogIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG4hZnVuY3Rpb24odCxlKXtcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZT9tb2R1bGUuZXhwb3J0cz1lKCk6XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShlKTp0LkltbXV0YWJsZT1lKCl9KHRoaXMsZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiB0KHQsZSl7ZSYmKHQucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoZS5wcm90b3R5cGUpKSx0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj10fWZ1bmN0aW9uIGUodCl7cmV0dXJuIHQudmFsdWU9ITEsdH1mdW5jdGlvbiByKHQpe3QmJih0LnZhbHVlPSEwKX1mdW5jdGlvbiBuKCl7fWZ1bmN0aW9uIGkodCxlKXtlPWV8fDA7Zm9yKHZhciByPU1hdGgubWF4KDAsdC5sZW5ndGgtZSksbj1BcnJheShyKSxpPTA7cj5pO2krKyluW2ldPXRbaStlXTtyZXR1cm4gbn1mdW5jdGlvbiBvKHQpe3JldHVybiB2b2lkIDA9PT10LnNpemUmJih0LnNpemU9dC5fX2l0ZXJhdGUocykpLHQuc2l6ZX1mdW5jdGlvbiB1KHQsZSl7aWYoXCJudW1iZXJcIiE9dHlwZW9mIGUpe3ZhciByPWU+Pj4wO2lmKFwiXCIrciE9PWV8fDQyOTQ5NjcyOTU9PT1yKXJldHVybiBOYU47ZT1yfXJldHVybiAwPmU/byh0KStlOmV9ZnVuY3Rpb24gcygpe3JldHVybiEwfWZ1bmN0aW9uIGEodCxlLHIpe3JldHVybigwPT09dHx8dm9pZCAwIT09ciYmLXI+PXQpJiYodm9pZCAwPT09ZXx8dm9pZCAwIT09ciYmZT49cil9ZnVuY3Rpb24gaCh0LGUpe3JldHVybiBjKHQsZSwwKX1mdW5jdGlvbiBmKHQsZSl7cmV0dXJuIGModCxlLGUpfWZ1bmN0aW9uIGModCxlLHIpe3JldHVybiB2b2lkIDA9PT10P3I6MD50P01hdGgubWF4KDAsZSt0KTp2b2lkIDA9PT1lP3Q6TWF0aC5taW4oZSx0KX1mdW5jdGlvbiBfKHQpe3JldHVybiB5KHQpP3Q6Tyh0KX1mdW5jdGlvbiBwKHQpe3JldHVybiBkKHQpP3Q6eCh0KX1mdW5jdGlvbiB2KHQpe3JldHVybiBtKHQpP3Q6ayh0KX1mdW5jdGlvbiBsKHQpe3JldHVybiB5KHQpJiYhZyh0KT90OkEodCl9ZnVuY3Rpb24geSh0KXtyZXR1cm4hKCF0fHwhdFt2cl0pfWZ1bmN0aW9uIGQodCl7cmV0dXJuISghdHx8IXRbbHJdKX1mdW5jdGlvbiBtKHQpe3JldHVybiEoIXR8fCF0W3lyXSl9ZnVuY3Rpb24gZyh0KXtyZXR1cm4gZCh0KXx8bSh0KX1mdW5jdGlvbiB3KHQpe3JldHVybiEoIXR8fCF0W2RyXSl9ZnVuY3Rpb24gUyh0KXt0aGlzLm5leHQ9dH1mdW5jdGlvbiB6KHQsZSxyLG4pe3ZhciBpPTA9PT10P2U6MT09PXQ/cjpbZSxyXTtyZXR1cm4gbj9uLnZhbHVlPWk6bj17dmFsdWU6aSxkb25lOiExfSxufWZ1bmN0aW9uIEkoKXtyZXR1cm57dmFsdWU6dm9pZCAwLGRvbmU6ITB9fWZ1bmN0aW9uIGIodCl7cmV0dXJuISFNKHQpfWZ1bmN0aW9uIHEodCl7cmV0dXJuIHQmJlwiZnVuY3Rpb25cIj09dHlwZW9mIHQubmV4dH1mdW5jdGlvbiBEKHQpe3ZhciBlPU0odCk7cmV0dXJuIGUmJmUuY2FsbCh0KX1mdW5jdGlvbiBNKHQpe3ZhciBlPXQmJihTciYmdFtTcl18fHRbenJdKTtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiBlP2U6dm9pZCAwfWZ1bmN0aW9uIEUodCl7cmV0dXJuIHQmJlwibnVtYmVyXCI9PXR5cGVvZiB0Lmxlbmd0aH1mdW5jdGlvbiBPKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9UKCk6eSh0KT90LnRvU2VxKCk6Qyh0KX1mdW5jdGlvbiB4KHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9UKCkudG9LZXllZFNlcSgpOnkodCk/ZCh0KT90LnRvU2VxKCk6dC5mcm9tRW50cnlTZXEoKTpXKHQpfWZ1bmN0aW9uIGsodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP2QodCk/dC5lbnRyeVNlcSgpOnQudG9JbmRleGVkU2VxKCk6Qih0KX1mdW5jdGlvbiBBKHQpe3JldHVybihudWxsPT09dHx8dm9pZCAwPT09dD9UKCk6eSh0KT9kKHQpP3QuZW50cnlTZXEoKTp0OkIodCkpLnRvU2V0U2VxKCl9ZnVuY3Rpb24gaih0KXt0aGlzLl9hcnJheT10LHRoaXMuc2l6ZT10Lmxlbmd0aH1mdW5jdGlvbiBSKHQpe3ZhciBlPU9iamVjdC5rZXlzKHQpO3RoaXMuX29iamVjdD10LHRoaXMuX2tleXM9ZSxcbiAgdGhpcy5zaXplPWUubGVuZ3RofWZ1bmN0aW9uIFUodCl7dGhpcy5faXRlcmFibGU9dCx0aGlzLnNpemU9dC5sZW5ndGh8fHQuc2l6ZX1mdW5jdGlvbiBLKHQpe3RoaXMuX2l0ZXJhdG9yPXQsdGhpcy5faXRlcmF0b3JDYWNoZT1bXX1mdW5jdGlvbiBMKHQpe3JldHVybiEoIXR8fCF0W2JyXSl9ZnVuY3Rpb24gVCgpe3JldHVybiBxcnx8KHFyPW5ldyBqKFtdKSl9ZnVuY3Rpb24gVyh0KXt2YXIgZT1BcnJheS5pc0FycmF5KHQpP25ldyBqKHQpLmZyb21FbnRyeVNlcSgpOnEodCk/bmV3IEsodCkuZnJvbUVudHJ5U2VxKCk6Yih0KT9uZXcgVSh0KS5mcm9tRW50cnlTZXEoKTpcIm9iamVjdFwiPT10eXBlb2YgdD9uZXcgUih0KTp2b2lkIDA7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiBbaywgdl0gZW50cmllcywgb3Iga2V5ZWQgb2JqZWN0OiBcIit0KTtyZXR1cm4gZX1mdW5jdGlvbiBCKHQpe3ZhciBlPUoodCk7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiB2YWx1ZXM6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEModCl7dmFyIGU9Sih0KXx8XCJvYmplY3RcIj09dHlwZW9mIHQmJm5ldyBSKHQpO2lmKCFlKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBBcnJheSBvciBpdGVyYWJsZSBvYmplY3Qgb2YgdmFsdWVzLCBvciBrZXllZCBvYmplY3Q6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEoodCl7cmV0dXJuIEUodCk/bmV3IGoodCk6cSh0KT9uZXcgSyh0KTpiKHQpP25ldyBVKHQpOnZvaWQgMH1mdW5jdGlvbiBOKHQsZSxyLG4pe3ZhciBpPXQuX2NhY2hlO2lmKGkpe2Zvcih2YXIgbz1pLmxlbmd0aC0xLHU9MDtvPj11O3UrKyl7dmFyIHM9aVtyP28tdTp1XTtpZihlKHNbMV0sbj9zWzBdOnUsdCk9PT0hMSlyZXR1cm4gdSsxfXJldHVybiB1fXJldHVybiB0Ll9faXRlcmF0ZVVuY2FjaGVkKGUscil9ZnVuY3Rpb24gUCh0LGUscixuKXt2YXIgaT10Ll9jYWNoZTtpZihpKXt2YXIgbz1pLmxlbmd0aC0xLHU9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdD1pW3I/by11OnVdO3JldHVybiB1Kys+bz9JKCk6eihlLG4/dFswXTp1LTEsdFsxXSl9KX1yZXR1cm4gdC5fX2l0ZXJhdG9yVW5jYWNoZWQoZSxyKX1mdW5jdGlvbiBIKCl7dGhyb3cgVHlwZUVycm9yKFwiQWJzdHJhY3RcIil9ZnVuY3Rpb24gVigpe31mdW5jdGlvbiBZKCl7fWZ1bmN0aW9uIFEoKXt9ZnVuY3Rpb24gWCh0LGUpe2lmKHQ9PT1lfHx0IT09dCYmZSE9PWUpcmV0dXJuITA7aWYoIXR8fCFlKXJldHVybiExO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudmFsdWVPZiYmXCJmdW5jdGlvblwiPT10eXBlb2YgZS52YWx1ZU9mKXtpZih0PXQudmFsdWVPZigpLGU9ZS52YWx1ZU9mKCksdD09PWV8fHQhPT10JiZlIT09ZSlyZXR1cm4hMDtpZighdHx8IWUpcmV0dXJuITF9cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5lcXVhbHMmJlwiZnVuY3Rpb25cIj09dHlwZW9mIGUuZXF1YWxzJiZ0LmVxdWFscyhlKT8hMDohMX1mdW5jdGlvbiBGKHQsZSl7cmV0dXJuIGU/RyhlLHQsXCJcIix7XCJcIjp0fSk6Wih0KX1mdW5jdGlvbiBHKHQsZSxyLG4pe3JldHVybiBBcnJheS5pc0FycmF5KGUpP3QuY2FsbChuLHIsayhlKS5tYXAoZnVuY3Rpb24ocixuKXtyZXR1cm4gRyh0LHIsbixlKX0pKTokKGUpP3QuY2FsbChuLHIseChlKS5tYXAoZnVuY3Rpb24ocixuKXtyZXR1cm4gRyh0LHIsbixlKX0pKTplfWZ1bmN0aW9uIFoodCl7cmV0dXJuIEFycmF5LmlzQXJyYXkodCk/ayh0KS5tYXAoWikudG9MaXN0KCk6JCh0KT94KHQpLm1hcChaKS50b01hcCgpOnR9ZnVuY3Rpb24gJCh0KXtyZXR1cm4gdCYmKHQuY29uc3RydWN0b3I9PT1PYmplY3R8fHZvaWQgMD09PXQuY29uc3RydWN0b3IpfWZ1bmN0aW9uIHR0KHQpe3JldHVybiB0Pj4+MSYxMDczNzQxODI0fDMyMjEyMjU0NzEmdH1mdW5jdGlvbiBldCh0KXtpZih0PT09ITF8fG51bGw9PT10fHx2b2lkIDA9PT10KXJldHVybiAwO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudmFsdWVPZiYmKHQ9dC52YWx1ZU9mKCksXG4gIHQ9PT0hMXx8bnVsbD09PXR8fHZvaWQgMD09PXQpKXJldHVybiAwO2lmKHQ9PT0hMClyZXR1cm4gMTt2YXIgZT10eXBlb2YgdDtpZihcIm51bWJlclwiPT09ZSl7dmFyIHI9MHx0O2ZvcihyIT09dCYmKHJePTQyOTQ5NjcyOTUqdCk7dD40Mjk0OTY3Mjk1Oyl0Lz00Mjk0OTY3Mjk1LHJePXQ7cmV0dXJuIHR0KHIpfWlmKFwic3RyaW5nXCI9PT1lKXJldHVybiB0Lmxlbmd0aD5qcj9ydCh0KTpudCh0KTtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lmhhc2hDb2RlKXJldHVybiB0Lmhhc2hDb2RlKCk7aWYoXCJvYmplY3RcIj09PWUpcmV0dXJuIGl0KHQpO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudG9TdHJpbmcpcmV0dXJuIG50KFwiXCIrdCk7dGhyb3cgRXJyb3IoXCJWYWx1ZSB0eXBlIFwiK2UrXCIgY2Fubm90IGJlIGhhc2hlZC5cIil9ZnVuY3Rpb24gcnQodCl7dmFyIGU9S3JbdF07cmV0dXJuIHZvaWQgMD09PWUmJihlPW50KHQpLFVyPT09UnImJihVcj0wLEtyPXt9KSxVcisrLEtyW3RdPWUpLGV9ZnVuY3Rpb24gbnQodCl7Zm9yKHZhciBlPTAscj0wO3QubGVuZ3RoPnI7cisrKWU9MzEqZSt0LmNoYXJDb2RlQXQocil8MDtyZXR1cm4gdHQoZSl9ZnVuY3Rpb24gaXQodCl7dmFyIGU7aWYoeHImJihlPURyLmdldCh0KSx2b2lkIDAhPT1lKSlyZXR1cm4gZTtpZihlPXRbQXJdLHZvaWQgMCE9PWUpcmV0dXJuIGU7aWYoIU9yKXtpZihlPXQucHJvcGVydHlJc0VudW1lcmFibGUmJnQucHJvcGVydHlJc0VudW1lcmFibGVbQXJdLHZvaWQgMCE9PWUpcmV0dXJuIGU7aWYoZT1vdCh0KSx2b2lkIDAhPT1lKXJldHVybiBlfWlmKGU9KytrciwxMDczNzQxODI0JmtyJiYoa3I9MCkseHIpRHIuc2V0KHQsZSk7ZWxzZXtpZih2b2lkIDAhPT1FciYmRXIodCk9PT0hMSl0aHJvdyBFcnJvcihcIk5vbi1leHRlbnNpYmxlIG9iamVjdHMgYXJlIG5vdCBhbGxvd2VkIGFzIGtleXMuXCIpO2lmKE9yKU9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LEFyLHtlbnVtZXJhYmxlOiExLGNvbmZpZ3VyYWJsZTohMSx3cml0YWJsZTohMSx2YWx1ZTplfSk7ZWxzZSBpZih2b2lkIDAhPT10LnByb3BlcnR5SXNFbnVtZXJhYmxlJiZ0LnByb3BlcnR5SXNFbnVtZXJhYmxlPT09dC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUpdC5wcm9wZXJ0eUlzRW51bWVyYWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LHQucHJvcGVydHlJc0VudW1lcmFibGVbQXJdPWU7ZWxzZXtpZih2b2lkIDA9PT10Lm5vZGVUeXBlKXRocm93IEVycm9yKFwiVW5hYmxlIHRvIHNldCBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IG9uIG9iamVjdC5cIik7dFtBcl09ZX19cmV0dXJuIGV9ZnVuY3Rpb24gb3QodCl7aWYodCYmdC5ub2RlVHlwZT4wKXN3aXRjaCh0Lm5vZGVUeXBlKXtjYXNlIDE6cmV0dXJuIHQudW5pcXVlSUQ7Y2FzZSA5OnJldHVybiB0LmRvY3VtZW50RWxlbWVudCYmdC5kb2N1bWVudEVsZW1lbnQudW5pcXVlSUR9fWZ1bmN0aW9uIHV0KHQsZSl7aWYoIXQpdGhyb3cgRXJyb3IoZSl9ZnVuY3Rpb24gc3QodCl7dXQodCE9PTEvMCxcIkNhbm5vdCBwZXJmb3JtIHRoaXMgYWN0aW9uIHdpdGggYW4gaW5maW5pdGUgc2l6ZS5cIil9ZnVuY3Rpb24gYXQodCxlKXt0aGlzLl9pdGVyPXQsdGhpcy5fdXNlS2V5cz1lLHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gaHQodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gZnQodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gY3QodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gX3QodCl7dmFyIGU9anQodCk7cmV0dXJuIGUuX2l0ZXI9dCxlLnNpemU9dC5zaXplLGUuZmxpcD1mdW5jdGlvbigpe3JldHVybiB0fSxlLnJldmVyc2U9ZnVuY3Rpb24oKXt2YXIgZT10LnJldmVyc2UuYXBwbHkodGhpcyk7cmV0dXJuIGUuZmxpcD1mdW5jdGlvbigpe3JldHVybiB0LnJldmVyc2UoKX0sZX0sZS5oYXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSk7XG59LGUuaW5jbHVkZXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaGFzKGUpfSxlLmNhY2hlUmVzdWx0PVJ0LGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXt2YXIgbj10aGlzO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBlKHIsdCxuKSE9PSExfSxyKX0sZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXtpZihlPT09d3Ipe3ZhciBuPXQuX19pdGVyYXRvcihlLHIpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0PW4ubmV4dCgpO2lmKCF0LmRvbmUpe3ZhciBlPXQudmFsdWVbMF07dC52YWx1ZVswXT10LnZhbHVlWzFdLHQudmFsdWVbMV09ZX1yZXR1cm4gdH0pfXJldHVybiB0Ll9faXRlcmF0b3IoZT09PWdyP21yOmdyLHIpfSxlfWZ1bmN0aW9uIHB0KHQsZSxyKXt2YXIgbj1qdCh0KTtyZXR1cm4gbi5zaXplPXQuc2l6ZSxuLmhhcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5oYXMoZSl9LG4uZ2V0PWZ1bmN0aW9uKG4saSl7dmFyIG89dC5nZXQobixjcik7cmV0dXJuIG89PT1jcj9pOmUuY2FsbChyLG8sbix0KX0sbi5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXRoaXM7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQsaSx1KXtyZXR1cm4gbihlLmNhbGwocix0LGksdSksaSxvKSE9PSExfSxpKX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10Ll9faXRlcmF0b3Iod3IsaSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGk9by5uZXh0KCk7aWYoaS5kb25lKXJldHVybiBpO3ZhciB1PWkudmFsdWUscz11WzBdO3JldHVybiB6KG4scyxlLmNhbGwocix1WzFdLHMsdCksaSl9KX0sbn1mdW5jdGlvbiB2dCh0LGUpe3ZhciByPWp0KHQpO3JldHVybiByLl9pdGVyPXQsci5zaXplPXQuc2l6ZSxyLnJldmVyc2U9ZnVuY3Rpb24oKXtyZXR1cm4gdH0sdC5mbGlwJiYoci5mbGlwPWZ1bmN0aW9uKCl7dmFyIGU9X3QodCk7cmV0dXJuIGUucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0LmZsaXAoKX0sZX0pLHIuZ2V0PWZ1bmN0aW9uKHIsbil7cmV0dXJuIHQuZ2V0KGU/cjotMS1yLG4pfSxyLmhhcz1mdW5jdGlvbihyKXtyZXR1cm4gdC5oYXMoZT9yOi0xLXIpfSxyLmluY2x1ZGVzPWZ1bmN0aW9uKGUpe3JldHVybiB0LmluY2x1ZGVzKGUpfSxyLmNhY2hlUmVzdWx0PVJ0LHIuX19pdGVyYXRlPWZ1bmN0aW9uKGUscil7dmFyIG49dGhpcztyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxyKXtyZXR1cm4gZSh0LHIsbil9LCFyKX0sci5fX2l0ZXJhdG9yPWZ1bmN0aW9uKGUscil7cmV0dXJuIHQuX19pdGVyYXRvcihlLCFyKX0scn1mdW5jdGlvbiBsdCh0LGUscixuKXt2YXIgaT1qdCh0KTtyZXR1cm4gbiYmKGkuaGFzPWZ1bmN0aW9uKG4pe3ZhciBpPXQuZ2V0KG4sY3IpO3JldHVybiBpIT09Y3ImJiEhZS5jYWxsKHIsaSxuLHQpfSxpLmdldD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuZ2V0KG4sY3IpO3JldHVybiBvIT09Y3ImJmUuY2FsbChyLG8sbix0KT9vOml9KSxpLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcyxzPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQsbyxhKXtyZXR1cm4gZS5jYWxsKHIsdCxvLGEpPyhzKyssaSh0LG4/bzpzLTEsdSkpOnZvaWQgMH0sbyksc30saS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10Ll9faXRlcmF0b3Iod3Isbykscz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7Oyl7dmFyIG89dS5uZXh0KCk7aWYoby5kb25lKXJldHVybiBvO3ZhciBhPW8udmFsdWUsaD1hWzBdLGY9YVsxXTtpZihlLmNhbGwocixmLGgsdCkpcmV0dXJuIHooaSxuP2g6cysrLGYsbyl9fSl9LGl9ZnVuY3Rpb24geXQodCxlLHIpe3ZhciBuPUx0KCkuYXNNdXRhYmxlKCk7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKGksbyl7bi51cGRhdGUoZS5jYWxsKHIsaSxvLHQpLDAsZnVuY3Rpb24odCl7cmV0dXJuIHQrMX0pfSksbi5hc0ltbXV0YWJsZSgpfWZ1bmN0aW9uIGR0KHQsZSxyKXt2YXIgbj1kKHQpLGk9KHcodCk/SWUoKTpMdCgpKS5hc011dGFibGUoKTtcbiAgdC5fX2l0ZXJhdGUoZnVuY3Rpb24obyx1KXtpLnVwZGF0ZShlLmNhbGwocixvLHUsdCksZnVuY3Rpb24odCl7cmV0dXJuIHQ9dHx8W10sdC5wdXNoKG4/W3Usb106byksdH0pfSk7dmFyIG89QXQodCk7cmV0dXJuIGkubWFwKGZ1bmN0aW9uKGUpe3JldHVybiBPdCh0LG8oZSkpfSl9ZnVuY3Rpb24gbXQodCxlLHIsbil7dmFyIGk9dC5zaXplO2lmKHZvaWQgMCE9PWUmJihlPTB8ZSksdm9pZCAwIT09ciYmKHI9MHxyKSxhKGUscixpKSlyZXR1cm4gdDt2YXIgbz1oKGUsaSkscz1mKHIsaSk7aWYobyE9PW98fHMhPT1zKXJldHVybiBtdCh0LnRvU2VxKCkuY2FjaGVSZXN1bHQoKSxlLHIsbik7dmFyIGMsXz1zLW87Xz09PV8mJihjPTA+Xz8wOl8pO3ZhciBwPWp0KHQpO3JldHVybiBwLnNpemU9MD09PWM/Yzp0LnNpemUmJmN8fHZvaWQgMCwhbiYmTCh0KSYmYz49MCYmKHAuZ2V0PWZ1bmN0aW9uKGUscil7cmV0dXJuIGU9dSh0aGlzLGUpLGU+PTAmJmM+ZT90LmdldChlK28scik6cn0pLHAuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXt2YXIgaT10aGlzO2lmKDA9PT1jKXJldHVybiAwO2lmKHIpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZSxyKTt2YXIgdT0wLHM9ITAsYT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBzJiYocz11Kys8byk/dm9pZCAwOihhKyssZSh0LG4/cjphLTEsaSkhPT0hMSYmYSE9PWMpfSksYX0scC5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXtpZigwIT09YyYmcilyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IoZSxyKTt2YXIgaT0wIT09YyYmdC5fX2l0ZXJhdG9yKGUsciksdT0wLHM9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoO3UrKzxvOylpLm5leHQoKTtpZigrK3M+YylyZXR1cm4gSSgpO3ZhciB0PWkubmV4dCgpO3JldHVybiBufHxlPT09Z3I/dDplPT09bXI/eihlLHMtMSx2b2lkIDAsdCk6eihlLHMtMSx0LnZhbHVlWzFdLHQpfSl9LHB9ZnVuY3Rpb24gZ3QodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztpZihpKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKG4saSk7dmFyIHU9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpLHMpe3JldHVybiBlLmNhbGwocix0LGkscykmJisrdSYmbih0LGksbyl9KSx1fSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXRoaXM7aWYoaSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IobixpKTt2YXIgdT10Ll9faXRlcmF0b3Iod3IsaSkscz0hMDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZighcylyZXR1cm4gSSgpO3ZhciB0PXUubmV4dCgpO2lmKHQuZG9uZSlyZXR1cm4gdDt2YXIgaT10LnZhbHVlLGE9aVswXSxoPWlbMV07cmV0dXJuIGUuY2FsbChyLGgsYSxvKT9uPT09d3I/dDp6KG4sYSxoLHQpOihzPSExLEkoKSl9KX0sbn1mdW5jdGlvbiB3dCh0LGUscixuKXt2YXIgaT1qdCh0KTtyZXR1cm4gaS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihpLG8pe3ZhciB1PXRoaXM7aWYobylyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShpLG8pO3ZhciBzPSEwLGE9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxvLGgpe3JldHVybiBzJiYocz1lLmNhbGwocix0LG8saCkpP3ZvaWQgMDooYSsrLGkodCxuP286YS0xLHUpKX0pLGF9LGkuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcztpZihvKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihpLG8pO3ZhciBzPXQuX19pdGVyYXRvcih3cixvKSxhPSEwLGg9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdCxvLGY7ZG97aWYodD1zLm5leHQoKSx0LmRvbmUpcmV0dXJuIG58fGk9PT1ncj90Omk9PT1tcj96KGksaCsrLHZvaWQgMCx0KTp6KGksaCsrLHQudmFsdWVbMV0sdCk7dmFyIGM9dC52YWx1ZTtvPWNbMF0sZj1jWzFdLGEmJihhPWUuY2FsbChyLGYsbyx1KSl9d2hpbGUoYSk7XG4gIHJldHVybiBpPT09d3I/dDp6KGksbyxmLHQpfSl9LGl9ZnVuY3Rpb24gU3QodCxlKXt2YXIgcj1kKHQpLG49W3RdLmNvbmNhdChlKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHkodCk/ciYmKHQ9cCh0KSk6dD1yP1codCk6QihBcnJheS5pc0FycmF5KHQpP3Q6W3RdKSx0fSkuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSk7aWYoMD09PW4ubGVuZ3RoKXJldHVybiB0O2lmKDE9PT1uLmxlbmd0aCl7dmFyIGk9blswXTtpZihpPT09dHx8ciYmZChpKXx8bSh0KSYmbShpKSlyZXR1cm4gaX12YXIgbz1uZXcgaihuKTtyZXR1cm4gcj9vPW8udG9LZXllZFNlcSgpOm0odCl8fChvPW8udG9TZXRTZXEoKSksbz1vLmZsYXR0ZW4oITApLG8uc2l6ZT1uLnJlZHVjZShmdW5jdGlvbih0LGUpe2lmKHZvaWQgMCE9PXQpe3ZhciByPWUuc2l6ZTtpZih2b2lkIDAhPT1yKXJldHVybiB0K3J9fSwwKSxvfWZ1bmN0aW9uIHp0KHQsZSxyKXt2YXIgbj1qdCh0KTtyZXR1cm4gbi5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihuLGkpe2Z1bmN0aW9uIG8odCxhKXt2YXIgaD10aGlzO3QuX19pdGVyYXRlKGZ1bmN0aW9uKHQsaSl7cmV0dXJuKCFlfHxlPmEpJiZ5KHQpP28odCxhKzEpOm4odCxyP2k6dSsrLGgpPT09ITEmJihzPSEwKSwhc30saSl9dmFyIHU9MCxzPSExO3JldHVybiBvKHQsMCksdX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10Ll9faXRlcmF0b3IobixpKSx1PVtdLHM9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoO287KXt2YXIgdD1vLm5leHQoKTtpZih0LmRvbmU9PT0hMSl7dmFyIGE9dC52YWx1ZTtpZihuPT09d3ImJihhPWFbMV0pLGUmJiEoZT51Lmxlbmd0aCl8fCF5KGEpKXJldHVybiByP3Q6eihuLHMrKyxhLHQpO3UucHVzaChvKSxvPWEuX19pdGVyYXRvcihuLGkpfWVsc2Ugbz11LnBvcCgpfXJldHVybiBJKCl9KX0sbn1mdW5jdGlvbiBJdCh0LGUscil7dmFyIG49QXQodCk7cmV0dXJuIHQudG9TZXEoKS5tYXAoZnVuY3Rpb24oaSxvKXtyZXR1cm4gbihlLmNhbGwocixpLG8sdCkpfSkuZmxhdHRlbighMCl9ZnVuY3Rpb24gYnQodCxlKXt2YXIgcj1qdCh0KTtyZXR1cm4gci5zaXplPXQuc2l6ZSYmMip0LnNpemUtMSxyLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKHIsbil7dmFyIGk9dGhpcyxvPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQpe3JldHVybighb3x8cihlLG8rKyxpKSE9PSExKSYmcih0LG8rKyxpKSE9PSExfSxuKSxvfSxyLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihyLG4pe3ZhciBpLG89dC5fX2l0ZXJhdG9yKGdyLG4pLHU9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtyZXR1cm4oIWl8fHUlMikmJihpPW8ubmV4dCgpLGkuZG9uZSk/aTp1JTI/eihyLHUrKyxlKTp6KHIsdSsrLGkudmFsdWUsaSl9KX0scn1mdW5jdGlvbiBxdCh0LGUscil7ZXx8KGU9VXQpO3ZhciBuPWQodCksaT0wLG89dC50b1NlcSgpLm1hcChmdW5jdGlvbihlLG4pe3JldHVybltuLGUsaSsrLHI/cihlLG4sdCk6ZV19KS50b0FycmF5KCk7cmV0dXJuIG8uc29ydChmdW5jdGlvbih0LHIpe3JldHVybiBlKHRbM10sclszXSl8fHRbMl0tclsyXX0pLmZvckVhY2gobj9mdW5jdGlvbih0LGUpe29bZV0ubGVuZ3RoPTJ9OmZ1bmN0aW9uKHQsZSl7b1tlXT10WzFdfSksbj94KG8pOm0odCk/ayhvKTpBKG8pfWZ1bmN0aW9uIER0KHQsZSxyKXtpZihlfHwoZT1VdCkscil7dmFyIG49dC50b1NlcSgpLm1hcChmdW5jdGlvbihlLG4pe3JldHVybltlLHIoZSxuLHQpXX0pLnJlZHVjZShmdW5jdGlvbih0LHIpe3JldHVybiBNdChlLHRbMV0sclsxXSk/cjp0fSk7cmV0dXJuIG4mJm5bMF19cmV0dXJuIHQucmVkdWNlKGZ1bmN0aW9uKHQscil7cmV0dXJuIE10KGUsdCxyKT9yOnR9KX1mdW5jdGlvbiBNdCh0LGUscil7dmFyIG49dChyLGUpO3JldHVybiAwPT09biYmciE9PWUmJih2b2lkIDA9PT1yfHxudWxsPT09cnx8ciE9PXIpfHxuPjB9ZnVuY3Rpb24gRXQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLnNpemU9bmV3IGoocikubWFwKGZ1bmN0aW9uKHQpe1xuICByZXR1cm4gdC5zaXplfSkubWluKCksbi5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHIsbj10aGlzLl9faXRlcmF0b3IoZ3IsZSksaT0wOyEocj1uLm5leHQoKSkuZG9uZSYmdChyLnZhbHVlLGkrKyx0aGlzKSE9PSExOyk7cmV0dXJuIGl9LG4uX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHQsbil7dmFyIGk9ci5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQ9Xyh0KSxEKG4/dC5yZXZlcnNlKCk6dCl9KSxvPTAsdT0hMTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgcjtyZXR1cm4gdXx8KHI9aS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQubmV4dCgpfSksdT1yLnNvbWUoZnVuY3Rpb24odCl7cmV0dXJuIHQuZG9uZX0pKSx1P0koKTp6KHQsbysrLGUuYXBwbHkobnVsbCxyLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdC52YWx1ZX0pKSl9KX0sbn1mdW5jdGlvbiBPdCh0LGUpe3JldHVybiBMKHQpP2U6dC5jb25zdHJ1Y3RvcihlKX1mdW5jdGlvbiB4dCh0KXtpZih0IT09T2JqZWN0KHQpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBbSywgVl0gdHVwbGU6IFwiK3QpfWZ1bmN0aW9uIGt0KHQpe3JldHVybiBzdCh0LnNpemUpLG8odCl9ZnVuY3Rpb24gQXQodCl7cmV0dXJuIGQodCk/cDptKHQpP3Y6bH1mdW5jdGlvbiBqdCh0KXtyZXR1cm4gT2JqZWN0LmNyZWF0ZSgoZCh0KT94Om0odCk/azpBKS5wcm90b3R5cGUpfWZ1bmN0aW9uIFJ0KCl7cmV0dXJuIHRoaXMuX2l0ZXIuY2FjaGVSZXN1bHQ/KHRoaXMuX2l0ZXIuY2FjaGVSZXN1bHQoKSx0aGlzLnNpemU9dGhpcy5faXRlci5zaXplLHRoaXMpOk8ucHJvdG90eXBlLmNhY2hlUmVzdWx0LmNhbGwodGhpcyl9ZnVuY3Rpb24gVXQodCxlKXtyZXR1cm4gdD5lPzE6ZT50Py0xOjB9ZnVuY3Rpb24gS3QodCl7dmFyIGU9RCh0KTtpZighZSl7aWYoIUUodCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGl0ZXJhYmxlIG9yIGFycmF5LWxpa2U6IFwiK3QpO2U9RChfKHQpKX1yZXR1cm4gZX1mdW5jdGlvbiBMdCh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/UXQoKTpUdCh0KSYmIXcodCk/dDpRdCgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9cCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0LHIpe3JldHVybiBlLnNldChyLHQpfSl9KX1mdW5jdGlvbiBUdCh0KXtyZXR1cm4hKCF0fHwhdFtMcl0pfWZ1bmN0aW9uIFd0KHQsZSl7dGhpcy5vd25lcklEPXQsdGhpcy5lbnRyaWVzPWV9ZnVuY3Rpb24gQnQodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMuYml0bWFwPWUsdGhpcy5ub2Rlcz1yfWZ1bmN0aW9uIEN0KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmNvdW50PWUsdGhpcy5ub2Rlcz1yfWZ1bmN0aW9uIEp0KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmtleUhhc2g9ZSx0aGlzLmVudHJpZXM9cn1mdW5jdGlvbiBOdCh0LGUscil7dGhpcy5vd25lcklEPXQsdGhpcy5rZXlIYXNoPWUsdGhpcy5lbnRyeT1yfWZ1bmN0aW9uIFB0KHQsZSxyKXt0aGlzLl90eXBlPWUsdGhpcy5fcmV2ZXJzZT1yLHRoaXMuX3N0YWNrPXQuX3Jvb3QmJlZ0KHQuX3Jvb3QpfWZ1bmN0aW9uIEh0KHQsZSl7cmV0dXJuIHoodCxlWzBdLGVbMV0pfWZ1bmN0aW9uIFZ0KHQsZSl7cmV0dXJue25vZGU6dCxpbmRleDowLF9fcHJldjplfX1mdW5jdGlvbiBZdCh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKFRyKTtyZXR1cm4gaS5zaXplPXQsaS5fcm9vdD1lLGkuX19vd25lcklEPXIsaS5fX2hhc2g9bixpLl9fYWx0ZXJlZD0hMSxpfWZ1bmN0aW9uIFF0KCl7cmV0dXJuIFdyfHwoV3I9WXQoMCkpfWZ1bmN0aW9uIFh0KHQscixuKXt2YXIgaSxvO2lmKHQuX3Jvb3Qpe3ZhciB1PWUoX3IpLHM9ZShwcik7aWYoaT1GdCh0Ll9yb290LHQuX19vd25lcklELDAsdm9pZCAwLHIsbix1LHMpLCFzLnZhbHVlKXJldHVybiB0O289dC5zaXplKyh1LnZhbHVlP249PT1jcj8tMToxOjApfWVsc2V7aWYobj09PWNyKXJldHVybiB0O289MSxpPW5ldyBXdCh0Ll9fb3duZXJJRCxbW3Isbl1dKX1yZXR1cm4gdC5fX293bmVySUQ/KHQuc2l6ZT1vLFxuICB0Ll9yb290PWksdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOmk/WXQobyxpKTpRdCgpfWZ1bmN0aW9uIEZ0KHQsZSxuLGksbyx1LHMsYSl7cmV0dXJuIHQ/dC51cGRhdGUoZSxuLGksbyx1LHMsYSk6dT09PWNyP3Q6KHIoYSkscihzKSxuZXcgTnQoZSxpLFtvLHVdKSl9ZnVuY3Rpb24gR3QodCl7cmV0dXJuIHQuY29uc3RydWN0b3I9PT1OdHx8dC5jb25zdHJ1Y3Rvcj09PUp0fWZ1bmN0aW9uIFp0KHQsZSxyLG4saSl7aWYodC5rZXlIYXNoPT09bilyZXR1cm4gbmV3IEp0KGUsbixbdC5lbnRyeSxpXSk7dmFyIG8sdT0oMD09PXI/dC5rZXlIYXNoOnQua2V5SGFzaD4+PnIpJmZyLHM9KDA9PT1yP246bj4+PnIpJmZyLGE9dT09PXM/W1p0KHQsZSxyK2FyLG4saSldOihvPW5ldyBOdChlLG4saSkscz51P1t0LG9dOltvLHRdKTtyZXR1cm4gbmV3IEJ0KGUsMTw8dXwxPDxzLGEpfWZ1bmN0aW9uICR0KHQsZSxyLGkpe3R8fCh0PW5ldyBuKTtmb3IodmFyIG89bmV3IE50KHQsZXQociksW3IsaV0pLHU9MDtlLmxlbmd0aD51O3UrKyl7dmFyIHM9ZVt1XTtvPW8udXBkYXRlKHQsMCx2b2lkIDAsc1swXSxzWzFdKX1yZXR1cm4gb31mdW5jdGlvbiB0ZSh0LGUscixuKXtmb3IodmFyIGk9MCxvPTAsdT1BcnJheShyKSxzPTAsYT0xLGg9ZS5sZW5ndGg7aD5zO3MrKyxhPDw9MSl7dmFyIGY9ZVtzXTt2b2lkIDAhPT1mJiZzIT09biYmKGl8PWEsdVtvKytdPWYpfXJldHVybiBuZXcgQnQodCxpLHUpfWZ1bmN0aW9uIGVlKHQsZSxyLG4saSl7Zm9yKHZhciBvPTAsdT1BcnJheShocikscz0wOzAhPT1yO3MrKyxyPj4+PTEpdVtzXT0xJnI/ZVtvKytdOnZvaWQgMDtyZXR1cm4gdVtuXT1pLG5ldyBDdCh0LG8rMSx1KX1mdW5jdGlvbiByZSh0LGUscil7Zm9yKHZhciBuPVtdLGk9MDtyLmxlbmd0aD5pO2krKyl7dmFyIG89cltpXSx1PXAobyk7eShvKXx8KHU9dS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIEYodCl9KSksbi5wdXNoKHUpfXJldHVybiBpZSh0LGUsbil9ZnVuY3Rpb24gbmUodCl7cmV0dXJuIGZ1bmN0aW9uKGUscixuKXtyZXR1cm4gZSYmZS5tZXJnZURlZXBXaXRoJiZ5KHIpP2UubWVyZ2VEZWVwV2l0aCh0LHIpOnQ/dChlLHIsbik6cn19ZnVuY3Rpb24gaWUodCxlLHIpe3JldHVybiByPXIuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSksMD09PXIubGVuZ3RoP3Q6MCE9PXQuc2l6ZXx8dC5fX293bmVySUR8fDEhPT1yLmxlbmd0aD90LndpdGhNdXRhdGlvbnMoZnVuY3Rpb24odCl7Zm9yKHZhciBuPWU/ZnVuY3Rpb24ocixuKXt0LnVwZGF0ZShuLGNyLGZ1bmN0aW9uKHQpe3JldHVybiB0PT09Y3I/cjplKHQscixuKX0pfTpmdW5jdGlvbihlLHIpe3Quc2V0KHIsZSl9LGk9MDtyLmxlbmd0aD5pO2krKylyW2ldLmZvckVhY2gobil9KTp0LmNvbnN0cnVjdG9yKHJbMF0pfWZ1bmN0aW9uIG9lKHQsZSxyLG4pe3ZhciBpPXQ9PT1jcixvPWUubmV4dCgpO2lmKG8uZG9uZSl7dmFyIHU9aT9yOnQscz1uKHUpO3JldHVybiBzPT09dT90OnN9dXQoaXx8dCYmdC5zZXQsXCJpbnZhbGlkIGtleVBhdGhcIik7dmFyIGE9by52YWx1ZSxoPWk/Y3I6dC5nZXQoYSxjciksZj1vZShoLGUscixuKTtyZXR1cm4gZj09PWg/dDpmPT09Y3I/dC5yZW1vdmUoYSk6KGk/UXQoKTp0KS5zZXQoYSxmKX1mdW5jdGlvbiB1ZSh0KXtyZXR1cm4gdC09dD4+MSYxNDMxNjU1NzY1LHQ9KDg1ODk5MzQ1OSZ0KSsodD4+MiY4NTg5OTM0NTkpLHQ9dCsodD4+NCkmMjUyNjQ1MTM1LHQrPXQ+PjgsdCs9dD4+MTYsMTI3JnR9ZnVuY3Rpb24gc2UodCxlLHIsbil7dmFyIG89bj90OmkodCk7cmV0dXJuIG9bZV09cixvfWZ1bmN0aW9uIGFlKHQsZSxyLG4pe3ZhciBpPXQubGVuZ3RoKzE7aWYobiYmZSsxPT09aSlyZXR1cm4gdFtlXT1yLHQ7Zm9yKHZhciBvPUFycmF5KGkpLHU9MCxzPTA7aT5zO3MrKylzPT09ZT8ob1tzXT1yLHU9LTEpOm9bc109dFtzK3VdO3JldHVybiBvfWZ1bmN0aW9uIGhlKHQsZSxyKXt2YXIgbj10Lmxlbmd0aC0xO2lmKHImJmU9PT1uKXJldHVybiB0LnBvcCgpLHQ7Zm9yKHZhciBpPUFycmF5KG4pLG89MCx1PTA7bj51O3UrKyl1PT09ZSYmKG89MSksXG4gIGlbdV09dFt1K29dO3JldHVybiBpfWZ1bmN0aW9uIGZlKHQpe3ZhciBlPWxlKCk7aWYobnVsbD09PXR8fHZvaWQgMD09PXQpcmV0dXJuIGU7aWYoY2UodCkpcmV0dXJuIHQ7dmFyIHI9dih0KSxuPXIuc2l6ZTtyZXR1cm4gMD09PW4/ZTooc3Qobiksbj4wJiZocj5uP3ZlKDAsbixhcixudWxsLG5ldyBfZShyLnRvQXJyYXkoKSkpOmUud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXt0LnNldFNpemUobiksci5mb3JFYWNoKGZ1bmN0aW9uKGUscil7cmV0dXJuIHQuc2V0KHIsZSl9KX0pKX1mdW5jdGlvbiBjZSh0KXtyZXR1cm4hKCF0fHwhdFtOcl0pfWZ1bmN0aW9uIF9lKHQsZSl7dGhpcy5hcnJheT10LHRoaXMub3duZXJJRD1lfWZ1bmN0aW9uIHBlKHQsZSl7ZnVuY3Rpb24gcih0LGUscil7cmV0dXJuIDA9PT1lP24odCxyKTppKHQsZSxyKX1mdW5jdGlvbiBuKHQscil7dmFyIG49cj09PXM/YSYmYS5hcnJheTp0JiZ0LmFycmF5LGk9cj5vPzA6by1yLGg9dS1yO3JldHVybiBoPmhyJiYoaD1ociksZnVuY3Rpb24oKXtpZihpPT09aClyZXR1cm4gVnI7dmFyIHQ9ZT8tLWg6aSsrO3JldHVybiBuJiZuW3RdfX1mdW5jdGlvbiBpKHQsbixpKXt2YXIgcyxhPXQmJnQuYXJyYXksaD1pPm8/MDpvLWk+Pm4sZj0odS1pPj5uKSsxO3JldHVybiBmPmhyJiYoZj1ociksZnVuY3Rpb24oKXtmb3IoOzspe2lmKHMpe3ZhciB0PXMoKTtpZih0IT09VnIpcmV0dXJuIHQ7cz1udWxsfWlmKGg9PT1mKXJldHVybiBWcjt2YXIgbz1lPy0tZjpoKys7cz1yKGEmJmFbb10sbi1hcixpKyhvPDxuKSl9fX12YXIgbz10Ll9vcmlnaW4sdT10Ll9jYXBhY2l0eSxzPXplKHUpLGE9dC5fdGFpbDtyZXR1cm4gcih0Ll9yb290LHQuX2xldmVsLDApfWZ1bmN0aW9uIHZlKHQsZSxyLG4saSxvLHUpe3ZhciBzPU9iamVjdC5jcmVhdGUoUHIpO3JldHVybiBzLnNpemU9ZS10LHMuX29yaWdpbj10LHMuX2NhcGFjaXR5PWUscy5fbGV2ZWw9cixzLl9yb290PW4scy5fdGFpbD1pLHMuX19vd25lcklEPW8scy5fX2hhc2g9dSxzLl9fYWx0ZXJlZD0hMSxzfWZ1bmN0aW9uIGxlKCl7cmV0dXJuIEhyfHwoSHI9dmUoMCwwLGFyKSl9ZnVuY3Rpb24geWUodCxyLG4pe2lmKHI9dSh0LHIpLHIhPT1yKXJldHVybiB0O2lmKHI+PXQuc2l6ZXx8MD5yKXJldHVybiB0LndpdGhNdXRhdGlvbnMoZnVuY3Rpb24odCl7MD5yP3dlKHQscikuc2V0KDAsbik6d2UodCwwLHIrMSkuc2V0KHIsbil9KTtyKz10Ll9vcmlnaW47dmFyIGk9dC5fdGFpbCxvPXQuX3Jvb3Qscz1lKHByKTtyZXR1cm4gcj49emUodC5fY2FwYWNpdHkpP2k9ZGUoaSx0Ll9fb3duZXJJRCwwLHIsbixzKTpvPWRlKG8sdC5fX293bmVySUQsdC5fbGV2ZWwscixuLHMpLHMudmFsdWU/dC5fX293bmVySUQ/KHQuX3Jvb3Q9byx0Ll90YWlsPWksdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOnZlKHQuX29yaWdpbix0Ll9jYXBhY2l0eSx0Ll9sZXZlbCxvLGkpOnR9ZnVuY3Rpb24gZGUodCxlLG4saSxvLHUpe3ZhciBzPWk+Pj5uJmZyLGE9dCYmdC5hcnJheS5sZW5ndGg+cztpZighYSYmdm9pZCAwPT09bylyZXR1cm4gdDt2YXIgaDtpZihuPjApe3ZhciBmPXQmJnQuYXJyYXlbc10sYz1kZShmLGUsbi1hcixpLG8sdSk7cmV0dXJuIGM9PT1mP3Q6KGg9bWUodCxlKSxoLmFycmF5W3NdPWMsaCl9cmV0dXJuIGEmJnQuYXJyYXlbc109PT1vP3Q6KHIodSksaD1tZSh0LGUpLHZvaWQgMD09PW8mJnM9PT1oLmFycmF5Lmxlbmd0aC0xP2guYXJyYXkucG9wKCk6aC5hcnJheVtzXT1vLGgpfWZ1bmN0aW9uIG1lKHQsZSl7cmV0dXJuIGUmJnQmJmU9PT10Lm93bmVySUQ/dDpuZXcgX2UodD90LmFycmF5LnNsaWNlKCk6W10sZSl9ZnVuY3Rpb24gZ2UodCxlKXtpZihlPj16ZSh0Ll9jYXBhY2l0eSkpcmV0dXJuIHQuX3RhaWw7aWYoMTw8dC5fbGV2ZWwrYXI+ZSl7Zm9yKHZhciByPXQuX3Jvb3Qsbj10Ll9sZXZlbDtyJiZuPjA7KXI9ci5hcnJheVtlPj4+biZmcl0sbi09YXI7cmV0dXJuIHJ9fWZ1bmN0aW9uIHdlKHQsZSxyKXt2b2lkIDAhPT1lJiYoZT0wfGUpLHZvaWQgMCE9PXImJihyPTB8cik7dmFyIGk9dC5fX293bmVySUR8fG5ldyBuLG89dC5fb3JpZ2luLHU9dC5fY2FwYWNpdHkscz1vK2UsYT12b2lkIDA9PT1yP3U6MD5yP3UrcjpvK3I7XG4gIGlmKHM9PT1vJiZhPT09dSlyZXR1cm4gdDtpZihzPj1hKXJldHVybiB0LmNsZWFyKCk7Zm9yKHZhciBoPXQuX2xldmVsLGY9dC5fcm9vdCxjPTA7MD5zK2M7KWY9bmV3IF9lKGYmJmYuYXJyYXkubGVuZ3RoP1t2b2lkIDAsZl06W10saSksaCs9YXIsYys9MTw8aDtjJiYocys9YyxvKz1jLGErPWMsdSs9Yyk7Zm9yKHZhciBfPXplKHUpLHA9emUoYSk7cD49MTw8aCthcjspZj1uZXcgX2UoZiYmZi5hcnJheS5sZW5ndGg/W2ZdOltdLGkpLGgrPWFyO3ZhciB2PXQuX3RhaWwsbD1fPnA/Z2UodCxhLTEpOnA+Xz9uZXcgX2UoW10saSk6djtpZih2JiZwPl8mJnU+cyYmdi5hcnJheS5sZW5ndGgpe2Y9bWUoZixpKTtmb3IodmFyIHk9ZixkPWg7ZD5hcjtkLT1hcil7dmFyIG09Xz4+PmQmZnI7eT15LmFycmF5W21dPW1lKHkuYXJyYXlbbV0saSl9eS5hcnJheVtfPj4+YXImZnJdPXZ9aWYodT5hJiYobD1sJiZsLnJlbW92ZUFmdGVyKGksMCxhKSkscz49cClzLT1wLGEtPXAsaD1hcixmPW51bGwsbD1sJiZsLnJlbW92ZUJlZm9yZShpLDAscyk7ZWxzZSBpZihzPm98fF8+cCl7Zm9yKGM9MDtmOyl7dmFyIGc9cz4+PmgmZnI7aWYoZyE9PXA+Pj5oJmZyKWJyZWFrO2cmJihjKz0oMTw8aCkqZyksaC09YXIsZj1mLmFycmF5W2ddfWYmJnM+byYmKGY9Zi5yZW1vdmVCZWZvcmUoaSxoLHMtYykpLGYmJl8+cCYmKGY9Zi5yZW1vdmVBZnRlcihpLGgscC1jKSksYyYmKHMtPWMsYS09Yyl9cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9YS1zLHQuX29yaWdpbj1zLHQuX2NhcGFjaXR5PWEsdC5fbGV2ZWw9aCx0Ll9yb290PWYsdC5fdGFpbD1sLHQuX19oYXNoPXZvaWQgMCx0Ll9fYWx0ZXJlZD0hMCx0KTp2ZShzLGEsaCxmLGwpfWZ1bmN0aW9uIFNlKHQsZSxyKXtmb3IodmFyIG49W10saT0wLG89MDtyLmxlbmd0aD5vO28rKyl7dmFyIHU9cltvXSxzPXYodSk7cy5zaXplPmkmJihpPXMuc2l6ZSkseSh1KXx8KHM9cy5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIEYodCl9KSksbi5wdXNoKHMpfXJldHVybiBpPnQuc2l6ZSYmKHQ9dC5zZXRTaXplKGkpKSxpZSh0LGUsbil9ZnVuY3Rpb24gemUodCl7cmV0dXJuIGhyPnQ/MDp0LTE+Pj5hcjw8YXJ9ZnVuY3Rpb24gSWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0RlKCk6YmUodCk/dDpEZSgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9cCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0LHIpe3JldHVybiBlLnNldChyLHQpfSl9KX1mdW5jdGlvbiBiZSh0KXtyZXR1cm4gVHQodCkmJncodCl9ZnVuY3Rpb24gcWUodCxlLHIsbil7dmFyIGk9T2JqZWN0LmNyZWF0ZShJZS5wcm90b3R5cGUpO3JldHVybiBpLnNpemU9dD90LnNpemU6MCxpLl9tYXA9dCxpLl9saXN0PWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGl9ZnVuY3Rpb24gRGUoKXtyZXR1cm4gWXJ8fChZcj1xZShRdCgpLGxlKCkpKX1mdW5jdGlvbiBNZSh0LGUscil7dmFyIG4saSxvPXQuX21hcCx1PXQuX2xpc3Qscz1vLmdldChlKSxhPXZvaWQgMCE9PXM7aWYocj09PWNyKXtpZighYSlyZXR1cm4gdDt1LnNpemU+PWhyJiZ1LnNpemU+PTIqby5zaXplPyhpPXUuZmlsdGVyKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMCE9PXQmJnMhPT1lfSksbj1pLnRvS2V5ZWRTZXEoKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHRbMF19KS5mbGlwKCkudG9NYXAoKSx0Ll9fb3duZXJJRCYmKG4uX19vd25lcklEPWkuX19vd25lcklEPXQuX19vd25lcklEKSk6KG49by5yZW1vdmUoZSksaT1zPT09dS5zaXplLTE/dS5wb3AoKTp1LnNldChzLHZvaWQgMCkpfWVsc2UgaWYoYSl7aWYocj09PXUuZ2V0KHMpWzFdKXJldHVybiB0O249byxpPXUuc2V0KHMsW2Uscl0pfWVsc2Ugbj1vLnNldChlLHUuc2l6ZSksaT11LnNldCh1LnNpemUsW2Uscl0pO3JldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPW4uc2l6ZSx0Ll9tYXA9bix0Ll9saXN0PWksdC5fX2hhc2g9dm9pZCAwLHQpOnFlKG4saSl9ZnVuY3Rpb24gRWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P2tlKCk6T2UodCk/dDprZSgpLnVuc2hpZnRBbGwodCk7XG59ZnVuY3Rpb24gT2UodCl7cmV0dXJuISghdHx8IXRbUXJdKX1mdW5jdGlvbiB4ZSh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKFhyKTtyZXR1cm4gaS5zaXplPXQsaS5faGVhZD1lLGkuX19vd25lcklEPXIsaS5fX2hhc2g9bixpLl9fYWx0ZXJlZD0hMSxpfWZ1bmN0aW9uIGtlKCl7cmV0dXJuIEZyfHwoRnI9eGUoMCkpfWZ1bmN0aW9uIEFlKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9LZSgpOmplKHQpJiYhdyh0KT90OktlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1sKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSl9ZnVuY3Rpb24gamUodCl7cmV0dXJuISghdHx8IXRbR3JdKX1mdW5jdGlvbiBSZSh0LGUpe3JldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPWUuc2l6ZSx0Ll9tYXA9ZSx0KTplPT09dC5fbWFwP3Q6MD09PWUuc2l6ZT90Ll9fZW1wdHkoKTp0Ll9fbWFrZShlKX1mdW5jdGlvbiBVZSh0LGUpe3ZhciByPU9iamVjdC5jcmVhdGUoWnIpO3JldHVybiByLnNpemU9dD90LnNpemU6MCxyLl9tYXA9dCxyLl9fb3duZXJJRD1lLHJ9ZnVuY3Rpb24gS2UoKXtyZXR1cm4gJHJ8fCgkcj1VZShRdCgpKSl9ZnVuY3Rpb24gTGUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0JlKCk6VGUodCk/dDpCZSgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9bCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0KXtyZXR1cm4gZS5hZGQodCl9KX0pfWZ1bmN0aW9uIFRlKHQpe3JldHVybiBqZSh0KSYmdyh0KX1mdW5jdGlvbiBXZSh0LGUpe3ZhciByPU9iamVjdC5jcmVhdGUodG4pO3JldHVybiByLnNpemU9dD90LnNpemU6MCxyLl9tYXA9dCxyLl9fb3duZXJJRD1lLHJ9ZnVuY3Rpb24gQmUoKXtyZXR1cm4gZW58fChlbj1XZShEZSgpKSl9ZnVuY3Rpb24gQ2UodCxlKXt2YXIgcixuPWZ1bmN0aW9uKG8pe2lmKG8gaW5zdGFuY2VvZiBuKXJldHVybiBvO2lmKCEodGhpcyBpbnN0YW5jZW9mIG4pKXJldHVybiBuZXcgbihvKTtpZighcil7cj0hMDt2YXIgdT1PYmplY3Qua2V5cyh0KTtQZShpLHUpLGkuc2l6ZT11Lmxlbmd0aCxpLl9uYW1lPWUsaS5fa2V5cz11LGkuX2RlZmF1bHRWYWx1ZXM9dH10aGlzLl9tYXA9THQobyl9LGk9bi5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShybik7cmV0dXJuIGkuY29uc3RydWN0b3I9bixufWZ1bmN0aW9uIEplKHQsZSxyKXt2YXIgbj1PYmplY3QuY3JlYXRlKE9iamVjdC5nZXRQcm90b3R5cGVPZih0KSk7cmV0dXJuIG4uX21hcD1lLG4uX19vd25lcklEPXIsbn1mdW5jdGlvbiBOZSh0KXtyZXR1cm4gdC5fbmFtZXx8dC5jb25zdHJ1Y3Rvci5uYW1lfHxcIlJlY29yZFwifWZ1bmN0aW9uIFBlKHQsZSl7dHJ5e2UuZm9yRWFjaChIZS5iaW5kKHZvaWQgMCx0KSl9Y2F0Y2gocil7fX1mdW5jdGlvbiBIZSh0LGUpe09iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LGUse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldChlKX0sc2V0OmZ1bmN0aW9uKHQpe3V0KHRoaXMuX19vd25lcklELFwiQ2Fubm90IHNldCBvbiBhbiBpbW11dGFibGUgcmVjb3JkLlwiKSx0aGlzLnNldChlLHQpfX0pfWZ1bmN0aW9uIFZlKHQsZSl7aWYodD09PWUpcmV0dXJuITA7aWYoIXkoZSl8fHZvaWQgMCE9PXQuc2l6ZSYmdm9pZCAwIT09ZS5zaXplJiZ0LnNpemUhPT1lLnNpemV8fHZvaWQgMCE9PXQuX19oYXNoJiZ2b2lkIDAhPT1lLl9faGFzaCYmdC5fX2hhc2ghPT1lLl9faGFzaHx8ZCh0KSE9PWQoZSl8fG0odCkhPT1tKGUpfHx3KHQpIT09dyhlKSlyZXR1cm4hMTtpZigwPT09dC5zaXplJiYwPT09ZS5zaXplKXJldHVybiEwO3ZhciByPSFnKHQpO2lmKHcodCkpe3ZhciBuPXQuZW50cmllcygpO3JldHVybiBlLmV2ZXJ5KGZ1bmN0aW9uKHQsZSl7dmFyIGk9bi5uZXh0KCkudmFsdWU7cmV0dXJuIGkmJlgoaVsxXSx0KSYmKHJ8fFgoaVswXSxlKSl9KSYmbi5uZXh0KCkuZG9uZX12YXIgaT0hMTtpZih2b2lkIDA9PT10LnNpemUpaWYodm9pZCAwPT09ZS5zaXplKVwiZnVuY3Rpb25cIj09dHlwZW9mIHQuY2FjaGVSZXN1bHQmJnQuY2FjaGVSZXN1bHQoKTtlbHNle1xuICBpPSEwO3ZhciBvPXQ7dD1lLGU9b312YXIgdT0hMCxzPWUuX19pdGVyYXRlKGZ1bmN0aW9uKGUsbil7cmV0dXJuKHI/dC5oYXMoZSk6aT9YKGUsdC5nZXQobixjcikpOlgodC5nZXQobixjciksZSkpP3ZvaWQgMDoodT0hMSwhMSl9KTtyZXR1cm4gdSYmdC5zaXplPT09c31mdW5jdGlvbiBZZSh0LGUscil7aWYoISh0aGlzIGluc3RhbmNlb2YgWWUpKXJldHVybiBuZXcgWWUodCxlLHIpO2lmKHV0KDAhPT1yLFwiQ2Fubm90IHN0ZXAgYSBSYW5nZSBieSAwXCIpLHQ9dHx8MCx2b2lkIDA9PT1lJiYoZT0xLzApLHI9dm9pZCAwPT09cj8xOk1hdGguYWJzKHIpLHQ+ZSYmKHI9LXIpLHRoaXMuX3N0YXJ0PXQsdGhpcy5fZW5kPWUsdGhpcy5fc3RlcD1yLHRoaXMuc2l6ZT1NYXRoLm1heCgwLE1hdGguY2VpbCgoZS10KS9yLTEpKzEpLDA9PT10aGlzLnNpemUpe2lmKG5uKXJldHVybiBubjtubj10aGlzfX1mdW5jdGlvbiBRZSh0LGUpe2lmKCEodGhpcyBpbnN0YW5jZW9mIFFlKSlyZXR1cm4gbmV3IFFlKHQsZSk7aWYodGhpcy5fdmFsdWU9dCx0aGlzLnNpemU9dm9pZCAwPT09ZT8xLzA6TWF0aC5tYXgoMCxlKSwwPT09dGhpcy5zaXplKXtpZihvbilyZXR1cm4gb247b249dGhpc319ZnVuY3Rpb24gWGUodCxlKXt2YXIgcj1mdW5jdGlvbihyKXt0LnByb3RvdHlwZVtyXT1lW3JdfTtyZXR1cm4gT2JqZWN0LmtleXMoZSkuZm9yRWFjaChyKSxPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzJiZPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGUpLmZvckVhY2gociksdH1mdW5jdGlvbiBGZSh0LGUpe3JldHVybiBlfWZ1bmN0aW9uIEdlKHQsZSl7cmV0dXJuW2UsdF19ZnVuY3Rpb24gWmUodCl7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIXQuYXBwbHkodGhpcyxhcmd1bWVudHMpfX1mdW5jdGlvbiAkZSh0KXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4tdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWZ1bmN0aW9uIHRyKHQpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiB0P0pTT04uc3RyaW5naWZ5KHQpOnR9ZnVuY3Rpb24gZXIoKXtyZXR1cm4gaShhcmd1bWVudHMpfWZ1bmN0aW9uIHJyKHQsZSl7cmV0dXJuIGU+dD8xOnQ+ZT8tMTowfWZ1bmN0aW9uIG5yKHQpe2lmKHQuc2l6ZT09PTEvMClyZXR1cm4gMDt2YXIgZT13KHQpLHI9ZCh0KSxuPWU/MTowLGk9dC5fX2l0ZXJhdGUocj9lP2Z1bmN0aW9uKHQsZSl7bj0zMSpuK29yKGV0KHQpLGV0KGUpKXwwfTpmdW5jdGlvbih0LGUpe249bitvcihldCh0KSxldChlKSl8MH06ZT9mdW5jdGlvbih0KXtuPTMxKm4rZXQodCl8MH06ZnVuY3Rpb24odCl7bj1uK2V0KHQpfDB9KTtyZXR1cm4gaXIoaSxuKX1mdW5jdGlvbiBpcih0LGUpe3JldHVybiBlPU1yKGUsMzQzMjkxODM1MyksZT1NcihlPDwxNXxlPj4+LTE1LDQ2MTg0NTkwNyksZT1NcihlPDwxM3xlPj4+LTEzLDUpLGU9KGUrMzg2NDI5MjE5NnwwKV50LGU9TXIoZV5lPj4+MTYsMjI0NjgyMjUwNyksZT1NcihlXmU+Pj4xMywzMjY2NDg5OTA5KSxlPXR0KGVeZT4+PjE2KX1mdW5jdGlvbiBvcih0LGUpe3JldHVybiB0XmUrMjY1NDQzNTc2OSsodDw8NikrKHQ+PjIpfDB9dmFyIHVyPUFycmF5LnByb3RvdHlwZS5zbGljZSxzcj1cImRlbGV0ZVwiLGFyPTUsaHI9MTw8YXIsZnI9aHItMSxjcj17fSxfcj17dmFsdWU6ITF9LHByPXt2YWx1ZTohMX07dChwLF8pLHQodixfKSx0KGwsXyksXy5pc0l0ZXJhYmxlPXksXy5pc0tleWVkPWQsXy5pc0luZGV4ZWQ9bSxfLmlzQXNzb2NpYXRpdmU9ZyxfLmlzT3JkZXJlZD13LF8uS2V5ZWQ9cCxfLkluZGV4ZWQ9dixfLlNldD1sO3ZhciB2cj1cIkBAX19JTU1VVEFCTEVfSVRFUkFCTEVfX0BAXCIsbHI9XCJAQF9fSU1NVVRBQkxFX0tFWUVEX19AQFwiLHlyPVwiQEBfX0lNTVVUQUJMRV9JTkRFWEVEX19AQFwiLGRyPVwiQEBfX0lNTVVUQUJMRV9PUkRFUkVEX19AQFwiLG1yPTAsZ3I9MSx3cj0yLFNyPVwiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmU3ltYm9sLml0ZXJhdG9yLHpyPVwiQEBpdGVyYXRvclwiLElyPVNyfHx6cjtTLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVyblwiW0l0ZXJhdG9yXVwifSxTLktFWVM9bXIsXG4gIFMuVkFMVUVTPWdyLFMuRU5UUklFUz13cixTLnByb3RvdHlwZS5pbnNwZWN0PVMucHJvdG90eXBlLnRvU291cmNlPWZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzfSxTLnByb3RvdHlwZVtJcl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sdChPLF8pLE8ub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gTyhhcmd1bWVudHMpfSxPLnByb3RvdHlwZS50b1NlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxPLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXEge1wiLFwifVwiKX0sTy5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9ZnVuY3Rpb24oKXtyZXR1cm4hdGhpcy5fY2FjaGUmJnRoaXMuX19pdGVyYXRlVW5jYWNoZWQmJih0aGlzLl9jYWNoZT10aGlzLmVudHJ5U2VxKCkudG9BcnJheSgpLHRoaXMuc2l6ZT10aGlzLl9jYWNoZS5sZW5ndGgpLHRoaXN9LE8ucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3JldHVybiBOKHRoaXMsdCxlLCEwKX0sTy5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBQKHRoaXMsdCxlLCEwKX0sdCh4LE8pLHgucHJvdG90eXBlLnRvS2V5ZWRTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sdChrLE8pLGsub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gayhhcmd1bWVudHMpfSxrLnByb3RvdHlwZS50b0luZGV4ZWRTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30say5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiU2VxIFtcIixcIl1cIil9LGsucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3JldHVybiBOKHRoaXMsdCxlLCExKX0say5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBQKHRoaXMsdCxlLCExKX0sdChBLE8pLEEub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gQShhcmd1bWVudHMpfSxBLnByb3RvdHlwZS50b1NldFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxPLmlzU2VxPUwsTy5LZXllZD14LE8uU2V0PUEsTy5JbmRleGVkPWs7dmFyIGJyPVwiQEBfX0lNTVVUQUJMRV9TRVFfX0BAXCI7Ty5wcm90b3R5cGVbYnJdPSEwLHQoaixrKSxqLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fYXJyYXlbdSh0aGlzLHQpXTplfSxqLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5fYXJyYXksbj1yLmxlbmd0aC0xLGk9MDtuPj1pO2krKylpZih0KHJbZT9uLWk6aV0saSx0aGlzKT09PSExKXJldHVybiBpKzE7cmV0dXJuIGl9LGoucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9hcnJheSxuPXIubGVuZ3RoLTEsaT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybiBpPm4/SSgpOnoodCxpLHJbZT9uLWkrKzppKytdKX0pfSx0KFIseCksUi5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMD09PWV8fHRoaXMuaGFzKHQpP3RoaXMuX29iamVjdFt0XTplfSxSLnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX29iamVjdC5oYXNPd25Qcm9wZXJ0eSh0KX0sUi5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMuX29iamVjdCxuPXRoaXMuX2tleXMsaT1uLmxlbmd0aC0xLG89MDtpPj1vO28rKyl7dmFyIHU9bltlP2ktbzpvXTtpZih0KHJbdV0sdSx0aGlzKT09PSExKXJldHVybiBvKzF9cmV0dXJuIG99LFIucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9vYmplY3Qsbj10aGlzLl9rZXlzLGk9bi5sZW5ndGgtMSxvPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHU9bltlP2ktbzpvXTtyZXR1cm4gbysrPmk/SSgpOnoodCx1LHJbdV0pfSl9LFIucHJvdG90eXBlW2RyXT0hMCx0KFUsayksVS5wcm90b3R5cGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKHQsZSk7dmFyIHI9dGhpcy5faXRlcmFibGUsbj1EKHIpLGk9MDtpZihxKG4pKWZvcih2YXIgbzshKG89bi5uZXh0KCkpLmRvbmUmJnQoby52YWx1ZSxpKyssdGhpcykhPT0hMTspO1xuICByZXR1cm4gaX0sVS5wcm90b3R5cGUuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodCxlKTt2YXIgcj10aGlzLl9pdGVyYWJsZSxuPUQocik7aWYoIXEobikpcmV0dXJuIG5ldyBTKEkpO3ZhciBpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9bi5uZXh0KCk7cmV0dXJuIGUuZG9uZT9lOnoodCxpKyssZS52YWx1ZSl9KX0sdChLLGspLEsucHJvdG90eXBlLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZSh0LGUpO2Zvcih2YXIgcj10aGlzLl9pdGVyYXRvcixuPXRoaXMuX2l0ZXJhdG9yQ2FjaGUsaT0wO24ubGVuZ3RoPmk7KWlmKHQobltpXSxpKyssdGhpcyk9PT0hMSlyZXR1cm4gaTtmb3IodmFyIG87IShvPXIubmV4dCgpKS5kb25lOyl7dmFyIHU9by52YWx1ZTtpZihuW2ldPXUsdCh1LGkrKyx0aGlzKT09PSExKWJyZWFrfXJldHVybiBpfSxLLnByb3RvdHlwZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXJhdG9yLG49dGhpcy5faXRlcmF0b3JDYWNoZSxpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7aWYoaT49bi5sZW5ndGgpe3ZhciBlPXIubmV4dCgpO2lmKGUuZG9uZSlyZXR1cm4gZTtuW2ldPWUudmFsdWV9cmV0dXJuIHoodCxpLG5baSsrXSl9KX07dmFyIHFyO3QoSCxfKSx0KFYsSCksdChZLEgpLHQoUSxIKSxILktleWVkPVYsSC5JbmRleGVkPVksSC5TZXQ9UTt2YXIgRHIsTXI9XCJmdW5jdGlvblwiPT10eXBlb2YgTWF0aC5pbXVsJiYtMj09PU1hdGguaW11bCg0Mjk0OTY3Mjk1LDIpP01hdGguaW11bDpmdW5jdGlvbih0LGUpe3Q9MHx0LGU9MHxlO3ZhciByPTY1NTM1JnQsbj02NTUzNSZlO3JldHVybiByKm4rKCh0Pj4+MTYpKm4rciooZT4+PjE2KTw8MTY+Pj4wKXwwfSxFcj1PYmplY3QuaXNFeHRlbnNpYmxlLE9yPWZ1bmN0aW9uKCl7dHJ5e3JldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sXCJAXCIse30pLCEwfWNhdGNoKHQpe3JldHVybiExfX0oKSx4cj1cImZ1bmN0aW9uXCI9PXR5cGVvZiBXZWFrTWFwO3hyJiYoRHI9bmV3IFdlYWtNYXApO3ZhciBrcj0wLEFyPVwiX19pbW11dGFibGVoYXNoX19cIjtcImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJihBcj1TeW1ib2woQXIpKTt2YXIganI9MTYsUnI9MjU1LFVyPTAsS3I9e307dChhdCx4KSxhdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2l0ZXIuZ2V0KHQsZSl9LGF0LnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2l0ZXIuaGFzKHQpfSxhdC5wcm90b3R5cGUudmFsdWVTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXRlci52YWx1ZVNlcSgpfSxhdC5wcm90b3R5cGUucmV2ZXJzZT1mdW5jdGlvbigpe3ZhciB0PXRoaXMsZT12dCh0aGlzLCEwKTtyZXR1cm4gdGhpcy5fdXNlS2V5c3x8KGUudmFsdWVTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdC5faXRlci50b1NlcSgpLnJldmVyc2UoKX0pLGV9LGF0LnByb3RvdHlwZS5tYXA9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLG49cHQodGhpcyx0LGUpO3JldHVybiB0aGlzLl91c2VLZXlzfHwobi52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiByLl9pdGVyLnRvU2VxKCkubWFwKHQsZSl9KSxufSxhdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHIsbj10aGlzO3JldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZSh0aGlzLl91c2VLZXlzP2Z1bmN0aW9uKGUscil7cmV0dXJuIHQoZSxyLG4pfToocj1lP2t0KHRoaXMpOjAsZnVuY3Rpb24oaSl7cmV0dXJuIHQoaSxlPy0tcjpyKyssbil9KSxlKX0sYXQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtpZih0aGlzLl91c2VLZXlzKXJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0b3IodCxlKTt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSksbj1lP2t0KHRoaXMpOjA7XG4gIHJldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBpPXIubmV4dCgpO3JldHVybiBpLmRvbmU/aTp6KHQsZT8tLW46bisrLGkudmFsdWUsaSl9KX0sYXQucHJvdG90eXBlW2RyXT0hMCx0KGh0LGspLGh0LnByb3RvdHlwZS5pbmNsdWRlcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5pbmNsdWRlcyh0KX0saHQucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj0wO3JldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gdChlLG4rKyxyKX0sZSl9LGh0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpLG49MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgZT1yLm5leHQoKTtyZXR1cm4gZS5kb25lP2U6eih0LG4rKyxlLnZhbHVlLGUpfSl9LHQoZnQsQSksZnQucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5pbmNsdWRlcyh0KX0sZnQucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiB0KGUsZSxyKX0sZSl9LGZ0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPXIubmV4dCgpO3JldHVybiBlLmRvbmU/ZTp6KHQsZS52YWx1ZSxlLnZhbHVlLGUpfSl9LHQoY3QseCksY3QucHJvdG90eXBlLmVudHJ5U2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2l0ZXIudG9TZXEoKX0sY3QucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe2lmKGUpe3h0KGUpO3ZhciBuPXkoZSk7cmV0dXJuIHQobj9lLmdldCgxKTplWzFdLG4/ZS5nZXQoMCk6ZVswXSxyKX19LGUpfSxjdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2l0ZXIuX19pdGVyYXRvcihncixlKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoOzspe3ZhciBlPXIubmV4dCgpO2lmKGUuZG9uZSlyZXR1cm4gZTt2YXIgbj1lLnZhbHVlO2lmKG4pe3h0KG4pO3ZhciBpPXkobik7cmV0dXJuIHoodCxpP24uZ2V0KDApOm5bMF0saT9uLmdldCgxKTpuWzFdLGUpfX19KX0saHQucHJvdG90eXBlLmNhY2hlUmVzdWx0PWF0LnByb3RvdHlwZS5jYWNoZVJlc3VsdD1mdC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9Y3QucHJvdG90eXBlLmNhY2hlUmVzdWx0PVJ0LHQoTHQsViksTHQucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIk1hcCB7XCIsXCJ9XCIpfSxMdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX3Jvb3Q/dGhpcy5fcm9vdC5nZXQoMCx2b2lkIDAsdCxlKTplfSxMdC5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFh0KHRoaXMsdCxlKX0sTHQucHJvdG90eXBlLnNldEluPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxjcixmdW5jdGlvbigpe3JldHVybiBlfSl9LEx0LnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7cmV0dXJuIFh0KHRoaXMsdCxjcil9LEx0LnByb3RvdHlwZS5kZWxldGVJbj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy51cGRhdGVJbih0LGZ1bmN0aW9uKCl7cmV0dXJuIGNyfSl9LEx0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLHIpe3JldHVybiAxPT09YXJndW1lbnRzLmxlbmd0aD90KHRoaXMpOnRoaXMudXBkYXRlSW4oW3RdLGUscil9LEx0LnByb3RvdHlwZS51cGRhdGVJbj1mdW5jdGlvbih0LGUscil7cnx8KHI9ZSxlPXZvaWQgMCk7dmFyIG49b2UodGhpcyxLdCh0KSxlLHIpO3JldHVybiBuPT09Y3I/dm9pZCAwOm59LEx0LnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX3Jvb3Q9bnVsbCxcbiAgdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOlF0KCl9LEx0LnByb3RvdHlwZS5tZXJnZT1mdW5jdGlvbigpe3JldHVybiByZSh0aGlzLHZvaWQgMCxhcmd1bWVudHMpfSxMdC5wcm90b3R5cGUubWVyZ2VXaXRoPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiByZSh0aGlzLHQsZSl9LEx0LnByb3RvdHlwZS5tZXJnZUluPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiB0aGlzLnVwZGF0ZUluKHQsUXQoKSxmdW5jdGlvbih0KXtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm1lcmdlP3QubWVyZ2UuYXBwbHkodCxlKTplW2UubGVuZ3RoLTFdfSl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXA9ZnVuY3Rpb24oKXtyZXR1cm4gcmUodGhpcyxuZSh2b2lkIDApLGFyZ3VtZW50cyl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXBXaXRoPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiByZSh0aGlzLG5lKHQpLGUpfSxMdC5wcm90b3R5cGUubWVyZ2VEZWVwSW49ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxRdCgpLGZ1bmN0aW9uKHQpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQubWVyZ2VEZWVwP3QubWVyZ2VEZWVwLmFwcGx5KHQsZSk6ZVtlLmxlbmd0aC0xXX0pfSxMdC5wcm90b3R5cGUuc29ydD1mdW5jdGlvbih0KXtyZXR1cm4gSWUocXQodGhpcyx0KSl9LEx0LnByb3RvdHlwZS5zb3J0Qnk9ZnVuY3Rpb24odCxlKXtyZXR1cm4gSWUocXQodGhpcyxlLHQpKX0sTHQucHJvdG90eXBlLndpdGhNdXRhdGlvbnM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5hc011dGFibGUoKTtyZXR1cm4gdChlKSxlLndhc0FsdGVyZWQoKT9lLl9fZW5zdXJlT3duZXIodGhpcy5fX293bmVySUQpOnRoaXN9LEx0LnByb3RvdHlwZS5hc011dGFibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX293bmVySUQ/dGhpczp0aGlzLl9fZW5zdXJlT3duZXIobmV3IG4pfSxMdC5wcm90b3R5cGUuYXNJbW11dGFibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2Vuc3VyZU93bmVyKCl9LEx0LnByb3RvdHlwZS53YXNBbHRlcmVkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19hbHRlcmVkfSxMdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgUHQodGhpcyx0LGUpfSxMdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIHRoaXMuX3Jvb3QmJnRoaXMuX3Jvb3QuaXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gbisrLHQoZVsxXSxlWzBdLHIpfSxlKSxufSxMdC5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD9ZdCh0aGlzLnNpemUsdGhpcy5fcm9vdCx0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9fYWx0ZXJlZD0hMSx0aGlzKX0sTHQuaXNNYXA9VHQ7dmFyIExyPVwiQEBfX0lNTVVUQUJMRV9NQVBfX0BAXCIsVHI9THQucHJvdG90eXBlO1RyW0xyXT0hMCxUcltzcl09VHIucmVtb3ZlLFRyLnJlbW92ZUluPVRyLmRlbGV0ZUluLFd0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7Zm9yKHZhciBpPXRoaXMuZW50cmllcyxvPTAsdT1pLmxlbmd0aDt1Pm87bysrKWlmKFgocixpW29dWzBdKSlyZXR1cm4gaVtvXVsxXTtyZXR1cm4gbn0sV3QucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUsbixvLHUscyxhKXtmb3IodmFyIGg9dT09PWNyLGY9dGhpcy5lbnRyaWVzLGM9MCxfPWYubGVuZ3RoO18+YyYmIVgobyxmW2NdWzBdKTtjKyspO3ZhciBwPV8+YztpZihwP2ZbY11bMV09PT11OmgpcmV0dXJuIHRoaXM7aWYocihhKSwoaHx8IXApJiZyKHMpLCFofHwxIT09Zi5sZW5ndGgpe2lmKCFwJiYhaCYmZi5sZW5ndGg+PUJyKXJldHVybiAkdCh0LGYsbyx1KTt2YXIgdj10JiZ0PT09dGhpcy5vd25lcklELGw9dj9mOmkoZik7cmV0dXJuIHA/aD9jPT09Xy0xP2wucG9wKCk6bFtjXT1sLnBvcCgpOmxbY109W28sdV06bC5wdXNoKFtvLHVdKSxcbiAgdj8odGhpcy5lbnRyaWVzPWwsdGhpcyk6bmV3IFd0KHQsbCl9fSxCdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe3ZvaWQgMD09PWUmJihlPWV0KHIpKTt2YXIgaT0xPDwoKDA9PT10P2U6ZT4+PnQpJmZyKSxvPXRoaXMuYml0bWFwO3JldHVybiAwPT09KG8maSk/bjp0aGlzLm5vZGVzW3VlKG8maS0xKV0uZ2V0KHQrYXIsZSxyLG4pfSxCdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxyLG4saSxvLHUpe3ZvaWQgMD09PXImJihyPWV0KG4pKTt2YXIgcz0oMD09PWU/cjpyPj4+ZSkmZnIsYT0xPDxzLGg9dGhpcy5iaXRtYXAsZj0wIT09KGgmYSk7aWYoIWYmJmk9PT1jcilyZXR1cm4gdGhpczt2YXIgYz11ZShoJmEtMSksXz10aGlzLm5vZGVzLHA9Zj9fW2NdOnZvaWQgMCx2PUZ0KHAsdCxlK2FyLHIsbixpLG8sdSk7aWYodj09PXApcmV0dXJuIHRoaXM7aWYoIWYmJnYmJl8ubGVuZ3RoPj1DcilyZXR1cm4gZWUodCxfLGgscyx2KTtpZihmJiYhdiYmMj09PV8ubGVuZ3RoJiZHdChfWzFeY10pKXJldHVybiBfWzFeY107aWYoZiYmdiYmMT09PV8ubGVuZ3RoJiZHdCh2KSlyZXR1cm4gdjt2YXIgbD10JiZ0PT09dGhpcy5vd25lcklELHk9Zj92P2g6aF5hOmh8YSxkPWY/dj9zZShfLGMsdixsKTpoZShfLGMsbCk6YWUoXyxjLHYsbCk7cmV0dXJuIGw/KHRoaXMuYml0bWFwPXksdGhpcy5ub2Rlcz1kLHRoaXMpOm5ldyBCdCh0LHksZCl9LEN0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7dm9pZCAwPT09ZSYmKGU9ZXQocikpO3ZhciBpPSgwPT09dD9lOmU+Pj50KSZmcixvPXRoaXMubm9kZXNbaV07cmV0dXJuIG8/by5nZXQodCthcixlLHIsbik6bn0sQ3QucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUscixuLGksbyx1KXt2b2lkIDA9PT1yJiYocj1ldChuKSk7dmFyIHM9KDA9PT1lP3I6cj4+PmUpJmZyLGE9aT09PWNyLGg9dGhpcy5ub2RlcyxmPWhbc107aWYoYSYmIWYpcmV0dXJuIHRoaXM7dmFyIGM9RnQoZix0LGUrYXIscixuLGksbyx1KTtpZihjPT09ZilyZXR1cm4gdGhpczt2YXIgXz10aGlzLmNvdW50O2lmKGYpe2lmKCFjJiYoXy0tLEpyPl8pKXJldHVybiB0ZSh0LGgsXyxzKX1lbHNlIF8rKzt2YXIgcD10JiZ0PT09dGhpcy5vd25lcklELHY9c2UoaCxzLGMscCk7cmV0dXJuIHA/KHRoaXMuY291bnQ9Xyx0aGlzLm5vZGVzPXYsdGhpcyk6bmV3IEN0KHQsXyx2KX0sSnQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtmb3IodmFyIGk9dGhpcy5lbnRyaWVzLG89MCx1PWkubGVuZ3RoO3U+bztvKyspaWYoWChyLGlbb11bMF0pKXJldHVybiBpW29dWzFdO3JldHVybiBufSxKdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLG8sdSxzLGEpe3ZvaWQgMD09PW4mJihuPWV0KG8pKTt2YXIgaD11PT09Y3I7aWYobiE9PXRoaXMua2V5SGFzaClyZXR1cm4gaD90aGlzOihyKGEpLHIocyksWnQodGhpcyx0LGUsbixbbyx1XSkpO2Zvcih2YXIgZj10aGlzLmVudHJpZXMsYz0wLF89Zi5sZW5ndGg7Xz5jJiYhWChvLGZbY11bMF0pO2MrKyk7dmFyIHA9Xz5jO2lmKHA/ZltjXVsxXT09PXU6aClyZXR1cm4gdGhpcztpZihyKGEpLChofHwhcCkmJnIocyksaCYmMj09PV8pcmV0dXJuIG5ldyBOdCh0LHRoaXMua2V5SGFzaCxmWzFeY10pO3ZhciB2PXQmJnQ9PT10aGlzLm93bmVySUQsbD12P2Y6aShmKTtyZXR1cm4gcD9oP2M9PT1fLTE/bC5wb3AoKTpsW2NdPWwucG9wKCk6bFtjXT1bbyx1XTpsLnB1c2goW28sdV0pLHY/KHRoaXMuZW50cmllcz1sLHRoaXMpOm5ldyBKdCh0LHRoaXMua2V5SGFzaCxsKX0sTnQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtyZXR1cm4gWChyLHRoaXMuZW50cnlbMF0pP3RoaXMuZW50cnlbMV06bn0sTnQucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUsbixpLG8sdSxzKXt2YXIgYT1vPT09Y3IsaD1YKGksdGhpcy5lbnRyeVswXSk7cmV0dXJuKGg/bz09PXRoaXMuZW50cnlbMV06YSk/dGhpczoocihzKSxhP3ZvaWQgcih1KTpoP3QmJnQ9PT10aGlzLm93bmVySUQ/KHRoaXMuZW50cnlbMV09byx0aGlzKTpuZXcgTnQodCx0aGlzLmtleUhhc2gsW2ksb10pOihyKHUpLFxuICBadCh0aGlzLHQsZSxldChpKSxbaSxvXSkpKX0sV3QucHJvdG90eXBlLml0ZXJhdGU9SnQucHJvdG90eXBlLml0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5lbnRyaWVzLG49MCxpPXIubGVuZ3RoLTE7aT49bjtuKyspaWYodChyW2U/aS1uOm5dKT09PSExKXJldHVybiExfSxCdC5wcm90b3R5cGUuaXRlcmF0ZT1DdC5wcm90b3R5cGUuaXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLm5vZGVzLG49MCxpPXIubGVuZ3RoLTE7aT49bjtuKyspe3ZhciBvPXJbZT9pLW46bl07aWYobyYmby5pdGVyYXRlKHQsZSk9PT0hMSlyZXR1cm4hMX19LE50LnByb3RvdHlwZS5pdGVyYXRlPWZ1bmN0aW9uKHQpe3JldHVybiB0KHRoaXMuZW50cnkpfSx0KFB0LFMpLFB0LnByb3RvdHlwZS5uZXh0PWZ1bmN0aW9uKCl7Zm9yKHZhciB0PXRoaXMuX3R5cGUsZT10aGlzLl9zdGFjaztlOyl7dmFyIHIsbj1lLm5vZGUsaT1lLmluZGV4Kys7aWYobi5lbnRyeSl7aWYoMD09PWkpcmV0dXJuIEh0KHQsbi5lbnRyeSl9ZWxzZSBpZihuLmVudHJpZXMpe2lmKHI9bi5lbnRyaWVzLmxlbmd0aC0xLHI+PWkpcmV0dXJuIEh0KHQsbi5lbnRyaWVzW3RoaXMuX3JldmVyc2U/ci1pOmldKX1lbHNlIGlmKHI9bi5ub2Rlcy5sZW5ndGgtMSxyPj1pKXt2YXIgbz1uLm5vZGVzW3RoaXMuX3JldmVyc2U/ci1pOmldO2lmKG8pe2lmKG8uZW50cnkpcmV0dXJuIEh0KHQsby5lbnRyeSk7ZT10aGlzLl9zdGFjaz1WdChvLGUpfWNvbnRpbnVlfWU9dGhpcy5fc3RhY2s9dGhpcy5fc3RhY2suX19wcmV2fXJldHVybiBJKCl9O3ZhciBXcixCcj1oci80LENyPWhyLzIsSnI9aHIvNDt0KGZlLFkpLGZlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sZmUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIkxpc3QgW1wiLFwiXVwiKX0sZmUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe2lmKHQ9dSh0aGlzLHQpLHQ+PTAmJnRoaXMuc2l6ZT50KXt0Kz10aGlzLl9vcmlnaW47dmFyIHI9Z2UodGhpcyx0KTtyZXR1cm4gciYmci5hcnJheVt0JmZyXX1yZXR1cm4gZX0sZmUucHJvdG90eXBlLnNldD1mdW5jdGlvbih0LGUpe3JldHVybiB5ZSh0aGlzLHQsZSl9LGZlLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuaGFzKHQpPzA9PT10P3RoaXMuc2hpZnQoKTp0PT09dGhpcy5zaXplLTE/dGhpcy5wb3AoKTp0aGlzLnNwbGljZSh0LDEpOnRoaXN9LGZlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT10aGlzLl9vcmlnaW49dGhpcy5fY2FwYWNpdHk9MCx0aGlzLl9sZXZlbD1hcix0aGlzLl9yb290PXRoaXMuX3RhaWw9bnVsbCx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6bGUoKX0sZmUucHJvdG90eXBlLnB1c2g9ZnVuY3Rpb24oKXt2YXIgdD1hcmd1bWVudHMsZT10aGlzLnNpemU7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihyKXt3ZShyLDAsZSt0Lmxlbmd0aCk7Zm9yKHZhciBuPTA7dC5sZW5ndGg+bjtuKyspci5zZXQoZStuLHRbbl0pfSl9LGZlLnByb3RvdHlwZS5wb3A9ZnVuY3Rpb24oKXtyZXR1cm4gd2UodGhpcywwLC0xKX0sZmUucHJvdG90eXBlLnVuc2hpZnQ9ZnVuY3Rpb24oKXt2YXIgdD1hcmd1bWVudHM7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt3ZShlLC10Lmxlbmd0aCk7Zm9yKHZhciByPTA7dC5sZW5ndGg+cjtyKyspZS5zZXQocix0W3JdKX0pfSxmZS5wcm90b3R5cGUuc2hpZnQ9ZnVuY3Rpb24oKXtyZXR1cm4gd2UodGhpcywxKX0sZmUucHJvdG90eXBlLm1lcmdlPWZ1bmN0aW9uKCl7cmV0dXJuIFNlKHRoaXMsdm9pZCAwLGFyZ3VtZW50cyl9LGZlLnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIFNlKHRoaXMsdCxlKX0sZmUucHJvdG90eXBlLm1lcmdlRGVlcD1mdW5jdGlvbigpe3JldHVybiBTZSh0aGlzLG5lKHZvaWQgMCksYXJndW1lbnRzKTtcbn0sZmUucHJvdG90eXBlLm1lcmdlRGVlcFdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIFNlKHRoaXMsbmUodCksZSl9LGZlLnByb3RvdHlwZS5zZXRTaXplPWZ1bmN0aW9uKHQpe3JldHVybiB3ZSh0aGlzLDAsdCl9LGZlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuc2l6ZTtyZXR1cm4gYSh0LGUscik/dGhpczp3ZSh0aGlzLGgodCxyKSxmKGUscikpfSxmZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPTAsbj1wZSh0aGlzLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPW4oKTtyZXR1cm4gZT09PVZyP0koKTp6KHQscisrLGUpfSl9LGZlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHIsbj0wLGk9cGUodGhpcyxlKTsocj1pKCkpIT09VnImJnQocixuKyssdGhpcykhPT0hMTspO3JldHVybiBufSxmZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD92ZSh0aGlzLl9vcmlnaW4sdGhpcy5fY2FwYWNpdHksdGhpcy5fbGV2ZWwsdGhpcy5fcm9vdCx0aGlzLl90YWlsLHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMpfSxmZS5pc0xpc3Q9Y2U7dmFyIE5yPVwiQEBfX0lNTVVUQUJMRV9MSVNUX19AQFwiLFByPWZlLnByb3RvdHlwZTtQcltOcl09ITAsUHJbc3JdPVByLnJlbW92ZSxQci5zZXRJbj1Uci5zZXRJbixQci5kZWxldGVJbj1Qci5yZW1vdmVJbj1Uci5yZW1vdmVJbixQci51cGRhdGU9VHIudXBkYXRlLFByLnVwZGF0ZUluPVRyLnVwZGF0ZUluLFByLm1lcmdlSW49VHIubWVyZ2VJbixQci5tZXJnZURlZXBJbj1Uci5tZXJnZURlZXBJbixQci53aXRoTXV0YXRpb25zPVRyLndpdGhNdXRhdGlvbnMsUHIuYXNNdXRhYmxlPVRyLmFzTXV0YWJsZSxQci5hc0ltbXV0YWJsZT1Uci5hc0ltbXV0YWJsZSxQci53YXNBbHRlcmVkPVRyLndhc0FsdGVyZWQsX2UucHJvdG90eXBlLnJlbW92ZUJlZm9yZT1mdW5jdGlvbih0LGUscil7aWYocj09PWU/MTw8ZTowPT09dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIHRoaXM7dmFyIG49cj4+PmUmZnI7aWYobj49dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIG5ldyBfZShbXSx0KTt2YXIgaSxvPTA9PT1uO2lmKGU+MCl7dmFyIHU9dGhpcy5hcnJheVtuXTtpZihpPXUmJnUucmVtb3ZlQmVmb3JlKHQsZS1hcixyKSxpPT09dSYmbylyZXR1cm4gdGhpc31pZihvJiYhaSlyZXR1cm4gdGhpczt2YXIgcz1tZSh0aGlzLHQpO2lmKCFvKWZvcih2YXIgYT0wO24+YTthKyspcy5hcnJheVthXT12b2lkIDA7cmV0dXJuIGkmJihzLmFycmF5W25dPWkpLHN9LF9lLnByb3RvdHlwZS5yZW1vdmVBZnRlcj1mdW5jdGlvbih0LGUscil7aWYocj09PShlPzE8PGU6MCl8fDA9PT10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gdGhpczt2YXIgbj1yLTE+Pj5lJmZyO2lmKG4+PXRoaXMuYXJyYXkubGVuZ3RoKXJldHVybiB0aGlzO3ZhciBpO2lmKGU+MCl7dmFyIG89dGhpcy5hcnJheVtuXTtpZihpPW8mJm8ucmVtb3ZlQWZ0ZXIodCxlLWFyLHIpLGk9PT1vJiZuPT09dGhpcy5hcnJheS5sZW5ndGgtMSlyZXR1cm4gdGhpc312YXIgdT1tZSh0aGlzLHQpO3JldHVybiB1LmFycmF5LnNwbGljZShuKzEpLGkmJih1LmFycmF5W25dPWkpLHV9O3ZhciBIcixWcj17fTt0KEllLEx0KSxJZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LEllLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJPcmRlcmVkTWFwIHtcIixcIn1cIil9LEllLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9tYXAuZ2V0KHQpO3JldHVybiB2b2lkIDAhPT1yP3RoaXMuX2xpc3QuZ2V0KHIpWzFdOmV9LEllLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX21hcC5jbGVhcigpLHRoaXMuX2xpc3QuY2xlYXIoKSx0aGlzKTpEZSgpO1xufSxJZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE1lKHRoaXMsdCxlKX0sSWUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gTWUodGhpcyx0LGNyKX0sSWUucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKXx8dGhpcy5fbGlzdC53YXNBbHRlcmVkKCl9LEllLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiB0aGlzLl9saXN0Ll9faXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gZSYmdChlWzFdLGVbMF0scil9LGUpfSxJZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9saXN0LmZyb21FbnRyeVNlcSgpLl9faXRlcmF0b3IodCxlKX0sSWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7aWYodD09PXRoaXMuX19vd25lcklEKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpLHI9dGhpcy5fbGlzdC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P3FlKGUscix0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9tYXA9ZSx0aGlzLl9saXN0PXIsdGhpcyl9LEllLmlzT3JkZXJlZE1hcD1iZSxJZS5wcm90b3R5cGVbZHJdPSEwLEllLnByb3RvdHlwZVtzcl09SWUucHJvdG90eXBlLnJlbW92ZTt2YXIgWXI7dChFZSxZKSxFZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTdGFjayBbXCIsXCJdXCIpfSxFZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faGVhZDtmb3IodD11KHRoaXMsdCk7ciYmdC0tOylyPXIubmV4dDtyZXR1cm4gcj9yLnZhbHVlOmV9LEVlLnByb3RvdHlwZS5wZWVrPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2hlYWQmJnRoaXMuX2hlYWQudmFsdWV9LEVlLnByb3RvdHlwZS5wdXNoPWZ1bmN0aW9uKCl7aWYoMD09PWFyZ3VtZW50cy5sZW5ndGgpcmV0dXJuIHRoaXM7Zm9yKHZhciB0PXRoaXMuc2l6ZSthcmd1bWVudHMubGVuZ3RoLGU9dGhpcy5faGVhZCxyPWFyZ3VtZW50cy5sZW5ndGgtMTtyPj0wO3ItLSllPXt2YWx1ZTphcmd1bWVudHNbcl0sbmV4dDplfTtyZXR1cm4gdGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT10LHRoaXMuX2hlYWQ9ZSx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6eGUodCxlKX0sRWUucHJvdG90eXBlLnB1c2hBbGw9ZnVuY3Rpb24odCl7aWYodD12KHQpLDA9PT10LnNpemUpcmV0dXJuIHRoaXM7c3QodC5zaXplKTt2YXIgZT10aGlzLnNpemUscj10aGlzLl9oZWFkO3JldHVybiB0LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe2UrKyxyPXt2YWx1ZTp0LG5leHQ6cn19KSx0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPWUsdGhpcy5faGVhZD1yLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZShlLHIpfSxFZS5wcm90b3R5cGUucG9wPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMSl9LEVlLnByb3RvdHlwZS51bnNoaWZ0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucHVzaC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS51bnNoaWZ0QWxsPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnB1c2hBbGwodCl9LEVlLnByb3RvdHlwZS5zaGlmdD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnBvcC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX2hlYWQ9dm9pZCAwLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTprZSgpfSxFZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXtpZihhKHQsZSx0aGlzLnNpemUpKXJldHVybiB0aGlzO3ZhciByPWgodCx0aGlzLnNpemUpLG49ZihlLHRoaXMuc2l6ZSk7aWYobiE9PXRoaXMuc2l6ZSlyZXR1cm4gWS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLHQsZSk7XG4gIGZvcih2YXIgaT10aGlzLnNpemUtcixvPXRoaXMuX2hlYWQ7ci0tOylvPW8ubmV4dDtyZXR1cm4gdGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT1pLHRoaXMuX2hlYWQ9byx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6eGUoaSxvKX0sRWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7cmV0dXJuIHQ9PT10aGlzLl9fb3duZXJJRD90aGlzOnQ/eGUodGhpcy5zaXplLHRoaXMuX2hlYWQsdCx0aGlzLl9faGFzaCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fX2FsdGVyZWQ9ITEsdGhpcyl9LEVlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLnJldmVyc2UoKS5fX2l0ZXJhdGUodCk7Zm9yKHZhciByPTAsbj10aGlzLl9oZWFkO24mJnQobi52YWx1ZSxyKyssdGhpcykhPT0hMTspbj1uLm5leHQ7cmV0dXJuIHJ9LEVlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5yZXZlcnNlKCkuX19pdGVyYXRvcih0KTt2YXIgcj0wLG49dGhpcy5faGVhZDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZihuKXt2YXIgZT1uLnZhbHVlO3JldHVybiBuPW4ubmV4dCx6KHQscisrLGUpfXJldHVybiBJKCl9KX0sRWUuaXNTdGFjaz1PZTt2YXIgUXI9XCJAQF9fSU1NVVRBQkxFX1NUQUNLX19AQFwiLFhyPUVlLnByb3RvdHlwZTtYcltRcl09ITAsWHIud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLFhyLmFzTXV0YWJsZT1Uci5hc011dGFibGUsWHIuYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsWHIud2FzQWx0ZXJlZD1Uci53YXNBbHRlcmVkO3ZhciBGcjt0KEFlLFEpLEFlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sQWUuZnJvbUtleXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMocCh0KS5rZXlTZXEoKSl9LEFlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXQge1wiLFwifVwiKX0sQWUucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fbWFwLmhhcyh0KX0sQWUucHJvdG90eXBlLmFkZD1mdW5jdGlvbih0KXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAuc2V0KHQsITApKX0sQWUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAucmVtb3ZlKHQpKX0sQWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIFJlKHRoaXMsdGhpcy5fbWFwLmNsZWFyKCkpfSxBZS5wcm90b3R5cGUudW5pb249ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtyZXR1cm4gdD10LmZpbHRlcihmdW5jdGlvbih0KXtyZXR1cm4gMCE9PXQuc2l6ZX0pLDA9PT10Lmxlbmd0aD90aGlzOjAhPT10aGlzLnNpemV8fHRoaXMuX19vd25lcklEfHwxIT09dC5sZW5ndGg/dGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe2Zvcih2YXIgcj0wO3QubGVuZ3RoPnI7cisrKWwodFtyXSkuZm9yRWFjaChmdW5jdGlvbih0KXtyZXR1cm4gZS5hZGQodCl9KX0pOnRoaXMuY29uc3RydWN0b3IodFswXSl9LEFlLnByb3RvdHlwZS5pbnRlcnNlY3Q9ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtpZigwPT09dC5sZW5ndGgpcmV0dXJuIHRoaXM7dD10Lm1hcChmdW5jdGlvbih0KXtyZXR1cm4gbCh0KX0pO3ZhciBlPXRoaXM7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihyKXtlLmZvckVhY2goZnVuY3Rpb24oZSl7dC5ldmVyeShmdW5jdGlvbih0KXtyZXR1cm4gdC5pbmNsdWRlcyhlKX0pfHxyLnJlbW92ZShlKX0pfSl9LEFlLnByb3RvdHlwZS5zdWJ0cmFjdD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO2lmKDA9PT10Lmxlbmd0aClyZXR1cm4gdGhpczt0PXQubWFwKGZ1bmN0aW9uKHQpe3JldHVybiBsKHQpfSk7dmFyIGU9dGhpcztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe2UuZm9yRWFjaChmdW5jdGlvbihlKXt0LnNvbWUoZnVuY3Rpb24odCl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9KSYmci5yZW1vdmUoZSk7XG59KX0pfSxBZS5wcm90b3R5cGUubWVyZ2U9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEFlLnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLHQpfSxBZS5wcm90b3R5cGUuc29ydD1mdW5jdGlvbih0KXtyZXR1cm4gTGUocXQodGhpcyx0KSl9LEFlLnByb3RvdHlwZS5zb3J0Qnk9ZnVuY3Rpb24odCxlKXtyZXR1cm4gTGUocXQodGhpcyxlLHQpKX0sQWUucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKX0sQWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX21hcC5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxuKXtyZXR1cm4gdChuLG4scil9LGUpfSxBZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9tYXAubWFwKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIGV9KS5fX2l0ZXJhdG9yKHQsZSl9LEFlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe2lmKHQ9PT10aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAuX19lbnN1cmVPd25lcih0KTtyZXR1cm4gdD90aGlzLl9fbWFrZShlLHQpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX21hcD1lLHRoaXMpfSxBZS5pc1NldD1qZTt2YXIgR3I9XCJAQF9fSU1NVVRBQkxFX1NFVF9fQEBcIixacj1BZS5wcm90b3R5cGU7WnJbR3JdPSEwLFpyW3NyXT1aci5yZW1vdmUsWnIubWVyZ2VEZWVwPVpyLm1lcmdlLFpyLm1lcmdlRGVlcFdpdGg9WnIubWVyZ2VXaXRoLFpyLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxaci5hc011dGFibGU9VHIuYXNNdXRhYmxlLFpyLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLFpyLl9fZW1wdHk9S2UsWnIuX19tYWtlPVVlO3ZhciAkcjt0KExlLEFlKSxMZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LExlLmZyb21LZXlzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzKHAodCkua2V5U2VxKCkpfSxMZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiT3JkZXJlZFNldCB7XCIsXCJ9XCIpfSxMZS5pc09yZGVyZWRTZXQ9VGU7dmFyIHRuPUxlLnByb3RvdHlwZTt0bltkcl09ITAsdG4uX19lbXB0eT1CZSx0bi5fX21ha2U9V2U7dmFyIGVuO3QoQ2UsViksQ2UucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhOZSh0aGlzKStcIiB7XCIsXCJ9XCIpfSxDZS5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9kZWZhdWx0VmFsdWVzLmhhc093blByb3BlcnR5KHQpfSxDZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7aWYoIXRoaXMuaGFzKHQpKXJldHVybiBlO3ZhciByPXRoaXMuX2RlZmF1bHRWYWx1ZXNbdF07cmV0dXJuIHRoaXMuX21hcD90aGlzLl9tYXAuZ2V0KHQscik6cn0sQ2UucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7aWYodGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXMuX21hcCYmdGhpcy5fbWFwLmNsZWFyKCksdGhpczt2YXIgdD10aGlzLmNvbnN0cnVjdG9yO3JldHVybiB0Ll9lbXB0eXx8KHQuX2VtcHR5PUplKHRoaXMsUXQoKSkpfSxDZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7aWYoIXRoaXMuaGFzKHQpKXRocm93IEVycm9yKCdDYW5ub3Qgc2V0IHVua25vd24ga2V5IFwiJyt0KydcIiBvbiAnK05lKHRoaXMpKTt2YXIgcj10aGlzLl9tYXAmJnRoaXMuX21hcC5zZXQodCxlKTtyZXR1cm4gdGhpcy5fX293bmVySUR8fHI9PT10aGlzLl9tYXA/dGhpczpKZSh0aGlzLHIpfSxDZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe2lmKCF0aGlzLmhhcyh0KSlyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAmJnRoaXMuX21hcC5yZW1vdmUodCk7cmV0dXJuIHRoaXMuX19vd25lcklEfHxlPT09dGhpcy5fbWFwP3RoaXM6SmUodGhpcyxlKX0sQ2UucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCl9LENlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gcCh0aGlzLl9kZWZhdWx0VmFsdWVzKS5tYXAoZnVuY3Rpb24odCxlKXtyZXR1cm4gci5nZXQoZSl9KS5fX2l0ZXJhdG9yKHQsZSl9LENlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBwKHRoaXMuX2RlZmF1bHRWYWx1ZXMpLm1hcChmdW5jdGlvbih0LGUpe3JldHVybiByLmdldChlKX0pLl9faXRlcmF0ZSh0LGUpfSxDZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtpZih0PT09dGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXM7dmFyIGU9dGhpcy5fbWFwJiZ0aGlzLl9tYXAuX19lbnN1cmVPd25lcih0KTtyZXR1cm4gdD9KZSh0aGlzLGUsdCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fbWFwPWUsdGhpcyl9O3ZhciBybj1DZS5wcm90b3R5cGU7cm5bc3JdPXJuLnJlbW92ZSxybi5kZWxldGVJbj1ybi5yZW1vdmVJbj1Uci5yZW1vdmVJbixybi5tZXJnZT1Uci5tZXJnZSxybi5tZXJnZVdpdGg9VHIubWVyZ2VXaXRoLHJuLm1lcmdlSW49VHIubWVyZ2VJbixybi5tZXJnZURlZXA9VHIubWVyZ2VEZWVwLHJuLm1lcmdlRGVlcFdpdGg9VHIubWVyZ2VEZWVwV2l0aCxybi5tZXJnZURlZXBJbj1Uci5tZXJnZURlZXBJbixybi5zZXRJbj1Uci5zZXRJbixybi51cGRhdGU9VHIudXBkYXRlLHJuLnVwZGF0ZUluPVRyLnVwZGF0ZUluLHJuLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxybi5hc011dGFibGU9VHIuYXNNdXRhYmxlLHJuLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLHQoWWUsayksWWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/XCJSYW5nZSBbXVwiOlwiUmFuZ2UgWyBcIit0aGlzLl9zdGFydCtcIi4uLlwiK3RoaXMuX2VuZCsodGhpcy5fc3RlcD4xP1wiIGJ5IFwiK3RoaXMuX3N0ZXA6XCJcIikrXCIgXVwifSxZZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuaGFzKHQpP3RoaXMuX3N0YXJ0K3UodGhpcyx0KSp0aGlzLl9zdGVwOmV9LFllLnByb3RvdHlwZS5pbmNsdWRlcz1mdW5jdGlvbih0KXt2YXIgZT0odC10aGlzLl9zdGFydCkvdGhpcy5fc3RlcDtyZXR1cm4gZT49MCYmdGhpcy5zaXplPmUmJmU9PT1NYXRoLmZsb29yKGUpfSxZZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXtyZXR1cm4gYSh0LGUsdGhpcy5zaXplKT90aGlzOih0PWgodCx0aGlzLnNpemUpLGU9ZihlLHRoaXMuc2l6ZSksdD49ZT9uZXcgWWUoMCwwKTpuZXcgWWUodGhpcy5nZXQodCx0aGlzLl9lbmQpLHRoaXMuZ2V0KGUsdGhpcy5fZW5kKSx0aGlzLl9zdGVwKSl9LFllLnByb3RvdHlwZS5pbmRleE9mPWZ1bmN0aW9uKHQpe3ZhciBlPXQtdGhpcy5fc3RhcnQ7aWYoZSV0aGlzLl9zdGVwPT09MCl7dmFyIHI9ZS90aGlzLl9zdGVwO2lmKHI+PTAmJnRoaXMuc2l6ZT5yKXJldHVybiByfXJldHVybi0xfSxZZS5wcm90b3R5cGUubGFzdEluZGV4T2Y9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuaW5kZXhPZih0KX0sWWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLnNpemUtMSxuPXRoaXMuX3N0ZXAsaT1lP3RoaXMuX3N0YXJ0K3Iqbjp0aGlzLl9zdGFydCxvPTA7cj49bztvKyspe2lmKHQoaSxvLHRoaXMpPT09ITEpcmV0dXJuIG8rMTtpKz1lPy1uOm59cmV0dXJuIG99LFllLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5zaXplLTEsbj10aGlzLl9zdGVwLGk9ZT90aGlzLl9zdGFydCtyKm46dGhpcy5fc3RhcnQsbz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB1PWk7cmV0dXJuIGkrPWU/LW46bixvPnI/SSgpOnoodCxvKyssdSl9KX0sWWUucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbih0KXtyZXR1cm4gdCBpbnN0YW5jZW9mIFllP3RoaXMuX3N0YXJ0PT09dC5fc3RhcnQmJnRoaXMuX2VuZD09PXQuX2VuZCYmdGhpcy5fc3RlcD09PXQuX3N0ZXA6VmUodGhpcyx0KTtcbn07dmFyIG5uO3QoUWUsayksUWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/XCJSZXBlYXQgW11cIjpcIlJlcGVhdCBbIFwiK3RoaXMuX3ZhbHVlK1wiIFwiK3RoaXMuc2l6ZStcIiB0aW1lcyBdXCJ9LFFlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fdmFsdWU6ZX0sUWUucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3JldHVybiBYKHRoaXMuX3ZhbHVlLHQpfSxRZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLnNpemU7cmV0dXJuIGEodCxlLHIpP3RoaXM6bmV3IFFlKHRoaXMuX3ZhbHVlLGYoZSxyKS1oKHQscikpfSxRZS5wcm90b3R5cGUucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxRZS5wcm90b3R5cGUuaW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gWCh0aGlzLl92YWx1ZSx0KT8wOi0xfSxRZS5wcm90b3R5cGUubGFzdEluZGV4T2Y9ZnVuY3Rpb24odCl7cmV0dXJuIFgodGhpcy5fdmFsdWUsdCk/dGhpcy5zaXplOi0xfSxRZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT0wO3RoaXMuc2l6ZT5lO2UrKylpZih0KHRoaXMuX3ZhbHVlLGUsdGhpcyk9PT0hMSlyZXR1cm4gZSsxO3JldHVybiBlfSxRZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLHI9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtyZXR1cm4gZS5zaXplPnI/eih0LHIrKyxlLl92YWx1ZSk6SSgpfSl9LFFlLnByb3RvdHlwZS5lcXVhbHM9ZnVuY3Rpb24odCl7cmV0dXJuIHQgaW5zdGFuY2VvZiBRZT9YKHRoaXMuX3ZhbHVlLHQuX3ZhbHVlKTpWZSh0KX07dmFyIG9uO18uSXRlcmF0b3I9UyxYZShfLHt0b0FycmF5OmZ1bmN0aW9uKCl7c3QodGhpcy5zaXplKTt2YXIgdD1BcnJheSh0aGlzLnNpemV8fDApO3JldHVybiB0aGlzLnZhbHVlU2VxKCkuX19pdGVyYXRlKGZ1bmN0aW9uKGUscil7dFtyXT1lfSksdH0sdG9JbmRleGVkU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBodCh0aGlzKX0sdG9KUzpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvU2VxKCkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnRvSlM/dC50b0pTKCk6dH0pLl9fdG9KUygpfSx0b0pTT046ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdCYmXCJmdW5jdGlvblwiPT10eXBlb2YgdC50b0pTT04/dC50b0pTT04oKTp0fSkuX190b0pTKCl9LHRvS2V5ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGF0KHRoaXMsITApfSx0b01hcDpmdW5jdGlvbigpe3JldHVybiBMdCh0aGlzLnRvS2V5ZWRTZXEoKSl9LHRvT2JqZWN0OmZ1bmN0aW9uKCl7c3QodGhpcy5zaXplKTt2YXIgdD17fTtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxyKXt0W3JdPWV9KSx0fSx0b09yZGVyZWRNYXA6ZnVuY3Rpb24oKXtyZXR1cm4gSWUodGhpcy50b0tleWVkU2VxKCkpfSx0b09yZGVyZWRTZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gTGUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU2V0OmZ1bmN0aW9uKCl7cmV0dXJuIEFlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b1NldFNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgZnQodGhpcyl9LHRvU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG0odGhpcyk/dGhpcy50b0luZGV4ZWRTZXEoKTpkKHRoaXMpP3RoaXMudG9LZXllZFNlcSgpOnRoaXMudG9TZXRTZXEoKX0sdG9TdGFjazpmdW5jdGlvbigpe3JldHVybiBFZShkKHRoaXMpP3RoaXMudmFsdWVTZXEoKTp0aGlzKX0sdG9MaXN0OmZ1bmN0aW9uKCl7cmV0dXJuIGZlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b1N0cmluZzpmdW5jdGlvbigpe3JldHVyblwiW0l0ZXJhYmxlXVwifSxfX3RvU3RyaW5nOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIDA9PT10aGlzLnNpemU/dCtlOnQrXCIgXCIrdGhpcy50b1NlcSgpLm1hcCh0aGlzLl9fdG9TdHJpbmdNYXBwZXIpLmpvaW4oXCIsIFwiKStcIiBcIitlfSxjb25jYXQ6ZnVuY3Rpb24oKXtcbiAgdmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMCk7cmV0dXJuIE90KHRoaXMsU3QodGhpcyx0KSl9LGluY2x1ZGVzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnNvbWUoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxlbnRyaWVzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19pdGVyYXRvcih3cil9LGV2ZXJ5OmZ1bmN0aW9uKHQsZSl7c3QodGhpcy5zaXplKTt2YXIgcj0hMDtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obixpLG8pe3JldHVybiB0LmNhbGwoZSxuLGksbyk/dm9pZCAwOihyPSExLCExKX0pLHJ9LGZpbHRlcjpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLGx0KHRoaXMsdCxlLCEwKSl9LGZpbmQ6ZnVuY3Rpb24odCxlLHIpe3ZhciBuPXRoaXMuZmluZEVudHJ5KHQsZSk7cmV0dXJuIG4/blsxXTpyfSxmaW5kRW50cnk6ZnVuY3Rpb24odCxlKXt2YXIgcjtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obixpLG8pe3JldHVybiB0LmNhbGwoZSxuLGksbyk/KHI9W2ksbl0sITEpOnZvaWQgMH0pLHJ9LGZpbmRMYXN0RW50cnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maW5kRW50cnkodCxlKX0sZm9yRWFjaDpmdW5jdGlvbih0LGUpe3JldHVybiBzdCh0aGlzLnNpemUpLHRoaXMuX19pdGVyYXRlKGU/dC5iaW5kKGUpOnQpfSxqb2luOmZ1bmN0aW9uKHQpe3N0KHRoaXMuc2l6ZSksdD12b2lkIDAhPT10P1wiXCIrdDpcIixcIjt2YXIgZT1cIlwiLHI9ITA7cmV0dXJuIHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKG4pe3I/cj0hMTplKz10LGUrPW51bGwhPT1uJiZ2b2lkIDAhPT1uP1wiXCIrbjpcIlwifSksZX0sa2V5czpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faXRlcmF0b3IobXIpfSxtYXA6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxwdCh0aGlzLHQsZSkpfSxyZWR1Y2U6ZnVuY3Rpb24odCxlLHIpe3N0KHRoaXMuc2l6ZSk7dmFyIG4saTtyZXR1cm4gYXJndW1lbnRzLmxlbmd0aDwyP2k9ITA6bj1lLHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKGUsbyx1KXtpPyhpPSExLG49ZSk6bj10LmNhbGwocixuLGUsbyx1KX0pLG59LHJlZHVjZVJpZ2h0OmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpO3JldHVybiB0LnJlZHVjZS5hcHBseSh0LGFyZ3VtZW50cyl9LHJldmVyc2U6ZnVuY3Rpb24oKXtyZXR1cm4gT3QodGhpcyx2dCh0aGlzLCEwKSl9LHNsaWNlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbXQodGhpcyx0LGUsITApKX0sc29tZTpmdW5jdGlvbih0LGUpe3JldHVybiF0aGlzLmV2ZXJ5KFplKHQpLGUpfSxzb3J0OmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHF0KHRoaXMsdCkpfSx2YWx1ZXM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKGdyKX0sYnV0TGFzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNsaWNlKDAsLTEpfSxpc0VtcHR5OmZ1bmN0aW9uKCl7cmV0dXJuIHZvaWQgMCE9PXRoaXMuc2l6ZT8wPT09dGhpcy5zaXplOiF0aGlzLnNvbWUoZnVuY3Rpb24oKXtyZXR1cm4hMH0pfSxjb3VudDpmdW5jdGlvbih0LGUpe3JldHVybiBvKHQ/dGhpcy50b1NlcSgpLmZpbHRlcih0LGUpOnRoaXMpfSxjb3VudEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHl0KHRoaXMsdCxlKX0sZXF1YWxzOmZ1bmN0aW9uKHQpe3JldHVybiBWZSh0aGlzLHQpfSxlbnRyeVNlcTpmdW5jdGlvbigpe3ZhciB0PXRoaXM7aWYodC5fY2FjaGUpcmV0dXJuIG5ldyBqKHQuX2NhY2hlKTt2YXIgZT10LnRvU2VxKCkubWFwKEdlKS50b0luZGV4ZWRTZXEoKTtyZXR1cm4gZS5mcm9tRW50cnlTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdC50b1NlcSgpfSxlfSxmaWx0ZXJOb3Q6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5maWx0ZXIoWmUodCksZSl9LGZpbmRMYXN0OmZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gdGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpLmZpbmQodCxlLHIpfSxmaXJzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZpbmQocyl9LGZsYXRNYXA6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxJdCh0aGlzLHQsZSkpO1xufSxmbGF0dGVuOmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHp0KHRoaXMsdCwhMCkpfSxmcm9tRW50cnlTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGN0KHRoaXMpfSxnZXQ6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5maW5kKGZ1bmN0aW9uKGUscil7cmV0dXJuIFgocix0KX0sdm9pZCAwLGUpfSxnZXRJbjpmdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPXRoaXMsaT1LdCh0KTshKHI9aS5uZXh0KCkpLmRvbmU7KXt2YXIgbz1yLnZhbHVlO2lmKG49biYmbi5nZXQ/bi5nZXQobyxjcik6Y3Isbj09PWNyKXJldHVybiBlfXJldHVybiBufSxncm91cEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIGR0KHRoaXMsdCxlKX0saGFzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmdldCh0LGNyKSE9PWNyfSxoYXNJbjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5nZXRJbih0LGNyKSE9PWNyfSxpc1N1YnNldDpmdW5jdGlvbih0KXtyZXR1cm4gdD1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmluY2x1ZGVzP3Q6Xyh0KSx0aGlzLmV2ZXJ5KGZ1bmN0aW9uKGUpe3JldHVybiB0LmluY2x1ZGVzKGUpfSl9LGlzU3VwZXJzZXQ6ZnVuY3Rpb24odCl7cmV0dXJuIHQ9XCJmdW5jdGlvblwiPT10eXBlb2YgdC5pc1N1YnNldD90Ol8odCksdC5pc1N1YnNldCh0aGlzKX0sa2V5U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoRmUpLnRvSW5kZXhlZFNlcSgpfSxsYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmlyc3QoKX0sbWF4OmZ1bmN0aW9uKHQpe3JldHVybiBEdCh0aGlzLHQpfSxtYXhCeTpmdW5jdGlvbih0LGUpe3JldHVybiBEdCh0aGlzLGUsdCl9LG1pbjpmdW5jdGlvbih0KXtyZXR1cm4gRHQodGhpcyx0PyRlKHQpOnJyKX0sbWluQnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gRHQodGhpcyxlPyRlKGUpOnJyLHQpfSxyZXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMSl9LHNraXA6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc2xpY2UoTWF0aC5tYXgoMCx0KSl9LHNraXBMYXN0OmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuc2tpcCh0KS5yZXZlcnNlKCkpfSxza2lwV2hpbGU6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyx3dCh0aGlzLHQsZSwhMCkpfSxza2lwVW50aWw6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5za2lwV2hpbGUoWmUodCksZSl9LHNvcnRCeTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHF0KHRoaXMsZSx0KSl9LHRha2U6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc2xpY2UoMCxNYXRoLm1heCgwLHQpKX0sdGFrZUxhc3Q6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLnJldmVyc2UoKS50YWtlKHQpLnJldmVyc2UoKSl9LHRha2VXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLGd0KHRoaXMsdCxlKSl9LHRha2VVbnRpbDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnRha2VXaGlsZShaZSh0KSxlKX0sdmFsdWVTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b0luZGV4ZWRTZXEoKX0saGFzaENvZGU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2hhc2h8fCh0aGlzLl9faGFzaD1ucih0aGlzKSl9fSk7dmFyIHVuPV8ucHJvdG90eXBlO3VuW3ZyXT0hMCx1bltJcl09dW4udmFsdWVzLHVuLl9fdG9KUz11bi50b0FycmF5LHVuLl9fdG9TdHJpbmdNYXBwZXI9dHIsdW4uaW5zcGVjdD11bi50b1NvdXJjZT1mdW5jdGlvbigpe3JldHVyblwiXCIrdGhpc30sdW4uY2hhaW49dW4uZmxhdE1hcCx1bi5jb250YWlucz11bi5pbmNsdWRlcyxmdW5jdGlvbigpe3RyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkodW4sXCJsZW5ndGhcIix7Z2V0OmZ1bmN0aW9uKCl7aWYoIV8ubm9MZW5ndGhXYXJuaW5nKXt2YXIgdDt0cnl7dGhyb3cgRXJyb3IoKX1jYXRjaChlKXt0PWUuc3RhY2t9aWYoLTE9PT10LmluZGV4T2YoXCJfd3JhcE9iamVjdFwiKSlyZXR1cm4gY29uc29sZSYmY29uc29sZS53YXJuJiZjb25zb2xlLndhcm4oXCJpdGVyYWJsZS5sZW5ndGggaGFzIGJlZW4gZGVwcmVjYXRlZCwgdXNlIGl0ZXJhYmxlLnNpemUgb3IgaXRlcmFibGUuY291bnQoKS4gVGhpcyB3YXJuaW5nIHdpbGwgYmVjb21lIGEgc2lsZW50IGVycm9yIGluIGEgZnV0dXJlIHZlcnNpb24uIFwiK3QpLFxuICB0aGlzLnNpemV9fX0pfWNhdGNoKHQpe319KCksWGUocCx7ZmxpcDpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLF90KHRoaXMpKX0sZmluZEtleTpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuZmluZEVudHJ5KHQsZSk7cmV0dXJuIHImJnJbMF19LGZpbmRMYXN0S2V5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmluZEtleSh0LGUpfSxrZXlPZjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5maW5kS2V5KGZ1bmN0aW9uKGUpe3JldHVybiBYKGUsdCl9KX0sbGFzdEtleU9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmZpbmRMYXN0S2V5KGZ1bmN0aW9uKGUpe3JldHVybiBYKGUsdCl9KX0sbWFwRW50cmllczpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj0wO3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5tYXAoZnVuY3Rpb24oaSxvKXtyZXR1cm4gdC5jYWxsKGUsW28saV0sbisrLHIpfSkuZnJvbUVudHJ5U2VxKCkpfSxtYXBLZXlzOmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gT3QodGhpcyx0aGlzLnRvU2VxKCkuZmxpcCgpLm1hcChmdW5jdGlvbihuLGkpe3JldHVybiB0LmNhbGwoZSxuLGkscil9KS5mbGlwKCkpfX0pO3ZhciBzbj1wLnByb3RvdHlwZTtzbltscl09ITAsc25bSXJdPXVuLmVudHJpZXMsc24uX190b0pTPXVuLnRvT2JqZWN0LHNuLl9fdG9TdHJpbmdNYXBwZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gSlNPTi5zdHJpbmdpZnkoZSkrXCI6IFwiK3RyKHQpfSxYZSh2LHt0b0tleWVkU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBhdCh0aGlzLCExKX0sZmlsdGVyOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbHQodGhpcyx0LGUsITEpKX0sZmluZEluZGV4OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gcj9yWzBdOi0xfSxpbmRleE9mOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMudG9LZXllZFNlcSgpLmtleU9mKHQpO3JldHVybiB2b2lkIDA9PT1lPy0xOmV9LGxhc3RJbmRleE9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmluZGV4T2YodCl9LHJldmVyc2U6ZnVuY3Rpb24oKXtyZXR1cm4gT3QodGhpcyx2dCh0aGlzLCExKSl9LHNsaWNlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbXQodGhpcyx0LGUsITEpKX0sc3BsaWNlOmZ1bmN0aW9uKHQsZSl7dmFyIHI9YXJndW1lbnRzLmxlbmd0aDtpZihlPU1hdGgubWF4KDB8ZSwwKSwwPT09cnx8Mj09PXImJiFlKXJldHVybiB0aGlzO3Q9aCh0LDA+dD90aGlzLmNvdW50KCk6dGhpcy5zaXplKTt2YXIgbj10aGlzLnNsaWNlKDAsdCk7cmV0dXJuIE90KHRoaXMsMT09PXI/bjpuLmNvbmNhdChpKGFyZ3VtZW50cywyKSx0aGlzLnNsaWNlKHQrZSkpKX0sZmluZExhc3RJbmRleDpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMudG9LZXllZFNlcSgpLmZpbmRMYXN0S2V5KHQsZSk7cmV0dXJuIHZvaWQgMD09PXI/LTE6cn0sZmlyc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5nZXQoMCl9LGZsYXR0ZW46ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsenQodGhpcyx0LCExKSl9LGdldDpmdW5jdGlvbih0LGUpe3JldHVybiB0PXUodGhpcyx0KSwwPnR8fHRoaXMuc2l6ZT09PTEvMHx8dm9pZCAwIT09dGhpcy5zaXplJiZ0PnRoaXMuc2l6ZT9lOnRoaXMuZmluZChmdW5jdGlvbihlLHIpe3JldHVybiByPT09dH0sdm9pZCAwLGUpfSxoYXM6ZnVuY3Rpb24odCl7cmV0dXJuIHQ9dSh0aGlzLHQpLHQ+PTAmJih2b2lkIDAhPT10aGlzLnNpemU/dGhpcy5zaXplPT09MS8wfHx0aGlzLnNpemU+dDotMSE9PXRoaXMuaW5kZXhPZih0KSl9LGludGVycG9zZTpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyxidCh0aGlzLHQpKX0saW50ZXJsZWF2ZTpmdW5jdGlvbigpe3ZhciB0PVt0aGlzXS5jb25jYXQoaShhcmd1bWVudHMpKSxlPUV0KHRoaXMudG9TZXEoKSxrLm9mLHQpLHI9ZS5mbGF0dGVuKCEwKTtyZXR1cm4gZS5zaXplJiYoci5zaXplPWUuc2l6ZSp0Lmxlbmd0aCksT3QodGhpcyxyKX0sbGFzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldCgtMSk7XG59LHNraXBXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHd0KHRoaXMsdCxlLCExKSl9LHppcDpmdW5jdGlvbigpe3ZhciB0PVt0aGlzXS5jb25jYXQoaShhcmd1bWVudHMpKTtyZXR1cm4gT3QodGhpcyxFdCh0aGlzLGVyLHQpKX0semlwV2l0aDpmdW5jdGlvbih0KXt2YXIgZT1pKGFyZ3VtZW50cyk7cmV0dXJuIGVbMF09dGhpcyxPdCh0aGlzLEV0KHRoaXMsdCxlKSl9fSksdi5wcm90b3R5cGVbeXJdPSEwLHYucHJvdG90eXBlW2RyXT0hMCxYZShsLHtnZXQ6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dDplfSxpbmNsdWRlczpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5oYXModCl9LGtleVNlcTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnZhbHVlU2VxKCl9fSksbC5wcm90b3R5cGUuaGFzPXVuLmluY2x1ZGVzLFhlKHgscC5wcm90b3R5cGUpLFhlKGssdi5wcm90b3R5cGUpLFhlKEEsbC5wcm90b3R5cGUpLFhlKFYscC5wcm90b3R5cGUpLFhlKFksdi5wcm90b3R5cGUpLFhlKFEsbC5wcm90b3R5cGUpO3ZhciBhbj17SXRlcmFibGU6XyxTZXE6TyxDb2xsZWN0aW9uOkgsTWFwOkx0LE9yZGVyZWRNYXA6SWUsTGlzdDpmZSxTdGFjazpFZSxTZXQ6QWUsT3JkZXJlZFNldDpMZSxSZWNvcmQ6Q2UsUmFuZ2U6WWUsUmVwZWF0OlFlLGlzOlgsZnJvbUpTOkZ9O3JldHVybiBhbn0pOyJdfQ==
