import _appStore from '../store/AppStore.js';
import _mixinApplicationView from '../../nori/view/ApplicationView.js';
import _mixinNudoruControls from '../../nori/view/MixinNudoruControls.js';
import _mixinStoreStateViews from '../../nori/view/MixinStoreStateViews.js';
import _screenTitleFactory from './Screen.Title.js';
import _screenPlayerSelectFactory from './Screen.PlayerSelect.js';
import _screenWaitingOnPlayerFactory from './Screen.WaitingOnPlayer.js';
import _screenMainGameFactory from './Screen.MainGame.js';
import _screenGameOverFactory from './Screen.GameOver.js';

let _imagesLoadedInst,
    _preloadImages =
      ['img/pastries/null.png', 'img/pastries/pastry_cookie01.png', 'img/pastries/pastry_cookie02.png', 'img/pastries/pastry_croissant.png', 'img/pastries/pastry_cupcake.png', 'img/pastries/pastry_donut.png', 'img/pastries/pastry_eclair.png', 'img/pastries/pastry_macaroon.png', 'img/pastries/pastry_pie.png', 'img/pastries/pastry_poptart01.png', 'img/pastries/pastry_poptart02.png', 'img/pastries/pastry_starcookie01.png', 'img/pastries/pastry_starcookie02.png', 'img/players/alienBiege_climb1.png', 'img/players/alienBiege_climb2.png', 'img/players/alienBiege_duck.png', 'img/players/alienBiege_front.png', 'img/players/alienBiege_hit.png', 'img/players/alienBiege_jump.png', 'img/players/alienBiege_stand.png', 'img/players/alienBiege_swim1.png', 'img/players/alienBiege_swim2.png', 'img/players/alienBiege_walk1.png', 'img/players/alienBiege_walk2.png', 'img/players/alienBlue_climb1.png', 'img/players/alienBlue_climb2.png', 'img/players/alienBlue_duck.png', 'img/players/alienBlue_front.png', 'img/players/alienBlue_hit.png', 'img/players/alienBlue_jump.png', 'img/players/alienBlue_stand.png', 'img/players/alienBlue_swim1.png', 'img/players/alienBlue_swim2.png', 'img/players/alienBlue_walk1.png', 'img/players/alienBlue_walk2.png', 'img/players/alienGreen_climb1.png', 'img/players/alienGreen_climb2.png', 'img/players/alienGreen_duck.png', 'img/players/alienGreen_front.png', 'img/players/alienGreen_hit.png', 'img/players/alienGreen_jump.png', 'img/players/alienGreen_stand.png', 'img/players/alienGreen_swim1.png', 'img/players/alienGreen_swim2.png', 'img/players/alienGreen_walk1.png', 'img/players/alienGreen_walk2.png', 'img/players/alienPink_climb1.png', 'img/players/alienPink_climb2.png', 'img/players/alienPink_duck.png', 'img/players/alienPink_front.png', 'img/players/alienPink_hit.png', 'img/players/alienPink_jump.png', 'img/players/alienPink_stand.png', 'img/players/alienPink_swim1.png', 'img/players/alienPink_swim2.png', 'img/players/alienPink_walk1.png', 'img/players/alienPink_walk2.png', 'img/players/alienYellow_climb1.png', 'img/players/alienYellow_climb2.png', 'img/players/alienYellow_duck.png', 'img/players/alienYellow_front.png', 'img/players/alienYellow_hit.png', 'img/players/alienYellow_jump.png', 'img/players/alienYellow_stand.png', 'img/players/alienYellow_swim1.png', 'img/players/alienYellow_swim2.png', 'img/players/alienYellow_walk1.png', 'img/players/alienYellow_walk2.png'];

let AppViewModule = Nori.createView({

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

    this.preloadImages();
  },

  preloadImages() {
    // refer to docs http://desandro.github.io/imagesloaded/
    imagesLoadedInst = new imagesLoaded(_preloadImages, this.imagesPreloaded.bind(this));
  },

  imagesPreloaded() {
  },


  configureViews() {
    var gameStates = ['TITLE', 'PLAYER_SELECT', 'WAITING_ON_PLAYER', 'MAIN_GAME', 'GAME_OVER']; //_appStore.getState().gameStates;

    this.setViewMountPoint('#contents');

    this.mapConditionToViewComponent(gameStates[0], 'title', _screenTitleFactory());
    this.mapConditionToViewComponent(gameStates[1], 'playerselect', _screenPlayerSelectFactory());
    this.mapConditionToViewComponent(gameStates[2], 'waitingonplayer', _screenWaitingOnPlayerFactory());
    this.mapConditionToViewComponent(gameStates[3], 'game', _screenMainGameFactory());
    this.mapConditionToViewComponent(gameStates[4], 'gameover', _screenGameOverFactory());
  },

  /**
   * Close all alert boxes on view changes so there are no left over messages displayed
   */
  handleViewChange() {
    this.closeAllAlerts();
  }

});

let AppView = AppViewModule();

export default AppView;