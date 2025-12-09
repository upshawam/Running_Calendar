import { DateControl } from "./DateControl";
import PlanPicker from "./PlanPicker";
import { PlanSummary, Units } from "types/app";
import { WeekStartsOn, WeekStartsOnValues } from "../ch/datecalc";
import UnitsButtons from "./UnitsButtons";

interface Props {
  availablePlans: PlanSummary[];
  selectedPlan: PlanSummary;
  selectedDate: Date;
  dateChangeHandler: (d: Date) => void;
  selectedPlanChangeHandler: (p: PlanSummary) => void;
  weekStartsOn: WeekStartsOn;
  weekStartsOnChangeHandler: (v: WeekStartsOn) => void;
  selectedUnits: Units;
  unitsChangeHandler: (u: Units) => void;
}

const PlanAndDate = ({
  selectedPlan,
  selectedPlanChangeHandler,
  availablePlans,
  selectedDate,
  dateChangeHandler,
  weekStartsOn,
  weekStartsOnChangeHandler,
  selectedUnits,
  unitsChangeHandler,
}: Props) => {
  return (
    <div className="plan-and-date">
      <PlanPicker
        availablePlans={availablePlans}
        selectedPlan={selectedPlan}
        planChangeHandler={selectedPlanChangeHandler}
      />
      <div className="controls-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Week starts on</h3>
          <select className="select" value={weekStartsOn} onChange={(event) => {
            const newValue = Number(event.target.value) as WeekStartsOn;
            weekStartsOnChangeHandler(newValue);
          }}>
            <option key="monday" value={WeekStartsOnValues.Monday}>
              Monday
            </option>
            <option key="sunday" value={WeekStartsOnValues.Sunday}>
              Sunday
            </option>
            <option key="saturday" value={WeekStartsOnValues.Saturday}>
              Saturday
            </option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>ending on</h3>
          <DateControl
            selectedDate={selectedDate}
            onDateChanged={dateChangeHandler}
            weekStartsOn={weekStartsOn}
          />
        </div>
        <UnitsButtons
          units={selectedUnits}
          unitsChangeHandler={unitsChangeHandler}
        />
      </div>
    </div>
  );
};

export default PlanAndDate;
