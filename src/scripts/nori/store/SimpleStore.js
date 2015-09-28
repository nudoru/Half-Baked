/* @flow weak */

let SimpleStore = function () {
  let _internalState = Object.create(null);

  /**
   * Return a copy of the state
   * @returns {void|*}
   */
  function getState() {
    return Object.assign({}, _internalState);
  }

  /**
   * Sets the state
   * @param nextState
   */
  function setState(nextState) {
    _internalState = Object.assign({}, _internalState, nextState);
  }

  return {
    getState: getState,
    setState: setState
  };

};

export default SimpleStore;