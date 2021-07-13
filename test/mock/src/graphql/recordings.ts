import { MockedResponse } from "@apollo/client/testing";
import {
  GET_RECORDING,
  GET_RECORDING_USER_ID,
  IS_RECORDING_ACCESSIBLE,
} from "ui/graphql/recordings";
import { Recording } from "ui/types";
import { cloneResponse } from "./utils";

const mockRecording = {
  url: "https://mock.org",
  title: "Mock Title",
  duration: 10,
  createdAt: "2021-07-05T10:03:13.466Z",
  private: false,
  isInitialized: true,
  ownerNeedsInvite: false,
  owner: {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Mock User",
    picture: "",
    internal: false,
  },
  workspace: null,
  collaborators: {
    edges: [],
  },
};

export function createRecordingIsInitializedMock(opts: {
  recordingId: string;
  isInitialized: boolean;
}): MockedResponse {
  return {
    request: {
      query: IS_RECORDING_ACCESSIBLE,
      variables: { recordingId: opts.recordingId },
    },
    result: {
      data: {
        recording: {
          uuid: opts.recordingId,
          isInitialized: opts.isInitialized,
        },
      },
    },
  };
}

export function createRecordingOwnerUserIdMock(opts: {
  recordingId: string;
  user?: { id: string; uuid: string };
}): MockedResponse[] {
  const rv = {
    request: {
      query: GET_RECORDING_USER_ID,
      variables: { recordingId: opts.recordingId },
    },
    result: {
      data: opts.user
        ? {
            uuid: opts.user.uuid,
            owner: {
              id: opts.user.id,
            },
          }
        : null,
    },
  };
  return cloneResponse(rv, 5);
}

export function createGetRecordingMock(opts: {
  recordingId: string;
  recording?: Partial<Recording>;
}): MockedResponse[] {
  const rv = {
    request: {
      query: GET_RECORDING,
      variables: { recordingId: opts.recordingId },
    },
    result: {
      data: opts.recording
        ? {
            recording: {
              uuid: opts.recordingId,
              ...mockRecording,
              ...opts.recording,
            },
          }
        : null,
    },
  };
  return cloneResponse(rv, 5);
}
