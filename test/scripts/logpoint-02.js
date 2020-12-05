// Test that logpoints appear and disappear as expected as breakpoints are
// modified. Also test that conditional logpoints work.
(async function () {
  await Test.start();
  const { assert } = Test;

  await Test.selectSource("doc_rr_basic.html");
  await Test.addBreakpoint("doc_rr_basic.html", 20, undefined, {
    logValue: `displayName, "Logpoint Number", number`,
  });
  await Test.addBreakpoint("doc_rr_basic.html", 9, undefined, {
    logValue: `displayName, "Logpoint Beginning"`,
  });
  await Test.addBreakpoint("doc_rr_basic.html", 7, undefined, {
    logValue: `displayName, " Logpoint Ending"`,
  });

  await Test.selectConsole();
  await Test.waitForMessageCount("Logpoint", 12);

  await Test.disableBreakpoint("doc_rr_basic.html", 9);
  await Test.waitForMessageCount("Logpoint", 11);
  await Test.waitForMessageCount("updateNumber", 10);
  await Test.waitForMessageCount("Logpoint Number", 10);

  await Test.setBreakpointOptions("doc_rr_basic.html", 20, undefined, {
    logValue: `"Logpoint Number " + number`,
    condition: `number % 2 == 0`,
  });
  await Test.waitForMessageCount("Logpoint", 6);

  Test.finish();
})();
