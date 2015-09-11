var _appStore               = require('../store/AppStore.js'),
    _mixinApplicationView   = require('../../nori/view/ApplicationView.js'),
    _mixinNudoruControls    = require('../../nori/view/MixinNudoruControls.js'),
    _mixinComponentViews    = require('../../nori/view/MixinComponentViews.js'),
    _mixinStoreStateViews   = require('../../nori/view/MixinStoreStateViews.js'),
    _mixinEventDelegator    = require('../../nori/view/MixinEventDelegator.js'),
    _mixinObservableSubject = require('../../nori/utils/MixinObservableSubject.js');

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
    var screenTitle           = require('./Screen.Title.js')(),
        screenPlayerSelect    = require('./Screen.PlayerSelect.js')(),
        screenWaitingOnPlayer = require('./Screen.WaitingOnPlayer.js')(),
        screenMainGame        = require('./Screen.MainGame.js')(),
        screenGameOver        = require('./Screen.GameOver.js')(),
        gameStates            = _appStore.gameStates;

    this.setViewMountPoint('#contents');

    this.mapStateToViewComponent(gameStates[0], 'title', screenTitle);
    this.mapStateToViewComponent(gameStates[1], 'playerselect', screenPlayerSelect);
    this.mapStateToViewComponent(gameStates[2], 'waitingonplayer', screenWaitingOnPlayer);
    this.mapStateToViewComponent(gameStates[3], 'game', screenMainGame);
    this.mapStateToViewComponent(gameStates[4], 'gameover', screenGameOver);
  }

});

export default AppView();