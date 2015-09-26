import * as _rx from '../nori/utils/Rx.js';
import * as _appActions from './action/ActionCreator.js';
import * as _appActionConstants from './action/ActionConstants.js';
import * as _noriActions from '../nori/action/ActionCreator.js';
import * as _socketIOEvents from '../nori/service/SocketIOEvents.js';

import * as _appStore from './store/AppStore.js';
import * as _appView from './view/AppView.js';
import * as _Socket from '../nori/service/SocketIO.js';

/**
 * "Controller" for a Nori application. The controller is responsible for
 * bootstrapping the app and possibly handling socket/server interaction.
 * Any additional functionality should be handled in a specific module.
 */
let App = Nori.createApplication({

  mixins: [],

  /**
   * Create the main Nori App store and view.
   */
  store : _appStore,
  view  : _appView,
  socket: _Socket,

  /**
   * Intialize the appilcation, view and store
   */
    initialize() {
    console.log('ap, initialize');
    this.socket.initialize();
    this.socket.subscribe(this.handleSocketMessage.bind(this));

    this.view.initialize();
    this.view.subscribe('viewInitialized', this.onViewInitialized.bind(this));

    this.store.initialize(); // store will acquire data dispatch event when complete
    this.store.subscribe('storeInitialized', this.onStoreInitialized.bind(this));
    this.store.loadStore();
  },

  onViewInitialized() {
    console.log('app, onview initialized');
  },

  /**
   * After the store data is ready
   */
    onStoreInitialized() {
    console.log('app, onstore initialized');
    this.store.subscribe(this.handleStoreChanges.bind(this));
    this.runApplication();
  },

  /**
   * Remove the "Please wait" cover and start the app
   */
    runApplication() {
    this.view.removeLoadingMessage();

    // View will show based on the current store state
    //this.store.setState({currentState: 'MAIN_GAME'});
    this.store.setState({currentState: 'PLAYER_SELECT'});
  },

  //----------------------------------------------------------------------------
  // Handle FROM store
  //----------------------------------------------------------------------------

  handleStoreChanges() {
    var appState = this.store.getState(),
        type = appState.lastActionType;

    //console.log('App, handling: ',type);

    if (type === _appActionConstants.SET_LOCAL_PLAYER_PROPS) {
      this.handleLocalPlayerPropsUpdate();
    } else if (type === _appActionConstants.ANSWERED_CORRECT) {
      this.handleAnswerCorrect();
      this.handleLocalPlayerPropsUpdate();
    } else if (type === _appActionConstants.ANSWERED_INCORRECT) {
      this.handleAnswerIncorrect();
      this.handleLocalPlayerPropsUpdate();
    } else if (type === _appActionConstants.RESET_GAME) {
      this.handleGameReset();
    }
  },

  handleLocalPlayerPropsUpdate() {
    let appState = this.store.getState();

    this.socket.notifyServer(_socketIOEvents.SEND_PLAYER_DETAILS, {
      roomID       : appState.session.roomID,
      playerDetails: appState.localPlayer
    });
  },

  handleGameReset() {
    let appState = this.store.getState();
    this.leaveRoom(appState.session.roomID);
  },

  handleAnswerCorrect() {
    this.sendMyAnswer(true);
  },

  handleAnswerIncorrect() {
    this.sendMyAnswer(false);
  },

  sendMyAnswer(isCorrect) {
    console.log('sending answer ...');
    let appState = this.store.getState();
    this.socket.notifyServer(_socketIOEvents.OPPONENT_ANSWERED, {
      roomID: appState.session.roomID,
      result: isCorrect
    });
  },

  //----------------------------------------------------------------------------
  // Handle FROM server
  //----------------------------------------------------------------------------

  /**
   * All messages from the Socket.IO server will be forwarded here
   * @param payload
   */
    handleSocketMessage(payload) {
    if (!payload) {
      return;
    }

    //console.log("from Socket.IO server", payload);

    switch (payload.type) {
      case (_socketIOEvents.CONNECT):
        this.handleConnect(payload.id);
        return;
      case (_socketIOEvents.JOIN_ROOM):
        this.handleJoinNewlyCreatedRoom(payload.payload.roomID);
        return;
      case (_socketIOEvents.GAME_START):
        this.handleGameStart(payload.payload);
        return;
      case (_socketIOEvents.GAME_ABORT):
        this.handleGameAbort(payload);
        return;
      case (_socketIOEvents.SEND_PLAYER_DETAILS):
        this.handleUpdatedPlayerDetails(payload.payload);
        return;
      case (_socketIOEvents.SEND_QUESTION):
        this.handleReceivedQuestion(payload.payload);
        return;
      case (_socketIOEvents.OPPONENT_ANSWERED):
        this.handleOpponentAnswered(payload.payload);
        return;
      case (_socketIOEvents.SYSTEM_MESSAGE):
        this.view.notify(payload.payload, payload.type, 'success');
        return;
      case (_socketIOEvents.BROADCAST):
      case (_socketIOEvents.MESSAGE):
        this.view.notify(payload.payload, payload.type, 'warning');
        return;
      case (_socketIOEvents.USER_DISCONNECTED):
        return;
      default:
        console.warn("Unhandled SocketIO message type", payload);
        return;
    }
  },

  handleConnect(socketID) {
    let setSessionID = _appActions.setSessionProps({socketIOID: socketID}),
        setLocalID   = _appActions.setLocalPlayerProps({id: socketID});

    this.store.apply([setSessionID, setLocalID]);
  },

  handleJoinNewlyCreatedRoom(roomID) {
    let appState              = this.store.getState(),
        setRoom               = _appActions.setSessionProps({roomID: roomID}),
        setWaitingScreenState = _noriActions.changeStoreState({currentState: appState.gameStates[2]});

    this.store.apply([setRoom, setWaitingScreenState]);
  },

  handleGameStart(payload) {
    let appState           = this.store.getState(),
        remotePlayer       = this.pluckRemotePlayer(payload.players),
        setRemotePlayer    = _appActions.setRemotePlayerProps(remotePlayer),
        setGameState       = _noriActions.changeStoreState({currentState: appState.gameStates[3]}),
        setCurrentQuestion = _appActions.setCurrentQuestion(null);

    this.store.apply([setRemotePlayer, setGameState, setCurrentQuestion]);
  },

  pluckRemotePlayer(playersArry) {
    let localPlayerID = this.store.getState().localPlayer.id;
    return playersArry.filter(function (player) {
      return player.id !== localPlayerID;
    })[0];
  },

  handleGameAbort(payload) {
    this.store.apply(_appActions.resetGame());
    this.view.alert(payload.payload, payload.type);
  },

  handleUpdatedPlayerDetails(payload) {
    let remotePlayer    = this.pluckRemotePlayer(payload.players),
        setRemotePlayer = _appActions.setRemotePlayerProps(remotePlayer);

    console.log('setting player details');

    this.store.apply(setRemotePlayer);
  },

  handleReceivedQuestion(question) {
    let setCurrentQuestion = _appActions.setCurrentQuestion(question);
    this.store.apply(setCurrentQuestion);
  },

  handleOpponentAnswered(payload) {
    if (payload.result) {
      this.view.positiveAlert('They got it right!', 'Darn ...');
    } else {
      this.view.negativeAlert('They missed it!', 'Sweet!');
    }

    let opponentAnswered = _appActions.opponentAnswered(payload.result);

    this.store.apply(opponentAnswered);
  },

  //----------------------------------------------------------------------------
  // Handle TO server
  //----------------------------------------------------------------------------

  createRoom: function () {
    this.socket.notifyServer(_socketIOEvents.CREATE_ROOM, {
      playerDetails: this.store.getState().localPlayer
    });
  },

  joinRoom: function (roomID) {
    this.socket.notifyServer(_socketIOEvents.JOIN_ROOM, {
      roomID       : roomID,
      playerDetails: this.store.getState().localPlayer
    });
  },

  leaveRoom: function (roomID) {
    this.socket.notifyServer(_socketIOEvents.LEAVE_ROOM, {
      roomID: roomID
    });

    this.store.apply(_appActions.setSessionProps({roomID: '0000'}));
  },

  sendQuestion(difficulty) {
    let appState        = this.store.getState(),
        question        = this.store.getQuestionOfDifficulty(difficulty),
        setSentQuestion = _appActions.setSentQuestion(question);

    this.socket.notifyServer(_socketIOEvents.SEND_QUESTION, {
      roomID  : appState.session.roomID,
      question: question
    });

    this.store.apply(setSentQuestion);
  }

});

export default App;