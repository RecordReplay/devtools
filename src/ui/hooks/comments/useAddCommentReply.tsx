import { RecordingId } from "@recordreplay/protocol";
import { gql, useMutation } from "@apollo/client";
import useAuth0 from "ui/utils/useAuth0";
import { GET_USER_ID } from "ui/graphql/users";
import { GET_COMMENTS } from "ui/graphql/comments";

interface NewReplyVariable {
  content: string;
  commentId: string;
}

export default function useAddCommentReply() {
  const { user } = useAuth0();

  const [addCommentReply, { error }] = useMutation(
    gql`
      mutation AddCommentReply($input: AddCommentReplyInput!) {
        addCommentReply(input: $input) {
          success
          commentReply {
            id
          }
        }
      }
    `
  );

  if (error) {
    console.error("Apollo error while adding a comment:", error);
  }

  return (reply: NewReplyVariable, recordingId: RecordingId) => {
    const temporaryId = new Date().toISOString();
    addCommentReply({
      variables: { input: reply },
      optimisticResponse: {
        addCommentReply: {
          success: true,
          commentReply: {
            id: temporaryId,
            __typename: "CommentReply",
          },
          __typename: "AddCommentReply",
        },
      },
      update: (cache, payload) => {
        const {
          data: {
            addCommentReply: { commentReply },
          },
        } = payload;
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

        const parentComment = data.recording.comments.find((r: any) => r.id === reply.commentId);
        const newReply = {
          id: commentReply.id,
          content: reply.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: userId,
            name: user.name,
            picture: user.picture,
            __typename: "User",
          },
          __typename: "CommentReply",
        };

        const newParentComment = {
          ...parentComment,
          replies: [
            ...parentComment.replies.filter(
              (r: any) => r.id !== temporaryId && r.id !== commentReply.id
            ),
            newReply,
          ],
        };
        const newData = {
          ...data,
          recording: {
            ...data.recording,
            comments: [
              ...data.recording.comments.filter((r: any) => r.id !== reply.commentId),
              newParentComment,
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
