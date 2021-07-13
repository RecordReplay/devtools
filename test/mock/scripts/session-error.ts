// Test getting a session error on startup.

import { runTest, devtoolsURL } from "../src/runTest";
import { installMockEnvironment, MockHandlerHelpers } from "../src/mockEnvironment";
import { v4 as uuid } from "uuid";
import {
  createRecordingIsInitializedMock,
  createRecordingOwnerUserIdMock,
  createUserSettingsMock,
  createGetUserMock,
} from "../src/graphql";
import { basicMessageHandlers, basicBindings } from "../src/handlers";
import { Page } from "@recordreplay/playwright";

const recordingId = uuid();
const userId = uuid();
const user = { id: userId, uuid: userId };
const graphqlMocks = [
  ...createUserSettingsMock(),
  createRecordingIsInitializedMock({ recordingId, isInitialized: true }),
  ...createRecordingOwnerUserIdMock({ recordingId, user }),
  ...createGetUserMock({ user }),
];
const messageHandlers = {
  ...basicMessageHandlers(),
  "Recording.createSession": (params: any, h: MockHandlerHelpers) => {
    const sessionId = "mock-test-session";
    setTimeout(() => {
      h.emitEvent("Recording.sessionError", {
        sessionId,
        code: 1,
        message: "Session died unexpectedly",
      });
    }, 2000);
    return { sessionId };
  },
};
const bindings = basicBindings();

// Test that getting a session error while loading a replay shows an appropriate error.
runTest("sessionError", async (page: Page) => {
  await page.goto(devtoolsURL({ id: recordingId }));
  await installMockEnvironment(page, { graphqlMocks, messageHandlers, bindings });
  await page.textContent("text=Unexpected session error");
});
