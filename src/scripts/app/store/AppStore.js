define('app/store/AppStore',
  function (require, module, exports) {

    var _noriActionConstants     = require('nori/action/ActionConstants'),
        _mixinMapFactory        = require('nori/store/MixinMapFactory'),
        _mixinObservableSubject = require('nori/utils/MixinObservableSubject'),
        _mixinReducerStore      = require('nori/store/MixinReducerStore');

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
        _mixinMapFactory,
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
          localPlayer : {},
          remotePlayer: {},
          questionBank: []
        });

        this.notifySubscribersOf('storeInitialized');
      },

      createUserObject: function (id, type, name, appearance, behaviors) {
        return {
          id        : id,
          type      : type,
          name      : name,
          health    : health || 6,
          appearance: appearance,
          behaviors : behaviors || []
        };
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
        this.notifySubscribers(this.getState());
      }

    });

    module.exports = AppStore();

  });
