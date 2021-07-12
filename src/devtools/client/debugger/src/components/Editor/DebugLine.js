/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

//
import { PureComponent } from "react";
import {
  toEditorLine,
  toEditorColumn,
  getDocument,
  startOperation,
  endOperation,
  getTokenEnd,
} from "../../utils/editor";
import { isException } from "../../utils/pause";
import { getIndentation } from "../../utils/indentation";
import { connect } from "../../utils/connect";
import { getPauseReason, getDebugLineLocation } from "../../selectors";

export class DebugLine extends PureComponent {
  debugExpression;

  componentDidMount() {
    const { why, location } = this.props;
    this.setDebugLine(why, location);
  }

  componentWillUnmount() {
    const { why, location } = this.props;
    this.clearDebugLine(why, location);
  }

  componentDidUpdate(prevProps) {
    const { why, location } = this.props;

    startOperation();
    this.clearDebugLine(prevProps.why, prevProps.location);
    this.setDebugLine(why, location);
    endOperation();
  }

  setDebugLine(why, location) {
    if (!location) {
      return;
    }
    const { sourceId } = location;
    const doc = getDocument(sourceId);
    if (!doc) {
      return;
    }

    const line = toEditorLine(location.line);
    let { markTextClass, lineClass } = this.getTextClasses(why);
    doc.addLineClass(line, "line", lineClass);

    const lineText = doc.getLine(line);
    let column = toEditorColumn(lineText, location.column);
    column = Math.max(column, getIndentation(lineText));

    // If component updates because user clicks on
    // another source tab, codeMirror will be null.
    const columnEnd = doc.cm ? getTokenEnd(doc.cm, line, column) : null;

    if (columnEnd === null) {
      markTextClass += " to-line-end";
    }

    this.debugExpression = doc.markText(
      { ch: column, line },
      { ch: columnEnd, line },
      { className: markTextClass }
    );
  }

  clearDebugLine(why, location) {
    if (!location) {
      return;
    }

    if (this.debugExpression) {
      this.debugExpression.clear();
    }

    const line = toEditorLine(location.line);
    const doc = getDocument(location.sourceId);
    if (!doc) {
      return;
    }
    const { lineClass } = this.getTextClasses(why);
    doc.removeLineClass(line, "line", lineClass);
  }

  getTextClasses(why) {
    if (why && isException(why)) {
      return {
        markTextClass: "debug-expression-error",
        lineClass: "new-debug-line-error",
      };
    }

    return { markTextClass: "debug-expression", lineClass: "new-debug-line" };
  }

  render() {
    return null;
  }
}

const mapStateToProps = state => {
  return {
    location: getDebugLineLocation(state),
    why: getPauseReason(state),
  };
};

export default connect(mapStateToProps)(DebugLine);
