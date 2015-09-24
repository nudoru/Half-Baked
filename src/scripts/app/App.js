import * as _rx from '../nori/utils/Rx.js';
import * as _appActions from './action/ActionCreator.js';
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
    this.store.subscribe('localPlayerDataUpdated', this.handleLocalPlayerPropsUpdate.bind(this));
    this.store.subscribe('answeredCorrect', this.handleAnswerCorrect.bind(this));
    this.store.subscribe('answeredIncorrect', this.handleAnswerIncorrect.bind(this));

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

  handleLocalPlayerPropsUpdate() {
    let appState = this.store.getState();

    this.socket.notifyServer(_socketIOEvents.SEND_PLAYER_DETAILS, {
      roomID       : appState.session.roomID,
      playerDetails: appState.localPlayer
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

    console.log("from Socket.IO server", payload);

    switch (payload.type) {
      case (_socketIOEvents.CONNECT):
        this.handleConnect(payload.id);
        return;
      case (_socketIOEvents.JOIN_ROOM):
        console.log("join room", payload.payload);
        this.handleJoinNewlyCreatedRoom(payload.payload.roomID);
        return;
      case (_socketIOEvents.GAME_START):
        console.log("GAME STARTED");
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
      case (_socketIOEvents.BROADCAST):
      case (_socketIOEvents.MESSAGE):
        this.view.alert(payload.payload, payload.type);
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
    let appState           = this.store.getState(),
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
    this.store.apply(setRemotePlayer);
  },

  handleReceivedQuestion(question) {
    let setCurrentQuestion = _appActions.setCurrentQuestion(question);
    this.store.apply(setCurrentQuestion);
  },

  handleOpponentAnswered(payload) {
    if (payload.result) {
      this.view.positiveAlert('Your opponent got it right!', 'Opponent\'s Answer');
    } else {
      this.view.negativeAlert('Your opponent got it wrong!', 'Opponent\'s Answer');
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

  sendQuestion(difficulty) {
    let appState         = this.store.getState(),
        question         = this.store.getQuestionOfDifficulty(difficulty),
        setSentQuestion  = _appActions.setSentQuestion(question);

    this.socket.notifyServer(_socketIOEvents.SEND_QUESTION, {
      roomID  : appState.session.roomID,
      question: question
    });

    this.store.apply(setSentQuestion);
  },

  handleAnswerCorrect() {
    this.sendMyAnswer(true);
  },

  handleAnswerIncorrect() {
    this.sendMyAnswer(false);
  },

  sendMyAnswer(isCorrect) {
    let appState = this.store.getState();
    this.socket.notifyServer(_socketIOEvents.OPPONENT_ANSWERED, {
      roomID: appState.session.roomID,
      result: isCorrect
    });
  }

});

export default App;