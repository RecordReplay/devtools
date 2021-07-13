import { MockedResponse } from "@apollo/client/testing";
import { GET_ACTIVE_SESSIONS } from "ui/graphql/sessions";
import { cloneResponse } from "./utils";

export function createGetActiveSessionsMock(opts: {
  recordingId: string;
}): MockedResponse[] {
  const rv = {
    request: {
      query: GET_ACTIVE_SESSIONS,
      variables: { recordingId: opts.recordingId },
    },
    result: {
      data: {
        recording: {
          uuid: opts.recordingId,
          activeSessions: [],
        },
      },
    },
  };
  return cloneResponse(rv, 20);
}
