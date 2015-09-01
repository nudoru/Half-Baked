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

},{"../../nori/action/ActionCreator":12,"../store/AppStore":2,"./AppView":3}],6:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appView = require('./AppView'),
    _appStore = require('../store/AppStore'),
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

  onJoinRoom: function onJoinRoom() {
    var roomID = document.querySelector('#select__roomid').value;
    console.log('Join room ' + roomID);
    if (this.validateRoomID(roomID)) {
      console.log('Room ID OK');
      _appView.notify('', 'Room ID ok!');
      _socketIO.notifyServer(_socketIO.events().JOIN_ROOM, { id: roomID });
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
    _socketIO.notifyServer(_socketIO.events().CREATE_ROOM, {});
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator":12,"../../nori/service/SocketIO.js":13,"../store/AppStore":2,"./AppView":3}],7:[function(require,module,exports){
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

var NMap = function NMap() {
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

module.exports = NMap;

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

},{}]},{},[9])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvc3RvcmUvQXBwU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvQXBwVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uR2FtZU92ZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLk1haW5HYW1lLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5QbGF5ZXJTZWxlY3QuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLlRpdGxlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5XYWl0aW5nT25QbGF5ZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbWFpbi5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL05vcmkuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvTWFwLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvTWFwQ29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3N0b3JlL01peGluTWFwRmFjdG9yeS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3N0b3JlL01peGluUmVkdWNlclN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvU2ltcGxlU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1JlbmRlcmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUm91dGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUnguanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRXZlbnREZWxlZ2F0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluTnVkb3J1Q29udHJvbHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9WaWV3Q29tcG9uZW50LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveENyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvVG9hc3RWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Ozs7Ozs7QUFPekMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDOztBQUUvQixRQUFNLEVBQUUsRUFBRTs7Ozs7QUFLVixPQUFLLEVBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDO0FBQ3RDLE1BQUksRUFBSSxPQUFPLENBQUMsbUJBQW1CLENBQUM7QUFDcEMsUUFBTSxFQUFFLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQzs7Ozs7QUFLOUMsWUFBVSxFQUFFLHNCQUFZO0FBQ3RCLFFBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7O0FBRXpCLFFBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7O0FBRXZCLFFBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDeEIsUUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzdFLFFBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7R0FDeEI7Ozs7O0FBS0Qsb0JBQWtCLEVBQUUsOEJBQVk7QUFDOUIsUUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0dBQ3ZCOzs7OztBQUtELGdCQUFjLEVBQUUsMEJB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LFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQy9DLFVBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxJQUFJLEFBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUssVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDO0FBQ3ZFLFVBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0tBQ2xELE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxFQUFFLEVBQUU7QUFDaEQsVUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFDdEIsVUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztLQUN6QyxNQUFNLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQy9DLFVBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztBQUMvQixVQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsSUFBSSxBQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFLLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQztLQUN6RSxNQUFNLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsRUFBRSxFQUFFO0FBQ2hELFVBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO0FBQ3RCLFVBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO0tBQ3hCLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLElBQUksQUFBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBSyxVQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUM7QUFDdkUsVUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcs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dCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF9yeCA9IHJlcXVpcmUoJy4uL25vcmkvdXRpbHMvUnguanMnKTtcblxuLyoqXG4gKiBcIkNvbnRyb2xsZXJcIiBmb3IgYSBOb3JpIGFwcGxpY2F0aW9uLiBUaGUgY29udHJvbGxlciBpcyByZXNwb25zaWJsZSBmb3JcbiAqIGJvb3RzdHJhcHBpbmcgdGhlIGFwcCBhbmQgcG9zc2libHkgaGFuZGxpbmcgc29ja2V0L3NlcnZlciBpbnRlcmFjdGlvbi5cbiAqIEFueSBhZGRpdGlvbmFsIGZ1bmN0aW9uYWxpdHkgc2hvdWxkIGJlIGhhbmRsZWQgaW4gYSBzcGVjaWZpYyBtb2R1bGUuXG4gKi9cbnZhciBBcHAgPSBOb3JpLmNyZWF0ZUFwcGxpY2F0aW9uKHtcblxuICBtaXhpbnM6IFtdLFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGhlIG1haW4gTm9yaSBBcHAgc3RvcmUgYW5kIHZpZXcuXG4gICAqL1xuICBzdG9yZSA6IHJlcXVpcmUoJy4vc3RvcmUvQXBwU3RvcmUuanMnKSxcbiAgdmlldyAgOiByZXF1aXJlKCcuL3ZpZXcvQXBwVmlldy5qcycpLFxuICBzb2NrZXQ6IHJlcXVpcmUoJy4uL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcycpLFxuXG4gIC8qKlxuICAgKiBJbnRpYWxpemUgdGhlIGFwcGlsY2F0aW9uLCB2aWV3IGFuZCBzdG9yZVxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc29ja2V0LmluaXRpYWxpemUoKTtcblxuICAgIHRoaXMudmlldy5pbml0aWFsaXplKCk7XG5cbiAgICB0aGlzLnN0b3JlLmluaXRpYWxpemUoKTsgLy8gc3RvcmUgd2lsbCBhY3F1aXJlIGRhdGEgZGlzcGF0Y2ggZXZlbnQgd2hlbiBjb21wbGV0ZVxuICAgIHRoaXMuc3RvcmUuc3Vic2NyaWJlKCdzdG9yZUluaXRpYWxpemVkJywgdGhpcy5vblN0b3JlSW5pdGlhbGl6ZWQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5zdG9yZS5sb2FkU3RvcmUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQWZ0ZXIgdGhlIHN0b3JlIGRhdGEgaXMgcmVhZHlcbiAgICovXG4gIG9uU3RvcmVJbml0aWFsaXplZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucnVuQXBwbGljYXRpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBcIlBsZWFzZSB3YWl0XCIgY292ZXIgYW5kIHN0YXJ0IHRoZSBhcHBcbiAgICovXG4gIHJ1bkFwcGxpY2F0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy52aWV3LnJlbW92ZUxvYWRpbmdNZXNzYWdlKCk7XG4gICAgdGhpcy52aWV3LnJlbmRlcigpO1xuXG4gICAgLy8gVmlldyB3aWxsIHNob3cgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3RvcmUgc3RhdGVcbiAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHtjdXJyZW50U3RhdGU6ICdQTEFZRVJfU0VMRUNUJ30pO1xuXG4gICAgLy8gVGVzdCBwaW5nXG4gICAgLy9fcnguZG9FdmVyeSgxMDAwLCAzLCAoKSA9PiB0aGlzLnNvY2tldC5waW5nKCkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbGwgbWVzc2FnZXMgZnJvbSB0aGUgU29ja2V0LklPIHNlcnZlciB3aWxsIGJlIGZvcndhcmRlZCBoZXJlXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBoYW5kbGVTb2NrZXRNZXNzYWdlOiBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIGlmICghcGF5bG9hZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiZnJvbSBTb2NrZXQuSU8gc2VydmVyXCIsIHBheWxvYWQpO1xuXG4gICAgc3dpdGNoIChwYXlsb2FkLnR5cGUpIHtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLkNPTk5FQ1QpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3RlZCFcIik7XG4gICAgICAgIHRoaXMuc3RvcmUuc2V0U3RhdGUoe3NvY2tldElPSUQ6IHBheWxvYWQuaWR9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuVVNFUl9DT05ORUNURUQpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIkFub3RoZXIgY2xpZW50IGNvbm5lY3RlZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuVVNFUl9ESVNDT05ORUNURUQpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIkFub3RoZXIgY2xpZW50IGRpc2Nvbm5lY3RlZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuRFJPUFBFRCk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiWW91IHdlcmUgZHJvcHBlZCFcIiwgcGF5bG9hZC5wYXlsb2FkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuU1lTVEVNX01FU1NBR0UpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIlN5c3RlbSBtZXNzYWdlXCIsIHBheWxvYWQucGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLkNSRUFURV9ST09NKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJjcmVhdGUgcm9vbVwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAodGhpcy5zb2NrZXQuZXZlbnRzKCkuSk9JTl9ST09NKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJqb2luIHJvb21cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKHRoaXMuc29ja2V0LmV2ZW50cygpLkxFQVZFX1JPT00pOlxuICAgICAgICBjb25zb2xlLmxvZyhcImxlYXZlIHJvb21cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnNvbGUud2FybihcIlVuaGFuZGxlZCBTb2NrZXRJTyBtZXNzYWdlIHR5cGVcIiwgcGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwOyIsInZhciBfbm9yaUFjdGlvbkNvbnN0YW50cyAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcycpLFxuICAgIF9taXhpbk1hcEZhY3RvcnkgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zdG9yZS9NaXhpbk1hcEZhY3RvcnkuanMnKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcycpLFxuICAgIF9taXhpblJlZHVjZXJTdG9yZSAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZS5qcycpO1xuXG4vKipcbiAqIFRoaXMgYXBwbGljYXRpb24gc3RvcmUgY29udGFpbnMgXCJyZWR1Y2VyIHN0b3JlXCIgZnVuY3Rpb25hbGl0eSBiYXNlZCBvbiBSZWR1eC5cbiAqIFRoZSBzdG9yZSBzdGF0ZSBtYXkgb25seSBiZSBjaGFuZ2VkIGZyb20gZXZlbnRzIGFzIGFwcGxpZWQgaW4gcmVkdWNlciBmdW5jdGlvbnMuXG4gKiBUaGUgc3RvcmUgcmVjZWl2ZWQgYWxsIGV2ZW50cyBmcm9tIHRoZSBldmVudCBidXMgYW5kIGZvcndhcmRzIHRoZW0gdG8gYWxsXG4gKiByZWR1Y2VyIGZ1bmN0aW9ucyB0byBtb2RpZnkgc3RhdGUgYXMgbmVlZGVkLiBPbmNlIHRoZXkgaGF2ZSBydW4sIHRoZVxuICogaGFuZGxlU3RhdGVNdXRhdGlvbiBmdW5jdGlvbiBpcyBjYWxsZWQgdG8gZGlzcGF0Y2ggYW4gZXZlbnQgdG8gdGhlIGJ1cywgb3JcbiAqIG5vdGlmeSBzdWJzY3JpYmVycyB2aWEgYW4gb2JzZXJ2YWJsZS5cbiAqXG4gKiBFdmVudHMgPT4gaGFuZGxlQXBwbGljYXRpb25FdmVudHMgPT4gYXBwbHlSZWR1Y2VycyA9PiBoYW5kbGVTdGF0ZU11dGF0aW9uID0+IE5vdGlmeVxuICovXG52YXIgQXBwU3RvcmUgPSBOb3JpLmNyZWF0ZVN0b3JlKHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5NYXBGYWN0b3J5LFxuICAgIF9taXhpblJlZHVjZXJTdG9yZSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCgpXG4gIF0sXG5cbiAgZ2FtZVN0YXRlczogWydUSVRMRScsICdQTEFZRVJfU0VMRUNUJywgJ1dBSVRJTkdfT05fUExBWUVSJywgJ01BSU5fR0FNRScsICdHQU1FX09WRVInXSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hZGRSZWR1Y2VyKHRoaXMuZGVmYXVsdFJlZHVjZXJGdW5jdGlvbik7XG4gICAgdGhpcy5pbml0aWFsaXplUmVkdWNlclN0b3JlKCk7XG4gICAgdGhpcy5zZXRTdGF0ZShOb3JpLmNvbmZpZygpKTtcbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3N0b3JlSW5pdGlhbGl6ZWQnKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IG9yIGxvYWQgYW55IG5lY2Vzc2FyeSBkYXRhIGFuZCB0aGVuIGJyb2FkY2FzdCBhIGluaXRpYWxpemVkIGV2ZW50LlxuICAgKi9cbiAgbG9hZFN0b3JlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBjdXJyZW50U3RhdGU6IHRoaXMuZ2FtZVN0YXRlc1swXSxcbiAgICAgIGxvY2FsUGxheWVyIDoge30sXG4gICAgICByZW1vdGVQbGF5ZXI6IHt9LFxuICAgICAgcXVlc3Rpb25CYW5rOiBbXVxuICAgIH0pO1xuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdzdG9yZUluaXRpYWxpemVkJyk7XG4gIH0sXG5cbiAgY3JlYXRlVXNlck9iamVjdDogZnVuY3Rpb24gKGlkLCB0eXBlLCBuYW1lLCBhcHBlYXJhbmNlLCBiZWhhdmlvcnMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQgICAgICAgIDogaWQsXG4gICAgICB0eXBlICAgICAgOiB0eXBlLFxuICAgICAgbmFtZSAgICAgIDogbmFtZSxcbiAgICAgIGhlYWx0aCAgICA6IGhlYWx0aCB8fCA2LFxuICAgICAgYXBwZWFyYW5jZTogYXBwZWFyYW5jZSxcbiAgICAgIGJlaGF2aW9ycyA6IGJlaGF2aW9ycyB8fCBbXVxuICAgIH07XG4gIH0sXG5cbiAgY3JlYXRlUXVlc3Rpb25PYmplY3Q6IGZ1bmN0aW9uIChwcm9tcHQsIGRpc3RyYWN0b3JzLCBwb2ludFZhbHVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHByb21wdCAgICAgOiBwcm9tcHQsXG4gICAgICBkaXN0cmFjdG9yczogZGlzdHJhY3RvcnMsXG4gICAgICBwb2ludFZhbHVlIDogcG9pbnRWYWx1ZVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIE1vZGlmeSBzdGF0ZSBiYXNlZCBvbiBpbmNvbWluZyBldmVudHMuIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtb2RpZmllZFxuICAgKiBzdGF0ZSBhbmQgZG9lcyBub3QgbW9kaWZ5IHRoZSBzdGF0ZSBkaXJlY3RseS5cbiAgICogQ2FuIGNvbXBvc2Ugc3RhdGUgdHJhbnNmb3JtYXRpb25zXG4gICAqIHJldHVybiBfLmFzc2lnbih7fSwgc3RhdGUsIG90aGVyU3RhdGVUcmFuc2Zvcm1lcihzdGF0ZSkpO1xuICAgKiBAcGFyYW0gc3RhdGVcbiAgICogQHBhcmFtIGV2ZW50XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZGVmYXVsdFJlZHVjZXJGdW5jdGlvbjogZnVuY3Rpb24gKHN0YXRlLCBldmVudCkge1xuICAgIHN0YXRlID0gc3RhdGUgfHwge307XG5cbiAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblxuICAgICAgY2FzZSBfbm9yaUFjdGlvbkNvbnN0YW50cy5DSEFOR0VfU1RPUkVfU1RBVEU6XG4gICAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgc3RhdGUsIGV2ZW50LnBheWxvYWQuZGF0YSk7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIENhbGxlZCBhZnRlciBhbGwgcmVkdWNlcnMgaGF2ZSBydW4gdG8gYnJvYWRjYXN0IHBvc3NpYmxlIHVwZGF0ZXMuIERvZXNcbiAgICogbm90IGNoZWNrIHRvIHNlZSBpZiB0aGUgc3RhdGUgd2FzIGFjdHVhbGx5IHVwZGF0ZWQuXG4gICAqL1xuICBoYW5kbGVTdGF0ZU11dGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVycyh0aGlzLmdldFN0YXRlKCkpO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFN0b3JlKCk7IiwidmFyIF9hcHBTdG9yZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUuanMnKSxcbiAgICBfbWl4aW5BcHBsaWNhdGlvblZpZXcgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMnKSxcbiAgICBfbWl4aW5OdWRvcnVDb250cm9scyAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpbk51ZG9ydUNvbnRyb2xzLmpzJyksXG4gICAgX21peGluQ29tcG9uZW50Vmlld3MgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5Db21wb25lbnRWaWV3cy5qcycpLFxuICAgIF9taXhpblN0b3JlU3RhdGVWaWV3cyAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5TdG9yZVN0YXRlVmlld3MuanMnKSxcbiAgICBfbWl4aW5FdmVudERlbGVnYXRvciAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzJyksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKTtcblxuLyoqXG4gKiBWaWV3IGZvciBhbiBhcHBsaWNhdGlvbi5cbiAqL1xuXG52YXIgQXBwVmlldyA9IE5vcmkuY3JlYXRlVmlldyh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluQXBwbGljYXRpb25WaWV3LFxuICAgIF9taXhpbk51ZG9ydUNvbnRyb2xzLFxuICAgIF9taXhpbkNvbXBvbmVudFZpZXdzLFxuICAgIF9taXhpblN0b3JlU3RhdGVWaWV3cyxcbiAgICBfbWl4aW5FdmVudERlbGVnYXRvcigpLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0KClcbiAgXSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbml0aWFsaXplQXBwbGljYXRpb25WaWV3KFsnYXBwbGljYXRpb25zY2FmZm9sZCcsICdhcHBsaWNhdGlvbmNvbXBvbmVudHNzY2FmZm9sZCddKTtcbiAgICB0aGlzLmluaXRpYWxpemVTdGF0ZVZpZXdzKF9hcHBTdG9yZSk7XG4gICAgdGhpcy5pbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKTtcblxuICAgIHRoaXMuY29uZmlndXJlVmlld3MoKTtcbiAgfSxcblxuICBjb25maWd1cmVWaWV3czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzY3JlZW5UaXRsZSAgICAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5UaXRsZS5qcycpKCksXG4gICAgICAgIHNjcmVlblBsYXllclNlbGVjdCAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLlBsYXllclNlbGVjdC5qcycpKCksXG4gICAgICAgIHNjcmVlbldhaXRpbmdPblBsYXllciA9IHJlcXVpcmUoJy4vU2NyZWVuLldhaXRpbmdPblBsYXllci5qcycpKCksXG4gICAgICAgIHNjcmVlbk1haW5HYW1lICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLk1haW5HYW1lLmpzJykoKSxcbiAgICAgICAgc2NyZWVuR2FtZU92ZXIgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uR2FtZU92ZXIuanMnKSgpLFxuICAgICAgICBnYW1lU3RhdGVzICAgICAgICAgICAgPSBfYXBwU3RvcmUuZ2FtZVN0YXRlcztcblxuICAgIHRoaXMuc2V0Vmlld01vdW50UG9pbnQoJyNjb250ZW50cycpO1xuXG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzBdLCAndGl0bGUnLCBzY3JlZW5UaXRsZSk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzFdLCAncGxheWVyc2VsZWN0Jywgc2NyZWVuUGxheWVyU2VsZWN0KTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbMl0sICd3YWl0aW5nb25wbGF5ZXInLCBzY3JlZW5XYWl0aW5nT25QbGF5ZXIpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1szXSwgJ2dhbWUnLCBzY3JlZW5NYWluR2FtZSk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzRdLCAnZ2FtZW92ZXInLCBzY3JlZW5HYW1lT3Zlcik7XG5cbiAgfSxcblxuICAvKipcbiAgICogRHJhdyBhbmQgVUkgdG8gdGhlIERPTSBhbmQgc2V0IGV2ZW50c1xuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwVmlldygpOyIsInZhciBfbm9yaUFjdGlvbnMgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJyksXG4gICAgX2FwcFZpZXcgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3JyksXG4gICAgX2FwcFN0b3JlICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI2dhbWVvdmVyX19idXR0b24tcmVwbGF5JzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICNnYW1lX19idXR0b24tc2tpcCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzRdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG5cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF9zb2NrZXRJTyAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tam9pbnJvb20nICA6IHRoaXMub25Kb2luUm9vbS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1jcmVhdGVyb29tJzogdGhpcy5vbkNyZWF0ZVJvb20uYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tZ28nICAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzJdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG5cbiAgfSxcblxuICBvbkpvaW5Sb29tOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJvb21JRCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3Jvb21pZCcpLnZhbHVlO1xuICAgIGNvbnNvbGUubG9nKCdKb2luIHJvb20gJyArIHJvb21JRCk7XG4gICAgaWYgKHRoaXMudmFsaWRhdGVSb29tSUQocm9vbUlEKSkge1xuICAgICAgY29uc29sZS5sb2coJ1Jvb20gSUQgT0snKTtcbiAgICAgIF9hcHBWaWV3Lm5vdGlmeSgnJywgJ1Jvb20gSUQgb2shJyk7XG4gICAgICBfc29ja2V0SU8ubm90aWZ5U2VydmVyKF9zb2NrZXRJTy5ldmVudHMoKS5KT0lOX1JPT00sIHtpZDogcm9vbUlEfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9hcHBWaWV3LmFsZXJ0KCdCYWQgUm9vbSBJRCcsICdUaGUgcm9vbSBJRCBpcyBub3QgY29ycmVjdC4gTXVzdCBiZSBhIDUgZGlnaXQgbnVtYmVyLicpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogUm9vbSBJRCBtdXN0IGJlIGFuIGludGVnZXIgYW5kIDUgZGlnaXRzXG4gICAqIEBwYXJhbSByb29tSURcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICB2YWxpZGF0ZVJvb21JRDogZnVuY3Rpb24gKHJvb21JRCkge1xuICAgIGlmIChpc05hTihwYXJzZUludChyb29tSUQpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAocm9vbUlELmxlbmd0aCAhPT0gNSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBvbkNyZWF0ZVJvb206IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmxvZygnY3JlYXRlIHJvb20nKTtcbiAgICBfc29ja2V0SU8ubm90aWZ5U2VydmVyKF9zb2NrZXRJTy5ldmVudHMoKS5DUkVBVEVfUk9PTSwge30pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICN0aXRsZV9fYnV0dG9uLXN0YXJ0JzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICN3YWl0aW5nX19idXR0b24tc2tpcCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzNdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwiLyoqXG4gKiBJbml0aWFsIGZpbGUgZm9yIHRoZSBBcHBsaWNhdGlvblxuICovXG5cbihmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9icm93c2VySW5mbyA9IHJlcXVpcmUoJy4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKTtcblxuICAvKipcbiAgICogSUUgdmVyc2lvbnMgOSBhbmQgdW5kZXIgYXJlIGJsb2NrZWQsIG90aGVycyBhcmUgYWxsb3dlZCB0byBwcm9jZWVkXG4gICAqL1xuICBpZihfYnJvd3NlckluZm8ubm90U3VwcG9ydGVkIHx8IF9icm93c2VySW5mby5pc0lFOSkge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKS5pbm5lckhUTUwgPSAnPGgzPkZvciB0aGUgYmVzdCBleHBlcmllbmNlLCBwbGVhc2UgdXNlIEludGVybmV0IEV4cGxvcmVyIDEwKywgRmlyZWZveCwgQ2hyb21lIG9yIFNhZmFyaSB0byB2aWV3IHRoaXMgYXBwbGljYXRpb24uPC9oMz4nO1xuICB9IGVsc2Uge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHRoZSBhcHBsaWNhdGlvbiBtb2R1bGUgYW5kIGluaXRpYWxpemVcbiAgICAgKi9cbiAgICB3aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICB3aW5kb3cuTm9yaSA9IHJlcXVpcmUoJy4vbm9yaS9Ob3JpLmpzJyk7XG4gICAgICB3aW5kb3cuQVBQID0gcmVxdWlyZSgnLi9hcHAvQXBwLmpzJyk7XG4gICAgICBBUFAuaW5pdGlhbGl6ZSgpO1xuICAgIH07XG5cbiAgfVxuXG59KCkpOyIsInZhciBOb3JpID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vdXRpbHMvRGlzcGF0Y2hlci5qcycpLFxuICAgICAgX3JvdXRlciAgICAgPSByZXF1aXJlKCcuL3V0aWxzL1JvdXRlci5qcycpO1xuXG4gIC8vIFN3aXRjaCBMb2Rhc2ggdG8gdXNlIE11c3RhY2hlIHN0eWxlIHRlbXBsYXRlc1xuICBfLnRlbXBsYXRlU2V0dGluZ3MuaW50ZXJwb2xhdGUgPSAve3soW1xcc1xcU10rPyl9fS9nO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGdldERpc3BhdGNoZXIoKSB7XG4gICAgcmV0dXJuIF9kaXNwYXRjaGVyO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Um91dGVyKCkge1xuICAgIHJldHVybiBfcm91dGVyO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgKHdpbmRvdy5BUFBfQ09ORklHX0RBVEEgfHwge30pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRSb3V0ZSgpIHtcbiAgICByZXR1cm4gX3JvdXRlci5nZXRDdXJyZW50Um91dGUoKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgRmFjdG9yaWVzIC0gY29uY2F0ZW5hdGl2ZSBpbmhlcml0YW5jZSwgZGVjb3JhdG9yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogTWVyZ2VzIGEgY29sbGVjdGlvbiBvZiBvYmplY3RzXG4gICAqIEBwYXJhbSB0YXJnZXRcbiAgICogQHBhcmFtIHNvdXJjZUFycmF5XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYXNzaWduQXJyYXkodGFyZ2V0LCBzb3VyY2VBcnJheSkge1xuICAgIHNvdXJjZUFycmF5LmZvckVhY2goZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgICAgdGFyZ2V0ID0gXy5hc3NpZ24odGFyZ2V0LCBzb3VyY2UpO1xuICAgIH0pO1xuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IE5vcmkgYXBwbGljYXRpb24gaW5zdGFuY2VcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUFwcGxpY2F0aW9uKGN1c3RvbSkge1xuICAgIGN1c3RvbS5taXhpbnMucHVzaCh0aGlzKTtcbiAgICByZXR1cm4gYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBtYWluIGFwcGxpY2F0aW9uIHN0b3JlXG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdG9yZShjdXN0b20pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gY3MoKSB7XG4gICAgICByZXR1cm4gXy5hc3NpZ24oe30sIGJ1aWxkRnJvbU1peGlucyhjdXN0b20pKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgbWFpbiBhcHBsaWNhdGlvbiB2aWV3XG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVWaWV3KGN1c3RvbSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBjdigpIHtcbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSkpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTWl4ZXMgaW4gdGhlIG1vZHVsZXMgc3BlY2lmaWVkIGluIHRoZSBjdXN0b20gYXBwbGljYXRpb24gb2JqZWN0XG4gICAqIEBwYXJhbSBzb3VyY2VPYmplY3RcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBidWlsZEZyb21NaXhpbnMoc291cmNlT2JqZWN0KSB7XG4gICAgdmFyIG1peGlucztcblxuICAgIGlmIChzb3VyY2VPYmplY3QubWl4aW5zKSB7XG4gICAgICBtaXhpbnMgPSBzb3VyY2VPYmplY3QubWl4aW5zO1xuICAgIH1cblxuICAgIG1peGlucy5wdXNoKHNvdXJjZU9iamVjdCk7XG4gICAgcmV0dXJuIGFzc2lnbkFycmF5KHt9LCBtaXhpbnMpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEZ1bmN0aW9uYWwgdXRpbHMgZnJvbSBNaXRocmlsXG4gIC8vICBodHRwczovL2dpdGh1Yi5jb20vbGhvcmllL21pdGhyaWwuanMvYmxvYi9uZXh0L21pdGhyaWwuanNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gaHR0cDovL21pdGhyaWwuanMub3JnL21pdGhyaWwucHJvcC5odG1sXG4gIGZ1bmN0aW9uIHByb3Aoc3RvcmUpIHtcbiAgICAvL2lmIChpc0Z1bmN0aW9uKHN0b3JlLnRoZW4pKSB7XG4gICAgLy8gIC8vIGhhbmRsZSBhIHByb21pc2VcbiAgICAvL31cbiAgICB2YXIgZ2V0dGVyc2V0dGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgc3RvcmUgPSBhcmd1bWVudHNbMF07XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RvcmU7XG4gICAgfTtcblxuICAgIGdldHRlcnNldHRlci50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gc3RvcmU7XG4gICAgfTtcblxuICAgIHJldHVybiBnZXR0ZXJzZXR0ZXI7XG4gIH1cblxuICAvLyBodHRwOi8vbWl0aHJpbC5qcy5vcmcvbWl0aHJpbC53aXRoQXR0ci5odG1sXG4gIGZ1bmN0aW9uIHdpdGhBdHRyKHByb3AsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChlKSB7XG4gICAgICBlID0gZSB8fCBldmVudDtcblxuICAgICAgdmFyIGN1cnJlbnRUYXJnZXQgPSBlLmN1cnJlbnRUYXJnZXQgfHwgdGhpcyxcbiAgICAgICAgICBjbnR4ICAgICAgICAgID0gY29udGV4dCB8fCB0aGlzO1xuXG4gICAgICBjYWxsYmFjay5jYWxsKGNudHgsIHByb3AgaW4gY3VycmVudFRhcmdldCA/IGN1cnJlbnRUYXJnZXRbcHJvcF0gOiBjdXJyZW50VGFyZ2V0LmdldEF0dHJpYnV0ZShwcm9wKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgY29uZmlnICAgICAgICAgICA6IGdldENvbmZpZyxcbiAgICBkaXNwYXRjaGVyICAgICAgIDogZ2V0RGlzcGF0Y2hlcixcbiAgICByb3V0ZXIgICAgICAgICAgIDogZ2V0Um91dGVyLFxuICAgIGNyZWF0ZUFwcGxpY2F0aW9uOiBjcmVhdGVBcHBsaWNhdGlvbixcbiAgICBjcmVhdGVTdG9yZSAgICAgIDogY3JlYXRlU3RvcmUsXG4gICAgY3JlYXRlVmlldyAgICAgICA6IGNyZWF0ZVZpZXcsXG4gICAgYnVpbGRGcm9tTWl4aW5zICA6IGJ1aWxkRnJvbU1peGlucyxcbiAgICBnZXRDdXJyZW50Um91dGUgIDogZ2V0Q3VycmVudFJvdXRlLFxuICAgIGFzc2lnbkFycmF5ICAgICAgOiBhc3NpZ25BcnJheSxcbiAgICBwcm9wICAgICAgICAgICAgIDogcHJvcCxcbiAgICB3aXRoQXR0ciAgICAgICAgIDogd2l0aEF0dHJcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3JpKCk7XG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIENIQU5HRV9TVE9SRV9TVEFURTogJ0NIQU5HRV9TVE9SRV9TVEFURSdcbn07IiwiLyoqXG4gKiBBY3Rpb24gQ3JlYXRvclxuICogQmFzZWQgb24gRmx1eCBBY3Rpb25zXG4gKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhbmQgZ3VpZGVsaW5lczogaHR0cHM6Ly9naXRodWIuY29tL2FjZGxpdGUvZmx1eC1zdGFuZGFyZC1hY3Rpb25cbiAqL1xudmFyIF9ub3JpQWN0aW9uQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9BY3Rpb25Db25zdGFudHMuanMnKTtcblxudmFyIE5vcmlBY3Rpb25DcmVhdG9yID0ge1xuXG4gIGNoYW5nZVN0b3JlU3RhdGU6IGZ1bmN0aW9uIChkYXRhLCBpZCkge1xuICAgIHZhciBhY3Rpb24gPSB7XG4gICAgICB0eXBlICAgOiBfbm9yaUFjdGlvbkNvbnN0YW50cy5DSEFOR0VfU1RPUkVfU1RBVEUsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIGlkICA6IGlkLFxuICAgICAgICBkYXRhOiBkYXRhXG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBhY3Rpb247XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3JpQWN0aW9uQ3JlYXRvcjsiLCJ2YXIgU29ja2V0SU9Db25uZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICA9IG5ldyBSeC5CZWhhdmlvclN1YmplY3QoKSxcbiAgICAgIF9zb2NrZXRJTyA9IGlvKCksXG4gICAgICBfZXZlbnRzICAgPSB7XG4gICAgICAgIFBJTkcgICAgICAgICAgICAgOiAncGluZycsXG4gICAgICAgIFBPTkcgICAgICAgICAgICAgOiAncG9uZycsXG4gICAgICAgIE5PVElGWV9DTElFTlQgICAgOiAnbm90aWZ5X2NsaWVudCcsXG4gICAgICAgIE5PVElGWV9TRVJWRVIgICAgOiAnbm90aWZ5X3NlcnZlcicsXG4gICAgICAgIENPTk5FQ1QgICAgICAgICAgOiAnY29ubmVjdCcsXG4gICAgICAgIERST1BQRUQgICAgICAgICAgOiAnZHJvcHBlZCcsXG4gICAgICAgIFVTRVJfQ09OTkVDVEVEICAgOiAndXNlcl9jb25uZWN0ZWQnLFxuICAgICAgICBVU0VSX0RJU0NPTk5FQ1RFRDogJ3VzZXJfZGlzY29ubmVjdGVkJyxcbiAgICAgICAgRU1JVCAgICAgICAgICAgICA6ICdlbWl0JyxcbiAgICAgICAgQlJPQURDQVNUICAgICAgICA6ICdicm9hZGNhc3QnLFxuICAgICAgICBTWVNURU1fTUVTU0FHRSAgIDogJ3N5c3RlbV9tZXNzYWdlJyxcbiAgICAgICAgTUVTU0FHRSAgICAgICAgICA6ICdtZXNzYWdlJyxcbiAgICAgICAgQ1JFQVRFX1JPT00gICAgICA6ICdjcmVhdGVfcm9vbScsXG4gICAgICAgIEpPSU5fUk9PTSAgICAgICAgOiAnam9pbl9yb29tJyxcbiAgICAgICAgTEVBVkVfUk9PTSAgICAgICA6ICdsZWF2ZV9yb29tJ1xuICAgICAgfTtcblxuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG4gICAgX3NvY2tldElPLm9uKF9ldmVudHMuTk9USUZZX0NMSUVOVCwgb25Ob3RpZnlDbGllbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbCBub3RpZmljYXRpb25zIGZyb20gU29ja2V0LmlvIGNvbWUgaGVyZVxuICAgKiBAcGFyYW0gcGF5bG9hZCB7dHlwZSwgaWQsIHRpbWUsIHBheWxvYWR9XG4gICAqL1xuICBmdW5jdGlvbiBvbk5vdGlmeUNsaWVudChwYXlsb2FkKSB7XG4gICAgaWYgKHBheWxvYWQudHlwZSA9PT0gX2V2ZW50cy5QSU5HKSB7XG4gICAgICBub3RpZnlTZXJ2ZXIoX2V2ZW50cy5QT05HLCB7fSk7XG4gICAgfSBlbHNlIGlmIChwYXlsb2FkLnR5cGUgPT09IF9ldmVudHMuUE9ORykge1xuICAgICAgY29uc29sZS5sb2coJ1NPQ0tFVC5JTyBQT05HIScpO1xuICAgIH1cbiAgICBub3RpZnlTdWJzY3JpYmVycyhwYXlsb2FkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBpbmcoKSB7XG4gICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUElORywge30pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbCBjb21tdW5pY2F0aW9ucyB0byB0aGUgc2VydmVyIHNob3VsZCBnbyB0aHJvdWdoIGhlcmVcbiAgICogQHBhcmFtIHR5cGVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVNlcnZlcih0eXBlLCBwYXlsb2FkKSB7XG4gICAgX3NvY2tldElPLmVtaXQoX2V2ZW50cy5OT1RJRllfU0VSVkVSLCB7XG4gICAgICB0eXBlICAgOiB0eXBlLFxuICAgICAgcGF5bG9hZDogcGF5bG9hZFxuICAgIH0pO1xuICB9XG5cbiAgLy9mdW5jdGlvbiBlbWl0KG1lc3NhZ2UsIHBheWxvYWQpIHtcbiAgLy8gIG1lc3NhZ2UgPSBtZXNzYWdlIHx8IF9ldmVudHMuTUVTU0FHRTtcbiAgLy8gIHBheWxvYWQgPSBwYXlsb2FkIHx8IHt9O1xuICAvLyAgX3NvY2tldElPLmVtaXQobWVzc2FnZSwgcGF5bG9hZCk7XG4gIC8vfVxuICAvL1xuICAvL2Z1bmN0aW9uIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gIC8vICBfc29ja2V0SU8ub24oZXZlbnQsIGhhbmRsZXIpO1xuICAvL31cblxuICAvKipcbiAgICogU3Vic2NyaWJlIGhhbmRsZXIgdG8gdXBkYXRlc1xuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgZnJvbSB1cGRhdGUgb3Igd2hhdGV2ZXIgZnVuY3Rpb24gdG8gZGlzcGF0Y2ggdG8gc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICBfc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgbGFzdCBwYXlsb2FkIHRoYXQgd2FzIGRpc3BhdGNoZWQgdG8gc3Vic2NyaWJlcnNcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRMYXN0Tm90aWZpY2F0aW9uKCkge1xuICAgIHJldHVybiBfc3ViamVjdC5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RXZlbnRDb25zdGFudHMoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCBfZXZlbnRzKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZXZlbnRzICAgICAgICAgICAgIDogZ2V0RXZlbnRDb25zdGFudHMsXG4gICAgaW5pdGlhbGl6ZSAgICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBwaW5nICAgICAgICAgICAgICAgOiBwaW5nLFxuICAgIG5vdGlmeVNlcnZlciAgICAgICA6IG5vdGlmeVNlcnZlcixcbiAgICBzdWJzY3JpYmUgICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnMgIDogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgZ2V0TGFzdE5vdGlmaWNhdGlvbjogZ2V0TGFzdE5vdGlmaWNhdGlvblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNvY2tldElPQ29ubmVjdG9yKCk7IiwiLyoqXG4gKiBNYXAgZGF0YSB0eXBlXG4gKi9cblxudmFyIE5NYXAgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyxcbiAgICAgIF9pZCxcbiAgICAgIF9wYXJlbnRDb2xsZWN0aW9uLFxuICAgICAgX2RpcnR5ICAgPSBmYWxzZSxcbiAgICAgIF9lbnRyaWVzID0gW10sXG4gICAgICBfbWFwICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0aWFsaXphdGlvblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGluaXRPYmopIHtcbiAgICBpZiAoIWluaXRPYmouaWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU3RvcmUgbXVzdCBiZSBpbml0XFwnZCB3aXRoIGFuIGlkJyk7XG4gICAgfVxuXG4gICAgX3RoaXMgPSB0aGlzO1xuICAgIF9pZCAgID0gaW5pdE9iai5pZDtcblxuICAgIGlmIChpbml0T2JqLnN0b3JlKSB7XG4gICAgICBfZGlydHkgPSB0cnVlO1xuICAgICAgX21hcCAgID0gaW5pdE9iai5zdG9yZTtcbiAgICB9IGVsc2UgaWYgKGluaXRPYmouanNvbikge1xuICAgICAgc2V0SlNPTihpbml0T2JqLmpzb24pO1xuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIFNldCBtYXAgc3RvcmUgZnJvbSBhIEpTT04gb2JqZWN0XG4gICAqIEBwYXJhbSBqc3RyXG4gICAqL1xuICBmdW5jdGlvbiBzZXRKU09OKGpzdHIpIHtcbiAgICBfZGlydHkgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBfbWFwID0gSlNPTi5wYXJzZShqc3RyKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01hcENvbGxlY3Rpb24sIGVycm9yIHBhcnNpbmcgSlNPTjonLCBqc3RyLCBlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJRCgpIHtcbiAgICByZXR1cm4gX2lkO1xuICB9XG5cbiAgLyoqXG4gICAqIEVyYXNlIGl0XG4gICAqL1xuICBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICBfbWFwICAgPSB7fTtcbiAgICBfZGlydHkgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNEaXJ0eSgpIHtcbiAgICByZXR1cm4gX2RpcnR5O1xuICB9XG5cbiAgZnVuY3Rpb24gbWFya0NsZWFuKCkge1xuICAgIF9kaXJ0eSA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBwcm9wZXJ0eSBvciBtZXJnZSBpbiBuZXcgZGF0YVxuICAgKiBAcGFyYW0ga2V5IFN0cmluZyA9IG5hbWUgb2YgcHJvcGVydHkgdG8gc2V0LCBPYmplY3QgPSB3aWxsIG1lcmdlIG5ldyBwcm9wc1xuICAgKiBAcGFyYW0gdmFsdWUgU3RyaW5nID0gdmFsdWUgb2YgcHJvcGVydHkgdG8gc2V0XG4gICAqL1xuICBmdW5jdGlvbiBzZXQoa2V5LCB2YWx1ZSkge1xuXG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnKSB7XG4gICAgICBfbWFwID0gXy5tZXJnZSh7fSwgX21hcCwga2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX21hcFtrZXldID0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gTWFyayBjaGFuZ2VkXG4gICAgX2RpcnR5ID0gdHJ1ZTtcblxuICAgIGRpc3BhdGNoQ2hhbmdlKCdzZXRfa2V5Jyk7XG4gIH1cblxuICAvKipcbiAgICogQXNzdW1pbmcgdGhhdCBfbWFwW2tleV0gaXMgYW4gb2JqZWN0LCB0aGlzIHdpbGwgc2V0IGEgcHJvcGVydHkgb24gaXRcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcGFyYW0gcHJvcFxuICAgKiBAcGFyYW0gZGF0YVxuICAgKi9cbiAgZnVuY3Rpb24gc2V0S2V5UHJvcChrZXksIHByb3AsIGRhdGEpIHtcbiAgICBfbWFwW2tleV1bcHJvcF0gPSBkYXRhO1xuXG4gICAgX2RpcnR5ID0gdHJ1ZTtcbiAgICBkaXNwYXRjaENoYW5nZSgnc2V0X2tleScpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBkYXRhXG4gICAqIEByZXR1cm5zICpcbiAgICovXG4gIGZ1bmN0aW9uIGdldChrZXkpIHtcbiAgICB2YXIgdmFsdWUgPSBoYXMoa2V5KSA/IF9tYXBba2V5XSA6IHVuZGVmaW5lZDtcblxuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdmFsdWUgPSBfLmNsb25lRGVlcCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFzc3VtaW5nIHRoYXQgX21hcFtrZXldIGlzIGFuIG9iamVjdCwgdGhpcyB3aWxsIGdldCB2YWx1ZVxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEBwYXJhbSBwcm9wXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0S2V5UHJvcChrZXksIHByb3ApIHtcbiAgICB2YXIgdmFsdWVPYmogPSBoYXMoa2V5KSA/IF9tYXBba2V5XSA6IHVuZGVmaW5lZCxcbiAgICAgICAgdmFsdWUgICAgPSBudWxsO1xuXG4gICAgaWYgKHZhbHVlT2JqKSB7XG4gICAgICB2YWx1ZSA9IF8uY2xvbmVEZWVwKHZhbHVlT2JqW3Byb3BdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIG9mIHRoZSBrZXkgaXMgcHJlc2VudCBpbiB0aGUgbWFwXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBmdW5jdGlvbiBoYXMoa2V5KSB7XG4gICAgcmV0dXJuIF9tYXAuaGFzT3duUHJvcGVydHkoa2V5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBrZXkvdmFsdWVzLiBSZXN1bHRzIGFyZSBjYWNoZWQgYW5kIG9ubHkgcmVnZW5lcmF0ZWRcbiAgICogaWYgY2hhbmdlZCAoc2V0KVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBlbnRyaWVzKCkge1xuICAgIGlmICghX2RpcnR5ICYmIF9lbnRyaWVzKSB7XG4gICAgICByZXR1cm4gX2VudHJpZXM7XG4gICAgfVxuXG4gICAgdmFyIGFycnkgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gX21hcCkge1xuICAgICAgYXJyeS5wdXNoKHtrZXk6IGtleSwgdmFsdWU6IF9tYXBba2V5XX0pO1xuICAgIH1cblxuICAgIF9lbnRyaWVzID0gYXJyeTtcbiAgICBfZGlydHkgICA9IGZhbHNlO1xuXG4gICAgcmV0dXJuIGFycnk7XG4gIH1cblxuICAvKipcbiAgICogTnVtYmVyIG9mIGVudHJpZXNcbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIHNpemUoKSB7XG4gICAgcmV0dXJuIGtleXMoKS5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiBhcnJheSBvZiBhbGwga2V5cyBpbiB0aGUgbWFwXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGtleXMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKF9tYXApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gYXJyYXkgb2YgYWxsIHZhdWxlcyBpbiB0aGUgbWFwXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICByZXR1cm4gZW50cmllcygpLm1hcChmdW5jdGlvbiAoZW50cnkpIHtcbiAgICAgIHJldHVybiBlbnRyeS52YWx1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSB2YWx1ZVxuICAgKiBAcGFyYW0ga2V5XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmUoa2V5KSB7XG4gICAgZGVsZXRlIF9tYXBba2V5XTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIG1hdGNoZXMgdG8gdGhlIHByZWRpY2F0ZSBmdW5jdGlvblxuICAgKiBAcGFyYW0gcHJlZGljYXRlXG4gICAqIEByZXR1cm5zIHtBcnJheS48VD59XG4gICAqL1xuICBmdW5jdGlvbiBmaWx0ZXJWYWx1ZXMocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIHZhbHVlcygpLmZpbHRlcihwcmVkaWNhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlyc3QoKSB7XG4gICAgcmV0dXJuIGVudHJpZXMoKVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxhc3QoKSB7XG4gICAgdmFyIGUgPSBlbnRyaWVzKCk7XG4gICAgcmV0dXJuIGVbZS5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEF0SW5kZXgoaSkge1xuICAgIHJldHVybiBlbnRyaWVzKClbaV07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGNvcHkgb2YgdGhlIGRhdGEgbWFwXG4gICAqIEByZXR1cm5zIHt2b2lkfCp9XG4gICAqL1xuICBmdW5jdGlvbiB0b09iamVjdCgpIHtcbiAgICByZXR1cm4gXy5tZXJnZSh7fSwgX21hcCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgbmV3IG9iamVjdCBieSBcInRyYW5zbGF0aW5nXCIgdGhlIHByb3BlcnRpZXMgb2YgdGhlIG1hcCBmcm9tIG9uZSBrZXkgdG8gYW5vdGhlclxuICAgKiBAcGFyYW0gdE9iaiB7Y3VycmVudFByb3AsIG5ld1Byb3B9XG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2Zvcm0odE9iaikge1xuICAgIHZhciB0cmFuc2Zvcm1lZCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHRPYmopIHtcbiAgICAgIGlmIChfbWFwLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgIHRyYW5zZm9ybWVkW3RPYmpbcHJvcF1dID0gX21hcFtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJhbnNmb3JtZWQ7XG4gIH1cblxuICAvKipcbiAgICogT24gY2hhbmdlLCBlbWl0IGV2ZW50IGdsb2JhbGx5XG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaENoYW5nZSh0eXBlKSB7XG4gICAgdmFyIHBheWxvYWQgPSB7XG4gICAgICBpZCAgICAgOiBfaWQsXG4gICAgICBtYXBUeXBlOiAnc3RvcmUnXG4gICAgfTtcblxuICAgIF90aGlzLm5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpO1xuXG4gICAgaWYgKF9wYXJlbnRDb2xsZWN0aW9uLmRpc3BhdGNoQ2hhbmdlKSB7XG4gICAgICBfcGFyZW50Q29sbGVjdGlvbi5kaXNwYXRjaENoYW5nZSh7XG4gICAgICAgIGlkOiBfaWRcbiAgICAgIH0sICh0eXBlIHx8ICdtYXAnKSk7XG4gICAgfVxuXG4gIH1cblxuICBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KF9tYXApO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGFyZW50Q29sbGVjdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgX3BhcmVudENvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGFyZW50Q29sbGVjdGlvbigpIHtcbiAgICByZXR1cm4gX3BhcmVudENvbGxlY3Rpb247XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemUgICAgICAgICA6IGluaXRpYWxpemUsXG4gICAgZ2V0SUQgICAgICAgICAgICAgIDogZ2V0SUQsXG4gICAgY2xlYXIgICAgICAgICAgICAgIDogY2xlYXIsXG4gICAgaXNEaXJ0eSAgICAgICAgICAgIDogaXNEaXJ0eSxcbiAgICBtYXJrQ2xlYW4gICAgICAgICAgOiBtYXJrQ2xlYW4sXG4gICAgc2V0SlNPTiAgICAgICAgICAgIDogc2V0SlNPTixcbiAgICBzZXQgICAgICAgICAgICAgICAgOiBzZXQsXG4gICAgc2V0S2V5UHJvcCAgICAgICAgIDogc2V0S2V5UHJvcCxcbiAgICBnZXQgICAgICAgICAgICAgICAgOiBnZXQsXG4gICAgZ2V0S2V5UHJvcCAgICAgICAgIDogZ2V0S2V5UHJvcCxcbiAgICBoYXMgICAgICAgICAgICAgICAgOiBoYXMsXG4gICAgcmVtb3ZlICAgICAgICAgICAgIDogcmVtb3ZlLFxuICAgIGtleXMgICAgICAgICAgICAgICA6IGtleXMsXG4gICAgdmFsdWVzICAgICAgICAgICAgIDogdmFsdWVzLFxuICAgIGVudHJpZXMgICAgICAgICAgICA6IGVudHJpZXMsXG4gICAgZmlsdGVyVmFsdWVzICAgICAgIDogZmlsdGVyVmFsdWVzLFxuICAgIHNpemUgICAgICAgICAgICAgICA6IHNpemUsXG4gICAgZmlyc3QgICAgICAgICAgICAgIDogZmlyc3QsXG4gICAgbGFzdCAgICAgICAgICAgICAgIDogbGFzdCxcbiAgICBnZXRBdEluZGV4ICAgICAgICAgOiBnZXRBdEluZGV4LFxuICAgIHRvT2JqZWN0ICAgICAgICAgICA6IHRvT2JqZWN0LFxuICAgIHRyYW5zZm9ybSAgICAgICAgICA6IHRyYW5zZm9ybSxcbiAgICB0b0pTT04gICAgICAgICAgICAgOiB0b0pTT04sXG4gICAgc2V0UGFyZW50Q29sbGVjdGlvbjogc2V0UGFyZW50Q29sbGVjdGlvbixcbiAgICBnZXRQYXJlbnRDb2xsZWN0aW9uOiBnZXRQYXJlbnRDb2xsZWN0aW9uXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTk1hcDsiLCIvKipcbiAqIE1hcCBDb2xsZWN0aW9uIC0gYW4gYXJyYXkgb2YgbWFwc1xuICovXG52YXIgTWFwQ29sbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF90aGlzLFxuICAgICAgX2lkLFxuICAgICAgX3BhcmVudENvbGxlY3Rpb24sXG4gICAgICBfY2FyZXQgICAgPSAwLFxuICAgICAgX2NoaWxkcmVuID0gW107XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0aWFsaXphdGlvblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGluaXRPYmopIHtcbiAgICBpZiAoIWluaXRPYmouaWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU3RvcmVDb2xsZWN0aW9uIG11c3QgYmUgaW5pdFxcJ2Qgd2l0aCBhbiBpZCcpO1xuICAgIH1cblxuICAgIF90aGlzID0gdGhpcztcbiAgICBfaWQgICA9IGluaXRPYmouaWQ7XG5cbiAgICAvLyBUT0RPIHRlc3RcbiAgICBpZiAoaW5pdE9iai5zdG9yZXMpIHtcbiAgICAgIGFkZE1hcHNGcm9tQXJyYXkuY2FsbChfdGhpcywgaW5pdE9iai5zdG9yZXMpO1xuICAgIH1cbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgSXRlcmF0b3JcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICB2YXIgcmV0ID0ge307XG4gICAgaWYgKGhhc05leHQoKSkge1xuICAgICAgcmV0ID0ge3ZhbHVlOiBfY2hpbGRyZW5bX2NhcmV0KytdLCBkb25lOiAhaGFzTmV4dCgpfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0ID0gY3VycmVudCgpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICBmdW5jdGlvbiBjdXJyZW50KCkge1xuICAgIHJldHVybiB7dmFsdWU6IF9jaGlsZHJlbltfY2FyZXRdLCBkb25lOiAhaGFzTmV4dCgpfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJld2luZCgpIHtcbiAgICBfY2FyZXQgPSAwO1xuICAgIHJldHVybiBfY2hpbGRyZW5bX2NhcmV0XTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc05leHQoKSB7XG4gICAgcmV0dXJuIF9jYXJldCA8IF9jaGlsZHJlbi5sZW5ndGg7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEltcGxcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZnVuY3Rpb24gaXNEaXJ0eSgpIHtcbiAgICB2YXIgZGlydHkgPSBmYWxzZTtcbiAgICBmb3JFYWNoKGZ1bmN0aW9uIGNoZWNrRGlydHkobWFwKSB7XG4gICAgICBpZiAobWFwLmlzRGlydHkoKSkge1xuICAgICAgICBkaXJ0eSA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGRpcnR5O1xuICB9XG5cbiAgZnVuY3Rpb24gbWFya0NsZWFuKCkge1xuICAgIGZvckVhY2goZnVuY3Rpb24gY2hlY2tEaXJ0eShtYXApIHtcbiAgICAgIG1hcC5tYXJrQ2xlYW4oKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYW4gYXJyYXkgb2YgU3RvcmUgaW5zdGFuY2VzXG4gICAqIEBwYXJhbSBzQXJyeVxuICAgKi9cbiAgZnVuY3Rpb24gYWRkTWFwc0Zyb21BcnJheShzQXJyeSkge1xuICAgIHNBcnJ5LmZvckVhY2goZnVuY3Rpb24gKHN0b3JlKSB7XG4gICAgICBhZGQoc3RvcmUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBhZGQgY2hpbGQgU3RvcmUgc3RvcmVzIGZyb20gYW4gYXJyYXkgb2Ygb2JqZWN0c1xuICAgKiBAcGFyYW0gYXJyYXkgQXJyYXkgb2Ygb2JqZWN0c1xuICAgKiBAcGFyYW0gaWRLZXkgS2V5IG9uIGVhY2ggb2JqZWN0IHRvIHVzZSBmb3IgdGhlIElEIG9mIHRoYXQgU3RvcmUgc3RvcmVcbiAgICovXG4gIGZ1bmN0aW9uIGFkZEZyb21PYmpBcnJheShvQXJyeSwgaWRLZXkpIHtcbiAgICBjb25zb2xlLndhcm4oJ01hcENvbGxlY3Rpb24sIGFkZEZyb21PYmpBcnJ5LCBuZWVkIHRvIGJlIGZpeGVkIHRvIHJlbW92ZSByZWZlcmVuY2UgdG8gTm9yaS5zdG9yZSgpJyk7XG4gICAgb0FycnkuZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG5cbiAgICAgIHZhciBpZDtcblxuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpZEtleSkpIHtcbiAgICAgICAgaWQgPSBvYmpbaWRLZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWQgPSBfaWQgKyAnY2hpbGQnICsgX2NoaWxkcmVuLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgLy9hZGQoTm9yaS5zdG9yZSgpLmNyZWF0ZU1hcCh7aWQ6IGlkLCBzdG9yZTogb2JqfSkpO1xuICAgIH0pO1xuICAgIGRpc3BhdGNoQ2hhbmdlKF9pZCwgJ2FkZF9tYXAnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEZyb21KU09OQXJyYXkoanNvbiwgaWRLZXkpIHtcbiAgICBjb25zb2xlLndhcm4oJ01hcENvbGxlY3Rpb24sIGFkZEZyb21KU09OQXJyeSwgbmVlZCB0byBiZSBmaXhlZCB0byByZW1vdmUgcmVmZXJlbmNlIHRvIE5vcmkuc3RvcmUoKScpO1xuICAgIGpzb24uZm9yRWFjaChmdW5jdGlvbiAoanN0cikge1xuXG4gICAgICB2YXIgaWQsIG9iajtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgb2JqID0gSlNPTi5wYXJzZShqc3RyKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNYXBDb2xsZWN0aW9uLCBlcnJvciBwYXJzaW5nIEpTT046JywganN0ciwgZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaWRLZXkpKSB7XG4gICAgICAgIGlkID0gb2JqW2lkS2V5XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlkID0gX2lkICsgJ2NoaWxkJyArIF9jaGlsZHJlbi5sZW5ndGg7XG4gICAgICB9XG5cbiAgICAgIC8vYWRkKE5vcmkuc3RvcmUoKS5jcmVhdGVNYXAoe2lkOiBpZCwgc3RvcmU6IG9ian0pKTtcbiAgICB9KTtcbiAgICBkaXNwYXRjaENoYW5nZShfaWQsICdhZGRfbWFwJyk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJRCgpIHtcbiAgICByZXR1cm4gX2lkO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkKHN0b3JlKSB7XG4gICAgdmFyIGN1cnJJZHggPSBnZXRNYXBJbmRleChzdG9yZS5nZXRJRCgpKTtcblxuICAgIHN0b3JlLnNldFBhcmVudENvbGxlY3Rpb24oX3RoaXMpO1xuXG4gICAgaWYgKGN1cnJJZHggPj0gMCkge1xuICAgICAgX2NoaWxkcmVuW2N1cnJJZHhdID0gc3RvcmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9jaGlsZHJlbi5wdXNoKHN0b3JlKTtcbiAgICB9XG5cbiAgICBkaXNwYXRjaENoYW5nZShfaWQsICdhZGRfbWFwJyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgc3RvcmUgZnJvbSB0aGUgY29sbGVjdGlvblxuICAgKiBAcGFyYW0gc3RvcmVJRFxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlKHN0b3JlSUQpIHtcbiAgICB2YXIgY3VycklkeCA9IGdldE1hcEluZGV4KHN0b3JlSUQpO1xuICAgIGlmIChjdXJySWR4ID49IDApIHtcbiAgICAgIF9jaGlsZHJlbltjdXJySWR4XS5zZXRQYXJlbnRDb2xsZWN0aW9uKG51bGwpO1xuICAgICAgX2NoaWxkcmVuW2N1cnJJZHhdID0gbnVsbDtcbiAgICAgIF9jaGlsZHJlbi5zcGxpY2UoY3VycklkeCwgMSk7XG4gICAgICBkaXNwYXRjaENoYW5nZShfaWQsICdyZW1vdmVfbWFwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKF9pZCArICcgcmVtb3ZlLCBzdG9yZSBub3QgaW4gY29sbGVjdGlvbjogJyArIHN0b3JlSUQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYWxsIHN0b3JlcyBmcm9tIHRoZSBhcnJheVxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlQWxsKCkge1xuICAgIF9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChtYXApIHtcbiAgICAgIG1hcC5zZXRQYXJlbnRDb2xsZWN0aW9uKG51bGwpO1xuICAgIH0pO1xuXG4gICAgX2NoaWxkcmVuID0gW107XG4gICAgZGlzcGF0Y2hDaGFuZ2UoX2lkLCAncmVtb3ZlX21hcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIFN0b3JlIGJ5IElEXG4gICAqIEBwYXJhbSBzdG9yZUlEXG4gICAqIEByZXR1cm5zIHtUfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TWFwKHN0b3JlSUQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICAgIHJldHVybiBzdG9yZS5nZXRJRCgpID09PSBzdG9yZUlEO1xuICAgIH0pWzBdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgaW5kZXggaW4gX2NoaWxkcmVuIGFycmF5IGJ5IFN0b3JlJ3MgSURcbiAgICogQHBhcmFtIHN0b3JlSURcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE1hcEluZGV4KHN0b3JlSUQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICAgIHJldHVybiBzdG9yZS5nZXRJRCgpO1xuICAgIH0pLmluZGV4T2Yoc3RvcmVJRCk7XG4gIH1cblxuICAvKipcbiAgICogT24gY2hhbmdlLCBlbWl0IGV2ZW50IGdsb2JhbGx5XG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaENoYW5nZShkYXRhLCB0eXBlKSB7XG4gICAgdmFyIHBheWxvYWQgPSB7XG4gICAgICBpZCAgICAgOiBfaWQsXG4gICAgICB0eXBlICAgOiB0eXBlIHx8ICcnLFxuICAgICAgbWFwVHlwZTogJ2NvbGxlY3Rpb24nLFxuICAgICAgbWFwSUQgIDogZGF0YS5pZFxuICAgIH07XG5cbiAgICBfdGhpcy5ub3RpZnlTdWJzY3JpYmVycyhwYXlsb2FkKTtcblxuICAgIGlmIChfcGFyZW50Q29sbGVjdGlvbikge1xuICAgICAgX3BhcmVudENvbGxlY3Rpb24uZGlzcGF0Y2hDaGFuZ2Uoe2lkOiBfaWQsIHN0b3JlOiBnZXRNYXAoKX0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc01hcChzdG9yZUlEKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbltzdG9yZUlEXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgZW50cmllc1xuICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgKi9cbiAgZnVuY3Rpb24gc2l6ZSgpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmxlbmd0aDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpcnN0KCkge1xuICAgIHJldHVybiBfY2hpbGRyZW5bMF07XG4gIH1cblxuICBmdW5jdGlvbiBsYXN0KCkge1xuICAgIHJldHVybiBfY2hpbGRyZW5bX2NoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgZnVuY3Rpb24gYXRJbmRleChpKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbltpXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW5zIGEgcHJlZGlkYXRlIG9uIGVhY2ggY2hpbGQgbWFwXG4gICAqIEBwYXJhbSBwcmVkaWNhdGVcbiAgICogQHJldHVybnMge0FycmF5LjxUPn1cbiAgICovXG4gIGZ1bmN0aW9uIGZpbHRlcihwcmVkaWNhdGUpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihwcmVkaWNhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgbWFwcyB3aGVyZSB0aGUgZmlsdGVyIG1hdGNoZXMgdGhlIHByb3AgLyB2YWx1ZSBwYWlyXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEByZXR1cm5zIHtBcnJheS48VD59XG4gICAqL1xuICBmdW5jdGlvbiBmaWx0ZXJCeUtleShrZXksIHZhbHVlKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKG1hcCkge1xuICAgICAgcmV0dXJuIG1hcC5nZXQoa2V5KSA9PT0gdmFsdWU7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JFYWNoKGZ1bmMpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZvckVhY2goZnVuYyk7XG4gIH1cblxuICBmdW5jdGlvbiBtYXAoZnVuYykge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbiBhcnJheSBvZiBlbnRyaWVzIG9mIGVhY2ggbWFwXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGVudHJpZXMoKSB7XG4gICAgdmFyIGFycnkgPSBbXTtcbiAgICBfY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAobWFwKSB7XG4gICAgICBhcnJ5LnB1c2gobWFwLmVudHJpZXMoKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFycnk7XG4gIH1cblxuICBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KF9jaGlsZHJlbik7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRQYXJlbnRDb2xsZWN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICBfcGFyZW50Q29sbGVjdGlvbiA9IGNvbGxlY3Rpb247XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYXJlbnRDb2xsZWN0aW9uKCkge1xuICAgIHJldHVybiBfcGFyZW50Q29sbGVjdGlvbjtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBjdXJyZW50ICAgICAgICAgICAgOiBjdXJyZW50LFxuICAgIG5leHQgICAgICAgICAgICAgICA6IG5leHQsXG4gICAgaGFzTmV4dCAgICAgICAgICAgIDogaGFzTmV4dCxcbiAgICByZXdpbmQgICAgICAgICAgICAgOiByZXdpbmQsXG4gICAgZ2V0SUQgICAgICAgICAgICAgIDogZ2V0SUQsXG4gICAgaXNEaXJ0eSAgICAgICAgICAgIDogaXNEaXJ0eSxcbiAgICBtYXJrQ2xlYW4gICAgICAgICAgOiBtYXJrQ2xlYW4sXG4gICAgYWRkICAgICAgICAgICAgICAgIDogYWRkLFxuICAgIGFkZE1hcHNGcm9tQXJyYXkgICA6IGFkZE1hcHNGcm9tQXJyYXksXG4gICAgYWRkRnJvbU9iakFycmF5ICAgIDogYWRkRnJvbU9iakFycmF5LFxuICAgIGFkZEZyb21KU09OQXJyYXkgICA6IGFkZEZyb21KU09OQXJyYXksXG4gICAgcmVtb3ZlICAgICAgICAgICAgIDogcmVtb3ZlLFxuICAgIHJlbW92ZUFsbCAgICAgICAgICA6IHJlbW92ZUFsbCxcbiAgICBnZXRNYXAgICAgICAgICAgICAgOiBnZXRNYXAsXG4gICAgaGFzTWFwICAgICAgICAgICAgIDogaGFzTWFwLFxuICAgIHNpemUgICAgICAgICAgICAgICA6IHNpemUsXG4gICAgZmlyc3QgICAgICAgICAgICAgIDogZmlyc3QsXG4gICAgbGFzdCAgICAgICAgICAgICAgIDogbGFzdCxcbiAgICBhdEluZGV4ICAgICAgICAgICAgOiBhdEluZGV4LFxuICAgIGZpbHRlciAgICAgICAgICAgICA6IGZpbHRlcixcbiAgICBmaWx0ZXJCeUtleSAgICAgICAgOiBmaWx0ZXJCeUtleSxcbiAgICBmb3JFYWNoICAgICAgICAgICAgOiBmb3JFYWNoLFxuICAgIG1hcCAgICAgICAgICAgICAgICA6IG1hcCxcbiAgICBlbnRyaWVzICAgICAgICAgICAgOiBlbnRyaWVzLFxuICAgIHRvSlNPTiAgICAgICAgICAgICA6IHRvSlNPTixcbiAgICBkaXNwYXRjaENoYW5nZSAgICAgOiBkaXNwYXRjaENoYW5nZSxcbiAgICBzZXRQYXJlbnRDb2xsZWN0aW9uOiBzZXRQYXJlbnRDb2xsZWN0aW9uLFxuICAgIGdldFBhcmVudENvbGxlY3Rpb246IGdldFBhcmVudENvbGxlY3Rpb25cbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwQ29sbGVjdGlvbjsiLCJ2YXIgTWl4aW5NYXBGYWN0b3J5ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfbWFwQ29sbGVjdGlvbkxpc3QgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX21hcExpc3QgICAgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF9tYXBDb2xsZWN0aW9uRmFjdG9yeSA9IHJlcXVpcmUoJy4vTWFwQ29sbGVjdGlvbi5qcycpLFxuICAgICAgX21hcEZhY3RvcnkgICAgICAgICAgID0gcmVxdWlyZSgnLi9NYXAuanMnKSxcbiAgICAgIF9vYnNlcnZhYmxlRmFjdG9yeSAgICA9IHJlcXVpcmUoJy4uL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHN0b3JlIGNvbGxlY3Rpb24gYW5kIGluaXRhbGl6ZVxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcGFyYW0gZXh0cmFzXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlTWFwQ29sbGVjdGlvbihpbml0T2JqLCBleHRyYXMpIHtcbiAgICB2YXIgbSA9IE5vcmkuYXNzaWduQXJyYXkoe30sIFtfbWFwQ29sbGVjdGlvbkZhY3RvcnkoKSwgX29ic2VydmFibGVGYWN0b3J5KCksIGV4dHJhc10pO1xuICAgIG0uaW5pdGlhbGl6ZShpbml0T2JqKTtcbiAgICByZXR1cm4gbTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgc3RvcmUgYW5kIGluaXRpYWxpemVcbiAgICogQHBhcmFtIGluaXRPYmpcbiAgICogQHBhcmFtIGV4dHJhc1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZU1hcChpbml0T2JqLCBleHRyYXMpIHtcbiAgICB2YXIgbSA9IE5vcmkuYXNzaWduQXJyYXkoe30sIFtfbWFwRmFjdG9yeSgpLCBfb2JzZXJ2YWJsZUZhY3RvcnkoKSwgZXh0cmFzXSk7XG4gICAgbS5pbml0aWFsaXplKGluaXRPYmopO1xuICAgIHJldHVybiBtO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIHN0b3JlIGZyb20gdGhlIGFwcGxpY2F0aW9uIGNvbGxlY3Rpb25cbiAgICogQHBhcmFtIHN0b3JlSURcbiAgICogQHJldHVybnMge3ZvaWR8Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE1hcChzdG9yZUlEKSB7XG4gICAgcmV0dXJuIF9tYXBMaXN0W3N0b3JlSURdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIHN0b3JlIGNvbGxlY3Rpb24gZnJvbSB0aGUgYXBwbGljYXRpb24gY29sbGVjdGlvblxuICAgKiBAcGFyYW0gc3RvcmVJRFxuICAgKiBAcmV0dXJucyB7dm9pZHwqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TWFwQ29sbGVjdGlvbihzdG9yZUlEKSB7XG4gICAgcmV0dXJuIF9tYXBDb2xsZWN0aW9uTGlzdFtzdG9yZUlEXTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY3JlYXRlTWFwQ29sbGVjdGlvbjogY3JlYXRlTWFwQ29sbGVjdGlvbixcbiAgICBjcmVhdGVNYXAgICAgICAgICAgOiBjcmVhdGVNYXAsXG4gICAgZ2V0TWFwICAgICAgICAgICAgIDogZ2V0TWFwLFxuICAgIGdldE1hcENvbGxlY3Rpb24gICA6IGdldE1hcENvbGxlY3Rpb25cbiAgfTtcblxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluTWFwRmFjdG9yeSgpOyIsIi8qKlxuICogTWl4aW4gZm9yIE5vcmkgc3RvcmVzIHRvIGFkZCBmdW5jdGlvbmFsaXR5IHNpbWlsYXIgdG8gUmVkdXgnIFJlZHVjZXIgYW5kIHNpbmdsZVxuICogb2JqZWN0IHN0YXRlIHRyZWUgY29uY2VwdC4gTWl4aW4gc2hvdWxkIGJlIGNvbXBvc2VkIHRvIG5vcmkvc3RvcmUvQXBwbGljYXRpb25TdG9yZVxuICogZHVyaW5nIGNyZWF0aW9uIG9mIG1haW4gQXBwU3RvcmVcbiAqXG4gKiBodHRwczovL2dhZWFyb24uZ2l0aHViLmlvL3JlZHV4L2RvY3MvYXBpL1N0b3JlLmh0bWxcbiAqIGh0dHBzOi8vZ2FlYXJvbi5naXRodWIuaW8vcmVkdXgvZG9jcy9iYXNpY3MvUmVkdWNlcnMuaHRtbFxuICpcbiAqIENyZWF0ZWQgOC8xMy8xNVxuICovXG52YXIgTWl4aW5SZWR1Y2VyU3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyxcbiAgICAgIF9zdGF0ZSxcbiAgICAgIF9zdGF0ZVJlZHVjZXJzID0gW107XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIF9zdGF0ZSBtaWdodCBub3QgZXhpc3QgaWYgc3Vic2NyaWJlcnMgYXJlIGFkZGVkIGJlZm9yZSB0aGlzIHN0b3JlIGlzIGluaXRpYWxpemVkXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICBpZiAoX3N0YXRlKSB7XG4gICAgICByZXR1cm4gX3N0YXRlLmdldFN0YXRlKCk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFN0YXRlKHN0YXRlKSB7XG4gICAgaWYgKCFfLmlzRXF1YWwoc3RhdGUsIF9zdGF0ZSkpIHtcbiAgICAgIF9zdGF0ZS5zZXRTdGF0ZShzdGF0ZSk7XG4gICAgICBfdGhpcy5ub3RpZnlTdWJzY3JpYmVycyh7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0UmVkdWNlcnMocmVkdWNlckFycmF5KSB7XG4gICAgX3N0YXRlUmVkdWNlcnMgPSByZWR1Y2VyQXJyYXk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRSZWR1Y2VyKHJlZHVjZXIpIHtcbiAgICBfc3RhdGVSZWR1Y2Vycy5wdXNoKHJlZHVjZXIpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0XG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgZXZlbnQgbGlzdGVuZXIvcmVjZWl2ZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKSB7XG4gICAgaWYgKCF0aGlzLmNyZWF0ZVN1YmplY3QpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZSBuZWVkcyBub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QgdG8gbm90aWZ5Jyk7XG4gICAgfVxuXG4gICAgdmFyIHNpbXBsZVN0b3JlRmFjdG9yeSA9IHJlcXVpcmUoJy4vU2ltcGxlU3RvcmUuanMnKTtcblxuICAgIF90aGlzICA9IHRoaXM7XG4gICAgX3N0YXRlID0gc2ltcGxlU3RvcmVGYWN0b3J5KCk7XG5cbiAgICBpZiAoIV9zdGF0ZVJlZHVjZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZHVjZXJTdG9yZSwgbXVzdCBzZXQgYSByZWR1Y2VyIGJlZm9yZSBpbml0aWFsaXphdGlvbicpO1xuICAgIH1cblxuICAgIC8vIFNldCBpbml0aWFsIHN0YXRlIGZyb20gZW1wdHkgZXZlbnRcbiAgICBhcHBseVJlZHVjZXJzKHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSB0aGUgYWN0aW9uIG9iamVjdCB0byB0aGUgcmVkdWNlcnMgdG8gY2hhbmdlIHN0YXRlXG4gICAqIGFyZSBzZW50IHRvIGFsbCByZWR1Y2VycyB0byB1cGRhdGUgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25PYmplY3RcbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5KGFjdGlvbk9iamVjdCkge1xuICAgIGNvbnNvbGUubG9nKCdSZWR1Y2VyU3RvcmUgQXBwbHk6ICcsIGFjdGlvbk9iamVjdC50eXBlLCBhY3Rpb25PYmplY3QucGF5bG9hZCk7XG4gICAgYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmplY3QpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmplY3QpIHtcbiAgICB2YXIgbmV4dFN0YXRlID0gYXBwbHlSZWR1Y2Vyc1RvU3RhdGUoZ2V0U3RhdGUoKSwgYWN0aW9uT2JqZWN0KTtcbiAgICBzZXRTdGF0ZShuZXh0U3RhdGUpO1xuICAgIF90aGlzLmhhbmRsZVN0YXRlTXV0YXRpb24oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBUEkgaG9vayB0byBoYW5kbGUgc3RhdGUgdXBkYXRlc1xuICAgKi9cbiAgZnVuY3Rpb24gaGFuZGxlU3RhdGVNdXRhdGlvbigpIHtcbiAgICAvLyBvdmVycmlkZSB0aGlzXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBzdGF0ZSBmcm9tIHRoZSBjb21iaW5lZCByZWR1Y2VzIGFuZCBhY3Rpb24gb2JqZWN0XG4gICAqIFN0b3JlIHN0YXRlIGlzbid0IG1vZGlmaWVkLCBjdXJyZW50IHN0YXRlIGlzIHBhc3NlZCBpbiBhbmQgbXV0YXRlZCBzdGF0ZSByZXR1cm5lZFxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICogQHBhcmFtIGFjdGlvblxuICAgKiBAcmV0dXJucyB7Knx7fX1cbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnNUb1N0YXRlKHN0YXRlLCBhY3Rpb24pIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIC8vIFRPRE8gc2hvdWxkIHRoaXMgYWN0dWFsbHkgdXNlIGFycmF5LnJlZHVjZSgpP1xuICAgIF9zdGF0ZVJlZHVjZXJzLmZvckVhY2goZnVuY3Rpb24gYXBwbHlTdGF0ZVJlZHVjZXJGdW5jdGlvbihyZWR1Y2VyRnVuYykge1xuICAgICAgc3RhdGUgPSByZWR1Y2VyRnVuYyhzdGF0ZSwgYWN0aW9uKTtcbiAgICB9KTtcbiAgICByZXR1cm4gc3RhdGU7XG4gIH1cblxuICAvKipcbiAgICogVGVtcGxhdGUgcmVkdWNlciBmdW5jdGlvblxuICAgKiBTdG9yZSBzdGF0ZSBpc24ndCBtb2RpZmllZCwgY3VycmVudCBzdGF0ZSBpcyBwYXNzZWQgaW4gYW5kIG11dGF0ZWQgc3RhdGUgcmV0dXJuZWRcblxuICAgZnVuY3Rpb24gdGVtcGxhdGVSZWR1Y2VyRnVuY3Rpb24oc3RhdGUsIGV2ZW50KSB7XG4gICAgICAgIHN0YXRlID0gc3RhdGUgfHwge307XG4gICAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuICAgICAgICAgIGNhc2UgX25vcmlBY3Rpb25Db25zdGFudHMuTU9ERUxfREFUQV9DSEFOR0VEOlxuICAgICAgICAgICAgLy8gY2FuIGNvbXBvc2Ugb3RoZXIgcmVkdWNlcnNcbiAgICAgICAgICAgIC8vIHJldHVybiBfLmFzc2lnbih7fSwgc3RhdGUsIG90aGVyU3RhdGVUcmFuc2Zvcm1lcihzdGF0ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBzdGF0ZSwge3Byb3A6IGV2ZW50LnBheWxvYWQudmFsdWV9KTtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAqL1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZTogaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSxcbiAgICBnZXRTdGF0ZSAgICAgICAgICAgICAgOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZSAgICAgICAgICAgICAgOiBzZXRTdGF0ZSxcbiAgICBhcHBseSAgICAgICAgICAgICAgICAgOiBhcHBseSxcbiAgICBzZXRSZWR1Y2VycyAgICAgICAgICAgOiBzZXRSZWR1Y2VycyxcbiAgICBhZGRSZWR1Y2VyICAgICAgICAgICAgOiBhZGRSZWR1Y2VyLFxuICAgIGFwcGx5UmVkdWNlcnMgICAgICAgICA6IGFwcGx5UmVkdWNlcnMsXG4gICAgYXBwbHlSZWR1Y2Vyc1RvU3RhdGUgIDogYXBwbHlSZWR1Y2Vyc1RvU3RhdGUsXG4gICAgaGFuZGxlU3RhdGVNdXRhdGlvbiAgIDogaGFuZGxlU3RhdGVNdXRhdGlvblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluUmVkdWNlclN0b3JlKCk7IiwidmFyIFNpbXBsZVN0b3JlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX2ludGVybmFsU3RhdGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBzdGF0ZVxuICAgKiBAcmV0dXJucyB7dm9pZHwqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCBfaW50ZXJuYWxTdGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGVcbiAgICogQHBhcmFtIG5leHRTdGF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U3RhdGUobmV4dFN0YXRlKSB7XG4gICAgX2ludGVybmFsU3RhdGUgPSBfLmFzc2lnbihfaW50ZXJuYWxTdGF0ZSwgbmV4dFN0YXRlKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZ2V0U3RhdGU6IGdldFN0YXRlLFxuICAgIHNldFN0YXRlOiBzZXRTdGF0ZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXBsZVN0b3JlOyIsIi8qXG4gTWF0dCBQZXJraW5zLCA2LzEyLzE1XG5cbiBwdWJsaXNoIHBheWxvYWQgb2JqZWN0XG5cbiB7XG4gdHlwZTogRVZUX1RZUEUsXG4gcGF5bG9hZDoge1xuIGtleTogdmFsdWVcbiB9XG4gfVxuXG4gKi9cbnZhciBEaXNwYXRjaGVyID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfc3ViamVjdE1hcCAgPSB7fSxcbiAgICAgIF9yZWNlaXZlck1hcCA9IHt9LFxuICAgICAgX2lkICAgICAgICAgID0gMCxcbiAgICAgIF9sb2cgICAgICAgICA9IFtdLFxuICAgICAgX3F1ZXVlICAgICAgID0gW10sXG4gICAgICBfdGltZXJPYnNlcnZhYmxlLFxuICAgICAgX3RpbWVyU3Vic2NyaXB0aW9uLFxuICAgICAgX3RpbWVyUGF1c2FibGU7XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBldmVudCBhcyBvYnNlcnZhYmxlXG4gICAqIEBwYXJhbSBldnRTdHIgRXZlbnQgbmFtZSBzdHJpbmdcbiAgICogQHBhcmFtIGhhbmRsZXIgb25OZXh0KCkgc3Vic2NyaXB0aW9uIGZ1bmN0aW9uXG4gICAqIEBwYXJhbSBvbmNlT3JDb250ZXh0IG9wdGlvbmFsLCBlaXRoZXIgdGhlIGNvbnRleHQgdG8gZXhlY3V0ZSB0aGUgaGFuZGVyIG9yIG9uY2UgYm9vbFxuICAgKiBAcGFyYW0gb25jZSB3aWxsIGNvbXBsZXRlL2Rpc3Bvc2UgYWZ0ZXIgb25lIGZpcmVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoZXZ0U3RyLCBoYW5kbGVyLCBvbmNlT3JDb250ZXh0LCBvbmNlKSB7XG4gICAgdmFyIGhhbmRsZXJDb250ZXh0ID0gd2luZG93O1xuXG4gICAgLy9jb25zb2xlLmxvZygnZGlzcGF0Y2hlciBzdWJzY3JpYmUnLCBldnRTdHIsIGhhbmRsZXIsIG9uY2VPckNvbnRleHQsIG9uY2UpO1xuXG4gICAgaWYgKGlzLmZhbHNleShldnRTdHIpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Rpc3BhdGNoZXI6IEZhc2xleSBldmVudCBzdHJpbmcgcGFzc2VkIGZvciBoYW5kbGVyJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKGlzLmZhbHNleShoYW5kbGVyKSkge1xuICAgICAgY29uc29sZS53YXJuKCdEaXNwYXRjaGVyOiBGYXNsZXkgaGFuZGxlciBwYXNzZWQgZm9yIGV2ZW50IHN0cmluZycsIGV2dFN0cik7XG4gICAgfVxuXG4gICAgaWYgKG9uY2VPckNvbnRleHQgfHwgb25jZU9yQ29udGV4dCA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChvbmNlT3JDb250ZXh0ID09PSB0cnVlIHx8IG9uY2VPckNvbnRleHQgPT09IGZhbHNlKSB7XG4gICAgICAgIG9uY2UgPSBvbmNlT3JDb250ZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGFuZGxlckNvbnRleHQgPSBvbmNlT3JDb250ZXh0O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghX3N1YmplY3RNYXBbZXZ0U3RyXSkge1xuICAgICAgX3N1YmplY3RNYXBbZXZ0U3RyXSA9IFtdO1xuICAgIH1cblxuICAgIHZhciBzdWJqZWN0ID0gbmV3IFJ4LlN1YmplY3QoKTtcblxuICAgIF9zdWJqZWN0TWFwW2V2dFN0cl0ucHVzaCh7XG4gICAgICBvbmNlICAgIDogb25jZSxcbiAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgaGFuZGxlciA6IGhhbmRsZXIsXG4gICAgICBjb250ZXh0IDogaGFuZGxlckNvbnRleHQsXG4gICAgICBzdWJqZWN0IDogc3ViamVjdCxcbiAgICAgIHR5cGUgICAgOiAwXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlci5iaW5kKGhhbmRsZXJDb250ZXh0KSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0aGUgZXZlbnQgcHJvY2Vzc2luZyB0aW1lciBvciByZXN1bWUgYSBwYXVzZWQgdGltZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRUaW1lcigpIHtcbiAgICBpZiAoX3RpbWVyT2JzZXJ2YWJsZSkge1xuICAgICAgX3RpbWVyUGF1c2FibGUub25OZXh0KHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF90aW1lclBhdXNhYmxlICAgICA9IG5ldyBSeC5TdWJqZWN0KCk7XG4gICAgX3RpbWVyT2JzZXJ2YWJsZSAgID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxKS5wYXVzYWJsZShfdGltZXJQYXVzYWJsZSk7XG4gICAgX3RpbWVyU3Vic2NyaXB0aW9uID0gX3RpbWVyT2JzZXJ2YWJsZS5zdWJzY3JpYmUocHJvY2Vzc05leHRFdmVudCk7XG4gIH1cblxuICAvKipcbiAgICogU2hpZnQgbmV4dCBldmVudCB0byBoYW5kbGUgb2ZmIG9mIHRoZSBxdWV1ZSBhbmQgZGlzcGF0Y2ggaXRcbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NOZXh0RXZlbnQoKSB7XG4gICAgdmFyIGV2dCA9IF9xdWV1ZS5zaGlmdCgpO1xuICAgIGlmIChldnQpIHtcbiAgICAgIGRpc3BhdGNoVG9SZWNlaXZlcnMoZXZ0KTtcbiAgICAgIGRpc3BhdGNoVG9TdWJzY3JpYmVycyhldnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfdGltZXJQYXVzYWJsZS5vbk5leHQoZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdXNoIGV2ZW50IHRvIHRoZSBzdGFjayBhbmQgYmVnaW4gZXhlY3V0aW9uXG4gICAqIEBwYXJhbSBwYXlsb2FkT2JqIHR5cGU6U3RyaW5nLCBwYXlsb2FkOmRhdGFcbiAgICogQHBhcmFtIGRhdGFcbiAgICovXG4gIGZ1bmN0aW9uIHB1Ymxpc2gocGF5bG9hZE9iaikge1xuICAgIF9sb2cucHVzaChwYXlsb2FkT2JqKTtcbiAgICBfcXVldWUucHVzaChwYXlsb2FkT2JqKTtcblxuICAgIGluaXRUaW1lcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgdGhlIHBheWxvYWQgdG8gYWxsIHJlY2VpdmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2hUb1JlY2VpdmVycyhwYXlsb2FkKSB7XG4gICAgZm9yICh2YXIgaWQgaW4gX3JlY2VpdmVyTWFwKSB7XG4gICAgICBfcmVjZWl2ZXJNYXBbaWRdLmhhbmRsZXIocGF5bG9hZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXJzIHJlY2VpdmUgYWxsIHBheWxvYWRzIGZvciBhIGdpdmVuIGV2ZW50IHR5cGUgd2hpbGUgaGFuZGxlcnMgYXJlIHRhcmdldGVkXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaFRvU3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIHZhciBzdWJzY3JpYmVycyA9IF9zdWJqZWN0TWFwW3BheWxvYWQudHlwZV0sIGk7XG4gICAgaWYgKCFzdWJzY3JpYmVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGkgPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgc3Viak9iaiA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgaWYgKHN1YmpPYmoudHlwZSA9PT0gMCkge1xuICAgICAgICBzdWJqT2JqLnN1YmplY3Qub25OZXh0KHBheWxvYWQpO1xuICAgICAgfVxuICAgICAgaWYgKHN1YmpPYmoub25jZSkge1xuICAgICAgICB1bnN1YnNjcmliZShwYXlsb2FkLnR5cGUsIHN1YmpPYmouaGFuZGxlcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGhhbmRsZXJcbiAgICogQHBhcmFtIGV2dFN0clxuICAgKiBAcGFyYW0gaGFuZGVyXG4gICAqL1xuICBmdW5jdGlvbiB1bnN1YnNjcmliZShldnRTdHIsIGhhbmRsZXIpIHtcbiAgICBpZiAoX3N1YmplY3RNYXBbZXZ0U3RyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN1YnNjcmliZXJzID0gX3N1YmplY3RNYXBbZXZ0U3RyXSxcbiAgICAgICAgaGFuZGxlcklkeCAgPSAtMTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdWJzY3JpYmVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHN1YnNjcmliZXJzW2ldLmhhbmRsZXIgPT09IGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlcklkeCAgICAgPSBpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXS5zdWJqZWN0Lm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHN1YnNjcmliZXJzW2ldLnN1YmplY3QuZGlzcG9zZSgpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhbmRsZXJJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3Vic2NyaWJlcnMuc3BsaWNlKGhhbmRsZXJJZHgsIDEpO1xuXG4gICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVsZXRlIF9zdWJqZWN0TWFwW2V2dFN0cl07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIGNvcHkgb2YgdGhlIGxvZyBhcnJheVxuICAgKiBAcmV0dXJucyB7QXJyYXkuPFQ+fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TG9nKCkge1xuICAgIHJldHVybiBfbG9nLnNsaWNlKDApO1xuICB9XG5cblxuICAvKipcbiAgICogU2ltcGxlIHJlY2VpdmVyIGltcGxlbWVudGF0aW9uIGJhc2VkIG9uIEZsdXhcbiAgICogUmVnaXN0ZXJlZCByZWNlaXZlcnMgd2lsbCBnZXQgZXZlcnkgcHVibGlzaGVkIGV2ZW50XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9mbHV4L2Jsb2IvbWFzdGVyL3NyYy9EaXNwYXRjaGVyLmpzXG4gICAqXG4gICAqIFVzYWdlOlxuICAgKlxuICAgKiBfZGlzcGF0Y2hlci5yZWdpc3RlclJlY2VpdmVyKGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgICAgKiAgICBjb25zb2xlLmxvZygncmVjZWl2aW5nLCAnLHBheWxvYWQpO1xuICAgICAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3RlclJlY2VpdmVyKGhhbmRsZXIpIHtcbiAgICB2YXIgaWQgICAgICAgICAgID0gJ0lEXycgKyBfaWQrKztcbiAgICBfcmVjZWl2ZXJNYXBbaWRdID0ge1xuICAgICAgaWQgICAgIDogaWQsXG4gICAgICBoYW5kbGVyOiBoYW5kbGVyXG4gICAgfTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSByZWNlaXZlciBoYW5kbGVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gdW5yZWdpc3RlclJlY2VpdmVyKGlkKSB7XG4gICAgaWYgKF9yZWNlaXZlck1hcC5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgIGRlbGV0ZSBfcmVjZWl2ZXJNYXBbaWRdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgdW5zdWJzY3JpYmUgICAgICAgOiB1bnN1YnNjcmliZSxcbiAgICBwdWJsaXNoICAgICAgICAgICA6IHB1Ymxpc2gsXG4gICAgZ2V0TG9nICAgICAgICAgICAgOiBnZXRMb2csXG4gICAgcmVnaXN0ZXJSZWNlaXZlciAgOiByZWdpc3RlclJlY2VpdmVyLFxuICAgIHVucmVnaXN0ZXJSZWNlaXZlcjogdW5yZWdpc3RlclJlY2VpdmVyXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2hlcigpOyIsIi8qKlxuICogQWRkIFJ4SlMgU3ViamVjdCB0byBhIG1vZHVsZS5cbiAqXG4gKiBBZGQgb25lIHNpbXBsZSBvYnNlcnZhYmxlIHN1YmplY3Qgb3IgbW9yZSBjb21wbGV4IGFiaWxpdHkgdG8gY3JlYXRlIG90aGVycyBmb3JcbiAqIG1vcmUgY29tcGxleCBldmVudGluZyBuZWVkcy5cbiAqL1xudmFyIE1peGluT2JzZXJ2YWJsZVN1YmplY3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICAgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9zdWJqZWN0TWFwID0ge307XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBzdWJqZWN0XG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3ViamVjdChuYW1lKSB7XG4gICAgaWYgKCFfc3ViamVjdE1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgX3N1YmplY3RNYXBbbmFtZV0gPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gX3N1YmplY3RNYXBbbmFtZV07XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIGhhbmRsZXIgdG8gdXBkYXRlcy4gSWYgdGhlIGhhbmRsZXIgaXMgYSBzdHJpbmcsIHRoZSBuZXcgc3ViamVjdFxuICAgKiB3aWxsIGJlIGNyZWF0ZWQuXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXJPck5hbWUsIG9wdEhhbmRsZXIpIHtcbiAgICBpZiAoaXMuc3RyaW5nKGhhbmRsZXJPck5hbWUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3ViamVjdChoYW5kbGVyT3JOYW1lKS5zdWJzY3JpYmUob3B0SGFuZGxlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlck9yTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHVwZGF0ZWQgdG8gc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICBfc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBuYW1lZCBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnNPZihuYW1lLCBwYXlsb2FkKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXS5vbk5leHQocGF5bG9hZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignTWl4aW5PYnNlcnZhYmxlU3ViamVjdCwgbm8gc3Vic2NyaWJlcnMgb2YgJyArIG5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIGNyZWF0ZVN1YmplY3QgICAgICA6IGNyZWF0ZVN1YmplY3QsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnMgIDogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnNPZjogbm90aWZ5U3Vic2NyaWJlcnNPZlxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluT2JzZXJ2YWJsZVN1YmplY3Q7IiwiLyoqXG4gKiBVdGlsaXR5IHRvIGhhbmRsZSBhbGwgdmlldyBET00gYXR0YWNobWVudCB0YXNrc1xuICovXG5cbnZhciBSZW5kZXJlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF9kb21VdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgZnVuY3Rpb24gcmVuZGVyKHBheWxvYWQpIHtcbiAgICB2YXIgdGFyZ2V0U2VsZWN0b3IgPSBwYXlsb2FkLnRhcmdldCxcbiAgICAgICAgaHRtbCAgICAgICAgICAgPSBwYXlsb2FkLmh0bWwsXG4gICAgICAgIGRvbUVsLFxuICAgICAgICBtb3VudFBvaW50ICAgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0U2VsZWN0b3IpLFxuICAgICAgICBjYiAgICAgICAgICAgICA9IHBheWxvYWQuY2FsbGJhY2s7XG5cbiAgICBtb3VudFBvaW50LmlubmVySFRNTCA9ICcnO1xuXG4gICAgaWYgKGh0bWwpIHtcbiAgICAgIGRvbUVsID0gX2RvbVV0aWxzLkhUTUxTdHJUb05vZGUoaHRtbCk7XG4gICAgICBtb3VudFBvaW50LmFwcGVuZENoaWxkKGRvbUVsKTtcbiAgICB9XG5cbiAgICBpZiAoY2IpIHtcbiAgICAgIGNiKGRvbUVsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZG9tRWw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlbmRlcjogcmVuZGVyXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVuZGVyZXIoKTsiLCIvKipcbiAqIFNpbXBsZSByb3V0ZXJcbiAqIFN1cHBvcnRpbmcgSUU5IHNvIHVzaW5nIGhhc2hlcyBpbnN0ZWFkIG9mIHRoZSBoaXN0b3J5IEFQSSBmb3Igbm93XG4gKi9cblxudmFyIFJvdXRlciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3QgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9oYXNoQ2hhbmdlT2JzZXJ2YWJsZSxcbiAgICAgIF9vYmpVdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzJyk7XG5cbiAgLyoqXG4gICAqIFNldCBldmVudCBoYW5kbGVyc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBfaGFzaENoYW5nZU9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh3aW5kb3csICdoYXNoY2hhbmdlJykuc3Vic2NyaWJlKG5vdGlmeVN1YnNjcmliZXJzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzdWJzY3JpYmUgYSBoYW5kbGVyIHRvIHRoZSB1cmwgY2hhbmdlIGV2ZW50c1xuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb3RpZnkgb2YgYSBjaGFuZ2UgaW4gcm91dGVcbiAgICogQHBhcmFtIGZyb21BcHAgVHJ1ZSBpZiB0aGUgcm91dGUgd2FzIGNhdXNlZCBieSBhbiBhcHAgZXZlbnQgbm90IFVSTCBvciBoaXN0b3J5IGNoYW5nZVxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMoKSB7XG4gICAgdmFyIGV2ZW50UGF5bG9hZCA9IHtcbiAgICAgIHJvdXRlT2JqOiBnZXRDdXJyZW50Um91dGUoKSwgLy8geyByb3V0ZTosIGRhdGE6IH1cbiAgICAgIGZyYWdtZW50OiBnZXRVUkxGcmFnbWVudCgpXG4gICAgfTtcblxuICAgIF9zdWJqZWN0Lm9uTmV4dChldmVudFBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgcm91dGUgYW5kIHF1ZXJ5IHN0cmluZyBmcm9tIHRoZSBjdXJyZW50IFVSTCBmcmFnbWVudFxuICAgKiBAcmV0dXJucyB7e3JvdXRlOiBzdHJpbmcsIHF1ZXJ5OiB7fX19XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDdXJyZW50Um91dGUoKSB7XG4gICAgdmFyIGZyYWdtZW50ICAgID0gZ2V0VVJMRnJhZ21lbnQoKSxcbiAgICAgICAgcGFydHMgICAgICAgPSBmcmFnbWVudC5zcGxpdCgnPycpLFxuICAgICAgICByb3V0ZSAgICAgICA9ICcvJyArIHBhcnRzWzBdLFxuICAgICAgICBxdWVyeVN0ciAgICA9IGRlY29kZVVSSUNvbXBvbmVudChwYXJ0c1sxXSksXG4gICAgICAgIHF1ZXJ5U3RyT2JqID0gcGFyc2VRdWVyeVN0cihxdWVyeVN0cik7XG5cbiAgICBpZiAocXVlcnlTdHIgPT09ICc9dW5kZWZpbmVkJykge1xuICAgICAgcXVlcnlTdHJPYmogPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3JvdXRlOiByb3V0ZSwgZGF0YTogcXVlcnlTdHJPYmp9O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHF1ZXJ5IHN0cmluZyBpbnRvIGtleS92YWx1ZSBwYWlyc1xuICAgKiBAcGFyYW0gcXVlcnlTdHJcbiAgICogQHJldHVybnMge3t9fVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VRdWVyeVN0cihxdWVyeVN0cikge1xuICAgIHZhciBvYmogICA9IHt9LFxuICAgICAgICBwYXJ0cyA9IHF1ZXJ5U3RyLnNwbGl0KCcmJyk7XG5cbiAgICBwYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChwYWlyU3RyKSB7XG4gICAgICB2YXIgcGFpckFyciAgICAgPSBwYWlyU3RyLnNwbGl0KCc9Jyk7XG4gICAgICBvYmpbcGFpckFyclswXV0gPSBwYWlyQXJyWzFdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21iaW5lcyBhIHJvdXRlIGFuZCBkYXRhIG9iamVjdCBpbnRvIGEgcHJvcGVyIFVSTCBoYXNoIGZyYWdtZW50XG4gICAqIEBwYXJhbSByb3V0ZVxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2V0KHJvdXRlLCBkYXRhT2JqKSB7XG4gICAgdmFyIHBhdGggPSByb3V0ZSxcbiAgICAgICAgZGF0YSA9IFtdO1xuICAgIGlmICghX29ialV0aWxzLmlzTnVsbChkYXRhT2JqKSkge1xuICAgICAgcGF0aCArPSBcIj9cIjtcbiAgICAgIGZvciAodmFyIHByb3AgaW4gZGF0YU9iaikge1xuICAgICAgICBpZiAocHJvcCAhPT0gJ3VuZGVmaW5lZCcgJiYgZGF0YU9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgIGRhdGEucHVzaChwcm9wICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGRhdGFPYmpbcHJvcF0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcGF0aCArPSBkYXRhLmpvaW4oJyYnKTtcbiAgICB9XG5cbiAgICB1cGRhdGVVUkxGcmFnbWVudChwYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlICd3aGF0ZXZlci5odG1sIycgaW4gdGhlIFVSTFxuICAgKiBMZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIGFyZSByZW1vdmVkXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRVUkxGcmFnbWVudCgpIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBsb2NhdGlvbi5oYXNoLnNsaWNlKDEpO1xuICAgIHJldHVybiBmcmFnbWVudC50b1N0cmluZygpLnJlcGxhY2UoL1xcLyQvLCAnJykucmVwbGFjZSgvXlxcLy8sICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIFVSTCBoYXNoIGZyYWdtZW50XG4gICAqIEBwYXJhbSBwYXRoXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVVUkxGcmFnbWVudChwYXRoKSB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBwYXRoO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBzdWJzY3JpYmUgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIG5vdGlmeVN1YnNjcmliZXJzOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRDdXJyZW50Um91dGUgIDogZ2V0Q3VycmVudFJvdXRlLFxuICAgIHNldCAgICAgICAgICAgICAgOiBzZXRcbiAgfTtcblxufTtcblxudmFyIHIgPSBSb3V0ZXIoKTtcbnIuaW5pdGlhbGl6ZSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHI7IiwiLyoqXG4gKiBSeEpTIEhlbHBlcnNcbiAqIEB0eXBlIHt7ZG9tOiBGdW5jdGlvbiwgZnJvbTogRnVuY3Rpb24sIGludGVydmFsOiBGdW5jdGlvbiwgZG9FdmVyeTogRnVuY3Rpb24sIGp1c3Q6IEZ1bmN0aW9uLCBlbXB0eTogRnVuY3Rpb259fVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBkb206IGZ1bmN0aW9uIChzZWxlY3RvciwgZXZlbnQpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBpZiAoIWVsKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ25vcmkvdXRpbHMvUngsIGRvbSwgaW52YWxpZCBET00gc2VsZWN0b3I6ICcgKyBzZWxlY3Rvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChlbCwgZXZlbnQudHJpbSgpKTtcbiAgfSxcblxuICBmcm9tOiBmdW5jdGlvbiAoaXR0cikge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb20oaXR0cik7XG4gIH0sXG5cbiAgaW50ZXJ2YWw6IGZ1bmN0aW9uIChtcykge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmludGVydmFsKG1zKTtcbiAgfSxcblxuICBkb0V2ZXJ5OiBmdW5jdGlvbiAobXMsIC4uLmFyZ3MpIHtcbiAgICBpZihpcy5mdW5jdGlvbihhcmdzWzBdKSkge1xuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnN1YnNjcmliZShhcmdzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnRha2UoYXJnc1swXSkuc3Vic2NyaWJlKGFyZ3NbMV0pO1xuICB9LFxuXG4gIGp1c3Q6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmp1c3QodmFsdWUpO1xuICB9LFxuXG4gIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZW1wdHkoKTtcbiAgfVxuXG59OyIsIi8qXG4gU2ltcGxlIHdyYXBwZXIgZm9yIFVuZGVyc2NvcmUgLyBIVE1MIHRlbXBsYXRlc1xuIE1hdHQgUGVya2luc1xuIDQvNy8xNVxuICovXG52YXIgVGVtcGxhdGluZyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3RlbXBsYXRlTWFwICAgICAgID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF90ZW1wbGF0ZUhUTUxDYWNoZSA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfdGVtcGxhdGVDYWNoZSAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX0RPTVV0aWxzICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiBhZGRUZW1wbGF0ZShpZCwgaHRtbCkge1xuICAgIF90ZW1wbGF0ZU1hcFtpZF0gPSBodG1sO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U291cmNlRnJvbVRlbXBsYXRlTWFwKGlkKSB7XG4gICAgdmFyIHNvdXJjZSA9IF90ZW1wbGF0ZU1hcFtpZF07XG4gICAgaWYgKHNvdXJjZSkge1xuICAgICAgcmV0dXJuIGNsZWFuVGVtcGxhdGVIVE1MKHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNvdXJjZUZyb21IVE1MKGlkKSB7XG4gICAgdmFyIHNyYyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSxcbiAgICAgICAgc3JjaHRtbDtcblxuICAgIGlmIChzcmMpIHtcbiAgICAgIHNyY2h0bWwgPSBzcmMuaW5uZXJIVE1MO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4oJ251ZG9ydS9jb3JlL1RlbXBsYXRpbmcsIHRlbXBsYXRlIG5vdCBmb3VuZDogXCInICsgaWQgKyAnXCInKTtcbiAgICAgIHNyY2h0bWwgPSAnPGRpdj5UZW1wbGF0ZSBub3QgZm91bmQ6ICcgKyBpZCArICc8L2Rpdj4nO1xuICAgIH1cblxuICAgIHJldHVybiBjbGVhblRlbXBsYXRlSFRNTChzcmNodG1sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHRlbXBsYXRlIGh0bWwgZnJvbSB0aGUgc2NyaXB0IHRhZyB3aXRoIGlkXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFNvdXJjZShpZCkge1xuICAgIGlmIChfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gX3RlbXBsYXRlSFRNTENhY2hlW2lkXTtcbiAgICB9XG5cbiAgICB2YXIgc291cmNlaHRtbCA9IGdldFNvdXJjZUZyb21UZW1wbGF0ZU1hcChpZCk7XG5cbiAgICBpZiAoIXNvdXJjZWh0bWwpIHtcbiAgICAgIHNvdXJjZWh0bWwgPSBnZXRTb3VyY2VGcm9tSFRNTChpZCk7XG4gICAgfVxuXG4gICAgX3RlbXBsYXRlSFRNTENhY2hlW2lkXSA9IHNvdXJjZWh0bWw7XG4gICAgcmV0dXJuIHNvdXJjZWh0bWw7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbGwgSURzIGJlbG9uZ2luZyB0byB0ZXh0L3RlbXBsYXRlIHR5cGUgc2NyaXB0IHRhZ3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0QWxsVGVtcGxhdGVJRHMoKSB7XG4gICAgdmFyIHNjcmlwdFRhZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JyksIDApO1xuXG4gICAgcmV0dXJuIHNjcmlwdFRhZ3MuZmlsdGVyKGZ1bmN0aW9uICh0YWcpIHtcbiAgICAgIHJldHVybiB0YWcuZ2V0QXR0cmlidXRlKCd0eXBlJykgPT09ICd0ZXh0L3RlbXBsYXRlJztcbiAgICB9KS5tYXAoZnVuY3Rpb24gKHRhZykge1xuICAgICAgcmV0dXJuIHRhZy5nZXRBdHRyaWJ1dGUoJ2lkJyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiB1bmRlcnNjb3JlIHRlbXBsYXRlXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFRlbXBsYXRlKGlkKSB7XG4gICAgaWYgKF90ZW1wbGF0ZUNhY2hlW2lkXSkge1xuICAgICAgcmV0dXJuIF90ZW1wbGF0ZUNhY2hlW2lkXTtcbiAgICB9XG4gICAgdmFyIHRlbXBsICAgICAgICAgID0gXy50ZW1wbGF0ZShnZXRTb3VyY2UoaWQpKTtcbiAgICBfdGVtcGxhdGVDYWNoZVtpZF0gPSB0ZW1wbDtcbiAgICByZXR1cm4gdGVtcGw7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSBhbmQgcmV0dXJucyBIVE1MXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYXNIVE1MKGlkLCBvYmopIHtcbiAgICB2YXIgdGVtcCA9IGdldFRlbXBsYXRlKGlkKTtcbiAgICByZXR1cm4gdGVtcChvYmopO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyB0aGUgdGVtcGxhdGUgYW5kIHJldHVybnMgYW4gSFRNTCBFbGVtZW50XG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYXNFbGVtZW50KGlkLCBvYmopIHtcbiAgICByZXR1cm4gX0RPTVV0aWxzLkhUTUxTdHJUb05vZGUoYXNIVE1MKGlkLCBvYmopKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbnMgdGVtcGxhdGUgSFRNTFxuICAgKi9cbiAgZnVuY3Rpb24gY2xlYW5UZW1wbGF0ZUhUTUwoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci50cmltKCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHJldHVybnMsIHNwYWNlcyBhbmQgdGFic1xuICAgKiBAcGFyYW0gc3RyXG4gICAqIEByZXR1cm5zIHtYTUx8c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlV2hpdGVTcGFjZShzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyhcXHJcXG58XFxufFxccnxcXHQpL2dtLCAnJykucmVwbGFjZSgvPlxccys8L2csICc+PCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb3ZlciBhbGwgdGVtcGxhdGVzLCBjbGVhbiB0aGVtIHVwIGFuZCBsb2dcbiAgICogVXRpbCBmb3IgU2hhcmVQb2ludCBwcm9qZWN0cywgPHNjcmlwdD4gYmxvY2tzIGFyZW4ndCBhbGxvd2VkXG4gICAqIFNvIHRoaXMgaGVscHMgY3JlYXRlIHRoZSBibG9ja3MgZm9yIGluc2VydGlvbiBpbiB0byB0aGUgRE9NXG4gICAqL1xuICBmdW5jdGlvbiBwcm9jZXNzRm9yRE9NSW5zZXJ0aW9uKCkge1xuICAgIHZhciBpZHMgPSBnZXRBbGxUZW1wbGF0ZUlEcygpO1xuICAgIGlkcy5mb3JFYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgdmFyIHNyYyA9IHJlbW92ZVdoaXRlU3BhY2UoZ2V0U291cmNlKGlkKSk7XG4gICAgICBjb25zb2xlLmxvZyhpZCwgc3JjKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSB0ZW1wbGF0ZSBzY3JpcHQgdGFnIHRvIHRoZSBET01cbiAgICogVXRpbCBmb3IgU2hhcmVQb2ludCBwcm9qZWN0cywgPHNjcmlwdD4gYmxvY2tzIGFyZW4ndCBhbGxvd2VkXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcGFyYW0gaHRtbFxuICAgKi9cbiAgLy9mdW5jdGlvbiBhZGRDbGllbnRTaWRlVGVtcGxhdGVUb0RPTShpZCwgaHRtbCkge1xuICAvLyAgdmFyIHMgICAgICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgLy8gIHMudHlwZSAgICAgID0gJ3RleHQvdGVtcGxhdGUnO1xuICAvLyAgcy5pZCAgICAgICAgPSBpZDtcbiAgLy8gIHMuaW5uZXJIVE1MID0gaHRtbDtcbiAgLy8gIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQocyk7XG4gIC8vfVxuXG4gIHJldHVybiB7XG4gICAgYWRkVGVtcGxhdGUgICAgICAgICAgIDogYWRkVGVtcGxhdGUsXG4gICAgZ2V0U291cmNlICAgICAgICAgICAgIDogZ2V0U291cmNlLFxuICAgIGdldEFsbFRlbXBsYXRlSURzICAgICA6IGdldEFsbFRlbXBsYXRlSURzLFxuICAgIHByb2Nlc3NGb3JET01JbnNlcnRpb246IHByb2Nlc3NGb3JET01JbnNlcnRpb24sXG4gICAgZ2V0VGVtcGxhdGUgICAgICAgICAgIDogZ2V0VGVtcGxhdGUsXG4gICAgYXNIVE1MICAgICAgICAgICAgICAgIDogYXNIVE1MLFxuICAgIGFzRWxlbWVudCAgICAgICAgICAgICA6IGFzRWxlbWVudFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRpbmcoKTsiLCJ2YXIgQXBwbGljYXRpb25WaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGhpcyxcbiAgICAgIF9kb21VdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0aWFsaXphdGlvblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZVxuICAgKiBAcGFyYW0gc2NhZmZvbGRUZW1wbGF0ZXMgdGVtcGxhdGUgSURzIHRvIGF0dGFjaGVkIHRvIHRoZSBib2R5IGZvciB0aGUgYXBwXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplQXBwbGljYXRpb25WaWV3KHNjYWZmb2xkVGVtcGxhdGVzKSB7XG4gICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgYXR0YWNoQXBwbGljYXRpb25TY2FmZm9sZGluZyhzY2FmZm9sZFRlbXBsYXRlcyk7XG4gIH1cblxuICAvKipcbiAgICogQXR0YWNoIGFwcCBIVE1MIHN0cnVjdHVyZVxuICAgKiBAcGFyYW0gdGVtcGxhdGVzXG4gICAqL1xuICBmdW5jdGlvbiBhdHRhY2hBcHBsaWNhdGlvblNjYWZmb2xkaW5nKHRlbXBsYXRlcykge1xuICAgIGlmICghdGVtcGxhdGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGJvZHlFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKTtcblxuICAgIHRlbXBsYXRlcy5mb3JFYWNoKGZ1bmN0aW9uICh0ZW1wbCkge1xuICAgICAgYm9keUVsLmFwcGVuZENoaWxkKF9kb21VdGlscy5IVE1MU3RyVG9Ob2RlKF90aGlzLnRlbXBsYXRlKCkuZ2V0U291cmNlKCd0ZW1wbGF0ZV9fJyArIHRlbXBsLCB7fSkpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZnRlciBhcHAgaW5pdGlhbGl6YXRpb24sIHJlbW92ZSB0aGUgbG9hZGluZyBtZXNzYWdlXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVMb2FkaW5nTWVzc2FnZSgpIHtcbiAgICB2YXIgY292ZXIgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbml0aWFsaXphdGlvbl9fY292ZXInKSxcbiAgICAgICAgbWVzc2FnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5pbml0aWFsaXphdGlvbl9fbWVzc2FnZScpO1xuXG4gICAgVHdlZW5MaXRlLnRvKGNvdmVyLCAxLCB7XG4gICAgICBhbHBoYTogMCwgZWFzZTogUXVhZC5lYXNlT3V0LCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdmVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY292ZXIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHdlZW5MaXRlLnRvKG1lc3NhZ2UsIDIsIHtcbiAgICAgIHRvcDogXCIrPTUwcHhcIiwgZWFzZTogUXVhZC5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY292ZXIucmVtb3ZlQ2hpbGQobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXc6IGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcsXG4gICAgcmVtb3ZlTG9hZGluZ01lc3NhZ2UgICAgIDogcmVtb3ZlTG9hZGluZ01lc3NhZ2VcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvblZpZXcoKTsiLCIvKipcbiAqIE1peGluIHZpZXcgdGhhdCBhbGxvd3MgZm9yIGNvbXBvbmVudCB2aWV3c1xuICovXG5cbnZhciBNaXhpbkNvbXBvbmVudFZpZXdzID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY29tcG9uZW50Vmlld01hcCAgICAgICAgICAgID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF9jb21wb25lbnRIVE1MVGVtcGxhdGVQcmVmaXggPSAndGVtcGxhdGVfXycsXG4gICAgICBfdGVtcGxhdGUgICAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHRlbXBsYXRlIG9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFRlbXBsYXRlKCkge1xuICAgIHJldHVybiBfdGVtcGxhdGU7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGEgY29tcG9uZW50IHRvIGEgbW91bnRpbmcgcG9pbnQuIElmIGEgc3RyaW5nIGlzIHBhc3NlZCxcbiAgICogdGhlIGNvcnJlY3Qgb2JqZWN0IHdpbGwgYmUgY3JlYXRlZCBmcm9tIHRoZSBmYWN0b3J5IG1ldGhvZCwgb3RoZXJ3aXNlLFxuICAgKiB0aGUgcGFzc2VkIGNvbXBvbmVudCBvYmplY3QgaXMgdXNlZC5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqIEBwYXJhbSBtb3VudFBvaW50XG4gICAqL1xuICBmdW5jdGlvbiBtYXBWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBjb21wb25lbnRJRG9yT2JqLCBtb3VudFBvaW50KSB7XG4gICAgdmFyIGNvbXBvbmVudE9iajtcblxuICAgIGlmICh0eXBlb2YgY29tcG9uZW50SURvck9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBjb21wb25lbnRGYWN0b3J5ID0gcmVxdWlyZShjb21wb25lbnRJRG9yT2JqKTtcbiAgICAgIGNvbXBvbmVudE9iaiAgICAgICAgID0gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRGYWN0b3J5KCkpKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudE9iaiA9IGNvbXBvbmVudElEb3JPYmo7XG4gICAgfVxuXG4gICAgX2NvbXBvbmVudFZpZXdNYXBbY29tcG9uZW50SURdID0ge1xuICAgICAgaHRtbFRlbXBsYXRlOiBfdGVtcGxhdGUuZ2V0VGVtcGxhdGUoX2NvbXBvbmVudEhUTUxUZW1wbGF0ZVByZWZpeCArIGNvbXBvbmVudElEKSxcbiAgICAgIGNvbnRyb2xsZXIgIDogY29tcG9uZW50T2JqLFxuICAgICAgbW91bnRQb2ludCAgOiBtb3VudFBvaW50XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGYWN0b3J5IHRvIGNyZWF0ZSBjb21wb25lbnQgdmlldyBtb2R1bGVzIGJ5IGNvbmNhdGluZyBtdWx0aXBsZSBzb3VyY2Ugb2JqZWN0c1xuICAgKiBAcGFyYW0gY29tcG9uZW50U291cmNlIEN1c3RvbSBtb2R1bGUgc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRTb3VyY2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbXBvbmVudFZpZXdGYWN0b3J5ICA9IHJlcXVpcmUoJy4vVmlld0NvbXBvbmVudC5qcycpLFxuICAgICAgICAgIGV2ZW50RGVsZWdhdG9yRmFjdG9yeSA9IHJlcXVpcmUoJy4vTWl4aW5FdmVudERlbGVnYXRvci5qcycpLFxuICAgICAgICAgIG9ic2VydmFibGVGYWN0b3J5ICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICAgICAgICBzaW1wbGVTdG9yZUZhY3RvcnkgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9TaW1wbGVTdG9yZS5qcycpLFxuICAgICAgICAgIGNvbXBvbmVudEFzc2VtYmx5LCBmaW5hbENvbXBvbmVudCwgcHJldmlvdXNJbml0aWFsaXplO1xuXG4gICAgICBjb21wb25lbnRBc3NlbWJseSA9IFtcbiAgICAgICAgY29tcG9uZW50Vmlld0ZhY3RvcnkoKSxcbiAgICAgICAgZXZlbnREZWxlZ2F0b3JGYWN0b3J5KCksXG4gICAgICAgIG9ic2VydmFibGVGYWN0b3J5KCksXG4gICAgICAgIHNpbXBsZVN0b3JlRmFjdG9yeSgpLFxuICAgICAgICBjb21wb25lbnRTb3VyY2VcbiAgICAgIF07XG5cbiAgICAgIGlmIChjb21wb25lbnRTb3VyY2UubWl4aW5zKSB7XG4gICAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gY29tcG9uZW50QXNzZW1ibHkuY29uY2F0KGNvbXBvbmVudFNvdXJjZS5taXhpbnMpO1xuICAgICAgfVxuXG4gICAgICBmaW5hbENvbXBvbmVudCA9IE5vcmkuYXNzaWduQXJyYXkoe30sIGNvbXBvbmVudEFzc2VtYmx5KTtcblxuICAgICAgLy8gQ29tcG9zZSBhIG5ldyBpbml0aWFsaXplIGZ1bmN0aW9uIGJ5IGluc2VydGluZyBjYWxsIHRvIGNvbXBvbmVudCBzdXBlciBtb2R1bGVcbiAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZSAgICAgICAgPSBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplO1xuICAgICAgZmluYWxDb21wb25lbnQuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIGluaXRpYWxpemUoaW5pdE9iaikge1xuICAgICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplQ29tcG9uZW50KGluaXRPYmopO1xuICAgICAgICBwcmV2aW91c0luaXRpYWxpemUuY2FsbChmaW5hbENvbXBvbmVudCwgaW5pdE9iaik7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gXy5hc3NpZ24oe30sIGZpbmFsQ29tcG9uZW50KTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgYSBtYXBwZWQgY29tcG9uZW50Vmlld1xuICAgKiBAcGFyYW0gY29tcG9uZW50SURcbiAgICogQHBhcmFtIGRhdGFPYmpcbiAgICovXG4gIGZ1bmN0aW9uIHNob3dWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBtb3VudFBvaW50KSB7XG4gICAgdmFyIGNvbXBvbmVudFZpZXcgPSBfY29tcG9uZW50Vmlld01hcFtjb21wb25lbnRJRF07XG4gICAgaWYgKCFjb21wb25lbnRWaWV3KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ05vIGNvbXBvbmVudFZpZXcgbWFwcGVkIGZvciBpZDogJyArIGNvbXBvbmVudElEKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWNvbXBvbmVudFZpZXcuY29udHJvbGxlci5pc0luaXRpYWxpemVkKCkpIHtcbiAgICAgIG1vdW50UG9pbnQgPSBtb3VudFBvaW50IHx8IGNvbXBvbmVudFZpZXcubW91bnRQb2ludDtcbiAgICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5pbml0aWFsaXplKHtcbiAgICAgICAgaWQgICAgICAgIDogY29tcG9uZW50SUQsXG4gICAgICAgIHRlbXBsYXRlICA6IGNvbXBvbmVudFZpZXcuaHRtbFRlbXBsYXRlLFxuICAgICAgICBtb3VudFBvaW50OiBtb3VudFBvaW50XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5jb21wb25lbnRSZW5kZXIoKTtcbiAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIubW91bnQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgY29weSBvZiB0aGUgbWFwIG9iamVjdCBmb3IgY29tcG9uZW50IHZpZXdzXG4gICAqIEByZXR1cm5zIHtudWxsfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29tcG9uZW50Vmlld01hcCgpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sIF9jb21wb25lbnRWaWV3TWFwKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGUgICAgICAgICAgIDogZ2V0VGVtcGxhdGUsXG4gICAgbWFwVmlld0NvbXBvbmVudCAgIDogbWFwVmlld0NvbXBvbmVudCxcbiAgICBjcmVhdGVDb21wb25lbnRWaWV3OiBjcmVhdGVDb21wb25lbnRWaWV3LFxuICAgIHNob3dWaWV3Q29tcG9uZW50ICA6IHNob3dWaWV3Q29tcG9uZW50LFxuICAgIGdldENvbXBvbmVudFZpZXdNYXA6IGdldENvbXBvbmVudFZpZXdNYXBcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkNvbXBvbmVudFZpZXdzKCk7IiwiLyoqXG4gKiBDb252ZW5pZW5jZSBtaXhpbiB0aGF0IG1ha2VzIGV2ZW50cyBlYXNpZXIgZm9yIHZpZXdzXG4gKlxuICogQmFzZWQgb24gQmFja2JvbmVcbiAqIFJldmlldyB0aGlzIGh0dHA6Ly9ibG9nLm1hcmlvbmV0dGVqcy5jb20vMjAxNS8wMi8xMi91bmRlcnN0YW5kaW5nLXRoZS1ldmVudC1oYXNoL2luZGV4Lmh0bWxcbiAqXG4gKiBFeGFtcGxlOlxuICogdGhpcy5zZXRFdmVudHMoe1xuICogICAgICAgICdjbGljayAjYnRuX21haW5fcHJvamVjdHMnOiBoYW5kbGVQcm9qZWN0c0J1dHRvbixcbiAqICAgICAgICAnY2xpY2sgI2J0bl9mb28sIGNsaWNrICNidG5fYmFyJzogaGFuZGxlRm9vQmFyQnV0dG9uc1xuICogICAgICB9KTtcbiAqIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAqXG4gKi9cblxudmFyIE1peGluRXZlbnREZWxlZ2F0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9ldmVudHNNYXAsXG4gICAgICBfZXZlbnRTdWJzY3JpYmVycyxcbiAgICAgIF9yeCA9IHJlcXVpcmUoJy4uL3V0aWxzL1J4Jyk7XG5cbiAgZnVuY3Rpb24gc2V0RXZlbnRzKGV2dE9iaikge1xuICAgIF9ldmVudHNNYXAgPSBldnRPYmo7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRFdmVudHMoKSB7XG4gICAgcmV0dXJuIF9ldmVudHNNYXA7XG4gIH1cblxuICAvKipcbiAgICogQXV0b21hdGVzIHNldHRpbmcgZXZlbnRzIG9uIERPTSBlbGVtZW50cy5cbiAgICogJ2V2dFN0ciBzZWxlY3Rvcic6Y2FsbGJhY2tcbiAgICogJ2V2dFN0ciBzZWxlY3RvciwgZXZ0U3RyIHNlbGVjdG9yJzogc2hhcmVkQ2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGRlbGVnYXRlRXZlbnRzKCkge1xuICAgIGlmICghX2V2ZW50c01hcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ldmVudFN1YnNjcmliZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAodmFyIGV2dFN0cmluZ3MgaW4gX2V2ZW50c01hcCkge1xuICAgICAgaWYgKF9ldmVudHNNYXAuaGFzT3duUHJvcGVydHkoZXZ0U3RyaW5ncykpIHtcblxuICAgICAgICB2YXIgbWFwcGluZ3MgICAgID0gZXZ0U3RyaW5ncy5zcGxpdCgnLCcpLFxuICAgICAgICAgICAgZXZlbnRIYW5kbGVyID0gX2V2ZW50c01hcFtldnRTdHJpbmdzXTtcblxuICAgICAgICBpZiAoIWlzLmZ1bmN0aW9uKGV2ZW50SGFuZGxlcikpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0V2ZW50RGVsZWdhdG9yLCBoYW5kbGVyIGZvciAnICsgZXZ0U3RyaW5ncyArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgICAgLy8gaHR0cHM6Ly9qc2xpbnRlcnJvcnMuY29tL2RvbnQtbWFrZS1mdW5jdGlvbnMtd2l0aGluLWEtbG9vcFxuICAgICAgICBtYXBwaW5ncy5mb3JFYWNoKGZ1bmN0aW9uIChldnRNYXApIHtcbiAgICAgICAgICBldnRNYXAgICAgICAgICAgICAgICAgICAgICAgICA9IGV2dE1hcC50cmltKCk7XG4gICAgICAgICAgdmFyIGV2ZW50U3RyICAgICAgICAgICAgICAgICAgPSBldnRNYXAuc3BsaXQoJyAnKVswXS50cmltKCksXG4gICAgICAgICAgICAgIHNlbGVjdG9yICAgICAgICAgICAgICAgICAgPSBldnRNYXAuc3BsaXQoJyAnKVsxXS50cmltKCk7XG4gICAgICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZ0U3RyaW5nc10gPSBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8qIGpzaGludCArVzA4MyAqL1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUhhbmRsZXIoc2VsZWN0b3IsIGV2ZW50U3RyLCBldmVudEhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3J4LmRvbShzZWxlY3RvciwgZXZlbnRTdHIpLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFubHkgcmVtb3ZlIGV2ZW50c1xuICAgKi9cbiAgZnVuY3Rpb24gdW5kZWxlZ2F0ZUV2ZW50cygpIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBldmVudCBpbiBfZXZlbnRTdWJzY3JpYmVycykge1xuICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZlbnRdLmRpc3Bvc2UoKTtcbiAgICAgIGRlbGV0ZSBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF07XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRFdmVudHMgICAgICAgOiBzZXRFdmVudHMsXG4gICAgZ2V0RXZlbnRzICAgICAgIDogZ2V0RXZlbnRzLFxuICAgIHVuZGVsZWdhdGVFdmVudHM6IHVuZGVsZWdhdGVFdmVudHMsXG4gICAgZGVsZWdhdGVFdmVudHMgIDogZGVsZWdhdGVFdmVudHNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkV2ZW50RGVsZWdhdG9yOyIsInZhciBNaXhpbk51ZG9ydUNvbnRyb2xzID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfbm90aWZpY2F0aW9uVmlldyAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9Ub2FzdFZpZXcuanMnKSxcbiAgICAgIF90b29sVGlwVmlldyAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzJyksXG4gICAgICBfbWVzc2FnZUJveFZpZXcgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Vmlldy5qcycpLFxuICAgICAgX21lc3NhZ2VCb3hDcmVhdG9yID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveENyZWF0b3IuanMnKSxcbiAgICAgIF9tb2RhbENvdmVyVmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01vZGFsQ292ZXJWaWV3LmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzKCkge1xuICAgIF90b29sVGlwVmlldy5pbml0aWFsaXplKCd0b29sdGlwX19jb250YWluZXInKTtcbiAgICBfbm90aWZpY2F0aW9uVmlldy5pbml0aWFsaXplKCd0b2FzdF9fY29udGFpbmVyJyk7XG4gICAgX21lc3NhZ2VCb3hWaWV3LmluaXRpYWxpemUoJ21lc3NhZ2Vib3hfX2NvbnRhaW5lcicpO1xuICAgIF9tb2RhbENvdmVyVmlldy5pbml0aWFsaXplKCk7XG4gIH1cblxuICBmdW5jdGlvbiBtYkNyZWF0b3IoKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Q3JlYXRvcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZE1lc3NhZ2VCb3gob2JqKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZU1lc3NhZ2VCb3goaWQpIHtcbiAgICBfbWVzc2FnZUJveFZpZXcucmVtb3ZlKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFsZXJ0KG1lc3NhZ2UsIHRpdGxlKSB7XG4gICAgcmV0dXJuIG1iQ3JlYXRvcigpLmFsZXJ0KHRpdGxlIHx8ICdBbGVydCcsIG1lc3NhZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTm90aWZpY2F0aW9uKG9iaikge1xuICAgIHJldHVybiBfbm90aWZpY2F0aW9uVmlldy5hZGQob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeShtZXNzYWdlLCB0aXRsZSwgdHlwZSkge1xuICAgIHJldHVybiBhZGROb3RpZmljYXRpb24oe1xuICAgICAgdGl0bGUgIDogdGl0bGUgfHwgJycsXG4gICAgICB0eXBlICAgOiB0eXBlIHx8IF9ub3RpZmljYXRpb25WaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplTnVkb3J1Q29udHJvbHM6IGluaXRpYWxpemVOdWRvcnVDb250cm9scyxcbiAgICBtYkNyZWF0b3IgICAgICAgICAgICAgICA6IG1iQ3JlYXRvcixcbiAgICBhZGRNZXNzYWdlQm94ICAgICAgICAgICA6IGFkZE1lc3NhZ2VCb3gsXG4gICAgcmVtb3ZlTWVzc2FnZUJveCAgICAgICAgOiByZW1vdmVNZXNzYWdlQm94LFxuICAgIGFkZE5vdGlmaWNhdGlvbiAgICAgICAgIDogYWRkTm90aWZpY2F0aW9uLFxuICAgIGFsZXJ0ICAgICAgICAgICAgICAgICAgIDogYWxlcnQsXG4gICAgbm90aWZ5ICAgICAgICAgICAgICAgICAgOiBub3RpZnlcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbk51ZG9ydUNvbnRyb2xzKCk7IiwiLyoqXG4gKiBNaXhpbiB2aWV3IHRoYXQgYWxsb3dzIGZvciBjb21wb25lbnQgdmlld3MgdG8gYmUgZGlzcGxheSBvbiBzdG9yZSBzdGF0ZSBjaGFuZ2VzXG4gKi9cblxudmFyIE1peGluU3RvcmVTdGF0ZVZpZXdzID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGhpcyxcbiAgICAgIF93YXRjaGVkU3RvcmUsXG4gICAgICBfY3VycmVudFZpZXdJRCxcbiAgICAgIF9jdXJyZW50U3RvcmVTdGF0ZSxcbiAgICAgIF9zdGF0ZVZpZXdNb3VudFBvaW50LFxuICAgICAgX3N0YXRlVmlld0lETWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvKipcbiAgICogU2V0IHVwIGxpc3RlbmVyc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVN0YXRlVmlld3Moc3RvcmUpIHtcbiAgICBfdGhpcyA9IHRoaXM7IC8vIG1pdGlnYXRpb24sIER1ZSB0byBldmVudHMsIHNjb3BlIG1heSBiZSBzZXQgdG8gdGhlIHdpbmRvdyBvYmplY3RcbiAgICBfd2F0Y2hlZFN0b3JlID0gc3RvcmU7XG5cbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3ZpZXdDaGFuZ2UnKTtcblxuICAgIF93YXRjaGVkU3RvcmUuc3Vic2NyaWJlKGZ1bmN0aW9uIG9uU3RhdGVDaGFuZ2UoKSB7XG4gICAgICBoYW5kbGVTdGF0ZUNoYW5nZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgcm91dGUgZnJvbSBVUkwgaGFzaCBvbiBjaGFuZ2VcbiAgICogQHBhcmFtIHJvdXRlT2JqXG4gICAqL1xuICBmdW5jdGlvbiBoYW5kbGVTdGF0ZUNoYW5nZSgpIHtcbiAgICBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlKCkge1xuICAgIHZhciBzdGF0ZSA9IF93YXRjaGVkU3RvcmUuZ2V0U3RhdGUoKS5jdXJyZW50U3RhdGU7XG4gICAgaWYgKHN0YXRlKSB7XG4gICAgICBpZiAoc3RhdGUgIT09IF9jdXJyZW50U3RvcmVTdGF0ZSkge1xuICAgICAgICBfY3VycmVudFN0b3JlU3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgc2hvd1N0YXRlVmlld0NvbXBvbmVudC5iaW5kKF90aGlzKShfY3VycmVudFN0b3JlU3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGxvY2F0aW9uIGZvciB0aGUgdmlldyB0byBtb3VudCBvbiByb3V0ZSBjaGFuZ2VzLCBhbnkgY29udGVudHMgd2lsbFxuICAgKiBiZSByZW1vdmVkIHByaW9yXG4gICAqIEBwYXJhbSBlbElEXG4gICAqL1xuICBmdW5jdGlvbiBzZXRWaWV3TW91bnRQb2ludChlbElEKSB7XG4gICAgX3N0YXRlVmlld01vdW50UG9pbnQgPSBlbElEO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Vmlld01vdW50UG9pbnQoKSB7XG4gICAgcmV0dXJuIF9zdGF0ZVZpZXdNb3VudFBvaW50O1xuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBhIHJvdXRlIHRvIGEgbW9kdWxlIHZpZXcgY29udHJvbGxlclxuICAgKiBAcGFyYW0gdGVtcGxhdGVJRFxuICAgKiBAcGFyYW0gY29tcG9uZW50SURvck9ialxuICAgKi9cbiAgZnVuY3Rpb24gbWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoc3RhdGUsIHRlbXBsYXRlSUQsIGNvbXBvbmVudElEb3JPYmopIHtcbiAgICBfc3RhdGVWaWV3SURNYXBbc3RhdGVdID0gdGVtcGxhdGVJRDtcbiAgICB0aGlzLm1hcFZpZXdDb21wb25lbnQodGVtcGxhdGVJRCwgY29tcG9uZW50SURvck9iaiwgX3N0YXRlVmlld01vdW50UG9pbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgYSB2aWV3IChpbiByZXNwb25zZSB0byBhIHJvdXRlIGNoYW5nZSlcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqL1xuICBmdW5jdGlvbiBzaG93U3RhdGVWaWV3Q29tcG9uZW50KHN0YXRlKSB7XG4gICAgdmFyIGNvbXBvbmVudElEID0gX3N0YXRlVmlld0lETWFwW3N0YXRlXTtcbiAgICBpZiAoIWNvbXBvbmVudElEKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJObyB2aWV3IG1hcHBlZCBmb3Igcm91dGU6IFwiICsgc3RhdGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJlbW92ZUN1cnJlbnRWaWV3KCk7XG5cbiAgICBfY3VycmVudFZpZXdJRCA9IGNvbXBvbmVudElEO1xuICAgIHRoaXMuc2hvd1ZpZXdDb21wb25lbnQoX2N1cnJlbnRWaWV3SUQpO1xuXG4gICAgLy8gVHJhbnNpdGlvbiBuZXcgdmlldyBpblxuICAgIFR3ZWVuTGl0ZS5zZXQoX3N0YXRlVmlld01vdW50UG9pbnQsIHthbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfc3RhdGVWaWV3TW91bnRQb2ludCwgMC4yNSwge2FscGhhOiAxLCBlYXNlOiBRdWFkLmVhc2VJbn0pO1xuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd2aWV3Q2hhbmdlJywgY29tcG9uZW50SUQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgY3VycmVudGx5IGRpc3BsYXllZCB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVDdXJyZW50VmlldygpIHtcbiAgICBpZiAoX2N1cnJlbnRWaWV3SUQpIHtcbiAgICAgIF90aGlzLmdldENvbXBvbmVudFZpZXdNYXAoKVtfY3VycmVudFZpZXdJRF0uY29udHJvbGxlci51bm1vdW50KCk7XG4gICAgfVxuICAgIF9jdXJyZW50Vmlld0lEID0gJyc7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVTdGF0ZVZpZXdzICAgICAgICA6IGluaXRpYWxpemVTdGF0ZVZpZXdzLFxuICAgIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGU6IHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUsXG4gICAgc2hvd1N0YXRlVmlld0NvbXBvbmVudCAgICAgIDogc2hvd1N0YXRlVmlld0NvbXBvbmVudCxcbiAgICBzZXRWaWV3TW91bnRQb2ludCAgICAgICAgICAgOiBzZXRWaWV3TW91bnRQb2ludCxcbiAgICBnZXRWaWV3TW91bnRQb2ludCAgICAgICAgICAgOiBnZXRWaWV3TW91bnRQb2ludCxcbiAgICBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudCAgICAgOiBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluU3RvcmVTdGF0ZVZpZXdzKCk7IiwiLyoqXG4gKiBCYXNlIG1vZHVsZSBmb3IgY29tcG9uZW50c1xuICogTXVzdCBiZSBleHRlbmRlZCB3aXRoIGN1c3RvbSBtb2R1bGVzXG4gKi9cblxudmFyIFZpZXdDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9pc0luaXRpYWxpemVkID0gZmFsc2UsXG4gICAgICBfY29uZmlnUHJvcHMsXG4gICAgICBfaWQsXG4gICAgICBfdGVtcGxhdGVPYmosXG4gICAgICBfaHRtbCxcbiAgICAgIF9ET01FbGVtZW50LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfY2hpbGRyZW4gICAgICA9IFtdLFxuICAgICAgX2lzTW91bnRlZCAgICAgPSBmYWxzZSxcbiAgICAgIF9yZW5kZXJlciAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvUmVuZGVyZXInKTtcblxuICAvKipcbiAgICogSW5pdGlhbGl6YXRpb25cbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplQ29tcG9uZW50KGNvbmZpZ1Byb3BzKSB7XG4gICAgX2NvbmZpZ1Byb3BzID0gY29uZmlnUHJvcHM7XG4gICAgX2lkICAgICAgICAgID0gY29uZmlnUHJvcHMuaWQ7XG4gICAgX3RlbXBsYXRlT2JqID0gY29uZmlnUHJvcHMudGVtcGxhdGU7XG4gICAgX21vdW50UG9pbnQgID0gY29uZmlnUHJvcHMubW91bnRQb2ludDtcblxuICAgIHRoaXMuc2V0U3RhdGUodGhpcy5nZXRJbml0aWFsU3RhdGUoKSk7XG4gICAgdGhpcy5zZXRFdmVudHModGhpcy5kZWZpbmVFdmVudHMoKSk7XG5cbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3VwZGF0ZScpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgnbW91bnQnKTtcbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3VubW91bnQnKTtcblxuICAgIF9pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZmluZUV2ZW50cygpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEJpbmQgdXBkYXRlcyB0byB0aGUgbWFwIElEIHRvIHRoaXMgdmlldydzIHVwZGF0ZVxuICAgKiBAcGFyYW0gbWFwSURvck9iaiBPYmplY3QgdG8gc3Vic2NyaWJlIHRvIG9yIElELiBTaG91bGQgaW1wbGVtZW50IG5vcmkvc3RvcmUvTWl4aW5PYnNlcnZhYmxlU3RvcmVcbiAgICovXG4gIGZ1bmN0aW9uIGJpbmRNYXAobWFwSURvck9iaikge1xuICAgIHZhciBtYXA7XG5cbiAgICBpZiAoaXMub2JqZWN0KG1hcElEb3JPYmopKSB7XG4gICAgICBtYXAgPSBtYXBJRG9yT2JqO1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXAgPSBOb3JpLnN0b3JlKCkuZ2V0TWFwKG1hcElEb3JPYmopIHx8IE5vcmkuc3RvcmUoKS5nZXRNYXBDb2xsZWN0aW9uKG1hcElEb3JPYmopO1xuICAgIH1cblxuICAgIGlmICghbWFwKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1ZpZXdDb21wb25lbnQgYmluZE1hcCwgbWFwIG9yIG1hcGNvbGxlY3Rpb24gbm90IGZvdW5kOiAnICsgbWFwSURvck9iaik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFpcy5mdW5jdGlvbihtYXAuc3Vic2NyaWJlKSkge1xuICAgICAgY29uc29sZS53YXJuKCdWaWV3Q29tcG9uZW50IGJpbmRNYXAsIG1hcCBvciBtYXBjb2xsZWN0aW9uIG11c3QgYmUgb2JzZXJ2YWJsZTogJyArIG1hcElEb3JPYmopO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG1hcC5zdWJzY3JpYmUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgY2hpbGRcbiAgICogQHBhcmFtIGNoaWxkXG4gICAqL1xuICAvL2Z1bmN0aW9uIGFkZENoaWxkKGNoaWxkKSB7XG4gIC8vICBfY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBjaGlsZFxuICAgKiBAcGFyYW0gY2hpbGRcbiAgICovXG4gIC8vZnVuY3Rpb24gcmVtb3ZlQ2hpbGQoY2hpbGQpIHtcbiAgLy8gIHZhciBpZHggPSBfY2hpbGRyZW4uaW5kZXhPZihjaGlsZCk7XG4gIC8vICBfY2hpbGRyZW5baWR4XS51bm1vdW50KCk7XG4gIC8vICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBCZWZvcmUgdGhlIHZpZXcgdXBkYXRlcyBhbmQgYSByZXJlbmRlciBvY2N1cnNcbiAgICogUmV0dXJucyBuZXh0U3RhdGUgb2YgY29tcG9uZW50XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnRXaWxsVXBkYXRlKCkge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIGN1cnJlbnRTdGF0ZSA9IHRoaXMuZ2V0U3RhdGUoKTtcbiAgICB2YXIgbmV4dFN0YXRlICAgID0gdGhpcy5jb21wb25lbnRXaWxsVXBkYXRlKCk7XG5cbiAgICBpZiAodGhpcy5zaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSkge1xuICAgICAgdGhpcy5zZXRTdGF0ZShuZXh0U3RhdGUpO1xuICAgICAgLy9fY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiB1cGRhdGVDaGlsZChjaGlsZCkge1xuICAgICAgLy8gIGNoaWxkLnVwZGF0ZSgpO1xuICAgICAgLy99KTtcblxuICAgICAgaWYgKF9pc01vdW50ZWQpIHtcbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkQ29tcG9uZW50UmVuZGVyKGN1cnJlbnRTdGF0ZSkpIHtcbiAgICAgICAgICB0aGlzLnVubW91bnQoKTtcbiAgICAgICAgICB0aGlzLmNvbXBvbmVudFJlbmRlcigpO1xuICAgICAgICAgIHRoaXMubW91bnQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1cGRhdGUnLCB0aGlzLmdldElEKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wYXJlIGN1cnJlbnQgc3RhdGUgYW5kIG5leHQgc3RhdGUgdG8gZGV0ZXJtaW5lIGlmIHVwZGF0aW5nIHNob3VsZCBvY2N1clxuICAgKiBAcGFyYW0gbmV4dFN0YXRlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvdWxkQ29tcG9uZW50VXBkYXRlKG5leHRTdGF0ZSkge1xuICAgIHJldHVybiBpcy5leGlzdHkobmV4dFN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaXQsIG5lZWQgdG8gYWRkIGl0IHRvIGEgcGFyZW50IGNvbnRhaW5lciwgaGFuZGxlZCBpbiBoaWdoZXIgbGV2ZWwgdmlld1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFJlbmRlcigpIHtcbiAgICAvL19jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIHJlbmRlckNoaWxkKGNoaWxkKSB7XG4gICAgLy8gIGNoaWxkLmNvbXBvbmVudFJlbmRlcigpO1xuICAgIC8vfSk7XG5cbiAgICBfaHRtbCA9IHRoaXMucmVuZGVyKHRoaXMuZ2V0U3RhdGUoKSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBNYXkgYmUgb3ZlcnJpZGRlbiBpbiBhIHN1Ym1vZHVsZSBmb3IgY3VzdG9tIHJlbmRlcmluZ1xuICAgKiBTaG91bGQgcmV0dXJuIEhUTUxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiByZW5kZXIoc3RhdGUpIHtcbiAgICByZXR1cm4gX3RlbXBsYXRlT2JqKHN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmQgaXQgdG8gYSBwYXJlbnQgZWxlbWVudFxuICAgKiBAcGFyYW0gbW91bnRFbFxuICAgKi9cbiAgZnVuY3Rpb24gbW91bnQoKSB7XG4gICAgaWYgKCFfaHRtbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb25lbnQgJyArIF9pZCArICcgY2Fubm90IG1vdW50IHdpdGggbm8gSFRNTC4gQ2FsbCByZW5kZXIoKSBmaXJzdD8nKTtcbiAgICB9XG5cbiAgICBfaXNNb3VudGVkID0gdHJ1ZTtcblxuICAgIF9ET01FbGVtZW50ID0gKF9yZW5kZXJlci5yZW5kZXIoe1xuICAgICAgdGFyZ2V0OiBfbW91bnRQb2ludCxcbiAgICAgIGh0bWwgIDogX2h0bWxcbiAgICB9KSk7XG5cbiAgICBpZiAodGhpcy5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50KSB7XG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdtb3VudCcsIHRoaXMuZ2V0SUQoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCBhZnRlciBpdCdzIGJlZW4gYWRkZWQgdG8gYSB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAvLyBzdHViXG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB3aGVuIHVubG9hZGluZ1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgZnVuY3Rpb24gdW5tb3VudCgpIHtcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KCk7XG4gICAgX2lzTW91bnRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMudW5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgfVxuXG4gICAgX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiAnJ1xuICAgIH0pO1xuXG4gICAgX2h0bWwgICAgICAgPSAnJztcbiAgICBfRE9NRWxlbWVudCA9IG51bGw7XG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1bm1vdW50JywgdGhpcy5nZXRJRCgpKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGlzSW5pdGlhbGl6ZWQoKSB7XG4gICAgcmV0dXJuIF9pc0luaXRpYWxpemVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnUHJvcHMoKSB7XG4gICAgcmV0dXJuIF9jb25maWdQcm9wcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTW91bnRlZCgpIHtcbiAgICByZXR1cm4gX2lzTW91bnRlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcbiAgICB0aGlzLnNldFN0YXRlKHt9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElEKCkge1xuICAgIHJldHVybiBfaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRET01FbGVtZW50KCkge1xuICAgIHJldHVybiBfRE9NRWxlbWVudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRlbXBsYXRlKCkge1xuICAgIHJldHVybiBfdGVtcGxhdGVPYmo7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUZW1wbGF0ZShodG1sKSB7XG4gICAgX3RlbXBsYXRlT2JqID0gXy50ZW1wbGF0ZShodG1sKTtcbiAgfVxuXG4gIC8vZnVuY3Rpb24gZ2V0Q2hpbGRyZW4oKSB7XG4gIC8vICByZXR1cm4gX2NoaWxkcmVuLnNsaWNlKDApO1xuICAvL31cblxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZUNvbXBvbmVudDogaW5pdGlhbGl6ZUNvbXBvbmVudCxcbiAgICBkZWZpbmVFdmVudHMgICAgICAgOiBkZWZpbmVFdmVudHMsXG4gICAgaXNJbml0aWFsaXplZCAgICAgIDogaXNJbml0aWFsaXplZCxcbiAgICBnZXRDb25maWdQcm9wcyAgICAgOiBnZXRDb25maWdQcm9wcyxcbiAgICBnZXRJbml0aWFsU3RhdGUgICAgOiBnZXRJbml0aWFsU3RhdGUsXG4gICAgZ2V0SUQgICAgICAgICAgICAgIDogZ2V0SUQsXG4gICAgZ2V0VGVtcGxhdGUgICAgICAgIDogZ2V0VGVtcGxhdGUsXG4gICAgc2V0VGVtcGxhdGUgICAgICAgIDogc2V0VGVtcGxhdGUsXG4gICAgZ2V0RE9NRWxlbWVudCAgICAgIDogZ2V0RE9NRWxlbWVudCxcbiAgICBpc01vdW50ZWQgICAgICAgICAgOiBpc01vdW50ZWQsXG5cbiAgICBiaW5kTWFwOiBiaW5kTWFwLFxuXG4gICAgY29tcG9uZW50V2lsbFVwZGF0ZSAgOiBjb21wb25lbnRXaWxsVXBkYXRlLFxuICAgIHNob3VsZENvbXBvbmVudFVwZGF0ZTogc2hvdWxkQ29tcG9uZW50VXBkYXRlLFxuICAgIHVwZGF0ZSAgICAgICAgICAgICAgIDogdXBkYXRlLFxuXG4gICAgY29tcG9uZW50UmVuZGVyOiBjb21wb25lbnRSZW5kZXIsXG4gICAgcmVuZGVyICAgICAgICAgOiByZW5kZXIsXG5cbiAgICBtb3VudCAgICAgICAgICAgIDogbW91bnQsXG4gICAgY29tcG9uZW50RGlkTW91bnQ6IGNvbXBvbmVudERpZE1vdW50LFxuXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGNvbXBvbmVudFdpbGxVbm1vdW50LFxuICAgIHVubW91bnQgICAgICAgICAgICAgOiB1bm1vdW50XG5cbiAgICAvL2FkZENoaWxkICAgOiBhZGRDaGlsZCxcbiAgICAvL3JlbW92ZUNoaWxkOiByZW1vdmVDaGlsZCxcbiAgICAvL2dldENoaWxkcmVuOiBnZXRDaGlsZHJlblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXdDb21wb25lbnQ7IiwidmFyIGJyb3dzZXJJbmZvID0ge1xuXG4gIGFwcFZlcnNpb24gOiBuYXZpZ2F0b3IuYXBwVmVyc2lvbixcbiAgdXNlckFnZW50ICA6IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gIGlzSUUgICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1TSUUgXCIpLFxuICBpc0lFNiAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgNlwiKSxcbiAgaXNJRTcgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDdcIiksXG4gIGlzSUU4ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA4XCIpLFxuICBpc0lFOSAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgOVwiKSxcbiAgaXNGRiAgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiRmlyZWZveC9cIiksXG4gIGlzQ2hyb21lICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkNocm9tZS9cIiksXG4gIGlzTWFjICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY2ludG9zaCxcIiksXG4gIGlzTWFjU2FmYXJpOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIlNhZmFyaVwiKSAmJiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY1wiKSAmJiAtMSA9PT0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiQ2hyb21lXCIpLFxuXG4gIGhhc1RvdWNoICAgIDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBub3RTdXBwb3J0ZWQ6ICh0aGlzLmlzSUU2IHx8IHRoaXMuaXNJRTcgfHwgdGhpcy5pc0lFOCB8fCB0aGlzLmlzSUU5KSxcblxuICBtb2JpbGU6IHtcbiAgICBBbmRyb2lkICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQW5kcm9pZC9pKTtcbiAgICB9LFxuICAgIEJsYWNrQmVycnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CbGFja0JlcnJ5L2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JCMTA7IFRvdWNoLyk7XG4gICAgfSxcbiAgICBpT1MgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lfGlQYWR8aVBvZC9pKTtcbiAgICB9LFxuICAgIE9wZXJhICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9PcGVyYSBNaW5pL2kpO1xuICAgIH0sXG4gICAgV2luZG93cyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0lFTW9iaWxlL2kpO1xuICAgIH0sXG4gICAgYW55ICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICh0aGlzLkFuZHJvaWQoKSB8fCB0aGlzLkJsYWNrQmVycnkoKSB8fCB0aGlzLmlPUygpIHx8IHRoaXMuT3BlcmEoKSB8fCB0aGlzLldpbmRvd3MoKSkgIT09IG51bGw7XG4gICAgfVxuXG4gIH0sXG5cbiAgLy8gVE9ETyBmaWx0ZXIgZm9yIElFID4gOVxuICBlbmhhbmNlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhX2Jyb3dzZXJJbmZvLmlzSUUgJiYgIV9icm93c2VySW5mby5tb2JpbGUuYW55KCk7XG4gIH0sXG5cbiAgbW91c2VEb3duRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiO1xuICB9LFxuXG4gIG1vdXNlVXBFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIjtcbiAgfSxcblxuICBtb3VzZUNsaWNrRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaGVuZFwiIDogXCJjbGlja1wiO1xuICB9LFxuXG4gIG1vdXNlTW92ZUV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYnJvd3NlckluZm87IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjM5OTkvaG93LXRvLXRlbGwtaWYtYS1kb20tZWxlbWVudC1pcy12aXNpYmxlLWluLXRoZS1jdXJyZW50LXZpZXdwb3J0XG4gIC8vIGVsZW1lbnQgbXVzdCBiZSBlbnRpcmVseSBvbiBzY3JlZW5cbiAgaXNFbGVtZW50RW50aXJlbHlJblZpZXdwb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiAoXG4gICAgICByZWN0LnRvcCA+PSAwICYmXG4gICAgICByZWN0LmxlZnQgPj0gMCAmJlxuICAgICAgcmVjdC5ib3R0b20gPD0gKHdpbmRvdy5pbm5lckhlaWdodCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSAmJlxuICAgICAgcmVjdC5yaWdodCA8PSAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKVxuICAgICk7XG4gIH0sXG5cbiAgLy8gZWxlbWVudCBtYXkgYmUgcGFydGlhbHkgb24gc2NyZWVuXG4gIGlzRWxlbWVudEluVmlld3BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIHJlY3QuYm90dG9tID4gMCAmJlxuICAgICAgcmVjdC5yaWdodCA+IDAgJiZcbiAgICAgIHJlY3QubGVmdCA8ICh3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpICYmXG4gICAgICByZWN0LnRvcCA8ICh3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCk7XG4gIH0sXG5cbiAgaXNEb21PYmo6IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gISEob2JqLm5vZGVUeXBlIHx8IChvYmogPT09IHdpbmRvdykpO1xuICB9LFxuXG4gIHBvc2l0aW9uOiBmdW5jdGlvbiAoZWwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGVmdDogZWwub2Zmc2V0TGVmdCxcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcFxuICAgIH07XG4gIH0sXG5cbiAgLy8gZnJvbSBodHRwOi8vanNwZXJmLmNvbS9qcXVlcnktb2Zmc2V0LXZzLW9mZnNldHBhcmVudC1sb29wXG4gIG9mZnNldDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIG9sID0gMCxcbiAgICAgICAgb3QgPSAwO1xuICAgIGlmIChlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICAgIGRvIHtcbiAgICAgICAgb2wgKz0gZWwub2Zmc2V0TGVmdDtcbiAgICAgICAgb3QgKz0gZWwub2Zmc2V0VG9wO1xuICAgICAgfSB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IG9sLFxuICAgICAgdG9wIDogb3RcbiAgICB9O1xuICB9LFxuXG4gIHJlbW92ZUFsbEVsZW1lbnRzOiBmdW5jdGlvbiAoZWwpIHtcbiAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgfVxuICB9LFxuXG4gIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80OTQxNDMvY3JlYXRpbmctYS1uZXctZG9tLWVsZW1lbnQtZnJvbS1hbi1odG1sLXN0cmluZy11c2luZy1idWlsdC1pbi1kb20tbWV0aG9kcy1vci1wcm9cbiAgSFRNTFN0clRvTm9kZTogZnVuY3Rpb24gKHN0cikge1xuICAgIHZhciB0ZW1wICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHI7XG4gICAgcmV0dXJuIHRlbXAuZmlyc3RDaGlsZDtcbiAgfSxcblxuICB3cmFwRWxlbWVudDogZnVuY3Rpb24gKHdyYXBwZXJTdHIsIGVsKSB7XG4gICAgdmFyIHdyYXBwZXJFbCA9IHRoaXMuSFRNTFN0clRvTm9kZSh3cmFwcGVyU3RyKSxcbiAgICAgICAgZWxQYXJlbnQgID0gZWwucGFyZW50Tm9kZTtcblxuICAgIHdyYXBwZXJFbC5hcHBlbmRDaGlsZChlbCk7XG4gICAgZWxQYXJlbnQuYXBwZW5kQ2hpbGQod3JhcHBlckVsKTtcbiAgICByZXR1cm4gd3JhcHBlckVsO1xuICB9LFxuXG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTUzMjkxNjcvY2xvc2VzdC1hbmNlc3Rvci1tYXRjaGluZy1zZWxlY3Rvci11c2luZy1uYXRpdmUtZG9tXG4gIGNsb3Nlc3Q6IGZ1bmN0aW9uIChlbCwgc2VsZWN0b3IpIHtcbiAgICB2YXIgbWF0Y2hlc1NlbGVjdG9yID0gZWwubWF0Y2hlcyB8fCBlbC53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHwgZWwubW96TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLm1zTWF0Y2hlc1NlbGVjdG9yO1xuICAgIHdoaWxlIChlbCkge1xuICAgICAgaWYgKG1hdGNoZXNTZWxlY3Rvci5iaW5kKGVsKShzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnRFbGVtZW50O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLy8gZnJvbSB5b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tXG4gIGhhc0NsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIGFkZENsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9XG4gIH0sXG5cbiAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH1cbiAgfSxcblxuICB0b2dnbGVDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gRnJvbSBpbXByZXNzLmpzXG4gIGFwcGx5Q1NTOiBmdW5jdGlvbiAoZWwsIHByb3BzKSB7XG4gICAgdmFyIGtleSwgcGtleTtcbiAgICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgZWwuc3R5bGVba2V5XSA9IHByb3BzW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbDtcbiAgfSxcblxuICAvLyBmcm9tIGltcHJlc3MuanNcbiAgLy8gYGNvbXB1dGVXaW5kb3dTY2FsZWAgY291bnRzIHRoZSBzY2FsZSBmYWN0b3IgYmV0d2VlbiB3aW5kb3cgc2l6ZSBhbmQgc2l6ZVxuICAvLyBkZWZpbmVkIGZvciB0aGUgcHJlc2VudGF0aW9uIGluIHRoZSBjb25maWcuXG4gIGNvbXB1dGVXaW5kb3dTY2FsZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgIHZhciBoU2NhbGUgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLyBjb25maWcuaGVpZ2h0LFxuICAgICAgICB3U2NhbGUgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIGNvbmZpZy53aWR0aCxcbiAgICAgICAgc2NhbGUgID0gaFNjYWxlID4gd1NjYWxlID8gd1NjYWxlIDogaFNjYWxlO1xuXG4gICAgaWYgKGNvbmZpZy5tYXhTY2FsZSAmJiBzY2FsZSA+IGNvbmZpZy5tYXhTY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWF4U2NhbGU7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5taW5TY2FsZSAmJiBzY2FsZSA8IGNvbmZpZy5taW5TY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWluU2NhbGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYW4gYXJyYXkgb2YgZWxlbWVudHMgaW4gdGhlIGNvbnRhaW5lciByZXR1cm5lZCBhcyBBcnJheSBpbnN0ZWFkIG9mIGEgTm9kZSBsaXN0XG4gICAqL1xuICBnZXRRU0VsZW1lbnRzQXNBcnJheTogZnVuY3Rpb24gKGVsLCBjbHMpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbChjbHMpLCAwKTtcbiAgfSxcblxuICBjZW50ZXJFbGVtZW50SW5WaWV3UG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHZwSCA9IHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgdnBXID0gd2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgIGVsUiA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICBlbEggPSBlbFIuaGVpZ2h0LFxuICAgICAgICBlbFcgPSBlbFIud2lkdGg7XG5cbiAgICBlbC5zdHlsZS5sZWZ0ID0gKHZwVyAvIDIpIC0gKGVsVyAvIDIpICsgJ3B4JztcbiAgICBlbC5zdHlsZS50b3AgID0gKHZwSCAvIDIpIC0gKGVsSCAvIDIpICsgJ3B4JztcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvYmplY3QgZnJvbSB0aGUgbmFtZSAob3IgaWQpIGF0dHJpYnMgYW5kIGRhdGEgb2YgYSBmb3JtXG4gICAqIEBwYXJhbSBlbFxuICAgKiBAcmV0dXJucyB7bnVsbH1cbiAgICovXG4gIGNhcHR1cmVGb3JtRGF0YTogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIGRhdGFPYmogPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgICB0ZXh0YXJlYUVscywgaW5wdXRFbHMsIHNlbGVjdEVscztcblxuICAgIHRleHRhcmVhRWxzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgndGV4dGFyZWEnKSwgMCk7XG4gICAgaW5wdXRFbHMgICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCcpLCAwKTtcbiAgICBzZWxlY3RFbHMgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NlbGVjdCcpLCAwKTtcblxuICAgIHRleHRhcmVhRWxzLmZvckVhY2goZ2V0SW5wdXRGb3JtRGF0YSk7XG4gICAgaW5wdXRFbHMuZm9yRWFjaChnZXRJbnB1dEZvcm1EYXRhKTtcbiAgICBzZWxlY3RFbHMuZm9yRWFjaChnZXRTZWxlY3RGb3JtRGF0YSk7XG5cbiAgICByZXR1cm4gZGF0YU9iajtcblxuICAgIGZ1bmN0aW9uIGdldElucHV0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSBmb3JtRWwudmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICB2YXIgc2VsID0gZm9ybUVsLnNlbGVjdGVkSW5kZXgsIHZhbCA9ICcnO1xuICAgICAgaWYgKHNlbCA+PSAwKSB7XG4gICAgICAgIHZhbCA9IGZvcm1FbC5vcHRpb25zW3NlbF0udmFsdWU7XG4gICAgICB9XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RWxOYW1lT3JJRChmb3JtRWwpIHtcbiAgICAgIHZhciBuYW1lID0gJ25vX25hbWUnO1xuICAgICAgaWYgKGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgICAgICBuYW1lID0gZm9ybUVsLmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgfSBlbHNlIGlmIChmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpKSB7XG4gICAgICAgIG5hbWUgPSBmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuICB9XG5cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBzaGFyZWQgM2QgcGVyc3BlY3RpdmUgZm9yIGFsbCBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5M0RUb0NvbnRhaW5lcjogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHBlcnNwZWN0aXZlICAgICAgOiA4MDAsXG4gICAgICAgIHBlcnNwZWN0aXZlT3JpZ2luOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbHkgYmFzaWMgQ1NTIHByb3BzXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHkzRFRvRWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHRyYW5zZm9ybVN0eWxlICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgIHRyYW5zZm9ybU9yaWdpbiAgIDogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGx5IGJhc2ljIDNkIHByb3BzIGFuZCBzZXQgdW5pcXVlIHBlcnNwZWN0aXZlIGZvciBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5VW5pcXVlM0RUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB0cmFuc2Zvcm1TdHlsZSAgICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHkgIDogXCJoaWRkZW5cIixcbiAgICAgICAgdHJhbnNmb3JtUGVyc3BlY3RpdmU6IDYwMCxcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luICAgICA6ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbn07XG4iLCJ2YXIgTWVzc2FnZUJveENyZWF0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tZXNzYWdlQm94VmlldyA9IHJlcXVpcmUoJy4vTWVzc2FnZUJveFZpZXcnKTtcblxuICBmdW5jdGlvbiBhbGVydCh0aXRsZSwgbWVzc2FnZSwgbW9kYWwsIGNiKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHA+JyArIG1lc3NhZ2UgKyAnPC9wPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRBTkdFUixcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ0Nsb3NlJyxcbiAgICAgICAgICBpZCAgICAgOiAnQ2xvc2UnLFxuICAgICAgICAgIHR5cGUgICA6ICcnLFxuICAgICAgICAgIGljb24gICA6ICd0aW1lcycsXG4gICAgICAgICAgb25DbGljazogY2JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlybSh0aXRsZSwgbWVzc2FnZSwgb2tDQiwgbW9kYWwpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cD4nICsgbWVzc2FnZSArICc8L3A+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ1Byb2NlZWQnLFxuICAgICAgICAgIGlkICAgICA6ICdwcm9jZWVkJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9tcHQodGl0bGUsIG1lc3NhZ2UsIG9rQ0IsIG1vZGFsKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHAgY2xhc3M9XCJ0ZXh0LWNlbnRlciBwYWRkaW5nLWJvdHRvbS1kb3VibGVcIj4nICsgbWVzc2FnZSArICc8L3A+PHRleHRhcmVhIG5hbWU9XCJyZXNwb25zZVwiIGNsYXNzPVwiaW5wdXQtdGV4dFwiIHR5cGU9XCJ0ZXh0XCIgc3R5bGU9XCJ3aWR0aDo0MDBweDsgaGVpZ2h0Ojc1cHg7IHJlc2l6ZTogbm9uZVwiIGF1dG9mb2N1cz1cInRydWVcIj48L3RleHRhcmVhPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQ1MCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdQcm9jZWVkJyxcbiAgICAgICAgICBpZCAgICAgOiAncHJvY2VlZCcsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hvaWNlKHRpdGxlLCBtZXNzYWdlLCBzZWxlY3Rpb25zLCBva0NCLCBtb2RhbCkge1xuICAgIHZhciBzZWxlY3RIVE1MID0gJzxzZWxlY3QgY2xhc3M9XCJzcGFjZWRcIiBzdHlsZT1cIndpZHRoOjQ1MHB4O2hlaWdodDoyMDBweFwiIG5hbWU9XCJzZWxlY3Rpb25cIiBhdXRvZm9jdXM9XCJ0cnVlXCIgc2l6ZT1cIjIwXCI+JztcblxuICAgIHNlbGVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAob3B0KSB7XG4gICAgICBzZWxlY3RIVE1MICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIG9wdC52YWx1ZSArICdcIiAnICsgKG9wdC5zZWxlY3RlZCA9PT0gJ3RydWUnID8gJ3NlbGVjdGVkJyA6ICcnKSArICc+JyArIG9wdC5sYWJlbCArICc8L29wdGlvbj4nO1xuICAgIH0pO1xuXG4gICAgc2VsZWN0SFRNTCArPSAnPC9zZWxlY3Q+JztcblxuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwIGNsYXNzPVwidGV4dC1jZW50ZXIgcGFkZGluZy1ib3R0b20tZG91YmxlXCI+JyArIG1lc3NhZ2UgKyAnPC9wPjxkaXYgY2xhc3M9XCJ0ZXh0LWNlbnRlclwiPicgKyBzZWxlY3RIVE1MICsgJzwvZGl2PicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDUwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdPSycsXG4gICAgICAgICAgaWQgICAgIDogJ29rJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFsZXJ0ICA6IGFsZXJ0LFxuICAgIGNvbmZpcm06IGNvbmZpcm0sXG4gICAgcHJvbXB0IDogcHJvbXB0LFxuICAgIGNob2ljZSA6IGNob2ljZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VCb3hDcmVhdG9yKCk7IiwidmFyIE1lc3NhZ2VCb3hWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2hpZ2hlc3RaICAgICAgICAgICAgICAgPSAxMDAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCAgICAgICAgICAgPSA0MDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ21lc3NhZ2Vib3hfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ21lc3NhZ2Vib3hfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAnbWVzc2FnZWJveF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICdtZXNzYWdlYm94X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfYnV0dG9uSWNvblRlbXBsYXRlSUQgICA9ICd0ZW1wbGF0ZV9fbWVzc2FnZWJveC0tYnV0dG9uLWljb24nLFxuICAgICAgX2J1dHRvbk5vSWNvblRlbXBsYXRlSUQgPSAndGVtcGxhdGVfX21lc3NhZ2Vib3gtLWJ1dHRvbi1ub2ljb24nLFxuICAgICAgX3RlbXBsYXRlICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9tb2RhbCAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9Nb2RhbENvdmVyVmlldy5qcycpLFxuICAgICAgX2Jyb3dzZXJJbmZvICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpLFxuICAgICAgX2NvbXBvbmVudFV0aWxzICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzJyk7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIHNldCB0aGUgbW91bnQgcG9pbnQgLyBib3ggY29udGFpbmVyXG4gICAqIEBwYXJhbSBlbElEXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIG5ldyBtZXNzYWdlIGJveFxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgdmFyIHR5cGUgICA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVCxcbiAgICAgICAgYm94T2JqID0gY3JlYXRlQm94T2JqZWN0KGluaXRPYmopO1xuXG4gICAgLy8gc2V0dXBcbiAgICBfY2hpbGRyZW4ucHVzaChib3hPYmopO1xuICAgIF9tb3VudFBvaW50LmFwcGVuZENoaWxkKGJveE9iai5lbGVtZW50KTtcbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgYm94T2JqLmVsZW1lbnQpO1xuICAgIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKTtcblxuICAgIF9jb21wb25lbnRVdGlscy5hcHBseVVuaXF1ZTNEVG9FbGVtZW50KGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIFNldCAzZCBDU1MgcHJvcHMgZm9yIGluL291dCB0cmFuc2l0aW9uXG4gICAgVHdlZW5MaXRlLnNldChib3hPYmouZWxlbWVudCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHpJbmRleDogX2hpZ2hlc3RaLFxuICAgICAgICB3aWR0aCA6IGluaXRPYmoud2lkdGggPyBpbml0T2JqLndpZHRoIDogX2RlZmF1bHRXaWR0aFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gY2VudGVyIGFmdGVyIHdpZHRoIGhhcyBiZWVuIHNldFxuICAgIF9kb21VdGlscy5jZW50ZXJFbGVtZW50SW5WaWV3UG9ydChib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBNYWtlIGl0IGRyYWdnYWJsZVxuICAgIERyYWdnYWJsZS5jcmVhdGUoJyMnICsgYm94T2JqLmlkLCB7XG4gICAgICBib3VuZHMgOiB3aW5kb3csXG4gICAgICBvblByZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9oaWdoZXN0WiA9IERyYWdnYWJsZS56SW5kZXg7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBTaG93IGl0XG4gICAgdHJhbnNpdGlvbkluKGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIFNob3cgdGhlIG1vZGFsIGNvdmVyXG4gICAgaWYgKGluaXRPYmoubW9kYWwpIHtcbiAgICAgIF9tb2RhbC5zaG93Tm9uRGlzbWlzc2FibGUodHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJveE9iai5pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NpZ24gYSB0eXBlIGNsYXNzIHRvIGl0XG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBlbGVtZW50XG4gICAqL1xuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBvYmplY3QgZm9yIGEgYm94XG4gICAqIEBwYXJhbSBpbml0T2JqXG4gICAqIEByZXR1cm5zIHt7ZGF0YU9iajogKiwgaWQ6IHN0cmluZywgbW9kYWw6ICgqfGJvb2xlYW4pLCBlbGVtZW50OiAqLCBzdHJlYW1zOiBBcnJheX19XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVCb3hPYmplY3QoaW5pdE9iaikge1xuICAgIHZhciBpZCAgPSAnanNfX21lc3NhZ2Vib3gtJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgZGF0YU9iajogaW5pdE9iaixcbiAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICBtb2RhbCAgOiBpbml0T2JqLm1vZGFsLFxuICAgICAgICAgIGVsZW1lbnQ6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ3RlbXBsYXRlX19tZXNzYWdlYm94LS1kZWZhdWx0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiBpbml0T2JqLnRpdGxlLFxuICAgICAgICAgICAgY29udGVudDogaW5pdE9iai5jb250ZW50XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc3RyZWFtczogW11cbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHVwIHRoZSBidXR0b25zXG4gICAqIEBwYXJhbSBib3hPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKSB7XG4gICAgdmFyIGJ1dHRvbkRhdGEgPSBib3hPYmouZGF0YU9iai5idXR0b25zO1xuXG4gICAgLy8gZGVmYXVsdCBidXR0b24gaWYgbm9uZVxuICAgIGlmICghYnV0dG9uRGF0YSkge1xuICAgICAgYnV0dG9uRGF0YSA9IFt7XG4gICAgICAgIGxhYmVsOiAnQ2xvc2UnLFxuICAgICAgICB0eXBlIDogJycsXG4gICAgICAgIGljb24gOiAndGltZXMnLFxuICAgICAgICBpZCAgIDogJ2RlZmF1bHQtY2xvc2UnXG4gICAgICB9XTtcbiAgICB9XG5cbiAgICB2YXIgYnV0dG9uQ29udGFpbmVyID0gYm94T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmZvb3Rlci1idXR0b25zJyk7XG5cbiAgICBfZG9tVXRpbHMucmVtb3ZlQWxsRWxlbWVudHMoYnV0dG9uQ29udGFpbmVyKTtcblxuICAgIGJ1dHRvbkRhdGEuZm9yRWFjaChmdW5jdGlvbiBtYWtlQnV0dG9uKGJ1dHRvbk9iaikge1xuICAgICAgYnV0dG9uT2JqLmlkID0gYm94T2JqLmlkICsgJy1idXR0b24tJyArIGJ1dHRvbk9iai5pZDtcblxuICAgICAgdmFyIGJ1dHRvbkVsO1xuXG4gICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdpY29uJykpIHtcbiAgICAgICAgYnV0dG9uRWwgPSBfdGVtcGxhdGUuYXNFbGVtZW50KF9idXR0b25JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1dHRvbkVsID0gX3RlbXBsYXRlLmFzRWxlbWVudChfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH1cblxuICAgICAgYnV0dG9uQ29udGFpbmVyLmFwcGVuZENoaWxkKGJ1dHRvbkVsKTtcblxuICAgICAgdmFyIGJ0blN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKVxuICAgICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdvbkNsaWNrJykpIHtcbiAgICAgICAgICAgIGlmIChidXR0b25PYmoub25DbGljaykge1xuICAgICAgICAgICAgICBidXR0b25PYmoub25DbGljay5jYWxsKHRoaXMsIGNhcHR1cmVGb3JtRGF0YShib3hPYmouaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVtb3ZlKGJveE9iai5pZCk7XG4gICAgICAgIH0pO1xuICAgICAgYm94T2JqLnN0cmVhbXMucHVzaChidG5TdHJlYW0pO1xuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBkYXRhIGZyb20gdGhlIGZvcm0gb24gdGhlIGJveCBjb250ZW50c1xuICAgKiBAcGFyYW0gYm94SURcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjYXB0dXJlRm9ybURhdGEoYm94SUQpIHtcbiAgICByZXR1cm4gX2RvbVV0aWxzLmNhcHR1cmVGb3JtRGF0YShnZXRPYmpCeUlEKGJveElEKS5lbGVtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBib3ggZnJvbSB0aGUgc2NyZWVuIC8gY29udGFpbmVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIGJveE9iajtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG4gICAgICB0cmFuc2l0aW9uT3V0KGJveE9iai5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvdyB0aGUgYm94XG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLCB7YWxwaGE6IDAsIHJvdGF0aW9uWDogNDUsIHNjYWxlOiAyfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGFscGhhICAgIDogMSxcbiAgICAgIHJvdGF0aW9uWDogMCxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBib3hcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjI1LCB7XG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICByb3RhdGlvblg6IC00NSxcbiAgICAgIHNjYWxlICAgIDogMC4yNSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFuIHVwIGFmdGVyIHRoZSB0cmFuc2l0aW9uIG91dCBhbmltYXRpb25cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG5cbiAgICBib3hPYmouc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgIHN0cmVhbS5kaXNwb3NlKCk7XG4gICAgfSk7XG5cbiAgICBEcmFnZ2FibGUuZ2V0KCcjJyArIGJveE9iai5pZCkuZGlzYWJsZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuXG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcblxuICAgIGNoZWNrTW9kYWxTdGF0dXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgYW55IG9wZW4gYm94ZXMgaGF2ZSBtb2RhbCB0cnVlXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja01vZGFsU3RhdHVzKCkge1xuICAgIHZhciBpc01vZGFsID0gZmFsc2U7XG5cbiAgICBfY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoYm94T2JqKSB7XG4gICAgICBpZiAoYm94T2JqLm1vZGFsID09PSB0cnVlKSB7XG4gICAgICAgIGlzTW9kYWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFpc01vZGFsKSB7XG4gICAgICBfbW9kYWwuaGlkZSh0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXRpbGl0eSB0byBnZXQgdGhlIGJveCBvYmplY3QgaW5kZXggYnkgSURcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVdGlsaXR5IHRvIGdldCB0aGUgYm94IG9iamVjdCBieSBJRFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlQm94VmlldygpOyIsInZhciBNb2RhbENvdmVyVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX21vdW50UG9pbnQgID0gZG9jdW1lbnQsXG4gICAgICBfbW9kYWxDb3ZlckVsLFxuICAgICAgX21vZGFsQmFja2dyb3VuZEVsLFxuICAgICAgX21vZGFsQ2xvc2VCdXR0b25FbCxcbiAgICAgIF9tb2RhbENsaWNrU3RyZWFtLFxuICAgICAgX2lzVmlzaWJsZSxcbiAgICAgIF9ub3REaXNtaXNzaWJsZSxcbiAgICAgIF9icm93c2VySW5mbyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblxuICAgIF9pc1Zpc2libGUgPSB0cnVlO1xuXG4gICAgX21vZGFsQ292ZXJFbCAgICAgICA9IF9tb3VudFBvaW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbF9fY292ZXInKTtcbiAgICBfbW9kYWxCYWNrZ3JvdW5kRWwgID0gX21vdW50UG9pbnQucXVlcnlTZWxlY3RvcignLm1vZGFsX19iYWNrZ3JvdW5kJyk7XG4gICAgX21vZGFsQ2xvc2VCdXR0b25FbCA9IF9tb3VudFBvaW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbF9fY2xvc2UtYnV0dG9uJyk7XG5cbiAgICB2YXIgbW9kYWxCR0NsaWNrICAgICA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KF9tb2RhbEJhY2tncm91bmRFbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIG1vZGFsQnV0dG9uQ2xpY2sgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChfbW9kYWxDbG9zZUJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKTtcblxuICAgIF9tb2RhbENsaWNrU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5tZXJnZShtb2RhbEJHQ2xpY2ssIG1vZGFsQnV0dG9uQ2xpY2spXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25Nb2RhbENsaWNrKCk7XG4gICAgICB9KTtcblxuICAgIGhpZGUoZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SXNWaXNpYmxlKCkge1xuICAgIHJldHVybiBfaXNWaXNpYmxlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Nb2RhbENsaWNrKCkge1xuICAgIGlmIChfbm90RGlzbWlzc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaGlkZSh0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpIHtcbiAgICBfaXNWaXNpYmxlICAgPSB0cnVlO1xuICAgIHZhciBkdXJhdGlvbiA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ292ZXJFbCwgZHVyYXRpb24sIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbEJhY2tncm91bmRFbCwgZHVyYXRpb24sIHtcbiAgICAgIGFscGhhOiAxLFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdyhzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKF9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfbm90RGlzbWlzc2libGUgPSBmYWxzZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuXG4gICAgVHdlZW5MaXRlLnNldChfbW9kYWxDbG9zZUJ1dHRvbkVsLCB7c2NhbGU6IDIsIGFscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENsb3NlQnV0dG9uRWwsIDEsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQm91bmNlLmVhc2VPdXQsXG4gICAgICBkZWxheSAgICA6IDFcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBICdoYXJkJyBtb2RhbCB2aWV3IGNhbm5vdCBiZSBkaXNtaXNzZWQgd2l0aCBhIGNsaWNrLCBtdXN0IGJlIHZpYSBjb2RlXG4gICAqIEBwYXJhbSBzaG91bGRBbmltYXRlXG4gICAqL1xuICBmdW5jdGlvbiBzaG93Tm9uRGlzbWlzc2FibGUoc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NpYmxlID0gdHJ1ZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAwLCB7YXV0b0FscGhhOiAwfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoIV9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX2lzVmlzaWJsZSAgICAgID0gZmFsc2U7XG4gICAgX25vdERpc21pc3NpYmxlID0gZmFsc2U7XG4gICAgdmFyIGR1cmF0aW9uICAgID0gc2hvdWxkQW5pbWF0ZSA/IDAuMjUgOiAwO1xuICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8oX21vZGFsQ2xvc2VCdXR0b25FbCk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCBkdXJhdGlvbiAvIDIsIHtcbiAgICAgIGF1dG9BbHBoYTogMCxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldE9wYWNpdHkob3BhY2l0eSkge1xuICAgIGlmIChvcGFjaXR5IDwgMCB8fCBvcGFjaXR5ID4gMSkge1xuICAgICAgY29uc29sZS5sb2coJ251ZG9ydS9jb21wb25lbnQvTW9kYWxDb3ZlclZpZXc6IHNldE9wYWNpdHk6IG9wYWNpdHkgc2hvdWxkIGJlIGJldHdlZW4gMCBhbmQgMScpO1xuICAgICAgb3BhY2l0eSA9IDE7XG4gICAgfVxuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGFscGhhOiBvcGFjaXR5LFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q29sb3IociwgZywgYikge1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGJhY2tncm91bmRDb2xvcjogJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknLFxuICAgICAgZWFzZSAgICAgICAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHNob3cgICAgICAgICAgICAgIDogc2hvdyxcbiAgICBzaG93Tm9uRGlzbWlzc2FibGU6IHNob3dOb25EaXNtaXNzYWJsZSxcbiAgICBoaWRlICAgICAgICAgICAgICA6IGhpZGUsXG4gICAgdmlzaWJsZSAgICAgICAgICAgOiBnZXRJc1Zpc2libGUsXG4gICAgc2V0T3BhY2l0eSAgICAgICAgOiBzZXRPcGFjaXR5LFxuICAgIHNldENvbG9yICAgICAgICAgIDogc2V0Q29sb3JcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbENvdmVyVmlldygpOyIsInZhciBUb2FzdFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgICAgICAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2RlZmF1bHRFeHBpcmVEdXJhdGlvbiA9IDcwMDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCAgICAgICAgICA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICd0b2FzdF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAndG9hc3RfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9hc3RfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAndG9hc3RfX2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyksXG4gICAgICBfY29tcG9uZW50VXRpbHMgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvL29iai50aXRsZSwgb2JqLmNvbnRlbnQsIG9iai50eXBlXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvYXN0T2JqID0gY3JlYXRlVG9hc3RPYmplY3QoaW5pdE9iai50aXRsZSwgaW5pdE9iai5tZXNzYWdlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvYXN0T2JqKTtcblxuICAgIF9tb3VudFBvaW50Lmluc2VydEJlZm9yZSh0b2FzdE9iai5lbGVtZW50LCBfbW91bnRQb2ludC5maXJzdENoaWxkKTtcblxuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudChpbml0T2JqLnR5cGUsIHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0NvbnRhaW5lcihfbW91bnRQb2ludCk7XG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0VsZW1lbnQodG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICB2YXIgY2xvc2VCdG4gICAgICAgICA9IHRvYXN0T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLnRvYXN0X19pdGVtLWNvbnRyb2xzID4gYnV0dG9uJyksXG4gICAgICAgIGNsb3NlQnRuU3RlYW0gICAgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChjbG9zZUJ0biwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIGV4cGlyZVRpbWVTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKF9kZWZhdWx0RXhwaXJlRHVyYXRpb24pO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbSA9IFJ4Lk9ic2VydmFibGUubWVyZ2UoY2xvc2VCdG5TdGVhbSwgZXhwaXJlVGltZVN0cmVhbSkudGFrZSgxKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlbW92ZSh0b2FzdE9iai5pZCk7XG4gICAgICB9KTtcblxuICAgIHRyYW5zaXRpb25Jbih0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIHJldHVybiB0b2FzdE9iai5pZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvYXN0T2JqZWN0KHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgdmFyIGlkICA9ICdqc19fdG9hc3QtdG9hc3RpdGVtLScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGlkICAgICAgICAgICAgICAgICA6IGlkLFxuICAgICAgICAgIGVsZW1lbnQgICAgICAgICAgICA6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ3RlbXBsYXRlX19jb21wb25lbnQtLXRvYXN0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBkZWZhdWx0QnV0dG9uU3RyZWFtOiBudWxsXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIHRvYXN0O1xuXG4gICAgaWYgKGlkeCA+IC0xKSB7XG4gICAgICB0b2FzdCA9IF9jaGlsZHJlbltpZHhdO1xuICAgICAgcmVhcnJhbmdlKGlkeCk7XG4gICAgICB0cmFuc2l0aW9uT3V0KHRvYXN0LmVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMCwge2FscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAxLCB7YWxwaGE6IDEsIGVhc2U6IFF1YWQuZWFzZU91dH0pO1xuICAgIHJlYXJyYW5nZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4yNSwge1xuICAgICAgcm90YXRpb25YOiAtNDUsXG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZUluLCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKSB7XG4gICAgdmFyIGlkeCAgICAgICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgdG9hc3RPYmogICA9IF9jaGlsZHJlbltpZHhdO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbS5kaXNwb3NlKCk7XG5cbiAgICBfbW91bnRQb2ludC5yZW1vdmVDaGlsZChlbCk7XG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYXJyYW5nZShpZ25vcmUpIHtcbiAgICB2YXIgaSA9IF9jaGlsZHJlbi5sZW5ndGggLSAxLFxuICAgICAgICBjdXJyZW50LFxuICAgICAgICB5ID0gMDtcblxuICAgIGZvciAoOyBpID4gLTE7IGktLSkge1xuICAgICAgaWYgKGkgPT09IGlnbm9yZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnQgPSBfY2hpbGRyZW5baV07XG4gICAgICBUd2VlbkxpdGUudG8oY3VycmVudC5lbGVtZW50LCAwLjc1LCB7eTogeSwgZWFzZTogQm91bmNlLmVhc2VPdXR9KTtcbiAgICAgIHkgKz0gMTAgKyBjdXJyZW50LmVsZW1lbnQuY2xpZW50SGVpZ2h0O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG9hc3RWaWV3KCk7IiwidmFyIFRvb2xUaXBWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgID0gMCxcbiAgICAgIF9kZWZhdWx0V2lkdGggPSAyMDAsXG4gICAgICBfdHlwZXMgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInLFxuICAgICAgICBDT0FDSE1BUksgIDogJ2NvYWNobWFyaydcbiAgICAgIH0sXG4gICAgICBfdHlwZVN0eWxlTWFwID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ3Rvb2x0aXBfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ3Rvb2x0aXBfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9vbHRpcF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICd0b29sdGlwX19kYW5nZXInLFxuICAgICAgICAnY29hY2htYXJrJyAgOiAndG9vbHRpcF9fY29hY2htYXJrJ1xuICAgICAgfSxcbiAgICAgIF9wb3NpdGlvbnMgICAgPSB7XG4gICAgICAgIFQgOiAnVCcsXG4gICAgICAgIFRSOiAnVFInLFxuICAgICAgICBSIDogJ1InLFxuICAgICAgICBCUjogJ0JSJyxcbiAgICAgICAgQiA6ICdCJyxcbiAgICAgICAgQkw6ICdCTCcsXG4gICAgICAgIEwgOiAnTCcsXG4gICAgICAgIFRMOiAnVEwnXG4gICAgICB9LFxuICAgICAgX3Bvc2l0aW9uTWFwICA9IHtcbiAgICAgICAgJ1QnIDogJ3Rvb2x0aXBfX3RvcCcsXG4gICAgICAgICdUUic6ICd0b29sdGlwX190b3ByaWdodCcsXG4gICAgICAgICdSJyA6ICd0b29sdGlwX19yaWdodCcsXG4gICAgICAgICdCUic6ICd0b29sdGlwX19ib3R0b21yaWdodCcsXG4gICAgICAgICdCJyA6ICd0b29sdGlwX19ib3R0b20nLFxuICAgICAgICAnQkwnOiAndG9vbHRpcF9fYm90dG9tbGVmdCcsXG4gICAgICAgICdMJyA6ICd0b29sdGlwX19sZWZ0JyxcbiAgICAgICAgJ1RMJzogJ3Rvb2x0aXBfX3RvcGxlZnQnXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfdGVtcGxhdGUgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfZG9tVXRpbHMgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLy9vYmoudGl0bGUsIG9iai5jb250ZW50LCBvYmoudHlwZSwgb2JqLnRhcmdldCwgb2JqLnBvc2l0aW9uXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvb2x0aXBPYmogPSBjcmVhdGVUb29sVGlwT2JqZWN0KGluaXRPYmoudGl0bGUsXG4gICAgICBpbml0T2JqLmNvbnRlbnQsXG4gICAgICBpbml0T2JqLnBvc2l0aW9uLFxuICAgICAgaW5pdE9iai50YXJnZXRFbCxcbiAgICAgIGluaXRPYmouZ3V0dGVyLFxuICAgICAgaW5pdE9iai5hbHdheXNWaXNpYmxlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvb2x0aXBPYmopO1xuICAgIF9tb3VudFBvaW50LmFwcGVuZENoaWxkKHRvb2x0aXBPYmouZWxlbWVudCk7XG5cbiAgICB0b29sdGlwT2JqLmFycm93RWwgPSB0b29sdGlwT2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93Jyk7XG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KGluaXRPYmoudHlwZSwgaW5pdE9iai5wb3NpdGlvbiwgdG9vbHRpcE9iai5lbGVtZW50KTtcblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgYXV0b0FscGhhOiB0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUgPyAxIDogMCxcbiAgICAgICAgd2lkdGggICAgOiBpbml0T2JqLndpZHRoID8gaW5pdE9iai53aWR0aCA6IF9kZWZhdWx0V2lkdGhcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNhY2hlIHRoZXNlIHZhbHVlcywgM2QgdHJhbnNmb3JtcyB3aWxsIGFsdGVyIHNpemVcbiAgICB0b29sdGlwT2JqLndpZHRoICA9IHRvb2x0aXBPYmouZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aDtcbiAgICB0b29sdGlwT2JqLmhlaWdodCA9IHRvb2x0aXBPYmouZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG5cbiAgICBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopO1xuICAgIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKTtcblxuICAgIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwgfHwgdG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5SKSB7XG4gICAgICBjZW50ZXJBcnJvd1ZlcnRpY2FsbHkodG9vbHRpcE9iaik7XG4gICAgfVxuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCB8fCB0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkIpIHtcbiAgICAgIGNlbnRlckFycm93SG9yaXpvbnRhbGx5KHRvb2x0aXBPYmopO1xuICAgIH1cblxuICAgIHJldHVybiB0b29sdGlwT2JqLmVsZW1lbnQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgcG9zaXRpb24sIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfcG9zaXRpb25NYXBbcG9zaXRpb25dKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvb2xUaXBPYmplY3QodGl0bGUsIG1lc3NhZ2UsIHBvc2l0aW9uLCB0YXJnZXQsIGd1dHRlciwgYWx3YXlzVmlzaWJsZSkge1xuICAgIHZhciBpZCAgPSAnanNfX3Rvb2x0aXAtdG9vbHRpcGl0ZW0tJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgaWQgICAgICAgICAgIDogaWQsXG4gICAgICAgICAgcG9zaXRpb24gICAgIDogcG9zaXRpb24sXG4gICAgICAgICAgdGFyZ2V0RWwgICAgIDogdGFyZ2V0LFxuICAgICAgICAgIGFsd2F5c1Zpc2libGU6IGFsd2F5c1Zpc2libGUgfHwgZmFsc2UsXG4gICAgICAgICAgZ3V0dGVyICAgICAgIDogZ3V0dGVyIHx8IDE1LFxuICAgICAgICAgIGVsT3ZlclN0cmVhbSA6IG51bGwsXG4gICAgICAgICAgZWxPdXRTdHJlYW0gIDogbnVsbCxcbiAgICAgICAgICBoZWlnaHQgICAgICAgOiAwLFxuICAgICAgICAgIHdpZHRoICAgICAgICA6IDAsXG4gICAgICAgICAgZWxlbWVudCAgICAgIDogX3RlbXBsYXRlLmFzRWxlbWVudCgndGVtcGxhdGVfX2NvbXBvbmVudC0tdG9vbHRpcCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgYXJyb3dFbCAgICAgIDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkV2ZW50c1RvVGFyZ2V0RWwodG9vbHRpcE9iaikge1xuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0b29sdGlwT2JqLmVsT3ZlclN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW92ZXInKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHNob3dUb29sVGlwKHRvb2x0aXBPYmouaWQpO1xuICAgICAgfSk7XG5cbiAgICB0b29sdGlwT2JqLmVsT3V0U3RyZWFtID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQodG9vbHRpcE9iai50YXJnZXRFbCwgJ21vdXNlb3V0JylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBoaWRlVG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd1Rvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKTtcbiAgICB0cmFuc2l0aW9uSW4odG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGd1dHRlciAgID0gdG9vbHRpcE9iai5ndXR0ZXIsXG4gICAgICAgIHhQb3MgICAgID0gMCxcbiAgICAgICAgeVBvcyAgICAgPSAwLFxuICAgICAgICB0Z3RQcm9wcyA9IHRvb2x0aXBPYmoudGFyZ2V0RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0IC0gZ3V0dGVyO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0O1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5SKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQgKyBndXR0ZXI7XG4gICAgICB5UG9zID0gdGd0UHJvcHMudG9wICsgKCh0Z3RQcm9wcy5oZWlnaHQgLyAyKSAtICh0b29sdGlwT2JqLmhlaWdodCAvIDIpKTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQlIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0ICsgKCh0Z3RQcm9wcy53aWR0aCAvIDIpIC0gKHRvb2x0aXBPYmoud2lkdGggLyAyKSk7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tICsgZ3V0dGVyO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoIC0gZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfVxuXG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmVsZW1lbnQsIHtcbiAgICAgIHg6IHhQb3MsXG4gICAgICB5OiB5UG9zXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjZW50ZXJBcnJvd0hvcml6b250YWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt4OiAodG9vbHRpcE9iai53aWR0aCAvIDIpIC0gKGFycm93UHJvcHMud2lkdGggLyAyKX0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dWZXJ0aWNhbGx5KHRvb2x0aXBPYmopIHtcbiAgICB2YXIgYXJyb3dQcm9wcyA9IHRvb2x0aXBPYmouYXJyb3dFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouYXJyb3dFbCwge3k6ICh0b29sdGlwT2JqLmhlaWdodCAvIDIpIC0gKGFycm93UHJvcHMuaGVpZ2h0IC8gMikgLSAyfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlVG9vbFRpcChpZCkge1xuICAgIHZhciB0b29sdGlwT2JqID0gZ2V0T2JqQnlJRChpZCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJhbnNpdGlvbk91dCh0b29sdGlwT2JqLmVsZW1lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjA1LCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGVsKSB7XG4gICAgZ2V0T2JqQnlFbGVtZW50KGVsKS5mb3JFYWNoKGZ1bmN0aW9uICh0b29sdGlwKSB7XG4gICAgICBpZiAodG9vbHRpcC5lbE92ZXJTdHJlYW0pIHtcbiAgICAgICAgdG9vbHRpcC5lbE92ZXJTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuICAgICAgaWYgKHRvb2x0aXAuZWxPdXRTdHJlYW0pIHtcbiAgICAgICAgdG9vbHRpcC5lbE91dFN0cmVhbS5kaXNwb3NlKCk7XG4gICAgICB9XG5cbiAgICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8odG9vbHRpcC5lbGVtZW50KTtcblxuICAgICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQodG9vbHRpcC5lbGVtZW50KTtcblxuICAgICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRCh0b29sdGlwLmlkKTtcblxuICAgICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgICAgX2NoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqQnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkID09PSBpZDtcbiAgICB9KVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqQnlFbGVtZW50KGVsKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQudGFyZ2V0RWwgPT09IGVsO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBvc2l0aW9ucygpIHtcbiAgICByZXR1cm4gX3Bvc2l0aW9ucztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzLFxuICAgIHBvc2l0aW9uICA6IGdldFBvc2l0aW9uc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xUaXBWaWV3KCk7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIFRlc3QgZm9yXG4gICAqIE9iamVjdCB7XCJcIjogdW5kZWZpbmVkfVxuICAgKiBPYmplY3Qge3VuZGVmaW5lZDogdW5kZWZpbmVkfVxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgaXNOdWxsOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIGlzbnVsbCA9IGZhbHNlO1xuXG4gICAgaWYgKGlzLmZhbHNleShvYmopKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgaWYgKHByb3AgPT09IHVuZGVmaW5lZCB8fCBvYmpbcHJvcF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpc251bGwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzbnVsbDtcbiAgfSxcblxuICBkeW5hbWljU29ydDogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYVtwcm9wZXJ0eV0gPCBiW3Byb3BlcnR5XSA/IC0xIDogYVtwcm9wZXJ0eV0gPiBiW3Byb3BlcnR5XSA/IDEgOiAwO1xuICAgIH07XG4gIH0sXG5cbiAgc2VhcmNoT2JqZWN0czogZnVuY3Rpb24gKG9iaiwga2V5LCB2YWwpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9ialtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgb2JqZWN0cyA9IG9iamVjdHMuY29uY2F0KHNlYXJjaE9iamVjdHMob2JqW2ldLCBrZXksIHZhbCkpO1xuICAgICAgfSBlbHNlIGlmIChpID09PSBrZXkgJiYgb2JqW2tleV0gPT09IHZhbCkge1xuICAgICAgICBvYmplY3RzLnB1c2gob2JqKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHM7XG4gIH0sXG5cbiAgZ2V0T2JqZWN0RnJvbVN0cmluZzogZnVuY3Rpb24gKG9iaiwgc3RyKSB7XG4gICAgdmFyIGkgICAgPSAwLFxuICAgICAgICBwYXRoID0gc3RyLnNwbGl0KCcuJyksXG4gICAgICAgIGxlbiAgPSBwYXRoLmxlbmd0aDtcblxuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG9iaiA9IG9ialtwYXRoW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICBnZXRPYmplY3RJbmRleEZyb21JZDogZnVuY3Rpb24gKG9iaiwgaWQpIHtcbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmpbaV0gIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIG9ialtpXS5pZCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBvYmpbaV0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vIGV4dGVuZCBhbmQgZGVlcCBleHRlbmQgZnJvbSBodHRwOi8veW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbS9cbiAgZXh0ZW5kOiBmdW5jdGlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHNbaV0uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIG91dFtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xuICB9LFxuXG4gIGRlZXBFeHRlbmQ6IGZ1bmN0aW9uIChvdXQpIHtcbiAgICBvdXQgPSBvdXQgfHwge307XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGFyZ3VtZW50c1tpXTtcblxuICAgICAgaWYgKCFvYmopIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBvYmpba2V5XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGRlZXBFeHRlbmQob3V0W2tleV0sIG9ialtrZXldKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uIG9mIFN0YW1wcyAtIGh0dHA6Ly9lcmljbGVhZHMuY29tLzIwMTQvMDIvcHJvdG90eXBhbC1pbmhlcml0YW5jZS13aXRoLXN0YW1wcy9cbiAgICogaHR0cHM6Ly93d3cuYmFya3dlYi5jby51ay9ibG9nL29iamVjdC1jb21wb3NpdGlvbi1hbmQtcHJvdG90eXBpY2FsLWluaGVyaXRhbmNlLWluLWphdmFzY3JpcHRcbiAgICpcbiAgICogUHJvdG90eXBlIG9iamVjdCByZXF1aXJlcyBhIG1ldGhvZHMgb2JqZWN0LCBwcml2YXRlIGNsb3N1cmVzIGFuZCBzdGF0ZSBpcyBvcHRpb25hbFxuICAgKlxuICAgKiBAcGFyYW0gcHJvdG90eXBlXG4gICAqIEByZXR1cm5zIE5ldyBvYmplY3QgdXNpbmcgcHJvdG90eXBlLm1ldGhvZHMgYXMgc291cmNlXG4gICAqL1xuICBiYXNpY0ZhY3Rvcnk6IGZ1bmN0aW9uIChwcm90b3R5cGUpIHtcbiAgICB2YXIgcHJvdG8gPSBwcm90b3R5cGUsXG4gICAgICAgIG9iaiAgID0gT2JqZWN0LmNyZWF0ZShwcm90by5tZXRob2RzKTtcblxuICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnY2xvc3VyZScpKSB7XG4gICAgICBwcm90by5jbG9zdXJlcy5mb3JFYWNoKGZ1bmN0aW9uIChjbG9zdXJlKSB7XG4gICAgICAgIGNsb3N1cmUuY2FsbChvYmopO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdzdGF0ZScpKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJvdG8uc3RhdGUpIHtcbiAgICAgICAgb2JqW2tleV0gPSBwcm90by5zdGF0ZVtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAgICpcbiAgICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAgICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICAgKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAgICpcbiAgICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gICAqXG4gICAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAgICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICAgKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAgICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICAgKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAgICpcbiAgICovXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGFuIGVudW1lcmF0aW9uIHdpdGgga2V5cyBlcXVhbCB0byB0aGVpciB2YWx1ZS5cbiAgICpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL1NUUk1ML2tleW1pcnJvclxuICAgKlxuICAgKiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogICB2YXIgQ09MT1JTID0ga2V5TWlycm9yKHtibHVlOiBudWxsLCByZWQ6IG51bGx9KTtcbiAgICogICB2YXIgbXlDb2xvciA9IENPTE9SUy5ibHVlO1xuICAgKiAgIHZhciBpc0NvbG9yVmFsaWQgPSAhIUNPTE9SU1tteUNvbG9yXTtcbiAgICpcbiAgICogVGhlIGxhc3QgbGluZSBjb3VsZCBub3QgYmUgcGVyZm9ybWVkIGlmIHRoZSB2YWx1ZXMgb2YgdGhlIGdlbmVyYXRlZCBlbnVtIHdlcmVcbiAgICogbm90IGVxdWFsIHRvIHRoZWlyIGtleXMuXG4gICAqXG4gICAqICAgSW5wdXQ6ICB7a2V5MTogdmFsMSwga2V5MjogdmFsMn1cbiAgICogICBPdXRwdXQ6IHtrZXkxOiBrZXkxLCBrZXkyOiBrZXkyfVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICovXG4gIGtleU1pcnJvcjogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciByZXQgPSB7fTtcbiAgICB2YXIga2V5O1xuICAgIGlmICghKG9iaiBpbnN0YW5jZW9mIE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShvYmopKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdrZXlNaXJyb3IoLi4uKTogQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QuJyk7XG4gICAgfVxuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHJldFtrZXldID0ga2V5O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbn07Il19
