/* @flow weak */

import * as _notificationView from '../../nudoru/components/ToastView.js';
import * as _toolTipView from '../../nudoru/components/ToolTipView.js';
import * as _messageBoxView from '../../nudoru/components/MessageBoxView.js';
import * as _messageBoxCreator from '../../nudoru/components/MessageBoxCreator.js';
import * as _modalCoverView from '../../nudoru/components/ModalCoverView.js';

let MixinNudoruControls = function () {

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
    return mbCreator().alert(title || 'Alert', message);
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
    notify                  : notify
  };

};

export default MixinNudoruControls();