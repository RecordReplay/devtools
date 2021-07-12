/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const l10n = require("devtools/client/webconsole/utils/l10n");
/*
const {
  getUrlDetails,
} = require("devtools/client/netmonitor/src/utils/request-utils");
*/

// URL Regex, common idioms:
//
// Lead-in (URL):
// (                     Capture because we need to know if there was a lead-in
//                       character so we can include it as part of the text
//                       preceding the match. We lack look-behind matching.
//  ^|                   The URL can start at the beginning of the string.
//  [\s(,;'"`“]          Or whitespace or some punctuation that does not imply
//                       a context which would preclude a URL.
// )
//
// We do not need a trailing look-ahead because our regex's will terminate
// because they run out of characters they can eat.

// What we do not attempt to have the regexp do:
// - Avoid trailing '.' and ')' characters.  We let our greedy match absorb
//   these, but have a separate regex for extra characters to leave off at the
//   end.
//
// The Regex (apart from lead-in/lead-out):
// (                     Begin capture of the URL
//  (?:                  (potential detect beginnings)
//   https?:\/\/|        Start with "http" or "https"
//   www\d{0,3}[.][a-z0-9.\-]{2,249}|
//                      Start with "www", up to 3 numbers, then "." then
//                       something that looks domain-namey.  We differ from the
//                       next case in that we do not constrain the top-level
//                       domain as tightly and do not require a trailing path
//                       indicator of "/".  This is IDN root compatible.
//   [a-z0-9.\-]{2,250}[.][a-z]{2,4}\/
//                       Detect a non-www domain, but requiring a trailing "/"
//                       to indicate a path.  This only detects IDN domains
//                       with a non-IDN root.  This is reasonable in cases where
//                       there is no explicit http/https start us out, but
//                       unreasonable where there is.  Our real fix is the bug
//                       to port the Thunderbird/gecko linkification logic.
//
//                       Domain names can be up to 253 characters long, and are
//                       limited to a-zA-Z0-9 and '-'.  The roots don't have
//                       hyphens unless they are IDN roots.  Root zones can be
//                       found here: http://www.iana.org/domains/root/db
//  )
//  [-\w.!~*'();,/?:@&=+$#%]*
//                       path onwards. We allow the set of characters that
//                       encodeURI does not escape plus the result of escaping
//                       (so also '%')
// )
// eslint-disable-next-line max-len
const urlRegex = /(^|[\s(,;'"`“])((?:https?:\/\/|www\d{0,3}[.][a-z0-9.\-]{2,249}|[a-z0-9.\-]{2,250}[.][a-z]{2,4}\/)[-\w.!~*'();,/?:@&=+$#%]*)/im;

// Set of terminators that are likely to have been part of the context rather
// than part of the URL and so should be uneaten. This is '(', ',', ';', plus
// quotes and question end-ing punctuation and the potential permutations with
// parentheses (english-specific).
const uneatLastUrlCharsRegex = /(?:[),;.!?`'"]|[.!?]\)|\)[.!?])$/;

const {
  MESSAGE_SOURCE,
  MESSAGE_TYPE,
  MESSAGE_LEVEL,
} = require("devtools/client/webconsole/constants");
const { ConsoleMessage } = require("devtools/client/webconsole/types");

function prepareMessage(packet, idGenerator) {
  if (!packet.source) {
    packet = transformPacket(packet);
  }

  packet.id = idGenerator.getNextId(packet);
  return packet;
}

/**
 * Transforms a packet from Firefox RDP structure to Chrome RDP structure.
 */
function transformPacket(packet) {
  if (packet._type) {
    packet = convertCachedPacket(packet);
  }

  switch (packet.category) {
    case "ConsoleAPI": {
      return transformConsoleAPICallPacket(packet);
    }

    case "LogpointLoading": {
      return transformLogpointLoadingPacket(packet);
    }

    case "LogpointResult": {
      return transformLogpointResultPacket(packet);
    }

    case "will-navigate": {
      return transformNavigationMessagePacket(packet);
    }

    case "logMessage": {
      return transformLogMessagePacket(packet);
    }

    case "PageError": {
      return transformPageErrorPacket(packet);
    }

    case "evaluationResult":
    default: {
      return transformEvaluationResultPacket(packet);
    }
  }
}

// eslint-disable-next-line complexity
function transformConsoleAPICallPacket(message) {
  const parameters = message.argumentValues;

  const frame = message.sourceName
    ? {
        source: message.sourceName,
        sourceId: message.sourceId,
        line: message.lineNumber,
        column: message.columnNumber,
      }
    : null;

  let level = "log";
  if (message.warning) {
    level = "warn";
  } else if (message.error || message.assert) {
    level = "error";
  }

  let type = MESSAGE_TYPE.LOG;
  if (message.trace) {
    type = MESSAGE_TYPE.TRACE;
  } else if (message.error) {
    type = "error";
  } else if (message.assert) {
    type = "assert";
  } else if (message.logpointId) {
    type = "logPoint";
  }

  return new ConsoleMessage({
    source: MESSAGE_SOURCE.CONSOLE_API,
    type,
    level,
    parameters,
    messageText: message.errorMessage,
    stacktrace: message.stacktrace ? message.stacktrace : null,
    frame,
    timeStamp: message.timeStamp,
    userProvidedStyles: message.styles,
    prefix: message.prefix,
    private: message.private,
    executionPoint: message.executionPoint,
    executionPointTime: message.executionPointTime,
    executionPointHasFrames: message.executionPointHasFrames,
    logpointId: message.logpointId,
    pauseId: message.pauseId,
  });
}

function transformLogpointLoadingPacket(packet) {
  return {
    ...transformConsoleAPICallPacket(packet),
    source: MESSAGE_SOURCE.LOGPOINT_LOADING,
  };
}

function transformLogpointResultPacket(packet) {
  return {
    ...transformConsoleAPICallPacket(packet),
    source: MESSAGE_SOURCE.LOGPOINT_RESULT,
  };
}

function transformNavigationMessagePacket(packet) {
  const { url } = packet;
  return new ConsoleMessage({
    source: MESSAGE_SOURCE.CONSOLE_API,
    type: MESSAGE_TYPE.NAVIGATION_MARKER,
    level: MESSAGE_LEVEL.LOG,
    messageText: l10n.getFormatStr("console.navigated", [url]),
    timeStamp: Date.now(),
  });
}

function transformLogMessagePacket(packet) {
  const { message, timeStamp } = packet;

  return new ConsoleMessage({
    source: MESSAGE_SOURCE.CONSOLE_API,
    type: MESSAGE_TYPE.LOG,
    level: MESSAGE_LEVEL.LOG,
    messageText: message,
    timeStamp,
    private: message.private,
  });
}

function transformPageErrorPacket(pageError) {
  let level = MESSAGE_LEVEL.ERROR;
  if (pageError.warning) {
    level = MESSAGE_LEVEL.WARN;
  } else if (pageError.info) {
    level = MESSAGE_LEVEL.INFO;
  }

  const frame = pageError.sourceName
    ? {
        source: pageError.sourceName,
        sourceId: pageError.sourceId,
        line: pageError.lineNumber,
        column: pageError.columnNumber,
      }
    : null;

  return new ConsoleMessage({
    innerWindowID: pageError.innerWindowID,
    source: MESSAGE_SOURCE.JAVASCRIPT,
    type: MESSAGE_TYPE.LOG,
    level,
    category: pageError.category,
    messageText: pageError.errorMessage,
    stacktrace: pageError.stacktrace ? pageError.stacktrace : null,
    frame,
    errorMessageName: pageError.errorMessageName,
    exceptionDocURL: pageError.exceptionDocURL,
    timeStamp: pageError.timeStamp,
    executionPointTime: pageError.executionPointTime,
    notes: pageError.notes,
    private: pageError.private,
    executionPoint: pageError.executionPoint,
    executionPointTime: pageError.executionPointTime,
    executionPointHasFrames: pageError.executionPointHasFrames,
    pauseId: pageError.pauseId,
  });
}

function transformEvaluationResultPacket(packet) {
  let {
    evalId,
    exceptionMessage,
    errorMessageName,
    exceptionDocURL,
    exception,
    exceptionStack,
    frame,
    result,
    helperResult,
    timestamp: timeStamp,
    notes,
  } = packet;

  const parameter = result;

  if (typeof exception === "string") {
    // Wrap thrown strings in Error objects, so `throw "foo"` outputs "Error: foo"
    exceptionMessage = new Error(exceptionMessage).toString();
  }

  const level =
    typeof exceptionMessage !== "undefined" && exceptionMessage !== null
      ? MESSAGE_LEVEL.ERROR
      : MESSAGE_LEVEL.LOG;

  return new ConsoleMessage({
    source: MESSAGE_SOURCE.JAVASCRIPT,
    type: MESSAGE_TYPE.RESULT,
    evalId,
    level,
    messageText: exceptionMessage,
    parameters: [parameter],
    errorMessageName,
    exceptionDocURL,
    stacktrace: exceptionStack,
    frame,
    timeStamp,
    executionPointTime: result?._pause?.time,
    notes,
    private: packet.private,
    allowRepeating: false,
    pauseId: result?._pause?.pauseId,
  });
}

function convertCachedPacket(packet) {
  // The devtools server provides cached message packets in a different shape, so we
  // transform them here.
  let convertPacket = {};
  if (packet._type === "ConsoleAPI") {
    convertPacket.message = packet;
    convertPacket.type = "consoleAPICall";
  } else if (packet._type === "PageError") {
    convertPacket.pageError = packet;
    convertPacket.type = "pageError";
  } else if (packet._type === "LogMessage") {
    convertPacket = {
      ...packet,
      type: "logMessage",
    };
  } else {
    throw new Error("Unexpected packet type: " + packet._type);
  }
  return convertPacket;
}

/**
 * Maps a Firefox RDP type to its corresponding level.
 */
function getLevelFromType(type) {
  const levels = {
    LEVEL_ERROR: "error",
    LEVEL_WARNING: "warn",
    LEVEL_INFO: "info",
    LEVEL_LOG: "log",
    LEVEL_DEBUG: "debug",
  };

  // A mapping from the console API log event levels to the Web Console levels.
  const levelMap = {
    error: levels.LEVEL_ERROR,
    exception: levels.LEVEL_ERROR,
    assert: levels.LEVEL_ERROR,
    logPointError: levels.LEVEL_ERROR,
    warn: levels.LEVEL_WARNING,
    info: levels.LEVEL_INFO,
    log: levels.LEVEL_LOG,
    clear: levels.LEVEL_LOG,
    trace: levels.LEVEL_LOG,
    table: levels.LEVEL_LOG,
    debug: levels.LEVEL_DEBUG,
    dir: levels.LEVEL_LOG,
    dirxml: levels.LEVEL_LOG,
    group: levels.LEVEL_LOG,
    groupCollapsed: levels.LEVEL_LOG,
    groupEnd: levels.LEVEL_LOG,
    time: levels.LEVEL_LOG,
    timeEnd: levels.LEVEL_LOG,
    count: levels.LEVEL_LOG,
  };

  return levelMap[type] || MESSAGE_TYPE.LOG;
}

function isGroupType(type) {
  return [MESSAGE_TYPE.START_GROUP, MESSAGE_TYPE.START_GROUP_COLLAPSED].includes(type);
}

/**
 * Replace any URL in the provided text by the provided replacement text, or an empty
 * string.
 *
 * @param {String} text
 * @param {String} replacementText
 * @returns {String}
 */
function replaceURL(text, replacementText = "") {
  let result = "";
  let currentIndex = 0;
  let contentStart;
  while (true) {
    const url = urlRegex.exec(text);
    // Pick the regexp with the earlier content; index will always be zero.
    if (!url) {
      break;
    }
    contentStart = url.index + url[1].length;
    if (contentStart > 0) {
      const nonUrlText = text.substring(0, contentStart);
      result += nonUrlText;
    }

    // There are some final characters for a URL that are much more likely
    // to have been part of the enclosing text rather than the end of the
    // URL.
    let useUrl = url[2];
    const uneat = uneatLastUrlCharsRegex.exec(useUrl);
    if (uneat) {
      useUrl = useUrl.substring(0, uneat.index);
    }

    if (useUrl) {
      result += replacementText;
    }

    currentIndex = currentIndex + contentStart;

    currentIndex = currentIndex + useUrl.length;
    text = text.substring(url.index + url[1].length + useUrl.length);
  }

  return result + text;
}

/**
 * Returns true if the message is a content blocking message.
 * @param {ConsoleMessage} message
 * @returns {Boolean}
 */
function isContentBlockingMessage(message) {
  const { category } = message;
  return (
    category == "cookieBlockedPermission" ||
    category == "cookieBlockedTracker" ||
    category == "cookieBlockedAll" ||
    category == "cookieBlockedForeign"
  );
}

/**
 * Returns true if the message is a tracking protection message.
 * @param {ConsoleMessage} message
 * @returns {Boolean}
 */
function isTrackingProtectionMessage(message) {
  const { category } = message;
  return category == "Tracking Protection";
}

function getArrayTypeNames() {
  return [
    "Array",
    "Int8Array",
    "Uint8Array",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array",
    "Uint8ClampedArray",
    "BigInt64Array",
    "BigUint64Array",
  ];
}

function getDescriptorValue(descriptor) {
  if (!descriptor) {
    return descriptor;
  }

  if (Object.prototype.hasOwnProperty.call(descriptor, "safeGetterValues")) {
    return descriptor.safeGetterValues;
  }

  if (Object.prototype.hasOwnProperty.call(descriptor, "getterValue")) {
    return descriptor.getterValue;
  }

  if (Object.prototype.hasOwnProperty.call(descriptor, "value")) {
    return descriptor.value;
  }
  return descriptor;
}

function isError(message) {
  return message.source === "javascript" && message.level === "error";
}

module.exports = {
  getArrayTypeNames,
  getDescriptorValue,
  isContentBlockingMessage,
  isGroupType,
  isError,
  l10n,
  prepareMessage,
};
