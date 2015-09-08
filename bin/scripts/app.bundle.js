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
    this.store.setState({ currentState: 'MAIN_GAME' });
    //this.store.setState({currentState: 'PLAYER_SELECT'});
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

},{"../nori/action/ActionCreator.js":15,"../nori/service/SocketIO.js":17,"../nori/service/SocketIOEvents.js":18,"../nori/utils/Rx.js":25,"./action/ActionCreator.js":3,"./store/AppStore.js":4,"./view/AppView.js":5}],2:[function(require,module,exports){
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

},{"../../nori/action/ActionConstants.js":14,"../../nori/service/Rest.js":16,"../../nori/store/MixinReducerStore.js":20,"../../nori/utils/MixinObservableSubject.js":22,"../../nudoru/core/NumberUtils.js":42,"../action/ActionConstants.js":2}],5:[function(require,module,exports){
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

},{"../../nori/utils/MixinObservableSubject.js":22,"../../nori/view/ApplicationView.js":27,"../../nori/view/MixinComponentViews.js":28,"../../nori/view/MixinEventDelegator.js":30,"../../nori/view/MixinNudoruControls.js":31,"../../nori/view/MixinStoreStateViews.js":32,"../store/AppStore.js":4,"./Screen.GameOver.js":7,"./Screen.MainGame.js":8,"./Screen.PlayerSelect.js":9,"./Screen.Title.js":10,"./Screen.WaitingOnPlayer.js":11}],6:[function(require,module,exports){
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
    this.bindMap(_appStore); // Reducer store, map id string or map object
  },

  configuration: function configuration() {
    return {
      id: 'game__playerstats',
      mountPoint: '#game__localplayerstats'
    };
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
    return _appStore.getState().localPlayer;
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate: function componentWillUpdate() {
    return _appStore.getState().localPlayer;
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

module.exports = Component;

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../store/AppStore":4,"./AppView":5}],7:[function(require,module,exports){
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

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../../nori/view/MixinDOMManipulation.js":29,"../store/AppStore":4,"./AppView":5}],8:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator.js'),
    _appActions = require('../action/ActionCreator.js'),
    _appView = require('./AppView.js'),
    _appStore = require('../store/AppStore.js'),
    _socketIO = require('../../nori/service/SocketIO.js'),
    _template = require('../../nori/utils/Templating.js'),
    _regionPlayerStats = require('./Region.PlayerStats.js');

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
      localPlayerStats: _regionPlayerStats()
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

},{"../../nori/action/ActionCreator.js":15,"../../nori/service/SocketIO.js":17,"../../nori/utils/Templating.js":26,"../action/ActionCreator.js":3,"../store/AppStore.js":4,"./AppView.js":5,"./Region.PlayerStats.js":6}],9:[function(require,module,exports){
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

},{"../../nori/action/ActionCreator.js":15,"../../nori/service/SocketIO.js":17,"../../nori/utils/Templating.js":26,"../action/ActionCreator.js":3,"../store/AppStore.js":4,"./AppView.js":5}],10:[function(require,module,exports){
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

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../store/AppStore":4,"./AppView":5}],11:[function(require,module,exports){
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

},{"./utils/Dispatcher.js":21,"./utils/Router.js":24}],14:[function(require,module,exports){
/*  weak */

module.exports = {
  CHANGE_STORE_STATE: 'CHANGE_STORE_STATE'
};

},{}],15:[function(require,module,exports){
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

},{"./ActionConstants.js":14}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"./SocketIOEvents.js":18}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{"../../vendor/immutable.min.js":44}],20:[function(require,module,exports){
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

},{"./ImmutableMap.js":19}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":35}],24:[function(require,module,exports){
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

},{"../../nudoru/core/ObjectUtils.js":43}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":35}],27:[function(require,module,exports){
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

},{"../../nudoru/browser/DOMUtils.js":35,"../utils/Templating.js":26}],28:[function(require,module,exports){
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

},{"../store/ImmutableMap.js":19,"../utils/MixinObservableSubject.js":22,"./MixinEventDelegator.js":30,"./ViewComponent.js":33}],29:[function(require,module,exports){
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

},{}],30:[function(require,module,exports){
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

},{"../../nudoru/browser/BrowserInfo.js":34,"../utils/Rx":25}],31:[function(require,module,exports){
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

},{"../../nudoru/components/MessageBoxCreator.js":37,"../../nudoru/components/MessageBoxView.js":38,"../../nudoru/components/ModalCoverView.js":39,"../../nudoru/components/ToastView.js":40,"../../nudoru/components/ToolTipView.js":41}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
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
      _regions = {},
      _isMounted = false,
      _renderer = require('../utils/Renderer');

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
    if (!is['function'](mapObj.subscribe)) {
      console.warn('ViewComponent bindMap, map or mapcollection must be observable: ' + mapObj);
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
    var currentState = this.getState();
    var nextState = this.componentWillUpdate();

    if (this.shouldComponentUpdate(nextState)) {
      this.setState(nextState);

      if (_isMounted) {
        //if (this.shouldComponentRender(currentState)) {
        this.unmount();
        this.componentRender();
        this.mount();
        //}
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

module.exports = ViewComponent;

},{"../utils/Renderer":23,"../utils/Templating.js":26}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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

},{}],37:[function(require,module,exports){
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

},{"./MessageBoxView":38}],38:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":26,"../../nudoru/browser/BrowserInfo.js":34,"../../nudoru/browser/DOMUtils.js":35,"../../nudoru/browser/ThreeDTransforms.js":36,"./ModalCoverView.js":39}],39:[function(require,module,exports){
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

},{"../../nudoru/browser/BrowserInfo.js":34}],40:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":26,"../../nudoru/browser/BrowserInfo.js":34,"../../nudoru/browser/DOMUtils.js":35,"../../nudoru/browser/ThreeDTransforms.js":36}],41:[function(require,module,exports){
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

},{"../../nori/utils/Templating.js":26,"../../nudoru/browser/DOMUtils.js":35}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3N0b3JlL0FwcFN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L0FwcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvUmVnaW9uLlBsYXllclN0YXRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5HYW1lT3Zlci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uTWFpbkdhbWUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLlBsYXllclNlbGVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uVGl0bGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLldhaXRpbmdPblBsYXllci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9tYWluLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvTm9yaS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvUmVzdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvSW1tdXRhYmxlTWFwLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1JlbmRlcmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUm91dGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUnguanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRE9NTWFuaXB1bGF0aW9uLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpbk51ZG9ydUNvbnRyb2xzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpblN0b3JlU3RhdGVWaWV3cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvVmlld0NvbXBvbmVudC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hDcmVhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01vZGFsQ292ZXJWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29tcG9uZW50cy9Ub29sVGlwVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29yZS9OdW1iZXJVdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29yZS9PYmplY3RVdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy92ZW5kb3IvaW1tdXRhYmxlLm1pbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUksR0FBRyxHQUFlLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztJQUNoRCxXQUFXLEdBQU8sT0FBTyxDQUFDLDJCQUEyQixDQUFDO0lBQ3RELFlBQVksR0FBTSxPQUFPLENBQUMsaUNBQWlDLENBQUM7SUFDNUQs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LEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLFFBQVEsSUFBRSxPQUFPLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxVQUFVLEtBQUcsQ0FBQyxFQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFdBQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsS0FBSSxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTSxFQUFDLEtBQUssRUFBQyxLQUFLLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLElBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUMsT0FBTSxVQUFVLElBQUUsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLElBQUUsUUFBUSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFFLFFBQVEsRUFBRSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFDamdFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLGNBQWMsR0FBQyxFQUFFLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLFFBQVEsSUFBRSxPQUFPLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsd0VBQXdFLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLCtDQUErQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLFFBQVEsSUFBRSxPQUFPLENBQUMsSUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsZ0VBQWdFLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsVUFBTSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBQztBQUFDLFdBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFNLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxXQUFXLEtBQUcsTUFBTSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxXQUFXLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLFVBQVUsR0FBQyxVQUFVLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQ3BnRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxVQUFVLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsVUFBVSxHQUFFLENBQUMsSUFBRSxVQUFVLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUcsUUFBUSxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLGFBQWEsR0FBQyxDQUFDLEdBQUMsb0JBQW9CLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsS0FBRyxFQUFFLEtBQUcsRUFBRSxHQUFDLENBQUMsRUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxFQUFFLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsQ0FBQyxJQUFHLEVBQUUsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBRSxFQUFDO0FBQUMsV0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLG9CQUFvQixJQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsRUFBQyxVQUFVLEdBQUMsRUFBRSxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQSxFQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxVQUFHLEtBQUssQ0FBQyxLQUFHLEVBQUUsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQyxJQUFHLEVBQUUsRUFBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsRUFBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLEVBQUMsWUFBWSxFQUFDLENBQUMsQ0FBQyxFQUFDLFFBQVEsRUFBQyxDQUFDLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLG9CQUFvQixJQUFFLENBQUMsQ0FBQyxvQkFBb0IsS0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBQyxDQUFDLENBQUMsb0JBQW9CLEdBQUMsWUFBVTtBQUFDLGVBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFJO0FBQUMsWUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsUUFBUSxFQUFDLE1BQU0sS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxRQUFPLENBQUMsQ0FBQyxRQUFRLEdBQUUsS0FBSyxDQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLGVBQWUsSUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQSxDQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxNQUFFLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsbURBQW1ELENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsZUFBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pnRSxFQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDO0FBQUMsZ0JBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO1dBQUMsT0FBTyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxFQUFFLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxLQUFLLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGlCQUFPO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztjQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2NBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLEVBQUUsQ0FBQSxDQUFFLFNBQVMsRUFBRSxDQUFDO0FBQzlnRSxLQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGdCQUFPLENBQUMsR0FBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUU7Ozs4QkFBUztVQUFSLENBQUM7VUFBQyxDQUFDO1VBQUMsQ0FBQztVQUFDLENBQUM7QUFBTSxPQUFDLEdBQXlFLENBQUMsR0FBUSxDQUFDLEdBQXFFLENBQUMsR0FBQyxDQUFDLEdBQTRCLENBQUM7O0FBQTdMLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQzthQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Y0FBQyxDQUFDO2NBQUMsQ0FBQztjQUFDLENBQUM7OztPQUFFLElBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsSUFBRSxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGdCQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUEsQUFBQyxDQUFBO1NBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGlCQUFLLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUM7R0FBQSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsRUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRTtBQUFDLGVBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEVBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO1NBQUMsUUFBTSxDQUFDLEVBQUU7QUFDdmdFLGVBQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLENBQUE7S0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUM7S0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGtCQUFNLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO1NBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLElBQUksQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUU7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQUssQ0FBQyxHQUFFO0FBQUMsY0FBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLEVBQUUsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxBQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7V0FBQyxNQUFLLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7U0FBQyxPQUFPLENBQUMsRUFBRSxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQU0sQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEtBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEFBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUE7S0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUNoZ0UsYUFBTyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsWUFBSSxDQUFDLENBQUMsUUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7U0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsSUFBSSxDQUFBO1NBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQTtTQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyx5QkFBeUIsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQ0FBRSxTQUFTLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFBLEdBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxtQ0FBbUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxNQUFJO0FBQUMsVUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQ2pnRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxXQUFXLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxXQUFXLEtBQUcsRUFBRSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsT0FBTyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxFQUFBLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLE1BQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLGFBQWEsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsQ0FBQTtPQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsQ0FBQyxDQUFBLENBQUUsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEdBQUMsVUFBVSxFQUFDLENBQUMsR0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLFNBQVMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsR0FBQyxTQUFTLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxFQUFFLEVBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxRQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQyxDQUFDLENBQUEsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUNqaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFHLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLElBQUksRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUs7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsWUFBVTtBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQSxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLEVBQUUsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFBLEFBQUMsRUFBQyxZQUFVO0FBQUMsaUJBQU87QUFBQyxjQUFHLENBQUMsRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxFQUFFLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQTtXQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLENBQUE7U0FBQztPQUFDLENBQUEsQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxFQUFBO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUM7QUFDcmtFLFFBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxFQUFFLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEdBQUMsRUFBRSxHQUFFLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQztBQUFDLFdBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBQyxNQUFNLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxJQUFFLEVBQUUsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxFQUFFLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsRUFBRSxJQUFFLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUcsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUEsQUFBQyxDQUFBLElBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxNQUFLLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDcGdFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxTQUFGLENBQUMsQ0FBVSxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsWUFBWSxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxjQUFjLEdBQUMsQ0FBQyxDQUFBO09BQUMsSUFBSSxDQUFDLElBQUksR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsV0FBVyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLEtBQUssSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksSUFBRSxRQUFRLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRztBQUFDLE9BQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQyxFQUFFO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFDLEdBQUcsRUFBQyxlQUFVO0FBQUMsZUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxvQ0FBb0MsQ0FBQyxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsTUFBTSxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFdBQVcsSUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSTtBQUN4aEUsT0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxLQUFLLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQSxBQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsRUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsMEJBQTBCLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLENBQUEsRUFBQztBQUFDLFVBQUcsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUE7S0FBQztHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQSxBQUFDLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBLEVBQUM7QUFBQyxVQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUMsSUFBSSxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsV0FBUyxHQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsU0FBUyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsUUFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLENBQUMscUJBQXFCLElBQUUsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxZQUFVO0FBQUMsYUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sWUFBVTtBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLFFBQVEsSUFBRSxPQUFPLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsWUFBTyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsRUFBRSxFQUFDLFNBQVMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFFLEVBQUUsR0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLFVBQVUsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxFQUFDLFVBQVUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFVLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsSUFBSSxFQUFFLEdBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLO01BQUMsRUFBRSxHQUFDLFFBQVE7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxDQUFDLElBQUUsRUFBRTtNQUFDLEVBQUUsR0FBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxFQUFDO01BQUMsRUFBRSxHQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGFBQWEsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsNEJBQTRCO01BQUMsRUFBRSxHQUFDLHlCQUF5QjtNQUFDLEVBQUUsR0FBQywyQkFBMkI7TUFBQyxFQUFFLEdBQUMsMkJBQTJCO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLE1BQU0sSUFBRSxNQUFNLENBQUMsUUFBUTtNQUFDLEVBQUUsR0FBQyxZQUFZO01BQUMsRUFBRSxHQUFDLEVBQUUsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU0sWUFBWSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLEVBQUUsRUFDcmdFLENBQUMsQ0FBQyxNQUFNLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFNLEVBQUUsR0FBQyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxZQUFVO0FBQUMsWUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUUsSUFBSSxDQUFDLGlCQUFpQixLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUEsQUFBQyxFQUFDLElBQUksQ0FBQSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUc7QUFDaGtFLFdBQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFFLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxHQUFFO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQSxFQUFDLE1BQUs7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsVUFBVSxJQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksSUFBRSxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEtBQUssR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQSxHQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQSxBQUFDLElBQUUsRUFBRSxLQUFHLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUM7TUFBQyxFQUFFLEdBQUMsTUFBTSxDQUFDLFlBQVk7TUFBQyxFQUFFLEdBQUMsQ0FBQSxZQUFVO0FBQUMsUUFBRztBQUFDLGNBQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsQ0FBQSxFQUFFO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLE9BQU8sQ0FBQyxFQUFFLEtBQUcsRUFBRSxHQUFDLElBQUksT0FBTyxFQUFBLENBQUEsQUFBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsbUJBQW1CLENBQUMsVUFBVSxJQUFFLE9BQU8sTUFBTSxLQUFHLEVBQUUsR0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUU7TUFBQyxFQUFFLEdBQUMsR0FBRztNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxRQUFRLEtBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxLQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxJQUFJLENBQUMsUUFBUSxFQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7QUFDdmdFLFdBQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsRUFBQztBQUFDLFVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGVBQU87QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxZQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQztLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxZQUFVO0FBQUMsYUFBTyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLEtBQUssQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLEVBQzVnRSxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsS0FBSyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFNLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFDLElBQUksQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFBLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLEtBQUssSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHVCQUF1QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLElBQUUsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ25pRSxDQUFDLElBQUUsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQztHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQSxBQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQUksQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsTUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsS0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxFQUFDLE9BQU8sQ0FBQyxHQUFDLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFNLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxHQUFFLElBQUksSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3poRSxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBRTtBQUFDLFVBQUksQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsS0FBSyxFQUFDO0FBQUMsWUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7T0FBQyxNQUFLLElBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBQztBQUFDLGFBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxNQUFLLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLGNBQUcsQ0FBQyxDQUFDLEtBQUssRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxTQUFRO09BQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7S0FBQyxPQUFPLENBQUMsRUFBRSxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFBLEVBQUM7QUFBQyxPQUFDLElBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLENBQUMsS0FBSyxHQUFDLElBQUksRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxTQUFTLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxLQUFLLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFDO0dBQy9oRSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFBLEtBQUksRUFBRSxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyx3QkFBd0I7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsVUFBVSxHQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUE7S0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLFFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxNQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsQ0FBQyxJQUFJLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLEVBQUUsQ0FBQztHQUNuZ0UsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFlBQVksR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBRSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsUUFBRyxDQUFDLEtBQUcsU0FBUyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsU0FBUyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsRUFBQyxLQUFLLEVBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFBO0tBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUMzaUUsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBRyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMseUJBQXlCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxVQUFVLEdBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxTQUFTLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDaGhFLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsdUJBQXVCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFlBQVksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLE9BQU8sR0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFFBQUcsSUFBSSxDQUFDLFNBQVMsRUFBQyxRQUFPLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBQyxJQUFJLENBQUEsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLDBCQUEwQixHQUFDLENBQUMsR0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQ3RoRSxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVUsR0FBQyxVQUFVLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsR0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUEsQUFBQyxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFBLEdBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU07UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxZQUFZLEVBQUUsR0FBQyxJQUFJLENBQUMsTUFBTSxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsSUFBSSxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxLQUFLLEtBQUcsQ0FBQyxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3BnRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsV0FBVyxHQUFDLFdBQVcsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEdBQUcsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFVBQVUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFlBQVksRUFBQyx3QkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLElBQUUsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsc0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFlBQVksRUFBQyx3QkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsaUJBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUMsSUFBSSxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLGFBQU0sWUFBWSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsR0FBRyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEdBQUcsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUMvZ0UsVUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLGFBQWEsRUFBQyx1QkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxjQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRTtVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsUUFBTyxTQUFTLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyx1QkFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLEtBQUssQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVU7QUFBQyxlQUFNLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxRQUFPLENBQUMsQ0FBQyxZQUFZLEdBQUMsWUFBVTtBQUFDLGVBQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3hnRSxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksR0FBRTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxFQUFFLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUcsRUFBRSxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFVBQVUsRUFBQyxvQkFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsTUFBTSxLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsZ0JBQWdCLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTSxFQUFFLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLENBQUEsWUFBVTtBQUFDLFFBQUc7QUFBQyxZQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLGNBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFDO0FBQUMsZ0JBQUksQ0FBQyxDQUFDLElBQUc7QUFBQyxvQkFBTSxLQUFLLEVBQUUsQ0FBQTthQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxlQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTthQUFDLElBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBQyxRQUFPLE9BQU8sSUFBRSxPQUFPLENBQUMsSUFBSSxJQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsMklBQTJJLEdBQUMsQ0FBQyxDQUFDLEVBQ3JtRSxJQUFJLENBQUMsSUFBSSxDQUFBLENBQUE7V0FBQztTQUFDLEVBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQyxFQUFFO0dBQUMsQ0FBQSxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyxxQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLGdCQUFnQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsV0FBVyxFQUFDLHFCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxhQUFhLEVBQUMsdUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsS0FBRyxDQUFDLENBQUE7T0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQztBQUFDLGNBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxLQUFLLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxBQUFDLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN2Z0UsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsa0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsRUFBQyxRQUFRLEVBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBQyxDQUFDLEVBQUMsVUFBVSxFQUFDLENBQUMsRUFBQyxHQUFHLEVBQUMsRUFBRSxFQUFDLFVBQVUsRUFBQyxFQUFFLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUMsRUFBRSxFQUFDLEdBQUcsRUFBQyxFQUFFLEVBQUMsVUFBVSxFQUFDLEVBQUUsRUFBQyxNQUFNLEVBQUMsRUFBRSxFQUFDLEtBQUssRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFDLEVBQUUsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgX3J4ICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vbm9yaS91dGlscy9SeC5qcycpLFxuICAgIF9hcHBBY3Rpb25zICAgICA9IHJlcXVpcmUoJy4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfbm9yaUFjdGlvbnMgICAgPSByZXF1aXJlKCcuLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJyksXG4gICAgX3NvY2tldElPRXZlbnRzID0gcmVxdWlyZSgnLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cbi8qKlxuICogXCJDb250cm9sbGVyXCIgZm9yIGEgTm9yaSBhcHBsaWNhdGlvbi4gVGhlIGNvbnRyb2xsZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gKiBib290c3RyYXBwaW5nIHRoZSBhcHAgYW5kIHBvc3NpYmx5IGhhbmRsaW5nIHNvY2tldC9zZXJ2ZXIgaW50ZXJhY3Rpb24uXG4gKiBBbnkgYWRkaXRpb25hbCBmdW5jdGlvbmFsaXR5IHNob3VsZCBiZSBoYW5kbGVkIGluIGEgc3BlY2lmaWMgbW9kdWxlLlxuICovXG52YXIgQXBwID0gTm9yaS5jcmVhdGVBcHBsaWNhdGlvbih7XG5cbiAgbWl4aW5zOiBbXSxcblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBtYWluIE5vcmkgQXBwIHN0b3JlIGFuZCB2aWV3LlxuICAgKi9cbiAgc3RvcmUgOiByZXF1aXJlKCcuL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gIHZpZXcgIDogcmVxdWlyZSgnLi92aWV3L0FwcFZpZXcuanMnKSxcbiAgc29ja2V0OiByZXF1aXJlKCcuLi9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMnKSxcblxuICAvKipcbiAgICogSW50aWFsaXplIHRoZSBhcHBpbGNhdGlvbiwgdmlldyBhbmQgc3RvcmVcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvY2tldC5pbml0aWFsaXplKCk7XG4gICAgdGhpcy5zb2NrZXQuc3Vic2NyaWJlKHRoaXMuaGFuZGxlU29ja2V0TWVzc2FnZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMudmlldy5pbml0aWFsaXplKCk7XG5cbiAgICB0aGlzLnN0b3JlLmluaXRpYWxpemUoKTsgLy8gc3RvcmUgd2lsbCBhY3F1aXJlIGRhdGEgZGlzcGF0Y2ggZXZlbnQgd2hlbiBjb21wbGV0ZVxuICAgIHRoaXMuc3RvcmUuc3Vic2NyaWJlKCdzdG9yZUluaXRpYWxpemVkJywgdGhpcy5vblN0b3JlSW5pdGlhbGl6ZWQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5zdG9yZS5sb2FkU3RvcmUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQWZ0ZXIgdGhlIHN0b3JlIGRhdGEgaXMgcmVhZHlcbiAgICovXG4gIG9uU3RvcmVJbml0aWFsaXplZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucnVuQXBwbGljYXRpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBcIlBsZWFzZSB3YWl0XCIgY292ZXIgYW5kIHN0YXJ0IHRoZSBhcHBcbiAgICovXG4gIHJ1bkFwcGxpY2F0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy52aWV3LnJlbW92ZUxvYWRpbmdNZXNzYWdlKCk7XG5cbiAgICAvLyBWaWV3IHdpbGwgc2hvdyBiYXNlZCBvbiB0aGUgY3VycmVudCBzdG9yZSBzdGF0ZVxuICAgIHRoaXMuc3RvcmUuc2V0U3RhdGUoe2N1cnJlbnRTdGF0ZTogJ01BSU5fR0FNRSd9KTtcbiAgICAvL3RoaXMuc3RvcmUuc2V0U3RhdGUoe2N1cnJlbnRTdGF0ZTogJ1BMQVlFUl9TRUxFQ1QnfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFsbCBtZXNzYWdlcyBmcm9tIHRoZSBTb2NrZXQuSU8gc2VydmVyIHdpbGwgYmUgZm9yd2FyZGVkIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGhhbmRsZVNvY2tldE1lc3NhZ2U6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgaWYgKCFwYXlsb2FkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJmcm9tIFNvY2tldC5JTyBzZXJ2ZXJcIiwgcGF5bG9hZCk7XG5cbiAgICBzd2l0Y2ggKHBheWxvYWQudHlwZSkge1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkNPTk5FQ1QpOlxuICAgICAgICB0aGlzLmhhbmRsZUNvbm5lY3QocGF5bG9hZC5pZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5KT0lOX1JPT00pOlxuICAgICAgICBjb25zb2xlLmxvZyhcImpvaW4gcm9vbVwiLCBwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICB0aGlzLmhhbmRsZUpvaW5OZXdseUNyZWF0ZWRSb29tKHBheWxvYWQucGF5bG9hZC5yb29tSUQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuR0FNRV9TVEFSVCk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR0FNRSBTVEFSVEVEXCIpO1xuICAgICAgICB0aGlzLmhhbmRsZUdhbWVTdGFydChwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuR0FNRV9BQk9SVCk6XG4gICAgICAgIHRoaXMuaGFuZGxlR2FtZUFib3J0KHBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuU1lTVEVNX01FU1NBR0UpOlxuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkJST0FEQ0FTVCk6XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuTUVTU0FHRSk6XG4gICAgICAgIHRoaXMudmlldy5hbGVydChwYXlsb2FkLnBheWxvYWQsIHBheWxvYWQudHlwZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnNvbGUud2FybihcIlVuaGFuZGxlZCBTb2NrZXRJTyBtZXNzYWdlIHR5cGVcIiwgcGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH0sXG5cbiAgaGFuZGxlQ29ubmVjdDogZnVuY3Rpb24gKHNvY2tldElEKSB7XG4gICAgdmFyIHNldFNlc3Npb25JRCA9IF9hcHBBY3Rpb25zLnNldFNlc3Npb25Qcm9wcyh7c29ja2V0SU9JRDogc29ja2V0SUR9KSxcbiAgICAgICAgc2V0TG9jYWxJRCAgID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7aWQ6IHNvY2tldElEfSk7XG5cbiAgICB0aGlzLnN0b3JlLmFwcGx5KFtzZXRTZXNzaW9uSUQsIHNldExvY2FsSURdKTtcbiAgfSxcblxuICBoYW5kbGVKb2luTmV3bHlDcmVhdGVkUm9vbTogZnVuY3Rpb24gKHJvb21JRCkge1xuICAgIHZhciBzZXRSb29tICAgICAgICAgICAgICAgPSBfYXBwQWN0aW9ucy5zZXRTZXNzaW9uUHJvcHMoe3Jvb21JRDogcm9vbUlEfSksXG4gICAgICAgIHNldFdhaXRpbmdTY3JlZW5TdGF0ZSA9IF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuc3RvcmUuZ2FtZVN0YXRlc1syXX0pO1xuXG4gICAgdGhpcy5zdG9yZS5hcHBseShbc2V0Um9vbSwgc2V0V2FpdGluZ1NjcmVlblN0YXRlXSk7XG4gIH0sXG5cbiAgaGFuZGxlR2FtZVN0YXJ0OiBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIHZhciByZW1vdGVQbGF5ZXIgICAgID0gdGhpcy5wbHVja1JlbW90ZVBsYXllcihwYXlsb2FkLnBsYXllcnMpLFxuICAgICAgICBzZXRSZW1vdGVQbGF5ZXIgID0gX2FwcEFjdGlvbnMuc2V0UmVtb3RlUGxheWVyUHJvcHMocmVtb3RlUGxheWVyKSxcbiAgICAgICAgc2V0R2FtZVBsYXlTdGF0ZSA9IF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuc3RvcmUuZ2FtZVN0YXRlc1szXX0pO1xuXG4gICAgdGhpcy5zdG9yZS5hcHBseShbc2V0UmVtb3RlUGxheWVyLCBzZXRHYW1lUGxheVN0YXRlXSk7XG4gIH0sXG5cbiAgcGx1Y2tSZW1vdGVQbGF5ZXI6IGZ1bmN0aW9uIChwbGF5ZXJzQXJyeSkge1xuICAgIHZhciBsb2NhbFBsYXllcklEID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpLmxvY2FsUGxheWVyLmlkO1xuICAgIGNvbnNvbGUubG9nKCdmaWx0ZXJpbmcgZm9yJywgbG9jYWxQbGF5ZXJJRCwgcGxheWVyc0FycnkpO1xuICAgIHJldHVybiBwbGF5ZXJzQXJyeS5maWx0ZXIoZnVuY3Rpb24gKHBsYXllcikge1xuICAgICAgcmV0dXJuICEocGxheWVyLmlkID09PSBsb2NhbFBsYXllcklEKTtcbiAgICB9KVswXTtcbiAgfSxcblxuICBoYW5kbGVHYW1lQWJvcnQ6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgdGhpcy52aWV3LmFsZXJ0KHBheWxvYWQucGF5bG9hZCwgcGF5bG9hZC50eXBlKTtcbiAgICB2YXIgc2V0UGxheWVyU2VsZWN0ID0gX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogdGhpcy5zdG9yZS5nYW1lU3RhdGVzWzFdfSksXG4gICAgICAgIHJlc2V0U2Vzc2lvbiAgICA9IF9hcHBBY3Rpb25zLnNldFNlc3Npb25Qcm9wcyh7cm9vbUlEOiAnJ30pLFxuICAgICAgICByZXNldFBsYXllciAgICAgPSBfYXBwQWN0aW9ucy5zZXRMb2NhbFBsYXllclByb3BzKHRoaXMuc3RvcmUuY3JlYXRlUGxheWVyUmVzZXRPYmplY3QoKSk7XG5cbiAgICB0aGlzLnN0b3JlLmFwcGx5KFtyZXNldFBsYXllciwgcmVzZXRTZXNzaW9uLCBzZXRQbGF5ZXJTZWxlY3RdKTtcbiAgfSxcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBMT0NBTF9QTEFZRVJfQ09OTkVDVCAgICAgICA6ICdMT0NBTF9QTEFZRVJfQ09OTkVDVCcsXG4gIFNFVF9TRVNTSU9OX1BST1BTICAgICAgICAgIDogJ1NFVF9TRVNTSU9OX1BST1BTJyxcbiAgU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUyAgICAgOiAnU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUycsXG4gIFNFVF9MT0NBTF9QTEFZRVJfTkFNRSAgICAgIDogJ1NFVF9MT0NBTF9QTEFZRVJfTkFNRScsXG4gIFNFVF9MT0NBTF9QTEFZRVJfQVBQRUFSQU5DRTogJ1NFVF9MT0NBTF9QTEFZRVJfQVBQRUFSQU5DRScsXG4gIFNFVF9SRU1PVEVfUExBWUVSX1BST1BTICAgIDogJ1NFVF9SRU1PVEVfUExBWUVSX1BST1BTJ1xuICAvL1NFTEVDVF9QTEFZRVIgICAgICAgICAgICAgIDogJ1NFTEVDVF9QTEFZRVInLFxuICAvL1JFTU9URV9QTEFZRVJfQ09OTkVDVCAgICAgIDogJ1JFTU9URV9QTEFZRVJfQ09OTkVDVCcsXG4gIC8vR0FNRV9TVEFSVCAgICAgICAgICAgICAgICAgOiAnR0FNRV9TVEFSVCcsXG4gIC8vTE9DQUxfUVVFU1RJT04gICAgICAgICAgICAgOiAnTE9DQUxfUVVFU1RJT04nLFxuICAvL1JFTU9URV9RVUVTVElPTiAgICAgICAgICAgIDogJ1JFTU9URV9RVUVTVElPTicsXG4gIC8vTE9DQUxfUExBWUVSX0hFQUxUSF9DSEFOR0UgOiAnTE9DQUxfUExBWUVSX0hFQUxUSF9DSEFOR0UnLFxuICAvL1JFTU9URV9QTEFZRVJfSEVBTFRIX0NIQU5HRTogJ1JFTU9URV9QTEFZRVJfSEVBTFRIX0NIQU5HRScsXG4gIC8vR0FNRV9PVkVSICAgICAgICAgICAgICAgICAgOiAnR0FNRV9PVkVSJ1xufTsiLCJ2YXIgX2FjdGlvbkNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQWN0aW9uQ29uc3RhbnRzLmpzJyk7XG5cbi8qKlxuICogUHVyZWx5IGZvciBjb252ZW5pZW5jZSwgYW4gRXZlbnQgKFwiYWN0aW9uXCIpIENyZWF0b3IgYWxhIEZsdXggc3BlYy4gRm9sbG93XG4gKiBndWlkZWxpbmVzIGZvciBjcmVhdGluZyBhY3Rpb25zOiBodHRwczovL2dpdGh1Yi5jb20vYWNkbGl0ZS9mbHV4LXN0YW5kYXJkLWFjdGlvblxuICovXG52YXIgQWN0aW9uQ3JlYXRvciA9IHtcblxuICBzZXRMb2NhbFBsYXllclByb3BzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlICAgOiBfYWN0aW9uQ29uc3RhbnRzLlNFVF9MT0NBTF9QTEFZRVJfUFJPUFMsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBsb2NhbFBsYXllcjogZGF0YVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICBzZXRSZW1vdGVQbGF5ZXJQcm9wczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX2FjdGlvbkNvbnN0YW50cy5TRVRfUkVNT1RFX1BMQVlFUl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHJlbW90ZVBsYXllcjogZGF0YVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICBzZXRTZXNzaW9uUHJvcHM6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuU0VUX1NFU1NJT05fUFJPUFMsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBzZXNzaW9uOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQWN0aW9uQ3JlYXRvcjsiLCJ2YXIgX3Jlc3RVUkwgICAgICAgICAgICAgICAgPSAnJyxcbiAgICBfcmVzdE51bVF1ZXN0aW9ucyAgICAgICA9IDMsXG4gICAgX3Jlc3RRdWVzdGlvbkNhdGVnb3J5ICAgPSAyNCwgLy8gU0NJL1RFQ1RcbiAgICBfcmVzdCAgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc2VydmljZS9SZXN0LmpzJyksXG4gICAgX25vcmlBY3Rpb25Db25zdGFudHMgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMnKSxcbiAgICBfYXBwQWN0aW9uQ29uc3RhbnRzICAgICA9IHJlcXVpcmUoJy4uL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMnKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcycpLFxuICAgIF9taXhpblJlZHVjZXJTdG9yZSAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZS5qcycpLFxuICAgIF9udW1VdGlscyAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvcmUvTnVtYmVyVXRpbHMuanMnKTtcblxuLyoqXG4gKiBUaGlzIGFwcGxpY2F0aW9uIHN0b3JlIGNvbnRhaW5zIFwicmVkdWNlciBzdG9yZVwiIGZ1bmN0aW9uYWxpdHkgYmFzZWQgb24gUmVkdXguXG4gKiBUaGUgc3RvcmUgc3RhdGUgbWF5IG9ubHkgYmUgY2hhbmdlZCBmcm9tIGV2ZW50cyBhcyBhcHBsaWVkIGluIHJlZHVjZXIgZnVuY3Rpb25zLlxuICogVGhlIHN0b3JlIHJlY2VpdmVkIGFsbCBldmVudHMgZnJvbSB0aGUgZXZlbnQgYnVzIGFuZCBmb3J3YXJkcyB0aGVtIHRvIGFsbFxuICogcmVkdWNlciBmdW5jdGlvbnMgdG8gbW9kaWZ5IHN0YXRlIGFzIG5lZWRlZC4gT25jZSB0aGV5IGhhdmUgcnVuLCB0aGVcbiAqIGhhbmRsZVN0YXRlTXV0YXRpb24gZnVuY3Rpb24gaXMgY2FsbGVkIHRvIGRpc3BhdGNoIGFuIGV2ZW50IHRvIHRoZSBidXMsIG9yXG4gKiBub3RpZnkgc3Vic2NyaWJlcnMgdmlhIGFuIG9ic2VydmFibGUuXG4gKlxuICogRXZlbnRzID0+IGhhbmRsZUFwcGxpY2F0aW9uRXZlbnRzID0+IGFwcGx5UmVkdWNlcnMgPT4gaGFuZGxlU3RhdGVNdXRhdGlvbiA9PiBOb3RpZnlcbiAqL1xudmFyIEFwcFN0b3JlID0gTm9yaS5jcmVhdGVTdG9yZSh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluUmVkdWNlclN0b3JlLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0KClcbiAgXSxcblxuICBnYW1lU3RhdGVzOiBbJ1RJVExFJywgJ1BMQVlFUl9TRUxFQ1QnLCAnV0FJVElOR19PTl9QTEFZRVInLCAnTUFJTl9HQU1FJywgJ0dBTUVfT1ZFUiddLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmFkZFJlZHVjZXIodGhpcy5tYWluU3RhdGVSZWR1Y2VyKTtcbiAgICB0aGlzLmluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKTtcbiAgICB0aGlzLnNldFN0YXRlKE5vcmkuY29uZmlnKCkpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgnc3RvcmVJbml0aWFsaXplZCcpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgb3IgbG9hZCBhbnkgbmVjZXNzYXJ5IGRhdGEgYW5kIHRoZW4gYnJvYWRjYXN0IGEgaW5pdGlhbGl6ZWQgZXZlbnQuXG4gICAqL1xuICBsb2FkU3RvcmU6IGZ1bmN0aW9uICgpIHtcbiAgICAvL2h0dHBzOi8vbWFya2V0Lm1hc2hhcGUuY29tL3BhcmVzaGNob3VoYW4vdHJpdmlhXG4gICAgLy92YXIgZ2V0UXVlc3Rpb25zID0gX3Jlc3QucmVxdWVzdCh7XG4gICAgLy8gIG1ldGhvZCA6ICdHRVQnLFxuICAgIC8vICAvL2h0dHBzOi8vcGFyZXNoY2hvdWhhbi10cml2aWEtdjEucC5tYXNoYXBlLmNvbS92MS9nZXRRdWl6UXVlc3Rpb25zQnlDYXRlZ29yeT9jYXRlZ29yeUlkPTEmbGltaXQ9MTAmcGFnZT0xXG4gICAgLy8gIHVybCAgICA6ICdodHRwczovL3BhcmVzaGNob3VoYW4tdHJpdmlhLXYxLnAubWFzaGFwZS5jb20vdjEvZ2V0QWxsUXVpelF1ZXN0aW9ucz9saW1pdD0nICsgX3Jlc3ROdW1RdWVzdGlvbnMgKyAnJnBhZ2U9MScsXG4gICAgLy8gIGhlYWRlcnM6IFt7J1gtTWFzaGFwZS1LZXknOiAndFB4S2dEdnJrcW1zaGc4elc0b2xTODdoekY3QXAxdmk2M3Jqc25VdVZ3MXNCSFY5S0onfV0sXG4gICAgLy8gIGpzb24gICA6IHRydWVcbiAgICAvL30pLnN1YnNjcmliZShcbiAgICAvLyAgZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgLy8gICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgLy8gIH0sXG4gICAgLy8gIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAvLyAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgLy8gIH0pO1xuXG4gICAgLy8gU2V0IGluaXRpYWwgc3RhdGVcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRTdGF0ZTogdGhpcy5nYW1lU3RhdGVzWzBdLFxuICAgICAgc2Vzc2lvbiAgICAgOiB7XG4gICAgICAgIHNvY2tldElPSUQ6ICcnLFxuICAgICAgICByb29tSUQ6ICcnXG4gICAgICB9LFxuICAgICAgbG9jYWxQbGF5ZXIgOiBfLm1lcmdlKHRoaXMuY3JlYXRlQmxhbmtQbGF5ZXJPYmplY3QoKSwgdGhpcy5jcmVhdGVQbGF5ZXJSZXNldE9iamVjdCgpKSxcbiAgICAgIHJlbW90ZVBsYXllcjogXy5tZXJnZSh0aGlzLmNyZWF0ZUJsYW5rUGxheWVyT2JqZWN0KCksIHRoaXMuY3JlYXRlUGxheWVyUmVzZXRPYmplY3QoKSksXG4gICAgICBxdWVzdGlvbkJhbms6IFtdXG4gICAgfSk7XG5cbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3N0b3JlSW5pdGlhbGl6ZWQnKTtcbiAgfSxcblxuICBjcmVhdGVCbGFua1BsYXllck9iamVjdDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICBpZCAgICAgICAgOiAnJyxcbiAgICAgIHR5cGUgICAgICA6ICcnLFxuICAgICAgbmFtZSAgICAgIDogJ015c3RlcnkgUGxheWVyICcgKyBfbnVtVXRpbHMucm5kTnVtYmVyKDEwMCwgOTk5KSxcbiAgICAgIGFwcGVhcmFuY2U6ICdncmVlbidcbiAgICB9O1xuICB9LFxuXG4gIGNyZWF0ZVBsYXllclJlc2V0T2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhlYWx0aCAgIDogNixcbiAgICAgIGJlaGF2aW9yczogW10sXG4gICAgICBzY29yZSAgICA6IDBcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBNb2RpZnkgc3RhdGUgYmFzZWQgb24gaW5jb21pbmcgZXZlbnRzLiBSZXR1cm5zIGEgY29weSBvZiB0aGUgbW9kaWZpZWRcbiAgICogc3RhdGUgYW5kIGRvZXMgbm90IG1vZGlmeSB0aGUgc3RhdGUgZGlyZWN0bHkuXG4gICAqIENhbiBjb21wb3NlIHN0YXRlIHRyYW5zZm9ybWF0aW9uc1xuICAgKiByZXR1cm4gXy5hc3NpZ24oe30sIHN0YXRlLCBvdGhlclN0YXRlVHJhbnNmb3JtZXIoc3RhdGUpKTtcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBldmVudFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIG1haW5TdGF0ZVJlZHVjZXI6IGZ1bmN0aW9uIChzdGF0ZSwgZXZlbnQpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuXG4gICAgc3dpdGNoIChldmVudC50eXBlKSB7XG4gICAgICBjYXNlIF9ub3JpQWN0aW9uQ29uc3RhbnRzLkNIQU5HRV9TVE9SRV9TVEFURTpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfTE9DQUxfUExBWUVSX1BST1BTOlxuICAgICAgY2FzZSBfYXBwQWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTOlxuICAgICAgY2FzZSBfYXBwQWN0aW9uQ29uc3RhbnRzLlNFVF9TRVNTSU9OX1BST1BTOlxuICAgICAgICByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIGV2ZW50LnBheWxvYWQuZGF0YSk7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS53YXJuKCdSZWR1Y2VyIHN0b3JlLCB1bmhhbmRsZWQgZXZlbnQgdHlwZTogJyArIGV2ZW50LnR5cGUpO1xuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDYWxsZWQgYWZ0ZXIgYWxsIHJlZHVjZXJzIGhhdmUgcnVuIHRvIGJyb2FkY2FzdCBwb3NzaWJsZSB1cGRhdGVzLiBEb2VzXG4gICAqIG5vdCBjaGVjayB0byBzZWUgaWYgdGhlIHN0YXRlIHdhcyBhY3R1YWxseSB1cGRhdGVkLlxuICAgKi9cbiAgaGFuZGxlU3RhdGVNdXRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnModGhpcy5nZXRTdGF0ZSgpKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBTdG9yZSgpOyIsInZhciBfYXBwU3RvcmUgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX21peGluQXBwbGljYXRpb25WaWV3ICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvQXBwbGljYXRpb25WaWV3LmpzJyksXG4gICAgX21peGluTnVkb3J1Q29udHJvbHMgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5OdWRvcnVDb250cm9scy5qcycpLFxuICAgIF9taXhpbkNvbXBvbmVudFZpZXdzICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMnKSxcbiAgICBfbWl4aW5TdG9yZVN0YXRlVmlld3MgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpblN0b3JlU3RhdGVWaWV3cy5qcycpLFxuICAgIF9taXhpbkV2ZW50RGVsZWdhdG9yICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluRXZlbnREZWxlZ2F0b3IuanMnKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcycpO1xuXG4vKipcbiAqIFZpZXcgZm9yIGFuIGFwcGxpY2F0aW9uLlxuICovXG5cbnZhciBBcHBWaWV3ID0gTm9yaS5jcmVhdGVWaWV3KHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5BcHBsaWNhdGlvblZpZXcsXG4gICAgX21peGluTnVkb3J1Q29udHJvbHMsXG4gICAgX21peGluQ29tcG9uZW50Vmlld3MsXG4gICAgX21peGluU3RvcmVTdGF0ZVZpZXdzLFxuICAgIF9taXhpbkV2ZW50RGVsZWdhdG9yKCksXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QoKVxuICBdLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcoWydhcHBsaWNhdGlvbnNjYWZmb2xkJywgJ2FwcGxpY2F0aW9uY29tcG9uZW50c3NjYWZmb2xkJ10pO1xuICAgIHRoaXMuaW5pdGlhbGl6ZVN0YXRlVmlld3MoX2FwcFN0b3JlKTtcbiAgICB0aGlzLmluaXRpYWxpemVOdWRvcnVDb250cm9scygpO1xuXG4gICAgdGhpcy5jb25maWd1cmVWaWV3cygpO1xuICB9LFxuXG4gIGNvbmZpZ3VyZVZpZXdzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNjcmVlblRpdGxlICAgICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLlRpdGxlLmpzJykoKSxcbiAgICAgICAgc2NyZWVuUGxheWVyU2VsZWN0ICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uUGxheWVyU2VsZWN0LmpzJykoKSxcbiAgICAgICAgc2NyZWVuV2FpdGluZ09uUGxheWVyID0gcmVxdWlyZSgnLi9TY3JlZW4uV2FpdGluZ09uUGxheWVyLmpzJykoKSxcbiAgICAgICAgc2NyZWVuTWFpbkdhbWUgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uTWFpbkdhbWUuanMnKSgpLFxuICAgICAgICBzY3JlZW5HYW1lT3ZlciAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5HYW1lT3Zlci5qcycpKCksXG4gICAgICAgIGdhbWVTdGF0ZXMgICAgICAgICAgICA9IF9hcHBTdG9yZS5nYW1lU3RhdGVzO1xuXG4gICAgdGhpcy5zZXRWaWV3TW91bnRQb2ludCgnI2NvbnRlbnRzJyk7XG5cbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbMF0sICd0aXRsZScsIHNjcmVlblRpdGxlKTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbMV0sICdwbGF5ZXJzZWxlY3QnLCBzY3JlZW5QbGF5ZXJTZWxlY3QpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1syXSwgJ3dhaXRpbmdvbnBsYXllcicsIHNjcmVlbldhaXRpbmdPblBsYXllcik7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzNdLCAnZ2FtZScsIHNjcmVlbk1haW5HYW1lKTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbNF0sICdnYW1lb3ZlcicsIHNjcmVlbkdhbWVPdmVyKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBWaWV3KCk7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIHRoaXMuYmluZE1hcChfYXBwU3RvcmUpOyAvLyBSZWR1Y2VyIHN0b3JlLCBtYXAgaWQgc3RyaW5nIG9yIG1hcCBvYmplY3RcbiAgfSxcblxuICBjb25maWd1cmF0aW9uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6ICdnYW1lX19wbGF5ZXJzdGF0cycsXG4gICAgICBtb3VudFBvaW50OiAnI2dhbWVfX2xvY2FscGxheWVyc3RhdHMnXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX2FwcFN0b3JlLmdldFN0YXRlKCkubG9jYWxQbGF5ZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX2FwcFN0b3JlLmdldFN0YXRlKCkubG9jYWxQbGF5ZXI7XG4gIH0sXG5cbiAgdGVtcGxhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaHRtbCA9IF90ZW1wbGF0ZS5nZXRTb3VyY2UoJ2dhbWVfX3BsYXllcnN0YXRzJyk7XG4gICAgcmV0dXJuIF8udGVtcGxhdGUoaHRtbCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsInZhciBfbm9yaUFjdGlvbnMgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yJyksXG4gICAgX2FwcFZpZXcgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3JyksXG4gICAgX2FwcFN0b3JlICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKSxcbiAgICBfdGVtcGxhdGUgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICBfbWl4aW5ET01NYW5pcHVsYXRpb24gPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5ET01NYW5pcHVsYXRpb24uanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5ET01NYW5pcHVsYXRpb25cbiAgXSxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI2dhbWVvdmVyX19idXR0b24tcmVwbGF5JzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgdmFyIHN0YXRlICAgID0ge1xuICAgICAgbmFtZSAgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICBhcHBlYXJhbmNlIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZSxcbiAgICAgIGxvY2FsU2NvcmUgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5zY29yZSxcbiAgICAgIHJlbW90ZVNjb3JlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICBsb2NhbFdpbiAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICByZW1vdGVXaW4gIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPCBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICB0aWVXaW4gICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPT09IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZVxuICAgIH07XG4gICAgY29uc29sZS5sb2coc3RhdGUpO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuXG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fdGllJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fbG9vc2UnKTtcblxuICAgIGlmIChzdGF0ZS5sb2NhbFdpbikge1xuICAgICAgdGhpcy5zaG93RWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5yZW1vdGVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX2xvb3NlJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS50aWVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX3RpZScpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfYXBwQWN0aW9ucyAgICAgICAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9hcHBWaWV3ICAgICAgICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldy5qcycpLFxuICAgIF9hcHBTdG9yZSAgICAgICAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX3NvY2tldElPICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJyksXG4gICAgX3RlbXBsYXRlICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgX3JlZ2lvblBsYXllclN0YXRzID0gcmVxdWlyZSgnLi9SZWdpb24uUGxheWVyU3RhdHMuanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIGRlZmluZVJlZ2lvbnM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBsb2NhbFBsYXllclN0YXRzOiBfcmVnaW9uUGxheWVyU3RhdHMoKVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjZ2FtZV9fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1s0XX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICBjb25zb2xlLmxvZyhhcHBTdGF0ZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxvY2FsIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIsXG4gICAgICByZW1vdGU6IGFwcFN0YXRlLnJlbW90ZVBsYXllclxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qXG4gVE9ET1xuXG4gKi9cblxudmFyIF9yb29tTnVtYmVyTGVuZ3RoID0gNCxcbiAgICBfbm9yaUFjdGlvbnMgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICBfYXBwQWN0aW9ucyAgICAgICA9IHJlcXVpcmUoJy4uL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJyksXG4gICAgX2FwcFZpZXcgICAgICAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcuanMnKSxcbiAgICBfYXBwU3RvcmUgICAgICAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gICAgX3NvY2tldElPICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMnKSxcbiAgICBfdGVtcGxhdGUgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdibHVyICNzZWxlY3RfX3BsYXllcm5hbWUnICAgICAgICA6IHRoaXMuc2V0UGxheWVyTmFtZS5iaW5kKHRoaXMpLFxuICAgICAgJ2NoYW5nZSAjc2VsZWN0X19wbGF5ZXJ0eXBlJyAgICAgIDogdGhpcy5zZXRQbGF5ZXJBcHBlYXJhbmNlLmJpbmQodGhpcyksXG4gICAgICAnY2xpY2sgI3NlbGVjdF9fYnV0dG9uLWpvaW5yb29tJyAgOiB0aGlzLm9uSm9pblJvb20uYmluZCh0aGlzKSxcbiAgICAgICdjbGljayAjc2VsZWN0X19idXR0b24tY3JlYXRlcm9vbSc6IHRoaXMub25DcmVhdGVSb29tLmJpbmQodGhpcyksXG4gICAgICAnY2xpY2sgI3NlbGVjdF9fYnV0dG9uLWdvJyAgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1syXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFBsYXllck5hbWU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBhY3Rpb24gPSBfYXBwQWN0aW9ucy5zZXRMb2NhbFBsYXllclByb3BzKHtcbiAgICAgIG5hbWU6IHZhbHVlXG4gICAgfSk7XG4gICAgX2FwcFN0b3JlLmFwcGx5KGFjdGlvbik7XG4gIH0sXG5cbiAgc2V0UGxheWVyQXBwZWFyYW5jZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGFjdGlvbiA9IF9hcHBBY3Rpb25zLnNldExvY2FsUGxheWVyUHJvcHMoe1xuICAgICAgYXBwZWFyYW5jZTogdmFsdWVcbiAgICB9KTtcbiAgICBfYXBwU3RvcmUuYXBwbHkoYWN0aW9uKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcFN0YXRlID0gX2FwcFN0b3JlLmdldFN0YXRlKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICBhcHBlYXJhbmNlOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5hcHBlYXJhbmNlXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmdldEluaXRpYWxTdGF0ZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJ0eXBlJykudmFsdWUgPSB0aGlzLmdldFN0YXRlKCkuYXBwZWFyYW5jZTtcbiAgfSxcblxuICBvbkNyZWF0ZVJvb206IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVVzZXJEZXRhaWxzSW5wdXQoKSkge1xuICAgICAgX3NvY2tldElPLm5vdGlmeVNlcnZlcihfc29ja2V0SU8uZXZlbnRzKCkuQ1JFQVRFX1JPT00sIHtcbiAgICAgICAgcGxheWVyRGV0YWlsczogX2FwcFN0b3JlLmdldFN0YXRlKCkubG9jYWxQbGF5ZXJcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBvbkpvaW5Sb29tOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJvb21JRCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3RfX3Jvb21pZCcpLnZhbHVlO1xuICAgIGlmICh0aGlzLnZhbGlkYXRlUm9vbUlEKHJvb21JRCkpIHtcbiAgICAgIF9zb2NrZXRJTy5ub3RpZnlTZXJ2ZXIoX3NvY2tldElPLmV2ZW50cygpLkpPSU5fUk9PTSwge1xuICAgICAgICByb29tSUQgICAgICAgOiByb29tSUQsXG4gICAgICAgIHBsYXllckRldGFpbHM6IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLmxvY2FsUGxheWVyXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX2FwcFZpZXcuYWxlcnQoJ1RoZSByb29tIElEIGlzIG5vdCBjb3JyZWN0LiBEb2VzIGl0IGNvbnRhaW4gbGV0dGVycyBvciBpcyBsZXNzIHRoYW4gJytfcm9vbU51bWJlckxlbmd0aCsnIGRpZ2l0cz8nLCAnQmFkIFJvb20gSUQnKTtcbiAgICB9XG4gIH0sXG5cbiAgdmFsaWRhdGVVc2VyRGV0YWlsc0lucHV0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5hbWUgICAgICAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJuYW1lJykudmFsdWUsXG4gICAgICAgIGFwcGVhcmFuY2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19wbGF5ZXJ0eXBlJykudmFsdWU7XG5cbiAgICBpZiAoIW5hbWUubGVuZ3RoIHx8ICFhcHBlYXJhbmNlKSB7XG4gICAgICBfYXBwVmlldy5hbGVydCgnTWFrZSBzdXJlIHlvdVxcJ3ZlIHR5cGVkIGEgbmFtZSBmb3IgeW91cnNlbGYgYW5kIHNlbGVjdGVkIGFuIGFwcGVhcmFuY2UnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJvb20gSUQgbXVzdCBiZSBhbiBpbnRlZ2VyIGFuZCA1IGRpZ2l0c1xuICAgKiBAcGFyYW0gcm9vbUlEXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgdmFsaWRhdGVSb29tSUQ6IGZ1bmN0aW9uIChyb29tSUQpIHtcbiAgICBpZiAoaXNOYU4ocGFyc2VJbnQocm9vbUlEKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHJvb21JRC5sZW5ndGggIT09IF9yb29tTnVtYmVyTGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyksXG4gICAgX3RlbXBsYXRlICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICN0aXRsZV9fYnV0dG9uLXN0YXJ0JzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IGluaXRpYWwgc3RhdGUgcHJvcGVydGllcy4gQ2FsbCBvbmNlIG9uIGZpcnN0IHJlbmRlclxuICAgKi9cbiAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyksXG4gICAgX3RlbXBsYXRlICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICN3YWl0aW5nX19idXR0b24tc2tpcCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzNdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZSxcbiAgICAgIHJvb21JRCAgICA6IGFwcFN0YXRlLnNlc3Npb24ucm9vbUlEXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZSxcbiAgICAgIHJvb21JRCAgICA6IGFwcFN0YXRlLnNlc3Npb24ucm9vbUlEXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwiLyoqXG4gKiBJbml0aWFsIGZpbGUgZm9yIHRoZSBBcHBsaWNhdGlvblxuICovXG5cbihmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9icm93c2VySW5mbyA9IHJlcXVpcmUoJy4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKTtcblxuICAvKipcbiAgICogSUUgdmVyc2lvbnMgOSBhbmQgdW5kZXIgYXJlIGJsb2NrZWQsIG90aGVycyBhcmUgYWxsb3dlZCB0byBwcm9jZWVkXG4gICAqL1xuICBpZihfYnJvd3NlckluZm8ubm90U3VwcG9ydGVkIHx8IF9icm93c2VySW5mby5pc0lFOSkge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKS5pbm5lckhUTUwgPSAnPGgzPkZvciB0aGUgYmVzdCBleHBlcmllbmNlLCBwbGVhc2UgdXNlIEludGVybmV0IEV4cGxvcmVyIDEwKywgRmlyZWZveCwgQ2hyb21lIG9yIFNhZmFyaSB0byB2aWV3IHRoaXMgYXBwbGljYXRpb24uPC9oMz4nO1xuICB9IGVsc2Uge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHRoZSBhcHBsaWNhdGlvbiBtb2R1bGUgYW5kIGluaXRpYWxpemVcbiAgICAgKi9cbiAgICB3aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICB3aW5kb3cuTm9yaSA9IHJlcXVpcmUoJy4vbm9yaS9Ob3JpLmpzJyk7XG4gICAgICB3aW5kb3cuQVBQID0gcmVxdWlyZSgnLi9hcHAvQXBwLmpzJyk7XG4gICAgICBBUFAuaW5pdGlhbGl6ZSgpO1xuICAgIH07XG5cbiAgfVxuXG59KCkpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxudmFyIE5vcmkgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9kaXNwYXRjaGVyID0gcmVxdWlyZSgnLi91dGlscy9EaXNwYXRjaGVyLmpzJyksXG4gICAgICBfcm91dGVyICAgICA9IHJlcXVpcmUoJy4vdXRpbHMvUm91dGVyLmpzJyk7XG5cbiAgLy8gU3dpdGNoIExvZGFzaCB0byB1c2UgTXVzdGFjaGUgc3R5bGUgdGVtcGxhdGVzXG4gIF8udGVtcGxhdGVTZXR0aW5ncy5pbnRlcnBvbGF0ZSA9IC97eyhbXFxzXFxTXSs/KX19L2c7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZnVuY3Rpb24gZ2V0RGlzcGF0Y2hlcigpIHtcbiAgICByZXR1cm4gX2Rpc3BhdGNoZXI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSb3V0ZXIoKSB7XG4gICAgcmV0dXJuIF9yb3V0ZXI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCAod2luZG93LkFQUF9DT05GSUdfREFUQSB8fCB7fSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFJvdXRlKCkge1xuICAgIHJldHVybiBfcm91dGVyLmdldEN1cnJlbnRSb3V0ZSgpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBGYWN0b3JpZXMgLSBjb25jYXRlbmF0aXZlIGluaGVyaXRhbmNlLCBkZWNvcmF0b3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBNZXJnZXMgYSBjb2xsZWN0aW9uIG9mIG9iamVjdHNcbiAgICogQHBhcmFtIHRhcmdldFxuICAgKiBAcGFyYW0gc291cmNlQXJyYXlcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc3NpZ25BcnJheSh0YXJnZXQsIHNvdXJjZUFycmF5KSB7XG4gICAgc291cmNlQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICB0YXJnZXQgPSBfLmFzc2lnbih0YXJnZXQsIHNvdXJjZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgTm9yaSBhcHBsaWNhdGlvbiBpbnN0YW5jZVxuICAgKiBAcGFyYW0gY3VzdG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQXBwbGljYXRpb24oY3VzdG9tKSB7XG4gICAgY3VzdG9tLm1peGlucy5wdXNoKHRoaXMpO1xuICAgIHJldHVybiBidWlsZEZyb21NaXhpbnMoY3VzdG9tKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIG1haW4gYXBwbGljYXRpb24gc3RvcmVcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVN0b3JlKGN1c3RvbSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBjcygpIHtcbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSkpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBtYWluIGFwcGxpY2F0aW9uIHZpZXdcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVZpZXcoY3VzdG9tKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGN2KCkge1xuICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBidWlsZEZyb21NaXhpbnMoY3VzdG9tKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNaXhlcyBpbiB0aGUgbW9kdWxlcyBzcGVjaWZpZWQgaW4gdGhlIGN1c3RvbSBhcHBsaWNhdGlvbiBvYmplY3RcbiAgICogQHBhcmFtIHNvdXJjZU9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGJ1aWxkRnJvbU1peGlucyhzb3VyY2VPYmplY3QpIHtcbiAgICB2YXIgbWl4aW5zO1xuXG4gICAgaWYgKHNvdXJjZU9iamVjdC5taXhpbnMpIHtcbiAgICAgIG1peGlucyA9IHNvdXJjZU9iamVjdC5taXhpbnM7XG4gICAgfVxuXG4gICAgbWl4aW5zLnB1c2goc291cmNlT2JqZWN0KTtcbiAgICByZXR1cm4gYXNzaWduQXJyYXkoe30sIG1peGlucyk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGNvbmZpZyAgICAgICAgICAgOiBnZXRDb25maWcsXG4gICAgZGlzcGF0Y2hlciAgICAgICA6IGdldERpc3BhdGNoZXIsXG4gICAgcm91dGVyICAgICAgICAgICA6IGdldFJvdXRlcixcbiAgICBjcmVhdGVBcHBsaWNhdGlvbjogY3JlYXRlQXBwbGljYXRpb24sXG4gICAgY3JlYXRlU3RvcmUgICAgICA6IGNyZWF0ZVN0b3JlLFxuICAgIGNyZWF0ZVZpZXcgICAgICAgOiBjcmVhdGVWaWV3LFxuICAgIGJ1aWxkRnJvbU1peGlucyAgOiBidWlsZEZyb21NaXhpbnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBhc3NpZ25BcnJheSAgICAgIDogYXNzaWduQXJyYXlcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3JpKCk7XG5cblxuIiwiLyogQGZsb3cgd2VhayAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQ0hBTkdFX1NUT1JFX1NUQVRFOiAnQ0hBTkdFX1NUT1JFX1NUQVRFJ1xufTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWN0aW9uIENyZWF0b3JcbiAqIEJhc2VkIG9uIEZsdXggQWN0aW9uc1xuICogRm9yIG1vcmUgaW5mb3JtYXRpb24gYW5kIGd1aWRlbGluZXM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBfbm9yaUFjdGlvbkNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQWN0aW9uQ29uc3RhbnRzLmpzJyk7XG5cbnZhciBOb3JpQWN0aW9uQ3JlYXRvciA9IHtcblxuICBjaGFuZ2VTdG9yZVN0YXRlOiBmdW5jdGlvbiAoZGF0YSwgaWQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX25vcmlBY3Rpb25Db25zdGFudHMuQ0hBTkdFX1NUT1JFX1NUQVRFLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBpZCAgOiBpZCxcbiAgICAgICAgZGF0YTogZGF0YVxuICAgICAgfVxuICAgIH07XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3JpQWN0aW9uQ3JlYXRvcjsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWpheCAvIFJlc3QgbW9kdWxlLlxuICogUmV0dXJucyBhbiBSeEpTIE9iZXJ2YWJsZVxuICpcbiAqIFVzYWdlOlxuICpcbiB2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vbm9yaS9zZXJ2aWNlL1Jlc3QnKTtcblxuIHZhciBnZXRTdWIgPSByZXF1ZXN0LnJlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICB1cmwgICA6ICcvaXRlbXMnLFxuICAgICAgICBoZWFkZXJzOiBbeydrZXknOid2YWx1ZSd9XSxcbiAgICAgICAganNvbiAgOiB0cnVlXG4gICAgICB9KS5zdWJzY3JpYmUoXG4gZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICAgIH0sXG4gZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiB2YXIgcG9zdFN1YiA9IHJlcXVlc3QucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICB1cmwgICA6ICcvaXRlbXMnLFxuICAgICAgICBkYXRhICA6IEpTT04uc3RyaW5naWZ5KHtrZXk6ICd2YWx1ZSd9KSxcbiAgICAgICAganNvbiAgOiB0cnVlXG4gICAgICB9KS5zdWJzY3JpYmUoXG4gZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICAgIH0sXG4gZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiB2YXIgcHV0U3ViID0gcmVxdWVzdC5yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgdXJsICAgOiAnL2l0ZW1zLzQyJyxcbiAgICAgICAgZGF0YSAgOiBKU09OLnN0cmluZ2lmeSh7a2V5OiAndmFsdWUnfSksXG4gICAgICAgIGpzb24gIDogdHJ1ZVxuICAgICAgfSkuc3Vic2NyaWJlKFxuIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgICAgICB9LFxuIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gdmFyIGRlbFN1YiA9IHJlcXVlc3QucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIHVybCAgIDogJy9pdGVtcy80MicsXG4gICAgICAgIGpzb24gIDogdHJ1ZVxuICAgICAgfSkuc3Vic2NyaWJlKFxuIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgICAgICB9LFxuIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICAgIH0pO1xuICpcbiAqL1xuXG52YXIgUmVzdCA9IGZ1bmN0aW9uICgpIHtcblxuICBmdW5jdGlvbiByZXF1ZXN0KHJlcU9iaikge1xuXG4gICAgdmFyIHhociAgICAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKSxcbiAgICAgICAganNvbiAgICA9IHJlcU9iai5qc29uIHx8IGZhbHNlLFxuICAgICAgICBtZXRob2QgID0gcmVxT2JqLm1ldGhvZC50b1VwcGVyQ2FzZSgpIHx8ICdHRVQnLFxuICAgICAgICB1cmwgICAgID0gcmVxT2JqLnVybCxcbiAgICAgICAgaGVhZGVycyA9IHJlcU9iai5oZWFkZXJzIHx8IFtdLFxuICAgICAgICBkYXRhICAgID0gcmVxT2JqLmRhdGEgfHwgbnVsbDtcblxuICAgIHJldHVybiBuZXcgUnguT2JzZXJ2YWJsZS5jcmVhdGUoZnVuY3Rpb24gbWFrZVJlcShvYnNlcnZlcikge1xuICAgICAgeGhyLm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuXG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWYgKGpzb24pIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcih4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgaGFuZGxlRXJyb3IoJ1Jlc3VsdCcsICdFcnJvciBwYXJzaW5nIHJlc3VsdC4gU3RhdHVzOiAnICsgeGhyLnN0YXR1cyArICcsIFJlc3BvbnNlOiAnICsgeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGFuZGxlRXJyb3IoeGhyLnN0YXR1cywgeGhyLnN0YXR1c1RleHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgeGhyLm9uZXJyb3IgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaGFuZGxlRXJyb3IoJ05ldHdvcmsgZXJyb3InKTtcbiAgICAgIH07XG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBoYW5kbGVFcnJvcignVGltZW91dCcpO1xuICAgICAgfTtcbiAgICAgIHhoci5vbmFib3J0ICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGhhbmRsZUVycm9yKCdBYm91dCcpO1xuICAgICAgfTtcblxuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uIChoZWFkZXJQYWlyKSB7XG4gICAgICAgIHZhciBwcm9wID0gT2JqZWN0LmtleXMoaGVhZGVyUGFpcilbMF0sXG4gICAgICAgICAgICB2YWx1ZSA9IGhlYWRlclBhaXJbcHJvcF07XG4gICAgICAgIGlmIChwcm9wICYmIHZhbHVlKSB7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIocHJvcCwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zZXJ2aWNlL3Jlc3QsIGJhZCBoZWFkZXIgcGFpcjogJywgaGVhZGVyUGFpcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBzZXQgbm9uIGpzb24gaGVhZGVyPyAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04J1xuICAgICAgaWYgKGpzb24gJiYgbWV0aG9kICE9PSBcIkdFVFwiKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICAgIH0gZWxzZSBpZiAoanNvbiAmJiBtZXRob2QgPT09IFwiR0VUXCIpIHtcbiAgICAgICAgLy8sIHRleHQvKlxuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkFjY2VwdFwiLCBcImFwcGxpY2F0aW9uL2pzb247IG9kYXRhPXZlcmJvc2VcIik7ICAvLyBvZGF0YSBwYXJhbSBmb3IgU2hhcmVwb2ludFxuICAgICAgfVxuXG4gICAgICB4aHIuc2VuZChkYXRhKTtcblxuICAgICAgZnVuY3Rpb24gaGFuZGxlRXJyb3IodHlwZSwgbWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZSB8fCAnJztcbiAgICAgICAgb2JzZXJ2ZXIub25FcnJvcih0eXBlICsgJyAnICsgbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXN0KCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG52YXIgU29ja2V0SU9Db25uZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0ICA9IG5ldyBSeC5CZWhhdmlvclN1YmplY3QoKSxcbiAgICAgIF9zb2NrZXRJTyA9IGlvKCksXG4gICAgICBfbG9nICAgICAgPSBbXSxcbiAgICAgIF9jb25uZWN0aW9uSUQsXG4gICAgICBfZXZlbnRzICAgPSByZXF1aXJlKCcuL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIF9zb2NrZXRJTy5vbihfZXZlbnRzLk5PVElGWV9DTElFTlQsIG9uTm90aWZ5Q2xpZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgbm90aWZpY2F0aW9ucyBmcm9tIFNvY2tldC5pbyBjb21lIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWQge3R5cGUsIGlkLCB0aW1lLCBwYXlsb2FkfVxuICAgKi9cbiAgZnVuY3Rpb24gb25Ob3RpZnlDbGllbnQocGF5bG9hZCkge1xuICAgIF9sb2cucHVzaChwYXlsb2FkKTtcblxuICAgIGlmIChwYXlsb2FkLnR5cGUgPT09IF9ldmVudHMuUElORykge1xuICAgICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUE9ORywge30pO1xuICAgIH0gZWxzZSBpZiAocGF5bG9hZC50eXBlID09PSBfZXZlbnRzLlBPTkcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTT0NLRVQuSU8gUE9ORyEnKTtcbiAgICB9IGVsc2UgaWYgKHBheWxvYWQudHlwZSA9PT0gX2V2ZW50cy5DT05ORUNUKSB7XG4gICAgICBfY29ubmVjdGlvbklEID0gcGF5bG9hZC5pZDtcbiAgICB9XG4gICAgbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCk7XG4gIH1cblxuICBmdW5jdGlvbiBwaW5nKCkge1xuICAgIG5vdGlmeVNlcnZlcihfZXZlbnRzLlBJTkcsIHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgY29tbXVuaWNhdGlvbnMgdG8gdGhlIHNlcnZlciBzaG91bGQgZ28gdGhyb3VnaCBoZXJlXG4gICAqIEBwYXJhbSB0eXBlXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTZXJ2ZXIodHlwZSwgcGF5bG9hZCkge1xuICAgIF9zb2NrZXRJTy5lbWl0KF9ldmVudHMuTk9USUZZX1NFUlZFUiwge1xuICAgICAgdHlwZSAgICAgICAgOiB0eXBlLFxuICAgICAgY29ubmVjdGlvbklEOiBfY29ubmVjdGlvbklELFxuICAgICAgcGF5bG9hZCAgICAgOiBwYXlsb2FkXG4gICAgfSk7XG4gIH1cblxuICAvL2Z1bmN0aW9uIGVtaXQobWVzc2FnZSwgcGF5bG9hZCkge1xuICAvLyAgbWVzc2FnZSA9IG1lc3NhZ2UgfHwgX2V2ZW50cy5NRVNTQUdFO1xuICAvLyAgcGF5bG9hZCA9IHBheWxvYWQgfHwge307XG4gIC8vICBfc29ja2V0SU8uZW1pdChtZXNzYWdlLCBwYXlsb2FkKTtcbiAgLy99XG4gIC8vXG4gIC8vZnVuY3Rpb24gb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgLy8gIF9zb2NrZXRJTy5vbihldmVudCwgaGFuZGxlcik7XG4gIC8vfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgaGFuZGxlciB0byB1cGRhdGVzXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3N1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBmcm9tIHVwZGF0ZSBvciB3aGF0ZXZlciBmdW5jdGlvbiB0byBkaXNwYXRjaCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIF9zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBsYXN0IHBheWxvYWQgdGhhdCB3YXMgZGlzcGF0Y2hlZCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExhc3ROb3RpZmljYXRpb24oKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LmdldFZhbHVlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRFdmVudENvbnN0YW50cygpIHtcbiAgICByZXR1cm4gXy5hc3NpZ24oe30sIF9ldmVudHMpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBldmVudHMgICAgICAgICAgICAgOiBnZXRFdmVudENvbnN0YW50cyxcbiAgICBpbml0aWFsaXplICAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHBpbmcgICAgICAgICAgICAgICA6IHBpbmcsXG4gICAgbm90aWZ5U2VydmVyICAgICAgIDogbm90aWZ5U2VydmVyLFxuICAgIHN1YnNjcmliZSAgICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVycyAgOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRMYXN0Tm90aWZpY2F0aW9uOiBnZXRMYXN0Tm90aWZpY2F0aW9uXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU29ja2V0SU9Db25uZWN0b3IoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBQSU5HICAgICAgICAgICAgIDogJ3BpbmcnLFxuICBQT05HICAgICAgICAgICAgIDogJ3BvbmcnLFxuICBOT1RJRllfQ0xJRU5UICAgIDogJ25vdGlmeV9jbGllbnQnLFxuICBOT1RJRllfU0VSVkVSICAgIDogJ25vdGlmeV9zZXJ2ZXInLFxuICBDT05ORUNUICAgICAgICAgIDogJ2Nvbm5lY3QnLFxuICBEUk9QUEVEICAgICAgICAgIDogJ2Ryb3BwZWQnLFxuICBVU0VSX0NPTk5FQ1RFRCAgIDogJ3VzZXJfY29ubmVjdGVkJyxcbiAgVVNFUl9ESVNDT05ORUNURUQ6ICd1c2VyX2Rpc2Nvbm5lY3RlZCcsXG4gIEVNSVQgICAgICAgICAgICAgOiAnZW1pdCcsXG4gIEJST0FEQ0FTVCAgICAgICAgOiAnYnJvYWRjYXN0JyxcbiAgU1lTVEVNX01FU1NBR0UgICA6ICdzeXN0ZW1fbWVzc2FnZScsXG4gIE1FU1NBR0UgICAgICAgICAgOiAnbWVzc2FnZScsXG4gIENSRUFURV9ST09NICAgICAgOiAnY3JlYXRlX3Jvb20nLFxuICBKT0lOX1JPT00gICAgICAgIDogJ2pvaW5fcm9vbScsXG4gIExFQVZFX1JPT00gICAgICAgOiAnbGVhdmVfcm9vbScsXG4gIEdBTUVfU1RBUlQgICAgICAgOiAnZ2FtZV9zdGFydCcsXG4gIEdBTUVfRU5EICAgICAgICAgOiAnZ2FtZV9lbmQnLFxuICBHQU1FX0FCT1JUICAgICAgIDogJ2dhbWVfYWJvcnQnXG59OyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBXcmFwcyBJbW11dGFibGUuanMncyBNYXAgaW4gdGhlIHNhbWUgc3ludGF4IGFzIHRoZSBTaW1wbGVTdG9yZSBtb2R1bGVcbiAqXG4gKiBWaWV3IERvY3MgaHR0cDovL2ZhY2Vib29rLmdpdGh1Yi5pby9pbW11dGFibGUtanMvZG9jcy8jL01hcFxuICovXG5cbnZhciBpbW11dGFibGUgPSByZXF1aXJlKCcuLi8uLi92ZW5kb3IvaW1tdXRhYmxlLm1pbi5qcycpO1xuXG52YXIgSW1tdXRhYmxlTWFwID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX21hcCA9IGltbXV0YWJsZS5NYXAoKTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgTWFwIG9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE1hcCgpIHtcbiAgICByZXR1cm4gX21hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBzdGF0ZVxuICAgKiBAcmV0dXJucyB7dm9pZHwqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gICAgcmV0dXJuIF9tYXAudG9KUygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBuZXh0XG4gICAqL1xuICBmdW5jdGlvbiBzZXRTdGF0ZShuZXh0KSB7XG4gICAgX21hcCA9IF9tYXAubWVyZ2UobmV4dCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGdldFN0YXRlOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZTogc2V0U3RhdGUsXG4gICAgZ2V0TWFwICA6IGdldE1hcFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEltbXV0YWJsZU1hcDsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gZm9yIE5vcmkgc3RvcmVzIHRvIGFkZCBmdW5jdGlvbmFsaXR5IHNpbWlsYXIgdG8gUmVkdXgnIFJlZHVjZXIgYW5kIHNpbmdsZVxuICogb2JqZWN0IHN0YXRlIHRyZWUgY29uY2VwdC4gTWl4aW4gc2hvdWxkIGJlIGNvbXBvc2VkIHRvIG5vcmkvc3RvcmUvQXBwbGljYXRpb25TdG9yZVxuICogZHVyaW5nIGNyZWF0aW9uIG9mIG1haW4gQXBwU3RvcmVcbiAqXG4gKiBodHRwczovL2dhZWFyb24uZ2l0aHViLmlvL3JlZHV4L2RvY3MvYXBpL1N0b3JlLmh0bWxcbiAqIGh0dHBzOi8vZ2FlYXJvbi5naXRodWIuaW8vcmVkdXgvZG9jcy9iYXNpY3MvUmVkdWNlcnMuaHRtbFxuICpcbiAqIENyZWF0ZWQgOC8xMy8xNVxuICovXG52YXIgTWl4aW5SZWR1Y2VyU3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfdGhpcyxcbiAgICAgIF9zdGF0ZSxcbiAgICAgIF9zdGF0ZVJlZHVjZXJzID0gW107XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIF9zdGF0ZSBtaWdodCBub3QgZXhpc3QgaWYgc3Vic2NyaWJlcnMgYXJlIGFkZGVkIGJlZm9yZSB0aGlzIHN0b3JlIGlzIGluaXRpYWxpemVkXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICBpZiAoX3N0YXRlKSB7XG4gICAgICByZXR1cm4gX3N0YXRlLmdldFN0YXRlKCk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFN0YXRlKHN0YXRlKSB7XG4gICAgaWYgKCFfLmlzRXF1YWwoc3RhdGUsIF9zdGF0ZSkpIHtcbiAgICAgIF9zdGF0ZS5zZXRTdGF0ZShzdGF0ZSk7XG4gICAgICBfdGhpcy5ub3RpZnlTdWJzY3JpYmVycyh7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0UmVkdWNlcnMocmVkdWNlckFycmF5KSB7XG4gICAgX3N0YXRlUmVkdWNlcnMgPSByZWR1Y2VyQXJyYXk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRSZWR1Y2VyKHJlZHVjZXIpIHtcbiAgICBfc3RhdGVSZWR1Y2Vycy5wdXNoKHJlZHVjZXIpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0XG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgZXZlbnQgbGlzdGVuZXIvcmVjZWl2ZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKSB7XG4gICAgaWYgKCF0aGlzLmNyZWF0ZVN1YmplY3QpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZSBuZWVkcyBub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QgdG8gbm90aWZ5Jyk7XG4gICAgfVxuXG4gICAgX3RoaXMgID0gdGhpcztcbiAgICBfc3RhdGUgPSByZXF1aXJlKCcuL0ltbXV0YWJsZU1hcC5qcycpKCk7XG5cbiAgICBpZiAoIV9zdGF0ZVJlZHVjZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZHVjZXJTdG9yZSwgbXVzdCBzZXQgYSByZWR1Y2VyIGJlZm9yZSBpbml0aWFsaXphdGlvbicpO1xuICAgIH1cblxuICAgIC8vIFNldCBpbml0aWFsIHN0YXRlIGZyb20gZW1wdHkgZXZlbnRcbiAgICBhcHBseVJlZHVjZXJzKHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSB0aGUgYWN0aW9uIG9iamVjdCB0byB0aGUgcmVkdWNlcnMgdG8gY2hhbmdlIHN0YXRlXG4gICAqIGFyZSBzZW50IHRvIGFsbCByZWR1Y2VycyB0byB1cGRhdGUgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25PYmpPckFycnkgQXJyYXkgb2YgYWN0aW9ucyBvciBhIHNpbmdsZSBhY3Rpb24gdG8gcmVkdWNlIGZyb21cbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5KGFjdGlvbk9iak9yQXJyeSkge1xuICAgIGlmKGlzLmFycmF5KGFjdGlvbk9iak9yQXJyeSkpIHtcbiAgICAgIGFjdGlvbk9iak9yQXJyeS5mb3JFYWNoKGFjdGlvbk9iaiA9PiBhcHBseVJlZHVjZXJzKGFjdGlvbk9iaikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcHBseVJlZHVjZXJzKGFjdGlvbk9iak9yQXJyeSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmplY3QpIHtcbiAgICB2YXIgbmV4dFN0YXRlID0gYXBwbHlSZWR1Y2Vyc1RvU3RhdGUoZ2V0U3RhdGUoKSwgYWN0aW9uT2JqZWN0KTtcbiAgICBzZXRTdGF0ZShuZXh0U3RhdGUpO1xuICAgIF90aGlzLmhhbmRsZVN0YXRlTXV0YXRpb24oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBUEkgaG9vayB0byBoYW5kbGUgc3RhdGUgdXBkYXRlc1xuICAgKi9cbiAgZnVuY3Rpb24gaGFuZGxlU3RhdGVNdXRhdGlvbigpIHtcbiAgICAvLyBvdmVycmlkZSB0aGlzXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBzdGF0ZSBmcm9tIHRoZSBjb21iaW5lZCByZWR1Y2VzIGFuZCBhY3Rpb24gb2JqZWN0XG4gICAqIFN0b3JlIHN0YXRlIGlzbid0IG1vZGlmaWVkLCBjdXJyZW50IHN0YXRlIGlzIHBhc3NlZCBpbiBhbmQgbXV0YXRlZCBzdGF0ZSByZXR1cm5lZFxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICogQHBhcmFtIGFjdGlvblxuICAgKiBAcmV0dXJucyB7Knx7fX1cbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnNUb1N0YXRlKHN0YXRlLCBhY3Rpb24pIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIC8vIFRPRE8gc2hvdWxkIHRoaXMgYWN0dWFsbHkgdXNlIGFycmF5LnJlZHVjZSgpP1xuICAgIF9zdGF0ZVJlZHVjZXJzLmZvckVhY2goZnVuY3Rpb24gYXBwbHlTdGF0ZVJlZHVjZXJGdW5jdGlvbihyZWR1Y2VyRnVuYykge1xuICAgICAgc3RhdGUgPSByZWR1Y2VyRnVuYyhzdGF0ZSwgYWN0aW9uKTtcbiAgICB9KTtcbiAgICByZXR1cm4gc3RhdGU7XG4gIH1cblxuICAvKipcbiAgICogVGVtcGxhdGUgcmVkdWNlciBmdW5jdGlvblxuICAgKiBTdG9yZSBzdGF0ZSBpc24ndCBtb2RpZmllZCwgY3VycmVudCBzdGF0ZSBpcyBwYXNzZWQgaW4gYW5kIG11dGF0ZWQgc3RhdGUgcmV0dXJuZWRcblxuICAgZnVuY3Rpb24gdGVtcGxhdGVSZWR1Y2VyRnVuY3Rpb24oc3RhdGUsIGV2ZW50KSB7XG4gICAgICAgIHN0YXRlID0gc3RhdGUgfHwge307XG4gICAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuICAgICAgICAgIGNhc2UgX25vcmlBY3Rpb25Db25zdGFudHMuTU9ERUxfREFUQV9DSEFOR0VEOlxuICAgICAgICAgICAgLy8gY2FuIGNvbXBvc2Ugb3RoZXIgcmVkdWNlcnNcbiAgICAgICAgICAgIC8vIHJldHVybiBfLm1lcmdlKHt9LCBzdGF0ZSwgb3RoZXJTdGF0ZVRyYW5zZm9ybWVyKHN0YXRlKSk7XG4gICAgICAgICAgICByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIHtwcm9wOiBldmVudC5wYXlsb2FkLnZhbHVlfSk7XG4gICAgICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUmVkdWNlciBzdG9yZSwgdW5oYW5kbGVkIGV2ZW50IHR5cGU6ICcrZXZlbnQudHlwZSk7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICovXG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplUmVkdWNlclN0b3JlOiBpbml0aWFsaXplUmVkdWNlclN0b3JlLFxuICAgIGdldFN0YXRlICAgICAgICAgICAgICA6IGdldFN0YXRlLFxuICAgIHNldFN0YXRlICAgICAgICAgICAgICA6IHNldFN0YXRlLFxuICAgIGFwcGx5ICAgICAgICAgICAgICAgICA6IGFwcGx5LFxuICAgIHNldFJlZHVjZXJzICAgICAgICAgICA6IHNldFJlZHVjZXJzLFxuICAgIGFkZFJlZHVjZXIgICAgICAgICAgICA6IGFkZFJlZHVjZXIsXG4gICAgYXBwbHlSZWR1Y2VycyAgICAgICAgIDogYXBwbHlSZWR1Y2VycyxcbiAgICBhcHBseVJlZHVjZXJzVG9TdGF0ZSAgOiBhcHBseVJlZHVjZXJzVG9TdGF0ZSxcbiAgICBoYW5kbGVTdGF0ZU11dGF0aW9uICAgOiBoYW5kbGVTdGF0ZU11dGF0aW9uXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5SZWR1Y2VyU3RvcmUoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qXG4gTWF0dCBQZXJraW5zLCA2LzEyLzE1XG5cbiBwdWJsaXNoIHBheWxvYWQgb2JqZWN0XG5cbiB7XG4gdHlwZTogRVZUX1RZUEUsXG4gcGF5bG9hZDoge1xuIGtleTogdmFsdWVcbiB9XG4gfVxuXG4gKi9cbnZhciBEaXNwYXRjaGVyID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfc3ViamVjdE1hcCAgPSB7fSxcbiAgICAgIF9yZWNlaXZlck1hcCA9IHt9LFxuICAgICAgX2lkICAgICAgICAgID0gMCxcbiAgICAgIF9sb2cgICAgICAgICA9IFtdLFxuICAgICAgX3F1ZXVlICAgICAgID0gW10sXG4gICAgICBfdGltZXJPYnNlcnZhYmxlLFxuICAgICAgX3RpbWVyU3Vic2NyaXB0aW9uLFxuICAgICAgX3RpbWVyUGF1c2FibGU7XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBldmVudCBhcyBvYnNlcnZhYmxlXG4gICAqIEBwYXJhbSBldnRTdHIgRXZlbnQgbmFtZSBzdHJpbmdcbiAgICogQHBhcmFtIGhhbmRsZXIgb25OZXh0KCkgc3Vic2NyaXB0aW9uIGZ1bmN0aW9uXG4gICAqIEBwYXJhbSBvbmNlT3JDb250ZXh0IG9wdGlvbmFsLCBlaXRoZXIgdGhlIGNvbnRleHQgdG8gZXhlY3V0ZSB0aGUgaGFuZGVyIG9yIG9uY2UgYm9vbFxuICAgKiBAcGFyYW0gb25jZSB3aWxsIGNvbXBsZXRlL2Rpc3Bvc2UgYWZ0ZXIgb25lIGZpcmVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoZXZ0U3RyLCBoYW5kbGVyLCBvbmNlT3JDb250ZXh0LCBvbmNlKSB7XG4gICAgdmFyIGhhbmRsZXJDb250ZXh0ID0gd2luZG93O1xuXG4gICAgLy9jb25zb2xlLmxvZygnZGlzcGF0Y2hlciBzdWJzY3JpYmUnLCBldnRTdHIsIGhhbmRsZXIsIG9uY2VPckNvbnRleHQsIG9uY2UpO1xuXG4gICAgaWYgKGlzLmZhbHNleShldnRTdHIpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Rpc3BhdGNoZXI6IEZhc2xleSBldmVudCBzdHJpbmcgcGFzc2VkIGZvciBoYW5kbGVyJywgaGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKGlzLmZhbHNleShoYW5kbGVyKSkge1xuICAgICAgY29uc29sZS53YXJuKCdEaXNwYXRjaGVyOiBGYXNsZXkgaGFuZGxlciBwYXNzZWQgZm9yIGV2ZW50IHN0cmluZycsIGV2dFN0cik7XG4gICAgfVxuXG4gICAgaWYgKG9uY2VPckNvbnRleHQgfHwgb25jZU9yQ29udGV4dCA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChvbmNlT3JDb250ZXh0ID09PSB0cnVlIHx8IG9uY2VPckNvbnRleHQgPT09IGZhbHNlKSB7XG4gICAgICAgIG9uY2UgPSBvbmNlT3JDb250ZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGFuZGxlckNvbnRleHQgPSBvbmNlT3JDb250ZXh0O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghX3N1YmplY3RNYXBbZXZ0U3RyXSkge1xuICAgICAgX3N1YmplY3RNYXBbZXZ0U3RyXSA9IFtdO1xuICAgIH1cblxuICAgIHZhciBzdWJqZWN0ID0gbmV3IFJ4LlN1YmplY3QoKTtcblxuICAgIF9zdWJqZWN0TWFwW2V2dFN0cl0ucHVzaCh7XG4gICAgICBvbmNlICAgIDogb25jZSxcbiAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgaGFuZGxlciA6IGhhbmRsZXIsXG4gICAgICBjb250ZXh0IDogaGFuZGxlckNvbnRleHQsXG4gICAgICBzdWJqZWN0IDogc3ViamVjdCxcbiAgICAgIHR5cGUgICAgOiAwXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlci5iaW5kKGhhbmRsZXJDb250ZXh0KSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0aGUgZXZlbnQgcHJvY2Vzc2luZyB0aW1lciBvciByZXN1bWUgYSBwYXVzZWQgdGltZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRUaW1lcigpIHtcbiAgICBpZiAoX3RpbWVyT2JzZXJ2YWJsZSkge1xuICAgICAgX3RpbWVyUGF1c2FibGUub25OZXh0KHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF90aW1lclBhdXNhYmxlICAgICA9IG5ldyBSeC5TdWJqZWN0KCk7XG4gICAgX3RpbWVyT2JzZXJ2YWJsZSAgID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbCgxKS5wYXVzYWJsZShfdGltZXJQYXVzYWJsZSk7XG4gICAgX3RpbWVyU3Vic2NyaXB0aW9uID0gX3RpbWVyT2JzZXJ2YWJsZS5zdWJzY3JpYmUocHJvY2Vzc05leHRFdmVudCk7XG4gIH1cblxuICAvKipcbiAgICogU2hpZnQgbmV4dCBldmVudCB0byBoYW5kbGUgb2ZmIG9mIHRoZSBxdWV1ZSBhbmQgZGlzcGF0Y2ggaXRcbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NOZXh0RXZlbnQoKSB7XG4gICAgdmFyIGV2dCA9IF9xdWV1ZS5zaGlmdCgpO1xuICAgIGlmIChldnQpIHtcbiAgICAgIGRpc3BhdGNoVG9SZWNlaXZlcnMoZXZ0KTtcbiAgICAgIGRpc3BhdGNoVG9TdWJzY3JpYmVycyhldnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfdGltZXJQYXVzYWJsZS5vbk5leHQoZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQdXNoIGV2ZW50IHRvIHRoZSBzdGFjayBhbmQgYmVnaW4gZXhlY3V0aW9uXG4gICAqIEBwYXJhbSBwYXlsb2FkT2JqIHR5cGU6U3RyaW5nLCBwYXlsb2FkOmRhdGFcbiAgICogQHBhcmFtIGRhdGFcbiAgICovXG4gIGZ1bmN0aW9uIHB1Ymxpc2gocGF5bG9hZE9iaikge1xuICAgIF9sb2cucHVzaChwYXlsb2FkT2JqKTtcbiAgICBfcXVldWUucHVzaChwYXlsb2FkT2JqKTtcblxuICAgIGluaXRUaW1lcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgdGhlIHBheWxvYWQgdG8gYWxsIHJlY2VpdmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2hUb1JlY2VpdmVycyhwYXlsb2FkKSB7XG4gICAgZm9yICh2YXIgaWQgaW4gX3JlY2VpdmVyTWFwKSB7XG4gICAgICBfcmVjZWl2ZXJNYXBbaWRdLmhhbmRsZXIocGF5bG9hZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXJzIHJlY2VpdmUgYWxsIHBheWxvYWRzIGZvciBhIGdpdmVuIGV2ZW50IHR5cGUgd2hpbGUgaGFuZGxlcnMgYXJlIHRhcmdldGVkXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaFRvU3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIHZhciBzdWJzY3JpYmVycyA9IF9zdWJqZWN0TWFwW3BheWxvYWQudHlwZV0sIGk7XG4gICAgaWYgKCFzdWJzY3JpYmVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGkgPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgc3Viak9iaiA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgaWYgKHN1YmpPYmoudHlwZSA9PT0gMCkge1xuICAgICAgICBzdWJqT2JqLnN1YmplY3Qub25OZXh0KHBheWxvYWQpO1xuICAgICAgfVxuICAgICAgaWYgKHN1YmpPYmoub25jZSkge1xuICAgICAgICB1bnN1YnNjcmliZShwYXlsb2FkLnR5cGUsIHN1YmpPYmouaGFuZGxlcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGhhbmRsZXJcbiAgICogQHBhcmFtIGV2dFN0clxuICAgKiBAcGFyYW0gaGFuZGVyXG4gICAqL1xuICBmdW5jdGlvbiB1bnN1YnNjcmliZShldnRTdHIsIGhhbmRsZXIpIHtcbiAgICBpZiAoX3N1YmplY3RNYXBbZXZ0U3RyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHN1YnNjcmliZXJzID0gX3N1YmplY3RNYXBbZXZ0U3RyXSxcbiAgICAgICAgaGFuZGxlcklkeCAgPSAtMTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdWJzY3JpYmVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHN1YnNjcmliZXJzW2ldLmhhbmRsZXIgPT09IGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlcklkeCAgICAgPSBpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXS5zdWJqZWN0Lm9uQ29tcGxldGVkKCk7XG4gICAgICAgIHN1YnNjcmliZXJzW2ldLnN1YmplY3QuZGlzcG9zZSgpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhbmRsZXJJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3Vic2NyaWJlcnMuc3BsaWNlKGhhbmRsZXJJZHgsIDEpO1xuXG4gICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVsZXRlIF9zdWJqZWN0TWFwW2V2dFN0cl07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIGNvcHkgb2YgdGhlIGxvZyBhcnJheVxuICAgKiBAcmV0dXJucyB7QXJyYXkuPFQ+fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TG9nKCkge1xuICAgIHJldHVybiBfbG9nLnNsaWNlKDApO1xuICB9XG5cblxuICAvKipcbiAgICogU2ltcGxlIHJlY2VpdmVyIGltcGxlbWVudGF0aW9uIGJhc2VkIG9uIEZsdXhcbiAgICogUmVnaXN0ZXJlZCByZWNlaXZlcnMgd2lsbCBnZXQgZXZlcnkgcHVibGlzaGVkIGV2ZW50XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9mbHV4L2Jsb2IvbWFzdGVyL3NyYy9EaXNwYXRjaGVyLmpzXG4gICAqXG4gICAqIFVzYWdlOlxuICAgKlxuICAgKiBfZGlzcGF0Y2hlci5yZWdpc3RlclJlY2VpdmVyKGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgICAgKiAgICBjb25zb2xlLmxvZygncmVjZWl2aW5nLCAnLHBheWxvYWQpO1xuICAgICAgICogfSk7XG4gICAqXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3RlclJlY2VpdmVyKGhhbmRsZXIpIHtcbiAgICB2YXIgaWQgICAgICAgICAgID0gJ0lEXycgKyBfaWQrKztcbiAgICBfcmVjZWl2ZXJNYXBbaWRdID0ge1xuICAgICAgaWQgICAgIDogaWQsXG4gICAgICBoYW5kbGVyOiBoYW5kbGVyXG4gICAgfTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSByZWNlaXZlciBoYW5kbGVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gdW5yZWdpc3RlclJlY2VpdmVyKGlkKSB7XG4gICAgaWYgKF9yZWNlaXZlck1hcC5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgIGRlbGV0ZSBfcmVjZWl2ZXJNYXBbaWRdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgdW5zdWJzY3JpYmUgICAgICAgOiB1bnN1YnNjcmliZSxcbiAgICBwdWJsaXNoICAgICAgICAgICA6IHB1Ymxpc2gsXG4gICAgZ2V0TG9nICAgICAgICAgICAgOiBnZXRMb2csXG4gICAgcmVnaXN0ZXJSZWNlaXZlciAgOiByZWdpc3RlclJlY2VpdmVyLFxuICAgIHVucmVnaXN0ZXJSZWNlaXZlcjogdW5yZWdpc3RlclJlY2VpdmVyXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2hlcigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBBZGQgUnhKUyBTdWJqZWN0IHRvIGEgbW9kdWxlLlxuICpcbiAqIEFkZCBvbmUgc2ltcGxlIG9ic2VydmFibGUgc3ViamVjdCBvciBtb3JlIGNvbXBsZXggYWJpbGl0eSB0byBjcmVhdGUgb3RoZXJzIGZvclxuICogbW9yZSBjb21wbGV4IGV2ZW50aW5nIG5lZWRzLlxuICovXG52YXIgTWl4aW5PYnNlcnZhYmxlU3ViamVjdCA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3QgICAgPSBuZXcgUnguU3ViamVjdCgpLFxuICAgICAgX3N1YmplY3RNYXAgPSB7fTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHN1YmplY3RcbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdWJqZWN0KG5hbWUpIHtcbiAgICBpZiAoIV9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXSA9IG5ldyBSeC5TdWJqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBfc3ViamVjdE1hcFtuYW1lXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgaGFuZGxlciB0byB1cGRhdGVzLiBJZiB0aGUgaGFuZGxlciBpcyBhIHN0cmluZywgdGhlIG5ldyBzdWJqZWN0XG4gICAqIHdpbGwgYmUgY3JlYXRlZC5cbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlck9yTmFtZSwgb3B0SGFuZGxlcikge1xuICAgIGlmIChpcy5zdHJpbmcoaGFuZGxlck9yTmFtZSkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVTdWJqZWN0KGhhbmRsZXJPck5hbWUpLnN1YnNjcmliZShvcHRIYW5kbGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyT3JOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIF9zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwYXRjaCB1cGRhdGVkIHRvIG5hbWVkIHN1YnNjcmliZXJzXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVyc09mKG5hbWUsIHBheWxvYWQpIHtcbiAgICBpZiAoX3N1YmplY3RNYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIF9zdWJqZWN0TWFwW25hbWVdLm9uTmV4dChwYXlsb2FkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKCdNaXhpbk9ic2VydmFibGVTdWJqZWN0LCBubyBzdWJzY3JpYmVycyBvZiAnICsgbmFtZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmUgICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgY3JlYXRlU3ViamVjdCAgICAgIDogY3JlYXRlU3ViamVjdCxcbiAgICBub3RpZnlTdWJzY3JpYmVycyAgOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBub3RpZnlTdWJzY3JpYmVyc09mOiBub3RpZnlTdWJzY3JpYmVyc09mXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5PYnNlcnZhYmxlU3ViamVjdDsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogVXRpbGl0eSB0byBoYW5kbGUgYWxsIHZpZXcgRE9NIGF0dGFjaG1lbnQgdGFza3NcbiAqL1xuXG52YXIgUmVuZGVyZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfZG9tVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIHJlbmRlcihwYXlsb2FkKSB7XG4gICAgdmFyIHRhcmdldFNlbGVjdG9yID0gcGF5bG9hZC50YXJnZXQsXG4gICAgICAgIGh0bWwgICAgICAgICAgID0gcGF5bG9hZC5odG1sLFxuICAgICAgICBkb21FbCxcbiAgICAgICAgbW91bnRQb2ludCAgICAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldFNlbGVjdG9yKSxcbiAgICAgICAgY2IgICAgICAgICAgICAgPSBwYXlsb2FkLmNhbGxiYWNrO1xuXG4gICAgbW91bnRQb2ludC5pbm5lckhUTUwgPSAnJztcblxuICAgIGlmIChodG1sKSB7XG4gICAgICBkb21FbCA9IF9kb21VdGlscy5IVE1MU3RyVG9Ob2RlKGh0bWwpO1xuICAgICAgbW91bnRQb2ludC5hcHBlbmRDaGlsZChkb21FbCk7XG4gICAgfVxuXG4gICAgaWYgKGNiKSB7XG4gICAgICBjYihkb21FbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvbUVsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByZW5kZXI6IHJlbmRlclxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlbmRlcmVyKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFNpbXBsZSByb3V0ZXJcbiAqIFN1cHBvcnRpbmcgSUU5IHNvIHVzaW5nIGhhc2hlcyBpbnN0ZWFkIG9mIHRoZSBoaXN0b3J5IEFQSSBmb3Igbm93XG4gKi9cblxudmFyIFJvdXRlciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3QgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9oYXNoQ2hhbmdlT2JzZXJ2YWJsZSxcbiAgICAgIF9vYmpVdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzJyk7XG5cbiAgLyoqXG4gICAqIFNldCBldmVudCBoYW5kbGVyc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBfaGFzaENoYW5nZU9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh3aW5kb3csICdoYXNoY2hhbmdlJykuc3Vic2NyaWJlKG5vdGlmeVN1YnNjcmliZXJzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzdWJzY3JpYmUgYSBoYW5kbGVyIHRvIHRoZSB1cmwgY2hhbmdlIGV2ZW50c1xuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb3RpZnkgb2YgYSBjaGFuZ2UgaW4gcm91dGVcbiAgICogQHBhcmFtIGZyb21BcHAgVHJ1ZSBpZiB0aGUgcm91dGUgd2FzIGNhdXNlZCBieSBhbiBhcHAgZXZlbnQgbm90IFVSTCBvciBoaXN0b3J5IGNoYW5nZVxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMoKSB7XG4gICAgdmFyIGV2ZW50UGF5bG9hZCA9IHtcbiAgICAgIHJvdXRlT2JqOiBnZXRDdXJyZW50Um91dGUoKSwgLy8geyByb3V0ZTosIGRhdGE6IH1cbiAgICAgIGZyYWdtZW50OiBnZXRVUkxGcmFnbWVudCgpXG4gICAgfTtcblxuICAgIF9zdWJqZWN0Lm9uTmV4dChldmVudFBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgcm91dGUgYW5kIHF1ZXJ5IHN0cmluZyBmcm9tIHRoZSBjdXJyZW50IFVSTCBmcmFnbWVudFxuICAgKiBAcmV0dXJucyB7e3JvdXRlOiBzdHJpbmcsIHF1ZXJ5OiB7fX19XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDdXJyZW50Um91dGUoKSB7XG4gICAgdmFyIGZyYWdtZW50ICAgID0gZ2V0VVJMRnJhZ21lbnQoKSxcbiAgICAgICAgcGFydHMgICAgICAgPSBmcmFnbWVudC5zcGxpdCgnPycpLFxuICAgICAgICByb3V0ZSAgICAgICA9ICcvJyArIHBhcnRzWzBdLFxuICAgICAgICBxdWVyeVN0ciAgICA9IGRlY29kZVVSSUNvbXBvbmVudChwYXJ0c1sxXSksXG4gICAgICAgIHF1ZXJ5U3RyT2JqID0gcGFyc2VRdWVyeVN0cihxdWVyeVN0cik7XG5cbiAgICBpZiAocXVlcnlTdHIgPT09ICc9dW5kZWZpbmVkJykge1xuICAgICAgcXVlcnlTdHJPYmogPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3JvdXRlOiByb3V0ZSwgZGF0YTogcXVlcnlTdHJPYmp9O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHF1ZXJ5IHN0cmluZyBpbnRvIGtleS92YWx1ZSBwYWlyc1xuICAgKiBAcGFyYW0gcXVlcnlTdHJcbiAgICogQHJldHVybnMge3t9fVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VRdWVyeVN0cihxdWVyeVN0cikge1xuICAgIHZhciBvYmogICA9IHt9LFxuICAgICAgICBwYXJ0cyA9IHF1ZXJ5U3RyLnNwbGl0KCcmJyk7XG5cbiAgICBwYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uIChwYWlyU3RyKSB7XG4gICAgICB2YXIgcGFpckFyciAgICAgPSBwYWlyU3RyLnNwbGl0KCc9Jyk7XG4gICAgICBvYmpbcGFpckFyclswXV0gPSBwYWlyQXJyWzFdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21iaW5lcyBhIHJvdXRlIGFuZCBkYXRhIG9iamVjdCBpbnRvIGEgcHJvcGVyIFVSTCBoYXNoIGZyYWdtZW50XG4gICAqIEBwYXJhbSByb3V0ZVxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2V0KHJvdXRlLCBkYXRhT2JqKSB7XG4gICAgdmFyIHBhdGggPSByb3V0ZSxcbiAgICAgICAgZGF0YSA9IFtdO1xuICAgIGlmICghX29ialV0aWxzLmlzTnVsbChkYXRhT2JqKSkge1xuICAgICAgcGF0aCArPSBcIj9cIjtcbiAgICAgIGZvciAodmFyIHByb3AgaW4gZGF0YU9iaikge1xuICAgICAgICBpZiAocHJvcCAhPT0gJ3VuZGVmaW5lZCcgJiYgZGF0YU9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgIGRhdGEucHVzaChwcm9wICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGRhdGFPYmpbcHJvcF0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcGF0aCArPSBkYXRhLmpvaW4oJyYnKTtcbiAgICB9XG5cbiAgICB1cGRhdGVVUkxGcmFnbWVudChwYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlICd3aGF0ZXZlci5odG1sIycgaW4gdGhlIFVSTFxuICAgKiBMZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIGFyZSByZW1vdmVkXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRVUkxGcmFnbWVudCgpIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBsb2NhdGlvbi5oYXNoLnNsaWNlKDEpO1xuICAgIHJldHVybiBmcmFnbWVudC50b1N0cmluZygpLnJlcGxhY2UoL1xcLyQvLCAnJykucmVwbGFjZSgvXlxcLy8sICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIFVSTCBoYXNoIGZyYWdtZW50XG4gICAqIEBwYXJhbSBwYXRoXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVVUkxGcmFnbWVudChwYXRoKSB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBwYXRoO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBzdWJzY3JpYmUgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIG5vdGlmeVN1YnNjcmliZXJzOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRDdXJyZW50Um91dGUgIDogZ2V0Q3VycmVudFJvdXRlLFxuICAgIHNldCAgICAgICAgICAgICAgOiBzZXRcbiAgfTtcblxufTtcblxudmFyIHIgPSBSb3V0ZXIoKTtcbnIuaW5pdGlhbGl6ZSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHI7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFJ4SlMgSGVscGVyc1xuICogQHR5cGUge3tkb206IEZ1bmN0aW9uLCBmcm9tOiBGdW5jdGlvbiwgaW50ZXJ2YWw6IEZ1bmN0aW9uLCBkb0V2ZXJ5OiBGdW5jdGlvbiwganVzdDogRnVuY3Rpb24sIGVtcHR5OiBGdW5jdGlvbn19XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRvbTogZnVuY3Rpb24gKHNlbGVjdG9yLCBldmVudCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGlmICghZWwpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS91dGlscy9SeCwgZG9tLCBpbnZhbGlkIERPTSBzZWxlY3RvcjogJyArIHNlbGVjdG9yKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGVsLCBldmVudC50cmltKCkpO1xuICB9LFxuXG4gIGZyb206IGZ1bmN0aW9uIChpdHRyKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZnJvbShpdHRyKTtcbiAgfSxcblxuICBpbnRlcnZhbDogZnVuY3Rpb24gKG1zKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwobXMpO1xuICB9LFxuXG4gIGRvRXZlcnk6IGZ1bmN0aW9uIChtcywgLi4uYXJncykge1xuICAgIGlmKGlzLmZ1bmN0aW9uKGFyZ3NbMF0pKSB7XG4gICAgICByZXR1cm4gdGhpcy5pbnRlcnZhbChtcykuc3Vic2NyaWJlKGFyZ3NbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pbnRlcnZhbChtcykudGFrZShhcmdzWzBdKS5zdWJzY3JpYmUoYXJnc1sxXSk7XG4gIH0sXG5cbiAganVzdDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuanVzdCh2YWx1ZSk7XG4gIH0sXG5cbiAgZW1wdHk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5lbXB0eSgpO1xuICB9XG5cbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKlxuIFNpbXBsZSB3cmFwcGVyIGZvciBVbmRlcnNjb3JlIC8gSFRNTCB0ZW1wbGF0ZXNcbiBNYXR0IFBlcmtpbnNcbiA0LzcvMTVcbiAqL1xudmFyIFRlbXBsYXRpbmcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF90ZW1wbGF0ZU1hcCAgICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfdGVtcGxhdGVIVE1MQ2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX3RlbXBsYXRlQ2FjaGUgICAgID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF9ET01VdGlscyAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgZnVuY3Rpb24gYWRkVGVtcGxhdGUoaWQsIGh0bWwpIHtcbiAgICBfdGVtcGxhdGVNYXBbaWRdID0gaHRtbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNvdXJjZUZyb21UZW1wbGF0ZU1hcChpZCkge1xuICAgIHZhciBzb3VyY2UgPSBfdGVtcGxhdGVNYXBbaWRdO1xuICAgIGlmIChzb3VyY2UpIHtcbiAgICAgIHJldHVybiBjbGVhblRlbXBsYXRlSFRNTChzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTb3VyY2VGcm9tSFRNTChpZCkge1xuICAgIHZhciBzcmMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCksXG4gICAgICAgIHNyY2h0bWw7XG5cbiAgICBpZiAoc3JjKSB7XG4gICAgICBzcmNodG1sID0gc3JjLmlubmVySFRNTDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKCdudWRvcnUvY29yZS9UZW1wbGF0aW5nLCB0ZW1wbGF0ZSBub3QgZm91bmQ6IFwiJyArIGlkICsgJ1wiJyk7XG4gICAgICBzcmNodG1sID0gJzxkaXY+VGVtcGxhdGUgbm90IGZvdW5kOiAnICsgaWQgKyAnPC9kaXY+JztcbiAgICB9XG5cbiAgICByZXR1cm4gY2xlYW5UZW1wbGF0ZUhUTUwoc3JjaHRtbCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSB0ZW1wbGF0ZSBodG1sIGZyb20gdGhlIHNjcmlwdCB0YWcgd2l0aCBpZFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3VyY2UoaWQpIHtcbiAgICBpZiAoX3RlbXBsYXRlSFRNTENhY2hlW2lkXSkge1xuICAgICAgcmV0dXJuIF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF07XG4gICAgfVxuXG4gICAgdmFyIHNvdXJjZWh0bWwgPSBnZXRTb3VyY2VGcm9tVGVtcGxhdGVNYXAoaWQpO1xuXG4gICAgaWYgKCFzb3VyY2VodG1sKSB7XG4gICAgICBzb3VyY2VodG1sID0gZ2V0U291cmNlRnJvbUhUTUwoaWQpO1xuICAgIH1cblxuICAgIF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF0gPSBzb3VyY2VodG1sO1xuICAgIHJldHVybiBzb3VyY2VodG1sO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYWxsIElEcyBiZWxvbmdpbmcgdG8gdGV4dC90ZW1wbGF0ZSB0eXBlIHNjcmlwdCB0YWdzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldEFsbFRlbXBsYXRlSURzKCkge1xuICAgIHZhciBzY3JpcHRUYWdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpLCAwKTtcblxuICAgIHJldHVybiBzY3JpcHRUYWdzLmZpbHRlcihmdW5jdGlvbiAodGFnKSB7XG4gICAgICByZXR1cm4gdGFnLmdldEF0dHJpYnV0ZSgndHlwZScpID09PSAndGV4dC90ZW1wbGF0ZSc7XG4gICAgfSkubWFwKGZ1bmN0aW9uICh0YWcpIHtcbiAgICAgIHJldHVybiB0YWcuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gdW5kZXJzY29yZSB0ZW1wbGF0ZVxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRUZW1wbGF0ZShpZCkge1xuICAgIGlmIChfdGVtcGxhdGVDYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBfdGVtcGxhdGVDYWNoZVtpZF07XG4gICAgfVxuICAgIHZhciB0ZW1wbCAgICAgICAgICA9IF8udGVtcGxhdGUoZ2V0U291cmNlKGlkKSk7XG4gICAgX3RlbXBsYXRlQ2FjaGVbaWRdID0gdGVtcGw7XG4gICAgcmV0dXJuIHRlbXBsO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyB0aGUgdGVtcGxhdGUgYW5kIHJldHVybnMgSFRNTFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFzSFRNTChpZCwgb2JqKSB7XG4gICAgdmFyIHRlbXAgPSBnZXRUZW1wbGF0ZShpZCk7XG4gICAgcmV0dXJuIHRlbXAob2JqKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIGFuIEhUTUwgRWxlbWVudFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFzRWxlbWVudChpZCwgb2JqKSB7XG4gICAgcmV0dXJuIF9ET01VdGlscy5IVE1MU3RyVG9Ob2RlKGFzSFRNTChpZCwgb2JqKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW5zIHRlbXBsYXRlIEhUTUxcbiAgICovXG4gIGZ1bmN0aW9uIGNsZWFuVGVtcGxhdGVIVE1MKHN0cikge1xuICAgIHJldHVybiBzdHIudHJpbSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSByZXR1cm5zLCBzcGFjZXMgYW5kIHRhYnNcbiAgICogQHBhcmFtIHN0clxuICAgKiBAcmV0dXJucyB7WE1MfHN0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZVdoaXRlU3BhY2Uoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oXFxyXFxufFxcbnxcXHJ8XFx0KS9nbSwgJycpLnJlcGxhY2UoLz5cXHMrPC9nLCAnPjwnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIG92ZXIgYWxsIHRlbXBsYXRlcywgY2xlYW4gdGhlbSB1cCBhbmQgbG9nXG4gICAqIFV0aWwgZm9yIFNoYXJlUG9pbnQgcHJvamVjdHMsIDxzY3JpcHQ+IGJsb2NrcyBhcmVuJ3QgYWxsb3dlZFxuICAgKiBTbyB0aGlzIGhlbHBzIGNyZWF0ZSB0aGUgYmxvY2tzIGZvciBpbnNlcnRpb24gaW4gdG8gdGhlIERPTVxuICAgKi9cbiAgZnVuY3Rpb24gcHJvY2Vzc0ZvckRPTUluc2VydGlvbigpIHtcbiAgICB2YXIgaWRzID0gZ2V0QWxsVGVtcGxhdGVJRHMoKTtcbiAgICBpZHMuZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHZhciBzcmMgPSByZW1vdmVXaGl0ZVNwYWNlKGdldFNvdXJjZShpZCkpO1xuICAgICAgY29uc29sZS5sb2coaWQsIHNyYyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgdGVtcGxhdGUgc2NyaXB0IHRhZyB0byB0aGUgRE9NXG4gICAqIFV0aWwgZm9yIFNoYXJlUG9pbnQgcHJvamVjdHMsIDxzY3JpcHQ+IGJsb2NrcyBhcmVuJ3QgYWxsb3dlZFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHBhcmFtIGh0bWxcbiAgICovXG4gIC8vZnVuY3Rpb24gYWRkQ2xpZW50U2lkZVRlbXBsYXRlVG9ET00oaWQsIGh0bWwpIHtcbiAgLy8gIHZhciBzICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gIC8vICBzLnR5cGUgICAgICA9ICd0ZXh0L3RlbXBsYXRlJztcbiAgLy8gIHMuaWQgICAgICAgID0gaWQ7XG4gIC8vICBzLmlubmVySFRNTCA9IGh0bWw7XG4gIC8vICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKHMpO1xuICAvL31cblxuICByZXR1cm4ge1xuICAgIGFkZFRlbXBsYXRlICAgICAgICAgICA6IGFkZFRlbXBsYXRlLFxuICAgIGdldFNvdXJjZSAgICAgICAgICAgICA6IGdldFNvdXJjZSxcbiAgICBnZXRBbGxUZW1wbGF0ZUlEcyAgICAgOiBnZXRBbGxUZW1wbGF0ZUlEcyxcbiAgICBwcm9jZXNzRm9yRE9NSW5zZXJ0aW9uOiBwcm9jZXNzRm9yRE9NSW5zZXJ0aW9uLFxuICAgIGdldFRlbXBsYXRlICAgICAgICAgICA6IGdldFRlbXBsYXRlLFxuICAgIGFzSFRNTCAgICAgICAgICAgICAgICA6IGFzSFRNTCxcbiAgICBhc0VsZW1lbnQgICAgICAgICAgICAgOiBhc0VsZW1lbnRcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0aW5nKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG52YXIgQXBwbGljYXRpb25WaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGhpcyxcbiAgICAgIF90ZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9kb21VdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0aWFsaXphdGlvblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZVxuICAgKiBAcGFyYW0gc2NhZmZvbGRUZW1wbGF0ZXMgdGVtcGxhdGUgSURzIHRvIGF0dGFjaGVkIHRvIHRoZSBib2R5IGZvciB0aGUgYXBwXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplQXBwbGljYXRpb25WaWV3KHNjYWZmb2xkVGVtcGxhdGVzKSB7XG4gICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgYXR0YWNoQXBwbGljYXRpb25TY2FmZm9sZGluZyhzY2FmZm9sZFRlbXBsYXRlcyk7XG4gIH1cblxuICAvKipcbiAgICogQXR0YWNoIGFwcCBIVE1MIHN0cnVjdHVyZVxuICAgKiBAcGFyYW0gdGVtcGxhdGVzXG4gICAqL1xuICBmdW5jdGlvbiBhdHRhY2hBcHBsaWNhdGlvblNjYWZmb2xkaW5nKHRlbXBsYXRlcykge1xuICAgIGlmICghdGVtcGxhdGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGJvZHlFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2JvZHknKTtcblxuICAgIHRlbXBsYXRlcy5mb3JFYWNoKGZ1bmN0aW9uICh0ZW1wbCkge1xuICAgICAgYm9keUVsLmFwcGVuZENoaWxkKF9kb21VdGlscy5IVE1MU3RyVG9Ob2RlKF90ZW1wbGF0ZS5nZXRTb3VyY2UodGVtcGwsIHt9KSkpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFmdGVyIGFwcCBpbml0aWFsaXphdGlvbiwgcmVtb3ZlIHRoZSBsb2FkaW5nIG1lc3NhZ2VcbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZUxvYWRpbmdNZXNzYWdlKCkge1xuICAgIHZhciBjb3ZlciAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2luaXRpYWxpemF0aW9uX19jb3ZlcicpLFxuICAgICAgICBtZXNzYWdlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmluaXRpYWxpemF0aW9uX19tZXNzYWdlJyk7XG5cbiAgICBUd2VlbkxpdGUudG8oY292ZXIsIDEsIHtcbiAgICAgIGFscGhhOiAwLCBlYXNlOiBRdWFkLmVhc2VPdXQsIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY292ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjb3Zlcik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBUd2VlbkxpdGUudG8obWVzc2FnZSwgMiwge1xuICAgICAgdG9wOiBcIis9NTBweFwiLCBlYXNlOiBRdWFkLmVhc2VJbiwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb3Zlci5yZW1vdmVDaGlsZChtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldzogaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyxcbiAgICByZW1vdmVMb2FkaW5nTWVzc2FnZSAgICAgOiByZW1vdmVMb2FkaW5nTWVzc2FnZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uVmlldygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBNaXhpbiB2aWV3IHRoYXQgYWxsb3dzIGZvciBjb21wb25lbnQgdmlld3NcbiAqL1xuXG52YXIgTWl4aW5Db21wb25lbnRWaWV3cyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2NvbXBvbmVudFZpZXdNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8qKlxuICAgKiBNYXAgYSBjb21wb25lbnQgdG8gYSBtb3VudGluZyBwb2ludC4gSWYgYSBzdHJpbmcgaXMgcGFzc2VkLFxuICAgKiB0aGUgY29ycmVjdCBvYmplY3Qgd2lsbCBiZSBjcmVhdGVkIGZyb20gdGhlIGZhY3RvcnkgbWV0aG9kLCBvdGhlcndpc2UsXG4gICAqIHRoZSBwYXNzZWQgY29tcG9uZW50IG9iamVjdCBpcyB1c2VkLlxuICAgKlxuICAgKiBAcGFyYW0gY29tcG9uZW50SURcbiAgICogQHBhcmFtIGNvbXBvbmVudElEb3JPYmpcbiAgICogQHBhcmFtIG1vdW50UG9pbnRcbiAgICovXG4gIGZ1bmN0aW9uIG1hcFZpZXdDb21wb25lbnQoY29tcG9uZW50SUQsIGNvbXBvbmVudElEb3JPYmosIG1vdW50UG9pbnQpIHtcbiAgICB2YXIgY29tcG9uZW50T2JqO1xuXG4gICAgaWYgKHR5cGVvZiBjb21wb25lbnRJRG9yT2JqID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIGNvbXBvbmVudEZhY3RvcnkgPSByZXF1aXJlKGNvbXBvbmVudElEb3JPYmopO1xuICAgICAgY29tcG9uZW50T2JqICAgICAgICAgPSBjcmVhdGVDb21wb25lbnRWaWV3KGNvbXBvbmVudEZhY3RvcnkoKSkoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50T2JqID0gY29tcG9uZW50SURvck9iajtcbiAgICB9XG5cbiAgICBfY29tcG9uZW50Vmlld01hcFtjb21wb25lbnRJRF0gPSB7XG4gICAgICBjb250cm9sbGVyOiBjb21wb25lbnRPYmosXG4gICAgICBtb3VudFBvaW50OiBtb3VudFBvaW50XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGYWN0b3J5IHRvIGNyZWF0ZSBjb21wb25lbnQgdmlldyBtb2R1bGVzIGJ5IGNvbmNhdGluZyBtdWx0aXBsZSBzb3VyY2Ugb2JqZWN0c1xuICAgKiBAcGFyYW0gY29tcG9uZW50U291cmNlIEN1c3RvbSBtb2R1bGUgc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRTb3VyY2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbXBvbmVudFZpZXdGYWN0b3J5ICA9IHJlcXVpcmUoJy4vVmlld0NvbXBvbmVudC5qcycpLFxuICAgICAgICAgIGV2ZW50RGVsZWdhdG9yRmFjdG9yeSA9IHJlcXVpcmUoJy4vTWl4aW5FdmVudERlbGVnYXRvci5qcycpLFxuICAgICAgICAgIG9ic2VydmFibGVGYWN0b3J5ICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICAgICAgICBzdGF0ZU9iakZhY3RvcnkgICAgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9JbW11dGFibGVNYXAuanMnKSxcbiAgICAgICAgICBjb21wb25lbnRBc3NlbWJseSwgZmluYWxDb21wb25lbnQsIHByZXZpb3VzSW5pdGlhbGl6ZTtcblxuICAgICAgY29tcG9uZW50QXNzZW1ibHkgPSBbXG4gICAgICAgIGNvbXBvbmVudFZpZXdGYWN0b3J5KCksXG4gICAgICAgIGV2ZW50RGVsZWdhdG9yRmFjdG9yeSgpLFxuICAgICAgICBvYnNlcnZhYmxlRmFjdG9yeSgpLFxuICAgICAgICBzdGF0ZU9iakZhY3RvcnkoKSxcbiAgICAgICAgY29tcG9uZW50U291cmNlXG4gICAgICBdO1xuXG4gICAgICBpZiAoY29tcG9uZW50U291cmNlLm1peGlucykge1xuICAgICAgICBjb21wb25lbnRBc3NlbWJseSA9IGNvbXBvbmVudEFzc2VtYmx5LmNvbmNhdChjb21wb25lbnRTb3VyY2UubWl4aW5zKTtcbiAgICAgIH1cblxuICAgICAgZmluYWxDb21wb25lbnQgPSBOb3JpLmFzc2lnbkFycmF5KHt9LCBjb21wb25lbnRBc3NlbWJseSk7XG5cbiAgICAgIC8vIENvbXBvc2UgYSBuZXcgaW5pdGlhbGl6ZSBmdW5jdGlvbiBieSBpbnNlcnRpbmcgY2FsbCB0byBjb21wb25lbnQgc3VwZXIgbW9kdWxlXG4gICAgICBwcmV2aW91c0luaXRpYWxpemUgICAgICAgID0gZmluYWxDb21wb25lbnQuaW5pdGlhbGl6ZTtcbiAgICAgIGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemUgPSBmdW5jdGlvbiBpbml0aWFsaXplKGluaXRPYmopIHtcbiAgICAgICAgZmluYWxDb21wb25lbnQuaW5pdGlhbGl6ZUNvbXBvbmVudChpbml0T2JqKTtcbiAgICAgICAgcHJldmlvdXNJbml0aWFsaXplLmNhbGwoZmluYWxDb21wb25lbnQsIGluaXRPYmopO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBmaW5hbENvbXBvbmVudCk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IGEgbWFwcGVkIGNvbXBvbmVudFZpZXdcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBkYXRhT2JqXG4gICAqL1xuICBmdW5jdGlvbiBzaG93Vmlld0NvbXBvbmVudChjb21wb25lbnRJRCwgbW91bnRQb2ludCkge1xuICAgIHZhciBjb21wb25lbnRWaWV3ID0gX2NvbXBvbmVudFZpZXdNYXBbY29tcG9uZW50SURdO1xuICAgIGlmICghY29tcG9uZW50Vmlldykge1xuICAgICAgY29uc29sZS53YXJuKCdObyBjb21wb25lbnRWaWV3IG1hcHBlZCBmb3IgaWQ6ICcgKyBjb21wb25lbnRJRCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIuaXNJbml0aWFsaXplZCgpKSB7XG4gICAgICBtb3VudFBvaW50ID0gbW91bnRQb2ludCB8fCBjb21wb25lbnRWaWV3Lm1vdW50UG9pbnQ7XG4gICAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIuaW5pdGlhbGl6ZSh7XG4gICAgICAgIGlkICAgICAgICA6IGNvbXBvbmVudElELFxuICAgICAgICB0ZW1wbGF0ZSAgOiBjb21wb25lbnRWaWV3Lmh0bWxUZW1wbGF0ZSxcbiAgICAgICAgbW91bnRQb2ludDogbW91bnRQb2ludFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci51cGRhdGUoKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIuY29tcG9uZW50UmVuZGVyKCk7XG4gICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLm1vdW50KCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGNvcHkgb2YgdGhlIG1hcCBvYmplY3QgZm9yIGNvbXBvbmVudCB2aWV3c1xuICAgKiBAcmV0dXJucyB7bnVsbH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbXBvbmVudFZpZXdNYXAoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCBfY29tcG9uZW50Vmlld01hcCk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIG1hcFZpZXdDb21wb25lbnQgICA6IG1hcFZpZXdDb21wb25lbnQsXG4gICAgY3JlYXRlQ29tcG9uZW50VmlldzogY3JlYXRlQ29tcG9uZW50VmlldyxcbiAgICBzaG93Vmlld0NvbXBvbmVudCAgOiBzaG93Vmlld0NvbXBvbmVudCxcbiAgICBnZXRDb21wb25lbnRWaWV3TWFwOiBnZXRDb21wb25lbnRWaWV3TWFwXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5Db21wb25lbnRWaWV3cygpOyIsInZhciBNaXhpbkRPTU1hbmlwdWxhdGlvbiA9IGZ1bmN0aW9uICgpIHtcblxuICBmdW5jdGlvbiBoaWRlRWwoc2VsZWN0b3IpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpLCB7XG4gICAgICBhbHBoYSAgOiAwLFxuICAgICAgZGlzcGxheTogJ25vbmUnXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93RWwoc2VsZWN0b3IpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpLCB7XG4gICAgICBhbHBoYSAgOiAxLFxuICAgICAgZGlzcGxheTogJ2Jsb2NrJ1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzaG93RWw6IHNob3dFbCxcbiAgICBoaWRlRWw6IGhpZGVFbFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluRE9NTWFuaXB1bGF0aW9uKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIENvbnZlbmllbmNlIG1peGluIHRoYXQgbWFrZXMgZXZlbnRzIGVhc2llciBmb3Igdmlld3NcbiAqXG4gKiBCYXNlZCBvbiBCYWNrYm9uZVxuICogUmV2aWV3IHRoaXMgaHR0cDovL2Jsb2cubWFyaW9uZXR0ZWpzLmNvbS8yMDE1LzAyLzEyL3VuZGVyc3RhbmRpbmctdGhlLWV2ZW50LWhhc2gvaW5kZXguaHRtbFxuICpcbiAqIEV4YW1wbGU6XG4gKiB0aGlzLnNldEV2ZW50cyh7XG4gKiAgICAgICAgJ2NsaWNrICNidG5fbWFpbl9wcm9qZWN0cyc6IGhhbmRsZVByb2plY3RzQnV0dG9uLFxuICogICAgICAgICdjbGljayAjYnRuX2ZvbywgY2xpY2sgI2J0bl9iYXInOiBoYW5kbGVGb29CYXJCdXR0b25zXG4gKiAgICAgIH0pO1xuICogdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuICpcbiAqL1xuXG52YXIgTWl4aW5FdmVudERlbGVnYXRvciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2V2ZW50c01hcCxcbiAgICAgIF9ldmVudFN1YnNjcmliZXJzLFxuICAgICAgX3J4ICAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvUngnKSxcbiAgICAgIF9icm93c2VySW5mbyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgZnVuY3Rpb24gc2V0RXZlbnRzKGV2dE9iaikge1xuICAgIF9ldmVudHNNYXAgPSBldnRPYmo7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRFdmVudHMoKSB7XG4gICAgcmV0dXJuIF9ldmVudHNNYXA7XG4gIH1cblxuICAvKipcbiAgICogQXV0b21hdGVzIHNldHRpbmcgZXZlbnRzIG9uIERPTSBlbGVtZW50cy5cbiAgICogJ2V2dFN0ciBzZWxlY3Rvcic6Y2FsbGJhY2tcbiAgICogJ2V2dFN0ciBzZWxlY3RvciwgZXZ0U3RyIHNlbGVjdG9yJzogc2hhcmVkQ2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGRlbGVnYXRlRXZlbnRzKGF1dG9Gb3JtKSB7XG4gICAgaWYgKCFfZXZlbnRzTWFwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yICh2YXIgZXZ0U3RyaW5ncyBpbiBfZXZlbnRzTWFwKSB7XG4gICAgICBpZiAoX2V2ZW50c01hcC5oYXNPd25Qcm9wZXJ0eShldnRTdHJpbmdzKSkge1xuXG4gICAgICAgIHZhciBtYXBwaW5ncyAgICAgPSBldnRTdHJpbmdzLnNwbGl0KCcsJyksXG4gICAgICAgICAgICBldmVudEhhbmRsZXIgPSBfZXZlbnRzTWFwW2V2dFN0cmluZ3NdO1xuXG4gICAgICAgIGlmICghaXMuZnVuY3Rpb24oZXZlbnRIYW5kbGVyKSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybignRXZlbnREZWxlZ2F0b3IsIGhhbmRsZXIgZm9yICcgKyBldnRTdHJpbmdzICsgJyBpcyBub3QgYSBmdW5jdGlvbicpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIGpzaGludCAtVzA4MyAqL1xuICAgICAgICAvLyBodHRwczovL2pzbGludGVycm9ycy5jb20vZG9udC1tYWtlLWZ1bmN0aW9ucy13aXRoaW4tYS1sb29wXG4gICAgICAgIG1hcHBpbmdzLmZvckVhY2goZnVuY3Rpb24gKGV2dE1hcCkge1xuICAgICAgICAgIGV2dE1hcCAgICAgICA9IGV2dE1hcC50cmltKCk7XG4gICAgICAgICAgdmFyIGV2ZW50U3RyID0gZXZ0TWFwLnNwbGl0KCcgJylbMF0udHJpbSgpLFxuICAgICAgICAgICAgICBzZWxlY3RvciA9IGV2dE1hcC5zcGxpdCgnICcpWzFdLnRyaW0oKTtcblxuICAgICAgICAgIGlmIChfYnJvd3NlckluZm8ubW9iaWxlLmFueSgpKSB7XG4gICAgICAgICAgICBldmVudFN0ciA9IGNvbnZlcnRNb3VzZVRvVG91Y2hFdmVudFN0cihldmVudFN0cik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZ0U3RyaW5nc10gPSBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyLCBhdXRvRm9ybSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvKiBqc2hpbnQgK1cwODMgKi9cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWFwIGNvbW1vbiBtb3VzZSBldmVudHMgdG8gdG91Y2ggZXF1aXZhbGVudHNcbiAgICogQHBhcmFtIGV2ZW50U3RyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY29udmVydE1vdXNlVG9Ub3VjaEV2ZW50U3RyKGV2ZW50U3RyKSB7XG4gICAgc3dpdGNoIChldmVudFN0cikge1xuICAgICAgY2FzZSgnY2xpY2snKTpcbiAgICAgICAgcmV0dXJuICd0b3VjaGVuZCc7XG4gICAgICBjYXNlKCdtb3VzZWRvd24nKTpcbiAgICAgICAgcmV0dXJuICd0b3VjaHN0YXJ0JztcbiAgICAgIGNhc2UoJ21vdXNldXAnKTpcbiAgICAgICAgcmV0dXJuICd0b3VjaGVuZCc7XG4gICAgICBjYXNlKCdtb3VzZW1vdmUnKTpcbiAgICAgICAgcmV0dXJuICd0b3VjaG1vdmUnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGV2ZW50U3RyO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUhhbmRsZXIoc2VsZWN0b3IsIGV2ZW50U3RyLCBldmVudEhhbmRsZXIsIGF1dG9Gb3JtKSB7XG4gICAgdmFyIG9ic2VydmFibGUgPSBfcnguZG9tKHNlbGVjdG9yLCBldmVudFN0ciksXG4gICAgICAgIGVsICAgICAgICAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSxcbiAgICAgICAgdGFnICAgICAgICA9IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgdHlwZSAgICAgICA9IGVsLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuXG4gICAgaWYgKGF1dG9Gb3JtKSB7XG4gICAgICBpZiAodGFnID09PSAnaW5wdXQnIHx8IHRhZyA9PT0gJ3RleHRhcmVhJykge1xuICAgICAgICBpZiAoIXR5cGUgfHwgdHlwZSA9PT0gJ3RleHQnKSB7XG4gICAgICAgICAgaWYgKGV2ZW50U3RyID09PSAnYmx1cicgfHwgZXZlbnRTdHIgPT09ICdmb2N1cycpIHtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZhYmxlXG4gICAgICAgICAgICAgIC5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpXG4gICAgICAgICAgICAgIC5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50U3RyID09PSAna2V5dXAnIHx8IGV2ZW50U3RyID09PSAna2V5ZG93bicpIHtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZhYmxlXG4gICAgICAgICAgICAgIC50aHJvdHRsZSgxMDApXG4gICAgICAgICAgICAgIC5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpXG4gICAgICAgICAgICAgIC5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3JhZGlvJyB8fCB0eXBlID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgaWYgKGV2ZW50U3RyID09PSAnY2xpY2snKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZ0LnRhcmdldC5jaGVja2VkO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRhZyA9PT0gJ3NlbGVjdCcpIHtcbiAgICAgICAgaWYgKGV2ZW50U3RyID09PSAnY2hhbmdlJykge1xuICAgICAgICAgIHJldHVybiBvYnNlcnZhYmxlXG4gICAgICAgICAgICAubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKVxuICAgICAgICAgICAgLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9ic2VydmFibGUuc3Vic2NyaWJlKGV2ZW50SGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW5seSByZW1vdmUgZXZlbnRzXG4gICAqL1xuICBmdW5jdGlvbiB1bmRlbGVnYXRlRXZlbnRzKCkge1xuICAgIGlmICghX2V2ZW50c01hcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIGV2ZW50IGluIF9ldmVudFN1YnNjcmliZXJzKSB7XG4gICAgICBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF0uZGlzcG9zZSgpO1xuICAgICAgZGVsZXRlIF9ldmVudFN1YnNjcmliZXJzW2V2ZW50XTtcbiAgICB9XG5cbiAgICBfZXZlbnRTdWJzY3JpYmVycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNldEV2ZW50cyAgICAgICA6IHNldEV2ZW50cyxcbiAgICBnZXRFdmVudHMgICAgICAgOiBnZXRFdmVudHMsXG4gICAgdW5kZWxlZ2F0ZUV2ZW50czogdW5kZWxlZ2F0ZUV2ZW50cyxcbiAgICBkZWxlZ2F0ZUV2ZW50cyAgOiBkZWxlZ2F0ZUV2ZW50c1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluRXZlbnREZWxlZ2F0b3I7IiwiLyogQGZsb3cgd2VhayAqL1xuXG52YXIgTWl4aW5OdWRvcnVDb250cm9scyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX25vdGlmaWNhdGlvblZpZXcgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvVG9hc3RWaWV3LmpzJyksXG4gICAgICBfdG9vbFRpcFZpZXcgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9Ub29sVGlwVmlldy5qcycpLFxuICAgICAgX21lc3NhZ2VCb3hWaWV3ICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvTWVzc2FnZUJveFZpZXcuanMnKSxcbiAgICAgIF9tZXNzYWdlQm94Q3JlYXRvciA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hDcmVhdG9yLmpzJyksXG4gICAgICBfbW9kYWxDb3ZlclZpZXcgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29tcG9uZW50cy9Nb2RhbENvdmVyVmlldy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVOdWRvcnVDb250cm9scygpIHtcbiAgICBfdG9vbFRpcFZpZXcuaW5pdGlhbGl6ZSgndG9vbHRpcF9fY29udGFpbmVyJyk7XG4gICAgX25vdGlmaWNhdGlvblZpZXcuaW5pdGlhbGl6ZSgndG9hc3RfX2NvbnRhaW5lcicpO1xuICAgIF9tZXNzYWdlQm94Vmlldy5pbml0aWFsaXplKCdtZXNzYWdlYm94X19jb250YWluZXInKTtcbiAgICBfbW9kYWxDb3ZlclZpZXcuaW5pdGlhbGl6ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gbWJDcmVhdG9yKCkge1xuICAgIHJldHVybiBfbWVzc2FnZUJveENyZWF0b3I7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRNZXNzYWdlQm94KG9iaikge1xuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKG9iaik7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVNZXNzYWdlQm94KGlkKSB7XG4gICAgX21lc3NhZ2VCb3hWaWV3LnJlbW92ZShpZCk7XG4gIH1cblxuICBmdW5jdGlvbiBhbGVydChtZXNzYWdlLCB0aXRsZSkge1xuICAgIHJldHVybiBtYkNyZWF0b3IoKS5hbGVydCh0aXRsZSB8fCAnQWxlcnQnLCBtZXNzYWdlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZE5vdGlmaWNhdGlvbihvYmopIHtcbiAgICByZXR1cm4gX25vdGlmaWNhdGlvblZpZXcuYWRkKG9iaik7XG4gIH1cblxuICBmdW5jdGlvbiBub3RpZnkobWVzc2FnZSwgdGl0bGUsIHR5cGUpIHtcbiAgICByZXR1cm4gYWRkTm90aWZpY2F0aW9uKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlIHx8ICcnLFxuICAgICAgdHlwZSAgIDogdHlwZSB8fCBfbm90aWZpY2F0aW9uVmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzOiBpbml0aWFsaXplTnVkb3J1Q29udHJvbHMsXG4gICAgbWJDcmVhdG9yICAgICAgICAgICAgICAgOiBtYkNyZWF0b3IsXG4gICAgYWRkTWVzc2FnZUJveCAgICAgICAgICAgOiBhZGRNZXNzYWdlQm94LFxuICAgIHJlbW92ZU1lc3NhZ2VCb3ggICAgICAgIDogcmVtb3ZlTWVzc2FnZUJveCxcbiAgICBhZGROb3RpZmljYXRpb24gICAgICAgICA6IGFkZE5vdGlmaWNhdGlvbixcbiAgICBhbGVydCAgICAgICAgICAgICAgICAgICA6IGFsZXJ0LFxuICAgIG5vdGlmeSAgICAgICAgICAgICAgICAgIDogbm90aWZ5XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5OdWRvcnVDb250cm9scygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBNaXhpbiB2aWV3IHRoYXQgYWxsb3dzIGZvciBjb21wb25lbnQgdmlld3MgdG8gYmUgZGlzcGxheSBvbiBzdG9yZSBzdGF0ZSBjaGFuZ2VzXG4gKi9cblxudmFyIE1peGluU3RvcmVTdGF0ZVZpZXdzID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfdGhpcyxcbiAgICAgIF93YXRjaGVkU3RvcmUsXG4gICAgICBfY3VycmVudFZpZXdJRCxcbiAgICAgIF9jdXJyZW50U3RvcmVTdGF0ZSxcbiAgICAgIF9zdGF0ZVZpZXdNb3VudFBvaW50LFxuICAgICAgX3N0YXRlVmlld0lETWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvKipcbiAgICogU2V0IHVwIGxpc3RlbmVyc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVN0YXRlVmlld3Moc3RvcmUpIHtcbiAgICBfdGhpcyA9IHRoaXM7IC8vIG1pdGlnYXRpb24sIER1ZSB0byBldmVudHMsIHNjb3BlIG1heSBiZSBzZXQgdG8gdGhlIHdpbmRvdyBvYmplY3RcbiAgICBfd2F0Y2hlZFN0b3JlID0gc3RvcmU7XG5cbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ3ZpZXdDaGFuZ2UnKTtcblxuICAgIF93YXRjaGVkU3RvcmUuc3Vic2NyaWJlKGZ1bmN0aW9uIG9uU3RhdGVDaGFuZ2UoKSB7XG4gICAgICBoYW5kbGVTdGF0ZUNoYW5nZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgcm91dGUgZnJvbSBVUkwgaGFzaCBvbiBjaGFuZ2VcbiAgICogQHBhcmFtIHJvdXRlT2JqXG4gICAqL1xuICBmdW5jdGlvbiBoYW5kbGVTdGF0ZUNoYW5nZSgpIHtcbiAgICBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93Vmlld0ZvckN1cnJlbnRTdG9yZVN0YXRlKCkge1xuICAgIHZhciBzdGF0ZSA9IF93YXRjaGVkU3RvcmUuZ2V0U3RhdGUoKS5jdXJyZW50U3RhdGU7XG4gICAgaWYgKHN0YXRlKSB7XG4gICAgICBpZiAoc3RhdGUgIT09IF9jdXJyZW50U3RvcmVTdGF0ZSkge1xuICAgICAgICBfY3VycmVudFN0b3JlU3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgc2hvd1N0YXRlVmlld0NvbXBvbmVudC5iaW5kKF90aGlzKShfY3VycmVudFN0b3JlU3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGxvY2F0aW9uIGZvciB0aGUgdmlldyB0byBtb3VudCBvbiByb3V0ZSBjaGFuZ2VzLCBhbnkgY29udGVudHMgd2lsbFxuICAgKiBiZSByZW1vdmVkIHByaW9yXG4gICAqIEBwYXJhbSBlbElEXG4gICAqL1xuICBmdW5jdGlvbiBzZXRWaWV3TW91bnRQb2ludChlbElEKSB7XG4gICAgX3N0YXRlVmlld01vdW50UG9pbnQgPSBlbElEO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Vmlld01vdW50UG9pbnQoKSB7XG4gICAgcmV0dXJuIF9zdGF0ZVZpZXdNb3VudFBvaW50O1xuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBhIHJvdXRlIHRvIGEgbW9kdWxlIHZpZXcgY29udHJvbGxlclxuICAgKiBAcGFyYW0gdGVtcGxhdGVJRFxuICAgKiBAcGFyYW0gY29tcG9uZW50SURvck9ialxuICAgKi9cbiAgZnVuY3Rpb24gbWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoc3RhdGUsIHRlbXBsYXRlSUQsIGNvbXBvbmVudElEb3JPYmopIHtcbiAgICBfc3RhdGVWaWV3SURNYXBbc3RhdGVdID0gdGVtcGxhdGVJRDtcbiAgICB0aGlzLm1hcFZpZXdDb21wb25lbnQodGVtcGxhdGVJRCwgY29tcG9uZW50SURvck9iaiwgX3N0YXRlVmlld01vdW50UG9pbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgYSB2aWV3IChpbiByZXNwb25zZSB0byBhIHJvdXRlIGNoYW5nZSlcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqL1xuICBmdW5jdGlvbiBzaG93U3RhdGVWaWV3Q29tcG9uZW50KHN0YXRlKSB7XG4gICAgdmFyIGNvbXBvbmVudElEID0gX3N0YXRlVmlld0lETWFwW3N0YXRlXTtcbiAgICBpZiAoIWNvbXBvbmVudElEKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJObyB2aWV3IG1hcHBlZCBmb3Igcm91dGU6IFwiICsgc3RhdGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJlbW92ZUN1cnJlbnRWaWV3KCk7XG5cbiAgICBfY3VycmVudFZpZXdJRCA9IGNvbXBvbmVudElEO1xuICAgIHRoaXMuc2hvd1ZpZXdDb21wb25lbnQoX2N1cnJlbnRWaWV3SUQpO1xuXG4gICAgLy8gVHJhbnNpdGlvbiBuZXcgdmlldyBpblxuICAgIFR3ZWVuTGl0ZS5zZXQoX3N0YXRlVmlld01vdW50UG9pbnQsIHthbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfc3RhdGVWaWV3TW91bnRQb2ludCwgMC4yNSwge2FscGhhOiAxLCBlYXNlOiBRdWFkLmVhc2VJbn0pO1xuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd2aWV3Q2hhbmdlJywgY29tcG9uZW50SUQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgY3VycmVudGx5IGRpc3BsYXllZCB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVDdXJyZW50VmlldygpIHtcbiAgICBpZiAoX2N1cnJlbnRWaWV3SUQpIHtcbiAgICAgIF90aGlzLmdldENvbXBvbmVudFZpZXdNYXAoKVtfY3VycmVudFZpZXdJRF0uY29udHJvbGxlci51bm1vdW50KCk7XG4gICAgfVxuICAgIF9jdXJyZW50Vmlld0lEID0gJyc7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVTdGF0ZVZpZXdzICAgICAgICA6IGluaXRpYWxpemVTdGF0ZVZpZXdzLFxuICAgIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGU6IHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUsXG4gICAgc2hvd1N0YXRlVmlld0NvbXBvbmVudCAgICAgIDogc2hvd1N0YXRlVmlld0NvbXBvbmVudCxcbiAgICBzZXRWaWV3TW91bnRQb2ludCAgICAgICAgICAgOiBzZXRWaWV3TW91bnRQb2ludCxcbiAgICBnZXRWaWV3TW91bnRQb2ludCAgICAgICAgICAgOiBnZXRWaWV3TW91bnRQb2ludCxcbiAgICBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudCAgICAgOiBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluU3RvcmVTdGF0ZVZpZXdzKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIEJhc2UgbW9kdWxlIGZvciBjb21wb25lbnRzXG4gKiBNdXN0IGJlIGV4dGVuZGVkIHdpdGggY3VzdG9tIG1vZHVsZXNcbiAqL1xuXG52YXIgX3RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG52YXIgVmlld0NvbXBvbmVudCA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2lzSW5pdGlhbGl6ZWQgPSBmYWxzZSxcbiAgICAgIF9jb25maWdQcm9wcyxcbiAgICAgIF9pZCxcbiAgICAgIF90ZW1wbGF0ZU9iakNhY2hlLFxuICAgICAgX2h0bWwsXG4gICAgICBfRE9NRWxlbWVudCxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX3JlZ2lvbnMgICAgICAgPSB7fSxcbiAgICAgIF9pc01vdW50ZWQgICAgID0gZmFsc2UsXG4gICAgICBfcmVuZGVyZXIgICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzL1JlbmRlcmVyJyk7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemF0aW9uXG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZUNvbXBvbmVudChjb25maWdQcm9wcykge1xuICAgIF9jb25maWdQcm9wcyA9IHRoaXMuY29uZmlndXJhdGlvbigpIHx8IGNvbmZpZ1Byb3BzO1xuICAgIF9pZCAgICAgICAgICA9IF9jb25maWdQcm9wcy5pZDtcbiAgICBfbW91bnRQb2ludCAgPSBfY29uZmlnUHJvcHMubW91bnRQb2ludDtcblxuICAgIHRoaXMuc2V0U3RhdGUodGhpcy5nZXRJbml0aWFsU3RhdGUoKSk7XG4gICAgdGhpcy5zZXRFdmVudHModGhpcy5kZWZpbmVFdmVudHMoKSk7XG5cbiAgICBfcmVnaW9ucyA9IHRoaXMuZGVmaW5lUmVnaW9ucygpO1xuXG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCd1cGRhdGUnKTtcbiAgICB0aGlzLmNyZWF0ZVN1YmplY3QoJ21vdW50Jyk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCd1bm1vdW50Jyk7XG5cbiAgICB0aGlzLmluaXRpYWxpemVSZWdpb25zKCk7XG5cbiAgICBfaXNJbml0aWFsaXplZCA9IHRydWU7XG4gIH1cblxuICBmdW5jdGlvbiBjb25maWd1cmF0aW9uKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBkZWZpbmVFdmVudHMoKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCaW5kIHVwZGF0ZXMgdG8gdGhlIG1hcCBJRCB0byB0aGlzIHZpZXcncyB1cGRhdGVcbiAgICogQHBhcmFtIG1hcE9iaiBPYmplY3QgdG8gc3Vic2NyaWJlIHRvIG9yIElELiBTaG91bGQgaW1wbGVtZW50IG5vcmkvc3RvcmUvTWl4aW5PYnNlcnZhYmxlU3RvcmVcbiAgICovXG4gIGZ1bmN0aW9uIGJpbmRNYXAobWFwT2JqKSB7XG4gICAgaWYgKCFpcy5mdW5jdGlvbihtYXBPYmouc3Vic2NyaWJlKSkge1xuICAgICAgY29uc29sZS53YXJuKCdWaWV3Q29tcG9uZW50IGJpbmRNYXAsIG1hcCBvciBtYXBjb2xsZWN0aW9uIG11c3QgYmUgb2JzZXJ2YWJsZTogJyArIG1hcE9iaik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWFwT2JqLnN1YnNjcmliZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCZWZvcmUgdGhlIHZpZXcgdXBkYXRlcyBhbmQgYSByZXJlbmRlciBvY2N1cnNcbiAgICogUmV0dXJucyBuZXh0U3RhdGUgb2YgY29tcG9uZW50XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnRXaWxsVXBkYXRlKCkge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgdmFyIGN1cnJlbnRTdGF0ZSA9IHRoaXMuZ2V0U3RhdGUoKTtcbiAgICB2YXIgbmV4dFN0YXRlICAgID0gdGhpcy5jb21wb25lbnRXaWxsVXBkYXRlKCk7XG5cbiAgICBpZiAodGhpcy5zaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSkge1xuICAgICAgdGhpcy5zZXRTdGF0ZShuZXh0U3RhdGUpO1xuXG4gICAgICBpZiAoX2lzTW91bnRlZCkge1xuICAgICAgICAvL2lmICh0aGlzLnNob3VsZENvbXBvbmVudFJlbmRlcihjdXJyZW50U3RhdGUpKSB7XG4gICAgICAgIHRoaXMudW5tb3VudCgpO1xuICAgICAgICB0aGlzLmNvbXBvbmVudFJlbmRlcigpO1xuICAgICAgICB0aGlzLm1vdW50KCk7XG4gICAgICAgIC8vfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnVwZGF0ZVJlZ2lvbnMoKTtcblxuICAgICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1cGRhdGUnLCB0aGlzLmdldElEKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wYXJlIGN1cnJlbnQgc3RhdGUgYW5kIG5leHQgc3RhdGUgdG8gZGV0ZXJtaW5lIGlmIHVwZGF0aW5nIHNob3VsZCBvY2N1clxuICAgKiBAcGFyYW0gbmV4dFN0YXRlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvdWxkQ29tcG9uZW50VXBkYXRlKG5leHRTdGF0ZSkge1xuICAgIHJldHVybiBpcy5leGlzdHkobmV4dFN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgaXQsIG5lZWQgdG8gYWRkIGl0IHRvIGEgcGFyZW50IGNvbnRhaW5lciwgaGFuZGxlZCBpbiBoaWdoZXIgbGV2ZWwgdmlld1xuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFJlbmRlcigpIHtcbiAgICBpZiAoIV90ZW1wbGF0ZU9iakNhY2hlKSB7XG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSA9IHRoaXMudGVtcGxhdGUoKTtcbiAgICB9XG5cbiAgICBfaHRtbCA9IHRoaXMucmVuZGVyKHRoaXMuZ2V0U3RhdGUoKSk7XG5cbiAgICB0aGlzLnJlbmRlclJlZ2lvbnMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgTG9kYXNoIGNsaWVudCBzaWRlIHRlbXBsYXRlIGZ1bmN0aW9uIGJ5IGdldHRpbmcgdGhlIEhUTUwgc291cmNlIGZyb21cbiAgICogdGhlIG1hdGNoaW5nIDxzY3JpcHQgdHlwZT0ndGV4dC90ZW1wbGF0ZSc+IHRhZyBpbiB0aGUgZG9jdW1lbnQuIE9SIHlvdSBtYXlcbiAgICogc3BlY2lmeSB0aGUgY3VzdG9tIEhUTUwgdG8gdXNlIGhlcmUuXG4gICAqXG4gICAqIFRoZSBtZXRob2QgaXMgY2FsbGVkIG9ubHkgb24gdGhlIGZpcnN0IHJlbmRlciBhbmQgY2FjaGVkIHRvIHNwZWVkIHVwIHJlbmRlcnNcbiAgICpcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufVxuICAgKi9cbiAgZnVuY3Rpb24gdGVtcGxhdGUoKSB7XG4gICAgLy8gYXNzdW1lcyB0aGUgdGVtcGxhdGUgSUQgbWF0Y2hlcyB0aGUgY29tcG9uZW50J3MgSUQgYXMgcGFzc2VkIG9uIGluaXRpYWxpemVcbiAgICB2YXIgaHRtbCA9IF90ZW1wbGF0ZS5nZXRTb3VyY2UodGhpcy5nZXRJRCgpKTtcbiAgICByZXR1cm4gXy50ZW1wbGF0ZShodG1sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXkgYmUgb3ZlcnJpZGRlbiBpbiBhIHN1Ym1vZHVsZSBmb3IgY3VzdG9tIHJlbmRlcmluZ1xuICAgKiBTaG91bGQgcmV0dXJuIEhUTUxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiByZW5kZXIoc3RhdGUpIHtcbiAgICByZXR1cm4gX3RlbXBsYXRlT2JqQ2FjaGUoc3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZCBpdCB0byBhIHBhcmVudCBlbGVtZW50XG4gICAqIEBwYXJhbSBtb3VudEVsXG4gICAqL1xuICBmdW5jdGlvbiBtb3VudCgpIHtcbiAgICBpZiAoIV9odG1sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBvbmVudCAnICsgX2lkICsgJyBjYW5ub3QgbW91bnQgd2l0aCBubyBIVE1MLiBDYWxsIHJlbmRlcigpIGZpcnN0PycpO1xuICAgIH1cblxuICAgIF9pc01vdW50ZWQgPSB0cnVlO1xuXG4gICAgX0RPTUVsZW1lbnQgPSAoX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiBfaHRtbFxuICAgIH0pKTtcblxuICAgIGlmICh0aGlzLmRlbGVnYXRlRXZlbnRzKSB7XG4gICAgICAvLyBQYXNzIHRydWUgdG8gYXV0b21hdGljYWxseSBwYXNzIGZvcm0gZWxlbWVudCBoYW5kbGVycyB0aGUgZWxlbWVudHMgdmFsdWUgb3Igb3RoZXIgc3RhdHVzXG4gICAgICB0aGlzLmRlbGVnYXRlRXZlbnRzKHRydWUpO1xuICAgIH1cblxuICAgIHRoaXMubW91bnRSZWdpb25zKCk7XG5cbiAgICBpZiAodGhpcy5jb21wb25lbnREaWRNb3VudCkge1xuICAgICAgdGhpcy5jb21wb25lbnREaWRNb3VudCgpO1xuICAgIH1cblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnNPZignbW91bnQnLCB0aGlzLmdldElEKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgYWZ0ZXIgaXQncyBiZWVuIGFkZGVkIHRvIGEgdmlld1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgd2hlbiB1bmxvYWRpbmdcbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuICAgIC8vIHN0dWJcbiAgfVxuXG4gIGZ1bmN0aW9uIHVubW91bnQoKSB7XG4gICAgdGhpcy5jb21wb25lbnRXaWxsVW5tb3VudCgpO1xuXG4gICAgdGhpcy51bm1vdW50UmVnaW9ucygpO1xuXG4gICAgX2lzTW91bnRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMudW5kZWxlZ2F0ZUV2ZW50cykge1xuICAgICAgdGhpcy51bmRlbGVnYXRlRXZlbnRzKCk7XG4gICAgfVxuXG4gICAgX3JlbmRlcmVyLnJlbmRlcih7XG4gICAgICB0YXJnZXQ6IF9tb3VudFBvaW50LFxuICAgICAgaHRtbCAgOiAnJ1xuICAgIH0pO1xuXG4gICAgX2h0bWwgICAgICAgPSAnJztcbiAgICBfRE9NRWxlbWVudCA9IG51bGw7XG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCd1bm1vdW50JywgdGhpcy5nZXRJRCgpKTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgUmVnaW9uc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBkZWZpbmVSZWdpb25zKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSZWdpb24oaWQpIHtcbiAgICByZXR1cm4gX3JlZ2lvbnNbaWRdO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVnaW9uSURzKCkge1xuICAgIHJldHVybiBfcmVnaW9ucyA/IE9iamVjdC5rZXlzKF9yZWdpb25zKSA6IFtdO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS5pbml0aWFsaXplKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVSZWdpb25zKCkge1xuICAgIGdldFJlZ2lvbklEcygpLmZvckVhY2gocmVnaW9uID0+IHtcbiAgICAgIF9yZWdpb25zW3JlZ2lvbl0udXBkYXRlKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW5kZXJSZWdpb25zKCkge1xuICAgIGdldFJlZ2lvbklEcygpLmZvckVhY2gocmVnaW9uID0+IHtcbiAgICAgIF9yZWdpb25zW3JlZ2lvbl0uY29tcG9uZW50UmVuZGVyKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBtb3VudFJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS5tb3VudCgpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5tb3VudFJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS51bm1vdW50KCk7XG4gICAgfSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFjY2Vzc29yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBmdW5jdGlvbiBpc0luaXRpYWxpemVkKCkge1xuICAgIHJldHVybiBfaXNJbml0aWFsaXplZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbmZpZ1Byb3BzKCkge1xuICAgIHJldHVybiBfY29uZmlnUHJvcHM7XG4gIH1cblxuICBmdW5jdGlvbiBpc01vdW50ZWQoKSB7XG4gICAgcmV0dXJuIF9pc01vdW50ZWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG4gICAgdGhpcy5zZXRTdGF0ZSh7fSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJRCgpIHtcbiAgICByZXR1cm4gX2lkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RE9NRWxlbWVudCgpIHtcbiAgICByZXR1cm4gX0RPTUVsZW1lbnQ7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVDb21wb25lbnQgIDogaW5pdGlhbGl6ZUNvbXBvbmVudCxcbiAgICBjb25maWd1cmF0aW9uICAgICAgICA6IGNvbmZpZ3VyYXRpb24sXG4gICAgZGVmaW5lUmVnaW9ucyAgICAgICAgOiBkZWZpbmVSZWdpb25zLFxuICAgIGRlZmluZUV2ZW50cyAgICAgICAgIDogZGVmaW5lRXZlbnRzLFxuICAgIGlzSW5pdGlhbGl6ZWQgICAgICAgIDogaXNJbml0aWFsaXplZCxcbiAgICBnZXRDb25maWdQcm9wcyAgICAgICA6IGdldENvbmZpZ1Byb3BzLFxuICAgIGdldEluaXRpYWxTdGF0ZSAgICAgIDogZ2V0SW5pdGlhbFN0YXRlLFxuICAgIGdldElEICAgICAgICAgICAgICAgIDogZ2V0SUQsXG4gICAgdGVtcGxhdGUgICAgICAgICAgICAgOiB0ZW1wbGF0ZSxcbiAgICBnZXRET01FbGVtZW50ICAgICAgICA6IGdldERPTUVsZW1lbnQsXG4gICAgaXNNb3VudGVkICAgICAgICAgICAgOiBpc01vdW50ZWQsXG4gICAgYmluZE1hcCAgICAgICAgICAgICAgOiBiaW5kTWFwLFxuICAgIGNvbXBvbmVudFdpbGxVcGRhdGUgIDogY29tcG9uZW50V2lsbFVwZGF0ZSxcbiAgICBzaG91bGRDb21wb25lbnRVcGRhdGU6IHNob3VsZENvbXBvbmVudFVwZGF0ZSxcbiAgICB1cGRhdGUgICAgICAgICAgICAgICA6IHVwZGF0ZSxcbiAgICBjb21wb25lbnRSZW5kZXIgICAgICA6IGNvbXBvbmVudFJlbmRlcixcbiAgICByZW5kZXIgICAgICAgICAgICAgICA6IHJlbmRlcixcbiAgICBtb3VudCAgICAgICAgICAgICAgICA6IG1vdW50LFxuICAgIGNvbXBvbmVudERpZE1vdW50ICAgIDogY29tcG9uZW50RGlkTW91bnQsXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQgOiBjb21wb25lbnRXaWxsVW5tb3VudCxcbiAgICB1bm1vdW50ICAgICAgICAgICAgICA6IHVubW91bnQsXG4gICAgZ2V0UmVnaW9uICAgICAgICAgICAgOiBnZXRSZWdpb24sXG4gICAgZ2V0UmVnaW9uSURzICAgICAgICAgOiBnZXRSZWdpb25JRHMsXG4gICAgaW5pdGlhbGl6ZVJlZ2lvbnMgICAgOiBpbml0aWFsaXplUmVnaW9ucyxcbiAgICB1cGRhdGVSZWdpb25zICAgICAgICA6IHVwZGF0ZVJlZ2lvbnMsXG4gICAgcmVuZGVyUmVnaW9ucyAgICAgICAgOiByZW5kZXJSZWdpb25zLFxuICAgIG1vdW50UmVnaW9ucyAgICAgICAgIDogbW91bnRSZWdpb25zLFxuICAgIHVubW91bnRSZWdpb25zICAgICAgIDogdW5tb3VudFJlZ2lvbnNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3Q29tcG9uZW50OyIsInZhciBicm93c2VySW5mbyA9IHtcblxuICBhcHBWZXJzaW9uIDogbmF2aWdhdG9yLmFwcFZlcnNpb24sXG4gIHVzZXJBZ2VudCAgOiBuYXZpZ2F0b3IudXNlckFnZW50LFxuICBpc0lFICAgICAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJNU0lFIFwiKSxcbiAgaXNJRTYgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDZcIiksXG4gIGlzSUU3ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA3XCIpLFxuICBpc0lFOCAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgOFwiKSxcbiAgaXNJRTkgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDlcIiksXG4gIGlzRkYgICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkZpcmVmb3gvXCIpLFxuICBpc0Nocm9tZSAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJDaHJvbWUvXCIpLFxuICBpc01hYyAgICAgIDogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJNYWNpbnRvc2gsXCIpLFxuICBpc01hY1NhZmFyaTogLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJTYWZhcmlcIikgJiYgLTEgPCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJNYWNcIikgJiYgLTEgPT09IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkNocm9tZVwiKSxcblxuICBoYXNUb3VjaCAgICA6ICdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgbm90U3VwcG9ydGVkOiAodGhpcy5pc0lFNiB8fCB0aGlzLmlzSUU3IHx8IHRoaXMuaXNJRTggfHwgdGhpcy5pc0lFOSksXG5cbiAgbW9iaWxlOiB7XG4gICAgQW5kcm9pZCAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0FuZHJvaWQvaSk7XG4gICAgfSxcbiAgICBCbGFja0JlcnJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQmxhY2tCZXJyeS9pKSB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CQjEwOyBUb3VjaC8pO1xuICAgIH0sXG4gICAgaU9TICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQaG9uZXxpUGFkfGlQb2QvaSk7XG4gICAgfSxcbiAgICBPcGVyYSAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvT3BlcmEgTWluaS9pKTtcbiAgICB9LFxuICAgIFdpbmRvd3MgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9JRU1vYmlsZS9pKTtcbiAgICB9LFxuICAgIGFueSAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiAodGhpcy5BbmRyb2lkKCkgfHwgdGhpcy5CbGFja0JlcnJ5KCkgfHwgdGhpcy5pT1MoKSB8fCB0aGlzLk9wZXJhKCkgfHwgdGhpcy5XaW5kb3dzKCkpICE9PSBudWxsO1xuICAgIH1cblxuICB9LFxuXG4gIC8vIFRPRE8gZmlsdGVyIGZvciBJRSA+IDlcbiAgZW5oYW5jZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIV9icm93c2VySW5mby5pc0lFICYmICFfYnJvd3NlckluZm8ubW9iaWxlLmFueSgpO1xuICB9LFxuXG4gIG1vdXNlRG93bkV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2hzdGFydFwiIDogXCJtb3VzZWRvd25cIjtcbiAgfSxcblxuICBtb3VzZVVwRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaGVuZFwiIDogXCJtb3VzZXVwXCI7XG4gIH0sXG5cbiAgbW91c2VDbGlja0V2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2hlbmRcIiA6IFwiY2xpY2tcIjtcbiAgfSxcblxuICBtb3VzZU1vdmVFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNobW92ZVwiIDogXCJtb3VzZW1vdmVcIjtcbiAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJyb3dzZXJJbmZvOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTIzOTk5L2hvdy10by10ZWxsLWlmLWEtZG9tLWVsZW1lbnQtaXMtdmlzaWJsZS1pbi10aGUtY3VycmVudC12aWV3cG9ydFxuICAvLyBlbGVtZW50IG11c3QgYmUgZW50aXJlbHkgb24gc2NyZWVuXG4gIGlzRWxlbWVudEVudGlyZWx5SW5WaWV3cG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gKFxuICAgICAgcmVjdC50b3AgPj0gMCAmJlxuICAgICAgcmVjdC5sZWZ0ID49IDAgJiZcbiAgICAgIHJlY3QuYm90dG9tIDw9ICh3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCkgJiZcbiAgICAgIHJlY3QucmlnaHQgPD0gKHdpbmRvdy5pbm5lcldpZHRoIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aClcbiAgICApO1xuICB9LFxuXG4gIC8vIGVsZW1lbnQgbWF5IGJlIHBhcnRpYWx5IG9uIHNjcmVlblxuICBpc0VsZW1lbnRJblZpZXdwb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiByZWN0LmJvdHRvbSA+IDAgJiZcbiAgICAgIHJlY3QucmlnaHQgPiAwICYmXG4gICAgICByZWN0LmxlZnQgPCAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSAmJlxuICAgICAgcmVjdC50b3AgPCAod2luZG93LmlubmVySGVpZ2h0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpO1xuICB9LFxuXG4gIGlzRG9tT2JqOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iai5ub2RlVHlwZSB8fCAob2JqID09PSB3aW5kb3cpKTtcbiAgfSxcblxuICBwb3NpdGlvbjogZnVuY3Rpb24gKGVsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IGVsLm9mZnNldExlZnQsXG4gICAgICB0b3AgOiBlbC5vZmZzZXRUb3BcbiAgICB9O1xuICB9LFxuXG4gIC8vIGZyb20gaHR0cDovL2pzcGVyZi5jb20vanF1ZXJ5LW9mZnNldC12cy1vZmZzZXRwYXJlbnQtbG9vcFxuICBvZmZzZXQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciBvbCA9IDAsXG4gICAgICAgIG90ID0gMDtcbiAgICBpZiAoZWwub2Zmc2V0UGFyZW50KSB7XG4gICAgICBkbyB7XG4gICAgICAgIG9sICs9IGVsLm9mZnNldExlZnQ7XG4gICAgICAgIG90ICs9IGVsLm9mZnNldFRvcDtcbiAgICAgIH0gd2hpbGUgKGVsID0gZWwub2Zmc2V0UGFyZW50KTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBsZWZ0OiBvbCxcbiAgICAgIHRvcCA6IG90XG4gICAgfTtcbiAgfSxcblxuICByZW1vdmVBbGxFbGVtZW50czogZnVuY3Rpb24gKGVsKSB7XG4gICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgfSxcblxuICAvL2h0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDk0MTQzL2NyZWF0aW5nLWEtbmV3LWRvbS1lbGVtZW50LWZyb20tYW4taHRtbC1zdHJpbmctdXNpbmctYnVpbHQtaW4tZG9tLW1ldGhvZHMtb3ItcHJvXG4gIEhUTUxTdHJUb05vZGU6IGZ1bmN0aW9uIChzdHIpIHtcbiAgICB2YXIgdGVtcCAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRlbXAuaW5uZXJIVE1MID0gc3RyO1xuICAgIHJldHVybiB0ZW1wLmZpcnN0Q2hpbGQ7XG4gIH0sXG5cbiAgd3JhcEVsZW1lbnQ6IGZ1bmN0aW9uICh3cmFwcGVyU3RyLCBlbCkge1xuICAgIHZhciB3cmFwcGVyRWwgPSB0aGlzLkhUTUxTdHJUb05vZGUod3JhcHBlclN0ciksXG4gICAgICAgIGVsUGFyZW50ICA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICB3cmFwcGVyRWwuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIGVsUGFyZW50LmFwcGVuZENoaWxkKHdyYXBwZXJFbCk7XG4gICAgcmV0dXJuIHdyYXBwZXJFbDtcbiAgfSxcblxuICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE1MzI5MTY3L2Nsb3Nlc3QtYW5jZXN0b3ItbWF0Y2hpbmctc2VsZWN0b3ItdXNpbmctbmF0aXZlLWRvbVxuICBjbG9zZXN0OiBmdW5jdGlvbiAoZWwsIHNlbGVjdG9yKSB7XG4gICAgdmFyIG1hdGNoZXNTZWxlY3RvciA9IGVsLm1hdGNoZXMgfHwgZWwud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLm1vek1hdGNoZXNTZWxlY3RvciB8fCBlbC5tc01hdGNoZXNTZWxlY3RvcjtcbiAgICB3aGlsZSAoZWwpIHtcbiAgICAgIGlmIChtYXRjaGVzU2VsZWN0b3IuYmluZChlbCkoc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsID0gZWwucGFyZW50RWxlbWVudDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8vIGZyb20geW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbVxuICBoYXNDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgICBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3IFJlZ0V4cCgnKF58ICknICsgY2xhc3NOYW1lICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xuICAgIH1cbiAgfSxcblxuICBhZGRDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0KSB7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfVxuICB9LFxuXG4gIHJlbW92ZUNsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NOYW1lID0gZWwuY2xhc3NOYW1lLnJlcGxhY2UobmV3IFJlZ0V4cCgnKF58XFxcXGIpJyArIGNsYXNzTmFtZS5zcGxpdCgnICcpLmpvaW4oJ3wnKSArICcoXFxcXGJ8JCknLCAnZ2knKSwgJyAnKTtcbiAgICB9XG4gIH0sXG5cbiAgdG9nZ2xlQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKHRoaXMuaGFzQ2xhc3MoZWwsIGNsYXNzTmFtZSkpIHtcbiAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkQ2xhc3MoZWwsIGNsYXNzTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIEZyb20gaW1wcmVzcy5qc1xuICBhcHBseUNTUzogZnVuY3Rpb24gKGVsLCBwcm9wcykge1xuICAgIHZhciBrZXksIHBrZXk7XG4gICAgZm9yIChrZXkgaW4gcHJvcHMpIHtcbiAgICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGVsLnN0eWxlW2tleV0gPSBwcm9wc1trZXldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZWw7XG4gIH0sXG5cbiAgLy8gZnJvbSBpbXByZXNzLmpzXG4gIC8vIGBjb21wdXRlV2luZG93U2NhbGVgIGNvdW50cyB0aGUgc2NhbGUgZmFjdG9yIGJldHdlZW4gd2luZG93IHNpemUgYW5kIHNpemVcbiAgLy8gZGVmaW5lZCBmb3IgdGhlIHByZXNlbnRhdGlvbiBpbiB0aGUgY29uZmlnLlxuICBjb21wdXRlV2luZG93U2NhbGU6IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICB2YXIgaFNjYWxlID0gd2luZG93LmlubmVySGVpZ2h0IC8gY29uZmlnLmhlaWdodCxcbiAgICAgICAgd1NjYWxlID0gd2luZG93LmlubmVyV2lkdGggLyBjb25maWcud2lkdGgsXG4gICAgICAgIHNjYWxlICA9IGhTY2FsZSA+IHdTY2FsZSA/IHdTY2FsZSA6IGhTY2FsZTtcblxuICAgIGlmIChjb25maWcubWF4U2NhbGUgJiYgc2NhbGUgPiBjb25maWcubWF4U2NhbGUpIHtcbiAgICAgIHNjYWxlID0gY29uZmlnLm1heFNjYWxlO1xuICAgIH1cblxuICAgIGlmIChjb25maWcubWluU2NhbGUgJiYgc2NhbGUgPCBjb25maWcubWluU2NhbGUpIHtcbiAgICAgIHNjYWxlID0gY29uZmlnLm1pblNjYWxlO1xuICAgIH1cblxuICAgIHJldHVybiBzY2FsZTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGFuIGFycmF5IG9mIGVsZW1lbnRzIGluIHRoZSBjb250YWluZXIgcmV0dXJuZWQgYXMgQXJyYXkgaW5zdGVhZCBvZiBhIE5vZGUgbGlzdFxuICAgKi9cbiAgZ2V0UVNFbGVtZW50c0FzQXJyYXk6IGZ1bmN0aW9uIChlbCwgY2xzKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoY2xzKSwgMCk7XG4gIH0sXG5cbiAgY2VudGVyRWxlbWVudEluVmlld1BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciB2cEggPSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgICAgIHZwVyA9IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICBlbFIgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgZWxIID0gZWxSLmhlaWdodCxcbiAgICAgICAgZWxXID0gZWxSLndpZHRoO1xuXG4gICAgZWwuc3R5bGUubGVmdCA9ICh2cFcgLyAyKSAtIChlbFcgLyAyKSArICdweCc7XG4gICAgZWwuc3R5bGUudG9wICA9ICh2cEggLyAyKSAtIChlbEggLyAyKSArICdweCc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb2JqZWN0IGZyb20gdGhlIG5hbWUgKG9yIGlkKSBhdHRyaWJzIGFuZCBkYXRhIG9mIGEgZm9ybVxuICAgKiBAcGFyYW0gZWxcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBjYXB0dXJlRm9ybURhdGE6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciBkYXRhT2JqID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgICAgdGV4dGFyZWFFbHMsIGlucHV0RWxzLCBzZWxlY3RFbHM7XG5cbiAgICB0ZXh0YXJlYUVscyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3RleHRhcmVhJyksIDApO1xuICAgIGlucHV0RWxzICAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgnaW5wdXQnKSwgMCk7XG4gICAgc2VsZWN0RWxzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCdzZWxlY3QnKSwgMCk7XG5cbiAgICB0ZXh0YXJlYUVscy5mb3JFYWNoKGdldElucHV0Rm9ybURhdGEpO1xuICAgIGlucHV0RWxzLmZvckVhY2goZ2V0SW5wdXRGb3JtRGF0YSk7XG4gICAgc2VsZWN0RWxzLmZvckVhY2goZ2V0U2VsZWN0Rm9ybURhdGEpO1xuXG4gICAgcmV0dXJuIGRhdGFPYmo7XG5cbiAgICBmdW5jdGlvbiBnZXRJbnB1dEZvcm1EYXRhKGZvcm1FbCkge1xuICAgICAgZGF0YU9ialtnZXRFbE5hbWVPcklEKGZvcm1FbCldID0gZm9ybUVsLnZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNlbGVjdEZvcm1EYXRhKGZvcm1FbCkge1xuICAgICAgdmFyIHNlbCA9IGZvcm1FbC5zZWxlY3RlZEluZGV4LCB2YWwgPSAnJztcbiAgICAgIGlmIChzZWwgPj0gMCkge1xuICAgICAgICB2YWwgPSBmb3JtRWwub3B0aW9uc1tzZWxdLnZhbHVlO1xuICAgICAgfVxuICAgICAgZGF0YU9ialtnZXRFbE5hbWVPcklEKGZvcm1FbCldID0gdmFsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEVsTmFtZU9ySUQoZm9ybUVsKSB7XG4gICAgICB2YXIgbmFtZSA9ICdub19uYW1lJztcbiAgICAgIGlmIChmb3JtRWwuZ2V0QXR0cmlidXRlKCduYW1lJykpIHtcbiAgICAgICAgbmFtZSA9IGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKTtcbiAgICAgIH0gZWxzZSBpZiAoZm9ybUVsLmdldEF0dHJpYnV0ZSgnaWQnKSkge1xuICAgICAgICBuYW1lID0gZm9ybUVsLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYW1lO1xuICAgIH1cbiAgfVxuXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgc2hhcmVkIDNkIHBlcnNwZWN0aXZlIGZvciBhbGwgY2hpbGRyZW5cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBhcHBseTNEVG9Db250YWluZXI6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICBwZXJzcGVjdGl2ZSAgICAgIDogODAwLFxuICAgICAgICBwZXJzcGVjdGl2ZU9yaWdpbjogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGx5IGJhc2ljIENTUyBwcm9wc1xuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5M0RUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB0cmFuc2Zvcm1TdHlsZSAgICA6IFwicHJlc2VydmUtM2RcIixcbiAgICAgICAgYmFja2ZhY2VWaXNpYmlsaXR5OiBcImhpZGRlblwiLFxuICAgICAgICB0cmFuc2Zvcm1PcmlnaW4gICA6ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBcHBseSBiYXNpYyAzZCBwcm9wcyBhbmQgc2V0IHVuaXF1ZSBwZXJzcGVjdGl2ZSBmb3IgY2hpbGRyZW5cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBhcHBseVVuaXF1ZTNEVG9FbGVtZW50OiBmdW5jdGlvbiAoZWwpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGVsLCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgdHJhbnNmb3JtU3R5bGUgICAgICA6IFwicHJlc2VydmUtM2RcIixcbiAgICAgICAgYmFja2ZhY2VWaXNpYmlsaXR5ICA6IFwiaGlkZGVuXCIsXG4gICAgICAgIHRyYW5zZm9ybVBlcnNwZWN0aXZlOiA2MDAsXG4gICAgICAgIHRyYW5zZm9ybU9yaWdpbiAgICAgOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG59O1xuIiwidmFyIE1lc3NhZ2VCb3hDcmVhdG9yID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfbWVzc2FnZUJveFZpZXcgPSByZXF1aXJlKCcuL01lc3NhZ2VCb3hWaWV3Jyk7XG5cbiAgZnVuY3Rpb24gYWxlcnQodGl0bGUsIG1lc3NhZ2UsIG1vZGFsLCBjYikge1xuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwPicgKyBtZXNzYWdlICsgJzwvcD4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5EQU5HRVIsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdDbG9zZScsXG4gICAgICAgICAgaWQgICAgIDogJ0Nsb3NlJyxcbiAgICAgICAgICB0eXBlICAgOiAnJyxcbiAgICAgICAgICBpY29uICAgOiAndGltZXMnLFxuICAgICAgICAgIG9uQ2xpY2s6IGNiXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpcm0odGl0bGUsIG1lc3NhZ2UsIG9rQ0IsIG1vZGFsKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHA+JyArIG1lc3NhZ2UgKyAnPC9wPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdQcm9jZWVkJyxcbiAgICAgICAgICBpZCAgICAgOiAncHJvY2VlZCcsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbXB0KHRpdGxlLCBtZXNzYWdlLCBva0NCLCBtb2RhbCkge1xuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwIGNsYXNzPVwidGV4dC1jZW50ZXIgcGFkZGluZy1ib3R0b20tZG91YmxlXCI+JyArIG1lc3NhZ2UgKyAnPC9wPjx0ZXh0YXJlYSBuYW1lPVwicmVzcG9uc2VcIiBjbGFzcz1cImlucHV0LXRleHRcIiB0eXBlPVwidGV4dFwiIHN0eWxlPVwid2lkdGg6NDAwcHg7IGhlaWdodDo3NXB4OyByZXNpemU6IG5vbmVcIiBhdXRvZm9jdXM9XCJ0cnVlXCI+PC90ZXh0YXJlYT4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA0NTAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXG4gICAgICAgICAgaWQgICA6ICdDYW5jZWwnLFxuICAgICAgICAgIHR5cGUgOiAnbmVnYXRpdmUnLFxuICAgICAgICAgIGljb24gOiAndGltZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnUHJvY2VlZCcsXG4gICAgICAgICAgaWQgICAgIDogJ3Byb2NlZWQnLFxuICAgICAgICAgIHR5cGUgICA6ICdwb3NpdGl2ZScsXG4gICAgICAgICAgaWNvbiAgIDogJ2NoZWNrJyxcbiAgICAgICAgICBvbkNsaWNrOiBva0NCXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNob2ljZSh0aXRsZSwgbWVzc2FnZSwgc2VsZWN0aW9ucywgb2tDQiwgbW9kYWwpIHtcbiAgICB2YXIgc2VsZWN0SFRNTCA9ICc8c2VsZWN0IGNsYXNzPVwic3BhY2VkXCIgc3R5bGU9XCJ3aWR0aDo0NTBweDtoZWlnaHQ6MjAwcHhcIiBuYW1lPVwic2VsZWN0aW9uXCIgYXV0b2ZvY3VzPVwidHJ1ZVwiIHNpemU9XCIyMFwiPic7XG5cbiAgICBzZWxlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24gKG9wdCkge1xuICAgICAgc2VsZWN0SFRNTCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBvcHQudmFsdWUgKyAnXCIgJyArIChvcHQuc2VsZWN0ZWQgPT09ICd0cnVlJyA/ICdzZWxlY3RlZCcgOiAnJykgKyAnPicgKyBvcHQubGFiZWwgKyAnPC9vcHRpb24+JztcbiAgICB9KTtcblxuICAgIHNlbGVjdEhUTUwgKz0gJzwvc2VsZWN0Pic7XG5cbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cCBjbGFzcz1cInRleHQtY2VudGVyIHBhZGRpbmctYm90dG9tLWRvdWJsZVwiPicgKyBtZXNzYWdlICsgJzwvcD48ZGl2IGNsYXNzPVwidGV4dC1jZW50ZXJcIj4nICsgc2VsZWN0SFRNTCArICc8L2Rpdj4nLFxuICAgICAgdHlwZSAgIDogX21lc3NhZ2VCb3hWaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbW9kYWwgIDogbW9kYWwsXG4gICAgICB3aWR0aCAgOiA1MDAsXG4gICAgICBidXR0b25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXG4gICAgICAgICAgaWQgICA6ICdDYW5jZWwnLFxuICAgICAgICAgIHR5cGUgOiAnbmVnYXRpdmUnLFxuICAgICAgICAgIGljb24gOiAndGltZXMnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbCAgOiAnT0snLFxuICAgICAgICAgIGlkICAgICA6ICdvaycsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBhbGVydCAgOiBhbGVydCxcbiAgICBjb25maXJtOiBjb25maXJtLFxuICAgIHByb21wdCA6IHByb21wdCxcbiAgICBjaG9pY2UgOiBjaG9pY2VcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlQm94Q3JlYXRvcigpOyIsInZhciBNZXNzYWdlQm94VmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX2NoaWxkcmVuICAgICAgICAgICAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgICAgICAgICAgID0gMCxcbiAgICAgIF9oaWdoZXN0WiAgICAgICAgICAgICAgID0gMTAwMCxcbiAgICAgIF9kZWZhdWx0V2lkdGggICAgICAgICAgID0gNDAwLFxuICAgICAgX3R5cGVzICAgICAgICAgICAgICAgICAgPSB7XG4gICAgICAgIERFRkFVTFQgICAgOiAnZGVmYXVsdCcsXG4gICAgICAgIElORk9STUFUSU9OOiAnaW5mb3JtYXRpb24nLFxuICAgICAgICBTVUNDRVNTICAgIDogJ3N1Y2Nlc3MnLFxuICAgICAgICBXQVJOSU5HICAgIDogJ3dhcm5pbmcnLFxuICAgICAgICBEQU5HRVIgICAgIDogJ2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfdHlwZVN0eWxlTWFwICAgICAgICAgICA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICdtZXNzYWdlYm94X19pbmZvcm1hdGlvbicsXG4gICAgICAgICdzdWNjZXNzJyAgICA6ICdtZXNzYWdlYm94X19zdWNjZXNzJyxcbiAgICAgICAgJ3dhcm5pbmcnICAgIDogJ21lc3NhZ2Vib3hfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAnbWVzc2FnZWJveF9fZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF9tb3VudFBvaW50LFxuICAgICAgX2J1dHRvbkljb25UZW1wbGF0ZUlEICAgPSAnbWVzc2FnZWJveC0tYnV0dG9uLWljb24nLFxuICAgICAgX2J1dHRvbk5vSWNvblRlbXBsYXRlSUQgPSAnbWVzc2FnZWJveC0tYnV0dG9uLW5vaWNvbicsXG4gICAgICBfdGVtcGxhdGUgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX21vZGFsICAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL01vZGFsQ292ZXJWaWV3LmpzJyksXG4gICAgICBfYnJvd3NlckluZm8gICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyksXG4gICAgICBfZG9tVXRpbHMgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyksXG4gICAgICBfY29tcG9uZW50VXRpbHMgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMnKTtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgc2V0IHRoZSBtb3VudCBwb2ludCAvIGJveCBjb250YWluZXJcbiAgICogQHBhcmFtIGVsSURcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgbmV3IG1lc3NhZ2UgYm94XG4gICAqIEBwYXJhbSBpbml0T2JqXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gYWRkKGluaXRPYmopIHtcbiAgICB2YXIgdHlwZSAgID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxULFxuICAgICAgICBib3hPYmogPSBjcmVhdGVCb3hPYmplY3QoaW5pdE9iaik7XG5cbiAgICAvLyBzZXR1cFxuICAgIF9jaGlsZHJlbi5wdXNoKGJveE9iaik7XG4gICAgX21vdW50UG9pbnQuYXBwZW5kQ2hpbGQoYm94T2JqLmVsZW1lbnQpO1xuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBib3hPYmouZWxlbWVudCk7XG4gICAgY29uZmlndXJlQnV0dG9ucyhib3hPYmopO1xuXG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5VW5pcXVlM0RUb0VsZW1lbnQoYm94T2JqLmVsZW1lbnQpO1xuXG4gICAgLy8gU2V0IDNkIENTUyBwcm9wcyBmb3IgaW4vb3V0IHRyYW5zaXRpb25cbiAgICBUd2VlbkxpdGUuc2V0KGJveE9iai5lbGVtZW50LCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgekluZGV4OiBfaGlnaGVzdFosXG4gICAgICAgIHdpZHRoIDogaW5pdE9iai53aWR0aCA/IGluaXRPYmoud2lkdGggOiBfZGVmYXVsdFdpZHRoXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBjZW50ZXIgYWZ0ZXIgd2lkdGggaGFzIGJlZW4gc2V0XG4gICAgX2RvbVV0aWxzLmNlbnRlckVsZW1lbnRJblZpZXdQb3J0KGJveE9iai5lbGVtZW50KTtcblxuICAgIC8vIE1ha2UgaXQgZHJhZ2dhYmxlXG4gICAgRHJhZ2dhYmxlLmNyZWF0ZSgnIycgKyBib3hPYmouaWQsIHtcbiAgICAgIGJvdW5kcyA6IHdpbmRvdyxcbiAgICAgIG9uUHJlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2hpZ2hlc3RaID0gRHJhZ2dhYmxlLnpJbmRleDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFNob3cgaXRcbiAgICB0cmFuc2l0aW9uSW4oYm94T2JqLmVsZW1lbnQpO1xuXG4gICAgLy8gU2hvdyB0aGUgbW9kYWwgY292ZXJcbiAgICBpZiAoaW5pdE9iai5tb2RhbCkge1xuICAgICAgX21vZGFsLnNob3dOb25EaXNtaXNzYWJsZSh0cnVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYm94T2JqLmlkO1xuICB9XG5cbiAgLyoqXG4gICAqIEFzc2lnbiBhIHR5cGUgY2xhc3MgdG8gaXRcbiAgICogQHBhcmFtIHR5cGVcbiAgICogQHBhcmFtIGVsZW1lbnRcbiAgICovXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGhlIG9iamVjdCBmb3IgYSBib3hcbiAgICogQHBhcmFtIGluaXRPYmpcbiAgICogQHJldHVybnMge3tkYXRhT2JqOiAqLCBpZDogc3RyaW5nLCBtb2RhbDogKCp8Ym9vbGVhbiksIGVsZW1lbnQ6ICosIHN0cmVhbXM6IEFycmF5fX1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUJveE9iamVjdChpbml0T2JqKSB7XG4gICAgdmFyIGlkICA9ICdqc19fbWVzc2FnZWJveC0nICsgKF9jb3VudGVyKyspLnRvU3RyaW5nKCksXG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICBkYXRhT2JqOiBpbml0T2JqLFxuICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgIG1vZGFsICA6IGluaXRPYmoubW9kYWwsXG4gICAgICAgICAgZWxlbWVudDogX3RlbXBsYXRlLmFzRWxlbWVudCgnbWVzc2FnZWJveC0tZGVmYXVsdCcsIHtcbiAgICAgICAgICAgIGlkICAgICA6IGlkLFxuICAgICAgICAgICAgdGl0bGUgIDogaW5pdE9iai50aXRsZSxcbiAgICAgICAgICAgIGNvbnRlbnQ6IGluaXRPYmouY29udGVudFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHN0cmVhbXM6IFtdXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB1cCB0aGUgYnV0dG9uc1xuICAgKiBAcGFyYW0gYm94T2JqXG4gICAqL1xuICBmdW5jdGlvbiBjb25maWd1cmVCdXR0b25zKGJveE9iaikge1xuICAgIHZhciBidXR0b25EYXRhID0gYm94T2JqLmRhdGFPYmouYnV0dG9ucztcblxuICAgIC8vIGRlZmF1bHQgYnV0dG9uIGlmIG5vbmVcbiAgICBpZiAoIWJ1dHRvbkRhdGEpIHtcbiAgICAgIGJ1dHRvbkRhdGEgPSBbe1xuICAgICAgICBsYWJlbDogJ0Nsb3NlJyxcbiAgICAgICAgdHlwZSA6ICcnLFxuICAgICAgICBpY29uIDogJ3RpbWVzJyxcbiAgICAgICAgaWQgICA6ICdkZWZhdWx0LWNsb3NlJ1xuICAgICAgfV07XG4gICAgfVxuXG4gICAgdmFyIGJ1dHRvbkNvbnRhaW5lciA9IGJveE9iai5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mb290ZXItYnV0dG9ucycpO1xuXG4gICAgX2RvbVV0aWxzLnJlbW92ZUFsbEVsZW1lbnRzKGJ1dHRvbkNvbnRhaW5lcik7XG5cbiAgICBidXR0b25EYXRhLmZvckVhY2goZnVuY3Rpb24gbWFrZUJ1dHRvbihidXR0b25PYmopIHtcbiAgICAgIGJ1dHRvbk9iai5pZCA9IGJveE9iai5pZCArICctYnV0dG9uLScgKyBidXR0b25PYmouaWQ7XG5cbiAgICAgIHZhciBidXR0b25FbDtcblxuICAgICAgaWYgKGJ1dHRvbk9iai5oYXNPd25Qcm9wZXJ0eSgnaWNvbicpKSB7XG4gICAgICAgIGJ1dHRvbkVsID0gX3RlbXBsYXRlLmFzRWxlbWVudChfYnV0dG9uSWNvblRlbXBsYXRlSUQsIGJ1dHRvbk9iaik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBidXR0b25FbCA9IF90ZW1wbGF0ZS5hc0VsZW1lbnQoX2J1dHRvbk5vSWNvblRlbXBsYXRlSUQsIGJ1dHRvbk9iaik7XG4gICAgICB9XG5cbiAgICAgIGJ1dHRvbkNvbnRhaW5lci5hcHBlbmRDaGlsZChidXR0b25FbCk7XG5cbiAgICAgIHZhciBidG5TdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChidXR0b25FbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSlcbiAgICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKGJ1dHRvbk9iai5oYXNPd25Qcm9wZXJ0eSgnb25DbGljaycpKSB7XG4gICAgICAgICAgICBpZiAoYnV0dG9uT2JqLm9uQ2xpY2spIHtcbiAgICAgICAgICAgICAgYnV0dG9uT2JqLm9uQ2xpY2suY2FsbCh0aGlzLCBjYXB0dXJlRm9ybURhdGEoYm94T2JqLmlkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbW92ZShib3hPYmouaWQpO1xuICAgICAgICB9KTtcbiAgICAgIGJveE9iai5zdHJlYW1zLnB1c2goYnRuU3RyZWFtKTtcbiAgICB9KTtcblxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgZGF0YSBmcm9tIHRoZSBmb3JtIG9uIHRoZSBib3ggY29udGVudHNcbiAgICogQHBhcmFtIGJveElEXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY2FwdHVyZUZvcm1EYXRhKGJveElEKSB7XG4gICAgcmV0dXJuIF9kb21VdGlscy5jYXB0dXJlRm9ybURhdGEoZ2V0T2JqQnlJRChib3hJRCkuZWxlbWVudCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgYm94IGZyb20gdGhlIHNjcmVlbiAvIGNvbnRhaW5lclxuICAgKiBAcGFyYW0gaWRcbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZShpZCkge1xuICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQoaWQpLFxuICAgICAgICBib3hPYmo7XG5cbiAgICBpZiAoaWR4ID4gLTEpIHtcbiAgICAgIGJveE9iaiA9IF9jaGlsZHJlbltpZHhdO1xuICAgICAgdHJhbnNpdGlvbk91dChib3hPYmouZWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNob3cgdGhlIGJveFxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMCwge2FscGhhOiAwLCByb3RhdGlvblg6IDQ1LCBzY2FsZTogMn0pO1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC41LCB7XG4gICAgICBhbHBoYSAgICA6IDEsXG4gICAgICByb3RhdGlvblg6IDAsXG4gICAgICBzY2FsZSAgICA6IDEsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgYm94XG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4yNSwge1xuICAgICAgYWxwaGEgICAgOiAwLFxuICAgICAgcm90YXRpb25YOiAtNDUsXG4gICAgICBzY2FsZSAgICA6IDAuMjUsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZUluLCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbiB1cCBhZnRlciB0aGUgdHJhbnNpdGlvbiBvdXQgYW5pbWF0aW9uXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpIHtcbiAgICB2YXIgaWR4ICAgID0gZ2V0T2JqSW5kZXhCeUlEKGVsLmdldEF0dHJpYnV0ZSgnaWQnKSksXG4gICAgICAgIGJveE9iaiA9IF9jaGlsZHJlbltpZHhdO1xuXG4gICAgYm94T2JqLnN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICBzdHJlYW0uZGlzcG9zZSgpO1xuICAgIH0pO1xuXG4gICAgRHJhZ2dhYmxlLmdldCgnIycgKyBib3hPYmouaWQpLmRpc2FibGUoKTtcblxuICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKGVsKTtcblxuICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG5cbiAgICBjaGVja01vZGFsU3RhdHVzKCk7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIGFueSBvcGVuIGJveGVzIGhhdmUgbW9kYWwgdHJ1ZVxuICAgKi9cbiAgZnVuY3Rpb24gY2hlY2tNb2RhbFN0YXR1cygpIHtcbiAgICB2YXIgaXNNb2RhbCA9IGZhbHNlO1xuXG4gICAgX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGJveE9iaikge1xuICAgICAgaWYgKGJveE9iai5tb2RhbCA9PT0gdHJ1ZSkge1xuICAgICAgICBpc01vZGFsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICghaXNNb2RhbCkge1xuICAgICAgX21vZGFsLmhpZGUodHJ1ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFV0aWxpdHkgdG8gZ2V0IHRoZSBib3ggb2JqZWN0IGluZGV4IGJ5IElEXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0T2JqSW5kZXhCeUlEKGlkKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQuaWQ7XG4gICAgfSkuaW5kZXhPZihpZCk7XG4gIH1cblxuICAvKipcbiAgICogVXRpbGl0eSB0byBnZXQgdGhlIGJveCBvYmplY3QgYnkgSURcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmpCeUlEKGlkKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQuaWQgPT09IGlkO1xuICAgIH0pWzBdO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZUJveFZpZXcoKTsiLCJ2YXIgTW9kYWxDb3ZlclZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tb3VudFBvaW50ICA9IGRvY3VtZW50LFxuICAgICAgX21vZGFsQ292ZXJFbCxcbiAgICAgIF9tb2RhbEJhY2tncm91bmRFbCxcbiAgICAgIF9tb2RhbENsb3NlQnV0dG9uRWwsXG4gICAgICBfbW9kYWxDbGlja1N0cmVhbSxcbiAgICAgIF9pc1Zpc2libGUsXG4gICAgICBfbm90RGlzbWlzc2libGUsXG4gICAgICBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG5cbiAgICBfaXNWaXNpYmxlID0gdHJ1ZTtcblxuICAgIF9tb2RhbENvdmVyRWwgICAgICAgPSBfbW91bnRQb2ludC5nZXRFbGVtZW50QnlJZCgnbW9kYWxfX2NvdmVyJyk7XG4gICAgX21vZGFsQmFja2dyb3VuZEVsICA9IF9tb3VudFBvaW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbF9fYmFja2dyb3VuZCcpO1xuICAgIF9tb2RhbENsb3NlQnV0dG9uRWwgPSBfbW91bnRQb2ludC5xdWVyeVNlbGVjdG9yKCcubW9kYWxfX2Nsb3NlLWJ1dHRvbicpO1xuXG4gICAgdmFyIG1vZGFsQkdDbGljayAgICAgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChfbW9kYWxCYWNrZ3JvdW5kRWwsIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpLFxuICAgICAgICBtb2RhbEJ1dHRvbkNsaWNrID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoX21vZGFsQ2xvc2VCdXR0b25FbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSk7XG5cbiAgICBfbW9kYWxDbGlja1N0cmVhbSA9IFJ4Lk9ic2VydmFibGUubWVyZ2UobW9kYWxCR0NsaWNrLCBtb2RhbEJ1dHRvbkNsaWNrKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uTW9kYWxDbGljaygpO1xuICAgICAgfSk7XG5cbiAgICBoaWRlKGZhbHNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElzVmlzaWJsZSgpIHtcbiAgICByZXR1cm4gX2lzVmlzaWJsZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uTW9kYWxDbGljaygpIHtcbiAgICBpZiAoX25vdERpc21pc3NpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGhpZGUodHJ1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKSB7XG4gICAgX2lzVmlzaWJsZSAgID0gdHJ1ZTtcbiAgICB2YXIgZHVyYXRpb24gPSBzaG91bGRBbmltYXRlID8gMC4yNSA6IDA7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhbHBoYTogMSxcbiAgICAgIGVhc2UgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3coc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NpYmxlID0gZmFsc2U7XG5cbiAgICBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKTtcblxuICAgIFR3ZWVuTGl0ZS5zZXQoX21vZGFsQ2xvc2VCdXR0b25FbCwge3NjYWxlOiAyLCBhbHBoYTogMH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAxLCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBzY2FsZSAgICA6IDEsXG4gICAgICBlYXNlICAgICA6IEJvdW5jZS5lYXNlT3V0LFxuICAgICAgZGVsYXkgICAgOiAxXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQSAnaGFyZCcgbW9kYWwgdmlldyBjYW5ub3QgYmUgZGlzbWlzc2VkIHdpdGggYSBjbGljaywgbXVzdCBiZSB2aWEgY29kZVxuICAgKiBAcGFyYW0gc2hvdWxkQW5pbWF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd05vbkRpc21pc3NhYmxlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoX2lzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ub3REaXNtaXNzaWJsZSA9IHRydWU7XG5cbiAgICBzaG93TW9kYWxDb3ZlcihzaG91bGRBbmltYXRlKTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgMCwge2F1dG9BbHBoYTogMH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZShzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKCFfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9pc1Zpc2libGUgICAgICA9IGZhbHNlO1xuICAgIF9ub3REaXNtaXNzaWJsZSA9IGZhbHNlO1xuICAgIHZhciBkdXJhdGlvbiAgICA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKF9tb2RhbENsb3NlQnV0dG9uRWwpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDb3ZlckVsLCBkdXJhdGlvbiwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ2xvc2VCdXR0b25FbCwgZHVyYXRpb24gLyAyLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRPcGFjaXR5KG9wYWNpdHkpIHtcbiAgICBpZiAob3BhY2l0eSA8IDAgfHwgb3BhY2l0eSA+IDEpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdudWRvcnUvY29tcG9uZW50L01vZGFsQ292ZXJWaWV3OiBzZXRPcGFjaXR5OiBvcGFjaXR5IHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kIDEnKTtcbiAgICAgIG9wYWNpdHkgPSAxO1xuICAgIH1cbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCAwLjI1LCB7XG4gICAgICBhbHBoYTogb3BhY2l0eSxcbiAgICAgIGVhc2UgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldENvbG9yKHIsIGcsIGIpIHtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQmFja2dyb3VuZEVsLCAwLjI1LCB7XG4gICAgICBiYWNrZ3JvdW5kQ29sb3I6ICdyZ2IoJyArIHIgKyAnLCcgKyBnICsgJywnICsgYiArICcpJyxcbiAgICAgIGVhc2UgICAgICAgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemUgICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBzaG93ICAgICAgICAgICAgICA6IHNob3csXG4gICAgc2hvd05vbkRpc21pc3NhYmxlOiBzaG93Tm9uRGlzbWlzc2FibGUsXG4gICAgaGlkZSAgICAgICAgICAgICAgOiBoaWRlLFxuICAgIHZpc2libGUgICAgICAgICAgIDogZ2V0SXNWaXNpYmxlLFxuICAgIHNldE9wYWNpdHkgICAgICAgIDogc2V0T3BhY2l0eSxcbiAgICBzZXRDb2xvciAgICAgICAgICA6IHNldENvbG9yXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWxDb3ZlclZpZXcoKTsiLCJ2YXIgVG9hc3RWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgICAgICAgICAgID0gMCxcbiAgICAgIF9kZWZhdWx0RXhwaXJlRHVyYXRpb24gPSA3MDAwLFxuICAgICAgX3R5cGVzICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgPSB7XG4gICAgICAgICdkZWZhdWx0JyAgICA6ICcnLFxuICAgICAgICAnaW5mb3JtYXRpb24nOiAndG9hc3RfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ3RvYXN0X19zdWNjZXNzJyxcbiAgICAgICAgJ3dhcm5pbmcnICAgIDogJ3RvYXN0X193YXJuaW5nJyxcbiAgICAgICAgJ2RhbmdlcicgICAgIDogJ3RvYXN0X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfdGVtcGxhdGUgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfYnJvd3NlckluZm8gICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpLFxuICAgICAgX2NvbXBvbmVudFV0aWxzICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL1RocmVlRFRyYW5zZm9ybXMuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLy9vYmoudGl0bGUsIG9iai5jb250ZW50LCBvYmoudHlwZVxuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIGluaXRPYmoudHlwZSA9IGluaXRPYmoudHlwZSB8fCBfdHlwZXMuREVGQVVMVDtcblxuICAgIHZhciB0b2FzdE9iaiA9IGNyZWF0ZVRvYXN0T2JqZWN0KGluaXRPYmoudGl0bGUsIGluaXRPYmoubWVzc2FnZSk7XG5cbiAgICBfY2hpbGRyZW4ucHVzaCh0b2FzdE9iaik7XG5cbiAgICBfbW91bnRQb2ludC5pbnNlcnRCZWZvcmUodG9hc3RPYmouZWxlbWVudCwgX21vdW50UG9pbnQuZmlyc3RDaGlsZCk7XG5cbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQoaW5pdE9iai50eXBlLCB0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIF9jb21wb25lbnRVdGlscy5hcHBseTNEVG9Db250YWluZXIoX21vdW50UG9pbnQpO1xuICAgIF9jb21wb25lbnRVdGlscy5hcHBseTNEVG9FbGVtZW50KHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgdmFyIGNsb3NlQnRuICAgICAgICAgPSB0b2FzdE9iai5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy50b2FzdF9faXRlbS1jb250cm9scyA+IGJ1dHRvbicpLFxuICAgICAgICBjbG9zZUJ0blN0ZWFtICAgID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQoY2xvc2VCdG4sIF9icm93c2VySW5mby5tb3VzZUNsaWNrRXZ0U3RyKCkpLFxuICAgICAgICBleHBpcmVUaW1lU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5pbnRlcnZhbChfZGVmYXVsdEV4cGlyZUR1cmF0aW9uKTtcblxuICAgIHRvYXN0T2JqLmRlZmF1bHRCdXR0b25TdHJlYW0gPSBSeC5PYnNlcnZhYmxlLm1lcmdlKGNsb3NlQnRuU3RlYW0sIGV4cGlyZVRpbWVTdHJlYW0pLnRha2UoMSlcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKCkge1xuICAgICAgICByZW1vdmUodG9hc3RPYmouaWQpO1xuICAgICAgfSk7XG5cbiAgICB0cmFuc2l0aW9uSW4odG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICByZXR1cm4gdG9hc3RPYmouaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVUb2FzdE9iamVjdCh0aXRsZSwgbWVzc2FnZSkge1xuICAgIHZhciBpZCAgPSAnanNfX3RvYXN0LXRvYXN0aXRlbS0nICsgKF9jb3VudGVyKyspLnRvU3RyaW5nKCksXG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICBpZCAgICAgICAgICAgICAgICAgOiBpZCxcbiAgICAgICAgICBlbGVtZW50ICAgICAgICAgICAgOiBfdGVtcGxhdGUuYXNFbGVtZW50KCdjb21wb25lbnQtLXRvYXN0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBkZWZhdWx0QnV0dG9uU3RyZWFtOiBudWxsXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIHRvYXN0O1xuXG4gICAgaWYgKGlkeCA+IC0xKSB7XG4gICAgICB0b2FzdCA9IF9jaGlsZHJlbltpZHhdO1xuICAgICAgcmVhcnJhbmdlKGlkeCk7XG4gICAgICB0cmFuc2l0aW9uT3V0KHRvYXN0LmVsZW1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMCwge2FscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAxLCB7YWxwaGE6IDEsIGVhc2U6IFF1YWQuZWFzZU91dH0pO1xuICAgIHJlYXJyYW5nZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4yNSwge1xuICAgICAgcm90YXRpb25YOiAtNDUsXG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZUluLCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVHJhbnNpdGlvbk91dENvbXBsZXRlKGVsKSB7XG4gICAgdmFyIGlkeCAgICAgICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgdG9hc3RPYmogICA9IF9jaGlsZHJlbltpZHhdO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbS5kaXNwb3NlKCk7XG5cbiAgICBfbW91bnRQb2ludC5yZW1vdmVDaGlsZChlbCk7XG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYXJyYW5nZShpZ25vcmUpIHtcbiAgICB2YXIgaSA9IF9jaGlsZHJlbi5sZW5ndGggLSAxLFxuICAgICAgICBjdXJyZW50LFxuICAgICAgICB5ID0gMDtcblxuICAgIGZvciAoOyBpID4gLTE7IGktLSkge1xuICAgICAgaWYgKGkgPT09IGlnbm9yZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnQgPSBfY2hpbGRyZW5baV07XG4gICAgICBUd2VlbkxpdGUudG8oY3VycmVudC5lbGVtZW50LCAwLjc1LCB7eTogeSwgZWFzZTogQm91bmNlLmVhc2VPdXR9KTtcbiAgICAgIHkgKz0gMTAgKyBjdXJyZW50LmVsZW1lbnQuY2xpZW50SGVpZ2h0O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakluZGV4QnlJRChpZCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLmlkO1xuICAgIH0pLmluZGV4T2YoaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VHlwZXMoKSB7XG4gICAgcmV0dXJuIF90eXBlcztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZTogaW5pdGlhbGl6ZSxcbiAgICBhZGQgICAgICAgOiBhZGQsXG4gICAgcmVtb3ZlICAgIDogcmVtb3ZlLFxuICAgIHR5cGUgICAgICA6IGdldFR5cGVzXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG9hc3RWaWV3KCk7IiwidmFyIFRvb2xUaXBWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgID0gW10sXG4gICAgICBfY291bnRlciAgICAgID0gMCxcbiAgICAgIF9kZWZhdWx0V2lkdGggPSAyMDAsXG4gICAgICBfdHlwZXMgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInLFxuICAgICAgICBDT0FDSE1BUksgIDogJ2NvYWNobWFyaydcbiAgICAgIH0sXG4gICAgICBfdHlwZVN0eWxlTWFwID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ3Rvb2x0aXBfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ3Rvb2x0aXBfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9vbHRpcF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICd0b29sdGlwX19kYW5nZXInLFxuICAgICAgICAnY29hY2htYXJrJyAgOiAndG9vbHRpcF9fY29hY2htYXJrJ1xuICAgICAgfSxcbiAgICAgIF9wb3NpdGlvbnMgICAgPSB7XG4gICAgICAgIFQgOiAnVCcsXG4gICAgICAgIFRSOiAnVFInLFxuICAgICAgICBSIDogJ1InLFxuICAgICAgICBCUjogJ0JSJyxcbiAgICAgICAgQiA6ICdCJyxcbiAgICAgICAgQkw6ICdCTCcsXG4gICAgICAgIEwgOiAnTCcsXG4gICAgICAgIFRMOiAnVEwnXG4gICAgICB9LFxuICAgICAgX3Bvc2l0aW9uTWFwICA9IHtcbiAgICAgICAgJ1QnIDogJ3Rvb2x0aXBfX3RvcCcsXG4gICAgICAgICdUUic6ICd0b29sdGlwX190b3ByaWdodCcsXG4gICAgICAgICdSJyA6ICd0b29sdGlwX19yaWdodCcsXG4gICAgICAgICdCUic6ICd0b29sdGlwX19ib3R0b21yaWdodCcsXG4gICAgICAgICdCJyA6ICd0b29sdGlwX19ib3R0b20nLFxuICAgICAgICAnQkwnOiAndG9vbHRpcF9fYm90dG9tbGVmdCcsXG4gICAgICAgICdMJyA6ICd0b29sdGlwX19sZWZ0JyxcbiAgICAgICAgJ1RMJzogJ3Rvb2x0aXBfX3RvcGxlZnQnXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfdGVtcGxhdGUgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfZG9tVXRpbHMgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICBmdW5jdGlvbiBpbml0aWFsaXplKGVsSUQpIHtcbiAgICBfbW91bnRQb2ludCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsSUQpO1xuICB9XG5cbiAgLy9vYmoudGl0bGUsIG9iai5jb250ZW50LCBvYmoudHlwZSwgb2JqLnRhcmdldCwgb2JqLnBvc2l0aW9uXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvb2x0aXBPYmogPSBjcmVhdGVUb29sVGlwT2JqZWN0KGluaXRPYmoudGl0bGUsXG4gICAgICBpbml0T2JqLmNvbnRlbnQsXG4gICAgICBpbml0T2JqLnBvc2l0aW9uLFxuICAgICAgaW5pdE9iai50YXJnZXRFbCxcbiAgICAgIGluaXRPYmouZ3V0dGVyLFxuICAgICAgaW5pdE9iai5hbHdheXNWaXNpYmxlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvb2x0aXBPYmopO1xuICAgIF9tb3VudFBvaW50LmFwcGVuZENoaWxkKHRvb2x0aXBPYmouZWxlbWVudCk7XG5cbiAgICB0b29sdGlwT2JqLmFycm93RWwgPSB0b29sdGlwT2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93Jyk7XG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KGluaXRPYmoudHlwZSwgaW5pdE9iai5wb3NpdGlvbiwgdG9vbHRpcE9iai5lbGVtZW50KTtcblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICBjc3M6IHtcbiAgICAgICAgYXV0b0FscGhhOiB0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUgPyAxIDogMCxcbiAgICAgICAgd2lkdGggICAgOiBpbml0T2JqLndpZHRoID8gaW5pdE9iai53aWR0aCA6IF9kZWZhdWx0V2lkdGhcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNhY2hlIHRoZXNlIHZhbHVlcywgM2QgdHJhbnNmb3JtcyB3aWxsIGFsdGVyIHNpemVcbiAgICB0b29sdGlwT2JqLndpZHRoICA9IHRvb2x0aXBPYmouZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aDtcbiAgICB0b29sdGlwT2JqLmhlaWdodCA9IHRvb2x0aXBPYmouZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG5cbiAgICBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopO1xuICAgIHBvc2l0aW9uVG9vbFRpcCh0b29sdGlwT2JqKTtcblxuICAgIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwgfHwgdG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5SKSB7XG4gICAgICBjZW50ZXJBcnJvd1ZlcnRpY2FsbHkodG9vbHRpcE9iaik7XG4gICAgfVxuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCB8fCB0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkIpIHtcbiAgICAgIGNlbnRlckFycm93SG9yaXpvbnRhbGx5KHRvb2x0aXBPYmopO1xuICAgIH1cblxuICAgIHJldHVybiB0b29sdGlwT2JqLmVsZW1lbnQ7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQodHlwZSwgcG9zaXRpb24sIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfcG9zaXRpb25NYXBbcG9zaXRpb25dKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvb2xUaXBPYmplY3QodGl0bGUsIG1lc3NhZ2UsIHBvc2l0aW9uLCB0YXJnZXQsIGd1dHRlciwgYWx3YXlzVmlzaWJsZSkge1xuICAgIHZhciBpZCAgPSAnanNfX3Rvb2x0aXAtdG9vbHRpcGl0ZW0tJyArIChfY291bnRlcisrKS50b1N0cmluZygpLFxuICAgICAgICBvYmogPSB7XG4gICAgICAgICAgaWQgICAgICAgICAgIDogaWQsXG4gICAgICAgICAgcG9zaXRpb24gICAgIDogcG9zaXRpb24sXG4gICAgICAgICAgdGFyZ2V0RWwgICAgIDogdGFyZ2V0LFxuICAgICAgICAgIGFsd2F5c1Zpc2libGU6IGFsd2F5c1Zpc2libGUgfHwgZmFsc2UsXG4gICAgICAgICAgZ3V0dGVyICAgICAgIDogZ3V0dGVyIHx8IDE1LFxuICAgICAgICAgIGVsT3ZlclN0cmVhbSA6IG51bGwsXG4gICAgICAgICAgZWxPdXRTdHJlYW0gIDogbnVsbCxcbiAgICAgICAgICBoZWlnaHQgICAgICAgOiAwLFxuICAgICAgICAgIHdpZHRoICAgICAgICA6IDAsXG4gICAgICAgICAgZWxlbWVudCAgICAgIDogX3RlbXBsYXRlLmFzRWxlbWVudCgnY29tcG9uZW50LS10b29sdGlwJywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBhcnJvd0VsICAgICAgOiBudWxsXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gYXNzaWduRXZlbnRzVG9UYXJnZXRFbCh0b29sdGlwT2JqKSB7XG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRvb2x0aXBPYmouZWxPdmVyU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5mcm9tRXZlbnQodG9vbHRpcE9iai50YXJnZXRFbCwgJ21vdXNlb3ZlcicpXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgc2hvd1Rvb2xUaXAodG9vbHRpcE9iai5pZCk7XG4gICAgICB9KTtcblxuICAgIHRvb2x0aXBPYmouZWxPdXRTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh0b29sdGlwT2JqLnRhcmdldEVsLCAnbW91c2VvdXQnKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIGhpZGVUb29sVGlwKHRvb2x0aXBPYmouaWQpO1xuICAgICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93VG9vbFRpcChpZCkge1xuICAgIHZhciB0b29sdGlwT2JqID0gZ2V0T2JqQnlJRChpZCk7XG5cbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcG9zaXRpb25Ub29sVGlwKHRvb2x0aXBPYmopO1xuICAgIHRyYW5zaXRpb25Jbih0b29sdGlwT2JqLmVsZW1lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gcG9zaXRpb25Ub29sVGlwKHRvb2x0aXBPYmopIHtcbiAgICB2YXIgZ3V0dGVyICAgPSB0b29sdGlwT2JqLmd1dHRlcixcbiAgICAgICAgeFBvcyAgICAgPSAwLFxuICAgICAgICB5UG9zICAgICA9IDAsXG4gICAgICAgIHRndFByb3BzID0gdG9vbHRpcE9iai50YXJnZXRFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlRMKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCAtIHRvb2x0aXBPYmoud2lkdGg7XG4gICAgICB5UG9zID0gdGd0UHJvcHMudG9wIC0gdG9vbHRpcE9iai5oZWlnaHQ7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlQpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0ICsgKCh0Z3RQcm9wcy53aWR0aCAvIDIpIC0gKHRvb2x0aXBPYmoud2lkdGggLyAyKSk7XG4gICAgICB5UG9zID0gdGd0UHJvcHMudG9wIC0gdG9vbHRpcE9iai5oZWlnaHQgLSBndXR0ZXI7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlRSKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQ7XG4gICAgICB5UG9zID0gdGd0UHJvcHMudG9wIC0gdG9vbHRpcE9iai5oZWlnaHQ7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodCArIGd1dHRlcjtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgKyAoKHRndFByb3BzLmhlaWdodCAvIDIpIC0gKHRvb2x0aXBPYmouaGVpZ2h0IC8gMikpO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0O1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbTtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgKyAoKHRndFByb3BzLndpZHRoIC8gMikgLSAodG9vbHRpcE9iai53aWR0aCAvIDIpKTtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b20gKyBndXR0ZXI7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkJMKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCAtIHRvb2x0aXBPYmoud2lkdGg7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5MKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCAtIHRvb2x0aXBPYmoud2lkdGggLSBndXR0ZXI7XG4gICAgICB5UG9zID0gdGd0UHJvcHMudG9wICsgKCh0Z3RQcm9wcy5oZWlnaHQgLyAyKSAtICh0b29sdGlwT2JqLmhlaWdodCAvIDIpKTtcbiAgICB9XG5cbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouZWxlbWVudCwge1xuICAgICAgeDogeFBvcyxcbiAgICAgIHk6IHlQb3NcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNlbnRlckFycm93SG9yaXpvbnRhbGx5KHRvb2x0aXBPYmopIHtcbiAgICB2YXIgYXJyb3dQcm9wcyA9IHRvb2x0aXBPYmouYXJyb3dFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBUd2VlbkxpdGUuc2V0KHRvb2x0aXBPYmouYXJyb3dFbCwge3g6ICh0b29sdGlwT2JqLndpZHRoIC8gMikgLSAoYXJyb3dQcm9wcy53aWR0aCAvIDIpfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjZW50ZXJBcnJvd1ZlcnRpY2FsbHkodG9vbHRpcE9iaikge1xuICAgIHZhciBhcnJvd1Byb3BzID0gdG9vbHRpcE9iai5hcnJvd0VsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5hcnJvd0VsLCB7eTogKHRvb2x0aXBPYmouaGVpZ2h0IC8gMikgLSAoYXJyb3dQcm9wcy5oZWlnaHQgLyAyKSAtIDJ9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhpZGVUb29sVGlwKGlkKSB7XG4gICAgdmFyIHRvb2x0aXBPYmogPSBnZXRPYmpCeUlEKGlkKTtcblxuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0cmFuc2l0aW9uT3V0KHRvb2x0aXBPYmouZWxlbWVudCk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uSW4oZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuNSwge1xuICAgICAgYXV0b0FscGhhOiAxLFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25PdXQoZWwpIHtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDAuMDUsIHtcbiAgICAgIGF1dG9BbHBoYTogMCxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoZWwpIHtcbiAgICBnZXRPYmpCeUVsZW1lbnQoZWwpLmZvckVhY2goZnVuY3Rpb24gKHRvb2x0aXApIHtcbiAgICAgIGlmICh0b29sdGlwLmVsT3ZlclN0cmVhbSkge1xuICAgICAgICB0b29sdGlwLmVsT3ZlclN0cmVhbS5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgICBpZiAodG9vbHRpcC5lbE91dFN0cmVhbSkge1xuICAgICAgICB0b29sdGlwLmVsT3V0U3RyZWFtLmRpc3Bvc2UoKTtcbiAgICAgIH1cblxuICAgICAgVHdlZW5MaXRlLmtpbGxEZWxheWVkQ2FsbHNUbyh0b29sdGlwLmVsZW1lbnQpO1xuXG4gICAgICBfbW91bnRQb2ludC5yZW1vdmVDaGlsZCh0b29sdGlwLmVsZW1lbnQpO1xuXG4gICAgICB2YXIgaWR4ID0gZ2V0T2JqSW5kZXhCeUlEKHRvb2x0aXAuaWQpO1xuXG4gICAgICBfY2hpbGRyZW5baWR4XSA9IG51bGw7XG4gICAgICBfY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpCeUlEKGlkKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQuaWQgPT09IGlkO1xuICAgIH0pWzBdO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqSW5kZXhCeUlEKGlkKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQuaWQ7XG4gICAgfSkuaW5kZXhPZihpZCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpCeUVsZW1lbnQoZWwpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC50YXJnZXRFbCA9PT0gZWw7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UG9zaXRpb25zKCkge1xuICAgIHJldHVybiBfcG9zaXRpb25zO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXMsXG4gICAgcG9zaXRpb24gIDogZ2V0UG9zaXRpb25zXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG9vbFRpcFZpZXcoKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblxuICBpc0ludGVnZXI6IGZ1bmN0aW9uIChzdHIpIHtcbiAgICByZXR1cm4gKC9eLT9cXGQrJC8udGVzdChzdHIpKTtcbiAgfSxcblxuICBybmROdW1iZXI6IGZ1bmN0aW9uIChtaW4sIG1heCkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xuICB9LFxuXG4gIGNsYW1wOiBmdW5jdGlvbiAodmFsLCBtaW4sIG1heCkge1xuICAgIHJldHVybiBNYXRoLm1heChtaW4sIE1hdGgubWluKG1heCwgdmFsKSk7XG4gIH0sXG5cbiAgaW5SYW5nZTogZnVuY3Rpb24gKHZhbCwgbWluLCBtYXgpIHtcbiAgICByZXR1cm4gdmFsID4gbWluICYmIHZhbCA8IG1heDtcbiAgfSxcblxuICBkaXN0YW5jZVRMOiBmdW5jdGlvbiAocG9pbnQxLCBwb2ludDIpIHtcbiAgICB2YXIgeGQgPSAocG9pbnQyLmxlZnQgLSBwb2ludDEubGVmdCksXG4gICAgICAgIHlkID0gKHBvaW50Mi50b3AgLSBwb2ludDEudG9wKTtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KCh4ZCAqIHhkKSArICh5ZCAqIHlkKSk7XG4gIH1cblxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAvKipcbiAgICogVGVzdCBmb3JcbiAgICogT2JqZWN0IHtcIlwiOiB1bmRlZmluZWR9XG4gICAqIE9iamVjdCB7dW5kZWZpbmVkOiB1bmRlZmluZWR9XG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBpc051bGw6IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgaXNudWxsID0gZmFsc2U7XG5cbiAgICBpZiAoaXMuZmFsc2V5KG9iaikpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG4gICAgICBpZiAocHJvcCA9PT0gdW5kZWZpbmVkIHx8IG9ialtwcm9wXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlzbnVsbCA9IHRydWU7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gaXNudWxsO1xuICB9LFxuXG4gIGR5bmFtaWNTb3J0OiBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIHJldHVybiBhW3Byb3BlcnR5XSA8IGJbcHJvcGVydHldID8gLTEgOiBhW3Byb3BlcnR5XSA+IGJbcHJvcGVydHldID8gMSA6IDA7XG4gICAgfTtcbiAgfSxcblxuICBzZWFyY2hPYmplY3RzOiBmdW5jdGlvbiAob2JqLCBrZXksIHZhbCkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSBpbiBvYmopIHtcbiAgICAgIGlmICh0eXBlb2Ygb2JqW2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgICBvYmplY3RzID0gb2JqZWN0cy5jb25jYXQoc2VhcmNoT2JqZWN0cyhvYmpbaV0sIGtleSwgdmFsKSk7XG4gICAgICB9IGVsc2UgaWYgKGkgPT09IGtleSAmJiBvYmpba2V5XSA9PT0gdmFsKSB7XG4gICAgICAgIG9iamVjdHMucHVzaChvYmopO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cztcbiAgfSxcblxuICBnZXRPYmplY3RGcm9tU3RyaW5nOiBmdW5jdGlvbiAob2JqLCBzdHIpIHtcbiAgICB2YXIgaSAgICA9IDAsXG4gICAgICAgIHBhdGggPSBzdHIuc3BsaXQoJy4nKSxcbiAgICAgICAgbGVuICA9IHBhdGgubGVuZ3RoO1xuXG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgb2JqID0gb2JqW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9LFxuXG4gIGdldE9iamVjdEluZGV4RnJvbUlkOiBmdW5jdGlvbiAob2JqLCBpZCkge1xuICAgIGlmICh0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodHlwZW9mIG9ialtpXSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2Ygb2JqW2ldLmlkICE9PSBcInVuZGVmaW5lZFwiICYmIG9ialtpXS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLy8gZXh0ZW5kIGFuZCBkZWVwIGV4dGVuZCBmcm9tIGh0dHA6Ly95b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tL1xuICBleHRlbmQ6IGZ1bmN0aW9uIChvdXQpIHtcbiAgICBvdXQgPSBvdXQgfHwge307XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFhcmd1bWVudHNbaV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50c1tpXS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgb3V0W2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG4gIH0sXG5cbiAgZGVlcEV4dGVuZDogZnVuY3Rpb24gKG91dCkge1xuICAgIG91dCA9IG91dCB8fCB7fTtcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgb2JqID0gYXJndW1lbnRzW2ldO1xuXG4gICAgICBpZiAoIW9iaikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIG9ialtrZXldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgZGVlcEV4dGVuZChvdXRba2V5XSwgb2JqW2tleV0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNpbXBsaWZpZWQgaW1wbGVtZW50YXRpb24gb2YgU3RhbXBzIC0gaHR0cDovL2VyaWNsZWFkcy5jb20vMjAxNC8wMi9wcm90b3R5cGFsLWluaGVyaXRhbmNlLXdpdGgtc3RhbXBzL1xuICAgKiBodHRwczovL3d3dy5iYXJrd2ViLmNvLnVrL2Jsb2cvb2JqZWN0LWNvbXBvc2l0aW9uLWFuZC1wcm90b3R5cGljYWwtaW5oZXJpdGFuY2UtaW4tamF2YXNjcmlwdFxuICAgKlxuICAgKiBQcm90b3R5cGUgb2JqZWN0IHJlcXVpcmVzIGEgbWV0aG9kcyBvYmplY3QsIHByaXZhdGUgY2xvc3VyZXMgYW5kIHN0YXRlIGlzIG9wdGlvbmFsXG4gICAqXG4gICAqIEBwYXJhbSBwcm90b3R5cGVcbiAgICogQHJldHVybnMgTmV3IG9iamVjdCB1c2luZyBwcm90b3R5cGUubWV0aG9kcyBhcyBzb3VyY2VcbiAgICovXG4gIGJhc2ljRmFjdG9yeTogZnVuY3Rpb24gKHByb3RvdHlwZSkge1xuICAgIHZhciBwcm90byA9IHByb3RvdHlwZSxcbiAgICAgICAgb2JqICAgPSBPYmplY3QuY3JlYXRlKHByb3RvLm1ldGhvZHMpO1xuXG4gICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdjbG9zdXJlJykpIHtcbiAgICAgIHByb3RvLmNsb3N1cmVzLmZvckVhY2goZnVuY3Rpb24gKGNsb3N1cmUpIHtcbiAgICAgICAgY2xvc3VyZS5jYWxsKG9iaik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkoJ3N0YXRlJykpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBwcm90by5zdGF0ZSkge1xuICAgICAgICBvYmpba2V5XSA9IHByb3RvLnN0YXRlW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICAvKipcbiAgICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICAgKlxuICAgKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICAgKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gICAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICAgKlxuICAgKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAgICpcbiAgICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICAgKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gICAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICAgKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gICAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICAgKlxuICAgKi9cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYW4gZW51bWVyYXRpb24gd2l0aCBrZXlzIGVxdWFsIHRvIHRoZWlyIHZhbHVlLlxuICAgKlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vU1RSTUwva2V5bWlycm9yXG4gICAqXG4gICAqIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiAgIHZhciBDT0xPUlMgPSBrZXlNaXJyb3Ioe2JsdWU6IG51bGwsIHJlZDogbnVsbH0pO1xuICAgKiAgIHZhciBteUNvbG9yID0gQ09MT1JTLmJsdWU7XG4gICAqICAgdmFyIGlzQ29sb3JWYWxpZCA9ICEhQ09MT1JTW215Q29sb3JdO1xuICAgKlxuICAgKiBUaGUgbGFzdCBsaW5lIGNvdWxkIG5vdCBiZSBwZXJmb3JtZWQgaWYgdGhlIHZhbHVlcyBvZiB0aGUgZ2VuZXJhdGVkIGVudW0gd2VyZVxuICAgKiBub3QgZXF1YWwgdG8gdGhlaXIga2V5cy5cbiAgICpcbiAgICogICBJbnB1dDogIHtrZXkxOiB2YWwxLCBrZXkyOiB2YWwyfVxuICAgKiAgIE91dHB1dDoge2tleTE6IGtleTEsIGtleTI6IGtleTJ9XG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKi9cbiAga2V5TWlycm9yOiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIHZhciBrZXk7XG4gICAgaWYgKCEob2JqIGluc3RhbmNlb2YgT2JqZWN0ICYmICFBcnJheS5pc0FycmF5KG9iaikpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2tleU1pcnJvciguLi4pOiBBcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcbiAgICB9XG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcmV0W2tleV0gPSBrZXk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxufTsiLCIvKipcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqICBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqICBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqICBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqICBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuIWZ1bmN0aW9uKHQsZSl7XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGU/bW9kdWxlLmV4cG9ydHM9ZSgpOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoZSk6dC5JbW11dGFibGU9ZSgpfSh0aGlzLGZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gdCh0LGUpe2UmJih0LnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKGUucHJvdG90eXBlKSksdC5wcm90b3R5cGUuY29uc3RydWN0b3I9dH1mdW5jdGlvbiBlKHQpe3JldHVybiB0LnZhbHVlPSExLHR9ZnVuY3Rpb24gcih0KXt0JiYodC52YWx1ZT0hMCl9ZnVuY3Rpb24gbigpe31mdW5jdGlvbiBpKHQsZSl7ZT1lfHwwO2Zvcih2YXIgcj1NYXRoLm1heCgwLHQubGVuZ3RoLWUpLG49QXJyYXkociksaT0wO3I+aTtpKyspbltpXT10W2krZV07cmV0dXJuIG59ZnVuY3Rpb24gbyh0KXtyZXR1cm4gdm9pZCAwPT09dC5zaXplJiYodC5zaXplPXQuX19pdGVyYXRlKHMpKSx0LnNpemV9ZnVuY3Rpb24gdSh0LGUpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiBlKXt2YXIgcj1lPj4+MDtpZihcIlwiK3IhPT1lfHw0Mjk0OTY3Mjk1PT09cilyZXR1cm4gTmFOO2U9cn1yZXR1cm4gMD5lP28odCkrZTplfWZ1bmN0aW9uIHMoKXtyZXR1cm4hMH1mdW5jdGlvbiBhKHQsZSxyKXtyZXR1cm4oMD09PXR8fHZvaWQgMCE9PXImJi1yPj10KSYmKHZvaWQgMD09PWV8fHZvaWQgMCE9PXImJmU+PXIpfWZ1bmN0aW9uIGgodCxlKXtyZXR1cm4gYyh0LGUsMCl9ZnVuY3Rpb24gZih0LGUpe3JldHVybiBjKHQsZSxlKX1mdW5jdGlvbiBjKHQsZSxyKXtyZXR1cm4gdm9pZCAwPT09dD9yOjA+dD9NYXRoLm1heCgwLGUrdCk6dm9pZCAwPT09ZT90Ok1hdGgubWluKGUsdCl9ZnVuY3Rpb24gXyh0KXtyZXR1cm4geSh0KT90Ok8odCl9ZnVuY3Rpb24gcCh0KXtyZXR1cm4gZCh0KT90OngodCl9ZnVuY3Rpb24gdih0KXtyZXR1cm4gbSh0KT90OmsodCl9ZnVuY3Rpb24gbCh0KXtyZXR1cm4geSh0KSYmIWcodCk/dDpBKHQpfWZ1bmN0aW9uIHkodCl7cmV0dXJuISghdHx8IXRbdnJdKX1mdW5jdGlvbiBkKHQpe3JldHVybiEoIXR8fCF0W2xyXSl9ZnVuY3Rpb24gbSh0KXtyZXR1cm4hKCF0fHwhdFt5cl0pfWZ1bmN0aW9uIGcodCl7cmV0dXJuIGQodCl8fG0odCl9ZnVuY3Rpb24gdyh0KXtyZXR1cm4hKCF0fHwhdFtkcl0pfWZ1bmN0aW9uIFModCl7dGhpcy5uZXh0PXR9ZnVuY3Rpb24geih0LGUscixuKXt2YXIgaT0wPT09dD9lOjE9PT10P3I6W2Uscl07cmV0dXJuIG4/bi52YWx1ZT1pOm49e3ZhbHVlOmksZG9uZTohMX0sbn1mdW5jdGlvbiBJKCl7cmV0dXJue3ZhbHVlOnZvaWQgMCxkb25lOiEwfX1mdW5jdGlvbiBiKHQpe3JldHVybiEhTSh0KX1mdW5jdGlvbiBxKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm5leHR9ZnVuY3Rpb24gRCh0KXt2YXIgZT1NKHQpO3JldHVybiBlJiZlLmNhbGwodCl9ZnVuY3Rpb24gTSh0KXt2YXIgZT10JiYoU3ImJnRbU3JdfHx0W3pyXSk7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgZT9lOnZvaWQgMH1mdW5jdGlvbiBFKHQpe3JldHVybiB0JiZcIm51bWJlclwiPT10eXBlb2YgdC5sZW5ndGh9ZnVuY3Rpb24gTyh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/VCgpOnkodCk/dC50b1NlcSgpOkModCl9ZnVuY3Rpb24geCh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/VCgpLnRvS2V5ZWRTZXEoKTp5KHQpP2QodCk/dC50b1NlcSgpOnQuZnJvbUVudHJ5U2VxKCk6Vyh0KX1mdW5jdGlvbiBrKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9UKCk6eSh0KT9kKHQpP3QuZW50cnlTZXEoKTp0LnRvSW5kZXhlZFNlcSgpOkIodCl9ZnVuY3Rpb24gQSh0KXtyZXR1cm4obnVsbD09PXR8fHZvaWQgMD09PXQ/VCgpOnkodCk/ZCh0KT90LmVudHJ5U2VxKCk6dDpCKHQpKS50b1NldFNlcSgpfWZ1bmN0aW9uIGoodCl7dGhpcy5fYXJyYXk9dCx0aGlzLnNpemU9dC5sZW5ndGh9ZnVuY3Rpb24gUih0KXt2YXIgZT1PYmplY3Qua2V5cyh0KTt0aGlzLl9vYmplY3Q9dCx0aGlzLl9rZXlzPWUsXG4gIHRoaXMuc2l6ZT1lLmxlbmd0aH1mdW5jdGlvbiBVKHQpe3RoaXMuX2l0ZXJhYmxlPXQsdGhpcy5zaXplPXQubGVuZ3RofHx0LnNpemV9ZnVuY3Rpb24gSyh0KXt0aGlzLl9pdGVyYXRvcj10LHRoaXMuX2l0ZXJhdG9yQ2FjaGU9W119ZnVuY3Rpb24gTCh0KXtyZXR1cm4hKCF0fHwhdFticl0pfWZ1bmN0aW9uIFQoKXtyZXR1cm4gcXJ8fChxcj1uZXcgaihbXSkpfWZ1bmN0aW9uIFcodCl7dmFyIGU9QXJyYXkuaXNBcnJheSh0KT9uZXcgaih0KS5mcm9tRW50cnlTZXEoKTpxKHQpP25ldyBLKHQpLmZyb21FbnRyeVNlcSgpOmIodCk/bmV3IFUodCkuZnJvbUVudHJ5U2VxKCk6XCJvYmplY3RcIj09dHlwZW9mIHQ/bmV3IFIodCk6dm9pZCAwO2lmKCFlKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBBcnJheSBvciBpdGVyYWJsZSBvYmplY3Qgb2YgW2ssIHZdIGVudHJpZXMsIG9yIGtleWVkIG9iamVjdDogXCIrdCk7cmV0dXJuIGV9ZnVuY3Rpb24gQih0KXt2YXIgZT1KKHQpO2lmKCFlKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBBcnJheSBvciBpdGVyYWJsZSBvYmplY3Qgb2YgdmFsdWVzOiBcIit0KTtyZXR1cm4gZX1mdW5jdGlvbiBDKHQpe3ZhciBlPUoodCl8fFwib2JqZWN0XCI9PXR5cGVvZiB0JiZuZXcgUih0KTtpZighZSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgQXJyYXkgb3IgaXRlcmFibGUgb2JqZWN0IG9mIHZhbHVlcywgb3Iga2V5ZWQgb2JqZWN0OiBcIit0KTtyZXR1cm4gZX1mdW5jdGlvbiBKKHQpe3JldHVybiBFKHQpP25ldyBqKHQpOnEodCk/bmV3IEsodCk6Yih0KT9uZXcgVSh0KTp2b2lkIDB9ZnVuY3Rpb24gTih0LGUscixuKXt2YXIgaT10Ll9jYWNoZTtpZihpKXtmb3IodmFyIG89aS5sZW5ndGgtMSx1PTA7bz49dTt1Kyspe3ZhciBzPWlbcj9vLXU6dV07aWYoZShzWzFdLG4/c1swXTp1LHQpPT09ITEpcmV0dXJuIHUrMX1yZXR1cm4gdX1yZXR1cm4gdC5fX2l0ZXJhdGVVbmNhY2hlZChlLHIpfWZ1bmN0aW9uIFAodCxlLHIsbil7dmFyIGk9dC5fY2FjaGU7aWYoaSl7dmFyIG89aS5sZW5ndGgtMSx1PTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHQ9aVtyP28tdTp1XTtyZXR1cm4gdSsrPm8/SSgpOnooZSxuP3RbMF06dS0xLHRbMV0pfSl9cmV0dXJuIHQuX19pdGVyYXRvclVuY2FjaGVkKGUscil9ZnVuY3Rpb24gSCgpe3Rocm93IFR5cGVFcnJvcihcIkFic3RyYWN0XCIpfWZ1bmN0aW9uIFYoKXt9ZnVuY3Rpb24gWSgpe31mdW5jdGlvbiBRKCl7fWZ1bmN0aW9uIFgodCxlKXtpZih0PT09ZXx8dCE9PXQmJmUhPT1lKXJldHVybiEwO2lmKCF0fHwhZSlyZXR1cm4hMTtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnZhbHVlT2YmJlwiZnVuY3Rpb25cIj09dHlwZW9mIGUudmFsdWVPZil7aWYodD10LnZhbHVlT2YoKSxlPWUudmFsdWVPZigpLHQ9PT1lfHx0IT09dCYmZSE9PWUpcmV0dXJuITA7aWYoIXR8fCFlKXJldHVybiExfXJldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQuZXF1YWxzJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBlLmVxdWFscyYmdC5lcXVhbHMoZSk/ITA6ITF9ZnVuY3Rpb24gRih0LGUpe3JldHVybiBlP0coZSx0LFwiXCIse1wiXCI6dH0pOloodCl9ZnVuY3Rpb24gRyh0LGUscixuKXtyZXR1cm4gQXJyYXkuaXNBcnJheShlKT90LmNhbGwobixyLGsoZSkubWFwKGZ1bmN0aW9uKHIsbil7cmV0dXJuIEcodCxyLG4sZSl9KSk6JChlKT90LmNhbGwobixyLHgoZSkubWFwKGZ1bmN0aW9uKHIsbil7cmV0dXJuIEcodCxyLG4sZSl9KSk6ZX1mdW5jdGlvbiBaKHQpe3JldHVybiBBcnJheS5pc0FycmF5KHQpP2sodCkubWFwKFopLnRvTGlzdCgpOiQodCk/eCh0KS5tYXAoWikudG9NYXAoKTp0fWZ1bmN0aW9uICQodCl7cmV0dXJuIHQmJih0LmNvbnN0cnVjdG9yPT09T2JqZWN0fHx2b2lkIDA9PT10LmNvbnN0cnVjdG9yKX1mdW5jdGlvbiB0dCh0KXtyZXR1cm4gdD4+PjEmMTA3Mzc0MTgyNHwzMjIxMjI1NDcxJnR9ZnVuY3Rpb24gZXQodCl7aWYodD09PSExfHxudWxsPT09dHx8dm9pZCAwPT09dClyZXR1cm4gMDtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnZhbHVlT2YmJih0PXQudmFsdWVPZigpLFxuICB0PT09ITF8fG51bGw9PT10fHx2b2lkIDA9PT10KSlyZXR1cm4gMDtpZih0PT09ITApcmV0dXJuIDE7dmFyIGU9dHlwZW9mIHQ7aWYoXCJudW1iZXJcIj09PWUpe3ZhciByPTB8dDtmb3IociE9PXQmJihyXj00Mjk0OTY3Mjk1KnQpO3Q+NDI5NDk2NzI5NTspdC89NDI5NDk2NzI5NSxyXj10O3JldHVybiB0dChyKX1pZihcInN0cmluZ1wiPT09ZSlyZXR1cm4gdC5sZW5ndGg+anI/cnQodCk6bnQodCk7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC5oYXNoQ29kZSlyZXR1cm4gdC5oYXNoQ29kZSgpO2lmKFwib2JqZWN0XCI9PT1lKXJldHVybiBpdCh0KTtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnRvU3RyaW5nKXJldHVybiBudChcIlwiK3QpO3Rocm93IEVycm9yKFwiVmFsdWUgdHlwZSBcIitlK1wiIGNhbm5vdCBiZSBoYXNoZWQuXCIpfWZ1bmN0aW9uIHJ0KHQpe3ZhciBlPUtyW3RdO3JldHVybiB2b2lkIDA9PT1lJiYoZT1udCh0KSxVcj09PVJyJiYoVXI9MCxLcj17fSksVXIrKyxLclt0XT1lKSxlfWZ1bmN0aW9uIG50KHQpe2Zvcih2YXIgZT0wLHI9MDt0Lmxlbmd0aD5yO3IrKyllPTMxKmUrdC5jaGFyQ29kZUF0KHIpfDA7cmV0dXJuIHR0KGUpfWZ1bmN0aW9uIGl0KHQpe3ZhciBlO2lmKHhyJiYoZT1Eci5nZXQodCksdm9pZCAwIT09ZSkpcmV0dXJuIGU7aWYoZT10W0FyXSx2b2lkIDAhPT1lKXJldHVybiBlO2lmKCFPcil7aWYoZT10LnByb3BlcnR5SXNFbnVtZXJhYmxlJiZ0LnByb3BlcnR5SXNFbnVtZXJhYmxlW0FyXSx2b2lkIDAhPT1lKXJldHVybiBlO2lmKGU9b3QodCksdm9pZCAwIT09ZSlyZXR1cm4gZX1pZihlPSsra3IsMTA3Mzc0MTgyNCZrciYmKGtyPTApLHhyKURyLnNldCh0LGUpO2Vsc2V7aWYodm9pZCAwIT09RXImJkVyKHQpPT09ITEpdGhyb3cgRXJyb3IoXCJOb24tZXh0ZW5zaWJsZSBvYmplY3RzIGFyZSBub3QgYWxsb3dlZCBhcyBrZXlzLlwiKTtpZihPcilPYmplY3QuZGVmaW5lUHJvcGVydHkodCxBcix7ZW51bWVyYWJsZTohMSxjb25maWd1cmFibGU6ITEsd3JpdGFibGU6ITEsdmFsdWU6ZX0pO2Vsc2UgaWYodm9pZCAwIT09dC5wcm9wZXJ0eUlzRW51bWVyYWJsZSYmdC5wcm9wZXJ0eUlzRW51bWVyYWJsZT09PXQuY29uc3RydWN0b3IucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlKXQucHJvcGVydHlJc0VudW1lcmFibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuYXBwbHkodGhpcyxhcmd1bWVudHMpfSx0LnByb3BlcnR5SXNFbnVtZXJhYmxlW0FyXT1lO2Vsc2V7aWYodm9pZCAwPT09dC5ub2RlVHlwZSl0aHJvdyBFcnJvcihcIlVuYWJsZSB0byBzZXQgYSBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBvbiBvYmplY3QuXCIpO3RbQXJdPWV9fXJldHVybiBlfWZ1bmN0aW9uIG90KHQpe2lmKHQmJnQubm9kZVR5cGU+MClzd2l0Y2godC5ub2RlVHlwZSl7Y2FzZSAxOnJldHVybiB0LnVuaXF1ZUlEO2Nhc2UgOTpyZXR1cm4gdC5kb2N1bWVudEVsZW1lbnQmJnQuZG9jdW1lbnRFbGVtZW50LnVuaXF1ZUlEfX1mdW5jdGlvbiB1dCh0LGUpe2lmKCF0KXRocm93IEVycm9yKGUpfWZ1bmN0aW9uIHN0KHQpe3V0KHQhPT0xLzAsXCJDYW5ub3QgcGVyZm9ybSB0aGlzIGFjdGlvbiB3aXRoIGFuIGluZmluaXRlIHNpemUuXCIpfWZ1bmN0aW9uIGF0KHQsZSl7dGhpcy5faXRlcj10LHRoaXMuX3VzZUtleXM9ZSx0aGlzLnNpemU9dC5zaXplfWZ1bmN0aW9uIGh0KHQpe3RoaXMuX2l0ZXI9dCx0aGlzLnNpemU9dC5zaXplfWZ1bmN0aW9uIGZ0KHQpe3RoaXMuX2l0ZXI9dCx0aGlzLnNpemU9dC5zaXplfWZ1bmN0aW9uIGN0KHQpe3RoaXMuX2l0ZXI9dCx0aGlzLnNpemU9dC5zaXplfWZ1bmN0aW9uIF90KHQpe3ZhciBlPWp0KHQpO3JldHVybiBlLl9pdGVyPXQsZS5zaXplPXQuc2l6ZSxlLmZsaXA9ZnVuY3Rpb24oKXtyZXR1cm4gdH0sZS5yZXZlcnNlPWZ1bmN0aW9uKCl7dmFyIGU9dC5yZXZlcnNlLmFwcGx5KHRoaXMpO3JldHVybiBlLmZsaXA9ZnVuY3Rpb24oKXtyZXR1cm4gdC5yZXZlcnNlKCl9LGV9LGUuaGFzPWZ1bmN0aW9uKGUpe3JldHVybiB0LmluY2x1ZGVzKGUpO1xufSxlLmluY2x1ZGVzPWZ1bmN0aW9uKGUpe3JldHVybiB0LmhhcyhlKX0sZS5jYWNoZVJlc3VsdD1SdCxlLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKGUscil7dmFyIG49dGhpcztyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxyKXtyZXR1cm4gZShyLHQsbikhPT0hMX0scil9LGUuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKGUscil7aWYoZT09PXdyKXt2YXIgbj10Ll9faXRlcmF0b3IoZSxyKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdD1uLm5leHQoKTtpZighdC5kb25lKXt2YXIgZT10LnZhbHVlWzBdO3QudmFsdWVbMF09dC52YWx1ZVsxXSx0LnZhbHVlWzFdPWV9cmV0dXJuIHR9KX1yZXR1cm4gdC5fX2l0ZXJhdG9yKGU9PT1ncj9tcjpncixyKX0sZX1mdW5jdGlvbiBwdCh0LGUscil7dmFyIG49anQodCk7cmV0dXJuIG4uc2l6ZT10LnNpemUsbi5oYXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaGFzKGUpfSxuLmdldD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuZ2V0KG4sY3IpO3JldHVybiBvPT09Y3I/aTplLmNhbGwocixvLG4sdCl9LG4uX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10aGlzO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LGksdSl7cmV0dXJuIG4oZS5jYWxsKHIsdCxpLHUpLGksbykhPT0hMX0saSl9LG4uX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dC5fX2l0ZXJhdG9yKHdyLGkpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBpPW8ubmV4dCgpO2lmKGkuZG9uZSlyZXR1cm4gaTt2YXIgdT1pLnZhbHVlLHM9dVswXTtyZXR1cm4geihuLHMsZS5jYWxsKHIsdVsxXSxzLHQpLGkpfSl9LG59ZnVuY3Rpb24gdnQodCxlKXt2YXIgcj1qdCh0KTtyZXR1cm4gci5faXRlcj10LHIuc2l6ZT10LnNpemUsci5yZXZlcnNlPWZ1bmN0aW9uKCl7cmV0dXJuIHR9LHQuZmxpcCYmKHIuZmxpcD1mdW5jdGlvbigpe3ZhciBlPV90KHQpO3JldHVybiBlLnJldmVyc2U9ZnVuY3Rpb24oKXtyZXR1cm4gdC5mbGlwKCl9LGV9KSxyLmdldD1mdW5jdGlvbihyLG4pe3JldHVybiB0LmdldChlP3I6LTEtcixuKX0sci5oYXM9ZnVuY3Rpb24ocil7cmV0dXJuIHQuaGFzKGU/cjotMS1yKX0sci5pbmNsdWRlcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5pbmNsdWRlcyhlKX0sci5jYWNoZVJlc3VsdD1SdCxyLl9faXRlcmF0ZT1mdW5jdGlvbihlLHIpe3ZhciBuPXRoaXM7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUodCxyLG4pfSwhcil9LHIuX19pdGVyYXRvcj1mdW5jdGlvbihlLHIpe3JldHVybiB0Ll9faXRlcmF0b3IoZSwhcil9LHJ9ZnVuY3Rpb24gbHQodCxlLHIsbil7dmFyIGk9anQodCk7cmV0dXJuIG4mJihpLmhhcz1mdW5jdGlvbihuKXt2YXIgaT10LmdldChuLGNyKTtyZXR1cm4gaSE9PWNyJiYhIWUuY2FsbChyLGksbix0KX0saS5nZXQ9ZnVuY3Rpb24obixpKXt2YXIgbz10LmdldChuLGNyKTtyZXR1cm4gbyE9PWNyJiZlLmNhbGwocixvLG4sdCk/bzppfSksaS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihpLG8pe3ZhciB1PXRoaXMscz0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LG8sYSl7cmV0dXJuIGUuY2FsbChyLHQsbyxhKT8ocysrLGkodCxuP286cy0xLHUpKTp2b2lkIDB9LG8pLHN9LGkuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dC5fX2l0ZXJhdG9yKHdyLG8pLHM9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoOzspe3ZhciBvPXUubmV4dCgpO2lmKG8uZG9uZSlyZXR1cm4gbzt2YXIgYT1vLnZhbHVlLGg9YVswXSxmPWFbMV07aWYoZS5jYWxsKHIsZixoLHQpKXJldHVybiB6KGksbj9oOnMrKyxmLG8pfX0pfSxpfWZ1bmN0aW9uIHl0KHQsZSxyKXt2YXIgbj1MdCgpLmFzTXV0YWJsZSgpO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbihpLG8pe24udXBkYXRlKGUuY2FsbChyLGksbyx0KSwwLGZ1bmN0aW9uKHQpe3JldHVybiB0KzF9KX0pLG4uYXNJbW11dGFibGUoKX1mdW5jdGlvbiBkdCh0LGUscil7dmFyIG49ZCh0KSxpPSh3KHQpP0llKCk6THQoKSkuYXNNdXRhYmxlKCk7XG4gIHQuX19pdGVyYXRlKGZ1bmN0aW9uKG8sdSl7aS51cGRhdGUoZS5jYWxsKHIsbyx1LHQpLGZ1bmN0aW9uKHQpe3JldHVybiB0PXR8fFtdLHQucHVzaChuP1t1LG9dOm8pLHR9KX0pO3ZhciBvPUF0KHQpO3JldHVybiBpLm1hcChmdW5jdGlvbihlKXtyZXR1cm4gT3QodCxvKGUpKX0pfWZ1bmN0aW9uIG10KHQsZSxyLG4pe3ZhciBpPXQuc2l6ZTtpZih2b2lkIDAhPT1lJiYoZT0wfGUpLHZvaWQgMCE9PXImJihyPTB8ciksYShlLHIsaSkpcmV0dXJuIHQ7dmFyIG89aChlLGkpLHM9ZihyLGkpO2lmKG8hPT1vfHxzIT09cylyZXR1cm4gbXQodC50b1NlcSgpLmNhY2hlUmVzdWx0KCksZSxyLG4pO3ZhciBjLF89cy1vO189PT1fJiYoYz0wPl8/MDpfKTt2YXIgcD1qdCh0KTtyZXR1cm4gcC5zaXplPTA9PT1jP2M6dC5zaXplJiZjfHx2b2lkIDAsIW4mJkwodCkmJmM+PTAmJihwLmdldD1mdW5jdGlvbihlLHIpe3JldHVybiBlPXUodGhpcyxlKSxlPj0wJiZjPmU/dC5nZXQoZStvLHIpOnJ9KSxwLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKGUscil7dmFyIGk9dGhpcztpZigwPT09YylyZXR1cm4gMDtpZihyKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGUscik7dmFyIHU9MCxzPSEwLGE9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxyKXtyZXR1cm4gcyYmKHM9dSsrPG8pP3ZvaWQgMDooYSsrLGUodCxuP3I6YS0xLGkpIT09ITEmJmEhPT1jKX0pLGF9LHAuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKGUscil7aWYoMCE9PWMmJnIpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKGUscik7dmFyIGk9MCE9PWMmJnQuX19pdGVyYXRvcihlLHIpLHU9MCxzPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7Zm9yKDt1Kys8bzspaS5uZXh0KCk7aWYoKytzPmMpcmV0dXJuIEkoKTt2YXIgdD1pLm5leHQoKTtyZXR1cm4gbnx8ZT09PWdyP3Q6ZT09PW1yP3ooZSxzLTEsdm9pZCAwLHQpOnooZSxzLTEsdC52YWx1ZVsxXSx0KX0pfSxwfWZ1bmN0aW9uIGd0KHQsZSxyKXt2YXIgbj1qdCh0KTtyZXR1cm4gbi5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXRoaXM7aWYoaSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShuLGkpO3ZhciB1PTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQsaSxzKXtyZXR1cm4gZS5jYWxsKHIsdCxpLHMpJiYrK3UmJm4odCxpLG8pfSksdX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10aGlzO2lmKGkpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKG4saSk7dmFyIHU9dC5fX2l0ZXJhdG9yKHdyLGkpLHM9ITA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7aWYoIXMpcmV0dXJuIEkoKTt2YXIgdD11Lm5leHQoKTtpZih0LmRvbmUpcmV0dXJuIHQ7dmFyIGk9dC52YWx1ZSxhPWlbMF0saD1pWzFdO3JldHVybiBlLmNhbGwocixoLGEsbyk/bj09PXdyP3Q6eihuLGEsaCx0KToocz0hMSxJKCkpfSl9LG59ZnVuY3Rpb24gd3QodCxlLHIsbil7dmFyIGk9anQodCk7cmV0dXJuIGkuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10aGlzO2lmKG8pcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoaSxvKTt2YXIgcz0hMCxhPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQsbyxoKXtyZXR1cm4gcyYmKHM9ZS5jYWxsKHIsdCxvLGgpKT92b2lkIDA6KGErKyxpKHQsbj9vOmEtMSx1KSl9KSxhfSxpLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihpLG8pe3ZhciB1PXRoaXM7aWYobylyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IoaSxvKTt2YXIgcz10Ll9faXRlcmF0b3Iod3IsbyksYT0hMCxoPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHQsbyxmO2Rve2lmKHQ9cy5uZXh0KCksdC5kb25lKXJldHVybiBufHxpPT09Z3I/dDppPT09bXI/eihpLGgrKyx2b2lkIDAsdCk6eihpLGgrKyx0LnZhbHVlWzFdLHQpO3ZhciBjPXQudmFsdWU7bz1jWzBdLGY9Y1sxXSxhJiYoYT1lLmNhbGwocixmLG8sdSkpfXdoaWxlKGEpO1xuICByZXR1cm4gaT09PXdyP3Q6eihpLG8sZix0KX0pfSxpfWZ1bmN0aW9uIFN0KHQsZSl7dmFyIHI9ZCh0KSxuPVt0XS5jb25jYXQoZSkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB5KHQpP3ImJih0PXAodCkpOnQ9cj9XKHQpOkIoQXJyYXkuaXNBcnJheSh0KT90Olt0XSksdH0pLmZpbHRlcihmdW5jdGlvbih0KXtyZXR1cm4gMCE9PXQuc2l6ZX0pO2lmKDA9PT1uLmxlbmd0aClyZXR1cm4gdDtpZigxPT09bi5sZW5ndGgpe3ZhciBpPW5bMF07aWYoaT09PXR8fHImJmQoaSl8fG0odCkmJm0oaSkpcmV0dXJuIGl9dmFyIG89bmV3IGoobik7cmV0dXJuIHI/bz1vLnRvS2V5ZWRTZXEoKTptKHQpfHwobz1vLnRvU2V0U2VxKCkpLG89by5mbGF0dGVuKCEwKSxvLnNpemU9bi5yZWR1Y2UoZnVuY3Rpb24odCxlKXtpZih2b2lkIDAhPT10KXt2YXIgcj1lLnNpemU7aWYodm9pZCAwIT09cilyZXR1cm4gdCtyfX0sMCksb31mdW5jdGlvbiB6dCh0LGUscil7dmFyIG49anQodCk7cmV0dXJuIG4uX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXtmdW5jdGlvbiBvKHQsYSl7dmFyIGg9dGhpczt0Ll9faXRlcmF0ZShmdW5jdGlvbih0LGkpe3JldHVybighZXx8ZT5hKSYmeSh0KT9vKHQsYSsxKTpuKHQscj9pOnUrKyxoKT09PSExJiYocz0hMCksIXN9LGkpfXZhciB1PTAscz0hMTtyZXR1cm4gbyh0LDApLHV9LG4uX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dC5fX2l0ZXJhdG9yKG4saSksdT1bXSxzPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7Zm9yKDtvOyl7dmFyIHQ9by5uZXh0KCk7aWYodC5kb25lPT09ITEpe3ZhciBhPXQudmFsdWU7aWYobj09PXdyJiYoYT1hWzFdKSxlJiYhKGU+dS5sZW5ndGgpfHwheShhKSlyZXR1cm4gcj90OnoobixzKyssYSx0KTt1LnB1c2gobyksbz1hLl9faXRlcmF0b3IobixpKX1lbHNlIG89dS5wb3AoKX1yZXR1cm4gSSgpfSl9LG59ZnVuY3Rpb24gSXQodCxlLHIpe3ZhciBuPUF0KHQpO3JldHVybiB0LnRvU2VxKCkubWFwKGZ1bmN0aW9uKGksbyl7cmV0dXJuIG4oZS5jYWxsKHIsaSxvLHQpKX0pLmZsYXR0ZW4oITApfWZ1bmN0aW9uIGJ0KHQsZSl7dmFyIHI9anQodCk7cmV0dXJuIHIuc2l6ZT10LnNpemUmJjIqdC5zaXplLTEsci5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihyLG4pe3ZhciBpPXRoaXMsbz0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0KXtyZXR1cm4oIW98fHIoZSxvKyssaSkhPT0hMSkmJnIodCxvKyssaSkhPT0hMX0sbiksb30sci5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24ocixuKXt2YXIgaSxvPXQuX19pdGVyYXRvcihncixuKSx1PTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7cmV0dXJuKCFpfHx1JTIpJiYoaT1vLm5leHQoKSxpLmRvbmUpP2k6dSUyP3oocix1KyssZSk6eihyLHUrKyxpLnZhbHVlLGkpfSl9LHJ9ZnVuY3Rpb24gcXQodCxlLHIpe2V8fChlPVV0KTt2YXIgbj1kKHQpLGk9MCxvPXQudG9TZXEoKS5tYXAoZnVuY3Rpb24oZSxuKXtyZXR1cm5bbixlLGkrKyxyP3IoZSxuLHQpOmVdfSkudG9BcnJheSgpO3JldHVybiBvLnNvcnQoZnVuY3Rpb24odCxyKXtyZXR1cm4gZSh0WzNdLHJbM10pfHx0WzJdLXJbMl19KS5mb3JFYWNoKG4/ZnVuY3Rpb24odCxlKXtvW2VdLmxlbmd0aD0yfTpmdW5jdGlvbih0LGUpe29bZV09dFsxXX0pLG4/eChvKTptKHQpP2sobyk6QShvKX1mdW5jdGlvbiBEdCh0LGUscil7aWYoZXx8KGU9VXQpLHIpe3ZhciBuPXQudG9TZXEoKS5tYXAoZnVuY3Rpb24oZSxuKXtyZXR1cm5bZSxyKGUsbix0KV19KS5yZWR1Y2UoZnVuY3Rpb24odCxyKXtyZXR1cm4gTXQoZSx0WzFdLHJbMV0pP3I6dH0pO3JldHVybiBuJiZuWzBdfXJldHVybiB0LnJlZHVjZShmdW5jdGlvbih0LHIpe3JldHVybiBNdChlLHQscik/cjp0fSl9ZnVuY3Rpb24gTXQodCxlLHIpe3ZhciBuPXQocixlKTtyZXR1cm4gMD09PW4mJnIhPT1lJiYodm9pZCAwPT09cnx8bnVsbD09PXJ8fHIhPT1yKXx8bj4wfWZ1bmN0aW9uIEV0KHQsZSxyKXt2YXIgbj1qdCh0KTtyZXR1cm4gbi5zaXplPW5ldyBqKHIpLm1hcChmdW5jdGlvbih0KXtcbiAgcmV0dXJuIHQuc2l6ZX0pLm1pbigpLG4uX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByLG49dGhpcy5fX2l0ZXJhdG9yKGdyLGUpLGk9MDshKHI9bi5uZXh0KCkpLmRvbmUmJnQoci52YWx1ZSxpKyssdGhpcykhPT0hMTspO3JldHVybiBpfSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbih0LG4pe3ZhciBpPXIubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0PV8odCksRChuP3QucmV2ZXJzZSgpOnQpfSksbz0wLHU9ITE7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHI7cmV0dXJuIHV8fChyPWkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0Lm5leHQoKX0pLHU9ci5zb21lKGZ1bmN0aW9uKHQpe3JldHVybiB0LmRvbmV9KSksdT9JKCk6eih0LG8rKyxlLmFwcGx5KG51bGwsci5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQudmFsdWV9KSkpfSl9LG59ZnVuY3Rpb24gT3QodCxlKXtyZXR1cm4gTCh0KT9lOnQuY29uc3RydWN0b3IoZSl9ZnVuY3Rpb24geHQodCl7aWYodCE9PU9iamVjdCh0KSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgW0ssIFZdIHR1cGxlOiBcIit0KX1mdW5jdGlvbiBrdCh0KXtyZXR1cm4gc3QodC5zaXplKSxvKHQpfWZ1bmN0aW9uIEF0KHQpe3JldHVybiBkKHQpP3A6bSh0KT92Omx9ZnVuY3Rpb24ganQodCl7cmV0dXJuIE9iamVjdC5jcmVhdGUoKGQodCk/eDptKHQpP2s6QSkucHJvdG90eXBlKX1mdW5jdGlvbiBSdCgpe3JldHVybiB0aGlzLl9pdGVyLmNhY2hlUmVzdWx0Pyh0aGlzLl9pdGVyLmNhY2hlUmVzdWx0KCksdGhpcy5zaXplPXRoaXMuX2l0ZXIuc2l6ZSx0aGlzKTpPLnByb3RvdHlwZS5jYWNoZVJlc3VsdC5jYWxsKHRoaXMpfWZ1bmN0aW9uIFV0KHQsZSl7cmV0dXJuIHQ+ZT8xOmU+dD8tMTowfWZ1bmN0aW9uIEt0KHQpe3ZhciBlPUQodCk7aWYoIWUpe2lmKCFFKHQpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBpdGVyYWJsZSBvciBhcnJheS1saWtlOiBcIit0KTtlPUQoXyh0KSl9cmV0dXJuIGV9ZnVuY3Rpb24gTHQodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1F0KCk6VHQodCkmJiF3KHQpP3Q6UXQoKS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3ZhciByPXAodCk7c3Qoci5zaXplKSxyLmZvckVhY2goZnVuY3Rpb24odCxyKXtyZXR1cm4gZS5zZXQocix0KX0pfSl9ZnVuY3Rpb24gVHQodCl7cmV0dXJuISghdHx8IXRbTHJdKX1mdW5jdGlvbiBXdCh0LGUpe3RoaXMub3duZXJJRD10LHRoaXMuZW50cmllcz1lfWZ1bmN0aW9uIEJ0KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmJpdG1hcD1lLHRoaXMubm9kZXM9cn1mdW5jdGlvbiBDdCh0LGUscil7dGhpcy5vd25lcklEPXQsdGhpcy5jb3VudD1lLHRoaXMubm9kZXM9cn1mdW5jdGlvbiBKdCh0LGUscil7dGhpcy5vd25lcklEPXQsdGhpcy5rZXlIYXNoPWUsdGhpcy5lbnRyaWVzPXJ9ZnVuY3Rpb24gTnQodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMua2V5SGFzaD1lLHRoaXMuZW50cnk9cn1mdW5jdGlvbiBQdCh0LGUscil7dGhpcy5fdHlwZT1lLHRoaXMuX3JldmVyc2U9cix0aGlzLl9zdGFjaz10Ll9yb290JiZWdCh0Ll9yb290KX1mdW5jdGlvbiBIdCh0LGUpe3JldHVybiB6KHQsZVswXSxlWzFdKX1mdW5jdGlvbiBWdCh0LGUpe3JldHVybntub2RlOnQsaW5kZXg6MCxfX3ByZXY6ZX19ZnVuY3Rpb24gWXQodCxlLHIsbil7dmFyIGk9T2JqZWN0LmNyZWF0ZShUcik7cmV0dXJuIGkuc2l6ZT10LGkuX3Jvb3Q9ZSxpLl9fb3duZXJJRD1yLGkuX19oYXNoPW4saS5fX2FsdGVyZWQ9ITEsaX1mdW5jdGlvbiBRdCgpe3JldHVybiBXcnx8KFdyPVl0KDApKX1mdW5jdGlvbiBYdCh0LHIsbil7dmFyIGksbztpZih0Ll9yb290KXt2YXIgdT1lKF9yKSxzPWUocHIpO2lmKGk9RnQodC5fcm9vdCx0Ll9fb3duZXJJRCwwLHZvaWQgMCxyLG4sdSxzKSwhcy52YWx1ZSlyZXR1cm4gdDtvPXQuc2l6ZSsodS52YWx1ZT9uPT09Y3I/LTE6MTowKX1lbHNle2lmKG49PT1jcilyZXR1cm4gdDtvPTEsaT1uZXcgV3QodC5fX293bmVySUQsW1tyLG5dXSl9cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9byxcbiAgdC5fcm9vdD1pLHQuX19oYXNoPXZvaWQgMCx0Ll9fYWx0ZXJlZD0hMCx0KTppP1l0KG8saSk6UXQoKX1mdW5jdGlvbiBGdCh0LGUsbixpLG8sdSxzLGEpe3JldHVybiB0P3QudXBkYXRlKGUsbixpLG8sdSxzLGEpOnU9PT1jcj90OihyKGEpLHIocyksbmV3IE50KGUsaSxbbyx1XSkpfWZ1bmN0aW9uIEd0KHQpe3JldHVybiB0LmNvbnN0cnVjdG9yPT09TnR8fHQuY29uc3RydWN0b3I9PT1KdH1mdW5jdGlvbiBadCh0LGUscixuLGkpe2lmKHQua2V5SGFzaD09PW4pcmV0dXJuIG5ldyBKdChlLG4sW3QuZW50cnksaV0pO3ZhciBvLHU9KDA9PT1yP3Qua2V5SGFzaDp0LmtleUhhc2g+Pj5yKSZmcixzPSgwPT09cj9uOm4+Pj5yKSZmcixhPXU9PT1zP1tadCh0LGUscithcixuLGkpXToobz1uZXcgTnQoZSxuLGkpLHM+dT9bdCxvXTpbbyx0XSk7cmV0dXJuIG5ldyBCdChlLDE8PHV8MTw8cyxhKX1mdW5jdGlvbiAkdCh0LGUscixpKXt0fHwodD1uZXcgbik7Zm9yKHZhciBvPW5ldyBOdCh0LGV0KHIpLFtyLGldKSx1PTA7ZS5sZW5ndGg+dTt1Kyspe3ZhciBzPWVbdV07bz1vLnVwZGF0ZSh0LDAsdm9pZCAwLHNbMF0sc1sxXSl9cmV0dXJuIG99ZnVuY3Rpb24gdGUodCxlLHIsbil7Zm9yKHZhciBpPTAsbz0wLHU9QXJyYXkocikscz0wLGE9MSxoPWUubGVuZ3RoO2g+cztzKyssYTw8PTEpe3ZhciBmPWVbc107dm9pZCAwIT09ZiYmcyE9PW4mJihpfD1hLHVbbysrXT1mKX1yZXR1cm4gbmV3IEJ0KHQsaSx1KX1mdW5jdGlvbiBlZSh0LGUscixuLGkpe2Zvcih2YXIgbz0wLHU9QXJyYXkoaHIpLHM9MDswIT09cjtzKysscj4+Pj0xKXVbc109MSZyP2VbbysrXTp2b2lkIDA7cmV0dXJuIHVbbl09aSxuZXcgQ3QodCxvKzEsdSl9ZnVuY3Rpb24gcmUodCxlLHIpe2Zvcih2YXIgbj1bXSxpPTA7ci5sZW5ndGg+aTtpKyspe3ZhciBvPXJbaV0sdT1wKG8pO3kobyl8fCh1PXUubWFwKGZ1bmN0aW9uKHQpe3JldHVybiBGKHQpfSkpLG4ucHVzaCh1KX1yZXR1cm4gaWUodCxlLG4pfWZ1bmN0aW9uIG5lKHQpe3JldHVybiBmdW5jdGlvbihlLHIsbil7cmV0dXJuIGUmJmUubWVyZ2VEZWVwV2l0aCYmeShyKT9lLm1lcmdlRGVlcFdpdGgodCxyKTp0P3QoZSxyLG4pOnJ9fWZ1bmN0aW9uIGllKHQsZSxyKXtyZXR1cm4gcj1yLmZpbHRlcihmdW5jdGlvbih0KXtyZXR1cm4gMCE9PXQuc2l6ZX0pLDA9PT1yLmxlbmd0aD90OjAhPT10LnNpemV8fHQuX19vd25lcklEfHwxIT09ci5sZW5ndGg/dC53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHQpe2Zvcih2YXIgbj1lP2Z1bmN0aW9uKHIsbil7dC51cGRhdGUobixjcixmdW5jdGlvbih0KXtyZXR1cm4gdD09PWNyP3I6ZSh0LHIsbil9KX06ZnVuY3Rpb24oZSxyKXt0LnNldChyLGUpfSxpPTA7ci5sZW5ndGg+aTtpKyspcltpXS5mb3JFYWNoKG4pfSk6dC5jb25zdHJ1Y3RvcihyWzBdKX1mdW5jdGlvbiBvZSh0LGUscixuKXt2YXIgaT10PT09Y3Isbz1lLm5leHQoKTtpZihvLmRvbmUpe3ZhciB1PWk/cjp0LHM9bih1KTtyZXR1cm4gcz09PXU/dDpzfXV0KGl8fHQmJnQuc2V0LFwiaW52YWxpZCBrZXlQYXRoXCIpO3ZhciBhPW8udmFsdWUsaD1pP2NyOnQuZ2V0KGEsY3IpLGY9b2UoaCxlLHIsbik7cmV0dXJuIGY9PT1oP3Q6Zj09PWNyP3QucmVtb3ZlKGEpOihpP1F0KCk6dCkuc2V0KGEsZil9ZnVuY3Rpb24gdWUodCl7cmV0dXJuIHQtPXQ+PjEmMTQzMTY1NTc2NSx0PSg4NTg5OTM0NTkmdCkrKHQ+PjImODU4OTkzNDU5KSx0PXQrKHQ+PjQpJjI1MjY0NTEzNSx0Kz10Pj44LHQrPXQ+PjE2LDEyNyZ0fWZ1bmN0aW9uIHNlKHQsZSxyLG4pe3ZhciBvPW4/dDppKHQpO3JldHVybiBvW2VdPXIsb31mdW5jdGlvbiBhZSh0LGUscixuKXt2YXIgaT10Lmxlbmd0aCsxO2lmKG4mJmUrMT09PWkpcmV0dXJuIHRbZV09cix0O2Zvcih2YXIgbz1BcnJheShpKSx1PTAscz0wO2k+cztzKyspcz09PWU/KG9bc109cix1PS0xKTpvW3NdPXRbcyt1XTtyZXR1cm4gb31mdW5jdGlvbiBoZSh0LGUscil7dmFyIG49dC5sZW5ndGgtMTtpZihyJiZlPT09bilyZXR1cm4gdC5wb3AoKSx0O2Zvcih2YXIgaT1BcnJheShuKSxvPTAsdT0wO24+dTt1KyspdT09PWUmJihvPTEpLFxuICBpW3VdPXRbdStvXTtyZXR1cm4gaX1mdW5jdGlvbiBmZSh0KXt2YXIgZT1sZSgpO2lmKG51bGw9PT10fHx2b2lkIDA9PT10KXJldHVybiBlO2lmKGNlKHQpKXJldHVybiB0O3ZhciByPXYodCksbj1yLnNpemU7cmV0dXJuIDA9PT1uP2U6KHN0KG4pLG4+MCYmaHI+bj92ZSgwLG4sYXIsbnVsbCxuZXcgX2Uoci50b0FycmF5KCkpKTplLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24odCl7dC5zZXRTaXplKG4pLHIuZm9yRWFjaChmdW5jdGlvbihlLHIpe3JldHVybiB0LnNldChyLGUpfSl9KSl9ZnVuY3Rpb24gY2UodCl7cmV0dXJuISghdHx8IXRbTnJdKX1mdW5jdGlvbiBfZSh0LGUpe3RoaXMuYXJyYXk9dCx0aGlzLm93bmVySUQ9ZX1mdW5jdGlvbiBwZSh0LGUpe2Z1bmN0aW9uIHIodCxlLHIpe3JldHVybiAwPT09ZT9uKHQscik6aSh0LGUscil9ZnVuY3Rpb24gbih0LHIpe3ZhciBuPXI9PT1zP2EmJmEuYXJyYXk6dCYmdC5hcnJheSxpPXI+bz8wOm8tcixoPXUtcjtyZXR1cm4gaD5ociYmKGg9aHIpLGZ1bmN0aW9uKCl7aWYoaT09PWgpcmV0dXJuIFZyO3ZhciB0PWU/LS1oOmkrKztyZXR1cm4gbiYmblt0XX19ZnVuY3Rpb24gaSh0LG4saSl7dmFyIHMsYT10JiZ0LmFycmF5LGg9aT5vPzA6by1pPj5uLGY9KHUtaT4+bikrMTtyZXR1cm4gZj5ociYmKGY9aHIpLGZ1bmN0aW9uKCl7Zm9yKDs7KXtpZihzKXt2YXIgdD1zKCk7aWYodCE9PVZyKXJldHVybiB0O3M9bnVsbH1pZihoPT09ZilyZXR1cm4gVnI7dmFyIG89ZT8tLWY6aCsrO3M9cihhJiZhW29dLG4tYXIsaSsobzw8bikpfX19dmFyIG89dC5fb3JpZ2luLHU9dC5fY2FwYWNpdHkscz16ZSh1KSxhPXQuX3RhaWw7cmV0dXJuIHIodC5fcm9vdCx0Ll9sZXZlbCwwKX1mdW5jdGlvbiB2ZSh0LGUscixuLGksbyx1KXt2YXIgcz1PYmplY3QuY3JlYXRlKFByKTtyZXR1cm4gcy5zaXplPWUtdCxzLl9vcmlnaW49dCxzLl9jYXBhY2l0eT1lLHMuX2xldmVsPXIscy5fcm9vdD1uLHMuX3RhaWw9aSxzLl9fb3duZXJJRD1vLHMuX19oYXNoPXUscy5fX2FsdGVyZWQ9ITEsc31mdW5jdGlvbiBsZSgpe3JldHVybiBIcnx8KEhyPXZlKDAsMCxhcikpfWZ1bmN0aW9uIHllKHQscixuKXtpZihyPXUodCxyKSxyIT09cilyZXR1cm4gdDtpZihyPj10LnNpemV8fDA+cilyZXR1cm4gdC53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHQpezA+cj93ZSh0LHIpLnNldCgwLG4pOndlKHQsMCxyKzEpLnNldChyLG4pfSk7cis9dC5fb3JpZ2luO3ZhciBpPXQuX3RhaWwsbz10Ll9yb290LHM9ZShwcik7cmV0dXJuIHI+PXplKHQuX2NhcGFjaXR5KT9pPWRlKGksdC5fX293bmVySUQsMCxyLG4scyk6bz1kZShvLHQuX19vd25lcklELHQuX2xldmVsLHIsbixzKSxzLnZhbHVlP3QuX19vd25lcklEPyh0Ll9yb290PW8sdC5fdGFpbD1pLHQuX19oYXNoPXZvaWQgMCx0Ll9fYWx0ZXJlZD0hMCx0KTp2ZSh0Ll9vcmlnaW4sdC5fY2FwYWNpdHksdC5fbGV2ZWwsbyxpKTp0fWZ1bmN0aW9uIGRlKHQsZSxuLGksbyx1KXt2YXIgcz1pPj4+biZmcixhPXQmJnQuYXJyYXkubGVuZ3RoPnM7aWYoIWEmJnZvaWQgMD09PW8pcmV0dXJuIHQ7dmFyIGg7aWYobj4wKXt2YXIgZj10JiZ0LmFycmF5W3NdLGM9ZGUoZixlLG4tYXIsaSxvLHUpO3JldHVybiBjPT09Zj90OihoPW1lKHQsZSksaC5hcnJheVtzXT1jLGgpfXJldHVybiBhJiZ0LmFycmF5W3NdPT09bz90OihyKHUpLGg9bWUodCxlKSx2b2lkIDA9PT1vJiZzPT09aC5hcnJheS5sZW5ndGgtMT9oLmFycmF5LnBvcCgpOmguYXJyYXlbc109byxoKX1mdW5jdGlvbiBtZSh0LGUpe3JldHVybiBlJiZ0JiZlPT09dC5vd25lcklEP3Q6bmV3IF9lKHQ/dC5hcnJheS5zbGljZSgpOltdLGUpfWZ1bmN0aW9uIGdlKHQsZSl7aWYoZT49emUodC5fY2FwYWNpdHkpKXJldHVybiB0Ll90YWlsO2lmKDE8PHQuX2xldmVsK2FyPmUpe2Zvcih2YXIgcj10Ll9yb290LG49dC5fbGV2ZWw7ciYmbj4wOylyPXIuYXJyYXlbZT4+Pm4mZnJdLG4tPWFyO3JldHVybiByfX1mdW5jdGlvbiB3ZSh0LGUscil7dm9pZCAwIT09ZSYmKGU9MHxlKSx2b2lkIDAhPT1yJiYocj0wfHIpO3ZhciBpPXQuX19vd25lcklEfHxuZXcgbixvPXQuX29yaWdpbix1PXQuX2NhcGFjaXR5LHM9bytlLGE9dm9pZCAwPT09cj91OjA+cj91K3I6bytyO1xuICBpZihzPT09byYmYT09PXUpcmV0dXJuIHQ7aWYocz49YSlyZXR1cm4gdC5jbGVhcigpO2Zvcih2YXIgaD10Ll9sZXZlbCxmPXQuX3Jvb3QsYz0wOzA+cytjOylmPW5ldyBfZShmJiZmLmFycmF5Lmxlbmd0aD9bdm9pZCAwLGZdOltdLGkpLGgrPWFyLGMrPTE8PGg7YyYmKHMrPWMsbys9YyxhKz1jLHUrPWMpO2Zvcih2YXIgXz16ZSh1KSxwPXplKGEpO3A+PTE8PGgrYXI7KWY9bmV3IF9lKGYmJmYuYXJyYXkubGVuZ3RoP1tmXTpbXSxpKSxoKz1hcjt2YXIgdj10Ll90YWlsLGw9Xz5wP2dlKHQsYS0xKTpwPl8/bmV3IF9lKFtdLGkpOnY7aWYodiYmcD5fJiZ1PnMmJnYuYXJyYXkubGVuZ3RoKXtmPW1lKGYsaSk7Zm9yKHZhciB5PWYsZD1oO2Q+YXI7ZC09YXIpe3ZhciBtPV8+Pj5kJmZyO3k9eS5hcnJheVttXT1tZSh5LmFycmF5W21dLGkpfXkuYXJyYXlbXz4+PmFyJmZyXT12fWlmKHU+YSYmKGw9bCYmbC5yZW1vdmVBZnRlcihpLDAsYSkpLHM+PXApcy09cCxhLT1wLGg9YXIsZj1udWxsLGw9bCYmbC5yZW1vdmVCZWZvcmUoaSwwLHMpO2Vsc2UgaWYocz5vfHxfPnApe2ZvcihjPTA7Zjspe3ZhciBnPXM+Pj5oJmZyO2lmKGchPT1wPj4+aCZmcilicmVhaztnJiYoYys9KDE8PGgpKmcpLGgtPWFyLGY9Zi5hcnJheVtnXX1mJiZzPm8mJihmPWYucmVtb3ZlQmVmb3JlKGksaCxzLWMpKSxmJiZfPnAmJihmPWYucmVtb3ZlQWZ0ZXIoaSxoLHAtYykpLGMmJihzLT1jLGEtPWMpfXJldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPWEtcyx0Ll9vcmlnaW49cyx0Ll9jYXBhY2l0eT1hLHQuX2xldmVsPWgsdC5fcm9vdD1mLHQuX3RhaWw9bCx0Ll9faGFzaD12b2lkIDAsdC5fX2FsdGVyZWQ9ITAsdCk6dmUocyxhLGgsZixsKX1mdW5jdGlvbiBTZSh0LGUscil7Zm9yKHZhciBuPVtdLGk9MCxvPTA7ci5sZW5ndGg+bztvKyspe3ZhciB1PXJbb10scz12KHUpO3Muc2l6ZT5pJiYoaT1zLnNpemUpLHkodSl8fChzPXMubWFwKGZ1bmN0aW9uKHQpe3JldHVybiBGKHQpfSkpLG4ucHVzaChzKX1yZXR1cm4gaT50LnNpemUmJih0PXQuc2V0U2l6ZShpKSksaWUodCxlLG4pfWZ1bmN0aW9uIHplKHQpe3JldHVybiBocj50PzA6dC0xPj4+YXI8PGFyfWZ1bmN0aW9uIEllKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9EZSgpOmJlKHQpP3Q6RGUoKS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3ZhciByPXAodCk7c3Qoci5zaXplKSxyLmZvckVhY2goZnVuY3Rpb24odCxyKXtyZXR1cm4gZS5zZXQocix0KX0pfSl9ZnVuY3Rpb24gYmUodCl7cmV0dXJuIFR0KHQpJiZ3KHQpfWZ1bmN0aW9uIHFlKHQsZSxyLG4pe3ZhciBpPU9iamVjdC5jcmVhdGUoSWUucHJvdG90eXBlKTtyZXR1cm4gaS5zaXplPXQ/dC5zaXplOjAsaS5fbWFwPXQsaS5fbGlzdD1lLGkuX19vd25lcklEPXIsaS5fX2hhc2g9bixpfWZ1bmN0aW9uIERlKCl7cmV0dXJuIFlyfHwoWXI9cWUoUXQoKSxsZSgpKSl9ZnVuY3Rpb24gTWUodCxlLHIpe3ZhciBuLGksbz10Ll9tYXAsdT10Ll9saXN0LHM9by5nZXQoZSksYT12b2lkIDAhPT1zO2lmKHI9PT1jcil7aWYoIWEpcmV0dXJuIHQ7dS5zaXplPj1ociYmdS5zaXplPj0yKm8uc2l6ZT8oaT11LmZpbHRlcihmdW5jdGlvbih0LGUpe3JldHVybiB2b2lkIDAhPT10JiZzIT09ZX0pLG49aS50b0tleWVkU2VxKCkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0WzBdfSkuZmxpcCgpLnRvTWFwKCksdC5fX293bmVySUQmJihuLl9fb3duZXJJRD1pLl9fb3duZXJJRD10Ll9fb3duZXJJRCkpOihuPW8ucmVtb3ZlKGUpLGk9cz09PXUuc2l6ZS0xP3UucG9wKCk6dS5zZXQocyx2b2lkIDApKX1lbHNlIGlmKGEpe2lmKHI9PT11LmdldChzKVsxXSlyZXR1cm4gdDtuPW8saT11LnNldChzLFtlLHJdKX1lbHNlIG49by5zZXQoZSx1LnNpemUpLGk9dS5zZXQodS5zaXplLFtlLHJdKTtyZXR1cm4gdC5fX293bmVySUQ/KHQuc2l6ZT1uLnNpemUsdC5fbWFwPW4sdC5fbGlzdD1pLHQuX19oYXNoPXZvaWQgMCx0KTpxZShuLGkpfWZ1bmN0aW9uIEVlKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9rZSgpOk9lKHQpP3Q6a2UoKS51bnNoaWZ0QWxsKHQpO1xufWZ1bmN0aW9uIE9lKHQpe3JldHVybiEoIXR8fCF0W1FyXSl9ZnVuY3Rpb24geGUodCxlLHIsbil7dmFyIGk9T2JqZWN0LmNyZWF0ZShYcik7cmV0dXJuIGkuc2l6ZT10LGkuX2hlYWQ9ZSxpLl9fb3duZXJJRD1yLGkuX19oYXNoPW4saS5fX2FsdGVyZWQ9ITEsaX1mdW5jdGlvbiBrZSgpe3JldHVybiBGcnx8KEZyPXhlKDApKX1mdW5jdGlvbiBBZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/S2UoKTpqZSh0KSYmIXcodCk/dDpLZSgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9bCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0KXtyZXR1cm4gZS5hZGQodCl9KX0pfWZ1bmN0aW9uIGplKHQpe3JldHVybiEoIXR8fCF0W0dyXSl9ZnVuY3Rpb24gUmUodCxlKXtyZXR1cm4gdC5fX293bmVySUQ/KHQuc2l6ZT1lLnNpemUsdC5fbWFwPWUsdCk6ZT09PXQuX21hcD90OjA9PT1lLnNpemU/dC5fX2VtcHR5KCk6dC5fX21ha2UoZSl9ZnVuY3Rpb24gVWUodCxlKXt2YXIgcj1PYmplY3QuY3JlYXRlKFpyKTtyZXR1cm4gci5zaXplPXQ/dC5zaXplOjAsci5fbWFwPXQsci5fX293bmVySUQ9ZSxyfWZ1bmN0aW9uIEtlKCl7cmV0dXJuICRyfHwoJHI9VWUoUXQoKSkpfWZ1bmN0aW9uIExlKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9CZSgpOlRlKHQpP3Q6QmUoKS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3ZhciByPWwodCk7c3Qoci5zaXplKSxyLmZvckVhY2goZnVuY3Rpb24odCl7cmV0dXJuIGUuYWRkKHQpfSl9KX1mdW5jdGlvbiBUZSh0KXtyZXR1cm4gamUodCkmJncodCl9ZnVuY3Rpb24gV2UodCxlKXt2YXIgcj1PYmplY3QuY3JlYXRlKHRuKTtyZXR1cm4gci5zaXplPXQ/dC5zaXplOjAsci5fbWFwPXQsci5fX293bmVySUQ9ZSxyfWZ1bmN0aW9uIEJlKCl7cmV0dXJuIGVufHwoZW49V2UoRGUoKSkpfWZ1bmN0aW9uIENlKHQsZSl7dmFyIHIsbj1mdW5jdGlvbihvKXtpZihvIGluc3RhbmNlb2YgbilyZXR1cm4gbztpZighKHRoaXMgaW5zdGFuY2VvZiBuKSlyZXR1cm4gbmV3IG4obyk7aWYoIXIpe3I9ITA7dmFyIHU9T2JqZWN0LmtleXModCk7UGUoaSx1KSxpLnNpemU9dS5sZW5ndGgsaS5fbmFtZT1lLGkuX2tleXM9dSxpLl9kZWZhdWx0VmFsdWVzPXR9dGhpcy5fbWFwPUx0KG8pfSxpPW4ucHJvdG90eXBlPU9iamVjdC5jcmVhdGUocm4pO3JldHVybiBpLmNvbnN0cnVjdG9yPW4sbn1mdW5jdGlvbiBKZSh0LGUscil7dmFyIG49T2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YodCkpO3JldHVybiBuLl9tYXA9ZSxuLl9fb3duZXJJRD1yLG59ZnVuY3Rpb24gTmUodCl7cmV0dXJuIHQuX25hbWV8fHQuY29uc3RydWN0b3IubmFtZXx8XCJSZWNvcmRcIn1mdW5jdGlvbiBQZSh0LGUpe3RyeXtlLmZvckVhY2goSGUuYmluZCh2b2lkIDAsdCkpfWNhdGNoKHIpe319ZnVuY3Rpb24gSGUodCxlKXtPYmplY3QuZGVmaW5lUHJvcGVydHkodCxlLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5nZXQoZSl9LHNldDpmdW5jdGlvbih0KXt1dCh0aGlzLl9fb3duZXJJRCxcIkNhbm5vdCBzZXQgb24gYW4gaW1tdXRhYmxlIHJlY29yZC5cIiksdGhpcy5zZXQoZSx0KX19KX1mdW5jdGlvbiBWZSh0LGUpe2lmKHQ9PT1lKXJldHVybiEwO2lmKCF5KGUpfHx2b2lkIDAhPT10LnNpemUmJnZvaWQgMCE9PWUuc2l6ZSYmdC5zaXplIT09ZS5zaXplfHx2b2lkIDAhPT10Ll9faGFzaCYmdm9pZCAwIT09ZS5fX2hhc2gmJnQuX19oYXNoIT09ZS5fX2hhc2h8fGQodCkhPT1kKGUpfHxtKHQpIT09bShlKXx8dyh0KSE9PXcoZSkpcmV0dXJuITE7aWYoMD09PXQuc2l6ZSYmMD09PWUuc2l6ZSlyZXR1cm4hMDt2YXIgcj0hZyh0KTtpZih3KHQpKXt2YXIgbj10LmVudHJpZXMoKTtyZXR1cm4gZS5ldmVyeShmdW5jdGlvbih0LGUpe3ZhciBpPW4ubmV4dCgpLnZhbHVlO3JldHVybiBpJiZYKGlbMV0sdCkmJihyfHxYKGlbMF0sZSkpfSkmJm4ubmV4dCgpLmRvbmV9dmFyIGk9ITE7aWYodm9pZCAwPT09dC5zaXplKWlmKHZvaWQgMD09PWUuc2l6ZSlcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmNhY2hlUmVzdWx0JiZ0LmNhY2hlUmVzdWx0KCk7ZWxzZXtcbiAgaT0hMDt2YXIgbz10O3Q9ZSxlPW99dmFyIHU9ITAscz1lLl9faXRlcmF0ZShmdW5jdGlvbihlLG4pe3JldHVybihyP3QuaGFzKGUpOmk/WChlLHQuZ2V0KG4sY3IpKTpYKHQuZ2V0KG4sY3IpLGUpKT92b2lkIDA6KHU9ITEsITEpfSk7cmV0dXJuIHUmJnQuc2l6ZT09PXN9ZnVuY3Rpb24gWWUodCxlLHIpe2lmKCEodGhpcyBpbnN0YW5jZW9mIFllKSlyZXR1cm4gbmV3IFllKHQsZSxyKTtpZih1dCgwIT09cixcIkNhbm5vdCBzdGVwIGEgUmFuZ2UgYnkgMFwiKSx0PXR8fDAsdm9pZCAwPT09ZSYmKGU9MS8wKSxyPXZvaWQgMD09PXI/MTpNYXRoLmFicyhyKSx0PmUmJihyPS1yKSx0aGlzLl9zdGFydD10LHRoaXMuX2VuZD1lLHRoaXMuX3N0ZXA9cix0aGlzLnNpemU9TWF0aC5tYXgoMCxNYXRoLmNlaWwoKGUtdCkvci0xKSsxKSwwPT09dGhpcy5zaXplKXtpZihubilyZXR1cm4gbm47bm49dGhpc319ZnVuY3Rpb24gUWUodCxlKXtpZighKHRoaXMgaW5zdGFuY2VvZiBRZSkpcmV0dXJuIG5ldyBRZSh0LGUpO2lmKHRoaXMuX3ZhbHVlPXQsdGhpcy5zaXplPXZvaWQgMD09PWU/MS8wOk1hdGgubWF4KDAsZSksMD09PXRoaXMuc2l6ZSl7aWYob24pcmV0dXJuIG9uO29uPXRoaXN9fWZ1bmN0aW9uIFhlKHQsZSl7dmFyIHI9ZnVuY3Rpb24ocil7dC5wcm90b3R5cGVbcl09ZVtyXX07cmV0dXJuIE9iamVjdC5rZXlzKGUpLmZvckVhY2gociksT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyYmT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhlKS5mb3JFYWNoKHIpLHR9ZnVuY3Rpb24gRmUodCxlKXtyZXR1cm4gZX1mdW5jdGlvbiBHZSh0LGUpe3JldHVybltlLHRdfWZ1bmN0aW9uIFplKHQpe3JldHVybiBmdW5jdGlvbigpe3JldHVybiF0LmFwcGx5KHRoaXMsYXJndW1lbnRzKX19ZnVuY3Rpb24gJGUodCl7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuLXQuYXBwbHkodGhpcyxhcmd1bWVudHMpfX1mdW5jdGlvbiB0cih0KXtyZXR1cm5cInN0cmluZ1wiPT10eXBlb2YgdD9KU09OLnN0cmluZ2lmeSh0KTp0fWZ1bmN0aW9uIGVyKCl7cmV0dXJuIGkoYXJndW1lbnRzKX1mdW5jdGlvbiBycih0LGUpe3JldHVybiBlPnQ/MTp0PmU/LTE6MH1mdW5jdGlvbiBucih0KXtpZih0LnNpemU9PT0xLzApcmV0dXJuIDA7dmFyIGU9dyh0KSxyPWQodCksbj1lPzE6MCxpPXQuX19pdGVyYXRlKHI/ZT9mdW5jdGlvbih0LGUpe249MzEqbitvcihldCh0KSxldChlKSl8MH06ZnVuY3Rpb24odCxlKXtuPW4rb3IoZXQodCksZXQoZSkpfDB9OmU/ZnVuY3Rpb24odCl7bj0zMSpuK2V0KHQpfDB9OmZ1bmN0aW9uKHQpe249bitldCh0KXwwfSk7cmV0dXJuIGlyKGksbil9ZnVuY3Rpb24gaXIodCxlKXtyZXR1cm4gZT1NcihlLDM0MzI5MTgzNTMpLGU9TXIoZTw8MTV8ZT4+Pi0xNSw0NjE4NDU5MDcpLGU9TXIoZTw8MTN8ZT4+Pi0xMyw1KSxlPShlKzM4NjQyOTIxOTZ8MCledCxlPU1yKGVeZT4+PjE2LDIyNDY4MjI1MDcpLGU9TXIoZV5lPj4+MTMsMzI2NjQ4OTkwOSksZT10dChlXmU+Pj4xNil9ZnVuY3Rpb24gb3IodCxlKXtyZXR1cm4gdF5lKzI2NTQ0MzU3NjkrKHQ8PDYpKyh0Pj4yKXwwfXZhciB1cj1BcnJheS5wcm90b3R5cGUuc2xpY2Usc3I9XCJkZWxldGVcIixhcj01LGhyPTE8PGFyLGZyPWhyLTEsY3I9e30sX3I9e3ZhbHVlOiExfSxwcj17dmFsdWU6ITF9O3QocCxfKSx0KHYsXyksdChsLF8pLF8uaXNJdGVyYWJsZT15LF8uaXNLZXllZD1kLF8uaXNJbmRleGVkPW0sXy5pc0Fzc29jaWF0aXZlPWcsXy5pc09yZGVyZWQ9dyxfLktleWVkPXAsXy5JbmRleGVkPXYsXy5TZXQ9bDt2YXIgdnI9XCJAQF9fSU1NVVRBQkxFX0lURVJBQkxFX19AQFwiLGxyPVwiQEBfX0lNTVVUQUJMRV9LRVlFRF9fQEBcIix5cj1cIkBAX19JTU1VVEFCTEVfSU5ERVhFRF9fQEBcIixkcj1cIkBAX19JTU1VVEFCTEVfT1JERVJFRF9fQEBcIixtcj0wLGdyPTEsd3I9MixTcj1cImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJlN5bWJvbC5pdGVyYXRvcix6cj1cIkBAaXRlcmF0b3JcIixJcj1Tcnx8enI7Uy5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm5cIltJdGVyYXRvcl1cIn0sUy5LRVlTPW1yLFxuICBTLlZBTFVFUz1ncixTLkVOVFJJRVM9d3IsUy5wcm90b3R5cGUuaW5zcGVjdD1TLnByb3RvdHlwZS50b1NvdXJjZT1mdW5jdGlvbigpe3JldHVyblwiXCIrdGhpc30sUy5wcm90b3R5cGVbSXJdPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LHQoTyxfKSxPLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIE8oYXJndW1lbnRzKX0sTy5wcm90b3R5cGUudG9TZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sTy5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiU2VxIHtcIixcIn1cIil9LE8ucHJvdG90eXBlLmNhY2hlUmVzdWx0PWZ1bmN0aW9uKCl7cmV0dXJuIXRoaXMuX2NhY2hlJiZ0aGlzLl9faXRlcmF0ZVVuY2FjaGVkJiYodGhpcy5fY2FjaGU9dGhpcy5lbnRyeVNlcSgpLnRvQXJyYXkoKSx0aGlzLnNpemU9dGhpcy5fY2FjaGUubGVuZ3RoKSx0aGlzfSxPLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtyZXR1cm4gTih0aGlzLHQsZSwhMCl9LE8ucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtyZXR1cm4gUCh0aGlzLHQsZSwhMCl9LHQoeCxPKSx4LnByb3RvdHlwZS50b0tleWVkU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LHQoayxPKSxrLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIGsoYXJndW1lbnRzKX0say5wcm90b3R5cGUudG9JbmRleGVkU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LGsucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlNlcSBbXCIsXCJdXCIpfSxrLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtyZXR1cm4gTih0aGlzLHQsZSwhMSl9LGsucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtyZXR1cm4gUCh0aGlzLHQsZSwhMSl9LHQoQSxPKSxBLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIEEoYXJndW1lbnRzKX0sQS5wcm90b3R5cGUudG9TZXRTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sTy5pc1NlcT1MLE8uS2V5ZWQ9eCxPLlNldD1BLE8uSW5kZXhlZD1rO3ZhciBicj1cIkBAX19JTU1VVEFCTEVfU0VRX19AQFwiO08ucHJvdG90eXBlW2JyXT0hMCx0KGosayksai5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuaGFzKHQpP3RoaXMuX2FycmF5W3UodGhpcyx0KV06ZX0sai5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMuX2FycmF5LG49ci5sZW5ndGgtMSxpPTA7bj49aTtpKyspaWYodChyW2U/bi1pOmldLGksdGhpcyk9PT0hMSlyZXR1cm4gaSsxO3JldHVybiBpfSxqLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5fYXJyYXksbj1yLmxlbmd0aC0xLGk9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtyZXR1cm4gaT5uP0koKTp6KHQsaSxyW2U/bi1pKys6aSsrXSl9KX0sdChSLHgpLFIucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB2b2lkIDA9PT1lfHx0aGlzLmhhcyh0KT90aGlzLl9vYmplY3RbdF06ZX0sUi5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9vYmplY3QuaGFzT3duUHJvcGVydHkodCl9LFIucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLl9vYmplY3Qsbj10aGlzLl9rZXlzLGk9bi5sZW5ndGgtMSxvPTA7aT49bztvKyspe3ZhciB1PW5bZT9pLW86b107aWYodChyW3VdLHUsdGhpcyk9PT0hMSlyZXR1cm4gbysxfXJldHVybiBvfSxSLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5fb2JqZWN0LG49dGhpcy5fa2V5cyxpPW4ubGVuZ3RoLTEsbz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB1PW5bZT9pLW86b107cmV0dXJuIG8rKz5pP0koKTp6KHQsdSxyW3VdKX0pfSxSLnByb3RvdHlwZVtkcl09ITAsdChVLGspLFUucHJvdG90eXBlLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZSh0LGUpO3ZhciByPXRoaXMuX2l0ZXJhYmxlLG49RChyKSxpPTA7aWYocShuKSlmb3IodmFyIG87IShvPW4ubmV4dCgpKS5kb25lJiZ0KG8udmFsdWUsaSsrLHRoaXMpIT09ITE7KTtcbiAgcmV0dXJuIGl9LFUucHJvdG90eXBlLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHQsZSk7dmFyIHI9dGhpcy5faXRlcmFibGUsbj1EKHIpO2lmKCFxKG4pKXJldHVybiBuZXcgUyhJKTt2YXIgaT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPW4ubmV4dCgpO3JldHVybiBlLmRvbmU/ZTp6KHQsaSsrLGUudmFsdWUpfSl9LHQoSyxrKSxLLnByb3RvdHlwZS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUodCxlKTtmb3IodmFyIHI9dGhpcy5faXRlcmF0b3Isbj10aGlzLl9pdGVyYXRvckNhY2hlLGk9MDtuLmxlbmd0aD5pOylpZih0KG5baV0saSsrLHRoaXMpPT09ITEpcmV0dXJuIGk7Zm9yKHZhciBvOyEobz1yLm5leHQoKSkuZG9uZTspe3ZhciB1PW8udmFsdWU7aWYobltpXT11LHQodSxpKyssdGhpcyk9PT0hMSlicmVha31yZXR1cm4gaX0sSy5wcm90b3R5cGUuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodCxlKTt2YXIgcj10aGlzLl9pdGVyYXRvcixuPXRoaXMuX2l0ZXJhdG9yQ2FjaGUsaT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2lmKGk+PW4ubGVuZ3RoKXt2YXIgZT1yLm5leHQoKTtpZihlLmRvbmUpcmV0dXJuIGU7bltpXT1lLnZhbHVlfXJldHVybiB6KHQsaSxuW2krK10pfSl9O3ZhciBxcjt0KEgsXyksdChWLEgpLHQoWSxIKSx0KFEsSCksSC5LZXllZD1WLEguSW5kZXhlZD1ZLEguU2V0PVE7dmFyIERyLE1yPVwiZnVuY3Rpb25cIj09dHlwZW9mIE1hdGguaW11bCYmLTI9PT1NYXRoLmltdWwoNDI5NDk2NzI5NSwyKT9NYXRoLmltdWw6ZnVuY3Rpb24odCxlKXt0PTB8dCxlPTB8ZTt2YXIgcj02NTUzNSZ0LG49NjU1MzUmZTtyZXR1cm4gcipuKygodD4+PjE2KSpuK3IqKGU+Pj4xNik8PDE2Pj4+MCl8MH0sRXI9T2JqZWN0LmlzRXh0ZW5zaWJsZSxPcj1mdW5jdGlvbigpe3RyeXtyZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LFwiQFwiLHt9KSwhMH1jYXRjaCh0KXtyZXR1cm4hMX19KCkseHI9XCJmdW5jdGlvblwiPT10eXBlb2YgV2Vha01hcDt4ciYmKERyPW5ldyBXZWFrTWFwKTt2YXIga3I9MCxBcj1cIl9faW1tdXRhYmxlaGFzaF9fXCI7XCJmdW5jdGlvblwiPT10eXBlb2YgU3ltYm9sJiYoQXI9U3ltYm9sKEFyKSk7dmFyIGpyPTE2LFJyPTI1NSxVcj0wLEtyPXt9O3QoYXQseCksYXQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9pdGVyLmdldCh0LGUpfSxhdC5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pdGVyLmhhcyh0KX0sYXQucHJvdG90eXBlLnZhbHVlU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2l0ZXIudmFsdWVTZXEoKX0sYXQucHJvdG90eXBlLnJldmVyc2U9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLGU9dnQodGhpcywhMCk7cmV0dXJuIHRoaXMuX3VzZUtleXN8fChlLnZhbHVlU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHQuX2l0ZXIudG9TZXEoKS5yZXZlcnNlKCl9KSxlfSxhdC5wcm90b3R5cGUubWFwPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPXB0KHRoaXMsdCxlKTtyZXR1cm4gdGhpcy5fdXNlS2V5c3x8KG4udmFsdWVTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gci5faXRlci50b1NlcSgpLm1hcCh0LGUpfSksbn0sYXQucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByLG49dGhpcztyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUodGhpcy5fdXNlS2V5cz9mdW5jdGlvbihlLHIpe3JldHVybiB0KGUscixuKX06KHI9ZT9rdCh0aGlzKTowLGZ1bmN0aW9uKGkpe3JldHVybiB0KGksZT8tLXI6cisrLG4pfSksZSl9LGF0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7aWYodGhpcy5fdXNlS2V5cylyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdG9yKHQsZSk7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpLG49ZT9rdCh0aGlzKTowO1xuICByZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgaT1yLm5leHQoKTtyZXR1cm4gaS5kb25lP2k6eih0LGU/LS1uOm4rKyxpLnZhbHVlLGkpfSl9LGF0LnByb3RvdHlwZVtkcl09ITAsdChodCxrKSxodC5wcm90b3R5cGUuaW5jbHVkZXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2l0ZXIuaW5jbHVkZXModCl9LGh0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLG49MDtyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoZnVuY3Rpb24oZSl7cmV0dXJuIHQoZSxuKysscil9LGUpfSxodC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2l0ZXIuX19pdGVyYXRvcihncixlKSxuPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9ci5uZXh0KCk7cmV0dXJuIGUuZG9uZT9lOnoodCxuKyssZS52YWx1ZSxlKX0pfSx0KGZ0LEEpLGZ0LnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2l0ZXIuaW5jbHVkZXModCl9LGZ0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gdChlLGUscil9LGUpfSxmdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2l0ZXIuX19pdGVyYXRvcihncixlKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgZT1yLm5leHQoKTtyZXR1cm4gZS5kb25lP2U6eih0LGUudmFsdWUsZS52YWx1ZSxlKX0pfSx0KGN0LHgpLGN0LnByb3RvdHlwZS5lbnRyeVNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9pdGVyLnRvU2VxKCl9LGN0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZShmdW5jdGlvbihlKXtpZihlKXt4dChlKTt2YXIgbj15KGUpO3JldHVybiB0KG4/ZS5nZXQoMSk6ZVsxXSxuP2UuZ2V0KDApOmVbMF0scil9fSxlKX0sY3QucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7Zm9yKDs7KXt2YXIgZT1yLm5leHQoKTtpZihlLmRvbmUpcmV0dXJuIGU7dmFyIG49ZS52YWx1ZTtpZihuKXt4dChuKTt2YXIgaT15KG4pO3JldHVybiB6KHQsaT9uLmdldCgwKTpuWzBdLGk/bi5nZXQoMSk6blsxXSxlKX19fSl9LGh0LnByb3RvdHlwZS5jYWNoZVJlc3VsdD1hdC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9ZnQucHJvdG90eXBlLmNhY2hlUmVzdWx0PWN0LnByb3RvdHlwZS5jYWNoZVJlc3VsdD1SdCx0KEx0LFYpLEx0LnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJNYXAge1wiLFwifVwiKX0sTHQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9yb290P3RoaXMuX3Jvb3QuZ2V0KDAsdm9pZCAwLHQsZSk6ZX0sTHQucHJvdG90eXBlLnNldD1mdW5jdGlvbih0LGUpe3JldHVybiBYdCh0aGlzLHQsZSl9LEx0LnByb3RvdHlwZS5zZXRJbj1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnVwZGF0ZUluKHQsY3IsZnVuY3Rpb24oKXtyZXR1cm4gZX0pfSxMdC5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe3JldHVybiBYdCh0aGlzLHQsY3IpfSxMdC5wcm90b3R5cGUuZGVsZXRlSW49ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxmdW5jdGlvbigpe3JldHVybiBjcn0pfSxMdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gMT09PWFyZ3VtZW50cy5sZW5ndGg/dCh0aGlzKTp0aGlzLnVwZGF0ZUluKFt0XSxlLHIpfSxMdC5wcm90b3R5cGUudXBkYXRlSW49ZnVuY3Rpb24odCxlLHIpe3J8fChyPWUsZT12b2lkIDApO3ZhciBuPW9lKHRoaXMsS3QodCksZSxyKTtyZXR1cm4gbj09PWNyP3ZvaWQgMDpufSxMdC5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT90aGlzOnRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9MCx0aGlzLl9yb290PW51bGwsXG4gIHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTpRdCgpfSxMdC5wcm90b3R5cGUubWVyZ2U9ZnVuY3Rpb24oKXtyZXR1cm4gcmUodGhpcyx2b2lkIDAsYXJndW1lbnRzKX0sTHQucHJvdG90eXBlLm1lcmdlV2l0aD1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gcmUodGhpcyx0LGUpfSxMdC5wcm90b3R5cGUubWVyZ2VJbj1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gdGhpcy51cGRhdGVJbih0LFF0KCksZnVuY3Rpb24odCl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5tZXJnZT90Lm1lcmdlLmFwcGx5KHQsZSk6ZVtlLmxlbmd0aC0xXX0pfSxMdC5wcm90b3R5cGUubWVyZ2VEZWVwPWZ1bmN0aW9uKCl7cmV0dXJuIHJlKHRoaXMsbmUodm9pZCAwKSxhcmd1bWVudHMpfSxMdC5wcm90b3R5cGUubWVyZ2VEZWVwV2l0aD1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gcmUodGhpcyxuZSh0KSxlKX0sTHQucHJvdG90eXBlLm1lcmdlRGVlcEluPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiB0aGlzLnVwZGF0ZUluKHQsUXQoKSxmdW5jdGlvbih0KXtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm1lcmdlRGVlcD90Lm1lcmdlRGVlcC5hcHBseSh0LGUpOmVbZS5sZW5ndGgtMV19KX0sTHQucHJvdG90eXBlLnNvcnQ9ZnVuY3Rpb24odCl7cmV0dXJuIEllKHF0KHRoaXMsdCkpfSxMdC5wcm90b3R5cGUuc29ydEJ5PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIEllKHF0KHRoaXMsZSx0KSl9LEx0LnByb3RvdHlwZS53aXRoTXV0YXRpb25zPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuYXNNdXRhYmxlKCk7cmV0dXJuIHQoZSksZS53YXNBbHRlcmVkKCk/ZS5fX2Vuc3VyZU93bmVyKHRoaXMuX19vd25lcklEKTp0aGlzfSxMdC5wcm90b3R5cGUuYXNNdXRhYmxlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19vd25lcklEP3RoaXM6dGhpcy5fX2Vuc3VyZU93bmVyKG5ldyBuKX0sTHQucHJvdG90eXBlLmFzSW1tdXRhYmxlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19lbnN1cmVPd25lcigpfSxMdC5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fYWx0ZXJlZH0sTHQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbmV3IFB0KHRoaXMsdCxlKX0sTHQucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj0wO3JldHVybiB0aGlzLl9yb290JiZ0aGlzLl9yb290Lml0ZXJhdGUoZnVuY3Rpb24oZSl7cmV0dXJuIG4rKyx0KGVbMV0sZVswXSxyKX0sZSksbn0sTHQucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7cmV0dXJuIHQ9PT10aGlzLl9fb3duZXJJRD90aGlzOnQ/WXQodGhpcy5zaXplLHRoaXMuX3Jvb3QsdCx0aGlzLl9faGFzaCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fX2FsdGVyZWQ9ITEsdGhpcyl9LEx0LmlzTWFwPVR0O3ZhciBMcj1cIkBAX19JTU1VVEFCTEVfTUFQX19AQFwiLFRyPUx0LnByb3RvdHlwZTtUcltMcl09ITAsVHJbc3JdPVRyLnJlbW92ZSxUci5yZW1vdmVJbj1Uci5kZWxldGVJbixXdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe2Zvcih2YXIgaT10aGlzLmVudHJpZXMsbz0wLHU9aS5sZW5ndGg7dT5vO28rKylpZihYKHIsaVtvXVswXSkpcmV0dXJuIGlbb11bMV07cmV0dXJuIG59LFd0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLG4sbyx1LHMsYSl7Zm9yKHZhciBoPXU9PT1jcixmPXRoaXMuZW50cmllcyxjPTAsXz1mLmxlbmd0aDtfPmMmJiFYKG8sZltjXVswXSk7YysrKTt2YXIgcD1fPmM7aWYocD9mW2NdWzFdPT09dTpoKXJldHVybiB0aGlzO2lmKHIoYSksKGh8fCFwKSYmcihzKSwhaHx8MSE9PWYubGVuZ3RoKXtpZighcCYmIWgmJmYubGVuZ3RoPj1CcilyZXR1cm4gJHQodCxmLG8sdSk7dmFyIHY9dCYmdD09PXRoaXMub3duZXJJRCxsPXY/ZjppKGYpO3JldHVybiBwP2g/Yz09PV8tMT9sLnBvcCgpOmxbY109bC5wb3AoKTpsW2NdPVtvLHVdOmwucHVzaChbbyx1XSksXG4gIHY/KHRoaXMuZW50cmllcz1sLHRoaXMpOm5ldyBXdCh0LGwpfX0sQnQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXt2b2lkIDA9PT1lJiYoZT1ldChyKSk7dmFyIGk9MTw8KCgwPT09dD9lOmU+Pj50KSZmciksbz10aGlzLmJpdG1hcDtyZXR1cm4gMD09PShvJmkpP246dGhpcy5ub2Rlc1t1ZShvJmktMSldLmdldCh0K2FyLGUscixuKX0sQnQucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUscixuLGksbyx1KXt2b2lkIDA9PT1yJiYocj1ldChuKSk7dmFyIHM9KDA9PT1lP3I6cj4+PmUpJmZyLGE9MTw8cyxoPXRoaXMuYml0bWFwLGY9MCE9PShoJmEpO2lmKCFmJiZpPT09Y3IpcmV0dXJuIHRoaXM7dmFyIGM9dWUoaCZhLTEpLF89dGhpcy5ub2RlcyxwPWY/X1tjXTp2b2lkIDAsdj1GdChwLHQsZSthcixyLG4saSxvLHUpO2lmKHY9PT1wKXJldHVybiB0aGlzO2lmKCFmJiZ2JiZfLmxlbmd0aD49Q3IpcmV0dXJuIGVlKHQsXyxoLHMsdik7aWYoZiYmIXYmJjI9PT1fLmxlbmd0aCYmR3QoX1sxXmNdKSlyZXR1cm4gX1sxXmNdO2lmKGYmJnYmJjE9PT1fLmxlbmd0aCYmR3QodikpcmV0dXJuIHY7dmFyIGw9dCYmdD09PXRoaXMub3duZXJJRCx5PWY/dj9oOmheYTpofGEsZD1mP3Y/c2UoXyxjLHYsbCk6aGUoXyxjLGwpOmFlKF8sYyx2LGwpO3JldHVybiBsPyh0aGlzLmJpdG1hcD15LHRoaXMubm9kZXM9ZCx0aGlzKTpuZXcgQnQodCx5LGQpfSxDdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe3ZvaWQgMD09PWUmJihlPWV0KHIpKTt2YXIgaT0oMD09PXQ/ZTplPj4+dCkmZnIsbz10aGlzLm5vZGVzW2ldO3JldHVybiBvP28uZ2V0KHQrYXIsZSxyLG4pOm59LEN0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLHIsbixpLG8sdSl7dm9pZCAwPT09ciYmKHI9ZXQobikpO3ZhciBzPSgwPT09ZT9yOnI+Pj5lKSZmcixhPWk9PT1jcixoPXRoaXMubm9kZXMsZj1oW3NdO2lmKGEmJiFmKXJldHVybiB0aGlzO3ZhciBjPUZ0KGYsdCxlK2FyLHIsbixpLG8sdSk7aWYoYz09PWYpcmV0dXJuIHRoaXM7dmFyIF89dGhpcy5jb3VudDtpZihmKXtpZighYyYmKF8tLSxKcj5fKSlyZXR1cm4gdGUodCxoLF8scyl9ZWxzZSBfKys7dmFyIHA9dCYmdD09PXRoaXMub3duZXJJRCx2PXNlKGgscyxjLHApO3JldHVybiBwPyh0aGlzLmNvdW50PV8sdGhpcy5ub2Rlcz12LHRoaXMpOm5ldyBDdCh0LF8sdil9LEp0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7Zm9yKHZhciBpPXRoaXMuZW50cmllcyxvPTAsdT1pLmxlbmd0aDt1Pm87bysrKWlmKFgocixpW29dWzBdKSlyZXR1cm4gaVtvXVsxXTtyZXR1cm4gbn0sSnQucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUsbixvLHUscyxhKXt2b2lkIDA9PT1uJiYobj1ldChvKSk7dmFyIGg9dT09PWNyO2lmKG4hPT10aGlzLmtleUhhc2gpcmV0dXJuIGg/dGhpczoocihhKSxyKHMpLFp0KHRoaXMsdCxlLG4sW28sdV0pKTtmb3IodmFyIGY9dGhpcy5lbnRyaWVzLGM9MCxfPWYubGVuZ3RoO18+YyYmIVgobyxmW2NdWzBdKTtjKyspO3ZhciBwPV8+YztpZihwP2ZbY11bMV09PT11OmgpcmV0dXJuIHRoaXM7aWYocihhKSwoaHx8IXApJiZyKHMpLGgmJjI9PT1fKXJldHVybiBuZXcgTnQodCx0aGlzLmtleUhhc2gsZlsxXmNdKTt2YXIgdj10JiZ0PT09dGhpcy5vd25lcklELGw9dj9mOmkoZik7cmV0dXJuIHA/aD9jPT09Xy0xP2wucG9wKCk6bFtjXT1sLnBvcCgpOmxbY109W28sdV06bC5wdXNoKFtvLHVdKSx2Pyh0aGlzLmVudHJpZXM9bCx0aGlzKTpuZXcgSnQodCx0aGlzLmtleUhhc2gsbCl9LE50LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7cmV0dXJuIFgocix0aGlzLmVudHJ5WzBdKT90aGlzLmVudHJ5WzFdOm59LE50LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLG4saSxvLHUscyl7dmFyIGE9bz09PWNyLGg9WChpLHRoaXMuZW50cnlbMF0pO3JldHVybihoP289PT10aGlzLmVudHJ5WzFdOmEpP3RoaXM6KHIocyksYT92b2lkIHIodSk6aD90JiZ0PT09dGhpcy5vd25lcklEPyh0aGlzLmVudHJ5WzFdPW8sdGhpcyk6bmV3IE50KHQsdGhpcy5rZXlIYXNoLFtpLG9dKToocih1KSxcbiAgWnQodGhpcyx0LGUsZXQoaSksW2ksb10pKSl9LFd0LnByb3RvdHlwZS5pdGVyYXRlPUp0LnByb3RvdHlwZS5pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMuZW50cmllcyxuPTAsaT1yLmxlbmd0aC0xO2k+PW47bisrKWlmKHQocltlP2ktbjpuXSk9PT0hMSlyZXR1cm4hMX0sQnQucHJvdG90eXBlLml0ZXJhdGU9Q3QucHJvdG90eXBlLml0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5ub2RlcyxuPTAsaT1yLmxlbmd0aC0xO2k+PW47bisrKXt2YXIgbz1yW2U/aS1uOm5dO2lmKG8mJm8uaXRlcmF0ZSh0LGUpPT09ITEpcmV0dXJuITF9fSxOdC5wcm90b3R5cGUuaXRlcmF0ZT1mdW5jdGlvbih0KXtyZXR1cm4gdCh0aGlzLmVudHJ5KX0sdChQdCxTKSxQdC5wcm90b3R5cGUubmV4dD1mdW5jdGlvbigpe2Zvcih2YXIgdD10aGlzLl90eXBlLGU9dGhpcy5fc3RhY2s7ZTspe3ZhciByLG49ZS5ub2RlLGk9ZS5pbmRleCsrO2lmKG4uZW50cnkpe2lmKDA9PT1pKXJldHVybiBIdCh0LG4uZW50cnkpfWVsc2UgaWYobi5lbnRyaWVzKXtpZihyPW4uZW50cmllcy5sZW5ndGgtMSxyPj1pKXJldHVybiBIdCh0LG4uZW50cmllc1t0aGlzLl9yZXZlcnNlP3ItaTppXSl9ZWxzZSBpZihyPW4ubm9kZXMubGVuZ3RoLTEscj49aSl7dmFyIG89bi5ub2Rlc1t0aGlzLl9yZXZlcnNlP3ItaTppXTtpZihvKXtpZihvLmVudHJ5KXJldHVybiBIdCh0LG8uZW50cnkpO2U9dGhpcy5fc3RhY2s9VnQobyxlKX1jb250aW51ZX1lPXRoaXMuX3N0YWNrPXRoaXMuX3N0YWNrLl9fcHJldn1yZXR1cm4gSSgpfTt2YXIgV3IsQnI9aHIvNCxDcj1oci8yLEpyPWhyLzQ7dChmZSxZKSxmZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LGZlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJMaXN0IFtcIixcIl1cIil9LGZlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtpZih0PXUodGhpcyx0KSx0Pj0wJiZ0aGlzLnNpemU+dCl7dCs9dGhpcy5fb3JpZ2luO3ZhciByPWdlKHRoaXMsdCk7cmV0dXJuIHImJnIuYXJyYXlbdCZmcl19cmV0dXJuIGV9LGZlLnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4geWUodGhpcyx0LGUpfSxmZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmhhcyh0KT8wPT09dD90aGlzLnNoaWZ0KCk6dD09PXRoaXMuc2l6ZS0xP3RoaXMucG9wKCk6dGhpcy5zcGxpY2UodCwxKTp0aGlzfSxmZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT90aGlzOnRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9dGhpcy5fb3JpZ2luPXRoaXMuX2NhcGFjaXR5PTAsdGhpcy5fbGV2ZWw9YXIsdGhpcy5fcm9vdD10aGlzLl90YWlsPW51bGwsdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOmxlKCl9LGZlLnByb3RvdHlwZS5wdXNoPWZ1bmN0aW9uKCl7dmFyIHQ9YXJndW1lbnRzLGU9dGhpcy5zaXplO3JldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24ocil7d2UociwwLGUrdC5sZW5ndGgpO2Zvcih2YXIgbj0wO3QubGVuZ3RoPm47bisrKXIuc2V0KGUrbix0W25dKX0pfSxmZS5wcm90b3R5cGUucG9wPWZ1bmN0aW9uKCl7cmV0dXJuIHdlKHRoaXMsMCwtMSl9LGZlLnByb3RvdHlwZS51bnNoaWZ0PWZ1bmN0aW9uKCl7dmFyIHQ9YXJndW1lbnRzO3JldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7d2UoZSwtdC5sZW5ndGgpO2Zvcih2YXIgcj0wO3QubGVuZ3RoPnI7cisrKWUuc2V0KHIsdFtyXSl9KX0sZmUucHJvdG90eXBlLnNoaWZ0PWZ1bmN0aW9uKCl7cmV0dXJuIHdlKHRoaXMsMSl9LGZlLnByb3RvdHlwZS5tZXJnZT1mdW5jdGlvbigpe3JldHVybiBTZSh0aGlzLHZvaWQgMCxhcmd1bWVudHMpfSxmZS5wcm90b3R5cGUubWVyZ2VXaXRoPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiBTZSh0aGlzLHQsZSl9LGZlLnByb3RvdHlwZS5tZXJnZURlZXA9ZnVuY3Rpb24oKXtyZXR1cm4gU2UodGhpcyxuZSh2b2lkIDApLGFyZ3VtZW50cyk7XG59LGZlLnByb3RvdHlwZS5tZXJnZURlZXBXaXRoPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiBTZSh0aGlzLG5lKHQpLGUpfSxmZS5wcm90b3R5cGUuc2V0U2l6ZT1mdW5jdGlvbih0KXtyZXR1cm4gd2UodGhpcywwLHQpfSxmZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLnNpemU7cmV0dXJuIGEodCxlLHIpP3RoaXM6d2UodGhpcyxoKHQsciksZihlLHIpKX0sZmUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj0wLG49cGUodGhpcyxlKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgZT1uKCk7cmV0dXJuIGU9PT1Wcj9JKCk6eih0LHIrKyxlKX0pfSxmZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByLG49MCxpPXBlKHRoaXMsZSk7KHI9aSgpKSE9PVZyJiZ0KHIsbisrLHRoaXMpIT09ITE7KTtyZXR1cm4gbn0sZmUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7cmV0dXJuIHQ9PT10aGlzLl9fb3duZXJJRD90aGlzOnQ/dmUodGhpcy5fb3JpZ2luLHRoaXMuX2NhcGFjaXR5LHRoaXMuX2xldmVsLHRoaXMuX3Jvb3QsdGhpcy5fdGFpbCx0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzKX0sZmUuaXNMaXN0PWNlO3ZhciBOcj1cIkBAX19JTU1VVEFCTEVfTElTVF9fQEBcIixQcj1mZS5wcm90b3R5cGU7UHJbTnJdPSEwLFByW3NyXT1Qci5yZW1vdmUsUHIuc2V0SW49VHIuc2V0SW4sUHIuZGVsZXRlSW49UHIucmVtb3ZlSW49VHIucmVtb3ZlSW4sUHIudXBkYXRlPVRyLnVwZGF0ZSxQci51cGRhdGVJbj1Uci51cGRhdGVJbixQci5tZXJnZUluPVRyLm1lcmdlSW4sUHIubWVyZ2VEZWVwSW49VHIubWVyZ2VEZWVwSW4sUHIud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLFByLmFzTXV0YWJsZT1Uci5hc011dGFibGUsUHIuYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsUHIud2FzQWx0ZXJlZD1Uci53YXNBbHRlcmVkLF9lLnByb3RvdHlwZS5yZW1vdmVCZWZvcmU9ZnVuY3Rpb24odCxlLHIpe2lmKHI9PT1lPzE8PGU6MD09PXRoaXMuYXJyYXkubGVuZ3RoKXJldHVybiB0aGlzO3ZhciBuPXI+Pj5lJmZyO2lmKG4+PXRoaXMuYXJyYXkubGVuZ3RoKXJldHVybiBuZXcgX2UoW10sdCk7dmFyIGksbz0wPT09bjtpZihlPjApe3ZhciB1PXRoaXMuYXJyYXlbbl07aWYoaT11JiZ1LnJlbW92ZUJlZm9yZSh0LGUtYXIsciksaT09PXUmJm8pcmV0dXJuIHRoaXN9aWYobyYmIWkpcmV0dXJuIHRoaXM7dmFyIHM9bWUodGhpcyx0KTtpZighbylmb3IodmFyIGE9MDtuPmE7YSsrKXMuYXJyYXlbYV09dm9pZCAwO3JldHVybiBpJiYocy5hcnJheVtuXT1pKSxzfSxfZS5wcm90b3R5cGUucmVtb3ZlQWZ0ZXI9ZnVuY3Rpb24odCxlLHIpe2lmKHI9PT0oZT8xPDxlOjApfHwwPT09dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIHRoaXM7dmFyIG49ci0xPj4+ZSZmcjtpZihuPj10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gdGhpczt2YXIgaTtpZihlPjApe3ZhciBvPXRoaXMuYXJyYXlbbl07aWYoaT1vJiZvLnJlbW92ZUFmdGVyKHQsZS1hcixyKSxpPT09byYmbj09PXRoaXMuYXJyYXkubGVuZ3RoLTEpcmV0dXJuIHRoaXN9dmFyIHU9bWUodGhpcyx0KTtyZXR1cm4gdS5hcnJheS5zcGxpY2UobisxKSxpJiYodS5hcnJheVtuXT1pKSx1fTt2YXIgSHIsVnI9e307dChJZSxMdCksSWUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxJZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiT3JkZXJlZE1hcCB7XCIsXCJ9XCIpfSxJZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5fbWFwLmdldCh0KTtyZXR1cm4gdm9pZCAwIT09cj90aGlzLl9saXN0LmdldChyKVsxXTplfSxJZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT90aGlzOnRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9MCx0aGlzLl9tYXAuY2xlYXIoKSx0aGlzLl9saXN0LmNsZWFyKCksdGhpcyk6RGUoKTtcbn0sSWUucHJvdG90eXBlLnNldD1mdW5jdGlvbih0LGUpe3JldHVybiBNZSh0aGlzLHQsZSl9LEllLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7cmV0dXJuIE1lKHRoaXMsdCxjcil9LEllLnByb3RvdHlwZS53YXNBbHRlcmVkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCl8fHRoaXMuX2xpc3Qud2FzQWx0ZXJlZCgpfSxJZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5fbGlzdC5fX2l0ZXJhdGUoZnVuY3Rpb24oZSl7cmV0dXJuIGUmJnQoZVsxXSxlWzBdLHIpfSxlKX0sSWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5fbGlzdC5mcm9tRW50cnlTZXEoKS5fX2l0ZXJhdG9yKHQsZSl9LEllLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe2lmKHQ9PT10aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAuX19lbnN1cmVPd25lcih0KSxyPXRoaXMuX2xpc3QuX19lbnN1cmVPd25lcih0KTtyZXR1cm4gdD9xZShlLHIsdCx0aGlzLl9faGFzaCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fbWFwPWUsdGhpcy5fbGlzdD1yLHRoaXMpfSxJZS5pc09yZGVyZWRNYXA9YmUsSWUucHJvdG90eXBlW2RyXT0hMCxJZS5wcm90b3R5cGVbc3JdPUllLnByb3RvdHlwZS5yZW1vdmU7dmFyIFlyO3QoRWUsWSksRWUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxFZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiU3RhY2sgW1wiLFwiXVwiKX0sRWUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2hlYWQ7Zm9yKHQ9dSh0aGlzLHQpO3ImJnQtLTspcj1yLm5leHQ7cmV0dXJuIHI/ci52YWx1ZTplfSxFZS5wcm90b3R5cGUucGVlaz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9oZWFkJiZ0aGlzLl9oZWFkLnZhbHVlfSxFZS5wcm90b3R5cGUucHVzaD1mdW5jdGlvbigpe2lmKDA9PT1hcmd1bWVudHMubGVuZ3RoKXJldHVybiB0aGlzO2Zvcih2YXIgdD10aGlzLnNpemUrYXJndW1lbnRzLmxlbmd0aCxlPXRoaXMuX2hlYWQscj1hcmd1bWVudHMubGVuZ3RoLTE7cj49MDtyLS0pZT17dmFsdWU6YXJndW1lbnRzW3JdLG5leHQ6ZX07cmV0dXJuIHRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9dCx0aGlzLl9oZWFkPWUsdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOnhlKHQsZSl9LEVlLnByb3RvdHlwZS5wdXNoQWxsPWZ1bmN0aW9uKHQpe2lmKHQ9dih0KSwwPT09dC5zaXplKXJldHVybiB0aGlzO3N0KHQuc2l6ZSk7dmFyIGU9dGhpcy5zaXplLHI9dGhpcy5faGVhZDtyZXR1cm4gdC5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbih0KXtlKysscj17dmFsdWU6dCxuZXh0OnJ9fSksdGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT1lLHRoaXMuX2hlYWQ9cix0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6eGUoZSxyKX0sRWUucHJvdG90eXBlLnBvcD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnNsaWNlKDEpfSxFZS5wcm90b3R5cGUudW5zaGlmdD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnB1c2guYXBwbHkodGhpcyxhcmd1bWVudHMpfSxFZS5wcm90b3R5cGUudW5zaGlmdEFsbD1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5wdXNoQWxsKHQpfSxFZS5wcm90b3R5cGUuc2hpZnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wb3AuYXBwbHkodGhpcyxhcmd1bWVudHMpfSxFZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT90aGlzOnRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9MCx0aGlzLl9oZWFkPXZvaWQgMCx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6a2UoKX0sRWUucHJvdG90eXBlLnNsaWNlPWZ1bmN0aW9uKHQsZSl7aWYoYSh0LGUsdGhpcy5zaXplKSlyZXR1cm4gdGhpczt2YXIgcj1oKHQsdGhpcy5zaXplKSxuPWYoZSx0aGlzLnNpemUpO2lmKG4hPT10aGlzLnNpemUpcmV0dXJuIFkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcyx0LGUpO1xuICBmb3IodmFyIGk9dGhpcy5zaXplLXIsbz10aGlzLl9oZWFkO3ItLTspbz1vLm5leHQ7cmV0dXJuIHRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9aSx0aGlzLl9oZWFkPW8sdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOnhlKGksbyl9LEVlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe3JldHVybiB0PT09dGhpcy5fX293bmVySUQ/dGhpczp0P3hlKHRoaXMuc2l6ZSx0aGlzLl9oZWFkLHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX19hbHRlcmVkPSExLHRoaXMpfSxFZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5yZXZlcnNlKCkuX19pdGVyYXRlKHQpO2Zvcih2YXIgcj0wLG49dGhpcy5faGVhZDtuJiZ0KG4udmFsdWUscisrLHRoaXMpIT09ITE7KW49bi5uZXh0O3JldHVybiByfSxFZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMucmV2ZXJzZSgpLl9faXRlcmF0b3IodCk7dmFyIHI9MCxuPXRoaXMuX2hlYWQ7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7aWYobil7dmFyIGU9bi52YWx1ZTtyZXR1cm4gbj1uLm5leHQseih0LHIrKyxlKX1yZXR1cm4gSSgpfSl9LEVlLmlzU3RhY2s9T2U7dmFyIFFyPVwiQEBfX0lNTVVUQUJMRV9TVEFDS19fQEBcIixYcj1FZS5wcm90b3R5cGU7WHJbUXJdPSEwLFhyLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxYci5hc011dGFibGU9VHIuYXNNdXRhYmxlLFhyLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLFhyLndhc0FsdGVyZWQ9VHIud2FzQWx0ZXJlZDt2YXIgRnI7dChBZSxRKSxBZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LEFlLmZyb21LZXlzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzKHAodCkua2V5U2VxKCkpfSxBZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiU2V0IHtcIixcIn1cIil9LEFlLnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX21hcC5oYXModCl9LEFlLnByb3RvdHlwZS5hZGQ9ZnVuY3Rpb24odCl7cmV0dXJuIFJlKHRoaXMsdGhpcy5fbWFwLnNldCh0LCEwKSl9LEFlLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7cmV0dXJuIFJlKHRoaXMsdGhpcy5fbWFwLnJlbW92ZSh0KSl9LEFlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiBSZSh0aGlzLHRoaXMuX21hcC5jbGVhcigpKX0sQWUucHJvdG90eXBlLnVuaW9uPWZ1bmN0aW9uKCl7dmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMCk7cmV0dXJuIHQ9dC5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIDAhPT10LnNpemV9KSwwPT09dC5sZW5ndGg/dGhpczowIT09dGhpcy5zaXplfHx0aGlzLl9fb3duZXJJRHx8MSE9PXQubGVuZ3RoP3RoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXtmb3IodmFyIHI9MDt0Lmxlbmd0aD5yO3IrKylsKHRbcl0pLmZvckVhY2goZnVuY3Rpb24odCl7cmV0dXJuIGUuYWRkKHQpfSl9KTp0aGlzLmNvbnN0cnVjdG9yKHRbMF0pfSxBZS5wcm90b3R5cGUuaW50ZXJzZWN0PWZ1bmN0aW9uKCl7dmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMCk7aWYoMD09PXQubGVuZ3RoKXJldHVybiB0aGlzO3Q9dC5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIGwodCl9KTt2YXIgZT10aGlzO3JldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24ocil7ZS5mb3JFYWNoKGZ1bmN0aW9uKGUpe3QuZXZlcnkoZnVuY3Rpb24odCl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9KXx8ci5yZW1vdmUoZSl9KX0pfSxBZS5wcm90b3R5cGUuc3VidHJhY3Q9ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtpZigwPT09dC5sZW5ndGgpcmV0dXJuIHRoaXM7dD10Lm1hcChmdW5jdGlvbih0KXtyZXR1cm4gbCh0KX0pO3ZhciBlPXRoaXM7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihyKXtlLmZvckVhY2goZnVuY3Rpb24oZSl7dC5zb21lKGZ1bmN0aW9uKHQpe3JldHVybiB0LmluY2x1ZGVzKGUpfSkmJnIucmVtb3ZlKGUpO1xufSl9KX0sQWUucHJvdG90eXBlLm1lcmdlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudW5pb24uYXBwbHkodGhpcyxhcmd1bWVudHMpfSxBZS5wcm90b3R5cGUubWVyZ2VXaXRoPWZ1bmN0aW9uKCl7dmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHRoaXMudW5pb24uYXBwbHkodGhpcyx0KX0sQWUucHJvdG90eXBlLnNvcnQ9ZnVuY3Rpb24odCl7cmV0dXJuIExlKHF0KHRoaXMsdCkpfSxBZS5wcm90b3R5cGUuc29ydEJ5PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIExlKHF0KHRoaXMsZSx0KSl9LEFlLnByb3RvdHlwZS53YXNBbHRlcmVkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCl9LEFlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiB0aGlzLl9tYXAuX19pdGVyYXRlKGZ1bmN0aW9uKGUsbil7cmV0dXJuIHQobixuLHIpfSxlKX0sQWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5fbWFwLm1hcChmdW5jdGlvbih0LGUpe3JldHVybiBlfSkuX19pdGVyYXRvcih0LGUpfSxBZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtpZih0PT09dGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXM7dmFyIGU9dGhpcy5fbWFwLl9fZW5zdXJlT3duZXIodCk7cmV0dXJuIHQ/dGhpcy5fX21ha2UoZSx0KToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9tYXA9ZSx0aGlzKX0sQWUuaXNTZXQ9amU7dmFyIEdyPVwiQEBfX0lNTVVUQUJMRV9TRVRfX0BAXCIsWnI9QWUucHJvdG90eXBlO1pyW0dyXT0hMCxacltzcl09WnIucmVtb3ZlLFpyLm1lcmdlRGVlcD1aci5tZXJnZSxaci5tZXJnZURlZXBXaXRoPVpyLm1lcmdlV2l0aCxaci53aXRoTXV0YXRpb25zPVRyLndpdGhNdXRhdGlvbnMsWnIuYXNNdXRhYmxlPVRyLmFzTXV0YWJsZSxaci5hc0ltbXV0YWJsZT1Uci5hc0ltbXV0YWJsZSxaci5fX2VtcHR5PUtlLFpyLl9fbWFrZT1VZTt2YXIgJHI7dChMZSxBZSksTGUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxMZS5mcm9tS2V5cz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcyhwKHQpLmtleVNlcSgpKX0sTGUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIk9yZGVyZWRTZXQge1wiLFwifVwiKX0sTGUuaXNPcmRlcmVkU2V0PVRlO3ZhciB0bj1MZS5wcm90b3R5cGU7dG5bZHJdPSEwLHRuLl9fZW1wdHk9QmUsdG4uX19tYWtlPVdlO3ZhciBlbjt0KENlLFYpLENlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoTmUodGhpcykrXCIge1wiLFwifVwiKX0sQ2UucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fZGVmYXVsdFZhbHVlcy5oYXNPd25Qcm9wZXJ0eSh0KX0sQ2UucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe2lmKCF0aGlzLmhhcyh0KSlyZXR1cm4gZTt2YXIgcj10aGlzLl9kZWZhdWx0VmFsdWVzW3RdO3JldHVybiB0aGlzLl9tYXA/dGhpcy5fbWFwLmdldCh0LHIpOnJ9LENlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe2lmKHRoaXMuX19vd25lcklEKXJldHVybiB0aGlzLl9tYXAmJnRoaXMuX21hcC5jbGVhcigpLHRoaXM7dmFyIHQ9dGhpcy5jb25zdHJ1Y3RvcjtyZXR1cm4gdC5fZW1wdHl8fCh0Ll9lbXB0eT1KZSh0aGlzLFF0KCkpKX0sQ2UucHJvdG90eXBlLnNldD1mdW5jdGlvbih0LGUpe2lmKCF0aGlzLmhhcyh0KSl0aHJvdyBFcnJvcignQ2Fubm90IHNldCB1bmtub3duIGtleSBcIicrdCsnXCIgb24gJytOZSh0aGlzKSk7dmFyIHI9dGhpcy5fbWFwJiZ0aGlzLl9tYXAuc2V0KHQsZSk7cmV0dXJuIHRoaXMuX19vd25lcklEfHxyPT09dGhpcy5fbWFwP3RoaXM6SmUodGhpcyxyKX0sQ2UucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtpZighdGhpcy5oYXModCkpcmV0dXJuIHRoaXM7dmFyIGU9dGhpcy5fbWFwJiZ0aGlzLl9tYXAucmVtb3ZlKHQpO3JldHVybiB0aGlzLl9fb3duZXJJRHx8ZT09PXRoaXMuX21hcD90aGlzOkplKHRoaXMsZSl9LENlLnByb3RvdHlwZS53YXNBbHRlcmVkPWZ1bmN0aW9uKCl7XG4gIHJldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpfSxDZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHAodGhpcy5fZGVmYXVsdFZhbHVlcykubWFwKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHIuZ2V0KGUpfSkuX19pdGVyYXRvcih0LGUpfSxDZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gcCh0aGlzLl9kZWZhdWx0VmFsdWVzKS5tYXAoZnVuY3Rpb24odCxlKXtyZXR1cm4gci5nZXQoZSl9KS5fX2l0ZXJhdGUodCxlKX0sQ2UucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7aWYodD09PXRoaXMuX19vd25lcklEKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcCYmdGhpcy5fbWFwLl9fZW5zdXJlT3duZXIodCk7cmV0dXJuIHQ/SmUodGhpcyxlLHQpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX21hcD1lLHRoaXMpfTt2YXIgcm49Q2UucHJvdG90eXBlO3JuW3NyXT1ybi5yZW1vdmUscm4uZGVsZXRlSW49cm4ucmVtb3ZlSW49VHIucmVtb3ZlSW4scm4ubWVyZ2U9VHIubWVyZ2Uscm4ubWVyZ2VXaXRoPVRyLm1lcmdlV2l0aCxybi5tZXJnZUluPVRyLm1lcmdlSW4scm4ubWVyZ2VEZWVwPVRyLm1lcmdlRGVlcCxybi5tZXJnZURlZXBXaXRoPVRyLm1lcmdlRGVlcFdpdGgscm4ubWVyZ2VEZWVwSW49VHIubWVyZ2VEZWVwSW4scm4uc2V0SW49VHIuc2V0SW4scm4udXBkYXRlPVRyLnVwZGF0ZSxybi51cGRhdGVJbj1Uci51cGRhdGVJbixybi53aXRoTXV0YXRpb25zPVRyLndpdGhNdXRhdGlvbnMscm4uYXNNdXRhYmxlPVRyLmFzTXV0YWJsZSxybi5hc0ltbXV0YWJsZT1Uci5hc0ltbXV0YWJsZSx0KFllLGspLFllLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP1wiUmFuZ2UgW11cIjpcIlJhbmdlIFsgXCIrdGhpcy5fc3RhcnQrXCIuLi5cIit0aGlzLl9lbmQrKHRoaXMuX3N0ZXA+MT9cIiBieSBcIit0aGlzLl9zdGVwOlwiXCIpK1wiIF1cIn0sWWUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90aGlzLl9zdGFydCt1KHRoaXMsdCkqdGhpcy5fc3RlcDplfSxZZS5wcm90b3R5cGUuaW5jbHVkZXM9ZnVuY3Rpb24odCl7dmFyIGU9KHQtdGhpcy5fc3RhcnQpL3RoaXMuX3N0ZXA7cmV0dXJuIGU+PTAmJnRoaXMuc2l6ZT5lJiZlPT09TWF0aC5mbG9vcihlKX0sWWUucHJvdG90eXBlLnNsaWNlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIGEodCxlLHRoaXMuc2l6ZSk/dGhpczoodD1oKHQsdGhpcy5zaXplKSxlPWYoZSx0aGlzLnNpemUpLHQ+PWU/bmV3IFllKDAsMCk6bmV3IFllKHRoaXMuZ2V0KHQsdGhpcy5fZW5kKSx0aGlzLmdldChlLHRoaXMuX2VuZCksdGhpcy5fc3RlcCkpfSxZZS5wcm90b3R5cGUuaW5kZXhPZj1mdW5jdGlvbih0KXt2YXIgZT10LXRoaXMuX3N0YXJ0O2lmKGUldGhpcy5fc3RlcD09PTApe3ZhciByPWUvdGhpcy5fc3RlcDtpZihyPj0wJiZ0aGlzLnNpemU+cilyZXR1cm4gcn1yZXR1cm4tMX0sWWUucHJvdG90eXBlLmxhc3RJbmRleE9mPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmluZGV4T2YodCl9LFllLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5zaXplLTEsbj10aGlzLl9zdGVwLGk9ZT90aGlzLl9zdGFydCtyKm46dGhpcy5fc3RhcnQsbz0wO3I+PW87bysrKXtpZih0KGksbyx0aGlzKT09PSExKXJldHVybiBvKzE7aSs9ZT8tbjpufXJldHVybiBvfSxZZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuc2l6ZS0xLG49dGhpcy5fc3RlcCxpPWU/dGhpcy5fc3RhcnQrcipuOnRoaXMuX3N0YXJ0LG89MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdT1pO3JldHVybiBpKz1lPy1uOm4sbz5yP0koKTp6KHQsbysrLHUpfSl9LFllLnByb3RvdHlwZS5lcXVhbHM9ZnVuY3Rpb24odCl7cmV0dXJuIHQgaW5zdGFuY2VvZiBZZT90aGlzLl9zdGFydD09PXQuX3N0YXJ0JiZ0aGlzLl9lbmQ9PT10Ll9lbmQmJnRoaXMuX3N0ZXA9PT10Ll9zdGVwOlZlKHRoaXMsdCk7XG59O3ZhciBubjt0KFFlLGspLFFlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP1wiUmVwZWF0IFtdXCI6XCJSZXBlYXQgWyBcIit0aGlzLl92YWx1ZStcIiBcIit0aGlzLnNpemUrXCIgdGltZXMgXVwifSxRZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuaGFzKHQpP3RoaXMuX3ZhbHVlOmV9LFFlLnByb3RvdHlwZS5pbmNsdWRlcz1mdW5jdGlvbih0KXtyZXR1cm4gWCh0aGlzLl92YWx1ZSx0KX0sUWUucHJvdG90eXBlLnNsaWNlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5zaXplO3JldHVybiBhKHQsZSxyKT90aGlzOm5ldyBRZSh0aGlzLl92YWx1ZSxmKGUsciktaCh0LHIpKX0sUWUucHJvdG90eXBlLnJldmVyc2U9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sUWUucHJvdG90eXBlLmluZGV4T2Y9ZnVuY3Rpb24odCl7cmV0dXJuIFgodGhpcy5fdmFsdWUsdCk/MDotMX0sUWUucHJvdG90eXBlLmxhc3RJbmRleE9mPWZ1bmN0aW9uKHQpe3JldHVybiBYKHRoaXMuX3ZhbHVlLHQpP3RoaXMuc2l6ZTotMX0sUWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0KXtmb3IodmFyIGU9MDt0aGlzLnNpemU+ZTtlKyspaWYodCh0aGlzLl92YWx1ZSxlLHRoaXMpPT09ITEpcmV0dXJuIGUrMTtyZXR1cm4gZX0sUWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcyxyPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7cmV0dXJuIGUuc2l6ZT5yP3oodCxyKyssZS5fdmFsdWUpOkkoKX0pfSxRZS5wcm90b3R5cGUuZXF1YWxzPWZ1bmN0aW9uKHQpe3JldHVybiB0IGluc3RhbmNlb2YgUWU/WCh0aGlzLl92YWx1ZSx0Ll92YWx1ZSk6VmUodCl9O3ZhciBvbjtfLkl0ZXJhdG9yPVMsWGUoXyx7dG9BcnJheTpmdW5jdGlvbigpe3N0KHRoaXMuc2l6ZSk7dmFyIHQ9QXJyYXkodGhpcy5zaXplfHwwKTtyZXR1cm4gdGhpcy52YWx1ZVNlcSgpLl9faXRlcmF0ZShmdW5jdGlvbihlLHIpe3Rbcl09ZX0pLHR9LHRvSW5kZXhlZFNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgaHQodGhpcyl9LHRvSlM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdCYmXCJmdW5jdGlvblwiPT10eXBlb2YgdC50b0pTP3QudG9KUygpOnR9KS5fX3RvSlMoKX0sdG9KU09OOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQmJlwiZnVuY3Rpb25cIj09dHlwZW9mIHQudG9KU09OP3QudG9KU09OKCk6dH0pLl9fdG9KUygpfSx0b0tleWVkU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBhdCh0aGlzLCEwKX0sdG9NYXA6ZnVuY3Rpb24oKXtyZXR1cm4gTHQodGhpcy50b0tleWVkU2VxKCkpfSx0b09iamVjdDpmdW5jdGlvbigpe3N0KHRoaXMuc2l6ZSk7dmFyIHQ9e307cmV0dXJuIHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKGUscil7dFtyXT1lfSksdH0sdG9PcmRlcmVkTWFwOmZ1bmN0aW9uKCl7cmV0dXJuIEllKHRoaXMudG9LZXllZFNlcSgpKX0sdG9PcmRlcmVkU2V0OmZ1bmN0aW9uKCl7cmV0dXJuIExlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b1NldDpmdW5jdGlvbigpe3JldHVybiBBZShkKHRoaXMpP3RoaXMudmFsdWVTZXEoKTp0aGlzKX0sdG9TZXRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGZ0KHRoaXMpfSx0b1NlcTpmdW5jdGlvbigpe3JldHVybiBtKHRoaXMpP3RoaXMudG9JbmRleGVkU2VxKCk6ZCh0aGlzKT90aGlzLnRvS2V5ZWRTZXEoKTp0aGlzLnRvU2V0U2VxKCl9LHRvU3RhY2s6ZnVuY3Rpb24oKXtyZXR1cm4gRWUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvTGlzdDpmdW5jdGlvbigpe3JldHVybiBmZShkKHRoaXMpP3RoaXMudmFsdWVTZXEoKTp0aGlzKX0sdG9TdHJpbmc6ZnVuY3Rpb24oKXtyZXR1cm5cIltJdGVyYWJsZV1cIn0sX190b1N0cmluZzpmdW5jdGlvbih0LGUpe3JldHVybiAwPT09dGhpcy5zaXplP3QrZTp0K1wiIFwiK3RoaXMudG9TZXEoKS5tYXAodGhpcy5fX3RvU3RyaW5nTWFwcGVyKS5qb2luKFwiLCBcIikrXCIgXCIrZX0sY29uY2F0OmZ1bmN0aW9uKCl7XG4gIHZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO3JldHVybiBPdCh0aGlzLFN0KHRoaXMsdCkpfSxpbmNsdWRlczpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5zb21lKGZ1bmN0aW9uKGUpe3JldHVybiBYKGUsdCl9KX0sZW50cmllczpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faXRlcmF0b3Iod3IpfSxldmVyeTpmdW5jdGlvbih0LGUpe3N0KHRoaXMuc2l6ZSk7dmFyIHI9ITA7cmV0dXJuIHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKG4saSxvKXtyZXR1cm4gdC5jYWxsKGUsbixpLG8pP3ZvaWQgMDoocj0hMSwhMSl9KSxyfSxmaWx0ZXI6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxsdCh0aGlzLHQsZSwhMCkpfSxmaW5kOmZ1bmN0aW9uKHQsZSxyKXt2YXIgbj10aGlzLmZpbmRFbnRyeSh0LGUpO3JldHVybiBuP25bMV06cn0sZmluZEVudHJ5OmZ1bmN0aW9uKHQsZSl7dmFyIHI7cmV0dXJuIHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKG4saSxvKXtyZXR1cm4gdC5jYWxsKGUsbixpLG8pPyhyPVtpLG5dLCExKTp2b2lkIDB9KSxyfSxmaW5kTGFzdEVudHJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmluZEVudHJ5KHQsZSl9LGZvckVhY2g6ZnVuY3Rpb24odCxlKXtyZXR1cm4gc3QodGhpcy5zaXplKSx0aGlzLl9faXRlcmF0ZShlP3QuYmluZChlKTp0KX0sam9pbjpmdW5jdGlvbih0KXtzdCh0aGlzLnNpemUpLHQ9dm9pZCAwIT09dD9cIlwiK3Q6XCIsXCI7dmFyIGU9XCJcIixyPSEwO3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihuKXtyP3I9ITE6ZSs9dCxlKz1udWxsIT09biYmdm9pZCAwIT09bj9cIlwiK246XCJcIn0pLGV9LGtleXM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKG1yKX0sbWFwOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMscHQodGhpcyx0LGUpKX0scmVkdWNlOmZ1bmN0aW9uKHQsZSxyKXtzdCh0aGlzLnNpemUpO3ZhciBuLGk7cmV0dXJuIGFyZ3VtZW50cy5sZW5ndGg8Mj9pPSEwOm49ZSx0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihlLG8sdSl7aT8oaT0hMSxuPWUpOm49dC5jYWxsKHIsbixlLG8sdSl9KSxufSxyZWR1Y2VSaWdodDpmdW5jdGlvbigpe3ZhciB0PXRoaXMudG9LZXllZFNlcSgpLnJldmVyc2UoKTtyZXR1cm4gdC5yZWR1Y2UuYXBwbHkodCxhcmd1bWVudHMpfSxyZXZlcnNlOmZ1bmN0aW9uKCl7cmV0dXJuIE90KHRoaXMsdnQodGhpcywhMCkpfSxzbGljZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLG10KHRoaXMsdCxlLCEwKSl9LHNvbWU6ZnVuY3Rpb24odCxlKXtyZXR1cm4hdGhpcy5ldmVyeShaZSh0KSxlKX0sc29ydDpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyxxdCh0aGlzLHQpKX0sdmFsdWVzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19pdGVyYXRvcihncil9LGJ1dExhc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zbGljZSgwLC0xKX0saXNFbXB0eTpmdW5jdGlvbigpe3JldHVybiB2b2lkIDAhPT10aGlzLnNpemU/MD09PXRoaXMuc2l6ZTohdGhpcy5zb21lKGZ1bmN0aW9uKCl7cmV0dXJuITB9KX0sY291bnQ6ZnVuY3Rpb24odCxlKXtyZXR1cm4gbyh0P3RoaXMudG9TZXEoKS5maWx0ZXIodCxlKTp0aGlzKX0sY291bnRCeTpmdW5jdGlvbih0LGUpe3JldHVybiB5dCh0aGlzLHQsZSl9LGVxdWFsczpmdW5jdGlvbih0KXtyZXR1cm4gVmUodGhpcyx0KX0sZW50cnlTZXE6ZnVuY3Rpb24oKXt2YXIgdD10aGlzO2lmKHQuX2NhY2hlKXJldHVybiBuZXcgaih0Ll9jYWNoZSk7dmFyIGU9dC50b1NlcSgpLm1hcChHZSkudG9JbmRleGVkU2VxKCk7cmV0dXJuIGUuZnJvbUVudHJ5U2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHQudG9TZXEoKX0sZX0sZmlsdGVyTm90OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuZmlsdGVyKFplKHQpLGUpfSxmaW5kTGFzdDpmdW5jdGlvbih0LGUscil7cmV0dXJuIHRoaXMudG9LZXllZFNlcSgpLnJldmVyc2UoKS5maW5kKHQsZSxyKX0sZmlyc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5maW5kKHMpfSxmbGF0TWFwOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsSXQodGhpcyx0LGUpKTtcbn0sZmxhdHRlbjpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyx6dCh0aGlzLHQsITApKX0sZnJvbUVudHJ5U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBjdCh0aGlzKX0sZ2V0OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuZmluZChmdW5jdGlvbihlLHIpe3JldHVybiBYKHIsdCl9LHZvaWQgMCxlKX0sZ2V0SW46ZnVuY3Rpb24odCxlKXtmb3IodmFyIHIsbj10aGlzLGk9S3QodCk7IShyPWkubmV4dCgpKS5kb25lOyl7dmFyIG89ci52YWx1ZTtpZihuPW4mJm4uZ2V0P24uZ2V0KG8sY3IpOmNyLG49PT1jcilyZXR1cm4gZX1yZXR1cm4gbn0sZ3JvdXBCeTpmdW5jdGlvbih0LGUpe3JldHVybiBkdCh0aGlzLHQsZSl9LGhhczpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5nZXQodCxjcikhPT1jcn0saGFzSW46ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZ2V0SW4odCxjcikhPT1jcn0saXNTdWJzZXQ6ZnVuY3Rpb24odCl7cmV0dXJuIHQ9XCJmdW5jdGlvblwiPT10eXBlb2YgdC5pbmNsdWRlcz90Ol8odCksdGhpcy5ldmVyeShmdW5jdGlvbihlKXtyZXR1cm4gdC5pbmNsdWRlcyhlKX0pfSxpc1N1cGVyc2V0OmZ1bmN0aW9uKHQpe3JldHVybiB0PVwiZnVuY3Rpb25cIj09dHlwZW9mIHQuaXNTdWJzZXQ/dDpfKHQpLHQuaXNTdWJzZXQodGhpcyl9LGtleVNlcTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvU2VxKCkubWFwKEZlKS50b0luZGV4ZWRTZXEoKX0sbGFzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmZpcnN0KCl9LG1heDpmdW5jdGlvbih0KXtyZXR1cm4gRHQodGhpcyx0KX0sbWF4Qnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gRHQodGhpcyxlLHQpfSxtaW46ZnVuY3Rpb24odCl7cmV0dXJuIER0KHRoaXMsdD8kZSh0KTpycil9LG1pbkJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIER0KHRoaXMsZT8kZShlKTpycix0KX0scmVzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNsaWNlKDEpfSxza2lwOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnNsaWNlKE1hdGgubWF4KDAsdCkpfSxza2lwTGFzdDpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyx0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLnNraXAodCkucmV2ZXJzZSgpKX0sc2tpcFdoaWxlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsd3QodGhpcyx0LGUsITApKX0sc2tpcFVudGlsOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuc2tpcFdoaWxlKFplKHQpLGUpfSxzb3J0Qnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxxdCh0aGlzLGUsdCkpfSx0YWtlOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnNsaWNlKDAsTWF0aC5tYXgoMCx0KSl9LHRha2VMYXN0OmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5yZXZlcnNlKCkudGFrZSh0KS5yZXZlcnNlKCkpfSx0YWtlV2hpbGU6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxndCh0aGlzLHQsZSkpfSx0YWtlVW50aWw6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy50YWtlV2hpbGUoWmUodCksZSl9LHZhbHVlU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9JbmRleGVkU2VxKCl9LGhhc2hDb2RlOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19oYXNofHwodGhpcy5fX2hhc2g9bnIodGhpcykpfX0pO3ZhciB1bj1fLnByb3RvdHlwZTt1blt2cl09ITAsdW5bSXJdPXVuLnZhbHVlcyx1bi5fX3RvSlM9dW4udG9BcnJheSx1bi5fX3RvU3RyaW5nTWFwcGVyPXRyLHVuLmluc3BlY3Q9dW4udG9Tb3VyY2U9ZnVuY3Rpb24oKXtyZXR1cm5cIlwiK3RoaXN9LHVuLmNoYWluPXVuLmZsYXRNYXAsdW4uY29udGFpbnM9dW4uaW5jbHVkZXMsZnVuY3Rpb24oKXt0cnl7T2JqZWN0LmRlZmluZVByb3BlcnR5KHVuLFwibGVuZ3RoXCIse2dldDpmdW5jdGlvbigpe2lmKCFfLm5vTGVuZ3RoV2FybmluZyl7dmFyIHQ7dHJ5e3Rocm93IEVycm9yKCl9Y2F0Y2goZSl7dD1lLnN0YWNrfWlmKC0xPT09dC5pbmRleE9mKFwiX3dyYXBPYmplY3RcIikpcmV0dXJuIGNvbnNvbGUmJmNvbnNvbGUud2FybiYmY29uc29sZS53YXJuKFwiaXRlcmFibGUubGVuZ3RoIGhhcyBiZWVuIGRlcHJlY2F0ZWQsIHVzZSBpdGVyYWJsZS5zaXplIG9yIGl0ZXJhYmxlLmNvdW50KCkuIFRoaXMgd2FybmluZyB3aWxsIGJlY29tZSBhIHNpbGVudCBlcnJvciBpbiBhIGZ1dHVyZSB2ZXJzaW9uLiBcIit0KSxcbiAgdGhpcy5zaXplfX19KX1jYXRjaCh0KXt9fSgpLFhlKHAse2ZsaXA6ZnVuY3Rpb24oKXtyZXR1cm4gT3QodGhpcyxfdCh0aGlzKSl9LGZpbmRLZXk6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLmZpbmRFbnRyeSh0LGUpO3JldHVybiByJiZyWzBdfSxmaW5kTGFzdEtleTpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmZpbmRLZXkodCxlKX0sa2V5T2Y6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZmluZEtleShmdW5jdGlvbihlKXtyZXR1cm4gWChlLHQpfSl9LGxhc3RLZXlPZjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5maW5kTGFzdEtleShmdW5jdGlvbihlKXtyZXR1cm4gWChlLHQpfSl9LG1hcEVudHJpZXM6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLG49MDtyZXR1cm4gT3QodGhpcyx0aGlzLnRvU2VxKCkubWFwKGZ1bmN0aW9uKGksbyl7cmV0dXJuIHQuY2FsbChlLFtvLGldLG4rKyxyKX0pLmZyb21FbnRyeVNlcSgpKX0sbWFwS2V5czpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLmZsaXAoKS5tYXAoZnVuY3Rpb24obixpKXtyZXR1cm4gdC5jYWxsKGUsbixpLHIpfSkuZmxpcCgpKX19KTt2YXIgc249cC5wcm90b3R5cGU7c25bbHJdPSEwLHNuW0lyXT11bi5lbnRyaWVzLHNuLl9fdG9KUz11bi50b09iamVjdCxzbi5fX3RvU3RyaW5nTWFwcGVyPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIEpTT04uc3RyaW5naWZ5KGUpK1wiOiBcIit0cih0KX0sWGUodix7dG9LZXllZFNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgYXQodGhpcywhMSl9LGZpbHRlcjpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLGx0KHRoaXMsdCxlLCExKSl9LGZpbmRJbmRleDpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuZmluZEVudHJ5KHQsZSk7cmV0dXJuIHI/clswXTotMX0saW5kZXhPZjpmdW5jdGlvbih0KXt2YXIgZT10aGlzLnRvS2V5ZWRTZXEoKS5rZXlPZih0KTtyZXR1cm4gdm9pZCAwPT09ZT8tMTplfSxsYXN0SW5kZXhPZjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5pbmRleE9mKHQpfSxyZXZlcnNlOmZ1bmN0aW9uKCl7cmV0dXJuIE90KHRoaXMsdnQodGhpcywhMSkpfSxzbGljZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLG10KHRoaXMsdCxlLCExKSl9LHNwbGljZTpmdW5jdGlvbih0LGUpe3ZhciByPWFyZ3VtZW50cy5sZW5ndGg7aWYoZT1NYXRoLm1heCgwfGUsMCksMD09PXJ8fDI9PT1yJiYhZSlyZXR1cm4gdGhpczt0PWgodCwwPnQ/dGhpcy5jb3VudCgpOnRoaXMuc2l6ZSk7dmFyIG49dGhpcy5zbGljZSgwLHQpO3JldHVybiBPdCh0aGlzLDE9PT1yP246bi5jb25jYXQoaShhcmd1bWVudHMsMiksdGhpcy5zbGljZSh0K2UpKSl9LGZpbmRMYXN0SW5kZXg6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLnRvS2V5ZWRTZXEoKS5maW5kTGFzdEtleSh0LGUpO3JldHVybiB2b2lkIDA9PT1yPy0xOnJ9LGZpcnN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0KDApfSxmbGF0dGVuOmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHp0KHRoaXMsdCwhMSkpfSxnZXQ6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdD11KHRoaXMsdCksMD50fHx0aGlzLnNpemU9PT0xLzB8fHZvaWQgMCE9PXRoaXMuc2l6ZSYmdD50aGlzLnNpemU/ZTp0aGlzLmZpbmQoZnVuY3Rpb24oZSxyKXtyZXR1cm4gcj09PXR9LHZvaWQgMCxlKX0saGFzOmZ1bmN0aW9uKHQpe3JldHVybiB0PXUodGhpcyx0KSx0Pj0wJiYodm9pZCAwIT09dGhpcy5zaXplP3RoaXMuc2l6ZT09PTEvMHx8dGhpcy5zaXplPnQ6LTEhPT10aGlzLmluZGV4T2YodCkpfSxpbnRlcnBvc2U6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsYnQodGhpcyx0KSl9LGludGVybGVhdmU6ZnVuY3Rpb24oKXt2YXIgdD1bdGhpc10uY29uY2F0KGkoYXJndW1lbnRzKSksZT1FdCh0aGlzLnRvU2VxKCksay5vZix0KSxyPWUuZmxhdHRlbighMCk7cmV0dXJuIGUuc2l6ZSYmKHIuc2l6ZT1lLnNpemUqdC5sZW5ndGgpLE90KHRoaXMscil9LGxhc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5nZXQoLTEpO1xufSxza2lwV2hpbGU6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyx3dCh0aGlzLHQsZSwhMSkpfSx6aXA6ZnVuY3Rpb24oKXt2YXIgdD1bdGhpc10uY29uY2F0KGkoYXJndW1lbnRzKSk7cmV0dXJuIE90KHRoaXMsRXQodGhpcyxlcix0KSl9LHppcFdpdGg6ZnVuY3Rpb24odCl7dmFyIGU9aShhcmd1bWVudHMpO3JldHVybiBlWzBdPXRoaXMsT3QodGhpcyxFdCh0aGlzLHQsZSkpfX0pLHYucHJvdG90eXBlW3lyXT0hMCx2LnByb3RvdHlwZVtkcl09ITAsWGUobCx7Z2V0OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuaGFzKHQpP3Q6ZX0saW5jbHVkZXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuaGFzKHQpfSxrZXlTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy52YWx1ZVNlcSgpfX0pLGwucHJvdG90eXBlLmhhcz11bi5pbmNsdWRlcyxYZSh4LHAucHJvdG90eXBlKSxYZShrLHYucHJvdG90eXBlKSxYZShBLGwucHJvdG90eXBlKSxYZShWLHAucHJvdG90eXBlKSxYZShZLHYucHJvdG90eXBlKSxYZShRLGwucHJvdG90eXBlKTt2YXIgYW49e0l0ZXJhYmxlOl8sU2VxOk8sQ29sbGVjdGlvbjpILE1hcDpMdCxPcmRlcmVkTWFwOkllLExpc3Q6ZmUsU3RhY2s6RWUsU2V0OkFlLE9yZGVyZWRTZXQ6TGUsUmVjb3JkOkNlLFJhbmdlOlllLFJlcGVhdDpRZSxpczpYLGZyb21KUzpGfTtyZXR1cm4gYW59KTsiXX0=
