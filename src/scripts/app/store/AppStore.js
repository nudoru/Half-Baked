var _noriActionConstants    = require('../../nori/action/ActionConstants.js'),
    _appActionConstants     = require('../action/ActionConstants.js'),
    _mixinObservableSubject = require('../../nori/utils/MixinObservableSubject.js'),
    _mixinReducerStore      = require('../../nori/store/MixinReducerStore.js');

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
    this.addReducer(this.defaultReducerFunction);
    this.initializeReducerStore();
    this.setState(Nori.config());
    this.createSubject('storeInitialized');
  },

  /**
   * Set or load any necessary data and then broadcast a initialized event.
   */
  loadStore: function () {
    this.setState({
      currentState: this.gameStates[0],
      session     : {
        roomID: ''
      },
      localPlayer : {
        id        : '',
        type      : '',
        name      : '',
        health    : 6,
        appearance: '',
        behaviors : []
      },
      remotePlayer: {
        id        : '',
        type      : '',
        name      : '',
        health    : 6,
        appearance: '',
        behaviors : []
      },
      questionBank: []
    });

    this.notifySubscribersOf('storeInitialized');
  },

  createQuestionObject: function (prompt, distractors, pointValue) {
    return {
      prompt     : prompt,
      distractors: distractors,
      pointValue : pointValue
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
  defaultReducerFunction: function (state, event) {
    state = state || {};

    switch (event.type) {

      case _noriActionConstants.CHANGE_STORE_STATE:
      case _appActionConstants.SET_LOCAL_PLAYER_PROPS:
      case _appActionConstants.SET_REMOTE_PLAYER_PROPS:
      case _appActionConstants.SET_SESSION_PROPS:
        return _.assign({}, state, event.payload.data);

      default:
        return state;
    }
  },

  /**
   * Called after all reducers have run to broadcast possible updates. Does
   * not check to see if the state was actually updated.
   */
  handleStateMutation: function () {
    console.log('New state:', this.getState());
    this.notifySubscribers(this.getState());
  }

});

module.exports = AppStore();