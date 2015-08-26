define('app/view/AppView',
  function (require, module, exports) {

    var _noriEvents             = require('nori/events/EventCreator'),
        _noriEventConstants     = require('nori/events/EventConstants'),
        _mixinApplicationView   = require('nori/view/ApplicationView'),
        _mixinNudoruControls    = require('nori/view/MixinNudoruControls'),
        _mixinComponentViews    = require('nori/view/MixinComponentViews'),
        _mixinModelStateViews   = require('nori/view/MixinModelStateViews'),
        _mixinEventDelegator    = require('nori/view/MixinEventDelegator'),
        _mixinObservableSubject = require('nori/utils/MixinObservableSubject');

    /**
     * View for an application.
     */

    var AppView = Nori.createApplicationView({

      mixins: [
        _mixinApplicationView,
        _mixinNudoruControls,
        _mixinComponentViews,
        _mixinModelStateViews,
        _mixinEventDelegator(),
        _mixinObservableSubject()
      ],

      initialize: function () {
        this.initializeApplicationView(['applicationscaffold', 'applicationcomponentsscaffold']);
        this.initializeStateViews();
        this.initializeNudoruControls();

        this.configureApplicationViewEvents();
        this.configureViews();

        _noriEvents.applicationViewInitialized();
      },

      configureViews: function () {
        var screenTitle           = require('app/view/Screen.Title'),
            screenPlayerSelect    = require('app/view/Screen.PlayerSelect'),
            screenWaitingOnPlayer = require('app/view/Screen.WaitingOnPlayer'),
            screenMainGame        = require('app/view/Screen.MainGame'),
            screenGameOver        = require('app/view/Screen.GameOver'),
            gameStates            = Nori.model().gameStates;

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
      render: function () {
        /* Sample event delegator syntax
         this.setEvents({
         'click #button-id': handleButton
         });
         this.delegateEvents();
         */
      },

      /**
       * Listen for notification and alert events and show to user
       */
      configureApplicationViewEvents: function () {
        Nori.dispatcher().subscribe(_noriEventConstants.NOTIFY_USER, function onNotiftUser(payload) {
          this.notify(payload.payload.message, payload.payload.title, payload.payload.type);
        }.bind(this));
        Nori.dispatcher().subscribe(_noriEventConstants.ALERT_USER, function onAlertUser(payload) {
          this.alert(payload.payload.message, payload.payload.title);
        }.bind(this));
      }

    });

    module.exports = AppView;

  });