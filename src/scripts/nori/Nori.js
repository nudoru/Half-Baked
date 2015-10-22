/* @flow weak */

import _mixinReducerStore from './store/ReducerStore.js';
import _mixinComponentViews from './view/MixinComponentViews.js';

import assignArray from '../nudoru/core/AssignArray.js';
import buildFromMixins from '../nudoru/core/BuildFromMixins.js';
import createClass from '../nudoru/core/CreateClass.js';

let Nori = function () {

  let _storeTemplate,
      _viewTemplate;

  // Switch Lodash to use Mustache style templates
  _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

  //----------------------------------------------------------------------------
  //  Accessors
  //----------------------------------------------------------------------------

  /**
   * Allow for optional external configuration data from outside of the compiled
   * app bundle. For easy of settings tweaks after the build by non technical devs
   * @returns {void|*}
   */
  function getConfig() {
    return _.assign({}, (window.APP_CONFIG_DATA || {}));
  }

  function view() {
    return _viewTemplate;
  }

  function store() {
    return _storeTemplate;
  }

  //----------------------------------------------------------------------------
  //  Templates
  //----------------------------------------------------------------------------

  _storeTemplate = createStore({
    mixins: [
      _mixinReducerStore()
    ]
  })();

  _viewTemplate = createView({
    mixins: [
      _mixinComponentViews()
    ]
  })();

  //----------------------------------------------------------------------------
  //  Factories
  //----------------------------------------------------------------------------

  /**
   * Create a new Nori application instance
   * @param customizer
   * @returns {*}
   */
  function createApplication(customizer) {
    customizer.mixins = customizer.mixins || [];
    customizer.mixins.push(this);
    return createClass({}, customizer)();
  }

  /**
   * Creates main application store
   * @param customizer
   * @returns {*}
   */
  function createStore(customizer) {
    return createClass(_storeTemplate, customizer);
  }

  /**
   * Creates main application view
   * @param customizer
   * @returns {*}
   */
  function createView(customizer) {
    return createClass(_viewTemplate, customizer);
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    config           : getConfig,
    view             : view,
    store            : store,
    createApplication: createApplication,
    createStore      : createStore,
    createView       : createView
  };

};

export default Nori();