define('app/view/Screen.PlayerSelect',
  function (require, module, exports) {

    var _noriActions = require('nori/action/ActionCreator'),
        _appView         = require('app/view/AppView'),
        _appStore        = require('app/store/AppStore');

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
          'click #select__button-joinroom'  : this.onJoinRoom.bind(this),
          'click #select__button-createroom': this.onCreateRoom.bind(this),
          'click #select__button-go'        : function () {
            _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.gameStates[2]}));
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

      },

      onJoinRoom: function () {
        var roomID = document.querySelector('#select__roomid').value;
        console.log('Join room ' + roomID);
        if (this.validateRoomID(roomID)) {
          console.log('Room ID OK');
          _appView.notify('', 'Room ID ok!');
        } else {
          _appView.alert('Bad Room ID', 'The room ID is not correct. Must be a 5 digit number.');
        }
      },

      /**
       * Room ID must be an integer and 5 digits
       * @param roomID
       * @returns {boolean}
       */
      validateRoomID: function (roomID) {
        if (isNaN(parseInt(roomID))) {
          return false;
        } else if (roomID.length !== 5) {
          return false;
        }
        return true;
      },

      onCreateRoom: function () {
        console.log('create room');
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