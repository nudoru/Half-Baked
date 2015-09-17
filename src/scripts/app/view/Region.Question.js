import * as _noriActions from '../../nori/action/ActionCreator';
import * as _appView from './AppView';
import * as _appStore from '../store/AppStore';
import * as _appActions from '../action/ActionCreator.js';
import * as _template from '../../nori/utils/Templating.js';
import * as Rxjs from '../../vendor/rxjs/rx.lite.min.js';

/**
 * Module for a dynamic application view for a route or a persistent view
 */
var Component = Nori.view().createComponentView({

  storeQuestionChangeObs : null,
  timerObservable        : null,
  baseMaxSeconds         : 10,
  d1MaxSeconds           : 10,
  d2MaxSeconds           : 15,
  d3MaxSeconds           : 20,
  d4MaxSeconds           : 25,
  d5MaxSeconds           : 30,
  currentSecondTimerValue: 0,


  // cache this
  correctChoiceText: '',

  /**
   * configProps passed in from region definition on parent View
   * Initialize and bind, called once on first render. Parent component is
   * initialized from app view
   * @param configProps
   */
    initialize(configProps) {
    this.storeQuestionChangeObs = _appStore.subscribe('currentQuestionChange', this.update.bind(this));
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
    let choice  = parseInt(evt.target.getAttribute('id').substr(-1, 1)),
        correct = this.isCorrect(choice);

    if (correct) {
      this.scoreCorrect();
      _appView.default.positiveAlert('You got it!', 'Correct!');
    } else {
      this.scoreIncorrect();
      _appView.default.negativeAlert('The correct answer was <span class="correct-answer">' + this.correctChoiceText + '</span>', 'You missed that one!');
    }
  },

  isCorrect(choice) {
    return parseInt(choice) === this.getState().question.q_correct_option;
  },

  scoreCorrect() {
    let state           = _appStore.getState(),
        qPoints         = this.getState().question.q_difficulty_level,
        localScore      = state.localPlayer.score + qPoints,
        localHealth     = state.localPlayer.health,
        playerAction    = _appActions.setLocalPlayerProps({
          health: localHealth,
          score : localScore
        }),
        answeredCorrect = _appActions.answeredCorrect(qPoints),
        clearQuestion   = _appActions.clearQuestion();

    _appStore.apply([playerAction, clearQuestion, answeredCorrect]);
  },

  scoreIncorrect() {
    let state             = _appStore.getState(),
        qPoints           = this.getState().question.q_difficulty_level,
        localScore        = state.localPlayer.score,
        localHealth       = state.localPlayer.health - qPoints,
        playerAction      = _appActions.setLocalPlayerProps({
          health: localHealth,
          score : localScore
        }),
        answeredIncorrect = _appActions.answeredIncorrect(qPoints),
        clearQuestion     = _appActions.clearQuestion();

    _appStore.apply([playerAction, clearQuestion, answeredIncorrect]);
  },

  getQuestion() {
    let state     = _appStore.getState(),
        viewState = {question: null};

    if (state.currentQuestion) {
      if (state.currentQuestion.hasOwnProperty('question')) {
        let question           = state.currentQuestion.question;
        viewState.question     = question;
        this.correctChoiceText = question['q_options_' + question.q_correct_option];
        console.log('Correct choice: ', this.correctChoiceText);
      }
    }

    return viewState;
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
    } else {
      this.clearTimer();
    }
  },

  startTimer() {
    if (this.timerObservable) {
      this.clearTimer();
    }

    let viewState = this.getState();
        this.currentSecondTimerValue   = this['d' + viewState.question.q_difficulty_level + 'MaxSeconds'];

    this.updateTimerText(this.currentSecondTimerValue);

    this.timerObservable = Rxjs.Observable.interval(1000).take(this.currentSecondTimerValue).subscribe(this.onTimerTick.bind(this),
      function onErr() {
      },
      this.onTimerComplete.bind(this));
  },

  onTimerTick(second) {
    this.updateTimerText(this.currentSecondTimerValue - (second + 1));
  },

  updateTimerText(number) {
    let timerEl = document.querySelector('#question__timer');
    if (timerEl) {
      timerEl.innerHTML = number + ' seconds left';
    }
  },

  // TODO move this logic up to pickChoice
  onTimerComplete() {
    this.clearTimer();
    this.scoreIncorrect();
    _appView.default.negativeAlert('The correct answer was <span class="correct-answer">' + this.correctChoiceText + '</span>.', 'Time\'s up!');
  },

  clearTimer() {
    if (this.timerObservable) {
      this.timerObservable.dispose();
    }
  },

  /**
   * Component will be removed from the DOM
   */
    componentWillUnmount() {
    this.clearTimer();
  },

  componentWillDispose() {
    if (this.storeQuestionChangeObs) {
      this.storeQuestionChangeObs.dispose();
    }
  }


});

export default Component;