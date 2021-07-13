// Test that getting an invalid recording ID error from the backend shows an appropriate error.

import { runTest, devtoolsURL } from "../src/runTest";
import { installMockEnvironment } from "../src/mockEnvironment";
import { v4 as uuid } from "uuid";
import {
  createRecordingIsInitializedMock,
  createRecordingOwnerUserIdMock,
  createGetRecordingMock,
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
  ...createGetRecordingMock({ recordingId }),
  ...createGetUserMock({ user }),
];
const messageHandlers = basicMessageHandlers();
const bindings = basicBindings();

runTest("invalidRecordingID", async (page: Page) => {
  await page.goto(devtoolsURL({ id: recordingId }));
  await installMockEnvironment(page, { graphqlMocks, messageHandlers, bindings });
  await page.textContent("text=You don't have permission to view this replay");
});
