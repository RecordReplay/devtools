import { MockedResponse } from "@apollo/client/testing";
import { GET_COMMENTS, GET_COMMENTS_TIME } from "ui/graphql/comments";
import { cloneResponse } from "./utils";

export function createEmptyCommentsMock(opts: {
  recordingId: string;
}): MockedResponse[] {
  const getComments = {
    request: {
      query: GET_COMMENTS,
      variables: { recordingId: opts.recordingId },
    },
    result: {
      data: {
        recording: {
          uuid: opts.recordingId,
          comments: [],
        },
      },
    },
  };
  const getCommentsTime = {
    request: {
      query: GET_COMMENTS_TIME,
      variables: { recordingId: opts.recordingId },
    },
    result: {
      data: {
        recording: {
          uuid: opts.recordingId,
          comments: [],
        },
      },
    },
  };
  return [...cloneResponse(getComments, 5), ...cloneResponse(getCommentsTime, 5)];
}
