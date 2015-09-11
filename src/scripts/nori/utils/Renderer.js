/* @flow weak */

/**
 * Utility to handle all view DOM attachment tasks
 */

import * as _domUtils from '../../nudoru/browser/DOMUtils.js';

let Renderer = function () {
  function render({target, html, callback}) {
    let domEl,
        mountPoint     = document.querySelector(target);

    mountPoint.innerHTML = '';

    if (html) {
      domEl = _domUtils.HTMLStrToNode(html);
      mountPoint.appendChild(domEl);
    }

    if (callback) {
      callback(domEl);
    }

    return domEl;
  }

  return {
    render: render
  };

};

export default Renderer();