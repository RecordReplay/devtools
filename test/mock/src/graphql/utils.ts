import { MockedResponse } from "@apollo/client/testing";

// Apollo mocks will only use one mocked response each time the DB is queried.
// This is used to create copies of a mock response in case a query is
// performed multiple times.
export function cloneResponse(response: MockedResponse, count: number): MockedResponse[] {
  const rv: MockedResponse[] = [];
  for (let i = 0; i < count; i++) {
    rv.push(response);
  }
  return rv;
}
