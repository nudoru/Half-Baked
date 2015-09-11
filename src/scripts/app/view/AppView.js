import * as _appStore from '../store/AppStore.js';
import * as _mixinApplicationView from '../../nori/view/ApplicationView.js';
import * as _mixinNudoruControls from '../../nori/view/MixinNudoruControls.js';
import * as _mixinStoreStateViews from '../../nori/view/MixinStoreStateViews.js';

/**
 * View for an application.
 */

var AppView = Nori.createView({

  mixins: [
    _mixinApplicationView,
    _mixinNudoruControls,
    _mixinStoreStateViews
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