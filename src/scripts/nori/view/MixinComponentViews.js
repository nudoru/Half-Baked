/* @flow weak */

/**
 * Mixin view that allows for component views
 */

var MixinComponentViews = function () {

  var _componentViewMap            = Object.create(null),
      _template                    = require('../utils/Templating.js');

  /**
   * Return the template object
   * @returns {*}
   */
  function getTemplate() {
    return _template;
  }

  /**
   * Map a component to a mounting point. If a string is passed,
   * the correct object will be created from the factory method, otherwise,
   * the passed component object is used.
   *
   * @param componentID
   * @param componentIDorObj
   * @param mountPoint
   */
  function mapViewComponent(componentID, componentIDorObj, mountPoint) {
    var componentObj;

    if (typeof componentIDorObj === 'string') {
      var componentFactory = require(componentIDorObj);
      componentObj         = createComponentView(componentFactory())();
    } else {
      componentObj = componentIDorObj;
    }

    _componentViewMap[componentID] = {
      htmlTemplate: _template.getTemplate(componentID),
      controller  : componentObj,
      mountPoint  : mountPoint
    };
  }

  /**
   * Factory to create component view modules by concating multiple source objects
   * @param componentSource Custom module source
   * @returns {*}
   */
  function createComponentView(componentSource) {
    return function () {
      var componentViewFactory  = require('./ViewComponent.js'),
          eventDelegatorFactory = require('./MixinEventDelegator.js'),
          observableFactory     = require('../utils/MixinObservableSubject.js'),
          stateObjFactory    = require('../store/ImmutableMap.js'),
          componentAssembly, finalComponent, previousInitialize;

      componentAssembly = [
        componentViewFactory(),
        eventDelegatorFactory(),
        observableFactory(),
        stateObjFactory(),
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

      return _.assign({}, finalComponent);
    };
  }

  /**
   * Show a mapped componentView
   * @param componentID
   * @param dataObj
   */
  function showViewComponent(componentID, mountPoint) {
    var componentView = _componentViewMap[componentID];
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
    template           : getTemplate,
    mapViewComponent   : mapViewComponent,
    createComponentView: createComponentView,
    showViewComponent  : showViewComponent,
    getComponentViewMap: getComponentViewMap
  };

};

module.exports = MixinComponentViews();