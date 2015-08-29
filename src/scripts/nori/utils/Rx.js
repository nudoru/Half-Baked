define('nori/utils/Rx',
  function (require, module, exports) {

    module.exports = {
      dom: function (selector, event) {
        var el = document.querySelector(selector);
        if (!el) {
          console.warn('nori/utils/Rx, dom, invalid DOM selector: ' + selector);
          return;
        }
        return Rx.Observable.fromEvent(el, event.trim());
      },

      from: function (ittr) {
        return Rx.Observable.from(ittr);
      },

      interval: function (ms) {
        return Rx.Observable.interval(ms);
      },

      just: function (value) {
        return Rx.Observable.just(value);
      },

      empty: function() {
        return Rx.Observable.empty();
      }

    };

  });