(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var _rx = require('../nori/utils/Rx.js'),
    _appActions = require('./action/ActionCreator.js'),
    _noriActions = require('../nori/action/ActionCreator.js');

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
      case this.socket.events().CONNECT:
        console.log("Connected!");
        this.store.setState({ socketIOID: payload.id });
        return;
      case this.socket.events().USER_CONNECTED:
        console.log("Another client connected");
        return;
      case this.socket.events().USER_DISCONNECTED:
        console.log("Another client disconnected");
        return;
      case this.socket.events().DROPPED:
        console.log("You were dropped!", payload.payload);
        return;
      case this.socket.events().SYSTEM_MESSAGE:
        console.log("System message", payload.payload);
        return;
      case this.socket.events().CREATE_ROOM:
        console.log("create room");
        return;
      case this.socket.events().JOIN_ROOM:
        console.log("join room", payload.payload);
        this.handleJoinNewlyCreatedRoom(payload.payload.roomID);
        return;
      case this.socket.events().LEAVE_ROOM:
        console.log("leave room");
        return;
      case this.socket.events().GAME_START:
        console.log("GAME STARTed");
        this.handleGameStart();
        return;
      case this.socket.events().GAME_END:
        console.log("Game ended");
        return;
      case this.socket.events().SYSTEM_MESSAGE:
      case this.socket.events().BROADCAST:
      case this.socket.events().MESSAGE:
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
    var appState = this.store.getState();
    if (roomID === appState.session.roomID) {
      console.log('Rooms match! Starting game');
      var setGamePlayState = _noriActions.changeStoreState({ currentState: this.store.gameStates[3] });
      this.store.apply(setGamePlayState);
    } else {
      console.log('rooms don\'t match');
    }
  }

});

module.exports = App;

},{"../nori/action/ActionCreator.js":14,"../nori/service/SocketIO.js":15,"../nori/utils/Rx.js":22,"./action/ActionCreator.js":3,"./store/AppStore.js":4,"./view/AppView.js":5}],2:[function(require,module,exports){
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
    var actionObj = {
      type: _actionConstants.SET_LOCAL_PLAYER_PROPS,
      payload: {
        data: {
          localPlayer: data
        }
      }
    };

    return actionObj;
  },

  setRemotePlayerProps: function setRemotePlayerProps(data) {
    var actionObj = {
      type: _actionConstants.SET_REMOTE_PLAYER_PROPS,
      payload: {
        data: {
          remotePlayer: data
        }
      }
    };

    return actionObj;
  },

  setSessionProps: function setSessionProps(data) {
    var actionObj = {
      type: _actionConstants.SET_REMOTE_PLAYER_PROPS,
      payload: {
        data: {
          session: data
        }
      }
    };

    return actionObj;
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

},{"../../nori/action/ActionConstants.js":13,"../../nori/store/MixinReducerStore.js":16,"../../nori/utils/MixinObservableSubject.js":19,"../../nudoru/core/NumberUtils.js":38,"../action/ActionConstants.js":2}],5:[function(require,module,exports){
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

},{"../../nori/utils/MixinObservableSubject.js":19,"../../nori/view/ApplicationView.js":24,"../../nori/view/MixinComponentViews.js":25,"../../nori/view/MixinEventDelegator.js":26,"../../nori/view/MixinNudoruControls.js":27,"../../nori/view/MixinStoreStateViews.js":28,"../store/AppStore.js":4,"./Screen.GameOver.js":6,"./Screen.MainGame.js":7,"./Screen.PlayerSelect.js":8,"./Screen.Title.js":9,"./Screen.WaitingOnPlayer.js":10}],6:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore');

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

},{"../../nori/action/ActionCreator":14,"../store/AppStore":4,"./AppView":5}],7:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore');

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

},{"../../nori/action/ActionCreator":14,"../store/AppStore":4,"./AppView":5}],8:[function(require,module,exports){
/*
 TODO

 */

var _noriActions = require('../../nori/action/ActionCreator.js'),
    _appActions = require('../action/ActionCreator.js'),
    _appView = require('./AppView.js'),
    _appStore = require('../store/AppStore.js'),
    _socketIO = require('../../nori/service/SocketIO.js');

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

  setPlayerName: function setPlayerName() {
    var action = _appActions.setLocalPlayerProps({
      name: document.querySelector('#select__playername').value
    });
    _appStore.apply(action);
  },

  setPlayerAppearance: function setPlayerAppearance() {
    var action = _appActions.setLocalPlayerProps({
      appearance: document.querySelector('#select__playertype').value
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
    console.log('Join room ' + roomID);
    if (this.validateRoomID(roomID)) {
      console.log('Room ID OK');
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
    console.log('create room');
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

},{"../../nori/action/ActionCreator.js":14,"../../nori/service/SocketIO.js":15,"../action/ActionCreator.js":3,"../store/AppStore.js":4,"./AppView.js":5}],9:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore');

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

},{"../../nori/action/ActionCreator":14,"../store/AppStore":4,"./AppView":5}],10:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore');

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
    console.log(appState);
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

},{"../../nori/action/ActionCreator":14,"../store/AppStore":4,"./AppView":5}],11:[function(require,module,exports){
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

},{"./app/App.js":1,"./nori/Nori.js":12,"./nudoru/browser/BrowserInfo.js":30}],12:[function(require,module,exports){
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
  // Functional utils from Mithril
  //  https://github.com/lhorie/mithril.js/blob/next/mithril.js
  //----------------------------------------------------------------------------

  // http://mithril.js.org/mithril.prop.html
  function prop(store) {
    //if (isFunction(store.then)) {
    //  // handle a promise
    //}
    var gettersetter = function gettersetter() {
      if (arguments.length) {
        store = arguments[0];
      }
      return store;
    };

    gettersetter.toJSON = function () {
      return store;
    };

    return gettersetter;
  }

  // http://mithril.js.org/mithril.withAttr.html
  function withAttr(prop, callback, context) {
    return function (e) {
      e = e || event;

      var currentTarget = e.currentTarget || this,
          cntx = context || this;

      callback.call(cntx, prop in currentTarget ? currentTarget[prop] : currentTarget.getAttribute(prop));
    };
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
    assignArray: assignArray,
    prop: prop,
    withAttr: withAttr
  };
};

module.exports = Nori();

},{"./utils/Dispatcher.js":18,"./utils/Router.js":21}],13:[function(require,module,exports){
module.exports = {
  CHANGE_STORE_STATE: 'CHANGE_STORE_STATE'
};

},{}],14:[function(require,module,exports){
/**
 * Action Creator
 * Based on Flux Actions
 * For more information and guidelines: https://github.com/acdlite/flux-standard-action
 */
var _noriActionConstants = require('./ActionConstants.js');

var NoriActionCreator = {

  changeStoreState: function changeStoreState(data, id) {
    var action = {
      type: _noriActionConstants.CHANGE_STORE_STATE,
      payload: {
        id: id,
        data: data
      }
    };

    return action;
  }

};

module.exports = NoriActionCreator;

},{"./ActionConstants.js":13}],15:[function(require,module,exports){
var SocketIOConnector = function SocketIOConnector() {

  var _subject = new Rx.BehaviorSubject(),
      _socketIO = io(),
      _log = [],
      _events = {
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

},{}],16:[function(require,module,exports){
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

    var simpleStoreFactory = require('./SimpleStore.js');

    _this = this;
    _state = simpleStoreFactory();

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
    console.log('ReducerStore Apply: ', actionObject.type, actionObject.payload);
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

},{"./SimpleStore.js":17}],17:[function(require,module,exports){
var SimpleStore = function SimpleStore() {
  var _internalState = Object.create(null);

  /**
   * Return a copy of the state
   * @returns {void|*}
   */
  function getState() {
    return _.assign({}, _internalState);
  }

  /**
   * Sets the state
   * @param nextState
   */
  function setState(nextState) {
    _internalState = _.assign(_internalState, nextState);
  }

  return {
    getState: getState,
    setState: setState
  };
};

module.exports = SimpleStore;

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":31}],21:[function(require,module,exports){
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

},{"../../nudoru/core/ObjectUtils.js":39}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":31}],24:[function(require,module,exports){
var ApplicationView = function ApplicationView() {

  var _this,
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
      bodyEl.appendChild(_domUtils.HTMLStrToNode(_this.template().getSource('template__' + templ, {})));
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

},{"../../nudoru/browser/DOMUtils.js":31}],25:[function(require,module,exports){
/**
 * Mixin view that allows for component views
 */

var MixinComponentViews = function MixinComponentViews() {

  var _componentViewMap = Object.create(null),
      _componentHTMLTemplatePrefix = 'template__',
      _template = require('../utils/Templating.js');

  /**
   * Return the template object
   * @returns {*}
   */
  function getTemplate() {
    return _template;
  }

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
      htmlTemplate: _template.getTemplate(_componentHTMLTemplatePrefix + componentID),
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
          simpleStoreFactory = require('../store/SimpleStore.js'),
          componentAssembly,
          finalComponent,
          previousInitialize;

      componentAssembly = [componentViewFactory(), eventDelegatorFactory(), observableFactory(), simpleStoreFactory(), componentSource];

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
    template: getTemplate,
    mapViewComponent: mapViewComponent,
    createComponentView: createComponentView,
    showViewComponent: showViewComponent,
    getComponentViewMap: getComponentViewMap
  };
};

module.exports = MixinComponentViews();

},{"../store/SimpleStore.js":17,"../utils/MixinObservableSubject.js":19,"../utils/Templating.js":23,"./MixinEventDelegator.js":26,"./ViewComponent.js":29}],26:[function(require,module,exports){
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
      _rx = require('../utils/Rx');

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
          _eventSubscribers[evtStrings] = createHandler(selector, eventStr, eventHandler);
        });
        /* jshint +W083 */
      }
    }
  }

  function createHandler(selector, eventStr, eventHandler) {
    return _rx.dom(selector, eventStr).subscribe(eventHandler);
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

},{"../utils/Rx":22}],27:[function(require,module,exports){
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

},{"../../nudoru/components/MessageBoxCreator.js":33,"../../nudoru/components/MessageBoxView.js":34,"../../nudoru/components/ModalCoverView.js":35,"../../nudoru/components/ToastView.js":36,"../../nudoru/components/ToolTipView.js":37}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
/**
 * Base module for components
 * Must be extended with custom modules
 */

var ViewComponent = function ViewComponent() {

  var _isInitialized = false,
      _configProps,
      _id,
      _templateObj,
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
    _templateObj = configProps.template;
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

    _html = this.render(this.getState());
  }

  /**
   * May be overridden in a submodule for custom rendering
   * Should return HTML
   * @returns {*}
   */
  function render(state) {
    return _templateObj(state);
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

  function getTemplate() {
    return _templateObj;
  }

  function setTemplate(html) {
    _templateObj = _.template(html);
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
    getTemplate: getTemplate,
    setTemplate: setTemplate,
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
    unmount: unmount

    //addChild   : addChild,
    //removeChild: removeChild,
    //getChildren: getChildren
  };
};

module.exports = ViewComponent;

},{"../utils/Renderer":20}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
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

},{"./MessageBoxView":34}],34:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":23,"../../nudoru/browser/BrowserInfo.js":30,"../../nudoru/browser/DOMUtils.js":31,"../../nudoru/browser/ThreeDTransforms.js":32,"./ModalCoverView.js":35}],35:[function(require,module,exports){
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

},{"../../nudoru/browser/BrowserInfo.js":30}],36:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":23,"../../nudoru/browser/BrowserInfo.js":30,"../../nudoru/browser/DOMUtils.js":31,"../../nudoru/browser/ThreeDTransforms.js":32}],37:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":23,"../../nudoru/browser/DOMUtils.js":31}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
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

},{}]},{},[11])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3N0b3JlL0FwcFN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L0FwcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLkdhbWVPdmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5NYWluR2FtZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uUGxheWVyU2VsZWN0LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5UaXRsZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uV2FpdGluZ09uUGxheWVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL21haW4uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9Ob3JpLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3N0b3JlL01peGluUmVkdWNlclN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvU2ltcGxlU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1JlbmRlcmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUm91dGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUnguanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRXZlbnREZWxlZ2F0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluTnVkb3J1Q29udHJvbHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9WaWV3Q29tcG9uZW50LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveENyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvVG9hc3RWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb3JlL051bWJlclV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsSUFBSSxHQUFHLEdBQVksT0FBTyxDQUFDLHFCQUFxQixDQUFDO0lBQzdDLFdBQVcsR0FBSSxPQUFPLENBQUMsMkJBQTJCLENBQUM7SUFDbkQsWUFBWSxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDOzs7Ozs7O0FBTzlELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzs7QUFFL0IsUUFBTSxFQUFFLEVBQUU7Ozs7O0FBS1YsT0FBSyxFQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztBQUN0QyxNQUFJLEVBQUksT0FBTyxDQUFDLG1CQUFtQixDQUFDO0FBQ3BDLFFBQU0sRUFBRSxPQUFPLENBQUMsNkJBQTZCLENBQUM7Ozs7O0FBSzlDLFlBQVUsRUFBRSxzQkFBWTtBQUN0QixRQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQ3pCLFFBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7QUFFM0QsUUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzs7QUFFdkIsUUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUN4QixRQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsa0JB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Q0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLEVBQUUsRUFBRTtBQUN6QyxVQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDO0FBQ3hDLFVBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7S0FDekMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRTtBQUMvQyxVQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksSUFBSSxBQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFLLFVBQVUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQztBQUN2RSxVQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUNsRCxNQUFNLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsRUFBRSxFQUFFO0FBQ2hELFVBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO0FBQ3RCLFVBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7S0FDekMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRTtBQUMvQyxVQUFJLEdBQUcsUUFBUSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7QUFDL0IsVUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLElBQUksQUFBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBSyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUM7S0FDekUsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLEVBQUUsRUFBRTtBQUNoRCxVQUFJLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztBQUN0QixVQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztLQUN4QixNQUFNLElBQUksVUFBVSxDQUFDLFFBQVEs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Q0QsV0FBTyxHQUFHLENBQUM7R0FDWjs7Q0FFRixDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfcnggICAgICAgICAgPSByZXF1aXJlKCcuLi9ub3JpL3V0aWxzL1J4LmpzJyksXG4gICAgX2FwcEFjdGlvbnMgID0gcmVxdWlyZSgnLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKTtcblxuLyoqXG4gKiBcIkNvbnRyb2xsZXJcIiBmb3IgYSBOb3JpIGFwcGxpY2F0aW9uLiBUaGUgY29udHJvbGxlciBpcyByZXNwb25zaWJsZSBmb3JcbiAqIGJvb3RzdHJhcHBpbmcgdGhlIGFwcCBhbmQgcG9zc2libHkgaGFuZGxpbmcgc29ja2V0L3NlcnZlciBpbnRlcmFjdGlvbi5cbiAqIEFueSBhZGRpdGlvbmFsIGZ1bmN0aW9uYWxpdHkgc2hvdWxkIGJlIGhhbmRsZWQgaW4gYSBzcGVjaWZpYyBtb2R1bGUuXG4gKi9cbnZhciBBcHAgPSBOb3JpLmNyZWF0ZUFwcGxpY2F0aW9uKHtcblxuICBtaXhpbnM6IFtdLFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGhlIG1haW4gTm9yaSBBcHAgc3RvcmUgYW5kIHZpZXcuXG4gICAqL1xuICBzdG9yZSA6IHJlcXVpcmUoJy4vc3RvcmUvQXBwU3RvcmUuanMnKSxcbiAgdmlldyAgOiByZXF1aXJlKCcuL3ZpZXcvQXBwVmlldy5qcycpLFxuICBzb2NrZXQ6IHJlcXVpcmUoJy4uL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcycpLFxuXG4gIC8qKlxuICAgKiBJbnRpYWxpemUgdGhlIGFwcGlsY2F0aW9uLCB2aWV3IGFuZCBzdG9yZVxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc29ja2V0LmluaXRpYWxpemUoKTtcbiAgICB0aGlzLnNvY2tldC5zdWJzY3JpYmUodGhpcy5oYW5kbGVTb2NrZXRNZXNzYWdlLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy52aWV3LmluaXRpYWxpemUoKTtcblxuICAgIHRoaXMuc3RvcmUuaW5pdGlhbGl6ZSgpOyAvLyBzdG9yZSB3aWxsIGFjcXVpcmUgZGF0YSBkaXNwYXRjaCBldmVudCB3aGVuIGNvbXBsZXRlXG4gICAgdGhpcy5zdG9yZS5zdWJzY3JpYmUoJ3N0b3JlSW5pdGlhbGl6ZWQnLCB0aGlzLm9uU3RvcmVJbml0aWFsaXplZC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnN0b3JlLmxvYWRTdG9yZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZnRlciB0aGUgc3RvcmUgZGF0YSBpcyByZWFkeVxuICAgKi9cbiAgb25TdG9yZUluaXRpYWxpemVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5ydW5BcHBsaWNhdGlvbigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIFwiUGxlYXNlIHdhaXRcIiBjb3ZlciBhbmQgc3RhcnQgdGhlIGFwcFxuICAgKi9cbiAgcnVuQXBwbGljYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnZpZXcucmVtb3ZlTG9hZGluZ01lc3NhZ2UoKTtcbiAgICB0aGlzLnZpZXcucmVuZGVyKCk7XG5cbiAgICAvLyBWaWV3IHdpbGwgc2hvdyBiYXNlZCBvbiB0aGUgY3VycmVudCBzdG9yZSBzdGF0ZVxuICAgIHRoaXMuc3RvcmUuc2V0U3RhdGUoe2N1cnJlbnRTdGF0ZTogJ1BMQVlFUl9TRUxFQ1QnfSk7XG5cbiAgICAvLyBUZXN0IHBpbmdcbiAgICAvL19yeC5kb0V2ZXJ5KDEwMDAsIDMsICgpID0+IHRoaXMuc29ja2V0LnBpbmcoKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFsbCBtZXNzYWdlcyBmcm9tIHRoZSBTb2NrZXQuSU8gc2VydmVyIHdpbGwgYmUgZm9yd2FyZGVkIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGhhbmRsZVNvY2tldE1lc3NhZ2U6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgaWYgKCFwYXlsb2FkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJmcm9tIFNvY2tldC5JTyBzZXJ2ZXJcIiwgcGF5bG9hZCk7XG4gICAgc3dpdGNoIChwYXlsb2FkLnR5cGUpIHtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLkNPTk5FQ1QpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3RlZCFcIik7XG4gICAgICAgIHRoaXMuc3RvcmUuc2V0U3RhdGUoe3NvY2tldElPSUQ6IHBheWxvYWQuaWR9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuVVNFUl9DT05ORUNURUQpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIkFub3RoZXIgY2xpZW50IGNvbm5lY3RlZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuVVNFUl9ESVNDT05ORUNURUQpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIkFub3RoZXIgY2xpZW50IGRpc2Nvbm5lY3RlZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuRFJPUFBFRCk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiWW91IHdlcmUgZHJvcHBlZCFcIiwgcGF5bG9hZC5wYXlsb2FkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuU1lTVEVNX01FU1NBR0UpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIlN5c3RlbSBtZXNzYWdlXCIsIHBheWxvYWQucGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLkNSRUFURV9ST09NKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJjcmVhdGUgcm9vbVwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuSk9JTl9ST09NKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJqb2luIHJvb21cIiwgcGF5bG9hZC5wYXlsb2FkKTtcbiAgICAgICAgdGhpcy5oYW5kbGVKb2luTmV3bHlDcmVhdGVkUm9vbShwYXlsb2FkLnBheWxvYWQucm9vbUlEKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuTEVBVkVfUk9PTSk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwibGVhdmUgcm9vbVwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuR0FNRV9TVEFSVCk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR0FNRSBTVEFSVGVkXCIpO1xuICAgICAgICB0aGlzLmhhbmRsZUdhbWVTdGFydCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlICh0aGlzLnNvY2tldC5ldmVudHMoKS5HQU1FX0VORCk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR2FtZSBlbmRlZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuU1lTVEVNX01FU1NBR0UpOlxuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuQlJPQURDQVNUKTpcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLk1FU1NBR0UpOlxuICAgICAgICB0aGlzLnZpZXcuYWxlcnQocGF5bG9hZC5wYXlsb2FkLCBwYXlsb2FkLnR5cGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oXCJVbmhhbmRsZWQgU29ja2V0SU8gbWVzc2FnZSB0eXBlXCIsIHBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICB9LFxuXG4gIGhhbmRsZUpvaW5OZXdseUNyZWF0ZWRSb29tOiBmdW5jdGlvbiAocm9vbUlEKSB7XG4gICAgdmFyIHNldFJvb20gICAgICAgICAgICAgICA9IF9hcHBBY3Rpb25zLnNldFNlc3Npb25Qcm9wcyh7cm9vbUlEOiByb29tSUR9KSxcbiAgICAgICAgc2V0V2FpdGluZ1NjcmVlblN0YXRlID0gX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogdGhpcy5zdG9yZS5nYW1lU3RhdGVzWzJdfSk7XG5cbiAgICB0aGlzLnN0b3JlLmFwcGx5KHNldFJvb20pO1xuICAgIHRoaXMuc3RvcmUuYXBwbHkoc2V0V2FpdGluZ1NjcmVlblN0YXRlKTtcbiAgfSxcblxuICBoYW5kbGVHYW1lU3RhcnQ6IGZ1bmN0aW9uIChyb29tSUQpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSB0aGlzLnN0b3JlLmdldFN0YXRlKCk7XG4gICAgaWYocm9vbUlEID09PSBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRCkge1xuICAgICAgY29uc29sZS5sb2coJ1Jvb21zIG1hdGNoISBTdGFydGluZyBnYW1lJyk7XG4gICAgICB2YXIgc2V0R2FtZVBsYXlTdGF0ZSA9IF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuc3RvcmUuZ2FtZVN0YXRlc1szXX0pO1xuICAgICAgdGhpcy5zdG9yZS5hcHBseShzZXRHYW1lUGxheVN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coJ3Jvb21zIGRvblxcJ3QgbWF0Y2gnKTtcbiAgICB9XG5cbiAgfVxuICBcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcDsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgTE9DQUxfUExBWUVSX0NPTk5FQ1QgICAgICAgOiAnTE9DQUxfUExBWUVSX0NPTk5FQ1QnLFxuICBTRVRfU0VTU0lPTl9QUk9QUyAgICAgICAgICA6ICdTRVRfU0VTU0lPTl9QUk9QUycsXG4gIFNFVF9MT0NBTF9QTEFZRVJfUFJPUFMgICAgIDogJ1NFVF9MT0NBTF9QTEFZRVJfUFJPUFMnLFxuICBTRVRfTE9DQUxfUExBWUVSX05BTUUgICAgICA6ICdTRVRfTE9DQUxfUExBWUVSX05BTUUnLFxuICBTRVRfTE9DQUxfUExBWUVSX0FQUEVBUkFOQ0U6ICdTRVRfTE9DQUxfUExBWUVSX0FQUEVBUkFOQ0UnLFxuICBTRVRfUkVNT1RFX1BMQVlFUl9QUk9QUyAgICA6ICdTRVRfUkVNT1RFX1BMQVlFUl9QUk9QUydcbiAgLy9TRUxFQ1RfUExBWUVSICAgICAgICAgICAgICA6ICdTRUxFQ1RfUExBWUVSJyxcbiAgLy9SRU1PVEVfUExBWUVSX0NPTk5FQ1QgICAgICA6ICdSRU1PVEVfUExBWUVSX0NPTk5FQ1QnLFxuICAvL0dBTUVfU1RBUlQgICAgICAgICAgICAgICAgIDogJ0dBTUVfU1RBUlQnLFxuICAvL0xPQ0FMX1FVRVNUSU9OICAgICAgICAgICAgIDogJ0xPQ0FMX1FVRVNUSU9OJyxcbiAgLy9SRU1PVEVfUVVFU1RJT04gICAgICAgICAgICA6ICdSRU1PVEVfUVVFU1RJT04nLFxuICAvL0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFIDogJ0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFJyxcbiAgLy9SRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0U6ICdSRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0UnLFxuICAvL0dBTUVfT1ZFUiAgICAgICAgICAgICAgICAgIDogJ0dBTUVfT1ZFUidcbn07IiwidmFyIF9hY3Rpb25Db25zdGFudHMgPSByZXF1aXJlKCcuL0FjdGlvbkNvbnN0YW50cy5qcycpO1xuXG4vKipcbiAqIFB1cmVseSBmb3IgY29udmVuaWVuY2UsIGFuIEV2ZW50IChcImFjdGlvblwiKSBDcmVhdG9yIGFsYSBGbHV4IHNwZWMuIEZvbGxvd1xuICogZ3VpZGVsaW5lcyBmb3IgY3JlYXRpbmcgYWN0aW9uczogaHR0cHM6Ly9naXRodWIuY29tL2FjZGxpdGUvZmx1eC1zdGFuZGFyZC1hY3Rpb25cbiAqL1xudmFyIEFjdGlvbkNyZWF0b3IgPSB7XG5cbiAgc2V0TG9jYWxQbGF5ZXJQcm9wczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgYWN0aW9uT2JqID0ge1xuICAgICAgdHlwZSAgIDogX2FjdGlvbkNvbnN0YW50cy5TRVRfTE9DQUxfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgbG9jYWxQbGF5ZXI6IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gYWN0aW9uT2JqO1xuICB9LFxuXG4gIHNldFJlbW90ZVBsYXllclByb3BzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBhY3Rpb25PYmogPSB7XG4gICAgICB0eXBlICAgOiBfYWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcmVtb3RlUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGFjdGlvbk9iajtcbiAgfSxcblxuICBzZXRTZXNzaW9uUHJvcHM6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGFjdGlvbk9iaiA9IHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuU0VUX1JFTU9URV9QTEFZRVJfUFJPUFMsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBzZXNzaW9uOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGFjdGlvbk9iajtcbiAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFjdGlvbkNyZWF0b3I7IiwidmFyIF9ub3JpQWN0aW9uQ29uc3RhbnRzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzJyksXG4gICAgX2FwcEFjdGlvbkNvbnN0YW50cyAgICAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzJyksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICBfbWl4aW5SZWR1Y2VyU3RvcmUgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMnKSxcbiAgICBfbnVtVXRpbHMgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29yZS9OdW1iZXJVdGlscy5qcycpO1xuXG4vKipcbiAqIFRoaXMgYXBwbGljYXRpb24gc3RvcmUgY29udGFpbnMgXCJyZWR1Y2VyIHN0b3JlXCIgZnVuY3Rpb25hbGl0eSBiYXNlZCBvbiBSZWR1eC5cbiAqIFRoZSBzdG9yZSBzdGF0ZSBtYXkgb25seSBiZSBjaGFuZ2VkIGZyb20gZXZlbnRzIGFzIGFwcGxpZWQgaW4gcmVkdWNlciBmdW5jdGlvbnMuXG4gKiBUaGUgc3RvcmUgcmVjZWl2ZWQgYWxsIGV2ZW50cyBmcm9tIHRoZSBldmVudCBidXMgYW5kIGZvcndhcmRzIHRoZW0gdG8gYWxsXG4gKiByZWR1Y2VyIGZ1bmN0aW9ucyB0byBtb2RpZnkgc3RhdGUgYXMgbmVlZGVkLiBPbmNlIHRoZXkgaGF2ZSBydW4sIHRoZVxuICogaGFuZGxlU3RhdGVNdXRhdGlvbiBmdW5jdGlvbiBpcyBjYWxsZWQgdG8gZGlzcGF0Y2ggYW4gZXZlbnQgdG8gdGhlIGJ1cywgb3JcbiAqIG5vdGlmeSBzdWJzY3JpYmVycyB2aWEgYW4gb2JzZXJ2YWJsZS5cbiAqXG4gKiBFdmVudHMgPT4gaGFuZGxlQXBwbGljYXRpb25FdmVudHMgPT4gYXBwbHlSZWR1Y2VycyA9PiBoYW5kbGVTdGF0ZU11dGF0aW9uID0+IE5vdGlmeVxuICovXG52YXIgQXBwU3RvcmUgPSBOb3JpLmNyZWF0ZVN0b3JlKHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5SZWR1Y2VyU3RvcmUsXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QoKVxuICBdLFxuXG4gIGdhbWVTdGF0ZXM6IFsnVElUTEUnLCAnUExBWUVSX1NFTEVDVCcsICdXQUlUSU5HX09OX1BMQVlFUicsICdNQUlOX0dBTUUnLCAnR0FNRV9PVkVSJ10sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYWRkUmVkdWNlcih0aGlzLm1haW5TdGF0ZVJlZHVjZXIpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSgpO1xuICAgIHRoaXMuc2V0U3RhdGUoTm9yaS5jb25maWcoKSk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdzdG9yZUluaXRpYWxpemVkJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBvciBsb2FkIGFueSBuZWNlc3NhcnkgZGF0YSBhbmQgdGhlbiBicm9hZGNhc3QgYSBpbml0aWFsaXplZCBldmVudC5cbiAgICovXG4gIGxvYWRTdG9yZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgY3VycmVudFN0YXRlOiB0aGlzLmdhbWVTdGF0ZXNbMF0sXG4gICAgICBzZXNzaW9uICAgICA6IHtcbiAgICAgICAgcm9vbUlEOiAnJ1xuICAgICAgfSxcbiAgICAgIGxvY2FsUGxheWVyIDoge1xuICAgICAgICBpZCAgICAgICAgOiAnJyxcbiAgICAgICAgdHlwZSAgICAgIDogJycsXG4gICAgICAgIG5hbWUgICAgICA6ICdNeXN0ZXJ5IFBsYXllciAnICsgX251bVV0aWxzLnJuZE51bWJlcigxMDAsIDk5OSksXG4gICAgICAgIGhlYWx0aCAgICA6IDYsXG4gICAgICAgIGFwcGVhcmFuY2U6ICdncmVlbicsXG4gICAgICAgIGJlaGF2aW9ycyA6IFtdXG4gICAgICB9LFxuICAgICAgcmVtb3RlUGxheWVyOiB7XG4gICAgICAgIGlkICAgICAgICA6ICcnLFxuICAgICAgICB0eXBlICAgICAgOiAnJyxcbiAgICAgICAgbmFtZSAgICAgIDogJycsXG4gICAgICAgIGhlYWx0aCAgICA6IDYsXG4gICAgICAgIGFwcGVhcmFuY2U6ICcnLFxuICAgICAgICBiZWhhdmlvcnMgOiBbXVxuICAgICAgfSxcbiAgICAgIHF1ZXN0aW9uQmFuazogW11cbiAgICB9KTtcblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZignc3RvcmVJbml0aWFsaXplZCcpO1xuICB9LFxuXG4gIGNyZWF0ZVF1ZXN0aW9uT2JqZWN0OiBmdW5jdGlvbiAocHJvbXB0LCBkaXN0cmFjdG9ycywgcG9pbnRWYWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9tcHQgICAgIDogcHJvbXB0LFxuICAgICAgZGlzdHJhY3RvcnM6IGRpc3RyYWN0b3JzLFxuICAgICAgcG9pbnRWYWx1ZSA6IHBvaW50VmFsdWVcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBNb2RpZnkgc3RhdGUgYmFzZWQgb24gaW5jb21pbmcgZXZlbnRzLiBSZXR1cm5zIGEgY29weSBvZiB0aGUgbW9kaWZpZWRcbiAgICogc3RhdGUgYW5kIGRvZXMgbm90IG1vZGlmeSB0aGUgc3RhdGUgZGlyZWN0bHkuXG4gICAqIENhbiBjb21wb3NlIHN0YXRlIHRyYW5zZm9ybWF0aW9uc1xuICAgKiByZXR1cm4gXy5hc3NpZ24oe30sIHN0YXRlLCBvdGhlclN0YXRlVHJhbnNmb3JtZXIoc3RhdGUpKTtcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBldmVudFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIG1haW5TdGF0ZVJlZHVjZXI6IGZ1bmN0aW9uIChzdGF0ZSwgZXZlbnQpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuXG4gICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cbiAgICAgIGNhc2UgX25vcmlBY3Rpb25Db25zdGFudHMuQ0hBTkdFX1NUT1JFX1NUQVRFOlxuICAgICAgY2FzZSBfYXBwQWN0aW9uQ29uc3RhbnRzLlNFVF9MT0NBTF9QTEFZRVJfUFJPUFM6XG4gICAgICBjYXNlIF9hcHBBY3Rpb25Db25zdGFudHMuU0VUX1JFTU9URV9QTEFZRVJfUFJPUFM6XG4gICAgICBjYXNlIF9hcHBBY3Rpb25Db25zdGFudHMuU0VUX1NFU1NJT05fUFJPUFM6XG4gICAgICAgIHJldHVybiBfLm1lcmdlKHt9LCBzdGF0ZSwgZXZlbnQucGF5bG9hZC5kYXRhKTtcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oJ1JlZHVjZXIgc3RvcmUsIHVuaGFuZGxlZCBldmVudCB0eXBlOiAnK2V2ZW50LnR5cGUpO1xuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDYWxsZWQgYWZ0ZXIgYWxsIHJlZHVjZXJzIGhhdmUgcnVuIHRvIGJyb2FkY2FzdCBwb3NzaWJsZSB1cGRhdGVzLiBEb2VzXG4gICAqIG5vdCBjaGVjayB0byBzZWUgaWYgdGhlIHN0YXRlIHdhcyBhY3R1YWxseSB1cGRhdGVkLlxuICAgKi9cbiAgaGFuZGxlU3RhdGVNdXRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnModGhpcy5nZXRTdGF0ZSgpKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBTdG9yZSgpOyIsInZhciBfYXBwU3RvcmUgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX21peGluQXBwbGljYXRpb25WaWV3ICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvQXBwbGljYXRpb25WaWV3LmpzJyksXG4gICAgX21peGluTnVkb3J1Q29udHJvbHMgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5OdWRvcnVDb250cm9scy5qcycpLFxuICAgIF9taXhpbkNvbXBvbmVudFZpZXdzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMnKSxcbiAgICBfbWl4aW5TdG9yZVN0YXRlVmlld3MgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzJyksXG4gICAgX21peGluRXZlbnREZWxlZ2F0b3IgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5FdmVudERlbGVnYXRvci5qcycpLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0ID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyk7XG5cbi8qKlxuICogVmlldyBmb3IgYW4gYXBwbGljYXRpb24uXG4gKi9cblxudmFyIEFwcFZpZXcgPSBOb3JpLmNyZWF0ZVZpZXcoe1xuXG4gIG1peGluczogW1xuICAgIF9taXhpbkFwcGxpY2F0aW9uVmlldyxcbiAgICBfbWl4aW5OdWRvcnVDb250cm9scyxcbiAgICBfbWl4aW5Db21wb25lbnRWaWV3cyxcbiAgICBfbWl4aW5TdG9yZVN0YXRlVmlld3MsXG4gICAgX21peGluRXZlbnREZWxlZ2F0b3IoKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCgpXG4gIF0sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyhbJ2FwcGxpY2F0aW9uc2NhZmZvbGQnLCAnYXBwbGljYXRpb25jb21wb25lbnRzc2NhZmZvbGQnXSk7XG4gICAgdGhpcy5pbml0aWFsaXplU3RhdGVWaWV3cyhfYXBwU3RvcmUpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzKCk7XG5cbiAgICB0aGlzLmNvbmZpZ3VyZVZpZXdzKCk7XG4gIH0sXG5cbiAgY29uZmlndXJlVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2NyZWVuVGl0bGUgICAgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uVGl0bGUuanMnKSgpLFxuICAgICAgICBzY3JlZW5QbGF5ZXJTZWxlY3QgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5QbGF5ZXJTZWxlY3QuanMnKSgpLFxuICAgICAgICBzY3JlZW5XYWl0aW5nT25QbGF5ZXIgPSByZXF1aXJlKCcuL1NjcmVlbi5XYWl0aW5nT25QbGF5ZXIuanMnKSgpLFxuICAgICAgICBzY3JlZW5NYWluR2FtZSAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5NYWluR2FtZS5qcycpKCksXG4gICAgICAgIHNjcmVlbkdhbWVPdmVyICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLkdhbWVPdmVyLmpzJykoKSxcbiAgICAgICAgZ2FtZVN0YXRlcyAgICAgICAgICAgID0gX2FwcFN0b3JlLmdhbWVTdGF0ZXM7XG5cbiAgICB0aGlzLnNldFZpZXdNb3VudFBvaW50KCcjY29udGVudHMnKTtcblxuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1swXSwgJ3RpdGxlJywgc2NyZWVuVGl0bGUpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1sxXSwgJ3BsYXllcnNlbGVjdCcsIHNjcmVlblBsYXllclNlbGVjdCk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzJdLCAnd2FpdGluZ29ucGxheWVyJywgc2NyZWVuV2FpdGluZ09uUGxheWVyKTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbM10sICdnYW1lJywgc2NyZWVuTWFpbkdhbWUpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1s0XSwgJ2dhbWVvdmVyJywgc2NyZWVuR2FtZU92ZXIpO1xuXG4gIH0sXG5cbiAgLyoqXG4gICAqIERyYXcgYW5kIFVJIHRvIHRoZSBET00gYW5kIHNldCBldmVudHNcbiAgICovXG4gIHJlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXcoKTsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICNnYW1lb3Zlcl9fYnV0dG9uLXJlcGxheSc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjZ2FtZV9fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1s0XX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qXG4gVE9ET1xuXG4gKi9cblxudmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfYXBwQWN0aW9ucyAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldy5qcycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX3NvY2tldElPICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2JsdXIgI3NlbGVjdF9fcGxheWVybmFtZScgICAgICAgIDogdGhpcy5zZXRQbGF5ZXJOYW1lLmJpbmQodGhpcyksXG4gICAgICAnY2hhbmdlICNzZWxlY3RfX3BsYXllcnR5cGUnICAgICAgOiB0aGlzLnNldFBsYXllckFwcGVhcmFuY2UuYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tam9pbnJvb20nICA6IHRoaXMub25Kb2luUm9vbS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1jcmVhdGVyb29tJzogdGhpcy5vbkNyZWF0ZVJvb20uYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tZ28nICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzJdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgc2V0UGxheWVyTmFtZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhY3Rpb24gPSBfYXBwQWN0aW9ucy5zZXRMb2NhbFBsYXllclByb3BzKHtcbiAgICAgIG5hbWU6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3BsYXllcm5hbWUnKS52YWx1ZVxuICAgIH0pO1xuICAgIF9hcHBTdG9yZS5hcHBseShhY3Rpb24pO1xuICB9LFxuXG4gIHNldFBsYXllckFwcGVhcmFuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYWN0aW9uID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICBhcHBlYXJhbmNlOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJ0eXBlJykudmFsdWVcbiAgICB9KTtcbiAgICBfYXBwU3RvcmUuYXBwbHkoYWN0aW9uKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICBhcHBlYXJhbmNlOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5hcHBlYXJhbmNlXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3BsYXllcnR5cGUnKS52YWx1ZSA9IHRoaXMuZ2V0U3RhdGUoKS5hcHBlYXJhbmNlO1xuICB9LFxuXG4gIG9uSm9pblJvb206IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcm9vbUlEID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcm9vbWlkJykudmFsdWU7XG4gICAgY29uc29sZS5sb2coJ0pvaW4gcm9vbSAnICsgcm9vbUlEKTtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVJvb21JRChyb29tSUQpKSB7XG4gICAgICBjb25zb2xlLmxvZygnUm9vbSBJRCBPSycpO1xuICAgICAgX3NvY2tldElPLm5vdGlmeVNlcnZlcihfc29ja2V0SU8uZXZlbnRzKCkuSk9JTl9ST09NLCB7XG4gICAgICAgIHJvb21JRCAgICA6IHJvb21JRCxcbiAgICAgICAgcGxheWVyTmFtZTogdGhpcy5nZXRTdGF0ZSgpLm5hbWVcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBfYXBwVmlldy5hbGVydCgnVGhlIHJvb20gSUQgaXMgbm90IGNvcnJlY3QuIE11c3QgYmUgYSA1IGRpZ2l0IG51bWJlci4nLCAnQmFkIFJvb20gSUQnKTtcbiAgICB9XG4gIH0sXG5cbiAgdmFsaWRhdGVVc2VyRGV0YWlsc0lucHV0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5hbWUgICAgICAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJuYW1lJykudmFsdWUsXG4gICAgICAgIGFwcGVhcmFuY2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJ0eXBlJykudmFsdWU7XG5cbiAgICBpZiAoIW5hbWUubGVuZ3RoIHx8ICFhcHBlYXJhbmNlKSB7XG4gICAgICBfYXBwVmlldy5hbGVydCgnTWFrZSBzdXJlIHlvdVxcJ3ZlIHR5cGVkIGEgbmFtZSBmb3IgeW91cnNlbGYgYW5kIHNlbGVjdGVkIGFuIGFwcGVhcmFuY2UnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJvb20gSUQgbXVzdCBiZSBhbiBpbnRlZ2VyIGFuZCA1IGRpZ2l0c1xuICAgKiBAcGFyYW0gcm9vbUlEXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgdmFsaWRhdGVSb29tSUQ6IGZ1bmN0aW9uIChyb29tSUQpIHtcbiAgICBpZiAoaXNOYU4ocGFyc2VJbnQocm9vbUlEKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHJvb21JRC5sZW5ndGggIT09IDUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgb25DcmVhdGVSb29tOiBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ2NyZWF0ZSByb29tJyk7XG4gICAgaWYgKHRoaXMudmFsaWRhdGVVc2VyRGV0YWlsc0lucHV0KCkpIHtcbiAgICAgIF9zb2NrZXRJTy5ub3RpZnlTZXJ2ZXIoX3NvY2tldElPLmV2ZW50cygpLkNSRUFURV9ST09NLCB7cGxheWVyTmFtZTogdGhpcy5nZXRTdGF0ZSgpLm5hbWV9KTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsInZhciBfbm9yaUFjdGlvbnMgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJyksXG4gICAgX2FwcFZpZXcgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3JyksXG4gICAgX2FwcFN0b3JlICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI3RpdGxlX19idXR0b24tc3RhcnQnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1sxXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsInZhciBfbm9yaUFjdGlvbnMgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJyksXG4gICAgX2FwcFZpZXcgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3JyksXG4gICAgX2FwcFN0b3JlICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI3dhaXRpbmdfX2J1dHRvbi1za2lwJzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbM119KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgY29uc29sZS5sb2coYXBwU3RhdGUpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZSxcbiAgICAgIHJvb21JRCAgICA6IGFwcFN0YXRlLnNlc3Npb24ucm9vbUlELFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qKlxuICogSW5pdGlhbCBmaWxlIGZvciB0aGUgQXBwbGljYXRpb25cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgLyoqXG4gICAqIElFIHZlcnNpb25zIDkgYW5kIHVuZGVyIGFyZSBibG9ja2VkLCBvdGhlcnMgYXJlIGFsbG93ZWQgdG8gcHJvY2VlZFxuICAgKi9cbiAgaWYoX2Jyb3dzZXJJbmZvLm5vdFN1cHBvcnRlZCB8fCBfYnJvd3NlckluZm8uaXNJRTkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuaW5uZXJIVE1MID0gJzxoMz5Gb3IgdGhlIGJlc3QgZXhwZXJpZW5jZSwgcGxlYXNlIHVzZSBJbnRlcm5ldCBFeHBsb3JlciAxMCssIEZpcmVmb3gsIENocm9tZSBvciBTYWZhcmkgdG8gdmlldyB0aGlzIGFwcGxpY2F0aW9uLjwvaDM+JztcbiAgfSBlbHNlIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24gbW9kdWxlIGFuZCBpbml0aWFsaXplXG4gICAgICovXG4gICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgd2luZG93Lk5vcmkgPSByZXF1aXJlKCcuL25vcmkvTm9yaS5qcycpO1xuICAgICAgd2luZG93LkFQUCA9IHJlcXVpcmUoJy4vYXBwL0FwcC5qcycpO1xuICAgICAgQVBQLmluaXRpYWxpemUoKTtcbiAgICB9O1xuXG4gIH1cblxufSgpKTsiLCJ2YXIgTm9yaSA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2Rpc3BhdGNoZXIgPSByZXF1aXJlKCcuL3V0aWxzL0Rpc3BhdGNoZXIuanMnKSxcbiAgICAgIF9yb3V0ZXIgICAgID0gcmVxdWlyZSgnLi91dGlscy9Sb3V0ZXIuanMnKTtcblxuICAvLyBTd2l0Y2ggTG9kYXNoIHRvIHVzZSBNdXN0YWNoZSBzdHlsZSB0ZW1wbGF0ZXNcbiAgXy50ZW1wbGF0ZVNldHRpbmdzLmludGVycG9sYXRlID0gL3t7KFtcXHNcXFNdKz8pfX0vZztcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFjY2Vzc29yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBnZXREaXNwYXRjaGVyKCkge1xuICAgIHJldHVybiBfZGlzcGF0Y2hlcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJvdXRlcigpIHtcbiAgICByZXR1cm4gX3JvdXRlcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sICh3aW5kb3cuQVBQX0NPTkZJR19EQVRBIHx8IHt9KSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50Um91dGUoKSB7XG4gICAgcmV0dXJuIF9yb3V0ZXIuZ2V0Q3VycmVudFJvdXRlKCk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEZhY3RvcmllcyAtIGNvbmNhdGVuYXRpdmUgaW5oZXJpdGFuY2UsIGRlY29yYXRvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIE1lcmdlcyBhIGNvbGxlY3Rpb24gb2Ygb2JqZWN0c1xuICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAqIEBwYXJhbSBzb3VyY2VBcnJheVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFzc2lnbkFycmF5KHRhcmdldCwgc291cmNlQXJyYXkpIHtcbiAgICBzb3VyY2VBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgIHRhcmdldCA9IF8uYXNzaWduKHRhcmdldCwgc291cmNlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBOb3JpIGFwcGxpY2F0aW9uIGluc3RhbmNlXG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVBcHBsaWNhdGlvbihjdXN0b20pIHtcbiAgICBjdXN0b20ubWl4aW5zLnB1c2godGhpcyk7XG4gICAgcmV0dXJuIGJ1aWxkRnJvbU1peGlucyhjdXN0b20pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgbWFpbiBhcHBsaWNhdGlvbiBzdG9yZVxuICAgKiBAcGFyYW0gY3VzdG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3RvcmUoY3VzdG9tKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNzKCkge1xuICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBidWlsZEZyb21NaXhpbnMoY3VzdG9tKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIG1haW4gYXBwbGljYXRpb24gdmlld1xuICAgKiBAcGFyYW0gY3VzdG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlVmlldyhjdXN0b20pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gY3YoKSB7XG4gICAgICByZXR1cm4gXy5hc3NpZ24oe30sIGJ1aWxkRnJvbU1peGlucyhjdXN0b20pKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE1peGVzIGluIHRoZSBtb2R1bGVzIHNwZWNpZmllZCBpbiB0aGUgY3VzdG9tIGFwcGxpY2F0aW9uIG9iamVjdFxuICAgKiBAcGFyYW0gc291cmNlT2JqZWN0XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYnVpbGRGcm9tTWl4aW5zKHNvdXJjZU9iamVjdCkge1xuICAgIHZhciBtaXhpbnM7XG5cbiAgICBpZiAoc291cmNlT2JqZWN0Lm1peGlucykge1xuICAgICAgbWl4aW5zID0gc291cmNlT2JqZWN0Lm1peGlucztcbiAgICB9XG5cbiAgICBtaXhpbnMucHVzaChzb3VyY2VPYmplY3QpO1xuICAgIHJldHVybiBhc3NpZ25BcnJheSh7fSwgbWl4aW5zKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBGdW5jdGlvbmFsIHV0aWxzIGZyb20gTWl0aHJpbFxuICAvLyAgaHR0cHM6Ly9naXRodWIuY29tL2xob3JpZS9taXRocmlsLmpzL2Jsb2IvbmV4dC9taXRocmlsLmpzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGh0dHA6Ly9taXRocmlsLmpzLm9yZy9taXRocmlsLnByb3AuaHRtbFxuICBmdW5jdGlvbiBwcm9wKHN0b3JlKSB7XG4gICAgLy9pZiAoaXNGdW5jdGlvbihzdG9yZS50aGVuKSkge1xuICAgIC8vICAvLyBoYW5kbGUgYSBwcm9taXNlXG4gICAgLy99XG4gICAgdmFyIGdldHRlcnNldHRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIHN0b3JlID0gYXJndW1lbnRzWzBdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0b3JlO1xuICAgIH07XG5cbiAgICBnZXR0ZXJzZXR0ZXIudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHN0b3JlO1xuICAgIH07XG5cbiAgICByZXR1cm4gZ2V0dGVyc2V0dGVyO1xuICB9XG5cbiAgLy8gaHR0cDovL21pdGhyaWwuanMub3JnL21pdGhyaWwud2l0aEF0dHIuaHRtbFxuICBmdW5jdGlvbiB3aXRoQXR0cihwcm9wLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgICAgZSA9IGUgfHwgZXZlbnQ7XG5cbiAgICAgIHZhciBjdXJyZW50VGFyZ2V0ID0gZS5jdXJyZW50VGFyZ2V0IHx8IHRoaXMsXG4gICAgICAgICAgY250eCAgICAgICAgICA9IGNvbnRleHQgfHwgdGhpcztcblxuICAgICAgY2FsbGJhY2suY2FsbChjbnR4LCBwcm9wIGluIGN1cnJlbnRUYXJnZXQgPyBjdXJyZW50VGFyZ2V0W3Byb3BdIDogY3VycmVudFRhcmdldC5nZXRBdHRyaWJ1dGUocHJvcCkpO1xuICAgIH07XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGNvbmZpZyAgICAgICAgICAgOiBnZXRDb25maWcsXG4gICAgZGlzcGF0Y2hlciAgICAgICA6IGdldERpc3BhdGNoZXIsXG4gICAgcm91dGVyICAgICAgICAgICA6IGdldFJvdXRlcixcbiAgICBjcmVhdGVBcHBsaWNhdGlvbjogY3JlYXRlQXBwbGljYXRpb24sXG4gICAgY3JlYXRlU3RvcmUgICAgICA6IGNyZWF0ZVN0b3JlLFxuICAgIGNyZWF0ZVZpZXcgICAgICAgOiBjcmVhdGVWaWV3LFxuICAgIGJ1aWxkRnJvbU1peGlucyAgOiBidWlsZEZyb21NaXhpbnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBhc3NpZ25BcnJheSAgICAgIDogYXNzaWduQXJyYXksXG4gICAgcHJvcCAgICAgICAgICAgICA6IHByb3AsXG4gICAgd2l0aEF0dHIgICAgICAgICA6IHdpdGhBdHRyXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaSgpO1xuXG5cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBDSEFOR0VfU1RPUkVfU1RBVEU6ICdDSEFOR0VfU1RPUkVfU1RBVEUnXG59OyIsIi8qKlxuICogQWN0aW9uIENyZWF0b3JcbiAqIEJhc2VkIG9uIEZsdXggQWN0aW9uc1xuICogRm9yIG1vcmUgaW5mb3JtYXRpb24gYW5kIGd1aWRlbGluZXM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBfbm9yaUFjdGlvbkNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQWN0aW9uQ29uc3RhbnRzLmpzJyk7XG5cbnZhciBOb3JpQWN0aW9uQ3JlYXRvciA9IHtcblxuICBjaGFuZ2VTdG9yZVN0YXRlOiBmdW5jdGlvbiAoZGF0YSwgaWQpIHtcbiAgICB2YXIgYWN0aW9uID0ge1xuICAgICAgdHlwZSAgIDogX25vcmlBY3Rpb25Db25zdGFudHMuQ0hBTkdFX1NUT1JFX1NUQVRFLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBpZCAgOiBpZCxcbiAgICAgICAgZGF0YTogZGF0YVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gYWN0aW9uO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaUFjdGlvbkNyZWF0b3I7IiwidmFyIFNvY2tldElPQ29ubmVjdG9yID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfc3ViamVjdCAgPSBuZXcgUnguQmVoYXZpb3JTdWJqZWN0KCksXG4gICAgICBfc29ja2V0SU8gPSBpbygpLFxuICAgICAgX2xvZyA9IFtdLFxuICAgICAgX2V2ZW50cyAgID0ge1xuICAgICAgICBQSU5HICAgICAgICAgICAgIDogJ3BpbmcnLFxuICAgICAgICBQT05HICAgICAgICAgICAgIDogJ3BvbmcnLFxuICAgICAgICBOT1RJRllfQ0xJRU5UICAgIDogJ25vdGlmeV9jbGllbnQnLFxuICAgICAgICBOT1RJRllfU0VSVkVSICAgIDogJ25vdGlmeV9zZXJ2ZXInLFxuICAgICAgICBDT05ORUNUICAgICAgICAgIDogJ2Nvbm5lY3QnLFxuICAgICAgICBEUk9QUEVEICAgICAgICAgIDogJ2Ryb3BwZWQnLFxuICAgICAgICBVU0VSX0NPTk5FQ1RFRCAgIDogJ3VzZXJfY29ubmVjdGVkJyxcbiAgICAgICAgVVNFUl9ESVNDT05ORUNURUQ6ICd1c2VyX2Rpc2Nvbm5lY3RlZCcsXG4gICAgICAgIEVNSVQgICAgICAgICAgICAgOiAnZW1pdCcsXG4gICAgICAgIEJST0FEQ0FTVCAgICAgICAgOiAnYnJvYWRjYXN0JyxcbiAgICAgICAgU1lTVEVNX01FU1NBR0UgICA6ICdzeXN0ZW1fbWVzc2FnZScsXG4gICAgICAgIE1FU1NBR0UgICAgICAgICAgOiAnbWVzc2FnZScsXG4gICAgICAgIENSRUFURV9ST09NICAgICAgOiAnY3JlYXRlX3Jvb20nLFxuICAgICAgICBKT0lOX1JPT00gICAgICAgIDogJ2pvaW5fcm9vbScsXG4gICAgICAgIExFQVZFX1JPT00gICAgICAgOiAnbGVhdmVfcm9vbScsXG4gICAgICAgIEdBTUVfU1RBUlQgICAgICAgOiAnZ2FtZV9zdGFydCcsXG4gICAgICAgIEdBTUVfRU5EICAgICAgICAgOiAnZ2FtZV9lbmQnXG4gICAgICB9O1xuXG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBfc29ja2V0SU8ub24oX2V2ZW50cy5OT1RJRllfQ0xJRU5ULCBvbk5vdGlmeUNsaWVudCk7XG4gIH1cblxuICAvKipcbiAgICogQWxsIG5vdGlmaWNhdGlvbnMgZnJvbSBTb2NrZXQuaW8gY29tZSBoZXJlXG4gICAqIEBwYXJhbSBwYXlsb2FkIHt0eXBlLCBpZCwgdGltZSwgcGF5bG9hZH1cbiAgICovXG4gIGZ1bmN0aW9uIG9uTm90aWZ5Q2xpZW50KHBheWxvYWQpIHtcbiAgICBfbG9nLnB1c2gocGF5bG9hZCk7XG5cbiAgICBpZiAocGF5bG9hZC50eXBlID09PSBfZXZlbnRzLlBJTkcpIHtcbiAgICAgIG5vdGlmeVNlcnZlcihfZXZlbnRzLlBPTkcsIHt9KTtcbiAgICB9IGVsc2UgaWYgKHBheWxvYWQudHlwZSA9PT0gX2V2ZW50cy5QT05HKSB7XG4gICAgICBjb25zb2xlLmxvZygnU09DS0VULklPIFBPTkchJyk7XG4gICAgfVxuICAgIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGluZygpIHtcbiAgICBub3RpZnlTZXJ2ZXIoX2V2ZW50cy5QSU5HLCB7fSk7XG4gIH1cblxuICAvKipcbiAgICogQWxsIGNvbW11bmljYXRpb25zIHRvIHRoZSBzZXJ2ZXIgc2hvdWxkIGdvIHRocm91Z2ggaGVyZVxuICAgKiBAcGFyYW0gdHlwZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U2VydmVyKHR5cGUsIHBheWxvYWQpIHtcbiAgICBfc29ja2V0SU8uZW1pdChfZXZlbnRzLk5PVElGWV9TRVJWRVIsIHtcbiAgICAgIHR5cGUgICA6IHR5cGUsXG4gICAgICBwYXlsb2FkOiBwYXlsb2FkXG4gICAgfSk7XG4gIH1cblxuICAvL2Z1bmN0aW9uIGVtaXQobWVzc2FnZSwgcGF5bG9hZCkge1xuICAvLyAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgX2V2ZW50cy5NRVNTQUdFO1xuICAvLyAgcGF5bG9hZCA9IHBheWxvYWQgfHwge307XG4gIC8vICBfc29ja2V0SU8uZW1pdChtZXNzYWdlLCBwYXlsb2FkKTtcbiAgLy99XG4gIC8vXG4gIC8vZnVuY3Rpb24gb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgLy8gIF9zb2NrZXRJTy5vbihldmVudCwgaGFuZGxlcik7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgaGFuZGxlciB0byB1cGRhdGVzXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3N1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBmcm9tIHVwZGF0ZSBvciB3aGF0ZXZlciBmdW5jdGlvbiB0byBkaXNwYXRjaCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIF9zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBsYXN0IHBheWxvYWQgdGhhdCB3YXMgZGlzcGF0Y2hlZCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExhc3ROb3RpZmljYXRpb24oKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LmdldFZhbHVlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRFdmVudENvbnN0YW50cygpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sIF9ldmVudHMpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBldmVudHMgICAgICAgICAgICAgOiBnZXRFdmVudENvbnN0YW50cyxcbiAgICBpbml0aWFsaXplICAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHBpbmcgICAgICAgICAgICAgICA6IHBpbmcsXG4gICAgbm90aWZ5U2VydmVyICAgICAgIDogbm90aWZ5U2VydmVyLFxuICAgIHN1YnNjcmliZSAgICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVycyAgOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRMYXN0Tm90aWZpY2F0aW9uOiBnZXRMYXN0Tm90aWZpY2F0aW9uXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU29ja2V0SU9Db25uZWN0b3IoKTsiLCIvKipcbiAqIE1peGluIGZvciBOb3JpIHN0b3JlcyB0byBhZGQgZnVuY3Rpb25hbGl0eSBzaW1pbGFyIHRvIFJlZHV4JyBSZWR1Y2VyIGFuZCBzaW5nbGVcbiAqIG9iamVjdCBzdGF0ZSB0cmVlIGNvbmNlcHQuIE1peGluIHNob3VsZCBiZSBjb21wb3NlZCB0byBub3JpL3N0b3JlL0FwcGxpY2F0aW9uU3RvcmVcbiAqIGR1cmluZyBjcmVhdGlvbiBvZiBtYWluIEFwcFN0b3JlXG4gKlxuICogaHR0cHM6Ly9nYWVhcm9uLmdpdGh1Yi5pby9yZWR1eC9kb2NzL2FwaS9TdG9yZS5odG1sXG4gKiBodHRwczovL2dhZWFyb24uZ2l0aHViLmlvL3JlZHV4L2RvY3MvYmFzaWNzL1JlZHVjZXJzLmh0bWxcbiAqXG4gKiBDcmVhdGVkIDgvMTMvMTVcbiAqL1xudmFyIE1peGluUmVkdWNlclN0b3JlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMsXG4gICAgICBfc3RhdGUsXG4gICAgICBfc3RhdGVSZWR1Y2VycyA9IFtdO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBfc3RhdGUgbWlnaHQgbm90IGV4aXN0IGlmIHN1YnNjcmliZXJzIGFyZSBhZGRlZCBiZWZvcmUgdGhpcyBzdG9yZSBpcyBpbml0aWFsaXplZFxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gICAgaWYgKF9zdGF0ZSkge1xuICAgICAgcmV0dXJuIF9zdGF0ZS5nZXRTdGF0ZSgpO1xuICAgIH1cbiAgICByZXR1cm4ge307XG4gIH1cblxuICBmdW5jdGlvbiBzZXRTdGF0ZShzdGF0ZSkge1xuICAgIGlmICghXy5pc0VxdWFsKHN0YXRlLCBfc3RhdGUpKSB7XG4gICAgICBfc3RhdGUuc2V0U3RhdGUoc3RhdGUpO1xuICAgICAgX3RoaXMubm90aWZ5U3Vic2NyaWJlcnMoe30pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFJlZHVjZXJzKHJlZHVjZXJBcnJheSkge1xuICAgIF9zdGF0ZVJlZHVjZXJzID0gcmVkdWNlckFycmF5O1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkUmVkdWNlcihyZWR1Y2VyKSB7XG4gICAgX3N0YXRlUmVkdWNlcnMucHVzaChyZWR1Y2VyKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgSW5pdFxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogU2V0IHVwIGV2ZW50IGxpc3RlbmVyL3JlY2VpdmVyXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplUmVkdWNlclN0b3JlKCkge1xuICAgIGlmICghdGhpcy5jcmVhdGVTdWJqZWN0KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUgbmVlZHMgbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0IHRvIG5vdGlmeScpO1xuICAgIH1cblxuICAgIHZhciBzaW1wbGVTdG9yZUZhY3RvcnkgPSByZXF1aXJlKCcuL1NpbXBsZVN0b3JlLmpzJyk7XG5cbiAgICBfdGhpcyAgPSB0aGlzO1xuICAgIF9zdGF0ZSA9IHNpbXBsZVN0b3JlRmFjdG9yeSgpO1xuXG4gICAgaWYgKCFfc3RhdGVSZWR1Y2Vycykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWR1Y2VyU3RvcmUsIG11c3Qgc2V0IGEgcmVkdWNlciBiZWZvcmUgaW5pdGlhbGl6YXRpb24nKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgaW5pdGlhbCBzdGF0ZSBmcm9tIGVtcHR5IGV2ZW50XG4gICAgYXBwbHlSZWR1Y2Vycyh7fSk7XG4gIH1cblxuICAvKipcbiAgICogQXBwbHkgdGhlIGFjdGlvbiBvYmplY3QgdG8gdGhlIHJlZHVjZXJzIHRvIGNoYW5nZSBzdGF0ZVxuICAgKiBhcmUgc2VudCB0byBhbGwgcmVkdWNlcnMgdG8gdXBkYXRlIHRoZSBzdGF0ZVxuICAgKiBAcGFyYW0gYWN0aW9uT2JqZWN0XG4gICAqL1xuICBmdW5jdGlvbiBhcHBseShhY3Rpb25PYmplY3QpIHtcbiAgICBjb25zb2xlLmxvZygnUmVkdWNlclN0b3JlIEFwcGx5OiAnLCBhY3Rpb25PYmplY3QudHlwZSwgYWN0aW9uT2JqZWN0LnBheWxvYWQpO1xuICAgIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KSB7XG4gICAgdmFyIG5leHRTdGF0ZSA9IGFwcGx5UmVkdWNlcnNUb1N0YXRlKGdldFN0YXRlKCksIGFjdGlvbk9iamVjdCk7XG4gICAgc2V0U3RhdGUobmV4dFN0YXRlKTtcbiAgICBfdGhpcy5oYW5kbGVTdGF0ZU11dGF0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogQVBJIGhvb2sgdG8gaGFuZGxlIHN0YXRlIHVwZGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlTXV0YXRpb24oKSB7XG4gICAgLy8gb3ZlcnJpZGUgdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgc3RhdGUgZnJvbSB0aGUgY29tYmluZWQgcmVkdWNlcyBhbmQgYWN0aW9uIG9iamVjdFxuICAgKiBTdG9yZSBzdGF0ZSBpc24ndCBtb2RpZmllZCwgY3VycmVudCBzdGF0ZSBpcyBwYXNzZWQgaW4gYW5kIG11dGF0ZWQgc3RhdGUgcmV0dXJuZWRcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25cbiAgICogQHJldHVybnMgeyp8e319XG4gICAqL1xuICBmdW5jdGlvbiBhcHBseVJlZHVjZXJzVG9TdGF0ZShzdGF0ZSwgYWN0aW9uKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICAvLyBUT0RPIHNob3VsZCB0aGlzIGFjdHVhbGx5IHVzZSBhcnJheS5yZWR1Y2UoKT9cbiAgICBfc3RhdGVSZWR1Y2Vycy5mb3JFYWNoKGZ1bmN0aW9uIGFwcGx5U3RhdGVSZWR1Y2VyRnVuY3Rpb24ocmVkdWNlckZ1bmMpIHtcbiAgICAgIHN0YXRlID0gcmVkdWNlckZ1bmMoc3RhdGUsIGFjdGlvbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlbXBsYXRlIHJlZHVjZXIgZnVuY3Rpb25cbiAgICogU3RvcmUgc3RhdGUgaXNuJ3QgbW9kaWZpZWQsIGN1cnJlbnQgc3RhdGUgaXMgcGFzc2VkIGluIGFuZCBtdXRhdGVkIHN0YXRlIHJldHVybmVkXG5cbiAgIGZ1bmN0aW9uIHRlbXBsYXRlUmVkdWNlckZ1bmN0aW9uKHN0YXRlLCBldmVudCkge1xuICAgICAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcbiAgICAgICAgICBjYXNlIF9ub3JpQWN0aW9uQ29uc3RhbnRzLk1PREVMX0RBVEFfQ0hBTkdFRDpcbiAgICAgICAgICAgIC8vIGNhbiBjb21wb3NlIG90aGVyIHJlZHVjZXJzXG4gICAgICAgICAgICAvLyByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIG90aGVyU3RhdGVUcmFuc2Zvcm1lcihzdGF0ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCB7cHJvcDogZXZlbnQucGF5bG9hZC52YWx1ZX0pO1xuICAgICAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1JlZHVjZXIgc3RvcmUsIHVuaGFuZGxlZCBldmVudCB0eXBlOiAnK2V2ZW50LnR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAqL1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZTogaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSxcbiAgICBnZXRTdGF0ZSAgICAgICAgICAgICAgOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZSAgICAgICAgICAgICAgOiBzZXRTdGF0ZSxcbiAgICBhcHBseSAgICAgICAgICAgICAgICAgOiBhcHBseSxcbiAgICBzZXRSZWR1Y2VycyAgICAgICAgICAgOiBzZXRSZWR1Y2VycyxcbiAgICBhZGRSZWR1Y2VyICAgICAgICAgICAgOiBhZGRSZWR1Y2VyLFxuICAgIGFwcGx5UmVkdWNlcnMgICAgICAgICA6IGFwcGx5UmVkdWNlcnMsXG4gICAgYXBwbHlSZWR1Y2Vyc1RvU3RhdGUgIDogYXBwbHlSZWR1Y2Vyc1RvU3RhdGUsXG4gICAgaGFuZGxlU3RhdGVNdXRhdGlvbiAgIDogaGFuZGxlU3RhdGVNdXRhdGlvblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluUmVkdWNlclN0b3JlKCk7IiwidmFyIFNpbXBsZVN0b3JlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX2ludGVybmFsU3RhdGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBzdGF0ZVxuICAgKiBAcmV0dXJucyB7dm9pZHwqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCBfaW50ZXJuYWxTdGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGVcbiAgICogQHBhcmFtIG5leHRTdGF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U3RhdGUobmV4dFN0YXRlKSB7XG4gICAgX2ludGVybmFsU3RhdGUgPSBfLmFzc2lnbihfaW50ZXJuYWxTdGF0ZSwgbmV4dFN0YXRlKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZ2V0U3RhdGU6IGdldFN0YXRlLFxuICAgIHNldFN0YXRlOiBzZXRTdGF0ZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXBsZVN0b3JlOyIsIi8qXG4gTWF0dCBQZXJraW5zLCA2LzEyLzE1XG5cbiBwdWJsaXNoIHBheWxvYWQgb2JqZWN0XG5cbiB7XG4gdHlwZTogRVZUX1RZUEUsXG4gcGF5bG9hZDoge1xuIGtleTogdmFsdWVcbiB9XG4gfVxuXG4gKi9cbnZhciBEaXNwYXRjaGVyID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfc3ViamVjdE1hcCAgPSB7fSxcbiAgICAgIF9yZWNlaXZlck1hcCA9IHt9LFxuICAgICAgX2lkICAgICAgICAgID0gMCxcbiAgICAgIF9sb2cgICAgICAgICA9IFtdLFxuICAgICAgX3F1ZXVlICAgICAgID0gW10sXG4gICAgICBfdGltZXJPYnNlcnZhYmxlLFxuICAgICAgX3RpbWVyU3Vic2NyaXB0aW9uLFxuICAgICAgX3RpbWVyUGF1c2FibGU7XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBldmVudCBhcyBvYnNlcnZhYmxlXG4gICAqIEBwYXJhbSBldnRTdHIgRXZlbnQgbmFtZSBzdHJpbmdcbiAgICogQHBhcmFtIGhhbmRsZXIgb25OZXh0KCkgc3Vic2NyaXB0aW9uIGZ1bmN0aW9uXG4gICAqIEBwYXJhbSBvbmNlT3JDb250ZXh0IG9wdGlvbmFsLCBlaXRoZXIgdGhlIGNvbnRleHQgdG8gZXhlY3V0ZSB0aGUgaGFuZGVyIG9yIG9uY2UgYm9vbFxuICAgKiBAcGFyYW0gb25jZSB3aWxsIGNvbXBsZXRlL2Rpc3Bvc2UgYWZ0ZXIgb25lIGZpcmVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoZXZ0U3RyLCBoYW5kbGVyLCBvbmNlT3JDb250ZXh0LCBvbmNlKSB7XG4gICAgdmFyIGhhbmRsZXJDb250ZXh0ID0gd2luZG93O1xuXG4gICAgLy9jb25zb2xlLmxvZygnZGlzcGF0Y2hlciBzdWJzY3JpYmUnLCBldnRTdHIsIGhhbmRsZXIsIG9uY2VPckNvbnRleHQsIG9uY2UpO1xuXG4gICAgaWYgKGlzLmZhbHNleShldnRTdHIpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Rpc3BhdGNoZXI6IEZhc2xleSBldmVudCBzdHJpbmcgcGFzc2VkIGZvciBoYW5kbGVyJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKGlzLmZhbHNleShoYW5kbGVyKSkge1xuICAgICAgY29uc29sZS53YXJuKCdEaXNwYXRjaGVyOiBGYXNsZXkgaGFuZGxlciBwYXNzZWQgZm9yIGV2ZW50IHN0cmluZycsIGV2dFN0cik7XG4gICAgfVxuXG4gICAgaWYgKG9uY2VPckNvbnRleHQgfHwgb25jZU9yQ29udGV4dCA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChvbmNlT3JDb250ZXh0ID09PSB0cnVlIHx8IG9uY2VPckNvbnRleHQgPT09IGZhbHNlKSB7XG4gICAgICAgIG9uY2UgPSBvbmNlT3JDb250ZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGFuZGxlckNvbnRleHQgPSBvbmNlT3JDb250ZXh0O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghX3N1YmplY3RNYXBbZXZ0U3RyXSkge1xuICAgICAgX3N1YmplY3RNYXBbZXZ0U3RyXSA9IFtdO1xuICAgIH1cblxuICAgIHZhciBzdWJqZWN0ID0gbmV3IFJ4LlN1YmplY3QoKTtcblxuICAgIF9zdWJqZWN0TWFwW2V2dFN0cl0ucHVzaCh7XG4gICAgICBvbmNlICAgIDogb25jZSxcbiAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgaGFuZGxlciA6IGhhbmRsZXIsXG4gICAgICBjb250ZXh0IDogaGFuZGxlckNvbnRleHQsXG4gICAgICBzdWJqZWN0IDogc3ViamVjdCxcbiAgICAgIHR5cGUgICAgOiAwXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlci5iaW5kKGhhbmRsZXJDb250ZXh0KSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0aGUgZXZlbnQgcHJvY2Vzc2luZyB0aW1lciBvciByZXN1bWUgYSBwYXVzZWQgdGltZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRUaW1lcigpIHtcbiAgICBpZiAoX3RpbWVyT2JzZXJ2YWJsZSkge1xuICAgICAgX3RpbWVyUGF1c2FibGUub25OZXh0KHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF90aW1lclBhdXNhYmxlICAgICA9IG5ldyBSeC5TdWJqZWN0KCk7XG4gICAgX3RpbWVyT2JzZXJ2YWJsZSAgID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxKS5wYXVzYWJsZShfdGltZXJQYXVzYWJsZSk7XG4gICAgX3RpbWVyU3Vic2NyaXB0aW9uID0gX3RpbWVyT2JzZXJ2YWJsZS5zdWJzY3JpYmUocHJvY2Vzc05leHRFdmVudCk7XG4gIH1cblxuICAvKipcbiAgICogU2hpZnQgbmV4dCBldmVudCB0byBoYW5kbGUgb2ZmIG9mIHRoZSBxdWV1ZSBhbmQgZGlzcGF0Y2ggaXRcbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NOZXh0RXZlbnQoKSB7XG4gICAgdmFyIGV2dCA9IF9xdWV1ZS5zaGlmdCgpO1xuICAgIGlmIChldnQpIHtcbiAgICAgIGRpc3BhdGNoVG9SZWNlaXZlcnMoZXZ0KTtcbiAgICAgIGRpc3BhdGNoVG9TdWJzY3JpYmVycyhldnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfdGltZXJQYXVzYWJsZS5vbk5leHQoZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdXNoIGV2ZW50IHRvIHRoZSBzdGFjayBhbmQgYmVnaW4gZXhlY3V0aW9uXG4gICAqIEBwYXJhbSBwYXlsb2FkT2JqIHR5cGU6U3RyaW5nLCBwYXlsb2FkOmRhdGFcbiAgICogQHBhcmFtIGRhdGFcbiAgICovXG4gIGZ1bmN0aW9uIHB1Ymxpc2gocGF5bG9hZE9iaikge1xuICAgIF9sb2cucHVzaChwYXlsb2FkT2JqKTtcbiAgICBfcXVldWUucHVzaChwYXlsb2FkT2JqKTtcblxuICAgIGluaXRUaW1lcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgdGhlIHBheWxvYWQgdG8gYWxsIHJlY2VpdmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2hUb1JlY2VpdmVycyhwYXlsb2FkKSB7XG4gICAgZm9yICh2YXIgaWQgaW4gX3JlY2VpdmVyTWFwKSB7XG4gICAgICBfcmVjZWl2ZXJNYXBbaWRdLmhhbmRsZXIocGF5bG9hZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXJzIHJlY2VpdmUgYWxsIHBheWxvYWRzIGZvciBhIGdpdmVuIGV2ZW50IHR5cGUgd2hpbGUgaGFuZGxlcnMgYXJlIHRhcmdldGVkXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaFRvU3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIHZhciBzdWJzY3JpYmVycyA9IF9zdWJqZWN0TWFwW3BheWxvYWQudHlwZV0sIGk7XG4gICAgaWYgKCFzdWJzY3JpYmVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGkgPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgc3Viak9iaiA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgaWYgKHN1YmpPYmoudHlwZSA9PT0gMCkge1xuICAgICAgICBzdWJqT2JqLnN1YmplY3Qub25OZXh0KHBheWxvYWQpO1xuICAgICAgfVxuICAgICAgaWYgKHN1YmpPYmoub25jZSkge1xuICAgICAgICB1bnN1YnNjcmliZShwYXlsb2FkLnR5cGUsIHN1YmpPYmouaGFuZGxlcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGhhbmRsZXJcbiAgICogQHBhcmFtIGV2dFN0clxuICAgKiBAcGFyYW0gaGFuZGVyXG4gICAqL1xuICBmdW5jdGlvbiB1bnN1YnNjcmliZShldnRTdHIsIGhhbmRsZXIpIHtcbiAgICBpZiAoX3N1YmplY3RNYXBbZXZ0U3RyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN1YnNjcmliZXJzID0gX3N1YmplY3RNYXBbZXZ0U3RyXSxcbiAgICAgICAgaGFuZGxlcklkeCAgPSAtMTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdWJzY3JpYmVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHN1YnNjcmliZXJzW2ldLmhhbmRsZXIgPT09IGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlcklkeCAgICAgPSBpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXS5zdWJqZWN0Lm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHN1YnNjcmliZXJzW2ldLnN1YmplY3QuZGlzcG9zZSgpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhbmRsZXJJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3Vic2NyaWJlcnMuc3BsaWNlKGhhbmRsZXJJZHgsIDEpO1xuXG4gICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVsZXRlIF9zdWJqZWN0TWFwW2V2dFN0cl07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIGNvcHkgb2YgdGhlIGxvZyBhcnJheVxuICAgKiBAcmV0dXJucyB7QXJyYXkuPFQ+fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TG9nKCkge1xuICAgIHJldHVybiBfbG9nLnNsaWNlKDApO1xuICB9XG5cblxuICAvKipcbiAgICogU2ltcGxlIHJlY2VpdmVyIGltcGxlbWVudGF0aW9uIGJhc2VkIG9uIEZsdXhcbiAgICogUmVnaXN0ZXJlZCByZWNlaXZlcnMgd2lsbCBnZXQgZXZlcnkgcHVibGlzaGVkIGV2ZW50XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9mbHV4L2Jsb2IvbWFzdGVyL3NyYy9EaXNwYXRjaGVyLmpzXG4gICAqXG4gICAqIFVzYWdlOlxuICAgKlxuICAgKiBfZGlzcGF0Y2hlci5yZWdpc3RlclJlY2VpdmVyKGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgICAgKiAgICBjb25zb2xlLmxvZygncmVjZWl2aW5nLCAnLHBheWxvYWQpO1xuICAgICAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3RlclJlY2VpdmVyKGhhbmRsZXIpIHtcbiAgICB2YXIgaWQgICAgICAgICAgID0gJ0lEXycgKyBfaWQrKztcbiAgICBfcmVjZWl2ZXJNYXBbaWRdID0ge1xuICAgICAgaWQgICAgIDogaWQsXG4gICAgICBoYW5kbGVyOiBoYW5kbGVyXG4gICAgfTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSByZWNlaXZlciBoYW5kbGVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gdW5yZWdpc3RlclJlY2VpdmVyKGlkKSB7XG4gICAgaWYgKF9yZWNlaXZlck1hcC5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgIGRlbGV0ZSBfcmVjZWl2ZXJNYXBbaWRdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgdW5zdWJzY3JpYmUgICAgICAgOiB1bnN1YnNjcmliZSxcbiAgICBwdWJsaXNoICAgICAgICAgICA6IHB1Ymxpc2gsXG4gICAgZ2V0TG9nICAgICAgICAgICAgOiBnZXRMb2csXG4gICAgcmVnaXN0ZXJSZWNlaXZlciAgOiByZWdpc3RlclJlY2VpdmVyLFxuICAgIHVucmVnaXN0ZXJSZWNlaXZlcjogdW5yZWdpc3RlclJlY2VpdmVyXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2hlcigpOyIsIi8qKlxuICogQWRkIFJ4SlMgU3ViamVjdCB0byBhIG1vZHVsZS5cbiAqXG4gKiBBZGQgb25lIHNpbXBsZSBvYnNlcnZhYmxlIHN1YmplY3Qgb3IgbW9yZSBjb21wbGV4IGFiaWxpdHkgdG8gY3JlYXRlIG90aGVycyBmb3JcbiAqIG1vcmUgY29tcGxleCBldmVudGluZyBuZWVkcy5cbiAqL1xudmFyIE1peGluT2JzZXJ2YWJsZVN1YmplY3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICAgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9zdWJqZWN0TWFwID0ge307XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBzdWJqZWN0XG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3ViamVjdChuYW1lKSB7XG4gICAgaWYgKCFfc3ViamVjdE1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgX3N1YmplY3RNYXBbbmFtZV0gPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gX3N1YmplY3RNYXBbbmFtZV07XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIGhhbmRsZXIgdG8gdXBkYXRlcy4gSWYgdGhlIGhhbmRsZXIgaXMgYSBzdHJpbmcsIHRoZSBuZXcgc3ViamVjdFxuICAgKiB3aWxsIGJlIGNyZWF0ZWQuXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXJPck5hbWUsIG9wdEhhbmRsZXIpIHtcbiAgICBpZiAoaXMuc3RyaW5nKGhhbmRsZXJPck5hbWUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3ViamVjdChoYW5kbGVyT3JOYW1lKS5zdWJzY3JpYmUob3B0SGFuZGxlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlck9yTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHVwZGF0ZWQgdG8gc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICBfc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBuYW1lZCBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnNPZihuYW1lLCBwYXlsb2FkKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXS5vbk5leHQocGF5bG9hZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignTWl4aW5PYnNlcnZhYmxlU3ViamVjdCwgbm8gc3Vic2NyaWJlcnMgb2YgJyArIG5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIGNyZWF0ZVN1YmplY3QgICAgICA6IGNyZWF0ZVN1YmplY3QsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnMgIDogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnNPZjogbm90aWZ5U3Vic2NyaWJlcnNPZlxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluT2JzZXJ2YWJsZVN1YmplY3Q7IiwiLyoqXG4gKiBVdGlsaXR5IHRvIGhhbmRsZSBhbGwgdmlldyBET00gYXR0YWNobWVudCB0YXNrc1xuICovXG5cbnZhciBSZW5kZXJlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF9kb21VdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgZnVuY3Rpb24gcmVuZGVyKHBheWxvYWQpIHtcbiAgICB2YXIgdGFyZ2V0U2VsZWN0b3IgPSBwYXlsb2FkLnRhcmdldCxcbiAgICAgICAgaHRtbCAgICAgICAgICAgPSBwYXlsb2FkLmh0bWwsXG4gICAgICAgIGRvbUVsLFxuICAgICAgICBtb3VudFBvaW50ICAgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0U2VsZWN0b3IpLFxuICAgICAgICBjYiAgICAgICAgICAgICA9IHBheWxvYWQuY2FsbGJhY2s7XG5cbiAgICBtb3VudFBvaW50LmlubmVySFRNTCA9ICcnO1xuXG4gICAgaWYgKGh0bWwpIHtcbiAgICAgIGRvbUVsID0gX2RvbVV0aWxzLkhUTUxTdHJUb05vZGUoaHRtbCk7XG4gICAgICBtb3VudFBvaW50LmFwcGVuZENoaWxkKGRvbUVsKTtcbiAgICB9XG5cbiAgICBpZiAoY2IpIHtcbiAgICAgIGNiKGRvbUVsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZG9tRWw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlbmRlcjogcmVuZGVyXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVuZGVyZXIoKTsiLCIvKipcbiAqIFNpbXBsZSByb3V0ZXJcbiAqIFN1cHBvcnRpbmcgSUU5IHNvIHVzaW5nIGhhc2hlcyBpbnN0ZWFkIG9mIHRoZSBoaXN0b3J5IEFQSSBmb3Igbm93XG4gKi9cblxudmFyIFJvdXRlciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3QgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9oYXNoQ2hhbmdlT2JzZXJ2YWJsZSxcbiAgICAgIF9vYmpVdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzJyk7XG5cbiAgLyoqXG4gICAqIFNldCBldmVudCBoYW5kbGVyc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBfaGFzaENoYW5nZU9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh3aW5kb3csICdoYXNoY2hhbmdlJykuc3Vic2NyaWJlKG5vdGlmeVN1YnNjcmliZXJzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzdWJzY3JpYmUgYSBoYW5kbGVyIHRvIHRoZSB1cmwgY2hhbmdlIGV2ZW50c1xuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb3RpZnkgb2YgYSBjaGFuZ2UgaW4gcm91dGVcbiAgICogQHBhcmFtIGZyb21BcHAgVHJ1ZSBpZiB0aGUgcm91dGUgd2FzIGNhdXNlZCBieSBhbiBhcHAgZXZlbnQgbm90IFVSTCBvciBoaXN0b3J5IGNoYW5nZVxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMoKSB7XG4gICAgdmFyIGV2ZW50UGF5bG9hZCA9IHtcbiAgICAgIHJvdXRlT2JqOiBnZXRDdXJyZW50Um91dGUoKSwgLy8geyByb3V0ZTosIGRhdGE6IH1cbiAgICAgIGZyYWdtZW50OiBnZXRVUkxGcmFnbWVudCgpXG4gICAgfTtcblxuICAgIF9zdWJqZWN0Lm9uTmV4dChldmVudFBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgcm91dGUgYW5kIHF1ZXJ5IHN0cmluZyBmcm9tIHRoZSBjdXJyZW50IFVSTCBmcmFnbWVudFxuICAgKiBAcmV0dXJucyB7e3JvdXRlOiBzdHJpbmcsIHF1ZXJ5OiB7fX19XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDdXJyZW50Um91dGUoKSB7XG4gICAgdmFyIGZyYWdtZW50ICAgID0gZ2V0VVJMRnJhZ21lbnQoKSxcbiAgICAgICAgcGFydHMgICAgICAgPSBmcmFnbWVudC5zcGxpdCgnPycpLFxuICAgICAgICByb3V0ZSAgICAgICA9ICcvJyArIHBhcnRzWzBdLFxuICAgICAgICBxdWVyeVN0ciAgICA9IGRlY29kZVVSSUNvbXBvbmVudChwYXJ0c1sxXSksXG4gICAgICAgIHF1ZXJ5U3RyT2JqID0gcGFyc2VRdWVyeVN0cihxdWVyeVN0cik7XG5cbiAgICBpZiAocXVlcnlTdHIgPT09ICc9dW5kZWZpbmVkJykge1xuICAgICAgcXVlcnlTdHJPYmogPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3JvdXRlOiByb3V0ZSwgZGF0YTogcXVlcnlTdHJPYmp9O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHF1ZXJ5IHN0cmluZyBpbnRvIGtleS92YWx1ZSBwYWlyc1xuICAgKiBAcGFyYW0gcXVlcnlTdHJcbiAgICogQHJldHVybnMge3t9fVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VRdWVyeVN0cihxdWVyeVN0cikge1xuICAgIHZhciBvYmogICA9IHt9LFxuICAgICAgICBwYXJ0cyA9IHF1ZXJ5U3RyLnNwbGl0KCcmJyk7XG5cbiAgICBwYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChwYWlyU3RyKSB7XG4gICAgICB2YXIgcGFpckFyciAgICAgPSBwYWlyU3RyLnNwbGl0KCc9Jyk7XG4gICAgICBvYmpbcGFpckFyclswXV0gPSBwYWlyQXJyWzFdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21iaW5lcyBhIHJvdXRlIGFuZCBkYXRhIG9iamVjdCBpbnRvIGEgcHJvcGVyIFVSTCBoYXNoIGZyYWdtZW50XG4gICAqIEBwYXJhbSByb3V0ZVxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2V0KHJvdXRlLCBkYXRhT2JqKSB7XG4gICAgdmFyIHBhdGggPSByb3V0ZSxcbiAgICAgICAgZGF0YSA9IFtdO1xuICAgIGlmICghX29ialV0aWxzLmlzTnVsbChkYXRhT2JqKSkge1xuICAgICAgcGF0aCArPSBcIj9cIjtcbiAgICAgIGZvciAodmFyIHByb3AgaW4gZGF0YU9iaikge1xuICAgICAgICBpZiAocHJvcCAhPT0gJ3VuZGVmaW5lZCcgJiYgZGF0YU9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgIGRhdGEucHVzaChwcm9wICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGRhdGFPYmpbcHJvcF0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcGF0aCArPSBkYXRhLmpvaW4oJyYnKTtcbiAgICB9XG5cbiAgICB1cGRhdGVVUkxGcmFnbWVudChwYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlICd3aGF0ZXZlci5odG1sIycgaW4gdGhlIFVSTFxuICAgKiBMZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIGFyZSByZW1vdmVkXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRVUkxGcmFnbWVudCgpIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBsb2NhdGlvbi5oYXNoLnNsaWNlKDEpO1xuICAgIHJldHVybiBmcmFnbWVudC50b1N0cmluZygpLnJlcGxhY2UoL1xcLyQvLCAnJykucmVwbGFjZSgvXlxcLy8sICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIFVSTCBoYXNoIGZyYWdtZW50XG4gICAqIEBwYXJhbSBwYXRoXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVVUkxGcmFnbWVudChwYXRoKSB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBwYXRoO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBzdWJzY3JpYmUgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIG5vdGlmeVN1YnNjcmliZXJzOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRDdXJyZW50Um91dGUgIDogZ2V0Q3VycmVudFJvdXRlLFxuICAgIHNldCAgICAgICAgICAgICAgOiBzZXRcbiAgfTtcblxufTtcblxudmFyIHIgPSBSb3V0ZXIoKTtcbnIuaW5pdGlhbGl6ZSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHI7IiwiLyoqXG4gKiBSeEpTIEhlbHBlcnNcbiAqIEB0eXBlIHt7ZG9tOiBGdW5jdGlvbiwgZnJvbTogRnVuY3Rpb24sIGludGVydmFsOiBGdW5jdGlvbiwgZG9FdmVyeTogRnVuY3Rpb24sIGp1c3Q6IEZ1bmN0aW9uLCBlbXB0eTogRnVuY3Rpb259fVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBkb206IGZ1bmN0aW9uIChzZWxlY3RvciwgZXZlbnQpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBpZiAoIWVsKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ25vcmkvdXRpbHMvUngsIGRvbSwgaW52YWxpZCBET00gc2VsZWN0b3I6ICcgKyBzZWxlY3Rvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChlbCwgZXZlbnQudHJpbSgpKTtcbiAgfSxcblxuICBmcm9tOiBmdW5jdGlvbiAoaXR0cikge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb20oaXR0cik7XG4gIH0sXG5cbiAgaW50ZXJ2YWw6IGZ1bmN0aW9uIChtcykge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmludGVydmFsKG1zKTtcbiAgfSxcblxuICBkb0V2ZXJ5OiBmdW5jdGlvbiAobXMsIC4uLmFyZ3MpIHtcbiAgICBpZihpcy5mdW5jdGlvbihhcmdzWzBdKSkge1xuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnN1YnNjcmliZShhcmdzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnRha2UoYXJnc1swXSkuc3Vic2NyaWJlKGFyZ3NbMV0pO1xuICB9LFxuXG4gIGp1c3Q6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmp1c3QodmFsdWUpO1xuICB9LFxuXG4gIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZW1wdHkoKTtcbiAgfVxuXG59OyIsIi8qXG4gU2ltcGxlIHdyYXBwZXIgZm9yIFVuZGVyc2NvcmUgLyBIVE1MIHRlbXBsYXRlc1xuIE1hdHQgUGVya2luc1xuIDQvNy8xNVxuICovXG52YXIgVGVtcGxhdGluZyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3RlbXBsYXRlTWFwICAgICAgID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF90ZW1wbGF0ZUhUTUxDYWNoZSA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfdGVtcGxhdGVDYWNoZSAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX0RPTVV0aWxzICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiBhZGRUZW1wbGF0ZShpZCwgaHRtbCkge1xuICAgIF90ZW1wbGF0ZU1hcFtpZF0gPSBodG1sO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U291cmNlRnJvbVRlbXBsYXRlTWFwKGlkKSB7XG4gICAgdmFyIHNvdXJjZSA9IF90ZW1wbGF0ZU1hcFtpZF07XG4gICAgaWYgKHNvdXJjZSkge1xuICAgICAgcmV0dXJuIGNsZWFuVGVtcGxhdGVIVE1MKHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNvdXJjZUZyb21IVE1MKGlkKSB7XG4gICAgdmFyIHNyYyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSxcbiAgICAgICAgc3JjaHRtbDtcblxuICAgIGlmIChzcmMpIHtcbiAgICAgIHNyY2h0bWwgPSBzcmMuaW5uZXJIVE1MO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4oJ251ZG9ydS9jb3JlL1RlbXBsYXRpbmcsIHRlbXBsYXRlIG5vdCBmb3VuZDogXCInICsgaWQgKyAnXCInKTtcbiAgICAgIHNyY2h0bWwgPSAnPGRpdj5UZW1wbGF0ZSBub3QgZm91bmQ6ICcgKyBpZCArICc8L2Rpdj4nO1xuICAgIH1cblxuICAgIHJldHVybiBjbGVhblRlbXBsYXRlSFRNTChzcmNodG1sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHRlbXBsYXRlIGh0bWwgZnJvbSB0aGUgc2NyaXB0IHRhZyB3aXRoIGlkXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFNvdXJjZShpZCkge1xuICAgIGlmIChfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gX3RlbXBsYXRlSFRNTENhY2hlW2lkXTtcbiAgICB9XG5cbiAgICB2YXIgc291cmNlaHRtbCA9IGdldFNvdXJjZUZyb21UZW1wbGF0ZU1hcChpZCk7XG5cbiAgICBpZiAoIXNvdXJjZWh0bWwpIHtcbiAgICAgIHNvdXJjZWh0bWwgPSBnZXRTb3VyY2VGcm9tSFRNTChpZCk7XG4gICAgfVxuXG4gICAgX3RlbXBsYXRlSFRNTENhY2hlW2lkXSA9IHNvdXJjZWh0bWw7XG4gICAgcmV0dXJuIHNvdXJjZWh0bWw7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgSURzIGJlbG9uZ2luZyB0byB0ZXh0L3RlbXBsYXRlIHR5cGUgc2NyaXB0IHRhZ3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0QWxsVGVtcGxhdGVJRHMoKSB7XG4gICAgdmFyIHNjcmlwdFRhZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JyksIDApO1xuXG4gICAgcmV0dXJuIHNjcmlwdFRhZ3MuZmlsdGVyKGZ1bmN0aW9uICh0YWcpIHtcbiAgICAgIHJldHVybiB0YWcuZ2V0QXR0cmlidXRlKCd0eXBlJykgPT09ICd0ZXh0L3RlbXBsYXRlJztcbiAgICB9KS5tYXAoZnVuY3Rpb24gKHRhZykge1xuICAgICAgcmV0dXJuIHRhZy5nZXRBdHRyaWJ1dGUoJ2lkJyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiB1bmRlcnNjb3JlIHRlbXBsYXRlXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFRlbXBsYXRlKGlkKSB7XG4gICAgaWYgKF90ZW1wbGF0ZUNhY2hlW2lkXSkge1xuICAgICAgcmV0dXJuIF90ZW1wbGF0ZUNhY2hlW2lkXTtcbiAgICB9XG4gICAgdmFyIHRlbXBsICAgICAgICAgID0gXy50ZW1wbGF0ZShnZXRTb3VyY2UoaWQpKTtcbiAgICBfdGVtcGxhdGVDYWNoZVtpZF0gPSB0ZW1wbDtcbiAgICByZXR1cm4gdGVtcGw7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSBhbmQgcmV0dXJucyBIVE1MXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYXNIVE1MKGlkLCBvYmopIHtcbiAgICB2YXIgdGVtcCA9IGdldFRlbXBsYXRlKGlkKTtcbiAgICByZXR1cm4gdGVtcChvYmopO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyB0aGUgdGVtcGxhdGUgYW5kIHJldHVybnMgYW4gSFRNTCBFbGVtZW50XG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYXNFbGVtZW50KGlkLCBvYmopIHtcbiAgICByZXR1cm4gX0RPTVV0aWxzLkhUTUxTdHJUb05vZGUoYXNIVE1MKGlkLCBvYmopKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbnMgdGVtcGxhdGUgSFRNTFxuICAgKi9cbiAgZnVuY3Rpb24gY2xlYW5UZW1wbGF0ZUhUTUwoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci50cmltKCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHJldHVybnMsIHNwYWNlcyBhbmQgdGFic1xuICAgKiBAcGFyYW0gc3RyXG4gICAqIEByZXR1cm5zIHtYTUx8c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlV2hpdGVTcGFjZShzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyhcXHJcXG58XFxufFxccnxcXHQpL2dtLCAnJykucmVwbGFjZSgvPlxccys8L2csICc+PCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBhbGwgdGVtcGxhdGVzLCBjbGVhbiB0aGVtIHVwIGFuZCBsb2dcbiAgICogVXRpbCBmb3IgU2hhcmVQb2ludCBwcm9qZWN0cywgPHNjcmlwdD4gYmxvY2tzIGFyZW4ndCBhbGxvd2VkXG4gICAqIFNvIHRoaXMgaGVscHMgY3JlYXRlIHRoZSBibG9ja3MgZm9yIGluc2VydGlvbiBpbiB0byB0aGUgRE9NXG4gICAqL1xuICBmdW5jdGlvbiBwcm9jZXNzRm9yRE9NSW5zZXJ0aW9uKCkge1xuICAgIHZhciBpZHMgPSBnZXRBbGxUZW1wbGF0ZUlEcygpO1xuICAgIGlkcy5mb3JFYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgdmFyIHNyYyA9IHJlbW92ZVdoaXRlU3BhY2UoZ2V0U291cmNlKGlkKSk7XG4gICAgICBjb25zb2xlLmxvZyhpZCwgc3JjKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSB0ZW1wbGF0ZSBzY3JpcHQgdGFnIHRvIHRoZSBET01cbiAgICogVXRpbCBmb3IgU2hhcmVQb2ludCBwcm9qZWN0cywgPHNjcmlwdD4gYmxvY2tzIGFyZW4ndCBhbGxvd2VkXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcGFyYW0gaHRtbFxuICAgKi9cbiAgLy9mdW5jdGlvbiBhZGRDbGllbnRTaWRlVGVtcGxhdGVUb0RPTShpZCwgaHRtbCkge1xuICAvLyAgdmFyIHMgICAgICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgLy8gIHMudHlwZSAgICAgID0gJ3RleHQvdGVtcGxhdGUnO1xuICAvLyAgcy5pZCAgICAgICAgPSBpZDtcbiAgLy8gIHMuaW5uZXJIVE1MID0gaHRtbDtcbiAgLy8gIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQocyk7XG4gIC8vfVxuXG4gIHJldHVybiB7XG4gICAgYWRkVGVtcGxhdGUgICAgICAgICAgIDogYWRkVGVtcGxhdGUsXG4gICAgZ2V0U291cmNlICAgICAgICAgICAgIDogZ2V0U291cmNlLFxuICAgIGdldEFsbFRlbXBsYXRlSURzICAgICA6IGdldEFsbFRlbXBsYXRlSURzLFxuICAgIHByb2Nlc3NGb3JET01JbnNlcnRpb246IHByb2Nlc3NGb3JET01JbnNlcnRpb24sXG4gICAgZ2V0VGVtcGxhdGUgICAgICAgICAgIDogZ2V0VGVtcGxhdGUsXG4gICAgYXNIVE1MICAgICAgICAgICAgICAgIDogYXNIVE1MLFxuICAgIGFzRWxlbWVudCAgICAgICAgICAgICA6IGFzRWxlbWVudFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRpbmcoKTsiLCJ2YXIgQXBwbGljYXRpb25WaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGhpcyxcbiAgICAgIF9kb21VdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0aWFsaXphdGlvblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZVxuICAgKiBAcGFyYW0gc2NhZmZvbGRUZW1wbGF0ZXMgdGVtcGxhdGUgSURzIHRvIGF0dGFjaGVkIHRvIHRoZSBib2R5IGZvciB0aGUgYXBwXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplQXBwbGljYXRpb25WaWV3KHNjYWZmb2xkVGVtcGxhdGVzKSB7XG4gICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgYXR0YWNoQXBwbGljYXRpb25TY2FmZm9sZGluZyhzY2FmZm9sZFRlbXBsYXRlcyk7XG4gIH1cblxuICAvKipcbiAgICogQXR0YWNoIGFwcCBIVE1MIHN0cnVjdHVyZVxuICAgKiBAcGFyYW0gdGVtcGxhdGVzXG4gICAqL1xuICBmdW5jdGlvbiBhdHRhY2hBcHBsaWNhdGlvblNjYWZmb2xkaW5nKHRlbXBsYXRlcykge1xuICAgIGlmICghdGVtcGxhdGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGJvZHlFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKTtcblxuICAgIHRlbXBsYXRlcy5mb3JFYWNoKGZ1bmN0aW9uICh0ZW1wbCkge1xuICAgICAgYm9keUVsLmFwcGVuZENoaWxkKF9kb21VdGlscy5IVE1MU3RyVG9Ob2RlKF90aGlzLnRlbXBsYXRlKCkuZ2V0U291cmNlKCd0ZW1wbGF0ZV9fJyArIHRlbXBsLCB7fSkpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZnRlciBhcHAgaW5pdGlhbGl6YXRpb24sIHJlbW92ZSB0aGUgbG9hZGluZyBtZXNzYWdlXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVMb2FkaW5nTWVzc2FnZSgpIHtcbiAgICB2YXIgY292ZXIgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbml0aWFsaXphdGlvbl9fY292ZXInKSxcbiAgICAgICAgbWVzc2FnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5pbml0aWFsaXphdGlvbl9fbWVzc2FnZScpO1xuXG4gICAgVHdlZW5MaXRlLnRvKGNvdmVyLCAxLCB7XG4gICAgICBhbHBoYTogMCwgZWFzZTogUXVhZC5lYXNlT3V0LCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdmVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY292ZXIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHdlZW5MaXRlLnRvKG1lc3NhZ2UsIDIsIHtcbiAgICAgIHRvcDogXCIrPTUwcHhcIiwgZWFzZTogUXVhZC5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY292ZXIucmVtb3ZlQ2hpbGQobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXc6IGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcsXG4gICAgcmVtb3ZlTG9hZGluZ01lc3NhZ2UgICAgIDogcmVtb3ZlTG9hZGluZ01lc3NhZ2VcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvblZpZXcoKTsiLCIvKipcbiAqIE1peGluIHZpZXcgdGhhdCBhbGxvd3MgZm9yIGNvbXBvbmVudCB2aWV3c1xuICovXG5cbnZhciBNaXhpbkNvbXBvbmVudFZpZXdzID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY29tcG9uZW50Vmlld01hcCAgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF9jb21wb25lbnRIVE1MVGVtcGxhdGVQcmVmaXggPSAndGVtcGxhdGVfXycsXG4gICAgICBfdGVtcGxhdGUgICAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHRlbXBsYXRlIG9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFRlbXBsYXRlKCkge1xuICAgIHJldHVybiBfdGVtcGxhdGU7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGEgY29tcG9uZW50IHRvIGEgbW91bnRpbmcgcG9pbnQuIElmIGEgc3RyaW5nIGlzIHBhc3NlZCxcbiAgICogdGhlIGNvcnJlY3Qgb2JqZWN0IHdpbGwgYmUgY3JlYXRlZCBmcm9tIHRoZSBmYWN0b3J5IG1ldGhvZCwgb3RoZXJ3aXNlLFxuICAgKiB0aGUgcGFzc2VkIGNvbXBvbmVudCBvYmplY3QgaXMgdXNlZC5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqIEBwYXJhbSBtb3VudFBvaW50XG4gICAqL1xuICBmdW5jdGlvbiBtYXBWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBjb21wb25lbnRJRG9yT2JqLCBtb3VudFBvaW50KSB7XG4gICAgdmFyIGNvbXBvbmVudE9iajtcblxuICAgIGlmICh0eXBlb2YgY29tcG9uZW50SURvck9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBjb21wb25lbnRGYWN0b3J5ID0gcmVxdWlyZShjb21wb25lbnRJRG9yT2JqKTtcbiAgICAgIGNvbXBvbmVudE9iaiAgICAgICAgID0gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRGYWN0b3J5KCkpKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudE9iaiA9IGNvbXBvbmVudElEb3JPYmo7XG4gICAgfVxuXG4gICAgX2NvbXBvbmVudFZpZXdNYXBbY29tcG9uZW50SURdID0ge1xuICAgICAgaHRtbFRlbXBsYXRlOiBfdGVtcGxhdGUuZ2V0VGVtcGxhdGUoX2NvbXBvbmVudEhUTUxUZW1wbGF0ZVByZWZpeCArIGNvbXBvbmVudElEKSxcbiAgICAgIGNvbnRyb2xsZXIgIDogY29tcG9uZW50T2JqLFxuICAgICAgbW91bnRQb2ludCAgOiBtb3VudFBvaW50XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGYWN0b3J5IHRvIGNyZWF0ZSBjb21wb25lbnQgdmlldyBtb2R1bGVzIGJ5IGNvbmNhdGluZyBtdWx0aXBsZSBzb3VyY2Ugb2JqZWN0c1xuICAgKiBAcGFyYW0gY29tcG9uZW50U291cmNlIEN1c3RvbSBtb2R1bGUgc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRTb3VyY2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbXBvbmVudFZpZXdGYWN0b3J5ICA9IHJlcXVpcmUoJy4vVmlld0NvbXBvbmVudC5qcycpLFxuICAgICAgICAgIGV2ZW50RGVsZWdhdG9yRmFjdG9yeSA9IHJlcXVpcmUoJy4vTWl4aW5FdmVudERlbGVnYXRvci5qcycpLFxuICAgICAgICAgIG9ic2VydmFibGVGYWN0b3J5ICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICAgICAgICBzaW1wbGVTdG9yZUZhY3RvcnkgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9TaW1wbGVTdG9yZS5qcycpLFxuICAgICAgICAgIGNvbXBvbmVudEFzc2VtYmx5LCBmaW5hbENvbXBvbmVudCwgcHJldmlvdXNJbml0aWFsaXplO1xuXG4gICAgICBjb21wb25lbnRBc3NlbWJseSA9IFtcbiAgICAgICAgY29tcG9uZW50Vmlld0ZhY3RvcnkoKSxcbiAgICAgICAgZXZlbnREZWxlZ2F0b3JGYWN0b3J5KCksXG4gICAgICAgIG9ic2VydmFibGVGYWN0b3J5KCksXG4gICAgICAgIHNpbXBsZVN0b3JlRmFjdG9yeSgpLFxuICAgICAgICBjb21wb25lbnRTb3VyY2VcbiAgICAgIF07XG5cbiAgICAgIGlmIChjb21wb25lbnRTb3VyY2UubWl4aW5zKSB7XG4gICAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gY29tcG9uZW50QXNzZW1ibHkuY29uY2F0KGNvbXBvbmVudFNvdXJjZS5taXhpbnMpO1xuICAgICAgfVxuXG4gICAgICBmaW5hbENvbXBvbmVudCA9IE5vcmkuYXNzaWduQXJyYXkoe30sIGNvbXBvbmVudEFzc2VtYmx5KTtcblxuICAgICAgLy8gQ29tcG9zZSBhIG5ldyBpbml0aWFsaXplIGZ1bmN0aW9uIGJ5IGluc2VydGluZyBjYWxsIHRvIGNvbXBvbmVudCBzdXBlciBtb2R1bGVcbiAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZSAgICAgICAgPSBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplO1xuICAgICAgZmluYWxDb21wb25lbnQuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIGluaXRpYWxpemUoaW5pdE9iaikge1xuICAgICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplQ29tcG9uZW50KGluaXRPYmopO1xuICAgICAgICBwcmV2aW91c0luaXRpYWxpemUuY2FsbChmaW5hbENvbXBvbmVudCwgaW5pdE9iaik7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gXy5hc3NpZ24oe30sIGZpbmFsQ29tcG9uZW50KTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgYSBtYXBwZWQgY29tcG9uZW50Vmlld1xuICAgKiBAcGFyYW0gY29tcG9uZW50SURcbiAgICogQHBhcmFtIGRhdGFPYmpcbiAgICovXG4gIGZ1bmN0aW9uIHNob3dWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBtb3VudFBvaW50KSB7XG4gICAgdmFyIGNvbXBvbmVudFZpZXcgPSBfY29tcG9uZW50Vmlld01hcFtjb21wb25lbnRJRF07XG4gICAgaWYgKCFjb21wb25lbnRWaWV3KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ05vIGNvbXBvbmVudFZpZXcgbWFwcGVkIGZvciBpZDogJyArIGNvbXBvbmVudElEKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWNvbXBvbmVudFZpZXcuY29udHJvbGxlci5pc0luaXRpYWxpemVkKCkpIHtcbiAgICAgIG1vdW50UG9pbnQgPSBtb3VudFBvaW50IHx8IGNvbXBvbmVudFZpZXcubW91bnRQb2ludDtcbiAgICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5pbml0aWFsaXplKHtcbiAgICAgICAgaWQgICAgICAgIDogY29tcG9uZW50SUQsXG4gICAgICAgIHRlbXBsYXRlICA6IGNvbXBvbmVudFZpZXcuaHRtbFRlbXBsYXRlLFxuICAgICAgICBtb3VudFBvaW50OiBtb3VudFBvaW50XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5jb21wb25lbnRSZW5kZXIoKTtcbiAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIubW91bnQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgY29weSBvZiB0aGUgbWFwIG9iamVjdCBmb3IgY29tcG9uZW50IHZpZXdzXG4gICAqIEByZXR1cm5zIHtudWxsfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29tcG9uZW50Vmlld01hcCgpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sIF9jb21wb25lbnRWaWV3TWFwKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGUgICAgICAgICAgIDogZ2V0VGVtcGxhdGUsXG4gICAgbWFwVmlld0NvbXBvbmVudCAgIDogbWFwVmlld0NvbXBvbmVudCxcbiAgICBjcmVhdGVDb21wb25lbnRWaWV3OiBjcmVhdGVDb21wb25lbnRWaWV3LFxuICAgIHNob3dWaWV3Q29tcG9uZW50ICA6IHNob3dWaWV3Q29tcG9uZW50LFxuICAgIGdldENvbXBvbmVudFZpZXdNYXA6IGdldENvbXBvbmVudFZpZXdNYXBcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkNvbXBvbmVudFZpZXdzKCk7IiwiLyoqXG4gKiBDb252ZW5pZW5jZSBtaXhpbiB0aGF0IG1ha2VzIGV2ZW50cyBlYXNpZXIgZm9yIHZpZXdzXG4gKlxuICogQmFzZWQgb24gQmFja2JvbmVcbiAqIFJldmlldyB0aGlzIGh0dHA6Ly9ibG9nLm1hcmlvbmV0dGVqcy5jb20vMjAxNS8wMi8xMi91bmRlcnN0YW5kaW5nLXRoZS1ldmVudC1oYXNoL2luZGV4Lmh0bWxcbiAqXG4gKiBFeGFtcGxlOlxuICogdGhpcy5zZXRFdmVudHMoe1xuICogICAgICAgICdjbGljayAjYnRuX21haW5fcHJvamVjdHMnOiBoYW5kbGVQcm9qZWN0c0J1dHRvbixcbiAqICAgICAgICAnY2xpY2sgI2J0bl9mb28sIGNsaWNrICNidG5fYmFyJzogaGFuZGxlRm9vQmFyQnV0dG9uc1xuICogICAgICB9KTtcbiAqIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAqXG4gKi9cblxudmFyIE1peGluRXZlbnREZWxlZ2F0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9ldmVudHNNYXAsXG4gICAgICBfZXZlbnRTdWJzY3JpYmVycyxcbiAgICAgIF9yeCA9IHJlcXVpcmUoJy4uL3V0aWxzL1J4Jyk7XG5cbiAgZnVuY3Rpb24gc2V0RXZlbnRzKGV2dE9iaikge1xuICAgIF9ldmVudHNNYXAgPSBldnRPYmo7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRFdmVudHMoKSB7XG4gICAgcmV0dXJuIF9ldmVudHNNYXA7XG4gIH1cblxuICAvKipcbiAgICogQXV0b21hdGVzIHNldHRpbmcgZXZlbnRzIG9uIERPTSBlbGVtZW50cy5cbiAgICogJ2V2dFN0ciBzZWxlY3Rvcic6Y2FsbGJhY2tcbiAgICogJ2V2dFN0ciBzZWxlY3RvciwgZXZ0U3RyIHNlbGVjdG9yJzogc2hhcmVkQ2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGRlbGVnYXRlRXZlbnRzKCkge1xuICAgIGlmICghX2V2ZW50c01hcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ldmVudFN1YnNjcmliZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAodmFyIGV2dFN0cmluZ3MgaW4gX2V2ZW50c01hcCkge1xuICAgICAgaWYgKF9ldmVudHNNYXAuaGFzT3duUHJvcGVydHkoZXZ0U3RyaW5ncykpIHtcblxuICAgICAgICB2YXIgbWFwcGluZ3MgICAgID0gZXZ0U3RyaW5ncy5zcGxpdCgnLCcpLFxuICAgICAgICAgICAgZXZlbnRIYW5kbGVyID0gX2V2ZW50c01hcFtldnRTdHJpbmdzXTtcblxuICAgICAgICBpZiAoIWlzLmZ1bmN0aW9uKGV2ZW50SGFuZGxlcikpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0V2ZW50RGVsZWdhdG9yLCBoYW5kbGVyIGZvciAnICsgZXZ0U3RyaW5ncyArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgICAgLy8gaHR0cHM6Ly9qc2xpbnRlcnJvcnMuY29tL2RvbnQtbWFrZS1mdW5jdGlvbnMtd2l0aGluLWEtbG9vcFxuICAgICAgICBtYXBwaW5ncy5mb3JFYWNoKGZ1bmN0aW9uIChldnRNYXApIHtcbiAgICAgICAgICBldnRNYXAgICAgICAgICAgICAgICAgICAgICAgICA9IGV2dE1hcC50cmltKCk7XG4gICAgICAgICAgdmFyIGV2ZW50U3RyICAgICAgICAgICAgICAgICAgPSBldnRNYXAuc3BsaXQoJyAnKVswXS50cmltKCksXG4gICAgICAgICAgICAgIHNlbGVjdG9yICAgICAgICAgICAgICAgICAgPSBldnRNYXAuc3BsaXQoJyAnKVsxXS50cmltKCk7XG4gICAgICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZ0U3RyaW5nc10gPSBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8qIGpzaGludCArVzA4MyAqL1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUhhbmRsZXIoc2VsZWN0b3IsIGV2ZW50U3RyLCBldmVudEhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3J4LmRvbShzZWxlY3RvciwgZXZlbnRTdHIpLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFubHkgcmVtb3ZlIGV2ZW50c1xuICAgKi9cbiAgZnVuY3Rpb24gdW5kZWxlZ2F0ZUV2ZW50cygpIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBldmVudCBpbiBfZXZlbnRTdWJzY3JpYmVycykge1xuICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZlbnRdLmRpc3Bvc2UoKTtcbiAgICAgIGRlbGV0ZSBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF07XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRFdmVudHMgICAgICAgOiBzZXRFdmVudHMsXG4gICAgZ2V0RXZlbnRzICAgICAgIDogZ2V0RXZlbnRzLFxuICAgIHVuZGVsZWdhdGVFdmVudHM6IHVuZGVsZWdhdGVFdmVudHMsXG4gICAgZGVsZWdhdGVFdmVudHMgIDogZGVsZWdhdGVFdmVudHNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkV2ZW50RGVsZWdhdG9yOyIsInZhciBNaXhpbk51ZG9ydUNvbnRyb2xzID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfbm90aWZpY2F0aW9uVmlldyAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9Ub2FzdFZpZXcuanMnKSxcbiAgICAgIF90b29sVGlwVmlldyAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzJyksXG4gICAgICBfbWVzc2FnZUJveFZpZXcgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Vmlldy5qcycpLFxuICAgICAgX21lc3NhZ2VCb3hDcmVhdG9yID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveENyZWF0b3IuanMnKSxcbiAgICAgIF9tb2RhbENvdmVyVmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01vZGFsQ292ZXJWaWV3LmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzKCkge1xuICAgIF90b29sVGlwVmlldy5pbml0aWFsaXplKCd0b29sdGlwX19jb250YWluZXInKTtcbiAgICBfbm90aWZpY2F0aW9uVmlldy5pbml0aWFsaXplKCd0b2FzdF9fY29udGFpbmVyJyk7XG4gICAgX21lc3NhZ2VCb3hWaWV3LmluaXRpYWxpemUoJ21lc3NhZ2Vib3hfX2NvbnRhaW5lcicpO1xuICAgIF9tb2RhbENvdmVyVmlldy5pbml0aWFsaXplKCk7XG4gIH1cblxuICBmdW5jdGlvbiBtYkNyZWF0b3IoKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Q3JlYXRvcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZE1lc3NhZ2VCb3gob2JqKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZU1lc3NhZ2VCb3goaWQpIHtcbiAgICBfbWVzc2FnZUJveFZpZXcucmVtb3ZlKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFsZXJ0KG1lc3NhZ2UsIHRpdGxlKSB7XG4gICAgcmV0dXJuIG1iQ3JlYXRvcigpLmFsZXJ0KHRpdGxlIHx8ICdBbGVydCcsIG1lc3NhZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTm90aWZpY2F0aW9uKG9iaikge1xuICAgIHJldHVybiBfbm90aWZpY2F0aW9uVmlldy5hZGQob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeShtZXNzYWdlLCB0aXRsZSwgdHlwZSkge1xuICAgIHJldHVybiBhZGROb3RpZmljYXRpb24oe1xuICAgICAgdGl0bGUgIDogdGl0bGUgfHwgJycsXG4gICAgICB0eXBlICAgOiB0eXBlIHx8IF9ub3RpZmljYXRpb25WaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplTnVkb3J1Q29udHJvbHM6IGluaXRpYWxpemVOdWRvcnVDb250cm9scyxcbiAgICBtYkNyZWF0b3IgICAgICAgICAgICAgICA6IG1iQ3JlYXRvcixcbiAgICBhZGRNZXNzYWdlQm94ICAgICAgICAgICA6IGFkZE1lc3NhZ2VCb3gsXG4gICAgcmVtb3ZlTWVzc2FnZUJveCAgICAgICAgOiByZW1vdmVNZXNzYWdlQm94LFxuICAgIGFkZE5vdGlmaWNhdGlvbiAgICAgICAgIDogYWRkTm90aWZpY2F0aW9uLFxuICAgIGFsZXJ0ICAgICAgICAgICAgICAgICAgIDogYWxlcnQsXG4gICAgbm90aWZ5ICAgICAgICAgICAgICAgICAgOiBub3RpZnlcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbk51ZG9ydUNvbnRyb2xzKCk7IiwiLyoqXG4gKiBNaXhpbiB2aWV3IHRoYXQgYWxsb3dzIGZvciBjb21wb25lbnQgdmlld3MgdG8gYmUgZGlzcGxheSBvbiBzdG9yZSBzdGF0ZSBjaGFuZ2VzXG4gKi9cblxudmFyIE1peGluU3RvcmVTdGF0ZVZpZXdzID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGhpcyxcbiAgICAgIF93YXRjaGVkU3RvcmUsXG4gICAgICBfY3VycmVudFZpZXdJRCxcbiAgICAgIF9jdXJyZW50U3RvcmVTdGF0ZSxcbiAgICAgIF9zdGF0ZVZpZXdNb3VudFBvaW50LFxuICAgICAgX3N0YXRlVmlld0lETWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvKipcbiAgICogU2V0IHVwIGxpc3RlbmVyc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVN0YXRlVmlld3Moc3RvcmUpIHtcbiAgICBfdGhpcyA9IHRoaXM7IC8vIG1pdGlnYXRpb24sIER1ZSB0byBldmVudHMsIHNjb3BlIG1heSBiZSBzZXQgdG8gdGhlIHdpbmRvdyBvYmplY3RcbiAgICBfd2F0Y2hlZFN0b3JlID0gc3RvcmU7XG5cbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3ZpZXdDaGFuZ2UnKTtcblxuICAgIF93YXRjaGVkU3RvcmUuc3Vic2NyaWJlKGZ1bmN0aW9uIG9uU3RhdGVDaGFuZ2UoKSB7XG4gICAgICBoYW5kbGVTdGF0ZUNoYW5nZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgcm91dGUgZnJvbSBVUkwgaGFzaCBvbiBjaGFuZ2VcbiAgICogQHBhcmFtIHJvdXRlT2JqXG4gICAqL1xuICBmdW5jdGlvbiBoYW5kbGVTdGF0ZUNoYW5nZSgpIHtcbiAgICBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlKCkge1xuICAgIHZhciBzdGF0ZSA9IF93YXRjaGVkU3RvcmUuZ2V0U3RhdGUoKS5jdXJyZW50U3RhdGU7XG4gICAgaWYgKHN0YXRlKSB7XG4gICAgICBpZiAoc3RhdGUgIT09IF9jdXJyZW50U3RvcmVTdGF0ZSkge1xuICAgICAgICBfY3VycmVudFN0b3JlU3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgc2hvd1N0YXRlVmlld0NvbXBvbmVudC5iaW5kKF90aGlzKShfY3VycmVudFN0b3JlU3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGxvY2F0aW9uIGZvciB0aGUgdmlldyB0byBtb3VudCBvbiByb3V0ZSBjaGFuZ2VzLCBhbnkgY29udGVudHMgd2lsbFxuICAgKiBiZSByZW1vdmVkIHByaW9yXG4gICAqIEBwYXJhbSBlbElEXG4gICAqL1xuICBmdW5jdGlvbiBzZXRWaWV3TW91bnRQb2ludChlbElEKSB7XG4gICAgX3N0YXRlVmlld01vdW50UG9pbnQgPSBlbElEO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Vmlld01vdW50UG9pbnQoKSB7XG4gICAgcmV0dXJuIF9zdGF0ZVZpZXdNb3VudFBvaW50O1xuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBhIHJvdXRlIHRvIGEgbW9kdWxlIHZpZXcgY29udHJvbGxlclxuICAgKiBAcGFyYW0gdGVtcGxhdGVJRFxuICAgKiBAcGFyYW0gY29tcG9uZW50SURvck9ialxuICAgKi9cbiAgZnVuY3Rpb24gbWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoc3RhdGUsIHRlbXBsYXRlSUQsIGNvbXBvbmVudElEb3JPYmopIHtcbiAgICBfc3RhdGVWaWV3SURNYXBbc3RhdGVdID0gdGVtcGxhdGVJRDtcbiAgICB0aGlzLm1hcFZpZXdDb21wb25lbnQodGVtcGxhdGVJRCwgY29tcG9uZW50SURvck9iaiwgX3N0YXRlVmlld01vdW50UG9pbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgYSB2aWV3IChpbiByZXNwb25zZSB0byBhIHJvdXRlIGNoYW5nZSlcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqL1xuICBmdW5jdGlvbiBzaG93U3RhdGVWaWV3Q29tcG9uZW50KHN0YXRlKSB7XG4gICAgdmFyIGNvbXBvbmVudElEID0gX3N0YXRlVmlld0lETWFwW3N0YXRlXTtcbiAgICBpZiAoIWNvbXBvbmVudElEKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJObyB2aWV3IG1hcHBlZCBmb3Igcm91dGU6IFwiICsgc3RhdGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJlbW92ZUN1cnJlbnRWaWV3KCk7XG5cbiAgICBfY3VycmVudFZpZXdJRCA9IGNvbXBvbmVudElEO1xuICAgIHRoaXMuc2hvd1ZpZXdDb21wb25lbnQoX2N1cnJlbnRWaWV3SUQpO1xuXG4gICAgLy8gVHJhbnNpdGlvbiBuZXcgdmlldyBpblxuICAgIFR3ZWVuTGl0ZS5zZXQoX3N0YXRlVmlld01vdW50UG9pbnQsIHthbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfc3RhdGVWaWV3TW91bnRQb2ludCwgMC4yNSwge2FscGhhOiAxLCBlYXNlOiBRdWFkLmVhc2VJbn0pO1xuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd2aWV3Q2hhbmdlJywgY29tcG9uZW50SUQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgY3VycmVudGx5IGRpc3BsYXllZCB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVDdXJyZW50VmlldygpIHtcbiAgICBpZiAoX2N1cnJlbnRWaWV3SUQpIHtcbiAgICAgIF90aGlzLmdldENvbXBvbmVudFZpZXdNYXAoKVtfY3VycmVudFZpZXdJRF0uY29udHJvbGxlci51bm1vdW50KCk7XG4gICAgfVxuICAgIF9jdXJyZW50Vmlld0lEID0gJyc7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVTdGF0ZVZpZXdzICAgICAgICA6IGluaXRpYWxpemVTdGF0ZVZpZXdzLFxuICAgIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGU6IHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUsXG4gICAgc2hvd1N0YXRlVmlld0NvbXBvbmVudCAgICAgIDogc2hvd1N0YXRlVmlld0NvbXBvbmVudCxcbiAgICBzZXRWaWV3TW91bnRQb2ludCAgICAgICAgICAgOiBzZXRWaWV3TW91bnRQb2ludCxcbiAgICBnZXRWaWV3TW91bnRQb2ludCAgICAgICAgICAgOiBnZXRWaWV3TW91bnRQb2ludCxcbiAgICBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudCAgICAgOiBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluU3RvcmVTdGF0ZVZpZXdzKCk7IiwiLyoqXG4gKiBCYXNlIG1vZHVsZSBmb3IgY29tcG9uZW50c1xuICogTXVzdCBiZSBleHRlbmRlZCB3aXRoIGN1c3RvbSBtb2R1bGVzXG4gKi9cblxudmFyIFZpZXdDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9pc0luaXRpYWxpemVkID0gZmFsc2UsXG4gICAgICBfY29uZmlnUHJvcHMsXG4gICAgICBfaWQsXG4gICAgICBfdGVtcGxhdGVPYmosXG4gICAgICBfaHRtbCxcbiAgICAgIF9ET01FbGVtZW50LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfY2hpbGRyZW4gICAgICA9IFtdLFxuICAgICAgX2lzTW91bnRlZCAgICAgPSBmYWxzZSxcbiAgICAgIF9yZW5kZXJlciAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvUmVuZGVyZXInKTtcblxuICAvKipcbiAgICogSW5pdGlhbGl6YXRpb25cbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplQ29tcG9uZW50KGNvbmZpZ1Byb3BzKSB7XG4gICAgX2NvbmZpZ1Byb3BzID0gY29uZmlnUHJvcHM7XG4gICAgX2lkICAgICAgICAgID0gY29uZmlnUHJvcHMuaWQ7XG4gICAgX3RlbXBsYXRlT2JqID0gY29uZmlnUHJvcHMudGVtcGxhdGU7XG4gICAgX21vdW50UG9pbnQgID0gY29uZmlnUHJvcHMubW91bnRQb2ludDtcblxuICAgIHRoaXMuc2V0U3RhdGUodGhpcy5nZXRJbml0aWFsU3RhdGUoKSk7XG4gICAgdGhpcy5zZXRFdmVudHModGhpcy5kZWZpbmVFdmVudHMoKSk7XG5cbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3VwZGF0ZScpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgnbW91bnQnKTtcbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3VubW91bnQnKTtcblxuICAgIF9pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZmluZUV2ZW50cygpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEJpbmQgdXBkYXRlcyB0byB0aGUgbWFwIElEIHRvIHRoaXMgdmlldydzIHVwZGF0ZVxuICAgKiBAcGFyYW0gbWFwSURvck9iaiBPYmplY3QgdG8gc3Vic2NyaWJlIHRvIG9yIElELiBTaG91bGQgaW1wbGVtZW50IG5vcmkvc3RvcmUvTWl4aW5PYnNlcnZhYmxlU3RvcmVcbiAgICovXG4gIGZ1bmN0aW9uIGJpbmRNYXAobWFwSURvck9iaikge1xuICAgIHZhciBtYXA7XG5cbiAgICBpZiAoaXMub2JqZWN0KG1hcElEb3JPYmopKSB7XG4gICAgICBtYXAgPSBtYXBJRG9yT2JqO1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXAgPSBOb3JpLnN0b3JlKCkuZ2V0TWFwKG1hcElEb3JPYmopIHx8IE5vcmkuc3RvcmUoKS5nZXRNYXBDb2xsZWN0aW9uKG1hcElEb3JPYmopO1xuICAgIH1cblxuICAgIGlmICghbWFwKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1ZpZXdDb21wb25lbnQgYmluZE1hcCwgbWFwIG9yIG1hcGNvbGxlY3Rpb24gbm90IGZvdW5kOiAnICsgbWFwSURvck9iaik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFpcy5mdW5jdGlvbihtYXAuc3Vic2NyaWJlKSkge1xuICAgICAgY29uc29sZS53YXJuKCdWaWV3Q29tcG9uZW50IGJpbmRNYXAsIG1hcCBvciBtYXBjb2xsZWN0aW9uIG11c3QgYmUgb2JzZXJ2YWJsZTogJyArIG1hcElEb3JPYmopO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG1hcC5zdWJzY3JpYmUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgY2hpbGRcbiAgICogQHBhcmFtIGNoaWxkXG4gICAqL1xuICAvL2Z1bmN0aW9uIGFkZENoaWxkKGNoaWxkKSB7XG4gIC8vICBfY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBjaGlsZFxuICAgKiBAcGFyYW0gY2hpbGRcbiAgICovXG4gIC8vZnVuY3Rpb24gcmVtb3ZlQ2hpbGQoY2hpbGQpIHtcbiAgLy8gIHZhciBpZHggPSBfY2hpbGRyZW4uaW5kZXhPZihjaGlsZCk7XG4gIC8vICBfY2hpbGRyZW5baWR4XS51bm1vdW50KCk7XG4gIC8vICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBCZWZvcmUgdGhlIHZpZXcgdXBkYXRlcyBhbmQgYSByZXJlbmRlciBvY2N1cnNcbiAgICogUmV0dXJucyBuZXh0U3RhdGUgb2YgY29tcG9uZW50XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnRXaWxsVXBkYXRlKCkge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIGN1cnJlbnRTdGF0ZSA9IHRoaXMuZ2V0U3RhdGUoKTtcbiAgICB2YXIgbmV4dFN0YXRlICAgID0gdGhpcy5jb21wb25lbnRXaWxsVXBkYXRlKCk7XG5cbiAgICBpZiAodGhpcy5zaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSkge1xuICAgICAgdGhpcy5zZXRTdGF0ZShuZXh0U3RhdGUpO1xuICAgICAgLy9fY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiB1cGRhdGVDaGlsZChjaGlsZCkge1xuICAgICAgLy8gIGNoaWxkLnVwZGF0ZSgpO1xuICAgICAgLy99KTtcblxuICAgICAgaWYgKF9pc01vdW50ZWQpIHtcbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkQ29tcG9uZW50UmVuZGVyKGN1cnJlbnRTdGF0ZSkpIHtcbiAgICAgICAgICB0aGlzLnVubW91bnQoKTtcbiAgICAgICAgICB0aGlzLmNvbXBvbmVudFJlbmRlcigpO1xuICAgICAgICAgIHRoaXMubW91bnQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1cGRhdGUnLCB0aGlzLmdldElEKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wYXJlIGN1cnJlbnQgc3RhdGUgYW5kIG5leHQgc3RhdGUgdG8gZGV0ZXJtaW5lIGlmIHVwZGF0aW5nIHNob3VsZCBvY2N1clxuICAgKiBAcGFyYW0gbmV4dFN0YXRlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvdWxkQ29tcG9uZW50VXBkYXRlKG5leHRTdGF0ZSkge1xuICAgIHJldHVybiBpcy5leGlzdHkobmV4dFN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaXQsIG5lZWQgdG8gYWRkIGl0IHRvIGEgcGFyZW50IGNvbnRhaW5lciwgaGFuZGxlZCBpbiBoaWdoZXIgbGV2ZWwgdmlld1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFJlbmRlcigpIHtcbiAgICAvL19jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIHJlbmRlckNoaWxkKGNoaWxkKSB7XG4gICAgLy8gIGNoaWxkLmNvbXBvbmVudFJlbmRlcigpO1xuICAgIC8vfSk7XG5cbiAgICBfaHRtbCA9IHRoaXMucmVuZGVyKHRoaXMuZ2V0U3RhdGUoKSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBNYXkgYmUgb3ZlcnJpZGRlbiBpbiBhIHN1Ym1vZHVsZSBmb3IgY3VzdG9tIHJlbmRlcmluZ1xuICAgKiBTaG91bGQgcmV0dXJuIEhUTUxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiByZW5kZXIoc3RhdGUpIHtcbiAgICByZXR1cm4gX3RlbXBsYXRlT2JqKHN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmQgaXQgdG8gYSBwYXJlbnQgZWxlbWVudFxuICAgKiBAcGFyYW0gbW91bnRFbFxuICAgKi9cbiAgZnVuY3Rpb24gbW91bnQoKSB7XG4gICAgaWYgKCFfaHRtbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb25lbnQgJyArIF9pZCArICcgY2Fubm90IG1vdW50IHdpdGggbm8gSFRNTC4gQ2FsbCByZW5kZXIoKSBmaXJzdD8nKTtcbiAgICB9XG5cbiAgICBfaXNNb3VudGVkID0gdHJ1ZTtcblxuICAgIF9ET01FbGVtZW50ID0gKF9yZW5kZXJlci5yZW5kZXIoe1xuICAgICAgdGFyZ2V0OiBfbW91bnRQb2ludCxcbiAgICAgIGh0bWwgIDogX2h0bWxcbiAgICB9KSk7XG5cbiAgICBpZiAodGhpcy5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50KSB7XG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdtb3VudCcsIHRoaXMuZ2V0SUQoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCBhZnRlciBpdCdzIGJlZW4gYWRkZWQgdG8gYSB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAvLyBzdHViXG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB3aGVuIHVubG9hZGluZ1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgZnVuY3Rpb24gdW5tb3VudCgpIHtcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KCk7XG4gICAgX2lzTW91bnRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMudW5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgfVxuXG4gICAgX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiAnJ1xuICAgIH0pO1xuXG4gICAgX2h0bWwgICAgICAgPSAnJztcbiAgICBfRE9NRWxlbWVudCA9IG51bGw7XG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1bm1vdW50JywgdGhpcy5nZXRJRCgpKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGlzSW5pdGlhbGl6ZWQoKSB7XG4gICAgcmV0dXJuIF9pc0luaXRpYWxpemVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnUHJvcHMoKSB7XG4gICAgcmV0dXJuIF9jb25maWdQcm9wcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTW91bnRlZCgpIHtcbiAgICByZXR1cm4gX2lzTW91bnRlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcbiAgICB0aGlzLnNldFN0YXRlKHt9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElEKCkge1xuICAgIHJldHVybiBfaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRET01FbGVtZW50KCkge1xuICAgIHJldHVybiBfRE9NRWxlbWVudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRlbXBsYXRlKCkge1xuICAgIHJldHVybiBfdGVtcGxhdGVPYmo7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUZW1wbGF0ZShodG1sKSB7XG4gICAgX3RlbXBsYXRlT2JqID0gXy50ZW1wbGF0ZShodG1sKTtcbiAgfVxuXG4gIC8vZnVuY3Rpb24gZ2V0Q2hpbGRyZW4oKSB7XG4gIC8vICByZXR1cm4gX2NoaWxkcmVuLnNsaWNlKDApO1xuICAvL31cblxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZUNvbXBvbmVudDogaW5pdGlhbGl6ZUNvbXBvbmVudCxcbiAgICBkZWZpbmVFdmVudHMgICAgICAgOiBkZWZpbmVFdmVudHMsXG4gICAgaXNJbml0aWFsaXplZCAgICAgIDogaXNJbml0aWFsaXplZCxcbiAgICBnZXRDb25maWdQcm9wcyAgICAgOiBnZXRDb25maWdQcm9wcyxcbiAgICBnZXRJbml0aWFsU3RhdGUgICAgOiBnZXRJbml0aWFsU3RhdGUsXG4gICAgZ2V0SUQgICAgICAgICAgICAgIDogZ2V0SUQsXG4gICAgZ2V0VGVtcGxhdGUgICAgICAgIDogZ2V0VGVtcGxhdGUsXG4gICAgc2V0VGVtcGxhdGUgICAgICAgIDogc2V0VGVtcGxhdGUsXG4gICAgZ2V0RE9NRWxlbWVudCAgICAgIDogZ2V0RE9NRWxlbWVudCxcbiAgICBpc01vdW50ZWQgICAgICAgICAgOiBpc01vdW50ZWQsXG5cbiAgICBiaW5kTWFwOiBiaW5kTWFwLFxuXG4gICAgY29tcG9uZW50V2lsbFVwZGF0ZSAgOiBjb21wb25lbnRXaWxsVXBkYXRlLFxuICAgIHNob3VsZENvbXBvbmVudFVwZGF0ZTogc2hvdWxkQ29tcG9uZW50VXBkYXRlLFxuICAgIHVwZGF0ZSAgICAgICAgICAgICAgIDogdXBkYXRlLFxuXG4gICAgY29tcG9uZW50UmVuZGVyOiBjb21wb25lbnRSZW5kZXIsXG4gICAgcmVuZGVyICAgICAgICAgOiByZW5kZXIsXG5cbiAgICBtb3VudCAgICAgICAgICAgIDogbW91bnQsXG4gICAgY29tcG9uZW50RGlkTW91bnQ6IGNvbXBvbmVudERpZE1vdW50LFxuXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGNvbXBvbmVudFdpbGxVbm1vdW50LFxuICAgIHVubW91bnQgICAgICAgICAgICAgOiB1bm1vdW50XG5cbiAgICAvL2FkZENoaWxkICAgOiBhZGRDaGlsZCxcbiAgICAvL3JlbW92ZUNoaWxkOiByZW1vdmVDaGlsZCxcbiAgICAvL2dldENoaWxkcmVuOiBnZXRDaGlsZHJlblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXdDb21wb25lbnQ7IiwidmFyIGJyb3dzZXJJbmZvID0ge1xuXG4gIGFwcFZlcnNpb24gOiBuYXZpZ2F0b3IuYXBwVmVyc2lvbixcbiAgdXNlckFnZW50ICA6IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gIGlzSUUgICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1TSUUgXCIpLFxuICBpc0lFNiAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgNlwiKSxcbiAgaXNJRTcgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDdcIiksXG4gIGlzSUU4ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA4XCIpLFxuICBpc0lFOSAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgOVwiKSxcbiAgaXNGRiAgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiRmlyZWZveC9cIiksXG4gIGlzQ2hyb21lICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkNocm9tZS9cIiksXG4gIGlzTWFjICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY2ludG9zaCxcIiksXG4gIGlzTWFjU2FmYXJpOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIlNhZmFyaVwiKSAmJiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY1wiKSAmJiAtMSA9PT0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiQ2hyb21lXCIpLFxuXG4gIGhhc1RvdWNoICAgIDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBub3RTdXBwb3J0ZWQ6ICh0aGlzLmlzSUU2IHx8IHRoaXMuaXNJRTcgfHwgdGhpcy5pc0lFOCB8fCB0aGlzLmlzSUU5KSxcblxuICBtb2JpbGU6IHtcbiAgICBBbmRyb2lkICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQW5kcm9pZC9pKTtcbiAgICB9LFxuICAgIEJsYWNrQmVycnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CbGFja0JlcnJ5L2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JCMTA7IFRvdWNoLyk7XG4gICAgfSxcbiAgICBpT1MgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lfGlQYWR8aVBvZC9pKTtcbiAgICB9LFxuICAgIE9wZXJhICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9PcGVyYSBNaW5pL2kpO1xuICAgIH0sXG4gICAgV2luZG93cyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0lFTW9iaWxlL2kpO1xuICAgIH0sXG4gICAgYW55ICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICh0aGlzLkFuZHJvaWQoKSB8fCB0aGlzLkJsYWNrQmVycnkoKSB8fCB0aGlzLmlPUygpIHx8IHRoaXMuT3BlcmEoKSB8fCB0aGlzLldpbmRvd3MoKSkgIT09IG51bGw7XG4gICAgfVxuXG4gIH0sXG5cbiAgLy8gVE9ETyBmaWx0ZXIgZm9yIElFID4gOVxuICBlbmhhbmNlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhX2Jyb3dzZXJJbmZvLmlzSUUgJiYgIV9icm93c2VySW5mby5tb2JpbGUuYW55KCk7XG4gIH0sXG5cbiAgbW91c2VEb3duRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiO1xuICB9LFxuXG4gIG1vdXNlVXBFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIjtcbiAgfSxcblxuICBtb3VzZUNsaWNrRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaGVuZFwiIDogXCJjbGlja1wiO1xuICB9LFxuXG4gIG1vdXNlTW92ZUV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYnJvd3NlckluZm87IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjM5OTkvaG93LXRvLXRlbGwtaWYtYS1kb20tZWxlbWVudC1pcy12aXNpYmxlLWluLXRoZS1jdXJyZW50LXZpZXdwb3J0XG4gIC8vIGVsZW1lbnQgbXVzdCBiZSBlbnRpcmVseSBvbiBzY3JlZW5cbiAgaXNFbGVtZW50RW50aXJlbHlJblZpZXdwb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiAoXG4gICAgICByZWN0LnRvcCA+PSAwICYmXG4gICAgICByZWN0LmxlZnQgPj0gMCAmJlxuICAgICAgcmVjdC5ib3R0b20gPD0gKHdpbmRvdy5pbm5lckhlaWdodCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSAmJlxuICAgICAgcmVjdC5yaWdodCA8PSAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKVxuICAgICk7XG4gIH0sXG5cbiAgLy8gZWxlbWVudCBtYXkgYmUgcGFydGlhbHkgb24gc2NyZWVuXG4gIGlzRWxlbWVudEluVmlld3BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIHJlY3QuYm90dG9tID4gMCAmJlxuICAgICAgcmVjdC5yaWdodCA+IDAgJiZcbiAgICAgIHJlY3QubGVmdCA8ICh3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpICYmXG4gICAgICByZWN0LnRvcCA8ICh3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCk7XG4gIH0sXG5cbiAgaXNEb21PYmo6IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gISEob2JqLm5vZGVUeXBlIHx8IChvYmogPT09IHdpbmRvdykpO1xuICB9LFxuXG4gIHBvc2l0aW9uOiBmdW5jdGlvbiAoZWwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGVmdDogZWwub2Zmc2V0TGVmdCxcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcFxuICAgIH07XG4gIH0sXG5cbiAgLy8gZnJvbSBodHRwOi8vanNwZXJmLmNvbS9qcXVlcnktb2Zmc2V0LXZzLW9mZnNldHBhcmVudC1sb29wXG4gIG9mZnNldDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIG9sID0gMCxcbiAgICAgICAgb3QgPSAwO1xuICAgIGlmIChlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICAgIGRvIHtcbiAgICAgICAgb2wgKz0gZWwub2Zmc2V0TGVmdDtcbiAgICAgICAgb3QgKz0gZWwub2Zmc2V0VG9wO1xuICAgICAgfSB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IG9sLFxuICAgICAgdG9wIDogb3RcbiAgICB9O1xuICB9LFxuXG4gIHJlbW92ZUFsbEVsZW1lbnRzOiBmdW5jdGlvbiAoZWwpIHtcbiAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgfVxuICB9LFxuXG4gIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80OTQxNDMvY3JlYXRpbmctYS1uZXctZG9tLWVsZW1lbnQtZnJvbS1hbi1odG1sLXN0cmluZy11c2luZy1idWlsdC1pbi1kb20tbWV0aG9kcy1vci1wcm9cbiAgSFRNTFN0clRvTm9kZTogZnVuY3Rpb24gKHN0cikge1xuICAgIHZhciB0ZW1wICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHI7XG4gICAgcmV0dXJuIHRlbXAuZmlyc3RDaGlsZDtcbiAgfSxcblxuICB3cmFwRWxlbWVudDogZnVuY3Rpb24gKHdyYXBwZXJTdHIsIGVsKSB7XG4gICAgdmFyIHdyYXBwZXJFbCA9IHRoaXMuSFRNTFN0clRvTm9kZSh3cmFwcGVyU3RyKSxcbiAgICAgICAgZWxQYXJlbnQgID0gZWwucGFyZW50Tm9kZTtcblxuICAgIHdyYXBwZXJFbC5hcHBlbmRDaGlsZChlbCk7XG4gICAgZWxQYXJlbnQuYXBwZW5kQ2hpbGQod3JhcHBlckVsKTtcbiAgICByZXR1cm4gd3JhcHBlckVsO1xuICB9LFxuXG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTUzMjkxNjcvY2xvc2VzdC1hbmNlc3Rvci1tYXRjaGluZy1zZWxlY3Rvci11c2luZy1uYXRpdmUtZG9tXG4gIGNsb3Nlc3Q6IGZ1bmN0aW9uIChlbCwgc2VsZWN0b3IpIHtcbiAgICB2YXIgbWF0Y2hlc1NlbGVjdG9yID0gZWwubWF0Y2hlcyB8fCBlbC53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHwgZWwubW96TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLm1zTWF0Y2hlc1NlbGVjdG9yO1xuICAgIHdoaWxlIChlbCkge1xuICAgICAgaWYgKG1hdGNoZXNTZWxlY3Rvci5iaW5kKGVsKShzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnRFbGVtZW50O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLy8gZnJvbSB5b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tXG4gIGhhc0NsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIGFkZENsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9XG4gIH0sXG5cbiAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH1cbiAgfSxcblxuICB0b2dnbGVDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gRnJvbSBpbXByZXNzLmpzXG4gIGFwcGx5Q1NTOiBmdW5jdGlvbiAoZWwsIHByb3BzKSB7XG4gICAgdmFyIGtleSwgcGtleTtcbiAgICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgZWwuc3R5bGVba2V5XSA9IHByb3BzW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbDtcbiAgfSxcblxuICAvLyBmcm9tIGltcHJlc3MuanNcbiAgLy8gYGNvbXB1dGVXaW5kb3dTY2FsZWAgY291bnRzIHRoZSBzY2FsZSBmYWN0b3IgYmV0d2VlbiB3aW5kb3cgc2l6ZSBhbmQgc2l6ZVxuICAvLyBkZWZpbmVkIGZvciB0aGUgcHJlc2VudGF0aW9uIGluIHRoZSBjb25maWcuXG4gIGNvbXB1dGVXaW5kb3dTY2FsZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgIHZhciBoU2NhbGUgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLyBjb25maWcuaGVpZ2h0LFxuICAgICAgICB3U2NhbGUgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIGNvbmZpZy53aWR0aCxcbiAgICAgICAgc2NhbGUgID0gaFNjYWxlID4gd1NjYWxlID8gd1NjYWxlIDogaFNjYWxlO1xuXG4gICAgaWYgKGNvbmZpZy5tYXhTY2FsZSAmJiBzY2FsZSA+IGNvbmZpZy5tYXhTY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWF4U2NhbGU7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5taW5TY2FsZSAmJiBzY2FsZSA8IGNvbmZpZy5taW5TY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWluU2NhbGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYW4gYXJyYXkgb2YgZWxlbWVudHMgaW4gdGhlIGNvbnRhaW5lciByZXR1cm5lZCBhcyBBcnJheSBpbnN0ZWFkIG9mIGEgTm9kZSBsaXN0XG4gICAqL1xuICBnZXRRU0VsZW1lbnRzQXNBcnJheTogZnVuY3Rpb24gKGVsLCBjbHMpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbChjbHMpLCAwKTtcbiAgfSxcblxuICBjZW50ZXJFbGVtZW50SW5WaWV3UG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHZwSCA9IHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgdnBXID0gd2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgIGVsUiA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICBlbEggPSBlbFIuaGVpZ2h0LFxuICAgICAgICBlbFcgPSBlbFIud2lkdGg7XG5cbiAgICBlbC5zdHlsZS5sZWZ0ID0gKHZwVyAvIDIpIC0gKGVsVyAvIDIpICsgJ3B4JztcbiAgICBlbC5zdHlsZS50b3AgID0gKHZwSCAvIDIpIC0gKGVsSCAvIDIpICsgJ3B4JztcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvYmplY3QgZnJvbSB0aGUgbmFtZSAob3IgaWQpIGF0dHJpYnMgYW5kIGRhdGEgb2YgYSBmb3JtXG4gICAqIEBwYXJhbSBlbFxuICAgKiBAcmV0dXJucyB7bnVsbH1cbiAgICovXG4gIGNhcHR1cmVGb3JtRGF0YTogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIGRhdGFPYmogPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgICB0ZXh0YXJlYUVscywgaW5wdXRFbHMsIHNlbGVjdEVscztcblxuICAgIHRleHRhcmVhRWxzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgndGV4dGFyZWEnKSwgMCk7XG4gICAgaW5wdXRFbHMgICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCcpLCAwKTtcbiAgICBzZWxlY3RFbHMgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NlbGVjdCcpLCAwKTtcblxuICAgIHRleHRhcmVhRWxzLmZvckVhY2goZ2V0SW5wdXRGb3JtRGF0YSk7XG4gICAgaW5wdXRFbHMuZm9yRWFjaChnZXRJbnB1dEZvcm1EYXRhKTtcbiAgICBzZWxlY3RFbHMuZm9yRWFjaChnZXRTZWxlY3RGb3JtRGF0YSk7XG5cbiAgICByZXR1cm4gZGF0YU9iajtcblxuICAgIGZ1bmN0aW9uIGdldElucHV0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSBmb3JtRWwudmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICB2YXIgc2VsID0gZm9ybUVsLnNlbGVjdGVkSW5kZXgsIHZhbCA9ICcnO1xuICAgICAgaWYgKHNlbCA+PSAwKSB7XG4gICAgICAgIHZhbCA9IGZvcm1FbC5vcHRpb25zW3NlbF0udmFsdWU7XG4gICAgICB9XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RWxOYW1lT3JJRChmb3JtRWwpIHtcbiAgICAgIHZhciBuYW1lID0gJ25vX25hbWUnO1xuICAgICAgaWYgKGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgICAgICBuYW1lID0gZm9ybUVsLmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgfSBlbHNlIGlmIChmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpKSB7XG4gICAgICAgIG5hbWUgPSBmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuICB9XG5cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBzaGFyZWQgM2QgcGVyc3BlY3RpdmUgZm9yIGFsbCBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5M0RUb0NvbnRhaW5lcjogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHBlcnNwZWN0aXZlICAgICAgOiA4MDAsXG4gICAgICAgIHBlcnNwZWN0aXZlT3JpZ2luOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbHkgYmFzaWMgQ1NTIHByb3BzXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHkzRFRvRWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHRyYW5zZm9ybVN0eWxlICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgIHRyYW5zZm9ybU9yaWdpbiAgIDogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGx5IGJhc2ljIDNkIHByb3BzIGFuZCBzZXQgdW5pcXVlIHBlcnNwZWN0aXZlIGZvciBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5VW5pcXVlM0RUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB0cmFuc2Zvcm1TdHlsZSAgICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHkgIDogXCJoaWRkZW5cIixcbiAgICAgICAgdHJhbnNmb3JtUGVyc3BlY3RpdmU6IDYwMCxcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luICAgICA6ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbn07XG4iLCJ2YXIgTWVzc2FnZUJveENyZWF0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tZXNzYWdlQm94VmlldyA9IHJlcXVpcmUoJy4vTWVzc2FnZUJveFZpZXcnKTtcblxuICBmdW5jdGlvbiBhbGVydCh0aXRsZSwgbWVzc2FnZSwgbW9kYWwsIGNiKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHA+JyArIG1lc3NhZ2UgKyAnPC9wPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRBTkdFUixcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ0Nsb3NlJyxcbiAgICAgICAgICBpZCAgICAgOiAnQ2xvc2UnLFxuICAgICAgICAgIHR5cGUgICA6ICcnLFxuICAgICAgICAgIGljb24gICA6ICd0aW1lcycsXG4gICAgICAgICAgb25DbGljazogY2JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlybSh0aXRsZSwgbWVzc2FnZSwgb2tDQiwgbW9kYWwpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cD4nICsgbWVzc2FnZSArICc8L3A+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ1Byb2NlZWQnLFxuICAgICAgICAgIGlkICAgICA6ICdwcm9jZWVkJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9tcHQodGl0bGUsIG1lc3NhZ2UsIG9rQ0IsIG1vZGFsKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHAgY2xhc3M9XCJ0ZXh0LWNlbnRlciBwYWRkaW5nLWJvdHRvbS1kb3VibGVcIj4nICsgbWVzc2FnZSArICc8L3A+PHRleHRhcmVhIG5hbWU9XCJyZXNwb25zZVwiIGNsYXNzPVwiaW5wdXQtdGV4dFwiIHR5cGU9XCJ0ZXh0XCIgc3R5bGU9XCJ3aWR0aDo0MDBweDsgaGVpZ2h0Ojc1cHg7IHJlc2l6ZTogbm9uZVwiIGF1dG9mb2N1cz1cInRydWVcIj48L3RleHRhcmVhPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQ1MCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdQcm9jZWVkJyxcbiAgICAgICAgICBpZCAgICAgOiAncHJvY2VlZCcsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hvaWNlKHRpdGxlLCBtZXNzYWdlLCBzZWxlY3Rpb25zLCBva0NCLCBtb2RhbCkge1xuICAgIHZhciBzZWxlY3RIVE1MID0gJzxzZWxlY3QgY2xhc3M9XCJzcGFjZWRcIiBzdHlsZT1cIndpZHRoOjQ1MHB4O2hlaWdodDoyMDBweFwiIG5hbWU9XCJzZWxlY3Rpb25cIiBhdXRvZm9jdXM9XCJ0cnVlXCIgc2l6ZT1cIjIwXCI+JztcblxuICAgIHNlbGVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAob3B0KSB7XG4gICAgICBzZWxlY3RIVE1MICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIG9wdC52YWx1ZSArICdcIiAnICsgKG9wdC5zZWxlY3RlZCA9PT0gJ3RydWUnID8gJ3NlbGVjdGVkJyA6ICcnKSArICc+JyArIG9wdC5sYWJlbCArICc8L29wdGlvbj4nO1xuICAgIH0pO1xuXG4gICAgc2VsZWN0SFRNTCArPSAnPC9zZWxlY3Q+JztcblxuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwIGNsYXNzPVwidGV4dC1jZW50ZXIgcGFkZGluZy1ib3R0b20tZG91YmxlXCI+JyArIG1lc3NhZ2UgKyAnPC9wPjxkaXYgY2xhc3M9XCJ0ZXh0LWNlbnRlclwiPicgKyBzZWxlY3RIVE1MICsgJzwvZGl2PicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDUwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdPSycsXG4gICAgICAgICAgaWQgICAgIDogJ29rJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFsZXJ0ICA6IGFsZXJ0LFxuICAgIGNvbmZpcm06IGNvbmZpcm0sXG4gICAgcHJvbXB0IDogcHJvbXB0LFxuICAgIGNob2ljZSA6IGNob2ljZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VCb3hDcmVhdG9yKCk7IiwidmFyIE1lc3NhZ2VCb3hWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2hpZ2hlc3RaICAgICAgICAgICAgICAgPSAxMDAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCAgICAgICAgICAgPSA0MDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ21lc3NhZ2Vib3hfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ21lc3NhZ2Vib3hfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAnbWVzc2FnZWJveF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICdtZXNzYWdlYm94X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfYnV0dG9uSWNvblRlbXBsYXRlSUQgICA9ICd0ZW1wbGF0ZV9fbWVzc2FnZWJveC0tYnV0dG9uLWljb24nLFxuICAgICAgX2J1dHRvbk5vSWNvblRlbXBsYXRlSUQgPSAndGVtcGxhdGVfX21lc3NhZ2Vib3gtLWJ1dHRvbi1ub2ljb24nLFxuICAgICAgX3RlbXBsYXRlICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9tb2RhbCAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9Nb2RhbENvdmVyVmlldy5qcycpLFxuICAgICAgX2Jyb3dzZXJJbmZvICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpLFxuICAgICAgX2NvbXBvbmVudFV0aWxzICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzJyk7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIHNldCB0aGUgbW91bnQgcG9pbnQgLyBib3ggY29udGFpbmVyXG4gICAqIEBwYXJhbSBlbElEXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIG5ldyBtZXNzYWdlIGJveFxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgdmFyIHR5cGUgICA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVCxcbiAgICAgICAgYm94T2JqID0gY3JlYXRlQm94T2JqZWN0KGluaXRPYmopO1xuXG4gICAgLy8gc2V0dXBcbiAgICBfY2hpbGRyZW4ucHVzaChib3hPYmopO1xuICAgIF9tb3VudFBvaW50LmFwcGVuZENoaWxkKGJveE9iai5lbGVtZW50KTtcbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgYm94T2JqLmVsZW1lbnQpO1xuICAgIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKTtcblxuICAgIF9jb21wb25lbnRVdGlscy5hcHBseVVuaXF1ZTNEVG9FbGVtZW50KGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIFNldCAzZCBDU1MgcHJvcHMgZm9yIGluL291dCB0cmFuc2l0aW9uXG4gICAgVHdlZW5MaXRlLnNldChib3hPYmouZWxlbWVudCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHpJbmRleDogX2hpZ2hlc3RaLFxuICAgICAgICB3aWR0aCA6IGluaXRPYmoud2lkdGggPyBpbml0T2JqLndpZHRoIDogX2RlZmF1bHRXaWR0aFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gY2VudGVyIGFmdGVyIHdpZHRoIGhhcyBiZWVuIHNldFxuICAgIF9kb21VdGlscy5jZW50ZXJFbGVtZW50SW5WaWV3UG9ydChib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBNYWtlIGl0IGRyYWdnYWJsZVxuICAgIERyYWdnYWJsZS5jcmVhdGUoJyMnICsgYm94T2JqLmlkLCB7XG4gICAgICBib3VuZHMgOiB3aW5kb3csXG4gICAgICBvblByZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9oaWdoZXN0WiA9IERyYWdnYWJsZS56SW5kZXg7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBTaG93IGl0XG4gICAgdHJhbnNpdGlvbkluKGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIFNob3cgdGhlIG1vZGFsIGNvdmVyXG4gICAgaWYgKGluaXRPYmoubW9kYWwpIHtcbiAgICAgIF9tb2RhbC5zaG93Tm9uRGlzbWlzc2FibGUodHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJveE9iai5pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NpZ24gYSB0eXBlIGNsYXNzIHRvIGl0XG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBlbGVtZW50XG4gICAqL1xuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBvYmplY3QgZm9yIGEgYm94XG4gICAqIEBwYXJhbSBpbml0T2JqXG4gICAqIEByZXR1cm5zIHt7ZGF0YU9iajogKiwgaWQ6IHN0cmluZywgbW9kYWw6ICgqfGJvb2xlYW4pLCBlbGVtZW50OiAqLCBzdHJlYW1zOiBBcnJheX19XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVCb3hPYmplY3QoaW5pdE9iaikge1xuICAgIHZhciBpZCAgPSAnanNfX21lc3NhZ2Vib3gtJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgZGF0YU9iajogaW5pdE9iaixcbiAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICBtb2RhbCAgOiBpbml0T2JqLm1vZGFsLFxuICAgICAgICAgIGVsZW1lbnQ6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ3RlbXBsYXRlX19tZXNzYWdlYm94LS1kZWZhdWx0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiBpbml0T2JqLnRpdGxlLFxuICAgICAgICAgICAgY29udGVudDogaW5pdE9iai5jb250ZW50XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc3RyZWFtczogW11cbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHVwIHRoZSBidXR0b25zXG4gICAqIEBwYXJhbSBib3hPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKSB7XG4gICAgdmFyIGJ1dHRvbkRhdGEgPSBib3hPYmouZGF0YU9iai5idXR0b25zO1xuXG4gICAgLy8gZGVmYXVsdCBidXR0b24gaWYgbm9uZVxuICAgIGlmICghYnV0dG9uRGF0YSkge1xuICAgICAgYnV0dG9uRGF0YSA9IFt7XG4gICAgICAgIGxhYmVsOiAnQ2xvc2UnLFxuICAgICAgICB0eXBlIDogJycsXG4gICAgICAgIGljb24gOiAndGltZXMnLFxuICAgICAgICBpZCAgIDogJ2RlZmF1bHQtY2xvc2UnXG4gICAgICB9XTtcbiAgICB9XG5cbiAgICB2YXIgYnV0dG9uQ29udGFpbmVyID0gYm94T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmZvb3Rlci1idXR0b25zJyk7XG5cbiAgICBfZG9tVXRpbHMucmVtb3ZlQWxsRWxlbWVudHMoYnV0dG9uQ29udGFpbmVyKTtcblxuICAgIGJ1dHRvbkRhdGEuZm9yRWFjaChmdW5jdGlvbiBtYWtlQnV0dG9uKGJ1dHRvbk9iaikge1xuICAgICAgYnV0dG9uT2JqLmlkID0gYm94T2JqLmlkICsgJy1idXR0b24tJyArIGJ1dHRvbk9iai5pZDtcblxuICAgICAgdmFyIGJ1dHRvbkVsO1xuXG4gICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdpY29uJykpIHtcbiAgICAgICAgYnV0dG9uRWwgPSBfdGVtcGxhdGUuYXNFbGVtZW50KF9idXR0b25JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1dHRvbkVsID0gX3RlbXBsYXRlLmFzRWxlbWVudChfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH1cblxuICAgICAgYnV0dG9uQ29udGFpbmVyLmFwcGVuZENoaWxkKGJ1dHRvbkVsKTtcblxuICAgICAgdmFyIGJ0blN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKVxuICAgICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdvbkNsaWNrJykpIHtcbiAgICAgICAgICAgIGlmIChidXR0b25PYmoub25DbGljaykge1xuICAgICAgICAgICAgICBidXR0b25PYmoub25DbGljay5jYWxsKHRoaXMsIGNhcHR1cmVGb3JtRGF0YShib3hPYmouaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVtb3ZlKGJveE9iai5pZCk7XG4gICAgICAgIH0pO1xuICAgICAgYm94T2JqLnN0cmVhbXMucHVzaChidG5TdHJlYW0pO1xuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBkYXRhIGZyb20gdGhlIGZvcm0gb24gdGhlIGJveCBjb250ZW50c1xuICAgKiBAcGFyYW0gYm94SURcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjYXB0dXJlRm9ybURhdGEoYm94SUQpIHtcbiAgICByZXR1cm4gX2RvbVV0aWxzLmNhcHR1cmVGb3JtRGF0YShnZXRPYmpCeUlEKGJveElEKS5lbGVtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBib3ggZnJvbSB0aGUgc2NyZWVuIC8gY29udGFpbmVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIGJveE9iajtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG4gICAgICB0cmFuc2l0aW9uT3V0KGJveE9iai5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvdyB0aGUgYm94XG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLCB7YWxwaGE6IDAsIHJvdGF0aW9uWDogNDUsIHNjYWxlOiAyfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGFscGhhICAgIDogMSxcbiAgICAgIHJvdGF0aW9uWDogMCxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBib3hcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjI1LCB7XG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICByb3RhdGlvblg6IC00NSxcbiAgICAgIHNjYWxlICAgIDogMC4yNSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFuIHVwIGFmdGVyIHRoZSB0cmFuc2l0aW9uIG91dCBhbmltYXRpb25cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG5cbiAgICBib3hPYmouc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgIHN0cmVhbS5kaXNwb3NlKCk7XG4gICAgfSk7XG5cbiAgICBEcmFnZ2FibGUuZ2V0KCcjJyArIGJveE9iai5pZCkuZGlzYWJsZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuXG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcblxuICAgIGNoZWNrTW9kYWxTdGF0dXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgYW55IG9wZW4gYm94ZXMgaGF2ZSBtb2RhbCB0cnVlXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja01vZGFsU3RhdHVzKCkge1xuICAgIHZhciBpc01vZGFsID0gZmFsc2U7XG5cbiAgICBfY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoYm94T2JqKSB7XG4gICAgICBpZiAoYm94T2JqLm1vZGFsID09PSB0cnVlKSB7XG4gICAgICAgIGlzTW9kYWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFpc01vZGFsKSB7XG4gICAgICBfbW9kYWwuaGlkZSh0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXRpbGl0eSB0byBnZXQgdGhlIGJveCBvYmplY3QgaW5kZXggYnkgSURcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVdGlsaXR5IHRvIGdldCB0aGUgYm94IG9iamVjdCBieSBJRFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlQm94VmlldygpOyIsInZhciBNb2RhbENvdmVyVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX21vdW50UG9pbnQgID0gZG9jdW1lbnQsXG4gICAgICBfbW9kYWxDb3ZlckVsLFxuICAgICAgX21vZGFsQmFja2dyb3VuZEVsLFxuICAgICAgX21vZGFsQ2xvc2VCdXR0b25FbCxcbiAgICAgIF9tb2RhbENsaWNrU3RyZWFtLFxuICAgICAgX2lzVmlzaWJsZSxcbiAgICAgIF9ub3REaXNtaXNzaWJsZSxcbiAgICAgIF9icm93c2VySW5mbyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblxuICAgIF9pc1Zpc2libGUgPSB0cnVlO1xuXG4gICAgX21vZGFsQ292ZXJFbCAgICAgICA9IF9tb3VudFBvaW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbF9fY292ZXInKTtcbiAgICBfbW9kYWxCYWNrZ3JvdW5kRWwgID0gX21vdW50UG9pbnQucXVlcnlTZWxlY3RvcignLm1vZGFsX19iYWNrZ3JvdW5kJyk7XG4gICAgX21vZGFsQ2xvc2VCdXR0b25FbCA9IF9tb3VudFBvaW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbF9fY2xvc2UtYnV0dG9uJyk7XG5cbiAgICB2YXIgbW9kYWxCR0NsaWNrICAgICA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KF9tb2RhbEJhY2tncm91bmRFbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIG1vZGFsQnV0dG9uQ2xpY2sgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChfbW9kYWxDbG9zZUJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKTtcblxuICAgIF9tb2RhbENsaWNrU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5tZXJnZShtb2RhbEJHQ2xpY2ssIG1vZGFsQnV0dG9uQ2xpY2spXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25Nb2RhbENsaWNrKCk7XG4gICAgICB9KTtcblxuICAgIGhpZGUoZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SXNWaXNpYmxlKCkge1xuICAgIHJldHVybiBfaXNWaXNpYmxlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Nb2RhbENsaWNrKCkge1xuICAgIGlmIChfbm90RGlzbWlzc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaGlkZSh0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpIHtcbiAgICBfaXNWaXNpYmxlICAgPSB0cnVlO1xuICAgIHZhciBkdXJhdGlvbiA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ292ZXJFbCwgZHVyYXRpb24sIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbEJhY2tncm91bmRFbCwgZHVyYXRpb24sIHtcbiAgICAgIGFscGhhOiAxLFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdyhzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKF9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfbm90RGlzbWlzc2libGUgPSBmYWxzZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuXG4gICAgVHdlZW5MaXRlLnNldChfbW9kYWxDbG9zZUJ1dHRvbkVsLCB7c2NhbGU6IDIsIGFscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENsb3NlQnV0dG9uRWwsIDEsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQm91bmNlLmVhc2VPdXQsXG4gICAgICBkZWxheSAgICA6IDFcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBICdoYXJkJyBtb2RhbCB2aWV3IGNhbm5vdCBiZSBkaXNtaXNzZWQgd2l0aCBhIGNsaWNrLCBtdXN0IGJlIHZpYSBjb2RlXG4gICAqIEBwYXJhbSBzaG91bGRBbmltYXRlXG4gICAqL1xuICBmdW5jdGlvbiBzaG93Tm9uRGlzbWlzc2FibGUoc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NpYmxlID0gdHJ1ZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAwLCB7YXV0b0FscGhhOiAwfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoIV9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX2lzVmlzaWJsZSAgICAgID0gZmFsc2U7XG4gICAgX25vdERpc21pc3NpYmxlID0gZmFsc2U7XG4gICAgdmFyIGR1cmF0aW9uICAgID0gc2hvdWxkQW5pbWF0ZSA/IDAuMjUgOiAwO1xuICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8oX21vZGFsQ2xvc2VCdXR0b25FbCk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCBkdXJhdGlvbiAvIDIsIHtcbiAgICAgIGF1dG9BbHBoYTogMCxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldE9wYWNpdHkob3BhY2l0eSkge1xuICAgIGlmIChvcGFjaXR5IDwgMCB8fCBvcGFjaXR5ID4gMSkge1xuICAgICAgY29uc29sZS5sb2coJ251ZG9ydS9jb21wb25lbnQvTW9kYWxDb3ZlclZpZXc6IHNldE9wYWNpdHk6IG9wYWNpdHkgc2hvdWxkIGJlIGJldHdlZW4gMCBhbmQgMScpO1xuICAgICAgb3BhY2l0eSA9IDE7XG4gICAgfVxuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGFscGhhOiBvcGFjaXR5LFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q29sb3IociwgZywgYikge1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGJhY2tncm91bmRDb2xvcjogJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknLFxuICAgICAgZWFzZSAgICAgICAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHNob3cgICAgICAgICAgICAgIDogc2hvdyxcbiAgICBzaG93Tm9uRGlzbWlzc2FibGU6IHNob3dOb25EaXNtaXNzYWJsZSxcbiAgICBoaWRlICAgICAgICAgICAgICA6IGhpZGUsXG4gICAgdmlzaWJsZSAgICAgICAgICAgOiBnZXRJc1Zpc2libGUsXG4gICAgc2V0T3BhY2l0eSAgICAgICAgOiBzZXRPcGFjaXR5LFxuICAgIHNldENvbG9yICAgICAgICAgIDogc2V0Q29sb3JcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbENvdmVyVmlldygpOyIsInZhciBUb2FzdFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgICAgICAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2RlZmF1bHRFeHBpcmVEdXJhdGlvbiA9IDcwMDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCAgICAgICAgICA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICd0b2FzdF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAndG9hc3RfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9hc3RfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAndG9hc3RfX2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyksXG4gICAgICBfY29tcG9uZW50VXRpbHMgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvL29iai50aXRsZSwgb2JqLmNvbnRlbnQsIG9iai50eXBlXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvYXN0T2JqID0gY3JlYXRlVG9hc3RPYmplY3QoaW5pdE9iai50aXRsZSwgaW5pdE9iai5tZXNzYWdlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvYXN0T2JqKTtcblxuICAgIF9tb3VudFBvaW50Lmluc2VydEJlZm9yZSh0b2FzdE9iai5lbGVtZW50LCBfbW91bnRQb2ludC5maXJzdENoaWxkKTtcblxuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudChpbml0T2JqLnR5cGUsIHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0NvbnRhaW5lcihfbW91bnRQb2ludCk7XG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0VsZW1lbnQodG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICB2YXIgY2xvc2VCdG4gICAgICAgICA9IHRvYXN0T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLnRvYXN0X19pdGVtLWNvbnRyb2xzID4gYnV0dG9uJyksXG4gICAgICAgIGNsb3NlQnRuU3RlYW0gICAgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChjbG9zZUJ0biwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIGV4cGlyZVRpbWVTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKF9kZWZhdWx0RXhwaXJlRHVyYXRpb24pO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbSA9IFJ4Lk9ic2VydmFibGUubWVyZ2UoY2xvc2VCdG5TdGVhbSwgZXhwaXJlVGltZVN0cmVhbSkudGFrZSgxKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlbW92ZSh0b2FzdE9iai5pZCk7XG4gICAgICB9KTtcblxuICAgIHRyYW5zaXRpb25Jbih0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIHJldHVybiB0b2FzdE9iai5pZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvYXN0T2JqZWN0KHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgdmFyIGlkICA9ICdqc19fdG9hc3QtdG9hc3RpdGVtLScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGlkICAgICAgICAgICAgICAgICA6IGlkLFxuICAgICAgICAgIGVsZW1lbnQgICAgICAgICAgICA6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ3RlbXBsYXRlX19jb21wb25lbnQtLXRvYXN0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBkZWZhdWx0QnV0dG9uU3RyZWFtOiBudWxsXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIHRvYXN0O1xuXG4gICAgaWYgKGlkeCA+IC0xKSB7XG4gICAgICB0b2FzdCA9IF9jaGlsZHJlbltpZHhdO1xuICAgICAgcmVhcnJhbmdlKGlkeCk7XG4gICAgICB0cmFuc2l0aW9uT3V0KHRvYXN0LmVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMCwge2FscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAxLCB7YWxwaGE6IDEsIGVhc2U6IFF1YWQuZWFzZU91dH0pO1xuICAgIHJlYXJyYW5nZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4yNSwge1xuICAgICAgcm90YXRpb25YOiAtNDUsXG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZUluLCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKSB7XG4gICAgdmFyIGlkeCAgICAgICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgdG9hc3RPYmogICA9IF9jaGlsZHJlbltpZHhdO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbS5kaXNwb3NlKCk7XG5cbiAgICBfbW91bnRQb2ludC5yZW1vdmVDaGlsZChlbCk7XG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYXJyYW5nZShpZ25vcmUpIHtcbiAgICB2YXIgaSA9IF9jaGlsZHJlbi5sZW5ndGggLSAxLFxuICAgICAgICBjdXJyZW50LFxuICAgICAgICB5ID0gMDtcblxuICAgIGZvciAoOyBpID4gLTE7IGktLSkge1xuICAgICAgaWYgKGkgPT09IGlnbm9yZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnQgPSBfY2hpbGRyZW5baV07XG4gICAgICBUd2VlbkxpdGUudG8oY3VycmVudC5lbGVtZW50LCAwLjc1LCB7eTogeSwgZWFzZTogQm91bmNlLmVhc2VPdXR9KTtcbiAgICAgIHkgKz0gMTAgKyBjdXJyZW50LmVsZW1lbnQuY2xpZW50SGVpZ2h0O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG9hc3RWaWV3KCk7IiwidmFyIFRvb2xUaXBWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgID0gMCxcbiAgICAgIF9kZWZhdWx0V2lkdGggPSAyMDAsXG4gICAgICBfdHlwZXMgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInLFxuICAgICAgICBDT0FDSE1BUksgIDogJ2NvYWNobWFyaydcbiAgICAgIH0sXG4gICAgICBfdHlwZVN0eWxlTWFwID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ3Rvb2x0aXBfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ3Rvb2x0aXBfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9vbHRpcF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICd0b29sdGlwX19kYW5nZXInLFxuICAgICAgICAnY29hY2htYXJrJyAgOiAndG9vbHRpcF9fY29hY2htYXJrJ1xuICAgICAgfSxcbiAgICAgIF9wb3NpdGlvbnMgICAgPSB7XG4gICAgICAgIFQgOiAnVCcsXG4gICAgICAgIFRSOiAnVFInLFxuICAgICAgICBSIDogJ1InLFxuICAgICAgICBCUjogJ0JSJyxcbiAgICAgICAgQiA6ICdCJyxcbiAgICAgICAgQkw6ICdCTCcsXG4gICAgICAgIEwgOiAnTCcsXG4gICAgICAgIFRMOiAnVEwnXG4gICAgICB9LFxuICAgICAgX3Bvc2l0aW9uTWFwICA9IHtcbiAgICAgICAgJ1QnIDogJ3Rvb2x0aXBfX3RvcCcsXG4gICAgICAgICdUUic6ICd0b29sdGlwX190b3ByaWdodCcsXG4gICAgICAgICdSJyA6ICd0b29sdGlwX19yaWdodCcsXG4gICAgICAgICdCUic6ICd0b29sdGlwX19ib3R0b21yaWdodCcsXG4gICAgICAgICdCJyA6ICd0b29sdGlwX19ib3R0b20nLFxuICAgICAgICAnQkwnOiAndG9vbHRpcF9fYm90dG9tbGVmdCcsXG4gICAgICAgICdMJyA6ICd0b29sdGlwX19sZWZ0JyxcbiAgICAgICAgJ1RMJzogJ3Rvb2x0aXBfX3RvcGxlZnQnXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfdGVtcGxhdGUgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfZG9tVXRpbHMgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLy9vYmoudGl0bGUsIG9iai5jb250ZW50LCBvYmoudHlwZSwgb2JqLnRhcmdldCwgb2JqLnBvc2l0aW9uXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvb2x0aXBPYmogPSBjcmVhdGVUb29sVGlwT2JqZWN0KGluaXRPYmoudGl0bGUsXG4gICAgICBpbml0T2JqLmNvbnRlbnQsXG4gICAgICBpbml0T2JqLnBvc2l0aW9uLFxuICAgICAgaW5pdE9iai50YXJnZXRFbCxcbiAgICAgIGluaXRPYmouZ3V0dGVyLFxuICAgICAgaW5pdE9iai5hbHdheXNWaXNpYmxlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvb2x0aXBPYmopO1xuICAgIF9tb3VudFBvaW50LmFwcGVuZENoaWxkKHRvb2x0aXBPYmouZWxlbWVudCk7XG5cbiAgICB0b29sdGlwT2JqLmFycm93RWwgPSB0b29sdGlwT2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93Jyk7XG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KGluaXRPYmoudHlwZSwgaW5pdE9iai5wb3NpdGlvbiwgdG9vbHRpcE9iai5lbGVtZW50KTtcblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgYXV0b0FscGhhOiB0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUgPyAxIDogMCxcbiAgICAgICAgd2lkdGggICAgOiBpbml0T2JqLndpZHRoID8gaW5pdE9iai53aWR0aCA6IF9kZWZhdWx0V2lkdGhcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNhY2hlIHRoZXNlIHZhbHVlcywgM2QgdHJhbnNmb3JtcyB3aWxsIGFsdGVyIHNpemVcbiAgICB0b29sdGlwT2JqLndpZHRoICA9IHRvb2x0aXBPYmouZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aDtcbiAgICB0b29sdGlwT2JqLmhlaWdodCA9IHRvb2x0aXBPYmouZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG5cbiAgICBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopO1xuICAgIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKTtcblxuICAgIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwgfHwgdG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5SKSB7XG4gICAgICBjZW50ZXJBcnJvd1ZlcnRpY2FsbHkodG9vbHRpcE9iaik7XG4gICAgfVxuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCB8fCB0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkIpIHtcbiAgICAgIGNlbnRlckFycm93SG9yaXpvbnRhbGx5KHRvb2x0aXBPYmopO1xuICAgIH1cblxuICAgIHJldHVybiB0b29sdGlwT2JqLmVsZW1lbnQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgcG9zaXRpb24sIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfcG9zaXRpb25NYXBbcG9zaXRpb25dKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvb2xUaXBPYmplY3QodGl0bGUsIG1lc3NhZ2UsIHBvc2l0aW9uLCB0YXJnZXQsIGd1dHRlciwgYWx3YXlzVmlzaWJsZSkge1xuICAgIHZhciBpZCAgPSAnanNfX3Rvb2x0aXAtdG9vbHRpcGl0ZW0tJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgaWQgICAgICAgICAgIDogaWQsXG4gICAgICAgICAgcG9zaXRpb24gICAgIDogcG9zaXRpb24sXG4gICAgICAgICAgdGFyZ2V0RWwgICAgIDogdGFyZ2V0LFxuICAgICAgICAgIGFsd2F5c1Zpc2libGU6IGFsd2F5c1Zpc2libGUgfHwgZmFsc2UsXG4gICAgICAgICAgZ3V0dGVyICAgICAgIDogZ3V0dGVyIHx8IDE1LFxuICAgICAgICAgIGVsT3ZlclN0cmVhbSA6IG51bGwsXG4gICAgICAgICAgZWxPdXRTdHJlYW0gIDogbnVsbCxcbiAgICAgICAgICBoZWlnaHQgICAgICAgOiAwLFxuICAgICAgICAgIHdpZHRoICAgICAgICA6IDAsXG4gICAgICAgICAgZWxlbWVudCAgICAgIDogX3RlbXBsYXRlLmFzRWxlbWVudCgndGVtcGxhdGVfX2NvbXBvbmVudC0tdG9vbHRpcCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgYXJyb3dFbCAgICAgIDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkV2ZW50c1RvVGFyZ2V0RWwodG9vbHRpcE9iaikge1xuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0b29sdGlwT2JqLmVsT3ZlclN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW92ZXInKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHNob3dUb29sVGlwKHRvb2x0aXBPYmouaWQpO1xuICAgICAgfSk7XG5cbiAgICB0b29sdGlwT2JqLmVsT3V0U3RyZWFtID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQodG9vbHRpcE9iai50YXJnZXRFbCwgJ21vdXNlb3V0JylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBoaWRlVG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd1Rvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKTtcbiAgICB0cmFuc2l0aW9uSW4odG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGd1dHRlciAgID0gdG9vbHRpcE9iai5ndXR0ZXIsXG4gICAgICAgIHhQb3MgICAgID0gMCxcbiAgICAgICAgeVBvcyAgICAgPSAwLFxuICAgICAgICB0Z3RQcm9wcyA9IHRvb2x0aXBPYmoudGFyZ2V0RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0IC0gZ3V0dGVyO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0O1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5SKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQgKyBndXR0ZXI7XG4gICAgICB5UG9zID0gdGd0UHJvcHMudG9wICsgKCh0Z3RQcm9wcy5oZWlnaHQgLyAyKSAtICh0b29sdGlwT2JqLmhlaWdodCAvIDIpKTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQlIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0ICsgKCh0Z3RQcm9wcy53aWR0aCAvIDIpIC0gKHRvb2x0aXBPYmoud2lkdGggLyAyKSk7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tICsgZ3V0dGVyO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoIC0gZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfVxuXG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmVsZW1lbnQsIHtcbiAgICAgIHg6IHhQb3MsXG4gICAgICB5OiB5UG9zXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjZW50ZXJBcnJvd0hvcml6b250YWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt4OiAodG9vbHRpcE9iai53aWR0aCAvIDIpIC0gKGFycm93UHJvcHMud2lkdGggLyAyKX0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dWZXJ0aWNhbGx5KHRvb2x0aXBPYmopIHtcbiAgICB2YXIgYXJyb3dQcm9wcyA9IHRvb2x0aXBPYmouYXJyb3dFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouYXJyb3dFbCwge3k6ICh0b29sdGlwT2JqLmhlaWdodCAvIDIpIC0gKGFycm93UHJvcHMuaGVpZ2h0IC8gMikgLSAyfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlVG9vbFRpcChpZCkge1xuICAgIHZhciB0b29sdGlwT2JqID0gZ2V0T2JqQnlJRChpZCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJhbnNpdGlvbk91dCh0b29sdGlwT2JqLmVsZW1lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjA1LCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGVsKSB7XG4gICAgZ2V0T2JqQnlFbGVtZW50KGVsKS5mb3JFYWNoKGZ1bmN0aW9uICh0b29sdGlwKSB7XG4gICAgICBpZiAodG9vbHRpcC5lbE92ZXJTdHJlYW0pIHtcbiAgICAgICAgdG9vbHRpcC5lbE92ZXJTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuICAgICAgaWYgKHRvb2x0aXAuZWxPdXRTdHJlYW0pIHtcbiAgICAgICAgdG9vbHRpcC5lbE91dFN0cmVhbS5kaXNwb3NlKCk7XG4gICAgICB9XG5cbiAgICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8odG9vbHRpcC5lbGVtZW50KTtcblxuICAgICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQodG9vbHRpcC5lbGVtZW50KTtcblxuICAgICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRCh0b29sdGlwLmlkKTtcblxuICAgICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgICAgX2NoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqQnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkID09PSBpZDtcbiAgICB9KVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqQnlFbGVtZW50KGVsKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQudGFyZ2V0RWwgPT09IGVsO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBvc2l0aW9ucygpIHtcbiAgICByZXR1cm4gX3Bvc2l0aW9ucztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzLFxuICAgIHBvc2l0aW9uICA6IGdldFBvc2l0aW9uc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xUaXBWaWV3KCk7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgaXNJbnRlZ2VyOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuICgvXi0/XFxkKyQvLnRlc3Qoc3RyKSk7XG4gIH0sXG5cbiAgcm5kTnVtYmVyOiBmdW5jdGlvbiAobWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgfSxcblxuICBjbGFtcDogZnVuY3Rpb24gKHZhbCwgbWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHZhbCkpO1xuICB9LFxuXG4gIGluUmFuZ2U6IGZ1bmN0aW9uICh2YWwsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIHZhbCA+IG1pbiAmJiB2YWwgPCBtYXg7XG4gIH0sXG5cbiAgZGlzdGFuY2VUTDogZnVuY3Rpb24gKHBvaW50MSwgcG9pbnQyKSB7XG4gICAgdmFyIHhkID0gKHBvaW50Mi5sZWZ0IC0gcG9pbnQxLmxlZnQpLFxuICAgICAgICB5ZCA9IChwb2ludDIudG9wIC0gcG9pbnQxLnRvcCk7XG4gICAgcmV0dXJuIE1hdGguc3FydCgoeGQgKiB4ZCkgKyAoeWQgKiB5ZCkpO1xuICB9XG5cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIFRlc3QgZm9yXG4gICAqIE9iamVjdCB7XCJcIjogdW5kZWZpbmVkfVxuICAgKiBPYmplY3Qge3VuZGVmaW5lZDogdW5kZWZpbmVkfVxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgaXNOdWxsOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIGlzbnVsbCA9IGZhbHNlO1xuXG4gICAgaWYgKGlzLmZhbHNleShvYmopKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgaWYgKHByb3AgPT09IHVuZGVmaW5lZCB8fCBvYmpbcHJvcF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpc251bGwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzbnVsbDtcbiAgfSxcblxuICBkeW5hbWljU29ydDogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYVtwcm9wZXJ0eV0gPCBiW3Byb3BlcnR5XSA/IC0xIDogYVtwcm9wZXJ0eV0gPiBiW3Byb3BlcnR5XSA/IDEgOiAwO1xuICAgIH07XG4gIH0sXG5cbiAgc2VhcmNoT2JqZWN0czogZnVuY3Rpb24gKG9iaiwga2V5LCB2YWwpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9ialtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgb2JqZWN0cyA9IG9iamVjdHMuY29uY2F0KHNlYXJjaE9iamVjdHMob2JqW2ldLCBrZXksIHZhbCkpO1xuICAgICAgfSBlbHNlIGlmIChpID09PSBrZXkgJiYgb2JqW2tleV0gPT09IHZhbCkge1xuICAgICAgICBvYmplY3RzLnB1c2gob2JqKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHM7XG4gIH0sXG5cbiAgZ2V0T2JqZWN0RnJvbVN0cmluZzogZnVuY3Rpb24gKG9iaiwgc3RyKSB7XG4gICAgdmFyIGkgICAgPSAwLFxuICAgICAgICBwYXRoID0gc3RyLnNwbGl0KCcuJyksXG4gICAgICAgIGxlbiAgPSBwYXRoLmxlbmd0aDtcblxuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG9iaiA9IG9ialtwYXRoW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICBnZXRPYmplY3RJbmRleEZyb21JZDogZnVuY3Rpb24gKG9iaiwgaWQpIHtcbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmpbaV0gIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIG9ialtpXS5pZCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBvYmpbaV0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vIGV4dGVuZCBhbmQgZGVlcCBleHRlbmQgZnJvbSBodHRwOi8veW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbS9cbiAgZXh0ZW5kOiBmdW5jdGlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHNbaV0uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIG91dFtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xuICB9LFxuXG4gIGRlZXBFeHRlbmQ6IGZ1bmN0aW9uIChvdXQpIHtcbiAgICBvdXQgPSBvdXQgfHwge307XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGFyZ3VtZW50c1tpXTtcblxuICAgICAgaWYgKCFvYmopIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBvYmpba2V5XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGRlZXBFeHRlbmQob3V0W2tleV0sIG9ialtrZXldKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uIG9mIFN0YW1wcyAtIGh0dHA6Ly9lcmljbGVhZHMuY29tLzIwMTQvMDIvcHJvdG90eXBhbC1pbmhlcml0YW5jZS13aXRoLXN0YW1wcy9cbiAgICogaHR0cHM6Ly93d3cuYmFya3dlYi5jby51ay9ibG9nL29iamVjdC1jb21wb3NpdGlvbi1hbmQtcHJvdG90eXBpY2FsLWluaGVyaXRhbmNlLWluLWphdmFzY3JpcHRcbiAgICpcbiAgICogUHJvdG90eXBlIG9iamVjdCByZXF1aXJlcyBhIG1ldGhvZHMgb2JqZWN0LCBwcml2YXRlIGNsb3N1cmVzIGFuZCBzdGF0ZSBpcyBvcHRpb25hbFxuICAgKlxuICAgKiBAcGFyYW0gcHJvdG90eXBlXG4gICAqIEByZXR1cm5zIE5ldyBvYmplY3QgdXNpbmcgcHJvdG90eXBlLm1ldGhvZHMgYXMgc291cmNlXG4gICAqL1xuICBiYXNpY0ZhY3Rvcnk6IGZ1bmN0aW9uIChwcm90b3R5cGUpIHtcbiAgICB2YXIgcHJvdG8gPSBwcm90b3R5cGUsXG4gICAgICAgIG9iaiAgID0gT2JqZWN0LmNyZWF0ZShwcm90by5tZXRob2RzKTtcblxuICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnY2xvc3VyZScpKSB7XG4gICAgICBwcm90by5jbG9zdXJlcy5mb3JFYWNoKGZ1bmN0aW9uIChjbG9zdXJlKSB7XG4gICAgICAgIGNsb3N1cmUuY2FsbChvYmopO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdzdGF0ZScpKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJvdG8uc3RhdGUpIHtcbiAgICAgICAgb2JqW2tleV0gPSBwcm90by5zdGF0ZVtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAgICpcbiAgICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAgICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICAgKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAgICpcbiAgICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gICAqXG4gICAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAgICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICAgKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAgICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICAgKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAgICpcbiAgICovXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGFuIGVudW1lcmF0aW9uIHdpdGgga2V5cyBlcXVhbCB0byB0aGVpciB2YWx1ZS5cbiAgICpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL1NUUk1ML2tleW1pcnJvclxuICAgKlxuICAgKiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogICB2YXIgQ09MT1JTID0ga2V5TWlycm9yKHtibHVlOiBudWxsLCByZWQ6IG51bGx9KTtcbiAgICogICB2YXIgbXlDb2xvciA9IENPTE9SUy5ibHVlO1xuICAgKiAgIHZhciBpc0NvbG9yVmFsaWQgPSAhIUNPTE9SU1tteUNvbG9yXTtcbiAgICpcbiAgICogVGhlIGxhc3QgbGluZSBjb3VsZCBub3QgYmUgcGVyZm9ybWVkIGlmIHRoZSB2YWx1ZXMgb2YgdGhlIGdlbmVyYXRlZCBlbnVtIHdlcmVcbiAgICogbm90IGVxdWFsIHRvIHRoZWlyIGtleXMuXG4gICAqXG4gICAqICAgSW5wdXQ6ICB7a2V5MTogdmFsMSwga2V5MjogdmFsMn1cbiAgICogICBPdXRwdXQ6IHtrZXkxOiBrZXkxLCBrZXkyOiBrZXkyfVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICovXG4gIGtleU1pcnJvcjogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciByZXQgPSB7fTtcbiAgICB2YXIga2V5O1xuICAgIGlmICghKG9iaiBpbnN0YW5jZW9mIE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShvYmopKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdrZXlNaXJyb3IoLi4uKTogQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QuJyk7XG4gICAgfVxuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHJldFtrZXldID0ga2V5O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbn07Il19
