import React, { useCallback, useEffect } from "react";
import { matchPath, useHistory, useLocation } from "react-router-dom";
import { withClerk, WithClerkProp } from "@clerk/clerk-react";
import { setUserInBrowserPrefs } from "../../utils/browser";

import "./Welcome.css";
import { pushModal } from "ui/utils/routing";

interface WelcomeProps {}

function WelcomePageBase({ clerk }: WithClerkProp<WelcomeProps>) {
  const history = useHistory();
  const forceOpenAuth = new URLSearchParams(location.search).has("signin");

  const isSignIn = matchPath(location.pathname, { path: "/sign-in" });
  const signIn = useCallback(
    () => (isSignIn ? clerk.openSignIn() : pushModal("/sign-in", history, history.location)),
    [clerk, isSignIn, history]
  );

  useEffect(() => {
    if (forceOpenAuth) {
      signIn();
    }
  }, [forceOpenAuth, signIn]);

  useEffect(() => {
    setUserInBrowserPrefs(null);
  }, []);

  return (
    <div className="welcome-screen">
      <div className="welcome-panel">
        <img className="logo" src="images/logo.svg" />
        <img className="atwork" src="images/computer-work.svg" />
        <button onClick={signIn}>Sign In</button>
      </div>
    </div>
  );
}

const WelcomePage = withClerk(WelcomePageBase);

export default WelcomePage;
export { WelcomePage };
