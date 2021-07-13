import { gql } from "@apollo/client";

export const GET_COMMENTS = gql`
  query GetComments($recordingId: UUID!) {
    recording(uuid: $recordingId) {
      uuid
      comments {
        id
        content
        primaryLabel
        secondaryLabel
        createdAt
        updatedAt
        hasFrames
        sourceLocation
        time
        point
        position
        user {
          id
          name
          picture
        }
        replies {
          id
          content
          createdAt
          updatedAt
          user {
            id
            name
            picture
          }
        }
      }
    }
  }
`;

export const GET_COMMENTS_TIME = gql`
  query GetCommentsTime($recordingId: UUID!) {
    recording(uuid: $recordingId) {
      uuid
      comments {
        id
        hasFrames
        point
        time
      }
    }
  }
`;
