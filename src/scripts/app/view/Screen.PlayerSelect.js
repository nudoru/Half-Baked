import _noriActions from '../../nori/action/ActionCreator';
import _app from '../App';
import _appView from './AppView';
import _appStore from '../store/AppStore';
import _template from '../../nori/utils/Templating.js';
import _appActions from '../action/ActionCreator.js';

const ROOM_NUMBER_LENGTH = 4;

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponent({

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize(initProps) {
    console.log('Initializing with',initProps)
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents() {
    return {
      'blur #select__playername'        : this.setPlayerName.bind(this),
      'change #select__playertype'      : this.setPlayerAppearance.bind(this),
      'click #select__button-joinroom'  : this.onJoinRoom.bind(this),
      'click #select__button-createroom': this.onCreateRoom.bind(this),
      'click #select__button-go'        () {
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.getState().gameStates[2]}));
      }
    };
  },

  setPlayerName(value) {
    var action = _appActions.setLocalPlayerProps({
      name: value
    });
    _appStore.apply(action);
  },

  setPlayerAppearance(value) {
    var action = _appActions.setLocalPlayerProps({
      appearance: value
    });
    _appStore.apply(action);
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState() {
    var appState = _appStore.getState();
    return {
      name      : appState.localPlayer.name,
      appearance: appState.localPlayer.appearance
    };
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate() {
    return this.getInitialState();
  },

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount() {
    document.querySelector('#select__playertype').value = this.state.appearance;
  },

  onCreateRoom() {
    if (this.validateUserDetailsInput()) {
      _app.createRoom();
    }
  },

  onJoinRoom() {
    var roomID = document.querySelector('#select__roomid').value;
    if (this.validateRoomID(roomID)) {
      _app.joinRoom(roomID);
    } else {
      _appView.alert('The room ID is not correct. Does it contain letters or is less than '+ROOM_NUMBER_LENGTH+' digits?', 'Bad Room ID');
    }
  },

  validateUserDetailsInput() {
    var name       = document.querySelector('#select__playername').value,
        appearance = document.querySelector('#select__playertype').value;

    if (!name.length || !appearance) {
      _appView.alert('Make sure you\'ve typed a name for yourself and selected an appearance');
      return false;
    }
    return true;
  },

  /**
   * Room ID must be an integer and 5 digits
   * @param roomID
   * @returns {boolean}
   */
  validateRoomID(roomID) {
    if (isNaN(parseInt(roomID))) {
      return false;
    } else if (roomID.length !== ROOM_NUMBER_LENGTH) {
      return false;
    }
    return true;
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount() {
    //
  }

});

export default Component;