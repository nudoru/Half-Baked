/* @flow weak */

import * as _notificationView from '../../nudoru/components/ToastView.js';
import * as _toolTipView from '../../nudoru/components/ToolTipView.js';
import * as _messageBoxView from '../../nudoru/components/MessageBoxView.js';
import * as _messageBoxCreator from '../../nudoru/components/MessageBoxCreator.js';
import * as _modalCoverView from '../../nudoru/components/ModalCoverView.js';

let MixinNudoruControls = function () {

  var _alerts = [];

  function initializeNudoruControls() {
    _toolTipView.initialize('tooltip__container');
    _notificationView.initialize('toast__container');
    _messageBoxView.initialize('messagebox__container');
    _modalCoverView.initialize();
  }

  function mbCreator() {
    return _messageBoxCreator;
  }

  function addMessageBox(obj) {
    return _messageBoxView.add(obj);
  }

  function removeMessageBox(id) {
    _messageBoxView.remove(id);
  }

  function alert(message, title) {
    let alertInst = mbCreator().alert(title || 'Alert', message);

    _alerts.push(alertInst);
    return alertInst;
  }

  function closeAllAlerts() {
    _alerts.forEach(id => {
      removeMessageBox(id);
    });
    _alerts = [];
  }

  function addNotification(obj) {
    return _notificationView.add(obj);
  }

  function notify(message, title, type) {
    return addNotification({
      title  : title || '',
      type   : type || _notificationView.type().DEFAULT,
      message: message
    });
  }

  return {
    initializeNudoruControls: initializeNudoruControls,
    mbCreator               : mbCreator,
    addMessageBox           : addMessageBox,
    removeMessageBox        : removeMessageBox,
    addNotification         : addNotification,
    alert                   : alert,
    closeAllAlerts          : closeAllAlerts,
    notify                  : notify
  };

};

export default MixinNudoruControls();