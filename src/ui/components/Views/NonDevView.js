import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import Timeline from "../Timeline";
import Tooltip from "../Tooltip";
import SplitBox from "devtools/client/shared/components/splitter/SplitBox";
import CommentsPanel from "ui/components/SecondaryToolbox/CommentsPanel";
import EventListeners from "devtools/client/debugger/src/components/SecondaryPanes/EventListeners";
import Dropdown from "ui/components/shared/Dropdown";

import { installObserver } from "../../../protocol/graphics";
import { updateTimelineDimensions } from "../../actions/timeline";
import { prefs } from "../../utils/prefs";
import { selectors } from "../../reducers";
import "./NonDevView.css";

export function EventsFilter() {
  const [expanded, setExpanded] = useState(false);

  const buttonContent = <div className="img settings" />;

  return (
    <div className="event-breakpoints">
      <Dropdown
        buttonContent={buttonContent}
        setExpanded={setExpanded}
        expanded={expanded}
        buttonStyle={"secondary"}
      >
        <EventListeners />
      </Dropdown>
    </div>
  );
}

function getTypeValue(valueFront) {
  const getters = valueFront._object.preview.getterValues;

  const typeGetter = getters.find(getter => getter.name == "type");
  const typeValue = typeGetter.value._primitive;

  return typeValue;
}

function isEventMessage(message) {
  // Bail if there are no parameters in the first place.
  if (!message.parameters) {
    return false;
  }

  const valueFront = [...message.parameters].shift();

  // Bail if this is a primitive since we're looking for event objects.
  if (!valueFront._object) {
    return false;
  }

  return true;
}

function getNativeEvent(valueFront) {
  const objectPreview = valueFront._object.preview;
  const objectProperties = objectPreview.properties;

  if (!objectProperties) {
    return;
  }

  const nativeEvent = objectProperties.find(property => property.name == "nativeEvent");

  return nativeEvent;
}

function isSameEvent(newMessage, lastMessage) {
  if (!lastMessage) {
    return false;
  }

  const newX = newMessage.parameters[0]._object.preview.getterValues.find(e => e.name == "x");
  const newXValue = newX.value._primitive;
  const lastX = lastMessage.parameters[0]._object.preview.getterValues.find(e => e.name == "x");
  const lastXValue = lastX.value._primitive;

  return newXValue === lastXValue;
}

function getEventMessages(messages) {
  const returnArray = [];
  messages.forEach(message => {
    if (!isEventMessage(message)) {
      return;
    }

    let valueFront = [...message.parameters].shift();
    let isMouseEvent;

    if (getNativeEvent(valueFront)) {
      const nativeEvent = getNativeEvent(valueFront);
      valueFront = nativeEvent.value;
      isMouseEvent = valueFront._object.className === "MouseEvent";
    } else {
      isMouseEvent = valueFront._object.className === "MouseEvent";
    }

    if (
      isMouseEvent &&
      !isSameEvent(message, returnArray[returnArray.length - 1]?.message || null)
    ) {
      const type = getTypeValue(valueFront);
      returnArray.push({
        message,
        type,
        className: message.parameters[0]._object.preview.getterValues.find(e => e.name == "target")
          .value._object.className,
      });
    }
  });

  return returnArray;
}

function NonDevView({ updateTimelineDimensions, messages, narrowMode }) {
  const eventMessages = getEventMessages(messages);
  const noModulesMessages = eventMessages.filter(
    msg => !msg.message.frame.source.includes("node_modules")
  );

  useEffect(() => {
    installObserver();
  }, []);

  const viewer = (
    <div id="outer-viewer">
      <div id="viewer">
        <canvas id="graphics"></canvas>
        <div id="highlighter-root"></div>
      </div>
      <div id="toolbox-timeline">
        <Timeline />
        <Tooltip />
      </div>
    </div>
  );
  const rightSidebar = (
    <div className="right-sidebar">
      <div className="right-sidebar-toolbar">
        <div className="right-sidebar-toolbar-item">Transcript and Comments</div>
        <EventsFilter />
      </div>
      <CommentsPanel eventMessages={noModulesMessages} />
    </div>
  );

  const handleMove = num => {
    updateTimelineDimensions();
    prefs.nonDevSidePanelWidth = `${num}px`;
  };

  if (narrowMode) {
    return (
      <>
        <SplitBox
          style={{ width: "100%", overflow: "hidden" }}
          splitterSize={1}
          initialSize={prefs.nonDevSidePanelWidth}
          minSize="20%"
          onMove={handleMove}
          maxSize="80%"
          vert={false}
          startPanel={
            <div id="outer-viewer">
              <div id="viewer">
                <canvas id="graphics"></canvas>
                <div id="highlighter-root"></div>
              </div>
            </div>
          }
          endPanel={rightSidebar}
          endPanelControl={false}
        />
        <div id="toolbox-timeline">
          <Timeline />
          <Tooltip />
        </div>
      </>
    );
  }

  return (
    <SplitBox
      style={{ width: "100%", overflow: "hidden" }}
      splitterSize={1}
      initialSize={prefs.nonDevSidePanelWidth}
      minSize="20%"
      onMove={handleMove}
      maxSize="80%"
      vert={true}
      startPanel={viewer}
      endPanel={rightSidebar}
      endPanelControl={false}
    />
  );
}

export default connect(
  state => ({
    narrowMode: selectors.getNarrowMode(state),
    messages: selectors.getMessagesForTimeline(state),
  }),
  {
    updateTimelineDimensions,
  }
)(NonDevView);
