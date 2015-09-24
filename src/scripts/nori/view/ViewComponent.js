/* @flow weak */

/**
 * Base module for components
 * Must be extended with custom modules
 */

import * as _template from '../utils/Templating.js';
import * as _renderer from '../utils/Renderer.js';
import * as is from '../../nudoru/util/is.js';

var ViewComponent = function () {

  let _isInitialized = false,
      _configProps,
      _id,
      _templateObjCache,
      _html,
      _DOMElement,
      _mountPoint,
      _regions       = {},
      _isMounted     = false;

  /**
   * Initialization
   * @param configProps
   */
  function initializeComponent(configProps) {
    _configProps = this.configuration() || configProps;
    _id          = _configProps.id;
    _mountPoint  = _configProps.mountPoint;

    this.setState(this.getInitialState());
    this.setEvents(this.defineEvents());

    _regions = this.defineRegions();

    this.createSubject('update');
    this.createSubject('mount');
    this.createSubject('unmount');

    this.initializeRegions();

    _isInitialized = true;
  }

  function configuration() {
    return undefined;
  }

  function defineEvents() {
    return undefined;
  }

  /**
   * Bind updates to the map ID to this view's update
   * @param mapObj Object to subscribe to or ID. Should implement nori/store/MixinObservableStore
   */
  function bindMap(mapObj) {
    if (!is.func(mapObj.subscribe)) {
      console.warn('ViewComponent bindMap, must be observable: ' + mapObj);
      return;
    }

    mapObj.subscribe(this.update.bind(this));
  }

  /**
   * Before the view updates and a rerender occurs
   * Returns nextState of component
   */
  function componentWillUpdate() {
    return this.getState();
  }

  function update() {
    let nextState = this.componentWillUpdate();
    if (this.shouldComponentUpdate(nextState)) {

      this.setState(nextState);

      if (_isMounted) {
        this.unmount();
        this.componentRender();
        this.mount();
      }

      this.updateRegions();

      this.notifySubscribersOf('update', this.getID());
    }
  }

  /**
   * Compare current state and next state to determine if updating should occur
   * If the next state exists and it's not equal to the current state
   * @param nextState
   * @returns {*}
   */
  function shouldComponentUpdate(nextState) {
    return _.isEqual(this.getState(), nextState) !== true;
  }

  /**
   * Render it, need to add it to a parent container, handled in higher level view
   * @returns {*}
   */
  function componentRender() {
    if (!_templateObjCache) {
      _templateObjCache = this.template(this.getState());
    }

    _html = this.render(this.getState());

    this.renderRegions();
  }

  /**
   * Returns a Lodash client side template function by getting the HTML source from
   * the matching <script type='text/template'> tag in the document. OR you may
   * specify the custom HTML to use here.
   *
   * The method is called only on the first render and cached to speed up renders
   *
   * @returns {Function}
   */
  function template(state) {
    // assumes the template ID matches the component's ID as passed on initialize
    let html = _template.getSource(this.getID());
    return _.template(html);
  }

  /**
   * May be overridden in a submodule for custom rendering
   * Should return HTML
   * @returns {*}
   */
  function render(state) {
    return _templateObjCache(state);
  }

  /**
   * Append it to a parent element
   * @param mountEl
   */
  function mount() {
    if (!_html || _html.length === 0) {
      console.warn('Component ' + _id + ' cannot mount with no HTML. Call render() first?');
      return;
    }

    _isMounted = true;

    _DOMElement = (_renderer.render({
      target: _mountPoint,
      html  : _html
    }));

    if (this.delegateEvents) {
      if (this.shouldDelegateEvents()) {
        // Pass true to automatically pass form element handlers the elements value or other status
        this.delegateEvents(true);
      }

    }

    this.mountRegions();

    if (this.componentDidMount) {
      this.componentDidMount();
    }

    this.notifySubscribersOf('mount', this.getID());
  }

  /**
   * Override to delegate events or not based on some state trigger
   * @returns {boolean}
   */
  function shouldDelegateEvents() {
    return true;
  }

  /**
   * Call after it's been added to a view
   */
  function componentDidMount() {
    // stub
  }

  /**
   * Call when unloading
   */
  function componentWillUnmount() {
    // stub
  }

  function unmount() {
    // Tweens are present in the MixinDOMManipulation. This is convenience
    if(this.killTweens) {
      this.killTweens();
    }

    this.componentWillUnmount();

    //this.unmountRegions();

    _isMounted = false;

    if (this.undelegateEvents) {
      this.undelegateEvents();
    }

    _renderer.render({
      target: _mountPoint,
      html  : ''
    });

    _html       = '';
    _DOMElement = null;
    this.notifySubscribersOf('unmount', this.getID());
  }

  function dispose() {
    this.componentWillDispose();
    this.disposeRegions();
    this.unmount();
  }

  function componentWillDispose() {
    //
  }

  //----------------------------------------------------------------------------
  //  Regions
  //----------------------------------------------------------------------------

  function defineRegions() {
    return undefined;
  }

  function getRegion(id) {
    return _regions[id];
  }

  function getRegionIDs() {
    return _regions ? Object.keys(_regions) : [];
  }

  function initializeRegions() {
    getRegionIDs().forEach(region => {
      _regions[region].initialize();
    });
  }

  function updateRegions() {
    getRegionIDs().forEach(region => {
      _regions[region].update();
    });
  }

  function renderRegions() {
    getRegionIDs().forEach(region => {
      _regions[region].componentRender();
    });
  }

  function mountRegions() {
    getRegionIDs().forEach(region => {
      _regions[region].mount();
    });
  }

  function unmountRegions() {
    getRegionIDs().forEach(region => {
      _regions[region].unmount();
    });
  }

  function disposeRegions() {
    getRegionIDs().forEach(region => {
      _regions[region].dispose();
    });
  }

  //----------------------------------------------------------------------------
  //  Accessors
  //----------------------------------------------------------------------------

  function isInitialized() {
    return _isInitialized;
  }

  function getConfigProps() {
    return _configProps;
  }

  function isMounted() {
    return _isMounted;
  }

  function getInitialState() {
    this.setState({});
  }

  function getID() {
    return _id;
  }

  function getDOMElement() {
    return _DOMElement;
  }

  //----------------------------------------------------------------------------
  //  API
  //----------------------------------------------------------------------------

  return {
    initializeComponent  : initializeComponent,
    configuration        : configuration,
    defineRegions        : defineRegions,
    defineEvents         : defineEvents,
    isInitialized        : isInitialized,
    getConfigProps       : getConfigProps,
    getInitialState      : getInitialState,
    getID                : getID,
    template             : template,
    getDOMElement        : getDOMElement,
    isMounted            : isMounted,
    bindMap              : bindMap,
    componentWillUpdate  : componentWillUpdate,
    shouldComponentUpdate: shouldComponentUpdate,
    update               : update,
    componentRender      : componentRender,
    render               : render,
    mount                : mount,
    shouldDelegateEvents : shouldDelegateEvents,
    componentDidMount    : componentDidMount,
    componentWillUnmount : componentWillUnmount,
    unmount              : unmount,
    dispose              : dispose,
    componentWillDispose : componentWillDispose,
    getRegion            : getRegion,
    getRegionIDs         : getRegionIDs,
    initializeRegions    : initializeRegions,
    updateRegions        : updateRegions,
    renderRegions        : renderRegions,
    mountRegions         : mountRegions,
    unmountRegions       : unmountRegions,
    disposeRegions       : disposeRegions
  };

};

export default ViewComponent;