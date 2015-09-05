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
    this.store.setState({ currentState: 'GAME_OVER' });

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
      localPlayer: this.createBlankPlayerObject(),
      remotePlayer: this.createBlankPlayerObject(),
      questionBank: []
    });

    this.notifySubscribersOf('storeInitialized');
  },

  createBlankPlayerObject: function createBlankPlayerObject() {
    return {
      id: '',
      type: '',
      name: 'Mystery Player ' + _numUtils.rndNumber(100, 999),
      health: 6,
      appearance: 'green',
      behaviors: [],
      score: _numUtils.rndNumber(10, 20)
    };
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

},{"../../nori/action/ActionConstants.js":13,"../../nori/store/MixinReducerStore.js":18,"../../nori/utils/MixinObservableSubject.js":20,"../../nudoru/core/NumberUtils.js":40,"../action/ActionConstants.js":2}],5:[function(require,module,exports){
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

},{"../../nori/utils/MixinObservableSubject.js":20,"../../nori/view/ApplicationView.js":25,"../../nori/view/MixinComponentViews.js":26,"../../nori/view/MixinEventDelegator.js":28,"../../nori/view/MixinNudoruControls.js":29,"../../nori/view/MixinStoreStateViews.js":30,"../store/AppStore.js":4,"./Screen.GameOver.js":6,"./Screen.MainGame.js":7,"./Screen.PlayerSelect.js":8,"./Screen.Title.js":9,"./Screen.WaitingOnPlayer.js":10}],6:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore'),
    _template = require('../../nori/utils/Templating.js'),
    _mixinDOMManipulation = require('../../nori/view/MixinDOMManipulation.js');

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

  mixins: [_mixinDOMManipulation],

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
    var appState = _appStore.getState();
    var state = {
      name: appState.localPlayer.name,
      appearance: appState.localPlayer.appearance,
      localScore: appState.localPlayer.score,
      remoteScore: appState.remotePlayer.score,
      localWin: appState.localPlayer.score > appState.remotePlayer.score,
      remoteWin: appState.localPlayer.score < appState.remotePlayer.score,
      tieWin: appState.localPlayer.score === appState.remotePlayer.score
    };
    console.log(state);
    return state;
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
    var state = this.getState();

    this.hideEl('#gameover__win');
    this.hideEl('#gameover__tie');
    this.hideEl('#gameover__loose');

    if (state.localWin) {
      this.showEl('#gameover__win');
    } else if (state.remoteWin) {
      this.showEl('#gameover__loose');
    } else if (state.tieWin) {
      this.showEl('#gameover__tie');
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

},{"../../nori/action/ActionCreator":14,"../../nori/utils/Templating.js":24,"../../nori/view/MixinDOMManipulation.js":27,"../store/AppStore":4,"./AppView":5}],7:[function(require,module,exports){
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

},{"./app/App.js":1,"./nori/Nori.js":12,"./nudoru/browser/BrowserInfo.js":32}],12:[function(require,module,exports){
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

},{"../../vendor/immutable.min.js":42}],18:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":33}],22:[function(require,module,exports){
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

},{"../../nudoru/core/ObjectUtils.js":41}],23:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":33}],25:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":33,"../utils/Templating.js":24}],26:[function(require,module,exports){
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

},{"../store/ImmutableMap.js":17,"../utils/MixinObservableSubject.js":20,"./MixinEventDelegator.js":28,"./ViewComponent.js":31}],27:[function(require,module,exports){
var MixinDOMManipulation = function MixinDOMManipulation() {

  function hideEl(selector) {
    TweenLite.set(document.querySelector(selector), {
      alpha: 0,
      display: 'none'
    });
  }

  function showEl(selector) {
    TweenLite.set(document.querySelector(selector), {
      alpha: 1,
      display: 'block'
    });
  }

  return {
    showEl: showEl,
    hideEl: hideEl
  };
};

module.exports = MixinDOMManipulation();

},{}],28:[function(require,module,exports){
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
  function delegateEvents(autoForm) {
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

          _eventSubscribers[evtStrings] = createHandler(selector, eventStr, eventHandler, autoForm);
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

  function createHandler(selector, eventStr, eventHandler, autoForm) {
    var observable = _rx.dom(selector, eventStr),
        el = document.querySelector(selector),
        tag = el.tagName.toLowerCase(),
        type = el.getAttribute('type');

    if (autoForm) {
      if (tag === 'input' || tag === 'textarea') {
        if (!type || type === 'text') {
          if (eventStr === 'blur' || eventStr === 'focus') {
            return observable.map(function (evt) {
              return evt.target.value;
            }).subscribe(eventHandler);
          } else if (eventStr === 'keyup' || eventStr === 'keydown') {
            return observable.throttle(100).map(function (evt) {
              return evt.target.value;
            }).subscribe(eventHandler);
          }
        } else if (type === 'radio' || type === 'checkbox') {
          if (eventStr === 'click') {
            return observable.map(function (evt) {
              return evt.target.checked;
            }).subscribe(eventHandler);
          }
        }
      } else if (tag === 'select') {
        if (eventStr === 'change') {
          return observable.map(function (evt) {
            return evt.target.value;
          }).subscribe(eventHandler);
        }
      }
    }

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

},{"../../nudoru/browser/BrowserInfo.js":32,"../utils/Rx":23}],29:[function(require,module,exports){
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

},{"../../nudoru/components/MessageBoxCreator.js":35,"../../nudoru/components/MessageBoxView.js":36,"../../nudoru/components/ModalCoverView.js":37,"../../nudoru/components/ToastView.js":38,"../../nudoru/components/ToolTipView.js":39}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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
      // Pass true to automatically pass form element handlers the elements value or other status
      this.delegateEvents(true);
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
    unmount: unmount

  };
};

//addChild   : addChild,
//removeChild: removeChild,
//getChildren: getChildren
module.exports = ViewComponent;

},{"../utils/Renderer":21,"../utils/Templating.js":24}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
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

},{}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
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

},{"./MessageBoxView":36}],36:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":24,"../../nudoru/browser/BrowserInfo.js":32,"../../nudoru/browser/DOMUtils.js":33,"../../nudoru/browser/ThreeDTransforms.js":34,"./ModalCoverView.js":37}],37:[function(require,module,exports){
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

},{"../../nudoru/browser/BrowserInfo.js":32}],38:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":24,"../../nudoru/browser/BrowserInfo.js":32,"../../nudoru/browser/DOMUtils.js":33,"../../nudoru/browser/ThreeDTransforms.js":34}],39:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":24,"../../nudoru/browser/DOMUtils.js":33}],40:[function(require,module,exports){
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

},{}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3N0b3JlL0FwcFN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L0FwcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLkdhbWVPdmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5NYWluR2FtZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uUGxheWVyU2VsZWN0LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5UaXRsZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uV2FpdGluZ09uUGxheWVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL21haW4uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9Ob3JpLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvU29ja2V0SU9FdmVudHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zdG9yZS9JbW11dGFibGVNYXAuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL0Rpc3BhdGNoZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUmVuZGVyZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9Sb3V0ZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9SeC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L0FwcGxpY2F0aW9uVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvTWl4aW5Db21wb25lbnRWaWV3cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvTWl4aW5ET01NYW5pcHVsYXRpb24uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRXZlbnREZWxlZ2F0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluTnVkb3J1Q29udHJvbHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9WaWV3Q29tcG9uZW50LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveENyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvVG9hc3RWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb3JlL051bWJlclV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL3ZlbmRvci9pbW11dGFibGUubWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsSUFBSSxHQUFHLEdBQVksT0FBTyxDQUFDLHFCQUFxQixDQUFDO0lBQzdDLFdBQVcsR0FBSSxPQUFPLENBQUMsMkJBQTJCLENBQUM7SUFDbkQsWUFBWSxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQztJQUN6RCxlQUFlLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7Ozs7Ozs7QUFPbkUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDOztBQUUvQixRQUFNLEVBQUUsRUFBRTs7Ozs7QUFLVixPQUFLLEVBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDO0FBQ3RDLE1BQUksRUFBSSxPQUFPLENBQUMsbUJBQW1CLENBQUM7QUFD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QyxNQUFJLEVBQVMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQ3RELE9BQUssRUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUNyRSxPQUFLLEVBQVEsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDckUsT0FBSyxFQUFRLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQ3JFLE9BQUssRUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUNyRSxNQUFJLEVBQVMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO0FBQ3pELFVBQVEsRUFBSyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7QUFDeEQsT0FBSyxFQUFRLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztBQUMzRCxhQUFXLEVBQUUsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDOztBQUVsSixVQUFRLEVBQU0sY0FBYyxJQUFJLFFBQVEsQ0FBQyxlQUFlO0FBQ3hELGNBQVksRUFBRyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxBQUFDOztBQUVwRSxRQUFNLEVBQUU7QUFDTixXQUFPLEVBQUssbUJBQVk7QUFDdEIsYUFBTyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUM5QztBQUNELGNBQVUsRUFBRSxzQkFBWTtBQUN0QixhQUFPLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0tBQzdGO0FBQ0QsT0FBRyxFQUFTLGVBQVk7QUFDdEIsYUFBTyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0tBQ3ZEO0FBQ0QsU0FBSyxFQUFPLGlCQUFZO0FBQ3RCLGFBQU8sU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7S0FDakQ7QUFDRCxXQUFPLEVBQUssbUJBQVk7QUFDdEIsYUFBTyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUMvQztBQUNELE9BQUcsRUFBUyxlQUFZO0FBQ3RCLGFBQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBLEtBQU0sSUFBSSxDQUFDO0tBQ3ZHOztHQUVGOzs7QUFHRCxVQUFRLEVBQUUsb0JBQVk7QUFDcEIsV0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ3pEOztBQUVELGlCQUFlLEVBQUUsMkJBQVk7QUFDM0IsV0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLFlBQVksR0FBRyxXQUFXLENBQUM7R0FDdkQ7O0FBRUQsZUFBYSxFQUFFLHlCQUFZO0FBQ3pCLFdBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxVQUFVLEdBQUcsU0FBUyxDQUFDO0dBQ25EOztBQUVELGtCQUFnQixFQUFFLDRCQUFZO0FBQzVCLFdBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxVQUFVLEdBQUcsT0FBTyxDQUFDO0dBQ2pEOztBQUVELGlCQUFlLEVBQUUsMkJBQVk7QUFDM0IsV0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsR0FBRyxXQUFXLENBQUM7R0FDdEQ7O0NBRUYsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQzs7O0FDOUQ3QixNQUFNLENBQUMsT0FBTyxHQUFHOzs7O0FBSWYsNkJBQTJCLEVBQUUscUNBQVUsRUFBRSxFQUFFO0FBQ3pDLFFBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0FBQ3RDLFdBQ0UsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQ2IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQ2QsSUFBSSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFBLEFBQUMsSUFDNUUsSUFBSSxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsVUFBVSxJQUFJLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFBLEFBQUMsQ0FDekU7R0FDSDs7O0FBR0QscUJBQW1CLEVBQUUsNkJBQVUsRUFBRSxFQUFFO0FBQ2pDLFFBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0FBQ3RDLFdBQU8sSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQ3BCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUNkLElBQUksQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQSxBQUFDLElBQ3ZFLElBQUksQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQSxBQUFDLENBQUM7R0FDNUU7O0FBRUQsVUFBUSxFQUFFLGtCQUFVLEdBQUcsRUFBRTtBQUN2QixXQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsUUFBUSxJQUFLLEdBQUcsS0FBSyxNQUFNLENBQUMsQUFBQyxDQUFDO0dBQzdDOztBQUVELFVBQVEsRUFBRSxrQkFBVSxFQUFFLEVBQUU7QUFDdEIsV0FBTztBQUNMLFVBQUksRUFBRSxFQUFFLENBQUMsVUFBVTtBQUNuQixTQUFHLEVBQUcsRUFBRSxDQUFDLFNBQVM7S0FDbkIsQ0FBQztHQUNIOzs7QUFHRCxRQUFNLEVBQUUsZ0JBQVUsRUFBRSxFQUFFO0FBQ3BCLFFBQUksRUFBRSxHQUFHLENBQUM7UUFDTixFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ1gsUUFBSSxFQUFFLENBQUMsWUFBWSxFQUFFO0FBQ25CLFNBQUc7QUFDRCxVQUFFLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQztBQUNwQixVQUFFLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztPQUNwQixRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsWUFBWSxFQUFFO0tBQ2hDO0FBQ0QsV0FBTztBQUNMLFVBQUksRUFBRSxFQUFFO0FBQ1IsU0FBRyxFQUFHLEVBQUU7S0FDVCxDQUFDO0dBQ0g7O0FBRUQsbUJBQWlCLEVBQUUsMkJBQVUsRUFBRSxFQUFFO0FBQy9CLFdBQU8sRUFBRSxDQUFDLFVBQVUsRUFBRTtBQUNwQixRQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUMvQjtHQUNGOzs7QUFHRCxlQUFhLEVBQUUsdUJBQVUsR0FBRyxFQUFFO0FBQzVCLFFBQUksSUFBSSxHQUFTLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDL0MsUUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUM7QUFDckIsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0dBQ3hCOztBQUVELGFBQVcsRUFBRSxxQkFBVSxVQUFVLEVBQUUsRUFBRSxFQUFFO0FBQ3JDLFFBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO1FBQzFDLFFBQVEsR0FBSSxFQUFFLENBQUMsVUFBVSxDQUFDOztBQUU5QixhQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzFCLFlBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEMsV0FBTyxTQUFTLENBQUM7R0FDbEI7OztBQUdELFNBQU8sRUFBRSxpQkFBVSxFQUFFLEVBQUUsUUFBUSxFQUFFO0FBQy9CLFFBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUM7QUFDOUcsV0FBTyxFQUFFLEVBQUU7QUFDVCxVQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUU7QUFDdEMsZUFBTyxFQUFFLENBQUM7T0FDWCxNQUFNO0FBQ0wsVUFBRSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUM7T0FDdkI7S0FDRjtBQUNELFdBQU8sS0FBSyxDQUFDO0dBQ2Q7OztBQUdELFVBQVEsRUFBRSxrQkFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFO0FBQ2pDLFFBQUksRUFBRSxDQUFDLFNBQVMsRUFBRTtBQUNoQixRQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNsQyxNQUFNO0FBQ0wsVUFBSSxNQUFNLENBQUMsT0FBTyxHQUFHLFNBQVMsR0FBRyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNwRTtHQUNGOztBQUVELFVBQVEsRUFBRSxrQkFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFO0FBQ2pDLFFBQUksRUFBRSxDQUFDLFNBQVMsRUFBRTtBQUNoQixRQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUM3QixNQUFNO0FBQ0wsUUFBRSxDQUFDLFNBQVMsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQ2pDO0dBQ0Y7O0FBRUQsYUFBVyxFQUFFLHFCQUFVLEVBQUUsRUFBRSxTQUFTLEVBQUU7QUFDcEMsUUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFO0FBQ2hCLFFBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2hDLE1BQU07QUFDTCxRQUFFLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDcEg7R0FDRjs7QUFFRCxhQUFXLEVBQUUscUJBQVUsRUFBRSxFQUFFLFNBQVMsRUFBRTtBQUNwQyxRQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFO0FBQ2hDLFVBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0tBQ2pDLE1BQU07QUFDTCxVQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztLQUM5QjtHQUNGOzs7QUFHRCxVQUFRLEVBQUUsa0JBQVUsRUFBRSxFQUFFLEtBQUssRUFBRTtBQUM3QixRQUFJLEdBQUcsRUFBRSxJQUFJLENBQUM7QUFDZCxTQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUU7QUFDakIsVUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzdCLFVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQzVCO0tBQ0Y7QUFDRCxXQUFPLEVBQUUsQ0FBQztHQUNYOzs7OztBQUtELG9CQUFrQixFQUFFLDRCQUFVLE1BQU0sRUFBRTtBQUNwQyxRQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNO1FBQzNDLE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxLQUFLO1FBQ3pDLEtBQUssR0FBSSxNQUFNLEdBQUcsTUFBTSxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUM7O0FBRS9DLFFBQUksTUFBTSxDQUFDLFFBQVEsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRTtBQUM5QyxXQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztLQUN6Qjs7QUFFRCxRQUFJLE1BQU0sQ0FBQyxRQUFRLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUU7QUFDOUMsV0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7S0FDekI7O0FBRUQsV0FBTyxLQUFLLENBQUM7R0FDZDs7Ozs7QUFLRCxzQkFBb0IsRUFBRSw4QkFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFO0FBQ3ZDLFdBQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUNoRTs7QUFFRCx5QkFBdUIsRUFBRSxpQ0FBVSxFQUFFLEVBQUU7QUFDckMsUUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLFdBQVc7UUFDeEIsR0FBRyxHQUFHLE1BQU0sQ0FBQyxVQUFVO1FBQ3ZCLEdBQUcsR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUU7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNO1FBQ2hCLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDOztBQUVwQixNQUFFLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxBQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUssR0FBRyxHQUFHLENBQUMsQUFBQyxHQUFHLElBQUksQ0FBQztBQUM3QyxNQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBSSxBQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUssR0FBRyxHQUFHLENBQUMsQUFBQyxHQUFHLElBQUksQ0FBQztHQUM5Qzs7Ozs7OztBQU9ELGlCQUFlLEVBQUUseUJBQVUsRUFBRSxFQUFFO0FBQzdCLFFBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQzdCLFdBQVc7UUFBRSxRQUFRO1FBQUUsU0FBUyxDQUFDOztBQUVyQyxlQUFXLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3RSxZQUFRLEdBQU0sS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMxRSxhQUFTLEdBQUssS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7QUFFM0UsZUFBVyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3RDLFlBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNuQyxhQUFTLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7O0FBRXJDLFdBQU8sT0FBTyxDQUFDOztBQUVmLGFBQVMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFO0FBQ2hDLGFBQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO0tBQy9DOztBQUVELGFBQVMsaUJBQWlCLENBQUMsTUFBTSxFQUFFO0FBQ2pDLFVBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxhQUFhO1VBQUUsR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUN6QyxVQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7QUFDWixXQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7T0FDakM7QUFDRCxhQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0tBQ3RDOztBQUVELGFBQVMsYUFBYSxDQUFDLE1BQU0sRUFBRTtBQUM3QixVQUFJLElBQUksR0FBRyxTQUFTLENBQUM7QUFDckIsVUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0FBQy9CLFlBQUksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO09BQ3BDLE1BQU0sSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3BDLFlBQUksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ2xDO0FBQ0QsYUFBTyxJQUFJLENBQUM7S0FDYjtHQUNGOztDQUVGLENBQUM7OztBQ2hORixNQUFNLENBQUMsT0FBTyxHQUFHOzs7Ozs7QUFNZixvQkFBa0IsRUFBRSw0QkFBVSxFQUFFLEVBQUU7QUFDaEMsYUFBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUU7QUFDaEIsU0FBRyxFQUFFO0FBQ0gsbUJBQVcsRUFBUSxHQUFHO0FBQ3RCLHlCQUFpQixFQUFFLFNBQVM7T0FDN0I7S0FDRixDQUFDLENBQUM7R0FDSjs7Ozs7O0FBTUQsa0JBQWdCLEVBQUUsMEJBQVUsRUFBRSxFQUFFO0FBQzlCLGFBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO0FBQ2hCLFNBQUcsRUFBRTtBQUNILHNCQUFjLEVBQU0sYUFBYTtBQUNqQywwQkFBa0IsRUFBRSxRQUFRO0FBQzVCLHVCQUFlLEVBQUssU0FBUztPQUM5QjtLQUNGLENBQUMsQ0FBQztHQUNKOzs7Ozs7QUFNRCx3QkFBc0IsRUFBRSxnQ0FBVSxFQUFFLEVBQUU7QUFDcEMsYUFBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUU7QUFDaEIsU0FBRyxFQUFFO0FBQ0gsc0JBQWMsRUFBUSxhQUFhO0FBQ25DLDBCQUFrQixFQUFJLFFBQVE7QUFDOUIsNEJBQW9CLEVBQUUsR0FBRztBQUN6Qix1QkFBZSxFQUFPLFNBQVM7T0FDaEM7S0FDRixDQUFDLENBQUM7R0FDSjs7Q0FFRixDQUFDOzs7QUM1Q0YsSUFBSSxpQkFBaUIsR0FBRyxTQUFwQixpQkFBaUIsR0FBZTs7QUFFbEMsTUFBSSxlQUFlLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7O0FBRWxELFdBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtBQUN4QyxXQUFPLGVBQWUsQ0FBQyxHQUFHLENBQUM7QUFDekIsV0FBSyxFQUFJLEtBQUs7QUFDZCxhQUFPLEVBQUUsS0FBSyxHQUFHLE9BQU8sR0FBRyxNQUFNO0FBQ2pDLFVBQUksRUFBSyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTTtBQUN0QyxXQUFLLEVBQUksS0FBSztBQUNkLFdBQUssRUFBSSxHQUFHO0FBQ1osYUFBTyxFQUFFLENBQ1A7QUFDRSxhQUFLLEVBQUksT0FBTztBQUNoQixVQUFFLEVBQU8sT0FBTztBQUNoQixZQUFJLEVBQUssRUFBRTtBQUNYLFlBQUksRUFBSyxPQUFPO0FBQ2hCLGVBQU8sRUFBRSxFQUFFO09BQ1osQ0FDRjtLQUNGLENBQUMsQ0FBQztHQUNKOztBQUVELFdBQVMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTtBQUM1QyxXQUFPLGVBQWUsQ0FBQyxHQUFHLENBQUM7QUFDekIsV0FBSyxFQUFJLEtBQUs7QUFDZCxhQUFPLEVBQUUsS0FBSyxHQUFHLE9BQU8sR0FBRyxNQUFNO0FBQ2pDLFVBQUksRUFBSyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTztBQUN2QyxXQUFLLEVBQUksS0FBSztBQUNkLFdBQUssRUFBSSxHQUFHO0FBQ1osYUFBTyxFQUFFLENBQ1A7QUFDRSxhQUFLLEVBQUUsUUFBUTtBQUNmLFVBQUUsRUFBSyxRQUFRO0FBQ2YsWUFBSSxFQUFHLFVBQVU7QUFDakIsWUFBSSxFQUFHLE9BQU87T0FDZixFQUNEO0FBQ0UsYUFBSyxFQUFJLFNBQVM7QUFDbEIsVUFBRSxFQUFPLFNBQVM7QUFDbEIsWUFBSSxFQUFLLFVBQVU7QUFDbkIsWUFBSSxFQUFLLE9BQU87QUFDaEIsZUFBTyxFQUFFLElBQUk7T0FDZCxDQUNGO0tBQ0YsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsV0FBUyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFO0FBQzNDLFdBQU8sZUFBZSxDQUFDLEdBQUcsQ0FBQztBQUN6QixXQUFLLEVBQUksS0FBSztBQUNkLGFBQU8sRUFBRSwrQ0FBK0MsR0FBRyxPQUFPLEdBQUcsMElBQTBJO0FBQy9NLFVBQUksRUFBSyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTztBQUN2QyxXQUFLLEVBQUksS0FBSztBQUNkLFdBQUssRUFBSSxHQUFHO0FBQ1osYUFBTyxFQUFFLENBQ1A7QUFDRSxhQUFLLEVBQUUsUUFBUTtBQUNmLFVBQUUsRUFBSyxRQUFRO0FBQ2YsWUFBSSxFQUFHLFVBQVU7QUFDakIsWUFBSSxFQUFHLE9BQU87T0FDZixFQUNEO0FBQ0UsYUFBSyxFQUFJLFNBQVM7QUFDbEIsVUFBRSxFQUFPLFNBQVM7QUFDbEIsWUFBSSxFQUFLLFVBQVU7QUFDbkIsWUFBSSxFQUFLLE9BQU87QUFDaEIsZUFBTyxFQUFFLElBQUk7T0FDZCxDQUNGO0tBQ0YsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsV0FBUyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTtBQUN2RCxRQUFJLFVBQVUsR0FBRyxzR0FBc0csQ0FBQzs7QUFFeEgsY0FBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsRUFBRTtBQUNoQyxnQkFBVSxJQUFJLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQyxRQUFRLEtBQUssTUFBTSxHQUFHLFVBQVUsR0FBRyxFQUFFLENBQUEsQUFBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQztLQUNsSSxDQUFDLENBQUM7O0FBRUgsY0FBVSxJQUFJLFdBQVcsQ0FBQzs7QUFFMUIsV0FBTyxlQUFlLENBQUMsR0FBRyxDQUFDO0FBQ3pCLFdBQUssRUFBSSxLQUFLO0FBQ2QsYUFBTyxFQUFFLCtDQUErQyxHQUFHLE9BQU8sR0FBRywrQkFBK0IsR0FBRyxVQUFVLEdBQUcsUUFBUTtBQUM1SCxVQUFJLEVBQUssZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU87QUFDdkMsV0FBSyxFQUFJLEtBQUs7QUFDZCxXQUFLLEVBQUksR0FBRztBQUNaLGFBQU8sRUFBRSxDQUNQO0FBQ0UsYUFBSyxFQUFFLFFBQVE7QUFDZixVQUFFLEVBQUssUUFBUTtBQUNmLFlBQUksRUFBRyxVQUFVO0FBQ2pCLFlBQUksRUFBRyxPQUFPO09BQ2YsRUFDRDtBQUNFLGFBQUssRUFBSSxJQUFJO0FBQ2IsVUFBRSxFQUFPLElBQUk7QUFDYixZQUFJLEVBQUssVUFBVTtBQUNuQixZQUFJLEVBQUssT0FBTztBQUNoQixlQUFPLEVBQUUsSUFBSTtPQUNkLENBQ0Y7S0FDRixDQUFDLENBQUM7R0FDSjs7QUFFRCxTQUFPO0FBQ0wsU0FBSyxFQUFJLEtBQUs7QUFDZCxXQUFPLEVBQUUsT0FBTztBQUNoQixVQUFNLEVBQUcsTUFBTTtBQUNmLFVBQU0sRUFBRyxNQUFNO0dBQ2hCLENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQzs7O0FDbkhyQyxJQUFJLGNBQWMsR0FBRyxTQUFqQixjQUFjLEdBQWU7O0FBRS9CLE1BQUksU0FBUyxHQUFpQixFQUFFO01BQzVCLFFBQVEsR0FBa0IsQ0FBQztNQUMzQixTQUFTLEdBQWlCLElBQUk7TUFDOUIsYUFBYSxHQUFhLEdBQUc7TUFDN0IsTUFBTSxHQUFvQjtBQUN4QixXQUFPLEVBQU0sU0FBUztBQUN0QixlQUFXLEVBQUUsYUFBYTtBQUMxQixXQUFPLEVBQU0sU0FBUztBQUN0QixXQUFPLEVBQU0sU0FBUztBQUN0QixVQUFNLEVBQU8sUUFBUTtHQUN0QjtNQUNELGFBQWEsR0FBYTtBQUN4QixhQUFTLEVBQU0sRUFBRTtBQUNqQixpQkFBYSxFQUFFLHlCQUF5QjtBQUN4QyxhQUFTLEVBQU0scUJBQXFCO0FBQ3BDLGFBQVMsRUFBTSxxQkFBcUI7QUFDcEMsWUFBUSxFQUFPLG9CQUFvQjtHQUNwQztNQUNELFdBQVc7TUFDWCxxQkFBcUIsR0FBSyxtQ0FBbUM7TUFDN0QsdUJBQXVCLEdBQUcscUNBQXFDO01BQy9ELFNBQVMsR0FBaUIsT0FBTyxDQUFDLGdDQUFnQyxDQUFDO01BQ25FLE1BQU0sR0FBb0IsT0FBTyxDQUFDLHFCQUFxQixDQUFDO01BQ3hELFlBQVksR0FBYyxPQUFPLENBQUMscUNBQXFDLENBQUM7TUFDeEUsU0FBUyxHQUFpQixPQUFPLENBQUMsa0NBQWtDLENBQUM7TUFDckUsZUFBZSxHQUFXLE9BQU8sQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDOzs7Ozs7QUFNbEYsV0FBUyxVQUFVLENBQUMsSUFBSSxFQUFFO0FBQ3hCLGVBQVcsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQzdDOzs7Ozs7O0FBT0QsV0FBUyxHQUFHLENBQUMsT0FBTyxFQUFFO0FBQ3BCLFFBQUksSUFBSSxHQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLE9BQU87UUFDdkMsTUFBTSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0FBR3RDLGFBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdkIsZUFBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDeEMsNEJBQXdCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQyxvQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7QUFFekIsbUJBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7OztBQUd2RCxhQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7QUFDNUIsU0FBRyxFQUFFO0FBQ0gsY0FBTSxFQUFFLFNBQVM7QUFDakIsYUFBSyxFQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssR0FBRyxhQUFhO09BQ3REO0tBQ0YsQ0FBQyxDQUFDOzs7QUFHSCxhQUFTLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7QUFHbEQsYUFBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEVBQUUsRUFBRTtBQUNoQyxZQUFNLEVBQUcsTUFBTTtBQUNmLGFBQU8sRUFBRSxtQkFBWTtBQUNuQixpQkFBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7T0FDOUI7S0FDRixDQUFDLENBQUM7OztBQUdILGdCQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7QUFHN0IsUUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO0FBQ2pCLFlBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNqQzs7QUFFRCxXQUFPLE1BQU0sQ0FBQyxFQUFFLENBQUM7R0FDbEI7Ozs7Ozs7QUFPRCxXQUFTLHdCQUF3QixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7QUFDL0MsUUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO0FBQ3RCLGVBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ2xEO0dBQ0Y7Ozs7Ozs7QUFPRCxXQUFTLGVBQWUsQ0FBQyxPQUFPLEVBQUU7QUFDaEMsUUFBSSxFQUFFLEdBQUksaUJBQWlCLEdBQUcsQ0FBQyxRQUFRLEdBQUUsQ0FBRSxRQUFRLEVBQUU7UUFDakQsR0FBRyxHQUFHO0FBQ0osYUFBTyxFQUFFLE9BQU87QUFDaEIsUUFBRSxFQUFPLEVBQUU7QUFDWCxXQUFLLEVBQUksT0FBTyxDQUFDLEtBQUs7QUFDdEIsYUFBTyxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsK0JBQStCLEVBQUU7QUFDNUQsVUFBRSxFQUFPLEVBQUU7QUFDWCxhQUFLLEVBQUksT0FBTyxDQUFDLEtBQUs7QUFDdEIsZUFBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO09BQ3pCLENBQUM7QUFDRixhQUFPLEVBQUUsRUFBRTtLQUNaLENBQUM7O0FBRU4sV0FBTyxHQUFHLENBQUM7R0FDWjs7Ozs7O0FBTUQsV0FBUyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUU7QUFDaEMsUUFBSSxVQUFVLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7OztBQUd4QyxRQUFJLENBQUMsVUFBVSxFQUFFO0FBQ2YsZ0JBQVUsR0FBRyxDQUFDO0FBQ1osYUFBSyxFQUFFLE9BQU87QUFDZCxZQUFJLEVBQUcsRUFBRTtBQUNULFlBQUksRUFBRyxPQUFPO0FBQ2QsVUFBRSxFQUFLLGVBQWU7T0FDdkIsQ0FBQyxDQUFDO0tBQ0o7O0FBRUQsUUFBSSxlQUFlLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQzs7QUFFdEUsYUFBUyxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDOztBQUU3QyxjQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsVUFBVSxDQUFDLFNBQVMsRUFBRTtBQUNoRCxlQUFTLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUM7O0FBRXJELFVBQUksUUFBUSxDQUFDOztBQUViLFVBQUksU0FBUyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUNwQyxnQkFBUSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQUM7T0FDbEUsTUFBTTtBQUNMLGdCQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsQ0FBQztPQUNwRTs7QUFFRCxxQkFBZSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7QUFFdEMsVUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQy9FLFNBQVMsQ0FBQyxZQUFZO0FBQ3JCLFlBQUksU0FBUyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUN2QyxjQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUU7QUFDckIscUJBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7V0FDMUQ7U0FDRjtBQUNELGNBQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDbkIsQ0FBQyxDQUFDO0FBQ0wsWUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDaEMsQ0FBQyxDQUFDO0dBRUo7Ozs7Ozs7QUFPRCxXQUFTLGVBQWUsQ0FBQyxLQUFLLEVBQUU7QUFDOUIsV0FBTyxTQUFTLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUM3RDs7Ozs7O0FBTUQsV0FBUyxNQUFNLENBQUMsRUFBRSxFQUFFO0FBQ2xCLFFBQUksR0FBRyxHQUFHLGVBQWUsQ0FBQyxFQUFFLENBQUM7UUFDekIsTUFBTSxDQUFDOztBQUVYLFFBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQ1osWUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN4QixtQkFBYSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUMvQjtHQUNGOzs7Ozs7QUFNRCxXQUFTLFlBQVksQ0FBQyxFQUFFLEVBQUU7QUFDeEIsYUFBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBQ3pELGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRTtBQUNwQixXQUFLLEVBQU0sQ0FBQztBQUNaLGVBQVMsRUFBRSxDQUFDO0FBQ1osV0FBSyxFQUFNLENBQUM7QUFDWixVQUFJLEVBQU8sSUFBSSxDQUFDLE9BQU87S0FDeEIsQ0FBQyxDQUFDO0dBQ0o7Ozs7OztBQU1ELFdBQVMsYUFBYSxDQUFDLEVBQUUsRUFBRTtBQUN6QixhQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUU7QUFDckIsV0FBSyxFQUFNLENBQUM7QUFDWixlQUFTLEVBQUUsQ0FBQyxFQUFFO0FBQ2QsV0FBSyxFQUFNLElBQUk7QUFDZixVQUFJLEVBQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsc0JBQVk7QUFDOUMsK0JBQXVCLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDN0I7S0FDRixDQUFDLENBQUM7R0FDSjs7Ozs7O0FBTUQsV0FBUyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUU7QUFDbkMsUUFBSSxHQUFHLEdBQU0sZUFBZSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFNUIsVUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxNQUFNLEVBQUU7QUFDdkMsWUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0tBQ2xCLENBQUMsQ0FBQzs7QUFFSCxhQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7O0FBRXpDLGVBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRTVCLGFBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDdEIsYUFBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7O0FBRXpCLG9CQUFnQixFQUFFLENBQUM7R0FDcEI7Ozs7O0FBS0QsV0FBUyxnQkFBZ0IsR0FBRztBQUMxQixRQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7O0FBRXBCLGFBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxNQUFNLEVBQUU7QUFDbEMsVUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLElBQUksRUFBRTtBQUN6QixlQUFPLEdBQUcsSUFBSSxDQUFDO09BQ2hCO0tBQ0YsQ0FBQyxDQUFDOztBQUVILFFBQUksQ0FBQyxPQUFPLEVBQUU7QUFDWixZQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ25CO0dBQ0Y7Ozs7Ozs7QUFPRCxXQUFTLGVBQWUsQ0FBQyxFQUFFLEVBQUU7QUFDM0IsV0FBTyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxFQUFFO0FBQ3BDLGFBQU8sS0FBSyxDQUFDLEVBQUUsQ0FBQztLQUNqQixDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQ2hCOzs7Ozs7O0FBT0QsV0FBUyxVQUFVLENBQUMsRUFBRSxFQUFFO0FBQ3RCLFdBQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN2QyxhQUFPLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDO0tBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNQOztBQUVELFdBQVMsUUFBUSxHQUFHO0FBQ2xCLFdBQU8sTUFBTSxDQUFDO0dBQ2Y7O0FBRUQsU0FBTztBQUNMLGNBQVUsRUFBRSxVQUFVO0FBQ3RCLE9BQUcsRUFBUyxHQUFHO0FBQ2YsVUFBTSxFQUFNLE1BQU07QUFDbEIsUUFBSSxFQUFRLFFBQVE7R0FDckIsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxjQUFjLEVBQUUsQ0FBQzs7O0FDblNsQyxJQUFJLGNBQWMsR0FBRyxTQUFqQixjQUFjLEdBQWU7O0FBRS9CLE1BQUksV0FBVyxHQUFJLFFBQVE7TUFDdkIsYUFBYTtNQUNiLGtCQUFrQjtNQUNsQixtQkFBbUI7TUFDbkIsaUJBQWlCO01BQ2pCLFVBQVU7TUFDVixlQUFlO01BQ2YsWUFBWSxHQUFHLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDOztBQUVsRSxXQUFTLFVBQVUsR0FBRzs7QUFFcEIsY0FBVSxHQUFHLElBQUksQ0FBQzs7QUFFbEIsaUJBQWEsR0FBUyxXQUFXLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ2pFLHNCQUFrQixHQUFJLFdBQVcsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUN0RSx1QkFBbUIsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDLENBQUM7O0FBRXhFLFFBQUksWUFBWSxHQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQy9GLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7O0FBRXJHLHFCQUFpQixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUNwRSxTQUFTLENBQUMsWUFBWTtBQUNyQixrQkFBWSxFQUFFLENBQUM7S0FDaEIsQ0FBQyxDQUFDOztBQUVMLFFBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUNiOztBQUVELFdBQVMsWUFBWSxHQUFHO0FBQ3RCLFdBQU8sVUFBVSxDQUFDO0dBQ25COztBQUVELFdBQVMsWUFBWSxHQUFHO0FBQ3RCLFFBQUksZUFBZSxFQUFFO0FBQ25CLGFBQU87S0FDUjtBQUNELFFBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNaOztBQUVELFdBQVMsY0FBYyxDQUFDLGFBQWEsRUFBRTtBQUNyQyxjQUFVLEdBQUssSUFBSSxDQUFDO0FBQ3BCLFFBQUksUUFBUSxHQUFHLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0FBQ3hDLGFBQVMsQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRTtBQUNwQyxlQUFTLEVBQUUsQ0FBQztBQUNaLFVBQUksRUFBTyxJQUFJLENBQUMsT0FBTztLQUN4QixDQUFDLENBQUM7QUFDSCxhQUFTLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLFFBQVEsRUFBRTtBQUN6QyxXQUFLLEVBQUUsQ0FBQztBQUNSLFVBQUksRUFBRyxJQUFJLENBQUMsT0FBTztLQUNwQixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLElBQUksQ0FBQyxhQUFhLEVBQUU7QUFDM0IsUUFBSSxVQUFVLEVBQUU7QUFDZCxhQUFPO0tBQ1I7O0FBRUQsbUJBQWUsR0FBRyxLQUFLLENBQUM7O0FBRXhCLGtCQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7O0FBRTlCLGFBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBQ3pELGFBQVMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFO0FBQ25DLGVBQVMsRUFBRSxDQUFDO0FBQ1osV0FBSyxFQUFNLENBQUM7QUFDWixVQUFJLEVBQU8sTUFBTSxDQUFDLE9BQU87QUFDekIsV0FBSyxFQUFNLENBQUM7S0FDYixDQUFDLENBQUM7R0FDSjs7Ozs7O0FBTUQsV0FBUyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUU7QUFDekMsUUFBSSxVQUFVLEVBQUU7QUFDZCxhQUFPO0tBQ1I7O0FBRUQsbUJBQWUsR0FBRyxJQUFJLENBQUM7O0FBRXZCLGtCQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDOUIsYUFBUyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztHQUN0RDs7QUFFRCxXQUFTLElBQUksQ0FBQyxhQUFhLEVBQUU7QUFDM0IsUUFBSSxDQUFDLFVBQVUsRUFBRTtBQUNmLGFBQU87S0FDUjtBQUNELGNBQVUsR0FBUSxLQUFLLENBQUM7QUFDeEIsbUJBQWUsR0FBRyxLQUFLLENBQUM7QUFDeEIsUUFBSSxRQUFRLEdBQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUM7QUFDM0MsYUFBUyxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDbEQsYUFBUyxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFO0FBQ3BDLGVBQVMsRUFBRSxDQUFDO0FBQ1osVUFBSSxFQUFPLElBQUksQ0FBQyxPQUFPO0tBQ3hCLENBQUMsQ0FBQztBQUNILGFBQVMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxHQUFHLENBQUMsRUFBRTtBQUM5QyxlQUFTLEVBQUUsQ0FBQztBQUNaLFVBQUksRUFBTyxJQUFJLENBQUMsT0FBTztLQUN4QixDQUFDLENBQUM7R0FFSjs7QUFFRCxXQUFTLFVBQVUsQ0FBQyxPQUFPLEVBQUU7QUFDM0IsUUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUU7QUFDOUIsYUFBTyxDQUFDLEdBQUcsQ0FBQyxnRkFBZ0YsQ0FBQyxDQUFDO0FBQzlGLGFBQU8sR0FBRyxDQUFDLENBQUM7S0FDYjtBQUNELGFBQVMsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxFQUFFO0FBQ3JDLFdBQUssRUFBRSxPQUFPO0FBQ2QsVUFBSSxFQUFHLElBQUksQ0FBQyxPQUFPO0tBQ3BCLENBQUMsQ0FBQztHQUNKOztBQUVELFdBQVMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3pCLGFBQVMsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxFQUFFO0FBQ3JDLHFCQUFlLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRztBQUNyRCxVQUFJLEVBQWEsSUFBSSxDQUFDLE9BQU87S0FDOUIsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsU0FBTztBQUNMLGNBQVUsRUFBVSxVQUFVO0FBQzlCLFFBQUksRUFBZ0IsSUFBSTtBQUN4QixzQkFBa0IsRUFBRSxrQkFBa0I7QUFDdEMsUUFBSSxFQUFnQixJQUFJO0FBQ3hCLFdBQU8sRUFBYSxZQUFZO0FBQ2hDLGNBQVUsRUFBVSxVQUFVO0FBQzlCLFlBQVEsRUFBWSxRQUFRO0dBQzdCLENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsY0FBYyxFQUFFLENBQUM7OztBQ3hJbEMsSUFBSSxTQUFTLEdBQUcsU0FBWixTQUFTLEdBQWU7O0FBRTFCLE1BQUksU0FBUyxHQUFnQixFQUFFO01BQzNCLFFBQVEsR0FBaUIsQ0FBQztNQUMxQixzQkFBc0IsR0FBRyxJQUFJO01BQzdCLE1BQU0sR0FBbUI7QUFDdkIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsZUFBVyxFQUFFLGFBQWE7QUFDMUIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsVUFBTSxFQUFPLFFBQVE7R0FDdEI7TUFDRCxhQUFhLEdBQVk7QUFDdkIsYUFBUyxFQUFNLEVBQUU7QUFDakIsaUJBQWEsRUFBRSxvQkFBb0I7QUFDbkMsYUFBUyxFQUFNLGdCQUFnQjtBQUMvQixhQUFTLEVBQU0sZ0JBQWdCO0FBQy9CLFlBQVEsRUFBTyxlQUFlO0dBQy9CO01BQ0QsV0FBVztNQUNYLFNBQVMsR0FBZ0IsT0FBTyxDQUFDLGdDQUFnQyxDQUFDO01BQ2xFLFlBQVksR0FBYSxPQUFPLENBQUMscUNBQXFDLENBQUM7TUFDdkUsU0FBUyxHQUFnQixPQUFPLENBQUMsa0NBQWtDLENBQUM7TUFDcEUsZUFBZSxHQUFVLE9BQU8sQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDOztBQUVqRixXQUFTLFVBQVUsQ0FBQyxJQUFJLEVBQUU7QUFDeEIsZUFBVyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDN0M7OztBQUdELFdBQVMsR0FBRyxDQUFDLE9BQU8sRUFBRTtBQUNwQixXQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQzs7QUFFOUMsUUFBSSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRWpFLGFBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRXpCLGVBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRW5FLDRCQUF3QixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUV6RCxtQkFBZSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2hELG1CQUFlLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUVuRCxRQUFJLFFBQVEsR0FBVyxRQUFRLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNuRixhQUFhLEdBQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3JGLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUM7O0FBRXRFLFlBQVEsQ0FBQyxtQkFBbUIsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ3hGLFNBQVMsQ0FBQyxZQUFZO0FBQ3JCLFlBQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDckIsQ0FBQyxDQUFDOztBQUVMLGdCQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUUvQixXQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUM7R0FDcEI7O0FBRUQsV0FBUyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO0FBQy9DLFFBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUN0QixlQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNsRDtHQUNGOztBQUVELFdBQVMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRTtBQUN6QyxRQUFJLEVBQUUsR0FBSSxzQkFBc0IsR0FBRyxDQUFDLFFBQVEsR0FBRSxDQUFFLFFBQVEsRUFBRTtRQUN0RCxHQUFHLEdBQUc7QUFDSixRQUFFLEVBQW1CLEVBQUU7QUFDdkIsYUFBTyxFQUFjLFNBQVMsQ0FBQyxTQUFTLENBQUMsNEJBQTRCLEVBQUU7QUFDckUsVUFBRSxFQUFPLEVBQUU7QUFDWCxhQUFLLEVBQUksS0FBSztBQUNkLGVBQU8sRUFBRSxPQUFPO09BQ2pCLENBQUM7QUFDRix5QkFBbUIsRUFBRSxJQUFJO0tBQzFCLENBQUM7O0FBRU4sV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFRCxXQUFTLE1BQU0sQ0FBQyxFQUFFLEVBQUU7QUFDbEIsUUFBSSxHQUFHLEdBQUcsZUFBZSxDQUFDLEVBQUUsQ0FBQztRQUN6QixLQUFLLENBQUM7O0FBRVYsUUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUU7QUFDWixXQUFLLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLGVBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNmLG1CQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzlCO0dBQ0Y7O0FBRUQsV0FBUyxZQUFZLENBQUMsRUFBRSxFQUFFO0FBQ3hCLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBQ2hDLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDO0FBQ3BELGFBQVMsRUFBRSxDQUFDO0dBQ2I7O0FBRUQsV0FBUyxhQUFhLENBQUMsRUFBRSxFQUFFO0FBQ3pCLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtBQUNyQixlQUFTLEVBQUUsQ0FBQyxFQUFFO0FBQ2QsV0FBSyxFQUFNLENBQUM7QUFDWixVQUFJLEVBQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsc0JBQVk7QUFDOUMsK0JBQXVCLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDN0I7S0FDRixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLHVCQUF1QixDQUFDLEVBQUUsRUFBRTtBQUNuQyxRQUFJLEdBQUcsR0FBVSxlQUFlLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRCxRQUFRLEdBQUssU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUVoQyxZQUFRLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7O0FBRXZDLGVBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUIsYUFBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUN0QixhQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUMxQjs7QUFFRCxXQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUU7QUFDekIsUUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQ3hCLE9BQU87UUFDUCxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUVWLFdBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2xCLFVBQUksQ0FBQyxLQUFLLE1BQU0sRUFBRTtBQUNoQixpQkFBUztPQUNWO0FBQ0QsYUFBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixlQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUM7QUFDbEUsT0FBQyxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztLQUN4QztHQUNGOztBQUVELFdBQVMsZUFBZSxDQUFDLEVBQUUsRUFBRTtBQUMzQixXQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEVBQUU7QUFDcEMsYUFBTyxLQUFLLENBQUMsRUFBRSxDQUFDO0tBQ2pCLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7R0FDaEI7O0FBRUQsV0FBUyxRQUFRLEdBQUc7QUFDbEIsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFRCxTQUFPO0FBQ0wsY0FBVSxFQUFFLFVBQVU7QUFDdEIsT0FBRyxFQUFTLEdBQUc7QUFDZixVQUFNLEVBQU0sTUFBTTtBQUNsQixRQUFJLEVBQVEsUUFBUTtHQUNyQixDQUFDO0NBRUgsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLFNBQVMsRUFBRSxDQUFDOzs7QUN2SjdCLElBQUksV0FBVyxHQUFHLFNBQWQsV0FBVyxHQUFlOztBQUU1QixNQUFJLFNBQVMsR0FBTyxFQUFFO01BQ2xCLFFBQVEsR0FBUSxDQUFDO01BQ2pCLGFBQWEsR0FBRyxHQUFHO01BQ25CLE1BQU0sR0FBVTtBQUNkLFdBQU8sRUFBTSxTQUFTO0FBQ3RCLGVBQVcsRUFBRSxhQUFhO0FBQzFCLFdBQU8sRUFBTSxTQUFTO0FBQ3RCLFdBQU8sRUFBTSxTQUFTO0FBQ3RCLFVBQU0sRUFBTyxRQUFRO0FBQ3JCLGFBQVMsRUFBSSxXQUFXO0dBQ3pCO01BQ0QsYUFBYSxHQUFHO0FBQ2QsYUFBUyxFQUFNLEVBQUU7QUFDakIsaUJBQWEsRUFBRSxzQkFBc0I7QUFDckMsYUFBUyxFQUFNLGtCQUFrQjtBQUNqQyxhQUFTLEVBQU0sa0JBQWtCO0FBQ2pDLFlBQVEsRUFBTyxpQkFBaUI7QUFDaEMsZUFBVyxFQUFJLG9CQUFvQjtHQUNwQztNQUNELFVBQVUsR0FBTTtBQUNkLEtBQUMsRUFBRyxHQUFHO0FBQ1AsTUFBRSxFQUFFLElBQUk7QUFDUixLQUFDLEVBQUcsR0FBRztBQUNQLE1BQUUsRUFBRSxJQUFJO0FBQ1IsS0FBQyxFQUFHLEdBQUc7QUFDUCxNQUFFLEVBQUUsSUFBSTtBQUNSLEtBQUMsRUFBRyxHQUFHO0FBQ1AsTUFBRSxFQUFFLElBQUk7R0FDVDtNQUNELFlBQVksR0FBSTtBQUNkLE9BQUcsRUFBRyxjQUFjO0FBQ3BCLFFBQUksRUFBRSxtQkFBbUI7QUFDekIsT0FBRyxFQUFHLGdCQUFnQjtBQUN0QixRQUFJLEVBQUUsc0JBQXNCO0FBQzVCLE9BQUcsRUFBRyxpQkFBaUI7QUFDdkIsUUFBSSxFQUFFLHFCQUFxQjtBQUMzQixPQUFHLEVBQUcsZUFBZTtBQUNyQixRQUFJLEVBQUUsa0JBQWtCO0dBQ3pCO01BQ0QsV0FBVztNQUNYLFNBQVMsR0FBTyxPQUFPLENBQUMsZ0NBQWdDLENBQUM7TUFDekQsU0FBUyxHQUFPLE9BQU8sQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDOztBQUVoRSxXQUFTLFVBQVUsQ0FBQyxJQUFJLEVBQUU7QUFDeEIsZUFBVyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDN0M7OztBQUdELFdBQVMsR0FBRyxDQUFDLE9BQU8sRUFBRTtBQUNwQixXQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQzs7QUFFOUMsUUFBSSxVQUFVLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEtBQUssRUFDaEQsT0FBTyxDQUFDLE9BQU8sRUFDZixPQUFPLENBQUMsUUFBUSxFQUNoQixPQUFPLENBQUMsUUFBUSxFQUNoQixPQUFPLENBQUMsTUFBTSxFQUNkLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFFekIsYUFBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMzQixlQUFXLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFFNUMsY0FBVSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoRSw0QkFBd0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU3RSxhQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7QUFDaEMsU0FBRyxFQUFFO0FBQ0gsaUJBQVMsRUFBRSxVQUFVLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQzNDLGFBQUssRUFBTSxPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsYUFBYTtPQUN6RDtLQUNGLENBQUMsQ0FBQzs7O0FBR0gsY0FBVSxDQUFDLEtBQUssR0FBSSxVQUFVLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUMsS0FBSyxDQUFDO0FBQ3JFLGNBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLE1BQU0sQ0FBQzs7QUFFdEUsMEJBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkMsbUJBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFFNUIsUUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQ2hGLDJCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQ25DOztBQUVELFFBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRTtBQUNoRiw2QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNyQzs7QUFFRCxXQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUM7R0FDM0I7O0FBRUQsV0FBUyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRTtBQUN6RCxRQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDdEIsZUFBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDbEQ7QUFDRCxhQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztHQUNyRDs7QUFFRCxXQUFTLG1CQUFtQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFO0FBQ3BGLFFBQUksRUFBRSxHQUFJLDBCQUEwQixHQUFHLENBQUMsUUFBUSxHQUFFLENBQUUsUUFBUSxFQUFFO1FBQzFELEdBQUcsR0FBRztBQUNKLFFBQUUsRUFBYSxFQUFFO0FBQ2pCLGNBQVEsRUFBTyxRQUFRO0FBQ3ZCLGNBQVEsRUFBTyxNQUFNO0FBQ3JCLG1CQUFhLEVBQUUsYUFBYSxJQUFJLEtBQUs7QUFDckMsWUFBTSxFQUFTLE1BQU0sSUFBSSxFQUFFO0FBQzNCLGtCQUFZLEVBQUcsSUFBSTtBQUNuQixpQkFBVyxFQUFJLElBQUk7QUFDbkIsWUFBTSxFQUFTLENBQUM7QUFDaEIsV0FBSyxFQUFVLENBQUM7QUFDaEIsYUFBTyxFQUFRLFNBQVMsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUU7QUFDakUsVUFBRSxFQUFPLEVBQUU7QUFDWCxhQUFLLEVBQUksS0FBSztBQUNkLGVBQU8sRUFBRSxPQUFPO09BQ2pCLENBQUM7QUFDRixhQUFPLEVBQVEsSUFBSTtLQUNwQixDQUFDOztBQUVOLFdBQU8sR0FBRyxDQUFDO0dBQ1o7O0FBRUQsV0FBUyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUU7QUFDMUMsUUFBSSxVQUFVLENBQUMsYUFBYSxFQUFFO0FBQzVCLGFBQU87S0FDUjs7QUFFRCxjQUFVLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQ2hGLFNBQVMsQ0FBQyxVQUFVLEdBQUcsRUFBRTtBQUN4QixpQkFBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUM1QixDQUFDLENBQUM7O0FBRUwsY0FBVSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUM5RSxTQUFTLENBQUMsVUFBVSxHQUFHLEVBQUU7QUFDeEIsaUJBQVcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDNUIsQ0FBQyxDQUFDO0dBQ047O0FBRUQsV0FBUyxXQUFXLENBQUMsRUFBRSxFQUFFO0FBQ3ZCLFFBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7QUFFaEMsUUFBSSxVQUFVLENBQUMsYUFBYSxFQUFFO0FBQzVCLGFBQU87S0FDUjs7QUFFRCxtQkFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzVCLGdCQUFZLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ2xDOztBQUVELFdBQVMsZUFBZSxDQUFDLFVBQVUsRUFBRTtBQUNuQyxRQUFJLE1BQU0sR0FBSyxVQUFVLENBQUMsTUFBTTtRQUM1QixJQUFJLEdBQU8sQ0FBQztRQUNaLElBQUksR0FBTyxDQUFDO1FBQ1osUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQzs7QUFFM0QsUUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxFQUFFLEVBQUU7QUFDekMsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztBQUN4QyxVQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO0tBQ3pDLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLElBQUksQUFBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBSyxVQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUM7QUFDdkUsVUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7S0FDbEQsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLEVBQUUsRUFBRTtBQUNoRCxVQUFJLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztBQUN0QixVQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO0tBQ3pDLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQy9CLFVBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxJQUFJLEFBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUssVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDO0tBQ3pFLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxFQUFFLEVBQUU7QUFDaEQsVUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFDdEIsVUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7S0FDeEIsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRTtBQUMvQyxVQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksSUFBSSxBQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFLLFVBQVUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQztBQUN2RSxVQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7S0FDakMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLEVBQUUsRUFBRTtBQUNoRCxVQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDO0FBQ3hDLFVBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO0tBQ3hCLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7QUFDakQsVUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLElBQUksQUFBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBSyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUM7S0FDekU7O0FBRUQsYUFBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO0FBQ2hDLE9BQUMsRUFBRSxJQUFJO0FBQ1AsT0FBQyxFQUFFLElBQUk7S0FDUixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLHVCQUF1QixDQUFDLFVBQVUsRUFBRTtBQUMzQyxRQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7QUFDNUQsYUFBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUMsQ0FBQyxFQUFFLEFBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUssVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLEFBQUMsRUFBQyxDQUFDLENBQUM7R0FDekY7O0FBRUQsV0FBUyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUU7QUFDekMsUUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0FBQzVELGFBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFDLENBQUMsRUFBRSxBQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFLLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxBQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQztHQUMvRjs7QUFFRCxXQUFTLFdBQVcsQ0FBQyxFQUFFLEVBQUU7QUFDdkIsUUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDOztBQUVoQyxRQUFJLFVBQVUsQ0FBQyxhQUFhLEVBQUU7QUFDNUIsYUFBTztLQUNSOztBQUVELGlCQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ25DOztBQUVELFdBQVMsWUFBWSxDQUFDLEVBQUUsRUFBRTtBQUN4QixhQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUU7QUFDcEIsZUFBUyxFQUFFLENBQUM7QUFDWixVQUFJLEVBQU8sSUFBSSxDQUFDLE9BQU87S0FDeEIsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsV0FBUyxhQUFhLENBQUMsRUFBRSxFQUFFO0FBQ3pCLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtBQUNyQixlQUFTLEVBQUUsQ0FBQztBQUNaLFVBQUksRUFBTyxJQUFJLENBQUMsT0FBTztLQUN4QixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLE1BQU0sQ0FBQyxFQUFFLEVBQUU7QUFDbEIsbUJBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUU7QUFDN0MsVUFBSSxPQUFPLENBQUMsWUFBWSxFQUFFO0FBQ3hCLGVBQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7T0FDaEM7QUFDRCxVQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUU7QUFDdkIsZUFBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztPQUMvQjs7QUFFRCxlQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU5QyxpQkFBVyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRXpDLFVBQUksR0FBRyxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRXRDLGVBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDdEIsZUFBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDMUIsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsV0FBUyxVQUFVLENBQUMsRUFBRSxFQUFFO0FBQ3RCLFdBQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN2QyxhQUFPLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDO0tBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNQOztBQUVELFdBQVMsZUFBZSxDQUFDLEVBQUUsRUFBRTtBQUMzQixXQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEVBQUU7QUFDcEMsYUFBTyxLQUFLLENBQUMsRUFBRSxDQUFDO0tBQ2pCLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7R0FDaEI7O0FBRUQsV0FBUyxlQUFlLENBQUMsRUFBRSxFQUFFO0FBQzNCLFdBQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN2QyxhQUFPLEtBQUssQ0FBQyxRQUFRLEtBQUssRUFBRSxDQUFDO0tBQzlCLENBQUMsQ0FBQztHQUNKOztBQUVELFdBQVMsUUFBUSxHQUFHO0FBQ2xCLFdBQU8sTUFBTSxDQUFDO0dBQ2Y7O0FBRUQsV0FBUyxZQUFZLEdBQUc7QUFDdEIsV0FBTyxVQUFVLENBQUM7R0FDbkI7O0FBRUQsU0FBTztBQUNMLGNBQVUsRUFBRSxVQUFVO0FBQ3RCLE9BQUcsRUFBUyxHQUFHO0FBQ2YsVUFBTSxFQUFNLE1BQU07QUFDbEIsUUFBSSxFQUFRLFFBQVE7QUFDcEIsWUFBUSxFQUFJLFlBQVk7R0FDekIsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxXQUFXLEVBQUUsQ0FBQzs7O0FDcFIvQixNQUFNLENBQUMsT0FBTyxHQUFHOztBQUVmLFdBQVMsRUFBRSxtQkFBVSxHQUFHLEVBQUU7QUFDeEIsV0FBUSxVQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztNQUFFO0dBQzlCOztBQUVELFdBQVMsRUFBRSxtQkFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQzdCLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUEsQUFBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0dBQzFEOztBQUVELE9BQUssRUFBRSxlQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQzlCLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztHQUMxQzs7QUFFRCxTQUFPLEVBQUUsaUJBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7QUFDaEMsV0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUM7R0FDL0I7O0FBRUQsWUFBVSxFQUFFLG9CQUFVLE1BQU0sRUFBRSxNQUFNLEVBQUU7QUFDcEMsUUFBSSxFQUFFLEdBQUksTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxBQUFDO1FBQ2hDLEVBQUUsR0FBSSxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEFBQUMsQ0FBQztBQUNuQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQUFBQyxFQUFFLEdBQUcsRUFBRSxHQUFLLEVBQUUsR0FBRyxFQUFFLEFBQUMsQ0FBQyxDQUFDO0dBQ3pDOztDQUVGLENBQUM7OztBQ3hCRixNQUFNLENBQUMsT0FBTyxHQUFHOzs7Ozs7Ozs7QUFTZixRQUFNLEVBQUUsZ0JBQVUsR0FBRyxFQUFFO0FBQ3JCLFFBQUksTUFBTSxHQUFHLEtBQUssQ0FBQzs7QUFFbkIsUUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ2xCLGFBQU8sSUFBSSxDQUFDO0tBQ2I7O0FBRUQsU0FBSyxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUU7QUFDcEIsVUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUU7QUFDakQsY0FBTSxHQUFHLElBQUksQ0FBQztPQUNmO0FBQ0QsWUFBTTtLQUNQOztBQUVELFdBQU8sTUFBTSxDQUFDO0dBQ2Y7O0FBRUQsYUFBVyxFQUFFLHFCQUFVLFFBQVEsRUFBRTtBQUMvQixXQUFPLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNyQixhQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQzNFLENBQUM7R0FDSDs7QUFFRCxlQUFhOzs7Ozs7Ozs7O0tBQUUsVUFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtBQUN0QyxRQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDakIsU0FBSyxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUU7QUFDakIsVUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7QUFDOUIsZUFBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztPQUMzRCxNQUFNLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxFQUFFO0FBQ3hDLGVBQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7T0FDbkI7S0FDRjtBQUNELFdBQU8sT0FBTyxDQUFDO0dBQ2hCLENBQUE7O0FBRUQscUJBQW1CLEVBQUUsNkJBQVUsR0FBRyxFQUFFLEdBQUcsRUFBRTtBQUN2QyxRQUFJLENBQUMsR0FBTSxDQUFDO1FBQ1IsSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1FBQ3JCLEdBQUcsR0FBSSxJQUFJLENBQUMsTUFBTSxDQUFDOztBQUV2QixXQUFPLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDbkIsU0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwQjtBQUNELFdBQU8sR0FBRyxDQUFDO0dBQ1o7O0FBRUQsc0JBQW9CLEVBQUUsOEJBQVUsR0FBRyxFQUFFLEVBQUUsRUFBRTtBQUN2QyxRQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtBQUMzQixXQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNuQyxZQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssV0FBVyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFO0FBQ3pGLGlCQUFPLENBQUMsQ0FBQztTQUNWO09BQ0Y7S0FDRjtBQUNELFdBQU8sS0FBSyxDQUFDO0dBQ2Q7OztBQUdELFFBQU0sRUFBRSxnQkFBVSxHQUFHLEVBQUU7QUFDckIsT0FBRyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUM7O0FBRWhCLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3pDLFVBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDakIsaUJBQVM7T0FDVjs7QUFFRCxXQUFLLElBQUksR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUM1QixZQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDcEMsYUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUM5QjtPQUNGO0tBQ0Y7O0FBRUQsV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFRCxZQUFVOzs7Ozs7Ozs7O0tBQUUsVUFBVSxHQUFHLEVBQUU7QUFDekIsT0FBRyxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUM7O0FBRWhCLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3pDLFVBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFdkIsVUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNSLGlCQUFTO09BQ1Y7O0FBRUQsV0FBSyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUU7QUFDbkIsWUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzNCLGNBQUksT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxFQUFFO0FBQ2hDLHNCQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1dBQ2hDLE1BQU07QUFDTCxlQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1dBQ3JCO1NBQ0Y7T0FDRjtLQUNGOztBQUVELFdBQU8sR0FBRyxDQUFDO0dBQ1osQ0FBQTs7Ozs7Ozs7Ozs7QUFXRCxjQUFZLEVBQUUsc0JBQVUsU0FBUyxFQUFFO0FBQ2pDLFFBQUksS0FBSyxHQUFHLFNBQVM7UUFDakIsR0FBRyxHQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUV6QyxRQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUU7QUFDbkMsV0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUU7QUFDeEMsZUFBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztPQUNuQixDQUFDLENBQUM7S0FDSjs7QUFFRCxRQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDakMsV0FBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFO0FBQzNCLFdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQzdCO0tBQ0Y7O0FBRUQsV0FBTyxHQUFHLENBQUM7R0FDWjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFzQ0QsV0FBUyxFQUFFLG1CQUFVLEdBQUcsRUFBRTtBQUN4QixRQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDYixRQUFJLEdBQUcsQ0FBQztBQUNSLFFBQUksRUFBRSxHQUFHLFlBQVksTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQSxBQUFDLEVBQUU7QUFDbkQsWUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0tBQ2hFO0FBQ0QsU0FBSyxHQUFHLElBQUksR0FBRyxFQUFFO0FBQ2YsVUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzNCLFdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7T0FDaEI7S0FDRjtBQUNELFdBQU8sR0FBRyxDQUFDO0dBQ1o7O0NBRUYsQ0FBQzs7Ozs7Ozs7Ozs7QUNuTEYsQ0FBQyxDQUFBLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQVEsSUFBRSxPQUFPLE9BQU8sSUFBRSxXQUFXLElBQUUsT0FBTyxNQUFNLEdBQUMsTUFBTSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUUsR0FBQyxVQUFVLElBQUUsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLEdBQUcsR0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUUsQ0FBQTtDQUFDLENBQUEsQ0FBQyxJQUFJLEVBQUMsWUFBVTtBQUFDLGNBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsQ0FBQyxTQUFTLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLFFBQVEsSUFBRSxPQUFPLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxVQUFVLEtBQUcsQ0FBQyxFQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFdBQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsS0FBSSxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTSxFQUFDLEtBQUssRUFBQyxLQUFLLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLElBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUMsT0FBTSxVQUFVLElBQUUsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLElBQUUsUUFBUSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFFLFFBQVEsRUFBRSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFDamdFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLGNBQWMsR0FBQyxFQUFFLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLFFBQVEsSUFBRSxPQUFPLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsd0VBQXdFLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLCtDQUErQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLFFBQVEsSUFBRSxPQUFPLENBQUMsSUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsZ0VBQWdFLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsVUFBTSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBQztBQUFDLFdBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFNLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxXQUFXLEtBQUcsTUFBTSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxXQUFXLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLFVBQVUsR0FBQyxVQUFVLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQ3BnRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxVQUFVLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsVUFBVSxHQUFFLENBQUMsSUFBRSxVQUFVLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLGFBQWEsR0FBQyxDQUFDLEdBQUMsb0JBQW9CLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsS0FBRyxFQUFFLEtBQUcsRUFBRSxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxFQUFFLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsQ0FBQyxJQUFHLEVBQUUsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBRSxFQUFDO0FBQUMsV0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLG9CQUFvQixJQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsRUFBQyxVQUFVLEdBQUMsRUFBRSxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQSxFQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxVQUFHLEtBQUssQ0FBQyxLQUFHLEVBQUUsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQyxJQUFHLEVBQUUsRUFBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsRUFBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLEVBQUMsWUFBWSxFQUFDLENBQUMsQ0FBQyxFQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLG9CQUFvQixJQUFFLENBQUMsQ0FBQyxvQkFBb0IsS0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBQyxDQUFDLENBQUMsb0JBQW9CLEdBQUMsWUFBVTtBQUFDLGVBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFJO0FBQUMsWUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsUUFBUSxFQUFDLE1BQU0sS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxRQUFPLENBQUMsQ0FBQyxRQUFRLEdBQUUsS0FBSyxDQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLGVBQWUsSUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQSxDQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxNQUFFLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsbURBQW1ELENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsZUFBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pnRSxFQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDO0FBQUMsZ0JBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO1dBQUMsT0FBTyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxFQUFFLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxLQUFLLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGlCQUFPO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztjQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2NBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLEVBQUUsQ0FBQSxDQUFFLFNBQVMsRUFBRSxDQUFDO0FBQzlnRSxLQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGdCQUFPLENBQUMsR0FBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUU7Ozs4QkFBUztVQUFSLENBQUM7VUFBQyxDQUFDO1VBQUMsQ0FBQztVQUFDLENBQUM7QUFBTSxPQUFDLEdBQXlFLENBQUMsR0FBUSxDQUFDLEdBQXFFLENBQUMsR0FBQyxDQUFDLEdBQTRCLENBQUM7O0FBQTdMLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQzthQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Y0FBQyxDQUFDO2NBQUMsQ0FBQztjQUFDLENBQUM7OztPQUFFLElBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsSUFBRSxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGdCQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxDQUFBO1NBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGlCQUFLLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUM7R0FBQSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsRUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRTtBQUFDLGVBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEVBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO1NBQUMsUUFBTSxDQUFDLEVBQUU7QUFDdmdFLGVBQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLENBQUE7S0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUM7S0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGtCQUFNLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO1NBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLElBQUksQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUU7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQUssQ0FBQyxHQUFFO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLEVBQUUsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxBQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7V0FBQyxNQUFLLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7U0FBQyxPQUFPLENBQUMsRUFBRSxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQU0sQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEtBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEFBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUE7S0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUNoZ0UsYUFBTyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBSSxDQUFDLENBQUMsUUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7U0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsSUFBSSxDQUFBO1NBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQTtTQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyx5QkFBeUIsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQ0FBRSxTQUFTLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFBLEdBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxtQ0FBbUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxNQUFJO0FBQUMsVUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQ2pnRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxXQUFXLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxXQUFXLEtBQUcsRUFBRSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsT0FBTyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxFQUFBLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLE1BQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLGFBQWEsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsQ0FBQTtPQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsQ0FBQyxDQUFBLENBQUUsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEdBQUMsVUFBVSxFQUFDLENBQUMsR0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLFNBQVMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsR0FBQyxTQUFTLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxFQUFFLEVBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxRQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQyxDQUFDLENBQUEsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUNqaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFHLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLElBQUksRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUs7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsWUFBVTtBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQSxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLEVBQUUsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxZQUFVO0FBQUMsaUJBQU87QUFBQyxjQUFHLENBQUMsRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxFQUFFLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQTtXQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLENBQUE7U0FBQztPQUFDLENBQUEsQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxFQUFBO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7QUFDcmtFLFFBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxFQUFFLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEdBQUMsRUFBRSxHQUFFLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQztBQUFDLFdBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBQyxNQUFNLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxJQUFFLEVBQUUsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxFQUFFLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsRUFBRSxJQUFFLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUcsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUEsQUFBQyxDQUFBLElBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxNQUFLLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDcGdFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxTQUFGLENBQUMsQ0FBVSxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsWUFBWSxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxjQUFjLEdBQUMsQ0FBQyxDQUFBO09BQUMsSUFBSSxDQUFDLElBQUksR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsV0FBVyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLEtBQUssSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksSUFBRSxRQUFRLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRztBQUFDLE9BQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQyxFQUFFO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFDLEdBQUcsRUFBQyxlQUFVO0FBQUMsZUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxvQ0FBb0MsQ0FBQyxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsTUFBTSxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFdBQVcsSUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSTtBQUN4aEUsT0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxLQUFLLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQSxBQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsRUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsMEJBQTBCLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLENBQUEsRUFBQztBQUFDLFVBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUE7S0FBQztHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQSxBQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBLEVBQUM7QUFBQyxVQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUMsSUFBSSxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsV0FBUyxHQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsU0FBUyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsUUFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLENBQUMscUJBQXFCLElBQUUsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxZQUFVO0FBQUMsYUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sWUFBVTtBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLFFBQVEsSUFBRSxPQUFPLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBTyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsRUFBRSxFQUFDLFNBQVMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFFLEVBQUUsR0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLFVBQVUsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxFQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFVLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsSUFBSSxFQUFFLEdBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLO01BQUMsRUFBRSxHQUFDLFFBQVE7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxDQUFDLElBQUUsRUFBRTtNQUFDLEVBQUUsR0FBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxFQUFDO01BQUMsRUFBRSxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGFBQWEsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsNEJBQTRCO01BQUMsRUFBRSxHQUFDLHlCQUF5QjtNQUFDLEVBQUUsR0FBQywyQkFBMkI7TUFBQyxFQUFFLEdBQUMsMkJBQTJCO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLE1BQU0sSUFBRSxNQUFNLENBQUMsUUFBUTtNQUFDLEVBQUUsR0FBQyxZQUFZO01BQUMsRUFBRSxHQUFDLEVBQUUsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU0sWUFBWSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLEVBQUUsRUFDcmdFLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFNLEVBQUUsR0FBQyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxZQUFVO0FBQUMsWUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUUsSUFBSSxDQUFDLGlCQUFpQixLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUEsQUFBQyxFQUFDLElBQUksQ0FBQSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUc7QUFDaGtFLFdBQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFFLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxHQUFFO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQSxFQUFDLE1BQUs7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsVUFBVSxJQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEtBQUssR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQSxHQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQSxBQUFDLElBQUUsRUFBRSxLQUFHLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUM7TUFBQyxFQUFFLEdBQUMsTUFBTSxDQUFDLFlBQVk7TUFBQyxFQUFFLEdBQUMsQ0FBQSxZQUFVO0FBQUMsUUFBRztBQUFDLGNBQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsQ0FBQSxFQUFFO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLE9BQU8sQ0FBQyxFQUFFLEtBQUcsRUFBRSxHQUFDLElBQUksT0FBTyxFQUFBLENBQUEsQUFBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsbUJBQW1CLENBQUMsVUFBVSxJQUFFLE9BQU8sTUFBTSxLQUFHLEVBQUUsR0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUU7TUFBQyxFQUFFLEdBQUMsR0FBRztNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxRQUFRLEtBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxLQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxJQUFJLENBQUMsUUFBUSxFQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7QUFDdmdFLFdBQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsRUFBQztBQUFDLFVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQU87QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxZQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQztLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxZQUFVO0FBQUMsYUFBTyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLEtBQUssQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLEVBQzVnRSxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsS0FBSyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFNLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFDLElBQUksQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFBLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLEtBQUssSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHVCQUF1QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLElBQUUsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ25pRSxDQUFDLElBQUUsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQztHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQSxBQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQUksQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsTUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsS0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxFQUFDLE9BQU8sQ0FBQyxHQUFDLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxHQUFFLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3poRSxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBRTtBQUFDLFVBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsS0FBSyxFQUFDO0FBQUMsWUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7T0FBQyxNQUFLLElBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBQztBQUFDLGFBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxNQUFLLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLGNBQUcsQ0FBQyxDQUFDLEtBQUssRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxTQUFRO09BQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7S0FBQyxPQUFPLENBQUMsRUFBRSxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFBLEVBQUM7QUFBQyxPQUFDLElBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLENBQUMsS0FBSyxHQUFDLElBQUksRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxTQUFTLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxLQUFLLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFDO0dBQy9oRSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFBLEtBQUksRUFBRSxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyx3QkFBd0I7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsVUFBVSxHQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUE7S0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLFFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxNQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLEVBQUUsQ0FBQztHQUNuZ0UsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFlBQVksR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBRSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsUUFBRyxDQUFDLEtBQUcsU0FBUyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsU0FBUyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsRUFBQyxLQUFLLEVBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFBO0tBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUMzaUUsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBRyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMseUJBQXlCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxVQUFVLEdBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxTQUFTLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDaGhFLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsdUJBQXVCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFlBQVksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFFBQUcsSUFBSSxDQUFDLFNBQVMsRUFBQyxRQUFPLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLENBQUEsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLDBCQUEwQixHQUFDLENBQUMsR0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQ3RoRSxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVUsR0FBQyxVQUFVLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsR0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUEsQUFBQyxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFBLEdBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU07UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxZQUFZLEVBQUUsR0FBQyxJQUFJLENBQUMsTUFBTSxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsSUFBSSxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxLQUFLLEtBQUcsQ0FBQyxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3BnRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsV0FBVyxHQUFDLFdBQVcsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEdBQUcsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFlBQVksRUFBQyx3QkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsc0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFlBQVksRUFBQyx3QkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLGFBQU0sWUFBWSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsR0FBRyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEdBQUcsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUMvZ0UsVUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLGFBQWEsRUFBQyx1QkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxjQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsUUFBTyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyx1QkFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLEtBQUssQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVU7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LEVBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxFQUFFLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUcsRUFBRSxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFVBQVUsRUFBQyxvQkFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsTUFBTSxLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsZ0JBQWdCLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTSxFQUFFLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLENBQUEsWUFBVTtBQUFDLFFBQUc7QUFBQyxZQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLGNBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFDO0FBQUMsZ0JBQUksQ0FBQyxDQUFDLElBQUc7QUFBQyxvQkFBTSxLQUFLLEVBQUUsQ0FBQTthQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxlQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTthQUFDLElBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBQyxRQUFPLE9BQU8sSUFBRSxPQUFPLENBQUMsSUFBSSxJQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsMklBQTJJLEdBQUMsQ0FBQyxDQUFDLEVBQ3JtRSxJQUFJLENBQUMsSUFBSSxDQUFBLENBQUE7V0FBQztTQUFDLEVBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQyxFQUFFO0dBQUMsQ0FBQSxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyxxQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLGdCQUFnQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsV0FBVyxFQUFDLHFCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxhQUFhLEVBQUMsdUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsS0FBRyxDQUFDLENBQUE7T0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxBQUFDLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN2Z0UsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBQyxRQUFRLEVBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBQyxDQUFDLEVBQUMsVUFBVSxFQUFDLENBQUMsRUFBQyxHQUFHLEVBQUMsRUFBRSxFQUFDLFVBQVUsRUFBQyxFQUFFLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUMsRUFBRSxFQUFDLEdBQUcsRUFBQyxFQUFFLEVBQUMsVUFBVSxFQUFDLEVBQUUsRUFBQyxNQUFNLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFDLEVBQUUsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgX3J4ICAgICAgICAgID0gcmVxdWlyZSgnLi4vbm9yaS91dGlscy9SeC5qcycpLFxuICAgIF9hcHBBY3Rpb25zICA9IHJlcXVpcmUoJy4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfbm9yaUFjdGlvbnMgPSByZXF1aXJlKCcuLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJyksXG4gICAgX3NvY2tldElPRXZlbnRzID0gcmVxdWlyZSgnLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cbi8qKlxuICogXCJDb250cm9sbGVyXCIgZm9yIGEgTm9yaSBhcHBsaWNhdGlvbi4gVGhlIGNvbnRyb2xsZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gKiBib290c3RyYXBwaW5nIHRoZSBhcHAgYW5kIHBvc3NpYmx5IGhhbmRsaW5nIHNvY2tldC9zZXJ2ZXIgaW50ZXJhY3Rpb24uXG4gKiBBbnkgYWRkaXRpb25hbCBmdW5jdGlvbmFsaXR5IHNob3VsZCBiZSBoYW5kbGVkIGluIGEgc3BlY2lmaWMgbW9kdWxlLlxuICovXG52YXIgQXBwID0gTm9yaS5jcmVhdGVBcHBsaWNhdGlvbih7XG5cbiAgbWl4aW5zOiBbXSxcblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBtYWluIE5vcmkgQXBwIHN0b3JlIGFuZCB2aWV3LlxuICAgKi9cbiAgc3RvcmUgOiByZXF1aXJlKCcuL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gIHZpZXcgIDogcmVxdWlyZSgnLi92aWV3L0FwcFZpZXcuanMnKSxcbiAgc29ja2V0OiByZXF1aXJlKCcuLi9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMnKSxcblxuICAvKipcbiAgICogSW50aWFsaXplIHRoZSBhcHBpbGNhdGlvbiwgdmlldyBhbmQgc3RvcmVcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvY2tldC5pbml0aWFsaXplKCk7XG4gICAgdGhpcy5zb2NrZXQuc3Vic2NyaWJlKHRoaXMuaGFuZGxlU29ja2V0TWVzc2FnZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMudmlldy5pbml0aWFsaXplKCk7XG5cbiAgICB0aGlzLnN0b3JlLmluaXRpYWxpemUoKTsgLy8gc3RvcmUgd2lsbCBhY3F1aXJlIGRhdGEgZGlzcGF0Y2ggZXZlbnQgd2hlbiBjb21wbGV0ZVxuICAgIHRoaXMuc3RvcmUuc3Vic2NyaWJlKCdzdG9yZUluaXRpYWxpemVkJywgdGhpcy5vblN0b3JlSW5pdGlhbGl6ZWQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5zdG9yZS5sb2FkU3RvcmUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQWZ0ZXIgdGhlIHN0b3JlIGRhdGEgaXMgcmVhZHlcbiAgICovXG4gIG9uU3RvcmVJbml0aWFsaXplZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucnVuQXBwbGljYXRpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBcIlBsZWFzZSB3YWl0XCIgY292ZXIgYW5kIHN0YXJ0IHRoZSBhcHBcbiAgICovXG4gIHJ1bkFwcGxpY2F0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy52aWV3LnJlbW92ZUxvYWRpbmdNZXNzYWdlKCk7XG4gICAgdGhpcy52aWV3LnJlbmRlcigpO1xuXG4gICAgLy8gVmlldyB3aWxsIHNob3cgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3RvcmUgc3RhdGVcbiAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHtjdXJyZW50U3RhdGU6ICdHQU1FX09WRVInfSk7XG5cbiAgICAvLyBUZXN0IHBpbmdcbiAgICAvL19yeC5kb0V2ZXJ5KDEwMDAsIDMsICgpID0+IHRoaXMuc29ja2V0LnBpbmcoKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFsbCBtZXNzYWdlcyBmcm9tIHRoZSBTb2NrZXQuSU8gc2VydmVyIHdpbGwgYmUgZm9yd2FyZGVkIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGhhbmRsZVNvY2tldE1lc3NhZ2U6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgaWYgKCFwYXlsb2FkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJmcm9tIFNvY2tldC5JTyBzZXJ2ZXJcIiwgcGF5bG9hZCk7XG4gICAgc3dpdGNoIChwYXlsb2FkLnR5cGUpIHtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5DT05ORUNUKTpcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNvbm5lY3RlZCFcIik7XG4gICAgICAgIHRoaXMuc3RvcmUuc2V0U3RhdGUoe3NvY2tldElPSUQ6IHBheWxvYWQuaWR9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLlVTRVJfQ09OTkVDVEVEKTpcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkFub3RoZXIgY2xpZW50IGNvbm5lY3RlZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLlVTRVJfRElTQ09OTkVDVEVEKTpcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkFub3RoZXIgY2xpZW50IGRpc2Nvbm5lY3RlZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkRST1BQRUQpOlxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiWW91IHdlcmUgZHJvcHBlZCFcIiwgcGF5bG9hZC5wYXlsb2FkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLlNZU1RFTV9NRVNTQUdFKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJTeXN0ZW0gbWVzc2FnZVwiLCBwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuQ1JFQVRFX1JPT00pOlxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY3JlYXRlIHJvb21cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5KT0lOX1JPT00pOlxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiam9pbiByb29tXCIsIHBheWxvYWQucGF5bG9hZCk7XG4gICAgICAgIHRoaXMuaGFuZGxlSm9pbk5ld2x5Q3JlYXRlZFJvb20ocGF5bG9hZC5wYXlsb2FkLnJvb21JRCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5MRUFWRV9ST09NKTpcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImxlYXZlIHJvb21cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5HQU1FX1NUQVJUKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJHQU1FIFNUQVJURURcIik7XG4gICAgICAgIHRoaXMuaGFuZGxlR2FtZVN0YXJ0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5HQU1FX0VORCk6XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJHYW1lIGVuZGVkXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuU1lTVEVNX01FU1NBR0UpOlxuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkJST0FEQ0FTVCk6XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuTUVTU0FHRSk6XG4gICAgICAgIHRoaXMudmlldy5hbGVydChwYXlsb2FkLnBheWxvYWQsIHBheWxvYWQudHlwZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnNvbGUud2FybihcIlVuaGFuZGxlZCBTb2NrZXRJTyBtZXNzYWdlIHR5cGVcIiwgcGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH0sXG5cbiAgaGFuZGxlSm9pbk5ld2x5Q3JlYXRlZFJvb206IGZ1bmN0aW9uIChyb29tSUQpIHtcbiAgICB2YXIgc2V0Um9vbSAgICAgICAgICAgICAgID0gX2FwcEFjdGlvbnMuc2V0U2Vzc2lvblByb3BzKHtyb29tSUQ6IHJvb21JRH0pLFxuICAgICAgICBzZXRXYWl0aW5nU2NyZWVuU3RhdGUgPSBfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiB0aGlzLnN0b3JlLmdhbWVTdGF0ZXNbMl19KTtcblxuICAgIHRoaXMuc3RvcmUuYXBwbHkoc2V0Um9vbSk7XG4gICAgdGhpcy5zdG9yZS5hcHBseShzZXRXYWl0aW5nU2NyZWVuU3RhdGUpO1xuICB9LFxuXG4gIGhhbmRsZUdhbWVTdGFydDogZnVuY3Rpb24gKHJvb21JRCkge1xuICAgIGNvbnNvbGUubG9nKCdTdGFydGluZyBnYW1lJyk7XG4gICAgdmFyIHNldEdhbWVQbGF5U3RhdGUgPSBfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiB0aGlzLnN0b3JlLmdhbWVTdGF0ZXNbM119KTtcbiAgICB0aGlzLnN0b3JlLmFwcGx5KHNldEdhbWVQbGF5U3RhdGUpO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcDsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgTE9DQUxfUExBWUVSX0NPTk5FQ1QgICAgICAgOiAnTE9DQUxfUExBWUVSX0NPTk5FQ1QnLFxuICBTRVRfU0VTU0lPTl9QUk9QUyAgICAgICAgICA6ICdTRVRfU0VTU0lPTl9QUk9QUycsXG4gIFNFVF9MT0NBTF9QTEFZRVJfUFJPUFMgICAgIDogJ1NFVF9MT0NBTF9QTEFZRVJfUFJPUFMnLFxuICBTRVRfTE9DQUxfUExBWUVSX05BTUUgICAgICA6ICdTRVRfTE9DQUxfUExBWUVSX05BTUUnLFxuICBTRVRfTE9DQUxfUExBWUVSX0FQUEVBUkFOQ0U6ICdTRVRfTE9DQUxfUExBWUVSX0FQUEVBUkFOQ0UnLFxuICBTRVRfUkVNT1RFX1BMQVlFUl9QUk9QUyAgICA6ICdTRVRfUkVNT1RFX1BMQVlFUl9QUk9QUydcbiAgLy9TRUxFQ1RfUExBWUVSICAgICAgICAgICAgICA6ICdTRUxFQ1RfUExBWUVSJyxcbiAgLy9SRU1PVEVfUExBWUVSX0NPTk5FQ1QgICAgICA6ICdSRU1PVEVfUExBWUVSX0NPTk5FQ1QnLFxuICAvL0dBTUVfU1RBUlQgICAgICAgICAgICAgICAgIDogJ0dBTUVfU1RBUlQnLFxuICAvL0xPQ0FMX1FVRVNUSU9OICAgICAgICAgICAgIDogJ0xPQ0FMX1FVRVNUSU9OJyxcbiAgLy9SRU1PVEVfUVVFU1RJT04gICAgICAgICAgICA6ICdSRU1PVEVfUVVFU1RJT04nLFxuICAvL0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFIDogJ0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFJyxcbiAgLy9SRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0U6ICdSRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0UnLFxuICAvL0dBTUVfT1ZFUiAgICAgICAgICAgICAgICAgIDogJ0dBTUVfT1ZFUidcbn07IiwidmFyIF9hY3Rpb25Db25zdGFudHMgPSByZXF1aXJlKCcuL0FjdGlvbkNvbnN0YW50cy5qcycpO1xuXG4vKipcbiAqIFB1cmVseSBmb3IgY29udmVuaWVuY2UsIGFuIEV2ZW50IChcImFjdGlvblwiKSBDcmVhdG9yIGFsYSBGbHV4IHNwZWMuIEZvbGxvd1xuICogZ3VpZGVsaW5lcyBmb3IgY3JlYXRpbmcgYWN0aW9uczogaHR0cHM6Ly9naXRodWIuY29tL2FjZGxpdGUvZmx1eC1zdGFuZGFyZC1hY3Rpb25cbiAqL1xudmFyIEFjdGlvbkNyZWF0b3IgPSB7XG5cbiAgc2V0TG9jYWxQbGF5ZXJQcm9wczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX2FjdGlvbkNvbnN0YW50cy5TRVRfTE9DQUxfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgbG9jYWxQbGF5ZXI6IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgc2V0UmVtb3RlUGxheWVyUHJvcHM6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuU0VUX1JFTU9URV9QTEFZRVJfUFJPUFMsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICByZW1vdGVQbGF5ZXI6IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgc2V0U2Vzc2lvblByb3BzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlICAgOiBfYWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgc2Vzc2lvbjogZGF0YVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFjdGlvbkNyZWF0b3I7IiwidmFyIF9ub3JpQWN0aW9uQ29uc3RhbnRzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzJyksXG4gICAgX2FwcEFjdGlvbkNvbnN0YW50cyAgICAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzJyksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICBfbWl4aW5SZWR1Y2VyU3RvcmUgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMnKSxcbiAgICBfbnVtVXRpbHMgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb3JlL051bWJlclV0aWxzLmpzJyk7XG5cbi8qKlxuICogVGhpcyBhcHBsaWNhdGlvbiBzdG9yZSBjb250YWlucyBcInJlZHVjZXIgc3RvcmVcIiBmdW5jdGlvbmFsaXR5IGJhc2VkIG9uIFJlZHV4LlxuICogVGhlIHN0b3JlIHN0YXRlIG1heSBvbmx5IGJlIGNoYW5nZWQgZnJvbSBldmVudHMgYXMgYXBwbGllZCBpbiByZWR1Y2VyIGZ1bmN0aW9ucy5cbiAqIFRoZSBzdG9yZSByZWNlaXZlZCBhbGwgZXZlbnRzIGZyb20gdGhlIGV2ZW50IGJ1cyBhbmQgZm9yd2FyZHMgdGhlbSB0byBhbGxcbiAqIHJlZHVjZXIgZnVuY3Rpb25zIHRvIG1vZGlmeSBzdGF0ZSBhcyBuZWVkZWQuIE9uY2UgdGhleSBoYXZlIHJ1biwgdGhlXG4gKiBoYW5kbGVTdGF0ZU11dGF0aW9uIGZ1bmN0aW9uIGlzIGNhbGxlZCB0byBkaXNwYXRjaCBhbiBldmVudCB0byB0aGUgYnVzLCBvclxuICogbm90aWZ5IHN1YnNjcmliZXJzIHZpYSBhbiBvYnNlcnZhYmxlLlxuICpcbiAqIEV2ZW50cyA9PiBoYW5kbGVBcHBsaWNhdGlvbkV2ZW50cyA9PiBhcHBseVJlZHVjZXJzID0+IGhhbmRsZVN0YXRlTXV0YXRpb24gPT4gTm90aWZ5XG4gKi9cbnZhciBBcHBTdG9yZSA9IE5vcmkuY3JlYXRlU3RvcmUoe1xuXG4gIG1peGluczogW1xuICAgIF9taXhpblJlZHVjZXJTdG9yZSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCgpXG4gIF0sXG5cbiAgZ2FtZVN0YXRlczogWydUSVRMRScsICdQTEFZRVJfU0VMRUNUJywgJ1dBSVRJTkdfT05fUExBWUVSJywgJ01BSU5fR0FNRScsICdHQU1FX09WRVInXSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hZGRSZWR1Y2VyKHRoaXMubWFpblN0YXRlUmVkdWNlcik7XG4gICAgdGhpcy5pbml0aWFsaXplUmVkdWNlclN0b3JlKCk7XG4gICAgdGhpcy5zZXRTdGF0ZShOb3JpLmNvbmZpZygpKTtcbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3N0b3JlSW5pdGlhbGl6ZWQnKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IG9yIGxvYWQgYW55IG5lY2Vzc2FyeSBkYXRhIGFuZCB0aGVuIGJyb2FkY2FzdCBhIGluaXRpYWxpemVkIGV2ZW50LlxuICAgKi9cbiAgbG9hZFN0b3JlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBjdXJyZW50U3RhdGU6IHRoaXMuZ2FtZVN0YXRlc1swXSxcbiAgICAgIHNlc3Npb24gICAgIDoge1xuICAgICAgICByb29tSUQ6ICcnXG4gICAgICB9LFxuICAgICAgbG9jYWxQbGF5ZXIgOiB0aGlzLmNyZWF0ZUJsYW5rUGxheWVyT2JqZWN0KCksXG4gICAgICByZW1vdGVQbGF5ZXI6IHRoaXMuY3JlYXRlQmxhbmtQbGF5ZXJPYmplY3QoKSxcbiAgICAgIHF1ZXN0aW9uQmFuazogW11cbiAgICB9KTtcblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZignc3RvcmVJbml0aWFsaXplZCcpO1xuICB9LFxuXG4gIGNyZWF0ZUJsYW5rUGxheWVyT2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkICAgICAgICA6ICcnLFxuICAgICAgdHlwZSAgICAgIDogJycsXG4gICAgICBuYW1lICAgICAgOiAnTXlzdGVyeSBQbGF5ZXIgJyArIF9udW1VdGlscy5ybmROdW1iZXIoMTAwLCA5OTkpLFxuICAgICAgaGVhbHRoICAgIDogNixcbiAgICAgIGFwcGVhcmFuY2U6ICdncmVlbicsXG4gICAgICBiZWhhdmlvcnMgOiBbXSxcbiAgICAgIHNjb3JlICAgICA6IF9udW1VdGlscy5ybmROdW1iZXIoMTAsIDIwKVxuICAgIH1cbiAgfSxcblxuICBjcmVhdGVRdWVzdGlvbk9iamVjdDogZnVuY3Rpb24gKHByb21wdCwgZGlzdHJhY3RvcnMsIHBvaW50VmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcHJvbXB0ICAgICA6IHByb21wdCxcbiAgICAgIGRpc3RyYWN0b3JzOiBkaXN0cmFjdG9ycyxcbiAgICAgIHBvaW50VmFsdWUgOiBwb2ludFZhbHVlXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZ5IHN0YXRlIGJhc2VkIG9uIGluY29taW5nIGV2ZW50cy4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIG1vZGlmaWVkXG4gICAqIHN0YXRlIGFuZCBkb2VzIG5vdCBtb2RpZnkgdGhlIHN0YXRlIGRpcmVjdGx5LlxuICAgKiBDYW4gY29tcG9zZSBzdGF0ZSB0cmFuc2Zvcm1hdGlvbnNcbiAgICogcmV0dXJuIF8uYXNzaWduKHt9LCBzdGF0ZSwgb3RoZXJTdGF0ZVRyYW5zZm9ybWVyKHN0YXRlKSk7XG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKiBAcGFyYW0gZXZlbnRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBtYWluU3RhdGVSZWR1Y2VyOiBmdW5jdGlvbiAoc3RhdGUsIGV2ZW50KSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcblxuICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXG4gICAgICBjYXNlIF9ub3JpQWN0aW9uQ29uc3RhbnRzLkNIQU5HRV9TVE9SRV9TVEFURTpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfTE9DQUxfUExBWUVSX1BST1BTOlxuICAgICAgY2FzZSBfYXBwQWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTOlxuICAgICAgY2FzZSBfYXBwQWN0aW9uQ29uc3RhbnRzLlNFVF9TRVNTSU9OX1BST1BTOlxuICAgICAgICByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIGV2ZW50LnBheWxvYWQuZGF0YSk7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS53YXJuKCdSZWR1Y2VyIHN0b3JlLCB1bmhhbmRsZWQgZXZlbnQgdHlwZTogJyArIGV2ZW50LnR5cGUpO1xuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDYWxsZWQgYWZ0ZXIgYWxsIHJlZHVjZXJzIGhhdmUgcnVuIHRvIGJyb2FkY2FzdCBwb3NzaWJsZSB1cGRhdGVzLiBEb2VzXG4gICAqIG5vdCBjaGVjayB0byBzZWUgaWYgdGhlIHN0YXRlIHdhcyBhY3R1YWxseSB1cGRhdGVkLlxuICAgKi9cbiAgaGFuZGxlU3RhdGVNdXRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnModGhpcy5nZXRTdGF0ZSgpKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBTdG9yZSgpOyIsInZhciBfYXBwU3RvcmUgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX21peGluQXBwbGljYXRpb25WaWV3ICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvQXBwbGljYXRpb25WaWV3LmpzJyksXG4gICAgX21peGluTnVkb3J1Q29udHJvbHMgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5OdWRvcnVDb250cm9scy5qcycpLFxuICAgIF9taXhpbkNvbXBvbmVudFZpZXdzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMnKSxcbiAgICBfbWl4aW5TdG9yZVN0YXRlVmlld3MgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpblN0b3JlU3RhdGVWaWV3cy5qcycpLFxuICAgIF9taXhpbkV2ZW50RGVsZWdhdG9yICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluRXZlbnREZWxlZ2F0b3IuanMnKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcycpO1xuXG4vKipcbiAqIFZpZXcgZm9yIGFuIGFwcGxpY2F0aW9uLlxuICovXG5cbnZhciBBcHBWaWV3ID0gTm9yaS5jcmVhdGVWaWV3KHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5BcHBsaWNhdGlvblZpZXcsXG4gICAgX21peGluTnVkb3J1Q29udHJvbHMsXG4gICAgX21peGluQ29tcG9uZW50Vmlld3MsXG4gICAgX21peGluU3RvcmVTdGF0ZVZpZXdzLFxuICAgIF9taXhpbkV2ZW50RGVsZWdhdG9yKCksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QoKVxuICBdLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcoWydhcHBsaWNhdGlvbnNjYWZmb2xkJywgJ2FwcGxpY2F0aW9uY29tcG9uZW50c3NjYWZmb2xkJ10pO1xuICAgIHRoaXMuaW5pdGlhbGl6ZVN0YXRlVmlld3MoX2FwcFN0b3JlKTtcbiAgICB0aGlzLmluaXRpYWxpemVOdWRvcnVDb250cm9scygpO1xuXG4gICAgdGhpcy5jb25maWd1cmVWaWV3cygpO1xuICB9LFxuXG4gIGNvbmZpZ3VyZVZpZXdzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNjcmVlblRpdGxlICAgICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLlRpdGxlLmpzJykoKSxcbiAgICAgICAgc2NyZWVuUGxheWVyU2VsZWN0ICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uUGxheWVyU2VsZWN0LmpzJykoKSxcbiAgICAgICAgc2NyZWVuV2FpdGluZ09uUGxheWVyID0gcmVxdWlyZSgnLi9TY3JlZW4uV2FpdGluZ09uUGxheWVyLmpzJykoKSxcbiAgICAgICAgc2NyZWVuTWFpbkdhbWUgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uTWFpbkdhbWUuanMnKSgpLFxuICAgICAgICBzY3JlZW5HYW1lT3ZlciAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5HYW1lT3Zlci5qcycpKCksXG4gICAgICAgIGdhbWVTdGF0ZXMgICAgICAgICAgICA9IF9hcHBTdG9yZS5nYW1lU3RhdGVzO1xuXG4gICAgdGhpcy5zZXRWaWV3TW91bnRQb2ludCgnI2NvbnRlbnRzJyk7XG5cbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbMF0sICd0aXRsZScsIHNjcmVlblRpdGxlKTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbMV0sICdwbGF5ZXJzZWxlY3QnLCBzY3JlZW5QbGF5ZXJTZWxlY3QpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1syXSwgJ3dhaXRpbmdvbnBsYXllcicsIHNjcmVlbldhaXRpbmdPblBsYXllcik7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzNdLCAnZ2FtZScsIHNjcmVlbk1haW5HYW1lKTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbNF0sICdnYW1lb3ZlcicsIHNjcmVlbkdhbWVPdmVyKTtcbiAgfSxcblxuICAvKipcbiAgICogRHJhdyBhbmQgVUkgdG8gdGhlIERPTSBhbmQgc2V0IGV2ZW50c1xuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwVmlldygpOyIsInZhciBfbm9yaUFjdGlvbnMgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJyksXG4gICAgX2FwcFZpZXcgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3JyksXG4gICAgX2FwcFN0b3JlICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKSxcbiAgICBfdGVtcGxhdGUgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICBfbWl4aW5ET01NYW5pcHVsYXRpb24gPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5ET01NYW5pcHVsYXRpb24uanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5ET01NYW5pcHVsYXRpb25cbiAgXSxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI2dhbWVvdmVyX19idXR0b24tcmVwbGF5JzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgdmFyIHN0YXRlICAgID0ge1xuICAgICAgbmFtZSAgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICBhcHBlYXJhbmNlIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZSxcbiAgICAgIGxvY2FsU2NvcmUgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5zY29yZSxcbiAgICAgIHJlbW90ZVNjb3JlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICBsb2NhbFdpbiAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICByZW1vdGVXaW4gIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPCBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICB0aWVXaW4gICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPT09IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZVxuICAgIH07XG4gICAgY29uc29sZS5sb2coc3RhdGUpO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuXG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fdGllJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fbG9vc2UnKTtcblxuICAgIGlmIChzdGF0ZS5sb2NhbFdpbikge1xuICAgICAgdGhpcy5zaG93RWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5yZW1vdGVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX2xvb3NlJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS50aWVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX3RpZScpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjZ2FtZV9fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1s0XX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qXG4gVE9ET1xuXG4gKi9cblxudmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfYXBwQWN0aW9ucyAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldy5qcycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX3NvY2tldElPICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJyksXG4gICAgX3RlbXBsYXRlICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2JsdXIgI3NlbGVjdF9fcGxheWVybmFtZScgICAgICAgIDogdGhpcy5zZXRQbGF5ZXJOYW1lLmJpbmQodGhpcyksXG4gICAgICAnY2hhbmdlICNzZWxlY3RfX3BsYXllcnR5cGUnICAgICAgOiB0aGlzLnNldFBsYXllckFwcGVhcmFuY2UuYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tam9pbnJvb20nICA6IHRoaXMub25Kb2luUm9vbS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1jcmVhdGVyb29tJzogdGhpcy5vbkNyZWF0ZVJvb20uYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tZ28nICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzJdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgc2V0UGxheWVyTmFtZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGFjdGlvbiA9IF9hcHBBY3Rpb25zLnNldExvY2FsUGxheWVyUHJvcHMoe1xuICAgICAgbmFtZTogdmFsdWVcbiAgICB9KTtcbiAgICBfYXBwU3RvcmUuYXBwbHkoYWN0aW9uKTtcbiAgfSxcblxuICBzZXRQbGF5ZXJBcHBlYXJhbmNlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYWN0aW9uID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICBhcHBlYXJhbmNlOiB2YWx1ZVxuICAgIH0pO1xuICAgIF9hcHBTdG9yZS5hcHBseShhY3Rpb24pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2VcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICBhcHBlYXJhbmNlOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5hcHBlYXJhbmNlXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVydHlwZScpLnZhbHVlID0gdGhpcy5nZXRTdGF0ZSgpLmFwcGVhcmFuY2U7XG4gIH0sXG5cbiAgb25Kb2luUm9vbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciByb29tSUQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19yb29taWQnKS52YWx1ZTtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVJvb21JRChyb29tSUQpKSB7XG4gICAgICBfc29ja2V0SU8ubm90aWZ5U2VydmVyKF9zb2NrZXRJTy5ldmVudHMoKS5KT0lOX1JPT00sIHtcbiAgICAgICAgcm9vbUlEICAgIDogcm9vbUlELFxuICAgICAgICBwbGF5ZXJOYW1lOiB0aGlzLmdldFN0YXRlKCkubmFtZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9hcHBWaWV3LmFsZXJ0KCdUaGUgcm9vbSBJRCBpcyBub3QgY29ycmVjdC4gTXVzdCBiZSBhIDUgZGlnaXQgbnVtYmVyLicsICdCYWQgUm9vbSBJRCcpO1xuICAgIH1cbiAgfSxcblxuICB2YWxpZGF0ZVVzZXJEZXRhaWxzSW5wdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbmFtZSAgICAgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3BsYXllcm5hbWUnKS52YWx1ZSxcbiAgICAgICAgYXBwZWFyYW5jZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3BsYXllcnR5cGUnKS52YWx1ZTtcblxuICAgIGlmICghbmFtZS5sZW5ndGggfHwgIWFwcGVhcmFuY2UpIHtcbiAgICAgIF9hcHBWaWV3LmFsZXJ0KCdNYWtlIHN1cmUgeW91XFwndmUgdHlwZWQgYSBuYW1lIGZvciB5b3Vyc2VsZiBhbmQgc2VsZWN0ZWQgYW4gYXBwZWFyYW5jZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICAvKipcbiAgICogUm9vbSBJRCBtdXN0IGJlIGFuIGludGVnZXIgYW5kIDUgZGlnaXRzXG4gICAqIEBwYXJhbSByb29tSURcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICB2YWxpZGF0ZVJvb21JRDogZnVuY3Rpb24gKHJvb21JRCkge1xuICAgIGlmIChpc05hTihwYXJzZUludChyb29tSUQpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAocm9vbUlELmxlbmd0aCAhPT0gNSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBvbkNyZWF0ZVJvb206IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVVzZXJEZXRhaWxzSW5wdXQoKSkge1xuICAgICAgX3NvY2tldElPLm5vdGlmeVNlcnZlcihfc29ja2V0SU8uZXZlbnRzKCkuQ1JFQVRFX1JPT00sIHtwbGF5ZXJOYW1lOiB0aGlzLmdldFN0YXRlKCkubmFtZX0pO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjdGl0bGVfX2J1dHRvbi1zdGFydCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjd2FpdGluZ19fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1szXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICByb29tSUQgICAgOiBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qKlxuICogSW5pdGlhbCBmaWxlIGZvciB0aGUgQXBwbGljYXRpb25cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgLyoqXG4gICAqIElFIHZlcnNpb25zIDkgYW5kIHVuZGVyIGFyZSBibG9ja2VkLCBvdGhlcnMgYXJlIGFsbG93ZWQgdG8gcHJvY2VlZFxuICAgKi9cbiAgaWYoX2Jyb3dzZXJJbmZvLm5vdFN1cHBvcnRlZCB8fCBfYnJvd3NlckluZm8uaXNJRTkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuaW5uZXJIVE1MID0gJzxoMz5Gb3IgdGhlIGJlc3QgZXhwZXJpZW5jZSwgcGxlYXNlIHVzZSBJbnRlcm5ldCBFeHBsb3JlciAxMCssIEZpcmVmb3gsIENocm9tZSBvciBTYWZhcmkgdG8gdmlldyB0aGlzIGFwcGxpY2F0aW9uLjwvaDM+JztcbiAgfSBlbHNlIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24gbW9kdWxlIGFuZCBpbml0aWFsaXplXG4gICAgICovXG4gICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgd2luZG93Lk5vcmkgPSByZXF1aXJlKCcuL25vcmkvTm9yaS5qcycpO1xuICAgICAgd2luZG93LkFQUCA9IHJlcXVpcmUoJy4vYXBwL0FwcC5qcycpO1xuICAgICAgQVBQLmluaXRpYWxpemUoKTtcbiAgICB9O1xuXG4gIH1cblxufSgpKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbnZhciBOb3JpID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vdXRpbHMvRGlzcGF0Y2hlci5qcycpLFxuICAgICAgX3JvdXRlciAgICAgPSByZXF1aXJlKCcuL3V0aWxzL1JvdXRlci5qcycpO1xuXG4gIC8vIFN3aXRjaCBMb2Rhc2ggdG8gdXNlIE11c3RhY2hlIHN0eWxlIHRlbXBsYXRlc1xuICBfLnRlbXBsYXRlU2V0dGluZ3MuaW50ZXJwb2xhdGUgPSAve3soW1xcc1xcU10rPyl9fS9nO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGdldERpc3BhdGNoZXIoKSB7XG4gICAgcmV0dXJuIF9kaXNwYXRjaGVyO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Um91dGVyKCkge1xuICAgIHJldHVybiBfcm91dGVyO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgKHdpbmRvdy5BUFBfQ09ORklHX0RBVEEgfHwge30pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRSb3V0ZSgpIHtcbiAgICByZXR1cm4gX3JvdXRlci5nZXRDdXJyZW50Um91dGUoKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgRmFjdG9yaWVzIC0gY29uY2F0ZW5hdGl2ZSBpbmhlcml0YW5jZSwgZGVjb3JhdG9yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogTWVyZ2VzIGEgY29sbGVjdGlvbiBvZiBvYmplY3RzXG4gICAqIEBwYXJhbSB0YXJnZXRcbiAgICogQHBhcmFtIHNvdXJjZUFycmF5XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYXNzaWduQXJyYXkodGFyZ2V0LCBzb3VyY2VBcnJheSkge1xuICAgIHNvdXJjZUFycmF5LmZvckVhY2goZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgICAgdGFyZ2V0ID0gXy5hc3NpZ24odGFyZ2V0LCBzb3VyY2UpO1xuICAgIH0pO1xuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IE5vcmkgYXBwbGljYXRpb24gaW5zdGFuY2VcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUFwcGxpY2F0aW9uKGN1c3RvbSkge1xuICAgIGN1c3RvbS5taXhpbnMucHVzaCh0aGlzKTtcbiAgICByZXR1cm4gYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBtYWluIGFwcGxpY2F0aW9uIHN0b3JlXG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdG9yZShjdXN0b20pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gY3MoKSB7XG4gICAgICByZXR1cm4gXy5hc3NpZ24oe30sIGJ1aWxkRnJvbU1peGlucyhjdXN0b20pKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgbWFpbiBhcHBsaWNhdGlvbiB2aWV3XG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVWaWV3KGN1c3RvbSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBjdigpIHtcbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSkpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTWl4ZXMgaW4gdGhlIG1vZHVsZXMgc3BlY2lmaWVkIGluIHRoZSBjdXN0b20gYXBwbGljYXRpb24gb2JqZWN0XG4gICAqIEBwYXJhbSBzb3VyY2VPYmplY3RcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBidWlsZEZyb21NaXhpbnMoc291cmNlT2JqZWN0KSB7XG4gICAgdmFyIG1peGlucztcblxuICAgIGlmIChzb3VyY2VPYmplY3QubWl4aW5zKSB7XG4gICAgICBtaXhpbnMgPSBzb3VyY2VPYmplY3QubWl4aW5zO1xuICAgIH1cblxuICAgIG1peGlucy5wdXNoKHNvdXJjZU9iamVjdCk7XG4gICAgcmV0dXJuIGFzc2lnbkFycmF5KHt9LCBtaXhpbnMpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBjb25maWcgICAgICAgICAgIDogZ2V0Q29uZmlnLFxuICAgIGRpc3BhdGNoZXIgICAgICAgOiBnZXREaXNwYXRjaGVyLFxuICAgIHJvdXRlciAgICAgICAgICAgOiBnZXRSb3V0ZXIsXG4gICAgY3JlYXRlQXBwbGljYXRpb246IGNyZWF0ZUFwcGxpY2F0aW9uLFxuICAgIGNyZWF0ZVN0b3JlICAgICAgOiBjcmVhdGVTdG9yZSxcbiAgICBjcmVhdGVWaWV3ICAgICAgIDogY3JlYXRlVmlldyxcbiAgICBidWlsZEZyb21NaXhpbnMgIDogYnVpbGRGcm9tTWl4aW5zLFxuICAgIGdldEN1cnJlbnRSb3V0ZSAgOiBnZXRDdXJyZW50Um91dGUsXG4gICAgYXNzaWduQXJyYXkgICAgICA6IGFzc2lnbkFycmF5XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaSgpO1xuXG5cbiIsIi8qIEBmbG93IHdlYWsgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIENIQU5HRV9TVE9SRV9TVEFURTogJ0NIQU5HRV9TVE9SRV9TVEFURSdcbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIEFjdGlvbiBDcmVhdG9yXG4gKiBCYXNlZCBvbiBGbHV4IEFjdGlvbnNcbiAqIEZvciBtb3JlIGluZm9ybWF0aW9uIGFuZCBndWlkZWxpbmVzOiBodHRwczovL2dpdGh1Yi5jb20vYWNkbGl0ZS9mbHV4LXN0YW5kYXJkLWFjdGlvblxuICovXG52YXIgX25vcmlBY3Rpb25Db25zdGFudHMgPSByZXF1aXJlKCcuL0FjdGlvbkNvbnN0YW50cy5qcycpO1xuXG52YXIgTm9yaUFjdGlvbkNyZWF0b3IgPSB7XG5cbiAgY2hhbmdlU3RvcmVTdGF0ZTogZnVuY3Rpb24gKGRhdGEsIGlkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9ub3JpQWN0aW9uQ29uc3RhbnRzLkNIQU5HRV9TVE9SRV9TVEFURSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgaWQgIDogaWQsXG4gICAgICAgIGRhdGE6IGRhdGFcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaUFjdGlvbkNyZWF0b3I7IiwiLyogQGZsb3cgd2VhayAqL1xuXG52YXIgU29ja2V0SU9Db25uZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICA9IG5ldyBSeC5CZWhhdmlvclN1YmplY3QoKSxcbiAgICAgIF9zb2NrZXRJTyA9IGlvKCksXG4gICAgICBfbG9nICAgICAgPSBbXSxcbiAgICAgIF9jb25uZWN0aW9uSUQsXG4gICAgICBfZXZlbnRzICAgPSByZXF1aXJlKCcuL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIF9zb2NrZXRJTy5vbihfZXZlbnRzLk5PVElGWV9DTElFTlQsIG9uTm90aWZ5Q2xpZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgbm90aWZpY2F0aW9ucyBmcm9tIFNvY2tldC5pbyBjb21lIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWQge3R5cGUsIGlkLCB0aW1lLCBwYXlsb2FkfVxuICAgKi9cbiAgZnVuY3Rpb24gb25Ob3RpZnlDbGllbnQocGF5bG9hZCkge1xuICAgIF9sb2cucHVzaChwYXlsb2FkKTtcblxuICAgIGlmIChwYXlsb2FkLnR5cGUgPT09IF9ldmVudHMuUElORykge1xuICAgICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUE9ORywge30pO1xuICAgIH0gZWxzZSBpZiAocGF5bG9hZC50eXBlID09PSBfZXZlbnRzLlBPTkcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTT0NLRVQuSU8gUE9ORyEnKTtcbiAgICB9IGVsc2UgaWYgKHBheWxvYWQudHlwZSA9PT0gX2V2ZW50cy5DT05ORUNUKSB7XG4gICAgICBfY29ubmVjdGlvbklEID0gcGF5bG9hZC5pZDtcbiAgICB9XG4gICAgbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCk7XG4gIH1cblxuICBmdW5jdGlvbiBwaW5nKCkge1xuICAgIG5vdGlmeVNlcnZlcihfZXZlbnRzLlBJTkcsIHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgY29tbXVuaWNhdGlvbnMgdG8gdGhlIHNlcnZlciBzaG91bGQgZ28gdGhyb3VnaCBoZXJlXG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTZXJ2ZXIodHlwZSwgcGF5bG9hZCkge1xuICAgIF9zb2NrZXRJTy5lbWl0KF9ldmVudHMuTk9USUZZX1NFUlZFUiwge1xuICAgICAgdHlwZSAgICAgICAgOiB0eXBlLFxuICAgICAgY29ubmVjdGlvbklEOiBfY29ubmVjdGlvbklELFxuICAgICAgcGF5bG9hZCAgICAgOiBwYXlsb2FkXG4gICAgfSk7XG4gIH1cblxuICAvL2Z1bmN0aW9uIGVtaXQobWVzc2FnZSwgcGF5bG9hZCkge1xuICAvLyAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgX2V2ZW50cy5NRVNTQUdFO1xuICAvLyAgcGF5bG9hZCA9IHBheWxvYWQgfHwge307XG4gIC8vICBfc29ja2V0SU8uZW1pdChtZXNzYWdlLCBwYXlsb2FkKTtcbiAgLy99XG4gIC8vXG4gIC8vZnVuY3Rpb24gb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgLy8gIF9zb2NrZXRJTy5vbihldmVudCwgaGFuZGxlcik7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgaGFuZGxlciB0byB1cGRhdGVzXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3N1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBmcm9tIHVwZGF0ZSBvciB3aGF0ZXZlciBmdW5jdGlvbiB0byBkaXNwYXRjaCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIF9zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBsYXN0IHBheWxvYWQgdGhhdCB3YXMgZGlzcGF0Y2hlZCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExhc3ROb3RpZmljYXRpb24oKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LmdldFZhbHVlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRFdmVudENvbnN0YW50cygpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sIF9ldmVudHMpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBldmVudHMgICAgICAgICAgICAgOiBnZXRFdmVudENvbnN0YW50cyxcbiAgICBpbml0aWFsaXplICAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHBpbmcgICAgICAgICAgICAgICA6IHBpbmcsXG4gICAgbm90aWZ5U2VydmVyICAgICAgIDogbm90aWZ5U2VydmVyLFxuICAgIHN1YnNjcmliZSAgICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVycyAgOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRMYXN0Tm90aWZpY2F0aW9uOiBnZXRMYXN0Tm90aWZpY2F0aW9uXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU29ja2V0SU9Db25uZWN0b3IoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBQSU5HICAgICAgICAgICAgIDogJ3BpbmcnLFxuICBQT05HICAgICAgICAgICAgIDogJ3BvbmcnLFxuICBOT1RJRllfQ0xJRU5UICAgIDogJ25vdGlmeV9jbGllbnQnLFxuICBOT1RJRllfU0VSVkVSICAgIDogJ25vdGlmeV9zZXJ2ZXInLFxuICBDT05ORUNUICAgICAgICAgIDogJ2Nvbm5lY3QnLFxuICBEUk9QUEVEICAgICAgICAgIDogJ2Ryb3BwZWQnLFxuICBVU0VSX0NPTk5FQ1RFRCAgIDogJ3VzZXJfY29ubmVjdGVkJyxcbiAgVVNFUl9ESVNDT05ORUNURUQ6ICd1c2VyX2Rpc2Nvbm5lY3RlZCcsXG4gIEVNSVQgICAgICAgICAgICAgOiAnZW1pdCcsXG4gIEJST0FEQ0FTVCAgICAgICAgOiAnYnJvYWRjYXN0JyxcbiAgU1lTVEVNX01FU1NBR0UgICA6ICdzeXN0ZW1fbWVzc2FnZScsXG4gIE1FU1NBR0UgICAgICAgICAgOiAnbWVzc2FnZScsXG4gIENSRUFURV9ST09NICAgICAgOiAnY3JlYXRlX3Jvb20nLFxuICBKT0lOX1JPT00gICAgICAgIDogJ2pvaW5fcm9vbScsXG4gIExFQVZFX1JPT00gICAgICAgOiAnbGVhdmVfcm9vbScsXG4gIEdBTUVfU1RBUlQgICAgICAgOiAnZ2FtZV9zdGFydCcsXG4gIEdBTUVfRU5EICAgICAgICAgOiAnZ2FtZV9lbmQnXG59OyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBXcmFwcyBJbW11dGFibGUuanMncyBNYXAgaW4gdGhlIHNhbWUgc3ludGF4IGFzIHRoZSBTaW1wbGVTdG9yZSBtb2R1bGVcbiAqXG4gKiBWaWV3IERvY3MgaHR0cDovL2ZhY2Vib29rLmdpdGh1Yi5pby9pbW11dGFibGUtanMvZG9jcy8jL01hcFxuICovXG5cbnZhciBpbW11dGFibGUgPSByZXF1aXJlKCcuLi8uLi92ZW5kb3IvaW1tdXRhYmxlLm1pbi5qcycpO1xuXG52YXIgSW1tdXRhYmxlTWFwID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX21hcCA9IGltbXV0YWJsZS5NYXAoKTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgTWFwIG9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE1hcCgpIHtcbiAgICByZXR1cm4gX21hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBzdGF0ZVxuICAgKiBAcmV0dXJucyB7dm9pZHwqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gICAgcmV0dXJuIF9tYXAudG9KUygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBuZXh0XG4gICAqL1xuICBmdW5jdGlvbiBzZXRTdGF0ZShuZXh0KSB7XG4gICAgX21hcCA9IF9tYXAubWVyZ2UobmV4dCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGdldFN0YXRlOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZTogc2V0U3RhdGUsXG4gICAgZ2V0TWFwICA6IGdldE1hcFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEltbXV0YWJsZU1hcDsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gZm9yIE5vcmkgc3RvcmVzIHRvIGFkZCBmdW5jdGlvbmFsaXR5IHNpbWlsYXIgdG8gUmVkdXgnIFJlZHVjZXIgYW5kIHNpbmdsZVxuICogb2JqZWN0IHN0YXRlIHRyZWUgY29uY2VwdC4gTWl4aW4gc2hvdWxkIGJlIGNvbXBvc2VkIHRvIG5vcmkvc3RvcmUvQXBwbGljYXRpb25TdG9yZVxuICogZHVyaW5nIGNyZWF0aW9uIG9mIG1haW4gQXBwU3RvcmVcbiAqXG4gKiBodHRwczovL2dhZWFyb24uZ2l0aHViLmlvL3JlZHV4L2RvY3MvYXBpL1N0b3JlLmh0bWxcbiAqIGh0dHBzOi8vZ2FlYXJvbi5naXRodWIuaW8vcmVkdXgvZG9jcy9iYXNpY3MvUmVkdWNlcnMuaHRtbFxuICpcbiAqIENyZWF0ZWQgOC8xMy8xNVxuICovXG52YXIgTWl4aW5SZWR1Y2VyU3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyxcbiAgICAgIF9zdGF0ZSxcbiAgICAgIF9zdGF0ZVJlZHVjZXJzID0gW107XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIF9zdGF0ZSBtaWdodCBub3QgZXhpc3QgaWYgc3Vic2NyaWJlcnMgYXJlIGFkZGVkIGJlZm9yZSB0aGlzIHN0b3JlIGlzIGluaXRpYWxpemVkXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICBpZiAoX3N0YXRlKSB7XG4gICAgICByZXR1cm4gX3N0YXRlLmdldFN0YXRlKCk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFN0YXRlKHN0YXRlKSB7XG4gICAgaWYgKCFfLmlzRXF1YWwoc3RhdGUsIF9zdGF0ZSkpIHtcbiAgICAgIF9zdGF0ZS5zZXRTdGF0ZShzdGF0ZSk7XG4gICAgICBfdGhpcy5ub3RpZnlTdWJzY3JpYmVycyh7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0UmVkdWNlcnMocmVkdWNlckFycmF5KSB7XG4gICAgX3N0YXRlUmVkdWNlcnMgPSByZWR1Y2VyQXJyYXk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRSZWR1Y2VyKHJlZHVjZXIpIHtcbiAgICBfc3RhdGVSZWR1Y2Vycy5wdXNoKHJlZHVjZXIpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0XG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgZXZlbnQgbGlzdGVuZXIvcmVjZWl2ZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKSB7XG4gICAgaWYgKCF0aGlzLmNyZWF0ZVN1YmplY3QpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZSBuZWVkcyBub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QgdG8gbm90aWZ5Jyk7XG4gICAgfVxuXG4gICAgX3RoaXMgID0gdGhpcztcbiAgICBfc3RhdGUgPSByZXF1aXJlKCcuL0ltbXV0YWJsZU1hcC5qcycpKCk7XG5cbiAgICBpZiAoIV9zdGF0ZVJlZHVjZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZHVjZXJTdG9yZSwgbXVzdCBzZXQgYSByZWR1Y2VyIGJlZm9yZSBpbml0aWFsaXphdGlvbicpO1xuICAgIH1cblxuICAgIC8vIFNldCBpbml0aWFsIHN0YXRlIGZyb20gZW1wdHkgZXZlbnRcbiAgICBhcHBseVJlZHVjZXJzKHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSB0aGUgYWN0aW9uIG9iamVjdCB0byB0aGUgcmVkdWNlcnMgdG8gY2hhbmdlIHN0YXRlXG4gICAqIGFyZSBzZW50IHRvIGFsbCByZWR1Y2VycyB0byB1cGRhdGUgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25PYmplY3RcbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5KGFjdGlvbk9iamVjdCkge1xuICAgIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KSB7XG4gICAgdmFyIG5leHRTdGF0ZSA9IGFwcGx5UmVkdWNlcnNUb1N0YXRlKGdldFN0YXRlKCksIGFjdGlvbk9iamVjdCk7XG4gICAgc2V0U3RhdGUobmV4dFN0YXRlKTtcbiAgICBfdGhpcy5oYW5kbGVTdGF0ZU11dGF0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogQVBJIGhvb2sgdG8gaGFuZGxlIHN0YXRlIHVwZGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlTXV0YXRpb24oKSB7XG4gICAgLy8gb3ZlcnJpZGUgdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgc3RhdGUgZnJvbSB0aGUgY29tYmluZWQgcmVkdWNlcyBhbmQgYWN0aW9uIG9iamVjdFxuICAgKiBTdG9yZSBzdGF0ZSBpc24ndCBtb2RpZmllZCwgY3VycmVudCBzdGF0ZSBpcyBwYXNzZWQgaW4gYW5kIG11dGF0ZWQgc3RhdGUgcmV0dXJuZWRcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25cbiAgICogQHJldHVybnMgeyp8e319XG4gICAqL1xuICBmdW5jdGlvbiBhcHBseVJlZHVjZXJzVG9TdGF0ZShzdGF0ZSwgYWN0aW9uKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICAvLyBUT0RPIHNob3VsZCB0aGlzIGFjdHVhbGx5IHVzZSBhcnJheS5yZWR1Y2UoKT9cbiAgICBfc3RhdGVSZWR1Y2Vycy5mb3JFYWNoKGZ1bmN0aW9uIGFwcGx5U3RhdGVSZWR1Y2VyRnVuY3Rpb24ocmVkdWNlckZ1bmMpIHtcbiAgICAgIHN0YXRlID0gcmVkdWNlckZ1bmMoc3RhdGUsIGFjdGlvbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlbXBsYXRlIHJlZHVjZXIgZnVuY3Rpb25cbiAgICogU3RvcmUgc3RhdGUgaXNuJ3QgbW9kaWZpZWQsIGN1cnJlbnQgc3RhdGUgaXMgcGFzc2VkIGluIGFuZCBtdXRhdGVkIHN0YXRlIHJldHVybmVkXG5cbiAgIGZ1bmN0aW9uIHRlbXBsYXRlUmVkdWNlckZ1bmN0aW9uKHN0YXRlLCBldmVudCkge1xuICAgICAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcbiAgICAgICAgICBjYXNlIF9ub3JpQWN0aW9uQ29uc3RhbnRzLk1PREVMX0RBVEFfQ0hBTkdFRDpcbiAgICAgICAgICAgIC8vIGNhbiBjb21wb3NlIG90aGVyIHJlZHVjZXJzXG4gICAgICAgICAgICAvLyByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIG90aGVyU3RhdGVUcmFuc2Zvcm1lcihzdGF0ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCB7cHJvcDogZXZlbnQucGF5bG9hZC52YWx1ZX0pO1xuICAgICAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1JlZHVjZXIgc3RvcmUsIHVuaGFuZGxlZCBldmVudCB0eXBlOiAnK2V2ZW50LnR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAqL1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZTogaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSxcbiAgICBnZXRTdGF0ZSAgICAgICAgICAgICAgOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZSAgICAgICAgICAgICAgOiBzZXRTdGF0ZSxcbiAgICBhcHBseSAgICAgICAgICAgICAgICAgOiBhcHBseSxcbiAgICBzZXRSZWR1Y2VycyAgICAgICAgICAgOiBzZXRSZWR1Y2VycyxcbiAgICBhZGRSZWR1Y2VyICAgICAgICAgICAgOiBhZGRSZWR1Y2VyLFxuICAgIGFwcGx5UmVkdWNlcnMgICAgICAgICA6IGFwcGx5UmVkdWNlcnMsXG4gICAgYXBwbHlSZWR1Y2Vyc1RvU3RhdGUgIDogYXBwbHlSZWR1Y2Vyc1RvU3RhdGUsXG4gICAgaGFuZGxlU3RhdGVNdXRhdGlvbiAgIDogaGFuZGxlU3RhdGVNdXRhdGlvblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluUmVkdWNlclN0b3JlKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKlxuIE1hdHQgUGVya2lucywgNi8xMi8xNVxuXG4gcHVibGlzaCBwYXlsb2FkIG9iamVjdFxuXG4ge1xuIHR5cGU6IEVWVF9UWVBFLFxuIHBheWxvYWQ6IHtcbiBrZXk6IHZhbHVlXG4gfVxuIH1cblxuICovXG52YXIgRGlzcGF0Y2hlciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3RNYXAgID0ge30sXG4gICAgICBfcmVjZWl2ZXJNYXAgPSB7fSxcbiAgICAgIF9pZCAgICAgICAgICA9IDAsXG4gICAgICBfbG9nICAgICAgICAgPSBbXSxcbiAgICAgIF9xdWV1ZSAgICAgICA9IFtdLFxuICAgICAgX3RpbWVyT2JzZXJ2YWJsZSxcbiAgICAgIF90aW1lclN1YnNjcmlwdGlvbixcbiAgICAgIF90aW1lclBhdXNhYmxlO1xuXG4gIC8qKlxuICAgKiBBZGQgYW4gZXZlbnQgYXMgb2JzZXJ2YWJsZVxuICAgKiBAcGFyYW0gZXZ0U3RyIEV2ZW50IG5hbWUgc3RyaW5nXG4gICAqIEBwYXJhbSBoYW5kbGVyIG9uTmV4dCgpIHN1YnNjcmlwdGlvbiBmdW5jdGlvblxuICAgKiBAcGFyYW0gb25jZU9yQ29udGV4dCBvcHRpb25hbCwgZWl0aGVyIHRoZSBjb250ZXh0IHRvIGV4ZWN1dGUgdGhlIGhhbmRlciBvciBvbmNlIGJvb2xcbiAgICogQHBhcmFtIG9uY2Ugd2lsbCBjb21wbGV0ZS9kaXNwb3NlIGFmdGVyIG9uZSBmaXJlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGV2dFN0ciwgaGFuZGxlciwgb25jZU9yQ29udGV4dCwgb25jZSkge1xuICAgIHZhciBoYW5kbGVyQ29udGV4dCA9IHdpbmRvdztcblxuICAgIC8vY29uc29sZS5sb2coJ2Rpc3BhdGNoZXIgc3Vic2NyaWJlJywgZXZ0U3RyLCBoYW5kbGVyLCBvbmNlT3JDb250ZXh0LCBvbmNlKTtcblxuICAgIGlmIChpcy5mYWxzZXkoZXZ0U3RyKSkge1xuICAgICAgY29uc29sZS53YXJuKCdEaXNwYXRjaGVyOiBGYXNsZXkgZXZlbnQgc3RyaW5nIHBhc3NlZCBmb3IgaGFuZGxlcicsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmIChpcy5mYWxzZXkoaGFuZGxlcikpIHtcbiAgICAgIGNvbnNvbGUud2FybignRGlzcGF0Y2hlcjogRmFzbGV5IGhhbmRsZXIgcGFzc2VkIGZvciBldmVudCBzdHJpbmcnLCBldnRTdHIpO1xuICAgIH1cblxuICAgIGlmIChvbmNlT3JDb250ZXh0IHx8IG9uY2VPckNvbnRleHQgPT09IGZhbHNlKSB7XG4gICAgICBpZiAob25jZU9yQ29udGV4dCA9PT0gdHJ1ZSB8fCBvbmNlT3JDb250ZXh0ID09PSBmYWxzZSkge1xuICAgICAgICBvbmNlID0gb25jZU9yQ29udGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhhbmRsZXJDb250ZXh0ID0gb25jZU9yQ29udGV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIV9zdWJqZWN0TWFwW2V2dFN0cl0pIHtcbiAgICAgIF9zdWJqZWN0TWFwW2V2dFN0cl0gPSBbXTtcbiAgICB9XG5cbiAgICB2YXIgc3ViamVjdCA9IG5ldyBSeC5TdWJqZWN0KCk7XG5cbiAgICBfc3ViamVjdE1hcFtldnRTdHJdLnB1c2goe1xuICAgICAgb25jZSAgICA6IG9uY2UsXG4gICAgICBwcmlvcml0eTogMCxcbiAgICAgIGhhbmRsZXIgOiBoYW5kbGVyLFxuICAgICAgY29udGV4dCA6IGhhbmRsZXJDb250ZXh0LFxuICAgICAgc3ViamVjdCA6IHN1YmplY3QsXG4gICAgICB0eXBlICAgIDogMFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIuYmluZChoYW5kbGVyQ29udGV4dCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdGhlIGV2ZW50IHByb2Nlc3NpbmcgdGltZXIgb3IgcmVzdW1lIGEgcGF1c2VkIHRpbWVyXG4gICAqL1xuICBmdW5jdGlvbiBpbml0VGltZXIoKSB7XG4gICAgaWYgKF90aW1lck9ic2VydmFibGUpIHtcbiAgICAgIF90aW1lclBhdXNhYmxlLm9uTmV4dCh0cnVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfdGltZXJQYXVzYWJsZSAgICAgPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIF90aW1lck9ic2VydmFibGUgICA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMSkucGF1c2FibGUoX3RpbWVyUGF1c2FibGUpO1xuICAgIF90aW1lclN1YnNjcmlwdGlvbiA9IF90aW1lck9ic2VydmFibGUuc3Vic2NyaWJlKHByb2Nlc3NOZXh0RXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNoaWZ0IG5leHQgZXZlbnQgdG8gaGFuZGxlIG9mZiBvZiB0aGUgcXVldWUgYW5kIGRpc3BhdGNoIGl0XG4gICAqL1xuICBmdW5jdGlvbiBwcm9jZXNzTmV4dEV2ZW50KCkge1xuICAgIHZhciBldnQgPSBfcXVldWUuc2hpZnQoKTtcbiAgICBpZiAoZXZ0KSB7XG4gICAgICBkaXNwYXRjaFRvUmVjZWl2ZXJzKGV2dCk7XG4gICAgICBkaXNwYXRjaFRvU3Vic2NyaWJlcnMoZXZ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX3RpbWVyUGF1c2FibGUub25OZXh0KGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHVzaCBldmVudCB0byB0aGUgc3RhY2sgYW5kIGJlZ2luIGV4ZWN1dGlvblxuICAgKiBAcGFyYW0gcGF5bG9hZE9iaiB0eXBlOlN0cmluZywgcGF5bG9hZDpkYXRhXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqL1xuICBmdW5jdGlvbiBwdWJsaXNoKHBheWxvYWRPYmopIHtcbiAgICBfbG9nLnB1c2gocGF5bG9hZE9iaik7XG4gICAgX3F1ZXVlLnB1c2gocGF5bG9hZE9iaik7XG5cbiAgICBpbml0VGltZXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIHRoZSBwYXlsb2FkIHRvIGFsbCByZWNlaXZlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIGRpc3BhdGNoVG9SZWNlaXZlcnMocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIF9yZWNlaXZlck1hcCkge1xuICAgICAgX3JlY2VpdmVyTWFwW2lkXS5oYW5kbGVyKHBheWxvYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVycyByZWNlaXZlIGFsbCBwYXlsb2FkcyBmb3IgYSBnaXZlbiBldmVudCB0eXBlIHdoaWxlIGhhbmRsZXJzIGFyZSB0YXJnZXRlZFxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2hUb1N1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBfc3ViamVjdE1hcFtwYXlsb2FkLnR5cGVdLCBpO1xuICAgIGlmICghc3Vic2NyaWJlcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdmFyIHN1YmpPYmogPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgIGlmIChzdWJqT2JqLnR5cGUgPT09IDApIHtcbiAgICAgICAgc3Viak9iai5zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJqT2JqLm9uY2UpIHtcbiAgICAgICAgdW5zdWJzY3JpYmUocGF5bG9hZC50eXBlLCBzdWJqT2JqLmhhbmRsZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBoYW5kbGVyXG4gICAqIEBwYXJhbSBldnRTdHJcbiAgICogQHBhcmFtIGhhbmRlclxuICAgKi9cbiAgZnVuY3Rpb24gdW5zdWJzY3JpYmUoZXZ0U3RyLCBoYW5kbGVyKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwW2V2dFN0cl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdWJzY3JpYmVycyA9IF9zdWJqZWN0TWFwW2V2dFN0cl0sXG4gICAgICAgIGhhbmRsZXJJZHggID0gLTE7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc3Vic2NyaWJlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzdWJzY3JpYmVyc1tpXS5oYW5kbGVyID09PSBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJJZHggICAgID0gaTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0uc3ViamVjdC5vbkNvbXBsZXRlZCgpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXS5zdWJqZWN0LmRpc3Bvc2UoKTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0gPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYW5kbGVySWR4ID09PSAtMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN1YnNjcmliZXJzLnNwbGljZShoYW5kbGVySWR4LCAxKTtcblxuICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlbGV0ZSBfc3ViamVjdE1hcFtldnRTdHJdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBsb2cgYXJyYXlcbiAgICogQHJldHVybnMge0FycmF5LjxUPn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExvZygpIHtcbiAgICByZXR1cm4gX2xvZy5zbGljZSgwKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNpbXBsZSByZWNlaXZlciBpbXBsZW1lbnRhdGlvbiBiYXNlZCBvbiBGbHV4XG4gICAqIFJlZ2lzdGVyZWQgcmVjZWl2ZXJzIHdpbGwgZ2V0IGV2ZXJ5IHB1Ymxpc2hlZCBldmVudFxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svZmx1eC9ibG9iL21hc3Rlci9zcmMvRGlzcGF0Y2hlci5qc1xuICAgKlxuICAgKiBVc2FnZTpcbiAgICpcbiAgICogX2Rpc3BhdGNoZXIucmVnaXN0ZXJSZWNlaXZlcihmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgICAgICogICAgY29uc29sZS5sb2coJ3JlY2VpdmluZywgJyxwYXlsb2FkKTtcbiAgICAgICAqIH0pO1xuICAgKlxuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXJSZWNlaXZlcihoYW5kbGVyKSB7XG4gICAgdmFyIGlkICAgICAgICAgICA9ICdJRF8nICsgX2lkKys7XG4gICAgX3JlY2VpdmVyTWFwW2lkXSA9IHtcbiAgICAgIGlkICAgICA6IGlkLFxuICAgICAgaGFuZGxlcjogaGFuZGxlclxuICAgIH07XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cblxuICAvKipcbiAgICogUmVtb3ZlIGEgcmVjZWl2ZXIgaGFuZGxlclxuICAgKiBAcGFyYW0gaWRcbiAgICovXG4gIGZ1bmN0aW9uIHVucmVnaXN0ZXJSZWNlaXZlcihpZCkge1xuICAgIGlmIChfcmVjZWl2ZXJNYXAuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICBkZWxldGUgX3JlY2VpdmVyTWFwW2lkXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1YnNjcmliZSAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIHVuc3Vic2NyaWJlICAgICAgIDogdW5zdWJzY3JpYmUsXG4gICAgcHVibGlzaCAgICAgICAgICAgOiBwdWJsaXNoLFxuICAgIGdldExvZyAgICAgICAgICAgIDogZ2V0TG9nLFxuICAgIHJlZ2lzdGVyUmVjZWl2ZXIgIDogcmVnaXN0ZXJSZWNlaXZlcixcbiAgICB1bnJlZ2lzdGVyUmVjZWl2ZXI6IHVucmVnaXN0ZXJSZWNlaXZlclxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXIoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWRkIFJ4SlMgU3ViamVjdCB0byBhIG1vZHVsZS5cbiAqXG4gKiBBZGQgb25lIHNpbXBsZSBvYnNlcnZhYmxlIHN1YmplY3Qgb3IgbW9yZSBjb21wbGV4IGFiaWxpdHkgdG8gY3JlYXRlIG90aGVycyBmb3JcbiAqIG1vcmUgY29tcGxleCBldmVudGluZyBuZWVkcy5cbiAqL1xudmFyIE1peGluT2JzZXJ2YWJsZVN1YmplY3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICAgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9zdWJqZWN0TWFwID0ge307XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBzdWJqZWN0XG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3ViamVjdChuYW1lKSB7XG4gICAgaWYgKCFfc3ViamVjdE1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgX3N1YmplY3RNYXBbbmFtZV0gPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gX3N1YmplY3RNYXBbbmFtZV07XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIGhhbmRsZXIgdG8gdXBkYXRlcy4gSWYgdGhlIGhhbmRsZXIgaXMgYSBzdHJpbmcsIHRoZSBuZXcgc3ViamVjdFxuICAgKiB3aWxsIGJlIGNyZWF0ZWQuXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXJPck5hbWUsIG9wdEhhbmRsZXIpIHtcbiAgICBpZiAoaXMuc3RyaW5nKGhhbmRsZXJPck5hbWUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3ViamVjdChoYW5kbGVyT3JOYW1lKS5zdWJzY3JpYmUob3B0SGFuZGxlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlck9yTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHVwZGF0ZWQgdG8gc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICBfc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBuYW1lZCBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnNPZihuYW1lLCBwYXlsb2FkKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXS5vbk5leHQocGF5bG9hZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignTWl4aW5PYnNlcnZhYmxlU3ViamVjdCwgbm8gc3Vic2NyaWJlcnMgb2YgJyArIG5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIGNyZWF0ZVN1YmplY3QgICAgICA6IGNyZWF0ZVN1YmplY3QsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnMgIDogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnNPZjogbm90aWZ5U3Vic2NyaWJlcnNPZlxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluT2JzZXJ2YWJsZVN1YmplY3Q7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFV0aWxpdHkgdG8gaGFuZGxlIGFsbCB2aWV3IERPTSBhdHRhY2htZW50IHRhc2tzXG4gKi9cblxudmFyIFJlbmRlcmVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX2RvbVV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiByZW5kZXIocGF5bG9hZCkge1xuICAgIHZhciB0YXJnZXRTZWxlY3RvciA9IHBheWxvYWQudGFyZ2V0LFxuICAgICAgICBodG1sICAgICAgICAgICA9IHBheWxvYWQuaHRtbCxcbiAgICAgICAgZG9tRWwsXG4gICAgICAgIG1vdW50UG9pbnQgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXRTZWxlY3RvciksXG4gICAgICAgIGNiICAgICAgICAgICAgID0gcGF5bG9hZC5jYWxsYmFjaztcblxuICAgIG1vdW50UG9pbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBpZiAoaHRtbCkge1xuICAgICAgZG9tRWwgPSBfZG9tVXRpbHMuSFRNTFN0clRvTm9kZShodG1sKTtcbiAgICAgIG1vdW50UG9pbnQuYXBwZW5kQ2hpbGQoZG9tRWwpO1xuICAgIH1cblxuICAgIGlmIChjYikge1xuICAgICAgY2IoZG9tRWwpO1xuICAgIH1cblxuICAgIHJldHVybiBkb21FbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcmVuZGVyOiByZW5kZXJcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZW5kZXJlcigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBTaW1wbGUgcm91dGVyXG4gKiBTdXBwb3J0aW5nIElFOSBzbyB1c2luZyBoYXNoZXMgaW5zdGVhZCBvZiB0aGUgaGlzdG9yeSBBUEkgZm9yIG5vd1xuICovXG5cbnZhciBSb3V0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICA9IG5ldyBSeC5TdWJqZWN0KCksXG4gICAgICBfaGFzaENoYW5nZU9ic2VydmFibGUsXG4gICAgICBfb2JqVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29yZS9PYmplY3RVdGlscy5qcycpO1xuXG4gIC8qKlxuICAgKiBTZXQgZXZlbnQgaGFuZGxlcnNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG4gICAgX2hhc2hDaGFuZ2VPYnNlcnZhYmxlID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQod2luZG93LCAnaGFzaGNoYW5nZScpLnN1YnNjcmliZShub3RpZnlTdWJzY3JpYmVycyk7XG4gIH1cblxuICAvKipcbiAgICogc3Vic2NyaWJlIGEgaGFuZGxlciB0byB0aGUgdXJsIGNoYW5nZSBldmVudHNcbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlcikge1xuICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogTm90aWZ5IG9mIGEgY2hhbmdlIGluIHJvdXRlXG4gICAqIEBwYXJhbSBmcm9tQXBwIFRydWUgaWYgdGhlIHJvdXRlIHdhcyBjYXVzZWQgYnkgYW4gYXBwIGV2ZW50IG5vdCBVUkwgb3IgaGlzdG9yeSBjaGFuZ2VcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKCkge1xuICAgIHZhciBldmVudFBheWxvYWQgPSB7XG4gICAgICByb3V0ZU9iajogZ2V0Q3VycmVudFJvdXRlKCksIC8vIHsgcm91dGU6LCBkYXRhOiB9XG4gICAgICBmcmFnbWVudDogZ2V0VVJMRnJhZ21lbnQoKVxuICAgIH07XG5cbiAgICBfc3ViamVjdC5vbk5leHQoZXZlbnRQYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIHJvdXRlIGFuZCBxdWVyeSBzdHJpbmcgZnJvbSB0aGUgY3VycmVudCBVUkwgZnJhZ21lbnRcbiAgICogQHJldHVybnMge3tyb3V0ZTogc3RyaW5nLCBxdWVyeToge319fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFJvdXRlKCkge1xuICAgIHZhciBmcmFnbWVudCAgICA9IGdldFVSTEZyYWdtZW50KCksXG4gICAgICAgIHBhcnRzICAgICAgID0gZnJhZ21lbnQuc3BsaXQoJz8nKSxcbiAgICAgICAgcm91dGUgICAgICAgPSAnLycgKyBwYXJ0c1swXSxcbiAgICAgICAgcXVlcnlTdHIgICAgPSBkZWNvZGVVUklDb21wb25lbnQocGFydHNbMV0pLFxuICAgICAgICBxdWVyeVN0ck9iaiA9IHBhcnNlUXVlcnlTdHIocXVlcnlTdHIpO1xuXG4gICAgaWYgKHF1ZXJ5U3RyID09PSAnPXVuZGVmaW5lZCcpIHtcbiAgICAgIHF1ZXJ5U3RyT2JqID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtyb3V0ZTogcm91dGUsIGRhdGE6IHF1ZXJ5U3RyT2JqfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgYSBxdWVyeSBzdHJpbmcgaW50byBrZXkvdmFsdWUgcGFpcnNcbiAgICogQHBhcmFtIHF1ZXJ5U3RyXG4gICAqIEByZXR1cm5zIHt7fX1cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlUXVlcnlTdHIocXVlcnlTdHIpIHtcbiAgICB2YXIgb2JqICAgPSB7fSxcbiAgICAgICAgcGFydHMgPSBxdWVyeVN0ci5zcGxpdCgnJicpO1xuXG4gICAgcGFydHMuZm9yRWFjaChmdW5jdGlvbiAocGFpclN0cikge1xuICAgICAgdmFyIHBhaXJBcnIgICAgID0gcGFpclN0ci5zcGxpdCgnPScpO1xuICAgICAgb2JqW3BhaXJBcnJbMF1dID0gcGFpckFyclsxXTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQ29tYmluZXMgYSByb3V0ZSBhbmQgZGF0YSBvYmplY3QgaW50byBhIHByb3BlciBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcm91dGVcbiAgICogQHBhcmFtIGRhdGFPYmpcbiAgICovXG4gIGZ1bmN0aW9uIHNldChyb3V0ZSwgZGF0YU9iaikge1xuICAgIHZhciBwYXRoID0gcm91dGUsXG4gICAgICAgIGRhdGEgPSBbXTtcbiAgICBpZiAoIV9vYmpVdGlscy5pc051bGwoZGF0YU9iaikpIHtcbiAgICAgIHBhdGggKz0gXCI/XCI7XG4gICAgICBmb3IgKHZhciBwcm9wIGluIGRhdGFPYmopIHtcbiAgICAgICAgaWYgKHByb3AgIT09ICd1bmRlZmluZWQnICYmIGRhdGFPYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICBkYXRhLnB1c2gocHJvcCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChkYXRhT2JqW3Byb3BdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHBhdGggKz0gZGF0YS5qb2luKCcmJyk7XG4gICAgfVxuXG4gICAgdXBkYXRlVVJMRnJhZ21lbnQocGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBldmVyeXRoaW5nIGFmdGVyIHRoZSAnd2hhdGV2ZXIuaHRtbCMnIGluIHRoZSBVUkxcbiAgICogTGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyBhcmUgcmVtb3ZlZFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VVJMRnJhZ21lbnQoKSB7XG4gICAgdmFyIGZyYWdtZW50ID0gbG9jYXRpb24uaGFzaC5zbGljZSgxKTtcbiAgICByZXR1cm4gZnJhZ21lbnQudG9TdHJpbmcoKS5yZXBsYWNlKC9cXC8kLywgJycpLnJlcGxhY2UoL15cXC8vLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcGF0aFxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlVVJMRnJhZ21lbnQocGF0aCkge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICA6IGluaXRpYWxpemUsXG4gICAgc3Vic2NyaWJlICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVyczogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBzZXQgICAgICAgICAgICAgIDogc2V0XG4gIH07XG5cbn07XG5cbnZhciByID0gUm91dGVyKCk7XG5yLmluaXRpYWxpemUoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBSeEpTIEhlbHBlcnNcbiAqIEB0eXBlIHt7ZG9tOiBGdW5jdGlvbiwgZnJvbTogRnVuY3Rpb24sIGludGVydmFsOiBGdW5jdGlvbiwgZG9FdmVyeTogRnVuY3Rpb24sIGp1c3Q6IEZ1bmN0aW9uLCBlbXB0eTogRnVuY3Rpb259fVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBkb206IGZ1bmN0aW9uIChzZWxlY3RvciwgZXZlbnQpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBpZiAoIWVsKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ25vcmkvdXRpbHMvUngsIGRvbSwgaW52YWxpZCBET00gc2VsZWN0b3I6ICcgKyBzZWxlY3Rvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChlbCwgZXZlbnQudHJpbSgpKTtcbiAgfSxcblxuICBmcm9tOiBmdW5jdGlvbiAoaXR0cikge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb20oaXR0cik7XG4gIH0sXG5cbiAgaW50ZXJ2YWw6IGZ1bmN0aW9uIChtcykge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmludGVydmFsKG1zKTtcbiAgfSxcblxuICBkb0V2ZXJ5OiBmdW5jdGlvbiAobXMsIC4uLmFyZ3MpIHtcbiAgICBpZihpcy5mdW5jdGlvbihhcmdzWzBdKSkge1xuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnN1YnNjcmliZShhcmdzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnRha2UoYXJnc1swXSkuc3Vic2NyaWJlKGFyZ3NbMV0pO1xuICB9LFxuXG4gIGp1c3Q6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmp1c3QodmFsdWUpO1xuICB9LFxuXG4gIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZW1wdHkoKTtcbiAgfVxuXG59OyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLypcbiBTaW1wbGUgd3JhcHBlciBmb3IgVW5kZXJzY29yZSAvIEhUTUwgdGVtcGxhdGVzXG4gTWF0dCBQZXJraW5zXG4gNC83LzE1XG4gKi9cbnZhciBUZW1wbGF0aW5nID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGVtcGxhdGVNYXAgICAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX3RlbXBsYXRlSFRNTENhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF90ZW1wbGF0ZUNhY2hlICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfRE9NVXRpbHMgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIGFkZFRlbXBsYXRlKGlkLCBodG1sKSB7XG4gICAgX3RlbXBsYXRlTWFwW2lkXSA9IGh0bWw7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTb3VyY2VGcm9tVGVtcGxhdGVNYXAoaWQpIHtcbiAgICB2YXIgc291cmNlID0gX3RlbXBsYXRlTWFwW2lkXTtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gY2xlYW5UZW1wbGF0ZUhUTUwoc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U291cmNlRnJvbUhUTUwoaWQpIHtcbiAgICB2YXIgc3JjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpLFxuICAgICAgICBzcmNodG1sO1xuXG4gICAgaWYgKHNyYykge1xuICAgICAgc3JjaHRtbCA9IHNyYy5pbm5lckhUTUw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignbnVkb3J1L2NvcmUvVGVtcGxhdGluZywgdGVtcGxhdGUgbm90IGZvdW5kOiBcIicgKyBpZCArICdcIicpO1xuICAgICAgc3JjaHRtbCA9ICc8ZGl2PlRlbXBsYXRlIG5vdCBmb3VuZDogJyArIGlkICsgJzwvZGl2Pic7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFuVGVtcGxhdGVIVE1MKHNyY2h0bWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdGVtcGxhdGUgaHRtbCBmcm9tIHRoZSBzY3JpcHQgdGFnIHdpdGggaWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U291cmNlKGlkKSB7XG4gICAgaWYgKF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdO1xuICAgIH1cblxuICAgIHZhciBzb3VyY2VodG1sID0gZ2V0U291cmNlRnJvbVRlbXBsYXRlTWFwKGlkKTtcblxuICAgIGlmICghc291cmNlaHRtbCkge1xuICAgICAgc291cmNlaHRtbCA9IGdldFNvdXJjZUZyb21IVE1MKGlkKTtcbiAgICB9XG5cbiAgICBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdID0gc291cmNlaHRtbDtcbiAgICByZXR1cm4gc291cmNlaHRtbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCBJRHMgYmVsb25naW5nIHRvIHRleHQvdGVtcGxhdGUgdHlwZSBzY3JpcHQgdGFnc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRBbGxUZW1wbGF0ZUlEcygpIHtcbiAgICB2YXIgc2NyaXB0VGFncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgMCk7XG5cbiAgICByZXR1cm4gc2NyaXB0VGFncy5maWx0ZXIoZnVuY3Rpb24gKHRhZykge1xuICAgICAgcmV0dXJuIHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gJ3RleHQvdGVtcGxhdGUnO1xuICAgIH0pLm1hcChmdW5jdGlvbiAodGFnKSB7XG4gICAgICByZXR1cm4gdGFnLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIHVuZGVyc2NvcmUgdGVtcGxhdGVcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VGVtcGxhdGUoaWQpIHtcbiAgICBpZiAoX3RlbXBsYXRlQ2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gX3RlbXBsYXRlQ2FjaGVbaWRdO1xuICAgIH1cbiAgICB2YXIgdGVtcGwgICAgICAgICAgPSBfLnRlbXBsYXRlKGdldFNvdXJjZShpZCkpO1xuICAgIF90ZW1wbGF0ZUNhY2hlW2lkXSA9IHRlbXBsO1xuICAgIHJldHVybiB0ZW1wbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIEhUTUxcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0hUTUwoaWQsIG9iaikge1xuICAgIHZhciB0ZW1wID0gZ2V0VGVtcGxhdGUoaWQpO1xuICAgIHJldHVybiB0ZW1wKG9iaik7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSBhbmQgcmV0dXJucyBhbiBIVE1MIEVsZW1lbnRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0VsZW1lbnQoaWQsIG9iaikge1xuICAgIHJldHVybiBfRE9NVXRpbHMuSFRNTFN0clRvTm9kZShhc0hUTUwoaWQsIG9iaikpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFucyB0ZW1wbGF0ZSBIVE1MXG4gICAqL1xuICBmdW5jdGlvbiBjbGVhblRlbXBsYXRlSFRNTChzdHIpIHtcbiAgICByZXR1cm4gc3RyLnRyaW0oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgcmV0dXJucywgc3BhY2VzIGFuZCB0YWJzXG4gICAqIEBwYXJhbSBzdHJcbiAgICogQHJldHVybnMge1hNTHxzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVXaGl0ZVNwYWNlKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyfFxcdCkvZ20sICcnKS5yZXBsYWNlKC8+XFxzKzwvZywgJz48Jyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGFsbCB0ZW1wbGF0ZXMsIGNsZWFuIHRoZW0gdXAgYW5kIGxvZ1xuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogU28gdGhpcyBoZWxwcyBjcmVhdGUgdGhlIGJsb2NrcyBmb3IgaW5zZXJ0aW9uIGluIHRvIHRoZSBET01cbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NGb3JET01JbnNlcnRpb24oKSB7XG4gICAgdmFyIGlkcyA9IGdldEFsbFRlbXBsYXRlSURzKCk7XG4gICAgaWRzLmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICB2YXIgc3JjID0gcmVtb3ZlV2hpdGVTcGFjZShnZXRTb3VyY2UoaWQpKTtcbiAgICAgIGNvbnNvbGUubG9nKGlkLCBzcmMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHRlbXBsYXRlIHNjcmlwdCB0YWcgdG8gdGhlIERPTVxuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBodG1sXG4gICAqL1xuICAvL2Z1bmN0aW9uIGFkZENsaWVudFNpZGVUZW1wbGF0ZVRvRE9NKGlkLCBodG1sKSB7XG4gIC8vICB2YXIgcyAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAvLyAgcy50eXBlICAgICAgPSAndGV4dC90ZW1wbGF0ZSc7XG4gIC8vICBzLmlkICAgICAgICA9IGlkO1xuICAvLyAgcy5pbm5lckhUTUwgPSBodG1sO1xuICAvLyAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChzKTtcbiAgLy99XG5cbiAgcmV0dXJuIHtcbiAgICBhZGRUZW1wbGF0ZSAgICAgICAgICAgOiBhZGRUZW1wbGF0ZSxcbiAgICBnZXRTb3VyY2UgICAgICAgICAgICAgOiBnZXRTb3VyY2UsXG4gICAgZ2V0QWxsVGVtcGxhdGVJRHMgICAgIDogZ2V0QWxsVGVtcGxhdGVJRHMsXG4gICAgcHJvY2Vzc0ZvckRPTUluc2VydGlvbjogcHJvY2Vzc0ZvckRPTUluc2VydGlvbixcbiAgICBnZXRUZW1wbGF0ZSAgICAgICAgICAgOiBnZXRUZW1wbGF0ZSxcbiAgICBhc0hUTUwgICAgICAgICAgICAgICAgOiBhc0hUTUwsXG4gICAgYXNFbGVtZW50ICAgICAgICAgICAgIDogYXNFbGVtZW50XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGluZygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxudmFyIEFwcGxpY2F0aW9uVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3RoaXMsXG4gICAgICBfdGVtcGxhdGUgPSByZXF1aXJlKCcuLi91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfZG9tVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgSW5pdGlhbGl6YXRpb25cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVcbiAgICogQHBhcmFtIHNjYWZmb2xkVGVtcGxhdGVzIHRlbXBsYXRlIElEcyB0byBhdHRhY2hlZCB0byB0aGUgYm9keSBmb3IgdGhlIGFwcFxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyhzY2FmZm9sZFRlbXBsYXRlcykge1xuICAgIF90aGlzID0gdGhpcztcblxuICAgIGF0dGFjaEFwcGxpY2F0aW9uU2NhZmZvbGRpbmcoc2NhZmZvbGRUZW1wbGF0ZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGFjaCBhcHAgSFRNTCBzdHJ1Y3R1cmVcbiAgICogQHBhcmFtIHRlbXBsYXRlc1xuICAgKi9cbiAgZnVuY3Rpb24gYXR0YWNoQXBwbGljYXRpb25TY2FmZm9sZGluZyh0ZW1wbGF0ZXMpIHtcbiAgICBpZiAoIXRlbXBsYXRlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBib2R5RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XG5cbiAgICB0ZW1wbGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAodGVtcGwpIHtcbiAgICAgIGJvZHlFbC5hcHBlbmRDaGlsZChfZG9tVXRpbHMuSFRNTFN0clRvTm9kZShfdGVtcGxhdGUuZ2V0U291cmNlKHRlbXBsLCB7fSkpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZnRlciBhcHAgaW5pdGlhbGl6YXRpb24sIHJlbW92ZSB0aGUgbG9hZGluZyBtZXNzYWdlXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVMb2FkaW5nTWVzc2FnZSgpIHtcbiAgICB2YXIgY292ZXIgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbml0aWFsaXphdGlvbl9fY292ZXInKSxcbiAgICAgICAgbWVzc2FnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5pbml0aWFsaXphdGlvbl9fbWVzc2FnZScpO1xuXG4gICAgVHdlZW5MaXRlLnRvKGNvdmVyLCAxLCB7XG4gICAgICBhbHBoYTogMCwgZWFzZTogUXVhZC5lYXNlT3V0LCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdmVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY292ZXIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHdlZW5MaXRlLnRvKG1lc3NhZ2UsIDIsIHtcbiAgICAgIHRvcDogXCIrPTUwcHhcIiwgZWFzZTogUXVhZC5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY292ZXIucmVtb3ZlQ2hpbGQobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXc6IGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcsXG4gICAgcmVtb3ZlTG9hZGluZ01lc3NhZ2UgICAgIDogcmVtb3ZlTG9hZGluZ01lc3NhZ2VcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvblZpZXcoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gdmlldyB0aGF0IGFsbG93cyBmb3IgY29tcG9uZW50IHZpZXdzXG4gKi9cblxudmFyIE1peGluQ29tcG9uZW50Vmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jb21wb25lbnRWaWV3TWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvKipcbiAgICogTWFwIGEgY29tcG9uZW50IHRvIGEgbW91bnRpbmcgcG9pbnQuIElmIGEgc3RyaW5nIGlzIHBhc3NlZCxcbiAgICogdGhlIGNvcnJlY3Qgb2JqZWN0IHdpbGwgYmUgY3JlYXRlZCBmcm9tIHRoZSBmYWN0b3J5IG1ldGhvZCwgb3RoZXJ3aXNlLFxuICAgKiB0aGUgcGFzc2VkIGNvbXBvbmVudCBvYmplY3QgaXMgdXNlZC5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqIEBwYXJhbSBtb3VudFBvaW50XG4gICAqL1xuICBmdW5jdGlvbiBtYXBWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBjb21wb25lbnRJRG9yT2JqLCBtb3VudFBvaW50KSB7XG4gICAgdmFyIGNvbXBvbmVudE9iajtcblxuICAgIGlmICh0eXBlb2YgY29tcG9uZW50SURvck9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBjb21wb25lbnRGYWN0b3J5ID0gcmVxdWlyZShjb21wb25lbnRJRG9yT2JqKTtcbiAgICAgIGNvbXBvbmVudE9iaiAgICAgICAgID0gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRGYWN0b3J5KCkpKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudE9iaiA9IGNvbXBvbmVudElEb3JPYmo7XG4gICAgfVxuXG4gICAgX2NvbXBvbmVudFZpZXdNYXBbY29tcG9uZW50SURdID0ge1xuICAgICAgY29udHJvbGxlcjogY29tcG9uZW50T2JqLFxuICAgICAgbW91bnRQb2ludDogbW91bnRQb2ludFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmFjdG9yeSB0byBjcmVhdGUgY29tcG9uZW50IHZpZXcgbW9kdWxlcyBieSBjb25jYXRpbmcgbXVsdGlwbGUgc291cmNlIG9iamVjdHNcbiAgICogQHBhcmFtIGNvbXBvbmVudFNvdXJjZSBDdXN0b20gbW9kdWxlIHNvdXJjZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudFZpZXcoY29tcG9uZW50U291cmNlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb21wb25lbnRWaWV3RmFjdG9yeSAgPSByZXF1aXJlKCcuL1ZpZXdDb21wb25lbnQuanMnKSxcbiAgICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkgPSByZXF1aXJlKCcuL01peGluRXZlbnREZWxlZ2F0b3IuanMnKSxcbiAgICAgICAgICBvYnNlcnZhYmxlRmFjdG9yeSAgICAgPSByZXF1aXJlKCcuLi91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyksXG4gICAgICAgICAgc3RhdGVPYmpGYWN0b3J5ICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvSW1tdXRhYmxlTWFwLmpzJyksXG4gICAgICAgICAgY29tcG9uZW50QXNzZW1ibHksIGZpbmFsQ29tcG9uZW50LCBwcmV2aW91c0luaXRpYWxpemU7XG5cbiAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gW1xuICAgICAgICBjb21wb25lbnRWaWV3RmFjdG9yeSgpLFxuICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkoKSxcbiAgICAgICAgb2JzZXJ2YWJsZUZhY3RvcnkoKSxcbiAgICAgICAgc3RhdGVPYmpGYWN0b3J5KCksXG4gICAgICAgIGNvbXBvbmVudFNvdXJjZVxuICAgICAgXTtcblxuICAgICAgaWYgKGNvbXBvbmVudFNvdXJjZS5taXhpbnMpIHtcbiAgICAgICAgY29tcG9uZW50QXNzZW1ibHkgPSBjb21wb25lbnRBc3NlbWJseS5jb25jYXQoY29tcG9uZW50U291cmNlLm1peGlucyk7XG4gICAgICB9XG5cbiAgICAgIGZpbmFsQ29tcG9uZW50ID0gTm9yaS5hc3NpZ25BcnJheSh7fSwgY29tcG9uZW50QXNzZW1ibHkpO1xuXG4gICAgICAvLyBDb21wb3NlIGEgbmV3IGluaXRpYWxpemUgZnVuY3Rpb24gYnkgaW5zZXJ0aW5nIGNhbGwgdG8gY29tcG9uZW50IHN1cGVyIG1vZHVsZVxuICAgICAgcHJldmlvdXNJbml0aWFsaXplICAgICAgICA9IGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemU7XG4gICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplID0gZnVuY3Rpb24gaW5pdGlhbGl6ZShpbml0T2JqKSB7XG4gICAgICAgIGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemVDb21wb25lbnQoaW5pdE9iaik7XG4gICAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZS5jYWxsKGZpbmFsQ29tcG9uZW50LCBpbml0T2JqKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgZmluYWxDb21wb25lbnQpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIG1hcHBlZCBjb21wb25lbnRWaWV3XG4gICAqIEBwYXJhbSBjb21wb25lbnRJRFxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1ZpZXdDb21wb25lbnQoY29tcG9uZW50SUQsIG1vdW50UG9pbnQpIHtcbiAgICB2YXIgY29tcG9uZW50VmlldyA9IF9jb21wb25lbnRWaWV3TWFwW2NvbXBvbmVudElEXTtcbiAgICBpZiAoIWNvbXBvbmVudFZpZXcpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gY29tcG9uZW50VmlldyBtYXBwZWQgZm9yIGlkOiAnICsgY29tcG9uZW50SUQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmlzSW5pdGlhbGl6ZWQoKSkge1xuICAgICAgbW91bnRQb2ludCA9IG1vdW50UG9pbnQgfHwgY29tcG9uZW50Vmlldy5tb3VudFBvaW50O1xuICAgICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmluaXRpYWxpemUoe1xuICAgICAgICBpZCAgICAgICAgOiBjb21wb25lbnRJRCxcbiAgICAgICAgdGVtcGxhdGUgIDogY29tcG9uZW50Vmlldy5odG1sVGVtcGxhdGUsXG4gICAgICAgIG1vdW50UG9pbnQ6IG1vdW50UG9pbnRcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmNvbXBvbmVudFJlbmRlcigpO1xuICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5tb3VudCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtYXAgb2JqZWN0IGZvciBjb21wb25lbnQgdmlld3NcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb21wb25lbnRWaWV3TWFwKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2NvbXBvbmVudFZpZXdNYXApO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBtYXBWaWV3Q29tcG9uZW50ICAgOiBtYXBWaWV3Q29tcG9uZW50LFxuICAgIGNyZWF0ZUNvbXBvbmVudFZpZXc6IGNyZWF0ZUNvbXBvbmVudFZpZXcsXG4gICAgc2hvd1ZpZXdDb21wb25lbnQgIDogc2hvd1ZpZXdDb21wb25lbnQsXG4gICAgZ2V0Q29tcG9uZW50Vmlld01hcDogZ2V0Q29tcG9uZW50Vmlld01hcFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluQ29tcG9uZW50Vmlld3MoKTsiLCJ2YXIgTWl4aW5ET01NYW5pcHVsYXRpb24gPSBmdW5jdGlvbiAoKSB7XG5cbiAgZnVuY3Rpb24gaGlkZUVsKHNlbGVjdG9yKSB7XG4gICAgVHdlZW5MaXRlLnNldChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSwge1xuICAgICAgYWxwaGEgIDogMCxcbiAgICAgIGRpc3BsYXk6ICdub25lJ1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd0VsKHNlbGVjdG9yKSB7XG4gICAgVHdlZW5MaXRlLnNldChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSwge1xuICAgICAgYWxwaGEgIDogMSxcbiAgICAgIGRpc3BsYXk6ICdibG9jaydcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2hvd0VsOiBzaG93RWwsXG4gICAgaGlkZUVsOiBoaWRlRWxcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkRPTU1hbmlwdWxhdGlvbigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBDb252ZW5pZW5jZSBtaXhpbiB0aGF0IG1ha2VzIGV2ZW50cyBlYXNpZXIgZm9yIHZpZXdzXG4gKlxuICogQmFzZWQgb24gQmFja2JvbmVcbiAqIFJldmlldyB0aGlzIGh0dHA6Ly9ibG9nLm1hcmlvbmV0dGVqcy5jb20vMjAxNS8wMi8xMi91bmRlcnN0YW5kaW5nLXRoZS1ldmVudC1oYXNoL2luZGV4Lmh0bWxcbiAqXG4gKiBFeGFtcGxlOlxuICogdGhpcy5zZXRFdmVudHMoe1xuICogICAgICAgICdjbGljayAjYnRuX21haW5fcHJvamVjdHMnOiBoYW5kbGVQcm9qZWN0c0J1dHRvbixcbiAqICAgICAgICAnY2xpY2sgI2J0bl9mb28sIGNsaWNrICNidG5fYmFyJzogaGFuZGxlRm9vQmFyQnV0dG9uc1xuICogICAgICB9KTtcbiAqIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAqXG4gKi9cblxudmFyIE1peGluRXZlbnREZWxlZ2F0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9ldmVudHNNYXAsXG4gICAgICBfZXZlbnRTdWJzY3JpYmVycyxcbiAgICAgIF9yeCAgICAgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzL1J4JyksXG4gICAgICBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpO1xuXG4gIGZ1bmN0aW9uIHNldEV2ZW50cyhldnRPYmopIHtcbiAgICBfZXZlbnRzTWFwID0gZXZ0T2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RXZlbnRzKCkge1xuICAgIHJldHVybiBfZXZlbnRzTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIEF1dG9tYXRlcyBzZXR0aW5nIGV2ZW50cyBvbiBET00gZWxlbWVudHMuXG4gICAqICdldnRTdHIgc2VsZWN0b3InOmNhbGxiYWNrXG4gICAqICdldnRTdHIgc2VsZWN0b3IsIGV2dFN0ciBzZWxlY3Rvcic6IHNoYXJlZENhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBkZWxlZ2F0ZUV2ZW50cyhhdXRvRm9ybSkge1xuICAgIGlmICghX2V2ZW50c01hcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ldmVudFN1YnNjcmliZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAodmFyIGV2dFN0cmluZ3MgaW4gX2V2ZW50c01hcCkge1xuICAgICAgaWYgKF9ldmVudHNNYXAuaGFzT3duUHJvcGVydHkoZXZ0U3RyaW5ncykpIHtcblxuICAgICAgICB2YXIgbWFwcGluZ3MgICAgID0gZXZ0U3RyaW5ncy5zcGxpdCgnLCcpLFxuICAgICAgICAgICAgZXZlbnRIYW5kbGVyID0gX2V2ZW50c01hcFtldnRTdHJpbmdzXTtcblxuICAgICAgICBpZiAoIWlzLmZ1bmN0aW9uKGV2ZW50SGFuZGxlcikpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0V2ZW50RGVsZWdhdG9yLCBoYW5kbGVyIGZvciAnICsgZXZ0U3RyaW5ncyArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgICAgLy8gaHR0cHM6Ly9qc2xpbnRlcnJvcnMuY29tL2RvbnQtbWFrZS1mdW5jdGlvbnMtd2l0aGluLWEtbG9vcFxuICAgICAgICBtYXBwaW5ncy5mb3JFYWNoKGZ1bmN0aW9uIChldnRNYXApIHtcbiAgICAgICAgICBldnRNYXAgICAgICAgPSBldnRNYXAudHJpbSgpO1xuICAgICAgICAgIHZhciBldmVudFN0ciA9IGV2dE1hcC5zcGxpdCgnICcpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgICAgc2VsZWN0b3IgPSBldnRNYXAuc3BsaXQoJyAnKVsxXS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoX2Jyb3dzZXJJbmZvLm1vYmlsZS5hbnkoKSkge1xuICAgICAgICAgICAgZXZlbnRTdHIgPSBjb252ZXJ0TW91c2VUb1RvdWNoRXZlbnRTdHIoZXZlbnRTdHIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF9ldmVudFN1YnNjcmliZXJzW2V2dFN0cmluZ3NdID0gY3JlYXRlSGFuZGxlcihzZWxlY3RvciwgZXZlbnRTdHIsIGV2ZW50SGFuZGxlciwgYXV0b0Zvcm0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLyoganNoaW50ICtXMDgzICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBjb21tb24gbW91c2UgZXZlbnRzIHRvIHRvdWNoIGVxdWl2YWxlbnRzXG4gICAqIEBwYXJhbSBldmVudFN0clxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbnZlcnRNb3VzZVRvVG91Y2hFdmVudFN0cihldmVudFN0cikge1xuICAgIHN3aXRjaCAoZXZlbnRTdHIpIHtcbiAgICAgIGNhc2UoJ2NsaWNrJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vkb3duJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hzdGFydCc7XG4gICAgICBjYXNlKCdtb3VzZXVwJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vtb3ZlJyk6XG4gICAgICAgIHJldHVybiAndG91Y2htb3ZlJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBldmVudFN0cjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyLCBhdXRvRm9ybSkge1xuICAgIHZhciBvYnNlcnZhYmxlID0gX3J4LmRvbShzZWxlY3RvciwgZXZlbnRTdHIpLFxuICAgICAgICBlbCAgICAgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvciksXG4gICAgICAgIHRhZyAgICAgICAgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIHR5cGUgICAgICAgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcblxuICAgIGlmIChhdXRvRm9ybSkge1xuICAgICAgaWYgKHRhZyA9PT0gJ2lucHV0JyB8fCB0YWcgPT09ICd0ZXh0YXJlYScpIHtcbiAgICAgICAgaWYgKCF0eXBlIHx8IHR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2JsdXInIHx8IGV2ZW50U3RyID09PSAnZm9jdXMnKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgICAubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKVxuICAgICAgICAgICAgICAuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gICAgICAgICAgfSBlbHNlIGlmIChldmVudFN0ciA9PT0gJ2tleXVwJyB8fCBldmVudFN0ciA9PT0gJ2tleWRvd24nKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgICAudGhyb3R0bGUoMTAwKVxuICAgICAgICAgICAgICAubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKVxuICAgICAgICAgICAgICAuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdyYWRpbycgfHwgdHlwZSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2NsaWNrJykge1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmFibGVcbiAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2dC50YXJnZXQuY2hlY2tlZDtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0YWcgPT09ICdzZWxlY3QnKSB7XG4gICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2NoYW5nZScpIHtcbiAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgLm1hcChldnQgPT4gZXZ0LnRhcmdldC52YWx1ZSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYnNlcnZhYmxlLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFubHkgcmVtb3ZlIGV2ZW50c1xuICAgKi9cbiAgZnVuY3Rpb24gdW5kZWxlZ2F0ZUV2ZW50cygpIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBldmVudCBpbiBfZXZlbnRTdWJzY3JpYmVycykge1xuICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZlbnRdLmRpc3Bvc2UoKTtcbiAgICAgIGRlbGV0ZSBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF07XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRFdmVudHMgICAgICAgOiBzZXRFdmVudHMsXG4gICAgZ2V0RXZlbnRzICAgICAgIDogZ2V0RXZlbnRzLFxuICAgIHVuZGVsZWdhdGVFdmVudHM6IHVuZGVsZWdhdGVFdmVudHMsXG4gICAgZGVsZWdhdGVFdmVudHMgIDogZGVsZWdhdGVFdmVudHNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkV2ZW50RGVsZWdhdG9yOyIsIi8qIEBmbG93IHdlYWsgKi9cblxudmFyIE1peGluTnVkb3J1Q29udHJvbHMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9ub3RpZmljYXRpb25WaWV3ICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcycpLFxuICAgICAgX3Rvb2xUaXBWaWV3ICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvVG9vbFRpcFZpZXcuanMnKSxcbiAgICAgIF9tZXNzYWdlQm94VmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzJyksXG4gICAgICBfbWVzc2FnZUJveENyZWF0b3IgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Q3JlYXRvci5qcycpLFxuICAgICAgX21vZGFsQ292ZXJWaWV3ICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKSB7XG4gICAgX3Rvb2xUaXBWaWV3LmluaXRpYWxpemUoJ3Rvb2x0aXBfX2NvbnRhaW5lcicpO1xuICAgIF9ub3RpZmljYXRpb25WaWV3LmluaXRpYWxpemUoJ3RvYXN0X19jb250YWluZXInKTtcbiAgICBfbWVzc2FnZUJveFZpZXcuaW5pdGlhbGl6ZSgnbWVzc2FnZWJveF9fY29udGFpbmVyJyk7XG4gICAgX21vZGFsQ292ZXJWaWV3LmluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1iQ3JlYXRvcigpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hDcmVhdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTWVzc2FnZUJveChvYmopIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlTWVzc2FnZUJveChpZCkge1xuICAgIF9tZXNzYWdlQm94Vmlldy5yZW1vdmUoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWxlcnQobWVzc2FnZSwgdGl0bGUpIHtcbiAgICByZXR1cm4gbWJDcmVhdG9yKCkuYWxlcnQodGl0bGUgfHwgJ0FsZXJ0JywgbWVzc2FnZSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGROb3RpZmljYXRpb24ob2JqKSB7XG4gICAgcmV0dXJuIF9ub3RpZmljYXRpb25WaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KG1lc3NhZ2UsIHRpdGxlLCB0eXBlKSB7XG4gICAgcmV0dXJuIGFkZE5vdGlmaWNhdGlvbih7XG4gICAgICB0aXRsZSAgOiB0aXRsZSB8fCAnJyxcbiAgICAgIHR5cGUgICA6IHR5cGUgfHwgX25vdGlmaWNhdGlvblZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVOdWRvcnVDb250cm9sczogaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzLFxuICAgIG1iQ3JlYXRvciAgICAgICAgICAgICAgIDogbWJDcmVhdG9yLFxuICAgIGFkZE1lc3NhZ2VCb3ggICAgICAgICAgIDogYWRkTWVzc2FnZUJveCxcbiAgICByZW1vdmVNZXNzYWdlQm94ICAgICAgICA6IHJlbW92ZU1lc3NhZ2VCb3gsXG4gICAgYWRkTm90aWZpY2F0aW9uICAgICAgICAgOiBhZGROb3RpZmljYXRpb24sXG4gICAgYWxlcnQgICAgICAgICAgICAgICAgICAgOiBhbGVydCxcbiAgICBub3RpZnkgICAgICAgICAgICAgICAgICA6IG5vdGlmeVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluTnVkb3J1Q29udHJvbHMoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gdmlldyB0aGF0IGFsbG93cyBmb3IgY29tcG9uZW50IHZpZXdzIHRvIGJlIGRpc3BsYXkgb24gc3RvcmUgc3RhdGUgY2hhbmdlc1xuICovXG5cbnZhciBNaXhpblN0b3JlU3RhdGVWaWV3cyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3RoaXMsXG4gICAgICBfd2F0Y2hlZFN0b3JlLFxuICAgICAgX2N1cnJlbnRWaWV3SUQsXG4gICAgICBfY3VycmVudFN0b3JlU3RhdGUsXG4gICAgICBfc3RhdGVWaWV3TW91bnRQb2ludCxcbiAgICAgIF9zdGF0ZVZpZXdJRE1hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLyoqXG4gICAqIFNldCB1cCBsaXN0ZW5lcnNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVTdGF0ZVZpZXdzKHN0b3JlKSB7XG4gICAgX3RoaXMgPSB0aGlzOyAvLyBtaXRpZ2F0aW9uLCBEdWUgdG8gZXZlbnRzLCBzY29wZSBtYXkgYmUgc2V0IHRvIHRoZSB3aW5kb3cgb2JqZWN0XG4gICAgX3dhdGNoZWRTdG9yZSA9IHN0b3JlO1xuXG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCd2aWV3Q2hhbmdlJyk7XG5cbiAgICBfd2F0Y2hlZFN0b3JlLnN1YnNjcmliZShmdW5jdGlvbiBvblN0YXRlQ2hhbmdlKCkge1xuICAgICAgaGFuZGxlU3RhdGVDaGFuZ2UoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IHJvdXRlIGZyb20gVVJMIGhhc2ggb24gY2hhbmdlXG4gICAqIEBwYXJhbSByb3V0ZU9ialxuICAgKi9cbiAgZnVuY3Rpb24gaGFuZGxlU3RhdGVDaGFuZ2UoKSB7XG4gICAgc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSgpIHtcbiAgICB2YXIgc3RhdGUgPSBfd2F0Y2hlZFN0b3JlLmdldFN0YXRlKCkuY3VycmVudFN0YXRlO1xuICAgIGlmIChzdGF0ZSkge1xuICAgICAgaWYgKHN0YXRlICE9PSBfY3VycmVudFN0b3JlU3RhdGUpIHtcbiAgICAgICAgX2N1cnJlbnRTdG9yZVN0YXRlID0gc3RhdGU7XG4gICAgICAgIHNob3dTdGF0ZVZpZXdDb21wb25lbnQuYmluZChfdGhpcykoX2N1cnJlbnRTdG9yZVN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBsb2NhdGlvbiBmb3IgdGhlIHZpZXcgdG8gbW91bnQgb24gcm91dGUgY2hhbmdlcywgYW55IGNvbnRlbnRzIHdpbGxcbiAgICogYmUgcmVtb3ZlZCBwcmlvclxuICAgKiBAcGFyYW0gZWxJRFxuICAgKi9cbiAgZnVuY3Rpb24gc2V0Vmlld01vdW50UG9pbnQoZWxJRCkge1xuICAgIF9zdGF0ZVZpZXdNb3VudFBvaW50ID0gZWxJRDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFZpZXdNb3VudFBvaW50KCkge1xuICAgIHJldHVybiBfc3RhdGVWaWV3TW91bnRQb2ludDtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXAgYSByb3V0ZSB0byBhIG1vZHVsZSB2aWV3IGNvbnRyb2xsZXJcbiAgICogQHBhcmFtIHRlbXBsYXRlSURcbiAgICogQHBhcmFtIGNvbXBvbmVudElEb3JPYmpcbiAgICovXG4gIGZ1bmN0aW9uIG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KHN0YXRlLCB0ZW1wbGF0ZUlELCBjb21wb25lbnRJRG9yT2JqKSB7XG4gICAgX3N0YXRlVmlld0lETWFwW3N0YXRlXSA9IHRlbXBsYXRlSUQ7XG4gICAgdGhpcy5tYXBWaWV3Q29tcG9uZW50KHRlbXBsYXRlSUQsIGNvbXBvbmVudElEb3JPYmosIF9zdGF0ZVZpZXdNb3VudFBvaW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IGEgdmlldyAoaW4gcmVzcG9uc2UgdG8gYSByb3V0ZSBjaGFuZ2UpXG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1N0YXRlVmlld0NvbXBvbmVudChzdGF0ZSkge1xuICAgIHZhciBjb21wb25lbnRJRCA9IF9zdGF0ZVZpZXdJRE1hcFtzdGF0ZV07XG4gICAgaWYgKCFjb21wb25lbnRJRCkge1xuICAgICAgY29uc29sZS53YXJuKFwiTm8gdmlldyBtYXBwZWQgZm9yIHJvdXRlOiBcIiArIHN0YXRlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZW1vdmVDdXJyZW50VmlldygpO1xuXG4gICAgX2N1cnJlbnRWaWV3SUQgPSBjb21wb25lbnRJRDtcbiAgICB0aGlzLnNob3dWaWV3Q29tcG9uZW50KF9jdXJyZW50Vmlld0lEKTtcblxuICAgIC8vIFRyYW5zaXRpb24gbmV3IHZpZXcgaW5cbiAgICBUd2VlbkxpdGUuc2V0KF9zdGF0ZVZpZXdNb3VudFBvaW50LCB7YWxwaGE6IDB9KTtcbiAgICBUd2VlbkxpdGUudG8oX3N0YXRlVmlld01vdW50UG9pbnQsIDAuMjUsIHthbHBoYTogMSwgZWFzZTogUXVhZC5lYXNlSW59KTtcblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZigndmlld0NoYW5nZScsIGNvbXBvbmVudElEKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGN1cnJlbnRseSBkaXNwbGF5ZWQgdmlld1xuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlQ3VycmVudFZpZXcoKSB7XG4gICAgaWYgKF9jdXJyZW50Vmlld0lEKSB7XG4gICAgICBfdGhpcy5nZXRDb21wb25lbnRWaWV3TWFwKClbX2N1cnJlbnRWaWV3SURdLmNvbnRyb2xsZXIudW5tb3VudCgpO1xuICAgIH1cbiAgICBfY3VycmVudFZpZXdJRCA9ICcnO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplU3RhdGVWaWV3cyAgICAgICAgOiBpbml0aWFsaXplU3RhdGVWaWV3cyxcbiAgICBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlOiBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlLFxuICAgIHNob3dTdGF0ZVZpZXdDb21wb25lbnQgICAgICA6IHNob3dTdGF0ZVZpZXdDb21wb25lbnQsXG4gICAgc2V0Vmlld01vdW50UG9pbnQgICAgICAgICAgIDogc2V0Vmlld01vdW50UG9pbnQsXG4gICAgZ2V0Vmlld01vdW50UG9pbnQgICAgICAgICAgIDogZ2V0Vmlld01vdW50UG9pbnQsXG4gICAgbWFwU3RhdGVUb1ZpZXdDb21wb25lbnQgICAgIDogbWFwU3RhdGVUb1ZpZXdDb21wb25lbnRcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpblN0b3JlU3RhdGVWaWV3cygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBCYXNlIG1vZHVsZSBmb3IgY29tcG9uZW50c1xuICogTXVzdCBiZSBleHRlbmRlZCB3aXRoIGN1c3RvbSBtb2R1bGVzXG4gKi9cblxudmFyIF90ZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3V0aWxzL1RlbXBsYXRpbmcuanMnKTtcblxudmFyIFZpZXdDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9pc0luaXRpYWxpemVkID0gZmFsc2UsXG4gICAgICBfY29uZmlnUHJvcHMsXG4gICAgICBfaWQsXG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSxcbiAgICAgIF9odG1sLFxuICAgICAgX0RPTUVsZW1lbnQsXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF9jaGlsZHJlbiAgICAgID0gW10sXG4gICAgICBfaXNNb3VudGVkICAgICA9IGZhbHNlLFxuICAgICAgX3JlbmRlcmVyICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9SZW5kZXJlcicpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXphdGlvblxuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVDb21wb25lbnQoY29uZmlnUHJvcHMpIHtcbiAgICBfY29uZmlnUHJvcHMgPSBjb25maWdQcm9wcztcbiAgICBfaWQgICAgICAgICAgPSBjb25maWdQcm9wcy5pZDtcbiAgICBfbW91bnRQb2ludCAgPSBjb25maWdQcm9wcy5tb3VudFBvaW50O1xuXG4gICAgdGhpcy5zZXRTdGF0ZSh0aGlzLmdldEluaXRpYWxTdGF0ZSgpKTtcbiAgICB0aGlzLnNldEV2ZW50cyh0aGlzLmRlZmluZUV2ZW50cygpKTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndXBkYXRlJyk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdtb3VudCcpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndW5tb3VudCcpO1xuXG4gICAgX2lzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVmaW5lRXZlbnRzKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQmluZCB1cGRhdGVzIHRvIHRoZSBtYXAgSUQgdG8gdGhpcyB2aWV3J3MgdXBkYXRlXG4gICAqIEBwYXJhbSBtYXBJRG9yT2JqIE9iamVjdCB0byBzdWJzY3JpYmUgdG8gb3IgSUQuIFNob3VsZCBpbXBsZW1lbnQgbm9yaS9zdG9yZS9NaXhpbk9ic2VydmFibGVTdG9yZVxuICAgKi9cbiAgZnVuY3Rpb24gYmluZE1hcChtYXBJRG9yT2JqKSB7XG4gICAgdmFyIG1hcDtcblxuICAgIGlmIChpcy5vYmplY3QobWFwSURvck9iaikpIHtcbiAgICAgIG1hcCA9IG1hcElEb3JPYmo7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1hcCA9IE5vcmkuc3RvcmUoKS5nZXRNYXAobWFwSURvck9iaikgfHwgTm9yaS5zdG9yZSgpLmdldE1hcENvbGxlY3Rpb24obWFwSURvck9iaik7XG4gICAgfVxuXG4gICAgaWYgKCFtYXApIHtcbiAgICAgIGNvbnNvbGUud2FybignVmlld0NvbXBvbmVudCBiaW5kTWFwLCBtYXAgb3IgbWFwY29sbGVjdGlvbiBub3QgZm91bmQ6ICcgKyBtYXBJRG9yT2JqKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWlzLmZ1bmN0aW9uKG1hcC5zdWJzY3JpYmUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1ZpZXdDb21wb25lbnQgYmluZE1hcCwgbWFwIG9yIG1hcGNvbGxlY3Rpb24gbXVzdCBiZSBvYnNlcnZhYmxlOiAnICsgbWFwSURvck9iaik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWFwLnN1YnNjcmliZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBjaGlsZFxuICAgKiBAcGFyYW0gY2hpbGRcbiAgICovXG4gIC8vZnVuY3Rpb24gYWRkQ2hpbGQoY2hpbGQpIHtcbiAgLy8gIF9jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGNoaWxkXG4gICAqIEBwYXJhbSBjaGlsZFxuICAgKi9cbiAgLy9mdW5jdGlvbiByZW1vdmVDaGlsZChjaGlsZCkge1xuICAvLyAgdmFyIGlkeCA9IF9jaGlsZHJlbi5pbmRleE9mKGNoaWxkKTtcbiAgLy8gIF9jaGlsZHJlbltpZHhdLnVubW91bnQoKTtcbiAgLy8gIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIEJlZm9yZSB0aGUgdmlldyB1cGRhdGVzIGFuZCBhIHJlcmVuZGVyIG9jY3Vyc1xuICAgKiBSZXR1cm5zIG5leHRTdGF0ZSBvZiBjb21wb25lbnRcbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVcGRhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgY3VycmVudFN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuICAgIHZhciBuZXh0U3RhdGUgICAgPSB0aGlzLmNvbXBvbmVudFdpbGxVcGRhdGUoKTtcblxuICAgIGlmICh0aGlzLnNob3VsZENvbXBvbmVudFVwZGF0ZShuZXh0U3RhdGUpKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKG5leHRTdGF0ZSk7XG4gICAgICAvL19jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIHVwZGF0ZUNoaWxkKGNoaWxkKSB7XG4gICAgICAvLyAgY2hpbGQudXBkYXRlKCk7XG4gICAgICAvL30pO1xuXG4gICAgICBpZiAoX2lzTW91bnRlZCkge1xuICAgICAgICBpZiAodGhpcy5zaG91bGRDb21wb25lbnRSZW5kZXIoY3VycmVudFN0YXRlKSkge1xuICAgICAgICAgIHRoaXMudW5tb3VudCgpO1xuICAgICAgICAgIHRoaXMuY29tcG9uZW50UmVuZGVyKCk7XG4gICAgICAgICAgdGhpcy5tb3VudCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3VwZGF0ZScsIHRoaXMuZ2V0SUQoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbXBhcmUgY3VycmVudCBzdGF0ZSBhbmQgbmV4dCBzdGF0ZSB0byBkZXRlcm1pbmUgaWYgdXBkYXRpbmcgc2hvdWxkIG9jY3VyXG4gICAqIEBwYXJhbSBuZXh0U3RhdGVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSB7XG4gICAgcmV0dXJuIGlzLmV4aXN0eShuZXh0U3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBpdCwgbmVlZCB0byBhZGQgaXQgdG8gYSBwYXJlbnQgY29udGFpbmVyLCBoYW5kbGVkIGluIGhpZ2hlciBsZXZlbCB2aWV3XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50UmVuZGVyKCkge1xuICAgIC8vX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gcmVuZGVyQ2hpbGQoY2hpbGQpIHtcbiAgICAvLyAgY2hpbGQuY29tcG9uZW50UmVuZGVyKCk7XG4gICAgLy99KTtcbiAgICBpZiAoIV90ZW1wbGF0ZU9iakNhY2hlKSB7XG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSA9IHRoaXMudGVtcGxhdGUoKTtcbiAgICB9XG5cbiAgICBfaHRtbCA9IHRoaXMucmVuZGVyKHRoaXMuZ2V0U3RhdGUoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIExvZGFzaCBjbGllbnQgc2lkZSB0ZW1wbGF0ZSBmdW5jdGlvbiBieSBnZXR0aW5nIHRoZSBIVE1MIHNvdXJjZSBmcm9tXG4gICAqIHRoZSBtYXRjaGluZyA8c2NyaXB0IHR5cGU9J3RleHQvdGVtcGxhdGUnPiB0YWcgaW4gdGhlIGRvY3VtZW50LiBPUiB5b3UgbWF5XG4gICAqIHNwZWNpZnkgdGhlIGN1c3RvbSBIVE1MIHRvIHVzZSBoZXJlLlxuICAgKlxuICAgKiBUaGUgbWV0aG9kIGlzIGNhbGxlZCBvbmx5IG9uIHRoZSBmaXJzdCByZW5kZXIgYW5kIGNhY2hlZCB0byBzcGVlZCB1cCByZW5kZXJzXG4gICAqXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAgICovXG4gIGZ1bmN0aW9uIHRlbXBsYXRlKCkge1xuICAgIC8vIGFzc3VtZXMgdGhlIHRlbXBsYXRlIElEIG1hdGNoZXMgdGhlIGNvbXBvbmVudCdzIElEIGFzIHBhc3NlZCBvbiBpbml0aWFsaXplXG4gICAgdmFyIGh0bWwgPSBfdGVtcGxhdGUuZ2V0U291cmNlKHRoaXMuZ2V0SUQoKSk7XG4gICAgcmV0dXJuIF8udGVtcGxhdGUoaHRtbCk7XG4gIH1cblxuICAvKipcbiAgICogTWF5IGJlIG92ZXJyaWRkZW4gaW4gYSBzdWJtb2R1bGUgZm9yIGN1c3RvbSByZW5kZXJpbmdcbiAgICogU2hvdWxkIHJldHVybiBIVE1MXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVuZGVyKHN0YXRlKSB7XG4gICAgcmV0dXJuIF90ZW1wbGF0ZU9iakNhY2hlKHN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmQgaXQgdG8gYSBwYXJlbnQgZWxlbWVudFxuICAgKiBAcGFyYW0gbW91bnRFbFxuICAgKi9cbiAgZnVuY3Rpb24gbW91bnQoKSB7XG4gICAgaWYgKCFfaHRtbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb25lbnQgJyArIF9pZCArICcgY2Fubm90IG1vdW50IHdpdGggbm8gSFRNTC4gQ2FsbCByZW5kZXIoKSBmaXJzdD8nKTtcbiAgICB9XG5cbiAgICBfaXNNb3VudGVkID0gdHJ1ZTtcblxuICAgIF9ET01FbGVtZW50ID0gKF9yZW5kZXJlci5yZW5kZXIoe1xuICAgICAgdGFyZ2V0OiBfbW91bnRQb2ludCxcbiAgICAgIGh0bWwgIDogX2h0bWxcbiAgICB9KSk7XG5cbiAgICBpZiAodGhpcy5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgLy8gUGFzcyB0cnVlIHRvIGF1dG9tYXRpY2FsbHkgcGFzcyBmb3JtIGVsZW1lbnQgaGFuZGxlcnMgdGhlIGVsZW1lbnRzIHZhbHVlIG9yIG90aGVyIHN0YXR1c1xuICAgICAgdGhpcy5kZWxlZ2F0ZUV2ZW50cyh0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb21wb25lbnREaWRNb3VudCkge1xuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpO1xuICAgIH1cblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZignbW91bnQnLCB0aGlzLmdldElEKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgYWZ0ZXIgaXQncyBiZWVuIGFkZGVkIHRvIGEgdmlld1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgd2hlbiB1bmxvYWRpbmdcbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuICAgIC8vIHN0dWJcbiAgfVxuXG4gIGZ1bmN0aW9uIHVubW91bnQoKSB7XG4gICAgdGhpcy5jb21wb25lbnRXaWxsVW5tb3VudCgpO1xuICAgIF9pc01vdW50ZWQgPSBmYWxzZTtcblxuICAgIGlmICh0aGlzLnVuZGVsZWdhdGVFdmVudHMpIHtcbiAgICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgIH1cblxuICAgIF9yZW5kZXJlci5yZW5kZXIoe1xuICAgICAgdGFyZ2V0OiBfbW91bnRQb2ludCxcbiAgICAgIGh0bWwgIDogJydcbiAgICB9KTtcblxuICAgIF9odG1sICAgICAgID0gJyc7XG4gICAgX0RPTUVsZW1lbnQgPSBudWxsO1xuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZigndW5tb3VudCcsIHRoaXMuZ2V0SUQoKSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFjY2Vzc29yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBpc0luaXRpYWxpemVkKCkge1xuICAgIHJldHVybiBfaXNJbml0aWFsaXplZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbmZpZ1Byb3BzKCkge1xuICAgIHJldHVybiBfY29uZmlnUHJvcHM7XG4gIH1cblxuICBmdW5jdGlvbiBpc01vdW50ZWQoKSB7XG4gICAgcmV0dXJuIF9pc01vdW50ZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG4gICAgdGhpcy5zZXRTdGF0ZSh7fSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJRCgpIHtcbiAgICByZXR1cm4gX2lkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RE9NRWxlbWVudCgpIHtcbiAgICByZXR1cm4gX0RPTUVsZW1lbnQ7XG4gIH1cblxuICAvL2Z1bmN0aW9uIGdldENoaWxkcmVuKCkge1xuICAvLyAgcmV0dXJuIF9jaGlsZHJlbi5zbGljZSgwKTtcbiAgLy99XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplQ29tcG9uZW50OiBpbml0aWFsaXplQ29tcG9uZW50LFxuICAgIGRlZmluZUV2ZW50cyAgICAgICA6IGRlZmluZUV2ZW50cyxcbiAgICBpc0luaXRpYWxpemVkICAgICAgOiBpc0luaXRpYWxpemVkLFxuICAgIGdldENvbmZpZ1Byb3BzICAgICA6IGdldENvbmZpZ1Byb3BzLFxuICAgIGdldEluaXRpYWxTdGF0ZSAgICA6IGdldEluaXRpYWxTdGF0ZSxcbiAgICBnZXRJRCAgICAgICAgICAgICAgOiBnZXRJRCxcbiAgICB0ZW1wbGF0ZSAgICAgICAgICAgOiB0ZW1wbGF0ZSxcbiAgICBnZXRET01FbGVtZW50ICAgICAgOiBnZXRET01FbGVtZW50LFxuICAgIGlzTW91bnRlZCAgICAgICAgICA6IGlzTW91bnRlZCxcblxuICAgIGJpbmRNYXA6IGJpbmRNYXAsXG5cbiAgICBjb21wb25lbnRXaWxsVXBkYXRlICA6IGNvbXBvbmVudFdpbGxVcGRhdGUsXG4gICAgc2hvdWxkQ29tcG9uZW50VXBkYXRlOiBzaG91bGRDb21wb25lbnRVcGRhdGUsXG4gICAgdXBkYXRlICAgICAgICAgICAgICAgOiB1cGRhdGUsXG5cbiAgICBjb21wb25lbnRSZW5kZXI6IGNvbXBvbmVudFJlbmRlcixcbiAgICByZW5kZXIgICAgICAgICA6IHJlbmRlcixcblxuICAgIG1vdW50ICAgICAgICAgICAgOiBtb3VudCxcbiAgICBjb21wb25lbnREaWRNb3VudDogY29tcG9uZW50RGlkTW91bnQsXG5cbiAgICBjb21wb25lbnRXaWxsVW5tb3VudDogY29tcG9uZW50V2lsbFVubW91bnQsXG4gICAgdW5tb3VudCAgICAgICAgICAgICA6IHVubW91bnQsXG5cbiAgICAvL2FkZENoaWxkICAgOiBhZGRDaGlsZCxcbiAgICAvL3JlbW92ZUNoaWxkOiByZW1vdmVDaGlsZCxcbiAgICAvL2dldENoaWxkcmVuOiBnZXRDaGlsZHJlblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXdDb21wb25lbnQ7IiwidmFyIGJyb3dzZXJJbmZvID0ge1xuXG4gIGFwcFZlcnNpb24gOiBuYXZpZ2F0b3IuYXBwVmVyc2lvbixcbiAgdXNlckFnZW50ICA6IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gIGlzSUUgICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1TSUUgXCIpLFxuICBpc0lFNiAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgNlwiKSxcbiAgaXNJRTcgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDdcIiksXG4gIGlzSUU4ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA4XCIpLFxuICBpc0lFOSAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgOVwiKSxcbiAgaXNGRiAgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiRmlyZWZveC9cIiksXG4gIGlzQ2hyb21lICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkNocm9tZS9cIiksXG4gIGlzTWFjICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY2ludG9zaCxcIiksXG4gIGlzTWFjU2FmYXJpOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIlNhZmFyaVwiKSAmJiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY1wiKSAmJiAtMSA9PT0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiQ2hyb21lXCIpLFxuXG4gIGhhc1RvdWNoICAgIDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBub3RTdXBwb3J0ZWQ6ICh0aGlzLmlzSUU2IHx8IHRoaXMuaXNJRTcgfHwgdGhpcy5pc0lFOCB8fCB0aGlzLmlzSUU5KSxcblxuICBtb2JpbGU6IHtcbiAgICBBbmRyb2lkICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQW5kcm9pZC9pKTtcbiAgICB9LFxuICAgIEJsYWNrQmVycnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CbGFja0JlcnJ5L2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JCMTA7IFRvdWNoLyk7XG4gICAgfSxcbiAgICBpT1MgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lfGlQYWR8aVBvZC9pKTtcbiAgICB9LFxuICAgIE9wZXJhICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9PcGVyYSBNaW5pL2kpO1xuICAgIH0sXG4gICAgV2luZG93cyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0lFTW9iaWxlL2kpO1xuICAgIH0sXG4gICAgYW55ICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICh0aGlzLkFuZHJvaWQoKSB8fCB0aGlzLkJsYWNrQmVycnkoKSB8fCB0aGlzLmlPUygpIHx8IHRoaXMuT3BlcmEoKSB8fCB0aGlzLldpbmRvd3MoKSkgIT09IG51bGw7XG4gICAgfVxuXG4gIH0sXG5cbiAgLy8gVE9ETyBmaWx0ZXIgZm9yIElFID4gOVxuICBlbmhhbmNlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhX2Jyb3dzZXJJbmZvLmlzSUUgJiYgIV9icm93c2VySW5mby5tb2JpbGUuYW55KCk7XG4gIH0sXG5cbiAgbW91c2VEb3duRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiO1xuICB9LFxuXG4gIG1vdXNlVXBFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIjtcbiAgfSxcblxuICBtb3VzZUNsaWNrRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaGVuZFwiIDogXCJjbGlja1wiO1xuICB9LFxuXG4gIG1vdXNlTW92ZUV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYnJvd3NlckluZm87IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjM5OTkvaG93LXRvLXRlbGwtaWYtYS1kb20tZWxlbWVudC1pcy12aXNpYmxlLWluLXRoZS1jdXJyZW50LXZpZXdwb3J0XG4gIC8vIGVsZW1lbnQgbXVzdCBiZSBlbnRpcmVseSBvbiBzY3JlZW5cbiAgaXNFbGVtZW50RW50aXJlbHlJblZpZXdwb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiAoXG4gICAgICByZWN0LnRvcCA+PSAwICYmXG4gICAgICByZWN0LmxlZnQgPj0gMCAmJlxuICAgICAgcmVjdC5ib3R0b20gPD0gKHdpbmRvdy5pbm5lckhlaWdodCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSAmJlxuICAgICAgcmVjdC5yaWdodCA8PSAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKVxuICAgICk7XG4gIH0sXG5cbiAgLy8gZWxlbWVudCBtYXkgYmUgcGFydGlhbHkgb24gc2NyZWVuXG4gIGlzRWxlbWVudEluVmlld3BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIHJlY3QuYm90dG9tID4gMCAmJlxuICAgICAgcmVjdC5yaWdodCA+IDAgJiZcbiAgICAgIHJlY3QubGVmdCA8ICh3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpICYmXG4gICAgICByZWN0LnRvcCA8ICh3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCk7XG4gIH0sXG5cbiAgaXNEb21PYmo6IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gISEob2JqLm5vZGVUeXBlIHx8IChvYmogPT09IHdpbmRvdykpO1xuICB9LFxuXG4gIHBvc2l0aW9uOiBmdW5jdGlvbiAoZWwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGVmdDogZWwub2Zmc2V0TGVmdCxcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcFxuICAgIH07XG4gIH0sXG5cbiAgLy8gZnJvbSBodHRwOi8vanNwZXJmLmNvbS9qcXVlcnktb2Zmc2V0LXZzLW9mZnNldHBhcmVudC1sb29wXG4gIG9mZnNldDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIG9sID0gMCxcbiAgICAgICAgb3QgPSAwO1xuICAgIGlmIChlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICAgIGRvIHtcbiAgICAgICAgb2wgKz0gZWwub2Zmc2V0TGVmdDtcbiAgICAgICAgb3QgKz0gZWwub2Zmc2V0VG9wO1xuICAgICAgfSB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IG9sLFxuICAgICAgdG9wIDogb3RcbiAgICB9O1xuICB9LFxuXG4gIHJlbW92ZUFsbEVsZW1lbnRzOiBmdW5jdGlvbiAoZWwpIHtcbiAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgfVxuICB9LFxuXG4gIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80OTQxNDMvY3JlYXRpbmctYS1uZXctZG9tLWVsZW1lbnQtZnJvbS1hbi1odG1sLXN0cmluZy11c2luZy1idWlsdC1pbi1kb20tbWV0aG9kcy1vci1wcm9cbiAgSFRNTFN0clRvTm9kZTogZnVuY3Rpb24gKHN0cikge1xuICAgIHZhciB0ZW1wICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHI7XG4gICAgcmV0dXJuIHRlbXAuZmlyc3RDaGlsZDtcbiAgfSxcblxuICB3cmFwRWxlbWVudDogZnVuY3Rpb24gKHdyYXBwZXJTdHIsIGVsKSB7XG4gICAgdmFyIHdyYXBwZXJFbCA9IHRoaXMuSFRNTFN0clRvTm9kZSh3cmFwcGVyU3RyKSxcbiAgICAgICAgZWxQYXJlbnQgID0gZWwucGFyZW50Tm9kZTtcblxuICAgIHdyYXBwZXJFbC5hcHBlbmRDaGlsZChlbCk7XG4gICAgZWxQYXJlbnQuYXBwZW5kQ2hpbGQod3JhcHBlckVsKTtcbiAgICByZXR1cm4gd3JhcHBlckVsO1xuICB9LFxuXG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTUzMjkxNjcvY2xvc2VzdC1hbmNlc3Rvci1tYXRjaGluZy1zZWxlY3Rvci11c2luZy1uYXRpdmUtZG9tXG4gIGNsb3Nlc3Q6IGZ1bmN0aW9uIChlbCwgc2VsZWN0b3IpIHtcbiAgICB2YXIgbWF0Y2hlc1NlbGVjdG9yID0gZWwubWF0Y2hlcyB8fCBlbC53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHwgZWwubW96TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLm1zTWF0Y2hlc1NlbGVjdG9yO1xuICAgIHdoaWxlIChlbCkge1xuICAgICAgaWYgKG1hdGNoZXNTZWxlY3Rvci5iaW5kKGVsKShzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnRFbGVtZW50O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLy8gZnJvbSB5b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tXG4gIGhhc0NsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIGFkZENsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9XG4gIH0sXG5cbiAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH1cbiAgfSxcblxuICB0b2dnbGVDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gRnJvbSBpbXByZXNzLmpzXG4gIGFwcGx5Q1NTOiBmdW5jdGlvbiAoZWwsIHByb3BzKSB7XG4gICAgdmFyIGtleSwgcGtleTtcbiAgICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgZWwuc3R5bGVba2V5XSA9IHByb3BzW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbDtcbiAgfSxcblxuICAvLyBmcm9tIGltcHJlc3MuanNcbiAgLy8gYGNvbXB1dGVXaW5kb3dTY2FsZWAgY291bnRzIHRoZSBzY2FsZSBmYWN0b3IgYmV0d2VlbiB3aW5kb3cgc2l6ZSBhbmQgc2l6ZVxuICAvLyBkZWZpbmVkIGZvciB0aGUgcHJlc2VudGF0aW9uIGluIHRoZSBjb25maWcuXG4gIGNvbXB1dGVXaW5kb3dTY2FsZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgIHZhciBoU2NhbGUgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLyBjb25maWcuaGVpZ2h0LFxuICAgICAgICB3U2NhbGUgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIGNvbmZpZy53aWR0aCxcbiAgICAgICAgc2NhbGUgID0gaFNjYWxlID4gd1NjYWxlID8gd1NjYWxlIDogaFNjYWxlO1xuXG4gICAgaWYgKGNvbmZpZy5tYXhTY2FsZSAmJiBzY2FsZSA+IGNvbmZpZy5tYXhTY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWF4U2NhbGU7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5taW5TY2FsZSAmJiBzY2FsZSA8IGNvbmZpZy5taW5TY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWluU2NhbGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYW4gYXJyYXkgb2YgZWxlbWVudHMgaW4gdGhlIGNvbnRhaW5lciByZXR1cm5lZCBhcyBBcnJheSBpbnN0ZWFkIG9mIGEgTm9kZSBsaXN0XG4gICAqL1xuICBnZXRRU0VsZW1lbnRzQXNBcnJheTogZnVuY3Rpb24gKGVsLCBjbHMpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbChjbHMpLCAwKTtcbiAgfSxcblxuICBjZW50ZXJFbGVtZW50SW5WaWV3UG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHZwSCA9IHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgdnBXID0gd2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgIGVsUiA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICBlbEggPSBlbFIuaGVpZ2h0LFxuICAgICAgICBlbFcgPSBlbFIud2lkdGg7XG5cbiAgICBlbC5zdHlsZS5sZWZ0ID0gKHZwVyAvIDIpIC0gKGVsVyAvIDIpICsgJ3B4JztcbiAgICBlbC5zdHlsZS50b3AgID0gKHZwSCAvIDIpIC0gKGVsSCAvIDIpICsgJ3B4JztcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvYmplY3QgZnJvbSB0aGUgbmFtZSAob3IgaWQpIGF0dHJpYnMgYW5kIGRhdGEgb2YgYSBmb3JtXG4gICAqIEBwYXJhbSBlbFxuICAgKiBAcmV0dXJucyB7bnVsbH1cbiAgICovXG4gIGNhcHR1cmVGb3JtRGF0YTogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIGRhdGFPYmogPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgICB0ZXh0YXJlYUVscywgaW5wdXRFbHMsIHNlbGVjdEVscztcblxuICAgIHRleHRhcmVhRWxzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgndGV4dGFyZWEnKSwgMCk7XG4gICAgaW5wdXRFbHMgICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCcpLCAwKTtcbiAgICBzZWxlY3RFbHMgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NlbGVjdCcpLCAwKTtcblxuICAgIHRleHRhcmVhRWxzLmZvckVhY2goZ2V0SW5wdXRGb3JtRGF0YSk7XG4gICAgaW5wdXRFbHMuZm9yRWFjaChnZXRJbnB1dEZvcm1EYXRhKTtcbiAgICBzZWxlY3RFbHMuZm9yRWFjaChnZXRTZWxlY3RGb3JtRGF0YSk7XG5cbiAgICByZXR1cm4gZGF0YU9iajtcblxuICAgIGZ1bmN0aW9uIGdldElucHV0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSBmb3JtRWwudmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICB2YXIgc2VsID0gZm9ybUVsLnNlbGVjdGVkSW5kZXgsIHZhbCA9ICcnO1xuICAgICAgaWYgKHNlbCA+PSAwKSB7XG4gICAgICAgIHZhbCA9IGZvcm1FbC5vcHRpb25zW3NlbF0udmFsdWU7XG4gICAgICB9XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RWxOYW1lT3JJRChmb3JtRWwpIHtcbiAgICAgIHZhciBuYW1lID0gJ25vX25hbWUnO1xuICAgICAgaWYgKGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgICAgICBuYW1lID0gZm9ybUVsLmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgfSBlbHNlIGlmIChmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpKSB7XG4gICAgICAgIG5hbWUgPSBmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuICB9XG5cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBzaGFyZWQgM2QgcGVyc3BlY3RpdmUgZm9yIGFsbCBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5M0RUb0NvbnRhaW5lcjogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHBlcnNwZWN0aXZlICAgICAgOiA4MDAsXG4gICAgICAgIHBlcnNwZWN0aXZlT3JpZ2luOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbHkgYmFzaWMgQ1NTIHByb3BzXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHkzRFRvRWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHRyYW5zZm9ybVN0eWxlICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgIHRyYW5zZm9ybU9yaWdpbiAgIDogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGx5IGJhc2ljIDNkIHByb3BzIGFuZCBzZXQgdW5pcXVlIHBlcnNwZWN0aXZlIGZvciBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5VW5pcXVlM0RUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB0cmFuc2Zvcm1TdHlsZSAgICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHkgIDogXCJoaWRkZW5cIixcbiAgICAgICAgdHJhbnNmb3JtUGVyc3BlY3RpdmU6IDYwMCxcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luICAgICA6ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbn07XG4iLCJ2YXIgTWVzc2FnZUJveENyZWF0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tZXNzYWdlQm94VmlldyA9IHJlcXVpcmUoJy4vTWVzc2FnZUJveFZpZXcnKTtcblxuICBmdW5jdGlvbiBhbGVydCh0aXRsZSwgbWVzc2FnZSwgbW9kYWwsIGNiKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHA+JyArIG1lc3NhZ2UgKyAnPC9wPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRBTkdFUixcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ0Nsb3NlJyxcbiAgICAgICAgICBpZCAgICAgOiAnQ2xvc2UnLFxuICAgICAgICAgIHR5cGUgICA6ICcnLFxuICAgICAgICAgIGljb24gICA6ICd0aW1lcycsXG4gICAgICAgICAgb25DbGljazogY2JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlybSh0aXRsZSwgbWVzc2FnZSwgb2tDQiwgbW9kYWwpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cD4nICsgbWVzc2FnZSArICc8L3A+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ1Byb2NlZWQnLFxuICAgICAgICAgIGlkICAgICA6ICdwcm9jZWVkJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9tcHQodGl0bGUsIG1lc3NhZ2UsIG9rQ0IsIG1vZGFsKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHAgY2xhc3M9XCJ0ZXh0LWNlbnRlciBwYWRkaW5nLWJvdHRvbS1kb3VibGVcIj4nICsgbWVzc2FnZSArICc8L3A+PHRleHRhcmVhIG5hbWU9XCJyZXNwb25zZVwiIGNsYXNzPVwiaW5wdXQtdGV4dFwiIHR5cGU9XCJ0ZXh0XCIgc3R5bGU9XCJ3aWR0aDo0MDBweDsgaGVpZ2h0Ojc1cHg7IHJlc2l6ZTogbm9uZVwiIGF1dG9mb2N1cz1cInRydWVcIj48L3RleHRhcmVhPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQ1MCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdQcm9jZWVkJyxcbiAgICAgICAgICBpZCAgICAgOiAncHJvY2VlZCcsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hvaWNlKHRpdGxlLCBtZXNzYWdlLCBzZWxlY3Rpb25zLCBva0NCLCBtb2RhbCkge1xuICAgIHZhciBzZWxlY3RIVE1MID0gJzxzZWxlY3QgY2xhc3M9XCJzcGFjZWRcIiBzdHlsZT1cIndpZHRoOjQ1MHB4O2hlaWdodDoyMDBweFwiIG5hbWU9XCJzZWxlY3Rpb25cIiBhdXRvZm9jdXM9XCJ0cnVlXCIgc2l6ZT1cIjIwXCI+JztcblxuICAgIHNlbGVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAob3B0KSB7XG4gICAgICBzZWxlY3RIVE1MICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIG9wdC52YWx1ZSArICdcIiAnICsgKG9wdC5zZWxlY3RlZCA9PT0gJ3RydWUnID8gJ3NlbGVjdGVkJyA6ICcnKSArICc+JyArIG9wdC5sYWJlbCArICc8L29wdGlvbj4nO1xuICAgIH0pO1xuXG4gICAgc2VsZWN0SFRNTCArPSAnPC9zZWxlY3Q+JztcblxuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwIGNsYXNzPVwidGV4dC1jZW50ZXIgcGFkZGluZy1ib3R0b20tZG91YmxlXCI+JyArIG1lc3NhZ2UgKyAnPC9wPjxkaXYgY2xhc3M9XCJ0ZXh0LWNlbnRlclwiPicgKyBzZWxlY3RIVE1MICsgJzwvZGl2PicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDUwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdPSycsXG4gICAgICAgICAgaWQgICAgIDogJ29rJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFsZXJ0ICA6IGFsZXJ0LFxuICAgIGNvbmZpcm06IGNvbmZpcm0sXG4gICAgcHJvbXB0IDogcHJvbXB0LFxuICAgIGNob2ljZSA6IGNob2ljZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VCb3hDcmVhdG9yKCk7IiwidmFyIE1lc3NhZ2VCb3hWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2hpZ2hlc3RaICAgICAgICAgICAgICAgPSAxMDAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCAgICAgICAgICAgPSA0MDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ21lc3NhZ2Vib3hfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ21lc3NhZ2Vib3hfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAnbWVzc2FnZWJveF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICdtZXNzYWdlYm94X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfYnV0dG9uSWNvblRlbXBsYXRlSUQgICA9ICd0ZW1wbGF0ZV9fbWVzc2FnZWJveC0tYnV0dG9uLWljb24nLFxuICAgICAgX2J1dHRvbk5vSWNvblRlbXBsYXRlSUQgPSAndGVtcGxhdGVfX21lc3NhZ2Vib3gtLWJ1dHRvbi1ub2ljb24nLFxuICAgICAgX3RlbXBsYXRlICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9tb2RhbCAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9Nb2RhbENvdmVyVmlldy5qcycpLFxuICAgICAgX2Jyb3dzZXJJbmZvICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpLFxuICAgICAgX2NvbXBvbmVudFV0aWxzICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzJyk7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIHNldCB0aGUgbW91bnQgcG9pbnQgLyBib3ggY29udGFpbmVyXG4gICAqIEBwYXJhbSBlbElEXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIG5ldyBtZXNzYWdlIGJveFxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgdmFyIHR5cGUgICA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVCxcbiAgICAgICAgYm94T2JqID0gY3JlYXRlQm94T2JqZWN0KGluaXRPYmopO1xuXG4gICAgLy8gc2V0dXBcbiAgICBfY2hpbGRyZW4ucHVzaChib3hPYmopO1xuICAgIF9tb3VudFBvaW50LmFwcGVuZENoaWxkKGJveE9iai5lbGVtZW50KTtcbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgYm94T2JqLmVsZW1lbnQpO1xuICAgIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKTtcblxuICAgIF9jb21wb25lbnRVdGlscy5hcHBseVVuaXF1ZTNEVG9FbGVtZW50KGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIFNldCAzZCBDU1MgcHJvcHMgZm9yIGluL291dCB0cmFuc2l0aW9uXG4gICAgVHdlZW5MaXRlLnNldChib3hPYmouZWxlbWVudCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHpJbmRleDogX2hpZ2hlc3RaLFxuICAgICAgICB3aWR0aCA6IGluaXRPYmoud2lkdGggPyBpbml0T2JqLndpZHRoIDogX2RlZmF1bHRXaWR0aFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gY2VudGVyIGFmdGVyIHdpZHRoIGhhcyBiZWVuIHNldFxuICAgIF9kb21VdGlscy5jZW50ZXJFbGVtZW50SW5WaWV3UG9ydChib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBNYWtlIGl0IGRyYWdnYWJsZVxuICAgIERyYWdnYWJsZS5jcmVhdGUoJyMnICsgYm94T2JqLmlkLCB7XG4gICAgICBib3VuZHMgOiB3aW5kb3csXG4gICAgICBvblByZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9oaWdoZXN0WiA9IERyYWdnYWJsZS56SW5kZXg7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBTaG93IGl0XG4gICAgdHJhbnNpdGlvbkluKGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIFNob3cgdGhlIG1vZGFsIGNvdmVyXG4gICAgaWYgKGluaXRPYmoubW9kYWwpIHtcbiAgICAgIF9tb2RhbC5zaG93Tm9uRGlzbWlzc2FibGUodHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJveE9iai5pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NpZ24gYSB0eXBlIGNsYXNzIHRvIGl0XG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBlbGVtZW50XG4gICAqL1xuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBvYmplY3QgZm9yIGEgYm94XG4gICAqIEBwYXJhbSBpbml0T2JqXG4gICAqIEByZXR1cm5zIHt7ZGF0YU9iajogKiwgaWQ6IHN0cmluZywgbW9kYWw6ICgqfGJvb2xlYW4pLCBlbGVtZW50OiAqLCBzdHJlYW1zOiBBcnJheX19XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVCb3hPYmplY3QoaW5pdE9iaikge1xuICAgIHZhciBpZCAgPSAnanNfX21lc3NhZ2Vib3gtJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgZGF0YU9iajogaW5pdE9iaixcbiAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICBtb2RhbCAgOiBpbml0T2JqLm1vZGFsLFxuICAgICAgICAgIGVsZW1lbnQ6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ3RlbXBsYXRlX19tZXNzYWdlYm94LS1kZWZhdWx0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiBpbml0T2JqLnRpdGxlLFxuICAgICAgICAgICAgY29udGVudDogaW5pdE9iai5jb250ZW50XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc3RyZWFtczogW11cbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHVwIHRoZSBidXR0b25zXG4gICAqIEBwYXJhbSBib3hPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKSB7XG4gICAgdmFyIGJ1dHRvbkRhdGEgPSBib3hPYmouZGF0YU9iai5idXR0b25zO1xuXG4gICAgLy8gZGVmYXVsdCBidXR0b24gaWYgbm9uZVxuICAgIGlmICghYnV0dG9uRGF0YSkge1xuICAgICAgYnV0dG9uRGF0YSA9IFt7XG4gICAgICAgIGxhYmVsOiAnQ2xvc2UnLFxuICAgICAgICB0eXBlIDogJycsXG4gICAgICAgIGljb24gOiAndGltZXMnLFxuICAgICAgICBpZCAgIDogJ2RlZmF1bHQtY2xvc2UnXG4gICAgICB9XTtcbiAgICB9XG5cbiAgICB2YXIgYnV0dG9uQ29udGFpbmVyID0gYm94T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmZvb3Rlci1idXR0b25zJyk7XG5cbiAgICBfZG9tVXRpbHMucmVtb3ZlQWxsRWxlbWVudHMoYnV0dG9uQ29udGFpbmVyKTtcblxuICAgIGJ1dHRvbkRhdGEuZm9yRWFjaChmdW5jdGlvbiBtYWtlQnV0dG9uKGJ1dHRvbk9iaikge1xuICAgICAgYnV0dG9uT2JqLmlkID0gYm94T2JqLmlkICsgJy1idXR0b24tJyArIGJ1dHRvbk9iai5pZDtcblxuICAgICAgdmFyIGJ1dHRvbkVsO1xuXG4gICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdpY29uJykpIHtcbiAgICAgICAgYnV0dG9uRWwgPSBfdGVtcGxhdGUuYXNFbGVtZW50KF9idXR0b25JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1dHRvbkVsID0gX3RlbXBsYXRlLmFzRWxlbWVudChfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH1cblxuICAgICAgYnV0dG9uQ29udGFpbmVyLmFwcGVuZENoaWxkKGJ1dHRvbkVsKTtcblxuICAgICAgdmFyIGJ0blN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKVxuICAgICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdvbkNsaWNrJykpIHtcbiAgICAgICAgICAgIGlmIChidXR0b25PYmoub25DbGljaykge1xuICAgICAgICAgICAgICBidXR0b25PYmoub25DbGljay5jYWxsKHRoaXMsIGNhcHR1cmVGb3JtRGF0YShib3hPYmouaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVtb3ZlKGJveE9iai5pZCk7XG4gICAgICAgIH0pO1xuICAgICAgYm94T2JqLnN0cmVhbXMucHVzaChidG5TdHJlYW0pO1xuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBkYXRhIGZyb20gdGhlIGZvcm0gb24gdGhlIGJveCBjb250ZW50c1xuICAgKiBAcGFyYW0gYm94SURcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjYXB0dXJlRm9ybURhdGEoYm94SUQpIHtcbiAgICByZXR1cm4gX2RvbVV0aWxzLmNhcHR1cmVGb3JtRGF0YShnZXRPYmpCeUlEKGJveElEKS5lbGVtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBib3ggZnJvbSB0aGUgc2NyZWVuIC8gY29udGFpbmVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIGJveE9iajtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG4gICAgICB0cmFuc2l0aW9uT3V0KGJveE9iai5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvdyB0aGUgYm94XG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLCB7YWxwaGE6IDAsIHJvdGF0aW9uWDogNDUsIHNjYWxlOiAyfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGFscGhhICAgIDogMSxcbiAgICAgIHJvdGF0aW9uWDogMCxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBib3hcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjI1LCB7XG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICByb3RhdGlvblg6IC00NSxcbiAgICAgIHNjYWxlICAgIDogMC4yNSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFuIHVwIGFmdGVyIHRoZSB0cmFuc2l0aW9uIG91dCBhbmltYXRpb25cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG5cbiAgICBib3hPYmouc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgIHN0cmVhbS5kaXNwb3NlKCk7XG4gICAgfSk7XG5cbiAgICBEcmFnZ2FibGUuZ2V0KCcjJyArIGJveE9iai5pZCkuZGlzYWJsZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuXG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcblxuICAgIGNoZWNrTW9kYWxTdGF0dXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgYW55IG9wZW4gYm94ZXMgaGF2ZSBtb2RhbCB0cnVlXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja01vZGFsU3RhdHVzKCkge1xuICAgIHZhciBpc01vZGFsID0gZmFsc2U7XG5cbiAgICBfY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoYm94T2JqKSB7XG4gICAgICBpZiAoYm94T2JqLm1vZGFsID09PSB0cnVlKSB7XG4gICAgICAgIGlzTW9kYWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFpc01vZGFsKSB7XG4gICAgICBfbW9kYWwuaGlkZSh0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXRpbGl0eSB0byBnZXQgdGhlIGJveCBvYmplY3QgaW5kZXggYnkgSURcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVdGlsaXR5IHRvIGdldCB0aGUgYm94IG9iamVjdCBieSBJRFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlQm94VmlldygpOyIsInZhciBNb2RhbENvdmVyVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX21vdW50UG9pbnQgID0gZG9jdW1lbnQsXG4gICAgICBfbW9kYWxDb3ZlckVsLFxuICAgICAgX21vZGFsQmFja2dyb3VuZEVsLFxuICAgICAgX21vZGFsQ2xvc2VCdXR0b25FbCxcbiAgICAgIF9tb2RhbENsaWNrU3RyZWFtLFxuICAgICAgX2lzVmlzaWJsZSxcbiAgICAgIF9ub3REaXNtaXNzaWJsZSxcbiAgICAgIF9icm93c2VySW5mbyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblxuICAgIF9pc1Zpc2libGUgPSB0cnVlO1xuXG4gICAgX21vZGFsQ292ZXJFbCAgICAgICA9IF9tb3VudFBvaW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbF9fY292ZXInKTtcbiAgICBfbW9kYWxCYWNrZ3JvdW5kRWwgID0gX21vdW50UG9pbnQucXVlcnlTZWxlY3RvcignLm1vZGFsX19iYWNrZ3JvdW5kJyk7XG4gICAgX21vZGFsQ2xvc2VCdXR0b25FbCA9IF9tb3VudFBvaW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbF9fY2xvc2UtYnV0dG9uJyk7XG5cbiAgICB2YXIgbW9kYWxCR0NsaWNrICAgICA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KF9tb2RhbEJhY2tncm91bmRFbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIG1vZGFsQnV0dG9uQ2xpY2sgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChfbW9kYWxDbG9zZUJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKTtcblxuICAgIF9tb2RhbENsaWNrU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5tZXJnZShtb2RhbEJHQ2xpY2ssIG1vZGFsQnV0dG9uQ2xpY2spXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25Nb2RhbENsaWNrKCk7XG4gICAgICB9KTtcblxuICAgIGhpZGUoZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SXNWaXNpYmxlKCkge1xuICAgIHJldHVybiBfaXNWaXNpYmxlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Nb2RhbENsaWNrKCkge1xuICAgIGlmIChfbm90RGlzbWlzc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaGlkZSh0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpIHtcbiAgICBfaXNWaXNpYmxlICAgPSB0cnVlO1xuICAgIHZhciBkdXJhdGlvbiA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ292ZXJFbCwgZHVyYXRpb24sIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbEJhY2tncm91bmRFbCwgZHVyYXRpb24sIHtcbiAgICAgIGFscGhhOiAxLFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdyhzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKF9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfbm90RGlzbWlzc2libGUgPSBmYWxzZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuXG4gICAgVHdlZW5MaXRlLnNldChfbW9kYWxDbG9zZUJ1dHRvbkVsLCB7c2NhbGU6IDIsIGFscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENsb3NlQnV0dG9uRWwsIDEsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQm91bmNlLmVhc2VPdXQsXG4gICAgICBkZWxheSAgICA6IDFcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBICdoYXJkJyBtb2RhbCB2aWV3IGNhbm5vdCBiZSBkaXNtaXNzZWQgd2l0aCBhIGNsaWNrLCBtdXN0IGJlIHZpYSBjb2RlXG4gICAqIEBwYXJhbSBzaG91bGRBbmltYXRlXG4gICAqL1xuICBmdW5jdGlvbiBzaG93Tm9uRGlzbWlzc2FibGUoc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NpYmxlID0gdHJ1ZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAwLCB7YXV0b0FscGhhOiAwfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoIV9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX2lzVmlzaWJsZSAgICAgID0gZmFsc2U7XG4gICAgX25vdERpc21pc3NpYmxlID0gZmFsc2U7XG4gICAgdmFyIGR1cmF0aW9uICAgID0gc2hvdWxkQW5pbWF0ZSA/IDAuMjUgOiAwO1xuICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8oX21vZGFsQ2xvc2VCdXR0b25FbCk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCBkdXJhdGlvbiAvIDIsIHtcbiAgICAgIGF1dG9BbHBoYTogMCxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldE9wYWNpdHkob3BhY2l0eSkge1xuICAgIGlmIChvcGFjaXR5IDwgMCB8fCBvcGFjaXR5ID4gMSkge1xuICAgICAgY29uc29sZS5sb2coJ251ZG9ydS9jb21wb25lbnQvTW9kYWxDb3ZlclZpZXc6IHNldE9wYWNpdHk6IG9wYWNpdHkgc2hvdWxkIGJlIGJldHdlZW4gMCBhbmQgMScpO1xuICAgICAgb3BhY2l0eSA9IDE7XG4gICAgfVxuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGFscGhhOiBvcGFjaXR5LFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q29sb3IociwgZywgYikge1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGJhY2tncm91bmRDb2xvcjogJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknLFxuICAgICAgZWFzZSAgICAgICAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHNob3cgICAgICAgICAgICAgIDogc2hvdyxcbiAgICBzaG93Tm9uRGlzbWlzc2FibGU6IHNob3dOb25EaXNtaXNzYWJsZSxcbiAgICBoaWRlICAgICAgICAgICAgICA6IGhpZGUsXG4gICAgdmlzaWJsZSAgICAgICAgICAgOiBnZXRJc1Zpc2libGUsXG4gICAgc2V0T3BhY2l0eSAgICAgICAgOiBzZXRPcGFjaXR5LFxuICAgIHNldENvbG9yICAgICAgICAgIDogc2V0Q29sb3JcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbENvdmVyVmlldygpOyIsInZhciBUb2FzdFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgICAgICAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2RlZmF1bHRFeHBpcmVEdXJhdGlvbiA9IDcwMDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCAgICAgICAgICA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICd0b2FzdF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAndG9hc3RfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9hc3RfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAndG9hc3RfX2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyksXG4gICAgICBfY29tcG9uZW50VXRpbHMgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvL29iai50aXRsZSwgb2JqLmNvbnRlbnQsIG9iai50eXBlXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvYXN0T2JqID0gY3JlYXRlVG9hc3RPYmplY3QoaW5pdE9iai50aXRsZSwgaW5pdE9iai5tZXNzYWdlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvYXN0T2JqKTtcblxuICAgIF9tb3VudFBvaW50Lmluc2VydEJlZm9yZSh0b2FzdE9iai5lbGVtZW50LCBfbW91bnRQb2ludC5maXJzdENoaWxkKTtcblxuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudChpbml0T2JqLnR5cGUsIHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0NvbnRhaW5lcihfbW91bnRQb2ludCk7XG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0VsZW1lbnQodG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICB2YXIgY2xvc2VCdG4gICAgICAgICA9IHRvYXN0T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLnRvYXN0X19pdGVtLWNvbnRyb2xzID4gYnV0dG9uJyksXG4gICAgICAgIGNsb3NlQnRuU3RlYW0gICAgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChjbG9zZUJ0biwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIGV4cGlyZVRpbWVTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKF9kZWZhdWx0RXhwaXJlRHVyYXRpb24pO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbSA9IFJ4Lk9ic2VydmFibGUubWVyZ2UoY2xvc2VCdG5TdGVhbSwgZXhwaXJlVGltZVN0cmVhbSkudGFrZSgxKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlbW92ZSh0b2FzdE9iai5pZCk7XG4gICAgICB9KTtcblxuICAgIHRyYW5zaXRpb25Jbih0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIHJldHVybiB0b2FzdE9iai5pZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvYXN0T2JqZWN0KHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgdmFyIGlkICA9ICdqc19fdG9hc3QtdG9hc3RpdGVtLScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGlkICAgICAgICAgICAgICAgICA6IGlkLFxuICAgICAgICAgIGVsZW1lbnQgICAgICAgICAgICA6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ3RlbXBsYXRlX19jb21wb25lbnQtLXRvYXN0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBkZWZhdWx0QnV0dG9uU3RyZWFtOiBudWxsXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIHRvYXN0O1xuXG4gICAgaWYgKGlkeCA+IC0xKSB7XG4gICAgICB0b2FzdCA9IF9jaGlsZHJlbltpZHhdO1xuICAgICAgcmVhcnJhbmdlKGlkeCk7XG4gICAgICB0cmFuc2l0aW9uT3V0KHRvYXN0LmVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMCwge2FscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAxLCB7YWxwaGE6IDEsIGVhc2U6IFF1YWQuZWFzZU91dH0pO1xuICAgIHJlYXJyYW5nZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4yNSwge1xuICAgICAgcm90YXRpb25YOiAtNDUsXG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZUluLCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKSB7XG4gICAgdmFyIGlkeCAgICAgICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgdG9hc3RPYmogICA9IF9jaGlsZHJlbltpZHhdO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbS5kaXNwb3NlKCk7XG5cbiAgICBfbW91bnRQb2ludC5yZW1vdmVDaGlsZChlbCk7XG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYXJyYW5nZShpZ25vcmUpIHtcbiAgICB2YXIgaSA9IF9jaGlsZHJlbi5sZW5ndGggLSAxLFxuICAgICAgICBjdXJyZW50LFxuICAgICAgICB5ID0gMDtcblxuICAgIGZvciAoOyBpID4gLTE7IGktLSkge1xuICAgICAgaWYgKGkgPT09IGlnbm9yZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnQgPSBfY2hpbGRyZW5baV07XG4gICAgICBUd2VlbkxpdGUudG8oY3VycmVudC5lbGVtZW50LCAwLjc1LCB7eTogeSwgZWFzZTogQm91bmNlLmVhc2VPdXR9KTtcbiAgICAgIHkgKz0gMTAgKyBjdXJyZW50LmVsZW1lbnQuY2xpZW50SGVpZ2h0O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG9hc3RWaWV3KCk7IiwidmFyIFRvb2xUaXBWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgID0gMCxcbiAgICAgIF9kZWZhdWx0V2lkdGggPSAyMDAsXG4gICAgICBfdHlwZXMgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInLFxuICAgICAgICBDT0FDSE1BUksgIDogJ2NvYWNobWFyaydcbiAgICAgIH0sXG4gICAgICBfdHlwZVN0eWxlTWFwID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ3Rvb2x0aXBfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ3Rvb2x0aXBfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9vbHRpcF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICd0b29sdGlwX19kYW5nZXInLFxuICAgICAgICAnY29hY2htYXJrJyAgOiAndG9vbHRpcF9fY29hY2htYXJrJ1xuICAgICAgfSxcbiAgICAgIF9wb3NpdGlvbnMgICAgPSB7XG4gICAgICAgIFQgOiAnVCcsXG4gICAgICAgIFRSOiAnVFInLFxuICAgICAgICBSIDogJ1InLFxuICAgICAgICBCUjogJ0JSJyxcbiAgICAgICAgQiA6ICdCJyxcbiAgICAgICAgQkw6ICdCTCcsXG4gICAgICAgIEwgOiAnTCcsXG4gICAgICAgIFRMOiAnVEwnXG4gICAgICB9LFxuICAgICAgX3Bvc2l0aW9uTWFwICA9IHtcbiAgICAgICAgJ1QnIDogJ3Rvb2x0aXBfX3RvcCcsXG4gICAgICAgICdUUic6ICd0b29sdGlwX190b3ByaWdodCcsXG4gICAgICAgICdSJyA6ICd0b29sdGlwX19yaWdodCcsXG4gICAgICAgICdCUic6ICd0b29sdGlwX19ib3R0b21yaWdodCcsXG4gICAgICAgICdCJyA6ICd0b29sdGlwX19ib3R0b20nLFxuICAgICAgICAnQkwnOiAndG9vbHRpcF9fYm90dG9tbGVmdCcsXG4gICAgICAgICdMJyA6ICd0b29sdGlwX19sZWZ0JyxcbiAgICAgICAgJ1RMJzogJ3Rvb2x0aXBfX3RvcGxlZnQnXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfdGVtcGxhdGUgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfZG9tVXRpbHMgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLy9vYmoudGl0bGUsIG9iai5jb250ZW50LCBvYmoudHlwZSwgb2JqLnRhcmdldCwgb2JqLnBvc2l0aW9uXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvb2x0aXBPYmogPSBjcmVhdGVUb29sVGlwT2JqZWN0KGluaXRPYmoudGl0bGUsXG4gICAgICBpbml0T2JqLmNvbnRlbnQsXG4gICAgICBpbml0T2JqLnBvc2l0aW9uLFxuICAgICAgaW5pdE9iai50YXJnZXRFbCxcbiAgICAgIGluaXRPYmouZ3V0dGVyLFxuICAgICAgaW5pdE9iai5hbHdheXNWaXNpYmxlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvb2x0aXBPYmopO1xuICAgIF9tb3VudFBvaW50LmFwcGVuZENoaWxkKHRvb2x0aXBPYmouZWxlbWVudCk7XG5cbiAgICB0b29sdGlwT2JqLmFycm93RWwgPSB0b29sdGlwT2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93Jyk7XG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KGluaXRPYmoudHlwZSwgaW5pdE9iai5wb3NpdGlvbiwgdG9vbHRpcE9iai5lbGVtZW50KTtcblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgYXV0b0FscGhhOiB0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUgPyAxIDogMCxcbiAgICAgICAgd2lkdGggICAgOiBpbml0T2JqLndpZHRoID8gaW5pdE9iai53aWR0aCA6IF9kZWZhdWx0V2lkdGhcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNhY2hlIHRoZXNlIHZhbHVlcywgM2QgdHJhbnNmb3JtcyB3aWxsIGFsdGVyIHNpemVcbiAgICB0b29sdGlwT2JqLndpZHRoICA9IHRvb2x0aXBPYmouZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aDtcbiAgICB0b29sdGlwT2JqLmhlaWdodCA9IHRvb2x0aXBPYmouZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG5cbiAgICBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopO1xuICAgIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKTtcblxuICAgIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwgfHwgdG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5SKSB7XG4gICAgICBjZW50ZXJBcnJvd1ZlcnRpY2FsbHkodG9vbHRpcE9iaik7XG4gICAgfVxuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCB8fCB0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkIpIHtcbiAgICAgIGNlbnRlckFycm93SG9yaXpvbnRhbGx5KHRvb2x0aXBPYmopO1xuICAgIH1cblxuICAgIHJldHVybiB0b29sdGlwT2JqLmVsZW1lbnQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgcG9zaXRpb24sIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfcG9zaXRpb25NYXBbcG9zaXRpb25dKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvb2xUaXBPYmplY3QodGl0bGUsIG1lc3NhZ2UsIHBvc2l0aW9uLCB0YXJnZXQsIGd1dHRlciwgYWx3YXlzVmlzaWJsZSkge1xuICAgIHZhciBpZCAgPSAnanNfX3Rvb2x0aXAtdG9vbHRpcGl0ZW0tJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgaWQgICAgICAgICAgIDogaWQsXG4gICAgICAgICAgcG9zaXRpb24gICAgIDogcG9zaXRpb24sXG4gICAgICAgICAgdGFyZ2V0RWwgICAgIDogdGFyZ2V0LFxuICAgICAgICAgIGFsd2F5c1Zpc2libGU6IGFsd2F5c1Zpc2libGUgfHwgZmFsc2UsXG4gICAgICAgICAgZ3V0dGVyICAgICAgIDogZ3V0dGVyIHx8IDE1LFxuICAgICAgICAgIGVsT3ZlclN0cmVhbSA6IG51bGwsXG4gICAgICAgICAgZWxPdXRTdHJlYW0gIDogbnVsbCxcbiAgICAgICAgICBoZWlnaHQgICAgICAgOiAwLFxuICAgICAgICAgIHdpZHRoICAgICAgICA6IDAsXG4gICAgICAgICAgZWxlbWVudCAgICAgIDogX3RlbXBsYXRlLmFzRWxlbWVudCgndGVtcGxhdGVfX2NvbXBvbmVudC0tdG9vbHRpcCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgYXJyb3dFbCAgICAgIDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkV2ZW50c1RvVGFyZ2V0RWwodG9vbHRpcE9iaikge1xuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0b29sdGlwT2JqLmVsT3ZlclN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW92ZXInKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHNob3dUb29sVGlwKHRvb2x0aXBPYmouaWQpO1xuICAgICAgfSk7XG5cbiAgICB0b29sdGlwT2JqLmVsT3V0U3RyZWFtID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQodG9vbHRpcE9iai50YXJnZXRFbCwgJ21vdXNlb3V0JylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBoaWRlVG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd1Rvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKTtcbiAgICB0cmFuc2l0aW9uSW4odG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGd1dHRlciAgID0gdG9vbHRpcE9iai5ndXR0ZXIsXG4gICAgICAgIHhQb3MgICAgID0gMCxcbiAgICAgICAgeVBvcyAgICAgPSAwLFxuICAgICAgICB0Z3RQcm9wcyA9IHRvb2x0aXBPYmoudGFyZ2V0RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0IC0gZ3V0dGVyO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0O1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5SKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQgKyBndXR0ZXI7XG4gICAgICB5UG9zID0gdGd0UHJvcHMudG9wICsgKCh0Z3RQcm9wcy5oZWlnaHQgLyAyKSAtICh0b29sdGlwT2JqLmhlaWdodCAvIDIpKTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQlIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0ICsgKCh0Z3RQcm9wcy53aWR0aCAvIDIpIC0gKHRvb2x0aXBPYmoud2lkdGggLyAyKSk7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tICsgZ3V0dGVyO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoIC0gZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfVxuXG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmVsZW1lbnQsIHtcbiAgICAgIHg6IHhQb3MsXG4gICAgICB5OiB5UG9zXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjZW50ZXJBcnJvd0hvcml6b250YWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt4OiAodG9vbHRpcE9iai53aWR0aCAvIDIpIC0gKGFycm93UHJvcHMud2lkdGggLyAyKX0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dWZXJ0aWNhbGx5KHRvb2x0aXBPYmopIHtcbiAgICB2YXIgYXJyb3dQcm9wcyA9IHRvb2x0aXBPYmouYXJyb3dFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouYXJyb3dFbCwge3k6ICh0b29sdGlwT2JqLmhlaWdodCAvIDIpIC0gKGFycm93UHJvcHMuaGVpZ2h0IC8gMikgLSAyfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlVG9vbFRpcChpZCkge1xuICAgIHZhciB0b29sdGlwT2JqID0gZ2V0T2JqQnlJRChpZCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJhbnNpdGlvbk91dCh0b29sdGlwT2JqLmVsZW1lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjA1LCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGVsKSB7XG4gICAgZ2V0T2JqQnlFbGVtZW50KGVsKS5mb3JFYWNoKGZ1bmN0aW9uICh0b29sdGlwKSB7XG4gICAgICBpZiAodG9vbHRpcC5lbE92ZXJTdHJlYW0pIHtcbiAgICAgICAgdG9vbHRpcC5lbE92ZXJTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuICAgICAgaWYgKHRvb2x0aXAuZWxPdXRTdHJlYW0pIHtcbiAgICAgICAgdG9vbHRpcC5lbE91dFN0cmVhbS5kaXNwb3NlKCk7XG4gICAgICB9XG5cbiAgICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8odG9vbHRpcC5lbGVtZW50KTtcblxuICAgICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQodG9vbHRpcC5lbGVtZW50KTtcblxuICAgICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRCh0b29sdGlwLmlkKTtcblxuICAgICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgICAgX2NoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqQnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkID09PSBpZDtcbiAgICB9KVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqQnlFbGVtZW50KGVsKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQudGFyZ2V0RWwgPT09IGVsO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBvc2l0aW9ucygpIHtcbiAgICByZXR1cm4gX3Bvc2l0aW9ucztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzLFxuICAgIHBvc2l0aW9uICA6IGdldFBvc2l0aW9uc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xUaXBWaWV3KCk7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgaXNJbnRlZ2VyOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuICgvXi0/XFxkKyQvLnRlc3Qoc3RyKSk7XG4gIH0sXG5cbiAgcm5kTnVtYmVyOiBmdW5jdGlvbiAobWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgfSxcblxuICBjbGFtcDogZnVuY3Rpb24gKHZhbCwgbWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHZhbCkpO1xuICB9LFxuXG4gIGluUmFuZ2U6IGZ1bmN0aW9uICh2YWwsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIHZhbCA+IG1pbiAmJiB2YWwgPCBtYXg7XG4gIH0sXG5cbiAgZGlzdGFuY2VUTDogZnVuY3Rpb24gKHBvaW50MSwgcG9pbnQyKSB7XG4gICAgdmFyIHhkID0gKHBvaW50Mi5sZWZ0IC0gcG9pbnQxLmxlZnQpLFxuICAgICAgICB5ZCA9IChwb2ludDIudG9wIC0gcG9pbnQxLnRvcCk7XG4gICAgcmV0dXJuIE1hdGguc3FydCgoeGQgKiB4ZCkgKyAoeWQgKiB5ZCkpO1xuICB9XG5cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIFRlc3QgZm9yXG4gICAqIE9iamVjdCB7XCJcIjogdW5kZWZpbmVkfVxuICAgKiBPYmplY3Qge3VuZGVmaW5lZDogdW5kZWZpbmVkfVxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgaXNOdWxsOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIGlzbnVsbCA9IGZhbHNlO1xuXG4gICAgaWYgKGlzLmZhbHNleShvYmopKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgaWYgKHByb3AgPT09IHVuZGVmaW5lZCB8fCBvYmpbcHJvcF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpc251bGwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzbnVsbDtcbiAgfSxcblxuICBkeW5hbWljU29ydDogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYVtwcm9wZXJ0eV0gPCBiW3Byb3BlcnR5XSA/IC0xIDogYVtwcm9wZXJ0eV0gPiBiW3Byb3BlcnR5XSA/IDEgOiAwO1xuICAgIH07XG4gIH0sXG5cbiAgc2VhcmNoT2JqZWN0czogZnVuY3Rpb24gKG9iaiwga2V5LCB2YWwpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9ialtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgb2JqZWN0cyA9IG9iamVjdHMuY29uY2F0KHNlYXJjaE9iamVjdHMob2JqW2ldLCBrZXksIHZhbCkpO1xuICAgICAgfSBlbHNlIGlmIChpID09PSBrZXkgJiYgb2JqW2tleV0gPT09IHZhbCkge1xuICAgICAgICBvYmplY3RzLnB1c2gob2JqKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHM7XG4gIH0sXG5cbiAgZ2V0T2JqZWN0RnJvbVN0cmluZzogZnVuY3Rpb24gKG9iaiwgc3RyKSB7XG4gICAgdmFyIGkgICAgPSAwLFxuICAgICAgICBwYXRoID0gc3RyLnNwbGl0KCcuJyksXG4gICAgICAgIGxlbiAgPSBwYXRoLmxlbmd0aDtcblxuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG9iaiA9IG9ialtwYXRoW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICBnZXRPYmplY3RJbmRleEZyb21JZDogZnVuY3Rpb24gKG9iaiwgaWQpIHtcbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmpbaV0gIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIG9ialtpXS5pZCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBvYmpbaV0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vIGV4dGVuZCBhbmQgZGVlcCBleHRlbmQgZnJvbSBodHRwOi8veW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbS9cbiAgZXh0ZW5kOiBmdW5jdGlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHNbaV0uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIG91dFtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xuICB9LFxuXG4gIGRlZXBFeHRlbmQ6IGZ1bmN0aW9uIChvdXQpIHtcbiAgICBvdXQgPSBvdXQgfHwge307XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGFyZ3VtZW50c1tpXTtcblxuICAgICAgaWYgKCFvYmopIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBvYmpba2V5XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGRlZXBFeHRlbmQob3V0W2tleV0sIG9ialtrZXldKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uIG9mIFN0YW1wcyAtIGh0dHA6Ly9lcmljbGVhZHMuY29tLzIwMTQvMDIvcHJvdG90eXBhbC1pbmhlcml0YW5jZS13aXRoLXN0YW1wcy9cbiAgICogaHR0cHM6Ly93d3cuYmFya3dlYi5jby51ay9ibG9nL29iamVjdC1jb21wb3NpdGlvbi1hbmQtcHJvdG90eXBpY2FsLWluaGVyaXRhbmNlLWluLWphdmFzY3JpcHRcbiAgICpcbiAgICogUHJvdG90eXBlIG9iamVjdCByZXF1aXJlcyBhIG1ldGhvZHMgb2JqZWN0LCBwcml2YXRlIGNsb3N1cmVzIGFuZCBzdGF0ZSBpcyBvcHRpb25hbFxuICAgKlxuICAgKiBAcGFyYW0gcHJvdG90eXBlXG4gICAqIEByZXR1cm5zIE5ldyBvYmplY3QgdXNpbmcgcHJvdG90eXBlLm1ldGhvZHMgYXMgc291cmNlXG4gICAqL1xuICBiYXNpY0ZhY3Rvcnk6IGZ1bmN0aW9uIChwcm90b3R5cGUpIHtcbiAgICB2YXIgcHJvdG8gPSBwcm90b3R5cGUsXG4gICAgICAgIG9iaiAgID0gT2JqZWN0LmNyZWF0ZShwcm90by5tZXRob2RzKTtcblxuICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnY2xvc3VyZScpKSB7XG4gICAgICBwcm90by5jbG9zdXJlcy5mb3JFYWNoKGZ1bmN0aW9uIChjbG9zdXJlKSB7XG4gICAgICAgIGNsb3N1cmUuY2FsbChvYmopO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdzdGF0ZScpKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJvdG8uc3RhdGUpIHtcbiAgICAgICAgb2JqW2tleV0gPSBwcm90by5zdGF0ZVtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAgICpcbiAgICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAgICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICAgKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAgICpcbiAgICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gICAqXG4gICAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAgICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICAgKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAgICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICAgKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAgICpcbiAgICovXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGFuIGVudW1lcmF0aW9uIHdpdGgga2V5cyBlcXVhbCB0byB0aGVpciB2YWx1ZS5cbiAgICpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL1NUUk1ML2tleW1pcnJvclxuICAgKlxuICAgKiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogICB2YXIgQ09MT1JTID0ga2V5TWlycm9yKHtibHVlOiBudWxsLCByZWQ6IG51bGx9KTtcbiAgICogICB2YXIgbXlDb2xvciA9IENPTE9SUy5ibHVlO1xuICAgKiAgIHZhciBpc0NvbG9yVmFsaWQgPSAhIUNPTE9SU1tteUNvbG9yXTtcbiAgICpcbiAgICogVGhlIGxhc3QgbGluZSBjb3VsZCBub3QgYmUgcGVyZm9ybWVkIGlmIHRoZSB2YWx1ZXMgb2YgdGhlIGdlbmVyYXRlZCBlbnVtIHdlcmVcbiAgICogbm90IGVxdWFsIHRvIHRoZWlyIGtleXMuXG4gICAqXG4gICAqICAgSW5wdXQ6ICB7a2V5MTogdmFsMSwga2V5MjogdmFsMn1cbiAgICogICBPdXRwdXQ6IHtrZXkxOiBrZXkxLCBrZXkyOiBrZXkyfVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICovXG4gIGtleU1pcnJvcjogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciByZXQgPSB7fTtcbiAgICB2YXIga2V5O1xuICAgIGlmICghKG9iaiBpbnN0YW5jZW9mIE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShvYmopKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdrZXlNaXJyb3IoLi4uKTogQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QuJyk7XG4gICAgfVxuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHJldFtrZXldID0ga2V5O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbn07IiwiLyoqXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiAgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiAgVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiAgTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiAgb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cbiFmdW5jdGlvbih0LGUpe1wib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlP21vZHVsZS5leHBvcnRzPWUoKTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKGUpOnQuSW1tdXRhYmxlPWUoKX0odGhpcyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCxlKXtlJiYodC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShlLnByb3RvdHlwZSkpLHQucHJvdG90eXBlLmNvbnN0cnVjdG9yPXR9ZnVuY3Rpb24gZSh0KXtyZXR1cm4gdC52YWx1ZT0hMSx0fWZ1bmN0aW9uIHIodCl7dCYmKHQudmFsdWU9ITApfWZ1bmN0aW9uIG4oKXt9ZnVuY3Rpb24gaSh0LGUpe2U9ZXx8MDtmb3IodmFyIHI9TWF0aC5tYXgoMCx0Lmxlbmd0aC1lKSxuPUFycmF5KHIpLGk9MDtyPmk7aSsrKW5baV09dFtpK2VdO3JldHVybiBufWZ1bmN0aW9uIG8odCl7cmV0dXJuIHZvaWQgMD09PXQuc2l6ZSYmKHQuc2l6ZT10Ll9faXRlcmF0ZShzKSksdC5zaXplfWZ1bmN0aW9uIHUodCxlKXtpZihcIm51bWJlclwiIT10eXBlb2YgZSl7dmFyIHI9ZT4+PjA7aWYoXCJcIityIT09ZXx8NDI5NDk2NzI5NT09PXIpcmV0dXJuIE5hTjtlPXJ9cmV0dXJuIDA+ZT9vKHQpK2U6ZX1mdW5jdGlvbiBzKCl7cmV0dXJuITB9ZnVuY3Rpb24gYSh0LGUscil7cmV0dXJuKDA9PT10fHx2b2lkIDAhPT1yJiYtcj49dCkmJih2b2lkIDA9PT1lfHx2b2lkIDAhPT1yJiZlPj1yKX1mdW5jdGlvbiBoKHQsZSl7cmV0dXJuIGModCxlLDApfWZ1bmN0aW9uIGYodCxlKXtyZXR1cm4gYyh0LGUsZSl9ZnVuY3Rpb24gYyh0LGUscil7cmV0dXJuIHZvaWQgMD09PXQ/cjowPnQ/TWF0aC5tYXgoMCxlK3QpOnZvaWQgMD09PWU/dDpNYXRoLm1pbihlLHQpfWZ1bmN0aW9uIF8odCl7cmV0dXJuIHkodCk/dDpPKHQpfWZ1bmN0aW9uIHAodCl7cmV0dXJuIGQodCk/dDp4KHQpfWZ1bmN0aW9uIHYodCl7cmV0dXJuIG0odCk/dDprKHQpfWZ1bmN0aW9uIGwodCl7cmV0dXJuIHkodCkmJiFnKHQpP3Q6QSh0KX1mdW5jdGlvbiB5KHQpe3JldHVybiEoIXR8fCF0W3ZyXSl9ZnVuY3Rpb24gZCh0KXtyZXR1cm4hKCF0fHwhdFtscl0pfWZ1bmN0aW9uIG0odCl7cmV0dXJuISghdHx8IXRbeXJdKX1mdW5jdGlvbiBnKHQpe3JldHVybiBkKHQpfHxtKHQpfWZ1bmN0aW9uIHcodCl7cmV0dXJuISghdHx8IXRbZHJdKX1mdW5jdGlvbiBTKHQpe3RoaXMubmV4dD10fWZ1bmN0aW9uIHoodCxlLHIsbil7dmFyIGk9MD09PXQ/ZToxPT09dD9yOltlLHJdO3JldHVybiBuP24udmFsdWU9aTpuPXt2YWx1ZTppLGRvbmU6ITF9LG59ZnVuY3Rpb24gSSgpe3JldHVybnt2YWx1ZTp2b2lkIDAsZG9uZTohMH19ZnVuY3Rpb24gYih0KXtyZXR1cm4hIU0odCl9ZnVuY3Rpb24gcSh0KXtyZXR1cm4gdCYmXCJmdW5jdGlvblwiPT10eXBlb2YgdC5uZXh0fWZ1bmN0aW9uIEQodCl7dmFyIGU9TSh0KTtyZXR1cm4gZSYmZS5jYWxsKHQpfWZ1bmN0aW9uIE0odCl7dmFyIGU9dCYmKFNyJiZ0W1NyXXx8dFt6cl0pO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIGU/ZTp2b2lkIDB9ZnVuY3Rpb24gRSh0KXtyZXR1cm4gdCYmXCJudW1iZXJcIj09dHlwZW9mIHQubGVuZ3RofWZ1bmN0aW9uIE8odCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP3QudG9TZXEoKTpDKHQpfWZ1bmN0aW9uIHgodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKS50b0tleWVkU2VxKCk6eSh0KT9kKHQpP3QudG9TZXEoKTp0LmZyb21FbnRyeVNlcSgpOlcodCl9ZnVuY3Rpb24gayh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/VCgpOnkodCk/ZCh0KT90LmVudHJ5U2VxKCk6dC50b0luZGV4ZWRTZXEoKTpCKHQpfWZ1bmN0aW9uIEEodCl7cmV0dXJuKG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP2QodCk/dC5lbnRyeVNlcSgpOnQ6Qih0KSkudG9TZXRTZXEoKX1mdW5jdGlvbiBqKHQpe3RoaXMuX2FycmF5PXQsdGhpcy5zaXplPXQubGVuZ3RofWZ1bmN0aW9uIFIodCl7dmFyIGU9T2JqZWN0LmtleXModCk7dGhpcy5fb2JqZWN0PXQsdGhpcy5fa2V5cz1lLFxuICB0aGlzLnNpemU9ZS5sZW5ndGh9ZnVuY3Rpb24gVSh0KXt0aGlzLl9pdGVyYWJsZT10LHRoaXMuc2l6ZT10Lmxlbmd0aHx8dC5zaXplfWZ1bmN0aW9uIEsodCl7dGhpcy5faXRlcmF0b3I9dCx0aGlzLl9pdGVyYXRvckNhY2hlPVtdfWZ1bmN0aW9uIEwodCl7cmV0dXJuISghdHx8IXRbYnJdKX1mdW5jdGlvbiBUKCl7cmV0dXJuIHFyfHwocXI9bmV3IGooW10pKX1mdW5jdGlvbiBXKHQpe3ZhciBlPUFycmF5LmlzQXJyYXkodCk/bmV3IGoodCkuZnJvbUVudHJ5U2VxKCk6cSh0KT9uZXcgSyh0KS5mcm9tRW50cnlTZXEoKTpiKHQpP25ldyBVKHQpLmZyb21FbnRyeVNlcSgpOlwib2JqZWN0XCI9PXR5cGVvZiB0P25ldyBSKHQpOnZvaWQgMDtpZighZSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgQXJyYXkgb3IgaXRlcmFibGUgb2JqZWN0IG9mIFtrLCB2XSBlbnRyaWVzLCBvciBrZXllZCBvYmplY3Q6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEIodCl7dmFyIGU9Sih0KTtpZighZSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgQXJyYXkgb3IgaXRlcmFibGUgb2JqZWN0IG9mIHZhbHVlczogXCIrdCk7cmV0dXJuIGV9ZnVuY3Rpb24gQyh0KXt2YXIgZT1KKHQpfHxcIm9iamVjdFwiPT10eXBlb2YgdCYmbmV3IFIodCk7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiB2YWx1ZXMsIG9yIGtleWVkIG9iamVjdDogXCIrdCk7cmV0dXJuIGV9ZnVuY3Rpb24gSih0KXtyZXR1cm4gRSh0KT9uZXcgaih0KTpxKHQpP25ldyBLKHQpOmIodCk/bmV3IFUodCk6dm9pZCAwfWZ1bmN0aW9uIE4odCxlLHIsbil7dmFyIGk9dC5fY2FjaGU7aWYoaSl7Zm9yKHZhciBvPWkubGVuZ3RoLTEsdT0wO28+PXU7dSsrKXt2YXIgcz1pW3I/by11OnVdO2lmKGUoc1sxXSxuP3NbMF06dSx0KT09PSExKXJldHVybiB1KzF9cmV0dXJuIHV9cmV0dXJuIHQuX19pdGVyYXRlVW5jYWNoZWQoZSxyKX1mdW5jdGlvbiBQKHQsZSxyLG4pe3ZhciBpPXQuX2NhY2hlO2lmKGkpe3ZhciBvPWkubGVuZ3RoLTEsdT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0PWlbcj9vLXU6dV07cmV0dXJuIHUrKz5vP0koKTp6KGUsbj90WzBdOnUtMSx0WzFdKX0pfXJldHVybiB0Ll9faXRlcmF0b3JVbmNhY2hlZChlLHIpfWZ1bmN0aW9uIEgoKXt0aHJvdyBUeXBlRXJyb3IoXCJBYnN0cmFjdFwiKX1mdW5jdGlvbiBWKCl7fWZ1bmN0aW9uIFkoKXt9ZnVuY3Rpb24gUSgpe31mdW5jdGlvbiBYKHQsZSl7aWYodD09PWV8fHQhPT10JiZlIT09ZSlyZXR1cm4hMDtpZighdHx8IWUpcmV0dXJuITE7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC52YWx1ZU9mJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBlLnZhbHVlT2Ype2lmKHQ9dC52YWx1ZU9mKCksZT1lLnZhbHVlT2YoKSx0PT09ZXx8dCE9PXQmJmUhPT1lKXJldHVybiEwO2lmKCF0fHwhZSlyZXR1cm4hMX1yZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmVxdWFscyYmXCJmdW5jdGlvblwiPT10eXBlb2YgZS5lcXVhbHMmJnQuZXF1YWxzKGUpPyEwOiExfWZ1bmN0aW9uIEYodCxlKXtyZXR1cm4gZT9HKGUsdCxcIlwiLHtcIlwiOnR9KTpaKHQpfWZ1bmN0aW9uIEcodCxlLHIsbil7cmV0dXJuIEFycmF5LmlzQXJyYXkoZSk/dC5jYWxsKG4scixrKGUpLm1hcChmdW5jdGlvbihyLG4pe3JldHVybiBHKHQscixuLGUpfSkpOiQoZSk/dC5jYWxsKG4scix4KGUpLm1hcChmdW5jdGlvbihyLG4pe3JldHVybiBHKHQscixuLGUpfSkpOmV9ZnVuY3Rpb24gWih0KXtyZXR1cm4gQXJyYXkuaXNBcnJheSh0KT9rKHQpLm1hcChaKS50b0xpc3QoKTokKHQpP3godCkubWFwKFopLnRvTWFwKCk6dH1mdW5jdGlvbiAkKHQpe3JldHVybiB0JiYodC5jb25zdHJ1Y3Rvcj09PU9iamVjdHx8dm9pZCAwPT09dC5jb25zdHJ1Y3Rvcil9ZnVuY3Rpb24gdHQodCl7cmV0dXJuIHQ+Pj4xJjEwNzM3NDE4MjR8MzIyMTIyNTQ3MSZ0fWZ1bmN0aW9uIGV0KHQpe2lmKHQ9PT0hMXx8bnVsbD09PXR8fHZvaWQgMD09PXQpcmV0dXJuIDA7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC52YWx1ZU9mJiYodD10LnZhbHVlT2YoKSxcbiAgdD09PSExfHxudWxsPT09dHx8dm9pZCAwPT09dCkpcmV0dXJuIDA7aWYodD09PSEwKXJldHVybiAxO3ZhciBlPXR5cGVvZiB0O2lmKFwibnVtYmVyXCI9PT1lKXt2YXIgcj0wfHQ7Zm9yKHIhPT10JiYocl49NDI5NDk2NzI5NSp0KTt0PjQyOTQ5NjcyOTU7KXQvPTQyOTQ5NjcyOTUscl49dDtyZXR1cm4gdHQocil9aWYoXCJzdHJpbmdcIj09PWUpcmV0dXJuIHQubGVuZ3RoPmpyP3J0KHQpOm50KHQpO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQuaGFzaENvZGUpcmV0dXJuIHQuaGFzaENvZGUoKTtpZihcIm9iamVjdFwiPT09ZSlyZXR1cm4gaXQodCk7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC50b1N0cmluZylyZXR1cm4gbnQoXCJcIit0KTt0aHJvdyBFcnJvcihcIlZhbHVlIHR5cGUgXCIrZStcIiBjYW5ub3QgYmUgaGFzaGVkLlwiKX1mdW5jdGlvbiBydCh0KXt2YXIgZT1Lclt0XTtyZXR1cm4gdm9pZCAwPT09ZSYmKGU9bnQodCksVXI9PT1SciYmKFVyPTAsS3I9e30pLFVyKyssS3JbdF09ZSksZX1mdW5jdGlvbiBudCh0KXtmb3IodmFyIGU9MCxyPTA7dC5sZW5ndGg+cjtyKyspZT0zMSplK3QuY2hhckNvZGVBdChyKXwwO3JldHVybiB0dChlKX1mdW5jdGlvbiBpdCh0KXt2YXIgZTtpZih4ciYmKGU9RHIuZ2V0KHQpLHZvaWQgMCE9PWUpKXJldHVybiBlO2lmKGU9dFtBcl0sdm9pZCAwIT09ZSlyZXR1cm4gZTtpZighT3Ipe2lmKGU9dC5wcm9wZXJ0eUlzRW51bWVyYWJsZSYmdC5wcm9wZXJ0eUlzRW51bWVyYWJsZVtBcl0sdm9pZCAwIT09ZSlyZXR1cm4gZTtpZihlPW90KHQpLHZvaWQgMCE9PWUpcmV0dXJuIGV9aWYoZT0rK2tyLDEwNzM3NDE4MjQma3ImJihrcj0wKSx4cilEci5zZXQodCxlKTtlbHNle2lmKHZvaWQgMCE9PUVyJiZFcih0KT09PSExKXRocm93IEVycm9yKFwiTm9uLWV4dGVuc2libGUgb2JqZWN0cyBhcmUgbm90IGFsbG93ZWQgYXMga2V5cy5cIik7aWYoT3IpT2JqZWN0LmRlZmluZVByb3BlcnR5KHQsQXIse2VudW1lcmFibGU6ITEsY29uZmlndXJhYmxlOiExLHdyaXRhYmxlOiExLHZhbHVlOmV9KTtlbHNlIGlmKHZvaWQgMCE9PXQucHJvcGVydHlJc0VudW1lcmFibGUmJnQucHJvcGVydHlJc0VudW1lcmFibGU9PT10LmNvbnN0cnVjdG9yLnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZSl0LnByb3BlcnR5SXNFbnVtZXJhYmxlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sdC5wcm9wZXJ0eUlzRW51bWVyYWJsZVtBcl09ZTtlbHNle2lmKHZvaWQgMD09PXQubm9kZVR5cGUpdGhyb3cgRXJyb3IoXCJVbmFibGUgdG8gc2V0IGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgb24gb2JqZWN0LlwiKTt0W0FyXT1lfX1yZXR1cm4gZX1mdW5jdGlvbiBvdCh0KXtpZih0JiZ0Lm5vZGVUeXBlPjApc3dpdGNoKHQubm9kZVR5cGUpe2Nhc2UgMTpyZXR1cm4gdC51bmlxdWVJRDtjYXNlIDk6cmV0dXJuIHQuZG9jdW1lbnRFbGVtZW50JiZ0LmRvY3VtZW50RWxlbWVudC51bmlxdWVJRH19ZnVuY3Rpb24gdXQodCxlKXtpZighdCl0aHJvdyBFcnJvcihlKX1mdW5jdGlvbiBzdCh0KXt1dCh0IT09MS8wLFwiQ2Fubm90IHBlcmZvcm0gdGhpcyBhY3Rpb24gd2l0aCBhbiBpbmZpbml0ZSBzaXplLlwiKX1mdW5jdGlvbiBhdCh0LGUpe3RoaXMuX2l0ZXI9dCx0aGlzLl91c2VLZXlzPWUsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBodCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBmdCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBjdCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBfdCh0KXt2YXIgZT1qdCh0KTtyZXR1cm4gZS5faXRlcj10LGUuc2l6ZT10LnNpemUsZS5mbGlwPWZ1bmN0aW9uKCl7cmV0dXJuIHR9LGUucmV2ZXJzZT1mdW5jdGlvbigpe3ZhciBlPXQucmV2ZXJzZS5hcHBseSh0aGlzKTtyZXR1cm4gZS5mbGlwPWZ1bmN0aW9uKCl7cmV0dXJuIHQucmV2ZXJzZSgpfSxlfSxlLmhhcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5pbmNsdWRlcyhlKTtcbn0sZS5pbmNsdWRlcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5oYXMoZSl9LGUuY2FjaGVSZXN1bHQ9UnQsZS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihlLHIpe3ZhciBuPXRoaXM7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUocix0LG4pIT09ITF9LHIpfSxlLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihlLHIpe2lmKGU9PT13cil7dmFyIG49dC5fX2l0ZXJhdG9yKGUscik7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHQ9bi5uZXh0KCk7aWYoIXQuZG9uZSl7dmFyIGU9dC52YWx1ZVswXTt0LnZhbHVlWzBdPXQudmFsdWVbMV0sdC52YWx1ZVsxXT1lfXJldHVybiB0fSl9cmV0dXJuIHQuX19pdGVyYXRvcihlPT09Z3I/bXI6Z3Iscil9LGV9ZnVuY3Rpb24gcHQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLnNpemU9dC5zaXplLG4uaGFzPWZ1bmN0aW9uKGUpe3JldHVybiB0LmhhcyhlKX0sbi5nZXQ9ZnVuY3Rpb24obixpKXt2YXIgbz10LmdldChuLGNyKTtyZXR1cm4gbz09PWNyP2k6ZS5jYWxsKHIsbyxuLHQpfSxuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpLHUpe3JldHVybiBuKGUuY2FsbChyLHQsaSx1KSxpLG8pIT09ITF9LGkpfSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuX19pdGVyYXRvcih3cixpKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgaT1vLm5leHQoKTtpZihpLmRvbmUpcmV0dXJuIGk7dmFyIHU9aS52YWx1ZSxzPXVbMF07cmV0dXJuIHoobixzLGUuY2FsbChyLHVbMV0scyx0KSxpKX0pfSxufWZ1bmN0aW9uIHZ0KHQsZSl7dmFyIHI9anQodCk7cmV0dXJuIHIuX2l0ZXI9dCxyLnNpemU9dC5zaXplLHIucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0fSx0LmZsaXAmJihyLmZsaXA9ZnVuY3Rpb24oKXt2YXIgZT1fdCh0KTtyZXR1cm4gZS5yZXZlcnNlPWZ1bmN0aW9uKCl7cmV0dXJuIHQuZmxpcCgpfSxlfSksci5nZXQ9ZnVuY3Rpb24ocixuKXtyZXR1cm4gdC5nZXQoZT9yOi0xLXIsbil9LHIuaGFzPWZ1bmN0aW9uKHIpe3JldHVybiB0LmhhcyhlP3I6LTEtcil9LHIuaW5jbHVkZXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9LHIuY2FjaGVSZXN1bHQ9UnQsci5fX2l0ZXJhdGU9ZnVuY3Rpb24oZSxyKXt2YXIgbj10aGlzO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBlKHQscixuKX0sIXIpfSxyLl9faXRlcmF0b3I9ZnVuY3Rpb24oZSxyKXtyZXR1cm4gdC5fX2l0ZXJhdG9yKGUsIXIpfSxyfWZ1bmN0aW9uIGx0KHQsZSxyLG4pe3ZhciBpPWp0KHQpO3JldHVybiBuJiYoaS5oYXM9ZnVuY3Rpb24obil7dmFyIGk9dC5nZXQobixjcik7cmV0dXJuIGkhPT1jciYmISFlLmNhbGwocixpLG4sdCl9LGkuZ2V0PWZ1bmN0aW9uKG4saSl7dmFyIG89dC5nZXQobixjcik7cmV0dXJuIG8hPT1jciYmZS5jYWxsKHIsbyxuLHQpP286aX0pLGkuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10aGlzLHM9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxvLGEpe3JldHVybiBlLmNhbGwocix0LG8sYSk/KHMrKyxpKHQsbj9vOnMtMSx1KSk6dm9pZCAwfSxvKSxzfSxpLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihpLG8pe3ZhciB1PXQuX19pdGVyYXRvcih3cixvKSxzPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7Zm9yKDs7KXt2YXIgbz11Lm5leHQoKTtpZihvLmRvbmUpcmV0dXJuIG87dmFyIGE9by52YWx1ZSxoPWFbMF0sZj1hWzFdO2lmKGUuY2FsbChyLGYsaCx0KSlyZXR1cm4geihpLG4/aDpzKyssZixvKX19KX0saX1mdW5jdGlvbiB5dCh0LGUscil7dmFyIG49THQoKS5hc011dGFibGUoKTtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24oaSxvKXtuLnVwZGF0ZShlLmNhbGwocixpLG8sdCksMCxmdW5jdGlvbih0KXtyZXR1cm4gdCsxfSl9KSxuLmFzSW1tdXRhYmxlKCl9ZnVuY3Rpb24gZHQodCxlLHIpe3ZhciBuPWQodCksaT0odyh0KT9JZSgpOkx0KCkpLmFzTXV0YWJsZSgpO1xuICB0Ll9faXRlcmF0ZShmdW5jdGlvbihvLHUpe2kudXBkYXRlKGUuY2FsbChyLG8sdSx0KSxmdW5jdGlvbih0KXtyZXR1cm4gdD10fHxbXSx0LnB1c2gobj9bdSxvXTpvKSx0fSl9KTt2YXIgbz1BdCh0KTtyZXR1cm4gaS5tYXAoZnVuY3Rpb24oZSl7cmV0dXJuIE90KHQsbyhlKSl9KX1mdW5jdGlvbiBtdCh0LGUscixuKXt2YXIgaT10LnNpemU7aWYodm9pZCAwIT09ZSYmKGU9MHxlKSx2b2lkIDAhPT1yJiYocj0wfHIpLGEoZSxyLGkpKXJldHVybiB0O3ZhciBvPWgoZSxpKSxzPWYocixpKTtpZihvIT09b3x8cyE9PXMpcmV0dXJuIG10KHQudG9TZXEoKS5jYWNoZVJlc3VsdCgpLGUscixuKTt2YXIgYyxfPXMtbztfPT09XyYmKGM9MD5fPzA6Xyk7dmFyIHA9anQodCk7cmV0dXJuIHAuc2l6ZT0wPT09Yz9jOnQuc2l6ZSYmY3x8dm9pZCAwLCFuJiZMKHQpJiZjPj0wJiYocC5nZXQ9ZnVuY3Rpb24oZSxyKXtyZXR1cm4gZT11KHRoaXMsZSksZT49MCYmYz5lP3QuZ2V0KGUrbyxyKTpyfSkscC5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihlLHIpe3ZhciBpPXRoaXM7aWYoMD09PWMpcmV0dXJuIDA7aWYocilyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShlLHIpO3ZhciB1PTAscz0hMCxhPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQscil7cmV0dXJuIHMmJihzPXUrKzxvKT92b2lkIDA6KGErKyxlKHQsbj9yOmEtMSxpKSE9PSExJiZhIT09Yyl9KSxhfSxwLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihlLHIpe2lmKDAhPT1jJiZyKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihlLHIpO3ZhciBpPTAhPT1jJiZ0Ll9faXRlcmF0b3IoZSxyKSx1PTAscz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7dSsrPG87KWkubmV4dCgpO2lmKCsrcz5jKXJldHVybiBJKCk7dmFyIHQ9aS5uZXh0KCk7cmV0dXJuIG58fGU9PT1ncj90OmU9PT1tcj96KGUscy0xLHZvaWQgMCx0KTp6KGUscy0xLHQudmFsdWVbMV0sdCl9KX0scH1mdW5jdGlvbiBndCh0LGUscil7dmFyIG49anQodCk7cmV0dXJuIG4uX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10aGlzO2lmKGkpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUobixpKTt2YXIgdT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LGkscyl7cmV0dXJuIGUuY2FsbChyLHQsaSxzKSYmKyt1JiZuKHQsaSxvKX0pLHV9LG4uX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztpZihpKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihuLGkpO3ZhciB1PXQuX19pdGVyYXRvcih3cixpKSxzPSEwO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2lmKCFzKXJldHVybiBJKCk7dmFyIHQ9dS5uZXh0KCk7aWYodC5kb25lKXJldHVybiB0O3ZhciBpPXQudmFsdWUsYT1pWzBdLGg9aVsxXTtyZXR1cm4gZS5jYWxsKHIsaCxhLG8pP249PT13cj90OnoobixhLGgsdCk6KHM9ITEsSSgpKX0pfSxufWZ1bmN0aW9uIHd0KHQsZSxyLG4pe3ZhciBpPWp0KHQpO3JldHVybiBpLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcztpZihvKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGksbyk7dmFyIHM9ITAsYT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LG8saCl7cmV0dXJuIHMmJihzPWUuY2FsbChyLHQsbyxoKSk/dm9pZCAwOihhKyssaSh0LG4/bzphLTEsdSkpfSksYX0saS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10aGlzO2lmKG8pcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKGksbyk7dmFyIHM9dC5fX2l0ZXJhdG9yKHdyLG8pLGE9ITAsaD0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0LG8sZjtkb3tpZih0PXMubmV4dCgpLHQuZG9uZSlyZXR1cm4gbnx8aT09PWdyP3Q6aT09PW1yP3ooaSxoKyssdm9pZCAwLHQpOnooaSxoKyssdC52YWx1ZVsxXSx0KTt2YXIgYz10LnZhbHVlO289Y1swXSxmPWNbMV0sYSYmKGE9ZS5jYWxsKHIsZixvLHUpKX13aGlsZShhKTtcbiAgcmV0dXJuIGk9PT13cj90OnooaSxvLGYsdCl9KX0saX1mdW5jdGlvbiBTdCh0LGUpe3ZhciByPWQodCksbj1bdF0uY29uY2F0KGUpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4geSh0KT9yJiYodD1wKHQpKTp0PXI/Vyh0KTpCKEFycmF5LmlzQXJyYXkodCk/dDpbdF0pLHR9KS5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIDAhPT10LnNpemV9KTtpZigwPT09bi5sZW5ndGgpcmV0dXJuIHQ7aWYoMT09PW4ubGVuZ3RoKXt2YXIgaT1uWzBdO2lmKGk9PT10fHxyJiZkKGkpfHxtKHQpJiZtKGkpKXJldHVybiBpfXZhciBvPW5ldyBqKG4pO3JldHVybiByP289by50b0tleWVkU2VxKCk6bSh0KXx8KG89by50b1NldFNlcSgpKSxvPW8uZmxhdHRlbighMCksby5zaXplPW4ucmVkdWNlKGZ1bmN0aW9uKHQsZSl7aWYodm9pZCAwIT09dCl7dmFyIHI9ZS5zaXplO2lmKHZvaWQgMCE9PXIpcmV0dXJuIHQrcn19LDApLG99ZnVuY3Rpb24genQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7ZnVuY3Rpb24gbyh0LGEpe3ZhciBoPXRoaXM7dC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpKXtyZXR1cm4oIWV8fGU+YSkmJnkodCk/byh0LGErMSk6bih0LHI/aTp1KyssaCk9PT0hMSYmKHM9ITApLCFzfSxpKX12YXIgdT0wLHM9ITE7cmV0dXJuIG8odCwwKSx1fSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuX19pdGVyYXRvcihuLGkpLHU9W10scz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7bzspe3ZhciB0PW8ubmV4dCgpO2lmKHQuZG9uZT09PSExKXt2YXIgYT10LnZhbHVlO2lmKG49PT13ciYmKGE9YVsxXSksZSYmIShlPnUubGVuZ3RoKXx8IXkoYSkpcmV0dXJuIHI/dDp6KG4scysrLGEsdCk7dS5wdXNoKG8pLG89YS5fX2l0ZXJhdG9yKG4saSl9ZWxzZSBvPXUucG9wKCl9cmV0dXJuIEkoKX0pfSxufWZ1bmN0aW9uIEl0KHQsZSxyKXt2YXIgbj1BdCh0KTtyZXR1cm4gdC50b1NlcSgpLm1hcChmdW5jdGlvbihpLG8pe3JldHVybiBuKGUuY2FsbChyLGksbyx0KSl9KS5mbGF0dGVuKCEwKX1mdW5jdGlvbiBidCh0LGUpe3ZhciByPWp0KHQpO3JldHVybiByLnNpemU9dC5zaXplJiYyKnQuc2l6ZS0xLHIuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24ocixuKXt2YXIgaT10aGlzLG89MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCl7cmV0dXJuKCFvfHxyKGUsbysrLGkpIT09ITEpJiZyKHQsbysrLGkpIT09ITF9LG4pLG99LHIuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHIsbil7dmFyIGksbz10Ll9faXRlcmF0b3IoZ3IsbiksdT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybighaXx8dSUyKSYmKGk9by5uZXh0KCksaS5kb25lKT9pOnUlMj96KHIsdSsrLGUpOnoocix1KyssaS52YWx1ZSxpKX0pfSxyfWZ1bmN0aW9uIHF0KHQsZSxyKXtlfHwoZT1VdCk7dmFyIG49ZCh0KSxpPTAsbz10LnRvU2VxKCkubWFwKGZ1bmN0aW9uKGUsbil7cmV0dXJuW24sZSxpKysscj9yKGUsbix0KTplXX0pLnRvQXJyYXkoKTtyZXR1cm4gby5zb3J0KGZ1bmN0aW9uKHQscil7cmV0dXJuIGUodFszXSxyWzNdKXx8dFsyXS1yWzJdfSkuZm9yRWFjaChuP2Z1bmN0aW9uKHQsZSl7b1tlXS5sZW5ndGg9Mn06ZnVuY3Rpb24odCxlKXtvW2VdPXRbMV19KSxuP3gobyk6bSh0KT9rKG8pOkEobyl9ZnVuY3Rpb24gRHQodCxlLHIpe2lmKGV8fChlPVV0KSxyKXt2YXIgbj10LnRvU2VxKCkubWFwKGZ1bmN0aW9uKGUsbil7cmV0dXJuW2UscihlLG4sdCldfSkucmVkdWNlKGZ1bmN0aW9uKHQscil7cmV0dXJuIE10KGUsdFsxXSxyWzFdKT9yOnR9KTtyZXR1cm4gbiYmblswXX1yZXR1cm4gdC5yZWR1Y2UoZnVuY3Rpb24odCxyKXtyZXR1cm4gTXQoZSx0LHIpP3I6dH0pfWZ1bmN0aW9uIE10KHQsZSxyKXt2YXIgbj10KHIsZSk7cmV0dXJuIDA9PT1uJiZyIT09ZSYmKHZvaWQgMD09PXJ8fG51bGw9PT1yfHxyIT09cil8fG4+MH1mdW5jdGlvbiBFdCh0LGUscil7dmFyIG49anQodCk7cmV0dXJuIG4uc2l6ZT1uZXcgaihyKS5tYXAoZnVuY3Rpb24odCl7XG4gIHJldHVybiB0LnNpemV9KS5taW4oKSxuLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPXRoaXMuX19pdGVyYXRvcihncixlKSxpPTA7IShyPW4ubmV4dCgpKS5kb25lJiZ0KHIudmFsdWUsaSsrLHRoaXMpIT09ITE7KTtyZXR1cm4gaX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxuKXt2YXIgaT1yLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdD1fKHQpLEQobj90LnJldmVyc2UoKTp0KX0pLG89MCx1PSExO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciByO3JldHVybiB1fHwocj1pLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdC5uZXh0KCl9KSx1PXIuc29tZShmdW5jdGlvbih0KXtyZXR1cm4gdC5kb25lfSkpLHU/SSgpOnoodCxvKyssZS5hcHBseShudWxsLHIubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0LnZhbHVlfSkpKX0pfSxufWZ1bmN0aW9uIE90KHQsZSl7cmV0dXJuIEwodCk/ZTp0LmNvbnN0cnVjdG9yKGUpfWZ1bmN0aW9uIHh0KHQpe2lmKHQhPT1PYmplY3QodCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIFtLLCBWXSB0dXBsZTogXCIrdCl9ZnVuY3Rpb24ga3QodCl7cmV0dXJuIHN0KHQuc2l6ZSksbyh0KX1mdW5jdGlvbiBBdCh0KXtyZXR1cm4gZCh0KT9wOm0odCk/djpsfWZ1bmN0aW9uIGp0KHQpe3JldHVybiBPYmplY3QuY3JlYXRlKChkKHQpP3g6bSh0KT9rOkEpLnByb3RvdHlwZSl9ZnVuY3Rpb24gUnQoKXtyZXR1cm4gdGhpcy5faXRlci5jYWNoZVJlc3VsdD8odGhpcy5faXRlci5jYWNoZVJlc3VsdCgpLHRoaXMuc2l6ZT10aGlzLl9pdGVyLnNpemUsdGhpcyk6Ty5wcm90b3R5cGUuY2FjaGVSZXN1bHQuY2FsbCh0aGlzKX1mdW5jdGlvbiBVdCh0LGUpe3JldHVybiB0PmU/MTplPnQ/LTE6MH1mdW5jdGlvbiBLdCh0KXt2YXIgZT1EKHQpO2lmKCFlKXtpZighRSh0KSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgaXRlcmFibGUgb3IgYXJyYXktbGlrZTogXCIrdCk7ZT1EKF8odCkpfXJldHVybiBlfWZ1bmN0aW9uIEx0KHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9RdCgpOlR0KHQpJiYhdyh0KT90OlF0KCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1wKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUuc2V0KHIsdCl9KX0pfWZ1bmN0aW9uIFR0KHQpe3JldHVybiEoIXR8fCF0W0xyXSl9ZnVuY3Rpb24gV3QodCxlKXt0aGlzLm93bmVySUQ9dCx0aGlzLmVudHJpZXM9ZX1mdW5jdGlvbiBCdCh0LGUscil7dGhpcy5vd25lcklEPXQsdGhpcy5iaXRtYXA9ZSx0aGlzLm5vZGVzPXJ9ZnVuY3Rpb24gQ3QodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMuY291bnQ9ZSx0aGlzLm5vZGVzPXJ9ZnVuY3Rpb24gSnQodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMua2V5SGFzaD1lLHRoaXMuZW50cmllcz1yfWZ1bmN0aW9uIE50KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmtleUhhc2g9ZSx0aGlzLmVudHJ5PXJ9ZnVuY3Rpb24gUHQodCxlLHIpe3RoaXMuX3R5cGU9ZSx0aGlzLl9yZXZlcnNlPXIsdGhpcy5fc3RhY2s9dC5fcm9vdCYmVnQodC5fcm9vdCl9ZnVuY3Rpb24gSHQodCxlKXtyZXR1cm4geih0LGVbMF0sZVsxXSl9ZnVuY3Rpb24gVnQodCxlKXtyZXR1cm57bm9kZTp0LGluZGV4OjAsX19wcmV2OmV9fWZ1bmN0aW9uIFl0KHQsZSxyLG4pe3ZhciBpPU9iamVjdC5jcmVhdGUoVHIpO3JldHVybiBpLnNpemU9dCxpLl9yb290PWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGkuX19hbHRlcmVkPSExLGl9ZnVuY3Rpb24gUXQoKXtyZXR1cm4gV3J8fChXcj1ZdCgwKSl9ZnVuY3Rpb24gWHQodCxyLG4pe3ZhciBpLG87aWYodC5fcm9vdCl7dmFyIHU9ZShfcikscz1lKHByKTtpZihpPUZ0KHQuX3Jvb3QsdC5fX293bmVySUQsMCx2b2lkIDAscixuLHUscyksIXMudmFsdWUpcmV0dXJuIHQ7bz10LnNpemUrKHUudmFsdWU/bj09PWNyPy0xOjE6MCl9ZWxzZXtpZihuPT09Y3IpcmV0dXJuIHQ7bz0xLGk9bmV3IFd0KHQuX19vd25lcklELFtbcixuXV0pfXJldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPW8sXG4gIHQuX3Jvb3Q9aSx0Ll9faGFzaD12b2lkIDAsdC5fX2FsdGVyZWQ9ITAsdCk6aT9ZdChvLGkpOlF0KCl9ZnVuY3Rpb24gRnQodCxlLG4saSxvLHUscyxhKXtyZXR1cm4gdD90LnVwZGF0ZShlLG4saSxvLHUscyxhKTp1PT09Y3I/dDoocihhKSxyKHMpLG5ldyBOdChlLGksW28sdV0pKX1mdW5jdGlvbiBHdCh0KXtyZXR1cm4gdC5jb25zdHJ1Y3Rvcj09PU50fHx0LmNvbnN0cnVjdG9yPT09SnR9ZnVuY3Rpb24gWnQodCxlLHIsbixpKXtpZih0LmtleUhhc2g9PT1uKXJldHVybiBuZXcgSnQoZSxuLFt0LmVudHJ5LGldKTt2YXIgbyx1PSgwPT09cj90LmtleUhhc2g6dC5rZXlIYXNoPj4+cikmZnIscz0oMD09PXI/bjpuPj4+cikmZnIsYT11PT09cz9bWnQodCxlLHIrYXIsbixpKV06KG89bmV3IE50KGUsbixpKSxzPnU/W3Qsb106W28sdF0pO3JldHVybiBuZXcgQnQoZSwxPDx1fDE8PHMsYSl9ZnVuY3Rpb24gJHQodCxlLHIsaSl7dHx8KHQ9bmV3IG4pO2Zvcih2YXIgbz1uZXcgTnQodCxldChyKSxbcixpXSksdT0wO2UubGVuZ3RoPnU7dSsrKXt2YXIgcz1lW3VdO289by51cGRhdGUodCwwLHZvaWQgMCxzWzBdLHNbMV0pfXJldHVybiBvfWZ1bmN0aW9uIHRlKHQsZSxyLG4pe2Zvcih2YXIgaT0wLG89MCx1PUFycmF5KHIpLHM9MCxhPTEsaD1lLmxlbmd0aDtoPnM7cysrLGE8PD0xKXt2YXIgZj1lW3NdO3ZvaWQgMCE9PWYmJnMhPT1uJiYoaXw9YSx1W28rK109Zil9cmV0dXJuIG5ldyBCdCh0LGksdSl9ZnVuY3Rpb24gZWUodCxlLHIsbixpKXtmb3IodmFyIG89MCx1PUFycmF5KGhyKSxzPTA7MCE9PXI7cysrLHI+Pj49MSl1W3NdPTEmcj9lW28rK106dm9pZCAwO3JldHVybiB1W25dPWksbmV3IEN0KHQsbysxLHUpfWZ1bmN0aW9uIHJlKHQsZSxyKXtmb3IodmFyIG49W10saT0wO3IubGVuZ3RoPmk7aSsrKXt2YXIgbz1yW2ldLHU9cChvKTt5KG8pfHwodT11Lm1hcChmdW5jdGlvbih0KXtyZXR1cm4gRih0KX0pKSxuLnB1c2godSl9cmV0dXJuIGllKHQsZSxuKX1mdW5jdGlvbiBuZSh0KXtyZXR1cm4gZnVuY3Rpb24oZSxyLG4pe3JldHVybiBlJiZlLm1lcmdlRGVlcFdpdGgmJnkocik/ZS5tZXJnZURlZXBXaXRoKHQscik6dD90KGUscixuKTpyfX1mdW5jdGlvbiBpZSh0LGUscil7cmV0dXJuIHI9ci5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIDAhPT10LnNpemV9KSwwPT09ci5sZW5ndGg/dDowIT09dC5zaXplfHx0Ll9fb3duZXJJRHx8MSE9PXIubGVuZ3RoP3Qud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXtmb3IodmFyIG49ZT9mdW5jdGlvbihyLG4pe3QudXBkYXRlKG4sY3IsZnVuY3Rpb24odCl7cmV0dXJuIHQ9PT1jcj9yOmUodCxyLG4pfSl9OmZ1bmN0aW9uKGUscil7dC5zZXQocixlKX0saT0wO3IubGVuZ3RoPmk7aSsrKXJbaV0uZm9yRWFjaChuKX0pOnQuY29uc3RydWN0b3IoclswXSl9ZnVuY3Rpb24gb2UodCxlLHIsbil7dmFyIGk9dD09PWNyLG89ZS5uZXh0KCk7aWYoby5kb25lKXt2YXIgdT1pP3I6dCxzPW4odSk7cmV0dXJuIHM9PT11P3Q6c311dChpfHx0JiZ0LnNldCxcImludmFsaWQga2V5UGF0aFwiKTt2YXIgYT1vLnZhbHVlLGg9aT9jcjp0LmdldChhLGNyKSxmPW9lKGgsZSxyLG4pO3JldHVybiBmPT09aD90OmY9PT1jcj90LnJlbW92ZShhKTooaT9RdCgpOnQpLnNldChhLGYpfWZ1bmN0aW9uIHVlKHQpe3JldHVybiB0LT10Pj4xJjE0MzE2NTU3NjUsdD0oODU4OTkzNDU5JnQpKyh0Pj4yJjg1ODk5MzQ1OSksdD10Kyh0Pj40KSYyNTI2NDUxMzUsdCs9dD4+OCx0Kz10Pj4xNiwxMjcmdH1mdW5jdGlvbiBzZSh0LGUscixuKXt2YXIgbz1uP3Q6aSh0KTtyZXR1cm4gb1tlXT1yLG99ZnVuY3Rpb24gYWUodCxlLHIsbil7dmFyIGk9dC5sZW5ndGgrMTtpZihuJiZlKzE9PT1pKXJldHVybiB0W2VdPXIsdDtmb3IodmFyIG89QXJyYXkoaSksdT0wLHM9MDtpPnM7cysrKXM9PT1lPyhvW3NdPXIsdT0tMSk6b1tzXT10W3MrdV07cmV0dXJuIG99ZnVuY3Rpb24gaGUodCxlLHIpe3ZhciBuPXQubGVuZ3RoLTE7aWYociYmZT09PW4pcmV0dXJuIHQucG9wKCksdDtmb3IodmFyIGk9QXJyYXkobiksbz0wLHU9MDtuPnU7dSsrKXU9PT1lJiYobz0xKSxcbiAgaVt1XT10W3Urb107cmV0dXJuIGl9ZnVuY3Rpb24gZmUodCl7dmFyIGU9bGUoKTtpZihudWxsPT09dHx8dm9pZCAwPT09dClyZXR1cm4gZTtpZihjZSh0KSlyZXR1cm4gdDt2YXIgcj12KHQpLG49ci5zaXplO3JldHVybiAwPT09bj9lOihzdChuKSxuPjAmJmhyPm4/dmUoMCxuLGFyLG51bGwsbmV3IF9lKHIudG9BcnJheSgpKSk6ZS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHQpe3Quc2V0U2l6ZShuKSxyLmZvckVhY2goZnVuY3Rpb24oZSxyKXtyZXR1cm4gdC5zZXQocixlKX0pfSkpfWZ1bmN0aW9uIGNlKHQpe3JldHVybiEoIXR8fCF0W05yXSl9ZnVuY3Rpb24gX2UodCxlKXt0aGlzLmFycmF5PXQsdGhpcy5vd25lcklEPWV9ZnVuY3Rpb24gcGUodCxlKXtmdW5jdGlvbiByKHQsZSxyKXtyZXR1cm4gMD09PWU/bih0LHIpOmkodCxlLHIpfWZ1bmN0aW9uIG4odCxyKXt2YXIgbj1yPT09cz9hJiZhLmFycmF5OnQmJnQuYXJyYXksaT1yPm8/MDpvLXIsaD11LXI7cmV0dXJuIGg+aHImJihoPWhyKSxmdW5jdGlvbigpe2lmKGk9PT1oKXJldHVybiBWcjt2YXIgdD1lPy0taDppKys7cmV0dXJuIG4mJm5bdF19fWZ1bmN0aW9uIGkodCxuLGkpe3ZhciBzLGE9dCYmdC5hcnJheSxoPWk+bz8wOm8taT4+bixmPSh1LWk+Pm4pKzE7cmV0dXJuIGY+aHImJihmPWhyKSxmdW5jdGlvbigpe2Zvcig7Oyl7aWYocyl7dmFyIHQ9cygpO2lmKHQhPT1WcilyZXR1cm4gdDtzPW51bGx9aWYoaD09PWYpcmV0dXJuIFZyO3ZhciBvPWU/LS1mOmgrKztzPXIoYSYmYVtvXSxuLWFyLGkrKG88PG4pKX19fXZhciBvPXQuX29yaWdpbix1PXQuX2NhcGFjaXR5LHM9emUodSksYT10Ll90YWlsO3JldHVybiByKHQuX3Jvb3QsdC5fbGV2ZWwsMCl9ZnVuY3Rpb24gdmUodCxlLHIsbixpLG8sdSl7dmFyIHM9T2JqZWN0LmNyZWF0ZShQcik7cmV0dXJuIHMuc2l6ZT1lLXQscy5fb3JpZ2luPXQscy5fY2FwYWNpdHk9ZSxzLl9sZXZlbD1yLHMuX3Jvb3Q9bixzLl90YWlsPWkscy5fX293bmVySUQ9byxzLl9faGFzaD11LHMuX19hbHRlcmVkPSExLHN9ZnVuY3Rpb24gbGUoKXtyZXR1cm4gSHJ8fChIcj12ZSgwLDAsYXIpKX1mdW5jdGlvbiB5ZSh0LHIsbil7aWYocj11KHQsciksciE9PXIpcmV0dXJuIHQ7aWYocj49dC5zaXplfHwwPnIpcmV0dXJuIHQud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXswPnI/d2UodCxyKS5zZXQoMCxuKTp3ZSh0LDAscisxKS5zZXQocixuKX0pO3IrPXQuX29yaWdpbjt2YXIgaT10Ll90YWlsLG89dC5fcm9vdCxzPWUocHIpO3JldHVybiByPj16ZSh0Ll9jYXBhY2l0eSk/aT1kZShpLHQuX19vd25lcklELDAscixuLHMpOm89ZGUobyx0Ll9fb3duZXJJRCx0Ll9sZXZlbCxyLG4scykscy52YWx1ZT90Ll9fb3duZXJJRD8odC5fcm9vdD1vLHQuX3RhaWw9aSx0Ll9faGFzaD12b2lkIDAsdC5fX2FsdGVyZWQ9ITAsdCk6dmUodC5fb3JpZ2luLHQuX2NhcGFjaXR5LHQuX2xldmVsLG8saSk6dH1mdW5jdGlvbiBkZSh0LGUsbixpLG8sdSl7dmFyIHM9aT4+Pm4mZnIsYT10JiZ0LmFycmF5Lmxlbmd0aD5zO2lmKCFhJiZ2b2lkIDA9PT1vKXJldHVybiB0O3ZhciBoO2lmKG4+MCl7dmFyIGY9dCYmdC5hcnJheVtzXSxjPWRlKGYsZSxuLWFyLGksbyx1KTtyZXR1cm4gYz09PWY/dDooaD1tZSh0LGUpLGguYXJyYXlbc109YyxoKX1yZXR1cm4gYSYmdC5hcnJheVtzXT09PW8/dDoocih1KSxoPW1lKHQsZSksdm9pZCAwPT09byYmcz09PWguYXJyYXkubGVuZ3RoLTE/aC5hcnJheS5wb3AoKTpoLmFycmF5W3NdPW8saCl9ZnVuY3Rpb24gbWUodCxlKXtyZXR1cm4gZSYmdCYmZT09PXQub3duZXJJRD90Om5ldyBfZSh0P3QuYXJyYXkuc2xpY2UoKTpbXSxlKX1mdW5jdGlvbiBnZSh0LGUpe2lmKGU+PXplKHQuX2NhcGFjaXR5KSlyZXR1cm4gdC5fdGFpbDtpZigxPDx0Ll9sZXZlbCthcj5lKXtmb3IodmFyIHI9dC5fcm9vdCxuPXQuX2xldmVsO3ImJm4+MDspcj1yLmFycmF5W2U+Pj5uJmZyXSxuLT1hcjtyZXR1cm4gcn19ZnVuY3Rpb24gd2UodCxlLHIpe3ZvaWQgMCE9PWUmJihlPTB8ZSksdm9pZCAwIT09ciYmKHI9MHxyKTt2YXIgaT10Ll9fb3duZXJJRHx8bmV3IG4sbz10Ll9vcmlnaW4sdT10Ll9jYXBhY2l0eSxzPW8rZSxhPXZvaWQgMD09PXI/dTowPnI/dStyOm8rcjtcbiAgaWYocz09PW8mJmE9PT11KXJldHVybiB0O2lmKHM+PWEpcmV0dXJuIHQuY2xlYXIoKTtmb3IodmFyIGg9dC5fbGV2ZWwsZj10Ll9yb290LGM9MDswPnMrYzspZj1uZXcgX2UoZiYmZi5hcnJheS5sZW5ndGg/W3ZvaWQgMCxmXTpbXSxpKSxoKz1hcixjKz0xPDxoO2MmJihzKz1jLG8rPWMsYSs9Yyx1Kz1jKTtmb3IodmFyIF89emUodSkscD16ZShhKTtwPj0xPDxoK2FyOylmPW5ldyBfZShmJiZmLmFycmF5Lmxlbmd0aD9bZl06W10saSksaCs9YXI7dmFyIHY9dC5fdGFpbCxsPV8+cD9nZSh0LGEtMSk6cD5fP25ldyBfZShbXSxpKTp2O2lmKHYmJnA+XyYmdT5zJiZ2LmFycmF5Lmxlbmd0aCl7Zj1tZShmLGkpO2Zvcih2YXIgeT1mLGQ9aDtkPmFyO2QtPWFyKXt2YXIgbT1fPj4+ZCZmcjt5PXkuYXJyYXlbbV09bWUoeS5hcnJheVttXSxpKX15LmFycmF5W18+Pj5hciZmcl09dn1pZih1PmEmJihsPWwmJmwucmVtb3ZlQWZ0ZXIoaSwwLGEpKSxzPj1wKXMtPXAsYS09cCxoPWFyLGY9bnVsbCxsPWwmJmwucmVtb3ZlQmVmb3JlKGksMCxzKTtlbHNlIGlmKHM+b3x8Xz5wKXtmb3IoYz0wO2Y7KXt2YXIgZz1zPj4+aCZmcjtpZihnIT09cD4+PmgmZnIpYnJlYWs7ZyYmKGMrPSgxPDxoKSpnKSxoLT1hcixmPWYuYXJyYXlbZ119ZiYmcz5vJiYoZj1mLnJlbW92ZUJlZm9yZShpLGgscy1jKSksZiYmXz5wJiYoZj1mLnJlbW92ZUFmdGVyKGksaCxwLWMpKSxjJiYocy09YyxhLT1jKX1yZXR1cm4gdC5fX293bmVySUQ/KHQuc2l6ZT1hLXMsdC5fb3JpZ2luPXMsdC5fY2FwYWNpdHk9YSx0Ll9sZXZlbD1oLHQuX3Jvb3Q9Zix0Ll90YWlsPWwsdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOnZlKHMsYSxoLGYsbCl9ZnVuY3Rpb24gU2UodCxlLHIpe2Zvcih2YXIgbj1bXSxpPTAsbz0wO3IubGVuZ3RoPm87bysrKXt2YXIgdT1yW29dLHM9dih1KTtzLnNpemU+aSYmKGk9cy5zaXplKSx5KHUpfHwocz1zLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gRih0KX0pKSxuLnB1c2gocyl9cmV0dXJuIGk+dC5zaXplJiYodD10LnNldFNpemUoaSkpLGllKHQsZSxuKX1mdW5jdGlvbiB6ZSh0KXtyZXR1cm4gaHI+dD8wOnQtMT4+PmFyPDxhcn1mdW5jdGlvbiBJZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/RGUoKTpiZSh0KT90OkRlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1wKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUuc2V0KHIsdCl9KX0pfWZ1bmN0aW9uIGJlKHQpe3JldHVybiBUdCh0KSYmdyh0KX1mdW5jdGlvbiBxZSh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKEllLnByb3RvdHlwZSk7cmV0dXJuIGkuc2l6ZT10P3Quc2l6ZTowLGkuX21hcD10LGkuX2xpc3Q9ZSxpLl9fb3duZXJJRD1yLGkuX19oYXNoPW4saX1mdW5jdGlvbiBEZSgpe3JldHVybiBZcnx8KFlyPXFlKFF0KCksbGUoKSkpfWZ1bmN0aW9uIE1lKHQsZSxyKXt2YXIgbixpLG89dC5fbWFwLHU9dC5fbGlzdCxzPW8uZ2V0KGUpLGE9dm9pZCAwIT09cztpZihyPT09Y3Ipe2lmKCFhKXJldHVybiB0O3Uuc2l6ZT49aHImJnUuc2l6ZT49MipvLnNpemU/KGk9dS5maWx0ZXIoZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwIT09dCYmcyE9PWV9KSxuPWkudG9LZXllZFNlcSgpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdFswXX0pLmZsaXAoKS50b01hcCgpLHQuX19vd25lcklEJiYobi5fX293bmVySUQ9aS5fX293bmVySUQ9dC5fX293bmVySUQpKToobj1vLnJlbW92ZShlKSxpPXM9PT11LnNpemUtMT91LnBvcCgpOnUuc2V0KHMsdm9pZCAwKSl9ZWxzZSBpZihhKXtpZihyPT09dS5nZXQocylbMV0pcmV0dXJuIHQ7bj1vLGk9dS5zZXQocyxbZSxyXSl9ZWxzZSBuPW8uc2V0KGUsdS5zaXplKSxpPXUuc2V0KHUuc2l6ZSxbZSxyXSk7cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9bi5zaXplLHQuX21hcD1uLHQuX2xpc3Q9aSx0Ll9faGFzaD12b2lkIDAsdCk6cWUobixpKX1mdW5jdGlvbiBFZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/a2UoKTpPZSh0KT90OmtlKCkudW5zaGlmdEFsbCh0KTtcbn1mdW5jdGlvbiBPZSh0KXtyZXR1cm4hKCF0fHwhdFtRcl0pfWZ1bmN0aW9uIHhlKHQsZSxyLG4pe3ZhciBpPU9iamVjdC5jcmVhdGUoWHIpO3JldHVybiBpLnNpemU9dCxpLl9oZWFkPWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGkuX19hbHRlcmVkPSExLGl9ZnVuY3Rpb24ga2UoKXtyZXR1cm4gRnJ8fChGcj14ZSgwKSl9ZnVuY3Rpb24gQWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0tlKCk6amUodCkmJiF3KHQpP3Q6S2UoKS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3ZhciByPWwodCk7c3Qoci5zaXplKSxyLmZvckVhY2goZnVuY3Rpb24odCl7cmV0dXJuIGUuYWRkKHQpfSl9KX1mdW5jdGlvbiBqZSh0KXtyZXR1cm4hKCF0fHwhdFtHcl0pfWZ1bmN0aW9uIFJlKHQsZSl7cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9ZS5zaXplLHQuX21hcD1lLHQpOmU9PT10Ll9tYXA/dDowPT09ZS5zaXplP3QuX19lbXB0eSgpOnQuX19tYWtlKGUpfWZ1bmN0aW9uIFVlKHQsZSl7dmFyIHI9T2JqZWN0LmNyZWF0ZShacik7cmV0dXJuIHIuc2l6ZT10P3Quc2l6ZTowLHIuX21hcD10LHIuX19vd25lcklEPWUscn1mdW5jdGlvbiBLZSgpe3JldHVybiAkcnx8KCRyPVVlKFF0KCkpKX1mdW5jdGlvbiBMZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/QmUoKTpUZSh0KT90OkJlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1sKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSl9ZnVuY3Rpb24gVGUodCl7cmV0dXJuIGplKHQpJiZ3KHQpfWZ1bmN0aW9uIFdlKHQsZSl7dmFyIHI9T2JqZWN0LmNyZWF0ZSh0bik7cmV0dXJuIHIuc2l6ZT10P3Quc2l6ZTowLHIuX21hcD10LHIuX19vd25lcklEPWUscn1mdW5jdGlvbiBCZSgpe3JldHVybiBlbnx8KGVuPVdlKERlKCkpKX1mdW5jdGlvbiBDZSh0LGUpe3ZhciByLG49ZnVuY3Rpb24obyl7aWYobyBpbnN0YW5jZW9mIG4pcmV0dXJuIG87aWYoISh0aGlzIGluc3RhbmNlb2YgbikpcmV0dXJuIG5ldyBuKG8pO2lmKCFyKXtyPSEwO3ZhciB1PU9iamVjdC5rZXlzKHQpO1BlKGksdSksaS5zaXplPXUubGVuZ3RoLGkuX25hbWU9ZSxpLl9rZXlzPXUsaS5fZGVmYXVsdFZhbHVlcz10fXRoaXMuX21hcD1MdChvKX0saT1uLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHJuKTtyZXR1cm4gaS5jb25zdHJ1Y3Rvcj1uLG59ZnVuY3Rpb24gSmUodCxlLHIpe3ZhciBuPU9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHQpKTtyZXR1cm4gbi5fbWFwPWUsbi5fX293bmVySUQ9cixufWZ1bmN0aW9uIE5lKHQpe3JldHVybiB0Ll9uYW1lfHx0LmNvbnN0cnVjdG9yLm5hbWV8fFwiUmVjb3JkXCJ9ZnVuY3Rpb24gUGUodCxlKXt0cnl7ZS5mb3JFYWNoKEhlLmJpbmQodm9pZCAwLHQpKX1jYXRjaChyKXt9fWZ1bmN0aW9uIEhlKHQsZSl7T2JqZWN0LmRlZmluZVByb3BlcnR5KHQsZSx7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0KGUpfSxzZXQ6ZnVuY3Rpb24odCl7dXQodGhpcy5fX293bmVySUQsXCJDYW5ub3Qgc2V0IG9uIGFuIGltbXV0YWJsZSByZWNvcmQuXCIpLHRoaXMuc2V0KGUsdCl9fSl9ZnVuY3Rpb24gVmUodCxlKXtpZih0PT09ZSlyZXR1cm4hMDtpZigheShlKXx8dm9pZCAwIT09dC5zaXplJiZ2b2lkIDAhPT1lLnNpemUmJnQuc2l6ZSE9PWUuc2l6ZXx8dm9pZCAwIT09dC5fX2hhc2gmJnZvaWQgMCE9PWUuX19oYXNoJiZ0Ll9faGFzaCE9PWUuX19oYXNofHxkKHQpIT09ZChlKXx8bSh0KSE9PW0oZSl8fHcodCkhPT13KGUpKXJldHVybiExO2lmKDA9PT10LnNpemUmJjA9PT1lLnNpemUpcmV0dXJuITA7dmFyIHI9IWcodCk7aWYodyh0KSl7dmFyIG49dC5lbnRyaWVzKCk7cmV0dXJuIGUuZXZlcnkoZnVuY3Rpb24odCxlKXt2YXIgaT1uLm5leHQoKS52YWx1ZTtyZXR1cm4gaSYmWChpWzFdLHQpJiYocnx8WChpWzBdLGUpKX0pJiZuLm5leHQoKS5kb25lfXZhciBpPSExO2lmKHZvaWQgMD09PXQuc2l6ZSlpZih2b2lkIDA9PT1lLnNpemUpXCJmdW5jdGlvblwiPT10eXBlb2YgdC5jYWNoZVJlc3VsdCYmdC5jYWNoZVJlc3VsdCgpO2Vsc2V7XG4gIGk9ITA7dmFyIG89dDt0PWUsZT1vfXZhciB1PSEwLHM9ZS5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxuKXtyZXR1cm4ocj90LmhhcyhlKTppP1goZSx0LmdldChuLGNyKSk6WCh0LmdldChuLGNyKSxlKSk/dm9pZCAwOih1PSExLCExKX0pO3JldHVybiB1JiZ0LnNpemU9PT1zfWZ1bmN0aW9uIFllKHQsZSxyKXtpZighKHRoaXMgaW5zdGFuY2VvZiBZZSkpcmV0dXJuIG5ldyBZZSh0LGUscik7aWYodXQoMCE9PXIsXCJDYW5ub3Qgc3RlcCBhIFJhbmdlIGJ5IDBcIiksdD10fHwwLHZvaWQgMD09PWUmJihlPTEvMCkscj12b2lkIDA9PT1yPzE6TWF0aC5hYnMociksdD5lJiYocj0tciksdGhpcy5fc3RhcnQ9dCx0aGlzLl9lbmQ9ZSx0aGlzLl9zdGVwPXIsdGhpcy5zaXplPU1hdGgubWF4KDAsTWF0aC5jZWlsKChlLXQpL3ItMSkrMSksMD09PXRoaXMuc2l6ZSl7aWYobm4pcmV0dXJuIG5uO25uPXRoaXN9fWZ1bmN0aW9uIFFlKHQsZSl7aWYoISh0aGlzIGluc3RhbmNlb2YgUWUpKXJldHVybiBuZXcgUWUodCxlKTtpZih0aGlzLl92YWx1ZT10LHRoaXMuc2l6ZT12b2lkIDA9PT1lPzEvMDpNYXRoLm1heCgwLGUpLDA9PT10aGlzLnNpemUpe2lmKG9uKXJldHVybiBvbjtvbj10aGlzfX1mdW5jdGlvbiBYZSh0LGUpe3ZhciByPWZ1bmN0aW9uKHIpe3QucHJvdG90eXBlW3JdPWVbcl19O3JldHVybiBPYmplY3Qua2V5cyhlKS5mb3JFYWNoKHIpLE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMmJk9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZSkuZm9yRWFjaChyKSx0fWZ1bmN0aW9uIEZlKHQsZSl7cmV0dXJuIGV9ZnVuY3Rpb24gR2UodCxlKXtyZXR1cm5bZSx0XX1mdW5jdGlvbiBaZSh0KXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4hdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWZ1bmN0aW9uICRlKHQpe3JldHVybiBmdW5jdGlvbigpe3JldHVybi10LmFwcGx5KHRoaXMsYXJndW1lbnRzKX19ZnVuY3Rpb24gdHIodCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/SlNPTi5zdHJpbmdpZnkodCk6dH1mdW5jdGlvbiBlcigpe3JldHVybiBpKGFyZ3VtZW50cyl9ZnVuY3Rpb24gcnIodCxlKXtyZXR1cm4gZT50PzE6dD5lPy0xOjB9ZnVuY3Rpb24gbnIodCl7aWYodC5zaXplPT09MS8wKXJldHVybiAwO3ZhciBlPXcodCkscj1kKHQpLG49ZT8xOjAsaT10Ll9faXRlcmF0ZShyP2U/ZnVuY3Rpb24odCxlKXtuPTMxKm4rb3IoZXQodCksZXQoZSkpfDB9OmZ1bmN0aW9uKHQsZSl7bj1uK29yKGV0KHQpLGV0KGUpKXwwfTplP2Z1bmN0aW9uKHQpe249MzEqbitldCh0KXwwfTpmdW5jdGlvbih0KXtuPW4rZXQodCl8MH0pO3JldHVybiBpcihpLG4pfWZ1bmN0aW9uIGlyKHQsZSl7cmV0dXJuIGU9TXIoZSwzNDMyOTE4MzUzKSxlPU1yKGU8PDE1fGU+Pj4tMTUsNDYxODQ1OTA3KSxlPU1yKGU8PDEzfGU+Pj4tMTMsNSksZT0oZSszODY0MjkyMTk2fDApXnQsZT1NcihlXmU+Pj4xNiwyMjQ2ODIyNTA3KSxlPU1yKGVeZT4+PjEzLDMyNjY0ODk5MDkpLGU9dHQoZV5lPj4+MTYpfWZ1bmN0aW9uIG9yKHQsZSl7cmV0dXJuIHReZSsyNjU0NDM1NzY5Kyh0PDw2KSsodD4+Mil8MH12YXIgdXI9QXJyYXkucHJvdG90eXBlLnNsaWNlLHNyPVwiZGVsZXRlXCIsYXI9NSxocj0xPDxhcixmcj1oci0xLGNyPXt9LF9yPXt2YWx1ZTohMX0scHI9e3ZhbHVlOiExfTt0KHAsXyksdCh2LF8pLHQobCxfKSxfLmlzSXRlcmFibGU9eSxfLmlzS2V5ZWQ9ZCxfLmlzSW5kZXhlZD1tLF8uaXNBc3NvY2lhdGl2ZT1nLF8uaXNPcmRlcmVkPXcsXy5LZXllZD1wLF8uSW5kZXhlZD12LF8uU2V0PWw7dmFyIHZyPVwiQEBfX0lNTVVUQUJMRV9JVEVSQUJMRV9fQEBcIixscj1cIkBAX19JTU1VVEFCTEVfS0VZRURfX0BAXCIseXI9XCJAQF9fSU1NVVRBQkxFX0lOREVYRURfX0BAXCIsZHI9XCJAQF9fSU1NVVRBQkxFX09SREVSRURfX0BAXCIsbXI9MCxncj0xLHdyPTIsU3I9XCJmdW5jdGlvblwiPT10eXBlb2YgU3ltYm9sJiZTeW1ib2wuaXRlcmF0b3IsenI9XCJAQGl0ZXJhdG9yXCIsSXI9U3J8fHpyO1MucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuXCJbSXRlcmF0b3JdXCJ9LFMuS0VZUz1tcixcbiAgUy5WQUxVRVM9Z3IsUy5FTlRSSUVTPXdyLFMucHJvdG90eXBlLmluc3BlY3Q9Uy5wcm90b3R5cGUudG9Tb3VyY2U9ZnVuY3Rpb24oKXtyZXR1cm5cIlwiK3RoaXN9LFMucHJvdG90eXBlW0lyXT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSx0KE8sXyksTy5vZj1mdW5jdGlvbigpe3JldHVybiBPKGFyZ3VtZW50cyl9LE8ucHJvdG90eXBlLnRvU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LE8ucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlNlcSB7XCIsXCJ9XCIpfSxPLnByb3RvdHlwZS5jYWNoZVJlc3VsdD1mdW5jdGlvbigpe3JldHVybiF0aGlzLl9jYWNoZSYmdGhpcy5fX2l0ZXJhdGVVbmNhY2hlZCYmKHRoaXMuX2NhY2hlPXRoaXMuZW50cnlTZXEoKS50b0FycmF5KCksdGhpcy5zaXplPXRoaXMuX2NhY2hlLmxlbmd0aCksdGhpc30sTy5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE4odGhpcyx0LGUsITApfSxPLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFAodGhpcyx0LGUsITApfSx0KHgsTykseC5wcm90b3R5cGUudG9LZXllZFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSx0KGssTyksay5vZj1mdW5jdGlvbigpe3JldHVybiBrKGFyZ3VtZW50cyl9LGsucHJvdG90eXBlLnRvSW5kZXhlZFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxrLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXEgW1wiLFwiXVwiKX0say5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE4odGhpcyx0LGUsITEpfSxrLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFAodGhpcyx0LGUsITEpfSx0KEEsTyksQS5vZj1mdW5jdGlvbigpe3JldHVybiBBKGFyZ3VtZW50cyl9LEEucHJvdG90eXBlLnRvU2V0U2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LE8uaXNTZXE9TCxPLktleWVkPXgsTy5TZXQ9QSxPLkluZGV4ZWQ9azt2YXIgYnI9XCJAQF9fSU1NVVRBQkxFX1NFUV9fQEBcIjtPLnByb3RvdHlwZVticl09ITAsdChqLGspLGoucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90aGlzLl9hcnJheVt1KHRoaXMsdCldOmV9LGoucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLl9hcnJheSxuPXIubGVuZ3RoLTEsaT0wO24+PWk7aSsrKWlmKHQocltlP24taTppXSxpLHRoaXMpPT09ITEpcmV0dXJuIGkrMTtyZXR1cm4gaX0sai5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2FycmF5LG49ci5sZW5ndGgtMSxpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7cmV0dXJuIGk+bj9JKCk6eih0LGkscltlP24taSsrOmkrK10pfSl9LHQoUix4KSxSLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwPT09ZXx8dGhpcy5oYXModCk/dGhpcy5fb2JqZWN0W3RdOmV9LFIucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fb2JqZWN0Lmhhc093blByb3BlcnR5KHQpfSxSLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5fb2JqZWN0LG49dGhpcy5fa2V5cyxpPW4ubGVuZ3RoLTEsbz0wO2k+PW87bysrKXt2YXIgdT1uW2U/aS1vOm9dO2lmKHQoclt1XSx1LHRoaXMpPT09ITEpcmV0dXJuIG8rMX1yZXR1cm4gb30sUi5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX29iamVjdCxuPXRoaXMuX2tleXMsaT1uLmxlbmd0aC0xLG89MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdT1uW2U/aS1vOm9dO3JldHVybiBvKys+aT9JKCk6eih0LHUsclt1XSl9KX0sUi5wcm90b3R5cGVbZHJdPSEwLHQoVSxrKSxVLnByb3RvdHlwZS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUodCxlKTt2YXIgcj10aGlzLl9pdGVyYWJsZSxuPUQociksaT0wO2lmKHEobikpZm9yKHZhciBvOyEobz1uLm5leHQoKSkuZG9uZSYmdChvLnZhbHVlLGkrKyx0aGlzKSE9PSExOyk7XG4gIHJldHVybiBpfSxVLnByb3RvdHlwZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXJhYmxlLG49RChyKTtpZighcShuKSlyZXR1cm4gbmV3IFMoSSk7dmFyIGk9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgZT1uLm5leHQoKTtyZXR1cm4gZS5kb25lP2U6eih0LGkrKyxlLnZhbHVlKX0pfSx0KEssayksSy5wcm90b3R5cGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKHQsZSk7Zm9yKHZhciByPXRoaXMuX2l0ZXJhdG9yLG49dGhpcy5faXRlcmF0b3JDYWNoZSxpPTA7bi5sZW5ndGg+aTspaWYodChuW2ldLGkrKyx0aGlzKT09PSExKXJldHVybiBpO2Zvcih2YXIgbzshKG89ci5uZXh0KCkpLmRvbmU7KXt2YXIgdT1vLnZhbHVlO2lmKG5baV09dSx0KHUsaSsrLHRoaXMpPT09ITEpYnJlYWt9cmV0dXJuIGl9LEsucHJvdG90eXBlLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHQsZSk7dmFyIHI9dGhpcy5faXRlcmF0b3Isbj10aGlzLl9pdGVyYXRvckNhY2hlLGk9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZihpPj1uLmxlbmd0aCl7dmFyIGU9ci5uZXh0KCk7aWYoZS5kb25lKXJldHVybiBlO25baV09ZS52YWx1ZX1yZXR1cm4geih0LGksbltpKytdKX0pfTt2YXIgcXI7dChILF8pLHQoVixIKSx0KFksSCksdChRLEgpLEguS2V5ZWQ9VixILkluZGV4ZWQ9WSxILlNldD1RO3ZhciBEcixNcj1cImZ1bmN0aW9uXCI9PXR5cGVvZiBNYXRoLmltdWwmJi0yPT09TWF0aC5pbXVsKDQyOTQ5NjcyOTUsMik/TWF0aC5pbXVsOmZ1bmN0aW9uKHQsZSl7dD0wfHQsZT0wfGU7dmFyIHI9NjU1MzUmdCxuPTY1NTM1JmU7cmV0dXJuIHIqbisoKHQ+Pj4xNikqbityKihlPj4+MTYpPDwxNj4+PjApfDB9LEVyPU9iamVjdC5pc0V4dGVuc2libGUsT3I9ZnVuY3Rpb24oKXt0cnl7cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSxcIkBcIix7fSksITB9Y2F0Y2godCl7cmV0dXJuITF9fSgpLHhyPVwiZnVuY3Rpb25cIj09dHlwZW9mIFdlYWtNYXA7eHImJihEcj1uZXcgV2Vha01hcCk7dmFyIGtyPTAsQXI9XCJfX2ltbXV0YWJsZWhhc2hfX1wiO1wiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmKEFyPVN5bWJvbChBcikpO3ZhciBqcj0xNixScj0yNTUsVXI9MCxLcj17fTt0KGF0LHgpLGF0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5faXRlci5nZXQodCxlKX0sYXQucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5oYXModCl9LGF0LnByb3RvdHlwZS52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9pdGVyLnZhbHVlU2VxKCl9LGF0LnByb3RvdHlwZS5yZXZlcnNlPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcyxlPXZ0KHRoaXMsITApO3JldHVybiB0aGlzLl91c2VLZXlzfHwoZS52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiB0Ll9pdGVyLnRvU2VxKCkucmV2ZXJzZSgpfSksZX0sYXQucHJvdG90eXBlLm1hcD1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj1wdCh0aGlzLHQsZSk7cmV0dXJuIHRoaXMuX3VzZUtleXN8fChuLnZhbHVlU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHIuX2l0ZXIudG9TZXEoKS5tYXAodCxlKX0pLG59LGF0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcixuPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKHRoaXMuX3VzZUtleXM/ZnVuY3Rpb24oZSxyKXtyZXR1cm4gdChlLHIsbil9OihyPWU/a3QodGhpcyk6MCxmdW5jdGlvbihpKXtyZXR1cm4gdChpLGU/LS1yOnIrKyxuKX0pLGUpfSxhdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe2lmKHRoaXMuX3VzZUtleXMpcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXIuX19pdGVyYXRvcihncixlKSxuPWU/a3QodGhpcyk6MDtcbiAgcmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGk9ci5uZXh0KCk7cmV0dXJuIGkuZG9uZT9pOnoodCxlPy0tbjpuKyssaS52YWx1ZSxpKX0pfSxhdC5wcm90b3R5cGVbZHJdPSEwLHQoaHQsayksaHQucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pdGVyLmluY2x1ZGVzKHQpfSxodC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiB0KGUsbisrLHIpfSxlKX0saHQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSksbj0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPXIubmV4dCgpO3JldHVybiBlLmRvbmU/ZTp6KHQsbisrLGUudmFsdWUsZSl9KX0sdChmdCxBKSxmdC5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pdGVyLmluY2x1ZGVzKHQpfSxmdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoZnVuY3Rpb24oZSl7cmV0dXJuIHQoZSxlLHIpfSxlKX0sZnQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9ci5uZXh0KCk7cmV0dXJuIGUuZG9uZT9lOnoodCxlLnZhbHVlLGUudmFsdWUsZSl9KX0sdChjdCx4KSxjdC5wcm90b3R5cGUuZW50cnlTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXRlci50b1NlcSgpfSxjdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoZnVuY3Rpb24oZSl7aWYoZSl7eHQoZSk7dmFyIG49eShlKTtyZXR1cm4gdChuP2UuZ2V0KDEpOmVbMV0sbj9lLmdldCgwKTplWzBdLHIpfX0sZSl9LGN0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7Oyl7dmFyIGU9ci5uZXh0KCk7aWYoZS5kb25lKXJldHVybiBlO3ZhciBuPWUudmFsdWU7aWYobil7eHQobik7dmFyIGk9eShuKTtyZXR1cm4geih0LGk/bi5nZXQoMCk6blswXSxpP24uZ2V0KDEpOm5bMV0sZSl9fX0pfSxodC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9YXQucHJvdG90eXBlLmNhY2hlUmVzdWx0PWZ0LnByb3RvdHlwZS5jYWNoZVJlc3VsdD1jdC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9UnQsdChMdCxWKSxMdC5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiTWFwIHtcIixcIn1cIil9LEx0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5fcm9vdD90aGlzLl9yb290LmdldCgwLHZvaWQgMCx0LGUpOmV9LEx0LnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gWHQodGhpcyx0LGUpfSxMdC5wcm90b3R5cGUuc2V0SW49ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy51cGRhdGVJbih0LGNyLGZ1bmN0aW9uKCl7cmV0dXJuIGV9KX0sTHQucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gWHQodGhpcyx0LGNyKX0sTHQucHJvdG90eXBlLmRlbGV0ZUluPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnVwZGF0ZUluKHQsZnVuY3Rpb24oKXtyZXR1cm4gY3J9KX0sTHQucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUscil7cmV0dXJuIDE9PT1hcmd1bWVudHMubGVuZ3RoP3QodGhpcyk6dGhpcy51cGRhdGVJbihbdF0sZSxyKX0sTHQucHJvdG90eXBlLnVwZGF0ZUluPWZ1bmN0aW9uKHQsZSxyKXtyfHwocj1lLGU9dm9pZCAwKTt2YXIgbj1vZSh0aGlzLEt0KHQpLGUscik7cmV0dXJuIG49PT1jcj92b2lkIDA6bn0sTHQucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5fcm9vdD1udWxsLFxuICB0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6UXQoKX0sTHQucHJvdG90eXBlLm1lcmdlPWZ1bmN0aW9uKCl7cmV0dXJuIHJlKHRoaXMsdm9pZCAwLGFyZ3VtZW50cyl9LEx0LnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHJlKHRoaXMsdCxlKX0sTHQucHJvdG90eXBlLm1lcmdlSW49ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxRdCgpLGZ1bmN0aW9uKHQpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQubWVyZ2U/dC5tZXJnZS5hcHBseSh0LGUpOmVbZS5sZW5ndGgtMV19KX0sTHQucHJvdG90eXBlLm1lcmdlRGVlcD1mdW5jdGlvbigpe3JldHVybiByZSh0aGlzLG5lKHZvaWQgMCksYXJndW1lbnRzKX0sTHQucHJvdG90eXBlLm1lcmdlRGVlcFdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHJlKHRoaXMsbmUodCksZSl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXBJbj1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gdGhpcy51cGRhdGVJbih0LFF0KCksZnVuY3Rpb24odCl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5tZXJnZURlZXA/dC5tZXJnZURlZXAuYXBwbHkodCxlKTplW2UubGVuZ3RoLTFdfSl9LEx0LnByb3RvdHlwZS5zb3J0PWZ1bmN0aW9uKHQpe3JldHVybiBJZShxdCh0aGlzLHQpKX0sTHQucHJvdG90eXBlLnNvcnRCeT1mdW5jdGlvbih0LGUpe3JldHVybiBJZShxdCh0aGlzLGUsdCkpfSxMdC5wcm90b3R5cGUud2l0aE11dGF0aW9ucz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmFzTXV0YWJsZSgpO3JldHVybiB0KGUpLGUud2FzQWx0ZXJlZCgpP2UuX19lbnN1cmVPd25lcih0aGlzLl9fb3duZXJJRCk6dGhpc30sTHQucHJvdG90eXBlLmFzTXV0YWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fb3duZXJJRD90aGlzOnRoaXMuX19lbnN1cmVPd25lcihuZXcgbil9LEx0LnByb3RvdHlwZS5hc0ltbXV0YWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fZW5zdXJlT3duZXIoKX0sTHQucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2FsdGVyZWR9LEx0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG5ldyBQdCh0aGlzLHQsZSl9LEx0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLG49MDtyZXR1cm4gdGhpcy5fcm9vdCYmdGhpcy5fcm9vdC5pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiBuKyssdChlWzFdLGVbMF0scil9LGUpLG59LEx0LnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe3JldHVybiB0PT09dGhpcy5fX293bmVySUQ/dGhpczp0P1l0KHRoaXMuc2l6ZSx0aGlzLl9yb290LHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX19hbHRlcmVkPSExLHRoaXMpfSxMdC5pc01hcD1UdDt2YXIgTHI9XCJAQF9fSU1NVVRBQkxFX01BUF9fQEBcIixUcj1MdC5wcm90b3R5cGU7VHJbTHJdPSEwLFRyW3NyXT1Uci5yZW1vdmUsVHIucmVtb3ZlSW49VHIuZGVsZXRlSW4sV3QucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtmb3IodmFyIGk9dGhpcy5lbnRyaWVzLG89MCx1PWkubGVuZ3RoO3U+bztvKyspaWYoWChyLGlbb11bMF0pKXJldHVybiBpW29dWzFdO3JldHVybiBufSxXdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLG8sdSxzLGEpe2Zvcih2YXIgaD11PT09Y3IsZj10aGlzLmVudHJpZXMsYz0wLF89Zi5sZW5ndGg7Xz5jJiYhWChvLGZbY11bMF0pO2MrKyk7dmFyIHA9Xz5jO2lmKHA/ZltjXVsxXT09PXU6aClyZXR1cm4gdGhpcztpZihyKGEpLChofHwhcCkmJnIocyksIWh8fDEhPT1mLmxlbmd0aCl7aWYoIXAmJiFoJiZmLmxlbmd0aD49QnIpcmV0dXJuICR0KHQsZixvLHUpO3ZhciB2PXQmJnQ9PT10aGlzLm93bmVySUQsbD12P2Y6aShmKTtyZXR1cm4gcD9oP2M9PT1fLTE/bC5wb3AoKTpsW2NdPWwucG9wKCk6bFtjXT1bbyx1XTpsLnB1c2goW28sdV0pLFxuICB2Pyh0aGlzLmVudHJpZXM9bCx0aGlzKTpuZXcgV3QodCxsKX19LEJ0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7dm9pZCAwPT09ZSYmKGU9ZXQocikpO3ZhciBpPTE8PCgoMD09PXQ/ZTplPj4+dCkmZnIpLG89dGhpcy5iaXRtYXA7cmV0dXJuIDA9PT0obyZpKT9uOnRoaXMubm9kZXNbdWUobyZpLTEpXS5nZXQodCthcixlLHIsbil9LEJ0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLHIsbixpLG8sdSl7dm9pZCAwPT09ciYmKHI9ZXQobikpO3ZhciBzPSgwPT09ZT9yOnI+Pj5lKSZmcixhPTE8PHMsaD10aGlzLmJpdG1hcCxmPTAhPT0oaCZhKTtpZighZiYmaT09PWNyKXJldHVybiB0aGlzO3ZhciBjPXVlKGgmYS0xKSxfPXRoaXMubm9kZXMscD1mP19bY106dm9pZCAwLHY9RnQocCx0LGUrYXIscixuLGksbyx1KTtpZih2PT09cClyZXR1cm4gdGhpcztpZighZiYmdiYmXy5sZW5ndGg+PUNyKXJldHVybiBlZSh0LF8saCxzLHYpO2lmKGYmJiF2JiYyPT09Xy5sZW5ndGgmJkd0KF9bMV5jXSkpcmV0dXJuIF9bMV5jXTtpZihmJiZ2JiYxPT09Xy5sZW5ndGgmJkd0KHYpKXJldHVybiB2O3ZhciBsPXQmJnQ9PT10aGlzLm93bmVySUQseT1mP3Y/aDpoXmE6aHxhLGQ9Zj92P3NlKF8sYyx2LGwpOmhlKF8sYyxsKTphZShfLGMsdixsKTtyZXR1cm4gbD8odGhpcy5iaXRtYXA9eSx0aGlzLm5vZGVzPWQsdGhpcyk6bmV3IEJ0KHQseSxkKX0sQ3QucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXt2b2lkIDA9PT1lJiYoZT1ldChyKSk7dmFyIGk9KDA9PT10P2U6ZT4+PnQpJmZyLG89dGhpcy5ub2Rlc1tpXTtyZXR1cm4gbz9vLmdldCh0K2FyLGUscixuKTpufSxDdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxyLG4saSxvLHUpe3ZvaWQgMD09PXImJihyPWV0KG4pKTt2YXIgcz0oMD09PWU/cjpyPj4+ZSkmZnIsYT1pPT09Y3IsaD10aGlzLm5vZGVzLGY9aFtzXTtpZihhJiYhZilyZXR1cm4gdGhpczt2YXIgYz1GdChmLHQsZSthcixyLG4saSxvLHUpO2lmKGM9PT1mKXJldHVybiB0aGlzO3ZhciBfPXRoaXMuY291bnQ7aWYoZil7aWYoIWMmJihfLS0sSnI+XykpcmV0dXJuIHRlKHQsaCxfLHMpfWVsc2UgXysrO3ZhciBwPXQmJnQ9PT10aGlzLm93bmVySUQsdj1zZShoLHMsYyxwKTtyZXR1cm4gcD8odGhpcy5jb3VudD1fLHRoaXMubm9kZXM9dix0aGlzKTpuZXcgQ3QodCxfLHYpfSxKdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe2Zvcih2YXIgaT10aGlzLmVudHJpZXMsbz0wLHU9aS5sZW5ndGg7dT5vO28rKylpZihYKHIsaVtvXVswXSkpcmV0dXJuIGlbb11bMV07cmV0dXJuIG59LEp0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLG4sbyx1LHMsYSl7dm9pZCAwPT09biYmKG49ZXQobykpO3ZhciBoPXU9PT1jcjtpZihuIT09dGhpcy5rZXlIYXNoKXJldHVybiBoP3RoaXM6KHIoYSkscihzKSxadCh0aGlzLHQsZSxuLFtvLHVdKSk7Zm9yKHZhciBmPXRoaXMuZW50cmllcyxjPTAsXz1mLmxlbmd0aDtfPmMmJiFYKG8sZltjXVswXSk7YysrKTt2YXIgcD1fPmM7aWYocD9mW2NdWzFdPT09dTpoKXJldHVybiB0aGlzO2lmKHIoYSksKGh8fCFwKSYmcihzKSxoJiYyPT09XylyZXR1cm4gbmV3IE50KHQsdGhpcy5rZXlIYXNoLGZbMV5jXSk7dmFyIHY9dCYmdD09PXRoaXMub3duZXJJRCxsPXY/ZjppKGYpO3JldHVybiBwP2g/Yz09PV8tMT9sLnBvcCgpOmxbY109bC5wb3AoKTpsW2NdPVtvLHVdOmwucHVzaChbbyx1XSksdj8odGhpcy5lbnRyaWVzPWwsdGhpcyk6bmV3IEp0KHQsdGhpcy5rZXlIYXNoLGwpfSxOdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe3JldHVybiBYKHIsdGhpcy5lbnRyeVswXSk/dGhpcy5lbnRyeVsxXTpufSxOdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLGksbyx1LHMpe3ZhciBhPW89PT1jcixoPVgoaSx0aGlzLmVudHJ5WzBdKTtyZXR1cm4oaD9vPT09dGhpcy5lbnRyeVsxXTphKT90aGlzOihyKHMpLGE/dm9pZCByKHUpOmg/dCYmdD09PXRoaXMub3duZXJJRD8odGhpcy5lbnRyeVsxXT1vLHRoaXMpOm5ldyBOdCh0LHRoaXMua2V5SGFzaCxbaSxvXSk6KHIodSksXG4gIFp0KHRoaXMsdCxlLGV0KGkpLFtpLG9dKSkpfSxXdC5wcm90b3R5cGUuaXRlcmF0ZT1KdC5wcm90b3R5cGUuaXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLmVudHJpZXMsbj0wLGk9ci5sZW5ndGgtMTtpPj1uO24rKylpZih0KHJbZT9pLW46bl0pPT09ITEpcmV0dXJuITF9LEJ0LnByb3RvdHlwZS5pdGVyYXRlPUN0LnByb3RvdHlwZS5pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMubm9kZXMsbj0wLGk9ci5sZW5ndGgtMTtpPj1uO24rKyl7dmFyIG89cltlP2ktbjpuXTtpZihvJiZvLml0ZXJhdGUodCxlKT09PSExKXJldHVybiExfX0sTnQucHJvdG90eXBlLml0ZXJhdGU9ZnVuY3Rpb24odCl7cmV0dXJuIHQodGhpcy5lbnRyeSl9LHQoUHQsUyksUHQucHJvdG90eXBlLm5leHQ9ZnVuY3Rpb24oKXtmb3IodmFyIHQ9dGhpcy5fdHlwZSxlPXRoaXMuX3N0YWNrO2U7KXt2YXIgcixuPWUubm9kZSxpPWUuaW5kZXgrKztpZihuLmVudHJ5KXtpZigwPT09aSlyZXR1cm4gSHQodCxuLmVudHJ5KX1lbHNlIGlmKG4uZW50cmllcyl7aWYocj1uLmVudHJpZXMubGVuZ3RoLTEscj49aSlyZXR1cm4gSHQodCxuLmVudHJpZXNbdGhpcy5fcmV2ZXJzZT9yLWk6aV0pfWVsc2UgaWYocj1uLm5vZGVzLmxlbmd0aC0xLHI+PWkpe3ZhciBvPW4ubm9kZXNbdGhpcy5fcmV2ZXJzZT9yLWk6aV07aWYobyl7aWYoby5lbnRyeSlyZXR1cm4gSHQodCxvLmVudHJ5KTtlPXRoaXMuX3N0YWNrPVZ0KG8sZSl9Y29udGludWV9ZT10aGlzLl9zdGFjaz10aGlzLl9zdGFjay5fX3ByZXZ9cmV0dXJuIEkoKX07dmFyIFdyLEJyPWhyLzQsQ3I9aHIvMixKcj1oci80O3QoZmUsWSksZmUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxmZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiTGlzdCBbXCIsXCJdXCIpfSxmZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7aWYodD11KHRoaXMsdCksdD49MCYmdGhpcy5zaXplPnQpe3QrPXRoaXMuX29yaWdpbjt2YXIgcj1nZSh0aGlzLHQpO3JldHVybiByJiZyLmFycmF5W3QmZnJdfXJldHVybiBlfSxmZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHllKHRoaXMsdCxlKX0sZmUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5oYXModCk/MD09PXQ/dGhpcy5zaGlmdCgpOnQ9PT10aGlzLnNpemUtMT90aGlzLnBvcCgpOnRoaXMuc3BsaWNlKHQsMSk6dGhpc30sZmUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPXRoaXMuX29yaWdpbj10aGlzLl9jYXBhY2l0eT0wLHRoaXMuX2xldmVsPWFyLHRoaXMuX3Jvb3Q9dGhpcy5fdGFpbD1udWxsLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTpsZSgpfSxmZS5wcm90b3R5cGUucHVzaD1mdW5jdGlvbigpe3ZhciB0PWFyZ3VtZW50cyxlPXRoaXMuc2l6ZTtyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe3dlKHIsMCxlK3QubGVuZ3RoKTtmb3IodmFyIG49MDt0Lmxlbmd0aD5uO24rKylyLnNldChlK24sdFtuXSl9KX0sZmUucHJvdG90eXBlLnBvcD1mdW5jdGlvbigpe3JldHVybiB3ZSh0aGlzLDAsLTEpfSxmZS5wcm90b3R5cGUudW5zaGlmdD1mdW5jdGlvbigpe3ZhciB0PWFyZ3VtZW50cztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3dlKGUsLXQubGVuZ3RoKTtmb3IodmFyIHI9MDt0Lmxlbmd0aD5yO3IrKyllLnNldChyLHRbcl0pfSl9LGZlLnByb3RvdHlwZS5zaGlmdD1mdW5jdGlvbigpe3JldHVybiB3ZSh0aGlzLDEpfSxmZS5wcm90b3R5cGUubWVyZ2U9ZnVuY3Rpb24oKXtyZXR1cm4gU2UodGhpcyx2b2lkIDAsYXJndW1lbnRzKX0sZmUucHJvdG90eXBlLm1lcmdlV2l0aD1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gU2UodGhpcyx0LGUpfSxmZS5wcm90b3R5cGUubWVyZ2VEZWVwPWZ1bmN0aW9uKCl7cmV0dXJuIFNlKHRoaXMsbmUodm9pZCAwKSxhcmd1bWVudHMpO1xufSxmZS5wcm90b3R5cGUubWVyZ2VEZWVwV2l0aD1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gU2UodGhpcyxuZSh0KSxlKX0sZmUucHJvdG90eXBlLnNldFNpemU9ZnVuY3Rpb24odCl7cmV0dXJuIHdlKHRoaXMsMCx0KX0sZmUucHJvdG90eXBlLnNsaWNlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5zaXplO3JldHVybiBhKHQsZSxyKT90aGlzOndlKHRoaXMsaCh0LHIpLGYoZSxyKSl9LGZlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9MCxuPXBlKHRoaXMsZSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9bigpO3JldHVybiBlPT09VnI/SSgpOnoodCxyKyssZSl9KX0sZmUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPTAsaT1wZSh0aGlzLGUpOyhyPWkoKSkhPT1WciYmdChyLG4rKyx0aGlzKSE9PSExOyk7cmV0dXJuIG59LGZlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe3JldHVybiB0PT09dGhpcy5fX293bmVySUQ/dGhpczp0P3ZlKHRoaXMuX29yaWdpbix0aGlzLl9jYXBhY2l0eSx0aGlzLl9sZXZlbCx0aGlzLl9yb290LHRoaXMuX3RhaWwsdCx0aGlzLl9faGFzaCk6KHRoaXMuX19vd25lcklEPXQsdGhpcyl9LGZlLmlzTGlzdD1jZTt2YXIgTnI9XCJAQF9fSU1NVVRBQkxFX0xJU1RfX0BAXCIsUHI9ZmUucHJvdG90eXBlO1ByW05yXT0hMCxQcltzcl09UHIucmVtb3ZlLFByLnNldEluPVRyLnNldEluLFByLmRlbGV0ZUluPVByLnJlbW92ZUluPVRyLnJlbW92ZUluLFByLnVwZGF0ZT1Uci51cGRhdGUsUHIudXBkYXRlSW49VHIudXBkYXRlSW4sUHIubWVyZ2VJbj1Uci5tZXJnZUluLFByLm1lcmdlRGVlcEluPVRyLm1lcmdlRGVlcEluLFByLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxQci5hc011dGFibGU9VHIuYXNNdXRhYmxlLFByLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLFByLndhc0FsdGVyZWQ9VHIud2FzQWx0ZXJlZCxfZS5wcm90b3R5cGUucmVtb3ZlQmVmb3JlPWZ1bmN0aW9uKHQsZSxyKXtpZihyPT09ZT8xPDxlOjA9PT10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gdGhpczt2YXIgbj1yPj4+ZSZmcjtpZihuPj10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gbmV3IF9lKFtdLHQpO3ZhciBpLG89MD09PW47aWYoZT4wKXt2YXIgdT10aGlzLmFycmF5W25dO2lmKGk9dSYmdS5yZW1vdmVCZWZvcmUodCxlLWFyLHIpLGk9PT11JiZvKXJldHVybiB0aGlzfWlmKG8mJiFpKXJldHVybiB0aGlzO3ZhciBzPW1lKHRoaXMsdCk7aWYoIW8pZm9yKHZhciBhPTA7bj5hO2ErKylzLmFycmF5W2FdPXZvaWQgMDtyZXR1cm4gaSYmKHMuYXJyYXlbbl09aSksc30sX2UucHJvdG90eXBlLnJlbW92ZUFmdGVyPWZ1bmN0aW9uKHQsZSxyKXtpZihyPT09KGU/MTw8ZTowKXx8MD09PXRoaXMuYXJyYXkubGVuZ3RoKXJldHVybiB0aGlzO3ZhciBuPXItMT4+PmUmZnI7aWYobj49dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIHRoaXM7dmFyIGk7aWYoZT4wKXt2YXIgbz10aGlzLmFycmF5W25dO2lmKGk9byYmby5yZW1vdmVBZnRlcih0LGUtYXIsciksaT09PW8mJm49PT10aGlzLmFycmF5Lmxlbmd0aC0xKXJldHVybiB0aGlzfXZhciB1PW1lKHRoaXMsdCk7cmV0dXJuIHUuYXJyYXkuc3BsaWNlKG4rMSksaSYmKHUuYXJyYXlbbl09aSksdX07dmFyIEhyLFZyPXt9O3QoSWUsTHQpLEllLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sSWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIk9yZGVyZWRNYXAge1wiLFwifVwiKX0sSWUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX21hcC5nZXQodCk7cmV0dXJuIHZvaWQgMCE9PXI/dGhpcy5fbGlzdC5nZXQocilbMV06ZX0sSWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5fbWFwLmNsZWFyKCksdGhpcy5fbGlzdC5jbGVhcigpLHRoaXMpOkRlKCk7XG59LEllLnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gTWUodGhpcyx0LGUpfSxJZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe3JldHVybiBNZSh0aGlzLHQsY3IpfSxJZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpfHx0aGlzLl9saXN0Lndhc0FsdGVyZWQoKX0sSWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2xpc3QuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiBlJiZ0KGVbMV0sZVswXSxyKX0sZSl9LEllLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2xpc3QuZnJvbUVudHJ5U2VxKCkuX19pdGVyYXRvcih0LGUpfSxJZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtpZih0PT09dGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXM7dmFyIGU9dGhpcy5fbWFwLl9fZW5zdXJlT3duZXIodCkscj10aGlzLl9saXN0Ll9fZW5zdXJlT3duZXIodCk7cmV0dXJuIHQ/cWUoZSxyLHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX21hcD1lLHRoaXMuX2xpc3Q9cix0aGlzKX0sSWUuaXNPcmRlcmVkTWFwPWJlLEllLnByb3RvdHlwZVtkcl09ITAsSWUucHJvdG90eXBlW3NyXT1JZS5wcm90b3R5cGUucmVtb3ZlO3ZhciBZcjt0KEVlLFkpLEVlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlN0YWNrIFtcIixcIl1cIil9LEVlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9oZWFkO2Zvcih0PXUodGhpcyx0KTtyJiZ0LS07KXI9ci5uZXh0O3JldHVybiByP3IudmFsdWU6ZX0sRWUucHJvdG90eXBlLnBlZWs9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faGVhZCYmdGhpcy5faGVhZC52YWx1ZX0sRWUucHJvdG90eXBlLnB1c2g9ZnVuY3Rpb24oKXtpZigwPT09YXJndW1lbnRzLmxlbmd0aClyZXR1cm4gdGhpcztmb3IodmFyIHQ9dGhpcy5zaXplK2FyZ3VtZW50cy5sZW5ndGgsZT10aGlzLl9oZWFkLHI9YXJndW1lbnRzLmxlbmd0aC0xO3I+PTA7ci0tKWU9e3ZhbHVlOmFyZ3VtZW50c1tyXSxuZXh0OmV9O3JldHVybiB0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPXQsdGhpcy5faGVhZD1lLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZSh0LGUpfSxFZS5wcm90b3R5cGUucHVzaEFsbD1mdW5jdGlvbih0KXtpZih0PXYodCksMD09PXQuc2l6ZSlyZXR1cm4gdGhpcztzdCh0LnNpemUpO3ZhciBlPXRoaXMuc2l6ZSxyPXRoaXMuX2hlYWQ7cmV0dXJuIHQucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24odCl7ZSsrLHI9e3ZhbHVlOnQsbmV4dDpyfX0pLHRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9ZSx0aGlzLl9oZWFkPXIsdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOnhlKGUscil9LEVlLnByb3RvdHlwZS5wb3A9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zbGljZSgxKX0sRWUucHJvdG90eXBlLnVuc2hpZnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wdXNoLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLnVuc2hpZnRBbGw9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMucHVzaEFsbCh0KX0sRWUucHJvdG90eXBlLnNoaWZ0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucG9wLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5faGVhZD12b2lkIDAsdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOmtlKCl9LEVlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe2lmKGEodCxlLHRoaXMuc2l6ZSkpcmV0dXJuIHRoaXM7dmFyIHI9aCh0LHRoaXMuc2l6ZSksbj1mKGUsdGhpcy5zaXplKTtpZihuIT09dGhpcy5zaXplKXJldHVybiBZLnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMsdCxlKTtcbiAgZm9yKHZhciBpPXRoaXMuc2l6ZS1yLG89dGhpcy5faGVhZDtyLS07KW89by5uZXh0O3JldHVybiB0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPWksdGhpcy5faGVhZD1vLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZShpLG8pfSxFZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD94ZSh0aGlzLnNpemUsdGhpcy5faGVhZCx0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9fYWx0ZXJlZD0hMSx0aGlzKX0sRWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMucmV2ZXJzZSgpLl9faXRlcmF0ZSh0KTtmb3IodmFyIHI9MCxuPXRoaXMuX2hlYWQ7biYmdChuLnZhbHVlLHIrKyx0aGlzKSE9PSExOyluPW4ubmV4dDtyZXR1cm4gcn0sRWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLnJldmVyc2UoKS5fX2l0ZXJhdG9yKHQpO3ZhciByPTAsbj10aGlzLl9oZWFkO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2lmKG4pe3ZhciBlPW4udmFsdWU7cmV0dXJuIG49bi5uZXh0LHoodCxyKyssZSl9cmV0dXJuIEkoKX0pfSxFZS5pc1N0YWNrPU9lO3ZhciBRcj1cIkBAX19JTU1VVEFCTEVfU1RBQ0tfX0BAXCIsWHI9RWUucHJvdG90eXBlO1hyW1FyXT0hMCxYci53aXRoTXV0YXRpb25zPVRyLndpdGhNdXRhdGlvbnMsWHIuYXNNdXRhYmxlPVRyLmFzTXV0YWJsZSxYci5hc0ltbXV0YWJsZT1Uci5hc0ltbXV0YWJsZSxYci53YXNBbHRlcmVkPVRyLndhc0FsdGVyZWQ7dmFyIEZyO3QoQWUsUSksQWUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxBZS5mcm9tS2V5cz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcyhwKHQpLmtleVNlcSgpKX0sQWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlNldCB7XCIsXCJ9XCIpfSxBZS5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9tYXAuaGFzKHQpfSxBZS5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKHQpe3JldHVybiBSZSh0aGlzLHRoaXMuX21hcC5zZXQodCwhMCkpfSxBZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe3JldHVybiBSZSh0aGlzLHRoaXMuX21hcC5yZW1vdmUodCkpfSxBZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAuY2xlYXIoKSl9LEFlLnByb3RvdHlwZS51bmlvbj1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO3JldHVybiB0PXQuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSksMD09PXQubGVuZ3RoP3RoaXM6MCE9PXRoaXMuc2l6ZXx8dGhpcy5fX293bmVySUR8fDEhPT10Lmxlbmd0aD90aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7Zm9yKHZhciByPTA7dC5sZW5ndGg+cjtyKyspbCh0W3JdKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSk6dGhpcy5jb25zdHJ1Y3Rvcih0WzBdKX0sQWUucHJvdG90eXBlLmludGVyc2VjdD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO2lmKDA9PT10Lmxlbmd0aClyZXR1cm4gdGhpczt0PXQubWFwKGZ1bmN0aW9uKHQpe3JldHVybiBsKHQpfSk7dmFyIGU9dGhpcztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe2UuZm9yRWFjaChmdW5jdGlvbihlKXt0LmV2ZXJ5KGZ1bmN0aW9uKHQpe3JldHVybiB0LmluY2x1ZGVzKGUpfSl8fHIucmVtb3ZlKGUpfSl9KX0sQWUucHJvdG90eXBlLnN1YnRyYWN0PWZ1bmN0aW9uKCl7dmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMCk7aWYoMD09PXQubGVuZ3RoKXJldHVybiB0aGlzO3Q9dC5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIGwodCl9KTt2YXIgZT10aGlzO3JldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24ocil7ZS5mb3JFYWNoKGZ1bmN0aW9uKGUpe3Quc29tZShmdW5jdGlvbih0KXtyZXR1cm4gdC5pbmNsdWRlcyhlKX0pJiZyLnJlbW92ZShlKTtcbn0pfSl9LEFlLnByb3RvdHlwZS5tZXJnZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaW9uLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sQWUucHJvdG90eXBlLm1lcmdlV2l0aD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiB0aGlzLnVuaW9uLmFwcGx5KHRoaXMsdCl9LEFlLnByb3RvdHlwZS5zb3J0PWZ1bmN0aW9uKHQpe3JldHVybiBMZShxdCh0aGlzLHQpKX0sQWUucHJvdG90eXBlLnNvcnRCeT1mdW5jdGlvbih0LGUpe3JldHVybiBMZShxdCh0aGlzLGUsdCkpfSxBZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpfSxBZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5fbWFwLl9faXRlcmF0ZShmdW5jdGlvbihlLG4pe3JldHVybiB0KG4sbixyKX0sZSl9LEFlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX21hcC5tYXAoZnVuY3Rpb24odCxlKXtyZXR1cm4gZX0pLl9faXRlcmF0b3IodCxlKX0sQWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7aWYodD09PXRoaXMuX19vd25lcklEKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P3RoaXMuX19tYWtlKGUsdCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fbWFwPWUsdGhpcyl9LEFlLmlzU2V0PWplO3ZhciBHcj1cIkBAX19JTU1VVEFCTEVfU0VUX19AQFwiLFpyPUFlLnByb3RvdHlwZTtacltHcl09ITAsWnJbc3JdPVpyLnJlbW92ZSxaci5tZXJnZURlZXA9WnIubWVyZ2UsWnIubWVyZ2VEZWVwV2l0aD1aci5tZXJnZVdpdGgsWnIud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLFpyLmFzTXV0YWJsZT1Uci5hc011dGFibGUsWnIuYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsWnIuX19lbXB0eT1LZSxaci5fX21ha2U9VWU7dmFyICRyO3QoTGUsQWUpLExlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sTGUuZnJvbUtleXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMocCh0KS5rZXlTZXEoKSl9LExlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJPcmRlcmVkU2V0IHtcIixcIn1cIil9LExlLmlzT3JkZXJlZFNldD1UZTt2YXIgdG49TGUucHJvdG90eXBlO3RuW2RyXT0hMCx0bi5fX2VtcHR5PUJlLHRuLl9fbWFrZT1XZTt2YXIgZW47dChDZSxWKSxDZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKE5lKHRoaXMpK1wiIHtcIixcIn1cIil9LENlLnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2RlZmF1bHRWYWx1ZXMuaGFzT3duUHJvcGVydHkodCl9LENlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtpZighdGhpcy5oYXModCkpcmV0dXJuIGU7dmFyIHI9dGhpcy5fZGVmYXVsdFZhbHVlc1t0XTtyZXR1cm4gdGhpcy5fbWFwP3RoaXMuX21hcC5nZXQodCxyKTpyfSxDZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtpZih0aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpcy5fbWFwJiZ0aGlzLl9tYXAuY2xlYXIoKSx0aGlzO3ZhciB0PXRoaXMuY29uc3RydWN0b3I7cmV0dXJuIHQuX2VtcHR5fHwodC5fZW1wdHk9SmUodGhpcyxRdCgpKSl9LENlLnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtpZighdGhpcy5oYXModCkpdGhyb3cgRXJyb3IoJ0Nhbm5vdCBzZXQgdW5rbm93biBrZXkgXCInK3QrJ1wiIG9uICcrTmUodGhpcykpO3ZhciByPXRoaXMuX21hcCYmdGhpcy5fbWFwLnNldCh0LGUpO3JldHVybiB0aGlzLl9fb3duZXJJRHx8cj09PXRoaXMuX21hcD90aGlzOkplKHRoaXMscil9LENlLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7aWYoIXRoaXMuaGFzKHQpKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcCYmdGhpcy5fbWFwLnJlbW92ZSh0KTtyZXR1cm4gdGhpcy5fX293bmVySUR8fGU9PT10aGlzLl9tYXA/dGhpczpKZSh0aGlzLGUpfSxDZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKX0sQ2UucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBwKHRoaXMuX2RlZmF1bHRWYWx1ZXMpLm1hcChmdW5jdGlvbih0LGUpe3JldHVybiByLmdldChlKX0pLl9faXRlcmF0b3IodCxlKX0sQ2UucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHAodGhpcy5fZGVmYXVsdFZhbHVlcykubWFwKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHIuZ2V0KGUpfSkuX19pdGVyYXRlKHQsZSl9LENlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe2lmKHQ9PT10aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAmJnRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P0plKHRoaXMsZSx0KToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9tYXA9ZSx0aGlzKX07dmFyIHJuPUNlLnByb3RvdHlwZTtybltzcl09cm4ucmVtb3ZlLHJuLmRlbGV0ZUluPXJuLnJlbW92ZUluPVRyLnJlbW92ZUluLHJuLm1lcmdlPVRyLm1lcmdlLHJuLm1lcmdlV2l0aD1Uci5tZXJnZVdpdGgscm4ubWVyZ2VJbj1Uci5tZXJnZUluLHJuLm1lcmdlRGVlcD1Uci5tZXJnZURlZXAscm4ubWVyZ2VEZWVwV2l0aD1Uci5tZXJnZURlZXBXaXRoLHJuLm1lcmdlRGVlcEluPVRyLm1lcmdlRGVlcEluLHJuLnNldEluPVRyLnNldEluLHJuLnVwZGF0ZT1Uci51cGRhdGUscm4udXBkYXRlSW49VHIudXBkYXRlSW4scm4ud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLHJuLmFzTXV0YWJsZT1Uci5hc011dGFibGUscm4uYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsdChZZSxrKSxZZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT9cIlJhbmdlIFtdXCI6XCJSYW5nZSBbIFwiK3RoaXMuX3N0YXJ0K1wiLi4uXCIrdGhpcy5fZW5kKyh0aGlzLl9zdGVwPjE/XCIgYnkgXCIrdGhpcy5fc3RlcDpcIlwiKStcIiBdXCJ9LFllLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fc3RhcnQrdSh0aGlzLHQpKnRoaXMuX3N0ZXA6ZX0sWWUucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3ZhciBlPSh0LXRoaXMuX3N0YXJ0KS90aGlzLl9zdGVwO3JldHVybiBlPj0wJiZ0aGlzLnNpemU+ZSYmZT09PU1hdGguZmxvb3IoZSl9LFllLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3JldHVybiBhKHQsZSx0aGlzLnNpemUpP3RoaXM6KHQ9aCh0LHRoaXMuc2l6ZSksZT1mKGUsdGhpcy5zaXplKSx0Pj1lP25ldyBZZSgwLDApOm5ldyBZZSh0aGlzLmdldCh0LHRoaXMuX2VuZCksdGhpcy5nZXQoZSx0aGlzLl9lbmQpLHRoaXMuX3N0ZXApKX0sWWUucHJvdG90eXBlLmluZGV4T2Y9ZnVuY3Rpb24odCl7dmFyIGU9dC10aGlzLl9zdGFydDtpZihlJXRoaXMuX3N0ZXA9PT0wKXt2YXIgcj1lL3RoaXMuX3N0ZXA7aWYocj49MCYmdGhpcy5zaXplPnIpcmV0dXJuIHJ9cmV0dXJuLTF9LFllLnByb3RvdHlwZS5sYXN0SW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5pbmRleE9mKHQpfSxZZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMuc2l6ZS0xLG49dGhpcy5fc3RlcCxpPWU/dGhpcy5fc3RhcnQrcipuOnRoaXMuX3N0YXJ0LG89MDtyPj1vO28rKyl7aWYodChpLG8sdGhpcyk9PT0hMSlyZXR1cm4gbysxO2krPWU/LW46bn1yZXR1cm4gb30sWWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLnNpemUtMSxuPXRoaXMuX3N0ZXAsaT1lP3RoaXMuX3N0YXJ0K3Iqbjp0aGlzLl9zdGFydCxvPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHU9aTtyZXR1cm4gaSs9ZT8tbjpuLG8+cj9JKCk6eih0LG8rKyx1KX0pfSxZZS5wcm90b3R5cGUuZXF1YWxzPWZ1bmN0aW9uKHQpe3JldHVybiB0IGluc3RhbmNlb2YgWWU/dGhpcy5fc3RhcnQ9PT10Ll9zdGFydCYmdGhpcy5fZW5kPT09dC5fZW5kJiZ0aGlzLl9zdGVwPT09dC5fc3RlcDpWZSh0aGlzLHQpO1xufTt2YXIgbm47dChRZSxrKSxRZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT9cIlJlcGVhdCBbXVwiOlwiUmVwZWF0IFsgXCIrdGhpcy5fdmFsdWUrXCIgXCIrdGhpcy5zaXplK1wiIHRpbWVzIF1cIn0sUWUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90aGlzLl92YWx1ZTplfSxRZS5wcm90b3R5cGUuaW5jbHVkZXM9ZnVuY3Rpb24odCl7cmV0dXJuIFgodGhpcy5fdmFsdWUsdCl9LFFlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuc2l6ZTtyZXR1cm4gYSh0LGUscik/dGhpczpuZXcgUWUodGhpcy5fdmFsdWUsZihlLHIpLWgodCxyKSl9LFFlLnByb3RvdHlwZS5yZXZlcnNlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LFFlLnByb3RvdHlwZS5pbmRleE9mPWZ1bmN0aW9uKHQpe3JldHVybiBYKHRoaXMuX3ZhbHVlLHQpPzA6LTF9LFFlLnByb3RvdHlwZS5sYXN0SW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gWCh0aGlzLl92YWx1ZSx0KT90aGlzLnNpemU6LTF9LFFlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCl7Zm9yKHZhciBlPTA7dGhpcy5zaXplPmU7ZSsrKWlmKHQodGhpcy5fdmFsdWUsZSx0aGlzKT09PSExKXJldHVybiBlKzE7cmV0dXJuIGV9LFFlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMscj0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybiBlLnNpemU+cj96KHQscisrLGUuX3ZhbHVlKTpJKCl9KX0sUWUucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbih0KXtyZXR1cm4gdCBpbnN0YW5jZW9mIFFlP1godGhpcy5fdmFsdWUsdC5fdmFsdWUpOlZlKHQpfTt2YXIgb247Xy5JdGVyYXRvcj1TLFhlKF8se3RvQXJyYXk6ZnVuY3Rpb24oKXtzdCh0aGlzLnNpemUpO3ZhciB0PUFycmF5KHRoaXMuc2l6ZXx8MCk7cmV0dXJuIHRoaXMudmFsdWVTZXEoKS5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxyKXt0W3JdPWV9KSx0fSx0b0luZGV4ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGh0KHRoaXMpfSx0b0pTOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQmJlwiZnVuY3Rpb25cIj09dHlwZW9mIHQudG9KUz90LnRvSlMoKTp0fSkuX190b0pTKCl9LHRvSlNPTjpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvU2VxKCkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnRvSlNPTj90LnRvSlNPTigpOnR9KS5fX3RvSlMoKX0sdG9LZXllZFNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgYXQodGhpcywhMCl9LHRvTWFwOmZ1bmN0aW9uKCl7cmV0dXJuIEx0KHRoaXMudG9LZXllZFNlcSgpKX0sdG9PYmplY3Q6ZnVuY3Rpb24oKXtzdCh0aGlzLnNpemUpO3ZhciB0PXt9O3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihlLHIpe3Rbcl09ZX0pLHR9LHRvT3JkZXJlZE1hcDpmdW5jdGlvbigpe3JldHVybiBJZSh0aGlzLnRvS2V5ZWRTZXEoKSl9LHRvT3JkZXJlZFNldDpmdW5jdGlvbigpe3JldHVybiBMZShkKHRoaXMpP3RoaXMudmFsdWVTZXEoKTp0aGlzKX0sdG9TZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gQWUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU2V0U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBmdCh0aGlzKX0sdG9TZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbSh0aGlzKT90aGlzLnRvSW5kZXhlZFNlcSgpOmQodGhpcyk/dGhpcy50b0tleWVkU2VxKCk6dGhpcy50b1NldFNlcSgpfSx0b1N0YWNrOmZ1bmN0aW9uKCl7cmV0dXJuIEVlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b0xpc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gZmUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU3RyaW5nOmZ1bmN0aW9uKCl7cmV0dXJuXCJbSXRlcmFibGVdXCJ9LF9fdG9TdHJpbmc6ZnVuY3Rpb24odCxlKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT90K2U6dCtcIiBcIit0aGlzLnRvU2VxKCkubWFwKHRoaXMuX190b1N0cmluZ01hcHBlcikuam9pbihcIiwgXCIpK1wiIFwiK2V9LGNvbmNhdDpmdW5jdGlvbigpe1xuICB2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtyZXR1cm4gT3QodGhpcyxTdCh0aGlzLHQpKX0saW5jbHVkZXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc29tZShmdW5jdGlvbihlKXtyZXR1cm4gWChlLHQpfSl9LGVudHJpZXM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKHdyKX0sZXZlcnk6ZnVuY3Rpb24odCxlKXtzdCh0aGlzLnNpemUpO3ZhciByPSEwO3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihuLGksbyl7cmV0dXJuIHQuY2FsbChlLG4saSxvKT92b2lkIDA6KHI9ITEsITEpfSkscn0sZmlsdGVyOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbHQodGhpcyx0LGUsITApKX0sZmluZDpmdW5jdGlvbih0LGUscil7dmFyIG49dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gbj9uWzFdOnJ9LGZpbmRFbnRyeTpmdW5jdGlvbih0LGUpe3ZhciByO3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihuLGksbyl7cmV0dXJuIHQuY2FsbChlLG4saSxvKT8ocj1baSxuXSwhMSk6dm9pZCAwfSkscn0sZmluZExhc3RFbnRyeTpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmZpbmRFbnRyeSh0LGUpfSxmb3JFYWNoOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHN0KHRoaXMuc2l6ZSksdGhpcy5fX2l0ZXJhdGUoZT90LmJpbmQoZSk6dCl9LGpvaW46ZnVuY3Rpb24odCl7c3QodGhpcy5zaXplKSx0PXZvaWQgMCE9PXQ/XCJcIit0OlwiLFwiO3ZhciBlPVwiXCIscj0hMDtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obil7cj9yPSExOmUrPXQsZSs9bnVsbCE9PW4mJnZvaWQgMCE9PW4/XCJcIituOlwiXCJ9KSxlfSxrZXlzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19pdGVyYXRvcihtcil9LG1hcDpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHB0KHRoaXMsdCxlKSl9LHJlZHVjZTpmdW5jdGlvbih0LGUscil7c3QodGhpcy5zaXplKTt2YXIgbixpO3JldHVybiBhcmd1bWVudHMubGVuZ3RoPDI/aT0hMDpuPWUsdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxvLHUpe2k/KGk9ITEsbj1lKTpuPXQuY2FsbChyLG4sZSxvLHUpfSksbn0scmVkdWNlUmlnaHQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCk7cmV0dXJuIHQucmVkdWNlLmFwcGx5KHQsYXJndW1lbnRzKX0scmV2ZXJzZTpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLHZ0KHRoaXMsITApKX0sc2xpY2U6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxtdCh0aGlzLHQsZSwhMCkpfSxzb21lOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIXRoaXMuZXZlcnkoWmUodCksZSl9LHNvcnQ6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMscXQodGhpcyx0KSl9LHZhbHVlczpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faXRlcmF0b3IoZ3IpfSxidXRMYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMCwtMSl9LGlzRW1wdHk6ZnVuY3Rpb24oKXtyZXR1cm4gdm9pZCAwIT09dGhpcy5zaXplPzA9PT10aGlzLnNpemU6IXRoaXMuc29tZShmdW5jdGlvbigpe3JldHVybiEwfSl9LGNvdW50OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIG8odD90aGlzLnRvU2VxKCkuZmlsdGVyKHQsZSk6dGhpcyl9LGNvdW50Qnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4geXQodGhpcyx0LGUpfSxlcXVhbHM6ZnVuY3Rpb24odCl7cmV0dXJuIFZlKHRoaXMsdCl9LGVudHJ5U2VxOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcztpZih0Ll9jYWNoZSlyZXR1cm4gbmV3IGoodC5fY2FjaGUpO3ZhciBlPXQudG9TZXEoKS5tYXAoR2UpLnRvSW5kZXhlZFNlcSgpO3JldHVybiBlLmZyb21FbnRyeVNlcT1mdW5jdGlvbigpe3JldHVybiB0LnRvU2VxKCl9LGV9LGZpbHRlck5vdDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmZpbHRlcihaZSh0KSxlKX0sZmluZExhc3Q6ZnVuY3Rpb24odCxlLHIpe3JldHVybiB0aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCkuZmluZCh0LGUscil9LGZpcnN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZmluZChzKX0sZmxhdE1hcDpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLEl0KHRoaXMsdCxlKSk7XG59LGZsYXR0ZW46ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsenQodGhpcyx0LCEwKSl9LGZyb21FbnRyeVNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgY3QodGhpcyl9LGdldDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmZpbmQoZnVuY3Rpb24oZSxyKXtyZXR1cm4gWChyLHQpfSx2b2lkIDAsZSl9LGdldEluOmZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByLG49dGhpcyxpPUt0KHQpOyEocj1pLm5leHQoKSkuZG9uZTspe3ZhciBvPXIudmFsdWU7aWYobj1uJiZuLmdldD9uLmdldChvLGNyKTpjcixuPT09Y3IpcmV0dXJuIGV9cmV0dXJuIG59LGdyb3VwQnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gZHQodGhpcyx0LGUpfSxoYXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZ2V0KHQsY3IpIT09Y3J9LGhhc0luOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmdldEluKHQsY3IpIT09Y3J9LGlzU3Vic2V0OmZ1bmN0aW9uKHQpe3JldHVybiB0PVwiZnVuY3Rpb25cIj09dHlwZW9mIHQuaW5jbHVkZXM/dDpfKHQpLHRoaXMuZXZlcnkoZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9KX0saXNTdXBlcnNldDpmdW5jdGlvbih0KXtyZXR1cm4gdD1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmlzU3Vic2V0P3Q6Xyh0KSx0LmlzU3Vic2V0KHRoaXMpfSxrZXlTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLm1hcChGZSkudG9JbmRleGVkU2VxKCl9LGxhc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maXJzdCgpfSxtYXg6ZnVuY3Rpb24odCl7cmV0dXJuIER0KHRoaXMsdCl9LG1heEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIER0KHRoaXMsZSx0KX0sbWluOmZ1bmN0aW9uKHQpe3JldHVybiBEdCh0aGlzLHQ/JGUodCk6cnIpfSxtaW5CeTpmdW5jdGlvbih0LGUpe3JldHVybiBEdCh0aGlzLGU/JGUoZSk6cnIsdCl9LHJlc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zbGljZSgxKX0sc2tpcDpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5zbGljZShNYXRoLm1heCgwLHQpKX0sc2tpcExhc3Q6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLnJldmVyc2UoKS5za2lwKHQpLnJldmVyc2UoKSl9LHNraXBXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHd0KHRoaXMsdCxlLCEwKSl9LHNraXBVbnRpbDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnNraXBXaGlsZShaZSh0KSxlKX0sc29ydEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMscXQodGhpcyxlLHQpKX0sdGFrZTpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5zbGljZSgwLE1hdGgubWF4KDAsdCkpfSx0YWtlTGFzdDpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyx0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLnRha2UodCkucmV2ZXJzZSgpKX0sdGFrZVdoaWxlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsZ3QodGhpcyx0LGUpKX0sdGFrZVVudGlsOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudGFrZVdoaWxlKFplKHQpLGUpfSx2YWx1ZVNlcTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvSW5kZXhlZFNlcSgpfSxoYXNoQ29kZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faGFzaHx8KHRoaXMuX19oYXNoPW5yKHRoaXMpKX19KTt2YXIgdW49Xy5wcm90b3R5cGU7dW5bdnJdPSEwLHVuW0lyXT11bi52YWx1ZXMsdW4uX190b0pTPXVuLnRvQXJyYXksdW4uX190b1N0cmluZ01hcHBlcj10cix1bi5pbnNwZWN0PXVuLnRvU291cmNlPWZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzfSx1bi5jaGFpbj11bi5mbGF0TWFwLHVuLmNvbnRhaW5zPXVuLmluY2x1ZGVzLGZ1bmN0aW9uKCl7dHJ5e09iamVjdC5kZWZpbmVQcm9wZXJ0eSh1bixcImxlbmd0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtpZighXy5ub0xlbmd0aFdhcm5pbmcpe3ZhciB0O3RyeXt0aHJvdyBFcnJvcigpfWNhdGNoKGUpe3Q9ZS5zdGFja31pZigtMT09PXQuaW5kZXhPZihcIl93cmFwT2JqZWN0XCIpKXJldHVybiBjb25zb2xlJiZjb25zb2xlLndhcm4mJmNvbnNvbGUud2FybihcIml0ZXJhYmxlLmxlbmd0aCBoYXMgYmVlbiBkZXByZWNhdGVkLCB1c2UgaXRlcmFibGUuc2l6ZSBvciBpdGVyYWJsZS5jb3VudCgpLiBUaGlzIHdhcm5pbmcgd2lsbCBiZWNvbWUgYSBzaWxlbnQgZXJyb3IgaW4gYSBmdXR1cmUgdmVyc2lvbi4gXCIrdCksXG4gIHRoaXMuc2l6ZX19fSl9Y2F0Y2godCl7fX0oKSxYZShwLHtmbGlwOmZ1bmN0aW9uKCl7cmV0dXJuIE90KHRoaXMsX3QodGhpcykpfSxmaW5kS2V5OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gciYmclswXX0sZmluZExhc3RLZXk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maW5kS2V5KHQsZSl9LGtleU9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmZpbmRLZXkoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxsYXN0S2V5T2Y6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZmluZExhc3RLZXkoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxtYXBFbnRyaWVzOmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLm1hcChmdW5jdGlvbihpLG8pe3JldHVybiB0LmNhbGwoZSxbbyxpXSxuKysscil9KS5mcm9tRW50cnlTZXEoKSl9LG1hcEtleXM6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5mbGlwKCkubWFwKGZ1bmN0aW9uKG4saSl7cmV0dXJuIHQuY2FsbChlLG4saSxyKX0pLmZsaXAoKSl9fSk7dmFyIHNuPXAucHJvdG90eXBlO3NuW2xyXT0hMCxzbltJcl09dW4uZW50cmllcyxzbi5fX3RvSlM9dW4udG9PYmplY3Qsc24uX190b1N0cmluZ01hcHBlcj1mdW5jdGlvbih0LGUpe3JldHVybiBKU09OLnN0cmluZ2lmeShlKStcIjogXCIrdHIodCl9LFhlKHYse3RvS2V5ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGF0KHRoaXMsITEpfSxmaWx0ZXI6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxsdCh0aGlzLHQsZSwhMSkpfSxmaW5kSW5kZXg6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLmZpbmRFbnRyeSh0LGUpO3JldHVybiByP3JbMF06LTF9LGluZGV4T2Y6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy50b0tleWVkU2VxKCkua2V5T2YodCk7cmV0dXJuIHZvaWQgMD09PWU/LTE6ZX0sbGFzdEluZGV4T2Y6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuaW5kZXhPZih0KX0scmV2ZXJzZTpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLHZ0KHRoaXMsITEpKX0sc2xpY2U6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxtdCh0aGlzLHQsZSwhMSkpfSxzcGxpY2U6ZnVuY3Rpb24odCxlKXt2YXIgcj1hcmd1bWVudHMubGVuZ3RoO2lmKGU9TWF0aC5tYXgoMHxlLDApLDA9PT1yfHwyPT09ciYmIWUpcmV0dXJuIHRoaXM7dD1oKHQsMD50P3RoaXMuY291bnQoKTp0aGlzLnNpemUpO3ZhciBuPXRoaXMuc2xpY2UoMCx0KTtyZXR1cm4gT3QodGhpcywxPT09cj9uOm4uY29uY2F0KGkoYXJndW1lbnRzLDIpLHRoaXMuc2xpY2UodCtlKSkpfSxmaW5kTGFzdEluZGV4OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy50b0tleWVkU2VxKCkuZmluZExhc3RLZXkodCxlKTtyZXR1cm4gdm9pZCAwPT09cj8tMTpyfSxmaXJzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldCgwKX0sZmxhdHRlbjpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyx6dCh0aGlzLHQsITEpKX0sZ2V0OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHQ9dSh0aGlzLHQpLDA+dHx8dGhpcy5zaXplPT09MS8wfHx2b2lkIDAhPT10aGlzLnNpemUmJnQ+dGhpcy5zaXplP2U6dGhpcy5maW5kKGZ1bmN0aW9uKGUscil7cmV0dXJuIHI9PT10fSx2b2lkIDAsZSl9LGhhczpmdW5jdGlvbih0KXtyZXR1cm4gdD11KHRoaXMsdCksdD49MCYmKHZvaWQgMCE9PXRoaXMuc2l6ZT90aGlzLnNpemU9PT0xLzB8fHRoaXMuc2l6ZT50Oi0xIT09dGhpcy5pbmRleE9mKHQpKX0saW50ZXJwb3NlOmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLGJ0KHRoaXMsdCkpfSxpbnRlcmxlYXZlOmZ1bmN0aW9uKCl7dmFyIHQ9W3RoaXNdLmNvbmNhdChpKGFyZ3VtZW50cykpLGU9RXQodGhpcy50b1NlcSgpLGsub2YsdCkscj1lLmZsYXR0ZW4oITApO3JldHVybiBlLnNpemUmJihyLnNpemU9ZS5zaXplKnQubGVuZ3RoKSxPdCh0aGlzLHIpfSxsYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0KC0xKTtcbn0sc2tpcFdoaWxlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsd3QodGhpcyx0LGUsITEpKX0semlwOmZ1bmN0aW9uKCl7dmFyIHQ9W3RoaXNdLmNvbmNhdChpKGFyZ3VtZW50cykpO3JldHVybiBPdCh0aGlzLEV0KHRoaXMsZXIsdCkpfSx6aXBXaXRoOmZ1bmN0aW9uKHQpe3ZhciBlPWkoYXJndW1lbnRzKTtyZXR1cm4gZVswXT10aGlzLE90KHRoaXMsRXQodGhpcyx0LGUpKX19KSx2LnByb3RvdHlwZVt5cl09ITAsdi5wcm90b3R5cGVbZHJdPSEwLFhlKGwse2dldDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90OmV9LGluY2x1ZGVzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmhhcyh0KX0sa2V5U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWVTZXEoKX19KSxsLnByb3RvdHlwZS5oYXM9dW4uaW5jbHVkZXMsWGUoeCxwLnByb3RvdHlwZSksWGUoayx2LnByb3RvdHlwZSksWGUoQSxsLnByb3RvdHlwZSksWGUoVixwLnByb3RvdHlwZSksWGUoWSx2LnByb3RvdHlwZSksWGUoUSxsLnByb3RvdHlwZSk7dmFyIGFuPXtJdGVyYWJsZTpfLFNlcTpPLENvbGxlY3Rpb246SCxNYXA6THQsT3JkZXJlZE1hcDpJZSxMaXN0OmZlLFN0YWNrOkVlLFNldDpBZSxPcmRlcmVkU2V0OkxlLFJlY29yZDpDZSxSYW5nZTpZZSxSZXBlYXQ6UWUsaXM6WCxmcm9tSlM6Rn07cmV0dXJuIGFufSk7Il19
