let MixinDOMManipulation = function () {

  var _tweenedEls = [];

  function addTweenedElement(selector) {
    let el = document.querySelector(selector);
    if (el) {
      _tweenedEls.push(el);
      return el;
    }
    console.warn('MixinDOMManipulation, selector not found ' + selector);
    return null;
  }

  function tweenTo(selector, dur, props) {
    let el = addTweenedElement(selector);
    //TweenLite.killTweensOf(el);
    return TweenLite.to(el, dur, props);
  }

  function tweenFrom(selector, dur, props) {
    let el = addTweenedElement(selector);
    //TweenLite.killTweensOf(el);
    return TweenLite.from(el, dur, props);
  }

  function killTweens() {
    _tweenedEls.forEach(el => {
      TweenLite.killTweensOf(el);
    });

    _tweenedEls = [];
  }

  function hideEl(selector) {
    let el = document.querySelector(selector);
    if (el) {
      TweenLite.set(el, {
        alpha  : 0,
        display: 'none'
      });
    }
  }

  function showEl(selector) {
    let el = document.querySelector(selector);
    if (el) {
      TweenLite.set(el, {
        alpha  : 1,
        display: 'block'
      });
    }
  }

  return {
    showEl    : showEl,
    hideEl    : hideEl,
    tweenTo   : tweenTo,
    tweenFrom : tweenFrom,
    killTweens: killTweens
  };

};

export default MixinDOMManipulation();