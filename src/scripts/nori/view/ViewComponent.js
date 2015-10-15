/* @flow weak */

/**
 * Base module for components
 * Must be extended with custom modules
 */

import _template from '../utils/Templating.js';
import _renderer from '../utils/Renderer.js';
import is from '../../nudoru/util/is.js';

var ViewComponent = function () {

  let _internalState = {},
      _internalProps = {},
      _publicState   = {},
      _publicProps   = {},
      _isInitialized = false,
      _isMounted     = false,
      _regions       = {},
      _id,
      _templateObjCache,
      _html,
      _DOMElement,
      _mountPoint,
      _mountDelay;


  /**
   * Initialization
   * @param initProps
   */
  function initializeComponent(initProps) {
    setProps(_.assign({}, this.getDefaultProps(), initProps));

    _id         = _internalProps.id;
    _mountPoint = _internalProps.mountPoint;

    this.setState(this.getInitialState());
    this.setEvents(this.defineEvents());

    _regions = this.defineRegions();

    this.initializeRegions();

    _isInitialized = true;
  }

  /**
   * Override to set default props
   *
   * For a region, which is instantiated from the factory with props, this function
   * will be overwritten by the code in MixinComponentView to return the passed
   * initProps object
   * @returns {undefined}
   */
  function getDefaultProps() {
    return undefined;
  }

  /**
   * Override in implementation
   *
   * Define DOM events to be attached after the element is mounted
   * @returns {undefined}
   */
  function defineEvents() {
    return undefined;
  }

  /**
   * Bind updates to the map ID to this view's update
   * @param observableStore Object to subscribe to or ID. Should implement nori/store/MixinObservableStore
   */
  function bind(observableStore) {
    if (!is.func(observableStore.subscribe)) {
      console.warn('ViewComponent bind, must be observable: ' + observableStore);
      return;
    }

    observableStore.subscribe(this.update.bind(this));
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
    }
  }

  /**
   * Compare current state and next state to determine if updating should occur
   * If the next state exists and it's not equal to the current state
   * @param nextState
   * @returns {*}
   */
  function shouldComponentUpdate(nextState) {
    return !(_.isEqual(this.getState(), nextState));
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
        // True to automatically pass form element handlers the elements value or other status
        this.delegateEvents(true);
      }
    }

    if (this.componentDidMount) {
      //this.componentDidMount.bind(this);

      // TODO fix this issue, shouldn't need this hack
      // This delay helps animation on components run on mount
      _mountDelay = _.delay(this.mountAfterDelay.bind(this), 10);
    }
  }

  function mountAfterDelay() {
    if (_mountDelay) {
      window.clearTimeout(_mountDelay);
    }

    this.mountRegions();

    this.componentDidMount();
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

    if (_mountDelay) {
      window.clearTimeout(_mountDelay);
    }

    // Tweens are present in the MixinDOMManipulation. This is convenience
    if (this.killTweens) {
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
  //  Props and state
  //----------------------------------------------------------------------------

  function getInitialState() {
    this.setState({});
  }

  function getState() {
    return _.assign({}, _internalState);
  }

  function setState(nextState) {
    _internalState = _.assign({}, _internalState, nextState);
    _publicState   = _.assign(_publicState , _internalState);
  }

  function getProps() {
    return _.assign({}, _internalProps);
  }

  function setProps(nextProps) {
    _internalProps = _.merge({}, _internalProps, nextProps);
    _publicProps   = _.assign(_publicProps, _internalProps);
  }

  //----------------------------------------------------------------------------
  //  Accessors
  //----------------------------------------------------------------------------

  function isInitialized() {
    return _isInitialized;
  }

  function isMounted() {
    return _isMounted;
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
    state                : _publicState,
    props                : _publicProps,
    getProps             : getProps,
    setProps             : setProps,
    getInitialState      : getInitialState,
    getState             : getState,
    setState             : setState,
    getDefaultProps      : getDefaultProps,
    defineRegions        : defineRegions,
    defineEvents         : defineEvents,
    isInitialized        : isInitialized,
    getID                : getID,
    template             : template,
    getDOMElement        : getDOMElement,
    isMounted            : isMounted,
    bind                 : bind,
    componentWillUpdate  : componentWillUpdate,
    shouldComponentUpdate: shouldComponentUpdate,
    update               : update,
    componentRender      : componentRender,
    render               : render,
    mount                : mount,
    shouldDelegateEvents : shouldDelegateEvents,
    mountAfterDelay      : mountAfterDelay,
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