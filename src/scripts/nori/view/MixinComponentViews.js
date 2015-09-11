/* @flow weak */

/**
 * Mixin view that allows for component views
 */

import * as _componentViewFactory from './ViewComponent.js';
import * as _eventDelegatorFactory from './MixinEventDelegator.js';
import * as _observableFactory from '../utils/MixinObservableSubject.js';
import * as _stateObjFactory from '../store/ImmutableMap.js';

let MixinComponentViews = function () {

  let _componentViewMap = Object.create(null);

  /**
   * Map a component to a mounting point. If a string is passed,
   * the correct object will be created from the factory method, otherwise,
   * the passed component object is used.
   *
   * @param componentID
   * @param componentIDorObj
   * @param mountPoint
   */
  function mapViewComponent(componentID, componentObj, mountPoint) {
    _componentViewMap[componentID] = {
      controller: componentObj,
      mountPoint: mountPoint
    };
  }

  /**
   * Factory to create component view modules by concating multiple source objects
   * @param componentSource Custom module source
   * @returns {*}
   */
  function createComponentView(componentSource) {
    return function (configProps) {

      let componentAssembly, finalComponent, previousInitialize;

      componentAssembly = [
        _componentViewFactory.default(),
        _eventDelegatorFactory.default(),
        _observableFactory.default(),
        _stateObjFactory.default(),
        componentSource
      ];

      if (componentSource.mixins) {
        componentAssembly = componentAssembly.concat(componentSource.mixins);
      }

      finalComponent = Nori.assignArray({}, componentAssembly);

      // Compose a new initialize function by inserting call to component super module
      previousInitialize        = finalComponent.initialize;
      finalComponent.initialize = function initialize(initObj) {
        finalComponent.initializeComponent(initObj);
        previousInitialize.call(finalComponent, initObj);
      };

      if (configProps) {
        finalComponent.configuration = function () {
          return configProps;
        };
      }

      return _.assign({}, finalComponent);
    };
  }

  /**
   * Show a mapped componentView
   * @param componentID
   * @param dataObj
   */
  function showViewComponent(componentID, mountPoint) {
    let componentView = _componentViewMap[componentID];
    if (!componentView) {
      console.warn('No componentView mapped for id: ' + componentID);
      return;
    }

    if (!componentView.controller.isInitialized()) {
      mountPoint = mountPoint || componentView.mountPoint;
      componentView.controller.initialize({
        id        : componentID,
        template  : componentView.htmlTemplate,
        mountPoint: mountPoint
      });
    } else {
      componentView.controller.update();
    }

    componentView.controller.componentRender();
    componentView.controller.mount();
  }

  /**
   * Returns a copy of the map object for component views
   * @returns {null}
   */
  function getComponentViewMap() {
    return _.assign({}, _componentViewMap);
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    mapViewComponent   : mapViewComponent,
    createComponentView: createComponentView,
    showViewComponent  : showViewComponent,
    getComponentViewMap: getComponentViewMap
  };

};

export default MixinComponentViews();