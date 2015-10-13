import _rx from '../nori/utils/Rx.js';
import _rest from '../nori/service/Rest.js';
import _socketIO from '../nori/service/SocketIO.js';
import _appActions from './action/ActionCreator.js';
import _appActionConstants from './action/ActionConstants.js';
import _noriActions from '../nori/action/ActionCreator.js';
import _socketIOEvents from '../nori/service/SocketIOEvents.js';
import _stringUtils from '../nudoru/core/StringUtils.js';
import _numUtils from '../nudoru/core/NumberUtils.js';
import _appStore from './store/AppStore.js';
import _appView from './view/AppView.js';

const _restNumQuestions     = 300,
      _restQuestionCategory = 117;

/**
 * "Controller" for a Nori application. The controller is responsible for
 * bootstrapping the app and possibly handling socket/server interaction.
 * Any additional functionality should be handled in a specific module.
 */
let App = Nori.createApplication({

  mixins: [],

  /**
   * Intialize the appilcation, view and store
   */
    initialize() {
    _socketIO.initialize();
    _socketIO.subscribe(this.handleSocketMessage.bind(this));

    _appView.initialize();
    _appStore.initialize();
    _appStore.subscribe(this.reactToStoreMutation.bind(this));
    this.fetchQuestions(); // will call runapp on load
  },

  /**
   * Remove the "Please wait" cover and start the app
   * Called after questions fetched and parsed in to store
   */
    runApplication() {
    _appView.removeLoadingMessage();

    //'TITLE' 'PLAYER_SELECT' 'MAIN_GAME'
    _appStore.apply(_noriActions.changeStoreState({currentState: 'PLAYER_SELECT'}));
  },

  //----------------------------------------------------------------------------
  // Load questions from REST
  //----------------------------------------------------------------------------

  /**
   * Set or load any necessary data and then broadcast a initialized event.
   */
  /*
   SCI/TECh 24,
   63 General knowledge,
   59 general sci,
   98 banking and bus,
   117 world history,
   158 puzzle, contains HTML encoded
   166 comp intro
   */
  fetchQuestions() {
    //https://market.mashape.com/pareshchouhan/trivia
    var getQuestions = _rest.request({
      method : 'GET',
      //url    : 'https://pareshchouhan-trivia-v1.p.mashape.com/v1/getAllQuizQuestions?limit=' + _restNumQuestions + '&page=1',
      url    : 'https://pareshchouhan-trivia-v1.p.mashape.com/v1/getQuizQuestionsByCategory?categoryId=' + _restQuestionCategory + '&limit=' + _restNumQuestions + '&page=1',
      headers: [{'X-Mashape-Key': 'tPxKgDvrkqmshg8zW4olS87hzF7Ap1vi63rjsnUuVw1sBHV9KJ'}],
      json   : true
    }).subscribe(this.onQuestionsSuccess.bind(this), this.onQuestionError);
  },

  onQuestionsSuccess(data) {
    console.log('Questions fetched');

    let questions    = data.map(q => {
      q.q_text             = _stringUtils.stripTags(_stringUtils.unescapeHTML(q.q_text));
      q.q_difficulty_level = _numUtils.rndNumber(1, 5);
      q.used               = false;
      return q;
    }), questionBank = _appActions.setQuestionBank(questions);

    _appStore.apply(questionBank);
    this.runApplication();
  },

  onQuestionError(data) {
    throw new Error('Error fetching questions', data);
  },

  //----------------------------------------------------------------------------
  // Handle FROM store
  //----------------------------------------------------------------------------

  reactToStoreMutation() {
    var appState = _appStore.getState(),
        type     = appState.lastActionType;

    console.log('APP, handle after action: ', type);

    if (type === _appActionConstants.SET_LOCAL_PLAYER_PROPS) {
      this.handleLocalPlayerPropsUpdate();
    } else if (type === _appActionConstants.ANSWERED_CORRECT) {
      this.handleAnswerCorrect();
      this.handleLocalPlayerPropsUpdate();
    } else if (type === _appActionConstants.ANSWERED_INCORRECT) {
      this.handleAnswerIncorrect();
      this.handleLocalPlayerPropsUpdate();
    } else if (type === _appActionConstants.APPLY_RISK) {
      this.handleLocalPlayerPropsUpdate();
    } else if (type === _appActionConstants.RESET_GAME) {
      this.handleGameReset();
    }

    if (this.shouldGameEnd(appState)) {
      console.log('app, game should end');
      this.doGameOver();
    }
  },

  //When a player's health reaches 0, the game is over
  shouldGameEnd(state) {
    if (!state.localPlayer || !state.remotePlayer || state.currentState !== 'MAIN_GAME') {
      return false;
    }

    let local  = state.localPlayer.health,
        remote = state.remotePlayer.health;

    return (local <= 0 || remote <= 0);
  },

  doGameOver() {
    let appState          = _appStore.getState(),
        setGameOverScreen = _noriActions.changeStoreState({currentState: appState.gameStates[4]});

    _appStore.apply(setGameOverScreen);
  },

  handleLocalPlayerPropsUpdate() {
    let appState = _appStore.getState();

    _socketIO.notifyServer(_socketIOEvents.SEND_PLAYER_DETAILS, {
      roomID       : appState.session.roomID,
      playerDetails: appState.localPlayer
    });
  },

  handleGameReset() {
    let appState = _appStore.getState();
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
    let appState = _appStore.getState();
    _socketIO.notifyServer(_socketIOEvents.OPPONENT_ANSWERED, {
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
        _appView.notify(payload.payload, payload.type, 'success');
        return;
      case (_socketIOEvents.BROADCAST):
      case (_socketIOEvents.MESSAGE):
        _appView.notify(payload.payload, payload.type, 'warning');
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

    _appStore.apply([setSessionID, setLocalID]);
  },

  handleJoinNewlyCreatedRoom(roomID) {
    let appState              = _appStore.getState(),
        setRoom               = _appActions.setSessionProps({roomID: roomID}),
        setWaitingScreenState = _noriActions.changeStoreState({currentState: appState.gameStates[2]});

    _appStore.apply([setRoom, setWaitingScreenState]);
  },

  handleGameStart(payload) {
    let appState           = _appStore.getState(),
        remotePlayer       = this.pluckRemotePlayer(payload.players),
        setRemotePlayer    = _appActions.setRemotePlayerProps(remotePlayer),
        setGameState       = _noriActions.changeStoreState({currentState: appState.gameStates[3]}),
        setCurrentQuestion = _appActions.setCurrentQuestion(null);

    _appStore.apply([setRemotePlayer, setGameState, setCurrentQuestion]);
  },

  pluckRemotePlayer(playersArry) {
    let localPlayerID = _appStore.getState().localPlayer.id;
    return playersArry.filter(function (player) {
      return player.id !== localPlayerID;
    })[0];
  },

  handleGameAbort(payload) {
    _appStore.apply(_appActions.resetGame());
    _appView.alert(payload.payload, payload.type);
  },

  handleUpdatedPlayerDetails(payload) {
    let remotePlayer    = this.pluckRemotePlayer(payload.players),
        setRemotePlayer = _appActions.setRemotePlayerProps(remotePlayer);

    console.log('setting player details');

    _appStore.apply(setRemotePlayer);
  },

  handleReceivedQuestion(question) {
    let setCurrentQuestion = _appActions.setCurrentQuestion(question);
    _appStore.apply(setCurrentQuestion);
  },

  handleOpponentAnswered(payload) {
    let state            = _appStore.getState(),
        risk             = state.questionRisk,
        opponentAnswered = _appActions.opponentAnswered(payload.result),
        applyRisk        = _appActions.applyRisk(risk);

    if (payload.result) {
      _appView.positiveAlert('They got it right! You lost ' + risk + ' health points.', 'Ouch!');
    } else {
      _appView.negativeAlert('They missed it!', 'Sweet!');
      applyRisk = _appActions.applyRisk(0);
    }

    _appStore.apply([opponentAnswered, applyRisk]);
  },

  //----------------------------------------------------------------------------
  // Handle TO server
  //----------------------------------------------------------------------------

  createRoom: function () {
    _socketIO.notifyServer(_socketIOEvents.CREATE_ROOM, {
      playerDetails: _appStore.getState().localPlayer
    });
  },

  joinRoom: function (roomID) {
    _socketIO.notifyServer(_socketIOEvents.JOIN_ROOM, {
      roomID       : roomID,
      playerDetails: _appStore.getState().localPlayer
    });
  },

  leaveRoom: function (roomID) {
    _socketIO.notifyServer(_socketIOEvents.LEAVE_ROOM, {
      roomID: roomID
    });

    _appStore.apply(_appActions.setSessionProps({roomID: '0000'}));
  },

  sendQuestion(difficulty) {
    let appState        = _appStore.getState(),
        question        = _appStore.getQuestionOfDifficulty(difficulty),
        risk            = Math.ceil(question.q_difficulty_level / 2),
        setSentQuestion = _appActions.setSentQuestion(question, risk);

    _socketIO.notifyServer(_socketIOEvents.SEND_QUESTION, {
      roomID  : appState.session.roomID,
      question: question
    });

    _appStore.apply(setSentQuestion);
  }

});

export default App;