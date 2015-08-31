ndefine('app/action/ActionConstants',
  function (nrequire, module, exports) {
    var objUtils = nrequire('nudoru/core/ObjectUtils');

    /**
     * Event name string constants
     */

    _.merge(module.exports, objUtils.keyMirror({
      CHANGE_GAME_STATE: null,
      LOCAL_PLAYER_CONNECT: null,
      SELECT_PLAYER: null,
      REMOTE_PLAYER_CONNECT: null,
      GAME_START: null,
      LOCAL_QUESTION: null,
      REMOTE_QUESTION: null,
      LOCAL_PLAYER_HEALTH_CHANGE: null,
      REMOTE_PLAYER_HEALTH_CHANGE: null,
      GAME_OVER: null
    }));
  });