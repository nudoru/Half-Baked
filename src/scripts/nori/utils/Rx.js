define('nori/utils/Rx',
  function (require, module, exports) {

    module.exports = {
      dom: function(element, event) {
        return Rx.Observable.fromEvent(document.querySelector(element), event);
      },

      from: function(ittr) {
        return Rx.Observable.from(ittr);
      },

      interval: function(ms) {
        return Rx.Observable.interval(ms);
      },

      just: function(value) {
        return Rx.Observable.just(value);
      }
    };

  });