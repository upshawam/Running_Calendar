import { useDrop } from "react-dnd";
import { ItemTypes } from "../ch/ItemTypes";
import { WorkoutCard } from "./WorkoutCard";
import { BlankCard } from "./BlankCard";
import { Overlay } from "./Overlay";
import { DayDetails, Units } from "types/app";

interface Props {
  dayDetails: DayDetails | undefined;
  date: Date;
  units: Units;
  swap: (d1: Date, d2: Date) => void;
  selected: boolean;
  hovering: boolean;
  isToday?: boolean;
  todayRef?: React.RefObject<HTMLDivElement>;
}

export const DayCell = ({
  dayDetails,
  date,
  units,
  swap,
  selected,
  hovering,
  isToday,
  todayRef,
}: Props) => {

  function canSwap(droppedDate: Date) {
    return dayDetails !== undefined && date !== droppedDate;
  }

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.DAY,
    canDrop: (item) => canSwap(item.date),
    drop: (item: { date: Date }) => {
      swap(date, item.date);
      return;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      droppedItem: monitor.getItem(),
    }),
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        className={`day-cell${isToday ? " today-highlight" : ""}`}
        ref={isToday ? (node => {
          drop(node);
          if (todayRef && node) todayRef.current = node;
        }) : drop}
      >
        {dayDetails && (
          <WorkoutCard
            dayDetails={dayDetails}
            date={date}
            units={units}
            swap={swap}
          />
        )}
        {!dayDetails && <BlankCard date={date} />}
        {isOver && !canDrop && <Overlay color="pink" />}
        {isOver && canDrop && <Overlay color="lightgreen" />}

        {dayDetails && selected && <Overlay color="pink" />}
        {dayDetails && !selected && hovering && <Overlay color="lightgreen" />}
      </div>
    </div>
  );
};
