ndefine('app/view/AppView',
  function (nrequire, module, exports) {

    var _appStore               = nrequire('app/store/AppStore'),
        _mixinApplicationView   = nrequire('nori/view/ApplicationView'),
        _mixinNudoruControls    = nrequire('nori/view/MixinNudoruControls'),
        _mixinComponentViews    = nrequire('nori/view/MixinComponentViews'),
        _mixinStoreStateViews   = nrequire('nori/view/MixinStoreStateViews'),
        _mixinEventDelegator    = nrequire('nori/view/MixinEventDelegator'),
        _mixinObservableSubject = nrequire('nori/utils/MixinObservableSubject');

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
        var screenTitle           = nrequire('app/view/Screen.Title')(),
            screenPlayerSelect    = nrequire('app/view/Screen.PlayerSelect')(),
            screenWaitingOnPlayer = nrequire('app/view/Screen.WaitingOnPlayer')(),
            screenMainGame        = nrequire('app/view/Screen.MainGame')(),
            screenGameOver        = nrequire('app/view/Screen.GameOver')(),
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