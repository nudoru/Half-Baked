const NOOP = function () {
};

// Avoid 'console' errors in browsers that lack a console. (IE9)
//https://github.com/h5bp/html5-boilerplate/blob/master/src/js/plugins.js
(function () {
  var method,
      methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
      ],
      length  = methods.length,
      console = (window.console = window.console || {});
  while (length--) {
    method = methods[length];
    if (!console[method]) {
      console[method] = NOOP;
    }
  }
}());

//https://javascriptweblog.wordpress.com/2010/06/14/dipping-into-wu-js-autocurry/
//var autoCurry = (function () {
//  var toArray = function toArray(arr, from) {
//        return Array.prototype.slice.call(arr, from || 0);
//      },
//      curry   = function curry(fn /* variadic number of args */) {
//        var args = toArray(arguments, 1);
//        return function curried() {
//          return fn.apply(this, args.concat(toArray(arguments)));
//        };
//      };
//  return function autoCurry(fn, numArgs) {
//    numArgs = numArgs || fn.length;
//    return function autoCurried() {
//      if (arguments.length < numArgs) {
//        return numArgs - arguments.length > 0 ?
//          autoCurry(curry.apply(this, [fn].concat(toArray(arguments))),
//            numArgs - arguments.length) :
//          curry.apply(this, [fn].concat(toArray(arguments)));
//      }
//      else {
//        return fn.apply(this, arguments);
//      }
//    };
//  };
//}());

////https://www.youtube.com/watch?v=m3svKOdZijA&app=desktop
//function Maybe(val) {
//  this.val = val;
//}
//Maybe.prototype.map = function (f) {
//  return this.val ? Maybe(f(this.val)) : Maybe(null);
//};
//
////https://www.youtube.com/watch?v=m3svKOdZijA&app=desktop
//// Left value is the default if right is null
//function Either(left, right) {
//  this.left  = left;
//  this.right = right;
//}
//Either.prototype.map = function (f) {
//  return this.right ?
//    Either(this.left, f(this.right)) :
//    Either(f(this.left), null);
//};