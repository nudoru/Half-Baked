/* @flow */

/**
 * RxJS Helpers
 * @type {{dom: Function, from: Function, interval: Function, doEvery: Function, just: Function, empty: Function}}
 */

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

  doEvery: function (ms, ...args) {
    if(is.function(args[0])) {
      return this.interval(ms).subscribe(args[0]);
    }
    return this.interval(ms).take(args[0]).subscribe(args[1]);
  },

  just: function (value) {
    return Rx.Observable.just(value);
  },

  empty: function () {
    return Rx.Observable.empty();
  }

};