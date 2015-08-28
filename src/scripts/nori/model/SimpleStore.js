define('nori/model/SimpleStore',
  function (require, module, exports) {

    var SimpleStore = function () {
      var _internalState   = Object.create(null);

      /**
       * Return a copy of the state
       * @returns {void|*}
       */
      function getState() {
        return _.assign({}, _internalState);
      }

      /**
       * Sets the state
       * @param nextState
       */
      function setState(nextState) {
        _internalState = _.assign(_internalState, nextState);
      }

      return {
        getState : getState,
        setState : setState
      };

    };

    module.exports = SimpleStore;

  });