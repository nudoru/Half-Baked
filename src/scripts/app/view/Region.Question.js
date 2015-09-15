import * as _noriActions from '../../nori/action/ActionCreator';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _template from '../../nori/utils/Templating.js';

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponentView({

  /**
   * configProps passed in from region definition on parent View
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
  initialize(configProps) {
    this.bindMap(_appStore); // Reducer store, map id string or map object
  },


  /**
   * Create an object to be used to define events on DOM elements
   * @returns {}
   */
  defineEvents() {
    return {
    'click #question__choice_1, click #question__choice_2, click #question__choice_3, click #question__choice_4': this.pickChoice.bind(this)
    };
  },

  pickChoice(evt) {
    var choice = parseInt(evt.target.getAttribute('id').substr(-1,1));
    console.log('picked',choice);
    //_app.default.sendQuestion(difficulty);
  },

  getQuestion() {
    let state = _appStore.getState(),
        question = null;
    if(state.currentQuestion) {
      question = state.currentQuestion.hasOwnProperty('question') ? state.currentQuestion.question : null;
    }
    return question;
  },

  /**
   * Set initial state properties. Call once on first render
   */
  getInitialState() {
    return this.getQuestion();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
  componentWillUpdate() {
    return this.getQuestion();
  },

  template() {
    var html = _template.getSource('game__question');
    return _.template(html);
  },

  /**
   * Only renders if there is a current question
   */
  render(state) {
    if(state.hasOwnProperty('q_text')) {
      return this.template()(state);
    }
    return '<div></div>';
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