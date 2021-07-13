import { MockedResponse } from "@apollo/client/testing";
import { GET_USER_SETTINGS } from "ui/graphql/settings";
import { cloneResponse } from "./utils";

export function createUserSettingsMock(): MockedResponse[] {
  const rv = {
    request: {
      query: GET_USER_SETTINGS,
    },
    result: {
      data: {
        viewer: {
          settings: {
            showElements: false,
            showReact: false,
            enableTeams: true,
            enableRepaint: false,
          },
          defaultWorkspace: null,
        },
      },
    },
  };
  return cloneResponse(rv, 10);
}
