var _restURL                = '',
    _restNumQuestions       = 3,
    _restQuestionCategory   = 24, // SCI/TECT
    _rest                   = require('../../nori/service/Rest.js'),
    _noriActionConstants    = require('../../nori/action/ActionConstants.js'),
    _appActionConstants     = require('../action/ActionConstants.js'),
    _mixinObservableSubject = require('../../nori/utils/MixinObservableSubject.js'),
    _mixinReducerStore      = require('../../nori/store/MixinReducerStore.js'),
    _numUtils               = require('../../nudoru/core/NumberUtils.js');

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

  mixins: [
    _mixinReducerStore,
    _mixinObservableSubject()
  ],

  gameStates: ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],

  initialize: function () {
    this.addReducer(this.mainStateReducer);
    this.initializeReducerStore();
    this.setState(Nori.config());
    this.createSubject('storeInitialized');
  },

  /**
   * Set or load any necessary data and then broadcast a initialized event.
   */
  loadStore: function () {
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
      session     : {
        socketIOID: '',
        roomID: ''
      },
      localPlayer : _.merge(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      remotePlayer: _.merge(this.createBlankPlayerObject(), this.createPlayerResetObject()),
      questionBank: []
    });

    this.notifySubscribersOf('storeInitialized');
  },

  createBlankPlayerObject: function () {
    return {
      id        : '',
      type      : '',
      name      : 'Mystery Player ' + _numUtils.rndNumber(100, 999),
      appearance: 'green'
    };
  },

  createPlayerResetObject: function () {
    return {
      health   : 6,
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
  handleStateMutation: function () {
    this.notifySubscribers(this.getState());
  }

});

module.exports = AppStore();