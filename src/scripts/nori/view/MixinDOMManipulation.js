let MixinDOMManipulation = function () {

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
    showEl: showEl,
    hideEl: hideEl
  };

};

export default MixinDOMManipulation();