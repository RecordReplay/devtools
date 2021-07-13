import { gql } from "@apollo/client";

export const GET_ACTIVE_SESSIONS = gql`
  query GetActiveSessions($recordingId: UUID!) {
    recording(uuid: $recordingId) {
      uuid
      activeSessions {
        id
        user {
          id
          name
          picture
        }
      }
    }
  }
`;
