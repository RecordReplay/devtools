import mixpanel from "mixpanel-browser";
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import { skipTelemetry } from "./environment";

export function setupTelemetry(context: Record<string, any>) {
  const ignoreList = ["Current thread has paused or resumed", "Current thread has changed"];
  mixpanel.init("ffaeda9ef8fb976a520ca3a65bba5014");

  if (skipTelemetry()) {
    mixpanel.disable();
    return;
  }

  Sentry.init({
    dsn: "https://41c20dff316f42fea692ef4f0d055261@o437061.ingest.sentry.io/5399075",
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
    release: process.env.REPLAY_RELEASE ? process.env.REPLAY_RELEASE : "development",
    beforeSend(event) {
      if (event) {
        const exceptionValue = event?.exception?.values?.[0].value;
        if (ignoreList.some(ignore => exceptionValue?.includes(ignore))) {
          return null;
        }
      }

      return event;
    },
  });

  mixpanel.register({ recordingId: context.recordingId });

  Sentry.setContext("recording", { ...context, url: window.location.href });
}

export function setTelemetryContext(
  userId: string | undefined,
  userEmail: string | undefined,
  isInternal: boolean
) {
  Sentry.setTag("userInternal", isInternal);
  if (userId && userEmail) {
    Sentry.setUser({ id: userId, email: userEmail });
    Sentry.setTag("userEmail", userEmail);
    Sentry.setTag("anonymous", false);
  } else {
    Sentry.setTag("anonymous", true);
  }

  if (userId) {
    mixpanel.identify(userId);
  }

  if (userEmail) {
    mixpanel.people.set({ $email: userEmail });
  }
}

export async function sendTelemetryEvent(event: string, tags: any = {}) {
  try {
    if (skipTelemetry()) {
      return;
    }
    const response = await fetch("https://telemetry.replay.io/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event, ...tags }),
    });
    if (!response.ok) {
      console.error(`Sent telemetry event ${event} but got status code ${response.status}`);
    }
  } catch (e) {
    console.error(`Couldn't send telemetry event ${event}`, e);
  }
}
