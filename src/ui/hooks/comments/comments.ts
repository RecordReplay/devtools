import { RecordingId } from "@recordreplay/protocol";
import { gql, useQuery, useMutation, ApolloError } from "@apollo/client";
import { query } from "ui/utils/apolloClient";
import { Comment, CommentPosition } from "ui/state/comments";
import { GET_COMMENTS_TIME, GET_COMMENTS } from "ui/graphql/comments";

const NO_COMMENTS: Comment[] = [];

export function useGetComments(
  recordingId: RecordingId
): { comments: Comment[]; loading: boolean; error?: ApolloError } {
  const { data, loading, error } = useQuery(GET_COMMENTS, {
    variables: { recordingId },
    pollInterval: 5000,
  });

  if (error) {
    console.error("Apollo error while fetching comments:", error);
  }

  let comments = data?.recording?.comments || NO_COMMENTS;
  comments = comments.map((comment: any) => ({
    ...comment,
    replies: comment.replies.map((reply: any) => ({
      ...reply,
      hasFrames: comment.hasFrames,
      sourceLocation: comment.sourceLocation,
      time: comment.time,
      point: comment.point,
      position: comment.position,
    })),
  }));
  return { comments, loading, error };
}

export function useUpdateComment() {
  const [updateCommentContent, { error }] = useMutation(
    gql`
      mutation UpdateCommentContent($newContent: String!, $commentId: ID!, $position: JSONObject) {
        updateComment(input: { id: $commentId, content: $newContent, position: $position }) {
          success
        }
      }
    `
  );

  if (error) {
    console.error("Apollo error while updating a comment:", error);
  }

  return (commentId: string, newContent: string, position: CommentPosition | null) => {
    updateCommentContent({
      variables: { commentId, newContent, position },
      optimisticResponse: {
        updateComment: {
          success: true,
          __typename: "UpdateComment",
        },
      },
      update: cache => {
        cache.modify({
          id: cache.identify({ id: commentId, __typename: "Comment" }),
          fields: {
            content: () => newContent,
            position: () => position,
          },
        });
      },
    });
  };
}

export function useUpdateCommentReply() {
  const [updateCommentReplyContent, { error }] = useMutation(
    gql`
      mutation UpdateCommentReplyContent($newContent: String!, $commentId: ID!) {
        updateCommentReply(input: { id: $commentId, content: $newContent }) {
          success
        }
      }
    `
  );

  if (error) {
    console.error("Apollo error while updating a comment:", error);
  }

  return (commentId: string, newContent: string) => {
    updateCommentReplyContent({
      variables: { commentId, newContent },
      optimisticResponse: {
        updateComment: {
          success: true,
          __typename: "UpdateCommentReply",
        },
      },
      update: cache => {
        cache.modify({
          id: cache.identify({ id: commentId, __typename: "CommentReply" }),
          fields: { content: () => newContent },
        });
      },
    });
  };
}

export async function getFirstComment(
  recordingId: string
): Promise<{ time: number; point: string; hasFrames: boolean } | undefined> {
  const commentsResult = await query({
    query: GET_COMMENTS_TIME,
    variables: { recordingId },
  });

  if (!commentsResult.data?.recording?.comments) {
    return undefined;
  }
  const comments = [...commentsResult.data.recording.comments];
  comments.sort((c1: any, c2: any) => c1.time - c2.time);
  return comments[0];
}
