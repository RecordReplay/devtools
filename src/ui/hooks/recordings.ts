import { RecordingId } from "@recordreplay/protocol";
import { ApolloError, gql, useQuery, useMutation } from "@apollo/client";
import { query } from "ui/utils/apolloClient";
import { Recording } from "ui/types";
import { ExpectedError, WorkspaceId } from "ui/state/app";
import { CollaboratorDbData } from "ui/components/shared/SharingModal/CollaboratorsList";
import { useGetUserId } from "./users";
import useAuth0 from "ui/utils/useAuth0";
import {
  GET_RECORDING,
  GET_RECORDING_USER_ID,
  IS_RECORDING_ACCESSIBLE,
} from "ui/graphql/recordings";

function isTest() {
  return new URL(window.location.href).searchParams.get("test");
}

const GET_WORKSPACE_RECORDINGS = gql`
  query GetWorkspaceRecordings($workspaceId: ID!) {
    node(id: $workspaceId) {
      ... on Workspace {
        id
        recordings {
          edges {
            node {
              uuid
              url
              title
              duration
              createdAt
              private
              isInitialized
              comments {
                user {
                  id
                }
              }
              owner {
                id
                name
                picture
              }
              comments {
                user {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

const GET_MY_RECORDINGS = gql`
  query GetMyRecordings {
    viewer {
      recordings {
        edges {
          node {
            uuid
            url
            title
            duration
            createdAt
            private
            isInitialized
            owner {
              id
              name
              picture
            }
            comments {
              user {
                id
              }
            }
            collaborators {
              edges {
                node {
                  ... on RecordingUserCollaborator {
                    id
                    user {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Returns true if the recording is accessible and initialized, false if it is
 * accessible but uninitialized and undefined if it is inaccessible (private
 * or uninitialized and owned by someone else)
 */
export async function isRecordingInitialized(
  recordingId: RecordingId
): Promise<boolean | undefined> {
  const result = await query({
    query: IS_RECORDING_ACCESSIBLE,
    variables: { recordingId },
  });

  return result.data.recording?.isInitialized;
}

export async function getRecordingOwnerUserId(
  recordingId: RecordingId
): Promise<string | undefined> {
  const result = await query({
    query: GET_RECORDING_USER_ID,
    variables: { recordingId },
  });

  return result.data.recording?.owner?.id;
}

export function useGetRecording(
  recordingId: RecordingId | null
): { recording: Recording | undefined; isAuthorized: boolean; loading: boolean } {
  const { data, error, loading } = useQuery(GET_RECORDING, {
    variables: { recordingId },
    skip: !recordingId,
  });

  if (error) {
    console.error("Apollo error while getting the recording", error);
  }

  const recording = convertRecording(data?.recording);
  // Tests don't have an associated user so we just let it bypass the check here.
  const isAuthorized = isTest() || recording;

  return { recording, isAuthorized: !!isAuthorized, loading };
}

function convertRecording(rec: any): Recording | undefined {
  if (!rec) {
    return undefined;
  }

  const collaborators = rec.collaborators?.edges
    ?.filter((e: any) => e.node.user)
    .map((e: any) => e.node.user.id);

  return {
    id: rec.uuid,
    user: rec.owner,
    userId: rec.owner?.id,
    // NOTE: URLs are nullable in the database
    url: rec.url || "",
    title: rec.title,
    duration: rec.duration,
    private: rec.private,
    isInitialized: rec.isInitialized,
    date: rec.createdAt,
    workspace: rec.workspace,
    comments: rec.comments,
    collaborators,
    ownerNeedsInvite: rec.ownerNeedsInvite,
  };
}

export function useGetRecordingPhoto(
  recordingId: RecordingId
): {
  error: ApolloError | undefined;
  loading: boolean;
  screenData?: string;
} {
  const { data, loading, error } = useQuery(
    gql`
      query getRecordingPhoto($recordingId: UUID!) {
        recording(uuid: $recordingId) {
          uuid
          thumbnail
        }
      }
    `,
    { variables: { recordingId } }
  );

  if (!data) {
    return { loading, error };
  }

  if (error) {
    console.error("Apollo error while getting user photo", error);
  }

  const screenData = data.recording?.thumbnail;
  return { error, loading, screenData };
}

export function useGetOwnersAndCollaborators(
  recordingId: RecordingId
): {
  error: ApolloError | undefined;
  loading: boolean;
  recording: Recording | undefined;
  collaborators: CollaboratorDbData[] | null;
} {
  const { data, loading, error } = useQuery(
    gql`
      query GetOwnerAndCollaborators($recordingId: UUID!) {
        recording(uuid: $recordingId) {
          uuid
          owner {
            id
            name
            picture
          }
          collaborators {
            edges {
              node {
                ... on RecordingPendingEmailCollaborator {
                  id
                  email
                  createdAt
                }
                ... on RecordingPendingUserCollaborator {
                  id
                  createdAt
                  user {
                    id
                    name
                    picture
                  }
                }
                ... on RecordingUserCollaborator {
                  id
                  createdAt
                  user {
                    id
                    name
                    picture
                  }
                }
              }
            }
          }
        }
      }
    `,
    {
      variables: { recordingId },
    }
  );

  if (loading) {
    return { collaborators: null, recording: undefined, loading, error };
  }

  if (error) {
    console.error("Apollo error while getting owners and collaborators", error);
  }

  let collaborators: CollaboratorDbData[] = [];
  if (data?.recording?.collaborators) {
    collaborators = data.recording.collaborators.edges
      .map(({ node }: any) => ({
        collaborationId: node.id,
        user: node.user,
        email: node.email,
        createdAt: node.createdAt,
      }))
      .sort(
        (a: CollaboratorDbData, b: CollaboratorDbData) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
  const recording = convertRecording(data.recording);
  return { collaborators, recording, loading, error };
}

export function useGetIsPrivate(recordingId: RecordingId) {
  const { data, loading, error } = useQuery(
    gql`
      query GetRecordingPrivacy($recordingId: UUID!) {
        recording(uuid: $recordingId) {
          uuid
          private
        }
      }
    `,
    {
      variables: { recordingId },
    }
  );

  if (loading) {
    return { isPrivate: null, loading, error };
  }

  if (error) {
    console.error("Apollo error while getting isPrivate", error);
  }

  const isPrivate = data.recording?.private;

  return { isPrivate, loading, error };
}

export function useToggleIsPrivate(recordingId: RecordingId, isPrivate: boolean) {
  const [toggleIsPrivate] = useMutation(
    gql`
      mutation SetRecordingIsPrivate($recordingId: ID!, $isPrivate: Boolean!) {
        updateRecordingPrivacy(input: { id: $recordingId, private: $isPrivate }) {
          success
          recording {
            uuid
            private
          }
        }
      }
    `,
    {
      variables: { recordingId, isPrivate: !isPrivate },
      refetchQueries: ["GetRecordingPrivacy"],
    }
  );

  return toggleIsPrivate;
}

export function useUpdateIsPrivate() {
  const [updateIsPrivate] = useMutation(
    gql`
      mutation SetRecordingIsPrivate($recordingId: ID!, $isPrivate: Boolean!) {
        updateRecordingPrivacy(input: { id: $recordingId, private: $isPrivate }) {
          success
          recording {
            uuid
            private
          }
        }
      }
    `,
    {
      refetchQueries: ["GetRecordingPrivacy"],
    }
  );

  return updateIsPrivate;
}

export function useIsOwner(recordingId: RecordingId) {
  const { userId } = useGetUserId();
  const { data, loading, error } = useQuery(GET_RECORDING_USER_ID, {
    variables: { recordingId },
  });

  if (loading) {
    return false;
  }

  if (error) {
    console.error("Apollo error while getting isOwner", error);
    return false;
  }

  const recording = data.recording;
  if (!recording?.owner) {
    return false;
  }

  return userId === recording.owner.id;
}

export function useGetPersonalRecordings():
  | { recordings: null; loading: true }
  | { recordings: Recording[]; loading: false } {
  const { data, error, loading } = useQuery(GET_MY_RECORDINGS, {
    pollInterval: 5000,
  });

  if (loading) {
    return { recordings: null, loading };
  }

  if (error) {
    console.error("Failed to fetch recordings:", error);
  }

  let recordings: any = [];
  if (data?.viewer) {
    recordings = data.viewer.recordings.edges.map(({ node }: any) => convertRecording(node));
  }
  return { recordings, loading };
}

export function useGetWorkspaceRecordings(
  currentWorkspaceId: WorkspaceId
): { recordings: null; loading: true } | { recordings: Recording[]; loading: false } {
  const { data, error, loading } = useQuery(GET_WORKSPACE_RECORDINGS, {
    variables: { workspaceId: currentWorkspaceId },
    pollInterval: 5000,
  });

  if (loading) {
    return { recordings: null, loading };
  }

  if (error) {
    console.error("Failed to fetch recordings:", error);
  }

  let recordings: Recording[] = [];
  if (data?.node?.recordings) {
    recordings = data.node.recordings.edges.map(({ node }: any) => convertRecording(node));
  }
  return { recordings, loading };
}

export function useUpdateRecordingWorkspace() {
  const [updateRecordingWorkspace] = useMutation(
    gql`
      mutation UpdateRecordingWorkspace($recordingId: ID!, $workspaceId: ID) {
        updateRecordingWorkspace(input: { id: $recordingId, workspaceId: $workspaceId }) {
          success
          recording {
            uuid
            workspace {
              id
            }
          }
        }
      }
    `
  );

  return (
    recordingId: RecordingId,
    currentWorkspaceId: WorkspaceId | null,
    targetWorkspaceId: WorkspaceId | null
  ) => {
    updateRecordingWorkspace({
      variables: { recordingId, workspaceId: targetWorkspaceId },
      update: store => {
        const recordingsToTransfer = [];
        // Immediately remove the recording from the current workspace
        if (currentWorkspaceId) {
          const data: any = store.readQuery({
            query: GET_WORKSPACE_RECORDINGS,
            variables: { workspaceId: currentWorkspaceId },
          });

          const newEdges = data.node.recordings.edges.filter(
            (edge: any) => edge.node.uuid !== recordingId
          );
          const newData = {
            ...data,
            node: {
              ...data.node,
              recordings: {
                ...data.node.recordings,
                edges: newEdges,
              },
            },
          };

          recordingsToTransfer.push(
            ...data.node.recordings.edges.filter((edge: any) => edge.node.uuid === recordingId)
          );

          store.writeQuery({
            query: GET_WORKSPACE_RECORDINGS,
            data: newData,
            variables: { workspaceID: currentWorkspaceId },
          });
        } else {
          const data: any = store.readQuery({
            query: GET_MY_RECORDINGS,
          });

          const newEdges = data.viewer.recordings.edges.filter(
            (edge: any) => edge.node.uuid !== recordingId
          );
          const newData = {
            ...data,
            viewer: {
              ...data.viewer,
              recordings: {
                ...data.viewer.recordings,
                edges: newEdges,
              },
            },
          };

          recordingsToTransfer.push(
            ...data.viewer.recordings.edges.filter((edge: any) => edge.node.uuid === recordingId)
          );

          store.writeQuery({
            query: GET_MY_RECORDINGS,
            data: newData,
          });
        }

        // Update the new targetWorkspace's associated query in the cache.
        if (targetWorkspaceId) {
          let data: any = null;

          try {
            data = store.readQuery({
              query: GET_WORKSPACE_RECORDINGS,
              variables: { workspaceId: targetWorkspaceId },
            });
          } catch (e) {}

          // Bail if this query doesn't already exist in the cache
          if (!data) {
            return;
          }

          const newData = {
            ...data,
            node: {
              ...data.node,
              recordings: {
                ...data.node.recordings,
                edges: [...data.node.recordings.edges, ...recordingsToTransfer],
              },
            },
          };

          store.writeQuery({
            query: GET_WORKSPACE_RECORDINGS,
            data: newData,
            variables: { workspaceID: targetWorkspaceId },
          });
        } else {
          let data: any = null;

          try {
            data = store.readQuery({
              query: GET_MY_RECORDINGS,
            });
          } catch (e) {}

          // Bail if this query doesn't already exist in the cache
          if (!data) {
            return;
          }

          const newData = {
            ...data,
            viewer: {
              ...data.viewer,
              recordings: {
                ...data.viewer.recordings,
                edges: [...data.viewer.recordings.edges, ...recordingsToTransfer],
              },
            },
          };

          store.writeQuery({
            query: GET_MY_RECORDINGS,
            data: newData,
          });
        }
      },
      optimisticResponse: {
        updateRecordingWorkspace: {
          recording: {
            uuid: recordingId,
            __typename: "Recording",
            workspace: { __typename: "Workspace", id: targetWorkspaceId },
          },
          success: true,
          __typename: "UpdateRecordingWorkspace",
        },
      },
    });
  };
}

export function useGetMyRecordings() {
  return useGetPersonalRecordings();
}

export function useDeleteRecording(onCompleted: () => void) {
  const [deleteRecording] = useMutation(
    gql`
      mutation DeleteRecording($recordingId: ID!) {
        deleteRecording(input: { id: $recordingId }) {
          success
        }
      }
    `,
    {
      onCompleted,
    }
  );

  return deleteRecording;
}

export function useDeleteRecordingFromLibrary() {
  const [deleteRecording] = useMutation(
    gql`
      mutation DeleteRecording($recordingId: ID!) {
        deleteRecording(input: { id: $recordingId }) {
          success
        }
      }
    `
  );

  return (recordingId: RecordingId, workspaceId: WorkspaceId | null) => {
    deleteRecording({
      variables: { recordingId },
      optimisticResponse: {
        deleteRecording: {
          success: true,
          __typename: "DeleteRecording",
        },
      },
      update: store => {
        if (workspaceId) {
          const data: any = store.readQuery({
            query: GET_WORKSPACE_RECORDINGS,
            variables: { workspaceId },
          });

          const newEdges = data.node.recordings.edges.filter(
            (edge: any) => edge.node.uuid !== recordingId
          );
          const newData = {
            ...data,
            node: {
              ...data.node,
              recordings: {
                ...data.node.recordings,
                edges: newEdges,
              },
            },
          };

          store.writeQuery({
            query: GET_WORKSPACE_RECORDINGS,
            data: newData,
          });

          return;
        }

        const data: any = store.readQuery({
          query: GET_MY_RECORDINGS,
        });

        const newEdges = data.viewer.recordings.edges.filter(
          (edge: any) => edge.node.uuid !== recordingId
        );
        const newData = {
          ...data,
          viewer: {
            ...data.viewer,
            recordings: {
              ...data.viewer.recordings,
              edges: newEdges,
            },
          },
        };

        store.writeQuery({
          query: GET_MY_RECORDINGS,
          data: newData,
        });
      },
    });
  };
}

export function useInitializeRecording() {
  const [initializeRecording] = useMutation(
    gql`
      mutation InitializeRecording($recordingId: ID!, $title: String!, $workspaceId: ID) {
        initializeRecording(input: { id: $recordingId, title: $title, workspaceId: $workspaceId }) {
          success
          recording {
            uuid
            isInitialized
            title
            workspace {
              id
            }
          }
        }
      }
    `,
    { refetchQueries: ["GetRecording"] }
  );

  return initializeRecording;
}

export function useUpdateRecordingTitle() {
  const [updateRecordingTitle] = useMutation(
    gql`
      mutation UpdateRecordingTitle($recordingId: ID!, $title: String!) {
        updateRecordingTitle(input: { id: $recordingId, title: $title }) {
          success
          recording {
            uuid
            title
          }
        }
      }
    `
  );

  return updateRecordingTitle;
}

export function useHasExpectedError(recordingId: RecordingId): ExpectedError | undefined {
  const { isAuthenticated } = useAuth0();
  const { recording, isAuthorized, loading } = useGetRecording(recordingId);
  const { userId } = useGetUserId();

  if (loading) {
    return undefined;
  }

  if (recording?.ownerNeedsInvite) {
    const isAuthor = userId && userId == recording.userId;

    if (isAuthor) {
      return {
        message: "Your replay can not be viewed",
        content:
          "Your Replay account is currently unactivated because you have not been invited to Replay by an existing user. Until you are invited, your authored Replays will be unviewable.",
      };
    } else {
      return {
        message: "This replay can not be viewed",
        content: "The author for this replay is currently using an unactivated account.",
      };
    }
  }

  if (isAuthorized) {
    return undefined;
  }

  if (isAuthenticated) {
    return {
      message: "You don't have permission to view this replay",
      content:
        "Sorry, you can't access this Replay. If you were given this URL, make sure you were invited.",
    };
  }

  return {
    message: "",
    content: "",
    action: "sign-in",
  };
}
