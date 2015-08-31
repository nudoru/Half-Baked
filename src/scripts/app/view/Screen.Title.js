ndefine('app/view/Screen.Title',
  function (nrequire, module, exports) {

    var _noriActions = nrequire('nori/action/ActionCreator'),
        _appView         = nrequire('app/view/AppView'),
        _appStore        = nrequire('app/store/AppStore');

    /**
     * Module for a dynamic application view for a route or a persistent view
     */
    var Component = _appView.createComponentView({

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
      defineEvents: function () {
        return {
          'click #title__button-start': function () {
            _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.gameStates[1]}));
          }
        };
      },

      /**
       * Set initial state properties. Call once on first render
       */
      getInitialState: function () {
        return _appStore.getState();
      },

      /**
       * State change on bound stores (map, etc.) Return nextState object
       */
      componentWillUpdate: function () {
        var nextState = _appStore.getState();
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