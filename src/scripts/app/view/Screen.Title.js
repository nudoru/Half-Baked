import _noriActions from '../../nori/action/ActionCreator';
import _appView from './AppView';
import _appStore from '../store/AppStore';
import _template from '../../nori/utils/Templating.js';

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponent({

  /**
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize(configProps) {
    //
  },

  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents() {
    return {
      'click #title__button-start'() {
        _appStore.apply(_noriActions.changeStoreState({currentState: _appStore.getState().gameStates[1]}));
      }
    };
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState() {
    return {};
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate() {
    return {};
  },

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
    //
  }

});

export default Component;