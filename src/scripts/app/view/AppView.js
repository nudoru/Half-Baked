import * as _appStore from '../store/AppStore.js';
import * as _mixinApplicationView from '../../nori/view/ApplicationView.js';
import * as _mixinNudoruControls from '../../nori/view/MixinNudoruControls.js';
import * as _mixinStoreStateViews from '../../nori/view/MixinStoreStateViews.js';
import * as _screenTitleFactory from './Screen.Title.js';
import * as _screenPlayerSelectFactory from './Screen.PlayerSelect.js';
import * as _screenWaitingOnPlayerFactory from './Screen.WaitingOnPlayer.js';
import * as _screenMainGameFactory from './Screen.MainGame.js';
import * as _screenGameOverFactory from './Screen.GameOver.js';
/**
 * View for an application.
 */

let AppView = Nori.createView({

  mixins: [
    _mixinApplicationView,
    _mixinNudoruControls,
    _mixinStoreStateViews
  ],

  initialize() {
    this.initializeApplicationView(['applicationscaffold', 'applicationcomponentsscaffold']);
    this.initializeStateViews(_appStore);
    this.initializeNudoruControls();

    this.configureViews();

    this.subscribe('viewChange', this.handleViewChange.bind(this));
  },

  configureViews() {
    // TODO need to init this aspect of the store before here
    var gameStates = ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER']; //_appStore.getState().gameStates;

    this.setViewMountPoint('#contents');

    this.mapStateToViewComponent(gameStates[0], 'title', _screenTitleFactory.default());
    this.mapStateToViewComponent(gameStates[1], 'playerselect', _screenPlayerSelectFactory.default());
    this.mapStateToViewComponent(gameStates[2], 'waitingonplayer', _screenWaitingOnPlayerFactory.default());
    this.mapStateToViewComponent(gameStates[3], 'game', _screenMainGameFactory.default());
    this.mapStateToViewComponent(gameStates[4], 'gameover', _screenGameOverFactory.default());
  },

  handleViewChange() {
    this.closeAllAlerts();
  },



});

export default AppView();