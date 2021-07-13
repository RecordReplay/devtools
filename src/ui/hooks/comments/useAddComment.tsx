import { RecordingId } from "@recordreplay/protocol";
import { gql, useMutation } from "@apollo/client";
import useAuth0 from "ui/utils/useAuth0";
import { CommentPosition, PendingNewComment } from "ui/state/comments";
import { GET_USER_ID } from "ui/graphql/users";
import { GET_COMMENTS } from "ui/graphql/comments";

interface NewCommentVariable extends Omit<PendingNewComment, "content"> {
  content: string;
  position: CommentPosition | null;
}

export default function useAddComment() {
  const { user } = useAuth0();

  const [addComment, { error }] = useMutation(
    gql`
      mutation AddComment($input: AddCommentInput!) {
        addComment(input: $input) {
          success
          comment {
            id
          }
        }
      }
    `
  );

  if (error) {
    console.error("Apollo error while adding a comment:", error);
  }

  return (comment: NewCommentVariable, recordingId: RecordingId) => {
    const temporaryId = new Date().toISOString();
    addComment({
      variables: { input: comment },
      optimisticResponse: {
        addComment: {
          success: true,
          comment: {
            id: temporaryId,
            __typename: "Comment",
          },
          __typename: "AddComment",
        },
      },
      update: (cache, { data: { addComment } }) => {
        const {
          comment: { id: commentId },
        } = addComment;
        const data: any = cache.readQuery({
          query: GET_COMMENTS,
          variables: { recordingId },
        });
        const {
          viewer: {
            user: { id: userId },
          },
        }: any = cache.readQuery({
          query: GET_USER_ID,
        });

        const newComment = {
          ...comment,
          id: commentId,
          replies: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: userId,
            name: user.name,
            picture: user.picture,
            __typename: "User",
          },
        };
        const newData = {
          ...data,
          recording: {
            ...data.recording,
            comments: [
              ...data.recording.comments.filter(
                (c: any) => c.id !== temporaryId && c.id !== commentId
              ),
              newComment,
            ],
          },
        };

        cache.writeQuery({
          query: GET_COMMENTS,
          variables: { recordingId },
          data: newData,
        });
      },
    });
  };
}
