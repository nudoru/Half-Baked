'use strict';

ndefine('app/App', function (nrequire, module, exports) {

  var _rx = nrequire('nori/utils/Rx');

  /**
   * "Controller" for a Nori application. The controller is responsible for
   * bootstrapping the app and possibly handling socket/server interaction.
   * Any additional functionality should be handled in a specific module.
   */
  var App = Nori.createApplication({

    mixins: [],

    /**
     * Create the main Nori App store and view.
     */
    store: nrequire('app/store/AppStore'),
    view: nrequire('app/view/AppView'),
    socket: nrequire('nori/service/SocketIO'),

    /**
     * Intialize the appilcation, view and store
     */
    initialize: function initialize() {
      this.socket.initialize();

      this.view.initialize();

      this.store.initialize(); // store will acquire data dispatch event when complete
      this.store.subscribe('storeInitialized', this.onStoreInitialized.bind(this));
      this.store.loadStore();
    },

    /**
     * After the store data is ready
     */
    onStoreInitialized: function onStoreInitialized() {
      this.runApplication();
    },

    /**
     * Remove the "Please wait" cover and start the app
     */
    runApplication: function runApplication() {
      this.view.removeLoadingMessage();
      this.view.render();

      // View will show based on the current store state
      this.store.setState({ currentState: 'PLAYER_SELECT' });

      //_rx.interval(500).take(5).subscribe(function() {
      //  this.socket.ping();
      //}.bind(this));
      //_rx.doEvery(1000, function() {
      //  this.socket.ping();
      //}.bind(this));
    },

    /**
     * All messages from the Socket.IO server will be forwarded here
     * @param payload
     */
    handleSocketMessage: function handleSocketMessage(payload) {
      if (!payload) {
        return;
      }

      console.log("from Socket.IO server", payload);

      switch (payload.type) {
        case this.socket.events().CONNECT:
          console.log("Connected!");
          this.store.setState({ socketIOID: payload.id });
          return;
        case this.socket.events().USER_CONNECTED:
          console.log("Another client connected");
          return;
        case this.socket.events().USER_DISCONNECTED:
          console.log("Another client disconnected");
          return;
        case this.socket.events().DROPPED:
          console.log("You were dropped!", payload.payload);
          return;
        case this.socket.events().SYSTEM_MESSAGE:
          console.log("System message", payload.payload);
          return;
        case this.socket.events().CREATE_ROOM:
          console.log("create room");
          return;
        case this.socket.events().JOIN_ROOM:
          console.log("join room");
          return;
        case this.socket.events().LEAVE_ROOM:
          console.log("leave room");
          return;
        default:
          console.warn("Unhandled SocketIO message type", payload);
          return;
      }
    }

  });

  module.exports = App;
});

'use strict';

ndefine('app/action/ActionConstants', function (nrequire, module, exports) {
  var objUtils = nrequire('nudoru/core/ObjectUtils');

  /**
   * Event name string constants
   */

  _.merge(module.exports, objUtils.keyMirror({
    CHANGE_GAME_STATE: null,
    LOCAL_PLAYER_CONNECT: null,
    SELECT_PLAYER: null,
    REMOTE_PLAYER_CONNECT: null,
    GAME_START: null,
    LOCAL_QUESTION: null,
    REMOTE_QUESTION: null,
    LOCAL_PLAYER_HEALTH_CHANGE: null,
    REMOTE_PLAYER_HEALTH_CHANGE: null,
    GAME_OVER: null
  }));
});

'use strict';

ndefine('app/Action/ActionCreator', function (nrequire, module, exports) {

  var _actionConstants = nrequire('app/action/ActionConstants');

  /**
   * Purely for convenience, an Event ("action") Creator ala Flux spec. Follow
   * guidelines for creating actions: https://github.com/acdlite/flux-standard-action
   */
  var ActionCreator = {

    mutateSomeData: function mutateSomeData(data) {
      var actionObj = {
        type: _actionConstants.MUTATION_TYPE,
        payload: {
          data: data
        }
      };

      return actionObj;
    }

  };

  module.exports = ActionCreator;
});

'use strict';

ndefine('app/store/AppStore', function (nrequire, module, exports) {

  var _noriActionConstants = nrequire('nori/action/ActionConstants'),
      _mixinMapFactory = nrequire('nori/store/MixinMapFactory'),
      _mixinObservableSubject = nrequire('nori/utils/MixinObservableSubject'),
      _mixinReducerStore = nrequire('nori/store/MixinReducerStore');

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

    mixins: [_mixinMapFactory, _mixinReducerStore, _mixinObservableSubject()],

    gameStates: ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER'],

    initialize: function initialize() {
      this.addReducer(this.defaultReducerFunction);
      this.initializeReducerStore();
      this.setState(Nori.config());
      this.createSubject('storeInitialized');
    },

    /**
     * Set or load any necessary data and then broadcast a initialized event.
     */
    loadStore: function loadStore() {
      this.setState({
        currentState: this.gameStates[0],
        localPlayer: {},
        remotePlayer: {},
        questionBank: []
      });

      this.notifySubscribersOf('storeInitialized');
    },

    createUserObject: function createUserObject(id, type, name, appearance, behaviors) {
      return {
        id: id,
        type: type,
        name: name,
        health: health || 6,
        appearance: appearance,
        behaviors: behaviors || []
      };
    },

    createQuestionObject: function createQuestionObject(prompt, distractors, pointValue) {
      return {
        prompt: prompt,
        distractors: distractors,
        pointValue: pointValue
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
    defaultReducerFunction: function defaultReducerFunction(state, event) {
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
    handleStateMutation: function handleStateMutation() {
      this.notifySubscribers(this.getState());
    }

  });

  module.exports = AppStore();
});

'use strict';

ndefine('app/view/AppView', function (nrequire, module, exports) {

  var _appStore = nrequire('app/store/AppStore'),
      _mixinApplicationView = nrequire('nori/view/ApplicationView'),
      _mixinNudoruControls = nrequire('nori/view/MixinNudoruControls'),
      _mixinComponentViews = nrequire('nori/view/MixinComponentViews'),
      _mixinStoreStateViews = nrequire('nori/view/MixinStoreStateViews'),
      _mixinEventDelegator = nrequire('nori/view/MixinEventDelegator'),
      _mixinObservableSubject = nrequire('nori/utils/MixinObservableSubject');

  /**
   * View for an application.
   */

  var AppView = Nori.createView({

    mixins: [_mixinApplicationView, _mixinNudoruControls, _mixinComponentViews, _mixinStoreStateViews, _mixinEventDelegator(), _mixinObservableSubject()],

    initialize: function initialize() {
      this.initializeApplicationView(['applicationscaffold', 'applicationcomponentsscaffold']);
      this.initializeStateViews(_appStore);
      this.initializeNudoruControls();

      this.configureViews();
    },

    configureViews: function configureViews() {
      var screenTitle = nrequire('app/view/Screen.Title')(),
          screenPlayerSelect = nrequire('app/view/Screen.PlayerSelect')(),
          screenWaitingOnPlayer = nrequire('app/view/Screen.WaitingOnPlayer')(),
          screenMainGame = nrequire('app/view/Screen.MainGame')(),
          screenGameOver = nrequire('app/view/Screen.GameOver')(),
          gameStates = _appStore.gameStates;

      this.setViewMountPoint('#contents');

      this.mapStateToViewComponent(gameStates[0], 'title', screenTitle);
      this.mapStateToViewComponent(gameStates[1], 'playerselect', screenPlayerSelect);
      this.mapStateToViewComponent(gameStates[2], 'waitingonplayer', screenWaitingOnPlayer);
      this.mapStateToViewComponent(gameStates[3], 'game', screenMainGame);
      this.mapStateToViewComponent(gameStates[4], 'gameover', screenGameOver);
    },

    /**
     * Draw and UI to the DOM and set events
     */
    render: function render() {
      //
    }

  });

  module.exports = AppView();
});

/**
 * A template for a subview/route controller
 */

'use strict';

ndefine('app/view/DebugControlsTestingSubView', function (nrequire, module, exports) {

  /**
   * Module for testing Nudoru component classes and any thing else
   */
  var DebugComponent = function DebugComponent() {

    var _lIpsum = nrequire('nudoru/browser/Lorem'),
        _toolTip = nrequire('nudoru/component/ToolTipView'),
        _noriActionConstants = nrequire('nori/action/ActionConstants'),
        _actionOneEl,
        _actionTwoEl,
        _actionThreeEl,
        _actionFourEl,
        _actionFiveEl,
        _actionSixEl;

    function initialize(initObj) {
      _lIpsum.initialize();
    }

    function componentDidMount() {
      console.log(this.getID() + ', subview did mount');

      _actionOneEl = document.getElementById('action-one');
      _actionTwoEl = document.getElementById('action-two');
      _actionThreeEl = document.getElementById('action-three');
      _actionFourEl = document.getElementById('action-four');
      _actionFiveEl = document.getElementById('action-five');
      _actionSixEl = document.getElementById('action-six');

      //_toolTip.add({title:'', content:"This is a button, it's purpose is unknown.", position:'TR', targetEl: _actionFourEl, type:'information'});
      //_toolTip.add({title:'', content:"This is a button, click it and rainbows will appear.", position:'BR', targetEl: _actionFourEl, type:'success'});
      //_toolTip.add({title:'', content:"This is a button, it doesn't make a sound.", position:'BL', targetEl: _actionFourEl, type:'warning'});
      //_toolTip.add({title:'', content:"This is a button, behold the magic and mystery.", position:'TL', targetEl: _actionFourEl, type:'danger'});

      _toolTip.add({
        title: '',
        content: "This is a button, you click it dummy. This is a button, you click it dummy. ",
        position: 'L',
        targetEl: _actionFourEl,
        type: 'information'
      });
      _toolTip.add({
        title: '',
        content: "This is a button, you click it dummy. This is a button, you click it dummy. ",
        position: 'B',
        targetEl: _actionFourEl,
        type: 'information'
      });
      _toolTip.add({
        title: '',
        content: "This is a button, you click it dummy. This is a button, you click it dummy. This is a button, you click it dummy. ",
        position: 'R',
        targetEl: _actionFourEl,
        type: 'information'
      });
      _toolTip.add({
        title: '',
        content: "This is a button, you click it dummy. This is a button, you click it dummy. This is a button, you click it dummy. This is a button, you click it dummy. ",
        position: 'T',
        targetEl: _actionFourEl,
        type: 'information'
      });

      _actionOneEl.addEventListener('click', function actOne(e) {
        Nori.view().addMessageBox({
          title: _lIpsum.getSentence(2, 4),
          content: _lIpsum.getParagraph(2, 4),
          type: 'warning',
          modal: true,
          width: 500
        });
      });

      _actionTwoEl.addEventListener('click', function actTwo(e) {
        Nori.view().addMessageBox({
          title: _lIpsum.getSentence(10, 20),
          content: _lIpsum.getParagraph(2, 4),
          type: 'default',
          modal: false,
          buttons: [{
            label: 'Yes',
            id: 'yes',
            type: 'default',
            icon: 'check',
            onClick: function onClick() {
              console.log('yes');
            }
          }, {
            label: 'Maybe',
            id: 'maybe',
            type: 'positive',
            icon: 'cog',
            onClick: function onClick() {
              console.log('maybe');
            }
          }, {
            label: 'Nope',
            id: 'nope',
            type: 'negative',
            icon: 'times'
          }]
        });
      });

      _actionThreeEl.addEventListener('click', function actThree(e) {
        Nori.view().addNotification({
          title: _lIpsum.getSentence(3, 6),
          type: 'information',
          content: _lIpsum.getParagraph(1, 2)
        });

        _toolTip.remove(_actionFourEl);
      });

      _actionFourEl.addEventListener('click', function actFour(e) {
        console.log('Four');
      });

      _actionFiveEl.addEventListener('click', function actFour(e) {
        Nori.dispatcher().publish({
          type: _noriActionConstants.CHANGE_ROUTE,
          payload: {
            route: '/one',
            data: { prop: 'some data', moar: '25' }
          }
        });
      });

      _actionSixEl.addEventListener('click', function actFour(e) {
        Nori.dispatcher().publish({
          type: _noriActionConstants.CHANGE_ROUTE,
          payload: { route: '/styles', data: 'test' }
        });
      });
    }

    return {
      initialize: initialize,
      componentDidMount: componentDidMount
    };
  };

  module.exports = DebugComponent;
});

'use strict';

ndefine('app/view/Screen.GameOver', function (nrequire, module, exports) {

  var _noriActions = nrequire('nori/action/ActionCreator'),
      _appView = nrequire('app/view/AppView'),
      _appStore = nrequire('app/store/AppStore');

  /**
   * Module for a dynamic application view for a route or a persistent view
   */
  var Component = _appView.createComponentView({

    /**
     * Initialize and bind, called once on first render. Parent component is
     * initialized from app view
     * @param configProps
     */
    initialize: function initialize(configProps) {
      //
    },

    /**
     * Create an object to be used to define events on DOM elements
     * @returns {}
     */
    defineEvents: function defineEvents() {
      return {
        'click #gameover__button-replay': function clickGameover__buttonReplay() {
          _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[1] }));
        }
      };
    },

    /**
     * Set initial state properties. Call once on first render
     */
    getInitialState: function getInitialState() {
      return _appStore.getState();
    },

    /**
     * State change on bound stores (map, etc.) Return nextState object
     */
    componentWillUpdate: function componentWillUpdate() {
      var nextState = _appStore.getState();
      nextState.greeting += ' (updated)';
      return nextState;
    },

    /**
     * Component HTML was attached to the DOM
     */
    componentDidMount: function componentDidMount() {
      //
    },

    /**
     * Component will be removed from the DOM
     */
    componentWillUnmount: function componentWillUnmount() {
      //
    }

  });

  module.exports = Component;
});

'use strict';

ndefine('app/view/Screen.MainGame', function (nrequire, module, exports) {

  var _noriActions = nrequire('nori/action/ActionCreator'),
      _appView = nrequire('app/view/AppView'),
      _appStore = nrequire('app/store/AppStore');

  /**
   * Module for a dynamic application view for a route or a persistent view
   */
  var Component = _appView.createComponentView({

    /**
     * Initialize and bind, called once on first render. Parent component is
     * initialized from app view
     * @param configProps
     */
    initialize: function initialize(configProps) {
      //
    },

    /**
     * Create an object to be used to define events on DOM elements
     * @returns {}
     */
    defineEvents: function defineEvents() {
      return {
        'click #game__button-skip': function clickGame__buttonSkip() {
          _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[4] }));
        }
      };
    },

    /**
     * Set initial state properties. Call once on first render
     */
    getInitialState: function getInitialState() {
      return _appStore.getState();
    },

    /**
     * State change on bound stores (map, etc.) Return nextState object
     */
    componentWillUpdate: function componentWillUpdate() {
      var nextState = _appStore.getState();
      nextState.greeting += ' (updated)';
      return nextState;
    },

    /**
     * Component HTML was attached to the DOM
     */
    componentDidMount: function componentDidMount() {},

    /**
     * Component will be removed from the DOM
     */
    componentWillUnmount: function componentWillUnmount() {
      //
    }

  });

  module.exports = Component;
});

'use strict';

ndefine('app/view/Screen.PlayerSelect', function (nrequire, module, exports) {

  var _noriActions = nrequire('nori/action/ActionCreator'),
      _appView = nrequire('app/view/AppView'),
      _appStore = nrequire('app/store/AppStore');

  /**
   * Module for a dynamic application view for a route or a persistent view
   */
  var Component = _appView.createComponentView({

    /**
     * Initialize and bind, called once on first render. Parent component is
     * initialized from app view
     * @param configProps
     */
    initialize: function initialize(configProps) {
      //
    },

    /**
     * Create an object to be used to define events on DOM elements
     * @returns {}
     */
    defineEvents: function defineEvents() {
      return {
        'click #select__button-joinroom': this.onJoinRoom.bind(this),
        'click #select__button-createroom': this.onCreateRoom.bind(this),
        'click #select__button-go': function clickSelect__buttonGo() {
          _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[2] }));
        }
      };
    },

    /**
     * Set initial state properties. Call once on first render
     */
    getInitialState: function getInitialState() {
      return _appStore.getState();
    },

    /**
     * State change on bound stores (map, etc.) Return nextState object
     */
    componentWillUpdate: function componentWillUpdate() {
      var nextState = _appStore.getState();
      nextState.greeting += ' (updated)';
      return nextState;
    },

    /**
     * Component HTML was attached to the DOM
     */
    componentDidMount: function componentDidMount() {},

    onJoinRoom: function onJoinRoom() {
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
    validateRoomID: function validateRoomID(roomID) {
      if (isNaN(parseInt(roomID))) {
        return false;
      } else if (roomID.length !== 5) {
        return false;
      }
      return true;
    },

    onCreateRoom: function onCreateRoom() {
      console.log('create room');
    },

    /**
     * Component will be removed from the DOM
     */
    componentWillUnmount: function componentWillUnmount() {
      //
    }

  });

  module.exports = Component;
});

'use strict';

ndefine('app/view/Screen.Title', function (nrequire, module, exports) {

  var _noriActions = nrequire('nori/action/ActionCreator'),
      _appView = nrequire('app/view/AppView'),
      _appStore = nrequire('app/store/AppStore');

  /**
   * Module for a dynamic application view for a route or a persistent view
   */
  var Component = _appView.createComponentView({

    /**
     * Initialize and bind, called once on first render. Parent component is
     * initialized from app view
     * @param configProps
     */
    initialize: function initialize(configProps) {
      //
    },

    /**
     * Create an object to be used to define events on DOM elements
     * @returns {}
     */
    defineEvents: function defineEvents() {
      return {
        'click #title__button-start': function clickTitle__buttonStart() {
          _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[1] }));
        }
      };
    },

    /**
     * Set initial state properties. Call once on first render
     */
    getInitialState: function getInitialState() {
      return _appStore.getState();
    },

    /**
     * State change on bound stores (map, etc.) Return nextState object
     */
    componentWillUpdate: function componentWillUpdate() {
      var nextState = _appStore.getState();
      nextState.greeting += ' (updated)';
      return nextState;
    },

    /**
     * Component HTML was attached to the DOM
     */
    componentDidMount: function componentDidMount() {
      //
    },

    /**
     * Component will be removed from the DOM
     */
    componentWillUnmount: function componentWillUnmount() {
      //
    }

  });

  module.exports = Component;
});

'use strict';

ndefine('app/view/Screen.WaitingOnPlayer', function (nrequire, module, exports) {

  var _noriActions = nrequire('nori/action/ActionCreator'),
      _appView = nrequire('app/view/AppView'),
      _appStore = nrequire('app/store/AppStore');

  /**
   * Module for a dynamic application view for a route or a persistent view
   */
  var Component = _appView.createComponentView({

    /**
     * Initialize and bind, called once on first render. Parent component is
     * initialized from app view
     * @param configProps
     */
    initialize: function initialize(configProps) {
      //
    },

    /**
     * Create an object to be used to define events on DOM elements
     * @returns {}
     */
    defineEvents: function defineEvents() {
      return {
        'click #waiting__button-skip': function clickWaiting__buttonSkip() {
          _appStore.apply(_noriActions.changeStoreState({ currentState: _appStore.gameStates[3] }));
        }
      };
    },

    /**
     * Set initial state properties. Call once on first render
     */
    getInitialState: function getInitialState() {
      return _appStore.getState();
    },

    /**
     * State change on bound stores (map, etc.) Return nextState object
     */
    componentWillUpdate: function componentWillUpdate() {
      var nextState = _appStore.getState();
      nextState.greeting += ' (updated)';
      return nextState;
    },

    /**
     * Component HTML was attached to the DOM
     */
    componentDidMount: function componentDidMount() {
      //
    },

    /**
     * Component will be removed from the DOM
     */
    componentWillUnmount: function componentWillUnmount() {
      //
    }

  });

  module.exports = Component;
});

'use strict';

ndefine('app/view/TemplateViewComponent', function (nrequire, module, exports) {

  var view = nrequire('app/view/AppView');

  /**
   * Module for a dynamic application view for a route or a persistent view
   */

  var Component = view.createComponentView({
    /**
     * Mixins are other modules/objects that multiple components share, provides
     * common functionality between then.
     */
    //mixins: [
    //  {
    //    render: function () {
    //      return '<h1>MIXIN!</h1>';
    //    }
    //  }
    //],

    /**
     * Initialize and bind, called once on first render. Parent component is
     * initialized from app view
     * @param configProps
     */
    initialize: function initialize(configProps) {
      //Bind to a map, update will be called on changes to the map
      //this.bindMap(map id string or map object);
      //this.bindMap(APP.store());
      //custom init below here
      //this.setTemplate('<h1>{{ greeting }}</h1>'); // set custom HTML template
    },

    /**
     * Create an object to be used to define events on DOM elements
     * @returns {}
     */
    //defineEvents: function() {
    //  return {
    //    'click #button-id': handleButton
    //  };
    //},

    /**
     * Set initial state properties. Call once on first render
     */
    getInitialState: function getInitialState() {
      return APP.store().getState();
    },

    /**
     * State change on bound stores (map, etc.) Return nextState object
     */
    componentWillUpdate: function componentWillUpdate() {
      var nextState = APP.store().getState();
      nextState.greeting += ' (updated)';
      return nextState;
    },

    /**
     * Determine if update/redraw should occur
     * @param nextState
     * @returns {*}
     */
    //shouldComponentUpdate: function(nextState) {
    //  // Test for differences between nextState and this.getState()
    //},

    /**
     * Render override must return HTML.
     */
    //render: function() {
    //  var state = this.getState();
    //  return '<h1>'+state.greeting+'</h1>';
    //},

    /**
     * Component HTML was attached to the DOM
     */
    componentDidMount: function componentDidMount() {
      //
    },

    /**
     * Component will be removed from the DOM
     */
    componentWillUnmount: function componentWillUnmount() {
      // Clean up
    }

  });

  module.exports = Component;
});

/**
 * Initial file for the Application
 */

'use strict';

(function () {

  var _browserInfo = nrequire('nudoru/browser/BrowserInfo');

  /**
   * IE versions 9 and under are blocked, others are allowed to proceed
   */
  if (_browserInfo.notSupported || _browserInfo.isIE9) {

    document.querySelector('body').innerHTML = '<h3>For the best experience, please use Internet Explorer 10+, Firefox, Chrome or Safari to view this application.</h3>';
  } else {

    /**
     * Create the application module and initialize
     */
    window.onload = function () {
      window.APP = nrequire('app/App');
      APP.initialize();
    };
  }
})();