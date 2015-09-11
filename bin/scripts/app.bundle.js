(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _noriUtilsRxJs = require('../nori/utils/Rx.js');

var _rx = _interopRequireWildcard(_noriUtilsRxJs);

var _actionActionCreatorJs = require('./action/ActionCreator.js');

var _appActions = _interopRequireWildcard(_actionActionCreatorJs);

var _noriActionActionCreatorJs = require('../nori/action/ActionCreator.js');

var _noriActions = _interopRequireWildcard(_noriActionActionCreatorJs);

var _noriServiceSocketIOEventsJs = require('../nori/service/SocketIOEvents.js');

var _socketIOEvents = _interopRequireWildcard(_noriServiceSocketIOEventsJs);

var _storeAppStoreJs = require('./store/AppStore.js');

var _appStore = _interopRequireWildcard(_storeAppStoreJs);

var _viewAppViewJs = require('./view/AppView.js');

var _appView = _interopRequireWildcard(_viewAppViewJs);

var _noriServiceSocketIOJs = require('../nori/service/SocketIO.js');

var _Socket = _interopRequireWildcard(_noriServiceSocketIOJs);

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
  store: _appStore,
  view: _appView,
  socket: _Socket,

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
    //this.store.setState({currentState: 'MAIN_GAME'});
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
      return player.id !== localPlayerID;
    })[0];
  },

  handleGameAbort: function handleGameAbort(payload) {
    this.view.alert(payload.payload, payload.type);
    this.store.apply(_appActions.resetGame());
  }

});

exports['default'] = App;
module.exports = exports['default'];

},{"../nori/action/ActionCreator.js":15,"../nori/service/SocketIO.js":17,"../nori/service/SocketIOEvents.js":18,"../nori/utils/Rx.js":25,"./action/ActionCreator.js":3,"./store/AppStore.js":4,"./view/AppView.js":5}],2:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = {
  LOCAL_PLAYER_CONNECT: 'LOCAL_PLAYER_CONNECT',
  SET_SESSION_PROPS: 'SET_SESSION_PROPS',
  SET_LOCAL_PLAYER_PROPS: 'SET_LOCAL_PLAYER_PROPS',
  SET_LOCAL_PLAYER_NAME: 'SET_LOCAL_PLAYER_NAME',
  SET_LOCAL_PLAYER_APPEARANCE: 'SET_LOCAL_PLAYER_APPEARANCE',
  SET_REMOTE_PLAYER_PROPS: 'SET_REMOTE_PLAYER_PROPS',
  RESET_GAME: 'RESET_GAME'
  //SELECT_PLAYER              : 'SELECT_PLAYER',
  //REMOTE_PLAYER_CONNECT      : 'REMOTE_PLAYER_CONNECT',
  //GAME_START                 : 'GAME_START',
  //LOCAL_QUESTION             : 'LOCAL_QUESTION',
  //REMOTE_QUESTION            : 'REMOTE_QUESTION',
  //LOCAL_PLAYER_HEALTH_CHANGE : 'LOCAL_PLAYER_HEALTH_CHANGE',
  //REMOTE_PLAYER_HEALTH_CHANGE: 'REMOTE_PLAYER_HEALTH_CHANGE',
  //GAME_OVER                  : 'GAME_OVER'
};
module.exports = exports['default'];

},{}],3:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _ActionConstantsJs = require('./ActionConstants.js');

var _actionConstants = _interopRequireWildcard(_ActionConstantsJs);

var _storeAppStoreJs = require('../store/AppStore.js');

var _appStore = _interopRequireWildcard(_storeAppStoreJs);

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
  },

  resetGame: function resetGame() {
    return {
      type: _actionConstants.RESET_GAME,
      payload: {
        data: {
          currentState: _appStore.gameStates[1],
          session: {
            roomID: ''
          },
          localPlayer: _appStore.createPlayerResetObject(),
          remotePlayer: _appStore.createPlayerResetObject()
        }
      }
    };
  }

};

exports['default'] = ActionCreator;
module.exports = exports['default'];

},{"../store/AppStore.js":4,"./ActionConstants.js":2}],4:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _noriServiceRestJs = require('../../nori/service/Rest.js');

var _rest = _interopRequireWildcard(_noriServiceRestJs);

var _noriActionActionConstantsJs = require('../../nori/action/ActionConstants.js');

var _noriActionConstants = _interopRequireWildcard(_noriActionActionConstantsJs);

var _actionActionConstantsJs = require('../action/ActionConstants.js');

var _appActionConstants = _interopRequireWildcard(_actionActionConstantsJs);

var _noriUtilsMixinObservableSubjectJs = require('../../nori/utils/MixinObservableSubject.js');

var _mixinObservableSubject = _interopRequireWildcard(_noriUtilsMixinObservableSubjectJs);

var _noriStoreMixinReducerStoreJs = require('../../nori/store/MixinReducerStore.js');

var _mixinReducerStore = _interopRequireWildcard(_noriStoreMixinReducerStoreJs);

var _nudoruCoreNumberUtilsJs = require('../../nudoru/core/NumberUtils.js');

var _numUtils = _interopRequireWildcard(_nudoruCoreNumberUtilsJs);

var _restNumQuestions = 3,
    _restQuestionCategory = 24; // SCI/TECh

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

  mixins: [_mixinReducerStore, _mixinObservableSubject['default']()],

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
    var getQuestions = _rest.request({
      method: 'GET',
      //https://pareshchouhan-trivia-v1.p.mashape.com/v1/getQuizQuestionsByCategory?categoryId=1&limit=10&page=1
      url: 'https://pareshchouhan-trivia-v1.p.mashape.com/v1/getAllQuizQuestions?limit=' + _restNumQuestions + '&page=1',
      headers: [{ 'X-Mashape-Key': 'tPxKgDvrkqmshg8zW4olS87hzF7Ap1vi63rjsnUuVw1sBHV9KJ' }],
      json: true
    }).subscribe(function success(data) {
      console.log('ok', data);
    }, function error(data) {
      console.log('err', data);
    });

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
      case _appActionConstants.RESET_GAME:
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
    var state = this.getState();

    if (this.shouldGameEnd(state)) {
      this.setState({ currentState: this.gameStates[4] });
    }

    this.notifySubscribers(state);
  },

  /**
   * When a player's health reaches 0, the game is over
   * @param state
   * @returns {boolean}
   */
  shouldGameEnd: function shouldGameEnd(state) {
    if (!state.localPlayer || !state.remotePlayer || state.currentState !== 'MAIN_GAME') {
      return false;
    }

    var local = state.localPlayer.health,
        remote = state.remotePlayer.health;

    if (local <= 0 || remote <= 0) {
      return true;
    }

    return false;
  }

});

exports['default'] = AppStore();
module.exports = exports['default'];

},{"../../nori/action/ActionConstants.js":14,"../../nori/service/Rest.js":16,"../../nori/store/MixinReducerStore.js":20,"../../nori/utils/MixinObservableSubject.js":22,"../../nudoru/core/NumberUtils.js":42,"../action/ActionConstants.js":2}],5:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _storeAppStoreJs = require('../store/AppStore.js');

var _appStore = _interopRequireWildcard(_storeAppStoreJs);

var _noriViewApplicationViewJs = require('../../nori/view/ApplicationView.js');

var _mixinApplicationView = _interopRequireWildcard(_noriViewApplicationViewJs);

var _noriViewMixinNudoruControlsJs = require('../../nori/view/MixinNudoruControls.js');

var _mixinNudoruControls = _interopRequireWildcard(_noriViewMixinNudoruControlsJs);

var _noriViewMixinComponentViewsJs = require('../../nori/view/MixinComponentViews.js');

var _mixinComponentViews = _interopRequireWildcard(_noriViewMixinComponentViewsJs);

var _noriViewMixinStoreStateViewsJs = require('../../nori/view/MixinStoreStateViews.js');

var _mixinStoreStateViews = _interopRequireWildcard(_noriViewMixinStoreStateViewsJs);

var _noriViewMixinEventDelegatorJs = require('../../nori/view/MixinEventDelegator.js');

var _mixinEventDelegator = _interopRequireWildcard(_noriViewMixinEventDelegatorJs);

var _noriUtilsMixinObservableSubjectJs = require('../../nori/utils/MixinObservableSubject.js');

var _mixinObservableSubject = _interopRequireWildcard(_noriUtilsMixinObservableSubjectJs);

/**
 * View for an application.
 */

var AppView = Nori.createView({

  mixins: [_mixinApplicationView, _mixinNudoruControls, _mixinComponentViews, _mixinStoreStateViews, _mixinEventDelegator['default'](), _mixinObservableSubject['default']()],

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

exports['default'] = AppView();
module.exports = exports['default'];

},{"../../nori/utils/MixinObservableSubject.js":22,"../../nori/view/ApplicationView.js":27,"../../nori/view/MixinComponentViews.js":28,"../../nori/view/MixinEventDelegator.js":30,"../../nori/view/MixinNudoruControls.js":31,"../../nori/view/MixinStoreStateViews.js":32,"../store/AppStore.js":4,"./Screen.GameOver.js":7,"./Screen.MainGame.js":8,"./Screen.PlayerSelect.js":9,"./Screen.Title.js":10,"./Screen.WaitingOnPlayer.js":11}],6:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _noriActionActionCreator = require('../../nori/action/ActionCreator');

var _noriActions = _interopRequireWildcard(_noriActionActionCreator);

var _AppView = require('./AppView');

var _appView = _interopRequireWildcard(_AppView);

var _storeAppStore = require('../store/AppStore');

var _appStore = _interopRequireWildcard(_storeAppStore);

var _noriUtilsTemplatingJs = require('../../nori/utils/Templating.js');

var _template = _interopRequireWildcard(_noriUtilsTemplatingJs);

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = _appView.createComponentView({

  /**
   * configProps passed in from region definition on parent View
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize: function initialize(configProps) {
    this.bindMap(_appStore); // Reducer store, map id string or map object
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function defineEvents() {
    return null;
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    var appState = _appStore.getState(),
        stats = appState.localPlayer;
    if (this.getConfigProps().target === 'remote') {
      stats = appState.remotePlayer;
    }
    return stats;
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    var appState = _appStore.getState(),
        stats = appState.localPlayer;
    if (this.getConfigProps().target === 'remote') {
      stats = appState.remotePlayer;
    }
    return stats;
  },

  template: function template() {
    var html = _template.getSource('game__playerstats');
    return _.template(html);
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

exports['default'] = Component;
module.exports = exports['default'];

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../store/AppStore":4,"./AppView":5}],7:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _noriActionActionCreator = require('../../nori/action/ActionCreator');

var _noriActions = _interopRequireWildcard(_noriActionActionCreator);

var _AppView = require('./AppView');

var _appView = _interopRequireWildcard(_AppView);

var _storeAppStore = require('../store/AppStore');

var _appStore = _interopRequireWildcard(_storeAppStore);

var _noriUtilsTemplatingJs = require('../../nori/utils/Templating.js');

var _template = _interopRequireWildcard(_noriUtilsTemplatingJs);

var _actionActionCreatorJs = require('../action/ActionCreator.js');

var _appActions = _interopRequireWildcard(_actionActionCreatorJs);

var _noriViewMixinDOMManipulationJs = require('../../nori/view/MixinDOMManipulation.js');

var _mixinDOMManipulation = _interopRequireWildcard(_noriViewMixinDOMManipulationJs);

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
        _appStore.apply(_appActions.resetGame());
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    var appState = _appStore.getState(),
        state = {
      name: appState.localPlayer.name,
      appearance: appState.localPlayer.appearance,
      localScore: appState.localPlayer.score,
      remoteScore: appState.remotePlayer.score,
      localWin: appState.localPlayer.score > appState.remotePlayer.score,
      remoteWin: appState.localPlayer.score < appState.remotePlayer.score,
      tieWin: appState.localPlayer.score === appState.remotePlayer.score
    };
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

exports['default'] = Component;
module.exports = exports['default'];

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../../nori/view/MixinDOMManipulation.js":29,"../action/ActionCreator.js":3,"../store/AppStore":4,"./AppView":5}],8:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _noriActionActionCreator = require('../../nori/action/ActionCreator');

var _noriActions = _interopRequireWildcard(_noriActionActionCreator);

var _AppView = require('./AppView');

var _appView = _interopRequireWildcard(_AppView);

var _storeAppStore = require('../store/AppStore');

var _appStore = _interopRequireWildcard(_storeAppStore);

var _noriUtilsTemplatingJs = require('../../nori/utils/Templating.js');

var _template = _interopRequireWildcard(_noriUtilsTemplatingJs);

var _actionActionCreatorJs = require('../action/ActionCreator.js');

var _appActions = _interopRequireWildcard(_actionActionCreatorJs);

var _noriServiceSocketIOJs = require('../../nori/service/SocketIO.js');

var _socketIO = _interopRequireWildcard(_noriServiceSocketIOJs);

var _RegionPlayerStatsJs = require('./Region.PlayerStats.js');

var _regionPlayerStats = _interopRequireWildcard(_RegionPlayerStatsJs);

var _nudoruCoreNumberUtilsJs = require('../../nudoru/core/NumberUtils.js');

var _numUtils = _interopRequireWildcard(_nudoruCoreNumberUtilsJs);

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

  defineRegions: function defineRegions() {
    return {
      localPlayerStats: _regionPlayerStats['default']({
        id: 'game__playerstats',
        mountPoint: '#game__localplayerstats',
        target: 'local'
      }),
      remotePlayerStats: _regionPlayerStats['default']({
        id: 'game__playerstats',
        mountPoint: '#game__remoteplayerstats',
        target: 'remote'
      })
    };
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents: function defineEvents() {
    return {
      'click #game__button-skip': function clickGame__buttonSkip() {
        _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[4] }));
      },
      'click #game__test': function clickGame__test() {
        var state = _appStore.getState(),
            localScore = state.localPlayer.score + _numUtils.rndNumber(0, 5),
            localHealth = state.localPlayer.health + 1,
            remoteScore = state.remotePlayer.score + _numUtils.rndNumber(0, 5),
            remoteHealth = state.remotePlayer.health - 1;

        _appStore.apply(_appActions.setLocalPlayerProps({
          health: localHealth,
          score: localScore
        }));
        _appStore.apply(_appActions.setRemotePlayerProps({
          health: remoteHealth,
          score: remoteScore
        }));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState: function getInitialState() {
    var appState = _appStore.getState();
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

exports['default'] = Component;
module.exports = exports['default'];

},{"../../nori/action/ActionCreator":15,"../../nori/service/SocketIO.js":17,"../../nori/utils/Templating.js":26,"../../nudoru/core/NumberUtils.js":42,"../action/ActionCreator.js":3,"../store/AppStore":4,"./AppView":5,"./Region.PlayerStats.js":6}],9:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _noriActionActionCreator = require('../../nori/action/ActionCreator');

var _noriActions = _interopRequireWildcard(_noriActionActionCreator);

var _AppView = require('./AppView');

var _appView = _interopRequireWildcard(_AppView);

var _storeAppStore = require('../store/AppStore');

var _appStore = _interopRequireWildcard(_storeAppStore);

var _noriUtilsTemplatingJs = require('../../nori/utils/Templating.js');

var _template = _interopRequireWildcard(_noriUtilsTemplatingJs);

var _actionActionCreatorJs = require('../action/ActionCreator.js');

var _appActions = _interopRequireWildcard(_actionActionCreatorJs);

var _noriServiceSocketIOJs = require('../../nori/service/SocketIO.js');

var _socketIO = _interopRequireWildcard(_noriServiceSocketIOJs);

var _roomNumberLength = 4;

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

exports['default'] = Component;
module.exports = exports['default'];

},{"../../nori/action/ActionCreator":15,"../../nori/service/SocketIO.js":17,"../../nori/utils/Templating.js":26,"../action/ActionCreator.js":3,"../store/AppStore":4,"./AppView":5}],10:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _noriActionActionCreator = require('../../nori/action/ActionCreator');

var _noriActions = _interopRequireWildcard(_noriActionActionCreator);

var _AppView = require('./AppView');

var _appView = _interopRequireWildcard(_AppView);

var _storeAppStore = require('../store/AppStore');

var _appStore = _interopRequireWildcard(_storeAppStore);

var _noriUtilsTemplatingJs = require('../../nori/utils/Templating.js');

var _template = _interopRequireWildcard(_noriUtilsTemplatingJs);

console.log('title', _appView);

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

exports['default'] = Component;
module.exports = exports['default'];

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../store/AppStore":4,"./AppView":5}],11:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _noriActionActionCreator = require('../../nori/action/ActionCreator');

var _noriActions = _interopRequireWildcard(_noriActionActionCreator);

var _AppView = require('./AppView');

var _appView = _interopRequireWildcard(_AppView);

var _storeAppStore = require('../store/AppStore');

var _appStore = _interopRequireWildcard(_storeAppStore);

var _noriUtilsTemplatingJs = require('../../nori/utils/Templating.js');

var _template = _interopRequireWildcard(_noriUtilsTemplatingJs);

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

exports['default'] = Component;
module.exports = exports['default'];

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../store/AppStore":4,"./AppView":5}],12:[function(require,module,exports){
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

},{"./app/App.js":1,"./nori/Nori.js":13,"./nudoru/browser/BrowserInfo.js":34}],13:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

var _utilsDispatcherJs = require('./utils/Dispatcher.js');

var _dispatcher = _interopRequireWildcard(_utilsDispatcherJs);

var _utilsRouterJs = require('./utils/Router.js');

var _router = _interopRequireWildcard(_utilsRouterJs);

var Nori = function Nori() {

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
    var mixins = undefined;

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

exports['default'] = Nori();
module.exports = exports['default'];

},{"./utils/Dispatcher.js":21,"./utils/Router.js":24}],14:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
/*  weak */

exports['default'] = {
  CHANGE_STORE_STATE: 'CHANGE_STORE_STATE'
};
module.exports = exports['default'];

},{}],15:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

/**
 * Action Creator
 * Based on Flux Actions
 * For more information and guidelines: https://github.com/acdlite/flux-standard-action
 */

var _ActionConstantsJs = require('./ActionConstants.js');

var _noriActionConstants = _interopRequireWildcard(_ActionConstantsJs);

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

exports['default'] = NoriActionCreator;
module.exports = exports['default'];

},{"./ActionConstants.js":14}],16:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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

exports['default'] = Rest();
module.exports = exports['default'];

},{}],17:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

var _SocketIOEventsJs = require('./SocketIOEvents.js');

var _events = _interopRequireWildcard(_SocketIOEventsJs);

var SocketIOConnector = function SocketIOConnector() {

  var _subject = new Rx.BehaviorSubject(),
      _socketIO = io(),
      _log = [],
      _connectionID = undefined;

  function initialize() {
    _socketIO.on(_events.NOTIFY_CLIENT, onNotifyClient);
  }

  /**
   * All notifications from Socket.io come here
   * @param payload {type, id, time, payload}
   */
  function onNotifyClient(payload) {
    _log.push(payload);

    var type = payload.type;

    if (type === _events.PING) {
      notifyServer(_events.PONG, {});
    } else if (type === _events.PONG) {
      console.log('SOCKET.IO PONG!');
    } else if (type === _events.CONNECT) {
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

exports['default'] = SocketIOConnector();
module.exports = exports['default'];

},{"./SocketIOEvents.js":18}],18:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
/*  weak */

exports['default'] = {
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
module.exports = exports['default'];

},{}],19:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

/**
 * Wraps Immutable.js's Map in the same syntax as the SimpleStore module
 *
 * View Docs http://facebook.github.io/immutable-js/docs/#/Map
 */

var _vendorImmutableMinJs = require('../../vendor/immutable.min.js');

var immutable = _interopRequireWildcard(_vendorImmutableMinJs);

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

exports['default'] = ImmutableMap;
module.exports = exports['default'];

},{"../../vendor/immutable.min.js":45}],20:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

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

var _nudoruUtilIsJs = require('../../nudoru/util/is.js');

var is = _interopRequireWildcard(_nudoruUtilIsJs);

var MixinReducerStore = function MixinReducerStore() {
  var _this = undefined,
      _state = undefined,
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
    _stateReducers.forEach(function (reducerFunc) {
      return state = reducerFunc(state, action);
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

exports['default'] = MixinReducerStore();
module.exports = exports['default'];

},{"../../nudoru/util/is.js":44,"./ImmutableMap.js":19}],21:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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

exports['default'] = Dispatcher();
module.exports = exports['default'];

},{}],22:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

/**
 * Add RxJS Subject to a module.
 *
 * Add one simple observable subject or more complex ability to create others for
 * more complex eventing needs.
 */

var _nudoruUtilIsJs = require('../../nudoru/util/is.js');

var is = _interopRequireWildcard(_nudoruUtilIsJs);

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

exports['default'] = MixinObservableSubject;
module.exports = exports['default'];

},{"../../nudoru/util/is.js":44}],23:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

/**
 * Utility to handle all view DOM attachment tasks
 */

var _nudoruBrowserDOMUtilsJs = require('../../nudoru/browser/DOMUtils.js');

var _domUtils = _interopRequireWildcard(_nudoruBrowserDOMUtilsJs);

var Renderer = function Renderer() {
  function render(_ref) {
    var target = _ref.target;
    var html = _ref.html;
    var callback = _ref.callback;

    var domEl = undefined,
        mountPoint = document.querySelector(target);

    mountPoint.innerHTML = '';

    if (html) {
      domEl = _domUtils.HTMLStrToNode(html);
      mountPoint.appendChild(domEl);
    }

    if (callback) {
      callback(domEl);
    }

    return domEl;
  }

  return {
    render: render
  };
};

exports['default'] = Renderer();
module.exports = exports['default'];

},{"../../nudoru/browser/DOMUtils.js":35}],24:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

/**
 * Simple router
 * Supporting IE9 so using hashes instead of the history API for now
 */

var _nudoruCoreObjectUtilsJs = require('../../nudoru/core/ObjectUtils.js');

var _objUtils = _interopRequireWildcard(_nudoruCoreObjectUtilsJs);

var Router = function Router() {

  var _subject = new Rx.Subject(),
      _hashChangeObservable = undefined;

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

exports['default'] = r;
module.exports = exports['default'];

},{"../../nudoru/core/ObjectUtils.js":43}],25:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
/*  weak */

/**
 * RxJS Helpers
 * @type {{dom: Function, from: Function, interval: Function, doEvery: Function, just: Function, empty: Function}}
 */

exports['default'] = {
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
module.exports = exports['default'];

},{}],26:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

/*
 Simple wrapper for Underscore / HTML templates
 Matt Perkins
 4/7/15
 */

var _nudoruBrowserDOMUtilsJs = require('../../nudoru/browser/DOMUtils.js');

var _DOMUtils = _interopRequireWildcard(_nudoruBrowserDOMUtilsJs);

var Templating = function Templating() {

  var _templateMap = Object.create(null),
      _templateHTMLCache = Object.create(null),
      _templateCache = Object.create(null);

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
        srchtml = undefined;

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

exports['default'] = Templating();
module.exports = exports['default'];

},{"../../nudoru/browser/DOMUtils.js":35}],27:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

var _utilsTemplatingJs = require('../utils/Templating.js');

var _template = _interopRequireWildcard(_utilsTemplatingJs);

var _nudoruBrowserDOMUtilsJs = require('../../nudoru/browser/DOMUtils.js');

var _domUtils = _interopRequireWildcard(_nudoruBrowserDOMUtilsJs);

var ApplicationView = function ApplicationView() {

  var _this = undefined;

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

exports['default'] = ApplicationView();
module.exports = exports['default'];

},{"../../nudoru/browser/DOMUtils.js":35,"../utils/Templating.js":26}],28:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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
  function mapViewComponent(componentID, componentObj, mountPoint) {
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
    return function (configProps) {

      // TODO use import for these
      var componentViewFactory = require('./ViewComponent.js'),
          eventDelegatorFactory = require('./MixinEventDelegator.js'),
          observableFactory = require('../utils/MixinObservableSubject.js'),
          stateObjFactory = require('../store/ImmutableMap.js');

      var componentAssembly = undefined,
          finalComponent = undefined,
          previousInitialize = undefined;

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

      if (configProps) {
        finalComponent.configuration = function () {
          return configProps;
        };
      }

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

exports['default'] = MixinComponentViews();
module.exports = exports['default'];

},{"../store/ImmutableMap.js":19,"../utils/MixinObservableSubject.js":22,"./MixinEventDelegator.js":30,"./ViewComponent.js":33}],29:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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

exports['default'] = MixinDOMManipulation();
module.exports = exports['default'];

},{}],30:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

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

var _utilsRxJs = require('../utils/Rx.js');

var _rx = _interopRequireWildcard(_utilsRxJs);

var _nudoruBrowserBrowserInfoJs = require('../../nudoru/browser/BrowserInfo.js');

var _browserInfo = _interopRequireWildcard(_nudoruBrowserBrowserInfoJs);

var _nudoruUtilIsJs = require('../../nudoru/util/is.js');

var is = _interopRequireWildcard(_nudoruUtilIsJs);

var MixinEventDelegator = function MixinEventDelegator() {

  var _eventsMap = undefined,
      _eventSubscribers = undefined;

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
        var _ret = (function () {

          var mappings = evtStrings.split(','),
              eventHandler = _eventsMap[evtStrings];

          if (!is.func(eventHandler)) {
            console.warn('EventDelegator, handler for ' + evtStrings + ' is not a function');
            return {
              v: undefined
            };
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
        })();

        if (typeof _ret === 'object') return _ret.v;
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

exports['default'] = MixinEventDelegator;
module.exports = exports['default'];

},{"../../nudoru/browser/BrowserInfo.js":34,"../../nudoru/util/is.js":44,"../utils/Rx.js":25}],31:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

var _nudoruComponentsToastViewJs = require('../../nudoru/components/ToastView.js');

var _notificationView = _interopRequireWildcard(_nudoruComponentsToastViewJs);

var _nudoruComponentsToolTipViewJs = require('../../nudoru/components/ToolTipView.js');

var _toolTipView = _interopRequireWildcard(_nudoruComponentsToolTipViewJs);

var _nudoruComponentsMessageBoxViewJs = require('../../nudoru/components/MessageBoxView.js');

var _messageBoxView = _interopRequireWildcard(_nudoruComponentsMessageBoxViewJs);

var _nudoruComponentsMessageBoxCreatorJs = require('../../nudoru/components/MessageBoxCreator.js');

var _messageBoxCreator = _interopRequireWildcard(_nudoruComponentsMessageBoxCreatorJs);

var _nudoruComponentsModalCoverViewJs = require('../../nudoru/components/ModalCoverView.js');

var _modalCoverView = _interopRequireWildcard(_nudoruComponentsModalCoverViewJs);

var MixinNudoruControls = function MixinNudoruControls() {

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

exports['default'] = MixinNudoruControls();
module.exports = exports['default'];

},{"../../nudoru/components/MessageBoxCreator.js":37,"../../nudoru/components/MessageBoxView.js":38,"../../nudoru/components/ModalCoverView.js":39,"../../nudoru/components/ToastView.js":40,"../../nudoru/components/ToolTipView.js":41}],32:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
/*  weak */

/**
 * Mixin view that allows for component views to be display on store state changes
 */

var MixinStoreStateViews = function MixinStoreStateViews() {

  var _this = undefined,
      _watchedStore = undefined,
      _currentViewID = undefined,
      _currentStoreState = undefined,
      _stateViewMountPoint = undefined,
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

exports['default'] = MixinStoreStateViews();
module.exports = exports['default'];

},{}],33:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/*  weak */

/**
 * Base module for components
 * Must be extended with custom modules
 */

var _utilsTemplatingJs = require('../utils/Templating.js');

var _template = _interopRequireWildcard(_utilsTemplatingJs);

var _utilsRendererJs = require('../utils/Renderer.js');

var _renderer = _interopRequireWildcard(_utilsRendererJs);

var _nudoruUtilIsJs = require('../../nudoru/util/is.js');

var is = _interopRequireWildcard(_nudoruUtilIsJs);

var ViewComponent = function ViewComponent() {

  var _isInitialized = false,
      _configProps = undefined,
      _id = undefined,
      _templateObjCache = undefined,
      _html = undefined,
      _DOMElement = undefined,
      _mountPoint = undefined,
      _regions = {},
      _isMounted = false;

  /**
   * Initialization
   * @param configProps
   */
  function initializeComponent(configProps) {
    _configProps = this.configuration() || configProps;
    _id = _configProps.id;
    _mountPoint = _configProps.mountPoint;

    this.setState(this.getInitialState());
    this.setEvents(this.defineEvents());

    _regions = this.defineRegions();

    this.createSubject('update');
    this.createSubject('mount');
    this.createSubject('unmount');

    this.initializeRegions();

    _isInitialized = true;
  }

  function configuration() {
    return undefined;
  }

  function defineEvents() {
    return undefined;
  }

  /**
   * Bind updates to the map ID to this view's update
   * @param mapObj Object to subscribe to or ID. Should implement nori/store/MixinObservableStore
   */
  function bindMap(mapObj) {
    if (!is.func(mapObj.subscribe)) {
      console.warn('ViewComponent bindMap, must be observable: ' + mapObj);
      return;
    }

    mapObj.subscribe(this.update.bind(this));
  }

  /**
   * Before the view updates and a rerender occurs
   * Returns nextState of component
   */
  function componentWillUpdate() {
    return this.getState();
  }

  function update() {
    var nextState = this.componentWillUpdate();

    if (this.shouldComponentUpdate(nextState)) {
      this.setState(nextState);

      if (_isMounted) {
        this.unmount();
        this.componentRender();
        this.mount();
      }

      this.updateRegions();

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
    if (!_templateObjCache) {
      _templateObjCache = this.template();
    }

    _html = this.render(this.getState());

    this.renderRegions();
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

    this.mountRegions();

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

    this.unmountRegions();

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
  //  Regions
  //----------------------------------------------------------------------------

  function defineRegions() {
    return undefined;
  }

  function getRegion(id) {
    return _regions[id];
  }

  function getRegionIDs() {
    return _regions ? Object.keys(_regions) : [];
  }

  function initializeRegions() {
    getRegionIDs().forEach(function (region) {
      _regions[region].initialize();
    });
  }

  function updateRegions() {
    getRegionIDs().forEach(function (region) {
      _regions[region].update();
    });
  }

  function renderRegions() {
    getRegionIDs().forEach(function (region) {
      _regions[region].componentRender();
    });
  }

  function mountRegions() {
    getRegionIDs().forEach(function (region) {
      _regions[region].mount();
    });
  }

  function unmountRegions() {
    getRegionIDs().forEach(function (region) {
      _regions[region].unmount();
    });
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

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    initializeComponent: initializeComponent,
    configuration: configuration,
    defineRegions: defineRegions,
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
    getRegion: getRegion,
    getRegionIDs: getRegionIDs,
    initializeRegions: initializeRegions,
    updateRegions: updateRegions,
    renderRegions: renderRegions,
    mountRegions: mountRegions,
    unmountRegions: unmountRegions
  };
};

exports['default'] = ViewComponent;
module.exports = exports['default'];

},{"../../nudoru/util/is.js":44,"../utils/Renderer.js":23,"../utils/Templating.js":26}],34:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});
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

exports["default"] = browserInfo;
module.exports = exports["default"];

},{}],35:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = {

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
module.exports = exports['default'];

},{}],36:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = {

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
module.exports = exports["default"];

},{}],37:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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

exports['default'] = MessageBoxCreator();
module.exports = exports['default'];

},{"./MessageBoxView":38}],38:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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

exports['default'] = MessageBoxView();
module.exports = exports['default'];

},{"../../nori/utils/Templating.js":26,"../../nudoru/browser/BrowserInfo.js":34,"../../nudoru/browser/DOMUtils.js":35,"../../nudoru/browser/ThreeDTransforms.js":36,"./ModalCoverView.js":39}],39:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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

exports['default'] = ModalCoverView();
module.exports = exports['default'];

},{"../../nudoru/browser/BrowserInfo.js":34}],40:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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

exports['default'] = ToastView();
module.exports = exports['default'];

},{"../../nori/utils/Templating.js":26,"../../nudoru/browser/BrowserInfo.js":34,"../../nudoru/browser/DOMUtils.js":35,"../../nudoru/browser/ThreeDTransforms.js":36}],41:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
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

exports['default'] = ToolTipView();
module.exports = exports['default'];

},{"../../nori/utils/Templating.js":26,"../../nudoru/browser/DOMUtils.js":35}],42:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = {

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
module.exports = exports["default"];

},{}],43:[function(require,module,exports){
Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = {

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
module.exports = exports['default'];

},{}],44:[function(require,module,exports){
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = {
  existy: function existy(x) {
    return x !== null;
  },
  truthy: function truthy(x) {
    return x !== false && this.existy(x);
  },
  falsey: function falsey(x) {
    return !this.truthy(x);
  },
  func: function func(object) {
    return typeof object === "function";
  },
  object: function object(_object) {
    return Object.prototype.toString.call(_object) === "[object Object]";
  },
  objectEmpty: function objectEmpty(object) {
    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        return false;
      }
    }
    return true;
  },
  string: function string(object) {
    return Object.prototype.toString.call(object) === "[object String]";
  },
  array: function array(object) {
    return Array.isArray(object);
    //return Object.prototype.toString.call(object) === '[object Array]';
  },
  promise: function promise(_promise) {
    return _promise && typeof _promise.then === 'function';
  },
  observable: function observable(_observable) {
    return _observable && typeof _observable.subscribe === 'function';
  },
  element: function element(obj) {
    return typeof HTMLElement === 'object' ? obj instanceof HTMLElement || obj instanceof DocumentFragment : //DOM2
    obj && typeof obj === 'object' && obj !== null && (obj.nodeType === 1 || obj.nodeType === 11) && typeof obj.nodeName === 'string';
  }
};
module.exports = exports["default"];

},{}],45:[function(require,module,exports){
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

},{}]},{},[12])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3N0b3JlL0FwcFN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L0FwcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvUmVnaW9uLlBsYXllclN0YXRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5HYW1lT3Zlci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uTWFpbkdhbWUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLlBsYXllclNlbGVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uVGl0bGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLldhaXRpbmdPblBsYXllci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9tYWluLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvTm9yaS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvUmVzdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvSW1tdXRhYmxlTWFwLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1JlbmRlcmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUm91dGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUnguanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRE9NTWFuaXB1bGF0aW9uLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpbk51ZG9ydUNvbnRyb2xzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpblN0b3JlU3RhdGVWaWV3cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvVmlld0NvbXBvbmVudC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hDcmVhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01vZGFsQ292ZXJWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29tcG9uZW50cy9Ub29sVGlwVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29yZS9OdW1iZXJVdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29yZS9PYmplY3RVdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvdXRpbC9pcy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy92ZW5kb3IvaW1tdXRhYmxlLm1pbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs2QkNBcUIscUJBQXFCOztJQUE5QixHQUFHOztxQ0FD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Q2xDO0NBQ0Y7Ozs7Ozs7Ozs7OztBQ3BDRCxDQUFDLENBQUEsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBUSxJQUFFLE9BQU8sT0FBTyxJQUFFLFdBQVcsSUFBRSxPQUFPLE1BQU0sR0FBQyxNQUFNLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLE1BQU0sSUFBRSxNQUFNLENBQUMsR0FBRyxHQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBRSxDQUFBO0NBQUMsQ0FBQSxDQUFDLElBQUksRUFBQyxZQUFVO0FBQUMsY0FBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxDQUFDLFNBQVMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBTyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsUUFBUSxJQUFFLE9BQU8sQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFHLEVBQUUsR0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLFVBQVUsS0FBRyxDQUFDLEVBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTSxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxLQUFJLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFNLEVBQUMsS0FBSyxFQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxPQUFNLFVBQVUsSUFBRSxPQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsSUFBRSxRQUFRLElBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQ0FBQyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUUsUUFBUSxFQUFFLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUNqZ0UsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsY0FBYyxHQUFDLEVBQUUsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsUUFBUSxJQUFFLE9BQU8sQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyx3RUFBd0UsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsK0NBQStDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsUUFBUSxJQUFFLE9BQU8sQ0FBQyxJQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxnRUFBZ0UsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxVQUFNLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFDO0FBQUMsV0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU0sVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLFdBQVcsS0FBRyxNQUFNLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsVUFBVSxHQUFDLFVBQVUsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFDcGdFLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQSxBQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxRQUFRLEtBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFJLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLFVBQVUsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxVQUFVLEdBQUUsQ0FBQyxJQUFFLFVBQVUsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsSUFBRyxRQUFRLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBRyxRQUFRLEtBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsYUFBYSxHQUFDLENBQUMsR0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxLQUFHLEVBQUUsS0FBRyxFQUFFLEdBQUMsQ0FBQyxFQUFDLEVBQUUsR0FBQyxFQUFFLENBQUEsQUFBQyxFQUFDLEVBQUUsRUFBRSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxDQUFDLElBQUcsRUFBRSxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQSxBQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFFLEVBQUM7QUFBQyxXQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsb0JBQW9CLElBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxFQUFDLFVBQVUsR0FBQyxFQUFFLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsRUFBRSxDQUFBLEVBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSTtBQUFDLFVBQUcsS0FBSyxDQUFDLEtBQUcsRUFBRSxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxNQUFNLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDLElBQUcsRUFBRSxFQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxFQUFDLFVBQVUsRUFBQyxDQUFDLENBQUMsRUFBQyxZQUFZLEVBQUMsQ0FBQyxDQUFDLEVBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsb0JBQW9CLElBQUUsQ0FBQyxDQUFDLG9CQUFvQixLQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFDLENBQUMsQ0FBQyxvQkFBb0IsR0FBQyxZQUFVO0FBQUMsZUFBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxZQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUMsTUFBTSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUM7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxFQUFDLFFBQU8sQ0FBQyxDQUFDLFFBQVEsR0FBRSxLQUFLLENBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsZUFBZSxJQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFBLENBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLE1BQUUsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxtREFBbUQsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxlQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDemdFLEVBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsS0FBRyxFQUFFLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxjQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUM7QUFBQyxnQkFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7V0FBQyxPQUFPLENBQUMsQ0FBQTtTQUFDLENBQUMsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLEVBQUUsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsV0FBVyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLEtBQUssQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsaUJBQU87QUFBQyxjQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO2NBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Y0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQztPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsRUFBRSxDQUFBLENBQUUsU0FBUyxFQUFFLENBQUM7QUFDOWdFLEtBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZ0JBQU8sQ0FBQyxHQUFDLENBQUMsSUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRTs7OzhCQUFTO1VBQVIsQ0FBQztVQUFDLENBQUM7VUFBQyxDQUFDO1VBQUMsQ0FBQztBQUFNLE9BQUMsR0FBeUUsQ0FBQyxHQUFRLENBQUMsR0FBcUUsQ0FBQyxHQUFDLENBQUMsR0FBNEIsQ0FBQzs7QUFBN0wsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDO2FBQVcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLFdBQVcsRUFBRTtjQUFDLENBQUM7Y0FBQyxDQUFDO2NBQUMsQ0FBQzs7O09BQUUsSUFBSSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxJQUFFLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZ0JBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsS0FBSyxDQUFDLElBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxBQUFDLENBQUE7U0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsaUJBQUssQ0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQztHQUFBLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsS0FBSyxDQUFDLElBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBSSxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFFO0FBQUMsZUFBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsRUFBQyxPQUFPLENBQUMsSUFBRSxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7U0FBQyxRQUFNLENBQUMsRUFBRTtBQUN2Z0UsZUFBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQztLQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsa0JBQU0sQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7U0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsRUFBRTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsZUFBSyxDQUFDLEdBQUU7QUFBQyxjQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQyxFQUFDO0FBQUMsZ0JBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsRUFBRSxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBLEFBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtXQUFDLE1BQUssQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtTQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFNLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsZUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUEsS0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQUFBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxLQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQ2hnRSxhQUFPLENBQUMsQ0FBQyxJQUFJLENBQUE7S0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGdCQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFJLENBQUMsQ0FBQyxRQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtTQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxJQUFJLENBQUE7U0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsS0FBSyxDQUFBO1NBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLHlCQUF5QixHQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxDQUFFLFNBQVMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxJQUFJLENBQUEsR0FBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLG1DQUFtQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsS0FBSyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEtBQUssRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE1BQUk7QUFBQyxVQUFHLENBQUMsS0FBRyxFQUFFLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFDamdFLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLFdBQVcsS0FBRyxFQUFFLElBQUUsQ0FBQyxDQUFDLFdBQVcsS0FBRyxFQUFFLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLENBQUMsT0FBTyxLQUFHLENBQUMsRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEVBQUEsQ0FBQSxBQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsTUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsYUFBYSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFBO09BQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBQyxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxDQUFDLENBQUEsQ0FBRSxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBTyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsR0FBQyxVQUFVLEVBQUMsQ0FBQyxHQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsU0FBUyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxHQUFDLFNBQVMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLEVBQUUsRUFBQyxHQUFHLEdBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsRUFBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxFQUFDLFFBQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDLENBQUMsQ0FBQSxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQ2poRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLElBQUcsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsRUFBRSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsSUFBSSxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLEVBQUUsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxZQUFVO0FBQUMsWUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFBLENBQUE7S0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUs7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsR0FBRSxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsRUFBRSxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUEsQUFBQyxFQUFDLFlBQVU7QUFBQyxpQkFBTztBQUFDLGNBQUcsQ0FBQyxFQUFDO0FBQUMsZ0JBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLElBQUcsQ0FBQyxLQUFHLEVBQUUsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFBO1dBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLENBQUMsQ0FBQTtTQUFDO09BQUMsQ0FBQSxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVM7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxHQUFDLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLEVBQUE7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztBQUNya0UsUUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFFLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsR0FBQyxFQUFFLEdBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQztBQUFDLE9BQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLElBQUUsRUFBRSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLElBQUksRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFDLE1BQU0sQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsR0FBRSxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsSUFBRSxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLElBQUUsRUFBRSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLEVBQUUsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxFQUFFLElBQUUsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUMsQ0FBQyxDQUFDLFNBQVMsS0FBRyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQSxBQUFDLENBQUEsSUFBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE1BQUssSUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxNQUFLLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNwZ0UsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLFNBQUYsQ0FBQyxDQUFVLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxZQUFZLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQSxBQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGNBQWMsR0FBQyxDQUFDLENBQUE7T0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxXQUFXLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsS0FBSyxJQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFFLFFBQVEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDLEVBQUU7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUMsR0FBRyxFQUFDLGVBQVU7QUFBQyxlQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLFVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLG9DQUFvQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsV0FBVyxJQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFJO0FBQ3hoRSxPQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU0sQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLEtBQUssQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsRUFBRSxJQUFJLFlBQVksRUFBRSxDQUFBLEFBQUMsRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFHLENBQUMsRUFBQywwQkFBMEIsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksQ0FBQSxFQUFDO0FBQUMsVUFBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQTtLQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsRUFBRSxJQUFJLFlBQVksRUFBRSxDQUFBLEFBQUMsRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLENBQUEsRUFBQztBQUFDLFVBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUE7S0FBQztHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxXQUFTLEdBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxTQUFTLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxRQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sQ0FBQyxxQkFBcUIsSUFBRSxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLFlBQVU7QUFBQyxhQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxZQUFVO0FBQUMsYUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sUUFBUSxJQUFFLE9BQU8sQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxHQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFFLEVBQUUsR0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFFLEVBQUMsU0FBUyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUUsRUFBRSxHQUFDLENBQUMsS0FBRyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsVUFBVSxHQUFDLENBQUMsQ0FBQSxHQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxFQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEVBQUMsVUFBVSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLFVBQVUsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxJQUFJLEVBQUUsR0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUs7TUFBQyxFQUFFLEdBQUMsUUFBUTtNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLENBQUMsSUFBRSxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLEVBQUM7TUFBQyxFQUFFLEdBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsVUFBVSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsYUFBYSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyw0QkFBNEI7TUFBQyxFQUFFLEdBQUMseUJBQXlCO01BQUMsRUFBRSxHQUFDLDJCQUEyQjtNQUFDLEVBQUUsR0FBQywyQkFBMkI7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsVUFBVSxJQUFFLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxRQUFRO01BQUMsRUFBRSxHQUFDLFlBQVk7TUFBQyxFQUFFLEdBQUMsRUFBRSxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTSxZQUFZLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsRUFBRSxFQUNyZ0UsQ0FBQyxDQUFDLE1BQU0sR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU0sRUFBRSxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFlBQVU7QUFBQyxZQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBRSxJQUFJLENBQUMsaUJBQWlCLEtBQUcsSUFBSSxDQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQSxBQUFDLEVBQUMsSUFBSSxDQUFBLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU07UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRztBQUNoa0UsV0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsY0FBYyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUUsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLEdBQUU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBLEVBQUMsTUFBSztLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLGNBQWM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO09BQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtNQUFDLEVBQUUsR0FBQyxVQUFVLElBQUUsT0FBTyxJQUFJLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsS0FBSyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUcsRUFBRSxDQUFBLEdBQUUsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsRUFBRSxDQUFBLEFBQUMsSUFBRSxFQUFFLEtBQUcsQ0FBQyxDQUFBLEFBQUMsR0FBQyxDQUFDLENBQUE7R0FBQztNQUFDLEVBQUUsR0FBQyxNQUFNLENBQUMsWUFBWTtNQUFDLEVBQUUsR0FBQyxDQUFBLFlBQVU7QUFBQyxRQUFHO0FBQUMsY0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsQ0FBQyxDQUFBO0tBQUM7R0FBQyxDQUFBLEVBQUU7TUFBQyxFQUFFLEdBQUMsVUFBVSxJQUFFLE9BQU8sT0FBTyxDQUFDLEVBQUUsS0FBRyxFQUFFLEdBQUMsSUFBSSxPQUFPLEVBQUEsQ0FBQSxBQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxtQkFBbUIsQ0FBQyxVQUFVLElBQUUsT0FBTyxNQUFNLEtBQUcsRUFBRSxHQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBRTtNQUFDLEVBQUUsR0FBQyxHQUFHO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFFBQVEsS0FBRyxDQUFDLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxRQUFRLEtBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLElBQUksQ0FBQyxRQUFRLEVBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQztBQUN2Z0UsV0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUM7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsZUFBTztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFlBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQztPQUFDO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLFlBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsS0FBSyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLElBQUksRUFDNWdFLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxLQUFLLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFNLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUUsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU0sVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEdBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUMsSUFBSSxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUEsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsS0FBSyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxHQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsdUJBQXVCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLENBQUEsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBRSxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFDbmlFLENBQUMsSUFBRSxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRSxDQUFBLEFBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU07UUFBQyxDQUFDLEdBQUMsQ0FBQyxNQUFJLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUM7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLElBQUUsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRTtRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsRUFBRSxFQUFDLEVBQUUsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsTUFBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxDQUFDLElBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPLEVBQUMsT0FBTyxDQUFDLEdBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEdBQUUsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU8sSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDemhFLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFBO0tBQUM7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFFO0FBQUMsVUFBSSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUM7QUFBQyxZQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtPQUFDLE1BQUssSUFBRyxDQUFDLENBQUMsT0FBTyxFQUFDO0FBQUMsYUFBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLE1BQUssS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsY0FBRyxDQUFDLENBQUMsS0FBSyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLFNBQVE7T0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtLQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRTtNQUFDLEVBQUUsR0FBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUEsRUFBQztBQUFDLE9BQUMsSUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLFNBQVM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLFNBQVMsQ0FBQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEtBQUssQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUM7R0FDL2hFLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUEsS0FBSSxFQUFFLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxHQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxJQUFJLENBQUMsTUFBTSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHdCQUF3QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxVQUFVLEdBQUMsRUFBRSxDQUFDLFVBQVUsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUcsQ0FBQyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUEsRUFBQyxPQUFPLElBQUksQ0FBQTtLQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsUUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLE1BQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUcsQ0FBQyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRTtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsRUFBRSxDQUFDO0dBQ25nRSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsWUFBWSxHQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFFLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxRQUFHLENBQUMsS0FBRyxTQUFTLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxTQUFTLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxFQUFDLEtBQUssRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLENBQUEsRUFBQyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUE7S0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNpRSxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBRSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxHQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFHLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxPQUFPLENBQUMsRUFBRSxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyx5QkFBeUI7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLFVBQVUsR0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsS0FBSyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNoaEUsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyx1QkFBdUI7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsWUFBWSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsUUFBRyxJQUFJLENBQUMsU0FBUyxFQUFDLFFBQU8sSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksQ0FBQSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxLQUFLLENBQUMsMEJBQTBCLEdBQUMsQ0FBQyxHQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFDdGhFLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsVUFBVSxHQUFDLFVBQVUsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssR0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxHQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUEsR0FBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEtBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLFlBQVksRUFBRSxHQUFDLElBQUksQ0FBQyxNQUFNLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxJQUFJLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLEtBQUssS0FBRyxDQUFDLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUM7R0FDcGdFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxXQUFXLEdBQUMsV0FBVyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsR0FBRyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsVUFBVSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsWUFBWSxFQUFDLHdCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7S0FBQyxFQUFDLFVBQVUsRUFBQyxzQkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxRQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsWUFBWSxFQUFDLHdCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFlBQVksRUFBQyx3QkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTSxZQUFZLENBQUE7S0FBQyxFQUFDLFVBQVUsRUFBQyxvQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxHQUFHLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQy9nRSxVQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxLQUFLLENBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsYUFBYSxFQUFDLHVCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGNBQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxRQUFPLFNBQVMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsV0FBVyxFQUFDLHVCQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sS0FBSyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBVTtBQUFDLGVBQU0sQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLFFBQU8sQ0FBQyxDQUFDLFlBQVksR0FBQyxZQUFVO0FBQUMsZUFBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDeGdFLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFlBQVksRUFBQyx3QkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxHQUFFO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFBO09BQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsS0FBRyxFQUFFLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUcsRUFBRSxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxDQUFDLEdBQUMsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLG9CQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFD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LElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsZ0JBQWdCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxVQUFVLEVBQUMsc0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxXQUFXLEVBQUMscUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLGFBQWEsRUFBQyx1QkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQTtPQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLEtBQUssQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsc0JBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBLEFBQUMsRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3ZnRSxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxlQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0tBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxFQUFDLFFBQVEsRUFBQyxDQUFDLEVBQUMsR0FBRyxFQUFDLENBQUMsRUFBQyxVQUFVLEVBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBQyxFQUFFLEVBQUMsVUFBVSxFQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBQyxFQUFFLEVBQUMsR0FBRyxFQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUMsRUFBRSxFQUFDLE1BQU0sRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFDLEVBQUUsRUFBQyxNQUFNLEVBQUMsRUFBRSxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0NBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCAqIGFzIF9yeCBmcm9tICcuLi9ub3JpL3V0aWxzL1J4LmpzJztcbmltcG9ydCAqIGFzIF9hcHBBY3Rpb25zIGZyb20gJy4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnO1xuaW1wb3J0ICogYXMgX25vcmlBY3Rpb25zIGZyb20gJy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnO1xuaW1wb3J0ICogYXMgX3NvY2tldElPRXZlbnRzIGZyb20gJy4uL25vcmkvc2VydmljZS9Tb2NrZXRJT0V2ZW50cy5qcyc7XG5cbmltcG9ydCAqIGFzIF9hcHBTdG9yZSBmcm9tICcuL3N0b3JlL0FwcFN0b3JlLmpzJztcbmltcG9ydCAqIGFzIF9hcHBWaWV3IGZyb20gJy4vdmlldy9BcHBWaWV3LmpzJztcbmltcG9ydCAqIGFzIF9Tb2NrZXQgZnJvbSAnLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJztcblxuLyoqXG4gKiBcIkNvbnRyb2xsZXJcIiBmb3IgYSBOb3JpIGFwcGxpY2F0aW9uLiBUaGUgY29udHJvbGxlciBpcyByZXNwb25zaWJsZSBmb3JcbiAqIGJvb3RzdHJhcHBpbmcgdGhlIGFwcCBhbmQgcG9zc2libHkgaGFuZGxpbmcgc29ja2V0L3NlcnZlciBpbnRlcmFjdGlvbi5cbiAqIEFueSBhZGRpdGlvbmFsIGZ1bmN0aW9uYWxpdHkgc2hvdWxkIGJlIGhhbmRsZWQgaW4gYSBzcGVjaWZpYyBtb2R1bGUuXG4gKi9cbnZhciBBcHAgPSBOb3JpLmNyZWF0ZUFwcGxpY2F0aW9uKHtcblxuICBtaXhpbnM6IFtdLFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGhlIG1haW4gTm9yaSBBcHAgc3RvcmUgYW5kIHZpZXcuXG4gICAqL1xuICBzdG9yZSA6IF9hcHBTdG9yZSxcbiAgdmlldyAgOiBfYXBwVmlldyxcbiAgc29ja2V0OiBfU29ja2V0LFxuXG4gIC8qKlxuICAgKiBJbnRpYWxpemUgdGhlIGFwcGlsY2F0aW9uLCB2aWV3IGFuZCBzdG9yZVxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc29ja2V0LmluaXRpYWxpemUoKTtcbiAgICB0aGlzLnNvY2tldC5zdWJzY3JpYmUodGhpcy5oYW5kbGVTb2NrZXRNZXNzYWdlLmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy52aWV3LmluaXRpYWxpemUoKTtcblxuICAgIHRoaXMuc3RvcmUuaW5pdGlhbGl6ZSgpOyAvLyBzdG9yZSB3aWxsIGFjcXVpcmUgZGF0YSBkaXNwYXRjaCBldmVudCB3aGVuIGNvbXBsZXRlXG4gICAgdGhpcy5zdG9yZS5zdWJzY3JpYmUoJ3N0b3JlSW5pdGlhbGl6ZWQnLCB0aGlzLm9uU3RvcmVJbml0aWFsaXplZC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnN0b3JlLmxvYWRTdG9yZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZnRlciB0aGUgc3RvcmUgZGF0YSBpcyByZWFkeVxuICAgKi9cbiAgb25TdG9yZUluaXRpYWxpemVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5ydW5BcHBsaWNhdGlvbigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIFwiUGxlYXNlIHdhaXRcIiBjb3ZlciBhbmQgc3RhcnQgdGhlIGFwcFxuICAgKi9cbiAgcnVuQXBwbGljYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnZpZXcucmVtb3ZlTG9hZGluZ01lc3NhZ2UoKTtcblxuICAgIC8vIFZpZXcgd2lsbCBzaG93IGJhc2VkIG9uIHRoZSBjdXJyZW50IHN0b3JlIHN0YXRlXG4gICAgLy90aGlzLnN0b3JlLnNldFN0YXRlKHtjdXJyZW50U3RhdGU6ICdNQUlOX0dBTUUnfSk7XG4gICAgdGhpcy5zdG9yZS5zZXRTdGF0ZSh7Y3VycmVudFN0YXRlOiAnUExBWUVSX1NFTEVDVCd9KTtcbiAgfSxcblxuICAvKipcbiAgICogQWxsIG1lc3NhZ2VzIGZyb20gdGhlIFNvY2tldC5JTyBzZXJ2ZXIgd2lsbCBiZSBmb3J3YXJkZWQgaGVyZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgaGFuZGxlU29ja2V0TWVzc2FnZTogZnVuY3Rpb24gKHBheWxvYWQpIHtcbiAgICBpZiAoIXBheWxvYWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhcImZyb20gU29ja2V0LklPIHNlcnZlclwiLCBwYXlsb2FkKTtcblxuICAgIHN3aXRjaCAocGF5bG9hZC50eXBlKSB7XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuQ09OTkVDVCk6XG4gICAgICAgIHRoaXMuaGFuZGxlQ29ubmVjdChwYXlsb2FkLmlkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkpPSU5fUk9PTSk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiam9pbiByb29tXCIsIHBheWxvYWQucGF5bG9hZCk7XG4gICAgICAgIHRoaXMuaGFuZGxlSm9pbk5ld2x5Q3JlYXRlZFJvb20ocGF5bG9hZC5wYXlsb2FkLnJvb21JRCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5HQU1FX1NUQVJUKTpcbiAgICAgICAgY29uc29sZS5sb2coXCJHQU1FIFNUQVJURURcIik7XG4gICAgICAgIHRoaXMuaGFuZGxlR2FtZVN0YXJ0KHBheWxvYWQucGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5HQU1FX0FCT1JUKTpcbiAgICAgICAgdGhpcy5oYW5kbGVHYW1lQWJvcnQocGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5TWVNURU1fTUVTU0FHRSk6XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuQlJPQURDQVNUKTpcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5NRVNTQUdFKTpcbiAgICAgICAgdGhpcy52aWV3LmFsZXJ0KHBheWxvYWQucGF5bG9hZCwgcGF5bG9hZC50eXBlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS53YXJuKFwiVW5oYW5kbGVkIFNvY2tldElPIG1lc3NhZ2UgdHlwZVwiLCBwYXlsb2FkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSxcblxuICBoYW5kbGVDb25uZWN0OiBmdW5jdGlvbiAoc29ja2V0SUQpIHtcbiAgICB2YXIgc2V0U2Vzc2lvbklEID0gX2FwcEFjdGlvbnMuc2V0U2Vzc2lvblByb3BzKHtzb2NrZXRJT0lEOiBzb2NrZXRJRH0pLFxuICAgICAgICBzZXRMb2NhbElEICAgPSBfYXBwQWN0aW9ucy5zZXRMb2NhbFBsYXllclByb3BzKHtpZDogc29ja2V0SUR9KTtcblxuICAgIHRoaXMuc3RvcmUuYXBwbHkoW3NldFNlc3Npb25JRCwgc2V0TG9jYWxJRF0pO1xuICB9LFxuXG4gIGhhbmRsZUpvaW5OZXdseUNyZWF0ZWRSb29tOiBmdW5jdGlvbiAocm9vbUlEKSB7XG4gICAgdmFyIHNldFJvb20gICAgICAgICAgICAgICA9IF9hcHBBY3Rpb25zLnNldFNlc3Npb25Qcm9wcyh7cm9vbUlEOiByb29tSUR9KSxcbiAgICAgICAgc2V0V2FpdGluZ1NjcmVlblN0YXRlID0gX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogdGhpcy5zdG9yZS5nYW1lU3RhdGVzWzJdfSk7XG5cbiAgICB0aGlzLnN0b3JlLmFwcGx5KFtzZXRSb29tLCBzZXRXYWl0aW5nU2NyZWVuU3RhdGVdKTtcbiAgfSxcblxuICBoYW5kbGVHYW1lU3RhcnQ6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgdmFyIHJlbW90ZVBsYXllciAgICAgPSB0aGlzLnBsdWNrUmVtb3RlUGxheWVyKHBheWxvYWQucGxheWVycyksXG4gICAgICAgIHNldFJlbW90ZVBsYXllciAgPSBfYXBwQWN0aW9ucy5zZXRSZW1vdGVQbGF5ZXJQcm9wcyhyZW1vdGVQbGF5ZXIpLFxuICAgICAgICBzZXRHYW1lUGxheVN0YXRlID0gX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogdGhpcy5zdG9yZS5nYW1lU3RhdGVzWzNdfSk7XG5cbiAgICB0aGlzLnN0b3JlLmFwcGx5KFtzZXRSZW1vdGVQbGF5ZXIsIHNldEdhbWVQbGF5U3RhdGVdKTtcbiAgfSxcblxuICBwbHVja1JlbW90ZVBsYXllcjogZnVuY3Rpb24gKHBsYXllcnNBcnJ5KSB7XG4gICAgdmFyIGxvY2FsUGxheWVySUQgPSB0aGlzLnN0b3JlLmdldFN0YXRlKCkubG9jYWxQbGF5ZXIuaWQ7XG4gICAgY29uc29sZS5sb2coJ2ZpbHRlcmluZyBmb3InLCBsb2NhbFBsYXllcklELCBwbGF5ZXJzQXJyeSk7XG4gICAgcmV0dXJuIHBsYXllcnNBcnJ5LmZpbHRlcihmdW5jdGlvbiAocGxheWVyKSB7XG4gICAgICByZXR1cm4gcGxheWVyLmlkICE9PSBsb2NhbFBsYXllcklEO1xuICAgIH0pWzBdO1xuICB9LFxuXG4gIGhhbmRsZUdhbWVBYm9ydDogZnVuY3Rpb24gKHBheWxvYWQpIHtcbiAgICB0aGlzLnZpZXcuYWxlcnQocGF5bG9hZC5wYXlsb2FkLCBwYXlsb2FkLnR5cGUpO1xuICAgIHRoaXMuc3RvcmUuYXBwbHkoX2FwcEFjdGlvbnMucmVzZXRHYW1lKCkpO1xuICB9LFxuXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQXBwOyIsImV4cG9ydCBkZWZhdWx0IHtcbiAgTE9DQUxfUExBWUVSX0NPTk5FQ1QgICAgICAgOiAnTE9DQUxfUExBWUVSX0NPTk5FQ1QnLFxuICBTRVRfU0VTU0lPTl9QUk9QUyAgICAgICAgICA6ICdTRVRfU0VTU0lPTl9QUk9QUycsXG4gIFNFVF9MT0NBTF9QTEFZRVJfUFJPUFMgICAgIDogJ1NFVF9MT0NBTF9QTEFZRVJfUFJPUFMnLFxuICBTRVRfTE9DQUxfUExBWUVSX05BTUUgICAgICA6ICdTRVRfTE9DQUxfUExBWUVSX05BTUUnLFxuICBTRVRfTE9DQUxfUExBWUVSX0FQUEVBUkFOQ0U6ICdTRVRfTE9DQUxfUExBWUVSX0FQUEVBUkFOQ0UnLFxuICBTRVRfUkVNT1RFX1BMQVlFUl9QUk9QUyAgICA6ICdTRVRfUkVNT1RFX1BMQVlFUl9QUk9QUycsXG4gIFJFU0VUX0dBTUUgICAgICAgICAgICAgICAgIDogJ1JFU0VUX0dBTUUnXG4gIC8vU0VMRUNUX1BMQVlFUiAgICAgICAgICAgICAgOiAnU0VMRUNUX1BMQVlFUicsXG4gIC8vUkVNT1RFX1BMQVlFUl9DT05ORUNUICAgICAgOiAnUkVNT1RFX1BMQVlFUl9DT05ORUNUJyxcbiAgLy9HQU1FX1NUQVJUICAgICAgICAgICAgICAgICA6ICdHQU1FX1NUQVJUJyxcbiAgLy9MT0NBTF9RVUVTVElPTiAgICAgICAgICAgICA6ICdMT0NBTF9RVUVTVElPTicsXG4gIC8vUkVNT1RFX1FVRVNUSU9OICAgICAgICAgICAgOiAnUkVNT1RFX1FVRVNUSU9OJyxcbiAgLy9MT0NBTF9QTEFZRVJfSEVBTFRIX0NIQU5HRSA6ICdMT0NBTF9QTEFZRVJfSEVBTFRIX0NIQU5HRScsXG4gIC8vUkVNT1RFX1BMQVlFUl9IRUFMVEhfQ0hBTkdFOiAnUkVNT1RFX1BMQVlFUl9IRUFMVEhfQ0hBTkdFJyxcbiAgLy9HQU1FX09WRVIgICAgICAgICAgICAgICAgICA6ICdHQU1FX09WRVInXG59OyIsImltcG9ydCAqIGFzIF9hY3Rpb25Db25zdGFudHMgZnJvbSAnLi9BY3Rpb25Db25zdGFudHMuanMnO1xuaW1wb3J0ICogYXMgX2FwcFN0b3JlIGZyb20gJy4uL3N0b3JlL0FwcFN0b3JlLmpzJztcblxuLyoqXG4gKiBQdXJlbHkgZm9yIGNvbnZlbmllbmNlLCBhbiBFdmVudCAoXCJhY3Rpb25cIikgQ3JlYXRvciBhbGEgRmx1eCBzcGVjLiBGb2xsb3dcbiAqIGd1aWRlbGluZXMgZm9yIGNyZWF0aW5nIGFjdGlvbnM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBBY3Rpb25DcmVhdG9yID0ge1xuXG4gIHNldExvY2FsUGxheWVyUHJvcHM6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGxvY2FsUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFJlbW90ZVBsYXllclByb3BzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlICAgOiBfYWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcmVtb3RlUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFNlc3Npb25Qcm9wczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX2FjdGlvbkNvbnN0YW50cy5TRVRfU0VTU0lPTl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHNlc3Npb246IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgcmVzZXRHYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuUkVTRVRfR0FNRSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGN1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV0sXG4gICAgICAgICAgc2Vzc2lvbiAgICAgOiB7XG4gICAgICAgICAgICByb29tSUQgICAgOiAnJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbG9jYWxQbGF5ZXIgOiBfYXBwU3RvcmUuY3JlYXRlUGxheWVyUmVzZXRPYmplY3QoKSxcbiAgICAgICAgICByZW1vdGVQbGF5ZXI6IF9hcHBTdG9yZS5jcmVhdGVQbGF5ZXJSZXNldE9iamVjdCgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IEFjdGlvbkNyZWF0b3I7IiwiaW1wb3J0ICogYXMgX3Jlc3QgZnJvbSAnLi4vLi4vbm9yaS9zZXJ2aWNlL1Jlc3QuanMnO1xuaW1wb3J0ICogYXMgX25vcmlBY3Rpb25Db25zdGFudHMgZnJvbSAnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ29uc3RhbnRzLmpzJztcbmltcG9ydCAqIGFzIF9hcHBBY3Rpb25Db25zdGFudHMgZnJvbSAnLi4vYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyc7XG5pbXBvcnQgKiBhcyBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCBmcm9tICcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnO1xuaW1wb3J0ICogYXMgX21peGluUmVkdWNlclN0b3JlIGZyb20gJy4uLy4uL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMnO1xuaW1wb3J0ICogYXMgX251bVV0aWxzIGZyb20gJy4uLy4uL251ZG9ydS9jb3JlL051bWJlclV0aWxzLmpzJztcblxuXG5jb25zdCBfcmVzdE51bVF1ZXN0aW9ucyAgICAgPSAzLFxuICAgICAgX3Jlc3RRdWVzdGlvbkNhdGVnb3J5ID0gMjQ7IC8vIFNDSS9URUNoXG5cbi8qKlxuICogVGhpcyBhcHBsaWNhdGlvbiBzdG9yZSBjb250YWlucyBcInJlZHVjZXIgc3RvcmVcIiBmdW5jdGlvbmFsaXR5IGJhc2VkIG9uIFJlZHV4LlxuICogVGhlIHN0b3JlIHN0YXRlIG1heSBvbmx5IGJlIGNoYW5nZWQgZnJvbSBldmVudHMgYXMgYXBwbGllZCBpbiByZWR1Y2VyIGZ1bmN0aW9ucy5cbiAqIFRoZSBzdG9yZSByZWNlaXZlZCBhbGwgZXZlbnRzIGZyb20gdGhlIGV2ZW50IGJ1cyBhbmQgZm9yd2FyZHMgdGhlbSB0byBhbGxcbiAqIHJlZHVjZXIgZnVuY3Rpb25zIHRvIG1vZGlmeSBzdGF0ZSBhcyBuZWVkZWQuIE9uY2UgdGhleSBoYXZlIHJ1biwgdGhlXG4gKiBoYW5kbGVTdGF0ZU11dGF0aW9uIGZ1bmN0aW9uIGlzIGNhbGxlZCB0byBkaXNwYXRjaCBhbiBldmVudCB0byB0aGUgYnVzLCBvclxuICogbm90aWZ5IHN1YnNjcmliZXJzIHZpYSBhbiBvYnNlcnZhYmxlLlxuICpcbiAqIEV2ZW50cyA9PiBoYW5kbGVBcHBsaWNhdGlvbkV2ZW50cyA9PiBhcHBseVJlZHVjZXJzID0+IGhhbmRsZVN0YXRlTXV0YXRpb24gPT4gTm90aWZ5XG4gKi9cbnZhciBBcHBTdG9yZSA9IE5vcmkuY3JlYXRlU3RvcmUoe1xuXG4gIG1peGluczogW1xuICAgIF9taXhpblJlZHVjZXJTdG9yZSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdC5kZWZhdWx0KClcbiAgXSxcblxuICBnYW1lU3RhdGVzOiBbJ1RJVExFJywgJ1BMQVlFUl9TRUxFQ1QnLCAnV0FJVElOR19PTl9QTEFZRVInLCAnTUFJTl9HQU1FJywgJ0dBTUVfT1ZFUiddLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFkZFJlZHVjZXIodGhpcy5tYWluU3RhdGVSZWR1Y2VyKTtcbiAgICB0aGlzLmluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKTtcbiAgICB0aGlzLnNldFN0YXRlKE5vcmkuY29uZmlnKCkpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgnc3RvcmVJbml0aWFsaXplZCcpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgb3IgbG9hZCBhbnkgbmVjZXNzYXJ5IGRhdGEgYW5kIHRoZW4gYnJvYWRjYXN0IGEgaW5pdGlhbGl6ZWQgZXZlbnQuXG4gICAqL1xuICBsb2FkU3RvcmU6IGZ1bmN0aW9uICgpIHtcbiAgICAvL2h0dHBzOi8vbWFya2V0Lm1hc2hhcGUuY29tL3BhcmVzaGNob3VoYW4vdHJpdmlhXG4gICAgdmFyIGdldFF1ZXN0aW9ucyA9IF9yZXN0LnJlcXVlc3Qoe1xuICAgICAgbWV0aG9kIDogJ0dFVCcsXG4gICAgICAvL2h0dHBzOi8vcGFyZXNoY2hvdWhhbi10cml2aWEtdjEucC5tYXNoYXBlLmNvbS92MS9nZXRRdWl6UXVlc3Rpb25zQnlDYXRlZ29yeT9jYXRlZ29yeUlkPTEmbGltaXQ9MTAmcGFnZT0xXG4gICAgICB1cmwgICAgOiAnaHR0cHM6Ly9wYXJlc2hjaG91aGFuLXRyaXZpYS12MS5wLm1hc2hhcGUuY29tL3YxL2dldEFsbFF1aXpRdWVzdGlvbnM/bGltaXQ9JyArIF9yZXN0TnVtUXVlc3Rpb25zICsgJyZwYWdlPTEnLFxuICAgICAgaGVhZGVyczogW3snWC1NYXNoYXBlLUtleSc6ICd0UHhLZ0R2cmtxbXNoZzh6VzRvbFM4N2h6RjdBcDF2aTYzcmpzblV1Vncxc0JIVjlLSid9XSxcbiAgICAgIGpzb24gICA6IHRydWVcbiAgICB9KS5zdWJzY3JpYmUoXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICB9LFxuICAgICAgZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICB9KTtcblxuICAgIC8vIFNldCBpbml0aWFsIHN0YXRlXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBjdXJyZW50U3RhdGU6IHRoaXMuZ2FtZVN0YXRlc1swXSxcbiAgICAgIHNlc3Npb24gICAgIDoge1xuICAgICAgICBzb2NrZXRJT0lEOiAnJyxcbiAgICAgICAgcm9vbUlEICAgIDogJydcbiAgICAgIH0sXG4gICAgICBsb2NhbFBsYXllciA6IF8ubWVyZ2UodGhpcy5jcmVhdGVCbGFua1BsYXllck9iamVjdCgpLCB0aGlzLmNyZWF0ZVBsYXllclJlc2V0T2JqZWN0KCkpLFxuICAgICAgcmVtb3RlUGxheWVyOiBfLm1lcmdlKHRoaXMuY3JlYXRlQmxhbmtQbGF5ZXJPYmplY3QoKSwgdGhpcy5jcmVhdGVQbGF5ZXJSZXNldE9iamVjdCgpKSxcbiAgICAgIHF1ZXN0aW9uQmFuazogW11cbiAgICB9KTtcblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZignc3RvcmVJbml0aWFsaXplZCcpO1xuICB9LFxuXG4gIGNyZWF0ZUJsYW5rUGxheWVyT2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkICAgICAgICA6ICcnLFxuICAgICAgdHlwZSAgICAgIDogJycsXG4gICAgICBuYW1lICAgICAgOiAnTXlzdGVyeSBQbGF5ZXIgJyArIF9udW1VdGlscy5ybmROdW1iZXIoMTAwLCA5OTkpLFxuICAgICAgYXBwZWFyYW5jZTogJ2dyZWVuJ1xuICAgIH07XG4gIH0sXG5cbiAgY3JlYXRlUGxheWVyUmVzZXRPYmplY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaGVhbHRoICAgOiA2LFxuICAgICAgYmVoYXZpb3JzOiBbXSxcbiAgICAgIHNjb3JlICAgIDogMFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIE1vZGlmeSBzdGF0ZSBiYXNlZCBvbiBpbmNvbWluZyBldmVudHMuIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtb2RpZmllZFxuICAgKiBzdGF0ZSBhbmQgZG9lcyBub3QgbW9kaWZ5IHRoZSBzdGF0ZSBkaXJlY3RseS5cbiAgICogQ2FuIGNvbXBvc2Ugc3RhdGUgdHJhbnNmb3JtYXRpb25zXG4gICAqIHJldHVybiBfLmFzc2lnbih7fSwgc3RhdGUsIG90aGVyU3RhdGVUcmFuc2Zvcm1lcihzdGF0ZSkpO1xuICAgKiBAcGFyYW0gc3RhdGVcbiAgICogQHBhcmFtIGV2ZW50XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgbWFpblN0YXRlUmVkdWNlcjogZnVuY3Rpb24gKHN0YXRlLCBldmVudCkge1xuICAgIHN0YXRlID0gc3RhdGUgfHwge307XG5cbiAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcbiAgICAgIGNhc2UgX25vcmlBY3Rpb25Db25zdGFudHMuQ0hBTkdFX1NUT1JFX1NUQVRFOlxuICAgICAgY2FzZSBfYXBwQWN0aW9uQ29uc3RhbnRzLlNFVF9MT0NBTF9QTEFZRVJfUFJPUFM6XG4gICAgICBjYXNlIF9hcHBBY3Rpb25Db25zdGFudHMuU0VUX1JFTU9URV9QTEFZRVJfUFJPUFM6XG4gICAgICBjYXNlIF9hcHBBY3Rpb25Db25zdGFudHMuU0VUX1NFU1NJT05fUFJPUFM6XG4gICAgICBjYXNlIF9hcHBBY3Rpb25Db25zdGFudHMuUkVTRVRfR0FNRTpcbiAgICAgICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCBldmVudC5wYXlsb2FkLmRhdGEpO1xuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnNvbGUud2FybignUmVkdWNlciBzdG9yZSwgdW5oYW5kbGVkIGV2ZW50IHR5cGU6ICcgKyBldmVudC50eXBlKTtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ2FsbGVkIGFmdGVyIGFsbCByZWR1Y2VycyBoYXZlIHJ1biB0byBicm9hZGNhc3QgcG9zc2libGUgdXBkYXRlcy4gRG9lc1xuICAgKiBub3QgY2hlY2sgdG8gc2VlIGlmIHRoZSBzdGF0ZSB3YXMgYWN0dWFsbHkgdXBkYXRlZC5cbiAgICovXG4gIGhhbmRsZVN0YXRlTXV0YXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgc3RhdGUgPSB0aGlzLmdldFN0YXRlKCk7XG5cbiAgICBpZiAodGhpcy5zaG91bGRHYW1lRW5kKHN0YXRlKSkge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7Y3VycmVudFN0YXRlOiB0aGlzLmdhbWVTdGF0ZXNbNF19KTtcbiAgICB9XG5cbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzKHN0YXRlKTtcbiAgfSxcblxuICAvKipcbiAgICogV2hlbiBhIHBsYXllcidzIGhlYWx0aCByZWFjaGVzIDAsIHRoZSBnYW1lIGlzIG92ZXJcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc2hvdWxkR2FtZUVuZDogZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgaWYgKCFzdGF0ZS5sb2NhbFBsYXllciB8fCAhc3RhdGUucmVtb3RlUGxheWVyIHx8IHN0YXRlLmN1cnJlbnRTdGF0ZSAhPT0gJ01BSU5fR0FNRScpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgbG9jYWwgID0gc3RhdGUubG9jYWxQbGF5ZXIuaGVhbHRoLFxuICAgICAgICByZW1vdGUgPSBzdGF0ZS5yZW1vdGVQbGF5ZXIuaGVhbHRoO1xuXG4gICAgaWYgKGxvY2FsIDw9IDAgfHwgcmVtb3RlIDw9IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQXBwU3RvcmUoKTsiLCJpbXBvcnQgKiBhcyBfYXBwU3RvcmUgZnJvbSAnLi4vc3RvcmUvQXBwU3RvcmUuanMnO1xuaW1wb3J0ICogYXMgX21peGluQXBwbGljYXRpb25WaWV3IGZyb20gJy4uLy4uL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMnO1xuaW1wb3J0ICogYXMgX21peGluTnVkb3J1Q29udHJvbHMgZnJvbSAnLi4vLi4vbm9yaS92aWV3L01peGluTnVkb3J1Q29udHJvbHMuanMnO1xuaW1wb3J0ICogYXMgX21peGluQ29tcG9uZW50Vmlld3MgZnJvbSAnLi4vLi4vbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMnO1xuaW1wb3J0ICogYXMgX21peGluU3RvcmVTdGF0ZVZpZXdzIGZyb20gJy4uLy4uL25vcmkvdmlldy9NaXhpblN0b3JlU3RhdGVWaWV3cy5qcyc7XG5pbXBvcnQgKiBhcyBfbWl4aW5FdmVudERlbGVnYXRvciBmcm9tICcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5FdmVudERlbGVnYXRvci5qcyc7XG5pbXBvcnQgKiBhcyBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCBmcm9tICcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnO1xuXG4vKipcbiAqIFZpZXcgZm9yIGFuIGFwcGxpY2F0aW9uLlxuICovXG5cbnZhciBBcHBWaWV3ID0gTm9yaS5jcmVhdGVWaWV3KHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5BcHBsaWNhdGlvblZpZXcsXG4gICAgX21peGluTnVkb3J1Q29udHJvbHMsXG4gICAgX21peGluQ29tcG9uZW50Vmlld3MsXG4gICAgX21peGluU3RvcmVTdGF0ZVZpZXdzLFxuICAgIF9taXhpbkV2ZW50RGVsZWdhdG9yLmRlZmF1bHQoKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdC5kZWZhdWx0KClcbiAgXSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pbml0aWFsaXplQXBwbGljYXRpb25WaWV3KFsnYXBwbGljYXRpb25zY2FmZm9sZCcsICdhcHBsaWNhdGlvbmNvbXBvbmVudHNzY2FmZm9sZCddKTtcbiAgICB0aGlzLmluaXRpYWxpemVTdGF0ZVZpZXdzKF9hcHBTdG9yZSk7XG4gICAgdGhpcy5pbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKTtcblxuICAgIHRoaXMuY29uZmlndXJlVmlld3MoKTtcbiAgfSxcblxuICBjb25maWd1cmVWaWV3czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzY3JlZW5UaXRsZSAgICAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5UaXRsZS5qcycpKCksXG4gICAgICAgIHNjcmVlblBsYXllclNlbGVjdCAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLlBsYXllclNlbGVjdC5qcycpKCksXG4gICAgICAgIHNjcmVlbldhaXRpbmdPblBsYXllciA9IHJlcXVpcmUoJy4vU2NyZWVuLldhaXRpbmdPblBsYXllci5qcycpKCksXG4gICAgICAgIHNjcmVlbk1haW5HYW1lICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLk1haW5HYW1lLmpzJykoKSxcbiAgICAgICAgc2NyZWVuR2FtZU92ZXIgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uR2FtZU92ZXIuanMnKSgpLFxuICAgICAgICBnYW1lU3RhdGVzICAgICAgICAgICAgPSBfYXBwU3RvcmUuZ2FtZVN0YXRlcztcblxuICAgIHRoaXMuc2V0Vmlld01vdW50UG9pbnQoJyNjb250ZW50cycpO1xuXG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzBdLCAndGl0bGUnLCBzY3JlZW5UaXRsZSk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzFdLCAncGxheWVyc2VsZWN0Jywgc2NyZWVuUGxheWVyU2VsZWN0KTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbMl0sICd3YWl0aW5nb25wbGF5ZXInLCBzY3JlZW5XYWl0aW5nT25QbGF5ZXIpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1szXSwgJ2dhbWUnLCBzY3JlZW5NYWluR2FtZSk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzRdLCAnZ2FtZW92ZXInLCBzY3JlZW5HYW1lT3Zlcik7XG4gIH1cblxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IEFwcFZpZXcoKTsiLCJpbXBvcnQgKiBhcyBfbm9yaUFjdGlvbnMgZnJvbSAnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcic7XG5pbXBvcnQgKiBhcyBfYXBwVmlldyBmcm9tICcuL0FwcFZpZXcnO1xuaW1wb3J0ICogYXMgX2FwcFN0b3JlIGZyb20gJy4uL3N0b3JlL0FwcFN0b3JlJztcbmltcG9ydCAqIGFzIF90ZW1wbGF0ZSBmcm9tICcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBjb25maWdQcm9wcyBwYXNzZWQgaW4gZnJvbSByZWdpb24gZGVmaW5pdGlvbiBvbiBwYXJlbnQgVmlld1xuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIHRoaXMuYmluZE1hcChfYXBwU3RvcmUpOyAvLyBSZWR1Y2VyIHN0b3JlLCBtYXAgaWQgc3RyaW5nIG9yIG1hcCBvYmplY3RcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKSxcbiAgICAgICAgc3RhdHMgICAgPSBhcHBTdGF0ZS5sb2NhbFBsYXllcjtcbiAgICBpZiAodGhpcy5nZXRDb25maWdQcm9wcygpLnRhcmdldCA9PT0gJ3JlbW90ZScpIHtcbiAgICAgIHN0YXRzID0gYXBwU3RhdGUucmVtb3RlUGxheWVyO1xuICAgIH1cbiAgICByZXR1cm4gc3RhdHM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKSxcbiAgICAgICAgc3RhdHMgICAgPSBhcHBTdGF0ZS5sb2NhbFBsYXllcjtcbiAgICBpZiAodGhpcy5nZXRDb25maWdQcm9wcygpLnRhcmdldCA9PT0gJ3JlbW90ZScpIHtcbiAgICAgIHN0YXRzID0gYXBwU3RhdGUucmVtb3RlUGxheWVyO1xuICAgIH1cbiAgICByZXR1cm4gc3RhdHM7XG4gIH0sXG5cbiAgdGVtcGxhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaHRtbCA9IF90ZW1wbGF0ZS5nZXRTb3VyY2UoJ2dhbWVfX3BsYXllcnN0YXRzJyk7XG4gICAgcmV0dXJuIF8udGVtcGxhdGUoaHRtbCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IENvbXBvbmVudDsiLCJpbXBvcnQgKiBhcyBfbm9yaUFjdGlvbnMgZnJvbSAnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcic7XG5pbXBvcnQgKiBhcyBfYXBwVmlldyBmcm9tICcuL0FwcFZpZXcnO1xuaW1wb3J0ICogYXMgX2FwcFN0b3JlIGZyb20gJy4uL3N0b3JlL0FwcFN0b3JlJztcbmltcG9ydCAqIGFzIF90ZW1wbGF0ZSBmcm9tICcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnO1xuaW1wb3J0ICogYXMgX2FwcEFjdGlvbnMgZnJvbSAnLi4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnO1xuaW1wb3J0ICogYXMgX21peGluRE9NTWFuaXB1bGF0aW9uIGZyb20gJy4uLy4uL25vcmkvdmlldy9NaXhpbkRPTU1hbmlwdWxhdGlvbi5qcyc7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluRE9NTWFuaXB1bGF0aW9uXG4gIF0sXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICNnYW1lb3Zlcl9fYnV0dG9uLXJlcGxheSc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9hcHBBY3Rpb25zLnJlc2V0R2FtZSgpKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKSxcbiAgICAgICAgc3RhdGUgICAgPSB7XG4gICAgICAgICAgbmFtZSAgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICAgICAgYXBwZWFyYW5jZSA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICAgICAgbG9jYWxTY29yZSA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLnNjb3JlLFxuICAgICAgICAgIHJlbW90ZVNjb3JlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICAgICAgbG9jYWxXaW4gICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLnNjb3JlID4gYXBwU3RhdGUucmVtb3RlUGxheWVyLnNjb3JlLFxuICAgICAgICAgIHJlbW90ZVdpbiAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5zY29yZSA8IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZSxcbiAgICAgICAgICB0aWVXaW4gICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPT09IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZVxuICAgICAgICB9O1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuXG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fdGllJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fbG9vc2UnKTtcblxuICAgIGlmIChzdGF0ZS5sb2NhbFdpbikge1xuICAgICAgdGhpcy5zaG93RWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5yZW1vdGVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX2xvb3NlJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS50aWVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX3RpZScpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQ29tcG9uZW50OyIsImltcG9ydCAqIGFzIF9ub3JpQWN0aW9ucyBmcm9tICcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJztcbmltcG9ydCAqIGFzIF9hcHBWaWV3IGZyb20gJy4vQXBwVmlldyc7XG5pbXBvcnQgKiBhcyBfYXBwU3RvcmUgZnJvbSAnLi4vc3RvcmUvQXBwU3RvcmUnO1xuaW1wb3J0ICogYXMgX3RlbXBsYXRlIGZyb20gJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcyc7XG5pbXBvcnQgKiBhcyBfYXBwQWN0aW9ucyBmcm9tICcuLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcyc7XG5pbXBvcnQgKiBhcyBfc29ja2V0SU8gZnJvbSAnLi4vLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJztcbmltcG9ydCAqIGFzIF9yZWdpb25QbGF5ZXJTdGF0cyBmcm9tICcuL1JlZ2lvbi5QbGF5ZXJTdGF0cy5qcyc7XG5pbXBvcnQgKiBhcyBfbnVtVXRpbHMgZnJvbSAnLi4vLi4vbnVkb3J1L2NvcmUvTnVtYmVyVXRpbHMuanMnO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgZGVmaW5lUmVnaW9uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICBsb2NhbFBsYXllclN0YXRzIDogX3JlZ2lvblBsYXllclN0YXRzLmRlZmF1bHQoe1xuICAgICAgICBpZCAgICAgICAgOiAnZ2FtZV9fcGxheWVyc3RhdHMnLFxuICAgICAgICBtb3VudFBvaW50OiAnI2dhbWVfX2xvY2FscGxheWVyc3RhdHMnLFxuICAgICAgICB0YXJnZXQgICAgOiAnbG9jYWwnXG4gICAgICB9KSxcbiAgICAgIHJlbW90ZVBsYXllclN0YXRzOiBfcmVnaW9uUGxheWVyU3RhdHMuZGVmYXVsdCh7XG4gICAgICAgIGlkICAgICAgICA6ICdnYW1lX19wbGF5ZXJzdGF0cycsXG4gICAgICAgIG1vdW50UG9pbnQ6ICcjZ2FtZV9fcmVtb3RlcGxheWVyc3RhdHMnLFxuICAgICAgICB0YXJnZXQgICAgOiAncmVtb3RlJ1xuICAgICAgfSlcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI2dhbWVfX2J1dHRvbi1za2lwJzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbNF19KSk7XG4gICAgICB9LFxuICAgICAgJ2NsaWNrICNnYW1lX190ZXN0JyAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHN0YXRlICAgICAgICA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICAgICAgbG9jYWxTY29yZSAgID0gc3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgKyBfbnVtVXRpbHMucm5kTnVtYmVyKDAsIDUpLFxuICAgICAgICAgICAgbG9jYWxIZWFsdGggID0gc3RhdGUubG9jYWxQbGF5ZXIuaGVhbHRoICsgMSxcbiAgICAgICAgICAgIHJlbW90ZVNjb3JlICA9IHN0YXRlLnJlbW90ZVBsYXllci5zY29yZSArIF9udW1VdGlscy5ybmROdW1iZXIoMCwgNSksXG4gICAgICAgICAgICByZW1vdGVIZWFsdGggPSBzdGF0ZS5yZW1vdGVQbGF5ZXIuaGVhbHRoIC0gMTtcblxuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICAgICAgaGVhbHRoOiBsb2NhbEhlYWx0aCxcbiAgICAgICAgICBzY29yZSA6IGxvY2FsU2NvcmVcbiAgICAgICAgfSkpO1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX2FwcEFjdGlvbnMuc2V0UmVtb3RlUGxheWVyUHJvcHMoe1xuICAgICAgICAgIGhlYWx0aDogcmVtb3RlSGVhbHRoLFxuICAgICAgICAgIHNjb3JlIDogcmVtb3RlU2NvcmVcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIGxldCBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBsb2NhbCA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLFxuICAgICAgcmVtb3RlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXJcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcblxuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBDb21wb25lbnQ7IiwiaW1wb3J0ICogYXMgX25vcmlBY3Rpb25zIGZyb20gJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InO1xuaW1wb3J0ICogYXMgX2FwcFZpZXcgZnJvbSAnLi9BcHBWaWV3JztcbmltcG9ydCAqIGFzIF9hcHBTdG9yZSBmcm9tICcuLi9zdG9yZS9BcHBTdG9yZSc7XG5pbXBvcnQgKiBhcyBfdGVtcGxhdGUgZnJvbSAnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJztcbmltcG9ydCAqIGFzIF9hcHBBY3Rpb25zIGZyb20gJy4uL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJztcbmltcG9ydCAqIGFzIF9zb2NrZXRJTyBmcm9tICcuLi8uLi9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMnO1xuXG5sZXQgX3Jvb21OdW1iZXJMZW5ndGggPSA0O1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdibHVyICNzZWxlY3RfX3BsYXllcm5hbWUnICAgICAgICA6IHRoaXMuc2V0UGxheWVyTmFtZS5iaW5kKHRoaXMpLFxuICAgICAgJ2NoYW5nZSAjc2VsZWN0X19wbGF5ZXJ0eXBlJyAgICAgIDogdGhpcy5zZXRQbGF5ZXJBcHBlYXJhbmNlLmJpbmQodGhpcyksXG4gICAgICAnY2xpY2sgI3NlbGVjdF9fYnV0dG9uLWpvaW5yb29tJyAgOiB0aGlzLm9uSm9pblJvb20uYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tY3JlYXRlcm9vbSc6IHRoaXMub25DcmVhdGVSb29tLmJpbmQodGhpcyksXG4gICAgICAnY2xpY2sgI3NlbGVjdF9fYnV0dG9uLWdvJyAgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1syXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFBsYXllck5hbWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBhY3Rpb24gPSBfYXBwQWN0aW9ucy5zZXRMb2NhbFBsYXllclByb3BzKHtcbiAgICAgIG5hbWU6IHZhbHVlXG4gICAgfSk7XG4gICAgX2FwcFN0b3JlLmFwcGx5KGFjdGlvbik7XG4gIH0sXG5cbiAgc2V0UGxheWVyQXBwZWFyYW5jZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGFjdGlvbiA9IF9hcHBBY3Rpb25zLnNldExvY2FsUGxheWVyUHJvcHMoe1xuICAgICAgYXBwZWFyYW5jZTogdmFsdWVcbiAgICB9KTtcbiAgICBfYXBwU3RvcmUuYXBwbHkoYWN0aW9uKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICBhcHBlYXJhbmNlOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5hcHBlYXJhbmNlXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmdldEluaXRpYWxTdGF0ZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJ0eXBlJykudmFsdWUgPSB0aGlzLmdldFN0YXRlKCkuYXBwZWFyYW5jZTtcbiAgfSxcblxuICBvbkNyZWF0ZVJvb206IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVVzZXJEZXRhaWxzSW5wdXQoKSkge1xuICAgICAgX3NvY2tldElPLm5vdGlmeVNlcnZlcihfc29ja2V0SU8uZXZlbnRzKCkuQ1JFQVRFX1JPT00sIHtcbiAgICAgICAgcGxheWVyRGV0YWlsczogX2FwcFN0b3JlLmdldFN0YXRlKCkubG9jYWxQbGF5ZXJcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBvbkpvaW5Sb29tOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJvb21JRCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3Jvb21pZCcpLnZhbHVlO1xuICAgIGlmICh0aGlzLnZhbGlkYXRlUm9vbUlEKHJvb21JRCkpIHtcbiAgICAgIF9zb2NrZXRJTy5ub3RpZnlTZXJ2ZXIoX3NvY2tldElPLmV2ZW50cygpLkpPSU5fUk9PTSwge1xuICAgICAgICByb29tSUQgICAgICAgOiByb29tSUQsXG4gICAgICAgIHBsYXllckRldGFpbHM6IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLmxvY2FsUGxheWVyXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2FwcFZpZXcuYWxlcnQoJ1RoZSByb29tIElEIGlzIG5vdCBjb3JyZWN0LiBEb2VzIGl0IGNvbnRhaW4gbGV0dGVycyBvciBpcyBsZXNzIHRoYW4gJytfcm9vbU51bWJlckxlbmd0aCsnIGRpZ2l0cz8nLCAnQmFkIFJvb20gSUQnKTtcbiAgICB9XG4gIH0sXG5cbiAgdmFsaWRhdGVVc2VyRGV0YWlsc0lucHV0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5hbWUgICAgICAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJuYW1lJykudmFsdWUsXG4gICAgICAgIGFwcGVhcmFuY2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJ0eXBlJykudmFsdWU7XG5cbiAgICBpZiAoIW5hbWUubGVuZ3RoIHx8ICFhcHBlYXJhbmNlKSB7XG4gICAgICBfYXBwVmlldy5hbGVydCgnTWFrZSBzdXJlIHlvdVxcJ3ZlIHR5cGVkIGEgbmFtZSBmb3IgeW91cnNlbGYgYW5kIHNlbGVjdGVkIGFuIGFwcGVhcmFuY2UnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJvb20gSUQgbXVzdCBiZSBhbiBpbnRlZ2VyIGFuZCA1IGRpZ2l0c1xuICAgKiBAcGFyYW0gcm9vbUlEXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgdmFsaWRhdGVSb29tSUQ6IGZ1bmN0aW9uIChyb29tSUQpIHtcbiAgICBpZiAoaXNOYU4ocGFyc2VJbnQocm9vbUlEKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHJvb21JRC5sZW5ndGggIT09IF9yb29tTnVtYmVyTGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBDb21wb25lbnQ7IiwiaW1wb3J0ICogYXMgX25vcmlBY3Rpb25zIGZyb20gJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InO1xuaW1wb3J0ICogYXMgX2FwcFZpZXcgZnJvbSAnLi9BcHBWaWV3JztcbmltcG9ydCAqIGFzIF9hcHBTdG9yZSBmcm9tICcuLi9zdG9yZS9BcHBTdG9yZSc7XG5pbXBvcnQgKiBhcyBfdGVtcGxhdGUgZnJvbSAnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJztcblxuY29uc29sZS5sb2coJ3RpdGxlJywgX2FwcFZpZXcpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjdGl0bGVfX2J1dHRvbi1zdGFydCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQ29tcG9uZW50OyIsImltcG9ydCAqIGFzIF9ub3JpQWN0aW9ucyBmcm9tICcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJztcbmltcG9ydCAqIGFzIF9hcHBWaWV3IGZyb20gJy4vQXBwVmlldyc7XG5pbXBvcnQgKiBhcyBfYXBwU3RvcmUgZnJvbSAnLi4vc3RvcmUvQXBwU3RvcmUnO1xuaW1wb3J0ICogYXMgX3RlbXBsYXRlIGZyb20gJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcyc7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICN3YWl0aW5nX19idXR0b24tc2tpcCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzNdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZSxcbiAgICAgIHJvb21JRCAgICA6IGFwcFN0YXRlLnNlc3Npb24ucm9vbUlEXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZSxcbiAgICAgIHJvb21JRCAgICA6IGFwcFN0YXRlLnNlc3Npb24ucm9vbUlEXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQ29tcG9uZW50OyIsIi8qKlxuICogSW5pdGlhbCBmaWxlIGZvciB0aGUgQXBwbGljYXRpb25cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgLyoqXG4gICAqIElFIHZlcnNpb25zIDkgYW5kIHVuZGVyIGFyZSBibG9ja2VkLCBvdGhlcnMgYXJlIGFsbG93ZWQgdG8gcHJvY2VlZFxuICAgKi9cbiAgaWYoX2Jyb3dzZXJJbmZvLm5vdFN1cHBvcnRlZCB8fCBfYnJvd3NlckluZm8uaXNJRTkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuaW5uZXJIVE1MID0gJzxoMz5Gb3IgdGhlIGJlc3QgZXhwZXJpZW5jZSwgcGxlYXNlIHVzZSBJbnRlcm5ldCBFeHBsb3JlciAxMCssIEZpcmVmb3gsIENocm9tZSBvciBTYWZhcmkgdG8gdmlldyB0aGlzIGFwcGxpY2F0aW9uLjwvaDM+JztcbiAgfSBlbHNlIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24gbW9kdWxlIGFuZCBpbml0aWFsaXplXG4gICAgICovXG4gICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgd2luZG93Lk5vcmkgPSByZXF1aXJlKCcuL25vcmkvTm9yaS5qcycpO1xuICAgICAgd2luZG93LkFQUCA9IHJlcXVpcmUoJy4vYXBwL0FwcC5qcycpO1xuICAgICAgQVBQLmluaXRpYWxpemUoKTtcbiAgICB9O1xuXG4gIH1cblxufSgpKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbmltcG9ydCAqIGFzIF9kaXNwYXRjaGVyIGZyb20gJy4vdXRpbHMvRGlzcGF0Y2hlci5qcyc7XG5pbXBvcnQgKiBhcyBfcm91dGVyIGZyb20gJy4vdXRpbHMvUm91dGVyLmpzJztcblxubGV0IE5vcmkgPSBmdW5jdGlvbiAoKSB7XG5cbiAgLy8gU3dpdGNoIExvZGFzaCB0byB1c2UgTXVzdGFjaGUgc3R5bGUgdGVtcGxhdGVzXG4gIF8udGVtcGxhdGVTZXR0aW5ncy5pbnRlcnBvbGF0ZSA9IC97eyhbXFxzXFxTXSs/KX19L2c7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZnVuY3Rpb24gZ2V0RGlzcGF0Y2hlcigpIHtcbiAgICByZXR1cm4gX2Rpc3BhdGNoZXI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSb3V0ZXIoKSB7XG4gICAgcmV0dXJuIF9yb3V0ZXI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCAod2luZG93LkFQUF9DT05GSUdfREFUQSB8fCB7fSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFJvdXRlKCkge1xuICAgIHJldHVybiBfcm91dGVyLmdldEN1cnJlbnRSb3V0ZSgpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBGYWN0b3JpZXMgLSBjb25jYXRlbmF0aXZlIGluaGVyaXRhbmNlLCBkZWNvcmF0b3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBNZXJnZXMgYSBjb2xsZWN0aW9uIG9mIG9iamVjdHNcbiAgICogQHBhcmFtIHRhcmdldFxuICAgKiBAcGFyYW0gc291cmNlQXJyYXlcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc3NpZ25BcnJheSh0YXJnZXQsIHNvdXJjZUFycmF5KSB7XG4gICAgc291cmNlQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICB0YXJnZXQgPSBfLmFzc2lnbih0YXJnZXQsIHNvdXJjZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgTm9yaSBhcHBsaWNhdGlvbiBpbnN0YW5jZVxuICAgKiBAcGFyYW0gY3VzdG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQXBwbGljYXRpb24oY3VzdG9tKSB7XG4gICAgY3VzdG9tLm1peGlucy5wdXNoKHRoaXMpO1xuICAgIHJldHVybiBidWlsZEZyb21NaXhpbnMoY3VzdG9tKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIG1haW4gYXBwbGljYXRpb24gc3RvcmVcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVN0b3JlKGN1c3RvbSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBjcygpIHtcbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSkpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBtYWluIGFwcGxpY2F0aW9uIHZpZXdcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVZpZXcoY3VzdG9tKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGN2KCkge1xuICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBidWlsZEZyb21NaXhpbnMoY3VzdG9tKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNaXhlcyBpbiB0aGUgbW9kdWxlcyBzcGVjaWZpZWQgaW4gdGhlIGN1c3RvbSBhcHBsaWNhdGlvbiBvYmplY3RcbiAgICogQHBhcmFtIHNvdXJjZU9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGJ1aWxkRnJvbU1peGlucyhzb3VyY2VPYmplY3QpIHtcbiAgICBsZXQgbWl4aW5zO1xuXG4gICAgaWYgKHNvdXJjZU9iamVjdC5taXhpbnMpIHtcbiAgICAgIG1peGlucyA9IHNvdXJjZU9iamVjdC5taXhpbnM7XG4gICAgfVxuXG4gICAgbWl4aW5zLnB1c2goc291cmNlT2JqZWN0KTtcbiAgICByZXR1cm4gYXNzaWduQXJyYXkoe30sIG1peGlucyk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGNvbmZpZyAgICAgICAgICAgOiBnZXRDb25maWcsXG4gICAgZGlzcGF0Y2hlciAgICAgICA6IGdldERpc3BhdGNoZXIsXG4gICAgcm91dGVyICAgICAgICAgICA6IGdldFJvdXRlcixcbiAgICBjcmVhdGVBcHBsaWNhdGlvbjogY3JlYXRlQXBwbGljYXRpb24sXG4gICAgY3JlYXRlU3RvcmUgICAgICA6IGNyZWF0ZVN0b3JlLFxuICAgIGNyZWF0ZVZpZXcgICAgICAgOiBjcmVhdGVWaWV3LFxuICAgIGJ1aWxkRnJvbU1peGlucyAgOiBidWlsZEZyb21NaXhpbnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBhc3NpZ25BcnJheSAgICAgIDogYXNzaWduQXJyYXlcbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgTm9yaSgpO1xuXG5cbiIsIi8qIEBmbG93IHdlYWsgKi9cblxuZXhwb3J0IGRlZmF1bHQge1xuICBDSEFOR0VfU1RPUkVfU1RBVEU6ICdDSEFOR0VfU1RPUkVfU1RBVEUnXG59OyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBBY3Rpb24gQ3JlYXRvclxuICogQmFzZWQgb24gRmx1eCBBY3Rpb25zXG4gKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhbmQgZ3VpZGVsaW5lczogaHR0cHM6Ly9naXRodWIuY29tL2FjZGxpdGUvZmx1eC1zdGFuZGFyZC1hY3Rpb25cbiAqL1xuaW1wb3J0ICogYXMgX25vcmlBY3Rpb25Db25zdGFudHMgZnJvbSAnLi9BY3Rpb25Db25zdGFudHMuanMnO1xuXG52YXIgTm9yaUFjdGlvbkNyZWF0b3IgPSB7XG5cbiAgY2hhbmdlU3RvcmVTdGF0ZTogZnVuY3Rpb24gKGRhdGEsIGlkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9ub3JpQWN0aW9uQ29uc3RhbnRzLkNIQU5HRV9TVE9SRV9TVEFURSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgaWQgIDogaWQsXG4gICAgICAgIGRhdGE6IGRhdGFcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IE5vcmlBY3Rpb25DcmVhdG9yOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBBamF4IC8gUmVzdCBtb2R1bGUuXG4gKiBSZXR1cm5zIGFuIFJ4SlMgT2JlcnZhYmxlXG4gKlxuICogVXNhZ2U6XG4gKlxuIHZhciByZXF1ZXN0ID0gcmVxdWlyZSgnLi9ub3JpL3NlcnZpY2UvUmVzdCcpO1xuXG4gdmFyIGdldFN1YiA9IHJlcXVlc3QucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIHVybCAgIDogJy9pdGVtcycsXG4gICAgICAgIGhlYWRlcnM6IFt7J2tleSc6J3ZhbHVlJ31dLFxuICAgICAgICBqc29uICA6IHRydWVcbiAgICAgIH0pLnN1YnNjcmliZShcbiBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnb2snLCBkYXRhKTtcbiAgICAgICAgfSxcbiBmdW5jdGlvbiBlcnJvcihkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2VycicsIGRhdGEpO1xuICAgICAgICB9KTtcblxuIHZhciBwb3N0U3ViID0gcmVxdWVzdC5yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIHVybCAgIDogJy9pdGVtcycsXG4gICAgICAgIGRhdGEgIDogSlNPTi5zdHJpbmdpZnkoe2tleTogJ3ZhbHVlJ30pLFxuICAgICAgICBqc29uICA6IHRydWVcbiAgICAgIH0pLnN1YnNjcmliZShcbiBmdW5jdGlvbiBzdWNjZXNzKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnb2snLCBkYXRhKTtcbiAgICAgICAgfSxcbiBmdW5jdGlvbiBlcnJvcihkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2VycicsIGRhdGEpO1xuICAgICAgICB9KTtcblxuIHZhciBwdXRTdWIgPSByZXF1ZXN0LnJlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICB1cmwgICA6ICcvaXRlbXMvNDInLFxuICAgICAgICBkYXRhICA6IEpTT04uc3RyaW5naWZ5KHtrZXk6ICd2YWx1ZSd9KSxcbiAgICAgICAganNvbiAgOiB0cnVlXG4gICAgICB9KS5zdWJzY3JpYmUoXG4gZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICAgIH0sXG4gZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiB2YXIgZGVsU3ViID0gcmVxdWVzdC5yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgdXJsICAgOiAnL2l0ZW1zLzQyJyxcbiAgICAgICAganNvbiAgOiB0cnVlXG4gICAgICB9KS5zdWJzY3JpYmUoXG4gZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICAgIH0sXG4gZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgICAgfSk7XG4gKlxuICovXG5cbmxldCBSZXN0ID0gZnVuY3Rpb24gKCkge1xuXG4gIGZ1bmN0aW9uIHJlcXVlc3QocmVxT2JqKSB7XG5cbiAgICBsZXQgeGhyICAgICA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpLFxuICAgICAgICBqc29uICAgID0gcmVxT2JqLmpzb24gfHwgZmFsc2UsXG4gICAgICAgIG1ldGhvZCAgPSByZXFPYmoubWV0aG9kLnRvVXBwZXJDYXNlKCkgfHwgJ0dFVCcsXG4gICAgICAgIHVybCAgICAgPSByZXFPYmoudXJsLFxuICAgICAgICBoZWFkZXJzID0gcmVxT2JqLmhlYWRlcnMgfHwgW10sXG4gICAgICAgIGRhdGEgICAgPSByZXFPYmouZGF0YSB8fCBudWxsO1xuXG4gICAgcmV0dXJuIG5ldyBSeC5PYnNlcnZhYmxlLmNyZWF0ZShmdW5jdGlvbiBtYWtlUmVxKG9ic2VydmVyKSB7XG4gICAgICB4aHIub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG5cbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgIGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZiAoanNvbikge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBoYW5kbGVFcnJvcignUmVzdWx0JywgJ0Vycm9yIHBhcnNpbmcgcmVzdWx0LiBTdGF0dXM6ICcgKyB4aHIuc3RhdHVzICsgJywgUmVzcG9uc2U6ICcgKyB4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBoYW5kbGVFcnJvcih4aHIuc3RhdHVzLCB4aHIuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB4aHIub25lcnJvciAgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBoYW5kbGVFcnJvcignTmV0d29yayBlcnJvcicpO1xuICAgICAgfTtcbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGhhbmRsZUVycm9yKCdUaW1lb3V0Jyk7XG4gICAgICB9O1xuICAgICAgeGhyLm9uYWJvcnQgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaGFuZGxlRXJyb3IoJ0Fib3V0Jyk7XG4gICAgICB9O1xuXG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24gKGhlYWRlclBhaXIpIHtcbiAgICAgICAgbGV0IHByb3AgPSBPYmplY3Qua2V5cyhoZWFkZXJQYWlyKVswXSxcbiAgICAgICAgICAgIHZhbHVlID0gaGVhZGVyUGFpcltwcm9wXTtcbiAgICAgICAgaWYgKHByb3AgJiYgdmFsdWUpIHtcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihwcm9wLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdub3JpL3NlcnZpY2UvcmVzdCwgYmFkIGhlYWRlciBwYWlyOiAnLCBoZWFkZXJQYWlyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIHNldCBub24ganNvbiBoZWFkZXI/ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnXG4gICAgICBpZiAoanNvbiAmJiBtZXRob2QgIT09IFwiR0VUXCIpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIpO1xuICAgICAgfSBlbHNlIGlmIChqc29uICYmIG1ldGhvZCA9PT0gXCJHRVRcIikge1xuICAgICAgICAvLywgdGV4dC8qXG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwiYXBwbGljYXRpb24vanNvbjsgb2RhdGE9dmVyYm9zZVwiKTsgIC8vIG9kYXRhIHBhcmFtIGZvciBTaGFyZXBvaW50XG4gICAgICB9XG5cbiAgICAgIHhoci5zZW5kKGRhdGEpO1xuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVFcnJvcih0eXBlLCBtZXNzYWdlKSB7XG4gICAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlIHx8ICcnO1xuICAgICAgICBvYnNlcnZlci5vbkVycm9yKHR5cGUgKyAnICcgKyBtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcmVxdWVzdDogcmVxdWVzdFxuICB9O1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBSZXN0KCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG5pbXBvcnQgKiBhcyBfZXZlbnRzIGZyb20gJy4vU29ja2V0SU9FdmVudHMuanMnO1xuXG5sZXQgU29ja2V0SU9Db25uZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9zdWJqZWN0ICA9IG5ldyBSeC5CZWhhdmlvclN1YmplY3QoKSxcbiAgICAgIF9zb2NrZXRJTyA9IGlvKCksXG4gICAgICBfbG9nICAgICAgPSBbXSxcbiAgICAgIF9jb25uZWN0aW9uSUQ7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBfc29ja2V0SU8ub24oX2V2ZW50cy5OT1RJRllfQ0xJRU5ULCBvbk5vdGlmeUNsaWVudCk7XG4gIH1cblxuICAvKipcbiAgICogQWxsIG5vdGlmaWNhdGlvbnMgZnJvbSBTb2NrZXQuaW8gY29tZSBoZXJlXG4gICAqIEBwYXJhbSBwYXlsb2FkIHt0eXBlLCBpZCwgdGltZSwgcGF5bG9hZH1cbiAgICovXG4gIGZ1bmN0aW9uIG9uTm90aWZ5Q2xpZW50KHBheWxvYWQpIHtcbiAgICBfbG9nLnB1c2gocGF5bG9hZCk7XG5cbiAgICBsZXQge3R5cGV9ID0gcGF5bG9hZDtcblxuICAgIGlmICh0eXBlID09PSBfZXZlbnRzLlBJTkcpIHtcbiAgICAgIG5vdGlmeVNlcnZlcihfZXZlbnRzLlBPTkcsIHt9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09IF9ldmVudHMuUE9ORykge1xuICAgICAgY29uc29sZS5sb2coJ1NPQ0tFVC5JTyBQT05HIScpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gX2V2ZW50cy5DT05ORUNUKSB7XG4gICAgICBfY29ubmVjdGlvbklEID0gcGF5bG9hZC5pZDtcbiAgICB9XG4gICAgbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCk7XG4gIH1cblxuICBmdW5jdGlvbiBwaW5nKCkge1xuICAgIG5vdGlmeVNlcnZlcihfZXZlbnRzLlBJTkcsIHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgY29tbXVuaWNhdGlvbnMgdG8gdGhlIHNlcnZlciBzaG91bGQgZ28gdGhyb3VnaCBoZXJlXG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTZXJ2ZXIodHlwZSwgcGF5bG9hZCkge1xuICAgIF9zb2NrZXRJTy5lbWl0KF9ldmVudHMuTk9USUZZX1NFUlZFUiwge1xuICAgICAgdHlwZSAgICAgICAgOiB0eXBlLFxuICAgICAgY29ubmVjdGlvbklEOiBfY29ubmVjdGlvbklELFxuICAgICAgcGF5bG9hZCAgICAgOiBwYXlsb2FkXG4gICAgfSk7XG4gIH1cblxuICAvL2Z1bmN0aW9uIGVtaXQobWVzc2FnZSwgcGF5bG9hZCkge1xuICAvLyAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgX2V2ZW50cy5NRVNTQUdFO1xuICAvLyAgcGF5bG9hZCA9IHBheWxvYWQgfHwge307XG4gIC8vICBfc29ja2V0SU8uZW1pdChtZXNzYWdlLCBwYXlsb2FkKTtcbiAgLy99XG4gIC8vXG4gIC8vZnVuY3Rpb24gb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgLy8gIF9zb2NrZXRJTy5vbihldmVudCwgaGFuZGxlcik7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgaGFuZGxlciB0byB1cGRhdGVzXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3N1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBmcm9tIHVwZGF0ZSBvciB3aGF0ZXZlciBmdW5jdGlvbiB0byBkaXNwYXRjaCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIF9zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBsYXN0IHBheWxvYWQgdGhhdCB3YXMgZGlzcGF0Y2hlZCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExhc3ROb3RpZmljYXRpb24oKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LmdldFZhbHVlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRFdmVudENvbnN0YW50cygpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sIF9ldmVudHMpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBldmVudHMgICAgICAgICAgICAgOiBnZXRFdmVudENvbnN0YW50cyxcbiAgICBpbml0aWFsaXplICAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHBpbmcgICAgICAgICAgICAgICA6IHBpbmcsXG4gICAgbm90aWZ5U2VydmVyICAgICAgIDogbm90aWZ5U2VydmVyLFxuICAgIHN1YnNjcmliZSAgICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVycyAgOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRMYXN0Tm90aWZpY2F0aW9uOiBnZXRMYXN0Tm90aWZpY2F0aW9uXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IFNvY2tldElPQ29ubmVjdG9yKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIFBJTkcgICAgICAgICAgICAgOiAncGluZycsXG4gIFBPTkcgICAgICAgICAgICAgOiAncG9uZycsXG4gIE5PVElGWV9DTElFTlQgICAgOiAnbm90aWZ5X2NsaWVudCcsXG4gIE5PVElGWV9TRVJWRVIgICAgOiAnbm90aWZ5X3NlcnZlcicsXG4gIENPTk5FQ1QgICAgICAgICAgOiAnY29ubmVjdCcsXG4gIERST1BQRUQgICAgICAgICAgOiAnZHJvcHBlZCcsXG4gIFVTRVJfQ09OTkVDVEVEICAgOiAndXNlcl9jb25uZWN0ZWQnLFxuICBVU0VSX0RJU0NPTk5FQ1RFRDogJ3VzZXJfZGlzY29ubmVjdGVkJyxcbiAgRU1JVCAgICAgICAgICAgICA6ICdlbWl0JyxcbiAgQlJPQURDQVNUICAgICAgICA6ICdicm9hZGNhc3QnLFxuICBTWVNURU1fTUVTU0FHRSAgIDogJ3N5c3RlbV9tZXNzYWdlJyxcbiAgTUVTU0FHRSAgICAgICAgICA6ICdtZXNzYWdlJyxcbiAgQ1JFQVRFX1JPT00gICAgICA6ICdjcmVhdGVfcm9vbScsXG4gIEpPSU5fUk9PTSAgICAgICAgOiAnam9pbl9yb29tJyxcbiAgTEVBVkVfUk9PTSAgICAgICA6ICdsZWF2ZV9yb29tJyxcbiAgR0FNRV9TVEFSVCAgICAgICA6ICdnYW1lX3N0YXJ0JyxcbiAgR0FNRV9FTkQgICAgICAgICA6ICdnYW1lX2VuZCcsXG4gIEdBTUVfQUJPUlQgICAgICAgOiAnZ2FtZV9hYm9ydCdcbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFdyYXBzIEltbXV0YWJsZS5qcydzIE1hcCBpbiB0aGUgc2FtZSBzeW50YXggYXMgdGhlIFNpbXBsZVN0b3JlIG1vZHVsZVxuICpcbiAqIFZpZXcgRG9jcyBodHRwOi8vZmFjZWJvb2suZ2l0aHViLmlvL2ltbXV0YWJsZS1qcy9kb2NzLyMvTWFwXG4gKi9cblxuaW1wb3J0ICogYXMgaW1tdXRhYmxlIGZyb20gJy4uLy4uL3ZlbmRvci9pbW11dGFibGUubWluLmpzJztcblxubGV0IEltbXV0YWJsZU1hcCA9IGZ1bmN0aW9uICgpIHtcbiAgbGV0IF9tYXAgPSBpbW11dGFibGUuTWFwKCk7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIE1hcCBvYmplY3RcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRNYXAoKSB7XG4gICAgcmV0dXJuIF9tYXA7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgY29weSBvZiB0aGUgc3RhdGVcbiAgICogQHJldHVybnMge3ZvaWR8Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICAgIHJldHVybiBfbWFwLnRvSlMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZVxuICAgKiBAcGFyYW0gbmV4dFxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U3RhdGUobmV4dCkge1xuICAgIF9tYXAgPSBfbWFwLm1lcmdlKG5leHQpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBnZXRTdGF0ZTogZ2V0U3RhdGUsXG4gICAgc2V0U3RhdGU6IHNldFN0YXRlLFxuICAgIGdldE1hcCAgOiBnZXRNYXBcbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgSW1tdXRhYmxlTWFwOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBNaXhpbiBmb3IgTm9yaSBzdG9yZXMgdG8gYWRkIGZ1bmN0aW9uYWxpdHkgc2ltaWxhciB0byBSZWR1eCcgUmVkdWNlciBhbmQgc2luZ2xlXG4gKiBvYmplY3Qgc3RhdGUgdHJlZSBjb25jZXB0LiBNaXhpbiBzaG91bGQgYmUgY29tcG9zZWQgdG8gbm9yaS9zdG9yZS9BcHBsaWNhdGlvblN0b3JlXG4gKiBkdXJpbmcgY3JlYXRpb24gb2YgbWFpbiBBcHBTdG9yZVxuICpcbiAqIGh0dHBzOi8vZ2FlYXJvbi5naXRodWIuaW8vcmVkdXgvZG9jcy9hcGkvU3RvcmUuaHRtbFxuICogaHR0cHM6Ly9nYWVhcm9uLmdpdGh1Yi5pby9yZWR1eC9kb2NzL2Jhc2ljcy9SZWR1Y2Vycy5odG1sXG4gKlxuICogQ3JlYXRlZCA4LzEzLzE1XG4gKi9cblxuaW1wb3J0ICogYXMgaXMgZnJvbSAnLi4vLi4vbnVkb3J1L3V0aWwvaXMuanMnO1xuXG5sZXQgTWl4aW5SZWR1Y2VyU3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gIGxldCBfdGhpcyxcbiAgICAgIF9zdGF0ZSxcbiAgICAgIF9zdGF0ZVJlZHVjZXJzID0gW107XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIF9zdGF0ZSBtaWdodCBub3QgZXhpc3QgaWYgc3Vic2NyaWJlcnMgYXJlIGFkZGVkIGJlZm9yZSB0aGlzIHN0b3JlIGlzIGluaXRpYWxpemVkXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICBpZiAoX3N0YXRlKSB7XG4gICAgICByZXR1cm4gX3N0YXRlLmdldFN0YXRlKCk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFN0YXRlKHN0YXRlKSB7XG4gICAgaWYgKCFfLmlzRXF1YWwoc3RhdGUsIF9zdGF0ZSkpIHtcbiAgICAgIF9zdGF0ZS5zZXRTdGF0ZShzdGF0ZSk7XG4gICAgICBfdGhpcy5ub3RpZnlTdWJzY3JpYmVycyh7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0UmVkdWNlcnMocmVkdWNlckFycmF5KSB7XG4gICAgX3N0YXRlUmVkdWNlcnMgPSByZWR1Y2VyQXJyYXk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRSZWR1Y2VyKHJlZHVjZXIpIHtcbiAgICBfc3RhdGVSZWR1Y2Vycy5wdXNoKHJlZHVjZXIpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0XG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgZXZlbnQgbGlzdGVuZXIvcmVjZWl2ZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKSB7XG4gICAgaWYgKCF0aGlzLmNyZWF0ZVN1YmplY3QpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZSBuZWVkcyBub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QgdG8gbm90aWZ5Jyk7XG4gICAgfVxuXG4gICAgX3RoaXMgID0gdGhpcztcbiAgICBfc3RhdGUgPSByZXF1aXJlKCcuL0ltbXV0YWJsZU1hcC5qcycpKCk7XG5cbiAgICBpZiAoIV9zdGF0ZVJlZHVjZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZHVjZXJTdG9yZSwgbXVzdCBzZXQgYSByZWR1Y2VyIGJlZm9yZSBpbml0aWFsaXphdGlvbicpO1xuICAgIH1cblxuICAgIC8vIFNldCBpbml0aWFsIHN0YXRlIGZyb20gZW1wdHkgZXZlbnRcbiAgICBhcHBseVJlZHVjZXJzKHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSB0aGUgYWN0aW9uIG9iamVjdCB0byB0aGUgcmVkdWNlcnMgdG8gY2hhbmdlIHN0YXRlXG4gICAqIGFyZSBzZW50IHRvIGFsbCByZWR1Y2VycyB0byB1cGRhdGUgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25PYmpPckFycnkgQXJyYXkgb2YgYWN0aW9ucyBvciBhIHNpbmdsZSBhY3Rpb24gdG8gcmVkdWNlIGZyb21cbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5KGFjdGlvbk9iak9yQXJyeSkge1xuICAgIGlmIChpcy5hcnJheShhY3Rpb25PYmpPckFycnkpKSB7XG4gICAgICBhY3Rpb25PYmpPckFycnkuZm9yRWFjaChhY3Rpb25PYmogPT4gYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmopKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmpPckFycnkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KSB7XG4gICAgbGV0IG5leHRTdGF0ZSA9IGFwcGx5UmVkdWNlcnNUb1N0YXRlKGdldFN0YXRlKCksIGFjdGlvbk9iamVjdCk7XG4gICAgc2V0U3RhdGUobmV4dFN0YXRlKTtcbiAgICBfdGhpcy5oYW5kbGVTdGF0ZU11dGF0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogQVBJIGhvb2sgdG8gaGFuZGxlIHN0YXRlIHVwZGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlTXV0YXRpb24oKSB7XG4gICAgLy8gb3ZlcnJpZGUgdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgc3RhdGUgZnJvbSB0aGUgY29tYmluZWQgcmVkdWNlcyBhbmQgYWN0aW9uIG9iamVjdFxuICAgKiBTdG9yZSBzdGF0ZSBpc24ndCBtb2RpZmllZCwgY3VycmVudCBzdGF0ZSBpcyBwYXNzZWQgaW4gYW5kIG11dGF0ZWQgc3RhdGUgcmV0dXJuZWRcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25cbiAgICogQHJldHVybnMgeyp8e319XG4gICAqL1xuICBmdW5jdGlvbiBhcHBseVJlZHVjZXJzVG9TdGF0ZShzdGF0ZSwgYWN0aW9uKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICBfc3RhdGVSZWR1Y2Vycy5mb3JFYWNoKHJlZHVjZXJGdW5jID0+IHN0YXRlID0gcmVkdWNlckZ1bmMoc3RhdGUsIGFjdGlvbikpO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZW1wbGF0ZSByZWR1Y2VyIGZ1bmN0aW9uXG4gICAqIFN0b3JlIHN0YXRlIGlzbid0IG1vZGlmaWVkLCBjdXJyZW50IHN0YXRlIGlzIHBhc3NlZCBpbiBhbmQgbXV0YXRlZCBzdGF0ZSByZXR1cm5lZFxuXG4gICBmdW5jdGlvbiB0ZW1wbGF0ZVJlZHVjZXJGdW5jdGlvbihzdGF0ZSwgZXZlbnQpIHtcbiAgICAgICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG4gICAgICAgICAgY2FzZSBfbm9yaUFjdGlvbkNvbnN0YW50cy5NT0RFTF9EQVRBX0NIQU5HRUQ6XG4gICAgICAgICAgICAvLyBjYW4gY29tcG9zZSBvdGhlciByZWR1Y2Vyc1xuICAgICAgICAgICAgLy8gcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCBvdGhlclN0YXRlVHJhbnNmb3JtZXIoc3RhdGUpKTtcbiAgICAgICAgICAgIHJldHVybiBfLm1lcmdlKHt9LCBzdGF0ZSwge3Byb3A6IGV2ZW50LnBheWxvYWQudmFsdWV9KTtcbiAgICAgICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29uc29sZS53YXJuKCdSZWR1Y2VyIHN0b3JlLCB1bmhhbmRsZWQgZXZlbnQgdHlwZTogJytldmVudC50eXBlKTtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgKi9cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVSZWR1Y2VyU3RvcmU6IGluaXRpYWxpemVSZWR1Y2VyU3RvcmUsXG4gICAgZ2V0U3RhdGUgICAgICAgICAgICAgIDogZ2V0U3RhdGUsXG4gICAgc2V0U3RhdGUgICAgICAgICAgICAgIDogc2V0U3RhdGUsXG4gICAgYXBwbHkgICAgICAgICAgICAgICAgIDogYXBwbHksXG4gICAgc2V0UmVkdWNlcnMgICAgICAgICAgIDogc2V0UmVkdWNlcnMsXG4gICAgYWRkUmVkdWNlciAgICAgICAgICAgIDogYWRkUmVkdWNlcixcbiAgICBhcHBseVJlZHVjZXJzICAgICAgICAgOiBhcHBseVJlZHVjZXJzLFxuICAgIGFwcGx5UmVkdWNlcnNUb1N0YXRlICA6IGFwcGx5UmVkdWNlcnNUb1N0YXRlLFxuICAgIGhhbmRsZVN0YXRlTXV0YXRpb24gICA6IGhhbmRsZVN0YXRlTXV0YXRpb25cbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgTWl4aW5SZWR1Y2VyU3RvcmUoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qXG4gTWF0dCBQZXJraW5zLCA2LzEyLzE1XG5cbiBwdWJsaXNoIHBheWxvYWQgb2JqZWN0XG5cbiB7XG4gdHlwZTogRVZUX1RZUEUsXG4gcGF5bG9hZDoge1xuIGtleTogdmFsdWVcbiB9XG4gfVxuXG4gKi9cbnZhciBEaXNwYXRjaGVyID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfc3ViamVjdE1hcCAgPSB7fSxcbiAgICAgIF9yZWNlaXZlck1hcCA9IHt9LFxuICAgICAgX2lkICAgICAgICAgID0gMCxcbiAgICAgIF9sb2cgICAgICAgICA9IFtdLFxuICAgICAgX3F1ZXVlICAgICAgID0gW10sXG4gICAgICBfdGltZXJPYnNlcnZhYmxlLFxuICAgICAgX3RpbWVyU3Vic2NyaXB0aW9uLFxuICAgICAgX3RpbWVyUGF1c2FibGU7XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBldmVudCBhcyBvYnNlcnZhYmxlXG4gICAqIEBwYXJhbSBldnRTdHIgRXZlbnQgbmFtZSBzdHJpbmdcbiAgICogQHBhcmFtIGhhbmRsZXIgb25OZXh0KCkgc3Vic2NyaXB0aW9uIGZ1bmN0aW9uXG4gICAqIEBwYXJhbSBvbmNlT3JDb250ZXh0IG9wdGlvbmFsLCBlaXRoZXIgdGhlIGNvbnRleHQgdG8gZXhlY3V0ZSB0aGUgaGFuZGVyIG9yIG9uY2UgYm9vbFxuICAgKiBAcGFyYW0gb25jZSB3aWxsIGNvbXBsZXRlL2Rpc3Bvc2UgYWZ0ZXIgb25lIGZpcmVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoZXZ0U3RyLCBoYW5kbGVyLCBvbmNlT3JDb250ZXh0LCBvbmNlKSB7XG4gICAgdmFyIGhhbmRsZXJDb250ZXh0ID0gd2luZG93O1xuXG4gICAgLy9jb25zb2xlLmxvZygnZGlzcGF0Y2hlciBzdWJzY3JpYmUnLCBldnRTdHIsIGhhbmRsZXIsIG9uY2VPckNvbnRleHQsIG9uY2UpO1xuXG4gICAgaWYgKGlzLmZhbHNleShldnRTdHIpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Rpc3BhdGNoZXI6IEZhc2xleSBldmVudCBzdHJpbmcgcGFzc2VkIGZvciBoYW5kbGVyJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKGlzLmZhbHNleShoYW5kbGVyKSkge1xuICAgICAgY29uc29sZS53YXJuKCdEaXNwYXRjaGVyOiBGYXNsZXkgaGFuZGxlciBwYXNzZWQgZm9yIGV2ZW50IHN0cmluZycsIGV2dFN0cik7XG4gICAgfVxuXG4gICAgaWYgKG9uY2VPckNvbnRleHQgfHwgb25jZU9yQ29udGV4dCA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChvbmNlT3JDb250ZXh0ID09PSB0cnVlIHx8IG9uY2VPckNvbnRleHQgPT09IGZhbHNlKSB7XG4gICAgICAgIG9uY2UgPSBvbmNlT3JDb250ZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGFuZGxlckNvbnRleHQgPSBvbmNlT3JDb250ZXh0O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghX3N1YmplY3RNYXBbZXZ0U3RyXSkge1xuICAgICAgX3N1YmplY3RNYXBbZXZ0U3RyXSA9IFtdO1xuICAgIH1cblxuICAgIHZhciBzdWJqZWN0ID0gbmV3IFJ4LlN1YmplY3QoKTtcblxuICAgIF9zdWJqZWN0TWFwW2V2dFN0cl0ucHVzaCh7XG4gICAgICBvbmNlICAgIDogb25jZSxcbiAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgaGFuZGxlciA6IGhhbmRsZXIsXG4gICAgICBjb250ZXh0IDogaGFuZGxlckNvbnRleHQsXG4gICAgICBzdWJqZWN0IDogc3ViamVjdCxcbiAgICAgIHR5cGUgICAgOiAwXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlci5iaW5kKGhhbmRsZXJDb250ZXh0KSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0aGUgZXZlbnQgcHJvY2Vzc2luZyB0aW1lciBvciByZXN1bWUgYSBwYXVzZWQgdGltZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRUaW1lcigpIHtcbiAgICBpZiAoX3RpbWVyT2JzZXJ2YWJsZSkge1xuICAgICAgX3RpbWVyUGF1c2FibGUub25OZXh0KHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF90aW1lclBhdXNhYmxlICAgICA9IG5ldyBSeC5TdWJqZWN0KCk7XG4gICAgX3RpbWVyT2JzZXJ2YWJsZSAgID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxKS5wYXVzYWJsZShfdGltZXJQYXVzYWJsZSk7XG4gICAgX3RpbWVyU3Vic2NyaXB0aW9uID0gX3RpbWVyT2JzZXJ2YWJsZS5zdWJzY3JpYmUocHJvY2Vzc05leHRFdmVudCk7XG4gIH1cblxuICAvKipcbiAgICogU2hpZnQgbmV4dCBldmVudCB0byBoYW5kbGUgb2ZmIG9mIHRoZSBxdWV1ZSBhbmQgZGlzcGF0Y2ggaXRcbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NOZXh0RXZlbnQoKSB7XG4gICAgdmFyIGV2dCA9IF9xdWV1ZS5zaGlmdCgpO1xuICAgIGlmIChldnQpIHtcbiAgICAgIGRpc3BhdGNoVG9SZWNlaXZlcnMoZXZ0KTtcbiAgICAgIGRpc3BhdGNoVG9TdWJzY3JpYmVycyhldnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfdGltZXJQYXVzYWJsZS5vbk5leHQoZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdXNoIGV2ZW50IHRvIHRoZSBzdGFjayBhbmQgYmVnaW4gZXhlY3V0aW9uXG4gICAqIEBwYXJhbSBwYXlsb2FkT2JqIHR5cGU6U3RyaW5nLCBwYXlsb2FkOmRhdGFcbiAgICogQHBhcmFtIGRhdGFcbiAgICovXG4gIGZ1bmN0aW9uIHB1Ymxpc2gocGF5bG9hZE9iaikge1xuICAgIF9sb2cucHVzaChwYXlsb2FkT2JqKTtcbiAgICBfcXVldWUucHVzaChwYXlsb2FkT2JqKTtcblxuICAgIGluaXRUaW1lcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgdGhlIHBheWxvYWQgdG8gYWxsIHJlY2VpdmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2hUb1JlY2VpdmVycyhwYXlsb2FkKSB7XG4gICAgZm9yICh2YXIgaWQgaW4gX3JlY2VpdmVyTWFwKSB7XG4gICAgICBfcmVjZWl2ZXJNYXBbaWRdLmhhbmRsZXIocGF5bG9hZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXJzIHJlY2VpdmUgYWxsIHBheWxvYWRzIGZvciBhIGdpdmVuIGV2ZW50IHR5cGUgd2hpbGUgaGFuZGxlcnMgYXJlIHRhcmdldGVkXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaFRvU3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIHZhciBzdWJzY3JpYmVycyA9IF9zdWJqZWN0TWFwW3BheWxvYWQudHlwZV0sIGk7XG4gICAgaWYgKCFzdWJzY3JpYmVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGkgPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgc3Viak9iaiA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgaWYgKHN1YmpPYmoudHlwZSA9PT0gMCkge1xuICAgICAgICBzdWJqT2JqLnN1YmplY3Qub25OZXh0KHBheWxvYWQpO1xuICAgICAgfVxuICAgICAgaWYgKHN1YmpPYmoub25jZSkge1xuICAgICAgICB1bnN1YnNjcmliZShwYXlsb2FkLnR5cGUsIHN1YmpPYmouaGFuZGxlcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGhhbmRsZXJcbiAgICogQHBhcmFtIGV2dFN0clxuICAgKiBAcGFyYW0gaGFuZGVyXG4gICAqL1xuICBmdW5jdGlvbiB1bnN1YnNjcmliZShldnRTdHIsIGhhbmRsZXIpIHtcbiAgICBpZiAoX3N1YmplY3RNYXBbZXZ0U3RyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN1YnNjcmliZXJzID0gX3N1YmplY3RNYXBbZXZ0U3RyXSxcbiAgICAgICAgaGFuZGxlcklkeCAgPSAtMTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdWJzY3JpYmVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHN1YnNjcmliZXJzW2ldLmhhbmRsZXIgPT09IGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlcklkeCAgICAgPSBpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXS5zdWJqZWN0Lm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHN1YnNjcmliZXJzW2ldLnN1YmplY3QuZGlzcG9zZSgpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhbmRsZXJJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3Vic2NyaWJlcnMuc3BsaWNlKGhhbmRsZXJJZHgsIDEpO1xuXG4gICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVsZXRlIF9zdWJqZWN0TWFwW2V2dFN0cl07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIGNvcHkgb2YgdGhlIGxvZyBhcnJheVxuICAgKiBAcmV0dXJucyB7QXJyYXkuPFQ+fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TG9nKCkge1xuICAgIHJldHVybiBfbG9nLnNsaWNlKDApO1xuICB9XG5cblxuICAvKipcbiAgICogU2ltcGxlIHJlY2VpdmVyIGltcGxlbWVudGF0aW9uIGJhc2VkIG9uIEZsdXhcbiAgICogUmVnaXN0ZXJlZCByZWNlaXZlcnMgd2lsbCBnZXQgZXZlcnkgcHVibGlzaGVkIGV2ZW50XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9mbHV4L2Jsb2IvbWFzdGVyL3NyYy9EaXNwYXRjaGVyLmpzXG4gICAqXG4gICAqIFVzYWdlOlxuICAgKlxuICAgKiBfZGlzcGF0Y2hlci5yZWdpc3RlclJlY2VpdmVyKGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgICAgKiAgICBjb25zb2xlLmxvZygncmVjZWl2aW5nLCAnLHBheWxvYWQpO1xuICAgICAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3RlclJlY2VpdmVyKGhhbmRsZXIpIHtcbiAgICB2YXIgaWQgICAgICAgICAgID0gJ0lEXycgKyBfaWQrKztcbiAgICBfcmVjZWl2ZXJNYXBbaWRdID0ge1xuICAgICAgaWQgICAgIDogaWQsXG4gICAgICBoYW5kbGVyOiBoYW5kbGVyXG4gICAgfTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSByZWNlaXZlciBoYW5kbGVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gdW5yZWdpc3RlclJlY2VpdmVyKGlkKSB7XG4gICAgaWYgKF9yZWNlaXZlck1hcC5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgIGRlbGV0ZSBfcmVjZWl2ZXJNYXBbaWRdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgdW5zdWJzY3JpYmUgICAgICAgOiB1bnN1YnNjcmliZSxcbiAgICBwdWJsaXNoICAgICAgICAgICA6IHB1Ymxpc2gsXG4gICAgZ2V0TG9nICAgICAgICAgICAgOiBnZXRMb2csXG4gICAgcmVnaXN0ZXJSZWNlaXZlciAgOiByZWdpc3RlclJlY2VpdmVyLFxuICAgIHVucmVnaXN0ZXJSZWNlaXZlcjogdW5yZWdpc3RlclJlY2VpdmVyXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IERpc3BhdGNoZXIoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWRkIFJ4SlMgU3ViamVjdCB0byBhIG1vZHVsZS5cbiAqXG4gKiBBZGQgb25lIHNpbXBsZSBvYnNlcnZhYmxlIHN1YmplY3Qgb3IgbW9yZSBjb21wbGV4IGFiaWxpdHkgdG8gY3JlYXRlIG90aGVycyBmb3JcbiAqIG1vcmUgY29tcGxleCBldmVudGluZyBuZWVkcy5cbiAqL1xuXG5pbXBvcnQgKiBhcyBpcyBmcm9tICcuLi8uLi9udWRvcnUvdXRpbC9pcy5qcyc7XG5cbmxldCBNaXhpbk9ic2VydmFibGVTdWJqZWN0ID0gZnVuY3Rpb24gKCkge1xuXG4gIGxldCBfc3ViamVjdCAgICA9IG5ldyBSeC5TdWJqZWN0KCksXG4gICAgICBfc3ViamVjdE1hcCA9IHt9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgc3ViamVjdFxuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVN1YmplY3QobmFtZSkge1xuICAgIGlmICghX3N1YmplY3RNYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIF9zdWJqZWN0TWFwW25hbWVdID0gbmV3IFJ4LlN1YmplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIF9zdWJqZWN0TWFwW25hbWVdO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSBoYW5kbGVyIHRvIHVwZGF0ZXMuIElmIHRoZSBoYW5kbGVyIGlzIGEgc3RyaW5nLCB0aGUgbmV3IHN1YmplY3RcbiAgICogd2lsbCBiZSBjcmVhdGVkLlxuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShoYW5kbGVyT3JOYW1lLCBvcHRIYW5kbGVyKSB7XG4gICAgaWYgKGlzLnN0cmluZyhoYW5kbGVyT3JOYW1lKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZVN1YmplY3QoaGFuZGxlck9yTmFtZSkuc3Vic2NyaWJlKG9wdEhhbmRsZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gX3N1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXJPck5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwYXRjaCB1cGRhdGVkIHRvIHN1YnNjcmliZXJzXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVycyhwYXlsb2FkKSB7XG4gICAgX3N1YmplY3Qub25OZXh0KHBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHVwZGF0ZWQgdG8gbmFtZWQgc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzT2YobmFtZSwgcGF5bG9hZCkge1xuICAgIGlmIChfc3ViamVjdE1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgX3N1YmplY3RNYXBbbmFtZV0ub25OZXh0KHBheWxvYWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4oJ01peGluT2JzZXJ2YWJsZVN1YmplY3QsIG5vIHN1YnNjcmliZXJzIG9mICcgKyBuYW1lKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1YnNjcmliZSAgICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBjcmVhdGVTdWJqZWN0ICAgICAgOiBjcmVhdGVTdWJqZWN0LFxuICAgIG5vdGlmeVN1YnNjcmliZXJzICA6IG5vdGlmeVN1YnNjcmliZXJzLFxuICAgIG5vdGlmeVN1YnNjcmliZXJzT2Y6IG5vdGlmeVN1YnNjcmliZXJzT2ZcbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgTWl4aW5PYnNlcnZhYmxlU3ViamVjdDsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogVXRpbGl0eSB0byBoYW5kbGUgYWxsIHZpZXcgRE9NIGF0dGFjaG1lbnQgdGFza3NcbiAqL1xuXG5pbXBvcnQgKiBhcyBfZG9tVXRpbHMgZnJvbSAnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnO1xuXG5sZXQgUmVuZGVyZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIHJlbmRlcih7dGFyZ2V0LCBodG1sLCBjYWxsYmFja30pIHtcbiAgICBsZXQgZG9tRWwsXG4gICAgICAgIG1vdW50UG9pbnQgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXQpO1xuXG4gICAgbW91bnRQb2ludC5pbm5lckhUTUwgPSAnJztcblxuICAgIGlmIChodG1sKSB7XG4gICAgICBkb21FbCA9IF9kb21VdGlscy5IVE1MU3RyVG9Ob2RlKGh0bWwpO1xuICAgICAgbW91bnRQb2ludC5hcHBlbmRDaGlsZChkb21FbCk7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhkb21FbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvbUVsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByZW5kZXI6IHJlbmRlclxuICB9O1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBSZW5kZXJlcigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBTaW1wbGUgcm91dGVyXG4gKiBTdXBwb3J0aW5nIElFOSBzbyB1c2luZyBoYXNoZXMgaW5zdGVhZCBvZiB0aGUgaGlzdG9yeSBBUEkgZm9yIG5vd1xuICovXG5cbmltcG9ydCAqIGFzIF9vYmpVdGlscyBmcm9tICcuLi8uLi9udWRvcnUvY29yZS9PYmplY3RVdGlscy5qcyc7XG5cbmxldCBSb3V0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9zdWJqZWN0ICA9IG5ldyBSeC5TdWJqZWN0KCksXG4gICAgICBfaGFzaENoYW5nZU9ic2VydmFibGU7XG5cbiAgLyoqXG4gICAqIFNldCBldmVudCBoYW5kbGVyc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBfaGFzaENoYW5nZU9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh3aW5kb3csICdoYXNoY2hhbmdlJykuc3Vic2NyaWJlKG5vdGlmeVN1YnNjcmliZXJzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzdWJzY3JpYmUgYSBoYW5kbGVyIHRvIHRoZSB1cmwgY2hhbmdlIGV2ZW50c1xuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb3RpZnkgb2YgYSBjaGFuZ2UgaW4gcm91dGVcbiAgICogQHBhcmFtIGZyb21BcHAgVHJ1ZSBpZiB0aGUgcm91dGUgd2FzIGNhdXNlZCBieSBhbiBhcHAgZXZlbnQgbm90IFVSTCBvciBoaXN0b3J5IGNoYW5nZVxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMoKSB7XG4gICAgbGV0IGV2ZW50UGF5bG9hZCA9IHtcbiAgICAgIHJvdXRlT2JqOiBnZXRDdXJyZW50Um91dGUoKSwgLy8geyByb3V0ZTosIGRhdGE6IH1cbiAgICAgIGZyYWdtZW50OiBnZXRVUkxGcmFnbWVudCgpXG4gICAgfTtcblxuICAgIF9zdWJqZWN0Lm9uTmV4dChldmVudFBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgcm91dGUgYW5kIHF1ZXJ5IHN0cmluZyBmcm9tIHRoZSBjdXJyZW50IFVSTCBmcmFnbWVudFxuICAgKiBAcmV0dXJucyB7e3JvdXRlOiBzdHJpbmcsIHF1ZXJ5OiB7fX19XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDdXJyZW50Um91dGUoKSB7XG4gICAgbGV0IGZyYWdtZW50ICAgID0gZ2V0VVJMRnJhZ21lbnQoKSxcbiAgICAgICAgcGFydHMgICAgICAgPSBmcmFnbWVudC5zcGxpdCgnPycpLFxuICAgICAgICByb3V0ZSAgICAgICA9ICcvJyArIHBhcnRzWzBdLFxuICAgICAgICBxdWVyeVN0ciAgICA9IGRlY29kZVVSSUNvbXBvbmVudChwYXJ0c1sxXSksXG4gICAgICAgIHF1ZXJ5U3RyT2JqID0gcGFyc2VRdWVyeVN0cihxdWVyeVN0cik7XG5cbiAgICBpZiAocXVlcnlTdHIgPT09ICc9dW5kZWZpbmVkJykge1xuICAgICAgcXVlcnlTdHJPYmogPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3JvdXRlOiByb3V0ZSwgZGF0YTogcXVlcnlTdHJPYmp9O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHF1ZXJ5IHN0cmluZyBpbnRvIGtleS92YWx1ZSBwYWlyc1xuICAgKiBAcGFyYW0gcXVlcnlTdHJcbiAgICogQHJldHVybnMge3t9fVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VRdWVyeVN0cihxdWVyeVN0cikge1xuICAgIGxldCBvYmogICA9IHt9LFxuICAgICAgICBwYXJ0cyA9IHF1ZXJ5U3RyLnNwbGl0KCcmJyk7XG5cbiAgICBwYXJ0cy5mb3JFYWNoKHBhaXJTdHIgPT4ge1xuICAgICAgbGV0IHBhaXJBcnIgICAgID0gcGFpclN0ci5zcGxpdCgnPScpO1xuICAgICAgb2JqW3BhaXJBcnJbMF1dID0gcGFpckFyclsxXTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQ29tYmluZXMgYSByb3V0ZSBhbmQgZGF0YSBvYmplY3QgaW50byBhIHByb3BlciBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcm91dGVcbiAgICogQHBhcmFtIGRhdGFPYmpcbiAgICovXG4gIGZ1bmN0aW9uIHNldChyb3V0ZSwgZGF0YU9iaikge1xuICAgIGxldCBwYXRoID0gcm91dGUsXG4gICAgICAgIGRhdGEgPSBbXTtcbiAgICBpZiAoIV9vYmpVdGlscy5pc051bGwoZGF0YU9iaikpIHtcbiAgICAgIHBhdGggKz0gXCI/XCI7XG4gICAgICBmb3IgKHZhciBwcm9wIGluIGRhdGFPYmopIHtcbiAgICAgICAgaWYgKHByb3AgIT09ICd1bmRlZmluZWQnICYmIGRhdGFPYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICBkYXRhLnB1c2gocHJvcCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChkYXRhT2JqW3Byb3BdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHBhdGggKz0gZGF0YS5qb2luKCcmJyk7XG4gICAgfVxuXG4gICAgdXBkYXRlVVJMRnJhZ21lbnQocGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBldmVyeXRoaW5nIGFmdGVyIHRoZSAnd2hhdGV2ZXIuaHRtbCMnIGluIHRoZSBVUkxcbiAgICogTGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyBhcmUgcmVtb3ZlZFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VVJMRnJhZ21lbnQoKSB7XG4gICAgbGV0IGZyYWdtZW50ID0gbG9jYXRpb24uaGFzaC5zbGljZSgxKTtcbiAgICByZXR1cm4gZnJhZ21lbnQudG9TdHJpbmcoKS5yZXBsYWNlKC9cXC8kLywgJycpLnJlcGxhY2UoL15cXC8vLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcGF0aFxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlVVJMRnJhZ21lbnQocGF0aCkge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICA6IGluaXRpYWxpemUsXG4gICAgc3Vic2NyaWJlICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVyczogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBzZXQgICAgICAgICAgICAgIDogc2V0XG4gIH07XG5cbn07XG5cbmxldCByID0gUm91dGVyKCk7XG5yLmluaXRpYWxpemUoKTtcblxuZXhwb3J0IGRlZmF1bHQgcjsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogUnhKUyBIZWxwZXJzXG4gKiBAdHlwZSB7e2RvbTogRnVuY3Rpb24sIGZyb206IEZ1bmN0aW9uLCBpbnRlcnZhbDogRnVuY3Rpb24sIGRvRXZlcnk6IEZ1bmN0aW9uLCBqdXN0OiBGdW5jdGlvbiwgZW1wdHk6IEZ1bmN0aW9ufX1cbiAqL1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGRvbTogZnVuY3Rpb24gKHNlbGVjdG9yLCBldmVudCkge1xuICAgIGxldCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGlmICghZWwpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS91dGlscy9SeCwgZG9tLCBpbnZhbGlkIERPTSBzZWxlY3RvcjogJyArIHNlbGVjdG9yKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGVsLCBldmVudC50cmltKCkpO1xuICB9LFxuXG4gIGZyb206IGZ1bmN0aW9uIChpdHRyKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZnJvbShpdHRyKTtcbiAgfSxcblxuICBpbnRlcnZhbDogZnVuY3Rpb24gKG1zKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwobXMpO1xuICB9LFxuXG4gIGRvRXZlcnk6IGZ1bmN0aW9uIChtcywgLi4uYXJncykge1xuICAgIGlmKGlzLmZ1bmN0aW9uKGFyZ3NbMF0pKSB7XG4gICAgICByZXR1cm4gdGhpcy5pbnRlcnZhbChtcykuc3Vic2NyaWJlKGFyZ3NbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pbnRlcnZhbChtcykudGFrZShhcmdzWzBdKS5zdWJzY3JpYmUoYXJnc1sxXSk7XG4gIH0sXG5cbiAganVzdDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuanVzdCh2YWx1ZSk7XG4gIH0sXG5cbiAgZW1wdHk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5lbXB0eSgpO1xuICB9XG5cbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKlxuIFNpbXBsZSB3cmFwcGVyIGZvciBVbmRlcnNjb3JlIC8gSFRNTCB0ZW1wbGF0ZXNcbiBNYXR0IFBlcmtpbnNcbiA0LzcvMTVcbiAqL1xuXG5pbXBvcnQgKiBhcyBfRE9NVXRpbHMgZnJvbSAnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnO1xuXG5sZXQgVGVtcGxhdGluZyA9IGZ1bmN0aW9uICgpIHtcblxuICBsZXQgX3RlbXBsYXRlTWFwICAgICAgID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF90ZW1wbGF0ZUhUTUxDYWNoZSA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfdGVtcGxhdGVDYWNoZSAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIGZ1bmN0aW9uIGFkZFRlbXBsYXRlKGlkLCBodG1sKSB7XG4gICAgX3RlbXBsYXRlTWFwW2lkXSA9IGh0bWw7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTb3VyY2VGcm9tVGVtcGxhdGVNYXAoaWQpIHtcbiAgICBsZXQgc291cmNlID0gX3RlbXBsYXRlTWFwW2lkXTtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gY2xlYW5UZW1wbGF0ZUhUTUwoc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U291cmNlRnJvbUhUTUwoaWQpIHtcbiAgICBsZXQgc3JjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpLFxuICAgICAgICBzcmNodG1sO1xuXG4gICAgaWYgKHNyYykge1xuICAgICAgc3JjaHRtbCA9IHNyYy5pbm5lckhUTUw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignbnVkb3J1L2NvcmUvVGVtcGxhdGluZywgdGVtcGxhdGUgbm90IGZvdW5kOiBcIicgKyBpZCArICdcIicpO1xuICAgICAgc3JjaHRtbCA9ICc8ZGl2PlRlbXBsYXRlIG5vdCBmb3VuZDogJyArIGlkICsgJzwvZGl2Pic7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFuVGVtcGxhdGVIVE1MKHNyY2h0bWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdGVtcGxhdGUgaHRtbCBmcm9tIHRoZSBzY3JpcHQgdGFnIHdpdGggaWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U291cmNlKGlkKSB7XG4gICAgaWYgKF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdO1xuICAgIH1cblxuICAgIGxldCBzb3VyY2VodG1sID0gZ2V0U291cmNlRnJvbVRlbXBsYXRlTWFwKGlkKTtcblxuICAgIGlmICghc291cmNlaHRtbCkge1xuICAgICAgc291cmNlaHRtbCA9IGdldFNvdXJjZUZyb21IVE1MKGlkKTtcbiAgICB9XG5cbiAgICBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdID0gc291cmNlaHRtbDtcbiAgICByZXR1cm4gc291cmNlaHRtbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCBJRHMgYmVsb25naW5nIHRvIHRleHQvdGVtcGxhdGUgdHlwZSBzY3JpcHQgdGFnc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRBbGxUZW1wbGF0ZUlEcygpIHtcbiAgICBsZXQgc2NyaXB0VGFncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgMCk7XG5cbiAgICByZXR1cm4gc2NyaXB0VGFncy5maWx0ZXIoZnVuY3Rpb24gKHRhZykge1xuICAgICAgcmV0dXJuIHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gJ3RleHQvdGVtcGxhdGUnO1xuICAgIH0pLm1hcChmdW5jdGlvbiAodGFnKSB7XG4gICAgICByZXR1cm4gdGFnLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIHVuZGVyc2NvcmUgdGVtcGxhdGVcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VGVtcGxhdGUoaWQpIHtcbiAgICBpZiAoX3RlbXBsYXRlQ2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gX3RlbXBsYXRlQ2FjaGVbaWRdO1xuICAgIH1cbiAgICBsZXQgdGVtcGwgICAgICAgICAgPSBfLnRlbXBsYXRlKGdldFNvdXJjZShpZCkpO1xuICAgIF90ZW1wbGF0ZUNhY2hlW2lkXSA9IHRlbXBsO1xuICAgIHJldHVybiB0ZW1wbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIEhUTUxcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0hUTUwoaWQsIG9iaikge1xuICAgIGxldCB0ZW1wID0gZ2V0VGVtcGxhdGUoaWQpO1xuICAgIHJldHVybiB0ZW1wKG9iaik7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSBhbmQgcmV0dXJucyBhbiBIVE1MIEVsZW1lbnRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0VsZW1lbnQoaWQsIG9iaikge1xuICAgIHJldHVybiBfRE9NVXRpbHMuSFRNTFN0clRvTm9kZShhc0hUTUwoaWQsIG9iaikpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFucyB0ZW1wbGF0ZSBIVE1MXG4gICAqL1xuICBmdW5jdGlvbiBjbGVhblRlbXBsYXRlSFRNTChzdHIpIHtcbiAgICByZXR1cm4gc3RyLnRyaW0oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgcmV0dXJucywgc3BhY2VzIGFuZCB0YWJzXG4gICAqIEBwYXJhbSBzdHJcbiAgICogQHJldHVybnMge1hNTHxzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVXaGl0ZVNwYWNlKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyfFxcdCkvZ20sICcnKS5yZXBsYWNlKC8+XFxzKzwvZywgJz48Jyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGFsbCB0ZW1wbGF0ZXMsIGNsZWFuIHRoZW0gdXAgYW5kIGxvZ1xuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogU28gdGhpcyBoZWxwcyBjcmVhdGUgdGhlIGJsb2NrcyBmb3IgaW5zZXJ0aW9uIGluIHRvIHRoZSBET01cbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NGb3JET01JbnNlcnRpb24oKSB7XG4gICAgbGV0IGlkcyA9IGdldEFsbFRlbXBsYXRlSURzKCk7XG4gICAgaWRzLmZvckVhY2goaWQgPT4ge1xuICAgICAgdmFyIHNyYyA9IHJlbW92ZVdoaXRlU3BhY2UoZ2V0U291cmNlKGlkKSk7XG4gICAgICBjb25zb2xlLmxvZyhpZCwgc3JjKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSB0ZW1wbGF0ZSBzY3JpcHQgdGFnIHRvIHRoZSBET01cbiAgICogVXRpbCBmb3IgU2hhcmVQb2ludCBwcm9qZWN0cywgPHNjcmlwdD4gYmxvY2tzIGFyZW4ndCBhbGxvd2VkXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcGFyYW0gaHRtbFxuICAgKi9cbiAgLy9mdW5jdGlvbiBhZGRDbGllbnRTaWRlVGVtcGxhdGVUb0RPTShpZCwgaHRtbCkge1xuICAvLyAgdmFyIHMgICAgICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgLy8gIHMudHlwZSAgICAgID0gJ3RleHQvdGVtcGxhdGUnO1xuICAvLyAgcy5pZCAgICAgICAgPSBpZDtcbiAgLy8gIHMuaW5uZXJIVE1MID0gaHRtbDtcbiAgLy8gIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQocyk7XG4gIC8vfVxuXG4gIHJldHVybiB7XG4gICAgYWRkVGVtcGxhdGUgICAgICAgICAgIDogYWRkVGVtcGxhdGUsXG4gICAgZ2V0U291cmNlICAgICAgICAgICAgIDogZ2V0U291cmNlLFxuICAgIGdldEFsbFRlbXBsYXRlSURzICAgICA6IGdldEFsbFRlbXBsYXRlSURzLFxuICAgIHByb2Nlc3NGb3JET01JbnNlcnRpb246IHByb2Nlc3NGb3JET01JbnNlcnRpb24sXG4gICAgZ2V0VGVtcGxhdGUgICAgICAgICAgIDogZ2V0VGVtcGxhdGUsXG4gICAgYXNIVE1MICAgICAgICAgICAgICAgIDogYXNIVE1MLFxuICAgIGFzRWxlbWVudCAgICAgICAgICAgICA6IGFzRWxlbWVudFxuICB9O1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBUZW1wbGF0aW5nKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG5pbXBvcnQgKiBhcyBfdGVtcGxhdGUgZnJvbSAnLi4vdXRpbHMvVGVtcGxhdGluZy5qcyc7XG5pbXBvcnQgKiBhcyBfZG9tVXRpbHMgZnJvbSAnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnO1xuXG5sZXQgQXBwbGljYXRpb25WaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIGxldCBfdGhpcztcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEluaXRpYWxpemF0aW9uXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplXG4gICAqIEBwYXJhbSBzY2FmZm9sZFRlbXBsYXRlcyB0ZW1wbGF0ZSBJRHMgdG8gYXR0YWNoZWQgdG8gdGhlIGJvZHkgZm9yIHRoZSBhcHBcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcoc2NhZmZvbGRUZW1wbGF0ZXMpIHtcbiAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBhdHRhY2hBcHBsaWNhdGlvblNjYWZmb2xkaW5nKHNjYWZmb2xkVGVtcGxhdGVzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRhY2ggYXBwIEhUTUwgc3RydWN0dXJlXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGF0dGFjaEFwcGxpY2F0aW9uU2NhZmZvbGRpbmcodGVtcGxhdGVzKSB7XG4gICAgaWYgKCF0ZW1wbGF0ZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgYm9keUVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYm9keScpO1xuXG4gICAgdGVtcGxhdGVzLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsKSB7XG4gICAgICBib2R5RWwuYXBwZW5kQ2hpbGQoX2RvbVV0aWxzLkhUTUxTdHJUb05vZGUoX3RlbXBsYXRlLmdldFNvdXJjZSh0ZW1wbCwge30pKSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWZ0ZXIgYXBwIGluaXRpYWxpemF0aW9uLCByZW1vdmUgdGhlIGxvYWRpbmcgbWVzc2FnZVxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlTG9hZGluZ01lc3NhZ2UoKSB7XG4gICAgbGV0IGNvdmVyICAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaW5pdGlhbGl6YXRpb25fX2NvdmVyJyksXG4gICAgICAgIG1lc3NhZ2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaW5pdGlhbGl6YXRpb25fX21lc3NhZ2UnKTtcblxuICAgIFR3ZWVuTGl0ZS50byhjb3ZlciwgMSwge1xuICAgICAgYWxwaGE6IDAsIGVhc2U6IFF1YWQuZWFzZU91dCwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb3Zlci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNvdmVyKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIFR3ZWVuTGl0ZS50byhtZXNzYWdlLCAyLCB7XG4gICAgICB0b3A6IFwiKz01MHB4XCIsIGVhc2U6IFF1YWQuZWFzZUluLCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdmVyLnJlbW92ZUNoaWxkKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplQXBwbGljYXRpb25WaWV3OiBpbml0aWFsaXplQXBwbGljYXRpb25WaWV3LFxuICAgIHJlbW92ZUxvYWRpbmdNZXNzYWdlICAgICA6IHJlbW92ZUxvYWRpbmdNZXNzYWdlXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IEFwcGxpY2F0aW9uVmlldygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBNaXhpbiB2aWV3IHRoYXQgYWxsb3dzIGZvciBjb21wb25lbnQgdmlld3NcbiAqL1xuXG5cblxubGV0IE1peGluQ29tcG9uZW50Vmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9jb21wb25lbnRWaWV3TWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvKipcbiAgICogTWFwIGEgY29tcG9uZW50IHRvIGEgbW91bnRpbmcgcG9pbnQuIElmIGEgc3RyaW5nIGlzIHBhc3NlZCxcbiAgICogdGhlIGNvcnJlY3Qgb2JqZWN0IHdpbGwgYmUgY3JlYXRlZCBmcm9tIHRoZSBmYWN0b3J5IG1ldGhvZCwgb3RoZXJ3aXNlLFxuICAgKiB0aGUgcGFzc2VkIGNvbXBvbmVudCBvYmplY3QgaXMgdXNlZC5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqIEBwYXJhbSBtb3VudFBvaW50XG4gICAqL1xuICBmdW5jdGlvbiBtYXBWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBjb21wb25lbnRPYmosIG1vdW50UG9pbnQpIHtcbiAgICBfY29tcG9uZW50Vmlld01hcFtjb21wb25lbnRJRF0gPSB7XG4gICAgICBjb250cm9sbGVyOiBjb21wb25lbnRPYmosXG4gICAgICBtb3VudFBvaW50OiBtb3VudFBvaW50XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGYWN0b3J5IHRvIGNyZWF0ZSBjb21wb25lbnQgdmlldyBtb2R1bGVzIGJ5IGNvbmNhdGluZyBtdWx0aXBsZSBzb3VyY2Ugb2JqZWN0c1xuICAgKiBAcGFyYW0gY29tcG9uZW50U291cmNlIEN1c3RvbSBtb2R1bGUgc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRTb3VyY2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG5cbiAgICAgIC8vIFRPRE8gdXNlIGltcG9ydCBmb3IgdGhlc2VcbiAgICAgIGNvbnN0IGNvbXBvbmVudFZpZXdGYWN0b3J5ICA9IHJlcXVpcmUoJy4vVmlld0NvbXBvbmVudC5qcycpLFxuICAgICAgICAgICAgZXZlbnREZWxlZ2F0b3JGYWN0b3J5ID0gcmVxdWlyZSgnLi9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzJyksXG4gICAgICAgICAgICBvYnNlcnZhYmxlRmFjdG9yeSAgICAgPSByZXF1aXJlKCcuLi91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyksXG4gICAgICAgICAgICBzdGF0ZU9iakZhY3RvcnkgICAgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9JbW11dGFibGVNYXAuanMnKTtcblxuICAgICAgbGV0IGNvbXBvbmVudEFzc2VtYmx5LCBmaW5hbENvbXBvbmVudCwgcHJldmlvdXNJbml0aWFsaXplO1xuXG4gICAgICBjb21wb25lbnRBc3NlbWJseSA9IFtcbiAgICAgICAgY29tcG9uZW50Vmlld0ZhY3RvcnkoKSxcbiAgICAgICAgZXZlbnREZWxlZ2F0b3JGYWN0b3J5KCksXG4gICAgICAgIG9ic2VydmFibGVGYWN0b3J5KCksXG4gICAgICAgIHN0YXRlT2JqRmFjdG9yeSgpLFxuICAgICAgICBjb21wb25lbnRTb3VyY2VcbiAgICAgIF07XG5cbiAgICAgIGlmIChjb21wb25lbnRTb3VyY2UubWl4aW5zKSB7XG4gICAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gY29tcG9uZW50QXNzZW1ibHkuY29uY2F0KGNvbXBvbmVudFNvdXJjZS5taXhpbnMpO1xuICAgICAgfVxuXG4gICAgICBmaW5hbENvbXBvbmVudCA9IE5vcmkuYXNzaWduQXJyYXkoe30sIGNvbXBvbmVudEFzc2VtYmx5KTtcblxuICAgICAgLy8gQ29tcG9zZSBhIG5ldyBpbml0aWFsaXplIGZ1bmN0aW9uIGJ5IGluc2VydGluZyBjYWxsIHRvIGNvbXBvbmVudCBzdXBlciBtb2R1bGVcbiAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZSAgICAgICAgPSBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplO1xuICAgICAgZmluYWxDb21wb25lbnQuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIGluaXRpYWxpemUoaW5pdE9iaikge1xuICAgICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplQ29tcG9uZW50KGluaXRPYmopO1xuICAgICAgICBwcmV2aW91c0luaXRpYWxpemUuY2FsbChmaW5hbENvbXBvbmVudCwgaW5pdE9iaik7XG4gICAgICB9O1xuXG4gICAgICBpZiAoY29uZmlnUHJvcHMpIHtcbiAgICAgICAgZmluYWxDb21wb25lbnQuY29uZmlndXJhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gY29uZmlnUHJvcHM7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgZmluYWxDb21wb25lbnQpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIG1hcHBlZCBjb21wb25lbnRWaWV3XG4gICAqIEBwYXJhbSBjb21wb25lbnRJRFxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1ZpZXdDb21wb25lbnQoY29tcG9uZW50SUQsIG1vdW50UG9pbnQpIHtcbiAgICBsZXQgY29tcG9uZW50VmlldyA9IF9jb21wb25lbnRWaWV3TWFwW2NvbXBvbmVudElEXTtcbiAgICBpZiAoIWNvbXBvbmVudFZpZXcpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gY29tcG9uZW50VmlldyBtYXBwZWQgZm9yIGlkOiAnICsgY29tcG9uZW50SUQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmlzSW5pdGlhbGl6ZWQoKSkge1xuICAgICAgbW91bnRQb2ludCA9IG1vdW50UG9pbnQgfHwgY29tcG9uZW50Vmlldy5tb3VudFBvaW50O1xuICAgICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmluaXRpYWxpemUoe1xuICAgICAgICBpZCAgICAgICAgOiBjb21wb25lbnRJRCxcbiAgICAgICAgdGVtcGxhdGUgIDogY29tcG9uZW50Vmlldy5odG1sVGVtcGxhdGUsXG4gICAgICAgIG1vdW50UG9pbnQ6IG1vdW50UG9pbnRcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmNvbXBvbmVudFJlbmRlcigpO1xuICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5tb3VudCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtYXAgb2JqZWN0IGZvciBjb21wb25lbnQgdmlld3NcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb21wb25lbnRWaWV3TWFwKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2NvbXBvbmVudFZpZXdNYXApO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBtYXBWaWV3Q29tcG9uZW50ICAgOiBtYXBWaWV3Q29tcG9uZW50LFxuICAgIGNyZWF0ZUNvbXBvbmVudFZpZXc6IGNyZWF0ZUNvbXBvbmVudFZpZXcsXG4gICAgc2hvd1ZpZXdDb21wb25lbnQgIDogc2hvd1ZpZXdDb21wb25lbnQsXG4gICAgZ2V0Q29tcG9uZW50Vmlld01hcDogZ2V0Q29tcG9uZW50Vmlld01hcFxuICB9O1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBNaXhpbkNvbXBvbmVudFZpZXdzKCk7IiwibGV0IE1peGluRE9NTWFuaXB1bGF0aW9uID0gZnVuY3Rpb24gKCkge1xuXG4gIGZ1bmN0aW9uIGhpZGVFbChzZWxlY3Rvcikge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvciksIHtcbiAgICAgIGFscGhhICA6IDAsXG4gICAgICBkaXNwbGF5OiAnbm9uZSdcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dFbChzZWxlY3Rvcikge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvciksIHtcbiAgICAgIGFscGhhICA6IDEsXG4gICAgICBkaXNwbGF5OiAnYmxvY2snXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNob3dFbDogc2hvd0VsLFxuICAgIGhpZGVFbDogaGlkZUVsXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IE1peGluRE9NTWFuaXB1bGF0aW9uKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIENvbnZlbmllbmNlIG1peGluIHRoYXQgbWFrZXMgZXZlbnRzIGVhc2llciBmb3Igdmlld3NcbiAqXG4gKiBCYXNlZCBvbiBCYWNrYm9uZVxuICogUmV2aWV3IHRoaXMgaHR0cDovL2Jsb2cubWFyaW9uZXR0ZWpzLmNvbS8yMDE1LzAyLzEyL3VuZGVyc3RhbmRpbmctdGhlLWV2ZW50LWhhc2gvaW5kZXguaHRtbFxuICpcbiAqIEV4YW1wbGU6XG4gKiB0aGlzLnNldEV2ZW50cyh7XG4gKiAgICAgICAgJ2NsaWNrICNidG5fbWFpbl9wcm9qZWN0cyc6IGhhbmRsZVByb2plY3RzQnV0dG9uLFxuICogICAgICAgICdjbGljayAjYnRuX2ZvbywgY2xpY2sgI2J0bl9iYXInOiBoYW5kbGVGb29CYXJCdXR0b25zXG4gKiAgICAgIH0pO1xuICogdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuICpcbiAqL1xuXG5pbXBvcnQgKiBhcyBfcnggZnJvbSAnLi4vdXRpbHMvUnguanMnO1xuaW1wb3J0ICogYXMgX2Jyb3dzZXJJbmZvIGZyb20gJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJztcbmltcG9ydCAqIGFzIGlzIGZyb20gJy4uLy4uL251ZG9ydS91dGlsL2lzLmpzJztcblxubGV0IE1peGluRXZlbnREZWxlZ2F0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9ldmVudHNNYXAsXG4gICAgICBfZXZlbnRTdWJzY3JpYmVycztcblxuICBmdW5jdGlvbiBzZXRFdmVudHMoZXZ0T2JqKSB7XG4gICAgX2V2ZW50c01hcCA9IGV2dE9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEV2ZW50cygpIHtcbiAgICByZXR1cm4gX2V2ZW50c01hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdXRvbWF0ZXMgc2V0dGluZyBldmVudHMgb24gRE9NIGVsZW1lbnRzLlxuICAgKiAnZXZ0U3RyIHNlbGVjdG9yJzpjYWxsYmFja1xuICAgKiAnZXZ0U3RyIHNlbGVjdG9yLCBldnRTdHIgc2VsZWN0b3InOiBzaGFyZWRDYWxsYmFja1xuICAgKi9cbiAgZnVuY3Rpb24gZGVsZWdhdGVFdmVudHMoYXV0b0Zvcm0pIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfZXZlbnRTdWJzY3JpYmVycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKHZhciBldnRTdHJpbmdzIGluIF9ldmVudHNNYXApIHtcbiAgICAgIGlmIChfZXZlbnRzTWFwLmhhc093blByb3BlcnR5KGV2dFN0cmluZ3MpKSB7XG5cbiAgICAgICAgbGV0IG1hcHBpbmdzICAgICA9IGV2dFN0cmluZ3Muc3BsaXQoJywnKSxcbiAgICAgICAgICAgIGV2ZW50SGFuZGxlciA9IF9ldmVudHNNYXBbZXZ0U3RyaW5nc107XG5cbiAgICAgICAgaWYgKCFpcy5mdW5jKGV2ZW50SGFuZGxlcikpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0V2ZW50RGVsZWdhdG9yLCBoYW5kbGVyIGZvciAnICsgZXZ0U3RyaW5ncyArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgICAgLy8gaHR0cHM6Ly9qc2xpbnRlcnJvcnMuY29tL2RvbnQtbWFrZS1mdW5jdGlvbnMtd2l0aGluLWEtbG9vcFxuICAgICAgICBtYXBwaW5ncy5mb3JFYWNoKGV2dE1hcCA9PiB7XG4gICAgICAgICAgZXZ0TWFwID0gZXZ0TWFwLnRyaW0oKTtcblxuICAgICAgICAgIGxldCBldmVudFN0ciA9IGV2dE1hcC5zcGxpdCgnICcpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgICAgc2VsZWN0b3IgPSBldnRNYXAuc3BsaXQoJyAnKVsxXS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoX2Jyb3dzZXJJbmZvLm1vYmlsZS5hbnkoKSkge1xuICAgICAgICAgICAgZXZlbnRTdHIgPSBjb252ZXJ0TW91c2VUb1RvdWNoRXZlbnRTdHIoZXZlbnRTdHIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF9ldmVudFN1YnNjcmliZXJzW2V2dFN0cmluZ3NdID0gY3JlYXRlSGFuZGxlcihzZWxlY3RvciwgZXZlbnRTdHIsIGV2ZW50SGFuZGxlciwgYXV0b0Zvcm0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLyoganNoaW50ICtXMDgzICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBjb21tb24gbW91c2UgZXZlbnRzIHRvIHRvdWNoIGVxdWl2YWxlbnRzXG4gICAqIEBwYXJhbSBldmVudFN0clxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbnZlcnRNb3VzZVRvVG91Y2hFdmVudFN0cihldmVudFN0cikge1xuICAgIHN3aXRjaCAoZXZlbnRTdHIpIHtcbiAgICAgIGNhc2UoJ2NsaWNrJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vkb3duJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hzdGFydCc7XG4gICAgICBjYXNlKCdtb3VzZXVwJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vtb3ZlJyk6XG4gICAgICAgIHJldHVybiAndG91Y2htb3ZlJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBldmVudFN0cjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyLCBhdXRvRm9ybSkge1xuICAgIGxldCBvYnNlcnZhYmxlID0gX3J4LmRvbShzZWxlY3RvciwgZXZlbnRTdHIpLFxuICAgICAgICBlbCAgICAgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvciksXG4gICAgICAgIHRhZyAgICAgICAgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIHR5cGUgICAgICAgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcblxuICAgIGlmIChhdXRvRm9ybSkge1xuICAgICAgaWYgKHRhZyA9PT0gJ2lucHV0JyB8fCB0YWcgPT09ICd0ZXh0YXJlYScpIHtcbiAgICAgICAgaWYgKCF0eXBlIHx8IHR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2JsdXInIHx8IGV2ZW50U3RyID09PSAnZm9jdXMnKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZS5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnRTdHIgPT09ICdrZXl1cCcgfHwgZXZlbnRTdHIgPT09ICdrZXlkb3duJykge1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmFibGUudGhyb3R0bGUoMTAwKS5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAncmFkaW8nIHx8IHR5cGUgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICBpZiAoZXZlbnRTdHIgPT09ICdjbGljaycpIHtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZhYmxlLm1hcChldnQgPT4gZXZ0LnRhcmdldC5jaGVja2VkKS5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGFnID09PSAnc2VsZWN0Jykge1xuICAgICAgICBpZiAoZXZlbnRTdHIgPT09ICdjaGFuZ2UnKSB7XG4gICAgICAgICAgcmV0dXJuIG9ic2VydmFibGUubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKS5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYnNlcnZhYmxlLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFubHkgcmVtb3ZlIGV2ZW50c1xuICAgKi9cbiAgZnVuY3Rpb24gdW5kZWxlZ2F0ZUV2ZW50cygpIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBldmVudCBpbiBfZXZlbnRTdWJzY3JpYmVycykge1xuICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZlbnRdLmRpc3Bvc2UoKTtcbiAgICAgIGRlbGV0ZSBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF07XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRFdmVudHMgICAgICAgOiBzZXRFdmVudHMsXG4gICAgZ2V0RXZlbnRzICAgICAgIDogZ2V0RXZlbnRzLFxuICAgIHVuZGVsZWdhdGVFdmVudHM6IHVuZGVsZWdhdGVFdmVudHMsXG4gICAgZGVsZWdhdGVFdmVudHMgIDogZGVsZWdhdGVFdmVudHNcbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgTWl4aW5FdmVudERlbGVnYXRvcjsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbmltcG9ydCAqIGFzIF9ub3RpZmljYXRpb25WaWV3IGZyb20gJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcyc7XG5pbXBvcnQgKiBhcyBfdG9vbFRpcFZpZXcgZnJvbSAnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvVG9vbFRpcFZpZXcuanMnO1xuaW1wb3J0ICogYXMgX21lc3NhZ2VCb3hWaWV3IGZyb20gJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzJztcbmltcG9ydCAqIGFzIF9tZXNzYWdlQm94Q3JlYXRvciBmcm9tICcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9NZXNzYWdlQm94Q3JlYXRvci5qcyc7XG5pbXBvcnQgKiBhcyBfbW9kYWxDb3ZlclZpZXcgZnJvbSAnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvTW9kYWxDb3ZlclZpZXcuanMnO1xuXG5sZXQgTWl4aW5OdWRvcnVDb250cm9scyA9IGZ1bmN0aW9uICgpIHtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplTnVkb3J1Q29udHJvbHMoKSB7XG4gICAgX3Rvb2xUaXBWaWV3LmluaXRpYWxpemUoJ3Rvb2x0aXBfX2NvbnRhaW5lcicpO1xuICAgIF9ub3RpZmljYXRpb25WaWV3LmluaXRpYWxpemUoJ3RvYXN0X19jb250YWluZXInKTtcbiAgICBfbWVzc2FnZUJveFZpZXcuaW5pdGlhbGl6ZSgnbWVzc2FnZWJveF9fY29udGFpbmVyJyk7XG4gICAgX21vZGFsQ292ZXJWaWV3LmluaXRpYWxpemUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1iQ3JlYXRvcigpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hDcmVhdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTWVzc2FnZUJveChvYmopIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlTWVzc2FnZUJveChpZCkge1xuICAgIF9tZXNzYWdlQm94Vmlldy5yZW1vdmUoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWxlcnQobWVzc2FnZSwgdGl0bGUpIHtcbiAgICByZXR1cm4gbWJDcmVhdG9yKCkuYWxlcnQodGl0bGUgfHwgJ0FsZXJ0JywgbWVzc2FnZSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGROb3RpZmljYXRpb24ob2JqKSB7XG4gICAgcmV0dXJuIF9ub3RpZmljYXRpb25WaWV3LmFkZChvYmopO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90aWZ5KG1lc3NhZ2UsIHRpdGxlLCB0eXBlKSB7XG4gICAgcmV0dXJuIGFkZE5vdGlmaWNhdGlvbih7XG4gICAgICB0aXRsZSAgOiB0aXRsZSB8fCAnJyxcbiAgICAgIHR5cGUgICA6IHR5cGUgfHwgX25vdGlmaWNhdGlvblZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVOdWRvcnVDb250cm9sczogaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzLFxuICAgIG1iQ3JlYXRvciAgICAgICAgICAgICAgIDogbWJDcmVhdG9yLFxuICAgIGFkZE1lc3NhZ2VCb3ggICAgICAgICAgIDogYWRkTWVzc2FnZUJveCxcbiAgICByZW1vdmVNZXNzYWdlQm94ICAgICAgICA6IHJlbW92ZU1lc3NhZ2VCb3gsXG4gICAgYWRkTm90aWZpY2F0aW9uICAgICAgICAgOiBhZGROb3RpZmljYXRpb24sXG4gICAgYWxlcnQgICAgICAgICAgICAgICAgICAgOiBhbGVydCxcbiAgICBub3RpZnkgICAgICAgICAgICAgICAgICA6IG5vdGlmeVxuICB9O1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBNaXhpbk51ZG9ydUNvbnRyb2xzKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIE1peGluIHZpZXcgdGhhdCBhbGxvd3MgZm9yIGNvbXBvbmVudCB2aWV3cyB0byBiZSBkaXNwbGF5IG9uIHN0b3JlIHN0YXRlIGNoYW5nZXNcbiAqL1xuXG5sZXQgTWl4aW5TdG9yZVN0YXRlVmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF90aGlzLFxuICAgICAgX3dhdGNoZWRTdG9yZSxcbiAgICAgIF9jdXJyZW50Vmlld0lELFxuICAgICAgX2N1cnJlbnRTdG9yZVN0YXRlLFxuICAgICAgX3N0YXRlVmlld01vdW50UG9pbnQsXG4gICAgICBfc3RhdGVWaWV3SURNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgbGlzdGVuZXJzXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplU3RhdGVWaWV3cyhzdG9yZSkge1xuICAgIF90aGlzID0gdGhpczsgLy8gbWl0aWdhdGlvbiwgRHVlIHRvIGV2ZW50cywgc2NvcGUgbWF5IGJlIHNldCB0byB0aGUgd2luZG93IG9iamVjdFxuICAgIF93YXRjaGVkU3RvcmUgPSBzdG9yZTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndmlld0NoYW5nZScpO1xuXG4gICAgX3dhdGNoZWRTdG9yZS5zdWJzY3JpYmUoZnVuY3Rpb24gb25TdGF0ZUNoYW5nZSgpIHtcbiAgICAgIGhhbmRsZVN0YXRlQ2hhbmdlKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2hvdyByb3V0ZSBmcm9tIFVSTCBoYXNoIG9uIGNoYW5nZVxuICAgKiBAcGFyYW0gcm91dGVPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlQ2hhbmdlKCkge1xuICAgIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUoKSB7XG4gICAgbGV0IHN0YXRlID0gX3dhdGNoZWRTdG9yZS5nZXRTdGF0ZSgpLmN1cnJlbnRTdGF0ZTtcbiAgICBpZiAoc3RhdGUpIHtcbiAgICAgIGlmIChzdGF0ZSAhPT0gX2N1cnJlbnRTdG9yZVN0YXRlKSB7XG4gICAgICAgIF9jdXJyZW50U3RvcmVTdGF0ZSA9IHN0YXRlO1xuICAgICAgICBzaG93U3RhdGVWaWV3Q29tcG9uZW50LmJpbmQoX3RoaXMpKF9jdXJyZW50U3RvcmVTdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgbG9jYXRpb24gZm9yIHRoZSB2aWV3IHRvIG1vdW50IG9uIHJvdXRlIGNoYW5nZXMsIGFueSBjb250ZW50cyB3aWxsXG4gICAqIGJlIHJlbW92ZWQgcHJpb3JcbiAgICogQHBhcmFtIGVsSURcbiAgICovXG4gIGZ1bmN0aW9uIHNldFZpZXdNb3VudFBvaW50KGVsSUQpIHtcbiAgICBfc3RhdGVWaWV3TW91bnRQb2ludCA9IGVsSUQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRWaWV3TW91bnRQb2ludCgpIHtcbiAgICByZXR1cm4gX3N0YXRlVmlld01vdW50UG9pbnQ7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGEgcm91dGUgdG8gYSBtb2R1bGUgdmlldyBjb250cm9sbGVyXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUlEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqL1xuICBmdW5jdGlvbiBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudChzdGF0ZSwgdGVtcGxhdGVJRCwgY29tcG9uZW50SURvck9iaikge1xuICAgIF9zdGF0ZVZpZXdJRE1hcFtzdGF0ZV0gPSB0ZW1wbGF0ZUlEO1xuICAgIHRoaXMubWFwVmlld0NvbXBvbmVudCh0ZW1wbGF0ZUlELCBjb21wb25lbnRJRG9yT2JqLCBfc3RhdGVWaWV3TW91bnRQb2ludCk7XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIHZpZXcgKGluIHJlc3BvbnNlIHRvIGEgcm91dGUgY2hhbmdlKVxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICovXG4gIGZ1bmN0aW9uIHNob3dTdGF0ZVZpZXdDb21wb25lbnQoc3RhdGUpIHtcbiAgICBsZXQgY29tcG9uZW50SUQgPSBfc3RhdGVWaWV3SURNYXBbc3RhdGVdO1xuICAgIGlmICghY29tcG9uZW50SUQpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIk5vIHZpZXcgbWFwcGVkIGZvciByb3V0ZTogXCIgKyBzdGF0ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmVtb3ZlQ3VycmVudFZpZXcoKTtcblxuICAgIF9jdXJyZW50Vmlld0lEID0gY29tcG9uZW50SUQ7XG4gICAgdGhpcy5zaG93Vmlld0NvbXBvbmVudChfY3VycmVudFZpZXdJRCk7XG5cbiAgICAvLyBUcmFuc2l0aW9uIG5ldyB2aWV3IGluXG4gICAgVHdlZW5MaXRlLnNldChfc3RhdGVWaWV3TW91bnRQb2ludCwge2FscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9zdGF0ZVZpZXdNb3VudFBvaW50LCAwLjI1LCB7YWxwaGE6IDEsIGVhc2U6IFF1YWQuZWFzZUlufSk7XG5cbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3ZpZXdDaGFuZ2UnLCBjb21wb25lbnRJRCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBjdXJyZW50bHkgZGlzcGxheWVkIHZpZXdcbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZUN1cnJlbnRWaWV3KCkge1xuICAgIGlmIChfY3VycmVudFZpZXdJRCkge1xuICAgICAgX3RoaXMuZ2V0Q29tcG9uZW50Vmlld01hcCgpW19jdXJyZW50Vmlld0lEXS5jb250cm9sbGVyLnVubW91bnQoKTtcbiAgICB9XG4gICAgX2N1cnJlbnRWaWV3SUQgPSAnJztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVN0YXRlVmlld3MgICAgICAgIDogaW5pdGlhbGl6ZVN0YXRlVmlld3MsXG4gICAgc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZTogc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSxcbiAgICBzaG93U3RhdGVWaWV3Q29tcG9uZW50ICAgICAgOiBzaG93U3RhdGVWaWV3Q29tcG9uZW50LFxuICAgIHNldFZpZXdNb3VudFBvaW50ICAgICAgICAgICA6IHNldFZpZXdNb3VudFBvaW50LFxuICAgIGdldFZpZXdNb3VudFBvaW50ICAgICAgICAgICA6IGdldFZpZXdNb3VudFBvaW50LFxuICAgIG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50ICAgICA6IG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50XG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IE1peGluU3RvcmVTdGF0ZVZpZXdzKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIEJhc2UgbW9kdWxlIGZvciBjb21wb25lbnRzXG4gKiBNdXN0IGJlIGV4dGVuZGVkIHdpdGggY3VzdG9tIG1vZHVsZXNcbiAqL1xuXG5pbXBvcnQgKiBhcyBfdGVtcGxhdGUgZnJvbSAnLi4vdXRpbHMvVGVtcGxhdGluZy5qcyc7XG5pbXBvcnQgKiBhcyBfcmVuZGVyZXIgZnJvbSAnLi4vdXRpbHMvUmVuZGVyZXIuanMnO1xuaW1wb3J0ICogYXMgaXMgZnJvbSAnLi4vLi4vbnVkb3J1L3V0aWwvaXMuanMnO1xuXG52YXIgVmlld0NvbXBvbmVudCA9IGZ1bmN0aW9uICgpIHtcblxuICBsZXQgX2lzSW5pdGlhbGl6ZWQgPSBmYWxzZSxcbiAgICAgIF9jb25maWdQcm9wcyxcbiAgICAgIF9pZCxcbiAgICAgIF90ZW1wbGF0ZU9iakNhY2hlLFxuICAgICAgX2h0bWwsXG4gICAgICBfRE9NRWxlbWVudCxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX3JlZ2lvbnMgICAgICAgPSB7fSxcbiAgICAgIF9pc01vdW50ZWQgICAgID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemF0aW9uXG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZUNvbXBvbmVudChjb25maWdQcm9wcykge1xuICAgIF9jb25maWdQcm9wcyA9IHRoaXMuY29uZmlndXJhdGlvbigpIHx8IGNvbmZpZ1Byb3BzO1xuICAgIF9pZCAgICAgICAgICA9IF9jb25maWdQcm9wcy5pZDtcbiAgICBfbW91bnRQb2ludCAgPSBfY29uZmlnUHJvcHMubW91bnRQb2ludDtcblxuICAgIHRoaXMuc2V0U3RhdGUodGhpcy5nZXRJbml0aWFsU3RhdGUoKSk7XG4gICAgdGhpcy5zZXRFdmVudHModGhpcy5kZWZpbmVFdmVudHMoKSk7XG5cbiAgICBfcmVnaW9ucyA9IHRoaXMuZGVmaW5lUmVnaW9ucygpO1xuXG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCd1cGRhdGUnKTtcbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ21vdW50Jyk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCd1bm1vdW50Jyk7XG5cbiAgICB0aGlzLmluaXRpYWxpemVSZWdpb25zKCk7XG5cbiAgICBfaXNJbml0aWFsaXplZCA9IHRydWU7XG4gIH1cblxuICBmdW5jdGlvbiBjb25maWd1cmF0aW9uKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBkZWZpbmVFdmVudHMoKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCaW5kIHVwZGF0ZXMgdG8gdGhlIG1hcCBJRCB0byB0aGlzIHZpZXcncyB1cGRhdGVcbiAgICogQHBhcmFtIG1hcE9iaiBPYmplY3QgdG8gc3Vic2NyaWJlIHRvIG9yIElELiBTaG91bGQgaW1wbGVtZW50IG5vcmkvc3RvcmUvTWl4aW5PYnNlcnZhYmxlU3RvcmVcbiAgICovXG4gIGZ1bmN0aW9uIGJpbmRNYXAobWFwT2JqKSB7XG4gICAgaWYgKCFpcy5mdW5jKG1hcE9iai5zdWJzY3JpYmUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1ZpZXdDb21wb25lbnQgYmluZE1hcCwgbXVzdCBiZSBvYnNlcnZhYmxlOiAnICsgbWFwT2JqKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBtYXBPYmouc3Vic2NyaWJlKHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIEJlZm9yZSB0aGUgdmlldyB1cGRhdGVzIGFuZCBhIHJlcmVuZGVyIG9jY3Vyc1xuICAgKiBSZXR1cm5zIG5leHRTdGF0ZSBvZiBjb21wb25lbnRcbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVcGRhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBsZXQgbmV4dFN0YXRlICAgID0gdGhpcy5jb21wb25lbnRXaWxsVXBkYXRlKCk7XG5cbiAgICBpZiAodGhpcy5zaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSkge1xuICAgICAgdGhpcy5zZXRTdGF0ZShuZXh0U3RhdGUpO1xuXG4gICAgICBpZiAoX2lzTW91bnRlZCkge1xuICAgICAgICB0aGlzLnVubW91bnQoKTtcbiAgICAgICAgdGhpcy5jb21wb25lbnRSZW5kZXIoKTtcbiAgICAgICAgdGhpcy5tb3VudCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnVwZGF0ZVJlZ2lvbnMoKTtcblxuICAgICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1cGRhdGUnLCB0aGlzLmdldElEKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wYXJlIGN1cnJlbnQgc3RhdGUgYW5kIG5leHQgc3RhdGUgdG8gZGV0ZXJtaW5lIGlmIHVwZGF0aW5nIHNob3VsZCBvY2N1clxuICAgKiBAcGFyYW0gbmV4dFN0YXRlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvdWxkQ29tcG9uZW50VXBkYXRlKG5leHRTdGF0ZSkge1xuICAgIHJldHVybiBpcy5leGlzdHkobmV4dFN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaXQsIG5lZWQgdG8gYWRkIGl0IHRvIGEgcGFyZW50IGNvbnRhaW5lciwgaGFuZGxlZCBpbiBoaWdoZXIgbGV2ZWwgdmlld1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFJlbmRlcigpIHtcbiAgICBpZiAoIV90ZW1wbGF0ZU9iakNhY2hlKSB7XG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSA9IHRoaXMudGVtcGxhdGUoKTtcbiAgICB9XG5cbiAgICBfaHRtbCA9IHRoaXMucmVuZGVyKHRoaXMuZ2V0U3RhdGUoKSk7XG5cbiAgICB0aGlzLnJlbmRlclJlZ2lvbnMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgTG9kYXNoIGNsaWVudCBzaWRlIHRlbXBsYXRlIGZ1bmN0aW9uIGJ5IGdldHRpbmcgdGhlIEhUTUwgc291cmNlIGZyb21cbiAgICogdGhlIG1hdGNoaW5nIDxzY3JpcHQgdHlwZT0ndGV4dC90ZW1wbGF0ZSc+IHRhZyBpbiB0aGUgZG9jdW1lbnQuIE9SIHlvdSBtYXlcbiAgICogc3BlY2lmeSB0aGUgY3VzdG9tIEhUTUwgdG8gdXNlIGhlcmUuXG4gICAqXG4gICAqIFRoZSBtZXRob2QgaXMgY2FsbGVkIG9ubHkgb24gdGhlIGZpcnN0IHJlbmRlciBhbmQgY2FjaGVkIHRvIHNwZWVkIHVwIHJlbmRlcnNcbiAgICpcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgKi9cbiAgZnVuY3Rpb24gdGVtcGxhdGUoKSB7XG4gICAgLy8gYXNzdW1lcyB0aGUgdGVtcGxhdGUgSUQgbWF0Y2hlcyB0aGUgY29tcG9uZW50J3MgSUQgYXMgcGFzc2VkIG9uIGluaXRpYWxpemVcbiAgICBsZXQgaHRtbCA9IF90ZW1wbGF0ZS5nZXRTb3VyY2UodGhpcy5nZXRJRCgpKTtcbiAgICByZXR1cm4gXy50ZW1wbGF0ZShodG1sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXkgYmUgb3ZlcnJpZGRlbiBpbiBhIHN1Ym1vZHVsZSBmb3IgY3VzdG9tIHJlbmRlcmluZ1xuICAgKiBTaG91bGQgcmV0dXJuIEhUTUxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiByZW5kZXIoc3RhdGUpIHtcbiAgICByZXR1cm4gX3RlbXBsYXRlT2JqQ2FjaGUoc3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZCBpdCB0byBhIHBhcmVudCBlbGVtZW50XG4gICAqIEBwYXJhbSBtb3VudEVsXG4gICAqL1xuICBmdW5jdGlvbiBtb3VudCgpIHtcbiAgICBpZiAoIV9odG1sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBvbmVudCAnICsgX2lkICsgJyBjYW5ub3QgbW91bnQgd2l0aCBubyBIVE1MLiBDYWxsIHJlbmRlcigpIGZpcnN0PycpO1xuICAgIH1cblxuICAgIF9pc01vdW50ZWQgPSB0cnVlO1xuXG4gICAgX0RPTUVsZW1lbnQgPSAoX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiBfaHRtbFxuICAgIH0pKTtcblxuICAgIGlmICh0aGlzLmRlbGVnYXRlRXZlbnRzKSB7XG4gICAgICAvLyBQYXNzIHRydWUgdG8gYXV0b21hdGljYWxseSBwYXNzIGZvcm0gZWxlbWVudCBoYW5kbGVycyB0aGUgZWxlbWVudHMgdmFsdWUgb3Igb3RoZXIgc3RhdHVzXG4gICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKHRydWUpO1xuICAgIH1cblxuICAgIHRoaXMubW91bnRSZWdpb25zKCk7XG5cbiAgICBpZiAodGhpcy5jb21wb25lbnREaWRNb3VudCkge1xuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpO1xuICAgIH1cblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZignbW91bnQnLCB0aGlzLmdldElEKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgYWZ0ZXIgaXQncyBiZWVuIGFkZGVkIHRvIGEgdmlld1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgd2hlbiB1bmxvYWRpbmdcbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuICAgIC8vIHN0dWJcbiAgfVxuXG4gIGZ1bmN0aW9uIHVubW91bnQoKSB7XG4gICAgdGhpcy5jb21wb25lbnRXaWxsVW5tb3VudCgpO1xuXG4gICAgdGhpcy51bm1vdW50UmVnaW9ucygpO1xuXG4gICAgX2lzTW91bnRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMudW5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgfVxuXG4gICAgX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiAnJ1xuICAgIH0pO1xuXG4gICAgX2h0bWwgICAgICAgPSAnJztcbiAgICBfRE9NRWxlbWVudCA9IG51bGw7XG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1bm1vdW50JywgdGhpcy5nZXRJRCgpKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgUmVnaW9uc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBkZWZpbmVSZWdpb25zKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSZWdpb24oaWQpIHtcbiAgICByZXR1cm4gX3JlZ2lvbnNbaWRdO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVnaW9uSURzKCkge1xuICAgIHJldHVybiBfcmVnaW9ucyA/IE9iamVjdC5rZXlzKF9yZWdpb25zKSA6IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS5pbml0aWFsaXplKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVSZWdpb25zKCkge1xuICAgIGdldFJlZ2lvbklEcygpLmZvckVhY2gocmVnaW9uID0+IHtcbiAgICAgIF9yZWdpb25zW3JlZ2lvbl0udXBkYXRlKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW5kZXJSZWdpb25zKCkge1xuICAgIGdldFJlZ2lvbklEcygpLmZvckVhY2gocmVnaW9uID0+IHtcbiAgICAgIF9yZWdpb25zW3JlZ2lvbl0uY29tcG9uZW50UmVuZGVyKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBtb3VudFJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS5tb3VudCgpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5tb3VudFJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS51bm1vdW50KCk7XG4gICAgfSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFjY2Vzc29yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBpc0luaXRpYWxpemVkKCkge1xuICAgIHJldHVybiBfaXNJbml0aWFsaXplZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbmZpZ1Byb3BzKCkge1xuICAgIHJldHVybiBfY29uZmlnUHJvcHM7XG4gIH1cblxuICBmdW5jdGlvbiBpc01vdW50ZWQoKSB7XG4gICAgcmV0dXJuIF9pc01vdW50ZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG4gICAgdGhpcy5zZXRTdGF0ZSh7fSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJRCgpIHtcbiAgICByZXR1cm4gX2lkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RE9NRWxlbWVudCgpIHtcbiAgICByZXR1cm4gX0RPTUVsZW1lbnQ7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVDb21wb25lbnQgIDogaW5pdGlhbGl6ZUNvbXBvbmVudCxcbiAgICBjb25maWd1cmF0aW9uICAgICAgICA6IGNvbmZpZ3VyYXRpb24sXG4gICAgZGVmaW5lUmVnaW9ucyAgICAgICAgOiBkZWZpbmVSZWdpb25zLFxuICAgIGRlZmluZUV2ZW50cyAgICAgICAgIDogZGVmaW5lRXZlbnRzLFxuICAgIGlzSW5pdGlhbGl6ZWQgICAgICAgIDogaXNJbml0aWFsaXplZCxcbiAgICBnZXRDb25maWdQcm9wcyAgICAgICA6IGdldENvbmZpZ1Byb3BzLFxuICAgIGdldEluaXRpYWxTdGF0ZSAgICAgIDogZ2V0SW5pdGlhbFN0YXRlLFxuICAgIGdldElEICAgICAgICAgICAgICAgIDogZ2V0SUQsXG4gICAgdGVtcGxhdGUgICAgICAgICAgICAgOiB0ZW1wbGF0ZSxcbiAgICBnZXRET01FbGVtZW50ICAgICAgICA6IGdldERPTUVsZW1lbnQsXG4gICAgaXNNb3VudGVkICAgICAgICAgICAgOiBpc01vdW50ZWQsXG4gICAgYmluZE1hcCAgICAgICAgICAgICAgOiBiaW5kTWFwLFxuICAgIGNvbXBvbmVudFdpbGxVcGRhdGUgIDogY29tcG9uZW50V2lsbFVwZGF0ZSxcbiAgICBzaG91bGRDb21wb25lbnRVcGRhdGU6IHNob3VsZENvbXBvbmVudFVwZGF0ZSxcbiAgICB1cGRhdGUgICAgICAgICAgICAgICA6IHVwZGF0ZSxcbiAgICBjb21wb25lbnRSZW5kZXIgICAgICA6IGNvbXBvbmVudFJlbmRlcixcbiAgICByZW5kZXIgICAgICAgICAgICAgICA6IHJlbmRlcixcbiAgICBtb3VudCAgICAgICAgICAgICAgICA6IG1vdW50LFxuICAgIGNvbXBvbmVudERpZE1vdW50ICAgIDogY29tcG9uZW50RGlkTW91bnQsXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQgOiBjb21wb25lbnRXaWxsVW5tb3VudCxcbiAgICB1bm1vdW50ICAgICAgICAgICAgICA6IHVubW91bnQsXG4gICAgZ2V0UmVnaW9uICAgICAgICAgICAgOiBnZXRSZWdpb24sXG4gICAgZ2V0UmVnaW9uSURzICAgICAgICAgOiBnZXRSZWdpb25JRHMsXG4gICAgaW5pdGlhbGl6ZVJlZ2lvbnMgICAgOiBpbml0aWFsaXplUmVnaW9ucyxcbiAgICB1cGRhdGVSZWdpb25zICAgICAgICA6IHVwZGF0ZVJlZ2lvbnMsXG4gICAgcmVuZGVyUmVnaW9ucyAgICAgICAgOiByZW5kZXJSZWdpb25zLFxuICAgIG1vdW50UmVnaW9ucyAgICAgICAgIDogbW91bnRSZWdpb25zLFxuICAgIHVubW91bnRSZWdpb25zICAgICAgIDogdW5tb3VudFJlZ2lvbnNcbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgVmlld0NvbXBvbmVudDsiLCJ2YXIgYnJvd3NlckluZm8gPSB7XG5cbiAgYXBwVmVyc2lvbiA6IG5hdmlnYXRvci5hcHBWZXJzaW9uLFxuICB1c2VyQWdlbnQgIDogbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgaXNJRSAgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTVNJRSBcIiksXG4gIGlzSUU2ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA2XCIpLFxuICBpc0lFNyAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgN1wiKSxcbiAgaXNJRTggICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDhcIiksXG4gIGlzSUU5ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA5XCIpLFxuICBpc0ZGICAgICAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJGaXJlZm94L1wiKSxcbiAgaXNDaHJvbWUgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiQ2hyb21lL1wiKSxcbiAgaXNNYWMgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTWFjaW50b3NoLFwiKSxcbiAgaXNNYWNTYWZhcmk6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiU2FmYXJpXCIpICYmIC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTWFjXCIpICYmIC0xID09PSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJDaHJvbWVcIiksXG5cbiAgaGFzVG91Y2ggICAgOiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gIG5vdFN1cHBvcnRlZDogKHRoaXMuaXNJRTYgfHwgdGhpcy5pc0lFNyB8fCB0aGlzLmlzSUU4IHx8IHRoaXMuaXNJRTkpLFxuXG4gIG1vYmlsZToge1xuICAgIEFuZHJvaWQgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9BbmRyb2lkL2kpO1xuICAgIH0sXG4gICAgQmxhY2tCZXJyeTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JsYWNrQmVycnkvaSkgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQkIxMDsgVG91Y2gvKTtcbiAgICB9LFxuICAgIGlPUyAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9pUGhvbmV8aVBhZHxpUG9kL2kpO1xuICAgIH0sXG4gICAgT3BlcmEgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL09wZXJhIE1pbmkvaSk7XG4gICAgfSxcbiAgICBXaW5kb3dzICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvSUVNb2JpbGUvaSk7XG4gICAgfSxcbiAgICBhbnkgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gKHRoaXMuQW5kcm9pZCgpIHx8IHRoaXMuQmxhY2tCZXJyeSgpIHx8IHRoaXMuaU9TKCkgfHwgdGhpcy5PcGVyYSgpIHx8IHRoaXMuV2luZG93cygpKSAhPT0gbnVsbDtcbiAgICB9XG5cbiAgfSxcblxuICAvLyBUT0RPIGZpbHRlciBmb3IgSUUgPiA5XG4gIGVuaGFuY2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICFfYnJvd3NlckluZm8uaXNJRSAmJiAhX2Jyb3dzZXJJbmZvLm1vYmlsZS5hbnkoKTtcbiAgfSxcblxuICBtb3VzZURvd25FdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoc3RhcnRcIiA6IFwibW91c2Vkb3duXCI7XG4gIH0sXG5cbiAgbW91c2VVcEV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiO1xuICB9LFxuXG4gIG1vdXNlQ2xpY2tFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoZW5kXCIgOiBcImNsaWNrXCI7XG4gIH0sXG5cbiAgbW91c2VNb3ZlRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaG1vdmVcIiA6IFwibW91c2Vtb3ZlXCI7XG4gIH1cblxufTtcblxuZXhwb3J0IGRlZmF1bHQgYnJvd3NlckluZm87IiwiZXhwb3J0IGRlZmF1bHQge1xuXG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTIzOTk5L2hvdy10by10ZWxsLWlmLWEtZG9tLWVsZW1lbnQtaXMtdmlzaWJsZS1pbi10aGUtY3VycmVudC12aWV3cG9ydFxuICAvLyBlbGVtZW50IG11c3QgYmUgZW50aXJlbHkgb24gc2NyZWVuXG4gIGlzRWxlbWVudEVudGlyZWx5SW5WaWV3cG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gKFxuICAgICAgcmVjdC50b3AgPj0gMCAmJlxuICAgICAgcmVjdC5sZWZ0ID49IDAgJiZcbiAgICAgIHJlY3QuYm90dG9tIDw9ICh3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCkgJiZcbiAgICAgIHJlY3QucmlnaHQgPD0gKHdpbmRvdy5pbm5lcldpZHRoIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aClcbiAgICApO1xuICB9LFxuXG4gIC8vIGVsZW1lbnQgbWF5IGJlIHBhcnRpYWx5IG9uIHNjcmVlblxuICBpc0VsZW1lbnRJblZpZXdwb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiByZWN0LmJvdHRvbSA+IDAgJiZcbiAgICAgIHJlY3QucmlnaHQgPiAwICYmXG4gICAgICByZWN0LmxlZnQgPCAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSAmJlxuICAgICAgcmVjdC50b3AgPCAod2luZG93LmlubmVySGVpZ2h0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpO1xuICB9LFxuXG4gIGlzRG9tT2JqOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iai5ub2RlVHlwZSB8fCAob2JqID09PSB3aW5kb3cpKTtcbiAgfSxcblxuICBwb3NpdGlvbjogZnVuY3Rpb24gKGVsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IGVsLm9mZnNldExlZnQsXG4gICAgICB0b3AgOiBlbC5vZmZzZXRUb3BcbiAgICB9O1xuICB9LFxuXG4gIC8vIGZyb20gaHR0cDovL2pzcGVyZi5jb20vanF1ZXJ5LW9mZnNldC12cy1vZmZzZXRwYXJlbnQtbG9vcFxuICBvZmZzZXQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciBvbCA9IDAsXG4gICAgICAgIG90ID0gMDtcbiAgICBpZiAoZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgICBkbyB7XG4gICAgICAgIG9sICs9IGVsLm9mZnNldExlZnQ7XG4gICAgICAgIG90ICs9IGVsLm9mZnNldFRvcDtcbiAgICAgIH0gd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBsZWZ0OiBvbCxcbiAgICAgIHRvcCA6IG90XG4gICAgfTtcbiAgfSxcblxuICByZW1vdmVBbGxFbGVtZW50czogZnVuY3Rpb24gKGVsKSB7XG4gICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgfSxcblxuICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDk0MTQzL2NyZWF0aW5nLWEtbmV3LWRvbS1lbGVtZW50LWZyb20tYW4taHRtbC1zdHJpbmctdXNpbmctYnVpbHQtaW4tZG9tLW1ldGhvZHMtb3ItcHJvXG4gIEhUTUxTdHJUb05vZGU6IGZ1bmN0aW9uIChzdHIpIHtcbiAgICB2YXIgdGVtcCAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRlbXAuaW5uZXJIVE1MID0gc3RyO1xuICAgIHJldHVybiB0ZW1wLmZpcnN0Q2hpbGQ7XG4gIH0sXG5cbiAgd3JhcEVsZW1lbnQ6IGZ1bmN0aW9uICh3cmFwcGVyU3RyLCBlbCkge1xuICAgIHZhciB3cmFwcGVyRWwgPSB0aGlzLkhUTUxTdHJUb05vZGUod3JhcHBlclN0ciksXG4gICAgICAgIGVsUGFyZW50ICA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICB3cmFwcGVyRWwuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIGVsUGFyZW50LmFwcGVuZENoaWxkKHdyYXBwZXJFbCk7XG4gICAgcmV0dXJuIHdyYXBwZXJFbDtcbiAgfSxcblxuICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE1MzI5MTY3L2Nsb3Nlc3QtYW5jZXN0b3ItbWF0Y2hpbmctc2VsZWN0b3ItdXNpbmctbmF0aXZlLWRvbVxuICBjbG9zZXN0OiBmdW5jdGlvbiAoZWwsIHNlbGVjdG9yKSB7XG4gICAgdmFyIG1hdGNoZXNTZWxlY3RvciA9IGVsLm1hdGNoZXMgfHwgZWwud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLm1vek1hdGNoZXNTZWxlY3RvciB8fCBlbC5tc01hdGNoZXNTZWxlY3RvcjtcbiAgICB3aGlsZSAoZWwpIHtcbiAgICAgIGlmIChtYXRjaGVzU2VsZWN0b3IuYmluZChlbCkoc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsID0gZWwucGFyZW50RWxlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vIGZyb20geW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbVxuICBoYXNDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgICBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3IFJlZ0V4cCgnKF58ICknICsgY2xhc3NOYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xuICAgIH1cbiAgfSxcblxuICBhZGRDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfVxuICB9LFxuXG4gIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgICB9XG4gIH0sXG5cbiAgdG9nZ2xlQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKHRoaXMuaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkpIHtcbiAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIEZyb20gaW1wcmVzcy5qc1xuICBhcHBseUNTUzogZnVuY3Rpb24gKGVsLCBwcm9wcykge1xuICAgIHZhciBrZXksIHBrZXk7XG4gICAgZm9yIChrZXkgaW4gcHJvcHMpIHtcbiAgICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGVsLnN0eWxlW2tleV0gPSBwcm9wc1trZXldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZWw7XG4gIH0sXG5cbiAgLy8gZnJvbSBpbXByZXNzLmpzXG4gIC8vIGBjb21wdXRlV2luZG93U2NhbGVgIGNvdW50cyB0aGUgc2NhbGUgZmFjdG9yIGJldHdlZW4gd2luZG93IHNpemUgYW5kIHNpemVcbiAgLy8gZGVmaW5lZCBmb3IgdGhlIHByZXNlbnRhdGlvbiBpbiB0aGUgY29uZmlnLlxuICBjb21wdXRlV2luZG93U2NhbGU6IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICB2YXIgaFNjYWxlID0gd2luZG93LmlubmVySGVpZ2h0IC8gY29uZmlnLmhlaWdodCxcbiAgICAgICAgd1NjYWxlID0gd2luZG93LmlubmVyV2lkdGggLyBjb25maWcud2lkdGgsXG4gICAgICAgIHNjYWxlICA9IGhTY2FsZSA+IHdTY2FsZSA/IHdTY2FsZSA6IGhTY2FsZTtcblxuICAgIGlmIChjb25maWcubWF4U2NhbGUgJiYgc2NhbGUgPiBjb25maWcubWF4U2NhbGUpIHtcbiAgICAgIHNjYWxlID0gY29uZmlnLm1heFNjYWxlO1xuICAgIH1cblxuICAgIGlmIChjb25maWcubWluU2NhbGUgJiYgc2NhbGUgPCBjb25maWcubWluU2NhbGUpIHtcbiAgICAgIHNjYWxlID0gY29uZmlnLm1pblNjYWxlO1xuICAgIH1cblxuICAgIHJldHVybiBzY2FsZTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGFuIGFycmF5IG9mIGVsZW1lbnRzIGluIHRoZSBjb250YWluZXIgcmV0dXJuZWQgYXMgQXJyYXkgaW5zdGVhZCBvZiBhIE5vZGUgbGlzdFxuICAgKi9cbiAgZ2V0UVNFbGVtZW50c0FzQXJyYXk6IGZ1bmN0aW9uIChlbCwgY2xzKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoY2xzKSwgMCk7XG4gIH0sXG5cbiAgY2VudGVyRWxlbWVudEluVmlld1BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciB2cEggPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgIHZwVyA9IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICBlbFIgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgZWxIID0gZWxSLmhlaWdodCxcbiAgICAgICAgZWxXID0gZWxSLndpZHRoO1xuXG4gICAgZWwuc3R5bGUubGVmdCA9ICh2cFcgLyAyKSAtIChlbFcgLyAyKSArICdweCc7XG4gICAgZWwuc3R5bGUudG9wICA9ICh2cEggLyAyKSAtIChlbEggLyAyKSArICdweCc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb2JqZWN0IGZyb20gdGhlIG5hbWUgKG9yIGlkKSBhdHRyaWJzIGFuZCBkYXRhIG9mIGEgZm9ybVxuICAgKiBAcGFyYW0gZWxcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBjYXB0dXJlRm9ybURhdGE6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciBkYXRhT2JqID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgICAgdGV4dGFyZWFFbHMsIGlucHV0RWxzLCBzZWxlY3RFbHM7XG5cbiAgICB0ZXh0YXJlYUVscyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3RleHRhcmVhJyksIDApO1xuICAgIGlucHV0RWxzICAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgnaW5wdXQnKSwgMCk7XG4gICAgc2VsZWN0RWxzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCdzZWxlY3QnKSwgMCk7XG5cbiAgICB0ZXh0YXJlYUVscy5mb3JFYWNoKGdldElucHV0Rm9ybURhdGEpO1xuICAgIGlucHV0RWxzLmZvckVhY2goZ2V0SW5wdXRGb3JtRGF0YSk7XG4gICAgc2VsZWN0RWxzLmZvckVhY2goZ2V0U2VsZWN0Rm9ybURhdGEpO1xuXG4gICAgcmV0dXJuIGRhdGFPYmo7XG5cbiAgICBmdW5jdGlvbiBnZXRJbnB1dEZvcm1EYXRhKGZvcm1FbCkge1xuICAgICAgZGF0YU9ialtnZXRFbE5hbWVPcklEKGZvcm1FbCldID0gZm9ybUVsLnZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlbGVjdEZvcm1EYXRhKGZvcm1FbCkge1xuICAgICAgdmFyIHNlbCA9IGZvcm1FbC5zZWxlY3RlZEluZGV4LCB2YWwgPSAnJztcbiAgICAgIGlmIChzZWwgPj0gMCkge1xuICAgICAgICB2YWwgPSBmb3JtRWwub3B0aW9uc1tzZWxdLnZhbHVlO1xuICAgICAgfVxuICAgICAgZGF0YU9ialtnZXRFbE5hbWVPcklEKGZvcm1FbCldID0gdmFsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEVsTmFtZU9ySUQoZm9ybUVsKSB7XG4gICAgICB2YXIgbmFtZSA9ICdub19uYW1lJztcbiAgICAgIGlmIChmb3JtRWwuZ2V0QXR0cmlidXRlKCduYW1lJykpIHtcbiAgICAgICAgbmFtZSA9IGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKTtcbiAgICAgIH0gZWxzZSBpZiAoZm9ybUVsLmdldEF0dHJpYnV0ZSgnaWQnKSkge1xuICAgICAgICBuYW1lID0gZm9ybUVsLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYW1lO1xuICAgIH1cbiAgfVxuXG59OyIsImV4cG9ydCBkZWZhdWx0IHtcblxuICAvKipcbiAgICogQ3JlYXRlIHNoYXJlZCAzZCBwZXJzcGVjdGl2ZSBmb3IgYWxsIGNoaWxkcmVuXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHkzRFRvQ29udGFpbmVyOiBmdW5jdGlvbiAoZWwpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGVsLCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgcGVyc3BlY3RpdmUgICAgICA6IDgwMCxcbiAgICAgICAgcGVyc3BlY3RpdmVPcmlnaW46ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBcHBseSBiYXNpYyBDU1MgcHJvcHNcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBhcHBseTNEVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGVsLCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgdHJhbnNmb3JtU3R5bGUgICAgOiBcInByZXNlcnZlLTNkXCIsXG4gICAgICAgIGJhY2tmYWNlVmlzaWJpbGl0eTogXCJoaWRkZW5cIixcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luICAgOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbHkgYmFzaWMgM2QgcHJvcHMgYW5kIHNldCB1bmlxdWUgcGVyc3BlY3RpdmUgZm9yIGNoaWxkcmVuXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHlVbmlxdWUzRFRvRWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHRyYW5zZm9ybVN0eWxlICAgICAgOiBcInByZXNlcnZlLTNkXCIsXG4gICAgICAgIGJhY2tmYWNlVmlzaWJpbGl0eSAgOiBcImhpZGRlblwiLFxuICAgICAgICB0cmFuc2Zvcm1QZXJzcGVjdGl2ZTogNjAwLFxuICAgICAgICB0cmFuc2Zvcm1PcmlnaW4gICAgIDogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxufTtcbiIsInZhciBNZXNzYWdlQm94Q3JlYXRvciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX21lc3NhZ2VCb3hWaWV3ID0gcmVxdWlyZSgnLi9NZXNzYWdlQm94VmlldycpO1xuXG4gIGZ1bmN0aW9uIGFsZXJ0KHRpdGxlLCBtZXNzYWdlLCBtb2RhbCwgY2IpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cD4nICsgbWVzc2FnZSArICc8L3A+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREFOR0VSLFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA0MDAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnQ2xvc2UnLFxuICAgICAgICAgIGlkICAgICA6ICdDbG9zZScsXG4gICAgICAgICAgdHlwZSAgIDogJycsXG4gICAgICAgICAgaWNvbiAgIDogJ3RpbWVzJyxcbiAgICAgICAgICBvbkNsaWNrOiBjYlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb25maXJtKHRpdGxlLCBtZXNzYWdlLCBva0NCLCBtb2RhbCkge1xuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwPicgKyBtZXNzYWdlICsgJzwvcD4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA0MDAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXG4gICAgICAgICAgaWQgICA6ICdDYW5jZWwnLFxuICAgICAgICAgIHR5cGUgOiAnbmVnYXRpdmUnLFxuICAgICAgICAgIGljb24gOiAndGltZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnUHJvY2VlZCcsXG4gICAgICAgICAgaWQgICAgIDogJ3Byb2NlZWQnLFxuICAgICAgICAgIHR5cGUgICA6ICdwb3NpdGl2ZScsXG4gICAgICAgICAgaWNvbiAgIDogJ2NoZWNrJyxcbiAgICAgICAgICBvbkNsaWNrOiBva0NCXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21wdCh0aXRsZSwgbWVzc2FnZSwgb2tDQiwgbW9kYWwpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cCBjbGFzcz1cInRleHQtY2VudGVyIHBhZGRpbmctYm90dG9tLWRvdWJsZVwiPicgKyBtZXNzYWdlICsgJzwvcD48dGV4dGFyZWEgbmFtZT1cInJlc3BvbnNlXCIgY2xhc3M9XCJpbnB1dC10ZXh0XCIgdHlwZT1cInRleHRcIiBzdHlsZT1cIndpZHRoOjQwMHB4OyBoZWlnaHQ6NzVweDsgcmVzaXplOiBub25lXCIgYXV0b2ZvY3VzPVwidHJ1ZVwiPjwvdGV4dGFyZWE+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDUwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ1Byb2NlZWQnLFxuICAgICAgICAgIGlkICAgICA6ICdwcm9jZWVkJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjaG9pY2UodGl0bGUsIG1lc3NhZ2UsIHNlbGVjdGlvbnMsIG9rQ0IsIG1vZGFsKSB7XG4gICAgdmFyIHNlbGVjdEhUTUwgPSAnPHNlbGVjdCBjbGFzcz1cInNwYWNlZFwiIHN0eWxlPVwid2lkdGg6NDUwcHg7aGVpZ2h0OjIwMHB4XCIgbmFtZT1cInNlbGVjdGlvblwiIGF1dG9mb2N1cz1cInRydWVcIiBzaXplPVwiMjBcIj4nO1xuXG4gICAgc2VsZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChvcHQpIHtcbiAgICAgIHNlbGVjdEhUTUwgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgb3B0LnZhbHVlICsgJ1wiICcgKyAob3B0LnNlbGVjdGVkID09PSAndHJ1ZScgPyAnc2VsZWN0ZWQnIDogJycpICsgJz4nICsgb3B0LmxhYmVsICsgJzwvb3B0aW9uPic7XG4gICAgfSk7XG5cbiAgICBzZWxlY3RIVE1MICs9ICc8L3NlbGVjdD4nO1xuXG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHAgY2xhc3M9XCJ0ZXh0LWNlbnRlciBwYWRkaW5nLWJvdHRvbS1kb3VibGVcIj4nICsgbWVzc2FnZSArICc8L3A+PGRpdiBjbGFzcz1cInRleHQtY2VudGVyXCI+JyArIHNlbGVjdEhUTUwgKyAnPC9kaXY+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNTAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ09LJyxcbiAgICAgICAgICBpZCAgICAgOiAnb2snLFxuICAgICAgICAgIHR5cGUgICA6ICdwb3NpdGl2ZScsXG4gICAgICAgICAgaWNvbiAgIDogJ2NoZWNrJyxcbiAgICAgICAgICBvbkNsaWNrOiBva0NCXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYWxlcnQgIDogYWxlcnQsXG4gICAgY29uZmlybTogY29uZmlybSxcbiAgICBwcm9tcHQgOiBwcm9tcHQsXG4gICAgY2hvaWNlIDogY2hvaWNlXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IE1lc3NhZ2VCb3hDcmVhdG9yKCk7IiwidmFyIE1lc3NhZ2VCb3hWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2hpZ2hlc3RaICAgICAgICAgICAgICAgPSAxMDAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCAgICAgICAgICAgPSA0MDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ21lc3NhZ2Vib3hfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ21lc3NhZ2Vib3hfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAnbWVzc2FnZWJveF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICdtZXNzYWdlYm94X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfYnV0dG9uSWNvblRlbXBsYXRlSUQgICA9ICdtZXNzYWdlYm94LS1idXR0b24taWNvbicsXG4gICAgICBfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCA9ICdtZXNzYWdlYm94LS1idXR0b24tbm9pY29uJyxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfbW9kYWwgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vTW9kYWxDb3ZlclZpZXcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKSxcbiAgICAgIF9jb21wb25lbnRVdGlscyAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBzZXQgdGhlIG1vdW50IHBvaW50IC8gYm94IGNvbnRhaW5lclxuICAgKiBAcGFyYW0gZWxJRFxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBuZXcgbWVzc2FnZSBib3hcbiAgICogQHBhcmFtIGluaXRPYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIHZhciB0eXBlICAgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQsXG4gICAgICAgIGJveE9iaiA9IGNyZWF0ZUJveE9iamVjdChpbml0T2JqKTtcblxuICAgIC8vIHNldHVwXG4gICAgX2NoaWxkcmVuLnB1c2goYm94T2JqKTtcbiAgICBfbW91bnRQb2ludC5hcHBlbmRDaGlsZChib3hPYmouZWxlbWVudCk7XG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGJveE9iai5lbGVtZW50KTtcbiAgICBjb25maWd1cmVCdXR0b25zKGJveE9iaik7XG5cbiAgICBfY29tcG9uZW50VXRpbHMuYXBwbHlVbmlxdWUzRFRvRWxlbWVudChib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBTZXQgM2QgQ1NTIHByb3BzIGZvciBpbi9vdXQgdHJhbnNpdGlvblxuICAgIFR3ZWVuTGl0ZS5zZXQoYm94T2JqLmVsZW1lbnQsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB6SW5kZXg6IF9oaWdoZXN0WixcbiAgICAgICAgd2lkdGggOiBpbml0T2JqLndpZHRoID8gaW5pdE9iai53aWR0aCA6IF9kZWZhdWx0V2lkdGhcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNlbnRlciBhZnRlciB3aWR0aCBoYXMgYmVlbiBzZXRcbiAgICBfZG9tVXRpbHMuY2VudGVyRWxlbWVudEluVmlld1BvcnQoYm94T2JqLmVsZW1lbnQpO1xuXG4gICAgLy8gTWFrZSBpdCBkcmFnZ2FibGVcbiAgICBEcmFnZ2FibGUuY3JlYXRlKCcjJyArIGJveE9iai5pZCwge1xuICAgICAgYm91bmRzIDogd2luZG93LFxuICAgICAgb25QcmVzczogZnVuY3Rpb24gKCkge1xuICAgICAgICBfaGlnaGVzdFogPSBEcmFnZ2FibGUuekluZGV4O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU2hvdyBpdFxuICAgIHRyYW5zaXRpb25Jbihib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBTaG93IHRoZSBtb2RhbCBjb3ZlclxuICAgIGlmIChpbml0T2JqLm1vZGFsKSB7XG4gICAgICBfbW9kYWwuc2hvd05vbkRpc21pc3NhYmxlKHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiBib3hPYmouaWQ7XG4gIH1cblxuICAvKipcbiAgICogQXNzaWduIGEgdHlwZSBjbGFzcyB0byBpdFxuICAgKiBAcGFyYW0gdHlwZVxuICAgKiBAcGFyYW0gZWxlbWVudFxuICAgKi9cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgb2JqZWN0IGZvciBhIGJveFxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcmV0dXJucyB7e2RhdGFPYmo6ICosIGlkOiBzdHJpbmcsIG1vZGFsOiAoKnxib29sZWFuKSwgZWxlbWVudDogKiwgc3RyZWFtczogQXJyYXl9fVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQm94T2JqZWN0KGluaXRPYmopIHtcbiAgICB2YXIgaWQgID0gJ2pzX19tZXNzYWdlYm94LScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGRhdGFPYmo6IGluaXRPYmosXG4gICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgbW9kYWwgIDogaW5pdE9iai5tb2RhbCxcbiAgICAgICAgICBlbGVtZW50OiBfdGVtcGxhdGUuYXNFbGVtZW50KCdtZXNzYWdlYm94LS1kZWZhdWx0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiBpbml0T2JqLnRpdGxlLFxuICAgICAgICAgICAgY29udGVudDogaW5pdE9iai5jb250ZW50XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc3RyZWFtczogW11cbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHVwIHRoZSBidXR0b25zXG4gICAqIEBwYXJhbSBib3hPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKSB7XG4gICAgdmFyIGJ1dHRvbkRhdGEgPSBib3hPYmouZGF0YU9iai5idXR0b25zO1xuXG4gICAgLy8gZGVmYXVsdCBidXR0b24gaWYgbm9uZVxuICAgIGlmICghYnV0dG9uRGF0YSkge1xuICAgICAgYnV0dG9uRGF0YSA9IFt7XG4gICAgICAgIGxhYmVsOiAnQ2xvc2UnLFxuICAgICAgICB0eXBlIDogJycsXG4gICAgICAgIGljb24gOiAndGltZXMnLFxuICAgICAgICBpZCAgIDogJ2RlZmF1bHQtY2xvc2UnXG4gICAgICB9XTtcbiAgICB9XG5cbiAgICB2YXIgYnV0dG9uQ29udGFpbmVyID0gYm94T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmZvb3Rlci1idXR0b25zJyk7XG5cbiAgICBfZG9tVXRpbHMucmVtb3ZlQWxsRWxlbWVudHMoYnV0dG9uQ29udGFpbmVyKTtcblxuICAgIGJ1dHRvbkRhdGEuZm9yRWFjaChmdW5jdGlvbiBtYWtlQnV0dG9uKGJ1dHRvbk9iaikge1xuICAgICAgYnV0dG9uT2JqLmlkID0gYm94T2JqLmlkICsgJy1idXR0b24tJyArIGJ1dHRvbk9iai5pZDtcblxuICAgICAgdmFyIGJ1dHRvbkVsO1xuXG4gICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdpY29uJykpIHtcbiAgICAgICAgYnV0dG9uRWwgPSBfdGVtcGxhdGUuYXNFbGVtZW50KF9idXR0b25JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1dHRvbkVsID0gX3RlbXBsYXRlLmFzRWxlbWVudChfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH1cblxuICAgICAgYnV0dG9uQ29udGFpbmVyLmFwcGVuZENoaWxkKGJ1dHRvbkVsKTtcblxuICAgICAgdmFyIGJ0blN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKVxuICAgICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdvbkNsaWNrJykpIHtcbiAgICAgICAgICAgIGlmIChidXR0b25PYmoub25DbGljaykge1xuICAgICAgICAgICAgICBidXR0b25PYmoub25DbGljay5jYWxsKHRoaXMsIGNhcHR1cmVGb3JtRGF0YShib3hPYmouaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVtb3ZlKGJveE9iai5pZCk7XG4gICAgICAgIH0pO1xuICAgICAgYm94T2JqLnN0cmVhbXMucHVzaChidG5TdHJlYW0pO1xuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBkYXRhIGZyb20gdGhlIGZvcm0gb24gdGhlIGJveCBjb250ZW50c1xuICAgKiBAcGFyYW0gYm94SURcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjYXB0dXJlRm9ybURhdGEoYm94SUQpIHtcbiAgICByZXR1cm4gX2RvbVV0aWxzLmNhcHR1cmVGb3JtRGF0YShnZXRPYmpCeUlEKGJveElEKS5lbGVtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBib3ggZnJvbSB0aGUgc2NyZWVuIC8gY29udGFpbmVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIGJveE9iajtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG4gICAgICB0cmFuc2l0aW9uT3V0KGJveE9iai5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvdyB0aGUgYm94XG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLCB7YWxwaGE6IDAsIHJvdGF0aW9uWDogNDUsIHNjYWxlOiAyfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGFscGhhICAgIDogMSxcbiAgICAgIHJvdGF0aW9uWDogMCxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBib3hcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjI1LCB7XG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICByb3RhdGlvblg6IC00NSxcbiAgICAgIHNjYWxlICAgIDogMC4yNSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFuIHVwIGFmdGVyIHRoZSB0cmFuc2l0aW9uIG91dCBhbmltYXRpb25cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG5cbiAgICBib3hPYmouc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgIHN0cmVhbS5kaXNwb3NlKCk7XG4gICAgfSk7XG5cbiAgICBEcmFnZ2FibGUuZ2V0KCcjJyArIGJveE9iai5pZCkuZGlzYWJsZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuXG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcblxuICAgIGNoZWNrTW9kYWxTdGF0dXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgYW55IG9wZW4gYm94ZXMgaGF2ZSBtb2RhbCB0cnVlXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja01vZGFsU3RhdHVzKCkge1xuICAgIHZhciBpc01vZGFsID0gZmFsc2U7XG5cbiAgICBfY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoYm94T2JqKSB7XG4gICAgICBpZiAoYm94T2JqLm1vZGFsID09PSB0cnVlKSB7XG4gICAgICAgIGlzTW9kYWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFpc01vZGFsKSB7XG4gICAgICBfbW9kYWwuaGlkZSh0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXRpbGl0eSB0byBnZXQgdGhlIGJveCBvYmplY3QgaW5kZXggYnkgSURcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVdGlsaXR5IHRvIGdldCB0aGUgYm94IG9iamVjdCBieSBJRFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXNcbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgTWVzc2FnZUJveFZpZXcoKTsiLCJ2YXIgTW9kYWxDb3ZlclZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tb3VudFBvaW50ICA9IGRvY3VtZW50LFxuICAgICAgX21vZGFsQ292ZXJFbCxcbiAgICAgIF9tb2RhbEJhY2tncm91bmRFbCxcbiAgICAgIF9tb2RhbENsb3NlQnV0dG9uRWwsXG4gICAgICBfbW9kYWxDbGlja1N0cmVhbSxcbiAgICAgIF9pc1Zpc2libGUsXG4gICAgICBfbm90RGlzbWlzc2libGUsXG4gICAgICBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG5cbiAgICBfaXNWaXNpYmxlID0gdHJ1ZTtcblxuICAgIF9tb2RhbENvdmVyRWwgICAgICAgPSBfbW91bnRQb2ludC5nZXRFbGVtZW50QnlJZCgnbW9kYWxfX2NvdmVyJyk7XG4gICAgX21vZGFsQmFja2dyb3VuZEVsICA9IF9tb3VudFBvaW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbF9fYmFja2dyb3VuZCcpO1xuICAgIF9tb2RhbENsb3NlQnV0dG9uRWwgPSBfbW91bnRQb2ludC5xdWVyeVNlbGVjdG9yKCcubW9kYWxfX2Nsb3NlLWJ1dHRvbicpO1xuXG4gICAgdmFyIG1vZGFsQkdDbGljayAgICAgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChfbW9kYWxCYWNrZ3JvdW5kRWwsIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpLFxuICAgICAgICBtb2RhbEJ1dHRvbkNsaWNrID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoX21vZGFsQ2xvc2VCdXR0b25FbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSk7XG5cbiAgICBfbW9kYWxDbGlja1N0cmVhbSA9IFJ4Lk9ic2VydmFibGUubWVyZ2UobW9kYWxCR0NsaWNrLCBtb2RhbEJ1dHRvbkNsaWNrKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uTW9kYWxDbGljaygpO1xuICAgICAgfSk7XG5cbiAgICBoaWRlKGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElzVmlzaWJsZSgpIHtcbiAgICByZXR1cm4gX2lzVmlzaWJsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uTW9kYWxDbGljaygpIHtcbiAgICBpZiAoX25vdERpc21pc3NpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGhpZGUodHJ1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKSB7XG4gICAgX2lzVmlzaWJsZSAgID0gdHJ1ZTtcbiAgICB2YXIgZHVyYXRpb24gPSBzaG91bGRBbmltYXRlID8gMC4yNSA6IDA7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhbHBoYTogMSxcbiAgICAgIGVhc2UgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3coc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NpYmxlID0gZmFsc2U7XG5cbiAgICBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKTtcblxuICAgIFR3ZWVuTGl0ZS5zZXQoX21vZGFsQ2xvc2VCdXR0b25FbCwge3NjYWxlOiAyLCBhbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAxLCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBzY2FsZSAgICA6IDEsXG4gICAgICBlYXNlICAgICA6IEJvdW5jZS5lYXNlT3V0LFxuICAgICAgZGVsYXkgICAgOiAxXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQSAnaGFyZCcgbW9kYWwgdmlldyBjYW5ub3QgYmUgZGlzbWlzc2VkIHdpdGggYSBjbGljaywgbXVzdCBiZSB2aWEgY29kZVxuICAgKiBAcGFyYW0gc2hvdWxkQW5pbWF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd05vbkRpc21pc3NhYmxlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoX2lzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ub3REaXNtaXNzaWJsZSA9IHRydWU7XG5cbiAgICBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgMCwge2F1dG9BbHBoYTogMH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZShzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKCFfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9pc1Zpc2libGUgICAgICA9IGZhbHNlO1xuICAgIF9ub3REaXNtaXNzaWJsZSA9IGZhbHNlO1xuICAgIHZhciBkdXJhdGlvbiAgICA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKF9tb2RhbENsb3NlQnV0dG9uRWwpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDb3ZlckVsLCBkdXJhdGlvbiwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgZHVyYXRpb24gLyAyLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRPcGFjaXR5KG9wYWNpdHkpIHtcbiAgICBpZiAob3BhY2l0eSA8IDAgfHwgb3BhY2l0eSA+IDEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdudWRvcnUvY29tcG9uZW50L01vZGFsQ292ZXJWaWV3OiBzZXRPcGFjaXR5OiBvcGFjaXR5IHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kIDEnKTtcbiAgICAgIG9wYWNpdHkgPSAxO1xuICAgIH1cbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCAwLjI1LCB7XG4gICAgICBhbHBoYTogb3BhY2l0eSxcbiAgICAgIGVhc2UgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldENvbG9yKHIsIGcsIGIpIHtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCAwLjI1LCB7XG4gICAgICBiYWNrZ3JvdW5kQ29sb3I6ICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJyxcbiAgICAgIGVhc2UgICAgICAgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemUgICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBzaG93ICAgICAgICAgICAgICA6IHNob3csXG4gICAgc2hvd05vbkRpc21pc3NhYmxlOiBzaG93Tm9uRGlzbWlzc2FibGUsXG4gICAgaGlkZSAgICAgICAgICAgICAgOiBoaWRlLFxuICAgIHZpc2libGUgICAgICAgICAgIDogZ2V0SXNWaXNpYmxlLFxuICAgIHNldE9wYWNpdHkgICAgICAgIDogc2V0T3BhY2l0eSxcbiAgICBzZXRDb2xvciAgICAgICAgICA6IHNldENvbG9yXG4gIH07XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IE1vZGFsQ292ZXJWaWV3KCk7IiwidmFyIFRvYXN0VmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2NoaWxkcmVuICAgICAgICAgICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICAgICAgICAgICA9IDAsXG4gICAgICBfZGVmYXVsdEV4cGlyZUR1cmF0aW9uID0gNzAwMCxcbiAgICAgIF90eXBlcyAgICAgICAgICAgICAgICAgPSB7XG4gICAgICAgIERFRkFVTFQgICAgOiAnZGVmYXVsdCcsXG4gICAgICAgIElORk9STUFUSU9OOiAnaW5mb3JtYXRpb24nLFxuICAgICAgICBTVUNDRVNTICAgIDogJ3N1Y2Nlc3MnLFxuICAgICAgICBXQVJOSU5HICAgIDogJ3dhcm5pbmcnLFxuICAgICAgICBEQU5HRVIgICAgIDogJ2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfdHlwZVN0eWxlTWFwICAgICAgICAgID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ3RvYXN0X19pbmZvcm1hdGlvbicsXG4gICAgICAgICdzdWNjZXNzJyAgICA6ICd0b2FzdF9fc3VjY2VzcycsXG4gICAgICAgICd3YXJuaW5nJyAgICA6ICd0b2FzdF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICd0b2FzdF9fZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX3RlbXBsYXRlICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX2Jyb3dzZXJJbmZvICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyksXG4gICAgICBfZG9tVXRpbHMgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKSxcbiAgICAgIF9jb21wb25lbnRVdGlscyAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8vb2JqLnRpdGxlLCBvYmouY29udGVudCwgb2JqLnR5cGVcbiAgZnVuY3Rpb24gYWRkKGluaXRPYmopIHtcbiAgICBpbml0T2JqLnR5cGUgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQ7XG5cbiAgICB2YXIgdG9hc3RPYmogPSBjcmVhdGVUb2FzdE9iamVjdChpbml0T2JqLnRpdGxlLCBpbml0T2JqLm1lc3NhZ2UpO1xuXG4gICAgX2NoaWxkcmVuLnB1c2godG9hc3RPYmopO1xuXG4gICAgX21vdW50UG9pbnQuaW5zZXJ0QmVmb3JlKHRvYXN0T2JqLmVsZW1lbnQsIF9tb3VudFBvaW50LmZpcnN0Q2hpbGQpO1xuXG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KGluaXRPYmoudHlwZSwgdG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICBfY29tcG9uZW50VXRpbHMuYXBwbHkzRFRvQ29udGFpbmVyKF9tb3VudFBvaW50KTtcbiAgICBfY29tcG9uZW50VXRpbHMuYXBwbHkzRFRvRWxlbWVudCh0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIHZhciBjbG9zZUJ0biAgICAgICAgID0gdG9hc3RPYmouZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcudG9hc3RfX2l0ZW0tY29udHJvbHMgPiBidXR0b24nKSxcbiAgICAgICAgY2xvc2VCdG5TdGVhbSAgICA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGNsb3NlQnRuLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKSxcbiAgICAgICAgZXhwaXJlVGltZVN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoX2RlZmF1bHRFeHBpcmVEdXJhdGlvbik7XG5cbiAgICB0b2FzdE9iai5kZWZhdWx0QnV0dG9uU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5tZXJnZShjbG9zZUJ0blN0ZWFtLCBleHBpcmVUaW1lU3RyZWFtKS50YWtlKDEpXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVtb3ZlKHRvYXN0T2JqLmlkKTtcbiAgICAgIH0pO1xuXG4gICAgdHJhbnNpdGlvbkluKHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgcmV0dXJuIHRvYXN0T2JqLmlkO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVG9hc3RPYmplY3QodGl0bGUsIG1lc3NhZ2UpIHtcbiAgICB2YXIgaWQgID0gJ2pzX190b2FzdC10b2FzdGl0ZW0tJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgaWQgICAgICAgICAgICAgICAgIDogaWQsXG4gICAgICAgICAgZWxlbWVudCAgICAgICAgICAgIDogX3RlbXBsYXRlLmFzRWxlbWVudCgnY29tcG9uZW50LS10b2FzdCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgfSksXG4gICAgICAgICAgZGVmYXVsdEJ1dHRvblN0cmVhbTogbnVsbFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShpZCkge1xuICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQoaWQpLFxuICAgICAgICB0b2FzdDtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgdG9hc3QgPSBfY2hpbGRyZW5baWR4XTtcbiAgICAgIHJlYXJyYW5nZShpZHgpO1xuICAgICAgdHJhbnNpdGlvbk91dCh0b2FzdC5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uSW4oZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAsIHthbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMSwge2FscGhhOiAxLCBlYXNlOiBRdWFkLmVhc2VPdXR9KTtcbiAgICByZWFycmFuZ2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25PdXQoZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuMjUsIHtcbiAgICAgIHJvdGF0aW9uWDogLTQ1LFxuICAgICAgYWxwaGEgICAgOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VJbiwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgICAgID0gZ2V0T2JqSW5kZXhCeUlEKGVsLmdldEF0dHJpYnV0ZSgnaWQnKSksXG4gICAgICAgIHRvYXN0T2JqICAgPSBfY2hpbGRyZW5baWR4XTtcblxuICAgIHRvYXN0T2JqLmRlZmF1bHRCdXR0b25TdHJlYW0uZGlzcG9zZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFycmFuZ2UoaWdub3JlKSB7XG4gICAgdmFyIGkgPSBfY2hpbGRyZW4ubGVuZ3RoIC0gMSxcbiAgICAgICAgY3VycmVudCxcbiAgICAgICAgeSA9IDA7XG5cbiAgICBmb3IgKDsgaSA+IC0xOyBpLS0pIHtcbiAgICAgIGlmIChpID09PSBpZ25vcmUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjdXJyZW50ID0gX2NoaWxkcmVuW2ldO1xuICAgICAgVHdlZW5MaXRlLnRvKGN1cnJlbnQuZWxlbWVudCwgMC43NSwge3k6IHksIGVhc2U6IEJvdW5jZS5lYXNlT3V0fSk7XG4gICAgICB5ICs9IDEwICsgY3VycmVudC5lbGVtZW50LmNsaWVudEhlaWdodDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlc1xuICB9O1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBUb2FzdFZpZXcoKTsiLCJ2YXIgVG9vbFRpcFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgPSAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCA9IDIwMCxcbiAgICAgIF90eXBlcyAgICAgICAgPSB7XG4gICAgICAgIERFRkFVTFQgICAgOiAnZGVmYXVsdCcsXG4gICAgICAgIElORk9STUFUSU9OOiAnaW5mb3JtYXRpb24nLFxuICAgICAgICBTVUNDRVNTICAgIDogJ3N1Y2Nlc3MnLFxuICAgICAgICBXQVJOSU5HICAgIDogJ3dhcm5pbmcnLFxuICAgICAgICBEQU5HRVIgICAgIDogJ2RhbmdlcicsXG4gICAgICAgIENPQUNITUFSSyAgOiAnY29hY2htYXJrJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgPSB7XG4gICAgICAgICdkZWZhdWx0JyAgICA6ICcnLFxuICAgICAgICAnaW5mb3JtYXRpb24nOiAndG9vbHRpcF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAndG9vbHRpcF9fc3VjY2VzcycsXG4gICAgICAgICd3YXJuaW5nJyAgICA6ICd0b29sdGlwX193YXJuaW5nJyxcbiAgICAgICAgJ2RhbmdlcicgICAgIDogJ3Rvb2x0aXBfX2RhbmdlcicsXG4gICAgICAgICdjb2FjaG1hcmsnICA6ICd0b29sdGlwX19jb2FjaG1hcmsnXG4gICAgICB9LFxuICAgICAgX3Bvc2l0aW9ucyAgICA9IHtcbiAgICAgICAgVCA6ICdUJyxcbiAgICAgICAgVFI6ICdUUicsXG4gICAgICAgIFIgOiAnUicsXG4gICAgICAgIEJSOiAnQlInLFxuICAgICAgICBCIDogJ0InLFxuICAgICAgICBCTDogJ0JMJyxcbiAgICAgICAgTCA6ICdMJyxcbiAgICAgICAgVEw6ICdUTCdcbiAgICAgIH0sXG4gICAgICBfcG9zaXRpb25NYXAgID0ge1xuICAgICAgICAnVCcgOiAndG9vbHRpcF9fdG9wJyxcbiAgICAgICAgJ1RSJzogJ3Rvb2x0aXBfX3RvcHJpZ2h0JyxcbiAgICAgICAgJ1InIDogJ3Rvb2x0aXBfX3JpZ2h0JyxcbiAgICAgICAgJ0JSJzogJ3Rvb2x0aXBfX2JvdHRvbXJpZ2h0JyxcbiAgICAgICAgJ0InIDogJ3Rvb2x0aXBfX2JvdHRvbScsXG4gICAgICAgICdCTCc6ICd0b29sdGlwX19ib3R0b21sZWZ0JyxcbiAgICAgICAgJ0wnIDogJ3Rvb2x0aXBfX2xlZnQnLFxuICAgICAgICAnVEwnOiAndG9vbHRpcF9fdG9wbGVmdCdcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF90ZW1wbGF0ZSAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvL29iai50aXRsZSwgb2JqLmNvbnRlbnQsIG9iai50eXBlLCBvYmoudGFyZ2V0LCBvYmoucG9zaXRpb25cbiAgZnVuY3Rpb24gYWRkKGluaXRPYmopIHtcbiAgICBpbml0T2JqLnR5cGUgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQ7XG5cbiAgICB2YXIgdG9vbHRpcE9iaiA9IGNyZWF0ZVRvb2xUaXBPYmplY3QoaW5pdE9iai50aXRsZSxcbiAgICAgIGluaXRPYmouY29udGVudCxcbiAgICAgIGluaXRPYmoucG9zaXRpb24sXG4gICAgICBpbml0T2JqLnRhcmdldEVsLFxuICAgICAgaW5pdE9iai5ndXR0ZXIsXG4gICAgICBpbml0T2JqLmFsd2F5c1Zpc2libGUpO1xuXG4gICAgX2NoaWxkcmVuLnB1c2godG9vbHRpcE9iaik7XG4gICAgX21vdW50UG9pbnQuYXBwZW5kQ2hpbGQodG9vbHRpcE9iai5lbGVtZW50KTtcblxuICAgIHRvb2x0aXBPYmouYXJyb3dFbCA9IHRvb2x0aXBPYmouZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3cnKTtcbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQoaW5pdE9iai50eXBlLCBpbml0T2JqLnBvc2l0aW9uLCB0b29sdGlwT2JqLmVsZW1lbnQpO1xuXG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmVsZW1lbnQsIHtcbiAgICAgIGNzczoge1xuICAgICAgICBhdXRvQWxwaGE6IHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSA/IDEgOiAwLFxuICAgICAgICB3aWR0aCAgICA6IGluaXRPYmoud2lkdGggPyBpbml0T2JqLndpZHRoIDogX2RlZmF1bHRXaWR0aFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gY2FjaGUgdGhlc2UgdmFsdWVzLCAzZCB0cmFuc2Zvcm1zIHdpbGwgYWx0ZXIgc2l6ZVxuICAgIHRvb2x0aXBPYmoud2lkdGggID0gdG9vbHRpcE9iai5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoO1xuICAgIHRvb2x0aXBPYmouaGVpZ2h0ID0gdG9vbHRpcE9iai5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcblxuICAgIGFzc2lnbkV2ZW50c1RvVGFyZ2V0RWwodG9vbHRpcE9iaik7XG4gICAgcG9zaXRpb25Ub29sVGlwKHRvb2x0aXBPYmopO1xuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuTCB8fCB0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlIpIHtcbiAgICAgIGNlbnRlckFycm93VmVydGljYWxseSh0b29sdGlwT2JqKTtcbiAgICB9XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UIHx8IHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQikge1xuICAgICAgY2VudGVyQXJyb3dIb3Jpem9udGFsbHkodG9vbHRpcE9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRvb2x0aXBPYmouZWxlbWVudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBwb3NpdGlvbiwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF9wb3NpdGlvbk1hcFtwb3NpdGlvbl0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVG9vbFRpcE9iamVjdCh0aXRsZSwgbWVzc2FnZSwgcG9zaXRpb24sIHRhcmdldCwgZ3V0dGVyLCBhbHdheXNWaXNpYmxlKSB7XG4gICAgdmFyIGlkICA9ICdqc19fdG9vbHRpcC10b29sdGlwaXRlbS0nICsgKF9jb3VudGVyKyspLnRvU3RyaW5nKCksXG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICBpZCAgICAgICAgICAgOiBpZCxcbiAgICAgICAgICBwb3NpdGlvbiAgICAgOiBwb3NpdGlvbixcbiAgICAgICAgICB0YXJnZXRFbCAgICAgOiB0YXJnZXQsXG4gICAgICAgICAgYWx3YXlzVmlzaWJsZTogYWx3YXlzVmlzaWJsZSB8fCBmYWxzZSxcbiAgICAgICAgICBndXR0ZXIgICAgICAgOiBndXR0ZXIgfHwgMTUsXG4gICAgICAgICAgZWxPdmVyU3RyZWFtIDogbnVsbCxcbiAgICAgICAgICBlbE91dFN0cmVhbSAgOiBudWxsLFxuICAgICAgICAgIGhlaWdodCAgICAgICA6IDAsXG4gICAgICAgICAgd2lkdGggICAgICAgIDogMCxcbiAgICAgICAgICBlbGVtZW50ICAgICAgOiBfdGVtcGxhdGUuYXNFbGVtZW50KCdjb21wb25lbnQtLXRvb2x0aXAnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGFycm93RWwgICAgICA6IG51bGxcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopIHtcbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdG9vbHRpcE9iai5lbE92ZXJTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh0b29sdGlwT2JqLnRhcmdldEVsLCAnbW91c2VvdmVyJylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBzaG93VG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuXG4gICAgdG9vbHRpcE9iai5lbE91dFN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW91dCcpXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgaGlkZVRvb2xUaXAodG9vbHRpcE9iai5pZCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dUb29sVGlwKGlkKSB7XG4gICAgdmFyIHRvb2x0aXBPYmogPSBnZXRPYmpCeUlEKGlkKTtcblxuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaik7XG4gICAgdHJhbnNpdGlvbkluKHRvb2x0aXBPYmouZWxlbWVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaikge1xuICAgIHZhciBndXR0ZXIgICA9IHRvb2x0aXBPYmouZ3V0dGVyLFxuICAgICAgICB4UG9zICAgICA9IDAsXG4gICAgICAgIHlQb3MgICAgID0gMCxcbiAgICAgICAgdGd0UHJvcHMgPSB0b29sdGlwT2JqLnRhcmdldEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVEwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgKyAoKHRndFByb3BzLndpZHRoIC8gMikgLSAodG9vbHRpcE9iai53aWR0aCAvIDIpKTtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodCAtIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVFIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0ICsgZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkJSKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQ7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbSArIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aCAtIGd1dHRlcjtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgKyAoKHRndFByb3BzLmhlaWdodCAvIDIpIC0gKHRvb2x0aXBPYmouaGVpZ2h0IC8gMikpO1xuICAgIH1cblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICB4OiB4UG9zLFxuICAgICAgeTogeVBvc1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dIb3Jpem9udGFsbHkodG9vbHRpcE9iaikge1xuICAgIHZhciBhcnJvd1Byb3BzID0gdG9vbHRpcE9iai5hcnJvd0VsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5hcnJvd0VsLCB7eDogKHRvb2x0aXBPYmoud2lkdGggLyAyKSAtIChhcnJvd1Byb3BzLndpZHRoIC8gMil9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNlbnRlckFycm93VmVydGljYWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt5OiAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSAtIChhcnJvd1Byb3BzLmhlaWdodCAvIDIpIC0gMn0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZVRvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyYW5zaXRpb25PdXQodG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC41LCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4wNSwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShlbCkge1xuICAgIGdldE9iakJ5RWxlbWVudChlbCkuZm9yRWFjaChmdW5jdGlvbiAodG9vbHRpcCkge1xuICAgICAgaWYgKHRvb2x0aXAuZWxPdmVyU3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdmVyU3RyZWFtLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b29sdGlwLmVsT3V0U3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdXRTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuXG4gICAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQodG9vbHRpcC5pZCk7XG5cbiAgICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5RWxlbWVudChlbCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLnRhcmdldEVsID09PSBlbDtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQb3NpdGlvbnMoKSB7XG4gICAgcmV0dXJuIF9wb3NpdGlvbnM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlcyxcbiAgICBwb3NpdGlvbiAgOiBnZXRQb3NpdGlvbnNcbiAgfTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgVG9vbFRpcFZpZXcoKTsiLCJleHBvcnQgZGVmYXVsdCB7XG5cbiAgaXNJbnRlZ2VyOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuICgvXi0/XFxkKyQvLnRlc3Qoc3RyKSk7XG4gIH0sXG5cbiAgcm5kTnVtYmVyOiBmdW5jdGlvbiAobWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgfSxcblxuICBjbGFtcDogZnVuY3Rpb24gKHZhbCwgbWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbihtYXgsIHZhbCkpO1xuICB9LFxuXG4gIGluUmFuZ2U6IGZ1bmN0aW9uICh2YWwsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIHZhbCA+IG1pbiAmJiB2YWwgPCBtYXg7XG4gIH0sXG5cbiAgZGlzdGFuY2VUTDogZnVuY3Rpb24gKHBvaW50MSwgcG9pbnQyKSB7XG4gICAgdmFyIHhkID0gKHBvaW50Mi5sZWZ0IC0gcG9pbnQxLmxlZnQpLFxuICAgICAgICB5ZCA9IChwb2ludDIudG9wIC0gcG9pbnQxLnRvcCk7XG4gICAgcmV0dXJuIE1hdGguc3FydCgoeGQgKiB4ZCkgKyAoeWQgKiB5ZCkpO1xuICB9XG5cbn07IiwiZXhwb3J0IGRlZmF1bHQge1xuXG4gIC8qKlxuICAgKiBUZXN0IGZvclxuICAgKiBPYmplY3Qge1wiXCI6IHVuZGVmaW5lZH1cbiAgICogT2JqZWN0IHt1bmRlZmluZWQ6IHVuZGVmaW5lZH1cbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzTnVsbDogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBpc251bGwgPSBmYWxzZTtcblxuICAgIGlmIChpcy5mYWxzZXkob2JqKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgIGlmIChwcm9wID09PSB1bmRlZmluZWQgfHwgb2JqW3Byb3BdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaXNudWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBpc251bGw7XG4gIH0sXG5cbiAgZHluYW1pY1NvcnQ6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIGFbcHJvcGVydHldIDwgYltwcm9wZXJ0eV0gPyAtMSA6IGFbcHJvcGVydHldID4gYltwcm9wZXJ0eV0gPyAxIDogMDtcbiAgICB9O1xuICB9LFxuXG4gIHNlYXJjaE9iamVjdHM6IGZ1bmN0aW9uIChvYmosIGtleSwgdmFsKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmpbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9iamVjdHMgPSBvYmplY3RzLmNvbmNhdChzZWFyY2hPYmplY3RzKG9ialtpXSwga2V5LCB2YWwpKTtcbiAgICAgIH0gZWxzZSBpZiAoaSA9PT0ga2V5ICYmIG9ialtrZXldID09PSB2YWwpIHtcbiAgICAgICAgb2JqZWN0cy5wdXNoKG9iaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzO1xuICB9LFxuXG4gIGdldE9iamVjdEZyb21TdHJpbmc6IGZ1bmN0aW9uIChvYmosIHN0cikge1xuICAgIHZhciBpICAgID0gMCxcbiAgICAgICAgcGF0aCA9IHN0ci5zcGxpdCgnLicpLFxuICAgICAgICBsZW4gID0gcGF0aC5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBvYmogPSBvYmpbcGF0aFtpXV07XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgZ2V0T2JqZWN0SW5kZXhGcm9tSWQ6IGZ1bmN0aW9uIChvYmosIGlkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqW2ldICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBvYmpbaV0uaWQgIT09IFwidW5kZWZpbmVkXCIgJiYgb2JqW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvLyBleHRlbmQgYW5kIGRlZXAgZXh0ZW5kIGZyb20gaHR0cDovL3lvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb20vXG4gIGV4dGVuZDogZnVuY3Rpb24gKG91dCkge1xuICAgIG91dCA9IG91dCB8fCB7fTtcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50c1tpXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBvdXRba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICBkZWVwRXh0ZW5kOiBmdW5jdGlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBvYmogPSBhcmd1bWVudHNbaV07XG5cbiAgICAgIGlmICghb2JqKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2Ygb2JqW2tleV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBkZWVwRXh0ZW5kKG91dFtrZXldLCBvYmpba2V5XSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dFtrZXldID0gb2JqW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICAvKipcbiAgICogU2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbiBvZiBTdGFtcHMgLSBodHRwOi8vZXJpY2xlYWRzLmNvbS8yMDE0LzAyL3Byb3RvdHlwYWwtaW5oZXJpdGFuY2Utd2l0aC1zdGFtcHMvXG4gICAqIGh0dHBzOi8vd3d3LmJhcmt3ZWIuY28udWsvYmxvZy9vYmplY3QtY29tcG9zaXRpb24tYW5kLXByb3RvdHlwaWNhbC1pbmhlcml0YW5jZS1pbi1qYXZhc2NyaXB0XG4gICAqXG4gICAqIFByb3RvdHlwZSBvYmplY3QgcmVxdWlyZXMgYSBtZXRob2RzIG9iamVjdCwgcHJpdmF0ZSBjbG9zdXJlcyBhbmQgc3RhdGUgaXMgb3B0aW9uYWxcbiAgICpcbiAgICogQHBhcmFtIHByb3RvdHlwZVxuICAgKiBAcmV0dXJucyBOZXcgb2JqZWN0IHVzaW5nIHByb3RvdHlwZS5tZXRob2RzIGFzIHNvdXJjZVxuICAgKi9cbiAgYmFzaWNGYWN0b3J5OiBmdW5jdGlvbiAocHJvdG90eXBlKSB7XG4gICAgdmFyIHByb3RvID0gcHJvdG90eXBlLFxuICAgICAgICBvYmogICA9IE9iamVjdC5jcmVhdGUocHJvdG8ubWV0aG9kcyk7XG5cbiAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkoJ2Nsb3N1cmUnKSkge1xuICAgICAgcHJvdG8uY2xvc3VyZXMuZm9yRWFjaChmdW5jdGlvbiAoY2xvc3VyZSkge1xuICAgICAgICBjbG9zdXJlLmNhbGwob2JqKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnc3RhdGUnKSkge1xuICAgICAgZm9yICh2YXIga2V5IGluIHByb3RvLnN0YXRlKSB7XG4gICAgICAgIG9ialtrZXldID0gcHJvdG8uc3RhdGVba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gICAqXG4gICAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gICAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAgICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gICAqXG4gICAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICAgKlxuICAgKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gICAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAgICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gICAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAgICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gICAqXG4gICAqL1xuICAvKipcbiAgICogQ29uc3RydWN0cyBhbiBlbnVtZXJhdGlvbiB3aXRoIGtleXMgZXF1YWwgdG8gdGhlaXIgdmFsdWUuXG4gICAqXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9TVFJNTC9rZXltaXJyb3JcbiAgICpcbiAgICogRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqICAgdmFyIENPTE9SUyA9IGtleU1pcnJvcih7Ymx1ZTogbnVsbCwgcmVkOiBudWxsfSk7XG4gICAqICAgdmFyIG15Q29sb3IgPSBDT0xPUlMuYmx1ZTtcbiAgICogICB2YXIgaXNDb2xvclZhbGlkID0gISFDT0xPUlNbbXlDb2xvcl07XG4gICAqXG4gICAqIFRoZSBsYXN0IGxpbmUgY291bGQgbm90IGJlIHBlcmZvcm1lZCBpZiB0aGUgdmFsdWVzIG9mIHRoZSBnZW5lcmF0ZWQgZW51bSB3ZXJlXG4gICAqIG5vdCBlcXVhbCB0byB0aGVpciBrZXlzLlxuICAgKlxuICAgKiAgIElucHV0OiAge2tleTE6IHZhbDEsIGtleTI6IHZhbDJ9XG4gICAqICAgT3V0cHV0OiB7a2V5MToga2V5MSwga2V5Mjoga2V5Mn1cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IG9ialxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqL1xuICBrZXlNaXJyb3I6IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcmV0ID0ge307XG4gICAgdmFyIGtleTtcbiAgICBpZiAoIShvYmogaW5zdGFuY2VvZiBPYmplY3QgJiYgIUFycmF5LmlzQXJyYXkob2JqKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigna2V5TWlycm9yKC4uLik6IEFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0LicpO1xuICAgIH1cbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXRba2V5XSA9IGtleTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG59OyIsImV4cG9ydCBkZWZhdWx0IHtcbiAgZXhpc3R5ICAgICA6IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIHggIT09IG51bGw7XG4gIH0sXG4gIHRydXRoeSAgICAgOiBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiAoeCAhPT0gZmFsc2UpICYmIHRoaXMuZXhpc3R5KHgpO1xuICB9LFxuICBmYWxzZXkgICAgIDogZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4gIXRoaXMudHJ1dGh5KHgpO1xuICB9LFxuICBmdW5jICAgICAgIDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiB0eXBlb2Ygb2JqZWN0ID09PSBcImZ1bmN0aW9uXCI7XG4gIH0sXG4gIG9iamVjdCAgICAgOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09PSBcIltvYmplY3QgT2JqZWN0XVwiO1xuICB9LFxuICBvYmplY3RFbXB0eTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBzdHJpbmcgICAgIDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gXCJbb2JqZWN0IFN0cmluZ11cIjtcbiAgfSxcbiAgYXJyYXkgICAgICA6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShvYmplY3QpO1xuICAgIC8vcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9LFxuICBwcm9taXNlICAgIDogZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICByZXR1cm4gcHJvbWlzZSAmJiB0eXBlb2YgcHJvbWlzZS50aGVuID09PSAnZnVuY3Rpb24nO1xuICB9LFxuICBvYnNlcnZhYmxlIDogZnVuY3Rpb24gKG9ic2VydmFibGUpIHtcbiAgICByZXR1cm4gb2JzZXJ2YWJsZSAmJiB0eXBlb2Ygb2JzZXJ2YWJsZS5zdWJzY3JpYmUgPT09ICdmdW5jdGlvbic7XG4gIH0sXG4gIGVsZW1lbnQgICAgOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gJ29iamVjdCcgP1xuICAgIG9iaiBpbnN0YW5jZW9mIEhUTUxFbGVtZW50IHx8IG9iaiBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnQgOiAvL0RPTTJcbiAgICBvYmogJiYgdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsICYmXG4gICAgKG9iai5ub2RlVHlwZSA9PT0gMSB8fCBvYmoubm9kZVR5cGUgPT09IDExKSAmJlxuICAgIHR5cGVvZiBvYmoubm9kZU5hbWUgPT09ICdzdHJpbmcnO1xuICB9XG59OyIsIi8qKlxuICogIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG4hZnVuY3Rpb24odCxlKXtcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZT9tb2R1bGUuZXhwb3J0cz1lKCk6XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShlKTp0LkltbXV0YWJsZT1lKCl9KHRoaXMsZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiB0KHQsZSl7ZSYmKHQucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoZS5wcm90b3R5cGUpKSx0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj10fWZ1bmN0aW9uIGUodCl7cmV0dXJuIHQudmFsdWU9ITEsdH1mdW5jdGlvbiByKHQpe3QmJih0LnZhbHVlPSEwKX1mdW5jdGlvbiBuKCl7fWZ1bmN0aW9uIGkodCxlKXtlPWV8fDA7Zm9yKHZhciByPU1hdGgubWF4KDAsdC5sZW5ndGgtZSksbj1BcnJheShyKSxpPTA7cj5pO2krKyluW2ldPXRbaStlXTtyZXR1cm4gbn1mdW5jdGlvbiBvKHQpe3JldHVybiB2b2lkIDA9PT10LnNpemUmJih0LnNpemU9dC5fX2l0ZXJhdGUocykpLHQuc2l6ZX1mdW5jdGlvbiB1KHQsZSl7aWYoXCJudW1iZXJcIiE9dHlwZW9mIGUpe3ZhciByPWU+Pj4wO2lmKFwiXCIrciE9PWV8fDQyOTQ5NjcyOTU9PT1yKXJldHVybiBOYU47ZT1yfXJldHVybiAwPmU/byh0KStlOmV9ZnVuY3Rpb24gcygpe3JldHVybiEwfWZ1bmN0aW9uIGEodCxlLHIpe3JldHVybigwPT09dHx8dm9pZCAwIT09ciYmLXI+PXQpJiYodm9pZCAwPT09ZXx8dm9pZCAwIT09ciYmZT49cil9ZnVuY3Rpb24gaCh0LGUpe3JldHVybiBjKHQsZSwwKX1mdW5jdGlvbiBmKHQsZSl7cmV0dXJuIGModCxlLGUpfWZ1bmN0aW9uIGModCxlLHIpe3JldHVybiB2b2lkIDA9PT10P3I6MD50P01hdGgubWF4KDAsZSt0KTp2b2lkIDA9PT1lP3Q6TWF0aC5taW4oZSx0KX1mdW5jdGlvbiBfKHQpe3JldHVybiB5KHQpP3Q6Tyh0KX1mdW5jdGlvbiBwKHQpe3JldHVybiBkKHQpP3Q6eCh0KX1mdW5jdGlvbiB2KHQpe3JldHVybiBtKHQpP3Q6ayh0KX1mdW5jdGlvbiBsKHQpe3JldHVybiB5KHQpJiYhZyh0KT90OkEodCl9ZnVuY3Rpb24geSh0KXtyZXR1cm4hKCF0fHwhdFt2cl0pfWZ1bmN0aW9uIGQodCl7cmV0dXJuISghdHx8IXRbbHJdKX1mdW5jdGlvbiBtKHQpe3JldHVybiEoIXR8fCF0W3lyXSl9ZnVuY3Rpb24gZyh0KXtyZXR1cm4gZCh0KXx8bSh0KX1mdW5jdGlvbiB3KHQpe3JldHVybiEoIXR8fCF0W2RyXSl9ZnVuY3Rpb24gUyh0KXt0aGlzLm5leHQ9dH1mdW5jdGlvbiB6KHQsZSxyLG4pe3ZhciBpPTA9PT10P2U6MT09PXQ/cjpbZSxyXTtyZXR1cm4gbj9uLnZhbHVlPWk6bj17dmFsdWU6aSxkb25lOiExfSxufWZ1bmN0aW9uIEkoKXtyZXR1cm57dmFsdWU6dm9pZCAwLGRvbmU6ITB9fWZ1bmN0aW9uIGIodCl7cmV0dXJuISFNKHQpfWZ1bmN0aW9uIHEodCl7cmV0dXJuIHQmJlwiZnVuY3Rpb25cIj09dHlwZW9mIHQubmV4dH1mdW5jdGlvbiBEKHQpe3ZhciBlPU0odCk7cmV0dXJuIGUmJmUuY2FsbCh0KX1mdW5jdGlvbiBNKHQpe3ZhciBlPXQmJihTciYmdFtTcl18fHRbenJdKTtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiBlP2U6dm9pZCAwfWZ1bmN0aW9uIEUodCl7cmV0dXJuIHQmJlwibnVtYmVyXCI9PXR5cGVvZiB0Lmxlbmd0aH1mdW5jdGlvbiBPKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9UKCk6eSh0KT90LnRvU2VxKCk6Qyh0KX1mdW5jdGlvbiB4KHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9UKCkudG9LZXllZFNlcSgpOnkodCk/ZCh0KT90LnRvU2VxKCk6dC5mcm9tRW50cnlTZXEoKTpXKHQpfWZ1bmN0aW9uIGsodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP2QodCk/dC5lbnRyeVNlcSgpOnQudG9JbmRleGVkU2VxKCk6Qih0KX1mdW5jdGlvbiBBKHQpe3JldHVybihudWxsPT09dHx8dm9pZCAwPT09dD9UKCk6eSh0KT9kKHQpP3QuZW50cnlTZXEoKTp0OkIodCkpLnRvU2V0U2VxKCl9ZnVuY3Rpb24gaih0KXt0aGlzLl9hcnJheT10LHRoaXMuc2l6ZT10Lmxlbmd0aH1mdW5jdGlvbiBSKHQpe3ZhciBlPU9iamVjdC5rZXlzKHQpO3RoaXMuX29iamVjdD10LHRoaXMuX2tleXM9ZSxcbiAgdGhpcy5zaXplPWUubGVuZ3RofWZ1bmN0aW9uIFUodCl7dGhpcy5faXRlcmFibGU9dCx0aGlzLnNpemU9dC5sZW5ndGh8fHQuc2l6ZX1mdW5jdGlvbiBLKHQpe3RoaXMuX2l0ZXJhdG9yPXQsdGhpcy5faXRlcmF0b3JDYWNoZT1bXX1mdW5jdGlvbiBMKHQpe3JldHVybiEoIXR8fCF0W2JyXSl9ZnVuY3Rpb24gVCgpe3JldHVybiBxcnx8KHFyPW5ldyBqKFtdKSl9ZnVuY3Rpb24gVyh0KXt2YXIgZT1BcnJheS5pc0FycmF5KHQpP25ldyBqKHQpLmZyb21FbnRyeVNlcSgpOnEodCk/bmV3IEsodCkuZnJvbUVudHJ5U2VxKCk6Yih0KT9uZXcgVSh0KS5mcm9tRW50cnlTZXEoKTpcIm9iamVjdFwiPT10eXBlb2YgdD9uZXcgUih0KTp2b2lkIDA7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiBbaywgdl0gZW50cmllcywgb3Iga2V5ZWQgb2JqZWN0OiBcIit0KTtyZXR1cm4gZX1mdW5jdGlvbiBCKHQpe3ZhciBlPUoodCk7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiB2YWx1ZXM6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEModCl7dmFyIGU9Sih0KXx8XCJvYmplY3RcIj09dHlwZW9mIHQmJm5ldyBSKHQpO2lmKCFlKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBBcnJheSBvciBpdGVyYWJsZSBvYmplY3Qgb2YgdmFsdWVzLCBvciBrZXllZCBvYmplY3Q6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEoodCl7cmV0dXJuIEUodCk/bmV3IGoodCk6cSh0KT9uZXcgSyh0KTpiKHQpP25ldyBVKHQpOnZvaWQgMH1mdW5jdGlvbiBOKHQsZSxyLG4pe3ZhciBpPXQuX2NhY2hlO2lmKGkpe2Zvcih2YXIgbz1pLmxlbmd0aC0xLHU9MDtvPj11O3UrKyl7dmFyIHM9aVtyP28tdTp1XTtpZihlKHNbMV0sbj9zWzBdOnUsdCk9PT0hMSlyZXR1cm4gdSsxfXJldHVybiB1fXJldHVybiB0Ll9faXRlcmF0ZVVuY2FjaGVkKGUscil9ZnVuY3Rpb24gUCh0LGUscixuKXt2YXIgaT10Ll9jYWNoZTtpZihpKXt2YXIgbz1pLmxlbmd0aC0xLHU9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdD1pW3I/by11OnVdO3JldHVybiB1Kys+bz9JKCk6eihlLG4/dFswXTp1LTEsdFsxXSl9KX1yZXR1cm4gdC5fX2l0ZXJhdG9yVW5jYWNoZWQoZSxyKX1mdW5jdGlvbiBIKCl7dGhyb3cgVHlwZUVycm9yKFwiQWJzdHJhY3RcIil9ZnVuY3Rpb24gVigpe31mdW5jdGlvbiBZKCl7fWZ1bmN0aW9uIFEoKXt9ZnVuY3Rpb24gWCh0LGUpe2lmKHQ9PT1lfHx0IT09dCYmZSE9PWUpcmV0dXJuITA7aWYoIXR8fCFlKXJldHVybiExO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudmFsdWVPZiYmXCJmdW5jdGlvblwiPT10eXBlb2YgZS52YWx1ZU9mKXtpZih0PXQudmFsdWVPZigpLGU9ZS52YWx1ZU9mKCksdD09PWV8fHQhPT10JiZlIT09ZSlyZXR1cm4hMDtpZighdHx8IWUpcmV0dXJuITF9cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5lcXVhbHMmJlwiZnVuY3Rpb25cIj09dHlwZW9mIGUuZXF1YWxzJiZ0LmVxdWFscyhlKT8hMDohMX1mdW5jdGlvbiBGKHQsZSl7cmV0dXJuIGU/RyhlLHQsXCJcIix7XCJcIjp0fSk6Wih0KX1mdW5jdGlvbiBHKHQsZSxyLG4pe3JldHVybiBBcnJheS5pc0FycmF5KGUpP3QuY2FsbChuLHIsayhlKS5tYXAoZnVuY3Rpb24ocixuKXtyZXR1cm4gRyh0LHIsbixlKX0pKTokKGUpP3QuY2FsbChuLHIseChlKS5tYXAoZnVuY3Rpb24ocixuKXtyZXR1cm4gRyh0LHIsbixlKX0pKTplfWZ1bmN0aW9uIFoodCl7cmV0dXJuIEFycmF5LmlzQXJyYXkodCk/ayh0KS5tYXAoWikudG9MaXN0KCk6JCh0KT94KHQpLm1hcChaKS50b01hcCgpOnR9ZnVuY3Rpb24gJCh0KXtyZXR1cm4gdCYmKHQuY29uc3RydWN0b3I9PT1PYmplY3R8fHZvaWQgMD09PXQuY29uc3RydWN0b3IpfWZ1bmN0aW9uIHR0KHQpe3JldHVybiB0Pj4+MSYxMDczNzQxODI0fDMyMjEyMjU0NzEmdH1mdW5jdGlvbiBldCh0KXtpZih0PT09ITF8fG51bGw9PT10fHx2b2lkIDA9PT10KXJldHVybiAwO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudmFsdWVPZiYmKHQ9dC52YWx1ZU9mKCksXG4gIHQ9PT0hMXx8bnVsbD09PXR8fHZvaWQgMD09PXQpKXJldHVybiAwO2lmKHQ9PT0hMClyZXR1cm4gMTt2YXIgZT10eXBlb2YgdDtpZihcIm51bWJlclwiPT09ZSl7dmFyIHI9MHx0O2ZvcihyIT09dCYmKHJePTQyOTQ5NjcyOTUqdCk7dD40Mjk0OTY3Mjk1Oyl0Lz00Mjk0OTY3Mjk1LHJePXQ7cmV0dXJuIHR0KHIpfWlmKFwic3RyaW5nXCI9PT1lKXJldHVybiB0Lmxlbmd0aD5qcj9ydCh0KTpudCh0KTtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lmhhc2hDb2RlKXJldHVybiB0Lmhhc2hDb2RlKCk7aWYoXCJvYmplY3RcIj09PWUpcmV0dXJuIGl0KHQpO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudG9TdHJpbmcpcmV0dXJuIG50KFwiXCIrdCk7dGhyb3cgRXJyb3IoXCJWYWx1ZSB0eXBlIFwiK2UrXCIgY2Fubm90IGJlIGhhc2hlZC5cIil9ZnVuY3Rpb24gcnQodCl7dmFyIGU9S3JbdF07cmV0dXJuIHZvaWQgMD09PWUmJihlPW50KHQpLFVyPT09UnImJihVcj0wLEtyPXt9KSxVcisrLEtyW3RdPWUpLGV9ZnVuY3Rpb24gbnQodCl7Zm9yKHZhciBlPTAscj0wO3QubGVuZ3RoPnI7cisrKWU9MzEqZSt0LmNoYXJDb2RlQXQocil8MDtyZXR1cm4gdHQoZSl9ZnVuY3Rpb24gaXQodCl7dmFyIGU7aWYoeHImJihlPURyLmdldCh0KSx2b2lkIDAhPT1lKSlyZXR1cm4gZTtpZihlPXRbQXJdLHZvaWQgMCE9PWUpcmV0dXJuIGU7aWYoIU9yKXtpZihlPXQucHJvcGVydHlJc0VudW1lcmFibGUmJnQucHJvcGVydHlJc0VudW1lcmFibGVbQXJdLHZvaWQgMCE9PWUpcmV0dXJuIGU7aWYoZT1vdCh0KSx2b2lkIDAhPT1lKXJldHVybiBlfWlmKGU9KytrciwxMDczNzQxODI0JmtyJiYoa3I9MCkseHIpRHIuc2V0KHQsZSk7ZWxzZXtpZih2b2lkIDAhPT1FciYmRXIodCk9PT0hMSl0aHJvdyBFcnJvcihcIk5vbi1leHRlbnNpYmxlIG9iamVjdHMgYXJlIG5vdCBhbGxvd2VkIGFzIGtleXMuXCIpO2lmKE9yKU9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LEFyLHtlbnVtZXJhYmxlOiExLGNvbmZpZ3VyYWJsZTohMSx3cml0YWJsZTohMSx2YWx1ZTplfSk7ZWxzZSBpZih2b2lkIDAhPT10LnByb3BlcnR5SXNFbnVtZXJhYmxlJiZ0LnByb3BlcnR5SXNFbnVtZXJhYmxlPT09dC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUpdC5wcm9wZXJ0eUlzRW51bWVyYWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LHQucHJvcGVydHlJc0VudW1lcmFibGVbQXJdPWU7ZWxzZXtpZih2b2lkIDA9PT10Lm5vZGVUeXBlKXRocm93IEVycm9yKFwiVW5hYmxlIHRvIHNldCBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IG9uIG9iamVjdC5cIik7dFtBcl09ZX19cmV0dXJuIGV9ZnVuY3Rpb24gb3QodCl7aWYodCYmdC5ub2RlVHlwZT4wKXN3aXRjaCh0Lm5vZGVUeXBlKXtjYXNlIDE6cmV0dXJuIHQudW5pcXVlSUQ7Y2FzZSA5OnJldHVybiB0LmRvY3VtZW50RWxlbWVudCYmdC5kb2N1bWVudEVsZW1lbnQudW5pcXVlSUR9fWZ1bmN0aW9uIHV0KHQsZSl7aWYoIXQpdGhyb3cgRXJyb3IoZSl9ZnVuY3Rpb24gc3QodCl7dXQodCE9PTEvMCxcIkNhbm5vdCBwZXJmb3JtIHRoaXMgYWN0aW9uIHdpdGggYW4gaW5maW5pdGUgc2l6ZS5cIil9ZnVuY3Rpb24gYXQodCxlKXt0aGlzLl9pdGVyPXQsdGhpcy5fdXNlS2V5cz1lLHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gaHQodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gZnQodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gY3QodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gX3QodCl7dmFyIGU9anQodCk7cmV0dXJuIGUuX2l0ZXI9dCxlLnNpemU9dC5zaXplLGUuZmxpcD1mdW5jdGlvbigpe3JldHVybiB0fSxlLnJldmVyc2U9ZnVuY3Rpb24oKXt2YXIgZT10LnJldmVyc2UuYXBwbHkodGhpcyk7cmV0dXJuIGUuZmxpcD1mdW5jdGlvbigpe3JldHVybiB0LnJldmVyc2UoKX0sZX0sZS5oYXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSk7XG59LGUuaW5jbHVkZXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaGFzKGUpfSxlLmNhY2hlUmVzdWx0PVJ0LGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXt2YXIgbj10aGlzO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBlKHIsdCxuKSE9PSExfSxyKX0sZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXtpZihlPT09d3Ipe3ZhciBuPXQuX19pdGVyYXRvcihlLHIpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0PW4ubmV4dCgpO2lmKCF0LmRvbmUpe3ZhciBlPXQudmFsdWVbMF07dC52YWx1ZVswXT10LnZhbHVlWzFdLHQudmFsdWVbMV09ZX1yZXR1cm4gdH0pfXJldHVybiB0Ll9faXRlcmF0b3IoZT09PWdyP21yOmdyLHIpfSxlfWZ1bmN0aW9uIHB0KHQsZSxyKXt2YXIgbj1qdCh0KTtyZXR1cm4gbi5zaXplPXQuc2l6ZSxuLmhhcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5oYXMoZSl9LG4uZ2V0PWZ1bmN0aW9uKG4saSl7dmFyIG89dC5nZXQobixjcik7cmV0dXJuIG89PT1jcj9pOmUuY2FsbChyLG8sbix0KX0sbi5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXRoaXM7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQsaSx1KXtyZXR1cm4gbihlLmNhbGwocix0LGksdSksaSxvKSE9PSExfSxpKX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10Ll9faXRlcmF0b3Iod3IsaSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGk9by5uZXh0KCk7aWYoaS5kb25lKXJldHVybiBpO3ZhciB1PWkudmFsdWUscz11WzBdO3JldHVybiB6KG4scyxlLmNhbGwocix1WzFdLHMsdCksaSl9KX0sbn1mdW5jdGlvbiB2dCh0LGUpe3ZhciByPWp0KHQpO3JldHVybiByLl9pdGVyPXQsci5zaXplPXQuc2l6ZSxyLnJldmVyc2U9ZnVuY3Rpb24oKXtyZXR1cm4gdH0sdC5mbGlwJiYoci5mbGlwPWZ1bmN0aW9uKCl7dmFyIGU9X3QodCk7cmV0dXJuIGUucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0LmZsaXAoKX0sZX0pLHIuZ2V0PWZ1bmN0aW9uKHIsbil7cmV0dXJuIHQuZ2V0KGU/cjotMS1yLG4pfSxyLmhhcz1mdW5jdGlvbihyKXtyZXR1cm4gdC5oYXMoZT9yOi0xLXIpfSxyLmluY2x1ZGVzPWZ1bmN0aW9uKGUpe3JldHVybiB0LmluY2x1ZGVzKGUpfSxyLmNhY2hlUmVzdWx0PVJ0LHIuX19pdGVyYXRlPWZ1bmN0aW9uKGUscil7dmFyIG49dGhpcztyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxyKXtyZXR1cm4gZSh0LHIsbil9LCFyKX0sci5fX2l0ZXJhdG9yPWZ1bmN0aW9uKGUscil7cmV0dXJuIHQuX19pdGVyYXRvcihlLCFyKX0scn1mdW5jdGlvbiBsdCh0LGUscixuKXt2YXIgaT1qdCh0KTtyZXR1cm4gbiYmKGkuaGFzPWZ1bmN0aW9uKG4pe3ZhciBpPXQuZ2V0KG4sY3IpO3JldHVybiBpIT09Y3ImJiEhZS5jYWxsKHIsaSxuLHQpfSxpLmdldD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuZ2V0KG4sY3IpO3JldHVybiBvIT09Y3ImJmUuY2FsbChyLG8sbix0KT9vOml9KSxpLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcyxzPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQsbyxhKXtyZXR1cm4gZS5jYWxsKHIsdCxvLGEpPyhzKyssaSh0LG4/bzpzLTEsdSkpOnZvaWQgMH0sbyksc30saS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10Ll9faXRlcmF0b3Iod3Isbykscz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7Oyl7dmFyIG89dS5uZXh0KCk7aWYoby5kb25lKXJldHVybiBvO3ZhciBhPW8udmFsdWUsaD1hWzBdLGY9YVsxXTtpZihlLmNhbGwocixmLGgsdCkpcmV0dXJuIHooaSxuP2g6cysrLGYsbyl9fSl9LGl9ZnVuY3Rpb24geXQodCxlLHIpe3ZhciBuPUx0KCkuYXNNdXRhYmxlKCk7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKGksbyl7bi51cGRhdGUoZS5jYWxsKHIsaSxvLHQpLDAsZnVuY3Rpb24odCl7cmV0dXJuIHQrMX0pfSksbi5hc0ltbXV0YWJsZSgpfWZ1bmN0aW9uIGR0KHQsZSxyKXt2YXIgbj1kKHQpLGk9KHcodCk/SWUoKTpMdCgpKS5hc011dGFibGUoKTtcbiAgdC5fX2l0ZXJhdGUoZnVuY3Rpb24obyx1KXtpLnVwZGF0ZShlLmNhbGwocixvLHUsdCksZnVuY3Rpb24odCl7cmV0dXJuIHQ9dHx8W10sdC5wdXNoKG4/W3Usb106byksdH0pfSk7dmFyIG89QXQodCk7cmV0dXJuIGkubWFwKGZ1bmN0aW9uKGUpe3JldHVybiBPdCh0LG8oZSkpfSl9ZnVuY3Rpb24gbXQodCxlLHIsbil7dmFyIGk9dC5zaXplO2lmKHZvaWQgMCE9PWUmJihlPTB8ZSksdm9pZCAwIT09ciYmKHI9MHxyKSxhKGUscixpKSlyZXR1cm4gdDt2YXIgbz1oKGUsaSkscz1mKHIsaSk7aWYobyE9PW98fHMhPT1zKXJldHVybiBtdCh0LnRvU2VxKCkuY2FjaGVSZXN1bHQoKSxlLHIsbik7dmFyIGMsXz1zLW87Xz09PV8mJihjPTA+Xz8wOl8pO3ZhciBwPWp0KHQpO3JldHVybiBwLnNpemU9MD09PWM/Yzp0LnNpemUmJmN8fHZvaWQgMCwhbiYmTCh0KSYmYz49MCYmKHAuZ2V0PWZ1bmN0aW9uKGUscil7cmV0dXJuIGU9dSh0aGlzLGUpLGU+PTAmJmM+ZT90LmdldChlK28scik6cn0pLHAuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXt2YXIgaT10aGlzO2lmKDA9PT1jKXJldHVybiAwO2lmKHIpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZSxyKTt2YXIgdT0wLHM9ITAsYT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBzJiYocz11Kys8byk/dm9pZCAwOihhKyssZSh0LG4/cjphLTEsaSkhPT0hMSYmYSE9PWMpfSksYX0scC5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXtpZigwIT09YyYmcilyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IoZSxyKTt2YXIgaT0wIT09YyYmdC5fX2l0ZXJhdG9yKGUsciksdT0wLHM9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoO3UrKzxvOylpLm5leHQoKTtpZigrK3M+YylyZXR1cm4gSSgpO3ZhciB0PWkubmV4dCgpO3JldHVybiBufHxlPT09Z3I/dDplPT09bXI/eihlLHMtMSx2b2lkIDAsdCk6eihlLHMtMSx0LnZhbHVlWzFdLHQpfSl9LHB9ZnVuY3Rpb24gZ3QodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztpZihpKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKG4saSk7dmFyIHU9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpLHMpe3JldHVybiBlLmNhbGwocix0LGkscykmJisrdSYmbih0LGksbyl9KSx1fSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXRoaXM7aWYoaSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IobixpKTt2YXIgdT10Ll9faXRlcmF0b3Iod3IsaSkscz0hMDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZighcylyZXR1cm4gSSgpO3ZhciB0PXUubmV4dCgpO2lmKHQuZG9uZSlyZXR1cm4gdDt2YXIgaT10LnZhbHVlLGE9aVswXSxoPWlbMV07cmV0dXJuIGUuY2FsbChyLGgsYSxvKT9uPT09d3I/dDp6KG4sYSxoLHQpOihzPSExLEkoKSl9KX0sbn1mdW5jdGlvbiB3dCh0LGUscixuKXt2YXIgaT1qdCh0KTtyZXR1cm4gaS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihpLG8pe3ZhciB1PXRoaXM7aWYobylyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShpLG8pO3ZhciBzPSEwLGE9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxvLGgpe3JldHVybiBzJiYocz1lLmNhbGwocix0LG8saCkpP3ZvaWQgMDooYSsrLGkodCxuP286YS0xLHUpKX0pLGF9LGkuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcztpZihvKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihpLG8pO3ZhciBzPXQuX19pdGVyYXRvcih3cixvKSxhPSEwLGg9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdCxvLGY7ZG97aWYodD1zLm5leHQoKSx0LmRvbmUpcmV0dXJuIG58fGk9PT1ncj90Omk9PT1tcj96KGksaCsrLHZvaWQgMCx0KTp6KGksaCsrLHQudmFsdWVbMV0sdCk7dmFyIGM9dC52YWx1ZTtvPWNbMF0sZj1jWzFdLGEmJihhPWUuY2FsbChyLGYsbyx1KSl9d2hpbGUoYSk7XG4gIHJldHVybiBpPT09d3I/dDp6KGksbyxmLHQpfSl9LGl9ZnVuY3Rpb24gU3QodCxlKXt2YXIgcj1kKHQpLG49W3RdLmNvbmNhdChlKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHkodCk/ciYmKHQ9cCh0KSk6dD1yP1codCk6QihBcnJheS5pc0FycmF5KHQpP3Q6W3RdKSx0fSkuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSk7aWYoMD09PW4ubGVuZ3RoKXJldHVybiB0O2lmKDE9PT1uLmxlbmd0aCl7dmFyIGk9blswXTtpZihpPT09dHx8ciYmZChpKXx8bSh0KSYmbShpKSlyZXR1cm4gaX12YXIgbz1uZXcgaihuKTtyZXR1cm4gcj9vPW8udG9LZXllZFNlcSgpOm0odCl8fChvPW8udG9TZXRTZXEoKSksbz1vLmZsYXR0ZW4oITApLG8uc2l6ZT1uLnJlZHVjZShmdW5jdGlvbih0LGUpe2lmKHZvaWQgMCE9PXQpe3ZhciByPWUuc2l6ZTtpZih2b2lkIDAhPT1yKXJldHVybiB0K3J9fSwwKSxvfWZ1bmN0aW9uIHp0KHQsZSxyKXt2YXIgbj1qdCh0KTtyZXR1cm4gbi5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihuLGkpe2Z1bmN0aW9uIG8odCxhKXt2YXIgaD10aGlzO3QuX19pdGVyYXRlKGZ1bmN0aW9uKHQsaSl7cmV0dXJuKCFlfHxlPmEpJiZ5KHQpP28odCxhKzEpOm4odCxyP2k6dSsrLGgpPT09ITEmJihzPSEwKSwhc30saSl9dmFyIHU9MCxzPSExO3JldHVybiBvKHQsMCksdX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10Ll9faXRlcmF0b3IobixpKSx1PVtdLHM9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoO287KXt2YXIgdD1vLm5leHQoKTtpZih0LmRvbmU9PT0hMSl7dmFyIGE9dC52YWx1ZTtpZihuPT09d3ImJihhPWFbMV0pLGUmJiEoZT51Lmxlbmd0aCl8fCF5KGEpKXJldHVybiByP3Q6eihuLHMrKyxhLHQpO3UucHVzaChvKSxvPWEuX19pdGVyYXRvcihuLGkpfWVsc2Ugbz11LnBvcCgpfXJldHVybiBJKCl9KX0sbn1mdW5jdGlvbiBJdCh0LGUscil7dmFyIG49QXQodCk7cmV0dXJuIHQudG9TZXEoKS5tYXAoZnVuY3Rpb24oaSxvKXtyZXR1cm4gbihlLmNhbGwocixpLG8sdCkpfSkuZmxhdHRlbighMCl9ZnVuY3Rpb24gYnQodCxlKXt2YXIgcj1qdCh0KTtyZXR1cm4gci5zaXplPXQuc2l6ZSYmMip0LnNpemUtMSxyLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKHIsbil7dmFyIGk9dGhpcyxvPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQpe3JldHVybighb3x8cihlLG8rKyxpKSE9PSExKSYmcih0LG8rKyxpKSE9PSExfSxuKSxvfSxyLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihyLG4pe3ZhciBpLG89dC5fX2l0ZXJhdG9yKGdyLG4pLHU9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtyZXR1cm4oIWl8fHUlMikmJihpPW8ubmV4dCgpLGkuZG9uZSk/aTp1JTI/eihyLHUrKyxlKTp6KHIsdSsrLGkudmFsdWUsaSl9KX0scn1mdW5jdGlvbiBxdCh0LGUscil7ZXx8KGU9VXQpO3ZhciBuPWQodCksaT0wLG89dC50b1NlcSgpLm1hcChmdW5jdGlvbihlLG4pe3JldHVybltuLGUsaSsrLHI/cihlLG4sdCk6ZV19KS50b0FycmF5KCk7cmV0dXJuIG8uc29ydChmdW5jdGlvbih0LHIpe3JldHVybiBlKHRbM10sclszXSl8fHRbMl0tclsyXX0pLmZvckVhY2gobj9mdW5jdGlvbih0LGUpe29bZV0ubGVuZ3RoPTJ9OmZ1bmN0aW9uKHQsZSl7b1tlXT10WzFdfSksbj94KG8pOm0odCk/ayhvKTpBKG8pfWZ1bmN0aW9uIER0KHQsZSxyKXtpZihlfHwoZT1VdCkscil7dmFyIG49dC50b1NlcSgpLm1hcChmdW5jdGlvbihlLG4pe3JldHVybltlLHIoZSxuLHQpXX0pLnJlZHVjZShmdW5jdGlvbih0LHIpe3JldHVybiBNdChlLHRbMV0sclsxXSk/cjp0fSk7cmV0dXJuIG4mJm5bMF19cmV0dXJuIHQucmVkdWNlKGZ1bmN0aW9uKHQscil7cmV0dXJuIE10KGUsdCxyKT9yOnR9KX1mdW5jdGlvbiBNdCh0LGUscil7dmFyIG49dChyLGUpO3JldHVybiAwPT09biYmciE9PWUmJih2b2lkIDA9PT1yfHxudWxsPT09cnx8ciE9PXIpfHxuPjB9ZnVuY3Rpb24gRXQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLnNpemU9bmV3IGoocikubWFwKGZ1bmN0aW9uKHQpe1xuICByZXR1cm4gdC5zaXplfSkubWluKCksbi5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHIsbj10aGlzLl9faXRlcmF0b3IoZ3IsZSksaT0wOyEocj1uLm5leHQoKSkuZG9uZSYmdChyLnZhbHVlLGkrKyx0aGlzKSE9PSExOyk7cmV0dXJuIGl9LG4uX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHQsbil7dmFyIGk9ci5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQ9Xyh0KSxEKG4/dC5yZXZlcnNlKCk6dCl9KSxvPTAsdT0hMTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgcjtyZXR1cm4gdXx8KHI9aS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQubmV4dCgpfSksdT1yLnNvbWUoZnVuY3Rpb24odCl7cmV0dXJuIHQuZG9uZX0pKSx1P0koKTp6KHQsbysrLGUuYXBwbHkobnVsbCxyLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdC52YWx1ZX0pKSl9KX0sbn1mdW5jdGlvbiBPdCh0LGUpe3JldHVybiBMKHQpP2U6dC5jb25zdHJ1Y3RvcihlKX1mdW5jdGlvbiB4dCh0KXtpZih0IT09T2JqZWN0KHQpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBbSywgVl0gdHVwbGU6IFwiK3QpfWZ1bmN0aW9uIGt0KHQpe3JldHVybiBzdCh0LnNpemUpLG8odCl9ZnVuY3Rpb24gQXQodCl7cmV0dXJuIGQodCk/cDptKHQpP3Y6bH1mdW5jdGlvbiBqdCh0KXtyZXR1cm4gT2JqZWN0LmNyZWF0ZSgoZCh0KT94Om0odCk/azpBKS5wcm90b3R5cGUpfWZ1bmN0aW9uIFJ0KCl7cmV0dXJuIHRoaXMuX2l0ZXIuY2FjaGVSZXN1bHQ/KHRoaXMuX2l0ZXIuY2FjaGVSZXN1bHQoKSx0aGlzLnNpemU9dGhpcy5faXRlci5zaXplLHRoaXMpOk8ucHJvdG90eXBlLmNhY2hlUmVzdWx0LmNhbGwodGhpcyl9ZnVuY3Rpb24gVXQodCxlKXtyZXR1cm4gdD5lPzE6ZT50Py0xOjB9ZnVuY3Rpb24gS3QodCl7dmFyIGU9RCh0KTtpZighZSl7aWYoIUUodCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGl0ZXJhYmxlIG9yIGFycmF5LWxpa2U6IFwiK3QpO2U9RChfKHQpKX1yZXR1cm4gZX1mdW5jdGlvbiBMdCh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/UXQoKTpUdCh0KSYmIXcodCk/dDpRdCgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9cCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0LHIpe3JldHVybiBlLnNldChyLHQpfSl9KX1mdW5jdGlvbiBUdCh0KXtyZXR1cm4hKCF0fHwhdFtMcl0pfWZ1bmN0aW9uIFd0KHQsZSl7dGhpcy5vd25lcklEPXQsdGhpcy5lbnRyaWVzPWV9ZnVuY3Rpb24gQnQodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMuYml0bWFwPWUsdGhpcy5ub2Rlcz1yfWZ1bmN0aW9uIEN0KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmNvdW50PWUsdGhpcy5ub2Rlcz1yfWZ1bmN0aW9uIEp0KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmtleUhhc2g9ZSx0aGlzLmVudHJpZXM9cn1mdW5jdGlvbiBOdCh0LGUscil7dGhpcy5vd25lcklEPXQsdGhpcy5rZXlIYXNoPWUsdGhpcy5lbnRyeT1yfWZ1bmN0aW9uIFB0KHQsZSxyKXt0aGlzLl90eXBlPWUsdGhpcy5fcmV2ZXJzZT1yLHRoaXMuX3N0YWNrPXQuX3Jvb3QmJlZ0KHQuX3Jvb3QpfWZ1bmN0aW9uIEh0KHQsZSl7cmV0dXJuIHoodCxlWzBdLGVbMV0pfWZ1bmN0aW9uIFZ0KHQsZSl7cmV0dXJue25vZGU6dCxpbmRleDowLF9fcHJldjplfX1mdW5jdGlvbiBZdCh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKFRyKTtyZXR1cm4gaS5zaXplPXQsaS5fcm9vdD1lLGkuX19vd25lcklEPXIsaS5fX2hhc2g9bixpLl9fYWx0ZXJlZD0hMSxpfWZ1bmN0aW9uIFF0KCl7cmV0dXJuIFdyfHwoV3I9WXQoMCkpfWZ1bmN0aW9uIFh0KHQscixuKXt2YXIgaSxvO2lmKHQuX3Jvb3Qpe3ZhciB1PWUoX3IpLHM9ZShwcik7aWYoaT1GdCh0Ll9yb290LHQuX19vd25lcklELDAsdm9pZCAwLHIsbix1LHMpLCFzLnZhbHVlKXJldHVybiB0O289dC5zaXplKyh1LnZhbHVlP249PT1jcj8tMToxOjApfWVsc2V7aWYobj09PWNyKXJldHVybiB0O289MSxpPW5ldyBXdCh0Ll9fb3duZXJJRCxbW3Isbl1dKX1yZXR1cm4gdC5fX293bmVySUQ/KHQuc2l6ZT1vLFxuICB0Ll9yb290PWksdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOmk/WXQobyxpKTpRdCgpfWZ1bmN0aW9uIEZ0KHQsZSxuLGksbyx1LHMsYSl7cmV0dXJuIHQ/dC51cGRhdGUoZSxuLGksbyx1LHMsYSk6dT09PWNyP3Q6KHIoYSkscihzKSxuZXcgTnQoZSxpLFtvLHVdKSl9ZnVuY3Rpb24gR3QodCl7cmV0dXJuIHQuY29uc3RydWN0b3I9PT1OdHx8dC5jb25zdHJ1Y3Rvcj09PUp0fWZ1bmN0aW9uIFp0KHQsZSxyLG4saSl7aWYodC5rZXlIYXNoPT09bilyZXR1cm4gbmV3IEp0KGUsbixbdC5lbnRyeSxpXSk7dmFyIG8sdT0oMD09PXI/dC5rZXlIYXNoOnQua2V5SGFzaD4+PnIpJmZyLHM9KDA9PT1yP246bj4+PnIpJmZyLGE9dT09PXM/W1p0KHQsZSxyK2FyLG4saSldOihvPW5ldyBOdChlLG4saSkscz51P1t0LG9dOltvLHRdKTtyZXR1cm4gbmV3IEJ0KGUsMTw8dXwxPDxzLGEpfWZ1bmN0aW9uICR0KHQsZSxyLGkpe3R8fCh0PW5ldyBuKTtmb3IodmFyIG89bmV3IE50KHQsZXQociksW3IsaV0pLHU9MDtlLmxlbmd0aD51O3UrKyl7dmFyIHM9ZVt1XTtvPW8udXBkYXRlKHQsMCx2b2lkIDAsc1swXSxzWzFdKX1yZXR1cm4gb31mdW5jdGlvbiB0ZSh0LGUscixuKXtmb3IodmFyIGk9MCxvPTAsdT1BcnJheShyKSxzPTAsYT0xLGg9ZS5sZW5ndGg7aD5zO3MrKyxhPDw9MSl7dmFyIGY9ZVtzXTt2b2lkIDAhPT1mJiZzIT09biYmKGl8PWEsdVtvKytdPWYpfXJldHVybiBuZXcgQnQodCxpLHUpfWZ1bmN0aW9uIGVlKHQsZSxyLG4saSl7Zm9yKHZhciBvPTAsdT1BcnJheShocikscz0wOzAhPT1yO3MrKyxyPj4+PTEpdVtzXT0xJnI/ZVtvKytdOnZvaWQgMDtyZXR1cm4gdVtuXT1pLG5ldyBDdCh0LG8rMSx1KX1mdW5jdGlvbiByZSh0LGUscil7Zm9yKHZhciBuPVtdLGk9MDtyLmxlbmd0aD5pO2krKyl7dmFyIG89cltpXSx1PXAobyk7eShvKXx8KHU9dS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIEYodCl9KSksbi5wdXNoKHUpfXJldHVybiBpZSh0LGUsbil9ZnVuY3Rpb24gbmUodCl7cmV0dXJuIGZ1bmN0aW9uKGUscixuKXtyZXR1cm4gZSYmZS5tZXJnZURlZXBXaXRoJiZ5KHIpP2UubWVyZ2VEZWVwV2l0aCh0LHIpOnQ/dChlLHIsbik6cn19ZnVuY3Rpb24gaWUodCxlLHIpe3JldHVybiByPXIuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSksMD09PXIubGVuZ3RoP3Q6MCE9PXQuc2l6ZXx8dC5fX293bmVySUR8fDEhPT1yLmxlbmd0aD90LndpdGhNdXRhdGlvbnMoZnVuY3Rpb24odCl7Zm9yKHZhciBuPWU/ZnVuY3Rpb24ocixuKXt0LnVwZGF0ZShuLGNyLGZ1bmN0aW9uKHQpe3JldHVybiB0PT09Y3I/cjplKHQscixuKX0pfTpmdW5jdGlvbihlLHIpe3Quc2V0KHIsZSl9LGk9MDtyLmxlbmd0aD5pO2krKylyW2ldLmZvckVhY2gobil9KTp0LmNvbnN0cnVjdG9yKHJbMF0pfWZ1bmN0aW9uIG9lKHQsZSxyLG4pe3ZhciBpPXQ9PT1jcixvPWUubmV4dCgpO2lmKG8uZG9uZSl7dmFyIHU9aT9yOnQscz1uKHUpO3JldHVybiBzPT09dT90OnN9dXQoaXx8dCYmdC5zZXQsXCJpbnZhbGlkIGtleVBhdGhcIik7dmFyIGE9by52YWx1ZSxoPWk/Y3I6dC5nZXQoYSxjciksZj1vZShoLGUscixuKTtyZXR1cm4gZj09PWg/dDpmPT09Y3I/dC5yZW1vdmUoYSk6KGk/UXQoKTp0KS5zZXQoYSxmKX1mdW5jdGlvbiB1ZSh0KXtyZXR1cm4gdC09dD4+MSYxNDMxNjU1NzY1LHQ9KDg1ODk5MzQ1OSZ0KSsodD4+MiY4NTg5OTM0NTkpLHQ9dCsodD4+NCkmMjUyNjQ1MTM1LHQrPXQ+PjgsdCs9dD4+MTYsMTI3JnR9ZnVuY3Rpb24gc2UodCxlLHIsbil7dmFyIG89bj90OmkodCk7cmV0dXJuIG9bZV09cixvfWZ1bmN0aW9uIGFlKHQsZSxyLG4pe3ZhciBpPXQubGVuZ3RoKzE7aWYobiYmZSsxPT09aSlyZXR1cm4gdFtlXT1yLHQ7Zm9yKHZhciBvPUFycmF5KGkpLHU9MCxzPTA7aT5zO3MrKylzPT09ZT8ob1tzXT1yLHU9LTEpOm9bc109dFtzK3VdO3JldHVybiBvfWZ1bmN0aW9uIGhlKHQsZSxyKXt2YXIgbj10Lmxlbmd0aC0xO2lmKHImJmU9PT1uKXJldHVybiB0LnBvcCgpLHQ7Zm9yKHZhciBpPUFycmF5KG4pLG89MCx1PTA7bj51O3UrKyl1PT09ZSYmKG89MSksXG4gIGlbdV09dFt1K29dO3JldHVybiBpfWZ1bmN0aW9uIGZlKHQpe3ZhciBlPWxlKCk7aWYobnVsbD09PXR8fHZvaWQgMD09PXQpcmV0dXJuIGU7aWYoY2UodCkpcmV0dXJuIHQ7dmFyIHI9dih0KSxuPXIuc2l6ZTtyZXR1cm4gMD09PW4/ZTooc3Qobiksbj4wJiZocj5uP3ZlKDAsbixhcixudWxsLG5ldyBfZShyLnRvQXJyYXkoKSkpOmUud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXt0LnNldFNpemUobiksci5mb3JFYWNoKGZ1bmN0aW9uKGUscil7cmV0dXJuIHQuc2V0KHIsZSl9KX0pKX1mdW5jdGlvbiBjZSh0KXtyZXR1cm4hKCF0fHwhdFtOcl0pfWZ1bmN0aW9uIF9lKHQsZSl7dGhpcy5hcnJheT10LHRoaXMub3duZXJJRD1lfWZ1bmN0aW9uIHBlKHQsZSl7ZnVuY3Rpb24gcih0LGUscil7cmV0dXJuIDA9PT1lP24odCxyKTppKHQsZSxyKX1mdW5jdGlvbiBuKHQscil7dmFyIG49cj09PXM/YSYmYS5hcnJheTp0JiZ0LmFycmF5LGk9cj5vPzA6by1yLGg9dS1yO3JldHVybiBoPmhyJiYoaD1ociksZnVuY3Rpb24oKXtpZihpPT09aClyZXR1cm4gVnI7dmFyIHQ9ZT8tLWg6aSsrO3JldHVybiBuJiZuW3RdfX1mdW5jdGlvbiBpKHQsbixpKXt2YXIgcyxhPXQmJnQuYXJyYXksaD1pPm8/MDpvLWk+Pm4sZj0odS1pPj5uKSsxO3JldHVybiBmPmhyJiYoZj1ociksZnVuY3Rpb24oKXtmb3IoOzspe2lmKHMpe3ZhciB0PXMoKTtpZih0IT09VnIpcmV0dXJuIHQ7cz1udWxsfWlmKGg9PT1mKXJldHVybiBWcjt2YXIgbz1lPy0tZjpoKys7cz1yKGEmJmFbb10sbi1hcixpKyhvPDxuKSl9fX12YXIgbz10Ll9vcmlnaW4sdT10Ll9jYXBhY2l0eSxzPXplKHUpLGE9dC5fdGFpbDtyZXR1cm4gcih0Ll9yb290LHQuX2xldmVsLDApfWZ1bmN0aW9uIHZlKHQsZSxyLG4saSxvLHUpe3ZhciBzPU9iamVjdC5jcmVhdGUoUHIpO3JldHVybiBzLnNpemU9ZS10LHMuX29yaWdpbj10LHMuX2NhcGFjaXR5PWUscy5fbGV2ZWw9cixzLl9yb290PW4scy5fdGFpbD1pLHMuX19vd25lcklEPW8scy5fX2hhc2g9dSxzLl9fYWx0ZXJlZD0hMSxzfWZ1bmN0aW9uIGxlKCl7cmV0dXJuIEhyfHwoSHI9dmUoMCwwLGFyKSl9ZnVuY3Rpb24geWUodCxyLG4pe2lmKHI9dSh0LHIpLHIhPT1yKXJldHVybiB0O2lmKHI+PXQuc2l6ZXx8MD5yKXJldHVybiB0LndpdGhNdXRhdGlvbnMoZnVuY3Rpb24odCl7MD5yP3dlKHQscikuc2V0KDAsbik6d2UodCwwLHIrMSkuc2V0KHIsbil9KTtyKz10Ll9vcmlnaW47dmFyIGk9dC5fdGFpbCxvPXQuX3Jvb3Qscz1lKHByKTtyZXR1cm4gcj49emUodC5fY2FwYWNpdHkpP2k9ZGUoaSx0Ll9fb3duZXJJRCwwLHIsbixzKTpvPWRlKG8sdC5fX293bmVySUQsdC5fbGV2ZWwscixuLHMpLHMudmFsdWU/dC5fX293bmVySUQ/KHQuX3Jvb3Q9byx0Ll90YWlsPWksdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOnZlKHQuX29yaWdpbix0Ll9jYXBhY2l0eSx0Ll9sZXZlbCxvLGkpOnR9ZnVuY3Rpb24gZGUodCxlLG4saSxvLHUpe3ZhciBzPWk+Pj5uJmZyLGE9dCYmdC5hcnJheS5sZW5ndGg+cztpZighYSYmdm9pZCAwPT09bylyZXR1cm4gdDt2YXIgaDtpZihuPjApe3ZhciBmPXQmJnQuYXJyYXlbc10sYz1kZShmLGUsbi1hcixpLG8sdSk7cmV0dXJuIGM9PT1mP3Q6KGg9bWUodCxlKSxoLmFycmF5W3NdPWMsaCl9cmV0dXJuIGEmJnQuYXJyYXlbc109PT1vP3Q6KHIodSksaD1tZSh0LGUpLHZvaWQgMD09PW8mJnM9PT1oLmFycmF5Lmxlbmd0aC0xP2guYXJyYXkucG9wKCk6aC5hcnJheVtzXT1vLGgpfWZ1bmN0aW9uIG1lKHQsZSl7cmV0dXJuIGUmJnQmJmU9PT10Lm93bmVySUQ/dDpuZXcgX2UodD90LmFycmF5LnNsaWNlKCk6W10sZSl9ZnVuY3Rpb24gZ2UodCxlKXtpZihlPj16ZSh0Ll9jYXBhY2l0eSkpcmV0dXJuIHQuX3RhaWw7aWYoMTw8dC5fbGV2ZWwrYXI+ZSl7Zm9yKHZhciByPXQuX3Jvb3Qsbj10Ll9sZXZlbDtyJiZuPjA7KXI9ci5hcnJheVtlPj4+biZmcl0sbi09YXI7cmV0dXJuIHJ9fWZ1bmN0aW9uIHdlKHQsZSxyKXt2b2lkIDAhPT1lJiYoZT0wfGUpLHZvaWQgMCE9PXImJihyPTB8cik7dmFyIGk9dC5fX293bmVySUR8fG5ldyBuLG89dC5fb3JpZ2luLHU9dC5fY2FwYWNpdHkscz1vK2UsYT12b2lkIDA9PT1yP3U6MD5yP3UrcjpvK3I7XG4gIGlmKHM9PT1vJiZhPT09dSlyZXR1cm4gdDtpZihzPj1hKXJldHVybiB0LmNsZWFyKCk7Zm9yKHZhciBoPXQuX2xldmVsLGY9dC5fcm9vdCxjPTA7MD5zK2M7KWY9bmV3IF9lKGYmJmYuYXJyYXkubGVuZ3RoP1t2b2lkIDAsZl06W10saSksaCs9YXIsYys9MTw8aDtjJiYocys9YyxvKz1jLGErPWMsdSs9Yyk7Zm9yKHZhciBfPXplKHUpLHA9emUoYSk7cD49MTw8aCthcjspZj1uZXcgX2UoZiYmZi5hcnJheS5sZW5ndGg/W2ZdOltdLGkpLGgrPWFyO3ZhciB2PXQuX3RhaWwsbD1fPnA/Z2UodCxhLTEpOnA+Xz9uZXcgX2UoW10saSk6djtpZih2JiZwPl8mJnU+cyYmdi5hcnJheS5sZW5ndGgpe2Y9bWUoZixpKTtmb3IodmFyIHk9ZixkPWg7ZD5hcjtkLT1hcil7dmFyIG09Xz4+PmQmZnI7eT15LmFycmF5W21dPW1lKHkuYXJyYXlbbV0saSl9eS5hcnJheVtfPj4+YXImZnJdPXZ9aWYodT5hJiYobD1sJiZsLnJlbW92ZUFmdGVyKGksMCxhKSkscz49cClzLT1wLGEtPXAsaD1hcixmPW51bGwsbD1sJiZsLnJlbW92ZUJlZm9yZShpLDAscyk7ZWxzZSBpZihzPm98fF8+cCl7Zm9yKGM9MDtmOyl7dmFyIGc9cz4+PmgmZnI7aWYoZyE9PXA+Pj5oJmZyKWJyZWFrO2cmJihjKz0oMTw8aCkqZyksaC09YXIsZj1mLmFycmF5W2ddfWYmJnM+byYmKGY9Zi5yZW1vdmVCZWZvcmUoaSxoLHMtYykpLGYmJl8+cCYmKGY9Zi5yZW1vdmVBZnRlcihpLGgscC1jKSksYyYmKHMtPWMsYS09Yyl9cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9YS1zLHQuX29yaWdpbj1zLHQuX2NhcGFjaXR5PWEsdC5fbGV2ZWw9aCx0Ll9yb290PWYsdC5fdGFpbD1sLHQuX19oYXNoPXZvaWQgMCx0Ll9fYWx0ZXJlZD0hMCx0KTp2ZShzLGEsaCxmLGwpfWZ1bmN0aW9uIFNlKHQsZSxyKXtmb3IodmFyIG49W10saT0wLG89MDtyLmxlbmd0aD5vO28rKyl7dmFyIHU9cltvXSxzPXYodSk7cy5zaXplPmkmJihpPXMuc2l6ZSkseSh1KXx8KHM9cy5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIEYodCl9KSksbi5wdXNoKHMpfXJldHVybiBpPnQuc2l6ZSYmKHQ9dC5zZXRTaXplKGkpKSxpZSh0LGUsbil9ZnVuY3Rpb24gemUodCl7cmV0dXJuIGhyPnQ/MDp0LTE+Pj5hcjw8YXJ9ZnVuY3Rpb24gSWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0RlKCk6YmUodCk/dDpEZSgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9cCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0LHIpe3JldHVybiBlLnNldChyLHQpfSl9KX1mdW5jdGlvbiBiZSh0KXtyZXR1cm4gVHQodCkmJncodCl9ZnVuY3Rpb24gcWUodCxlLHIsbil7dmFyIGk9T2JqZWN0LmNyZWF0ZShJZS5wcm90b3R5cGUpO3JldHVybiBpLnNpemU9dD90LnNpemU6MCxpLl9tYXA9dCxpLl9saXN0PWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGl9ZnVuY3Rpb24gRGUoKXtyZXR1cm4gWXJ8fChZcj1xZShRdCgpLGxlKCkpKX1mdW5jdGlvbiBNZSh0LGUscil7dmFyIG4saSxvPXQuX21hcCx1PXQuX2xpc3Qscz1vLmdldChlKSxhPXZvaWQgMCE9PXM7aWYocj09PWNyKXtpZighYSlyZXR1cm4gdDt1LnNpemU+PWhyJiZ1LnNpemU+PTIqby5zaXplPyhpPXUuZmlsdGVyKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMCE9PXQmJnMhPT1lfSksbj1pLnRvS2V5ZWRTZXEoKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHRbMF19KS5mbGlwKCkudG9NYXAoKSx0Ll9fb3duZXJJRCYmKG4uX19vd25lcklEPWkuX19vd25lcklEPXQuX19vd25lcklEKSk6KG49by5yZW1vdmUoZSksaT1zPT09dS5zaXplLTE/dS5wb3AoKTp1LnNldChzLHZvaWQgMCkpfWVsc2UgaWYoYSl7aWYocj09PXUuZ2V0KHMpWzFdKXJldHVybiB0O249byxpPXUuc2V0KHMsW2Uscl0pfWVsc2Ugbj1vLnNldChlLHUuc2l6ZSksaT11LnNldCh1LnNpemUsW2Uscl0pO3JldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPW4uc2l6ZSx0Ll9tYXA9bix0Ll9saXN0PWksdC5fX2hhc2g9dm9pZCAwLHQpOnFlKG4saSl9ZnVuY3Rpb24gRWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P2tlKCk6T2UodCk/dDprZSgpLnVuc2hpZnRBbGwodCk7XG59ZnVuY3Rpb24gT2UodCl7cmV0dXJuISghdHx8IXRbUXJdKX1mdW5jdGlvbiB4ZSh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKFhyKTtyZXR1cm4gaS5zaXplPXQsaS5faGVhZD1lLGkuX19vd25lcklEPXIsaS5fX2hhc2g9bixpLl9fYWx0ZXJlZD0hMSxpfWZ1bmN0aW9uIGtlKCl7cmV0dXJuIEZyfHwoRnI9eGUoMCkpfWZ1bmN0aW9uIEFlKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9LZSgpOmplKHQpJiYhdyh0KT90OktlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1sKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSl9ZnVuY3Rpb24gamUodCl7cmV0dXJuISghdHx8IXRbR3JdKX1mdW5jdGlvbiBSZSh0LGUpe3JldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPWUuc2l6ZSx0Ll9tYXA9ZSx0KTplPT09dC5fbWFwP3Q6MD09PWUuc2l6ZT90Ll9fZW1wdHkoKTp0Ll9fbWFrZShlKX1mdW5jdGlvbiBVZSh0LGUpe3ZhciByPU9iamVjdC5jcmVhdGUoWnIpO3JldHVybiByLnNpemU9dD90LnNpemU6MCxyLl9tYXA9dCxyLl9fb3duZXJJRD1lLHJ9ZnVuY3Rpb24gS2UoKXtyZXR1cm4gJHJ8fCgkcj1VZShRdCgpKSl9ZnVuY3Rpb24gTGUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0JlKCk6VGUodCk/dDpCZSgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9bCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0KXtyZXR1cm4gZS5hZGQodCl9KX0pfWZ1bmN0aW9uIFRlKHQpe3JldHVybiBqZSh0KSYmdyh0KX1mdW5jdGlvbiBXZSh0LGUpe3ZhciByPU9iamVjdC5jcmVhdGUodG4pO3JldHVybiByLnNpemU9dD90LnNpemU6MCxyLl9tYXA9dCxyLl9fb3duZXJJRD1lLHJ9ZnVuY3Rpb24gQmUoKXtyZXR1cm4gZW58fChlbj1XZShEZSgpKSl9ZnVuY3Rpb24gQ2UodCxlKXt2YXIgcixuPWZ1bmN0aW9uKG8pe2lmKG8gaW5zdGFuY2VvZiBuKXJldHVybiBvO2lmKCEodGhpcyBpbnN0YW5jZW9mIG4pKXJldHVybiBuZXcgbihvKTtpZighcil7cj0hMDt2YXIgdT1PYmplY3Qua2V5cyh0KTtQZShpLHUpLGkuc2l6ZT11Lmxlbmd0aCxpLl9uYW1lPWUsaS5fa2V5cz11LGkuX2RlZmF1bHRWYWx1ZXM9dH10aGlzLl9tYXA9THQobyl9LGk9bi5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShybik7cmV0dXJuIGkuY29uc3RydWN0b3I9bixufWZ1bmN0aW9uIEplKHQsZSxyKXt2YXIgbj1PYmplY3QuY3JlYXRlKE9iamVjdC5nZXRQcm90b3R5cGVPZih0KSk7cmV0dXJuIG4uX21hcD1lLG4uX19vd25lcklEPXIsbn1mdW5jdGlvbiBOZSh0KXtyZXR1cm4gdC5fbmFtZXx8dC5jb25zdHJ1Y3Rvci5uYW1lfHxcIlJlY29yZFwifWZ1bmN0aW9uIFBlKHQsZSl7dHJ5e2UuZm9yRWFjaChIZS5iaW5kKHZvaWQgMCx0KSl9Y2F0Y2gocil7fX1mdW5jdGlvbiBIZSh0LGUpe09iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LGUse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldChlKX0sc2V0OmZ1bmN0aW9uKHQpe3V0KHRoaXMuX19vd25lcklELFwiQ2Fubm90IHNldCBvbiBhbiBpbW11dGFibGUgcmVjb3JkLlwiKSx0aGlzLnNldChlLHQpfX0pfWZ1bmN0aW9uIFZlKHQsZSl7aWYodD09PWUpcmV0dXJuITA7aWYoIXkoZSl8fHZvaWQgMCE9PXQuc2l6ZSYmdm9pZCAwIT09ZS5zaXplJiZ0LnNpemUhPT1lLnNpemV8fHZvaWQgMCE9PXQuX19oYXNoJiZ2b2lkIDAhPT1lLl9faGFzaCYmdC5fX2hhc2ghPT1lLl9faGFzaHx8ZCh0KSE9PWQoZSl8fG0odCkhPT1tKGUpfHx3KHQpIT09dyhlKSlyZXR1cm4hMTtpZigwPT09dC5zaXplJiYwPT09ZS5zaXplKXJldHVybiEwO3ZhciByPSFnKHQpO2lmKHcodCkpe3ZhciBuPXQuZW50cmllcygpO3JldHVybiBlLmV2ZXJ5KGZ1bmN0aW9uKHQsZSl7dmFyIGk9bi5uZXh0KCkudmFsdWU7cmV0dXJuIGkmJlgoaVsxXSx0KSYmKHJ8fFgoaVswXSxlKSl9KSYmbi5uZXh0KCkuZG9uZX12YXIgaT0hMTtpZih2b2lkIDA9PT10LnNpemUpaWYodm9pZCAwPT09ZS5zaXplKVwiZnVuY3Rpb25cIj09dHlwZW9mIHQuY2FjaGVSZXN1bHQmJnQuY2FjaGVSZXN1bHQoKTtlbHNle1xuICBpPSEwO3ZhciBvPXQ7dD1lLGU9b312YXIgdT0hMCxzPWUuX19pdGVyYXRlKGZ1bmN0aW9uKGUsbil7cmV0dXJuKHI/dC5oYXMoZSk6aT9YKGUsdC5nZXQobixjcikpOlgodC5nZXQobixjciksZSkpP3ZvaWQgMDoodT0hMSwhMSl9KTtyZXR1cm4gdSYmdC5zaXplPT09c31mdW5jdGlvbiBZZSh0LGUscil7aWYoISh0aGlzIGluc3RhbmNlb2YgWWUpKXJldHVybiBuZXcgWWUodCxlLHIpO2lmKHV0KDAhPT1yLFwiQ2Fubm90IHN0ZXAgYSBSYW5nZSBieSAwXCIpLHQ9dHx8MCx2b2lkIDA9PT1lJiYoZT0xLzApLHI9dm9pZCAwPT09cj8xOk1hdGguYWJzKHIpLHQ+ZSYmKHI9LXIpLHRoaXMuX3N0YXJ0PXQsdGhpcy5fZW5kPWUsdGhpcy5fc3RlcD1yLHRoaXMuc2l6ZT1NYXRoLm1heCgwLE1hdGguY2VpbCgoZS10KS9yLTEpKzEpLDA9PT10aGlzLnNpemUpe2lmKG5uKXJldHVybiBubjtubj10aGlzfX1mdW5jdGlvbiBRZSh0LGUpe2lmKCEodGhpcyBpbnN0YW5jZW9mIFFlKSlyZXR1cm4gbmV3IFFlKHQsZSk7aWYodGhpcy5fdmFsdWU9dCx0aGlzLnNpemU9dm9pZCAwPT09ZT8xLzA6TWF0aC5tYXgoMCxlKSwwPT09dGhpcy5zaXplKXtpZihvbilyZXR1cm4gb247b249dGhpc319ZnVuY3Rpb24gWGUodCxlKXt2YXIgcj1mdW5jdGlvbihyKXt0LnByb3RvdHlwZVtyXT1lW3JdfTtyZXR1cm4gT2JqZWN0LmtleXMoZSkuZm9yRWFjaChyKSxPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzJiZPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGUpLmZvckVhY2gociksdH1mdW5jdGlvbiBGZSh0LGUpe3JldHVybiBlfWZ1bmN0aW9uIEdlKHQsZSl7cmV0dXJuW2UsdF19ZnVuY3Rpb24gWmUodCl7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIXQuYXBwbHkodGhpcyxhcmd1bWVudHMpfX1mdW5jdGlvbiAkZSh0KXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4tdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWZ1bmN0aW9uIHRyKHQpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiB0P0pTT04uc3RyaW5naWZ5KHQpOnR9ZnVuY3Rpb24gZXIoKXtyZXR1cm4gaShhcmd1bWVudHMpfWZ1bmN0aW9uIHJyKHQsZSl7cmV0dXJuIGU+dD8xOnQ+ZT8tMTowfWZ1bmN0aW9uIG5yKHQpe2lmKHQuc2l6ZT09PTEvMClyZXR1cm4gMDt2YXIgZT13KHQpLHI9ZCh0KSxuPWU/MTowLGk9dC5fX2l0ZXJhdGUocj9lP2Z1bmN0aW9uKHQsZSl7bj0zMSpuK29yKGV0KHQpLGV0KGUpKXwwfTpmdW5jdGlvbih0LGUpe249bitvcihldCh0KSxldChlKSl8MH06ZT9mdW5jdGlvbih0KXtuPTMxKm4rZXQodCl8MH06ZnVuY3Rpb24odCl7bj1uK2V0KHQpfDB9KTtyZXR1cm4gaXIoaSxuKX1mdW5jdGlvbiBpcih0LGUpe3JldHVybiBlPU1yKGUsMzQzMjkxODM1MyksZT1NcihlPDwxNXxlPj4+LTE1LDQ2MTg0NTkwNyksZT1NcihlPDwxM3xlPj4+LTEzLDUpLGU9KGUrMzg2NDI5MjE5NnwwKV50LGU9TXIoZV5lPj4+MTYsMjI0NjgyMjUwNyksZT1NcihlXmU+Pj4xMywzMjY2NDg5OTA5KSxlPXR0KGVeZT4+PjE2KX1mdW5jdGlvbiBvcih0LGUpe3JldHVybiB0XmUrMjY1NDQzNTc2OSsodDw8NikrKHQ+PjIpfDB9dmFyIHVyPUFycmF5LnByb3RvdHlwZS5zbGljZSxzcj1cImRlbGV0ZVwiLGFyPTUsaHI9MTw8YXIsZnI9aHItMSxjcj17fSxfcj17dmFsdWU6ITF9LHByPXt2YWx1ZTohMX07dChwLF8pLHQodixfKSx0KGwsXyksXy5pc0l0ZXJhYmxlPXksXy5pc0tleWVkPWQsXy5pc0luZGV4ZWQ9bSxfLmlzQXNzb2NpYXRpdmU9ZyxfLmlzT3JkZXJlZD13LF8uS2V5ZWQ9cCxfLkluZGV4ZWQ9dixfLlNldD1sO3ZhciB2cj1cIkBAX19JTU1VVEFCTEVfSVRFUkFCTEVfX0BAXCIsbHI9XCJAQF9fSU1NVVRBQkxFX0tFWUVEX19AQFwiLHlyPVwiQEBfX0lNTVVUQUJMRV9JTkRFWEVEX19AQFwiLGRyPVwiQEBfX0lNTVVUQUJMRV9PUkRFUkVEX19AQFwiLG1yPTAsZ3I9MSx3cj0yLFNyPVwiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmU3ltYm9sLml0ZXJhdG9yLHpyPVwiQEBpdGVyYXRvclwiLElyPVNyfHx6cjtTLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVyblwiW0l0ZXJhdG9yXVwifSxTLktFWVM9bXIsXG4gIFMuVkFMVUVTPWdyLFMuRU5UUklFUz13cixTLnByb3RvdHlwZS5pbnNwZWN0PVMucHJvdG90eXBlLnRvU291cmNlPWZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzfSxTLnByb3RvdHlwZVtJcl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sdChPLF8pLE8ub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gTyhhcmd1bWVudHMpfSxPLnByb3RvdHlwZS50b1NlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxPLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXEge1wiLFwifVwiKX0sTy5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9ZnVuY3Rpb24oKXtyZXR1cm4hdGhpcy5fY2FjaGUmJnRoaXMuX19pdGVyYXRlVW5jYWNoZWQmJih0aGlzLl9jYWNoZT10aGlzLmVudHJ5U2VxKCkudG9BcnJheSgpLHRoaXMuc2l6ZT10aGlzLl9jYWNoZS5sZW5ndGgpLHRoaXN9LE8ucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3JldHVybiBOKHRoaXMsdCxlLCEwKX0sTy5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBQKHRoaXMsdCxlLCEwKX0sdCh4LE8pLHgucHJvdG90eXBlLnRvS2V5ZWRTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sdChrLE8pLGsub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gayhhcmd1bWVudHMpfSxrLnByb3RvdHlwZS50b0luZGV4ZWRTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30say5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiU2VxIFtcIixcIl1cIil9LGsucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3JldHVybiBOKHRoaXMsdCxlLCExKX0say5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBQKHRoaXMsdCxlLCExKX0sdChBLE8pLEEub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gQShhcmd1bWVudHMpfSxBLnByb3RvdHlwZS50b1NldFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxPLmlzU2VxPUwsTy5LZXllZD14LE8uU2V0PUEsTy5JbmRleGVkPWs7dmFyIGJyPVwiQEBfX0lNTVVUQUJMRV9TRVFfX0BAXCI7Ty5wcm90b3R5cGVbYnJdPSEwLHQoaixrKSxqLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fYXJyYXlbdSh0aGlzLHQpXTplfSxqLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5fYXJyYXksbj1yLmxlbmd0aC0xLGk9MDtuPj1pO2krKylpZih0KHJbZT9uLWk6aV0saSx0aGlzKT09PSExKXJldHVybiBpKzE7cmV0dXJuIGl9LGoucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9hcnJheSxuPXIubGVuZ3RoLTEsaT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybiBpPm4/SSgpOnoodCxpLHJbZT9uLWkrKzppKytdKX0pfSx0KFIseCksUi5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMD09PWV8fHRoaXMuaGFzKHQpP3RoaXMuX29iamVjdFt0XTplfSxSLnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX29iamVjdC5oYXNPd25Qcm9wZXJ0eSh0KX0sUi5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMuX29iamVjdCxuPXRoaXMuX2tleXMsaT1uLmxlbmd0aC0xLG89MDtpPj1vO28rKyl7dmFyIHU9bltlP2ktbzpvXTtpZih0KHJbdV0sdSx0aGlzKT09PSExKXJldHVybiBvKzF9cmV0dXJuIG99LFIucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9vYmplY3Qsbj10aGlzLl9rZXlzLGk9bi5sZW5ndGgtMSxvPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHU9bltlP2ktbzpvXTtyZXR1cm4gbysrPmk/SSgpOnoodCx1LHJbdV0pfSl9LFIucHJvdG90eXBlW2RyXT0hMCx0KFUsayksVS5wcm90b3R5cGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKHQsZSk7dmFyIHI9dGhpcy5faXRlcmFibGUsbj1EKHIpLGk9MDtpZihxKG4pKWZvcih2YXIgbzshKG89bi5uZXh0KCkpLmRvbmUmJnQoby52YWx1ZSxpKyssdGhpcykhPT0hMTspO1xuICByZXR1cm4gaX0sVS5wcm90b3R5cGUuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodCxlKTt2YXIgcj10aGlzLl9pdGVyYWJsZSxuPUQocik7aWYoIXEobikpcmV0dXJuIG5ldyBTKEkpO3ZhciBpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9bi5uZXh0KCk7cmV0dXJuIGUuZG9uZT9lOnoodCxpKyssZS52YWx1ZSl9KX0sdChLLGspLEsucHJvdG90eXBlLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZSh0LGUpO2Zvcih2YXIgcj10aGlzLl9pdGVyYXRvcixuPXRoaXMuX2l0ZXJhdG9yQ2FjaGUsaT0wO24ubGVuZ3RoPmk7KWlmKHQobltpXSxpKyssdGhpcyk9PT0hMSlyZXR1cm4gaTtmb3IodmFyIG87IShvPXIubmV4dCgpKS5kb25lOyl7dmFyIHU9by52YWx1ZTtpZihuW2ldPXUsdCh1LGkrKyx0aGlzKT09PSExKWJyZWFrfXJldHVybiBpfSxLLnByb3RvdHlwZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXJhdG9yLG49dGhpcy5faXRlcmF0b3JDYWNoZSxpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7aWYoaT49bi5sZW5ndGgpe3ZhciBlPXIubmV4dCgpO2lmKGUuZG9uZSlyZXR1cm4gZTtuW2ldPWUudmFsdWV9cmV0dXJuIHoodCxpLG5baSsrXSl9KX07dmFyIHFyO3QoSCxfKSx0KFYsSCksdChZLEgpLHQoUSxIKSxILktleWVkPVYsSC5JbmRleGVkPVksSC5TZXQ9UTt2YXIgRHIsTXI9XCJmdW5jdGlvblwiPT10eXBlb2YgTWF0aC5pbXVsJiYtMj09PU1hdGguaW11bCg0Mjk0OTY3Mjk1LDIpP01hdGguaW11bDpmdW5jdGlvbih0LGUpe3Q9MHx0LGU9MHxlO3ZhciByPTY1NTM1JnQsbj02NTUzNSZlO3JldHVybiByKm4rKCh0Pj4+MTYpKm4rciooZT4+PjE2KTw8MTY+Pj4wKXwwfSxFcj1PYmplY3QuaXNFeHRlbnNpYmxlLE9yPWZ1bmN0aW9uKCl7dHJ5e3JldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sXCJAXCIse30pLCEwfWNhdGNoKHQpe3JldHVybiExfX0oKSx4cj1cImZ1bmN0aW9uXCI9PXR5cGVvZiBXZWFrTWFwO3hyJiYoRHI9bmV3IFdlYWtNYXApO3ZhciBrcj0wLEFyPVwiX19pbW11dGFibGVoYXNoX19cIjtcImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJihBcj1TeW1ib2woQXIpKTt2YXIganI9MTYsUnI9MjU1LFVyPTAsS3I9e307dChhdCx4KSxhdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2l0ZXIuZ2V0KHQsZSl9LGF0LnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2l0ZXIuaGFzKHQpfSxhdC5wcm90b3R5cGUudmFsdWVTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXRlci52YWx1ZVNlcSgpfSxhdC5wcm90b3R5cGUucmV2ZXJzZT1mdW5jdGlvbigpe3ZhciB0PXRoaXMsZT12dCh0aGlzLCEwKTtyZXR1cm4gdGhpcy5fdXNlS2V5c3x8KGUudmFsdWVTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdC5faXRlci50b1NlcSgpLnJldmVyc2UoKX0pLGV9LGF0LnByb3RvdHlwZS5tYXA9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLG49cHQodGhpcyx0LGUpO3JldHVybiB0aGlzLl91c2VLZXlzfHwobi52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiByLl9pdGVyLnRvU2VxKCkubWFwKHQsZSl9KSxufSxhdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHIsbj10aGlzO3JldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZSh0aGlzLl91c2VLZXlzP2Z1bmN0aW9uKGUscil7cmV0dXJuIHQoZSxyLG4pfToocj1lP2t0KHRoaXMpOjAsZnVuY3Rpb24oaSl7cmV0dXJuIHQoaSxlPy0tcjpyKyssbil9KSxlKX0sYXQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtpZih0aGlzLl91c2VLZXlzKXJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0b3IodCxlKTt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSksbj1lP2t0KHRoaXMpOjA7XG4gIHJldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBpPXIubmV4dCgpO3JldHVybiBpLmRvbmU/aTp6KHQsZT8tLW46bisrLGkudmFsdWUsaSl9KX0sYXQucHJvdG90eXBlW2RyXT0hMCx0KGh0LGspLGh0LnByb3RvdHlwZS5pbmNsdWRlcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5pbmNsdWRlcyh0KX0saHQucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj0wO3JldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gdChlLG4rKyxyKX0sZSl9LGh0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpLG49MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgZT1yLm5leHQoKTtyZXR1cm4gZS5kb25lP2U6eih0LG4rKyxlLnZhbHVlLGUpfSl9LHQoZnQsQSksZnQucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5pbmNsdWRlcyh0KX0sZnQucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiB0KGUsZSxyKX0sZSl9LGZ0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPXIubmV4dCgpO3JldHVybiBlLmRvbmU/ZTp6KHQsZS52YWx1ZSxlLnZhbHVlLGUpfSl9LHQoY3QseCksY3QucHJvdG90eXBlLmVudHJ5U2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2l0ZXIudG9TZXEoKX0sY3QucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe2lmKGUpe3h0KGUpO3ZhciBuPXkoZSk7cmV0dXJuIHQobj9lLmdldCgxKTplWzFdLG4/ZS5nZXQoMCk6ZVswXSxyKX19LGUpfSxjdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2l0ZXIuX19pdGVyYXRvcihncixlKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoOzspe3ZhciBlPXIubmV4dCgpO2lmKGUuZG9uZSlyZXR1cm4gZTt2YXIgbj1lLnZhbHVlO2lmKG4pe3h0KG4pO3ZhciBpPXkobik7cmV0dXJuIHoodCxpP24uZ2V0KDApOm5bMF0saT9uLmdldCgxKTpuWzFdLGUpfX19KX0saHQucHJvdG90eXBlLmNhY2hlUmVzdWx0PWF0LnByb3RvdHlwZS5jYWNoZVJlc3VsdD1mdC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9Y3QucHJvdG90eXBlLmNhY2hlUmVzdWx0PVJ0LHQoTHQsViksTHQucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIk1hcCB7XCIsXCJ9XCIpfSxMdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX3Jvb3Q/dGhpcy5fcm9vdC5nZXQoMCx2b2lkIDAsdCxlKTplfSxMdC5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFh0KHRoaXMsdCxlKX0sTHQucHJvdG90eXBlLnNldEluPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxjcixmdW5jdGlvbigpe3JldHVybiBlfSl9LEx0LnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7cmV0dXJuIFh0KHRoaXMsdCxjcil9LEx0LnByb3RvdHlwZS5kZWxldGVJbj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy51cGRhdGVJbih0LGZ1bmN0aW9uKCl7cmV0dXJuIGNyfSl9LEx0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLHIpe3JldHVybiAxPT09YXJndW1lbnRzLmxlbmd0aD90KHRoaXMpOnRoaXMudXBkYXRlSW4oW3RdLGUscil9LEx0LnByb3RvdHlwZS51cGRhdGVJbj1mdW5jdGlvbih0LGUscil7cnx8KHI9ZSxlPXZvaWQgMCk7dmFyIG49b2UodGhpcyxLdCh0KSxlLHIpO3JldHVybiBuPT09Y3I/dm9pZCAwOm59LEx0LnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX3Jvb3Q9bnVsbCxcbiAgdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOlF0KCl9LEx0LnByb3RvdHlwZS5tZXJnZT1mdW5jdGlvbigpe3JldHVybiByZSh0aGlzLHZvaWQgMCxhcmd1bWVudHMpfSxMdC5wcm90b3R5cGUubWVyZ2VXaXRoPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiByZSh0aGlzLHQsZSl9LEx0LnByb3RvdHlwZS5tZXJnZUluPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiB0aGlzLnVwZGF0ZUluKHQsUXQoKSxmdW5jdGlvbih0KXtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm1lcmdlP3QubWVyZ2UuYXBwbHkodCxlKTplW2UubGVuZ3RoLTFdfSl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXA9ZnVuY3Rpb24oKXtyZXR1cm4gcmUodGhpcyxuZSh2b2lkIDApLGFyZ3VtZW50cyl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXBXaXRoPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiByZSh0aGlzLG5lKHQpLGUpfSxMdC5wcm90b3R5cGUubWVyZ2VEZWVwSW49ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxRdCgpLGZ1bmN0aW9uKHQpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQubWVyZ2VEZWVwP3QubWVyZ2VEZWVwLmFwcGx5KHQsZSk6ZVtlLmxlbmd0aC0xXX0pfSxMdC5wcm90b3R5cGUuc29ydD1mdW5jdGlvbih0KXtyZXR1cm4gSWUocXQodGhpcyx0KSl9LEx0LnByb3RvdHlwZS5zb3J0Qnk9ZnVuY3Rpb24odCxlKXtyZXR1cm4gSWUocXQodGhpcyxlLHQpKX0sTHQucHJvdG90eXBlLndpdGhNdXRhdGlvbnM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5hc011dGFibGUoKTtyZXR1cm4gdChlKSxlLndhc0FsdGVyZWQoKT9lLl9fZW5zdXJlT3duZXIodGhpcy5fX293bmVySUQpOnRoaXN9LEx0LnByb3RvdHlwZS5hc011dGFibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX293bmVySUQ/dGhpczp0aGlzLl9fZW5zdXJlT3duZXIobmV3IG4pfSxMdC5wcm90b3R5cGUuYXNJbW11dGFibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2Vuc3VyZU93bmVyKCl9LEx0LnByb3RvdHlwZS53YXNBbHRlcmVkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19hbHRlcmVkfSxMdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgUHQodGhpcyx0LGUpfSxMdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIHRoaXMuX3Jvb3QmJnRoaXMuX3Jvb3QuaXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gbisrLHQoZVsxXSxlWzBdLHIpfSxlKSxufSxMdC5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD9ZdCh0aGlzLnNpemUsdGhpcy5fcm9vdCx0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9fYWx0ZXJlZD0hMSx0aGlzKX0sTHQuaXNNYXA9VHQ7dmFyIExyPVwiQEBfX0lNTVVUQUJMRV9NQVBfX0BAXCIsVHI9THQucHJvdG90eXBlO1RyW0xyXT0hMCxUcltzcl09VHIucmVtb3ZlLFRyLnJlbW92ZUluPVRyLmRlbGV0ZUluLFd0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7Zm9yKHZhciBpPXRoaXMuZW50cmllcyxvPTAsdT1pLmxlbmd0aDt1Pm87bysrKWlmKFgocixpW29dWzBdKSlyZXR1cm4gaVtvXVsxXTtyZXR1cm4gbn0sV3QucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUsbixvLHUscyxhKXtmb3IodmFyIGg9dT09PWNyLGY9dGhpcy5lbnRyaWVzLGM9MCxfPWYubGVuZ3RoO18+YyYmIVgobyxmW2NdWzBdKTtjKyspO3ZhciBwPV8+YztpZihwP2ZbY11bMV09PT11OmgpcmV0dXJuIHRoaXM7aWYocihhKSwoaHx8IXApJiZyKHMpLCFofHwxIT09Zi5sZW5ndGgpe2lmKCFwJiYhaCYmZi5sZW5ndGg+PUJyKXJldHVybiAkdCh0LGYsbyx1KTt2YXIgdj10JiZ0PT09dGhpcy5vd25lcklELGw9dj9mOmkoZik7cmV0dXJuIHA/aD9jPT09Xy0xP2wucG9wKCk6bFtjXT1sLnBvcCgpOmxbY109W28sdV06bC5wdXNoKFtvLHVdKSxcbiAgdj8odGhpcy5lbnRyaWVzPWwsdGhpcyk6bmV3IFd0KHQsbCl9fSxCdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe3ZvaWQgMD09PWUmJihlPWV0KHIpKTt2YXIgaT0xPDwoKDA9PT10P2U6ZT4+PnQpJmZyKSxvPXRoaXMuYml0bWFwO3JldHVybiAwPT09KG8maSk/bjp0aGlzLm5vZGVzW3VlKG8maS0xKV0uZ2V0KHQrYXIsZSxyLG4pfSxCdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxyLG4saSxvLHUpe3ZvaWQgMD09PXImJihyPWV0KG4pKTt2YXIgcz0oMD09PWU/cjpyPj4+ZSkmZnIsYT0xPDxzLGg9dGhpcy5iaXRtYXAsZj0wIT09KGgmYSk7aWYoIWYmJmk9PT1jcilyZXR1cm4gdGhpczt2YXIgYz11ZShoJmEtMSksXz10aGlzLm5vZGVzLHA9Zj9fW2NdOnZvaWQgMCx2PUZ0KHAsdCxlK2FyLHIsbixpLG8sdSk7aWYodj09PXApcmV0dXJuIHRoaXM7aWYoIWYmJnYmJl8ubGVuZ3RoPj1DcilyZXR1cm4gZWUodCxfLGgscyx2KTtpZihmJiYhdiYmMj09PV8ubGVuZ3RoJiZHdChfWzFeY10pKXJldHVybiBfWzFeY107aWYoZiYmdiYmMT09PV8ubGVuZ3RoJiZHdCh2KSlyZXR1cm4gdjt2YXIgbD10JiZ0PT09dGhpcy5vd25lcklELHk9Zj92P2g6aF5hOmh8YSxkPWY/dj9zZShfLGMsdixsKTpoZShfLGMsbCk6YWUoXyxjLHYsbCk7cmV0dXJuIGw/KHRoaXMuYml0bWFwPXksdGhpcy5ub2Rlcz1kLHRoaXMpOm5ldyBCdCh0LHksZCl9LEN0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7dm9pZCAwPT09ZSYmKGU9ZXQocikpO3ZhciBpPSgwPT09dD9lOmU+Pj50KSZmcixvPXRoaXMubm9kZXNbaV07cmV0dXJuIG8/by5nZXQodCthcixlLHIsbik6bn0sQ3QucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUscixuLGksbyx1KXt2b2lkIDA9PT1yJiYocj1ldChuKSk7dmFyIHM9KDA9PT1lP3I6cj4+PmUpJmZyLGE9aT09PWNyLGg9dGhpcy5ub2RlcyxmPWhbc107aWYoYSYmIWYpcmV0dXJuIHRoaXM7dmFyIGM9RnQoZix0LGUrYXIscixuLGksbyx1KTtpZihjPT09ZilyZXR1cm4gdGhpczt2YXIgXz10aGlzLmNvdW50O2lmKGYpe2lmKCFjJiYoXy0tLEpyPl8pKXJldHVybiB0ZSh0LGgsXyxzKX1lbHNlIF8rKzt2YXIgcD10JiZ0PT09dGhpcy5vd25lcklELHY9c2UoaCxzLGMscCk7cmV0dXJuIHA/KHRoaXMuY291bnQ9Xyx0aGlzLm5vZGVzPXYsdGhpcyk6bmV3IEN0KHQsXyx2KX0sSnQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtmb3IodmFyIGk9dGhpcy5lbnRyaWVzLG89MCx1PWkubGVuZ3RoO3U+bztvKyspaWYoWChyLGlbb11bMF0pKXJldHVybiBpW29dWzFdO3JldHVybiBufSxKdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLG8sdSxzLGEpe3ZvaWQgMD09PW4mJihuPWV0KG8pKTt2YXIgaD11PT09Y3I7aWYobiE9PXRoaXMua2V5SGFzaClyZXR1cm4gaD90aGlzOihyKGEpLHIocyksWnQodGhpcyx0LGUsbixbbyx1XSkpO2Zvcih2YXIgZj10aGlzLmVudHJpZXMsYz0wLF89Zi5sZW5ndGg7Xz5jJiYhWChvLGZbY11bMF0pO2MrKyk7dmFyIHA9Xz5jO2lmKHA/ZltjXVsxXT09PXU6aClyZXR1cm4gdGhpcztpZihyKGEpLChofHwhcCkmJnIocyksaCYmMj09PV8pcmV0dXJuIG5ldyBOdCh0LHRoaXMua2V5SGFzaCxmWzFeY10pO3ZhciB2PXQmJnQ9PT10aGlzLm93bmVySUQsbD12P2Y6aShmKTtyZXR1cm4gcD9oP2M9PT1fLTE/bC5wb3AoKTpsW2NdPWwucG9wKCk6bFtjXT1bbyx1XTpsLnB1c2goW28sdV0pLHY/KHRoaXMuZW50cmllcz1sLHRoaXMpOm5ldyBKdCh0LHRoaXMua2V5SGFzaCxsKX0sTnQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtyZXR1cm4gWChyLHRoaXMuZW50cnlbMF0pP3RoaXMuZW50cnlbMV06bn0sTnQucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUsbixpLG8sdSxzKXt2YXIgYT1vPT09Y3IsaD1YKGksdGhpcy5lbnRyeVswXSk7cmV0dXJuKGg/bz09PXRoaXMuZW50cnlbMV06YSk/dGhpczoocihzKSxhP3ZvaWQgcih1KTpoP3QmJnQ9PT10aGlzLm93bmVySUQ/KHRoaXMuZW50cnlbMV09byx0aGlzKTpuZXcgTnQodCx0aGlzLmtleUhhc2gsW2ksb10pOihyKHUpLFxuICBadCh0aGlzLHQsZSxldChpKSxbaSxvXSkpKX0sV3QucHJvdG90eXBlLml0ZXJhdGU9SnQucHJvdG90eXBlLml0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5lbnRyaWVzLG49MCxpPXIubGVuZ3RoLTE7aT49bjtuKyspaWYodChyW2U/aS1uOm5dKT09PSExKXJldHVybiExfSxCdC5wcm90b3R5cGUuaXRlcmF0ZT1DdC5wcm90b3R5cGUuaXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLm5vZGVzLG49MCxpPXIubGVuZ3RoLTE7aT49bjtuKyspe3ZhciBvPXJbZT9pLW46bl07aWYobyYmby5pdGVyYXRlKHQsZSk9PT0hMSlyZXR1cm4hMX19LE50LnByb3RvdHlwZS5pdGVyYXRlPWZ1bmN0aW9uKHQpe3JldHVybiB0KHRoaXMuZW50cnkpfSx0KFB0LFMpLFB0LnByb3RvdHlwZS5uZXh0PWZ1bmN0aW9uKCl7Zm9yKHZhciB0PXRoaXMuX3R5cGUsZT10aGlzLl9zdGFjaztlOyl7dmFyIHIsbj1lLm5vZGUsaT1lLmluZGV4Kys7aWYobi5lbnRyeSl7aWYoMD09PWkpcmV0dXJuIEh0KHQsbi5lbnRyeSl9ZWxzZSBpZihuLmVudHJpZXMpe2lmKHI9bi5lbnRyaWVzLmxlbmd0aC0xLHI+PWkpcmV0dXJuIEh0KHQsbi5lbnRyaWVzW3RoaXMuX3JldmVyc2U/ci1pOmldKX1lbHNlIGlmKHI9bi5ub2Rlcy5sZW5ndGgtMSxyPj1pKXt2YXIgbz1uLm5vZGVzW3RoaXMuX3JldmVyc2U/ci1pOmldO2lmKG8pe2lmKG8uZW50cnkpcmV0dXJuIEh0KHQsby5lbnRyeSk7ZT10aGlzLl9zdGFjaz1WdChvLGUpfWNvbnRpbnVlfWU9dGhpcy5fc3RhY2s9dGhpcy5fc3RhY2suX19wcmV2fXJldHVybiBJKCl9O3ZhciBXcixCcj1oci80LENyPWhyLzIsSnI9aHIvNDt0KGZlLFkpLGZlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sZmUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIkxpc3QgW1wiLFwiXVwiKX0sZmUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe2lmKHQ9dSh0aGlzLHQpLHQ+PTAmJnRoaXMuc2l6ZT50KXt0Kz10aGlzLl9vcmlnaW47dmFyIHI9Z2UodGhpcyx0KTtyZXR1cm4gciYmci5hcnJheVt0JmZyXX1yZXR1cm4gZX0sZmUucHJvdG90eXBlLnNldD1mdW5jdGlvbih0LGUpe3JldHVybiB5ZSh0aGlzLHQsZSl9LGZlLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuaGFzKHQpPzA9PT10P3RoaXMuc2hpZnQoKTp0PT09dGhpcy5zaXplLTE/dGhpcy5wb3AoKTp0aGlzLnNwbGljZSh0LDEpOnRoaXN9LGZlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT10aGlzLl9vcmlnaW49dGhpcy5fY2FwYWNpdHk9MCx0aGlzLl9sZXZlbD1hcix0aGlzLl9yb290PXRoaXMuX3RhaWw9bnVsbCx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6bGUoKX0sZmUucHJvdG90eXBlLnB1c2g9ZnVuY3Rpb24oKXt2YXIgdD1hcmd1bWVudHMsZT10aGlzLnNpemU7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihyKXt3ZShyLDAsZSt0Lmxlbmd0aCk7Zm9yKHZhciBuPTA7dC5sZW5ndGg+bjtuKyspci5zZXQoZStuLHRbbl0pfSl9LGZlLnByb3RvdHlwZS5wb3A9ZnVuY3Rpb24oKXtyZXR1cm4gd2UodGhpcywwLC0xKX0sZmUucHJvdG90eXBlLnVuc2hpZnQ9ZnVuY3Rpb24oKXt2YXIgdD1hcmd1bWVudHM7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt3ZShlLC10Lmxlbmd0aCk7Zm9yKHZhciByPTA7dC5sZW5ndGg+cjtyKyspZS5zZXQocix0W3JdKX0pfSxmZS5wcm90b3R5cGUuc2hpZnQ9ZnVuY3Rpb24oKXtyZXR1cm4gd2UodGhpcywxKX0sZmUucHJvdG90eXBlLm1lcmdlPWZ1bmN0aW9uKCl7cmV0dXJuIFNlKHRoaXMsdm9pZCAwLGFyZ3VtZW50cyl9LGZlLnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIFNlKHRoaXMsdCxlKX0sZmUucHJvdG90eXBlLm1lcmdlRGVlcD1mdW5jdGlvbigpe3JldHVybiBTZSh0aGlzLG5lKHZvaWQgMCksYXJndW1lbnRzKTtcbn0sZmUucHJvdG90eXBlLm1lcmdlRGVlcFdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIFNlKHRoaXMsbmUodCksZSl9LGZlLnByb3RvdHlwZS5zZXRTaXplPWZ1bmN0aW9uKHQpe3JldHVybiB3ZSh0aGlzLDAsdCl9LGZlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuc2l6ZTtyZXR1cm4gYSh0LGUscik/dGhpczp3ZSh0aGlzLGgodCxyKSxmKGUscikpfSxmZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPTAsbj1wZSh0aGlzLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPW4oKTtyZXR1cm4gZT09PVZyP0koKTp6KHQscisrLGUpfSl9LGZlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHIsbj0wLGk9cGUodGhpcyxlKTsocj1pKCkpIT09VnImJnQocixuKyssdGhpcykhPT0hMTspO3JldHVybiBufSxmZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD92ZSh0aGlzLl9vcmlnaW4sdGhpcy5fY2FwYWNpdHksdGhpcy5fbGV2ZWwsdGhpcy5fcm9vdCx0aGlzLl90YWlsLHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMpfSxmZS5pc0xpc3Q9Y2U7dmFyIE5yPVwiQEBfX0lNTVVUQUJMRV9MSVNUX19AQFwiLFByPWZlLnByb3RvdHlwZTtQcltOcl09ITAsUHJbc3JdPVByLnJlbW92ZSxQci5zZXRJbj1Uci5zZXRJbixQci5kZWxldGVJbj1Qci5yZW1vdmVJbj1Uci5yZW1vdmVJbixQci51cGRhdGU9VHIudXBkYXRlLFByLnVwZGF0ZUluPVRyLnVwZGF0ZUluLFByLm1lcmdlSW49VHIubWVyZ2VJbixQci5tZXJnZURlZXBJbj1Uci5tZXJnZURlZXBJbixQci53aXRoTXV0YXRpb25zPVRyLndpdGhNdXRhdGlvbnMsUHIuYXNNdXRhYmxlPVRyLmFzTXV0YWJsZSxQci5hc0ltbXV0YWJsZT1Uci5hc0ltbXV0YWJsZSxQci53YXNBbHRlcmVkPVRyLndhc0FsdGVyZWQsX2UucHJvdG90eXBlLnJlbW92ZUJlZm9yZT1mdW5jdGlvbih0LGUscil7aWYocj09PWU/MTw8ZTowPT09dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIHRoaXM7dmFyIG49cj4+PmUmZnI7aWYobj49dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIG5ldyBfZShbXSx0KTt2YXIgaSxvPTA9PT1uO2lmKGU+MCl7dmFyIHU9dGhpcy5hcnJheVtuXTtpZihpPXUmJnUucmVtb3ZlQmVmb3JlKHQsZS1hcixyKSxpPT09dSYmbylyZXR1cm4gdGhpc31pZihvJiYhaSlyZXR1cm4gdGhpczt2YXIgcz1tZSh0aGlzLHQpO2lmKCFvKWZvcih2YXIgYT0wO24+YTthKyspcy5hcnJheVthXT12b2lkIDA7cmV0dXJuIGkmJihzLmFycmF5W25dPWkpLHN9LF9lLnByb3RvdHlwZS5yZW1vdmVBZnRlcj1mdW5jdGlvbih0LGUscil7aWYocj09PShlPzE8PGU6MCl8fDA9PT10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gdGhpczt2YXIgbj1yLTE+Pj5lJmZyO2lmKG4+PXRoaXMuYXJyYXkubGVuZ3RoKXJldHVybiB0aGlzO3ZhciBpO2lmKGU+MCl7dmFyIG89dGhpcy5hcnJheVtuXTtpZihpPW8mJm8ucmVtb3ZlQWZ0ZXIodCxlLWFyLHIpLGk9PT1vJiZuPT09dGhpcy5hcnJheS5sZW5ndGgtMSlyZXR1cm4gdGhpc312YXIgdT1tZSh0aGlzLHQpO3JldHVybiB1LmFycmF5LnNwbGljZShuKzEpLGkmJih1LmFycmF5W25dPWkpLHV9O3ZhciBIcixWcj17fTt0KEllLEx0KSxJZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LEllLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJPcmRlcmVkTWFwIHtcIixcIn1cIil9LEllLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9tYXAuZ2V0KHQpO3JldHVybiB2b2lkIDAhPT1yP3RoaXMuX2xpc3QuZ2V0KHIpWzFdOmV9LEllLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX21hcC5jbGVhcigpLHRoaXMuX2xpc3QuY2xlYXIoKSx0aGlzKTpEZSgpO1xufSxJZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE1lKHRoaXMsdCxlKX0sSWUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gTWUodGhpcyx0LGNyKX0sSWUucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKXx8dGhpcy5fbGlzdC53YXNBbHRlcmVkKCl9LEllLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiB0aGlzLl9saXN0Ll9faXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gZSYmdChlWzFdLGVbMF0scil9LGUpfSxJZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9saXN0LmZyb21FbnRyeVNlcSgpLl9faXRlcmF0b3IodCxlKX0sSWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7aWYodD09PXRoaXMuX19vd25lcklEKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpLHI9dGhpcy5fbGlzdC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P3FlKGUscix0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9tYXA9ZSx0aGlzLl9saXN0PXIsdGhpcyl9LEllLmlzT3JkZXJlZE1hcD1iZSxJZS5wcm90b3R5cGVbZHJdPSEwLEllLnByb3RvdHlwZVtzcl09SWUucHJvdG90eXBlLnJlbW92ZTt2YXIgWXI7dChFZSxZKSxFZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTdGFjayBbXCIsXCJdXCIpfSxFZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faGVhZDtmb3IodD11KHRoaXMsdCk7ciYmdC0tOylyPXIubmV4dDtyZXR1cm4gcj9yLnZhbHVlOmV9LEVlLnByb3RvdHlwZS5wZWVrPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2hlYWQmJnRoaXMuX2hlYWQudmFsdWV9LEVlLnByb3RvdHlwZS5wdXNoPWZ1bmN0aW9uKCl7aWYoMD09PWFyZ3VtZW50cy5sZW5ndGgpcmV0dXJuIHRoaXM7Zm9yKHZhciB0PXRoaXMuc2l6ZSthcmd1bWVudHMubGVuZ3RoLGU9dGhpcy5faGVhZCxyPWFyZ3VtZW50cy5sZW5ndGgtMTtyPj0wO3ItLSllPXt2YWx1ZTphcmd1bWVudHNbcl0sbmV4dDplfTtyZXR1cm4gdGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT10LHRoaXMuX2hlYWQ9ZSx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6eGUodCxlKX0sRWUucHJvdG90eXBlLnB1c2hBbGw9ZnVuY3Rpb24odCl7aWYodD12KHQpLDA9PT10LnNpemUpcmV0dXJuIHRoaXM7c3QodC5zaXplKTt2YXIgZT10aGlzLnNpemUscj10aGlzLl9oZWFkO3JldHVybiB0LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe2UrKyxyPXt2YWx1ZTp0LG5leHQ6cn19KSx0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPWUsdGhpcy5faGVhZD1yLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZShlLHIpfSxFZS5wcm90b3R5cGUucG9wPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMSl9LEVlLnByb3RvdHlwZS51bnNoaWZ0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucHVzaC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS51bnNoaWZ0QWxsPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnB1c2hBbGwodCl9LEVlLnByb3RvdHlwZS5zaGlmdD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnBvcC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX2hlYWQ9dm9pZCAwLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTprZSgpfSxFZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXtpZihhKHQsZSx0aGlzLnNpemUpKXJldHVybiB0aGlzO3ZhciByPWgodCx0aGlzLnNpemUpLG49ZihlLHRoaXMuc2l6ZSk7aWYobiE9PXRoaXMuc2l6ZSlyZXR1cm4gWS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLHQsZSk7XG4gIGZvcih2YXIgaT10aGlzLnNpemUtcixvPXRoaXMuX2hlYWQ7ci0tOylvPW8ubmV4dDtyZXR1cm4gdGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT1pLHRoaXMuX2hlYWQ9byx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6eGUoaSxvKX0sRWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7cmV0dXJuIHQ9PT10aGlzLl9fb3duZXJJRD90aGlzOnQ/eGUodGhpcy5zaXplLHRoaXMuX2hlYWQsdCx0aGlzLl9faGFzaCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fX2FsdGVyZWQ9ITEsdGhpcyl9LEVlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLnJldmVyc2UoKS5fX2l0ZXJhdGUodCk7Zm9yKHZhciByPTAsbj10aGlzLl9oZWFkO24mJnQobi52YWx1ZSxyKyssdGhpcykhPT0hMTspbj1uLm5leHQ7cmV0dXJuIHJ9LEVlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5yZXZlcnNlKCkuX19pdGVyYXRvcih0KTt2YXIgcj0wLG49dGhpcy5faGVhZDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZihuKXt2YXIgZT1uLnZhbHVlO3JldHVybiBuPW4ubmV4dCx6KHQscisrLGUpfXJldHVybiBJKCl9KX0sRWUuaXNTdGFjaz1PZTt2YXIgUXI9XCJAQF9fSU1NVVRBQkxFX1NUQUNLX19AQFwiLFhyPUVlLnByb3RvdHlwZTtYcltRcl09ITAsWHIud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLFhyLmFzTXV0YWJsZT1Uci5hc011dGFibGUsWHIuYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsWHIud2FzQWx0ZXJlZD1Uci53YXNBbHRlcmVkO3ZhciBGcjt0KEFlLFEpLEFlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sQWUuZnJvbUtleXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMocCh0KS5rZXlTZXEoKSl9LEFlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXQge1wiLFwifVwiKX0sQWUucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fbWFwLmhhcyh0KX0sQWUucHJvdG90eXBlLmFkZD1mdW5jdGlvbih0KXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAuc2V0KHQsITApKX0sQWUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAucmVtb3ZlKHQpKX0sQWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIFJlKHRoaXMsdGhpcy5fbWFwLmNsZWFyKCkpfSxBZS5wcm90b3R5cGUudW5pb249ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtyZXR1cm4gdD10LmZpbHRlcihmdW5jdGlvbih0KXtyZXR1cm4gMCE9PXQuc2l6ZX0pLDA9PT10Lmxlbmd0aD90aGlzOjAhPT10aGlzLnNpemV8fHRoaXMuX19vd25lcklEfHwxIT09dC5sZW5ndGg/dGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe2Zvcih2YXIgcj0wO3QubGVuZ3RoPnI7cisrKWwodFtyXSkuZm9yRWFjaChmdW5jdGlvbih0KXtyZXR1cm4gZS5hZGQodCl9KX0pOnRoaXMuY29uc3RydWN0b3IodFswXSl9LEFlLnByb3RvdHlwZS5pbnRlcnNlY3Q9ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtpZigwPT09dC5sZW5ndGgpcmV0dXJuIHRoaXM7dD10Lm1hcChmdW5jdGlvbih0KXtyZXR1cm4gbCh0KX0pO3ZhciBlPXRoaXM7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihyKXtlLmZvckVhY2goZnVuY3Rpb24oZSl7dC5ldmVyeShmdW5jdGlvbih0KXtyZXR1cm4gdC5pbmNsdWRlcyhlKX0pfHxyLnJlbW92ZShlKX0pfSl9LEFlLnByb3RvdHlwZS5zdWJ0cmFjdD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO2lmKDA9PT10Lmxlbmd0aClyZXR1cm4gdGhpczt0PXQubWFwKGZ1bmN0aW9uKHQpe3JldHVybiBsKHQpfSk7dmFyIGU9dGhpcztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe2UuZm9yRWFjaChmdW5jdGlvbihlKXt0LnNvbWUoZnVuY3Rpb24odCl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9KSYmci5yZW1vdmUoZSk7XG59KX0pfSxBZS5wcm90b3R5cGUubWVyZ2U9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEFlLnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLHQpfSxBZS5wcm90b3R5cGUuc29ydD1mdW5jdGlvbih0KXtyZXR1cm4gTGUocXQodGhpcyx0KSl9LEFlLnByb3RvdHlwZS5zb3J0Qnk9ZnVuY3Rpb24odCxlKXtyZXR1cm4gTGUocXQodGhpcyxlLHQpKX0sQWUucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKX0sQWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX21hcC5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxuKXtyZXR1cm4gdChuLG4scil9LGUpfSxBZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9tYXAubWFwKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIGV9KS5fX2l0ZXJhdG9yKHQsZSl9LEFlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe2lmKHQ9PT10aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAuX19lbnN1cmVPd25lcih0KTtyZXR1cm4gdD90aGlzLl9fbWFrZShlLHQpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX21hcD1lLHRoaXMpfSxBZS5pc1NldD1qZTt2YXIgR3I9XCJAQF9fSU1NVVRBQkxFX1NFVF9fQEBcIixacj1BZS5wcm90b3R5cGU7WnJbR3JdPSEwLFpyW3NyXT1aci5yZW1vdmUsWnIubWVyZ2VEZWVwPVpyLm1lcmdlLFpyLm1lcmdlRGVlcFdpdGg9WnIubWVyZ2VXaXRoLFpyLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxaci5hc011dGFibGU9VHIuYXNNdXRhYmxlLFpyLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLFpyLl9fZW1wdHk9S2UsWnIuX19tYWtlPVVlO3ZhciAkcjt0KExlLEFlKSxMZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LExlLmZyb21LZXlzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzKHAodCkua2V5U2VxKCkpfSxMZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiT3JkZXJlZFNldCB7XCIsXCJ9XCIpfSxMZS5pc09yZGVyZWRTZXQ9VGU7dmFyIHRuPUxlLnByb3RvdHlwZTt0bltkcl09ITAsdG4uX19lbXB0eT1CZSx0bi5fX21ha2U9V2U7dmFyIGVuO3QoQ2UsViksQ2UucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhOZSh0aGlzKStcIiB7XCIsXCJ9XCIpfSxDZS5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9kZWZhdWx0VmFsdWVzLmhhc093blByb3BlcnR5KHQpfSxDZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7aWYoIXRoaXMuaGFzKHQpKXJldHVybiBlO3ZhciByPXRoaXMuX2RlZmF1bHRWYWx1ZXNbdF07cmV0dXJuIHRoaXMuX21hcD90aGlzLl9tYXAuZ2V0KHQscik6cn0sQ2UucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7aWYodGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXMuX21hcCYmdGhpcy5fbWFwLmNsZWFyKCksdGhpczt2YXIgdD10aGlzLmNvbnN0cnVjdG9yO3JldHVybiB0Ll9lbXB0eXx8KHQuX2VtcHR5PUplKHRoaXMsUXQoKSkpfSxDZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7aWYoIXRoaXMuaGFzKHQpKXRocm93IEVycm9yKCdDYW5ub3Qgc2V0IHVua25vd24ga2V5IFwiJyt0KydcIiBvbiAnK05lKHRoaXMpKTt2YXIgcj10aGlzLl9tYXAmJnRoaXMuX21hcC5zZXQodCxlKTtyZXR1cm4gdGhpcy5fX293bmVySUR8fHI9PT10aGlzLl9tYXA/dGhpczpKZSh0aGlzLHIpfSxDZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe2lmKCF0aGlzLmhhcyh0KSlyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAmJnRoaXMuX21hcC5yZW1vdmUodCk7cmV0dXJuIHRoaXMuX19vd25lcklEfHxlPT09dGhpcy5fbWFwP3RoaXM6SmUodGhpcyxlKX0sQ2UucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCl9LENlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gcCh0aGlzLl9kZWZhdWx0VmFsdWVzKS5tYXAoZnVuY3Rpb24odCxlKXtyZXR1cm4gci5nZXQoZSl9KS5fX2l0ZXJhdG9yKHQsZSl9LENlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBwKHRoaXMuX2RlZmF1bHRWYWx1ZXMpLm1hcChmdW5jdGlvbih0LGUpe3JldHVybiByLmdldChlKX0pLl9faXRlcmF0ZSh0LGUpfSxDZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtpZih0PT09dGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXM7dmFyIGU9dGhpcy5fbWFwJiZ0aGlzLl9tYXAuX19lbnN1cmVPd25lcih0KTtyZXR1cm4gdD9KZSh0aGlzLGUsdCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fbWFwPWUsdGhpcyl9O3ZhciBybj1DZS5wcm90b3R5cGU7cm5bc3JdPXJuLnJlbW92ZSxybi5kZWxldGVJbj1ybi5yZW1vdmVJbj1Uci5yZW1vdmVJbixybi5tZXJnZT1Uci5tZXJnZSxybi5tZXJnZVdpdGg9VHIubWVyZ2VXaXRoLHJuLm1lcmdlSW49VHIubWVyZ2VJbixybi5tZXJnZURlZXA9VHIubWVyZ2VEZWVwLHJuLm1lcmdlRGVlcFdpdGg9VHIubWVyZ2VEZWVwV2l0aCxybi5tZXJnZURlZXBJbj1Uci5tZXJnZURlZXBJbixybi5zZXRJbj1Uci5zZXRJbixybi51cGRhdGU9VHIudXBkYXRlLHJuLnVwZGF0ZUluPVRyLnVwZGF0ZUluLHJuLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxybi5hc011dGFibGU9VHIuYXNNdXRhYmxlLHJuLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLHQoWWUsayksWWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/XCJSYW5nZSBbXVwiOlwiUmFuZ2UgWyBcIit0aGlzLl9zdGFydCtcIi4uLlwiK3RoaXMuX2VuZCsodGhpcy5fc3RlcD4xP1wiIGJ5IFwiK3RoaXMuX3N0ZXA6XCJcIikrXCIgXVwifSxZZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuaGFzKHQpP3RoaXMuX3N0YXJ0K3UodGhpcyx0KSp0aGlzLl9zdGVwOmV9LFllLnByb3RvdHlwZS5pbmNsdWRlcz1mdW5jdGlvbih0KXt2YXIgZT0odC10aGlzLl9zdGFydCkvdGhpcy5fc3RlcDtyZXR1cm4gZT49MCYmdGhpcy5zaXplPmUmJmU9PT1NYXRoLmZsb29yKGUpfSxZZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXtyZXR1cm4gYSh0LGUsdGhpcy5zaXplKT90aGlzOih0PWgodCx0aGlzLnNpemUpLGU9ZihlLHRoaXMuc2l6ZSksdD49ZT9uZXcgWWUoMCwwKTpuZXcgWWUodGhpcy5nZXQodCx0aGlzLl9lbmQpLHRoaXMuZ2V0KGUsdGhpcy5fZW5kKSx0aGlzLl9zdGVwKSl9LFllLnByb3RvdHlwZS5pbmRleE9mPWZ1bmN0aW9uKHQpe3ZhciBlPXQtdGhpcy5fc3RhcnQ7aWYoZSV0aGlzLl9zdGVwPT09MCl7dmFyIHI9ZS90aGlzLl9zdGVwO2lmKHI+PTAmJnRoaXMuc2l6ZT5yKXJldHVybiByfXJldHVybi0xfSxZZS5wcm90b3R5cGUubGFzdEluZGV4T2Y9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuaW5kZXhPZih0KX0sWWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLnNpemUtMSxuPXRoaXMuX3N0ZXAsaT1lP3RoaXMuX3N0YXJ0K3Iqbjp0aGlzLl9zdGFydCxvPTA7cj49bztvKyspe2lmKHQoaSxvLHRoaXMpPT09ITEpcmV0dXJuIG8rMTtpKz1lPy1uOm59cmV0dXJuIG99LFllLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5zaXplLTEsbj10aGlzLl9zdGVwLGk9ZT90aGlzLl9zdGFydCtyKm46dGhpcy5fc3RhcnQsbz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB1PWk7cmV0dXJuIGkrPWU/LW46bixvPnI/SSgpOnoodCxvKyssdSl9KX0sWWUucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbih0KXtyZXR1cm4gdCBpbnN0YW5jZW9mIFllP3RoaXMuX3N0YXJ0PT09dC5fc3RhcnQmJnRoaXMuX2VuZD09PXQuX2VuZCYmdGhpcy5fc3RlcD09PXQuX3N0ZXA6VmUodGhpcyx0KTtcbn07dmFyIG5uO3QoUWUsayksUWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/XCJSZXBlYXQgW11cIjpcIlJlcGVhdCBbIFwiK3RoaXMuX3ZhbHVlK1wiIFwiK3RoaXMuc2l6ZStcIiB0aW1lcyBdXCJ9LFFlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fdmFsdWU6ZX0sUWUucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3JldHVybiBYKHRoaXMuX3ZhbHVlLHQpfSxRZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLnNpemU7cmV0dXJuIGEodCxlLHIpP3RoaXM6bmV3IFFlKHRoaXMuX3ZhbHVlLGYoZSxyKS1oKHQscikpfSxRZS5wcm90b3R5cGUucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxRZS5wcm90b3R5cGUuaW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gWCh0aGlzLl92YWx1ZSx0KT8wOi0xfSxRZS5wcm90b3R5cGUubGFzdEluZGV4T2Y9ZnVuY3Rpb24odCl7cmV0dXJuIFgodGhpcy5fdmFsdWUsdCk/dGhpcy5zaXplOi0xfSxRZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT0wO3RoaXMuc2l6ZT5lO2UrKylpZih0KHRoaXMuX3ZhbHVlLGUsdGhpcyk9PT0hMSlyZXR1cm4gZSsxO3JldHVybiBlfSxRZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLHI9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtyZXR1cm4gZS5zaXplPnI/eih0LHIrKyxlLl92YWx1ZSk6SSgpfSl9LFFlLnByb3RvdHlwZS5lcXVhbHM9ZnVuY3Rpb24odCl7cmV0dXJuIHQgaW5zdGFuY2VvZiBRZT9YKHRoaXMuX3ZhbHVlLHQuX3ZhbHVlKTpWZSh0KX07dmFyIG9uO18uSXRlcmF0b3I9UyxYZShfLHt0b0FycmF5OmZ1bmN0aW9uKCl7c3QodGhpcy5zaXplKTt2YXIgdD1BcnJheSh0aGlzLnNpemV8fDApO3JldHVybiB0aGlzLnZhbHVlU2VxKCkuX19pdGVyYXRlKGZ1bmN0aW9uKGUscil7dFtyXT1lfSksdH0sdG9JbmRleGVkU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBodCh0aGlzKX0sdG9KUzpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvU2VxKCkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnRvSlM/dC50b0pTKCk6dH0pLl9fdG9KUygpfSx0b0pTT046ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdCYmXCJmdW5jdGlvblwiPT10eXBlb2YgdC50b0pTT04/dC50b0pTT04oKTp0fSkuX190b0pTKCl9LHRvS2V5ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGF0KHRoaXMsITApfSx0b01hcDpmdW5jdGlvbigpe3JldHVybiBMdCh0aGlzLnRvS2V5ZWRTZXEoKSl9LHRvT2JqZWN0OmZ1bmN0aW9uKCl7c3QodGhpcy5zaXplKTt2YXIgdD17fTtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxyKXt0W3JdPWV9KSx0fSx0b09yZGVyZWRNYXA6ZnVuY3Rpb24oKXtyZXR1cm4gSWUodGhpcy50b0tleWVkU2VxKCkpfSx0b09yZGVyZWRTZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gTGUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU2V0OmZ1bmN0aW9uKCl7cmV0dXJuIEFlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b1NldFNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgZnQodGhpcyl9LHRvU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG0odGhpcyk/dGhpcy50b0luZGV4ZWRTZXEoKTpkKHRoaXMpP3RoaXMudG9LZXllZFNlcSgpOnRoaXMudG9TZXRTZXEoKX0sdG9TdGFjazpmdW5jdGlvbigpe3JldHVybiBFZShkKHRoaXMpP3RoaXMudmFsdWVTZXEoKTp0aGlzKX0sdG9MaXN0OmZ1bmN0aW9uKCl7cmV0dXJuIGZlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b1N0cmluZzpmdW5jdGlvbigpe3JldHVyblwiW0l0ZXJhYmxlXVwifSxfX3RvU3RyaW5nOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIDA9PT10aGlzLnNpemU/dCtlOnQrXCIgXCIrdGhpcy50b1NlcSgpLm1hcCh0aGlzLl9fdG9TdHJpbmdNYXBwZXIpLmpvaW4oXCIsIFwiKStcIiBcIitlfSxjb25jYXQ6ZnVuY3Rpb24oKXtcbiAgdmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMCk7cmV0dXJuIE90KHRoaXMsU3QodGhpcyx0KSl9LGluY2x1ZGVzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnNvbWUoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxlbnRyaWVzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19pdGVyYXRvcih3cil9LGV2ZXJ5OmZ1bmN0aW9uKHQsZSl7c3QodGhpcy5zaXplKTt2YXIgcj0hMDtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obixpLG8pe3JldHVybiB0LmNhbGwoZSxuLGksbyk/dm9pZCAwOihyPSExLCExKX0pLHJ9LGZpbHRlcjpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLGx0KHRoaXMsdCxlLCEwKSl9LGZpbmQ6ZnVuY3Rpb24odCxlLHIpe3ZhciBuPXRoaXMuZmluZEVudHJ5KHQsZSk7cmV0dXJuIG4/blsxXTpyfSxmaW5kRW50cnk6ZnVuY3Rpb24odCxlKXt2YXIgcjtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obixpLG8pe3JldHVybiB0LmNhbGwoZSxuLGksbyk/KHI9W2ksbl0sITEpOnZvaWQgMH0pLHJ9LGZpbmRMYXN0RW50cnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maW5kRW50cnkodCxlKX0sZm9yRWFjaDpmdW5jdGlvbih0LGUpe3JldHVybiBzdCh0aGlzLnNpemUpLHRoaXMuX19pdGVyYXRlKGU/dC5iaW5kKGUpOnQpfSxqb2luOmZ1bmN0aW9uKHQpe3N0KHRoaXMuc2l6ZSksdD12b2lkIDAhPT10P1wiXCIrdDpcIixcIjt2YXIgZT1cIlwiLHI9ITA7cmV0dXJuIHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKG4pe3I/cj0hMTplKz10LGUrPW51bGwhPT1uJiZ2b2lkIDAhPT1uP1wiXCIrbjpcIlwifSksZX0sa2V5czpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faXRlcmF0b3IobXIpfSxtYXA6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxwdCh0aGlzLHQsZSkpfSxyZWR1Y2U6ZnVuY3Rpb24odCxlLHIpe3N0KHRoaXMuc2l6ZSk7dmFyIG4saTtyZXR1cm4gYXJndW1lbnRzLmxlbmd0aDwyP2k9ITA6bj1lLHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKGUsbyx1KXtpPyhpPSExLG49ZSk6bj10LmNhbGwocixuLGUsbyx1KX0pLG59LHJlZHVjZVJpZ2h0OmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpO3JldHVybiB0LnJlZHVjZS5hcHBseSh0LGFyZ3VtZW50cyl9LHJldmVyc2U6ZnVuY3Rpb24oKXtyZXR1cm4gT3QodGhpcyx2dCh0aGlzLCEwKSl9LHNsaWNlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbXQodGhpcyx0LGUsITApKX0sc29tZTpmdW5jdGlvbih0LGUpe3JldHVybiF0aGlzLmV2ZXJ5KFplKHQpLGUpfSxzb3J0OmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHF0KHRoaXMsdCkpfSx2YWx1ZXM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKGdyKX0sYnV0TGFzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNsaWNlKDAsLTEpfSxpc0VtcHR5OmZ1bmN0aW9uKCl7cmV0dXJuIHZvaWQgMCE9PXRoaXMuc2l6ZT8wPT09dGhpcy5zaXplOiF0aGlzLnNvbWUoZnVuY3Rpb24oKXtyZXR1cm4hMH0pfSxjb3VudDpmdW5jdGlvbih0LGUpe3JldHVybiBvKHQ/dGhpcy50b1NlcSgpLmZpbHRlcih0LGUpOnRoaXMpfSxjb3VudEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHl0KHRoaXMsdCxlKX0sZXF1YWxzOmZ1bmN0aW9uKHQpe3JldHVybiBWZSh0aGlzLHQpfSxlbnRyeVNlcTpmdW5jdGlvbigpe3ZhciB0PXRoaXM7aWYodC5fY2FjaGUpcmV0dXJuIG5ldyBqKHQuX2NhY2hlKTt2YXIgZT10LnRvU2VxKCkubWFwKEdlKS50b0luZGV4ZWRTZXEoKTtyZXR1cm4gZS5mcm9tRW50cnlTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdC50b1NlcSgpfSxlfSxmaWx0ZXJOb3Q6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5maWx0ZXIoWmUodCksZSl9LGZpbmRMYXN0OmZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gdGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpLmZpbmQodCxlLHIpfSxmaXJzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZpbmQocyl9LGZsYXRNYXA6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxJdCh0aGlzLHQsZSkpO1xufSxmbGF0dGVuOmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHp0KHRoaXMsdCwhMCkpfSxmcm9tRW50cnlTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGN0KHRoaXMpfSxnZXQ6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5maW5kKGZ1bmN0aW9uKGUscil7cmV0dXJuIFgocix0KX0sdm9pZCAwLGUpfSxnZXRJbjpmdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPXRoaXMsaT1LdCh0KTshKHI9aS5uZXh0KCkpLmRvbmU7KXt2YXIgbz1yLnZhbHVlO2lmKG49biYmbi5nZXQ/bi5nZXQobyxjcik6Y3Isbj09PWNyKXJldHVybiBlfXJldHVybiBufSxncm91cEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIGR0KHRoaXMsdCxlKX0saGFzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmdldCh0LGNyKSE9PWNyfSxoYXNJbjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5nZXRJbih0LGNyKSE9PWNyfSxpc1N1YnNldDpmdW5jdGlvbih0KXtyZXR1cm4gdD1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmluY2x1ZGVzP3Q6Xyh0KSx0aGlzLmV2ZXJ5KGZ1bmN0aW9uKGUpe3JldHVybiB0LmluY2x1ZGVzKGUpfSl9LGlzU3VwZXJzZXQ6ZnVuY3Rpb24odCl7cmV0dXJuIHQ9XCJmdW5jdGlvblwiPT10eXBlb2YgdC5pc1N1YnNldD90Ol8odCksdC5pc1N1YnNldCh0aGlzKX0sa2V5U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoRmUpLnRvSW5kZXhlZFNlcSgpfSxsYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmlyc3QoKX0sbWF4OmZ1bmN0aW9uKHQpe3JldHVybiBEdCh0aGlzLHQpfSxtYXhCeTpmdW5jdGlvbih0LGUpe3JldHVybiBEdCh0aGlzLGUsdCl9LG1pbjpmdW5jdGlvbih0KXtyZXR1cm4gRHQodGhpcyx0PyRlKHQpOnJyKX0sbWluQnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gRHQodGhpcyxlPyRlKGUpOnJyLHQpfSxyZXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMSl9LHNraXA6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc2xpY2UoTWF0aC5tYXgoMCx0KSl9LHNraXBMYXN0OmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuc2tpcCh0KS5yZXZlcnNlKCkpfSxza2lwV2hpbGU6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyx3dCh0aGlzLHQsZSwhMCkpfSxza2lwVW50aWw6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5za2lwV2hpbGUoWmUodCksZSl9LHNvcnRCeTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHF0KHRoaXMsZSx0KSl9LHRha2U6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc2xpY2UoMCxNYXRoLm1heCgwLHQpKX0sdGFrZUxhc3Q6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLnJldmVyc2UoKS50YWtlKHQpLnJldmVyc2UoKSl9LHRha2VXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLGd0KHRoaXMsdCxlKSl9LHRha2VVbnRpbDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnRha2VXaGlsZShaZSh0KSxlKX0sdmFsdWVTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b0luZGV4ZWRTZXEoKX0saGFzaENvZGU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2hhc2h8fCh0aGlzLl9faGFzaD1ucih0aGlzKSl9fSk7dmFyIHVuPV8ucHJvdG90eXBlO3VuW3ZyXT0hMCx1bltJcl09dW4udmFsdWVzLHVuLl9fdG9KUz11bi50b0FycmF5LHVuLl9fdG9TdHJpbmdNYXBwZXI9dHIsdW4uaW5zcGVjdD11bi50b1NvdXJjZT1mdW5jdGlvbigpe3JldHVyblwiXCIrdGhpc30sdW4uY2hhaW49dW4uZmxhdE1hcCx1bi5jb250YWlucz11bi5pbmNsdWRlcyxmdW5jdGlvbigpe3RyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkodW4sXCJsZW5ndGhcIix7Z2V0OmZ1bmN0aW9uKCl7aWYoIV8ubm9MZW5ndGhXYXJuaW5nKXt2YXIgdDt0cnl7dGhyb3cgRXJyb3IoKX1jYXRjaChlKXt0PWUuc3RhY2t9aWYoLTE9PT10LmluZGV4T2YoXCJfd3JhcE9iamVjdFwiKSlyZXR1cm4gY29uc29sZSYmY29uc29sZS53YXJuJiZjb25zb2xlLndhcm4oXCJpdGVyYWJsZS5sZW5ndGggaGFzIGJlZW4gZGVwcmVjYXRlZCwgdXNlIGl0ZXJhYmxlLnNpemUgb3IgaXRlcmFibGUuY291bnQoKS4gVGhpcyB3YXJuaW5nIHdpbGwgYmVjb21lIGEgc2lsZW50IGVycm9yIGluIGEgZnV0dXJlIHZlcnNpb24uIFwiK3QpLFxuICB0aGlzLnNpemV9fX0pfWNhdGNoKHQpe319KCksWGUocCx7ZmxpcDpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLF90KHRoaXMpKX0sZmluZEtleTpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuZmluZEVudHJ5KHQsZSk7cmV0dXJuIHImJnJbMF19LGZpbmRMYXN0S2V5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmluZEtleSh0LGUpfSxrZXlPZjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5maW5kS2V5KGZ1bmN0aW9uKGUpe3JldHVybiBYKGUsdCl9KX0sbGFzdEtleU9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmZpbmRMYXN0S2V5KGZ1bmN0aW9uKGUpe3JldHVybiBYKGUsdCl9KX0sbWFwRW50cmllczpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj0wO3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5tYXAoZnVuY3Rpb24oaSxvKXtyZXR1cm4gdC5jYWxsKGUsW28saV0sbisrLHIpfSkuZnJvbUVudHJ5U2VxKCkpfSxtYXBLZXlzOmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gT3QodGhpcyx0aGlzLnRvU2VxKCkuZmxpcCgpLm1hcChmdW5jdGlvbihuLGkpe3JldHVybiB0LmNhbGwoZSxuLGkscil9KS5mbGlwKCkpfX0pO3ZhciBzbj1wLnByb3RvdHlwZTtzbltscl09ITAsc25bSXJdPXVuLmVudHJpZXMsc24uX190b0pTPXVuLnRvT2JqZWN0LHNuLl9fdG9TdHJpbmdNYXBwZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gSlNPTi5zdHJpbmdpZnkoZSkrXCI6IFwiK3RyKHQpfSxYZSh2LHt0b0tleWVkU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBhdCh0aGlzLCExKX0sZmlsdGVyOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbHQodGhpcyx0LGUsITEpKX0sZmluZEluZGV4OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gcj9yWzBdOi0xfSxpbmRleE9mOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMudG9LZXllZFNlcSgpLmtleU9mKHQpO3JldHVybiB2b2lkIDA9PT1lPy0xOmV9LGxhc3RJbmRleE9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmluZGV4T2YodCl9LHJldmVyc2U6ZnVuY3Rpb24oKXtyZXR1cm4gT3QodGhpcyx2dCh0aGlzLCExKSl9LHNsaWNlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbXQodGhpcyx0LGUsITEpKX0sc3BsaWNlOmZ1bmN0aW9uKHQsZSl7dmFyIHI9YXJndW1lbnRzLmxlbmd0aDtpZihlPU1hdGgubWF4KDB8ZSwwKSwwPT09cnx8Mj09PXImJiFlKXJldHVybiB0aGlzO3Q9aCh0LDA+dD90aGlzLmNvdW50KCk6dGhpcy5zaXplKTt2YXIgbj10aGlzLnNsaWNlKDAsdCk7cmV0dXJuIE90KHRoaXMsMT09PXI/bjpuLmNvbmNhdChpKGFyZ3VtZW50cywyKSx0aGlzLnNsaWNlKHQrZSkpKX0sZmluZExhc3RJbmRleDpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMudG9LZXllZFNlcSgpLmZpbmRMYXN0S2V5KHQsZSk7cmV0dXJuIHZvaWQgMD09PXI/LTE6cn0sZmlyc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5nZXQoMCl9LGZsYXR0ZW46ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsenQodGhpcyx0LCExKSl9LGdldDpmdW5jdGlvbih0LGUpe3JldHVybiB0PXUodGhpcyx0KSwwPnR8fHRoaXMuc2l6ZT09PTEvMHx8dm9pZCAwIT09dGhpcy5zaXplJiZ0PnRoaXMuc2l6ZT9lOnRoaXMuZmluZChmdW5jdGlvbihlLHIpe3JldHVybiByPT09dH0sdm9pZCAwLGUpfSxoYXM6ZnVuY3Rpb24odCl7cmV0dXJuIHQ9dSh0aGlzLHQpLHQ+PTAmJih2b2lkIDAhPT10aGlzLnNpemU/dGhpcy5zaXplPT09MS8wfHx0aGlzLnNpemU+dDotMSE9PXRoaXMuaW5kZXhPZih0KSl9LGludGVycG9zZTpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyxidCh0aGlzLHQpKX0saW50ZXJsZWF2ZTpmdW5jdGlvbigpe3ZhciB0PVt0aGlzXS5jb25jYXQoaShhcmd1bWVudHMpKSxlPUV0KHRoaXMudG9TZXEoKSxrLm9mLHQpLHI9ZS5mbGF0dGVuKCEwKTtyZXR1cm4gZS5zaXplJiYoci5zaXplPWUuc2l6ZSp0Lmxlbmd0aCksT3QodGhpcyxyKX0sbGFzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldCgtMSk7XG59LHNraXBXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHd0KHRoaXMsdCxlLCExKSl9LHppcDpmdW5jdGlvbigpe3ZhciB0PVt0aGlzXS5jb25jYXQoaShhcmd1bWVudHMpKTtyZXR1cm4gT3QodGhpcyxFdCh0aGlzLGVyLHQpKX0semlwV2l0aDpmdW5jdGlvbih0KXt2YXIgZT1pKGFyZ3VtZW50cyk7cmV0dXJuIGVbMF09dGhpcyxPdCh0aGlzLEV0KHRoaXMsdCxlKSl9fSksdi5wcm90b3R5cGVbeXJdPSEwLHYucHJvdG90eXBlW2RyXT0hMCxYZShsLHtnZXQ6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dDplfSxpbmNsdWRlczpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5oYXModCl9LGtleVNlcTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnZhbHVlU2VxKCl9fSksbC5wcm90b3R5cGUuaGFzPXVuLmluY2x1ZGVzLFhlKHgscC5wcm90b3R5cGUpLFhlKGssdi5wcm90b3R5cGUpLFhlKEEsbC5wcm90b3R5cGUpLFhlKFYscC5wcm90b3R5cGUpLFhlKFksdi5wcm90b3R5cGUpLFhlKFEsbC5wcm90b3R5cGUpO3ZhciBhbj17SXRlcmFibGU6XyxTZXE6TyxDb2xsZWN0aW9uOkgsTWFwOkx0LE9yZGVyZWRNYXA6SWUsTGlzdDpmZSxTdGFjazpFZSxTZXQ6QWUsT3JkZXJlZFNldDpMZSxSZWNvcmQ6Q2UsUmFuZ2U6WWUsUmVwZWF0OlFlLGlzOlgsZnJvbUpTOkZ9O3JldHVybiBhbn0pOyJdfQ==
