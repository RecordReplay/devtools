import React, { useState } from "react";
import Modal from "./Modal";
import classnames from "classnames";
import { connect } from "react-redux";
import { selectors } from "ui/reducers";
import useAuth from "ui/utils/auth/useAuth";

import "./Error.css";

function RefreshButton() {
  const [clicked, setClicked] = useState(false);
  const handleClick = () => {
    setClicked(true);
    window.location = window.location.href;
  };

  return (
    <button className={classnames({ clicked })} onClick={handleClick}>
      <div className="img refresh" />
      <span className="content">Refresh</span>
    </button>
  );
}

function SignInButton() {
  // TODO: Clerk.dev
  // const { loginWithRedirect } = useAuth();
  const loginWithRedirect = () => console.log("not implemented");

  return <button onClick={loginWithRedirect}>Sign in</button>;
}

function ActionButton({ action }) {
  if (action == "refresh") {
    return <RefreshButton />;
  } else if (action == "sign-in") {
    return <SignInButton />;
  }

  return null;
}

function Error({ children, refresh, expected, unexpected, error }) {
  return (
    <div className={classnames("error-container", { expected, unexpected })}>
      <div className="error-mask" />
      <div className={"error-content"}>
        <h1>Whoops</h1>
        {children}
        {error.message ? <p className="error-message">{error.message}</p> : null}
        <ActionButton action={refresh ? "refresh" : error?.action} />
      </div>
    </div>
  );
}

function ExpectedError({ error }) {
  // This is for the class of errors that:
  // 1) Happens before to the app's initial page load has successfully completed.
  // 2) Is deterministic (e.g. bad recording ID).
  // 3) Will not be fixed by a page refresh.

  const isServerError = error.code;
  const content = isServerError ? "Looks like something went wrong with this page" : error.message;

  return (
    <Error error={error} expected>
      <p>{content}</p>
    </Error>
  );
}

function UnexpectedError({ error }) {
  // This is for the class of errors that:
  // 1) Happens after the app's initial page load has successfully completed.
  // 2) Is non-deterministic (e.g. an unexpected crash).
  // 3) Might be fixed by a page refresh.

  return (
    <Error error={error} refresh unexpected>
      <p>Looks like something went wrong with this page</p>
    </Error>
  );
}

function _AppErrors({ expectedError, unexpectedError }) {
  return (
    <>
      {expectedError ? <ExpectedError error={expectedError} /> : null}
      {unexpectedError ? <UnexpectedError error={unexpectedError} /> : null}
    </>
  );
}

export const AppErrors = connect(
  state => ({
    expectedError: selectors.getExpectedError(state),
    unexpectedError: selectors.getUnexpectedError(state),
  }),
  null
)(_AppErrors);

export function PopupBlockedError() {
  const error = { message: "OAuth consent popup blocked" };

  return (
    <Error refresh expected error={error}>
      <p>Please turn off your pop up blocker and refresh this page.</p>
    </Error>
  );
}
