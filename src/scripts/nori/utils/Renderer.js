/* @flow weak */

/**
 * Utility to handle all view DOM attachment tasks
 */

let Renderer = function () {
  const _domUtils = require('../../nudoru/browser/DOMUtils.js');

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

module.exports = Renderer();