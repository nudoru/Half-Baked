import * as _rest from '../../nori/service/Rest.js';
import * as _noriActionConstants from '../../nori/action/ActionConstants.js';
import * as _appActionConstants from '../action/ActionConstants.js';
import * as _stringUtils from '../../nudoru/core/StringUtils.js';
import * as _numUtils from '../../nudoru/core/NumberUtils.js';
import * as _arrayUtils from '../../nudoru/core/ArrayUtils.js';

const _restNumQuestions     = 300,
      _restQuestionCategory = 117,
      _mockAppearence       = ['Biege', 'Blue', 'Green', 'Pink', 'Yellow'],
      _mockNames            = ['Bagel', 'Loaf', 'Bready', 'Twist', 'Cupcake', 'Cake', 'Batter', 'Cookie', 'Donut', 'Bun', 'Biscuit', 'Flakey', 'Gluten', 'Croissant', 'Dough', 'Knead', 'Sugar', 'Flour', 'Butter', 'Yeast', 'Icing', 'Frost', 'Eggy', 'Fondant', 'Mix', 'Fluffy', 'Whip', 'Chip', 'Honey', 'Eclaire'];

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

  //gameStates    : ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],

  initialize() {
    this.addReducer(this.mainStateReducer.bind(this));
    this.initializeReducerStore();
    this.setState(Nori.config());
    this.createSubject('storeInitialized');
    this.createSubject('localPlayerDataUpdated');
    this.createSubject('remotePlayerDataUpdated');
    this.createSubject('gamePlayStateUpdated');
    this.createSubject('currentQuestionChange');
    this.createSubject('opponentAnswered');
    this.createSubject('answeredCorrect');
    this.createSubject('answeredIncorrect');
  },

  initialState() {
    return  {
      lastEventHandled: '',
      gameStates      : ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],
      gamePlayStates  : ['CHOOSE', 'ANSWERING', 'WAITING'],
      currentState    : '',
      currentPlayState: '',
      currentQuestion : null,
      sentQuestion    : this.createNullQuestion(),
      session         : {
        socketIOID: '',
        roomID    : '0000'
      },
      localPlayer     : _.merge(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      remotePlayer    : _.merge(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      questionBank    : []
    };
  },

  /**
   * Set or load any necessary data and then broadcast a initialized event.
   */
    loadStore() {
    this.setState(this.initialState());

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
    //console.log('Questions fetched', data[0]);
    let updated = data.map(q => {
      // Strip tags from text
      q.q_text = _stringUtils.stripTags(_stringUtils.unescapeHTML(q.q_text));
      // Service only returns 2 levels of difficulty. For now, fake it
      q.q_difficulty_level = _numUtils.rndNumber(1, 5);
      q.used               = false;
      return q;
    });

    this.setState({questionBank: updated});
    this.notifySubscribersOf('storeInitialized');
  },

  onQuestionError(data) {
    throw new Error('Error fetching questions', data);
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
    mainStateReducer(state, event) {
    state = state || {};

    state.lastEventHandled = event.type;

    console.log(event.type, event.payload);

    switch (event.type) {
      case _noriActionConstants.CHANGE_STORE_STATE:
      case _appActionConstants.SET_LOCAL_PLAYER_PROPS:
      case _appActionConstants.SET_REMOTE_PLAYER_PROPS:
      case _appActionConstants.SET_SESSION_PROPS:
      case _appActionConstants.RESET_GAME:
      //case _appActionConstants.SET_GAME_PLAY_STATE:
      case _appActionConstants.SET_CURRENT_QUESTION:
      case _appActionConstants.SET_SENT_QUESTION:
      case _appActionConstants.ANSWERED_CORRECT:
      case _appActionConstants.ANSWERED_INCORRECT:
        return _.merge({}, state, event.payload.data);

      case _appActionConstants.OPPONENT_ANSWERED:
      case _appActionConstants.CLEAR_QUESTION:
        state.currentQuestion = null;
        state.sentQuestion    = this.createNullQuestion();
        return state;

      case undefined:
      default:
        console.warn('Reducer store, unhandled event type: ' + event.type);
        return state;
    }
  },

  /**
   * Called after all reducers have run to broadcast possible updates.
   */
    handleStateMutation() {
    let state = this.getState();

    // Pick out certain events for specific notifications.
    // Rather than blasting out a new store every time
    if (state.lastEventHandled === _appActionConstants.SET_LOCAL_PLAYER_PROPS) {
      this.notifySubscribersOf('localPlayerDataUpdated');
    } else if (state.lastEventHandled === _appActionConstants.SET_GAME_PLAY_STATE) {
      this.notifySubscribersOf('gamePlayStateUpdated');
    } else if (state.lastEventHandled === _appActionConstants.SET_CURRENT_QUESTION ||
      state.lastEventHandled === _appActionConstants.CLEAR_QUESTION) {
      this.notifySubscribersOf('currentQuestionChange');
    } else if (state.lastEventHandled === _appActionConstants.ANSWERED_CORRECT) {
      this.notifySubscribersOf('answeredCorrect');
    } else if (state.lastEventHandled === _appActionConstants.ANSWERED_INCORRECT) {
      this.notifySubscribersOf('answeredIncorrect');
    } else if (state.lastEventHandled === _appActionConstants.OPPONENT_ANSWERED) {
      this.notifySubscribersOf('opponentAnswered');
    }

    // Check if player health is 0
    if (this.shouldGameEnd(state)) {
      this.setState({currentState: this.getState().gameStates[4]});
    }

    // update everyone
    this.notifySubscribers(state);
  },

  /**
   * When a player's health reaches 0, the game is over
   * @param state
   * @returns {boolean}
   */
    shouldGameEnd(state) {
    if (!state.localPlayer || !state.remotePlayer || state.currentState !== 'MAIN_GAME') {
      return false;
    }

    let local  = state.localPlayer.health,
        remote = state.remotePlayer.health;

    if (local <= 0 || remote <= 0) {
      return true;
    }

    return false;
  },

  isGameOver() {
    return this.shouldGameEnd(this.getState());
  },

});

export default AppStore();