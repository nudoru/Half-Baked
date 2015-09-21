import * as is from '../../nudoru/util/is.js';

let MixinDOMManipulation = function () {

  let _tweenedEls = [],
      _zIndex     = 1000;

  function toTop(selector) {
    let el = document.querySelector(selector);
    if (el) {
      el.style.zIndex = _zIndex++;
    }
    console.warn('MixinDOMManipulation, to top, selector not found ' + selector);
  }

  function getElement(selector) {
    let el;

    if (is.string(selector)) {
      el = document.querySelector(selector);
    } else {
      el = selector;
    }

    if (!el) {
      console.warn('MixinDOMManipulation, selector not found ' + selector);
    }

    return el;
  }

  function addTweenedElement(selector) {
    let el = getElement(selector);

    if (el) {
      _tweenedEls.push(el);
      return el;
    }

    return null;
  }

  function tweenTo(selector, dur, props) {
    let el = addTweenedElement(selector);

    if (!el) {
      return;
    }
    TweenLite.killTweensOf(el)
    return TweenLite.to(el, dur, props);
  }

  function tweenFrom(selector, dur, props) {
    let el = addTweenedElement(selector);

    if (!el) {
      return;
    }
    TweenLite.killTweensOf(el)
    return TweenLite.from(el, dur, props);
  }

  function killTweens() {
    _tweenedEls.forEach(el => {
      TweenLite.killTweensOf(el);
    });

    _tweenedEls = [];
  }

  function hideEl(selector) {
    tweenSet(selector, {
      alpha  : 0,
      display: 'none'
    });
  }

  function showEl(selector) {
    tweenSet(selector, {
      alpha  : 1,
      display: 'block'
    });
  }

  function tweenSet(selector, props) {
    let el = getElement(selector);
    if (el) {
      TweenLite.set(el, props);
    }
  }

  return {
    toTop     : toTop,
    showEl    : showEl,
    hideEl    : hideEl,
    tweenSet  : tweenSet,
    tweenTo   : tweenTo,
    tweenFrom : tweenFrom,
    killTweens: killTweens
  };

};

export default MixinDOMManipulation();