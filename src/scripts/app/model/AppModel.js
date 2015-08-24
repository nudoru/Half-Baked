define('app/model/AppModel',
  function (require, module, exports) {

    var _noriEvents         = require('nori/events/EventCreator'),
        _noriEventConstants = require('nori/events/EventConstants'),
        _mixinMapFactory = require('nori/model/MixinMapFactory'),
        _mixinObservableSubject = require('nori/utils/MixinObservableSubject'),
        _mixinReducerModel  = require('nori/model/MixinReducerModel');

    /**
     * This application model contains "reducer model" functionality based on Redux.
     * The model state may only be changed from events as applied in reducer functions.
     * The model received all events from the event bus and forwards them to all
     * reducer functions to modify state as needed. Once they have run, the
     * handleStateMutation function is called to dispatch an event to the bus, or
     * notify subscribers via an observable.
     *
     * Events => handleApplicationEvents => applyReducers => handleStateMutation => Notify
     */
    var AppModel = Nori.createApplicationModel({

      mixins: [
        _mixinMapFactory,
        _mixinReducerModel,
        _mixinObservableSubject()
      ],

      gameStates: ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],

      initialize: function () {
        this.addReducer(this.defaultReducerFunction);
        this.initializeReducerModel();
        this.modelReady();
      },

      /**
       * Set or load any necessary data and then broadcast a initialized event.
       */
      modelReady: function () {
        this.setState({
          currentState: this.gameStates[0],
          localPlayer : {},
          remotePlayer: {},
          questionBank: []
        });
        _noriEvents.applicationModelInitialized();
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
          pointVaule : pointValue
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

          case _noriEventConstants.CHANGE_MODEL_STATE:
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
        //_noriEvents.modelStateChanged(); // Eventbus
        this.notifySubscribers();
      }

    });

    module.exports = AppModel;

  });