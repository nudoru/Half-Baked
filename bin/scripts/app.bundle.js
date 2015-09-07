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

    // View will show based on the current store state
    this.store.setState({ currentState: 'PLAYER_SELECT' });
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
        this.handleConnect(payload.id);
        return;
      case _socketIOEvents.JOIN_ROOM:
        console.log("join room", payload.payload);
        this.handleJoinNewlyCreatedRoom(payload.payload.roomID);
        return;
      case _socketIOEvents.GAME_START:
        console.log("GAME STARTED");
        this.handleGameStart(payload.payload);
        return;
      case _socketIOEvents.GAME_ABORT:
        this.handleGameAbort(payload);
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

  handleConnect: function handleConnect(socketID) {
    var setSessionID = _appActions.setSessionProps({ socketIOID: socketID }),
        setLocalID = _appActions.setLocalPlayerProps({ id: socketID });

    this.store.apply([setSessionID, setLocalID]);
  },

  handleJoinNewlyCreatedRoom: function handleJoinNewlyCreatedRoom(roomID) {
    var setRoom = _appActions.setSessionProps({ roomID: roomID }),
        setWaitingScreenState = _noriActions.changeStoreState({ currentState: this.store.gameStates[2] });

    this.store.apply([setRoom, setWaitingScreenState]);
  },

  handleGameStart: function handleGameStart(payload) {
    var remotePlayer = this.pluckRemotePlayer(payload.players),
        setRemotePlayer = _appActions.setRemotePlayerProps(remotePlayer),
        setGamePlayState = _noriActions.changeStoreState({ currentState: this.store.gameStates[3] });

    this.store.apply([setRemotePlayer, setGamePlayState]);
  },

  pluckRemotePlayer: function pluckRemotePlayer(playersArry) {
    var localPlayerID = this.store.getState().localPlayer.id;
    console.log('filtering for', localPlayerID, playersArry);
    return playersArry.filter(function (player) {
      return !(player.id === localPlayerID);
    })[0];
  },

  handleGameAbort: function handleGameAbort(payload) {
    this.view.alert(payload.payload, payload.type);
    var setPlayerSelect = _noriActions.changeStoreState({ currentState: this.store.gameStates[1] }),
        resetSession = _appActions.setSessionProps({ roomID: '' }),
        resetPlayer = _appActions.setLocalPlayerProps(this.store.createPlayerResetObject());

    this.store.apply([resetPlayer, resetSession, setPlayerSelect]);
  }

});

module.exports = App;

},{"../nori/action/ActionCreator.js":14,"../nori/service/SocketIO.js":16,"../nori/service/SocketIOEvents.js":17,"../nori/utils/Rx.js":24,"./action/ActionCreator.js":3,"./store/AppStore.js":4,"./view/AppView.js":5}],2:[function(require,module,exports){
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
      type: _actionConstants.SET_SESSION_PROPS,
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
var _restURL = '',
    _restNumQuestions = 3,
    _restQuestionCategory = 24,
    // SCI/TECT
_rest = require('../../nori/service/Rest.js'),
    _noriActionConstants = require('../../nori/action/ActionConstants.js'),
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
    //https://market.mashape.com/pareshchouhan/trivia
    //var getQuestions = _rest.request({
    //  method : 'GET',
    //  //https://pareshchouhan-trivia-v1.p.mashape.com/v1/getQuizQuestionsByCategory?categoryId=1&limit=10&page=1
    //  url    : 'https://pareshchouhan-trivia-v1.p.mashape.com/v1/getAllQuizQuestions?limit=' + _restNumQuestions + '&page=1',
    //  headers: [{'X-Mashape-Key': 'tPxKgDvrkqmshg8zW4olS87hzF7Ap1vi63rjsnUuVw1sBHV9KJ'}],
    //  json   : true
    //}).subscribe(
    //  function success(data) {
    //    console.log('ok', data);
    //  },
    //  function error(data) {
    //    console.log('err', data);
    //  });

    // Set initial state
    this.setState({
      currentState: this.gameStates[0],
      session: {
        socketIOID: '',
        roomID: ''
      },
      localPlayer: _.merge(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      remotePlayer: _.merge(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      questionBank: []
    });

    this.notifySubscribersOf('storeInitialized');
  },

  createBlankPlayerObject: function createBlankPlayerObject() {
    return {
      id: '',
      type: '',
      name: 'Mystery Player ' + _numUtils.rndNumber(100, 999),
      appearance: 'green'
    };
  },

  createPlayerResetObject: function createPlayerResetObject() {
    return {
      health: 6,
      behaviors: [],
      score: 0
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

},{"../../nori/action/ActionConstants.js":13,"../../nori/service/Rest.js":15,"../../nori/store/MixinReducerStore.js":19,"../../nori/utils/MixinObservableSubject.js":21,"../../nudoru/core/NumberUtils.js":41,"../action/ActionConstants.js":2}],5:[function(require,module,exports){
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
  }

});

module.exports = AppView();

},{"../../nori/utils/MixinObservableSubject.js":21,"../../nori/view/ApplicationView.js":26,"../../nori/view/MixinComponentViews.js":27,"../../nori/view/MixinEventDelegator.js":29,"../../nori/view/MixinNudoruControls.js":30,"../../nori/view/MixinStoreStateViews.js":31,"../store/AppStore.js":4,"./Screen.GameOver.js":6,"./Screen.MainGame.js":7,"./Screen.PlayerSelect.js":8,"./Screen.Title.js":9,"./Screen.WaitingOnPlayer.js":10}],6:[function(require,module,exports){
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

},{"../../nori/action/ActionCreator":14,"../../nori/utils/Templating.js":25,"../../nori/view/MixinDOMManipulation.js":28,"../store/AppStore":4,"./AppView":5}],7:[function(require,module,exports){
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
      'click #game__button-skip': function clickGame__buttonSkip() {
        _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[4] }));
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
      local: appState.localPlayer,
      remote: appState.remotePlayer
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
  componentDidMount: function componentDidMount() {},

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator.js":14,"../../nori/service/SocketIO.js":16,"../../nori/utils/Templating.js":25,"../action/ActionCreator.js":3,"../store/AppStore.js":4,"./AppView.js":5}],8:[function(require,module,exports){
/*
 TODO

 */

var _roomNumberLength = 4,
    _noriActions = require('../../nori/action/ActionCreator.js'),
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
    return this.getInitialState();
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount: function componentDidMount() {
    document.querySelector('#select__playertype').value = this.getState().appearance;
  },

  onCreateRoom: function onCreateRoom() {
    if (this.validateUserDetailsInput()) {
      _socketIO.notifyServer(_socketIO.events().CREATE_ROOM, {
        playerDetails: _appStore.getState().localPlayer
      });
    }
  },

  onJoinRoom: function onJoinRoom() {
    var roomID = document.querySelector('#select__roomid').value;
    if (this.validateRoomID(roomID)) {
      _socketIO.notifyServer(_socketIO.events().JOIN_ROOM, {
        roomID: roomID,
        playerDetails: _appStore.getState().localPlayer
      });
    } else {
      _appView.alert('The room ID is not correct. Does it contain letters or is less than ' + _roomNumberLength + ' digits?', 'Bad Room ID');
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
    } else if (roomID.length !== _roomNumberLength) {
      return false;
    }
    return true;
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount: function componentWillUnmount() {
    //
  }

});

module.exports = Component;

},{"../../nori/action/ActionCreator.js":14,"../../nori/service/SocketIO.js":16,"../../nori/utils/Templating.js":25,"../action/ActionCreator.js":3,"../store/AppStore.js":4,"./AppView.js":5}],9:[function(require,module,exports){
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

},{"../../nori/action/ActionCreator":14,"../../nori/utils/Templating.js":25,"../store/AppStore":4,"./AppView":5}],10:[function(require,module,exports){
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
    var appState = _appStore.getState();
    return {
      name: appState.localPlayer.name,
      appearance: appState.localPlayer.appearance,
      roomID: appState.session.roomID
    };
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

},{"../../nori/action/ActionCreator":14,"../../nori/utils/Templating.js":25,"../store/AppStore":4,"./AppView":5}],11:[function(require,module,exports){
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

},{"./app/App.js":1,"./nori/Nori.js":12,"./nudoru/browser/BrowserInfo.js":33}],12:[function(require,module,exports){
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

},{"./utils/Dispatcher.js":20,"./utils/Router.js":23}],13:[function(require,module,exports){
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

/**
 * Ajax / Rest module.
 * Returns an RxJS Obervable
 *
 * Usage:
 *
 var request = require('./nori/service/Rest');

 var getSub = request.request({
        method: 'GET',
        url   : '/items',
        headers: [{'key':'value'}],
        json  : true
      }).subscribe(
 function success(data) {
          console.log('ok', data);
        },
 function error(data) {
          console.log('err', data);
        });

 var postSub = request.request({
        method: 'POST',
        url   : '/items',
        data  : JSON.stringify({key: 'value'}),
        json  : true
      }).subscribe(
 function success(data) {
          console.log('ok', data);
        },
 function error(data) {
          console.log('err', data);
        });

 var putSub = request.request({
        method: 'PUT',
        url   : '/items/42',
        data  : JSON.stringify({key: 'value'}),
        json  : true
      }).subscribe(
 function success(data) {
          console.log('ok', data);
        },
 function error(data) {
          console.log('err', data);
        });

 var delSub = request.request({
        method: 'DELETE',
        url   : '/items/42',
        json  : true
      }).subscribe(
 function success(data) {
          console.log('ok', data);
        },
 function error(data) {
          console.log('err', data);
        });
 *
 */

var Rest = function Rest() {

  function request(reqObj) {

    var xhr = new XMLHttpRequest(),
        json = reqObj.json || false,
        method = reqObj.method.toUpperCase() || 'GET',
        url = reqObj.url,
        headers = reqObj.headers || [],
        data = reqObj.data || null;

    return new Rx.Observable.create(function makeReq(observer) {
      xhr.open(method, url, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              if (json) {
                observer.onNext(JSON.parse(xhr.responseText));
              } else {
                observer.onError(xhr.responseText);
              }
            } catch (e) {
              handleError('Result', 'Error parsing result. Status: ' + xhr.status + ', Response: ' + xhr.response);
            }
          } else {
            handleError(xhr.status, xhr.statusText);
          }
        }
      };

      xhr.onerror = function () {
        handleError('Network error');
      };
      xhr.ontimeout = function () {
        handleError('Timeout');
      };
      xhr.onabort = function () {
        handleError('About');
      };

      headers.forEach(function (headerPair) {
        var prop = Object.keys(headerPair)[0],
            value = headerPair[prop];
        if (prop && value) {
          xhr.setRequestHeader(prop, value);
        } else {
          console.warn('nori/service/rest, bad header pair: ', headerPair);
        }
      });

      // set non json header? 'application/x-www-form-urlencoded; charset=UTF-8'
      if (json && method !== "GET") {
        xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
      } else if (json && method === "GET") {
        //, text/*
        xhr.setRequestHeader("Accept", "application/json; odata=verbose"); // odata param for Sharepoint
      }

      xhr.send(data);

      function handleError(type, message) {
        message = message || '';
        observer.onError(type + ' ' + message);
      }
    });
  }

  return {
    request: request
  };
};

module.exports = Rest();

},{}],16:[function(require,module,exports){
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

},{"./SocketIOEvents.js":17}],17:[function(require,module,exports){
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
  GAME_END: 'game_end',
  GAME_ABORT: 'game_abort'
};

},{}],18:[function(require,module,exports){
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

},{"../../vendor/immutable.min.js":43}],19:[function(require,module,exports){
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
   * @param actionObjOrArry Array of actions or a single action to reduce from
   */
  function apply(actionObjOrArry) {
    if (is.array(actionObjOrArry)) {
      actionObjOrArry.forEach(function (actionObj) {
        return applyReducers(actionObj);
      });
    } else {
      applyReducers(actionObjOrArry);
    }
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

},{"./ImmutableMap.js":18}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":34}],23:[function(require,module,exports){
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

},{"../../nudoru/core/ObjectUtils.js":42}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":34}],26:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":34,"../utils/Templating.js":25}],27:[function(require,module,exports){
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

},{"../store/ImmutableMap.js":18,"../utils/MixinObservableSubject.js":21,"./MixinEventDelegator.js":29,"./ViewComponent.js":32}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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

},{"../../nudoru/browser/BrowserInfo.js":33,"../utils/Rx":24}],30:[function(require,module,exports){
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

},{"../../nudoru/components/MessageBoxCreator.js":36,"../../nudoru/components/MessageBoxView.js":37,"../../nudoru/components/ModalCoverView.js":38,"../../nudoru/components/ToastView.js":39,"../../nudoru/components/ToolTipView.js":40}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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
  function addChild(child) {
    _children.push(child);
  }

  /**
   * Remove a child
   * @param child
   */
  function removeChild(child) {
    var idx = _children.indexOf(child);
    _children[idx].unmount();
    _children.splice(idx, 1);
  }

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

  function getChildren() {
    return _children.slice(0);
  }

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

    addChild: addChild,
    removeChild: removeChild,
    getChildren: getChildren
  };
};

module.exports = ViewComponent;

},{"../utils/Renderer":22,"../utils/Templating.js":25}],33:[function(require,module,exports){
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

},{}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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

},{"./MessageBoxView":37}],37:[function(require,module,exports){
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
      _buttonIconTemplateID = 'messagebox--button-icon',
      _buttonNoIconTemplateID = 'messagebox--button-noicon',
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
      element: _template.asElement('messagebox--default', {
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

},{"../../nori/utils/Templating.js":25,"../../nudoru/browser/BrowserInfo.js":33,"../../nudoru/browser/DOMUtils.js":34,"../../nudoru/browser/ThreeDTransforms.js":35,"./ModalCoverView.js":38}],38:[function(require,module,exports){
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

},{"../../nudoru/browser/BrowserInfo.js":33}],39:[function(require,module,exports){
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
      element: _template.asElement('component--toast', {
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

},{"../../nori/utils/Templating.js":25,"../../nudoru/browser/BrowserInfo.js":33,"../../nudoru/browser/DOMUtils.js":34,"../../nudoru/browser/ThreeDTransforms.js":35}],40:[function(require,module,exports){
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
      element: _template.asElement('component--tooltip', {
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

},{"../../nori/utils/Templating.js":25,"../../nudoru/browser/DOMUtils.js":34}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3N0b3JlL0FwcFN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L0FwcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLkdhbWVPdmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5NYWluR2FtZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uUGxheWVyU2VsZWN0LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5UaXRsZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uV2FpdGluZ09uUGxheWVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL21haW4uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9Ob3JpLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc2VydmljZS9SZXN0LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvU29ja2V0SU9FdmVudHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zdG9yZS9JbW11dGFibGVNYXAuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL0Rpc3BhdGNoZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUmVuZGVyZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9Sb3V0ZXIuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9SeC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L0FwcGxpY2F0aW9uVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvTWl4aW5Db21wb25lbnRWaWV3cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvTWl4aW5ET01NYW5pcHVsYXRpb24uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRXZlbnREZWxlZ2F0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluTnVkb3J1Q29udHJvbHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9WaWV3Q29tcG9uZW50LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveENyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbnVkb3J1L2NvbXBvbmVudHMvVG9hc3RWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb3JlL051bWJlclV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL3ZlbmRvci9pbW11dGFibGUubWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsSUFBSSxHQUFHLEdBQWUsT0FBTyxDQUFDLHFCQUFxQixDQUFDO0lBQ2hELFdBQVcsR0FBTyxPQUFPLENBQUMsMkJBQTJCLENBQUM7SUFDdEQsWUFBWSxHQUFNLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQztJQUM1RCxlQUFlLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7Ozs7Ozs7QUFPbkUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDOztBQUUvQixRQUFNLEVB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QUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxRQUFRLElBQUUsT0FBTyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUcsRUFBRSxHQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsVUFBVSxLQUFHLENBQUMsRUFBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFNLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEtBQUksS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFdBQU0sRUFBQyxLQUFLLEVBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLE9BQU0sVUFBVSxJQUFFLE9BQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxJQUFFLFFBQVEsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxDQUFDLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBRSxRQUFRLEVBQUUsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQ2pnRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxjQUFjLEdBQUMsRUFBRSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxRQUFRLElBQUUsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLHdFQUF3RSxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQywrQ0FBK0MsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxRQUFRLElBQUUsT0FBTyxDQUFDLElBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLGdFQUFnRSxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFVBQU0sU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUM7QUFBQyxXQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsV0FBVyxLQUFHLE1BQU0sSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsV0FBVyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxVQUFVLEdBQUMsVUFBVSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUNwZ0UsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsVUFBVSxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLFVBQVUsR0FBRSxDQUFDLElBQUUsVUFBVSxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxhQUFhLEdBQUMsQ0FBQyxHQUFDLG9CQUFvQixDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLEtBQUcsRUFBRSxLQUFHLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLENBQUMsSUFBRyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUUsRUFBQztBQUFDLFdBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxvQkFBb0IsSUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEVBQUMsVUFBVSxHQUFDLEVBQUUsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxFQUFFLENBQUEsRUFBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJO0FBQUMsVUFBRyxLQUFLLENBQUMsS0FBRyxFQUFFLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUMsSUFBRyxFQUFFLEVBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLEVBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQyxFQUFDLFlBQVksRUFBQyxDQUFDLENBQUMsRUFBQyxRQUFRLEVBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxvQkFBb0IsSUFBRSxDQUFDLENBQUMsb0JBQW9CLEtBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUMsQ0FBQyxDQUFDLG9CQUFvQixHQUFDLFlBQVU7QUFBQyxlQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSTtBQUFDLFlBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBQyxNQUFNLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQztLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsUUFBUSxHQUFFLEtBQUssQ0FBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxlQUFlLElBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUEsQ0FBQztHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsTUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLG1EQUFtRCxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLGVBQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN6Z0UsRUFBQyxDQUFDLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsV0FBVyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxLQUFHLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtXQUFDLE9BQU8sQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFBO09BQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsRUFBRSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxpQkFBTztBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7Y0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztjQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxFQUFFLENBQUEsQ0FBRSxTQUFTLEVBQUUsQ0FBQztBQUM5Z0UsS0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFOzs7OEJBQVM7VUFBUixDQUFDO1VBQUMsQ0FBQztVQUFDLENBQUM7VUFBQyxDQUFDO0FBQU0sT0FBQyxHQUF5RSxDQUFDLEdBQVEsQ0FBQyxHQUFxRSxDQUFDLEdBQUMsQ0FBQyxHQUE0QixDQUFDOztBQUE3TCxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUM7YUFBVyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFO2NBQUMsQ0FBQztjQUFDLENBQUM7Y0FBQyxDQUFDOzs7T0FBRSxJQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLElBQUUsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtTQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxpQkFBSyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDO0dBQUEsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFJLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUU7QUFBQyxlQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxFQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtTQUFDLFFBQU0sQ0FBQyxFQUFFO0FBQ3ZnRSxlQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxrQkFBTSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtTQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFLLENBQUMsR0FBRTtBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxnQkFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxFQUFFLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUEsQUFBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1dBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1NBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU0sQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFNLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxLQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFDaGdFLGFBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZ0JBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxDQUFDLFFBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1NBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQTtTQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxLQUFLLENBQUE7U0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMseUJBQXlCLEdBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUUsU0FBUyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQSxHQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsbUNBQW1DLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxLQUFLLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsS0FBSyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsTUFBSTtBQUFDLFVBQUcsQ0FBQyxLQUFHLEVBQUUsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUNqZ0UsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsV0FBVyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsV0FBVyxLQUFHLEVBQUUsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxPQUFPLEtBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsRUFBQSxDQUFBLEFBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxNQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxhQUFhLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsR0FBRyxFQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUM7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLENBQUMsQ0FBQSxDQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLFVBQVUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxTQUFTLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLEdBQUMsU0FBUyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsRUFBRSxFQUFDLEdBQUcsR0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUMsQ0FBQyxDQUFBLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFDamhFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsSUFBRyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsRUFBRSxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUEsQUFBQyxFQUFDLFlBQVU7QUFBQyxZQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUEsQ0FBQTtLQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsWUFBVTtBQUFDLGlCQUFPO0FBQUMsY0FBRyxDQUFDLEVBQUM7QUFBQyxnQkFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUE7V0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQyxDQUFBLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsRUFBQTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO0FBQ3JrRSxRQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDO0FBQUMsT0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsSUFBRSxFQUFFLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFFO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUMsTUFBTSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsSUFBRSxFQUFFLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLEVBQUUsSUFBRSxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxLQUFHLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBLEFBQUMsQ0FBQSxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsTUFBSyxJQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3BnRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsU0FBRixDQUFDLENBQVUsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLFlBQVksQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsY0FBYyxHQUFDLENBQUMsQ0FBQTtPQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFdBQVcsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxLQUFLLElBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUUsUUFBUSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUMsRUFBRTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLGVBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsb0NBQW9DLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsSUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxXQUFXLElBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUk7QUFDeGhFLE9BQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxFQUFFLElBQUksWUFBWSxFQUFFLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDLDBCQUEwQixDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBLEVBQUM7QUFBQyxVQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUMsSUFBSSxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxFQUFFLElBQUksWUFBWSxFQUFFLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksQ0FBQSxFQUFDO0FBQUMsVUFBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQTtLQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLFdBQVMsR0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLFFBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxDQUFDLHFCQUFxQixJQUFFLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sWUFBVTtBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLFlBQVU7QUFBQyxhQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxRQUFRLElBQUUsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsVUFBVSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUUsRUFBRSxHQUFDLENBQUMsS0FBRyxDQUFDLEVBQUUsRUFBQyxTQUFTLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxVQUFVLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEVBQUMsVUFBVSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsVUFBVSxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLElBQUksRUFBRSxHQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSztNQUFDLEVBQUUsR0FBQyxRQUFRO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQyxJQUFFLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRTtNQUFDLEVBQUUsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsRUFBQztNQUFDLEVBQUUsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLDRCQUE0QjtNQUFDLEVBQUUsR0FBQyx5QkFBeUI7TUFBQyxFQUFFLEdBQUMsMkJBQTJCO01BQUMsRUFBRSxHQUFDLDJCQUEyQjtNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxVQUFVLElBQUUsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLFFBQVE7TUFBQyxFQUFFLEdBQUMsWUFBWTtNQUFDLEVBQUUsR0FBQyxFQUFFLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFNLFlBQVksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxFQUFFLEVBQ3JnRSxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTSxFQUFFLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsWUFBVTtBQUFDLFlBQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFFLElBQUksQ0FBQyxpQkFBaUIsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBLEFBQUMsRUFBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHO0FBQ2hrRSxXQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBRSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksR0FBRTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUEsRUFBQyxNQUFLO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsY0FBYztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxLQUFLLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBRyxFQUFFLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLENBQUEsQUFBQyxJQUFFLEVBQUUsS0FBRyxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsQ0FBQTtHQUFDO01BQUMsRUFBRSxHQUFDLE1BQU0sQ0FBQyxZQUFZO01BQUMsRUFBRSxHQUFDLENBQUEsWUFBVTtBQUFDLFFBQUc7QUFBQyxjQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLENBQUEsRUFBRTtNQUFDLEVBQUUsR0FBQyxVQUFVLElBQUUsT0FBTyxPQUFPLENBQUMsRUFBRSxLQUFHLEVBQUUsR0FBQyxJQUFJLE9BQU8sRUFBQSxDQUFBLEFBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLG1CQUFtQixDQUFDLFVBQVUsSUFBRSxPQUFPLE1BQU0sS0FBRyxFQUFFLEdBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxFQUFFO01BQUMsRUFBRSxHQUFDLEdBQUc7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxLQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFFBQVEsS0FBRyxDQUFDLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsSUFBSSxDQUFDLFFBQVEsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO0FBQ3ZnRSxXQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQztLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFPO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDO09BQUM7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsWUFBVTtBQUFDLGFBQU8sRUFBRSxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxLQUFLLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxFQUM1Z0UsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEtBQUssQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUUsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU0sVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBQSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxLQUFLLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyx1QkFBdUI7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUNuaUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUM7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFLENBQUEsQUFBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFJLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTTtRQUFDLENBQUMsR0FBQyxDQUFDLE1BQUksQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBRSxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFFLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxNQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU8sRUFBQyxPQUFPLENBQUMsR0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN6aEUsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUU7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLEtBQUssRUFBQztBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO09BQUMsTUFBSyxJQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUM7QUFBQyxhQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsTUFBSyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxjQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsU0FBUTtPQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO0tBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQSxFQUFDO0FBQUMsT0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsT0FBTyxHQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsS0FBSyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQztHQUMvaEUsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQSxLQUFJLEVBQUUsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsd0JBQXdCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLFVBQVUsR0FBQyxFQUFFLENBQUMsVUFBVSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFBO0tBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsTUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLElBQUksQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUM7R0FDbmdFLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxZQUFZLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFFBQUcsQ0FBQyxLQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLEVBQUMsS0FBSyxFQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQTtLQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM2lFLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHlCQUF5QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsVUFBVSxHQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLElBQUksR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ2hoRSxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHVCQUF1QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxZQUFZLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxRQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsUUFBTyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFBLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLEtBQUssQ0FBQywwQkFBMEIsR0FBQyxDQUFDLEdBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUN0aEUsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFVLEdBQUMsVUFBVSxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEdBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFBLEFBQUMsR0FBQyxJQUFJLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQSxHQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssS0FBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsWUFBWSxFQUFFLEdBQUMsSUFBSSxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLElBQUksQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsS0FBSyxLQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQztHQUNwZ0UsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLFdBQVcsR0FBQyxXQUFXLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxHQUFHLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFVLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLFFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsWUFBWSxFQUFDLHdCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFNLFlBQVksQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLG9CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEdBQUcsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFDL2dFLFVBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLEtBQUssQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxhQUFhLEVBQUMsdUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUU7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQU8sU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxXQUFXLEVBQUMsdUJBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxLQUFLLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFVO0FBQUMsZUFBTSxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsWUFBWSxHQUFDLFlBQVU7QUFBQyxlQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN4Z0UsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsWUFBWSxFQUFDLHdCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLEdBQUU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsRUFBRSxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsS0FBRyxFQUFFLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxDQUFDLEdBQUMsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLE1BQU0sS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLGdCQUFnQixHQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU0sRUFBRSxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxDQUFBLFlBQVU7QUFBQyxRQUFHO0FBQUMsWUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFDLEVBQUMsR0FBRyxFQUFDLGVBQVU7QUFBQyxjQUFHLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBQztBQUFDLGdCQUFJLENBQUMsQ0FBQyxJQUFHO0FBQUMsb0JBQU0sS0FBSyxFQUFFLENBQUE7YUFBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsZUFBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7YUFBQyxJQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUMsUUFBTyxPQUFPLElBQUUsT0FBTyxDQUFDLElBQUksSUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLDJJQUEySSxHQUFDLENBQUMsQ0FBQyxFQUNybUUsSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFBO1dBQUM7U0FBQyxFQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUMsRUFBRTtHQUFDLENBQUEsRUFBRSxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxXQUFXLEVBQUMscUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLG9CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLFVBQVUsRUFBQyxzQkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyxxQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsYUFBYSxFQUFDLHVCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFBO09BQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFVBQVUsRUFBQyxzQkFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdmdFLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGVBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7S0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUMsUUFBUSxFQUFDLENBQUMsRUFBQyxHQUFHLEVBQUMsQ0FBQyxFQUFDLFVBQVUsRUFBQyxDQUFDLEVBQUMsR0FBRyxFQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUMsRUFBRSxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFDLEVBQUUsRUFBQyxHQUFHLEVBQUMsRUFBRSxFQUFDLFVBQVUsRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUMsRUFBRSxFQUFDLE1BQU0sRUFBQyxFQUFFLEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7Q0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF9yeCAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL25vcmkvdXRpbHMvUnguanMnKSxcbiAgICBfYXBwQWN0aW9ucyAgICAgPSByZXF1aXJlKCcuL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJyksXG4gICAgX25vcmlBY3Rpb25zICAgID0gcmVxdWlyZSgnLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9zb2NrZXRJT0V2ZW50cyA9IHJlcXVpcmUoJy4uL25vcmkvc2VydmljZS9Tb2NrZXRJT0V2ZW50cy5qcycpO1xuXG4vKipcbiAqIFwiQ29udHJvbGxlclwiIGZvciBhIE5vcmkgYXBwbGljYXRpb24uIFRoZSBjb250cm9sbGVyIGlzIHJlc3BvbnNpYmxlIGZvclxuICogYm9vdHN0cmFwcGluZyB0aGUgYXBwIGFuZCBwb3NzaWJseSBoYW5kbGluZyBzb2NrZXQvc2VydmVyIGludGVyYWN0aW9uLlxuICogQW55IGFkZGl0aW9uYWwgZnVuY3Rpb25hbGl0eSBzaG91bGQgYmUgaGFuZGxlZCBpbiBhIHNwZWNpZmljIG1vZHVsZS5cbiAqL1xudmFyIEFwcCA9IE5vcmkuY3JlYXRlQXBwbGljYXRpb24oe1xuXG4gIG1peGluczogW10sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgbWFpbiBOb3JpIEFwcCBzdG9yZSBhbmQgdmlldy5cbiAgICovXG4gIHN0b3JlIDogcmVxdWlyZSgnLi9zdG9yZS9BcHBTdG9yZS5qcycpLFxuICB2aWV3ICA6IHJlcXVpcmUoJy4vdmlldy9BcHBWaWV3LmpzJyksXG4gIHNvY2tldDogcmVxdWlyZSgnLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJyksXG5cbiAgLyoqXG4gICAqIEludGlhbGl6ZSB0aGUgYXBwaWxjYXRpb24sIHZpZXcgYW5kIHN0b3JlXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zb2NrZXQuaW5pdGlhbGl6ZSgpO1xuICAgIHRoaXMuc29ja2V0LnN1YnNjcmliZSh0aGlzLmhhbmRsZVNvY2tldE1lc3NhZ2UuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLnZpZXcuaW5pdGlhbGl6ZSgpO1xuXG4gICAgdGhpcy5zdG9yZS5pbml0aWFsaXplKCk7IC8vIHN0b3JlIHdpbGwgYWNxdWlyZSBkYXRhIGRpc3BhdGNoIGV2ZW50IHdoZW4gY29tcGxldGVcbiAgICB0aGlzLnN0b3JlLnN1YnNjcmliZSgnc3RvcmVJbml0aWFsaXplZCcsIHRoaXMub25TdG9yZUluaXRpYWxpemVkLmJpbmQodGhpcykpO1xuICAgIHRoaXMuc3RvcmUubG9hZFN0b3JlKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFmdGVyIHRoZSBzdG9yZSBkYXRhIGlzIHJlYWR5XG4gICAqL1xuICBvblN0b3JlSW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJ1bkFwcGxpY2F0aW9uKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgXCJQbGVhc2Ugd2FpdFwiIGNvdmVyIGFuZCBzdGFydCB0aGUgYXBwXG4gICAqL1xuICBydW5BcHBsaWNhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMudmlldy5yZW1vdmVMb2FkaW5nTWVzc2FnZSgpO1xuXG4gICAgLy8gVmlldyB3aWxsIHNob3cgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3RvcmUgc3RhdGVcbiAgICB0aGlzLnN0b3JlLnNldFN0YXRlKHtjdXJyZW50U3RhdGU6ICdQTEFZRVJfU0VMRUNUJ30pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbGwgbWVzc2FnZXMgZnJvbSB0aGUgU29ja2V0LklPIHNlcnZlciB3aWxsIGJlIGZvcndhcmRlZCBoZXJlXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBoYW5kbGVTb2NrZXRNZXNzYWdlOiBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIGlmICghcGF5bG9hZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiZnJvbSBTb2NrZXQuSU8gc2VydmVyXCIsIHBheWxvYWQpO1xuXG4gICAgc3dpdGNoIChwYXlsb2FkLnR5cGUpIHtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5DT05ORUNUKTpcbiAgICAgICAgdGhpcy5oYW5kbGVDb25uZWN0KHBheWxvYWQuaWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuSk9JTl9ST09NKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJqb2luIHJvb21cIiwgcGF5bG9hZC5wYXlsb2FkKTtcbiAgICAgICAgdGhpcy5oYW5kbGVKb2luTmV3bHlDcmVhdGVkUm9vbShwYXlsb2FkLnBheWxvYWQucm9vbUlEKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkdBTUVfU1RBUlQpOlxuICAgICAgICBjb25zb2xlLmxvZyhcIkdBTUUgU1RBUlRFRFwiKTtcbiAgICAgICAgdGhpcy5oYW5kbGVHYW1lU3RhcnQocGF5bG9hZC5wYXlsb2FkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkdBTUVfQUJPUlQpOlxuICAgICAgICB0aGlzLmhhbmRsZUdhbWVBYm9ydChwYXlsb2FkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLlNZU1RFTV9NRVNTQUdFKTpcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5CUk9BRENBU1QpOlxuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLk1FU1NBR0UpOlxuICAgICAgICB0aGlzLnZpZXcuYWxlcnQocGF5bG9hZC5wYXlsb2FkLCBwYXlsb2FkLnR5cGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oXCJVbmhhbmRsZWQgU29ja2V0SU8gbWVzc2FnZSB0eXBlXCIsIHBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICB9LFxuXG4gIGhhbmRsZUNvbm5lY3Q6IGZ1bmN0aW9uIChzb2NrZXRJRCkge1xuICAgIHZhciBzZXRTZXNzaW9uSUQgPSBfYXBwQWN0aW9ucy5zZXRTZXNzaW9uUHJvcHMoe3NvY2tldElPSUQ6IHNvY2tldElEfSksXG4gICAgICAgIHNldExvY2FsSUQgICA9IF9hcHBBY3Rpb25zLnNldExvY2FsUGxheWVyUHJvcHMoe2lkOiBzb2NrZXRJRH0pO1xuXG4gICAgdGhpcy5zdG9yZS5hcHBseShbc2V0U2Vzc2lvbklELCBzZXRMb2NhbElEXSk7XG4gIH0sXG5cbiAgaGFuZGxlSm9pbk5ld2x5Q3JlYXRlZFJvb206IGZ1bmN0aW9uIChyb29tSUQpIHtcbiAgICB2YXIgc2V0Um9vbSAgICAgICAgICAgICAgID0gX2FwcEFjdGlvbnMuc2V0U2Vzc2lvblByb3BzKHtyb29tSUQ6IHJvb21JRH0pLFxuICAgICAgICBzZXRXYWl0aW5nU2NyZWVuU3RhdGUgPSBfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiB0aGlzLnN0b3JlLmdhbWVTdGF0ZXNbMl19KTtcblxuICAgIHRoaXMuc3RvcmUuYXBwbHkoW3NldFJvb20sIHNldFdhaXRpbmdTY3JlZW5TdGF0ZV0pO1xuICB9LFxuXG4gIGhhbmRsZUdhbWVTdGFydDogZnVuY3Rpb24gKHBheWxvYWQpIHtcbiAgICB2YXIgcmVtb3RlUGxheWVyICAgICA9IHRoaXMucGx1Y2tSZW1vdGVQbGF5ZXIocGF5bG9hZC5wbGF5ZXJzKSxcbiAgICAgICAgc2V0UmVtb3RlUGxheWVyICA9IF9hcHBBY3Rpb25zLnNldFJlbW90ZVBsYXllclByb3BzKHJlbW90ZVBsYXllciksXG4gICAgICAgIHNldEdhbWVQbGF5U3RhdGUgPSBfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiB0aGlzLnN0b3JlLmdhbWVTdGF0ZXNbM119KTtcblxuICAgIHRoaXMuc3RvcmUuYXBwbHkoW3NldFJlbW90ZVBsYXllciwgc2V0R2FtZVBsYXlTdGF0ZV0pO1xuICB9LFxuXG4gIHBsdWNrUmVtb3RlUGxheWVyOiBmdW5jdGlvbiAocGxheWVyc0FycnkpIHtcbiAgICB2YXIgbG9jYWxQbGF5ZXJJRCA9IHRoaXMuc3RvcmUuZ2V0U3RhdGUoKS5sb2NhbFBsYXllci5pZDtcbiAgICBjb25zb2xlLmxvZygnZmlsdGVyaW5nIGZvcicsIGxvY2FsUGxheWVySUQsIHBsYXllcnNBcnJ5KTtcbiAgICByZXR1cm4gcGxheWVyc0FycnkuZmlsdGVyKGZ1bmN0aW9uIChwbGF5ZXIpIHtcbiAgICAgIHJldHVybiAhKHBsYXllci5pZCA9PT0gbG9jYWxQbGF5ZXJJRCk7XG4gICAgfSlbMF07XG4gIH0sXG5cbiAgaGFuZGxlR2FtZUFib3J0OiBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIHRoaXMudmlldy5hbGVydChwYXlsb2FkLnBheWxvYWQsIHBheWxvYWQudHlwZSk7XG4gICAgdmFyIHNldFBsYXllclNlbGVjdCA9IF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuc3RvcmUuZ2FtZVN0YXRlc1sxXX0pLFxuICAgICAgICByZXNldFNlc3Npb24gICAgPSBfYXBwQWN0aW9ucy5zZXRTZXNzaW9uUHJvcHMoe3Jvb21JRDogJyd9KSxcbiAgICAgICAgcmVzZXRQbGF5ZXIgICAgID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh0aGlzLnN0b3JlLmNyZWF0ZVBsYXllclJlc2V0T2JqZWN0KCkpO1xuXG4gICAgdGhpcy5zdG9yZS5hcHBseShbcmVzZXRQbGF5ZXIsIHJlc2V0U2Vzc2lvbiwgc2V0UGxheWVyU2VsZWN0XSk7XG4gIH0sXG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcDsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgTE9DQUxfUExBWUVSX0NPTk5FQ1QgICAgICAgOiAnTE9DQUxfUExBWUVSX0NPTk5FQ1QnLFxuICBTRVRfU0VTU0lPTl9QUk9QUyAgICAgICAgICA6ICdTRVRfU0VTU0lPTl9QUk9QUycsXG4gIFNFVF9MT0NBTF9QTEFZRVJfUFJPUFMgICAgIDogJ1NFVF9MT0NBTF9QTEFZRVJfUFJPUFMnLFxuICBTRVRfTE9DQUxfUExBWUVSX05BTUUgICAgICA6ICdTRVRfTE9DQUxfUExBWUVSX05BTUUnLFxuICBTRVRfTE9DQUxfUExBWUVSX0FQUEVBUkFOQ0U6ICdTRVRfTE9DQUxfUExBWUVSX0FQUEVBUkFOQ0UnLFxuICBTRVRfUkVNT1RFX1BMQVlFUl9QUk9QUyAgICA6ICdTRVRfUkVNT1RFX1BMQVlFUl9QUk9QUydcbiAgLy9TRUxFQ1RfUExBWUVSICAgICAgICAgICAgICA6ICdTRUxFQ1RfUExBWUVSJyxcbiAgLy9SRU1PVEVfUExBWUVSX0NPTk5FQ1QgICAgICA6ICdSRU1PVEVfUExBWUVSX0NPTk5FQ1QnLFxuICAvL0dBTUVfU1RBUlQgICAgICAgICAgICAgICAgIDogJ0dBTUVfU1RBUlQnLFxuICAvL0xPQ0FMX1FVRVNUSU9OICAgICAgICAgICAgIDogJ0xPQ0FMX1FVRVNUSU9OJyxcbiAgLy9SRU1PVEVfUVVFU1RJT04gICAgICAgICAgICA6ICdSRU1PVEVfUVVFU1RJT04nLFxuICAvL0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFIDogJ0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFJyxcbiAgLy9SRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0U6ICdSRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0UnLFxuICAvL0dBTUVfT1ZFUiAgICAgICAgICAgICAgICAgIDogJ0dBTUVfT1ZFUidcbn07IiwidmFyIF9hY3Rpb25Db25zdGFudHMgPSByZXF1aXJlKCcuL0FjdGlvbkNvbnN0YW50cy5qcycpO1xuXG4vKipcbiAqIFB1cmVseSBmb3IgY29udmVuaWVuY2UsIGFuIEV2ZW50IChcImFjdGlvblwiKSBDcmVhdG9yIGFsYSBGbHV4IHNwZWMuIEZvbGxvd1xuICogZ3VpZGVsaW5lcyBmb3IgY3JlYXRpbmcgYWN0aW9uczogaHR0cHM6Ly9naXRodWIuY29tL2FjZGxpdGUvZmx1eC1zdGFuZGFyZC1hY3Rpb25cbiAqL1xudmFyIEFjdGlvbkNyZWF0b3IgPSB7XG5cbiAgc2V0TG9jYWxQbGF5ZXJQcm9wczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX2FjdGlvbkNvbnN0YW50cy5TRVRfTE9DQUxfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgbG9jYWxQbGF5ZXI6IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgc2V0UmVtb3RlUGxheWVyUHJvcHM6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuU0VUX1JFTU9URV9QTEFZRVJfUFJPUFMsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICByZW1vdGVQbGF5ZXI6IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgc2V0U2Vzc2lvblByb3BzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlICAgOiBfYWN0aW9uQ29uc3RhbnRzLlNFVF9TRVNTSU9OX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgc2Vzc2lvbjogZGF0YVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFjdGlvbkNyZWF0b3I7IiwidmFyIF9yZXN0VVJMICAgICAgICAgICAgICAgID0gJycsXG4gICAgX3Jlc3ROdW1RdWVzdGlvbnMgICAgICAgPSAzLFxuICAgIF9yZXN0UXVlc3Rpb25DYXRlZ29yeSAgID0gMjQsIC8vIFNDSS9URUNUXG4gICAgX3Jlc3QgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3NlcnZpY2UvUmVzdC5qcycpLFxuICAgIF9ub3JpQWN0aW9uQ29uc3RhbnRzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzJyksXG4gICAgX2FwcEFjdGlvbkNvbnN0YW50cyAgICAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzJyksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICBfbWl4aW5SZWR1Y2VyU3RvcmUgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMnKSxcbiAgICBfbnVtVXRpbHMgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb3JlL051bWJlclV0aWxzLmpzJyk7XG5cbi8qKlxuICogVGhpcyBhcHBsaWNhdGlvbiBzdG9yZSBjb250YWlucyBcInJlZHVjZXIgc3RvcmVcIiBmdW5jdGlvbmFsaXR5IGJhc2VkIG9uIFJlZHV4LlxuICogVGhlIHN0b3JlIHN0YXRlIG1heSBvbmx5IGJlIGNoYW5nZWQgZnJvbSBldmVudHMgYXMgYXBwbGllZCBpbiByZWR1Y2VyIGZ1bmN0aW9ucy5cbiAqIFRoZSBzdG9yZSByZWNlaXZlZCBhbGwgZXZlbnRzIGZyb20gdGhlIGV2ZW50IGJ1cyBhbmQgZm9yd2FyZHMgdGhlbSB0byBhbGxcbiAqIHJlZHVjZXIgZnVuY3Rpb25zIHRvIG1vZGlmeSBzdGF0ZSBhcyBuZWVkZWQuIE9uY2UgdGhleSBoYXZlIHJ1biwgdGhlXG4gKiBoYW5kbGVTdGF0ZU11dGF0aW9uIGZ1bmN0aW9uIGlzIGNhbGxlZCB0byBkaXNwYXRjaCBhbiBldmVudCB0byB0aGUgYnVzLCBvclxuICogbm90aWZ5IHN1YnNjcmliZXJzIHZpYSBhbiBvYnNlcnZhYmxlLlxuICpcbiAqIEV2ZW50cyA9PiBoYW5kbGVBcHBsaWNhdGlvbkV2ZW50cyA9PiBhcHBseVJlZHVjZXJzID0+IGhhbmRsZVN0YXRlTXV0YXRpb24gPT4gTm90aWZ5XG4gKi9cbnZhciBBcHBTdG9yZSA9IE5vcmkuY3JlYXRlU3RvcmUoe1xuXG4gIG1peGluczogW1xuICAgIF9taXhpblJlZHVjZXJTdG9yZSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCgpXG4gIF0sXG5cbiAgZ2FtZVN0YXRlczogWydUSVRMRScsICdQTEFZRVJfU0VMRUNUJywgJ1dBSVRJTkdfT05fUExBWUVSJywgJ01BSU5fR0FNRScsICdHQU1FX09WRVInXSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5hZGRSZWR1Y2VyKHRoaXMubWFpblN0YXRlUmVkdWNlcik7XG4gICAgdGhpcy5pbml0aWFsaXplUmVkdWNlclN0b3JlKCk7XG4gICAgdGhpcy5zZXRTdGF0ZShOb3JpLmNvbmZpZygpKTtcbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3N0b3JlSW5pdGlhbGl6ZWQnKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IG9yIGxvYWQgYW55IG5lY2Vzc2FyeSBkYXRhIGFuZCB0aGVuIGJyb2FkY2FzdCBhIGluaXRpYWxpemVkIGV2ZW50LlxuICAgKi9cbiAgbG9hZFN0b3JlOiBmdW5jdGlvbiAoKSB7XG4gICAgLy9odHRwczovL21hcmtldC5tYXNoYXBlLmNvbS9wYXJlc2hjaG91aGFuL3RyaXZpYVxuICAgIC8vdmFyIGdldFF1ZXN0aW9ucyA9IF9yZXN0LnJlcXVlc3Qoe1xuICAgIC8vICBtZXRob2QgOiAnR0VUJyxcbiAgICAvLyAgLy9odHRwczovL3BhcmVzaGNob3VoYW4tdHJpdmlhLXYxLnAubWFzaGFwZS5jb20vdjEvZ2V0UXVpelF1ZXN0aW9uc0J5Q2F0ZWdvcnk/Y2F0ZWdvcnlJZD0xJmxpbWl0PTEwJnBhZ2U9MVxuICAgIC8vICB1cmwgICAgOiAnaHR0cHM6Ly9wYXJlc2hjaG91aGFuLXRyaXZpYS12MS5wLm1hc2hhcGUuY29tL3YxL2dldEFsbFF1aXpRdWVzdGlvbnM/bGltaXQ9JyArIF9yZXN0TnVtUXVlc3Rpb25zICsgJyZwYWdlPTEnLFxuICAgIC8vICBoZWFkZXJzOiBbeydYLU1hc2hhcGUtS2V5JzogJ3RQeEtnRHZya3Ftc2hnOHpXNG9sUzg3aHpGN0FwMXZpNjNyanNuVXVWdzFzQkhWOUtKJ31dLFxuICAgIC8vICBqc29uICAgOiB0cnVlXG4gICAgLy99KS5zdWJzY3JpYmUoXG4gICAgLy8gIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgIC8vICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgIC8vICB9LFxuICAgIC8vICBmdW5jdGlvbiBlcnJvcihkYXRhKSB7XG4gICAgLy8gICAgY29uc29sZS5sb2coJ2VycicsIGRhdGEpO1xuICAgIC8vICB9KTtcblxuICAgIC8vIFNldCBpbml0aWFsIHN0YXRlXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBjdXJyZW50U3RhdGU6IHRoaXMuZ2FtZVN0YXRlc1swXSxcbiAgICAgIHNlc3Npb24gICAgIDoge1xuICAgICAgICBzb2NrZXRJT0lEOiAnJyxcbiAgICAgICAgcm9vbUlEOiAnJ1xuICAgICAgfSxcbiAgICAgIGxvY2FsUGxheWVyIDogXy5tZXJnZSh0aGlzLmNyZWF0ZUJsYW5rUGxheWVyT2JqZWN0KCksIHRoaXMuY3JlYXRlUGxheWVyUmVzZXRPYmplY3QoKSksXG4gICAgICByZW1vdGVQbGF5ZXI6IF8ubWVyZ2UodGhpcy5jcmVhdGVCbGFua1BsYXllck9iamVjdCgpLCB0aGlzLmNyZWF0ZVBsYXllclJlc2V0T2JqZWN0KCkpLFxuICAgICAgcXVlc3Rpb25CYW5rOiBbXVxuICAgIH0pO1xuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdzdG9yZUluaXRpYWxpemVkJyk7XG4gIH0sXG5cbiAgY3JlYXRlQmxhbmtQbGF5ZXJPYmplY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQgICAgICAgIDogJycsXG4gICAgICB0eXBlICAgICAgOiAnJyxcbiAgICAgIG5hbWUgICAgICA6ICdNeXN0ZXJ5IFBsYXllciAnICsgX251bVV0aWxzLnJuZE51bWJlcigxMDAsIDk5OSksXG4gICAgICBhcHBlYXJhbmNlOiAnZ3JlZW4nXG4gICAgfTtcbiAgfSxcblxuICBjcmVhdGVQbGF5ZXJSZXNldE9iamVjdDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICBoZWFsdGggICA6IDYsXG4gICAgICBiZWhhdmlvcnM6IFtdLFxuICAgICAgc2NvcmUgICAgOiAwXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZ5IHN0YXRlIGJhc2VkIG9uIGluY29taW5nIGV2ZW50cy4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIG1vZGlmaWVkXG4gICAqIHN0YXRlIGFuZCBkb2VzIG5vdCBtb2RpZnkgdGhlIHN0YXRlIGRpcmVjdGx5LlxuICAgKiBDYW4gY29tcG9zZSBzdGF0ZSB0cmFuc2Zvcm1hdGlvbnNcbiAgICogcmV0dXJuIF8uYXNzaWduKHt9LCBzdGF0ZSwgb3RoZXJTdGF0ZVRyYW5zZm9ybWVyKHN0YXRlKSk7XG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKiBAcGFyYW0gZXZlbnRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBtYWluU3RhdGVSZWR1Y2VyOiBmdW5jdGlvbiAoc3RhdGUsIGV2ZW50KSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcblxuICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuICAgICAgY2FzZSBfbm9yaUFjdGlvbkNvbnN0YW50cy5DSEFOR0VfU1RPUkVfU1RBVEU6XG4gICAgICBjYXNlIF9hcHBBY3Rpb25Db25zdGFudHMuU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUzpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfUkVNT1RFX1BMQVlFUl9QUk9QUzpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfU0VTU0lPTl9QUk9QUzpcbiAgICAgICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCBldmVudC5wYXlsb2FkLmRhdGEpO1xuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnNvbGUud2FybignUmVkdWNlciBzdG9yZSwgdW5oYW5kbGVkIGV2ZW50IHR5cGU6ICcgKyBldmVudC50eXBlKTtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ2FsbGVkIGFmdGVyIGFsbCByZWR1Y2VycyBoYXZlIHJ1biB0byBicm9hZGNhc3QgcG9zc2libGUgdXBkYXRlcy4gRG9lc1xuICAgKiBub3QgY2hlY2sgdG8gc2VlIGlmIHRoZSBzdGF0ZSB3YXMgYWN0dWFsbHkgdXBkYXRlZC5cbiAgICovXG4gIGhhbmRsZVN0YXRlTXV0YXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzKHRoaXMuZ2V0U3RhdGUoKSk7XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwU3RvcmUoKTsiLCJ2YXIgX2FwcFN0b3JlICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZS5qcycpLFxuICAgIF9taXhpbkFwcGxpY2F0aW9uVmlldyAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L0FwcGxpY2F0aW9uVmlldy5qcycpLFxuICAgIF9taXhpbk51ZG9ydUNvbnRyb2xzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluTnVkb3J1Q29udHJvbHMuanMnKSxcbiAgICBfbWl4aW5Db21wb25lbnRWaWV3cyAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpbkNvbXBvbmVudFZpZXdzLmpzJyksXG4gICAgX21peGluU3RvcmVTdGF0ZVZpZXdzICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5TdG9yZVN0YXRlVmlld3MuanMnKSxcbiAgICBfbWl4aW5FdmVudERlbGVnYXRvciAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzJyksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKTtcblxuLyoqXG4gKiBWaWV3IGZvciBhbiBhcHBsaWNhdGlvbi5cbiAqL1xuXG52YXIgQXBwVmlldyA9IE5vcmkuY3JlYXRlVmlldyh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluQXBwbGljYXRpb25WaWV3LFxuICAgIF9taXhpbk51ZG9ydUNvbnRyb2xzLFxuICAgIF9taXhpbkNvbXBvbmVudFZpZXdzLFxuICAgIF9taXhpblN0b3JlU3RhdGVWaWV3cyxcbiAgICBfbWl4aW5FdmVudERlbGVnYXRvcigpLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0KClcbiAgXSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbml0aWFsaXplQXBwbGljYXRpb25WaWV3KFsnYXBwbGljYXRpb25zY2FmZm9sZCcsICdhcHBsaWNhdGlvbmNvbXBvbmVudHNzY2FmZm9sZCddKTtcbiAgICB0aGlzLmluaXRpYWxpemVTdGF0ZVZpZXdzKF9hcHBTdG9yZSk7XG4gICAgdGhpcy5pbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKTtcblxuICAgIHRoaXMuY29uZmlndXJlVmlld3MoKTtcbiAgfSxcblxuICBjb25maWd1cmVWaWV3czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzY3JlZW5UaXRsZSAgICAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5UaXRsZS5qcycpKCksXG4gICAgICAgIHNjcmVlblBsYXllclNlbGVjdCAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLlBsYXllclNlbGVjdC5qcycpKCksXG4gICAgICAgIHNjcmVlbldhaXRpbmdPblBsYXllciA9IHJlcXVpcmUoJy4vU2NyZWVuLldhaXRpbmdPblBsYXllci5qcycpKCksXG4gICAgICAgIHNjcmVlbk1haW5HYW1lICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLk1haW5HYW1lLmpzJykoKSxcbiAgICAgICAgc2NyZWVuR2FtZU92ZXIgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uR2FtZU92ZXIuanMnKSgpLFxuICAgICAgICBnYW1lU3RhdGVzICAgICAgICAgICAgPSBfYXBwU3RvcmUuZ2FtZVN0YXRlcztcblxuICAgIHRoaXMuc2V0Vmlld01vdW50UG9pbnQoJyNjb250ZW50cycpO1xuXG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzBdLCAndGl0bGUnLCBzY3JlZW5UaXRsZSk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzFdLCAncGxheWVyc2VsZWN0Jywgc2NyZWVuUGxheWVyU2VsZWN0KTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbMl0sICd3YWl0aW5nb25wbGF5ZXInLCBzY3JlZW5XYWl0aW5nT25QbGF5ZXIpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1szXSwgJ2dhbWUnLCBzY3JlZW5NYWluR2FtZSk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzRdLCAnZ2FtZW92ZXInLCBzY3JlZW5HYW1lT3Zlcik7XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwVmlldygpOyIsInZhciBfbm9yaUFjdGlvbnMgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJyksXG4gICAgX2FwcFZpZXcgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3JyksXG4gICAgX2FwcFN0b3JlICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKSxcbiAgICBfdGVtcGxhdGUgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICBfbWl4aW5ET01NYW5pcHVsYXRpb24gPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5ET01NYW5pcHVsYXRpb24uanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5ET01NYW5pcHVsYXRpb25cbiAgXSxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI2dhbWVvdmVyX19idXR0b24tcmVwbGF5JzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgdmFyIHN0YXRlICAgID0ge1xuICAgICAgbmFtZSAgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICBhcHBlYXJhbmNlIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZSxcbiAgICAgIGxvY2FsU2NvcmUgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5zY29yZSxcbiAgICAgIHJlbW90ZVNjb3JlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICBsb2NhbFdpbiAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICByZW1vdGVXaW4gIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPCBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICB0aWVXaW4gICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPT09IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZVxuICAgIH07XG4gICAgY29uc29sZS5sb2coc3RhdGUpO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuXG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fdGllJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fbG9vc2UnKTtcblxuICAgIGlmIChzdGF0ZS5sb2NhbFdpbikge1xuICAgICAgdGhpcy5zaG93RWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5yZW1vdGVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX2xvb3NlJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS50aWVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX3RpZScpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9hcHBBY3Rpb25zICAgICAgID0gcmVxdWlyZSgnLi4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfYXBwVmlldyAgICAgICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldy5qcycpLFxuICAgIF9hcHBTdG9yZSAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUuanMnKSxcbiAgICBfc29ja2V0SU8gICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcycpLFxuICAgIF90ZW1wbGF0ZSAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICNnYW1lX19idXR0b24tc2tpcCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzRdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIGNvbnNvbGUubG9nKGFwcFN0YXRlKTtcbiAgICByZXR1cm4ge1xuICAgICAgbG9jYWw6IGFwcFN0YXRlLmxvY2FsUGxheWVyLFxuICAgICAgcmVtb3RlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXJcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcblxuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCIvKlxuIFRPRE9cblxuICovXG5cbnZhciBfcm9vbU51bWJlckxlbmd0aCA9IDQsXG4gICAgX25vcmlBY3Rpb25zICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJyksXG4gICAgX2FwcEFjdGlvbnMgICAgICAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9hcHBWaWV3ICAgICAgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3LmpzJyksXG4gICAgX2FwcFN0b3JlICAgICAgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZS5qcycpLFxuICAgIF9zb2NrZXRJTyAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJyksXG4gICAgX3RlbXBsYXRlICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnYmx1ciAjc2VsZWN0X19wbGF5ZXJuYW1lJyAgICAgICAgOiB0aGlzLnNldFBsYXllck5hbWUuYmluZCh0aGlzKSxcbiAgICAgICdjaGFuZ2UgI3NlbGVjdF9fcGxheWVydHlwZScgICAgICA6IHRoaXMuc2V0UGxheWVyQXBwZWFyYW5jZS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1qb2lucm9vbScgIDogdGhpcy5vbkpvaW5Sb29tLmJpbmQodGhpcyksXG4gICAgICAnY2xpY2sgI3NlbGVjdF9fYnV0dG9uLWNyZWF0ZXJvb20nOiB0aGlzLm9uQ3JlYXRlUm9vbS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1nbycgICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMl19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICBzZXRQbGF5ZXJOYW1lOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYWN0aW9uID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICBuYW1lOiB2YWx1ZVxuICAgIH0pO1xuICAgIF9hcHBTdG9yZS5hcHBseShhY3Rpb24pO1xuICB9LFxuXG4gIHNldFBsYXllckFwcGVhcmFuY2U6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBhY3Rpb24gPSBfYXBwQWN0aW9ucy5zZXRMb2NhbFBsYXllclByb3BzKHtcbiAgICAgIGFwcGVhcmFuY2U6IHZhbHVlXG4gICAgfSk7XG4gICAgX2FwcFN0b3JlLmFwcGx5KGFjdGlvbik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRJbml0aWFsU3RhdGUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVydHlwZScpLnZhbHVlID0gdGhpcy5nZXRTdGF0ZSgpLmFwcGVhcmFuY2U7XG4gIH0sXG5cbiAgb25DcmVhdGVSb29tOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMudmFsaWRhdGVVc2VyRGV0YWlsc0lucHV0KCkpIHtcbiAgICAgIF9zb2NrZXRJTy5ub3RpZnlTZXJ2ZXIoX3NvY2tldElPLmV2ZW50cygpLkNSRUFURV9ST09NLCB7XG4gICAgICAgIHBsYXllckRldGFpbHM6IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLmxvY2FsUGxheWVyXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgb25Kb2luUm9vbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciByb29tSUQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19yb29taWQnKS52YWx1ZTtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVJvb21JRChyb29tSUQpKSB7XG4gICAgICBfc29ja2V0SU8ubm90aWZ5U2VydmVyKF9zb2NrZXRJTy5ldmVudHMoKS5KT0lOX1JPT00sIHtcbiAgICAgICAgcm9vbUlEICAgICAgIDogcm9vbUlELFxuICAgICAgICBwbGF5ZXJEZXRhaWxzOiBfYXBwU3RvcmUuZ2V0U3RhdGUoKS5sb2NhbFBsYXllclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9hcHBWaWV3LmFsZXJ0KCdUaGUgcm9vbSBJRCBpcyBub3QgY29ycmVjdC4gRG9lcyBpdCBjb250YWluIGxldHRlcnMgb3IgaXMgbGVzcyB0aGFuICcrX3Jvb21OdW1iZXJMZW5ndGgrJyBkaWdpdHM/JywgJ0JhZCBSb29tIElEJyk7XG4gICAgfVxuICB9LFxuXG4gIHZhbGlkYXRlVXNlckRldGFpbHNJbnB1dDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBuYW1lICAgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVybmFtZScpLnZhbHVlLFxuICAgICAgICBhcHBlYXJhbmNlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVydHlwZScpLnZhbHVlO1xuXG4gICAgaWYgKCFuYW1lLmxlbmd0aCB8fCAhYXBwZWFyYW5jZSkge1xuICAgICAgX2FwcFZpZXcuYWxlcnQoJ01ha2Ugc3VyZSB5b3VcXCd2ZSB0eXBlZCBhIG5hbWUgZm9yIHlvdXJzZWxmIGFuZCBzZWxlY3RlZCBhbiBhcHBlYXJhbmNlJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSb29tIElEIG11c3QgYmUgYW4gaW50ZWdlciBhbmQgNSBkaWdpdHNcbiAgICogQHBhcmFtIHJvb21JRFxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHZhbGlkYXRlUm9vbUlEOiBmdW5jdGlvbiAocm9vbUlEKSB7XG4gICAgaWYgKGlzTmFOKHBhcnNlSW50KHJvb21JRCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChyb29tSUQubGVuZ3RoICE9PSBfcm9vbU51bWJlckxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjdGl0bGVfX2J1dHRvbi1zdGFydCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjd2FpdGluZ19fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1szXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICByb29tSUQgICAgOiBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICByb29tSUQgICAgOiBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qKlxuICogSW5pdGlhbCBmaWxlIGZvciB0aGUgQXBwbGljYXRpb25cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgLyoqXG4gICAqIElFIHZlcnNpb25zIDkgYW5kIHVuZGVyIGFyZSBibG9ja2VkLCBvdGhlcnMgYXJlIGFsbG93ZWQgdG8gcHJvY2VlZFxuICAgKi9cbiAgaWYoX2Jyb3dzZXJJbmZvLm5vdFN1cHBvcnRlZCB8fCBfYnJvd3NlckluZm8uaXNJRTkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuaW5uZXJIVE1MID0gJzxoMz5Gb3IgdGhlIGJlc3QgZXhwZXJpZW5jZSwgcGxlYXNlIHVzZSBJbnRlcm5ldCBFeHBsb3JlciAxMCssIEZpcmVmb3gsIENocm9tZSBvciBTYWZhcmkgdG8gdmlldyB0aGlzIGFwcGxpY2F0aW9uLjwvaDM+JztcbiAgfSBlbHNlIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24gbW9kdWxlIGFuZCBpbml0aWFsaXplXG4gICAgICovXG4gICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgd2luZG93Lk5vcmkgPSByZXF1aXJlKCcuL25vcmkvTm9yaS5qcycpO1xuICAgICAgd2luZG93LkFQUCA9IHJlcXVpcmUoJy4vYXBwL0FwcC5qcycpO1xuICAgICAgQVBQLmluaXRpYWxpemUoKTtcbiAgICB9O1xuXG4gIH1cblxufSgpKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbnZhciBOb3JpID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vdXRpbHMvRGlzcGF0Y2hlci5qcycpLFxuICAgICAgX3JvdXRlciAgICAgPSByZXF1aXJlKCcuL3V0aWxzL1JvdXRlci5qcycpO1xuXG4gIC8vIFN3aXRjaCBMb2Rhc2ggdG8gdXNlIE11c3RhY2hlIHN0eWxlIHRlbXBsYXRlc1xuICBfLnRlbXBsYXRlU2V0dGluZ3MuaW50ZXJwb2xhdGUgPSAve3soW1xcc1xcU10rPyl9fS9nO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGdldERpc3BhdGNoZXIoKSB7XG4gICAgcmV0dXJuIF9kaXNwYXRjaGVyO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Um91dGVyKCkge1xuICAgIHJldHVybiBfcm91dGVyO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgKHdpbmRvdy5BUFBfQ09ORklHX0RBVEEgfHwge30pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRSb3V0ZSgpIHtcbiAgICByZXR1cm4gX3JvdXRlci5nZXRDdXJyZW50Um91dGUoKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgRmFjdG9yaWVzIC0gY29uY2F0ZW5hdGl2ZSBpbmhlcml0YW5jZSwgZGVjb3JhdG9yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogTWVyZ2VzIGEgY29sbGVjdGlvbiBvZiBvYmplY3RzXG4gICAqIEBwYXJhbSB0YXJnZXRcbiAgICogQHBhcmFtIHNvdXJjZUFycmF5XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYXNzaWduQXJyYXkodGFyZ2V0LCBzb3VyY2VBcnJheSkge1xuICAgIHNvdXJjZUFycmF5LmZvckVhY2goZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgICAgdGFyZ2V0ID0gXy5hc3NpZ24odGFyZ2V0LCBzb3VyY2UpO1xuICAgIH0pO1xuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IE5vcmkgYXBwbGljYXRpb24gaW5zdGFuY2VcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUFwcGxpY2F0aW9uKGN1c3RvbSkge1xuICAgIGN1c3RvbS5taXhpbnMucHVzaCh0aGlzKTtcbiAgICByZXR1cm4gYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBtYWluIGFwcGxpY2F0aW9uIHN0b3JlXG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdG9yZShjdXN0b20pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gY3MoKSB7XG4gICAgICByZXR1cm4gXy5hc3NpZ24oe30sIGJ1aWxkRnJvbU1peGlucyhjdXN0b20pKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgbWFpbiBhcHBsaWNhdGlvbiB2aWV3XG4gICAqIEBwYXJhbSBjdXN0b21cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVWaWV3KGN1c3RvbSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBjdigpIHtcbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSkpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogTWl4ZXMgaW4gdGhlIG1vZHVsZXMgc3BlY2lmaWVkIGluIHRoZSBjdXN0b20gYXBwbGljYXRpb24gb2JqZWN0XG4gICAqIEBwYXJhbSBzb3VyY2VPYmplY3RcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBidWlsZEZyb21NaXhpbnMoc291cmNlT2JqZWN0KSB7XG4gICAgdmFyIG1peGlucztcblxuICAgIGlmIChzb3VyY2VPYmplY3QubWl4aW5zKSB7XG4gICAgICBtaXhpbnMgPSBzb3VyY2VPYmplY3QubWl4aW5zO1xuICAgIH1cblxuICAgIG1peGlucy5wdXNoKHNvdXJjZU9iamVjdCk7XG4gICAgcmV0dXJuIGFzc2lnbkFycmF5KHt9LCBtaXhpbnMpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBjb25maWcgICAgICAgICAgIDogZ2V0Q29uZmlnLFxuICAgIGRpc3BhdGNoZXIgICAgICAgOiBnZXREaXNwYXRjaGVyLFxuICAgIHJvdXRlciAgICAgICAgICAgOiBnZXRSb3V0ZXIsXG4gICAgY3JlYXRlQXBwbGljYXRpb246IGNyZWF0ZUFwcGxpY2F0aW9uLFxuICAgIGNyZWF0ZVN0b3JlICAgICAgOiBjcmVhdGVTdG9yZSxcbiAgICBjcmVhdGVWaWV3ICAgICAgIDogY3JlYXRlVmlldyxcbiAgICBidWlsZEZyb21NaXhpbnMgIDogYnVpbGRGcm9tTWl4aW5zLFxuICAgIGdldEN1cnJlbnRSb3V0ZSAgOiBnZXRDdXJyZW50Um91dGUsXG4gICAgYXNzaWduQXJyYXkgICAgICA6IGFzc2lnbkFycmF5XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaSgpO1xuXG5cbiIsIi8qIEBmbG93IHdlYWsgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIENIQU5HRV9TVE9SRV9TVEFURTogJ0NIQU5HRV9TVE9SRV9TVEFURSdcbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIEFjdGlvbiBDcmVhdG9yXG4gKiBCYXNlZCBvbiBGbHV4IEFjdGlvbnNcbiAqIEZvciBtb3JlIGluZm9ybWF0aW9uIGFuZCBndWlkZWxpbmVzOiBodHRwczovL2dpdGh1Yi5jb20vYWNkbGl0ZS9mbHV4LXN0YW5kYXJkLWFjdGlvblxuICovXG52YXIgX25vcmlBY3Rpb25Db25zdGFudHMgPSByZXF1aXJlKCcuL0FjdGlvbkNvbnN0YW50cy5qcycpO1xuXG52YXIgTm9yaUFjdGlvbkNyZWF0b3IgPSB7XG5cbiAgY2hhbmdlU3RvcmVTdGF0ZTogZnVuY3Rpb24gKGRhdGEsIGlkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9ub3JpQWN0aW9uQ29uc3RhbnRzLkNIQU5HRV9TVE9SRV9TVEFURSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgaWQgIDogaWQsXG4gICAgICAgIGRhdGE6IGRhdGFcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9yaUFjdGlvbkNyZWF0b3I7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIEFqYXggLyBSZXN0IG1vZHVsZS5cbiAqIFJldHVybnMgYW4gUnhKUyBPYmVydmFibGVcbiAqXG4gKiBVc2FnZTpcbiAqXG4gdmFyIHJlcXVlc3QgPSByZXF1aXJlKCcuL25vcmkvc2VydmljZS9SZXN0Jyk7XG5cbiB2YXIgZ2V0U3ViID0gcmVxdWVzdC5yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgdXJsICAgOiAnL2l0ZW1zJyxcbiAgICAgICAgaGVhZGVyczogW3sna2V5JzondmFsdWUnfV0sXG4gICAgICAgIGpzb24gIDogdHJ1ZVxuICAgICAgfSkuc3Vic2NyaWJlKFxuIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgICAgICB9LFxuIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gdmFyIHBvc3RTdWIgPSByZXF1ZXN0LnJlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgdXJsICAgOiAnL2l0ZW1zJyxcbiAgICAgICAgZGF0YSAgOiBKU09OLnN0cmluZ2lmeSh7a2V5OiAndmFsdWUnfSksXG4gICAgICAgIGpzb24gIDogdHJ1ZVxuICAgICAgfSkuc3Vic2NyaWJlKFxuIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgICAgICB9LFxuIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gdmFyIHB1dFN1YiA9IHJlcXVlc3QucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIHVybCAgIDogJy9pdGVtcy80MicsXG4gICAgICAgIGRhdGEgIDogSlNPTi5zdHJpbmdpZnkoe2tleTogJ3ZhbHVlJ30pLFxuICAgICAgICBqc29uICA6IHRydWVcbiAgICAgIH0pLnN1YnNjcmliZShcbiBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnb2snLCBkYXRhKTtcbiAgICAgICAgfSxcbiBmdW5jdGlvbiBlcnJvcihkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2VycicsIGRhdGEpO1xuICAgICAgICB9KTtcblxuIHZhciBkZWxTdWIgPSByZXF1ZXN0LnJlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICB1cmwgICA6ICcvaXRlbXMvNDInLFxuICAgICAgICBqc29uICA6IHRydWVcbiAgICAgIH0pLnN1YnNjcmliZShcbiBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnb2snLCBkYXRhKTtcbiAgICAgICAgfSxcbiBmdW5jdGlvbiBlcnJvcihkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2VycicsIGRhdGEpO1xuICAgICAgICB9KTtcbiAqXG4gKi9cblxudmFyIFJlc3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgZnVuY3Rpb24gcmVxdWVzdChyZXFPYmopIHtcblxuICAgIHZhciB4aHIgICAgID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCksXG4gICAgICAgIGpzb24gICAgPSByZXFPYmouanNvbiB8fCBmYWxzZSxcbiAgICAgICAgbWV0aG9kICA9IHJlcU9iai5tZXRob2QudG9VcHBlckNhc2UoKSB8fCAnR0VUJyxcbiAgICAgICAgdXJsICAgICA9IHJlcU9iai51cmwsXG4gICAgICAgIGhlYWRlcnMgPSByZXFPYmouaGVhZGVycyB8fCBbXSxcbiAgICAgICAgZGF0YSAgICA9IHJlcU9iai5kYXRhIHx8IG51bGw7XG5cbiAgICByZXR1cm4gbmV3IFJ4Lk9ic2VydmFibGUuY3JlYXRlKGZ1bmN0aW9uIG1ha2VSZXEob2JzZXJ2ZXIpIHtcbiAgICAgIHhoci5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcblxuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgaWYgKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGlmIChqc29uKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIGhhbmRsZUVycm9yKCdSZXN1bHQnLCAnRXJyb3IgcGFyc2luZyByZXN1bHQuIFN0YXR1czogJyArIHhoci5zdGF0dXMgKyAnLCBSZXNwb25zZTogJyArIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhhbmRsZUVycm9yKHhoci5zdGF0dXMsIHhoci5zdGF0dXNUZXh0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHhoci5vbmVycm9yICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGhhbmRsZUVycm9yKCdOZXR3b3JrIGVycm9yJyk7XG4gICAgICB9O1xuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaGFuZGxlRXJyb3IoJ1RpbWVvdXQnKTtcbiAgICAgIH07XG4gICAgICB4aHIub25hYm9ydCAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBoYW5kbGVFcnJvcignQWJvdXQnKTtcbiAgICAgIH07XG5cbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbiAoaGVhZGVyUGFpcikge1xuICAgICAgICB2YXIgcHJvcCA9IE9iamVjdC5rZXlzKGhlYWRlclBhaXIpWzBdLFxuICAgICAgICAgICAgdmFsdWUgPSBoZWFkZXJQYWlyW3Byb3BdO1xuICAgICAgICBpZiAocHJvcCAmJiB2YWx1ZSkge1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKHByb3AsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ25vcmkvc2VydmljZS9yZXN0LCBiYWQgaGVhZGVyIHBhaXI6ICcsIGhlYWRlclBhaXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gc2V0IG5vbiBqc29uIGhlYWRlcj8gJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCdcbiAgICAgIGlmIChqc29uICYmIG1ldGhvZCAhPT0gXCJHRVRcIikge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIik7XG4gICAgICB9IGVsc2UgaWYgKGpzb24gJiYgbWV0aG9kID09PSBcIkdFVFwiKSB7XG4gICAgICAgIC8vLCB0ZXh0LypcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJBY2NlcHRcIiwgXCJhcHBsaWNhdGlvbi9qc29uOyBvZGF0YT12ZXJib3NlXCIpOyAgLy8gb2RhdGEgcGFyYW0gZm9yIFNoYXJlcG9pbnRcbiAgICAgIH1cblxuICAgICAgeGhyLnNlbmQoZGF0YSk7XG5cbiAgICAgIGZ1bmN0aW9uIGhhbmRsZUVycm9yKHR5cGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgJyc7XG4gICAgICAgIG9ic2VydmVyLm9uRXJyb3IodHlwZSArICcgJyArIG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByZXF1ZXN0OiByZXF1ZXN0XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVzdCgpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxudmFyIFNvY2tldElPQ29ubmVjdG9yID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfc3ViamVjdCAgPSBuZXcgUnguQmVoYXZpb3JTdWJqZWN0KCksXG4gICAgICBfc29ja2V0SU8gPSBpbygpLFxuICAgICAgX2xvZyAgICAgID0gW10sXG4gICAgICBfY29ubmVjdGlvbklELFxuICAgICAgX2V2ZW50cyAgID0gcmVxdWlyZSgnLi9Tb2NrZXRJT0V2ZW50cy5qcycpO1xuXG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBfc29ja2V0SU8ub24oX2V2ZW50cy5OT1RJRllfQ0xJRU5ULCBvbk5vdGlmeUNsaWVudCk7XG4gIH1cblxuICAvKipcbiAgICogQWxsIG5vdGlmaWNhdGlvbnMgZnJvbSBTb2NrZXQuaW8gY29tZSBoZXJlXG4gICAqIEBwYXJhbSBwYXlsb2FkIHt0eXBlLCBpZCwgdGltZSwgcGF5bG9hZH1cbiAgICovXG4gIGZ1bmN0aW9uIG9uTm90aWZ5Q2xpZW50KHBheWxvYWQpIHtcbiAgICBfbG9nLnB1c2gocGF5bG9hZCk7XG5cbiAgICBpZiAocGF5bG9hZC50eXBlID09PSBfZXZlbnRzLlBJTkcpIHtcbiAgICAgIG5vdGlmeVNlcnZlcihfZXZlbnRzLlBPTkcsIHt9KTtcbiAgICB9IGVsc2UgaWYgKHBheWxvYWQudHlwZSA9PT0gX2V2ZW50cy5QT05HKSB7XG4gICAgICBjb25zb2xlLmxvZygnU09DS0VULklPIFBPTkchJyk7XG4gICAgfSBlbHNlIGlmIChwYXlsb2FkLnR5cGUgPT09IF9ldmVudHMuQ09OTkVDVCkge1xuICAgICAgX2Nvbm5lY3Rpb25JRCA9IHBheWxvYWQuaWQ7XG4gICAgfVxuICAgIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGluZygpIHtcbiAgICBub3RpZnlTZXJ2ZXIoX2V2ZW50cy5QSU5HLCB7fSk7XG4gIH1cblxuICAvKipcbiAgICogQWxsIGNvbW11bmljYXRpb25zIHRvIHRoZSBzZXJ2ZXIgc2hvdWxkIGdvIHRocm91Z2ggaGVyZVxuICAgKiBAcGFyYW0gdHlwZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U2VydmVyKHR5cGUsIHBheWxvYWQpIHtcbiAgICBfc29ja2V0SU8uZW1pdChfZXZlbnRzLk5PVElGWV9TRVJWRVIsIHtcbiAgICAgIHR5cGUgICAgICAgIDogdHlwZSxcbiAgICAgIGNvbm5lY3Rpb25JRDogX2Nvbm5lY3Rpb25JRCxcbiAgICAgIHBheWxvYWQgICAgIDogcGF5bG9hZFxuICAgIH0pO1xuICB9XG5cbiAgLy9mdW5jdGlvbiBlbWl0KG1lc3NhZ2UsIHBheWxvYWQpIHtcbiAgLy8gIG1lc3NhZ2UgPSBtZXNzYWdlIHx8IF9ldmVudHMuTUVTU0FHRTtcbiAgLy8gIHBheWxvYWQgPSBwYXlsb2FkIHx8IHt9O1xuICAvLyAgX3NvY2tldElPLmVtaXQobWVzc2FnZSwgcGF5bG9hZCk7XG4gIC8vfVxuICAvL1xuICAvL2Z1bmN0aW9uIG9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gIC8vICBfc29ja2V0SU8ub24oZXZlbnQsIGhhbmRsZXIpO1xuICAvL31cblxuICAvKipcbiAgICogU3Vic2NyaWJlIGhhbmRsZXIgdG8gdXBkYXRlc1xuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgZnJvbSB1cGRhdGUgb3Igd2hhdGV2ZXIgZnVuY3Rpb24gdG8gZGlzcGF0Y2ggdG8gc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICBfc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgbGFzdCBwYXlsb2FkIHRoYXQgd2FzIGRpc3BhdGNoZWQgdG8gc3Vic2NyaWJlcnNcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRMYXN0Tm90aWZpY2F0aW9uKCkge1xuICAgIHJldHVybiBfc3ViamVjdC5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RXZlbnRDb25zdGFudHMoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCBfZXZlbnRzKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZXZlbnRzICAgICAgICAgICAgIDogZ2V0RXZlbnRDb25zdGFudHMsXG4gICAgaW5pdGlhbGl6ZSAgICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBwaW5nICAgICAgICAgICAgICAgOiBwaW5nLFxuICAgIG5vdGlmeVNlcnZlciAgICAgICA6IG5vdGlmeVNlcnZlcixcbiAgICBzdWJzY3JpYmUgICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnMgIDogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgZ2V0TGFzdE5vdGlmaWNhdGlvbjogZ2V0TGFzdE5vdGlmaWNhdGlvblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNvY2tldElPQ29ubmVjdG9yKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgUElORyAgICAgICAgICAgICA6ICdwaW5nJyxcbiAgUE9ORyAgICAgICAgICAgICA6ICdwb25nJyxcbiAgTk9USUZZX0NMSUVOVCAgICA6ICdub3RpZnlfY2xpZW50JyxcbiAgTk9USUZZX1NFUlZFUiAgICA6ICdub3RpZnlfc2VydmVyJyxcbiAgQ09OTkVDVCAgICAgICAgICA6ICdjb25uZWN0JyxcbiAgRFJPUFBFRCAgICAgICAgICA6ICdkcm9wcGVkJyxcbiAgVVNFUl9DT05ORUNURUQgICA6ICd1c2VyX2Nvbm5lY3RlZCcsXG4gIFVTRVJfRElTQ09OTkVDVEVEOiAndXNlcl9kaXNjb25uZWN0ZWQnLFxuICBFTUlUICAgICAgICAgICAgIDogJ2VtaXQnLFxuICBCUk9BRENBU1QgICAgICAgIDogJ2Jyb2FkY2FzdCcsXG4gIFNZU1RFTV9NRVNTQUdFICAgOiAnc3lzdGVtX21lc3NhZ2UnLFxuICBNRVNTQUdFICAgICAgICAgIDogJ21lc3NhZ2UnLFxuICBDUkVBVEVfUk9PTSAgICAgIDogJ2NyZWF0ZV9yb29tJyxcbiAgSk9JTl9ST09NICAgICAgICA6ICdqb2luX3Jvb20nLFxuICBMRUFWRV9ST09NICAgICAgIDogJ2xlYXZlX3Jvb20nLFxuICBHQU1FX1NUQVJUICAgICAgIDogJ2dhbWVfc3RhcnQnLFxuICBHQU1FX0VORCAgICAgICAgIDogJ2dhbWVfZW5kJyxcbiAgR0FNRV9BQk9SVCAgICAgICA6ICdnYW1lX2Fib3J0J1xufTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogV3JhcHMgSW1tdXRhYmxlLmpzJ3MgTWFwIGluIHRoZSBzYW1lIHN5bnRheCBhcyB0aGUgU2ltcGxlU3RvcmUgbW9kdWxlXG4gKlxuICogVmlldyBEb2NzIGh0dHA6Ly9mYWNlYm9vay5naXRodWIuaW8vaW1tdXRhYmxlLWpzL2RvY3MvIy9NYXBcbiAqL1xuXG52YXIgaW1tdXRhYmxlID0gcmVxdWlyZSgnLi4vLi4vdmVuZG9yL2ltbXV0YWJsZS5taW4uanMnKTtcblxudmFyIEltbXV0YWJsZU1hcCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF9tYXAgPSBpbW11dGFibGUuTWFwKCk7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIE1hcCBvYmplY3RcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRNYXAoKSB7XG4gICAgcmV0dXJuIF9tYXA7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgY29weSBvZiB0aGUgc3RhdGVcbiAgICogQHJldHVybnMge3ZvaWR8Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICAgIHJldHVybiBfbWFwLnRvSlMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZVxuICAgKiBAcGFyYW0gbmV4dFxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U3RhdGUobmV4dCkge1xuICAgIF9tYXAgPSBfbWFwLm1lcmdlKG5leHQpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBnZXRTdGF0ZTogZ2V0U3RhdGUsXG4gICAgc2V0U3RhdGU6IHNldFN0YXRlLFxuICAgIGdldE1hcCAgOiBnZXRNYXBcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbW11dGFibGVNYXA7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIE1peGluIGZvciBOb3JpIHN0b3JlcyB0byBhZGQgZnVuY3Rpb25hbGl0eSBzaW1pbGFyIHRvIFJlZHV4JyBSZWR1Y2VyIGFuZCBzaW5nbGVcbiAqIG9iamVjdCBzdGF0ZSB0cmVlIGNvbmNlcHQuIE1peGluIHNob3VsZCBiZSBjb21wb3NlZCB0byBub3JpL3N0b3JlL0FwcGxpY2F0aW9uU3RvcmVcbiAqIGR1cmluZyBjcmVhdGlvbiBvZiBtYWluIEFwcFN0b3JlXG4gKlxuICogaHR0cHM6Ly9nYWVhcm9uLmdpdGh1Yi5pby9yZWR1eC9kb2NzL2FwaS9TdG9yZS5odG1sXG4gKiBodHRwczovL2dhZWFyb24uZ2l0aHViLmlvL3JlZHV4L2RvY3MvYmFzaWNzL1JlZHVjZXJzLmh0bWxcbiAqXG4gKiBDcmVhdGVkIDgvMTMvMTVcbiAqL1xudmFyIE1peGluUmVkdWNlclN0b3JlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMsXG4gICAgICBfc3RhdGUsXG4gICAgICBfc3RhdGVSZWR1Y2VycyA9IFtdO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBfc3RhdGUgbWlnaHQgbm90IGV4aXN0IGlmIHN1YnNjcmliZXJzIGFyZSBhZGRlZCBiZWZvcmUgdGhpcyBzdG9yZSBpcyBpbml0aWFsaXplZFxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gICAgaWYgKF9zdGF0ZSkge1xuICAgICAgcmV0dXJuIF9zdGF0ZS5nZXRTdGF0ZSgpO1xuICAgIH1cbiAgICByZXR1cm4ge307XG4gIH1cblxuICBmdW5jdGlvbiBzZXRTdGF0ZShzdGF0ZSkge1xuICAgIGlmICghXy5pc0VxdWFsKHN0YXRlLCBfc3RhdGUpKSB7XG4gICAgICBfc3RhdGUuc2V0U3RhdGUoc3RhdGUpO1xuICAgICAgX3RoaXMubm90aWZ5U3Vic2NyaWJlcnMoe30pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFJlZHVjZXJzKHJlZHVjZXJBcnJheSkge1xuICAgIF9zdGF0ZVJlZHVjZXJzID0gcmVkdWNlckFycmF5O1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkUmVkdWNlcihyZWR1Y2VyKSB7XG4gICAgX3N0YXRlUmVkdWNlcnMucHVzaChyZWR1Y2VyKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgSW5pdFxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogU2V0IHVwIGV2ZW50IGxpc3RlbmVyL3JlY2VpdmVyXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplUmVkdWNlclN0b3JlKCkge1xuICAgIGlmICghdGhpcy5jcmVhdGVTdWJqZWN0KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUgbmVlZHMgbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0IHRvIG5vdGlmeScpO1xuICAgIH1cblxuICAgIF90aGlzICA9IHRoaXM7XG4gICAgX3N0YXRlID0gcmVxdWlyZSgnLi9JbW11dGFibGVNYXAuanMnKSgpO1xuXG4gICAgaWYgKCFfc3RhdGVSZWR1Y2Vycykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWR1Y2VyU3RvcmUsIG11c3Qgc2V0IGEgcmVkdWNlciBiZWZvcmUgaW5pdGlhbGl6YXRpb24nKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgaW5pdGlhbCBzdGF0ZSBmcm9tIGVtcHR5IGV2ZW50XG4gICAgYXBwbHlSZWR1Y2Vycyh7fSk7XG4gIH1cblxuICAvKipcbiAgICogQXBwbHkgdGhlIGFjdGlvbiBvYmplY3QgdG8gdGhlIHJlZHVjZXJzIHRvIGNoYW5nZSBzdGF0ZVxuICAgKiBhcmUgc2VudCB0byBhbGwgcmVkdWNlcnMgdG8gdXBkYXRlIHRoZSBzdGF0ZVxuICAgKiBAcGFyYW0gYWN0aW9uT2JqT3JBcnJ5IEFycmF5IG9mIGFjdGlvbnMgb3IgYSBzaW5nbGUgYWN0aW9uIHRvIHJlZHVjZSBmcm9tXG4gICAqL1xuICBmdW5jdGlvbiBhcHBseShhY3Rpb25PYmpPckFycnkpIHtcbiAgICBpZihpcy5hcnJheShhY3Rpb25PYmpPckFycnkpKSB7XG4gICAgICBhY3Rpb25PYmpPckFycnkuZm9yRWFjaChhY3Rpb25PYmogPT4gYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmopKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmpPckFycnkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KSB7XG4gICAgdmFyIG5leHRTdGF0ZSA9IGFwcGx5UmVkdWNlcnNUb1N0YXRlKGdldFN0YXRlKCksIGFjdGlvbk9iamVjdCk7XG4gICAgc2V0U3RhdGUobmV4dFN0YXRlKTtcbiAgICBfdGhpcy5oYW5kbGVTdGF0ZU11dGF0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogQVBJIGhvb2sgdG8gaGFuZGxlIHN0YXRlIHVwZGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlTXV0YXRpb24oKSB7XG4gICAgLy8gb3ZlcnJpZGUgdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgc3RhdGUgZnJvbSB0aGUgY29tYmluZWQgcmVkdWNlcyBhbmQgYWN0aW9uIG9iamVjdFxuICAgKiBTdG9yZSBzdGF0ZSBpc24ndCBtb2RpZmllZCwgY3VycmVudCBzdGF0ZSBpcyBwYXNzZWQgaW4gYW5kIG11dGF0ZWQgc3RhdGUgcmV0dXJuZWRcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25cbiAgICogQHJldHVybnMgeyp8e319XG4gICAqL1xuICBmdW5jdGlvbiBhcHBseVJlZHVjZXJzVG9TdGF0ZShzdGF0ZSwgYWN0aW9uKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICAvLyBUT0RPIHNob3VsZCB0aGlzIGFjdHVhbGx5IHVzZSBhcnJheS5yZWR1Y2UoKT9cbiAgICBfc3RhdGVSZWR1Y2Vycy5mb3JFYWNoKGZ1bmN0aW9uIGFwcGx5U3RhdGVSZWR1Y2VyRnVuY3Rpb24ocmVkdWNlckZ1bmMpIHtcbiAgICAgIHN0YXRlID0gcmVkdWNlckZ1bmMoc3RhdGUsIGFjdGlvbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlbXBsYXRlIHJlZHVjZXIgZnVuY3Rpb25cbiAgICogU3RvcmUgc3RhdGUgaXNuJ3QgbW9kaWZpZWQsIGN1cnJlbnQgc3RhdGUgaXMgcGFzc2VkIGluIGFuZCBtdXRhdGVkIHN0YXRlIHJldHVybmVkXG5cbiAgIGZ1bmN0aW9uIHRlbXBsYXRlUmVkdWNlckZ1bmN0aW9uKHN0YXRlLCBldmVudCkge1xuICAgICAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcbiAgICAgICAgICBjYXNlIF9ub3JpQWN0aW9uQ29uc3RhbnRzLk1PREVMX0RBVEFfQ0hBTkdFRDpcbiAgICAgICAgICAgIC8vIGNhbiBjb21wb3NlIG90aGVyIHJlZHVjZXJzXG4gICAgICAgICAgICAvLyByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIG90aGVyU3RhdGVUcmFuc2Zvcm1lcihzdGF0ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCB7cHJvcDogZXZlbnQucGF5bG9hZC52YWx1ZX0pO1xuICAgICAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1JlZHVjZXIgc3RvcmUsIHVuaGFuZGxlZCBldmVudCB0eXBlOiAnK2V2ZW50LnR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAqL1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZTogaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSxcbiAgICBnZXRTdGF0ZSAgICAgICAgICAgICAgOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZSAgICAgICAgICAgICAgOiBzZXRTdGF0ZSxcbiAgICBhcHBseSAgICAgICAgICAgICAgICAgOiBhcHBseSxcbiAgICBzZXRSZWR1Y2VycyAgICAgICAgICAgOiBzZXRSZWR1Y2VycyxcbiAgICBhZGRSZWR1Y2VyICAgICAgICAgICAgOiBhZGRSZWR1Y2VyLFxuICAgIGFwcGx5UmVkdWNlcnMgICAgICAgICA6IGFwcGx5UmVkdWNlcnMsXG4gICAgYXBwbHlSZWR1Y2Vyc1RvU3RhdGUgIDogYXBwbHlSZWR1Y2Vyc1RvU3RhdGUsXG4gICAgaGFuZGxlU3RhdGVNdXRhdGlvbiAgIDogaGFuZGxlU3RhdGVNdXRhdGlvblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluUmVkdWNlclN0b3JlKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKlxuIE1hdHQgUGVya2lucywgNi8xMi8xNVxuXG4gcHVibGlzaCBwYXlsb2FkIG9iamVjdFxuXG4ge1xuIHR5cGU6IEVWVF9UWVBFLFxuIHBheWxvYWQ6IHtcbiBrZXk6IHZhbHVlXG4gfVxuIH1cblxuICovXG52YXIgRGlzcGF0Y2hlciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3RNYXAgID0ge30sXG4gICAgICBfcmVjZWl2ZXJNYXAgPSB7fSxcbiAgICAgIF9pZCAgICAgICAgICA9IDAsXG4gICAgICBfbG9nICAgICAgICAgPSBbXSxcbiAgICAgIF9xdWV1ZSAgICAgICA9IFtdLFxuICAgICAgX3RpbWVyT2JzZXJ2YWJsZSxcbiAgICAgIF90aW1lclN1YnNjcmlwdGlvbixcbiAgICAgIF90aW1lclBhdXNhYmxlO1xuXG4gIC8qKlxuICAgKiBBZGQgYW4gZXZlbnQgYXMgb2JzZXJ2YWJsZVxuICAgKiBAcGFyYW0gZXZ0U3RyIEV2ZW50IG5hbWUgc3RyaW5nXG4gICAqIEBwYXJhbSBoYW5kbGVyIG9uTmV4dCgpIHN1YnNjcmlwdGlvbiBmdW5jdGlvblxuICAgKiBAcGFyYW0gb25jZU9yQ29udGV4dCBvcHRpb25hbCwgZWl0aGVyIHRoZSBjb250ZXh0IHRvIGV4ZWN1dGUgdGhlIGhhbmRlciBvciBvbmNlIGJvb2xcbiAgICogQHBhcmFtIG9uY2Ugd2lsbCBjb21wbGV0ZS9kaXNwb3NlIGFmdGVyIG9uZSBmaXJlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGV2dFN0ciwgaGFuZGxlciwgb25jZU9yQ29udGV4dCwgb25jZSkge1xuICAgIHZhciBoYW5kbGVyQ29udGV4dCA9IHdpbmRvdztcblxuICAgIC8vY29uc29sZS5sb2coJ2Rpc3BhdGNoZXIgc3Vic2NyaWJlJywgZXZ0U3RyLCBoYW5kbGVyLCBvbmNlT3JDb250ZXh0LCBvbmNlKTtcblxuICAgIGlmIChpcy5mYWxzZXkoZXZ0U3RyKSkge1xuICAgICAgY29uc29sZS53YXJuKCdEaXNwYXRjaGVyOiBGYXNsZXkgZXZlbnQgc3RyaW5nIHBhc3NlZCBmb3IgaGFuZGxlcicsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmIChpcy5mYWxzZXkoaGFuZGxlcikpIHtcbiAgICAgIGNvbnNvbGUud2FybignRGlzcGF0Y2hlcjogRmFzbGV5IGhhbmRsZXIgcGFzc2VkIGZvciBldmVudCBzdHJpbmcnLCBldnRTdHIpO1xuICAgIH1cblxuICAgIGlmIChvbmNlT3JDb250ZXh0IHx8IG9uY2VPckNvbnRleHQgPT09IGZhbHNlKSB7XG4gICAgICBpZiAob25jZU9yQ29udGV4dCA9PT0gdHJ1ZSB8fCBvbmNlT3JDb250ZXh0ID09PSBmYWxzZSkge1xuICAgICAgICBvbmNlID0gb25jZU9yQ29udGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhhbmRsZXJDb250ZXh0ID0gb25jZU9yQ29udGV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIV9zdWJqZWN0TWFwW2V2dFN0cl0pIHtcbiAgICAgIF9zdWJqZWN0TWFwW2V2dFN0cl0gPSBbXTtcbiAgICB9XG5cbiAgICB2YXIgc3ViamVjdCA9IG5ldyBSeC5TdWJqZWN0KCk7XG5cbiAgICBfc3ViamVjdE1hcFtldnRTdHJdLnB1c2goe1xuICAgICAgb25jZSAgICA6IG9uY2UsXG4gICAgICBwcmlvcml0eTogMCxcbiAgICAgIGhhbmRsZXIgOiBoYW5kbGVyLFxuICAgICAgY29udGV4dCA6IGhhbmRsZXJDb250ZXh0LFxuICAgICAgc3ViamVjdCA6IHN1YmplY3QsXG4gICAgICB0eXBlICAgIDogMFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIuYmluZChoYW5kbGVyQ29udGV4dCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdGhlIGV2ZW50IHByb2Nlc3NpbmcgdGltZXIgb3IgcmVzdW1lIGEgcGF1c2VkIHRpbWVyXG4gICAqL1xuICBmdW5jdGlvbiBpbml0VGltZXIoKSB7XG4gICAgaWYgKF90aW1lck9ic2VydmFibGUpIHtcbiAgICAgIF90aW1lclBhdXNhYmxlLm9uTmV4dCh0cnVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfdGltZXJQYXVzYWJsZSAgICAgPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIF90aW1lck9ic2VydmFibGUgICA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMSkucGF1c2FibGUoX3RpbWVyUGF1c2FibGUpO1xuICAgIF90aW1lclN1YnNjcmlwdGlvbiA9IF90aW1lck9ic2VydmFibGUuc3Vic2NyaWJlKHByb2Nlc3NOZXh0RXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNoaWZ0IG5leHQgZXZlbnQgdG8gaGFuZGxlIG9mZiBvZiB0aGUgcXVldWUgYW5kIGRpc3BhdGNoIGl0XG4gICAqL1xuICBmdW5jdGlvbiBwcm9jZXNzTmV4dEV2ZW50KCkge1xuICAgIHZhciBldnQgPSBfcXVldWUuc2hpZnQoKTtcbiAgICBpZiAoZXZ0KSB7XG4gICAgICBkaXNwYXRjaFRvUmVjZWl2ZXJzKGV2dCk7XG4gICAgICBkaXNwYXRjaFRvU3Vic2NyaWJlcnMoZXZ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX3RpbWVyUGF1c2FibGUub25OZXh0KGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHVzaCBldmVudCB0byB0aGUgc3RhY2sgYW5kIGJlZ2luIGV4ZWN1dGlvblxuICAgKiBAcGFyYW0gcGF5bG9hZE9iaiB0eXBlOlN0cmluZywgcGF5bG9hZDpkYXRhXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqL1xuICBmdW5jdGlvbiBwdWJsaXNoKHBheWxvYWRPYmopIHtcbiAgICBfbG9nLnB1c2gocGF5bG9hZE9iaik7XG4gICAgX3F1ZXVlLnB1c2gocGF5bG9hZE9iaik7XG5cbiAgICBpbml0VGltZXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIHRoZSBwYXlsb2FkIHRvIGFsbCByZWNlaXZlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIGRpc3BhdGNoVG9SZWNlaXZlcnMocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIF9yZWNlaXZlck1hcCkge1xuICAgICAgX3JlY2VpdmVyTWFwW2lkXS5oYW5kbGVyKHBheWxvYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVycyByZWNlaXZlIGFsbCBwYXlsb2FkcyBmb3IgYSBnaXZlbiBldmVudCB0eXBlIHdoaWxlIGhhbmRsZXJzIGFyZSB0YXJnZXRlZFxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2hUb1N1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBfc3ViamVjdE1hcFtwYXlsb2FkLnR5cGVdLCBpO1xuICAgIGlmICghc3Vic2NyaWJlcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdmFyIHN1YmpPYmogPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgIGlmIChzdWJqT2JqLnR5cGUgPT09IDApIHtcbiAgICAgICAgc3Viak9iai5zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJqT2JqLm9uY2UpIHtcbiAgICAgICAgdW5zdWJzY3JpYmUocGF5bG9hZC50eXBlLCBzdWJqT2JqLmhhbmRsZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBoYW5kbGVyXG4gICAqIEBwYXJhbSBldnRTdHJcbiAgICogQHBhcmFtIGhhbmRlclxuICAgKi9cbiAgZnVuY3Rpb24gdW5zdWJzY3JpYmUoZXZ0U3RyLCBoYW5kbGVyKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwW2V2dFN0cl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdWJzY3JpYmVycyA9IF9zdWJqZWN0TWFwW2V2dFN0cl0sXG4gICAgICAgIGhhbmRsZXJJZHggID0gLTE7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc3Vic2NyaWJlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzdWJzY3JpYmVyc1tpXS5oYW5kbGVyID09PSBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJJZHggICAgID0gaTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0uc3ViamVjdC5vbkNvbXBsZXRlZCgpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXS5zdWJqZWN0LmRpc3Bvc2UoKTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0gPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYW5kbGVySWR4ID09PSAtMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN1YnNjcmliZXJzLnNwbGljZShoYW5kbGVySWR4LCAxKTtcblxuICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlbGV0ZSBfc3ViamVjdE1hcFtldnRTdHJdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBsb2cgYXJyYXlcbiAgICogQHJldHVybnMge0FycmF5LjxUPn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExvZygpIHtcbiAgICByZXR1cm4gX2xvZy5zbGljZSgwKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNpbXBsZSByZWNlaXZlciBpbXBsZW1lbnRhdGlvbiBiYXNlZCBvbiBGbHV4XG4gICAqIFJlZ2lzdGVyZWQgcmVjZWl2ZXJzIHdpbGwgZ2V0IGV2ZXJ5IHB1Ymxpc2hlZCBldmVudFxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svZmx1eC9ibG9iL21hc3Rlci9zcmMvRGlzcGF0Y2hlci5qc1xuICAgKlxuICAgKiBVc2FnZTpcbiAgICpcbiAgICogX2Rpc3BhdGNoZXIucmVnaXN0ZXJSZWNlaXZlcihmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgICAgICogICAgY29uc29sZS5sb2coJ3JlY2VpdmluZywgJyxwYXlsb2FkKTtcbiAgICAgICAqIH0pO1xuICAgKlxuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXJSZWNlaXZlcihoYW5kbGVyKSB7XG4gICAgdmFyIGlkICAgICAgICAgICA9ICdJRF8nICsgX2lkKys7XG4gICAgX3JlY2VpdmVyTWFwW2lkXSA9IHtcbiAgICAgIGlkICAgICA6IGlkLFxuICAgICAgaGFuZGxlcjogaGFuZGxlclxuICAgIH07XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cblxuICAvKipcbiAgICogUmVtb3ZlIGEgcmVjZWl2ZXIgaGFuZGxlclxuICAgKiBAcGFyYW0gaWRcbiAgICovXG4gIGZ1bmN0aW9uIHVucmVnaXN0ZXJSZWNlaXZlcihpZCkge1xuICAgIGlmIChfcmVjZWl2ZXJNYXAuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICBkZWxldGUgX3JlY2VpdmVyTWFwW2lkXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1YnNjcmliZSAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIHVuc3Vic2NyaWJlICAgICAgIDogdW5zdWJzY3JpYmUsXG4gICAgcHVibGlzaCAgICAgICAgICAgOiBwdWJsaXNoLFxuICAgIGdldExvZyAgICAgICAgICAgIDogZ2V0TG9nLFxuICAgIHJlZ2lzdGVyUmVjZWl2ZXIgIDogcmVnaXN0ZXJSZWNlaXZlcixcbiAgICB1bnJlZ2lzdGVyUmVjZWl2ZXI6IHVucmVnaXN0ZXJSZWNlaXZlclxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXIoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWRkIFJ4SlMgU3ViamVjdCB0byBhIG1vZHVsZS5cbiAqXG4gKiBBZGQgb25lIHNpbXBsZSBvYnNlcnZhYmxlIHN1YmplY3Qgb3IgbW9yZSBjb21wbGV4IGFiaWxpdHkgdG8gY3JlYXRlIG90aGVycyBmb3JcbiAqIG1vcmUgY29tcGxleCBldmVudGluZyBuZWVkcy5cbiAqL1xudmFyIE1peGluT2JzZXJ2YWJsZVN1YmplY3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICAgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9zdWJqZWN0TWFwID0ge307XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBzdWJqZWN0XG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3ViamVjdChuYW1lKSB7XG4gICAgaWYgKCFfc3ViamVjdE1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgX3N1YmplY3RNYXBbbmFtZV0gPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gX3N1YmplY3RNYXBbbmFtZV07XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIGhhbmRsZXIgdG8gdXBkYXRlcy4gSWYgdGhlIGhhbmRsZXIgaXMgYSBzdHJpbmcsIHRoZSBuZXcgc3ViamVjdFxuICAgKiB3aWxsIGJlIGNyZWF0ZWQuXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXJPck5hbWUsIG9wdEhhbmRsZXIpIHtcbiAgICBpZiAoaXMuc3RyaW5nKGhhbmRsZXJPck5hbWUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3ViamVjdChoYW5kbGVyT3JOYW1lKS5zdWJzY3JpYmUob3B0SGFuZGxlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlck9yTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHVwZGF0ZWQgdG8gc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICBfc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBuYW1lZCBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnNPZihuYW1lLCBwYXlsb2FkKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXS5vbk5leHQocGF5bG9hZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignTWl4aW5PYnNlcnZhYmxlU3ViamVjdCwgbm8gc3Vic2NyaWJlcnMgb2YgJyArIG5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIGNyZWF0ZVN1YmplY3QgICAgICA6IGNyZWF0ZVN1YmplY3QsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnMgIDogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnNPZjogbm90aWZ5U3Vic2NyaWJlcnNPZlxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluT2JzZXJ2YWJsZVN1YmplY3Q7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFV0aWxpdHkgdG8gaGFuZGxlIGFsbCB2aWV3IERPTSBhdHRhY2htZW50IHRhc2tzXG4gKi9cblxudmFyIFJlbmRlcmVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX2RvbVV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiByZW5kZXIocGF5bG9hZCkge1xuICAgIHZhciB0YXJnZXRTZWxlY3RvciA9IHBheWxvYWQudGFyZ2V0LFxuICAgICAgICBodG1sICAgICAgICAgICA9IHBheWxvYWQuaHRtbCxcbiAgICAgICAgZG9tRWwsXG4gICAgICAgIG1vdW50UG9pbnQgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXRTZWxlY3RvciksXG4gICAgICAgIGNiICAgICAgICAgICAgID0gcGF5bG9hZC5jYWxsYmFjaztcblxuICAgIG1vdW50UG9pbnQuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBpZiAoaHRtbCkge1xuICAgICAgZG9tRWwgPSBfZG9tVXRpbHMuSFRNTFN0clRvTm9kZShodG1sKTtcbiAgICAgIG1vdW50UG9pbnQuYXBwZW5kQ2hpbGQoZG9tRWwpO1xuICAgIH1cblxuICAgIGlmIChjYikge1xuICAgICAgY2IoZG9tRWwpO1xuICAgIH1cblxuICAgIHJldHVybiBkb21FbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcmVuZGVyOiByZW5kZXJcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZW5kZXJlcigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBTaW1wbGUgcm91dGVyXG4gKiBTdXBwb3J0aW5nIElFOSBzbyB1c2luZyBoYXNoZXMgaW5zdGVhZCBvZiB0aGUgaGlzdG9yeSBBUEkgZm9yIG5vd1xuICovXG5cbnZhciBSb3V0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICA9IG5ldyBSeC5TdWJqZWN0KCksXG4gICAgICBfaGFzaENoYW5nZU9ic2VydmFibGUsXG4gICAgICBfb2JqVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29yZS9PYmplY3RVdGlscy5qcycpO1xuXG4gIC8qKlxuICAgKiBTZXQgZXZlbnQgaGFuZGxlcnNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG4gICAgX2hhc2hDaGFuZ2VPYnNlcnZhYmxlID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQod2luZG93LCAnaGFzaGNoYW5nZScpLnN1YnNjcmliZShub3RpZnlTdWJzY3JpYmVycyk7XG4gIH1cblxuICAvKipcbiAgICogc3Vic2NyaWJlIGEgaGFuZGxlciB0byB0aGUgdXJsIGNoYW5nZSBldmVudHNcbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlcikge1xuICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogTm90aWZ5IG9mIGEgY2hhbmdlIGluIHJvdXRlXG4gICAqIEBwYXJhbSBmcm9tQXBwIFRydWUgaWYgdGhlIHJvdXRlIHdhcyBjYXVzZWQgYnkgYW4gYXBwIGV2ZW50IG5vdCBVUkwgb3IgaGlzdG9yeSBjaGFuZ2VcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKCkge1xuICAgIHZhciBldmVudFBheWxvYWQgPSB7XG4gICAgICByb3V0ZU9iajogZ2V0Q3VycmVudFJvdXRlKCksIC8vIHsgcm91dGU6LCBkYXRhOiB9XG4gICAgICBmcmFnbWVudDogZ2V0VVJMRnJhZ21lbnQoKVxuICAgIH07XG5cbiAgICBfc3ViamVjdC5vbk5leHQoZXZlbnRQYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIHJvdXRlIGFuZCBxdWVyeSBzdHJpbmcgZnJvbSB0aGUgY3VycmVudCBVUkwgZnJhZ21lbnRcbiAgICogQHJldHVybnMge3tyb3V0ZTogc3RyaW5nLCBxdWVyeToge319fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFJvdXRlKCkge1xuICAgIHZhciBmcmFnbWVudCAgICA9IGdldFVSTEZyYWdtZW50KCksXG4gICAgICAgIHBhcnRzICAgICAgID0gZnJhZ21lbnQuc3BsaXQoJz8nKSxcbiAgICAgICAgcm91dGUgICAgICAgPSAnLycgKyBwYXJ0c1swXSxcbiAgICAgICAgcXVlcnlTdHIgICAgPSBkZWNvZGVVUklDb21wb25lbnQocGFydHNbMV0pLFxuICAgICAgICBxdWVyeVN0ck9iaiA9IHBhcnNlUXVlcnlTdHIocXVlcnlTdHIpO1xuXG4gICAgaWYgKHF1ZXJ5U3RyID09PSAnPXVuZGVmaW5lZCcpIHtcbiAgICAgIHF1ZXJ5U3RyT2JqID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtyb3V0ZTogcm91dGUsIGRhdGE6IHF1ZXJ5U3RyT2JqfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZXMgYSBxdWVyeSBzdHJpbmcgaW50byBrZXkvdmFsdWUgcGFpcnNcbiAgICogQHBhcmFtIHF1ZXJ5U3RyXG4gICAqIEByZXR1cm5zIHt7fX1cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlUXVlcnlTdHIocXVlcnlTdHIpIHtcbiAgICB2YXIgb2JqICAgPSB7fSxcbiAgICAgICAgcGFydHMgPSBxdWVyeVN0ci5zcGxpdCgnJicpO1xuXG4gICAgcGFydHMuZm9yRWFjaChmdW5jdGlvbiAocGFpclN0cikge1xuICAgICAgdmFyIHBhaXJBcnIgICAgID0gcGFpclN0ci5zcGxpdCgnPScpO1xuICAgICAgb2JqW3BhaXJBcnJbMF1dID0gcGFpckFyclsxXTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQ29tYmluZXMgYSByb3V0ZSBhbmQgZGF0YSBvYmplY3QgaW50byBhIHByb3BlciBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcm91dGVcbiAgICogQHBhcmFtIGRhdGFPYmpcbiAgICovXG4gIGZ1bmN0aW9uIHNldChyb3V0ZSwgZGF0YU9iaikge1xuICAgIHZhciBwYXRoID0gcm91dGUsXG4gICAgICAgIGRhdGEgPSBbXTtcbiAgICBpZiAoIV9vYmpVdGlscy5pc051bGwoZGF0YU9iaikpIHtcbiAgICAgIHBhdGggKz0gXCI/XCI7XG4gICAgICBmb3IgKHZhciBwcm9wIGluIGRhdGFPYmopIHtcbiAgICAgICAgaWYgKHByb3AgIT09ICd1bmRlZmluZWQnICYmIGRhdGFPYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICBkYXRhLnB1c2gocHJvcCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChkYXRhT2JqW3Byb3BdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHBhdGggKz0gZGF0YS5qb2luKCcmJyk7XG4gICAgfVxuXG4gICAgdXBkYXRlVVJMRnJhZ21lbnQocGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBldmVyeXRoaW5nIGFmdGVyIHRoZSAnd2hhdGV2ZXIuaHRtbCMnIGluIHRoZSBVUkxcbiAgICogTGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyBhcmUgcmVtb3ZlZFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VVJMRnJhZ21lbnQoKSB7XG4gICAgdmFyIGZyYWdtZW50ID0gbG9jYXRpb24uaGFzaC5zbGljZSgxKTtcbiAgICByZXR1cm4gZnJhZ21lbnQudG9TdHJpbmcoKS5yZXBsYWNlKC9cXC8kLywgJycpLnJlcGxhY2UoL15cXC8vLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcGF0aFxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlVVJMRnJhZ21lbnQocGF0aCkge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICA6IGluaXRpYWxpemUsXG4gICAgc3Vic2NyaWJlICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVyczogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBzZXQgICAgICAgICAgICAgIDogc2V0XG4gIH07XG5cbn07XG5cbnZhciByID0gUm91dGVyKCk7XG5yLmluaXRpYWxpemUoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBSeEpTIEhlbHBlcnNcbiAqIEB0eXBlIHt7ZG9tOiBGdW5jdGlvbiwgZnJvbTogRnVuY3Rpb24sIGludGVydmFsOiBGdW5jdGlvbiwgZG9FdmVyeTogRnVuY3Rpb24sIGp1c3Q6IEZ1bmN0aW9uLCBlbXB0eTogRnVuY3Rpb259fVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBkb206IGZ1bmN0aW9uIChzZWxlY3RvciwgZXZlbnQpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBpZiAoIWVsKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ25vcmkvdXRpbHMvUngsIGRvbSwgaW52YWxpZCBET00gc2VsZWN0b3I6ICcgKyBzZWxlY3Rvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChlbCwgZXZlbnQudHJpbSgpKTtcbiAgfSxcblxuICBmcm9tOiBmdW5jdGlvbiAoaXR0cikge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb20oaXR0cik7XG4gIH0sXG5cbiAgaW50ZXJ2YWw6IGZ1bmN0aW9uIChtcykge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmludGVydmFsKG1zKTtcbiAgfSxcblxuICBkb0V2ZXJ5OiBmdW5jdGlvbiAobXMsIC4uLmFyZ3MpIHtcbiAgICBpZihpcy5mdW5jdGlvbihhcmdzWzBdKSkge1xuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnN1YnNjcmliZShhcmdzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnRha2UoYXJnc1swXSkuc3Vic2NyaWJlKGFyZ3NbMV0pO1xuICB9LFxuXG4gIGp1c3Q6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmp1c3QodmFsdWUpO1xuICB9LFxuXG4gIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZW1wdHkoKTtcbiAgfVxuXG59OyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLypcbiBTaW1wbGUgd3JhcHBlciBmb3IgVW5kZXJzY29yZSAvIEhUTUwgdGVtcGxhdGVzXG4gTWF0dCBQZXJraW5zXG4gNC83LzE1XG4gKi9cbnZhciBUZW1wbGF0aW5nID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGVtcGxhdGVNYXAgICAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX3RlbXBsYXRlSFRNTENhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF90ZW1wbGF0ZUNhY2hlICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfRE9NVXRpbHMgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIGFkZFRlbXBsYXRlKGlkLCBodG1sKSB7XG4gICAgX3RlbXBsYXRlTWFwW2lkXSA9IGh0bWw7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTb3VyY2VGcm9tVGVtcGxhdGVNYXAoaWQpIHtcbiAgICB2YXIgc291cmNlID0gX3RlbXBsYXRlTWFwW2lkXTtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gY2xlYW5UZW1wbGF0ZUhUTUwoc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U291cmNlRnJvbUhUTUwoaWQpIHtcbiAgICB2YXIgc3JjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpLFxuICAgICAgICBzcmNodG1sO1xuXG4gICAgaWYgKHNyYykge1xuICAgICAgc3JjaHRtbCA9IHNyYy5pbm5lckhUTUw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignbnVkb3J1L2NvcmUvVGVtcGxhdGluZywgdGVtcGxhdGUgbm90IGZvdW5kOiBcIicgKyBpZCArICdcIicpO1xuICAgICAgc3JjaHRtbCA9ICc8ZGl2PlRlbXBsYXRlIG5vdCBmb3VuZDogJyArIGlkICsgJzwvZGl2Pic7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFuVGVtcGxhdGVIVE1MKHNyY2h0bWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdGVtcGxhdGUgaHRtbCBmcm9tIHRoZSBzY3JpcHQgdGFnIHdpdGggaWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U291cmNlKGlkKSB7XG4gICAgaWYgKF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdO1xuICAgIH1cblxuICAgIHZhciBzb3VyY2VodG1sID0gZ2V0U291cmNlRnJvbVRlbXBsYXRlTWFwKGlkKTtcblxuICAgIGlmICghc291cmNlaHRtbCkge1xuICAgICAgc291cmNlaHRtbCA9IGdldFNvdXJjZUZyb21IVE1MKGlkKTtcbiAgICB9XG5cbiAgICBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdID0gc291cmNlaHRtbDtcbiAgICByZXR1cm4gc291cmNlaHRtbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCBJRHMgYmVsb25naW5nIHRvIHRleHQvdGVtcGxhdGUgdHlwZSBzY3JpcHQgdGFnc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRBbGxUZW1wbGF0ZUlEcygpIHtcbiAgICB2YXIgc2NyaXB0VGFncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgMCk7XG5cbiAgICByZXR1cm4gc2NyaXB0VGFncy5maWx0ZXIoZnVuY3Rpb24gKHRhZykge1xuICAgICAgcmV0dXJuIHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gJ3RleHQvdGVtcGxhdGUnO1xuICAgIH0pLm1hcChmdW5jdGlvbiAodGFnKSB7XG4gICAgICByZXR1cm4gdGFnLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIHVuZGVyc2NvcmUgdGVtcGxhdGVcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VGVtcGxhdGUoaWQpIHtcbiAgICBpZiAoX3RlbXBsYXRlQ2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gX3RlbXBsYXRlQ2FjaGVbaWRdO1xuICAgIH1cbiAgICB2YXIgdGVtcGwgICAgICAgICAgPSBfLnRlbXBsYXRlKGdldFNvdXJjZShpZCkpO1xuICAgIF90ZW1wbGF0ZUNhY2hlW2lkXSA9IHRlbXBsO1xuICAgIHJldHVybiB0ZW1wbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIEhUTUxcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0hUTUwoaWQsIG9iaikge1xuICAgIHZhciB0ZW1wID0gZ2V0VGVtcGxhdGUoaWQpO1xuICAgIHJldHVybiB0ZW1wKG9iaik7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSBhbmQgcmV0dXJucyBhbiBIVE1MIEVsZW1lbnRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0VsZW1lbnQoaWQsIG9iaikge1xuICAgIHJldHVybiBfRE9NVXRpbHMuSFRNTFN0clRvTm9kZShhc0hUTUwoaWQsIG9iaikpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFucyB0ZW1wbGF0ZSBIVE1MXG4gICAqL1xuICBmdW5jdGlvbiBjbGVhblRlbXBsYXRlSFRNTChzdHIpIHtcbiAgICByZXR1cm4gc3RyLnRyaW0oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgcmV0dXJucywgc3BhY2VzIGFuZCB0YWJzXG4gICAqIEBwYXJhbSBzdHJcbiAgICogQHJldHVybnMge1hNTHxzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVXaGl0ZVNwYWNlKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyfFxcdCkvZ20sICcnKS5yZXBsYWNlKC8+XFxzKzwvZywgJz48Jyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGFsbCB0ZW1wbGF0ZXMsIGNsZWFuIHRoZW0gdXAgYW5kIGxvZ1xuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogU28gdGhpcyBoZWxwcyBjcmVhdGUgdGhlIGJsb2NrcyBmb3IgaW5zZXJ0aW9uIGluIHRvIHRoZSBET01cbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NGb3JET01JbnNlcnRpb24oKSB7XG4gICAgdmFyIGlkcyA9IGdldEFsbFRlbXBsYXRlSURzKCk7XG4gICAgaWRzLmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICB2YXIgc3JjID0gcmVtb3ZlV2hpdGVTcGFjZShnZXRTb3VyY2UoaWQpKTtcbiAgICAgIGNvbnNvbGUubG9nKGlkLCBzcmMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHRlbXBsYXRlIHNjcmlwdCB0YWcgdG8gdGhlIERPTVxuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBodG1sXG4gICAqL1xuICAvL2Z1bmN0aW9uIGFkZENsaWVudFNpZGVUZW1wbGF0ZVRvRE9NKGlkLCBodG1sKSB7XG4gIC8vICB2YXIgcyAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAvLyAgcy50eXBlICAgICAgPSAndGV4dC90ZW1wbGF0ZSc7XG4gIC8vICBzLmlkICAgICAgICA9IGlkO1xuICAvLyAgcy5pbm5lckhUTUwgPSBodG1sO1xuICAvLyAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChzKTtcbiAgLy99XG5cbiAgcmV0dXJuIHtcbiAgICBhZGRUZW1wbGF0ZSAgICAgICAgICAgOiBhZGRUZW1wbGF0ZSxcbiAgICBnZXRTb3VyY2UgICAgICAgICAgICAgOiBnZXRTb3VyY2UsXG4gICAgZ2V0QWxsVGVtcGxhdGVJRHMgICAgIDogZ2V0QWxsVGVtcGxhdGVJRHMsXG4gICAgcHJvY2Vzc0ZvckRPTUluc2VydGlvbjogcHJvY2Vzc0ZvckRPTUluc2VydGlvbixcbiAgICBnZXRUZW1wbGF0ZSAgICAgICAgICAgOiBnZXRUZW1wbGF0ZSxcbiAgICBhc0hUTUwgICAgICAgICAgICAgICAgOiBhc0hUTUwsXG4gICAgYXNFbGVtZW50ICAgICAgICAgICAgIDogYXNFbGVtZW50XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGluZygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxudmFyIEFwcGxpY2F0aW9uVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3RoaXMsXG4gICAgICBfdGVtcGxhdGUgPSByZXF1aXJlKCcuLi91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfZG9tVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgSW5pdGlhbGl6YXRpb25cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVcbiAgICogQHBhcmFtIHNjYWZmb2xkVGVtcGxhdGVzIHRlbXBsYXRlIElEcyB0byBhdHRhY2hlZCB0byB0aGUgYm9keSBmb3IgdGhlIGFwcFxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyhzY2FmZm9sZFRlbXBsYXRlcykge1xuICAgIF90aGlzID0gdGhpcztcblxuICAgIGF0dGFjaEFwcGxpY2F0aW9uU2NhZmZvbGRpbmcoc2NhZmZvbGRUZW1wbGF0ZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGFjaCBhcHAgSFRNTCBzdHJ1Y3R1cmVcbiAgICogQHBhcmFtIHRlbXBsYXRlc1xuICAgKi9cbiAgZnVuY3Rpb24gYXR0YWNoQXBwbGljYXRpb25TY2FmZm9sZGluZyh0ZW1wbGF0ZXMpIHtcbiAgICBpZiAoIXRlbXBsYXRlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBib2R5RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XG5cbiAgICB0ZW1wbGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAodGVtcGwpIHtcbiAgICAgIGJvZHlFbC5hcHBlbmRDaGlsZChfZG9tVXRpbHMuSFRNTFN0clRvTm9kZShfdGVtcGxhdGUuZ2V0U291cmNlKHRlbXBsLCB7fSkpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZnRlciBhcHAgaW5pdGlhbGl6YXRpb24sIHJlbW92ZSB0aGUgbG9hZGluZyBtZXNzYWdlXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVMb2FkaW5nTWVzc2FnZSgpIHtcbiAgICB2YXIgY292ZXIgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbml0aWFsaXphdGlvbl9fY292ZXInKSxcbiAgICAgICAgbWVzc2FnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5pbml0aWFsaXphdGlvbl9fbWVzc2FnZScpO1xuXG4gICAgVHdlZW5MaXRlLnRvKGNvdmVyLCAxLCB7XG4gICAgICBhbHBoYTogMCwgZWFzZTogUXVhZC5lYXNlT3V0LCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdmVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY292ZXIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHdlZW5MaXRlLnRvKG1lc3NhZ2UsIDIsIHtcbiAgICAgIHRvcDogXCIrPTUwcHhcIiwgZWFzZTogUXVhZC5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY292ZXIucmVtb3ZlQ2hpbGQobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXc6IGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcsXG4gICAgcmVtb3ZlTG9hZGluZ01lc3NhZ2UgICAgIDogcmVtb3ZlTG9hZGluZ01lc3NhZ2VcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvblZpZXcoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gdmlldyB0aGF0IGFsbG93cyBmb3IgY29tcG9uZW50IHZpZXdzXG4gKi9cblxudmFyIE1peGluQ29tcG9uZW50Vmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jb21wb25lbnRWaWV3TWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvKipcbiAgICogTWFwIGEgY29tcG9uZW50IHRvIGEgbW91bnRpbmcgcG9pbnQuIElmIGEgc3RyaW5nIGlzIHBhc3NlZCxcbiAgICogdGhlIGNvcnJlY3Qgb2JqZWN0IHdpbGwgYmUgY3JlYXRlZCBmcm9tIHRoZSBmYWN0b3J5IG1ldGhvZCwgb3RoZXJ3aXNlLFxuICAgKiB0aGUgcGFzc2VkIGNvbXBvbmVudCBvYmplY3QgaXMgdXNlZC5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqIEBwYXJhbSBtb3VudFBvaW50XG4gICAqL1xuICBmdW5jdGlvbiBtYXBWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBjb21wb25lbnRJRG9yT2JqLCBtb3VudFBvaW50KSB7XG4gICAgdmFyIGNvbXBvbmVudE9iajtcblxuICAgIGlmICh0eXBlb2YgY29tcG9uZW50SURvck9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBjb21wb25lbnRGYWN0b3J5ID0gcmVxdWlyZShjb21wb25lbnRJRG9yT2JqKTtcbiAgICAgIGNvbXBvbmVudE9iaiAgICAgICAgID0gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRGYWN0b3J5KCkpKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudE9iaiA9IGNvbXBvbmVudElEb3JPYmo7XG4gICAgfVxuXG4gICAgX2NvbXBvbmVudFZpZXdNYXBbY29tcG9uZW50SURdID0ge1xuICAgICAgY29udHJvbGxlcjogY29tcG9uZW50T2JqLFxuICAgICAgbW91bnRQb2ludDogbW91bnRQb2ludFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmFjdG9yeSB0byBjcmVhdGUgY29tcG9uZW50IHZpZXcgbW9kdWxlcyBieSBjb25jYXRpbmcgbXVsdGlwbGUgc291cmNlIG9iamVjdHNcbiAgICogQHBhcmFtIGNvbXBvbmVudFNvdXJjZSBDdXN0b20gbW9kdWxlIHNvdXJjZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudFZpZXcoY29tcG9uZW50U291cmNlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb21wb25lbnRWaWV3RmFjdG9yeSAgPSByZXF1aXJlKCcuL1ZpZXdDb21wb25lbnQuanMnKSxcbiAgICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkgPSByZXF1aXJlKCcuL01peGluRXZlbnREZWxlZ2F0b3IuanMnKSxcbiAgICAgICAgICBvYnNlcnZhYmxlRmFjdG9yeSAgICAgPSByZXF1aXJlKCcuLi91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyksXG4gICAgICAgICAgc3RhdGVPYmpGYWN0b3J5ICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvSW1tdXRhYmxlTWFwLmpzJyksXG4gICAgICAgICAgY29tcG9uZW50QXNzZW1ibHksIGZpbmFsQ29tcG9uZW50LCBwcmV2aW91c0luaXRpYWxpemU7XG5cbiAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gW1xuICAgICAgICBjb21wb25lbnRWaWV3RmFjdG9yeSgpLFxuICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkoKSxcbiAgICAgICAgb2JzZXJ2YWJsZUZhY3RvcnkoKSxcbiAgICAgICAgc3RhdGVPYmpGYWN0b3J5KCksXG4gICAgICAgIGNvbXBvbmVudFNvdXJjZVxuICAgICAgXTtcblxuICAgICAgaWYgKGNvbXBvbmVudFNvdXJjZS5taXhpbnMpIHtcbiAgICAgICAgY29tcG9uZW50QXNzZW1ibHkgPSBjb21wb25lbnRBc3NlbWJseS5jb25jYXQoY29tcG9uZW50U291cmNlLm1peGlucyk7XG4gICAgICB9XG5cbiAgICAgIGZpbmFsQ29tcG9uZW50ID0gTm9yaS5hc3NpZ25BcnJheSh7fSwgY29tcG9uZW50QXNzZW1ibHkpO1xuXG4gICAgICAvLyBDb21wb3NlIGEgbmV3IGluaXRpYWxpemUgZnVuY3Rpb24gYnkgaW5zZXJ0aW5nIGNhbGwgdG8gY29tcG9uZW50IHN1cGVyIG1vZHVsZVxuICAgICAgcHJldmlvdXNJbml0aWFsaXplICAgICAgICA9IGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemU7XG4gICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplID0gZnVuY3Rpb24gaW5pdGlhbGl6ZShpbml0T2JqKSB7XG4gICAgICAgIGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemVDb21wb25lbnQoaW5pdE9iaik7XG4gICAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZS5jYWxsKGZpbmFsQ29tcG9uZW50LCBpbml0T2JqKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgZmluYWxDb21wb25lbnQpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIG1hcHBlZCBjb21wb25lbnRWaWV3XG4gICAqIEBwYXJhbSBjb21wb25lbnRJRFxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1ZpZXdDb21wb25lbnQoY29tcG9uZW50SUQsIG1vdW50UG9pbnQpIHtcbiAgICB2YXIgY29tcG9uZW50VmlldyA9IF9jb21wb25lbnRWaWV3TWFwW2NvbXBvbmVudElEXTtcbiAgICBpZiAoIWNvbXBvbmVudFZpZXcpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gY29tcG9uZW50VmlldyBtYXBwZWQgZm9yIGlkOiAnICsgY29tcG9uZW50SUQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmlzSW5pdGlhbGl6ZWQoKSkge1xuICAgICAgbW91bnRQb2ludCA9IG1vdW50UG9pbnQgfHwgY29tcG9uZW50Vmlldy5tb3VudFBvaW50O1xuICAgICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmluaXRpYWxpemUoe1xuICAgICAgICBpZCAgICAgICAgOiBjb21wb25lbnRJRCxcbiAgICAgICAgdGVtcGxhdGUgIDogY29tcG9uZW50Vmlldy5odG1sVGVtcGxhdGUsXG4gICAgICAgIG1vdW50UG9pbnQ6IG1vdW50UG9pbnRcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmNvbXBvbmVudFJlbmRlcigpO1xuICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5tb3VudCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtYXAgb2JqZWN0IGZvciBjb21wb25lbnQgdmlld3NcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb21wb25lbnRWaWV3TWFwKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2NvbXBvbmVudFZpZXdNYXApO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBtYXBWaWV3Q29tcG9uZW50ICAgOiBtYXBWaWV3Q29tcG9uZW50LFxuICAgIGNyZWF0ZUNvbXBvbmVudFZpZXc6IGNyZWF0ZUNvbXBvbmVudFZpZXcsXG4gICAgc2hvd1ZpZXdDb21wb25lbnQgIDogc2hvd1ZpZXdDb21wb25lbnQsXG4gICAgZ2V0Q29tcG9uZW50Vmlld01hcDogZ2V0Q29tcG9uZW50Vmlld01hcFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluQ29tcG9uZW50Vmlld3MoKTsiLCJ2YXIgTWl4aW5ET01NYW5pcHVsYXRpb24gPSBmdW5jdGlvbiAoKSB7XG5cbiAgZnVuY3Rpb24gaGlkZUVsKHNlbGVjdG9yKSB7XG4gICAgVHdlZW5MaXRlLnNldChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSwge1xuICAgICAgYWxwaGEgIDogMCxcbiAgICAgIGRpc3BsYXk6ICdub25lJ1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd0VsKHNlbGVjdG9yKSB7XG4gICAgVHdlZW5MaXRlLnNldChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSwge1xuICAgICAgYWxwaGEgIDogMSxcbiAgICAgIGRpc3BsYXk6ICdibG9jaydcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2hvd0VsOiBzaG93RWwsXG4gICAgaGlkZUVsOiBoaWRlRWxcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkRPTU1hbmlwdWxhdGlvbigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBDb252ZW5pZW5jZSBtaXhpbiB0aGF0IG1ha2VzIGV2ZW50cyBlYXNpZXIgZm9yIHZpZXdzXG4gKlxuICogQmFzZWQgb24gQmFja2JvbmVcbiAqIFJldmlldyB0aGlzIGh0dHA6Ly9ibG9nLm1hcmlvbmV0dGVqcy5jb20vMjAxNS8wMi8xMi91bmRlcnN0YW5kaW5nLXRoZS1ldmVudC1oYXNoL2luZGV4Lmh0bWxcbiAqXG4gKiBFeGFtcGxlOlxuICogdGhpcy5zZXRFdmVudHMoe1xuICogICAgICAgICdjbGljayAjYnRuX21haW5fcHJvamVjdHMnOiBoYW5kbGVQcm9qZWN0c0J1dHRvbixcbiAqICAgICAgICAnY2xpY2sgI2J0bl9mb28sIGNsaWNrICNidG5fYmFyJzogaGFuZGxlRm9vQmFyQnV0dG9uc1xuICogICAgICB9KTtcbiAqIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAqXG4gKi9cblxudmFyIE1peGluRXZlbnREZWxlZ2F0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9ldmVudHNNYXAsXG4gICAgICBfZXZlbnRTdWJzY3JpYmVycyxcbiAgICAgIF9yeCAgICAgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzL1J4JyksXG4gICAgICBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpO1xuXG4gIGZ1bmN0aW9uIHNldEV2ZW50cyhldnRPYmopIHtcbiAgICBfZXZlbnRzTWFwID0gZXZ0T2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RXZlbnRzKCkge1xuICAgIHJldHVybiBfZXZlbnRzTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIEF1dG9tYXRlcyBzZXR0aW5nIGV2ZW50cyBvbiBET00gZWxlbWVudHMuXG4gICAqICdldnRTdHIgc2VsZWN0b3InOmNhbGxiYWNrXG4gICAqICdldnRTdHIgc2VsZWN0b3IsIGV2dFN0ciBzZWxlY3Rvcic6IHNoYXJlZENhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBkZWxlZ2F0ZUV2ZW50cyhhdXRvRm9ybSkge1xuICAgIGlmICghX2V2ZW50c01hcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ldmVudFN1YnNjcmliZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAodmFyIGV2dFN0cmluZ3MgaW4gX2V2ZW50c01hcCkge1xuICAgICAgaWYgKF9ldmVudHNNYXAuaGFzT3duUHJvcGVydHkoZXZ0U3RyaW5ncykpIHtcblxuICAgICAgICB2YXIgbWFwcGluZ3MgICAgID0gZXZ0U3RyaW5ncy5zcGxpdCgnLCcpLFxuICAgICAgICAgICAgZXZlbnRIYW5kbGVyID0gX2V2ZW50c01hcFtldnRTdHJpbmdzXTtcblxuICAgICAgICBpZiAoIWlzLmZ1bmN0aW9uKGV2ZW50SGFuZGxlcikpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0V2ZW50RGVsZWdhdG9yLCBoYW5kbGVyIGZvciAnICsgZXZ0U3RyaW5ncyArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgICAgLy8gaHR0cHM6Ly9qc2xpbnRlcnJvcnMuY29tL2RvbnQtbWFrZS1mdW5jdGlvbnMtd2l0aGluLWEtbG9vcFxuICAgICAgICBtYXBwaW5ncy5mb3JFYWNoKGZ1bmN0aW9uIChldnRNYXApIHtcbiAgICAgICAgICBldnRNYXAgICAgICAgPSBldnRNYXAudHJpbSgpO1xuICAgICAgICAgIHZhciBldmVudFN0ciA9IGV2dE1hcC5zcGxpdCgnICcpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgICAgc2VsZWN0b3IgPSBldnRNYXAuc3BsaXQoJyAnKVsxXS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoX2Jyb3dzZXJJbmZvLm1vYmlsZS5hbnkoKSkge1xuICAgICAgICAgICAgZXZlbnRTdHIgPSBjb252ZXJ0TW91c2VUb1RvdWNoRXZlbnRTdHIoZXZlbnRTdHIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF9ldmVudFN1YnNjcmliZXJzW2V2dFN0cmluZ3NdID0gY3JlYXRlSGFuZGxlcihzZWxlY3RvciwgZXZlbnRTdHIsIGV2ZW50SGFuZGxlciwgYXV0b0Zvcm0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLyoganNoaW50ICtXMDgzICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBjb21tb24gbW91c2UgZXZlbnRzIHRvIHRvdWNoIGVxdWl2YWxlbnRzXG4gICAqIEBwYXJhbSBldmVudFN0clxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbnZlcnRNb3VzZVRvVG91Y2hFdmVudFN0cihldmVudFN0cikge1xuICAgIHN3aXRjaCAoZXZlbnRTdHIpIHtcbiAgICAgIGNhc2UoJ2NsaWNrJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vkb3duJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hzdGFydCc7XG4gICAgICBjYXNlKCdtb3VzZXVwJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vtb3ZlJyk6XG4gICAgICAgIHJldHVybiAndG91Y2htb3ZlJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBldmVudFN0cjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyLCBhdXRvRm9ybSkge1xuICAgIHZhciBvYnNlcnZhYmxlID0gX3J4LmRvbShzZWxlY3RvciwgZXZlbnRTdHIpLFxuICAgICAgICBlbCAgICAgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvciksXG4gICAgICAgIHRhZyAgICAgICAgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIHR5cGUgICAgICAgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcblxuICAgIGlmIChhdXRvRm9ybSkge1xuICAgICAgaWYgKHRhZyA9PT0gJ2lucHV0JyB8fCB0YWcgPT09ICd0ZXh0YXJlYScpIHtcbiAgICAgICAgaWYgKCF0eXBlIHx8IHR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2JsdXInIHx8IGV2ZW50U3RyID09PSAnZm9jdXMnKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgICAubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKVxuICAgICAgICAgICAgICAuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gICAgICAgICAgfSBlbHNlIGlmIChldmVudFN0ciA9PT0gJ2tleXVwJyB8fCBldmVudFN0ciA9PT0gJ2tleWRvd24nKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgICAudGhyb3R0bGUoMTAwKVxuICAgICAgICAgICAgICAubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKVxuICAgICAgICAgICAgICAuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdyYWRpbycgfHwgdHlwZSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2NsaWNrJykge1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmFibGVcbiAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2dC50YXJnZXQuY2hlY2tlZDtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0YWcgPT09ICdzZWxlY3QnKSB7XG4gICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2NoYW5nZScpIHtcbiAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgLm1hcChldnQgPT4gZXZ0LnRhcmdldC52YWx1ZSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYnNlcnZhYmxlLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFubHkgcmVtb3ZlIGV2ZW50c1xuICAgKi9cbiAgZnVuY3Rpb24gdW5kZWxlZ2F0ZUV2ZW50cygpIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBldmVudCBpbiBfZXZlbnRTdWJzY3JpYmVycykge1xuICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZlbnRdLmRpc3Bvc2UoKTtcbiAgICAgIGRlbGV0ZSBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF07XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRFdmVudHMgICAgICAgOiBzZXRFdmVudHMsXG4gICAgZ2V0RXZlbnRzICAgICAgIDogZ2V0RXZlbnRzLFxuICAgIHVuZGVsZWdhdGVFdmVudHM6IHVuZGVsZWdhdGVFdmVudHMsXG4gICAgZGVsZWdhdGVFdmVudHMgIDogZGVsZWdhdGVFdmVudHNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkV2ZW50RGVsZWdhdG9yOyIsIi8qIEBmbG93IHdlYWsgKi9cblxudmFyIE1peGluTnVkb3J1Q29udHJvbHMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9ub3RpZmljYXRpb25WaWV3ICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcycpLFxuICAgICAgX3Rvb2xUaXBWaWV3ICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvVG9vbFRpcFZpZXcuanMnKSxcbiAgICAgIF9tZXNzYWdlQm94VmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzJyksXG4gICAgICBfbWVzc2FnZUJveENyZWF0b3IgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Q3JlYXRvci5qcycpLFxuICAgICAgX21vZGFsQ292ZXJWaWV3ICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKSB7XG4gICAgX3Rvb2xUaXBWaWV3LmluaXRpYWxpemUoJ3Rvb2x0aXBfX2NvbnRhaW5lcicpO1xuICAgIF9ub3RpZmljYXRpb25WaWV3LmluaXRpYWxpemUoJ3RvYXN0X19jb250YWluZXInKTtcbiAgICBfbWVzc2FnZUJveFZpZXcuaW5pdGlhbGl6ZSgnbWVzc2FnZWJveF9fY29udGFpbmVyJyk7XG4gICAgX21vZGFsQ292ZXJWaWV3LmluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1iQ3JlYXRvcigpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hDcmVhdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTWVzc2FnZUJveChvYmopIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlTWVzc2FnZUJveChpZCkge1xuICAgIF9tZXNzYWdlQm94Vmlldy5yZW1vdmUoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWxlcnQobWVzc2FnZSwgdGl0bGUpIHtcbiAgICByZXR1cm4gbWJDcmVhdG9yKCkuYWxlcnQodGl0bGUgfHwgJ0FsZXJ0JywgbWVzc2FnZSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGROb3RpZmljYXRpb24ob2JqKSB7XG4gICAgcmV0dXJuIF9ub3RpZmljYXRpb25WaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KG1lc3NhZ2UsIHRpdGxlLCB0eXBlKSB7XG4gICAgcmV0dXJuIGFkZE5vdGlmaWNhdGlvbih7XG4gICAgICB0aXRsZSAgOiB0aXRsZSB8fCAnJyxcbiAgICAgIHR5cGUgICA6IHR5cGUgfHwgX25vdGlmaWNhdGlvblZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVOdWRvcnVDb250cm9sczogaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzLFxuICAgIG1iQ3JlYXRvciAgICAgICAgICAgICAgIDogbWJDcmVhdG9yLFxuICAgIGFkZE1lc3NhZ2VCb3ggICAgICAgICAgIDogYWRkTWVzc2FnZUJveCxcbiAgICByZW1vdmVNZXNzYWdlQm94ICAgICAgICA6IHJlbW92ZU1lc3NhZ2VCb3gsXG4gICAgYWRkTm90aWZpY2F0aW9uICAgICAgICAgOiBhZGROb3RpZmljYXRpb24sXG4gICAgYWxlcnQgICAgICAgICAgICAgICAgICAgOiBhbGVydCxcbiAgICBub3RpZnkgICAgICAgICAgICAgICAgICA6IG5vdGlmeVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluTnVkb3J1Q29udHJvbHMoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gdmlldyB0aGF0IGFsbG93cyBmb3IgY29tcG9uZW50IHZpZXdzIHRvIGJlIGRpc3BsYXkgb24gc3RvcmUgc3RhdGUgY2hhbmdlc1xuICovXG5cbnZhciBNaXhpblN0b3JlU3RhdGVWaWV3cyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3RoaXMsXG4gICAgICBfd2F0Y2hlZFN0b3JlLFxuICAgICAgX2N1cnJlbnRWaWV3SUQsXG4gICAgICBfY3VycmVudFN0b3JlU3RhdGUsXG4gICAgICBfc3RhdGVWaWV3TW91bnRQb2ludCxcbiAgICAgIF9zdGF0ZVZpZXdJRE1hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLyoqXG4gICAqIFNldCB1cCBsaXN0ZW5lcnNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVTdGF0ZVZpZXdzKHN0b3JlKSB7XG4gICAgX3RoaXMgPSB0aGlzOyAvLyBtaXRpZ2F0aW9uLCBEdWUgdG8gZXZlbnRzLCBzY29wZSBtYXkgYmUgc2V0IHRvIHRoZSB3aW5kb3cgb2JqZWN0XG4gICAgX3dhdGNoZWRTdG9yZSA9IHN0b3JlO1xuXG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCd2aWV3Q2hhbmdlJyk7XG5cbiAgICBfd2F0Y2hlZFN0b3JlLnN1YnNjcmliZShmdW5jdGlvbiBvblN0YXRlQ2hhbmdlKCkge1xuICAgICAgaGFuZGxlU3RhdGVDaGFuZ2UoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IHJvdXRlIGZyb20gVVJMIGhhc2ggb24gY2hhbmdlXG4gICAqIEBwYXJhbSByb3V0ZU9ialxuICAgKi9cbiAgZnVuY3Rpb24gaGFuZGxlU3RhdGVDaGFuZ2UoKSB7XG4gICAgc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSgpIHtcbiAgICB2YXIgc3RhdGUgPSBfd2F0Y2hlZFN0b3JlLmdldFN0YXRlKCkuY3VycmVudFN0YXRlO1xuICAgIGlmIChzdGF0ZSkge1xuICAgICAgaWYgKHN0YXRlICE9PSBfY3VycmVudFN0b3JlU3RhdGUpIHtcbiAgICAgICAgX2N1cnJlbnRTdG9yZVN0YXRlID0gc3RhdGU7XG4gICAgICAgIHNob3dTdGF0ZVZpZXdDb21wb25lbnQuYmluZChfdGhpcykoX2N1cnJlbnRTdG9yZVN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBsb2NhdGlvbiBmb3IgdGhlIHZpZXcgdG8gbW91bnQgb24gcm91dGUgY2hhbmdlcywgYW55IGNvbnRlbnRzIHdpbGxcbiAgICogYmUgcmVtb3ZlZCBwcmlvclxuICAgKiBAcGFyYW0gZWxJRFxuICAgKi9cbiAgZnVuY3Rpb24gc2V0Vmlld01vdW50UG9pbnQoZWxJRCkge1xuICAgIF9zdGF0ZVZpZXdNb3VudFBvaW50ID0gZWxJRDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFZpZXdNb3VudFBvaW50KCkge1xuICAgIHJldHVybiBfc3RhdGVWaWV3TW91bnRQb2ludDtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXAgYSByb3V0ZSB0byBhIG1vZHVsZSB2aWV3IGNvbnRyb2xsZXJcbiAgICogQHBhcmFtIHRlbXBsYXRlSURcbiAgICogQHBhcmFtIGNvbXBvbmVudElEb3JPYmpcbiAgICovXG4gIGZ1bmN0aW9uIG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KHN0YXRlLCB0ZW1wbGF0ZUlELCBjb21wb25lbnRJRG9yT2JqKSB7XG4gICAgX3N0YXRlVmlld0lETWFwW3N0YXRlXSA9IHRlbXBsYXRlSUQ7XG4gICAgdGhpcy5tYXBWaWV3Q29tcG9uZW50KHRlbXBsYXRlSUQsIGNvbXBvbmVudElEb3JPYmosIF9zdGF0ZVZpZXdNb3VudFBvaW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IGEgdmlldyAoaW4gcmVzcG9uc2UgdG8gYSByb3V0ZSBjaGFuZ2UpXG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1N0YXRlVmlld0NvbXBvbmVudChzdGF0ZSkge1xuICAgIHZhciBjb21wb25lbnRJRCA9IF9zdGF0ZVZpZXdJRE1hcFtzdGF0ZV07XG4gICAgaWYgKCFjb21wb25lbnRJRCkge1xuICAgICAgY29uc29sZS53YXJuKFwiTm8gdmlldyBtYXBwZWQgZm9yIHJvdXRlOiBcIiArIHN0YXRlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZW1vdmVDdXJyZW50VmlldygpO1xuXG4gICAgX2N1cnJlbnRWaWV3SUQgPSBjb21wb25lbnRJRDtcbiAgICB0aGlzLnNob3dWaWV3Q29tcG9uZW50KF9jdXJyZW50Vmlld0lEKTtcblxuICAgIC8vIFRyYW5zaXRpb24gbmV3IHZpZXcgaW5cbiAgICBUd2VlbkxpdGUuc2V0KF9zdGF0ZVZpZXdNb3VudFBvaW50LCB7YWxwaGE6IDB9KTtcbiAgICBUd2VlbkxpdGUudG8oX3N0YXRlVmlld01vdW50UG9pbnQsIDAuMjUsIHthbHBoYTogMSwgZWFzZTogUXVhZC5lYXNlSW59KTtcblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZigndmlld0NoYW5nZScsIGNvbXBvbmVudElEKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGN1cnJlbnRseSBkaXNwbGF5ZWQgdmlld1xuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlQ3VycmVudFZpZXcoKSB7XG4gICAgaWYgKF9jdXJyZW50Vmlld0lEKSB7XG4gICAgICBfdGhpcy5nZXRDb21wb25lbnRWaWV3TWFwKClbX2N1cnJlbnRWaWV3SURdLmNvbnRyb2xsZXIudW5tb3VudCgpO1xuICAgIH1cbiAgICBfY3VycmVudFZpZXdJRCA9ICcnO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplU3RhdGVWaWV3cyAgICAgICAgOiBpbml0aWFsaXplU3RhdGVWaWV3cyxcbiAgICBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlOiBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlLFxuICAgIHNob3dTdGF0ZVZpZXdDb21wb25lbnQgICAgICA6IHNob3dTdGF0ZVZpZXdDb21wb25lbnQsXG4gICAgc2V0Vmlld01vdW50UG9pbnQgICAgICAgICAgIDogc2V0Vmlld01vdW50UG9pbnQsXG4gICAgZ2V0Vmlld01vdW50UG9pbnQgICAgICAgICAgIDogZ2V0Vmlld01vdW50UG9pbnQsXG4gICAgbWFwU3RhdGVUb1ZpZXdDb21wb25lbnQgICAgIDogbWFwU3RhdGVUb1ZpZXdDb21wb25lbnRcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpblN0b3JlU3RhdGVWaWV3cygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBCYXNlIG1vZHVsZSBmb3IgY29tcG9uZW50c1xuICogTXVzdCBiZSBleHRlbmRlZCB3aXRoIGN1c3RvbSBtb2R1bGVzXG4gKi9cblxudmFyIF90ZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3V0aWxzL1RlbXBsYXRpbmcuanMnKTtcblxudmFyIFZpZXdDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9pc0luaXRpYWxpemVkID0gZmFsc2UsXG4gICAgICBfY29uZmlnUHJvcHMsXG4gICAgICBfaWQsXG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSxcbiAgICAgIF9odG1sLFxuICAgICAgX0RPTUVsZW1lbnQsXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF9jaGlsZHJlbiAgICAgID0gW10sXG4gICAgICBfaXNNb3VudGVkICAgICA9IGZhbHNlLFxuICAgICAgX3JlbmRlcmVyICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9SZW5kZXJlcicpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXphdGlvblxuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVDb21wb25lbnQoY29uZmlnUHJvcHMpIHtcbiAgICBfY29uZmlnUHJvcHMgPSBjb25maWdQcm9wcztcbiAgICBfaWQgICAgICAgICAgPSBjb25maWdQcm9wcy5pZDtcbiAgICBfbW91bnRQb2ludCAgPSBjb25maWdQcm9wcy5tb3VudFBvaW50O1xuXG4gICAgdGhpcy5zZXRTdGF0ZSh0aGlzLmdldEluaXRpYWxTdGF0ZSgpKTtcbiAgICB0aGlzLnNldEV2ZW50cyh0aGlzLmRlZmluZUV2ZW50cygpKTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndXBkYXRlJyk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdtb3VudCcpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndW5tb3VudCcpO1xuXG4gICAgX2lzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVmaW5lRXZlbnRzKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQmluZCB1cGRhdGVzIHRvIHRoZSBtYXAgSUQgdG8gdGhpcyB2aWV3J3MgdXBkYXRlXG4gICAqIEBwYXJhbSBtYXBJRG9yT2JqIE9iamVjdCB0byBzdWJzY3JpYmUgdG8gb3IgSUQuIFNob3VsZCBpbXBsZW1lbnQgbm9yaS9zdG9yZS9NaXhpbk9ic2VydmFibGVTdG9yZVxuICAgKi9cbiAgZnVuY3Rpb24gYmluZE1hcChtYXBJRG9yT2JqKSB7XG4gICAgdmFyIG1hcDtcblxuICAgIGlmIChpcy5vYmplY3QobWFwSURvck9iaikpIHtcbiAgICAgIG1hcCA9IG1hcElEb3JPYmo7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1hcCA9IE5vcmkuc3RvcmUoKS5nZXRNYXAobWFwSURvck9iaikgfHwgTm9yaS5zdG9yZSgpLmdldE1hcENvbGxlY3Rpb24obWFwSURvck9iaik7XG4gICAgfVxuXG4gICAgaWYgKCFtYXApIHtcbiAgICAgIGNvbnNvbGUud2FybignVmlld0NvbXBvbmVudCBiaW5kTWFwLCBtYXAgb3IgbWFwY29sbGVjdGlvbiBub3QgZm91bmQ6ICcgKyBtYXBJRG9yT2JqKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWlzLmZ1bmN0aW9uKG1hcC5zdWJzY3JpYmUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1ZpZXdDb21wb25lbnQgYmluZE1hcCwgbWFwIG9yIG1hcGNvbGxlY3Rpb24gbXVzdCBiZSBvYnNlcnZhYmxlOiAnICsgbWFwSURvck9iaik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWFwLnN1YnNjcmliZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBjaGlsZFxuICAgKiBAcGFyYW0gY2hpbGRcbiAgICovXG4gIGZ1bmN0aW9uIGFkZENoaWxkKGNoaWxkKSB7XG4gICAgX2NoaWxkcmVuLnB1c2goY2hpbGQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGNoaWxkXG4gICAqIEBwYXJhbSBjaGlsZFxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlQ2hpbGQoY2hpbGQpIHtcbiAgICB2YXIgaWR4ID0gX2NoaWxkcmVuLmluZGV4T2YoY2hpbGQpO1xuICAgIF9jaGlsZHJlbltpZHhdLnVubW91bnQoKTtcbiAgICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gIH1cblxuICAvKipcbiAgICogQmVmb3JlIHRoZSB2aWV3IHVwZGF0ZXMgYW5kIGEgcmVyZW5kZXIgb2NjdXJzXG4gICAqIFJldHVybnMgbmV4dFN0YXRlIG9mIGNvbXBvbmVudFxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVwZGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIHZhciBjdXJyZW50U3RhdGUgPSB0aGlzLmdldFN0YXRlKCk7XG4gICAgdmFyIG5leHRTdGF0ZSAgICA9IHRoaXMuY29tcG9uZW50V2lsbFVwZGF0ZSgpO1xuXG4gICAgaWYgKHRoaXMuc2hvdWxkQ29tcG9uZW50VXBkYXRlKG5leHRTdGF0ZSkpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUobmV4dFN0YXRlKTtcbiAgICAgIC8vX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gdXBkYXRlQ2hpbGQoY2hpbGQpIHtcbiAgICAgIC8vICBjaGlsZC51cGRhdGUoKTtcbiAgICAgIC8vfSk7XG5cbiAgICAgIGlmIChfaXNNb3VudGVkKSB7XG4gICAgICAgIGlmICh0aGlzLnNob3VsZENvbXBvbmVudFJlbmRlcihjdXJyZW50U3RhdGUpKSB7XG4gICAgICAgICAgdGhpcy51bm1vdW50KCk7XG4gICAgICAgICAgdGhpcy5jb21wb25lbnRSZW5kZXIoKTtcbiAgICAgICAgICB0aGlzLm1vdW50KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZigndXBkYXRlJywgdGhpcy5nZXRJRCgpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29tcGFyZSBjdXJyZW50IHN0YXRlIGFuZCBuZXh0IHN0YXRlIHRvIGRldGVybWluZSBpZiB1cGRhdGluZyBzaG91bGQgb2NjdXJcbiAgICogQHBhcmFtIG5leHRTdGF0ZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHNob3VsZENvbXBvbmVudFVwZGF0ZShuZXh0U3RhdGUpIHtcbiAgICByZXR1cm4gaXMuZXhpc3R5KG5leHRTdGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIGl0LCBuZWVkIHRvIGFkZCBpdCB0byBhIHBhcmVudCBjb250YWluZXIsIGhhbmRsZWQgaW4gaGlnaGVyIGxldmVsIHZpZXdcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnRSZW5kZXIoKSB7XG4gICAgLy9fY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiByZW5kZXJDaGlsZChjaGlsZCkge1xuICAgIC8vICBjaGlsZC5jb21wb25lbnRSZW5kZXIoKTtcbiAgICAvL30pO1xuICAgIGlmICghX3RlbXBsYXRlT2JqQ2FjaGUpIHtcbiAgICAgIF90ZW1wbGF0ZU9iakNhY2hlID0gdGhpcy50ZW1wbGF0ZSgpO1xuICAgIH1cblxuICAgIF9odG1sID0gdGhpcy5yZW5kZXIodGhpcy5nZXRTdGF0ZSgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgTG9kYXNoIGNsaWVudCBzaWRlIHRlbXBsYXRlIGZ1bmN0aW9uIGJ5IGdldHRpbmcgdGhlIEhUTUwgc291cmNlIGZyb21cbiAgICogdGhlIG1hdGNoaW5nIDxzY3JpcHQgdHlwZT0ndGV4dC90ZW1wbGF0ZSc+IHRhZyBpbiB0aGUgZG9jdW1lbnQuIE9SIHlvdSBtYXlcbiAgICogc3BlY2lmeSB0aGUgY3VzdG9tIEhUTUwgdG8gdXNlIGhlcmUuXG4gICAqXG4gICAqIFRoZSBtZXRob2QgaXMgY2FsbGVkIG9ubHkgb24gdGhlIGZpcnN0IHJlbmRlciBhbmQgY2FjaGVkIHRvIHNwZWVkIHVwIHJlbmRlcnNcbiAgICpcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgKi9cbiAgZnVuY3Rpb24gdGVtcGxhdGUoKSB7XG4gICAgLy8gYXNzdW1lcyB0aGUgdGVtcGxhdGUgSUQgbWF0Y2hlcyB0aGUgY29tcG9uZW50J3MgSUQgYXMgcGFzc2VkIG9uIGluaXRpYWxpemVcbiAgICB2YXIgaHRtbCA9IF90ZW1wbGF0ZS5nZXRTb3VyY2UodGhpcy5nZXRJRCgpKTtcbiAgICByZXR1cm4gXy50ZW1wbGF0ZShodG1sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXkgYmUgb3ZlcnJpZGRlbiBpbiBhIHN1Ym1vZHVsZSBmb3IgY3VzdG9tIHJlbmRlcmluZ1xuICAgKiBTaG91bGQgcmV0dXJuIEhUTUxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiByZW5kZXIoc3RhdGUpIHtcbiAgICByZXR1cm4gX3RlbXBsYXRlT2JqQ2FjaGUoc3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZCBpdCB0byBhIHBhcmVudCBlbGVtZW50XG4gICAqIEBwYXJhbSBtb3VudEVsXG4gICAqL1xuICBmdW5jdGlvbiBtb3VudCgpIHtcbiAgICBpZiAoIV9odG1sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBvbmVudCAnICsgX2lkICsgJyBjYW5ub3QgbW91bnQgd2l0aCBubyBIVE1MLiBDYWxsIHJlbmRlcigpIGZpcnN0PycpO1xuICAgIH1cblxuICAgIF9pc01vdW50ZWQgPSB0cnVlO1xuXG4gICAgX0RPTUVsZW1lbnQgPSAoX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiBfaHRtbFxuICAgIH0pKTtcblxuICAgIGlmICh0aGlzLmRlbGVnYXRlRXZlbnRzKSB7XG4gICAgICAvLyBQYXNzIHRydWUgdG8gYXV0b21hdGljYWxseSBwYXNzIGZvcm0gZWxlbWVudCBoYW5kbGVycyB0aGUgZWxlbWVudHMgdmFsdWUgb3Igb3RoZXIgc3RhdHVzXG4gICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKHRydWUpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50KSB7XG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdtb3VudCcsIHRoaXMuZ2V0SUQoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCBhZnRlciBpdCdzIGJlZW4gYWRkZWQgdG8gYSB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAvLyBzdHViXG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB3aGVuIHVubG9hZGluZ1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgZnVuY3Rpb24gdW5tb3VudCgpIHtcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KCk7XG4gICAgX2lzTW91bnRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMudW5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgfVxuXG4gICAgX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiAnJ1xuICAgIH0pO1xuXG4gICAgX2h0bWwgICAgICAgPSAnJztcbiAgICBfRE9NRWxlbWVudCA9IG51bGw7XG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1bm1vdW50JywgdGhpcy5nZXRJRCgpKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGlzSW5pdGlhbGl6ZWQoKSB7XG4gICAgcmV0dXJuIF9pc0luaXRpYWxpemVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnUHJvcHMoKSB7XG4gICAgcmV0dXJuIF9jb25maWdQcm9wcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTW91bnRlZCgpIHtcbiAgICByZXR1cm4gX2lzTW91bnRlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcbiAgICB0aGlzLnNldFN0YXRlKHt9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElEKCkge1xuICAgIHJldHVybiBfaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRET01FbGVtZW50KCkge1xuICAgIHJldHVybiBfRE9NRWxlbWVudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENoaWxkcmVuKCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uc2xpY2UoMCk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVDb21wb25lbnQ6IGluaXRpYWxpemVDb21wb25lbnQsXG4gICAgZGVmaW5lRXZlbnRzICAgICAgIDogZGVmaW5lRXZlbnRzLFxuICAgIGlzSW5pdGlhbGl6ZWQgICAgICA6IGlzSW5pdGlhbGl6ZWQsXG4gICAgZ2V0Q29uZmlnUHJvcHMgICAgIDogZ2V0Q29uZmlnUHJvcHMsXG4gICAgZ2V0SW5pdGlhbFN0YXRlICAgIDogZ2V0SW5pdGlhbFN0YXRlLFxuICAgIGdldElEICAgICAgICAgICAgICA6IGdldElELFxuICAgIHRlbXBsYXRlICAgICAgICAgICA6IHRlbXBsYXRlLFxuICAgIGdldERPTUVsZW1lbnQgICAgICA6IGdldERPTUVsZW1lbnQsXG4gICAgaXNNb3VudGVkICAgICAgICAgIDogaXNNb3VudGVkLFxuXG4gICAgYmluZE1hcDogYmluZE1hcCxcblxuICAgIGNvbXBvbmVudFdpbGxVcGRhdGUgIDogY29tcG9uZW50V2lsbFVwZGF0ZSxcbiAgICBzaG91bGRDb21wb25lbnRVcGRhdGU6IHNob3VsZENvbXBvbmVudFVwZGF0ZSxcbiAgICB1cGRhdGUgICAgICAgICAgICAgICA6IHVwZGF0ZSxcblxuICAgIGNvbXBvbmVudFJlbmRlcjogY29tcG9uZW50UmVuZGVyLFxuICAgIHJlbmRlciAgICAgICAgIDogcmVuZGVyLFxuXG4gICAgbW91bnQgICAgICAgICAgICA6IG1vdW50LFxuICAgIGNvbXBvbmVudERpZE1vdW50OiBjb21wb25lbnREaWRNb3VudCxcblxuICAgIGNvbXBvbmVudFdpbGxVbm1vdW50OiBjb21wb25lbnRXaWxsVW5tb3VudCxcbiAgICB1bm1vdW50ICAgICAgICAgICAgIDogdW5tb3VudCxcblxuICAgIGFkZENoaWxkICAgOiBhZGRDaGlsZCxcbiAgICByZW1vdmVDaGlsZDogcmVtb3ZlQ2hpbGQsXG4gICAgZ2V0Q2hpbGRyZW46IGdldENoaWxkcmVuXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmlld0NvbXBvbmVudDsiLCJ2YXIgYnJvd3NlckluZm8gPSB7XG5cbiAgYXBwVmVyc2lvbiA6IG5hdmlnYXRvci5hcHBWZXJzaW9uLFxuICB1c2VyQWdlbnQgIDogbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgaXNJRSAgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTVNJRSBcIiksXG4gIGlzSUU2ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA2XCIpLFxuICBpc0lFNyAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgN1wiKSxcbiAgaXNJRTggICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDhcIiksXG4gIGlzSUU5ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA5XCIpLFxuICBpc0ZGICAgICAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJGaXJlZm94L1wiKSxcbiAgaXNDaHJvbWUgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiQ2hyb21lL1wiKSxcbiAgaXNNYWMgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTWFjaW50b3NoLFwiKSxcbiAgaXNNYWNTYWZhcmk6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiU2FmYXJpXCIpICYmIC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTWFjXCIpICYmIC0xID09PSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJDaHJvbWVcIiksXG5cbiAgaGFzVG91Y2ggICAgOiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gIG5vdFN1cHBvcnRlZDogKHRoaXMuaXNJRTYgfHwgdGhpcy5pc0lFNyB8fCB0aGlzLmlzSUU4IHx8IHRoaXMuaXNJRTkpLFxuXG4gIG1vYmlsZToge1xuICAgIEFuZHJvaWQgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9BbmRyb2lkL2kpO1xuICAgIH0sXG4gICAgQmxhY2tCZXJyeTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JsYWNrQmVycnkvaSkgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQkIxMDsgVG91Y2gvKTtcbiAgICB9LFxuICAgIGlPUyAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGhvbmV8aVBhZHxpUG9kL2kpO1xuICAgIH0sXG4gICAgT3BlcmEgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL09wZXJhIE1pbmkvaSk7XG4gICAgfSxcbiAgICBXaW5kb3dzICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvSUVNb2JpbGUvaSk7XG4gICAgfSxcbiAgICBhbnkgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gKHRoaXMuQW5kcm9pZCgpIHx8IHRoaXMuQmxhY2tCZXJyeSgpIHx8IHRoaXMuaU9TKCkgfHwgdGhpcy5PcGVyYSgpIHx8IHRoaXMuV2luZG93cygpKSAhPT0gbnVsbDtcbiAgICB9XG5cbiAgfSxcblxuICAvLyBUT0RPIGZpbHRlciBmb3IgSUUgPiA5XG4gIGVuaGFuY2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICFfYnJvd3NlckluZm8uaXNJRSAmJiAhX2Jyb3dzZXJJbmZvLm1vYmlsZS5hbnkoKTtcbiAgfSxcblxuICBtb3VzZURvd25FdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoc3RhcnRcIiA6IFwibW91c2Vkb3duXCI7XG4gIH0sXG5cbiAgbW91c2VVcEV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiO1xuICB9LFxuXG4gIG1vdXNlQ2xpY2tFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoZW5kXCIgOiBcImNsaWNrXCI7XG4gIH0sXG5cbiAgbW91c2VNb3ZlRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaG1vdmVcIiA6IFwibW91c2Vtb3ZlXCI7XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBicm93c2VySW5mbzsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEyMzk5OS9ob3ctdG8tdGVsbC1pZi1hLWRvbS1lbGVtZW50LWlzLXZpc2libGUtaW4tdGhlLWN1cnJlbnQtdmlld3BvcnRcbiAgLy8gZWxlbWVudCBtdXN0IGJlIGVudGlyZWx5IG9uIHNjcmVlblxuICBpc0VsZW1lbnRFbnRpcmVseUluVmlld3BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIChcbiAgICAgIHJlY3QudG9wID49IDAgJiZcbiAgICAgIHJlY3QubGVmdCA+PSAwICYmXG4gICAgICByZWN0LmJvdHRvbSA8PSAod2luZG93LmlubmVySGVpZ2h0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpICYmXG4gICAgICByZWN0LnJpZ2h0IDw9ICh3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpXG4gICAgKTtcbiAgfSxcblxuICAvLyBlbGVtZW50IG1heSBiZSBwYXJ0aWFseSBvbiBzY3JlZW5cbiAgaXNFbGVtZW50SW5WaWV3cG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gcmVjdC5ib3R0b20gPiAwICYmXG4gICAgICByZWN0LnJpZ2h0ID4gMCAmJlxuICAgICAgcmVjdC5sZWZ0IDwgKHdpbmRvdy5pbm5lcldpZHRoIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCkgJiZcbiAgICAgIHJlY3QudG9wIDwgKHdpbmRvdy5pbm5lckhlaWdodCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KTtcbiAgfSxcblxuICBpc0RvbU9iajogZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiAhIShvYmoubm9kZVR5cGUgfHwgKG9iaiA9PT0gd2luZG93KSk7XG4gIH0sXG5cbiAgcG9zaXRpb246IGZ1bmN0aW9uIChlbCkge1xuICAgIHJldHVybiB7XG4gICAgICBsZWZ0OiBlbC5vZmZzZXRMZWZ0LFxuICAgICAgdG9wIDogZWwub2Zmc2V0VG9wXG4gICAgfTtcbiAgfSxcblxuICAvLyBmcm9tIGh0dHA6Ly9qc3BlcmYuY29tL2pxdWVyeS1vZmZzZXQtdnMtb2Zmc2V0cGFyZW50LWxvb3BcbiAgb2Zmc2V0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgb2wgPSAwLFxuICAgICAgICBvdCA9IDA7XG4gICAgaWYgKGVsLm9mZnNldFBhcmVudCkge1xuICAgICAgZG8ge1xuICAgICAgICBvbCArPSBlbC5vZmZzZXRMZWZ0O1xuICAgICAgICBvdCArPSBlbC5vZmZzZXRUb3A7XG4gICAgICB9IHdoaWxlIChlbCA9IGVsLm9mZnNldFBhcmVudCk7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbGVmdDogb2wsXG4gICAgICB0b3AgOiBvdFxuICAgIH07XG4gIH0sXG5cbiAgcmVtb3ZlQWxsRWxlbWVudHM6IGZ1bmN0aW9uIChlbCkge1xuICAgIHdoaWxlIChlbC5maXJzdENoaWxkKSB7XG4gICAgICBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcbiAgICB9XG4gIH0sXG5cbiAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQ5NDE0My9jcmVhdGluZy1hLW5ldy1kb20tZWxlbWVudC1mcm9tLWFuLWh0bWwtc3RyaW5nLXVzaW5nLWJ1aWx0LWluLWRvbS1tZXRob2RzLW9yLXByb1xuICBIVE1MU3RyVG9Ob2RlOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgdmFyIHRlbXAgICAgICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0ZW1wLmlubmVySFRNTCA9IHN0cjtcbiAgICByZXR1cm4gdGVtcC5maXJzdENoaWxkO1xuICB9LFxuXG4gIHdyYXBFbGVtZW50OiBmdW5jdGlvbiAod3JhcHBlclN0ciwgZWwpIHtcbiAgICB2YXIgd3JhcHBlckVsID0gdGhpcy5IVE1MU3RyVG9Ob2RlKHdyYXBwZXJTdHIpLFxuICAgICAgICBlbFBhcmVudCAgPSBlbC5wYXJlbnROb2RlO1xuXG4gICAgd3JhcHBlckVsLmFwcGVuZENoaWxkKGVsKTtcbiAgICBlbFBhcmVudC5hcHBlbmRDaGlsZCh3cmFwcGVyRWwpO1xuICAgIHJldHVybiB3cmFwcGVyRWw7XG4gIH0sXG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNTMyOTE2Ny9jbG9zZXN0LWFuY2VzdG9yLW1hdGNoaW5nLXNlbGVjdG9yLXVzaW5nLW5hdGl2ZS1kb21cbiAgY2xvc2VzdDogZnVuY3Rpb24gKGVsLCBzZWxlY3Rvcikge1xuICAgIHZhciBtYXRjaGVzU2VsZWN0b3IgPSBlbC5tYXRjaGVzIHx8IGVsLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fCBlbC5tb3pNYXRjaGVzU2VsZWN0b3IgfHwgZWwubXNNYXRjaGVzU2VsZWN0b3I7XG4gICAgd2hpbGUgKGVsKSB7XG4gICAgICBpZiAobWF0Y2hlc1NlbGVjdG9yLmJpbmQoZWwpKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbCA9IGVsLnBhcmVudEVsZW1lbnQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvLyBmcm9tIHlvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb21cbiAgaGFzQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldyBSZWdFeHAoJyhefCApJyArIGNsYXNzTmFtZSArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgYWRkQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICAgIH1cbiAgfSxcblxuICByZW1vdmVDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyhefFxcXFxiKScgKyBjbGFzc05hbWUuc3BsaXQoJyAnKS5qb2luKCd8JykgKyAnKFxcXFxifCQpJywgJ2dpJyksICcgJyk7XG4gICAgfVxuICB9LFxuXG4gIHRvZ2dsZUNsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmICh0aGlzLmhhc0NsYXNzKGVsLCBjbGFzc05hbWUpKSB7XG4gICAgICB0aGlzLnJlbW92ZUNsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZENsYXNzKGVsLCBjbGFzc05hbWUpO1xuICAgIH1cbiAgfSxcblxuICAvLyBGcm9tIGltcHJlc3MuanNcbiAgYXBwbHlDU1M6IGZ1bmN0aW9uIChlbCwgcHJvcHMpIHtcbiAgICB2YXIga2V5LCBwa2V5O1xuICAgIGZvciAoa2V5IGluIHByb3BzKSB7XG4gICAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBlbC5zdHlsZVtrZXldID0gcHJvcHNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGVsO1xuICB9LFxuXG4gIC8vIGZyb20gaW1wcmVzcy5qc1xuICAvLyBgY29tcHV0ZVdpbmRvd1NjYWxlYCBjb3VudHMgdGhlIHNjYWxlIGZhY3RvciBiZXR3ZWVuIHdpbmRvdyBzaXplIGFuZCBzaXplXG4gIC8vIGRlZmluZWQgZm9yIHRoZSBwcmVzZW50YXRpb24gaW4gdGhlIGNvbmZpZy5cbiAgY29tcHV0ZVdpbmRvd1NjYWxlOiBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgdmFyIGhTY2FsZSA9IHdpbmRvdy5pbm5lckhlaWdodCAvIGNvbmZpZy5oZWlnaHQsXG4gICAgICAgIHdTY2FsZSA9IHdpbmRvdy5pbm5lcldpZHRoIC8gY29uZmlnLndpZHRoLFxuICAgICAgICBzY2FsZSAgPSBoU2NhbGUgPiB3U2NhbGUgPyB3U2NhbGUgOiBoU2NhbGU7XG5cbiAgICBpZiAoY29uZmlnLm1heFNjYWxlICYmIHNjYWxlID4gY29uZmlnLm1heFNjYWxlKSB7XG4gICAgICBzY2FsZSA9IGNvbmZpZy5tYXhTY2FsZTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLm1pblNjYWxlICYmIHNjYWxlIDwgY29uZmlnLm1pblNjYWxlKSB7XG4gICAgICBzY2FsZSA9IGNvbmZpZy5taW5TY2FsZTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2NhbGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBhbiBhcnJheSBvZiBlbGVtZW50cyBpbiB0aGUgY29udGFpbmVyIHJldHVybmVkIGFzIEFycmF5IGluc3RlYWQgb2YgYSBOb2RlIGxpc3RcbiAgICovXG4gIGdldFFTRWxlbWVudHNBc0FycmF5OiBmdW5jdGlvbiAoZWwsIGNscykge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKGNscyksIDApO1xuICB9LFxuXG4gIGNlbnRlckVsZW1lbnRJblZpZXdQb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgdnBIID0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgICAgICB2cFcgPSB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgZWxSID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgIGVsSCA9IGVsUi5oZWlnaHQsXG4gICAgICAgIGVsVyA9IGVsUi53aWR0aDtcblxuICAgIGVsLnN0eWxlLmxlZnQgPSAodnBXIC8gMikgLSAoZWxXIC8gMikgKyAncHgnO1xuICAgIGVsLnN0eWxlLnRvcCAgPSAodnBIIC8gMikgLSAoZWxIIC8gMikgKyAncHgnO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG9iamVjdCBmcm9tIHRoZSBuYW1lIChvciBpZCkgYXR0cmlicyBhbmQgZGF0YSBvZiBhIGZvcm1cbiAgICogQHBhcmFtIGVsXG4gICAqIEByZXR1cm5zIHtudWxsfVxuICAgKi9cbiAgY2FwdHVyZUZvcm1EYXRhOiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgZGF0YU9iaiA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICAgIHRleHRhcmVhRWxzLCBpbnB1dEVscywgc2VsZWN0RWxzO1xuXG4gICAgdGV4dGFyZWFFbHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCd0ZXh0YXJlYScpLCAwKTtcbiAgICBpbnB1dEVscyAgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0JyksIDApO1xuICAgIHNlbGVjdEVscyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgnc2VsZWN0JyksIDApO1xuXG4gICAgdGV4dGFyZWFFbHMuZm9yRWFjaChnZXRJbnB1dEZvcm1EYXRhKTtcbiAgICBpbnB1dEVscy5mb3JFYWNoKGdldElucHV0Rm9ybURhdGEpO1xuICAgIHNlbGVjdEVscy5mb3JFYWNoKGdldFNlbGVjdEZvcm1EYXRhKTtcblxuICAgIHJldHVybiBkYXRhT2JqO1xuXG4gICAgZnVuY3Rpb24gZ2V0SW5wdXRGb3JtRGF0YShmb3JtRWwpIHtcbiAgICAgIGRhdGFPYmpbZ2V0RWxOYW1lT3JJRChmb3JtRWwpXSA9IGZvcm1FbC52YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3RGb3JtRGF0YShmb3JtRWwpIHtcbiAgICAgIHZhciBzZWwgPSBmb3JtRWwuc2VsZWN0ZWRJbmRleCwgdmFsID0gJyc7XG4gICAgICBpZiAoc2VsID49IDApIHtcbiAgICAgICAgdmFsID0gZm9ybUVsLm9wdGlvbnNbc2VsXS52YWx1ZTtcbiAgICAgIH1cbiAgICAgIGRhdGFPYmpbZ2V0RWxOYW1lT3JJRChmb3JtRWwpXSA9IHZhbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRFbE5hbWVPcklEKGZvcm1FbCkge1xuICAgICAgdmFyIG5hbWUgPSAnbm9fbmFtZSc7XG4gICAgICBpZiAoZm9ybUVsLmdldEF0dHJpYnV0ZSgnbmFtZScpKSB7XG4gICAgICAgIG5hbWUgPSBmb3JtRWwuZ2V0QXR0cmlidXRlKCduYW1lJyk7XG4gICAgICB9IGVsc2UgaWYgKGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ2lkJykpIHtcbiAgICAgICAgbmFtZSA9IGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ2lkJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmFtZTtcbiAgICB9XG4gIH1cblxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvKipcbiAgICogQ3JlYXRlIHNoYXJlZCAzZCBwZXJzcGVjdGl2ZSBmb3IgYWxsIGNoaWxkcmVuXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHkzRFRvQ29udGFpbmVyOiBmdW5jdGlvbiAoZWwpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGVsLCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgcGVyc3BlY3RpdmUgICAgICA6IDgwMCxcbiAgICAgICAgcGVyc3BlY3RpdmVPcmlnaW46ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBcHBseSBiYXNpYyBDU1MgcHJvcHNcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBhcHBseTNEVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGVsLCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgdHJhbnNmb3JtU3R5bGUgICAgOiBcInByZXNlcnZlLTNkXCIsXG4gICAgICAgIGJhY2tmYWNlVmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luICAgOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbHkgYmFzaWMgM2QgcHJvcHMgYW5kIHNldCB1bmlxdWUgcGVyc3BlY3RpdmUgZm9yIGNoaWxkcmVuXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHlVbmlxdWUzRFRvRWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHRyYW5zZm9ybVN0eWxlICAgICAgOiBcInByZXNlcnZlLTNkXCIsXG4gICAgICAgIGJhY2tmYWNlVmlzaWJpbGl0eSAgOiBcImhpZGRlblwiLFxuICAgICAgICB0cmFuc2Zvcm1QZXJzcGVjdGl2ZTogNjAwLFxuICAgICAgICB0cmFuc2Zvcm1PcmlnaW4gICAgIDogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxufTtcbiIsInZhciBNZXNzYWdlQm94Q3JlYXRvciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX21lc3NhZ2VCb3hWaWV3ID0gcmVxdWlyZSgnLi9NZXNzYWdlQm94VmlldycpO1xuXG4gIGZ1bmN0aW9uIGFsZXJ0KHRpdGxlLCBtZXNzYWdlLCBtb2RhbCwgY2IpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cD4nICsgbWVzc2FnZSArICc8L3A+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREFOR0VSLFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA0MDAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnQ2xvc2UnLFxuICAgICAgICAgIGlkICAgICA6ICdDbG9zZScsXG4gICAgICAgICAgdHlwZSAgIDogJycsXG4gICAgICAgICAgaWNvbiAgIDogJ3RpbWVzJyxcbiAgICAgICAgICBvbkNsaWNrOiBjYlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb25maXJtKHRpdGxlLCBtZXNzYWdlLCBva0NCLCBtb2RhbCkge1xuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwPicgKyBtZXNzYWdlICsgJzwvcD4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA0MDAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXG4gICAgICAgICAgaWQgICA6ICdDYW5jZWwnLFxuICAgICAgICAgIHR5cGUgOiAnbmVnYXRpdmUnLFxuICAgICAgICAgIGljb24gOiAndGltZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnUHJvY2VlZCcsXG4gICAgICAgICAgaWQgICAgIDogJ3Byb2NlZWQnLFxuICAgICAgICAgIHR5cGUgICA6ICdwb3NpdGl2ZScsXG4gICAgICAgICAgaWNvbiAgIDogJ2NoZWNrJyxcbiAgICAgICAgICBvbkNsaWNrOiBva0NCXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21wdCh0aXRsZSwgbWVzc2FnZSwgb2tDQiwgbW9kYWwpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cCBjbGFzcz1cInRleHQtY2VudGVyIHBhZGRpbmctYm90dG9tLWRvdWJsZVwiPicgKyBtZXNzYWdlICsgJzwvcD48dGV4dGFyZWEgbmFtZT1cInJlc3BvbnNlXCIgY2xhc3M9XCJpbnB1dC10ZXh0XCIgdHlwZT1cInRleHRcIiBzdHlsZT1cIndpZHRoOjQwMHB4OyBoZWlnaHQ6NzVweDsgcmVzaXplOiBub25lXCIgYXV0b2ZvY3VzPVwidHJ1ZVwiPjwvdGV4dGFyZWE+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDUwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ1Byb2NlZWQnLFxuICAgICAgICAgIGlkICAgICA6ICdwcm9jZWVkJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjaG9pY2UodGl0bGUsIG1lc3NhZ2UsIHNlbGVjdGlvbnMsIG9rQ0IsIG1vZGFsKSB7XG4gICAgdmFyIHNlbGVjdEhUTUwgPSAnPHNlbGVjdCBjbGFzcz1cInNwYWNlZFwiIHN0eWxlPVwid2lkdGg6NDUwcHg7aGVpZ2h0OjIwMHB4XCIgbmFtZT1cInNlbGVjdGlvblwiIGF1dG9mb2N1cz1cInRydWVcIiBzaXplPVwiMjBcIj4nO1xuXG4gICAgc2VsZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChvcHQpIHtcbiAgICAgIHNlbGVjdEhUTUwgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgb3B0LnZhbHVlICsgJ1wiICcgKyAob3B0LnNlbGVjdGVkID09PSAndHJ1ZScgPyAnc2VsZWN0ZWQnIDogJycpICsgJz4nICsgb3B0LmxhYmVsICsgJzwvb3B0aW9uPic7XG4gICAgfSk7XG5cbiAgICBzZWxlY3RIVE1MICs9ICc8L3NlbGVjdD4nO1xuXG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHAgY2xhc3M9XCJ0ZXh0LWNlbnRlciBwYWRkaW5nLWJvdHRvbS1kb3VibGVcIj4nICsgbWVzc2FnZSArICc8L3A+PGRpdiBjbGFzcz1cInRleHQtY2VudGVyXCI+JyArIHNlbGVjdEhUTUwgKyAnPC9kaXY+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNTAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ09LJyxcbiAgICAgICAgICBpZCAgICAgOiAnb2snLFxuICAgICAgICAgIHR5cGUgICA6ICdwb3NpdGl2ZScsXG4gICAgICAgICAgaWNvbiAgIDogJ2NoZWNrJyxcbiAgICAgICAgICBvbkNsaWNrOiBva0NCXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYWxlcnQgIDogYWxlcnQsXG4gICAgY29uZmlybTogY29uZmlybSxcbiAgICBwcm9tcHQgOiBwcm9tcHQsXG4gICAgY2hvaWNlIDogY2hvaWNlXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZUJveENyZWF0b3IoKTsiLCJ2YXIgTWVzc2FnZUJveFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgICAgICAgICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgICAgICAgICAgICA9IDAsXG4gICAgICBfaGlnaGVzdFogICAgICAgICAgICAgICA9IDEwMDAsXG4gICAgICBfZGVmYXVsdFdpZHRoICAgICAgICAgICA9IDQwMCxcbiAgICAgIF90eXBlcyAgICAgICAgICAgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCAgICAgICAgICAgPSB7XG4gICAgICAgICdkZWZhdWx0JyAgICA6ICcnLFxuICAgICAgICAnaW5mb3JtYXRpb24nOiAnbWVzc2FnZWJveF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAnbWVzc2FnZWJveF9fc3VjY2VzcycsXG4gICAgICAgICd3YXJuaW5nJyAgICA6ICdtZXNzYWdlYm94X193YXJuaW5nJyxcbiAgICAgICAgJ2RhbmdlcicgICAgIDogJ21lc3NhZ2Vib3hfX2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF9idXR0b25JY29uVGVtcGxhdGVJRCAgID0gJ21lc3NhZ2Vib3gtLWJ1dHRvbi1pY29uJyxcbiAgICAgIF9idXR0b25Ob0ljb25UZW1wbGF0ZUlEID0gJ21lc3NhZ2Vib3gtLWJ1dHRvbi1ub2ljb24nLFxuICAgICAgX3RlbXBsYXRlICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9tb2RhbCAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9Nb2RhbENvdmVyVmlldy5qcycpLFxuICAgICAgX2Jyb3dzZXJJbmZvICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpLFxuICAgICAgX2NvbXBvbmVudFV0aWxzICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzJyk7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIHNldCB0aGUgbW91bnQgcG9pbnQgLyBib3ggY29udGFpbmVyXG4gICAqIEBwYXJhbSBlbElEXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIG5ldyBtZXNzYWdlIGJveFxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgdmFyIHR5cGUgICA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVCxcbiAgICAgICAgYm94T2JqID0gY3JlYXRlQm94T2JqZWN0KGluaXRPYmopO1xuXG4gICAgLy8gc2V0dXBcbiAgICBfY2hpbGRyZW4ucHVzaChib3hPYmopO1xuICAgIF9tb3VudFBvaW50LmFwcGVuZENoaWxkKGJveE9iai5lbGVtZW50KTtcbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgYm94T2JqLmVsZW1lbnQpO1xuICAgIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKTtcblxuICAgIF9jb21wb25lbnRVdGlscy5hcHBseVVuaXF1ZTNEVG9FbGVtZW50KGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIFNldCAzZCBDU1MgcHJvcHMgZm9yIGluL291dCB0cmFuc2l0aW9uXG4gICAgVHdlZW5MaXRlLnNldChib3hPYmouZWxlbWVudCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHpJbmRleDogX2hpZ2hlc3RaLFxuICAgICAgICB3aWR0aCA6IGluaXRPYmoud2lkdGggPyBpbml0T2JqLndpZHRoIDogX2RlZmF1bHRXaWR0aFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gY2VudGVyIGFmdGVyIHdpZHRoIGhhcyBiZWVuIHNldFxuICAgIF9kb21VdGlscy5jZW50ZXJFbGVtZW50SW5WaWV3UG9ydChib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBNYWtlIGl0IGRyYWdnYWJsZVxuICAgIERyYWdnYWJsZS5jcmVhdGUoJyMnICsgYm94T2JqLmlkLCB7XG4gICAgICBib3VuZHMgOiB3aW5kb3csXG4gICAgICBvblByZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9oaWdoZXN0WiA9IERyYWdnYWJsZS56SW5kZXg7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBTaG93IGl0XG4gICAgdHJhbnNpdGlvbkluKGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIFNob3cgdGhlIG1vZGFsIGNvdmVyXG4gICAgaWYgKGluaXRPYmoubW9kYWwpIHtcbiAgICAgIF9tb2RhbC5zaG93Tm9uRGlzbWlzc2FibGUodHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJveE9iai5pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NpZ24gYSB0eXBlIGNsYXNzIHRvIGl0XG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBlbGVtZW50XG4gICAqL1xuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBvYmplY3QgZm9yIGEgYm94XG4gICAqIEBwYXJhbSBpbml0T2JqXG4gICAqIEByZXR1cm5zIHt7ZGF0YU9iajogKiwgaWQ6IHN0cmluZywgbW9kYWw6ICgqfGJvb2xlYW4pLCBlbGVtZW50OiAqLCBzdHJlYW1zOiBBcnJheX19XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVCb3hPYmplY3QoaW5pdE9iaikge1xuICAgIHZhciBpZCAgPSAnanNfX21lc3NhZ2Vib3gtJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgZGF0YU9iajogaW5pdE9iaixcbiAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICBtb2RhbCAgOiBpbml0T2JqLm1vZGFsLFxuICAgICAgICAgIGVsZW1lbnQ6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ21lc3NhZ2Vib3gtLWRlZmF1bHQnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IGluaXRPYmoudGl0bGUsXG4gICAgICAgICAgICBjb250ZW50OiBpbml0T2JqLmNvbnRlbnRcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBzdHJlYW1zOiBbXVxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgdGhlIGJ1dHRvbnNcbiAgICogQHBhcmFtIGJveE9ialxuICAgKi9cbiAgZnVuY3Rpb24gY29uZmlndXJlQnV0dG9ucyhib3hPYmopIHtcbiAgICB2YXIgYnV0dG9uRGF0YSA9IGJveE9iai5kYXRhT2JqLmJ1dHRvbnM7XG5cbiAgICAvLyBkZWZhdWx0IGJ1dHRvbiBpZiBub25lXG4gICAgaWYgKCFidXR0b25EYXRhKSB7XG4gICAgICBidXR0b25EYXRhID0gW3tcbiAgICAgICAgbGFiZWw6ICdDbG9zZScsXG4gICAgICAgIHR5cGUgOiAnJyxcbiAgICAgICAgaWNvbiA6ICd0aW1lcycsXG4gICAgICAgIGlkICAgOiAnZGVmYXVsdC1jbG9zZSdcbiAgICAgIH1dO1xuICAgIH1cblxuICAgIHZhciBidXR0b25Db250YWluZXIgPSBib3hPYmouZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuZm9vdGVyLWJ1dHRvbnMnKTtcblxuICAgIF9kb21VdGlscy5yZW1vdmVBbGxFbGVtZW50cyhidXR0b25Db250YWluZXIpO1xuXG4gICAgYnV0dG9uRGF0YS5mb3JFYWNoKGZ1bmN0aW9uIG1ha2VCdXR0b24oYnV0dG9uT2JqKSB7XG4gICAgICBidXR0b25PYmouaWQgPSBib3hPYmouaWQgKyAnLWJ1dHRvbi0nICsgYnV0dG9uT2JqLmlkO1xuXG4gICAgICB2YXIgYnV0dG9uRWw7XG5cbiAgICAgIGlmIChidXR0b25PYmouaGFzT3duUHJvcGVydHkoJ2ljb24nKSkge1xuICAgICAgICBidXR0b25FbCA9IF90ZW1wbGF0ZS5hc0VsZW1lbnQoX2J1dHRvbkljb25UZW1wbGF0ZUlELCBidXR0b25PYmopO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnV0dG9uRWwgPSBfdGVtcGxhdGUuYXNFbGVtZW50KF9idXR0b25Ob0ljb25UZW1wbGF0ZUlELCBidXR0b25PYmopO1xuICAgICAgfVxuXG4gICAgICBidXR0b25Db250YWluZXIuYXBwZW5kQ2hpbGQoYnV0dG9uRWwpO1xuXG4gICAgICB2YXIgYnRuU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoYnV0dG9uRWwsIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpXG4gICAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChidXR0b25PYmouaGFzT3duUHJvcGVydHkoJ29uQ2xpY2snKSkge1xuICAgICAgICAgICAgaWYgKGJ1dHRvbk9iai5vbkNsaWNrKSB7XG4gICAgICAgICAgICAgIGJ1dHRvbk9iai5vbkNsaWNrLmNhbGwodGhpcywgY2FwdHVyZUZvcm1EYXRhKGJveE9iai5pZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZW1vdmUoYm94T2JqLmlkKTtcbiAgICAgICAgfSk7XG4gICAgICBib3hPYmouc3RyZWFtcy5wdXNoKGJ0blN0cmVhbSk7XG4gICAgfSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGRhdGEgZnJvbSB0aGUgZm9ybSBvbiB0aGUgYm94IGNvbnRlbnRzXG4gICAqIEBwYXJhbSBib3hJRFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNhcHR1cmVGb3JtRGF0YShib3hJRCkge1xuICAgIHJldHVybiBfZG9tVXRpbHMuY2FwdHVyZUZvcm1EYXRhKGdldE9iakJ5SUQoYm94SUQpLmVsZW1lbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGJveCBmcm9tIHRoZSBzY3JlZW4gLyBjb250YWluZXJcbiAgICogQHBhcmFtIGlkXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmUoaWQpIHtcbiAgICB2YXIgaWR4ID0gZ2V0T2JqSW5kZXhCeUlEKGlkKSxcbiAgICAgICAgYm94T2JqO1xuXG4gICAgaWYgKGlkeCA+IC0xKSB7XG4gICAgICBib3hPYmogPSBfY2hpbGRyZW5baWR4XTtcbiAgICAgIHRyYW5zaXRpb25PdXQoYm94T2JqLmVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IHRoZSBib3hcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2l0aW9uSW4oZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAsIHthbHBoYTogMCwgcm90YXRpb25YOiA0NSwgc2NhbGU6IDJ9KTtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuNSwge1xuICAgICAgYWxwaGEgICAgOiAxLFxuICAgICAgcm90YXRpb25YOiAwLFxuICAgICAgc2NhbGUgICAgOiAxLFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGJveFxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25PdXQoZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuMjUsIHtcbiAgICAgIGFscGhhICAgIDogMCxcbiAgICAgIHJvdGF0aW9uWDogLTQ1LFxuICAgICAgc2NhbGUgICAgOiAwLjI1LFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VJbiwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW4gdXAgYWZ0ZXIgdGhlIHRyYW5zaXRpb24gb3V0IGFuaW1hdGlvblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGZ1bmN0aW9uIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKSB7XG4gICAgdmFyIGlkeCAgICA9IGdldE9iakluZGV4QnlJRChlbC5nZXRBdHRyaWJ1dGUoJ2lkJykpLFxuICAgICAgICBib3hPYmogPSBfY2hpbGRyZW5baWR4XTtcblxuICAgIGJveE9iai5zdHJlYW1zLmZvckVhY2goZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgc3RyZWFtLmRpc3Bvc2UoKTtcbiAgICB9KTtcblxuICAgIERyYWdnYWJsZS5nZXQoJyMnICsgYm94T2JqLmlkKS5kaXNhYmxlKCk7XG5cbiAgICBfbW91bnRQb2ludC5yZW1vdmVDaGlsZChlbCk7XG5cbiAgICBfY2hpbGRyZW5baWR4XSA9IG51bGw7XG4gICAgX2NoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuXG4gICAgY2hlY2tNb2RhbFN0YXR1cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZSBpZiBhbnkgb3BlbiBib3hlcyBoYXZlIG1vZGFsIHRydWVcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrTW9kYWxTdGF0dXMoKSB7XG4gICAgdmFyIGlzTW9kYWwgPSBmYWxzZTtcblxuICAgIF9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChib3hPYmopIHtcbiAgICAgIGlmIChib3hPYmoubW9kYWwgPT09IHRydWUpIHtcbiAgICAgICAgaXNNb2RhbCA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoIWlzTW9kYWwpIHtcbiAgICAgIF9tb2RhbC5oaWRlKHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVdGlsaXR5IHRvIGdldCB0aGUgYm94IG9iamVjdCBpbmRleCBieSBJRFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFV0aWxpdHkgdG8gZ2V0IHRoZSBib3ggb2JqZWN0IGJ5IElEXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0T2JqQnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkID09PSBpZDtcbiAgICB9KVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VCb3hWaWV3KCk7IiwidmFyIE1vZGFsQ292ZXJWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfbW91bnRQb2ludCAgPSBkb2N1bWVudCxcbiAgICAgIF9tb2RhbENvdmVyRWwsXG4gICAgICBfbW9kYWxCYWNrZ3JvdW5kRWwsXG4gICAgICBfbW9kYWxDbG9zZUJ1dHRvbkVsLFxuICAgICAgX21vZGFsQ2xpY2tTdHJlYW0sXG4gICAgICBfaXNWaXNpYmxlLFxuICAgICAgX25vdERpc21pc3NpYmxlLFxuICAgICAgX2Jyb3dzZXJJbmZvID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuXG4gICAgX2lzVmlzaWJsZSA9IHRydWU7XG5cbiAgICBfbW9kYWxDb3ZlckVsICAgICAgID0gX21vdW50UG9pbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGFsX19jb3ZlcicpO1xuICAgIF9tb2RhbEJhY2tncm91bmRFbCAgPSBfbW91bnRQb2ludC5xdWVyeVNlbGVjdG9yKCcubW9kYWxfX2JhY2tncm91bmQnKTtcbiAgICBfbW9kYWxDbG9zZUJ1dHRvbkVsID0gX21vdW50UG9pbnQucXVlcnlTZWxlY3RvcignLm1vZGFsX19jbG9zZS1idXR0b24nKTtcblxuICAgIHZhciBtb2RhbEJHQ2xpY2sgICAgID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoX21vZGFsQmFja2dyb3VuZEVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKSxcbiAgICAgICAgbW9kYWxCdXR0b25DbGljayA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KF9tb2RhbENsb3NlQnV0dG9uRWwsIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpO1xuXG4gICAgX21vZGFsQ2xpY2tTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLm1lcmdlKG1vZGFsQkdDbGljaywgbW9kYWxCdXR0b25DbGljaylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKCkge1xuICAgICAgICBvbk1vZGFsQ2xpY2soKTtcbiAgICAgIH0pO1xuXG4gICAgaGlkZShmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJc1Zpc2libGUoKSB7XG4gICAgcmV0dXJuIF9pc1Zpc2libGU7XG4gIH1cblxuICBmdW5jdGlvbiBvbk1vZGFsQ2xpY2soKSB7XG4gICAgaWYgKF9ub3REaXNtaXNzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBoaWRlKHRydWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd01vZGFsQ292ZXIoc2hvdWxkQW5pbWF0ZSkge1xuICAgIF9pc1Zpc2libGUgICA9IHRydWU7XG4gICAgdmFyIGR1cmF0aW9uID0gc2hvdWxkQW5pbWF0ZSA/IDAuMjUgOiAwO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDb3ZlckVsLCBkdXJhdGlvbiwge1xuICAgICAgYXV0b0FscGhhOiAxLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCBkdXJhdGlvbiwge1xuICAgICAgYWxwaGE6IDEsXG4gICAgICBlYXNlIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93KHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoX2lzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ub3REaXNtaXNzaWJsZSA9IGZhbHNlO1xuXG4gICAgc2hvd01vZGFsQ292ZXIoc2hvdWxkQW5pbWF0ZSk7XG5cbiAgICBUd2VlbkxpdGUuc2V0KF9tb2RhbENsb3NlQnV0dG9uRWwsIHtzY2FsZTogMiwgYWxwaGE6IDB9KTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgMSwge1xuICAgICAgYXV0b0FscGhhOiAxLFxuICAgICAgc2NhbGUgICAgOiAxLFxuICAgICAgZWFzZSAgICAgOiBCb3VuY2UuZWFzZU91dCxcbiAgICAgIGRlbGF5ICAgIDogMVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgJ2hhcmQnIG1vZGFsIHZpZXcgY2Fubm90IGJlIGRpc21pc3NlZCB3aXRoIGEgY2xpY2ssIG11c3QgYmUgdmlhIGNvZGVcbiAgICogQHBhcmFtIHNob3VsZEFuaW1hdGVcbiAgICovXG4gIGZ1bmN0aW9uIHNob3dOb25EaXNtaXNzYWJsZShzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKF9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfbm90RGlzbWlzc2libGUgPSB0cnVlO1xuXG4gICAgc2hvd01vZGFsQ292ZXIoc2hvdWxkQW5pbWF0ZSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENsb3NlQnV0dG9uRWwsIDAsIHthdXRvQWxwaGE6IDB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhpZGUoc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmICghX2lzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBfaXNWaXNpYmxlICAgICAgPSBmYWxzZTtcbiAgICBfbm90RGlzbWlzc2libGUgPSBmYWxzZTtcbiAgICB2YXIgZHVyYXRpb24gICAgPSBzaG91bGRBbmltYXRlID8gMC4yNSA6IDA7XG4gICAgVHdlZW5MaXRlLmtpbGxEZWxheWVkQ2FsbHNUbyhfbW9kYWxDbG9zZUJ1dHRvbkVsKTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ292ZXJFbCwgZHVyYXRpb24sIHtcbiAgICAgIGF1dG9BbHBoYTogMCxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENsb3NlQnV0dG9uRWwsIGR1cmF0aW9uIC8gMiwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0T3BhY2l0eShvcGFjaXR5KSB7XG4gICAgaWYgKG9wYWNpdHkgPCAwIHx8IG9wYWNpdHkgPiAxKSB7XG4gICAgICBjb25zb2xlLmxvZygnbnVkb3J1L2NvbXBvbmVudC9Nb2RhbENvdmVyVmlldzogc2V0T3BhY2l0eTogb3BhY2l0eSBzaG91bGQgYmUgYmV0d2VlbiAwIGFuZCAxJyk7XG4gICAgICBvcGFjaXR5ID0gMTtcbiAgICB9XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbEJhY2tncm91bmRFbCwgMC4yNSwge1xuICAgICAgYWxwaGE6IG9wYWNpdHksXG4gICAgICBlYXNlIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDb2xvcihyLCBnLCBiKSB7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbEJhY2tncm91bmRFbCwgMC4yNSwge1xuICAgICAgYmFja2dyb3VuZENvbG9yOiAncmdiKCcgKyByICsgJywnICsgZyArICcsJyArIGIgKyAnKScsXG4gICAgICBlYXNlICAgICAgICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplICAgICAgICA6IGluaXRpYWxpemUsXG4gICAgc2hvdyAgICAgICAgICAgICAgOiBzaG93LFxuICAgIHNob3dOb25EaXNtaXNzYWJsZTogc2hvd05vbkRpc21pc3NhYmxlLFxuICAgIGhpZGUgICAgICAgICAgICAgIDogaGlkZSxcbiAgICB2aXNpYmxlICAgICAgICAgICA6IGdldElzVmlzaWJsZSxcbiAgICBzZXRPcGFjaXR5ICAgICAgICA6IHNldE9wYWNpdHksXG4gICAgc2V0Q29sb3IgICAgICAgICAgOiBzZXRDb2xvclxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGFsQ292ZXJWaWV3KCk7IiwidmFyIFRvYXN0VmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2NoaWxkcmVuICAgICAgICAgICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICAgICAgICAgICA9IDAsXG4gICAgICBfZGVmYXVsdEV4cGlyZUR1cmF0aW9uID0gNzAwMCxcbiAgICAgIF90eXBlcyAgICAgICAgICAgICAgICAgPSB7XG4gICAgICAgIERFRkFVTFQgICAgOiAnZGVmYXVsdCcsXG4gICAgICAgIElORk9STUFUSU9OOiAnaW5mb3JtYXRpb24nLFxuICAgICAgICBTVUNDRVNTICAgIDogJ3N1Y2Nlc3MnLFxuICAgICAgICBXQVJOSU5HICAgIDogJ3dhcm5pbmcnLFxuICAgICAgICBEQU5HRVIgICAgIDogJ2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfdHlwZVN0eWxlTWFwICAgICAgICAgID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ3RvYXN0X19pbmZvcm1hdGlvbicsXG4gICAgICAgICdzdWNjZXNzJyAgICA6ICd0b2FzdF9fc3VjY2VzcycsXG4gICAgICAgICd3YXJuaW5nJyAgICA6ICd0b2FzdF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICd0b2FzdF9fZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX3RlbXBsYXRlICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX2Jyb3dzZXJJbmZvICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyksXG4gICAgICBfZG9tVXRpbHMgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKSxcbiAgICAgIF9jb21wb25lbnRVdGlscyAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8vb2JqLnRpdGxlLCBvYmouY29udGVudCwgb2JqLnR5cGVcbiAgZnVuY3Rpb24gYWRkKGluaXRPYmopIHtcbiAgICBpbml0T2JqLnR5cGUgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQ7XG5cbiAgICB2YXIgdG9hc3RPYmogPSBjcmVhdGVUb2FzdE9iamVjdChpbml0T2JqLnRpdGxlLCBpbml0T2JqLm1lc3NhZ2UpO1xuXG4gICAgX2NoaWxkcmVuLnB1c2godG9hc3RPYmopO1xuXG4gICAgX21vdW50UG9pbnQuaW5zZXJ0QmVmb3JlKHRvYXN0T2JqLmVsZW1lbnQsIF9tb3VudFBvaW50LmZpcnN0Q2hpbGQpO1xuXG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KGluaXRPYmoudHlwZSwgdG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICBfY29tcG9uZW50VXRpbHMuYXBwbHkzRFRvQ29udGFpbmVyKF9tb3VudFBvaW50KTtcbiAgICBfY29tcG9uZW50VXRpbHMuYXBwbHkzRFRvRWxlbWVudCh0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIHZhciBjbG9zZUJ0biAgICAgICAgID0gdG9hc3RPYmouZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcudG9hc3RfX2l0ZW0tY29udHJvbHMgPiBidXR0b24nKSxcbiAgICAgICAgY2xvc2VCdG5TdGVhbSAgICA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGNsb3NlQnRuLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKSxcbiAgICAgICAgZXhwaXJlVGltZVN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoX2RlZmF1bHRFeHBpcmVEdXJhdGlvbik7XG5cbiAgICB0b2FzdE9iai5kZWZhdWx0QnV0dG9uU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5tZXJnZShjbG9zZUJ0blN0ZWFtLCBleHBpcmVUaW1lU3RyZWFtKS50YWtlKDEpXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVtb3ZlKHRvYXN0T2JqLmlkKTtcbiAgICAgIH0pO1xuXG4gICAgdHJhbnNpdGlvbkluKHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgcmV0dXJuIHRvYXN0T2JqLmlkO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVG9hc3RPYmplY3QodGl0bGUsIG1lc3NhZ2UpIHtcbiAgICB2YXIgaWQgID0gJ2pzX190b2FzdC10b2FzdGl0ZW0tJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgaWQgICAgICAgICAgICAgICAgIDogaWQsXG4gICAgICAgICAgZWxlbWVudCAgICAgICAgICAgIDogX3RlbXBsYXRlLmFzRWxlbWVudCgnY29tcG9uZW50LS10b2FzdCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgZGVmYXVsdEJ1dHRvblN0cmVhbTogbnVsbFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShpZCkge1xuICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQoaWQpLFxuICAgICAgICB0b2FzdDtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgdG9hc3QgPSBfY2hpbGRyZW5baWR4XTtcbiAgICAgIHJlYXJyYW5nZShpZHgpO1xuICAgICAgdHJhbnNpdGlvbk91dCh0b2FzdC5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uSW4oZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAsIHthbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMSwge2FscGhhOiAxLCBlYXNlOiBRdWFkLmVhc2VPdXR9KTtcbiAgICByZWFycmFuZ2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25PdXQoZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuMjUsIHtcbiAgICAgIHJvdGF0aW9uWDogLTQ1LFxuICAgICAgYWxwaGEgICAgOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VJbiwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgICAgID0gZ2V0T2JqSW5kZXhCeUlEKGVsLmdldEF0dHJpYnV0ZSgnaWQnKSksXG4gICAgICAgIHRvYXN0T2JqICAgPSBfY2hpbGRyZW5baWR4XTtcblxuICAgIHRvYXN0T2JqLmRlZmF1bHRCdXR0b25TdHJlYW0uZGlzcG9zZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFycmFuZ2UoaWdub3JlKSB7XG4gICAgdmFyIGkgPSBfY2hpbGRyZW4ubGVuZ3RoIC0gMSxcbiAgICAgICAgY3VycmVudCxcbiAgICAgICAgeSA9IDA7XG5cbiAgICBmb3IgKDsgaSA+IC0xOyBpLS0pIHtcbiAgICAgIGlmIChpID09PSBpZ25vcmUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjdXJyZW50ID0gX2NoaWxkcmVuW2ldO1xuICAgICAgVHdlZW5MaXRlLnRvKGN1cnJlbnQuZWxlbWVudCwgMC43NSwge3k6IHksIGVhc2U6IEJvdW5jZS5lYXNlT3V0fSk7XG4gICAgICB5ICs9IDEwICsgY3VycmVudC5lbGVtZW50LmNsaWVudEhlaWdodDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvYXN0VmlldygpOyIsInZhciBUb29sVGlwVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2NoaWxkcmVuICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICA9IDAsXG4gICAgICBfZGVmYXVsdFdpZHRoID0gMjAwLFxuICAgICAgX3R5cGVzICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJyxcbiAgICAgICAgQ09BQ0hNQVJLICA6ICdjb2FjaG1hcmsnXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICd0b29sdGlwX19pbmZvcm1hdGlvbicsXG4gICAgICAgICdzdWNjZXNzJyAgICA6ICd0b29sdGlwX19zdWNjZXNzJyxcbiAgICAgICAgJ3dhcm5pbmcnICAgIDogJ3Rvb2x0aXBfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAndG9vbHRpcF9fZGFuZ2VyJyxcbiAgICAgICAgJ2NvYWNobWFyaycgIDogJ3Rvb2x0aXBfX2NvYWNobWFyaydcbiAgICAgIH0sXG4gICAgICBfcG9zaXRpb25zICAgID0ge1xuICAgICAgICBUIDogJ1QnLFxuICAgICAgICBUUjogJ1RSJyxcbiAgICAgICAgUiA6ICdSJyxcbiAgICAgICAgQlI6ICdCUicsXG4gICAgICAgIEIgOiAnQicsXG4gICAgICAgIEJMOiAnQkwnLFxuICAgICAgICBMIDogJ0wnLFxuICAgICAgICBUTDogJ1RMJ1xuICAgICAgfSxcbiAgICAgIF9wb3NpdGlvbk1hcCAgPSB7XG4gICAgICAgICdUJyA6ICd0b29sdGlwX190b3AnLFxuICAgICAgICAnVFInOiAndG9vbHRpcF9fdG9wcmlnaHQnLFxuICAgICAgICAnUicgOiAndG9vbHRpcF9fcmlnaHQnLFxuICAgICAgICAnQlInOiAndG9vbHRpcF9fYm90dG9tcmlnaHQnLFxuICAgICAgICAnQicgOiAndG9vbHRpcF9fYm90dG9tJyxcbiAgICAgICAgJ0JMJzogJ3Rvb2x0aXBfX2JvdHRvbWxlZnQnLFxuICAgICAgICAnTCcgOiAndG9vbHRpcF9fbGVmdCcsXG4gICAgICAgICdUTCc6ICd0b29sdGlwX190b3BsZWZ0J1xuICAgICAgfSxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX3RlbXBsYXRlICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8vb2JqLnRpdGxlLCBvYmouY29udGVudCwgb2JqLnR5cGUsIG9iai50YXJnZXQsIG9iai5wb3NpdGlvblxuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIGluaXRPYmoudHlwZSA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVDtcblxuICAgIHZhciB0b29sdGlwT2JqID0gY3JlYXRlVG9vbFRpcE9iamVjdChpbml0T2JqLnRpdGxlLFxuICAgICAgaW5pdE9iai5jb250ZW50LFxuICAgICAgaW5pdE9iai5wb3NpdGlvbixcbiAgICAgIGluaXRPYmoudGFyZ2V0RWwsXG4gICAgICBpbml0T2JqLmd1dHRlcixcbiAgICAgIGluaXRPYmouYWx3YXlzVmlzaWJsZSk7XG5cbiAgICBfY2hpbGRyZW4ucHVzaCh0b29sdGlwT2JqKTtcbiAgICBfbW91bnRQb2ludC5hcHBlbmRDaGlsZCh0b29sdGlwT2JqLmVsZW1lbnQpO1xuXG4gICAgdG9vbHRpcE9iai5hcnJvd0VsID0gdG9vbHRpcE9iai5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudChpbml0T2JqLnR5cGUsIGluaXRPYmoucG9zaXRpb24sIHRvb2x0aXBPYmouZWxlbWVudCk7XG5cbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouZWxlbWVudCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIGF1dG9BbHBoYTogdG9vbHRpcE9iai5hbHdheXNWaXNpYmxlID8gMSA6IDAsXG4gICAgICAgIHdpZHRoICAgIDogaW5pdE9iai53aWR0aCA/IGluaXRPYmoud2lkdGggOiBfZGVmYXVsdFdpZHRoXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBjYWNoZSB0aGVzZSB2YWx1ZXMsIDNkIHRyYW5zZm9ybXMgd2lsbCBhbHRlciBzaXplXG4gICAgdG9vbHRpcE9iai53aWR0aCAgPSB0b29sdGlwT2JqLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGg7XG4gICAgdG9vbHRpcE9iai5oZWlnaHQgPSB0b29sdGlwT2JqLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuXG4gICAgYXNzaWduRXZlbnRzVG9UYXJnZXRFbCh0b29sdGlwT2JqKTtcbiAgICBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaik7XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5MIHx8IHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuUikge1xuICAgICAgY2VudGVyQXJyb3dWZXJ0aWNhbGx5KHRvb2x0aXBPYmopO1xuICAgIH1cblxuICAgIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlQgfHwgdG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CKSB7XG4gICAgICBjZW50ZXJBcnJvd0hvcml6b250YWxseSh0b29sdGlwT2JqKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdG9vbHRpcE9iai5lbGVtZW50O1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIHBvc2l0aW9uLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3Bvc2l0aW9uTWFwW3Bvc2l0aW9uXSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVUb29sVGlwT2JqZWN0KHRpdGxlLCBtZXNzYWdlLCBwb3NpdGlvbiwgdGFyZ2V0LCBndXR0ZXIsIGFsd2F5c1Zpc2libGUpIHtcbiAgICB2YXIgaWQgID0gJ2pzX190b29sdGlwLXRvb2x0aXBpdGVtLScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGlkICAgICAgICAgICA6IGlkLFxuICAgICAgICAgIHBvc2l0aW9uICAgICA6IHBvc2l0aW9uLFxuICAgICAgICAgIHRhcmdldEVsICAgICA6IHRhcmdldCxcbiAgICAgICAgICBhbHdheXNWaXNpYmxlOiBhbHdheXNWaXNpYmxlIHx8IGZhbHNlLFxuICAgICAgICAgIGd1dHRlciAgICAgICA6IGd1dHRlciB8fCAxNSxcbiAgICAgICAgICBlbE92ZXJTdHJlYW0gOiBudWxsLFxuICAgICAgICAgIGVsT3V0U3RyZWFtICA6IG51bGwsXG4gICAgICAgICAgaGVpZ2h0ICAgICAgIDogMCxcbiAgICAgICAgICB3aWR0aCAgICAgICAgOiAwLFxuICAgICAgICAgIGVsZW1lbnQgICAgICA6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ2NvbXBvbmVudC0tdG9vbHRpcCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgYXJyb3dFbCAgICAgIDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnbkV2ZW50c1RvVGFyZ2V0RWwodG9vbHRpcE9iaikge1xuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0b29sdGlwT2JqLmVsT3ZlclN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW92ZXInKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHNob3dUb29sVGlwKHRvb2x0aXBPYmouaWQpO1xuICAgICAgfSk7XG5cbiAgICB0b29sdGlwT2JqLmVsT3V0U3RyZWFtID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQodG9vbHRpcE9iai50YXJnZXRFbCwgJ21vdXNlb3V0JylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBoaWRlVG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd1Rvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKTtcbiAgICB0cmFuc2l0aW9uSW4odG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGd1dHRlciAgID0gdG9vbHRpcE9iai5ndXR0ZXIsXG4gICAgICAgIHhQb3MgICAgID0gMCxcbiAgICAgICAgeVBvcyAgICAgPSAwLFxuICAgICAgICB0Z3RQcm9wcyA9IHRvb2x0aXBPYmoudGFyZ2V0RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0IC0gZ3V0dGVyO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0O1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCAtIHRvb2x0aXBPYmouaGVpZ2h0O1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5SKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQgKyBndXR0ZXI7XG4gICAgICB5UG9zID0gdGd0UHJvcHMudG9wICsgKCh0Z3RQcm9wcy5oZWlnaHQgLyAyKSAtICh0b29sdGlwT2JqLmhlaWdodCAvIDIpKTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQlIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0ICsgKCh0Z3RQcm9wcy53aWR0aCAvIDIpIC0gKHRvb2x0aXBPYmoud2lkdGggLyAyKSk7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tICsgZ3V0dGVyO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuTCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgLSB0b29sdGlwT2JqLndpZHRoIC0gZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfVxuXG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmVsZW1lbnQsIHtcbiAgICAgIHg6IHhQb3MsXG4gICAgICB5OiB5UG9zXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjZW50ZXJBcnJvd0hvcml6b250YWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt4OiAodG9vbHRpcE9iai53aWR0aCAvIDIpIC0gKGFycm93UHJvcHMud2lkdGggLyAyKX0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dWZXJ0aWNhbGx5KHRvb2x0aXBPYmopIHtcbiAgICB2YXIgYXJyb3dQcm9wcyA9IHRvb2x0aXBPYmouYXJyb3dFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouYXJyb3dFbCwge3k6ICh0b29sdGlwT2JqLmhlaWdodCAvIDIpIC0gKGFycm93UHJvcHMuaGVpZ2h0IC8gMikgLSAyfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlVG9vbFRpcChpZCkge1xuICAgIHZhciB0b29sdGlwT2JqID0gZ2V0T2JqQnlJRChpZCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJhbnNpdGlvbk91dCh0b29sdGlwT2JqLmVsZW1lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjA1LCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGVsKSB7XG4gICAgZ2V0T2JqQnlFbGVtZW50KGVsKS5mb3JFYWNoKGZ1bmN0aW9uICh0b29sdGlwKSB7XG4gICAgICBpZiAodG9vbHRpcC5lbE92ZXJTdHJlYW0pIHtcbiAgICAgICAgdG9vbHRpcC5lbE92ZXJTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuICAgICAgaWYgKHRvb2x0aXAuZWxPdXRTdHJlYW0pIHtcbiAgICAgICAgdG9vbHRpcC5lbE91dFN0cmVhbS5kaXNwb3NlKCk7XG4gICAgICB9XG5cbiAgICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8odG9vbHRpcC5lbGVtZW50KTtcblxuICAgICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQodG9vbHRpcC5lbGVtZW50KTtcblxuICAgICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRCh0b29sdGlwLmlkKTtcblxuICAgICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgICAgX2NoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqQnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkID09PSBpZDtcbiAgICB9KVswXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqQnlFbGVtZW50KGVsKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQudGFyZ2V0RWwgPT09IGVsO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBvc2l0aW9ucygpIHtcbiAgICByZXR1cm4gX3Bvc2l0aW9ucztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzLFxuICAgIHBvc2l0aW9uICA6IGdldFBvc2l0aW9uc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xUaXBWaWV3KCk7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgaXNJbnRlZ2VyOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuICgvXi0/XFxkKyQvLnRlc3Qoc3RyKSk7XG4gIH0sXG5cbiAgcm5kTnVtYmVyOiBmdW5jdGlvbiAobWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgfSxcblxuICBjbGFtcDogZnVuY3Rpb24gKHZhbCwgbWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHZhbCkpO1xuICB9LFxuXG4gIGluUmFuZ2U6IGZ1bmN0aW9uICh2YWwsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIHZhbCA+IG1pbiAmJiB2YWwgPCBtYXg7XG4gIH0sXG5cbiAgZGlzdGFuY2VUTDogZnVuY3Rpb24gKHBvaW50MSwgcG9pbnQyKSB7XG4gICAgdmFyIHhkID0gKHBvaW50Mi5sZWZ0IC0gcG9pbnQxLmxlZnQpLFxuICAgICAgICB5ZCA9IChwb2ludDIudG9wIC0gcG9pbnQxLnRvcCk7XG4gICAgcmV0dXJuIE1hdGguc3FydCgoeGQgKiB4ZCkgKyAoeWQgKiB5ZCkpO1xuICB9XG5cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIFRlc3QgZm9yXG4gICAqIE9iamVjdCB7XCJcIjogdW5kZWZpbmVkfVxuICAgKiBPYmplY3Qge3VuZGVmaW5lZDogdW5kZWZpbmVkfVxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgaXNOdWxsOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIGlzbnVsbCA9IGZhbHNlO1xuXG4gICAgaWYgKGlzLmZhbHNleShvYmopKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgaWYgKHByb3AgPT09IHVuZGVmaW5lZCB8fCBvYmpbcHJvcF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpc251bGwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzbnVsbDtcbiAgfSxcblxuICBkeW5hbWljU29ydDogZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYVtwcm9wZXJ0eV0gPCBiW3Byb3BlcnR5XSA/IC0xIDogYVtwcm9wZXJ0eV0gPiBiW3Byb3BlcnR5XSA/IDEgOiAwO1xuICAgIH07XG4gIH0sXG5cbiAgc2VhcmNoT2JqZWN0czogZnVuY3Rpb24gKG9iaiwga2V5LCB2YWwpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9ialtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgb2JqZWN0cyA9IG9iamVjdHMuY29uY2F0KHNlYXJjaE9iamVjdHMob2JqW2ldLCBrZXksIHZhbCkpO1xuICAgICAgfSBlbHNlIGlmIChpID09PSBrZXkgJiYgb2JqW2tleV0gPT09IHZhbCkge1xuICAgICAgICBvYmplY3RzLnB1c2gob2JqKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHM7XG4gIH0sXG5cbiAgZ2V0T2JqZWN0RnJvbVN0cmluZzogZnVuY3Rpb24gKG9iaiwgc3RyKSB7XG4gICAgdmFyIGkgICAgPSAwLFxuICAgICAgICBwYXRoID0gc3RyLnNwbGl0KCcuJyksXG4gICAgICAgIGxlbiAgPSBwYXRoLmxlbmd0aDtcblxuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG9iaiA9IG9ialtwYXRoW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICBnZXRPYmplY3RJbmRleEZyb21JZDogZnVuY3Rpb24gKG9iaiwgaWQpIHtcbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmpbaV0gIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIG9ialtpXS5pZCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBvYmpbaV0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vIGV4dGVuZCBhbmQgZGVlcCBleHRlbmQgZnJvbSBodHRwOi8veW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbS9cbiAgZXh0ZW5kOiBmdW5jdGlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHNbaV0uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIG91dFtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xuICB9LFxuXG4gIGRlZXBFeHRlbmQ6IGZ1bmN0aW9uIChvdXQpIHtcbiAgICBvdXQgPSBvdXQgfHwge307XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGFyZ3VtZW50c1tpXTtcblxuICAgICAgaWYgKCFvYmopIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBvYmpba2V5XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGRlZXBFeHRlbmQob3V0W2tleV0sIG9ialtrZXldKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uIG9mIFN0YW1wcyAtIGh0dHA6Ly9lcmljbGVhZHMuY29tLzIwMTQvMDIvcHJvdG90eXBhbC1pbmhlcml0YW5jZS13aXRoLXN0YW1wcy9cbiAgICogaHR0cHM6Ly93d3cuYmFya3dlYi5jby51ay9ibG9nL29iamVjdC1jb21wb3NpdGlvbi1hbmQtcHJvdG90eXBpY2FsLWluaGVyaXRhbmNlLWluLWphdmFzY3JpcHRcbiAgICpcbiAgICogUHJvdG90eXBlIG9iamVjdCByZXF1aXJlcyBhIG1ldGhvZHMgb2JqZWN0LCBwcml2YXRlIGNsb3N1cmVzIGFuZCBzdGF0ZSBpcyBvcHRpb25hbFxuICAgKlxuICAgKiBAcGFyYW0gcHJvdG90eXBlXG4gICAqIEByZXR1cm5zIE5ldyBvYmplY3QgdXNpbmcgcHJvdG90eXBlLm1ldGhvZHMgYXMgc291cmNlXG4gICAqL1xuICBiYXNpY0ZhY3Rvcnk6IGZ1bmN0aW9uIChwcm90b3R5cGUpIHtcbiAgICB2YXIgcHJvdG8gPSBwcm90b3R5cGUsXG4gICAgICAgIG9iaiAgID0gT2JqZWN0LmNyZWF0ZShwcm90by5tZXRob2RzKTtcblxuICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnY2xvc3VyZScpKSB7XG4gICAgICBwcm90by5jbG9zdXJlcy5mb3JFYWNoKGZ1bmN0aW9uIChjbG9zdXJlKSB7XG4gICAgICAgIGNsb3N1cmUuY2FsbChvYmopO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdzdGF0ZScpKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gcHJvdG8uc3RhdGUpIHtcbiAgICAgICAgb2JqW2tleV0gPSBwcm90by5zdGF0ZVtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAgICpcbiAgICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAgICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICAgKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAgICpcbiAgICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gICAqXG4gICAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAgICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICAgKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAgICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICAgKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAgICpcbiAgICovXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGFuIGVudW1lcmF0aW9uIHdpdGgga2V5cyBlcXVhbCB0byB0aGVpciB2YWx1ZS5cbiAgICpcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL1NUUk1ML2tleW1pcnJvclxuICAgKlxuICAgKiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogICB2YXIgQ09MT1JTID0ga2V5TWlycm9yKHtibHVlOiBudWxsLCByZWQ6IG51bGx9KTtcbiAgICogICB2YXIgbXlDb2xvciA9IENPTE9SUy5ibHVlO1xuICAgKiAgIHZhciBpc0NvbG9yVmFsaWQgPSAhIUNPTE9SU1tteUNvbG9yXTtcbiAgICpcbiAgICogVGhlIGxhc3QgbGluZSBjb3VsZCBub3QgYmUgcGVyZm9ybWVkIGlmIHRoZSB2YWx1ZXMgb2YgdGhlIGdlbmVyYXRlZCBlbnVtIHdlcmVcbiAgICogbm90IGVxdWFsIHRvIHRoZWlyIGtleXMuXG4gICAqXG4gICAqICAgSW5wdXQ6ICB7a2V5MTogdmFsMSwga2V5MjogdmFsMn1cbiAgICogICBPdXRwdXQ6IHtrZXkxOiBrZXkxLCBrZXkyOiBrZXkyfVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gICAqIEByZXR1cm4ge29iamVjdH1cbiAgICovXG4gIGtleU1pcnJvcjogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciByZXQgPSB7fTtcbiAgICB2YXIga2V5O1xuICAgIGlmICghKG9iaiBpbnN0YW5jZW9mIE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShvYmopKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdrZXlNaXJyb3IoLi4uKTogQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QuJyk7XG4gICAgfVxuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHJldFtrZXldID0ga2V5O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbn07IiwiLyoqXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiAgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiAgVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiAgTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiAgb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cbiFmdW5jdGlvbih0LGUpe1wib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlP21vZHVsZS5leHBvcnRzPWUoKTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKGUpOnQuSW1tdXRhYmxlPWUoKX0odGhpcyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCxlKXtlJiYodC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShlLnByb3RvdHlwZSkpLHQucHJvdG90eXBlLmNvbnN0cnVjdG9yPXR9ZnVuY3Rpb24gZSh0KXtyZXR1cm4gdC52YWx1ZT0hMSx0fWZ1bmN0aW9uIHIodCl7dCYmKHQudmFsdWU9ITApfWZ1bmN0aW9uIG4oKXt9ZnVuY3Rpb24gaSh0LGUpe2U9ZXx8MDtmb3IodmFyIHI9TWF0aC5tYXgoMCx0Lmxlbmd0aC1lKSxuPUFycmF5KHIpLGk9MDtyPmk7aSsrKW5baV09dFtpK2VdO3JldHVybiBufWZ1bmN0aW9uIG8odCl7cmV0dXJuIHZvaWQgMD09PXQuc2l6ZSYmKHQuc2l6ZT10Ll9faXRlcmF0ZShzKSksdC5zaXplfWZ1bmN0aW9uIHUodCxlKXtpZihcIm51bWJlclwiIT10eXBlb2YgZSl7dmFyIHI9ZT4+PjA7aWYoXCJcIityIT09ZXx8NDI5NDk2NzI5NT09PXIpcmV0dXJuIE5hTjtlPXJ9cmV0dXJuIDA+ZT9vKHQpK2U6ZX1mdW5jdGlvbiBzKCl7cmV0dXJuITB9ZnVuY3Rpb24gYSh0LGUscil7cmV0dXJuKDA9PT10fHx2b2lkIDAhPT1yJiYtcj49dCkmJih2b2lkIDA9PT1lfHx2b2lkIDAhPT1yJiZlPj1yKX1mdW5jdGlvbiBoKHQsZSl7cmV0dXJuIGModCxlLDApfWZ1bmN0aW9uIGYodCxlKXtyZXR1cm4gYyh0LGUsZSl9ZnVuY3Rpb24gYyh0LGUscil7cmV0dXJuIHZvaWQgMD09PXQ/cjowPnQ/TWF0aC5tYXgoMCxlK3QpOnZvaWQgMD09PWU/dDpNYXRoLm1pbihlLHQpfWZ1bmN0aW9uIF8odCl7cmV0dXJuIHkodCk/dDpPKHQpfWZ1bmN0aW9uIHAodCl7cmV0dXJuIGQodCk/dDp4KHQpfWZ1bmN0aW9uIHYodCl7cmV0dXJuIG0odCk/dDprKHQpfWZ1bmN0aW9uIGwodCl7cmV0dXJuIHkodCkmJiFnKHQpP3Q6QSh0KX1mdW5jdGlvbiB5KHQpe3JldHVybiEoIXR8fCF0W3ZyXSl9ZnVuY3Rpb24gZCh0KXtyZXR1cm4hKCF0fHwhdFtscl0pfWZ1bmN0aW9uIG0odCl7cmV0dXJuISghdHx8IXRbeXJdKX1mdW5jdGlvbiBnKHQpe3JldHVybiBkKHQpfHxtKHQpfWZ1bmN0aW9uIHcodCl7cmV0dXJuISghdHx8IXRbZHJdKX1mdW5jdGlvbiBTKHQpe3RoaXMubmV4dD10fWZ1bmN0aW9uIHoodCxlLHIsbil7dmFyIGk9MD09PXQ/ZToxPT09dD9yOltlLHJdO3JldHVybiBuP24udmFsdWU9aTpuPXt2YWx1ZTppLGRvbmU6ITF9LG59ZnVuY3Rpb24gSSgpe3JldHVybnt2YWx1ZTp2b2lkIDAsZG9uZTohMH19ZnVuY3Rpb24gYih0KXtyZXR1cm4hIU0odCl9ZnVuY3Rpb24gcSh0KXtyZXR1cm4gdCYmXCJmdW5jdGlvblwiPT10eXBlb2YgdC5uZXh0fWZ1bmN0aW9uIEQodCl7dmFyIGU9TSh0KTtyZXR1cm4gZSYmZS5jYWxsKHQpfWZ1bmN0aW9uIE0odCl7dmFyIGU9dCYmKFNyJiZ0W1NyXXx8dFt6cl0pO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIGU/ZTp2b2lkIDB9ZnVuY3Rpb24gRSh0KXtyZXR1cm4gdCYmXCJudW1iZXJcIj09dHlwZW9mIHQubGVuZ3RofWZ1bmN0aW9uIE8odCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP3QudG9TZXEoKTpDKHQpfWZ1bmN0aW9uIHgodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKS50b0tleWVkU2VxKCk6eSh0KT9kKHQpP3QudG9TZXEoKTp0LmZyb21FbnRyeVNlcSgpOlcodCl9ZnVuY3Rpb24gayh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/VCgpOnkodCk/ZCh0KT90LmVudHJ5U2VxKCk6dC50b0luZGV4ZWRTZXEoKTpCKHQpfWZ1bmN0aW9uIEEodCl7cmV0dXJuKG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP2QodCk/dC5lbnRyeVNlcSgpOnQ6Qih0KSkudG9TZXRTZXEoKX1mdW5jdGlvbiBqKHQpe3RoaXMuX2FycmF5PXQsdGhpcy5zaXplPXQubGVuZ3RofWZ1bmN0aW9uIFIodCl7dmFyIGU9T2JqZWN0LmtleXModCk7dGhpcy5fb2JqZWN0PXQsdGhpcy5fa2V5cz1lLFxuICB0aGlzLnNpemU9ZS5sZW5ndGh9ZnVuY3Rpb24gVSh0KXt0aGlzLl9pdGVyYWJsZT10LHRoaXMuc2l6ZT10Lmxlbmd0aHx8dC5zaXplfWZ1bmN0aW9uIEsodCl7dGhpcy5faXRlcmF0b3I9dCx0aGlzLl9pdGVyYXRvckNhY2hlPVtdfWZ1bmN0aW9uIEwodCl7cmV0dXJuISghdHx8IXRbYnJdKX1mdW5jdGlvbiBUKCl7cmV0dXJuIHFyfHwocXI9bmV3IGooW10pKX1mdW5jdGlvbiBXKHQpe3ZhciBlPUFycmF5LmlzQXJyYXkodCk/bmV3IGoodCkuZnJvbUVudHJ5U2VxKCk6cSh0KT9uZXcgSyh0KS5mcm9tRW50cnlTZXEoKTpiKHQpP25ldyBVKHQpLmZyb21FbnRyeVNlcSgpOlwib2JqZWN0XCI9PXR5cGVvZiB0P25ldyBSKHQpOnZvaWQgMDtpZighZSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgQXJyYXkgb3IgaXRlcmFibGUgb2JqZWN0IG9mIFtrLCB2XSBlbnRyaWVzLCBvciBrZXllZCBvYmplY3Q6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEIodCl7dmFyIGU9Sih0KTtpZighZSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgQXJyYXkgb3IgaXRlcmFibGUgb2JqZWN0IG9mIHZhbHVlczogXCIrdCk7cmV0dXJuIGV9ZnVuY3Rpb24gQyh0KXt2YXIgZT1KKHQpfHxcIm9iamVjdFwiPT10eXBlb2YgdCYmbmV3IFIodCk7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiB2YWx1ZXMsIG9yIGtleWVkIG9iamVjdDogXCIrdCk7cmV0dXJuIGV9ZnVuY3Rpb24gSih0KXtyZXR1cm4gRSh0KT9uZXcgaih0KTpxKHQpP25ldyBLKHQpOmIodCk/bmV3IFUodCk6dm9pZCAwfWZ1bmN0aW9uIE4odCxlLHIsbil7dmFyIGk9dC5fY2FjaGU7aWYoaSl7Zm9yKHZhciBvPWkubGVuZ3RoLTEsdT0wO28+PXU7dSsrKXt2YXIgcz1pW3I/by11OnVdO2lmKGUoc1sxXSxuP3NbMF06dSx0KT09PSExKXJldHVybiB1KzF9cmV0dXJuIHV9cmV0dXJuIHQuX19pdGVyYXRlVW5jYWNoZWQoZSxyKX1mdW5jdGlvbiBQKHQsZSxyLG4pe3ZhciBpPXQuX2NhY2hlO2lmKGkpe3ZhciBvPWkubGVuZ3RoLTEsdT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0PWlbcj9vLXU6dV07cmV0dXJuIHUrKz5vP0koKTp6KGUsbj90WzBdOnUtMSx0WzFdKX0pfXJldHVybiB0Ll9faXRlcmF0b3JVbmNhY2hlZChlLHIpfWZ1bmN0aW9uIEgoKXt0aHJvdyBUeXBlRXJyb3IoXCJBYnN0cmFjdFwiKX1mdW5jdGlvbiBWKCl7fWZ1bmN0aW9uIFkoKXt9ZnVuY3Rpb24gUSgpe31mdW5jdGlvbiBYKHQsZSl7aWYodD09PWV8fHQhPT10JiZlIT09ZSlyZXR1cm4hMDtpZighdHx8IWUpcmV0dXJuITE7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC52YWx1ZU9mJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBlLnZhbHVlT2Ype2lmKHQ9dC52YWx1ZU9mKCksZT1lLnZhbHVlT2YoKSx0PT09ZXx8dCE9PXQmJmUhPT1lKXJldHVybiEwO2lmKCF0fHwhZSlyZXR1cm4hMX1yZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmVxdWFscyYmXCJmdW5jdGlvblwiPT10eXBlb2YgZS5lcXVhbHMmJnQuZXF1YWxzKGUpPyEwOiExfWZ1bmN0aW9uIEYodCxlKXtyZXR1cm4gZT9HKGUsdCxcIlwiLHtcIlwiOnR9KTpaKHQpfWZ1bmN0aW9uIEcodCxlLHIsbil7cmV0dXJuIEFycmF5LmlzQXJyYXkoZSk/dC5jYWxsKG4scixrKGUpLm1hcChmdW5jdGlvbihyLG4pe3JldHVybiBHKHQscixuLGUpfSkpOiQoZSk/dC5jYWxsKG4scix4KGUpLm1hcChmdW5jdGlvbihyLG4pe3JldHVybiBHKHQscixuLGUpfSkpOmV9ZnVuY3Rpb24gWih0KXtyZXR1cm4gQXJyYXkuaXNBcnJheSh0KT9rKHQpLm1hcChaKS50b0xpc3QoKTokKHQpP3godCkubWFwKFopLnRvTWFwKCk6dH1mdW5jdGlvbiAkKHQpe3JldHVybiB0JiYodC5jb25zdHJ1Y3Rvcj09PU9iamVjdHx8dm9pZCAwPT09dC5jb25zdHJ1Y3Rvcil9ZnVuY3Rpb24gdHQodCl7cmV0dXJuIHQ+Pj4xJjEwNzM3NDE4MjR8MzIyMTIyNTQ3MSZ0fWZ1bmN0aW9uIGV0KHQpe2lmKHQ9PT0hMXx8bnVsbD09PXR8fHZvaWQgMD09PXQpcmV0dXJuIDA7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC52YWx1ZU9mJiYodD10LnZhbHVlT2YoKSxcbiAgdD09PSExfHxudWxsPT09dHx8dm9pZCAwPT09dCkpcmV0dXJuIDA7aWYodD09PSEwKXJldHVybiAxO3ZhciBlPXR5cGVvZiB0O2lmKFwibnVtYmVyXCI9PT1lKXt2YXIgcj0wfHQ7Zm9yKHIhPT10JiYocl49NDI5NDk2NzI5NSp0KTt0PjQyOTQ5NjcyOTU7KXQvPTQyOTQ5NjcyOTUscl49dDtyZXR1cm4gdHQocil9aWYoXCJzdHJpbmdcIj09PWUpcmV0dXJuIHQubGVuZ3RoPmpyP3J0KHQpOm50KHQpO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQuaGFzaENvZGUpcmV0dXJuIHQuaGFzaENvZGUoKTtpZihcIm9iamVjdFwiPT09ZSlyZXR1cm4gaXQodCk7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC50b1N0cmluZylyZXR1cm4gbnQoXCJcIit0KTt0aHJvdyBFcnJvcihcIlZhbHVlIHR5cGUgXCIrZStcIiBjYW5ub3QgYmUgaGFzaGVkLlwiKX1mdW5jdGlvbiBydCh0KXt2YXIgZT1Lclt0XTtyZXR1cm4gdm9pZCAwPT09ZSYmKGU9bnQodCksVXI9PT1SciYmKFVyPTAsS3I9e30pLFVyKyssS3JbdF09ZSksZX1mdW5jdGlvbiBudCh0KXtmb3IodmFyIGU9MCxyPTA7dC5sZW5ndGg+cjtyKyspZT0zMSplK3QuY2hhckNvZGVBdChyKXwwO3JldHVybiB0dChlKX1mdW5jdGlvbiBpdCh0KXt2YXIgZTtpZih4ciYmKGU9RHIuZ2V0KHQpLHZvaWQgMCE9PWUpKXJldHVybiBlO2lmKGU9dFtBcl0sdm9pZCAwIT09ZSlyZXR1cm4gZTtpZighT3Ipe2lmKGU9dC5wcm9wZXJ0eUlzRW51bWVyYWJsZSYmdC5wcm9wZXJ0eUlzRW51bWVyYWJsZVtBcl0sdm9pZCAwIT09ZSlyZXR1cm4gZTtpZihlPW90KHQpLHZvaWQgMCE9PWUpcmV0dXJuIGV9aWYoZT0rK2tyLDEwNzM3NDE4MjQma3ImJihrcj0wKSx4cilEci5zZXQodCxlKTtlbHNle2lmKHZvaWQgMCE9PUVyJiZFcih0KT09PSExKXRocm93IEVycm9yKFwiTm9uLWV4dGVuc2libGUgb2JqZWN0cyBhcmUgbm90IGFsbG93ZWQgYXMga2V5cy5cIik7aWYoT3IpT2JqZWN0LmRlZmluZVByb3BlcnR5KHQsQXIse2VudW1lcmFibGU6ITEsY29uZmlndXJhYmxlOiExLHdyaXRhYmxlOiExLHZhbHVlOmV9KTtlbHNlIGlmKHZvaWQgMCE9PXQucHJvcGVydHlJc0VudW1lcmFibGUmJnQucHJvcGVydHlJc0VudW1lcmFibGU9PT10LmNvbnN0cnVjdG9yLnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZSl0LnByb3BlcnR5SXNFbnVtZXJhYmxlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sdC5wcm9wZXJ0eUlzRW51bWVyYWJsZVtBcl09ZTtlbHNle2lmKHZvaWQgMD09PXQubm9kZVR5cGUpdGhyb3cgRXJyb3IoXCJVbmFibGUgdG8gc2V0IGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgb24gb2JqZWN0LlwiKTt0W0FyXT1lfX1yZXR1cm4gZX1mdW5jdGlvbiBvdCh0KXtpZih0JiZ0Lm5vZGVUeXBlPjApc3dpdGNoKHQubm9kZVR5cGUpe2Nhc2UgMTpyZXR1cm4gdC51bmlxdWVJRDtjYXNlIDk6cmV0dXJuIHQuZG9jdW1lbnRFbGVtZW50JiZ0LmRvY3VtZW50RWxlbWVudC51bmlxdWVJRH19ZnVuY3Rpb24gdXQodCxlKXtpZighdCl0aHJvdyBFcnJvcihlKX1mdW5jdGlvbiBzdCh0KXt1dCh0IT09MS8wLFwiQ2Fubm90IHBlcmZvcm0gdGhpcyBhY3Rpb24gd2l0aCBhbiBpbmZpbml0ZSBzaXplLlwiKX1mdW5jdGlvbiBhdCh0LGUpe3RoaXMuX2l0ZXI9dCx0aGlzLl91c2VLZXlzPWUsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBodCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBmdCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBjdCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBfdCh0KXt2YXIgZT1qdCh0KTtyZXR1cm4gZS5faXRlcj10LGUuc2l6ZT10LnNpemUsZS5mbGlwPWZ1bmN0aW9uKCl7cmV0dXJuIHR9LGUucmV2ZXJzZT1mdW5jdGlvbigpe3ZhciBlPXQucmV2ZXJzZS5hcHBseSh0aGlzKTtyZXR1cm4gZS5mbGlwPWZ1bmN0aW9uKCl7cmV0dXJuIHQucmV2ZXJzZSgpfSxlfSxlLmhhcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5pbmNsdWRlcyhlKTtcbn0sZS5pbmNsdWRlcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5oYXMoZSl9LGUuY2FjaGVSZXN1bHQ9UnQsZS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihlLHIpe3ZhciBuPXRoaXM7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUocix0LG4pIT09ITF9LHIpfSxlLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihlLHIpe2lmKGU9PT13cil7dmFyIG49dC5fX2l0ZXJhdG9yKGUscik7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHQ9bi5uZXh0KCk7aWYoIXQuZG9uZSl7dmFyIGU9dC52YWx1ZVswXTt0LnZhbHVlWzBdPXQudmFsdWVbMV0sdC52YWx1ZVsxXT1lfXJldHVybiB0fSl9cmV0dXJuIHQuX19pdGVyYXRvcihlPT09Z3I/bXI6Z3Iscil9LGV9ZnVuY3Rpb24gcHQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLnNpemU9dC5zaXplLG4uaGFzPWZ1bmN0aW9uKGUpe3JldHVybiB0LmhhcyhlKX0sbi5nZXQ9ZnVuY3Rpb24obixpKXt2YXIgbz10LmdldChuLGNyKTtyZXR1cm4gbz09PWNyP2k6ZS5jYWxsKHIsbyxuLHQpfSxuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpLHUpe3JldHVybiBuKGUuY2FsbChyLHQsaSx1KSxpLG8pIT09ITF9LGkpfSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuX19pdGVyYXRvcih3cixpKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgaT1vLm5leHQoKTtpZihpLmRvbmUpcmV0dXJuIGk7dmFyIHU9aS52YWx1ZSxzPXVbMF07cmV0dXJuIHoobixzLGUuY2FsbChyLHVbMV0scyx0KSxpKX0pfSxufWZ1bmN0aW9uIHZ0KHQsZSl7dmFyIHI9anQodCk7cmV0dXJuIHIuX2l0ZXI9dCxyLnNpemU9dC5zaXplLHIucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0fSx0LmZsaXAmJihyLmZsaXA9ZnVuY3Rpb24oKXt2YXIgZT1fdCh0KTtyZXR1cm4gZS5yZXZlcnNlPWZ1bmN0aW9uKCl7cmV0dXJuIHQuZmxpcCgpfSxlfSksci5nZXQ9ZnVuY3Rpb24ocixuKXtyZXR1cm4gdC5nZXQoZT9yOi0xLXIsbil9LHIuaGFzPWZ1bmN0aW9uKHIpe3JldHVybiB0LmhhcyhlP3I6LTEtcil9LHIuaW5jbHVkZXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9LHIuY2FjaGVSZXN1bHQ9UnQsci5fX2l0ZXJhdGU9ZnVuY3Rpb24oZSxyKXt2YXIgbj10aGlzO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBlKHQscixuKX0sIXIpfSxyLl9faXRlcmF0b3I9ZnVuY3Rpb24oZSxyKXtyZXR1cm4gdC5fX2l0ZXJhdG9yKGUsIXIpfSxyfWZ1bmN0aW9uIGx0KHQsZSxyLG4pe3ZhciBpPWp0KHQpO3JldHVybiBuJiYoaS5oYXM9ZnVuY3Rpb24obil7dmFyIGk9dC5nZXQobixjcik7cmV0dXJuIGkhPT1jciYmISFlLmNhbGwocixpLG4sdCl9LGkuZ2V0PWZ1bmN0aW9uKG4saSl7dmFyIG89dC5nZXQobixjcik7cmV0dXJuIG8hPT1jciYmZS5jYWxsKHIsbyxuLHQpP286aX0pLGkuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10aGlzLHM9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxvLGEpe3JldHVybiBlLmNhbGwocix0LG8sYSk/KHMrKyxpKHQsbj9vOnMtMSx1KSk6dm9pZCAwfSxvKSxzfSxpLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihpLG8pe3ZhciB1PXQuX19pdGVyYXRvcih3cixvKSxzPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7Zm9yKDs7KXt2YXIgbz11Lm5leHQoKTtpZihvLmRvbmUpcmV0dXJuIG87dmFyIGE9by52YWx1ZSxoPWFbMF0sZj1hWzFdO2lmKGUuY2FsbChyLGYsaCx0KSlyZXR1cm4geihpLG4/aDpzKyssZixvKX19KX0saX1mdW5jdGlvbiB5dCh0LGUscil7dmFyIG49THQoKS5hc011dGFibGUoKTtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24oaSxvKXtuLnVwZGF0ZShlLmNhbGwocixpLG8sdCksMCxmdW5jdGlvbih0KXtyZXR1cm4gdCsxfSl9KSxuLmFzSW1tdXRhYmxlKCl9ZnVuY3Rpb24gZHQodCxlLHIpe3ZhciBuPWQodCksaT0odyh0KT9JZSgpOkx0KCkpLmFzTXV0YWJsZSgpO1xuICB0Ll9faXRlcmF0ZShmdW5jdGlvbihvLHUpe2kudXBkYXRlKGUuY2FsbChyLG8sdSx0KSxmdW5jdGlvbih0KXtyZXR1cm4gdD10fHxbXSx0LnB1c2gobj9bdSxvXTpvKSx0fSl9KTt2YXIgbz1BdCh0KTtyZXR1cm4gaS5tYXAoZnVuY3Rpb24oZSl7cmV0dXJuIE90KHQsbyhlKSl9KX1mdW5jdGlvbiBtdCh0LGUscixuKXt2YXIgaT10LnNpemU7aWYodm9pZCAwIT09ZSYmKGU9MHxlKSx2b2lkIDAhPT1yJiYocj0wfHIpLGEoZSxyLGkpKXJldHVybiB0O3ZhciBvPWgoZSxpKSxzPWYocixpKTtpZihvIT09b3x8cyE9PXMpcmV0dXJuIG10KHQudG9TZXEoKS5jYWNoZVJlc3VsdCgpLGUscixuKTt2YXIgYyxfPXMtbztfPT09XyYmKGM9MD5fPzA6Xyk7dmFyIHA9anQodCk7cmV0dXJuIHAuc2l6ZT0wPT09Yz9jOnQuc2l6ZSYmY3x8dm9pZCAwLCFuJiZMKHQpJiZjPj0wJiYocC5nZXQ9ZnVuY3Rpb24oZSxyKXtyZXR1cm4gZT11KHRoaXMsZSksZT49MCYmYz5lP3QuZ2V0KGUrbyxyKTpyfSkscC5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihlLHIpe3ZhciBpPXRoaXM7aWYoMD09PWMpcmV0dXJuIDA7aWYocilyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShlLHIpO3ZhciB1PTAscz0hMCxhPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQscil7cmV0dXJuIHMmJihzPXUrKzxvKT92b2lkIDA6KGErKyxlKHQsbj9yOmEtMSxpKSE9PSExJiZhIT09Yyl9KSxhfSxwLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihlLHIpe2lmKDAhPT1jJiZyKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihlLHIpO3ZhciBpPTAhPT1jJiZ0Ll9faXRlcmF0b3IoZSxyKSx1PTAscz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7dSsrPG87KWkubmV4dCgpO2lmKCsrcz5jKXJldHVybiBJKCk7dmFyIHQ9aS5uZXh0KCk7cmV0dXJuIG58fGU9PT1ncj90OmU9PT1tcj96KGUscy0xLHZvaWQgMCx0KTp6KGUscy0xLHQudmFsdWVbMV0sdCl9KX0scH1mdW5jdGlvbiBndCh0LGUscil7dmFyIG49anQodCk7cmV0dXJuIG4uX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10aGlzO2lmKGkpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUobixpKTt2YXIgdT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LGkscyl7cmV0dXJuIGUuY2FsbChyLHQsaSxzKSYmKyt1JiZuKHQsaSxvKX0pLHV9LG4uX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztpZihpKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihuLGkpO3ZhciB1PXQuX19pdGVyYXRvcih3cixpKSxzPSEwO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2lmKCFzKXJldHVybiBJKCk7dmFyIHQ9dS5uZXh0KCk7aWYodC5kb25lKXJldHVybiB0O3ZhciBpPXQudmFsdWUsYT1pWzBdLGg9aVsxXTtyZXR1cm4gZS5jYWxsKHIsaCxhLG8pP249PT13cj90OnoobixhLGgsdCk6KHM9ITEsSSgpKX0pfSxufWZ1bmN0aW9uIHd0KHQsZSxyLG4pe3ZhciBpPWp0KHQpO3JldHVybiBpLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcztpZihvKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGksbyk7dmFyIHM9ITAsYT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LG8saCl7cmV0dXJuIHMmJihzPWUuY2FsbChyLHQsbyxoKSk/dm9pZCAwOihhKyssaSh0LG4/bzphLTEsdSkpfSksYX0saS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10aGlzO2lmKG8pcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKGksbyk7dmFyIHM9dC5fX2l0ZXJhdG9yKHdyLG8pLGE9ITAsaD0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0LG8sZjtkb3tpZih0PXMubmV4dCgpLHQuZG9uZSlyZXR1cm4gbnx8aT09PWdyP3Q6aT09PW1yP3ooaSxoKyssdm9pZCAwLHQpOnooaSxoKyssdC52YWx1ZVsxXSx0KTt2YXIgYz10LnZhbHVlO289Y1swXSxmPWNbMV0sYSYmKGE9ZS5jYWxsKHIsZixvLHUpKX13aGlsZShhKTtcbiAgcmV0dXJuIGk9PT13cj90OnooaSxvLGYsdCl9KX0saX1mdW5jdGlvbiBTdCh0LGUpe3ZhciByPWQodCksbj1bdF0uY29uY2F0KGUpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4geSh0KT9yJiYodD1wKHQpKTp0PXI/Vyh0KTpCKEFycmF5LmlzQXJyYXkodCk/dDpbdF0pLHR9KS5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIDAhPT10LnNpemV9KTtpZigwPT09bi5sZW5ndGgpcmV0dXJuIHQ7aWYoMT09PW4ubGVuZ3RoKXt2YXIgaT1uWzBdO2lmKGk9PT10fHxyJiZkKGkpfHxtKHQpJiZtKGkpKXJldHVybiBpfXZhciBvPW5ldyBqKG4pO3JldHVybiByP289by50b0tleWVkU2VxKCk6bSh0KXx8KG89by50b1NldFNlcSgpKSxvPW8uZmxhdHRlbighMCksby5zaXplPW4ucmVkdWNlKGZ1bmN0aW9uKHQsZSl7aWYodm9pZCAwIT09dCl7dmFyIHI9ZS5zaXplO2lmKHZvaWQgMCE9PXIpcmV0dXJuIHQrcn19LDApLG99ZnVuY3Rpb24genQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7ZnVuY3Rpb24gbyh0LGEpe3ZhciBoPXRoaXM7dC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpKXtyZXR1cm4oIWV8fGU+YSkmJnkodCk/byh0LGErMSk6bih0LHI/aTp1KyssaCk9PT0hMSYmKHM9ITApLCFzfSxpKX12YXIgdT0wLHM9ITE7cmV0dXJuIG8odCwwKSx1fSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuX19pdGVyYXRvcihuLGkpLHU9W10scz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7bzspe3ZhciB0PW8ubmV4dCgpO2lmKHQuZG9uZT09PSExKXt2YXIgYT10LnZhbHVlO2lmKG49PT13ciYmKGE9YVsxXSksZSYmIShlPnUubGVuZ3RoKXx8IXkoYSkpcmV0dXJuIHI/dDp6KG4scysrLGEsdCk7dS5wdXNoKG8pLG89YS5fX2l0ZXJhdG9yKG4saSl9ZWxzZSBvPXUucG9wKCl9cmV0dXJuIEkoKX0pfSxufWZ1bmN0aW9uIEl0KHQsZSxyKXt2YXIgbj1BdCh0KTtyZXR1cm4gdC50b1NlcSgpLm1hcChmdW5jdGlvbihpLG8pe3JldHVybiBuKGUuY2FsbChyLGksbyx0KSl9KS5mbGF0dGVuKCEwKX1mdW5jdGlvbiBidCh0LGUpe3ZhciByPWp0KHQpO3JldHVybiByLnNpemU9dC5zaXplJiYyKnQuc2l6ZS0xLHIuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24ocixuKXt2YXIgaT10aGlzLG89MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCl7cmV0dXJuKCFvfHxyKGUsbysrLGkpIT09ITEpJiZyKHQsbysrLGkpIT09ITF9LG4pLG99LHIuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHIsbil7dmFyIGksbz10Ll9faXRlcmF0b3IoZ3IsbiksdT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybighaXx8dSUyKSYmKGk9by5uZXh0KCksaS5kb25lKT9pOnUlMj96KHIsdSsrLGUpOnoocix1KyssaS52YWx1ZSxpKX0pfSxyfWZ1bmN0aW9uIHF0KHQsZSxyKXtlfHwoZT1VdCk7dmFyIG49ZCh0KSxpPTAsbz10LnRvU2VxKCkubWFwKGZ1bmN0aW9uKGUsbil7cmV0dXJuW24sZSxpKysscj9yKGUsbix0KTplXX0pLnRvQXJyYXkoKTtyZXR1cm4gby5zb3J0KGZ1bmN0aW9uKHQscil7cmV0dXJuIGUodFszXSxyWzNdKXx8dFsyXS1yWzJdfSkuZm9yRWFjaChuP2Z1bmN0aW9uKHQsZSl7b1tlXS5sZW5ndGg9Mn06ZnVuY3Rpb24odCxlKXtvW2VdPXRbMV19KSxuP3gobyk6bSh0KT9rKG8pOkEobyl9ZnVuY3Rpb24gRHQodCxlLHIpe2lmKGV8fChlPVV0KSxyKXt2YXIgbj10LnRvU2VxKCkubWFwKGZ1bmN0aW9uKGUsbil7cmV0dXJuW2UscihlLG4sdCldfSkucmVkdWNlKGZ1bmN0aW9uKHQscil7cmV0dXJuIE10KGUsdFsxXSxyWzFdKT9yOnR9KTtyZXR1cm4gbiYmblswXX1yZXR1cm4gdC5yZWR1Y2UoZnVuY3Rpb24odCxyKXtyZXR1cm4gTXQoZSx0LHIpP3I6dH0pfWZ1bmN0aW9uIE10KHQsZSxyKXt2YXIgbj10KHIsZSk7cmV0dXJuIDA9PT1uJiZyIT09ZSYmKHZvaWQgMD09PXJ8fG51bGw9PT1yfHxyIT09cil8fG4+MH1mdW5jdGlvbiBFdCh0LGUscil7dmFyIG49anQodCk7cmV0dXJuIG4uc2l6ZT1uZXcgaihyKS5tYXAoZnVuY3Rpb24odCl7XG4gIHJldHVybiB0LnNpemV9KS5taW4oKSxuLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPXRoaXMuX19pdGVyYXRvcihncixlKSxpPTA7IShyPW4ubmV4dCgpKS5kb25lJiZ0KHIudmFsdWUsaSsrLHRoaXMpIT09ITE7KTtyZXR1cm4gaX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxuKXt2YXIgaT1yLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdD1fKHQpLEQobj90LnJldmVyc2UoKTp0KX0pLG89MCx1PSExO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciByO3JldHVybiB1fHwocj1pLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdC5uZXh0KCl9KSx1PXIuc29tZShmdW5jdGlvbih0KXtyZXR1cm4gdC5kb25lfSkpLHU/SSgpOnoodCxvKyssZS5hcHBseShudWxsLHIubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0LnZhbHVlfSkpKX0pfSxufWZ1bmN0aW9uIE90KHQsZSl7cmV0dXJuIEwodCk/ZTp0LmNvbnN0cnVjdG9yKGUpfWZ1bmN0aW9uIHh0KHQpe2lmKHQhPT1PYmplY3QodCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIFtLLCBWXSB0dXBsZTogXCIrdCl9ZnVuY3Rpb24ga3QodCl7cmV0dXJuIHN0KHQuc2l6ZSksbyh0KX1mdW5jdGlvbiBBdCh0KXtyZXR1cm4gZCh0KT9wOm0odCk/djpsfWZ1bmN0aW9uIGp0KHQpe3JldHVybiBPYmplY3QuY3JlYXRlKChkKHQpP3g6bSh0KT9rOkEpLnByb3RvdHlwZSl9ZnVuY3Rpb24gUnQoKXtyZXR1cm4gdGhpcy5faXRlci5jYWNoZVJlc3VsdD8odGhpcy5faXRlci5jYWNoZVJlc3VsdCgpLHRoaXMuc2l6ZT10aGlzLl9pdGVyLnNpemUsdGhpcyk6Ty5wcm90b3R5cGUuY2FjaGVSZXN1bHQuY2FsbCh0aGlzKX1mdW5jdGlvbiBVdCh0LGUpe3JldHVybiB0PmU/MTplPnQ/LTE6MH1mdW5jdGlvbiBLdCh0KXt2YXIgZT1EKHQpO2lmKCFlKXtpZighRSh0KSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgaXRlcmFibGUgb3IgYXJyYXktbGlrZTogXCIrdCk7ZT1EKF8odCkpfXJldHVybiBlfWZ1bmN0aW9uIEx0KHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9RdCgpOlR0KHQpJiYhdyh0KT90OlF0KCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1wKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUuc2V0KHIsdCl9KX0pfWZ1bmN0aW9uIFR0KHQpe3JldHVybiEoIXR8fCF0W0xyXSl9ZnVuY3Rpb24gV3QodCxlKXt0aGlzLm93bmVySUQ9dCx0aGlzLmVudHJpZXM9ZX1mdW5jdGlvbiBCdCh0LGUscil7dGhpcy5vd25lcklEPXQsdGhpcy5iaXRtYXA9ZSx0aGlzLm5vZGVzPXJ9ZnVuY3Rpb24gQ3QodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMuY291bnQ9ZSx0aGlzLm5vZGVzPXJ9ZnVuY3Rpb24gSnQodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMua2V5SGFzaD1lLHRoaXMuZW50cmllcz1yfWZ1bmN0aW9uIE50KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmtleUhhc2g9ZSx0aGlzLmVudHJ5PXJ9ZnVuY3Rpb24gUHQodCxlLHIpe3RoaXMuX3R5cGU9ZSx0aGlzLl9yZXZlcnNlPXIsdGhpcy5fc3RhY2s9dC5fcm9vdCYmVnQodC5fcm9vdCl9ZnVuY3Rpb24gSHQodCxlKXtyZXR1cm4geih0LGVbMF0sZVsxXSl9ZnVuY3Rpb24gVnQodCxlKXtyZXR1cm57bm9kZTp0LGluZGV4OjAsX19wcmV2OmV9fWZ1bmN0aW9uIFl0KHQsZSxyLG4pe3ZhciBpPU9iamVjdC5jcmVhdGUoVHIpO3JldHVybiBpLnNpemU9dCxpLl9yb290PWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGkuX19hbHRlcmVkPSExLGl9ZnVuY3Rpb24gUXQoKXtyZXR1cm4gV3J8fChXcj1ZdCgwKSl9ZnVuY3Rpb24gWHQodCxyLG4pe3ZhciBpLG87aWYodC5fcm9vdCl7dmFyIHU9ZShfcikscz1lKHByKTtpZihpPUZ0KHQuX3Jvb3QsdC5fX293bmVySUQsMCx2b2lkIDAscixuLHUscyksIXMudmFsdWUpcmV0dXJuIHQ7bz10LnNpemUrKHUudmFsdWU/bj09PWNyPy0xOjE6MCl9ZWxzZXtpZihuPT09Y3IpcmV0dXJuIHQ7bz0xLGk9bmV3IFd0KHQuX19vd25lcklELFtbcixuXV0pfXJldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPW8sXG4gIHQuX3Jvb3Q9aSx0Ll9faGFzaD12b2lkIDAsdC5fX2FsdGVyZWQ9ITAsdCk6aT9ZdChvLGkpOlF0KCl9ZnVuY3Rpb24gRnQodCxlLG4saSxvLHUscyxhKXtyZXR1cm4gdD90LnVwZGF0ZShlLG4saSxvLHUscyxhKTp1PT09Y3I/dDoocihhKSxyKHMpLG5ldyBOdChlLGksW28sdV0pKX1mdW5jdGlvbiBHdCh0KXtyZXR1cm4gdC5jb25zdHJ1Y3Rvcj09PU50fHx0LmNvbnN0cnVjdG9yPT09SnR9ZnVuY3Rpb24gWnQodCxlLHIsbixpKXtpZih0LmtleUhhc2g9PT1uKXJldHVybiBuZXcgSnQoZSxuLFt0LmVudHJ5LGldKTt2YXIgbyx1PSgwPT09cj90LmtleUhhc2g6dC5rZXlIYXNoPj4+cikmZnIscz0oMD09PXI/bjpuPj4+cikmZnIsYT11PT09cz9bWnQodCxlLHIrYXIsbixpKV06KG89bmV3IE50KGUsbixpKSxzPnU/W3Qsb106W28sdF0pO3JldHVybiBuZXcgQnQoZSwxPDx1fDE8PHMsYSl9ZnVuY3Rpb24gJHQodCxlLHIsaSl7dHx8KHQ9bmV3IG4pO2Zvcih2YXIgbz1uZXcgTnQodCxldChyKSxbcixpXSksdT0wO2UubGVuZ3RoPnU7dSsrKXt2YXIgcz1lW3VdO289by51cGRhdGUodCwwLHZvaWQgMCxzWzBdLHNbMV0pfXJldHVybiBvfWZ1bmN0aW9uIHRlKHQsZSxyLG4pe2Zvcih2YXIgaT0wLG89MCx1PUFycmF5KHIpLHM9MCxhPTEsaD1lLmxlbmd0aDtoPnM7cysrLGE8PD0xKXt2YXIgZj1lW3NdO3ZvaWQgMCE9PWYmJnMhPT1uJiYoaXw9YSx1W28rK109Zil9cmV0dXJuIG5ldyBCdCh0LGksdSl9ZnVuY3Rpb24gZWUodCxlLHIsbixpKXtmb3IodmFyIG89MCx1PUFycmF5KGhyKSxzPTA7MCE9PXI7cysrLHI+Pj49MSl1W3NdPTEmcj9lW28rK106dm9pZCAwO3JldHVybiB1W25dPWksbmV3IEN0KHQsbysxLHUpfWZ1bmN0aW9uIHJlKHQsZSxyKXtmb3IodmFyIG49W10saT0wO3IubGVuZ3RoPmk7aSsrKXt2YXIgbz1yW2ldLHU9cChvKTt5KG8pfHwodT11Lm1hcChmdW5jdGlvbih0KXtyZXR1cm4gRih0KX0pKSxuLnB1c2godSl9cmV0dXJuIGllKHQsZSxuKX1mdW5jdGlvbiBuZSh0KXtyZXR1cm4gZnVuY3Rpb24oZSxyLG4pe3JldHVybiBlJiZlLm1lcmdlRGVlcFdpdGgmJnkocik/ZS5tZXJnZURlZXBXaXRoKHQscik6dD90KGUscixuKTpyfX1mdW5jdGlvbiBpZSh0LGUscil7cmV0dXJuIHI9ci5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIDAhPT10LnNpemV9KSwwPT09ci5sZW5ndGg/dDowIT09dC5zaXplfHx0Ll9fb3duZXJJRHx8MSE9PXIubGVuZ3RoP3Qud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXtmb3IodmFyIG49ZT9mdW5jdGlvbihyLG4pe3QudXBkYXRlKG4sY3IsZnVuY3Rpb24odCl7cmV0dXJuIHQ9PT1jcj9yOmUodCxyLG4pfSl9OmZ1bmN0aW9uKGUscil7dC5zZXQocixlKX0saT0wO3IubGVuZ3RoPmk7aSsrKXJbaV0uZm9yRWFjaChuKX0pOnQuY29uc3RydWN0b3IoclswXSl9ZnVuY3Rpb24gb2UodCxlLHIsbil7dmFyIGk9dD09PWNyLG89ZS5uZXh0KCk7aWYoby5kb25lKXt2YXIgdT1pP3I6dCxzPW4odSk7cmV0dXJuIHM9PT11P3Q6c311dChpfHx0JiZ0LnNldCxcImludmFsaWQga2V5UGF0aFwiKTt2YXIgYT1vLnZhbHVlLGg9aT9jcjp0LmdldChhLGNyKSxmPW9lKGgsZSxyLG4pO3JldHVybiBmPT09aD90OmY9PT1jcj90LnJlbW92ZShhKTooaT9RdCgpOnQpLnNldChhLGYpfWZ1bmN0aW9uIHVlKHQpe3JldHVybiB0LT10Pj4xJjE0MzE2NTU3NjUsdD0oODU4OTkzNDU5JnQpKyh0Pj4yJjg1ODk5MzQ1OSksdD10Kyh0Pj40KSYyNTI2NDUxMzUsdCs9dD4+OCx0Kz10Pj4xNiwxMjcmdH1mdW5jdGlvbiBzZSh0LGUscixuKXt2YXIgbz1uP3Q6aSh0KTtyZXR1cm4gb1tlXT1yLG99ZnVuY3Rpb24gYWUodCxlLHIsbil7dmFyIGk9dC5sZW5ndGgrMTtpZihuJiZlKzE9PT1pKXJldHVybiB0W2VdPXIsdDtmb3IodmFyIG89QXJyYXkoaSksdT0wLHM9MDtpPnM7cysrKXM9PT1lPyhvW3NdPXIsdT0tMSk6b1tzXT10W3MrdV07cmV0dXJuIG99ZnVuY3Rpb24gaGUodCxlLHIpe3ZhciBuPXQubGVuZ3RoLTE7aWYociYmZT09PW4pcmV0dXJuIHQucG9wKCksdDtmb3IodmFyIGk9QXJyYXkobiksbz0wLHU9MDtuPnU7dSsrKXU9PT1lJiYobz0xKSxcbiAgaVt1XT10W3Urb107cmV0dXJuIGl9ZnVuY3Rpb24gZmUodCl7dmFyIGU9bGUoKTtpZihudWxsPT09dHx8dm9pZCAwPT09dClyZXR1cm4gZTtpZihjZSh0KSlyZXR1cm4gdDt2YXIgcj12KHQpLG49ci5zaXplO3JldHVybiAwPT09bj9lOihzdChuKSxuPjAmJmhyPm4/dmUoMCxuLGFyLG51bGwsbmV3IF9lKHIudG9BcnJheSgpKSk6ZS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHQpe3Quc2V0U2l6ZShuKSxyLmZvckVhY2goZnVuY3Rpb24oZSxyKXtyZXR1cm4gdC5zZXQocixlKX0pfSkpfWZ1bmN0aW9uIGNlKHQpe3JldHVybiEoIXR8fCF0W05yXSl9ZnVuY3Rpb24gX2UodCxlKXt0aGlzLmFycmF5PXQsdGhpcy5vd25lcklEPWV9ZnVuY3Rpb24gcGUodCxlKXtmdW5jdGlvbiByKHQsZSxyKXtyZXR1cm4gMD09PWU/bih0LHIpOmkodCxlLHIpfWZ1bmN0aW9uIG4odCxyKXt2YXIgbj1yPT09cz9hJiZhLmFycmF5OnQmJnQuYXJyYXksaT1yPm8/MDpvLXIsaD11LXI7cmV0dXJuIGg+aHImJihoPWhyKSxmdW5jdGlvbigpe2lmKGk9PT1oKXJldHVybiBWcjt2YXIgdD1lPy0taDppKys7cmV0dXJuIG4mJm5bdF19fWZ1bmN0aW9uIGkodCxuLGkpe3ZhciBzLGE9dCYmdC5hcnJheSxoPWk+bz8wOm8taT4+bixmPSh1LWk+Pm4pKzE7cmV0dXJuIGY+aHImJihmPWhyKSxmdW5jdGlvbigpe2Zvcig7Oyl7aWYocyl7dmFyIHQ9cygpO2lmKHQhPT1WcilyZXR1cm4gdDtzPW51bGx9aWYoaD09PWYpcmV0dXJuIFZyO3ZhciBvPWU/LS1mOmgrKztzPXIoYSYmYVtvXSxuLWFyLGkrKG88PG4pKX19fXZhciBvPXQuX29yaWdpbix1PXQuX2NhcGFjaXR5LHM9emUodSksYT10Ll90YWlsO3JldHVybiByKHQuX3Jvb3QsdC5fbGV2ZWwsMCl9ZnVuY3Rpb24gdmUodCxlLHIsbixpLG8sdSl7dmFyIHM9T2JqZWN0LmNyZWF0ZShQcik7cmV0dXJuIHMuc2l6ZT1lLXQscy5fb3JpZ2luPXQscy5fY2FwYWNpdHk9ZSxzLl9sZXZlbD1yLHMuX3Jvb3Q9bixzLl90YWlsPWkscy5fX293bmVySUQ9byxzLl9faGFzaD11LHMuX19hbHRlcmVkPSExLHN9ZnVuY3Rpb24gbGUoKXtyZXR1cm4gSHJ8fChIcj12ZSgwLDAsYXIpKX1mdW5jdGlvbiB5ZSh0LHIsbil7aWYocj11KHQsciksciE9PXIpcmV0dXJuIHQ7aWYocj49dC5zaXplfHwwPnIpcmV0dXJuIHQud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXswPnI/d2UodCxyKS5zZXQoMCxuKTp3ZSh0LDAscisxKS5zZXQocixuKX0pO3IrPXQuX29yaWdpbjt2YXIgaT10Ll90YWlsLG89dC5fcm9vdCxzPWUocHIpO3JldHVybiByPj16ZSh0Ll9jYXBhY2l0eSk/aT1kZShpLHQuX19vd25lcklELDAscixuLHMpOm89ZGUobyx0Ll9fb3duZXJJRCx0Ll9sZXZlbCxyLG4scykscy52YWx1ZT90Ll9fb3duZXJJRD8odC5fcm9vdD1vLHQuX3RhaWw9aSx0Ll9faGFzaD12b2lkIDAsdC5fX2FsdGVyZWQ9ITAsdCk6dmUodC5fb3JpZ2luLHQuX2NhcGFjaXR5LHQuX2xldmVsLG8saSk6dH1mdW5jdGlvbiBkZSh0LGUsbixpLG8sdSl7dmFyIHM9aT4+Pm4mZnIsYT10JiZ0LmFycmF5Lmxlbmd0aD5zO2lmKCFhJiZ2b2lkIDA9PT1vKXJldHVybiB0O3ZhciBoO2lmKG4+MCl7dmFyIGY9dCYmdC5hcnJheVtzXSxjPWRlKGYsZSxuLWFyLGksbyx1KTtyZXR1cm4gYz09PWY/dDooaD1tZSh0LGUpLGguYXJyYXlbc109YyxoKX1yZXR1cm4gYSYmdC5hcnJheVtzXT09PW8/dDoocih1KSxoPW1lKHQsZSksdm9pZCAwPT09byYmcz09PWguYXJyYXkubGVuZ3RoLTE/aC5hcnJheS5wb3AoKTpoLmFycmF5W3NdPW8saCl9ZnVuY3Rpb24gbWUodCxlKXtyZXR1cm4gZSYmdCYmZT09PXQub3duZXJJRD90Om5ldyBfZSh0P3QuYXJyYXkuc2xpY2UoKTpbXSxlKX1mdW5jdGlvbiBnZSh0LGUpe2lmKGU+PXplKHQuX2NhcGFjaXR5KSlyZXR1cm4gdC5fdGFpbDtpZigxPDx0Ll9sZXZlbCthcj5lKXtmb3IodmFyIHI9dC5fcm9vdCxuPXQuX2xldmVsO3ImJm4+MDspcj1yLmFycmF5W2U+Pj5uJmZyXSxuLT1hcjtyZXR1cm4gcn19ZnVuY3Rpb24gd2UodCxlLHIpe3ZvaWQgMCE9PWUmJihlPTB8ZSksdm9pZCAwIT09ciYmKHI9MHxyKTt2YXIgaT10Ll9fb3duZXJJRHx8bmV3IG4sbz10Ll9vcmlnaW4sdT10Ll9jYXBhY2l0eSxzPW8rZSxhPXZvaWQgMD09PXI/dTowPnI/dStyOm8rcjtcbiAgaWYocz09PW8mJmE9PT11KXJldHVybiB0O2lmKHM+PWEpcmV0dXJuIHQuY2xlYXIoKTtmb3IodmFyIGg9dC5fbGV2ZWwsZj10Ll9yb290LGM9MDswPnMrYzspZj1uZXcgX2UoZiYmZi5hcnJheS5sZW5ndGg/W3ZvaWQgMCxmXTpbXSxpKSxoKz1hcixjKz0xPDxoO2MmJihzKz1jLG8rPWMsYSs9Yyx1Kz1jKTtmb3IodmFyIF89emUodSkscD16ZShhKTtwPj0xPDxoK2FyOylmPW5ldyBfZShmJiZmLmFycmF5Lmxlbmd0aD9bZl06W10saSksaCs9YXI7dmFyIHY9dC5fdGFpbCxsPV8+cD9nZSh0LGEtMSk6cD5fP25ldyBfZShbXSxpKTp2O2lmKHYmJnA+XyYmdT5zJiZ2LmFycmF5Lmxlbmd0aCl7Zj1tZShmLGkpO2Zvcih2YXIgeT1mLGQ9aDtkPmFyO2QtPWFyKXt2YXIgbT1fPj4+ZCZmcjt5PXkuYXJyYXlbbV09bWUoeS5hcnJheVttXSxpKX15LmFycmF5W18+Pj5hciZmcl09dn1pZih1PmEmJihsPWwmJmwucmVtb3ZlQWZ0ZXIoaSwwLGEpKSxzPj1wKXMtPXAsYS09cCxoPWFyLGY9bnVsbCxsPWwmJmwucmVtb3ZlQmVmb3JlKGksMCxzKTtlbHNlIGlmKHM+b3x8Xz5wKXtmb3IoYz0wO2Y7KXt2YXIgZz1zPj4+aCZmcjtpZihnIT09cD4+PmgmZnIpYnJlYWs7ZyYmKGMrPSgxPDxoKSpnKSxoLT1hcixmPWYuYXJyYXlbZ119ZiYmcz5vJiYoZj1mLnJlbW92ZUJlZm9yZShpLGgscy1jKSksZiYmXz5wJiYoZj1mLnJlbW92ZUFmdGVyKGksaCxwLWMpKSxjJiYocy09YyxhLT1jKX1yZXR1cm4gdC5fX293bmVySUQ/KHQuc2l6ZT1hLXMsdC5fb3JpZ2luPXMsdC5fY2FwYWNpdHk9YSx0Ll9sZXZlbD1oLHQuX3Jvb3Q9Zix0Ll90YWlsPWwsdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOnZlKHMsYSxoLGYsbCl9ZnVuY3Rpb24gU2UodCxlLHIpe2Zvcih2YXIgbj1bXSxpPTAsbz0wO3IubGVuZ3RoPm87bysrKXt2YXIgdT1yW29dLHM9dih1KTtzLnNpemU+aSYmKGk9cy5zaXplKSx5KHUpfHwocz1zLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gRih0KX0pKSxuLnB1c2gocyl9cmV0dXJuIGk+dC5zaXplJiYodD10LnNldFNpemUoaSkpLGllKHQsZSxuKX1mdW5jdGlvbiB6ZSh0KXtyZXR1cm4gaHI+dD8wOnQtMT4+PmFyPDxhcn1mdW5jdGlvbiBJZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/RGUoKTpiZSh0KT90OkRlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1wKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUuc2V0KHIsdCl9KX0pfWZ1bmN0aW9uIGJlKHQpe3JldHVybiBUdCh0KSYmdyh0KX1mdW5jdGlvbiBxZSh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKEllLnByb3RvdHlwZSk7cmV0dXJuIGkuc2l6ZT10P3Quc2l6ZTowLGkuX21hcD10LGkuX2xpc3Q9ZSxpLl9fb3duZXJJRD1yLGkuX19oYXNoPW4saX1mdW5jdGlvbiBEZSgpe3JldHVybiBZcnx8KFlyPXFlKFF0KCksbGUoKSkpfWZ1bmN0aW9uIE1lKHQsZSxyKXt2YXIgbixpLG89dC5fbWFwLHU9dC5fbGlzdCxzPW8uZ2V0KGUpLGE9dm9pZCAwIT09cztpZihyPT09Y3Ipe2lmKCFhKXJldHVybiB0O3Uuc2l6ZT49aHImJnUuc2l6ZT49MipvLnNpemU/KGk9dS5maWx0ZXIoZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwIT09dCYmcyE9PWV9KSxuPWkudG9LZXllZFNlcSgpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdFswXX0pLmZsaXAoKS50b01hcCgpLHQuX19vd25lcklEJiYobi5fX293bmVySUQ9aS5fX293bmVySUQ9dC5fX293bmVySUQpKToobj1vLnJlbW92ZShlKSxpPXM9PT11LnNpemUtMT91LnBvcCgpOnUuc2V0KHMsdm9pZCAwKSl9ZWxzZSBpZihhKXtpZihyPT09dS5nZXQocylbMV0pcmV0dXJuIHQ7bj1vLGk9dS5zZXQocyxbZSxyXSl9ZWxzZSBuPW8uc2V0KGUsdS5zaXplKSxpPXUuc2V0KHUuc2l6ZSxbZSxyXSk7cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9bi5zaXplLHQuX21hcD1uLHQuX2xpc3Q9aSx0Ll9faGFzaD12b2lkIDAsdCk6cWUobixpKX1mdW5jdGlvbiBFZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/a2UoKTpPZSh0KT90OmtlKCkudW5zaGlmdEFsbCh0KTtcbn1mdW5jdGlvbiBPZSh0KXtyZXR1cm4hKCF0fHwhdFtRcl0pfWZ1bmN0aW9uIHhlKHQsZSxyLG4pe3ZhciBpPU9iamVjdC5jcmVhdGUoWHIpO3JldHVybiBpLnNpemU9dCxpLl9oZWFkPWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGkuX19hbHRlcmVkPSExLGl9ZnVuY3Rpb24ga2UoKXtyZXR1cm4gRnJ8fChGcj14ZSgwKSl9ZnVuY3Rpb24gQWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0tlKCk6amUodCkmJiF3KHQpP3Q6S2UoKS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3ZhciByPWwodCk7c3Qoci5zaXplKSxyLmZvckVhY2goZnVuY3Rpb24odCl7cmV0dXJuIGUuYWRkKHQpfSl9KX1mdW5jdGlvbiBqZSh0KXtyZXR1cm4hKCF0fHwhdFtHcl0pfWZ1bmN0aW9uIFJlKHQsZSl7cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9ZS5zaXplLHQuX21hcD1lLHQpOmU9PT10Ll9tYXA/dDowPT09ZS5zaXplP3QuX19lbXB0eSgpOnQuX19tYWtlKGUpfWZ1bmN0aW9uIFVlKHQsZSl7dmFyIHI9T2JqZWN0LmNyZWF0ZShacik7cmV0dXJuIHIuc2l6ZT10P3Quc2l6ZTowLHIuX21hcD10LHIuX19vd25lcklEPWUscn1mdW5jdGlvbiBLZSgpe3JldHVybiAkcnx8KCRyPVVlKFF0KCkpKX1mdW5jdGlvbiBMZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/QmUoKTpUZSh0KT90OkJlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1sKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSl9ZnVuY3Rpb24gVGUodCl7cmV0dXJuIGplKHQpJiZ3KHQpfWZ1bmN0aW9uIFdlKHQsZSl7dmFyIHI9T2JqZWN0LmNyZWF0ZSh0bik7cmV0dXJuIHIuc2l6ZT10P3Quc2l6ZTowLHIuX21hcD10LHIuX19vd25lcklEPWUscn1mdW5jdGlvbiBCZSgpe3JldHVybiBlbnx8KGVuPVdlKERlKCkpKX1mdW5jdGlvbiBDZSh0LGUpe3ZhciByLG49ZnVuY3Rpb24obyl7aWYobyBpbnN0YW5jZW9mIG4pcmV0dXJuIG87aWYoISh0aGlzIGluc3RhbmNlb2YgbikpcmV0dXJuIG5ldyBuKG8pO2lmKCFyKXtyPSEwO3ZhciB1PU9iamVjdC5rZXlzKHQpO1BlKGksdSksaS5zaXplPXUubGVuZ3RoLGkuX25hbWU9ZSxpLl9rZXlzPXUsaS5fZGVmYXVsdFZhbHVlcz10fXRoaXMuX21hcD1MdChvKX0saT1uLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHJuKTtyZXR1cm4gaS5jb25zdHJ1Y3Rvcj1uLG59ZnVuY3Rpb24gSmUodCxlLHIpe3ZhciBuPU9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHQpKTtyZXR1cm4gbi5fbWFwPWUsbi5fX293bmVySUQ9cixufWZ1bmN0aW9uIE5lKHQpe3JldHVybiB0Ll9uYW1lfHx0LmNvbnN0cnVjdG9yLm5hbWV8fFwiUmVjb3JkXCJ9ZnVuY3Rpb24gUGUodCxlKXt0cnl7ZS5mb3JFYWNoKEhlLmJpbmQodm9pZCAwLHQpKX1jYXRjaChyKXt9fWZ1bmN0aW9uIEhlKHQsZSl7T2JqZWN0LmRlZmluZVByb3BlcnR5KHQsZSx7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0KGUpfSxzZXQ6ZnVuY3Rpb24odCl7dXQodGhpcy5fX293bmVySUQsXCJDYW5ub3Qgc2V0IG9uIGFuIGltbXV0YWJsZSByZWNvcmQuXCIpLHRoaXMuc2V0KGUsdCl9fSl9ZnVuY3Rpb24gVmUodCxlKXtpZih0PT09ZSlyZXR1cm4hMDtpZigheShlKXx8dm9pZCAwIT09dC5zaXplJiZ2b2lkIDAhPT1lLnNpemUmJnQuc2l6ZSE9PWUuc2l6ZXx8dm9pZCAwIT09dC5fX2hhc2gmJnZvaWQgMCE9PWUuX19oYXNoJiZ0Ll9faGFzaCE9PWUuX19oYXNofHxkKHQpIT09ZChlKXx8bSh0KSE9PW0oZSl8fHcodCkhPT13KGUpKXJldHVybiExO2lmKDA9PT10LnNpemUmJjA9PT1lLnNpemUpcmV0dXJuITA7dmFyIHI9IWcodCk7aWYodyh0KSl7dmFyIG49dC5lbnRyaWVzKCk7cmV0dXJuIGUuZXZlcnkoZnVuY3Rpb24odCxlKXt2YXIgaT1uLm5leHQoKS52YWx1ZTtyZXR1cm4gaSYmWChpWzFdLHQpJiYocnx8WChpWzBdLGUpKX0pJiZuLm5leHQoKS5kb25lfXZhciBpPSExO2lmKHZvaWQgMD09PXQuc2l6ZSlpZih2b2lkIDA9PT1lLnNpemUpXCJmdW5jdGlvblwiPT10eXBlb2YgdC5jYWNoZVJlc3VsdCYmdC5jYWNoZVJlc3VsdCgpO2Vsc2V7XG4gIGk9ITA7dmFyIG89dDt0PWUsZT1vfXZhciB1PSEwLHM9ZS5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxuKXtyZXR1cm4ocj90LmhhcyhlKTppP1goZSx0LmdldChuLGNyKSk6WCh0LmdldChuLGNyKSxlKSk/dm9pZCAwOih1PSExLCExKX0pO3JldHVybiB1JiZ0LnNpemU9PT1zfWZ1bmN0aW9uIFllKHQsZSxyKXtpZighKHRoaXMgaW5zdGFuY2VvZiBZZSkpcmV0dXJuIG5ldyBZZSh0LGUscik7aWYodXQoMCE9PXIsXCJDYW5ub3Qgc3RlcCBhIFJhbmdlIGJ5IDBcIiksdD10fHwwLHZvaWQgMD09PWUmJihlPTEvMCkscj12b2lkIDA9PT1yPzE6TWF0aC5hYnMociksdD5lJiYocj0tciksdGhpcy5fc3RhcnQ9dCx0aGlzLl9lbmQ9ZSx0aGlzLl9zdGVwPXIsdGhpcy5zaXplPU1hdGgubWF4KDAsTWF0aC5jZWlsKChlLXQpL3ItMSkrMSksMD09PXRoaXMuc2l6ZSl7aWYobm4pcmV0dXJuIG5uO25uPXRoaXN9fWZ1bmN0aW9uIFFlKHQsZSl7aWYoISh0aGlzIGluc3RhbmNlb2YgUWUpKXJldHVybiBuZXcgUWUodCxlKTtpZih0aGlzLl92YWx1ZT10LHRoaXMuc2l6ZT12b2lkIDA9PT1lPzEvMDpNYXRoLm1heCgwLGUpLDA9PT10aGlzLnNpemUpe2lmKG9uKXJldHVybiBvbjtvbj10aGlzfX1mdW5jdGlvbiBYZSh0LGUpe3ZhciByPWZ1bmN0aW9uKHIpe3QucHJvdG90eXBlW3JdPWVbcl19O3JldHVybiBPYmplY3Qua2V5cyhlKS5mb3JFYWNoKHIpLE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMmJk9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZSkuZm9yRWFjaChyKSx0fWZ1bmN0aW9uIEZlKHQsZSl7cmV0dXJuIGV9ZnVuY3Rpb24gR2UodCxlKXtyZXR1cm5bZSx0XX1mdW5jdGlvbiBaZSh0KXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4hdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWZ1bmN0aW9uICRlKHQpe3JldHVybiBmdW5jdGlvbigpe3JldHVybi10LmFwcGx5KHRoaXMsYXJndW1lbnRzKX19ZnVuY3Rpb24gdHIodCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/SlNPTi5zdHJpbmdpZnkodCk6dH1mdW5jdGlvbiBlcigpe3JldHVybiBpKGFyZ3VtZW50cyl9ZnVuY3Rpb24gcnIodCxlKXtyZXR1cm4gZT50PzE6dD5lPy0xOjB9ZnVuY3Rpb24gbnIodCl7aWYodC5zaXplPT09MS8wKXJldHVybiAwO3ZhciBlPXcodCkscj1kKHQpLG49ZT8xOjAsaT10Ll9faXRlcmF0ZShyP2U/ZnVuY3Rpb24odCxlKXtuPTMxKm4rb3IoZXQodCksZXQoZSkpfDB9OmZ1bmN0aW9uKHQsZSl7bj1uK29yKGV0KHQpLGV0KGUpKXwwfTplP2Z1bmN0aW9uKHQpe249MzEqbitldCh0KXwwfTpmdW5jdGlvbih0KXtuPW4rZXQodCl8MH0pO3JldHVybiBpcihpLG4pfWZ1bmN0aW9uIGlyKHQsZSl7cmV0dXJuIGU9TXIoZSwzNDMyOTE4MzUzKSxlPU1yKGU8PDE1fGU+Pj4tMTUsNDYxODQ1OTA3KSxlPU1yKGU8PDEzfGU+Pj4tMTMsNSksZT0oZSszODY0MjkyMTk2fDApXnQsZT1NcihlXmU+Pj4xNiwyMjQ2ODIyNTA3KSxlPU1yKGVeZT4+PjEzLDMyNjY0ODk5MDkpLGU9dHQoZV5lPj4+MTYpfWZ1bmN0aW9uIG9yKHQsZSl7cmV0dXJuIHReZSsyNjU0NDM1NzY5Kyh0PDw2KSsodD4+Mil8MH12YXIgdXI9QXJyYXkucHJvdG90eXBlLnNsaWNlLHNyPVwiZGVsZXRlXCIsYXI9NSxocj0xPDxhcixmcj1oci0xLGNyPXt9LF9yPXt2YWx1ZTohMX0scHI9e3ZhbHVlOiExfTt0KHAsXyksdCh2LF8pLHQobCxfKSxfLmlzSXRlcmFibGU9eSxfLmlzS2V5ZWQ9ZCxfLmlzSW5kZXhlZD1tLF8uaXNBc3NvY2lhdGl2ZT1nLF8uaXNPcmRlcmVkPXcsXy5LZXllZD1wLF8uSW5kZXhlZD12LF8uU2V0PWw7dmFyIHZyPVwiQEBfX0lNTVVUQUJMRV9JVEVSQUJMRV9fQEBcIixscj1cIkBAX19JTU1VVEFCTEVfS0VZRURfX0BAXCIseXI9XCJAQF9fSU1NVVRBQkxFX0lOREVYRURfX0BAXCIsZHI9XCJAQF9fSU1NVVRBQkxFX09SREVSRURfX0BAXCIsbXI9MCxncj0xLHdyPTIsU3I9XCJmdW5jdGlvblwiPT10eXBlb2YgU3ltYm9sJiZTeW1ib2wuaXRlcmF0b3IsenI9XCJAQGl0ZXJhdG9yXCIsSXI9U3J8fHpyO1MucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuXCJbSXRlcmF0b3JdXCJ9LFMuS0VZUz1tcixcbiAgUy5WQUxVRVM9Z3IsUy5FTlRSSUVTPXdyLFMucHJvdG90eXBlLmluc3BlY3Q9Uy5wcm90b3R5cGUudG9Tb3VyY2U9ZnVuY3Rpb24oKXtyZXR1cm5cIlwiK3RoaXN9LFMucHJvdG90eXBlW0lyXT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSx0KE8sXyksTy5vZj1mdW5jdGlvbigpe3JldHVybiBPKGFyZ3VtZW50cyl9LE8ucHJvdG90eXBlLnRvU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LE8ucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlNlcSB7XCIsXCJ9XCIpfSxPLnByb3RvdHlwZS5jYWNoZVJlc3VsdD1mdW5jdGlvbigpe3JldHVybiF0aGlzLl9jYWNoZSYmdGhpcy5fX2l0ZXJhdGVVbmNhY2hlZCYmKHRoaXMuX2NhY2hlPXRoaXMuZW50cnlTZXEoKS50b0FycmF5KCksdGhpcy5zaXplPXRoaXMuX2NhY2hlLmxlbmd0aCksdGhpc30sTy5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE4odGhpcyx0LGUsITApfSxPLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFAodGhpcyx0LGUsITApfSx0KHgsTykseC5wcm90b3R5cGUudG9LZXllZFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSx0KGssTyksay5vZj1mdW5jdGlvbigpe3JldHVybiBrKGFyZ3VtZW50cyl9LGsucHJvdG90eXBlLnRvSW5kZXhlZFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxrLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXEgW1wiLFwiXVwiKX0say5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE4odGhpcyx0LGUsITEpfSxrLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFAodGhpcyx0LGUsITEpfSx0KEEsTyksQS5vZj1mdW5jdGlvbigpe3JldHVybiBBKGFyZ3VtZW50cyl9LEEucHJvdG90eXBlLnRvU2V0U2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LE8uaXNTZXE9TCxPLktleWVkPXgsTy5TZXQ9QSxPLkluZGV4ZWQ9azt2YXIgYnI9XCJAQF9fSU1NVVRBQkxFX1NFUV9fQEBcIjtPLnByb3RvdHlwZVticl09ITAsdChqLGspLGoucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90aGlzLl9hcnJheVt1KHRoaXMsdCldOmV9LGoucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLl9hcnJheSxuPXIubGVuZ3RoLTEsaT0wO24+PWk7aSsrKWlmKHQocltlP24taTppXSxpLHRoaXMpPT09ITEpcmV0dXJuIGkrMTtyZXR1cm4gaX0sai5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2FycmF5LG49ci5sZW5ndGgtMSxpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7cmV0dXJuIGk+bj9JKCk6eih0LGkscltlP24taSsrOmkrK10pfSl9LHQoUix4KSxSLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwPT09ZXx8dGhpcy5oYXModCk/dGhpcy5fb2JqZWN0W3RdOmV9LFIucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fb2JqZWN0Lmhhc093blByb3BlcnR5KHQpfSxSLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5fb2JqZWN0LG49dGhpcy5fa2V5cyxpPW4ubGVuZ3RoLTEsbz0wO2k+PW87bysrKXt2YXIgdT1uW2U/aS1vOm9dO2lmKHQoclt1XSx1LHRoaXMpPT09ITEpcmV0dXJuIG8rMX1yZXR1cm4gb30sUi5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX29iamVjdCxuPXRoaXMuX2tleXMsaT1uLmxlbmd0aC0xLG89MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdT1uW2U/aS1vOm9dO3JldHVybiBvKys+aT9JKCk6eih0LHUsclt1XSl9KX0sUi5wcm90b3R5cGVbZHJdPSEwLHQoVSxrKSxVLnByb3RvdHlwZS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUodCxlKTt2YXIgcj10aGlzLl9pdGVyYWJsZSxuPUQociksaT0wO2lmKHEobikpZm9yKHZhciBvOyEobz1uLm5leHQoKSkuZG9uZSYmdChvLnZhbHVlLGkrKyx0aGlzKSE9PSExOyk7XG4gIHJldHVybiBpfSxVLnByb3RvdHlwZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXJhYmxlLG49RChyKTtpZighcShuKSlyZXR1cm4gbmV3IFMoSSk7dmFyIGk9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgZT1uLm5leHQoKTtyZXR1cm4gZS5kb25lP2U6eih0LGkrKyxlLnZhbHVlKX0pfSx0KEssayksSy5wcm90b3R5cGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKHQsZSk7Zm9yKHZhciByPXRoaXMuX2l0ZXJhdG9yLG49dGhpcy5faXRlcmF0b3JDYWNoZSxpPTA7bi5sZW5ndGg+aTspaWYodChuW2ldLGkrKyx0aGlzKT09PSExKXJldHVybiBpO2Zvcih2YXIgbzshKG89ci5uZXh0KCkpLmRvbmU7KXt2YXIgdT1vLnZhbHVlO2lmKG5baV09dSx0KHUsaSsrLHRoaXMpPT09ITEpYnJlYWt9cmV0dXJuIGl9LEsucHJvdG90eXBlLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHQsZSk7dmFyIHI9dGhpcy5faXRlcmF0b3Isbj10aGlzLl9pdGVyYXRvckNhY2hlLGk9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZihpPj1uLmxlbmd0aCl7dmFyIGU9ci5uZXh0KCk7aWYoZS5kb25lKXJldHVybiBlO25baV09ZS52YWx1ZX1yZXR1cm4geih0LGksbltpKytdKX0pfTt2YXIgcXI7dChILF8pLHQoVixIKSx0KFksSCksdChRLEgpLEguS2V5ZWQ9VixILkluZGV4ZWQ9WSxILlNldD1RO3ZhciBEcixNcj1cImZ1bmN0aW9uXCI9PXR5cGVvZiBNYXRoLmltdWwmJi0yPT09TWF0aC5pbXVsKDQyOTQ5NjcyOTUsMik/TWF0aC5pbXVsOmZ1bmN0aW9uKHQsZSl7dD0wfHQsZT0wfGU7dmFyIHI9NjU1MzUmdCxuPTY1NTM1JmU7cmV0dXJuIHIqbisoKHQ+Pj4xNikqbityKihlPj4+MTYpPDwxNj4+PjApfDB9LEVyPU9iamVjdC5pc0V4dGVuc2libGUsT3I9ZnVuY3Rpb24oKXt0cnl7cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSxcIkBcIix7fSksITB9Y2F0Y2godCl7cmV0dXJuITF9fSgpLHhyPVwiZnVuY3Rpb25cIj09dHlwZW9mIFdlYWtNYXA7eHImJihEcj1uZXcgV2Vha01hcCk7dmFyIGtyPTAsQXI9XCJfX2ltbXV0YWJsZWhhc2hfX1wiO1wiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmKEFyPVN5bWJvbChBcikpO3ZhciBqcj0xNixScj0yNTUsVXI9MCxLcj17fTt0KGF0LHgpLGF0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5faXRlci5nZXQodCxlKX0sYXQucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5oYXModCl9LGF0LnByb3RvdHlwZS52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9pdGVyLnZhbHVlU2VxKCl9LGF0LnByb3RvdHlwZS5yZXZlcnNlPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcyxlPXZ0KHRoaXMsITApO3JldHVybiB0aGlzLl91c2VLZXlzfHwoZS52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiB0Ll9pdGVyLnRvU2VxKCkucmV2ZXJzZSgpfSksZX0sYXQucHJvdG90eXBlLm1hcD1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj1wdCh0aGlzLHQsZSk7cmV0dXJuIHRoaXMuX3VzZUtleXN8fChuLnZhbHVlU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHIuX2l0ZXIudG9TZXEoKS5tYXAodCxlKX0pLG59LGF0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcixuPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKHRoaXMuX3VzZUtleXM/ZnVuY3Rpb24oZSxyKXtyZXR1cm4gdChlLHIsbil9OihyPWU/a3QodGhpcyk6MCxmdW5jdGlvbihpKXtyZXR1cm4gdChpLGU/LS1yOnIrKyxuKX0pLGUpfSxhdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe2lmKHRoaXMuX3VzZUtleXMpcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXIuX19pdGVyYXRvcihncixlKSxuPWU/a3QodGhpcyk6MDtcbiAgcmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGk9ci5uZXh0KCk7cmV0dXJuIGkuZG9uZT9pOnoodCxlPy0tbjpuKyssaS52YWx1ZSxpKX0pfSxhdC5wcm90b3R5cGVbZHJdPSEwLHQoaHQsayksaHQucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pdGVyLmluY2x1ZGVzKHQpfSxodC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiB0KGUsbisrLHIpfSxlKX0saHQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSksbj0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPXIubmV4dCgpO3JldHVybiBlLmRvbmU/ZTp6KHQsbisrLGUudmFsdWUsZSl9KX0sdChmdCxBKSxmdC5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pdGVyLmluY2x1ZGVzKHQpfSxmdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoZnVuY3Rpb24oZSl7cmV0dXJuIHQoZSxlLHIpfSxlKX0sZnQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9ci5uZXh0KCk7cmV0dXJuIGUuZG9uZT9lOnoodCxlLnZhbHVlLGUudmFsdWUsZSl9KX0sdChjdCx4KSxjdC5wcm90b3R5cGUuZW50cnlTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXRlci50b1NlcSgpfSxjdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoZnVuY3Rpb24oZSl7aWYoZSl7eHQoZSk7dmFyIG49eShlKTtyZXR1cm4gdChuP2UuZ2V0KDEpOmVbMV0sbj9lLmdldCgwKTplWzBdLHIpfX0sZSl9LGN0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7Oyl7dmFyIGU9ci5uZXh0KCk7aWYoZS5kb25lKXJldHVybiBlO3ZhciBuPWUudmFsdWU7aWYobil7eHQobik7dmFyIGk9eShuKTtyZXR1cm4geih0LGk/bi5nZXQoMCk6blswXSxpP24uZ2V0KDEpOm5bMV0sZSl9fX0pfSxodC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9YXQucHJvdG90eXBlLmNhY2hlUmVzdWx0PWZ0LnByb3RvdHlwZS5jYWNoZVJlc3VsdD1jdC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9UnQsdChMdCxWKSxMdC5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiTWFwIHtcIixcIn1cIil9LEx0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5fcm9vdD90aGlzLl9yb290LmdldCgwLHZvaWQgMCx0LGUpOmV9LEx0LnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gWHQodGhpcyx0LGUpfSxMdC5wcm90b3R5cGUuc2V0SW49ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy51cGRhdGVJbih0LGNyLGZ1bmN0aW9uKCl7cmV0dXJuIGV9KX0sTHQucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gWHQodGhpcyx0LGNyKX0sTHQucHJvdG90eXBlLmRlbGV0ZUluPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnVwZGF0ZUluKHQsZnVuY3Rpb24oKXtyZXR1cm4gY3J9KX0sTHQucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUscil7cmV0dXJuIDE9PT1hcmd1bWVudHMubGVuZ3RoP3QodGhpcyk6dGhpcy51cGRhdGVJbihbdF0sZSxyKX0sTHQucHJvdG90eXBlLnVwZGF0ZUluPWZ1bmN0aW9uKHQsZSxyKXtyfHwocj1lLGU9dm9pZCAwKTt2YXIgbj1vZSh0aGlzLEt0KHQpLGUscik7cmV0dXJuIG49PT1jcj92b2lkIDA6bn0sTHQucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5fcm9vdD1udWxsLFxuICB0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6UXQoKX0sTHQucHJvdG90eXBlLm1lcmdlPWZ1bmN0aW9uKCl7cmV0dXJuIHJlKHRoaXMsdm9pZCAwLGFyZ3VtZW50cyl9LEx0LnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHJlKHRoaXMsdCxlKX0sTHQucHJvdG90eXBlLm1lcmdlSW49ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxRdCgpLGZ1bmN0aW9uKHQpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQubWVyZ2U/dC5tZXJnZS5hcHBseSh0LGUpOmVbZS5sZW5ndGgtMV19KX0sTHQucHJvdG90eXBlLm1lcmdlRGVlcD1mdW5jdGlvbigpe3JldHVybiByZSh0aGlzLG5lKHZvaWQgMCksYXJndW1lbnRzKX0sTHQucHJvdG90eXBlLm1lcmdlRGVlcFdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHJlKHRoaXMsbmUodCksZSl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXBJbj1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gdGhpcy51cGRhdGVJbih0LFF0KCksZnVuY3Rpb24odCl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5tZXJnZURlZXA/dC5tZXJnZURlZXAuYXBwbHkodCxlKTplW2UubGVuZ3RoLTFdfSl9LEx0LnByb3RvdHlwZS5zb3J0PWZ1bmN0aW9uKHQpe3JldHVybiBJZShxdCh0aGlzLHQpKX0sTHQucHJvdG90eXBlLnNvcnRCeT1mdW5jdGlvbih0LGUpe3JldHVybiBJZShxdCh0aGlzLGUsdCkpfSxMdC5wcm90b3R5cGUud2l0aE11dGF0aW9ucz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmFzTXV0YWJsZSgpO3JldHVybiB0KGUpLGUud2FzQWx0ZXJlZCgpP2UuX19lbnN1cmVPd25lcih0aGlzLl9fb3duZXJJRCk6dGhpc30sTHQucHJvdG90eXBlLmFzTXV0YWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fb3duZXJJRD90aGlzOnRoaXMuX19lbnN1cmVPd25lcihuZXcgbil9LEx0LnByb3RvdHlwZS5hc0ltbXV0YWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fZW5zdXJlT3duZXIoKX0sTHQucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2FsdGVyZWR9LEx0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG5ldyBQdCh0aGlzLHQsZSl9LEx0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLG49MDtyZXR1cm4gdGhpcy5fcm9vdCYmdGhpcy5fcm9vdC5pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiBuKyssdChlWzFdLGVbMF0scil9LGUpLG59LEx0LnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe3JldHVybiB0PT09dGhpcy5fX293bmVySUQ/dGhpczp0P1l0KHRoaXMuc2l6ZSx0aGlzLl9yb290LHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX19hbHRlcmVkPSExLHRoaXMpfSxMdC5pc01hcD1UdDt2YXIgTHI9XCJAQF9fSU1NVVRBQkxFX01BUF9fQEBcIixUcj1MdC5wcm90b3R5cGU7VHJbTHJdPSEwLFRyW3NyXT1Uci5yZW1vdmUsVHIucmVtb3ZlSW49VHIuZGVsZXRlSW4sV3QucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtmb3IodmFyIGk9dGhpcy5lbnRyaWVzLG89MCx1PWkubGVuZ3RoO3U+bztvKyspaWYoWChyLGlbb11bMF0pKXJldHVybiBpW29dWzFdO3JldHVybiBufSxXdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLG8sdSxzLGEpe2Zvcih2YXIgaD11PT09Y3IsZj10aGlzLmVudHJpZXMsYz0wLF89Zi5sZW5ndGg7Xz5jJiYhWChvLGZbY11bMF0pO2MrKyk7dmFyIHA9Xz5jO2lmKHA/ZltjXVsxXT09PXU6aClyZXR1cm4gdGhpcztpZihyKGEpLChofHwhcCkmJnIocyksIWh8fDEhPT1mLmxlbmd0aCl7aWYoIXAmJiFoJiZmLmxlbmd0aD49QnIpcmV0dXJuICR0KHQsZixvLHUpO3ZhciB2PXQmJnQ9PT10aGlzLm93bmVySUQsbD12P2Y6aShmKTtyZXR1cm4gcD9oP2M9PT1fLTE/bC5wb3AoKTpsW2NdPWwucG9wKCk6bFtjXT1bbyx1XTpsLnB1c2goW28sdV0pLFxuICB2Pyh0aGlzLmVudHJpZXM9bCx0aGlzKTpuZXcgV3QodCxsKX19LEJ0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7dm9pZCAwPT09ZSYmKGU9ZXQocikpO3ZhciBpPTE8PCgoMD09PXQ/ZTplPj4+dCkmZnIpLG89dGhpcy5iaXRtYXA7cmV0dXJuIDA9PT0obyZpKT9uOnRoaXMubm9kZXNbdWUobyZpLTEpXS5nZXQodCthcixlLHIsbil9LEJ0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLHIsbixpLG8sdSl7dm9pZCAwPT09ciYmKHI9ZXQobikpO3ZhciBzPSgwPT09ZT9yOnI+Pj5lKSZmcixhPTE8PHMsaD10aGlzLmJpdG1hcCxmPTAhPT0oaCZhKTtpZighZiYmaT09PWNyKXJldHVybiB0aGlzO3ZhciBjPXVlKGgmYS0xKSxfPXRoaXMubm9kZXMscD1mP19bY106dm9pZCAwLHY9RnQocCx0LGUrYXIscixuLGksbyx1KTtpZih2PT09cClyZXR1cm4gdGhpcztpZighZiYmdiYmXy5sZW5ndGg+PUNyKXJldHVybiBlZSh0LF8saCxzLHYpO2lmKGYmJiF2JiYyPT09Xy5sZW5ndGgmJkd0KF9bMV5jXSkpcmV0dXJuIF9bMV5jXTtpZihmJiZ2JiYxPT09Xy5sZW5ndGgmJkd0KHYpKXJldHVybiB2O3ZhciBsPXQmJnQ9PT10aGlzLm93bmVySUQseT1mP3Y/aDpoXmE6aHxhLGQ9Zj92P3NlKF8sYyx2LGwpOmhlKF8sYyxsKTphZShfLGMsdixsKTtyZXR1cm4gbD8odGhpcy5iaXRtYXA9eSx0aGlzLm5vZGVzPWQsdGhpcyk6bmV3IEJ0KHQseSxkKX0sQ3QucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXt2b2lkIDA9PT1lJiYoZT1ldChyKSk7dmFyIGk9KDA9PT10P2U6ZT4+PnQpJmZyLG89dGhpcy5ub2Rlc1tpXTtyZXR1cm4gbz9vLmdldCh0K2FyLGUscixuKTpufSxDdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxyLG4saSxvLHUpe3ZvaWQgMD09PXImJihyPWV0KG4pKTt2YXIgcz0oMD09PWU/cjpyPj4+ZSkmZnIsYT1pPT09Y3IsaD10aGlzLm5vZGVzLGY9aFtzXTtpZihhJiYhZilyZXR1cm4gdGhpczt2YXIgYz1GdChmLHQsZSthcixyLG4saSxvLHUpO2lmKGM9PT1mKXJldHVybiB0aGlzO3ZhciBfPXRoaXMuY291bnQ7aWYoZil7aWYoIWMmJihfLS0sSnI+XykpcmV0dXJuIHRlKHQsaCxfLHMpfWVsc2UgXysrO3ZhciBwPXQmJnQ9PT10aGlzLm93bmVySUQsdj1zZShoLHMsYyxwKTtyZXR1cm4gcD8odGhpcy5jb3VudD1fLHRoaXMubm9kZXM9dix0aGlzKTpuZXcgQ3QodCxfLHYpfSxKdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe2Zvcih2YXIgaT10aGlzLmVudHJpZXMsbz0wLHU9aS5sZW5ndGg7dT5vO28rKylpZihYKHIsaVtvXVswXSkpcmV0dXJuIGlbb11bMV07cmV0dXJuIG59LEp0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLG4sbyx1LHMsYSl7dm9pZCAwPT09biYmKG49ZXQobykpO3ZhciBoPXU9PT1jcjtpZihuIT09dGhpcy5rZXlIYXNoKXJldHVybiBoP3RoaXM6KHIoYSkscihzKSxadCh0aGlzLHQsZSxuLFtvLHVdKSk7Zm9yKHZhciBmPXRoaXMuZW50cmllcyxjPTAsXz1mLmxlbmd0aDtfPmMmJiFYKG8sZltjXVswXSk7YysrKTt2YXIgcD1fPmM7aWYocD9mW2NdWzFdPT09dTpoKXJldHVybiB0aGlzO2lmKHIoYSksKGh8fCFwKSYmcihzKSxoJiYyPT09XylyZXR1cm4gbmV3IE50KHQsdGhpcy5rZXlIYXNoLGZbMV5jXSk7dmFyIHY9dCYmdD09PXRoaXMub3duZXJJRCxsPXY/ZjppKGYpO3JldHVybiBwP2g/Yz09PV8tMT9sLnBvcCgpOmxbY109bC5wb3AoKTpsW2NdPVtvLHVdOmwucHVzaChbbyx1XSksdj8odGhpcy5lbnRyaWVzPWwsdGhpcyk6bmV3IEp0KHQsdGhpcy5rZXlIYXNoLGwpfSxOdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe3JldHVybiBYKHIsdGhpcy5lbnRyeVswXSk/dGhpcy5lbnRyeVsxXTpufSxOdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLGksbyx1LHMpe3ZhciBhPW89PT1jcixoPVgoaSx0aGlzLmVudHJ5WzBdKTtyZXR1cm4oaD9vPT09dGhpcy5lbnRyeVsxXTphKT90aGlzOihyKHMpLGE/dm9pZCByKHUpOmg/dCYmdD09PXRoaXMub3duZXJJRD8odGhpcy5lbnRyeVsxXT1vLHRoaXMpOm5ldyBOdCh0LHRoaXMua2V5SGFzaCxbaSxvXSk6KHIodSksXG4gIFp0KHRoaXMsdCxlLGV0KGkpLFtpLG9dKSkpfSxXdC5wcm90b3R5cGUuaXRlcmF0ZT1KdC5wcm90b3R5cGUuaXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLmVudHJpZXMsbj0wLGk9ci5sZW5ndGgtMTtpPj1uO24rKylpZih0KHJbZT9pLW46bl0pPT09ITEpcmV0dXJuITF9LEJ0LnByb3RvdHlwZS5pdGVyYXRlPUN0LnByb3RvdHlwZS5pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMubm9kZXMsbj0wLGk9ci5sZW5ndGgtMTtpPj1uO24rKyl7dmFyIG89cltlP2ktbjpuXTtpZihvJiZvLml0ZXJhdGUodCxlKT09PSExKXJldHVybiExfX0sTnQucHJvdG90eXBlLml0ZXJhdGU9ZnVuY3Rpb24odCl7cmV0dXJuIHQodGhpcy5lbnRyeSl9LHQoUHQsUyksUHQucHJvdG90eXBlLm5leHQ9ZnVuY3Rpb24oKXtmb3IodmFyIHQ9dGhpcy5fdHlwZSxlPXRoaXMuX3N0YWNrO2U7KXt2YXIgcixuPWUubm9kZSxpPWUuaW5kZXgrKztpZihuLmVudHJ5KXtpZigwPT09aSlyZXR1cm4gSHQodCxuLmVudHJ5KX1lbHNlIGlmKG4uZW50cmllcyl7aWYocj1uLmVudHJpZXMubGVuZ3RoLTEscj49aSlyZXR1cm4gSHQodCxuLmVudHJpZXNbdGhpcy5fcmV2ZXJzZT9yLWk6aV0pfWVsc2UgaWYocj1uLm5vZGVzLmxlbmd0aC0xLHI+PWkpe3ZhciBvPW4ubm9kZXNbdGhpcy5fcmV2ZXJzZT9yLWk6aV07aWYobyl7aWYoby5lbnRyeSlyZXR1cm4gSHQodCxvLmVudHJ5KTtlPXRoaXMuX3N0YWNrPVZ0KG8sZSl9Y29udGludWV9ZT10aGlzLl9zdGFjaz10aGlzLl9zdGFjay5fX3ByZXZ9cmV0dXJuIEkoKX07dmFyIFdyLEJyPWhyLzQsQ3I9aHIvMixKcj1oci80O3QoZmUsWSksZmUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxmZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiTGlzdCBbXCIsXCJdXCIpfSxmZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7aWYodD11KHRoaXMsdCksdD49MCYmdGhpcy5zaXplPnQpe3QrPXRoaXMuX29yaWdpbjt2YXIgcj1nZSh0aGlzLHQpO3JldHVybiByJiZyLmFycmF5W3QmZnJdfXJldHVybiBlfSxmZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHllKHRoaXMsdCxlKX0sZmUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5oYXModCk/MD09PXQ/dGhpcy5zaGlmdCgpOnQ9PT10aGlzLnNpemUtMT90aGlzLnBvcCgpOnRoaXMuc3BsaWNlKHQsMSk6dGhpc30sZmUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPXRoaXMuX29yaWdpbj10aGlzLl9jYXBhY2l0eT0wLHRoaXMuX2xldmVsPWFyLHRoaXMuX3Jvb3Q9dGhpcy5fdGFpbD1udWxsLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTpsZSgpfSxmZS5wcm90b3R5cGUucHVzaD1mdW5jdGlvbigpe3ZhciB0PWFyZ3VtZW50cyxlPXRoaXMuc2l6ZTtyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe3dlKHIsMCxlK3QubGVuZ3RoKTtmb3IodmFyIG49MDt0Lmxlbmd0aD5uO24rKylyLnNldChlK24sdFtuXSl9KX0sZmUucHJvdG90eXBlLnBvcD1mdW5jdGlvbigpe3JldHVybiB3ZSh0aGlzLDAsLTEpfSxmZS5wcm90b3R5cGUudW5zaGlmdD1mdW5jdGlvbigpe3ZhciB0PWFyZ3VtZW50cztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3dlKGUsLXQubGVuZ3RoKTtmb3IodmFyIHI9MDt0Lmxlbmd0aD5yO3IrKyllLnNldChyLHRbcl0pfSl9LGZlLnByb3RvdHlwZS5zaGlmdD1mdW5jdGlvbigpe3JldHVybiB3ZSh0aGlzLDEpfSxmZS5wcm90b3R5cGUubWVyZ2U9ZnVuY3Rpb24oKXtyZXR1cm4gU2UodGhpcyx2b2lkIDAsYXJndW1lbnRzKX0sZmUucHJvdG90eXBlLm1lcmdlV2l0aD1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gU2UodGhpcyx0LGUpfSxmZS5wcm90b3R5cGUubWVyZ2VEZWVwPWZ1bmN0aW9uKCl7cmV0dXJuIFNlKHRoaXMsbmUodm9pZCAwKSxhcmd1bWVudHMpO1xufSxmZS5wcm90b3R5cGUubWVyZ2VEZWVwV2l0aD1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gU2UodGhpcyxuZSh0KSxlKX0sZmUucHJvdG90eXBlLnNldFNpemU9ZnVuY3Rpb24odCl7cmV0dXJuIHdlKHRoaXMsMCx0KX0sZmUucHJvdG90eXBlLnNsaWNlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5zaXplO3JldHVybiBhKHQsZSxyKT90aGlzOndlKHRoaXMsaCh0LHIpLGYoZSxyKSl9LGZlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9MCxuPXBlKHRoaXMsZSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9bigpO3JldHVybiBlPT09VnI/SSgpOnoodCxyKyssZSl9KX0sZmUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPTAsaT1wZSh0aGlzLGUpOyhyPWkoKSkhPT1WciYmdChyLG4rKyx0aGlzKSE9PSExOyk7cmV0dXJuIG59LGZlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe3JldHVybiB0PT09dGhpcy5fX293bmVySUQ/dGhpczp0P3ZlKHRoaXMuX29yaWdpbix0aGlzLl9jYXBhY2l0eSx0aGlzLl9sZXZlbCx0aGlzLl9yb290LHRoaXMuX3RhaWwsdCx0aGlzLl9faGFzaCk6KHRoaXMuX19vd25lcklEPXQsdGhpcyl9LGZlLmlzTGlzdD1jZTt2YXIgTnI9XCJAQF9fSU1NVVRBQkxFX0xJU1RfX0BAXCIsUHI9ZmUucHJvdG90eXBlO1ByW05yXT0hMCxQcltzcl09UHIucmVtb3ZlLFByLnNldEluPVRyLnNldEluLFByLmRlbGV0ZUluPVByLnJlbW92ZUluPVRyLnJlbW92ZUluLFByLnVwZGF0ZT1Uci51cGRhdGUsUHIudXBkYXRlSW49VHIudXBkYXRlSW4sUHIubWVyZ2VJbj1Uci5tZXJnZUluLFByLm1lcmdlRGVlcEluPVRyLm1lcmdlRGVlcEluLFByLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxQci5hc011dGFibGU9VHIuYXNNdXRhYmxlLFByLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLFByLndhc0FsdGVyZWQ9VHIud2FzQWx0ZXJlZCxfZS5wcm90b3R5cGUucmVtb3ZlQmVmb3JlPWZ1bmN0aW9uKHQsZSxyKXtpZihyPT09ZT8xPDxlOjA9PT10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gdGhpczt2YXIgbj1yPj4+ZSZmcjtpZihuPj10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gbmV3IF9lKFtdLHQpO3ZhciBpLG89MD09PW47aWYoZT4wKXt2YXIgdT10aGlzLmFycmF5W25dO2lmKGk9dSYmdS5yZW1vdmVCZWZvcmUodCxlLWFyLHIpLGk9PT11JiZvKXJldHVybiB0aGlzfWlmKG8mJiFpKXJldHVybiB0aGlzO3ZhciBzPW1lKHRoaXMsdCk7aWYoIW8pZm9yKHZhciBhPTA7bj5hO2ErKylzLmFycmF5W2FdPXZvaWQgMDtyZXR1cm4gaSYmKHMuYXJyYXlbbl09aSksc30sX2UucHJvdG90eXBlLnJlbW92ZUFmdGVyPWZ1bmN0aW9uKHQsZSxyKXtpZihyPT09KGU/MTw8ZTowKXx8MD09PXRoaXMuYXJyYXkubGVuZ3RoKXJldHVybiB0aGlzO3ZhciBuPXItMT4+PmUmZnI7aWYobj49dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIHRoaXM7dmFyIGk7aWYoZT4wKXt2YXIgbz10aGlzLmFycmF5W25dO2lmKGk9byYmby5yZW1vdmVBZnRlcih0LGUtYXIsciksaT09PW8mJm49PT10aGlzLmFycmF5Lmxlbmd0aC0xKXJldHVybiB0aGlzfXZhciB1PW1lKHRoaXMsdCk7cmV0dXJuIHUuYXJyYXkuc3BsaWNlKG4rMSksaSYmKHUuYXJyYXlbbl09aSksdX07dmFyIEhyLFZyPXt9O3QoSWUsTHQpLEllLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sSWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIk9yZGVyZWRNYXAge1wiLFwifVwiKX0sSWUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX21hcC5nZXQodCk7cmV0dXJuIHZvaWQgMCE9PXI/dGhpcy5fbGlzdC5nZXQocilbMV06ZX0sSWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5fbWFwLmNsZWFyKCksdGhpcy5fbGlzdC5jbGVhcigpLHRoaXMpOkRlKCk7XG59LEllLnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gTWUodGhpcyx0LGUpfSxJZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe3JldHVybiBNZSh0aGlzLHQsY3IpfSxJZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpfHx0aGlzLl9saXN0Lndhc0FsdGVyZWQoKX0sSWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2xpc3QuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiBlJiZ0KGVbMV0sZVswXSxyKX0sZSl9LEllLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2xpc3QuZnJvbUVudHJ5U2VxKCkuX19pdGVyYXRvcih0LGUpfSxJZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtpZih0PT09dGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXM7dmFyIGU9dGhpcy5fbWFwLl9fZW5zdXJlT3duZXIodCkscj10aGlzLl9saXN0Ll9fZW5zdXJlT3duZXIodCk7cmV0dXJuIHQ/cWUoZSxyLHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX21hcD1lLHRoaXMuX2xpc3Q9cix0aGlzKX0sSWUuaXNPcmRlcmVkTWFwPWJlLEllLnByb3RvdHlwZVtkcl09ITAsSWUucHJvdG90eXBlW3NyXT1JZS5wcm90b3R5cGUucmVtb3ZlO3ZhciBZcjt0KEVlLFkpLEVlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlN0YWNrIFtcIixcIl1cIil9LEVlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9oZWFkO2Zvcih0PXUodGhpcyx0KTtyJiZ0LS07KXI9ci5uZXh0O3JldHVybiByP3IudmFsdWU6ZX0sRWUucHJvdG90eXBlLnBlZWs9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faGVhZCYmdGhpcy5faGVhZC52YWx1ZX0sRWUucHJvdG90eXBlLnB1c2g9ZnVuY3Rpb24oKXtpZigwPT09YXJndW1lbnRzLmxlbmd0aClyZXR1cm4gdGhpcztmb3IodmFyIHQ9dGhpcy5zaXplK2FyZ3VtZW50cy5sZW5ndGgsZT10aGlzLl9oZWFkLHI9YXJndW1lbnRzLmxlbmd0aC0xO3I+PTA7ci0tKWU9e3ZhbHVlOmFyZ3VtZW50c1tyXSxuZXh0OmV9O3JldHVybiB0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPXQsdGhpcy5faGVhZD1lLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZSh0LGUpfSxFZS5wcm90b3R5cGUucHVzaEFsbD1mdW5jdGlvbih0KXtpZih0PXYodCksMD09PXQuc2l6ZSlyZXR1cm4gdGhpcztzdCh0LnNpemUpO3ZhciBlPXRoaXMuc2l6ZSxyPXRoaXMuX2hlYWQ7cmV0dXJuIHQucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24odCl7ZSsrLHI9e3ZhbHVlOnQsbmV4dDpyfX0pLHRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9ZSx0aGlzLl9oZWFkPXIsdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOnhlKGUscil9LEVlLnByb3RvdHlwZS5wb3A9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zbGljZSgxKX0sRWUucHJvdG90eXBlLnVuc2hpZnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wdXNoLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLnVuc2hpZnRBbGw9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMucHVzaEFsbCh0KX0sRWUucHJvdG90eXBlLnNoaWZ0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucG9wLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5faGVhZD12b2lkIDAsdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOmtlKCl9LEVlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe2lmKGEodCxlLHRoaXMuc2l6ZSkpcmV0dXJuIHRoaXM7dmFyIHI9aCh0LHRoaXMuc2l6ZSksbj1mKGUsdGhpcy5zaXplKTtpZihuIT09dGhpcy5zaXplKXJldHVybiBZLnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMsdCxlKTtcbiAgZm9yKHZhciBpPXRoaXMuc2l6ZS1yLG89dGhpcy5faGVhZDtyLS07KW89by5uZXh0O3JldHVybiB0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPWksdGhpcy5faGVhZD1vLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZShpLG8pfSxFZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD94ZSh0aGlzLnNpemUsdGhpcy5faGVhZCx0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9fYWx0ZXJlZD0hMSx0aGlzKX0sRWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMucmV2ZXJzZSgpLl9faXRlcmF0ZSh0KTtmb3IodmFyIHI9MCxuPXRoaXMuX2hlYWQ7biYmdChuLnZhbHVlLHIrKyx0aGlzKSE9PSExOyluPW4ubmV4dDtyZXR1cm4gcn0sRWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLnJldmVyc2UoKS5fX2l0ZXJhdG9yKHQpO3ZhciByPTAsbj10aGlzLl9oZWFkO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2lmKG4pe3ZhciBlPW4udmFsdWU7cmV0dXJuIG49bi5uZXh0LHoodCxyKyssZSl9cmV0dXJuIEkoKX0pfSxFZS5pc1N0YWNrPU9lO3ZhciBRcj1cIkBAX19JTU1VVEFCTEVfU1RBQ0tfX0BAXCIsWHI9RWUucHJvdG90eXBlO1hyW1FyXT0hMCxYci53aXRoTXV0YXRpb25zPVRyLndpdGhNdXRhdGlvbnMsWHIuYXNNdXRhYmxlPVRyLmFzTXV0YWJsZSxYci5hc0ltbXV0YWJsZT1Uci5hc0ltbXV0YWJsZSxYci53YXNBbHRlcmVkPVRyLndhc0FsdGVyZWQ7dmFyIEZyO3QoQWUsUSksQWUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxBZS5mcm9tS2V5cz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcyhwKHQpLmtleVNlcSgpKX0sQWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlNldCB7XCIsXCJ9XCIpfSxBZS5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9tYXAuaGFzKHQpfSxBZS5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKHQpe3JldHVybiBSZSh0aGlzLHRoaXMuX21hcC5zZXQodCwhMCkpfSxBZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe3JldHVybiBSZSh0aGlzLHRoaXMuX21hcC5yZW1vdmUodCkpfSxBZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAuY2xlYXIoKSl9LEFlLnByb3RvdHlwZS51bmlvbj1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO3JldHVybiB0PXQuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSksMD09PXQubGVuZ3RoP3RoaXM6MCE9PXRoaXMuc2l6ZXx8dGhpcy5fX293bmVySUR8fDEhPT10Lmxlbmd0aD90aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7Zm9yKHZhciByPTA7dC5sZW5ndGg+cjtyKyspbCh0W3JdKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSk6dGhpcy5jb25zdHJ1Y3Rvcih0WzBdKX0sQWUucHJvdG90eXBlLmludGVyc2VjdD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO2lmKDA9PT10Lmxlbmd0aClyZXR1cm4gdGhpczt0PXQubWFwKGZ1bmN0aW9uKHQpe3JldHVybiBsKHQpfSk7dmFyIGU9dGhpcztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe2UuZm9yRWFjaChmdW5jdGlvbihlKXt0LmV2ZXJ5KGZ1bmN0aW9uKHQpe3JldHVybiB0LmluY2x1ZGVzKGUpfSl8fHIucmVtb3ZlKGUpfSl9KX0sQWUucHJvdG90eXBlLnN1YnRyYWN0PWZ1bmN0aW9uKCl7dmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMCk7aWYoMD09PXQubGVuZ3RoKXJldHVybiB0aGlzO3Q9dC5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIGwodCl9KTt2YXIgZT10aGlzO3JldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24ocil7ZS5mb3JFYWNoKGZ1bmN0aW9uKGUpe3Quc29tZShmdW5jdGlvbih0KXtyZXR1cm4gdC5pbmNsdWRlcyhlKX0pJiZyLnJlbW92ZShlKTtcbn0pfSl9LEFlLnByb3RvdHlwZS5tZXJnZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaW9uLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sQWUucHJvdG90eXBlLm1lcmdlV2l0aD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiB0aGlzLnVuaW9uLmFwcGx5KHRoaXMsdCl9LEFlLnByb3RvdHlwZS5zb3J0PWZ1bmN0aW9uKHQpe3JldHVybiBMZShxdCh0aGlzLHQpKX0sQWUucHJvdG90eXBlLnNvcnRCeT1mdW5jdGlvbih0LGUpe3JldHVybiBMZShxdCh0aGlzLGUsdCkpfSxBZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpfSxBZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5fbWFwLl9faXRlcmF0ZShmdW5jdGlvbihlLG4pe3JldHVybiB0KG4sbixyKX0sZSl9LEFlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX21hcC5tYXAoZnVuY3Rpb24odCxlKXtyZXR1cm4gZX0pLl9faXRlcmF0b3IodCxlKX0sQWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7aWYodD09PXRoaXMuX19vd25lcklEKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P3RoaXMuX19tYWtlKGUsdCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fbWFwPWUsdGhpcyl9LEFlLmlzU2V0PWplO3ZhciBHcj1cIkBAX19JTU1VVEFCTEVfU0VUX19AQFwiLFpyPUFlLnByb3RvdHlwZTtacltHcl09ITAsWnJbc3JdPVpyLnJlbW92ZSxaci5tZXJnZURlZXA9WnIubWVyZ2UsWnIubWVyZ2VEZWVwV2l0aD1aci5tZXJnZVdpdGgsWnIud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLFpyLmFzTXV0YWJsZT1Uci5hc011dGFibGUsWnIuYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsWnIuX19lbXB0eT1LZSxaci5fX21ha2U9VWU7dmFyICRyO3QoTGUsQWUpLExlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sTGUuZnJvbUtleXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMocCh0KS5rZXlTZXEoKSl9LExlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJPcmRlcmVkU2V0IHtcIixcIn1cIil9LExlLmlzT3JkZXJlZFNldD1UZTt2YXIgdG49TGUucHJvdG90eXBlO3RuW2RyXT0hMCx0bi5fX2VtcHR5PUJlLHRuLl9fbWFrZT1XZTt2YXIgZW47dChDZSxWKSxDZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKE5lKHRoaXMpK1wiIHtcIixcIn1cIil9LENlLnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2RlZmF1bHRWYWx1ZXMuaGFzT3duUHJvcGVydHkodCl9LENlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtpZighdGhpcy5oYXModCkpcmV0dXJuIGU7dmFyIHI9dGhpcy5fZGVmYXVsdFZhbHVlc1t0XTtyZXR1cm4gdGhpcy5fbWFwP3RoaXMuX21hcC5nZXQodCxyKTpyfSxDZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtpZih0aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpcy5fbWFwJiZ0aGlzLl9tYXAuY2xlYXIoKSx0aGlzO3ZhciB0PXRoaXMuY29uc3RydWN0b3I7cmV0dXJuIHQuX2VtcHR5fHwodC5fZW1wdHk9SmUodGhpcyxRdCgpKSl9LENlLnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtpZighdGhpcy5oYXModCkpdGhyb3cgRXJyb3IoJ0Nhbm5vdCBzZXQgdW5rbm93biBrZXkgXCInK3QrJ1wiIG9uICcrTmUodGhpcykpO3ZhciByPXRoaXMuX21hcCYmdGhpcy5fbWFwLnNldCh0LGUpO3JldHVybiB0aGlzLl9fb3duZXJJRHx8cj09PXRoaXMuX21hcD90aGlzOkplKHRoaXMscil9LENlLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7aWYoIXRoaXMuaGFzKHQpKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcCYmdGhpcy5fbWFwLnJlbW92ZSh0KTtyZXR1cm4gdGhpcy5fX293bmVySUR8fGU9PT10aGlzLl9tYXA/dGhpczpKZSh0aGlzLGUpfSxDZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKX0sQ2UucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBwKHRoaXMuX2RlZmF1bHRWYWx1ZXMpLm1hcChmdW5jdGlvbih0LGUpe3JldHVybiByLmdldChlKX0pLl9faXRlcmF0b3IodCxlKX0sQ2UucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHAodGhpcy5fZGVmYXVsdFZhbHVlcykubWFwKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHIuZ2V0KGUpfSkuX19pdGVyYXRlKHQsZSl9LENlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe2lmKHQ9PT10aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAmJnRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P0plKHRoaXMsZSx0KToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9tYXA9ZSx0aGlzKX07dmFyIHJuPUNlLnByb3RvdHlwZTtybltzcl09cm4ucmVtb3ZlLHJuLmRlbGV0ZUluPXJuLnJlbW92ZUluPVRyLnJlbW92ZUluLHJuLm1lcmdlPVRyLm1lcmdlLHJuLm1lcmdlV2l0aD1Uci5tZXJnZVdpdGgscm4ubWVyZ2VJbj1Uci5tZXJnZUluLHJuLm1lcmdlRGVlcD1Uci5tZXJnZURlZXAscm4ubWVyZ2VEZWVwV2l0aD1Uci5tZXJnZURlZXBXaXRoLHJuLm1lcmdlRGVlcEluPVRyLm1lcmdlRGVlcEluLHJuLnNldEluPVRyLnNldEluLHJuLnVwZGF0ZT1Uci51cGRhdGUscm4udXBkYXRlSW49VHIudXBkYXRlSW4scm4ud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLHJuLmFzTXV0YWJsZT1Uci5hc011dGFibGUscm4uYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsdChZZSxrKSxZZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT9cIlJhbmdlIFtdXCI6XCJSYW5nZSBbIFwiK3RoaXMuX3N0YXJ0K1wiLi4uXCIrdGhpcy5fZW5kKyh0aGlzLl9zdGVwPjE/XCIgYnkgXCIrdGhpcy5fc3RlcDpcIlwiKStcIiBdXCJ9LFllLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fc3RhcnQrdSh0aGlzLHQpKnRoaXMuX3N0ZXA6ZX0sWWUucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3ZhciBlPSh0LXRoaXMuX3N0YXJ0KS90aGlzLl9zdGVwO3JldHVybiBlPj0wJiZ0aGlzLnNpemU+ZSYmZT09PU1hdGguZmxvb3IoZSl9LFllLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3JldHVybiBhKHQsZSx0aGlzLnNpemUpP3RoaXM6KHQ9aCh0LHRoaXMuc2l6ZSksZT1mKGUsdGhpcy5zaXplKSx0Pj1lP25ldyBZZSgwLDApOm5ldyBZZSh0aGlzLmdldCh0LHRoaXMuX2VuZCksdGhpcy5nZXQoZSx0aGlzLl9lbmQpLHRoaXMuX3N0ZXApKX0sWWUucHJvdG90eXBlLmluZGV4T2Y9ZnVuY3Rpb24odCl7dmFyIGU9dC10aGlzLl9zdGFydDtpZihlJXRoaXMuX3N0ZXA9PT0wKXt2YXIgcj1lL3RoaXMuX3N0ZXA7aWYocj49MCYmdGhpcy5zaXplPnIpcmV0dXJuIHJ9cmV0dXJuLTF9LFllLnByb3RvdHlwZS5sYXN0SW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5pbmRleE9mKHQpfSxZZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMuc2l6ZS0xLG49dGhpcy5fc3RlcCxpPWU/dGhpcy5fc3RhcnQrcipuOnRoaXMuX3N0YXJ0LG89MDtyPj1vO28rKyl7aWYodChpLG8sdGhpcyk9PT0hMSlyZXR1cm4gbysxO2krPWU/LW46bn1yZXR1cm4gb30sWWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLnNpemUtMSxuPXRoaXMuX3N0ZXAsaT1lP3RoaXMuX3N0YXJ0K3Iqbjp0aGlzLl9zdGFydCxvPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHU9aTtyZXR1cm4gaSs9ZT8tbjpuLG8+cj9JKCk6eih0LG8rKyx1KX0pfSxZZS5wcm90b3R5cGUuZXF1YWxzPWZ1bmN0aW9uKHQpe3JldHVybiB0IGluc3RhbmNlb2YgWWU/dGhpcy5fc3RhcnQ9PT10Ll9zdGFydCYmdGhpcy5fZW5kPT09dC5fZW5kJiZ0aGlzLl9zdGVwPT09dC5fc3RlcDpWZSh0aGlzLHQpO1xufTt2YXIgbm47dChRZSxrKSxRZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT9cIlJlcGVhdCBbXVwiOlwiUmVwZWF0IFsgXCIrdGhpcy5fdmFsdWUrXCIgXCIrdGhpcy5zaXplK1wiIHRpbWVzIF1cIn0sUWUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90aGlzLl92YWx1ZTplfSxRZS5wcm90b3R5cGUuaW5jbHVkZXM9ZnVuY3Rpb24odCl7cmV0dXJuIFgodGhpcy5fdmFsdWUsdCl9LFFlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuc2l6ZTtyZXR1cm4gYSh0LGUscik/dGhpczpuZXcgUWUodGhpcy5fdmFsdWUsZihlLHIpLWgodCxyKSl9LFFlLnByb3RvdHlwZS5yZXZlcnNlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LFFlLnByb3RvdHlwZS5pbmRleE9mPWZ1bmN0aW9uKHQpe3JldHVybiBYKHRoaXMuX3ZhbHVlLHQpPzA6LTF9LFFlLnByb3RvdHlwZS5sYXN0SW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gWCh0aGlzLl92YWx1ZSx0KT90aGlzLnNpemU6LTF9LFFlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCl7Zm9yKHZhciBlPTA7dGhpcy5zaXplPmU7ZSsrKWlmKHQodGhpcy5fdmFsdWUsZSx0aGlzKT09PSExKXJldHVybiBlKzE7cmV0dXJuIGV9LFFlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMscj0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybiBlLnNpemU+cj96KHQscisrLGUuX3ZhbHVlKTpJKCl9KX0sUWUucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbih0KXtyZXR1cm4gdCBpbnN0YW5jZW9mIFFlP1godGhpcy5fdmFsdWUsdC5fdmFsdWUpOlZlKHQpfTt2YXIgb247Xy5JdGVyYXRvcj1TLFhlKF8se3RvQXJyYXk6ZnVuY3Rpb24oKXtzdCh0aGlzLnNpemUpO3ZhciB0PUFycmF5KHRoaXMuc2l6ZXx8MCk7cmV0dXJuIHRoaXMudmFsdWVTZXEoKS5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxyKXt0W3JdPWV9KSx0fSx0b0luZGV4ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGh0KHRoaXMpfSx0b0pTOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQmJlwiZnVuY3Rpb25cIj09dHlwZW9mIHQudG9KUz90LnRvSlMoKTp0fSkuX190b0pTKCl9LHRvSlNPTjpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvU2VxKCkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnRvSlNPTj90LnRvSlNPTigpOnR9KS5fX3RvSlMoKX0sdG9LZXllZFNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgYXQodGhpcywhMCl9LHRvTWFwOmZ1bmN0aW9uKCl7cmV0dXJuIEx0KHRoaXMudG9LZXllZFNlcSgpKX0sdG9PYmplY3Q6ZnVuY3Rpb24oKXtzdCh0aGlzLnNpemUpO3ZhciB0PXt9O3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihlLHIpe3Rbcl09ZX0pLHR9LHRvT3JkZXJlZE1hcDpmdW5jdGlvbigpe3JldHVybiBJZSh0aGlzLnRvS2V5ZWRTZXEoKSl9LHRvT3JkZXJlZFNldDpmdW5jdGlvbigpe3JldHVybiBMZShkKHRoaXMpP3RoaXMudmFsdWVTZXEoKTp0aGlzKX0sdG9TZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gQWUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU2V0U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBmdCh0aGlzKX0sdG9TZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbSh0aGlzKT90aGlzLnRvSW5kZXhlZFNlcSgpOmQodGhpcyk/dGhpcy50b0tleWVkU2VxKCk6dGhpcy50b1NldFNlcSgpfSx0b1N0YWNrOmZ1bmN0aW9uKCl7cmV0dXJuIEVlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b0xpc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gZmUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU3RyaW5nOmZ1bmN0aW9uKCl7cmV0dXJuXCJbSXRlcmFibGVdXCJ9LF9fdG9TdHJpbmc6ZnVuY3Rpb24odCxlKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT90K2U6dCtcIiBcIit0aGlzLnRvU2VxKCkubWFwKHRoaXMuX190b1N0cmluZ01hcHBlcikuam9pbihcIiwgXCIpK1wiIFwiK2V9LGNvbmNhdDpmdW5jdGlvbigpe1xuICB2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtyZXR1cm4gT3QodGhpcyxTdCh0aGlzLHQpKX0saW5jbHVkZXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc29tZShmdW5jdGlvbihlKXtyZXR1cm4gWChlLHQpfSl9LGVudHJpZXM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKHdyKX0sZXZlcnk6ZnVuY3Rpb24odCxlKXtzdCh0aGlzLnNpemUpO3ZhciByPSEwO3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihuLGksbyl7cmV0dXJuIHQuY2FsbChlLG4saSxvKT92b2lkIDA6KHI9ITEsITEpfSkscn0sZmlsdGVyOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbHQodGhpcyx0LGUsITApKX0sZmluZDpmdW5jdGlvbih0LGUscil7dmFyIG49dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gbj9uWzFdOnJ9LGZpbmRFbnRyeTpmdW5jdGlvbih0LGUpe3ZhciByO3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihuLGksbyl7cmV0dXJuIHQuY2FsbChlLG4saSxvKT8ocj1baSxuXSwhMSk6dm9pZCAwfSkscn0sZmluZExhc3RFbnRyeTpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmZpbmRFbnRyeSh0LGUpfSxmb3JFYWNoOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHN0KHRoaXMuc2l6ZSksdGhpcy5fX2l0ZXJhdGUoZT90LmJpbmQoZSk6dCl9LGpvaW46ZnVuY3Rpb24odCl7c3QodGhpcy5zaXplKSx0PXZvaWQgMCE9PXQ/XCJcIit0OlwiLFwiO3ZhciBlPVwiXCIscj0hMDtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obil7cj9yPSExOmUrPXQsZSs9bnVsbCE9PW4mJnZvaWQgMCE9PW4/XCJcIituOlwiXCJ9KSxlfSxrZXlzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19pdGVyYXRvcihtcil9LG1hcDpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHB0KHRoaXMsdCxlKSl9LHJlZHVjZTpmdW5jdGlvbih0LGUscil7c3QodGhpcy5zaXplKTt2YXIgbixpO3JldHVybiBhcmd1bWVudHMubGVuZ3RoPDI/aT0hMDpuPWUsdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxvLHUpe2k/KGk9ITEsbj1lKTpuPXQuY2FsbChyLG4sZSxvLHUpfSksbn0scmVkdWNlUmlnaHQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCk7cmV0dXJuIHQucmVkdWNlLmFwcGx5KHQsYXJndW1lbnRzKX0scmV2ZXJzZTpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLHZ0KHRoaXMsITApKX0sc2xpY2U6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxtdCh0aGlzLHQsZSwhMCkpfSxzb21lOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIXRoaXMuZXZlcnkoWmUodCksZSl9LHNvcnQ6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMscXQodGhpcyx0KSl9LHZhbHVlczpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faXRlcmF0b3IoZ3IpfSxidXRMYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMCwtMSl9LGlzRW1wdHk6ZnVuY3Rpb24oKXtyZXR1cm4gdm9pZCAwIT09dGhpcy5zaXplPzA9PT10aGlzLnNpemU6IXRoaXMuc29tZShmdW5jdGlvbigpe3JldHVybiEwfSl9LGNvdW50OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIG8odD90aGlzLnRvU2VxKCkuZmlsdGVyKHQsZSk6dGhpcyl9LGNvdW50Qnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4geXQodGhpcyx0LGUpfSxlcXVhbHM6ZnVuY3Rpb24odCl7cmV0dXJuIFZlKHRoaXMsdCl9LGVudHJ5U2VxOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcztpZih0Ll9jYWNoZSlyZXR1cm4gbmV3IGoodC5fY2FjaGUpO3ZhciBlPXQudG9TZXEoKS5tYXAoR2UpLnRvSW5kZXhlZFNlcSgpO3JldHVybiBlLmZyb21FbnRyeVNlcT1mdW5jdGlvbigpe3JldHVybiB0LnRvU2VxKCl9LGV9LGZpbHRlck5vdDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmZpbHRlcihaZSh0KSxlKX0sZmluZExhc3Q6ZnVuY3Rpb24odCxlLHIpe3JldHVybiB0aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCkuZmluZCh0LGUscil9LGZpcnN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZmluZChzKX0sZmxhdE1hcDpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLEl0KHRoaXMsdCxlKSk7XG59LGZsYXR0ZW46ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsenQodGhpcyx0LCEwKSl9LGZyb21FbnRyeVNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgY3QodGhpcyl9LGdldDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmZpbmQoZnVuY3Rpb24oZSxyKXtyZXR1cm4gWChyLHQpfSx2b2lkIDAsZSl9LGdldEluOmZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByLG49dGhpcyxpPUt0KHQpOyEocj1pLm5leHQoKSkuZG9uZTspe3ZhciBvPXIudmFsdWU7aWYobj1uJiZuLmdldD9uLmdldChvLGNyKTpjcixuPT09Y3IpcmV0dXJuIGV9cmV0dXJuIG59LGdyb3VwQnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gZHQodGhpcyx0LGUpfSxoYXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZ2V0KHQsY3IpIT09Y3J9LGhhc0luOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmdldEluKHQsY3IpIT09Y3J9LGlzU3Vic2V0OmZ1bmN0aW9uKHQpe3JldHVybiB0PVwiZnVuY3Rpb25cIj09dHlwZW9mIHQuaW5jbHVkZXM/dDpfKHQpLHRoaXMuZXZlcnkoZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9KX0saXNTdXBlcnNldDpmdW5jdGlvbih0KXtyZXR1cm4gdD1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmlzU3Vic2V0P3Q6Xyh0KSx0LmlzU3Vic2V0KHRoaXMpfSxrZXlTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLm1hcChGZSkudG9JbmRleGVkU2VxKCl9LGxhc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maXJzdCgpfSxtYXg6ZnVuY3Rpb24odCl7cmV0dXJuIER0KHRoaXMsdCl9LG1heEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIER0KHRoaXMsZSx0KX0sbWluOmZ1bmN0aW9uKHQpe3JldHVybiBEdCh0aGlzLHQ/JGUodCk6cnIpfSxtaW5CeTpmdW5jdGlvbih0LGUpe3JldHVybiBEdCh0aGlzLGU/JGUoZSk6cnIsdCl9LHJlc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zbGljZSgxKX0sc2tpcDpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5zbGljZShNYXRoLm1heCgwLHQpKX0sc2tpcExhc3Q6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLnJldmVyc2UoKS5za2lwKHQpLnJldmVyc2UoKSl9LHNraXBXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHd0KHRoaXMsdCxlLCEwKSl9LHNraXBVbnRpbDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnNraXBXaGlsZShaZSh0KSxlKX0sc29ydEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMscXQodGhpcyxlLHQpKX0sdGFrZTpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5zbGljZSgwLE1hdGgubWF4KDAsdCkpfSx0YWtlTGFzdDpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyx0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLnRha2UodCkucmV2ZXJzZSgpKX0sdGFrZVdoaWxlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsZ3QodGhpcyx0LGUpKX0sdGFrZVVudGlsOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudGFrZVdoaWxlKFplKHQpLGUpfSx2YWx1ZVNlcTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvSW5kZXhlZFNlcSgpfSxoYXNoQ29kZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faGFzaHx8KHRoaXMuX19oYXNoPW5yKHRoaXMpKX19KTt2YXIgdW49Xy5wcm90b3R5cGU7dW5bdnJdPSEwLHVuW0lyXT11bi52YWx1ZXMsdW4uX190b0pTPXVuLnRvQXJyYXksdW4uX190b1N0cmluZ01hcHBlcj10cix1bi5pbnNwZWN0PXVuLnRvU291cmNlPWZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzfSx1bi5jaGFpbj11bi5mbGF0TWFwLHVuLmNvbnRhaW5zPXVuLmluY2x1ZGVzLGZ1bmN0aW9uKCl7dHJ5e09iamVjdC5kZWZpbmVQcm9wZXJ0eSh1bixcImxlbmd0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtpZighXy5ub0xlbmd0aFdhcm5pbmcpe3ZhciB0O3RyeXt0aHJvdyBFcnJvcigpfWNhdGNoKGUpe3Q9ZS5zdGFja31pZigtMT09PXQuaW5kZXhPZihcIl93cmFwT2JqZWN0XCIpKXJldHVybiBjb25zb2xlJiZjb25zb2xlLndhcm4mJmNvbnNvbGUud2FybihcIml0ZXJhYmxlLmxlbmd0aCBoYXMgYmVlbiBkZXByZWNhdGVkLCB1c2UgaXRlcmFibGUuc2l6ZSBvciBpdGVyYWJsZS5jb3VudCgpLiBUaGlzIHdhcm5pbmcgd2lsbCBiZWNvbWUgYSBzaWxlbnQgZXJyb3IgaW4gYSBmdXR1cmUgdmVyc2lvbi4gXCIrdCksXG4gIHRoaXMuc2l6ZX19fSl9Y2F0Y2godCl7fX0oKSxYZShwLHtmbGlwOmZ1bmN0aW9uKCl7cmV0dXJuIE90KHRoaXMsX3QodGhpcykpfSxmaW5kS2V5OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gciYmclswXX0sZmluZExhc3RLZXk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maW5kS2V5KHQsZSl9LGtleU9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmZpbmRLZXkoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxsYXN0S2V5T2Y6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZmluZExhc3RLZXkoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxtYXBFbnRyaWVzOmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLm1hcChmdW5jdGlvbihpLG8pe3JldHVybiB0LmNhbGwoZSxbbyxpXSxuKysscil9KS5mcm9tRW50cnlTZXEoKSl9LG1hcEtleXM6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5mbGlwKCkubWFwKGZ1bmN0aW9uKG4saSl7cmV0dXJuIHQuY2FsbChlLG4saSxyKX0pLmZsaXAoKSl9fSk7dmFyIHNuPXAucHJvdG90eXBlO3NuW2xyXT0hMCxzbltJcl09dW4uZW50cmllcyxzbi5fX3RvSlM9dW4udG9PYmplY3Qsc24uX190b1N0cmluZ01hcHBlcj1mdW5jdGlvbih0LGUpe3JldHVybiBKU09OLnN0cmluZ2lmeShlKStcIjogXCIrdHIodCl9LFhlKHYse3RvS2V5ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGF0KHRoaXMsITEpfSxmaWx0ZXI6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxsdCh0aGlzLHQsZSwhMSkpfSxmaW5kSW5kZXg6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLmZpbmRFbnRyeSh0LGUpO3JldHVybiByP3JbMF06LTF9LGluZGV4T2Y6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy50b0tleWVkU2VxKCkua2V5T2YodCk7cmV0dXJuIHZvaWQgMD09PWU/LTE6ZX0sbGFzdEluZGV4T2Y6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuaW5kZXhPZih0KX0scmV2ZXJzZTpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLHZ0KHRoaXMsITEpKX0sc2xpY2U6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxtdCh0aGlzLHQsZSwhMSkpfSxzcGxpY2U6ZnVuY3Rpb24odCxlKXt2YXIgcj1hcmd1bWVudHMubGVuZ3RoO2lmKGU9TWF0aC5tYXgoMHxlLDApLDA9PT1yfHwyPT09ciYmIWUpcmV0dXJuIHRoaXM7dD1oKHQsMD50P3RoaXMuY291bnQoKTp0aGlzLnNpemUpO3ZhciBuPXRoaXMuc2xpY2UoMCx0KTtyZXR1cm4gT3QodGhpcywxPT09cj9uOm4uY29uY2F0KGkoYXJndW1lbnRzLDIpLHRoaXMuc2xpY2UodCtlKSkpfSxmaW5kTGFzdEluZGV4OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy50b0tleWVkU2VxKCkuZmluZExhc3RLZXkodCxlKTtyZXR1cm4gdm9pZCAwPT09cj8tMTpyfSxmaXJzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldCgwKX0sZmxhdHRlbjpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyx6dCh0aGlzLHQsITEpKX0sZ2V0OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHQ9dSh0aGlzLHQpLDA+dHx8dGhpcy5zaXplPT09MS8wfHx2b2lkIDAhPT10aGlzLnNpemUmJnQ+dGhpcy5zaXplP2U6dGhpcy5maW5kKGZ1bmN0aW9uKGUscil7cmV0dXJuIHI9PT10fSx2b2lkIDAsZSl9LGhhczpmdW5jdGlvbih0KXtyZXR1cm4gdD11KHRoaXMsdCksdD49MCYmKHZvaWQgMCE9PXRoaXMuc2l6ZT90aGlzLnNpemU9PT0xLzB8fHRoaXMuc2l6ZT50Oi0xIT09dGhpcy5pbmRleE9mKHQpKX0saW50ZXJwb3NlOmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLGJ0KHRoaXMsdCkpfSxpbnRlcmxlYXZlOmZ1bmN0aW9uKCl7dmFyIHQ9W3RoaXNdLmNvbmNhdChpKGFyZ3VtZW50cykpLGU9RXQodGhpcy50b1NlcSgpLGsub2YsdCkscj1lLmZsYXR0ZW4oITApO3JldHVybiBlLnNpemUmJihyLnNpemU9ZS5zaXplKnQubGVuZ3RoKSxPdCh0aGlzLHIpfSxsYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0KC0xKTtcbn0sc2tpcFdoaWxlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsd3QodGhpcyx0LGUsITEpKX0semlwOmZ1bmN0aW9uKCl7dmFyIHQ9W3RoaXNdLmNvbmNhdChpKGFyZ3VtZW50cykpO3JldHVybiBPdCh0aGlzLEV0KHRoaXMsZXIsdCkpfSx6aXBXaXRoOmZ1bmN0aW9uKHQpe3ZhciBlPWkoYXJndW1lbnRzKTtyZXR1cm4gZVswXT10aGlzLE90KHRoaXMsRXQodGhpcyx0LGUpKX19KSx2LnByb3RvdHlwZVt5cl09ITAsdi5wcm90b3R5cGVbZHJdPSEwLFhlKGwse2dldDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90OmV9LGluY2x1ZGVzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmhhcyh0KX0sa2V5U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWVTZXEoKX19KSxsLnByb3RvdHlwZS5oYXM9dW4uaW5jbHVkZXMsWGUoeCxwLnByb3RvdHlwZSksWGUoayx2LnByb3RvdHlwZSksWGUoQSxsLnByb3RvdHlwZSksWGUoVixwLnByb3RvdHlwZSksWGUoWSx2LnByb3RvdHlwZSksWGUoUSxsLnByb3RvdHlwZSk7dmFyIGFuPXtJdGVyYWJsZTpfLFNlcTpPLENvbGxlY3Rpb246SCxNYXA6THQsT3JkZXJlZE1hcDpJZSxMaXN0OmZlLFN0YWNrOkVlLFNldDpBZSxPcmRlcmVkU2V0OkxlLFJlY29yZDpDZSxSYW5nZTpZZSxSZXBlYXQ6UWUsaXM6WCxmcm9tSlM6Rn07cmV0dXJuIGFufSk7Il19
