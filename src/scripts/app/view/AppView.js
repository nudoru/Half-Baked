define('app/view/AppView',
  function (require, module, exports) {

    var _noriEvents         = require('nori/events/EventCreator'),
        _noriEventConstants = require('nori/events/EventConstants');

    /**
     * View for an application.
     */

    var AppView = Nori.createApplicationView({

      initialize: function () {
        this.initializeApplicationView(['applicationscaffold', 'applicationcomponentsscaffold']);

        this.configureApplicationViewEvents();

        var screenTitle = require('app/view/Screen.Title'),
            screenPlayerSelect = require('app/view/Screen.PlayerSelect'),
            screenMainGame = require('app/view/Screen.MainGame');

        this.setRouteViewMountPoint('#contents');

        this.mapRouteToViewComponent('/', 'title', screenTitle);
        this.mapRouteToViewComponent('/playerselect', 'playerselect', screenPlayerSelect);
        this.mapRouteToViewComponent('/game', 'game', screenMainGame);

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