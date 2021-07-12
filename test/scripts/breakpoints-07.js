(async () => {
  const url = new URL(location.href);
  if (!url.searchParams.get("navigated")) {
    // part one of the test, before the example recording is reloaded:
    console.log(`# Test that breakpoints work across navigations.`);
    await Test.start();

    // this source is loaded twice, wait until the server has sent us both instances
    await Test.waitForSourceCount("bundle_input.js", 2);

    Test.app.actions.openQuickOpen();
    Test.app.actions.setQuickOpenQuery("bundle");
    await Test.waitUntil(() => {
      const foundSourceUrls = [...document.querySelectorAll("#result-list .title")].map(
        el => el.textContent
      );
      return JSON.stringify(foundSourceUrls) === '["bundle_input.js"]';
    });
    Test.app.actions.closeQuickOpen();

    await Test.addBreakpoint("bundle_input.js", 5);

    await Test.rewindToLine(5);
    await checkBreakpointPanel(2);

    await Test.rewindToLine(5);
    await checkBreakpointPanel(1);

    closeEditor();
    // click the first source link in the console
    document.querySelectorAll(".webconsole-output .frame-link-source")[0].click();
    await checkBreakpointPanel(1);
    await checkDebugLine();

    closeEditor();
    // click the second source link in the console
    document.querySelectorAll(".webconsole-output .frame-link-source")[1].click();
    await checkBreakpointPanel(1);
    await checkDebugLine();

    // reload the recording
    url.searchParams.append("navigated", "true");
    document.location.href = url.href;
    await new Promise(() => {});
  } else {
    // part two of the test, after reloading:
    Test.app.actions.setViewMode("dev");

    // open the Pause Information panel
    const pauseInfoButton = await Test.waitUntil(() =>
      document.querySelector("#toolbox-toolbar .toolbar-panel-button.debug button")
    );
    pauseInfoButton.click();

    await Test.waitUntil(
      () => document.querySelectorAll(".breakpoints-list .breakpoint").length === 1
    );

    Test.finish();
  }
})();

async function checkBreakpointPanel(selectedBreakpoint) {
  await Test.waitUntil(() => {
    const statusElement = document.querySelector(".breakpoint-navigation-status-container");
    return statusElement && statusElement.textContent === `${selectedBreakpoint}/2`;
  });
}

async function checkDebugLine() {
  await Test.waitUntil(() =>
    document.querySelector(".editor-pane .CodeMirror-code .new-debug-line")
  );
}

function closeEditor() {
  document.querySelector(".source-tabs .close").click();
  Test.assert(document.querySelector(".breakpoint-navigation-status-container") === null);
}
