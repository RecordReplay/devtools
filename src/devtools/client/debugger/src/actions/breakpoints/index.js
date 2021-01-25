/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

//

/**
 * Redux actions for breakpoints
 * @module actions/breakpoints
 */

import {
  getBreakpointsList,
  getSelectedSource,
  getBreakpointAtLocation,
  getBreakpointsForSource,
  getFirstBreakpointPosition,
  getSymbols,
} from "../../selectors";
import { findClosestEnclosedSymbol } from "../../utils/ast";
import {
  addBreakpoint,
  removeBreakpoint,
  enableBreakpoint,
  disableBreakpoint,
  runAnalysis,
} from "./modify";
import { setBreakpointPositions } from "./breakpointPositions";
import { actions } from "ui/actions";
import { selectors } from "ui/reducers";
import remapLocations from "./remapLocations";
import { getFilename } from "devtools/client/debugger/src/utils/source";

// this will need to be changed so that addCLientBreakpoint is removed

export * from "./breakpointPositions";
export * from "./modify";
export * from "./syncBreakpoint";

/**
 * Disable all breakpoints in a source
 *
 * @memberof actions/breakpoints
 * @static
 */
export function disableBreakpointsInSource(cx, source) {
  return async ({ dispatch, getState, client }) => {
    const breakpoints = getBreakpointsForSource(getState(), source.id);
    for (const breakpoint of breakpoints) {
      if (!breakpoint.disabled) {
        dispatch(disableBreakpoint(cx, breakpoint));
      }
    }
  };
}

/**
 * Enable all breakpoints in a source
 *
 * @memberof actions/breakpoints
 * @static
 */
export function enableBreakpointsInSource(cx, source) {
  return async ({ dispatch, getState, client }) => {
    const breakpoints = getBreakpointsForSource(getState(), source.id);
    for (const breakpoint of breakpoints) {
      if (breakpoint.disabled) {
        dispatch(enableBreakpoint(cx, breakpoint));
      }
    }
  };
}

/**
 * Removes all breakpoints
 *
 * @memberof actions/breakpoints
 * @static
 */
export function removeAllBreakpoints(cx) {
  return async ({ dispatch, getState }) => {
    const breakpointList = getBreakpointsList(getState());
    await Promise.all(breakpointList.map(bp => dispatch(removeBreakpoint(cx, bp))));
    dispatch({ type: "REMOVE_BREAKPOINTS" });
  };
}

/**
 * Removes breakpoints
 *
 * @memberof actions/breakpoints
 * @static
 */
export function removeBreakpoints(cx, breakpoints) {
  return async ({ dispatch }) => {
    return Promise.all(breakpoints.map(bp => dispatch(removeBreakpoint(cx, bp))));
  };
}

/**
 * Removes all breakpoints in a source
 *
 * @memberof actions/breakpoints
 * @static
 */
export function removeBreakpointsInSource(cx, source) {
  return async ({ dispatch, getState, client }) => {
    const breakpoints = getBreakpointsForSource(getState(), source.id);
    for (const breakpoint of breakpoints) {
      dispatch(removeBreakpoint(cx, breakpoint));
    }
  };
}

export function remapBreakpoints(cx, sourceId) {
  return async ({ dispatch, getState, sourceMaps }) => {
    const breakpoints = getBreakpointsForSource(getState(), sourceId);
    const newBreakpoints = await remapLocations(breakpoints, sourceId, sourceMaps);

    // Normally old breakpoints will be clobbered if we re-add them, but when
    // remapping we have changed the source maps and the old breakpoints will
    // have different locations than the new ones. Manually remove the
    // old breakpoints before adding the new ones.
    for (const bp of breakpoints) {
      dispatch(removeBreakpoint(cx, bp));
    }

    for (const bp of newBreakpoints) {
      await dispatch(addBreakpoint(cx, bp.location, bp.options, bp.disabled));
    }
  };
}

export function toggleBreakpointAtLine(cx, line) {
  return ({ dispatch, getState, client, sourceMaps }) => {
    const state = getState();
    const selectedSource = getSelectedSource(state);

    if (!selectedSource) {
      return;
    }

    const bp = getBreakpointAtLocation(state, { line, column: undefined });
    if (bp) {
      return dispatch(removeBreakpoint(cx, bp));
    }
    return dispatch(
      addBreakpoint(cx, {
        sourceId: selectedSource.id,
        sourceUrl: selectedSource.url,
        line,
      })
    );
  };
}

export function runAnalysisOnLine(cx, line) {
  return ({ dispatch, getState }) => {
    const state = getState();
    const source = getSelectedSource(state);

    if (!source) {
      return;
    }

    const options = { logValue: "dummyValue" };
    const location = {
      sourceId: source.id,
      sourceUrl: source.url,
      column: undefined,
      line,
    };

    return dispatch(runAnalysis(cx, location, options));
  };
}

export function updateHoveredLineNumber(cx, line) {
  return async ({ dispatch, getState }) => {
    const state = getState();
    const source = getSelectedSource(state);

    const initialLocation = {
      sourceId: source.id,
      sourceUrl: source.url,
      column: undefined,
      line,
    };

    // Set the initial location here as a placeholder to be checked after any async activity.
    dispatch(actions.setHoveredLineNumberLocation(initialLocation));

    await dispatch(setBreakpointPositions({ sourceId: source.id, line }));
    const location = getFirstBreakpointPosition(getState(), initialLocation);

    // It's possible that after the `await` above the user is either 1) hovered off of the
    // original line number, or 2) hovered on a different line number altogether. In that
    // case, we should bail.
    if (selectors.getHoveredLineNumberLocation(getState()) !== initialLocation) {
      return;
    }

    dispatch(actions.setHoveredLineNumberLocation(location));
  };
}

export function addBreakpointAtLine(cx, line, shouldLog = false, disabled = false) {
  return ({ dispatch, getState }) => {
    const state = getState();
    const source = getSelectedSource(state);

    if (!source) {
      return;
    }

    const breakpointLocation = {
      sourceId: source.id,
      sourceUrl: source.url,
      column: undefined,
      line,
    };

    const options = {
      logValue: getLogValue(source, state, breakpointLocation),
    };

    return dispatch(addBreakpoint(cx, breakpointLocation, options, disabled));
  };
}

export function addBreakpointAtColumn(cx, location) {
  return ({ dispatch, getState }) => {
    const state = getState();
    const source = getSelectedSource(state);
    const { column, line } = location;

    if (!source) {
      return;
    }
    const breakpointLocation = {
      sourceId: source.id,
      sourceUrl: source.url,
      column: column,
      line: line,
    };

    const options = {
      logValue: getLogValue(source, state, location),
    };

    return dispatch(addBreakpoint(cx, breakpointLocation, options));
  };
}

export function removeBreakpointsAtLine(cx, sourceId, line) {
  return ({ dispatch, getState, client, sourceMaps }) => {
    const breakpointsAtLine = getBreakpointsForSource(getState(), sourceId, line);
    return dispatch(removeBreakpoints(cx, breakpointsAtLine));
  };
}

function getLogValue(source, state, location) {
  const file = getFilename(source);
  const symbols = getSymbols(state, source);
  const { line, column } = location;
  const symbol = findClosestEnclosedSymbol(symbols, location);

  if (symbol) {
    return `"${symbol.name}"`;
  }

  let logValue = `"${file}:${line}"`;
  if (column) {
    logValue += `":${column}"`;
  }

  return logValue;
}
