import React, { useState } from "react";
import { Recording, User } from "ui/types";
import hooks from "ui/hooks";
import "./CollaboratorsList.css";
import MaterialIcon from "../MaterialIcon";

export interface CollaboratorDbData {
  collaborationId: string;
  user: User;
  email?: string;
  createdAt: string;
}

function Collaborator({
  collaborator,
  collaborationId,
}: {
  collaborator: CollaboratorDbData;
  collaborationId?: string;
}) {
  const { deleteCollaborator } = hooks.useDeleteCollaborator();
  const handleDeleteClick = () => {
    deleteCollaborator({ variables: { collaborationId } });
  };
  let iconAndName;

  if (collaborator.email) {
    iconAndName = (
      <>
        <div className="bg-gray-200 rounded-full" style={{ padding: "5px", marginRight: "8px" }}>
          <MaterialIcon className="text-white">mail_outline</MaterialIcon>
        </div>
        <div className="main">
          <div className="name">{collaborator.email}</div>
        </div>
      </>
    );
  } else {
    iconAndName = (
      <>
        <div className="icon" style={{ backgroundImage: `url(${collaborator.user.picture})` }} />
        <div className="main">
          <div className="name">{collaborator.user.name}</div>
        </div>
      </>
    );
  }

  return (
    <div className="permission">
      {iconAndName}
      <div className="role">Collaborator</div>
      <button className="delete" onClick={handleDeleteClick}>
        <div className="img close" />
      </button>
    </div>
  );
}

function Author({ picture, name }: { picture: string; name: string }) {
  return (
    <div className="permission">
      <div className="icon" style={{ backgroundImage: `url(${picture})` }} />
      <div className="main">
        <div className="name">{name}</div>
      </div>
      <div className="role">Author</div>
    </div>
  );
}

function Collaborators({ collaborators }: { collaborators: CollaboratorDbData[] }) {
  const sortedCollaborators = collaborators.sort(
    (a: CollaboratorDbData, b: CollaboratorDbData) => Number(b.createdAt) - Number(a.createdAt)
  );

  return (
    <>
      {sortedCollaborators.map((collaborator, i) => (
        <Collaborator
          collaborator={collaborator}
          collaborationId={collaborator.collaborationId}
          key={i}
        />
      ))}
    </>
  );
}

export default function CollaboratorsList({
  recording,
  collaborators,
}: {
  recording: Recording;
  collaborators: CollaboratorDbData[] | null;
}) {
  return (
    <div className="permissions-list">
      <Author picture={recording.user!.picture} name={recording.user!.name} />
      {collaborators ? <Collaborators {...{ collaborators }} /> : null}
    </div>
  );
}
