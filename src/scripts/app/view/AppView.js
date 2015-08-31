define('app/view/AppView',
  function (require, module, exports) {

    var _appStore               = require('app/store/AppStore'),
        _mixinApplicationView   = require('nori/view/ApplicationView'),
        _mixinNudoruControls    = require('nori/view/MixinNudoruControls'),
        _mixinComponentViews    = require('nori/view/MixinComponentViews'),
        _mixinStoreStateViews   = require('nori/view/MixinStoreStateViews'),
        _mixinEventDelegator    = require('nori/view/MixinEventDelegator'),
        _mixinObservableSubject = require('nori/utils/MixinObservableSubject');

    /**
     * View for an application.
     */

    var AppView = Nori.createView({

      mixins: [
        _mixinApplicationView,
        _mixinNudoruControls,
        _mixinComponentViews,
        _mixinStoreStateViews,
        _mixinEventDelegator(),
        _mixinObservableSubject()
      ],

      initialize: function () {
        this.initializeApplicationView(['applicationscaffold', 'applicationcomponentsscaffold']);
        this.initializeStateViews(_appStore);
        this.initializeNudoruControls();

        this.configureViews();
      },

      configureViews: function () {
        var screenTitle           = require('app/view/Screen.Title')(),
            screenPlayerSelect    = require('app/view/Screen.PlayerSelect')(),
            screenWaitingOnPlayer = require('app/view/Screen.WaitingOnPlayer')(),
            screenMainGame        = require('app/view/Screen.MainGame')(),
            screenGameOver        = require('app/view/Screen.GameOver')(),
            gameStates            = _appStore.gameStates;

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
        //
      },

    });

    module.exports = AppView();

  });