import * as _rest from '../../nori/service/Rest.js';
import * as _noriActionConstants from '../../nori/action/ActionConstants.js';
import * as _appActionConstants from '../action/ActionConstants.js';
import * as _stringUtils from '../../nudoru/core/StringUtils.js';
import * as _numUtils from '../../nudoru/core/NumberUtils.js';
import * as _arrayUtils from '../../nudoru/core/ArrayUtils.js';

const _restNumQuestions     = 300,
      _restQuestionCategory = 166;

/*
 SCI/TECh 24,
 63 General knowledge,
 59 general sci,
 98 banking and bus,
 117 world history,
 158 puzzle, contains HTML encoded
 166 comp intro
 */

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

  mixins: [],

  lastEventHandled : '',
  gameStates       : ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],
  gamePlayStates   : ['CHOOSE', 'ANSWERING', 'WAITING'],
  playerAppearences: ['Biege', 'Blue', 'Green', 'Pink', 'Yellow'],

  initialize: function () {
    this.addReducer(this.mainStateReducer.bind(this));
    this.initializeReducerStore();
    this.setState(Nori.config());
    this.createSubject('storeInitialized');
    this.createSubject('localPlayerDataUpdated');
    this.createSubject('remotePlayerDataUpdated');
    this.createSubject('gamePlayStateUpdated');
    this.createSubject('currentQuestionChange');
  },

  /**
   * Set or load any necessary data and then broadcast a initialized event.
   */
  loadStore: function () {
    // Set initial state
    this.setState({
      currentState    : this.gameStates[0],
      currentPlayState: this.gamePlayStates[0],
      currentQuestion : null,
      session         : {
        socketIOID: '',
        roomID    : '0000'
      },
      localPlayer     : _.merge(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      remotePlayer    : _.merge(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      questionBank    : []
    });

    //https://market.mashape.com/pareshchouhan/trivia
    var getQuestions = _rest.request({
      method : 'GET',
      //url    : 'https://pareshchouhan-trivia-v1.p.mashape.com/v1/getAllQuizQuestions?limit=' + _restNumQuestions + '&page=1',
      url    : 'https://pareshchouhan-trivia-v1.p.mashape.com/v1/getQuizQuestionsByCategory?categoryId=' + _restQuestionCategory + '&limit=' + _restNumQuestions + '&page=1',
      headers: [{'X-Mashape-Key': 'tPxKgDvrkqmshg8zW4olS87hzF7Ap1vi63rjsnUuVw1sBHV9KJ'}],
      json   : true
    }).subscribe(this.onQuestionsSuccess.bind(this), this.onQuestionError);
  },

  onQuestionsSuccess: function (data) {
    console.log('Questions fetched', data[0]);

    // Service only returns 2 levels of difficulty. For now, fake it
    let updated = data.map(q => {
      // also strip tags
      q.q_text             = _stringUtils.stripTags(_stringUtils.unescapeHTML(q.q_text));
      q.q_difficulty_level = _numUtils.rndNumber(1, 5);
      q.used               = false;
      return q;
    });

    //updated.forEach(q => console.log(q.q_difficulty_level));

    this.setState({questionBank: updated});
    this.notifySubscribersOf('storeInitialized');
  },

  onQuestionError: function (data) {
    throw new Error('Error fetching questions', data);
  },

  getQuestionOfDifficulty: function (difficulty) {
    var possibleQuestions = this.getState().questionBank.filter(q => {
      return q.q_difficulty_level === difficulty
    });
    return _arrayUtils.rndElement(possibleQuestions);
  },

  createBlankPlayerObject: function () {
    return {
      id        : '',
      type      : '',
      name      : 'Mystery' + _numUtils.rndNumber(100, 999),
      appearance: _arrayUtils.rndElement(this.playerAppearences)
    };
  },

  createPlayerResetObject: function () {
    return {
      health   : 20,
      behaviors: [],
      score    : 0
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
  mainStateReducer: function (state, event) {
    state = state || {};

    this.lastEventHandled = event.type;

    switch (event.type) {
      case _noriActionConstants.CHANGE_STORE_STATE:
      case _appActionConstants.SET_LOCAL_PLAYER_PROPS:
      case _appActionConstants.SET_REMOTE_PLAYER_PROPS:
      case _appActionConstants.SET_SESSION_PROPS:
      case _appActionConstants.RESET_GAME:
      case _appActionConstants.SET_GAME_PLAY_STATE:
      case _appActionConstants.SET_CURRENT_QUESTION:
        return _.merge({}, state, event.payload.data);
      case undefined:
        return state;
      default:
        console.warn('Reducer store, unhandled event type: ' + event.type);
        return state;
    }
  },

  /**
   * Called after all reducers have run to broadcast possible updates.
   */
  handleStateMutation: function () {
    let state = this.getState();

    // Pick out certain events for specific notifications.
    // Rather than blasting out a new store every time
    if (this.lastEventHandled === _appActionConstants.SET_LOCAL_PLAYER_PROPS) {
      this.notifySubscribersOf('localPlayerDataUpdated');
    } else if (this.lastEventHandled === _appActionConstants.SET_GAME_PLAY_STATE) {
      this.notifySubscribersOf('gamePlayStateUpdated');
      //console.log('game play state:', this.getState().currentPlayState);
    } else if (this.lastEventHandled === _appActionConstants.SET_CURRENT_QUESTION) {
      this.notifySubscribersOf('currentQuestionChange');
      //console.log('question:', this.getState().currentQuestion);
    }

    // Check if player health is 0
    if (this.shouldGameEnd(state)) {
      this.setState({currentState: this.gameStates[4]});
    }

    // update everyone
    this.notifySubscribers(state);
  },

  /**
   * When a player's health reaches 0, the game is over
   * @param state
   * @returns {boolean}
   */
  shouldGameEnd: function (state) {
    if (!state.localPlayer || !state.remotePlayer || state.currentState !== 'MAIN_GAME') {
      return false;
    }

    let local  = state.localPlayer.health,
        remote = state.remotePlayer.health;

    if (local <= 0 || remote <= 0) {
      return true;
    }

    return false;
  }

});

export default AppStore();