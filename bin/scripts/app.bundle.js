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

},{"../../vendor/immutable.min.js":45}],20:[function(require,module,exports){
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

var is = require('../../nudoru/util/is.js');

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

},{"../../nudoru/util/is.js":44,"./ImmutableMap.js":19}],21:[function(require,module,exports){
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

var is = require('../../nudoru/util/is.js');

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

},{"../../nudoru/util/is.js":44}],23:[function(require,module,exports){
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
      _browserInfo = require('../../nudoru/browser/BrowserInfo.js'),
      is = require('../../nudoru/util/is.js');

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

module.exports = MixinEventDelegator;

},{"../../nudoru/browser/BrowserInfo.js":34,"../../nudoru/util/is.js":44,"../utils/Rx":25}],31:[function(require,module,exports){
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
module.exports = {
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL0FwcC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3N0b3JlL0FwcFN0b3JlLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L0FwcFZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvUmVnaW9uLlBsYXllclN0YXRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL2FwcC92aWV3L1NjcmVlbi5HYW1lT3Zlci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uTWFpbkdhbWUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLlBsYXllclNlbGVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9hcHAvdmlldy9TY3JlZW4uVGl0bGUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvYXBwL3ZpZXcvU2NyZWVuLldhaXRpbmdPblBsYXllci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9tYWluLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvTm9yaS5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvUmVzdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvSW1tdXRhYmxlTWFwLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvc3RvcmUvTWl4aW5SZWR1Y2VyU3RvcmUuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9EaXNwYXRjaGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvTWl4aW5PYnNlcnZhYmxlU3ViamVjdC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3V0aWxzL1JlbmRlcmVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUm91dGVyLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdXRpbHMvUnguanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluQ29tcG9uZW50Vmlld3MuanMiLCIvVXNlcnMvbWF0dC9Ecm9wYm94L1dvcmsvUGVyc29uYWwgV29yay9IYWxmLUJha2VkL2NvZGUvc3JjL3NjcmlwdHMvbm9yaS92aWV3L01peGluRE9NTWFuaXB1bGF0aW9uLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpbkV2ZW50RGVsZWdhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpbk51ZG9ydUNvbnRyb2xzLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL25vcmkvdmlldy9NaXhpblN0b3JlU3RhdGVWaWV3cy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9ub3JpL3ZpZXcvVmlld0NvbXBvbmVudC5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvYnJvd3Nlci9UaHJlZURUcmFuc2Zvcm1zLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hDcmVhdG9yLmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL01vZGFsQ292ZXJWaWV3LmpzIiwiL1VzZXJzL21hdHQvRHJvcGJveC9Xb3JrL1BlcnNvbmFsIFdvcmsvSGFsZi1CYWtlZC9jb2RlL3NyYy9zY3JpcHRzL251ZG9ydS9jb21wb25lbnRzL1RvYXN0Vmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29tcG9uZW50cy9Ub29sVGlwVmlldy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29yZS9OdW1iZXJVdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvY29yZS9PYmplY3RVdGlscy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy9udWRvcnUvdXRpbC9pcy5qcyIsIi9Vc2Vycy9tYXR0L0Ryb3Bib3gvV29yay9QZXJzb25hbCBXb3JrL0hhbGYtQmFrZWQvY29kZS9zcmMvc2NyaXB0cy92ZW5kb3IvaW1tdXRhYmxlLm1pbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQU0sR0FBRyxHQUFlLE9BQU8sQ0FBQyxxQkFBcUIs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LEdBQUcsS0FBSyxJQUFJLEtBQzdDLEdBQUcsQ0FBQyxRQUFRLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEtBQUssRUFBRSxDQUFBLEFBQUMsSUFDM0MsT0FBTyxHQUFHLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQztHQUNsQztDQUNGLENBQUM7Ozs7Ozs7Ozs7O0FDcENGLENBQUMsQ0FBQSxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFRLElBQUUsT0FBTyxPQUFPLElBQUUsV0FBVyxJQUFFLE9BQU8sTUFBTSxHQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFFLEdBQUMsVUFBVSxJQUFFLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxHQUFHLEdBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFFLENBQUE7Q0FBQyxDQUFBLENBQUMsSUFBSSxFQUFDLFlBQVU7QUFBQyxjQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLENBQUMsU0FBUyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFBLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxRQUFRLElBQUUsT0FBTyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUcsRUFBRSxHQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsVUFBVSxLQUFHLENBQUMsRUFBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFNLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEtBQUksS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFdBQU0sRUFBQyxLQUFLLEVBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxJQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFDLE9BQU0sVUFBVSxJQUFFLE9BQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxJQUFFLFFBQVEsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxDQUFDLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBRSxRQUFRLEVBQUUsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQ2pnRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxjQUFjLEdBQUMsRUFBRSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsR0FBQyxRQUFRLElBQUUsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLHdFQUF3RSxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQywrQ0FBK0MsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxRQUFRLElBQUUsT0FBTyxDQUFDLElBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLGdFQUFnRSxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFVBQU0sU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUM7QUFBQyxXQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsV0FBVyxLQUFHLE1BQU0sSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsV0FBVyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxVQUFVLEdBQUMsVUFBVSxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUNwZ0UsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsVUFBVSxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLFVBQVUsR0FBRSxDQUFDLElBQUUsVUFBVSxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFHLFFBQVEsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxhQUFhLEdBQUMsQ0FBQyxHQUFDLG9CQUFvQixDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLEtBQUcsRUFBRSxLQUFHLEVBQUUsR0FBQyxDQUFDLEVBQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLENBQUMsSUFBRyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUUsRUFBQztBQUFDLFdBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxvQkFBb0IsSUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQSxFQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEVBQUMsVUFBVSxHQUFDLEVBQUUsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxFQUFFLENBQUEsRUFBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJO0FBQUMsVUFBRyxLQUFLLENBQUMsS0FBRyxFQUFFLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUMsSUFBRyxFQUFFLEVBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLEVBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQyxFQUFDLFlBQVksRUFBQyxDQUFDLENBQUMsRUFBQyxRQUFRLEVBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxvQkFBb0IsSUFBRSxDQUFDLENBQUMsb0JBQW9CLEtBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUMsQ0FBQyxDQUFDLG9CQUFvQixHQUFDLFlBQVU7QUFBQyxlQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSTtBQUFDLFlBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBQyxNQUFNLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQztLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsUUFBUSxHQUFFLEtBQUssQ0FBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxlQUFlLElBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUEsQ0FBQztHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxFQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsTUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLG1EQUFtRCxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLGVBQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN6Z0UsRUFBQyxDQUFDLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsV0FBVyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxLQUFHLEVBQUUsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQztBQUFDLGdCQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtXQUFDLE9BQU8sQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFBO09BQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsRUFBRSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxPQUFPLEdBQUMsWUFBVTtBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBRyxFQUFFLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLENBQUE7T0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxpQkFBTztBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7Y0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztjQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDO09BQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxFQUFFLENBQUEsQ0FBRSxTQUFTLEVBQUUsQ0FBQztBQUM5Z0UsS0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFOzs7OEJBQVM7VUFBUixDQUFDO1VBQUMsQ0FBQztVQUFDLENBQUM7VUFBQyxDQUFDO0FBQU0sT0FBQyxHQUF5RSxDQUFDLEdBQVEsQ0FBQyxHQUFxRSxDQUFDLEdBQUMsQ0FBQyxHQUE0QixDQUFDOztBQUE3TCxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUM7YUFBVyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFO2NBQUMsQ0FBQztjQUFDLENBQUM7Y0FBQyxDQUFDOzs7T0FBRSxJQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLElBQUUsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxnQkFBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtTQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztZQUFDLENBQUMsR0FBQyxDQUFDO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxpQkFBSyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsRUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDO0dBQUEsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLO1lBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsR0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxZQUFJLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUU7QUFBQyxlQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxFQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtTQUFDLFFBQU0sQ0FBQyxFQUFFO0FBQ3ZnRSxlQUFPLENBQUMsS0FBRyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDO0tBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxrQkFBTSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtTQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLGtCQUFrQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFLLENBQUMsR0FBRTtBQUFDLGNBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxnQkFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxFQUFFLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUEsQUFBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1dBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1NBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLGlCQUFpQixHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU0sQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFNLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxLQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxBQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0tBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQSxBQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFDaGdFLGFBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZ0JBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO09BQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFlBQUksQ0FBQyxDQUFDLFFBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1NBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQTtTQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGlCQUFPLENBQUMsQ0FBQyxLQUFLLENBQUE7U0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMseUJBQXlCLEdBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUUsU0FBUyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQSxHQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsbUNBQW1DLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxLQUFLLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sRUFBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsTUFBTSxFQUFDLENBQUMsRUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsS0FBSyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsTUFBSTtBQUFDLFVBQUcsQ0FBQyxLQUFHLEVBQUUsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUNqZ0UsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsV0FBVyxLQUFHLEVBQUUsSUFBRSxDQUFDLENBQUMsV0FBVyxLQUFHLEVBQUUsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxPQUFPLEtBQUcsQ0FBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQSxHQUFFLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsR0FBQyxJQUFJLENBQUMsRUFBQSxDQUFBLEFBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxNQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxhQUFhLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQTtLQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsR0FBRyxFQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUM7UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLENBQUMsQ0FBQSxDQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxZQUFPLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLFVBQVUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFBLElBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxTQUFTLENBQUEsQUFBQyxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLEdBQUMsU0FBUyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsRUFBRSxFQUFDLEdBQUcsR0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEVBQUMsUUFBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUMsQ0FBQyxDQUFBLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFDamhFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsSUFBRyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLEdBQUMsRUFBRSxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUEsQUFBQyxFQUFDLFlBQVU7QUFBQyxZQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUEsQ0FBQTtLQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSztVQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsR0FBQyxFQUFFLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQSxBQUFDLEVBQUMsWUFBVTtBQUFDLGlCQUFPO0FBQUMsY0FBRyxDQUFDLEVBQUM7QUFBQyxnQkFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUE7V0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFBO1NBQUM7T0FBQyxDQUFBLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLEdBQUU7QUFBQyxXQUFPLEVBQUUsS0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLElBQUUsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsRUFBQTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDO0FBQ3JrRSxRQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsRUFBRSxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxHQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUs7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFDO0FBQUMsT0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsSUFBRSxFQUFFLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsSUFBRSxDQUFDLENBQUEsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFFO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUMsTUFBTSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxJQUFFLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsSUFBRSxFQUFFLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsRUFBRSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLEVBQUUsSUFBRSxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sS0FBSyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUE7T0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxLQUFHLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBLEFBQUMsQ0FBQSxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsTUFBSyxJQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxJQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQSxHQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3BnRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sRUFBRSxLQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsSUFBRSxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxHQUFFO0FBQUMsV0FBTyxFQUFFLEtBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsU0FBRixDQUFDLENBQVUsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLFlBQVksQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUcsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFBLEFBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsY0FBYyxHQUFDLENBQUMsQ0FBQTtPQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLFdBQVcsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxLQUFLLElBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUUsUUFBUSxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUMsRUFBRTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsRUFBQyxHQUFHLEVBQUMsZUFBVTtBQUFDLGVBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsb0NBQW9DLENBQUMsRUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsSUFBRyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxXQUFXLElBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUk7QUFDeGhFLE9BQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsS0FBSyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxLQUFHLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxFQUFFLElBQUksWUFBWSxFQUFFLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFDLDBCQUEwQixDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBLEVBQUM7QUFBQyxVQUFHLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUMsSUFBSSxDQUFBO0tBQUM7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxFQUFFLElBQUksWUFBWSxFQUFFLENBQUEsQUFBQyxFQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksQ0FBQSxFQUFDO0FBQUMsVUFBRyxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFDLElBQUksQ0FBQTtLQUFDO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLFdBQVMsR0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLFFBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxDQUFDLHFCQUFxQixJQUFFLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sWUFBVTtBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLFlBQVU7QUFBQyxhQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxRQUFRLElBQUUsT0FBTyxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsR0FBRTtBQUFDLFdBQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFlBQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsVUFBVSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUUsRUFBRSxHQUFDLENBQUMsS0FBRyxDQUFDLEVBQUUsRUFBQyxTQUFTLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsSUFBRSxFQUFFLEdBQUMsQ0FBQyxLQUFHLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxVQUFVLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLEVBQUMsVUFBVSxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUUsRUFBQyxVQUFVLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxDQUFDLENBQUEsQ0FBQTtHQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsR0FBQyxDQUFDLEdBQUMsVUFBVSxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxJQUFFLENBQUMsSUFBRSxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLElBQUksRUFBRSxHQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSztNQUFDLEVBQUUsR0FBQyxRQUFRO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQyxJQUFFLEVBQUU7TUFBQyxFQUFFLEdBQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsRUFBRTtNQUFDLEVBQUUsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsRUFBQztNQUFDLEVBQUUsR0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLDRCQUE0QjtNQUFDLEVBQUUsR0FBQyx5QkFBeUI7TUFBQyxFQUFFLEdBQUMsMkJBQTJCO01BQUMsRUFBRSxHQUFDLDJCQUEyQjtNQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLENBQUM7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxVQUFVLElBQUUsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLFFBQVE7TUFBQyxFQUFFLEdBQUMsWUFBWTtNQUFDLEVBQUUsR0FBQyxFQUFFLElBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFNLFlBQVksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxFQUFFLEVBQ3JnRSxDQUFDLENBQUMsTUFBTSxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsT0FBTyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTSxFQUFFLEdBQUMsSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsWUFBVTtBQUFDLFlBQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFFLElBQUksQ0FBQyxpQkFBaUIsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBQyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBLEFBQUMsRUFBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTTtRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHO0FBQ2hrRSxXQUFPLENBQUMsQ0FBQTtHQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsR0FBRSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFFLElBQUksR0FBRTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUEsRUFBQyxNQUFLO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsY0FBYztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLFVBQVUsSUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxLQUFLLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBRyxFQUFFLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxFQUFFLENBQUEsQUFBQyxJQUFFLEVBQUUsS0FBRyxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsQ0FBQTtHQUFDO01BQUMsRUFBRSxHQUFDLE1BQU0sQ0FBQyxZQUFZO01BQUMsRUFBRSxHQUFDLENBQUEsWUFBVTtBQUFDLFFBQUc7QUFBQyxjQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLGFBQU0sQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLENBQUEsRUFBRTtNQUFDLEVBQUUsR0FBQyxVQUFVLElBQUUsT0FBTyxPQUFPLENBQUMsRUFBRSxLQUFHLEVBQUUsR0FBQyxJQUFJLE9BQU8sRUFBQSxDQUFBLEFBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLG1CQUFtQixDQUFDLFVBQVUsSUFBRSxPQUFPLE1BQU0sS0FBRyxFQUFFLEdBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxFQUFFO01BQUMsRUFBRSxHQUFDLEdBQUc7TUFBQyxFQUFFLEdBQUMsQ0FBQztNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSTtRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsUUFBUSxLQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFFBQVEsS0FBRyxDQUFDLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsQUFBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsSUFBSSxDQUFDLFFBQVEsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO0FBQ3ZnRSxXQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQztLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxlQUFPO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDO09BQUM7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLFlBQVU7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsWUFBVTtBQUFDLGFBQU8sRUFBRSxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLEtBQUcsU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsR0FBQyxLQUFLLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksR0FBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxFQUM1Z0UsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEtBQUssQ0FBQyxFQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxFQUFFLEVBQUUsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU0sVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBRSxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBQyxJQUFJLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBQSxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxRQUFPLElBQUksQ0FBQyxLQUFLLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsS0FBSyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsR0FBQyx1QkFBdUI7TUFBQyxFQUFFLEdBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEtBQUcsRUFBRSxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQSxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1VBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUNuaUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUM7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFLENBQUEsQUFBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFJLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFBLEdBQUUsRUFBRTtRQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTTtRQUFDLENBQUMsR0FBQyxDQUFDLE1BQUksQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsRUFBRSxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQztRQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBRyxDQUFDLENBQUMsSUFBRSxDQUFDLElBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBRSxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUEsR0FBRSxFQUFFO1FBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxFQUFFLEVBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxNQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU87UUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFFLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsS0FBRyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU8sRUFBQyxPQUFPLENBQUMsR0FBQyxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUEsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUEsRUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLElBQUksQ0FBQyxPQUFPO1FBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsT0FBTyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLEVBQUU7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTSxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUEsR0FBRSxJQUFJLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsT0FBTyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN6aEUsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7R0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUU7QUFBQyxVQUFJLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUk7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUcsQ0FBQyxDQUFDLEtBQUssRUFBQztBQUFDLFlBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO09BQUMsTUFBSyxJQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUM7QUFBQyxhQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsTUFBSyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxjQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsU0FBUTtPQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO0tBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDO01BQUMsRUFBRSxHQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQSxFQUFDO0FBQUMsT0FBQyxJQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsT0FBTyxHQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxHQUFFLEVBQUUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsU0FBUztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxZQUFVO0FBQUMsUUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsS0FBSyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxTQUFTLENBQUMsQ0FBQztHQUMvaEUsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxZQUFVO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUcsRUFBRSxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQSxLQUFJLEVBQUUsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEFBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUMsd0JBQXdCO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLEtBQUssRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLE9BQU8sRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLFVBQVUsR0FBQyxFQUFFLENBQUMsVUFBVSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFBO0tBQUMsSUFBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxFQUFDLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQSxBQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsTUFBSSxDQUFDLEdBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUEsQUFBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBRyxDQUFDLEdBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUEsRUFBQyxPQUFPLElBQUksQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEFBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLENBQUMsSUFBSSxFQUFFO01BQUMsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUM7R0FDbmdFLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxZQUFZLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUUsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLEtBQUssSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUMsWUFBVTtBQUFDLFFBQUcsQ0FBQyxLQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxHQUFDLEVBQUMsS0FBSyxFQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLEVBQUUsRUFBQyxDQUFDLEdBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQTtLQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxLQUFLLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxHQUFDLEtBQUssQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFBLEdBQUUsRUFBRSxFQUFFLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM2lFLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFFLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsR0FBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxLQUFHLElBQUksQ0FBQyxTQUFTLEdBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUUsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLFVBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtPQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHlCQUF5QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUMsRUFBRSxDQUFDLFdBQVcsRUFBQyxFQUFFLENBQUMsVUFBVSxHQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBQyxHQUFHLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxZQUFVO0FBQUMsV0FBTyxFQUFFLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO0tBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLElBQUksR0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsU0FBUyxJQUFFLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxpQkFBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxRQUFJLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsaUJBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ2hoRSxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsWUFBVTtBQUFDLFFBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxJQUFJLENBQUMsU0FBUyxFQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLHVCQUF1QjtNQUFDLEVBQUUsR0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsU0FBUyxHQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUMsRUFBRSxDQUFDLFdBQVcsR0FBQyxFQUFFLENBQUMsV0FBVyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsR0FBQyxZQUFVO0FBQUMsV0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUMsR0FBRyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxZQUFZLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxFQUFDLEdBQUcsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFDLFlBQVU7QUFBQyxRQUFHLElBQUksQ0FBQyxTQUFTLEVBQUMsUUFBTyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxDQUFBLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLEtBQUssQ0FBQywwQkFBMEIsR0FBQyxDQUFDLEdBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBRSxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUMsWUFBVTtBQUN0aEUsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsSUFBSSxDQUFDLFNBQVMsRUFBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQSxBQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLFFBQVEsR0FBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLFNBQVMsR0FBQyxFQUFFLENBQUMsU0FBUyxFQUFDLEVBQUUsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLGFBQWEsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsS0FBSyxFQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsUUFBUSxHQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsYUFBYSxFQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUMsRUFBRSxDQUFDLFNBQVMsRUFBQyxFQUFFLENBQUMsV0FBVyxHQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFVLEdBQUMsVUFBVSxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsS0FBSyxHQUFDLElBQUksQ0FBQyxJQUFJLElBQUUsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLEdBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFBLEFBQUMsR0FBQyxJQUFJLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQSxHQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxJQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssS0FBRyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFHLENBQUMsSUFBRSxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxPQUFNLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSztRQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFlBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsUUFBTyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsWUFBWSxFQUFFLEdBQUMsSUFBSSxDQUFDLE1BQU0sS0FBRyxDQUFDLENBQUMsTUFBTSxJQUFFLElBQUksQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksSUFBRSxJQUFJLENBQUMsS0FBSyxLQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQztHQUNwZ0UsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLFdBQVcsR0FBQyxXQUFXLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxHQUFHLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxVQUFVLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFDLFlBQVU7QUFBQyxXQUFPLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUk7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsWUFBVTtBQUFDLGFBQU8sQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxFQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxRQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFFLENBQUMsQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsSUFBRSxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxrQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxJQUFFLFVBQVUsSUFBRSxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLHNCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBRSxDQUFDLFFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxZQUFZLEVBQUMsd0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsWUFBWSxFQUFDLHdCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGlCQUFVO0FBQUMsYUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsbUJBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxhQUFNLFlBQVksQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLG9CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLEdBQUcsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBQyxHQUFHLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFDL2dFLFVBQUksQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGdCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxDQUFDLFFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLEtBQUssQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxhQUFhLEVBQUMsdUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsUUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUU7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsUUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQTtPQUFDLENBQUMsRUFBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQU8sU0FBUyxDQUFDLE1BQU0sR0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxXQUFXLEVBQUMsdUJBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsU0FBUyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsa0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLG1CQUFVO0FBQUMsYUFBTyxLQUFLLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFVO0FBQUMsZUFBTSxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBRyxDQUFDLENBQUMsTUFBTSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsUUFBTyxDQUFDLENBQUMsWUFBWSxHQUFDLFlBQVU7QUFBQyxlQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtPQUFDLEVBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN4Z0UsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsWUFBWSxFQUFDLHdCQUFVO0FBQUMsYUFBTyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUEsQ0FBRSxJQUFJLEdBQUU7QUFBQyxZQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsR0FBRyxHQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsRUFBRSxDQUFBLEVBQUMsT0FBTyxDQUFDLENBQUE7T0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFHLEVBQUUsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsS0FBRyxFQUFFLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxVQUFVLElBQUUsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxVQUFVLEVBQUMsb0JBQVMsQ0FBQyxFQUFDO0FBQUMsY0FBTyxDQUFDLEdBQUMsVUFBVSxJQUFFLE9BQU8sQ0FBQyxDQUFDLFFBQVEsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFBO0tBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxLQUFLLEVBQUMsZUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGFBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxnQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxrQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxTQUFTLEVBQUMsbUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7S0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLE1BQU0sS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsTUFBTSxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLGdCQUFnQixHQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsT0FBTyxHQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsWUFBVTtBQUFDLFdBQU0sRUFBRSxHQUFDLElBQUksQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssR0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUMsRUFBRSxDQUFDLFFBQVEsRUFBQyxDQUFBLFlBQVU7QUFBQyxRQUFHO0FBQUMsWUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUMsUUFBUSxFQUFDLEVBQUMsR0FBRyxFQUFDLGVBQVU7QUFBQyxjQUFHLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBQztBQUFDLGdCQUFJLENBQUMsQ0FBQyxJQUFHO0FBQUMsb0JBQU0sS0FBSyxFQUFFLENBQUE7YUFBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsZUFBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7YUFBQyxJQUFHLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUMsUUFBTyxPQUFPLElBQUUsT0FBTyxDQUFDLElBQUksSUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLDJJQUEySSxHQUFDLENBQUMsQ0FBQyxFQUNybUUsSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFBO1dBQUM7U0FBQyxFQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUMsRUFBRTtHQUFDLENBQUEsRUFBRSxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsRUFBQyxJQUFJLEVBQUMsZ0JBQVU7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxXQUFXLEVBQUMscUJBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxlQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBVSxFQUFDLG9CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxlQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxpQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLFVBQVUsRUFBQyxzQkFBVTtBQUFDLGFBQU8sSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE1BQU0sRUFBQyxnQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxFQUFFLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFNBQVMsRUFBQyxtQkFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsaUJBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFdBQVcsRUFBQyxxQkFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxtQkFBVTtBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsS0FBSyxFQUFDLGVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxNQUFNLEVBQUMsZ0JBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBRyxDQUFDLEdBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQSxFQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsYUFBYSxFQUFDLHVCQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEtBQUssRUFBQyxpQkFBVTtBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLElBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsZUFBTyxDQUFDLEtBQUcsQ0FBQyxDQUFBO09BQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxDQUFBO0tBQUMsRUFBQyxHQUFHLEVBQUMsYUFBUyxDQUFDLEVBQUM7QUFBQyxjQUFPLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsS0FBSyxDQUFDLEtBQUcsSUFBSSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFVBQVUsRUFBQyxzQkFBVTtBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUcsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUEsQUFBQyxFQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQTtLQUFDLEVBQUMsSUFBSSxFQUFDLGdCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdmdFLEVBQUMsU0FBUyxFQUFDLG1CQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsR0FBRyxFQUFDLGVBQVU7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLGlCQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUE7S0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxFQUFDLEdBQUcsRUFBQyxhQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsUUFBUSxFQUFDLGtCQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsTUFBTSxFQUFDLGtCQUFVO0FBQUMsYUFBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7S0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxFQUFFLENBQUMsUUFBUSxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFDLEVBQUMsUUFBUSxFQUFDLENBQUMsRUFBQyxHQUFHLEVBQUMsQ0FBQyxFQUFDLFVBQVUsRUFBQyxDQUFDLEVBQUMsR0FBRyxFQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUMsRUFBRSxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUMsS0FBSyxFQUFDLEVBQUUsRUFBQyxHQUFHLEVBQUMsRUFBRSxFQUFDLFVBQVUsRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFDLEVBQUUsRUFBQyxLQUFLLEVBQUMsRUFBRSxFQUFDLE1BQU0sRUFBQyxFQUFFLEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBQyxNQUFNLEVBQUMsQ0FBQyxFQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7Q0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgX3J4ICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vbm9yaS91dGlscy9SeC5qcycpLFxuICAgICAgX2FwcEFjdGlvbnMgICAgID0gcmVxdWlyZSgnLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgICAgX25vcmlBY3Rpb25zICAgID0gcmVxdWlyZSgnLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgICAgX3NvY2tldElPRXZlbnRzID0gcmVxdWlyZSgnLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cbi8qKlxuICogXCJDb250cm9sbGVyXCIgZm9yIGEgTm9yaSBhcHBsaWNhdGlvbi4gVGhlIGNvbnRyb2xsZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gKiBib290c3RyYXBwaW5nIHRoZSBhcHAgYW5kIHBvc3NpYmx5IGhhbmRsaW5nIHNvY2tldC9zZXJ2ZXIgaW50ZXJhY3Rpb24uXG4gKiBBbnkgYWRkaXRpb25hbCBmdW5jdGlvbmFsaXR5IHNob3VsZCBiZSBoYW5kbGVkIGluIGEgc3BlY2lmaWMgbW9kdWxlLlxuICovXG52YXIgQXBwID0gTm9yaS5jcmVhdGVBcHBsaWNhdGlvbih7XG5cbiAgbWl4aW5zOiBbXSxcblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBtYWluIE5vcmkgQXBwIHN0b3JlIGFuZCB2aWV3LlxuICAgKi9cbiAgc3RvcmUgOiByZXF1aXJlKCcuL3N0b3JlL0FwcFN0b3JlLmpzJyksXG4gIHZpZXcgIDogcmVxdWlyZSgnLi92aWV3L0FwcFZpZXcuanMnKSxcbiAgc29ja2V0OiByZXF1aXJlKCcuLi9ub3JpL3NlcnZpY2UvU29ja2V0SU8uanMnKSxcblxuICAvKipcbiAgICogSW50aWFsaXplIHRoZSBhcHBpbGNhdGlvbiwgdmlldyBhbmQgc3RvcmVcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvY2tldC5pbml0aWFsaXplKCk7XG4gICAgdGhpcy5zb2NrZXQuc3Vic2NyaWJlKHRoaXMuaGFuZGxlU29ja2V0TWVzc2FnZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMudmlldy5pbml0aWFsaXplKCk7XG5cbiAgICB0aGlzLnN0b3JlLmluaXRpYWxpemUoKTsgLy8gc3RvcmUgd2lsbCBhY3F1aXJlIGRhdGEgZGlzcGF0Y2ggZXZlbnQgd2hlbiBjb21wbGV0ZVxuICAgIHRoaXMuc3RvcmUuc3Vic2NyaWJlKCdzdG9yZUluaXRpYWxpemVkJywgdGhpcy5vblN0b3JlSW5pdGlhbGl6ZWQuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5zdG9yZS5sb2FkU3RvcmUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQWZ0ZXIgdGhlIHN0b3JlIGRhdGEgaXMgcmVhZHlcbiAgICovXG4gIG9uU3RvcmVJbml0aWFsaXplZDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucnVuQXBwbGljYXRpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBcIlBsZWFzZSB3YWl0XCIgY292ZXIgYW5kIHN0YXJ0IHRoZSBhcHBcbiAgICovXG4gIHJ1bkFwcGxpY2F0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy52aWV3LnJlbW92ZUxvYWRpbmdNZXNzYWdlKCk7XG5cbiAgICAvLyBWaWV3IHdpbGwgc2hvdyBiYXNlZCBvbiB0aGUgY3VycmVudCBzdG9yZSBzdGF0ZVxuICAgIC8vdGhpcy5zdG9yZS5zZXRTdGF0ZSh7Y3VycmVudFN0YXRlOiAnTUFJTl9HQU1FJ30pO1xuICAgIHRoaXMuc3RvcmUuc2V0U3RhdGUoe2N1cnJlbnRTdGF0ZTogJ1BMQVlFUl9TRUxFQ1QnfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFsbCBtZXNzYWdlcyBmcm9tIHRoZSBTb2NrZXQuSU8gc2VydmVyIHdpbGwgYmUgZm9yd2FyZGVkIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGhhbmRsZVNvY2tldE1lc3NhZ2U6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgaWYgKCFwYXlsb2FkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJmcm9tIFNvY2tldC5JTyBzZXJ2ZXJcIiwgcGF5bG9hZCk7XG5cbiAgICBzd2l0Y2ggKHBheWxvYWQudHlwZSkge1xuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkNPTk5FQ1QpOlxuICAgICAgICB0aGlzLmhhbmRsZUNvbm5lY3QocGF5bG9hZC5pZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGNhc2UgKF9zb2NrZXRJT0V2ZW50cy5KT0lOX1JPT00pOlxuICAgICAgICBjb25zb2xlLmxvZyhcImpvaW4gcm9vbVwiLCBwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICB0aGlzLmhhbmRsZUpvaW5OZXdseUNyZWF0ZWRSb29tKHBheWxvYWQucGF5bG9hZC5yb29tSUQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuR0FNRV9TVEFSVCk6XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR0FNRSBTVEFSVEVEXCIpO1xuICAgICAgICB0aGlzLmhhbmRsZUdhbWVTdGFydChwYXlsb2FkLnBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuR0FNRV9BQk9SVCk6XG4gICAgICAgIHRoaXMuaGFuZGxlR2FtZUFib3J0KHBheWxvYWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuU1lTVEVNX01FU1NBR0UpOlxuICAgICAgY2FzZSAoX3NvY2tldElPRXZlbnRzLkJST0FEQ0FTVCk6XG4gICAgICBjYXNlIChfc29ja2V0SU9FdmVudHMuTUVTU0FHRSk6XG4gICAgICAgIHRoaXMudmlldy5hbGVydChwYXlsb2FkLnBheWxvYWQsIHBheWxvYWQudHlwZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnNvbGUud2FybihcIlVuaGFuZGxlZCBTb2NrZXRJTyBtZXNzYWdlIHR5cGVcIiwgcGF5bG9hZCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH0sXG5cbiAgaGFuZGxlQ29ubmVjdDogZnVuY3Rpb24gKHNvY2tldElEKSB7XG4gICAgdmFyIHNldFNlc3Npb25JRCA9IF9hcHBBY3Rpb25zLnNldFNlc3Npb25Qcm9wcyh7c29ja2V0SU9JRDogc29ja2V0SUR9KSxcbiAgICAgICAgc2V0TG9jYWxJRCAgID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7aWQ6IHNvY2tldElEfSk7XG5cbiAgICB0aGlzLnN0b3JlLmFwcGx5KFtzZXRTZXNzaW9uSUQsIHNldExvY2FsSURdKTtcbiAgfSxcblxuICBoYW5kbGVKb2luTmV3bHlDcmVhdGVkUm9vbTogZnVuY3Rpb24gKHJvb21JRCkge1xuICAgIHZhciBzZXRSb29tICAgICAgICAgICAgICAgPSBfYXBwQWN0aW9ucy5zZXRTZXNzaW9uUHJvcHMoe3Jvb21JRDogcm9vbUlEfSksXG4gICAgICAgIHNldFdhaXRpbmdTY3JlZW5TdGF0ZSA9IF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuc3RvcmUuZ2FtZVN0YXRlc1syXX0pO1xuXG4gICAgdGhpcy5zdG9yZS5hcHBseShbc2V0Um9vbSwgc2V0V2FpdGluZ1NjcmVlblN0YXRlXSk7XG4gIH0sXG5cbiAgaGFuZGxlR2FtZVN0YXJ0OiBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIHZhciByZW1vdGVQbGF5ZXIgICAgID0gdGhpcy5wbHVja1JlbW90ZVBsYXllcihwYXlsb2FkLnBsYXllcnMpLFxuICAgICAgICBzZXRSZW1vdGVQbGF5ZXIgID0gX2FwcEFjdGlvbnMuc2V0UmVtb3RlUGxheWVyUHJvcHMocmVtb3RlUGxheWVyKSxcbiAgICAgICAgc2V0R2FtZVBsYXlTdGF0ZSA9IF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuc3RvcmUuZ2FtZVN0YXRlc1szXX0pO1xuXG4gICAgdGhpcy5zdG9yZS5hcHBseShbc2V0UmVtb3RlUGxheWVyLCBzZXRHYW1lUGxheVN0YXRlXSk7XG4gIH0sXG5cbiAgcGx1Y2tSZW1vdGVQbGF5ZXI6IGZ1bmN0aW9uIChwbGF5ZXJzQXJyeSkge1xuICAgIHZhciBsb2NhbFBsYXllcklEID0gdGhpcy5zdG9yZS5nZXRTdGF0ZSgpLmxvY2FsUGxheWVyLmlkO1xuICAgIGNvbnNvbGUubG9nKCdmaWx0ZXJpbmcgZm9yJywgbG9jYWxQbGF5ZXJJRCwgcGxheWVyc0FycnkpO1xuICAgIHJldHVybiBwbGF5ZXJzQXJyeS5maWx0ZXIoZnVuY3Rpb24gKHBsYXllcikge1xuICAgICAgcmV0dXJuIHBsYXllci5pZCAhPT0gbG9jYWxQbGF5ZXJJRDtcbiAgICB9KVswXTtcbiAgfSxcblxuICBoYW5kbGVHYW1lQWJvcnQ6IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgdGhpcy52aWV3LmFsZXJ0KHBheWxvYWQucGF5bG9hZCwgcGF5bG9hZC50eXBlKTtcbiAgICB0aGlzLnN0b3JlLmFwcGx5KF9hcHBBY3Rpb25zLnJlc2V0R2FtZSgpKTtcbiAgfSxcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBMT0NBTF9QTEFZRVJfQ09OTkVDVCAgICAgICA6ICdMT0NBTF9QTEFZRVJfQ09OTkVDVCcsXG4gIFNFVF9TRVNTSU9OX1BST1BTICAgICAgICAgIDogJ1NFVF9TRVNTSU9OX1BST1BTJyxcbiAgU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUyAgICAgOiAnU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUycsXG4gIFNFVF9MT0NBTF9QTEFZRVJfTkFNRSAgICAgIDogJ1NFVF9MT0NBTF9QTEFZRVJfTkFNRScsXG4gIFNFVF9MT0NBTF9QTEFZRVJfQVBQRUFSQU5DRTogJ1NFVF9MT0NBTF9QTEFZRVJfQVBQRUFSQU5DRScsXG4gIFNFVF9SRU1PVEVfUExBWUVSX1BST1BTICAgIDogJ1NFVF9SRU1PVEVfUExBWUVSX1BST1BTJyxcbiAgUkVTRVRfR0FNRSAgICAgICAgICAgICAgICAgOiAnUkVTRVRfR0FNRSdcbiAgLy9TRUxFQ1RfUExBWUVSICAgICAgICAgICAgICA6ICdTRUxFQ1RfUExBWUVSJyxcbiAgLy9SRU1PVEVfUExBWUVSX0NPTk5FQ1QgICAgICA6ICdSRU1PVEVfUExBWUVSX0NPTk5FQ1QnLFxuICAvL0dBTUVfU1RBUlQgICAgICAgICAgICAgICAgIDogJ0dBTUVfU1RBUlQnLFxuICAvL0xPQ0FMX1FVRVNUSU9OICAgICAgICAgICAgIDogJ0xPQ0FMX1FVRVNUSU9OJyxcbiAgLy9SRU1PVEVfUVVFU1RJT04gICAgICAgICAgICA6ICdSRU1PVEVfUVVFU1RJT04nLFxuICAvL0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFIDogJ0xPQ0FMX1BMQVlFUl9IRUFMVEhfQ0hBTkdFJyxcbiAgLy9SRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0U6ICdSRU1PVEVfUExBWUVSX0hFQUxUSF9DSEFOR0UnLFxuICAvL0dBTUVfT1ZFUiAgICAgICAgICAgICAgICAgIDogJ0dBTUVfT1ZFUidcbn07IiwiY29uc3QgX2FjdGlvbkNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQWN0aW9uQ29uc3RhbnRzLmpzJyksXG4gICAgICBfYXBwU3RvcmUgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUuanMnKTtcblxuLyoqXG4gKiBQdXJlbHkgZm9yIGNvbnZlbmllbmNlLCBhbiBFdmVudCAoXCJhY3Rpb25cIikgQ3JlYXRvciBhbGEgRmx1eCBzcGVjLiBGb2xsb3dcbiAqIGd1aWRlbGluZXMgZm9yIGNyZWF0aW5nIGFjdGlvbnM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBBY3Rpb25DcmVhdG9yID0ge1xuXG4gIHNldExvY2FsUGxheWVyUHJvcHM6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGxvY2FsUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFJlbW90ZVBsYXllclByb3BzOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlICAgOiBfYWN0aW9uQ29uc3RhbnRzLlNFVF9SRU1PVEVfUExBWUVSX1BST1BTLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcmVtb3RlUGxheWVyOiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIHNldFNlc3Npb25Qcm9wczogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX2FjdGlvbkNvbnN0YW50cy5TRVRfU0VTU0lPTl9QUk9QUyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHNlc3Npb246IGRhdGFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgcmVzZXRHYW1lOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGUgICA6IF9hY3Rpb25Db25zdGFudHMuUkVTRVRfR0FNRSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGN1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMV0sXG4gICAgICAgICAgc2Vzc2lvbiAgICAgOiB7XG4gICAgICAgICAgICByb29tSUQgICAgOiAnJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbG9jYWxQbGF5ZXIgOiBfYXBwU3RvcmUuY3JlYXRlUGxheWVyUmVzZXRPYmplY3QoKSxcbiAgICAgICAgICByZW1vdGVQbGF5ZXI6IF9hcHBTdG9yZS5jcmVhdGVQbGF5ZXJSZXNldE9iamVjdCgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQWN0aW9uQ3JlYXRvcjsiLCJjb25zdCBfcmVzdE51bVF1ZXN0aW9ucyAgICAgICA9IDMsXG4gICAgICBfcmVzdFF1ZXN0aW9uQ2F0ZWdvcnkgICA9IDI0LCAvLyBTQ0kvVEVDaFxuICAgICAgX3Jlc3QgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3NlcnZpY2UvUmVzdC5qcycpLFxuICAgICAgX25vcmlBY3Rpb25Db25zdGFudHMgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25Db25zdGFudHMuanMnKSxcbiAgICAgIF9hcHBBY3Rpb25Db25zdGFudHMgICAgID0gcmVxdWlyZSgnLi4vYWN0aW9uL0FjdGlvbkNvbnN0YW50cy5qcycpLFxuICAgICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICAgIF9taXhpblJlZHVjZXJTdG9yZSAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZS5qcycpLFxuICAgICAgX251bVV0aWxzICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvY29yZS9OdW1iZXJVdGlscy5qcycpO1xuXG4vKipcbiAqIFRoaXMgYXBwbGljYXRpb24gc3RvcmUgY29udGFpbnMgXCJyZWR1Y2VyIHN0b3JlXCIgZnVuY3Rpb25hbGl0eSBiYXNlZCBvbiBSZWR1eC5cbiAqIFRoZSBzdG9yZSBzdGF0ZSBtYXkgb25seSBiZSBjaGFuZ2VkIGZyb20gZXZlbnRzIGFzIGFwcGxpZWQgaW4gcmVkdWNlciBmdW5jdGlvbnMuXG4gKiBUaGUgc3RvcmUgcmVjZWl2ZWQgYWxsIGV2ZW50cyBmcm9tIHRoZSBldmVudCBidXMgYW5kIGZvcndhcmRzIHRoZW0gdG8gYWxsXG4gKiByZWR1Y2VyIGZ1bmN0aW9ucyB0byBtb2RpZnkgc3RhdGUgYXMgbmVlZGVkLiBPbmNlIHRoZXkgaGF2ZSBydW4sIHRoZVxuICogaGFuZGxlU3RhdGVNdXRhdGlvbiBmdW5jdGlvbiBpcyBjYWxsZWQgdG8gZGlzcGF0Y2ggYW4gZXZlbnQgdG8gdGhlIGJ1cywgb3JcbiAqIG5vdGlmeSBzdWJzY3JpYmVycyB2aWEgYW4gb2JzZXJ2YWJsZS5cbiAqXG4gKiBFdmVudHMgPT4gaGFuZGxlQXBwbGljYXRpb25FdmVudHMgPT4gYXBwbHlSZWR1Y2VycyA9PiBoYW5kbGVTdGF0ZU11dGF0aW9uID0+IE5vdGlmeVxuICovXG52YXIgQXBwU3RvcmUgPSBOb3JpLmNyZWF0ZVN0b3JlKHtcblxuICBtaXhpbnM6IFtcbiAgICBfbWl4aW5SZWR1Y2VyU3RvcmUsXG4gICAgX21peGluT2JzZXJ2YWJsZVN1YmplY3QoKVxuICBdLFxuXG4gIGdhbWVTdGF0ZXM6IFsnVElUTEUnLCAnUExBWUVSX1NFTEVDVCcsICdXQUlUSU5HX09OX1BMQVlFUicsICdNQUlOX0dBTUUnLCAnR0FNRV9PVkVSJ10sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYWRkUmVkdWNlcih0aGlzLm1haW5TdGF0ZVJlZHVjZXIpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZVJlZHVjZXJTdG9yZSgpO1xuICAgIHRoaXMuc2V0U3RhdGUoTm9yaS5jb25maWcoKSk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdzdG9yZUluaXRpYWxpemVkJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBvciBsb2FkIGFueSBuZWNlc3NhcnkgZGF0YSBhbmQgdGhlbiBicm9hZGNhc3QgYSBpbml0aWFsaXplZCBldmVudC5cbiAgICovXG4gIGxvYWRTdG9yZTogZnVuY3Rpb24gKCkge1xuICAgIC8vaHR0cHM6Ly9tYXJrZXQubWFzaGFwZS5jb20vcGFyZXNoY2hvdWhhbi90cml2aWFcbiAgICB2YXIgZ2V0UXVlc3Rpb25zID0gX3Jlc3QucmVxdWVzdCh7XG4gICAgICBtZXRob2QgOiAnR0VUJyxcbiAgICAgIC8vaHR0cHM6Ly9wYXJlc2hjaG91aGFuLXRyaXZpYS12MS5wLm1hc2hhcGUuY29tL3YxL2dldFF1aXpRdWVzdGlvbnNCeUNhdGVnb3J5P2NhdGVnb3J5SWQ9MSZsaW1pdD0xMCZwYWdlPTFcbiAgICAgIHVybCAgICA6ICdodHRwczovL3BhcmVzaGNob3VoYW4tdHJpdmlhLXYxLnAubWFzaGFwZS5jb20vdjEvZ2V0QWxsUXVpelF1ZXN0aW9ucz9saW1pdD0nICsgX3Jlc3ROdW1RdWVzdGlvbnMgKyAnJnBhZ2U9MScsXG4gICAgICBoZWFkZXJzOiBbeydYLU1hc2hhcGUtS2V5JzogJ3RQeEtnRHZya3Ftc2hnOHpXNG9sUzg3aHpGN0FwMXZpNjNyanNuVXVWdzFzQkhWOUtKJ31dLFxuICAgICAganNvbiAgIDogdHJ1ZVxuICAgIH0pLnN1YnNjcmliZShcbiAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZygnb2snLCBkYXRhKTtcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbiBlcnJvcihkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgIH0pO1xuXG4gICAgLy8gU2V0IGluaXRpYWwgc3RhdGVcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRTdGF0ZTogdGhpcy5nYW1lU3RhdGVzWzBdLFxuICAgICAgc2Vzc2lvbiAgICAgOiB7XG4gICAgICAgIHNvY2tldElPSUQ6ICcnLFxuICAgICAgICByb29tSUQgICAgOiAnJ1xuICAgICAgfSxcbiAgICAgIGxvY2FsUGxheWVyIDogXy5tZXJnZSh0aGlzLmNyZWF0ZUJsYW5rUGxheWVyT2JqZWN0KCksIHRoaXMuY3JlYXRlUGxheWVyUmVzZXRPYmplY3QoKSksXG4gICAgICByZW1vdGVQbGF5ZXI6IF8ubWVyZ2UodGhpcy5jcmVhdGVCbGFua1BsYXllck9iamVjdCgpLCB0aGlzLmNyZWF0ZVBsYXllclJlc2V0T2JqZWN0KCkpLFxuICAgICAgcXVlc3Rpb25CYW5rOiBbXVxuICAgIH0pO1xuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdzdG9yZUluaXRpYWxpemVkJyk7XG4gIH0sXG5cbiAgY3JlYXRlQmxhbmtQbGF5ZXJPYmplY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQgICAgICAgIDogJycsXG4gICAgICB0eXBlICAgICAgOiAnJyxcbiAgICAgIG5hbWUgICAgICA6ICdNeXN0ZXJ5IFBsYXllciAnICsgX251bVV0aWxzLnJuZE51bWJlcigxMDAsIDk5OSksXG4gICAgICBhcHBlYXJhbmNlOiAnZ3JlZW4nXG4gICAgfTtcbiAgfSxcblxuICBjcmVhdGVQbGF5ZXJSZXNldE9iamVjdDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICBoZWFsdGggICA6IDYsXG4gICAgICBiZWhhdmlvcnM6IFtdLFxuICAgICAgc2NvcmUgICAgOiAwXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZ5IHN0YXRlIGJhc2VkIG9uIGluY29taW5nIGV2ZW50cy4gUmV0dXJucyBhIGNvcHkgb2YgdGhlIG1vZGlmaWVkXG4gICAqIHN0YXRlIGFuZCBkb2VzIG5vdCBtb2RpZnkgdGhlIHN0YXRlIGRpcmVjdGx5LlxuICAgKiBDYW4gY29tcG9zZSBzdGF0ZSB0cmFuc2Zvcm1hdGlvbnNcbiAgICogcmV0dXJuIF8uYXNzaWduKHt9LCBzdGF0ZSwgb3RoZXJTdGF0ZVRyYW5zZm9ybWVyKHN0YXRlKSk7XG4gICAqIEBwYXJhbSBzdGF0ZVxuICAgKiBAcGFyYW0gZXZlbnRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBtYWluU3RhdGVSZWR1Y2VyOiBmdW5jdGlvbiAoc3RhdGUsIGV2ZW50KSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcblxuICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuICAgICAgY2FzZSBfbm9yaUFjdGlvbkNvbnN0YW50cy5DSEFOR0VfU1RPUkVfU1RBVEU6XG4gICAgICBjYXNlIF9hcHBBY3Rpb25Db25zdGFudHMuU0VUX0xPQ0FMX1BMQVlFUl9QUk9QUzpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfUkVNT1RFX1BMQVlFUl9QUk9QUzpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5TRVRfU0VTU0lPTl9QUk9QUzpcbiAgICAgIGNhc2UgX2FwcEFjdGlvbkNvbnN0YW50cy5SRVNFVF9HQU1FOlxuICAgICAgICByZXR1cm4gXy5tZXJnZSh7fSwgc3RhdGUsIGV2ZW50LnBheWxvYWQuZGF0YSk7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS53YXJuKCdSZWR1Y2VyIHN0b3JlLCB1bmhhbmRsZWQgZXZlbnQgdHlwZTogJyArIGV2ZW50LnR5cGUpO1xuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDYWxsZWQgYWZ0ZXIgYWxsIHJlZHVjZXJzIGhhdmUgcnVuIHRvIGJyb2FkY2FzdCBwb3NzaWJsZSB1cGRhdGVzLiBEb2VzXG4gICAqIG5vdCBjaGVjayB0byBzZWUgaWYgdGhlIHN0YXRlIHdhcyBhY3R1YWxseSB1cGRhdGVkLlxuICAgKi9cbiAgaGFuZGxlU3RhdGVNdXRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIGxldCBzdGF0ZSA9IHRoaXMuZ2V0U3RhdGUoKTtcblxuICAgIGlmICh0aGlzLnNob3VsZEdhbWVFbmQoc3RhdGUpKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHtjdXJyZW50U3RhdGU6IHRoaXMuZ2FtZVN0YXRlc1s0XX0pO1xuICAgIH1cblxuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnMoc3RhdGUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBXaGVuIGEgcGxheWVyJ3MgaGVhbHRoIHJlYWNoZXMgMCwgdGhlIGdhbWUgaXMgb3ZlclxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzaG91bGRHYW1lRW5kOiBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICBpZiAoIXN0YXRlLmxvY2FsUGxheWVyIHx8ICFzdGF0ZS5yZW1vdGVQbGF5ZXIgfHwgc3RhdGUuY3VycmVudFN0YXRlICE9PSAnTUFJTl9HQU1FJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBsb2NhbCAgPSBzdGF0ZS5sb2NhbFBsYXllci5oZWFsdGgsXG4gICAgICAgIHJlbW90ZSA9IHN0YXRlLnJlbW90ZVBsYXllci5oZWFsdGg7XG5cbiAgICBpZiAobG9jYWwgPD0gMCB8fCByZW1vdGUgPD0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFN0b3JlKCk7IiwidmFyIF9hcHBTdG9yZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUuanMnKSxcbiAgICBfbWl4aW5BcHBsaWNhdGlvblZpZXcgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9BcHBsaWNhdGlvblZpZXcuanMnKSxcbiAgICBfbWl4aW5OdWRvcnVDb250cm9scyAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdmlldy9NaXhpbk51ZG9ydUNvbnRyb2xzLmpzJyksXG4gICAgX21peGluQ29tcG9uZW50Vmlld3MgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5Db21wb25lbnRWaWV3cy5qcycpLFxuICAgIF9taXhpblN0b3JlU3RhdGVWaWV3cyAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluU3RvcmVTdGF0ZVZpZXdzLmpzJyksXG4gICAgX21peGluRXZlbnREZWxlZ2F0b3IgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3ZpZXcvTWl4aW5FdmVudERlbGVnYXRvci5qcycpLFxuICAgIF9taXhpbk9ic2VydmFibGVTdWJqZWN0ID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9NaXhpbk9ic2VydmFibGVTdWJqZWN0LmpzJyk7XG5cbi8qKlxuICogVmlldyBmb3IgYW4gYXBwbGljYXRpb24uXG4gKi9cblxudmFyIEFwcFZpZXcgPSBOb3JpLmNyZWF0ZVZpZXcoe1xuXG4gIG1peGluczogW1xuICAgIF9taXhpbkFwcGxpY2F0aW9uVmlldyxcbiAgICBfbWl4aW5OdWRvcnVDb250cm9scyxcbiAgICBfbWl4aW5Db21wb25lbnRWaWV3cyxcbiAgICBfbWl4aW5TdG9yZVN0YXRlVmlld3MsXG4gICAgX21peGluRXZlbnREZWxlZ2F0b3IoKSxcbiAgICBfbWl4aW5PYnNlcnZhYmxlU3ViamVjdCgpXG4gIF0sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyhbJ2FwcGxpY2F0aW9uc2NhZmZvbGQnLCAnYXBwbGljYXRpb25jb21wb25lbnRzc2NhZmZvbGQnXSk7XG4gICAgdGhpcy5pbml0aWFsaXplU3RhdGVWaWV3cyhfYXBwU3RvcmUpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzKCk7XG5cbiAgICB0aGlzLmNvbmZpZ3VyZVZpZXdzKCk7XG4gIH0sXG5cbiAgY29uZmlndXJlVmlld3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2NyZWVuVGl0bGUgICAgICAgICAgID0gcmVxdWlyZSgnLi9TY3JlZW4uVGl0bGUuanMnKSgpLFxuICAgICAgICBzY3JlZW5QbGF5ZXJTZWxlY3QgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5QbGF5ZXJTZWxlY3QuanMnKSgpLFxuICAgICAgICBzY3JlZW5XYWl0aW5nT25QbGF5ZXIgPSByZXF1aXJlKCcuL1NjcmVlbi5XYWl0aW5nT25QbGF5ZXIuanMnKSgpLFxuICAgICAgICBzY3JlZW5NYWluR2FtZSAgICAgICAgPSByZXF1aXJlKCcuL1NjcmVlbi5NYWluR2FtZS5qcycpKCksXG4gICAgICAgIHNjcmVlbkdhbWVPdmVyICAgICAgICA9IHJlcXVpcmUoJy4vU2NyZWVuLkdhbWVPdmVyLmpzJykoKSxcbiAgICAgICAgZ2FtZVN0YXRlcyAgICAgICAgICAgID0gX2FwcFN0b3JlLmdhbWVTdGF0ZXM7XG5cbiAgICB0aGlzLnNldFZpZXdNb3VudFBvaW50KCcjY29udGVudHMnKTtcblxuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1swXSwgJ3RpdGxlJywgc2NyZWVuVGl0bGUpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1sxXSwgJ3BsYXllcnNlbGVjdCcsIHNjcmVlblBsYXllclNlbGVjdCk7XG4gICAgdGhpcy5tYXBTdGF0ZVRvVmlld0NvbXBvbmVudChnYW1lU3RhdGVzWzJdLCAnd2FpdGluZ29ucGxheWVyJywgc2NyZWVuV2FpdGluZ09uUGxheWVyKTtcbiAgICB0aGlzLm1hcFN0YXRlVG9WaWV3Q29tcG9uZW50KGdhbWVTdGF0ZXNbM10sICdnYW1lJywgc2NyZWVuTWFpbkdhbWUpO1xuICAgIHRoaXMubWFwU3RhdGVUb1ZpZXdDb21wb25lbnQoZ2FtZVN0YXRlc1s0XSwgJ2dhbWVvdmVyJywgc2NyZWVuR2FtZU92ZXIpO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXcoKTsiLCJ2YXIgX25vcmlBY3Rpb25zID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgIF9hcHBWaWV3ICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgIF9hcHBTdG9yZSAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0FwcFN0b3JlJyksXG4gICAgX3RlbXBsYXRlICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgLyoqXG4gICAqIGNvbmZpZ1Byb3BzIHBhc3NlZCBpbiBmcm9tIHJlZ2lvbiBkZWZpbml0aW9uIG9uIHBhcmVudCBWaWV3XG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgdGhpcy5iaW5kTWFwKF9hcHBTdG9yZSk7IC8vIFJlZHVjZXIgc3RvcmUsIG1hcCBpZCBzdHJpbmcgb3IgbWFwIG9iamVjdFxuICB9LFxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICBzdGF0cyAgICA9IGFwcFN0YXRlLmxvY2FsUGxheWVyO1xuICAgIGlmICh0aGlzLmdldENvbmZpZ1Byb3BzKCkudGFyZ2V0ID09PSAncmVtb3RlJykge1xuICAgICAgc3RhdHMgPSBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXI7XG4gICAgfVxuICAgIHJldHVybiBzdGF0cztcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICBzdGF0cyAgICA9IGFwcFN0YXRlLmxvY2FsUGxheWVyO1xuICAgIGlmICh0aGlzLmdldENvbmZpZ1Byb3BzKCkudGFyZ2V0ID09PSAncmVtb3RlJykge1xuICAgICAgc3RhdHMgPSBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXI7XG4gICAgfVxuICAgIHJldHVybiBzdGF0cztcbiAgfSxcblxuICB0ZW1wbGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBodG1sID0gX3RlbXBsYXRlLmdldFNvdXJjZSgnZ2FtZV9fcGxheWVyc3RhdHMnKTtcbiAgICByZXR1cm4gXy50ZW1wbGF0ZShodG1sKTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwiY29uc3QgX25vcmlBY3Rpb25zICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvcicpLFxuICAgICAgX2FwcEFjdGlvbnMgICAgICAgICAgID0gcmVxdWlyZSgnLi4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICAgIF9hcHBWaWV3ICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldycpLFxuICAgICAgX2FwcFN0b3JlICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUnKSxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpLFxuICAgICAgX21peGluRE9NTWFuaXB1bGF0aW9uID0gcmVxdWlyZSgnLi4vLi4vbm9yaS92aWV3L01peGluRE9NTWFuaXB1bGF0aW9uLmpzJyk7XG5cbi8qKlxuICogTW9kdWxlIGZvciBhIGR5bmFtaWMgYXBwbGljYXRpb24gdmlldyBmb3IgYSByb3V0ZSBvciBhIHBlcnNpc3RlbnQgdmlld1xuICovXG52YXIgQ29tcG9uZW50ID0gX2FwcFZpZXcuY3JlYXRlQ29tcG9uZW50Vmlldyh7XG5cbiAgbWl4aW5zOiBbXG4gICAgX21peGluRE9NTWFuaXB1bGF0aW9uXG4gIF0sXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYW5kIGJpbmQsIGNhbGxlZCBvbmNlIG9uIGZpcnN0IHJlbmRlci4gUGFyZW50IGNvbXBvbmVudCBpc1xuICAgKiBpbml0aWFsaXplZCBmcm9tIGFwcCB2aWV3XG4gICAqIEBwYXJhbSBjb25maWdQcm9wc1xuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZ1Byb3BzKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIG9iamVjdCB0byBiZSB1c2VkIHRvIGRlZmluZSBldmVudHMgb24gRE9NIGVsZW1lbnRzXG4gICAqIEByZXR1cm5zIHt9XG4gICAqL1xuICBkZWZpbmVFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgJ2NsaWNrICNnYW1lb3Zlcl9fYnV0dG9uLXJlcGxheSc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9hcHBBY3Rpb25zLnJlc2V0R2FtZSgpKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKSxcbiAgICAgICAgc3RhdGUgICAgPSB7XG4gICAgICAgICAgbmFtZSAgICAgICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLm5hbWUsXG4gICAgICAgICAgYXBwZWFyYW5jZSA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICAgICAgbG9jYWxTY29yZSA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLnNjb3JlLFxuICAgICAgICAgIHJlbW90ZVNjb3JlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXIuc2NvcmUsXG4gICAgICAgICAgbG9jYWxXaW4gICA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLnNjb3JlID4gYXBwU3RhdGUucmVtb3RlUGxheWVyLnNjb3JlLFxuICAgICAgICAgIHJlbW90ZVdpbiAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5zY29yZSA8IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZSxcbiAgICAgICAgICB0aWVXaW4gICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgPT09IGFwcFN0YXRlLnJlbW90ZVBsYXllci5zY29yZVxuICAgICAgICB9O1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHN0YXRlID0gdGhpcy5nZXRTdGF0ZSgpO1xuXG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fdGllJyk7XG4gICAgdGhpcy5oaWRlRWwoJyNnYW1lb3Zlcl9fbG9vc2UnKTtcblxuICAgIGlmIChzdGF0ZS5sb2NhbFdpbikge1xuICAgICAgdGhpcy5zaG93RWwoJyNnYW1lb3Zlcl9fd2luJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5yZW1vdGVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX2xvb3NlJyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS50aWVXaW4pIHtcbiAgICAgIHRoaXMuc2hvd0VsKCcjZ2FtZW92ZXJfX3RpZScpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwiY29uc3QgX25vcmlBY3Rpb25zICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgICAgX2FwcEFjdGlvbnMgICAgICAgID0gcmVxdWlyZSgnLi4vYWN0aW9uL0FjdGlvbkNyZWF0b3IuanMnKSxcbiAgICAgIF9hcHBWaWV3ICAgICAgICAgICA9IHJlcXVpcmUoJy4vQXBwVmlldy5qcycpLFxuICAgICAgX2FwcFN0b3JlICAgICAgICAgID0gcmVxdWlyZSgnLi4vc3RvcmUvQXBwU3RvcmUuanMnKSxcbiAgICAgIF9zb2NrZXRJTyAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvc2VydmljZS9Tb2NrZXRJTy5qcycpLFxuICAgICAgX3RlbXBsYXRlICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfcmVnaW9uUGxheWVyU3RhdHMgPSByZXF1aXJlKCcuL1JlZ2lvbi5QbGF5ZXJTdGF0cy5qcycpLFxuICAgICAgX251bVV0aWxzICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvcmUvTnVtYmVyVXRpbHMuanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIGRlZmluZVJlZ2lvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbG9jYWxQbGF5ZXJTdGF0cyA6IF9yZWdpb25QbGF5ZXJTdGF0cyh7XG4gICAgICAgIGlkICAgICAgICA6ICdnYW1lX19wbGF5ZXJzdGF0cycsXG4gICAgICAgIG1vdW50UG9pbnQ6ICcjZ2FtZV9fbG9jYWxwbGF5ZXJzdGF0cycsXG4gICAgICAgIHRhcmdldCAgICA6ICdsb2NhbCdcbiAgICAgIH0pLFxuICAgICAgcmVtb3RlUGxheWVyU3RhdHM6IF9yZWdpb25QbGF5ZXJTdGF0cyh7XG4gICAgICAgIGlkICAgICAgICA6ICdnYW1lX19wbGF5ZXJzdGF0cycsXG4gICAgICAgIG1vdW50UG9pbnQ6ICcjZ2FtZV9fcmVtb3RlcGxheWVyc3RhdHMnLFxuICAgICAgICB0YXJnZXQgICAgOiAncmVtb3RlJ1xuICAgICAgfSlcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnY2xpY2sgI2dhbWVfX2J1dHRvbi1za2lwJzogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbNF19KSk7XG4gICAgICB9LFxuICAgICAgJ2NsaWNrICNnYW1lX190ZXN0JyAgICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHN0YXRlICAgICAgICA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLFxuICAgICAgICAgICAgbG9jYWxTY29yZSAgID0gc3RhdGUubG9jYWxQbGF5ZXIuc2NvcmUgKyBfbnVtVXRpbHMucm5kTnVtYmVyKDAsIDUpLFxuICAgICAgICAgICAgbG9jYWxIZWFsdGggID0gc3RhdGUubG9jYWxQbGF5ZXIuaGVhbHRoICsgMSxcbiAgICAgICAgICAgIHJlbW90ZVNjb3JlICA9IHN0YXRlLnJlbW90ZVBsYXllci5zY29yZSArIF9udW1VdGlscy5ybmROdW1iZXIoMCwgNSksXG4gICAgICAgICAgICByZW1vdGVIZWFsdGggPSBzdGF0ZS5yZW1vdGVQbGF5ZXIuaGVhbHRoIC0gMTtcblxuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICAgICAgaGVhbHRoOiBsb2NhbEhlYWx0aCxcbiAgICAgICAgICBzY29yZSA6IGxvY2FsU2NvcmVcbiAgICAgICAgfSkpO1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX2FwcEFjdGlvbnMuc2V0UmVtb3RlUGxheWVyUHJvcHMoe1xuICAgICAgICAgIGhlYWx0aDogcmVtb3RlSGVhbHRoLFxuICAgICAgICAgIHNjb3JlIDogcmVtb3RlU2NvcmVcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIGxldCBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBsb2NhbCA6IGFwcFN0YXRlLmxvY2FsUGxheWVyLFxuICAgICAgcmVtb3RlOiBhcHBTdGF0ZS5yZW1vdGVQbGF5ZXJcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTdGF0ZSBjaGFuZ2Ugb24gYm91bmQgc3RvcmVzIChtYXAsIGV0Yy4pIFJldHVybiBuZXh0U3RhdGUgb2JqZWN0XG4gICAqL1xuICBjb21wb25lbnRXaWxsVXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgSFRNTCB3YXMgYXR0YWNoZWQgdG8gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcblxuICB9LFxuXG4gIC8qKlxuICAgKiBDb21wb25lbnQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAvL1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudDsiLCIvKlxuIFRPRE9cblxuICovXG5cbnZhciBfcm9vbU51bWJlckxlbmd0aCA9IDQsXG4gICAgX25vcmlBY3Rpb25zICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL2FjdGlvbi9BY3Rpb25DcmVhdG9yLmpzJyksXG4gICAgX2FwcEFjdGlvbnMgICAgICAgPSByZXF1aXJlKCcuLi9hY3Rpb24vQWN0aW9uQ3JlYXRvci5qcycpLFxuICAgIF9hcHBWaWV3ICAgICAgICAgID0gcmVxdWlyZSgnLi9BcHBWaWV3LmpzJyksXG4gICAgX2FwcFN0b3JlICAgICAgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZS5qcycpLFxuICAgIF9zb2NrZXRJTyAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS9zZXJ2aWNlL1NvY2tldElPLmpzJyksXG4gICAgX3RlbXBsYXRlICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZm9yIGEgZHluYW1pYyBhcHBsaWNhdGlvbiB2aWV3IGZvciBhIHJvdXRlIG9yIGEgcGVyc2lzdGVudCB2aWV3XG4gKi9cbnZhciBDb21wb25lbnQgPSBfYXBwVmlldy5jcmVhdGVDb21wb25lbnRWaWV3KHtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgYmluZCwgY2FsbGVkIG9uY2Ugb24gZmlyc3QgcmVuZGVyLiBQYXJlbnQgY29tcG9uZW50IGlzXG4gICAqIGluaXRpYWxpemVkIGZyb20gYXBwIHZpZXdcbiAgICogQHBhcmFtIGNvbmZpZ1Byb3BzXG4gICAqL1xuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnUHJvcHMpIHtcbiAgICAvL1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gb2JqZWN0IHRvIGJlIHVzZWQgdG8gZGVmaW5lIGV2ZW50cyBvbiBET00gZWxlbWVudHNcbiAgICogQHJldHVybnMge31cbiAgICovXG4gIGRlZmluZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAnYmx1ciAjc2VsZWN0X19wbGF5ZXJuYW1lJyAgICAgICAgOiB0aGlzLnNldFBsYXllck5hbWUuYmluZCh0aGlzKSxcbiAgICAgICdjaGFuZ2UgI3NlbGVjdF9fcGxheWVydHlwZScgICAgICA6IHRoaXMuc2V0UGxheWVyQXBwZWFyYW5jZS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1qb2lucm9vbScgIDogdGhpcy5vbkpvaW5Sb29tLmJpbmQodGhpcyksXG4gICAgICAnY2xpY2sgI3NlbGVjdF9fYnV0dG9uLWNyZWF0ZXJvb20nOiB0aGlzLm9uQ3JlYXRlUm9vbS5iaW5kKHRoaXMpLFxuICAgICAgJ2NsaWNrICNzZWxlY3RfX2J1dHRvbi1nbycgICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICBfYXBwU3RvcmUuYXBwbHkoX25vcmlBY3Rpb25zLmNoYW5nZVN0b3JlU3RhdGUoe2N1cnJlbnRTdGF0ZTogX2FwcFN0b3JlLmdhbWVTdGF0ZXNbMl19KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICBzZXRQbGF5ZXJOYW1lOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYWN0aW9uID0gX2FwcEFjdGlvbnMuc2V0TG9jYWxQbGF5ZXJQcm9wcyh7XG4gICAgICBuYW1lOiB2YWx1ZVxuICAgIH0pO1xuICAgIF9hcHBTdG9yZS5hcHBseShhY3Rpb24pO1xuICB9LFxuXG4gIHNldFBsYXllckFwcGVhcmFuY2U6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBhY3Rpb24gPSBfYXBwQWN0aW9ucy5zZXRMb2NhbFBsYXllclByb3BzKHtcbiAgICAgIGFwcGVhcmFuY2U6IHZhbHVlXG4gICAgfSk7XG4gICAgX2FwcFN0b3JlLmFwcGx5KGFjdGlvbik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcHBTdGF0ZSA9IF9hcHBTdG9yZS5nZXRTdGF0ZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lICAgICAgOiBhcHBTdGF0ZS5sb2NhbFBsYXllci5uYW1lLFxuICAgICAgYXBwZWFyYW5jZTogYXBwU3RhdGUubG9jYWxQbGF5ZXIuYXBwZWFyYW5jZVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRJbml0aWFsU3RhdGUoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVydHlwZScpLnZhbHVlID0gdGhpcy5nZXRTdGF0ZSgpLmFwcGVhcmFuY2U7XG4gIH0sXG5cbiAgb25DcmVhdGVSb29tOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMudmFsaWRhdGVVc2VyRGV0YWlsc0lucHV0KCkpIHtcbiAgICAgIF9zb2NrZXRJTy5ub3RpZnlTZXJ2ZXIoX3NvY2tldElPLmV2ZW50cygpLkNSRUFURV9ST09NLCB7XG4gICAgICAgIHBsYXllckRldGFpbHM6IF9hcHBTdG9yZS5nZXRTdGF0ZSgpLmxvY2FsUGxheWVyXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgb25Kb2luUm9vbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciByb29tSUQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0X19yb29taWQnKS52YWx1ZTtcbiAgICBpZiAodGhpcy52YWxpZGF0ZVJvb21JRChyb29tSUQpKSB7XG4gICAgICBfc29ja2V0SU8ubm90aWZ5U2VydmVyKF9zb2NrZXRJTy5ldmVudHMoKS5KT0lOX1JPT00sIHtcbiAgICAgICAgcm9vbUlEICAgICAgIDogcm9vbUlELFxuICAgICAgICBwbGF5ZXJEZXRhaWxzOiBfYXBwU3RvcmUuZ2V0U3RhdGUoKS5sb2NhbFBsYXllclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9hcHBWaWV3LmFsZXJ0KCdUaGUgcm9vbSBJRCBpcyBub3QgY29ycmVjdC4gRG9lcyBpdCBjb250YWluIGxldHRlcnMgb3IgaXMgbGVzcyB0aGFuICcrX3Jvb21OdW1iZXJMZW5ndGgrJyBkaWdpdHM/JywgJ0JhZCBSb29tIElEJyk7XG4gICAgfVxuICB9LFxuXG4gIHZhbGlkYXRlVXNlckRldGFpbHNJbnB1dDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBuYW1lICAgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVybmFtZScpLnZhbHVlLFxuICAgICAgICBhcHBlYXJhbmNlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdF9fcGxheWVydHlwZScpLnZhbHVlO1xuXG4gICAgaWYgKCFuYW1lLmxlbmd0aCB8fCAhYXBwZWFyYW5jZSkge1xuICAgICAgX2FwcFZpZXcuYWxlcnQoJ01ha2Ugc3VyZSB5b3VcXCd2ZSB0eXBlZCBhIG5hbWUgZm9yIHlvdXJzZWxmIGFuZCBzZWxlY3RlZCBhbiBhcHBlYXJhbmNlJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSb29tIElEIG11c3QgYmUgYW4gaW50ZWdlciBhbmQgNSBkaWdpdHNcbiAgICogQHBhcmFtIHJvb21JRFxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHZhbGlkYXRlUm9vbUlEOiBmdW5jdGlvbiAocm9vbUlEKSB7XG4gICAgaWYgKGlzTmFOKHBhcnNlSW50KHJvb21JRCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChyb29tSUQubGVuZ3RoICE9PSBfcm9vbU51bWJlckxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjdGl0bGVfX2J1dHRvbi1zdGFydCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX2FwcFN0b3JlLmFwcGx5KF9ub3JpQWN0aW9ucy5jaGFuZ2VTdG9yZVN0YXRlKHtjdXJyZW50U3RhdGU6IF9hcHBTdG9yZS5nYW1lU3RhdGVzWzFdfSkpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBpbml0aWFsIHN0YXRlIHByb3BlcnRpZXMuIENhbGwgb25jZSBvbiBmaXJzdCByZW5kZXJcbiAgICovXG4gIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogU3RhdGUgY2hhbmdlIG9uIGJvdW5kIHN0b3JlcyAobWFwLCBldGMuKSBSZXR1cm4gbmV4dFN0YXRlIG9iamVjdFxuICAgKi9cbiAgY29tcG9uZW50V2lsbFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7fTtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IEhUTUwgd2FzIGF0dGFjaGVkIHRvIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfSxcblxuICAvKipcbiAgICogQ29tcG9uZW50IHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICovXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgLy9cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7IiwidmFyIF9ub3JpQWN0aW9ucyA9IHJlcXVpcmUoJy4uLy4uL25vcmkvYWN0aW9uL0FjdGlvbkNyZWF0b3InKSxcbiAgICBfYXBwVmlldyAgICAgPSByZXF1aXJlKCcuL0FwcFZpZXcnKSxcbiAgICBfYXBwU3RvcmUgICAgPSByZXF1aXJlKCcuLi9zdG9yZS9BcHBTdG9yZScpLFxuICAgIF90ZW1wbGF0ZSAgICA9IHJlcXVpcmUoJy4uLy4uL25vcmkvdXRpbHMvVGVtcGxhdGluZy5qcycpO1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgYSBkeW5hbWljIGFwcGxpY2F0aW9uIHZpZXcgZm9yIGEgcm91dGUgb3IgYSBwZXJzaXN0ZW50IHZpZXdcbiAqL1xudmFyIENvbXBvbmVudCA9IF9hcHBWaWV3LmNyZWF0ZUNvbXBvbmVudFZpZXcoe1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBiaW5kLCBjYWxsZWQgb25jZSBvbiBmaXJzdCByZW5kZXIuIFBhcmVudCBjb21wb25lbnQgaXNcbiAgICogaW5pdGlhbGl6ZWQgZnJvbSBhcHAgdmlld1xuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBvYmplY3QgdG8gYmUgdXNlZCB0byBkZWZpbmUgZXZlbnRzIG9uIERPTSBlbGVtZW50c1xuICAgKiBAcmV0dXJucyB7fVxuICAgKi9cbiAgZGVmaW5lRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdjbGljayAjd2FpdGluZ19fYnV0dG9uLXNraXAnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9hcHBTdG9yZS5hcHBseShfbm9yaUFjdGlvbnMuY2hhbmdlU3RvcmVTdGF0ZSh7Y3VycmVudFN0YXRlOiBfYXBwU3RvcmUuZ2FtZVN0YXRlc1szXX0pKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgaW5pdGlhbCBzdGF0ZSBwcm9wZXJ0aWVzLiBDYWxsIG9uY2Ugb24gZmlyc3QgcmVuZGVyXG4gICAqL1xuICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICByb29tSUQgICAgOiBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0YXRlIGNoYW5nZSBvbiBib3VuZCBzdG9yZXMgKG1hcCwgZXRjLikgUmV0dXJuIG5leHRTdGF0ZSBvYmplY3RcbiAgICovXG4gIGNvbXBvbmVudFdpbGxVcGRhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXBwU3RhdGUgPSBfYXBwU3RvcmUuZ2V0U3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSAgICAgIDogYXBwU3RhdGUubG9jYWxQbGF5ZXIubmFtZSxcbiAgICAgIGFwcGVhcmFuY2U6IGFwcFN0YXRlLmxvY2FsUGxheWVyLmFwcGVhcmFuY2UsXG4gICAgICByb29tSUQgICAgOiBhcHBTdGF0ZS5zZXNzaW9uLnJvb21JRFxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCBIVE1MIHdhcyBhdHRhY2hlZCB0byB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBvbmVudCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAqL1xuICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xuICAgIC8vXG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50OyIsIi8qKlxuICogSW5pdGlhbCBmaWxlIGZvciB0aGUgQXBwbGljYXRpb25cbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfYnJvd3NlckluZm8gPSByZXF1aXJlKCcuL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgLyoqXG4gICAqIElFIHZlcnNpb25zIDkgYW5kIHVuZGVyIGFyZSBibG9ja2VkLCBvdGhlcnMgYXJlIGFsbG93ZWQgdG8gcHJvY2VlZFxuICAgKi9cbiAgaWYoX2Jyb3dzZXJJbmZvLm5vdFN1cHBvcnRlZCB8fCBfYnJvd3NlckluZm8uaXNJRTkpIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5JykuaW5uZXJIVE1MID0gJzxoMz5Gb3IgdGhlIGJlc3QgZXhwZXJpZW5jZSwgcGxlYXNlIHVzZSBJbnRlcm5ldCBFeHBsb3JlciAxMCssIEZpcmVmb3gsIENocm9tZSBvciBTYWZhcmkgdG8gdmlldyB0aGlzIGFwcGxpY2F0aW9uLjwvaDM+JztcbiAgfSBlbHNlIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24gbW9kdWxlIGFuZCBpbml0aWFsaXplXG4gICAgICovXG4gICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgd2luZG93Lk5vcmkgPSByZXF1aXJlKCcuL25vcmkvTm9yaS5qcycpO1xuICAgICAgd2luZG93LkFQUCA9IHJlcXVpcmUoJy4vYXBwL0FwcC5qcycpO1xuICAgICAgQVBQLmluaXRpYWxpemUoKTtcbiAgICB9O1xuXG4gIH1cblxufSgpKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbmxldCBOb3JpID0gZnVuY3Rpb24gKCkge1xuXG4gIGNvbnN0IF9kaXNwYXRjaGVyID0gcmVxdWlyZSgnLi91dGlscy9EaXNwYXRjaGVyLmpzJyksXG4gICAgICBfcm91dGVyICAgICA9IHJlcXVpcmUoJy4vdXRpbHMvUm91dGVyLmpzJyk7XG5cbiAgLy8gU3dpdGNoIExvZGFzaCB0byB1c2UgTXVzdGFjaGUgc3R5bGUgdGVtcGxhdGVzXG4gIF8udGVtcGxhdGVTZXR0aW5ncy5pbnRlcnBvbGF0ZSA9IC97eyhbXFxzXFxTXSs/KX19L2c7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZnVuY3Rpb24gZ2V0RGlzcGF0Y2hlcigpIHtcbiAgICByZXR1cm4gX2Rpc3BhdGNoZXI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSb3V0ZXIoKSB7XG4gICAgcmV0dXJuIF9yb3V0ZXI7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCAod2luZG93LkFQUF9DT05GSUdfREFUQSB8fCB7fSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFJvdXRlKCkge1xuICAgIHJldHVybiBfcm91dGVyLmdldEN1cnJlbnRSb3V0ZSgpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBGYWN0b3JpZXMgLSBjb25jYXRlbmF0aXZlIGluaGVyaXRhbmNlLCBkZWNvcmF0b3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBNZXJnZXMgYSBjb2xsZWN0aW9uIG9mIG9iamVjdHNcbiAgICogQHBhcmFtIHRhcmdldFxuICAgKiBAcGFyYW0gc291cmNlQXJyYXlcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhc3NpZ25BcnJheSh0YXJnZXQsIHNvdXJjZUFycmF5KSB7XG4gICAgc291cmNlQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICB0YXJnZXQgPSBfLmFzc2lnbih0YXJnZXQsIHNvdXJjZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgTm9yaSBhcHBsaWNhdGlvbiBpbnN0YW5jZVxuICAgKiBAcGFyYW0gY3VzdG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQXBwbGljYXRpb24oY3VzdG9tKSB7XG4gICAgY3VzdG9tLm1peGlucy5wdXNoKHRoaXMpO1xuICAgIHJldHVybiBidWlsZEZyb21NaXhpbnMoY3VzdG9tKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIG1haW4gYXBwbGljYXRpb24gc3RvcmVcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVN0b3JlKGN1c3RvbSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBjcygpIHtcbiAgICAgIHJldHVybiBfLmFzc2lnbih7fSwgYnVpbGRGcm9tTWl4aW5zKGN1c3RvbSkpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBtYWluIGFwcGxpY2F0aW9uIHZpZXdcbiAgICogQHBhcmFtIGN1c3RvbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVZpZXcoY3VzdG9tKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGN2KCkge1xuICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBidWlsZEZyb21NaXhpbnMoY3VzdG9tKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNaXhlcyBpbiB0aGUgbW9kdWxlcyBzcGVjaWZpZWQgaW4gdGhlIGN1c3RvbSBhcHBsaWNhdGlvbiBvYmplY3RcbiAgICogQHBhcmFtIHNvdXJjZU9iamVjdFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGJ1aWxkRnJvbU1peGlucyhzb3VyY2VPYmplY3QpIHtcbiAgICBsZXQgbWl4aW5zO1xuXG4gICAgaWYgKHNvdXJjZU9iamVjdC5taXhpbnMpIHtcbiAgICAgIG1peGlucyA9IHNvdXJjZU9iamVjdC5taXhpbnM7XG4gICAgfVxuXG4gICAgbWl4aW5zLnB1c2goc291cmNlT2JqZWN0KTtcbiAgICByZXR1cm4gYXNzaWduQXJyYXkoe30sIG1peGlucyk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGNvbmZpZyAgICAgICAgICAgOiBnZXRDb25maWcsXG4gICAgZGlzcGF0Y2hlciAgICAgICA6IGdldERpc3BhdGNoZXIsXG4gICAgcm91dGVyICAgICAgICAgICA6IGdldFJvdXRlcixcbiAgICBjcmVhdGVBcHBsaWNhdGlvbjogY3JlYXRlQXBwbGljYXRpb24sXG4gICAgY3JlYXRlU3RvcmUgICAgICA6IGNyZWF0ZVN0b3JlLFxuICAgIGNyZWF0ZVZpZXcgICAgICAgOiBjcmVhdGVWaWV3LFxuICAgIGJ1aWxkRnJvbU1peGlucyAgOiBidWlsZEZyb21NaXhpbnMsXG4gICAgZ2V0Q3VycmVudFJvdXRlICA6IGdldEN1cnJlbnRSb3V0ZSxcbiAgICBhc3NpZ25BcnJheSAgICAgIDogYXNzaWduQXJyYXlcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3JpKCk7XG5cblxuIiwiLyogQGZsb3cgd2VhayAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQ0hBTkdFX1NUT1JFX1NUQVRFOiAnQ0hBTkdFX1NUT1JFX1NUQVRFJ1xufTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWN0aW9uIENyZWF0b3JcbiAqIEJhc2VkIG9uIEZsdXggQWN0aW9uc1xuICogRm9yIG1vcmUgaW5mb3JtYXRpb24gYW5kIGd1aWRlbGluZXM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY2RsaXRlL2ZsdXgtc3RhbmRhcmQtYWN0aW9uXG4gKi9cbnZhciBfbm9yaUFjdGlvbkNvbnN0YW50cyA9IHJlcXVpcmUoJy4vQWN0aW9uQ29uc3RhbnRzLmpzJyk7XG5cbnZhciBOb3JpQWN0aW9uQ3JlYXRvciA9IHtcblxuICBjaGFuZ2VTdG9yZVN0YXRlOiBmdW5jdGlvbiAoZGF0YSwgaWQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZSAgIDogX25vcmlBY3Rpb25Db25zdGFudHMuQ0hBTkdFX1NUT1JFX1NUQVRFLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBpZCAgOiBpZCxcbiAgICAgICAgZGF0YTogZGF0YVxuICAgICAgfVxuICAgIH07XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3JpQWN0aW9uQ3JlYXRvcjsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQWpheCAvIFJlc3QgbW9kdWxlLlxuICogUmV0dXJucyBhbiBSeEpTIE9iZXJ2YWJsZVxuICpcbiAqIFVzYWdlOlxuICpcbiB2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vbm9yaS9zZXJ2aWNlL1Jlc3QnKTtcblxuIHZhciBnZXRTdWIgPSByZXF1ZXN0LnJlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICB1cmwgICA6ICcvaXRlbXMnLFxuICAgICAgICBoZWFkZXJzOiBbeydrZXknOid2YWx1ZSd9XSxcbiAgICAgICAganNvbiAgOiB0cnVlXG4gICAgICB9KS5zdWJzY3JpYmUoXG4gZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICAgIH0sXG4gZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiB2YXIgcG9zdFN1YiA9IHJlcXVlc3QucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICB1cmwgICA6ICcvaXRlbXMnLFxuICAgICAgICBkYXRhICA6IEpTT04uc3RyaW5naWZ5KHtrZXk6ICd2YWx1ZSd9KSxcbiAgICAgICAganNvbiAgOiB0cnVlXG4gICAgICB9KS5zdWJzY3JpYmUoXG4gZnVuY3Rpb24gc3VjY2VzcyhkYXRhKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ29rJywgZGF0YSk7XG4gICAgICAgIH0sXG4gZnVuY3Rpb24gZXJyb3IoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnInLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiB2YXIgcHV0U3ViID0gcmVxdWVzdC5yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgdXJsICAgOiAnL2l0ZW1zLzQyJyxcbiAgICAgICAgZGF0YSAgOiBKU09OLnN0cmluZ2lmeSh7a2V5OiAndmFsdWUnfSksXG4gICAgICAgIGpzb24gIDogdHJ1ZVxuICAgICAgfSkuc3Vic2NyaWJlKFxuIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgICAgICB9LFxuIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gdmFyIGRlbFN1YiA9IHJlcXVlc3QucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIHVybCAgIDogJy9pdGVtcy80MicsXG4gICAgICAgIGpzb24gIDogdHJ1ZVxuICAgICAgfSkuc3Vic2NyaWJlKFxuIGZ1bmN0aW9uIHN1Y2Nlc3MoZGF0YSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycsIGRhdGEpO1xuICAgICAgICB9LFxuIGZ1bmN0aW9uIGVycm9yKGRhdGEpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyJywgZGF0YSk7XG4gICAgICAgIH0pO1xuICpcbiAqL1xuXG5sZXQgUmVzdCA9IGZ1bmN0aW9uICgpIHtcblxuICBmdW5jdGlvbiByZXF1ZXN0KHJlcU9iaikge1xuXG4gICAgbGV0IHhociAgICAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKSxcbiAgICAgICAganNvbiAgICA9IHJlcU9iai5qc29uIHx8IGZhbHNlLFxuICAgICAgICBtZXRob2QgID0gcmVxT2JqLm1ldGhvZC50b1VwcGVyQ2FzZSgpIHx8ICdHRVQnLFxuICAgICAgICB1cmwgICAgID0gcmVxT2JqLnVybCxcbiAgICAgICAgaGVhZGVycyA9IHJlcU9iai5oZWFkZXJzIHx8IFtdLFxuICAgICAgICBkYXRhICAgID0gcmVxT2JqLmRhdGEgfHwgbnVsbDtcblxuICAgIHJldHVybiBuZXcgUnguT2JzZXJ2YWJsZS5jcmVhdGUoZnVuY3Rpb24gbWFrZVJlcShvYnNlcnZlcikge1xuICAgICAgeGhyLm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuXG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWYgKGpzb24pIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQoSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcih4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgaGFuZGxlRXJyb3IoJ1Jlc3VsdCcsICdFcnJvciBwYXJzaW5nIHJlc3VsdC4gU3RhdHVzOiAnICsgeGhyLnN0YXR1cyArICcsIFJlc3BvbnNlOiAnICsgeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGFuZGxlRXJyb3IoeGhyLnN0YXR1cywgeGhyLnN0YXR1c1RleHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgeGhyLm9uZXJyb3IgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaGFuZGxlRXJyb3IoJ05ldHdvcmsgZXJyb3InKTtcbiAgICAgIH07XG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBoYW5kbGVFcnJvcignVGltZW91dCcpO1xuICAgICAgfTtcbiAgICAgIHhoci5vbmFib3J0ICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGhhbmRsZUVycm9yKCdBYm91dCcpO1xuICAgICAgfTtcblxuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uIChoZWFkZXJQYWlyKSB7XG4gICAgICAgIGxldCBwcm9wID0gT2JqZWN0LmtleXMoaGVhZGVyUGFpcilbMF0sXG4gICAgICAgICAgICB2YWx1ZSA9IGhlYWRlclBhaXJbcHJvcF07XG4gICAgICAgIGlmIChwcm9wICYmIHZhbHVlKSB7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIocHJvcCwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zZXJ2aWNlL3Jlc3QsIGJhZCBoZWFkZXIgcGFpcjogJywgaGVhZGVyUGFpcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBzZXQgbm9uIGpzb24gaGVhZGVyPyAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04J1xuICAgICAgaWYgKGpzb24gJiYgbWV0aG9kICE9PSBcIkdFVFwiKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICAgIH0gZWxzZSBpZiAoanNvbiAmJiBtZXRob2QgPT09IFwiR0VUXCIpIHtcbiAgICAgICAgLy8sIHRleHQvKlxuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkFjY2VwdFwiLCBcImFwcGxpY2F0aW9uL2pzb247IG9kYXRhPXZlcmJvc2VcIik7ICAvLyBvZGF0YSBwYXJhbSBmb3IgU2hhcmVwb2ludFxuICAgICAgfVxuXG4gICAgICB4aHIuc2VuZChkYXRhKTtcblxuICAgICAgZnVuY3Rpb24gaGFuZGxlRXJyb3IodHlwZSwgbWVzc2FnZSkge1xuICAgICAgICBtZXNzYWdlID0gbWVzc2FnZSB8fCAnJztcbiAgICAgICAgb2JzZXJ2ZXIub25FcnJvcih0eXBlICsgJyAnICsgbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXN0KCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG5sZXQgU29ja2V0SU9Db25uZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9zdWJqZWN0ICA9IG5ldyBSeC5CZWhhdmlvclN1YmplY3QoKSxcbiAgICAgIF9zb2NrZXRJTyA9IGlvKCksXG4gICAgICBfbG9nICAgICAgPSBbXSxcbiAgICAgIF9jb25uZWN0aW9uSUQsXG4gICAgICBfZXZlbnRzICAgPSByZXF1aXJlKCcuL1NvY2tldElPRXZlbnRzLmpzJyk7XG5cblxuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIF9zb2NrZXRJTy5vbihfZXZlbnRzLk5PVElGWV9DTElFTlQsIG9uTm90aWZ5Q2xpZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGwgbm90aWZpY2F0aW9ucyBmcm9tIFNvY2tldC5pbyBjb21lIGhlcmVcbiAgICogQHBhcmFtIHBheWxvYWQge3R5cGUsIGlkLCB0aW1lLCBwYXlsb2FkfVxuICAgKi9cbiAgZnVuY3Rpb24gb25Ob3RpZnlDbGllbnQocGF5bG9hZCkge1xuICAgIF9sb2cucHVzaChwYXlsb2FkKTtcblxuICAgIGxldCB7dHlwZX0gPSBwYXlsb2FkO1xuXG4gICAgaWYgKHR5cGUgPT09IF9ldmVudHMuUElORykge1xuICAgICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUE9ORywge30pO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gX2V2ZW50cy5QT05HKSB7XG4gICAgICBjb25zb2xlLmxvZygnU09DS0VULklPIFBPTkchJyk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBfZXZlbnRzLkNPTk5FQ1QpIHtcbiAgICAgIF9jb25uZWN0aW9uSUQgPSBwYXlsb2FkLmlkO1xuICAgIH1cbiAgICBub3RpZnlTdWJzY3JpYmVycyhwYXlsb2FkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBpbmcoKSB7XG4gICAgbm90aWZ5U2VydmVyKF9ldmVudHMuUElORywge30pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbCBjb21tdW5pY2F0aW9ucyB0byB0aGUgc2VydmVyIHNob3VsZCBnbyB0aHJvdWdoIGhlcmVcbiAgICogQHBhcmFtIHR5cGVcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIG5vdGlmeVNlcnZlcih0eXBlLCBwYXlsb2FkKSB7XG4gICAgX3NvY2tldElPLmVtaXQoX2V2ZW50cy5OT1RJRllfU0VSVkVSLCB7XG4gICAgICB0eXBlICAgICAgICA6IHR5cGUsXG4gICAgICBjb25uZWN0aW9uSUQ6IF9jb25uZWN0aW9uSUQsXG4gICAgICBwYXlsb2FkICAgICA6IHBheWxvYWRcbiAgICB9KTtcbiAgfVxuXG4gIC8vZnVuY3Rpb24gZW1pdChtZXNzYWdlLCBwYXlsb2FkKSB7XG4gIC8vICBtZXNzYWdlID0gbWVzc2FnZSB8fCBfZXZlbnRzLk1FU1NBR0U7XG4gIC8vICBwYXlsb2FkID0gcGF5bG9hZCB8fCB7fTtcbiAgLy8gIF9zb2NrZXRJTy5lbWl0KG1lc3NhZ2UsIHBheWxvYWQpO1xuICAvL31cbiAgLy9cbiAgLy9mdW5jdGlvbiBvbihldmVudCwgaGFuZGxlcikge1xuICAvLyAgX3NvY2tldElPLm9uKGV2ZW50LCBoYW5kbGVyKTtcbiAgLy99XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSBoYW5kbGVyIHRvIHVwZGF0ZXNcbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlcikge1xuICAgIHJldHVybiBfc3ViamVjdC5zdWJzY3JpYmUoaGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIGZyb20gdXBkYXRlIG9yIHdoYXRldmVyIGZ1bmN0aW9uIHRvIGRpc3BhdGNoIHRvIHN1YnNjcmliZXJzXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVycyhwYXlsb2FkKSB7XG4gICAgX3N1YmplY3Qub25OZXh0KHBheWxvYWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGxhc3QgcGF5bG9hZCB0aGF0IHdhcyBkaXNwYXRjaGVkIHRvIHN1YnNjcmliZXJzXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TGFzdE5vdGlmaWNhdGlvbigpIHtcbiAgICByZXR1cm4gX3N1YmplY3QuZ2V0VmFsdWUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEV2ZW50Q29uc3RhbnRzKCkge1xuICAgIHJldHVybiBfLmFzc2lnbih7fSwgX2V2ZW50cyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGV2ZW50cyAgICAgICAgICAgICA6IGdldEV2ZW50Q29uc3RhbnRzLFxuICAgIGluaXRpYWxpemUgICAgICAgICA6IGluaXRpYWxpemUsXG4gICAgcGluZyAgICAgICAgICAgICAgIDogcGluZyxcbiAgICBub3RpZnlTZXJ2ZXIgICAgICAgOiBub3RpZnlTZXJ2ZXIsXG4gICAgc3Vic2NyaWJlICAgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIG5vdGlmeVN1YnNjcmliZXJzICA6IG5vdGlmeVN1YnNjcmliZXJzLFxuICAgIGdldExhc3ROb3RpZmljYXRpb246IGdldExhc3ROb3RpZmljYXRpb25cbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTb2NrZXRJT0Nvbm5lY3RvcigpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFBJTkcgICAgICAgICAgICAgOiAncGluZycsXG4gIFBPTkcgICAgICAgICAgICAgOiAncG9uZycsXG4gIE5PVElGWV9DTElFTlQgICAgOiAnbm90aWZ5X2NsaWVudCcsXG4gIE5PVElGWV9TRVJWRVIgICAgOiAnbm90aWZ5X3NlcnZlcicsXG4gIENPTk5FQ1QgICAgICAgICAgOiAnY29ubmVjdCcsXG4gIERST1BQRUQgICAgICAgICAgOiAnZHJvcHBlZCcsXG4gIFVTRVJfQ09OTkVDVEVEICAgOiAndXNlcl9jb25uZWN0ZWQnLFxuICBVU0VSX0RJU0NPTk5FQ1RFRDogJ3VzZXJfZGlzY29ubmVjdGVkJyxcbiAgRU1JVCAgICAgICAgICAgICA6ICdlbWl0JyxcbiAgQlJPQURDQVNUICAgICAgICA6ICdicm9hZGNhc3QnLFxuICBTWVNURU1fTUVTU0FHRSAgIDogJ3N5c3RlbV9tZXNzYWdlJyxcbiAgTUVTU0FHRSAgICAgICAgICA6ICdtZXNzYWdlJyxcbiAgQ1JFQVRFX1JPT00gICAgICA6ICdjcmVhdGVfcm9vbScsXG4gIEpPSU5fUk9PTSAgICAgICAgOiAnam9pbl9yb29tJyxcbiAgTEVBVkVfUk9PTSAgICAgICA6ICdsZWF2ZV9yb29tJyxcbiAgR0FNRV9TVEFSVCAgICAgICA6ICdnYW1lX3N0YXJ0JyxcbiAgR0FNRV9FTkQgICAgICAgICA6ICdnYW1lX2VuZCcsXG4gIEdBTUVfQUJPUlQgICAgICAgOiAnZ2FtZV9hYm9ydCdcbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFdyYXBzIEltbXV0YWJsZS5qcydzIE1hcCBpbiB0aGUgc2FtZSBzeW50YXggYXMgdGhlIFNpbXBsZVN0b3JlIG1vZHVsZVxuICpcbiAqIFZpZXcgRG9jcyBodHRwOi8vZmFjZWJvb2suZ2l0aHViLmlvL2ltbXV0YWJsZS1qcy9kb2NzLyMvTWFwXG4gKi9cblxubGV0IGltbXV0YWJsZSA9IHJlcXVpcmUoJy4uLy4uL3ZlbmRvci9pbW11dGFibGUubWluLmpzJyk7XG5cbmxldCBJbW11dGFibGVNYXAgPSBmdW5jdGlvbiAoKSB7XG4gIGxldCBfbWFwID0gaW1tdXRhYmxlLk1hcCgpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBNYXAgb2JqZWN0XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0TWFwKCkge1xuICAgIHJldHVybiBfbWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIGNvcHkgb2YgdGhlIHN0YXRlXG4gICAqIEByZXR1cm5zIHt2b2lkfCp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICByZXR1cm4gX21hcC50b0pTKCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGVcbiAgICogQHBhcmFtIG5leHRcbiAgICovXG4gIGZ1bmN0aW9uIHNldFN0YXRlKG5leHQpIHtcbiAgICBfbWFwID0gX21hcC5tZXJnZShuZXh0KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZ2V0U3RhdGU6IGdldFN0YXRlLFxuICAgIHNldFN0YXRlOiBzZXRTdGF0ZSxcbiAgICBnZXRNYXAgIDogZ2V0TWFwXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW1tdXRhYmxlTWFwOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLyoqXG4gKiBNaXhpbiBmb3IgTm9yaSBzdG9yZXMgdG8gYWRkIGZ1bmN0aW9uYWxpdHkgc2ltaWxhciB0byBSZWR1eCcgUmVkdWNlciBhbmQgc2luZ2xlXG4gKiBvYmplY3Qgc3RhdGUgdHJlZSBjb25jZXB0LiBNaXhpbiBzaG91bGQgYmUgY29tcG9zZWQgdG8gbm9yaS9zdG9yZS9BcHBsaWNhdGlvblN0b3JlXG4gKiBkdXJpbmcgY3JlYXRpb24gb2YgbWFpbiBBcHBTdG9yZVxuICpcbiAqIGh0dHBzOi8vZ2FlYXJvbi5naXRodWIuaW8vcmVkdXgvZG9jcy9hcGkvU3RvcmUuaHRtbFxuICogaHR0cHM6Ly9nYWVhcm9uLmdpdGh1Yi5pby9yZWR1eC9kb2NzL2Jhc2ljcy9SZWR1Y2Vycy5odG1sXG4gKlxuICogQ3JlYXRlZCA4LzEzLzE1XG4gKi9cblxuY29uc3QgaXMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvdXRpbC9pcy5qcycpO1xuXG5sZXQgTWl4aW5SZWR1Y2VyU3RvcmUgPSBmdW5jdGlvbiAoKSB7XG4gIGxldCBfdGhpcyxcbiAgICAgIF9zdGF0ZSxcbiAgICAgIF9zdGF0ZVJlZHVjZXJzID0gW107XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBBY2Nlc3NvcnNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIF9zdGF0ZSBtaWdodCBub3QgZXhpc3QgaWYgc3Vic2NyaWJlcnMgYXJlIGFkZGVkIGJlZm9yZSB0aGlzIHN0b3JlIGlzIGluaXRpYWxpemVkXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICBpZiAoX3N0YXRlKSB7XG4gICAgICByZXR1cm4gX3N0YXRlLmdldFN0YXRlKCk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFN0YXRlKHN0YXRlKSB7XG4gICAgaWYgKCFfLmlzRXF1YWwoc3RhdGUsIF9zdGF0ZSkpIHtcbiAgICAgIF9zdGF0ZS5zZXRTdGF0ZShzdGF0ZSk7XG4gICAgICBfdGhpcy5ub3RpZnlTdWJzY3JpYmVycyh7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0UmVkdWNlcnMocmVkdWNlckFycmF5KSB7XG4gICAgX3N0YXRlUmVkdWNlcnMgPSByZWR1Y2VyQXJyYXk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRSZWR1Y2VyKHJlZHVjZXIpIHtcbiAgICBfc3RhdGVSZWR1Y2Vycy5wdXNoKHJlZHVjZXIpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBJbml0XG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiBTZXQgdXAgZXZlbnQgbGlzdGVuZXIvcmVjZWl2ZXJcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVSZWR1Y2VyU3RvcmUoKSB7XG4gICAgaWYgKCF0aGlzLmNyZWF0ZVN1YmplY3QpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS9zdG9yZS9NaXhpblJlZHVjZXJTdG9yZSBuZWVkcyBub3JpL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QgdG8gbm90aWZ5Jyk7XG4gICAgfVxuXG4gICAgX3RoaXMgID0gdGhpcztcbiAgICBfc3RhdGUgPSByZXF1aXJlKCcuL0ltbXV0YWJsZU1hcC5qcycpKCk7XG5cbiAgICBpZiAoIV9zdGF0ZVJlZHVjZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZHVjZXJTdG9yZSwgbXVzdCBzZXQgYSByZWR1Y2VyIGJlZm9yZSBpbml0aWFsaXphdGlvbicpO1xuICAgIH1cblxuICAgIC8vIFNldCBpbml0aWFsIHN0YXRlIGZyb20gZW1wdHkgZXZlbnRcbiAgICBhcHBseVJlZHVjZXJzKHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSB0aGUgYWN0aW9uIG9iamVjdCB0byB0aGUgcmVkdWNlcnMgdG8gY2hhbmdlIHN0YXRlXG4gICAqIGFyZSBzZW50IHRvIGFsbCByZWR1Y2VycyB0byB1cGRhdGUgdGhlIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25PYmpPckFycnkgQXJyYXkgb2YgYWN0aW9ucyBvciBhIHNpbmdsZSBhY3Rpb24gdG8gcmVkdWNlIGZyb21cbiAgICovXG4gIGZ1bmN0aW9uIGFwcGx5KGFjdGlvbk9iak9yQXJyeSkge1xuICAgIGlmIChpcy5hcnJheShhY3Rpb25PYmpPckFycnkpKSB7XG4gICAgICBhY3Rpb25PYmpPckFycnkuZm9yRWFjaChhY3Rpb25PYmogPT4gYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmopKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwbHlSZWR1Y2VycyhhY3Rpb25PYmpPckFycnkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5UmVkdWNlcnMoYWN0aW9uT2JqZWN0KSB7XG4gICAgbGV0IG5leHRTdGF0ZSA9IGFwcGx5UmVkdWNlcnNUb1N0YXRlKGdldFN0YXRlKCksIGFjdGlvbk9iamVjdCk7XG4gICAgc2V0U3RhdGUobmV4dFN0YXRlKTtcbiAgICBfdGhpcy5oYW5kbGVTdGF0ZU11dGF0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogQVBJIGhvb2sgdG8gaGFuZGxlIHN0YXRlIHVwZGF0ZXNcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlTXV0YXRpb24oKSB7XG4gICAgLy8gb3ZlcnJpZGUgdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgc3RhdGUgZnJvbSB0aGUgY29tYmluZWQgcmVkdWNlcyBhbmQgYWN0aW9uIG9iamVjdFxuICAgKiBTdG9yZSBzdGF0ZSBpc24ndCBtb2RpZmllZCwgY3VycmVudCBzdGF0ZSBpcyBwYXNzZWQgaW4gYW5kIG11dGF0ZWQgc3RhdGUgcmV0dXJuZWRcbiAgICogQHBhcmFtIHN0YXRlXG4gICAqIEBwYXJhbSBhY3Rpb25cbiAgICogQHJldHVybnMgeyp8e319XG4gICAqL1xuICBmdW5jdGlvbiBhcHBseVJlZHVjZXJzVG9TdGF0ZShzdGF0ZSwgYWN0aW9uKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICBfc3RhdGVSZWR1Y2Vycy5mb3JFYWNoKHJlZHVjZXJGdW5jID0+IHN0YXRlID0gcmVkdWNlckZ1bmMoc3RhdGUsIGFjdGlvbikpO1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZW1wbGF0ZSByZWR1Y2VyIGZ1bmN0aW9uXG4gICAqIFN0b3JlIHN0YXRlIGlzbid0IG1vZGlmaWVkLCBjdXJyZW50IHN0YXRlIGlzIHBhc3NlZCBpbiBhbmQgbXV0YXRlZCBzdGF0ZSByZXR1cm5lZFxuXG4gICBmdW5jdGlvbiB0ZW1wbGF0ZVJlZHVjZXJGdW5jdGlvbihzdGF0ZSwgZXZlbnQpIHtcbiAgICAgICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG4gICAgICAgICAgY2FzZSBfbm9yaUFjdGlvbkNvbnN0YW50cy5NT0RFTF9EQVRBX0NIQU5HRUQ6XG4gICAgICAgICAgICAvLyBjYW4gY29tcG9zZSBvdGhlciByZWR1Y2Vyc1xuICAgICAgICAgICAgLy8gcmV0dXJuIF8ubWVyZ2Uoe30sIHN0YXRlLCBvdGhlclN0YXRlVHJhbnNmb3JtZXIoc3RhdGUpKTtcbiAgICAgICAgICAgIHJldHVybiBfLm1lcmdlKHt9LCBzdGF0ZSwge3Byb3A6IGV2ZW50LnBheWxvYWQudmFsdWV9KTtcbiAgICAgICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29uc29sZS53YXJuKCdSZWR1Y2VyIHN0b3JlLCB1bmhhbmRsZWQgZXZlbnQgdHlwZTogJytldmVudC50eXBlKTtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgKi9cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVSZWR1Y2VyU3RvcmU6IGluaXRpYWxpemVSZWR1Y2VyU3RvcmUsXG4gICAgZ2V0U3RhdGUgICAgICAgICAgICAgIDogZ2V0U3RhdGUsXG4gICAgc2V0U3RhdGUgICAgICAgICAgICAgIDogc2V0U3RhdGUsXG4gICAgYXBwbHkgICAgICAgICAgICAgICAgIDogYXBwbHksXG4gICAgc2V0UmVkdWNlcnMgICAgICAgICAgIDogc2V0UmVkdWNlcnMsXG4gICAgYWRkUmVkdWNlciAgICAgICAgICAgIDogYWRkUmVkdWNlcixcbiAgICBhcHBseVJlZHVjZXJzICAgICAgICAgOiBhcHBseVJlZHVjZXJzLFxuICAgIGFwcGx5UmVkdWNlcnNUb1N0YXRlICA6IGFwcGx5UmVkdWNlcnNUb1N0YXRlLFxuICAgIGhhbmRsZVN0YXRlTXV0YXRpb24gICA6IGhhbmRsZVN0YXRlTXV0YXRpb25cbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpblJlZHVjZXJTdG9yZSgpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxuLypcbiBNYXR0IFBlcmtpbnMsIDYvMTIvMTVcblxuIHB1Ymxpc2ggcGF5bG9hZCBvYmplY3RcblxuIHtcbiB0eXBlOiBFVlRfVFlQRSxcbiBwYXlsb2FkOiB7XG4ga2V5OiB2YWx1ZVxuIH1cbiB9XG5cbiAqL1xudmFyIERpc3BhdGNoZXIgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9zdWJqZWN0TWFwICA9IHt9LFxuICAgICAgX3JlY2VpdmVyTWFwID0ge30sXG4gICAgICBfaWQgICAgICAgICAgPSAwLFxuICAgICAgX2xvZyAgICAgICAgID0gW10sXG4gICAgICBfcXVldWUgICAgICAgPSBbXSxcbiAgICAgIF90aW1lck9ic2VydmFibGUsXG4gICAgICBfdGltZXJTdWJzY3JpcHRpb24sXG4gICAgICBfdGltZXJQYXVzYWJsZTtcblxuICAvKipcbiAgICogQWRkIGFuIGV2ZW50IGFzIG9ic2VydmFibGVcbiAgICogQHBhcmFtIGV2dFN0ciBFdmVudCBuYW1lIHN0cmluZ1xuICAgKiBAcGFyYW0gaGFuZGxlciBvbk5leHQoKSBzdWJzY3JpcHRpb24gZnVuY3Rpb25cbiAgICogQHBhcmFtIG9uY2VPckNvbnRleHQgb3B0aW9uYWwsIGVpdGhlciB0aGUgY29udGV4dCB0byBleGVjdXRlIHRoZSBoYW5kZXIgb3Igb25jZSBib29sXG4gICAqIEBwYXJhbSBvbmNlIHdpbGwgY29tcGxldGUvZGlzcG9zZSBhZnRlciBvbmUgZmlyZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHN1YnNjcmliZShldnRTdHIsIGhhbmRsZXIsIG9uY2VPckNvbnRleHQsIG9uY2UpIHtcbiAgICB2YXIgaGFuZGxlckNvbnRleHQgPSB3aW5kb3c7XG5cbiAgICAvL2NvbnNvbGUubG9nKCdkaXNwYXRjaGVyIHN1YnNjcmliZScsIGV2dFN0ciwgaGFuZGxlciwgb25jZU9yQ29udGV4dCwgb25jZSk7XG5cbiAgICBpZiAoaXMuZmFsc2V5KGV2dFN0cikpIHtcbiAgICAgIGNvbnNvbGUud2FybignRGlzcGF0Y2hlcjogRmFzbGV5IGV2ZW50IHN0cmluZyBwYXNzZWQgZm9yIGhhbmRsZXInLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICBpZiAoaXMuZmFsc2V5KGhhbmRsZXIpKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0Rpc3BhdGNoZXI6IEZhc2xleSBoYW5kbGVyIHBhc3NlZCBmb3IgZXZlbnQgc3RyaW5nJywgZXZ0U3RyKTtcbiAgICB9XG5cbiAgICBpZiAob25jZU9yQ29udGV4dCB8fCBvbmNlT3JDb250ZXh0ID09PSBmYWxzZSkge1xuICAgICAgaWYgKG9uY2VPckNvbnRleHQgPT09IHRydWUgfHwgb25jZU9yQ29udGV4dCA9PT0gZmFsc2UpIHtcbiAgICAgICAgb25jZSA9IG9uY2VPckNvbnRleHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoYW5kbGVyQ29udGV4dCA9IG9uY2VPckNvbnRleHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFfc3ViamVjdE1hcFtldnRTdHJdKSB7XG4gICAgICBfc3ViamVjdE1hcFtldnRTdHJdID0gW107XG4gICAgfVxuXG4gICAgdmFyIHN1YmplY3QgPSBuZXcgUnguU3ViamVjdCgpO1xuXG4gICAgX3N1YmplY3RNYXBbZXZ0U3RyXS5wdXNoKHtcbiAgICAgIG9uY2UgICAgOiBvbmNlLFxuICAgICAgcHJpb3JpdHk6IDAsXG4gICAgICBoYW5kbGVyIDogaGFuZGxlcixcbiAgICAgIGNvbnRleHQgOiBoYW5kbGVyQ29udGV4dCxcbiAgICAgIHN1YmplY3QgOiBzdWJqZWN0LFxuICAgICAgdHlwZSAgICA6IDBcbiAgICB9KTtcblxuICAgIHJldHVybiBzdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyLmJpbmQoaGFuZGxlckNvbnRleHQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSBldmVudCBwcm9jZXNzaW5nIHRpbWVyIG9yIHJlc3VtZSBhIHBhdXNlZCB0aW1lclxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdFRpbWVyKCkge1xuICAgIGlmIChfdGltZXJPYnNlcnZhYmxlKSB7XG4gICAgICBfdGltZXJQYXVzYWJsZS5vbk5leHQodHJ1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX3RpbWVyUGF1c2FibGUgICAgID0gbmV3IFJ4LlN1YmplY3QoKTtcbiAgICBfdGltZXJPYnNlcnZhYmxlICAgPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKDEpLnBhdXNhYmxlKF90aW1lclBhdXNhYmxlKTtcbiAgICBfdGltZXJTdWJzY3JpcHRpb24gPSBfdGltZXJPYnNlcnZhYmxlLnN1YnNjcmliZShwcm9jZXNzTmV4dEV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaGlmdCBuZXh0IGV2ZW50IHRvIGhhbmRsZSBvZmYgb2YgdGhlIHF1ZXVlIGFuZCBkaXNwYXRjaCBpdFxuICAgKi9cbiAgZnVuY3Rpb24gcHJvY2Vzc05leHRFdmVudCgpIHtcbiAgICB2YXIgZXZ0ID0gX3F1ZXVlLnNoaWZ0KCk7XG4gICAgaWYgKGV2dCkge1xuICAgICAgZGlzcGF0Y2hUb1JlY2VpdmVycyhldnQpO1xuICAgICAgZGlzcGF0Y2hUb1N1YnNjcmliZXJzKGV2dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF90aW1lclBhdXNhYmxlLm9uTmV4dChmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1c2ggZXZlbnQgdG8gdGhlIHN0YWNrIGFuZCBiZWdpbiBleGVjdXRpb25cbiAgICogQHBhcmFtIHBheWxvYWRPYmogdHlwZTpTdHJpbmcsIHBheWxvYWQ6ZGF0YVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKi9cbiAgZnVuY3Rpb24gcHVibGlzaChwYXlsb2FkT2JqKSB7XG4gICAgX2xvZy5wdXNoKHBheWxvYWRPYmopO1xuICAgIF9xdWV1ZS5wdXNoKHBheWxvYWRPYmopO1xuXG4gICAgaW5pdFRpbWVyKCk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCB0aGUgcGF5bG9hZCB0byBhbGwgcmVjZWl2ZXJzXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBkaXNwYXRjaFRvUmVjZWl2ZXJzKHBheWxvYWQpIHtcbiAgICBmb3IgKHZhciBpZCBpbiBfcmVjZWl2ZXJNYXApIHtcbiAgICAgIF9yZWNlaXZlck1hcFtpZF0uaGFuZGxlcihwYXlsb2FkKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlcnMgcmVjZWl2ZSBhbGwgcGF5bG9hZHMgZm9yIGEgZ2l2ZW4gZXZlbnQgdHlwZSB3aGlsZSBoYW5kbGVycyBhcmUgdGFyZ2V0ZWRcbiAgICogQHBhcmFtIHBheWxvYWRcbiAgICovXG4gIGZ1bmN0aW9uIGRpc3BhdGNoVG9TdWJzY3JpYmVycyhwYXlsb2FkKSB7XG4gICAgdmFyIHN1YnNjcmliZXJzID0gX3N1YmplY3RNYXBbcGF5bG9hZC50eXBlXSwgaTtcbiAgICBpZiAoIXN1YnNjcmliZXJzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaSA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHZhciBzdWJqT2JqID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICBpZiAoc3Viak9iai50eXBlID09PSAwKSB7XG4gICAgICAgIHN1YmpPYmouc3ViamVjdC5vbk5leHQocGF5bG9hZCk7XG4gICAgICB9XG4gICAgICBpZiAoc3Viak9iai5vbmNlKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlKHBheWxvYWQudHlwZSwgc3Viak9iai5oYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgaGFuZGxlclxuICAgKiBAcGFyYW0gZXZ0U3RyXG4gICAqIEBwYXJhbSBoYW5kZXJcbiAgICovXG4gIGZ1bmN0aW9uIHVuc3Vic2NyaWJlKGV2dFN0ciwgaGFuZGxlcikge1xuICAgIGlmIChfc3ViamVjdE1hcFtldnRTdHJdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBfc3ViamVjdE1hcFtldnRTdHJdLFxuICAgICAgICBoYW5kbGVySWR4ICA9IC0xO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHN1YnNjcmliZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoc3Vic2NyaWJlcnNbaV0uaGFuZGxlciA9PT0gaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVySWR4ICAgICA9IGk7XG4gICAgICAgIHN1YnNjcmliZXJzW2ldLnN1YmplY3Qub25Db21wbGV0ZWQoKTtcbiAgICAgICAgc3Vic2NyaWJlcnNbaV0uc3ViamVjdC5kaXNwb3NlKCk7XG4gICAgICAgIHN1YnNjcmliZXJzW2ldID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFuZGxlcklkeCA9PT0gLTEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzdWJzY3JpYmVycy5zcGxpY2UoaGFuZGxlcklkeCwgMSk7XG5cbiAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBkZWxldGUgX3N1YmplY3RNYXBbZXZ0U3RyXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgY29weSBvZiB0aGUgbG9nIGFycmF5XG4gICAqIEByZXR1cm5zIHtBcnJheS48VD59XG4gICAqL1xuICBmdW5jdGlvbiBnZXRMb2coKSB7XG4gICAgcmV0dXJuIF9sb2cuc2xpY2UoMCk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBTaW1wbGUgcmVjZWl2ZXIgaW1wbGVtZW50YXRpb24gYmFzZWQgb24gRmx1eFxuICAgKiBSZWdpc3RlcmVkIHJlY2VpdmVycyB3aWxsIGdldCBldmVyeSBwdWJsaXNoZWQgZXZlbnRcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL2ZsdXgvYmxvYi9tYXN0ZXIvc3JjL0Rpc3BhdGNoZXIuanNcbiAgICpcbiAgICogVXNhZ2U6XG4gICAqXG4gICAqIF9kaXNwYXRjaGVyLnJlZ2lzdGVyUmVjZWl2ZXIoZnVuY3Rpb24gKHBheWxvYWQpIHtcbiAgICAgICAqICAgIGNvbnNvbGUubG9nKCdyZWNlaXZpbmcsICcscGF5bG9hZCk7XG4gICAgICAgKiB9KTtcbiAgICpcbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyUmVjZWl2ZXIoaGFuZGxlcikge1xuICAgIHZhciBpZCAgICAgICAgICAgPSAnSURfJyArIF9pZCsrO1xuICAgIF9yZWNlaXZlck1hcFtpZF0gPSB7XG4gICAgICBpZCAgICAgOiBpZCxcbiAgICAgIGhhbmRsZXI6IGhhbmRsZXJcbiAgICB9O1xuICAgIHJldHVybiBpZDtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIHJlY2VpdmVyIGhhbmRsZXJcbiAgICogQHBhcmFtIGlkXG4gICAqL1xuICBmdW5jdGlvbiB1bnJlZ2lzdGVyUmVjZWl2ZXIoaWQpIHtcbiAgICBpZiAoX3JlY2VpdmVyTWFwLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgZGVsZXRlIF9yZWNlaXZlck1hcFtpZF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmUgICAgICAgICA6IHN1YnNjcmliZSxcbiAgICB1bnN1YnNjcmliZSAgICAgICA6IHVuc3Vic2NyaWJlLFxuICAgIHB1Ymxpc2ggICAgICAgICAgIDogcHVibGlzaCxcbiAgICBnZXRMb2cgICAgICAgICAgICA6IGdldExvZyxcbiAgICByZWdpc3RlclJlY2VpdmVyICA6IHJlZ2lzdGVyUmVjZWl2ZXIsXG4gICAgdW5yZWdpc3RlclJlY2VpdmVyOiB1bnJlZ2lzdGVyUmVjZWl2ZXJcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEaXNwYXRjaGVyKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIEFkZCBSeEpTIFN1YmplY3QgdG8gYSBtb2R1bGUuXG4gKlxuICogQWRkIG9uZSBzaW1wbGUgb2JzZXJ2YWJsZSBzdWJqZWN0IG9yIG1vcmUgY29tcGxleCBhYmlsaXR5IHRvIGNyZWF0ZSBvdGhlcnMgZm9yXG4gKiBtb3JlIGNvbXBsZXggZXZlbnRpbmcgbmVlZHMuXG4gKi9cblxuY29uc3QgaXMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvdXRpbC9pcy5qcycpO1xuXG5sZXQgTWl4aW5PYnNlcnZhYmxlU3ViamVjdCA9IGZ1bmN0aW9uICgpIHtcblxuICBsZXQgX3N1YmplY3QgICAgPSBuZXcgUnguU3ViamVjdCgpLFxuICAgICAgX3N1YmplY3RNYXAgPSB7fTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IHN1YmplY3RcbiAgICogQHBhcmFtIG5hbWVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdWJqZWN0KG5hbWUpIHtcbiAgICBpZiAoIV9zdWJqZWN0TWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBfc3ViamVjdE1hcFtuYW1lXSA9IG5ldyBSeC5TdWJqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBfc3ViamVjdE1hcFtuYW1lXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgaGFuZGxlciB0byB1cGRhdGVzLiBJZiB0aGUgaGFuZGxlciBpcyBhIHN0cmluZywgdGhlIG5ldyBzdWJqZWN0XG4gICAqIHdpbGwgYmUgY3JlYXRlZC5cbiAgICogQHBhcmFtIGhhbmRsZXJcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzdWJzY3JpYmUoaGFuZGxlck9yTmFtZSwgb3B0SGFuZGxlcikge1xuICAgIGlmIChpcy5zdHJpbmcoaGFuZGxlck9yTmFtZSkpIHtcbiAgICAgIHJldHVybiBjcmVhdGVTdWJqZWN0KGhhbmRsZXJPck5hbWUpLnN1YnNjcmliZShvcHRIYW5kbGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIF9zdWJqZWN0LnN1YnNjcmliZShoYW5kbGVyT3JOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggdXBkYXRlZCB0byBzdWJzY3JpYmVyc1xuICAgKiBAcGFyYW0gcGF5bG9hZFxuICAgKi9cbiAgZnVuY3Rpb24gbm90aWZ5U3Vic2NyaWJlcnMocGF5bG9hZCkge1xuICAgIF9zdWJqZWN0Lm9uTmV4dChwYXlsb2FkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwYXRjaCB1cGRhdGVkIHRvIG5hbWVkIHN1YnNjcmliZXJzXG4gICAqIEBwYXJhbSBuYW1lXG4gICAqIEBwYXJhbSBwYXlsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVyc09mKG5hbWUsIHBheWxvYWQpIHtcbiAgICBpZiAoX3N1YmplY3RNYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIF9zdWJqZWN0TWFwW25hbWVdLm9uTmV4dChwYXlsb2FkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKCdNaXhpbk9ic2VydmFibGVTdWJqZWN0LCBubyBzdWJzY3JpYmVycyBvZiAnICsgbmFtZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmUgICAgICAgICAgOiBzdWJzY3JpYmUsXG4gICAgY3JlYXRlU3ViamVjdCAgICAgIDogY3JlYXRlU3ViamVjdCxcbiAgICBub3RpZnlTdWJzY3JpYmVycyAgOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBub3RpZnlTdWJzY3JpYmVyc09mOiBub3RpZnlTdWJzY3JpYmVyc09mXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5PYnNlcnZhYmxlU3ViamVjdDsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogVXRpbGl0eSB0byBoYW5kbGUgYWxsIHZpZXcgRE9NIGF0dGFjaG1lbnQgdGFza3NcbiAqL1xuXG5sZXQgUmVuZGVyZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IF9kb21VdGlscyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgZnVuY3Rpb24gcmVuZGVyKHt0YXJnZXQsIGh0bWwsIGNhbGxiYWNrfSkge1xuICAgIGxldCBkb21FbCxcbiAgICAgICAgbW91bnRQb2ludCAgICAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCk7XG5cbiAgICBtb3VudFBvaW50LmlubmVySFRNTCA9ICcnO1xuXG4gICAgaWYgKGh0bWwpIHtcbiAgICAgIGRvbUVsID0gX2RvbVV0aWxzLkhUTUxTdHJUb05vZGUoaHRtbCk7XG4gICAgICBtb3VudFBvaW50LmFwcGVuZENoaWxkKGRvbUVsKTtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKGRvbUVsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZG9tRWw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlbmRlcjogcmVuZGVyXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVuZGVyZXIoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogU2ltcGxlIHJvdXRlclxuICogU3VwcG9ydGluZyBJRTkgc28gdXNpbmcgaGFzaGVzIGluc3RlYWQgb2YgdGhlIGhpc3RvcnkgQVBJIGZvciBub3dcbiAqL1xuXG5sZXQgUm91dGVyID0gZnVuY3Rpb24gKCkge1xuXG4gIGxldCBfc3ViamVjdCAgPSBuZXcgUnguU3ViamVjdCgpLFxuICAgICAgX2hhc2hDaGFuZ2VPYnNlcnZhYmxlLFxuICAgICAgX29ialV0aWxzID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvcmUvT2JqZWN0VXRpbHMuanMnKTtcblxuICAvKipcbiAgICogU2V0IGV2ZW50IGhhbmRsZXJzXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIF9oYXNoQ2hhbmdlT2JzZXJ2YWJsZSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHdpbmRvdywgJ2hhc2hjaGFuZ2UnKS5zdWJzY3JpYmUobm90aWZ5U3Vic2NyaWJlcnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIHN1YnNjcmliZSBhIGhhbmRsZXIgdG8gdGhlIHVybCBjaGFuZ2UgZXZlbnRzXG4gICAqIEBwYXJhbSBoYW5kbGVyXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gX3N1YmplY3Quc3Vic2NyaWJlKGhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5vdGlmeSBvZiBhIGNoYW5nZSBpbiByb3V0ZVxuICAgKiBAcGFyYW0gZnJvbUFwcCBUcnVlIGlmIHRoZSByb3V0ZSB3YXMgY2F1c2VkIGJ5IGFuIGFwcCBldmVudCBub3QgVVJMIG9yIGhpc3RvcnkgY2hhbmdlXG4gICAqL1xuICBmdW5jdGlvbiBub3RpZnlTdWJzY3JpYmVycygpIHtcbiAgICBsZXQgZXZlbnRQYXlsb2FkID0ge1xuICAgICAgcm91dGVPYmo6IGdldEN1cnJlbnRSb3V0ZSgpLCAvLyB7IHJvdXRlOiwgZGF0YTogfVxuICAgICAgZnJhZ21lbnQ6IGdldFVSTEZyYWdtZW50KClcbiAgICB9O1xuXG4gICAgX3N1YmplY3Qub25OZXh0KGV2ZW50UGF5bG9hZCk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIHRoZSByb3V0ZSBhbmQgcXVlcnkgc3RyaW5nIGZyb20gdGhlIGN1cnJlbnQgVVJMIGZyYWdtZW50XG4gICAqIEByZXR1cm5zIHt7cm91dGU6IHN0cmluZywgcXVlcnk6IHt9fX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRSb3V0ZSgpIHtcbiAgICBsZXQgZnJhZ21lbnQgICAgPSBnZXRVUkxGcmFnbWVudCgpLFxuICAgICAgICBwYXJ0cyAgICAgICA9IGZyYWdtZW50LnNwbGl0KCc/JyksXG4gICAgICAgIHJvdXRlICAgICAgID0gJy8nICsgcGFydHNbMF0sXG4gICAgICAgIHF1ZXJ5U3RyICAgID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhcnRzWzFdKSxcbiAgICAgICAgcXVlcnlTdHJPYmogPSBwYXJzZVF1ZXJ5U3RyKHF1ZXJ5U3RyKTtcblxuICAgIGlmIChxdWVyeVN0ciA9PT0gJz11bmRlZmluZWQnKSB7XG4gICAgICBxdWVyeVN0ck9iaiA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB7cm91dGU6IHJvdXRlLCBkYXRhOiBxdWVyeVN0ck9ian07XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIGEgcXVlcnkgc3RyaW5nIGludG8ga2V5L3ZhbHVlIHBhaXJzXG4gICAqIEBwYXJhbSBxdWVyeVN0clxuICAgKiBAcmV0dXJucyB7e319XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZVF1ZXJ5U3RyKHF1ZXJ5U3RyKSB7XG4gICAgbGV0IG9iaiAgID0ge30sXG4gICAgICAgIHBhcnRzID0gcXVlcnlTdHIuc3BsaXQoJyYnKTtcblxuICAgIHBhcnRzLmZvckVhY2gocGFpclN0ciA9PiB7XG4gICAgICBsZXQgcGFpckFyciAgICAgPSBwYWlyU3RyLnNwbGl0KCc9Jyk7XG4gICAgICBvYmpbcGFpckFyclswXV0gPSBwYWlyQXJyWzFdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21iaW5lcyBhIHJvdXRlIGFuZCBkYXRhIG9iamVjdCBpbnRvIGEgcHJvcGVyIFVSTCBoYXNoIGZyYWdtZW50XG4gICAqIEBwYXJhbSByb3V0ZVxuICAgKiBAcGFyYW0gZGF0YU9ialxuICAgKi9cbiAgZnVuY3Rpb24gc2V0KHJvdXRlLCBkYXRhT2JqKSB7XG4gICAgbGV0IHBhdGggPSByb3V0ZSxcbiAgICAgICAgZGF0YSA9IFtdO1xuICAgIGlmICghX29ialV0aWxzLmlzTnVsbChkYXRhT2JqKSkge1xuICAgICAgcGF0aCArPSBcIj9cIjtcbiAgICAgIGZvciAodmFyIHByb3AgaW4gZGF0YU9iaikge1xuICAgICAgICBpZiAocHJvcCAhPT0gJ3VuZGVmaW5lZCcgJiYgZGF0YU9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgIGRhdGEucHVzaChwcm9wICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGRhdGFPYmpbcHJvcF0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcGF0aCArPSBkYXRhLmpvaW4oJyYnKTtcbiAgICB9XG5cbiAgICB1cGRhdGVVUkxGcmFnbWVudChwYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlICd3aGF0ZXZlci5odG1sIycgaW4gdGhlIFVSTFxuICAgKiBMZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIGFyZSByZW1vdmVkXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRVUkxGcmFnbWVudCgpIHtcbiAgICBsZXQgZnJhZ21lbnQgPSBsb2NhdGlvbi5oYXNoLnNsaWNlKDEpO1xuICAgIHJldHVybiBmcmFnbWVudC50b1N0cmluZygpLnJlcGxhY2UoL1xcLyQvLCAnJykucmVwbGFjZSgvXlxcLy8sICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIFVSTCBoYXNoIGZyYWdtZW50XG4gICAqIEBwYXJhbSBwYXRoXG4gICAqL1xuICBmdW5jdGlvbiB1cGRhdGVVUkxGcmFnbWVudChwYXRoKSB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBwYXRoO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplICAgICAgIDogaW5pdGlhbGl6ZSxcbiAgICBzdWJzY3JpYmUgICAgICAgIDogc3Vic2NyaWJlLFxuICAgIG5vdGlmeVN1YnNjcmliZXJzOiBub3RpZnlTdWJzY3JpYmVycyxcbiAgICBnZXRDdXJyZW50Um91dGUgIDogZ2V0Q3VycmVudFJvdXRlLFxuICAgIHNldCAgICAgICAgICAgICAgOiBzZXRcbiAgfTtcblxufTtcblxubGV0IHIgPSBSb3V0ZXIoKTtcbnIuaW5pdGlhbGl6ZSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHI7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIFJ4SlMgSGVscGVyc1xuICogQHR5cGUge3tkb206IEZ1bmN0aW9uLCBmcm9tOiBGdW5jdGlvbiwgaW50ZXJ2YWw6IEZ1bmN0aW9uLCBkb0V2ZXJ5OiBGdW5jdGlvbiwganVzdDogRnVuY3Rpb24sIGVtcHR5OiBGdW5jdGlvbn19XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGRvbTogZnVuY3Rpb24gKHNlbGVjdG9yLCBldmVudCkge1xuICAgIGxldCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGlmICghZWwpIHtcbiAgICAgIGNvbnNvbGUud2Fybignbm9yaS91dGlscy9SeCwgZG9tLCBpbnZhbGlkIERPTSBzZWxlY3RvcjogJyArIHNlbGVjdG9yKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGVsLCBldmVudC50cmltKCkpO1xuICB9LFxuXG4gIGZyb206IGZ1bmN0aW9uIChpdHRyKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuZnJvbShpdHRyKTtcbiAgfSxcblxuICBpbnRlcnZhbDogZnVuY3Rpb24gKG1zKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuaW50ZXJ2YWwobXMpO1xuICB9LFxuXG4gIGRvRXZlcnk6IGZ1bmN0aW9uIChtcywgLi4uYXJncykge1xuICAgIGlmKGlzLmZ1bmN0aW9uKGFyZ3NbMF0pKSB7XG4gICAgICByZXR1cm4gdGhpcy5pbnRlcnZhbChtcykuc3Vic2NyaWJlKGFyZ3NbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pbnRlcnZhbChtcykudGFrZShhcmdzWzBdKS5zdWJzY3JpYmUoYXJnc1sxXSk7XG4gIH0sXG5cbiAganVzdDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuanVzdCh2YWx1ZSk7XG4gIH0sXG5cbiAgZW1wdHk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5lbXB0eSgpO1xuICB9XG5cbn07IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKlxuIFNpbXBsZSB3cmFwcGVyIGZvciBVbmRlcnNjb3JlIC8gSFRNTCB0ZW1wbGF0ZXNcbiBNYXR0IFBlcmtpbnNcbiA0LzcvMTVcbiAqL1xubGV0IFRlbXBsYXRpbmcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF90ZW1wbGF0ZU1hcCAgICAgICA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBfdGVtcGxhdGVIVE1MQ2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgX3RlbXBsYXRlQ2FjaGUgICAgID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIF9ET01VdGlscyAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyk7XG5cbiAgZnVuY3Rpb24gYWRkVGVtcGxhdGUoaWQsIGh0bWwpIHtcbiAgICBfdGVtcGxhdGVNYXBbaWRdID0gaHRtbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNvdXJjZUZyb21UZW1wbGF0ZU1hcChpZCkge1xuICAgIGxldCBzb3VyY2UgPSBfdGVtcGxhdGVNYXBbaWRdO1xuICAgIGlmIChzb3VyY2UpIHtcbiAgICAgIHJldHVybiBjbGVhblRlbXBsYXRlSFRNTChzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTb3VyY2VGcm9tSFRNTChpZCkge1xuICAgIGxldCBzcmMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCksXG4gICAgICAgIHNyY2h0bWw7XG5cbiAgICBpZiAoc3JjKSB7XG4gICAgICBzcmNodG1sID0gc3JjLmlubmVySFRNTDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKCdudWRvcnUvY29yZS9UZW1wbGF0aW5nLCB0ZW1wbGF0ZSBub3QgZm91bmQ6IFwiJyArIGlkICsgJ1wiJyk7XG4gICAgICBzcmNodG1sID0gJzxkaXY+VGVtcGxhdGUgbm90IGZvdW5kOiAnICsgaWQgKyAnPC9kaXY+JztcbiAgICB9XG5cbiAgICByZXR1cm4gY2xlYW5UZW1wbGF0ZUhUTUwoc3JjaHRtbCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSB0ZW1wbGF0ZSBodG1sIGZyb20gdGhlIHNjcmlwdCB0YWcgd2l0aCBpZFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3VyY2UoaWQpIHtcbiAgICBpZiAoX3RlbXBsYXRlSFRNTENhY2hlW2lkXSkge1xuICAgICAgcmV0dXJuIF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF07XG4gICAgfVxuXG4gICAgbGV0IHNvdXJjZWh0bWwgPSBnZXRTb3VyY2VGcm9tVGVtcGxhdGVNYXAoaWQpO1xuXG4gICAgaWYgKCFzb3VyY2VodG1sKSB7XG4gICAgICBzb3VyY2VodG1sID0gZ2V0U291cmNlRnJvbUhUTUwoaWQpO1xuICAgIH1cblxuICAgIF90ZW1wbGF0ZUhUTUxDYWNoZVtpZF0gPSBzb3VyY2VodG1sO1xuICAgIHJldHVybiBzb3VyY2VodG1sO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYWxsIElEcyBiZWxvbmdpbmcgdG8gdGV4dC90ZW1wbGF0ZSB0eXBlIHNjcmlwdCB0YWdzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldEFsbFRlbXBsYXRlSURzKCkge1xuICAgIGxldCBzY3JpcHRUYWdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpLCAwKTtcblxuICAgIHJldHVybiBzY3JpcHRUYWdzLmZpbHRlcihmdW5jdGlvbiAodGFnKSB7XG4gICAgICByZXR1cm4gdGFnLmdldEF0dHJpYnV0ZSgndHlwZScpID09PSAndGV4dC90ZW1wbGF0ZSc7XG4gICAgfSkubWFwKGZ1bmN0aW9uICh0YWcpIHtcbiAgICAgIHJldHVybiB0YWcuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gdW5kZXJzY29yZSB0ZW1wbGF0ZVxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRUZW1wbGF0ZShpZCkge1xuICAgIGlmIChfdGVtcGxhdGVDYWNoZVtpZF0pIHtcbiAgICAgIHJldHVybiBfdGVtcGxhdGVDYWNoZVtpZF07XG4gICAgfVxuICAgIGxldCB0ZW1wbCAgICAgICAgICA9IF8udGVtcGxhdGUoZ2V0U291cmNlKGlkKSk7XG4gICAgX3RlbXBsYXRlQ2FjaGVbaWRdID0gdGVtcGw7XG4gICAgcmV0dXJuIHRlbXBsO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyB0aGUgdGVtcGxhdGUgYW5kIHJldHVybnMgSFRNTFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFzSFRNTChpZCwgb2JqKSB7XG4gICAgbGV0IHRlbXAgPSBnZXRUZW1wbGF0ZShpZCk7XG4gICAgcmV0dXJuIHRlbXAob2JqKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIGFuIEhUTUwgRWxlbWVudFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGFzRWxlbWVudChpZCwgb2JqKSB7XG4gICAgcmV0dXJuIF9ET01VdGlscy5IVE1MU3RyVG9Ob2RlKGFzSFRNTChpZCwgb2JqKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW5zIHRlbXBsYXRlIEhUTUxcbiAgICovXG4gIGZ1bmN0aW9uIGNsZWFuVGVtcGxhdGVIVE1MKHN0cikge1xuICAgIHJldHVybiBzdHIudHJpbSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSByZXR1cm5zLCBzcGFjZXMgYW5kIHRhYnNcbiAgICogQHBhcmFtIHN0clxuICAgKiBAcmV0dXJucyB7WE1MfHN0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZVdoaXRlU3BhY2Uoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oXFxyXFxufFxcbnxcXHJ8XFx0KS9nbSwgJycpLnJlcGxhY2UoLz5cXHMrPC9nLCAnPjwnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIG92ZXIgYWxsIHRlbXBsYXRlcywgY2xlYW4gdGhlbSB1cCBhbmQgbG9nXG4gICAqIFV0aWwgZm9yIFNoYXJlUG9pbnQgcHJvamVjdHMsIDxzY3JpcHQ+IGJsb2NrcyBhcmVuJ3QgYWxsb3dlZFxuICAgKiBTbyB0aGlzIGhlbHBzIGNyZWF0ZSB0aGUgYmxvY2tzIGZvciBpbnNlcnRpb24gaW4gdG8gdGhlIERPTVxuICAgKi9cbiAgZnVuY3Rpb24gcHJvY2Vzc0ZvckRPTUluc2VydGlvbigpIHtcbiAgICBsZXQgaWRzID0gZ2V0QWxsVGVtcGxhdGVJRHMoKTtcbiAgICBpZHMuZm9yRWFjaChpZCA9PiB7XG4gICAgICB2YXIgc3JjID0gcmVtb3ZlV2hpdGVTcGFjZShnZXRTb3VyY2UoaWQpKTtcbiAgICAgIGNvbnNvbGUubG9nKGlkLCBzcmMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHRlbXBsYXRlIHNjcmlwdCB0YWcgdG8gdGhlIERPTVxuICAgKiBVdGlsIGZvciBTaGFyZVBvaW50IHByb2plY3RzLCA8c2NyaXB0PiBibG9ja3MgYXJlbid0IGFsbG93ZWRcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBodG1sXG4gICAqL1xuICAvL2Z1bmN0aW9uIGFkZENsaWVudFNpZGVUZW1wbGF0ZVRvRE9NKGlkLCBodG1sKSB7XG4gIC8vICB2YXIgcyAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAvLyAgcy50eXBlICAgICAgPSAndGV4dC90ZW1wbGF0ZSc7XG4gIC8vICBzLmlkICAgICAgICA9IGlkO1xuICAvLyAgcy5pbm5lckhUTUwgPSBodG1sO1xuICAvLyAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChzKTtcbiAgLy99XG5cbiAgcmV0dXJuIHtcbiAgICBhZGRUZW1wbGF0ZSAgICAgICAgICAgOiBhZGRUZW1wbGF0ZSxcbiAgICBnZXRTb3VyY2UgICAgICAgICAgICAgOiBnZXRTb3VyY2UsXG4gICAgZ2V0QWxsVGVtcGxhdGVJRHMgICAgIDogZ2V0QWxsVGVtcGxhdGVJRHMsXG4gICAgcHJvY2Vzc0ZvckRPTUluc2VydGlvbjogcHJvY2Vzc0ZvckRPTUluc2VydGlvbixcbiAgICBnZXRUZW1wbGF0ZSAgICAgICAgICAgOiBnZXRUZW1wbGF0ZSxcbiAgICBhc0hUTUwgICAgICAgICAgICAgICAgOiBhc0hUTUwsXG4gICAgYXNFbGVtZW50ICAgICAgICAgICAgIDogYXNFbGVtZW50XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGluZygpOyIsIi8qIEBmbG93IHdlYWsgKi9cblxubGV0IEFwcGxpY2F0aW9uVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICBsZXQgX3RoaXMsXG4gICAgICBfdGVtcGxhdGUgPSByZXF1aXJlKCcuLi91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfZG9tVXRpbHMgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgSW5pdGlhbGl6YXRpb25cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVcbiAgICogQHBhcmFtIHNjYWZmb2xkVGVtcGxhdGVzIHRlbXBsYXRlIElEcyB0byBhdHRhY2hlZCB0byB0aGUgYm9keSBmb3IgdGhlIGFwcFxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZUFwcGxpY2F0aW9uVmlldyhzY2FmZm9sZFRlbXBsYXRlcykge1xuICAgIF90aGlzID0gdGhpcztcblxuICAgIGF0dGFjaEFwcGxpY2F0aW9uU2NhZmZvbGRpbmcoc2NhZmZvbGRUZW1wbGF0ZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGFjaCBhcHAgSFRNTCBzdHJ1Y3R1cmVcbiAgICogQHBhcmFtIHRlbXBsYXRlc1xuICAgKi9cbiAgZnVuY3Rpb24gYXR0YWNoQXBwbGljYXRpb25TY2FmZm9sZGluZyh0ZW1wbGF0ZXMpIHtcbiAgICBpZiAoIXRlbXBsYXRlcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBib2R5RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XG5cbiAgICB0ZW1wbGF0ZXMuZm9yRWFjaChmdW5jdGlvbiAodGVtcGwpIHtcbiAgICAgIGJvZHlFbC5hcHBlbmRDaGlsZChfZG9tVXRpbHMuSFRNTFN0clRvTm9kZShfdGVtcGxhdGUuZ2V0U291cmNlKHRlbXBsLCB7fSkpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZnRlciBhcHAgaW5pdGlhbGl6YXRpb24sIHJlbW92ZSB0aGUgbG9hZGluZyBtZXNzYWdlXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVMb2FkaW5nTWVzc2FnZSgpIHtcbiAgICBsZXQgY292ZXIgICA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbml0aWFsaXphdGlvbl9fY292ZXInKSxcbiAgICAgICAgbWVzc2FnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5pbml0aWFsaXphdGlvbl9fbWVzc2FnZScpO1xuXG4gICAgVHdlZW5MaXRlLnRvKGNvdmVyLCAxLCB7XG4gICAgICBhbHBoYTogMCwgZWFzZTogUXVhZC5lYXNlT3V0LCBvbkNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdmVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY292ZXIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgVHdlZW5MaXRlLnRvKG1lc3NhZ2UsIDIsIHtcbiAgICAgIHRvcDogXCIrPTUwcHhcIiwgZWFzZTogUXVhZC5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY292ZXIucmVtb3ZlQ2hpbGQobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXc6IGluaXRpYWxpemVBcHBsaWNhdGlvblZpZXcsXG4gICAgcmVtb3ZlTG9hZGluZ01lc3NhZ2UgICAgIDogcmVtb3ZlTG9hZGluZ01lc3NhZ2VcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvblZpZXcoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogTWl4aW4gdmlldyB0aGF0IGFsbG93cyBmb3IgY29tcG9uZW50IHZpZXdzXG4gKi9cblxubGV0IE1peGluQ29tcG9uZW50Vmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9jb21wb25lbnRWaWV3TWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAvKipcbiAgICogTWFwIGEgY29tcG9uZW50IHRvIGEgbW91bnRpbmcgcG9pbnQuIElmIGEgc3RyaW5nIGlzIHBhc3NlZCxcbiAgICogdGhlIGNvcnJlY3Qgb2JqZWN0IHdpbGwgYmUgY3JlYXRlZCBmcm9tIHRoZSBmYWN0b3J5IG1ldGhvZCwgb3RoZXJ3aXNlLFxuICAgKiB0aGUgcGFzc2VkIGNvbXBvbmVudCBvYmplY3QgaXMgdXNlZC5cbiAgICpcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqIEBwYXJhbSBtb3VudFBvaW50XG4gICAqL1xuICBmdW5jdGlvbiBtYXBWaWV3Q29tcG9uZW50KGNvbXBvbmVudElELCBjb21wb25lbnRJRG9yT2JqLCBtb3VudFBvaW50KSB7XG4gICAgbGV0IGNvbXBvbmVudE9iajtcblxuICAgIGlmICh0eXBlb2YgY29tcG9uZW50SURvck9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBjb21wb25lbnRGYWN0b3J5ID0gcmVxdWlyZShjb21wb25lbnRJRG9yT2JqKTtcbiAgICAgIGNvbXBvbmVudE9iaiAgICAgICAgID0gY3JlYXRlQ29tcG9uZW50Vmlldyhjb21wb25lbnRGYWN0b3J5KCkpKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudE9iaiA9IGNvbXBvbmVudElEb3JPYmo7XG4gICAgfVxuXG4gICAgX2NvbXBvbmVudFZpZXdNYXBbY29tcG9uZW50SURdID0ge1xuICAgICAgY29udHJvbGxlcjogY29tcG9uZW50T2JqLFxuICAgICAgbW91bnRQb2ludDogbW91bnRQb2ludFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmFjdG9yeSB0byBjcmVhdGUgY29tcG9uZW50IHZpZXcgbW9kdWxlcyBieSBjb25jYXRpbmcgbXVsdGlwbGUgc291cmNlIG9iamVjdHNcbiAgICogQHBhcmFtIGNvbXBvbmVudFNvdXJjZSBDdXN0b20gbW9kdWxlIHNvdXJjZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudFZpZXcoY29tcG9uZW50U291cmNlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChjb25maWdQcm9wcykge1xuICAgICAgY29uc3QgY29tcG9uZW50Vmlld0ZhY3RvcnkgID0gcmVxdWlyZSgnLi9WaWV3Q29tcG9uZW50LmpzJyksXG4gICAgICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkgPSByZXF1aXJlKCcuL01peGluRXZlbnREZWxlZ2F0b3IuanMnKSxcbiAgICAgICAgICAgIG9ic2VydmFibGVGYWN0b3J5ICAgICA9IHJlcXVpcmUoJy4uL3V0aWxzL01peGluT2JzZXJ2YWJsZVN1YmplY3QuanMnKSxcbiAgICAgICAgICAgIHN0YXRlT2JqRmFjdG9yeSAgICAgICA9IHJlcXVpcmUoJy4uL3N0b3JlL0ltbXV0YWJsZU1hcC5qcycpO1xuXG4gICAgICBsZXQgY29tcG9uZW50QXNzZW1ibHksIGZpbmFsQ29tcG9uZW50LCBwcmV2aW91c0luaXRpYWxpemU7XG5cbiAgICAgIGNvbXBvbmVudEFzc2VtYmx5ID0gW1xuICAgICAgICBjb21wb25lbnRWaWV3RmFjdG9yeSgpLFxuICAgICAgICBldmVudERlbGVnYXRvckZhY3RvcnkoKSxcbiAgICAgICAgb2JzZXJ2YWJsZUZhY3RvcnkoKSxcbiAgICAgICAgc3RhdGVPYmpGYWN0b3J5KCksXG4gICAgICAgIGNvbXBvbmVudFNvdXJjZVxuICAgICAgXTtcblxuICAgICAgaWYgKGNvbXBvbmVudFNvdXJjZS5taXhpbnMpIHtcbiAgICAgICAgY29tcG9uZW50QXNzZW1ibHkgPSBjb21wb25lbnRBc3NlbWJseS5jb25jYXQoY29tcG9uZW50U291cmNlLm1peGlucyk7XG4gICAgICB9XG5cbiAgICAgIGZpbmFsQ29tcG9uZW50ID0gTm9yaS5hc3NpZ25BcnJheSh7fSwgY29tcG9uZW50QXNzZW1ibHkpO1xuXG4gICAgICAvLyBDb21wb3NlIGEgbmV3IGluaXRpYWxpemUgZnVuY3Rpb24gYnkgaW5zZXJ0aW5nIGNhbGwgdG8gY29tcG9uZW50IHN1cGVyIG1vZHVsZVxuICAgICAgcHJldmlvdXNJbml0aWFsaXplICAgICAgICA9IGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemU7XG4gICAgICBmaW5hbENvbXBvbmVudC5pbml0aWFsaXplID0gZnVuY3Rpb24gaW5pdGlhbGl6ZShpbml0T2JqKSB7XG4gICAgICAgIGZpbmFsQ29tcG9uZW50LmluaXRpYWxpemVDb21wb25lbnQoaW5pdE9iaik7XG4gICAgICAgIHByZXZpb3VzSW5pdGlhbGl6ZS5jYWxsKGZpbmFsQ29tcG9uZW50LCBpbml0T2JqKTtcbiAgICAgIH07XG5cbiAgICAgIGlmIChjb25maWdQcm9wcykge1xuICAgICAgICBmaW5hbENvbXBvbmVudC5jb25maWd1cmF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBjb25maWdQcm9wcztcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIF8uYXNzaWduKHt9LCBmaW5hbENvbXBvbmVudCk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG93IGEgbWFwcGVkIGNvbXBvbmVudFZpZXdcbiAgICogQHBhcmFtIGNvbXBvbmVudElEXG4gICAqIEBwYXJhbSBkYXRhT2JqXG4gICAqL1xuICBmdW5jdGlvbiBzaG93Vmlld0NvbXBvbmVudChjb21wb25lbnRJRCwgbW91bnRQb2ludCkge1xuICAgIGxldCBjb21wb25lbnRWaWV3ID0gX2NvbXBvbmVudFZpZXdNYXBbY29tcG9uZW50SURdO1xuICAgIGlmICghY29tcG9uZW50Vmlldykge1xuICAgICAgY29uc29sZS53YXJuKCdObyBjb21wb25lbnRWaWV3IG1hcHBlZCBmb3IgaWQ6ICcgKyBjb21wb25lbnRJRCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIuaXNJbml0aWFsaXplZCgpKSB7XG4gICAgICBtb3VudFBvaW50ID0gbW91bnRQb2ludCB8fCBjb21wb25lbnRWaWV3Lm1vdW50UG9pbnQ7XG4gICAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIuaW5pdGlhbGl6ZSh7XG4gICAgICAgIGlkICAgICAgICA6IGNvbXBvbmVudElELFxuICAgICAgICB0ZW1wbGF0ZSAgOiBjb21wb25lbnRWaWV3Lmh0bWxUZW1wbGF0ZSxcbiAgICAgICAgbW91bnRQb2ludDogbW91bnRQb2ludFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudFZpZXcuY29udHJvbGxlci51cGRhdGUoKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnRWaWV3LmNvbnRyb2xsZXIuY29tcG9uZW50UmVuZGVyKCk7XG4gICAgY29tcG9uZW50Vmlldy5jb250cm9sbGVyLm1vdW50KCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGNvcHkgb2YgdGhlIG1hcCBvYmplY3QgZm9yIGNvbXBvbmVudCB2aWV3c1xuICAgKiBAcmV0dXJucyB7bnVsbH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbXBvbmVudFZpZXdNYXAoKSB7XG4gICAgcmV0dXJuIF8uYXNzaWduKHt9LCBfY29tcG9uZW50Vmlld01hcCk7XG4gIH1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gIEFQSVxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZXR1cm4ge1xuICAgIG1hcFZpZXdDb21wb25lbnQgICA6IG1hcFZpZXdDb21wb25lbnQsXG4gICAgY3JlYXRlQ29tcG9uZW50VmlldzogY3JlYXRlQ29tcG9uZW50VmlldyxcbiAgICBzaG93Vmlld0NvbXBvbmVudCAgOiBzaG93Vmlld0NvbXBvbmVudCxcbiAgICBnZXRDb21wb25lbnRWaWV3TWFwOiBnZXRDb21wb25lbnRWaWV3TWFwXG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5Db21wb25lbnRWaWV3cygpOyIsImxldCBNaXhpbkRPTU1hbmlwdWxhdGlvbiA9IGZ1bmN0aW9uICgpIHtcblxuICBmdW5jdGlvbiBoaWRlRWwoc2VsZWN0b3IpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpLCB7XG4gICAgICBhbHBoYSAgOiAwLFxuICAgICAgZGlzcGxheTogJ25vbmUnXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaG93RWwoc2VsZWN0b3IpIHtcbiAgICBUd2VlbkxpdGUuc2V0KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpLCB7XG4gICAgICBhbHBoYSAgOiAxLFxuICAgICAgZGlzcGxheTogJ2Jsb2NrJ1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzaG93RWw6IHNob3dFbCxcbiAgICBoaWRlRWw6IGhpZGVFbFxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1peGluRE9NTWFuaXB1bGF0aW9uKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIENvbnZlbmllbmNlIG1peGluIHRoYXQgbWFrZXMgZXZlbnRzIGVhc2llciBmb3Igdmlld3NcbiAqXG4gKiBCYXNlZCBvbiBCYWNrYm9uZVxuICogUmV2aWV3IHRoaXMgaHR0cDovL2Jsb2cubWFyaW9uZXR0ZWpzLmNvbS8yMDE1LzAyLzEyL3VuZGVyc3RhbmRpbmctdGhlLWV2ZW50LWhhc2gvaW5kZXguaHRtbFxuICpcbiAqIEV4YW1wbGU6XG4gKiB0aGlzLnNldEV2ZW50cyh7XG4gKiAgICAgICAgJ2NsaWNrICNidG5fbWFpbl9wcm9qZWN0cyc6IGhhbmRsZVByb2plY3RzQnV0dG9uLFxuICogICAgICAgICdjbGljayAjYnRuX2ZvbywgY2xpY2sgI2J0bl9iYXInOiBoYW5kbGVGb29CYXJCdXR0b25zXG4gKiAgICAgIH0pO1xuICogdGhpcy5kZWxlZ2F0ZUV2ZW50cygpO1xuICpcbiAqL1xuXG5cbmxldCBNaXhpbkV2ZW50RGVsZWdhdG9yID0gZnVuY3Rpb24gKCkge1xuXG4gIGxldCBfZXZlbnRzTWFwLFxuICAgICAgX2V2ZW50U3Vic2NyaWJlcnM7XG5cbiAgY29uc3QgX3J4ICAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvUngnKSxcbiAgICAgICAgX2Jyb3dzZXJJbmZvID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKSxcbiAgICAgICAgaXMgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L3V0aWwvaXMuanMnKTtcblxuICBmdW5jdGlvbiBzZXRFdmVudHMoZXZ0T2JqKSB7XG4gICAgX2V2ZW50c01hcCA9IGV2dE9iajtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEV2ZW50cygpIHtcbiAgICByZXR1cm4gX2V2ZW50c01hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdXRvbWF0ZXMgc2V0dGluZyBldmVudHMgb24gRE9NIGVsZW1lbnRzLlxuICAgKiAnZXZ0U3RyIHNlbGVjdG9yJzpjYWxsYmFja1xuICAgKiAnZXZ0U3RyIHNlbGVjdG9yLCBldnRTdHIgc2VsZWN0b3InOiBzaGFyZWRDYWxsYmFja1xuICAgKi9cbiAgZnVuY3Rpb24gZGVsZWdhdGVFdmVudHMoYXV0b0Zvcm0pIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfZXZlbnRTdWJzY3JpYmVycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKHZhciBldnRTdHJpbmdzIGluIF9ldmVudHNNYXApIHtcbiAgICAgIGlmIChfZXZlbnRzTWFwLmhhc093blByb3BlcnR5KGV2dFN0cmluZ3MpKSB7XG5cbiAgICAgICAgbGV0IG1hcHBpbmdzICAgICA9IGV2dFN0cmluZ3Muc3BsaXQoJywnKSxcbiAgICAgICAgICAgIGV2ZW50SGFuZGxlciA9IF9ldmVudHNNYXBbZXZ0U3RyaW5nc107XG5cbiAgICAgICAgaWYgKCFpcy5mdW5jKGV2ZW50SGFuZGxlcikpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ0V2ZW50RGVsZWdhdG9yLCBoYW5kbGVyIGZvciAnICsgZXZ0U3RyaW5ncyArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgICAgLy8gaHR0cHM6Ly9qc2xpbnRlcnJvcnMuY29tL2RvbnQtbWFrZS1mdW5jdGlvbnMtd2l0aGluLWEtbG9vcFxuICAgICAgICBtYXBwaW5ncy5mb3JFYWNoKGV2dE1hcCA9PiB7XG4gICAgICAgICAgZXZ0TWFwID0gZXZ0TWFwLnRyaW0oKTtcblxuICAgICAgICAgIGxldCBldmVudFN0ciA9IGV2dE1hcC5zcGxpdCgnICcpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgICAgc2VsZWN0b3IgPSBldnRNYXAuc3BsaXQoJyAnKVsxXS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoX2Jyb3dzZXJJbmZvLm1vYmlsZS5hbnkoKSkge1xuICAgICAgICAgICAgZXZlbnRTdHIgPSBjb252ZXJ0TW91c2VUb1RvdWNoRXZlbnRTdHIoZXZlbnRTdHIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF9ldmVudFN1YnNjcmliZXJzW2V2dFN0cmluZ3NdID0gY3JlYXRlSGFuZGxlcihzZWxlY3RvciwgZXZlbnRTdHIsIGV2ZW50SGFuZGxlciwgYXV0b0Zvcm0pO1xuICAgICAgICB9KTtcbiAgICAgICAgLyoganNoaW50ICtXMDgzICovXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBjb21tb24gbW91c2UgZXZlbnRzIHRvIHRvdWNoIGVxdWl2YWxlbnRzXG4gICAqIEBwYXJhbSBldmVudFN0clxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGNvbnZlcnRNb3VzZVRvVG91Y2hFdmVudFN0cihldmVudFN0cikge1xuICAgIHN3aXRjaCAoZXZlbnRTdHIpIHtcbiAgICAgIGNhc2UoJ2NsaWNrJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vkb3duJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hzdGFydCc7XG4gICAgICBjYXNlKCdtb3VzZXVwJyk6XG4gICAgICAgIHJldHVybiAndG91Y2hlbmQnO1xuICAgICAgY2FzZSgnbW91c2Vtb3ZlJyk6XG4gICAgICAgIHJldHVybiAndG91Y2htb3ZlJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBldmVudFN0cjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBldmVudFN0ciwgZXZlbnRIYW5kbGVyLCBhdXRvRm9ybSkge1xuICAgIGxldCBvYnNlcnZhYmxlID0gX3J4LmRvbShzZWxlY3RvciwgZXZlbnRTdHIpLFxuICAgICAgICBlbCAgICAgICAgID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvciksXG4gICAgICAgIHRhZyAgICAgICAgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIHR5cGUgICAgICAgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcblxuICAgIGlmIChhdXRvRm9ybSkge1xuICAgICAgaWYgKHRhZyA9PT0gJ2lucHV0JyB8fCB0YWcgPT09ICd0ZXh0YXJlYScpIHtcbiAgICAgICAgaWYgKCF0eXBlIHx8IHR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICAgIGlmIChldmVudFN0ciA9PT0gJ2JsdXInIHx8IGV2ZW50U3RyID09PSAnZm9jdXMnKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZS5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnRTdHIgPT09ICdrZXl1cCcgfHwgZXZlbnRTdHIgPT09ICdrZXlkb3duJykge1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmFibGUudGhyb3R0bGUoMTAwKS5tYXAoZXZ0ID0+IGV2dC50YXJnZXQudmFsdWUpLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAncmFkaW8nIHx8IHR5cGUgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICBpZiAoZXZlbnRTdHIgPT09ICdjbGljaycpIHtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZhYmxlLm1hcChldnQgPT4gZXZ0LnRhcmdldC5jaGVja2VkKS5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGFnID09PSAnc2VsZWN0Jykge1xuICAgICAgICBpZiAoZXZlbnRTdHIgPT09ICdjaGFuZ2UnKSB7XG4gICAgICAgICAgcmV0dXJuIG9ic2VydmFibGUubWFwKGV2dCA9PiBldnQudGFyZ2V0LnZhbHVlKS5zdWJzY3JpYmUoZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYnNlcnZhYmxlLnN1YnNjcmliZShldmVudEhhbmRsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFubHkgcmVtb3ZlIGV2ZW50c1xuICAgKi9cbiAgZnVuY3Rpb24gdW5kZWxlZ2F0ZUV2ZW50cygpIHtcbiAgICBpZiAoIV9ldmVudHNNYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBldmVudCBpbiBfZXZlbnRTdWJzY3JpYmVycykge1xuICAgICAgX2V2ZW50U3Vic2NyaWJlcnNbZXZlbnRdLmRpc3Bvc2UoKTtcbiAgICAgIGRlbGV0ZSBfZXZlbnRTdWJzY3JpYmVyc1tldmVudF07XG4gICAgfVxuXG4gICAgX2V2ZW50U3Vic2NyaWJlcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRFdmVudHMgICAgICAgOiBzZXRFdmVudHMsXG4gICAgZ2V0RXZlbnRzICAgICAgIDogZ2V0RXZlbnRzLFxuICAgIHVuZGVsZWdhdGVFdmVudHM6IHVuZGVsZWdhdGVFdmVudHMsXG4gICAgZGVsZWdhdGVFdmVudHMgIDogZGVsZWdhdGVFdmVudHNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbkV2ZW50RGVsZWdhdG9yOyIsIi8qIEBmbG93IHdlYWsgKi9cblxubGV0IE1peGluTnVkb3J1Q29udHJvbHMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgY29uc3QgX25vdGlmaWNhdGlvblZpZXcgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2NvbXBvbmVudHMvVG9hc3RWaWV3LmpzJyksXG4gICAgICAgIF90b29sVGlwVmlldyAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL1Rvb2xUaXBWaWV3LmpzJyksXG4gICAgICAgIF9tZXNzYWdlQm94VmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hWaWV3LmpzJyksXG4gICAgICAgIF9tZXNzYWdlQm94Q3JlYXRvciA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01lc3NhZ2VCb3hDcmVhdG9yLmpzJyksXG4gICAgICAgIF9tb2RhbENvdmVyVmlldyAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9jb21wb25lbnRzL01vZGFsQ292ZXJWaWV3LmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZU51ZG9ydUNvbnRyb2xzKCkge1xuICAgIF90b29sVGlwVmlldy5pbml0aWFsaXplKCd0b29sdGlwX19jb250YWluZXInKTtcbiAgICBfbm90aWZpY2F0aW9uVmlldy5pbml0aWFsaXplKCd0b2FzdF9fY29udGFpbmVyJyk7XG4gICAgX21lc3NhZ2VCb3hWaWV3LmluaXRpYWxpemUoJ21lc3NhZ2Vib3hfX2NvbnRhaW5lcicpO1xuICAgIF9tb2RhbENvdmVyVmlldy5pbml0aWFsaXplKCk7XG4gIH1cblxuICBmdW5jdGlvbiBtYkNyZWF0b3IoKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Q3JlYXRvcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZE1lc3NhZ2VCb3gob2JqKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZU1lc3NhZ2VCb3goaWQpIHtcbiAgICBfbWVzc2FnZUJveFZpZXcucmVtb3ZlKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFsZXJ0KG1lc3NhZ2UsIHRpdGxlKSB7XG4gICAgcmV0dXJuIG1iQ3JlYXRvcigpLmFsZXJ0KHRpdGxlIHx8ICdBbGVydCcsIG1lc3NhZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTm90aWZpY2F0aW9uKG9iaikge1xuICAgIHJldHVybiBfbm90aWZpY2F0aW9uVmlldy5hZGQob2JqKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vdGlmeShtZXNzYWdlLCB0aXRsZSwgdHlwZSkge1xuICAgIHJldHVybiBhZGROb3RpZmljYXRpb24oe1xuICAgICAgdGl0bGUgIDogdGl0bGUgfHwgJycsXG4gICAgICB0eXBlICAgOiB0eXBlIHx8IF9ub3RpZmljYXRpb25WaWV3LnR5cGUoKS5ERUZBVUxULFxuICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplTnVkb3J1Q29udHJvbHM6IGluaXRpYWxpemVOdWRvcnVDb250cm9scyxcbiAgICBtYkNyZWF0b3IgICAgICAgICAgICAgICA6IG1iQ3JlYXRvcixcbiAgICBhZGRNZXNzYWdlQm94ICAgICAgICAgICA6IGFkZE1lc3NhZ2VCb3gsXG4gICAgcmVtb3ZlTWVzc2FnZUJveCAgICAgICAgOiByZW1vdmVNZXNzYWdlQm94LFxuICAgIGFkZE5vdGlmaWNhdGlvbiAgICAgICAgIDogYWRkTm90aWZpY2F0aW9uLFxuICAgIGFsZXJ0ICAgICAgICAgICAgICAgICAgIDogYWxlcnQsXG4gICAgbm90aWZ5ICAgICAgICAgICAgICAgICAgOiBub3RpZnlcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbk51ZG9ydUNvbnRyb2xzKCk7IiwiLyogQGZsb3cgd2VhayAqL1xuXG4vKipcbiAqIE1peGluIHZpZXcgdGhhdCBhbGxvd3MgZm9yIGNvbXBvbmVudCB2aWV3cyB0byBiZSBkaXNwbGF5IG9uIHN0b3JlIHN0YXRlIGNoYW5nZXNcbiAqL1xuXG5sZXQgTWl4aW5TdG9yZVN0YXRlVmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF90aGlzLFxuICAgICAgX3dhdGNoZWRTdG9yZSxcbiAgICAgIF9jdXJyZW50Vmlld0lELFxuICAgICAgX2N1cnJlbnRTdG9yZVN0YXRlLFxuICAgICAgX3N0YXRlVmlld01vdW50UG9pbnQsXG4gICAgICBfc3RhdGVWaWV3SURNYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgbGlzdGVuZXJzXG4gICAqL1xuICBmdW5jdGlvbiBpbml0aWFsaXplU3RhdGVWaWV3cyhzdG9yZSkge1xuICAgIF90aGlzID0gdGhpczsgLy8gbWl0aWdhdGlvbiwgRHVlIHRvIGV2ZW50cywgc2NvcGUgbWF5IGJlIHNldCB0byB0aGUgd2luZG93IG9iamVjdFxuICAgIF93YXRjaGVkU3RvcmUgPSBzdG9yZTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndmlld0NoYW5nZScpO1xuXG4gICAgX3dhdGNoZWRTdG9yZS5zdWJzY3JpYmUoZnVuY3Rpb24gb25TdGF0ZUNoYW5nZSgpIHtcbiAgICAgIGhhbmRsZVN0YXRlQ2hhbmdlKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2hvdyByb3V0ZSBmcm9tIFVSTCBoYXNoIG9uIGNoYW5nZVxuICAgKiBAcGFyYW0gcm91dGVPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZVN0YXRlQ2hhbmdlKCkge1xuICAgIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dWaWV3Rm9yQ3VycmVudFN0b3JlU3RhdGUoKSB7XG4gICAgbGV0IHN0YXRlID0gX3dhdGNoZWRTdG9yZS5nZXRTdGF0ZSgpLmN1cnJlbnRTdGF0ZTtcbiAgICBpZiAoc3RhdGUpIHtcbiAgICAgIGlmIChzdGF0ZSAhPT0gX2N1cnJlbnRTdG9yZVN0YXRlKSB7XG4gICAgICAgIF9jdXJyZW50U3RvcmVTdGF0ZSA9IHN0YXRlO1xuICAgICAgICBzaG93U3RhdGVWaWV3Q29tcG9uZW50LmJpbmQoX3RoaXMpKF9jdXJyZW50U3RvcmVTdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgbG9jYXRpb24gZm9yIHRoZSB2aWV3IHRvIG1vdW50IG9uIHJvdXRlIGNoYW5nZXMsIGFueSBjb250ZW50cyB3aWxsXG4gICAqIGJlIHJlbW92ZWQgcHJpb3JcbiAgICogQHBhcmFtIGVsSURcbiAgICovXG4gIGZ1bmN0aW9uIHNldFZpZXdNb3VudFBvaW50KGVsSUQpIHtcbiAgICBfc3RhdGVWaWV3TW91bnRQb2ludCA9IGVsSUQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRWaWV3TW91bnRQb2ludCgpIHtcbiAgICByZXR1cm4gX3N0YXRlVmlld01vdW50UG9pbnQ7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGEgcm91dGUgdG8gYSBtb2R1bGUgdmlldyBjb250cm9sbGVyXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUlEXG4gICAqIEBwYXJhbSBjb21wb25lbnRJRG9yT2JqXG4gICAqL1xuICBmdW5jdGlvbiBtYXBTdGF0ZVRvVmlld0NvbXBvbmVudChzdGF0ZSwgdGVtcGxhdGVJRCwgY29tcG9uZW50SURvck9iaikge1xuICAgIF9zdGF0ZVZpZXdJRE1hcFtzdGF0ZV0gPSB0ZW1wbGF0ZUlEO1xuICAgIHRoaXMubWFwVmlld0NvbXBvbmVudCh0ZW1wbGF0ZUlELCBjb21wb25lbnRJRG9yT2JqLCBfc3RhdGVWaWV3TW91bnRQb2ludCk7XG4gIH1cblxuICAvKipcbiAgICogU2hvdyBhIHZpZXcgKGluIHJlc3BvbnNlIHRvIGEgcm91dGUgY2hhbmdlKVxuICAgKiBAcGFyYW0gc3RhdGVcbiAgICovXG4gIGZ1bmN0aW9uIHNob3dTdGF0ZVZpZXdDb21wb25lbnQoc3RhdGUpIHtcbiAgICBsZXQgY29tcG9uZW50SUQgPSBfc3RhdGVWaWV3SURNYXBbc3RhdGVdO1xuICAgIGlmICghY29tcG9uZW50SUQpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIk5vIHZpZXcgbWFwcGVkIGZvciByb3V0ZTogXCIgKyBzdGF0ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmVtb3ZlQ3VycmVudFZpZXcoKTtcblxuICAgIF9jdXJyZW50Vmlld0lEID0gY29tcG9uZW50SUQ7XG4gICAgdGhpcy5zaG93Vmlld0NvbXBvbmVudChfY3VycmVudFZpZXdJRCk7XG5cbiAgICAvLyBUcmFuc2l0aW9uIG5ldyB2aWV3IGluXG4gICAgVHdlZW5MaXRlLnNldChfc3RhdGVWaWV3TW91bnRQb2ludCwge2FscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9zdGF0ZVZpZXdNb3VudFBvaW50LCAwLjI1LCB7YWxwaGE6IDEsIGVhc2U6IFF1YWQuZWFzZUlufSk7XG5cbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3ZpZXdDaGFuZ2UnLCBjb21wb25lbnRJRCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBjdXJyZW50bHkgZGlzcGxheWVkIHZpZXdcbiAgICovXG4gIGZ1bmN0aW9uIHJlbW92ZUN1cnJlbnRWaWV3KCkge1xuICAgIGlmIChfY3VycmVudFZpZXdJRCkge1xuICAgICAgX3RoaXMuZ2V0Q29tcG9uZW50Vmlld01hcCgpW19jdXJyZW50Vmlld0lEXS5jb250cm9sbGVyLnVubW91bnQoKTtcbiAgICB9XG4gICAgX2N1cnJlbnRWaWV3SUQgPSAnJztcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZVN0YXRlVmlld3MgICAgICAgIDogaW5pdGlhbGl6ZVN0YXRlVmlld3MsXG4gICAgc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZTogc2hvd1ZpZXdGb3JDdXJyZW50U3RvcmVTdGF0ZSxcbiAgICBzaG93U3RhdGVWaWV3Q29tcG9uZW50ICAgICAgOiBzaG93U3RhdGVWaWV3Q29tcG9uZW50LFxuICAgIHNldFZpZXdNb3VudFBvaW50ICAgICAgICAgICA6IHNldFZpZXdNb3VudFBvaW50LFxuICAgIGdldFZpZXdNb3VudFBvaW50ICAgICAgICAgICA6IGdldFZpZXdNb3VudFBvaW50LFxuICAgIG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50ICAgICA6IG1hcFN0YXRlVG9WaWV3Q29tcG9uZW50XG4gIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWl4aW5TdG9yZVN0YXRlVmlld3MoKTsiLCIvKiBAZmxvdyB3ZWFrICovXG5cbi8qKlxuICogQmFzZSBtb2R1bGUgZm9yIGNvbXBvbmVudHNcbiAqIE11c3QgYmUgZXh0ZW5kZWQgd2l0aCBjdXN0b20gbW9kdWxlc1xuICovXG5cbmNvbnN0IF90ZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3V0aWxzL1RlbXBsYXRpbmcuanMnKTtcblxudmFyIFZpZXdDb21wb25lbnQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgbGV0IF9pc0luaXRpYWxpemVkID0gZmFsc2UsXG4gICAgICBfY29uZmlnUHJvcHMsXG4gICAgICBfaWQsXG4gICAgICBfdGVtcGxhdGVPYmpDYWNoZSxcbiAgICAgIF9odG1sLFxuICAgICAgX0RPTUVsZW1lbnQsXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF9yZWdpb25zICAgICAgID0ge30sXG4gICAgICBfaXNNb3VudGVkICAgICA9IGZhbHNlLFxuICAgICAgX3JlbmRlcmVyICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9SZW5kZXJlcicpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXphdGlvblxuICAgKiBAcGFyYW0gY29uZmlnUHJvcHNcbiAgICovXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVDb21wb25lbnQoY29uZmlnUHJvcHMpIHtcbiAgICBfY29uZmlnUHJvcHMgPSB0aGlzLmNvbmZpZ3VyYXRpb24oKSB8fCBjb25maWdQcm9wcztcbiAgICBfaWQgICAgICAgICAgPSBfY29uZmlnUHJvcHMuaWQ7XG4gICAgX21vdW50UG9pbnQgID0gX2NvbmZpZ1Byb3BzLm1vdW50UG9pbnQ7XG5cbiAgICB0aGlzLnNldFN0YXRlKHRoaXMuZ2V0SW5pdGlhbFN0YXRlKCkpO1xuICAgIHRoaXMuc2V0RXZlbnRzKHRoaXMuZGVmaW5lRXZlbnRzKCkpO1xuXG4gICAgX3JlZ2lvbnMgPSB0aGlzLmRlZmluZVJlZ2lvbnMoKTtcblxuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndXBkYXRlJyk7XG4gICAgdGhpcy5jcmVhdGVTdWJqZWN0KCdtb3VudCcpO1xuICAgIHRoaXMuY3JlYXRlU3ViamVjdCgndW5tb3VudCcpO1xuXG4gICAgdGhpcy5pbml0aWFsaXplUmVnaW9ucygpO1xuXG4gICAgX2lzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJhdGlvbigpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVmaW5lRXZlbnRzKCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQmluZCB1cGRhdGVzIHRvIHRoZSBtYXAgSUQgdG8gdGhpcyB2aWV3J3MgdXBkYXRlXG4gICAqIEBwYXJhbSBtYXBPYmogT2JqZWN0IHRvIHN1YnNjcmliZSB0byBvciBJRC4gU2hvdWxkIGltcGxlbWVudCBub3JpL3N0b3JlL01peGluT2JzZXJ2YWJsZVN0b3JlXG4gICAqL1xuICBmdW5jdGlvbiBiaW5kTWFwKG1hcE9iaikge1xuICAgIGlmICghaXMuZnVuY3Rpb24obWFwT2JqLnN1YnNjcmliZSkpIHtcbiAgICAgIGNvbnNvbGUud2FybignVmlld0NvbXBvbmVudCBiaW5kTWFwLCBtdXN0IGJlIG9ic2VydmFibGU6ICcgKyBtYXBPYmopO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG1hcE9iai5zdWJzY3JpYmUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogQmVmb3JlIHRoZSB2aWV3IHVwZGF0ZXMgYW5kIGEgcmVyZW5kZXIgb2NjdXJzXG4gICAqIFJldHVybnMgbmV4dFN0YXRlIG9mIGNvbXBvbmVudFxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVwZGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGxldCBuZXh0U3RhdGUgICAgPSB0aGlzLmNvbXBvbmVudFdpbGxVcGRhdGUoKTtcblxuICAgIGlmICh0aGlzLnNob3VsZENvbXBvbmVudFVwZGF0ZShuZXh0U3RhdGUpKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKG5leHRTdGF0ZSk7XG5cbiAgICAgIGlmIChfaXNNb3VudGVkKSB7XG4gICAgICAgIHRoaXMudW5tb3VudCgpO1xuICAgICAgICB0aGlzLmNvbXBvbmVudFJlbmRlcigpO1xuICAgICAgICB0aGlzLm1vdW50KCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudXBkYXRlUmVnaW9ucygpO1xuXG4gICAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3VwZGF0ZScsIHRoaXMuZ2V0SUQoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbXBhcmUgY3VycmVudCBzdGF0ZSBhbmQgbmV4dCBzdGF0ZSB0byBkZXRlcm1pbmUgaWYgdXBkYXRpbmcgc2hvdWxkIG9jY3VyXG4gICAqIEBwYXJhbSBuZXh0U3RhdGVcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBzaG91bGRDb21wb25lbnRVcGRhdGUobmV4dFN0YXRlKSB7XG4gICAgcmV0dXJuIGlzLmV4aXN0eShuZXh0U3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBpdCwgbmVlZCB0byBhZGQgaXQgdG8gYSBwYXJlbnQgY29udGFpbmVyLCBoYW5kbGVkIGluIGhpZ2hlciBsZXZlbCB2aWV3XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50UmVuZGVyKCkge1xuICAgIGlmICghX3RlbXBsYXRlT2JqQ2FjaGUpIHtcbiAgICAgIF90ZW1wbGF0ZU9iakNhY2hlID0gdGhpcy50ZW1wbGF0ZSgpO1xuICAgIH1cblxuICAgIF9odG1sID0gdGhpcy5yZW5kZXIodGhpcy5nZXRTdGF0ZSgpKTtcblxuICAgIHRoaXMucmVuZGVyUmVnaW9ucygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBMb2Rhc2ggY2xpZW50IHNpZGUgdGVtcGxhdGUgZnVuY3Rpb24gYnkgZ2V0dGluZyB0aGUgSFRNTCBzb3VyY2UgZnJvbVxuICAgKiB0aGUgbWF0Y2hpbmcgPHNjcmlwdCB0eXBlPSd0ZXh0L3RlbXBsYXRlJz4gdGFnIGluIHRoZSBkb2N1bWVudC4gT1IgeW91IG1heVxuICAgKiBzcGVjaWZ5IHRoZSBjdXN0b20gSFRNTCB0byB1c2UgaGVyZS5cbiAgICpcbiAgICogVGhlIG1ldGhvZCBpcyBjYWxsZWQgb25seSBvbiB0aGUgZmlyc3QgcmVuZGVyIGFuZCBjYWNoZWQgdG8gc3BlZWQgdXAgcmVuZGVyc1xuICAgKlxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAqL1xuICBmdW5jdGlvbiB0ZW1wbGF0ZSgpIHtcbiAgICAvLyBhc3N1bWVzIHRoZSB0ZW1wbGF0ZSBJRCBtYXRjaGVzIHRoZSBjb21wb25lbnQncyBJRCBhcyBwYXNzZWQgb24gaW5pdGlhbGl6ZVxuICAgIGxldCBodG1sID0gX3RlbXBsYXRlLmdldFNvdXJjZSh0aGlzLmdldElEKCkpO1xuICAgIHJldHVybiBfLnRlbXBsYXRlKGh0bWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1heSBiZSBvdmVycmlkZGVuIGluIGEgc3VibW9kdWxlIGZvciBjdXN0b20gcmVuZGVyaW5nXG4gICAqIFNob3VsZCByZXR1cm4gSFRNTFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHJlbmRlcihzdGF0ZSkge1xuICAgIHJldHVybiBfdGVtcGxhdGVPYmpDYWNoZShzdGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kIGl0IHRvIGEgcGFyZW50IGVsZW1lbnRcbiAgICogQHBhcmFtIG1vdW50RWxcbiAgICovXG4gIGZ1bmN0aW9uIG1vdW50KCkge1xuICAgIGlmICghX2h0bWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ29tcG9uZW50ICcgKyBfaWQgKyAnIGNhbm5vdCBtb3VudCB3aXRoIG5vIEhUTUwuIENhbGwgcmVuZGVyKCkgZmlyc3Q/Jyk7XG4gICAgfVxuXG4gICAgX2lzTW91bnRlZCA9IHRydWU7XG5cbiAgICBfRE9NRWxlbWVudCA9IChfcmVuZGVyZXIucmVuZGVyKHtcbiAgICAgIHRhcmdldDogX21vdW50UG9pbnQsXG4gICAgICBodG1sICA6IF9odG1sXG4gICAgfSkpO1xuXG4gICAgaWYgKHRoaXMuZGVsZWdhdGVFdmVudHMpIHtcbiAgICAgIC8vIFBhc3MgdHJ1ZSB0byBhdXRvbWF0aWNhbGx5IHBhc3MgZm9ybSBlbGVtZW50IGhhbmRsZXJzIHRoZSBlbGVtZW50cyB2YWx1ZSBvciBvdGhlciBzdGF0dXNcbiAgICAgIHRoaXMuZGVsZWdhdGVFdmVudHModHJ1ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5tb3VudFJlZ2lvbnMoKTtcblxuICAgIGlmICh0aGlzLmNvbXBvbmVudERpZE1vdW50KSB7XG4gICAgICB0aGlzLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgfVxuXG4gICAgdGhpcy5ub3RpZnlTdWJzY3JpYmVyc09mKCdtb3VudCcsIHRoaXMuZ2V0SUQoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCBhZnRlciBpdCdzIGJlZW4gYWRkZWQgdG8gYSB2aWV3XG4gICAqL1xuICBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAvLyBzdHViXG4gIH1cblxuICAvKipcbiAgICogQ2FsbCB3aGVuIHVubG9hZGluZ1xuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9uZW50V2lsbFVubW91bnQoKSB7XG4gICAgLy8gc3R1YlxuICB9XG5cbiAgZnVuY3Rpb24gdW5tb3VudCgpIHtcbiAgICB0aGlzLmNvbXBvbmVudFdpbGxVbm1vdW50KCk7XG5cbiAgICB0aGlzLnVubW91bnRSZWdpb25zKCk7XG5cbiAgICBfaXNNb3VudGVkID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy51bmRlbGVnYXRlRXZlbnRzKSB7XG4gICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICB9XG5cbiAgICBfcmVuZGVyZXIucmVuZGVyKHtcbiAgICAgIHRhcmdldDogX21vdW50UG9pbnQsXG4gICAgICBodG1sICA6ICcnXG4gICAgfSk7XG5cbiAgICBfaHRtbCAgICAgICA9ICcnO1xuICAgIF9ET01FbGVtZW50ID0gbnVsbDtcbiAgICB0aGlzLm5vdGlmeVN1YnNjcmliZXJzT2YoJ3VubW91bnQnLCB0aGlzLmdldElEKCkpO1xuICB9XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vICBSZWdpb25zXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGRlZmluZVJlZ2lvbnMoKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlZ2lvbihpZCkge1xuICAgIHJldHVybiBfcmVnaW9uc1tpZF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSZWdpb25JRHMoKSB7XG4gICAgcmV0dXJuIF9yZWdpb25zID8gT2JqZWN0LmtleXMoX3JlZ2lvbnMpIDogW107XG4gIH1cblxuICBmdW5jdGlvbiBpbml0aWFsaXplUmVnaW9ucygpIHtcbiAgICBnZXRSZWdpb25JRHMoKS5mb3JFYWNoKHJlZ2lvbiA9PiB7XG4gICAgICBfcmVnaW9uc1tyZWdpb25dLmluaXRpYWxpemUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZVJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS51cGRhdGUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbmRlclJlZ2lvbnMoKSB7XG4gICAgZ2V0UmVnaW9uSURzKCkuZm9yRWFjaChyZWdpb24gPT4ge1xuICAgICAgX3JlZ2lvbnNbcmVnaW9uXS5jb21wb25lbnRSZW5kZXIoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdW50UmVnaW9ucygpIHtcbiAgICBnZXRSZWdpb25JRHMoKS5mb3JFYWNoKHJlZ2lvbiA9PiB7XG4gICAgICBfcmVnaW9uc1tyZWdpb25dLm1vdW50KCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiB1bm1vdW50UmVnaW9ucygpIHtcbiAgICBnZXRSZWdpb25JRHMoKS5mb3JFYWNoKHJlZ2lvbiA9PiB7XG4gICAgICBfcmVnaW9uc1tyZWdpb25dLnVubW91bnQoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQWNjZXNzb3JzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGZ1bmN0aW9uIGlzSW5pdGlhbGl6ZWQoKSB7XG4gICAgcmV0dXJuIF9pc0luaXRpYWxpemVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnUHJvcHMoKSB7XG4gICAgcmV0dXJuIF9jb25maWdQcm9wcztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTW91bnRlZCgpIHtcbiAgICByZXR1cm4gX2lzTW91bnRlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcbiAgICB0aGlzLnNldFN0YXRlKHt9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldElEKCkge1xuICAgIHJldHVybiBfaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRET01FbGVtZW50KCkge1xuICAgIHJldHVybiBfRE9NRWxlbWVudDtcbiAgfVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyAgQVBJXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZUNvbXBvbmVudCAgOiBpbml0aWFsaXplQ29tcG9uZW50LFxuICAgIGNvbmZpZ3VyYXRpb24gICAgICAgIDogY29uZmlndXJhdGlvbixcbiAgICBkZWZpbmVSZWdpb25zICAgICAgICA6IGRlZmluZVJlZ2lvbnMsXG4gICAgZGVmaW5lRXZlbnRzICAgICAgICAgOiBkZWZpbmVFdmVudHMsXG4gICAgaXNJbml0aWFsaXplZCAgICAgICAgOiBpc0luaXRpYWxpemVkLFxuICAgIGdldENvbmZpZ1Byb3BzICAgICAgIDogZ2V0Q29uZmlnUHJvcHMsXG4gICAgZ2V0SW5pdGlhbFN0YXRlICAgICAgOiBnZXRJbml0aWFsU3RhdGUsXG4gICAgZ2V0SUQgICAgICAgICAgICAgICAgOiBnZXRJRCxcbiAgICB0ZW1wbGF0ZSAgICAgICAgICAgICA6IHRlbXBsYXRlLFxuICAgIGdldERPTUVsZW1lbnQgICAgICAgIDogZ2V0RE9NRWxlbWVudCxcbiAgICBpc01vdW50ZWQgICAgICAgICAgICA6IGlzTW91bnRlZCxcbiAgICBiaW5kTWFwICAgICAgICAgICAgICA6IGJpbmRNYXAsXG4gICAgY29tcG9uZW50V2lsbFVwZGF0ZSAgOiBjb21wb25lbnRXaWxsVXBkYXRlLFxuICAgIHNob3VsZENvbXBvbmVudFVwZGF0ZTogc2hvdWxkQ29tcG9uZW50VXBkYXRlLFxuICAgIHVwZGF0ZSAgICAgICAgICAgICAgIDogdXBkYXRlLFxuICAgIGNvbXBvbmVudFJlbmRlciAgICAgIDogY29tcG9uZW50UmVuZGVyLFxuICAgIHJlbmRlciAgICAgICAgICAgICAgIDogcmVuZGVyLFxuICAgIG1vdW50ICAgICAgICAgICAgICAgIDogbW91bnQsXG4gICAgY29tcG9uZW50RGlkTW91bnQgICAgOiBjb21wb25lbnREaWRNb3VudCxcbiAgICBjb21wb25lbnRXaWxsVW5tb3VudCA6IGNvbXBvbmVudFdpbGxVbm1vdW50LFxuICAgIHVubW91bnQgICAgICAgICAgICAgIDogdW5tb3VudCxcbiAgICBnZXRSZWdpb24gICAgICAgICAgICA6IGdldFJlZ2lvbixcbiAgICBnZXRSZWdpb25JRHMgICAgICAgICA6IGdldFJlZ2lvbklEcyxcbiAgICBpbml0aWFsaXplUmVnaW9ucyAgICA6IGluaXRpYWxpemVSZWdpb25zLFxuICAgIHVwZGF0ZVJlZ2lvbnMgICAgICAgIDogdXBkYXRlUmVnaW9ucyxcbiAgICByZW5kZXJSZWdpb25zICAgICAgICA6IHJlbmRlclJlZ2lvbnMsXG4gICAgbW91bnRSZWdpb25zICAgICAgICAgOiBtb3VudFJlZ2lvbnMsXG4gICAgdW5tb3VudFJlZ2lvbnMgICAgICAgOiB1bm1vdW50UmVnaW9uc1xuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXdDb21wb25lbnQ7IiwidmFyIGJyb3dzZXJJbmZvID0ge1xuXG4gIGFwcFZlcnNpb24gOiBuYXZpZ2F0b3IuYXBwVmVyc2lvbixcbiAgdXNlckFnZW50ICA6IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gIGlzSUUgICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1TSUUgXCIpLFxuICBpc0lFNiAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgNlwiKSxcbiAgaXNJRTcgICAgICA6IHRoaXMuaXNJRSAmJiAtMSA8IG5hdmlnYXRvci5hcHBWZXJzaW9uLmluZGV4T2YoXCJNU0lFIDdcIiksXG4gIGlzSUU4ICAgICAgOiB0aGlzLmlzSUUgJiYgLTEgPCBuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTVNJRSA4XCIpLFxuICBpc0lFOSAgICAgIDogdGhpcy5pc0lFICYmIC0xIDwgbmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1TSUUgOVwiKSxcbiAgaXNGRiAgICAgICA6IC0xIDwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiRmlyZWZveC9cIiksXG4gIGlzQ2hyb21lICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIkNocm9tZS9cIiksXG4gIGlzTWFjICAgICAgOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY2ludG9zaCxcIiksXG4gIGlzTWFjU2FmYXJpOiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIlNhZmFyaVwiKSAmJiAtMSA8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZihcIk1hY1wiKSAmJiAtMSA9PT0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiQ2hyb21lXCIpLFxuXG4gIGhhc1RvdWNoICAgIDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBub3RTdXBwb3J0ZWQ6ICh0aGlzLmlzSUU2IHx8IHRoaXMuaXNJRTcgfHwgdGhpcy5pc0lFOCB8fCB0aGlzLmlzSUU5KSxcblxuICBtb2JpbGU6IHtcbiAgICBBbmRyb2lkICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQW5kcm9pZC9pKTtcbiAgICB9LFxuICAgIEJsYWNrQmVycnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9CbGFja0JlcnJ5L2kpIHx8IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0JCMTA7IFRvdWNoLyk7XG4gICAgfSxcbiAgICBpT1MgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvaVBob25lfGlQYWR8aVBvZC9pKTtcbiAgICB9LFxuICAgIE9wZXJhICAgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9PcGVyYSBNaW5pL2kpO1xuICAgIH0sXG4gICAgV2luZG93cyAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0lFTW9iaWxlL2kpO1xuICAgIH0sXG4gICAgYW55ICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICh0aGlzLkFuZHJvaWQoKSB8fCB0aGlzLkJsYWNrQmVycnkoKSB8fCB0aGlzLmlPUygpIHx8IHRoaXMuT3BlcmEoKSB8fCB0aGlzLldpbmRvd3MoKSkgIT09IG51bGw7XG4gICAgfVxuXG4gIH0sXG5cbiAgLy8gVE9ETyBmaWx0ZXIgZm9yIElFID4gOVxuICBlbmhhbmNlZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhX2Jyb3dzZXJJbmZvLmlzSUUgJiYgIV9icm93c2VySW5mby5tb2JpbGUuYW55KCk7XG4gIH0sXG5cbiAgbW91c2VEb3duRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaHN0YXJ0XCIgOiBcIm1vdXNlZG93blwiO1xuICB9LFxuXG4gIG1vdXNlVXBFdnRTdHI6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5tb2JpbGUuYW55KCkgPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIjtcbiAgfSxcblxuICBtb3VzZUNsaWNrRXZ0U3RyOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubW9iaWxlLmFueSgpID8gXCJ0b3VjaGVuZFwiIDogXCJjbGlja1wiO1xuICB9LFxuXG4gIG1vdXNlTW92ZUV2dFN0cjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1vYmlsZS5hbnkoKSA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYnJvd3NlckluZm87IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjM5OTkvaG93LXRvLXRlbGwtaWYtYS1kb20tZWxlbWVudC1pcy12aXNpYmxlLWluLXRoZS1jdXJyZW50LXZpZXdwb3J0XG4gIC8vIGVsZW1lbnQgbXVzdCBiZSBlbnRpcmVseSBvbiBzY3JlZW5cbiAgaXNFbGVtZW50RW50aXJlbHlJblZpZXdwb3J0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiAoXG4gICAgICByZWN0LnRvcCA+PSAwICYmXG4gICAgICByZWN0LmxlZnQgPj0gMCAmJlxuICAgICAgcmVjdC5ib3R0b20gPD0gKHdpbmRvdy5pbm5lckhlaWdodCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSAmJlxuICAgICAgcmVjdC5yaWdodCA8PSAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKVxuICAgICk7XG4gIH0sXG5cbiAgLy8gZWxlbWVudCBtYXkgYmUgcGFydGlhbHkgb24gc2NyZWVuXG4gIGlzRWxlbWVudEluVmlld3BvcnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIHJlY3QuYm90dG9tID4gMCAmJlxuICAgICAgcmVjdC5yaWdodCA+IDAgJiZcbiAgICAgIHJlY3QubGVmdCA8ICh3aW5kb3cuaW5uZXJXaWR0aCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpICYmXG4gICAgICByZWN0LnRvcCA8ICh3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCk7XG4gIH0sXG5cbiAgaXNEb21PYmo6IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gISEob2JqLm5vZGVUeXBlIHx8IChvYmogPT09IHdpbmRvdykpO1xuICB9LFxuXG4gIHBvc2l0aW9uOiBmdW5jdGlvbiAoZWwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGVmdDogZWwub2Zmc2V0TGVmdCxcbiAgICAgIHRvcCA6IGVsLm9mZnNldFRvcFxuICAgIH07XG4gIH0sXG5cbiAgLy8gZnJvbSBodHRwOi8vanNwZXJmLmNvbS9qcXVlcnktb2Zmc2V0LXZzLW9mZnNldHBhcmVudC1sb29wXG4gIG9mZnNldDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIG9sID0gMCxcbiAgICAgICAgb3QgPSAwO1xuICAgIGlmIChlbC5vZmZzZXRQYXJlbnQpIHtcbiAgICAgIGRvIHtcbiAgICAgICAgb2wgKz0gZWwub2Zmc2V0TGVmdDtcbiAgICAgICAgb3QgKz0gZWwub2Zmc2V0VG9wO1xuICAgICAgfSB3aGlsZSAoZWwgPSBlbC5vZmZzZXRQYXJlbnQpOyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGxlZnQ6IG9sLFxuICAgICAgdG9wIDogb3RcbiAgICB9O1xuICB9LFxuXG4gIHJlbW92ZUFsbEVsZW1lbnRzOiBmdW5jdGlvbiAoZWwpIHtcbiAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgfVxuICB9LFxuXG4gIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80OTQxNDMvY3JlYXRpbmctYS1uZXctZG9tLWVsZW1lbnQtZnJvbS1hbi1odG1sLXN0cmluZy11c2luZy1idWlsdC1pbi1kb20tbWV0aG9kcy1vci1wcm9cbiAgSFRNTFN0clRvTm9kZTogZnVuY3Rpb24gKHN0cikge1xuICAgIHZhciB0ZW1wICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGVtcC5pbm5lckhUTUwgPSBzdHI7XG4gICAgcmV0dXJuIHRlbXAuZmlyc3RDaGlsZDtcbiAgfSxcblxuICB3cmFwRWxlbWVudDogZnVuY3Rpb24gKHdyYXBwZXJTdHIsIGVsKSB7XG4gICAgdmFyIHdyYXBwZXJFbCA9IHRoaXMuSFRNTFN0clRvTm9kZSh3cmFwcGVyU3RyKSxcbiAgICAgICAgZWxQYXJlbnQgID0gZWwucGFyZW50Tm9kZTtcblxuICAgIHdyYXBwZXJFbC5hcHBlbmRDaGlsZChlbCk7XG4gICAgZWxQYXJlbnQuYXBwZW5kQ2hpbGQod3JhcHBlckVsKTtcbiAgICByZXR1cm4gd3JhcHBlckVsO1xuICB9LFxuXG4gIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTUzMjkxNjcvY2xvc2VzdC1hbmNlc3Rvci1tYXRjaGluZy1zZWxlY3Rvci11c2luZy1uYXRpdmUtZG9tXG4gIGNsb3Nlc3Q6IGZ1bmN0aW9uIChlbCwgc2VsZWN0b3IpIHtcbiAgICB2YXIgbWF0Y2hlc1NlbGVjdG9yID0gZWwubWF0Y2hlcyB8fCBlbC53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHwgZWwubW96TWF0Y2hlc1NlbGVjdG9yIHx8IGVsLm1zTWF0Y2hlc1NlbGVjdG9yO1xuICAgIHdoaWxlIChlbCkge1xuICAgICAgaWYgKG1hdGNoZXNTZWxlY3Rvci5iaW5kKGVsKShzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnRFbGVtZW50O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLy8gZnJvbSB5b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tXG4gIGhhc0NsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXcgUmVnRXhwKCcoXnwgKScgKyBjbGFzc05hbWUgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIGFkZENsYXNzOiBmdW5jdGlvbiAoZWwsIGNsYXNzTmFtZSkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgICB9XG4gIH0sXG5cbiAgcmVtb3ZlQ2xhc3M6IGZ1bmN0aW9uIChlbCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShuZXcgUmVnRXhwKCcoXnxcXFxcYiknICsgY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignfCcpICsgJyhcXFxcYnwkKScsICdnaScpLCAnICcpO1xuICAgIH1cbiAgfSxcblxuICB0b2dnbGVDbGFzczogZnVuY3Rpb24gKGVsLCBjbGFzc05hbWUpIHtcbiAgICBpZiAodGhpcy5oYXNDbGFzcyhlbCwgY2xhc3NOYW1lKSkge1xuICAgICAgdGhpcy5yZW1vdmVDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGRDbGFzcyhlbCwgY2xhc3NOYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gRnJvbSBpbXByZXNzLmpzXG4gIGFwcGx5Q1NTOiBmdW5jdGlvbiAoZWwsIHByb3BzKSB7XG4gICAgdmFyIGtleSwgcGtleTtcbiAgICBmb3IgKGtleSBpbiBwcm9wcykge1xuICAgICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgZWwuc3R5bGVba2V5XSA9IHByb3BzW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbDtcbiAgfSxcblxuICAvLyBmcm9tIGltcHJlc3MuanNcbiAgLy8gYGNvbXB1dGVXaW5kb3dTY2FsZWAgY291bnRzIHRoZSBzY2FsZSBmYWN0b3IgYmV0d2VlbiB3aW5kb3cgc2l6ZSBhbmQgc2l6ZVxuICAvLyBkZWZpbmVkIGZvciB0aGUgcHJlc2VudGF0aW9uIGluIHRoZSBjb25maWcuXG4gIGNvbXB1dGVXaW5kb3dTY2FsZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgIHZhciBoU2NhbGUgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLyBjb25maWcuaGVpZ2h0LFxuICAgICAgICB3U2NhbGUgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIGNvbmZpZy53aWR0aCxcbiAgICAgICAgc2NhbGUgID0gaFNjYWxlID4gd1NjYWxlID8gd1NjYWxlIDogaFNjYWxlO1xuXG4gICAgaWYgKGNvbmZpZy5tYXhTY2FsZSAmJiBzY2FsZSA+IGNvbmZpZy5tYXhTY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWF4U2NhbGU7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5taW5TY2FsZSAmJiBzY2FsZSA8IGNvbmZpZy5taW5TY2FsZSkge1xuICAgICAgc2NhbGUgPSBjb25maWcubWluU2NhbGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYW4gYXJyYXkgb2YgZWxlbWVudHMgaW4gdGhlIGNvbnRhaW5lciByZXR1cm5lZCBhcyBBcnJheSBpbnN0ZWFkIG9mIGEgTm9kZSBsaXN0XG4gICAqL1xuICBnZXRRU0VsZW1lbnRzQXNBcnJheTogZnVuY3Rpb24gKGVsLCBjbHMpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbChjbHMpLCAwKTtcbiAgfSxcblxuICBjZW50ZXJFbGVtZW50SW5WaWV3UG9ydDogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIHZwSCA9IHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgdnBXID0gd2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgIGVsUiA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICBlbEggPSBlbFIuaGVpZ2h0LFxuICAgICAgICBlbFcgPSBlbFIud2lkdGg7XG5cbiAgICBlbC5zdHlsZS5sZWZ0ID0gKHZwVyAvIDIpIC0gKGVsVyAvIDIpICsgJ3B4JztcbiAgICBlbC5zdHlsZS50b3AgID0gKHZwSCAvIDIpIC0gKGVsSCAvIDIpICsgJ3B4JztcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBvYmplY3QgZnJvbSB0aGUgbmFtZSAob3IgaWQpIGF0dHJpYnMgYW5kIGRhdGEgb2YgYSBmb3JtXG4gICAqIEBwYXJhbSBlbFxuICAgKiBAcmV0dXJucyB7bnVsbH1cbiAgICovXG4gIGNhcHR1cmVGb3JtRGF0YTogZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIGRhdGFPYmogPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAgICB0ZXh0YXJlYUVscywgaW5wdXRFbHMsIHNlbGVjdEVscztcblxuICAgIHRleHRhcmVhRWxzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwucXVlcnlTZWxlY3RvckFsbCgndGV4dGFyZWEnKSwgMCk7XG4gICAgaW5wdXRFbHMgICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCcpLCAwKTtcbiAgICBzZWxlY3RFbHMgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NlbGVjdCcpLCAwKTtcblxuICAgIHRleHRhcmVhRWxzLmZvckVhY2goZ2V0SW5wdXRGb3JtRGF0YSk7XG4gICAgaW5wdXRFbHMuZm9yRWFjaChnZXRJbnB1dEZvcm1EYXRhKTtcbiAgICBzZWxlY3RFbHMuZm9yRWFjaChnZXRTZWxlY3RGb3JtRGF0YSk7XG5cbiAgICByZXR1cm4gZGF0YU9iajtcblxuICAgIGZ1bmN0aW9uIGdldElucHV0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSBmb3JtRWwudmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VsZWN0Rm9ybURhdGEoZm9ybUVsKSB7XG4gICAgICB2YXIgc2VsID0gZm9ybUVsLnNlbGVjdGVkSW5kZXgsIHZhbCA9ICcnO1xuICAgICAgaWYgKHNlbCA+PSAwKSB7XG4gICAgICAgIHZhbCA9IGZvcm1FbC5vcHRpb25zW3NlbF0udmFsdWU7XG4gICAgICB9XG4gICAgICBkYXRhT2JqW2dldEVsTmFtZU9ySUQoZm9ybUVsKV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RWxOYW1lT3JJRChmb3JtRWwpIHtcbiAgICAgIHZhciBuYW1lID0gJ25vX25hbWUnO1xuICAgICAgaWYgKGZvcm1FbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSkge1xuICAgICAgICBuYW1lID0gZm9ybUVsLmdldEF0dHJpYnV0ZSgnbmFtZScpO1xuICAgICAgfSBlbHNlIGlmIChmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpKSB7XG4gICAgICAgIG5hbWUgPSBmb3JtRWwuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuICB9XG5cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBzaGFyZWQgM2QgcGVyc3BlY3RpdmUgZm9yIGFsbCBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5M0RUb0NvbnRhaW5lcjogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHBlcnNwZWN0aXZlICAgICAgOiA4MDAsXG4gICAgICAgIHBlcnNwZWN0aXZlT3JpZ2luOiAnNTAlIDUwJSdcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQXBwbHkgYmFzaWMgQ1NTIHByb3BzXG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgYXBwbHkzRFRvRWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgVHdlZW5MaXRlLnNldChlbCwge1xuICAgICAgY3NzOiB7XG4gICAgICAgIHRyYW5zZm9ybVN0eWxlICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHk6IFwiaGlkZGVuXCIsXG4gICAgICAgIHRyYW5zZm9ybU9yaWdpbiAgIDogJzUwJSA1MCUnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGx5IGJhc2ljIDNkIHByb3BzIGFuZCBzZXQgdW5pcXVlIHBlcnNwZWN0aXZlIGZvciBjaGlsZHJlblxuICAgKiBAcGFyYW0gZWxcbiAgICovXG4gIGFwcGx5VW5pcXVlM0RUb0VsZW1lbnQ6IGZ1bmN0aW9uIChlbCkge1xuICAgIFR3ZWVuTGl0ZS5zZXQoZWwsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB0cmFuc2Zvcm1TdHlsZSAgICAgIDogXCJwcmVzZXJ2ZS0zZFwiLFxuICAgICAgICBiYWNrZmFjZVZpc2liaWxpdHkgIDogXCJoaWRkZW5cIixcbiAgICAgICAgdHJhbnNmb3JtUGVyc3BlY3RpdmU6IDYwMCxcbiAgICAgICAgdHJhbnNmb3JtT3JpZ2luICAgICA6ICc1MCUgNTAlJ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbn07XG4iLCJ2YXIgTWVzc2FnZUJveENyZWF0b3IgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9tZXNzYWdlQm94VmlldyA9IHJlcXVpcmUoJy4vTWVzc2FnZUJveFZpZXcnKTtcblxuICBmdW5jdGlvbiBhbGVydCh0aXRsZSwgbWVzc2FnZSwgbW9kYWwsIGNiKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHA+JyArIG1lc3NhZ2UgKyAnPC9wPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRBTkdFUixcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ0Nsb3NlJyxcbiAgICAgICAgICBpZCAgICAgOiAnQ2xvc2UnLFxuICAgICAgICAgIHR5cGUgICA6ICcnLFxuICAgICAgICAgIGljb24gICA6ICd0aW1lcycsXG4gICAgICAgICAgb25DbGljazogY2JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlybSh0aXRsZSwgbWVzc2FnZSwgb2tDQiwgbW9kYWwpIHtcbiAgICByZXR1cm4gX21lc3NhZ2VCb3hWaWV3LmFkZCh7XG4gICAgICB0aXRsZSAgOiB0aXRsZSxcbiAgICAgIGNvbnRlbnQ6ICc8cD4nICsgbWVzc2FnZSArICc8L3A+JyxcbiAgICAgIHR5cGUgICA6IF9tZXNzYWdlQm94Vmlldy50eXBlKCkuREVGQVVMVCxcbiAgICAgIG1vZGFsICA6IG1vZGFsLFxuICAgICAgd2lkdGggIDogNDAwLFxuICAgICAgYnV0dG9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxuICAgICAgICAgIGlkICAgOiAnQ2FuY2VsJyxcbiAgICAgICAgICB0eXBlIDogJ25lZ2F0aXZlJyxcbiAgICAgICAgICBpY29uIDogJ3RpbWVzJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWwgIDogJ1Byb2NlZWQnLFxuICAgICAgICAgIGlkICAgICA6ICdwcm9jZWVkJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9tcHQodGl0bGUsIG1lc3NhZ2UsIG9rQ0IsIG1vZGFsKSB7XG4gICAgcmV0dXJuIF9tZXNzYWdlQm94Vmlldy5hZGQoe1xuICAgICAgdGl0bGUgIDogdGl0bGUsXG4gICAgICBjb250ZW50OiAnPHAgY2xhc3M9XCJ0ZXh0LWNlbnRlciBwYWRkaW5nLWJvdHRvbS1kb3VibGVcIj4nICsgbWVzc2FnZSArICc8L3A+PHRleHRhcmVhIG5hbWU9XCJyZXNwb25zZVwiIGNsYXNzPVwiaW5wdXQtdGV4dFwiIHR5cGU9XCJ0ZXh0XCIgc3R5bGU9XCJ3aWR0aDo0MDBweDsgaGVpZ2h0Ojc1cHg7IHJlc2l6ZTogbm9uZVwiIGF1dG9mb2N1cz1cInRydWVcIj48L3RleHRhcmVhPicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDQ1MCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdQcm9jZWVkJyxcbiAgICAgICAgICBpZCAgICAgOiAncHJvY2VlZCcsXG4gICAgICAgICAgdHlwZSAgIDogJ3Bvc2l0aXZlJyxcbiAgICAgICAgICBpY29uICAgOiAnY2hlY2snLFxuICAgICAgICAgIG9uQ2xpY2s6IG9rQ0JcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hvaWNlKHRpdGxlLCBtZXNzYWdlLCBzZWxlY3Rpb25zLCBva0NCLCBtb2RhbCkge1xuICAgIHZhciBzZWxlY3RIVE1MID0gJzxzZWxlY3QgY2xhc3M9XCJzcGFjZWRcIiBzdHlsZT1cIndpZHRoOjQ1MHB4O2hlaWdodDoyMDBweFwiIG5hbWU9XCJzZWxlY3Rpb25cIiBhdXRvZm9jdXM9XCJ0cnVlXCIgc2l6ZT1cIjIwXCI+JztcblxuICAgIHNlbGVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAob3B0KSB7XG4gICAgICBzZWxlY3RIVE1MICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIG9wdC52YWx1ZSArICdcIiAnICsgKG9wdC5zZWxlY3RlZCA9PT0gJ3RydWUnID8gJ3NlbGVjdGVkJyA6ICcnKSArICc+JyArIG9wdC5sYWJlbCArICc8L29wdGlvbj4nO1xuICAgIH0pO1xuXG4gICAgc2VsZWN0SFRNTCArPSAnPC9zZWxlY3Q+JztcblxuICAgIHJldHVybiBfbWVzc2FnZUJveFZpZXcuYWRkKHtcbiAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgY29udGVudDogJzxwIGNsYXNzPVwidGV4dC1jZW50ZXIgcGFkZGluZy1ib3R0b20tZG91YmxlXCI+JyArIG1lc3NhZ2UgKyAnPC9wPjxkaXYgY2xhc3M9XCJ0ZXh0LWNlbnRlclwiPicgKyBzZWxlY3RIVE1MICsgJzwvZGl2PicsXG4gICAgICB0eXBlICAgOiBfbWVzc2FnZUJveFZpZXcudHlwZSgpLkRFRkFVTFQsXG4gICAgICBtb2RhbCAgOiBtb2RhbCxcbiAgICAgIHdpZHRoICA6IDUwMCxcbiAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcbiAgICAgICAgICBpZCAgIDogJ0NhbmNlbCcsXG4gICAgICAgICAgdHlwZSA6ICduZWdhdGl2ZScsXG4gICAgICAgICAgaWNvbiA6ICd0aW1lcydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsICA6ICdPSycsXG4gICAgICAgICAgaWQgICAgIDogJ29rJyxcbiAgICAgICAgICB0eXBlICAgOiAncG9zaXRpdmUnLFxuICAgICAgICAgIGljb24gICA6ICdjaGVjaycsXG4gICAgICAgICAgb25DbGljazogb2tDQlxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFsZXJ0ICA6IGFsZXJ0LFxuICAgIGNvbmZpcm06IGNvbmZpcm0sXG4gICAgcHJvbXB0IDogcHJvbXB0LFxuICAgIGNob2ljZSA6IGNob2ljZVxuICB9O1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VCb3hDcmVhdG9yKCk7IiwidmFyIE1lc3NhZ2VCb3hWaWV3ID0gZnVuY3Rpb24gKCkge1xuXG4gIHZhciBfY2hpbGRyZW4gICAgICAgICAgICAgICA9IFtdLFxuICAgICAgX2NvdW50ZXIgICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2hpZ2hlc3RaICAgICAgICAgICAgICAgPSAxMDAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCAgICAgICAgICAgPSA0MDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgICA9IHtcbiAgICAgICAgREVGQVVMVCAgICA6ICdkZWZhdWx0JyxcbiAgICAgICAgSU5GT1JNQVRJT046ICdpbmZvcm1hdGlvbicsXG4gICAgICAgIFNVQ0NFU1MgICAgOiAnc3VjY2VzcycsXG4gICAgICAgIFdBUk5JTkcgICAgOiAnd2FybmluZycsXG4gICAgICAgIERBTkdFUiAgICAgOiAnZGFuZ2VyJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgICAgICAgICAgID0ge1xuICAgICAgICAnZGVmYXVsdCcgICAgOiAnJyxcbiAgICAgICAgJ2luZm9ybWF0aW9uJzogJ21lc3NhZ2Vib3hfX2luZm9ybWF0aW9uJyxcbiAgICAgICAgJ3N1Y2Nlc3MnICAgIDogJ21lc3NhZ2Vib3hfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAnbWVzc2FnZWJveF9fd2FybmluZycsXG4gICAgICAgICdkYW5nZXInICAgICA6ICdtZXNzYWdlYm94X19kYW5nZXInXG4gICAgICB9LFxuICAgICAgX21vdW50UG9pbnQsXG4gICAgICBfYnV0dG9uSWNvblRlbXBsYXRlSUQgICA9ICdtZXNzYWdlYm94LS1idXR0b24taWNvbicsXG4gICAgICBfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCA9ICdtZXNzYWdlYm94LS1idXR0b24tbm9pY29uJyxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbm9yaS91dGlscy9UZW1wbGF0aW5nLmpzJyksXG4gICAgICBfbW9kYWwgICAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vTW9kYWxDb3ZlclZpZXcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvQnJvd3NlckluZm8uanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvRE9NVXRpbHMuanMnKSxcbiAgICAgIF9jb21wb25lbnRVdGlscyAgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFuZCBzZXQgdGhlIG1vdW50IHBvaW50IC8gYm94IGNvbnRhaW5lclxuICAgKiBAcGFyYW0gZWxJRFxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZShlbElEKSB7XG4gICAgX21vdW50UG9pbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbElEKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSBuZXcgbWVzc2FnZSBib3hcbiAgICogQHBhcmFtIGluaXRPYmpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBhZGQoaW5pdE9iaikge1xuICAgIHZhciB0eXBlICAgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQsXG4gICAgICAgIGJveE9iaiA9IGNyZWF0ZUJveE9iamVjdChpbml0T2JqKTtcblxuICAgIC8vIHNldHVwXG4gICAgX2NoaWxkcmVuLnB1c2goYm94T2JqKTtcbiAgICBfbW91bnRQb2ludC5hcHBlbmRDaGlsZChib3hPYmouZWxlbWVudCk7XG4gICAgYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGJveE9iai5lbGVtZW50KTtcbiAgICBjb25maWd1cmVCdXR0b25zKGJveE9iaik7XG5cbiAgICBfY29tcG9uZW50VXRpbHMuYXBwbHlVbmlxdWUzRFRvRWxlbWVudChib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBTZXQgM2QgQ1NTIHByb3BzIGZvciBpbi9vdXQgdHJhbnNpdGlvblxuICAgIFR3ZWVuTGl0ZS5zZXQoYm94T2JqLmVsZW1lbnQsIHtcbiAgICAgIGNzczoge1xuICAgICAgICB6SW5kZXg6IF9oaWdoZXN0WixcbiAgICAgICAgd2lkdGggOiBpbml0T2JqLndpZHRoID8gaW5pdE9iai53aWR0aCA6IF9kZWZhdWx0V2lkdGhcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNlbnRlciBhZnRlciB3aWR0aCBoYXMgYmVlbiBzZXRcbiAgICBfZG9tVXRpbHMuY2VudGVyRWxlbWVudEluVmlld1BvcnQoYm94T2JqLmVsZW1lbnQpO1xuXG4gICAgLy8gTWFrZSBpdCBkcmFnZ2FibGVcbiAgICBEcmFnZ2FibGUuY3JlYXRlKCcjJyArIGJveE9iai5pZCwge1xuICAgICAgYm91bmRzIDogd2luZG93LFxuICAgICAgb25QcmVzczogZnVuY3Rpb24gKCkge1xuICAgICAgICBfaGlnaGVzdFogPSBEcmFnZ2FibGUuekluZGV4O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU2hvdyBpdFxuICAgIHRyYW5zaXRpb25Jbihib3hPYmouZWxlbWVudCk7XG5cbiAgICAvLyBTaG93IHRoZSBtb2RhbCBjb3ZlclxuICAgIGlmIChpbml0T2JqLm1vZGFsKSB7XG4gICAgICBfbW9kYWwuc2hvd05vbkRpc21pc3NhYmxlKHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiBib3hPYmouaWQ7XG4gIH1cblxuICAvKipcbiAgICogQXNzaWduIGEgdHlwZSBjbGFzcyB0byBpdFxuICAgKiBAcGFyYW0gdHlwZVxuICAgKiBAcGFyYW0gZWxlbWVudFxuICAgKi9cbiAgZnVuY3Rpb24gYXNzaWduVHlwZUNsYXNzVG9FbGVtZW50KHR5cGUsIGVsZW1lbnQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICBfZG9tVXRpbHMuYWRkQ2xhc3MoZWxlbWVudCwgX3R5cGVTdHlsZU1hcFt0eXBlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgb2JqZWN0IGZvciBhIGJveFxuICAgKiBAcGFyYW0gaW5pdE9ialxuICAgKiBAcmV0dXJucyB7e2RhdGFPYmo6ICosIGlkOiBzdHJpbmcsIG1vZGFsOiAoKnxib29sZWFuKSwgZWxlbWVudDogKiwgc3RyZWFtczogQXJyYXl9fVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQm94T2JqZWN0KGluaXRPYmopIHtcbiAgICB2YXIgaWQgID0gJ2pzX19tZXNzYWdlYm94LScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGRhdGFPYmo6IGluaXRPYmosXG4gICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgbW9kYWwgIDogaW5pdE9iai5tb2RhbCxcbiAgICAgICAgICBlbGVtZW50OiBfdGVtcGxhdGUuYXNFbGVtZW50KCdtZXNzYWdlYm94LS1kZWZhdWx0Jywge1xuICAgICAgICAgICAgaWQgICAgIDogaWQsXG4gICAgICAgICAgICB0aXRsZSAgOiBpbml0T2JqLnRpdGxlLFxuICAgICAgICAgICAgY29udGVudDogaW5pdE9iai5jb250ZW50XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc3RyZWFtczogW11cbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHVwIHRoZSBidXR0b25zXG4gICAqIEBwYXJhbSBib3hPYmpcbiAgICovXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZUJ1dHRvbnMoYm94T2JqKSB7XG4gICAgdmFyIGJ1dHRvbkRhdGEgPSBib3hPYmouZGF0YU9iai5idXR0b25zO1xuXG4gICAgLy8gZGVmYXVsdCBidXR0b24gaWYgbm9uZVxuICAgIGlmICghYnV0dG9uRGF0YSkge1xuICAgICAgYnV0dG9uRGF0YSA9IFt7XG4gICAgICAgIGxhYmVsOiAnQ2xvc2UnLFxuICAgICAgICB0eXBlIDogJycsXG4gICAgICAgIGljb24gOiAndGltZXMnLFxuICAgICAgICBpZCAgIDogJ2RlZmF1bHQtY2xvc2UnXG4gICAgICB9XTtcbiAgICB9XG5cbiAgICB2YXIgYnV0dG9uQ29udGFpbmVyID0gYm94T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLmZvb3Rlci1idXR0b25zJyk7XG5cbiAgICBfZG9tVXRpbHMucmVtb3ZlQWxsRWxlbWVudHMoYnV0dG9uQ29udGFpbmVyKTtcblxuICAgIGJ1dHRvbkRhdGEuZm9yRWFjaChmdW5jdGlvbiBtYWtlQnV0dG9uKGJ1dHRvbk9iaikge1xuICAgICAgYnV0dG9uT2JqLmlkID0gYm94T2JqLmlkICsgJy1idXR0b24tJyArIGJ1dHRvbk9iai5pZDtcblxuICAgICAgdmFyIGJ1dHRvbkVsO1xuXG4gICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdpY29uJykpIHtcbiAgICAgICAgYnV0dG9uRWwgPSBfdGVtcGxhdGUuYXNFbGVtZW50KF9idXR0b25JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1dHRvbkVsID0gX3RlbXBsYXRlLmFzRWxlbWVudChfYnV0dG9uTm9JY29uVGVtcGxhdGVJRCwgYnV0dG9uT2JqKTtcbiAgICAgIH1cblxuICAgICAgYnV0dG9uQ29udGFpbmVyLmFwcGVuZENoaWxkKGJ1dHRvbkVsKTtcblxuICAgICAgdmFyIGJ0blN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KGJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKVxuICAgICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoYnV0dG9uT2JqLmhhc093blByb3BlcnR5KCdvbkNsaWNrJykpIHtcbiAgICAgICAgICAgIGlmIChidXR0b25PYmoub25DbGljaykge1xuICAgICAgICAgICAgICBidXR0b25PYmoub25DbGljay5jYWxsKHRoaXMsIGNhcHR1cmVGb3JtRGF0YShib3hPYmouaWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVtb3ZlKGJveE9iai5pZCk7XG4gICAgICAgIH0pO1xuICAgICAgYm94T2JqLnN0cmVhbXMucHVzaChidG5TdHJlYW0pO1xuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBkYXRhIGZyb20gdGhlIGZvcm0gb24gdGhlIGJveCBjb250ZW50c1xuICAgKiBAcGFyYW0gYm94SURcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBjYXB0dXJlRm9ybURhdGEoYm94SUQpIHtcbiAgICByZXR1cm4gX2RvbVV0aWxzLmNhcHR1cmVGb3JtRGF0YShnZXRPYmpCeUlEKGJveElEKS5lbGVtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYSBib3ggZnJvbSB0aGUgc2NyZWVuIC8gY29udGFpbmVyXG4gICAqIEBwYXJhbSBpZFxuICAgKi9cbiAgZnVuY3Rpb24gcmVtb3ZlKGlkKSB7XG4gICAgdmFyIGlkeCA9IGdldE9iakluZGV4QnlJRChpZCksXG4gICAgICAgIGJveE9iajtcblxuICAgIGlmIChpZHggPiAtMSkge1xuICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG4gICAgICB0cmFuc2l0aW9uT3V0KGJveE9iai5lbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvdyB0aGUgYm94XG4gICAqIEBwYXJhbSBlbFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLCB7YWxwaGE6IDAsIHJvdGF0aW9uWDogNDUsIHNjYWxlOiAyfSk7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjUsIHtcbiAgICAgIGFscGhhICAgIDogMSxcbiAgICAgIHJvdGF0aW9uWDogMCxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlT3V0XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIHRoZSBib3hcbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjI1LCB7XG4gICAgICBhbHBoYSAgICA6IDAsXG4gICAgICByb3RhdGlvblg6IC00NSxcbiAgICAgIHNjYWxlICAgIDogMC4yNSxcbiAgICAgIGVhc2UgICAgIDogQ2lyYy5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFuIHVwIGFmdGVyIHRoZSB0cmFuc2l0aW9uIG91dCBhbmltYXRpb25cbiAgICogQHBhcmFtIGVsXG4gICAqL1xuICBmdW5jdGlvbiBvblRyYW5zaXRpb25PdXRDb21wbGV0ZShlbCkge1xuICAgIHZhciBpZHggICAgPSBnZXRPYmpJbmRleEJ5SUQoZWwuZ2V0QXR0cmlidXRlKCdpZCcpKSxcbiAgICAgICAgYm94T2JqID0gX2NoaWxkcmVuW2lkeF07XG5cbiAgICBib3hPYmouc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgIHN0cmVhbS5kaXNwb3NlKCk7XG4gICAgfSk7XG5cbiAgICBEcmFnZ2FibGUuZ2V0KCcjJyArIGJveE9iai5pZCkuZGlzYWJsZSgpO1xuXG4gICAgX21vdW50UG9pbnQucmVtb3ZlQ2hpbGQoZWwpO1xuXG4gICAgX2NoaWxkcmVuW2lkeF0gPSBudWxsO1xuICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcblxuICAgIGNoZWNrTW9kYWxTdGF0dXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgYW55IG9wZW4gYm94ZXMgaGF2ZSBtb2RhbCB0cnVlXG4gICAqL1xuICBmdW5jdGlvbiBjaGVja01vZGFsU3RhdHVzKCkge1xuICAgIHZhciBpc01vZGFsID0gZmFsc2U7XG5cbiAgICBfY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoYm94T2JqKSB7XG4gICAgICBpZiAoYm94T2JqLm1vZGFsID09PSB0cnVlKSB7XG4gICAgICAgIGlzTW9kYWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFpc01vZGFsKSB7XG4gICAgICBfbW9kYWwuaGlkZSh0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXRpbGl0eSB0byBnZXQgdGhlIGJveCBvYmplY3QgaW5kZXggYnkgSURcbiAgICogQHBhcmFtIGlkXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVdGlsaXR5IHRvIGdldCB0aGUgYm94IG9iamVjdCBieSBJRFxuICAgKiBAcGFyYW0gaWRcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlQm94VmlldygpOyIsInZhciBNb2RhbENvdmVyVmlldyA9IGZ1bmN0aW9uICgpIHtcblxuICB2YXIgX21vdW50UG9pbnQgID0gZG9jdW1lbnQsXG4gICAgICBfbW9kYWxDb3ZlckVsLFxuICAgICAgX21vZGFsQmFja2dyb3VuZEVsLFxuICAgICAgX21vZGFsQ2xvc2VCdXR0b25FbCxcbiAgICAgIF9tb2RhbENsaWNrU3RyZWFtLFxuICAgICAgX2lzVmlzaWJsZSxcbiAgICAgIF9ub3REaXNtaXNzaWJsZSxcbiAgICAgIF9icm93c2VySW5mbyA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0Jyb3dzZXJJbmZvLmpzJyk7XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblxuICAgIF9pc1Zpc2libGUgPSB0cnVlO1xuXG4gICAgX21vZGFsQ292ZXJFbCAgICAgICA9IF9tb3VudFBvaW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbF9fY292ZXInKTtcbiAgICBfbW9kYWxCYWNrZ3JvdW5kRWwgID0gX21vdW50UG9pbnQucXVlcnlTZWxlY3RvcignLm1vZGFsX19iYWNrZ3JvdW5kJyk7XG4gICAgX21vZGFsQ2xvc2VCdXR0b25FbCA9IF9tb3VudFBvaW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbF9fY2xvc2UtYnV0dG9uJyk7XG5cbiAgICB2YXIgbW9kYWxCR0NsaWNrICAgICA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KF9tb2RhbEJhY2tncm91bmRFbCwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIG1vZGFsQnV0dG9uQ2xpY2sgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChfbW9kYWxDbG9zZUJ1dHRvbkVsLCBfYnJvd3NlckluZm8ubW91c2VDbGlja0V2dFN0cigpKTtcblxuICAgIF9tb2RhbENsaWNrU3RyZWFtID0gUnguT2JzZXJ2YWJsZS5tZXJnZShtb2RhbEJHQ2xpY2ssIG1vZGFsQnV0dG9uQ2xpY2spXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25Nb2RhbENsaWNrKCk7XG4gICAgICB9KTtcblxuICAgIGhpZGUoZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SXNWaXNpYmxlKCkge1xuICAgIHJldHVybiBfaXNWaXNpYmxlO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Nb2RhbENsaWNrKCkge1xuICAgIGlmIChfbm90RGlzbWlzc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaGlkZSh0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpIHtcbiAgICBfaXNWaXNpYmxlICAgPSB0cnVlO1xuICAgIHZhciBkdXJhdGlvbiA9IHNob3VsZEFuaW1hdGUgPyAwLjI1IDogMDtcbiAgICBUd2VlbkxpdGUudG8oX21vZGFsQ292ZXJFbCwgZHVyYXRpb24sIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbEJhY2tncm91bmRFbCwgZHVyYXRpb24sIHtcbiAgICAgIGFscGhhOiAxLFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdyhzaG91bGRBbmltYXRlKSB7XG4gICAgaWYgKF9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBfbm90RGlzbWlzc2libGUgPSBmYWxzZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuXG4gICAgVHdlZW5MaXRlLnNldChfbW9kYWxDbG9zZUJ1dHRvbkVsLCB7c2NhbGU6IDIsIGFscGhhOiAwfSk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENsb3NlQnV0dG9uRWwsIDEsIHtcbiAgICAgIGF1dG9BbHBoYTogMSxcbiAgICAgIHNjYWxlICAgIDogMSxcbiAgICAgIGVhc2UgICAgIDogQm91bmNlLmVhc2VPdXQsXG4gICAgICBkZWxheSAgICA6IDFcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBICdoYXJkJyBtb2RhbCB2aWV3IGNhbm5vdCBiZSBkaXNtaXNzZWQgd2l0aCBhIGNsaWNrLCBtdXN0IGJlIHZpYSBjb2RlXG4gICAqIEBwYXJhbSBzaG91bGRBbmltYXRlXG4gICAqL1xuICBmdW5jdGlvbiBzaG93Tm9uRGlzbWlzc2FibGUoc2hvdWxkQW5pbWF0ZSkge1xuICAgIGlmIChfaXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgX25vdERpc21pc3NpYmxlID0gdHJ1ZTtcblxuICAgIHNob3dNb2RhbENvdmVyKHNob3VsZEFuaW1hdGUpO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCAwLCB7YXV0b0FscGhhOiAwfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlKHNob3VsZEFuaW1hdGUpIHtcbiAgICBpZiAoIV9pc1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX2lzVmlzaWJsZSAgICAgID0gZmFsc2U7XG4gICAgX25vdERpc21pc3NpYmxlID0gZmFsc2U7XG4gICAgdmFyIGR1cmF0aW9uICAgID0gc2hvdWxkQW5pbWF0ZSA/IDAuMjUgOiAwO1xuICAgIFR3ZWVuTGl0ZS5raWxsRGVsYXllZENhbGxzVG8oX21vZGFsQ2xvc2VCdXR0b25FbCk7XG4gICAgVHdlZW5MaXRlLnRvKF9tb2RhbENvdmVyRWwsIGR1cmF0aW9uLCB7XG4gICAgICBhdXRvQWxwaGE6IDAsXG4gICAgICBlYXNlICAgICA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxDbG9zZUJ1dHRvbkVsLCBkdXJhdGlvbiAvIDIsIHtcbiAgICAgIGF1dG9BbHBoYTogMCxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlT3V0XG4gICAgfSk7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldE9wYWNpdHkob3BhY2l0eSkge1xuICAgIGlmIChvcGFjaXR5IDwgMCB8fCBvcGFjaXR5ID4gMSkge1xuICAgICAgY29uc29sZS5sb2coJ251ZG9ydS9jb21wb25lbnQvTW9kYWxDb3ZlclZpZXc6IHNldE9wYWNpdHk6IG9wYWNpdHkgc2hvdWxkIGJlIGJldHdlZW4gMCBhbmQgMScpO1xuICAgICAgb3BhY2l0eSA9IDE7XG4gICAgfVxuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGFscGhhOiBvcGFjaXR5LFxuICAgICAgZWFzZSA6IFF1YWQuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q29sb3IociwgZywgYikge1xuICAgIFR3ZWVuTGl0ZS50byhfbW9kYWxCYWNrZ3JvdW5kRWwsIDAuMjUsIHtcbiAgICAgIGJhY2tncm91bmRDb2xvcjogJ3JnYignICsgciArICcsJyArIGcgKyAnLCcgKyBiICsgJyknLFxuICAgICAgZWFzZSAgICAgICAgICAgOiBRdWFkLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaW5pdGlhbGl6ZSAgICAgICAgOiBpbml0aWFsaXplLFxuICAgIHNob3cgICAgICAgICAgICAgIDogc2hvdyxcbiAgICBzaG93Tm9uRGlzbWlzc2FibGU6IHNob3dOb25EaXNtaXNzYWJsZSxcbiAgICBoaWRlICAgICAgICAgICAgICA6IGhpZGUsXG4gICAgdmlzaWJsZSAgICAgICAgICAgOiBnZXRJc1Zpc2libGUsXG4gICAgc2V0T3BhY2l0eSAgICAgICAgOiBzZXRPcGFjaXR5LFxuICAgIHNldENvbG9yICAgICAgICAgIDogc2V0Q29sb3JcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbENvdmVyVmlldygpOyIsInZhciBUb2FzdFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgICAgICAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgICAgICAgICAgPSAwLFxuICAgICAgX2RlZmF1bHRFeHBpcmVEdXJhdGlvbiA9IDcwMDAsXG4gICAgICBfdHlwZXMgICAgICAgICAgICAgICAgID0ge1xuICAgICAgICBERUZBVUxUICAgIDogJ2RlZmF1bHQnLFxuICAgICAgICBJTkZPUk1BVElPTjogJ2luZm9ybWF0aW9uJyxcbiAgICAgICAgU1VDQ0VTUyAgICA6ICdzdWNjZXNzJyxcbiAgICAgICAgV0FSTklORyAgICA6ICd3YXJuaW5nJyxcbiAgICAgICAgREFOR0VSICAgICA6ICdkYW5nZXInXG4gICAgICB9LFxuICAgICAgX3R5cGVTdHlsZU1hcCAgICAgICAgICA9IHtcbiAgICAgICAgJ2RlZmF1bHQnICAgIDogJycsXG4gICAgICAgICdpbmZvcm1hdGlvbic6ICd0b2FzdF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAndG9hc3RfX3N1Y2Nlc3MnLFxuICAgICAgICAnd2FybmluZycgICAgOiAndG9hc3RfX3dhcm5pbmcnLFxuICAgICAgICAnZGFuZ2VyJyAgICAgOiAndG9hc3RfX2RhbmdlcidcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF90ZW1wbGF0ZSAgICAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9icm93c2VySW5mbyAgICAgICAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9Ccm93c2VySW5mby5qcycpLFxuICAgICAgX2RvbVV0aWxzICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4uLy4uL251ZG9ydS9icm93c2VyL0RPTVV0aWxzLmpzJyksXG4gICAgICBfY29tcG9uZW50VXRpbHMgICAgICAgID0gcmVxdWlyZSgnLi4vLi4vbnVkb3J1L2Jyb3dzZXIvVGhyZWVEVHJhbnNmb3Jtcy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvL29iai50aXRsZSwgb2JqLmNvbnRlbnQsIG9iai50eXBlXG4gIGZ1bmN0aW9uIGFkZChpbml0T2JqKSB7XG4gICAgaW5pdE9iai50eXBlID0gaW5pdE9iai50eXBlIHx8IF90eXBlcy5ERUZBVUxUO1xuXG4gICAgdmFyIHRvYXN0T2JqID0gY3JlYXRlVG9hc3RPYmplY3QoaW5pdE9iai50aXRsZSwgaW5pdE9iai5tZXNzYWdlKTtcblxuICAgIF9jaGlsZHJlbi5wdXNoKHRvYXN0T2JqKTtcblxuICAgIF9tb3VudFBvaW50Lmluc2VydEJlZm9yZSh0b2FzdE9iai5lbGVtZW50LCBfbW91bnRQb2ludC5maXJzdENoaWxkKTtcblxuICAgIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudChpbml0T2JqLnR5cGUsIHRvYXN0T2JqLmVsZW1lbnQpO1xuXG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0NvbnRhaW5lcihfbW91bnRQb2ludCk7XG4gICAgX2NvbXBvbmVudFV0aWxzLmFwcGx5M0RUb0VsZW1lbnQodG9hc3RPYmouZWxlbWVudCk7XG5cbiAgICB2YXIgY2xvc2VCdG4gICAgICAgICA9IHRvYXN0T2JqLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLnRvYXN0X19pdGVtLWNvbnRyb2xzID4gYnV0dG9uJyksXG4gICAgICAgIGNsb3NlQnRuU3RlYW0gICAgPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudChjbG9zZUJ0biwgX2Jyb3dzZXJJbmZvLm1vdXNlQ2xpY2tFdnRTdHIoKSksXG4gICAgICAgIGV4cGlyZVRpbWVTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmludGVydmFsKF9kZWZhdWx0RXhwaXJlRHVyYXRpb24pO1xuXG4gICAgdG9hc3RPYmouZGVmYXVsdEJ1dHRvblN0cmVhbSA9IFJ4Lk9ic2VydmFibGUubWVyZ2UoY2xvc2VCdG5TdGVhbSwgZXhwaXJlVGltZVN0cmVhbSkudGFrZSgxKVxuICAgICAgLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlbW92ZSh0b2FzdE9iai5pZCk7XG4gICAgICB9KTtcblxuICAgIHRyYW5zaXRpb25Jbih0b2FzdE9iai5lbGVtZW50KTtcblxuICAgIHJldHVybiB0b2FzdE9iai5pZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBlbGVtZW50KSB7XG4gICAgaWYgKHR5cGUgIT09ICdkZWZhdWx0Jykge1xuICAgICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF90eXBlU3R5bGVNYXBbdHlwZV0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRvYXN0T2JqZWN0KHRpdGxlLCBtZXNzYWdlKSB7XG4gICAgdmFyIGlkICA9ICdqc19fdG9hc3QtdG9hc3RpdGVtLScgKyAoX2NvdW50ZXIrKykudG9TdHJpbmcoKSxcbiAgICAgICAgb2JqID0ge1xuICAgICAgICAgIGlkICAgICAgICAgICAgICAgICA6IGlkLFxuICAgICAgICAgIGVsZW1lbnQgICAgICAgICAgICA6IF90ZW1wbGF0ZS5hc0VsZW1lbnQoJ2NvbXBvbmVudC0tdG9hc3QnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGRlZmF1bHRCdXR0b25TdHJlYW06IG51bGxcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUoaWQpIHtcbiAgICB2YXIgaWR4ID0gZ2V0T2JqSW5kZXhCeUlEKGlkKSxcbiAgICAgICAgdG9hc3Q7XG5cbiAgICBpZiAoaWR4ID4gLTEpIHtcbiAgICAgIHRvYXN0ID0gX2NoaWxkcmVuW2lkeF07XG4gICAgICByZWFycmFuZ2UoaWR4KTtcbiAgICAgIHRyYW5zaXRpb25PdXQodG9hc3QuZWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbkluKGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLCB7YWxwaGE6IDB9KTtcbiAgICBUd2VlbkxpdGUudG8oZWwsIDEsIHthbHBoYTogMSwgZWFzZTogUXVhZC5lYXNlT3V0fSk7XG4gICAgcmVhcnJhbmdlKCk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uT3V0KGVsKSB7XG4gICAgVHdlZW5MaXRlLnRvKGVsLCAwLjI1LCB7XG4gICAgICByb3RhdGlvblg6IC00NSxcbiAgICAgIGFscGhhICAgIDogMCxcbiAgICAgIGVhc2UgICAgIDogUXVhZC5lYXNlSW4sIG9uQ29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gb25UcmFuc2l0aW9uT3V0Q29tcGxldGUoZWwpIHtcbiAgICB2YXIgaWR4ICAgICAgICA9IGdldE9iakluZGV4QnlJRChlbC5nZXRBdHRyaWJ1dGUoJ2lkJykpLFxuICAgICAgICB0b2FzdE9iaiAgID0gX2NoaWxkcmVuW2lkeF07XG5cbiAgICB0b2FzdE9iai5kZWZhdWx0QnV0dG9uU3RyZWFtLmRpc3Bvc2UoKTtcblxuICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKGVsKTtcbiAgICBfY2hpbGRyZW5baWR4XSA9IG51bGw7XG4gICAgX2NoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVhcnJhbmdlKGlnbm9yZSkge1xuICAgIHZhciBpID0gX2NoaWxkcmVuLmxlbmd0aCAtIDEsXG4gICAgICAgIGN1cnJlbnQsXG4gICAgICAgIHkgPSAwO1xuXG4gICAgZm9yICg7IGkgPiAtMTsgaS0tKSB7XG4gICAgICBpZiAoaSA9PT0gaWdub3JlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY3VycmVudCA9IF9jaGlsZHJlbltpXTtcbiAgICAgIFR3ZWVuTGl0ZS50byhjdXJyZW50LmVsZW1lbnQsIDAuNzUsIHt5OiB5LCBlYXNlOiBCb3VuY2UuZWFzZU91dH0pO1xuICAgICAgeSArPSAxMCArIGN1cnJlbnQuZWxlbWVudC5jbGllbnRIZWlnaHQ7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2JqSW5kZXhCeUlEKGlkKSB7XG4gICAgcmV0dXJuIF9jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICByZXR1cm4gY2hpbGQuaWQ7XG4gICAgfSkuaW5kZXhPZihpZCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUeXBlcygpIHtcbiAgICByZXR1cm4gX3R5cGVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbml0aWFsaXplOiBpbml0aWFsaXplLFxuICAgIGFkZCAgICAgICA6IGFkZCxcbiAgICByZW1vdmUgICAgOiByZW1vdmUsXG4gICAgdHlwZSAgICAgIDogZ2V0VHlwZXNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb2FzdFZpZXcoKTsiLCJ2YXIgVG9vbFRpcFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIF9jaGlsZHJlbiAgICAgPSBbXSxcbiAgICAgIF9jb3VudGVyICAgICAgPSAwLFxuICAgICAgX2RlZmF1bHRXaWR0aCA9IDIwMCxcbiAgICAgIF90eXBlcyAgICAgICAgPSB7XG4gICAgICAgIERFRkFVTFQgICAgOiAnZGVmYXVsdCcsXG4gICAgICAgIElORk9STUFUSU9OOiAnaW5mb3JtYXRpb24nLFxuICAgICAgICBTVUNDRVNTICAgIDogJ3N1Y2Nlc3MnLFxuICAgICAgICBXQVJOSU5HICAgIDogJ3dhcm5pbmcnLFxuICAgICAgICBEQU5HRVIgICAgIDogJ2RhbmdlcicsXG4gICAgICAgIENPQUNITUFSSyAgOiAnY29hY2htYXJrJ1xuICAgICAgfSxcbiAgICAgIF90eXBlU3R5bGVNYXAgPSB7XG4gICAgICAgICdkZWZhdWx0JyAgICA6ICcnLFxuICAgICAgICAnaW5mb3JtYXRpb24nOiAndG9vbHRpcF9faW5mb3JtYXRpb24nLFxuICAgICAgICAnc3VjY2VzcycgICAgOiAndG9vbHRpcF9fc3VjY2VzcycsXG4gICAgICAgICd3YXJuaW5nJyAgICA6ICd0b29sdGlwX193YXJuaW5nJyxcbiAgICAgICAgJ2RhbmdlcicgICAgIDogJ3Rvb2x0aXBfX2RhbmdlcicsXG4gICAgICAgICdjb2FjaG1hcmsnICA6ICd0b29sdGlwX19jb2FjaG1hcmsnXG4gICAgICB9LFxuICAgICAgX3Bvc2l0aW9ucyAgICA9IHtcbiAgICAgICAgVCA6ICdUJyxcbiAgICAgICAgVFI6ICdUUicsXG4gICAgICAgIFIgOiAnUicsXG4gICAgICAgIEJSOiAnQlInLFxuICAgICAgICBCIDogJ0InLFxuICAgICAgICBCTDogJ0JMJyxcbiAgICAgICAgTCA6ICdMJyxcbiAgICAgICAgVEw6ICdUTCdcbiAgICAgIH0sXG4gICAgICBfcG9zaXRpb25NYXAgID0ge1xuICAgICAgICAnVCcgOiAndG9vbHRpcF9fdG9wJyxcbiAgICAgICAgJ1RSJzogJ3Rvb2x0aXBfX3RvcHJpZ2h0JyxcbiAgICAgICAgJ1InIDogJ3Rvb2x0aXBfX3JpZ2h0JyxcbiAgICAgICAgJ0JSJzogJ3Rvb2x0aXBfX2JvdHRvbXJpZ2h0JyxcbiAgICAgICAgJ0InIDogJ3Rvb2x0aXBfX2JvdHRvbScsXG4gICAgICAgICdCTCc6ICd0b29sdGlwX19ib3R0b21sZWZ0JyxcbiAgICAgICAgJ0wnIDogJ3Rvb2x0aXBfX2xlZnQnLFxuICAgICAgICAnVEwnOiAndG9vbHRpcF9fdG9wbGVmdCdcbiAgICAgIH0sXG4gICAgICBfbW91bnRQb2ludCxcbiAgICAgIF90ZW1wbGF0ZSAgICAgPSByZXF1aXJlKCcuLi8uLi9ub3JpL3V0aWxzL1RlbXBsYXRpbmcuanMnKSxcbiAgICAgIF9kb21VdGlscyAgICAgPSByZXF1aXJlKCcuLi8uLi9udWRvcnUvYnJvd3Nlci9ET01VdGlscy5qcycpO1xuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemUoZWxJRCkge1xuICAgIF9tb3VudFBvaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxJRCk7XG4gIH1cblxuICAvL29iai50aXRsZSwgb2JqLmNvbnRlbnQsIG9iai50eXBlLCBvYmoudGFyZ2V0LCBvYmoucG9zaXRpb25cbiAgZnVuY3Rpb24gYWRkKGluaXRPYmopIHtcbiAgICBpbml0T2JqLnR5cGUgPSBpbml0T2JqLnR5cGUgfHwgX3R5cGVzLkRFRkFVTFQ7XG5cbiAgICB2YXIgdG9vbHRpcE9iaiA9IGNyZWF0ZVRvb2xUaXBPYmplY3QoaW5pdE9iai50aXRsZSxcbiAgICAgIGluaXRPYmouY29udGVudCxcbiAgICAgIGluaXRPYmoucG9zaXRpb24sXG4gICAgICBpbml0T2JqLnRhcmdldEVsLFxuICAgICAgaW5pdE9iai5ndXR0ZXIsXG4gICAgICBpbml0T2JqLmFsd2F5c1Zpc2libGUpO1xuXG4gICAgX2NoaWxkcmVuLnB1c2godG9vbHRpcE9iaik7XG4gICAgX21vdW50UG9pbnQuYXBwZW5kQ2hpbGQodG9vbHRpcE9iai5lbGVtZW50KTtcblxuICAgIHRvb2x0aXBPYmouYXJyb3dFbCA9IHRvb2x0aXBPYmouZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3cnKTtcbiAgICBhc3NpZ25UeXBlQ2xhc3NUb0VsZW1lbnQoaW5pdE9iai50eXBlLCBpbml0T2JqLnBvc2l0aW9uLCB0b29sdGlwT2JqLmVsZW1lbnQpO1xuXG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmVsZW1lbnQsIHtcbiAgICAgIGNzczoge1xuICAgICAgICBhdXRvQWxwaGE6IHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSA/IDEgOiAwLFxuICAgICAgICB3aWR0aCAgICA6IGluaXRPYmoud2lkdGggPyBpbml0T2JqLndpZHRoIDogX2RlZmF1bHRXaWR0aFxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gY2FjaGUgdGhlc2UgdmFsdWVzLCAzZCB0cmFuc2Zvcm1zIHdpbGwgYWx0ZXIgc2l6ZVxuICAgIHRvb2x0aXBPYmoud2lkdGggID0gdG9vbHRpcE9iai5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoO1xuICAgIHRvb2x0aXBPYmouaGVpZ2h0ID0gdG9vbHRpcE9iai5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcblxuICAgIGFzc2lnbkV2ZW50c1RvVGFyZ2V0RWwodG9vbHRpcE9iaik7XG4gICAgcG9zaXRpb25Ub29sVGlwKHRvb2x0aXBPYmopO1xuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuTCB8fCB0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLlIpIHtcbiAgICAgIGNlbnRlckFycm93VmVydGljYWxseSh0b29sdGlwT2JqKTtcbiAgICB9XG5cbiAgICBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5UIHx8IHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQikge1xuICAgICAgY2VudGVyQXJyb3dIb3Jpem9udGFsbHkodG9vbHRpcE9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRvb2x0aXBPYmouZWxlbWVudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFzc2lnblR5cGVDbGFzc1RvRWxlbWVudCh0eXBlLCBwb3NpdGlvbiwgZWxlbWVudCkge1xuICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcpIHtcbiAgICAgIF9kb21VdGlscy5hZGRDbGFzcyhlbGVtZW50LCBfdHlwZVN0eWxlTWFwW3R5cGVdKTtcbiAgICB9XG4gICAgX2RvbVV0aWxzLmFkZENsYXNzKGVsZW1lbnQsIF9wb3NpdGlvbk1hcFtwb3NpdGlvbl0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVG9vbFRpcE9iamVjdCh0aXRsZSwgbWVzc2FnZSwgcG9zaXRpb24sIHRhcmdldCwgZ3V0dGVyLCBhbHdheXNWaXNpYmxlKSB7XG4gICAgdmFyIGlkICA9ICdqc19fdG9vbHRpcC10b29sdGlwaXRlbS0nICsgKF9jb3VudGVyKyspLnRvU3RyaW5nKCksXG4gICAgICAgIG9iaiA9IHtcbiAgICAgICAgICBpZCAgICAgICAgICAgOiBpZCxcbiAgICAgICAgICBwb3NpdGlvbiAgICAgOiBwb3NpdGlvbixcbiAgICAgICAgICB0YXJnZXRFbCAgICAgOiB0YXJnZXQsXG4gICAgICAgICAgYWx3YXlzVmlzaWJsZTogYWx3YXlzVmlzaWJsZSB8fCBmYWxzZSxcbiAgICAgICAgICBndXR0ZXIgICAgICAgOiBndXR0ZXIgfHwgMTUsXG4gICAgICAgICAgZWxPdmVyU3RyZWFtIDogbnVsbCxcbiAgICAgICAgICBlbE91dFN0cmVhbSAgOiBudWxsLFxuICAgICAgICAgIGhlaWdodCAgICAgICA6IDAsXG4gICAgICAgICAgd2lkdGggICAgICAgIDogMCxcbiAgICAgICAgICBlbGVtZW50ICAgICAgOiBfdGVtcGxhdGUuYXNFbGVtZW50KCdjb21wb25lbnQtLXRvb2x0aXAnLCB7XG4gICAgICAgICAgICBpZCAgICAgOiBpZCxcbiAgICAgICAgICAgIHRpdGxlICA6IHRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGFycm93RWwgICAgICA6IG51bGxcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICBmdW5jdGlvbiBhc3NpZ25FdmVudHNUb1RhcmdldEVsKHRvb2x0aXBPYmopIHtcbiAgICBpZiAodG9vbHRpcE9iai5hbHdheXNWaXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdG9vbHRpcE9iai5lbE92ZXJTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmZyb21FdmVudCh0b29sdGlwT2JqLnRhcmdldEVsLCAnbW91c2VvdmVyJylcbiAgICAgIC5zdWJzY3JpYmUoZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBzaG93VG9vbFRpcCh0b29sdGlwT2JqLmlkKTtcbiAgICAgIH0pO1xuXG4gICAgdG9vbHRpcE9iai5lbE91dFN0cmVhbSA9IFJ4Lk9ic2VydmFibGUuZnJvbUV2ZW50KHRvb2x0aXBPYmoudGFyZ2V0RWwsICdtb3VzZW91dCcpXG4gICAgICAuc3Vic2NyaWJlKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgaGlkZVRvb2xUaXAodG9vbHRpcE9iai5pZCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3dUb29sVGlwKGlkKSB7XG4gICAgdmFyIHRvb2x0aXBPYmogPSBnZXRPYmpCeUlEKGlkKTtcblxuICAgIGlmICh0b29sdGlwT2JqLmFsd2F5c1Zpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaik7XG4gICAgdHJhbnNpdGlvbkluKHRvb2x0aXBPYmouZWxlbWVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBwb3NpdGlvblRvb2xUaXAodG9vbHRpcE9iaikge1xuICAgIHZhciBndXR0ZXIgICA9IHRvb2x0aXBPYmouZ3V0dGVyLFxuICAgICAgICB4UG9zICAgICA9IDAsXG4gICAgICAgIHlQb3MgICAgID0gMCxcbiAgICAgICAgdGd0UHJvcHMgPSB0b29sdGlwT2JqLnRhcmdldEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVEwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVCkge1xuICAgICAgeFBvcyA9IHRndFByb3BzLmxlZnQgKyAoKHRndFByb3BzLndpZHRoIC8gMikgLSAodG9vbHRpcE9iai53aWR0aCAvIDIpKTtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodCAtIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuVFIpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5yaWdodDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgLSB0b29sdGlwT2JqLmhlaWdodDtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuUikge1xuICAgICAgeFBvcyA9IHRndFByb3BzLnJpZ2h0ICsgZ3V0dGVyO1xuICAgICAgeVBvcyA9IHRndFByb3BzLnRvcCArICgodGd0UHJvcHMuaGVpZ2h0IC8gMikgLSAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSk7XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkJSKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMucmlnaHQ7XG4gICAgICB5UG9zID0gdGd0UHJvcHMuYm90dG9tO1xuICAgIH0gZWxzZSBpZiAodG9vbHRpcE9iai5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9ucy5CKSB7XG4gICAgICB4UG9zID0gdGd0UHJvcHMubGVmdCArICgodGd0UHJvcHMud2lkdGggLyAyKSAtICh0b29sdGlwT2JqLndpZHRoIC8gMikpO1xuICAgICAgeVBvcyA9IHRndFByb3BzLmJvdHRvbSArIGd1dHRlcjtcbiAgICB9IGVsc2UgaWYgKHRvb2x0aXBPYmoucG9zaXRpb24gPT09IF9wb3NpdGlvbnMuQkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aDtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy5ib3R0b207XG4gICAgfSBlbHNlIGlmICh0b29sdGlwT2JqLnBvc2l0aW9uID09PSBfcG9zaXRpb25zLkwpIHtcbiAgICAgIHhQb3MgPSB0Z3RQcm9wcy5sZWZ0IC0gdG9vbHRpcE9iai53aWR0aCAtIGd1dHRlcjtcbiAgICAgIHlQb3MgPSB0Z3RQcm9wcy50b3AgKyAoKHRndFByb3BzLmhlaWdodCAvIDIpIC0gKHRvb2x0aXBPYmouaGVpZ2h0IC8gMikpO1xuICAgIH1cblxuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5lbGVtZW50LCB7XG4gICAgICB4OiB4UG9zLFxuICAgICAgeTogeVBvc1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2VudGVyQXJyb3dIb3Jpem9udGFsbHkodG9vbHRpcE9iaikge1xuICAgIHZhciBhcnJvd1Byb3BzID0gdG9vbHRpcE9iai5hcnJvd0VsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIFR3ZWVuTGl0ZS5zZXQodG9vbHRpcE9iai5hcnJvd0VsLCB7eDogKHRvb2x0aXBPYmoud2lkdGggLyAyKSAtIChhcnJvd1Byb3BzLndpZHRoIC8gMil9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNlbnRlckFycm93VmVydGljYWxseSh0b29sdGlwT2JqKSB7XG4gICAgdmFyIGFycm93UHJvcHMgPSB0b29sdGlwT2JqLmFycm93RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgVHdlZW5MaXRlLnNldCh0b29sdGlwT2JqLmFycm93RWwsIHt5OiAodG9vbHRpcE9iai5oZWlnaHQgLyAyKSAtIChhcnJvd1Byb3BzLmhlaWdodCAvIDIpIC0gMn0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZVRvb2xUaXAoaWQpIHtcbiAgICB2YXIgdG9vbHRpcE9iaiA9IGdldE9iakJ5SUQoaWQpO1xuXG4gICAgaWYgKHRvb2x0aXBPYmouYWx3YXlzVmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyYW5zaXRpb25PdXQodG9vbHRpcE9iai5lbGVtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25JbihlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC41LCB7XG4gICAgICBhdXRvQWxwaGE6IDEsXG4gICAgICBlYXNlICAgICA6IENpcmMuZWFzZU91dFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhbnNpdGlvbk91dChlbCkge1xuICAgIFR3ZWVuTGl0ZS50byhlbCwgMC4wNSwge1xuICAgICAgYXV0b0FscGhhOiAwLFxuICAgICAgZWFzZSAgICAgOiBDaXJjLmVhc2VPdXRcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZShlbCkge1xuICAgIGdldE9iakJ5RWxlbWVudChlbCkuZm9yRWFjaChmdW5jdGlvbiAodG9vbHRpcCkge1xuICAgICAgaWYgKHRvb2x0aXAuZWxPdmVyU3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdmVyU3RyZWFtLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b29sdGlwLmVsT3V0U3RyZWFtKSB7XG4gICAgICAgIHRvb2x0aXAuZWxPdXRTdHJlYW0uZGlzcG9zZSgpO1xuICAgICAgfVxuXG4gICAgICBUd2VlbkxpdGUua2lsbERlbGF5ZWRDYWxsc1RvKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIF9tb3VudFBvaW50LnJlbW92ZUNoaWxkKHRvb2x0aXAuZWxlbWVudCk7XG5cbiAgICAgIHZhciBpZHggPSBnZXRPYmpJbmRleEJ5SUQodG9vbHRpcC5pZCk7XG5cbiAgICAgIF9jaGlsZHJlbltpZHhdID0gbnVsbDtcbiAgICAgIF9jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZCA9PT0gaWQ7XG4gICAgfSlbMF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPYmpJbmRleEJ5SUQoaWQpIHtcbiAgICByZXR1cm4gX2NoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5pZDtcbiAgICB9KS5pbmRleE9mKGlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9iakJ5RWxlbWVudChlbCkge1xuICAgIHJldHVybiBfY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNoaWxkLnRhcmdldEVsID09PSBlbDtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFR5cGVzKCkge1xuICAgIHJldHVybiBfdHlwZXM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQb3NpdGlvbnMoKSB7XG4gICAgcmV0dXJuIF9wb3NpdGlvbnM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IGluaXRpYWxpemUsXG4gICAgYWRkICAgICAgIDogYWRkLFxuICAgIHJlbW92ZSAgICA6IHJlbW92ZSxcbiAgICB0eXBlICAgICAgOiBnZXRUeXBlcyxcbiAgICBwb3NpdGlvbiAgOiBnZXRQb3NpdGlvbnNcbiAgfTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb29sVGlwVmlldygpOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGlzSW50ZWdlcjogZnVuY3Rpb24gKHN0cikge1xuICAgIHJldHVybiAoL14tP1xcZCskLy50ZXN0KHN0cikpO1xuICB9LFxuXG4gIHJuZE51bWJlcjogZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XG4gIH0sXG5cbiAgY2xhbXA6IGZ1bmN0aW9uICh2YWwsIG1pbiwgbWF4KSB7XG4gICAgcmV0dXJuIE1hdGgubWF4KG1pbiwgTWF0aC5taW4obWF4LCB2YWwpKTtcbiAgfSxcblxuICBpblJhbmdlOiBmdW5jdGlvbiAodmFsLCBtaW4sIG1heCkge1xuICAgIHJldHVybiB2YWwgPiBtaW4gJiYgdmFsIDwgbWF4O1xuICB9LFxuXG4gIGRpc3RhbmNlVEw6IGZ1bmN0aW9uIChwb2ludDEsIHBvaW50Mikge1xuICAgIHZhciB4ZCA9IChwb2ludDIubGVmdCAtIHBvaW50MS5sZWZ0KSxcbiAgICAgICAgeWQgPSAocG9pbnQyLnRvcCAtIHBvaW50MS50b3ApO1xuICAgIHJldHVybiBNYXRoLnNxcnQoKHhkICogeGQpICsgKHlkICogeWQpKTtcbiAgfVxuXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBUZXN0IGZvclxuICAgKiBPYmplY3Qge1wiXCI6IHVuZGVmaW5lZH1cbiAgICogT2JqZWN0IHt1bmRlZmluZWQ6IHVuZGVmaW5lZH1cbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzTnVsbDogZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBpc251bGwgPSBmYWxzZTtcblxuICAgIGlmIChpcy5mYWxzZXkob2JqKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgIGlmIChwcm9wID09PSB1bmRlZmluZWQgfHwgb2JqW3Byb3BdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaXNudWxsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBpc251bGw7XG4gIH0sXG5cbiAgZHluYW1pY1NvcnQ6IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIGFbcHJvcGVydHldIDwgYltwcm9wZXJ0eV0gPyAtMSA6IGFbcHJvcGVydHldID4gYltwcm9wZXJ0eV0gPyAxIDogMDtcbiAgICB9O1xuICB9LFxuXG4gIHNlYXJjaE9iamVjdHM6IGZ1bmN0aW9uIChvYmosIGtleSwgdmFsKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmpbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9iamVjdHMgPSBvYmplY3RzLmNvbmNhdChzZWFyY2hPYmplY3RzKG9ialtpXSwga2V5LCB2YWwpKTtcbiAgICAgIH0gZWxzZSBpZiAoaSA9PT0ga2V5ICYmIG9ialtrZXldID09PSB2YWwpIHtcbiAgICAgICAgb2JqZWN0cy5wdXNoKG9iaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzO1xuICB9LFxuXG4gIGdldE9iamVjdEZyb21TdHJpbmc6IGZ1bmN0aW9uIChvYmosIHN0cikge1xuICAgIHZhciBpICAgID0gMCxcbiAgICAgICAgcGF0aCA9IHN0ci5zcGxpdCgnLicpLFxuICAgICAgICBsZW4gID0gcGF0aC5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBvYmogPSBvYmpbcGF0aFtpXV07XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH0sXG5cbiAgZ2V0T2JqZWN0SW5kZXhGcm9tSWQ6IGZ1bmN0aW9uIChvYmosIGlkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqW2ldICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBvYmpbaV0uaWQgIT09IFwidW5kZWZpbmVkXCIgJiYgb2JqW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvLyBleHRlbmQgYW5kIGRlZXAgZXh0ZW5kIGZyb20gaHR0cDovL3lvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb20vXG4gIGV4dGVuZDogZnVuY3Rpb24gKG91dCkge1xuICAgIG91dCA9IG91dCB8fCB7fTtcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWFyZ3VtZW50c1tpXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBvdXRba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICBkZWVwRXh0ZW5kOiBmdW5jdGlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBvYmogPSBhcmd1bWVudHNbaV07XG5cbiAgICAgIGlmICghb2JqKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2Ygb2JqW2tleV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBkZWVwRXh0ZW5kKG91dFtrZXldLCBvYmpba2V5XSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dFtrZXldID0gb2JqW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICAvKipcbiAgICogU2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbiBvZiBTdGFtcHMgLSBodHRwOi8vZXJpY2xlYWRzLmNvbS8yMDE0LzAyL3Byb3RvdHlwYWwtaW5oZXJpdGFuY2Utd2l0aC1zdGFtcHMvXG4gICAqIGh0dHBzOi8vd3d3LmJhcmt3ZWIuY28udWsvYmxvZy9vYmplY3QtY29tcG9zaXRpb24tYW5kLXByb3RvdHlwaWNhbC1pbmhlcml0YW5jZS1pbi1qYXZhc2NyaXB0XG4gICAqXG4gICAqIFByb3RvdHlwZSBvYmplY3QgcmVxdWlyZXMgYSBtZXRob2RzIG9iamVjdCwgcHJpdmF0ZSBjbG9zdXJlcyBhbmQgc3RhdGUgaXMgb3B0aW9uYWxcbiAgICpcbiAgICogQHBhcmFtIHByb3RvdHlwZVxuICAgKiBAcmV0dXJucyBOZXcgb2JqZWN0IHVzaW5nIHByb3RvdHlwZS5tZXRob2RzIGFzIHNvdXJjZVxuICAgKi9cbiAgYmFzaWNGYWN0b3J5OiBmdW5jdGlvbiAocHJvdG90eXBlKSB7XG4gICAgdmFyIHByb3RvID0gcHJvdG90eXBlLFxuICAgICAgICBvYmogICA9IE9iamVjdC5jcmVhdGUocHJvdG8ubWV0aG9kcyk7XG5cbiAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkoJ2Nsb3N1cmUnKSkge1xuICAgICAgcHJvdG8uY2xvc3VyZXMuZm9yRWFjaChmdW5jdGlvbiAoY2xvc3VyZSkge1xuICAgICAgICBjbG9zdXJlLmNhbGwob2JqKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnc3RhdGUnKSkge1xuICAgICAgZm9yICh2YXIga2V5IGluIHByb3RvLnN0YXRlKSB7XG4gICAgICAgIG9ialtrZXldID0gcHJvdG8uc3RhdGVba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gICAqXG4gICAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gICAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAgICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gICAqXG4gICAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICAgKlxuICAgKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gICAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAgICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gICAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAgICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gICAqXG4gICAqL1xuICAvKipcbiAgICogQ29uc3RydWN0cyBhbiBlbnVtZXJhdGlvbiB3aXRoIGtleXMgZXF1YWwgdG8gdGhlaXIgdmFsdWUuXG4gICAqXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9TVFJNTC9rZXltaXJyb3JcbiAgICpcbiAgICogRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqICAgdmFyIENPTE9SUyA9IGtleU1pcnJvcih7Ymx1ZTogbnVsbCwgcmVkOiBudWxsfSk7XG4gICAqICAgdmFyIG15Q29sb3IgPSBDT0xPUlMuYmx1ZTtcbiAgICogICB2YXIgaXNDb2xvclZhbGlkID0gISFDT0xPUlNbbXlDb2xvcl07XG4gICAqXG4gICAqIFRoZSBsYXN0IGxpbmUgY291bGQgbm90IGJlIHBlcmZvcm1lZCBpZiB0aGUgdmFsdWVzIG9mIHRoZSBnZW5lcmF0ZWQgZW51bSB3ZXJlXG4gICAqIG5vdCBlcXVhbCB0byB0aGVpciBrZXlzLlxuICAgKlxuICAgKiAgIElucHV0OiAge2tleTE6IHZhbDEsIGtleTI6IHZhbDJ9XG4gICAqICAgT3V0cHV0OiB7a2V5MToga2V5MSwga2V5Mjoga2V5Mn1cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IG9ialxuICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAqL1xuICBrZXlNaXJyb3I6IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcmV0ID0ge307XG4gICAgdmFyIGtleTtcbiAgICBpZiAoIShvYmogaW5zdGFuY2VvZiBPYmplY3QgJiYgIUFycmF5LmlzQXJyYXkob2JqKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigna2V5TWlycm9yKC4uLik6IEFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0LicpO1xuICAgIH1cbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICByZXRba2V5XSA9IGtleTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBleGlzdHkgICAgIDogZnVuY3Rpb24gKHgpIHtcbiAgICByZXR1cm4geCAhPT0gbnVsbDtcbiAgfSxcbiAgdHJ1dGh5ICAgICA6IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuICh4ICE9PSBmYWxzZSkgJiYgdGhpcy5leGlzdHkoeCk7XG4gIH0sXG4gIGZhbHNleSAgICAgOiBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiAhdGhpcy50cnV0aHkoeCk7XG4gIH0sXG4gIGZ1bmMgICAgICAgOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmplY3QgPT09IFwiZnVuY3Rpb25cIjtcbiAgfSxcbiAgb2JqZWN0ICAgICA6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT09IFwiW29iamVjdCBPYmplY3RdXCI7XG4gIH0sXG4gIG9iamVjdEVtcHR5OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIHN0cmluZyAgICAgOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09PSBcIltvYmplY3QgU3RyaW5nXVwiO1xuICB9LFxuICBhcnJheSAgICAgIDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KG9iamVjdCk7XG4gICAgLy9yZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH0sXG4gIHByb21pc2UgICAgOiBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIHJldHVybiBwcm9taXNlICYmIHR5cGVvZiBwcm9taXNlLnRoZW4gPT09ICdmdW5jdGlvbic7XG4gIH0sXG4gIG9ic2VydmFibGUgOiBmdW5jdGlvbiAob2JzZXJ2YWJsZSkge1xuICAgIHJldHVybiBvYnNlcnZhYmxlICYmIHR5cGVvZiBvYnNlcnZhYmxlLnN1YnNjcmliZSA9PT0gJ2Z1bmN0aW9uJztcbiAgfSxcbiAgZWxlbWVudCAgICA6IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gdHlwZW9mIEhUTUxFbGVtZW50ID09PSAnb2JqZWN0JyA/XG4gICAgb2JqIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgfHwgb2JqIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCA6IC8vRE9NMlxuICAgIG9iaiAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiBvYmogIT09IG51bGwgJiZcbiAgICAob2JqLm5vZGVUeXBlID09PSAxIHx8IG9iai5ub2RlVHlwZSA9PT0gMTEpICYmXG4gICAgdHlwZW9mIG9iai5ub2RlTmFtZSA9PT0gJ3N0cmluZyc7XG4gIH1cbn07IiwiLyoqXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiAgQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiAgVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiAgTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiAgb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cbiFmdW5jdGlvbih0LGUpe1wib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzJiZcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlP21vZHVsZS5leHBvcnRzPWUoKTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKGUpOnQuSW1tdXRhYmxlPWUoKX0odGhpcyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCxlKXtlJiYodC5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZShlLnByb3RvdHlwZSkpLHQucHJvdG90eXBlLmNvbnN0cnVjdG9yPXR9ZnVuY3Rpb24gZSh0KXtyZXR1cm4gdC52YWx1ZT0hMSx0fWZ1bmN0aW9uIHIodCl7dCYmKHQudmFsdWU9ITApfWZ1bmN0aW9uIG4oKXt9ZnVuY3Rpb24gaSh0LGUpe2U9ZXx8MDtmb3IodmFyIHI9TWF0aC5tYXgoMCx0Lmxlbmd0aC1lKSxuPUFycmF5KHIpLGk9MDtyPmk7aSsrKW5baV09dFtpK2VdO3JldHVybiBufWZ1bmN0aW9uIG8odCl7cmV0dXJuIHZvaWQgMD09PXQuc2l6ZSYmKHQuc2l6ZT10Ll9faXRlcmF0ZShzKSksdC5zaXplfWZ1bmN0aW9uIHUodCxlKXtpZihcIm51bWJlclwiIT10eXBlb2YgZSl7dmFyIHI9ZT4+PjA7aWYoXCJcIityIT09ZXx8NDI5NDk2NzI5NT09PXIpcmV0dXJuIE5hTjtlPXJ9cmV0dXJuIDA+ZT9vKHQpK2U6ZX1mdW5jdGlvbiBzKCl7cmV0dXJuITB9ZnVuY3Rpb24gYSh0LGUscil7cmV0dXJuKDA9PT10fHx2b2lkIDAhPT1yJiYtcj49dCkmJih2b2lkIDA9PT1lfHx2b2lkIDAhPT1yJiZlPj1yKX1mdW5jdGlvbiBoKHQsZSl7cmV0dXJuIGModCxlLDApfWZ1bmN0aW9uIGYodCxlKXtyZXR1cm4gYyh0LGUsZSl9ZnVuY3Rpb24gYyh0LGUscil7cmV0dXJuIHZvaWQgMD09PXQ/cjowPnQ/TWF0aC5tYXgoMCxlK3QpOnZvaWQgMD09PWU/dDpNYXRoLm1pbihlLHQpfWZ1bmN0aW9uIF8odCl7cmV0dXJuIHkodCk/dDpPKHQpfWZ1bmN0aW9uIHAodCl7cmV0dXJuIGQodCk/dDp4KHQpfWZ1bmN0aW9uIHYodCl7cmV0dXJuIG0odCk/dDprKHQpfWZ1bmN0aW9uIGwodCl7cmV0dXJuIHkodCkmJiFnKHQpP3Q6QSh0KX1mdW5jdGlvbiB5KHQpe3JldHVybiEoIXR8fCF0W3ZyXSl9ZnVuY3Rpb24gZCh0KXtyZXR1cm4hKCF0fHwhdFtscl0pfWZ1bmN0aW9uIG0odCl7cmV0dXJuISghdHx8IXRbeXJdKX1mdW5jdGlvbiBnKHQpe3JldHVybiBkKHQpfHxtKHQpfWZ1bmN0aW9uIHcodCl7cmV0dXJuISghdHx8IXRbZHJdKX1mdW5jdGlvbiBTKHQpe3RoaXMubmV4dD10fWZ1bmN0aW9uIHoodCxlLHIsbil7dmFyIGk9MD09PXQ/ZToxPT09dD9yOltlLHJdO3JldHVybiBuP24udmFsdWU9aTpuPXt2YWx1ZTppLGRvbmU6ITF9LG59ZnVuY3Rpb24gSSgpe3JldHVybnt2YWx1ZTp2b2lkIDAsZG9uZTohMH19ZnVuY3Rpb24gYih0KXtyZXR1cm4hIU0odCl9ZnVuY3Rpb24gcSh0KXtyZXR1cm4gdCYmXCJmdW5jdGlvblwiPT10eXBlb2YgdC5uZXh0fWZ1bmN0aW9uIEQodCl7dmFyIGU9TSh0KTtyZXR1cm4gZSYmZS5jYWxsKHQpfWZ1bmN0aW9uIE0odCl7dmFyIGU9dCYmKFNyJiZ0W1NyXXx8dFt6cl0pO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIGU/ZTp2b2lkIDB9ZnVuY3Rpb24gRSh0KXtyZXR1cm4gdCYmXCJudW1iZXJcIj09dHlwZW9mIHQubGVuZ3RofWZ1bmN0aW9uIE8odCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP3QudG9TZXEoKTpDKHQpfWZ1bmN0aW9uIHgodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P1QoKS50b0tleWVkU2VxKCk6eSh0KT9kKHQpP3QudG9TZXEoKTp0LmZyb21FbnRyeVNlcSgpOlcodCl9ZnVuY3Rpb24gayh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/VCgpOnkodCk/ZCh0KT90LmVudHJ5U2VxKCk6dC50b0luZGV4ZWRTZXEoKTpCKHQpfWZ1bmN0aW9uIEEodCl7cmV0dXJuKG51bGw9PT10fHx2b2lkIDA9PT10P1QoKTp5KHQpP2QodCk/dC5lbnRyeVNlcSgpOnQ6Qih0KSkudG9TZXRTZXEoKX1mdW5jdGlvbiBqKHQpe3RoaXMuX2FycmF5PXQsdGhpcy5zaXplPXQubGVuZ3RofWZ1bmN0aW9uIFIodCl7dmFyIGU9T2JqZWN0LmtleXModCk7dGhpcy5fb2JqZWN0PXQsdGhpcy5fa2V5cz1lLFxuICB0aGlzLnNpemU9ZS5sZW5ndGh9ZnVuY3Rpb24gVSh0KXt0aGlzLl9pdGVyYWJsZT10LHRoaXMuc2l6ZT10Lmxlbmd0aHx8dC5zaXplfWZ1bmN0aW9uIEsodCl7dGhpcy5faXRlcmF0b3I9dCx0aGlzLl9pdGVyYXRvckNhY2hlPVtdfWZ1bmN0aW9uIEwodCl7cmV0dXJuISghdHx8IXRbYnJdKX1mdW5jdGlvbiBUKCl7cmV0dXJuIHFyfHwocXI9bmV3IGooW10pKX1mdW5jdGlvbiBXKHQpe3ZhciBlPUFycmF5LmlzQXJyYXkodCk/bmV3IGoodCkuZnJvbUVudHJ5U2VxKCk6cSh0KT9uZXcgSyh0KS5mcm9tRW50cnlTZXEoKTpiKHQpP25ldyBVKHQpLmZyb21FbnRyeVNlcSgpOlwib2JqZWN0XCI9PXR5cGVvZiB0P25ldyBSKHQpOnZvaWQgMDtpZighZSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgQXJyYXkgb3IgaXRlcmFibGUgb2JqZWN0IG9mIFtrLCB2XSBlbnRyaWVzLCBvciBrZXllZCBvYmplY3Q6IFwiK3QpO3JldHVybiBlfWZ1bmN0aW9uIEIodCl7dmFyIGU9Sih0KTtpZighZSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgQXJyYXkgb3IgaXRlcmFibGUgb2JqZWN0IG9mIHZhbHVlczogXCIrdCk7cmV0dXJuIGV9ZnVuY3Rpb24gQyh0KXt2YXIgZT1KKHQpfHxcIm9iamVjdFwiPT10eXBlb2YgdCYmbmV3IFIodCk7aWYoIWUpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiB2YWx1ZXMsIG9yIGtleWVkIG9iamVjdDogXCIrdCk7cmV0dXJuIGV9ZnVuY3Rpb24gSih0KXtyZXR1cm4gRSh0KT9uZXcgaih0KTpxKHQpP25ldyBLKHQpOmIodCk/bmV3IFUodCk6dm9pZCAwfWZ1bmN0aW9uIE4odCxlLHIsbil7dmFyIGk9dC5fY2FjaGU7aWYoaSl7Zm9yKHZhciBvPWkubGVuZ3RoLTEsdT0wO28+PXU7dSsrKXt2YXIgcz1pW3I/by11OnVdO2lmKGUoc1sxXSxuP3NbMF06dSx0KT09PSExKXJldHVybiB1KzF9cmV0dXJuIHV9cmV0dXJuIHQuX19pdGVyYXRlVW5jYWNoZWQoZSxyKX1mdW5jdGlvbiBQKHQsZSxyLG4pe3ZhciBpPXQuX2NhY2hlO2lmKGkpe3ZhciBvPWkubGVuZ3RoLTEsdT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0PWlbcj9vLXU6dV07cmV0dXJuIHUrKz5vP0koKTp6KGUsbj90WzBdOnUtMSx0WzFdKX0pfXJldHVybiB0Ll9faXRlcmF0b3JVbmNhY2hlZChlLHIpfWZ1bmN0aW9uIEgoKXt0aHJvdyBUeXBlRXJyb3IoXCJBYnN0cmFjdFwiKX1mdW5jdGlvbiBWKCl7fWZ1bmN0aW9uIFkoKXt9ZnVuY3Rpb24gUSgpe31mdW5jdGlvbiBYKHQsZSl7aWYodD09PWV8fHQhPT10JiZlIT09ZSlyZXR1cm4hMDtpZighdHx8IWUpcmV0dXJuITE7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC52YWx1ZU9mJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBlLnZhbHVlT2Ype2lmKHQ9dC52YWx1ZU9mKCksZT1lLnZhbHVlT2YoKSx0PT09ZXx8dCE9PXQmJmUhPT1lKXJldHVybiEwO2lmKCF0fHwhZSlyZXR1cm4hMX1yZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmVxdWFscyYmXCJmdW5jdGlvblwiPT10eXBlb2YgZS5lcXVhbHMmJnQuZXF1YWxzKGUpPyEwOiExfWZ1bmN0aW9uIEYodCxlKXtyZXR1cm4gZT9HKGUsdCxcIlwiLHtcIlwiOnR9KTpaKHQpfWZ1bmN0aW9uIEcodCxlLHIsbil7cmV0dXJuIEFycmF5LmlzQXJyYXkoZSk/dC5jYWxsKG4scixrKGUpLm1hcChmdW5jdGlvbihyLG4pe3JldHVybiBHKHQscixuLGUpfSkpOiQoZSk/dC5jYWxsKG4scix4KGUpLm1hcChmdW5jdGlvbihyLG4pe3JldHVybiBHKHQscixuLGUpfSkpOmV9ZnVuY3Rpb24gWih0KXtyZXR1cm4gQXJyYXkuaXNBcnJheSh0KT9rKHQpLm1hcChaKS50b0xpc3QoKTokKHQpP3godCkubWFwKFopLnRvTWFwKCk6dH1mdW5jdGlvbiAkKHQpe3JldHVybiB0JiYodC5jb25zdHJ1Y3Rvcj09PU9iamVjdHx8dm9pZCAwPT09dC5jb25zdHJ1Y3Rvcil9ZnVuY3Rpb24gdHQodCl7cmV0dXJuIHQ+Pj4xJjEwNzM3NDE4MjR8MzIyMTIyNTQ3MSZ0fWZ1bmN0aW9uIGV0KHQpe2lmKHQ9PT0hMXx8bnVsbD09PXR8fHZvaWQgMD09PXQpcmV0dXJuIDA7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC52YWx1ZU9mJiYodD10LnZhbHVlT2YoKSxcbiAgdD09PSExfHxudWxsPT09dHx8dm9pZCAwPT09dCkpcmV0dXJuIDA7aWYodD09PSEwKXJldHVybiAxO3ZhciBlPXR5cGVvZiB0O2lmKFwibnVtYmVyXCI9PT1lKXt2YXIgcj0wfHQ7Zm9yKHIhPT10JiYocl49NDI5NDk2NzI5NSp0KTt0PjQyOTQ5NjcyOTU7KXQvPTQyOTQ5NjcyOTUscl49dDtyZXR1cm4gdHQocil9aWYoXCJzdHJpbmdcIj09PWUpcmV0dXJuIHQubGVuZ3RoPmpyP3J0KHQpOm50KHQpO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQuaGFzaENvZGUpcmV0dXJuIHQuaGFzaENvZGUoKTtpZihcIm9iamVjdFwiPT09ZSlyZXR1cm4gaXQodCk7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdC50b1N0cmluZylyZXR1cm4gbnQoXCJcIit0KTt0aHJvdyBFcnJvcihcIlZhbHVlIHR5cGUgXCIrZStcIiBjYW5ub3QgYmUgaGFzaGVkLlwiKX1mdW5jdGlvbiBydCh0KXt2YXIgZT1Lclt0XTtyZXR1cm4gdm9pZCAwPT09ZSYmKGU9bnQodCksVXI9PT1SciYmKFVyPTAsS3I9e30pLFVyKyssS3JbdF09ZSksZX1mdW5jdGlvbiBudCh0KXtmb3IodmFyIGU9MCxyPTA7dC5sZW5ndGg+cjtyKyspZT0zMSplK3QuY2hhckNvZGVBdChyKXwwO3JldHVybiB0dChlKX1mdW5jdGlvbiBpdCh0KXt2YXIgZTtpZih4ciYmKGU9RHIuZ2V0KHQpLHZvaWQgMCE9PWUpKXJldHVybiBlO2lmKGU9dFtBcl0sdm9pZCAwIT09ZSlyZXR1cm4gZTtpZighT3Ipe2lmKGU9dC5wcm9wZXJ0eUlzRW51bWVyYWJsZSYmdC5wcm9wZXJ0eUlzRW51bWVyYWJsZVtBcl0sdm9pZCAwIT09ZSlyZXR1cm4gZTtpZihlPW90KHQpLHZvaWQgMCE9PWUpcmV0dXJuIGV9aWYoZT0rK2tyLDEwNzM3NDE4MjQma3ImJihrcj0wKSx4cilEci5zZXQodCxlKTtlbHNle2lmKHZvaWQgMCE9PUVyJiZFcih0KT09PSExKXRocm93IEVycm9yKFwiTm9uLWV4dGVuc2libGUgb2JqZWN0cyBhcmUgbm90IGFsbG93ZWQgYXMga2V5cy5cIik7aWYoT3IpT2JqZWN0LmRlZmluZVByb3BlcnR5KHQsQXIse2VudW1lcmFibGU6ITEsY29uZmlndXJhYmxlOiExLHdyaXRhYmxlOiExLHZhbHVlOmV9KTtlbHNlIGlmKHZvaWQgMCE9PXQucHJvcGVydHlJc0VudW1lcmFibGUmJnQucHJvcGVydHlJc0VudW1lcmFibGU9PT10LmNvbnN0cnVjdG9yLnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZSl0LnByb3BlcnR5SXNFbnVtZXJhYmxlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sdC5wcm9wZXJ0eUlzRW51bWVyYWJsZVtBcl09ZTtlbHNle2lmKHZvaWQgMD09PXQubm9kZVR5cGUpdGhyb3cgRXJyb3IoXCJVbmFibGUgdG8gc2V0IGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgb24gb2JqZWN0LlwiKTt0W0FyXT1lfX1yZXR1cm4gZX1mdW5jdGlvbiBvdCh0KXtpZih0JiZ0Lm5vZGVUeXBlPjApc3dpdGNoKHQubm9kZVR5cGUpe2Nhc2UgMTpyZXR1cm4gdC51bmlxdWVJRDtjYXNlIDk6cmV0dXJuIHQuZG9jdW1lbnRFbGVtZW50JiZ0LmRvY3VtZW50RWxlbWVudC51bmlxdWVJRH19ZnVuY3Rpb24gdXQodCxlKXtpZighdCl0aHJvdyBFcnJvcihlKX1mdW5jdGlvbiBzdCh0KXt1dCh0IT09MS8wLFwiQ2Fubm90IHBlcmZvcm0gdGhpcyBhY3Rpb24gd2l0aCBhbiBpbmZpbml0ZSBzaXplLlwiKX1mdW5jdGlvbiBhdCh0LGUpe3RoaXMuX2l0ZXI9dCx0aGlzLl91c2VLZXlzPWUsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBodCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBmdCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBjdCh0KXt0aGlzLl9pdGVyPXQsdGhpcy5zaXplPXQuc2l6ZX1mdW5jdGlvbiBfdCh0KXt2YXIgZT1qdCh0KTtyZXR1cm4gZS5faXRlcj10LGUuc2l6ZT10LnNpemUsZS5mbGlwPWZ1bmN0aW9uKCl7cmV0dXJuIHR9LGUucmV2ZXJzZT1mdW5jdGlvbigpe3ZhciBlPXQucmV2ZXJzZS5hcHBseSh0aGlzKTtyZXR1cm4gZS5mbGlwPWZ1bmN0aW9uKCl7cmV0dXJuIHQucmV2ZXJzZSgpfSxlfSxlLmhhcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5pbmNsdWRlcyhlKTtcbn0sZS5pbmNsdWRlcz1mdW5jdGlvbihlKXtyZXR1cm4gdC5oYXMoZSl9LGUuY2FjaGVSZXN1bHQ9UnQsZS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihlLHIpe3ZhciBuPXRoaXM7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUocix0LG4pIT09ITF9LHIpfSxlLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihlLHIpe2lmKGU9PT13cil7dmFyIG49dC5fX2l0ZXJhdG9yKGUscik7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHQ9bi5uZXh0KCk7aWYoIXQuZG9uZSl7dmFyIGU9dC52YWx1ZVswXTt0LnZhbHVlWzBdPXQudmFsdWVbMV0sdC52YWx1ZVsxXT1lfXJldHVybiB0fSl9cmV0dXJuIHQuX19pdGVyYXRvcihlPT09Z3I/bXI6Z3Iscil9LGV9ZnVuY3Rpb24gcHQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLnNpemU9dC5zaXplLG4uaGFzPWZ1bmN0aW9uKGUpe3JldHVybiB0LmhhcyhlKX0sbi5nZXQ9ZnVuY3Rpb24obixpKXt2YXIgbz10LmdldChuLGNyKTtyZXR1cm4gbz09PWNyP2k6ZS5jYWxsKHIsbyxuLHQpfSxuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpLHUpe3JldHVybiBuKGUuY2FsbChyLHQsaSx1KSxpLG8pIT09ITF9LGkpfSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuX19pdGVyYXRvcih3cixpKTtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgaT1vLm5leHQoKTtpZihpLmRvbmUpcmV0dXJuIGk7dmFyIHU9aS52YWx1ZSxzPXVbMF07cmV0dXJuIHoobixzLGUuY2FsbChyLHVbMV0scyx0KSxpKX0pfSxufWZ1bmN0aW9uIHZ0KHQsZSl7dmFyIHI9anQodCk7cmV0dXJuIHIuX2l0ZXI9dCxyLnNpemU9dC5zaXplLHIucmV2ZXJzZT1mdW5jdGlvbigpe3JldHVybiB0fSx0LmZsaXAmJihyLmZsaXA9ZnVuY3Rpb24oKXt2YXIgZT1fdCh0KTtyZXR1cm4gZS5yZXZlcnNlPWZ1bmN0aW9uKCl7cmV0dXJuIHQuZmxpcCgpfSxlfSksci5nZXQ9ZnVuY3Rpb24ocixuKXtyZXR1cm4gdC5nZXQoZT9yOi0xLXIsbil9LHIuaGFzPWZ1bmN0aW9uKHIpe3JldHVybiB0LmhhcyhlP3I6LTEtcil9LHIuaW5jbHVkZXM9ZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9LHIuY2FjaGVSZXN1bHQ9UnQsci5fX2l0ZXJhdGU9ZnVuY3Rpb24oZSxyKXt2YXIgbj10aGlzO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LHIpe3JldHVybiBlKHQscixuKX0sIXIpfSxyLl9faXRlcmF0b3I9ZnVuY3Rpb24oZSxyKXtyZXR1cm4gdC5fX2l0ZXJhdG9yKGUsIXIpfSxyfWZ1bmN0aW9uIGx0KHQsZSxyLG4pe3ZhciBpPWp0KHQpO3JldHVybiBuJiYoaS5oYXM9ZnVuY3Rpb24obil7dmFyIGk9dC5nZXQobixjcik7cmV0dXJuIGkhPT1jciYmISFlLmNhbGwocixpLG4sdCl9LGkuZ2V0PWZ1bmN0aW9uKG4saSl7dmFyIG89dC5nZXQobixjcik7cmV0dXJuIG8hPT1jciYmZS5jYWxsKHIsbyxuLHQpP286aX0pLGkuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10aGlzLHM9MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxvLGEpe3JldHVybiBlLmNhbGwocix0LG8sYSk/KHMrKyxpKHQsbj9vOnMtMSx1KSk6dm9pZCAwfSxvKSxzfSxpLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihpLG8pe3ZhciB1PXQuX19pdGVyYXRvcih3cixvKSxzPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7Zm9yKDs7KXt2YXIgbz11Lm5leHQoKTtpZihvLmRvbmUpcmV0dXJuIG87dmFyIGE9by52YWx1ZSxoPWFbMF0sZj1hWzFdO2lmKGUuY2FsbChyLGYsaCx0KSlyZXR1cm4geihpLG4/aDpzKyssZixvKX19KX0saX1mdW5jdGlvbiB5dCh0LGUscil7dmFyIG49THQoKS5hc011dGFibGUoKTtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24oaSxvKXtuLnVwZGF0ZShlLmNhbGwocixpLG8sdCksMCxmdW5jdGlvbih0KXtyZXR1cm4gdCsxfSl9KSxuLmFzSW1tdXRhYmxlKCl9ZnVuY3Rpb24gZHQodCxlLHIpe3ZhciBuPWQodCksaT0odyh0KT9JZSgpOkx0KCkpLmFzTXV0YWJsZSgpO1xuICB0Ll9faXRlcmF0ZShmdW5jdGlvbihvLHUpe2kudXBkYXRlKGUuY2FsbChyLG8sdSx0KSxmdW5jdGlvbih0KXtyZXR1cm4gdD10fHxbXSx0LnB1c2gobj9bdSxvXTpvKSx0fSl9KTt2YXIgbz1BdCh0KTtyZXR1cm4gaS5tYXAoZnVuY3Rpb24oZSl7cmV0dXJuIE90KHQsbyhlKSl9KX1mdW5jdGlvbiBtdCh0LGUscixuKXt2YXIgaT10LnNpemU7aWYodm9pZCAwIT09ZSYmKGU9MHxlKSx2b2lkIDAhPT1yJiYocj0wfHIpLGEoZSxyLGkpKXJldHVybiB0O3ZhciBvPWgoZSxpKSxzPWYocixpKTtpZihvIT09b3x8cyE9PXMpcmV0dXJuIG10KHQudG9TZXEoKS5jYWNoZVJlc3VsdCgpLGUscixuKTt2YXIgYyxfPXMtbztfPT09XyYmKGM9MD5fPzA6Xyk7dmFyIHA9anQodCk7cmV0dXJuIHAuc2l6ZT0wPT09Yz9jOnQuc2l6ZSYmY3x8dm9pZCAwLCFuJiZMKHQpJiZjPj0wJiYocC5nZXQ9ZnVuY3Rpb24oZSxyKXtyZXR1cm4gZT11KHRoaXMsZSksZT49MCYmYz5lP3QuZ2V0KGUrbyxyKTpyfSkscC5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbihlLHIpe3ZhciBpPXRoaXM7aWYoMD09PWMpcmV0dXJuIDA7aWYocilyZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShlLHIpO3ZhciB1PTAscz0hMCxhPTA7cmV0dXJuIHQuX19pdGVyYXRlKGZ1bmN0aW9uKHQscil7cmV0dXJuIHMmJihzPXUrKzxvKT92b2lkIDA6KGErKyxlKHQsbj9yOmEtMSxpKSE9PSExJiZhIT09Yyl9KSxhfSxwLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihlLHIpe2lmKDAhPT1jJiZyKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihlLHIpO3ZhciBpPTAhPT1jJiZ0Ll9faXRlcmF0b3IoZSxyKSx1PTAscz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7dSsrPG87KWkubmV4dCgpO2lmKCsrcz5jKXJldHVybiBJKCk7dmFyIHQ9aS5uZXh0KCk7cmV0dXJuIG58fGU9PT1ncj90OmU9PT1tcj96KGUscy0xLHZvaWQgMCx0KTp6KGUscy0xLHQudmFsdWVbMV0sdCl9KX0scH1mdW5jdGlvbiBndCh0LGUscil7dmFyIG49anQodCk7cmV0dXJuIG4uX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24obixpKXt2YXIgbz10aGlzO2lmKGkpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUobixpKTt2YXIgdT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LGkscyl7cmV0dXJuIGUuY2FsbChyLHQsaSxzKSYmKyt1JiZuKHQsaSxvKX0pLHV9LG4uX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7dmFyIG89dGhpcztpZihpKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcihuLGkpO3ZhciB1PXQuX19pdGVyYXRvcih3cixpKSxzPSEwO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2lmKCFzKXJldHVybiBJKCk7dmFyIHQ9dS5uZXh0KCk7aWYodC5kb25lKXJldHVybiB0O3ZhciBpPXQudmFsdWUsYT1pWzBdLGg9aVsxXTtyZXR1cm4gZS5jYWxsKHIsaCxhLG8pP249PT13cj90OnoobixhLGgsdCk6KHM9ITEsSSgpKX0pfSxufWZ1bmN0aW9uIHd0KHQsZSxyLG4pe3ZhciBpPWp0KHQpO3JldHVybiBpLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKGksbyl7dmFyIHU9dGhpcztpZihvKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGksbyk7dmFyIHM9ITAsYT0wO3JldHVybiB0Ll9faXRlcmF0ZShmdW5jdGlvbih0LG8saCl7cmV0dXJuIHMmJihzPWUuY2FsbChyLHQsbyxoKSk/dm9pZCAwOihhKyssaSh0LG4/bzphLTEsdSkpfSksYX0saS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24oaSxvKXt2YXIgdT10aGlzO2lmKG8pcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKGksbyk7dmFyIHM9dC5fX2l0ZXJhdG9yKHdyLG8pLGE9ITAsaD0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciB0LG8sZjtkb3tpZih0PXMubmV4dCgpLHQuZG9uZSlyZXR1cm4gbnx8aT09PWdyP3Q6aT09PW1yP3ooaSxoKyssdm9pZCAwLHQpOnooaSxoKyssdC52YWx1ZVsxXSx0KTt2YXIgYz10LnZhbHVlO289Y1swXSxmPWNbMV0sYSYmKGE9ZS5jYWxsKHIsZixvLHUpKX13aGlsZShhKTtcbiAgcmV0dXJuIGk9PT13cj90OnooaSxvLGYsdCl9KX0saX1mdW5jdGlvbiBTdCh0LGUpe3ZhciByPWQodCksbj1bdF0uY29uY2F0KGUpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4geSh0KT9yJiYodD1wKHQpKTp0PXI/Vyh0KTpCKEFycmF5LmlzQXJyYXkodCk/dDpbdF0pLHR9KS5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIDAhPT10LnNpemV9KTtpZigwPT09bi5sZW5ndGgpcmV0dXJuIHQ7aWYoMT09PW4ubGVuZ3RoKXt2YXIgaT1uWzBdO2lmKGk9PT10fHxyJiZkKGkpfHxtKHQpJiZtKGkpKXJldHVybiBpfXZhciBvPW5ldyBqKG4pO3JldHVybiByP289by50b0tleWVkU2VxKCk6bSh0KXx8KG89by50b1NldFNlcSgpKSxvPW8uZmxhdHRlbighMCksby5zaXplPW4ucmVkdWNlKGZ1bmN0aW9uKHQsZSl7aWYodm9pZCAwIT09dCl7dmFyIHI9ZS5zaXplO2lmKHZvaWQgMCE9PXIpcmV0dXJuIHQrcn19LDApLG99ZnVuY3Rpb24genQodCxlLHIpe3ZhciBuPWp0KHQpO3JldHVybiBuLl9faXRlcmF0ZVVuY2FjaGVkPWZ1bmN0aW9uKG4saSl7ZnVuY3Rpb24gbyh0LGEpe3ZhciBoPXRoaXM7dC5fX2l0ZXJhdGUoZnVuY3Rpb24odCxpKXtyZXR1cm4oIWV8fGU+YSkmJnkodCk/byh0LGErMSk6bih0LHI/aTp1KyssaCk9PT0hMSYmKHM9ITApLCFzfSxpKX12YXIgdT0wLHM9ITE7cmV0dXJuIG8odCwwKSx1fSxuLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbihuLGkpe3ZhciBvPXQuX19pdGVyYXRvcihuLGkpLHU9W10scz0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7bzspe3ZhciB0PW8ubmV4dCgpO2lmKHQuZG9uZT09PSExKXt2YXIgYT10LnZhbHVlO2lmKG49PT13ciYmKGE9YVsxXSksZSYmIShlPnUubGVuZ3RoKXx8IXkoYSkpcmV0dXJuIHI/dDp6KG4scysrLGEsdCk7dS5wdXNoKG8pLG89YS5fX2l0ZXJhdG9yKG4saSl9ZWxzZSBvPXUucG9wKCl9cmV0dXJuIEkoKX0pfSxufWZ1bmN0aW9uIEl0KHQsZSxyKXt2YXIgbj1BdCh0KTtyZXR1cm4gdC50b1NlcSgpLm1hcChmdW5jdGlvbihpLG8pe3JldHVybiBuKGUuY2FsbChyLGksbyx0KSl9KS5mbGF0dGVuKCEwKX1mdW5jdGlvbiBidCh0LGUpe3ZhciByPWp0KHQpO3JldHVybiByLnNpemU9dC5zaXplJiYyKnQuc2l6ZS0xLHIuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24ocixuKXt2YXIgaT10aGlzLG89MDtyZXR1cm4gdC5fX2l0ZXJhdGUoZnVuY3Rpb24odCl7cmV0dXJuKCFvfHxyKGUsbysrLGkpIT09ITEpJiZyKHQsbysrLGkpIT09ITF9LG4pLG99LHIuX19pdGVyYXRvclVuY2FjaGVkPWZ1bmN0aW9uKHIsbil7dmFyIGksbz10Ll9faXRlcmF0b3IoZ3IsbiksdT0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybighaXx8dSUyKSYmKGk9by5uZXh0KCksaS5kb25lKT9pOnUlMj96KHIsdSsrLGUpOnoocix1KyssaS52YWx1ZSxpKX0pfSxyfWZ1bmN0aW9uIHF0KHQsZSxyKXtlfHwoZT1VdCk7dmFyIG49ZCh0KSxpPTAsbz10LnRvU2VxKCkubWFwKGZ1bmN0aW9uKGUsbil7cmV0dXJuW24sZSxpKysscj9yKGUsbix0KTplXX0pLnRvQXJyYXkoKTtyZXR1cm4gby5zb3J0KGZ1bmN0aW9uKHQscil7cmV0dXJuIGUodFszXSxyWzNdKXx8dFsyXS1yWzJdfSkuZm9yRWFjaChuP2Z1bmN0aW9uKHQsZSl7b1tlXS5sZW5ndGg9Mn06ZnVuY3Rpb24odCxlKXtvW2VdPXRbMV19KSxuP3gobyk6bSh0KT9rKG8pOkEobyl9ZnVuY3Rpb24gRHQodCxlLHIpe2lmKGV8fChlPVV0KSxyKXt2YXIgbj10LnRvU2VxKCkubWFwKGZ1bmN0aW9uKGUsbil7cmV0dXJuW2UscihlLG4sdCldfSkucmVkdWNlKGZ1bmN0aW9uKHQscil7cmV0dXJuIE10KGUsdFsxXSxyWzFdKT9yOnR9KTtyZXR1cm4gbiYmblswXX1yZXR1cm4gdC5yZWR1Y2UoZnVuY3Rpb24odCxyKXtyZXR1cm4gTXQoZSx0LHIpP3I6dH0pfWZ1bmN0aW9uIE10KHQsZSxyKXt2YXIgbj10KHIsZSk7cmV0dXJuIDA9PT1uJiZyIT09ZSYmKHZvaWQgMD09PXJ8fG51bGw9PT1yfHxyIT09cil8fG4+MH1mdW5jdGlvbiBFdCh0LGUscil7dmFyIG49anQodCk7cmV0dXJuIG4uc2l6ZT1uZXcgaihyKS5tYXAoZnVuY3Rpb24odCl7XG4gIHJldHVybiB0LnNpemV9KS5taW4oKSxuLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPXRoaXMuX19pdGVyYXRvcihncixlKSxpPTA7IShyPW4ubmV4dCgpKS5kb25lJiZ0KHIudmFsdWUsaSsrLHRoaXMpIT09ITE7KTtyZXR1cm4gaX0sbi5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxuKXt2YXIgaT1yLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdD1fKHQpLEQobj90LnJldmVyc2UoKTp0KX0pLG89MCx1PSExO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciByO3JldHVybiB1fHwocj1pLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdC5uZXh0KCl9KSx1PXIuc29tZShmdW5jdGlvbih0KXtyZXR1cm4gdC5kb25lfSkpLHU/SSgpOnoodCxvKyssZS5hcHBseShudWxsLHIubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0LnZhbHVlfSkpKX0pfSxufWZ1bmN0aW9uIE90KHQsZSl7cmV0dXJuIEwodCk/ZTp0LmNvbnN0cnVjdG9yKGUpfWZ1bmN0aW9uIHh0KHQpe2lmKHQhPT1PYmplY3QodCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIFtLLCBWXSB0dXBsZTogXCIrdCl9ZnVuY3Rpb24ga3QodCl7cmV0dXJuIHN0KHQuc2l6ZSksbyh0KX1mdW5jdGlvbiBBdCh0KXtyZXR1cm4gZCh0KT9wOm0odCk/djpsfWZ1bmN0aW9uIGp0KHQpe3JldHVybiBPYmplY3QuY3JlYXRlKChkKHQpP3g6bSh0KT9rOkEpLnByb3RvdHlwZSl9ZnVuY3Rpb24gUnQoKXtyZXR1cm4gdGhpcy5faXRlci5jYWNoZVJlc3VsdD8odGhpcy5faXRlci5jYWNoZVJlc3VsdCgpLHRoaXMuc2l6ZT10aGlzLl9pdGVyLnNpemUsdGhpcyk6Ty5wcm90b3R5cGUuY2FjaGVSZXN1bHQuY2FsbCh0aGlzKX1mdW5jdGlvbiBVdCh0LGUpe3JldHVybiB0PmU/MTplPnQ/LTE6MH1mdW5jdGlvbiBLdCh0KXt2YXIgZT1EKHQpO2lmKCFlKXtpZighRSh0KSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgaXRlcmFibGUgb3IgYXJyYXktbGlrZTogXCIrdCk7ZT1EKF8odCkpfXJldHVybiBlfWZ1bmN0aW9uIEx0KHQpe3JldHVybiBudWxsPT09dHx8dm9pZCAwPT09dD9RdCgpOlR0KHQpJiYhdyh0KT90OlF0KCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1wKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUuc2V0KHIsdCl9KX0pfWZ1bmN0aW9uIFR0KHQpe3JldHVybiEoIXR8fCF0W0xyXSl9ZnVuY3Rpb24gV3QodCxlKXt0aGlzLm93bmVySUQ9dCx0aGlzLmVudHJpZXM9ZX1mdW5jdGlvbiBCdCh0LGUscil7dGhpcy5vd25lcklEPXQsdGhpcy5iaXRtYXA9ZSx0aGlzLm5vZGVzPXJ9ZnVuY3Rpb24gQ3QodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMuY291bnQ9ZSx0aGlzLm5vZGVzPXJ9ZnVuY3Rpb24gSnQodCxlLHIpe3RoaXMub3duZXJJRD10LHRoaXMua2V5SGFzaD1lLHRoaXMuZW50cmllcz1yfWZ1bmN0aW9uIE50KHQsZSxyKXt0aGlzLm93bmVySUQ9dCx0aGlzLmtleUhhc2g9ZSx0aGlzLmVudHJ5PXJ9ZnVuY3Rpb24gUHQodCxlLHIpe3RoaXMuX3R5cGU9ZSx0aGlzLl9yZXZlcnNlPXIsdGhpcy5fc3RhY2s9dC5fcm9vdCYmVnQodC5fcm9vdCl9ZnVuY3Rpb24gSHQodCxlKXtyZXR1cm4geih0LGVbMF0sZVsxXSl9ZnVuY3Rpb24gVnQodCxlKXtyZXR1cm57bm9kZTp0LGluZGV4OjAsX19wcmV2OmV9fWZ1bmN0aW9uIFl0KHQsZSxyLG4pe3ZhciBpPU9iamVjdC5jcmVhdGUoVHIpO3JldHVybiBpLnNpemU9dCxpLl9yb290PWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGkuX19hbHRlcmVkPSExLGl9ZnVuY3Rpb24gUXQoKXtyZXR1cm4gV3J8fChXcj1ZdCgwKSl9ZnVuY3Rpb24gWHQodCxyLG4pe3ZhciBpLG87aWYodC5fcm9vdCl7dmFyIHU9ZShfcikscz1lKHByKTtpZihpPUZ0KHQuX3Jvb3QsdC5fX293bmVySUQsMCx2b2lkIDAscixuLHUscyksIXMudmFsdWUpcmV0dXJuIHQ7bz10LnNpemUrKHUudmFsdWU/bj09PWNyPy0xOjE6MCl9ZWxzZXtpZihuPT09Y3IpcmV0dXJuIHQ7bz0xLGk9bmV3IFd0KHQuX19vd25lcklELFtbcixuXV0pfXJldHVybiB0Ll9fb3duZXJJRD8odC5zaXplPW8sXG4gIHQuX3Jvb3Q9aSx0Ll9faGFzaD12b2lkIDAsdC5fX2FsdGVyZWQ9ITAsdCk6aT9ZdChvLGkpOlF0KCl9ZnVuY3Rpb24gRnQodCxlLG4saSxvLHUscyxhKXtyZXR1cm4gdD90LnVwZGF0ZShlLG4saSxvLHUscyxhKTp1PT09Y3I/dDoocihhKSxyKHMpLG5ldyBOdChlLGksW28sdV0pKX1mdW5jdGlvbiBHdCh0KXtyZXR1cm4gdC5jb25zdHJ1Y3Rvcj09PU50fHx0LmNvbnN0cnVjdG9yPT09SnR9ZnVuY3Rpb24gWnQodCxlLHIsbixpKXtpZih0LmtleUhhc2g9PT1uKXJldHVybiBuZXcgSnQoZSxuLFt0LmVudHJ5LGldKTt2YXIgbyx1PSgwPT09cj90LmtleUhhc2g6dC5rZXlIYXNoPj4+cikmZnIscz0oMD09PXI/bjpuPj4+cikmZnIsYT11PT09cz9bWnQodCxlLHIrYXIsbixpKV06KG89bmV3IE50KGUsbixpKSxzPnU/W3Qsb106W28sdF0pO3JldHVybiBuZXcgQnQoZSwxPDx1fDE8PHMsYSl9ZnVuY3Rpb24gJHQodCxlLHIsaSl7dHx8KHQ9bmV3IG4pO2Zvcih2YXIgbz1uZXcgTnQodCxldChyKSxbcixpXSksdT0wO2UubGVuZ3RoPnU7dSsrKXt2YXIgcz1lW3VdO289by51cGRhdGUodCwwLHZvaWQgMCxzWzBdLHNbMV0pfXJldHVybiBvfWZ1bmN0aW9uIHRlKHQsZSxyLG4pe2Zvcih2YXIgaT0wLG89MCx1PUFycmF5KHIpLHM9MCxhPTEsaD1lLmxlbmd0aDtoPnM7cysrLGE8PD0xKXt2YXIgZj1lW3NdO3ZvaWQgMCE9PWYmJnMhPT1uJiYoaXw9YSx1W28rK109Zil9cmV0dXJuIG5ldyBCdCh0LGksdSl9ZnVuY3Rpb24gZWUodCxlLHIsbixpKXtmb3IodmFyIG89MCx1PUFycmF5KGhyKSxzPTA7MCE9PXI7cysrLHI+Pj49MSl1W3NdPTEmcj9lW28rK106dm9pZCAwO3JldHVybiB1W25dPWksbmV3IEN0KHQsbysxLHUpfWZ1bmN0aW9uIHJlKHQsZSxyKXtmb3IodmFyIG49W10saT0wO3IubGVuZ3RoPmk7aSsrKXt2YXIgbz1yW2ldLHU9cChvKTt5KG8pfHwodT11Lm1hcChmdW5jdGlvbih0KXtyZXR1cm4gRih0KX0pKSxuLnB1c2godSl9cmV0dXJuIGllKHQsZSxuKX1mdW5jdGlvbiBuZSh0KXtyZXR1cm4gZnVuY3Rpb24oZSxyLG4pe3JldHVybiBlJiZlLm1lcmdlRGVlcFdpdGgmJnkocik/ZS5tZXJnZURlZXBXaXRoKHQscik6dD90KGUscixuKTpyfX1mdW5jdGlvbiBpZSh0LGUscil7cmV0dXJuIHI9ci5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIDAhPT10LnNpemV9KSwwPT09ci5sZW5ndGg/dDowIT09dC5zaXplfHx0Ll9fb3duZXJJRHx8MSE9PXIubGVuZ3RoP3Qud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXtmb3IodmFyIG49ZT9mdW5jdGlvbihyLG4pe3QudXBkYXRlKG4sY3IsZnVuY3Rpb24odCl7cmV0dXJuIHQ9PT1jcj9yOmUodCxyLG4pfSl9OmZ1bmN0aW9uKGUscil7dC5zZXQocixlKX0saT0wO3IubGVuZ3RoPmk7aSsrKXJbaV0uZm9yRWFjaChuKX0pOnQuY29uc3RydWN0b3IoclswXSl9ZnVuY3Rpb24gb2UodCxlLHIsbil7dmFyIGk9dD09PWNyLG89ZS5uZXh0KCk7aWYoby5kb25lKXt2YXIgdT1pP3I6dCxzPW4odSk7cmV0dXJuIHM9PT11P3Q6c311dChpfHx0JiZ0LnNldCxcImludmFsaWQga2V5UGF0aFwiKTt2YXIgYT1vLnZhbHVlLGg9aT9jcjp0LmdldChhLGNyKSxmPW9lKGgsZSxyLG4pO3JldHVybiBmPT09aD90OmY9PT1jcj90LnJlbW92ZShhKTooaT9RdCgpOnQpLnNldChhLGYpfWZ1bmN0aW9uIHVlKHQpe3JldHVybiB0LT10Pj4xJjE0MzE2NTU3NjUsdD0oODU4OTkzNDU5JnQpKyh0Pj4yJjg1ODk5MzQ1OSksdD10Kyh0Pj40KSYyNTI2NDUxMzUsdCs9dD4+OCx0Kz10Pj4xNiwxMjcmdH1mdW5jdGlvbiBzZSh0LGUscixuKXt2YXIgbz1uP3Q6aSh0KTtyZXR1cm4gb1tlXT1yLG99ZnVuY3Rpb24gYWUodCxlLHIsbil7dmFyIGk9dC5sZW5ndGgrMTtpZihuJiZlKzE9PT1pKXJldHVybiB0W2VdPXIsdDtmb3IodmFyIG89QXJyYXkoaSksdT0wLHM9MDtpPnM7cysrKXM9PT1lPyhvW3NdPXIsdT0tMSk6b1tzXT10W3MrdV07cmV0dXJuIG99ZnVuY3Rpb24gaGUodCxlLHIpe3ZhciBuPXQubGVuZ3RoLTE7aWYociYmZT09PW4pcmV0dXJuIHQucG9wKCksdDtmb3IodmFyIGk9QXJyYXkobiksbz0wLHU9MDtuPnU7dSsrKXU9PT1lJiYobz0xKSxcbiAgaVt1XT10W3Urb107cmV0dXJuIGl9ZnVuY3Rpb24gZmUodCl7dmFyIGU9bGUoKTtpZihudWxsPT09dHx8dm9pZCAwPT09dClyZXR1cm4gZTtpZihjZSh0KSlyZXR1cm4gdDt2YXIgcj12KHQpLG49ci5zaXplO3JldHVybiAwPT09bj9lOihzdChuKSxuPjAmJmhyPm4/dmUoMCxuLGFyLG51bGwsbmV3IF9lKHIudG9BcnJheSgpKSk6ZS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHQpe3Quc2V0U2l6ZShuKSxyLmZvckVhY2goZnVuY3Rpb24oZSxyKXtyZXR1cm4gdC5zZXQocixlKX0pfSkpfWZ1bmN0aW9uIGNlKHQpe3JldHVybiEoIXR8fCF0W05yXSl9ZnVuY3Rpb24gX2UodCxlKXt0aGlzLmFycmF5PXQsdGhpcy5vd25lcklEPWV9ZnVuY3Rpb24gcGUodCxlKXtmdW5jdGlvbiByKHQsZSxyKXtyZXR1cm4gMD09PWU/bih0LHIpOmkodCxlLHIpfWZ1bmN0aW9uIG4odCxyKXt2YXIgbj1yPT09cz9hJiZhLmFycmF5OnQmJnQuYXJyYXksaT1yPm8/MDpvLXIsaD11LXI7cmV0dXJuIGg+aHImJihoPWhyKSxmdW5jdGlvbigpe2lmKGk9PT1oKXJldHVybiBWcjt2YXIgdD1lPy0taDppKys7cmV0dXJuIG4mJm5bdF19fWZ1bmN0aW9uIGkodCxuLGkpe3ZhciBzLGE9dCYmdC5hcnJheSxoPWk+bz8wOm8taT4+bixmPSh1LWk+Pm4pKzE7cmV0dXJuIGY+aHImJihmPWhyKSxmdW5jdGlvbigpe2Zvcig7Oyl7aWYocyl7dmFyIHQ9cygpO2lmKHQhPT1WcilyZXR1cm4gdDtzPW51bGx9aWYoaD09PWYpcmV0dXJuIFZyO3ZhciBvPWU/LS1mOmgrKztzPXIoYSYmYVtvXSxuLWFyLGkrKG88PG4pKX19fXZhciBvPXQuX29yaWdpbix1PXQuX2NhcGFjaXR5LHM9emUodSksYT10Ll90YWlsO3JldHVybiByKHQuX3Jvb3QsdC5fbGV2ZWwsMCl9ZnVuY3Rpb24gdmUodCxlLHIsbixpLG8sdSl7dmFyIHM9T2JqZWN0LmNyZWF0ZShQcik7cmV0dXJuIHMuc2l6ZT1lLXQscy5fb3JpZ2luPXQscy5fY2FwYWNpdHk9ZSxzLl9sZXZlbD1yLHMuX3Jvb3Q9bixzLl90YWlsPWkscy5fX293bmVySUQ9byxzLl9faGFzaD11LHMuX19hbHRlcmVkPSExLHN9ZnVuY3Rpb24gbGUoKXtyZXR1cm4gSHJ8fChIcj12ZSgwLDAsYXIpKX1mdW5jdGlvbiB5ZSh0LHIsbil7aWYocj11KHQsciksciE9PXIpcmV0dXJuIHQ7aWYocj49dC5zaXplfHwwPnIpcmV0dXJuIHQud2l0aE11dGF0aW9ucyhmdW5jdGlvbih0KXswPnI/d2UodCxyKS5zZXQoMCxuKTp3ZSh0LDAscisxKS5zZXQocixuKX0pO3IrPXQuX29yaWdpbjt2YXIgaT10Ll90YWlsLG89dC5fcm9vdCxzPWUocHIpO3JldHVybiByPj16ZSh0Ll9jYXBhY2l0eSk/aT1kZShpLHQuX19vd25lcklELDAscixuLHMpOm89ZGUobyx0Ll9fb3duZXJJRCx0Ll9sZXZlbCxyLG4scykscy52YWx1ZT90Ll9fb3duZXJJRD8odC5fcm9vdD1vLHQuX3RhaWw9aSx0Ll9faGFzaD12b2lkIDAsdC5fX2FsdGVyZWQ9ITAsdCk6dmUodC5fb3JpZ2luLHQuX2NhcGFjaXR5LHQuX2xldmVsLG8saSk6dH1mdW5jdGlvbiBkZSh0LGUsbixpLG8sdSl7dmFyIHM9aT4+Pm4mZnIsYT10JiZ0LmFycmF5Lmxlbmd0aD5zO2lmKCFhJiZ2b2lkIDA9PT1vKXJldHVybiB0O3ZhciBoO2lmKG4+MCl7dmFyIGY9dCYmdC5hcnJheVtzXSxjPWRlKGYsZSxuLWFyLGksbyx1KTtyZXR1cm4gYz09PWY/dDooaD1tZSh0LGUpLGguYXJyYXlbc109YyxoKX1yZXR1cm4gYSYmdC5hcnJheVtzXT09PW8/dDoocih1KSxoPW1lKHQsZSksdm9pZCAwPT09byYmcz09PWguYXJyYXkubGVuZ3RoLTE/aC5hcnJheS5wb3AoKTpoLmFycmF5W3NdPW8saCl9ZnVuY3Rpb24gbWUodCxlKXtyZXR1cm4gZSYmdCYmZT09PXQub3duZXJJRD90Om5ldyBfZSh0P3QuYXJyYXkuc2xpY2UoKTpbXSxlKX1mdW5jdGlvbiBnZSh0LGUpe2lmKGU+PXplKHQuX2NhcGFjaXR5KSlyZXR1cm4gdC5fdGFpbDtpZigxPDx0Ll9sZXZlbCthcj5lKXtmb3IodmFyIHI9dC5fcm9vdCxuPXQuX2xldmVsO3ImJm4+MDspcj1yLmFycmF5W2U+Pj5uJmZyXSxuLT1hcjtyZXR1cm4gcn19ZnVuY3Rpb24gd2UodCxlLHIpe3ZvaWQgMCE9PWUmJihlPTB8ZSksdm9pZCAwIT09ciYmKHI9MHxyKTt2YXIgaT10Ll9fb3duZXJJRHx8bmV3IG4sbz10Ll9vcmlnaW4sdT10Ll9jYXBhY2l0eSxzPW8rZSxhPXZvaWQgMD09PXI/dTowPnI/dStyOm8rcjtcbiAgaWYocz09PW8mJmE9PT11KXJldHVybiB0O2lmKHM+PWEpcmV0dXJuIHQuY2xlYXIoKTtmb3IodmFyIGg9dC5fbGV2ZWwsZj10Ll9yb290LGM9MDswPnMrYzspZj1uZXcgX2UoZiYmZi5hcnJheS5sZW5ndGg/W3ZvaWQgMCxmXTpbXSxpKSxoKz1hcixjKz0xPDxoO2MmJihzKz1jLG8rPWMsYSs9Yyx1Kz1jKTtmb3IodmFyIF89emUodSkscD16ZShhKTtwPj0xPDxoK2FyOylmPW5ldyBfZShmJiZmLmFycmF5Lmxlbmd0aD9bZl06W10saSksaCs9YXI7dmFyIHY9dC5fdGFpbCxsPV8+cD9nZSh0LGEtMSk6cD5fP25ldyBfZShbXSxpKTp2O2lmKHYmJnA+XyYmdT5zJiZ2LmFycmF5Lmxlbmd0aCl7Zj1tZShmLGkpO2Zvcih2YXIgeT1mLGQ9aDtkPmFyO2QtPWFyKXt2YXIgbT1fPj4+ZCZmcjt5PXkuYXJyYXlbbV09bWUoeS5hcnJheVttXSxpKX15LmFycmF5W18+Pj5hciZmcl09dn1pZih1PmEmJihsPWwmJmwucmVtb3ZlQWZ0ZXIoaSwwLGEpKSxzPj1wKXMtPXAsYS09cCxoPWFyLGY9bnVsbCxsPWwmJmwucmVtb3ZlQmVmb3JlKGksMCxzKTtlbHNlIGlmKHM+b3x8Xz5wKXtmb3IoYz0wO2Y7KXt2YXIgZz1zPj4+aCZmcjtpZihnIT09cD4+PmgmZnIpYnJlYWs7ZyYmKGMrPSgxPDxoKSpnKSxoLT1hcixmPWYuYXJyYXlbZ119ZiYmcz5vJiYoZj1mLnJlbW92ZUJlZm9yZShpLGgscy1jKSksZiYmXz5wJiYoZj1mLnJlbW92ZUFmdGVyKGksaCxwLWMpKSxjJiYocy09YyxhLT1jKX1yZXR1cm4gdC5fX293bmVySUQ/KHQuc2l6ZT1hLXMsdC5fb3JpZ2luPXMsdC5fY2FwYWNpdHk9YSx0Ll9sZXZlbD1oLHQuX3Jvb3Q9Zix0Ll90YWlsPWwsdC5fX2hhc2g9dm9pZCAwLHQuX19hbHRlcmVkPSEwLHQpOnZlKHMsYSxoLGYsbCl9ZnVuY3Rpb24gU2UodCxlLHIpe2Zvcih2YXIgbj1bXSxpPTAsbz0wO3IubGVuZ3RoPm87bysrKXt2YXIgdT1yW29dLHM9dih1KTtzLnNpemU+aSYmKGk9cy5zaXplKSx5KHUpfHwocz1zLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gRih0KX0pKSxuLnB1c2gocyl9cmV0dXJuIGk+dC5zaXplJiYodD10LnNldFNpemUoaSkpLGllKHQsZSxuKX1mdW5jdGlvbiB6ZSh0KXtyZXR1cm4gaHI+dD8wOnQtMT4+PmFyPDxhcn1mdW5jdGlvbiBJZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/RGUoKTpiZSh0KT90OkRlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1wKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQscil7cmV0dXJuIGUuc2V0KHIsdCl9KX0pfWZ1bmN0aW9uIGJlKHQpe3JldHVybiBUdCh0KSYmdyh0KX1mdW5jdGlvbiBxZSh0LGUscixuKXt2YXIgaT1PYmplY3QuY3JlYXRlKEllLnByb3RvdHlwZSk7cmV0dXJuIGkuc2l6ZT10P3Quc2l6ZTowLGkuX21hcD10LGkuX2xpc3Q9ZSxpLl9fb3duZXJJRD1yLGkuX19oYXNoPW4saX1mdW5jdGlvbiBEZSgpe3JldHVybiBZcnx8KFlyPXFlKFF0KCksbGUoKSkpfWZ1bmN0aW9uIE1lKHQsZSxyKXt2YXIgbixpLG89dC5fbWFwLHU9dC5fbGlzdCxzPW8uZ2V0KGUpLGE9dm9pZCAwIT09cztpZihyPT09Y3Ipe2lmKCFhKXJldHVybiB0O3Uuc2l6ZT49aHImJnUuc2l6ZT49MipvLnNpemU/KGk9dS5maWx0ZXIoZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwIT09dCYmcyE9PWV9KSxuPWkudG9LZXllZFNlcSgpLm1hcChmdW5jdGlvbih0KXtyZXR1cm4gdFswXX0pLmZsaXAoKS50b01hcCgpLHQuX19vd25lcklEJiYobi5fX293bmVySUQ9aS5fX293bmVySUQ9dC5fX293bmVySUQpKToobj1vLnJlbW92ZShlKSxpPXM9PT11LnNpemUtMT91LnBvcCgpOnUuc2V0KHMsdm9pZCAwKSl9ZWxzZSBpZihhKXtpZihyPT09dS5nZXQocylbMV0pcmV0dXJuIHQ7bj1vLGk9dS5zZXQocyxbZSxyXSl9ZWxzZSBuPW8uc2V0KGUsdS5zaXplKSxpPXUuc2V0KHUuc2l6ZSxbZSxyXSk7cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9bi5zaXplLHQuX21hcD1uLHQuX2xpc3Q9aSx0Ll9faGFzaD12b2lkIDAsdCk6cWUobixpKX1mdW5jdGlvbiBFZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/a2UoKTpPZSh0KT90OmtlKCkudW5zaGlmdEFsbCh0KTtcbn1mdW5jdGlvbiBPZSh0KXtyZXR1cm4hKCF0fHwhdFtRcl0pfWZ1bmN0aW9uIHhlKHQsZSxyLG4pe3ZhciBpPU9iamVjdC5jcmVhdGUoWHIpO3JldHVybiBpLnNpemU9dCxpLl9oZWFkPWUsaS5fX293bmVySUQ9cixpLl9faGFzaD1uLGkuX19hbHRlcmVkPSExLGl9ZnVuY3Rpb24ga2UoKXtyZXR1cm4gRnJ8fChGcj14ZSgwKSl9ZnVuY3Rpb24gQWUodCl7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P0tlKCk6amUodCkmJiF3KHQpP3Q6S2UoKS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3ZhciByPWwodCk7c3Qoci5zaXplKSxyLmZvckVhY2goZnVuY3Rpb24odCl7cmV0dXJuIGUuYWRkKHQpfSl9KX1mdW5jdGlvbiBqZSh0KXtyZXR1cm4hKCF0fHwhdFtHcl0pfWZ1bmN0aW9uIFJlKHQsZSl7cmV0dXJuIHQuX19vd25lcklEPyh0LnNpemU9ZS5zaXplLHQuX21hcD1lLHQpOmU9PT10Ll9tYXA/dDowPT09ZS5zaXplP3QuX19lbXB0eSgpOnQuX19tYWtlKGUpfWZ1bmN0aW9uIFVlKHQsZSl7dmFyIHI9T2JqZWN0LmNyZWF0ZShacik7cmV0dXJuIHIuc2l6ZT10P3Quc2l6ZTowLHIuX21hcD10LHIuX19vd25lcklEPWUscn1mdW5jdGlvbiBLZSgpe3JldHVybiAkcnx8KCRyPVVlKFF0KCkpKX1mdW5jdGlvbiBMZSh0KXtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/QmUoKTpUZSh0KT90OkJlKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihlKXt2YXIgcj1sKHQpO3N0KHIuc2l6ZSksci5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSl9ZnVuY3Rpb24gVGUodCl7cmV0dXJuIGplKHQpJiZ3KHQpfWZ1bmN0aW9uIFdlKHQsZSl7dmFyIHI9T2JqZWN0LmNyZWF0ZSh0bik7cmV0dXJuIHIuc2l6ZT10P3Quc2l6ZTowLHIuX21hcD10LHIuX19vd25lcklEPWUscn1mdW5jdGlvbiBCZSgpe3JldHVybiBlbnx8KGVuPVdlKERlKCkpKX1mdW5jdGlvbiBDZSh0LGUpe3ZhciByLG49ZnVuY3Rpb24obyl7aWYobyBpbnN0YW5jZW9mIG4pcmV0dXJuIG87aWYoISh0aGlzIGluc3RhbmNlb2YgbikpcmV0dXJuIG5ldyBuKG8pO2lmKCFyKXtyPSEwO3ZhciB1PU9iamVjdC5rZXlzKHQpO1BlKGksdSksaS5zaXplPXUubGVuZ3RoLGkuX25hbWU9ZSxpLl9rZXlzPXUsaS5fZGVmYXVsdFZhbHVlcz10fXRoaXMuX21hcD1MdChvKX0saT1uLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHJuKTtyZXR1cm4gaS5jb25zdHJ1Y3Rvcj1uLG59ZnVuY3Rpb24gSmUodCxlLHIpe3ZhciBuPU9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHQpKTtyZXR1cm4gbi5fbWFwPWUsbi5fX293bmVySUQ9cixufWZ1bmN0aW9uIE5lKHQpe3JldHVybiB0Ll9uYW1lfHx0LmNvbnN0cnVjdG9yLm5hbWV8fFwiUmVjb3JkXCJ9ZnVuY3Rpb24gUGUodCxlKXt0cnl7ZS5mb3JFYWNoKEhlLmJpbmQodm9pZCAwLHQpKX1jYXRjaChyKXt9fWZ1bmN0aW9uIEhlKHQsZSl7T2JqZWN0LmRlZmluZVByb3BlcnR5KHQsZSx7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0KGUpfSxzZXQ6ZnVuY3Rpb24odCl7dXQodGhpcy5fX293bmVySUQsXCJDYW5ub3Qgc2V0IG9uIGFuIGltbXV0YWJsZSByZWNvcmQuXCIpLHRoaXMuc2V0KGUsdCl9fSl9ZnVuY3Rpb24gVmUodCxlKXtpZih0PT09ZSlyZXR1cm4hMDtpZigheShlKXx8dm9pZCAwIT09dC5zaXplJiZ2b2lkIDAhPT1lLnNpemUmJnQuc2l6ZSE9PWUuc2l6ZXx8dm9pZCAwIT09dC5fX2hhc2gmJnZvaWQgMCE9PWUuX19oYXNoJiZ0Ll9faGFzaCE9PWUuX19oYXNofHxkKHQpIT09ZChlKXx8bSh0KSE9PW0oZSl8fHcodCkhPT13KGUpKXJldHVybiExO2lmKDA9PT10LnNpemUmJjA9PT1lLnNpemUpcmV0dXJuITA7dmFyIHI9IWcodCk7aWYodyh0KSl7dmFyIG49dC5lbnRyaWVzKCk7cmV0dXJuIGUuZXZlcnkoZnVuY3Rpb24odCxlKXt2YXIgaT1uLm5leHQoKS52YWx1ZTtyZXR1cm4gaSYmWChpWzFdLHQpJiYocnx8WChpWzBdLGUpKX0pJiZuLm5leHQoKS5kb25lfXZhciBpPSExO2lmKHZvaWQgMD09PXQuc2l6ZSlpZih2b2lkIDA9PT1lLnNpemUpXCJmdW5jdGlvblwiPT10eXBlb2YgdC5jYWNoZVJlc3VsdCYmdC5jYWNoZVJlc3VsdCgpO2Vsc2V7XG4gIGk9ITA7dmFyIG89dDt0PWUsZT1vfXZhciB1PSEwLHM9ZS5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxuKXtyZXR1cm4ocj90LmhhcyhlKTppP1goZSx0LmdldChuLGNyKSk6WCh0LmdldChuLGNyKSxlKSk/dm9pZCAwOih1PSExLCExKX0pO3JldHVybiB1JiZ0LnNpemU9PT1zfWZ1bmN0aW9uIFllKHQsZSxyKXtpZighKHRoaXMgaW5zdGFuY2VvZiBZZSkpcmV0dXJuIG5ldyBZZSh0LGUscik7aWYodXQoMCE9PXIsXCJDYW5ub3Qgc3RlcCBhIFJhbmdlIGJ5IDBcIiksdD10fHwwLHZvaWQgMD09PWUmJihlPTEvMCkscj12b2lkIDA9PT1yPzE6TWF0aC5hYnMociksdD5lJiYocj0tciksdGhpcy5fc3RhcnQ9dCx0aGlzLl9lbmQ9ZSx0aGlzLl9zdGVwPXIsdGhpcy5zaXplPU1hdGgubWF4KDAsTWF0aC5jZWlsKChlLXQpL3ItMSkrMSksMD09PXRoaXMuc2l6ZSl7aWYobm4pcmV0dXJuIG5uO25uPXRoaXN9fWZ1bmN0aW9uIFFlKHQsZSl7aWYoISh0aGlzIGluc3RhbmNlb2YgUWUpKXJldHVybiBuZXcgUWUodCxlKTtpZih0aGlzLl92YWx1ZT10LHRoaXMuc2l6ZT12b2lkIDA9PT1lPzEvMDpNYXRoLm1heCgwLGUpLDA9PT10aGlzLnNpemUpe2lmKG9uKXJldHVybiBvbjtvbj10aGlzfX1mdW5jdGlvbiBYZSh0LGUpe3ZhciByPWZ1bmN0aW9uKHIpe3QucHJvdG90eXBlW3JdPWVbcl19O3JldHVybiBPYmplY3Qua2V5cyhlKS5mb3JFYWNoKHIpLE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMmJk9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZSkuZm9yRWFjaChyKSx0fWZ1bmN0aW9uIEZlKHQsZSl7cmV0dXJuIGV9ZnVuY3Rpb24gR2UodCxlKXtyZXR1cm5bZSx0XX1mdW5jdGlvbiBaZSh0KXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4hdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9fWZ1bmN0aW9uICRlKHQpe3JldHVybiBmdW5jdGlvbigpe3JldHVybi10LmFwcGx5KHRoaXMsYXJndW1lbnRzKX19ZnVuY3Rpb24gdHIodCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/SlNPTi5zdHJpbmdpZnkodCk6dH1mdW5jdGlvbiBlcigpe3JldHVybiBpKGFyZ3VtZW50cyl9ZnVuY3Rpb24gcnIodCxlKXtyZXR1cm4gZT50PzE6dD5lPy0xOjB9ZnVuY3Rpb24gbnIodCl7aWYodC5zaXplPT09MS8wKXJldHVybiAwO3ZhciBlPXcodCkscj1kKHQpLG49ZT8xOjAsaT10Ll9faXRlcmF0ZShyP2U/ZnVuY3Rpb24odCxlKXtuPTMxKm4rb3IoZXQodCksZXQoZSkpfDB9OmZ1bmN0aW9uKHQsZSl7bj1uK29yKGV0KHQpLGV0KGUpKXwwfTplP2Z1bmN0aW9uKHQpe249MzEqbitldCh0KXwwfTpmdW5jdGlvbih0KXtuPW4rZXQodCl8MH0pO3JldHVybiBpcihpLG4pfWZ1bmN0aW9uIGlyKHQsZSl7cmV0dXJuIGU9TXIoZSwzNDMyOTE4MzUzKSxlPU1yKGU8PDE1fGU+Pj4tMTUsNDYxODQ1OTA3KSxlPU1yKGU8PDEzfGU+Pj4tMTMsNSksZT0oZSszODY0MjkyMTk2fDApXnQsZT1NcihlXmU+Pj4xNiwyMjQ2ODIyNTA3KSxlPU1yKGVeZT4+PjEzLDMyNjY0ODk5MDkpLGU9dHQoZV5lPj4+MTYpfWZ1bmN0aW9uIG9yKHQsZSl7cmV0dXJuIHReZSsyNjU0NDM1NzY5Kyh0PDw2KSsodD4+Mil8MH12YXIgdXI9QXJyYXkucHJvdG90eXBlLnNsaWNlLHNyPVwiZGVsZXRlXCIsYXI9NSxocj0xPDxhcixmcj1oci0xLGNyPXt9LF9yPXt2YWx1ZTohMX0scHI9e3ZhbHVlOiExfTt0KHAsXyksdCh2LF8pLHQobCxfKSxfLmlzSXRlcmFibGU9eSxfLmlzS2V5ZWQ9ZCxfLmlzSW5kZXhlZD1tLF8uaXNBc3NvY2lhdGl2ZT1nLF8uaXNPcmRlcmVkPXcsXy5LZXllZD1wLF8uSW5kZXhlZD12LF8uU2V0PWw7dmFyIHZyPVwiQEBfX0lNTVVUQUJMRV9JVEVSQUJMRV9fQEBcIixscj1cIkBAX19JTU1VVEFCTEVfS0VZRURfX0BAXCIseXI9XCJAQF9fSU1NVVRBQkxFX0lOREVYRURfX0BAXCIsZHI9XCJAQF9fSU1NVVRBQkxFX09SREVSRURfX0BAXCIsbXI9MCxncj0xLHdyPTIsU3I9XCJmdW5jdGlvblwiPT10eXBlb2YgU3ltYm9sJiZTeW1ib2wuaXRlcmF0b3IsenI9XCJAQGl0ZXJhdG9yXCIsSXI9U3J8fHpyO1MucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuXCJbSXRlcmF0b3JdXCJ9LFMuS0VZUz1tcixcbiAgUy5WQUxVRVM9Z3IsUy5FTlRSSUVTPXdyLFMucHJvdG90eXBlLmluc3BlY3Q9Uy5wcm90b3R5cGUudG9Tb3VyY2U9ZnVuY3Rpb24oKXtyZXR1cm5cIlwiK3RoaXN9LFMucHJvdG90eXBlW0lyXT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSx0KE8sXyksTy5vZj1mdW5jdGlvbigpe3JldHVybiBPKGFyZ3VtZW50cyl9LE8ucHJvdG90eXBlLnRvU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LE8ucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlNlcSB7XCIsXCJ9XCIpfSxPLnByb3RvdHlwZS5jYWNoZVJlc3VsdD1mdW5jdGlvbigpe3JldHVybiF0aGlzLl9jYWNoZSYmdGhpcy5fX2l0ZXJhdGVVbmNhY2hlZCYmKHRoaXMuX2NhY2hlPXRoaXMuZW50cnlTZXEoKS50b0FycmF5KCksdGhpcy5zaXplPXRoaXMuX2NhY2hlLmxlbmd0aCksdGhpc30sTy5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE4odGhpcyx0LGUsITApfSxPLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFAodGhpcyx0LGUsITApfSx0KHgsTykseC5wcm90b3R5cGUudG9LZXllZFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSx0KGssTyksay5vZj1mdW5jdGlvbigpe3JldHVybiBrKGFyZ3VtZW50cyl9LGsucHJvdG90eXBlLnRvSW5kZXhlZFNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzfSxrLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJTZXEgW1wiLFwiXVwiKX0say5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIE4odGhpcyx0LGUsITEpfSxrLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIFAodGhpcyx0LGUsITEpfSx0KEEsTyksQS5vZj1mdW5jdGlvbigpe3JldHVybiBBKGFyZ3VtZW50cyl9LEEucHJvdG90eXBlLnRvU2V0U2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LE8uaXNTZXE9TCxPLktleWVkPXgsTy5TZXQ9QSxPLkluZGV4ZWQ9azt2YXIgYnI9XCJAQF9fSU1NVVRBQkxFX1NFUV9fQEBcIjtPLnByb3RvdHlwZVticl09ITAsdChqLGspLGoucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90aGlzLl9hcnJheVt1KHRoaXMsdCldOmV9LGoucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLl9hcnJheSxuPXIubGVuZ3RoLTEsaT0wO24+PWk7aSsrKWlmKHQocltlP24taTppXSxpLHRoaXMpPT09ITEpcmV0dXJuIGkrMTtyZXR1cm4gaX0sai5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX2FycmF5LG49ci5sZW5ndGgtMSxpPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7cmV0dXJuIGk+bj9JKCk6eih0LGkscltlP24taSsrOmkrK10pfSl9LHQoUix4KSxSLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdm9pZCAwPT09ZXx8dGhpcy5oYXModCk/dGhpcy5fb2JqZWN0W3RdOmV9LFIucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fb2JqZWN0Lmhhc093blByb3BlcnR5KHQpfSxSLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXtmb3IodmFyIHI9dGhpcy5fb2JqZWN0LG49dGhpcy5fa2V5cyxpPW4ubGVuZ3RoLTEsbz0wO2k+PW87bysrKXt2YXIgdT1uW2U/aS1vOm9dO2lmKHQoclt1XSx1LHRoaXMpPT09ITEpcmV0dXJuIG8rMX1yZXR1cm4gb30sUi5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX29iamVjdCxuPXRoaXMuX2tleXMsaT1uLmxlbmd0aC0xLG89MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgdT1uW2U/aS1vOm9dO3JldHVybiBvKys+aT9JKCk6eih0LHUsclt1XSl9KX0sUi5wcm90b3R5cGVbZHJdPSEwLHQoVSxrKSxVLnByb3RvdHlwZS5fX2l0ZXJhdGVVbmNhY2hlZD1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdGUodCxlKTt2YXIgcj10aGlzLl9pdGVyYWJsZSxuPUQociksaT0wO2lmKHEobikpZm9yKHZhciBvOyEobz1uLm5leHQoKSkuZG9uZSYmdChvLnZhbHVlLGkrKyx0aGlzKSE9PSExOyk7XG4gIHJldHVybiBpfSxVLnByb3RvdHlwZS5fX2l0ZXJhdG9yVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXJhYmxlLG49RChyKTtpZighcShuKSlyZXR1cm4gbmV3IFMoSSk7dmFyIGk9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXt2YXIgZT1uLm5leHQoKTtyZXR1cm4gZS5kb25lP2U6eih0LGkrKyxlLnZhbHVlKX0pfSx0KEssayksSy5wcm90b3R5cGUuX19pdGVyYXRlVW5jYWNoZWQ9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKHQsZSk7Zm9yKHZhciByPXRoaXMuX2l0ZXJhdG9yLG49dGhpcy5faXRlcmF0b3JDYWNoZSxpPTA7bi5sZW5ndGg+aTspaWYodChuW2ldLGkrKyx0aGlzKT09PSExKXJldHVybiBpO2Zvcih2YXIgbzshKG89ci5uZXh0KCkpLmRvbmU7KXt2YXIgdT1vLnZhbHVlO2lmKG5baV09dSx0KHUsaSsrLHRoaXMpPT09ITEpYnJlYWt9cmV0dXJuIGl9LEsucHJvdG90eXBlLl9faXRlcmF0b3JVbmNhY2hlZD1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHQsZSk7dmFyIHI9dGhpcy5faXRlcmF0b3Isbj10aGlzLl9pdGVyYXRvckNhY2hlLGk9MDtyZXR1cm4gbmV3IFMoZnVuY3Rpb24oKXtpZihpPj1uLmxlbmd0aCl7dmFyIGU9ci5uZXh0KCk7aWYoZS5kb25lKXJldHVybiBlO25baV09ZS52YWx1ZX1yZXR1cm4geih0LGksbltpKytdKX0pfTt2YXIgcXI7dChILF8pLHQoVixIKSx0KFksSCksdChRLEgpLEguS2V5ZWQ9VixILkluZGV4ZWQ9WSxILlNldD1RO3ZhciBEcixNcj1cImZ1bmN0aW9uXCI9PXR5cGVvZiBNYXRoLmltdWwmJi0yPT09TWF0aC5pbXVsKDQyOTQ5NjcyOTUsMik/TWF0aC5pbXVsOmZ1bmN0aW9uKHQsZSl7dD0wfHQsZT0wfGU7dmFyIHI9NjU1MzUmdCxuPTY1NTM1JmU7cmV0dXJuIHIqbisoKHQ+Pj4xNikqbityKihlPj4+MTYpPDwxNj4+PjApfDB9LEVyPU9iamVjdC5pc0V4dGVuc2libGUsT3I9ZnVuY3Rpb24oKXt0cnl7cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSxcIkBcIix7fSksITB9Y2F0Y2godCl7cmV0dXJuITF9fSgpLHhyPVwiZnVuY3Rpb25cIj09dHlwZW9mIFdlYWtNYXA7eHImJihEcj1uZXcgV2Vha01hcCk7dmFyIGtyPTAsQXI9XCJfX2ltbXV0YWJsZWhhc2hfX1wiO1wiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmKEFyPVN5bWJvbChBcikpO3ZhciBqcj0xNixScj0yNTUsVXI9MCxLcj17fTt0KGF0LHgpLGF0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5faXRlci5nZXQodCxlKX0sYXQucHJvdG90eXBlLmhhcz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5faXRlci5oYXModCl9LGF0LnByb3RvdHlwZS52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9pdGVyLnZhbHVlU2VxKCl9LGF0LnByb3RvdHlwZS5yZXZlcnNlPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcyxlPXZ0KHRoaXMsITApO3JldHVybiB0aGlzLl91c2VLZXlzfHwoZS52YWx1ZVNlcT1mdW5jdGlvbigpe3JldHVybiB0Ll9pdGVyLnRvU2VxKCkucmV2ZXJzZSgpfSksZX0sYXQucHJvdG90eXBlLm1hcD1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMsbj1wdCh0aGlzLHQsZSk7cmV0dXJuIHRoaXMuX3VzZUtleXN8fChuLnZhbHVlU2VxPWZ1bmN0aW9uKCl7cmV0dXJuIHIuX2l0ZXIudG9TZXEoKS5tYXAodCxlKX0pLG59LGF0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcixuPXRoaXM7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKHRoaXMuX3VzZUtleXM/ZnVuY3Rpb24oZSxyKXtyZXR1cm4gdChlLHIsbil9OihyPWU/a3QodGhpcyk6MCxmdW5jdGlvbihpKXtyZXR1cm4gdChpLGU/LS1yOnIrKyxuKX0pLGUpfSxhdC5wcm90b3R5cGUuX19pdGVyYXRvcj1mdW5jdGlvbih0LGUpe2lmKHRoaXMuX3VzZUtleXMpcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRvcih0LGUpO3ZhciByPXRoaXMuX2l0ZXIuX19pdGVyYXRvcihncixlKSxuPWU/a3QodGhpcyk6MDtcbiAgcmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGk9ci5uZXh0KCk7cmV0dXJuIGkuZG9uZT9pOnoodCxlPy0tbjpuKyssaS52YWx1ZSxpKX0pfSxhdC5wcm90b3R5cGVbZHJdPSEwLHQoaHQsayksaHQucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pdGVyLmluY2x1ZGVzKHQpfSxodC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiB0KGUsbisrLHIpfSxlKX0saHQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSksbj0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3ZhciBlPXIubmV4dCgpO3JldHVybiBlLmRvbmU/ZTp6KHQsbisrLGUudmFsdWUsZSl9KX0sdChmdCxBKSxmdC5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pdGVyLmluY2x1ZGVzKHQpfSxmdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoZnVuY3Rpb24oZSl7cmV0dXJuIHQoZSxlLHIpfSxlKX0sZnQucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9pdGVyLl9faXRlcmF0b3IoZ3IsZSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9ci5uZXh0KCk7cmV0dXJuIGUuZG9uZT9lOnoodCxlLnZhbHVlLGUudmFsdWUsZSl9KX0sdChjdCx4KSxjdC5wcm90b3R5cGUuZW50cnlTZXE9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faXRlci50b1NlcSgpfSxjdC5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoZnVuY3Rpb24oZSl7aWYoZSl7eHQoZSk7dmFyIG49eShlKTtyZXR1cm4gdChuP2UuZ2V0KDEpOmVbMV0sbj9lLmdldCgwKTplWzBdLHIpfX0sZSl9LGN0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5faXRlci5fX2l0ZXJhdG9yKGdyLGUpO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2Zvcig7Oyl7dmFyIGU9ci5uZXh0KCk7aWYoZS5kb25lKXJldHVybiBlO3ZhciBuPWUudmFsdWU7aWYobil7eHQobik7dmFyIGk9eShuKTtyZXR1cm4geih0LGk/bi5nZXQoMCk6blswXSxpP24uZ2V0KDEpOm5bMV0sZSl9fX0pfSxodC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9YXQucHJvdG90eXBlLmNhY2hlUmVzdWx0PWZ0LnByb3RvdHlwZS5jYWNoZVJlc3VsdD1jdC5wcm90b3R5cGUuY2FjaGVSZXN1bHQ9UnQsdChMdCxWKSxMdC5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiTWFwIHtcIixcIn1cIil9LEx0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5fcm9vdD90aGlzLl9yb290LmdldCgwLHZvaWQgMCx0LGUpOmV9LEx0LnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gWHQodGhpcyx0LGUpfSxMdC5wcm90b3R5cGUuc2V0SW49ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy51cGRhdGVJbih0LGNyLGZ1bmN0aW9uKCl7cmV0dXJuIGV9KX0sTHQucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gWHQodGhpcyx0LGNyKX0sTHQucHJvdG90eXBlLmRlbGV0ZUluPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnVwZGF0ZUluKHQsZnVuY3Rpb24oKXtyZXR1cm4gY3J9KX0sTHQucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbih0LGUscil7cmV0dXJuIDE9PT1hcmd1bWVudHMubGVuZ3RoP3QodGhpcyk6dGhpcy51cGRhdGVJbihbdF0sZSxyKX0sTHQucHJvdG90eXBlLnVwZGF0ZUluPWZ1bmN0aW9uKHQsZSxyKXtyfHwocj1lLGU9dm9pZCAwKTt2YXIgbj1vZSh0aGlzLEt0KHQpLGUscik7cmV0dXJuIG49PT1jcj92b2lkIDA6bn0sTHQucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5fcm9vdD1udWxsLFxuICB0aGlzLl9faGFzaD12b2lkIDAsdGhpcy5fX2FsdGVyZWQ9ITAsdGhpcyk6UXQoKX0sTHQucHJvdG90eXBlLm1lcmdlPWZ1bmN0aW9uKCl7cmV0dXJuIHJlKHRoaXMsdm9pZCAwLGFyZ3VtZW50cyl9LEx0LnByb3RvdHlwZS5tZXJnZVdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHJlKHRoaXMsdCxlKX0sTHQucHJvdG90eXBlLm1lcmdlSW49ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHRoaXMudXBkYXRlSW4odCxRdCgpLGZ1bmN0aW9uKHQpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQubWVyZ2U/dC5tZXJnZS5hcHBseSh0LGUpOmVbZS5sZW5ndGgtMV19KX0sTHQucHJvdG90eXBlLm1lcmdlRGVlcD1mdW5jdGlvbigpe3JldHVybiByZSh0aGlzLG5lKHZvaWQgMCksYXJndW1lbnRzKX0sTHQucHJvdG90eXBlLm1lcmdlRGVlcFdpdGg9ZnVuY3Rpb24odCl7dmFyIGU9dXIuY2FsbChhcmd1bWVudHMsMSk7cmV0dXJuIHJlKHRoaXMsbmUodCksZSl9LEx0LnByb3RvdHlwZS5tZXJnZURlZXBJbj1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gdGhpcy51cGRhdGVJbih0LFF0KCksZnVuY3Rpb24odCl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgdC5tZXJnZURlZXA/dC5tZXJnZURlZXAuYXBwbHkodCxlKTplW2UubGVuZ3RoLTFdfSl9LEx0LnByb3RvdHlwZS5zb3J0PWZ1bmN0aW9uKHQpe3JldHVybiBJZShxdCh0aGlzLHQpKX0sTHQucHJvdG90eXBlLnNvcnRCeT1mdW5jdGlvbih0LGUpe3JldHVybiBJZShxdCh0aGlzLGUsdCkpfSxMdC5wcm90b3R5cGUud2l0aE11dGF0aW9ucz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmFzTXV0YWJsZSgpO3JldHVybiB0KGUpLGUud2FzQWx0ZXJlZCgpP2UuX19lbnN1cmVPd25lcih0aGlzLl9fb3duZXJJRCk6dGhpc30sTHQucHJvdG90eXBlLmFzTXV0YWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fb3duZXJJRD90aGlzOnRoaXMuX19lbnN1cmVPd25lcihuZXcgbil9LEx0LnByb3RvdHlwZS5hc0ltbXV0YWJsZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fZW5zdXJlT3duZXIoKX0sTHQucHJvdG90eXBlLndhc0FsdGVyZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2FsdGVyZWR9LEx0LnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG5ldyBQdCh0aGlzLHQsZSl9LEx0LnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLG49MDtyZXR1cm4gdGhpcy5fcm9vdCYmdGhpcy5fcm9vdC5pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiBuKyssdChlWzFdLGVbMF0scil9LGUpLG59LEx0LnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe3JldHVybiB0PT09dGhpcy5fX293bmVySUQ/dGhpczp0P1l0KHRoaXMuc2l6ZSx0aGlzLl9yb290LHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX19hbHRlcmVkPSExLHRoaXMpfSxMdC5pc01hcD1UdDt2YXIgTHI9XCJAQF9fSU1NVVRBQkxFX01BUF9fQEBcIixUcj1MdC5wcm90b3R5cGU7VHJbTHJdPSEwLFRyW3NyXT1Uci5yZW1vdmUsVHIucmVtb3ZlSW49VHIuZGVsZXRlSW4sV3QucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXtmb3IodmFyIGk9dGhpcy5lbnRyaWVzLG89MCx1PWkubGVuZ3RoO3U+bztvKyspaWYoWChyLGlbb11bMF0pKXJldHVybiBpW29dWzFdO3JldHVybiBufSxXdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLG8sdSxzLGEpe2Zvcih2YXIgaD11PT09Y3IsZj10aGlzLmVudHJpZXMsYz0wLF89Zi5sZW5ndGg7Xz5jJiYhWChvLGZbY11bMF0pO2MrKyk7dmFyIHA9Xz5jO2lmKHA/ZltjXVsxXT09PXU6aClyZXR1cm4gdGhpcztpZihyKGEpLChofHwhcCkmJnIocyksIWh8fDEhPT1mLmxlbmd0aCl7aWYoIXAmJiFoJiZmLmxlbmd0aD49QnIpcmV0dXJuICR0KHQsZixvLHUpO3ZhciB2PXQmJnQ9PT10aGlzLm93bmVySUQsbD12P2Y6aShmKTtyZXR1cm4gcD9oP2M9PT1fLTE/bC5wb3AoKTpsW2NdPWwucG9wKCk6bFtjXT1bbyx1XTpsLnB1c2goW28sdV0pLFxuICB2Pyh0aGlzLmVudHJpZXM9bCx0aGlzKTpuZXcgV3QodCxsKX19LEJ0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlLHIsbil7dm9pZCAwPT09ZSYmKGU9ZXQocikpO3ZhciBpPTE8PCgoMD09PXQ/ZTplPj4+dCkmZnIpLG89dGhpcy5iaXRtYXA7cmV0dXJuIDA9PT0obyZpKT9uOnRoaXMubm9kZXNbdWUobyZpLTEpXS5nZXQodCthcixlLHIsbil9LEJ0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLHIsbixpLG8sdSl7dm9pZCAwPT09ciYmKHI9ZXQobikpO3ZhciBzPSgwPT09ZT9yOnI+Pj5lKSZmcixhPTE8PHMsaD10aGlzLmJpdG1hcCxmPTAhPT0oaCZhKTtpZighZiYmaT09PWNyKXJldHVybiB0aGlzO3ZhciBjPXVlKGgmYS0xKSxfPXRoaXMubm9kZXMscD1mP19bY106dm9pZCAwLHY9RnQocCx0LGUrYXIscixuLGksbyx1KTtpZih2PT09cClyZXR1cm4gdGhpcztpZighZiYmdiYmXy5sZW5ndGg+PUNyKXJldHVybiBlZSh0LF8saCxzLHYpO2lmKGYmJiF2JiYyPT09Xy5sZW5ndGgmJkd0KF9bMV5jXSkpcmV0dXJuIF9bMV5jXTtpZihmJiZ2JiYxPT09Xy5sZW5ndGgmJkd0KHYpKXJldHVybiB2O3ZhciBsPXQmJnQ9PT10aGlzLm93bmVySUQseT1mP3Y/aDpoXmE6aHxhLGQ9Zj92P3NlKF8sYyx2LGwpOmhlKF8sYyxsKTphZShfLGMsdixsKTtyZXR1cm4gbD8odGhpcy5iaXRtYXA9eSx0aGlzLm5vZGVzPWQsdGhpcyk6bmV3IEJ0KHQseSxkKX0sQ3QucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUscixuKXt2b2lkIDA9PT1lJiYoZT1ldChyKSk7dmFyIGk9KDA9PT10P2U6ZT4+PnQpJmZyLG89dGhpcy5ub2Rlc1tpXTtyZXR1cm4gbz9vLmdldCh0K2FyLGUscixuKTpufSxDdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxyLG4saSxvLHUpe3ZvaWQgMD09PXImJihyPWV0KG4pKTt2YXIgcz0oMD09PWU/cjpyPj4+ZSkmZnIsYT1pPT09Y3IsaD10aGlzLm5vZGVzLGY9aFtzXTtpZihhJiYhZilyZXR1cm4gdGhpczt2YXIgYz1GdChmLHQsZSthcixyLG4saSxvLHUpO2lmKGM9PT1mKXJldHVybiB0aGlzO3ZhciBfPXRoaXMuY291bnQ7aWYoZil7aWYoIWMmJihfLS0sSnI+XykpcmV0dXJuIHRlKHQsaCxfLHMpfWVsc2UgXysrO3ZhciBwPXQmJnQ9PT10aGlzLm93bmVySUQsdj1zZShoLHMsYyxwKTtyZXR1cm4gcD8odGhpcy5jb3VudD1fLHRoaXMubm9kZXM9dix0aGlzKTpuZXcgQ3QodCxfLHYpfSxKdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe2Zvcih2YXIgaT10aGlzLmVudHJpZXMsbz0wLHU9aS5sZW5ndGg7dT5vO28rKylpZihYKHIsaVtvXVswXSkpcmV0dXJuIGlbb11bMV07cmV0dXJuIG59LEp0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCxlLG4sbyx1LHMsYSl7dm9pZCAwPT09biYmKG49ZXQobykpO3ZhciBoPXU9PT1jcjtpZihuIT09dGhpcy5rZXlIYXNoKXJldHVybiBoP3RoaXM6KHIoYSkscihzKSxadCh0aGlzLHQsZSxuLFtvLHVdKSk7Zm9yKHZhciBmPXRoaXMuZW50cmllcyxjPTAsXz1mLmxlbmd0aDtfPmMmJiFYKG8sZltjXVswXSk7YysrKTt2YXIgcD1fPmM7aWYocD9mW2NdWzFdPT09dTpoKXJldHVybiB0aGlzO2lmKHIoYSksKGh8fCFwKSYmcihzKSxoJiYyPT09XylyZXR1cm4gbmV3IE50KHQsdGhpcy5rZXlIYXNoLGZbMV5jXSk7dmFyIHY9dCYmdD09PXRoaXMub3duZXJJRCxsPXY/ZjppKGYpO3JldHVybiBwP2g/Yz09PV8tMT9sLnBvcCgpOmxbY109bC5wb3AoKTpsW2NdPVtvLHVdOmwucHVzaChbbyx1XSksdj8odGhpcy5lbnRyaWVzPWwsdGhpcyk6bmV3IEp0KHQsdGhpcy5rZXlIYXNoLGwpfSxOdC5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSxyLG4pe3JldHVybiBYKHIsdGhpcy5lbnRyeVswXSk/dGhpcy5lbnRyeVsxXTpufSxOdC5wcm90b3R5cGUudXBkYXRlPWZ1bmN0aW9uKHQsZSxuLGksbyx1LHMpe3ZhciBhPW89PT1jcixoPVgoaSx0aGlzLmVudHJ5WzBdKTtyZXR1cm4oaD9vPT09dGhpcy5lbnRyeVsxXTphKT90aGlzOihyKHMpLGE/dm9pZCByKHUpOmg/dCYmdD09PXRoaXMub3duZXJJRD8odGhpcy5lbnRyeVsxXT1vLHRoaXMpOm5ldyBOdCh0LHRoaXMua2V5SGFzaCxbaSxvXSk6KHIodSksXG4gIFp0KHRoaXMsdCxlLGV0KGkpLFtpLG9dKSkpfSxXdC5wcm90b3R5cGUuaXRlcmF0ZT1KdC5wcm90b3R5cGUuaXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcj10aGlzLmVudHJpZXMsbj0wLGk9ci5sZW5ndGgtMTtpPj1uO24rKylpZih0KHJbZT9pLW46bl0pPT09ITEpcmV0dXJuITF9LEJ0LnByb3RvdHlwZS5pdGVyYXRlPUN0LnByb3RvdHlwZS5pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMubm9kZXMsbj0wLGk9ci5sZW5ndGgtMTtpPj1uO24rKyl7dmFyIG89cltlP2ktbjpuXTtpZihvJiZvLml0ZXJhdGUodCxlKT09PSExKXJldHVybiExfX0sTnQucHJvdG90eXBlLml0ZXJhdGU9ZnVuY3Rpb24odCl7cmV0dXJuIHQodGhpcy5lbnRyeSl9LHQoUHQsUyksUHQucHJvdG90eXBlLm5leHQ9ZnVuY3Rpb24oKXtmb3IodmFyIHQ9dGhpcy5fdHlwZSxlPXRoaXMuX3N0YWNrO2U7KXt2YXIgcixuPWUubm9kZSxpPWUuaW5kZXgrKztpZihuLmVudHJ5KXtpZigwPT09aSlyZXR1cm4gSHQodCxuLmVudHJ5KX1lbHNlIGlmKG4uZW50cmllcyl7aWYocj1uLmVudHJpZXMubGVuZ3RoLTEscj49aSlyZXR1cm4gSHQodCxuLmVudHJpZXNbdGhpcy5fcmV2ZXJzZT9yLWk6aV0pfWVsc2UgaWYocj1uLm5vZGVzLmxlbmd0aC0xLHI+PWkpe3ZhciBvPW4ubm9kZXNbdGhpcy5fcmV2ZXJzZT9yLWk6aV07aWYobyl7aWYoby5lbnRyeSlyZXR1cm4gSHQodCxvLmVudHJ5KTtlPXRoaXMuX3N0YWNrPVZ0KG8sZSl9Y29udGludWV9ZT10aGlzLl9zdGFjaz10aGlzLl9zdGFjay5fX3ByZXZ9cmV0dXJuIEkoKX07dmFyIFdyLEJyPWhyLzQsQ3I9aHIvMixKcj1oci80O3QoZmUsWSksZmUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxmZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKFwiTGlzdCBbXCIsXCJdXCIpfSxmZS5wcm90b3R5cGUuZ2V0PWZ1bmN0aW9uKHQsZSl7aWYodD11KHRoaXMsdCksdD49MCYmdGhpcy5zaXplPnQpe3QrPXRoaXMuX29yaWdpbjt2YXIgcj1nZSh0aGlzLHQpO3JldHVybiByJiZyLmFycmF5W3QmZnJdfXJldHVybiBlfSxmZS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHllKHRoaXMsdCxlKX0sZmUucHJvdG90eXBlLnJlbW92ZT1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5oYXModCk/MD09PXQ/dGhpcy5zaGlmdCgpOnQ9PT10aGlzLnNpemUtMT90aGlzLnBvcCgpOnRoaXMuc3BsaWNlKHQsMSk6dGhpc30sZmUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPXRoaXMuX29yaWdpbj10aGlzLl9jYXBhY2l0eT0wLHRoaXMuX2xldmVsPWFyLHRoaXMuX3Jvb3Q9dGhpcy5fdGFpbD1udWxsLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTpsZSgpfSxmZS5wcm90b3R5cGUucHVzaD1mdW5jdGlvbigpe3ZhciB0PWFyZ3VtZW50cyxlPXRoaXMuc2l6ZTtyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe3dlKHIsMCxlK3QubGVuZ3RoKTtmb3IodmFyIG49MDt0Lmxlbmd0aD5uO24rKylyLnNldChlK24sdFtuXSl9KX0sZmUucHJvdG90eXBlLnBvcD1mdW5jdGlvbigpe3JldHVybiB3ZSh0aGlzLDAsLTEpfSxmZS5wcm90b3R5cGUudW5zaGlmdD1mdW5jdGlvbigpe3ZhciB0PWFyZ3VtZW50cztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGUpe3dlKGUsLXQubGVuZ3RoKTtmb3IodmFyIHI9MDt0Lmxlbmd0aD5yO3IrKyllLnNldChyLHRbcl0pfSl9LGZlLnByb3RvdHlwZS5zaGlmdD1mdW5jdGlvbigpe3JldHVybiB3ZSh0aGlzLDEpfSxmZS5wcm90b3R5cGUubWVyZ2U9ZnVuY3Rpb24oKXtyZXR1cm4gU2UodGhpcyx2b2lkIDAsYXJndW1lbnRzKX0sZmUucHJvdG90eXBlLm1lcmdlV2l0aD1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gU2UodGhpcyx0LGUpfSxmZS5wcm90b3R5cGUubWVyZ2VEZWVwPWZ1bmN0aW9uKCl7cmV0dXJuIFNlKHRoaXMsbmUodm9pZCAwKSxhcmd1bWVudHMpO1xufSxmZS5wcm90b3R5cGUubWVyZ2VEZWVwV2l0aD1mdW5jdGlvbih0KXt2YXIgZT11ci5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gU2UodGhpcyxuZSh0KSxlKX0sZmUucHJvdG90eXBlLnNldFNpemU9ZnVuY3Rpb24odCl7cmV0dXJuIHdlKHRoaXMsMCx0KX0sZmUucHJvdG90eXBlLnNsaWNlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5zaXplO3JldHVybiBhKHQsZSxyKT90aGlzOndlKHRoaXMsaCh0LHIpLGYoZSxyKSl9LGZlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7dmFyIHI9MCxuPXBlKHRoaXMsZSk7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIGU9bigpO3JldHVybiBlPT09VnI/SSgpOnoodCxyKyssZSl9KX0sZmUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2Zvcih2YXIgcixuPTAsaT1wZSh0aGlzLGUpOyhyPWkoKSkhPT1WciYmdChyLG4rKyx0aGlzKSE9PSExOyk7cmV0dXJuIG59LGZlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe3JldHVybiB0PT09dGhpcy5fX293bmVySUQ/dGhpczp0P3ZlKHRoaXMuX29yaWdpbix0aGlzLl9jYXBhY2l0eSx0aGlzLl9sZXZlbCx0aGlzLl9yb290LHRoaXMuX3RhaWwsdCx0aGlzLl9faGFzaCk6KHRoaXMuX19vd25lcklEPXQsdGhpcyl9LGZlLmlzTGlzdD1jZTt2YXIgTnI9XCJAQF9fSU1NVVRBQkxFX0xJU1RfX0BAXCIsUHI9ZmUucHJvdG90eXBlO1ByW05yXT0hMCxQcltzcl09UHIucmVtb3ZlLFByLnNldEluPVRyLnNldEluLFByLmRlbGV0ZUluPVByLnJlbW92ZUluPVRyLnJlbW92ZUluLFByLnVwZGF0ZT1Uci51cGRhdGUsUHIudXBkYXRlSW49VHIudXBkYXRlSW4sUHIubWVyZ2VJbj1Uci5tZXJnZUluLFByLm1lcmdlRGVlcEluPVRyLm1lcmdlRGVlcEluLFByLndpdGhNdXRhdGlvbnM9VHIud2l0aE11dGF0aW9ucyxQci5hc011dGFibGU9VHIuYXNNdXRhYmxlLFByLmFzSW1tdXRhYmxlPVRyLmFzSW1tdXRhYmxlLFByLndhc0FsdGVyZWQ9VHIud2FzQWx0ZXJlZCxfZS5wcm90b3R5cGUucmVtb3ZlQmVmb3JlPWZ1bmN0aW9uKHQsZSxyKXtpZihyPT09ZT8xPDxlOjA9PT10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gdGhpczt2YXIgbj1yPj4+ZSZmcjtpZihuPj10aGlzLmFycmF5Lmxlbmd0aClyZXR1cm4gbmV3IF9lKFtdLHQpO3ZhciBpLG89MD09PW47aWYoZT4wKXt2YXIgdT10aGlzLmFycmF5W25dO2lmKGk9dSYmdS5yZW1vdmVCZWZvcmUodCxlLWFyLHIpLGk9PT11JiZvKXJldHVybiB0aGlzfWlmKG8mJiFpKXJldHVybiB0aGlzO3ZhciBzPW1lKHRoaXMsdCk7aWYoIW8pZm9yKHZhciBhPTA7bj5hO2ErKylzLmFycmF5W2FdPXZvaWQgMDtyZXR1cm4gaSYmKHMuYXJyYXlbbl09aSksc30sX2UucHJvdG90eXBlLnJlbW92ZUFmdGVyPWZ1bmN0aW9uKHQsZSxyKXtpZihyPT09KGU/MTw8ZTowKXx8MD09PXRoaXMuYXJyYXkubGVuZ3RoKXJldHVybiB0aGlzO3ZhciBuPXItMT4+PmUmZnI7aWYobj49dGhpcy5hcnJheS5sZW5ndGgpcmV0dXJuIHRoaXM7dmFyIGk7aWYoZT4wKXt2YXIgbz10aGlzLmFycmF5W25dO2lmKGk9byYmby5yZW1vdmVBZnRlcih0LGUtYXIsciksaT09PW8mJm49PT10aGlzLmFycmF5Lmxlbmd0aC0xKXJldHVybiB0aGlzfXZhciB1PW1lKHRoaXMsdCk7cmV0dXJuIHUuYXJyYXkuc3BsaWNlKG4rMSksaSYmKHUuYXJyYXlbbl09aSksdX07dmFyIEhyLFZyPXt9O3QoSWUsTHQpLEllLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sSWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIk9yZGVyZWRNYXAge1wiLFwifVwiKX0sSWUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuX21hcC5nZXQodCk7cmV0dXJuIHZvaWQgMCE9PXI/dGhpcy5fbGlzdC5nZXQocilbMV06ZX0sSWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5fbWFwLmNsZWFyKCksdGhpcy5fbGlzdC5jbGVhcigpLHRoaXMpOkRlKCk7XG59LEllLnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gTWUodGhpcyx0LGUpfSxJZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe3JldHVybiBNZSh0aGlzLHQsY3IpfSxJZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpfHx0aGlzLl9saXN0Lndhc0FsdGVyZWQoKX0sSWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHRoaXMuX2xpc3QuX19pdGVyYXRlKGZ1bmN0aW9uKGUpe3JldHVybiBlJiZ0KGVbMV0sZVswXSxyKX0sZSl9LEllLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2xpc3QuZnJvbUVudHJ5U2VxKCkuX19pdGVyYXRvcih0LGUpfSxJZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtpZih0PT09dGhpcy5fX293bmVySUQpcmV0dXJuIHRoaXM7dmFyIGU9dGhpcy5fbWFwLl9fZW5zdXJlT3duZXIodCkscj10aGlzLl9saXN0Ll9fZW5zdXJlT3duZXIodCk7cmV0dXJuIHQ/cWUoZSxyLHQsdGhpcy5fX2hhc2gpOih0aGlzLl9fb3duZXJJRD10LHRoaXMuX21hcD1lLHRoaXMuX2xpc3Q9cix0aGlzKX0sSWUuaXNPcmRlcmVkTWFwPWJlLEllLnByb3RvdHlwZVtkcl09ITAsSWUucHJvdG90eXBlW3NyXT1JZS5wcm90b3R5cGUucmVtb3ZlO3ZhciBZcjt0KEVlLFkpLEVlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlN0YWNrIFtcIixcIl1cIil9LEVlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLl9oZWFkO2Zvcih0PXUodGhpcyx0KTtyJiZ0LS07KXI9ci5uZXh0O3JldHVybiByP3IudmFsdWU6ZX0sRWUucHJvdG90eXBlLnBlZWs9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faGVhZCYmdGhpcy5faGVhZC52YWx1ZX0sRWUucHJvdG90eXBlLnB1c2g9ZnVuY3Rpb24oKXtpZigwPT09YXJndW1lbnRzLmxlbmd0aClyZXR1cm4gdGhpcztmb3IodmFyIHQ9dGhpcy5zaXplK2FyZ3VtZW50cy5sZW5ndGgsZT10aGlzLl9oZWFkLHI9YXJndW1lbnRzLmxlbmd0aC0xO3I+PTA7ci0tKWU9e3ZhbHVlOmFyZ3VtZW50c1tyXSxuZXh0OmV9O3JldHVybiB0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPXQsdGhpcy5faGVhZD1lLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZSh0LGUpfSxFZS5wcm90b3R5cGUucHVzaEFsbD1mdW5jdGlvbih0KXtpZih0PXYodCksMD09PXQuc2l6ZSlyZXR1cm4gdGhpcztzdCh0LnNpemUpO3ZhciBlPXRoaXMuc2l6ZSxyPXRoaXMuX2hlYWQ7cmV0dXJuIHQucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24odCl7ZSsrLHI9e3ZhbHVlOnQsbmV4dDpyfX0pLHRoaXMuX19vd25lcklEPyh0aGlzLnNpemU9ZSx0aGlzLl9oZWFkPXIsdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOnhlKGUscil9LEVlLnByb3RvdHlwZS5wb3A9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zbGljZSgxKX0sRWUucHJvdG90eXBlLnVuc2hpZnQ9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5wdXNoLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLnVuc2hpZnRBbGw9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMucHVzaEFsbCh0KX0sRWUucHJvdG90eXBlLnNoaWZ0PWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucG9wLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sRWUucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7cmV0dXJuIDA9PT10aGlzLnNpemU/dGhpczp0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPTAsdGhpcy5faGVhZD12b2lkIDAsdGhpcy5fX2hhc2g9dm9pZCAwLHRoaXMuX19hbHRlcmVkPSEwLHRoaXMpOmtlKCl9LEVlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe2lmKGEodCxlLHRoaXMuc2l6ZSkpcmV0dXJuIHRoaXM7dmFyIHI9aCh0LHRoaXMuc2l6ZSksbj1mKGUsdGhpcy5zaXplKTtpZihuIT09dGhpcy5zaXplKXJldHVybiBZLnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMsdCxlKTtcbiAgZm9yKHZhciBpPXRoaXMuc2l6ZS1yLG89dGhpcy5faGVhZDtyLS07KW89by5uZXh0O3JldHVybiB0aGlzLl9fb3duZXJJRD8odGhpcy5zaXplPWksdGhpcy5faGVhZD1vLHRoaXMuX19oYXNoPXZvaWQgMCx0aGlzLl9fYWx0ZXJlZD0hMCx0aGlzKTp4ZShpLG8pfSxFZS5wcm90b3R5cGUuX19lbnN1cmVPd25lcj1mdW5jdGlvbih0KXtyZXR1cm4gdD09PXRoaXMuX19vd25lcklEP3RoaXM6dD94ZSh0aGlzLnNpemUsdGhpcy5faGVhZCx0LHRoaXMuX19oYXNoKToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9fYWx0ZXJlZD0hMSx0aGlzKX0sRWUucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe2lmKGUpcmV0dXJuIHRoaXMucmV2ZXJzZSgpLl9faXRlcmF0ZSh0KTtmb3IodmFyIHI9MCxuPXRoaXMuX2hlYWQ7biYmdChuLnZhbHVlLHIrKyx0aGlzKSE9PSExOyluPW4ubmV4dDtyZXR1cm4gcn0sRWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXtpZihlKXJldHVybiB0aGlzLnJldmVyc2UoKS5fX2l0ZXJhdG9yKHQpO3ZhciByPTAsbj10aGlzLl9oZWFkO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe2lmKG4pe3ZhciBlPW4udmFsdWU7cmV0dXJuIG49bi5uZXh0LHoodCxyKyssZSl9cmV0dXJuIEkoKX0pfSxFZS5pc1N0YWNrPU9lO3ZhciBRcj1cIkBAX19JTU1VVEFCTEVfU1RBQ0tfX0BAXCIsWHI9RWUucHJvdG90eXBlO1hyW1FyXT0hMCxYci53aXRoTXV0YXRpb25zPVRyLndpdGhNdXRhdGlvbnMsWHIuYXNNdXRhYmxlPVRyLmFzTXV0YWJsZSxYci5hc0ltbXV0YWJsZT1Uci5hc0ltbXV0YWJsZSxYci53YXNBbHRlcmVkPVRyLndhc0FsdGVyZWQ7dmFyIEZyO3QoQWUsUSksQWUub2Y9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcyhhcmd1bWVudHMpfSxBZS5mcm9tS2V5cz1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcyhwKHQpLmtleVNlcSgpKX0sQWUucHJvdG90eXBlLnRvU3RyaW5nPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX190b1N0cmluZyhcIlNldCB7XCIsXCJ9XCIpfSxBZS5wcm90b3R5cGUuaGFzPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9tYXAuaGFzKHQpfSxBZS5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKHQpe3JldHVybiBSZSh0aGlzLHRoaXMuX21hcC5zZXQodCwhMCkpfSxBZS5wcm90b3R5cGUucmVtb3ZlPWZ1bmN0aW9uKHQpe3JldHVybiBSZSh0aGlzLHRoaXMuX21hcC5yZW1vdmUodCkpfSxBZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtyZXR1cm4gUmUodGhpcyx0aGlzLl9tYXAuY2xlYXIoKSl9LEFlLnByb3RvdHlwZS51bmlvbj1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO3JldHVybiB0PXQuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiAwIT09dC5zaXplfSksMD09PXQubGVuZ3RoP3RoaXM6MCE9PXRoaXMuc2l6ZXx8dGhpcy5fX293bmVySUR8fDEhPT10Lmxlbmd0aD90aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24oZSl7Zm9yKHZhciByPTA7dC5sZW5ndGg+cjtyKyspbCh0W3JdKS5mb3JFYWNoKGZ1bmN0aW9uKHQpe3JldHVybiBlLmFkZCh0KX0pfSk6dGhpcy5jb25zdHJ1Y3Rvcih0WzBdKX0sQWUucHJvdG90eXBlLmludGVyc2VjdD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDApO2lmKDA9PT10Lmxlbmd0aClyZXR1cm4gdGhpczt0PXQubWFwKGZ1bmN0aW9uKHQpe3JldHVybiBsKHQpfSk7dmFyIGU9dGhpcztyZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHIpe2UuZm9yRWFjaChmdW5jdGlvbihlKXt0LmV2ZXJ5KGZ1bmN0aW9uKHQpe3JldHVybiB0LmluY2x1ZGVzKGUpfSl8fHIucmVtb3ZlKGUpfSl9KX0sQWUucHJvdG90eXBlLnN1YnRyYWN0PWZ1bmN0aW9uKCl7dmFyIHQ9dXIuY2FsbChhcmd1bWVudHMsMCk7aWYoMD09PXQubGVuZ3RoKXJldHVybiB0aGlzO3Q9dC5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIGwodCl9KTt2YXIgZT10aGlzO3JldHVybiB0aGlzLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24ocil7ZS5mb3JFYWNoKGZ1bmN0aW9uKGUpe3Quc29tZShmdW5jdGlvbih0KXtyZXR1cm4gdC5pbmNsdWRlcyhlKX0pJiZyLnJlbW92ZShlKTtcbn0pfSl9LEFlLnByb3RvdHlwZS5tZXJnZT1mdW5jdGlvbigpe3JldHVybiB0aGlzLnVuaW9uLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sQWUucHJvdG90eXBlLm1lcmdlV2l0aD1mdW5jdGlvbigpe3ZhciB0PXVyLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiB0aGlzLnVuaW9uLmFwcGx5KHRoaXMsdCl9LEFlLnByb3RvdHlwZS5zb3J0PWZ1bmN0aW9uKHQpe3JldHVybiBMZShxdCh0aGlzLHQpKX0sQWUucHJvdG90eXBlLnNvcnRCeT1mdW5jdGlvbih0LGUpe3JldHVybiBMZShxdCh0aGlzLGUsdCkpfSxBZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXAud2FzQWx0ZXJlZCgpfSxBZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcztyZXR1cm4gdGhpcy5fbWFwLl9faXRlcmF0ZShmdW5jdGlvbihlLG4pe3JldHVybiB0KG4sbixyKX0sZSl9LEFlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX21hcC5tYXAoZnVuY3Rpb24odCxlKXtyZXR1cm4gZX0pLl9faXRlcmF0b3IodCxlKX0sQWUucHJvdG90eXBlLl9fZW5zdXJlT3duZXI9ZnVuY3Rpb24odCl7aWYodD09PXRoaXMuX19vd25lcklEKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P3RoaXMuX19tYWtlKGUsdCk6KHRoaXMuX19vd25lcklEPXQsdGhpcy5fbWFwPWUsdGhpcyl9LEFlLmlzU2V0PWplO3ZhciBHcj1cIkBAX19JTU1VVEFCTEVfU0VUX19AQFwiLFpyPUFlLnByb3RvdHlwZTtacltHcl09ITAsWnJbc3JdPVpyLnJlbW92ZSxaci5tZXJnZURlZXA9WnIubWVyZ2UsWnIubWVyZ2VEZWVwV2l0aD1aci5tZXJnZVdpdGgsWnIud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLFpyLmFzTXV0YWJsZT1Uci5hc011dGFibGUsWnIuYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsWnIuX19lbXB0eT1LZSxaci5fX21ha2U9VWU7dmFyICRyO3QoTGUsQWUpLExlLm9mPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMoYXJndW1lbnRzKX0sTGUuZnJvbUtleXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMocCh0KS5rZXlTZXEoKSl9LExlLnByb3RvdHlwZS50b1N0cmluZz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9fdG9TdHJpbmcoXCJPcmRlcmVkU2V0IHtcIixcIn1cIil9LExlLmlzT3JkZXJlZFNldD1UZTt2YXIgdG49TGUucHJvdG90eXBlO3RuW2RyXT0hMCx0bi5fX2VtcHR5PUJlLHRuLl9fbWFrZT1XZTt2YXIgZW47dChDZSxWKSxDZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX3RvU3RyaW5nKE5lKHRoaXMpK1wiIHtcIixcIn1cIil9LENlLnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2RlZmF1bHRWYWx1ZXMuaGFzT3duUHJvcGVydHkodCl9LENlLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtpZighdGhpcy5oYXModCkpcmV0dXJuIGU7dmFyIHI9dGhpcy5fZGVmYXVsdFZhbHVlc1t0XTtyZXR1cm4gdGhpcy5fbWFwP3RoaXMuX21hcC5nZXQodCxyKTpyfSxDZS5wcm90b3R5cGUuY2xlYXI9ZnVuY3Rpb24oKXtpZih0aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpcy5fbWFwJiZ0aGlzLl9tYXAuY2xlYXIoKSx0aGlzO3ZhciB0PXRoaXMuY29uc3RydWN0b3I7cmV0dXJuIHQuX2VtcHR5fHwodC5fZW1wdHk9SmUodGhpcyxRdCgpKSl9LENlLnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCxlKXtpZighdGhpcy5oYXModCkpdGhyb3cgRXJyb3IoJ0Nhbm5vdCBzZXQgdW5rbm93biBrZXkgXCInK3QrJ1wiIG9uICcrTmUodGhpcykpO3ZhciByPXRoaXMuX21hcCYmdGhpcy5fbWFwLnNldCh0LGUpO3JldHVybiB0aGlzLl9fb3duZXJJRHx8cj09PXRoaXMuX21hcD90aGlzOkplKHRoaXMscil9LENlLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24odCl7aWYoIXRoaXMuaGFzKHQpKXJldHVybiB0aGlzO3ZhciBlPXRoaXMuX21hcCYmdGhpcy5fbWFwLnJlbW92ZSh0KTtyZXR1cm4gdGhpcy5fX293bmVySUR8fGU9PT10aGlzLl9tYXA/dGhpczpKZSh0aGlzLGUpfSxDZS5wcm90b3R5cGUud2FzQWx0ZXJlZD1mdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKX0sQ2UucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBwKHRoaXMuX2RlZmF1bHRWYWx1ZXMpLm1hcChmdW5jdGlvbih0LGUpe3JldHVybiByLmdldChlKX0pLl9faXRlcmF0b3IodCxlKX0sQ2UucHJvdG90eXBlLl9faXRlcmF0ZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXM7cmV0dXJuIHAodGhpcy5fZGVmYXVsdFZhbHVlcykubWFwKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHIuZ2V0KGUpfSkuX19pdGVyYXRlKHQsZSl9LENlLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyPWZ1bmN0aW9uKHQpe2lmKHQ9PT10aGlzLl9fb3duZXJJRClyZXR1cm4gdGhpczt2YXIgZT10aGlzLl9tYXAmJnRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKHQpO3JldHVybiB0P0plKHRoaXMsZSx0KToodGhpcy5fX293bmVySUQ9dCx0aGlzLl9tYXA9ZSx0aGlzKX07dmFyIHJuPUNlLnByb3RvdHlwZTtybltzcl09cm4ucmVtb3ZlLHJuLmRlbGV0ZUluPXJuLnJlbW92ZUluPVRyLnJlbW92ZUluLHJuLm1lcmdlPVRyLm1lcmdlLHJuLm1lcmdlV2l0aD1Uci5tZXJnZVdpdGgscm4ubWVyZ2VJbj1Uci5tZXJnZUluLHJuLm1lcmdlRGVlcD1Uci5tZXJnZURlZXAscm4ubWVyZ2VEZWVwV2l0aD1Uci5tZXJnZURlZXBXaXRoLHJuLm1lcmdlRGVlcEluPVRyLm1lcmdlRGVlcEluLHJuLnNldEluPVRyLnNldEluLHJuLnVwZGF0ZT1Uci51cGRhdGUscm4udXBkYXRlSW49VHIudXBkYXRlSW4scm4ud2l0aE11dGF0aW9ucz1Uci53aXRoTXV0YXRpb25zLHJuLmFzTXV0YWJsZT1Uci5hc011dGFibGUscm4uYXNJbW11dGFibGU9VHIuYXNJbW11dGFibGUsdChZZSxrKSxZZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT9cIlJhbmdlIFtdXCI6XCJSYW5nZSBbIFwiK3RoaXMuX3N0YXJ0K1wiLi4uXCIrdGhpcy5fZW5kKyh0aGlzLl9zdGVwPjE/XCIgYnkgXCIrdGhpcy5fc3RlcDpcIlwiKStcIiBdXCJ9LFllLnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5oYXModCk/dGhpcy5fc3RhcnQrdSh0aGlzLHQpKnRoaXMuX3N0ZXA6ZX0sWWUucHJvdG90eXBlLmluY2x1ZGVzPWZ1bmN0aW9uKHQpe3ZhciBlPSh0LXRoaXMuX3N0YXJ0KS90aGlzLl9zdGVwO3JldHVybiBlPj0wJiZ0aGlzLnNpemU+ZSYmZT09PU1hdGguZmxvb3IoZSl9LFllLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3JldHVybiBhKHQsZSx0aGlzLnNpemUpP3RoaXM6KHQ9aCh0LHRoaXMuc2l6ZSksZT1mKGUsdGhpcy5zaXplKSx0Pj1lP25ldyBZZSgwLDApOm5ldyBZZSh0aGlzLmdldCh0LHRoaXMuX2VuZCksdGhpcy5nZXQoZSx0aGlzLl9lbmQpLHRoaXMuX3N0ZXApKX0sWWUucHJvdG90eXBlLmluZGV4T2Y9ZnVuY3Rpb24odCl7dmFyIGU9dC10aGlzLl9zdGFydDtpZihlJXRoaXMuX3N0ZXA9PT0wKXt2YXIgcj1lL3RoaXMuX3N0ZXA7aWYocj49MCYmdGhpcy5zaXplPnIpcmV0dXJuIHJ9cmV0dXJuLTF9LFllLnByb3RvdHlwZS5sYXN0SW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5pbmRleE9mKHQpfSxZZS5wcm90b3R5cGUuX19pdGVyYXRlPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByPXRoaXMuc2l6ZS0xLG49dGhpcy5fc3RlcCxpPWU/dGhpcy5fc3RhcnQrcipuOnRoaXMuX3N0YXJ0LG89MDtyPj1vO28rKyl7aWYodChpLG8sdGhpcyk9PT0hMSlyZXR1cm4gbysxO2krPWU/LW46bn1yZXR1cm4gb30sWWUucHJvdG90eXBlLl9faXRlcmF0b3I9ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLnNpemUtMSxuPXRoaXMuX3N0ZXAsaT1lP3RoaXMuX3N0YXJ0K3Iqbjp0aGlzLl9zdGFydCxvPTA7cmV0dXJuIG5ldyBTKGZ1bmN0aW9uKCl7dmFyIHU9aTtyZXR1cm4gaSs9ZT8tbjpuLG8+cj9JKCk6eih0LG8rKyx1KX0pfSxZZS5wcm90b3R5cGUuZXF1YWxzPWZ1bmN0aW9uKHQpe3JldHVybiB0IGluc3RhbmNlb2YgWWU/dGhpcy5fc3RhcnQ9PT10Ll9zdGFydCYmdGhpcy5fZW5kPT09dC5fZW5kJiZ0aGlzLl9zdGVwPT09dC5fc3RlcDpWZSh0aGlzLHQpO1xufTt2YXIgbm47dChRZSxrKSxRZS5wcm90b3R5cGUudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT9cIlJlcGVhdCBbXVwiOlwiUmVwZWF0IFsgXCIrdGhpcy5fdmFsdWUrXCIgXCIrdGhpcy5zaXplK1wiIHRpbWVzIF1cIn0sUWUucHJvdG90eXBlLmdldD1mdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90aGlzLl92YWx1ZTplfSxRZS5wcm90b3R5cGUuaW5jbHVkZXM9ZnVuY3Rpb24odCl7cmV0dXJuIFgodGhpcy5fdmFsdWUsdCl9LFFlLnByb3RvdHlwZS5zbGljZT1mdW5jdGlvbih0LGUpe3ZhciByPXRoaXMuc2l6ZTtyZXR1cm4gYSh0LGUscik/dGhpczpuZXcgUWUodGhpcy5fdmFsdWUsZihlLHIpLWgodCxyKSl9LFFlLnByb3RvdHlwZS5yZXZlcnNlPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9LFFlLnByb3RvdHlwZS5pbmRleE9mPWZ1bmN0aW9uKHQpe3JldHVybiBYKHRoaXMuX3ZhbHVlLHQpPzA6LTF9LFFlLnByb3RvdHlwZS5sYXN0SW5kZXhPZj1mdW5jdGlvbih0KXtyZXR1cm4gWCh0aGlzLl92YWx1ZSx0KT90aGlzLnNpemU6LTF9LFFlLnByb3RvdHlwZS5fX2l0ZXJhdGU9ZnVuY3Rpb24odCl7Zm9yKHZhciBlPTA7dGhpcy5zaXplPmU7ZSsrKWlmKHQodGhpcy5fdmFsdWUsZSx0aGlzKT09PSExKXJldHVybiBlKzE7cmV0dXJuIGV9LFFlLnByb3RvdHlwZS5fX2l0ZXJhdG9yPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMscj0wO3JldHVybiBuZXcgUyhmdW5jdGlvbigpe3JldHVybiBlLnNpemU+cj96KHQscisrLGUuX3ZhbHVlKTpJKCl9KX0sUWUucHJvdG90eXBlLmVxdWFscz1mdW5jdGlvbih0KXtyZXR1cm4gdCBpbnN0YW5jZW9mIFFlP1godGhpcy5fdmFsdWUsdC5fdmFsdWUpOlZlKHQpfTt2YXIgb247Xy5JdGVyYXRvcj1TLFhlKF8se3RvQXJyYXk6ZnVuY3Rpb24oKXtzdCh0aGlzLnNpemUpO3ZhciB0PUFycmF5KHRoaXMuc2l6ZXx8MCk7cmV0dXJuIHRoaXMudmFsdWVTZXEoKS5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxyKXt0W3JdPWV9KSx0fSx0b0luZGV4ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGh0KHRoaXMpfSx0b0pTOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudG9TZXEoKS5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQmJlwiZnVuY3Rpb25cIj09dHlwZW9mIHQudG9KUz90LnRvSlMoKTp0fSkuX190b0pTKCl9LHRvSlNPTjpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvU2VxKCkubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0LnRvSlNPTj90LnRvSlNPTigpOnR9KS5fX3RvSlMoKX0sdG9LZXllZFNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgYXQodGhpcywhMCl9LHRvTWFwOmZ1bmN0aW9uKCl7cmV0dXJuIEx0KHRoaXMudG9LZXllZFNlcSgpKX0sdG9PYmplY3Q6ZnVuY3Rpb24oKXtzdCh0aGlzLnNpemUpO3ZhciB0PXt9O3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihlLHIpe3Rbcl09ZX0pLHR9LHRvT3JkZXJlZE1hcDpmdW5jdGlvbigpe3JldHVybiBJZSh0aGlzLnRvS2V5ZWRTZXEoKSl9LHRvT3JkZXJlZFNldDpmdW5jdGlvbigpe3JldHVybiBMZShkKHRoaXMpP3RoaXMudmFsdWVTZXEoKTp0aGlzKX0sdG9TZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gQWUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU2V0U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBmdCh0aGlzKX0sdG9TZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbSh0aGlzKT90aGlzLnRvSW5kZXhlZFNlcSgpOmQodGhpcyk/dGhpcy50b0tleWVkU2VxKCk6dGhpcy50b1NldFNlcSgpfSx0b1N0YWNrOmZ1bmN0aW9uKCl7cmV0dXJuIEVlKGQodGhpcyk/dGhpcy52YWx1ZVNlcSgpOnRoaXMpfSx0b0xpc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gZmUoZCh0aGlzKT90aGlzLnZhbHVlU2VxKCk6dGhpcyl9LHRvU3RyaW5nOmZ1bmN0aW9uKCl7cmV0dXJuXCJbSXRlcmFibGVdXCJ9LF9fdG9TdHJpbmc6ZnVuY3Rpb24odCxlKXtyZXR1cm4gMD09PXRoaXMuc2l6ZT90K2U6dCtcIiBcIit0aGlzLnRvU2VxKCkubWFwKHRoaXMuX190b1N0cmluZ01hcHBlcikuam9pbihcIiwgXCIpK1wiIFwiK2V9LGNvbmNhdDpmdW5jdGlvbigpe1xuICB2YXIgdD11ci5jYWxsKGFyZ3VtZW50cywwKTtyZXR1cm4gT3QodGhpcyxTdCh0aGlzLHQpKX0saW5jbHVkZXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuc29tZShmdW5jdGlvbihlKXtyZXR1cm4gWChlLHQpfSl9LGVudHJpZXM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKHdyKX0sZXZlcnk6ZnVuY3Rpb24odCxlKXtzdCh0aGlzLnNpemUpO3ZhciByPSEwO3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihuLGksbyl7cmV0dXJuIHQuY2FsbChlLG4saSxvKT92b2lkIDA6KHI9ITEsITEpfSkscn0sZmlsdGVyOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsbHQodGhpcyx0LGUsITApKX0sZmluZDpmdW5jdGlvbih0LGUscil7dmFyIG49dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gbj9uWzFdOnJ9LGZpbmRFbnRyeTpmdW5jdGlvbih0LGUpe3ZhciByO3JldHVybiB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbihuLGksbyl7cmV0dXJuIHQuY2FsbChlLG4saSxvKT8ocj1baSxuXSwhMSk6dm9pZCAwfSkscn0sZmluZExhc3RFbnRyeTpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLmZpbmRFbnRyeSh0LGUpfSxmb3JFYWNoOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHN0KHRoaXMuc2l6ZSksdGhpcy5fX2l0ZXJhdGUoZT90LmJpbmQoZSk6dCl9LGpvaW46ZnVuY3Rpb24odCl7c3QodGhpcy5zaXplKSx0PXZvaWQgMCE9PXQ/XCJcIit0OlwiLFwiO3ZhciBlPVwiXCIscj0hMDtyZXR1cm4gdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24obil7cj9yPSExOmUrPXQsZSs9bnVsbCE9PW4mJnZvaWQgMCE9PW4/XCJcIituOlwiXCJ9KSxlfSxrZXlzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX19pdGVyYXRvcihtcil9LG1hcDpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHB0KHRoaXMsdCxlKSl9LHJlZHVjZTpmdW5jdGlvbih0LGUscil7c3QodGhpcy5zaXplKTt2YXIgbixpO3JldHVybiBhcmd1bWVudHMubGVuZ3RoPDI/aT0hMDpuPWUsdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24oZSxvLHUpe2k/KGk9ITEsbj1lKTpuPXQuY2FsbChyLG4sZSxvLHUpfSksbn0scmVkdWNlUmlnaHQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCk7cmV0dXJuIHQucmVkdWNlLmFwcGx5KHQsYXJndW1lbnRzKX0scmV2ZXJzZTpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLHZ0KHRoaXMsITApKX0sc2xpY2U6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxtdCh0aGlzLHQsZSwhMCkpfSxzb21lOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIXRoaXMuZXZlcnkoWmUodCksZSl9LHNvcnQ6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMscXQodGhpcyx0KSl9LHZhbHVlczpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faXRlcmF0b3IoZ3IpfSxidXRMYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuc2xpY2UoMCwtMSl9LGlzRW1wdHk6ZnVuY3Rpb24oKXtyZXR1cm4gdm9pZCAwIT09dGhpcy5zaXplPzA9PT10aGlzLnNpemU6IXRoaXMuc29tZShmdW5jdGlvbigpe3JldHVybiEwfSl9LGNvdW50OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIG8odD90aGlzLnRvU2VxKCkuZmlsdGVyKHQsZSk6dGhpcyl9LGNvdW50Qnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4geXQodGhpcyx0LGUpfSxlcXVhbHM6ZnVuY3Rpb24odCl7cmV0dXJuIFZlKHRoaXMsdCl9LGVudHJ5U2VxOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcztpZih0Ll9jYWNoZSlyZXR1cm4gbmV3IGoodC5fY2FjaGUpO3ZhciBlPXQudG9TZXEoKS5tYXAoR2UpLnRvSW5kZXhlZFNlcSgpO3JldHVybiBlLmZyb21FbnRyeVNlcT1mdW5jdGlvbigpe3JldHVybiB0LnRvU2VxKCl9LGV9LGZpbHRlck5vdDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmZpbHRlcihaZSh0KSxlKX0sZmluZExhc3Q6ZnVuY3Rpb24odCxlLHIpe3JldHVybiB0aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCkuZmluZCh0LGUscil9LGZpcnN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZmluZChzKX0sZmxhdE1hcDpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLEl0KHRoaXMsdCxlKSk7XG59LGZsYXR0ZW46ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsenQodGhpcyx0LCEwKSl9LGZyb21FbnRyeVNlcTpmdW5jdGlvbigpe3JldHVybiBuZXcgY3QodGhpcyl9LGdldDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmZpbmQoZnVuY3Rpb24oZSxyKXtyZXR1cm4gWChyLHQpfSx2b2lkIDAsZSl9LGdldEluOmZ1bmN0aW9uKHQsZSl7Zm9yKHZhciByLG49dGhpcyxpPUt0KHQpOyEocj1pLm5leHQoKSkuZG9uZTspe3ZhciBvPXIudmFsdWU7aWYobj1uJiZuLmdldD9uLmdldChvLGNyKTpjcixuPT09Y3IpcmV0dXJuIGV9cmV0dXJuIG59LGdyb3VwQnk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gZHQodGhpcyx0LGUpfSxoYXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZ2V0KHQsY3IpIT09Y3J9LGhhc0luOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmdldEluKHQsY3IpIT09Y3J9LGlzU3Vic2V0OmZ1bmN0aW9uKHQpe3JldHVybiB0PVwiZnVuY3Rpb25cIj09dHlwZW9mIHQuaW5jbHVkZXM/dDpfKHQpLHRoaXMuZXZlcnkoZnVuY3Rpb24oZSl7cmV0dXJuIHQuaW5jbHVkZXMoZSl9KX0saXNTdXBlcnNldDpmdW5jdGlvbih0KXtyZXR1cm4gdD1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0LmlzU3Vic2V0P3Q6Xyh0KSx0LmlzU3Vic2V0KHRoaXMpfSxrZXlTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLm1hcChGZSkudG9JbmRleGVkU2VxKCl9LGxhc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maXJzdCgpfSxtYXg6ZnVuY3Rpb24odCl7cmV0dXJuIER0KHRoaXMsdCl9LG1heEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIER0KHRoaXMsZSx0KX0sbWluOmZ1bmN0aW9uKHQpe3JldHVybiBEdCh0aGlzLHQ/JGUodCk6cnIpfSxtaW5CeTpmdW5jdGlvbih0LGUpe3JldHVybiBEdCh0aGlzLGU/JGUoZSk6cnIsdCl9LHJlc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5zbGljZSgxKX0sc2tpcDpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5zbGljZShNYXRoLm1heCgwLHQpKX0sc2tpcExhc3Q6ZnVuY3Rpb24odCl7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLnJldmVyc2UoKS5za2lwKHQpLnJldmVyc2UoKSl9LHNraXBXaGlsZTpmdW5jdGlvbih0LGUpe3JldHVybiBPdCh0aGlzLHd0KHRoaXMsdCxlLCEwKSl9LHNraXBVbnRpbDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnNraXBXaGlsZShaZSh0KSxlKX0sc29ydEJ5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMscXQodGhpcyxlLHQpKX0sdGFrZTpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5zbGljZSgwLE1hdGgubWF4KDAsdCkpfSx0YWtlTGFzdDpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyx0aGlzLnRvU2VxKCkucmV2ZXJzZSgpLnRha2UodCkucmV2ZXJzZSgpKX0sdGFrZVdoaWxlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsZ3QodGhpcyx0LGUpKX0sdGFrZVVudGlsOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMudGFrZVdoaWxlKFplKHQpLGUpfSx2YWx1ZVNlcTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnRvSW5kZXhlZFNlcSgpfSxoYXNoQ29kZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9faGFzaHx8KHRoaXMuX19oYXNoPW5yKHRoaXMpKX19KTt2YXIgdW49Xy5wcm90b3R5cGU7dW5bdnJdPSEwLHVuW0lyXT11bi52YWx1ZXMsdW4uX190b0pTPXVuLnRvQXJyYXksdW4uX190b1N0cmluZ01hcHBlcj10cix1bi5pbnNwZWN0PXVuLnRvU291cmNlPWZ1bmN0aW9uKCl7cmV0dXJuXCJcIit0aGlzfSx1bi5jaGFpbj11bi5mbGF0TWFwLHVuLmNvbnRhaW5zPXVuLmluY2x1ZGVzLGZ1bmN0aW9uKCl7dHJ5e09iamVjdC5kZWZpbmVQcm9wZXJ0eSh1bixcImxlbmd0aFwiLHtnZXQ6ZnVuY3Rpb24oKXtpZighXy5ub0xlbmd0aFdhcm5pbmcpe3ZhciB0O3RyeXt0aHJvdyBFcnJvcigpfWNhdGNoKGUpe3Q9ZS5zdGFja31pZigtMT09PXQuaW5kZXhPZihcIl93cmFwT2JqZWN0XCIpKXJldHVybiBjb25zb2xlJiZjb25zb2xlLndhcm4mJmNvbnNvbGUud2FybihcIml0ZXJhYmxlLmxlbmd0aCBoYXMgYmVlbiBkZXByZWNhdGVkLCB1c2UgaXRlcmFibGUuc2l6ZSBvciBpdGVyYWJsZS5jb3VudCgpLiBUaGlzIHdhcm5pbmcgd2lsbCBiZWNvbWUgYSBzaWxlbnQgZXJyb3IgaW4gYSBmdXR1cmUgdmVyc2lvbi4gXCIrdCksXG4gIHRoaXMuc2l6ZX19fSl9Y2F0Y2godCl7fX0oKSxYZShwLHtmbGlwOmZ1bmN0aW9uKCl7cmV0dXJuIE90KHRoaXMsX3QodGhpcykpfSxmaW5kS2V5OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy5maW5kRW50cnkodCxlKTtyZXR1cm4gciYmclswXX0sZmluZExhc3RLZXk6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy50b1NlcSgpLnJldmVyc2UoKS5maW5kS2V5KHQsZSl9LGtleU9mOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmZpbmRLZXkoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxsYXN0S2V5T2Y6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuZmluZExhc3RLZXkoZnVuY3Rpb24oZSl7cmV0dXJuIFgoZSx0KX0pfSxtYXBFbnRyaWVzOmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcyxuPTA7cmV0dXJuIE90KHRoaXMsdGhpcy50b1NlcSgpLm1hcChmdW5jdGlvbihpLG8pe3JldHVybiB0LmNhbGwoZSxbbyxpXSxuKysscil9KS5mcm9tRW50cnlTZXEoKSl9LG1hcEtleXM6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzO3JldHVybiBPdCh0aGlzLHRoaXMudG9TZXEoKS5mbGlwKCkubWFwKGZ1bmN0aW9uKG4saSl7cmV0dXJuIHQuY2FsbChlLG4saSxyKX0pLmZsaXAoKSl9fSk7dmFyIHNuPXAucHJvdG90eXBlO3NuW2xyXT0hMCxzbltJcl09dW4uZW50cmllcyxzbi5fX3RvSlM9dW4udG9PYmplY3Qsc24uX190b1N0cmluZ01hcHBlcj1mdW5jdGlvbih0LGUpe3JldHVybiBKU09OLnN0cmluZ2lmeShlKStcIjogXCIrdHIodCl9LFhlKHYse3RvS2V5ZWRTZXE6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IGF0KHRoaXMsITEpfSxmaWx0ZXI6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxsdCh0aGlzLHQsZSwhMSkpfSxmaW5kSW5kZXg6ZnVuY3Rpb24odCxlKXt2YXIgcj10aGlzLmZpbmRFbnRyeSh0LGUpO3JldHVybiByP3JbMF06LTF9LGluZGV4T2Y6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy50b0tleWVkU2VxKCkua2V5T2YodCk7cmV0dXJuIHZvaWQgMD09PWU/LTE6ZX0sbGFzdEluZGV4T2Y6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuaW5kZXhPZih0KX0scmV2ZXJzZTpmdW5jdGlvbigpe3JldHVybiBPdCh0aGlzLHZ0KHRoaXMsITEpKX0sc2xpY2U6ZnVuY3Rpb24odCxlKXtyZXR1cm4gT3QodGhpcyxtdCh0aGlzLHQsZSwhMSkpfSxzcGxpY2U6ZnVuY3Rpb24odCxlKXt2YXIgcj1hcmd1bWVudHMubGVuZ3RoO2lmKGU9TWF0aC5tYXgoMHxlLDApLDA9PT1yfHwyPT09ciYmIWUpcmV0dXJuIHRoaXM7dD1oKHQsMD50P3RoaXMuY291bnQoKTp0aGlzLnNpemUpO3ZhciBuPXRoaXMuc2xpY2UoMCx0KTtyZXR1cm4gT3QodGhpcywxPT09cj9uOm4uY29uY2F0KGkoYXJndW1lbnRzLDIpLHRoaXMuc2xpY2UodCtlKSkpfSxmaW5kTGFzdEluZGV4OmZ1bmN0aW9uKHQsZSl7dmFyIHI9dGhpcy50b0tleWVkU2VxKCkuZmluZExhc3RLZXkodCxlKTtyZXR1cm4gdm9pZCAwPT09cj8tMTpyfSxmaXJzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldCgwKX0sZmxhdHRlbjpmdW5jdGlvbih0KXtyZXR1cm4gT3QodGhpcyx6dCh0aGlzLHQsITEpKX0sZ2V0OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHQ9dSh0aGlzLHQpLDA+dHx8dGhpcy5zaXplPT09MS8wfHx2b2lkIDAhPT10aGlzLnNpemUmJnQ+dGhpcy5zaXplP2U6dGhpcy5maW5kKGZ1bmN0aW9uKGUscil7cmV0dXJuIHI9PT10fSx2b2lkIDAsZSl9LGhhczpmdW5jdGlvbih0KXtyZXR1cm4gdD11KHRoaXMsdCksdD49MCYmKHZvaWQgMCE9PXRoaXMuc2l6ZT90aGlzLnNpemU9PT0xLzB8fHRoaXMuc2l6ZT50Oi0xIT09dGhpcy5pbmRleE9mKHQpKX0saW50ZXJwb3NlOmZ1bmN0aW9uKHQpe3JldHVybiBPdCh0aGlzLGJ0KHRoaXMsdCkpfSxpbnRlcmxlYXZlOmZ1bmN0aW9uKCl7dmFyIHQ9W3RoaXNdLmNvbmNhdChpKGFyZ3VtZW50cykpLGU9RXQodGhpcy50b1NlcSgpLGsub2YsdCkscj1lLmZsYXR0ZW4oITApO3JldHVybiBlLnNpemUmJihyLnNpemU9ZS5zaXplKnQubGVuZ3RoKSxPdCh0aGlzLHIpfSxsYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZ2V0KC0xKTtcbn0sc2tpcFdoaWxlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIE90KHRoaXMsd3QodGhpcyx0LGUsITEpKX0semlwOmZ1bmN0aW9uKCl7dmFyIHQ9W3RoaXNdLmNvbmNhdChpKGFyZ3VtZW50cykpO3JldHVybiBPdCh0aGlzLEV0KHRoaXMsZXIsdCkpfSx6aXBXaXRoOmZ1bmN0aW9uKHQpe3ZhciBlPWkoYXJndW1lbnRzKTtyZXR1cm4gZVswXT10aGlzLE90KHRoaXMsRXQodGhpcyx0LGUpKX19KSx2LnByb3RvdHlwZVt5cl09ITAsdi5wcm90b3R5cGVbZHJdPSEwLFhlKGwse2dldDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLmhhcyh0KT90OmV9LGluY2x1ZGVzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmhhcyh0KX0sa2V5U2VxOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMudmFsdWVTZXEoKX19KSxsLnByb3RvdHlwZS5oYXM9dW4uaW5jbHVkZXMsWGUoeCxwLnByb3RvdHlwZSksWGUoayx2LnByb3RvdHlwZSksWGUoQSxsLnByb3RvdHlwZSksWGUoVixwLnByb3RvdHlwZSksWGUoWSx2LnByb3RvdHlwZSksWGUoUSxsLnByb3RvdHlwZSk7dmFyIGFuPXtJdGVyYWJsZTpfLFNlcTpPLENvbGxlY3Rpb246SCxNYXA6THQsT3JkZXJlZE1hcDpJZSxMaXN0OmZlLFN0YWNrOkVlLFNldDpBZSxPcmRlcmVkU2V0OkxlLFJlY29yZDpDZSxSYW5nZTpZZSxSZXBlYXQ6UWUsaXM6WCxmcm9tSlM6Rn07cmV0dXJuIGFufSk7Il19
