import React, { useState } from "react";
import { connect, ConnectedProps } from "react-redux";
import { actions } from "ui/actions";
const Modal = require("ui/components/shared/Modal").default;
import hooks from "ui/hooks";
import useToken from "ui/utils/useToken";
import { TextInput } from "../Forms";
import MaterialIcon from "../MaterialIcon";
import "./NewWorkspaceModal.css";

const content1 = `Teams are another way for you to see other people's replays.`;
const content2 = `You can do this by creating a team for your company, team or group and adding members. Replays deposited into a team are automatically visible to other members in that team.`;

function NewWorkspaceModal({ hideModal }: PropsFromRedux) {
  const [inputValue, setInputValue] = useState("");
  const createNewWorkspace = hooks.useCreateNewWorkspace();
  const handleSave = () => {
    createNewWorkspace({
      variables: { name: inputValue, userId },
    });
    hideModal();
  };

  const { claims } = useToken();
  const userId = claims?.hasura.userId;

  return (
    <div className="new-workspace-modal">
      <Modal>
        <main>
          <h1>
            <MaterialIcon>add_circle</MaterialIcon>
            <span>New Team</span>
          </h1>
          <div className="new-workspace-content">
            <p>{content1}</p>
            <p>{content2}</p>
          </div>
          <form onSubmit={handleSave} className="flex flex-col space-y-4">
            <TextInput
              placeholder="Your new team"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
            />
            <div className="flex justify-end">
              <input
                className="inline-flex items-center px-4 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                type="submit"
                value="Submit"
              />
            </div>
          </form>
        </main>
      </Modal>
    </div>
  );
}

const connector = connect(null, {
  hideModal: actions.hideModal,
});
export type PropsFromRedux = ConnectedProps<typeof connector>;

export default connector(NewWorkspaceModal);