/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// React & Redux
const { Component } = require("react");
const PropTypes = require("prop-types");

const { MESSAGE_SOURCE, MESSAGE_TYPE } = require("devtools/client/webconsole/constants");

const componentMap = new Map([
  [
    "ConsoleApiCall",
    require("devtools/client/webconsole/components/Output/message-types/ConsoleApiCall"),
  ],
  [
    "ConsoleCommand",
    require("devtools/client/webconsole/components/Output/message-types/ConsoleCommand"),
  ],
  [
    "DefaultRenderer",
    require("devtools/client/webconsole/components/Output/message-types/DefaultRenderer"),
  ],
  [
    "EvaluationResult",
    require("devtools/client/webconsole/components/Output/message-types/EvaluationResult"),
  ],
  ["PageError", require("devtools/client/webconsole/components/Output/message-types/PageError")],
]);

class MessageContainer extends Component {
  static get propTypes() {
    return {
      messageId: PropTypes.string.isRequired,
      open: PropTypes.bool.isRequired,
      payload: PropTypes.object,
      timestampsVisible: PropTypes.bool,
      repeat: PropTypes.number,
      badge: PropTypes.number,
      indent: PropTypes.number,
      isPaused: PropTypes.bool.isRequired,
      pausedExecutionPoint: PropTypes.string,
      isPrimaryHighlighted: PropTypes.bool.isRequired,
      shouldScrollIntoView: PropTypes.bool.isRequired,
    };
  }

  static get defaultProps() {
    return {
      open: false,
    };
  }

  shouldComponentUpdate(nextProps) {
    const triggeringUpdateProps = [
      "repeat",
      "open",
      "payload",
      "timestampsVisible",
      "isPaused",
      "pausedExecutionPoint",
      "badge",
      "isPrimaryHighlighted",
      "shouldScrollIntoView",
    ];

    return triggeringUpdateProps.some(prop => this.props[prop] !== nextProps[prop]);
  }

  render() {
    const message = this.props.message;
    const MessageComponent = getMessageComponent(message);
    return MessageComponent(Object.assign({ message }, this.props));
  }
}

function getMessageComponent(message) {
  if (!message) {
    return componentMap.get("DefaultRenderer");
  }

  switch (message.source) {
    case MESSAGE_SOURCE.CONSOLE_API:
    case MESSAGE_SOURCE.LOGPOINT_LOADING:
    case MESSAGE_SOURCE.LOGPOINT_RESULT:
      return componentMap.get("ConsoleApiCall");
    case MESSAGE_SOURCE.JAVASCRIPT:
      switch (message.type) {
        case MESSAGE_TYPE.COMMAND:
          return componentMap.get("ConsoleCommand");
        case MESSAGE_TYPE.RESULT:
          return componentMap.get("EvaluationResult");
        // @TODO this is probably not the right behavior, but works for now.
        // Chrome doesn't distinguish between page errors and log messages. We
        // may want to remove the PageError component and just handle errors
        // with ConsoleApiCall.
        case MESSAGE_TYPE.LOG:
          return componentMap.get("PageError");
        default:
          return componentMap.get("DefaultRenderer");
      }
  }

  return componentMap.get("DefaultRenderer");
}

module.exports.MessageContainer = MessageContainer;

// Exported so we can test it with unit tests.
module.exports.getMessageComponent = getMessageComponent;
