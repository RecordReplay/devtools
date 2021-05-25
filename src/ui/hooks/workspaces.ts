import { gql, useQuery, useMutation } from "@apollo/client";
import { mutate } from "ui/utils/apolloClient";
import { Workspace } from "ui/types";

const NO_WORKSPACES: Workspace[] = [];

export function createWorkspaceAPI(workspaceId: string) {
  mutate({
    mutation: gql`
    mutation CreateWorkspaceAPI($workspaceId: ID!) {
        createWorkspaceAPIKey(
          input: { workspaceId: $workspaceId, label: "Sourcemap Upload API Key", scopes: "["write:sourcemap"]" }
        ) {
          success
        }
      }
    `,
    variables: {
      workspaceId,
    },
  });
}

window.createWorkspaceAPI = createWorkspaceAPI;

export function useCreateNewWorkspace() {
  const [createNewWorkspace, { error }] = useMutation(
    gql`
      mutation CreateNewWorkspace($name: String!) {
        createWorkspace(input: { name: $name }) {
          success
        }
      }
    `,
    {
      refetchQueries: ["GetNonPendingWorkspaces"],
    }
  );

  if (error) {
    console.error("Apollo error while creating a new workspace:", error);
  }

  return createNewWorkspace;
}

export function useGetPendingWorkspaces() {
  const { data, loading, error } = useQuery(
    gql`
      query GetPendingWorkspaces {
        viewer {
          workspaceInvitations {
            edges {
              node {
                workspace {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `,
    {
      pollInterval: 5000,
    }
  );

  if (error) {
    console.error("Apollo error while fetching pending workspace invitations:", error);
  }

  let pendingWorkspaces: Workspace[] | undefined = undefined;
  if (data?.viewer) {
    pendingWorkspaces = data.viewer.workspaceInvitations.edges.map(
      ({ node }: any) => node.workspace
    );
  }
  return { pendingWorkspaces, loading };
}

export function useGetNonPendingWorkspaces(): { workspaces: Workspace[]; loading: boolean } {
  const { data, loading, error } = useQuery(
    gql`
      query GetNonPendingWorkspaces {
        viewer {
          workspaces {
            edges {
              node {
                id
                name
                members {
                  edges {
                    node {
                      ... on WorkspaceUserMember {
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
          }
        }
      }
    `,
    {
      pollInterval: 5000,
    }
  );

  if (error) {
    console.error("Apollo error while creating a new workspace:", error);
  }

  let workspaces: Workspace[] = NO_WORKSPACES;
  if (data?.viewer) {
    workspaces = data.viewer.workspaces.edges.map(({ node }: any) => {
      const members = node.members.edges.map(({ node }: any) => node.user);
      return { ...node, members };
    });
  }

  return { workspaces, loading };
}
