import React, { Dispatch, SetStateAction } from "react";
import { connect, ConnectedProps } from "react-redux";
import { selectors } from "ui/reducers";
import { actions } from "ui/actions";
import { UIState } from "ui/state";
import hooks from "ui/hooks";
import classnames from "classnames";
import WorkspaceDropdown from "./WorkspaceDropdown";
import "./DashboardNavigation.css";
import { Workspace } from "ui/types";
import MaterialIcon from "ui/components/shared/MaterialIcon";

interface Recording {
  url: string;
}

type DashboardNavigationProps = PropsFromRedux & {
  recordings: Recording[];
  filter: string;
  nonPendingWorkspaces?: Workspace[];
  setFilter: Dispatch<SetStateAction<string>>;
};

function DashboardNavigation({
  currentWorkspaceId,
  nonPendingWorkspaces,
  setModal,
}: DashboardNavigationProps) {
  const { userSettings } = hooks.useGetUserSettings();
  const enableTeams = userSettings?.enableTeams;

  const isPersonal = currentWorkspaceId == null;
  const onSettingsClick = () => {
    setModal("workspace-settings");
  };

  if (!enableTeams) {
    return <nav className="left-sidebar"></nav>;
  }

  return (
    <nav className="left-sidebar">
      {nonPendingWorkspaces && <WorkspaceDropdown nonPendingWorkspaces={nonPendingWorkspaces} />}
      {nonPendingWorkspaces && !isPersonal ? (
        <div className={classnames("left-sidebar-menu-item")} onClick={onSettingsClick}>
          <MaterialIcon>settings</MaterialIcon>
          <span>{`Settings & Members`}</span>
        </div>
      ) : null}
    </nav>
  );
}

const connector = connect(
  (state: UIState) => ({
    currentWorkspaceId: selectors.getWorkspaceId(state),
  }),
  { setModal: actions.setModal }
);
type PropsFromRedux = ConnectedProps<typeof connector>;
export default connector(DashboardNavigation);
