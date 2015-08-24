define('app/view/AppView',
  function (require, module, exports) {

    var _noriEvents           = require('nori/events/EventCreator'),
        _noriEventConstants   = require('nori/events/EventConstants'),
        _mixinApplicationView = require('nori/view/ApplicationView'),
        _mixinNudoruControls  = require('nori/view/MixinNudoruControls'),
        _mixinComponentViews  = require('nori/view/MixinComponentViews'),
        _mixinRouteViews      = require('nori/view/MixinRouteViews'),
        _mixinEventDelegator  = require('nori/view/MixinEventDelegator');

    /**
     * View for an application.
     */

    var AppView = Nori.createApplicationView({

      mixins: [
        _mixinApplicationView,
        _mixinNudoruControls,
        _mixinComponentViews,
        _mixinRouteViews,
        _mixinEventDelegator()
      ],

      initialize: function () {
        this.initializeApplicationView(['applicationscaffold', 'applicationcomponentsscaffold']);
        this.initializeRouteViews();
        this.initializeNudoruControls();

        this.configureApplicationViewEvents();

        var screenTitle           = require('app/view/Screen.Title'),
            screenPlayerSelect    = require('app/view/Screen.PlayerSelect'),
            screenWaitingOnPlayer = require('app/view/Screen.WaitingOnPlayer'),
            screenMainGame        = require('app/view/Screen.MainGame'),
            screenGameOver        = require('app/view/Screen.GameOver');

        this.setRouteViewMountPoint('#contents');


        this.mapRouteToViewComponent('/', 'title', screenTitle);
        this.mapRouteToViewComponent('/playerselect', 'playerselect', screenPlayerSelect);
        this.mapRouteToViewComponent('/waiting', 'waitingonplayer', screenWaitingOnPlayer);
        this.mapRouteToViewComponent('/game', 'game', screenMainGame);
        this.mapRouteToViewComponent('/gameover', 'gameover', screenGameOver);

        _noriEvents.applicationViewInitialized();
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
        });
        Nori.dispatcher().subscribe(_noriEventConstants.ALERT_USER, function onAlertUser(payload) {
          this.alert(payload.payload.message, payload.payload.title);
        });
      }

    });

    module.exports = AppView;

  });