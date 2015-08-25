define('app/view/Screen.PlayerSelect',
  function (require, module, exports) {

    var _noriEvents = require('nori/events/EventCreator'),
        _appEvents  = require('app/events/EventConstants');

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
        this.setEvents({
          'click #select__button-joinroom'  : this.onJoinRoom.bind(this),
          'click #select__button-createroom': this.onCreateRoom.bind(this),
          'click #select__button-go'        : function () {
            _noriEvents.changeModelState('', {currentState: Nori.model().gameStates[2]});
          }
        });
        this.delegateEvents();
      },

      onJoinRoom: function () {
        var roomID = document.querySelector('#select__roomid').value;
        console.log('Join room '+roomID);
        if(this.validateRoomID(roomID)) {
          console.log('Room ID OK');
          _noriEvents.notifyUser('','Room ID ok!');
        } else {
          _noriEvents.alertUser('Bad Room ID','The room ID is not correct. Must be a 5 digit number.');
        }
      },

      /**
       * Room ID must be an integer and 5 digits
       * @param roomID
       * @returns {boolean}
       */
      validateRoomID: function(roomID) {
        if(isNaN(parseInt(roomID))) {
          return false;
        } else if(roomID.length !== 5) {
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