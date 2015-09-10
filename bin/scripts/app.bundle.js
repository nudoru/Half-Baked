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

module.exports = App;

},{"../nori/action/ActionCreator.js":15,"../nori/service/SocketIO.js":17,"../nori/service/SocketIOEvents.js":18,"../nori/utils/Rx.js":25,"./action/ActionCreator.js":3,"./store/AppStore.js":4,"./view/AppView.js":5}],2:[function(require,module,exports){
module.exports = {
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

},{}],3:[function(require,module,exports){
var _actionConstants = require('./ActionConstants.js'),
    _appStore = require('../store/AppStore.js');

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

module.exports = ActionCreator;

},{"../store/AppStore.js":4,"./ActionConstants.js":2}],4:[function(require,module,exports){
var _restNumQuestions = 3,
    _restQuestionCategory = 24,
    // SCI/TECh
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

module.exports = Component;

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../store/AppStore":4,"./AppView":5}],7:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator'),
    _appActions = require('../action/ActionCreator.js'),
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

module.exports = Component;

},{"../../nori/action/ActionCreator":15,"../../nori/utils/Templating.js":26,"../../nori/view/MixinDOMManipulation.js":29,"../action/ActionCreator.js":3,"../store/AppStore":4,"./AppView":5}],8:[function(require,module,exports){
var _noriActions = require('../../nori/action/ActionCreator.js'),
    _appActions = require('../action/ActionCreator.js'),
    _appView = require('./AppView.js'),
    _appStore = require('../store/AppStore.js'),
    _socketIO = require('../../nori/service/SocketIO.js'),
    _template = require('../../nori/utils/Templating.js'),
    _regionPlayerStats = require('./Region.PlayerStats.js'),
    _numUtils = require('../../nudoru/core/NumberUtils.js');

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
      localPlayerStats: _regionPlayerStats({
        id: 'game__playerstats',
        mountPoint: '#game__localplayerstats',
        target: 'local'
      }),
      remotePlayerStats: _regionPlayerStats({
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

module.exports = Component;

},{"../../nori/action/ActionCreator.js":15,"../../nori/service/SocketIO.js":17,"../../nori/utils/Templating.js":26,"../../nudoru/core/NumberUtils.js":42,"../action/ActionCreator.js":3,"../store/AppStore.js":4,"./AppView.js":5,"./Region.PlayerStats.js":6}],9:[function(require,module,exports){
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
      _connectionID = undefined,
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

module.exports = Renderer();

},{"../../nudoru/browser/DOMUtils.js":35}],24:[function(require,module,exports){
/*  weak */

/**
 * Simple router
 * Supporting IE9 so using hashes instead of the history API for now
 */

var Router = function Router() {

  var _subject = new Rx.Subject(),
      _hashChangeObservable = undefined,
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

module.exports = Templating();

},{"../../nudoru/browser/DOMUtils.js":35}],27:[function(require,module,exports){
/*  weak */

var ApplicationView = function ApplicationView() {

  var _this = undefined,
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
    var componentObj = undefined;

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
    return function (configProps) {
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

  var _eventsMap = undefined,
      _eventSubscribers = undefined;

  var _rx = require('../utils/Rx'),
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
        var _ret = (function () {

          var mappings = evtStrings.split(','),
              eventHandler = _eventsMap[evtStrings];

          if (!is['function'](eventHandler)) {
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
      _configProps = undefined,
      _id = undefined,
      _templateObjCache = undefined,
      _html = undefined,
      _DOMElement = undefined,
      _mountPoint = undefined,
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3N0b3JlL0FwcFN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L0FwcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvUmVnaW9uLlBsYXllclN0YXRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5HYW1lT3Zlci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uTWFpbkdhbWUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLlBsYXllclNlbGVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uVGl0bGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLldhaXRpbmdPblBsYXllci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9tYWluLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvTm9yaS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvUmVzdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvSW1tdXRhYmxlTWFwLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1JlbmRlcmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUm91dGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUnguanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRE9NTWFuaXB1bGF0aW9uLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpbk51ZG9ydUNvbnRyb2xzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpblN0b3JlU3RhdGVWaWV3cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvVmlld0NvbXBvbmVudC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hDcmVhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01vZGFsQ292ZXJWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29tcG9uZW50cy9Ub29sVGlwVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29yZS9OdW1iZXJVdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29yZS9PYmplY3RVdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy92ZW5kb3IvaW1tdXRhYmxlLm1pbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQU0sR0FBRyxHQUFlLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztJQUNoRCxXQUFXLEdBQU8sT0FBTyxDQUFDLDJCQUEyQixDQUFDO0lBQ3RELFlBQVksR0FBTSxPQUFPLENBQUMsaUNBQWlDLENBQUM7SUFDNUQs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QUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQy9DLFVBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztBQUMvQixVQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsSUFBSSxBQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFLLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEFBQUMsQ0FBQztLQUN6RSxNQUFNLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsRUFBRSxFQUFFO0FBQ2hELFVBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO0FBQ3RCLFVBQUksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO0tBQ3hCLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLEVBQUU7QUFDL0MsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLElBQUksQUFBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBSyxVQUFVLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUM7QUFDdkUsVUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0tBQ2pDLE1BQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxFQUFFLEVBQUU7QUFDaEQsVUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztBQUN4QyxVQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztLQUN4QixNQUFNLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQy9DLFVBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQ2pELFVBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxJQUFJLEFBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUssVUFBVSxDQUFDLE1BQU0sR0FB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QUFLLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxRQUFRLElBQUUsT0FBTyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUcsRUFBRSxHQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsVUFBVSxLQUFHLENBQUMsRUFBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFNLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEtBQUksS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFdBQU0sRUFBQyxLQUFLLEVBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLE9BQU0sVUFBVSxJQUFFLE9BQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxJQUFFLFFBQVEsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxDQUFDLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBRSxRQUFRLEVBQUUsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQ2pnRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxjQUFjLEdBQUMsRUFBRSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxRQUFRLElBQUUsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLHdFQUF3RSxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQywrQ0FBK0MsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxRQUFRLElBQUUsT0FBTyxDQUFDLElBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLGdFQUFnRSxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFVBQU0sU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUM7QUFBQyxXQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsV0FBVyxLQUFHLE1BQU0sSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsV0FBVyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxVQUFVLEdBQUMsVUFBVSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUNwZ0UsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsVUFBVSxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLFVBQVUsR0FBRSxDQUFDLElBQUUsVUFBVSxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxhQUFhLEdBQUMsQ0FBQyxHQUFDLG9CQUFvQixDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLEtBQUcsRUFBRSxLQUFHLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLENBQUMsSUFBRyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUUsRUFBQztBQUFDLFdBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxvQkFBb0IsSUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEVBQUMsVUFBVSxHQUFDLEVBQUUsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxFQUFFLENBQUEsRUFBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJO0FBQUMsVUFBRyxLQUFLLENBQUMsS0FBRyxFQUFFLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUMsSUFBRyxFQUFFLEVBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLEVBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQyxFQUFDLFlBQVksRUFBQyxDQUFDLENBQUMsRUFBQyxRQUFRLEVBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxvQkFBb0IsSUFBRSxDQUFDLENBQUMsb0JBQW9CLEtBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUMsQ0FBQyxDQUFDLG9CQUFvQixHQUFDLFlBQVU7QUFBQyxlQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSTtBQUFDLFlBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBQyxNQUFNLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQztLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsUUFBUSxHQUFFLEtBQUssQ0FBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxlQUFlLElBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUEsQ0FBQztHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsTUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLG1EQUFtRCxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLGVBQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN6Z0UsRUFBQyxDQUFDLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsV0FBVyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxLQUFHLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtXQUFDLE9BQU8sQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFBO09BQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsRUFBRSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxpQkFBTztBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7Y0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztjQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxFQUFFLENBQUEsQ0FBRSxTQUFTLEVBQUUsQ0FBQztBQUM5Z0UsS0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFOzs7OEJBQVM7VUFBUixDQUFDO1VBQUMsQ0FBQztVQUFDLENBQUM7VUFBQyxDQUFDO0FBQU0sT0FBQyxHQUF5RSxDQUFDLEdBQVEsQ0FBQyxHQUFxRSxDQUFDLEdBQUMsQ0FBQyxHQUE0QixDQUFDOztBQUE3TCxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUM7YUFBVyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFO2NBQUMsQ0FBQztjQUFDLENBQUM7Y0FBQyxDQUFDOzs7T0FBRSxJQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLElBQUUsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtTQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxpQkFBSyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDO0dBQUEsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFJLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUU7QUFBQyxlQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxFQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtTQUFDLFFBQU0sQ0FBQyxFQUFFO0FBQ3ZnRSxlQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxrQkFBTSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtTQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFLLENBQUMsR0FBRTtBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxnQkFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxFQUFFLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUEsQUFBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1dBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1NBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU0sQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFNLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxLQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFDaGdFLGFBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZ0JBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxDQUFDLFFBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1NBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQTtTQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxLQUFLLENBQUE7U0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMseUJBQXlCLEdBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUUsU0FBUyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQSxHQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsbUNBQW1DLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxLQUFLLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsS0FBSyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsTUFBSTtBQUFDLFVBQUcsQ0FBQyxLQUFHLEVBQUUsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUNqZ0UsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsV0FBVyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsV0FBVyxLQUFHLEVBQUUsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxPQUFPLEtBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsRUFBQSxDQUFBLEFBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxNQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxhQUFhLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsR0FBRyxFQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUM7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLENBQUMsQ0FBQSxDQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLFVBQVUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxTQUFTLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLEdBQUMsU0FBUyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsRUFBRSxFQUFDLEdBQUcsR0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUMsQ0FBQyxDQUFBLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFDamhFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsSUFBRyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsRUFBRSxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUEsQUFBQyxFQUFDLFlBQVU7QUFBQyxZQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUEsQ0FBQTtLQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsWUFBVTtBQUFDLGlCQUFPO0FBQUMsY0FBRyxDQUFDLEVBQUM7QUFBQyxnQkFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUE7V0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQyxDQUFBLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsRUFBQTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO0FBQ3JrRSxRQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDO0FBQUMsT0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsSUFBRSxFQUFFLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFFO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUMsTUFBTSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsSUFBRSxFQUFFLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLEVBQUUsSUFBRSxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxLQUFHLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBLEFBQUMsQ0FBQSxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsTUFBSyxJQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3BnRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsU0FBRixDQUFDLENBQVUsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLFlBQVksQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsY0FBYyxHQUFDLENBQUMsQ0FBQTtPQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFdBQVcsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxLQUFLLElBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUUsUUFBUSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUMsRUFBRTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLGVBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsb0NBQW9DLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsSUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxXQUFXLElBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUk7QUFDeGhFLE9BQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxFQUFFLElBQUksWUFBWSxFQUFFLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDLDBCQUEwQixDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBLEVBQUM7QUFBQyxVQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUMsSUFBSSxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxFQUFFLElBQUksWUFBWSxFQUFFLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksQ0FBQSxFQUFDO0FBQUMsVUFBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQTtLQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLFdBQVMsR0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLFFBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxDQUFDLHFCQUFxQixJQUFFLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sWUFBVTtBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLFlBQVU7QUFBQyxhQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxRQUFRLElBQUUsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsVUFBVSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUUsRUFBRSxHQUFDLENBQUMsS0FBRyxDQUFDLEVBQUUsRUFBQyxTQUFTLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxVQUFVLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEVBQUMsVUFBVSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsVUFBVSxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLElBQUksRUFBRSxHQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSztNQUFDLEVBQUUsR0FBQyxRQUFRO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQyxJQUFFLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRTtNQUFDLEVBQUUsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsRUFBQztNQUFDLEVBQUUsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLDRCQUE0QjtNQUFDLEVBQUUsR0FBQyx5QkFBeUI7TUFBQyxFQUFFLEdBQUMsMkJBQTJCO01BQUMsRUFBRSxHQUFDLDJCQUEyQjtNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxVQUFVLElBQUUsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLFFBQVE7TUFBQyxFQUFFLEdBQUMsWUFBWTtNQUFDLEVBQUUsR0FBQyxFQUFFLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFNLFlBQVksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxFQUFFLEVBQ3JnRSxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTSxFQUFFLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsWUFBVTtBQUFDLFlBQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFFLElBQUksQ0FBQyxpQkFBaUIsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBLEFBQUMsRUFBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHO0FBQ2hrRSxXQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBRSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksR0FBRTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUEsRUFBQyxNQUFLO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsY0FBYztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxLQUFLLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBRyxFQUFFLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLENBQUEsQUFBQyxJQUFFLEVBQUUsS0FBRyxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsQ0FBQTtHQUFDO01BQUMsRUFBRSxHQUFDLE1BQU0sQ0FBQyxZQUFZO01BQUMsRUFBRSxHQUFDLENBQUEsWUFBVTtBQUFDLFFBQUc7QUFBQyxjQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLENBQUEsRUFBRTtNQUFDLEVBQUUsR0FBQyxVQUFVLElBQUUsT0FBTyxPQUFPLENBQUMsRUFBRSxLQUFHLEVBQUUsR0FBQyxJQUFJLE9BQU8sRUFBQSxDQUFBLEFBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLG1CQUFtQixDQUFDLFVBQVUsSUFBRSxPQUFPLE1BQU0sS0FBRyxFQUFFLEdBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxFQUFFO01BQUMsRUFBRSxHQUFDLEdBQUc7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxLQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFFBQVEsS0FBRyxDQUFDLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsSUFBSSxDQUFDLFFBQVEsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO0FBQ3ZnRSxXQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQztLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFPO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDO09BQUM7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsWUFBVTtBQUFDLGFBQU8sRUFBRSxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxLQUFLLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxFQUM1Z0UsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEtBQUssQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUUsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU0sVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBQSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxLQUFLLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyx1QkFBdUI7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUNuaUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUM7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFLENBQUEsQUFBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFJLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTTtRQUFDLENBQUMsR0FBQyxDQUFDLE1BQUksQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBRSxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFFLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxNQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU8sRUFBQyxPQUFPLENBQUMsR0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN6aEUsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUU7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLEtBQUssRUFBQztBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO09BQUMsTUFBSyxJQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUM7QUFBQyxhQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsTUFBSyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxjQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsU0FBUTtPQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO0tBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQSxFQUFDO0FBQUMsT0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsT0FBTyxHQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsS0FBSyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQztHQUMvaEUsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQSxLQUFJLEVBQUUsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsd0JBQXdCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLFVBQVUsR0FBQyxFQUFFLENBQUMsVUFBVSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFBO0tBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsTUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLElBQUksQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUM7R0FDbmdFLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxZQUFZLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFFBQUcsQ0FBQyxLQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLEVBQUMsS0FBSyxFQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQTtLQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM2lFLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHlCQUF5QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsVUFBVSxHQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLElBQUksR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ2hoRSxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHVCQUF1QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxZQUFZLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxRQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsUUFBTyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFBLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLEtBQUssQ0FBQywwQkFBMEIsR0FBQyxDQUFDLEdBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUN0aEUsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFVLEdBQUMsVUFBVSxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEdBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFBLEFBQUMsR0FBQyxJQUFJLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQSxHQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssS0FBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsWUFBWSxFQUFFLEdBQUMsSUFBSSxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLElBQUksQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsS0FBSyxLQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQztHQUNwZ0UsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLFdBQVcsR0FBQyxXQUFXLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxHQUFHLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFVLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLFFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsWUFBWSxFQUFDLHdCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFNLFlBQVksQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLG9CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEdBQUcsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFDL2dFLFVBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLEtBQUssQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxhQUFhLEVBQUMsdUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUU7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQU8sU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxXQUFXLEVBQUMsdUJBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxLQUFLLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFVO0FBQUMsZUFBTSxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsWUFBWSxHQUFDLFlBQVU7QUFBQyxlQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN4Z0UsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsWUFBWSxFQUFDLHdCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLEdBQUU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsRUFBRSxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsS0FBRyxFQUFFLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxDQUFDLEdBQUMsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLE1BQU0sS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLGdCQUFnQixHQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU0sRUFBRSxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxDQUFBLFlBQVU7QUFBQyxRQUFHO0FBQUMsWUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFDLEVBQUMsR0FBRyxFQUFDLGVBQVU7QUFBQyxjQUFHLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBQztBQUFDLGdCQUFJLENBQUMsQ0FBQyxJQUFHO0FBQUMsb0JBQU0sS0FBSyxFQUFFLENBQUE7YUFBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsZUFBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7YUFBQyxJQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUMsUUFBTyxPQUFPLElBQUUsT0FBTyxDQUFDLElBQUksSUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLDJJQUEySSxHQUFDLENBQUMsQ0FBQyxFQUNybUUsSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFBO1dBQUM7U0FBQyxFQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUMsRUFBRTtHQUFDLENBQUEsRUFBRSxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxXQUFXLEVBQUMscUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLG9CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLFVBQVUsRUFBQyxzQkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyxxQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsYUFBYSxFQUFDLHVCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFBO09BQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFVBQVUsRUFBQyxzQkFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdmdFLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGVBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7S0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUMsUUFBUSxFQUFDLENBQUMsRUFBQyxHQUFHLEVBQUMsQ0FBQyxFQUFDLFVBQVUsRUFBQyxDQUFDLEVBQUMsR0FBRyxFQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUMsRUFBRSxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFDLEVBQUUsRUFBQyxHQUFHLEVBQUMsRUFBRSxFQUFDLFVBQVUsRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUMsRUFBRSxFQUFDLE1BQU0sRUFBQyxFQUFFLEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7Q0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgX3J4ICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vbm9yaS91dGlscy9SeC5qcycpLFxuICAgICAgX2FwcEFjdGlvbnMgICAgID0gcmVxdWlyZSgnLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgICAgX25vcmlBY3Rpb25zICAgID0gcmVxdWlyZSgnLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgICAgX3NvY2tldElPRXZlbnRzID0gcmVxdWlyZSgnLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cbi8qKlxuICogXCJDb250cm9sbGVyXCIgZm9yIGEgTm9yaSBhcHBsaWNhdGlvbi4gVGhlIGNvbnRyb2xsZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gKiBib290c3RyYXBwaW5nIHRoZSBhcHAgYW5kIHBvc3NpYmx5IGhhbmRsaW5nIHNvY2tldC9zZXJ2ZXIgaW50ZXJhY3Rpb24uXG4gKiBBbnkgYWRkaXRpb25hbCBmdW5jdGlvbmFsaXR5IHNob3VsZCBiZSBoYW5kbGVkIGluIGEgc3BlY2lmaWMgbW9kdWxlLlxuICovXG52YXIgQXBwID0gTm9yaS5jcmVhdGVBcHBsaWNhdGlvbih7XG5cbiAgbWl4aW5zOiBbXSxcblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBtYWluIE5vcmkgQXBwIHN0b3JlIGFuZCB2aWV3LlxuICAgKi9cbiAgc3RvcmUgOiByZXF1aXJlKCcuL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gIHZpZXcgIDogcmVxdWlyZSgnLi92aWV3L0FwcFZpZXcuanMnKSxcbiAgc29ja2V0OiByZXF1aXJlKCcuLi9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMnKSxcblxuICAvKipcbiAgICogSW50aWFsaXplIHRoZSBhcHBpbGNhdGlvbiwgdmlldyBhbmQgc3RvcmVcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvY2tldC5pbml0aWFsaXplKCk7XG4gICAgdGhpcy5zb2NrZXQuc3Vic2NyaWJlKHRoaXMuaGFuZGxlU29ja2V0TWVzc2FnZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMudmlldy5pbml0aWFsaXplKCk7XG5cbiAgICB0aGlzLnN0b3JlLmluaXRpYWxpemUoKTsgLy8gc3RvcmUgd2lsbCBhY3F1aXJlIGRhdGEgZGlzcGF0Y2ggZXZlbnQgd2hlbiBjb21wbGV0ZVxuICAgIHRoaXMuc3RvcmUuc3Vic2NyaWJlKCdzdG9yZUluaXRpYWxpemVkJywgdGhpcy5vblN0b3JlSW5pdGlhbGl6ZWQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5zdG9yZS5sb2FkU3RvcmUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQWZ0ZXIgdGhlIHN0b3JlIGRhdGEgaXMgcmVhZHlcbiAgICovXG4gIG9uU3RvcmVJbml0aWFsaXplZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucnVuQXBwbGljYXRpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBcIlBsZWFzZSB3YWl0XCIgY292ZXIgYW5kIHN0YXJ0IHRoZSBhcHBcbiAgICovXG4gIHJ1bkFwcGxpY2F0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy52aWV3LnJlbW92ZUxvYWRpbmdNZXNzYWdlKCk7XG5cbiAgICAvLyBWaWV3IHdpbGwgc2hvdyBiYXNlZCBvbiB0aGUgY3VycmVudCBzdG9yZSBzdGF0ZVxuICAgIC8vdGhpcy5zdG9yZS5zZXRTdGF0ZSh7Y3VycmVudFN0YXRlOiAnTUFJTl9HQU1FJ30pO1xuICAgIHRoaXMuc3RvcmUuc2V0U3RhdGUoe2N1cnJlbnRTdGF0ZTogJ1BMQVlFUl9TRUxFQ1QnfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFsbCBtZXNzYWdlcyBmcm9tIHRoZSBTb2NrZXQuSU8gc2VydmVyIHdpbGwgYmUgZm9yd2FyZGVkIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGhhbmRsZVNvY2tldE1lc3NhZ2U6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgaWYgKCFwYXlsb2FkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJmcm9tIFNvY2tldC5JTyBzZXJ2ZXJcIiwgcGF5bG9hZCk7XG5cbiAgICBzd2l0Y2ggKHBheWxvYWQudHlwZSkge1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkNPTk5FQ1QpOlxuICAgICAgICB0aGlzLmhhbmRsZUNvbm5lY3QocGF5bG9hZC5pZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5KT0lOX1JPT00pOlxuICAgICAgICBjb25zb2xlLmxvZyhcImpvaW4gcm9vbVwiLCBwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICB0aGlzLmhhbmRsZUpvaW5OZXdseUNyZWF0ZWRSb29tKHBheWxvYWQucGF5bG9hZC5yb29tSUQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuR0FNRV9TVEFSVCk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR0FNRSBTVEFSVEVEXCIpO1xuICAgICAgICB0aGlzLmhhbmRsZUdhbWVTdGFydChwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuR0FNRV9BQk9SVCk6XG4gICAgICAgIHRoaXMuaGFuZGxlR2FtZUFib3J0KHBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuU1lTVEVNX01FU1NBR0UpOlxuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkJST0FEQ0FTVCk6XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuTUVTU0FHRSk6XG4gICAgICAgIHRoaXMudmlldy5hbGVydChwYXlsb2FkLnBheWxvYWQsIHBheWxvYWQudHlwZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnNvbGUud2FybihcIlVuaGFuZGxlZCBTb2NrZXRJTyBtZXNzYWdlIHR5cGVcIiwgcGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH0sXG5cbiAgaGFuZGxlQ29ubmVjdDogZnVuY3Rpb24gKHNvY2tldElEKSB7XG4gICAgdmFyIHNldFNlc3Npb25JRCA9IF9hcHBBY3Rpb25zLnNldFNlc3Npb25Qcm9wcyh7c29ja2V0SU9JRDogc29ja2V0SUR9KSxcbiAgICAgICAgc2V0TG9jYWxJRCAgID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7aWQ6IHNvY2tldElEfSk7XG5cbiAgICB0aGlzLnN0b3JlLmFwcGx5KFtzZXRTZXNzaW9uSUQsIHNldExvY2FsSURdKTtcbiAgfSxcblxuICBoYW5kbGVKb2luTmV3bHlDcmVhdGVkUm9vbTogZnVuY3Rpb24gKHJvb21JRCkge1xuICAgIHZhciBzZXRSb29tICAgICAgICAgICAgICAgPSBfYXBwQWN0aW9ucy5zZXRTZXNzaW9uUHJvcHMoe3Jvb21JRDogcm9vbUlEfSksXG4gICAgICAgIHNldFdhaXRpbmdTY3JlZW5TdGF0ZSA9IF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuc3RvcmUuZ2FtZVN0YXRlc1syXX0pO1xuXG4gICAgdGhpcy5zdG9yZS5hcHBseShbc2V0Um9vbSwgc2V0V2FpdGluZ1NjcmVlblN0YXRlXSk7XG4gIH0sXG5cbiAgaGFuZGxlR2FtZVN0YXJ0OiBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIHZhciByZW1vdGVQbGF5ZXIgICAgID0gdGhpcy5wbHVja1JlbW90ZVBsYXllcihwYXlsb2FkLnBsYXllcnMpLFxuICAgICAgICBzZXRSZW1vdGVQbGF5ZXIgID0gX2FwcEFjdGlvbnMuc2V0UmVtb3RlUGxheWVyUHJvcHMocmVtb3RlUGxheWVyKSxcbiAgICAgICAgc2V0R2FtZVBsYXlTdGF0ZSA9IF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuc3RvcmUuZ2FtZVN0YXRlc1szXX0pO1xuXG4gICAgdGhpcy5zdG9yZS5hcHBseShbc2V0UmVtb3RlUGxheWVyLCBzZXRHYW1lUGxheVN0YXRlXSk7XG4gIH0sXG5cbiAgcGx1Y2tSZW1vdGVQbGF5ZXI6IGZ1bmN0aW9uIChwbGF5ZXJzQXJyeSkge1xuICAgIHZhciBsb2NhbFBsYXllcklEID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpLmxvY2FsUGxheWVyLmlkO1xuICAgIGNvbnNvbGUubG9nKCdmaWx0ZXJpbmcgZm9yJywgbG9jYWxQbGF5ZXJJRCwgcGxheWVyc0FycnkpO1xuICAgIHJldHVybiBwbGF5ZXJzQXJyeS5maWx0ZXIoZnVuY3Rpb24gKHBsYXllcikge1xuICAgICAgcmV0dXJuIHBsYXllci5pZCAhPT0gbG9jYWxQbGF5ZXJJRDtcbiAgICB9KVswXTtcbiAgfSxcblxuICBoYW5kbGVHYW1lQWJvcnQ6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgdGhpcy52aWV3LmFsZXJ0KHBheWxvYWQucGF5bG9hZCwgcGF5bG9hZC50eXBlKTtcbiAgICB0aGlzLnN0b3JlLmFwcGx5KF9hcHBBY3Rpb25zLnJlc2V0R2FtZSgpKTtcbiAgfSxcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBMT0NBTF9QTEFZRVJfQ09OTkVDVCAgICAgICA6ICdMT0NBTF9QTEFZRVJfQ09OTkVDVCcsXG4gIFNFVF9TRVNTSU9OX1BST1BTICAgICAgICAgIDogJ1NFVF9TRVNTSU9OX1BST1BTJyxcbiAgU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUyAgICAgOiAnU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUycsXG4gIFNFVF9MT0NBTF9QTEFZRVJfTkFNRSAgICAgIDogJ1NFVF9MT0NBTF9QTEFZRVJfTkFNRScsXG4gIFNFVF9MT0NBTF9QTEFZRVJfQVBQRUFSQU5DRTogJ1NFVF9MT0NBTF9QTEFZRVJfQVBQRUFSQU5DRScsXG4gIFNFVF9SRU1PVEVfUExBWUVSX1BST1BTICAgIDogJ1NFVF9SRU1PVEVfUExBWUVSX1BST1BTJyxcbiAgUkVTRVRfR0FNRSAgICAgICAgICAgICAgICAgOiAnUkVTRVRfR0FNRSdcbiAgLy9TRUxFQ1RfUExBWUVSICAgICAgICAgICAgICA6ICdTRUxFQ1RfUExBWUVSJyxcbiAgLy9SRU1PVEVfUExBWUVSX0NPTk5FQ1QgICAgICA6ICdSRU1PVEVfUExBWUVSX0NPTk5FQ1QnLFxuICAvL0dBTUVfU1RBUlQgICAgICAgICAgICAgICAgIDogJ0dBTUVfU1RBUlQnLFxuICAvL0xPQ0FMX1FVRVNUSU9OICAgICAgICAgICAgIDogJ0xPQ0FMX1FVRVNUSU9OJyxcbiAgLy9SRU1PVEVfUVVFU1RJT04gICAgICAgICAgICA6ICdSRU1PVEVfUVVFU1RJT04nLFxuICAvL0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFIDogJ0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFJyxcbiAgLy9SRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0U6ICdSRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0UnLFxuICAvL0dBTUVfT1ZFUiAgICAgICAgICAgICAgICAgIDogJ0dBTUVfT1ZFUidcbn07IiwiY29uc3QgX2FjdGlvbkNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQWN0aW9uQ29uc3RhbnRzLmpzJyksXG4gICAgICBfYXBwU3RvcmUgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUuanMnKTtcblxuLyoqXG4gKiBQdXJlbHkgZm9yIGNvbnZlbmllbmNlLCBhbiBFdmVudCAoXCJhY3Rpb25cIikgQ3JlYXRvciBhbGEgRmx1eCBzcGVjLiBGb2xsb3dcbiAqIGd1aWRlbGluZXMgZm9yIGNyZWF0aW5nIGFjdGlvbnM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBBY3Rpb25DcmVhdG9yID0ge1xuXG4gIHNldExvY2FsUGxheWVyUHJvcHM6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGxvY2FsUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFJlbW90ZVBsYXllclByb3BzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlICAgOiBfYWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcmVtb3RlUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFNlc3Npb25Qcm9wczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX2FjdGlvbkNvbnN0YW50cy5TRVRfU0VTU0lPTl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHNlc3Npb246IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgcmVzZXRHYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuUkVTRVRfR0FNRSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGN1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV0sXG4gICAgICAgICAgc2Vzc2lvbiAgICAgOiB7XG4gICAgICAgICAgICByb29tSUQgICAgOiAnJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbG9jYWxQbGF5ZXIgOiBfYXBwU3RvcmUuY3JlYXRlUGxheWVyUmVzZXRPYmplY3QoKSxcbiAgICAgICAgICByZW1vdGVQbGF5ZXI6IF9hcHBTdG9yZS5jcmVhdGVQbGF5ZXJSZXNldE9iamVjdCgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQWN0aW9uQ3JlYXRvcjsiLCJjb25zdCBfcmVzdE51bVF1ZXN0aW9ucyAgICAgICA9IDMsXG4gICAgICBfcmVzdFF1ZXN0aW9uQ2F0ZWdvcnkgICA9IDI0LCAvLyBTQ0kvVEVDaFxuICAgICAgX3Jlc3QgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3NlcnZpY2UvUmVzdC5qcycpLFxuICAgICAgX25vcmlBY3Rpb25Db25zdGFudHMgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMnKSxcbiAgICAgIF9hcHBBY3Rpb25Db25zdGFudHMgICAgID0gcmVxdWlyZSgnLi4vYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcycpLFxuICAgICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICAgIF9taXhpblJlZHVjZXJTdG9yZSAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZS5qcycpLFxuICAgICAgX251bVV0aWxzICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29yZS9OdW1iZXJVdGlscy5qcycpO1xuXG4vKipcbiAqIFRoaXMgYXBwbGljYXRpb24gc3RvcmUgY29udGFpbnMgXCJyZWR1Y2VyIHN0b3JlXCIgZnVuY3Rpb25hbGl0eSBiYXNlZCBvbiBSZWR1eC5cbiAqIFRoZSBzdG9yZSBzdGF0ZSBtYXkgb25seSBiZSBjaGFuZ2VkIGZyb20gZXZlbnRzIGFzIGFwcGxpZWQgaW4gcmVkdWNlciBmdW5jdGlvbnMuXG4gKiBUaGUgc3RvcmUgcmVjZWl2ZWQgYWxsIGV2ZW50cyBmcm9tIHRoZSBldmVudCBidXMgYW5kIGZvcndhcmRzIHRoZW0gdG8gYWxsXG4gKiByZWR1Y2VyIGZ1bmN0aW9ucyB0byBtb2RpZnkgc3RhdGUgYXMgbmVlZGVkLiBPbmNlIHRoZXkgaGF2ZSBydW4sIHRoZVxuICogaGFuZGxlU3RhdGVNdXRhdGlvbiBmdW5jdGlvbiBpcyBjYWxsZWQgdG8gZGlzcGF0Y2ggYW4gZXZlbnQgdG8gdGhlIGJ1cywgb3JcbiAqIG5vdGlmeSBzdWJzY3JpYmVycyB2aWEgYW4gb2JzZXJ2YWJsZS5cbiAqXG4gKiBFdmVudHMgPT4gaGFuZGxlQXBwbGljYXRpb25FdmVudHMgPT4gYXBwbHlSZWR1Y2VycyA9PiBoYW5kbGVTdGF0ZU11dGF0aW9uID0+IE5vdGlmeVxuICovXG52YXIgQXBwU3RvcmUgPSBOb3JpLmNyZWF0ZVN0b3JlKHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5SZWR1Y2VyU3RvcmUsXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QoKVxuICBdLFxuXG4gIGdhbWVTdGF0ZXM6IFsnVElUTEUnLCAnUExBWUVSX1NFTEVDVCcsICdXQUlUSU5HX09OX1BMQVlFUicsICdNQUlOX0dBTUUnLCAnR0FNRV9PVkVSJ10sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYWRkUmVkdWNlcih0aGlzLm1haW5TdGF0ZVJlZHVjZXIpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSgpO1xuICAgIHRoaXMuc2V0U3RhdGUoTm9yaS5jb25maWcoKSk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdzdG9yZUluaXRpYWxpemVkJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBvciBsb2FkIGFueSBuZWNlc3NhcnkgZGF0YSBhbmQgdGhlbiBicm9hZGNhc3QgYSBpbml0aWFsaXplZCBldmVudC5cbiAgICovXG4gIGxvYWRTdG9yZTogZnVuY3Rpb24gKCkge1xuICAgIC8vaHR0cHM6Ly9tYXJrZXQubWFzaGFwZS5jb20vcGFyZXNoY2hvdWhhbi90cml2aWFcbiAgICB2YXIgZ2V0UXVlc3Rpb25zID0gX3Jlc3QucmVxdWVzdCh7XG4gICAgICBtZXRob2QgOiAnR0VUJyxcbiAgICAgIC8vaHR0cHM6Ly9wYXJlc2hjaG91aGFuLXRyaXZpYS12MS5wLm1hc2hhcGUuY29tL3YxL2dldFF1aXpRdWVzdGlvbnNCeUNhdGVnb3J5P2NhdGVnb3J5SWQ9MSZsaW1pdD0xMCZwYWdlPTFcbiAgICAgIHVybCAgICA6ICdodHRwczovL3BhcmVzaGNob3VoYW4tdHJpdmlhLXYxLnAubWFzaGFwZS5jb20vdjEvZ2V0QWxsUXVpelF1ZXN0aW9ucz9saW1pdD0nICsgX3Jlc3ROdW1RdWVzdGlvbnMgKyAnJnBhZ2U9MScsXG4gICAgICBoZWFkZXJzOiBbeydYLU1hc2hhcGUtS2V5JzogJ3RQeEtnRHZya3Ftc2hnOHpXNG9sUzg3aHpGN0FwMXZpNjNyanNuVXVWdzFzQkhWOUtKJ31dLFxuICAgICAganNvbiAgIDogdHJ1ZVxuICAgIH0pLnN1YnNjcmliZShcbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZygnb2snLCBkYXRhKTtcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbiBlcnJvcihkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgIH0pO1xuXG4gICAgLy8gU2V0IGluaXRpYWwgc3RhdGVcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRTdGF0ZTogdGhpcy5nYW1lU3RhdGVzWzBdLFxuICAgICAgc2Vzc2lvbiAgICAgOiB7XG4gICAgICAgIHNvY2tldElPSUQ6ICcnLFxuICAgICAgICByb29tSUQgICAgOiAnJ1xuICAgICAgfSxcbiAgICAgIGxvY2FsUGxheWVyIDogXy5tZXJnZSh0aGlzLmNyZWF0ZUJsYW5rUGxheWVyT2JqZWN0KCksIHRoaXMuY3JlYXRlUGxheWVyUmVzZXRPYmplY3QoKSksXG4gICAgICByZW1vdGVQbGF5ZXI6IF8ubWVyZ2UodGhpcy5jcmVhdGVCbGFua1BsYXllck9iamVjdCgpLCB0aGlzLmNyZWF0ZVBsYXllclJlc2V0T2JqZWN0KCkpLFxuICAgICAgcXVlc3Rpb25CYW5rOiBbXVxuICAgIH0pO1xuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdzdG9yZUluaXRpYWxpemVkJyk7XG4gIH0sXG5cbiAgY3JlYXRlQmxhbmtQbGF5ZXJPYmplY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQgICAgICAgIDogJycsXG4gICAgICB0eXBlICAgICAgOiAnJyxcbiAgICAgIG5hbWUgICAgICA6ICdNeXN0ZXJ5IFBsYXllciAnICsgX251bVV0aWxzLnJuZE51bWJlcigxMDAsIDk5OSksXG4gICAgICBhcHBlYXJhbmNlOiAnZ3JlZW4nXG4gICAgfTtcbiAgfSxcblxuICBjcmVhdGVQbGF5ZXJSZXNldE9iamVjdDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICBoZWFsdGggICA6IDYsXG4gICAgICBiZWhhdmlvcnM6IFtdLFxuICAgICAgc2NvcmUgICAgOiAwXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZ5IHN0YXRlIGJhc2VkIG9uIGluY29taW5nIGV2ZW50cy4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIG1vZGlmaWVkXG4gICAqIHN0YXRlIGFuZCBkb2VzIG5vdCBtb2RpZnkgdGhlIHN0YXRlIGRpcmVjdGx5LlxuICAgKiBDYW4gY29tcG9zZSBzdGF0ZSB0cmFuc2Zvcm1hdGlvbnNcbiAgICogcmV0dXJuIF8uYXNzaWduKHt9LCBzdGF0ZSwgb3RoZXJTdGF0ZVRyYW5zZm9ybWVyKHN0YXRlKSk7XG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKiBAcGFyYW0gZXZlbnRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBtYWluU3RhdGVSZWR1Y2VyOiBmdW5jdGlvbiAoc3RhdGUsIGV2ZW50KSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcblxuICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuICAgICAgY2FzZSBfbm9yaUFjdGlvbkNvbnN0YW50cy5DSEFOR0VfU1RPUkVfU1RBVEU6XG4gICAgICBjYXNlIF9hcHBBY3Rpb25Db25zdGFudHMuU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUzpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfUkVNT1RFX1BMQVlFUl9QUk9QUzpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfU0VTU0lPTl9QUk9QUzpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5SRVNFVF9HQU1FOlxuICAgICAgICByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIGV2ZW50LnBheWxvYWQuZGF0YSk7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS53YXJuKCdSZWR1Y2VyIHN0b3JlLCB1bmhhbmRsZWQgZXZlbnQgdHlwZTogJyArIGV2ZW50LnR5cGUpO1xuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDYWxsZWQgYWZ0ZXIgYWxsIHJlZHVjZXJzIGhhdmUgcnVuIHRvIGJyb2FkY2FzdCBwb3NzaWJsZSB1cGRhdGVzLiBEb2VzXG4gICAqIG5vdCBjaGVjayB0byBzZWUgaWYgdGhlIHN0YXRlIHdhcyBhY3R1YWxseSB1cGRhdGVkLlxuICAgKi9cbiAgaGFuZGxlU3RhdGVNdXRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIGxldCBzdGF0ZSA9IHRoaXMuZ2V0U3RhdGUoKTtcblxuICAgIGlmICh0aGlzLnNob3VsZEdhbWVFbmQoc3RhdGUpKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuZ2FtZVN0YXRlc1s0XX0pO1xuICAgIH1cblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnMoc3RhdGUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXaGVuIGEgcGxheWVyJ3MgaGVhbHRoIHJlYWNoZXMgMCwgdGhlIGdhbWUgaXMgb3ZlclxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzaG91bGRHYW1lRW5kOiBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICBpZiAoIXN0YXRlLmxvY2FsUGxheWVyIHx8ICFzdGF0ZS5yZW1vdGVQbGF5ZXIgfHwgc3RhdGUuY3VycmVudFN0YXRlICE9PSAnTUFJTl9HQU1FJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBsb2NhbCAgPSBzdGF0ZS5sb2NhbFBsYXllci5oZWFsdGgsXG4gICAgICAgIHJlbW90ZSA9IHN0YXRlLnJlbW90ZVBsYXllci5oZWFsdGg7XG5cbiAgICBpZiAobG9jYWwgPD0gMCB8fCByZW1vdGUgPD0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFN0b3JlKCk7IiwidmFyIF9hcHBTdG9yZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUuanMnKSxcbiAgICBfbWl4aW5BcHBsaWNhdGlvblZpZXcgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMnKSxcbiAgICBfbWl4aW5OdWRvcnVDb250cm9scyAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpbk51ZG9ydUNvbnRyb2xzLmpzJyksXG4gICAgX21peGluQ29tcG9uZW50Vmlld3MgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5Db21wb25lbnRWaWV3cy5qcycpLFxuICAgIF9taXhpblN0b3JlU3RhdGVWaWV3cyAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzJyksXG4gICAgX21peGluRXZlbnREZWxlZ2F0b3IgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5FdmVudERlbGVnYXRvci5qcycpLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0ID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyk7XG5cbi8qKlxuICogVmlldyBmb3IgYW4gYXBwbGljYXRpb24uXG4gKi9cblxudmFyIEFwcFZpZXcgPSBOb3JpLmNyZWF0ZVZpZXcoe1xuXG4gIG1peGluczogW1xuICAgIF9taXhpbkFwcGxpY2F0aW9uVmlldyxcbiAgICBfbWl4aW5OdWRvcnVDb250cm9scyxcbiAgICBfbWl4aW5Db21wb25lbnRWaWV3cyxcbiAgICBfbWl4aW5TdG9yZVN0YXRlVmlld3MsXG4gICAgX21peGluRXZlbnREZWxlZ2F0b3IoKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCgpXG4gIF0sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyhbJ2FwcGxpY2F0aW9uc2NhZmZvbGQnLCAnYXBwbGljYXRpb25jb21wb25lbnRzc2NhZmZvbGQnXSk7XG4gICAgdGhpcy5pbml0aWFsaXplU3RhdGVWaWV3cyhfYXBwU3RvcmUpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzKCk7XG5cbiAgICB0aGlzLmNvbmZpZ3VyZVZpZXdzKCk7XG4gIH0sXG5cbiAgY29uZmlndXJlVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2NyZWVuVGl0bGUgICAgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uVGl0bGUuanMnKSgpLFxuICAgICAgICBzY3JlZW5QbGF5ZXJTZWxlY3QgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5QbGF5ZXJTZWxlY3QuanMnKSgpLFxuICAgICAgICBzY3JlZW5XYWl0aW5nT25QbGF5ZXIgPSByZXF1aXJlKCcuL1NjcmVlbi5XYWl0aW5nT25QbGF5ZXIuanMnKSgpLFxuICAgICAgICBzY3JlZW5NYWluR2FtZSAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5NYWluR2FtZS5qcycpKCksXG4gICAgICAgIHNjcmVlbkdhbWVPdmVyICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLkdhbWVPdmVyLmpzJykoKSxcbiAgICAgICAgZ2FtZVN0YXRlcyAgICAgICAgICAgID0gX2FwcFN0b3JlLmdhbWVTdGF0ZXM7XG5cbiAgICB0aGlzLnNldFZpZXdNb3VudFBvaW50KCcjY29udGVudHMnKTtcblxuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1swXSwgJ3RpdGxlJywgc2NyZWVuVGl0bGUpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1sxXSwgJ3BsYXllcnNlbGVjdCcsIHNjcmVlblBsYXllclNlbGVjdCk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzJdLCAnd2FpdGluZ29ucGxheWVyJywgc2NyZWVuV2FpdGluZ09uUGxheWVyKTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbM10sICdnYW1lJywgc2NyZWVuTWFpbkdhbWUpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1s0XSwgJ2dhbWVvdmVyJywgc2NyZWVuR2FtZU92ZXIpO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXcoKTsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyksXG4gICAgX3RlbXBsYXRlICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIGNvbmZpZ1Byb3BzIHBhc3NlZCBpbiBmcm9tIHJlZ2lvbiBkZWZpbml0aW9uIG9uIHBhcmVudCBWaWV3XG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgdGhpcy5iaW5kTWFwKF9hcHBTdG9yZSk7IC8vIFJlZHVjZXIgc3RvcmUsIG1hcCBpZCBzdHJpbmcgb3IgbWFwIG9iamVjdFxuICB9LFxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICBzdGF0cyAgICA9IGFwcFN0YXRlLmxvY2FsUGxheWVyO1xuICAgIGlmICh0aGlzLmdldENvbmZpZ1Byb3BzKCkudGFyZ2V0ID09PSAncmVtb3RlJykge1xuICAgICAgc3RhdHMgPSBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXI7XG4gICAgfVxuICAgIHJldHVybiBzdGF0cztcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICBzdGF0cyAgICA9IGFwcFN0YXRlLmxvY2FsUGxheWVyO1xuICAgIGlmICh0aGlzLmdldENvbmZpZ1Byb3BzKCkudGFyZ2V0ID09PSAncmVtb3RlJykge1xuICAgICAgc3RhdHMgPSBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXI7XG4gICAgfVxuICAgIHJldHVybiBzdGF0cztcbiAgfSxcblxuICB0ZW1wbGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBodG1sID0gX3RlbXBsYXRlLmdldFNvdXJjZSgnZ2FtZV9fcGxheWVyc3RhdHMnKTtcbiAgICByZXR1cm4gXy50ZW1wbGF0ZShodG1sKTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwiY29uc3QgX25vcmlBY3Rpb25zICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgICAgX2FwcEFjdGlvbnMgICAgICAgICAgID0gcmVxdWlyZSgnLi4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICAgIF9hcHBWaWV3ICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgICAgX2FwcFN0b3JlICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKSxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX21peGluRE9NTWFuaXB1bGF0aW9uID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluRE9NTWFuaXB1bGF0aW9uLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluRE9NTWFuaXB1bGF0aW9uXG4gIF0sXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICNnYW1lb3Zlcl9fYnV0dG9uLXJlcGxheSc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9hcHBBY3Rpb25zLnJlc2V0R2FtZSgpKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKSxcbiAgICAgICAgc3RhdGUgICAgPSB7XG4gICAgICAgICAgbmFtZSAgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICAgICAgYXBwZWFyYW5jZSA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICAgICAgbG9jYWxTY29yZSA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLnNjb3JlLFxuICAgICAgICAgIHJlbW90ZVNjb3JlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICAgICAgbG9jYWxXaW4gICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLnNjb3JlID4gYXBwU3RhdGUucmVtb3RlUGxheWVyLnNjb3JlLFxuICAgICAgICAgIHJlbW90ZVdpbiAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5zY29yZSA8IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZSxcbiAgICAgICAgICB0aWVXaW4gICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPT09IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZVxuICAgICAgICB9O1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuXG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fdGllJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fbG9vc2UnKTtcblxuICAgIGlmIChzdGF0ZS5sb2NhbFdpbikge1xuICAgICAgdGhpcy5zaG93RWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5yZW1vdGVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX2xvb3NlJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS50aWVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX3RpZScpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwiY29uc3QgX25vcmlBY3Rpb25zICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgICAgX2FwcEFjdGlvbnMgICAgICAgID0gcmVxdWlyZSgnLi4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICAgIF9hcHBWaWV3ICAgICAgICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldy5qcycpLFxuICAgICAgX2FwcFN0b3JlICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUuanMnKSxcbiAgICAgIF9zb2NrZXRJTyAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcycpLFxuICAgICAgX3RlbXBsYXRlICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfcmVnaW9uUGxheWVyU3RhdHMgPSByZXF1aXJlKCcuL1JlZ2lvbi5QbGF5ZXJTdGF0cy5qcycpLFxuICAgICAgX251bVV0aWxzICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvcmUvTnVtYmVyVXRpbHMuanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIGRlZmluZVJlZ2lvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbG9jYWxQbGF5ZXJTdGF0cyA6IF9yZWdpb25QbGF5ZXJTdGF0cyh7XG4gICAgICAgIGlkICAgICAgICA6ICdnYW1lX19wbGF5ZXJzdGF0cycsXG4gICAgICAgIG1vdW50UG9pbnQ6ICcjZ2FtZV9fbG9jYWxwbGF5ZXJzdGF0cycsXG4gICAgICAgIHRhcmdldCAgICA6ICdsb2NhbCdcbiAgICAgIH0pLFxuICAgICAgcmVtb3RlUGxheWVyU3RhdHM6IF9yZWdpb25QbGF5ZXJTdGF0cyh7XG4gICAgICAgIGlkICAgICAgICA6ICdnYW1lX19wbGF5ZXJzdGF0cycsXG4gICAgICAgIG1vdW50UG9pbnQ6ICcjZ2FtZV9fcmVtb3RlcGxheWVyc3RhdHMnLFxuICAgICAgICB0YXJnZXQgICAgOiAncmVtb3RlJ1xuICAgICAgfSlcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI2dhbWVfX2J1dHRvbi1za2lwJzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbNF19KSk7XG4gICAgICB9LFxuICAgICAgJ2NsaWNrICNnYW1lX190ZXN0JyAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHN0YXRlICAgICAgICA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICAgICAgbG9jYWxTY29yZSAgID0gc3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgKyBfbnVtVXRpbHMucm5kTnVtYmVyKDAsIDUpLFxuICAgICAgICAgICAgbG9jYWxIZWFsdGggID0gc3RhdGUubG9jYWxQbGF5ZXIuaGVhbHRoICsgMSxcbiAgICAgICAgICAgIHJlbW90ZVNjb3JlICA9IHN0YXRlLnJlbW90ZVBsYXllci5zY29yZSArIF9udW1VdGlscy5ybmROdW1iZXIoMCwgNSksXG4gICAgICAgICAgICByZW1vdGVIZWFsdGggPSBzdGF0ZS5yZW1vdGVQbGF5ZXIuaGVhbHRoIC0gMTtcblxuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICAgICAgaGVhbHRoOiBsb2NhbEhlYWx0aCxcbiAgICAgICAgICBzY29yZSA6IGxvY2FsU2NvcmVcbiAgICAgICAgfSkpO1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX2FwcEFjdGlvbnMuc2V0UmVtb3RlUGxheWVyUHJvcHMoe1xuICAgICAgICAgIGhlYWx0aDogcmVtb3RlSGVhbHRoLFxuICAgICAgICAgIHNjb3JlIDogcmVtb3RlU2NvcmVcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIGxldCBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBsb2NhbCA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLFxuICAgICAgcmVtb3RlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXJcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcblxuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCIvKlxuIFRPRE9cblxuICovXG5cbnZhciBfcm9vbU51bWJlckxlbmd0aCA9IDQsXG4gICAgX25vcmlBY3Rpb25zICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJyksXG4gICAgX2FwcEFjdGlvbnMgICAgICAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9hcHBWaWV3ICAgICAgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3LmpzJyksXG4gICAgX2FwcFN0b3JlICAgICAgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZS5qcycpLFxuICAgIF9zb2NrZXRJTyAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJyksXG4gICAgX3RlbXBsYXRlICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnYmx1ciAjc2VsZWN0X19wbGF5ZXJuYW1lJyAgICAgICAgOiB0aGlzLnNldFBsYXllck5hbWUuYmluZCh0aGlzKSxcbiAgICAgICdjaGFuZ2UgI3NlbGVjdF9fcGxheWVydHlwZScgICAgICA6IHRoaXMuc2V0UGxheWVyQXBwZWFyYW5jZS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1qb2lucm9vbScgIDogdGhpcy5vbkpvaW5Sb29tLmJpbmQodGhpcyksXG4gICAgICAnY2xpY2sgI3NlbGVjdF9fYnV0dG9uLWNyZWF0ZXJvb20nOiB0aGlzLm9uQ3JlYXRlUm9vbS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1nbycgICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMl19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICBzZXRQbGF5ZXJOYW1lOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYWN0aW9uID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICBuYW1lOiB2YWx1ZVxuICAgIH0pO1xuICAgIF9hcHBTdG9yZS5hcHBseShhY3Rpb24pO1xuICB9LFxuXG4gIHNldFBsYXllckFwcGVhcmFuY2U6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBhY3Rpb24gPSBfYXBwQWN0aW9ucy5zZXRMb2NhbFBsYXllclByb3BzKHtcbiAgICAgIGFwcGVhcmFuY2U6IHZhbHVlXG4gICAgfSk7XG4gICAgX2FwcFN0b3JlLmFwcGx5KGFjdGlvbik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRJbml0aWFsU3RhdGUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVydHlwZScpLnZhbHVlID0gdGhpcy5nZXRTdGF0ZSgpLmFwcGVhcmFuY2U7XG4gIH0sXG5cbiAgb25DcmVhdGVSb29tOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMudmFsaWRhdGVVc2VyRGV0YWlsc0lucHV0KCkpIHtcbiAgICAgIF9zb2NrZXRJTy5ub3RpZnlTZXJ2ZXIoX3NvY2tldElPLmV2ZW50cygpLkNSRUFURV9ST09NLCB7XG4gICAgICAgIHBsYXllckRldGFpbHM6IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLmxvY2FsUGxheWVyXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgb25Kb2luUm9vbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciByb29tSUQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19yb29taWQnKS52YWx1ZTtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVJvb21JRChyb29tSUQpKSB7XG4gICAgICBfc29ja2V0SU8ubm90aWZ5U2VydmVyKF9zb2NrZXRJTy5ldmVudHMoKS5KT0lOX1JPT00sIHtcbiAgICAgICAgcm9vbUlEICAgICAgIDogcm9vbUlELFxuICAgICAgICBwbGF5ZXJEZXRhaWxzOiBfYXBwU3RvcmUuZ2V0U3RhdGUoKS5sb2NhbFBsYXllclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9hcHBWaWV3LmFsZXJ0KCdUaGUgcm9vbSBJRCBpcyBub3QgY29ycmVjdC4gRG9lcyBpdCBjb250YWluIGxldHRlcnMgb3IgaXMgbGVzcyB0aGFuICcrX3Jvb21OdW1iZXJMZW5ndGgrJyBkaWdpdHM/JywgJ0JhZCBSb29tIElEJyk7XG4gICAgfVxuICB9LFxuXG4gIHZhbGlkYXRlVXNlckRldGFpbHNJbnB1dDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBuYW1lICAgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVybmFtZScpLnZhbHVlLFxuICAgICAgICBhcHBlYXJhbmNlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVydHlwZScpLnZhbHVlO1xuXG4gICAgaWYgKCFuYW1lLmxlbmd0aCB8fCAhYXBwZWFyYW5jZSkge1xuICAgICAgX2FwcFZpZXcuYWxlcnQoJ01ha2Ugc3VyZSB5b3VcXCd2ZSB0eXBlZCBhIG5hbWUgZm9yIHlvdXJzZWxmIGFuZCBzZWxlY3RlZCBhbiBhcHBlYXJhbmNlJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSb29tIElEIG11c3QgYmUgYW4gaW50ZWdlciBhbmQgNSBkaWdpdHNcbiAgICogQHBhcmFtIHJvb21JRFxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHZhbGlkYXRlUm9vbUlEOiBmdW5jdGlvbiAocm9vbUlEKSB7XG4gICAgaWYgKGlzTmFOKHBhcnNlSW50KHJvb21JRCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChyb29tSUQubGVuZ3RoICE9PSBfcm9vbU51bWJlckxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjdGl0bGVfX2J1dHRvbi1zdGFydCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjd2FpdGluZ19fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1szXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICByb29tSUQgICAgOiBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICByb29tSUQgICAgOiBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qKlxuICogSW5pdGlhbCBmaWxlIGZvciB0aGUgQXBwbGljYXRpb25cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgLyoqXG4gICAqIElFIHZlcnNpb25zIDkgYW5kIHVuZGVyIGFyZSBibG9ja2VkLCBvdGhlcnMgYXJlIGFsbG93ZWQgdG8gcHJvY2VlZFxuICAgKi9cbiAgaWYoX2Jyb3dzZXJJbmZvLm5vdFN1cHBvcnRlZCB8fCBfYnJvd3NlckluZm8uaXNJRTkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuaW5uZXJIVE1MID0gJzxoMz5Gb3IgdGhlIGJlc3QgZXhwZXJpZW5jZSwgcGxlYXNlIHVzZSBJbnRlcm5ldCBFeHBsb3JlciAxMCssIEZpcmVmb3gsIENocm9tZSBvciBTYWZhcmkgdG8gdmlldyB0aGlzIGFwcGxpY2F0aW9uLjwvaDM+JztcbiAgfSBlbHNlIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24gbW9kdWxlIGFuZCBpbml0aWFsaXplXG4gICAgICovXG4gICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgd2luZG93Lk5vcmkgPSByZXF1aXJlKCcuL25vcmkvTm9yaS5qcycpO1xuICAgICAgd2luZG93LkFQUCA9IHJlcXVpcmUoJy4vYXBwL0FwcC5qcycpO1xuICAgICAgQVBQLmluaXRpYWxpemUoKTtcbiAgICB9O1xuXG4gIH1cblxufSgpKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbmxldCBOb3JpID0gZnVuY3Rpb24gKCkge1xuXG4gIGNvbnN0IF9kaXNwYXRjaGVyID0gcmVxdWlyZSgnLi91dGlscy9EaXNwYXRjaGVyLmpzJyksXG4gICAgICBfcm91dGVyICAgICA9IHJlcXVpcmUoJy4vdXRpbHMvUm91dGVyLmpzJyk7XG5cbiAgLy8gU3dpdGNoIExvZGFzaCB0byB1c2UgTXVzdGFjaGUgc3R5bGUgdGVtcGxhdGVzXG4gIF8udGVtcGxhdGVTZXR0aW5ncy5pbnRlcnBvbGF0ZSA9IC97eyhbXFxzXFxTXSs/KX19L2c7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZnVuY3Rpb24gZ2V0RGlzcGF0Y2hlcigpIHtcbiAgICByZXR1cm4gX2Rpc3BhdGNoZXI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSb3V0ZXIoKSB7XG4gICAgcmV0dXJuIF9yb3V0ZXI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCAod2luZG93LkFQUF9DT05GSUdfREFUQSB8fCB7fSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFJvdXRlKCkge1xuICAgIHJldHVybiBfcm91dGVyLmdldEN1cnJlbnRSb3V0ZSgpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBGYWN0b3JpZXMgLSBjb25jYXRlbmF0aXZlIGluaGVyaXRhbmNlLCBkZWNvcmF0b3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBNZXJnZXMgYSBjb2xsZWN0aW9uIG9mIG9iamVjdHNcbiAgICogQHBhcmFtIHRhcmdldFxuICAgKiBAcGFyYW0gc291cmNlQXJyYXlcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc3NpZ25BcnJheSh0YXJnZXQsIHNvdXJjZUFycmF5KSB7XG4gICAgc291cmNlQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICB0YXJnZXQgPSBfLmFzc2lnbih0YXJnZXQsIHNvdXJjZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgTm9yaSBhcHBsaWNhdGlvbiBpbnN0YW5jZVxuICAgKiBAcGFyYW0gY3VzdG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQXBwbGljYXRpb24oY3VzdG9tKSB7XG4gICAgY3VzdG9tLm1peGlucy5wdXNoKHRoaXMpO1xuICAgIHJldHVybiBidWlsZEZyb21NaXhpbnMoY3VzdG9tKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIG1haW4gYXBwbGljYXRpb24gc3RvcmVcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVN0b3JlKGN1c3RvbSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBjcygpIHtcbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSkpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBtYWluIGFwcGxpY2F0aW9uIHZpZXdcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVZpZXcoY3VzdG9tKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGN2KCkge1xuICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBidWlsZEZyb21NaXhpbnMoY3VzdG9tKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNaXhlcyBpbiB0aGUgbW9kdWxlcyBzcGVjaWZpZWQgaW4gdGhlIGN1c3RvbSBhcHBsaWNhdGlvbiBvYmplY3RcbiAgICogQHBhcmFtIHNvdXJjZU9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGJ1aWxkRnJvbU1peGlucyhzb3VyY2VPYmplY3QpIHtcbiAgICBsZXQgbWl4aW5zO1xuXG4gICAgaWYgKHNvdXJjZU9iamVjdC5taXhpbnMpIHtcbiAgICAgIG1peGlucyA9IHNvdXJjZU9iamVjdC5taXhpbnM7XG4gICAgfVxuXG4gICAgbWl4aW5zLnB1c2goc291cmNlT2JqZWN0KTtcbiAgICByZXR1cm4gYXNzaWduQXJyYXkoe30sIG1peGlucyk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGNvbmZpZyAgICAgICAgICAgOiBnZXRDb25maWcsXG4gICAgZGlzcGF0Y2hlciAgICAgICA6IGdldERpc3BhdGNoZXIsXG4gICAgcm91dGVyICAgICAgICAgICA6IGdldFJvdXRlcixcbiAgICBjcmVhdGVBcHBsaWNhdGlvbjogY3JlYXRlQXBwbGljYXRpb24sXG4gICAgY3JlYXRlU3RvcmUgICAgICA6IGNyZWF0ZVN0b3JlLFxuICAgIGNyZWF0ZVZpZXcgICAgICAgOiBjcmVhdGVWaWV3LFxuICAgIGJ1aWxkRnJvbU1peGlucyAgOiBidWlsZEZyb21NaXhpbnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBhc3NpZ25BcnJheSAgICAgIDogYXNzaWduQXJyYXlcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3JpKCk7XG5cblxuIiwiLyogQGZsb3cgd2VhayAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQ0hBTkdFX1NUT1JFX1NUQVRFOiAnQ0hBTkdFX1NUT1JFX1NUQVRFJ1xufTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWN0aW9uIENyZWF0b3JcbiAqIEJhc2VkIG9uIEZsdXggQWN0aW9uc1xuICogRm9yIG1vcmUgaW5mb3JtYXRpb24gYW5kIGd1aWRlbGluZXM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBfbm9yaUFjdGlvbkNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQWN0aW9uQ29uc3RhbnRzLmpzJyk7XG5cbnZhciBOb3JpQWN0aW9uQ3JlYXRvciA9IHtcblxuICBjaGFuZ2VTdG9yZVN0YXRlOiBmdW5jdGlvbiAoZGF0YSwgaWQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX25vcmlBY3Rpb25Db25zdGFudHMuQ0hBTkdFX1NUT1JFX1NUQVRFLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBpZCAgOiBpZCxcbiAgICAgICAgZGF0YTogZGF0YVxuICAgICAgfVxuICAgIH07XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3JpQWN0aW9uQ3JlYXRvcjsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWpheCAvIFJlc3QgbW9kdWxlLlxuICogUmV0dXJucyBhbiBSeEpTIE9iZXJ2YWJsZVxuICpcbiAqIFVzYWdlOlxuICpcbiB2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vbm9yaS9zZXJ2aWNlL1Jlc3QnKTtcblxuIHZhciBnZXRTdWIgPSByZXF1ZXN0LnJlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICB1cmwgICA6ICcvaXRlbXMnLFxuICAgICAgICBoZWFkZXJzOiBbeydrZXknOid2YWx1ZSd9XSxcbiAgICAgICAganNvbiAgOiB0cnVlXG4gICAgICB9KS5zdWJzY3JpYmUoXG4gZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICAgIH0sXG4gZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiB2YXIgcG9zdFN1YiA9IHJlcXVlc3QucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICB1cmwgICA6ICcvaXRlbXMnLFxuICAgICAgICBkYXRhICA6IEpTT04uc3RyaW5naWZ5KHtrZXk6ICd2YWx1ZSd9KSxcbiAgICAgICAganNvbiAgOiB0cnVlXG4gICAgICB9KS5zdWJzY3JpYmUoXG4gZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICAgIH0sXG4gZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiB2YXIgcHV0U3ViID0gcmVxdWVzdC5yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgdXJsICAgOiAnL2l0ZW1zLzQyJyxcbiAgICAgICAgZGF0YSAgOiBKU09OLnN0cmluZ2lmeSh7a2V5OiAndmFsdWUnfSksXG4gICAgICAgIGpzb24gIDogdHJ1ZVxuICAgICAgfSkuc3Vic2NyaWJlKFxuIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgICAgICB9LFxuIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gdmFyIGRlbFN1YiA9IHJlcXVlc3QucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIHVybCAgIDogJy9pdGVtcy80MicsXG4gICAgICAgIGpzb24gIDogdHJ1ZVxuICAgICAgfSkuc3Vic2NyaWJlKFxuIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgICAgICB9LFxuIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICAgIH0pO1xuICpcbiAqL1xuXG5sZXQgUmVzdCA9IGZ1bmN0aW9uICgpIHtcblxuICBmdW5jdGlvbiByZXF1ZXN0KHJlcU9iaikge1xuXG4gICAgbGV0IHhociAgICAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKSxcbiAgICAgICAganNvbiAgICA9IHJlcU9iai5qc29uIHx8IGZhbHNlLFxuICAgICAgICBtZXRob2QgID0gcmVxT2JqLm1ldGhvZC50b1VwcGVyQ2FzZSgpIHx8ICdHRVQnLFxuICAgICAgICB1cmwgICAgID0gcmVxT2JqLnVybCxcbiAgICAgICAgaGVhZGVycyA9IHJlcU9iai5oZWFkZXJzIHx8IFtdLFxuICAgICAgICBkYXRhICAgID0gcmVxT2JqLmRhdGEgfHwgbnVsbDtcblxuICAgIHJldHVybiBuZXcgUnguT2JzZXJ2YWJsZS5jcmVhdGUoZnVuY3Rpb24gbWFrZVJlcShvYnNlcnZlcikge1xuICAgICAgeGhyLm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuXG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWYgKGpzb24pIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcih4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgaGFuZGxlRXJyb3IoJ1Jlc3VsdCcsICdFcnJvciBwYXJzaW5nIHJlc3VsdC4gU3RhdHVzOiAnICsgeGhyLnN0YXR1cyArICcsIFJlc3BvbnNlOiAnICsgeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGFuZGxlRXJyb3IoeGhyLnN0YXR1cywgeGhyLnN0YXR1c1RleHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgeGhyLm9uZXJyb3IgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaGFuZGxlRXJyb3IoJ05ldHdvcmsgZXJyb3InKTtcbiAgICAgIH07XG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBoYW5kbGVFcnJvcignVGltZW91dCcpO1xuICAgICAgfTtcbiAgICAgIHhoci5vbmFib3J0ICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGhhbmRsZUVycm9yKCdBYm91dCcpO1xuICAgICAgfTtcblxuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uIChoZWFkZXJQYWlyKSB7XG4gICAgICAgIGxldCBwcm9wID0gT2JqZWN0LmtleXMoaGVhZGVyUGFpcilbMF0sXG4gICAgICAgICAgICB2YWx1ZSA9IGhlYWRlclBhaXJbcHJvcF07XG4gICAgICAgIGlmIChwcm9wICYmIHZhbHVlKSB7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIocHJvcCwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zZXJ2aWNlL3Jlc3QsIGJhZCBoZWFkZXIgcGFpcjogJywgaGVhZGVyUGFpcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBzZXQgbm9uIGpzb24gaGVhZGVyPyAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04J1xuICAgICAgaWYgKGpzb24gJiYgbWV0aG9kICE9PSBcIkdFVFwiKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICAgIH0gZWxzZSBpZiAoanNvbiAmJiBtZXRob2QgPT09IFwiR0VUXCIpIHtcbiAgICAgICAgLy8sIHRleHQvKlxuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkFjY2VwdFwiLCBcImFwcGxpY2F0aW9uL2pzb247IG9kYXRhPXZlcmJvc2VcIik7ICAvLyBvZGF0YSBwYXJhbSBmb3IgU2hhcmVwb2ludFxuICAgICAgfVxuXG4gICAgICB4aHIuc2VuZChkYXRhKTtcblxuICAgICAgZnVuY3Rpb24gaGFuZGxlRXJyb3IodHlwZSwgbWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZSB8fCAnJztcbiAgICAgICAgb2JzZXJ2ZXIub25FcnJvcih0eXBlICsgJyAnICsgbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXN0KCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG5sZXQgU29ja2V0SU9Db25uZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9zdWJqZWN0ICA9IG5ldyBSeC5CZWhhdmlvclN1YmplY3QoKSxcbiAgICAgIF9zb2NrZXRJTyA9IGlvKCksXG4gICAgICBfbG9nICAgICAgPSBbXSxcbiAgICAgIF9jb25uZWN0aW9uSUQsXG4gICAgICBfZXZlbnRzICAgPSByZXF1aXJlKCcuL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIF9zb2NrZXRJTy5vbihfZXZlbnRzLk5PVElGWV9DTElFTlQsIG9uTm90aWZ5Q2xpZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgbm90aWZpY2F0aW9ucyBmcm9tIFNvY2tldC5pbyBjb21lIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWQge3R5cGUsIGlkLCB0aW1lLCBwYXlsb2FkfVxuICAgKi9cbiAgZnVuY3Rpb24gb25Ob3RpZnlDbGllbnQocGF5bG9hZCkge1xuICAgIF9sb2cucHVzaChwYXlsb2FkKTtcblxuICAgIGxldCB7dHlwZX0gPSBwYXlsb2FkO1xuXG4gICAgaWYgKHR5cGUgPT09IF9ldmVudHMuUElORykge1xuICAgICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUE9ORywge30pO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gX2V2ZW50cy5QT05HKSB7XG4gICAgICBjb25zb2xlLmxvZygnU09DS0VULklPIFBPTkchJyk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBfZXZlbnRzLkNPTk5FQ1QpIHtcbiAgICAgIF9jb25uZWN0aW9uSUQgPSBwYXlsb2FkLmlkO1xuICAgIH1cbiAgICBub3RpZnlTdWJzY3JpYmVycyhwYXlsb2FkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBpbmcoKSB7XG4gICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUElORywge30pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbCBjb21tdW5pY2F0aW9ucyB0byB0aGUgc2VydmVyIHNob3VsZCBnbyB0aHJvdWdoIGhlcmVcbiAgICogQHBhcmFtIHR5cGVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVNlcnZlcih0eXBlLCBwYXlsb2FkKSB7XG4gICAgX3NvY2tldElPLmVtaXQoX2V2ZW50cy5OT1RJRllfU0VSVkVSLCB7XG4gICAgICB0eXBlICAgICAgICA6IHR5cGUsXG4gICAgICBjb25uZWN0aW9uSUQ6IF9jb25uZWN0aW9uSUQsXG4gICAgICBwYXlsb2FkICAgICA6IHBheWxvYWRcbiAgICB9KTtcbiAgfVxuXG4gIC8vZnVuY3Rpb24gZW1pdChtZXNzYWdlLCBwYXlsb2FkKSB7XG4gIC8vICBtZXNzYWdlID0gbWVzc2FnZSB8fCBfZXZlbnRzLk1FU1NBR0U7XG4gIC8vICBwYXlsb2FkID0gcGF5bG9hZCB8fCB7fTtcbiAgLy8gIF9zb2NrZXRJTy5lbWl0KG1lc3NhZ2UsIHBheWxvYWQpO1xuICAvL31cbiAgLy9cbiAgLy9mdW5jdGlvbiBvbihldmVudCwgaGFuZGxlcikge1xuICAvLyAgX3NvY2tldElPLm9uKGV2ZW50LCBoYW5kbGVyKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSBoYW5kbGVyIHRvIHVwZGF0ZXNcbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlcikge1xuICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIGZyb20gdXBkYXRlIG9yIHdoYXRldmVyIGZ1bmN0aW9uIHRvIGRpc3BhdGNoIHRvIHN1YnNjcmliZXJzXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVycyhwYXlsb2FkKSB7XG4gICAgX3N1YmplY3Qub25OZXh0KHBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGxhc3QgcGF5bG9hZCB0aGF0IHdhcyBkaXNwYXRjaGVkIHRvIHN1YnNjcmliZXJzXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TGFzdE5vdGlmaWNhdGlvbigpIHtcbiAgICByZXR1cm4gX3N1YmplY3QuZ2V0VmFsdWUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEV2ZW50Q29uc3RhbnRzKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2V2ZW50cyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGV2ZW50cyAgICAgICAgICAgICA6IGdldEV2ZW50Q29uc3RhbnRzLFxuICAgIGluaXRpYWxpemUgICAgICAgICA6IGluaXRpYWxpemUsXG4gICAgcGluZyAgICAgICAgICAgICAgIDogcGluZyxcbiAgICBub3RpZnlTZXJ2ZXIgICAgICAgOiBub3RpZnlTZXJ2ZXIsXG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIG5vdGlmeVN1YnNjcmliZXJzICA6IG5vdGlmeVN1YnNjcmliZXJzLFxuICAgIGdldExhc3ROb3RpZmljYXRpb246IGdldExhc3ROb3RpZmljYXRpb25cbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTb2NrZXRJT0Nvbm5lY3RvcigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFBJTkcgICAgICAgICAgICAgOiAncGluZycsXG4gIFBPTkcgICAgICAgICAgICAgOiAncG9uZycsXG4gIE5PVElGWV9DTElFTlQgICAgOiAnbm90aWZ5X2NsaWVudCcsXG4gIE5PVElGWV9TRVJWRVIgICAgOiAnbm90aWZ5X3NlcnZlcicsXG4gIENPTk5FQ1QgICAgICAgICAgOiAnY29ubmVjdCcsXG4gIERST1BQRUQgICAgICAgICAgOiAnZHJvcHBlZCcsXG4gIFVTRVJfQ09OTkVDVEVEICAgOiAndXNlcl9jb25uZWN0ZWQnLFxuICBVU0VSX0RJU0NPTk5FQ1RFRDogJ3VzZXJfZGlzY29ubmVjdGVkJyxcbiAgRU1JVCAgICAgICAgICAgICA6ICdlbWl0JyxcbiAgQlJPQURDQVNUICAgICAgICA6ICdicm9hZGNhc3QnLFxuICBTWVNURU1fTUVTU0FHRSAgIDogJ3N5c3RlbV9tZXNzYWdlJyxcbiAgTUVTU0FHRSAgICAgICAgICA6ICdtZXNzYWdlJyxcbiAgQ1JFQVRFX1JPT00gICAgICA6ICdjcmVhdGVfcm9vbScsXG4gIEpPSU5fUk9PTSAgICAgICAgOiAnam9pbl9yb29tJyxcbiAgTEVBVkVfUk9PTSAgICAgICA6ICdsZWF2ZV9yb29tJyxcbiAgR0FNRV9TVEFSVCAgICAgICA6ICdnYW1lX3N0YXJ0JyxcbiAgR0FNRV9FTkQgICAgICAgICA6ICdnYW1lX2VuZCcsXG4gIEdBTUVfQUJPUlQgICAgICAgOiAnZ2FtZV9hYm9ydCdcbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFdyYXBzIEltbXV0YWJsZS5qcydzIE1hcCBpbiB0aGUgc2FtZSBzeW50YXggYXMgdGhlIFNpbXBsZVN0b3JlIG1vZHVsZVxuICpcbiAqIFZpZXcgRG9jcyBodHRwOi8vZmFjZWJvb2suZ2l0aHViLmlvL2ltbXV0YWJsZS1qcy9kb2NzLyMvTWFwXG4gKi9cblxubGV0IGltbXV0YWJsZSA9IHJlcXVpcmUoJy4uLy4uL3ZlbmRvci9pbW11dGFibGUubWluLmpzJyk7XG5cbmxldCBJbW11dGFibGVNYXAgPSBmdW5jdGlvbiAoKSB7XG4gIGxldCBfbWFwID0gaW1tdXRhYmxlLk1hcCgpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBNYXAgb2JqZWN0XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TWFwKCkge1xuICAgIHJldHVybiBfbWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIGNvcHkgb2YgdGhlIHN0YXRlXG4gICAqIEByZXR1cm5zIHt2b2lkfCp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICByZXR1cm4gX21hcC50b0pTKCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGVcbiAgICogQHBhcmFtIG5leHRcbiAgICovXG4gIGZ1bmN0aW9uIHNldFN0YXRlKG5leHQpIHtcbiAgICBfbWFwID0gX21hcC5tZXJnZShuZXh0KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZ2V0U3RhdGU6IGdldFN0YXRlLFxuICAgIHNldFN0YXRlOiBzZXRTdGF0ZSxcbiAgICBnZXRNYXAgIDogZ2V0TWFwXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW1tdXRhYmxlTWFwOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBNaXhpbiBmb3IgTm9yaSBzdG9yZXMgdG8gYWRkIGZ1bmN0aW9uYWxpdHkgc2ltaWxhciB0byBSZWR1eCcgUmVkdWNlciBhbmQgc2luZ2xlXG4gKiBvYmplY3Qgc3RhdGUgdHJlZSBjb25jZXB0LiBNaXhpbiBzaG91bGQgYmUgY29tcG9zZWQgdG8gbm9yaS9zdG9yZS9BcHBsaWNhdGlvblN0b3JlXG4gKiBkdXJpbmcgY3JlYXRpb24gb2YgbWFpbiBBcHBTdG9yZVxuICpcbiAqIGh0dHBzOi8vZ2FlYXJvbi5naXRodWIuaW8vcmVkdXgvZG9jcy9hcGkvU3RvcmUuaHRtbFxuICogaHR0cHM6Ly9nYWVhcm9uLmdpdGh1Yi5pby9yZWR1eC9kb2NzL2Jhc2ljcy9SZWR1Y2Vycy5odG1sXG4gKlxuICogQ3JlYXRlZCA4LzEzLzE1XG4gKi9cbmxldCBNaXhpblJlZHVjZXJTdG9yZSA9IGZ1bmN0aW9uICgpIHtcbiAgbGV0IF90aGlzLFxuICAgICAgX3N0YXRlLFxuICAgICAgX3N0YXRlUmVkdWNlcnMgPSBbXTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFjY2Vzc29yc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogX3N0YXRlIG1pZ2h0IG5vdCBleGlzdCBpZiBzdWJzY3JpYmVycyBhcmUgYWRkZWQgYmVmb3JlIHRoaXMgc3RvcmUgaXMgaW5pdGlhbGl6ZWRcbiAgICovXG4gIGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICAgIGlmIChfc3RhdGUpIHtcbiAgICAgIHJldHVybiBfc3RhdGUuZ2V0U3RhdGUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0U3RhdGUoc3RhdGUpIHtcbiAgICBpZiAoIV8uaXNFcXVhbChzdGF0ZSwgX3N0YXRlKSkge1xuICAgICAgX3N0YXRlLnNldFN0YXRlKHN0YXRlKTtcbiAgICAgIF90aGlzLm5vdGlmeVN1YnNjcmliZXJzKHt9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZXRSZWR1Y2VycyhyZWR1Y2VyQXJyYXkpIHtcbiAgICBfc3RhdGVSZWR1Y2VycyA9IHJlZHVjZXJBcnJheTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFJlZHVjZXIocmVkdWNlcikge1xuICAgIF9zdGF0ZVJlZHVjZXJzLnB1c2gocmVkdWNlcik7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEluaXRcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIFNldCB1cCBldmVudCBsaXN0ZW5lci9yZWNlaXZlclxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSgpIHtcbiAgICBpZiAoIXRoaXMuY3JlYXRlU3ViamVjdCkge1xuICAgICAgY29uc29sZS53YXJuKCdub3JpL3N0b3JlL01peGluUmVkdWNlclN0b3JlIG5lZWRzIG5vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdCB0byBub3RpZnknKTtcbiAgICB9XG5cbiAgICBfdGhpcyAgPSB0aGlzO1xuICAgIF9zdGF0ZSA9IHJlcXVpcmUoJy4vSW1tdXRhYmxlTWFwLmpzJykoKTtcblxuICAgIGlmICghX3N0YXRlUmVkdWNlcnMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUmVkdWNlclN0b3JlLCBtdXN0IHNldCBhIHJlZHVjZXIgYmVmb3JlIGluaXRpYWxpemF0aW9uJyk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGluaXRpYWwgc3RhdGUgZnJvbSBlbXB0eSBldmVudFxuICAgIGFwcGx5UmVkdWNlcnMoe30pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGx5IHRoZSBhY3Rpb24gb2JqZWN0IHRvIHRoZSByZWR1Y2VycyB0byBjaGFuZ2Ugc3RhdGVcbiAgICogYXJlIHNlbnQgdG8gYWxsIHJlZHVjZXJzIHRvIHVwZGF0ZSB0aGUgc3RhdGVcbiAgICogQHBhcmFtIGFjdGlvbk9iak9yQXJyeSBBcnJheSBvZiBhY3Rpb25zIG9yIGEgc2luZ2xlIGFjdGlvbiB0byByZWR1Y2UgZnJvbVxuICAgKi9cbiAgZnVuY3Rpb24gYXBwbHkoYWN0aW9uT2JqT3JBcnJ5KSB7XG4gICAgaWYgKGlzLmFycmF5KGFjdGlvbk9iak9yQXJyeSkpIHtcbiAgICAgIGFjdGlvbk9iak9yQXJyeS5mb3JFYWNoKGFjdGlvbk9iaiA9PiBhcHBseVJlZHVjZXJzKGFjdGlvbk9iaikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcHBseVJlZHVjZXJzKGFjdGlvbk9iak9yQXJyeSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmplY3QpIHtcbiAgICBsZXQgbmV4dFN0YXRlID0gYXBwbHlSZWR1Y2Vyc1RvU3RhdGUoZ2V0U3RhdGUoKSwgYWN0aW9uT2JqZWN0KTtcbiAgICBzZXRTdGF0ZShuZXh0U3RhdGUpO1xuICAgIF90aGlzLmhhbmRsZVN0YXRlTXV0YXRpb24oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBUEkgaG9vayB0byBoYW5kbGUgc3RhdGUgdXBkYXRlc1xuICAgKi9cbiAgZnVuY3Rpb24gaGFuZGxlU3RhdGVNdXRhdGlvbigpIHtcbiAgICAvLyBvdmVycmlkZSB0aGlzXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBzdGF0ZSBmcm9tIHRoZSBjb21iaW5lZCByZWR1Y2VzIGFuZCBhY3Rpb24gb2JqZWN0XG4gICAqIFN0b3JlIHN0YXRlIGlzbid0IG1vZGlmaWVkLCBjdXJyZW50IHN0YXRlIGlzIHBhc3NlZCBpbiBhbmQgbXV0YXRlZCBzdGF0ZSByZXR1cm5lZFxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICogQHBhcmFtIGFjdGlvblxuICAgKiBAcmV0dXJucyB7Knx7fX1cbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnNUb1N0YXRlKHN0YXRlLCBhY3Rpb24pIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIF9zdGF0ZVJlZHVjZXJzLmZvckVhY2gocmVkdWNlckZ1bmMgPT4gc3RhdGUgPSByZWR1Y2VyRnVuYyhzdGF0ZSwgYWN0aW9uKSk7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlbXBsYXRlIHJlZHVjZXIgZnVuY3Rpb25cbiAgICogU3RvcmUgc3RhdGUgaXNuJ3QgbW9kaWZpZWQsIGN1cnJlbnQgc3RhdGUgaXMgcGFzc2VkIGluIGFuZCBtdXRhdGVkIHN0YXRlIHJldHVybmVkXG5cbiAgIGZ1bmN0aW9uIHRlbXBsYXRlUmVkdWNlckZ1bmN0aW9uKHN0YXRlLCBldmVudCkge1xuICAgICAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcbiAgICAgICAgICBjYXNlIF9ub3JpQWN0aW9uQ29uc3RhbnRzLk1PREVMX0RBVEFfQ0hBTkdFRDpcbiAgICAgICAgICAgIC8vIGNhbiBjb21wb3NlIG90aGVyIHJlZHVjZXJzXG4gICAgICAgICAgICAvLyByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIG90aGVyU3RhdGVUcmFuc2Zvcm1lcihzdGF0ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCB7cHJvcDogZXZlbnQucGF5bG9hZC52YWx1ZX0pO1xuICAgICAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1JlZHVjZXIgc3RvcmUsIHVuaGFuZGxlZCBldmVudCB0eXBlOiAnK2V2ZW50LnR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAqL1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZTogaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSxcbiAgICBnZXRTdGF0ZSAgICAgICAgICAgICAgOiBnZXRTdGF0ZSxcbiAgICBzZXRTdGF0ZSAgICAgICAgICAgICAgOiBzZXRTdGF0ZSxcbiAgICBhcHBseSAgICAgICAgICAgICAgICAgOiBhcHBseSxcbiAgICBzZXRSZWR1Y2VycyAgICAgICAgICAgOiBzZXRSZWR1Y2VycyxcbiAgICBhZGRSZWR1Y2VyICAgICAgICAgICAgOiBhZGRSZWR1Y2VyLFxuICAgIGFwcGx5UmVkdWNlcnMgICAgICAgICA6IGFwcGx5UmVkdWNlcnMsXG4gICAgYXBwbHlSZWR1Y2Vyc1RvU3RhdGUgIDogYXBwbHlSZWR1Y2Vyc1RvU3RhdGUsXG4gICAgaGFuZGxlU3RhdGVNdXRhdGlvbiAgIDogaGFuZGxlU3RhdGVNdXRhdGlvblxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluUmVkdWNlclN0b3JlKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKlxuIE1hdHQgUGVya2lucywgNi8xMi8xNVxuXG4gcHVibGlzaCBwYXlsb2FkIG9iamVjdFxuXG4ge1xuIHR5cGU6IEVWVF9UWVBFLFxuIHBheWxvYWQ6IHtcbiBrZXk6IHZhbHVlXG4gfVxuIH1cblxuICovXG52YXIgRGlzcGF0Y2hlciA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX3N1YmplY3RNYXAgID0ge30sXG4gICAgICBfcmVjZWl2ZXJNYXAgPSB7fSxcbiAgICAgIF9pZCAgICAgICAgICA9IDAsXG4gICAgICBfbG9nICAgICAgICAgPSBbXSxcbiAgICAgIF9xdWV1ZSAgICAgICA9IFtdLFxuICAgICAgX3RpbWVyT2JzZXJ2YWJsZSxcbiAgICAgIF90aW1lclN1YnNjcmlwdGlvbixcbiAgICAgIF90aW1lclBhdXNhYmxlO1xuXG4gIC8qKlxuICAgKiBBZGQgYW4gZXZlbnQgYXMgb2JzZXJ2YWJsZVxuICAgKiBAcGFyYW0gZXZ0U3RyIEV2ZW50IG5hbWUgc3RyaW5nXG4gICAqIEBwYXJhbSBoYW5kbGVyIG9uTmV4dCgpIHN1YnNjcmlwdGlvbiBmdW5jdGlvblxuICAgKiBAcGFyYW0gb25jZU9yQ29udGV4dCBvcHRpb25hbCwgZWl0aGVyIHRoZSBjb250ZXh0IHRvIGV4ZWN1dGUgdGhlIGhhbmRlciBvciBvbmNlIGJvb2xcbiAgICogQHBhcmFtIG9uY2Ugd2lsbCBjb21wbGV0ZS9kaXNwb3NlIGFmdGVyIG9uZSBmaXJlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGV2dFN0ciwgaGFuZGxlciwgb25jZU9yQ29udGV4dCwgb25jZSkge1xuICAgIHZhciBoYW5kbGVyQ29udGV4dCA9IHdpbmRvdztcblxuICAgIC8vY29uc29sZS5sb2coJ2Rpc3BhdGNoZXIgc3Vic2NyaWJlJywgZXZ0U3RyLCBoYW5kbGVyLCBvbmNlT3JDb250ZXh0LCBvbmNlKTtcblxuICAgIGlmIChpcy5mYWxzZXkoZXZ0U3RyKSkge1xuICAgICAgY29uc29sZS53YXJuKCdEaXNwYXRjaGVyOiBGYXNsZXkgZXZlbnQgc3RyaW5nIHBhc3NlZCBmb3IgaGFuZGxlcicsIGhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmIChpcy5mYWxzZXkoaGFuZGxlcikpIHtcbiAgICAgIGNvbnNvbGUud2FybignRGlzcGF0Y2hlcjogRmFzbGV5IGhhbmRsZXIgcGFzc2VkIGZvciBldmVudCBzdHJpbmcnLCBldnRTdHIpO1xuICAgIH1cblxuICAgIGlmIChvbmNlT3JDb250ZXh0IHx8IG9uY2VPckNvbnRleHQgPT09IGZhbHNlKSB7XG4gICAgICBpZiAob25jZU9yQ29udGV4dCA9PT0gdHJ1ZSB8fCBvbmNlT3JDb250ZXh0ID09PSBmYWxzZSkge1xuICAgICAgICBvbmNlID0gb25jZU9yQ29udGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhhbmRsZXJDb250ZXh0ID0gb25jZU9yQ29udGV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIV9zdWJqZWN0TWFwW2V2dFN0cl0pIHtcbiAgICAgIF9zdWJqZWN0TWFwW2V2dFN0cl0gPSBbXTtcbiAgICB9XG5cbiAgICB2YXIgc3ViamVjdCA9IG5ldyBSeC5TdWJqZWN0KCk7XG5cbiAgICBfc3ViamVjdE1hcFtldnRTdHJdLnB1c2goe1xuICAgICAgb25jZSAgICA6IG9uY2UsXG4gICAgICBwcmlvcml0eTogMCxcbiAgICAgIGhhbmRsZXIgOiBoYW5kbGVyLFxuICAgICAgY29udGV4dCA6IGhhbmRsZXJDb250ZXh0LFxuICAgICAgc3ViamVjdCA6IHN1YmplY3QsXG4gICAgICB0eXBlICAgIDogMFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIuYmluZChoYW5kbGVyQ29udGV4dCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdGhlIGV2ZW50IHByb2Nlc3NpbmcgdGltZXIgb3IgcmVzdW1lIGEgcGF1c2VkIHRpbWVyXG4gICAqL1xuICBmdW5jdGlvbiBpbml0VGltZXIoKSB7XG4gICAgaWYgKF90aW1lck9ic2VydmFibGUpIHtcbiAgICAgIF90aW1lclBhdXNhYmxlLm9uTmV4dCh0cnVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfdGltZXJQYXVzYWJsZSAgICAgPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIF90aW1lck9ic2VydmFibGUgICA9IFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwoMSkucGF1c2FibGUoX3RpbWVyUGF1c2FibGUpO1xuICAgIF90aW1lclN1YnNjcmlwdGlvbiA9IF90aW1lck9ic2VydmFibGUuc3Vic2NyaWJlKHByb2Nlc3NOZXh0RXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNoaWZ0IG5leHQgZXZlbnQgdG8gaGFuZGxlIG9mZiBvZiB0aGUgcXVldWUgYW5kIGRpc3BhdGNoIGl0XG4gICAqL1xuICBmdW5jdGlvbiBwcm9jZXNzTmV4dEV2ZW50KCkge1xuICAgIHZhciBldnQgPSBfcXVldWUuc2hpZnQoKTtcbiAgICBpZiAoZXZ0KSB7XG4gICAgICBkaXNwYXRjaFRvUmVjZWl2ZXJzKGV2dCk7XG4gICAgICBkaXNwYXRjaFRvU3Vic2NyaWJlcnMoZXZ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX3RpbWVyUGF1c2FibGUub25OZXh0KGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHVzaCBldmVudCB0byB0aGUgc3RhY2sgYW5kIGJlZ2luIGV4ZWN1dGlvblxuICAgKiBAcGFyYW0gcGF5bG9hZE9iaiB0eXBlOlN0cmluZywgcGF5bG9hZDpkYXRhXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqL1xuICBmdW5jdGlvbiBwdWJsaXNoKHBheWxvYWRPYmopIHtcbiAgICBfbG9nLnB1c2gocGF5bG9hZE9iaik7XG4gICAgX3F1ZXVlLnB1c2gocGF5bG9hZE9iaik7XG5cbiAgICBpbml0VGltZXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIHRoZSBwYXlsb2FkIHRvIGFsbCByZWNlaXZlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIGRpc3BhdGNoVG9SZWNlaXZlcnMocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIF9yZWNlaXZlck1hcCkge1xuICAgICAgX3JlY2VpdmVyTWFwW2lkXS5oYW5kbGVyKHBheWxvYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVycyByZWNlaXZlIGFsbCBwYXlsb2FkcyBmb3IgYSBnaXZlbiBldmVudCB0eXBlIHdoaWxlIGhhbmRsZXJzIGFyZSB0YXJnZXRlZFxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2hUb1N1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBfc3ViamVjdE1hcFtwYXlsb2FkLnR5cGVdLCBpO1xuICAgIGlmICghc3Vic2NyaWJlcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdmFyIHN1YmpPYmogPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgIGlmIChzdWJqT2JqLnR5cGUgPT09IDApIHtcbiAgICAgICAgc3Viak9iai5zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJqT2JqLm9uY2UpIHtcbiAgICAgICAgdW5zdWJzY3JpYmUocGF5bG9hZC50eXBlLCBzdWJqT2JqLmhhbmRsZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBoYW5kbGVyXG4gICAqIEBwYXJhbSBldnRTdHJcbiAgICogQHBhcmFtIGhhbmRlclxuICAgKi9cbiAgZnVuY3Rpb24gdW5zdWJzY3JpYmUoZXZ0U3RyLCBoYW5kbGVyKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwW2V2dFN0cl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzdWJzY3JpYmVycyA9IF9zdWJqZWN0TWFwW2V2dFN0cl0sXG4gICAgICAgIGhhbmRsZXJJZHggID0gLTE7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc3Vic2NyaWJlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzdWJzY3JpYmVyc1tpXS5oYW5kbGVyID09PSBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJJZHggICAgID0gaTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0uc3ViamVjdC5vbkNvbXBsZXRlZCgpO1xuICAgICAgICBzdWJzY3JpYmVyc1tpXS5zdWJqZWN0LmRpc3Bvc2UoKTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0gPSBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYW5kbGVySWR4ID09PSAtMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN1YnNjcmliZXJzLnNwbGljZShoYW5kbGVySWR4LCAxKTtcblxuICAgIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlbGV0ZSBfc3ViamVjdE1hcFtldnRTdHJdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBsb2cgYXJyYXlcbiAgICogQHJldHVybnMge0FycmF5LjxUPn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldExvZygpIHtcbiAgICByZXR1cm4gX2xvZy5zbGljZSgwKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNpbXBsZSByZWNlaXZlciBpbXBsZW1lbnRhdGlvbiBiYXNlZCBvbiBGbHV4XG4gICAqIFJlZ2lzdGVyZWQgcmVjZWl2ZXJzIHdpbGwgZ2V0IGV2ZXJ5IHB1Ymxpc2hlZCBldmVudFxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svZmx1eC9ibG9iL21hc3Rlci9zcmMvRGlzcGF0Y2hlci5qc1xuICAgKlxuICAgKiBVc2FnZTpcbiAgICpcbiAgICogX2Rpc3BhdGNoZXIucmVnaXN0ZXJSZWNlaXZlcihmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgICAgICogICAgY29uc29sZS5sb2coJ3JlY2VpdmluZywgJyxwYXlsb2FkKTtcbiAgICAgICAqIH0pO1xuICAgKlxuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXJSZWNlaXZlcihoYW5kbGVyKSB7XG4gICAgdmFyIGlkICAgICAgICAgICA9ICdJRF8nICsgX2lkKys7XG4gICAgX3JlY2VpdmVyTWFwW2lkXSA9IHtcbiAgICAgIGlkICAgICA6IGlkLFxuICAgICAgaGFuZGxlcjogaGFuZGxlclxuICAgIH07XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cblxuICAvKipcbiAgICogUmVtb3ZlIGEgcmVjZWl2ZXIgaGFuZGxlclxuICAgKiBAcGFyYW0gaWRcbiAgICovXG4gIGZ1bmN0aW9uIHVucmVnaXN0ZXJSZWNlaXZlcihpZCkge1xuICAgIGlmIChfcmVjZWl2ZXJNYXAuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICBkZWxldGUgX3JlY2VpdmVyTWFwW2lkXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN1YnNjcmliZSAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIHVuc3Vic2NyaWJlICAgICAgIDogdW5zdWJzY3JpYmUsXG4gICAgcHVibGlzaCAgICAgICAgICAgOiBwdWJsaXNoLFxuICAgIGdldExvZyAgICAgICAgICAgIDogZ2V0TG9nLFxuICAgIHJlZ2lzdGVyUmVjZWl2ZXIgIDogcmVnaXN0ZXJSZWNlaXZlcixcbiAgICB1bnJlZ2lzdGVyUmVjZWl2ZXI6IHVucmVnaXN0ZXJSZWNlaXZlclxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXIoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWRkIFJ4SlMgU3ViamVjdCB0byBhIG1vZHVsZS5cbiAqXG4gKiBBZGQgb25lIHNpbXBsZSBvYnNlcnZhYmxlIHN1YmplY3Qgb3IgbW9yZSBjb21wbGV4IGFiaWxpdHkgdG8gY3JlYXRlIG90aGVycyBmb3JcbiAqIG1vcmUgY29tcGxleCBldmVudGluZyBuZWVkcy5cbiAqL1xubGV0IE1peGluT2JzZXJ2YWJsZVN1YmplY3QgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9zdWJqZWN0ICAgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9zdWJqZWN0TWFwID0ge307XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBzdWJqZWN0XG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3ViamVjdChuYW1lKSB7XG4gICAgaWYgKCFfc3ViamVjdE1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgX3N1YmplY3RNYXBbbmFtZV0gPSBuZXcgUnguU3ViamVjdCgpO1xuICAgIH1cbiAgICByZXR1cm4gX3N1YmplY3RNYXBbbmFtZV07XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIGhhbmRsZXIgdG8gdXBkYXRlcy4gSWYgdGhlIGhhbmRsZXIgaXMgYSBzdHJpbmcsIHRoZSBuZXcgc3ViamVjdFxuICAgKiB3aWxsIGJlIGNyZWF0ZWQuXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXJPck5hbWUsIG9wdEhhbmRsZXIpIHtcbiAgICBpZiAoaXMuc3RyaW5nKGhhbmRsZXJPck5hbWUpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3ViamVjdChoYW5kbGVyT3JOYW1lKS5zdWJzY3JpYmUob3B0SGFuZGxlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlck9yTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHVwZGF0ZWQgdG8gc3Vic2NyaWJlcnNcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVN1YnNjcmliZXJzKHBheWxvYWQpIHtcbiAgICBfc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBuYW1lZCBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gbmFtZVxuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnNPZihuYW1lLCBwYXlsb2FkKSB7XG4gICAgaWYgKF9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXS5vbk5leHQocGF5bG9hZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignTWl4aW5PYnNlcnZhYmxlU3ViamVjdCwgbm8gc3Vic2NyaWJlcnMgb2YgJyArIG5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIGNyZWF0ZVN1YmplY3QgICAgICA6IGNyZWF0ZVN1YmplY3QsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnMgIDogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgbm90aWZ5U3Vic2NyaWJlcnNPZjogbm90aWZ5U3Vic2NyaWJlcnNPZlxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluT2JzZXJ2YWJsZVN1YmplY3Q7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFV0aWxpdHkgdG8gaGFuZGxlIGFsbCB2aWV3IERPTSBhdHRhY2htZW50IHRhc2tzXG4gKi9cblxubGV0IFJlbmRlcmVyID0gZnVuY3Rpb24gKCkge1xuICBjb25zdCBfZG9tVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIHJlbmRlcih7dGFyZ2V0LCBodG1sLCBjYWxsYmFja30pIHtcbiAgICBsZXQgZG9tRWwsXG4gICAgICAgIG1vdW50UG9pbnQgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXQpO1xuXG4gICAgbW91bnRQb2ludC5pbm5lckhUTUwgPSAnJztcblxuICAgIGlmIChodG1sKSB7XG4gICAgICBkb21FbCA9IF9kb21VdGlscy5IVE1MU3RyVG9Ob2RlKGh0bWwpO1xuICAgICAgbW91bnRQb2ludC5hcHBlbmRDaGlsZChkb21FbCk7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhkb21FbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvbUVsO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByZW5kZXI6IHJlbmRlclxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlbmRlcmVyKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFNpbXBsZSByb3V0ZXJcbiAqIFN1cHBvcnRpbmcgSUU5IHNvIHVzaW5nIGhhc2hlcyBpbnN0ZWFkIG9mIHRoZSBoaXN0b3J5IEFQSSBmb3Igbm93XG4gKi9cblxubGV0IFJvdXRlciA9IGZ1bmN0aW9uICgpIHtcblxuICBsZXQgX3N1YmplY3QgID0gbmV3IFJ4LlN1YmplY3QoKSxcbiAgICAgIF9oYXNoQ2hhbmdlT2JzZXJ2YWJsZSxcbiAgICAgIF9vYmpVdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb3JlL09iamVjdFV0aWxzLmpzJyk7XG5cbiAgLyoqXG4gICAqIFNldCBldmVudCBoYW5kbGVyc1xuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcbiAgICBfaGFzaENoYW5nZU9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh3aW5kb3csICdoYXNoY2hhbmdlJykuc3Vic2NyaWJlKG5vdGlmeVN1YnNjcmliZXJzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzdWJzY3JpYmUgYSBoYW5kbGVyIHRvIHRoZSB1cmwgY2hhbmdlIGV2ZW50c1xuICAgKiBAcGFyYW0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb3RpZnkgb2YgYSBjaGFuZ2UgaW4gcm91dGVcbiAgICogQHBhcmFtIGZyb21BcHAgVHJ1ZSBpZiB0aGUgcm91dGUgd2FzIGNhdXNlZCBieSBhbiBhcHAgZXZlbnQgbm90IFVSTCBvciBoaXN0b3J5IGNoYW5nZVxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMoKSB7XG4gICAgbGV0IGV2ZW50UGF5bG9hZCA9IHtcbiAgICAgIHJvdXRlT2JqOiBnZXRDdXJyZW50Um91dGUoKSwgLy8geyByb3V0ZTosIGRhdGE6IH1cbiAgICAgIGZyYWdtZW50OiBnZXRVUkxGcmFnbWVudCgpXG4gICAgfTtcblxuICAgIF9zdWJqZWN0Lm9uTmV4dChldmVudFBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgcm91dGUgYW5kIHF1ZXJ5IHN0cmluZyBmcm9tIHRoZSBjdXJyZW50IFVSTCBmcmFnbWVudFxuICAgKiBAcmV0dXJucyB7e3JvdXRlOiBzdHJpbmcsIHF1ZXJ5OiB7fX19XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDdXJyZW50Um91dGUoKSB7XG4gICAgbGV0IGZyYWdtZW50ICAgID0gZ2V0VVJMRnJhZ21lbnQoKSxcbiAgICAgICAgcGFydHMgICAgICAgPSBmcmFnbWVudC5zcGxpdCgnPycpLFxuICAgICAgICByb3V0ZSAgICAgICA9ICcvJyArIHBhcnRzWzBdLFxuICAgICAgICBxdWVyeVN0ciAgICA9IGRlY29kZVVSSUNvbXBvbmVudChwYXJ0c1sxXSksXG4gICAgICAgIHF1ZXJ5U3RyT2JqID0gcGFyc2VRdWVyeVN0cihxdWVyeVN0cik7XG5cbiAgICBpZiAocXVlcnlTdHIgPT09ICc9dW5kZWZpbmVkJykge1xuICAgICAgcXVlcnlTdHJPYmogPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3JvdXRlOiByb3V0ZSwgZGF0YTogcXVlcnlTdHJPYmp9O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHF1ZXJ5IHN0cmluZyBpbnRvIGtleS92YWx1ZSBwYWlyc1xuICAgKiBAcGFyYW0gcXVlcnlTdHJcbiAgICogQHJldHVybnMge3t9fVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VRdWVyeVN0cihxdWVyeVN0cikge1xuICAgIGxldCBvYmogICA9IHt9LFxuICAgICAgICBwYXJ0cyA9IHF1ZXJ5U3RyLnNwbGl0KCcmJyk7XG5cbiAgICBwYXJ0cy5mb3JFYWNoKHBhaXJTdHIgPT4ge1xuICAgICAgbGV0IHBhaXJBcnIgICAgID0gcGFpclN0ci5zcGxpdCgnPScpO1xuICAgICAgb2JqW3BhaXJBcnJbMF1dID0gcGFpckFyclsxXTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQ29tYmluZXMgYSByb3V0ZSBhbmQgZGF0YSBvYmplY3QgaW50byBhIHByb3BlciBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcm91dGVcbiAgICogQHBhcmFtIGRhdGFPYmpcbiAgICovXG4gIGZ1bmN0aW9uIHNldChyb3V0ZSwgZGF0YU9iaikge1xuICAgIGxldCBwYXRoID0gcm91dGUsXG4gICAgICAgIGRhdGEgPSBbXTtcbiAgICBpZiAoIV9vYmpVdGlscy5pc051bGwoZGF0YU9iaikpIHtcbiAgICAgIHBhdGggKz0gXCI/XCI7XG4gICAgICBmb3IgKHZhciBwcm9wIGluIGRhdGFPYmopIHtcbiAgICAgICAgaWYgKHByb3AgIT09ICd1bmRlZmluZWQnICYmIGRhdGFPYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICBkYXRhLnB1c2gocHJvcCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChkYXRhT2JqW3Byb3BdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHBhdGggKz0gZGF0YS5qb2luKCcmJyk7XG4gICAgfVxuXG4gICAgdXBkYXRlVVJMRnJhZ21lbnQocGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBldmVyeXRoaW5nIGFmdGVyIHRoZSAnd2hhdGV2ZXIuaHRtbCMnIGluIHRoZSBVUkxcbiAgICogTGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyBhcmUgcmVtb3ZlZFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VVJMRnJhZ21lbnQoKSB7XG4gICAgbGV0IGZyYWdtZW50ID0gbG9jYXRpb24uaGFzaC5zbGljZSgxKTtcbiAgICByZXR1cm4gZnJhZ21lbnQudG9TdHJpbmcoKS5yZXBsYWNlKC9cXC8kLywgJycpLnJlcGxhY2UoL15cXC8vLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBVUkwgaGFzaCBmcmFnbWVudFxuICAgKiBAcGFyYW0gcGF0aFxuICAgKi9cbiAgZnVuY3Rpb24gdXBkYXRlVVJMRnJhZ21lbnQocGF0aCkge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICA6IGluaXRpYWxpemUsXG4gICAgc3Vic2NyaWJlICAgICAgICA6IHN1YnNjcmliZSxcbiAgICBub3RpZnlTdWJzY3JpYmVyczogbm90aWZ5U3Vic2NyaWJlcnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBzZXQgICAgICAgICAgICAgIDogc2V0XG4gIH07XG5cbn07XG5cbmxldCByID0gUm91dGVyKCk7XG5yLmluaXRpYWxpemUoKTtcblxubW9kdWxlLmV4cG9ydHMgPSByOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBSeEpTIEhlbHBlcnNcbiAqIEB0eXBlIHt7ZG9tOiBGdW5jdGlvbiwgZnJvbTogRnVuY3Rpb24sIGludGVydmFsOiBGdW5jdGlvbiwgZG9FdmVyeTogRnVuY3Rpb24sIGp1c3Q6IEZ1bmN0aW9uLCBlbXB0eTogRnVuY3Rpb259fVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBkb206IGZ1bmN0aW9uIChzZWxlY3RvciwgZXZlbnQpIHtcbiAgICBsZXQgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBpZiAoIWVsKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ25vcmkvdXRpbHMvUngsIGRvbSwgaW52YWxpZCBET00gc2VsZWN0b3I6ICcgKyBzZWxlY3Rvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChlbCwgZXZlbnQudHJpbSgpKTtcbiAgfSxcblxuICBmcm9tOiBmdW5jdGlvbiAoaXR0cikge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmZyb20oaXR0cik7XG4gIH0sXG5cbiAgaW50ZXJ2YWw6IGZ1bmN0aW9uIChtcykge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmludGVydmFsKG1zKTtcbiAgfSxcblxuICBkb0V2ZXJ5OiBmdW5jdGlvbiAobXMsIC4uLmFyZ3MpIHtcbiAgICBpZihpcy5mdW5jdGlvbihhcmdzWzBdKSkge1xuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnN1YnNjcmliZShhcmdzWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW50ZXJ2YWwobXMpLnRha2UoYXJnc1swXSkuc3Vic2NyaWJlKGFyZ3NbMV0pO1xuICB9LFxuXG4gIGp1c3Q6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmp1c3QodmFsdWUpO1xuICB9LFxuXG4gIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZW1wdHkoKTtcbiAgfVxuXG59OyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLypcbiBTaW1wbGUgd3JhcHBlciBmb3IgVW5kZXJzY29yZSAvIEhUTUwgdGVtcGxhdGVzXG4gTWF0dCBQZXJraW5zXG4gNC83LzE1XG4gKi9cbmxldCBUZW1wbGF0aW5nID0gZnVuY3Rpb24gKCkge1xuXG4gIGxldCBfdGVtcGxhdGVNYXAgICAgICAgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX3RlbXBsYXRlSFRNTENhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF90ZW1wbGF0ZUNhY2hlICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfRE9NVXRpbHMgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIGFkZFRlbXBsYXRlKGlkLCBodG1sKSB7XG4gICAgX3RlbXBsYXRlTWFwW2lkXSA9IGh0bWw7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTb3VyY2VGcm9tVGVtcGxhdGVNYXAoaWQpIHtcbiAgICBsZXQgc291cmNlID0gX3RlbXBsYXRlTWFwW2lkXTtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gY2xlYW5UZW1wbGF0ZUhUTUwoc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0U291cmNlRnJvbUhUTUwoaWQpIHtcbiAgICBsZXQgc3JjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpLFxuICAgICAgICBzcmNodG1sO1xuXG4gICAgaWYgKHNyYykge1xuICAgICAgc3JjaHRtbCA9IHNyYy5pbm5lckhUTUw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignbnVkb3J1L2NvcmUvVGVtcGxhdGluZywgdGVtcGxhdGUgbm90IGZvdW5kOiBcIicgKyBpZCArICdcIicpO1xuICAgICAgc3JjaHRtbCA9ICc8ZGl2PlRlbXBsYXRlIG5vdCBmb3VuZDogJyArIGlkICsgJzwvZGl2Pic7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFuVGVtcGxhdGVIVE1MKHNyY2h0bWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdGVtcGxhdGUgaHRtbCBmcm9tIHRoZSBzY3JpcHQgdGFnIHdpdGggaWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U291cmNlKGlkKSB7XG4gICAgaWYgKF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdO1xuICAgIH1cblxuICAgIGxldCBzb3VyY2VodG1sID0gZ2V0U291cmNlRnJvbVRlbXBsYXRlTWFwKGlkKTtcblxuICAgIGlmICghc291cmNlaHRtbCkge1xuICAgICAgc291cmNlaHRtbCA9IGdldFNvdXJjZUZyb21IVE1MKGlkKTtcbiAgICB9XG5cbiAgICBfdGVtcGxhdGVIVE1MQ2FjaGVbaWRdID0gc291cmNlaHRtbDtcbiAgICByZXR1cm4gc291cmNlaHRtbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCBJRHMgYmVsb25naW5nIHRvIHRleHQvdGVtcGxhdGUgdHlwZSBzY3JpcHQgdGFnc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRBbGxUZW1wbGF0ZUlEcygpIHtcbiAgICBsZXQgc2NyaXB0VGFncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgMCk7XG5cbiAgICByZXR1cm4gc2NyaXB0VGFncy5maWx0ZXIoZnVuY3Rpb24gKHRhZykge1xuICAgICAgcmV0dXJuIHRhZy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gJ3RleHQvdGVtcGxhdGUnO1xuICAgIH0pLm1hcChmdW5jdGlvbiAodGFnKSB7XG4gICAgICByZXR1cm4gdGFnLmdldEF0dHJpYnV0ZSgnaWQnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIHVuZGVyc2NvcmUgdGVtcGxhdGVcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VGVtcGxhdGUoaWQpIHtcbiAgICBpZiAoX3RlbXBsYXRlQ2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm4gX3RlbXBsYXRlQ2FjaGVbaWRdO1xuICAgIH1cbiAgICBsZXQgdGVtcGwgICAgICAgICAgPSBfLnRlbXBsYXRlKGdldFNvdXJjZShpZCkpO1xuICAgIF90ZW1wbGF0ZUNhY2hlW2lkXSA9IHRlbXBsO1xuICAgIHJldHVybiB0ZW1wbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIEhUTUxcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0hUTUwoaWQsIG9iaikge1xuICAgIGxldCB0ZW1wID0gZ2V0VGVtcGxhdGUoaWQpO1xuICAgIHJldHVybiB0ZW1wKG9iaik7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSB0ZW1wbGF0ZSBhbmQgcmV0dXJucyBhbiBIVE1MIEVsZW1lbnRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc0VsZW1lbnQoaWQsIG9iaikge1xuICAgIHJldHVybiBfRE9NVXRpbHMuSFRNTFN0clRvTm9kZShhc0hUTUwoaWQsIG9iaikpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFucyB0ZW1wbGF0ZSBIVE1MXG4gICAqL1xuICBmdW5jdGlvbiBjbGVhblRlbXBsYXRlSFRNTChzdHIpIHtcbiAgICByZXR1cm4gc3RyLnRyaW0oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgcmV0dXJucywgc3BhY2VzIGFuZCB0YWJzXG4gICAqIEBwYXJhbSBzdHJcbiAgICogQHJldHVybnMge1hNTHxzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVXaGl0ZVNwYWNlKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyfFxcdCkvZ20sICcnKS5yZXBsYWNlKC8+XFxzKzwvZywgJz48Jyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGFsbCB0ZW1wbGF0ZXMsIGNsZWFuIHRoZW0gdXAgYW5kIGxvZ1xuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogU28gdGhpcyBoZWxwcyBjcmVhdGUgdGhlIGJsb2NrcyBmb3IgaW5zZXJ0aW9uIGluIHRvIHRoZSBET01cbiAgICovXG4gIGZ1bmN0aW9uIHByb2Nlc3NGb3JET01JbnNlcnRpb24oKSB7XG4gICAgbGV0IGlkcyA9IGdldEFsbFRlbXBsYXRlSURzKCk7XG4gICAgaWRzLmZvckVhY2goaWQgPT4ge1xuICAgICAgdmFyIHNyYyA9IHJlbW92ZVdoaXRlU3BhY2UoZ2V0U291cmNlKGlkKSk7XG4gICAgICBjb25zb2xlLmxvZyhpZCwgc3JjKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSB0ZW1wbGF0ZSBzY3JpcHQgdGFnIHRvIHRoZSBET01cbiAgICogVXRpbCBmb3IgU2hhcmVQb2ludCBwcm9qZWN0cywgPHNjcmlwdD4gYmxvY2tzIGFyZW4ndCBhbGxvd2VkXG4gICAqIEBwYXJhbSBpZFxuICAgKiBAcGFyYW0gaHRtbFxuICAgKi9cbiAgLy9mdW5jdGlvbiBhZGRDbGllbnRTaWRlVGVtcGxhdGVUb0RPTShpZCwgaHRtbCkge1xuICAvLyAgdmFyIHMgICAgICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgLy8gIHMudHlwZSAgICAgID0gJ3RleHQvdGVtcGxhdGUnO1xuICAvLyAgcy5pZCAgICAgICAgPSBpZDtcbiAgLy8gIHMuaW5uZXJIVE1MID0gaHRtbDtcbiAgLy8gIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQocyk7XG4gIC8vfVxuXG4gIHJldHVybiB7XG4gICAgYWRkVGVtcGxhdGUgICAgICAgICAgIDogYWRkVGVtcGxhdGUsXG4gICAgZ2V0U291cmNlICAgICAgICAgICAgIDogZ2V0U291cmNlLFxuICAgIGdldEFsbFRlbXBsYXRlSURzICAgICA6IGdldEFsbFRlbXBsYXRlSURzLFxuICAgIHByb2Nlc3NGb3JET01JbnNlcnRpb246IHByb2Nlc3NGb3JET01JbnNlcnRpb24sXG4gICAgZ2V0VGVtcGxhdGUgICAgICAgICAgIDogZ2V0VGVtcGxhdGUsXG4gICAgYXNIVE1MICAgICAgICAgICAgICAgIDogYXNIVE1MLFxuICAgIGFzRWxlbWVudCAgICAgICAgICAgICA6IGFzRWxlbWVudFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRpbmcoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbmxldCBBcHBsaWNhdGlvblZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF90aGlzLFxuICAgICAgX3RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX2RvbVV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEluaXRpYWxpemF0aW9uXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplXG4gICAqIEBwYXJhbSBzY2FmZm9sZFRlbXBsYXRlcyB0ZW1wbGF0ZSBJRHMgdG8gYXR0YWNoZWQgdG8gdGhlIGJvZHkgZm9yIHRoZSBhcHBcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcoc2NhZmZvbGRUZW1wbGF0ZXMpIHtcbiAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBhdHRhY2hBcHBsaWNhdGlvblNjYWZmb2xkaW5nKHNjYWZmb2xkVGVtcGxhdGVzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRhY2ggYXBwIEhUTUwgc3RydWN0dXJlXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGF0dGFjaEFwcGxpY2F0aW9uU2NhZmZvbGRpbmcodGVtcGxhdGVzKSB7XG4gICAgaWYgKCF0ZW1wbGF0ZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgYm9keUVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYm9keScpO1xuXG4gICAgdGVtcGxhdGVzLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsKSB7XG4gICAgICBib2R5RWwuYXBwZW5kQ2hpbGQoX2RvbVV0aWxzLkhUTUxTdHJUb05vZGUoX3RlbXBsYXRlLmdldFNvdXJjZSh0ZW1wbCwge30pKSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWZ0ZXIgYXBwIGluaXRpYWxpemF0aW9uLCByZW1vdmUgdGhlIGxvYWRpbmcgbWVzc2FnZVxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlTG9hZGluZ01lc3NhZ2UoKSB7XG4gICAgbGV0IGNvdmVyICAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaW5pdGlhbGl6YXRpb25fX2NvdmVyJyksXG4gICAgICAgIG1lc3NhZ2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaW5pdGlhbGl6YXRpb25fX21lc3NhZ2UnKTtcblxuICAgIFR3ZWVuTGl0ZS50byhjb3ZlciwgMSwge1xuICAgICAgYWxwaGE6IDAsIGVhc2U6IFF1YWQuZWFzZU91dCwgb25Db21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb3Zlci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNvdmVyKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIFR3ZWVuTGl0ZS50byhtZXNzYWdlLCAyLCB7XG4gICAgICB0b3A6IFwiKz01MHB4XCIsIGVhc2U6IFF1YWQuZWFzZUluLCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdmVyLnJlbW92ZUNoaWxkKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplQXBwbGljYXRpb25WaWV3OiBpbml0aWFsaXplQXBwbGljYXRpb25WaWV3LFxuICAgIHJlbW92ZUxvYWRpbmdNZXNzYWdlICAgICA6IHJlbW92ZUxvYWRpbmdNZXNzYWdlXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwbGljYXRpb25WaWV3KCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIE1peGluIHZpZXcgdGhhdCBhbGxvd3MgZm9yIGNvbXBvbmVudCB2aWV3c1xuICovXG5cbmxldCBNaXhpbkNvbXBvbmVudFZpZXdzID0gZnVuY3Rpb24gKCkge1xuXG4gIGxldCBfY29tcG9uZW50Vmlld01hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgLyoqXG4gICAqIE1hcCBhIGNvbXBvbmVudCB0byBhIG1vdW50aW5nIHBvaW50LiBJZiBhIHN0cmluZyBpcyBwYXNzZWQsXG4gICAqIHRoZSBjb3JyZWN0IG9iamVjdCB3aWxsIGJlIGNyZWF0ZWQgZnJvbSB0aGUgZmFjdG9yeSBtZXRob2QsIG90aGVyd2lzZSxcbiAgICogdGhlIHBhc3NlZCBjb21wb25lbnQgb2JqZWN0IGlzIHVzZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRFxuICAgKiBAcGFyYW0gY29tcG9uZW50SURvck9ialxuICAgKiBAcGFyYW0gbW91bnRQb2ludFxuICAgKi9cbiAgZnVuY3Rpb24gbWFwVmlld0NvbXBvbmVudChjb21wb25lbnRJRCwgY29tcG9uZW50SURvck9iaiwgbW91bnRQb2ludCkge1xuICAgIGxldCBjb21wb25lbnRPYmo7XG5cbiAgICBpZiAodHlwZW9mIGNvbXBvbmVudElEb3JPYmogPT09ICdzdHJpbmcnKSB7XG4gICAgICBsZXQgY29tcG9uZW50RmFjdG9yeSA9IHJlcXVpcmUoY29tcG9uZW50SURvck9iaik7XG4gICAgICBjb21wb25lbnRPYmogICAgICAgICA9IGNyZWF0ZUNvbXBvbmVudFZpZXcoY29tcG9uZW50RmFjdG9yeSgpKSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRPYmogPSBjb21wb25lbnRJRG9yT2JqO1xuICAgIH1cblxuICAgIF9jb21wb25lbnRWaWV3TWFwW2NvbXBvbmVudElEXSA9IHtcbiAgICAgIGNvbnRyb2xsZXI6IGNvbXBvbmVudE9iaixcbiAgICAgIG1vdW50UG9pbnQ6IG1vdW50UG9pbnRcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEZhY3RvcnkgdG8gY3JlYXRlIGNvbXBvbmVudCB2aWV3IG1vZHVsZXMgYnkgY29uY2F0aW5nIG11bHRpcGxlIHNvdXJjZSBvYmplY3RzXG4gICAqIEBwYXJhbSBjb21wb25lbnRTb3VyY2UgQ3VzdG9tIG1vZHVsZSBzb3VyY2VcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVDb21wb25lbnRWaWV3KGNvbXBvbmVudFNvdXJjZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudFZpZXdGYWN0b3J5ICA9IHJlcXVpcmUoJy4vVmlld0NvbXBvbmVudC5qcycpLFxuICAgICAgICAgICAgZXZlbnREZWxlZ2F0b3JGYWN0b3J5ID0gcmVxdWlyZSgnLi9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzJyksXG4gICAgICAgICAgICBvYnNlcnZhYmxlRmFjdG9yeSAgICAgPSByZXF1aXJlKCcuLi91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyksXG4gICAgICAgICAgICBzdGF0ZU9iakZhY3RvcnkgICAgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9JbW11dGFibGVNYXAuanMnKTtcblxuICAgICAgbGV0IGNvbXBvbmVudEFzc2VtYmx5LCBmaW5hbENvbXBvbmVudCwgcHJldmlvdXNJbml0aWFsaXplO1xuXG4gICAgICBjb21wb25lbnRBc3NlbWJseSA9IFtcbiAgICAgICAgY29tcG9uZW50Vmlld0ZhY3RvcnkoKSxcbiAgICAgICAgZXZlbnREZWxlZ2F0b3JGYWN0b3J5KCksXG4gICAgICAgIG9ic2VydmFibGVGYWN0b3J5KCksXG4gICAgICAgIHN0YXRlT2JqRmFjdG9yeSgpLFxuICAgICAgICBjb21wb25lbnRTb3VyY2VcbiAgICAgIF07XG5cbiAgICAgIGlmIChjb21wb25lbnRTb3VyY2UubWl4aW5zKSB7XG4gICAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gY29tcG9uZW50QXNzZW1ibHkuY29uY2F0KGNvbXBvbmVudFNvdXJjZS5taXhpbnMpO1xuICAgICAgfVxuXG4gICAgICBmaW5hbENvbXBvbmVudCA9IE5vcmkuYXNzaWduQXJyYXkoe30sIGNvbXBvbmVudEFzc2VtYmx5KTtcblxuICAgICAgLy8gQ29tcG9zZSBhIG5ldyBpbml0aWFsaXplIGZ1bmN0aW9uIGJ5IGluc2VydGluZyBjYWxsIHRvIGNvbXBvbmVudCBzdXBlciBtb2R1bGVcbiAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZSAgICAgICAgPSBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplO1xuICAgICAgZmluYWxDb21wb25lbnQuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIGluaXRpYWxpemUoaW5pdE9iaikge1xuICAgICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplQ29tcG9uZW50KGluaXRPYmopO1xuICAgICAgICBwcmV2aW91c0luaXRpYWxpemUuY2FsbChmaW5hbENvbXBvbmVudCwgaW5pdE9iaik7XG4gICAgICB9O1xuXG4gICAgICBpZiAoY29uZmlnUHJvcHMpIHtcbiAgICAgICAgZmluYWxDb21wb25lbnQuY29uZmlndXJhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gY29uZmlnUHJvcHM7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgZmluYWxDb21wb25lbnQpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIG1hcHBlZCBjb21wb25lbnRWaWV3XG4gICAqIEBwYXJhbSBjb21wb25lbnRJRFxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2hvd1ZpZXdDb21wb25lbnQoY29tcG9uZW50SUQsIG1vdW50UG9pbnQpIHtcbiAgICBsZXQgY29tcG9uZW50VmlldyA9IF9jb21wb25lbnRWaWV3TWFwW2NvbXBvbmVudElEXTtcbiAgICBpZiAoIWNvbXBvbmVudFZpZXcpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gY29tcG9uZW50VmlldyBtYXBwZWQgZm9yIGlkOiAnICsgY29tcG9uZW50SUQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmlzSW5pdGlhbGl6ZWQoKSkge1xuICAgICAgbW91bnRQb2ludCA9IG1vdW50UG9pbnQgfHwgY29tcG9uZW50Vmlldy5tb3VudFBvaW50O1xuICAgICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmluaXRpYWxpemUoe1xuICAgICAgICBpZCAgICAgICAgOiBjb21wb25lbnRJRCxcbiAgICAgICAgdGVtcGxhdGUgIDogY29tcG9uZW50Vmlldy5odG1sVGVtcGxhdGUsXG4gICAgICAgIG1vdW50UG9pbnQ6IG1vdW50UG9pbnRcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLmNvbXBvbmVudFJlbmRlcigpO1xuICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci5tb3VudCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtYXAgb2JqZWN0IGZvciBjb21wb25lbnQgdmlld3NcbiAgICogQHJldHVybnMge251bGx9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb21wb25lbnRWaWV3TWFwKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2NvbXBvbmVudFZpZXdNYXApO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBUElcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmV0dXJuIHtcbiAgICBtYXBWaWV3Q29tcG9uZW50ICAgOiBtYXBWaWV3Q29tcG9uZW50LFxuICAgIGNyZWF0ZUNvbXBvbmVudFZpZXc6IGNyZWF0ZUNvbXBvbmVudFZpZXcsXG4gICAgc2hvd1ZpZXdDb21wb25lbnQgIDogc2hvd1ZpZXdDb21wb25lbnQsXG4gICAgZ2V0Q29tcG9uZW50Vmlld01hcDogZ2V0Q29tcG9uZW50Vmlld01hcFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluQ29tcG9uZW50Vmlld3MoKTsiLCJsZXQgTWl4aW5ET01NYW5pcHVsYXRpb24gPSBmdW5jdGlvbiAoKSB7XG5cbiAgZnVuY3Rpb24gaGlkZUVsKHNlbGVjdG9yKSB7XG4gICAgVHdlZW5MaXRlLnNldChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSwge1xuICAgICAgYWxwaGEgIDogMCxcbiAgICAgIGRpc3BsYXk6ICdub25lJ1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvd0VsKHNlbGVjdG9yKSB7XG4gICAgVHdlZW5MaXRlLnNldChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSwge1xuICAgICAgYWxwaGEgIDogMSxcbiAgICAgIGRpc3BsYXk6ICdibG9jaydcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2hvd0VsOiBzaG93RWwsXG4gICAgaGlkZUVsOiBoaWRlRWxcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkRPTU1hbmlwdWxhdGlvbigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBDb252ZW5pZW5jZSBtaXhpbiB0aGF0IG1ha2VzIGV2ZW50cyBlYXNpZXIgZm9yIHZpZXdzXG4gKlxuICogQmFzZWQgb24gQmFja2JvbmVcbiAqIFJldmlldyB0aGlzIGh0dHA6Ly9ibG9nLm1hcmlvbmV0dGVqcy5jb20vMjAxNS8wMi8xMi91bmRlcnN0YW5kaW5nLXRoZS1ldmVudC1oYXNoL2luZGV4Lmh0bWxcbiAqXG4gKiBFeGFtcGxlOlxuICogdGhpcy5zZXRFdmVudHMoe1xuICogICAgICAgICdjbGljayAjYnRuX21haW5fcHJvamVjdHMnOiBoYW5kbGVQcm9qZWN0c0J1dHRvbixcbiAqICAgICAgICAnY2xpY2sgI2J0bl9mb28sIGNsaWNrICNidG5fYmFyJzogaGFuZGxlRm9vQmFyQnV0dG9uc1xuICogICAgICB9KTtcbiAqIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAqXG4gKi9cblxubGV0IE1peGluRXZlbnREZWxlZ2F0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9ldmVudHNNYXAsXG4gICAgICBfZXZlbnRTdWJzY3JpYmVycztcblxuICBjb25zdCBfcnggICAgICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9SeCcpLFxuICAgICAgICBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpO1xuXG4gIGZ1bmN0aW9uIHNldEV2ZW50cyhldnRPYmopIHtcbiAgICBfZXZlbnRzTWFwID0gZXZ0T2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RXZlbnRzKCkge1xuICAgIHJldHVybiBfZXZlbnRzTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIEF1dG9tYXRlcyBzZXR0aW5nIGV2ZW50cyBvbiBET00gZWxlbWVudHMuXG4gICAqICdldnRTdHIgc2VsZWN0b3InOmNhbGxiYWNrXG4gICAqICdldnRTdHIgc2VsZWN0b3IsIGV2dFN0ciBzZWxlY3Rvcic6IHNoYXJlZENhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBkZWxlZ2F0ZUV2ZW50cyhhdXRvRm9ybSkge1xuICAgIGlmICghX2V2ZW50c01hcCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIF9ldmVudFN1YnNjcmliZXJzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAodmFyIGV2dFN0cmluZ3MgaW4gX2V2ZW50c01hcCkge1xuICAgICAgaWYgKF9ldmVudHNNYXAuaGFzT3duUHJvcGVydHkoZXZ0U3RyaW5ncykpIHtcblxuICAgICAgICBsZXQgbWFwcGluZ3MgICAgID0gZXZ0U3RyaW5ncy5zcGxpdCgnLCcpLFxuICAgICAgICAgICAgZXZlbnRIYW5kbGVyID0gX2V2ZW50c01hcFtldnRTdHJpbmdzXTtcblxuICAgICAgICBpZiAoIWlzLmZ1bmN0aW9uKGV2ZW50SGFuZGxlcikpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0V2ZW50RGVsZWdhdG9yLCBoYW5kbGVyIGZvciAnICsgZXZ0U3RyaW5ncyArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgICAgLy8gaHR0cHM6Ly9qc2xpbnRlcnJvcnMuY29tL2RvbnQtbWFrZS1mdW5jdGlvbnMtd2l0aGluLWEtbG9vcFxuICAgICAgICBtYXBwaW5ncy5mb3JFYWNoKGV2dE1hcCA9PiB7XG4gICAgICAgICAgZXZ0TWFwID0gZXZ0TWFwLnRyaW0oKTtcblxuICAgICAgICAgIGxldCBldmVudFN0ciA9IGV2dE1hcC5zcGxpdCgnICcpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgICAgc2VsZWN0b3IgPSBldnRNYXAuc3BsaXQoJyAnKVsxXS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoX2Jyb3dzZXJJbmZvLm1vYmlsZS5hbnkoKSkge1xuICAgICAgICAgICAgZXZlbnRTdHIgPSBjb252ZXJ0TW91c2VUb1RvdWNoRXZlbnRTdHIoZXZlbnRTdHIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF9ldmVudFN1YnNjcmliZXJzW2V2dFN0cmluZ3NdID0gY3JlYXRlSGFuZGxlcihzZWxlY3RvciwgZXZlbnRTdHIsIGV2ZW50SGFuZGxlciwgYXV0b0Zvcm0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLyoganNoaW50ICtXMDgzICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBjb21tb24gbW91c2UgZXZlbnRzIHRvIHRvdWNoIGVxdWl2YWxlbnRzXG4gICAqIEBwYXJhbSBldmVudFN0clxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbnZlcnRNb3VzZVRvVG91Y2hFdmVudFN0cihldmVudFN0cikge1xuICAgIHN3aXRjaCAoZXZlbnRTdHIpIHtcbiAgICAgIGNhc2UoJ2NsaWNrJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vkb3duJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hzdGFydCc7XG4gICAgICBjYXNlKCdtb3VzZXVwJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vtb3ZlJyk6XG4gICAgICAgIHJldHVybiAndG91Y2htb3ZlJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBldmVudFN0cjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyLCBhdXRvRm9ybSkge1xuICAgIGxldCBvYnNlcnZhYmxlID0gX3J4LmRvbShzZWxlY3RvciwgZXZlbnRTdHIpLFxuICAgICAgICBlbCAgICAgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvciksXG4gICAgICAgIHRhZyAgICAgICAgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIHR5cGUgICAgICAgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcblxuICAgIGlmIChhdXRvRm9ybSkge1xuICAgICAgaWYgKHRhZyA9PT0gJ2lucHV0JyB8fCB0YWcgPT09ICd0ZXh0YXJlYScpIHtcbiAgICAgICAgaWYgKCF0eXBlIHx8IHR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2JsdXInIHx8IGV2ZW50U3RyID09PSAnZm9jdXMnKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZS5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnRTdHIgPT09ICdrZXl1cCcgfHwgZXZlbnRTdHIgPT09ICdrZXlkb3duJykge1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmFibGUudGhyb3R0bGUoMTAwKS5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAncmFkaW8nIHx8IHR5cGUgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICBpZiAoZXZlbnRTdHIgPT09ICdjbGljaycpIHtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZhYmxlLm1hcChldnQgPT4gZXZ0LnRhcmdldC5jaGVja2VkKS5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGFnID09PSAnc2VsZWN0Jykge1xuICAgICAgICBpZiAoZXZlbnRTdHIgPT09ICdjaGFuZ2UnKSB7XG4gICAgICAgICAgcmV0dXJuIG9ic2VydmFibGUubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKS5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYnNlcnZhYmxlLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFubHkgcmVtb3ZlIGV2ZW50c1xuICAgKi9cbiAgZnVuY3Rpb24gdW5kZWxlZ2F0ZUV2ZW50cygpIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBldmVudCBpbiBfZXZlbnRTdWJzY3JpYmVycykge1xuICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZlbnRdLmRpc3Bvc2UoKTtcbiAgICAgIGRlbGV0ZSBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF07XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRFdmVudHMgICAgICAgOiBzZXRFdmVudHMsXG4gICAgZ2V0RXZlbnRzICAgICAgIDogZ2V0RXZlbnRzLFxuICAgIHVuZGVsZWdhdGVFdmVudHM6IHVuZGVsZWdhdGVFdmVudHMsXG4gICAgZGVsZWdhdGVFdmVudHMgIDogZGVsZWdhdGVFdmVudHNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkV2ZW50RGVsZWdhdG9yOyIsIi8qIEBmbG93IHdlYWsgKi9cblxubGV0IE1peGluTnVkb3J1Q29udHJvbHMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgY29uc3QgX25vdGlmaWNhdGlvblZpZXcgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvVG9hc3RWaWV3LmpzJyksXG4gICAgICAgIF90b29sVGlwVmlldyAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzJyksXG4gICAgICAgIF9tZXNzYWdlQm94VmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzJyksXG4gICAgICAgIF9tZXNzYWdlQm94Q3JlYXRvciA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hDcmVhdG9yLmpzJyksXG4gICAgICAgIF9tb2RhbENvdmVyVmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01vZGFsQ292ZXJWaWV3LmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzKCkge1xuICAgIF90b29sVGlwVmlldy5pbml0aWFsaXplKCd0b29sdGlwX19jb250YWluZXInKTtcbiAgICBfbm90aWZpY2F0aW9uVmlldy5pbml0aWFsaXplKCd0b2FzdF9fY29udGFpbmVyJyk7XG4gICAgX21lc3NhZ2VCb3hWaWV3LmluaXRpYWxpemUoJ21lc3NhZ2Vib3hfX2NvbnRhaW5lcicpO1xuICAgIF9tb2RhbENvdmVyVmlldy5pbml0aWFsaXplKCk7XG4gIH1cblxuICBmdW5jdGlvbiBtYkNyZWF0b3IoKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Q3JlYXRvcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZE1lc3NhZ2VCb3gob2JqKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZU1lc3NhZ2VCb3goaWQpIHtcbiAgICBfbWVzc2FnZUJveFZpZXcucmVtb3ZlKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFsZXJ0KG1lc3NhZ2UsIHRpdGxlKSB7XG4gICAgcmV0dXJuIG1iQ3JlYXRvcigpLmFsZXJ0KHRpdGxlIHx8ICdBbGVydCcsIG1lc3NhZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTm90aWZpY2F0aW9uKG9iaikge1xuICAgIHJldHVybiBfbm90aWZpY2F0aW9uVmlldy5hZGQob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeShtZXNzYWdlLCB0aXRsZSwgdHlwZSkge1xuICAgIHJldHVybiBhZGROb3RpZmljYXRpb24oe1xuICAgICAgdGl0bGUgIDogdGl0bGUgfHwgJycsXG4gICAgICB0eXBlICAgOiB0eXBlIHx8IF9ub3RpZmljYXRpb25WaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplTnVkb3J1Q29udHJvbHM6IGluaXRpYWxpemVOdWRvcnVDb250cm9scyxcbiAgICBtYkNyZWF0b3IgICAgICAgICAgICAgICA6IG1iQ3JlYXRvcixcbiAgICBhZGRNZXNzYWdlQm94ICAgICAgICAgICA6IGFkZE1lc3NhZ2VCb3gsXG4gICAgcmVtb3ZlTWVzc2FnZUJveCAgICAgICAgOiByZW1vdmVNZXNzYWdlQm94LFxuICAgIGFkZE5vdGlmaWNhdGlvbiAgICAgICAgIDogYWRkTm90aWZpY2F0aW9uLFxuICAgIGFsZXJ0ICAgICAgICAgICAgICAgICAgIDogYWxlcnQsXG4gICAgbm90aWZ5ICAgICAgICAgICAgICAgICAgOiBub3RpZnlcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbk51ZG9ydUNvbnRyb2xzKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIE1peGluIHZpZXcgdGhhdCBhbGxvd3MgZm9yIGNvbXBvbmVudCB2aWV3cyB0byBiZSBkaXNwbGF5IG9uIHN0b3JlIHN0YXRlIGNoYW5nZXNcbiAqL1xuXG5sZXQgTWl4aW5TdG9yZVN0YXRlVmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF90aGlzLFxuICAgICAgX3dhdGNoZWRTdG9yZSxcbiAgICAgIF9jdXJyZW50Vmlld0lELFxuICAgICAgX2N1cnJlbnRTdG9yZVN0YXRlLFxuICAgICAgX3N0YXRlVmlld01vdW50UG9pbnQsXG4gICAgICBfc3RhdGVWaWV3SURNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgbGlzdGVuZXJzXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplU3RhdGVWaWV3cyhzdG9yZSkge1xuICAgIF90aGlzID0gdGhpczsgLy8gbWl0aWdhdGlvbiwgRHVlIHRvIGV2ZW50cywgc2NvcGUgbWF5IGJlIHNldCB0byB0aGUgd2luZG93IG9iamVjdFxuICAgIF93YXRjaGVkU3RvcmUgPSBzdG9yZTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndmlld0NoYW5nZScpO1xuXG4gICAgX3dhdGNoZWRTdG9yZS5zdWJzY3JpYmUoZnVuY3Rpb24gb25TdGF0ZUNoYW5nZSgpIHtcbiAgICAgIGhhbmRsZVN0YXRlQ2hhbmdlKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2hvdyByb3V0ZSBmcm9tIFVSTCBoYXNoIG9uIGNoYW5nZVxuICAgKiBAcGFyYW0gcm91dGVPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlQ2hhbmdlKCkge1xuICAgIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUoKSB7XG4gICAgbGV0IHN0YXRlID0gX3dhdGNoZWRTdG9yZS5nZXRTdGF0ZSgpLmN1cnJlbnRTdGF0ZTtcbiAgICBpZiAoc3RhdGUpIHtcbiAgICAgIGlmIChzdGF0ZSAhPT0gX2N1cnJlbnRTdG9yZVN0YXRlKSB7XG4gICAgICAgIF9jdXJyZW50U3RvcmVTdGF0ZSA9IHN0YXRlO1xuICAgICAgICBzaG93U3RhdGVWaWV3Q29tcG9uZW50LmJpbmQoX3RoaXMpKF9jdXJyZW50U3RvcmVTdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgbG9jYXRpb24gZm9yIHRoZSB2aWV3IHRvIG1vdW50IG9uIHJvdXRlIGNoYW5nZXMsIGFueSBjb250ZW50cyB3aWxsXG4gICAqIGJlIHJlbW92ZWQgcHJpb3JcbiAgICogQHBhcmFtIGVsSURcbiAgICovXG4gIGZ1bmN0aW9uIHNldFZpZXdNb3VudFBvaW50KGVsSUQpIHtcbiAgICBfc3RhdGVWaWV3TW91bnRQb2ludCA9IGVsSUQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRWaWV3TW91bnRQb2ludCgpIHtcbiAgICByZXR1cm4gX3N0YXRlVmlld01vdW50UG9pbnQ7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGEgcm91dGUgdG8gYSBtb2R1bGUgdmlldyBjb250cm9sbGVyXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUlEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqL1xuICBmdW5jdGlvbiBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudChzdGF0ZSwgdGVtcGxhdGVJRCwgY29tcG9uZW50SURvck9iaikge1xuICAgIF9zdGF0ZVZpZXdJRE1hcFtzdGF0ZV0gPSB0ZW1wbGF0ZUlEO1xuICAgIHRoaXMubWFwVmlld0NvbXBvbmVudCh0ZW1wbGF0ZUlELCBjb21wb25lbnRJRG9yT2JqLCBfc3RhdGVWaWV3TW91bnRQb2ludCk7XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIHZpZXcgKGluIHJlc3BvbnNlIHRvIGEgcm91dGUgY2hhbmdlKVxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICovXG4gIGZ1bmN0aW9uIHNob3dTdGF0ZVZpZXdDb21wb25lbnQoc3RhdGUpIHtcbiAgICBsZXQgY29tcG9uZW50SUQgPSBfc3RhdGVWaWV3SURNYXBbc3RhdGVdO1xuICAgIGlmICghY29tcG9uZW50SUQpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIk5vIHZpZXcgbWFwcGVkIGZvciByb3V0ZTogXCIgKyBzdGF0ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmVtb3ZlQ3VycmVudFZpZXcoKTtcblxuICAgIF9jdXJyZW50Vmlld0lEID0gY29tcG9uZW50SUQ7XG4gICAgdGhpcy5zaG93Vmlld0NvbXBvbmVudChfY3VycmVudFZpZXdJRCk7XG5cbiAgICAvLyBUcmFuc2l0aW9uIG5ldyB2aWV3IGluXG4gICAgVHdlZW5MaXRlLnNldChfc3RhdGVWaWV3TW91bnRQb2ludCwge2FscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9zdGF0ZVZpZXdNb3VudFBvaW50LCAwLjI1LCB7YWxwaGE6IDEsIGVhc2U6IFF1YWQuZWFzZUlufSk7XG5cbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3ZpZXdDaGFuZ2UnLCBjb21wb25lbnRJRCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBjdXJyZW50bHkgZGlzcGxheWVkIHZpZXdcbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZUN1cnJlbnRWaWV3KCkge1xuICAgIGlmIChfY3VycmVudFZpZXdJRCkge1xuICAgICAgX3RoaXMuZ2V0Q29tcG9uZW50Vmlld01hcCgpW19jdXJyZW50Vmlld0lEXS5jb250cm9sbGVyLnVubW91bnQoKTtcbiAgICB9XG4gICAgX2N1cnJlbnRWaWV3SUQgPSAnJztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVN0YXRlVmlld3MgICAgICAgIDogaW5pdGlhbGl6ZVN0YXRlVmlld3MsXG4gICAgc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZTogc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSxcbiAgICBzaG93U3RhdGVWaWV3Q29tcG9uZW50ICAgICAgOiBzaG93U3RhdGVWaWV3Q29tcG9uZW50LFxuICAgIHNldFZpZXdNb3VudFBvaW50ICAgICAgICAgICA6IHNldFZpZXdNb3VudFBvaW50LFxuICAgIGdldFZpZXdNb3VudFBvaW50ICAgICAgICAgICA6IGdldFZpZXdNb3VudFBvaW50LFxuICAgIG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50ICAgICA6IG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5TdG9yZVN0YXRlVmlld3MoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQmFzZSBtb2R1bGUgZm9yIGNvbXBvbmVudHNcbiAqIE11c3QgYmUgZXh0ZW5kZWQgd2l0aCBjdXN0b20gbW9kdWxlc1xuICovXG5cbmNvbnN0IF90ZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3V0aWxzL1RlbXBsYXRpbmcuanMnKTtcblxudmFyIFZpZXdDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9pc0luaXRpYWxpemVkID0gZmFsc2UsXG4gICAgICBfY29uZmlnUHJvcHMsXG4gICAgICBfaWQsXG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSxcbiAgICAgIF9odG1sLFxuICAgICAgX0RPTUVsZW1lbnQsXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF9yZWdpb25zICAgICAgID0ge30sXG4gICAgICBfaXNNb3VudGVkICAgICA9IGZhbHNlLFxuICAgICAgX3JlbmRlcmVyICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9SZW5kZXJlcicpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXphdGlvblxuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVDb21wb25lbnQoY29uZmlnUHJvcHMpIHtcbiAgICBfY29uZmlnUHJvcHMgPSB0aGlzLmNvbmZpZ3VyYXRpb24oKSB8fCBjb25maWdQcm9wcztcbiAgICBfaWQgICAgICAgICAgPSBfY29uZmlnUHJvcHMuaWQ7XG4gICAgX21vdW50UG9pbnQgID0gX2NvbmZpZ1Byb3BzLm1vdW50UG9pbnQ7XG5cbiAgICB0aGlzLnNldFN0YXRlKHRoaXMuZ2V0SW5pdGlhbFN0YXRlKCkpO1xuICAgIHRoaXMuc2V0RXZlbnRzKHRoaXMuZGVmaW5lRXZlbnRzKCkpO1xuXG4gICAgX3JlZ2lvbnMgPSB0aGlzLmRlZmluZVJlZ2lvbnMoKTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndXBkYXRlJyk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdtb3VudCcpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndW5tb3VudCcpO1xuXG4gICAgdGhpcy5pbml0aWFsaXplUmVnaW9ucygpO1xuXG4gICAgX2lzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJhdGlvbigpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVmaW5lRXZlbnRzKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQmluZCB1cGRhdGVzIHRvIHRoZSBtYXAgSUQgdG8gdGhpcyB2aWV3J3MgdXBkYXRlXG4gICAqIEBwYXJhbSBtYXBPYmogT2JqZWN0IHRvIHN1YnNjcmliZSB0byBvciBJRC4gU2hvdWxkIGltcGxlbWVudCBub3JpL3N0b3JlL01peGluT2JzZXJ2YWJsZVN0b3JlXG4gICAqL1xuICBmdW5jdGlvbiBiaW5kTWFwKG1hcE9iaikge1xuICAgIGlmICghaXMuZnVuY3Rpb24obWFwT2JqLnN1YnNjcmliZSkpIHtcbiAgICAgIGNvbnNvbGUud2FybignVmlld0NvbXBvbmVudCBiaW5kTWFwLCBtdXN0IGJlIG9ic2VydmFibGU6ICcgKyBtYXBPYmopO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG1hcE9iai5zdWJzY3JpYmUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogQmVmb3JlIHRoZSB2aWV3IHVwZGF0ZXMgYW5kIGEgcmVyZW5kZXIgb2NjdXJzXG4gICAqIFJldHVybnMgbmV4dFN0YXRlIG9mIGNvbXBvbmVudFxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVwZGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGxldCBuZXh0U3RhdGUgICAgPSB0aGlzLmNvbXBvbmVudFdpbGxVcGRhdGUoKTtcblxuICAgIGlmICh0aGlzLnNob3VsZENvbXBvbmVudFVwZGF0ZShuZXh0U3RhdGUpKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKG5leHRTdGF0ZSk7XG5cbiAgICAgIGlmIChfaXNNb3VudGVkKSB7XG4gICAgICAgIHRoaXMudW5tb3VudCgpO1xuICAgICAgICB0aGlzLmNvbXBvbmVudFJlbmRlcigpO1xuICAgICAgICB0aGlzLm1vdW50KCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudXBkYXRlUmVnaW9ucygpO1xuXG4gICAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3VwZGF0ZScsIHRoaXMuZ2V0SUQoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbXBhcmUgY3VycmVudCBzdGF0ZSBhbmQgbmV4dCBzdGF0ZSB0byBkZXRlcm1pbmUgaWYgdXBkYXRpbmcgc2hvdWxkIG9jY3VyXG4gICAqIEBwYXJhbSBuZXh0U3RhdGVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSB7XG4gICAgcmV0dXJuIGlzLmV4aXN0eShuZXh0U3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBpdCwgbmVlZCB0byBhZGQgaXQgdG8gYSBwYXJlbnQgY29udGFpbmVyLCBoYW5kbGVkIGluIGhpZ2hlciBsZXZlbCB2aWV3XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50UmVuZGVyKCkge1xuICAgIGlmICghX3RlbXBsYXRlT2JqQ2FjaGUpIHtcbiAgICAgIF90ZW1wbGF0ZU9iakNhY2hlID0gdGhpcy50ZW1wbGF0ZSgpO1xuICAgIH1cblxuICAgIF9odG1sID0gdGhpcy5yZW5kZXIodGhpcy5nZXRTdGF0ZSgpKTtcblxuICAgIHRoaXMucmVuZGVyUmVnaW9ucygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBMb2Rhc2ggY2xpZW50IHNpZGUgdGVtcGxhdGUgZnVuY3Rpb24gYnkgZ2V0dGluZyB0aGUgSFRNTCBzb3VyY2UgZnJvbVxuICAgKiB0aGUgbWF0Y2hpbmcgPHNjcmlwdCB0eXBlPSd0ZXh0L3RlbXBsYXRlJz4gdGFnIGluIHRoZSBkb2N1bWVudC4gT1IgeW91IG1heVxuICAgKiBzcGVjaWZ5IHRoZSBjdXN0b20gSFRNTCB0byB1c2UgaGVyZS5cbiAgICpcbiAgICogVGhlIG1ldGhvZCBpcyBjYWxsZWQgb25seSBvbiB0aGUgZmlyc3QgcmVuZGVyIGFuZCBjYWNoZWQgdG8gc3BlZWQgdXAgcmVuZGVyc1xuICAgKlxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAqL1xuICBmdW5jdGlvbiB0ZW1wbGF0ZSgpIHtcbiAgICAvLyBhc3N1bWVzIHRoZSB0ZW1wbGF0ZSBJRCBtYXRjaGVzIHRoZSBjb21wb25lbnQncyBJRCBhcyBwYXNzZWQgb24gaW5pdGlhbGl6ZVxuICAgIGxldCBodG1sID0gX3RlbXBsYXRlLmdldFNvdXJjZSh0aGlzLmdldElEKCkpO1xuICAgIHJldHVybiBfLnRlbXBsYXRlKGh0bWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1heSBiZSBvdmVycmlkZGVuIGluIGEgc3VibW9kdWxlIGZvciBjdXN0b20gcmVuZGVyaW5nXG4gICAqIFNob3VsZCByZXR1cm4gSFRNTFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHJlbmRlcihzdGF0ZSkge1xuICAgIHJldHVybiBfdGVtcGxhdGVPYmpDYWNoZShzdGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kIGl0IHRvIGEgcGFyZW50IGVsZW1lbnRcbiAgICogQHBhcmFtIG1vdW50RWxcbiAgICovXG4gIGZ1bmN0aW9uIG1vdW50KCkge1xuICAgIGlmICghX2h0bWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ29tcG9uZW50ICcgKyBfaWQgKyAnIGNhbm5vdCBtb3VudCB3aXRoIG5vIEhUTUwuIENhbGwgcmVuZGVyKCkgZmlyc3Q/Jyk7XG4gICAgfVxuXG4gICAgX2lzTW91bnRlZCA9IHRydWU7XG5cbiAgICBfRE9NRWxlbWVudCA9IChfcmVuZGVyZXIucmVuZGVyKHtcbiAgICAgIHRhcmdldDogX21vdW50UG9pbnQsXG4gICAgICBodG1sICA6IF9odG1sXG4gICAgfSkpO1xuXG4gICAgaWYgKHRoaXMuZGVsZWdhdGVFdmVudHMpIHtcbiAgICAgIC8vIFBhc3MgdHJ1ZSB0byBhdXRvbWF0aWNhbGx5IHBhc3MgZm9ybSBlbGVtZW50IGhhbmRsZXJzIHRoZSBlbGVtZW50cyB2YWx1ZSBvciBvdGhlciBzdGF0dXNcbiAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHModHJ1ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5tb3VudFJlZ2lvbnMoKTtcblxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50KSB7XG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdtb3VudCcsIHRoaXMuZ2V0SUQoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCBhZnRlciBpdCdzIGJlZW4gYWRkZWQgdG8gYSB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAvLyBzdHViXG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB3aGVuIHVubG9hZGluZ1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgZnVuY3Rpb24gdW5tb3VudCgpIHtcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KCk7XG5cbiAgICB0aGlzLnVubW91bnRSZWdpb25zKCk7XG5cbiAgICBfaXNNb3VudGVkID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy51bmRlbGVnYXRlRXZlbnRzKSB7XG4gICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICB9XG5cbiAgICBfcmVuZGVyZXIucmVuZGVyKHtcbiAgICAgIHRhcmdldDogX21vdW50UG9pbnQsXG4gICAgICBodG1sICA6ICcnXG4gICAgfSk7XG5cbiAgICBfaHRtbCAgICAgICA9ICcnO1xuICAgIF9ET01FbGVtZW50ID0gbnVsbDtcbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3VubW91bnQnLCB0aGlzLmdldElEKCkpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBSZWdpb25zXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGRlZmluZVJlZ2lvbnMoKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlZ2lvbihpZCkge1xuICAgIHJldHVybiBfcmVnaW9uc1tpZF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSZWdpb25JRHMoKSB7XG4gICAgcmV0dXJuIF9yZWdpb25zID8gT2JqZWN0LmtleXMoX3JlZ2lvbnMpIDogW107XG4gIH1cblxuICBmdW5jdGlvbiBpbml0aWFsaXplUmVnaW9ucygpIHtcbiAgICBnZXRSZWdpb25JRHMoKS5mb3JFYWNoKHJlZ2lvbiA9PiB7XG4gICAgICBfcmVnaW9uc1tyZWdpb25dLmluaXRpYWxpemUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZVJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS51cGRhdGUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbmRlclJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS5jb21wb25lbnRSZW5kZXIoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdW50UmVnaW9ucygpIHtcbiAgICBnZXRSZWdpb25JRHMoKS5mb3JFYWNoKHJlZ2lvbiA9PiB7XG4gICAgICBfcmVnaW9uc1tyZWdpb25dLm1vdW50KCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiB1bm1vdW50UmVnaW9ucygpIHtcbiAgICBnZXRSZWdpb25JRHMoKS5mb3JFYWNoKHJlZ2lvbiA9PiB7XG4gICAgICBfcmVnaW9uc1tyZWdpb25dLnVubW91bnQoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGlzSW5pdGlhbGl6ZWQoKSB7XG4gICAgcmV0dXJuIF9pc0luaXRpYWxpemVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnUHJvcHMoKSB7XG4gICAgcmV0dXJuIF9jb25maWdQcm9wcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTW91bnRlZCgpIHtcbiAgICByZXR1cm4gX2lzTW91bnRlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcbiAgICB0aGlzLnNldFN0YXRlKHt9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElEKCkge1xuICAgIHJldHVybiBfaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRET01FbGVtZW50KCkge1xuICAgIHJldHVybiBfRE9NRWxlbWVudDtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZUNvbXBvbmVudCAgOiBpbml0aWFsaXplQ29tcG9uZW50LFxuICAgIGNvbmZpZ3VyYXRpb24gICAgICAgIDogY29uZmlndXJhdGlvbixcbiAgICBkZWZpbmVSZWdpb25zICAgICAgICA6IGRlZmluZVJlZ2lvbnMsXG4gICAgZGVmaW5lRXZlbnRzICAgICAgICAgOiBkZWZpbmVFdmVudHMsXG4gICAgaXNJbml0aWFsaXplZCAgICAgICAgOiBpc0luaXRpYWxpemVkLFxuICAgIGdldENvbmZpZ1Byb3BzICAgICAgIDogZ2V0Q29uZmlnUHJvcHMsXG4gICAgZ2V0SW5pdGlhbFN0YXRlICAgICAgOiBnZXRJbml0aWFsU3RhdGUsXG4gICAgZ2V0SUQgICAgICAgICAgICAgICAgOiBnZXRJRCxcbiAgICB0ZW1wbGF0ZSAgICAgICAgICAgICA6IHRlbXBsYXRlLFxuICAgIGdldERPTUVsZW1lbnQgICAgICAgIDogZ2V0RE9NRWxlbWVudCxcbiAgICBpc01vdW50ZWQgICAgICAgICAgICA6IGlzTW91bnRlZCxcbiAgICBiaW5kTWFwICAgICAgICAgICAgICA6IGJpbmRNYXAsXG4gICAgY29tcG9uZW50V2lsbFVwZGF0ZSAgOiBjb21wb25lbnRXaWxsVXBkYXRlLFxuICAgIHNob3VsZENvbXBvbmVudFVwZGF0ZTogc2hvdWxkQ29tcG9uZW50VXBkYXRlLFxuICAgIHVwZGF0ZSAgICAgICAgICAgICAgIDogdXBkYXRlLFxuICAgIGNvbXBvbmVudFJlbmRlciAgICAgIDogY29tcG9uZW50UmVuZGVyLFxuICAgIHJlbmRlciAgICAgICAgICAgICAgIDogcmVuZGVyLFxuICAgIG1vdW50ICAgICAgICAgICAgICAgIDogbW91bnQsXG4gICAgY29tcG9uZW50RGlkTW91bnQgICAgOiBjb21wb25lbnREaWRNb3VudCxcbiAgICBjb21wb25lbnRXaWxsVW5tb3VudCA6IGNvbXBvbmVudFdpbGxVbm1vdW50LFxuICAgIHVubW91bnQgICAgICAgICAgICAgIDogdW5tb3VudCxcbiAgICBnZXRSZWdpb24gICAgICAgICAgICA6IGdldFJlZ2lvbixcbiAgICBnZXRSZWdpb25JRHMgICAgICAgICA6IGdldFJlZ2lvbklEcyxcbiAgICBpbml0aWFsaXplUmVnaW9ucyAgICA6IGluaXRpYWxpemVSZWdpb25zLFxuICAgIHVwZGF0ZVJlZ2lvbnMgICAgICAgIDogdXBkYXRlUmVnaW9ucyxcbiAgICByZW5kZXJSZWdpb25zICAgICAgICA6IHJlbmRlclJlZ2lvbnMsXG4gICAgbW91bnRSZWdpb25zICAgICAgICAgOiBtb3VudFJlZ2lvbnMsXG4gICAgdW5tb3VudFJlZ2lvbnMgICAgICAgOiB1bm1vdW50UmVnaW9uc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXdDb21wb25lbnQ7IiwidmFyIGJyb3dzZXJJbmZvID0ge1xuXG4gIGFwcFZlcnNpb24gOiBuYXZpZ2F0b3IuYXBwVmVyc2lvbixcbiAgdXNlckFnZW50ICA6IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gIGlzSUUgICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1TSUUgXCIpLFxuICBpc0lFNiAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgNlwiKSxcbiAgaXNJRTcgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDdcIiksXG4gIGlzSUU4ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA4XCIpLFxuICBpc0lFOSAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgOVwiKSxcbiAgaXNGRiAgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiRmlyZWZveC9cIiksXG4gIGlzQ2hyb21lICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkNocm9tZS9cIiksXG4gIGlzTWFjICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY2ludG9zaCxcIiksXG4gIGlzTWFjU2FmYXJpOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIlNhZmFyaVwiKSAmJiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY1wiKSAmJiAtMSA9PT0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiQ2hyb21lXCIpLFxuXG4gIGhhc1RvdWNoICAgIDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBub3RTdXBwb3J0ZWQ6ICh0aGlzLmlzSUU2IHx8IHRoaXMuaXNJRTcgfHwgdGhpcy5pc0lFOCB8fCB0aGlzLmlzSUU5KSxcblxuICBtb2JpbGU6IHtcbiAgICBBbmRyb2lkICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQW5kcm9pZC9pKTtcbiAgICB9LFxuICAgIEJsYWNrQmVycnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CbGFja0JlcnJ5L2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JCMTA7IFRvdWNoLyk7XG4gICAgfSxcbiAgICBpT1MgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lfGlQYWR8aVBvZC9pKTtcbiAgICB9LFxuICAgIE9wZXJhICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9PcGVyYSBNaW5pL2kpO1xuICAgIH0sXG4gICAgV2luZG93cyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0lFTW9iaWxlL2kpO1xuICAgIH0sXG4gICAgYW55ICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICh0aGlzLkFuZHJvaWQoKSB8fCB0aGlzLkJsYWNrQmVycnkoKSB8fCB0aGlzLmlPUygpIHx8IHRoaXMuT3BlcmEoKSB8fCB0aGlzLldpbmRvd3MoKSkgIT09IG51bGw7XG4gICAgfVxuXG4gIH0sXG5cbiAgLy8gVE9ETyBmaWx0ZXIgZm9yIElFID4gOVxuICBlbmhhbmNlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhX2Jyb3dzZXJJbmZvLmlzSUUgJiYgIV9icm93c2VySW5mby5tb2JpbGUuYW55KCk7XG4gIH0sXG5cbiAgbW91c2VEb3duRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiO1xuICB9LFxuXG4gIG1vdXNlVXBFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIjtcbiAgfSxcblxuICBtb3VzZUNsaWNrRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaGVuZFwiIDogXCJjbGlja1wiO1xuICB9LFxuXG4gIG1vdXNlTW92ZUV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYnJvd3NlckluZm87IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjM5OTkvaG93LXRvLXRlbGwtaWYtYS1kb20tZWxlbWVudC1pcy12aXNpYmxlLWluLXRoZS1jdXJyZW50LXZpZXdwb3J0XG4gIC8vIGVsZW1lbnQgbXVzdCBiZSBlbnRpcmVseSBvbiBzY3JlZW5cbiAgaXNFbGVtZW50RW50aXJlbHlJblZpZXdwb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiAoXG4gICAgICByZWN0LnRvcCA+PSAwICYmXG4gICAgICByZWN0LmxlZnQgPj0gMCAmJlxuICAgICAgcmVjdC5ib3R0b20gPD0gKHdpbmRvdy5pbm5lckhlaWdodCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSAmJlxuICAgICAgcmVjdC5yaWdodCA8PSAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKVxuICAgICk7XG4gIH0sXG5cbiAgLy8gZWxlbWVudCBtYXkgYmUgcGFydGlhbHkgb24gc2NyZWVuXG4gIGlzRWxlbWVudEluVmlld3BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIHJlY3QuYm90dG9tID4gMCAmJlxuICAgICAgcmVjdC5yaWdodCA+IDAgJiZcbiAgICAgIHJlY3QubGVmdCA8ICh3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpICYmXG4gICAgICByZWN0LnRvcCA8ICh3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCk7XG4gIH0sXG5cbiAgaXNEb21PYmo6IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gISEob2JqLm5vZGVUeXBlIHx8IChvYmogPT09IHdpbmRvdykpO1xuICB9LFxuXG4gIHBvc2l0aW9uOiBmdW5jdGlvbiAoZWwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGVmdDogZWwub2Zmc2V0TGVmdCxcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcFxuICAgIH07XG4gIH0sXG5cbiAgLy8gZnJvbSBodHRwOi8vanNwZXJmLmNvbS9qcXVlcnktb2Zmc2V0LXZzLW9mZnNldHBhcmVudC1sb29wXG4gIG9mZnNldDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIG9sID0gMCxcbiAgICAgICAgb3QgPSAwO1xuICAgIGlmIChlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICAgIGRvIHtcbiAgICAgICAgb2wgKz0gZWwub2Zmc2V0TGVmdDtcbiAgICAgICAgb3QgKz0gZWwub2Zmc2V0VG9wO1xuICAgICAgfSB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IG9sLFxuICAgICAgdG9wIDogb3RcbiAgICB9O1xuICB9LFxuXG4gIHJlbW92ZUFsbEVsZW1lbnRzOiBmdW5jdGlvbiAoZWwpIHtcbiAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgfVxuICB9LFxuXG4gIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80OTQxNDMvY3JlYXRpbmctYS1uZXctZG9tLWVsZW1lbnQtZnJvbS1hbi1odG1sLXN0cmluZy11c2luZy1idWlsdC1pbi1kb20tbWV0aG9kcy1vci1wcm9cbiAgSFRNTFN0clRvTm9kZTogZnVuY3Rpb24gKHN0cikge1xuICAgIHZhciB0ZW1wICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHI7XG4gICAgcmV0dXJuIHRlbXAuZmlyc3RDaGlsZDtcbiAgfSxcblxuICB3cmFwRWxlbWVudDogZnVuY3Rpb24gKHdyYXBwZXJTdHIsIGVsKSB7XG4gICAgdmFyIHdyYXBwZXJFbCA9IHRoaXMuSFRNTFN0clRvTm9kZSh3cmFwcGVyU3RyKSxcbiAgICAgICAgZWxQYXJlbnQgID0gZWwucGFyZW50Tm9kZTtcblxuICAgIHdyYXBwZXJFbC5hcHBlbmRDaGlsZChlbCk7XG4gICAgZWxQYXJlbnQuYXBwZW5kQ2hpbGQod3JhcHBlckVsKTtcbiAgICByZXR1cm4gd3JhcHBlckVsO1xuICB9LFxuXG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTUzMjkxNjcvY2xvc2VzdC1hbmNlc3Rvci1tYXRjaGluZy1zZWxlY3Rvci11c2luZy1uYXRpdmUtZG9tXG4gIGNsb3Nlc3Q6IGZ1bmN0aW9uIChlbCwgc2VsZWN0b3IpIHtcbiAgICB2YXIgbWF0Y2hlc1NlbGVjdG9yID0gZWwubWF0Y2hlcyB8fCBlbC53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHwgZWwubW96TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLm1zTWF0Y2hlc1NlbGVjdG9yO1xuICAgIHdoaWxlIChlbCkge1xuICAgICAgaWYgKG1hdGNoZXNTZWxlY3Rvci5iaW5kKGVsKShzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnRFbGVtZW50O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLy8gZnJvbSB5b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tXG4gIGhhc0NsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIGFkZENsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9XG4gIH0sXG5cbiAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH1cbiAgfSxcblxuICB0b2dnbGVDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gRnJvbSBpbXByZXNzLmpzXG4gIGFwcGx5Q1NTOiBmdW5jdGlvbiAoZWwsIHByb3BzKSB7XG4gICAgdmFyIGtleSwgcGtleTtcbiAgICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgZWwuc3R5bGVba2V5XSA9IHByb3BzW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbDtcbiAgfSxcblxuICAvLyBmcm9tIGltcHJlc3MuanNcbiAgLy8gYGNvbXB1dGVXaW5kb3dTY2FsZWAgY291bnRzIHRoZSBzY2FsZSBmYWN0b3IgYmV0d2VlbiB3aW5kb3cgc2l6ZSBhbmQgc2l6ZVxuICAvLyBkZWZpbmVkIGZvciB0aGUgcHJlc2VudGF0aW9uIGluIHRoZSBjb25maWcuXG4gIGNvbXB1dGVXaW5kb3dTY2FsZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgIHZhciBoU2NhbGUgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLyBjb25maWcuaGVpZ2h0LFxuICAgICAgICB3U2NhbGUgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIGNvbmZpZy53aWR0aCxcbiAgICAgICAgc2NhbGUgID0gaFNjYWxlID4gd1NjYWxlID8gd1NjYWxlIDogaFNjYWxlO1xuXG4gICAgaWYgKGNvbmZpZy5tYXhTY2FsZSAmJiBzY2FsZSA+IGNvbmZpZy5tYXhTY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWF4U2NhbGU7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5taW5TY2FsZSAmJiBzY2FsZSA8IGNvbmZpZy5taW5TY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWluU2NhbGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYW4gYXJyYXkgb2YgZWxlbWVudHMgaW4gdGhlIGNvbnRhaW5lciByZXR1cm5lZCBhcyBBcnJheSBpbnN0ZWFkIG9mIGEgTm9kZSBsaXN0XG4gICAqL1xuICBnZXRRU0VsZW1lbnRzQXNBcnJheTogZnVuY3Rpb24gKGVsLCBjbHMpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbChjbHMpLCAwKTtcbiAgfSxcblxuICBjZW50ZXJFbGVtZW50SW5WaWV3UG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHZwSCA9IHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgdnBXID0gd2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgIGVsUiA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICBlbEggPSBlbFIuaGVpZ2h0LFxuICAgICAgICBlbFcgPSBlbFIud2lkdGg7XG5cbiAgICBlbC5zdHlsZS5sZWZ0ID0gKHZwVyAvIDIpIC0gKGVsVyAvIDIpICsgJ3B4JztcbiAgICBlbC5zdHlsZS50b3AgID0gKHZwSCAvIDIpIC0gKGVsSCAvIDIpICsgJ3B4JztcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvYmplY3QgZnJvbSB0aGUgbmFtZSAob3IgaWQpIGF0dHJpYnMgYW5kIGRhdGEgb2YgYSBmb3JtXG4gICAqIEBwYXJhbSBlbFxuICAgKiBAcmV0dXJucyB7bnVsbH1cbiAgICovXG4gIGNhcHR1cmVGb3JtRGF0YTogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIGRhdGFPYmogPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgICB0ZXh0YXJlYUVscywgaW5wdXRFbHMsIHNlbGVjdEVscztcblxuICAgIHRleHRhcmVhRWxzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgndGV4dGFyZWEnKSwgMCk7XG4gICAgaW5wdXRFbHMgICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCcpLCAwKTtcbiAgICBzZWxlY3RFbHMgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NlbGVjdCcpLCAwKTtcblxuICAgIHRleHRhcmVhRWxzLmZvckVhY2goZ2V0SW5wdXRGb3JtRGF0YSk7XG4gICAgaW5wdXRFbHMuZm9yRWFjaChnZXRJbnB1dEZvcm1EYXRhKTtcbiAgICBzZWxlY3RFbHMuZm9yRWFjaChnZXRTZWxlY3RGb3JtRGF0YSk7XG5cbiAgICByZXR1cm4gZGF0YU9iajtcblxuICAgIGZ1bmN0aW9uIGdldElucHV0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSBmb3JtRWwudmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICB2YXIgc2VsID0gZm9ybUVsLnNlbGVjdGVkSW5kZXgsIHZhbCA9ICcnO1xuICAgICAgaWYgKHNlbCA+PSAwKSB7XG4gICAgICAgIHZhbCA9IGZvcm1FbC5vcHRpb25zW3NlbF0udmFsdWU7XG4gICAgICB9XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RWxOYW1lT3JJRChmb3JtRWwpIHtcbiAgICAgIHZhciBuYW1lID0gJ25vX25hbWUnO1xuICAgICAgaWYgKGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgICAgICBuYW1lID0gZm9ybUVsLmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgfSBlbHNlIGlmIChmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpKSB7XG4gICAgICAgIG5hbWUgPSBmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuICB9XG5cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBzaGFyZWQgM2QgcGVyc3BlY3RpdmUgZm9yIGFsbCBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5M0RUb0NvbnRhaW5lcjogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHBlcnNwZWN0aXZlICAgICAgOiA4MDAsXG4gICAgICAgIHBlcnNwZWN0aXZlT3JpZ2luOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbHkgYmFzaWMgQ1NTIHByb3BzXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHkzRFRvRWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHRyYW5zZm9ybVN0eWxlICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgIHRyYW5zZm9ybU9yaWdpbiAgIDogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGx5IGJhc2ljIDNkIHByb3BzIGFuZCBzZXQgdW5pcXVlIHBlcnNwZWN0aXZlIGZvciBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5VW5pcXVlM0RUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB0cmFuc2Zvcm1TdHlsZSAgICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHkgIDogXCJoaWRkZW5cIixcbiAgICAgICAgdHJhbnNmb3JtUGVyc3BlY3RpdmU6IDYwMCxcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luICAgICA6ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbn07XG4iLCJ2YXIgTWVzc2FnZUJveENyZWF0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tZXNzYWdlQm94VmlldyA9IHJlcXVpcmUoJy4vTWVzc2FnZUJveFZpZXcnKTtcblxuICBmdW5jdGlvbiBhbGVydCh0aXRsZSwgbWVzc2FnZSwgbW9kYWwsIGNiKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHA+JyArIG1lc3NhZ2UgKyAnPC9wPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRBTkdFUixcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ0Nsb3NlJyxcbiAgICAgICAgICBpZCAgICAgOiAnQ2xvc2UnLFxuICAgICAgICAgIHR5cGUgICA6ICcnLFxuICAgICAgICAgIGljb24gICA6ICd0aW1lcycsXG4gICAgICAgICAgb25DbGljazogY2JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlybSh0aXRsZSwgbWVzc2FnZSwgb2tDQiwgbW9kYWwpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cD4nICsgbWVzc2FnZSArICc8L3A+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ1Byb2NlZWQnLFxuICAgICAgICAgIGlkICAgICA6ICdwcm9jZWVkJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9tcHQodGl0bGUsIG1lc3NhZ2UsIG9rQ0IsIG1vZGFsKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHAgY2xhc3M9XCJ0ZXh0LWNlbnRlciBwYWRkaW5nLWJvdHRvbS1kb3VibGVcIj4nICsgbWVzc2FnZSArICc8L3A+PHRleHRhcmVhIG5hbWU9XCJyZXNwb25zZVwiIGNsYXNzPVwiaW5wdXQtdGV4dFwiIHR5cGU9XCJ0ZXh0XCIgc3R5bGU9XCJ3aWR0aDo0MDBweDsgaGVpZ2h0Ojc1cHg7IHJlc2l6ZTogbm9uZVwiIGF1dG9mb2N1cz1cInRydWVcIj48L3RleHRhcmVhPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQ1MCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdQcm9jZWVkJyxcbiAgICAgICAgICBpZCAgICAgOiAncHJvY2VlZCcsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hvaWNlKHRpdGxlLCBtZXNzYWdlLCBzZWxlY3Rpb25zLCBva0NCLCBtb2RhbCkge1xuICAgIHZhciBzZWxlY3RIVE1MID0gJzxzZWxlY3QgY2xhc3M9XCJzcGFjZWRcIiBzdHlsZT1cIndpZHRoOjQ1MHB4O2hlaWdodDoyMDBweFwiIG5hbWU9XCJzZWxlY3Rpb25cIiBhdXRvZm9jdXM9XCJ0cnVlXCIgc2l6ZT1cIjIwXCI+JztcblxuICAgIHNlbGVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAob3B0KSB7XG4gICAgICBzZWxlY3RIVE1MICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIG9wdC52YWx1ZSArICdcIiAnICsgKG9wdC5zZWxlY3RlZCA9PT0gJ3RydWUnID8gJ3NlbGVjdGVkJyA6ICcnKSArICc+JyArIG9wdC5sYWJlbCArICc8L29wdGlvbj4nO1xuICAgIH0pO1xuXG4gICAgc2VsZWN0SFRNTCArPSAnPC9zZWxlY3Q+JztcblxuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwIGNsYXNzPVwidGV4dC1jZW50ZXIgcGFkZGluZy1ib3R0b20tZG91YmxlXCI+JyArIG1lc3NhZ2UgKyAnPC9wPjxkaXYgY2xhc3M9XCJ0ZXh0LWNlbnRlclwiPicgKyBzZWxlY3RIVE1MICsgJzwvZGl2PicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDUwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdPSycsXG4gICAgICAgICAgaWQgICAgIDogJ29rJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFsZXJ0ICA6IGFsZXJ0LFxuICAgIGNvbmZpcm06IGNvbmZpcm0sXG4gICAgcHJvbXB0IDogcHJvbXB0LFxuICAgIGNob2ljZSA6IGNob2ljZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VCb3hDcmVhdG9yKCk7IiwidmFyIE1lc3NhZ2VCb3hWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2hpZ2hlc3RaICAgICAgICAgICAgICAgPSAxMDAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCAgICAgICAgICAgPSA0MDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ21lc3NhZ2Vib3hfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ21lc3NhZ2Vib3hfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAnbWVzc2FnZWJveF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICdtZXNzYWdlYm94X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfYnV0dG9uSWNvblRlbXBsYXRlSUQgICA9ICdtZXNzYWdlYm94LS1idXR0b24taWNvbicsXG4gICAgICBfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCA9ICdtZXNzYWdlYm94LS1idXR0b24tbm9pY29uJyxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfbW9kYWwgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vTW9kYWxDb3ZlclZpZXcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKSxcbiAgICAgIF9jb21wb25lbnRVdGlscyAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBzZXQgdGhlIG1vdW50IHBvaW50IC8gYm94IGNvbnRhaW5lclxuICAgKiBAcGFyYW0gZWxJRFxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBuZXcgbWVzc2FnZSBib3hcbiAgICogQHBhcmFtIGluaXRPYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIHZhciB0eXBlICAgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQsXG4gICAgICAgIGJveE9iaiA9IGNyZWF0ZUJveE9iamVjdChpbml0T2JqKTtcblxuICAgIC8vIHNldHVwXG4gICAgX2NoaWxkcmVuLnB1c2goYm94T2JqKTtcbiAgICBfbW91bnRQb2ludC5hcHBlbmRDaGlsZChib3hPYmouZWxlbWVudCk7XG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGJveE9iai5lbGVtZW50KTtcbiAgICBjb25maWd1cmVCdXR0b25zKGJveE9iaik7XG5cbiAgICBfY29tcG9uZW50VXRpbHMuYXBwbHlVbmlxdWUzRFRvRWxlbWVudChib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBTZXQgM2QgQ1NTIHByb3BzIGZvciBpbi9vdXQgdHJhbnNpdGlvblxuICAgIFR3ZWVuTGl0ZS5zZXQoYm94T2JqLmVsZW1lbnQsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB6SW5kZXg6IF9oaWdoZXN0WixcbiAgICAgICAgd2lkdGggOiBpbml0T2JqLndpZHRoID8gaW5pdE9iai53aWR0aCA6IF9kZWZhdWx0V2lkdGhcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNlbnRlciBhZnRlciB3aWR0aCBoYXMgYmVlbiBzZXRcbiAgICBfZG9tVXRpbHMuY2VudGVyRWxlbWVudEluVmlld1BvcnQoYm94T2JqLmVsZW1lbnQpO1xuXG4gICAgLy8gTWFrZSBpdCBkcmFnZ2FibGVcbiAgICBEcmFnZ2FibGUuY3JlYXRlKCcjJyArIGJveE9iai5pZCwge1xuICAgICAgYm91bmRzIDogd2luZG93LFxuICAgICAgb25QcmVzczogZnVuY3Rpb24gKCkge1xuICAgICAgICBfaGlnaGVzdFogPSBEcmFnZ2FibGUuekluZGV4O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU2hvdyBpdFxuICAgIHRyYW5zaXRpb25Jbihib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBTaG93IHRoZSBtb2RhbCBjb3ZlclxuICAgIGlmIChpbml0T2JqLm1vZGFsKSB7XG4gICAgICBfbW9kYWwuc2hvd05vbkRpc21pc3NhYmxlKHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiBib3hPYmouaWQ7XG4gIH1cblxuICAvKipcbiAgICogQXNzaWduIGEgdHlwZSBjbGFzcyB0byBpdFxuICAgKiBAcGFyYW0gdHlwZVxuICAgKiBAcGFyYW0gZWxlbWVudFxuICAgKi9cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgb2JqZWN0IGZvciBhIGJveFxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcmV0dXJucyB7e2RhdGFPYmo6ICosIGlkOiBzdHJpbmcsIG1vZGFsOiAoKnxib29sZWFuKSwgZWxlbWVudDogKiwgc3RyZWFtczogQXJyYXl9fVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQm94T2JqZWN0KGluaXRPYmopIHtcbiAgICB2YXIgaWQgID0gJ2pzX19tZXNzYWdlYm94LScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGRhdGFPYmo6IGluaXRPYmosXG4gICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgbW9kYWwgIDogaW5pdE9iai5tb2RhbCxcbiAgICAgICAgICBlbGVtZW50OiBfdGVtcGxhdGUuYXNFbGVtZW50KCdtZXNzYWdlYm94LS1kZWZhdWx0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiBpbml0T2JqLnRpdGxlLFxuICAgICAgICAgICAgY29udGVudDogaW5pdE9iai5jb250ZW50XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc3RyZWFtczogW11cbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHVwIHRoZSBidXR0b25zXG4gICAqIEBwYXJhbSBib3hPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKSB7XG4gICAgdmFyIGJ1dHRvbkRhdGEgPSBib3hPYmouZGF0YU9iai5idXR0b25zO1xuXG4gICAgLy8gZGVmYXVsdCBidXR0b24gaWYgbm9uZVxuICAgIGlmICghYnV0dG9uRGF0YSkge1xuICAgICAgYnV0dG9uRGF0YSA9IFt7XG4gICAgICAgIGxhYmVsOiAnQ2xvc2UnLFxuICAgICAgICB0eXBlIDogJycsXG4gICAgICAgIGljb24gOiAndGltZXMnLFxuICAgICAgICBpZCAgIDogJ2RlZmF1bHQtY2xvc2UnXG4gICAgICB9XTtcbiAgICB9XG5cbiAgICB2YXIgYnV0dG9uQ29udGFpbmVyID0gYm94T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmZvb3Rlci1idXR0b25zJyk7XG5cbiAgICBfZG9tVXRpbHMucmVtb3ZlQWxsRWxlbWVudHMoYnV0dG9uQ29udGFpbmVyKTtcblxuICAgIGJ1dHRvbkRhdGEuZm9yRWFjaChmdW5jdGlvbiBtYWtlQnV0dG9uKGJ1dHRvbk9iaikge1xuICAgICAgYnV0dG9uT2JqLmlkID0gYm94T2JqLmlkICsgJy1idXR0b24tJyArIGJ1dHRvbk9iai5pZDtcblxuICAgICAgdmFyIGJ1dHRvbkVsO1xuXG4gICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdpY29uJykpIHtcbiAgICAgICAgYnV0dG9uRWwgPSBfdGVtcGxhdGUuYXNFbGVtZW50KF9idXR0b25JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1dHRvbkVsID0gX3RlbXBsYXRlLmFzRWxlbWVudChfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH1cblxuICAgICAgYnV0dG9uQ29udGFpbmVyLmFwcGVuZENoaWxkKGJ1dHRvbkVsKTtcblxuICAgICAgdmFyIGJ0blN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKVxuICAgICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdvbkNsaWNrJykpIHtcbiAgICAgICAgICAgIGlmIChidXR0b25PYmoub25DbGljaykge1xuICAgICAgICAgICAgICBidXR0b25PYmoub25DbGljay5jYWxsKHRoaXMsIGNhcHR1cmVGb3JtRGF0YShib3hPYmouaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVtb3ZlKGJveE9iai5pZCk7XG4gICAgICAgIH0pO1xuICAgICAgYm94T2JqLnN0cmVhbXMucHVzaChidG5TdHJlYW0pO1xuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBkYXRhIGZyb20gdGhlIGZvcm0gb24gdGhlIGJveCBjb250ZW50c1xuICAgKiBAcGFyYW0gYm94SURcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjYXB0dXJlRm9ybURhdGEoYm94SUQpIHtcbiAgICByZXR1cm4gX2RvbVV0aWxzLmNhcHR1cmVGb3JtRGF0YShnZXRPYmpCeUlEKGJveElEKS5lbGVtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBib3ggZnJvbSB0aGUgc2NyZWVuIC8gY29udGFpbmVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIGJveE9iajtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG4gICAgICB0cmFuc2l0aW9uT3V0KGJveE9iai5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvdyB0aGUgYm94XG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLCB7YWxwaGE6IDAsIHJvdGF0aW9uWDogNDUsIHNjYWxlOiAyfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGFscGhhICAgIDogMSxcbiAgICAgIHJvdGF0aW9uWDogMCxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBib3hcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjI1LCB7XG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICByb3RhdGlvblg6IC00NSxcbiAgICAgIHNjYWxlICAgIDogMC4yNSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFuIHVwIGFmdGVyIHRoZSB0cmFuc2l0aW9uIG91dCBhbmltYXRpb25cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG5cbiAgICBib3hPYmouc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgIHN0cmVhbS5kaXNwb3NlKCk7XG4gICAgfSk7XG5cbiAgICBEcmFnZ2FibGUuZ2V0KCcjJyArIGJveE9iai5pZCkuZGlzYWJsZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuXG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcblxuICAgIGNoZWNrTW9kYWxTdGF0dXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgYW55IG9wZW4gYm94ZXMgaGF2ZSBtb2RhbCB0cnVlXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja01vZGFsU3RhdHVzKCkge1xuICAgIHZhciBpc01vZGFsID0gZmFsc2U7XG5cbiAgICBfY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoYm94T2JqKSB7XG4gICAgICBpZiAoYm94T2JqLm1vZGFsID09PSB0cnVlKSB7XG4gICAgICAgIGlzTW9kYWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFpc01vZGFsKSB7XG4gICAgICBfbW9kYWwuaGlkZSh0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXRpbGl0eSB0byBnZXQgdGhlIGJveCBvYmplY3QgaW5kZXggYnkgSURcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVdGlsaXR5IHRvIGdldCB0aGUgYm94IG9iamVjdCBieSBJRFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlQm94VmlldygpOyIsInZhciBNb2RhbENvdmVyVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX21vdW50UG9pbnQgID0gZG9jdW1lbnQsXG4gICAgICBfbW9kYWxDb3ZlckVsLFxuICAgICAgX21vZGFsQmFja2dyb3VuZEVsLFxuICAgICAgX21vZGFsQ2xvc2VCdXR0b25FbCxcbiAgICAgIF9tb2RhbENsaWNrU3RyZWFtLFxuICAgICAgX2lzVmlzaWJsZSxcbiAgICAgIF9ub3REaXNtaXNzaWJsZSxcbiAgICAgIF9icm93c2VySW5mbyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblxuICAgIF9pc1Zpc2libGUgPSB0cnVlO1xuXG4gICAgX21vZGFsQ292ZXJFbCAgICAgICA9IF9tb3VudFBvaW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbF9fY292ZXInKTtcbiAgICBfbW9kYWxCYWNrZ3JvdW5kRWwgID0gX21vdW50UG9pbnQucXVlcnlTZWxlY3RvcignLm1vZGFsX19iYWNrZ3JvdW5kJyk7XG4gICAgX21vZGFsQ2xvc2VCdXR0b25FbCA9IF9tb3VudFBvaW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbF9fY2xvc2UtYnV0dG9uJyk7XG5cbiAgICB2YXIgbW9kYWxCR0NsaWNrICAgICA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KF9tb2RhbEJhY2tncm91bmRFbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIG1vZGFsQnV0dG9uQ2xpY2sgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChfbW9kYWxDbG9zZUJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKTtcblxuICAgIF9tb2RhbENsaWNrU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5tZXJnZShtb2RhbEJHQ2xpY2ssIG1vZGFsQnV0dG9uQ2xpY2spXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25Nb2RhbENsaWNrKCk7XG4gICAgICB9KTtcblxuICAgIGhpZGUoZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SXNWaXNpYmxlKCkge1xuICAgIHJldHVybiBfaXNWaXNpYmxlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Nb2RhbENsaWNrKCkge1xuICAgIGlmIChfbm90RGlzbWlzc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaGlkZSh0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpIHtcbiAgICBfaXNWaXNpYmxlICAgPSB0cnVlO1xuICAgIHZhciBkdXJhdGlvbiA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ292ZXJFbCwgZHVyYXRpb24sIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbEJhY2tncm91bmRFbCwgZHVyYXRpb24sIHtcbiAgICAgIGFscGhhOiAxLFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdyhzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKF9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfbm90RGlzbWlzc2libGUgPSBmYWxzZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuXG4gICAgVHdlZW5MaXRlLnNldChfbW9kYWxDbG9zZUJ1dHRvbkVsLCB7c2NhbGU6IDIsIGFscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENsb3NlQnV0dG9uRWwsIDEsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQm91bmNlLmVhc2VPdXQsXG4gICAgICBkZWxheSAgICA6IDFcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBICdoYXJkJyBtb2RhbCB2aWV3IGNhbm5vdCBiZSBkaXNtaXNzZWQgd2l0aCBhIGNsaWNrLCBtdXN0IGJlIHZpYSBjb2RlXG4gICAqIEBwYXJhbSBzaG91bGRBbmltYXRlXG4gICAqL1xuICBmdW5jdGlvbiBzaG93Tm9uRGlzbWlzc2FibGUoc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NpYmxlID0gdHJ1ZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAwLCB7YXV0b0FscGhhOiAwfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoIV9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX2lzVmlzaWJsZSAgICAgID0gZmFsc2U7XG4gICAgX25vdERpc21pc3NpYmxlID0gZmFsc2U7XG4gICAgdmFyIGR1cmF0aW9uICAgID0gc2hvdWxkQW5pbWF0ZSA/IDAuMjUgOiAwO1xuICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8oX21vZGFsQ2xvc2VCdXR0b25FbCk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCBkdXJhdGlvbiAvIDIsIHtcbiAgICAgIGF1dG9BbHBoYTogMCxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldE9wYWNpdHkob3BhY2l0eSkge1xuICAgIGlmIChvcGFjaXR5IDwgMCB8fCBvcGFjaXR5ID4gMSkge1xuICAgICAgY29uc29sZS5sb2coJ251ZG9ydS9jb21wb25lbnQvTW9kYWxDb3ZlclZpZXc6IHNldE9wYWNpdHk6IG9wYWNpdHkgc2hvdWxkIGJlIGJldHdlZW4gMCBhbmQgMScpO1xuICAgICAgb3BhY2l0eSA9IDE7XG4gICAgfVxuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGFscGhhOiBvcGFjaXR5LFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q29sb3IociwgZywgYikge1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGJhY2tncm91bmRDb2xvcjogJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknLFxuICAgICAgZWFzZSAgICAgICAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHNob3cgICAgICAgICAgICAgIDogc2hvdyxcbiAgICBzaG93Tm9uRGlzbWlzc2FibGU6IHNob3dOb25EaXNtaXNzYWJsZSxcbiAgICBoaWRlICAgICAgICAgICAgICA6IGhpZGUsXG4gICAgdmlzaWJsZSAgICAgICAgICAgOiBnZXRJc1Zpc2libGUsXG4gICAgc2V0T3BhY2l0eSAgICAgICAgOiBzZXRPcGFjaXR5LFxuICAgIHNldENvbG9yICAgICAgICAgIDogc2V0Q29sb3JcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbENvdmVyVmlldygpOyIsInZhciBUb2FzdFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgICAgICAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2RlZmF1bHRFeHBpcmVEdXJhdGlvbiA9IDcwMDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCAgICAgICAgICA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICd0b2FzdF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAndG9hc3RfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9hc3RfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAndG9hc3RfX2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyksXG4gICAgICBfY29tcG9uZW50VXRpbHMgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvL29iai50aXRsZSwgb2JqLmNvbnRlbnQsIG9iai50eXBlXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvYXN0T2JqID0gY3JlYXRlVG9hc3RPYmplY3QoaW5pdE9iai50aXRsZSwgaW5pdE9iai5tZXNzYWdlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvYXN0T2JqKTtcblxuICAgIF9tb3VudFBvaW50Lmluc2VydEJlZm9yZSh0b2FzdE9iai5lbGVtZW50LCBfbW91bnRQb2ludC5maXJzdENoaWxkKTtcblxuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudChpbml0T2JqLnR5cGUsIHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0NvbnRhaW5lcihfbW91bnRQb2ludCk7XG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0VsZW1lbnQodG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICB2YXIgY2xvc2VCdG4gICAgICAgICA9IHRvYXN0T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLnRvYXN0X19pdGVtLWNvbnRyb2xzID4gYnV0dG9uJyksXG4gICAgICAgIGNsb3NlQnRuU3RlYW0gICAgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChjbG9zZUJ0biwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIGV4cGlyZVRpbWVTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKF9kZWZhdWx0RXhwaXJlRHVyYXRpb24pO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbSA9IFJ4Lk9ic2VydmFibGUubWVyZ2UoY2xvc2VCdG5TdGVhbSwgZXhwaXJlVGltZVN0cmVhbSkudGFrZSgxKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlbW92ZSh0b2FzdE9iai5pZCk7XG4gICAgICB9KTtcblxuICAgIHRyYW5zaXRpb25Jbih0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIHJldHVybiB0b2FzdE9iai5pZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvYXN0T2JqZWN0KHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgdmFyIGlkICA9ICdqc19fdG9hc3QtdG9hc3RpdGVtLScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGlkICAgICAgICAgICAgICAgICA6IGlkLFxuICAgICAgICAgIGVsZW1lbnQgICAgICAgICAgICA6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ2NvbXBvbmVudC0tdG9hc3QnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGRlZmF1bHRCdXR0b25TdHJlYW06IG51bGxcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoaWQpIHtcbiAgICB2YXIgaWR4ID0gZ2V0T2JqSW5kZXhCeUlEKGlkKSxcbiAgICAgICAgdG9hc3Q7XG5cbiAgICBpZiAoaWR4ID4gLTEpIHtcbiAgICAgIHRvYXN0ID0gX2NoaWxkcmVuW2lkeF07XG4gICAgICByZWFycmFuZ2UoaWR4KTtcbiAgICAgIHRyYW5zaXRpb25PdXQodG9hc3QuZWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLCB7YWxwaGE6IDB9KTtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDEsIHthbHBoYTogMSwgZWFzZTogUXVhZC5lYXNlT3V0fSk7XG4gICAgcmVhcnJhbmdlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjI1LCB7XG4gICAgICByb3RhdGlvblg6IC00NSxcbiAgICAgIGFscGhhICAgIDogMCxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpIHtcbiAgICB2YXIgaWR4ICAgICAgICA9IGdldE9iakluZGV4QnlJRChlbC5nZXRBdHRyaWJ1dGUoJ2lkJykpLFxuICAgICAgICB0b2FzdE9iaiAgID0gX2NoaWxkcmVuW2lkeF07XG5cbiAgICB0b2FzdE9iai5kZWZhdWx0QnV0dG9uU3RyZWFtLmRpc3Bvc2UoKTtcblxuICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKGVsKTtcbiAgICBfY2hpbGRyZW5baWR4XSA9IG51bGw7XG4gICAgX2NoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVhcnJhbmdlKGlnbm9yZSkge1xuICAgIHZhciBpID0gX2NoaWxkcmVuLmxlbmd0aCAtIDEsXG4gICAgICAgIGN1cnJlbnQsXG4gICAgICAgIHkgPSAwO1xuXG4gICAgZm9yICg7IGkgPiAtMTsgaS0tKSB7XG4gICAgICBpZiAoaSA9PT0gaWdub3JlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY3VycmVudCA9IF9jaGlsZHJlbltpXTtcbiAgICAgIFR3ZWVuTGl0ZS50byhjdXJyZW50LmVsZW1lbnQsIDAuNzUsIHt5OiB5LCBlYXNlOiBCb3VuY2UuZWFzZU91dH0pO1xuICAgICAgeSArPSAxMCArIGN1cnJlbnQuZWxlbWVudC5jbGllbnRIZWlnaHQ7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqSW5kZXhCeUlEKGlkKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQuaWQ7XG4gICAgfSkuaW5kZXhPZihpZCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb2FzdFZpZXcoKTsiLCJ2YXIgVG9vbFRpcFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgPSAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCA9IDIwMCxcbiAgICAgIF90eXBlcyAgICAgICAgPSB7XG4gICAgICAgIERFRkFVTFQgICAgOiAnZGVmYXVsdCcsXG4gICAgICAgIElORk9STUFUSU9OOiAnaW5mb3JtYXRpb24nLFxuICAgICAgICBTVUNDRVNTICAgIDogJ3N1Y2Nlc3MnLFxuICAgICAgICBXQVJOSU5HICAgIDogJ3dhcm5pbmcnLFxuICAgICAgICBEQU5HRVIgICAgIDogJ2RhbmdlcicsXG4gICAgICAgIENPQUNITUFSSyAgOiAnY29hY2htYXJrJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgPSB7XG4gICAgICAgICdkZWZhdWx0JyAgICA6ICcnLFxuICAgICAgICAnaW5mb3JtYXRpb24nOiAndG9vbHRpcF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAndG9vbHRpcF9fc3VjY2VzcycsXG4gICAgICAgICd3YXJuaW5nJyAgICA6ICd0b29sdGlwX193YXJuaW5nJyxcbiAgICAgICAgJ2RhbmdlcicgICAgIDogJ3Rvb2x0aXBfX2RhbmdlcicsXG4gICAgICAgICdjb2FjaG1hcmsnICA6ICd0b29sdGlwX19jb2FjaG1hcmsnXG4gICAgICB9LFxuICAgICAgX3Bvc2l0aW9ucyAgICA9IHtcbiAgICAgICAgVCA6ICdUJyxcbiAgICAgICAgVFI6ICdUUicsXG4gICAgICAgIFIgOiAnUicsXG4gICAgICAgIEJSOiAnQlInLFxuICAgICAgICBCIDogJ0InLFxuICAgICAgICBCTDogJ0JMJyxcbiAgICAgICAgTCA6ICdMJyxcbiAgICAgICAgVEw6ICdUTCdcbiAgICAgIH0sXG4gICAgICBfcG9zaXRpb25NYXAgID0ge1xuICAgICAgICAnVCcgOiAndG9vbHRpcF9fdG9wJyxcbiAgICAgICAgJ1RSJzogJ3Rvb2x0aXBfX3RvcHJpZ2h0JyxcbiAgICAgICAgJ1InIDogJ3Rvb2x0aXBfX3JpZ2h0JyxcbiAgICAgICAgJ0JSJzogJ3Rvb2x0aXBfX2JvdHRvbXJpZ2h0JyxcbiAgICAgICAgJ0InIDogJ3Rvb2x0aXBfX2JvdHRvbScsXG4gICAgICAgICdCTCc6ICd0b29sdGlwX19ib3R0b21sZWZ0JyxcbiAgICAgICAgJ0wnIDogJ3Rvb2x0aXBfX2xlZnQnLFxuICAgICAgICAnVEwnOiAndG9vbHRpcF9fdG9wbGVmdCdcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF90ZW1wbGF0ZSAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvL29iai50aXRsZSwgb2JqLmNvbnRlbnQsIG9iai50eXBlLCBvYmoudGFyZ2V0LCBvYmoucG9zaXRpb25cbiAgZnVuY3Rpb24gYWRkKGluaXRPYmopIHtcbiAgICBpbml0T2JqLnR5cGUgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQ7XG5cbiAgICB2YXIgdG9vbHRpcE9iaiA9IGNyZWF0ZVRvb2xUaXBPYmplY3QoaW5pdE9iai50aXRsZSxcbiAgICAgIGluaXRPYmouY29udGVudCxcbiAgICAgIGluaXRPYmoucG9zaXRpb24sXG4gICAgICBpbml0T2JqLnRhcmdldEVsLFxuICAgICAgaW5pdE9iai5ndXR0ZXIsXG4gICAgICBpbml0T2JqLmFsd2F5c1Zpc2libGUpO1xuXG4gICAgX2NoaWxkcmVuLnB1c2godG9vbHRpcE9iaik7XG4gICAgX21vdW50UG9pbnQuYXBwZW5kQ2hpbGQodG9vbHRpcE9iai5lbGVtZW50KTtcblxuICAgIHRvb2x0aXBPYmouYXJyb3dFbCA9IHRvb2x0aXBPYmouZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3cnKTtcbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQoaW5pdE9iai50eXBlLCBpbml0T2JqLnBvc2l0aW9uLCB0b29sdGlwT2JqLmVsZW1lbnQpO1xuXG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmVsZW1lbnQsIHtcbiAgICAgIGNzczoge1xuICAgICAgICBhdXRvQWxwaGE6IHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSA/IDEgOiAwLFxuICAgICAgICB3aWR0aCAgICA6IGluaXRPYmoud2lkdGggPyBpbml0T2JqLndpZHRoIDogX2RlZmF1bHRXaWR0aFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gY2FjaGUgdGhlc2UgdmFsdWVzLCAzZCB0cmFuc2Zvcm1zIHdpbGwgYWx0ZXIgc2l6ZVxuICAgIHRvb2x0aXBPYmoud2lkdGggID0gdG9vbHRpcE9iai5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoO1xuICAgIHRvb2x0aXBPYmouaGVpZ2h0ID0gdG9vbHRpcE9iai5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcblxuICAgIGFzc2lnbkV2ZW50c1RvVGFyZ2V0RWwodG9vbHRpcE9iaik7XG4gICAgcG9zaXRpb25Ub29sVGlwKHRvb2x0aXBPYmopO1xuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuTCB8fCB0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlIpIHtcbiAgICAgIGNlbnRlckFycm93VmVydGljYWxseSh0b29sdGlwT2JqKTtcbiAgICB9XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UIHx8IHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQikge1xuICAgICAgY2VudGVyQXJyb3dIb3Jpem9udGFsbHkodG9vbHRpcE9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRvb2x0aXBPYmouZWxlbWVudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBwb3NpdGlvbiwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF9wb3NpdGlvbk1hcFtwb3NpdGlvbl0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVG9vbFRpcE9iamVjdCh0aXRsZSwgbWVzc2FnZSwgcG9zaXRpb24sIHRhcmdldCwgZ3V0dGVyLCBhbHdheXNWaXNpYmxlKSB7XG4gICAgdmFyIGlkICA9ICdqc19fdG9vbHRpcC10b29sdGlwaXRlbS0nICsgKF9jb3VudGVyKyspLnRvU3RyaW5nKCksXG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICBpZCAgICAgICAgICAgOiBpZCxcbiAgICAgICAgICBwb3NpdGlvbiAgICAgOiBwb3NpdGlvbixcbiAgICAgICAgICB0YXJnZXRFbCAgICAgOiB0YXJnZXQsXG4gICAgICAgICAgYWx3YXlzVmlzaWJsZTogYWx3YXlzVmlzaWJsZSB8fCBmYWxzZSxcbiAgICAgICAgICBndXR0ZXIgICAgICAgOiBndXR0ZXIgfHwgMTUsXG4gICAgICAgICAgZWxPdmVyU3RyZWFtIDogbnVsbCxcbiAgICAgICAgICBlbE91dFN0cmVhbSAgOiBudWxsLFxuICAgICAgICAgIGhlaWdodCAgICAgICA6IDAsXG4gICAgICAgICAgd2lkdGggICAgICAgIDogMCxcbiAgICAgICAgICBlbGVtZW50ICAgICAgOiBfdGVtcGxhdGUuYXNFbGVtZW50KCdjb21wb25lbnQtLXRvb2x0aXAnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGFycm93RWwgICAgICA6IG51bGxcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopIHtcbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdG9vbHRpcE9iai5lbE92ZXJTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh0b29sdGlwT2JqLnRhcmdldEVsLCAnbW91c2VvdmVyJylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBzaG93VG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuXG4gICAgdG9vbHRpcE9iai5lbE91dFN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW91dCcpXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgaGlkZVRvb2xUaXAodG9vbHRpcE9iai5pZCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dUb29sVGlwKGlkKSB7XG4gICAgdmFyIHRvb2x0aXBPYmogPSBnZXRPYmpCeUlEKGlkKTtcblxuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaik7XG4gICAgdHJhbnNpdGlvbkluKHRvb2x0aXBPYmouZWxlbWVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaikge1xuICAgIHZhciBndXR0ZXIgICA9IHRvb2x0aXBPYmouZ3V0dGVyLFxuICAgICAgICB4UG9zICAgICA9IDAsXG4gICAgICAgIHlQb3MgICAgID0gMCxcbiAgICAgICAgdGd0UHJvcHMgPSB0b29sdGlwT2JqLnRhcmdldEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVEwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgKyAoKHRndFByb3BzLndpZHRoIC8gMikgLSAodG9vbHRpcE9iai53aWR0aCAvIDIpKTtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodCAtIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVFIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0ICsgZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkJSKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQ7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbSArIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aCAtIGd1dHRlcjtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgKyAoKHRndFByb3BzLmhlaWdodCAvIDIpIC0gKHRvb2x0aXBPYmouaGVpZ2h0IC8gMikpO1xuICAgIH1cblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICB4OiB4UG9zLFxuICAgICAgeTogeVBvc1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dIb3Jpem9udGFsbHkodG9vbHRpcE9iaikge1xuICAgIHZhciBhcnJvd1Byb3BzID0gdG9vbHRpcE9iai5hcnJvd0VsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5hcnJvd0VsLCB7eDogKHRvb2x0aXBPYmoud2lkdGggLyAyKSAtIChhcnJvd1Byb3BzLndpZHRoIC8gMil9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNlbnRlckFycm93VmVydGljYWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt5OiAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSAtIChhcnJvd1Byb3BzLmhlaWdodCAvIDIpIC0gMn0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZVRvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyYW5zaXRpb25PdXQodG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC41LCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4wNSwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShlbCkge1xuICAgIGdldE9iakJ5RWxlbWVudChlbCkuZm9yRWFjaChmdW5jdGlvbiAodG9vbHRpcCkge1xuICAgICAgaWYgKHRvb2x0aXAuZWxPdmVyU3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdmVyU3RyZWFtLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b29sdGlwLmVsT3V0U3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdXRTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuXG4gICAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQodG9vbHRpcC5pZCk7XG5cbiAgICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5RWxlbWVudChlbCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLnRhcmdldEVsID09PSBlbDtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQb3NpdGlvbnMoKSB7XG4gICAgcmV0dXJuIF9wb3NpdGlvbnM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlcyxcbiAgICBwb3NpdGlvbiAgOiBnZXRQb3NpdGlvbnNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sVGlwVmlldygpOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGlzSW50ZWdlcjogZnVuY3Rpb24gKHN0cikge1xuICAgIHJldHVybiAoL14tP1xcZCskLy50ZXN0KHN0cikpO1xuICB9LFxuXG4gIHJuZE51bWJlcjogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gIH0sXG5cbiAgY2xhbXA6IGZ1bmN0aW9uICh2YWwsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIE1hdGgubWF4KG1pbiwgTWF0aC5taW4obWF4LCB2YWwpKTtcbiAgfSxcblxuICBpblJhbmdlOiBmdW5jdGlvbiAodmFsLCBtaW4sIG1heCkge1xuICAgIHJldHVybiB2YWwgPiBtaW4gJiYgdmFsIDwgbWF4O1xuICB9LFxuXG4gIGRpc3RhbmNlVEw6IGZ1bmN0aW9uIChwb2ludDEsIHBvaW50Mikge1xuICAgIHZhciB4ZCA9IChwb2ludDIubGVmdCAtIHBvaW50MS5sZWZ0KSxcbiAgICAgICAgeWQgPSAocG9pbnQyLnRvcCAtIHBvaW50MS50b3ApO1xuICAgIHJldHVybiBNYXRoLnNxcnQoKHhkICogeGQpICsgKHlkICogeWQpKTtcbiAgfVxuXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBUZXN0IGZvclxuICAgKiBPYmplY3Qge1wiXCI6IHVuZGVmaW5lZH1cbiAgICogT2JqZWN0IHt1bmRlZmluZWQ6IHVuZGVmaW5lZH1cbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzTnVsbDogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBpc251bGwgPSBmYWxzZTtcblxuICAgIGlmIChpcy5mYWxzZXkob2JqKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgIGlmIChwcm9wID09PSB1bmRlZmluZWQgfHwgb2JqW3Byb3BdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaXNudWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBpc251bGw7XG4gIH0sXG5cbiAgZHluYW1pY1NvcnQ6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIGFbcHJvcGVydHldIDwgYltwcm9wZXJ0eV0gPyAtMSA6IGFbcHJvcGVydHldID4gYltwcm9wZXJ0eV0gPyAxIDogMDtcbiAgICB9O1xuICB9LFxuXG4gIHNlYXJjaE9iamVjdHM6IGZ1bmN0aW9uIChvYmosIGtleSwgdmFsKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmpbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9iamVjdHMgPSBvYmplY3RzLmNvbmNhdChzZWFyY2hPYmplY3RzKG9ialtpXSwga2V5LCB2YWwpKTtcbiAgICAgIH0gZWxzZSBpZiAoaSA9PT0ga2V5ICYmIG9ialtrZXldID09PSB2YWwpIHtcbiAgICAgICAgb2JqZWN0cy5wdXNoKG9iaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzO1xuICB9LFxuXG4gIGdldE9iamVjdEZyb21TdHJpbmc6IGZ1bmN0aW9uIChvYmosIHN0cikge1xuICAgIHZhciBpICAgID0gMCxcbiAgICAgICAgcGF0aCA9IHN0ci5zcGxpdCgnLicpLFxuICAgICAgICBsZW4gID0gcGF0aC5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBvYmogPSBvYmpbcGF0aFtpXV07XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgZ2V0T2JqZWN0SW5kZXhGcm9tSWQ6IGZ1bmN0aW9uIChvYmosIGlkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqW2ldICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBvYmpbaV0uaWQgIT09IFwidW5kZWZpbmVkXCIgJiYgb2JqW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvLyBleHRlbmQgYW5kIGRlZXAgZXh0ZW5kIGZyb20gaHR0cDovL3lvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb20vXG4gIGV4dGVuZDogZnVuY3Rpb24gKG91dCkge1xuICAgIG91dCA9IG91dCB8fCB7fTtcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50c1tpXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBvdXRba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICBkZWVwRXh0ZW5kOiBmdW5jdGlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBvYmogPSBhcmd1bWVudHNbaV07XG5cbiAgICAgIGlmICghb2JqKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2Ygb2JqW2tleV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBkZWVwRXh0ZW5kKG91dFtrZXldLCBvYmpba2V5XSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dFtrZXldID0gb2JqW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICAvKipcbiAgICogU2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbiBvZiBTdGFtcHMgLSBodHRwOi8vZXJpY2xlYWRzLmNvbS8yMDE0LzAyL3Byb3RvdHlwYWwtaW5oZXJpdGFuY2Utd2l0aC1zdGFtcHMvXG4gICAqIGh0dHBzOi8vd3d3LmJhcmt3ZWIuY28udWsvYmxvZy9vYmplY3QtY29tcG9zaXRpb24tYW5kLXByb3RvdHlwaWNhbC1pbmhlcml0YW5jZS1pbi1qYXZhc2NyaXB0XG4gICAqXG4gICAqIFByb3RvdHlwZSBvYmplY3QgcmVxdWlyZXMgYSBtZXRob2RzIG9iamVjdCwgcHJpdmF0ZSBjbG9zdXJlcyBhbmQgc3RhdGUgaXMgb3B0aW9uYWxcbiAgICpcbiAgICogQHBhcmFtIHByb3RvdHlwZVxuICAgKiBAcmV0dXJucyBOZXcgb2JqZWN0IHVzaW5nIHByb3RvdHlwZS5tZXRob2RzIGFzIHNvdXJjZVxuICAgKi9cbiAgYmFzaWNGYWN0b3J5OiBmdW5jdGlvbiAocHJvdG90eXBlKSB7XG4gICAgdmFyIHByb3RvID0gcHJvdG90eXBlLFxuICAgICAgICBvYmogICA9IE9iamVjdC5jcmVhdGUocHJvdG8ubWV0aG9kcyk7XG5cbiAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkoJ2Nsb3N1cmUnKSkge1xuICAgICAgcHJvdG8uY2xvc3VyZXMuZm9yRWFjaChmdW5jdGlvbiAoY2xvc3VyZSkge1xuICAgICAgICBjbG9zdXJlLmNhbGwob2JqKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnc3RhdGUnKSkge1xuICAgICAgZm9yICh2YXIga2V5IGluIHByb3RvLnN0YXRlKSB7XG4gICAgICAgIG9ialtrZXldID0gcHJvdG8uc3RhdGVba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gICAqXG4gICAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gICAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAgICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gICAqXG4gICAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICAgKlxuICAgKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gICAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAgICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gICAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAgICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gICAqXG4gICAqL1xuICAvKipcbiAgICogQ29uc3RydWN0cyBhbiBlbnVtZXJhdGlvbiB3aXRoIGtleXMgZXF1YWwgdG8gdGhlaXIgdmFsdWUuXG4gICAqXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9TVFJNTC9rZXltaXJyb3JcbiAgICpcbiAgICogRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqICAgdmFyIENPTE9SUyA9IGtleU1pcnJvcih7Ymx1ZTogbnVsbCwgcmVkOiBudWxsfSk7XG4gICAqICAgdmFyIG15Q29sb3IgPSBDT0xPUlMuYmx1ZTtcbiAgICogICB2YXIgaXNDb2xvclZhbGlkID0gISFDT0xPUlNbbXlDb2xvcl07XG4gICAqXG4gICAqIFRoZSBsYXN0IGxpbmUgY291bGQgbm90IGJlIHBlcmZvcm1lZCBpZiB0aGUgdmFsdWVzIG9mIHRoZSBnZW5lcmF0ZWQgZW51bSB3ZXJlXG4gICAqIG5vdCBlcXVhbCB0byB0aGVpciBrZXlzLlxuICAgKlxuICAgKiAgIElucHV0OiAge2tleTE6IHZhbDEsIGtleTI6IHZhbDJ9XG4gICAqICAgT3V0cHV0OiB7a2V5MToga2V5MSwga2V5Mjoga2V5Mn1cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IG9ialxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqL1xuICBrZXlNaXJyb3I6IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcmV0ID0ge307XG4gICAgdmFyIGtleTtcbiAgICBpZiAoIShvYmogaW5zdGFuY2VvZiBPYmplY3QgJiYgIUFycmF5LmlzQXJyYXkob2JqKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigna2V5TWlycm9yKC4uLik6IEFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0LicpO1xuICAgIH1cbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXRba2V5XSA9IGtleTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG59OyIsIi8qKlxuICogIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG4hZnVuY3Rpb24odCxlKXtcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZT9tb2R1bGUuZXhwb3J0cz1lKCk6XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShlKTp0LkltbXV0YWJsZT1lKCl9KHRoaXMsZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiB0KHQsZSl7ZSYmKHQucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoZS5wcm90b3R5cGUpKSx0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj10fWZ1bmN0aW9uIGUodCl7cmV0dXJuIHQudmFsdWU9ITEsdH1mdW5jdGlvbiByKHQpe3QmJih0LnZhbHVlPSEwKX1mdW5jdGlvbiBuKCl7fWZ1bmN0aW9uIGkodCxlKXtlPWV8fDA7Zm9yKHZhciByPU1hdGgubWF4KDAsdC5sZW5ndGgtZSksbj1BcnJheShyKSxpPTA7cj5pO2krKyluW2ldPXRbaStlXTtyZXR1cm4gbn1mdW5jdGlvbiBvKHQpe3JldHVybiB2b2lkIDA9PT10LnNpemUmJih0LnNpemU9dC5fX2l0ZXJhdGUocykpLHQuc2l6ZX1mdW5jdGlvbiB1KHQsZSl7aWYoXCJudW1iZXJcIiE9dHlwZW9mIGUpe3ZhciByPWU+Pj4wO2lmKFwiXCIrciE9PWV8fDQyOTQ5NjcyOTU9PT1yKXJldHVybiBOYU47ZT1yfXJldHVybiAwPmU/byh0KStlOmV9ZnVuY3Rpb24gcygpe3JldHVybiEwfWZ1bmN0aW9uIGEodCxlLHIpe3JldHVybigwPT09dHx8dm9pZCAwIT09ciYmLXI+PXQpJiYodm9pZCAwPT09ZXx8dm9pZCAwIT09ciYmZT49cil9ZnVuY3Rpb24gaCh0LGUpe3JldHVybiBjKHQsZSwwKX1mdW5jdGlvbiBmKHQsZSl7cmV0dXJuIGModCxlLGUpfWZ1bmN0aW9uIGModCxlLHIpe3JldHVybiB2b2lkIDA9PT10P3I6MD50P01hdGgubWF4KDAsZSt0KTp2b2lkIDA9PT1lP3Q6TWF0aC5taW4oZSx0KX1mdW5jdGlvbiBfKHQpe3JldHVybiB5KHQpP3Q6Tyh0KX1mdW5jdGlvbiBwKHQpe3JldHVybiBkKHQpP3Q6eCh0KX1mdW5jdGlvbiB2KHQpe3JldHVybiBtKHQpP3Q6ayh0KX1mdW5jdGlvbiBsKHQpe3JldHVybiB5KHQpJiYhZyh0KT90OkEodCl9ZnVuY3Rpb24geSh0KXtyZXR1cm4hKCF0fHwhdFt2cl0pfWZ1bmN0aW9uIGQodCl7cmV0dXJuISghdHx8IXRbbHJdKX1mdW5jdGlvbiBtKHQpe3JldHVybiEoIXR8fCF0W3lyXSl9ZnVuY3Rpb24gZyh0KXtyZXR1cm4gZCh0KXx8bSh0KX1mdW5jdGlvbiB3KHQpe3JldHVybiEoIXR8fCF0W2RyXSl9ZnVuY3Rpb24gUyh0KXt0aGlzLm5leHQ9dH1mdW5jdGlvbiB6KHQsZSxyLG4pe3ZhciBpPTA9PT10P2U6MT09PXQ/cjpbZSxyXTtyZXR1cm4gbj9uLnZhbHVlPWk6bj17dmFsdWU6aSxkb25lOiExfSxufWZ1bmN0aW9uIEkoKXtyZXR1cm57dmFsdWU6dm9pZCAwLGRvbmU6ITB9fWZ1bmN0aW9uIGIodCl7cmV0dXJuISFNKHQpfWZ1bmN0aW9uIHEodCl7cmV0dXJuIHQmJlwiZnVuY3Rpb25cIj09dHlwZW9mIHQubmV4dH1mdW5jdGlvbiBEKHQpe3ZhciBlPU0odCk7cmV0dXJuIGUmJmUuY2FsbCh0KX1mdW5jdGlvbiBNKHQpe3ZhciBlPXQmJihTciYmdFtTcl18fHRbenJdKTtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiBlP2U6dm9pZCAwfWZ1bmN0aW9uIEUodCl7cmV0dXJuIHQmJlwibnVtYmVyXCI9PXR5cGVvZiB0Lmxlbmd0aH1mdW5jdGlvbiBPKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9UKCk6eSh0KT90LnRvU2VxKCk6Qyh0KX1mdW5jdGlvbiB4KHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9UKCkudG9LZXllZFNlcSgpOnkodCk/ZCh0KT90LnRvU2VxKCk6dC5mcm9tRW50cnlTZXEoKTpXKHQpfWZ1bmN0aW9uIGsodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP2QodCk/dC5lbnRyeVNlcSgpOnQudG9JbmRleGVkU2VxKCk6Qih0KX1mdW5jdGlvbiBBKHQpe3JldHVybihudWxsPT09dHx8dm9pZCAwPT09dD9UKCk6eSh0KT9kKHQpP3QuZW50cnlTZXEoKTp0OkIodCkpLnRvU2V0U2VxKCl9ZnVuY3Rpb24gaih0KXt0aGlzLl9hcnJheT10LHRoaXMuc2l6ZT10Lmxlbmd0aH1mdW5jdGlvbiBSKHQpe3ZhciBlPU9iamVjdC5rZXlzKHQpO3RoaXMuX29iamVjdD10LHRoaXMuX2tleXM9ZSxcbiAgdGhpcy5zaXplPWUubGVuZ3RofWZ1bmN0aW9uIFUodCl7dGhpcy5faXRlcmFibGU9dCx0aGlzLnNpemU9dC5sZW5ndGh8fHQuc2l6ZX1mdW5jdGlvbiBLKHQpe3RoaXMuX2l0ZXJhdG9yPXQsdGhpcy5faXRlcmF0b3JDYWNoZT1bXX1mdW5jdGlvbiBMKHQpe3JldHVybiEoIXR8fCF0W2JyXSl9ZnVuY3Rpb24gVCgpe3JldHVybiBxcnx8KHFyPW5ldyBqKFtdKSl9ZnVuY3Rpb24gVyh0KXt2YXIgZT1BcnJheS5pc0FycmF5KHQpP25ldyBqKHQpLmZyb21FbnRyeVNlcSgpOnEodCk/bmV3IEsodCkuZnJvbUVudHJ5U2VxKCk6Yih0KT9uZXcgVSh0KS5mcm9tRW50cnlTZXEoKTpcIm9iamVjdFwiPT10eXBlb2YgdD9uZXcgUih0KTp2b2lkIDA7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiBbaywgdl0gZW50cmllcywgb3Iga2V5ZWQgb2JqZWN0OiBcIit0KTtyZXR1cm4gZX1mdW5jdGlvbiBCKHQpe3ZhciBlPUoodCk7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiB2YWx1ZXM6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEModCl7dmFyIGU9Sih0KXx8XCJvYmplY3RcIj09dHlwZW9mIHQmJm5ldyBSKHQpO2lmKCFlKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBBcnJheSBvciBpdGVyYWJsZSBvYmplY3Qgb2YgdmFsdWVzLCBvciBrZXllZCBvYmplY3Q6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEoodCl7cmV0dXJuIEUodCk/bmV3IGoodCk6cSh0KT9uZXcgSyh0KTpiKHQpP25ldyBVKHQpOnZvaWQgMH1mdW5jdGlvbiBOKHQsZSxyLG4pe3ZhciBpPXQuX2NhY2hlO2lmKGkpe2Zvcih2YXIgbz1pLmxlbmd0aC0xLHU9MDtvPj11O3UrKyl7dmFyIHM9aVtyP28tdTp1XTtpZihlKHNbMV0sbj9zWzBdOnUsdCk9PT0hMSlyZXR1cm4gdSsxfXJldHVybiB1fXJldHVybiB0Ll9faXRlcmF0ZVVuY2FjaGVkKGUscil9ZnVuY3Rpb24gUCh0LGUscixuKXt2YXIgaT10Ll9jYWNoZTtpZihpKXt2YXIgbz1pLmxlbmd0aC0xLHU9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdD1pW3I/by11OnVdO3JldHVybiB1Kys+bz9JKCk6eihlLG4/dFswXTp1LTEsdFsxXSl9KX1yZXR1cm4gdC5fX2l0ZXJhdG9yVW5jYWNoZWQoZSxyKX1mdW5jdGlvbiBIKCl7dGhyb3cgVHlwZUVycm9yKFwiQWJzdHJhY3RcIil9ZnVuY3Rpb24gVigpe31mdW5jdGlvbiBZKCl7fWZ1bmN0aW9uIFEoKXt9ZnVuY3Rpb24gWCh0LGUpe2lmKHQ9PT1lfHx0IT09dCYmZSE9PWUpcmV0dXJuITA7aWYoIXR8fCFlKXJldHVybiExO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudmFsdWVPZiYmXCJmdW5jdGlvblwiPT10eXBlb2YgZS52YWx1ZU9mKXtpZih0PXQudmFsdWVPZigpLGU9ZS52YWx1ZU9mKCksdD09PWV8fHQhPT10JiZlIT09ZSlyZXR1cm4hMDtpZighdHx8IWUpcmV0dXJuITF9cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5lcXVhbHMmJlwiZnVuY3Rpb25cIj09dHlwZW9mIGUuZXF1YWxzJiZ0LmVxdWFscyhlKT8hMDohMX1mdW5jdGlvbiBGKHQsZSl7cmV0dXJuIGU/RyhlLHQsXCJcIix7XCJcIjp0fSk6Wih0KX1mdW5jdGlvbiBHKHQsZSxyLG4pe3JldHVybiBBcnJheS5pc0FycmF5KGUpP3QuY2FsbChuLHIsayhlKS5tYXAoZnVuY3Rpb24ocixuKXtyZXR1cm4gRyh0LHIsbixlKX0pKTokKGUpP3QuY2FsbChuLHIseChlKS5tYXAoZnVuY3Rpb24ocixuKXtyZXR1cm4gRyh0LHIsbixlKX0pKTplfWZ1bmN0aW9uIFoodCl7cmV0dXJuIEFycmF5LmlzQXJyYXkodCk/ayh0KS5tYXAoWikudG9MaXN0KCk6JCh0KT94KHQpLm1hcChaKS50b01hcCgpOnR9ZnVuY3Rpb24gJCh0KXtyZXR1cm4gdCYmKHQuY29uc3RydWN0b3I9PT1PYmplY3R8fHZvaWQgMD09PXQuY29uc3RydWN0b3IpfWZ1bmN0aW9uIHR0KHQpe3JldHVybiB0Pj4+MSYxMDczNzQxODI0fDMyMjEyMjU0NzEmdH1mdW5jdGlvbiBldCh0KXtpZih0PT09ITF8fG51bGw9PT10fHx2b2lkIDA9PT10KXJldHVybiAwO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudmFsdWVPZiYmKHQ9dC52YWx1ZU9mKCksXG4gIHQ9PT0hMXx8bnVsbD09PXR8fHZvaWQgMD09PXQpKXJldHVybiAwO2lmKHQ9PT0hMClyZXR1cm4gMTt2YXIgZT10eXBlb2YgdDtpZihcIm51bWJlclwiPT09ZSl7dmFyIHI9MHx0O2ZvcihyIT09dCYmKHJePTQyOTQ5NjcyOTUqdCk7dD40Mjk0OTY3Mjk1Oyl0Lz00Mjk0OTY3Mjk1LHJePXQ7cmV0dXJuIHR0KHIpfWlmKFwic3RyaW5nXCI9PT1lKXJldHVybiB0Lmxlbmd0aD5qcj9ydCh0KTpudCh0KTtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lmhhc2hDb2RlKXJldHVybiB0Lmhhc2hDb2RlKCk7aWYoXCJvYmplY3RcIj09PWUpcmV0dXJuIGl0KHQpO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQudG9TdHJpbmcpcmV0dXJuIG50KFwiXCIrdCk7dGhyb3cgRXJyb3IoXCJWYWx1ZSB0eXBlIFwiK2UrXCIgY2Fubm90IGJlIGhhc2hlZC5cIil9ZnVuY3Rpb24gcnQodCl7dmFyIGU9S3JbdF07cmV0dXJuIHZvaWQgMD09PWUmJihlPW50KHQpLFVyPT09UnImJihVcj0wLEtyPXt9KSxVcisrLEtyW3RdPWUpLGV9ZnVuY3Rpb24gbnQodCl7Zm9yKHZhciBlPTAscj0wO3QubGVuZ3RoPnI7cisrKWU9MzEqZSt0LmNoYXJDb2RlQXQocil8MDtyZXR1cm4gdHQoZSl9ZnVuY3Rpb24gaXQodCl7dmFyIGU7aWYoeHImJihlPURyLmdldCh0KSx2b2lkIDAhPT1lKSlyZXR1cm4gZTtpZihlPXRbQXJdLHZvaWQgMCE9PWUpcmV0dXJuIGU7aWYoIU9yKXtpZihlPXQucHJvcGVydHlJc0VudW1lcmFibGUmJnQucHJvcGVydHlJc0VudW1lcmFibGVbQXJdLHZvaWQgMCE9PWUpcmV0dXJuIGU7aWYoZT1vdCh0KSx2b2lkIDAhPT1lKXJldHVybiBlfWlmKGU9KytrciwxMDczNzQxODI0JmtyJiYoa3I9MCkseHIpRHIuc2V0KHQsZSk7ZWxzZXtpZih2b2lkIDAhPT1FciYmRXIodCk9PT0hMSl0aHJvdyBFcnJvcihcIk5vbi1leHRlbnNpYmxlIG9iamVjdHMgYXJlIG5vdCBhbGxvd2VkIGFzIGtleXMuXCIpO2lmKE9yKU9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LEFyLHtlbnVtZXJhYmxlOiExLGNvbmZpZ3VyYWJsZTohMSx3cml0YWJsZTohMSx2YWx1ZTplfSk7ZWxzZSBpZih2b2lkIDAhPT10LnByb3BlcnR5SXNFbnVtZXJhYmxlJiZ0LnByb3BlcnR5SXNFbnVtZXJhYmxlPT09dC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUpdC5wcm9wZXJ0eUlzRW51bWVyYWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LHQucHJvcGVydHlJc0VudW1lcmFibGVbQXJdPWU7ZWxzZXtpZih2b2lkIDA9PT10Lm5vZGVUeXBlKXRocm93IEVycm9yKFwiVW5hYmxlIHRvIHNldCBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IG9uIG9iamVjdC5cIik7dFtBcl09ZX19cmV0dXJuIGV9ZnVuY3Rpb24gb3QodCl7aWYodCYmdC5ub2RlVHlwZT4wKXN3aXRjaCh0Lm5vZGVUeXBlKXtjYXNlIDE6cmV0dXJuIHQudW5pcXVlSUQ7Y2FzZSA5OnJldHVybiB0LmRvY3VtZW50RWxlbWVudCYmdC5kb2N1bWVudEVsZW1lbnQudW5pcXVlSUR9fWZ1bmN0aW9uIHV0KHQsZSl7aWYoIXQpdGhyb3cgRXJyb3IoZSl9ZnVuY3Rpb24gc3QodCl7dXQodCE9PTEvMCxcIkNhbm5vdCBwZXJmb3JtIHRoaXMgYWN0aW9uIHdpdGggYW4gaW5maW5pdGUgc2l6ZS5cIil9ZnVuY3Rpb24gYXQodCxlKXt0aGlzLl9pdGVyPXQsdGhpcy5fdXNlS2V5cz1lLHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gaHQodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gZnQodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gY3QodCl7dGhpcy5faXRlcj10LHRoaXMuc2l6ZT10LnNpemV9ZnVuY3Rpb24gX3QodCl7dmFyIGU9anQodCk7cmV0dXJuIGUuX2l0ZXI9dCxlLnNpemU9dC5zaXplLGUuZmxpcD1mdW5jdGlvbigpe3JldHVybiB0fSxlLnJldmVyc2U9ZnVuY3Rpb24oKXt2YXIgZT10LnJldmVyc2UuYXBwbHkodGhpcyk7cmV0dXJuIGUuZmxpcD1mdW5jdGlvbigpe3JldHVybiB0LnJldmVyc2UoKX0sZX0sZS5oYXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSk7XG59LGUuaW5jbHVkZXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaGFzKGUpfSxlLmNhY2hlUmVzdWx0PVJ0LGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXt2YXIgbj10aGlzO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBlKHIsdCxuKSE9PSExfSxyKX0sZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXtpZihlPT09d3Ipe3ZhciBuPXQuX19pdGVyYXRvcihlLHIpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0PW4ubmV4dCgpO2lmKCF0LmRvbmUpe3ZhciBlPXQudmFsdWVbMF07dC52YWx1ZVswXT10LnZhbHVlWzFdLHQudmFsdWVbMV09ZX1yZXR1cm4gdH0pfXJldHVybiB0Ll9faXRlcmF0b3IoZT09PWdyP21yOmdyLHIpfSxlfWZ1bmN0aW9uIHB0KHQsZSxyKXt2YXIgbj1qdCh0KTtyZXR1cm4gbi5zaXplPXQuc2l6ZSxuLmhhcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5oYXMoZSl9LG4uZ2V0PWZ1bmN0aW9uKG4saSl7dmFyIG89dC5nZXQobixjcik7cmV0dXJuIG89PT1jcj9pOmUuY2FsbChyLG8sbix0KX0sbi5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXRoaXM7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQsaSx1KXtyZXR1cm4gbihlLmNhbGwocix0LGksdSksaSxvKSE9PSExfSxpKX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10Ll9faXRlcmF0b3Iod3IsaSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGk9by5uZXh0KCk7aWYoaS5kb25lKXJldHVybiBpO3ZhciB1PWkudmFsdWUscz11WzBdO3JldHVybiB6KG4scyxlLmNhbGwocix1WzFdLHMsdCksaSl9KX0sbn1mdW5jdGlvbiB2dCh0LGUpe3ZhciByPWp0KHQpO3JldHVybiByLl9pdGVyPXQsci5zaXplPXQuc2l6ZSxyLnJldmVyc2U9ZnVuY3Rpb24oKXtyZXR1cm4gdH0sdC5mbGlwJiYoci5mbGlwPWZ1bmN0aW9uKCl7dmFyIGU9X3QodCk7cmV0dXJuIGUucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0LmZsaXAoKX0sZX0pLHIuZ2V0PWZ1bmN0aW9uKHIsbil7cmV0dXJuIHQuZ2V0KGU/cjotMS1yLG4pfSxyLmhhcz1mdW5jdGlvbihyKXtyZXR1cm4gdC5oYXMoZT9yOi0xLXIpfSxyLmluY2x1ZGVzPWZ1bmN0aW9uKGUpe3JldHVybiB0LmluY2x1ZGVzKGUpfSxyLmNhY2hlUmVzdWx0PVJ0LHIuX19pdGVyYXRlPWZ1bmN0aW9uKGUscil7dmFyIG49dGhpcztyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxyKXtyZXR1cm4gZSh0LHIsbil9LCFyKX0sci5fX2l0ZXJhdG9yPWZ1bmN0aW9uKGUscil7cmV0dXJuIHQuX19pdGVyYXRvcihlLCFyKX0scn1mdW5jdGlvbiBsdCh0LGUscixuKXt2YXIgaT1qdCh0KTtyZXR1cm4gbiYmKGkuaGFzPWZ1bmN0aW9uKG4pe3ZhciBpPXQuZ2V0KG4sY3IpO3JldHVybiBpIT09Y3ImJiEhZS5jYWxsKHIsaSxuLHQpfSxpLmdldD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuZ2V0KG4sY3IpO3JldHVybiBvIT09Y3ImJmUuY2FsbChyLG8sbix0KT9vOml9KSxpLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcyxzPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQsbyxhKXtyZXR1cm4gZS5jYWxsKHIsdCxvLGEpPyhzKyssaSh0LG4/bzpzLTEsdSkpOnZvaWQgMH0sbyksc30saS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10Ll9faXRlcmF0b3Iod3Isbykscz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7Oyl7dmFyIG89dS5uZXh0KCk7aWYoby5kb25lKXJldHVybiBvO3ZhciBhPW8udmFsdWUsaD1hWzBdLGY9YVsxXTtpZihlLmNhbGwocixmLGgsdCkpcmV0dXJuIHooaSxuP2g6cysrLGYsbyl9fSl9LGl9ZnVuY3Rpb24geXQodCxlLHIpe3ZhciBuPUx0KCkuYXNNdXRhYmxlKCk7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKGksbyl7bi51cGRhdGUoZS5jYWxsKHIsaSxvLHQpLDAsZnVuY3Rpb24odCl7cmV0dXJuIHQrMX0pfSksbi5hc0ltbXV0YWJsZSgpfWZ1bmN0aW9uIGR0KHQsZSxyKXt2YXIgbj1kKHQpLGk9KHcodCk/SWUoKTpMdCgpKS5hc011dGFibGUoKTtcbiAgdC5fX2l0ZXJhdGUoZnVuY3Rpb24obyx1KXtpLnVwZGF0ZShlLmNhbGwocixvLHUsdCksZnVuY3Rpb24odCl7cmV0dXJuIHQ9dHx8W10sdC5wdXNoKG4/W3Usb106byksdH0pfSk7dmFyIG89QXQodCk7cmV0dXJuIGkubWFwKGZ1bmN0aW9uKGUpe3JldHVybiBPdCh0LG8oZSkpfSl9ZnVuY3Rpb24gbXQodCxlLHIsbil7dmFyIGk9dC5zaXplO2lmKHZvaWQgMCE9PWUmJihlPTB8ZSksdm9pZCAwIT09ciYmKHI9MHxyKSxhKGUscixpKSlyZXR1cm4gdDt2YXIgbz1oKGUsaSkscz1mKHIsaSk7aWYobyE9PW98fHMhPT1zKXJldHVybiBtdCh0LnRvU2VxKCkuY2FjaGVSZXN1bHQoKSxlLHIsbik7dmFyIGMsXz1zLW87Xz09PV8mJihjPTA+Xz8wOl8pO3ZhciBwPWp0KHQpO3JldHVybiBwLnNpemU9MD09PWM/Yzp0LnNpemUmJmN8fHZvaWQgMCwhbiYmTCh0KSYmYz49MCYmKHAuZ2V0PWZ1bmN0aW9uKGUscil7cmV0dXJuIGU9dSh0aGlzLGUpLGU+PTAmJmM+ZT90LmdldChlK28scik6cn0pLHAuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXt2YXIgaT10aGlzO2lmKDA9PT1jKXJldHVybiAwO2lmKHIpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUoZSxyKTt2YXIgdT0wLHM9ITAsYT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBzJiYocz11Kys8byk/dm9pZCAwOihhKyssZSh0LG4/cjphLTEsaSkhPT0hMSYmYSE9PWMpfSksYX0scC5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oZSxyKXtpZigwIT09YyYmcilyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IoZSxyKTt2YXIgaT0wIT09YyYmdC5fX2l0ZXJhdG9yKGUsciksdT0wLHM9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoO3UrKzxvOylpLm5leHQoKTtpZigrK3M+YylyZXR1cm4gSSgpO3ZhciB0PWkubmV4dCgpO3JldHVybiBufHxlPT09Z3I/dDplPT09bXI/eihlLHMtMSx2b2lkIDAsdCk6eihlLHMtMSx0LnZhbHVlWzFdLHQpfSl9LHB9ZnVuY3Rpb24gZ3QodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztpZihpKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKG4saSk7dmFyIHU9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpLHMpe3JldHVybiBlLmNhbGwocix0LGkscykmJisrdSYmbih0LGksbyl9KSx1fSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXRoaXM7aWYoaSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IobixpKTt2YXIgdT10Ll9faXRlcmF0b3Iod3IsaSkscz0hMDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZighcylyZXR1cm4gSSgpO3ZhciB0PXUubmV4dCgpO2lmKHQuZG9uZSlyZXR1cm4gdDt2YXIgaT10LnZhbHVlLGE9aVswXSxoPWlbMV07cmV0dXJuIGUuY2FsbChyLGgsYSxvKT9uPT09d3I/dDp6KG4sYSxoLHQpOihzPSExLEkoKSl9KX0sbn1mdW5jdGlvbiB3dCh0LGUscixuKXt2YXIgaT1qdCh0KTtyZXR1cm4gaS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihpLG8pe3ZhciB1PXRoaXM7aWYobylyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShpLG8pO3ZhciBzPSEwLGE9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxvLGgpe3JldHVybiBzJiYocz1lLmNhbGwocix0LG8saCkpP3ZvaWQgMDooYSsrLGkodCxuP286YS0xLHUpKX0pLGF9LGkuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcztpZihvKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihpLG8pO3ZhciBzPXQuX19pdGVyYXRvcih3cixvKSxhPSEwLGg9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdCxvLGY7ZG97aWYodD1zLm5leHQoKSx0LmRvbmUpcmV0dXJuIG58fGk9PT1ncj90Omk9PT1tcj96KGksaCsrLHZvaWQgMCx0KTp6KGksaCsrLHQudmFsdWVbMV0sdCk7dmFyIGM9dC52YWx1ZTtvPWNbMF0sZj1jWzFdLGEmJihhPWUuY2FsbChyLGYsbyx1KSl9d2hpbGUoYSk7XG4gIHJldHVybiBpPT09d3I/dDp6KGksbyxmLHQpfSl9LGl9ZnVuY3Rpb24gU3QodCxlKXt2YXIgcj1kKHQpLG49W3RdLmNvbmNhdChlKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHkodCk/ciYmKHQ9cCh0KSk6dD1yP1codCk6QihBcnJheS5pc0FycmF5KHQpP3Q6W3RdKSx0fSkuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSk7aWYoMD09PW4ubGVuZ3RoKXJldHVybiB0O2lmKDE9PT1uLmxlbmd0aCl7dmFyIGk9blswXTtpZihpPT09dHx8ciYmZChpKXx8bSh0KSYmbShpKSlyZXR1cm4gaX12YXIgbz1uZXcgaihuKTtyZXR1cm4gcj9vPW8udG9LZXllZFNlcSgpOm0odCl8fChvPW8udG9TZXRTZXEoKSksbz1vLmZsYXR0ZW4oITApLG8uc2l6ZT1uLnJlZHVjZShmdW5jdGlvbih0LGUpe2lmKHZvaWQgMCE9PXQpe3ZhciByPWUuc2l6ZTtpZih2b2lkIDAhPT1yKXJldHVybiB0K3J9fSwwKSxvfWZ1bmN0aW9uIHp0KHQsZSxyKXt2YXIgbj1qdCh0KTtyZXR1cm4gbi5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihuLGkpe2Z1bmN0aW9uIG8odCxhKXt2YXIgaD10aGlzO3QuX19pdGVyYXRlKGZ1bmN0aW9uKHQsaSl7cmV0dXJuKCFlfHxlPmEpJiZ5KHQpP28odCxhKzEpOm4odCxyP2k6dSsrLGgpPT09ITEmJihzPSEwKSwhc30saSl9dmFyIHU9MCxzPSExO3JldHVybiBvKHQsMCksdX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10Ll9faXRlcmF0b3IobixpKSx1PVtdLHM9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoO287KXt2YXIgdD1vLm5leHQoKTtpZih0LmRvbmU9PT0hMSl7dmFyIGE9dC52YWx1ZTtpZihuPT09d3ImJihhPWFbMV0pLGUmJiEoZT51Lmxlbmd0aCl8fCF5KGEpKXJldHVybiByP3Q6eihuLHMrKyxhLHQpO3UucHVzaChvKSxvPWEuX19pdGVyYXRvcihuLGkpfWVsc2Ugbz11LnBvcCgpfXJldHVybiBJKCl9KX0sbn1mdW5jdGlvbiBJdCh0LGUscil7dmFyIG49QXQodCk7cmV0dXJuIHQudG9TZXEoKS5tYXAoZnVuY3Rpb24oaSxvKXtyZXR1cm4gbihlLmNhbGwocixpLG8sdCkpfSkuZmxhdHRlbighMCl9ZnVuY3Rpb24gYnQodCxlKXt2YXIgcj1qdCh0KTtyZXR1cm4gci5zaXplPXQuc2l6ZSYmMip0LnNpemUtMSxyLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKHIsbil7dmFyIGk9dGhpcyxvPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQpe3JldHVybighb3x8cihlLG8rKyxpKSE9PSExKSYmcih0LG8rKyxpKSE9PSExfSxuKSxvfSxyLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihyLG4pe3ZhciBpLG89dC5fX2l0ZXJhdG9yKGdyLG4pLHU9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtyZXR1cm4oIWl8fHUlMikmJihpPW8ubmV4dCgpLGkuZG9uZSk/aTp1JTI/eihyLHUrKyxlKTp6KHIsdSsrLGkudmFsdWUsaSl9KX0scn1mdW5jdGlvbiBxdCh0LGUscil7ZXx8KGU9VXQpO3ZhciBuPWQodCksaT0wLG89dC50b1NlcSgpLm1hcChmdW5jdGlvbihlLG4pe3JldHVybltuLGUsaSsrLHI/cihlLG4sdCk6ZV19KS50b0FycmF5KCk7cmV0dXJuIG8uc29ydChmdW5jdGlvbih0LHIpe3JldHVybiBlKHRbM10sclszXSl8fHRbMl0tclsyXX0pLmZvckVhY2gobj9mdW5jdGlvbih0LGUpe29bZV0ubGVuZ3RoPTJ9OmZ1bmN0aW9uKHQsZSl7b1tlXT10WzFdfSksbj94KG8pOm0odCk/ayhvKTpBKG8pfWZ1bmN0aW9uIER0KHQsZSxyKXtpZihlfHwoZT1VdCkscil7dmFyIG49dC50b1NlcSgpLm1hcChmdW5jdGlvbihlLG4pe3JldHVybltlLHIoZSxuLHQpXX0pLnJlZHVjZShmdW5jdGlvbih0LHIpe3JldHVybiBNdChlLHRbMV0sclsxXSk/cjp0fSk7cmV0dXJuIG4mJm5bMF19cmV0dXJuIHQucmVkdWNlKGZ1bmN0aW9uKHQscil7cmV0dXJuIE10KGUsdCxyKT9yOnR9KX1mdW5jdGlvbiBNdCh0LGUscil7dmFyIG49dChyLGUpO3JldHVybiAwPT09biYmciE9PWUmJih2b2lkIDA9PT1yfHxudWxsPT09cnx8ciE9PXIpfHxuPjB9ZnVuY3Rpb24gRXQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLnNpemU9bmV3IGoocikubWFwKGZ1bmN0aW9uKHQpe1xuICByZXR1cm4gdC5zaXplfSkubWluKCksbi5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHIsbj10aGlzLl9faXRlcmF0b3IoZ3IsZSksaT0wOyEocj1uLm5leHQoKSkuZG9uZSYmdChyLnZhbHVlLGkrKyx0aGlzKSE9PSExOyk7cmV0dXJuIGl9LG4uX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHQsbil7dmFyIGk9ci5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQ9Xyh0KSxEKG4/dC5yZXZlcnNlKCk6dCl9KSxvPTAsdT0hMTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgcjtyZXR1cm4gdXx8KHI9aS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQubmV4dCgpfSksdT1yLnNvbWUoZnVuY3Rpb24odCl7cmV0dXJuIHQuZG9uZX0pKSx1P0koKTp6KHQsbysrLGUuYXBwbHkobnVsbCxyLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdC52YWx1ZX0pKSl9KX0sbn1mdW5jdGlvbiBPdCh0LGUpe3JldHVybiBMKHQpP2U6dC5jb25zdHJ1Y3RvcihlKX1mdW5jdGlvbiB4dCh0KXtpZih0IT09T2JqZWN0KHQpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBbSywgVl0gdHVwbGU6IFwiK3QpfWZ1bmN0aW9uIGt0KHQpe3JldHVybiBzdCh0LnNpemUpLG8odCl9ZnVuY3Rpb24gQXQodCl7cmV0dXJuIGQodCk/cDptKHQpP3Y6bH1mdW5jdGlvbiBqdCh0KXtyZXR1cm4gT2JqZWN0LmNyZWF0ZSgoZCh0KT94Om0odCk/azpBKS5wcm90b3R5cGUpfWZ1bmN0aW9uIFJ0KCl7cmV0dXJuIHRoaXMuX2l0ZXIuY2FjaGVSZXN1bHQ/KHRoaXMuX2l0ZXIuY2FjaGVSZXN1bHQoKSx0aGlzLnNpemU9dGhpcy5faXRlci5zaXplLHRoaXMpOk8ucHJvdG90eXBlLmNhY2hlUmVzdWx0LmNhbGwodGhpcyl9ZnVuY3Rpb24gVXQodCxlKXtyZXR1cm4gdD5lPzE6ZT50Py0xOjB9ZnVuY3Rpb24gS3QodCl7dmFyIGU9RCh0KTtpZighZSl7aWYoIUUodCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGl0ZXJhYmxlIG9yIGFycmF5LWxpa2U6IFwiK3QpO2U9RChfKHQpKX1yZXR1cm4gZX1mdW5jdGlvbiBMdCh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/UXQoKTpUdCh0KSYmIXcodCk/dDpRdCgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9cCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0LHIpe3JldHVybiBlLnNldChyLHQpfSl9KX1mdW5jdGlvbiBUdCh0KXtyZXR1cm4hKCF0fHwhdFtMcl0pfWZ1bmN0aW9uIFd0KHQsZSl7dGhpcy5vd25lcklEPXQsdGhpcy5lbnRyaWVzPWV9ZnVuY3Rpb24gQnQodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMuYml0bWFwPWUsdGhpcy5ub2Rlcz1yfWZ1bmN0aW9uIEN0KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmNvdW50PWUsdGhpcy5ub2Rlcz1yfWZ1bmN0aW9uIEp0KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmtleUhhc2g9ZSx0aGlzLmVudHJpZXM9cn1mdW5jdGlvbiBOdCh0LGUscil7dGhpcy5vd25lcklEPXQsdGhpcy5rZXlIYXNoPWUsdGhpcy5lbnRyeT1yfWZ1bmN0aW9uIFB0KHQsZSxyKXt0aGlzLl90eXBlPWUsdGhpcy5fcmV2ZXJzZT1yLHRoaXMuX3N0YWNrPXQuX3Jvb3QmJlZ0KHQuX3Jvb3QpfWZ1bmN0aW9uIEh0KHQsZSl7cmV0dXJuIHoodCxlWzBdLGVbMV0pfWZ1bmN0aW9uIFZ0KHQsZSl7cmV0dXJue25vZGU6dCxpbmRleDowLF9fcHJldjplfX1mdW5jdGlvbiBZdCh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKFRyKTtyZXR1cm4gaS5zaXplPXQsaS5fcm9vdD1lLGkuX19vd25lcklEPXIsaS5fX2hhc2g9bixpLl9fYWx0ZXJlZD0hMSxpfWZ1bmN0aW9uIFF0KCl7cmV0dXJuIFdyfHwoV3I9WXQoMCkpfWZ1bmN0aW9uIFh0KHQscixuKXt2YXIgaSxvO2lmKHQuX3Jvb3Qpe3ZhciB1PWUoX3IpLHM9ZShwcik7aWYoaT1GdCh0Ll9yb290LHQuX19vd25lcklELDAsdm9pZCAwLHIsbix1LHMpLCFzLnZhbHVlKXJldHVybiB0O289dC5zaXplKyh1LnZhbHVlP249PT1jcj8tMToxOjApfWVsc2V7aWYobj09PWNyKXJldHVybiB0O289MSxpPW5ldyBXdCh0Ll9fb3duZXJJRCxbW3Isbl1dKX1yZXR1cm4gdC5fX293bmVySUQ/KHQuc2l6ZT1vLFxuICB0Ll9yb290PWksdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOmk/WXQobyxpKTpRdCgpfWZ1bmN0aW9uIEZ0KHQsZSxuLGksbyx1LHMsYSl7cmV0dXJuIHQ/dC51cGRhdGUoZSxuLGksbyx1LHMsYSk6dT09PWNyP3Q6KHIoYSkscihzKSxuZXcgTnQoZSxpLFtvLHVdKSl9ZnVuY3Rpb24gR3QodCl7cmV0dXJuIHQuY29uc3RydWN0b3I9PT1OdHx8dC5jb25zdHJ1Y3Rvcj09PUp0fWZ1bmN0aW9uIFp0KHQsZSxyLG4saSl7aWYodC5rZXlIYXNoPT09bilyZXR1cm4gbmV3IEp0KGUsbixbdC5lbnRyeSxpXSk7dmFyIG8sdT0oMD09PXI/dC5rZXlIYXNoOnQua2V5SGFzaD4+PnIpJmZyLHM9KDA9PT1yP246bj4+PnIpJmZyLGE9dT09PXM/W1p0KHQsZSxyK2FyLG4saSldOihvPW5ldyBOdChlLG4saSkscz51P1t0LG9dOltvLHRdKTtyZXR1cm4gbmV3IEJ0KGUsMTw8dXwxPDxzLGEpfWZ1bmN0aW9uICR0KHQsZSxyLGkpe3R8fCh0PW5ldyBuKTtmb3IodmFyIG89bmV3IE50KHQsZXQociksW3IsaV0pLHU9MDtlLmxlbmd0aD51O3UrKyl7dmFyIHM9ZVt1XTtvPW8udXBkYXRlKHQsMCx2b2lkIDAsc1swXSxzWzFdKX1yZXR1cm4gb31mdW5jdGlvbiB0ZSh0LGUscixuKXtmb3IodmFyIGk9MCxvPTAsdT1BcnJheShyKSxzPTAsYT0xLGg9ZS5sZW5ndGg7aD5zO3MrKyxhPDw9MSl7dmFyIGY9ZVtzXTt2b2lkIDAhPT1mJiZzIT09biYmKGl8PWEsdVtvKytdPWYpfXJldHVybiBuZXcgQnQodCxpLHUpfWZ1bmN0aW9uIGVlKHQsZSxyLG4saSl7Zm9yKHZhciBvPTAsdT1BcnJheShocikscz0wOzAhPT1yO3MrKyxyPj4+PTEpdVtzXT0xJnI/ZVtvKytdOnZvaWQgMDtyZXR1cm4gdVtuXT1pLG5ldyBDdCh0LG8rMSx1KX1mdW5jdGlvbiByZSh0LGUscil7Zm9yKHZhciBuPVtdLGk9MDtyLmxlbmd0aD5pO2krKyl7dmFyIG89cltpXSx1PXAobyk7eShvKXx8KHU9dS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIEYodCl9KSksbi5wdXNoKHUpfXJldHVybiBpZSh0LGUsbil9ZnVuY3Rpb24gbmUodCl7cmV0dXJuIGZ1bmN0aW9uKGUscixuKXtyZXR1cm4gZSYmZS5tZXJnZURlZXBXaXRoJiZ5KHIpP2UubWVyZ2VEZWVwV2l0aCh0LHIpOnQ/dChlLHIsbik6cn19ZnVuY3Rpb24gaWUodCxlLHIpe3JldHVybiByPXIuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSksMD09PXIubGVuZ3RoP3Q6MCE9PXQuc2l6ZXx8dC5fX293bmVySUR8fDEhPT1yLmxlbmd0aD90LndpdGhNdXRhdGlvbnMoZnVuY3Rpb24odCl7Zm9yKHZhciBuPWU/ZnVuY3Rpb24ocixuKXt0LnVwZGF0ZShuLGNyLGZ1bmN0aW9uKHQpe3JldHVybiB0PT09Y3I/cjplKHQscixuKX0pfTpmdW5jdGlvbihlLHIpe3Quc2V0KHIsZSl9LGk9MDtyLmxlbmd0aD5pO2krKylyW2ldLmZvckVhY2gobil9KTp0LmNvbnN0cnVjdG9yKHJbMF0pfWZ1bmN0aW9uIG9lKHQsZSxyLG4pe3ZhciBpPXQ9PT1jcixvPWUubmV4dCgpO2lmKG8uZG9uZSl7dmFyIHU9aT9yOnQscz1uKHUpO3JldHVybiBzPT09dT90OnN9dXQoaXx8dCYmdC5zZXQsXCJpbnZhbGlkIGtleVBhdGhcIik7dmFyIGE9by52YWx1ZSxoPWk/Y3I6dC5nZXQoYSxjciksZj1vZShoLGUscixuKTtyZXR1cm4gZj09PWg/dDpmPT09Y3I/dC5yZW1vdmUoYSk6KGk/UXQoKTp0KS5zZXQoYSxmKX1mdW5jdGlvbiB1ZSh0KXtyZXR1cm4gdC09dD4+MSYxNDMxNjU1NzY1LHQ9KDg1ODk5MzQ1OSZ0KSsodD4+MiY4NTg5OTM0NTkpLHQ9dCsodD4+NCkmMjUyNjQ1MTM1LHQrPXQ+PjgsdCs9dD4+MTYsMTI3JnR9ZnVuY3Rpb24gc2UodCxlLHIsbil7dmFyIG89bj90OmkodCk7cmV0dXJuIG9bZV09cixvfWZ1bmN0aW9uIGFlKHQsZSxyLG4pe3ZhciBpPXQubGVuZ3RoKzE7aWYobiYmZSsxPT09aSlyZXR1cm4gdFtlXT1yLHQ7Zm9yKHZhciBvPUFycmF5KGkpLHU9MCxzPTA7aT5zO3MrKylzPT09ZT8ob1tzXT1yLHU9LTEpOm9bc109dFtzK3VdO3JldHVybiBvfWZ1bmN0aW9uIGhlKHQsZSxyKXt2YXIgbj10Lmxlbmd0aC0xO2lmKHImJmU9PT1uKXJldHVybiB0LnBvcCgpLHQ7Zm9yKHZhciBpPUFycmF5KG4pLG89MCx1PTA7bj51O3UrKyl1PT09ZSYmKG89MSksXG4gIGlbdV09dFt1K29dO3JldHVybiBpfWZ1bmN0aW9uIGZlKHQpe3ZhciBlPWxlKCk7aWYobnVsbD09PXR8fHZvaWQgMD09PXQpcmV0dXJuIGU7aWYoY2UodCkpcmV0dXJuIHQ7dmFyIHI9dih0KSxuPXIuc2l6ZTtyZXR1cm4gMD09PW4/ZTooc3Qobiksbj4wJiZocj5uP3ZlKDAsbixhcixudWxsLG5ldyBfZShyLnRvQXJyYXkoKSkpOmUud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXt0LnNldFNpemUobiksci5mb3JFYWNoKGZ1bmN0aW9uKGUscil7cmV0dXJuIHQuc2V0KHIsZSl9KX0pKX1mdW5jdGlvbiBjZSh0KXtyZXR1cm4hKCF0fHwhdFtOcl0pfWZ1bmN0aW9uIF9lKHQsZSl7dGhpcy5hcnJheT10LHRoaXMub3duZXJJRD1lfWZ1bmN0aW9uIHBlKHQsZSl7ZnVuY3Rpb24gcih0LGUscil7cmV0dXJuIDA9PT1lP24odCxyKTppKHQsZSxyKX1mdW5jdGlvbiBuKHQscil7dmFyIG49cj09PXM/YSYmYS5hcnJheTp0JiZ0LmFycmF5LGk9cj5vPzA6by1yLGg9dS1yO3JldHVybiBoPmhyJiYoaD1ociksZnVuY3Rpb24oKXtpZihpPT09aClyZXR1cm4gVnI7dmFyIHQ9ZT8tLWg6aSsrO3JldHVybiBuJiZuW3RdfX1mdW5jdGlvbiBpKHQsbixpKXt2YXIgcyxhPXQmJnQuYXJyYXksaD1pPm8/MDpvLWk+Pm4sZj0odS1pPj5uKSsxO3JldHVybiBmPmhyJiYoZj1ociksZnVuY3Rpb24oKXtmb3IoOzspe2lmKHMpe3ZhciB0PXMoKTtpZih0IT09VnIpcmV0dXJuIHQ7cz1udWxsfWlmKGg9PT1mKXJldHVybiBWcjt2YXIgbz1lPy0tZjpoKys7cz1yKGEmJmFbb10sbi1hcixpKyhvPDxuKSl9fX12YXIgbz10Ll9vcmlnaW4sdT10Ll9jYXBhY2l0eSxzPXplKHUpLGE9dC5fdGFpbDtyZXR1cm4gcih0Ll9yb290LHQuX2xldmVsLDApfWZ1bmN0aW9uIHZlKHQsZSxyLG4saSxvLHUpe3ZhciBzPU9iamVjdC5jcmVhdGUoUHIpO3JldHVybiBzLnNpemU9ZS10LHMuX29yaWdpbj10LHMuX2NhcGFjaXR5PWUscy5fbGV2ZWw9cixzLl9yb290PW4scy5fdGFpbD1pLHMuX19vd25lcklEPW8scy5fX2hhc2g9dSxzLl9fYWx0ZXJlZD0hMSxzfWZ1bmN0aW9uIGxlKCl7cmV0dXJuIEhyfHwoSHI9dmUoMCwwLGFyKSl9ZnVuY3Rpb24geWUodCxyLG4pe2lmKHI9dSh0LHIpLHIhPT1yKXJldHVybiB0O2lmKHI+PXQuc2l6ZXx8MD5yKXJldHVybiB0LndpdGhNdXRhdGlvbnMoZnVuY3Rpb24odCl7MD5yP3dlKHQscikuc2V0KDAsbik6d2UodCwwLHIrMSkuc2V0KHIsbil9KTtyKz10Ll9vcmlnaW47dmFyIGk9dC5fdGFpbCxvPXQuX3Jvb3Qscz1lKHByKTtyZXR1cm4gcj49emUodC5fY2FwYWNpdHkpP2k9ZGUoaSx0Ll9fb3duZXJJRCwwLHIsbixzKTpvPWRlKG8sdC5fX293bmVySUQsdC5fbGV2ZWwscixuLHMpLHMudmFsdWU/dC5fX293bmVySUQ/KHQuX3Jvb3Q9byx0Ll90YWlsPWksdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOnZlKHQuX29yaWdpbix0Ll9jYXBhY2l0eSx0Ll9sZXZlbCxvLGkpOnR9ZnVuY3Rpb24gZGUodCxlLG4saSxvLHUpe3ZhciBzPWk+Pj5uJmZyLGE9dCYmdC5hcnJheS5sZW5ndGg+cztpZighYSYmdm9pZCAwPT09bylyZXR1cm4gdDt2YXIgaDtpZihuPjApe3ZhciBmPXQmJnQuYXJyYXlbc10sYz1kZShmLGUsbi1hcixpLG8sdSk7cmV0dXJuIGM9PT1mP3Q6KGg9bWUodCxlKSxoLmFycmF5W3NdPWMsaCl9cmV0dXJuIGEmJnQuYXJyYXlbc109PT1vP3Q6KHIodSksaD1tZSh0LGUpLHZvaWQgMD09PW8mJnM9PT1oLmFycmF5Lmxlbmd0aC0xP2guYXJyYXkucG9wKCk6aC5hcnJheVtzXT1vLGgpfWZ1bmN0aW9uIG1lKHQsZSl7cmV0dXJuIGUmJnQmJmU9PT10Lm93bmVySUQ/dDpuZXcgX2UodD90LmFycmF5LnNsaWNlKCk6W10sZSl9ZnVuY3Rpb24gZ2UodCxlKXtpZihlPj16ZSh0Ll9jYXBhY2l0eSkpcmV0dXJuIHQuX3RhaWw7aWYoMTw8dC5fbGV2ZWwrYXI+ZSl7Zm9yKHZhciByPXQuX3Jvb3Qsbj10Ll9sZXZlbDtyJiZuPjA7KXI9ci5hcnJheVtlPj4+biZmcl0sbi09YXI7cmV0dXJuIHJ9fWZ1bmN0aW9uIHdlKHQsZSxyKXt2b2lkIDAhPT1lJiYoZT0wfGUpLHZvaWQgMCE9PXImJihyPTB8cik7dmFyIGk9dC5fX293bmVySUR8fG5ldyBuLG89dC5fb3JpZ2luLHU9dC5fY2FwYWNpdHkscz1vK2UsYT12b2lkIDA9PT1yP3U6MD5yP3UrcjpvK3I7XG4gIGlmKHM9PT1vJiZhPT09dSlyZXR1cm4gdDtpZihzPj1hKXJldHVybiB0LmNsZWFyKCk7Zm9yKHZhciBoPXQuX2xldmVsLGY9dC5fcm9vdCxjPTA7MD5zK2M7KWY9bmV3IF9lKGYmJmYuYXJyYXkubGVuZ3RoP1t2b2lkIDAsZl06W10saSksaCs9YXIsYys9MTw8aDtjJiYocys9YyxvKz1jLGErPWMsdSs9Yyk7Zm9yKHZhciBfPXplKHUpLHA9emUoYSk7cD49MTw8aCthcjspZj1uZXcgX2UoZiYmZi5hcnJheS5sZW5ndGg/W2ZdOltdLGkpLGgrPWFyO3ZhciB2PXQuX3RhaWwsbD1fPnA/Z2UodCxhLTEpOnA+Xz9uZXcgX2UoW10saSk6djtpZih2JiZwPl8mJnU+cyYmdi5hcnJheS5sZW5ndGgpe2Y9bWUoZixpKTtmb3IodmFyIHk9ZixkPWg7ZD5hcjtkLT1hcil7dmFyIG09Xz4+PmQmZnI7eT15LmFycmF5W21dPW1lKHkuYXJyYXlbbV0saSl9eS5hcnJheVtfPj4+YXImZnJdPXZ9aWYodT5hJiYobD1sJiZsLnJlbW92ZUFmdGVyKGksMCxhKSkscz49cClzLT1wLGEtPXAsaD1hcixmPW51bGwsbD1sJiZsLnJlbW92ZUJlZm9yZShpLDAscyk7ZWxzZSBpZihzPm98fF8+cCl7Zm9yKGM9MDtmOyl7dmFyIGc9cz4+PmgmZnI7aWYoZyE9PXA+Pj5oJmZyKWJyZWFrO2cmJihjKz0oMTw8aCkqZyksaC09YXIsZj1mLmFycmF5W2ddfWYmJnM+byYmKGY9Zi5yZW1vdmVCZWZvcmUoaSxoLHMtYykpLGYmJl8+cCYmKGY9Zi5yZW1vdmVBZnRlcihpLGgscC1jKSksYyYmKHMtPWMsYS09Yyl9cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9YS1zLHQuX29yaWdpbj1zLHQuX2NhcGFjaXR5PWEsdC5fbGV2ZWw9aCx0Ll9yb290PWYsdC5fdGFpbD1sLHQuX19oYXNoPXZvaWQgMCx0Ll9fYWx0ZXJlZD0hMCx0KTp2ZShzLGEsaCxmLGwpfWZ1bmN0aW9uIFNlKHQsZSxyKXtmb3IodmFyIG49W10saT0wLG89MDtyLmxlbmd0aD5vO28rKyl7dmFyIHU9cltvXSxzPXYodSk7cy5zaXplPmkmJihpPXMuc2l6ZSkseSh1KXx8KHM9cy5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIEYodCl9KSksbi5wdXNoKHMpfXJldHVybiBpPnQuc2l6ZSYmKHQ9dC5zZXRTaXplKGkpKSxpZSh0LGUsbil9ZnVuY3Rpb24gemUodCl7cmV0dXJuIGhyPnQ/MDp0LTE+Pj5hcjw8YXJ9ZnVuY3Rpb24gSWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0RlKCk6YmUodCk/dDpEZSgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9cCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0LHIpe3JldHVybiBlLnNldChyLHQpfSl9KX1mdW5jdGlvbiBiZSh0KXtyZXR1cm4gVHQodCkmJncodCl9ZnVuY3Rpb24gcWUodCxlLHIsbil7dmFyIGk9T2JqZWN0LmNyZWF0ZShJZS5wcm90b3R5cGUpO3JldHVybiBpLnNpemU9dD90LnNpemU6MCxpLl9tYXA9dCxpLl9saXN0PWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGl9ZnVuY3Rpb24gRGUoKXtyZXR1cm4gWXJ8fChZcj1xZShRdCgpLGxlKCkpKX1mdW5jdGlvbiBNZSh0LGUscil7dmFyIG4saSxvPXQuX21hcCx1PXQuX2xpc3Qscz1vLmdldChlKSxhPXZvaWQgMCE9PXM7aWYocj09PWNyKXtpZighYSlyZXR1cm4gdDt1LnNpemU+PWhyJiZ1LnNpemU+PTIqby5zaXplPyhpPXUuZmlsdGVyKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMCE9PXQmJnMhPT1lfSksbj1pLnRvS2V5ZWRTZXEoKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHRbMF19KS5mbGlwKCkudG9NYXAoKSx0Ll9fb3duZXJJRCYmKG4uX19vd25lcklEPWkuX19vd25lcklEPXQuX19vd25lcklEKSk6KG49by5yZW1vdmUoZSksaT1zPT09dS5zaXplLTE/dS5wb3AoKTp1LnNldChzLHZvaWQgMCkpfWVsc2UgaWYoYSl7aWYocj09PXUuZ2V0KHMpWzFdKXJldHVybiB0O249byxpPXUuc2V0KHMsW2Uscl0pfWVsc2Ugbj1vLnNldChlLHUuc2l6ZSksaT11LnNldCh1LnNpemUsW2Uscl0pO3JldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPW4uc2l6ZSx0Ll9tYXA9bix0Ll9saXN0PWksdC5fX2hhc2g9dm9pZCAwLHQpOnFlKG4saSl9ZnVuY3Rpb24gRWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P2tlKCk6T2UodCk/dDprZSgpLnVuc2hpZnRBbGwodCk7XG59ZnVuY3Rpb24gT2UodCl7cmV0dXJuISghdHx8IXRbUXJdKX1mdW5jdGlvbiB4ZSh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKFhyKTtyZXR1cm4gaS5zaXplPXQsaS5faGVhZD1lLGkuX19vd25lcklEPXIsaS5fX2hhc2g9bixpLl9fYWx0ZXJlZD0hMSxpfWZ1bmN0aW9uIGtlKCl7cmV0dXJuIEZyfHwoRnI9eGUoMCkpfWZ1bmN0aW9uIEFlKHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9LZSgpOmplKHQpJiYhdyh0KT90OktlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1sKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSl9ZnVuY3Rpb24gamUodCl7cmV0dXJuISghdHx8IXRbR3JdKX1mdW5jdGlvbiBSZSh0LGUpe3JldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPWUuc2l6ZSx0Ll9tYXA9ZSx0KTplPT09dC5fbWFwP3Q6MD09PWUuc2l6ZT90Ll9fZW1wdHkoKTp0Ll9fbWFrZShlKX1mdW5jdGlvbiBVZSh0LGUpe3ZhciByPU9iamVjdC5jcmVhdGUoWnIpO3JldHVybiByLnNpemU9dD90LnNpemU6MCxyLl9tYXA9dCxyLl9fb3duZXJJRD1lLHJ9ZnVuY3Rpb24gS2UoKXtyZXR1cm4gJHJ8fCgkcj1VZShRdCgpKSl9ZnVuY3Rpb24gTGUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0JlKCk6VGUodCk/dDpCZSgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7dmFyIHI9bCh0KTtzdChyLnNpemUpLHIuZm9yRWFjaChmdW5jdGlvbih0KXtyZXR1cm4gZS5hZGQodCl9KX0pfWZ1bmN0aW9uIFRlKHQpe3JldHVybiBqZSh0KSYmdyh0KX1mdW5jdGlvbiBXZSh0LGUpe3ZhciByPU9iamVjdC5jcmVhdGUodG4pO3JldHVybiByLnNpemU9dD90LnNpemU6MCxyLl9tYXA9dCxyLl9fb3duZXJJRD1lLHJ9ZnVuY3Rpb24gQmUoKXtyZXR1cm4gZW58fChlbj1XZShEZSgpKSl9ZnVuY3Rpb24gQ2UodCxlKXt2YXIgcixuPWZ1bmN0aW9uKG8pe2lmKG8gaW5zdGFuY2VvZiBuKXJldHVybiBvO2lmKCEodGhpcyBpbnN0YW5jZW9mIG4pKXJldHVybiBuZXcgbihvKTtpZighcil7cj0hMDt2YXIgdT1PYmplY3Qua2V5cyh0KTtQZShpLHUpLGkuc2l6ZT11Lmxlbmd0aCxpLl9uYW1lPWUsaS5fa2V5cz11LGkuX2RlZmF1bHRWYWx1ZXM9dH10aGlzLl9tYXA9THQobyl9LGk9bi5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShybik7cmV0dXJuIGkuY29uc3RydWN0b3I9bixufWZ1bmN0aW9uIEplKHQsZSxyKXt2YXIgbj1PYmplY3QuY3JlYXRlKE9iamVjdC5nZXRQcm90b3R5cGVPZih0KSk7cmV0dXJuIG4uX21hcD1lLG4uX19vd25lcklEPXIsbn1mdW5jdGlvbiBOZSh0KXtyZXR1cm4gdC5fbmFtZXx8dC5jb25zdHJ1Y3Rvci5uYW1lfHxcIlJlY29yZFwifWZ1bmN0aW9uIFBlKHQsZSl7dHJ5e2UuZm9yRWFjaChIZS5iaW5kKHZvaWQgMCx0KSl9Y2F0Y2gocil7fX1mdW5jdGlvbiBIZSh0LGUpe09iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LGUse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldChlKX0sc2V0OmZ1bmN0aW9uKHQpe3V0KHRoaXMuX19vd25lcklELFwiQ2Fubm90IHNldCBvbiBhbiBpbW11dGFibGUgcmVjb3JkLlwiKSx0aGlzLnNldChlLHQpfX0pfWZ1bmN0aW9uIFZlKHQsZSl7aWYodD09PWUpcmV0dXJuITA7aWYoIXkoZSl8fHZvaWQgMCE9PXQuc2l6ZSYmdm9pZCAwIT09ZS5zaXplJiZ0LnNpemUhPT1lLnNpemV8fHZvaWQgMCE9PXQuX19oYXNoJiZ2b2lkIDAhPT1lLl9faGFzaCYmdC5fX2hhc2ghPT1lLl9faGFzaHx8ZCh0KSE9PWQoZSl8fG0odCkhPT1tKGUpfHx3KHQpIT09dyhlKSlyZXR1cm4hMTtpZigwPT09dC5zaXplJiYwPT09ZS5zaXplKXJldHVybiEwO3ZhciByPSFnKHQpO2lmKHcodCkpe3ZhciBuPXQuZW50cmllcygpO3JldHVybiBlLmV2ZXJ5KGZ1bmN0aW9uKHQsZSl7dmFyIGk9bi5uZXh0KCkudmFsdWU7cmV0dXJuIGkmJlgoaVsxXSx0KSYmKHJ8fFgoaVswXSxlKSl9KSYmbi5uZXh0KCkuZG9uZX12YXIgaT0hMTtpZih2b2lkIDA9PT10LnNpemUpaWYodm9pZCAwPT09ZS5zaXplKVwiZnVuY3Rpb25cIj09dHlwZW9mIHQuY2FjaGVSZXN1bHQmJnQuY2FjaGVSZXN1bHQoKTtlbHNle1xuICBpPSEwO3ZhciBvPXQ7dD1lLGU9b312YXIgdT0hMCxzPWUuX19pdGVyYXRlKGZ1bmN0aW9uKGUsbil7cmV0dXJuKHI/dC5oYXMoZSk6aT9YKGUsdC5nZXQobixjcikpOlgodC5nZXQobixjciksZSkpP3ZvaWQgMDoodT0hMSwhMSl9KTtyZXR1cm4gdSYmdC5zaXplPT09c31mdW5jdGlvbiBZZSh0LGUscil7aWYoISh0aGlzIGluc3RhbmNlb2YgWWUpKXJldHVybiBuZXcgWWUodCxlLHIpO2lmKHV0KDAhPT1yLFwiQ2Fubm90IHN0ZXAgYSBSYW5nZSBieSAwXCIpLHQ9dHx8MCx2b2lkIDA9PT1lJiYoZT0xLzApLHI9dm9pZCAwPT09cj8xOk1hdGguYWJzKHIpLHQ+ZSYmKHI9LXIpLHRoaXMuX3N0YXJ0PXQsdGhpcy5fZW5kPWUsdGhpcy5fc3RlcD1yLHRoaXMuc2l6ZT1NYXRoLm1heCgwLE1hdGguY2VpbCgoZS10KS9yLTEpKzEpLDA9PT10aGlzLnNpemUpe2lmKG5uKXJldHVybiBubjtubj10aGlzfX1mdW5jdGlvbiBRZSh0LGUpe2lmKCEodGhpcyBpbnN0YW5jZW9mIFFlKSlyZXR1cm4gbmV3IFFlKHQsZSk7aWYodGhpcy5fdmFsdWU9dCx0aGlzLnNpemU9dm9pZCAwPT09ZT8xLzA6TWF0aC5tYXgoMCxlKSwwPT09dGhpcy5zaXplKXtpZihvbilyZXR1cm4gb247b249dGhpc319ZnVuY3Rpb24gWGUodCxlKXt2YXIgcj1mdW5jdGlvbihyKXt0LnByb3RvdHlwZVtyXT1lW3JdfTtyZXR1cm4gT2JqZWN0LmtleXMoZSkuZm9yRWFjaChyKSxPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzJiZPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGUpLmZvckVhY2gociksdH1mdW5jdGlvbiBGZSh0LGUpe3JldHVybiBlfWZ1bmN0aW9uIEdlKHQsZSl7cmV0dXJuW2UsdF19ZnVuY3Rpb24gWmUodCl7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIXQuYXBwbHkodGhpcyxhcmd1bWVudHMpfX1mdW5jdGlvbiAkZSh0KXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4tdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWZ1bmN0aW9uIHRyKHQpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiB0P0pTT04uc3RyaW5naWZ5KHQpOnR9ZnVuY3Rpb24gZXIoKXtyZXR1cm4gaShhcmd1bWVudHMpfWZ1bmN0aW9uIHJyKHQsZSl7cmV0dXJuIGU+dD8xOnQ+ZT8tMTowfWZ1bmN0aW9uIG5yKHQpe2lmKHQuc2l6ZT09PTEvMClyZXR1cm4gMDt2YXIgZT13KHQpLHI9ZCh0KSxuPWU/MTowLGk9dC5fX2l0ZXJhdGUocj9lP2Z1bmN0aW9uKHQsZSl7bj0zMSpuK29yKGV0KHQpLGV0KGUpKXwwfTpmdW5jdGlvbih0LGUpe249bitvcihldCh0KSxldChlKSl8MH06ZT9mdW5jdGlvbih0KXtuPTMxKm4rZXQodCl8MH06ZnVuY3Rpb24odCl7bj1uK2V0KHQpfDB9KTtyZXR1cm4gaXIoaSxuKX1mdW5jdGlvbiBpcih0LGUpe3JldHVybiBlPU1yKGUsMzQzMjkxODM1MyksZT1NcihlPDwxNXxlPj4+LTE1LDQ2MTg0NTkwNyksZT1NcihlPDwxM3xlPj4+LTEzLDUpLGU9KGUrMzg2NDI5MjE5NnwwKV50LGU9TXIoZV5lPj4+MTYsMjI0NjgyMjUwNyksZT1NcihlXmU+Pj4xMywzMjY2NDg5OTA5KSxlPXR0KGVeZT4+PjE2KX1mdW5jdGlvbiBvcih0LGUpe3JldHVybiB0XmUrMjY1NDQzNTc2OSsodDw8NikrKHQ+PjIpfDB9dmFyIHVyPUFycmF5LnByb3RvdHlwZS5zbGljZSxzcj1cImRlbGV0ZVwiLGFyPTUsaHI9MTw8YXIsZnI9aHItMSxjcj17fSxfcj17dmFsdWU6ITF9LHByPXt2YWx1ZTohMX07dChwLF8pLHQodixfKSx0KGwsXyksXy5pc0l0ZXJhYmxlPXksXy5pc0tleWVkPWQsXy5pc0luZGV4ZWQ9bSxfLmlzQXNzb2NpYXRpdmU9ZyxfLmlzT3JkZXJlZD13LF8uS2V5ZWQ9cCxfLkluZGV4ZWQ9dixfLlNldD1sO3ZhciB2cj1cIkBAX19JTU1VVEFCTEVfSVRFUkFCTEVfX0BAXCIsbHI9XCJAQF9fSU1NVVRBQkxFX0tFWUVEX19AQFwiLHlyPVwiQEBfX0lNTVVUQUJMRV9JTkRFWEVEX19AQFwiLGRyPVwiQEBfX0lNTVVUQUJMRV9PUkRFUkVEX19AQFwiLG1yPTAsZ3I9MSx3cj0yLFNyPVwiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmU3ltYm9sLml0ZXJhdG9yLHpyPVwiQEBpdGVyYXRvclwiLElyPVNyfHx6cjtTLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVyblwiW0l0ZXJhdG9yXVwifSxTLktFWVM9bXIsXG4gIFMuVkFMVUVTPWdyLFMuRU5UUklFUz13cixTLnByb3RvdHlwZS5pbnNwZWN0PVMucHJvdG90eXBlLnRvU291cmNlPWZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzfSxTLnByb3RvdHlwZVtJcl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sdChPLF8pLE8ub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gTyhhcmd1bWVudHMpfSxPLnByb3RvdHlwZS50b1NlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxPLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXEge1wiLFwifVwiKX0sTy5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9ZnVuY3Rpb24oKXtyZXR1cm4hdGhpcy5fY2FjaGUmJnRoaXMuX19pdGVyYXRlVW5jYWNoZWQmJih0aGlzLl9jYWNoZT10aGlzLmVudHJ5U2VxKCkudG9BcnJheSgpLHRoaXMuc2l6ZT10aGlzLl9jYWNoZS5sZW5ndGgpLHRoaXN9LE8ucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3JldHVybiBOKHRoaXMsdCxlLCEwKX0sTy5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBQKHRoaXMsdCxlLCEwKX0sdCh4LE8pLHgucHJvdG90eXBlLnRvS2V5ZWRTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30sdChrLE8pLGsub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gayhhcmd1bWVudHMpfSxrLnByb3RvdHlwZS50b0luZGV4ZWRTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30say5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiU2VxIFtcIixcIl1cIil9LGsucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3JldHVybiBOKHRoaXMsdCxlLCExKX0say5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBQKHRoaXMsdCxlLCExKX0sdChBLE8pLEEub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gQShhcmd1bWVudHMpfSxBLnByb3RvdHlwZS50b1NldFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxPLmlzU2VxPUwsTy5LZXllZD14LE8uU2V0PUEsTy5JbmRleGVkPWs7dmFyIGJyPVwiQEBfX0lNTVVUQUJMRV9TRVFfX0BAXCI7Ty5wcm90b3R5cGVbYnJdPSEwLHQoaixrKSxqLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fYXJyYXlbdSh0aGlzLHQpXTplfSxqLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5fYXJyYXksbj1yLmxlbmd0aC0xLGk9MDtuPj1pO2krKylpZih0KHJbZT9uLWk6aV0saSx0aGlzKT09PSExKXJldHVybiBpKzE7cmV0dXJuIGl9LGoucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9hcnJheSxuPXIubGVuZ3RoLTEsaT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybiBpPm4/SSgpOnoodCxpLHJbZT9uLWkrKzppKytdKX0pfSx0KFIseCksUi5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMD09PWV8fHRoaXMuaGFzKHQpP3RoaXMuX29iamVjdFt0XTplfSxSLnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX29iamVjdC5oYXNPd25Qcm9wZXJ0eSh0KX0sUi5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMuX29iamVjdCxuPXRoaXMuX2tleXMsaT1uLmxlbmd0aC0xLG89MDtpPj1vO28rKyl7dmFyIHU9bltlP2ktbzpvXTtpZih0KHJbdV0sdSx0aGlzKT09PSExKXJldHVybiBvKzF9cmV0dXJuIG99LFIucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9vYmplY3Qsbj10aGlzLl9rZXlzLGk9bi5sZW5ndGgtMSxvPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHU9bltlP2ktbzpvXTtyZXR1cm4gbysrPmk/SSgpOnoodCx1LHJbdV0pfSl9LFIucHJvdG90eXBlW2RyXT0hMCx0KFUsayksVS5wcm90b3R5cGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKHQsZSk7dmFyIHI9dGhpcy5faXRlcmFibGUsbj1EKHIpLGk9MDtpZihxKG4pKWZvcih2YXIgbzshKG89bi5uZXh0KCkpLmRvbmUmJnQoby52YWx1ZSxpKyssdGhpcykhPT0hMTspO1xuICByZXR1cm4gaX0sVS5wcm90b3R5cGUuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodCxlKTt2YXIgcj10aGlzLl9pdGVyYWJsZSxuPUQocik7aWYoIXEobikpcmV0dXJuIG5ldyBTKEkpO3ZhciBpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9bi5uZXh0KCk7cmV0dXJuIGUuZG9uZT9lOnoodCxpKyssZS52YWx1ZSl9KX0sdChLLGspLEsucHJvdG90eXBlLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZSh0LGUpO2Zvcih2YXIgcj10aGlzLl9pdGVyYXRvcixuPXRoaXMuX2l0ZXJhdG9yQ2FjaGUsaT0wO24ubGVuZ3RoPmk7KWlmKHQobltpXSxpKyssdGhpcyk9PT0hMSlyZXR1cm4gaTtmb3IodmFyIG87IShvPXIubmV4dCgpKS5kb25lOyl7dmFyIHU9by52YWx1ZTtpZihuW2ldPXUsdCh1LGkrKyx0aGlzKT09PSExKWJyZWFrfXJldHVybiBpfSxLLnByb3RvdHlwZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXJhdG9yLG49dGhpcy5faXRlcmF0b3JDYWNoZSxpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7aWYoaT49bi5sZW5ndGgpe3ZhciBlPXIubmV4dCgpO2lmKGUuZG9uZSlyZXR1cm4gZTtuW2ldPWUudmFsdWV9cmV0dXJuIHoodCxpLG5baSsrXSl9KX07dmFyIHFyO3QoSCxfKSx0KFYsSCksdChZLEgpLHQoUSxIKSxILktleWVkPVYsSC5JbmRleGVkPVksSC5TZXQ9UTt2YXIgRHIsTXI9XCJmdW5jdGlvblwiPT10eXBlb2YgTWF0aC5pbXVsJiYtMj09PU1hdGguaW11bCg0Mjk0OTY3Mjk1LDIpP01hdGguaW11bDpmdW5jdGlvbih0LGUpe3Q9MHx0LGU9MHxlO3ZhciByPTY1NTM1JnQsbj02NTUzNSZlO3JldHVybiByKm4rKCh0Pj4+MTYpKm4rciooZT4+PjE2KTw8MTY+Pj4wKXwwfSxFcj1PYmplY3QuaXNFeHRlbnNpYmxlLE9yPWZ1bmN0aW9uKCl7dHJ5e3JldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sXCJAXCIse30pLCEwfWNhdGNoKHQpe3JldHVybiExfX0oKSx4cj1cImZ1bmN0aW9uXCI9PXR5cGVvZiBXZWFrTWFwO3hyJiYoRHI9bmV3IFdlYWtNYXApO3ZhciBrcj0wLEFyPVwiX19pbW11dGFibGVoYXNoX19cIjtcImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJihBcj1TeW1ib2woQXIpKTt2YXIganI9MTYsUnI9MjU1LFVyPTAsS3I9e307dChhdCx4KSxhdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2l0ZXIuZ2V0KHQsZSl9LGF0LnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2l0ZXIuaGFzKHQpfSxhdC5wcm90b3R5cGUudmFsdWVTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXRlci52YWx1ZVNlcSgpfSxhdC5wcm90b3R5cGUucmV2ZXJzZT1mdW5jdGlvbigpe3ZhciB0PXRoaXMsZT12dCh0aGlzLCEwKTtyZXR1cm4gdGhpcy5fdXNlS2V5c3x8KGUudmFsdWVTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdC5faXRlci50b1NlcSgpLnJldmVyc2UoKX0pLGV9LGF0LnByb3RvdHlwZS5tYXA9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLG49cHQodGhpcyx0LGUpO3JldHVybiB0aGlzLl91c2VLZXlzfHwobi52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiByLl9pdGVyLnRvU2VxKCkubWFwKHQsZSl9KSxufSxhdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHIsbj10aGlzO3JldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZSh0aGlzLl91c2VLZXlzP2Z1bmN0aW9uKGUscil7cmV0dXJuIHQoZSxyLG4pfToocj1lP2t0KHRoaXMpOjAsZnVuY3Rpb24oaSl7cmV0dXJuIHQoaSxlPy0tcjpyKyssbil9KSxlKX0sYXQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtpZih0aGlzLl91c2VLZXlzKXJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0b3IodCxlKTt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSksbj1lP2t0KHRoaXMpOjA7XG4gIHJldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBpPXIubmV4dCgpO3JldHVybiBpLmRvbmU/aTp6KHQsZT8tLW46bisrLGkudmFsdWUsaSl9KX0sYXQucHJvdG90eXBlW2RyXT0hMCx0KGh0LGspLGh0LnByb3RvdHlwZS5pbmNsdWRlcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5pbmNsdWRlcyh0KX0saHQucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj0wO3JldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gdChlLG4rKyxyKX0sZSl9LGh0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpLG49MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgZT1yLm5leHQoKTtyZXR1cm4gZS5kb25lP2U6eih0LG4rKyxlLnZhbHVlLGUpfSl9LHQoZnQsQSksZnQucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5pbmNsdWRlcyh0KX0sZnQucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiB0KGUsZSxyKX0sZSl9LGZ0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPXIubmV4dCgpO3JldHVybiBlLmRvbmU/ZTp6KHQsZS52YWx1ZSxlLnZhbHVlLGUpfSl9LHQoY3QseCksY3QucHJvdG90eXBlLmVudHJ5U2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2l0ZXIudG9TZXEoKX0sY3QucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe2lmKGUpe3h0KGUpO3ZhciBuPXkoZSk7cmV0dXJuIHQobj9lLmdldCgxKTplWzFdLG4/ZS5nZXQoMCk6ZVswXSxyKX19LGUpfSxjdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2l0ZXIuX19pdGVyYXRvcihncixlKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtmb3IoOzspe3ZhciBlPXIubmV4dCgpO2lmKGUuZG9uZSlyZXR1cm4gZTt2YXIgbj1lLnZhbHVlO2lmKG4pe3h0KG4pO3ZhciBpPXkobik7cmV0dXJuIHoodCxpP24uZ2V0KDApOm5bMF0saT9uLmdldCgxKTpuWzFdLGUpfX19KX0saHQucHJvdG90eXBlLmNhY2hlUmVzdWx0PWF0LnByb3RvdHlwZS5jYWNoZVJlc3VsdD1mdC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9Y3QucHJvdG90eXBlLmNhY2hlUmVzdWx0PVJ0LHQoTHQsViksTHQucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIk1hcCB7XCIsXCJ9XCIpfSxMdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX3Jvb3Q/dGhpcy5fcm9vdC5nZXQoMCx2b2lkIDAsdCxlKTplfSxMdC5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFh0KHRoaXMsdCxlKX0sTHQucHJvdG90eXBlLnNldEluPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxjcixmdW5jdGlvbigpe3JldHVybiBlfSl9LEx0LnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7cmV0dXJuIFh0KHRoaXMsdCxjcil9LEx0LnByb3RvdHlwZS5kZWxldGVJbj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy51cGRhdGVJbih0LGZ1bmN0aW9uKCl7cmV0dXJuIGNyfSl9LEx0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLHIpe3JldHVybiAxPT09YXJndW1lbnRzLmxlbmd0aD90KHRoaXMpOnRoaXMudXBkYXRlSW4oW3RdLGUscil9LEx0LnByb3RvdHlwZS51cGRhdGVJbj1mdW5jdGlvbih0LGUscil7cnx8KHI9ZSxlPXZvaWQgMCk7dmFyIG49b2UodGhpcyxLdCh0KSxlLHIpO3JldHVybiBuPT09Y3I/dm9pZCAwOm59LEx0LnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX3Jvb3Q9bnVsbCxcbiAgdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOlF0KCl9LEx0LnByb3RvdHlwZS5tZXJnZT1mdW5jdGlvbigpe3JldHVybiByZSh0aGlzLHZvaWQgMCxhcmd1bWVudHMpfSxMdC5wcm90b3R5cGUubWVyZ2VXaXRoPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiByZSh0aGlzLHQsZSl9LEx0LnByb3RvdHlwZS5tZXJnZUluPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiB0aGlzLnVwZGF0ZUluKHQsUXQoKSxmdW5jdGlvbih0KXtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lm1lcmdlP3QubWVyZ2UuYXBwbHkodCxlKTplW2UubGVuZ3RoLTFdfSl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXA9ZnVuY3Rpb24oKXtyZXR1cm4gcmUodGhpcyxuZSh2b2lkIDApLGFyZ3VtZW50cyl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXBXaXRoPWZ1bmN0aW9uKHQpe3ZhciBlPXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiByZSh0aGlzLG5lKHQpLGUpfSxMdC5wcm90b3R5cGUubWVyZ2VEZWVwSW49ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxRdCgpLGZ1bmN0aW9uKHQpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQubWVyZ2VEZWVwP3QubWVyZ2VEZWVwLmFwcGx5KHQsZSk6ZVtlLmxlbmd0aC0xXX0pfSxMdC5wcm90b3R5cGUuc29ydD1mdW5jdGlvbih0KXtyZXR1cm4gSWUocXQodGhpcyx0KSl9LEx0LnByb3RvdHlwZS5zb3J0Qnk9ZnVuY3Rpb24odCxlKXtyZXR1cm4gSWUocXQodGhpcyxlLHQpKX0sTHQucHJvdG90eXBlLndpdGhNdXRhdGlvbnM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5hc011dGFibGUoKTtyZXR1cm4gdChlKSxlLndhc0FsdGVyZWQoKT9lLl9fZW5zdXJlT3duZXIodGhpcy5fX293bmVySUQpOnRoaXN9LEx0LnByb3RvdHlwZS5hc011dGFibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX293bmVySUQ/dGhpczp0aGlzLl9fZW5zdXJlT3duZXIobmV3IG4pfSxMdC5wcm90b3R5cGUuYXNJbW11dGFibGU9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2Vuc3VyZU93bmVyKCl9LEx0LnByb3RvdHlwZS53YXNBbHRlcmVkPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19hbHRlcmVkfSxMdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgUHQodGhpcyx0LGUpfSxMdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIHRoaXMuX3Jvb3QmJnRoaXMuX3Jvb3QuaXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gbisrLHQoZVsxXSxlWzBdLHIpfSxlKSxufSxMdC5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD9ZdCh0aGlzLnNpemUsdGhpcy5fcm9vdCx0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9fYWx0ZXJlZD0hMSx0aGlzKX0sTHQuaXNNYXA9VHQ7dmFyIExyPVwiQEBfX0lNTVVUQUJMRV9NQVBfX0BAXCIsVHI9THQucHJvdG90eXBlO1RyW0xyXT0hMCxUcltzcl09VHIucmVtb3ZlLFRyLnJlbW92ZUluPVRyLmRlbGV0ZUluLFd0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7Zm9yKHZhciBpPXRoaXMuZW50cmllcyxvPTAsdT1pLmxlbmd0aDt1Pm87bysrKWlmKFgocixpW29dWzBdKSlyZXR1cm4gaVtvXVsxXTtyZXR1cm4gbn0sV3QucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUsbixvLHUscyxhKXtmb3IodmFyIGg9dT09PWNyLGY9dGhpcy5lbnRyaWVzLGM9MCxfPWYubGVuZ3RoO18+YyYmIVgobyxmW2NdWzBdKTtjKyspO3ZhciBwPV8+YztpZihwP2ZbY11bMV09PT11OmgpcmV0dXJuIHRoaXM7aWYocihhKSwoaHx8IXApJiZyKHMpLCFofHwxIT09Zi5sZW5ndGgpe2lmKCFwJiYhaCYmZi5sZW5ndGg+PUJyKXJldHVybiAkdCh0LGYsbyx1KTt2YXIgdj10JiZ0PT09dGhpcy5vd25lcklELGw9dj9mOmkoZik7cmV0dXJuIHA/aD9jPT09Xy0xP2wucG9wKCk6bFtjXT1sLnBvcCgpOmxbY109W28sdV06bC5wdXNoKFtvLHVdKSxcbiAgdj8odGhpcy5lbnRyaWVzPWwsdGhpcyk6bmV3IFd0KHQsbCl9fSxCdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe3ZvaWQgMD09PWUmJihlPWV0KHIpKTt2YXIgaT0xPDwoKDA9PT10P2U6ZT4+PnQpJmZyKSxvPXRoaXMuYml0bWFwO3JldHVybiAwPT09KG8maSk/bjp0aGlzLm5vZGVzW3VlKG8maS0xKV0uZ2V0KHQrYXIsZSxyLG4pfSxCdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxyLG4saSxvLHUpe3ZvaWQgMD09PXImJihyPWV0KG4pKTt2YXIgcz0oMD09PWU/cjpyPj4+ZSkmZnIsYT0xPDxzLGg9dGhpcy5iaXRtYXAsZj0wIT09KGgmYSk7aWYoIWYmJmk9PT1jcilyZXR1cm4gdGhpczt2YXIgYz11ZShoJmEtMSksXz10aGlzLm5vZGVzLHA9Zj9fW2NdOnZvaWQgMCx2PUZ0KHAsdCxlK2FyLHIsbixpLG8sdSk7aWYodj09PXApcmV0dXJuIHRoaXM7aWYoIWYmJnYmJl8ubGVuZ3RoPj1DcilyZXR1cm4gZWUodCxfLGgscyx2KTtpZihmJiYhdiYmMj09PV8ubGVuZ3RoJiZHdChfWzFeY10pKXJldHVybiBfWzFeY107aWYoZiYmdiYmMT09PV8ubGVuZ3RoJiZHdCh2KSlyZXR1cm4gdjt2YXIgbD10JiZ0PT09dGhpcy5vd25lcklELHk9Zj92P2g6aF5hOmh8YSxkPWY/dj9zZShfLGMsdixsKTpoZShfLGMsbCk6YWUoXyxjLHYsbCk7cmV0dXJuIGw/KHRoaXMuYml0bWFwPXksdGhpcy5ub2Rlcz1kLHRoaXMpOm5ldyBCdCh0LHksZCl9LEN0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7dm9pZCAwPT09ZSYmKGU9ZXQocikpO3ZhciBpPSgwPT09dD9lOmU+Pj50KSZmcixvPXRoaXMubm9kZXNbaV07cmV0dXJuIG8/by5nZXQodCthcixlLHIsbik6bn0sQ3QucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUscixuLGksbyx1KXt2b2lkIDA9PT1yJiYocj1ldChuKSk7dmFyIHM9KDA9PT1lP3I6cj4+PmUpJmZyLGE9aT09PWNyLGg9dGhpcy5ub2RlcyxmPWhbc107aWYoYSYmIWYpcmV0dXJuIHRoaXM7dmFyIGM9RnQoZix0LGUrYXIscixuLGksbyx1KTtpZihjPT09ZilyZXR1cm4gdGhpczt2YXIgXz10aGlzLmNvdW50O2lmKGYpe2lmKCFjJiYoXy0tLEpyPl8pKXJldHVybiB0ZSh0LGgsXyxzKX1lbHNlIF8rKzt2YXIgcD10JiZ0PT09dGhpcy5vd25lcklELHY9c2UoaCxzLGMscCk7cmV0dXJuIHA/KHRoaXMuY291bnQ9Xyx0aGlzLm5vZGVzPXYsdGhpcyk6bmV3IEN0KHQsXyx2KX0sSnQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtmb3IodmFyIGk9dGhpcy5lbnRyaWVzLG89MCx1PWkubGVuZ3RoO3U+bztvKyspaWYoWChyLGlbb11bMF0pKXJldHVybiBpW29dWzFdO3JldHVybiBufSxKdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLG8sdSxzLGEpe3ZvaWQgMD09PW4mJihuPWV0KG8pKTt2YXIgaD11PT09Y3I7aWYobiE9PXRoaXMua2V5SGFzaClyZXR1cm4gaD90aGlzOihyKGEpLHIocyksWnQodGhpcyx0LGUsbixbbyx1XSkpO2Zvcih2YXIgZj10aGlzLmVudHJpZXMsYz0wLF89Zi5sZW5ndGg7Xz5jJiYhWChvLGZbY11bMF0pO2MrKyk7dmFyIHA9Xz5jO2lmKHA/ZltjXVsxXT09PXU6aClyZXR1cm4gdGhpcztpZihyKGEpLChofHwhcCkmJnIocyksaCYmMj09PV8pcmV0dXJuIG5ldyBOdCh0LHRoaXMua2V5SGFzaCxmWzFeY10pO3ZhciB2PXQmJnQ9PT10aGlzLm93bmVySUQsbD12P2Y6aShmKTtyZXR1cm4gcD9oP2M9PT1fLTE/bC5wb3AoKTpsW2NdPWwucG9wKCk6bFtjXT1bbyx1XTpsLnB1c2goW28sdV0pLHY/KHRoaXMuZW50cmllcz1sLHRoaXMpOm5ldyBKdCh0LHRoaXMua2V5SGFzaCxsKX0sTnQucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtyZXR1cm4gWChyLHRoaXMuZW50cnlbMF0pP3RoaXMuZW50cnlbMV06bn0sTnQucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUsbixpLG8sdSxzKXt2YXIgYT1vPT09Y3IsaD1YKGksdGhpcy5lbnRyeVswXSk7cmV0dXJuKGg/bz09PXRoaXMuZW50cnlbMV06YSk/dGhpczoocihzKSxhP3ZvaWQgcih1KTpoP3QmJnQ9PT10aGlzLm93bmVySUQ/KHRoaXMuZW50cnlbMV09byx0aGlzKTpuZXcgTnQodCx0aGlzLmtleUhhc2gsW2ksb10pOihyKHUpLFxuICBadCh0aGlzLHQsZSxldChpKSxbaSxvXSkpKX0sV3QucHJvdG90eXBlLml0ZXJhdGU9SnQucHJvdG90eXBlLml0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5lbnRyaWVzLG49MCxpPXIubGVuZ3RoLTE7aT49bjtuKyspaWYodChyW2U/aS1uOm5dKT09PSExKXJldHVybiExfSxCdC5wcm90b3R5cGUuaXRlcmF0ZT1DdC5wcm90b3R5cGUuaXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLm5vZGVzLG49MCxpPXIubGVuZ3RoLTE7aT49bjtuKyspe3ZhciBvPXJbZT9pLW46bl07aWYobyYmby5pdGVyYXRlKHQsZSk9PT0hMSlyZXR1cm4hMX19LE50LnByb3RvdHlwZS5pdGVyYXRlPWZ1bmN0aW9uKHQpe3JldHVybiB0KHRoaXMuZW50cnkpfSx0KFB0LFMpLFB0LnByb3RvdHlwZS5uZXh0PWZ1bmN0aW9uKCl7Zm9yKHZhciB0PXRoaXMuX3R5cGUsZT10aGlzLl9zdGFjaztlOyl7dmFyIHIsbj1lLm5vZGUsaT1lLmluZGV4Kys7aWYobi5lbnRyeSl7aWYoMD09PWkpcmV0dXJuIEh0KHQsbi5lbnRyeSl9ZWxzZSBpZihuLmVudHJpZXMpe2lmKHI9bi5lbnRyaWVzLmxlbmd0aC0xLHI+PWkpcmV0dXJuIEh0KHQsbi5lbnRyaWVzW3RoaXMuX3JldmVyc2U/ci1pOmldKX1lbHNlIGlmKHI9bi5ub2Rlcy5sZW5ndGgtMSxyPj1pKXt2YXIgbz1uLm5vZGVzW3RoaXMuX3JldmVyc2U/ci1pOmldO2lmKG8pe2lmKG8uZW50cnkpcmV0dXJuIEh0KHQsby5lbnRyeSk7ZT10aGlzLl9zdGFjaz1WdChvLGUpfWNvbnRpbnVlfWU9dGhpcy5fc3RhY2s9dGhpcy5fc3RhY2suX19wcmV2fXJldHVybiBJKCl9O3ZhciBXcixCcj1oci80LENyPWhyLzIsSnI9aHIvNDt0KGZlLFkpLGZlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sZmUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIkxpc3QgW1wiLFwiXVwiKX0sZmUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe2lmKHQ9dSh0aGlzLHQpLHQ+PTAmJnRoaXMuc2l6ZT50KXt0Kz10aGlzLl9vcmlnaW47dmFyIHI9Z2UodGhpcyx0KTtyZXR1cm4gciYmci5hcnJheVt0JmZyXX1yZXR1cm4gZX0sZmUucHJvdG90eXBlLnNldD1mdW5jdGlvbih0LGUpe3JldHVybiB5ZSh0aGlzLHQsZSl9LGZlLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuaGFzKHQpPzA9PT10P3RoaXMuc2hpZnQoKTp0PT09dGhpcy5zaXplLTE/dGhpcy5wb3AoKTp0aGlzLnNwbGljZSh0LDEpOnRoaXN9LGZlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT10aGlzLl9vcmlnaW49dGhpcy5fY2FwYWNpdHk9MCx0aGlzLl9sZXZlbD1hcix0aGlzLl9yb290PXRoaXMuX3RhaWw9bnVsbCx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6bGUoKX0sZmUucHJvdG90eXBlLnB1c2g9ZnVuY3Rpb24oKXt2YXIgdD1hcmd1bWVudHMsZT10aGlzLnNpemU7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihyKXt3ZShyLDAsZSt0Lmxlbmd0aCk7Zm9yKHZhciBuPTA7dC5sZW5ndGg+bjtuKyspci5zZXQoZStuLHRbbl0pfSl9LGZlLnByb3RvdHlwZS5wb3A9ZnVuY3Rpb24oKXtyZXR1cm4gd2UodGhpcywwLC0xKX0sZmUucHJvdG90eXBlLnVuc2hpZnQ9ZnVuY3Rpb24oKXt2YXIgdD1hcmd1bWVudHM7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt3ZShlLC10Lmxlbmd0aCk7Zm9yKHZhciByPTA7dC5sZW5ndGg+cjtyKyspZS5zZXQocix0W3JdKX0pfSxmZS5wcm90b3R5cGUuc2hpZnQ9ZnVuY3Rpb24oKXtyZXR1cm4gd2UodGhpcywxKX0sZmUucHJvdG90eXBlLm1lcmdlPWZ1bmN0aW9uKCl7cmV0dXJuIFNlKHRoaXMsdm9pZCAwLGFyZ3VtZW50cyl9LGZlLnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIFNlKHRoaXMsdCxlKX0sZmUucHJvdG90eXBlLm1lcmdlRGVlcD1mdW5jdGlvbigpe3JldHVybiBTZSh0aGlzLG5lKHZvaWQgMCksYXJndW1lbnRzKTtcbn0sZmUucHJvdG90eXBlLm1lcmdlRGVlcFdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIFNlKHRoaXMsbmUodCksZSl9LGZlLnByb3RvdHlwZS5zZXRTaXplPWZ1bmN0aW9uKHQpe3JldHVybiB3ZSh0aGlzLDAsdCl9LGZlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuc2l6ZTtyZXR1cm4gYSh0LGUscik/dGhpczp3ZSh0aGlzLGgodCxyKSxmKGUscikpfSxmZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPTAsbj1wZSh0aGlzLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPW4oKTtyZXR1cm4gZT09PVZyP0koKTp6KHQscisrLGUpfSl9LGZlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHIsbj0wLGk9cGUodGhpcyxlKTsocj1pKCkpIT09VnImJnQocixuKyssdGhpcykhPT0hMTspO3JldHVybiBufSxmZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD92ZSh0aGlzLl9vcmlnaW4sdGhpcy5fY2FwYWNpdHksdGhpcy5fbGV2ZWwsdGhpcy5fcm9vdCx0aGlzLl90YWlsLHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMpfSxmZS5pc0xpc3Q9Y2U7dmFyIE5yPVwiQEBfX0lNTVVUQUJMRV9MSVNUX19AQFwiLFByPWZlLnByb3RvdHlwZTtQcltOcl09ITAsUHJbc3JdPVByLnJlbW92ZSxQci5zZXRJbj1Uci5zZXRJbixQci5kZWxldGVJbj1Qci5yZW1vdmVJbj1Uci5yZW1vdmVJbixQci51cGRhdGU9VHIudXBkYXRlLFByLnVwZGF0ZUluPVRyLnVwZGF0ZUluLFByLm1lcmdlSW49VHIubWVyZ2VJbixQci5tZXJnZURlZXBJbj1Uci5tZXJnZURlZXBJbixQci53aXRoTXV0YXRpb25zPVRyLndpdGhNdXRhdGlvbnMsUHIuYXNNdXRhYmxlPVRyLmFzTXV0YWJsZSxQci5hc0ltbXV0YWJsZT1Uci5hc0ltbXV0YWJsZSxQci53YXNBbHRlcmVkPVRyLndhc0FsdGVyZWQsX2UucHJvdG90eXBlLnJlbW92ZUJlZm9yZT1mdW5jdGlvbih0LGUscil7aWYocj09PWU/MTw8ZTowPT09dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIHRoaXM7dmFyIG49cj4+PmUmZnI7aWYobj49dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIG5ldyBfZShbXSx0KTt2YXIgaSxvPTA9PT1uO2lmKGU+MCl7dmFyIHU9dGhpcy5hcnJheVtuXTtpZihpPXUmJnUucmVtb3ZlQmVmb3JlKHQsZS1hcixyKSxpPT09dSYmbylyZXR1cm4gdGhpc31pZihvJiYhaSlyZXR1cm4gdGhpczt2YXIgcz1tZSh0aGlzLHQpO2lmKCFvKWZvcih2YXIgYT0wO24+YTthKyspcy5hcnJheVthXT12b2lkIDA7cmV0dXJuIGkmJihzLmFycmF5W25dPWkpLHN9LF9lLnByb3RvdHlwZS5yZW1vdmVBZnRlcj1mdW5jdGlvbih0LGUscil7aWYocj09PShlPzE8PGU6MCl8fDA9PT10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gdGhpczt2YXIgbj1yLTE+Pj5lJmZyO2lmKG4+PXRoaXMuYXJyYXkubGVuZ3RoKXJldHVybiB0aGlzO3ZhciBpO2lmKGU+MCl7dmFyIG89dGhpcy5hcnJheVtuXTtpZihpPW8mJm8ucmVtb3ZlQWZ0ZXIodCxlLWFyLHIpLGk9PT1vJiZuPT09dGhpcy5hcnJheS5sZW5ndGgtMSlyZXR1cm4gdGhpc312YXIgdT1tZSh0aGlzLHQpO3JldHVybiB1LmFycmF5LnNwbGljZShuKzEpLGkmJih1LmFycmF5W25dPWkpLHV9O3ZhciBIcixWcj17fTt0KEllLEx0KSxJZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LEllLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJPcmRlcmVkTWFwIHtcIixcIn1cIil9LEllLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9tYXAuZ2V0KHQpO3JldHVybiB2b2lkIDAhPT1yP3RoaXMuX2xpc3QuZ2V0KHIpWzFdOmV9LEllLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX21hcC5jbGVhcigpLHRoaXMuX2xpc3QuY2xlYXIoKSx0aGlzKTpEZSgpO1xufSxJZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE1lKHRoaXMsdCxlKX0sSWUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gTWUodGhpcyx0LGNyKX0sSWUucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKXx8dGhpcy5fbGlzdC53YXNBbHRlcmVkKCl9LEllLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiB0aGlzLl9saXN0Ll9faXRlcmF0ZShmdW5jdGlvbihlKXtyZXR1cm4gZSYmdChlWzFdLGVbMF0scil9LGUpfSxJZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9saXN0LmZyb21FbnRyeVNlcSgpLl9faXRlcmF0b3IodCxlKX0sSWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7aWYodD09PXRoaXMuX19vd25lcklEKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpLHI9dGhpcy5fbGlzdC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P3FlKGUscix0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9tYXA9ZSx0aGlzLl9saXN0PXIsdGhpcyl9LEllLmlzT3JkZXJlZE1hcD1iZSxJZS5wcm90b3R5cGVbZHJdPSEwLEllLnByb3RvdHlwZVtzcl09SWUucHJvdG90eXBlLnJlbW92ZTt2YXIgWXI7dChFZSxZKSxFZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTdGFjayBbXCIsXCJdXCIpfSxFZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faGVhZDtmb3IodD11KHRoaXMsdCk7ciYmdC0tOylyPXIubmV4dDtyZXR1cm4gcj9yLnZhbHVlOmV9LEVlLnByb3RvdHlwZS5wZWVrPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2hlYWQmJnRoaXMuX2hlYWQudmFsdWV9LEVlLnByb3RvdHlwZS5wdXNoPWZ1bmN0aW9uKCl7aWYoMD09PWFyZ3VtZW50cy5sZW5ndGgpcmV0dXJuIHRoaXM7Zm9yKHZhciB0PXRoaXMuc2l6ZSthcmd1bWVudHMubGVuZ3RoLGU9dGhpcy5faGVhZCxyPWFyZ3VtZW50cy5sZW5ndGgtMTtyPj0wO3ItLSllPXt2YWx1ZTphcmd1bWVudHNbcl0sbmV4dDplfTtyZXR1cm4gdGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT10LHRoaXMuX2hlYWQ9ZSx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6eGUodCxlKX0sRWUucHJvdG90eXBlLnB1c2hBbGw9ZnVuY3Rpb24odCl7aWYodD12KHQpLDA9PT10LnNpemUpcmV0dXJuIHRoaXM7c3QodC5zaXplKTt2YXIgZT10aGlzLnNpemUscj10aGlzLl9oZWFkO3JldHVybiB0LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe2UrKyxyPXt2YWx1ZTp0LG5leHQ6cn19KSx0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPWUsdGhpcy5faGVhZD1yLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZShlLHIpfSxFZS5wcm90b3R5cGUucG9wPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMSl9LEVlLnByb3RvdHlwZS51bnNoaWZ0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucHVzaC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS51bnNoaWZ0QWxsPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnB1c2hBbGwodCl9LEVlLnByb3RvdHlwZS5zaGlmdD1mdW5jdGlvbigpe3JldHVybiB0aGlzLnBvcC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEVlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3JldHVybiAwPT09dGhpcy5zaXplP3RoaXM6dGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT0wLHRoaXMuX2hlYWQ9dm9pZCAwLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTprZSgpfSxFZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXtpZihhKHQsZSx0aGlzLnNpemUpKXJldHVybiB0aGlzO3ZhciByPWgodCx0aGlzLnNpemUpLG49ZihlLHRoaXMuc2l6ZSk7aWYobiE9PXRoaXMuc2l6ZSlyZXR1cm4gWS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLHQsZSk7XG4gIGZvcih2YXIgaT10aGlzLnNpemUtcixvPXRoaXMuX2hlYWQ7ci0tOylvPW8ubmV4dDtyZXR1cm4gdGhpcy5fX293bmVySUQ/KHRoaXMuc2l6ZT1pLHRoaXMuX2hlYWQ9byx0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6eGUoaSxvKX0sRWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7cmV0dXJuIHQ9PT10aGlzLl9fb3duZXJJRD90aGlzOnQ/eGUodGhpcy5zaXplLHRoaXMuX2hlYWQsdCx0aGlzLl9faGFzaCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fX2FsdGVyZWQ9ITEsdGhpcyl9LEVlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLnJldmVyc2UoKS5fX2l0ZXJhdGUodCk7Zm9yKHZhciByPTAsbj10aGlzLl9oZWFkO24mJnQobi52YWx1ZSxyKyssdGhpcykhPT0hMTspbj1uLm5leHQ7cmV0dXJuIHJ9LEVlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7aWYoZSlyZXR1cm4gdGhpcy5yZXZlcnNlKCkuX19pdGVyYXRvcih0KTt2YXIgcj0wLG49dGhpcy5faGVhZDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZihuKXt2YXIgZT1uLnZhbHVlO3JldHVybiBuPW4ubmV4dCx6KHQscisrLGUpfXJldHVybiBJKCl9KX0sRWUuaXNTdGFjaz1PZTt2YXIgUXI9XCJAQF9fSU1NVVRBQkxFX1NUQUNLX19AQFwiLFhyPUVlLnByb3RvdHlwZTtYcltRcl09ITAsWHIud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLFhyLmFzTXV0YWJsZT1Uci5hc011dGFibGUsWHIuYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsWHIud2FzQWx0ZXJlZD1Uci53YXNBbHRlcmVkO3ZhciBGcjt0KEFlLFEpLEFlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sQWUuZnJvbUtleXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMocCh0KS5rZXlTZXEoKSl9LEFlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXQge1wiLFwifVwiKX0sQWUucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fbWFwLmhhcyh0KX0sQWUucHJvdG90eXBlLmFkZD1mdW5jdGlvbih0KXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAuc2V0KHQsITApKX0sQWUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAucmVtb3ZlKHQpKX0sQWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIFJlKHRoaXMsdGhpcy5fbWFwLmNsZWFyKCkpfSxBZS5wcm90b3R5cGUudW5pb249ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtyZXR1cm4gdD10LmZpbHRlcihmdW5jdGlvbih0KXtyZXR1cm4gMCE9PXQuc2l6ZX0pLDA9PT10Lmxlbmd0aD90aGlzOjAhPT10aGlzLnNpemV8fHRoaXMuX19vd25lcklEfHwxIT09dC5sZW5ndGg/dGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe2Zvcih2YXIgcj0wO3QubGVuZ3RoPnI7cisrKWwodFtyXSkuZm9yRWFjaChmdW5jdGlvbih0KXtyZXR1cm4gZS5hZGQodCl9KX0pOnRoaXMuY29uc3RydWN0b3IodFswXSl9LEFlLnByb3RvdHlwZS5pbnRlcnNlY3Q9ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtpZigwPT09dC5sZW5ndGgpcmV0dXJuIHRoaXM7dD10Lm1hcChmdW5jdGlvbih0KXtyZXR1cm4gbCh0KX0pO3ZhciBlPXRoaXM7cmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihyKXtlLmZvckVhY2goZnVuY3Rpb24oZSl7dC5ldmVyeShmdW5jdGlvbih0KXtyZXR1cm4gdC5pbmNsdWRlcyhlKX0pfHxyLnJlbW92ZShlKX0pfSl9LEFlLnByb3RvdHlwZS5zdWJ0cmFjdD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO2lmKDA9PT10Lmxlbmd0aClyZXR1cm4gdGhpczt0PXQubWFwKGZ1bmN0aW9uKHQpe3JldHVybiBsKHQpfSk7dmFyIGU9dGhpcztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe2UuZm9yRWFjaChmdW5jdGlvbihlKXt0LnNvbWUoZnVuY3Rpb24odCl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9KSYmci5yZW1vdmUoZSk7XG59KX0pfSxBZS5wcm90b3R5cGUubWVyZ2U9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LEFlLnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24oKXt2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLHQpfSxBZS5wcm90b3R5cGUuc29ydD1mdW5jdGlvbih0KXtyZXR1cm4gTGUocXQodGhpcyx0KSl9LEFlLnByb3RvdHlwZS5zb3J0Qnk9ZnVuY3Rpb24odCxlKXtyZXR1cm4gTGUocXQodGhpcyxlLHQpKX0sQWUucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKX0sQWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX21hcC5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxuKXtyZXR1cm4gdChuLG4scil9LGUpfSxBZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9tYXAubWFwKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIGV9KS5fX2l0ZXJhdG9yKHQsZSl9LEFlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe2lmKHQ9PT10aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAuX19lbnN1cmVPd25lcih0KTtyZXR1cm4gdD90aGlzLl9fbWFrZShlLHQpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX21hcD1lLHRoaXMpfSxBZS5pc1NldD1qZTt2YXIgR3I9XCJAQF9fSU1NVVRBQkxFX1NFVF9fQEBcIixacj1BZS5wcm90b3R5cGU7WnJbR3JdPSEwLFpyW3NyXT1aci5yZW1vdmUsWnIubWVyZ2VEZWVwPVpyLm1lcmdlLFpyLm1lcmdlRGVlcFdpdGg9WnIubWVyZ2VXaXRoLFpyLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxaci5hc011dGFibGU9VHIuYXNNdXRhYmxlLFpyLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLFpyLl9fZW1wdHk9S2UsWnIuX19tYWtlPVVlO3ZhciAkcjt0KExlLEFlKSxMZS5vZj1mdW5jdGlvbigpe3JldHVybiB0aGlzKGFyZ3VtZW50cyl9LExlLmZyb21LZXlzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzKHAodCkua2V5U2VxKCkpfSxMZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiT3JkZXJlZFNldCB7XCIsXCJ9XCIpfSxMZS5pc09yZGVyZWRTZXQ9VGU7dmFyIHRuPUxlLnByb3RvdHlwZTt0bltkcl09ITAsdG4uX19lbXB0eT1CZSx0bi5fX21ha2U9V2U7dmFyIGVuO3QoQ2UsViksQ2UucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhOZSh0aGlzKStcIiB7XCIsXCJ9XCIpfSxDZS5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9kZWZhdWx0VmFsdWVzLmhhc093blByb3BlcnR5KHQpfSxDZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7aWYoIXRoaXMuaGFzKHQpKXJldHVybiBlO3ZhciByPXRoaXMuX2RlZmF1bHRWYWx1ZXNbdF07cmV0dXJuIHRoaXMuX21hcD90aGlzLl9tYXAuZ2V0KHQscik6cn0sQ2UucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7aWYodGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXMuX21hcCYmdGhpcy5fbWFwLmNsZWFyKCksdGhpczt2YXIgdD10aGlzLmNvbnN0cnVjdG9yO3JldHVybiB0Ll9lbXB0eXx8KHQuX2VtcHR5PUplKHRoaXMsUXQoKSkpfSxDZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7aWYoIXRoaXMuaGFzKHQpKXRocm93IEVycm9yKCdDYW5ub3Qgc2V0IHVua25vd24ga2V5IFwiJyt0KydcIiBvbiAnK05lKHRoaXMpKTt2YXIgcj10aGlzLl9tYXAmJnRoaXMuX21hcC5zZXQodCxlKTtyZXR1cm4gdGhpcy5fX293bmVySUR8fHI9PT10aGlzLl9tYXA/dGhpczpKZSh0aGlzLHIpfSxDZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe2lmKCF0aGlzLmhhcyh0KSlyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAmJnRoaXMuX21hcC5yZW1vdmUodCk7cmV0dXJuIHRoaXMuX19vd25lcklEfHxlPT09dGhpcy5fbWFwP3RoaXM6SmUodGhpcyxlKX0sQ2UucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCl9LENlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gcCh0aGlzLl9kZWZhdWx0VmFsdWVzKS5tYXAoZnVuY3Rpb24odCxlKXtyZXR1cm4gci5nZXQoZSl9KS5fX2l0ZXJhdG9yKHQsZSl9LENlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBwKHRoaXMuX2RlZmF1bHRWYWx1ZXMpLm1hcChmdW5jdGlvbih0LGUpe3JldHVybiByLmdldChlKX0pLl9faXRlcmF0ZSh0LGUpfSxDZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtpZih0PT09dGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXM7dmFyIGU9dGhpcy5fbWFwJiZ0aGlzLl9tYXAuX19lbnN1cmVPd25lcih0KTtyZXR1cm4gdD9KZSh0aGlzLGUsdCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fbWFwPWUsdGhpcyl9O3ZhciBybj1DZS5wcm90b3R5cGU7cm5bc3JdPXJuLnJlbW92ZSxybi5kZWxldGVJbj1ybi5yZW1vdmVJbj1Uci5yZW1vdmVJbixybi5tZXJnZT1Uci5tZXJnZSxybi5tZXJnZVdpdGg9VHIubWVyZ2VXaXRoLHJuLm1lcmdlSW49VHIubWVyZ2VJbixybi5tZXJnZURlZXA9VHIubWVyZ2VEZWVwLHJuLm1lcmdlRGVlcFdpdGg9VHIubWVyZ2VEZWVwV2l0aCxybi5tZXJnZURlZXBJbj1Uci5tZXJnZURlZXBJbixybi5zZXRJbj1Uci5zZXRJbixybi51cGRhdGU9VHIudXBkYXRlLHJuLnVwZGF0ZUluPVRyLnVwZGF0ZUluLHJuLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxybi5hc011dGFibGU9VHIuYXNNdXRhYmxlLHJuLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLHQoWWUsayksWWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/XCJSYW5nZSBbXVwiOlwiUmFuZ2UgWyBcIit0aGlzLl9zdGFydCtcIi4uLlwiK3RoaXMuX2VuZCsodGhpcy5fc3RlcD4xP1wiIGJ5IFwiK3RoaXMuX3N0ZXA6XCJcIikrXCIgXVwifSxZZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuaGFzKHQpP3RoaXMuX3N0YXJ0K3UodGhpcyx0KSp0aGlzLl9zdGVwOmV9LFllLnByb3RvdHlwZS5pbmNsdWRlcz1mdW5jdGlvbih0KXt2YXIgZT0odC10aGlzLl9zdGFydCkvdGhpcy5fc3RlcDtyZXR1cm4gZT49MCYmdGhpcy5zaXplPmUmJmU9PT1NYXRoLmZsb29yKGUpfSxZZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXtyZXR1cm4gYSh0LGUsdGhpcy5zaXplKT90aGlzOih0PWgodCx0aGlzLnNpemUpLGU9ZihlLHRoaXMuc2l6ZSksdD49ZT9uZXcgWWUoMCwwKTpuZXcgWWUodGhpcy5nZXQodCx0aGlzLl9lbmQpLHRoaXMuZ2V0KGUsdGhpcy5fZW5kKSx0aGlzLl9zdGVwKSl9LFllLnByb3RvdHlwZS5pbmRleE9mPWZ1bmN0aW9uKHQpe3ZhciBlPXQtdGhpcy5fc3RhcnQ7aWYoZSV0aGlzLl9zdGVwPT09MCl7dmFyIHI9ZS90aGlzLl9zdGVwO2lmKHI+PTAmJnRoaXMuc2l6ZT5yKXJldHVybiByfXJldHVybi0xfSxZZS5wcm90b3R5cGUubGFzdEluZGV4T2Y9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuaW5kZXhPZih0KX0sWWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLnNpemUtMSxuPXRoaXMuX3N0ZXAsaT1lP3RoaXMuX3N0YXJ0K3Iqbjp0aGlzLl9zdGFydCxvPTA7cj49bztvKyspe2lmKHQoaSxvLHRoaXMpPT09ITEpcmV0dXJuIG8rMTtpKz1lPy1uOm59cmV0dXJuIG99LFllLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5zaXplLTEsbj10aGlzLl9zdGVwLGk9ZT90aGlzLl9zdGFydCtyKm46dGhpcy5fc3RhcnQsbz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB1PWk7cmV0dXJuIGkrPWU/LW46bixvPnI/SSgpOnoodCxvKyssdSl9KX0sWWUucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbih0KXtyZXR1cm4gdCBpbnN0YW5jZW9mIFllP3RoaXMuX3N0YXJ0PT09dC5fc3RhcnQmJnRoaXMuX2VuZD09PXQuX2VuZCYmdGhpcy5fc3RlcD09PXQuX3N0ZXA6VmUodGhpcyx0KTtcbn07dmFyIG5uO3QoUWUsayksUWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/XCJSZXBlYXQgW11cIjpcIlJlcGVhdCBbIFwiK3RoaXMuX3ZhbHVlK1wiIFwiK3RoaXMuc2l6ZStcIiB0aW1lcyBdXCJ9LFFlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fdmFsdWU6ZX0sUWUucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3JldHVybiBYKHRoaXMuX3ZhbHVlLHQpfSxRZS5wcm90b3R5cGUuc2xpY2U9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLnNpemU7cmV0dXJuIGEodCxlLHIpP3RoaXM6bmV3IFFlKHRoaXMuX3ZhbHVlLGYoZSxyKS1oKHQscikpfSxRZS5wcm90b3R5cGUucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxRZS5wcm90b3R5cGUuaW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gWCh0aGlzLl92YWx1ZSx0KT8wOi0xfSxRZS5wcm90b3R5cGUubGFzdEluZGV4T2Y9ZnVuY3Rpb24odCl7cmV0dXJuIFgodGhpcy5fdmFsdWUsdCk/dGhpcy5zaXplOi0xfSxRZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT0wO3RoaXMuc2l6ZT5lO2UrKylpZih0KHRoaXMuX3ZhbHVlLGUsdGhpcyk9PT0hMSlyZXR1cm4gZSsxO3JldHVybiBlfSxRZS5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLHI9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtyZXR1cm4gZS5zaXplPnI/eih0LHIrKyxlLl92YWx1ZSk6SSgpfSl9LFFlLnByb3RvdHlwZS5lcXVhbHM9ZnVuY3Rpb24odCl7cmV0dXJuIHQgaW5zdGFuY2VvZiBRZT9YKHRoaXMuX3ZhbHVlLHQuX3ZhbHVlKTpWZSh0KX07dmFyIG9uO18uSXRlcmF0b3I9UyxYZShfLHt0b0FycmF5OmZ1bmN0aW9uKCl7c3QodGhpcy5zaXplKTt2YXIgdD1BcnJheSh0aGlzLnNpemV8fDApO3JldHVybiB0aGlzLnZhbHVlU2VxKCkuX19pdGVyYXRlKGZ1bmN0aW9uKGUscil7dFtyXT1lfSksdH0sdG9JbmRleGVkU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBodCh0aGlzKX0sdG9KUzpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvU2VxKCkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnRvSlM/dC50b0pTKCk6dH0pLl9fdG9KUygpfSx0b0pTT046ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdCYmXCJmdW5jdGlvblwiPT10eXBlb2YgdC50b0pTT04/dC50b0pTT04oKTp0fSkuX190b0pTKCl9LHRvS2V5ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGF0KHRoaXMsITApfSx0b01hcDpmdW5jdGlvbigpe3JldHVybiBMdCh0aGlzLnRvS2V5ZWRTZXEoKSl9LHRvT2JqZWN0OmZ1bmN0aW9uKCl7c3QodGhpcy5zaXplKTt2YXIgdD17fTtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxyKXt0W3JdPWV9KSx0fSx0b09yZGVyZWRNYXA6ZnVuY3Rpb24oKXtyZXR1cm4gSWUodGhpcy50b0tleWVkU2VxKCkpfSx0b09yZGVyZWRTZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gTGUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU2V0OmZ1bmN0aW9uKCl7cmV0dXJuIEFlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b1NldFNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgZnQodGhpcyl9LHRvU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG0odGhpcyk/dGhpcy50b0luZGV4ZWRTZXEoKTpkKHRoaXMpP3RoaXMudG9LZXllZFNlcSgpOnRoaXMudG9TZXRTZXEoKX0sdG9TdGFjazpmdW5jdGlvbigpe3JldHVybiBFZShkKHRoaXMpP3RoaXMudmFsdWVTZXEoKTp0aGlzKX0sdG9MaXN0OmZ1bmN0aW9uKCl7cmV0dXJuIGZlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b1N0cmluZzpmdW5jdGlvbigpe3JldHVyblwiW0l0ZXJhYmxlXVwifSxfX3RvU3RyaW5nOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIDA9PT10aGlzLnNpemU/dCtlOnQrXCIgXCIrdGhpcy50b1NlcSgpLm1hcCh0aGlzLl9fdG9TdHJpbmdNYXBwZXIpLmpvaW4oXCIsIFwiKStcIiBcIitlfSxjb25jYXQ6ZnVuY3Rpb24oKXtcbiAgdmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMCk7cmV0dXJuIE90KHRoaXMsU3QodGhpcyx0KSl9LGluY2x1ZGVzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnNvbWUoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxlbnRyaWVzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19pdGVyYXRvcih3cil9LGV2ZXJ5OmZ1bmN0aW9uKHQsZSl7c3QodGhpcy5zaXplKTt2YXIgcj0hMDtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obixpLG8pe3JldHVybiB0LmNhbGwoZSxuLGksbyk/dm9pZCAwOihyPSExLCExKX0pLHJ9LGZpbHRlcjpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLGx0KHRoaXMsdCxlLCEwKSl9LGZpbmQ6ZnVuY3Rpb24odCxlLHIpe3ZhciBuPXRoaXMuZmluZEVudHJ5KHQsZSk7cmV0dXJuIG4/blsxXTpyfSxmaW5kRW50cnk6ZnVuY3Rpb24odCxlKXt2YXIgcjtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obixpLG8pe3JldHVybiB0LmNhbGwoZSxuLGksbyk/KHI9W2ksbl0sITEpOnZvaWQgMH0pLHJ9LGZpbmRMYXN0RW50cnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maW5kRW50cnkodCxlKX0sZm9yRWFjaDpmdW5jdGlvbih0LGUpe3JldHVybiBzdCh0aGlzLnNpemUpLHRoaXMuX19pdGVyYXRlKGU/dC5iaW5kKGUpOnQpfSxqb2luOmZ1bmN0aW9uKHQpe3N0KHRoaXMuc2l6ZSksdD12b2lkIDAhPT10P1wiXCIrdDpcIixcIjt2YXIgZT1cIlwiLHI9ITA7cmV0dXJuIHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKG4pe3I/cj0hMTplKz10LGUrPW51bGwhPT1uJiZ2b2lkIDAhPT1uP1wiXCIrbjpcIlwifSksZX0sa2V5czpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faXRlcmF0b3IobXIpfSxtYXA6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxwdCh0aGlzLHQsZSkpfSxyZWR1Y2U6ZnVuY3Rpb24odCxlLHIpe3N0KHRoaXMuc2l6ZSk7dmFyIG4saTtyZXR1cm4gYXJndW1lbnRzLmxlbmd0aDwyP2k9ITA6bj1lLHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKGUsbyx1KXtpPyhpPSExLG49ZSk6bj10LmNhbGwocixuLGUsbyx1KX0pLG59LHJlZHVjZVJpZ2h0OmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpO3JldHVybiB0LnJlZHVjZS5hcHBseSh0LGFyZ3VtZW50cyl9LHJldmVyc2U6ZnVuY3Rpb24oKXtyZXR1cm4gT3QodGhpcyx2dCh0aGlzLCEwKSl9LHNsaWNlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbXQodGhpcyx0LGUsITApKX0sc29tZTpmdW5jdGlvbih0LGUpe3JldHVybiF0aGlzLmV2ZXJ5KFplKHQpLGUpfSxzb3J0OmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHF0KHRoaXMsdCkpfSx2YWx1ZXM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKGdyKX0sYnV0TGFzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLnNsaWNlKDAsLTEpfSxpc0VtcHR5OmZ1bmN0aW9uKCl7cmV0dXJuIHZvaWQgMCE9PXRoaXMuc2l6ZT8wPT09dGhpcy5zaXplOiF0aGlzLnNvbWUoZnVuY3Rpb24oKXtyZXR1cm4hMH0pfSxjb3VudDpmdW5jdGlvbih0LGUpe3JldHVybiBvKHQ/dGhpcy50b1NlcSgpLmZpbHRlcih0LGUpOnRoaXMpfSxjb3VudEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHl0KHRoaXMsdCxlKX0sZXF1YWxzOmZ1bmN0aW9uKHQpe3JldHVybiBWZSh0aGlzLHQpfSxlbnRyeVNlcTpmdW5jdGlvbigpe3ZhciB0PXRoaXM7aWYodC5fY2FjaGUpcmV0dXJuIG5ldyBqKHQuX2NhY2hlKTt2YXIgZT10LnRvU2VxKCkubWFwKEdlKS50b0luZGV4ZWRTZXEoKTtyZXR1cm4gZS5mcm9tRW50cnlTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdC50b1NlcSgpfSxlfSxmaWx0ZXJOb3Q6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5maWx0ZXIoWmUodCksZSl9LGZpbmRMYXN0OmZ1bmN0aW9uKHQsZSxyKXtyZXR1cm4gdGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpLmZpbmQodCxlLHIpfSxmaXJzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmZpbmQocyl9LGZsYXRNYXA6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxJdCh0aGlzLHQsZSkpO1xufSxmbGF0dGVuOmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHp0KHRoaXMsdCwhMCkpfSxmcm9tRW50cnlTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGN0KHRoaXMpfSxnZXQ6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5maW5kKGZ1bmN0aW9uKGUscil7cmV0dXJuIFgocix0KX0sdm9pZCAwLGUpfSxnZXRJbjpmdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPXRoaXMsaT1LdCh0KTshKHI9aS5uZXh0KCkpLmRvbmU7KXt2YXIgbz1yLnZhbHVlO2lmKG49biYmbi5nZXQ/bi5nZXQobyxjcik6Y3Isbj09PWNyKXJldHVybiBlfXJldHVybiBufSxncm91cEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIGR0KHRoaXMsdCxlKX0saGFzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmdldCh0LGNyKSE9PWNyfSxoYXNJbjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5nZXRJbih0LGNyKSE9PWNyfSxpc1N1YnNldDpmdW5jdGlvbih0KXtyZXR1cm4gdD1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmluY2x1ZGVzP3Q6Xyh0KSx0aGlzLmV2ZXJ5KGZ1bmN0aW9uKGUpe3JldHVybiB0LmluY2x1ZGVzKGUpfSl9LGlzU3VwZXJzZXQ6ZnVuY3Rpb24odCl7cmV0dXJuIHQ9XCJmdW5jdGlvblwiPT10eXBlb2YgdC5pc1N1YnNldD90Ol8odCksdC5pc1N1YnNldCh0aGlzKX0sa2V5U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoRmUpLnRvSW5kZXhlZFNlcSgpfSxsYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmlyc3QoKX0sbWF4OmZ1bmN0aW9uKHQpe3JldHVybiBEdCh0aGlzLHQpfSxtYXhCeTpmdW5jdGlvbih0LGUpe3JldHVybiBEdCh0aGlzLGUsdCl9LG1pbjpmdW5jdGlvbih0KXtyZXR1cm4gRHQodGhpcyx0PyRlKHQpOnJyKX0sbWluQnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gRHQodGhpcyxlPyRlKGUpOnJyLHQpfSxyZXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMSl9LHNraXA6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc2xpY2UoTWF0aC5tYXgoMCx0KSl9LHNraXBMYXN0OmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuc2tpcCh0KS5yZXZlcnNlKCkpfSxza2lwV2hpbGU6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyx3dCh0aGlzLHQsZSwhMCkpfSxza2lwVW50aWw6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5za2lwV2hpbGUoWmUodCksZSl9LHNvcnRCeTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHF0KHRoaXMsZSx0KSl9LHRha2U6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc2xpY2UoMCxNYXRoLm1heCgwLHQpKX0sdGFrZUxhc3Q6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLnJldmVyc2UoKS50YWtlKHQpLnJldmVyc2UoKSl9LHRha2VXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLGd0KHRoaXMsdCxlKSl9LHRha2VVbnRpbDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnRha2VXaGlsZShaZSh0KSxlKX0sdmFsdWVTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b0luZGV4ZWRTZXEoKX0saGFzaENvZGU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2hhc2h8fCh0aGlzLl9faGFzaD1ucih0aGlzKSl9fSk7dmFyIHVuPV8ucHJvdG90eXBlO3VuW3ZyXT0hMCx1bltJcl09dW4udmFsdWVzLHVuLl9fdG9KUz11bi50b0FycmF5LHVuLl9fdG9TdHJpbmdNYXBwZXI9dHIsdW4uaW5zcGVjdD11bi50b1NvdXJjZT1mdW5jdGlvbigpe3JldHVyblwiXCIrdGhpc30sdW4uY2hhaW49dW4uZmxhdE1hcCx1bi5jb250YWlucz11bi5pbmNsdWRlcyxmdW5jdGlvbigpe3RyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkodW4sXCJsZW5ndGhcIix7Z2V0OmZ1bmN0aW9uKCl7aWYoIV8ubm9MZW5ndGhXYXJuaW5nKXt2YXIgdDt0cnl7dGhyb3cgRXJyb3IoKX1jYXRjaChlKXt0PWUuc3RhY2t9aWYoLTE9PT10LmluZGV4T2YoXCJfd3JhcE9iamVjdFwiKSlyZXR1cm4gY29uc29sZSYmY29uc29sZS53YXJuJiZjb25zb2xlLndhcm4oXCJpdGVyYWJsZS5sZW5ndGggaGFzIGJlZW4gZGVwcmVjYXRlZCwgdXNlIGl0ZXJhYmxlLnNpemUgb3IgaXRlcmFibGUuY291bnQoKS4gVGhpcyB3YXJuaW5nIHdpbGwgYmVjb21lIGEgc2lsZW50IGVycm9yIGluIGEgZnV0dXJlIHZlcnNpb24uIFwiK3QpLFxuICB0aGlzLnNpemV9fX0pfWNhdGNoKHQpe319KCksWGUocCx7ZmxpcDpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLF90KHRoaXMpKX0sZmluZEtleTpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuZmluZEVudHJ5KHQsZSk7cmV0dXJuIHImJnJbMF19LGZpbmRMYXN0S2V5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmluZEtleSh0LGUpfSxrZXlPZjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5maW5kS2V5KGZ1bmN0aW9uKGUpe3JldHVybiBYKGUsdCl9KX0sbGFzdEtleU9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmZpbmRMYXN0S2V5KGZ1bmN0aW9uKGUpe3JldHVybiBYKGUsdCl9KX0sbWFwRW50cmllczpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj0wO3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5tYXAoZnVuY3Rpb24oaSxvKXtyZXR1cm4gdC5jYWxsKGUsW28saV0sbisrLHIpfSkuZnJvbUVudHJ5U2VxKCkpfSxtYXBLZXlzOmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gT3QodGhpcyx0aGlzLnRvU2VxKCkuZmxpcCgpLm1hcChmdW5jdGlvbihuLGkpe3JldHVybiB0LmNhbGwoZSxuLGkscil9KS5mbGlwKCkpfX0pO3ZhciBzbj1wLnByb3RvdHlwZTtzbltscl09ITAsc25bSXJdPXVuLmVudHJpZXMsc24uX190b0pTPXVuLnRvT2JqZWN0LHNuLl9fdG9TdHJpbmdNYXBwZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gSlNPTi5zdHJpbmdpZnkoZSkrXCI6IFwiK3RyKHQpfSxYZSh2LHt0b0tleWVkU2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBhdCh0aGlzLCExKX0sZmlsdGVyOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbHQodGhpcyx0LGUsITEpKX0sZmluZEluZGV4OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gcj9yWzBdOi0xfSxpbmRleE9mOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMudG9LZXllZFNlcSgpLmtleU9mKHQpO3JldHVybiB2b2lkIDA9PT1lPy0xOmV9LGxhc3RJbmRleE9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmluZGV4T2YodCl9LHJldmVyc2U6ZnVuY3Rpb24oKXtyZXR1cm4gT3QodGhpcyx2dCh0aGlzLCExKSl9LHNsaWNlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbXQodGhpcyx0LGUsITEpKX0sc3BsaWNlOmZ1bmN0aW9uKHQsZSl7dmFyIHI9YXJndW1lbnRzLmxlbmd0aDtpZihlPU1hdGgubWF4KDB8ZSwwKSwwPT09cnx8Mj09PXImJiFlKXJldHVybiB0aGlzO3Q9aCh0LDA+dD90aGlzLmNvdW50KCk6dGhpcy5zaXplKTt2YXIgbj10aGlzLnNsaWNlKDAsdCk7cmV0dXJuIE90KHRoaXMsMT09PXI/bjpuLmNvbmNhdChpKGFyZ3VtZW50cywyKSx0aGlzLnNsaWNlKHQrZSkpKX0sZmluZExhc3RJbmRleDpmdW5jdGlvbih0LGUpe3ZhciByPXRoaXMudG9LZXllZFNlcSgpLmZpbmRMYXN0S2V5KHQsZSk7cmV0dXJuIHZvaWQgMD09PXI/LTE6cn0sZmlyc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5nZXQoMCl9LGZsYXR0ZW46ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsenQodGhpcyx0LCExKSl9LGdldDpmdW5jdGlvbih0LGUpe3JldHVybiB0PXUodGhpcyx0KSwwPnR8fHRoaXMuc2l6ZT09PTEvMHx8dm9pZCAwIT09dGhpcy5zaXplJiZ0PnRoaXMuc2l6ZT9lOnRoaXMuZmluZChmdW5jdGlvbihlLHIpe3JldHVybiByPT09dH0sdm9pZCAwLGUpfSxoYXM6ZnVuY3Rpb24odCl7cmV0dXJuIHQ9dSh0aGlzLHQpLHQ+PTAmJih2b2lkIDAhPT10aGlzLnNpemU/dGhpcy5zaXplPT09MS8wfHx0aGlzLnNpemU+dDotMSE9PXRoaXMuaW5kZXhPZih0KSl9LGludGVycG9zZTpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyxidCh0aGlzLHQpKX0saW50ZXJsZWF2ZTpmdW5jdGlvbigpe3ZhciB0PVt0aGlzXS5jb25jYXQoaShhcmd1bWVudHMpKSxlPUV0KHRoaXMudG9TZXEoKSxrLm9mLHQpLHI9ZS5mbGF0dGVuKCEwKTtyZXR1cm4gZS5zaXplJiYoci5zaXplPWUuc2l6ZSp0Lmxlbmd0aCksT3QodGhpcyxyKX0sbGFzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldCgtMSk7XG59LHNraXBXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHd0KHRoaXMsdCxlLCExKSl9LHppcDpmdW5jdGlvbigpe3ZhciB0PVt0aGlzXS5jb25jYXQoaShhcmd1bWVudHMpKTtyZXR1cm4gT3QodGhpcyxFdCh0aGlzLGVyLHQpKX0semlwV2l0aDpmdW5jdGlvbih0KXt2YXIgZT1pKGFyZ3VtZW50cyk7cmV0dXJuIGVbMF09dGhpcyxPdCh0aGlzLEV0KHRoaXMsdCxlKSl9fSksdi5wcm90b3R5cGVbeXJdPSEwLHYucHJvdG90eXBlW2RyXT0hMCxYZShsLHtnZXQ6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dDplfSxpbmNsdWRlczpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5oYXModCl9LGtleVNlcTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnZhbHVlU2VxKCl9fSksbC5wcm90b3R5cGUuaGFzPXVuLmluY2x1ZGVzLFhlKHgscC5wcm90b3R5cGUpLFhlKGssdi5wcm90b3R5cGUpLFhlKEEsbC5wcm90b3R5cGUpLFhlKFYscC5wcm90b3R5cGUpLFhlKFksdi5wcm90b3R5cGUpLFhlKFEsbC5wcm90b3R5cGUpO3ZhciBhbj17SXRlcmFibGU6XyxTZXE6TyxDb2xsZWN0aW9uOkgsTWFwOkx0LE9yZGVyZWRNYXA6SWUsTGlzdDpmZSxTdGFjazpFZSxTZXQ6QWUsT3JkZXJlZFNldDpMZSxSZWNvcmQ6Q2UsUmFuZ2U6WWUsUmVwZWF0OlFlLGlzOlgsZnJvbUpTOkZ9O3JldHVybiBhbn0pOyJdfQ==
