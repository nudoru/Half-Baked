/* @flow weak */

import _mixinObservableSubject from './utils/MixinObservableSubject.js';
import _mixinReducerStore from './store/MixinReducerStore.js';
import _mixinComponentViews from './view/MixinComponentViews.js';
import _mixinEventDelegator from './view/MixinEventDelegator.js';
import _dispatcher from './utils/Dispatcher.js';
import _router from './utils/Router.js';

let Nori = function () {

  let _storeTemplate,
      _viewTemplate;

  // Switch Lodash to use Mustache style templates
  _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

  //----------------------------------------------------------------------------
  //  Accessors
  //----------------------------------------------------------------------------

  function getDispatcher() {
    return _dispatcher;
  }

  function getRouter() {
    return _router;
  }

  function getConfig() {
    return Object.assign({}, (window.APP_CONFIG_DATA || {}));
  }

  function getCurrentRoute() {
    return _router.getCurrentRoute();
  }

  function view() {
    return _viewTemplate;
  }

  function store() {
    return _storeTemplate;
  }

  //----------------------------------------------------------------------------
  //  Template parts
  //----------------------------------------------------------------------------

  _storeTemplate = createStore({
    mixins: [
      _mixinReducerStore,
      _mixinObservableSubject()
    ]
  })();

  _viewTemplate = createView({
    mixins: [
      _mixinComponentViews,
      _mixinEventDelegator(),
      _mixinObservableSubject()
    ]
  })();

  //----------------------------------------------------------------------------
  //  Factories - concatenative inheritance, decorators
  //----------------------------------------------------------------------------

  /**
   * Merges a collection of objects
   * @param target
   * @param sourceArray
   * @returns {*}
   */
  function assignArray(target, sourceArray) {
    sourceArray.forEach(function (source) {
      target = Object.assign(target, source);
    });
    return target;
  }

  /**
   * Create a new Nori application instance
   * @param custom
   * @returns {*}
   */
  function createApplication(custom) {
    custom.mixins.push(this);
    return buildFromMixins(custom);
  }

  /**
   * Creates main application store
   * @param custom
   * @returns {*}
   */
  function createStore(custom) {
    return function cs() {
      return Object.assign({}, _storeTemplate, buildFromMixins(custom));
    };
  }

  /**
   * Creates main application view
   * @param custom
   * @returns {*}
   */
  function createView(custom) {
    return function cv() {
      return Object.assign({}, _viewTemplate, buildFromMixins(custom));
    };
  }

  /**
   * Mixes in the modules specified in the custom application object
   * @param sourceObject
   * @returns {*}
   */
  function buildFromMixins(sourceObject) {
    let mixins;

    if (sourceObject.mixins) {
      mixins = sourceObject.mixins;
    }

    mixins.push(sourceObject);
    return assignArray({}, mixins);
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    config           : getConfig,
    dispatcher       : getDispatcher,
    router           : getRouter,
    view             : view,
    store            : store,
    createApplication: createApplication,
    createStore      : createStore,
    createView       : createView,
    buildFromMixins  : buildFromMixins,
    getCurrentRoute  : getCurrentRoute,
    assignArray      : assignArray
  };

};

export default Nori();


