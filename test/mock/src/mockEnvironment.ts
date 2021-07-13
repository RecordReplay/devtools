// Handling for the mockEnvironment property which is installed on the window object in mock tests.

import { MockedResponse } from "@apollo/client/testing";
import { Page } from "@recordreplay/playwright";
import type { MockEnvironment } from "ui/utils/environment";

declare global {
  interface Window {
    mockEnvironment?: MockEnvironment;
  }
}

export interface MockHandlerHelpers {
  Errors: Record<string, Error>;
  emitEvent: (method: string, params: any) => void;
  bindings: Record<string, any>;
};

type MockHandler = (params: any, helpers: MockHandlerHelpers) => any;
export type MockHandlerRecord = Record<string, MockHandler>;

interface MockOptions {
  graphqlMocks: MockedResponse[];
  messageHandlers: MockHandlerRecord;
  bindings: Record<string, any>;
}

interface MockOptionsJSON {
  graphqlMocks: MockedResponse[];
  messageHandlers: Record<string, string>;
  bindings: Record<string, any>;
}

export interface Error {
  code: number;
  message: string;
}

// This script runs within the browser process.
function doInstall(options: MockOptionsJSON) {
  function setImmediate(callback: () => void) {
    setTimeout(callback, 0);
  }

  const helpers = {
    Errors: {
      InternalError: { code: 1, message: "Internal error" },
      MissingDescription: { code: 28, message: "No description added for recording" },
    },
    makeResult(result: any) {
      return { result };
    },
    makeError(error: Error) {
      return { error };
    },
    emitEvent(method: string, params: any) {
      setImmediate(() => {
        const event = { method, params };
        receiveMessageCallback({ data: JSON.stringify(event) });
      });
    },
    bindings: options.bindings,
  };

  const messageHandlers: Record<string, MockHandler> = {};

  // We manually iterate the keys here to avoid typescript transformations which
  // won't work after evaluating this in the browser content process.
  const keys = Object.keys(options.messageHandlers);
  for (let i = 0; i < keys.length; i++) {
    const name = keys[i];
    eval(`messageHandlers["${name}"] = ${options.messageHandlers[name]};`);
  }

  let receiveMessageCallback: (arg: { data: string }) => unknown;

  window.mockEnvironment = {
    graphqlMocks: options.graphqlMocks,
    setOnSocketMessage(callback: (arg: { data: string }) => unknown) {
      receiveMessageCallback = callback;
    },
    sendSocketMessage(str: string) {
      const msg = JSON.parse(str);
      if (!messageHandlers[msg.method]) {
        console.error(`Missing mock message handler for ${msg.method}`);
        return;
      }
      let promise;
      try {
        promise = messageHandlers[msg.method](msg.params, helpers);
        if (!(promise instanceof Promise)) {
          promise = Promise.resolve(promise);
        }
      } catch (e) {
        promise = Promise.reject(e);
      }
      promise.then(result => {
        const response = { id: msg.id, result };
        setImmediate(() => receiveMessageCallback({ data: JSON.stringify(response) }));
      }, e => {
        let error;
        if (e.code && e.message) {
          error = e;
        } else {
          console.error(`Mock message handler error ${e}`);
          error = helpers.Errors.InternalError;
        }
        const response = { id: msg.id, error };
        setImmediate(() => receiveMessageCallback({ data: JSON.stringify(response) }));
      });
    },
  };
}

export async function installMockEnvironment(page: Page, options: MockOptions) {
  const optionsJSON: MockOptionsJSON = {
    graphqlMocks: options.graphqlMocks,
    messageHandlers: {},
    bindings: options.bindings,
  };
  for (const name of Object.keys(options.messageHandlers)) {
    optionsJSON.messageHandlers[name] = options.messageHandlers[name].toString();
  }
  try {
    await page.evaluate<void, MockOptionsJSON>(doInstall, optionsJSON);
  } catch (e) {
    console.log("ERROR", e);
  }
}
