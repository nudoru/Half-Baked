import * as _noriActions from '../../nori/action/ActionCreator';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _appActions from '../action/ActionCreator.js';
import * as _template from '../../nori/utils/Templating.js';
import * as Rxjs from '../../vendor/rxjs/rx.lite.min.js';
import * as _mixinDOMManipulation from '../../nori/view/MixinDOMManipulation.js';

let _questionChangeObs = null,
    _timerObservable   = null,
    _baseMaxSeconds    = 10,
    _timerValue        = 0;

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponentView({

  mixins: [
    _mixinDOMManipulation
  ],


  /**
   * configProps passed in from region definition on parent View
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
    initialize(configProps) {
    this.bindMap(_appStore);
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
    let choice = parseInt(evt.target.getAttribute('id').substr(-1, 1));

    if (this.isCorrect(choice)) {
      this.scoreCorrect();
    } else {
      this.scoreIncorrect();
    }
  },

  isCorrect(choice) {
    return parseInt(choice) === this.getState().question.q_correct_option;
  },

  scoreCorrect() {
    let qPoints         = this.getState().question.q_difficulty_level,
        answeredCorrect = _appActions.answeredCorrect(qPoints),
        clearQuestion   = _appActions.clearQuestion();

    this.clearTimer();

    _appStore.apply([answeredCorrect, clearQuestion]);

    _appView.default.positiveAlert('You got it!', 'Correct!');
  },

  scoreIncorrect() {
    let state             = _appStore.getState(),
        question          = state.currentQuestion.question,
        qPoints           = question.q_difficulty_level,
        caText            = question['q_options_' + question.q_correct_option],
        answeredIncorrect = _appActions.answeredIncorrect(qPoints),
        clearQuestion     = _appActions.clearQuestion();

    this.clearTimer();

    _appStore.apply([answeredIncorrect, clearQuestion]);

    _appView.default.negativeAlert('The correct answer was <span class="correct-answer">' + caText + '</span>', 'You missed that one!');
  },

  getQuestionState() {
    let state     = _appStore.getState(),
        viewState = {question: null};

    if (state.currentQuestion) {
      if (state.currentQuestion.hasOwnProperty('question')) {

        let question       = state.currentQuestion.question;
        viewState.question = question;

        console.log('Correct choice: ', question['q_options_' + question.q_correct_option]);
      }
    }

    return viewState;
  },

  /**
   * Set initial state properties. Call once on first render
   */
    getInitialState() {
    return this.getQuestionState();
  },

  /**
   * State change on bound stores (map, etc.) Return nextState object
   */
    componentWillUpdate() {
    return this.getQuestionState();
  },

  template() {
    var html = _template.getSource('game__question');
    return _.template(html);
  },

  /**
   * Only renders if there is a current question
   */
    render(state) {
    if (this.hasQuestion()) {
      _appView.default.closeAllAlerts();
      return this.template()(state);
    }

    return '<div></div>';
  },

  hasQuestion() {
    return this.getState().question;
  },

  /**
   * Only attach events to buttons if there is a question!
   */
    shouldDelegateEvents() {
    return this.hasQuestion();
  },

  /**
   * Component HTML was attached to the DOM
   */
    componentDidMount() {
    if (this.hasQuestion()) {
      this.startTimer();
      this.animateChoices();
    } else {
      this.clearTimer();
    }
  },

  animateChoices() {
    let choices = ['#question__choice_1',
      '#question__choice_2',
      '#question__choice_3',
      '#question__choice_4'];

    choices.forEach((choice, i) => {

      this.tweenFromTo(choice, 0.5, {
        alpha: 0,
        x    : -200
      }, {
        alpha: 1,
        x    : 0,
        delay: i * 0.25,
        ease : Back.easeOut
      });

    });
  },

  startTimer() {
    if (_timerObservable) {
      this.clearTimer();
    }

    let viewState = this.getState();
    _timerValue   = _baseMaxSeconds + ((parseInt(viewState.question.q_difficulty_level) - 1) * 5);

    this.updateTimerText(_timerValue);

    _timerObservable = Rxjs.Observable.interval(1000).take(_timerValue).subscribe(this.onTimerTick.bind(this),
      function onErr() {
      },
      this.onTimerComplete.bind(this));
  },

  onTimerTick(second) {
    this.updateTimerText(_timerValue - (second + 1));
  },

  updateTimerText(number) {
    let timerEl = document.querySelector('#question__timer');
    if (timerEl) {
      timerEl.innerHTML = number + ' seconds left';
    }
  },

  onTimerComplete() {
    this.scoreIncorrect();
  },

  clearTimer() {
    if (_timerObservable) {
      _timerObservable.dispose();
    }
    _timerValue      = 0;
    _timerObservable = null;
  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount() {
    this.clearTimer();
    this.killTweens();
  },

  componentWillDispose() {
    if (_questionChangeObs) {
      _questionChangeObs.dispose();
    }
  }


});

export default Component;