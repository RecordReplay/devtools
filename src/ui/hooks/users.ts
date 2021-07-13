import { gql, useMutation, useQuery } from "@apollo/client";
import { query } from "ui/utils/apolloClient";
import { GET_USER_INFO, GET_USER_ID } from "ui/graphql/users";

export function useGetUserId() {
  const { data, loading, error } = useQuery(GET_USER_ID);
  return { userId: data?.viewer?.user.id, loading, error };
}

export type UserInfo = {
  id: string;
  email: string;
  internal: boolean;
  loading: boolean;
  nags: Nag[];
  acceptedTOSVersion: number | null;
};

export enum Nag {
  FIRST_REPLAY = "first_replay",
  FIRST_REPLAY_2 = "first_replay_2",
}

export async function getUserInfo(): Promise<Omit<UserInfo, "loading"> | undefined> {
  const result = await query({
    query: GET_USER_INFO,
    variables: {},
  });
  const viewer = result?.data?.viewer;
  if (!viewer) {
    return undefined;
  }
  return {
    id: viewer.user.id,
    email: viewer.email,
    internal: viewer.internal,
    nags: viewer.nags,
    acceptedTOSVersion: viewer.acceptedTOSVersion,
  };
}

export function useGetUserInfo() {
  const { data, loading, error } = useQuery(GET_USER_INFO);

  if (error) {
    console.error("Apollo error while fetching user:", error);
  }

  const id: string = data?.viewer?.user.id;
  const name: string = data?.viewer?.user.name;
  const picture: string = data?.viewer?.user.picture;
  const email: string = data?.viewer?.email;
  const internal: boolean = data?.viewer?.internal;
  const nags: Nag[] = data?.viewer?.nags;
  const acceptedTOSVersion = data?.viewer?.acceptedTOSVersion;

  return { loading, id, email, internal, nags, name, picture, acceptedTOSVersion };
}

export function useUpdateUserNags() {
  const [updateUserNags, { error }] = useMutation(
    gql`
      mutation UpdateUserNags($newNags: [String!]!) {
        updateUserNags(input: { nags: $newNags }) {
          success
        }
      }
    `,
    { refetchQueries: ["GetUser"] }
  );

  if (error) {
    console.error("Apollo error while updating the user's nags:", error);
  }

  return updateUserNags;
}

export function useAcceptTOS() {
  const [acceptTOS] = useMutation(
    gql`
      mutation AcceptTOS($version: Int!) {
        acceptTermsOfService(input: { version: $version }) {
          success
        }
      }
    `
  );

  return acceptTOS;
}
