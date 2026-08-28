import React from "react";
import { render } from "../ch/rendering";
import { Dateline } from "./Dateline";
import { useDrag, DragSourceMonitor } from "react-dnd";
import { ItemTypes } from "../ch/ItemTypes";
import { DragHandle } from "./DragHandle";
import { DayDetails, Units } from "types/app";

interface Props {
  dayDetails: DayDetails;
  date: Date;
  units: Units;
  swap: (d1: Date, d2: Date) => void;
  paceData?: any;
  isCurrentWeek?: boolean;
}

function renderDesc(
  dayDetails: DayDetails,
  from: Units,
  to: Units,
): React.ReactElement {
  let [title, desc] = render(dayDetails, from, to);
  // Only render the description if it differs from the title
  // In the ical file we always render both and we automatically render the description using the same text as title if description is empty
  desc = title.replace(/\s/g, "") === desc.replace(/\s/g, "") ? "" : desc;
  return (
    <>
      <p>
        <span className="workout-title">{title}</span>
      </p>
      {desc && 
        <p>
          <span className="workout-description">{desc}</span>
        </p>
      }
    </>
  );
}

function matchPaceType(title: string, paceData: any): string | null {
  if (!title || !paceData) return null;
  const titleLower = title.toLowerCase();
  
  const paceTypes = [
    { label: "Recovery", synonyms: ["recovery"] },
    { label: "Gen-aerobic", synonyms: ["gen-aerobic", "general aerobic", "aerobic"] },
    { label: "Long/Medium", synonyms: ["long/medium", "long/medium long", "long run", "medium long", "med-long"] },
    { label: "Marathon", synonyms: ["marathon"] },
    { label: "LT", synonyms: ["lt", "lactate threshold", "threshold"] },
    { label: "VO2max", synonyms: ["vo2max", "vo2 max"] },
  ];
  
  for (const paceType of paceTypes) {
    if (paceType.synonyms.some(syn => titleLower.includes(syn))) {
      const foundKey = Object.keys(paceData).find(k =>
        paceType.synonyms.some(syn => k.toLowerCase().includes(syn))
      );
      if (foundKey && paceData[foundKey].pace_range) {
        return paceData[foundKey].pace_range;
      }
    }
  }
  return null;
}

function isRestDay(dayDetails: DayDetails): boolean {
  return /^(off day|rest)$/i.test(dayDetails.title);
}

export const WorkoutCard = ({ dayDetails, date, units, paceData, isCurrentWeek }: Props) => {
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.DAY,
    item: { date: date, dayDetails: dayDetails, units: units },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      canDrag: dayDetails !== undefined,
    }),
    end: (item: { date: Date } | undefined, monitor: DragSourceMonitor) => {
      const dropResult = monitor.getDropResult();
      if (item && dropResult) {
      }
    },
  });

  const restDay = isRestDay(dayDetails);
  const paceInfo = !restDay && isCurrentWeek ? matchPaceType(dayDetails.title, paceData) : null;
  
  return (
    <div ref={preview} className={`workout-card${restDay ? " rest-day" : ""} ${isDragging ? "dragging" : ""}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <Dateline $date={date} />
      <div className="workout-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div ref={drag}>
          <DragHandle viewBox="0 0 32 36" />
        </div>
        <div style={{ flex: 1 }}>
          {!restDay && renderDesc(dayDetails, dayDetails.sourceUnits, units)}
        </div>
        {paceInfo && (
          <div style={{ 
            textAlign: 'center',
            fontSize: '0.75rem', 
            color: '#666', 
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingTop: '0.25rem',
            borderTop: '1px solid #eee',
            marginTop: '0.25rem'
          }}>{paceInfo}</div>
        )}
      </div>
    </div>
  );
};
