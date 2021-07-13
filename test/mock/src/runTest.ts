import playwright, { Page } from "@recordreplay/playwright";
import dotenv from "dotenv";

dotenv.config();

type BrowserName = "chromium" | "firefox";
let browserName: BrowserName = process.env.PLAYWRIGHT_CHROMIUM ? "chromium" : "firefox";
const launchOptions = {
  headless: !!process.env.PLAYWRIGHT_HEADLESS,
};

let depth = 0;
const pad = () => "".padStart(depth * 2);
const indent = (value: any) =>
  String(value)
    .split("\n")
    .map(l => pad() + l)
    .join("\n");

const log = (...args: any[]) => {
  if (depth) {
    console.log(pad().substr(1), ...args);
  } else {
    console.log(...args);
  }
};

function wrapped<T>(cbk: (...args: any[]) => Promise<T>, pageLog = log, inline = false) {
  const i = inline ? 0 : 1;
  return async (name: string, ...args: any[]) => {
    try {
      await pageLog(inline ? name : `> ${name}`);
      depth += i;
      return await cbk(...args);
    } catch (e) {
      if (!e.handled) {
        e.handled = true;
        console.error(indent(`🛑 Error in ${name}\n`));
        console.error(indent(e.stack));
      }

      throw e;
    } finally {
      depth -= i;
      if (!inline) await pageLog(`< ${name}`);
    }
  };
}

function bindPageActions(page: Page) {
  const actions: any = {};

  // Create page-bound actions
  const pageLog = (...args: any[]) => {
    log(...args);
    return page.evaluate((extArgs: any) => {
      console.log("Test Step:", ...extArgs);
    }, args);
  };

  const pageAction = wrapped(async cbk => await cbk(page, actions), pageLog);
  const pageStep = wrapped(async cbk => await cbk(page, actions), pageLog, true);

  actions.log = pageLog;
  actions.action = pageAction;
  actions.step = pageStep;

  return actions;
}

const action = wrapped(async cbk => await cbk());

export const runTest = wrapped(async cbk => {
  const browser = await playwright[browserName].launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageLog = (...args: string[]) => {
    log(...args);
    page
      .evaluate(extArgs => {
        console.log("Test Step:", ...extArgs);
      }, args)
      .catch(e => {});
  };

  pageLog("Browser launched");
  let success = true;

  // page.on("console", console.log);

  await action("Running example", async () => {
    try {
      await cbk(page, bindPageActions(page));
    } catch (e) {
      success = false;
      console.error(e);
    }
    pageLog(`Test ${success ? "succeeded" : "failed"}`);
  });

  // Adding a short delay after the script to allow space for trailing script
  // execution
  await page.waitForTimeout(100);

  await page.close();
  await context.close();
  await browser.close();

  process.exit(success ? 0 : 1);
});

export function devtoolsURL({ id }: { id: string }) {
  let url = "http://localhost:8080/view?mock=1";
  if (id) {
    url += `&id=${id}`;
  }
  return url;
}

const WaitTimeout = 30_000;

export async function waitUntil(callback: () => Promise<boolean>) {
  const startTime = Date.now();
  while (true) {
    if (Date.now() - startTime > WaitTimeout) {
      throw new Error("waitUntil() timed out");
    }
    if (await callback()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
