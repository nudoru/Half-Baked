(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
  store: require('./store/AppStore.js'),
  view: require('./view/AppView.js'),
  socket: require('../nori/service/SocketIO.js'),

  /**
   * Intialize the appilcation, view and store
   */
  initialize: function initialize() {
    this.socket.initialize();

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
        console.log("join room");
        return;
      case this.socket.events().LEAVE_ROOM:
        console.log("leave room");
        return;
      default:
        console.warn("Unhandled SocketIO message type", payload);
        return;
    }
  }

});

module.exports = App;

},{"../nori/service/SocketIO.js":13,"../nori/utils/Rx.js":23,"./store/AppStore.js":2,"./view/AppView.js":3}],2:[function(require,module,exports){
var _noriActionConstants = require('../../nori/action/ActionConstants.js'),
    _mixinMapFactory = require('../../nori/store/MixinMapFactory.js'),
    _mixinObservableSubject = require('../../nori/utils/MixinObservableSubject.js'),
    _mixinReducerStore = require('../../nori/store/MixinReducerStore.js');

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

  mixins: [_mixinMapFactory, _mixinReducerStore, _mixinObservableSubject()],

  gameStates: ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],

  initialize: function initialize() {
    this.addReducer(this.defaultReducerFunction);
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
      localPlayer: {},
      remotePlayer: {},
      questionBank: []
    });

    this.notifySubscribersOf('storeInitialized');
  },

  createUserObject: function createUserObject(id, type, name, appearance, behaviors) {
    return {
      id: id,
      type: type,
      name: name,
      health: health || 6,
      appearance: appearance,
      behaviors: behaviors || []
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
  defaultReducerFunction: function defaultReducerFunction(state, event) {
    state = state || {};

    switch (event.type) {

      case _noriActionConstants.CHANGE_STORE_STATE:
        return _.assign({}, state, event.payload.data);

      default:
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

},{"../../nori/action/ActionConstants.js":11,"../../nori/store/MixinMapFactory.js":16,"../../nori/store/MixinReducerStore.js":17,"../../nori/utils/MixinObservableSubject.js":20}],3:[function(require,module,exports){
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

},{"../../nori/utils/MixinObservableSubject.js":20,"../../nori/view/ApplicationView.js":25,"../../nori/view/MixinComponentViews.js":26,"../../nori/view/MixinEventDelegator.js":27,"../../nori/view/MixinNudoruControls.js":28,"../../nori/view/MixinStoreStateViews.js":29,"../store/AppStore.js":2,"./Screen.GameOver.js":4,"./Screen.MainGame.js":5,"./Screen.PlayerSelect.js":6,"./Screen.Title.js":7,"./Screen.WaitingOnPlayer.js":8}],4:[function(require,module,exports){
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
    return _appStore.getState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    var nextState = _appStore.getState();
    nextState.greeting += ' (updated)';
    return nextState;
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

},{"../../nori/action/ActionCreator":12,"../store/AppStore":2,"./AppView":3}],5:[function(require,module,exports){
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
    return _appStore.getState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    var nextState = _appStore.getState();
    nextState.greeting += ' (updated)';
    return nextState;
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

},{"../../nori/action/ActionCreator":12,"../store/AppStore":2,"./AppView":3}],6:[function(require,module,exports){
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
      'click #select__button-joinroom': this.onJoinRoom.bind(this),
      'click #select__button-createroom': this.onCreateRoom.bind(this),
      'click #select__button-go': function clickSelect__buttonGo() {
        _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[2] }));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    return _appStore.getState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    var nextState = _appStore.getState();
    nextState.greeting += ' (updated)';
    return nextState;
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount: function componentDidMount() {},

  onJoinRoom: function onJoinRoom() {
    var roomID = document.querySelector('#select__roomid').value;
    console.log('Join room ' + roomID);
    if (this.validateRoomID(roomID)) {
      console.log('Room ID OK');
      _appView.notify('', 'Room ID ok!');
    } else {
      _appView.alert('Bad Room ID', 'The room ID is not correct. Must be a 5 digit number.');
    }
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
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator":12,"../store/AppStore":2,"./AppView":3}],7:[function(require,module,exports){
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
    return _appStore.getState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    var nextState = _appStore.getState();
    nextState.greeting += ' (updated)';
    return nextState;
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

},{"../../nori/action/ActionCreator":12,"../store/AppStore":2,"./AppView":3}],8:[function(require,module,exports){
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
    return _appStore.getState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    var nextState = _appStore.getState();
    nextState.greeting += ' (updated)';
    return nextState;
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

},{"../../nori/action/ActionCreator":12,"../store/AppStore":2,"./AppView":3}],9:[function(require,module,exports){
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

},{"./app/App.js":1,"./nori/Nori.js":10,"./nudoru/browser/BrowserInfo.js":31}],10:[function(require,module,exports){
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

},{"./utils/Dispatcher.js":19,"./utils/Router.js":22}],11:[function(require,module,exports){
module.exports = {
  CHANGE_STORE_STATE: 'CHANGE_STORE_STATE'
};

},{}],12:[function(require,module,exports){
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

},{"./ActionConstants.js":11}],13:[function(require,module,exports){
var SocketIOConnector = function SocketIOConnector() {

  var _subject = new Rx.BehaviorSubject(),
      _socketIO = io(),
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
    LEAVE_ROOM: 'leave_room'
  };

  function initialize() {
    _socketIO.on(_events.NOTIFY_CLIENT, onNotifyClient);
  }

  /**
   * All notifications from Socket.io come here
   * @param payload {type, id, time, payload}
   */
  function onNotifyClient(payload) {
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

},{}],14:[function(require,module,exports){
/**
 * Map data type
 */

var Map = function Map() {
  var _this,
      _id,
      _parentCollection,
      _dirty = false,
      _entries = [],
      _map = Object.create(null);

  //----------------------------------------------------------------------------
  //  Initialization
  //----------------------------------------------------------------------------

  function initialize(initObj) {
    if (!initObj.id) {
      throw new Error('Store must be init\'d with an id');
    }

    _this = this;
    _id = initObj.id;

    if (initObj.store) {
      _dirty = true;
      _map = initObj.store;
    } else if (initObj.json) {
      setJSON(initObj.json);
    }
  }

  /**
   * Set map store from a JSON object
   * @param jstr
   */
  function setJSON(jstr) {
    _dirty = true;
    try {
      _map = JSON.parse(jstr);
    } catch (e) {
      throw new Error('MapCollection, error parsing JSON:', jstr, e);
    }
  }

  function getID() {
    return _id;
  }

  /**
   * Erase it
   */
  function clear() {
    _map = {};
    _dirty = true;
  }

  function isDirty() {
    return _dirty;
  }

  function markClean() {
    _dirty = false;
  }

  /**
   * Set property or merge in new data
   * @param key String = name of property to set, Object = will merge new props
   * @param value String = value of property to set
   */
  function set(key, value) {

    if (typeof key === 'object') {
      _map = _.merge({}, _map, key);
    } else {
      _map[key] = value;
    }

    // Mark changed
    _dirty = true;

    dispatchChange('set_key');
  }

  /**
   * Assuming that _map[key] is an object, this will set a property on it
   * @param key
   * @param prop
   * @param data
   */
  function setKeyProp(key, prop, data) {
    _map[key][prop] = data;

    _dirty = true;
    dispatchChange('set_key');
  }

  /**
   * Returns a copy of the data
   * @returns *
   */
  function get(key) {
    var value = has(key) ? _map[key] : undefined;

    if (value) {
      value = _.cloneDeep(value);
    }

    return value;
  }

  /**
   * Assuming that _map[key] is an object, this will get value
   * @param key
   * @param prop
   * @returns {*}
   */
  function getKeyProp(key, prop) {
    var valueObj = has(key) ? _map[key] : undefined,
        value = null;

    if (valueObj) {
      value = _.cloneDeep(valueObj[prop]);
    }

    return value;
  }

  /**
   * Returns true of the key is present in the map
   * @param key
   * @returns {boolean}
   */
  function has(key) {
    return _map.hasOwnProperty(key);
  }

  /**
   * Returns an array of the key/values. Results are cached and only regenerated
   * if changed (set)
   * @returns {Array}
   */
  function entries() {
    if (!_dirty && _entries) {
      return _entries;
    }

    var arry = [];
    for (var key in _map) {
      arry.push({ key: key, value: _map[key] });
    }

    _entries = arry;
    _dirty = false;

    return arry;
  }

  /**
   * Number of entries
   * @returns {Number}
   */
  function size() {
    return keys().length;
  }

  /**
   * Returns an array of all keys in the map
   * @returns {Array}
   */
  function keys() {
    return Object.keys(_map);
  }

  /**
   * Returns an array of all vaules in the map
   * @returns {Array}
   */
  function values() {
    return entries().map(function (entry) {
      return entry.value;
    });
  }

  /**
   * Remove a value
   * @param key
   */
  function remove(key) {
    delete _map[key];
  }

  /**
   * Returns matches to the predicate function
   * @param predicate
   * @returns {Array.<T>}
   */
  function filterValues(predicate) {
    return values().filter(predicate);
  }

  function first() {
    return entries()[0];
  }

  function last() {
    var e = entries();
    return e[e.length - 1];
  }

  function getAtIndex(i) {
    return entries()[i];
  }

  /**
   * Returns a copy of the data map
   * @returns {void|*}
   */
  function toObject() {
    return _.merge({}, _map);
  }

  /**
   * Return a new object by "translating" the properties of the map from one key to another
   * @param tObj {currentProp, newProp}
   */
  function transform(tObj) {
    var transformed = Object.create(null);

    for (var prop in tObj) {
      if (_map.hasOwnProperty(prop)) {
        transformed[tObj[prop]] = _map[prop];
      }
    }

    return transformed;
  }

  /**
   * On change, emit event globally
   */
  function dispatchChange(type) {
    var payload = {
      id: _id,
      mapType: 'store'
    };

    _this.notifySubscribers(payload);

    if (_parentCollection.dispatchChange) {
      _parentCollection.dispatchChange({
        id: _id
      }, type || 'map');
    }
  }

  function toJSON() {
    return JSON.stringify(_map);
  }

  function setParentCollection(collection) {
    _parentCollection = collection;
  }

  function getParentCollection() {
    return _parentCollection;
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    initialize: initialize,
    getID: getID,
    clear: clear,
    isDirty: isDirty,
    markClean: markClean,
    setJSON: setJSON,
    set: set,
    setKeyProp: setKeyProp,
    get: get,
    getKeyProp: getKeyProp,
    has: has,
    remove: remove,
    keys: keys,
    values: values,
    entries: entries,
    filterValues: filterValues,
    size: size,
    first: first,
    last: last,
    getAtIndex: getAtIndex,
    toObject: toObject,
    transform: transform,
    toJSON: toJSON,
    setParentCollection: setParentCollection,
    getParentCollection: getParentCollection
  };
};

module.exports = Map;

},{}],15:[function(require,module,exports){
/**
 * Map Collection - an array of maps
 */
var MapCollection = function MapCollection() {
  var _this,
      _id,
      _parentCollection,
      _caret = 0,
      _children = [];

  //----------------------------------------------------------------------------
  //  Initialization
  //----------------------------------------------------------------------------

  function initialize(initObj) {
    if (!initObj.id) {
      throw new Error('StoreCollection must be init\'d with an id');
    }

    _this = this;
    _id = initObj.id;

    // TODO test
    if (initObj.stores) {
      addMapsFromArray.call(_this, initObj.stores);
    }
  }

  //----------------------------------------------------------------------------
  //  Iterator
  //----------------------------------------------------------------------------

  function next() {
    var ret = {};
    if (hasNext()) {
      ret = { value: _children[_caret++], done: !hasNext() };
    } else {
      ret = current();
    }

    return ret;
  }

  function current() {
    return { value: _children[_caret], done: !hasNext() };
  }

  function rewind() {
    _caret = 0;
    return _children[_caret];
  }

  function hasNext() {
    return _caret < _children.length;
  }

  //----------------------------------------------------------------------------
  //  Impl
  //----------------------------------------------------------------------------

  function isDirty() {
    var dirty = false;
    forEach(function checkDirty(map) {
      if (map.isDirty()) {
        dirty = true;
      }
    });
    return dirty;
  }

  function markClean() {
    forEach(function checkDirty(map) {
      map.markClean();
    });
  }

  /**
   * Add an array of Store instances
   * @param sArry
   */
  function addMapsFromArray(sArry) {
    sArry.forEach(function (store) {
      add(store);
    });
  }

  /**
   * Create an add child Store stores from an array of objects
   * @param array Array of objects
   * @param idKey Key on each object to use for the ID of that Store store
   */
  function addFromObjArray(oArry, idKey) {
    console.warn('MapCollection, addFromObjArry, need to be fixed to remove reference to Nori.store()');
    oArry.forEach(function (obj) {

      var id;

      if (obj.hasOwnProperty(idKey)) {
        id = obj[idKey];
      } else {
        id = _id + 'child' + _children.length;
      }

      //add(Nori.store().createMap({id: id, store: obj}));
    });
    dispatchChange(_id, 'add_map');
  }

  function addFromJSONArray(json, idKey) {
    console.warn('MapCollection, addFromJSONArry, need to be fixed to remove reference to Nori.store()');
    json.forEach(function (jstr) {

      var id, obj;

      try {
        obj = JSON.parse(jstr);
      } catch (e) {
        throw new Error('MapCollection, error parsing JSON:', jstr, e);
      }

      if (obj.hasOwnProperty(idKey)) {
        id = obj[idKey];
      } else {
        id = _id + 'child' + _children.length;
      }

      //add(Nori.store().createMap({id: id, store: obj}));
    });
    dispatchChange(_id, 'add_map');
  }

  function getID() {
    return _id;
  }

  function add(store) {
    var currIdx = getMapIndex(store.getID());

    store.setParentCollection(_this);

    if (currIdx >= 0) {
      _children[currIdx] = store;
    } else {
      _children.push(store);
    }

    dispatchChange(_id, 'add_map');
  }

  /**
   * Remove a store from the collection
   * @param storeID
   */
  function remove(storeID) {
    var currIdx = getMapIndex(storeID);
    if (currIdx >= 0) {
      _children[currIdx].setParentCollection(null);
      _children[currIdx] = null;
      _children.splice(currIdx, 1);
      dispatchChange(_id, 'remove_map');
    } else {
      console.log(_id + ' remove, store not in collection: ' + storeID);
    }
  }

  /**
   * Remove all stores from the array
   */
  function removeAll() {
    _children.forEach(function (map) {
      map.setParentCollection(null);
    });

    _children = [];
    dispatchChange(_id, 'remove_map');
  }

  /**
   * Gets the Store by ID
   * @param storeID
   * @returns {T}
   */
  function getMap(storeID) {
    return _children.filter(function (store) {
      return store.getID() === storeID;
    })[0];
  }

  /**
   * Get the index in _children array by Store's ID
   * @param storeID
   * @returns {number}
   */
  function getMapIndex(storeID) {
    return _children.map(function (store) {
      return store.getID();
    }).indexOf(storeID);
  }

  /**
   * On change, emit event globally
   */
  function dispatchChange(data, type) {
    var payload = {
      id: _id,
      type: type || '',
      mapType: 'collection',
      mapID: data.id
    };

    _this.notifySubscribers(payload);

    if (_parentCollection) {
      _parentCollection.dispatchChange({ id: _id, store: getMap() });
    }
  }

  function hasMap(storeID) {
    return _children[storeID];
  }

  /**
   * Number of entries
   * @returns {Number}
   */
  function size() {
    return _children.length;
  }

  function first() {
    return _children[0];
  }

  function last() {
    return _children[_children.length - 1];
  }

  function atIndex(i) {
    return _children[i];
  }

  /**
   * Runs a predidate on each child map
   * @param predicate
   * @returns {Array.<T>}
   */
  function filter(predicate) {
    return _children.filter(predicate);
  }

  /**
   * Returns maps where the filter matches the prop / value pair
   * @param key
   * @param value
   * @returns {Array.<T>}
   */
  function filterByKey(key, value) {
    return _children.filter(function (map) {
      return map.get(key) === value;
    });
  }

  function forEach(func) {
    return _children.forEach(func);
  }

  function map(func) {
    return _children.map(func);
  }

  /**
   * Return an array of entries of each map
   * @returns {Array}
   */
  function entries() {
    var arry = [];
    _children.forEach(function (map) {
      arry.push(map.entries());
    });
    return arry;
  }

  function toJSON() {
    return JSON.stringify(_children);
  }

  function setParentCollection(collection) {
    _parentCollection = collection;
  }

  function getParentCollection() {
    return _parentCollection;
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    initialize: initialize,
    current: current,
    next: next,
    hasNext: hasNext,
    rewind: rewind,
    getID: getID,
    isDirty: isDirty,
    markClean: markClean,
    add: add,
    addMapsFromArray: addMapsFromArray,
    addFromObjArray: addFromObjArray,
    addFromJSONArray: addFromJSONArray,
    remove: remove,
    removeAll: removeAll,
    getMap: getMap,
    hasMap: hasMap,
    size: size,
    first: first,
    last: last,
    atIndex: atIndex,
    filter: filter,
    filterByKey: filterByKey,
    forEach: forEach,
    map: map,
    entries: entries,
    toJSON: toJSON,
    dispatchChange: dispatchChange,
    setParentCollection: setParentCollection,
    getParentCollection: getParentCollection
  };
};

module.exports = MapCollection;

},{}],16:[function(require,module,exports){
var MixinMapFactory = function MixinMapFactory() {

  var _mapCollectionList = Object.create(null),
      _mapList = Object.create(null),
      _mapCollectionFactory = require('./MapCollection.js'),
      _mapFactory = require('./Map.js'),
      _observableFactory = require('../utils/MixinObservableSubject.js');

  /**
   * Create a new store collection and initalize
   * @param initObj
   * @param extras
   * @returns {*}
   */
  function createMapCollection(initObj, extras) {
    var m = Nori.assignArray({}, [_mapCollectionFactory(), _observableFactory(), extras]);
    m.initialize(initObj);
    return m;
  }

  /**
   * Create a new store and initialize
   * @param initObj
   * @param extras
   * @returns {*}
   */
  function createMap(initObj, extras) {
    var m = Nori.assignArray({}, [_mapFactory(), _observableFactory(), extras]);
    m.initialize(initObj);
    return m;
  }

  /**
   * Get a store from the application collection
   * @param storeID
   * @returns {void|*}
   */
  function getMap(storeID) {
    return _mapList[storeID];
  }

  /**
   * Get a store collection from the application collection
   * @param storeID
   * @returns {void|*}
   */
  function getMapCollection(storeID) {
    return _mapCollectionList[storeID];
  }

  return {
    createMapCollection: createMapCollection,
    createMap: createMap,
    getMap: getMap,
    getMapCollection: getMapCollection
  };
};

module.exports = MixinMapFactory();

},{"../utils/MixinObservableSubject.js":20,"./Map.js":14,"./MapCollection.js":15}],17:[function(require,module,exports){
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
            // return _.assign({}, state, otherStateTransformer(state));
            return _.assign({}, state, {prop: event.payload.value});
          default:
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

},{"./SimpleStore.js":18}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{"../../nudoru/core/ObjectUtils.js":39}],23:[function(require,module,exports){
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

  doEvery: function doEvery(ms, handler) {
    return this.interval(ms).subscribe(handler);
  },

  just: function just(value) {
    return Rx.Observable.just(value);
  },

  empty: function empty() {
    return Rx.Observable.empty();
  }

};

},{}],24:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":32}],26:[function(require,module,exports){
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

},{"../store/SimpleStore.js":18,"../utils/MixinObservableSubject.js":20,"../utils/Templating.js":24,"./MixinEventDelegator.js":27,"./ViewComponent.js":30}],27:[function(require,module,exports){
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

},{"../utils/Rx":23}],28:[function(require,module,exports){
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

},{"../utils/Renderer":21}],31:[function(require,module,exports){
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
      _notDismissable,
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
    if (_notDismissable) return;
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

    _notDismissable = false;

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

    _notDismissable = true;

    showModalCover(shouldAnimate);
    TweenLite.to(_modalCloseButtonEl, 0, { autoAlpha: 0 });
  }

  function hide(shouldAnimate) {
    if (!_isVisible) {
      return;
    }
    _isVisible = false;
    _notDismissable = false;
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
      if (prop === undefined || obj[prop] === undefined) isnull = true;
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

},{}]},{},[9])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvc3RvcmUvQXBwU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvQXBwVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uR2FtZU92ZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLk1haW5HYW1lLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5QbGF5ZXJTZWxlY3QuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLlRpdGxlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5XYWl0aW5nT25QbGF5ZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbWFpbi5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL05vcmkuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvTWFwLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvTWFwQ29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3N0b3JlL01peGluTWFwRmFjdG9yeS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3N0b3JlL01peGluUmVkdWNlclN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvU2ltcGxlU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1JlbmRlcmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUm91dGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUnguanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRXZlbnREZWxlZ2F0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluTnVkb3J1Q29udHJvbHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9WaWV3Q29tcG9uZW50LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveENyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvVG9hc3RWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Ozs7Ozs7QUFPekMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDOztBQUUvQixRQUFNLEVBQUUsRUFBRTs7Ozs7QUFLVixPQUFLLEVBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDO0FBQ3RDLE1BQUksRUFBSSxPQUFPLENBQUMsbUJBQW1CLENBQUM7QUFDcEMsUUFBTSxFQUFFLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQzs7Ozs7QUFLOUMsWUFBVSxFQUFFLHNCQUFZO0FBQ3RCLFFBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7O0FBRXpCLFFBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7O0FBRXZCLFFBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDeEIsUUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzdFLFFBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7R0FDeEI7Ozs7O0FBS0Qsb0JBQWtCLEVBQUUsOEJBQVk7QUFDOUIsUUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0dBQ3ZCOzs7OztBQUtELGdCQUFjLEVBQUUsMEJBQVk7QUFDMUIsUUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0FBQ2pDLFFBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7OztBQUduQixRQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFDLFlBQVksRUFBRSxlQUFlLEVBQUMsQ0FBQyxDQUFDOzs7Ozs7OztHQVF0RDs7Ozs7O0FBTUQscUJBQW1CLEVBQUUsNkJBQVUsT0FBTyxFQUFFO0FBQ3RDLFFBQUksQ0FBQyxPQUFPLEVBQUU7QUFDWixhQUFPO0tBQ1I7O0FBRUQsV0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsQ0FBQzs7QUFFOUMsWUFBUSxPQUFPLENBQUMsSUFBSTtBQUNsQixXQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTztBQUNoQyxlQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzFCLFlBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO0FBQzlDLGVBQU87QUFBQSxBQUNULFdBQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxjQUFjO0FBQ3ZDLGVBQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN4QyxlQUFPO0FBQUEsQUFDVCxXQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsaUJBQWlCO0FBQzFDLGVBQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUMzQyxlQUFPO0FBQUEsQUFDVCxXQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTztBQUNoQyxlQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNsRCxlQUFPO0FBQUEsQUFDVCxXQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsY0FBYztBQUN2QyxlQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQyxlQUFPO0FBQUEsQUFDVCxXQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsV0FBVztBQUNwQyxlQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzNCLGVBQU87QUFBQSxBQUNULFdBQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxTQUFTO0FBQ2xDLGVBQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDekIsZUFBTztBQUFBLEFBQ1QsV0FBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVU7QUFDbkMsZUFBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUMxQixlQUFPO0FBQUEsQUFDVDtBQUNFLGVBQU8sQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDekQsZUFBTztBQUFBLEtBQ1Y7R0FDRjs7Q0FFRixDQUFDLENBQUM7O0FBRUgsTUFBTSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUM7OztBQ3JHckIsSUFBSSxvQkFBb0IsR0FBTSxPQUFPLENBQUMsc0NBQXNDLENBQUM7SUFDekUsZ0JBQWdCLEdBQVUsT0FBTyxDQUFDLHFDQUFxQyxDQUFDO0lBQ3hFLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyw0Q0FBNEMsQ0FBQztJQUMvRSxrQkFBa0IsR0FBUSxPQUFPLENBQUMsdUNBQXVDLENBQUMsQ0FBQzs7Ozs7Ozs7Ozs7O0FBWS9FLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7O0FBRTlCLFFBQU0sRUFBRSxDQUNOLGdCQUFnQixFQUNoQixrQkFBa0IsRUFDbEIsdUJBQXVCLEVBQUUsQ0FDMUI7O0FBRUQsWUFBVSxFQUFFLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDOztBQUVyRixZQUFVLEVBQUUsc0JBQVk7QUFDdEIsUUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUM3QyxRQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztBQUM5QixRQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzdCLFFBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQztHQUN4Qzs7Ozs7QUFLRCxXQUFTLEVBQUUscUJBQVk7QUFDckIsUUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNaLGtCQUFZLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDaEMsaUJBQVcsRUFBRyxFQUFFO0FBQ2hCLGtCQUFZLEVBQUUsRUFBRTtBQUNoQixrQkFBWSxFQUFFLEVBQUU7S0FDakIsQ0FBQyxDQUFDOztBQUVILFFBQUksQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0dBQzlDOztBQUVELGtCQUFnQixFQUFFLDBCQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUU7QUFDakUsV0FBTztBQUNMLFFBQUUsRUFBVSxFQUFFO0FBQ2QsVUFBSSxFQUFRLElBQUk7QUFDaEIsVUFBSSxFQUFRLElBQUk7QUFDaEIsWUFBTSxFQUFNLE1BQU0sSUFBSSxDQUFDO0FBQ3ZCLGdCQUFVLEVBQUUsVUFBVTtBQUN0QixlQUFTLEVBQUcsU0FBUyxJQUFJLEVBQUU7S0FDNUIsQ0FBQztHQUNIOztBQUVELHNCQUFvQixFQUFFLDhCQUFVLE1BQU0sRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFO0FBQy9ELFdBQU87QUFDTCxZQUFNLEVBQU8sTUFBTTtBQUNuQixpQkFBVyxFQUFFLFdBQVc7QUFDeEIsZ0JBQVUsRUFBRyxVQUFVO0tBQ3hCLENBQUM7R0FDSDs7Ozs7Ozs7Ozs7QUFXRCx3QkFBc0IsRUFBRSxnQ0FBVSxLQUFLLEVBQUUsS0FBSyxFQUFFO0FBQzlDLFNBQUssR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDOztBQUVwQixZQUFRLEtBQUssQ0FBQyxJQUFJOztBQUVoQixXQUFLLG9CQUFvQixDQUFDLGtCQUFrQjtBQUMxQyxlQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUFBLEFBRWpEO0FBQ0UsZUFBTyxLQUFLLENBQUM7QUFBQSxLQUNoQjtHQUNGOzs7Ozs7QUFNRCxxQkFBbUIsRUFBRSwrQkFBWTtBQUMvQixRQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7R0FDekM7O0NBRUYsQ0FBQyxDQUFDOztBQUVILE1BQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUSxFQUFFLENBQUM7OztBQ2pHNUIsSUFBSSxTQUFTLEdBQWlCLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQztJQUN6RCxxQkFBcUIsR0FBSyxPQUFPLENBQUMsb0NBQW9DLENBQUM7SUFDdkUsb0JBQW9CLEdBQU0sT0FBTyxDQUFDLHdDQUF3QyxDQUFDO0lBQzNFLG9CQUFvQixHQUFNLE9BQU8sQ0FBQyx3Q0FBd0MsQ0FBQztJQUMzRSxxQkFBcUIsR0FBVSxPQUFPLENBQUMseUNBQXlDLENBQUM7SUFDakYsb0JBQW9CLEdBQU0sT0FBTyxDQUFDLHdDQUF3QyxDQUFDO0lBQzNFLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDOzs7Ozs7QUFNcEYsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQzs7QUFFNUIsUUFBTSxFQUFFLENBQ04scUJBQXFCLEVBQ3JCLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIscUJBQXFCLEVBQ3JCLG9CQUFvQixFQUFFLEVBQ3RCLHVCQUF1QixFQUFFLENBQzFCOztBQUVELFlBQVUsRUFBRSxzQkFBWTtBQUN0QixRQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDLENBQUM7QUFDekYsUUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JDLFFBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDOztBQUVoQyxRQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7R0FDdkI7O0FBRUQsZ0JBQWMsRUFBRSwwQkFBWTtBQUMxQixRQUFJLFdBQVcsR0FBYSxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRTtRQUN0RCxrQkFBa0IsR0FBTSxPQUFPLENBQUMsMEJBQTBCLENBQUMsRUFBRTtRQUM3RCxxQkFBcUIsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsRUFBRTtRQUNoRSxjQUFjLEdBQVUsT0FBTyxDQUFDLHNCQUFzQixDQUFDLEVBQUU7UUFDekQsY0FBYyxHQUFVLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1FBQ3pELFVBQVUsR0FBYyxTQUFTLENBQUMsVUFBVSxDQUFDOztBQUVqRCxRQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7O0FBRXBDLFFBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ2xFLFFBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7QUFDaEYsUUFBSSxDQUFDLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3RGLFFBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQ3BFLFFBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0dBRXpFOzs7OztBQUtELFFBQU0sRUFBRSxrQkFBWTs7R0FFbkI7O0NBRUYsQ0FBQyxDQUFDOztBQUVILE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxFQUFFLENBQUM7OztBQzFEM0IsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLGlDQUFpQyxDQUFDO0lBQ3pELFFBQVEsR0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDO0lBQ25DLFNBQVMsR0FBTSxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQzs7Ozs7QUFLaEQsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDOzs7Ozs7O0FBTzNDLFlBQVUsRUFBRSxvQkFBVSxXQUFXLEVBQUU7O0dBRWxDOzs7Ozs7QUFNRCxjQUFZLEVBQUUsd0JBQVk7QUFDeEIsV0FBTztBQUNMLHNDQUFnQyxFQUFFLHVDQUFZO0FBQzVDLGlCQUFTLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO09BQ3pGO0tBQ0YsQ0FBQztHQUNIOzs7OztBQUtELGlCQUFlLEVBQUUsMkJBQVk7QUFDM0IsV0FBTyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7R0FDN0I7Ozs7O0FBS0QscUJBQW1CLEVBQUUsK0JBQVk7QUFDL0IsUUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ3JDLGFBQVMsQ0FBQyxRQUFRLElBQUksWUFBWSxDQUFDO0FBQ25DLFdBQU8sU0FBUyxDQUFDO0dBQ2xCOzs7OztBQUtELG1CQUFpQixFQUFFLDZCQUFZOztHQUU5Qjs7Ozs7QUFLRCxzQkFBb0IsRUFBRSxnQ0FBWTs7R0FFakM7O0NBRUYsQ0FBQyxDQUFDOztBQUVILE1BQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDOzs7QUM5RDNCLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQztJQUN6RCxRQUFRLEdBQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUNuQyxTQUFTLEdBQU0sT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Ozs7O0FBS2hELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQzs7Ozs7OztBQU8zQyxZQUFVLEVBQUUsb0JBQVUsV0FBVyxFQUFFOztHQUVsQzs7Ozs7O0FBTUQsY0FBWSxFQUFFLHdCQUFZO0FBQ3hCLFdBQU87QUFDTCxnQ0FBMEIsRUFBRSxpQ0FBWTtBQUN0QyxpQkFBUyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsRUFBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztPQUN6RjtLQUNGLENBQUM7R0FDSDs7Ozs7QUFLRCxpQkFBZSxFQUFFLDJCQUFZO0FBQzNCLFdBQU8sU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO0dBQzdCOzs7OztBQUtELHFCQUFtQixFQUFFLCtCQUFZO0FBQy9CLFFBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNyQyxhQUFTLENBQUMsUUFBUSxJQUFJLFlBQVksQ0FBQztBQUNuQyxXQUFPLFNBQVMsQ0FBQztHQUNsQjs7Ozs7QUFLRCxtQkFBaUIsRUFBRSw2QkFBWSxFQUU5Qjs7Ozs7QUFLRCxzQkFBb0IsRUFBRSxnQ0FBWTs7R0FFakM7O0NBRUYsQ0FBQyxDQUFDOztBQUVILE1BQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDOzs7QUM5RDNCLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQztJQUN6RCxRQUFRLEdBQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUNuQyxTQUFTLEdBQU0sT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Ozs7O0FBS2hELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQzs7Ozs7OztBQU8zQyxZQUFVLEVBQUUsb0JBQVUsV0FBVyxFQUFFOztHQUVsQzs7Ozs7O0FBTUQsY0FBWSxFQUFFLHdCQUFZO0FBQ3hCLFdBQU87QUFDTCxzQ0FBZ0MsRUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDOUQsd0NBQWtDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ2hFLGdDQUEwQixFQUFVLGlDQUFZO0FBQzlDLGlCQUFTLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO09BQ3pGO0tBQ0YsQ0FBQztHQUNIOzs7OztBQUtELGlCQUFlLEVBQUUsMkJBQVk7QUFDM0IsV0FBTyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7R0FDN0I7Ozs7O0FBS0QscUJBQW1CLEVBQUUsK0JBQVk7QUFDL0IsUUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ3JDLGFBQVMsQ0FBQyxRQUFRLElBQUksWUFBWSxDQUFDO0FBQ25DLFdBQU8sU0FBUyxDQUFDO0dBQ2xCOzs7OztBQUtELG1CQUFpQixFQUFFLDZCQUFZLEVBRTlCOztBQUVELFlBQVUsRUFBRSxzQkFBWTtBQUN0QixRQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzdELFdBQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxDQUFDO0FBQ25DLFFBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUMvQixhQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzFCLGNBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0tBQ3BDLE1BQU07QUFDTCxjQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSx1REFBdUQsQ0FBQyxDQUFDO0tBQ3hGO0dBQ0Y7Ozs7Ozs7QUFPRCxnQkFBYyxFQUFFLHdCQUFVLE1BQU0sRUFBRTtBQUNoQyxRQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRTtBQUMzQixhQUFPLEtBQUssQ0FBQztLQUNkLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUM5QixhQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0QsV0FBTyxJQUFJLENBQUM7R0FDYjs7QUFFRCxjQUFZLEVBQUUsd0JBQVk7QUFDeEIsV0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztHQUM1Qjs7Ozs7QUFLRCxzQkFBb0IsRUFBRSxnQ0FBWTs7R0FFakM7O0NBRUYsQ0FBQyxDQUFDOztBQUVILE1BQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDOzs7QUM3RjNCLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQztJQUN6RCxRQUFRLEdBQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUNuQyxTQUFTLEdBQU0sT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Ozs7O0FBS2hELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQzs7Ozs7OztBQU8zQyxZQUFVLEVBQUUsb0JBQVUsV0FBVyxFQUFFOztHQUVsQzs7Ozs7O0FBTUQsY0FBWSxFQUFFLHdCQUFZO0FBQ3hCLFdBQU87QUFDTCxrQ0FBNEIsRUFBRSxtQ0FBWTtBQUN4QyxpQkFBUyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsRUFBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztPQUN6RjtLQUNGLENBQUM7R0FDSDs7Ozs7QUFLRCxpQkFBZSxFQUFFLDJCQUFZO0FBQzNCLFdBQU8sU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO0dBQzdCOzs7OztBQUtELHFCQUFtQixFQUFFLCtCQUFZO0FBQy9CLFFBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNyQyxhQUFTLENBQUMsUUFBUSxJQUFJLFlBQVksQ0FBQztBQUNuQyxXQUFPLFNBQVMsQ0FBQztHQUNsQjs7Ozs7QUFLRCxtQkFBaUIsRUFBRSw2QkFBWTs7R0FFOUI7Ozs7O0FBS0Qsc0JBQW9CLEVBQUUsZ0NBQVk7O0dBRWpDOztDQUVGLENBQUMsQ0FBQzs7QUFFSCxNQUFNLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQzs7O0FDOUQzQixJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUM7SUFDekQsUUFBUSxHQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDbkMsU0FBUyxHQUFNLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDOzs7OztBQUtoRCxJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsbUJBQW1CLENBQUM7Ozs7Ozs7QUFPM0MsWUFBVSxFQUFFLG9CQUFVLFdBQVcsRUFBRTs7R0FFbEM7Ozs7OztBQU1ELGNBQVksRUFBRSx3QkFBWTtBQUN4QixXQUFPO0FBQ0wsbUNBQTZCLEVBQUUsb0NBQVk7QUFDekMsaUJBQVMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLEVBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7T0FDekY7S0FDRixDQUFDO0dBQ0g7Ozs7O0FBS0QsaUJBQWUsRUFBRSwyQkFBWTtBQUMzQixXQUFPLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztHQUM3Qjs7Ozs7QUFLRCxxQkFBbUIsRUFBRSwrQkFBWTtBQUMvQixRQUFJLFNBQVMsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDckMsYUFBUyxDQUFDLFFBQVEsSUFBSSxZQUFZLENBQUM7QUFDbkMsV0FBTyxTQUFTLENBQUM7R0FDbEI7Ozs7O0FBS0QsbUJBQWlCLEVBQUUsNkJBQVk7O0dBRTlCOzs7OztBQUtELHNCQUFvQixFQUFFLGdDQUFZOztHQUVqQzs7Q0FFRixDQUFDLENBQUM7O0FBRUgsTUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7Ozs7Ozs7QUMxRDNCLEFBQUMsQ0FBQSxZQUFZOztBQUVYLE1BQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDOzs7OztBQUs5RCxNQUFHLFlBQVksQ0FBQyxZQUFZLElBQUksWUFBWSxDQUFDLEtBQUssRUFBRTtBQUNsRCxZQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsR0FBRyx5SEFBeUgsQ0FBQztHQUN0SyxNQUFNOzs7OztBQUtMLFVBQU0sQ0FBQyxNQUFNLEdBQUcsWUFBVztBQUN6QixZQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLFlBQU0sQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3JDLFNBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztLQUNsQixDQUFDO0dBRUg7Q0FFRixDQUFBLEVBQUUsQ0FBRTs7O0FDMUJMLElBQUksSUFBSSxHQUFHLFNBQVAsSUFBSSxHQUFlOztBQUVyQixNQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUM7TUFDOUMsT0FBTyxHQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDOzs7QUFHL0MsR0FBQyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQzs7Ozs7O0FBTW5ELFdBQVMsYUFBYSxHQUFHO0FBQ3ZCLFdBQU8sV0FBVyxDQUFDO0dBQ3BCOztBQUVELFdBQVMsU0FBUyxHQUFHO0FBQ25CLFdBQU8sT0FBTyxDQUFDO0dBQ2hCOztBQUVELFdBQVMsU0FBUyxHQUFHO0FBQ25CLFdBQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUcsTUFBTSxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUUsQ0FBQztHQUNyRDs7QUFFRCxXQUFTLGVBQWUsR0FBRztBQUN6QixXQUFPLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztHQUNsQzs7Ozs7Ozs7Ozs7O0FBWUQsV0FBUyxXQUFXLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRTtBQUN4QyxlQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsTUFBTSxFQUFFO0FBQ3BDLFlBQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztLQUNuQyxDQUFDLENBQUM7QUFDSCxXQUFPLE1BQU0sQ0FBQztHQUNmOzs7Ozs7O0FBT0QsV0FBUyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7QUFDakMsVUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekIsV0FBTyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7R0FDaEM7Ozs7Ozs7QUFPRCxXQUFTLFdBQVcsQ0FBQyxNQUFNLEVBQUU7QUFDM0IsV0FBTyxTQUFTLEVBQUUsR0FBRztBQUNuQixhQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0tBQzlDLENBQUM7R0FDSDs7Ozs7OztBQU9ELFdBQVMsVUFBVSxDQUFDLE1BQU0sRUFBRTtBQUMxQixXQUFPLFNBQVMsRUFBRSxHQUFHO0FBQ25CLGFBQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7S0FDOUMsQ0FBQztHQUNIOzs7Ozs7O0FBT0QsV0FBUyxlQUFlLENBQUMsWUFBWSxFQUFFO0FBQ3JDLFFBQUksTUFBTSxDQUFDOztBQUVYLFFBQUksWUFBWSxDQUFDLE1BQU0sRUFBRTtBQUN2QixZQUFNLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztLQUM5Qjs7QUFFRCxVQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzFCLFdBQU8sV0FBVyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztHQUNoQzs7Ozs7Ozs7QUFRRCxXQUFTLElBQUksQ0FBQyxLQUFLLEVBQUU7Ozs7QUFJbkIsUUFBSSxZQUFZLEdBQUcsU0FBZixZQUFZLEdBQWU7QUFDN0IsVUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFO0FBQ3BCLGFBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDdEI7QUFDRCxhQUFPLEtBQUssQ0FBQztLQUNkLENBQUM7O0FBRUYsZ0JBQVksQ0FBQyxNQUFNLEdBQUcsWUFBWTtBQUNoQyxhQUFPLEtBQUssQ0FBQztLQUNkLENBQUM7O0FBRUYsV0FBTyxZQUFZLENBQUM7R0FDckI7OztBQUdELFdBQVMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFO0FBQ3pDLFdBQU8sVUFBVSxDQUFDLEVBQUU7QUFDbEIsT0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUM7O0FBRWYsVUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJO1VBQ3ZDLElBQUksR0FBWSxPQUFPLElBQUksSUFBSSxDQUFDOztBQUVwQyxjQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLElBQUksYUFBYSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDckcsQ0FBQztHQUNIOzs7Ozs7QUFNRCxTQUFPO0FBQ0wsVUFBTSxFQUFhLFNBQVM7QUFDNUIsY0FBVSxFQUFTLGFBQWE7QUFDaEMsVUFBTSxFQUFhLFNBQVM7QUFDNUIscUJBQWlCLEVBQUUsaUJBQWlCO0FBQ3BDLGVBQVcsRUFBUSxXQUFXO0FBQzlCLGNBQVUsRUFBUyxVQUFVO0FBQzdCLG1CQUFlLEVBQUksZUFBZTtBQUNsQyxtQkFBZSxFQUFJLGVBQWU7QUFDbEMsZUFBVyxFQUFRLFdBQVc7QUFDOUIsUUFBSSxFQUFlLElBQUk7QUFDdkIsWUFBUSxFQUFXLFFBQVE7R0FDNUIsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLEVBQUUsQ0FBQzs7O0FDckp4QixNQUFNLENBQUMsT0FBTyxHQUFHO0FBQ2Ysb0JBQWtCLEVBQUUsb0JBQW9CO0NBQ3pDLENBQUM7Ozs7Ozs7O0FDR0YsSUFBSSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQzs7QUFFM0QsSUFBSSxpQkFBaUIsR0FBRzs7QUFFdEIsa0JBQWdCLEVBQUUsMEJBQVUsSUFBSSxFQUFFLEVBQUUsRUFBRTtBQUNwQyxRQUFJLE1BQU0sR0FBRztBQUNYLFVBQUksRUFBSyxvQkFBb0IsQ0FBQyxrQkFBa0I7QUFDaEQsYUFBTyxFQUFFO0FBQ1AsVUFBRSxFQUFJLEVBQUU7QUFDUixZQUFJLEVBQUUsSUFBSTtPQUNYO0tBQ0YsQ0FBQzs7QUFFRixXQUFPLE1BQU0sQ0FBQztHQUNmOztDQUVGLENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQzs7O0FDdkJuQyxJQUFJLGlCQUFpQixHQUFHLFNBQXBCLGlCQUFpQixHQUFlOztBQUVsQyxNQUFJLFFBQVEsR0FBSSxJQUFJLEVBQUUsQ0FBQyxlQUFlLEVBQUU7TUFDcEMsU0FBUyxHQUFHLEVBQUUsRUFBRTtNQUNoQixPQUFPLEdBQUs7QUFDVixRQUFJLEVBQWUsTUFBTTtBQUN6QixRQUFJLEVBQWUsTUFBTTtBQUN6QixpQkFBYSxFQUFNLGVBQWU7QUFDbEMsaUJBQWEsRUFBTSxlQUFlO0FBQ2xDLFdBQU8sRUFBWSxTQUFTO0FBQzVCLFdBQU8sRUFBWSxTQUFTO0FBQzVCLGtCQUFjLEVBQUssZ0JBQWdCO0FBQ25DLHFCQUFpQixFQUFFLG1CQUFtQjtBQUN0QyxRQUFJLEVBQWUsTUFBTTtBQUN6QixhQUFTLEVBQVUsV0FBVztBQUM5QixrQkFBYyxFQUFLLGdCQUFnQjtBQUNuQyxXQUFPLEVBQVksU0FBUztBQUM1QixlQUFXLEVBQVEsYUFBYTtBQUNoQyxhQUFTLEVBQVUsV0FBVztBQUM5QixjQUFVLEVBQVMsWUFBWTtHQUNoQyxDQUFDOztBQUdOLFdBQVMsVUFBVSxHQUFHO0FBQ3BCLGFBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQztHQUNyRDs7Ozs7O0FBTUQsV0FBUyxjQUFjLENBQUMsT0FBTyxFQUFFO0FBQy9CLFFBQUksT0FBTyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFO0FBQ2pDLGtCQUFZLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztLQUNoQyxNQUFNLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFO0FBQ3hDLGFBQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztLQUNoQztBQUNELHFCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQzVCOztBQUVELFdBQVMsSUFBSSxHQUFHO0FBQ2QsZ0JBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQ2hDOzs7Ozs7O0FBT0QsV0FBUyxZQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRTtBQUNuQyxhQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUU7QUFDcEMsVUFBSSxFQUFLLElBQUk7QUFDYixhQUFPLEVBQUUsT0FBTztLQUNqQixDQUFDLENBQUM7R0FDSjs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQkQsV0FBUyxTQUFTLENBQUMsT0FBTyxFQUFFO0FBQzFCLFdBQU8sUUFBUSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUNwQzs7Ozs7O0FBTUQsV0FBUyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUU7QUFDbEMsWUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUMxQjs7Ozs7O0FBTUQsV0FBUyxtQkFBbUIsR0FBRztBQUM3QixXQUFPLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztHQUM1Qjs7QUFFRCxXQUFTLGlCQUFpQixHQUFHO0FBQzNCLFdBQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7R0FDOUI7O0FBRUQsU0FBTztBQUNMLFVBQU0sRUFBZSxpQkFBaUI7QUFDdEMsY0FBVSxFQUFXLFVBQVU7QUFDL0IsUUFBSSxFQUFpQixJQUFJO0FBQ3pCLGdCQUFZLEVBQVMsWUFBWTtBQUNqQyxhQUFTLEVBQVksU0FBUztBQUM5QixxQkFBaUIsRUFBSSxpQkFBaUI7QUFDdEMsdUJBQW1CLEVBQUUsbUJBQW1CO0dBQ3pDLENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQzs7Ozs7OztBQ3ZHckMsSUFBSSxHQUFHLEdBQUcsU0FBTixHQUFHLEdBQWU7QUFDcEIsTUFBSSxLQUFLO01BQ0wsR0FBRztNQUNILGlCQUFpQjtNQUNqQixNQUFNLEdBQUssS0FBSztNQUNoQixRQUFRLEdBQUcsRUFBRTtNQUNiLElBQUksR0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7Ozs7QUFNbkMsV0FBUyxVQUFVLENBQUMsT0FBTyxFQUFFO0FBQzNCLFFBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFO0FBQ2YsWUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0tBQ3JEOztBQUVELFNBQUssR0FBRyxJQUFJLENBQUM7QUFDYixPQUFHLEdBQUssT0FBTyxDQUFDLEVBQUUsQ0FBQzs7QUFFbkIsUUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO0FBQ2pCLFlBQU0sR0FBRyxJQUFJLENBQUM7QUFDZCxVQUFJLEdBQUssT0FBTyxDQUFDLEtBQUssQ0FBQztLQUN4QixNQUFNLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtBQUN2QixhQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3ZCO0dBRUY7Ozs7OztBQU1ELFdBQVMsT0FBTyxDQUFDLElBQUksRUFBRTtBQUNyQixVQUFNLEdBQUcsSUFBSSxDQUFDO0FBQ2QsUUFBSTtBQUNGLFVBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3pCLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDVixZQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNoRTtHQUNGOztBQUVELFdBQVMsS0FBSyxHQUFHO0FBQ2YsV0FBTyxHQUFHLENBQUM7R0FDWjs7Ozs7QUFLRCxXQUFTLEtBQUssR0FBRztBQUNmLFFBQUksR0FBSyxFQUFFLENBQUM7QUFDWixVQUFNLEdBQUcsSUFBSSxDQUFDO0dBQ2Y7O0FBRUQsV0FBUyxPQUFPLEdBQUc7QUFDakIsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFRCxXQUFTLFNBQVMsR0FBRztBQUNuQixVQUFNLEdBQUcsS0FBSyxDQUFDO0dBQ2hCOzs7Ozs7O0FBT0QsV0FBUyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRTs7QUFFdkIsUUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7QUFDM0IsVUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztLQUMvQixNQUFNO0FBQ0wsVUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztLQUNuQjs7O0FBR0QsVUFBTSxHQUFHLElBQUksQ0FBQzs7QUFFZCxrQkFBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0dBQzNCOzs7Ozs7OztBQVFELFdBQVMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0FBQ25DLFFBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7O0FBRXZCLFVBQU0sR0FBRyxJQUFJLENBQUM7QUFDZCxrQkFBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0dBQzNCOzs7Ozs7QUFNRCxXQUFTLEdBQUcsQ0FBQyxHQUFHLEVBQUU7QUFDaEIsUUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUM7O0FBRTdDLFFBQUksS0FBSyxFQUFFO0FBQ1QsV0FBSyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDNUI7O0FBRUQsV0FBTyxLQUFLLENBQUM7R0FDZDs7Ozs7Ozs7QUFRRCxXQUFTLFVBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQzdCLFFBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUztRQUMzQyxLQUFLLEdBQU0sSUFBSSxDQUFDOztBQUVwQixRQUFJLFFBQVEsRUFBRTtBQUNaLFdBQUssR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3JDOztBQUVELFdBQU8sS0FBSyxDQUFDO0dBQ2Q7Ozs7Ozs7QUFPRCxXQUFTLEdBQUcsQ0FBQyxHQUFHLEVBQUU7QUFDaEIsV0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ2pDOzs7Ozs7O0FBT0QsV0FBUyxPQUFPLEdBQUc7QUFDakIsUUFBSSxDQUFDLE1BQU0sSUFBSSxRQUFRLEVBQUU7QUFDdkIsYUFBTyxRQUFRLENBQUM7S0FDakI7O0FBRUQsUUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2QsU0FBSyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7QUFDcEIsVUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBQyxDQUFDLENBQUM7S0FDekM7O0FBRUQsWUFBUSxHQUFHLElBQUksQ0FBQztBQUNoQixVQUFNLEdBQUssS0FBSyxDQUFDOztBQUVqQixXQUFPLElBQUksQ0FBQztHQUNiOzs7Ozs7QUFNRCxXQUFTLElBQUksR0FBRztBQUNkLFdBQU8sSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO0dBQ3RCOzs7Ozs7QUFNRCxXQUFTLElBQUksR0FBRztBQUNkLFdBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUMxQjs7Ozs7O0FBTUQsV0FBUyxNQUFNLEdBQUc7QUFDaEIsV0FBTyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEVBQUU7QUFDcEMsYUFBTyxLQUFLLENBQUMsS0FBSyxDQUFDO0tBQ3BCLENBQUMsQ0FBQztHQUNKOzs7Ozs7QUFNRCxXQUFTLE1BQU0sQ0FBQyxHQUFHLEVBQUU7QUFDbkIsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDbEI7Ozs7Ozs7QUFPRCxXQUFTLFlBQVksQ0FBQyxTQUFTLEVBQUU7QUFDL0IsV0FBTyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7R0FDbkM7O0FBRUQsV0FBUyxLQUFLLEdBQUc7QUFDZixXQUFPLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3JCOztBQUVELFdBQVMsSUFBSSxHQUFHO0FBQ2QsUUFBSSxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUM7QUFDbEIsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztHQUN4Qjs7QUFFRCxXQUFTLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDckIsV0FBTyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNyQjs7Ozs7O0FBTUQsV0FBUyxRQUFRLEdBQUc7QUFDbEIsV0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUMxQjs7Ozs7O0FBTUQsV0FBUyxTQUFTLENBQUMsSUFBSSxFQUFFO0FBQ3ZCLFFBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRXRDLFNBQUssSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO0FBQ3JCLFVBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUM3QixtQkFBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUN0QztLQUNGOztBQUVELFdBQU8sV0FBVyxDQUFDO0dBQ3BCOzs7OztBQUtELFdBQVMsY0FBYyxDQUFDLElBQUksRUFBRTtBQUM1QixRQUFJLE9BQU8sR0FBRztBQUNaLFFBQUUsRUFBTyxHQUFHO0FBQ1osYUFBTyxFQUFFLE9BQU87S0FDakIsQ0FBQzs7QUFFRixTQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRWpDLFFBQUksaUJBQWlCLENBQUMsY0FBYyxFQUFFO0FBQ3BDLHVCQUFpQixDQUFDLGNBQWMsQ0FBQztBQUMvQixVQUFFLEVBQUUsR0FBRztPQUNSLEVBQUcsSUFBSSxJQUFJLEtBQUssQ0FBRSxDQUFDO0tBQ3JCO0dBRUY7O0FBRUQsV0FBUyxNQUFNLEdBQUc7QUFDaEIsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQzdCOztBQUVELFdBQVMsbUJBQW1CLENBQUMsVUFBVSxFQUFFO0FBQ3ZDLHFCQUFpQixHQUFHLFVBQVUsQ0FBQztHQUNoQzs7QUFFRCxXQUFTLG1CQUFtQixHQUFHO0FBQzdCLFdBQU8saUJBQWlCLENBQUM7R0FDMUI7Ozs7OztBQU1ELFNBQU87QUFDTCxjQUFVLEVBQVcsVUFBVTtBQUMvQixTQUFLLEVBQWdCLEtBQUs7QUFDMUIsU0FBSyxFQUFnQixLQUFLO0FBQzFCLFdBQU8sRUFBYyxPQUFPO0FBQzVCLGFBQVMsRUFBWSxTQUFTO0FBQzlCLFdBQU8sRUFBYyxPQUFPO0FBQzVCLE9BQUcsRUFBa0IsR0FBRztBQUN4QixjQUFVLEVBQVcsVUFBVTtBQUMvQixPQUFHLEVBQWtCLEdBQUc7QUFDeEIsY0FBVSxFQUFXLFVBQVU7QUFDL0IsT0FBRyxFQUFrQixHQUFHO0FBQ3hCLFVBQU0sRUFBZSxNQUFNO0FBQzNCLFFBQUksRUFBaUIsSUFBSTtBQUN6QixVQUFNLEVBQWUsTUFBTTtBQUMzQixXQUFPLEVBQWMsT0FBTztBQUM1QixnQkFBWSxFQUFTLFlBQVk7QUFDakMsUUFBSSxFQUFpQixJQUFJO0FBQ3pCLFNBQUssRUFBZ0IsS0FBSztBQUMxQixRQUFJLEVBQWlCLElBQUk7QUFDekIsY0FBVSxFQUFXLFVBQVU7QUFDL0IsWUFBUSxFQUFhLFFBQVE7QUFDN0IsYUFBUyxFQUFZLFNBQVM7QUFDOUIsVUFBTSxFQUFlLE1BQU07QUFDM0IsdUJBQW1CLEVBQUUsbUJBQW1CO0FBQ3hDLHVCQUFtQixFQUFFLG1CQUFtQjtHQUN6QyxDQUFDO0NBRUgsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQzs7Ozs7O0FDN1NyQixJQUFJLGFBQWEsR0FBRyxTQUFoQixhQUFhLEdBQWU7QUFDOUIsTUFBSSxLQUFLO01BQ0wsR0FBRztNQUNILGlCQUFpQjtNQUNqQixNQUFNLEdBQU0sQ0FBQztNQUNiLFNBQVMsR0FBRyxFQUFFLENBQUM7Ozs7OztBQU1uQixXQUFTLFVBQVUsQ0FBQyxPQUFPLEVBQUU7QUFDM0IsUUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUU7QUFDZixZQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7S0FDL0Q7O0FBRUQsU0FBSyxHQUFHLElBQUksQ0FBQztBQUNiLE9BQUcsR0FBSyxPQUFPLENBQUMsRUFBRSxDQUFDOzs7QUFHbkIsUUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ2xCLHNCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzlDO0dBQ0Y7Ozs7OztBQU1ELFdBQVMsSUFBSSxHQUFHO0FBQ2QsUUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ2IsUUFBSSxPQUFPLEVBQUUsRUFBRTtBQUNiLFNBQUcsR0FBRyxFQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDO0tBQ3RELE1BQU07QUFDTCxTQUFHLEdBQUcsT0FBTyxFQUFFLENBQUM7S0FDakI7O0FBRUQsV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFRCxXQUFTLE9BQU8sR0FBRztBQUNqQixXQUFPLEVBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDO0dBQ3JEOztBQUVELFdBQVMsTUFBTSxHQUFHO0FBQ2hCLFVBQU0sR0FBRyxDQUFDLENBQUM7QUFDWCxXQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUMxQjs7QUFFRCxXQUFTLE9BQU8sR0FBRztBQUNqQixXQUFPLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO0dBQ2xDOzs7Ozs7QUFNRCxXQUFTLE9BQU8sR0FBRztBQUNqQixRQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDbEIsV0FBTyxDQUFDLFNBQVMsVUFBVSxDQUFDLEdBQUcsRUFBRTtBQUMvQixVQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRTtBQUNqQixhQUFLLEdBQUcsSUFBSSxDQUFDO09BQ2Q7S0FDRixDQUFDLENBQUM7QUFDSCxXQUFPLEtBQUssQ0FBQztHQUNkOztBQUVELFdBQVMsU0FBUyxHQUFHO0FBQ25CLFdBQU8sQ0FBQyxTQUFTLFVBQVUsQ0FBQyxHQUFHLEVBQUU7QUFDL0IsU0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO0tBQ2pCLENBQUMsQ0FBQztHQUNKOzs7Ozs7QUFNRCxXQUFTLGdCQUFnQixDQUFDLEtBQUssRUFBRTtBQUMvQixTQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsS0FBSyxFQUFFO0FBQzdCLFNBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNaLENBQUMsQ0FBQztHQUNKOzs7Ozs7O0FBT0QsV0FBUyxlQUFlLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRTtBQUNyQyxXQUFPLENBQUMsSUFBSSxDQUFDLHFGQUFxRixDQUFDLENBQUM7QUFDcEcsU0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsRUFBRTs7QUFFM0IsVUFBSSxFQUFFLENBQUM7O0FBRVAsVUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQzdCLFVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7T0FDakIsTUFBTTtBQUNMLFVBQUUsR0FBRyxHQUFHLEdBQUcsT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7T0FDdkM7OztLQUdGLENBQUMsQ0FBQztBQUNILGtCQUFjLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0dBQ2hDOztBQUVELFdBQVMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtBQUNyQyxXQUFPLENBQUMsSUFBSSxDQUFDLHNGQUFzRixDQUFDLENBQUM7QUFDckcsUUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUksRUFBRTs7QUFFM0IsVUFBSSxFQUFFLEVBQUUsR0FBRyxDQUFDOztBQUVaLFVBQUk7QUFDRixXQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUN4QixDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ1YsY0FBTSxJQUFJLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7T0FDaEU7O0FBRUQsVUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQzdCLFVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7T0FDakIsTUFBTTtBQUNMLFVBQUUsR0FBRyxHQUFHLEdBQUcsT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7T0FDdkM7OztLQUdGLENBQUMsQ0FBQztBQUNILGtCQUFjLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0dBQ2hDOztBQUVELFdBQVMsS0FBSyxHQUFHO0FBQ2YsV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFRCxXQUFTLEdBQUcsQ0FBQyxLQUFLLEVBQUU7QUFDbEIsUUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDOztBQUV6QyxTQUFLLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7O0FBRWpDLFFBQUksT0FBTyxJQUFJLENBQUMsRUFBRTtBQUNoQixlQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO0tBQzVCLE1BQU07QUFDTCxlQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3ZCOztBQUVELGtCQUFjLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0dBQ2hDOzs7Ozs7QUFNRCxXQUFTLE1BQU0sQ0FBQyxPQUFPLEVBQUU7QUFDdkIsUUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ25DLFFBQUksT0FBTyxJQUFJLENBQUMsRUFBRTtBQUNoQixlQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDN0MsZUFBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztBQUMxQixlQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3QixvQkFBYyxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQztLQUNuQyxNQUFNO0FBQ0wsYUFBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsb0NBQW9DLEdBQUcsT0FBTyxDQUFDLENBQUM7S0FDbkU7R0FDRjs7Ozs7QUFLRCxXQUFTLFNBQVMsR0FBRztBQUNuQixhQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxFQUFFO0FBQy9CLFNBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUMvQixDQUFDLENBQUM7O0FBRUgsYUFBUyxHQUFHLEVBQUUsQ0FBQztBQUNmLGtCQUFjLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDO0dBQ25DOzs7Ozs7O0FBT0QsV0FBUyxNQUFNLENBQUMsT0FBTyxFQUFFO0FBQ3ZCLFdBQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN2QyxhQUFPLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxPQUFPLENBQUM7S0FDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ1A7Ozs7Ozs7QUFPRCxXQUFTLFdBQVcsQ0FBQyxPQUFPLEVBQUU7QUFDNUIsV0FBTyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxFQUFFO0FBQ3BDLGFBQU8sS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0tBQ3RCLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDckI7Ozs7O0FBS0QsV0FBUyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUNsQyxRQUFJLE9BQU8sR0FBRztBQUNaLFFBQUUsRUFBTyxHQUFHO0FBQ1osVUFBSSxFQUFLLElBQUksSUFBSSxFQUFFO0FBQ25CLGFBQU8sRUFBRSxZQUFZO0FBQ3JCLFdBQUssRUFBSSxJQUFJLENBQUMsRUFBRTtLQUNqQixDQUFDOztBQUVGLFNBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFFakMsUUFBSSxpQkFBaUIsRUFBRTtBQUNyQix1QkFBaUIsQ0FBQyxjQUFjLENBQUMsRUFBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBQyxDQUFDLENBQUM7S0FDOUQ7R0FDRjs7QUFFRCxXQUFTLE1BQU0sQ0FBQyxPQUFPLEVBQUU7QUFDdkIsV0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDM0I7Ozs7OztBQU1ELFdBQVMsSUFBSSxHQUFHO0FBQ2QsV0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDO0dBQ3pCOztBQUVELFdBQVMsS0FBSyxHQUFHO0FBQ2YsV0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDckI7O0FBRUQsV0FBUyxJQUFJLEdBQUc7QUFDZCxXQUFPLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQ3hDOztBQUVELFdBQVMsT0FBTyxDQUFDLENBQUMsRUFBRTtBQUNsQixXQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNyQjs7Ozs7OztBQU9ELFdBQVMsTUFBTSxDQUFDLFNBQVMsRUFBRTtBQUN6QixXQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7R0FDcEM7Ozs7Ozs7O0FBUUQsV0FBUyxXQUFXLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRTtBQUMvQixXQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLEVBQUU7QUFDckMsYUFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQztLQUMvQixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLE9BQU8sQ0FBQyxJQUFJLEVBQUU7QUFDckIsV0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ2hDOztBQUVELFdBQVMsR0FBRyxDQUFDLElBQUksRUFBRTtBQUNqQixXQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDNUI7Ozs7OztBQU1ELFdBQVMsT0FBTyxHQUFHO0FBQ2pCLFFBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNkLGFBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLEVBQUU7QUFDL0IsVUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztLQUMxQixDQUFDLENBQUM7QUFDSCxXQUFPLElBQUksQ0FBQztHQUNiOztBQUVELFdBQVMsTUFBTSxHQUFHO0FBQ2hCLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztHQUNsQzs7QUFFRCxXQUFTLG1CQUFtQixDQUFDLFVBQVUsRUFBRTtBQUN2QyxxQkFBaUIsR0FBRyxVQUFVLENBQUM7R0FDaEM7O0FBRUQsV0FBUyxtQkFBbUIsR0FBRztBQUM3QixXQUFPLGlCQUFpQixDQUFDO0dBQzFCOzs7Ozs7QUFNRCxTQUFPO0FBQ0wsY0FBVSxFQUFXLFVBQVU7QUFDL0IsV0FBTyxFQUFjLE9BQU87QUFDNUIsUUFBSSxFQUFpQixJQUFJO0FBQ3pCLFdBQU8sRUFBYyxPQUFPO0FBQzVCLFVBQU0sRUFBZSxNQUFNO0FBQzNCLFNBQUssRUFBZ0IsS0FBSztBQUMxQixXQUFPLEVBQWMsT0FBTztBQUM1QixhQUFTLEVBQVksU0FBUztBQUM5QixPQUFHLEVBQWtCLEdBQUc7QUFDeEIsb0JBQWdCLEVBQUssZ0JBQWdCO0FBQ3JDLG1CQUFlLEVBQU0sZUFBZTtBQUNwQyxvQkFBZ0IsRUFBSyxnQkFBZ0I7QUFDckMsVUFBTSxFQUFlLE1BQU07QUFDM0IsYUFBUyxFQUFZLFNBQVM7QUFDOUIsVUFBTSxFQUFlLE1BQU07QUFDM0IsVUFBTSxFQUFlLE1BQU07QUFDM0IsUUFBSSxFQUFpQixJQUFJO0FBQ3pCLFNBQUssRUFBZ0IsS0FBSztBQUMxQixRQUFJLEVBQWlCLElBQUk7QUFDekIsV0FBTyxFQUFjLE9BQU87QUFDNUIsVUFBTSxFQUFlLE1BQU07QUFDM0IsZUFBVyxFQUFVLFdBQVc7QUFDaEMsV0FBTyxFQUFjLE9BQU87QUFDNUIsT0FBRyxFQUFrQixHQUFHO0FBQ3hCLFdBQU8sRUFBYyxPQUFPO0FBQzVCLFVBQU0sRUFBZSxNQUFNO0FBQzNCLGtCQUFjLEVBQU8sY0FBYztBQUNuQyx1QkFBbUIsRUFBRSxtQkFBbUI7QUFDeEMsdUJBQW1CLEVBQUUsbUJBQW1CO0dBQ3pDLENBQUM7Q0FDSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDOzs7QUMzVS9CLElBQUksZUFBZSxHQUFHLFNBQWxCLGVBQWUsR0FBZTs7QUFFaEMsTUFBSSxrQkFBa0IsR0FBTSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztNQUMzQyxRQUFRLEdBQWdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO01BQzNDLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztNQUNyRCxXQUFXLEdBQWEsT0FBTyxDQUFDLFVBQVUsQ0FBQztNQUMzQyxrQkFBa0IsR0FBTSxPQUFPLENBQUMsb0NBQW9DLENBQUMsQ0FBQzs7Ozs7Ozs7QUFRMUUsV0FBUyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFO0FBQzVDLFFBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMscUJBQXFCLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDdEYsS0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0QixXQUFPLENBQUMsQ0FBQztHQUNWOzs7Ozs7OztBQVFELFdBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDbEMsUUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDNUUsS0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0QixXQUFPLENBQUMsQ0FBQztHQUNWOzs7Ozs7O0FBT0QsV0FBUyxNQUFNLENBQUMsT0FBTyxFQUFFO0FBQ3ZCLFdBQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQzFCOzs7Ozs7O0FBT0QsV0FBUyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7QUFDakMsV0FBTyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUNwQzs7QUFFRCxTQUFPO0FBQ0wsdUJBQW1CLEVBQUUsbUJBQW1CO0FBQ3hDLGFBQVMsRUFBWSxTQUFTO0FBQzlCLFVBQU0sRUFBZSxNQUFNO0FBQzNCLG9CQUFnQixFQUFLLGdCQUFnQjtHQUN0QyxDQUFDO0NBRUgsQ0FBQzs7QUFHRixNQUFNLENBQUMsT0FBTyxHQUFHLGVBQWUsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O0FDbERuQyxJQUFJLGlCQUFpQixHQUFHLFNBQXBCLGlCQUFpQixHQUFlO0FBQ2xDLE1BQUksS0FBSztNQUNMLE1BQU07TUFDTixjQUFjLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7QUFTeEIsV0FBUyxRQUFRLEdBQUc7QUFDbEIsUUFBSSxNQUFNLEVBQUU7QUFDVixhQUFPLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztLQUMxQjtBQUNELFdBQU8sRUFBRSxDQUFDO0dBQ1g7O0FBRUQsV0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFO0FBQ3ZCLFFBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsRUFBRTtBQUM3QixZQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZCLFdBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUM3QjtHQUNGOztBQUVELFdBQVMsV0FBVyxDQUFDLFlBQVksRUFBRTtBQUNqQyxrQkFBYyxHQUFHLFlBQVksQ0FBQztHQUMvQjs7QUFFRCxXQUFTLFVBQVUsQ0FBQyxPQUFPLEVBQUU7QUFDM0Isa0JBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDOUI7Ozs7Ozs7OztBQVNELFdBQVMsc0JBQXNCLEdBQUc7QUFDaEMsUUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUU7QUFDdkIsYUFBTyxDQUFDLElBQUksQ0FBQyxnRkFBZ0YsQ0FBQyxDQUFDO0tBQ2hHOztBQUVELFFBQUksa0JBQWtCLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7O0FBRXJELFNBQUssR0FBSSxJQUFJLENBQUM7QUFDZCxVQUFNLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQzs7QUFFOUIsUUFBSSxDQUFDLGNBQWMsRUFBRTtBQUNuQixZQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7S0FDM0U7OztBQUdELGlCQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7R0FDbkI7Ozs7Ozs7QUFPRCxXQUFTLEtBQUssQ0FBQyxZQUFZLEVBQUU7QUFDM0IsV0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3RSxpQkFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO0dBQzdCOztBQUVELFdBQVMsYUFBYSxDQUFDLFlBQVksRUFBRTtBQUNuQyxRQUFJLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUMvRCxZQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDcEIsU0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUM7R0FDN0I7Ozs7O0FBS0QsV0FBUyxtQkFBbUIsR0FBRyxFQUU5Qjs7Ozs7Ozs7OztBQUFBLEFBU0QsV0FBUyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFO0FBQzNDLFNBQUssR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDOztBQUVwQixrQkFBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLHlCQUF5QixDQUFDLFdBQVcsRUFBRTtBQUNyRSxXQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztLQUNwQyxDQUFDLENBQUM7QUFDSCxXQUFPLEtBQUssQ0FBQztHQUNkOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBdUJELFNBQU87QUFDTCwwQkFBc0IsRUFBRSxzQkFBc0I7QUFDOUMsWUFBUSxFQUFnQixRQUFRO0FBQ2hDLFlBQVEsRUFBZ0IsUUFBUTtBQUNoQyxTQUFLLEVBQW1CLEtBQUs7QUFDN0IsZUFBVyxFQUFhLFdBQVc7QUFDbkMsY0FBVSxFQUFjLFVBQVU7QUFDbEMsaUJBQWEsRUFBVyxhQUFhO0FBQ3JDLHdCQUFvQixFQUFJLG9CQUFvQjtBQUM1Qyx1QkFBbUIsRUFBSyxtQkFBbUI7R0FDNUMsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxpQkFBaUIsRUFBRSxDQUFDOzs7QUMvSXJDLElBQUksV0FBVyxHQUFHLFNBQWQsV0FBVyxHQUFlO0FBQzVCLE1BQUksY0FBYyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Ozs7OztBQU16QyxXQUFTLFFBQVEsR0FBRztBQUNsQixXQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0dBQ3JDOzs7Ozs7QUFNRCxXQUFTLFFBQVEsQ0FBQyxTQUFTLEVBQUU7QUFDM0Isa0JBQWMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztHQUN0RDs7QUFFRCxTQUFPO0FBQ0wsWUFBUSxFQUFFLFFBQVE7QUFDbEIsWUFBUSxFQUFFLFFBQVE7R0FDbkIsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7QUNiN0IsSUFBSSxVQUFVLEdBQUcsU0FBYixVQUFVLEdBQWU7O0FBRTNCLE1BQUksV0FBVyxHQUFJLEVBQUU7TUFDakIsWUFBWSxHQUFHLEVBQUU7TUFDakIsR0FBRyxHQUFZLENBQUM7TUFDaEIsSUFBSSxHQUFXLEVBQUU7TUFDakIsTUFBTSxHQUFTLEVBQUU7TUFDakIsZ0JBQWdCO01BQ2hCLGtCQUFrQjtNQUNsQixjQUFjLENBQUM7Ozs7Ozs7Ozs7QUFVbkIsV0FBUyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFO0FBQ3ZELFFBQUksY0FBYyxHQUFHLE1BQU0sQ0FBQzs7OztBQUk1QixRQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDckIsYUFBTyxDQUFDLElBQUksQ0FBQyxvREFBb0QsRUFBRSxPQUFPLENBQUMsQ0FBQztLQUM3RTs7QUFFRCxRQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDdEIsYUFBTyxDQUFDLElBQUksQ0FBQyxvREFBb0QsRUFBRSxNQUFNLENBQUMsQ0FBQztLQUM1RTs7QUFFRCxRQUFJLGFBQWEsSUFBSSxhQUFhLEtBQUssS0FBSyxFQUFFO0FBQzVDLFVBQUksYUFBYSxLQUFLLElBQUksSUFBSSxhQUFhLEtBQUssS0FBSyxFQUFFO0FBQ3JELFlBQUksR0FBRyxhQUFhLENBQUM7T0FDdEIsTUFBTTtBQUNMLHNCQUFjLEdBQUcsYUFBYSxDQUFDO09BQ2hDO0tBQ0Y7O0FBRUQsUUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUN4QixpQkFBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztLQUMxQjs7QUFFRCxRQUFJLE9BQU8sR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQzs7QUFFL0IsZUFBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN2QixVQUFJLEVBQU0sSUFBSTtBQUNkLGNBQVEsRUFBRSxDQUFDO0FBQ1gsYUFBTyxFQUFHLE9BQU87QUFDakIsYUFBTyxFQUFHLGNBQWM7QUFDeEIsYUFBTyxFQUFHLE9BQU87QUFDakIsVUFBSSxFQUFNLENBQUM7S0FDWixDQUFDLENBQUM7O0FBRUgsV0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztHQUN4RDs7Ozs7QUFLRCxXQUFTLFNBQVMsR0FBRztBQUNuQixRQUFJLGdCQUFnQixFQUFFO0FBQ3BCLG9CQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVCLGFBQU87S0FDUjs7QUFFRCxrQkFBYyxHQUFPLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3RDLG9CQUFnQixHQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4RSxzQkFBa0IsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztHQUNuRTs7Ozs7QUFLRCxXQUFTLGdCQUFnQixHQUFHO0FBQzFCLFFBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUN6QixRQUFJLEdBQUcsRUFBRTtBQUNQLHlCQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLDJCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQzVCLE1BQU07QUFDTCxvQkFBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUM5QjtHQUNGOzs7Ozs7O0FBT0QsV0FBUyxPQUFPLENBQUMsVUFBVSxFQUFFO0FBQzNCLFFBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDdEIsVUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFFeEIsYUFBUyxFQUFFLENBQUM7R0FDYjs7Ozs7O0FBTUQsV0FBUyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUU7QUFDcEMsU0FBSyxJQUFJLEVBQUUsSUFBSSxZQUFZLEVBQUU7QUFDM0Isa0JBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDbkM7R0FDRjs7Ozs7O0FBTUQsV0FBUyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUU7QUFDdEMsUUFBSSxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFBRSxDQUFDLENBQUM7QUFDL0MsUUFBSSxDQUFDLFdBQVcsRUFBRTtBQUNoQixhQUFPO0tBQ1I7O0FBRUQsS0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7O0FBRXZCLFdBQU8sQ0FBQyxFQUFFLEVBQUU7QUFDVixVQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0IsVUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtBQUN0QixlQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztPQUNqQztBQUNELFVBQUksT0FBTyxDQUFDLElBQUksRUFBRTtBQUNoQixtQkFBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO09BQzVDO0tBQ0Y7R0FDRjs7Ozs7OztBQU9ELFdBQVMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUU7QUFDcEMsUUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssU0FBUyxFQUFFO0FBQ3JDLGFBQU87S0FDUjs7QUFFRCxRQUFJLFdBQVcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDO1FBQ2pDLFVBQVUsR0FBSSxDQUFDLENBQUMsQ0FBQzs7QUFFckIsU0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN0RCxVQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssT0FBTyxFQUFFO0FBQ3RDLGtCQUFVLEdBQU8sQ0FBQyxDQUFDO0FBQ25CLG1CQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3JDLG1CQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ2pDLG1CQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO09BQ3ZCO0tBQ0Y7O0FBRUQsUUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDckIsYUFBTztLQUNSOztBQUVELGVBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDOztBQUVsQyxRQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQzVCLGFBQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzVCO0dBQ0Y7Ozs7OztBQU1ELFdBQVMsTUFBTSxHQUFHO0FBQ2hCLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUN0Qjs7Ozs7Ozs7Ozs7Ozs7OztBQWlCRCxXQUFTLGdCQUFnQixDQUFDLE9BQU8sRUFBRTtBQUNqQyxRQUFJLEVBQUUsR0FBYSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDakMsZ0JBQVksQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNqQixRQUFFLEVBQU8sRUFBRTtBQUNYLGFBQU8sRUFBRSxPQUFPO0tBQ2pCLENBQUM7QUFDRixXQUFPLEVBQUUsQ0FBQztHQUNYOzs7Ozs7QUFPRCxXQUFTLGtCQUFrQixDQUFDLEVBQUUsRUFBRTtBQUM5QixRQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUU7QUFDbkMsYUFBTyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDekI7R0FDRjs7QUFFRCxTQUFPO0FBQ0wsYUFBUyxFQUFXLFNBQVM7QUFDN0IsZUFBVyxFQUFTLFdBQVc7QUFDL0IsV0FBTyxFQUFhLE9BQU87QUFDM0IsVUFBTSxFQUFjLE1BQU07QUFDMUIsb0JBQWdCLEVBQUksZ0JBQWdCO0FBQ3BDLHNCQUFrQixFQUFFLGtCQUFrQjtHQUN2QyxDQUFDO0NBRUgsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVUsRUFBRSxDQUFDOzs7Ozs7Ozs7QUNoTzlCLElBQUksc0JBQXNCLEdBQUcsU0FBekIsc0JBQXNCLEdBQWU7O0FBRXZDLE1BQUksUUFBUSxHQUFNLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRTtNQUM5QixXQUFXLEdBQUcsRUFBRSxDQUFDOzs7Ozs7O0FBT3JCLFdBQVMsYUFBYSxDQUFDLElBQUksRUFBRTtBQUMzQixRQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNyQyxpQkFBVyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0tBQ3RDO0FBQ0QsV0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDMUI7Ozs7Ozs7O0FBUUQsV0FBUyxTQUFTLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRTtBQUM1QyxRQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUU7QUFDNUIsYUFBTyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQzNELE1BQU07QUFDTCxhQUFPLFFBQVEsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7S0FDMUM7R0FDRjs7Ozs7O0FBTUQsV0FBUyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUU7QUFDbEMsWUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUMxQjs7Ozs7OztBQU9ELFdBQVMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRTtBQUMxQyxRQUFJLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDcEMsaUJBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDbkMsTUFBTTtBQUNMLGFBQU8sQ0FBQyxJQUFJLENBQUMsNENBQTRDLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDbkU7R0FDRjs7QUFFRCxTQUFPO0FBQ0wsYUFBUyxFQUFZLFNBQVM7QUFDOUIsaUJBQWEsRUFBUSxhQUFhO0FBQ2xDLHFCQUFpQixFQUFJLGlCQUFpQjtBQUN0Qyx1QkFBbUIsRUFBRSxtQkFBbUI7R0FDekMsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQzs7Ozs7OztBQy9EeEMsSUFBSSxRQUFRLEdBQUcsU0FBWCxRQUFRLEdBQWU7QUFDekIsTUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7O0FBRTVELFdBQVMsTUFBTSxDQUFDLE9BQU8sRUFBRTtBQUN2QixRQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsTUFBTTtRQUMvQixJQUFJLEdBQWEsT0FBTyxDQUFDLElBQUk7UUFDN0IsS0FBSztRQUNMLFVBQVUsR0FBTyxRQUFRLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQztRQUN2RCxFQUFFLEdBQWUsT0FBTyxDQUFDLFFBQVEsQ0FBQzs7QUFFdEMsY0FBVSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7O0FBRTFCLFFBQUksSUFBSSxFQUFFO0FBQ1IsV0FBSyxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEMsZ0JBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDL0I7O0FBRUQsUUFBSSxFQUFFLEVBQUU7QUFDTixRQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDWDs7QUFFRCxXQUFPLEtBQUssQ0FBQztHQUNkOztBQUVELFNBQU87QUFDTCxVQUFNLEVBQUUsTUFBTTtHQUNmLENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUSxFQUFFLENBQUM7Ozs7Ozs7O0FDN0I1QixJQUFJLE1BQU0sR0FBRyxTQUFULE1BQU0sR0FBZTs7QUFFdkIsTUFBSSxRQUFRLEdBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFO01BQzVCLHFCQUFxQjtNQUNyQixTQUFTLEdBQUcsT0FBTyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7Ozs7O0FBSzVELFdBQVMsVUFBVSxHQUFHO0FBQ3BCLHlCQUFxQixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztHQUNwRzs7Ozs7OztBQU9ELFdBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRTtBQUMxQixXQUFPLFFBQVEsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDcEM7Ozs7OztBQU1ELFdBQVMsaUJBQWlCLEdBQUc7QUFDM0IsUUFBSSxZQUFZLEdBQUc7QUFDakIsY0FBUSxFQUFFLGVBQWUsRUFBRTtBQUMzQixjQUFRLEVBQUUsY0FBYyxFQUFFO0tBQzNCLENBQUM7O0FBRUYsWUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztHQUMvQjs7Ozs7O0FBTUQsV0FBUyxlQUFlLEdBQUc7QUFDekIsUUFBSSxRQUFRLEdBQU0sY0FBYyxFQUFFO1FBQzlCLEtBQUssR0FBUyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUNqQyxLQUFLLEdBQVMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUIsUUFBUSxHQUFNLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxXQUFXLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDOztBQUUxQyxRQUFJLFFBQVEsS0FBSyxZQUFZLEVBQUU7QUFDN0IsaUJBQVcsR0FBRyxFQUFFLENBQUM7S0FDbEI7O0FBRUQsV0FBTyxFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQyxDQUFDO0dBQzFDOzs7Ozs7O0FBT0QsV0FBUyxhQUFhLENBQUMsUUFBUSxFQUFFO0FBQy9CLFFBQUksR0FBRyxHQUFLLEVBQUU7UUFDVixLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFaEMsU0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRTtBQUMvQixVQUFJLE9BQU8sR0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JDLFNBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDOUIsQ0FBQyxDQUFDOztBQUVILFdBQU8sR0FBRyxDQUFDO0dBQ1o7Ozs7Ozs7QUFPRCxXQUFTLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQzNCLFFBQUksSUFBSSxHQUFHLEtBQUs7UUFDWixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2QsUUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDOUIsVUFBSSxJQUFJLEdBQUcsQ0FBQztBQUNaLFdBQUssSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFO0FBQ3hCLFlBQUksSUFBSSxLQUFLLFdBQVcsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3hELGNBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzNEO09BQ0Y7QUFDRCxVQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN4Qjs7QUFFRCxxQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUN6Qjs7Ozs7OztBQU9ELFdBQVMsY0FBYyxHQUFHO0FBQ3hCLFFBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLFdBQU8sUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztHQUNsRTs7Ozs7O0FBTUQsV0FBUyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUU7QUFDL0IsVUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0dBQzdCOztBQUVELFNBQU87QUFDTCxjQUFVLEVBQVMsVUFBVTtBQUM3QixhQUFTLEVBQVUsU0FBUztBQUM1QixxQkFBaUIsRUFBRSxpQkFBaUI7QUFDcEMsbUJBQWUsRUFBSSxlQUFlO0FBQ2xDLE9BQUcsRUFBZ0IsR0FBRztHQUN2QixDQUFDO0NBRUgsQ0FBQzs7QUFFRixJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQztBQUNqQixDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7O0FBRWYsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7Ozs7Ozs7O0FDMUhuQixNQUFNLENBQUMsT0FBTyxHQUFHO0FBQ2YsS0FBRyxFQUFFLGFBQVUsUUFBUSxFQUFFLEtBQUssRUFBRTtBQUM5QixRQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzFDLFFBQUksQ0FBQyxFQUFFLEVBQUU7QUFDUCxhQUFPLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0FBQ3RFLGFBQU87S0FDUjtBQUNELFdBQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0dBQ2xEOztBQUVELE1BQUksRUFBRSxjQUFVLElBQUksRUFBRTtBQUNwQixXQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ2pDOztBQUVELFVBQVEsRUFBRSxrQkFBVSxFQUFFLEVBQUU7QUFDdEIsV0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUNuQzs7QUFFRCxTQUFPLEVBQUUsaUJBQVUsRUFBRSxFQUFFLE9BQU8sRUFBRTtBQUM5QixXQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQzdDOztBQUVELE1BQUksRUFBRSxjQUFVLEtBQUssRUFBRTtBQUNyQixXQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ2xDOztBQUVELE9BQUssRUFBRSxpQkFBWTtBQUNqQixXQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7R0FDOUI7O0NBRUYsQ0FBQzs7Ozs7Ozs7QUM5QkYsSUFBSSxVQUFVLEdBQUcsU0FBYixVQUFVLEdBQWU7O0FBRTNCLE1BQUksWUFBWSxHQUFTLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO01BQ3hDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO01BQ3hDLGNBQWMsR0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztNQUN4QyxTQUFTLEdBQVksT0FBTyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7O0FBRXJFLFdBQVMsV0FBVyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUU7QUFDN0IsZ0JBQVksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7R0FDekI7O0FBRUQsV0FBUyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUU7QUFDcEMsUUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzlCLFFBQUksTUFBTSxFQUFFO0FBQ1YsYUFBTyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUNsQztBQUNELFdBQU87R0FDUjs7QUFFRCxXQUFTLGlCQUFpQixDQUFDLEVBQUUsRUFBRTtBQUM3QixRQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUM7O0FBRVosUUFBSSxHQUFHLEVBQUU7QUFDUCxhQUFPLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQztLQUN6QixNQUFNO0FBQ0wsYUFBTyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDekUsYUFBTyxHQUFHLDJCQUEyQixHQUFHLEVBQUUsR0FBRyxRQUFRLENBQUM7S0FDdkQ7O0FBRUQsV0FBTyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztHQUNuQzs7Ozs7OztBQU9ELFdBQVMsU0FBUyxDQUFDLEVBQUUsRUFBRTtBQUNyQixRQUFJLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQzFCLGFBQU8sa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDL0I7O0FBRUQsUUFBSSxVQUFVLEdBQUcsd0JBQXdCLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRTlDLFFBQUksQ0FBQyxVQUFVLEVBQUU7QUFDZixnQkFBVSxHQUFHLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ3BDOztBQUVELHNCQUFrQixDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQztBQUNwQyxXQUFPLFVBQVUsQ0FBQztHQUNuQjs7Ozs7O0FBTUQsV0FBUyxpQkFBaUIsR0FBRztBQUMzQixRQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOztBQUV4RixXQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLEVBQUU7QUFDdEMsYUFBTyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLGVBQWUsQ0FBQztLQUNyRCxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFO0FBQ3BCLGFBQU8sR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUMvQixDQUFDLENBQUM7R0FDSjs7Ozs7OztBQU9ELFdBQVMsV0FBVyxDQUFDLEVBQUUsRUFBRTtBQUN2QixRQUFJLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUN0QixhQUFPLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUMzQjtBQUNELFFBQUksS0FBSyxHQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0Msa0JBQWMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDM0IsV0FBTyxLQUFLLENBQUM7R0FDZDs7Ozs7Ozs7QUFRRCxXQUFTLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0FBQ3ZCLFFBQUksSUFBSSxHQUFHLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMzQixXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztHQUNsQjs7Ozs7Ozs7QUFRRCxXQUFTLFNBQVMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0FBQzFCLFdBQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDakQ7Ozs7O0FBS0QsV0FBUyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7QUFDOUIsV0FBTyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7R0FDbkI7Ozs7Ozs7QUFPRCxXQUFTLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtBQUM3QixXQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUNyRTs7Ozs7OztBQU9ELFdBQVMsc0JBQXNCLEdBQUc7QUFDaEMsUUFBSSxHQUFHLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztBQUM5QixPQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFO0FBQ3hCLFVBQUksR0FBRyxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFDLGFBQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3RCLENBQUMsQ0FBQztHQUNKOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JELFNBQU87QUFDTCxlQUFXLEVBQWEsV0FBVztBQUNuQyxhQUFTLEVBQWUsU0FBUztBQUNqQyxxQkFBaUIsRUFBTyxpQkFBaUI7QUFDekMsMEJBQXNCLEVBQUUsc0JBQXNCO0FBQzlDLGVBQVcsRUFBYSxXQUFXO0FBQ25DLFVBQU0sRUFBa0IsTUFBTTtBQUM5QixhQUFTLEVBQWUsU0FBUztHQUNsQyxDQUFDO0NBRUgsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVUsRUFBRSxDQUFDOzs7QUNsSzlCLElBQUksZUFBZSxHQUFHLFNBQWxCLGVBQWUsR0FBZTs7QUFFaEMsTUFBSSxLQUFLO01BQ0wsU0FBUyxHQUFHLE9BQU8sQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDOzs7Ozs7Ozs7O0FBVTVELFdBQVMseUJBQXlCLENBQUMsaUJBQWlCLEVBQUU7QUFDcEQsU0FBSyxHQUFHLElBQUksQ0FBQzs7QUFFYixnQ0FBNEIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0dBQ2pEOzs7Ozs7QUFNRCxXQUFTLDRCQUE0QixDQUFDLFNBQVMsRUFBRTtBQUMvQyxRQUFJLENBQUMsU0FBUyxFQUFFO0FBQ2QsYUFBTztLQUNSOztBQUVELFFBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRTVDLGFBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxLQUFLLEVBQUU7QUFDakMsWUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbkcsQ0FBQyxDQUFDO0dBQ0o7Ozs7O0FBS0QsV0FBUyxvQkFBb0IsR0FBRztBQUM5QixRQUFJLEtBQUssR0FBSyxRQUFRLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDO1FBQzFELE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLDBCQUEwQixDQUFDLENBQUM7O0FBRWpFLGFBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUNyQixXQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxzQkFBWTtBQUNwRCxhQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztPQUNyQztLQUNGLENBQUMsQ0FBQzs7QUFFSCxhQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUU7QUFDdkIsU0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsc0JBQVk7QUFDeEQsYUFBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztPQUM1QjtLQUNGLENBQUMsQ0FBQztHQUNKOzs7Ozs7QUFNRCxTQUFPO0FBQ0wsNkJBQXlCLEVBQUUseUJBQXlCO0FBQ3BELHdCQUFvQixFQUFPLG9CQUFvQjtHQUNoRCxDQUFDO0NBRUgsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLGVBQWUsRUFBRSxDQUFDOzs7Ozs7O0FDOURuQyxJQUFJLG1CQUFtQixHQUFHLFNBQXRCLG1CQUFtQixHQUFlOztBQUVwQyxNQUFJLGlCQUFpQixHQUFjLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO01BQ2xELDRCQUE0QixHQUFHLFlBQVk7TUFDM0MsU0FBUyxHQUFzQixPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQzs7Ozs7O0FBTXJFLFdBQVMsV0FBVyxHQUFHO0FBQ3JCLFdBQU8sU0FBUyxDQUFDO0dBQ2xCOzs7Ozs7Ozs7OztBQVdELFdBQVMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRTtBQUNuRSxRQUFJLFlBQVksQ0FBQzs7QUFFakIsUUFBSSxPQUFPLGdCQUFnQixLQUFLLFFBQVEsRUFBRTtBQUN4QyxVQUFJLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ2pELGtCQUFZLEdBQVcsbUJBQW1CLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLENBQUM7S0FDbEUsTUFBTTtBQUNMLGtCQUFZLEdBQUcsZ0JBQWdCLENBQUM7S0FDakM7O0FBRUQscUJBQWlCLENBQUMsV0FBVyxDQUFDLEdBQUc7QUFDL0Isa0JBQVksRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLDRCQUE0QixHQUFHLFdBQVcsQ0FBQztBQUMvRSxnQkFBVSxFQUFJLFlBQVk7QUFDMUIsZ0JBQVUsRUFBSSxVQUFVO0tBQ3pCLENBQUM7R0FDSDs7Ozs7OztBQU9ELFdBQVMsbUJBQW1CLENBQUMsZUFBZSxFQUFFO0FBQzVDLFdBQU8sWUFBWTtBQUNqQixVQUFJLG9CQUFvQixHQUFJLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztVQUNyRCxxQkFBcUIsR0FBRyxPQUFPLENBQUMsMEJBQTBCLENBQUM7VUFDM0QsaUJBQWlCLEdBQU8sT0FBTyxDQUFDLG9DQUFvQyxDQUFDO1VBQ3JFLGtCQUFrQixHQUFNLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQztVQUMxRCxpQkFBaUI7VUFBRSxjQUFjO1VBQUUsa0JBQWtCLENBQUM7O0FBRTFELHVCQUFpQixHQUFHLENBQ2xCLG9CQUFvQixFQUFFLEVBQ3RCLHFCQUFxQixFQUFFLEVBQ3ZCLGlCQUFpQixFQUFFLEVBQ25CLGtCQUFrQixFQUFFLEVBQ3BCLGVBQWUsQ0FDaEIsQ0FBQzs7QUFFRixVQUFJLGVBQWUsQ0FBQyxNQUFNLEVBQUU7QUFDMUIseUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztPQUN0RTs7QUFFRCxvQkFBYyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7OztBQUd6RCx3QkFBa0IsR0FBVSxjQUFjLENBQUMsVUFBVSxDQUFDO0FBQ3RELG9CQUFjLENBQUMsVUFBVSxHQUFHLFNBQVMsVUFBVSxDQUFDLE9BQU8sRUFBRTtBQUN2RCxzQkFBYyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLDBCQUFrQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7T0FDbEQsQ0FBQzs7QUFFRixhQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0tBQ3JDLENBQUM7R0FDSDs7Ozs7OztBQU9ELFdBQVMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRTtBQUNsRCxRQUFJLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNuRCxRQUFJLENBQUMsYUFBYSxFQUFFO0FBQ2xCLGFBQU8sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEdBQUcsV0FBVyxDQUFDLENBQUM7QUFDL0QsYUFBTztLQUNSOztBQUVELFFBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxFQUFFO0FBQzdDLGdCQUFVLEdBQUcsVUFBVSxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUM7QUFDcEQsbUJBQWEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO0FBQ2xDLFVBQUUsRUFBVSxXQUFXO0FBQ3ZCLGdCQUFRLEVBQUksYUFBYSxDQUFDLFlBQVk7QUFDdEMsa0JBQVUsRUFBRSxVQUFVO09BQ3ZCLENBQUMsQ0FBQztLQUNKLE1BQU07QUFDTCxtQkFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUNuQzs7QUFFRCxpQkFBYSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUMzQyxpQkFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztHQUNsQzs7Ozs7O0FBTUQsV0FBUyxtQkFBbUIsR0FBRztBQUM3QixXQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7R0FDeEM7Ozs7OztBQU1ELFNBQU87QUFDTCxZQUFRLEVBQWEsV0FBVztBQUNoQyxvQkFBZ0IsRUFBSyxnQkFBZ0I7QUFDckMsdUJBQW1CLEVBQUUsbUJBQW1CO0FBQ3hDLHFCQUFpQixFQUFJLGlCQUFpQjtBQUN0Qyx1QkFBbUIsRUFBRSxtQkFBbUI7R0FDekMsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxtQkFBbUIsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNwSHZDLElBQUksbUJBQW1CLEdBQUcsU0FBdEIsbUJBQW1CLEdBQWU7O0FBRXBDLE1BQUksVUFBVTtNQUNWLGlCQUFpQjtNQUNqQixHQUFHLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDOztBQUVqQyxXQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUU7QUFDekIsY0FBVSxHQUFHLE1BQU0sQ0FBQztHQUNyQjs7QUFFRCxXQUFTLFNBQVMsR0FBRztBQUNuQixXQUFPLFVBQVUsQ0FBQztHQUNuQjs7Ozs7OztBQU9ELFdBQVMsY0FBYyxHQUFHO0FBQ3hCLFFBQUksQ0FBQyxVQUFVLEVBQUU7QUFDZixhQUFPO0tBQ1I7O0FBRUQscUJBQWlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFeEMsU0FBSyxJQUFJLFVBQVUsSUFBSSxVQUFVLEVBQUU7QUFDakMsVUFBSSxVQUFVLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFOztBQUV6QyxZQUFJLFFBQVEsR0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUNwQyxZQUFZLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDOztBQUUxQyxZQUFJLENBQUMsRUFBRSxZQUFTLENBQUMsWUFBWSxDQUFDLEVBQUU7QUFDOUIsaUJBQU8sQ0FBQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsVUFBVSxHQUFHLG9CQUFvQixDQUFDLENBQUM7QUFDakYsaUJBQU87U0FDUjs7OztBQUlELGdCQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsTUFBTSxFQUFFO0FBQ2pDLGdCQUFNLEdBQTBCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUM5QyxjQUFJLFFBQVEsR0FBb0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7Y0FDdkQsUUFBUSxHQUFvQixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQzVELDJCQUFpQixDQUFDLFVBQVUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQ2pGLENBQUMsQ0FBQzs7T0FFSjtLQUNGO0dBQ0Y7O0FBRUQsV0FBUyxhQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUU7QUFDdkQsV0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7R0FDNUQ7Ozs7O0FBS0QsV0FBUyxnQkFBZ0IsR0FBRztBQUMxQixRQUFJLENBQUMsVUFBVSxFQUFFO0FBQ2YsYUFBTztLQUNSOztBQUVELFNBQUssSUFBSSxLQUFLLElBQUksaUJBQWlCLEVBQUU7QUFDbkMsdUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDbkMsYUFBTyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNqQzs7QUFFRCxxQkFBaUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ3pDOztBQUVELFNBQU87QUFDTCxhQUFTLEVBQVMsU0FBUztBQUMzQixhQUFTLEVBQVMsU0FBUztBQUMzQixvQkFBZ0IsRUFBRSxnQkFBZ0I7QUFDbEMsa0JBQWMsRUFBSSxjQUFjO0dBQ2pDLENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsbUJBQW1CLENBQUM7OztBQzlGckMsSUFBSSxtQkFBbUIsR0FBRyxTQUF0QixtQkFBbUIsR0FBZTs7QUFFcEMsTUFBSSxpQkFBaUIsR0FBSSxPQUFPLENBQUMsc0NBQXNDLENBQUM7TUFDcEUsWUFBWSxHQUFTLE9BQU8sQ0FBQyx3Q0FBd0MsQ0FBQztNQUN0RSxlQUFlLEdBQU0sT0FBTyxDQUFDLDJDQUEyQyxDQUFDO01BQ3pFLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyw4Q0FBOEMsQ0FBQztNQUM1RSxlQUFlLEdBQU0sT0FBTyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7O0FBRTlFLFdBQVMsd0JBQXdCLEdBQUc7QUFDbEMsZ0JBQVksQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUM5QyxxQkFBaUIsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNqRCxtQkFBZSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3BELG1CQUFlLENBQUMsVUFBVSxFQUFFLENBQUM7R0FDOUI7O0FBRUQsV0FBUyxTQUFTLEdBQUc7QUFDbkIsV0FBTyxrQkFBa0IsQ0FBQztHQUMzQjs7QUFFRCxXQUFTLGFBQWEsQ0FBQyxHQUFHLEVBQUU7QUFDMUIsV0FBTyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ2pDOztBQUVELFdBQVMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFO0FBQzVCLG1CQUFlLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQzVCOztBQUVELFdBQVMsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUU7QUFDN0IsV0FBTyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztHQUNyRDs7QUFFRCxXQUFTLGVBQWUsQ0FBQyxHQUFHLEVBQUU7QUFDNUIsV0FBTyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDbkM7O0FBRUQsV0FBUyxNQUFNLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7QUFDcEMsV0FBTyxlQUFlLENBQUM7QUFDckIsV0FBSyxFQUFJLEtBQUssSUFBSSxFQUFFO0FBQ3BCLFVBQUksRUFBSyxJQUFJLElBQUksaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTztBQUNqRCxhQUFPLEVBQUUsT0FBTztLQUNqQixDQUFDLENBQUM7R0FDSjs7QUFFRCxTQUFPO0FBQ0wsNEJBQXdCLEVBQUUsd0JBQXdCO0FBQ2xELGFBQVMsRUFBaUIsU0FBUztBQUNuQyxpQkFBYSxFQUFhLGFBQWE7QUFDdkMsb0JBQWdCLEVBQVUsZ0JBQWdCO0FBQzFDLG1CQUFlLEVBQVcsZUFBZTtBQUN6QyxTQUFLLEVBQXFCLEtBQUs7QUFDL0IsVUFBTSxFQUFvQixNQUFNO0dBQ2pDLENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQzs7Ozs7OztBQ25EdkMsSUFBSSxvQkFBb0IsR0FBRyxTQUF2QixvQkFBb0IsR0FBZTs7QUFFckMsTUFBSSxLQUFLO01BQ0wsYUFBYTtNQUNiLGNBQWM7TUFDZCxrQkFBa0I7TUFDbEIsb0JBQW9CO01BQ3BCLGVBQWUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7OztBQUsxQyxXQUFTLG9CQUFvQixDQUFDLEtBQUssRUFBRTtBQUNuQyxTQUFLLEdBQUcsSUFBSSxDQUFDO0FBQ2IsaUJBQWEsR0FBRyxLQUFLLENBQUM7O0FBRXRCLFFBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBRWpDLGlCQUFhLENBQUMsU0FBUyxDQUFDLFNBQVMsYUFBYSxHQUFHO0FBQy9DLHVCQUFpQixFQUFFLENBQUM7S0FDckIsQ0FBQyxDQUFDO0dBQ0o7Ozs7OztBQU1ELFdBQVMsaUJBQWlCLEdBQUc7QUFDM0IsZ0NBQTRCLEVBQUUsQ0FBQztHQUNoQzs7QUFFRCxXQUFTLDRCQUE0QixHQUFHO0FBQ3RDLFFBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUM7QUFDbEQsUUFBSSxLQUFLLEVBQUU7QUFDVCxVQUFJLEtBQUssS0FBSyxrQkFBa0IsRUFBRTtBQUNoQywwQkFBa0IsR0FBRyxLQUFLLENBQUM7QUFDM0IsOEJBQXNCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7T0FDeEQ7S0FDRjtHQUNGOzs7Ozs7O0FBT0QsV0FBUyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUU7QUFDL0Isd0JBQW9CLEdBQUcsSUFBSSxDQUFDO0dBQzdCOztBQUVELFdBQVMsaUJBQWlCLEdBQUc7QUFDM0IsV0FBTyxvQkFBb0IsQ0FBQztHQUM3Qjs7Ozs7OztBQU9ELFdBQVMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRTtBQUNwRSxtQkFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLFVBQVUsQ0FBQztBQUNwQyxRQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLENBQUM7R0FDM0U7Ozs7OztBQU1ELFdBQVMsc0JBQXNCLENBQUMsS0FBSyxFQUFFO0FBQ3JDLFFBQUksV0FBVyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6QyxRQUFJLENBQUMsV0FBVyxFQUFFO0FBQ2hCLGFBQU8sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEdBQUcsS0FBSyxDQUFDLENBQUM7QUFDbkQsYUFBTztLQUNSOztBQUVELHFCQUFpQixFQUFFLENBQUM7O0FBRXBCLGtCQUFjLEdBQUcsV0FBVyxDQUFDO0FBQzdCLFFBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQzs7O0FBR3ZDLGFBQVMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUNoRCxhQUFTLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLElBQUksRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDOztBQUV4RSxRQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0dBQ3JEOzs7OztBQUtELFdBQVMsaUJBQWlCLEdBQUc7QUFDM0IsUUFBSSxjQUFjLEVBQUU7QUFDbEIsV0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO0tBQ2xFO0FBQ0Qsa0JBQWMsR0FBRyxFQUFFLENBQUM7R0FDckI7O0FBRUQsU0FBTztBQUNMLHdCQUFvQixFQUFVLG9CQUFvQjtBQUNsRCxnQ0FBNEIsRUFBRSw0QkFBNEI7QUFDMUQsMEJBQXNCLEVBQVEsc0JBQXNCO0FBQ3BELHFCQUFpQixFQUFhLGlCQUFpQjtBQUMvQyxxQkFBaUIsRUFBYSxpQkFBaUI7QUFDL0MsMkJBQXVCLEVBQU8sdUJBQXVCO0dBQ3RELENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsb0JBQW9CLEVBQUUsQ0FBQzs7Ozs7Ozs7QUMzR3hDLElBQUksYUFBYSxHQUFHLFNBQWhCLGFBQWEsR0FBZTs7QUFFOUIsTUFBSSxjQUFjLEdBQUcsS0FBSztNQUN0QixZQUFZO01BQ1osR0FBRztNQUNILFlBQVk7TUFDWixLQUFLO01BQ0wsV0FBVztNQUNYLFdBQVc7TUFDWCxTQUFTLEdBQVEsRUFBRTtNQUNuQixVQUFVLEdBQU8sS0FBSztNQUN0QixTQUFTLEdBQVEsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Ozs7OztBQU1sRCxXQUFTLG1CQUFtQixDQUFDLFdBQVcsRUFBRTtBQUN4QyxnQkFBWSxHQUFHLFdBQVcsQ0FBQztBQUMzQixPQUFHLEdBQVksV0FBVyxDQUFDLEVBQUUsQ0FBQztBQUM5QixnQkFBWSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7QUFDcEMsZUFBVyxHQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUM7O0FBRXRDLFFBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7QUFDdEMsUUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQzs7QUFFcEMsUUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM3QixRQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVCLFFBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7O0FBRTlCLGtCQUFjLEdBQUcsSUFBSSxDQUFDO0dBQ3ZCOztBQUVELFdBQVMsWUFBWSxHQUFHO0FBQ3RCLFdBQU8sU0FBUyxDQUFDO0dBQ2xCOzs7Ozs7QUFNRCxXQUFTLE9BQU8sQ0FBQyxVQUFVLEVBQUU7QUFDM0IsUUFBSSxHQUFHLENBQUM7O0FBRVIsUUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ3pCLFNBQUcsR0FBRyxVQUFVLENBQUM7S0FDbEIsTUFBTTtBQUNMLFNBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNwRjs7QUFFRCxRQUFJLENBQUMsR0FBRyxFQUFFO0FBQ1IsYUFBTyxDQUFDLElBQUksQ0FBQyx5REFBeUQsR0FBRyxVQUFVLENBQUMsQ0FBQztBQUNyRixhQUFPO0tBQ1I7O0FBRUQsUUFBSSxDQUFDLEVBQUUsWUFBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUMvQixhQUFPLENBQUMsSUFBSSxDQUFDLGtFQUFrRSxHQUFHLFVBQVUsQ0FBQyxDQUFDO0FBQzlGLGFBQU87S0FDUjs7QUFFRCxPQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7R0FDdkM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdCRCxXQUFTLG1CQUFtQixHQUFHO0FBQzdCLFdBQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0dBQ3hCOztBQUVELFdBQVMsTUFBTSxHQUFHO0FBQ2hCLFFBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNuQyxRQUFJLFNBQVMsR0FBTSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQzs7QUFFOUMsUUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLEVBQUU7QUFDekMsVUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQzs7Ozs7QUFLekIsVUFBSSxVQUFVLEVBQUU7QUFDZCxZQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsRUFBRTtBQUM1QyxjQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDZixjQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7QUFDdkIsY0FBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ2Q7T0FDRjtBQUNELFVBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7S0FDbEQ7R0FDRjs7Ozs7OztBQU9ELFdBQVMscUJBQXFCLENBQUMsU0FBUyxFQUFFO0FBQ3hDLFdBQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztHQUM3Qjs7Ozs7O0FBTUQsV0FBUyxlQUFlLEdBQUc7Ozs7O0FBS3pCLFNBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0dBRXRDOzs7Ozs7O0FBT0QsV0FBUyxNQUFNLENBQUMsS0FBSyxFQUFFO0FBQ3JCLFdBQU8sWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQzVCOzs7Ozs7QUFNRCxXQUFTLEtBQUssR0FBRztBQUNmLFFBQUksQ0FBQyxLQUFLLEVBQUU7QUFDVixZQUFNLElBQUksS0FBSyxDQUFDLFlBQVksR0FBRyxHQUFHLEdBQUcsa0RBQWtELENBQUMsQ0FBQztLQUMxRjs7QUFFRCxjQUFVLEdBQUcsSUFBSSxDQUFDOztBQUVsQixlQUFXLEdBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUM5QixZQUFNLEVBQUUsV0FBVztBQUNuQixVQUFJLEVBQUksS0FBSztLQUNkLENBQUMsQUFBQyxDQUFDOztBQUVKLFFBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtBQUN2QixVQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7S0FDdkI7O0FBRUQsUUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7QUFDMUIsVUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7S0FDMUI7O0FBRUQsUUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztHQUNqRDs7Ozs7QUFLRCxXQUFTLGlCQUFpQixHQUFHLEVBRTVCOzs7Ozs7QUFBQSxBQUtELFdBQVMsb0JBQW9CLEdBQUc7O0dBRS9COztBQUVELFdBQVMsT0FBTyxHQUFHO0FBQ2pCLFFBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0FBQzVCLGNBQVUsR0FBRyxLQUFLLENBQUM7O0FBRW5CLFFBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQ3pCLFVBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0tBQ3pCOztBQUVELGFBQVMsQ0FBQyxNQUFNLENBQUM7QUFDZixZQUFNLEVBQUUsV0FBVztBQUNuQixVQUFJLEVBQUksRUFBRTtLQUNYLENBQUMsQ0FBQzs7QUFFSCxTQUFLLEdBQVMsRUFBRSxDQUFDO0FBQ2pCLGVBQVcsR0FBRyxJQUFJLENBQUM7QUFDbkIsUUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztHQUNuRDs7Ozs7O0FBTUQsV0FBUyxhQUFhLEdBQUc7QUFDdkIsV0FBTyxjQUFjLENBQUM7R0FDdkI7O0FBRUQsV0FBUyxjQUFjLEdBQUc7QUFDeEIsV0FBTyxZQUFZLENBQUM7R0FDckI7O0FBRUQsV0FBUyxTQUFTLEdBQUc7QUFDbkIsV0FBTyxVQUFVLENBQUM7R0FDbkI7O0FBRUQsV0FBUyxlQUFlLEdBQUc7QUFDekIsUUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUNuQjs7QUFFRCxXQUFTLEtBQUssR0FBRztBQUNmLFdBQU8sR0FBRyxDQUFDO0dBQ1o7O0FBRUQsV0FBUyxhQUFhLEdBQUc7QUFDdkIsV0FBTyxXQUFXLENBQUM7R0FDcEI7O0FBRUQsV0FBUyxXQUFXLEdBQUc7QUFDckIsV0FBTyxZQUFZLENBQUM7R0FDckI7O0FBRUQsV0FBUyxXQUFXLENBQUMsSUFBSSxFQUFFO0FBQ3pCLGdCQUFZLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNqQzs7Ozs7Ozs7OztBQVdELFNBQU87QUFDTCx1QkFBbUIsRUFBRSxtQkFBbUI7QUFDeEMsZ0JBQVksRUFBUyxZQUFZO0FBQ2pDLGlCQUFhLEVBQVEsYUFBYTtBQUNsQyxrQkFBYyxFQUFPLGNBQWM7QUFDbkMsbUJBQWUsRUFBTSxlQUFlO0FBQ3BDLFNBQUssRUFBZ0IsS0FBSztBQUMxQixlQUFXLEVBQVUsV0FBVztBQUNoQyxlQUFXLEVBQVUsV0FBVztBQUNoQyxpQkFBYSxFQUFRLGFBQWE7QUFDbEMsYUFBUyxFQUFZLFNBQVM7O0FBRTlCLFdBQU8sRUFBRSxPQUFPOztBQUVoQix1QkFBbUIsRUFBSSxtQkFBbUI7QUFDMUMseUJBQXFCLEVBQUUscUJBQXFCO0FBQzVDLFVBQU0sRUFBaUIsTUFBTTs7QUFFN0IsbUJBQWUsRUFBRSxlQUFlO0FBQ2hDLFVBQU0sRUFBVyxNQUFNOztBQUV2QixTQUFLLEVBQWMsS0FBSztBQUN4QixxQkFBaUIsRUFBRSxpQkFBaUI7O0FBRXBDLHdCQUFvQixFQUFFLG9CQUFvQjtBQUMxQyxXQUFPLEVBQWUsT0FBTzs7Ozs7R0FLOUIsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUM7OztBQzVSL0IsSUFBSSxXQUFXLEdBQUc7O0FBRWhCLFlBQVUsRUFBRyxTQUFTLENBQUMsVUFBVTtBQUNqQyxXQUFTLEVBQUksU0FBUyxDQUFDLFNBQVM7QUFDaEMsTUFBSSxFQUFTLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUN0RCxPQUFLLEVBQVEsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDckUsT0FBSyxFQUFRLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQ3JFLE9BQUssRUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUNyRSxPQUFLLEVBQVEsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDckUsTUFBSSxFQUFTLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztBQUN6RCxVQUFRLEVBQUssQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQ3hELE9BQUssRUFBUSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7QUFDM0QsYUFBVyxFQUFFLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQzs7QUFFbEosVUFBUSxFQUFNLGNBQWMsSUFBSSxRQUFRLENBQUMsZUFBZTtBQUN4RCxjQUFZLEVBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQUFBQzs7QUFFcEUsUUFBTSxFQUFFO0FBQ04sV0FBTyxFQUFLLG1CQUFZO0FBQ3RCLGFBQU8sU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDOUM7QUFDRCxjQUFVLEVBQUUsc0JBQVk7QUFDdEIsYUFBTyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztLQUM3RjtBQUNELE9BQUcsRUFBUyxlQUFZO0FBQ3RCLGFBQU8sU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztLQUN2RDtBQUNELFNBQUssRUFBTyxpQkFBWTtBQUN0QixhQUFPLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0tBQ2pEO0FBQ0QsV0FBTyxFQUFLLG1CQUFZO0FBQ3RCLGFBQU8sU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDL0M7QUFDRCxPQUFHLEVBQVMsZUFBWTtBQUN0QixhQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQSxLQUFNLElBQUksQ0FBQztLQUN2Rzs7R0FFRjs7O0FBR0QsVUFBUSxFQUFFLG9CQUFZO0FBQ3BCLFdBQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztHQUN6RDs7QUFFRCxpQkFBZSxFQUFFLDJCQUFZO0FBQzNCLFdBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxZQUFZLEdBQUcsV0FBVyxDQUFDO0dBQ3ZEOztBQUVELGVBQWEsRUFBRSx5QkFBWTtBQUN6QixXQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FBQztHQUNuRDs7QUFFRCxrQkFBZ0IsRUFBRSw0QkFBWTtBQUM1QixXQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsVUFBVSxHQUFHLE9BQU8sQ0FBQztHQUNqRDs7QUFFRCxpQkFBZSxFQUFFLDJCQUFZO0FBQzNCLFdBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFXLEdBQUcsV0FBVyxDQUFDO0dBQ3REOztDQUVGLENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7OztBQzlEN0IsTUFBTSxDQUFDLE9BQU8sR0FBRzs7OztBQUlmLDZCQUEyQixFQUFFLHFDQUFVLEVBQUUsRUFBRTtBQUN6QyxRQUFJLElBQUksR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQztBQUN0QyxXQUNFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUNiLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUNkLElBQUksQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQSxBQUFDLElBQzVFLElBQUksQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQSxBQUFDLENBQ3pFO0dBQ0g7OztBQUdELHFCQUFtQixFQUFFLDZCQUFVLEVBQUUsRUFBRTtBQUNqQyxRQUFJLElBQUksR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQztBQUN0QyxXQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFDZCxJQUFJLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUEsQUFBQyxJQUN2RSxJQUFJLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUEsQUFBQyxDQUFDO0dBQzVFOztBQUVELFVBQVEsRUFBRSxrQkFBVSxHQUFHLEVBQUU7QUFDdkIsV0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLFFBQVEsSUFBSyxHQUFHLEtBQUssTUFBTSxDQUFDLEFBQUMsQ0FBQztHQUM3Qzs7QUFFRCxVQUFRLEVBQUUsa0JBQVUsRUFBRSxFQUFFO0FBQ3RCLFdBQU87QUFDTCxVQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVU7QUFDbkIsU0FBRyxFQUFHLEVBQUUsQ0FBQyxTQUFTO0tBQ25CLENBQUM7R0FDSDs7O0FBR0QsUUFBTSxFQUFFLGdCQUFVLEVBQUUsRUFBRTtBQUNwQixRQUFJLEVBQUUsR0FBRyxDQUFDO1FBQ04sRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNYLFFBQUksRUFBRSxDQUFDLFlBQVksRUFBRTtBQUNuQixTQUFHO0FBQ0QsVUFBRSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7QUFDcEIsVUFBRSxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7T0FDcEIsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksRUFBRTtLQUNoQztBQUNELFdBQU87QUFDTCxVQUFJLEVBQUUsRUFBRTtBQUNSLFNBQUcsRUFBRyxFQUFFO0tBQ1QsQ0FBQztHQUNIOztBQUVELG1CQUFpQixFQUFFLDJCQUFVLEVBQUUsRUFBRTtBQUMvQixXQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUU7QUFDcEIsUUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDL0I7R0FDRjs7O0FBR0QsZUFBYSxFQUFFLHVCQUFVLEdBQUcsRUFBRTtBQUM1QixRQUFJLElBQUksR0FBUyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQy9DLFFBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO0FBQ3JCLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztHQUN4Qjs7QUFFRCxhQUFXLEVBQUUscUJBQVUsVUFBVSxFQUFFLEVBQUUsRUFBRTtBQUNyQyxRQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztRQUMxQyxRQUFRLEdBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQzs7QUFFOUIsYUFBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMxQixZQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hDLFdBQU8sU0FBUyxDQUFDO0dBQ2xCOzs7QUFHRCxTQUFPLEVBQUUsaUJBQVUsRUFBRSxFQUFFLFFBQVEsRUFBRTtBQUMvQixRQUFJLGVBQWUsR0FBRyxFQUFFLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDO0FBQzlHLFdBQU8sRUFBRSxFQUFFO0FBQ1QsVUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQ3RDLGVBQU8sRUFBRSxDQUFDO09BQ1gsTUFBTTtBQUNMLFVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO09BQ3ZCO0tBQ0Y7QUFDRCxXQUFPLEtBQUssQ0FBQztHQUNkOzs7QUFHRCxVQUFRLEVBQUUsa0JBQVUsRUFBRSxFQUFFLFNBQVMsRUFBRTtBQUNqQyxRQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUU7QUFDaEIsUUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDbEMsTUFBTTtBQUNMLFVBQUksTUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLEdBQUcsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDcEU7R0FDRjs7QUFFRCxVQUFRLEVBQUUsa0JBQVUsRUFBRSxFQUFFLFNBQVMsRUFBRTtBQUNqQyxRQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUU7QUFDaEIsUUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDN0IsTUFBTTtBQUNMLFFBQUUsQ0FBQyxTQUFTLElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQztLQUNqQztHQUNGOztBQUVELGFBQVcsRUFBRSxxQkFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFO0FBQ3BDLFFBQUksRUFBRSxDQUFDLFNBQVMsRUFBRTtBQUNoQixRQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNoQyxNQUFNO0FBQ0wsUUFBRSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3BIO0dBQ0Y7O0FBRUQsYUFBVyxFQUFFLHFCQUFVLEVBQUUsRUFBRSxTQUFTLEVBQUU7QUFDcEMsUUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRTtBQUNoQyxVQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztLQUNqQyxNQUFNO0FBQ0wsVUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDOUI7R0FDRjs7O0FBR0QsVUFBUSxFQUFFLGtCQUFVLEVBQUUsRUFBRSxLQUFLLEVBQUU7QUFDN0IsUUFBSSxHQUFHLEVBQUUsSUFBSSxDQUFDO0FBQ2QsU0FBSyxHQUFHLElBQUksS0FBSyxFQUFFO0FBQ2pCLFVBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUM3QixVQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztPQUM1QjtLQUNGO0FBQ0QsV0FBTyxFQUFFLENBQUM7R0FDWDs7Ozs7QUFLRCxvQkFBa0IsRUFBRSw0QkFBVSxNQUFNLEVBQUU7QUFDcEMsUUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTTtRQUMzQyxNQUFNLEdBQUcsTUFBTSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsS0FBSztRQUN6QyxLQUFLLEdBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxNQUFNLEdBQUcsTUFBTSxDQUFDOztBQUUvQyxRQUFJLE1BQU0sQ0FBQyxRQUFRLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUU7QUFDOUMsV0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7S0FDekI7O0FBRUQsUUFBSSxNQUFNLENBQUMsUUFBUSxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFO0FBQzlDLFdBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO0tBQ3pCOztBQUVELFdBQU8sS0FBSyxDQUFDO0dBQ2Q7Ozs7O0FBS0Qsc0JBQW9CLEVBQUUsOEJBQVUsRUFBRSxFQUFFLEdBQUcsRUFBRTtBQUN2QyxXQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7R0FDaEU7O0FBRUQseUJBQXVCLEVBQUUsaUNBQVUsRUFBRSxFQUFFO0FBQ3JDLFFBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxXQUFXO1FBQ3hCLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVTtRQUN2QixHQUFHLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixFQUFFO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTTtRQUNoQixHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQzs7QUFFcEIsTUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQUFBQyxHQUFHLEdBQUcsQ0FBQyxHQUFLLEdBQUcsR0FBRyxDQUFDLEFBQUMsR0FBRyxJQUFJLENBQUM7QUFDN0MsTUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUksQUFBQyxHQUFHLEdBQUcsQ0FBQyxHQUFLLEdBQUcsR0FBRyxDQUFDLEFBQUMsR0FBRyxJQUFJLENBQUM7R0FDOUM7Ozs7Ozs7QUFPRCxpQkFBZSxFQUFFLHlCQUFVLEVBQUUsRUFBRTtBQUM3QixRQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUM3QixXQUFXO1FBQUUsUUFBUTtRQUFFLFNBQVMsQ0FBQzs7QUFFckMsZUFBVyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0UsWUFBUSxHQUFNLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDMUUsYUFBUyxHQUFLLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7O0FBRTNFLGVBQVcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN0QyxZQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDbkMsYUFBUyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOztBQUVyQyxXQUFPLE9BQU8sQ0FBQzs7QUFFZixhQUFTLGdCQUFnQixDQUFDLE1BQU0sRUFBRTtBQUNoQyxhQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztLQUMvQzs7QUFFRCxhQUFTLGlCQUFpQixDQUFDLE1BQU0sRUFBRTtBQUNqQyxVQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsYUFBYTtVQUFFLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDekMsVUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFO0FBQ1osV0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO09BQ2pDO0FBQ0QsYUFBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztLQUN0Qzs7QUFFRCxhQUFTLGFBQWEsQ0FBQyxNQUFNLEVBQUU7QUFDN0IsVUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDO0FBQ3JCLFVBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUMvQixZQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztPQUNwQyxNQUFNLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNwQyxZQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNsQztBQUNELGFBQU8sSUFBSSxDQUFDO0tBQ2I7R0FDRjs7Q0FFRixDQUFDOzs7QUNoTkYsTUFBTSxDQUFDLE9BQU8sR0FBRzs7Ozs7O0FBTWYsb0JBQWtCLEVBQUUsNEJBQVUsRUFBRSxFQUFFO0FBQ2hDLGFBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO0FBQ2hCLFNBQUcsRUFBRTtBQUNILG1CQUFXLEVBQVEsR0FBRztBQUN0Qix5QkFBaUIsRUFBRSxTQUFTO09BQzdCO0tBQ0YsQ0FBQyxDQUFDO0dBQ0o7Ozs7OztBQU1ELGtCQUFnQixFQUFFLDBCQUFVLEVBQUUsRUFBRTtBQUM5QixhQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRTtBQUNoQixTQUFHLEVBQUU7QUFDSCxzQkFBYyxFQUFNLGFBQWE7QUFDakMsMEJBQWtCLEVBQUUsUUFBUTtBQUM1Qix1QkFBZSxFQUFLLFNBQVM7T0FDOUI7S0FDRixDQUFDLENBQUM7R0FDSjs7Ozs7O0FBTUQsd0JBQXNCLEVBQUUsZ0NBQVUsRUFBRSxFQUFFO0FBQ3BDLGFBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO0FBQ2hCLFNBQUcsRUFBRTtBQUNILHNCQUFjLEVBQVEsYUFBYTtBQUNuQywwQkFBa0IsRUFBSSxRQUFRO0FBQzlCLDRCQUFvQixFQUFFLEdBQUc7QUFDekIsdUJBQWUsRUFBTyxTQUFTO09BQ2hDO0tBQ0YsQ0FBQyxDQUFDO0dBQ0o7O0NBRUYsQ0FBQzs7O0FDNUNGLElBQUksaUJBQWlCLEdBQUcsU0FBcEIsaUJBQWlCLEdBQWU7O0FBRWxDLE1BQUksZUFBZSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDOztBQUVsRCxXQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7QUFDeEMsV0FBTyxlQUFlLENBQUMsR0FBRyxDQUFDO0FBQ3pCLFdBQUssRUFBSSxLQUFLO0FBQ2QsYUFBTyxFQUFFLEtBQUssR0FBRyxPQUFPLEdBQUcsTUFBTTtBQUNqQyxVQUFJLEVBQUssZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU07QUFDdEMsV0FBSyxFQUFJLEtBQUs7QUFDZCxXQUFLLEVBQUksR0FBRztBQUNaLGFBQU8sRUFBRSxDQUNQO0FBQ0UsYUFBSyxFQUFJLE9BQU87QUFDaEIsVUFBRSxFQUFPLE9BQU87QUFDaEIsWUFBSSxFQUFLLEVBQUU7QUFDWCxZQUFJLEVBQUssT0FBTztBQUNoQixlQUFPLEVBQUUsRUFBRTtPQUNaLENBQ0Y7S0FDRixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDNUMsV0FBTyxlQUFlLENBQUMsR0FBRyxDQUFDO0FBQ3pCLFdBQUssRUFBSSxLQUFLO0FBQ2QsYUFBTyxFQUFFLEtBQUssR0FBRyxPQUFPLEdBQUcsTUFBTTtBQUNqQyxVQUFJLEVBQUssZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU87QUFDdkMsV0FBSyxFQUFJLEtBQUs7QUFDZCxXQUFLLEVBQUksR0FBRztBQUNaLGFBQU8sRUFBRSxDQUNQO0FBQ0UsYUFBSyxFQUFFLFFBQVE7QUFDZixVQUFFLEVBQUssUUFBUTtBQUNmLFlBQUksRUFBRyxVQUFVO0FBQ2pCLFlBQUksRUFBRyxPQUFPO09BQ2YsRUFDRDtBQUNFLGFBQUssRUFBSSxTQUFTO0FBQ2xCLFVBQUUsRUFBTyxTQUFTO0FBQ2xCLFlBQUksRUFBSyxVQUFVO0FBQ25CLFlBQUksRUFBSyxPQUFPO0FBQ2hCLGVBQU8sRUFBRSxJQUFJO09BQ2QsQ0FDRjtLQUNGLENBQUMsQ0FBQztHQUNKOztBQUVELFdBQVMsTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTtBQUMzQyxXQUFPLGVBQWUsQ0FBQyxHQUFHLENBQUM7QUFDekIsV0FBSyxFQUFJLEtBQUs7QUFDZCxhQUFPLEVBQUUsK0NBQStDLEdBQUcsT0FBTyxHQUFHLDBJQUEwSTtBQUMvTSxVQUFJLEVBQUssZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU87QUFDdkMsV0FBSyxFQUFJLEtBQUs7QUFDZCxXQUFLLEVBQUksR0FBRztBQUNaLGFBQU8sRUFBRSxDQUNQO0FBQ0UsYUFBSyxFQUFFLFFBQVE7QUFDZixVQUFFLEVBQUssUUFBUTtBQUNmLFlBQUksRUFBRyxVQUFVO0FBQ2pCLFlBQUksRUFBRyxPQUFPO09BQ2YsRUFDRDtBQUNFLGFBQUssRUFBSSxTQUFTO0FBQ2xCLFVBQUUsRUFBTyxTQUFTO0FBQ2xCLFlBQUksRUFBSyxVQUFVO0FBQ25CLFlBQUksRUFBSyxPQUFPO0FBQ2hCLGVBQU8sRUFBRSxJQUFJO09BQ2QsQ0FDRjtLQUNGLENBQUMsQ0FBQztHQUNKOztBQUVELFdBQVMsTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDdkQsUUFBSSxVQUFVLEdBQUcsc0dBQXNHLENBQUM7O0FBRXhILGNBQVUsQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLEVBQUU7QUFDaEMsZ0JBQVUsSUFBSSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsUUFBUSxLQUFLLE1BQU0sR0FBRyxVQUFVLEdBQUcsRUFBRSxDQUFBLEFBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUM7S0FDbEksQ0FBQyxDQUFDOztBQUVILGNBQVUsSUFBSSxXQUFXLENBQUM7O0FBRTFCLFdBQU8sZUFBZSxDQUFDLEdBQUcsQ0FBQztBQUN6QixXQUFLLEVBQUksS0FBSztBQUNkLGFBQU8sRUFBRSwrQ0FBK0MsR0FBRyxPQUFPLEdBQUcsK0JBQStCLEdBQUcsVUFBVSxHQUFHLFFBQVE7QUFDNUgsVUFBSSxFQUFLLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPO0FBQ3ZDLFdBQUssRUFBSSxLQUFLO0FBQ2QsV0FBSyxFQUFJLEdBQUc7QUFDWixhQUFPLEVBQUUsQ0FDUDtBQUNFLGFBQUssRUFBRSxRQUFRO0FBQ2YsVUFBRSxFQUFLLFFBQVE7QUFDZixZQUFJLEVBQUcsVUFBVTtBQUNqQixZQUFJLEVBQUcsT0FBTztPQUNmLEVBQ0Q7QUFDRSxhQUFLLEVBQUksSUFBSTtBQUNiLFVBQUUsRUFBTyxJQUFJO0FBQ2IsWUFBSSxFQUFLLFVBQVU7QUFDbkIsWUFBSSxFQUFLLE9BQU87QUFDaEIsZUFBTyxFQUFFLElBQUk7T0FDZCxDQUNGO0tBQ0YsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsU0FBTztBQUNMLFNBQUssRUFBSSxLQUFLO0FBQ2QsV0FBTyxFQUFFLE9BQU87QUFDaEIsVUFBTSxFQUFHLE1BQU07QUFDZixVQUFNLEVBQUcsTUFBTTtHQUNoQixDQUFDO0NBRUgsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLGlCQUFpQixFQUFFLENBQUM7OztBQ25IckMsSUFBSSxjQUFjLEdBQUcsU0FBakIsY0FBYyxHQUFlOztBQUUvQixNQUFJLFNBQVMsR0FBaUIsRUFBRTtNQUM1QixRQUFRLEdBQWtCLENBQUM7TUFDM0IsU0FBUyxHQUFpQixJQUFJO01BQzlCLGFBQWEsR0FBYSxHQUFHO01BQzdCLE1BQU0sR0FBb0I7QUFDeEIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsZUFBVyxFQUFFLGFBQWE7QUFDMUIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsVUFBTSxFQUFPLFFBQVE7R0FDdEI7TUFDRCxhQUFhLEdBQWE7QUFDeEIsYUFBUyxFQUFNLEVBQUU7QUFDakIsaUJBQWEsRUFBRSx5QkFBeUI7QUFDeEMsYUFBUyxFQUFNLHFCQUFxQjtBQUNwQyxhQUFTLEVBQU0scUJBQXFCO0FBQ3BDLFlBQVEsRUFBTyxvQkFBb0I7R0FDcEM7TUFDRCxXQUFXO01BQ1gscUJBQXFCLEdBQUssbUNBQW1DO01BQzdELHVCQUF1QixHQUFHLHFDQUFxQztNQUMvRCxTQUFTLEdBQWlCLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQztNQUNuRSxNQUFNLEdBQW9CLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztNQUN4RCxZQUFZLEdBQWMsT0FBTyxDQUFDLHFDQUFxQyxDQUFDO01BQ3hFLFNBQVMsR0FBaUIsT0FBTyxDQUFDLGtDQUFrQyxDQUFDO01BQ3JFLGVBQWUsR0FBVyxPQUFPLENBQUMsMENBQTBDLENBQUMsQ0FBQzs7Ozs7O0FBTWxGLFdBQVMsVUFBVSxDQUFDLElBQUksRUFBRTtBQUN4QixlQUFXLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUM3Qzs7Ozs7OztBQU9ELFdBQVMsR0FBRyxDQUFDLE9BQU8sRUFBRTtBQUNwQixRQUFJLElBQUksR0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxPQUFPO1FBQ3ZDLE1BQU0sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7OztBQUd0QyxhQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZCLGVBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3hDLDRCQUF3QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0Msb0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRXpCLG1CQUFlLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7QUFHdkQsYUFBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO0FBQzVCLFNBQUcsRUFBRTtBQUNILGNBQU0sRUFBRSxTQUFTO0FBQ2pCLGFBQUssRUFBRyxPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsYUFBYTtPQUN0RDtLQUNGLENBQUMsQ0FBQzs7O0FBR0gsYUFBUyxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0FBR2xELGFBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxFQUFFLEVBQUU7QUFDaEMsWUFBTSxFQUFHLE1BQU07QUFDZixhQUFPLEVBQUUsbUJBQVk7QUFDbkIsaUJBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO09BQzlCO0tBQ0YsQ0FBQyxDQUFDOzs7QUFHSCxnQkFBWSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0FBRzdCLFFBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtBQUNqQixZQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDakM7O0FBRUQsV0FBTyxNQUFNLENBQUMsRUFBRSxDQUFDO0dBQ2xCOzs7Ozs7O0FBT0QsV0FBUyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO0FBQy9DLFFBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUN0QixlQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNsRDtHQUNGOzs7Ozs7O0FBT0QsV0FBUyxlQUFlLENBQUMsT0FBTyxFQUFFO0FBQ2hDLFFBQUksRUFBRSxHQUFJLGlCQUFpQixHQUFHLENBQUMsUUFBUSxHQUFFLENBQUUsUUFBUSxFQUFFO1FBQ2pELEdBQUcsR0FBRztBQUNKLGFBQU8sRUFBRSxPQUFPO0FBQ2hCLFFBQUUsRUFBTyxFQUFFO0FBQ1gsV0FBSyxFQUFJLE9BQU8sQ0FBQyxLQUFLO0FBQ3RCLGFBQU8sRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLCtCQUErQixFQUFFO0FBQzVELFVBQUUsRUFBTyxFQUFFO0FBQ1gsYUFBSyxFQUFJLE9BQU8sQ0FBQyxLQUFLO0FBQ3RCLGVBQU8sRUFBRSxPQUFPLENBQUMsT0FBTztPQUN6QixDQUFDO0FBQ0YsYUFBTyxFQUFFLEVBQUU7S0FDWixDQUFDOztBQUVOLFdBQU8sR0FBRyxDQUFDO0dBQ1o7Ozs7OztBQU1ELFdBQVMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFO0FBQ2hDLFFBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDOzs7QUFHeEMsUUFBSSxDQUFDLFVBQVUsRUFBRTtBQUNmLGdCQUFVLEdBQUcsQ0FBQztBQUNaLGFBQUssRUFBRSxPQUFPO0FBQ2QsWUFBSSxFQUFHLEVBQUU7QUFDVCxZQUFJLEVBQUcsT0FBTztBQUNkLFVBQUUsRUFBSyxlQUFlO09BQ3ZCLENBQUMsQ0FBQztLQUNKOztBQUVELFFBQUksZUFBZSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUM7O0FBRXRFLGFBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQzs7QUFFN0MsY0FBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLFVBQVUsQ0FBQyxTQUFTLEVBQUU7QUFDaEQsZUFBUyxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsRUFBRSxHQUFHLFVBQVUsR0FBRyxTQUFTLENBQUMsRUFBRSxDQUFDOztBQUVyRCxVQUFJLFFBQVEsQ0FBQzs7QUFFYixVQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDcEMsZ0JBQVEsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQyxDQUFDO09BQ2xFLE1BQU07QUFDTCxnQkFBUSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLENBQUM7T0FDcEU7O0FBRUQscUJBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRXRDLFVBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUMvRSxTQUFTLENBQUMsWUFBWTtBQUNyQixZQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUU7QUFDdkMsY0FBSSxTQUFTLENBQUMsT0FBTyxFQUFFO0FBQ3JCLHFCQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1dBQzFEO1NBQ0Y7QUFDRCxjQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO09BQ25CLENBQUMsQ0FBQztBQUNMLFlBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2hDLENBQUMsQ0FBQztHQUVKOzs7Ozs7O0FBT0QsV0FBUyxlQUFlLENBQUMsS0FBSyxFQUFFO0FBQzlCLFdBQU8sU0FBUyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDN0Q7Ozs7OztBQU1ELFdBQVMsTUFBTSxDQUFDLEVBQUUsRUFBRTtBQUNsQixRQUFJLEdBQUcsR0FBRyxlQUFlLENBQUMsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQzs7QUFFWCxRQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRTtBQUNaLFlBQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDeEIsbUJBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDL0I7R0FDRjs7Ozs7O0FBTUQsV0FBUyxZQUFZLENBQUMsRUFBRSxFQUFFO0FBQ3hCLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUN6RCxhQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUU7QUFDcEIsV0FBSyxFQUFNLENBQUM7QUFDWixlQUFTLEVBQUUsQ0FBQztBQUNaLFdBQUssRUFBTSxDQUFDO0FBQ1osVUFBSSxFQUFPLElBQUksQ0FBQyxPQUFPO0tBQ3hCLENBQUMsQ0FBQztHQUNKOzs7Ozs7QUFNRCxXQUFTLGFBQWEsQ0FBQyxFQUFFLEVBQUU7QUFDekIsYUFBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFO0FBQ3JCLFdBQUssRUFBTSxDQUFDO0FBQ1osZUFBUyxFQUFFLENBQUMsRUFBRTtBQUNkLFdBQUssRUFBTSxJQUFJO0FBQ2YsVUFBSSxFQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLHNCQUFZO0FBQzlDLCtCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDO09BQzdCO0tBQ0YsQ0FBQyxDQUFDO0dBQ0o7Ozs7OztBQU1ELFdBQVMsdUJBQXVCLENBQUMsRUFBRSxFQUFFO0FBQ25DLFFBQUksR0FBRyxHQUFNLGVBQWUsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9DLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRTVCLFVBQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsTUFBTSxFQUFFO0FBQ3ZDLFlBQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUNsQixDQUFDLENBQUM7O0FBRUgsYUFBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDOztBQUV6QyxlQUFXLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDOztBQUU1QixhQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQ3RCLGFBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDOztBQUV6QixvQkFBZ0IsRUFBRSxDQUFDO0dBQ3BCOzs7OztBQUtELFdBQVMsZ0JBQWdCLEdBQUc7QUFDMUIsUUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDOztBQUVwQixhQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsTUFBTSxFQUFFO0FBQ2xDLFVBQUksTUFBTSxDQUFDLEtBQUssS0FBSyxJQUFJLEVBQUU7QUFDekIsZUFBTyxHQUFHLElBQUksQ0FBQztPQUNoQjtLQUNGLENBQUMsQ0FBQzs7QUFFSCxRQUFJLENBQUMsT0FBTyxFQUFFO0FBQ1osWUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNuQjtHQUNGOzs7Ozs7O0FBT0QsV0FBUyxlQUFlLENBQUMsRUFBRSxFQUFFO0FBQzNCLFdBQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUNwQyxhQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7S0FDakIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUNoQjs7Ozs7OztBQU9ELFdBQVMsVUFBVSxDQUFDLEVBQUUsRUFBRTtBQUN0QixXQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLEVBQUU7QUFDdkMsYUFBTyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztLQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDUDs7QUFFRCxXQUFTLFFBQVEsR0FBRztBQUNsQixXQUFPLE1BQU0sQ0FBQztHQUNmOztBQUVELFNBQU87QUFDTCxjQUFVLEVBQUUsVUFBVTtBQUN0QixPQUFHLEVBQVMsR0FBRztBQUNmLFVBQU0sRUFBTSxNQUFNO0FBQ2xCLFFBQUksRUFBUSxRQUFRO0dBQ3JCLENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsY0FBYyxFQUFFLENBQUM7OztBQ25TbEMsSUFBSSxjQUFjLEdBQUcsU0FBakIsY0FBYyxHQUFlOztBQUUvQixNQUFJLFdBQVcsR0FBSSxRQUFRO01BQ3ZCLGFBQWE7TUFDYixrQkFBa0I7TUFDbEIsbUJBQW1CO01BQ25CLGlCQUFpQjtNQUNqQixVQUFVO01BQ1YsZUFBZTtNQUNmLFlBQVksR0FBRyxPQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQzs7QUFFbEUsV0FBUyxVQUFVLEdBQUc7O0FBRXBCLGNBQVUsR0FBRyxJQUFJLENBQUM7O0FBRWxCLGlCQUFhLEdBQVMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNqRSxzQkFBa0IsR0FBSSxXQUFXLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDdEUsdUJBQW1CLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDOztBQUV4RSxRQUFJLFlBQVksR0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUMvRixnQkFBZ0IsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDOztBQUVyRyxxQkFBaUIsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FDcEUsU0FBUyxDQUFDLFlBQVk7QUFDckIsa0JBQVksRUFBRSxDQUFDO0tBQ2hCLENBQUMsQ0FBQzs7QUFFTCxRQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDYjs7QUFFRCxXQUFTLFlBQVksR0FBRztBQUN0QixXQUFPLFVBQVUsQ0FBQztHQUNuQjs7QUFFRCxXQUFTLFlBQVksR0FBRztBQUN0QixRQUFJLGVBQWUsRUFBRSxPQUFPO0FBQzVCLFFBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUNaOztBQUVELFdBQVMsY0FBYyxDQUFDLGFBQWEsRUFBRTtBQUNyQyxjQUFVLEdBQUssSUFBSSxDQUFDO0FBQ3BCLFFBQUksUUFBUSxHQUFHLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0FBQ3hDLGFBQVMsQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRTtBQUNwQyxlQUFTLEVBQUUsQ0FBQztBQUNaLFVBQUksRUFBTyxJQUFJLENBQUMsT0FBTztLQUN4QixDQUFDLENBQUM7QUFDSCxhQUFTLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLFFBQVEsRUFBRTtBQUN6QyxXQUFLLEVBQUUsQ0FBQztBQUNSLFVBQUksRUFBRyxJQUFJLENBQUMsT0FBTztLQUNwQixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLElBQUksQ0FBQyxhQUFhLEVBQUU7QUFDM0IsUUFBSSxVQUFVLEVBQUU7QUFDZCxhQUFPO0tBQ1I7O0FBRUQsbUJBQWUsR0FBRyxLQUFLLENBQUM7O0FBRXhCLGtCQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7O0FBRTlCLGFBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBQ3pELGFBQVMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxFQUFFO0FBQ25DLGVBQVMsRUFBRSxDQUFDO0FBQ1osV0FBSyxFQUFNLENBQUM7QUFDWixVQUFJLEVBQU8sTUFBTSxDQUFDLE9BQU87QUFDekIsV0FBSyxFQUFNLENBQUM7S0FDYixDQUFDLENBQUM7R0FDSjs7Ozs7O0FBTUQsV0FBUyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUU7QUFDekMsUUFBSSxVQUFVLEVBQUU7QUFDZCxhQUFPO0tBQ1I7O0FBRUQsbUJBQWUsR0FBRyxJQUFJLENBQUM7O0FBRXZCLGtCQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDOUIsYUFBUyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztHQUN0RDs7QUFFRCxXQUFTLElBQUksQ0FBQyxhQUFhLEVBQUU7QUFDM0IsUUFBSSxDQUFDLFVBQVUsRUFBRTtBQUNmLGFBQU87S0FDUjtBQUNELGNBQVUsR0FBUSxLQUFLLENBQUM7QUFDeEIsbUJBQWUsR0FBRyxLQUFLLENBQUM7QUFDeEIsUUFBSSxRQUFRLEdBQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUM7QUFDM0MsYUFBUyxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDbEQsYUFBUyxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFO0FBQ3BDLGVBQVMsRUFBRSxDQUFDO0FBQ1osVUFBSSxFQUFPLElBQUksQ0FBQyxPQUFPO0tBQ3hCLENBQUMsQ0FBQztBQUNILGFBQVMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxHQUFHLENBQUMsRUFBRTtBQUM5QyxlQUFTLEVBQUUsQ0FBQztBQUNaLFVBQUksRUFBTyxJQUFJLENBQUMsT0FBTztLQUN4QixDQUFDLENBQUM7R0FFSjs7QUFFRCxXQUFTLFVBQVUsQ0FBQyxPQUFPLEVBQUU7QUFDM0IsUUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUU7QUFDOUIsYUFBTyxDQUFDLEdBQUcsQ0FBQyxnRkFBZ0YsQ0FBQyxDQUFDO0FBQzlGLGFBQU8sR0FBRyxDQUFDLENBQUM7S0FDYjtBQUNELGFBQVMsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxFQUFFO0FBQ3JDLFdBQUssRUFBRSxPQUFPO0FBQ2QsVUFBSSxFQUFHLElBQUksQ0FBQyxPQUFPO0tBQ3BCLENBQUMsQ0FBQztHQUNKOztBQUVELFdBQVMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3pCLGFBQVMsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxFQUFFO0FBQ3JDLHFCQUFlLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRztBQUNyRCxVQUFJLEVBQWEsSUFBSSxDQUFDLE9BQU87S0FDOUIsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsU0FBTztBQUNMLGNBQVUsRUFBVSxVQUFVO0FBQzlCLFFBQUksRUFBZ0IsSUFBSTtBQUN4QixzQkFBa0IsRUFBRSxrQkFBa0I7QUFDdEMsUUFBSSxFQUFnQixJQUFJO0FBQ3hCLFdBQU8sRUFBYSxZQUFZO0FBQ2hDLGNBQVUsRUFBVSxVQUFVO0FBQzlCLFlBQVEsRUFBWSxRQUFRO0dBQzdCLENBQUM7Q0FFSCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsY0FBYyxFQUFFLENBQUM7OztBQ3RJbEMsSUFBSSxTQUFTLEdBQUcsU0FBWixTQUFTLEdBQWU7O0FBRTFCLE1BQUksU0FBUyxHQUFnQixFQUFFO01BQzNCLFFBQVEsR0FBaUIsQ0FBQztNQUMxQixzQkFBc0IsR0FBRyxJQUFJO01BQzdCLE1BQU0sR0FBbUI7QUFDdkIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsZUFBVyxFQUFFLGFBQWE7QUFDMUIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsV0FBTyxFQUFNLFNBQVM7QUFDdEIsVUFBTSxFQUFPLFFBQVE7R0FDdEI7TUFDRCxhQUFhLEdBQVk7QUFDdkIsYUFBUyxFQUFNLEVBQUU7QUFDakIsaUJBQWEsRUFBRSxvQkFBb0I7QUFDbkMsYUFBUyxFQUFNLGdCQUFnQjtBQUMvQixhQUFTLEVBQU0sZ0JBQWdCO0FBQy9CLFlBQVEsRUFBTyxlQUFlO0dBQy9CO01BQ0QsV0FBVztNQUNYLFNBQVMsR0FBZ0IsT0FBTyxDQUFDLGdDQUFnQyxDQUFDO01BQ2xFLFlBQVksR0FBYSxPQUFPLENBQUMscUNBQXFDLENBQUM7TUFDdkUsU0FBUyxHQUFnQixPQUFPLENBQUMsa0NBQWtDLENBQUM7TUFDcEUsZUFBZSxHQUFVLE9BQU8sQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDOztBQUVqRixXQUFTLFVBQVUsQ0FBQyxJQUFJLEVBQUU7QUFDeEIsZUFBVyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDN0M7OztBQUdELFdBQVMsR0FBRyxDQUFDLE9BQU8sRUFBRTtBQUNwQixXQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQzs7QUFFOUMsUUFBSSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRWpFLGFBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRXpCLGVBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRW5FLDRCQUF3QixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUV6RCxtQkFBZSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2hELG1CQUFlLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUVuRCxRQUFJLFFBQVEsR0FBVyxRQUFRLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNuRixhQUFhLEdBQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3JGLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUM7O0FBRXRFLFlBQVEsQ0FBQyxtQkFBbUIsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ3hGLFNBQVMsQ0FBQyxZQUFZO0FBQ3JCLFlBQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDckIsQ0FBQyxDQUFDOztBQUVMLGdCQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUUvQixXQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUM7R0FDcEI7O0FBRUQsV0FBUyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO0FBQy9DLFFBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUN0QixlQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNsRDtHQUNGOztBQUVELFdBQVMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRTtBQUN6QyxRQUFJLEVBQUUsR0FBSSxzQkFBc0IsR0FBRyxDQUFDLFFBQVEsR0FBRSxDQUFFLFFBQVEsRUFBRTtRQUN0RCxHQUFHLEdBQUc7QUFDSixRQUFFLEVBQW1CLEVBQUU7QUFDdkIsYUFBTyxFQUFjLFNBQVMsQ0FBQyxTQUFTLENBQUMsNEJBQTRCLEVBQUU7QUFDckUsVUFBRSxFQUFPLEVBQUU7QUFDWCxhQUFLLEVBQUksS0FBSztBQUNkLGVBQU8sRUFBRSxPQUFPO09BQ2pCLENBQUM7QUFDRix5QkFBbUIsRUFBRSxJQUFJO0tBQzFCLENBQUM7O0FBRU4sV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFRCxXQUFTLE1BQU0sQ0FBQyxFQUFFLEVBQUU7QUFDbEIsUUFBSSxHQUFHLEdBQUcsZUFBZSxDQUFDLEVBQUUsQ0FBQztRQUN6QixLQUFLLENBQUM7O0FBRVYsUUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUU7QUFDWixXQUFLLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLGVBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNmLG1CQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzlCO0dBQ0Y7O0FBRUQsV0FBUyxZQUFZLENBQUMsRUFBRSxFQUFFO0FBQ3hCLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO0FBQ2hDLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDO0FBQ3BELGFBQVMsRUFBRSxDQUFDO0dBQ2I7O0FBRUQsV0FBUyxhQUFhLENBQUMsRUFBRSxFQUFFO0FBQ3pCLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtBQUNyQixlQUFTLEVBQUUsQ0FBQyxFQUFFO0FBQ2QsV0FBSyxFQUFNLENBQUM7QUFDWixVQUFJLEVBQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsc0JBQVk7QUFDOUMsK0JBQXVCLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDN0I7S0FDRixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLHVCQUF1QixDQUFDLEVBQUUsRUFBRTtBQUNuQyxRQUFJLEdBQUcsR0FBVSxlQUFlLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRCxRQUFRLEdBQUssU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUVoQyxZQUFRLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7O0FBRXZDLGVBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUIsYUFBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUN0QixhQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztHQUMxQjs7QUFFRCxXQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUU7QUFDekIsUUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQ3hCLE9BQU87UUFDUCxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUVWLFdBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2xCLFVBQUksQ0FBQyxLQUFLLE1BQU0sRUFBRTtBQUNoQixpQkFBUztPQUNWO0FBQ0QsYUFBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QixlQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUM7QUFDbEUsT0FBQyxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztLQUN4QztHQUNGOztBQUVELFdBQVMsZUFBZSxDQUFDLEVBQUUsRUFBRTtBQUMzQixXQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEVBQUU7QUFDcEMsYUFBTyxLQUFLLENBQUMsRUFBRSxDQUFDO0tBQ2pCLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7R0FDaEI7O0FBRUQsV0FBUyxRQUFRLEdBQUc7QUFDbEIsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFRCxTQUFPO0FBQ0wsY0FBVSxFQUFFLFVBQVU7QUFDdEIsT0FBRyxFQUFTLEdBQUc7QUFDZixVQUFNLEVBQU0sTUFBTTtBQUNsQixRQUFJLEVBQVEsUUFBUTtHQUNyQixDQUFDO0NBRUgsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLFNBQVMsRUFBRSxDQUFDOzs7QUN2SjdCLElBQUksV0FBVyxHQUFHLFNBQWQsV0FBVyxHQUFlOztBQUU1QixNQUFJLFNBQVMsR0FBTyxFQUFFO01BQ2xCLFFBQVEsR0FBUSxDQUFDO01BQ2pCLGFBQWEsR0FBRyxHQUFHO01BQ25CLE1BQU0sR0FBVTtBQUNkLFdBQU8sRUFBTSxTQUFTO0FBQ3RCLGVBQVcsRUFBRSxhQUFhO0FBQzFCLFdBQU8sRUFBTSxTQUFTO0FBQ3RCLFdBQU8sRUFBTSxTQUFTO0FBQ3RCLFVBQU0sRUFBTyxRQUFRO0FBQ3JCLGFBQVMsRUFBSSxXQUFXO0dBQ3pCO01BQ0QsYUFBYSxHQUFHO0FBQ2QsYUFBUyxFQUFNLEVBQUU7QUFDakIsaUJBQWEsRUFBRSxzQkFBc0I7QUFDckMsYUFBUyxFQUFNLGtCQUFrQjtBQUNqQyxhQUFTLEVBQU0sa0JBQWtCO0FBQ2pDLFlBQVEsRUFBTyxpQkFBaUI7QUFDaEMsZUFBVyxFQUFJLG9CQUFvQjtHQUNwQztNQUNELFVBQVUsR0FBTTtBQUNkLEtBQUMsRUFBRyxHQUFHO0FBQ1AsTUFBRSxFQUFFLElBQUk7QUFDUixLQUFDLEVBQUcsR0FBRztBQUNQLE1BQUUsRUFBRSxJQUFJO0FBQ1IsS0FBQyxFQUFHLEdBQUc7QUFDUCxNQUFFLEVBQUUsSUFBSTtBQUNSLEtBQUMsRUFBRyxHQUFHO0FBQ1AsTUFBRSxFQUFFLElBQUk7R0FDVDtNQUNELFlBQVksR0FBSTtBQUNkLE9BQUcsRUFBRyxjQUFjO0FBQ3BCLFFBQUksRUFBRSxtQkFBbUI7QUFDekIsT0FBRyxFQUFHLGdCQUFnQjtBQUN0QixRQUFJLEVBQUUsc0JBQXNCO0FBQzVCLE9BQUcsRUFBRyxpQkFBaUI7QUFDdkIsUUFBSSxFQUFFLHFCQUFxQjtBQUMzQixPQUFHLEVBQUcsZUFBZTtBQUNyQixRQUFJLEVBQUUsa0JBQWtCO0dBQ3pCO01BQ0QsV0FBVztNQUNYLFNBQVMsR0FBTyxPQUFPLENBQUMsZ0NBQWdDLENBQUM7TUFDekQsU0FBUyxHQUFPLE9BQU8sQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDOztBQUVoRSxXQUFTLFVBQVUsQ0FBQyxJQUFJLEVBQUU7QUFDeEIsZUFBVyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDN0M7OztBQUdELFdBQVMsR0FBRyxDQUFDLE9BQU8sRUFBRTtBQUNwQixXQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQzs7QUFFOUMsUUFBSSxVQUFVLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEtBQUssRUFDaEQsT0FBTyxDQUFDLE9BQU8sRUFDZixPQUFPLENBQUMsUUFBUSxFQUNoQixPQUFPLENBQUMsUUFBUSxFQUNoQixPQUFPLENBQUMsTUFBTSxFQUNkLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFFekIsYUFBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMzQixlQUFXLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFFNUMsY0FBVSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoRSw0QkFBd0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU3RSxhQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7QUFDaEMsU0FBRyxFQUFFO0FBQ0gsaUJBQVMsRUFBRSxVQUFVLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQzNDLGFBQUssRUFBTSxPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEdBQUcsYUFBYTtPQUN6RDtLQUNGLENBQUMsQ0FBQzs7O0FBR0gsY0FBVSxDQUFDLEtBQUssR0FBSSxVQUFVLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUMsS0FBSyxDQUFDO0FBQ3JFLGNBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLE1BQU0sQ0FBQzs7QUFFdEUsMEJBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkMsbUJBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFFNUIsUUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQ2hGLDJCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQ25DOztBQUVELFFBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRTtBQUNoRiw2QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNyQzs7QUFFRCxXQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUM7R0FDM0I7O0FBRUQsV0FBUyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRTtBQUN6RCxRQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDdEIsZUFBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDbEQ7QUFDRCxhQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztHQUNyRDs7QUFFRCxXQUFTLG1CQUFtQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFO0FBQ3BGLFFBQUksRUFBRSxHQUFJLDBCQUEwQixHQUFHLENBQUMsUUFBUSxHQUFFLENBQUUsUUFBUSxFQUFFO1FBQzFELEdBQUcsR0FBRztBQUNKLFFBQUUsRUFBYSxFQUFFO0FBQ2pCLGNBQVEsRUFBTyxRQUFRO0FBQ3ZCLGNBQVEsRUFBTyxNQUFNO0FBQ3JCLG1CQUFhLEVBQUUsYUFBYSxJQUFJLEtBQUs7QUFDckMsWUFBTSxFQUFTLE1BQU0sSUFBSSxFQUFFO0FBQzNCLGtCQUFZLEVBQUcsSUFBSTtBQUNuQixpQkFBVyxFQUFJLElBQUk7QUFDbkIsWUFBTSxFQUFTLENBQUM7QUFDaEIsV0FBSyxFQUFVLENBQUM7QUFDaEIsYUFBTyxFQUFRLFNBQVMsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUU7QUFDakUsVUFBRSxFQUFPLEVBQUU7QUFDWCxhQUFLLEVBQUksS0FBSztBQUNkLGVBQU8sRUFBRSxPQUFPO09BQ2pCLENBQUM7QUFDRixhQUFPLEVBQVEsSUFBSTtLQUNwQixDQUFDOztBQUVOLFdBQU8sR0FBRyxDQUFDO0dBQ1o7O0FBRUQsV0FBUyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUU7QUFDMUMsUUFBSSxVQUFVLENBQUMsYUFBYSxFQUFFO0FBQzVCLGFBQU87S0FDUjs7QUFFRCxjQUFVLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQ2hGLFNBQVMsQ0FBQyxVQUFVLEdBQUcsRUFBRTtBQUN4QixpQkFBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUM1QixDQUFDLENBQUM7O0FBRUwsY0FBVSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUM5RSxTQUFTLENBQUMsVUFBVSxHQUFHLEVBQUU7QUFDeEIsaUJBQVcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDNUIsQ0FBQyxDQUFDO0dBQ047O0FBRUQsV0FBUyxXQUFXLENBQUMsRUFBRSxFQUFFO0FBQ3ZCLFFBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7QUFFaEMsUUFBSSxVQUFVLENBQUMsYUFBYSxFQUFFO0FBQzVCLGFBQU87S0FDUjs7QUFFRCxtQkFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzVCLGdCQUFZLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ2xDOztBQUVELFdBQVMsZUFBZSxDQUFDLFVBQVUsRUFBRTtBQUNuQyxRQUFJLE1BQU0sR0FBSyxVQUFVLENBQUMsTUFBTTtRQUM1QixJQUFJLEdBQU8sQ0FBQztRQUNaLElBQUksR0FBTyxDQUFDO1FBQ1osUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQzs7QUFFM0QsUUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxFQUFFLEVBQUU7QUFDekMsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztBQUN4QyxVQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO0tBQ3pDLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLElBQUksQUFBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBSyxVQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUM7QUFDdkUsVUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7S0FDbEQsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLEVBQUUsRUFBRTtBQUNoRCxVQUFJLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztBQUN0QixVQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO0tBQ3pDLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQy9CLFVBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxJQUFJLEFBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUssVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDO0tBQ3pFLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxFQUFFLEVBQUU7QUFDaEQsVUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFDdEIsVUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7S0FDeEIsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsRUFBRTtBQUMvQyxVQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksSUFBSSxBQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFLLFVBQVUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQztBQUN2RSxVQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7S0FDakMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLEVBQUUsRUFBRTtBQUNoRCxVQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDO0FBQ3hDLFVBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO0tBQ3hCLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7QUFDakQsVUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLElBQUksQUFBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBSyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUM7S0FDekU7O0FBRUQsYUFBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO0FBQ2hDLE9BQUMsRUFBRSxJQUFJO0FBQ1AsT0FBQyxFQUFFLElBQUk7S0FDUixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLHVCQUF1QixDQUFDLFVBQVUsRUFBRTtBQUMzQyxRQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7QUFDNUQsYUFBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUMsQ0FBQyxFQUFFLEFBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUssVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLEFBQUMsRUFBQyxDQUFDLENBQUM7R0FDekY7O0FBRUQsV0FBUyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUU7QUFDekMsUUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0FBQzVELGFBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFDLENBQUMsRUFBRSxBQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFLLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxBQUFDLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQztHQUMvRjs7QUFFRCxXQUFTLFdBQVcsQ0FBQyxFQUFFLEVBQUU7QUFDdkIsUUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDOztBQUVoQyxRQUFJLFVBQVUsQ0FBQyxhQUFhLEVBQUU7QUFDNUIsYUFBTztLQUNSOztBQUVELGlCQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ25DOztBQUVELFdBQVMsWUFBWSxDQUFDLEVBQUUsRUFBRTtBQUN4QixhQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUU7QUFDcEIsZUFBUyxFQUFFLENBQUM7QUFDWixVQUFJLEVBQU8sSUFBSSxDQUFDLE9BQU87S0FDeEIsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsV0FBUyxhQUFhLENBQUMsRUFBRSxFQUFFO0FBQ3pCLGFBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtBQUNyQixlQUFTLEVBQUUsQ0FBQztBQUNaLFVBQUksRUFBTyxJQUFJLENBQUMsT0FBTztLQUN4QixDQUFDLENBQUM7R0FDSjs7QUFFRCxXQUFTLE1BQU0sQ0FBQyxFQUFFLEVBQUU7QUFDbEIsbUJBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxPQUFPLEVBQUU7QUFDN0MsVUFBSSxPQUFPLENBQUMsWUFBWSxFQUFFO0FBQ3hCLGVBQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7T0FDaEM7QUFDRCxVQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUU7QUFDdkIsZUFBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztPQUMvQjs7QUFFRCxlQUFTLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU5QyxpQkFBVyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRXpDLFVBQUksR0FBRyxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRXRDLGVBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDdEIsZUFBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDMUIsQ0FBQyxDQUFDO0dBQ0o7O0FBRUQsV0FBUyxVQUFVLENBQUMsRUFBRSxFQUFFO0FBQ3RCLFdBQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN2QyxhQUFPLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDO0tBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNQOztBQUVELFdBQVMsZUFBZSxDQUFDLEVBQUUsRUFBRTtBQUMzQixXQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEVBQUU7QUFDcEMsYUFBTyxLQUFLLENBQUMsRUFBRSxDQUFDO0tBQ2pCLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7R0FDaEI7O0FBRUQsV0FBUyxlQUFlLENBQUMsRUFBRSxFQUFFO0FBQzNCLFdBQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN2QyxhQUFPLEtBQUssQ0FBQyxRQUFRLEtBQUssRUFBRSxDQUFDO0tBQzlCLENBQUMsQ0FBQztHQUNKOztBQUVELFdBQVMsUUFBUSxHQUFHO0FBQ2xCLFdBQU8sTUFBTSxDQUFDO0dBQ2Y7O0FBRUQsV0FBUyxZQUFZLEdBQUc7QUFDdEIsV0FBTyxVQUFVLENBQUM7R0FDbkI7O0FBRUQsU0FBTztBQUNMLGNBQVUsRUFBRSxVQUFVO0FBQ3RCLE9BQUcsRUFBUyxHQUFHO0FBQ2YsVUFBTSxFQUFNLE1BQU07QUFDbEIsUUFBSSxFQUFRLFFBQVE7QUFDcEIsWUFBUSxFQUFJLFlBQVk7R0FDekIsQ0FBQztDQUVILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxXQUFXLEVBQUUsQ0FBQzs7O0FDcFIvQixNQUFNLENBQUMsT0FBTyxHQUFHOzs7Ozs7Ozs7QUFTZixRQUFNLEVBQUUsZ0JBQVUsR0FBRyxFQUFFO0FBQ3JCLFFBQUksTUFBTSxHQUFHLEtBQUssQ0FBQzs7QUFFbkIsUUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ2xCLGFBQU8sSUFBSSxDQUFDO0tBQ2I7O0FBRUQsU0FBSyxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUU7QUFDcEIsVUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQztBQUNqRSxZQUFNO0tBQ1A7O0FBRUQsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFRCxhQUFXLEVBQUUscUJBQVUsUUFBUSxFQUFFO0FBQy9CLFdBQU8sVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3JCLGFBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDM0UsQ0FBQztHQUNIOztBQUVELGVBQWE7Ozs7Ozs7Ozs7S0FBRSxVQUFVLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ3RDLFFBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNqQixTQUFLLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRTtBQUNqQixVQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRTtBQUM5QixlQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO09BQzNELE1BQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDeEMsZUFBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztPQUNuQjtLQUNGO0FBQ0QsV0FBTyxPQUFPLENBQUM7R0FDaEIsQ0FBQTs7QUFFRCxxQkFBbUIsRUFBRSw2QkFBVSxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ3ZDLFFBQUksQ0FBQyxHQUFNLENBQUM7UUFDUixJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7UUFDckIsR0FBRyxHQUFJLElBQUksQ0FBQyxNQUFNLENBQUM7O0FBRXZCLFdBQU8sQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNuQixTQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3BCO0FBQ0QsV0FBTyxHQUFHLENBQUM7R0FDWjs7QUFFRCxzQkFBb0IsRUFBRSw4QkFBVSxHQUFHLEVBQUUsRUFBRSxFQUFFO0FBQ3ZDLFFBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO0FBQzNCLFdBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ25DLFlBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssV0FBVyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxXQUFXLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUU7QUFDekYsaUJBQU8sQ0FBQyxDQUFDO1NBQ1Y7T0FDRjtLQUNGO0FBQ0QsV0FBTyxLQUFLLENBQUM7R0FDZDs7O0FBR0QsUUFBTSxFQUFFLGdCQUFVLEdBQUcsRUFBRTtBQUNyQixPQUFHLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQzs7QUFFaEIsU0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDekMsVUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNqQixpQkFBUztPQUNWOztBQUVELFdBQUssSUFBSSxHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzVCLFlBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUNwQyxhQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzlCO09BQ0Y7S0FDRjs7QUFFRCxXQUFPLEdBQUcsQ0FBQztHQUNaOztBQUVELFlBQVU7Ozs7Ozs7Ozs7S0FBRSxVQUFVLEdBQUcsRUFBRTtBQUN6QixPQUFHLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQzs7QUFFaEIsU0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDekMsVUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUV2QixVQUFJLENBQUMsR0FBRyxFQUFFO0FBQ1IsaUJBQVM7T0FDVjs7QUFFRCxXQUFLLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRTtBQUNuQixZQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDM0IsY0FBSSxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLEVBQUU7QUFDaEMsc0JBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7V0FDaEMsTUFBTTtBQUNMLGVBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7V0FDckI7U0FDRjtPQUNGO0tBQ0Y7O0FBRUQsV0FBTyxHQUFHLENBQUM7R0FDWixDQUFBOzs7Ozs7Ozs7OztBQVdELGNBQVksRUFBRSxzQkFBVSxTQUFTLEVBQUU7QUFDakMsUUFBSSxLQUFLLEdBQUcsU0FBUztRQUNqQixHQUFHLEdBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRXpDLFFBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUNuQyxXQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLE9BQU8sRUFBRTtBQUN4QyxlQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQ25CLENBQUMsQ0FBQztLQUNKOztBQUVELFFBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUNqQyxXQUFLLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUU7QUFDM0IsV0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7T0FDN0I7S0FDRjs7QUFFRCxXQUFPLEdBQUcsQ0FBQztHQUNaOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXNDRCxXQUFTLEVBQUUsbUJBQVUsR0FBRyxFQUFFO0FBQ3hCLFFBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUNiLFFBQUksR0FBRyxDQUFDO0FBQ1IsUUFBSSxFQUFFLEdBQUcsWUFBWSxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBLEFBQUMsRUFBRTtBQUNuRCxZQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7S0FDaEU7QUFDRCxTQUFLLEdBQUcsSUFBSSxHQUFHLEVBQUU7QUFDZixVQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDM0IsV0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztPQUNoQjtLQUNGO0FBQ0QsV0FBTyxHQUFHLENBQUM7R0FDWjs7Q0FFRixDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfcnggPSByZXF1aXJlKCcuLi9ub3JpL3V0aWxzL1J4LmpzJyk7XG5cbi8qKlxuICogXCJDb250cm9sbGVyXCIgZm9yIGEgTm9yaSBhcHBsaWNhdGlvbi4gVGhlIGNvbnRyb2xsZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gKiBib290c3RyYXBwaW5nIHRoZSBhcHAgYW5kIHBvc3NpYmx5IGhhbmRsaW5nIHNvY2tldC9zZXJ2ZXIgaW50ZXJhY3Rpb24uXG4gKiBBbnkgYWRkaXRpb25hbCBmdW5jdGlvbmFsaXR5IHNob3VsZCBiZSBoYW5kbGVkIGluIGEgc3BlY2lmaWMgbW9kdWxlLlxuICovXG52YXIgQXBwID0gTm9yaS5jcmVhdGVBcHBsaWNhdGlvbih7XG5cbiAgbWl4aW5zOiBbXSxcblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBtYWluIE5vcmkgQXBwIHN0b3JlIGFuZCB2aWV3LlxuICAgKi9cbiAgc3RvcmUgOiByZXF1aXJlKCcuL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gIHZpZXcgIDogcmVxdWlyZSgnLi92aWV3L0FwcFZpZXcuanMnKSxcbiAgc29ja2V0OiByZXF1aXJlKCcuLi9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMnKSxcblxuICAvKipcbiAgICogSW50aWFsaXplIHRoZSBhcHBpbGNhdGlvbiwgdmlldyBhbmQgc3RvcmVcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvY2tldC5pbml0aWFsaXplKCk7XG5cbiAgICB0aGlzLnZpZXcuaW5pdGlhbGl6ZSgpO1xuXG4gICAgdGhpcy5zdG9yZS5pbml0aWFsaXplKCk7IC8vIHN0b3JlIHdpbGwgYWNxdWlyZSBkYXRhIGRpc3BhdGNoIGV2ZW50IHdoZW4gY29tcGxldGVcbiAgICB0aGlzLnN0b3JlLnN1YnNjcmliZSgnc3RvcmVJbml0aWFsaXplZCcsIHRoaXMub25TdG9yZUluaXRpYWxpemVkLmJpbmQodGhpcykpO1xuICAgIHRoaXMuc3RvcmUubG9hZFN0b3JlKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFmdGVyIHRoZSBzdG9yZSBkYXRhIGlzIHJlYWR5XG4gICAqL1xuICBvblN0b3JlSW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJ1bkFwcGxpY2F0aW9uKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgXCJQbGVhc2Ugd2FpdFwiIGNvdmVyIGFuZCBzdGFydCB0aGUgYXBwXG4gICAqL1xuICBydW5BcHBsaWNhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudmlldy5yZW1vdmVMb2FkaW5nTWVzc2FnZSgpO1xuICAgIHRoaXMudmlldy5yZW5kZXIoKTtcblxuICAgIC8vIFZpZXcgd2lsbCBzaG93IGJhc2VkIG9uIHRoZSBjdXJyZW50IHN0b3JlIHN0YXRlXG4gICAgdGhpcy5zdG9yZS5zZXRTdGF0ZSh7Y3VycmVudFN0YXRlOiAnUExBWUVSX1NFTEVDVCd9KTtcblxuICAgIC8vX3J4LmludGVydmFsKDUwMCkudGFrZSg1KS5zdWJzY3JpYmUoZnVuY3Rpb24oKSB7XG4gICAgLy8gIHRoaXMuc29ja2V0LnBpbmcoKTtcbiAgICAvL30uYmluZCh0aGlzKSk7XG4gICAgLy9fcnguZG9FdmVyeSgxMDAwLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgdGhpcy5zb2NrZXQucGluZygpO1xuICAgIC8vfS5iaW5kKHRoaXMpKTtcbiAgfSxcblxuICAvKipcbiAgICogQWxsIG1lc3NhZ2VzIGZyb20gdGhlIFNvY2tldC5JTyBzZXJ2ZXIgd2lsbCBiZSBmb3J3YXJkZWQgaGVyZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgaGFuZGxlU29ja2V0TWVzc2FnZTogZnVuY3Rpb24gKHBheWxvYWQpIHtcbiAgICBpZiAoIXBheWxvYWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhcImZyb20gU29ja2V0LklPIHNlcnZlclwiLCBwYXlsb2FkKTtcblxuICAgIHN3aXRjaCAocGF5bG9hZC50eXBlKSB7XG4gICAgICBjYXNlICh0aGlzLnNvY2tldC5ldmVudHMoKS5DT05ORUNUKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0ZWQhXCIpO1xuICAgICAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHtzb2NrZXRJT0lEOiBwYXlsb2FkLmlkfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLlVTRVJfQ09OTkVDVEVEKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJBbm90aGVyIGNsaWVudCBjb25uZWN0ZWRcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLlVTRVJfRElTQ09OTkVDVEVEKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJBbm90aGVyIGNsaWVudCBkaXNjb25uZWN0ZWRcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLkRST1BQRUQpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIllvdSB3ZXJlIGRyb3BwZWQhXCIsIHBheWxvYWQucGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLlNZU1RFTV9NRVNTQUdFKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJTeXN0ZW0gbWVzc2FnZVwiLCBwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlICh0aGlzLnNvY2tldC5ldmVudHMoKS5DUkVBVEVfUk9PTSk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY3JlYXRlIHJvb21cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLkpPSU5fUk9PTSk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiam9pbiByb29tXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlICh0aGlzLnNvY2tldC5ldmVudHMoKS5MRUFWRV9ST09NKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJsZWF2ZSByb29tXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oXCJVbmhhbmRsZWQgU29ja2V0SU8gbWVzc2FnZSB0eXBlXCIsIHBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcDsiLCJ2YXIgX25vcmlBY3Rpb25Db25zdGFudHMgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMnKSxcbiAgICBfbWl4aW5NYXBGYWN0b3J5ICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc3RvcmUvTWl4aW5NYXBGYWN0b3J5LmpzJyksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICBfbWl4aW5SZWR1Y2VyU3RvcmUgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMnKTtcblxuLyoqXG4gKiBUaGlzIGFwcGxpY2F0aW9uIHN0b3JlIGNvbnRhaW5zIFwicmVkdWNlciBzdG9yZVwiIGZ1bmN0aW9uYWxpdHkgYmFzZWQgb24gUmVkdXguXG4gKiBUaGUgc3RvcmUgc3RhdGUgbWF5IG9ubHkgYmUgY2hhbmdlZCBmcm9tIGV2ZW50cyBhcyBhcHBsaWVkIGluIHJlZHVjZXIgZnVuY3Rpb25zLlxuICogVGhlIHN0b3JlIHJlY2VpdmVkIGFsbCBldmVudHMgZnJvbSB0aGUgZXZlbnQgYnVzIGFuZCBmb3J3YXJkcyB0aGVtIHRvIGFsbFxuICogcmVkdWNlciBmdW5jdGlvbnMgdG8gbW9kaWZ5IHN0YXRlIGFzIG5lZWRlZC4gT25jZSB0aGV5IGhhdmUgcnVuLCB0aGVcbiAqIGhhbmRsZVN0YXRlTXV0YXRpb24gZnVuY3Rpb24gaXMgY2FsbGVkIHRvIGRpc3BhdGNoIGFuIGV2ZW50IHRvIHRoZSBidXMsIG9yXG4gKiBub3RpZnkgc3Vic2NyaWJlcnMgdmlhIGFuIG9ic2VydmFibGUuXG4gKlxuICogRXZlbnRzID0+IGhhbmRsZUFwcGxpY2F0aW9uRXZlbnRzID0+IGFwcGx5UmVkdWNlcnMgPT4gaGFuZGxlU3RhdGVNdXRhdGlvbiA9PiBOb3RpZnlcbiAqL1xudmFyIEFwcFN0b3JlID0gTm9yaS5jcmVhdGVTdG9yZSh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluTWFwRmFjdG9yeSxcbiAgICBfbWl4aW5SZWR1Y2VyU3RvcmUsXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QoKVxuICBdLFxuXG4gIGdhbWVTdGF0ZXM6IFsnVElUTEUnLCAnUExBWUVSX1NFTEVDVCcsICdXQUlUSU5HX09OX1BMQVlFUicsICdNQUlOX0dBTUUnLCAnR0FNRV9PVkVSJ10sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYWRkUmVkdWNlcih0aGlzLmRlZmF1bHRSZWR1Y2VyRnVuY3Rpb24pO1xuICAgIHRoaXMuaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSgpO1xuICAgIHRoaXMuc2V0U3RhdGUoTm9yaS5jb25maWcoKSk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdzdG9yZUluaXRpYWxpemVkJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBvciBsb2FkIGFueSBuZWNlc3NhcnkgZGF0YSBhbmQgdGhlbiBicm9hZGNhc3QgYSBpbml0aWFsaXplZCBldmVudC5cbiAgICovXG4gIGxvYWRTdG9yZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgY3VycmVudFN0YXRlOiB0aGlzLmdhbWVTdGF0ZXNbMF0sXG4gICAgICBsb2NhbFBsYXllciA6IHt9LFxuICAgICAgcmVtb3RlUGxheWVyOiB7fSxcbiAgICAgIHF1ZXN0aW9uQmFuazogW11cbiAgICB9KTtcblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZignc3RvcmVJbml0aWFsaXplZCcpO1xuICB9LFxuXG4gIGNyZWF0ZVVzZXJPYmplY3Q6IGZ1bmN0aW9uIChpZCwgdHlwZSwgbmFtZSwgYXBwZWFyYW5jZSwgYmVoYXZpb3JzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkICAgICAgICA6IGlkLFxuICAgICAgdHlwZSAgICAgIDogdHlwZSxcbiAgICAgIG5hbWUgICAgICA6IG5hbWUsXG4gICAgICBoZWFsdGggICAgOiBoZWFsdGggfHwgNixcbiAgICAgIGFwcGVhcmFuY2U6IGFwcGVhcmFuY2UsXG4gICAgICBiZWhhdmlvcnMgOiBiZWhhdmlvcnMgfHwgW11cbiAgICB9O1xuICB9LFxuXG4gIGNyZWF0ZVF1ZXN0aW9uT2JqZWN0OiBmdW5jdGlvbiAocHJvbXB0LCBkaXN0cmFjdG9ycywgcG9pbnRWYWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9tcHQgICAgIDogcHJvbXB0LFxuICAgICAgZGlzdHJhY3RvcnM6IGRpc3RyYWN0b3JzLFxuICAgICAgcG9pbnRWYWx1ZSA6IHBvaW50VmFsdWVcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBNb2RpZnkgc3RhdGUgYmFzZWQgb24gaW5jb21pbmcgZXZlbnRzLiBSZXR1cm5zIGEgY29weSBvZiB0aGUgbW9kaWZpZWRcbiAgICogc3RhdGUgYW5kIGRvZXMgbm90IG1vZGlmeSB0aGUgc3RhdGUgZGlyZWN0bHkuXG4gICAqIENhbiBjb21wb3NlIHN0YXRlIHRyYW5zZm9ybWF0aW9uc1xuICAgKiByZXR1cm4gXy5hc3NpZ24oe30sIHN0YXRlLCBvdGhlclN0YXRlVHJhbnNmb3JtZXIoc3RhdGUpKTtcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBldmVudFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGRlZmF1bHRSZWR1Y2VyRnVuY3Rpb246IGZ1bmN0aW9uIChzdGF0ZSwgZXZlbnQpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuXG4gICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cbiAgICAgIGNhc2UgX25vcmlBY3Rpb25Db25zdGFudHMuQ0hBTkdFX1NUT1JFX1NUQVRFOlxuICAgICAgICByZXR1cm4gXy5hc3NpZ24oe30sIHN0YXRlLCBldmVudC5wYXlsb2FkLmRhdGEpO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDYWxsZWQgYWZ0ZXIgYWxsIHJlZHVjZXJzIGhhdmUgcnVuIHRvIGJyb2FkY2FzdCBwb3NzaWJsZSB1cGRhdGVzLiBEb2VzXG4gICAqIG5vdCBjaGVjayB0byBzZWUgaWYgdGhlIHN0YXRlIHdhcyBhY3R1YWxseSB1cGRhdGVkLlxuICAgKi9cbiAgaGFuZGxlU3RhdGVNdXRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnModGhpcy5nZXRTdGF0ZSgpKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBTdG9yZSgpOyIsInZhciBfYXBwU3RvcmUgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX21peGluQXBwbGljYXRpb25WaWV3ICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvQXBwbGljYXRpb25WaWV3LmpzJyksXG4gICAgX21peGluTnVkb3J1Q29udHJvbHMgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5OdWRvcnVDb250cm9scy5qcycpLFxuICAgIF9taXhpbkNvbXBvbmVudFZpZXdzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMnKSxcbiAgICBfbWl4aW5TdG9yZVN0YXRlVmlld3MgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzJyksXG4gICAgX21peGluRXZlbnREZWxlZ2F0b3IgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5FdmVudERlbGVnYXRvci5qcycpLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0ID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyk7XG5cbi8qKlxuICogVmlldyBmb3IgYW4gYXBwbGljYXRpb24uXG4gKi9cblxudmFyIEFwcFZpZXcgPSBOb3JpLmNyZWF0ZVZpZXcoe1xuXG4gIG1peGluczogW1xuICAgIF9taXhpbkFwcGxpY2F0aW9uVmlldyxcbiAgICBfbWl4aW5OdWRvcnVDb250cm9scyxcbiAgICBfbWl4aW5Db21wb25lbnRWaWV3cyxcbiAgICBfbWl4aW5TdG9yZVN0YXRlVmlld3MsXG4gICAgX21peGluRXZlbnREZWxlZ2F0b3IoKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCgpXG4gIF0sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyhbJ2FwcGxpY2F0aW9uc2NhZmZvbGQnLCAnYXBwbGljYXRpb25jb21wb25lbnRzc2NhZmZvbGQnXSk7XG4gICAgdGhpcy5pbml0aWFsaXplU3RhdGVWaWV3cyhfYXBwU3RvcmUpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzKCk7XG5cbiAgICB0aGlzLmNvbmZpZ3VyZVZpZXdzKCk7XG4gIH0sXG5cbiAgY29uZmlndXJlVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2NyZWVuVGl0bGUgICAgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uVGl0bGUuanMnKSgpLFxuICAgICAgICBzY3JlZW5QbGF5ZXJTZWxlY3QgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5QbGF5ZXJTZWxlY3QuanMnKSgpLFxuICAgICAgICBzY3JlZW5XYWl0aW5nT25QbGF5ZXIgPSByZXF1aXJlKCcuL1NjcmVlbi5XYWl0aW5nT25QbGF5ZXIuanMnKSgpLFxuICAgICAgICBzY3JlZW5NYWluR2FtZSAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5NYWluR2FtZS5qcycpKCksXG4gICAgICAgIHNjcmVlbkdhbWVPdmVyICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLkdhbWVPdmVyLmpzJykoKSxcbiAgICAgICAgZ2FtZVN0YXRlcyAgICAgICAgICAgID0gX2FwcFN0b3JlLmdhbWVTdGF0ZXM7XG5cbiAgICB0aGlzLnNldFZpZXdNb3VudFBvaW50KCcjY29udGVudHMnKTtcblxuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1swXSwgJ3RpdGxlJywgc2NyZWVuVGl0bGUpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1sxXSwgJ3BsYXllcnNlbGVjdCcsIHNjcmVlblBsYXllclNlbGVjdCk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzJdLCAnd2FpdGluZ29ucGxheWVyJywgc2NyZWVuV2FpdGluZ09uUGxheWVyKTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbM10sICdnYW1lJywgc2NyZWVuTWFpbkdhbWUpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1s0XSwgJ2dhbWVvdmVyJywgc2NyZWVuR2FtZU92ZXIpO1xuXG4gIH0sXG5cbiAgLyoqXG4gICAqIERyYXcgYW5kIFVJIHRvIHRoZSBET00gYW5kIHNldCBldmVudHNcbiAgICovXG4gIHJlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXcoKTsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICNnYW1lb3Zlcl9fYnV0dG9uLXJlcGxheSc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBuZXh0U3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICBuZXh0U3RhdGUuZ3JlZXRpbmcgKz0gJyAodXBkYXRlZCknO1xuICAgIHJldHVybiBuZXh0U3RhdGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsInZhciBfbm9yaUFjdGlvbnMgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJyksXG4gICAgX2FwcFZpZXcgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3JyksXG4gICAgX2FwcFN0b3JlICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI2dhbWVfX2J1dHRvbi1za2lwJzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbNF19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5leHRTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIG5leHRTdGF0ZS5ncmVldGluZyArPSAnICh1cGRhdGVkKSc7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG5cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tam9pbnJvb20nICA6IHRoaXMub25Kb2luUm9vbS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1jcmVhdGVyb29tJzogdGhpcy5vbkNyZWF0ZVJvb20uYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tZ28nICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzJdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBuZXh0U3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICBuZXh0U3RhdGUuZ3JlZXRpbmcgKz0gJyAodXBkYXRlZCknO1xuICAgIHJldHVybiBuZXh0U3RhdGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuXG4gIH0sXG5cbiAgb25Kb2luUm9vbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciByb29tSUQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19yb29taWQnKS52YWx1ZTtcbiAgICBjb25zb2xlLmxvZygnSm9pbiByb29tICcgKyByb29tSUQpO1xuICAgIGlmICh0aGlzLnZhbGlkYXRlUm9vbUlEKHJvb21JRCkpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdSb29tIElEIE9LJyk7XG4gICAgICBfYXBwVmlldy5ub3RpZnkoJycsICdSb29tIElEIG9rIScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfYXBwVmlldy5hbGVydCgnQmFkIFJvb20gSUQnLCAnVGhlIHJvb20gSUQgaXMgbm90IGNvcnJlY3QuIE11c3QgYmUgYSA1IGRpZ2l0IG51bWJlci4nKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJvb20gSUQgbXVzdCBiZSBhbiBpbnRlZ2VyIGFuZCA1IGRpZ2l0c1xuICAgKiBAcGFyYW0gcm9vbUlEXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgdmFsaWRhdGVSb29tSUQ6IGZ1bmN0aW9uIChyb29tSUQpIHtcbiAgICBpZiAoaXNOYU4ocGFyc2VJbnQocm9vbUlEKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHJvb21JRC5sZW5ndGggIT09IDUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgb25DcmVhdGVSb29tOiBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ2NyZWF0ZSByb29tJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsInZhciBfbm9yaUFjdGlvbnMgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJyksXG4gICAgX2FwcFZpZXcgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3JyksXG4gICAgX2FwcFN0b3JlICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI3RpdGxlX19idXR0b24tc3RhcnQnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1sxXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbmV4dFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgbmV4dFN0YXRlLmdyZWV0aW5nICs9ICcgKHVwZGF0ZWQpJztcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICN3YWl0aW5nX19idXR0b24tc2tpcCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzNdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBuZXh0U3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICBuZXh0U3RhdGUuZ3JlZXRpbmcgKz0gJyAodXBkYXRlZCknO1xuICAgIHJldHVybiBuZXh0U3RhdGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qKlxuICogSW5pdGlhbCBmaWxlIGZvciB0aGUgQXBwbGljYXRpb25cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgLyoqXG4gICAqIElFIHZlcnNpb25zIDkgYW5kIHVuZGVyIGFyZSBibG9ja2VkLCBvdGhlcnMgYXJlIGFsbG93ZWQgdG8gcHJvY2VlZFxuICAgKi9cbiAgaWYoX2Jyb3dzZXJJbmZvLm5vdFN1cHBvcnRlZCB8fCBfYnJvd3NlckluZm8uaXNJRTkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuaW5uZXJIVE1MID0gJzxoMz5Gb3IgdGhlIGJlc3QgZXhwZXJpZW5jZSwgcGxlYXNlIHVzZSBJbnRlcm5ldCBFeHBsb3JlciAxMCssIEZpcmVmb3gsIENocm9tZSBvciBTYWZhcmkgdG8gdmlldyB0aGlzIGFwcGxpY2F0aW9uLjwvaDM+JztcbiAgfSBlbHNlIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24gbW9kdWxlIGFuZCBpbml0aWFsaXplXG4gICAgICovXG4gICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgd2luZG93Lk5vcmkgPSByZXF1aXJlKCcuL25vcmkvTm9yaS5qcycpO1xuICAgICAgd2luZG93LkFQUCA9IHJlcXVpcmUoJy4vYXBwL0FwcC5qcycpO1xuICAgICAgQVBQLmluaXRpYWxpemUoKTtcbiAgICB9O1xuXG4gIH1cblxufSgpKTsiLCJ2YXIgTm9yaSA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2Rpc3BhdGNoZXIgPSByZXF1aXJlKCcuL3V0aWxzL0Rpc3BhdGNoZXIuanMnKSxcbiAgICAgIF9yb3V0ZXIgICAgID0gcmVxdWlyZSgnLi91dGlscy9Sb3V0ZXIuanMnKTtcblxuICAvLyBTd2l0Y2ggTG9kYXNoIHRvIHVzZSBNdXN0YWNoZSBzdHlsZSB0ZW1wbGF0ZXNcbiAgXy50ZW1wbGF0ZVNldHRpbmdzLmludGVycG9sYXRlID0gL3t7KFtcXHNcXFNdKz8pfX0vZztcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFjY2Vzc29yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBnZXREaXNwYXRjaGVyKCkge1xuICAgIHJldHVybiBfZGlzcGF0Y2hlcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJvdXRlcigpIHtcbiAgICByZXR1cm4gX3JvdXRlcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sICh3aW5kb3cuQVBQX0NPTkZJR19EQVRBIHx8IHt9KSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50Um91dGUoKSB7XG4gICAgcmV0dXJuIF9yb3V0ZXIuZ2V0Q3VycmVudFJvdXRlKCk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEZhY3RvcmllcyAtIGNvbmNhdGVuYXRpdmUgaW5oZXJpdGFuY2UsIGRlY29yYXRvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIE1lcmdlcyBhIGNvbGxlY3Rpb24gb2Ygb2JqZWN0c1xuICAgKiBAcGFyYW0gdGFyZ2V0XG4gICAqIEBwYXJhbSBzb3VyY2VBcnJheVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFzc2lnbkFycmF5KHRhcmdldCwgc291cmNlQXJyYXkpIHtcbiAgICBzb3VyY2VBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgIHRhcmdldCA9IF8uYXNzaWduKHRhcmdldCwgc291cmNlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBOb3JpIGFwcGxpY2F0aW9uIGluc3RhbmNlXG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVBcHBsaWNhdGlvbihjdXN0b20pIHtcbiAgICBjdXN0b20ubWl4aW5zLnB1c2godGhpcyk7XG4gICAgcmV0dXJuIGJ1aWxkRnJvbU1peGlucyhjdXN0b20pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgbWFpbiBhcHBsaWNhdGlvbiBzdG9yZVxuICAgKiBAcGFyYW0gY3VzdG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3RvcmUoY3VzdG9tKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNzKCkge1xuICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBidWlsZEZyb21NaXhpbnMoY3VzdG9tKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIG1haW4gYXBwbGljYXRpb24gdmlld1xuICAgKiBAcGFyYW0gY3VzdG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlVmlldyhjdXN0b20pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gY3YoKSB7XG4gICAgICByZXR1cm4gXy5hc3NpZ24oe30sIGJ1aWxkRnJvbU1peGlucyhjdXN0b20pKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE1peGVzIGluIHRoZSBtb2R1bGVzIHNwZWNpZmllZCBpbiB0aGUgY3VzdG9tIGFwcGxpY2F0aW9uIG9iamVjdFxuICAgKiBAcGFyYW0gc291cmNlT2JqZWN0XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYnVpbGRGcm9tTWl4aW5zKHNvdXJjZU9iamVjdCkge1xuICAgIHZhciBtaXhpbnM7XG5cbiAgICBpZiAoc291cmNlT2JqZWN0Lm1peGlucykge1xuICAgICAgbWl4aW5zID0gc291cmNlT2JqZWN0Lm1peGlucztcbiAgICB9XG5cbiAgICBtaXhpbnMucHVzaChzb3VyY2VPYmplY3QpO1xuICAgIHJldHVybiBhc3NpZ25BcnJheSh7fSwgbWl4aW5zKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBGdW5jdGlvbmFsIHV0aWxzIGZyb20gTWl0aHJpbFxuICAvLyAgaHR0cHM6Ly9naXRodWIuY29tL2xob3JpZS9taXRocmlsLmpzL2Jsb2IvbmV4dC9taXRocmlsLmpzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGh0dHA6Ly9taXRocmlsLmpzLm9yZy9taXRocmlsLnByb3AuaHRtbFxuICBmdW5jdGlvbiBwcm9wKHN0b3JlKSB7XG4gICAgLy9pZiAoaXNGdW5jdGlvbihzdG9yZS50aGVuKSkge1xuICAgIC8vICAvLyBoYW5kbGUgYSBwcm9taXNlXG4gICAgLy99XG4gICAgdmFyIGdldHRlcnNldHRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIHN0b3JlID0gYXJndW1lbnRzWzBdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0b3JlO1xuICAgIH07XG5cbiAgICBnZXR0ZXJzZXR0ZXIudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHN0b3JlO1xuICAgIH07XG5cbiAgICByZXR1cm4gZ2V0dGVyc2V0dGVyO1xuICB9XG5cbiAgLy8gaHR0cDovL21pdGhyaWwuanMub3JnL21pdGhyaWwud2l0aEF0dHIuaHRtbFxuICBmdW5jdGlvbiB3aXRoQXR0cihwcm9wLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgICAgZSA9IGUgfHwgZXZlbnQ7XG5cbiAgICAgIHZhciBjdXJyZW50VGFyZ2V0ID0gZS5jdXJyZW50VGFyZ2V0IHx8IHRoaXMsXG4gICAgICAgICAgY250eCAgICAgICAgICA9IGNvbnRleHQgfHwgdGhpcztcblxuICAgICAgY2FsbGJhY2suY2FsbChjbnR4LCBwcm9wIGluIGN1cnJlbnRUYXJnZXQgPyBjdXJyZW50VGFyZ2V0W3Byb3BdIDogY3VycmVudFRhcmdldC5nZXRBdHRyaWJ1dGUocHJvcCkpO1xuICAgIH07XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGNvbmZpZyAgICAgICAgICAgOiBnZXRDb25maWcsXG4gICAgZGlzcGF0Y2hlciAgICAgICA6IGdldERpc3BhdGNoZXIsXG4gICAgcm91dGVyICAgICAgICAgICA6IGdldFJvdXRlcixcbiAgICBjcmVhdGVBcHBsaWNhdGlvbjogY3JlYXRlQXBwbGljYXRpb24sXG4gICAgY3JlYXRlU3RvcmUgICAgICA6IGNyZWF0ZVN0b3JlLFxuICAgIGNyZWF0ZVZpZXcgICAgICAgOiBjcmVhdGVWaWV3LFxuICAgIGJ1aWxkRnJvbU1peGlucyAgOiBidWlsZEZyb21NaXhpbnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBhc3NpZ25BcnJheSAgICAgIDogYXNzaWduQXJyYXksXG4gICAgcHJvcCAgICAgICAgICAgICA6IHByb3AsXG4gICAgd2l0aEF0dHIgICAgICAgICA6IHdpdGhBdHRyXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaSgpO1xuXG5cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBDSEFOR0VfU1RPUkVfU1RBVEU6ICdDSEFOR0VfU1RPUkVfU1RBVEUnXG59OyIsIi8qKlxuICogQWN0aW9uIENyZWF0b3JcbiAqIEJhc2VkIG9uIEZsdXggQWN0aW9uc1xuICogRm9yIG1vcmUgaW5mb3JtYXRpb24gYW5kIGd1aWRlbGluZXM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBfbm9yaUFjdGlvbkNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQWN0aW9uQ29uc3RhbnRzLmpzJyk7XG5cbnZhciBOb3JpQWN0aW9uQ3JlYXRvciA9IHtcblxuICBjaGFuZ2VTdG9yZVN0YXRlOiBmdW5jdGlvbiAoZGF0YSwgaWQpIHtcbiAgICB2YXIgYWN0aW9uID0ge1xuICAgICAgdHlwZSAgIDogX25vcmlBY3Rpb25Db25zdGFudHMuQ0hBTkdFX1NUT1JFX1NUQVRFLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBpZCAgOiBpZCxcbiAgICAgICAgZGF0YTogZGF0YVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gYWN0aW9uO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaUFjdGlvbkNyZWF0b3I7IiwidmFyIFNvY2tldElPQ29ubmVjdG9yID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfc3ViamVjdCAgPSBuZXcgUnguQmVoYXZpb3JTdWJqZWN0KCksXG4gICAgICBfc29ja2V0SU8gPSBpbygpLFxuICAgICAgX2V2ZW50cyAgID0ge1xuICAgICAgICBQSU5HICAgICAgICAgICAgIDogJ3BpbmcnLFxuICAgICAgICBQT05HICAgICAgICAgICAgIDogJ3BvbmcnLFxuICAgICAgICBOT1RJRllfQ0xJRU5UICAgIDogJ25vdGlmeV9jbGllbnQnLFxuICAgICAgICBOT1RJRllfU0VSVkVSICAgIDogJ25vdGlmeV9zZXJ2ZXInLFxuICAgICAgICBDT05ORUNUICAgICAgICAgIDogJ2Nvbm5lY3QnLFxuICAgICAgICBEUk9QUEVEICAgICAgICAgIDogJ2Ryb3BwZWQnLFxuICAgICAgICBVU0VSX0NPTk5FQ1RFRCAgIDogJ3VzZXJfY29ubmVjdGVkJyxcbiAgICAgICAgVVNFUl9ESVNDT05ORUNURUQ6ICd1c2VyX2Rpc2Nvbm5lY3RlZCcsXG4gICAgICAgIEVNSVQgICAgICAgICAgICAgOiAnZW1pdCcsXG4gICAgICAgIEJST0FEQ0FTVCAgICAgICAgOiAnYnJvYWRjYXN0JyxcbiAgICAgICAgU1lTVEVNX01FU1NBR0UgICA6ICdzeXN0ZW1fbWVzc2FnZScsXG4gICAgICAgIE1FU1NBR0UgICAgICAgICAgOiAnbWVzc2FnZScsXG4gICAgICAgIENSRUFURV9ST09NICAgICAgOiAnY3JlYXRlX3Jvb20nLFxuICAgICAgICBKT0lOX1JPT00gICAgICAgIDogJ2pvaW5fcm9vbScsXG4gICAgICAgIExFQVZFX1JPT00gICAgICAgOiAnbGVhdmVfcm9vbSdcbiAgICAgIH07XG5cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIF9zb2NrZXRJTy5vbihfZXZlbnRzLk5PVElGWV9DTElFTlQsIG9uTm90aWZ5Q2xpZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgbm90aWZpY2F0aW9ucyBmcm9tIFNvY2tldC5pbyBjb21lIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWQge3R5cGUsIGlkLCB0aW1lLCBwYXlsb2FkfVxuICAgKi9cbiAgZnVuY3Rpb24gb25Ob3RpZnlDbGllbnQocGF5bG9hZCkge1xuICAgIGlmIChwYXlsb2FkLnR5cGUgPT09IF9ldmVudHMuUElORykge1xuICAgICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUE9ORywge30pO1xuICAgIH0gZWxzZSBpZiAocGF5bG9hZC50eXBlID09PSBfZXZlbnRzLlBPTkcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTT0NLRVQuSU8gUE9ORyEnKTtcbiAgICB9XG4gICAgbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCk7XG4gIH1cblxuICBmdW5jdGlvbiBwaW5nKCkge1xuICAgIG5vdGlmeVNlcnZlcihfZXZlbnRzLlBJTkcsIHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgY29tbXVuaWNhdGlvbnMgdG8gdGhlIHNlcnZlciBzaG91bGQgZ28gdGhyb3VnaCBoZXJlXG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTZXJ2ZXIodHlwZSwgcGF5bG9hZCkge1xuICAgIF9zb2NrZXRJTy5lbWl0KF9ldmVudHMuTk9USUZZX1NFUlZFUiwge1xuICAgICAgdHlwZSAgIDogdHlwZSxcbiAgICAgIHBheWxvYWQ6IHBheWxvYWRcbiAgICB9KTtcbiAgfVxuXG4gIC8vZnVuY3Rpb24gZW1pdChtZXNzYWdlLCBwYXlsb2FkKSB7XG4gIC8vICBtZXNzYWdlID0gbWVzc2FnZSB8fCBfZXZlbnRzLk1FU1NBR0U7XG4gIC8vICBwYXlsb2FkID0gcGF5bG9hZCB8fCB7fTtcbiAgLy8gIF9zb2NrZXRJTy5lbWl0KG1lc3NhZ2UsIHBheWxvYWQpO1xuICAvL31cbiAgLy9cbiAgLy9mdW5jdGlvbiBvbihldmVudCwgaGFuZGxlcikge1xuICAvLyAgX3NvY2tldElPLm9uKGV2ZW50LCBoYW5kbGVyKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSBoYW5kbGVyIHRvIHVwZGF0ZXNcbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlcikge1xuICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIGZyb20gdXBkYXRlIG9yIHdoYXRldmVyIGZ1bmN0aW9uIHRvIGRpc3BhdGNoIHRvIHN1YnNjcmliZXJzXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVycyhwYXlsb2FkKSB7XG4gICAgX3N1YmplY3Qub25OZXh0KHBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGxhc3QgcGF5bG9hZCB0aGF0IHdhcyBkaXNwYXRjaGVkIHRvIHN1YnNjcmliZXJzXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TGFzdE5vdGlmaWNhdGlvbigpIHtcbiAgICByZXR1cm4gX3N1YmplY3QuZ2V0VmFsdWUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEV2ZW50Q29uc3RhbnRzKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2V2ZW50cyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGV2ZW50cyAgICAgICAgICAgICA6IGdldEV2ZW50Q29uc3RhbnRzLFxuICAgIGluaXRpYWxpemUgICAgICAgICA6IGluaXRpYWxpemUsXG4gICAgcGluZyAgICAgICAgICAgICAgIDogcGluZyxcbiAgICBub3RpZnlTZXJ2ZXIgICAgICAgOiBub3RpZnlTZXJ2ZXIsXG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIG5vdGlmeVN1YnNjcmliZXJzICA6IG5vdGlmeVN1YnNjcmliZXJzLFxuICAgIGdldExhc3ROb3RpZmljYXRpb246IGdldExhc3ROb3RpZmljYXRpb25cbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTb2NrZXRJT0Nvbm5lY3RvcigpOyIsIi8qKlxuICogTWFwIGRhdGEgdHlwZVxuICovXG5cbnZhciBNYXAgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyxcbiAgICAgIF9pZCxcbiAgICAgIF9wYXJlbnRDb2xsZWN0aW9uLFxuICAgICAgX2RpcnR5ICAgPSBmYWxzZSxcbiAgICAgIF9lbnRyaWVzID0gW10sXG4gICAgICBfbWFwICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0aWFsaXphdGlvblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGluaXRPYmopIHtcbiAgICBpZiAoIWluaXRPYmouaWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU3RvcmUgbXVzdCBiZSBpbml0XFwnZCB3aXRoIGFuIGlkJyk7XG4gICAgfVxuXG4gICAgX3RoaXMgPSB0aGlzO1xuICAgIF9pZCAgID0gaW5pdE9iai5pZDtcblxuICAgIGlmIChpbml0T2JqLnN0b3JlKSB7XG4gICAgICBfZGlydHkgPSB0cnVlO1xuICAgICAgX21hcCAgID0gaW5pdE9iai5zdG9yZTtcbiAgICB9IGVsc2UgaWYgKGluaXRPYmouanNvbikge1xuICAgICAgc2V0SlNPTihpbml0T2JqLmpzb24pO1xuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIFNldCBtYXAgc3RvcmUgZnJvbSBhIEpTT04gb2JqZWN0XG4gICAqIEBwYXJhbSBqc3RyXG4gICAqL1xuICBmdW5jdGlvbiBzZXRKU09OKGpzdHIpIHtcbiAgICBfZGlydHkgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBfbWFwID0gSlNPTi5wYXJzZShqc3RyKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01hcENvbGxlY3Rpb24sIGVycm9yIHBhcnNpbmcgSlNPTjonLCBqc3RyLCBlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJRCgpIHtcbiAgICByZXR1cm4gX2lkO1xuICB9XG5cbiAgLyoqXG4gICAqIEVyYXNlIGl0XG4gICAqL1xuICBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICBfbWFwICAgPSB7fTtcbiAgICBfZGlydHkgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNEaXJ0eSgpIHtcbiAgICByZXR1cm4gX2RpcnR5O1xuICB9XG5cbiAgZnVuY3Rpb24gbWFya0NsZWFuKCkge1xuICAgIF9kaXJ0eSA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBwcm9wZXJ0eSBvciBtZXJnZSBpbiBuZXcgZGF0YVxuICAgKiBAcGFyYW0ga2V5IFN0cmluZyA9IG5hbWUgb2YgcHJvcGVydHkgdG8gc2V0LCBPYmplY3QgPSB3aWxsIG1lcmdlIG5ldyBwcm9wc1xuICAgKiBAcGFyYW0gdmFsdWUgU3RyaW5nID0gdmFsdWUgb2YgcHJvcGVydHkgdG8gc2V0XG4gICAqL1xuICBmdW5jdGlvbiBzZXQoa2V5LCB2YWx1ZSkge1xuXG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnKSB7XG4gICAgICBfbWFwID0gXy5tZXJnZSh7fSwgX21hcCwga2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX21hcFtrZXldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gTWFyayBjaGFuZ2VkXG4gICAgX2RpcnR5ID0gdHJ1ZTtcblxuICAgIGRpc3BhdGNoQ2hhbmdlKCdzZXRfa2V5Jyk7XG4gIH1cblxuICAvKipcbiAgICogQXNzdW1pbmcgdGhhdCBfbWFwW2tleV0gaXMgYW4gb2JqZWN0LCB0aGlzIHdpbGwgc2V0IGEgcHJvcGVydHkgb24gaXRcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcGFyYW0gcHJvcFxuICAgKiBAcGFyYW0gZGF0YVxuICAgKi9cbiAgZnVuY3Rpb24gc2V0S2V5UHJvcChrZXksIHByb3AsIGRhdGEpIHtcbiAgICBfbWFwW2tleV1bcHJvcF0gPSBkYXRhO1xuXG4gICAgX2RpcnR5ID0gdHJ1ZTtcbiAgICBkaXNwYXRjaENoYW5nZSgnc2V0X2tleScpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBkYXRhXG4gICAqIEByZXR1cm5zICpcbiAgICovXG4gIGZ1bmN0aW9uIGdldChrZXkpIHtcbiAgICB2YXIgdmFsdWUgPSBoYXMoa2V5KSA/IF9tYXBba2V5XSA6IHVuZGVmaW5lZDtcblxuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBfLmNsb25lRGVlcCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFzc3VtaW5nIHRoYXQgX21hcFtrZXldIGlzIGFuIG9iamVjdCwgdGhpcyB3aWxsIGdldCB2YWx1ZVxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEBwYXJhbSBwcm9wXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0S2V5UHJvcChrZXksIHByb3ApIHtcbiAgICB2YXIgdmFsdWVPYmogPSBoYXMoa2V5KSA/IF9tYXBba2V5XSA6IHVuZGVmaW5lZCxcbiAgICAgICAgdmFsdWUgICAgPSBudWxsO1xuXG4gICAgaWYgKHZhbHVlT2JqKSB7XG4gICAgICB2YWx1ZSA9IF8uY2xvbmVEZWVwKHZhbHVlT2JqW3Byb3BdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIG9mIHRoZSBrZXkgaXMgcHJlc2VudCBpbiB0aGUgbWFwXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBmdW5jdGlvbiBoYXMoa2V5KSB7XG4gICAgcmV0dXJuIF9tYXAuaGFzT3duUHJvcGVydHkoa2V5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBrZXkvdmFsdWVzLiBSZXN1bHRzIGFyZSBjYWNoZWQgYW5kIG9ubHkgcmVnZW5lcmF0ZWRcbiAgICogaWYgY2hhbmdlZCAoc2V0KVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBlbnRyaWVzKCkge1xuICAgIGlmICghX2RpcnR5ICYmIF9lbnRyaWVzKSB7XG4gICAgICByZXR1cm4gX2VudHJpZXM7XG4gICAgfVxuXG4gICAgdmFyIGFycnkgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gX21hcCkge1xuICAgICAgYXJyeS5wdXNoKHtrZXk6IGtleSwgdmFsdWU6IF9tYXBba2V5XX0pO1xuICAgIH1cblxuICAgIF9lbnRyaWVzID0gYXJyeTtcbiAgICBfZGlydHkgICA9IGZhbHNlO1xuXG4gICAgcmV0dXJuIGFycnk7XG4gIH1cblxuICAvKipcbiAgICogTnVtYmVyIG9mIGVudHJpZXNcbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIHNpemUoKSB7XG4gICAgcmV0dXJuIGtleXMoKS5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiBhcnJheSBvZiBhbGwga2V5cyBpbiB0aGUgbWFwXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGtleXMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKF9tYXApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gYXJyYXkgb2YgYWxsIHZhdWxlcyBpbiB0aGUgbWFwXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICByZXR1cm4gZW50cmllcygpLm1hcChmdW5jdGlvbiAoZW50cnkpIHtcbiAgICAgIHJldHVybiBlbnRyeS52YWx1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSB2YWx1ZVxuICAgKiBAcGFyYW0ga2V5XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmUoa2V5KSB7XG4gICAgZGVsZXRlIF9tYXBba2V5XTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIG1hdGNoZXMgdG8gdGhlIHByZWRpY2F0ZSBmdW5jdGlvblxuICAgKiBAcGFyYW0gcHJlZGljYXRlXG4gICAqIEByZXR1cm5zIHtBcnJheS48VD59XG4gICAqL1xuICBmdW5jdGlvbiBmaWx0ZXJWYWx1ZXMocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIHZhbHVlcygpLmZpbHRlcihwcmVkaWNhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlyc3QoKSB7XG4gICAgcmV0dXJuIGVudHJpZXMoKVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxhc3QoKSB7XG4gICAgdmFyIGUgPSBlbnRyaWVzKCk7XG4gICAgcmV0dXJuIGVbZS5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEF0SW5kZXgoaSkge1xuICAgIHJldHVybiBlbnRyaWVzKClbaV07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGNvcHkgb2YgdGhlIGRhdGEgbWFwXG4gICAqIEByZXR1cm5zIHt2b2lkfCp9XG4gICAqL1xuICBmdW5jdGlvbiB0b09iamVjdCgpIHtcbiAgICByZXR1cm4gXy5tZXJnZSh7fSwgX21hcCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgbmV3IG9iamVjdCBieSBcInRyYW5zbGF0aW5nXCIgdGhlIHByb3BlcnRpZXMgb2YgdGhlIG1hcCBmcm9tIG9uZSBrZXkgdG8gYW5vdGhlclxuICAgKiBAcGFyYW0gdE9iaiB7Y3VycmVudFByb3AsIG5ld1Byb3B9XG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2Zvcm0odE9iaikge1xuICAgIHZhciB0cmFuc2Zvcm1lZCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHRPYmopIHtcbiAgICAgIGlmIChfbWFwLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgIHRyYW5zZm9ybWVkW3RPYmpbcHJvcF1dID0gX21hcFtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJhbnNmb3JtZWQ7XG4gIH1cblxuICAvKipcbiAgICogT24gY2hhbmdlLCBlbWl0IGV2ZW50IGdsb2JhbGx5XG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaENoYW5nZSh0eXBlKSB7XG4gICAgdmFyIHBheWxvYWQgPSB7XG4gICAgICBpZCAgICAgOiBfaWQsXG4gICAgICBtYXBUeXBlOiAnc3RvcmUnXG4gICAgfTtcblxuICAgIF90aGlzLm5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpO1xuXG4gICAgaWYgKF9wYXJlbnRDb2xsZWN0aW9uLmRpc3BhdGNoQ2hhbmdlKSB7XG4gICAgICBfcGFyZW50Q29sbGVjdGlvbi5kaXNwYXRjaENoYW5nZSh7XG4gICAgICAgIGlkOiBfaWRcbiAgICAgIH0sICh0eXBlIHx8ICdtYXAnKSk7XG4gICAgfVxuXG4gIH1cblxuICBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KF9tYXApO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGFyZW50Q29sbGVjdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgX3BhcmVudENvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGFyZW50Q29sbGVjdGlvbigpIHtcbiAgICByZXR1cm4gX3BhcmVudENvbGxlY3Rpb247XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemUgICAgICAgICA6IGluaXRpYWxpemUsXG4gICAgZ2V0SUQgICAgICAgICAgICAgIDogZ2V0SUQsXG4gICAgY2xlYXIgICAgICAgICAgICAgIDogY2xlYXIsXG4gICAgaXNEaXJ0eSAgICAgICAgICAgIDogaXNEaXJ0eSxcbiAgICBtYXJrQ2xlYW4gICAgICAgICAgOiBtYXJrQ2xlYW4sXG4gICAgc2V0SlNPTiAgICAgICAgICAgIDogc2V0SlNPTixcbiAgICBzZXQgICAgICAgICAgICAgICAgOiBzZXQsXG4gICAgc2V0S2V5UHJvcCAgICAgICAgIDogc2V0S2V5UHJvcCxcbiAgICBnZXQgICAgICAgICAgICAgICAgOiBnZXQsXG4gICAgZ2V0S2V5UHJvcCAgICAgICAgIDogZ2V0S2V5UHJvcCxcbiAgICBoYXMgICAgICAgICAgICAgICAgOiBoYXMsXG4gICAgcmVtb3ZlICAgICAgICAgICAgIDogcmVtb3ZlLFxuICAgIGtleXMgICAgICAgICAgICAgICA6IGtleXMsXG4gICAgdmFsdWVzICAgICAgICAgICAgIDogdmFsdWVzLFxuICAgIGVudHJpZXMgICAgICAgICAgICA6IGVudHJpZXMsXG4gICAgZmlsdGVyVmFsdWVzICAgICAgIDogZmlsdGVyVmFsdWVzLFxuICAgIHNpemUgICAgICAgICAgICAgICA6IHNpemUsXG4gICAgZmlyc3QgICAgICAgICAgICAgIDogZmlyc3QsXG4gICAgbGFzdCAgICAgICAgICAgICAgIDogbGFzdCxcbiAgICBnZXRBdEluZGV4ICAgICAgICAgOiBnZXRBdEluZGV4LFxuICAgIHRvT2JqZWN0ICAgICAgICAgICA6IHRvT2JqZWN0LFxuICAgIHRyYW5zZm9ybSAgICAgICAgICA6IHRyYW5zZm9ybSxcbiAgICB0b0pTT04gICAgICAgICAgICAgOiB0b0pTT04sXG4gICAgc2V0UGFyZW50Q29sbGVjdGlvbjogc2V0UGFyZW50Q29sbGVjdGlvbixcbiAgICBnZXRQYXJlbnRDb2xsZWN0aW9uOiBnZXRQYXJlbnRDb2xsZWN0aW9uXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwOyIsIi8qKlxuICogTWFwIENvbGxlY3Rpb24gLSBhbiBhcnJheSBvZiBtYXBzXG4gKi9cbnZhciBNYXBDb2xsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMsXG4gICAgICBfaWQsXG4gICAgICBfcGFyZW50Q29sbGVjdGlvbixcbiAgICAgIF9jYXJldCAgICA9IDAsXG4gICAgICBfY2hpbGRyZW4gPSBbXTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEluaXRpYWxpemF0aW9uXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoaW5pdE9iaikge1xuICAgIGlmICghaW5pdE9iai5pZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTdG9yZUNvbGxlY3Rpb24gbXVzdCBiZSBpbml0XFwnZCB3aXRoIGFuIGlkJyk7XG4gICAgfVxuXG4gICAgX3RoaXMgPSB0aGlzO1xuICAgIF9pZCAgID0gaW5pdE9iai5pZDtcblxuICAgIC8vIFRPRE8gdGVzdFxuICAgIGlmIChpbml0T2JqLnN0b3Jlcykge1xuICAgICAgYWRkTWFwc0Zyb21BcnJheS5jYWxsKF90aGlzLCBpbml0T2JqLnN0b3Jlcyk7XG4gICAgfVxuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJdGVyYXRvclxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBuZXh0KCkge1xuICAgIHZhciByZXQgPSB7fTtcbiAgICBpZiAoaGFzTmV4dCgpKSB7XG4gICAgICByZXQgPSB7dmFsdWU6IF9jaGlsZHJlbltfY2FyZXQrK10sIGRvbmU6ICFoYXNOZXh0KCl9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXQgPSBjdXJyZW50KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGN1cnJlbnQoKSB7XG4gICAgcmV0dXJuIHt2YWx1ZTogX2NoaWxkcmVuW19jYXJldF0sIGRvbmU6ICFoYXNOZXh0KCl9O1xuICB9XG5cbiAgZnVuY3Rpb24gcmV3aW5kKCkge1xuICAgIF9jYXJldCA9IDA7XG4gICAgcmV0dXJuIF9jaGlsZHJlbltfY2FyZXRdO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFzTmV4dCgpIHtcbiAgICByZXR1cm4gX2NhcmV0IDwgX2NoaWxkcmVuLmxlbmd0aDtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgSW1wbFxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBpc0RpcnR5KCkge1xuICAgIHZhciBkaXJ0eSA9IGZhbHNlO1xuICAgIGZvckVhY2goZnVuY3Rpb24gY2hlY2tEaXJ0eShtYXApIHtcbiAgICAgIGlmIChtYXAuaXNEaXJ0eSgpKSB7XG4gICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZGlydHk7XG4gIH1cblxuICBmdW5jdGlvbiBtYXJrQ2xlYW4oKSB7XG4gICAgZm9yRWFjaChmdW5jdGlvbiBjaGVja0RpcnR5KG1hcCkge1xuICAgICAgbWFwLm1hcmtDbGVhbigpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBhcnJheSBvZiBTdG9yZSBpbnN0YW5jZXNcbiAgICogQHBhcmFtIHNBcnJ5XG4gICAqL1xuICBmdW5jdGlvbiBhZGRNYXBzRnJvbUFycmF5KHNBcnJ5KSB7XG4gICAgc0FycnkuZm9yRWFjaChmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICAgIGFkZChzdG9yZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGFkZCBjaGlsZCBTdG9yZSBzdG9yZXMgZnJvbSBhbiBhcnJheSBvZiBvYmplY3RzXG4gICAqIEBwYXJhbSBhcnJheSBBcnJheSBvZiBvYmplY3RzXG4gICAqIEBwYXJhbSBpZEtleSBLZXkgb24gZWFjaCBvYmplY3QgdG8gdXNlIGZvciB0aGUgSUQgb2YgdGhhdCBTdG9yZSBzdG9yZVxuICAgKi9cbiAgZnVuY3Rpb24gYWRkRnJvbU9iakFycmF5KG9BcnJ5LCBpZEtleSkge1xuICAgIGNvbnNvbGUud2FybignTWFwQ29sbGVjdGlvbiwgYWRkRnJvbU9iakFycnksIG5lZWQgdG8gYmUgZml4ZWQgdG8gcmVtb3ZlIHJlZmVyZW5jZSB0byBOb3JpLnN0b3JlKCknKTtcbiAgICBvQXJyeS5mb3JFYWNoKGZ1bmN0aW9uIChvYmopIHtcblxuICAgICAgdmFyIGlkO1xuXG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGlkS2V5KSkge1xuICAgICAgICBpZCA9IG9ialtpZEtleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZCA9IF9pZCArICdjaGlsZCcgKyBfY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICAvL2FkZChOb3JpLnN0b3JlKCkuY3JlYXRlTWFwKHtpZDogaWQsIHN0b3JlOiBvYmp9KSk7XG4gICAgfSk7XG4gICAgZGlzcGF0Y2hDaGFuZ2UoX2lkLCAnYWRkX21hcCcpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkRnJvbUpTT05BcnJheShqc29uLCBpZEtleSkge1xuICAgIGNvbnNvbGUud2FybignTWFwQ29sbGVjdGlvbiwgYWRkRnJvbUpTT05BcnJ5LCBuZWVkIHRvIGJlIGZpeGVkIHRvIHJlbW92ZSByZWZlcmVuY2UgdG8gTm9yaS5zdG9yZSgpJyk7XG4gICAganNvbi5mb3JFYWNoKGZ1bmN0aW9uIChqc3RyKSB7XG5cbiAgICAgIHZhciBpZCwgb2JqO1xuXG4gICAgICB0cnkge1xuICAgICAgICBvYmogPSBKU09OLnBhcnNlKGpzdHIpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01hcENvbGxlY3Rpb24sIGVycm9yIHBhcnNpbmcgSlNPTjonLCBqc3RyLCBlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpZEtleSkpIHtcbiAgICAgICAgaWQgPSBvYmpbaWRLZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWQgPSBfaWQgKyAnY2hpbGQnICsgX2NoaWxkcmVuLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgLy9hZGQoTm9yaS5zdG9yZSgpLmNyZWF0ZU1hcCh7aWQ6IGlkLCBzdG9yZTogb2JqfSkpO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoQ2hhbmdlKF9pZCwgJ2FkZF9tYXAnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElEKCkge1xuICAgIHJldHVybiBfaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBhZGQoc3RvcmUpIHtcbiAgICB2YXIgY3VycklkeCA9IGdldE1hcEluZGV4KHN0b3JlLmdldElEKCkpO1xuXG4gICAgc3RvcmUuc2V0UGFyZW50Q29sbGVjdGlvbihfdGhpcyk7XG5cbiAgICBpZiAoY3VycklkeCA+PSAwKSB7XG4gICAgICBfY2hpbGRyZW5bY3VycklkeF0gPSBzdG9yZTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2NoaWxkcmVuLnB1c2goc3RvcmUpO1xuICAgIH1cblxuICAgIGRpc3BhdGNoQ2hhbmdlKF9pZCwgJ2FkZF9tYXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBzdG9yZSBmcm9tIHRoZSBjb2xsZWN0aW9uXG4gICAqIEBwYXJhbSBzdG9yZUlEXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmUoc3RvcmVJRCkge1xuICAgIHZhciBjdXJySWR4ID0gZ2V0TWFwSW5kZXgoc3RvcmVJRCk7XG4gICAgaWYgKGN1cnJJZHggPj0gMCkge1xuICAgICAgX2NoaWxkcmVuW2N1cnJJZHhdLnNldFBhcmVudENvbGxlY3Rpb24obnVsbCk7XG4gICAgICBfY2hpbGRyZW5bY3VycklkeF0gPSBudWxsO1xuICAgICAgX2NoaWxkcmVuLnNwbGljZShjdXJySWR4LCAxKTtcbiAgICAgIGRpc3BhdGNoQ2hhbmdlKF9pZCwgJ3JlbW92ZV9tYXAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coX2lkICsgJyByZW1vdmUsIHN0b3JlIG5vdCBpbiBjb2xsZWN0aW9uOiAnICsgc3RvcmVJRCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbGwgc3RvcmVzIGZyb20gdGhlIGFycmF5XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVBbGwoKSB7XG4gICAgX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKG1hcCkge1xuICAgICAgbWFwLnNldFBhcmVudENvbGxlY3Rpb24obnVsbCk7XG4gICAgfSk7XG5cbiAgICBfY2hpbGRyZW4gPSBbXTtcbiAgICBkaXNwYXRjaENoYW5nZShfaWQsICdyZW1vdmVfbWFwJyk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgU3RvcmUgYnkgSURcbiAgICogQHBhcmFtIHN0b3JlSURcbiAgICogQHJldHVybnMge1R9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRNYXAoc3RvcmVJRCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChzdG9yZSkge1xuICAgICAgcmV0dXJuIHN0b3JlLmdldElEKCkgPT09IHN0b3JlSUQ7XG4gICAgfSlbMF07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBpbmRleCBpbiBfY2hpbGRyZW4gYXJyYXkgYnkgU3RvcmUncyBJRFxuICAgKiBAcGFyYW0gc3RvcmVJRFxuICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TWFwSW5kZXgoc3RvcmVJRCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChzdG9yZSkge1xuICAgICAgcmV0dXJuIHN0b3JlLmdldElEKCk7XG4gICAgfSkuaW5kZXhPZihzdG9yZUlEKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPbiBjaGFuZ2UsIGVtaXQgZXZlbnQgZ2xvYmFsbHlcbiAgICovXG4gIGZ1bmN0aW9uIGRpc3BhdGNoQ2hhbmdlKGRhdGEsIHR5cGUpIHtcbiAgICB2YXIgcGF5bG9hZCA9IHtcbiAgICAgIGlkICAgICA6IF9pZCxcbiAgICAgIHR5cGUgICA6IHR5cGUgfHwgJycsXG4gICAgICBtYXBUeXBlOiAnY29sbGVjdGlvbicsXG4gICAgICBtYXBJRCAgOiBkYXRhLmlkXG4gICAgfTtcblxuICAgIF90aGlzLm5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpO1xuXG4gICAgaWYgKF9wYXJlbnRDb2xsZWN0aW9uKSB7XG4gICAgICBfcGFyZW50Q29sbGVjdGlvbi5kaXNwYXRjaENoYW5nZSh7aWQ6IF9pZCwgc3RvcmU6IGdldE1hcCgpfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFzTWFwKHN0b3JlSUQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuW3N0b3JlSURdO1xuICB9XG5cbiAgLyoqXG4gICAqIE51bWJlciBvZiBlbnRyaWVzXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBzaXplKCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubGVuZ3RoO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlyc3QoKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlblswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxhc3QoKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbltfY2hpbGRyZW4ubGVuZ3RoIC0gMV07XG4gIH1cblxuICBmdW5jdGlvbiBhdEluZGV4KGkpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuW2ldO1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1bnMgYSBwcmVkaWRhdGUgb24gZWFjaCBjaGlsZCBtYXBcbiAgICogQHBhcmFtIHByZWRpY2F0ZVxuICAgKiBAcmV0dXJucyB7QXJyYXkuPFQ+fVxuICAgKi9cbiAgZnVuY3Rpb24gZmlsdGVyKHByZWRpY2F0ZSkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKHByZWRpY2F0ZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBtYXBzIHdoZXJlIHRoZSBmaWx0ZXIgbWF0Y2hlcyB0aGUgcHJvcCAvIHZhbHVlIHBhaXJcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcGFyYW0gdmFsdWVcbiAgICogQHJldHVybnMge0FycmF5LjxUPn1cbiAgICovXG4gIGZ1bmN0aW9uIGZpbHRlckJ5S2V5KGtleSwgdmFsdWUpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAobWFwKSB7XG4gICAgICByZXR1cm4gbWFwLmdldChrZXkpID09PSB2YWx1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvckVhY2goZnVuYykge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZm9yRWFjaChmdW5jKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1hcChmdW5jKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5tYXAoZnVuYyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFuIGFycmF5IG9mIGVudHJpZXMgb2YgZWFjaCBtYXBcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZW50cmllcygpIHtcbiAgICB2YXIgYXJyeSA9IFtdO1xuICAgIF9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChtYXApIHtcbiAgICAgIGFycnkucHVzaChtYXAuZW50cmllcygpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gYXJyeTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoX2NoaWxkcmVuKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBhcmVudENvbGxlY3Rpb24oY29sbGVjdGlvbikge1xuICAgIF9wYXJlbnRDb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhcmVudENvbGxlY3Rpb24oKSB7XG4gICAgcmV0dXJuIF9wYXJlbnRDb2xsZWN0aW9uO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplICAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIGN1cnJlbnQgICAgICAgICAgICA6IGN1cnJlbnQsXG4gICAgbmV4dCAgICAgICAgICAgICAgIDogbmV4dCxcbiAgICBoYXNOZXh0ICAgICAgICAgICAgOiBoYXNOZXh0LFxuICAgIHJld2luZCAgICAgICAgICAgICA6IHJld2luZCxcbiAgICBnZXRJRCAgICAgICAgICAgICAgOiBnZXRJRCxcbiAgICBpc0RpcnR5ICAgICAgICAgICAgOiBpc0RpcnR5LFxuICAgIG1hcmtDbGVhbiAgICAgICAgICA6IG1hcmtDbGVhbixcbiAgICBhZGQgICAgICAgICAgICAgICAgOiBhZGQsXG4gICAgYWRkTWFwc0Zyb21BcnJheSAgIDogYWRkTWFwc0Zyb21BcnJheSxcbiAgICBhZGRGcm9tT2JqQXJyYXkgICAgOiBhZGRGcm9tT2JqQXJyYXksXG4gICAgYWRkRnJvbUpTT05BcnJheSAgIDogYWRkRnJvbUpTT05BcnJheSxcbiAgICByZW1vdmUgICAgICAgICAgICAgOiByZW1vdmUsXG4gICAgcmVtb3ZlQWxsICAgICAgICAgIDogcmVtb3ZlQWxsLFxuICAgIGdldE1hcCAgICAgICAgICAgICA6IGdldE1hcCxcbiAgICBoYXNNYXAgICAgICAgICAgICAgOiBoYXNNYXAsXG4gICAgc2l6ZSAgICAgICAgICAgICAgIDogc2l6ZSxcbiAgICBmaXJzdCAgICAgICAgICAgICAgOiBmaXJzdCxcbiAgICBsYXN0ICAgICAgICAgICAgICAgOiBsYXN0LFxuICAgIGF0SW5kZXggICAgICAgICAgICA6IGF0SW5kZXgsXG4gICAgZmlsdGVyICAgICAgICAgICAgIDogZmlsdGVyLFxuICAgIGZpbHRlckJ5S2V5ICAgICAgICA6IGZpbHRlckJ5S2V5LFxuICAgIGZvckVhY2ggICAgICAgICAgICA6IGZvckVhY2gsXG4gICAgbWFwICAgICAgICAgICAgICAgIDogbWFwLFxuICAgIGVudHJpZXMgICAgICAgICAgICA6IGVudHJpZXMsXG4gICAgdG9KU09OICAgICAgICAgICAgIDogdG9KU09OLFxuICAgIGRpc3BhdGNoQ2hhbmdlICAgICA6IGRpc3BhdGNoQ2hhbmdlLFxuICAgIHNldFBhcmVudENvbGxlY3Rpb246IHNldFBhcmVudENvbGxlY3Rpb24sXG4gICAgZ2V0UGFyZW50Q29sbGVjdGlvbjogZ2V0UGFyZW50Q29sbGVjdGlvblxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNYXBDb2xsZWN0aW9uOyIsInZhciBNaXhpbk1hcEZhY3RvcnkgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tYXBDb2xsZWN0aW9uTGlzdCAgICA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfbWFwTGlzdCAgICAgICAgICAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX21hcENvbGxlY3Rpb25GYWN0b3J5ID0gcmVxdWlyZSgnLi9NYXBDb2xsZWN0aW9uLmpzJyksXG4gICAgICBfbWFwRmFjdG9yeSAgICAgICAgICAgPSByZXF1aXJlKCcuL01hcC5qcycpLFxuICAgICAgX29ic2VydmFibGVGYWN0b3J5ICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcycpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgc3RvcmUgY29sbGVjdGlvbiBhbmQgaW5pdGFsaXplXG4gICAqIEBwYXJhbSBpbml0T2JqXG4gICAqIEBwYXJhbSBleHRyYXNcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVNYXBDb2xsZWN0aW9uKGluaXRPYmosIGV4dHJhcykge1xuICAgIHZhciBtID0gTm9yaS5hc3NpZ25BcnJheSh7fSwgW19tYXBDb2xsZWN0aW9uRmFjdG9yeSgpLCBfb2JzZXJ2YWJsZUZhY3RvcnkoKSwgZXh0cmFzXSk7XG4gICAgbS5pbml0aWFsaXplKGluaXRPYmopO1xuICAgIHJldHVybiBtO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBzdG9yZSBhbmQgaW5pdGlhbGl6ZVxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcGFyYW0gZXh0cmFzXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlTWFwKGluaXRPYmosIGV4dHJhcykge1xuICAgIHZhciBtID0gTm9yaS5hc3NpZ25BcnJheSh7fSwgW19tYXBGYWN0b3J5KCksIF9vYnNlcnZhYmxlRmFjdG9yeSgpLCBleHRyYXNdKTtcbiAgICBtLmluaXRpYWxpemUoaW5pdE9iaik7XG4gICAgcmV0dXJuIG07XG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgc3RvcmUgZnJvbSB0aGUgYXBwbGljYXRpb24gY29sbGVjdGlvblxuICAgKiBAcGFyYW0gc3RvcmVJRFxuICAgKiBAcmV0dXJucyB7dm9pZHwqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TWFwKHN0b3JlSUQpIHtcbiAgICByZXR1cm4gX21hcExpc3Rbc3RvcmVJRF07XG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgc3RvcmUgY29sbGVjdGlvbiBmcm9tIHRoZSBhcHBsaWNhdGlvbiBjb2xsZWN0aW9uXG4gICAqIEBwYXJhbSBzdG9yZUlEXG4gICAqIEByZXR1cm5zIHt2b2lkfCp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRNYXBDb2xsZWN0aW9uKHN0b3JlSUQpIHtcbiAgICByZXR1cm4gX21hcENvbGxlY3Rpb25MaXN0W3N0b3JlSURdO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBjcmVhdGVNYXBDb2xsZWN0aW9uOiBjcmVhdGVNYXBDb2xsZWN0aW9uLFxuICAgIGNyZWF0ZU1hcCAgICAgICAgICA6IGNyZWF0ZU1hcCxcbiAgICBnZXRNYXAgICAgICAgICAgICAgOiBnZXRNYXAsXG4gICAgZ2V0TWFwQ29sbGVjdGlvbiAgIDogZ2V0TWFwQ29sbGVjdGlvblxuICB9O1xuXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5NYXBGYWN0b3J5KCk7IiwiLyoqXG4gKiBNaXhpbiBmb3IgTm9yaSBzdG9yZXMgdG8gYWRkIGZ1bmN0aW9uYWxpdHkgc2ltaWxhciB0byBSZWR1eCcgUmVkdWNlciBhbmQgc2luZ2xlXG4gKiBvYmplY3Qgc3RhdGUgdHJlZSBjb25jZXB0LiBNaXhpbiBzaG91bGQgYmUgY29tcG9zZWQgdG8gbm9yaS9zdG9yZS9BcHBsaWNhdGlvblN0b3JlXG4gKiBkdXJpbmcgY3JlYXRpb24gb2YgbWFpbiBBcHBTdG9yZVxuICpcbiAqIGh0dHBzOi8vZ2FlYXJvbi5naXRodWIuaW8vcmVkdXgvZG9jcy9hcGkvU3RvcmUuaHRtbFxuICogaHR0cHM6Ly9nYWVhcm9uLmdpdGh1Yi5pby9yZWR1eC9kb2NzL2Jhc2ljcy9SZWR1Y2Vycy5odG1sXG4gKlxuICogQ3JlYXRlZCA4LzEzLzE1XG4gKi9cbnZhciBNaXhpblJlZHVjZXJTdG9yZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF90aGlzLFxuICAgICAgX3N0YXRlLFxuICAgICAgX3N0YXRlUmVkdWNlcnMgPSBbXTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFjY2Vzc29yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogX3N0YXRlIG1pZ2h0IG5vdCBleGlzdCBpZiBzdWJzY3JpYmVycyBhcmUgYWRkZWQgYmVmb3JlIHRoaXMgc3RvcmUgaXMgaW5pdGlhbGl6ZWRcbiAgICovXG4gIGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICAgIGlmIChfc3RhdGUpIHtcbiAgICAgIHJldHVybiBfc3RhdGUuZ2V0U3RhdGUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0U3RhdGUoc3RhdGUpIHtcbiAgICBpZiAoIV8uaXNFcXVhbChzdGF0ZSwgX3N0YXRlKSkge1xuICAgICAgX3N0YXRlLnNldFN0YXRlKHN0YXRlKTtcbiAgICAgIF90aGlzLm5vdGlmeVN1YnNjcmliZXJzKHt9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZXRSZWR1Y2VycyhyZWR1Y2VyQXJyYXkpIHtcbiAgICBfc3RhdGVSZWR1Y2VycyA9IHJlZHVjZXJBcnJheTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFJlZHVjZXIocmVkdWNlcikge1xuICAgIF9zdGF0ZVJlZHVjZXJzLnB1c2gocmVkdWNlcik7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEluaXRcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIFNldCB1cCBldmVudCBsaXN0ZW5lci9yZWNlaXZlclxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSgpIHtcbiAgICBpZiAoIXRoaXMuY3JlYXRlU3ViamVjdCkge1xuICAgICAgY29uc29sZS53YXJuKCdub3JpL3N0b3JlL01peGluUmVkdWNlclN0b3JlIG5lZWRzIG5vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdCB0byBub3RpZnknKTtcbiAgICB9XG5cbiAgICB2YXIgc2ltcGxlU3RvcmVGYWN0b3J5ID0gcmVxdWlyZSgnLi9TaW1wbGVTdG9yZS5qcycpO1xuXG4gICAgX3RoaXMgID0gdGhpcztcbiAgICBfc3RhdGUgPSBzaW1wbGVTdG9yZUZhY3RvcnkoKTtcblxuICAgIGlmICghX3N0YXRlUmVkdWNlcnMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUmVkdWNlclN0b3JlLCBtdXN0IHNldCBhIHJlZHVjZXIgYmVmb3JlIGluaXRpYWxpemF0aW9uJyk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGluaXRpYWwgc3RhdGUgZnJvbSBlbXB0eSBldmVudFxuICAgIGFwcGx5UmVkdWNlcnMoe30pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGx5IHRoZSBhY3Rpb24gb2JqZWN0IHRvIHRoZSByZWR1Y2VycyB0byBjaGFuZ2Ugc3RhdGVcbiAgICogYXJlIHNlbnQgdG8gYWxsIHJlZHVjZXJzIHRvIHVwZGF0ZSB0aGUgc3RhdGVcbiAgICogQHBhcmFtIGFjdGlvbk9iamVjdFxuICAgKi9cbiAgZnVuY3Rpb24gYXBwbHkoYWN0aW9uT2JqZWN0KSB7XG4gICAgY29uc29sZS5sb2coJ1JlZHVjZXJTdG9yZSBBcHBseTogJywgYWN0aW9uT2JqZWN0LnR5cGUsIGFjdGlvbk9iamVjdC5wYXlsb2FkKTtcbiAgICBhcHBseVJlZHVjZXJzKGFjdGlvbk9iamVjdCk7XG4gIH1cblxuICBmdW5jdGlvbiBhcHBseVJlZHVjZXJzKGFjdGlvbk9iamVjdCkge1xuICAgIHZhciBuZXh0U3RhdGUgPSBhcHBseVJlZHVjZXJzVG9TdGF0ZShnZXRTdGF0ZSgpLCBhY3Rpb25PYmplY3QpO1xuICAgIHNldFN0YXRlKG5leHRTdGF0ZSk7XG4gICAgX3RoaXMuaGFuZGxlU3RhdGVNdXRhdGlvbigpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFQSSBob29rIHRvIGhhbmRsZSBzdGF0ZSB1cGRhdGVzXG4gICAqL1xuICBmdW5jdGlvbiBoYW5kbGVTdGF0ZU11dGF0aW9uKCkge1xuICAgIC8vIG92ZXJyaWRlIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IHN0YXRlIGZyb20gdGhlIGNvbWJpbmVkIHJlZHVjZXMgYW5kIGFjdGlvbiBvYmplY3RcbiAgICogU3RvcmUgc3RhdGUgaXNuJ3QgbW9kaWZpZWQsIGN1cnJlbnQgc3RhdGUgaXMgcGFzc2VkIGluIGFuZCBtdXRhdGVkIHN0YXRlIHJldHVybmVkXG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKiBAcGFyYW0gYWN0aW9uXG4gICAqIEByZXR1cm5zIHsqfHt9fVxuICAgKi9cbiAgZnVuY3Rpb24gYXBwbHlSZWR1Y2Vyc1RvU3RhdGUoc3RhdGUsIGFjdGlvbikge1xuICAgIHN0YXRlID0gc3RhdGUgfHwge307XG4gICAgLy8gVE9ETyBzaG91bGQgdGhpcyBhY3R1YWxseSB1c2UgYXJyYXkucmVkdWNlKCk/XG4gICAgX3N0YXRlUmVkdWNlcnMuZm9yRWFjaChmdW5jdGlvbiBhcHBseVN0YXRlUmVkdWNlckZ1bmN0aW9uKHJlZHVjZXJGdW5jKSB7XG4gICAgICBzdGF0ZSA9IHJlZHVjZXJGdW5jKHN0YXRlLCBhY3Rpb24pO1xuICAgIH0pO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZW1wbGF0ZSByZWR1Y2VyIGZ1bmN0aW9uXG4gICAqIFN0b3JlIHN0YXRlIGlzbid0IG1vZGlmaWVkLCBjdXJyZW50IHN0YXRlIGlzIHBhc3NlZCBpbiBhbmQgbXV0YXRlZCBzdGF0ZSByZXR1cm5lZFxuXG4gICBmdW5jdGlvbiB0ZW1wbGF0ZVJlZHVjZXJGdW5jdGlvbihzdGF0ZSwgZXZlbnQpIHtcbiAgICAgICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG4gICAgICAgICAgY2FzZSBfbm9yaUFjdGlvbkNvbnN0YW50cy5NT0RFTF9EQVRBX0NIQU5HRUQ6XG4gICAgICAgICAgICAvLyBjYW4gY29tcG9zZSBvdGhlciByZWR1Y2Vyc1xuICAgICAgICAgICAgLy8gcmV0dXJuIF8uYXNzaWduKHt9LCBzdGF0ZSwgb3RoZXJTdGF0ZVRyYW5zZm9ybWVyKHN0YXRlKSk7XG4gICAgICAgICAgICByZXR1cm4gXy5hc3NpZ24oe30sIHN0YXRlLCB7cHJvcDogZXZlbnQucGF5bG9hZC52YWx1ZX0pO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICovXG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplUmVkdWNlclN0b3JlOiBpbml0aWFsaXplUmVkdWNlclN0b3JlLFxuICAgIGdldFN0YXRlICAgICAgICAgICAgICA6IGdldFN0YXRlLFxuICAgIHNldFN0YXRlICAgICAgICAgICAgICA6IHNldFN0YXRlLFxuICAgIGFwcGx5ICAgICAgICAgICAgICAgICA6IGFwcGx5LFxuICAgIHNldFJlZHVjZXJzICAgICAgICAgICA6IHNldFJlZHVjZXJzLFxuICAgIGFkZFJlZHVjZXIgICAgICAgICAgICA6IGFkZFJlZHVjZXIsXG4gICAgYXBwbHlSZWR1Y2VycyAgICAgICAgIDogYXBwbHlSZWR1Y2VycyxcbiAgICBhcHBseVJlZHVjZXJzVG9TdGF0ZSAgOiBhcHBseVJlZHVjZXJzVG9TdGF0ZSxcbiAgICBoYW5kbGVTdGF0ZU11dGF0aW9uICAgOiBoYW5kbGVTdGF0ZU11dGF0aW9uXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5SZWR1Y2VyU3RvcmUoKTsiLCJ2YXIgU2ltcGxlU3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfaW50ZXJuYWxTdGF0ZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIGNvcHkgb2YgdGhlIHN0YXRlXG4gICAqIEByZXR1cm5zIHt2b2lkfCp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sIF9pbnRlcm5hbFN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZVxuICAgKiBAcGFyYW0gbmV4dFN0YXRlXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTdGF0ZShuZXh0U3RhdGUpIHtcbiAgICBfaW50ZXJuYWxTdGF0ZSA9IF8uYXNzaWduKF9pbnRlcm5hbFN0YXRlLCBuZXh0U3RhdGUpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBnZXRTdGF0ZTogZ2V0U3RhdGUsXG4gICAgc2V0U3RhdGU6IHNldFN0YXRlXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2ltcGxlU3RvcmU7IiwiLypcbiBNYXR0IFBlcmtpbnMsIDYvMTIvMTVcblxuIHB1Ymxpc2ggcGF5bG9hZCBvYmplY3RcblxuIHtcbiB0eXBlOiBFVlRfVFlQRSxcbiBwYXlsb2FkOiB7XG4ga2V5OiB2YWx1ZVxuIH1cbiB9XG5cbiAqL1xudmFyIERpc3BhdGNoZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0TWFwICA9IHt9LFxuICAgICAgX3JlY2VpdmVyTWFwID0ge30sXG4gICAgICBfaWQgICAgICAgICAgPSAwLFxuICAgICAgX2xvZyAgICAgICAgID0gW10sXG4gICAgICBfcXVldWUgICAgICAgPSBbXSxcbiAgICAgIF90aW1lck9ic2VydmFibGUsXG4gICAgICBfdGltZXJTdWJzY3JpcHRpb24sXG4gICAgICBfdGltZXJQYXVzYWJsZTtcblxuICAvKipcbiAgICogQWRkIGFuIGV2ZW50IGFzIG9ic2VydmFibGVcbiAgICogQHBhcmFtIGV2dFN0ciBFdmVudCBuYW1lIHN0cmluZ1xuICAgKiBAcGFyYW0gaGFuZGxlciBvbk5leHQoKSBzdWJzY3JpcHRpb24gZnVuY3Rpb25cbiAgICogQHBhcmFtIG9uY2VPckNvbnRleHQgb3B0aW9uYWwsIGVpdGhlciB0aGUgY29udGV4dCB0byBleGVjdXRlIHRoZSBoYW5kZXIgb3Igb25jZSBib29sXG4gICAqIEBwYXJhbSBvbmNlIHdpbGwgY29tcGxldGUvZGlzcG9zZSBhZnRlciBvbmUgZmlyZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShldnRTdHIsIGhhbmRsZXIsIG9uY2VPckNvbnRleHQsIG9uY2UpIHtcbiAgICB2YXIgaGFuZGxlckNvbnRleHQgPSB3aW5kb3c7XG5cbiAgICAvL2NvbnNvbGUubG9nKCdkaXNwYXRjaGVyIHN1YnNjcmliZScsIGV2dFN0ciwgaGFuZGxlciwgb25jZU9yQ29udGV4dCwgb25jZSk7XG5cbiAgICBpZiAoaXMuZmFsc2V5KGV2dFN0cikpIHtcbiAgICAgIGNvbnNvbGUud2FybignRGlzcGF0Y2hlcjogRmFzbGV5IGV2ZW50IHN0cmluZyBwYXNzZWQgZm9yIGhhbmRsZXInLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICBpZiAoaXMuZmFsc2V5KGhhbmRsZXIpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Rpc3BhdGNoZXI6IEZhc2xleSBoYW5kbGVyIHBhc3NlZCBmb3IgZXZlbnQgc3RyaW5nJywgZXZ0U3RyKTtcbiAgICB9XG5cbiAgICBpZiAob25jZU9yQ29udGV4dCB8fCBvbmNlT3JDb250ZXh0ID09PSBmYWxzZSkge1xuICAgICAgaWYgKG9uY2VPckNvbnRleHQgPT09IHRydWUgfHwgb25jZU9yQ29udGV4dCA9PT0gZmFsc2UpIHtcbiAgICAgICAgb25jZSA9IG9uY2VPckNvbnRleHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoYW5kbGVyQ29udGV4dCA9IG9uY2VPckNvbnRleHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFfc3ViamVjdE1hcFtldnRTdHJdKSB7XG4gICAgICBfc3ViamVjdE1hcFtldnRTdHJdID0gW107XG4gICAgfVxuXG4gICAgdmFyIHN1YmplY3QgPSBuZXcgUnguU3ViamVjdCgpO1xuXG4gICAgX3N1YmplY3RNYXBbZXZ0U3RyXS5wdXNoKHtcbiAgICAgIG9uY2UgICAgOiBvbmNlLFxuICAgICAgcHJpb3JpdHk6IDAsXG4gICAgICBoYW5kbGVyIDogaGFuZGxlcixcbiAgICAgIGNvbnRleHQgOiBoYW5kbGVyQ29udGV4dCxcbiAgICAgIHN1YmplY3QgOiBzdWJqZWN0LFxuICAgICAgdHlwZSAgICA6IDBcbiAgICB9KTtcblxuICAgIHJldHVybiBzdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyLmJpbmQoaGFuZGxlckNvbnRleHQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSBldmVudCBwcm9jZXNzaW5nIHRpbWVyIG9yIHJlc3VtZSBhIHBhdXNlZCB0aW1lclxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdFRpbWVyKCkge1xuICAgIGlmIChfdGltZXJPYnNlcnZhYmxlKSB7XG4gICAgICBfdGltZXJQYXVzYWJsZS5vbk5leHQodHJ1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX3RpbWVyUGF1c2FibGUgICAgID0gbmV3IFJ4LlN1YmplY3QoKTtcbiAgICBfdGltZXJPYnNlcnZhYmxlICAgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEpLnBhdXNhYmxlKF90aW1lclBhdXNhYmxlKTtcbiAgICBfdGltZXJTdWJzY3JpcHRpb24gPSBfdGltZXJPYnNlcnZhYmxlLnN1YnNjcmliZShwcm9jZXNzTmV4dEV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaGlmdCBuZXh0IGV2ZW50IHRvIGhhbmRsZSBvZmYgb2YgdGhlIHF1ZXVlIGFuZCBkaXNwYXRjaCBpdFxuICAgKi9cbiAgZnVuY3Rpb24gcHJvY2Vzc05leHRFdmVudCgpIHtcbiAgICB2YXIgZXZ0ID0gX3F1ZXVlLnNoaWZ0KCk7XG4gICAgaWYgKGV2dCkge1xuICAgICAgZGlzcGF0Y2hUb1JlY2VpdmVycyhldnQpO1xuICAgICAgZGlzcGF0Y2hUb1N1YnNjcmliZXJzKGV2dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF90aW1lclBhdXNhYmxlLm9uTmV4dChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1c2ggZXZlbnQgdG8gdGhlIHN0YWNrIGFuZCBiZWdpbiBleGVjdXRpb25cbiAgICogQHBhcmFtIHBheWxvYWRPYmogdHlwZTpTdHJpbmcsIHBheWxvYWQ6ZGF0YVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKi9cbiAgZnVuY3Rpb24gcHVibGlzaChwYXlsb2FkT2JqKSB7XG4gICAgX2xvZy5wdXNoKHBheWxvYWRPYmopO1xuICAgIF9xdWV1ZS5wdXNoKHBheWxvYWRPYmopO1xuXG4gICAgaW5pdFRpbWVyKCk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCB0aGUgcGF5bG9hZCB0byBhbGwgcmVjZWl2ZXJzXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaFRvUmVjZWl2ZXJzKHBheWxvYWQpIHtcbiAgICBmb3IgKHZhciBpZCBpbiBfcmVjZWl2ZXJNYXApIHtcbiAgICAgIF9yZWNlaXZlck1hcFtpZF0uaGFuZGxlcihwYXlsb2FkKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlcnMgcmVjZWl2ZSBhbGwgcGF5bG9hZHMgZm9yIGEgZ2l2ZW4gZXZlbnQgdHlwZSB3aGlsZSBoYW5kbGVycyBhcmUgdGFyZ2V0ZWRcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIGRpc3BhdGNoVG9TdWJzY3JpYmVycyhwYXlsb2FkKSB7XG4gICAgdmFyIHN1YnNjcmliZXJzID0gX3N1YmplY3RNYXBbcGF5bG9hZC50eXBlXSwgaTtcbiAgICBpZiAoIXN1YnNjcmliZXJzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaSA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHZhciBzdWJqT2JqID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICBpZiAoc3Viak9iai50eXBlID09PSAwKSB7XG4gICAgICAgIHN1YmpPYmouc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gICAgICB9XG4gICAgICBpZiAoc3Viak9iai5vbmNlKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlKHBheWxvYWQudHlwZSwgc3Viak9iai5oYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgaGFuZGxlclxuICAgKiBAcGFyYW0gZXZ0U3RyXG4gICAqIEBwYXJhbSBoYW5kZXJcbiAgICovXG4gIGZ1bmN0aW9uIHVuc3Vic2NyaWJlKGV2dFN0ciwgaGFuZGxlcikge1xuICAgIGlmIChfc3ViamVjdE1hcFtldnRTdHJdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBfc3ViamVjdE1hcFtldnRTdHJdLFxuICAgICAgICBoYW5kbGVySWR4ICA9IC0xO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHN1YnNjcmliZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoc3Vic2NyaWJlcnNbaV0uaGFuZGxlciA9PT0gaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVySWR4ICAgICA9IGk7XG4gICAgICAgIHN1YnNjcmliZXJzW2ldLnN1YmplY3Qub25Db21wbGV0ZWQoKTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0uc3ViamVjdC5kaXNwb3NlKCk7XG4gICAgICAgIHN1YnNjcmliZXJzW2ldID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFuZGxlcklkeCA9PT0gLTEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzdWJzY3JpYmVycy5zcGxpY2UoaGFuZGxlcklkeCwgMSk7XG5cbiAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBkZWxldGUgX3N1YmplY3RNYXBbZXZ0U3RyXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgY29weSBvZiB0aGUgbG9nIGFycmF5XG4gICAqIEByZXR1cm5zIHtBcnJheS48VD59XG4gICAqL1xuICBmdW5jdGlvbiBnZXRMb2coKSB7XG4gICAgcmV0dXJuIF9sb2cuc2xpY2UoMCk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBTaW1wbGUgcmVjZWl2ZXIgaW1wbGVtZW50YXRpb24gYmFzZWQgb24gRmx1eFxuICAgKiBSZWdpc3RlcmVkIHJlY2VpdmVycyB3aWxsIGdldCBldmVyeSBwdWJsaXNoZWQgZXZlbnRcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL2ZsdXgvYmxvYi9tYXN0ZXIvc3JjL0Rpc3BhdGNoZXIuanNcbiAgICpcbiAgICogVXNhZ2U6XG4gICAqXG4gICAqIF9kaXNwYXRjaGVyLnJlZ2lzdGVyUmVjZWl2ZXIoZnVuY3Rpb24gKHBheWxvYWQpIHtcbiAgICAgICAqICAgIGNvbnNvbGUubG9nKCdyZWNlaXZpbmcsICcscGF5bG9hZCk7XG4gICAgICAgKiB9KTtcbiAgICpcbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyUmVjZWl2ZXIoaGFuZGxlcikge1xuICAgIHZhciBpZCAgICAgICAgICAgPSAnSURfJyArIF9pZCsrO1xuICAgIF9yZWNlaXZlck1hcFtpZF0gPSB7XG4gICAgICBpZCAgICAgOiBpZCxcbiAgICAgIGhhbmRsZXI6IGhhbmRsZXJcbiAgICB9O1xuICAgIHJldHVybiBpZDtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIHJlY2VpdmVyIGhhbmRsZXJcbiAgICogQHBhcmFtIGlkXG4gICAqL1xuICBmdW5jdGlvbiB1bnJlZ2lzdGVyUmVjZWl2ZXIoaWQpIHtcbiAgICBpZiAoX3JlY2VpdmVyTWFwLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgZGVsZXRlIF9yZWNlaXZlck1hcFtpZF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmUgICAgICAgICA6IHN1YnNjcmliZSxcbiAgICB1bnN1YnNjcmliZSAgICAgICA6IHVuc3Vic2NyaWJlLFxuICAgIHB1Ymxpc2ggICAgICAgICAgIDogcHVibGlzaCxcbiAgICBnZXRMb2cgICAgICAgICAgICA6IGdldExvZyxcbiAgICByZWdpc3RlclJlY2VpdmVyICA6IHJlZ2lzdGVyUmVjZWl2ZXIsXG4gICAgdW5yZWdpc3RlclJlY2VpdmVyOiB1bnJlZ2lzdGVyUmVjZWl2ZXJcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEaXNwYXRjaGVyKCk7IiwiLyoqXG4gKiBBZGQgUnhKUyBTdWJqZWN0IHRvIGEgbW9kdWxlLlxuICpcbiAqIEFkZCBvbmUgc2ltcGxlIG9ic2VydmFibGUgc3ViamVjdCBvciBtb3JlIGNvbXBsZXggYWJpbGl0eSB0byBjcmVhdGUgb3RoZXJzIGZvclxuICogbW9yZSBjb21wbGV4IGV2ZW50aW5nIG5lZWRzLlxuICovXG52YXIgTWl4aW5PYnNlcnZhYmxlU3ViamVjdCA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3QgICAgPSBuZXcgUnguU3ViamVjdCgpLFxuICAgICAgX3N1YmplY3RNYXAgPSB7fTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHN1YmplY3RcbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdWJqZWN0KG5hbWUpIHtcbiAgICBpZiAoIV9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXSA9IG5ldyBSeC5TdWJqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBfc3ViamVjdE1hcFtuYW1lXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgaGFuZGxlciB0byB1cGRhdGVzLiBJZiB0aGUgaGFuZGxlciBpcyBhIHN0cmluZywgdGhlIG5ldyBzdWJqZWN0XG4gICAqIHdpbGwgYmUgY3JlYXRlZC5cbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlck9yTmFtZSwgb3B0SGFuZGxlcikge1xuICAgIGlmIChpcy5zdHJpbmcoaGFuZGxlck9yTmFtZSkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVTdWJqZWN0KGhhbmRsZXJPck5hbWUpLnN1YnNjcmliZShvcHRIYW5kbGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyT3JOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIF9zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwYXRjaCB1cGRhdGVkIHRvIG5hbWVkIHN1YnNjcmliZXJzXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVyc09mKG5hbWUsIHBheWxvYWQpIHtcbiAgICBpZiAoX3N1YmplY3RNYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIF9zdWJqZWN0TWFwW25hbWVdLm9uTmV4dChwYXlsb2FkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKCdNaXhpbk9ic2VydmFibGVTdWJqZWN0LCBubyBzdWJzY3JpYmVycyBvZiAnICsgbmFtZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmUgICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgY3JlYXRlU3ViamVjdCAgICAgIDogY3JlYXRlU3ViamVjdCxcbiAgICBub3RpZnlTdWJzY3JpYmVycyAgOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBub3RpZnlTdWJzY3JpYmVyc09mOiBub3RpZnlTdWJzY3JpYmVyc09mXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5PYnNlcnZhYmxlU3ViamVjdDsiLCIvKipcbiAqIFV0aWxpdHkgdG8gaGFuZGxlIGFsbCB2aWV3IERPTSBhdHRhY2htZW50IHRhc2tzXG4gKi9cblxudmFyIFJlbmRlcmVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX2RvbVV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiByZW5kZXIocGF5bG9hZCkge1xuICAgIHZhciB0YXJnZXRTZWxlY3RvciA9IHBheWxvYWQudGFyZ2V0LFxuICAgICAgICBodG1sICAgICAgICAgICA9IHBheWxvYWQuaHRtbCxcbiAgICAgICAgZG9tRWwsXG4gICAgICAgIG1vdW50UG9pbnQgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXRTZWxlY3RvciksXG4gICAgICAgIGNiICAgICAgICAgICAgID0gcGF5bG9hZC5jYWxsYmFjaztcblxuICAgIG1vdW50UG9pbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBpZiAoaHRtbCkge1xuICAgICAgZG9tRWwgPSBfZG9tVXRpbHMuSFRNTFN0clRvTm9kZShodG1sKTtcbiAgICAgIG1vdW50UG9pbnQuYXBwZW5kQ2hpbGQoZG9tRWwpO1xuICAgIH1cblxuICAgIGlmIChjYikge1xuICAgICAgY2IoZG9tRWwpO1xuICAgIH1cblxuICAgIHJldHVybiBkb21FbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcmVuZGVyOiByZW5kZXJcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZW5kZXJlcigpOyIsIi8qKlxuICogU2ltcGxlIHJvdXRlclxuICogU3VwcG9ydGluZyBJRTkgc28gdXNpbmcgaGFzaGVzIGluc3RlYWQgb2YgdGhlIGhpc3RvcnkgQVBJIGZvciBub3dcbiAqL1xuXG52YXIgUm91dGVyID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfc3ViamVjdCAgPSBuZXcgUnguU3ViamVjdCgpLFxuICAgICAgX2hhc2hDaGFuZ2VPYnNlcnZhYmxlLFxuICAgICAgX29ialV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvcmUvT2JqZWN0VXRpbHMuanMnKTtcblxuICAvKipcbiAgICogU2V0IGV2ZW50IGhhbmRsZXJzXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIF9oYXNoQ2hhbmdlT2JzZXJ2YWJsZSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHdpbmRvdywgJ2hhc2hjaGFuZ2UnKS5zdWJzY3JpYmUobm90aWZ5U3Vic2NyaWJlcnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIHN1YnNjcmliZSBhIGhhbmRsZXIgdG8gdGhlIHVybCBjaGFuZ2UgZXZlbnRzXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3N1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5vdGlmeSBvZiBhIGNoYW5nZSBpbiByb3V0ZVxuICAgKiBAcGFyYW0gZnJvbUFwcCBUcnVlIGlmIHRoZSByb3V0ZSB3YXMgY2F1c2VkIGJ5IGFuIGFwcCBldmVudCBub3QgVVJMIG9yIGhpc3RvcnkgY2hhbmdlXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVycygpIHtcbiAgICB2YXIgZXZlbnRQYXlsb2FkID0ge1xuICAgICAgcm91dGVPYmo6IGdldEN1cnJlbnRSb3V0ZSgpLCAvLyB7IHJvdXRlOiwgZGF0YTogfVxuICAgICAgZnJhZ21lbnQ6IGdldFVSTEZyYWdtZW50KClcbiAgICB9O1xuXG4gICAgX3N1YmplY3Qub25OZXh0KGV2ZW50UGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIHRoZSByb3V0ZSBhbmQgcXVlcnkgc3RyaW5nIGZyb20gdGhlIGN1cnJlbnQgVVJMIGZyYWdtZW50XG4gICAqIEByZXR1cm5zIHt7cm91dGU6IHN0cmluZywgcXVlcnk6IHt9fX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRSb3V0ZSgpIHtcbiAgICB2YXIgZnJhZ21lbnQgICAgPSBnZXRVUkxGcmFnbWVudCgpLFxuICAgICAgICBwYXJ0cyAgICAgICA9IGZyYWdtZW50LnNwbGl0KCc/JyksXG4gICAgICAgIHJvdXRlICAgICAgID0gJy8nICsgcGFydHNbMF0sXG4gICAgICAgIHF1ZXJ5U3RyICAgID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhcnRzWzFdKSxcbiAgICAgICAgcXVlcnlTdHJPYmogPSBwYXJzZVF1ZXJ5U3RyKHF1ZXJ5U3RyKTtcblxuICAgIGlmIChxdWVyeVN0ciA9PT0gJz11bmRlZmluZWQnKSB7XG4gICAgICBxdWVyeVN0ck9iaiA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB7cm91dGU6IHJvdXRlLCBkYXRhOiBxdWVyeVN0ck9ian07XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIGEgcXVlcnkgc3RyaW5nIGludG8ga2V5L3ZhbHVlIHBhaXJzXG4gICAqIEBwYXJhbSBxdWVyeVN0clxuICAgKiBAcmV0dXJucyB7e319XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZVF1ZXJ5U3RyKHF1ZXJ5U3RyKSB7XG4gICAgdmFyIG9iaiAgID0ge30sXG4gICAgICAgIHBhcnRzID0gcXVlcnlTdHIuc3BsaXQoJyYnKTtcblxuICAgIHBhcnRzLmZvckVhY2goZnVuY3Rpb24gKHBhaXJTdHIpIHtcbiAgICAgIHZhciBwYWlyQXJyICAgICA9IHBhaXJTdHIuc3BsaXQoJz0nKTtcbiAgICAgIG9ialtwYWlyQXJyWzBdXSA9IHBhaXJBcnJbMV07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbWJpbmVzIGEgcm91dGUgYW5kIGRhdGEgb2JqZWN0IGludG8gYSBwcm9wZXIgVVJMIGhhc2ggZnJhZ21lbnRcbiAgICogQHBhcmFtIHJvdXRlXG4gICAqIEBwYXJhbSBkYXRhT2JqXG4gICAqL1xuICBmdW5jdGlvbiBzZXQocm91dGUsIGRhdGFPYmopIHtcbiAgICB2YXIgcGF0aCA9IHJvdXRlLFxuICAgICAgICBkYXRhID0gW107XG4gICAgaWYgKCFfb2JqVXRpbHMuaXNOdWxsKGRhdGFPYmopKSB7XG4gICAgICBwYXRoICs9IFwiP1wiO1xuICAgICAgZm9yICh2YXIgcHJvcCBpbiBkYXRhT2JqKSB7XG4gICAgICAgIGlmIChwcm9wICE9PSAndW5kZWZpbmVkJyAmJiBkYXRhT2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgZGF0YS5wdXNoKHByb3AgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoZGF0YU9ialtwcm9wXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBwYXRoICs9IGRhdGEuam9pbignJicpO1xuICAgIH1cblxuICAgIHVwZGF0ZVVSTEZyYWdtZW50KHBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgZXZlcnl0aGluZyBhZnRlciB0aGUgJ3doYXRldmVyLmh0bWwjJyBpbiB0aGUgVVJMXG4gICAqIExlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgYXJlIHJlbW92ZWRcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGdldFVSTEZyYWdtZW50KCkge1xuICAgIHZhciBmcmFnbWVudCA9IGxvY2F0aW9uLmhhc2guc2xpY2UoMSk7XG4gICAgcmV0dXJuIGZyYWdtZW50LnRvU3RyaW5nKCkucmVwbGFjZSgvXFwvJC8sICcnKS5yZXBsYWNlKC9eXFwvLywgJycpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgVVJMIGhhc2ggZnJhZ21lbnRcbiAgICogQHBhcmFtIHBhdGhcbiAgICovXG4gIGZ1bmN0aW9uIHVwZGF0ZVVSTEZyYWdtZW50KHBhdGgpIHtcbiAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IHBhdGg7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemUgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHN1YnNjcmliZSAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnM6IG5vdGlmeVN1YnNjcmliZXJzLFxuICAgIGdldEN1cnJlbnRSb3V0ZSAgOiBnZXRDdXJyZW50Um91dGUsXG4gICAgc2V0ICAgICAgICAgICAgICA6IHNldFxuICB9O1xuXG59O1xuXG52YXIgciA9IFJvdXRlcigpO1xuci5pbml0aWFsaXplKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gcjsiLCIvKipcbiAqIFJ4SlMgSGVscGVyc1xuICogQHR5cGUge3tkb206IEZ1bmN0aW9uLCBmcm9tOiBGdW5jdGlvbiwgaW50ZXJ2YWw6IEZ1bmN0aW9uLCBkb0V2ZXJ5OiBGdW5jdGlvbiwganVzdDogRnVuY3Rpb24sIGVtcHR5OiBGdW5jdGlvbn19XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRvbTogZnVuY3Rpb24gKHNlbGVjdG9yLCBldmVudCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGlmICghZWwpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS91dGlscy9SeCwgZG9tLCBpbnZhbGlkIERPTSBzZWxlY3RvcjogJyArIHNlbGVjdG9yKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGVsLCBldmVudC50cmltKCkpO1xuICB9LFxuXG4gIGZyb206IGZ1bmN0aW9uIChpdHRyKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZnJvbShpdHRyKTtcbiAgfSxcblxuICBpbnRlcnZhbDogZnVuY3Rpb24gKG1zKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwobXMpO1xuICB9LFxuXG4gIGRvRXZlcnk6IGZ1bmN0aW9uIChtcywgaGFuZGxlcikge1xuICAgIHJldHVybiB0aGlzLmludGVydmFsKG1zKS5zdWJzY3JpYmUoaGFuZGxlcik7XG4gIH0sXG5cbiAganVzdDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuanVzdCh2YWx1ZSk7XG4gIH0sXG5cbiAgZW1wdHk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5lbXB0eSgpO1xuICB9XG5cbn07IiwiLypcbiBTaW1wbGUgd3JhcHBlciBmb3IgVW5kZXJzY29yZSAvIEhUTUwgdGVtcGxhdGVzXG4gTWF0dCBQZXJraW5zXG4gNC83LzE1XG4gKi9cbnZhciBUZW1wbGF0aW5nID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGVtcGxhdGVNYXAgICAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX3RlbXBsYXRlSFRNTENhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF90ZW1wbGF0ZUNhY2hlICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfRE9NVXRpbHMgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIGFkZFRlbXBsYXRlKGlkLCBodG1sKSB7XG4gICAgX3RlbXBsYXRlTWFwW2lkXSA9IGh0bWw7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTb3VyY2VGcm9tVGVtcGxhdGVNYXAoaWQpIHtcbiAgICB2YXIgc291cmNlID0gX3RlbXBsYXRlTWFwW2lkXTtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gY2xlYW5UZW1wbGF0ZUhUTUwoc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U291cmNlRnJvbUhUTUwoaWQpIHtcbiAgICB2YXIgc3JjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpLFxuICAgICAgICBzcmNodG1sO1xuXG4gICAgaWYgKHNyYykge1xuICAgICAgc3JjaHRtbCA9IHNyYy5pbm5lckhUTUw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignbnVkb3J1L2NvcmUvVGVtcGxhdGluZywgdGVtcGxhdGUgbm90IGZvdW5kOiBcIicgKyBpZCArICdcIicpO1xuICAgICAgc3JjaHRtbCA9ICc8ZGl2PlRlbXBsYXRlIG5vdCBmb3VuZDogJyArIGlkICsgJzwvZGl2Pic7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFuVGVtcGxhdGVIVE1MKHNyY2h0bWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdGVtcGxhdGUgaHRtbCBmcm9tIHRoZSBzY3JpcHQgdGFnIHdpdGggaWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U291cmNlKGlkKSB7XG4gICAgaWYgKF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdO1xuICAgIH1cblxuICAgIHZhciBzb3VyY2VodG1sID0gZ2V0U291cmNlRnJvbVRlbXBsYXRlTWFwKGlkKTtcblxuICAgIGlmICghc291cmNlaHRtbCkge1xuICAgICAgc291cmNlaHRtbCA9IGdldFNvdXJjZUZyb21IVE1MKGlkKTtcbiAgICB9XG5cbiAgICBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdID0gc291cmNlaHRtbDtcbiAgICByZXR1cm4gc291cmNlaHRtbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCBJRHMgYmVsb25naW5nIHRvIHRleHQvdGVtcGxhdGUgdHlwZSBzY3JpcHQgdGFnc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRBbGxUZW1wbGF0ZUlEcygpIHtcbiAgICB2YXIgc2NyaXB0VGFncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgMCk7XG5cbiAgICByZXR1cm4gc2NyaXB0VGFncy5maWx0ZXIoZnVuY3Rpb24gKHRhZykge1xuICAgICAgcmV0dXJuIHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gJ3RleHQvdGVtcGxhdGUnO1xuICAgIH0pLm1hcChmdW5jdGlvbiAodGFnKSB7XG4gICAgICByZXR1cm4gdGFnLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIHVuZGVyc2NvcmUgdGVtcGxhdGVcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VGVtcGxhdGUoaWQpIHtcbiAgICBpZiAoX3RlbXBsYXRlQ2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gX3RlbXBsYXRlQ2FjaGVbaWRdO1xuICAgIH1cbiAgICB2YXIgdGVtcGwgICAgICAgICAgPSBfLnRlbXBsYXRlKGdldFNvdXJjZShpZCkpO1xuICAgIF90ZW1wbGF0ZUNhY2hlW2lkXSA9IHRlbXBsO1xuICAgIHJldHVybiB0ZW1wbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIEhUTUxcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0hUTUwoaWQsIG9iaikge1xuICAgIHZhciB0ZW1wID0gZ2V0VGVtcGxhdGUoaWQpO1xuICAgIHJldHVybiB0ZW1wKG9iaik7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSBhbmQgcmV0dXJucyBhbiBIVE1MIEVsZW1lbnRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0VsZW1lbnQoaWQsIG9iaikge1xuICAgIHJldHVybiBfRE9NVXRpbHMuSFRNTFN0clRvTm9kZShhc0hUTUwoaWQsIG9iaikpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFucyB0ZW1wbGF0ZSBIVE1MXG4gICAqL1xuICBmdW5jdGlvbiBjbGVhblRlbXBsYXRlSFRNTChzdHIpIHtcbiAgICByZXR1cm4gc3RyLnRyaW0oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgcmV0dXJucywgc3BhY2VzIGFuZCB0YWJzXG4gICAqIEBwYXJhbSBzdHJcbiAgICogQHJldHVybnMge1hNTHxzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVXaGl0ZVNwYWNlKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyfFxcdCkvZ20sICcnKS5yZXBsYWNlKC8+XFxzKzwvZywgJz48Jyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGFsbCB0ZW1wbGF0ZXMsIGNsZWFuIHRoZW0gdXAgYW5kIGxvZ1xuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogU28gdGhpcyBoZWxwcyBjcmVhdGUgdGhlIGJsb2NrcyBmb3IgaW5zZXJ0aW9uIGluIHRvIHRoZSBET01cbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NGb3JET01JbnNlcnRpb24oKSB7XG4gICAgdmFyIGlkcyA9IGdldEFsbFRlbXBsYXRlSURzKCk7XG4gICAgaWRzLmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICB2YXIgc3JjID0gcmVtb3ZlV2hpdGVTcGFjZShnZXRTb3VyY2UoaWQpKTtcbiAgICAgIGNvbnNvbGUubG9nKGlkLCBzcmMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHRlbXBsYXRlIHNjcmlwdCB0YWcgdG8gdGhlIERPTVxuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBodG1sXG4gICAqL1xuICAvL2Z1bmN0aW9uIGFkZENsaWVudFNpZGVUZW1wbGF0ZVRvRE9NKGlkLCBodG1sKSB7XG4gIC8vICB2YXIgcyAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAvLyAgcy50eXBlICAgICAgPSAndGV4dC90ZW1wbGF0ZSc7XG4gIC8vICBzLmlkICAgICAgICA9IGlkO1xuICAvLyAgcy5pbm5lckhUTUwgPSBodG1sO1xuICAvLyAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChzKTtcbiAgLy99XG5cbiAgcmV0dXJuIHtcbiAgICBhZGRUZW1wbGF0ZSAgICAgICAgICAgOiBhZGRUZW1wbGF0ZSxcbiAgICBnZXRTb3VyY2UgICAgICAgICAgICAgOiBnZXRTb3VyY2UsXG4gICAgZ2V0QWxsVGVtcGxhdGVJRHMgICAgIDogZ2V0QWxsVGVtcGxhdGVJRHMsXG4gICAgcHJvY2Vzc0ZvckRPTUluc2VydGlvbjogcHJvY2Vzc0ZvckRPTUluc2VydGlvbixcbiAgICBnZXRUZW1wbGF0ZSAgICAgICAgICAgOiBnZXRUZW1wbGF0ZSxcbiAgICBhc0hUTUwgICAgICAgICAgICAgICAgOiBhc0hUTUwsXG4gICAgYXNFbGVtZW50ICAgICAgICAgICAgIDogYXNFbGVtZW50XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGluZygpOyIsInZhciBBcHBsaWNhdGlvblZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF90aGlzLFxuICAgICAgX2RvbVV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEluaXRpYWxpemF0aW9uXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplXG4gICAqIEBwYXJhbSBzY2FmZm9sZFRlbXBsYXRlcyB0ZW1wbGF0ZSBJRHMgdG8gYXR0YWNoZWQgdG8gdGhlIGJvZHkgZm9yIHRoZSBhcHBcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcoc2NhZmZvbGRUZW1wbGF0ZXMpIHtcbiAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBhdHRhY2hBcHBsaWNhdGlvblNjYWZmb2xkaW5nKHNjYWZmb2xkVGVtcGxhdGVzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRhY2ggYXBwIEhUTUwgc3RydWN0dXJlXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGF0dGFjaEFwcGxpY2F0aW9uU2NhZmZvbGRpbmcodGVtcGxhdGVzKSB7XG4gICAgaWYgKCF0ZW1wbGF0ZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgYm9keUVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYm9keScpO1xuXG4gICAgdGVtcGxhdGVzLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsKSB7XG4gICAgICBib2R5RWwuYXBwZW5kQ2hpbGQoX2RvbVV0aWxzLkhUTUxTdHJUb05vZGUoX3RoaXMudGVtcGxhdGUoKS5nZXRTb3VyY2UoJ3RlbXBsYXRlX18nICsgdGVtcGwsIHt9KSkpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFmdGVyIGFwcCBpbml0aWFsaXphdGlvbiwgcmVtb3ZlIHRoZSBsb2FkaW5nIG1lc3NhZ2VcbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZUxvYWRpbmdNZXNzYWdlKCkge1xuICAgIHZhciBjb3ZlciAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2luaXRpYWxpemF0aW9uX19jb3ZlcicpLFxuICAgICAgICBtZXNzYWdlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmluaXRpYWxpemF0aW9uX19tZXNzYWdlJyk7XG5cbiAgICBUd2VlbkxpdGUudG8oY292ZXIsIDEsIHtcbiAgICAgIGFscGhhOiAwLCBlYXNlOiBRdWFkLmVhc2VPdXQsIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY292ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjb3Zlcik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBUd2VlbkxpdGUudG8obWVzc2FnZSwgMiwge1xuICAgICAgdG9wOiBcIis9NTBweFwiLCBlYXNlOiBRdWFkLmVhc2VJbiwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb3Zlci5yZW1vdmVDaGlsZChtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldzogaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyxcbiAgICByZW1vdmVMb2FkaW5nTWVzc2FnZSAgICAgOiByZW1vdmVMb2FkaW5nTWVzc2FnZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uVmlldygpOyIsIi8qKlxuICogTWl4aW4gdmlldyB0aGF0IGFsbG93cyBmb3IgY29tcG9uZW50IHZpZXdzXG4gKi9cblxudmFyIE1peGluQ29tcG9uZW50Vmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jb21wb25lbnRWaWV3TWFwICAgICAgICAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX2NvbXBvbmVudEhUTUxUZW1wbGF0ZVByZWZpeCA9ICd0ZW1wbGF0ZV9fJyxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgdGVtcGxhdGUgb2JqZWN0XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VGVtcGxhdGUoKSB7XG4gICAgcmV0dXJuIF90ZW1wbGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXAgYSBjb21wb25lbnQgdG8gYSBtb3VudGluZyBwb2ludC4gSWYgYSBzdHJpbmcgaXMgcGFzc2VkLFxuICAgKiB0aGUgY29ycmVjdCBvYmplY3Qgd2lsbCBiZSBjcmVhdGVkIGZyb20gdGhlIGZhY3RvcnkgbWV0aG9kLCBvdGhlcndpc2UsXG4gICAqIHRoZSBwYXNzZWQgY29tcG9uZW50IG9iamVjdCBpcyB1c2VkLlxuICAgKlxuICAgKiBAcGFyYW0gY29tcG9uZW50SURcbiAgICogQHBhcmFtIGNvbXBvbmVudElEb3JPYmpcbiAgICogQHBhcmFtIG1vdW50UG9pbnRcbiAgICovXG4gIGZ1bmN0aW9uIG1hcFZpZXdDb21wb25lbnQoY29tcG9uZW50SUQsIGNvbXBvbmVudElEb3JPYmosIG1vdW50UG9pbnQpIHtcbiAgICB2YXIgY29tcG9uZW50T2JqO1xuXG4gICAgaWYgKHR5cGVvZiBjb21wb25lbnRJRG9yT2JqID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIGNvbXBvbmVudEZhY3RvcnkgPSByZXF1aXJlKGNvbXBvbmVudElEb3JPYmopO1xuICAgICAgY29tcG9uZW50T2JqICAgICAgICAgPSBjcmVhdGVDb21wb25lbnRWaWV3KGNvbXBvbmVudEZhY3RvcnkoKSkoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50T2JqID0gY29tcG9uZW50SURvck9iajtcbiAgICB9XG5cbiAgICBfY29tcG9uZW50Vmlld01hcFtjb21wb25lbnRJRF0gPSB7XG4gICAgICBodG1sVGVtcGxhdGU6IF90ZW1wbGF0ZS5nZXRUZW1wbGF0ZShfY29tcG9uZW50SFRNTFRlbXBsYXRlUHJlZml4ICsgY29tcG9uZW50SUQpLFxuICAgICAgY29udHJvbGxlciAgOiBjb21wb25lbnRPYmosXG4gICAgICBtb3VudFBvaW50ICA6IG1vdW50UG9pbnRcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEZhY3RvcnkgdG8gY3JlYXRlIGNvbXBvbmVudCB2aWV3IG1vZHVsZXMgYnkgY29uY2F0aW5nIG11bHRpcGxlIHNvdXJjZSBvYmplY3RzXG4gICAqIEBwYXJhbSBjb21wb25lbnRTb3VyY2UgQ3VzdG9tIG1vZHVsZSBzb3VyY2VcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVDb21wb25lbnRWaWV3KGNvbXBvbmVudFNvdXJjZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29tcG9uZW50Vmlld0ZhY3RvcnkgID0gcmVxdWlyZSgnLi9WaWV3Q29tcG9uZW50LmpzJyksXG4gICAgICAgICAgZXZlbnREZWxlZ2F0b3JGYWN0b3J5ID0gcmVxdWlyZSgnLi9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzJyksXG4gICAgICAgICAgb2JzZXJ2YWJsZUZhY3RvcnkgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcycpLFxuICAgICAgICAgIHNpbXBsZVN0b3JlRmFjdG9yeSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL1NpbXBsZVN0b3JlLmpzJyksXG4gICAgICAgICAgY29tcG9uZW50QXNzZW1ibHksIGZpbmFsQ29tcG9uZW50LCBwcmV2aW91c0luaXRpYWxpemU7XG5cbiAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gW1xuICAgICAgICBjb21wb25lbnRWaWV3RmFjdG9yeSgpLFxuICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkoKSxcbiAgICAgICAgb2JzZXJ2YWJsZUZhY3RvcnkoKSxcbiAgICAgICAgc2ltcGxlU3RvcmVGYWN0b3J5KCksXG4gICAgICAgIGNvbXBvbmVudFNvdXJjZVxuICAgICAgXTtcblxuICAgICAgaWYgKGNvbXBvbmVudFNvdXJjZS5taXhpbnMpIHtcbiAgICAgICAgY29tcG9uZW50QXNzZW1ibHkgPSBjb21wb25lbnRBc3NlbWJseS5jb25jYXQoY29tcG9uZW50U291cmNlLm1peGlucyk7XG4gICAgICB9XG5cbiAgICAgIGZpbmFsQ29tcG9uZW50ID0gTm9yaS5hc3NpZ25BcnJheSh7fSwgY29tcG9uZW50QXNzZW1ibHkpO1xuXG4gICAgICAvLyBDb21wb3NlIGEgbmV3IGluaXRpYWxpemUgZnVuY3Rpb24gYnkgaW5zZXJ0aW5nIGNhbGwgdG8gY29tcG9uZW50IHN1cGVyIG1vZHVsZVxuICAgICAgcHJldmlvdXNJbml0aWFsaXplICAgICAgICA9IGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemU7XG4gICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplID0gZnVuY3Rpb24gaW5pdGlhbGl6ZShpbml0T2JqKSB7XG4gICAgICAgIGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemVDb21wb25lbnQoaW5pdE9iaik7XG4gICAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZS5jYWxsKGZpbmFsQ29tcG9uZW50LCBpbml0T2JqKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgZmluYWxDb21wb25lbnQpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIG1hcHBlZCBjb21wb25lbnRWaWV3XG4gICAqIEBwYXJhbSBjb21wb25lbnRJRFxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1ZpZXdDb21wb25lbnQoY29tcG9uZW50SUQsIG1vdW50UG9pbnQpIHtcbiAgICB2YXIgY29tcG9uZW50VmlldyA9IF9jb21wb25lbnRWaWV3TWFwW2NvbXBvbmVudElEXTtcbiAgICBpZiAoIWNvbXBvbmVudFZpZXcpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gY29tcG9uZW50VmlldyBtYXBwZWQgZm9yIGlkOiAnICsgY29tcG9uZW50SUQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmlzSW5pdGlhbGl6ZWQoKSkge1xuICAgICAgbW91bnRQb2ludCA9IG1vdW50UG9pbnQgfHwgY29tcG9uZW50Vmlldy5tb3VudFBvaW50O1xuICAgICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmluaXRpYWxpemUoe1xuICAgICAgICBpZCAgICAgICAgOiBjb21wb25lbnRJRCxcbiAgICAgICAgdGVtcGxhdGUgIDogY29tcG9uZW50Vmlldy5odG1sVGVtcGxhdGUsXG4gICAgICAgIG1vdW50UG9pbnQ6IG1vdW50UG9pbnRcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmNvbXBvbmVudFJlbmRlcigpO1xuICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5tb3VudCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtYXAgb2JqZWN0IGZvciBjb21wb25lbnQgdmlld3NcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb21wb25lbnRWaWV3TWFwKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2NvbXBvbmVudFZpZXdNYXApO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZSAgICAgICAgICAgOiBnZXRUZW1wbGF0ZSxcbiAgICBtYXBWaWV3Q29tcG9uZW50ICAgOiBtYXBWaWV3Q29tcG9uZW50LFxuICAgIGNyZWF0ZUNvbXBvbmVudFZpZXc6IGNyZWF0ZUNvbXBvbmVudFZpZXcsXG4gICAgc2hvd1ZpZXdDb21wb25lbnQgIDogc2hvd1ZpZXdDb21wb25lbnQsXG4gICAgZ2V0Q29tcG9uZW50Vmlld01hcDogZ2V0Q29tcG9uZW50Vmlld01hcFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluQ29tcG9uZW50Vmlld3MoKTsiLCIvKipcbiAqIENvbnZlbmllbmNlIG1peGluIHRoYXQgbWFrZXMgZXZlbnRzIGVhc2llciBmb3Igdmlld3NcbiAqXG4gKiBCYXNlZCBvbiBCYWNrYm9uZVxuICogUmV2aWV3IHRoaXMgaHR0cDovL2Jsb2cubWFyaW9uZXR0ZWpzLmNvbS8yMDE1LzAyLzEyL3VuZGVyc3RhbmRpbmctdGhlLWV2ZW50LWhhc2gvaW5kZXguaHRtbFxuICpcbiAqIEV4YW1wbGU6XG4gKiB0aGlzLnNldEV2ZW50cyh7XG4gKiAgICAgICAgJ2NsaWNrICNidG5fbWFpbl9wcm9qZWN0cyc6IGhhbmRsZVByb2plY3RzQnV0dG9uLFxuICogICAgICAgICdjbGljayAjYnRuX2ZvbywgY2xpY2sgI2J0bl9iYXInOiBoYW5kbGVGb29CYXJCdXR0b25zXG4gKiAgICAgIH0pO1xuICogdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuICpcbiAqL1xuXG52YXIgTWl4aW5FdmVudERlbGVnYXRvciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2V2ZW50c01hcCxcbiAgICAgIF9ldmVudFN1YnNjcmliZXJzLFxuICAgICAgX3J4ID0gcmVxdWlyZSgnLi4vdXRpbHMvUngnKTtcblxuICBmdW5jdGlvbiBzZXRFdmVudHMoZXZ0T2JqKSB7XG4gICAgX2V2ZW50c01hcCA9IGV2dE9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEV2ZW50cygpIHtcbiAgICByZXR1cm4gX2V2ZW50c01hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdXRvbWF0ZXMgc2V0dGluZyBldmVudHMgb24gRE9NIGVsZW1lbnRzLlxuICAgKiAnZXZ0U3RyIHNlbGVjdG9yJzpjYWxsYmFja1xuICAgKiAnZXZ0U3RyIHNlbGVjdG9yLCBldnRTdHIgc2VsZWN0b3InOiBzaGFyZWRDYWxsYmFja1xuICAgKi9cbiAgZnVuY3Rpb24gZGVsZWdhdGVFdmVudHMoKSB7XG4gICAgaWYgKCFfZXZlbnRzTWFwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yICh2YXIgZXZ0U3RyaW5ncyBpbiBfZXZlbnRzTWFwKSB7XG4gICAgICBpZiAoX2V2ZW50c01hcC5oYXNPd25Qcm9wZXJ0eShldnRTdHJpbmdzKSkge1xuXG4gICAgICAgIHZhciBtYXBwaW5ncyAgICAgPSBldnRTdHJpbmdzLnNwbGl0KCcsJyksXG4gICAgICAgICAgICBldmVudEhhbmRsZXIgPSBfZXZlbnRzTWFwW2V2dFN0cmluZ3NdO1xuXG4gICAgICAgIGlmICghaXMuZnVuY3Rpb24oZXZlbnRIYW5kbGVyKSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybignRXZlbnREZWxlZ2F0b3IsIGhhbmRsZXIgZm9yICcgKyBldnRTdHJpbmdzICsgJyBpcyBub3QgYSBmdW5jdGlvbicpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIGpzaGludCAtVzA4MyAqL1xuICAgICAgICAvLyBodHRwczovL2pzbGludGVycm9ycy5jb20vZG9udC1tYWtlLWZ1bmN0aW9ucy13aXRoaW4tYS1sb29wXG4gICAgICAgIG1hcHBpbmdzLmZvckVhY2goZnVuY3Rpb24gKGV2dE1hcCkge1xuICAgICAgICAgIGV2dE1hcCAgICAgICAgICAgICAgICAgICAgICAgID0gZXZ0TWFwLnRyaW0oKTtcbiAgICAgICAgICB2YXIgZXZlbnRTdHIgICAgICAgICAgICAgICAgICA9IGV2dE1hcC5zcGxpdCgnICcpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgICAgc2VsZWN0b3IgICAgICAgICAgICAgICAgICA9IGV2dE1hcC5zcGxpdCgnICcpWzFdLnRyaW0oKTtcbiAgICAgICAgICBfZXZlbnRTdWJzY3JpYmVyc1tldnRTdHJpbmdzXSA9IGNyZWF0ZUhhbmRsZXIoc2VsZWN0b3IsIGV2ZW50U3RyLCBldmVudEhhbmRsZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgLyoganNoaW50ICtXMDgzICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSGFuZGxlcihzZWxlY3RvciwgZXZlbnRTdHIsIGV2ZW50SGFuZGxlcikge1xuICAgIHJldHVybiBfcnguZG9tKHNlbGVjdG9yLCBldmVudFN0cikuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW5seSByZW1vdmUgZXZlbnRzXG4gICAqL1xuICBmdW5jdGlvbiB1bmRlbGVnYXRlRXZlbnRzKCkge1xuICAgIGlmICghX2V2ZW50c01hcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIGV2ZW50IGluIF9ldmVudFN1YnNjcmliZXJzKSB7XG4gICAgICBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF0uZGlzcG9zZSgpO1xuICAgICAgZGVsZXRlIF9ldmVudFN1YnNjcmliZXJzW2V2ZW50XTtcbiAgICB9XG5cbiAgICBfZXZlbnRTdWJzY3JpYmVycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNldEV2ZW50cyAgICAgICA6IHNldEV2ZW50cyxcbiAgICBnZXRFdmVudHMgICAgICAgOiBnZXRFdmVudHMsXG4gICAgdW5kZWxlZ2F0ZUV2ZW50czogdW5kZWxlZ2F0ZUV2ZW50cyxcbiAgICBkZWxlZ2F0ZUV2ZW50cyAgOiBkZWxlZ2F0ZUV2ZW50c1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluRXZlbnREZWxlZ2F0b3I7IiwidmFyIE1peGluTnVkb3J1Q29udHJvbHMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9ub3RpZmljYXRpb25WaWV3ICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcycpLFxuICAgICAgX3Rvb2xUaXBWaWV3ICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvVG9vbFRpcFZpZXcuanMnKSxcbiAgICAgIF9tZXNzYWdlQm94VmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzJyksXG4gICAgICBfbWVzc2FnZUJveENyZWF0b3IgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Q3JlYXRvci5qcycpLFxuICAgICAgX21vZGFsQ292ZXJWaWV3ICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKSB7XG4gICAgX3Rvb2xUaXBWaWV3LmluaXRpYWxpemUoJ3Rvb2x0aXBfX2NvbnRhaW5lcicpO1xuICAgIF9ub3RpZmljYXRpb25WaWV3LmluaXRpYWxpemUoJ3RvYXN0X19jb250YWluZXInKTtcbiAgICBfbWVzc2FnZUJveFZpZXcuaW5pdGlhbGl6ZSgnbWVzc2FnZWJveF9fY29udGFpbmVyJyk7XG4gICAgX21vZGFsQ292ZXJWaWV3LmluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1iQ3JlYXRvcigpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hDcmVhdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTWVzc2FnZUJveChvYmopIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlTWVzc2FnZUJveChpZCkge1xuICAgIF9tZXNzYWdlQm94Vmlldy5yZW1vdmUoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWxlcnQobWVzc2FnZSwgdGl0bGUpIHtcbiAgICByZXR1cm4gbWJDcmVhdG9yKCkuYWxlcnQodGl0bGUgfHwgJ0FsZXJ0JywgbWVzc2FnZSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGROb3RpZmljYXRpb24ob2JqKSB7XG4gICAgcmV0dXJuIF9ub3RpZmljYXRpb25WaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KG1lc3NhZ2UsIHRpdGxlLCB0eXBlKSB7XG4gICAgcmV0dXJuIGFkZE5vdGlmaWNhdGlvbih7XG4gICAgICB0aXRsZSAgOiB0aXRsZSB8fCAnJyxcbiAgICAgIHR5cGUgICA6IHR5cGUgfHwgX25vdGlmaWNhdGlvblZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVOdWRvcnVDb250cm9sczogaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzLFxuICAgIG1iQ3JlYXRvciAgICAgICAgICAgICAgIDogbWJDcmVhdG9yLFxuICAgIGFkZE1lc3NhZ2VCb3ggICAgICAgICAgIDogYWRkTWVzc2FnZUJveCxcbiAgICByZW1vdmVNZXNzYWdlQm94ICAgICAgICA6IHJlbW92ZU1lc3NhZ2VCb3gsXG4gICAgYWRkTm90aWZpY2F0aW9uICAgICAgICAgOiBhZGROb3RpZmljYXRpb24sXG4gICAgYWxlcnQgICAgICAgICAgICAgICAgICAgOiBhbGVydCxcbiAgICBub3RpZnkgICAgICAgICAgICAgICAgICA6IG5vdGlmeVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluTnVkb3J1Q29udHJvbHMoKTsiLCIvKipcbiAqIE1peGluIHZpZXcgdGhhdCBhbGxvd3MgZm9yIGNvbXBvbmVudCB2aWV3cyB0byBiZSBkaXNwbGF5IG9uIHN0b3JlIHN0YXRlIGNoYW5nZXNcbiAqL1xuXG52YXIgTWl4aW5TdG9yZVN0YXRlVmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF90aGlzLFxuICAgICAgX3dhdGNoZWRTdG9yZSxcbiAgICAgIF9jdXJyZW50Vmlld0lELFxuICAgICAgX2N1cnJlbnRTdG9yZVN0YXRlLFxuICAgICAgX3N0YXRlVmlld01vdW50UG9pbnQsXG4gICAgICBfc3RhdGVWaWV3SURNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgbGlzdGVuZXJzXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplU3RhdGVWaWV3cyhzdG9yZSkge1xuICAgIF90aGlzID0gdGhpczsgLy8gbWl0aWdhdGlvbiwgRHVlIHRvIGV2ZW50cywgc2NvcGUgbWF5IGJlIHNldCB0byB0aGUgd2luZG93IG9iamVjdFxuICAgIF93YXRjaGVkU3RvcmUgPSBzdG9yZTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndmlld0NoYW5nZScpO1xuXG4gICAgX3dhdGNoZWRTdG9yZS5zdWJzY3JpYmUoZnVuY3Rpb24gb25TdGF0ZUNoYW5nZSgpIHtcbiAgICAgIGhhbmRsZVN0YXRlQ2hhbmdlKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2hvdyByb3V0ZSBmcm9tIFVSTCBoYXNoIG9uIGNoYW5nZVxuICAgKiBAcGFyYW0gcm91dGVPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlQ2hhbmdlKCkge1xuICAgIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUoKSB7XG4gICAgdmFyIHN0YXRlID0gX3dhdGNoZWRTdG9yZS5nZXRTdGF0ZSgpLmN1cnJlbnRTdGF0ZTtcbiAgICBpZiAoc3RhdGUpIHtcbiAgICAgIGlmIChzdGF0ZSAhPT0gX2N1cnJlbnRTdG9yZVN0YXRlKSB7XG4gICAgICAgIF9jdXJyZW50U3RvcmVTdGF0ZSA9IHN0YXRlO1xuICAgICAgICBzaG93U3RhdGVWaWV3Q29tcG9uZW50LmJpbmQoX3RoaXMpKF9jdXJyZW50U3RvcmVTdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgbG9jYXRpb24gZm9yIHRoZSB2aWV3IHRvIG1vdW50IG9uIHJvdXRlIGNoYW5nZXMsIGFueSBjb250ZW50cyB3aWxsXG4gICAqIGJlIHJlbW92ZWQgcHJpb3JcbiAgICogQHBhcmFtIGVsSURcbiAgICovXG4gIGZ1bmN0aW9uIHNldFZpZXdNb3VudFBvaW50KGVsSUQpIHtcbiAgICBfc3RhdGVWaWV3TW91bnRQb2ludCA9IGVsSUQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRWaWV3TW91bnRQb2ludCgpIHtcbiAgICByZXR1cm4gX3N0YXRlVmlld01vdW50UG9pbnQ7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGEgcm91dGUgdG8gYSBtb2R1bGUgdmlldyBjb250cm9sbGVyXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUlEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqL1xuICBmdW5jdGlvbiBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudChzdGF0ZSwgdGVtcGxhdGVJRCwgY29tcG9uZW50SURvck9iaikge1xuICAgIF9zdGF0ZVZpZXdJRE1hcFtzdGF0ZV0gPSB0ZW1wbGF0ZUlEO1xuICAgIHRoaXMubWFwVmlld0NvbXBvbmVudCh0ZW1wbGF0ZUlELCBjb21wb25lbnRJRG9yT2JqLCBfc3RhdGVWaWV3TW91bnRQb2ludCk7XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIHZpZXcgKGluIHJlc3BvbnNlIHRvIGEgcm91dGUgY2hhbmdlKVxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICovXG4gIGZ1bmN0aW9uIHNob3dTdGF0ZVZpZXdDb21wb25lbnQoc3RhdGUpIHtcbiAgICB2YXIgY29tcG9uZW50SUQgPSBfc3RhdGVWaWV3SURNYXBbc3RhdGVdO1xuICAgIGlmICghY29tcG9uZW50SUQpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIk5vIHZpZXcgbWFwcGVkIGZvciByb3V0ZTogXCIgKyBzdGF0ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmVtb3ZlQ3VycmVudFZpZXcoKTtcblxuICAgIF9jdXJyZW50Vmlld0lEID0gY29tcG9uZW50SUQ7XG4gICAgdGhpcy5zaG93Vmlld0NvbXBvbmVudChfY3VycmVudFZpZXdJRCk7XG5cbiAgICAvLyBUcmFuc2l0aW9uIG5ldyB2aWV3IGluXG4gICAgVHdlZW5MaXRlLnNldChfc3RhdGVWaWV3TW91bnRQb2ludCwge2FscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9zdGF0ZVZpZXdNb3VudFBvaW50LCAwLjI1LCB7YWxwaGE6IDEsIGVhc2U6IFF1YWQuZWFzZUlufSk7XG5cbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3ZpZXdDaGFuZ2UnLCBjb21wb25lbnRJRCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBjdXJyZW50bHkgZGlzcGxheWVkIHZpZXdcbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZUN1cnJlbnRWaWV3KCkge1xuICAgIGlmIChfY3VycmVudFZpZXdJRCkge1xuICAgICAgX3RoaXMuZ2V0Q29tcG9uZW50Vmlld01hcCgpW19jdXJyZW50Vmlld0lEXS5jb250cm9sbGVyLnVubW91bnQoKTtcbiAgICB9XG4gICAgX2N1cnJlbnRWaWV3SUQgPSAnJztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVN0YXRlVmlld3MgICAgICAgIDogaW5pdGlhbGl6ZVN0YXRlVmlld3MsXG4gICAgc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZTogc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSxcbiAgICBzaG93U3RhdGVWaWV3Q29tcG9uZW50ICAgICAgOiBzaG93U3RhdGVWaWV3Q29tcG9uZW50LFxuICAgIHNldFZpZXdNb3VudFBvaW50ICAgICAgICAgICA6IHNldFZpZXdNb3VudFBvaW50LFxuICAgIGdldFZpZXdNb3VudFBvaW50ICAgICAgICAgICA6IGdldFZpZXdNb3VudFBvaW50LFxuICAgIG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50ICAgICA6IG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5TdG9yZVN0YXRlVmlld3MoKTsiLCIvKipcbiAqIEJhc2UgbW9kdWxlIGZvciBjb21wb25lbnRzXG4gKiBNdXN0IGJlIGV4dGVuZGVkIHdpdGggY3VzdG9tIG1vZHVsZXNcbiAqL1xuXG52YXIgVmlld0NvbXBvbmVudCA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2lzSW5pdGlhbGl6ZWQgPSBmYWxzZSxcbiAgICAgIF9jb25maWdQcm9wcyxcbiAgICAgIF9pZCxcbiAgICAgIF90ZW1wbGF0ZU9iaixcbiAgICAgIF9odG1sLFxuICAgICAgX0RPTUVsZW1lbnQsXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF9jaGlsZHJlbiAgICAgID0gW10sXG4gICAgICBfaXNNb3VudGVkICAgICA9IGZhbHNlLFxuICAgICAgX3JlbmRlcmVyICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9SZW5kZXJlcicpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXphdGlvblxuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVDb21wb25lbnQoY29uZmlnUHJvcHMpIHtcbiAgICBfY29uZmlnUHJvcHMgPSBjb25maWdQcm9wcztcbiAgICBfaWQgICAgICAgICAgPSBjb25maWdQcm9wcy5pZDtcbiAgICBfdGVtcGxhdGVPYmogPSBjb25maWdQcm9wcy50ZW1wbGF0ZTtcbiAgICBfbW91bnRQb2ludCAgPSBjb25maWdQcm9wcy5tb3VudFBvaW50O1xuXG4gICAgdGhpcy5zZXRTdGF0ZSh0aGlzLmdldEluaXRpYWxTdGF0ZSgpKTtcbiAgICB0aGlzLnNldEV2ZW50cyh0aGlzLmRlZmluZUV2ZW50cygpKTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndXBkYXRlJyk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdtb3VudCcpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndW5tb3VudCcpO1xuXG4gICAgX2lzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVmaW5lRXZlbnRzKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQmluZCB1cGRhdGVzIHRvIHRoZSBtYXAgSUQgdG8gdGhpcyB2aWV3J3MgdXBkYXRlXG4gICAqIEBwYXJhbSBtYXBJRG9yT2JqIE9iamVjdCB0byBzdWJzY3JpYmUgdG8gb3IgSUQuIFNob3VsZCBpbXBsZW1lbnQgbm9yaS9zdG9yZS9NaXhpbk9ic2VydmFibGVTdG9yZVxuICAgKi9cbiAgZnVuY3Rpb24gYmluZE1hcChtYXBJRG9yT2JqKSB7XG4gICAgdmFyIG1hcDtcblxuICAgIGlmIChpcy5vYmplY3QobWFwSURvck9iaikpIHtcbiAgICAgIG1hcCA9IG1hcElEb3JPYmo7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1hcCA9IE5vcmkuc3RvcmUoKS5nZXRNYXAobWFwSURvck9iaikgfHwgTm9yaS5zdG9yZSgpLmdldE1hcENvbGxlY3Rpb24obWFwSURvck9iaik7XG4gICAgfVxuXG4gICAgaWYgKCFtYXApIHtcbiAgICAgIGNvbnNvbGUud2FybignVmlld0NvbXBvbmVudCBiaW5kTWFwLCBtYXAgb3IgbWFwY29sbGVjdGlvbiBub3QgZm91bmQ6ICcgKyBtYXBJRG9yT2JqKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWlzLmZ1bmN0aW9uKG1hcC5zdWJzY3JpYmUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1ZpZXdDb21wb25lbnQgYmluZE1hcCwgbWFwIG9yIG1hcGNvbGxlY3Rpb24gbXVzdCBiZSBvYnNlcnZhYmxlOiAnICsgbWFwSURvck9iaik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWFwLnN1YnNjcmliZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBjaGlsZFxuICAgKiBAcGFyYW0gY2hpbGRcbiAgICovXG4gIC8vZnVuY3Rpb24gYWRkQ2hpbGQoY2hpbGQpIHtcbiAgLy8gIF9jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGNoaWxkXG4gICAqIEBwYXJhbSBjaGlsZFxuICAgKi9cbiAgLy9mdW5jdGlvbiByZW1vdmVDaGlsZChjaGlsZCkge1xuICAvLyAgdmFyIGlkeCA9IF9jaGlsZHJlbi5pbmRleE9mKGNoaWxkKTtcbiAgLy8gIF9jaGlsZHJlbltpZHhdLnVubW91bnQoKTtcbiAgLy8gIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIEJlZm9yZSB0aGUgdmlldyB1cGRhdGVzIGFuZCBhIHJlcmVuZGVyIG9jY3Vyc1xuICAgKiBSZXR1cm5zIG5leHRTdGF0ZSBvZiBjb21wb25lbnRcbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVcGRhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICB2YXIgY3VycmVudFN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuICAgIHZhciBuZXh0U3RhdGUgICAgPSB0aGlzLmNvbXBvbmVudFdpbGxVcGRhdGUoKTtcblxuICAgIGlmICh0aGlzLnNob3VsZENvbXBvbmVudFVwZGF0ZShuZXh0U3RhdGUpKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKG5leHRTdGF0ZSk7XG4gICAgICAvL19jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIHVwZGF0ZUNoaWxkKGNoaWxkKSB7XG4gICAgICAvLyAgY2hpbGQudXBkYXRlKCk7XG4gICAgICAvL30pO1xuXG4gICAgICBpZiAoX2lzTW91bnRlZCkge1xuICAgICAgICBpZiAodGhpcy5zaG91bGRDb21wb25lbnRSZW5kZXIoY3VycmVudFN0YXRlKSkge1xuICAgICAgICAgIHRoaXMudW5tb3VudCgpO1xuICAgICAgICAgIHRoaXMuY29tcG9uZW50UmVuZGVyKCk7XG4gICAgICAgICAgdGhpcy5tb3VudCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3VwZGF0ZScsIHRoaXMuZ2V0SUQoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbXBhcmUgY3VycmVudCBzdGF0ZSBhbmQgbmV4dCBzdGF0ZSB0byBkZXRlcm1pbmUgaWYgdXBkYXRpbmcgc2hvdWxkIG9jY3VyXG4gICAqIEBwYXJhbSBuZXh0U3RhdGVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSB7XG4gICAgcmV0dXJuIGlzLmV4aXN0eShuZXh0U3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBpdCwgbmVlZCB0byBhZGQgaXQgdG8gYSBwYXJlbnQgY29udGFpbmVyLCBoYW5kbGVkIGluIGhpZ2hlciBsZXZlbCB2aWV3XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50UmVuZGVyKCkge1xuICAgIC8vX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gcmVuZGVyQ2hpbGQoY2hpbGQpIHtcbiAgICAvLyAgY2hpbGQuY29tcG9uZW50UmVuZGVyKCk7XG4gICAgLy99KTtcblxuICAgIF9odG1sID0gdGhpcy5yZW5kZXIodGhpcy5nZXRTdGF0ZSgpKTtcblxuICB9XG5cbiAgLyoqXG4gICAqIE1heSBiZSBvdmVycmlkZGVuIGluIGEgc3VibW9kdWxlIGZvciBjdXN0b20gcmVuZGVyaW5nXG4gICAqIFNob3VsZCByZXR1cm4gSFRNTFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHJlbmRlcihzdGF0ZSkge1xuICAgIHJldHVybiBfdGVtcGxhdGVPYmooc3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZCBpdCB0byBhIHBhcmVudCBlbGVtZW50XG4gICAqIEBwYXJhbSBtb3VudEVsXG4gICAqL1xuICBmdW5jdGlvbiBtb3VudCgpIHtcbiAgICBpZiAoIV9odG1sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBvbmVudCAnICsgX2lkICsgJyBjYW5ub3QgbW91bnQgd2l0aCBubyBIVE1MLiBDYWxsIHJlbmRlcigpIGZpcnN0PycpO1xuICAgIH1cblxuICAgIF9pc01vdW50ZWQgPSB0cnVlO1xuXG4gICAgX0RPTUVsZW1lbnQgPSAoX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiBfaHRtbFxuICAgIH0pKTtcblxuICAgIGlmICh0aGlzLmRlbGVnYXRlRXZlbnRzKSB7XG4gICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29tcG9uZW50RGlkTW91bnQpIHtcbiAgICAgIHRoaXMuY29tcG9uZW50RGlkTW91bnQoKTtcbiAgICB9XG5cbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ21vdW50JywgdGhpcy5nZXRJRCgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIGFmdGVyIGl0J3MgYmVlbiBhZGRlZCB0byBhIHZpZXdcbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgIC8vIHN0dWJcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHdoZW4gdW5sb2FkaW5nXG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcbiAgICAvLyBzdHViXG4gIH1cblxuICBmdW5jdGlvbiB1bm1vdW50KCkge1xuICAgIHRoaXMuY29tcG9uZW50V2lsbFVubW91bnQoKTtcbiAgICBfaXNNb3VudGVkID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy51bmRlbGVnYXRlRXZlbnRzKSB7XG4gICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICB9XG5cbiAgICBfcmVuZGVyZXIucmVuZGVyKHtcbiAgICAgIHRhcmdldDogX21vdW50UG9pbnQsXG4gICAgICBodG1sICA6ICcnXG4gICAgfSk7XG5cbiAgICBfaHRtbCAgICAgICA9ICcnO1xuICAgIF9ET01FbGVtZW50ID0gbnVsbDtcbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3VubW91bnQnLCB0aGlzLmdldElEKCkpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZnVuY3Rpb24gaXNJbml0aWFsaXplZCgpIHtcbiAgICByZXR1cm4gX2lzSW5pdGlhbGl6ZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb25maWdQcm9wcygpIHtcbiAgICByZXR1cm4gX2NvbmZpZ1Byb3BzO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNNb3VudGVkKCkge1xuICAgIHJldHVybiBfaXNNb3VudGVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuICAgIHRoaXMuc2V0U3RhdGUoe30pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SUQoKSB7XG4gICAgcmV0dXJuIF9pZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERPTUVsZW1lbnQoKSB7XG4gICAgcmV0dXJuIF9ET01FbGVtZW50O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VGVtcGxhdGUoKSB7XG4gICAgcmV0dXJuIF90ZW1wbGF0ZU9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFRlbXBsYXRlKGh0bWwpIHtcbiAgICBfdGVtcGxhdGVPYmogPSBfLnRlbXBsYXRlKGh0bWwpO1xuICB9XG5cbiAgLy9mdW5jdGlvbiBnZXRDaGlsZHJlbigpIHtcbiAgLy8gIHJldHVybiBfY2hpbGRyZW4uc2xpY2UoMCk7XG4gIC8vfVxuXG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplQ29tcG9uZW50OiBpbml0aWFsaXplQ29tcG9uZW50LFxuICAgIGRlZmluZUV2ZW50cyAgICAgICA6IGRlZmluZUV2ZW50cyxcbiAgICBpc0luaXRpYWxpemVkICAgICAgOiBpc0luaXRpYWxpemVkLFxuICAgIGdldENvbmZpZ1Byb3BzICAgICA6IGdldENvbmZpZ1Byb3BzLFxuICAgIGdldEluaXRpYWxTdGF0ZSAgICA6IGdldEluaXRpYWxTdGF0ZSxcbiAgICBnZXRJRCAgICAgICAgICAgICAgOiBnZXRJRCxcbiAgICBnZXRUZW1wbGF0ZSAgICAgICAgOiBnZXRUZW1wbGF0ZSxcbiAgICBzZXRUZW1wbGF0ZSAgICAgICAgOiBzZXRUZW1wbGF0ZSxcbiAgICBnZXRET01FbGVtZW50ICAgICAgOiBnZXRET01FbGVtZW50LFxuICAgIGlzTW91bnRlZCAgICAgICAgICA6IGlzTW91bnRlZCxcblxuICAgIGJpbmRNYXA6IGJpbmRNYXAsXG5cbiAgICBjb21wb25lbnRXaWxsVXBkYXRlICA6IGNvbXBvbmVudFdpbGxVcGRhdGUsXG4gICAgc2hvdWxkQ29tcG9uZW50VXBkYXRlOiBzaG91bGRDb21wb25lbnRVcGRhdGUsXG4gICAgdXBkYXRlICAgICAgICAgICAgICAgOiB1cGRhdGUsXG5cbiAgICBjb21wb25lbnRSZW5kZXI6IGNvbXBvbmVudFJlbmRlcixcbiAgICByZW5kZXIgICAgICAgICA6IHJlbmRlcixcblxuICAgIG1vdW50ICAgICAgICAgICAgOiBtb3VudCxcbiAgICBjb21wb25lbnREaWRNb3VudDogY29tcG9uZW50RGlkTW91bnQsXG5cbiAgICBjb21wb25lbnRXaWxsVW5tb3VudDogY29tcG9uZW50V2lsbFVubW91bnQsXG4gICAgdW5tb3VudCAgICAgICAgICAgICA6IHVubW91bnRcblxuICAgIC8vYWRkQ2hpbGQgICA6IGFkZENoaWxkLFxuICAgIC8vcmVtb3ZlQ2hpbGQ6IHJlbW92ZUNoaWxkLFxuICAgIC8vZ2V0Q2hpbGRyZW46IGdldENoaWxkcmVuXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmlld0NvbXBvbmVudDsiLCJ2YXIgYnJvd3NlckluZm8gPSB7XG5cbiAgYXBwVmVyc2lvbiA6IG5hdmlnYXRvci5hcHBWZXJzaW9uLFxuICB1c2VyQWdlbnQgIDogbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgaXNJRSAgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTVNJRSBcIiksXG4gIGlzSUU2ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA2XCIpLFxuICBpc0lFNyAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgN1wiKSxcbiAgaXNJRTggICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDhcIiksXG4gIGlzSUU5ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA5XCIpLFxuICBpc0ZGICAgICAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJGaXJlZm94L1wiKSxcbiAgaXNDaHJvbWUgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiQ2hyb21lL1wiKSxcbiAgaXNNYWMgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTWFjaW50b3NoLFwiKSxcbiAgaXNNYWNTYWZhcmk6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiU2FmYXJpXCIpICYmIC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTWFjXCIpICYmIC0xID09PSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJDaHJvbWVcIiksXG5cbiAgaGFzVG91Y2ggICAgOiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gIG5vdFN1cHBvcnRlZDogKHRoaXMuaXNJRTYgfHwgdGhpcy5pc0lFNyB8fCB0aGlzLmlzSUU4IHx8IHRoaXMuaXNJRTkpLFxuXG4gIG1vYmlsZToge1xuICAgIEFuZHJvaWQgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9BbmRyb2lkL2kpO1xuICAgIH0sXG4gICAgQmxhY2tCZXJyeTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JsYWNrQmVycnkvaSkgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQkIxMDsgVG91Y2gvKTtcbiAgICB9LFxuICAgIGlPUyAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGhvbmV8aVBhZHxpUG9kL2kpO1xuICAgIH0sXG4gICAgT3BlcmEgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL09wZXJhIE1pbmkvaSk7XG4gICAgfSxcbiAgICBXaW5kb3dzICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvSUVNb2JpbGUvaSk7XG4gICAgfSxcbiAgICBhbnkgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gKHRoaXMuQW5kcm9pZCgpIHx8IHRoaXMuQmxhY2tCZXJyeSgpIHx8IHRoaXMuaU9TKCkgfHwgdGhpcy5PcGVyYSgpIHx8IHRoaXMuV2luZG93cygpKSAhPT0gbnVsbDtcbiAgICB9XG5cbiAgfSxcblxuICAvLyBUT0RPIGZpbHRlciBmb3IgSUUgPiA5XG4gIGVuaGFuY2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICFfYnJvd3NlckluZm8uaXNJRSAmJiAhX2Jyb3dzZXJJbmZvLm1vYmlsZS5hbnkoKTtcbiAgfSxcblxuICBtb3VzZURvd25FdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoc3RhcnRcIiA6IFwibW91c2Vkb3duXCI7XG4gIH0sXG5cbiAgbW91c2VVcEV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiO1xuICB9LFxuXG4gIG1vdXNlQ2xpY2tFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoZW5kXCIgOiBcImNsaWNrXCI7XG4gIH0sXG5cbiAgbW91c2VNb3ZlRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaG1vdmVcIiA6IFwibW91c2Vtb3ZlXCI7XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBicm93c2VySW5mbzsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEyMzk5OS9ob3ctdG8tdGVsbC1pZi1hLWRvbS1lbGVtZW50LWlzLXZpc2libGUtaW4tdGhlLWN1cnJlbnQtdmlld3BvcnRcbiAgLy8gZWxlbWVudCBtdXN0IGJlIGVudGlyZWx5IG9uIHNjcmVlblxuICBpc0VsZW1lbnRFbnRpcmVseUluVmlld3BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIChcbiAgICAgIHJlY3QudG9wID49IDAgJiZcbiAgICAgIHJlY3QubGVmdCA+PSAwICYmXG4gICAgICByZWN0LmJvdHRvbSA8PSAod2luZG93LmlubmVySGVpZ2h0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpICYmXG4gICAgICByZWN0LnJpZ2h0IDw9ICh3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpXG4gICAgKTtcbiAgfSxcblxuICAvLyBlbGVtZW50IG1heSBiZSBwYXJ0aWFseSBvbiBzY3JlZW5cbiAgaXNFbGVtZW50SW5WaWV3cG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gcmVjdC5ib3R0b20gPiAwICYmXG4gICAgICByZWN0LnJpZ2h0ID4gMCAmJlxuICAgICAgcmVjdC5sZWZ0IDwgKHdpbmRvdy5pbm5lcldpZHRoIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCkgJiZcbiAgICAgIHJlY3QudG9wIDwgKHdpbmRvdy5pbm5lckhlaWdodCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KTtcbiAgfSxcblxuICBpc0RvbU9iajogZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiAhIShvYmoubm9kZVR5cGUgfHwgKG9iaiA9PT0gd2luZG93KSk7XG4gIH0sXG5cbiAgcG9zaXRpb246IGZ1bmN0aW9uIChlbCkge1xuICAgIHJldHVybiB7XG4gICAgICBsZWZ0OiBlbC5vZmZzZXRMZWZ0LFxuICAgICAgdG9wIDogZWwub2Zmc2V0VG9wXG4gICAgfTtcbiAgfSxcblxuICAvLyBmcm9tIGh0dHA6Ly9qc3BlcmYuY29tL2pxdWVyeS1vZmZzZXQtdnMtb2Zmc2V0cGFyZW50LWxvb3BcbiAgb2Zmc2V0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgb2wgPSAwLFxuICAgICAgICBvdCA9IDA7XG4gICAgaWYgKGVsLm9mZnNldFBhcmVudCkge1xuICAgICAgZG8ge1xuICAgICAgICBvbCArPSBlbC5vZmZzZXRMZWZ0O1xuICAgICAgICBvdCArPSBlbC5vZmZzZXRUb3A7XG4gICAgICB9IHdoaWxlIChlbCA9IGVsLm9mZnNldFBhcmVudCk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbGVmdDogb2wsXG4gICAgICB0b3AgOiBvdFxuICAgIH07XG4gIH0sXG5cbiAgcmVtb3ZlQWxsRWxlbWVudHM6IGZ1bmN0aW9uIChlbCkge1xuICAgIHdoaWxlIChlbC5maXJzdENoaWxkKSB7XG4gICAgICBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcbiAgICB9XG4gIH0sXG5cbiAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQ5NDE0My9jcmVhdGluZy1hLW5ldy1kb20tZWxlbWVudC1mcm9tLWFuLWh0bWwtc3RyaW5nLXVzaW5nLWJ1aWx0LWluLWRvbS1tZXRob2RzLW9yLXByb1xuICBIVE1MU3RyVG9Ob2RlOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgdmFyIHRlbXAgICAgICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0ZW1wLmlubmVySFRNTCA9IHN0cjtcbiAgICByZXR1cm4gdGVtcC5maXJzdENoaWxkO1xuICB9LFxuXG4gIHdyYXBFbGVtZW50OiBmdW5jdGlvbiAod3JhcHBlclN0ciwgZWwpIHtcbiAgICB2YXIgd3JhcHBlckVsID0gdGhpcy5IVE1MU3RyVG9Ob2RlKHdyYXBwZXJTdHIpLFxuICAgICAgICBlbFBhcmVudCAgPSBlbC5wYXJlbnROb2RlO1xuXG4gICAgd3JhcHBlckVsLmFwcGVuZENoaWxkKGVsKTtcbiAgICBlbFBhcmVudC5hcHBlbmRDaGlsZCh3cmFwcGVyRWwpO1xuICAgIHJldHVybiB3cmFwcGVyRWw7XG4gIH0sXG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNTMyOTE2Ny9jbG9zZXN0LWFuY2VzdG9yLW1hdGNoaW5nLXNlbGVjdG9yLXVzaW5nLW5hdGl2ZS1kb21cbiAgY2xvc2VzdDogZnVuY3Rpb24gKGVsLCBzZWxlY3Rvcikge1xuICAgIHZhciBtYXRjaGVzU2VsZWN0b3IgPSBlbC5tYXRjaGVzIHx8IGVsLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fCBlbC5tb3pNYXRjaGVzU2VsZWN0b3IgfHwgZWwubXNNYXRjaGVzU2VsZWN0b3I7XG4gICAgd2hpbGUgKGVsKSB7XG4gICAgICBpZiAobWF0Y2hlc1NlbGVjdG9yLmJpbmQoZWwpKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbCA9IGVsLnBhcmVudEVsZW1lbnQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvLyBmcm9tIHlvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb21cbiAgaGFzQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldyBSZWdFeHAoJyhefCApJyArIGNsYXNzTmFtZSArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgYWRkQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICAgIH1cbiAgfSxcblxuICByZW1vdmVDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyhefFxcXFxiKScgKyBjbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCd8JykgKyAnKFxcXFxifCQpJywgJ2dpJyksICcgJyk7XG4gICAgfVxuICB9LFxuXG4gIHRvZ2dsZUNsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH1cbiAgfSxcblxuICAvLyBGcm9tIGltcHJlc3MuanNcbiAgYXBwbHlDU1M6IGZ1bmN0aW9uIChlbCwgcHJvcHMpIHtcbiAgICB2YXIga2V5LCBwa2V5O1xuICAgIGZvciAoa2V5IGluIHByb3BzKSB7XG4gICAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBlbC5zdHlsZVtrZXldID0gcHJvcHNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVsO1xuICB9LFxuXG4gIC8vIGZyb20gaW1wcmVzcy5qc1xuICAvLyBgY29tcHV0ZVdpbmRvd1NjYWxlYCBjb3VudHMgdGhlIHNjYWxlIGZhY3RvciBiZXR3ZWVuIHdpbmRvdyBzaXplIGFuZCBzaXplXG4gIC8vIGRlZmluZWQgZm9yIHRoZSBwcmVzZW50YXRpb24gaW4gdGhlIGNvbmZpZy5cbiAgY29tcHV0ZVdpbmRvd1NjYWxlOiBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgdmFyIGhTY2FsZSA9IHdpbmRvdy5pbm5lckhlaWdodCAvIGNvbmZpZy5oZWlnaHQsXG4gICAgICAgIHdTY2FsZSA9IHdpbmRvdy5pbm5lcldpZHRoIC8gY29uZmlnLndpZHRoLFxuICAgICAgICBzY2FsZSAgPSBoU2NhbGUgPiB3U2NhbGUgPyB3U2NhbGUgOiBoU2NhbGU7XG5cbiAgICBpZiAoY29uZmlnLm1heFNjYWxlICYmIHNjYWxlID4gY29uZmlnLm1heFNjYWxlKSB7XG4gICAgICBzY2FsZSA9IGNvbmZpZy5tYXhTY2FsZTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLm1pblNjYWxlICYmIHNjYWxlIDwgY29uZmlnLm1pblNjYWxlKSB7XG4gICAgICBzY2FsZSA9IGNvbmZpZy5taW5TY2FsZTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2NhbGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBhbiBhcnJheSBvZiBlbGVtZW50cyBpbiB0aGUgY29udGFpbmVyIHJldHVybmVkIGFzIEFycmF5IGluc3RlYWQgb2YgYSBOb2RlIGxpc3RcbiAgICovXG4gIGdldFFTRWxlbWVudHNBc0FycmF5OiBmdW5jdGlvbiAoZWwsIGNscykge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKGNscyksIDApO1xuICB9LFxuXG4gIGNlbnRlckVsZW1lbnRJblZpZXdQb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgdnBIID0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgICAgICB2cFcgPSB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgZWxSID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgIGVsSCA9IGVsUi5oZWlnaHQsXG4gICAgICAgIGVsVyA9IGVsUi53aWR0aDtcblxuICAgIGVsLnN0eWxlLmxlZnQgPSAodnBXIC8gMikgLSAoZWxXIC8gMikgKyAncHgnO1xuICAgIGVsLnN0eWxlLnRvcCAgPSAodnBIIC8gMikgLSAoZWxIIC8gMikgKyAncHgnO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG9iamVjdCBmcm9tIHRoZSBuYW1lIChvciBpZCkgYXR0cmlicyBhbmQgZGF0YSBvZiBhIGZvcm1cbiAgICogQHBhcmFtIGVsXG4gICAqIEByZXR1cm5zIHtudWxsfVxuICAgKi9cbiAgY2FwdHVyZUZvcm1EYXRhOiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgZGF0YU9iaiA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICAgIHRleHRhcmVhRWxzLCBpbnB1dEVscywgc2VsZWN0RWxzO1xuXG4gICAgdGV4dGFyZWFFbHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCd0ZXh0YXJlYScpLCAwKTtcbiAgICBpbnB1dEVscyAgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0JyksIDApO1xuICAgIHNlbGVjdEVscyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgnc2VsZWN0JyksIDApO1xuXG4gICAgdGV4dGFyZWFFbHMuZm9yRWFjaChnZXRJbnB1dEZvcm1EYXRhKTtcbiAgICBpbnB1dEVscy5mb3JFYWNoKGdldElucHV0Rm9ybURhdGEpO1xuICAgIHNlbGVjdEVscy5mb3JFYWNoKGdldFNlbGVjdEZvcm1EYXRhKTtcblxuICAgIHJldHVybiBkYXRhT2JqO1xuXG4gICAgZnVuY3Rpb24gZ2V0SW5wdXRGb3JtRGF0YShmb3JtRWwpIHtcbiAgICAgIGRhdGFPYmpbZ2V0RWxOYW1lT3JJRChmb3JtRWwpXSA9IGZvcm1FbC52YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RGb3JtRGF0YShmb3JtRWwpIHtcbiAgICAgIHZhciBzZWwgPSBmb3JtRWwuc2VsZWN0ZWRJbmRleCwgdmFsID0gJyc7XG4gICAgICBpZiAoc2VsID49IDApIHtcbiAgICAgICAgdmFsID0gZm9ybUVsLm9wdGlvbnNbc2VsXS52YWx1ZTtcbiAgICAgIH1cbiAgICAgIGRhdGFPYmpbZ2V0RWxOYW1lT3JJRChmb3JtRWwpXSA9IHZhbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRFbE5hbWVPcklEKGZvcm1FbCkge1xuICAgICAgdmFyIG5hbWUgPSAnbm9fbmFtZSc7XG4gICAgICBpZiAoZm9ybUVsLmdldEF0dHJpYnV0ZSgnbmFtZScpKSB7XG4gICAgICAgIG5hbWUgPSBmb3JtRWwuZ2V0QXR0cmlidXRlKCduYW1lJyk7XG4gICAgICB9IGVsc2UgaWYgKGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ2lkJykpIHtcbiAgICAgICAgbmFtZSA9IGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ2lkJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmFtZTtcbiAgICB9XG4gIH1cblxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvKipcbiAgICogQ3JlYXRlIHNoYXJlZCAzZCBwZXJzcGVjdGl2ZSBmb3IgYWxsIGNoaWxkcmVuXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHkzRFRvQ29udGFpbmVyOiBmdW5jdGlvbiAoZWwpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGVsLCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgcGVyc3BlY3RpdmUgICAgICA6IDgwMCxcbiAgICAgICAgcGVyc3BlY3RpdmVPcmlnaW46ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBcHBseSBiYXNpYyBDU1MgcHJvcHNcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBhcHBseTNEVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGVsLCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgdHJhbnNmb3JtU3R5bGUgICAgOiBcInByZXNlcnZlLTNkXCIsXG4gICAgICAgIGJhY2tmYWNlVmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luICAgOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbHkgYmFzaWMgM2QgcHJvcHMgYW5kIHNldCB1bmlxdWUgcGVyc3BlY3RpdmUgZm9yIGNoaWxkcmVuXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHlVbmlxdWUzRFRvRWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHRyYW5zZm9ybVN0eWxlICAgICAgOiBcInByZXNlcnZlLTNkXCIsXG4gICAgICAgIGJhY2tmYWNlVmlzaWJpbGl0eSAgOiBcImhpZGRlblwiLFxuICAgICAgICB0cmFuc2Zvcm1QZXJzcGVjdGl2ZTogNjAwLFxuICAgICAgICB0cmFuc2Zvcm1PcmlnaW4gICAgIDogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxufTtcbiIsInZhciBNZXNzYWdlQm94Q3JlYXRvciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX21lc3NhZ2VCb3hWaWV3ID0gcmVxdWlyZSgnLi9NZXNzYWdlQm94VmlldycpO1xuXG4gIGZ1bmN0aW9uIGFsZXJ0KHRpdGxlLCBtZXNzYWdlLCBtb2RhbCwgY2IpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cD4nICsgbWVzc2FnZSArICc8L3A+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREFOR0VSLFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA0MDAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnQ2xvc2UnLFxuICAgICAgICAgIGlkICAgICA6ICdDbG9zZScsXG4gICAgICAgICAgdHlwZSAgIDogJycsXG4gICAgICAgICAgaWNvbiAgIDogJ3RpbWVzJyxcbiAgICAgICAgICBvbkNsaWNrOiBjYlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb25maXJtKHRpdGxlLCBtZXNzYWdlLCBva0NCLCBtb2RhbCkge1xuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwPicgKyBtZXNzYWdlICsgJzwvcD4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA0MDAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXG4gICAgICAgICAgaWQgICA6ICdDYW5jZWwnLFxuICAgICAgICAgIHR5cGUgOiAnbmVnYXRpdmUnLFxuICAgICAgICAgIGljb24gOiAndGltZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnUHJvY2VlZCcsXG4gICAgICAgICAgaWQgICAgIDogJ3Byb2NlZWQnLFxuICAgICAgICAgIHR5cGUgICA6ICdwb3NpdGl2ZScsXG4gICAgICAgICAgaWNvbiAgIDogJ2NoZWNrJyxcbiAgICAgICAgICBvbkNsaWNrOiBva0NCXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21wdCh0aXRsZSwgbWVzc2FnZSwgb2tDQiwgbW9kYWwpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cCBjbGFzcz1cInRleHQtY2VudGVyIHBhZGRpbmctYm90dG9tLWRvdWJsZVwiPicgKyBtZXNzYWdlICsgJzwvcD48dGV4dGFyZWEgbmFtZT1cInJlc3BvbnNlXCIgY2xhc3M9XCJpbnB1dC10ZXh0XCIgdHlwZT1cInRleHRcIiBzdHlsZT1cIndpZHRoOjQwMHB4OyBoZWlnaHQ6NzVweDsgcmVzaXplOiBub25lXCIgYXV0b2ZvY3VzPVwidHJ1ZVwiPjwvdGV4dGFyZWE+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDUwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ1Byb2NlZWQnLFxuICAgICAgICAgIGlkICAgICA6ICdwcm9jZWVkJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjaG9pY2UodGl0bGUsIG1lc3NhZ2UsIHNlbGVjdGlvbnMsIG9rQ0IsIG1vZGFsKSB7XG4gICAgdmFyIHNlbGVjdEhUTUwgPSAnPHNlbGVjdCBjbGFzcz1cInNwYWNlZFwiIHN0eWxlPVwid2lkdGg6NDUwcHg7aGVpZ2h0OjIwMHB4XCIgbmFtZT1cInNlbGVjdGlvblwiIGF1dG9mb2N1cz1cInRydWVcIiBzaXplPVwiMjBcIj4nO1xuXG4gICAgc2VsZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChvcHQpIHtcbiAgICAgIHNlbGVjdEhUTUwgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgb3B0LnZhbHVlICsgJ1wiICcgKyAob3B0LnNlbGVjdGVkID09PSAndHJ1ZScgPyAnc2VsZWN0ZWQnIDogJycpICsgJz4nICsgb3B0LmxhYmVsICsgJzwvb3B0aW9uPic7XG4gICAgfSk7XG5cbiAgICBzZWxlY3RIVE1MICs9ICc8L3NlbGVjdD4nO1xuXG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHAgY2xhc3M9XCJ0ZXh0LWNlbnRlciBwYWRkaW5nLWJvdHRvbS1kb3VibGVcIj4nICsgbWVzc2FnZSArICc8L3A+PGRpdiBjbGFzcz1cInRleHQtY2VudGVyXCI+JyArIHNlbGVjdEhUTUwgKyAnPC9kaXY+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNTAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ09LJyxcbiAgICAgICAgICBpZCAgICAgOiAnb2snLFxuICAgICAgICAgIHR5cGUgICA6ICdwb3NpdGl2ZScsXG4gICAgICAgICAgaWNvbiAgIDogJ2NoZWNrJyxcbiAgICAgICAgICBvbkNsaWNrOiBva0NCXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYWxlcnQgIDogYWxlcnQsXG4gICAgY29uZmlybTogY29uZmlybSxcbiAgICBwcm9tcHQgOiBwcm9tcHQsXG4gICAgY2hvaWNlIDogY2hvaWNlXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZUJveENyZWF0b3IoKTsiLCJ2YXIgTWVzc2FnZUJveFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgICAgICAgICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgICAgICAgICAgICA9IDAsXG4gICAgICBfaGlnaGVzdFogICAgICAgICAgICAgICA9IDEwMDAsXG4gICAgICBfZGVmYXVsdFdpZHRoICAgICAgICAgICA9IDQwMCxcbiAgICAgIF90eXBlcyAgICAgICAgICAgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCAgICAgICAgICAgPSB7XG4gICAgICAgICdkZWZhdWx0JyAgICA6ICcnLFxuICAgICAgICAnaW5mb3JtYXRpb24nOiAnbWVzc2FnZWJveF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAnbWVzc2FnZWJveF9fc3VjY2VzcycsXG4gICAgICAgICd3YXJuaW5nJyAgICA6ICdtZXNzYWdlYm94X193YXJuaW5nJyxcbiAgICAgICAgJ2RhbmdlcicgICAgIDogJ21lc3NhZ2Vib3hfX2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF9idXR0b25JY29uVGVtcGxhdGVJRCAgID0gJ3RlbXBsYXRlX19tZXNzYWdlYm94LS1idXR0b24taWNvbicsXG4gICAgICBfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCA9ICd0ZW1wbGF0ZV9fbWVzc2FnZWJveC0tYnV0dG9uLW5vaWNvbicsXG4gICAgICBfdGVtcGxhdGUgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX21vZGFsICAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL01vZGFsQ292ZXJWaWV3LmpzJyksXG4gICAgICBfYnJvd3NlckluZm8gICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyksXG4gICAgICBfZG9tVXRpbHMgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyksXG4gICAgICBfY29tcG9uZW50VXRpbHMgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMnKTtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgc2V0IHRoZSBtb3VudCBwb2ludCAvIGJveCBjb250YWluZXJcbiAgICogQHBhcmFtIGVsSURcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgbmV3IG1lc3NhZ2UgYm94XG4gICAqIEBwYXJhbSBpbml0T2JqXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYWRkKGluaXRPYmopIHtcbiAgICB2YXIgdHlwZSAgID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxULFxuICAgICAgICBib3hPYmogPSBjcmVhdGVCb3hPYmplY3QoaW5pdE9iaik7XG5cbiAgICAvLyBzZXR1cFxuICAgIF9jaGlsZHJlbi5wdXNoKGJveE9iaik7XG4gICAgX21vdW50UG9pbnQuYXBwZW5kQ2hpbGQoYm94T2JqLmVsZW1lbnQpO1xuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBib3hPYmouZWxlbWVudCk7XG4gICAgY29uZmlndXJlQnV0dG9ucyhib3hPYmopO1xuXG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5VW5pcXVlM0RUb0VsZW1lbnQoYm94T2JqLmVsZW1lbnQpO1xuXG4gICAgLy8gU2V0IDNkIENTUyBwcm9wcyBmb3IgaW4vb3V0IHRyYW5zaXRpb25cbiAgICBUd2VlbkxpdGUuc2V0KGJveE9iai5lbGVtZW50LCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgekluZGV4OiBfaGlnaGVzdFosXG4gICAgICAgIHdpZHRoIDogaW5pdE9iai53aWR0aCA/IGluaXRPYmoud2lkdGggOiBfZGVmYXVsdFdpZHRoXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBjZW50ZXIgYWZ0ZXIgd2lkdGggaGFzIGJlZW4gc2V0XG4gICAgX2RvbVV0aWxzLmNlbnRlckVsZW1lbnRJblZpZXdQb3J0KGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIE1ha2UgaXQgZHJhZ2dhYmxlXG4gICAgRHJhZ2dhYmxlLmNyZWF0ZSgnIycgKyBib3hPYmouaWQsIHtcbiAgICAgIGJvdW5kcyA6IHdpbmRvdyxcbiAgICAgIG9uUHJlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2hpZ2hlc3RaID0gRHJhZ2dhYmxlLnpJbmRleDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFNob3cgaXRcbiAgICB0cmFuc2l0aW9uSW4oYm94T2JqLmVsZW1lbnQpO1xuXG4gICAgLy8gU2hvdyB0aGUgbW9kYWwgY292ZXJcbiAgICBpZiAoaW5pdE9iai5tb2RhbCkge1xuICAgICAgX21vZGFsLnNob3dOb25EaXNtaXNzYWJsZSh0cnVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYm94T2JqLmlkO1xuICB9XG5cbiAgLyoqXG4gICAqIEFzc2lnbiBhIHR5cGUgY2xhc3MgdG8gaXRcbiAgICogQHBhcmFtIHR5cGVcbiAgICogQHBhcmFtIGVsZW1lbnRcbiAgICovXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGhlIG9iamVjdCBmb3IgYSBib3hcbiAgICogQHBhcmFtIGluaXRPYmpcbiAgICogQHJldHVybnMge3tkYXRhT2JqOiAqLCBpZDogc3RyaW5nLCBtb2RhbDogKCp8Ym9vbGVhbiksIGVsZW1lbnQ6ICosIHN0cmVhbXM6IEFycmF5fX1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUJveE9iamVjdChpbml0T2JqKSB7XG4gICAgdmFyIGlkICA9ICdqc19fbWVzc2FnZWJveC0nICsgKF9jb3VudGVyKyspLnRvU3RyaW5nKCksXG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICBkYXRhT2JqOiBpbml0T2JqLFxuICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgIG1vZGFsICA6IGluaXRPYmoubW9kYWwsXG4gICAgICAgICAgZWxlbWVudDogX3RlbXBsYXRlLmFzRWxlbWVudCgndGVtcGxhdGVfX21lc3NhZ2Vib3gtLWRlZmF1bHQnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IGluaXRPYmoudGl0bGUsXG4gICAgICAgICAgICBjb250ZW50OiBpbml0T2JqLmNvbnRlbnRcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBzdHJlYW1zOiBbXVxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgdGhlIGJ1dHRvbnNcbiAgICogQHBhcmFtIGJveE9ialxuICAgKi9cbiAgZnVuY3Rpb24gY29uZmlndXJlQnV0dG9ucyhib3hPYmopIHtcbiAgICB2YXIgYnV0dG9uRGF0YSA9IGJveE9iai5kYXRhT2JqLmJ1dHRvbnM7XG5cbiAgICAvLyBkZWZhdWx0IGJ1dHRvbiBpZiBub25lXG4gICAgaWYgKCFidXR0b25EYXRhKSB7XG4gICAgICBidXR0b25EYXRhID0gW3tcbiAgICAgICAgbGFiZWw6ICdDbG9zZScsXG4gICAgICAgIHR5cGUgOiAnJyxcbiAgICAgICAgaWNvbiA6ICd0aW1lcycsXG4gICAgICAgIGlkICAgOiAnZGVmYXVsdC1jbG9zZSdcbiAgICAgIH1dO1xuICAgIH1cblxuICAgIHZhciBidXR0b25Db250YWluZXIgPSBib3hPYmouZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuZm9vdGVyLWJ1dHRvbnMnKTtcblxuICAgIF9kb21VdGlscy5yZW1vdmVBbGxFbGVtZW50cyhidXR0b25Db250YWluZXIpO1xuXG4gICAgYnV0dG9uRGF0YS5mb3JFYWNoKGZ1bmN0aW9uIG1ha2VCdXR0b24oYnV0dG9uT2JqKSB7XG4gICAgICBidXR0b25PYmouaWQgPSBib3hPYmouaWQgKyAnLWJ1dHRvbi0nICsgYnV0dG9uT2JqLmlkO1xuXG4gICAgICB2YXIgYnV0dG9uRWw7XG5cbiAgICAgIGlmIChidXR0b25PYmouaGFzT3duUHJvcGVydHkoJ2ljb24nKSkge1xuICAgICAgICBidXR0b25FbCA9IF90ZW1wbGF0ZS5hc0VsZW1lbnQoX2J1dHRvbkljb25UZW1wbGF0ZUlELCBidXR0b25PYmopO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnV0dG9uRWwgPSBfdGVtcGxhdGUuYXNFbGVtZW50KF9idXR0b25Ob0ljb25UZW1wbGF0ZUlELCBidXR0b25PYmopO1xuICAgICAgfVxuXG4gICAgICBidXR0b25Db250YWluZXIuYXBwZW5kQ2hpbGQoYnV0dG9uRWwpO1xuXG4gICAgICB2YXIgYnRuU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoYnV0dG9uRWwsIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpXG4gICAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChidXR0b25PYmouaGFzT3duUHJvcGVydHkoJ29uQ2xpY2snKSkge1xuICAgICAgICAgICAgaWYgKGJ1dHRvbk9iai5vbkNsaWNrKSB7XG4gICAgICAgICAgICAgIGJ1dHRvbk9iai5vbkNsaWNrLmNhbGwodGhpcywgY2FwdHVyZUZvcm1EYXRhKGJveE9iai5pZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZW1vdmUoYm94T2JqLmlkKTtcbiAgICAgICAgfSk7XG4gICAgICBib3hPYmouc3RyZWFtcy5wdXNoKGJ0blN0cmVhbSk7XG4gICAgfSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGRhdGEgZnJvbSB0aGUgZm9ybSBvbiB0aGUgYm94IGNvbnRlbnRzXG4gICAqIEBwYXJhbSBib3hJRFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNhcHR1cmVGb3JtRGF0YShib3hJRCkge1xuICAgIHJldHVybiBfZG9tVXRpbHMuY2FwdHVyZUZvcm1EYXRhKGdldE9iakJ5SUQoYm94SUQpLmVsZW1lbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGJveCBmcm9tIHRoZSBzY3JlZW4gLyBjb250YWluZXJcbiAgICogQHBhcmFtIGlkXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmUoaWQpIHtcbiAgICB2YXIgaWR4ID0gZ2V0T2JqSW5kZXhCeUlEKGlkKSxcbiAgICAgICAgYm94T2JqO1xuXG4gICAgaWYgKGlkeCA+IC0xKSB7XG4gICAgICBib3hPYmogPSBfY2hpbGRyZW5baWR4XTtcbiAgICAgIHRyYW5zaXRpb25PdXQoYm94T2JqLmVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IHRoZSBib3hcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2l0aW9uSW4oZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAsIHthbHBoYTogMCwgcm90YXRpb25YOiA0NSwgc2NhbGU6IDJ9KTtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuNSwge1xuICAgICAgYWxwaGEgICAgOiAxLFxuICAgICAgcm90YXRpb25YOiAwLFxuICAgICAgc2NhbGUgICAgOiAxLFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGJveFxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25PdXQoZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuMjUsIHtcbiAgICAgIGFscGhhICAgIDogMCxcbiAgICAgIHJvdGF0aW9uWDogLTQ1LFxuICAgICAgc2NhbGUgICAgOiAwLjI1LFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VJbiwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW4gdXAgYWZ0ZXIgdGhlIHRyYW5zaXRpb24gb3V0IGFuaW1hdGlvblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGZ1bmN0aW9uIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKSB7XG4gICAgdmFyIGlkeCAgICA9IGdldE9iakluZGV4QnlJRChlbC5nZXRBdHRyaWJ1dGUoJ2lkJykpLFxuICAgICAgICBib3hPYmogPSBfY2hpbGRyZW5baWR4XTtcblxuICAgIGJveE9iai5zdHJlYW1zLmZvckVhY2goZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgc3RyZWFtLmRpc3Bvc2UoKTtcbiAgICB9KTtcblxuICAgIERyYWdnYWJsZS5nZXQoJyMnICsgYm94T2JqLmlkKS5kaXNhYmxlKCk7XG5cbiAgICBfbW91bnRQb2ludC5yZW1vdmVDaGlsZChlbCk7XG5cbiAgICBfY2hpbGRyZW5baWR4XSA9IG51bGw7XG4gICAgX2NoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuXG4gICAgY2hlY2tNb2RhbFN0YXR1cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZSBpZiBhbnkgb3BlbiBib3hlcyBoYXZlIG1vZGFsIHRydWVcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrTW9kYWxTdGF0dXMoKSB7XG4gICAgdmFyIGlzTW9kYWwgPSBmYWxzZTtcblxuICAgIF9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChib3hPYmopIHtcbiAgICAgIGlmIChib3hPYmoubW9kYWwgPT09IHRydWUpIHtcbiAgICAgICAgaXNNb2RhbCA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoIWlzTW9kYWwpIHtcbiAgICAgIF9tb2RhbC5oaWRlKHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVdGlsaXR5IHRvIGdldCB0aGUgYm94IG9iamVjdCBpbmRleCBieSBJRFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFV0aWxpdHkgdG8gZ2V0IHRoZSBib3ggb2JqZWN0IGJ5IElEXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0T2JqQnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkID09PSBpZDtcbiAgICB9KVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VCb3hWaWV3KCk7IiwidmFyIE1vZGFsQ292ZXJWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfbW91bnRQb2ludCAgPSBkb2N1bWVudCxcbiAgICAgIF9tb2RhbENvdmVyRWwsXG4gICAgICBfbW9kYWxCYWNrZ3JvdW5kRWwsXG4gICAgICBfbW9kYWxDbG9zZUJ1dHRvbkVsLFxuICAgICAgX21vZGFsQ2xpY2tTdHJlYW0sXG4gICAgICBfaXNWaXNpYmxlLFxuICAgICAgX25vdERpc21pc3NhYmxlLFxuICAgICAgX2Jyb3dzZXJJbmZvID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuXG4gICAgX2lzVmlzaWJsZSA9IHRydWU7XG5cbiAgICBfbW9kYWxDb3ZlckVsICAgICAgID0gX21vdW50UG9pbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGFsX19jb3ZlcicpO1xuICAgIF9tb2RhbEJhY2tncm91bmRFbCAgPSBfbW91bnRQb2ludC5xdWVyeVNlbGVjdG9yKCcubW9kYWxfX2JhY2tncm91bmQnKTtcbiAgICBfbW9kYWxDbG9zZUJ1dHRvbkVsID0gX21vdW50UG9pbnQucXVlcnlTZWxlY3RvcignLm1vZGFsX19jbG9zZS1idXR0b24nKTtcblxuICAgIHZhciBtb2RhbEJHQ2xpY2sgICAgID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoX21vZGFsQmFja2dyb3VuZEVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKSxcbiAgICAgICAgbW9kYWxCdXR0b25DbGljayA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KF9tb2RhbENsb3NlQnV0dG9uRWwsIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpO1xuXG4gICAgX21vZGFsQ2xpY2tTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLm1lcmdlKG1vZGFsQkdDbGljaywgbW9kYWxCdXR0b25DbGljaylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKCkge1xuICAgICAgICBvbk1vZGFsQ2xpY2soKTtcbiAgICAgIH0pO1xuXG4gICAgaGlkZShmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJc1Zpc2libGUoKSB7XG4gICAgcmV0dXJuIF9pc1Zpc2libGU7XG4gIH1cblxuICBmdW5jdGlvbiBvbk1vZGFsQ2xpY2soKSB7XG4gICAgaWYgKF9ub3REaXNtaXNzYWJsZSkgcmV0dXJuO1xuICAgIGhpZGUodHJ1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKSB7XG4gICAgX2lzVmlzaWJsZSAgID0gdHJ1ZTtcbiAgICB2YXIgZHVyYXRpb24gPSBzaG91bGRBbmltYXRlID8gMC4yNSA6IDA7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhbHBoYTogMSxcbiAgICAgIGVhc2UgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3coc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NhYmxlID0gZmFsc2U7XG5cbiAgICBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKTtcblxuICAgIFR3ZWVuTGl0ZS5zZXQoX21vZGFsQ2xvc2VCdXR0b25FbCwge3NjYWxlOiAyLCBhbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAxLCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBzY2FsZSAgICA6IDEsXG4gICAgICBlYXNlICAgICA6IEJvdW5jZS5lYXNlT3V0LFxuICAgICAgZGVsYXkgICAgOiAxXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQSAnaGFyZCcgbW9kYWwgdmlldyBjYW5ub3QgYmUgZGlzbWlzc2VkIHdpdGggYSBjbGljaywgbXVzdCBiZSB2aWEgY29kZVxuICAgKiBAcGFyYW0gc2hvdWxkQW5pbWF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd05vbkRpc21pc3NhYmxlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoX2lzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ub3REaXNtaXNzYWJsZSA9IHRydWU7XG5cbiAgICBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgMCwge2F1dG9BbHBoYTogMH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZShzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKCFfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9pc1Zpc2libGUgICAgICA9IGZhbHNlO1xuICAgIF9ub3REaXNtaXNzYWJsZSA9IGZhbHNlO1xuICAgIHZhciBkdXJhdGlvbiAgICA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKF9tb2RhbENsb3NlQnV0dG9uRWwpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDb3ZlckVsLCBkdXJhdGlvbiwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgZHVyYXRpb24gLyAyLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRPcGFjaXR5KG9wYWNpdHkpIHtcbiAgICBpZiAob3BhY2l0eSA8IDAgfHwgb3BhY2l0eSA+IDEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdudWRvcnUvY29tcG9uZW50L01vZGFsQ292ZXJWaWV3OiBzZXRPcGFjaXR5OiBvcGFjaXR5IHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kIDEnKTtcbiAgICAgIG9wYWNpdHkgPSAxO1xuICAgIH1cbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCAwLjI1LCB7XG4gICAgICBhbHBoYTogb3BhY2l0eSxcbiAgICAgIGVhc2UgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldENvbG9yKHIsIGcsIGIpIHtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCAwLjI1LCB7XG4gICAgICBiYWNrZ3JvdW5kQ29sb3I6ICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJyxcbiAgICAgIGVhc2UgICAgICAgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemUgICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBzaG93ICAgICAgICAgICAgICA6IHNob3csXG4gICAgc2hvd05vbkRpc21pc3NhYmxlOiBzaG93Tm9uRGlzbWlzc2FibGUsXG4gICAgaGlkZSAgICAgICAgICAgICAgOiBoaWRlLFxuICAgIHZpc2libGUgICAgICAgICAgIDogZ2V0SXNWaXNpYmxlLFxuICAgIHNldE9wYWNpdHkgICAgICAgIDogc2V0T3BhY2l0eSxcbiAgICBzZXRDb2xvciAgICAgICAgICA6IHNldENvbG9yXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWxDb3ZlclZpZXcoKTsiLCJ2YXIgVG9hc3RWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgICAgICAgICAgID0gMCxcbiAgICAgIF9kZWZhdWx0RXhwaXJlRHVyYXRpb24gPSA3MDAwLFxuICAgICAgX3R5cGVzICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgPSB7XG4gICAgICAgICdkZWZhdWx0JyAgICA6ICcnLFxuICAgICAgICAnaW5mb3JtYXRpb24nOiAndG9hc3RfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ3RvYXN0X19zdWNjZXNzJyxcbiAgICAgICAgJ3dhcm5pbmcnICAgIDogJ3RvYXN0X193YXJuaW5nJyxcbiAgICAgICAgJ2RhbmdlcicgICAgIDogJ3RvYXN0X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfdGVtcGxhdGUgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfYnJvd3NlckluZm8gICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpLFxuICAgICAgX2NvbXBvbmVudFV0aWxzICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLy9vYmoudGl0bGUsIG9iai5jb250ZW50LCBvYmoudHlwZVxuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIGluaXRPYmoudHlwZSA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVDtcblxuICAgIHZhciB0b2FzdE9iaiA9IGNyZWF0ZVRvYXN0T2JqZWN0KGluaXRPYmoudGl0bGUsIGluaXRPYmoubWVzc2FnZSk7XG5cbiAgICBfY2hpbGRyZW4ucHVzaCh0b2FzdE9iaik7XG5cbiAgICBfbW91bnRQb2ludC5pbnNlcnRCZWZvcmUodG9hc3RPYmouZWxlbWVudCwgX21vdW50UG9pbnQuZmlyc3RDaGlsZCk7XG5cbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQoaW5pdE9iai50eXBlLCB0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIF9jb21wb25lbnRVdGlscy5hcHBseTNEVG9Db250YWluZXIoX21vdW50UG9pbnQpO1xuICAgIF9jb21wb25lbnRVdGlscy5hcHBseTNEVG9FbGVtZW50KHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgdmFyIGNsb3NlQnRuICAgICAgICAgPSB0b2FzdE9iai5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy50b2FzdF9faXRlbS1jb250cm9scyA+IGJ1dHRvbicpLFxuICAgICAgICBjbG9zZUJ0blN0ZWFtICAgID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoY2xvc2VCdG4sIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpLFxuICAgICAgICBleHBpcmVUaW1lU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbChfZGVmYXVsdEV4cGlyZUR1cmF0aW9uKTtcblxuICAgIHRvYXN0T2JqLmRlZmF1bHRCdXR0b25TdHJlYW0gPSBSeC5PYnNlcnZhYmxlLm1lcmdlKGNsb3NlQnRuU3RlYW0sIGV4cGlyZVRpbWVTdHJlYW0pLnRha2UoMSlcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKCkge1xuICAgICAgICByZW1vdmUodG9hc3RPYmouaWQpO1xuICAgICAgfSk7XG5cbiAgICB0cmFuc2l0aW9uSW4odG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICByZXR1cm4gdG9hc3RPYmouaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVUb2FzdE9iamVjdCh0aXRsZSwgbWVzc2FnZSkge1xuICAgIHZhciBpZCAgPSAnanNfX3RvYXN0LXRvYXN0aXRlbS0nICsgKF9jb3VudGVyKyspLnRvU3RyaW5nKCksXG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICBpZCAgICAgICAgICAgICAgICAgOiBpZCxcbiAgICAgICAgICBlbGVtZW50ICAgICAgICAgICAgOiBfdGVtcGxhdGUuYXNFbGVtZW50KCd0ZW1wbGF0ZV9fY29tcG9uZW50LS10b2FzdCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgZGVmYXVsdEJ1dHRvblN0cmVhbTogbnVsbFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShpZCkge1xuICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQoaWQpLFxuICAgICAgICB0b2FzdDtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgdG9hc3QgPSBfY2hpbGRyZW5baWR4XTtcbiAgICAgIHJlYXJyYW5nZShpZHgpO1xuICAgICAgdHJhbnNpdGlvbk91dCh0b2FzdC5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uSW4oZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAsIHthbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMSwge2FscGhhOiAxLCBlYXNlOiBRdWFkLmVhc2VPdXR9KTtcbiAgICByZWFycmFuZ2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25PdXQoZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuMjUsIHtcbiAgICAgIHJvdGF0aW9uWDogLTQ1LFxuICAgICAgYWxwaGEgICAgOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VJbiwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgICAgID0gZ2V0T2JqSW5kZXhCeUlEKGVsLmdldEF0dHJpYnV0ZSgnaWQnKSksXG4gICAgICAgIHRvYXN0T2JqICAgPSBfY2hpbGRyZW5baWR4XTtcblxuICAgIHRvYXN0T2JqLmRlZmF1bHRCdXR0b25TdHJlYW0uZGlzcG9zZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFycmFuZ2UoaWdub3JlKSB7XG4gICAgdmFyIGkgPSBfY2hpbGRyZW4ubGVuZ3RoIC0gMSxcbiAgICAgICAgY3VycmVudCxcbiAgICAgICAgeSA9IDA7XG5cbiAgICBmb3IgKDsgaSA+IC0xOyBpLS0pIHtcbiAgICAgIGlmIChpID09PSBpZ25vcmUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjdXJyZW50ID0gX2NoaWxkcmVuW2ldO1xuICAgICAgVHdlZW5MaXRlLnRvKGN1cnJlbnQuZWxlbWVudCwgMC43NSwge3k6IHksIGVhc2U6IEJvdW5jZS5lYXNlT3V0fSk7XG4gICAgICB5ICs9IDEwICsgY3VycmVudC5lbGVtZW50LmNsaWVudEhlaWdodDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvYXN0VmlldygpOyIsInZhciBUb29sVGlwVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2NoaWxkcmVuICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICA9IDAsXG4gICAgICBfZGVmYXVsdFdpZHRoID0gMjAwLFxuICAgICAgX3R5cGVzICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJyxcbiAgICAgICAgQ09BQ0hNQVJLICA6ICdjb2FjaG1hcmsnXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICd0b29sdGlwX19pbmZvcm1hdGlvbicsXG4gICAgICAgICdzdWNjZXNzJyAgICA6ICd0b29sdGlwX19zdWNjZXNzJyxcbiAgICAgICAgJ3dhcm5pbmcnICAgIDogJ3Rvb2x0aXBfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAndG9vbHRpcF9fZGFuZ2VyJyxcbiAgICAgICAgJ2NvYWNobWFyaycgIDogJ3Rvb2x0aXBfX2NvYWNobWFyaydcbiAgICAgIH0sXG4gICAgICBfcG9zaXRpb25zICAgID0ge1xuICAgICAgICBUIDogJ1QnLFxuICAgICAgICBUUjogJ1RSJyxcbiAgICAgICAgUiA6ICdSJyxcbiAgICAgICAgQlI6ICdCUicsXG4gICAgICAgIEIgOiAnQicsXG4gICAgICAgIEJMOiAnQkwnLFxuICAgICAgICBMIDogJ0wnLFxuICAgICAgICBUTDogJ1RMJ1xuICAgICAgfSxcbiAgICAgIF9wb3NpdGlvbk1hcCAgPSB7XG4gICAgICAgICdUJyA6ICd0b29sdGlwX190b3AnLFxuICAgICAgICAnVFInOiAndG9vbHRpcF9fdG9wcmlnaHQnLFxuICAgICAgICAnUicgOiAndG9vbHRpcF9fcmlnaHQnLFxuICAgICAgICAnQlInOiAndG9vbHRpcF9fYm90dG9tcmlnaHQnLFxuICAgICAgICAnQicgOiAndG9vbHRpcF9fYm90dG9tJyxcbiAgICAgICAgJ0JMJzogJ3Rvb2x0aXBfX2JvdHRvbWxlZnQnLFxuICAgICAgICAnTCcgOiAndG9vbHRpcF9fbGVmdCcsXG4gICAgICAgICdUTCc6ICd0b29sdGlwX190b3BsZWZ0J1xuICAgICAgfSxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX3RlbXBsYXRlICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8vb2JqLnRpdGxlLCBvYmouY29udGVudCwgb2JqLnR5cGUsIG9iai50YXJnZXQsIG9iai5wb3NpdGlvblxuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIGluaXRPYmoudHlwZSA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVDtcblxuICAgIHZhciB0b29sdGlwT2JqID0gY3JlYXRlVG9vbFRpcE9iamVjdChpbml0T2JqLnRpdGxlLFxuICAgICAgaW5pdE9iai5jb250ZW50LFxuICAgICAgaW5pdE9iai5wb3NpdGlvbixcbiAgICAgIGluaXRPYmoudGFyZ2V0RWwsXG4gICAgICBpbml0T2JqLmd1dHRlcixcbiAgICAgIGluaXRPYmouYWx3YXlzVmlzaWJsZSk7XG5cbiAgICBfY2hpbGRyZW4ucHVzaCh0b29sdGlwT2JqKTtcbiAgICBfbW91bnRQb2ludC5hcHBlbmRDaGlsZCh0b29sdGlwT2JqLmVsZW1lbnQpO1xuXG4gICAgdG9vbHRpcE9iai5hcnJvd0VsID0gdG9vbHRpcE9iai5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudChpbml0T2JqLnR5cGUsIGluaXRPYmoucG9zaXRpb24sIHRvb2x0aXBPYmouZWxlbWVudCk7XG5cbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouZWxlbWVudCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIGF1dG9BbHBoYTogdG9vbHRpcE9iai5hbHdheXNWaXNpYmxlID8gMSA6IDAsXG4gICAgICAgIHdpZHRoICAgIDogaW5pdE9iai53aWR0aCA/IGluaXRPYmoud2lkdGggOiBfZGVmYXVsdFdpZHRoXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBjYWNoZSB0aGVzZSB2YWx1ZXMsIDNkIHRyYW5zZm9ybXMgd2lsbCBhbHRlciBzaXplXG4gICAgdG9vbHRpcE9iai53aWR0aCAgPSB0b29sdGlwT2JqLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGg7XG4gICAgdG9vbHRpcE9iai5oZWlnaHQgPSB0b29sdGlwT2JqLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuXG4gICAgYXNzaWduRXZlbnRzVG9UYXJnZXRFbCh0b29sdGlwT2JqKTtcbiAgICBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaik7XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5MIHx8IHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuUikge1xuICAgICAgY2VudGVyQXJyb3dWZXJ0aWNhbGx5KHRvb2x0aXBPYmopO1xuICAgIH1cblxuICAgIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlQgfHwgdG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CKSB7XG4gICAgICBjZW50ZXJBcnJvd0hvcml6b250YWxseSh0b29sdGlwT2JqKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdG9vbHRpcE9iai5lbGVtZW50O1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIHBvc2l0aW9uLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3Bvc2l0aW9uTWFwW3Bvc2l0aW9uXSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVUb29sVGlwT2JqZWN0KHRpdGxlLCBtZXNzYWdlLCBwb3NpdGlvbiwgdGFyZ2V0LCBndXR0ZXIsIGFsd2F5c1Zpc2libGUpIHtcbiAgICB2YXIgaWQgID0gJ2pzX190b29sdGlwLXRvb2x0aXBpdGVtLScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGlkICAgICAgICAgICA6IGlkLFxuICAgICAgICAgIHBvc2l0aW9uICAgICA6IHBvc2l0aW9uLFxuICAgICAgICAgIHRhcmdldEVsICAgICA6IHRhcmdldCxcbiAgICAgICAgICBhbHdheXNWaXNpYmxlOiBhbHdheXNWaXNpYmxlIHx8IGZhbHNlLFxuICAgICAgICAgIGd1dHRlciAgICAgICA6IGd1dHRlciB8fCAxNSxcbiAgICAgICAgICBlbE92ZXJTdHJlYW0gOiBudWxsLFxuICAgICAgICAgIGVsT3V0U3RyZWFtICA6IG51bGwsXG4gICAgICAgICAgaGVpZ2h0ICAgICAgIDogMCxcbiAgICAgICAgICB3aWR0aCAgICAgICAgOiAwLFxuICAgICAgICAgIGVsZW1lbnQgICAgICA6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ3RlbXBsYXRlX19jb21wb25lbnQtLXRvb2x0aXAnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGFycm93RWwgICAgICA6IG51bGxcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopIHtcbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdG9vbHRpcE9iai5lbE92ZXJTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh0b29sdGlwT2JqLnRhcmdldEVsLCAnbW91c2VvdmVyJylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBzaG93VG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuXG4gICAgdG9vbHRpcE9iai5lbE91dFN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW91dCcpXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgaGlkZVRvb2xUaXAodG9vbHRpcE9iai5pZCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dUb29sVGlwKGlkKSB7XG4gICAgdmFyIHRvb2x0aXBPYmogPSBnZXRPYmpCeUlEKGlkKTtcblxuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaik7XG4gICAgdHJhbnNpdGlvbkluKHRvb2x0aXBPYmouZWxlbWVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaikge1xuICAgIHZhciBndXR0ZXIgICA9IHRvb2x0aXBPYmouZ3V0dGVyLFxuICAgICAgICB4UG9zICAgICA9IDAsXG4gICAgICAgIHlQb3MgICAgID0gMCxcbiAgICAgICAgdGd0UHJvcHMgPSB0b29sdGlwT2JqLnRhcmdldEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVEwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgKyAoKHRndFByb3BzLndpZHRoIC8gMikgLSAodG9vbHRpcE9iai53aWR0aCAvIDIpKTtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodCAtIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVFIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0ICsgZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkJSKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQ7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbSArIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aCAtIGd1dHRlcjtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgKyAoKHRndFByb3BzLmhlaWdodCAvIDIpIC0gKHRvb2x0aXBPYmouaGVpZ2h0IC8gMikpO1xuICAgIH1cblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICB4OiB4UG9zLFxuICAgICAgeTogeVBvc1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dIb3Jpem9udGFsbHkodG9vbHRpcE9iaikge1xuICAgIHZhciBhcnJvd1Byb3BzID0gdG9vbHRpcE9iai5hcnJvd0VsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5hcnJvd0VsLCB7eDogKHRvb2x0aXBPYmoud2lkdGggLyAyKSAtIChhcnJvd1Byb3BzLndpZHRoIC8gMil9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNlbnRlckFycm93VmVydGljYWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt5OiAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSAtIChhcnJvd1Byb3BzLmhlaWdodCAvIDIpIC0gMn0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZVRvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyYW5zaXRpb25PdXQodG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC41LCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4wNSwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShlbCkge1xuICAgIGdldE9iakJ5RWxlbWVudChlbCkuZm9yRWFjaChmdW5jdGlvbiAodG9vbHRpcCkge1xuICAgICAgaWYgKHRvb2x0aXAuZWxPdmVyU3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdmVyU3RyZWFtLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b29sdGlwLmVsT3V0U3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdXRTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuXG4gICAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQodG9vbHRpcC5pZCk7XG5cbiAgICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5RWxlbWVudChlbCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLnRhcmdldEVsID09PSBlbDtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQb3NpdGlvbnMoKSB7XG4gICAgcmV0dXJuIF9wb3NpdGlvbnM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlcyxcbiAgICBwb3NpdGlvbiAgOiBnZXRQb3NpdGlvbnNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sVGlwVmlldygpOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBUZXN0IGZvclxuICAgKiBPYmplY3Qge1wiXCI6IHVuZGVmaW5lZH1cbiAgICogT2JqZWN0IHt1bmRlZmluZWQ6IHVuZGVmaW5lZH1cbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzTnVsbDogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBpc251bGwgPSBmYWxzZTtcblxuICAgIGlmIChpcy5mYWxzZXkob2JqKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgIGlmIChwcm9wID09PSB1bmRlZmluZWQgfHwgb2JqW3Byb3BdID09PSB1bmRlZmluZWQpIGlzbnVsbCA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gaXNudWxsO1xuICB9LFxuXG4gIGR5bmFtaWNTb3J0OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIHJldHVybiBhW3Byb3BlcnR5XSA8IGJbcHJvcGVydHldID8gLTEgOiBhW3Byb3BlcnR5XSA+IGJbcHJvcGVydHldID8gMSA6IDA7XG4gICAgfTtcbiAgfSxcblxuICBzZWFyY2hPYmplY3RzOiBmdW5jdGlvbiAob2JqLCBrZXksIHZhbCkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSBpbiBvYmopIHtcbiAgICAgIGlmICh0eXBlb2Ygb2JqW2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgICBvYmplY3RzID0gb2JqZWN0cy5jb25jYXQoc2VhcmNoT2JqZWN0cyhvYmpbaV0sIGtleSwgdmFsKSk7XG4gICAgICB9IGVsc2UgaWYgKGkgPT09IGtleSAmJiBvYmpba2V5XSA9PT0gdmFsKSB7XG4gICAgICAgIG9iamVjdHMucHVzaChvYmopO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cztcbiAgfSxcblxuICBnZXRPYmplY3RGcm9tU3RyaW5nOiBmdW5jdGlvbiAob2JqLCBzdHIpIHtcbiAgICB2YXIgaSAgICA9IDAsXG4gICAgICAgIHBhdGggPSBzdHIuc3BsaXQoJy4nKSxcbiAgICAgICAgbGVuICA9IHBhdGgubGVuZ3RoO1xuXG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgb2JqID0gb2JqW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9LFxuXG4gIGdldE9iamVjdEluZGV4RnJvbUlkOiBmdW5jdGlvbiAob2JqLCBpZCkge1xuICAgIGlmICh0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodHlwZW9mIG9ialtpXSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2Ygb2JqW2ldLmlkICE9PSBcInVuZGVmaW5lZFwiICYmIG9ialtpXS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLy8gZXh0ZW5kIGFuZCBkZWVwIGV4dGVuZCBmcm9tIGh0dHA6Ly95b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tL1xuICBleHRlbmQ6IGZ1bmN0aW9uIChvdXQpIHtcbiAgICBvdXQgPSBvdXQgfHwge307XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFhcmd1bWVudHNbaV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50c1tpXS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgb3V0W2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG4gIH0sXG5cbiAgZGVlcEV4dGVuZDogZnVuY3Rpb24gKG91dCkge1xuICAgIG91dCA9IG91dCB8fCB7fTtcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgb2JqID0gYXJndW1lbnRzW2ldO1xuXG4gICAgICBpZiAoIW9iaikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIG9ialtrZXldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgZGVlcEV4dGVuZChvdXRba2V5XSwgb2JqW2tleV0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNpbXBsaWZpZWQgaW1wbGVtZW50YXRpb24gb2YgU3RhbXBzIC0gaHR0cDovL2VyaWNsZWFkcy5jb20vMjAxNC8wMi9wcm90b3R5cGFsLWluaGVyaXRhbmNlLXdpdGgtc3RhbXBzL1xuICAgKiBodHRwczovL3d3dy5iYXJrd2ViLmNvLnVrL2Jsb2cvb2JqZWN0LWNvbXBvc2l0aW9uLWFuZC1wcm90b3R5cGljYWwtaW5oZXJpdGFuY2UtaW4tamF2YXNjcmlwdFxuICAgKlxuICAgKiBQcm90b3R5cGUgb2JqZWN0IHJlcXVpcmVzIGEgbWV0aG9kcyBvYmplY3QsIHByaXZhdGUgY2xvc3VyZXMgYW5kIHN0YXRlIGlzIG9wdGlvbmFsXG4gICAqXG4gICAqIEBwYXJhbSBwcm90b3R5cGVcbiAgICogQHJldHVybnMgTmV3IG9iamVjdCB1c2luZyBwcm90b3R5cGUubWV0aG9kcyBhcyBzb3VyY2VcbiAgICovXG4gIGJhc2ljRmFjdG9yeTogZnVuY3Rpb24gKHByb3RvdHlwZSkge1xuICAgIHZhciBwcm90byA9IHByb3RvdHlwZSxcbiAgICAgICAgb2JqICAgPSBPYmplY3QuY3JlYXRlKHByb3RvLm1ldGhvZHMpO1xuXG4gICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdjbG9zdXJlJykpIHtcbiAgICAgIHByb3RvLmNsb3N1cmVzLmZvckVhY2goZnVuY3Rpb24gKGNsb3N1cmUpIHtcbiAgICAgICAgY2xvc3VyZS5jYWxsKG9iaik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkoJ3N0YXRlJykpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBwcm90by5zdGF0ZSkge1xuICAgICAgICBvYmpba2V5XSA9IHByb3RvLnN0YXRlW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICAvKipcbiAgICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICAgKlxuICAgKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICAgKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gICAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICAgKlxuICAgKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAgICpcbiAgICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICAgKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gICAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICAgKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gICAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICAgKlxuICAgKi9cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYW4gZW51bWVyYXRpb24gd2l0aCBrZXlzIGVxdWFsIHRvIHRoZWlyIHZhbHVlLlxuICAgKlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vU1RSTUwva2V5bWlycm9yXG4gICAqXG4gICAqIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiAgIHZhciBDT0xPUlMgPSBrZXlNaXJyb3Ioe2JsdWU6IG51bGwsIHJlZDogbnVsbH0pO1xuICAgKiAgIHZhciBteUNvbG9yID0gQ09MT1JTLmJsdWU7XG4gICAqICAgdmFyIGlzQ29sb3JWYWxpZCA9ICEhQ09MT1JTW215Q29sb3JdO1xuICAgKlxuICAgKiBUaGUgbGFzdCBsaW5lIGNvdWxkIG5vdCBiZSBwZXJmb3JtZWQgaWYgdGhlIHZhbHVlcyBvZiB0aGUgZ2VuZXJhdGVkIGVudW0gd2VyZVxuICAgKiBub3QgZXF1YWwgdG8gdGhlaXIga2V5cy5cbiAgICpcbiAgICogICBJbnB1dDogIHtrZXkxOiB2YWwxLCBrZXkyOiB2YWwyfVxuICAgKiAgIE91dHB1dDoge2tleTE6IGtleTEsIGtleTI6IGtleTJ9XG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKi9cbiAga2V5TWlycm9yOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIHZhciBrZXk7XG4gICAgaWYgKCEob2JqIGluc3RhbmNlb2YgT2JqZWN0ICYmICFBcnJheS5pc0FycmF5KG9iaikpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2tleU1pcnJvciguLi4pOiBBcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcbiAgICB9XG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcmV0W2tleV0gPSBrZXk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxufTsiXX0=
