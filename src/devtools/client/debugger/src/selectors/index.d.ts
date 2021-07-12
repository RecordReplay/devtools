import { UIState } from "ui/state";
import { Location } from "@recordreplay/protocol";

export interface UrlLocation extends Location {
  sourceUrl: string;
}

export interface SelectedFrame {
  id: string;
  displayName: string;
  location: UrlLocation;
}

export function getThreadContext(state: UIState): any;
export function getVisibleSelectedFrame(state: UIState): SelectedFrame | null;
export function getSourceWithContent(state: UIState, sourceId: string): any;
export function getPausePreviewLocation(state: UIState): UrlLocation;
export function getDebugLineLocation(state: UIState): UrlLocation | undefined;
