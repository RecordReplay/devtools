/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

//
// This module converts Firefox specific types to the generic types

import { clientCommands } from "./commands";

const { ThreadFront } = require("protocol/thread");

export function prepareSourcePayload(source) {
  clientCommands.registerSourceActor(source.actor, makeSourceId(source, false));
  return { thread: ThreadFront.actor, source };
}

export async function createFrame(frame, index = 0, asyncIndex = 0) {
  if (!frame) {
    return null;
  }

  const { sourceId, line, column } = await ThreadFront.getPreferredLocation(frame.location);
  const sourceUrl = await ThreadFront.getSourceURL(sourceId);
  const location = {
    sourceId: clientCommands.getSourceForActor(sourceId),
    sourceUrl,
    line,
    column,
  };

  let alternateLocation;
  const alternate = await ThreadFront.getAlternateLocation(frame.location);
  if (alternate) {
    const alternateSourceUrl = await ThreadFront.getSourceURL(alternate.sourceId);
    alternateLocation = {
      sourceId: clientCommands.getSourceForActor(alternate.sourceId),
      sourceUrl: alternateSourceUrl,
      line: alternate.line,
      column: alternate.column,
    };
  }

  const displayName = frame.functionName || `(${frame.type})`;

  return {
    id: `${asyncIndex}:${index}`,
    protocolId: frame.frameId,
    asyncIndex,
    displayName,
    location,
    alternateLocation,
    this: frame.this,
    source: null,
    index,
    asyncCause: asyncIndex && index == 0 ? "async" : undefined,
    state: "on-stack",
  };
}

export function makeSourceId(source, isServiceWorker) {
  return source.actor;
}

export function createPause(packet) {
  return {
    ...packet,
    frame: createFrame(packet.frame),
    executionPoint: packet.executionPoint,
  };
}
