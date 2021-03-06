var view = require('./AppView.js');

/**
 * Module for a dynamic application view for a route or a persistent view
 */

var Component = view.createComponent({
  /**
   * Mixins are other modules/objects that multiple components share, provides
   * common functionality between then.
   */
  //mixins: [
  //  {
  //    render() {
  //      return '<h1>MIXIN!</h1>';
  //    }
  //  }
  //],

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize(configProps) {
    //Bind to a map, update will be called on changes to the map
    //this.bind(APP.store()); // Reducer store, map id string or map object

    //custom init below here
    //this.setTemplate('<h1>{{ greeting }}</h1>'); // set custom HTML template
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  //getDOMEvents: function() {
  //  return {
  //    'click #button-id': handleButton
  //  };
  //},

  /**
   * Set initial state properties. Call once on first render
   */
  getDefaultState() {
    return APP.store.getState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate() {
    var nextState = APP.store.getState();
    nextState.greeting += ' (updated)';
    return nextState;
  },

  /**
   * Determine if update/redraw should occur
   * @param nextState
   * @returns {*}
   */
  //shouldComponentUpdate: function(nextState) {
  //  // Test for differences between nextState and this.getState()
  //},

  /**
   * Render override must return HTML.
   */
  //render: function(state) {
  //  return '<h1>'+state.greeting+'</h1>';
  //},

  /**
   * Component HTML was attached to the DOM
   */
  componentDidMount() {
    //
  },

  /**
   * Component will be removed from the DOM
   */
  componentWillUnmount() {
    // Clean up
  }

});

export default Component;