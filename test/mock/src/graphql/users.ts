import { MockedResponse } from "@apollo/client/testing";
import { GET_USER_INFO, GET_USER_ID } from "ui/graphql/users";
import { cloneResponse } from "./utils";

export function createGetUserMock(opts: {
  user?: { id: string; uuid: string };
}): MockedResponse[] {
  const getUser = {
    request: {
      query: GET_USER_INFO,
    },
    result: {
      data: {
        viewer: {
          user: opts.user ? { id: opts.user.id } : null,
          email: "mock@user.io",
          internal: false,
          nags: [],
          acceptedTOSVersion: 1,
        },
      },
    },
  };
  const getUserId = {
    request: {
      query: GET_USER_ID,
    },
    result: {
      data: {
        viewer: {
          user: opts.user ? { id: opts.user.id } : null,
        },
      },
    },
  };
  return [...cloneResponse(getUser, 8), ...cloneResponse(getUserId, 8)];
}
