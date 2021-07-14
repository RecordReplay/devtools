import classNames from "classnames";
import React, { ChangeEvent, MouseEventHandler, useState } from "react";
import { connect, ConnectedProps } from "react-redux";
import * as actions from "ui/actions/app";
import Modal from "ui/components/shared/NewModal";
import hooks from "ui/hooks";
import * as selectors from "ui/reducers/app";
import { UIState } from "ui/state";
import { WorkspaceUser } from "ui/types";
import { validateEmail } from "ui/utils/helpers";
import { TextInput } from "../Forms";
import MaterialIcon from "../MaterialIcon";
import InvitationLink from "../NewWorkspaceModal/InvitationLink";
import WorkspaceMember, { NonRegisteredWorkspaceMember } from "./WorkspaceMember";

function ModalButton({
  children,
  onClick = () => {},
  className,
  disabled = false,
}: {
  children: React.ReactElement | string;
  className?: string;
  onClick?: MouseEventHandler;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        className,
        "max-w-max items-center px-4 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryAccent text-white bg-primaryAccent hover:bg-primaryAccentHover"
      )}
    >
      {children}
    </button>
  );
}

export function WorkspaceMembers({ members }: { members: WorkspaceUser[] }) {
  const sortedMembers = members.sort(
    (a: WorkspaceUser, b: WorkspaceUser) => Number(b.pending) - Number(a.pending)
  );

  return (
    <ul className="flex flex-col space-y-3">
      {sortedMembers.map(member =>
        member.email ? (
          <NonRegisteredWorkspaceMember member={member} key={`non-registered-${member.email}`} />
        ) : (
          <WorkspaceMember member={member} key={`registered-${member.userId}`} />
        )
      )}
    </ul>
  );
}

type WorkspaceFormProps = PropsFromRedux & {
  members?: WorkspaceUser[];
};

function WorkspaceForm({ workspaceId, members }: WorkspaceFormProps) {
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inviteNewWorkspaceMember = hooks.useInviteNewWorkspaceMember(() => {
    setInputValue("");
    setIsLoading(false);
  });

  const memberEmails = (members || []).filter(m => m.email).map(m => m.email!);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  const handleAddMember = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();

    if (!validateEmail(inputValue)) {
      setErrorMessage("Invalid email address");
      return;
    } else if (memberEmails.includes(inputValue)) {
      setErrorMessage("Address has already been invited");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    inviteNewWorkspaceMember({ variables: { workspaceId, email: inputValue } });
  };

  return (
    <form className="flex flex-col" onSubmit={handleAddMember}>
      <div className="flex-grow flex flex-row space-x-4">
        <TextInput placeholder="Email address" value={inputValue} onChange={onChange} />
        <ModalButton onClick={handleAddMember} disabled={isLoading}>
          {isLoading ? "Loading" : "Invite"}
        </ModalButton>
      </div>
      {errorMessage ? <div className="text-red-500 text-sm">{errorMessage}</div> : null}
    </form>
  );
}

function WorkspaceSettingsModal(props: PropsFromRedux) {
  const { members } = hooks.useGetWorkspaceMembers(props.workspaceId!);
  const updateDefaultWorkspace = hooks.useUpdateDefaultWorkspace();
  const deleteWorkspace = hooks.useDeleteWorkspace();

  const handleDeleteTeam = () => {
    const line1 = `Unexpected bad things will happen if you don't read this!`;
    const line2 = `This action cannot be undone. This will permanently delete this repository and delete all of the replays, api-keys, sourcemaps and remove all team member associations`;
    const line3 = `Click OK to proceed.`;
    const message = `${line1}\n\n${line2}\n\n${line3}`;

    if (window.confirm(message)) {
      deleteWorkspace({
        variables: { workspaceId: props.workspaceId, shouldDeleteRecordings: true },
      });
      props.hideModal();
      props.setWorkspaceId(null);
      updateDefaultWorkspace({ variables: { workspaceId: null } });
    }
  };

  return (
    <Modal options={{ maskTransparency: "translucent" }} onMaskClick={props.hideModal}>
      <div
        className="p-12 bg-white rounded-lg shadow-xl text-xl relative flex flex-col justify-between"
        style={{ width: "520px", height: "600px" }}
      >
        <div className="space-y-12 flex flex-col flex-grow overflow-hidden">
          <h2 className="font-bold text-3xl ">{`Team settings`}</h2>
          <div className="flex flex-col flex-grow space-y-4 overflow-hidden">
            <div className="text-xl">{`Manage members here so that everyone who belongs to this team can see each other's replays.`}</div>
            <WorkspaceForm {...{ ...props, members }} />
            <div className=" text-sm uppercase font-semibold">{`Members`}</div>
            <div className="overflow-auto flex-grow">
              <div className="workspace-members-container flex flex-col space-y-2">
                <div className="flex flex-col space-y-2">
                  {members ? <WorkspaceMembers members={members} /> : null}
                </div>
              </div>
            </div>
            <InvitationLink workspaceId={props.workspaceId!} />
            <div className="flex flex-col space-y-4">
              <div className=" text-sm uppercase font-semibold">{`Danger Zone`}</div>
              <div className="border border-red-300 flex flex-row justify-between rounded-lg p-2">
                <div className="flex flex-col">
                  <div className="font-semibold">Delete this team</div>
                  <div className="">{`This cannot be reversed.`}</div>
                </div>
                <button
                  onClick={handleDeleteTeam}
                  className="max-w-max items-center px-4 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryAccent text-white bg-red-600 hover:bg-red-700"
                >
                  Delete this team
                </button>
              </div>
            </div>
          </div>
        </div>
        <button className="absolute top-4 right-4" onClick={props.hideModal}>
          <div>
            <MaterialIcon>close</MaterialIcon>
          </div>
        </button>
      </div>
    </Modal>
  );
}

const connector = connect((state: UIState) => ({ workspaceId: selectors.getWorkspaceId(state) }), {
  hideModal: actions.hideModal,
  setWorkspaceId: actions.setWorkspaceId,
});
export type PropsFromRedux = ConnectedProps<typeof connector>;

export default connector(WorkspaceSettingsModal);
