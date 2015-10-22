//import _rest from '../../nori/service/Rest.js';
import _noriActionConstants from '../../nori/action/ActionConstants.js';
import _appActionConstants from '../action/ActionConstants.js';
import _stringUtils from '../../nudoru/core/StringUtils.js';
import _numUtils from '../../nudoru/core/NumberUtils.js';
import _arrayUtils from '../../nudoru/core/ArrayUtils.js';
import _ from '../../vendor/lodash.min.js';

const _mockAppearence = ['Biege', 'Blue', 'Green', 'Pink', 'Yellow'],
      _mockNames      = ['Bagel', 'Loaf', 'Bready', 'Twist', 'Cupcake', 'Cake', 'Batter', 'Cookie', 'Donut', 'Bun', 'Biscuit', 'Flakey', 'Gluten', 'Croissant', 'Dough', 'Knead', 'Sugar', 'Flour', 'Butter', 'Yeast', 'Icing', 'Frost', 'Eggy', 'Fondant', 'Mix', 'Fluffy', 'Whip', 'Chip', 'Honey', 'Eclaire'];

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
let AppStoreModule = Nori.createStore({

  mixins: [],

  initialize() {
    this.setReducers([this.gameStateReducer.bind(this),
      this.playerResponseStateReducer.bind(this),
      this.opponentResponseStateReducer.bind(this)]);

    this.initializeReducerStore();

    // Will default state to initial state defaults
    this.setState();
  },

  initialState() {
    return {
      lastActionType  : '',
      gameStates      : ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],
      currentState    : '',
      currentPlayState: '',
      currentQuestion : null,
      sentQuestion    : this.createNullQuestion(),
      questionRisk    : 0,
      session         : {
        socketIOID: '',
        roomID    : '0000'
      },
      localPlayer     : _.assign(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      remotePlayer    : _.assign(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      questionBank    : []
    };
  },

  createNullQuestion() {
    return {
      q_text            : 'Null question',
      q_difficulty_level: -1,
      q_options_1       : '',
      q_options_2       : '',
      q_options_3       : '',
      q_options_4       : '',
      q_correct_option  : 0
    };
  },

  createBlankPlayerObject() {
    return {
      id        : '',
      type      : '',
      name      : _arrayUtils.rndElement(_mockNames) + _numUtils.rndNumber(100, 999),
      appearance: _arrayUtils.rndElement(_mockAppearence)
    };
  },

  createPlayerResetObject() {
    return {
      health: 10,
      score : 0
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
    gameStateReducer(state, action) {
    state = state || {};

    state.lastActionType = action.type;

    switch (action.type) {
      case _noriActionConstants.CHANGE_STORE_STATE:
      case _appActionConstants.SET_QUESTION_BANK:
      case _appActionConstants.SET_LOCAL_PLAYER_PROPS:
      case _appActionConstants.SET_REMOTE_PLAYER_PROPS:
      case _appActionConstants.SET_SESSION_PROPS:
      case _appActionConstants.RESET_GAME:
      case _appActionConstants.SET_CURRENT_QUESTION:
      case _appActionConstants.SET_SENT_QUESTION:
      case _appActionConstants.APPLY_RISK:
        return _.merge({}, state, action.payload.data);
    }

    return state;
  },

  opponentResponseStateReducer(state, action) {
    state                = state || {};
    state.lastActionType = action.type;

    switch (action.type) {
      case _appActionConstants.OPPONENT_ANSWERED:
      case _appActionConstants.CLEAR_QUESTION:
        state.currentQuestion = null;
        state.sentQuestion    = this.createNullQuestion();
        return state;
    }
    return state;
  },

  playerResponseStateReducer(state, action) {
    state                = state || {};
    state.lastActionType = action.type;

    switch (action.type) {
      case _appActionConstants.ANSWERED_CORRECT:
      case _appActionConstants.ANSWERED_INCORRECT:
        state.currentQuestion = null;
        state.sentQuestion    = this.createNullQuestion();
        return _.merge({}, state, action.payload.data);
    }
    return state;
  },

  getQuestionOfDifficulty(difficulty) {
    var possibleQuestions = this.getState().questionBank
      .filter(q => {
        return q.q_difficulty_level === difficulty;
      })
      .filter(q => {
        return !q.used;
      });

    // TODO set .used to true here
    return _arrayUtils.rndElement(possibleQuestions);
  }

});

let AppStore = AppStoreModule();

export default AppStore;