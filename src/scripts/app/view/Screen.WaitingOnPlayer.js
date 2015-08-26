define('app/view/Screen.WaitingOnPlayer',
  function (require, module, exports) {

    var _noriEvents = require('nori/events/EventCreator'),
        _appEvents = require('app/events/EventConstants');

    /**
     * Module for a dynamic application view for a route or a persistent view
     */
    var Component = Nori.view().createComponentView({

      /**
       * Initialize and bind, called once on first render. Parent component is
       * initialized from app view
       * @param configProps
       */
      initialize: function (configProps) {
        //
      },

      /**
       * Create an object to be used to define events on DOM elements
       * @returns {}
       */
      defineEvents: function() {
        return {
          'click #waiting__button-skip': function() {
            _noriEvents.changeModelState('',{currentState:Nori.model().gameStates[3]});
          }
        };
      },

      /**
       * Set initial state properties. Call once on first render
       */
      getInitialState: function () {
        return APP.model().getState();
      },

      /**
       * State change on bound models (map, etc.) Return nextState object
       */
      componentWillUpdate: function () {
        var nextState = APP.model().getState();
        nextState.greeting += ' (updated)';
        return nextState;
      },

      /**
       * Component HTML was attached to the DOM
       */
      componentDidMount: function () {
        //
      },

      /**
       * Component will be removed from the DOM
       */
      componentWillUnmount: function () {
        //
      }

    });

    module.exports = Component;

  });