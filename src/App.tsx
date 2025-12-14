import React, { useState } from "react";
import { repo } from "./ch/planrepo";
import { endOfWeek, addWeeks, isAfter } from "date-fns";
import { RacePlan } from "./ch/dategrid";
import { build, swap, swapDow } from "./ch/planbuilder";
import { CalendarGrid } from "./components/CalendarGrid";
import { toIcal } from "./ch/icalservice";
import { toCsv } from "./ch/csvService";
import { download } from "./ch/downloadservice";
import PlanAndDate from "./components/PlanAndDate";
import UndoButton from "./components/UndoButton";
import PacesPanel from "./components/PacesPanel";
import history from "./defy/history";
import {
  useQueryParams,
  StringParam,
  DateParam,
  NumberParam,
} from "use-query-params";
import { PlanDetailsCard } from "./components/PlanDetailsCard";
import { WeekStartsOn, WeekStartsOnValues } from "./ch/datecalc";
import { useMountEffect } from "./ch/hooks";
import { Units, PlanSummary, dayOfWeek } from "types/app";
import { getLocaleUnits } from "./ch/localize";
import { storageService } from "./ch/storageService";

const App = () => {
  const [{ u, p, d, s }, setq] = useQueryParams({
    u: StringParam,
    p: StringParam,
    d: DateParam,
    s: NumberParam,
  });
  const [currentUser, setCurrentUser] = useState<"aaron" | "kristin">(
    (storageService.getCurrentUser() as "aaron" | "kristin") || "aaron"
  );
  const [selectedUnits, setSelectedUnits] = useState<Units>(
    u === "mi" || u === "km" ? u : getLocaleUnits(),
  );
  var [selectedPlan, setSelectedPlan] = useState(repo.find(p || ""));
  var [racePlan, setRacePlan] = useState<RacePlan | undefined>(undefined);
  var [undoHistory, setUndoHistory] = useState([] as RacePlan[]);
  var [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(
    s === 0 || s === 1 || s === 6 ? s : WeekStartsOnValues.Monday,
  );
  var [planEndDate, setPlanEndDate] = useState(
    d && isAfter(d, new Date())
      ? d
      : addWeeks(endOfWeek(new Date(), { weekStartsOn: weekStartsOn }), 20),
  );

  useMountEffect(() => {
    // Try to load saved state for the current user first
    const savedState = storageService.loadCalendarState(currentUser);
    if (savedState && savedState.racePlan) {
      // Restore from saved state
      setSelectedPlan(savedState.selectedPlan || repo.find(p || ""));
      setPlanEndDate(savedState.planEndDate || addWeeks(endOfWeek(new Date(), { weekStartsOn: weekStartsOn }), 20));
      setSelectedUnits(savedState.selectedUnits || (u === "mi" || u === "km" ? u : getLocaleUnits()));
      setWeekStartsOn(savedState.weekStartsOn || (s === 0 || s === 1 || s === 6 ? s : WeekStartsOnValues.Monday));
      setRacePlan(savedState.racePlan);
      setUndoHistory(savedState.undoHistory || []);
    } else {
      // Load normally
      initialLoad(selectedPlan, planEndDate, selectedUnits, weekStartsOn);
    }
  });

  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    // listen for changes to the URL and force the app to re-render
    history.listen(() => {
      forceUpdate();
    });
  }, []);

  const getParams = (
    units: Units,
    plan: PlanSummary,
    date: Date,
    weekStartsOn: WeekStartsOn,
  ) => {
    return {
      u: units,
      p: plan.id,
      d: date,
      s: weekStartsOn,
    };
  };

  const saveState = (
    plan: PlanSummary,
    date: Date,
    units: Units,
    weekStartsOn: WeekStartsOn,
    racePlan: RacePlan | undefined,
    undoHistory: RacePlan[],
  ) => {
    if (racePlan) {
      storageService.saveCalendarState(currentUser, {
        selectedPlan: plan,
        planEndDate: date,
        selectedUnits: units,
        weekStartsOn: weekStartsOn,
        racePlan: racePlan,
        undoHistory: undoHistory,
      });
    }
  };

  const initialLoad = async (
    plan: PlanSummary,
    endDate: Date,
    units: Units,
    weekStartsOn: WeekStartsOn,
  ) => {
    const racePlan = build(await repo.fetch(plan), endDate, weekStartsOn);
    setRacePlan(racePlan);
    setUndoHistory([...undoHistory, racePlan]);
    setq(getParams(units, plan, endDate, weekStartsOn));
    saveState(plan, endDate, units, weekStartsOn, racePlan, [racePlan]);
  };

  const onSelectedPlanChange = async (plan: PlanSummary) => {
    const racePlan = build(await repo.fetch(plan), planEndDate, weekStartsOn);
    setSelectedPlan(plan);
    setRacePlan(racePlan);
    setUndoHistory([racePlan]);
    setq(getParams(selectedUnits, plan, planEndDate, weekStartsOn));
    saveState(plan, planEndDate, selectedUnits, weekStartsOn, racePlan, [racePlan]);
  };

  const onSelectedEndDateChange = async (date: Date) => {
    const racePlan = build(await repo.fetch(selectedPlan), date, weekStartsOn);
    setPlanEndDate(date);
    setRacePlan(racePlan);
    setUndoHistory([racePlan]);
    setq(getParams(selectedUnits, selectedPlan, date, weekStartsOn));
    saveState(selectedPlan, date, selectedUnits, weekStartsOn, racePlan, [racePlan]);
  };

  const onSelectedUnitsChanged = (u: Units) => {
    setSelectedUnits(u);
    setq(getParams(u, selectedPlan, planEndDate, weekStartsOn));
    saveState(selectedPlan, planEndDate, u, weekStartsOn, racePlan, undoHistory);
  };

  const onWeekStartsOnChanged = async (v: WeekStartsOn) => {
    const racePlan = build(await repo.fetch(selectedPlan), planEndDate, v);
    setWeekStartsOn(v);
    setRacePlan(racePlan);
    setUndoHistory([racePlan]);
    setq(getParams(selectedUnits, selectedPlan, planEndDate, v));
    saveState(selectedPlan, planEndDate, selectedUnits, v, racePlan, [racePlan]);
  };

  function swapDates(d1: Date, d2: Date): void {
    if (racePlan) {
      const newRacePlan = swap(racePlan, d1, d2);
      setRacePlan(newRacePlan);
      const newHistory = [...undoHistory, newRacePlan];
      setUndoHistory(newHistory);
      saveState(selectedPlan, planEndDate, selectedUnits, weekStartsOn, newRacePlan, newHistory);
    }
  }

  function doSwapDow(dow1: dayOfWeek, dow2: dayOfWeek) {
    if (racePlan) {
      const newRacePlan = swapDow(racePlan, dow1, dow2);
      setRacePlan(newRacePlan);
      const newHistory = [...undoHistory, newRacePlan];
      setUndoHistory(newHistory);
      saveState(selectedPlan, planEndDate, selectedUnits, weekStartsOn, newRacePlan, newHistory);
    }
  }

  function downloadIcalHandler() {
    if (racePlan) {
      const eventsStr = toIcal(racePlan, selectedUnits);
      if (eventsStr) {
        download(eventsStr, "plan", "ics");
      }
    }
  }

  function downloadCsvHandler() {
    if (racePlan) {
      const eventsStr = toCsv(racePlan, selectedUnits, weekStartsOn);
      if (eventsStr) {
        download(eventsStr, "plan", "csv");
      }
    }
  }

  function undoHandler() {
    if (undoHistory?.length >= 0) {
      undoHistory.pop();
    }
    const newPlan = undoHistory[undoHistory.length - 1];
    setRacePlan(newPlan);
    saveState(selectedPlan, planEndDate, selectedUnits, weekStartsOn, newPlan, undoHistory);
  }

  const handleUserChange = async (user: "aaron" | "kristin") => {
    setCurrentUser(user);
    storageService.setCurrentUser(user);
    
    // Try to load saved state for the new user
    const savedState = storageService.loadCalendarState(user);
    if (savedState && savedState.racePlan) {
      setSelectedPlan(savedState.selectedPlan || repo.find(""));
      setPlanEndDate(savedState.planEndDate || addWeeks(endOfWeek(new Date(), { weekStartsOn: weekStartsOn }), 20));
      setSelectedUnits(savedState.selectedUnits || getLocaleUnits());
      setWeekStartsOn(savedState.weekStartsOn || WeekStartsOnValues.Monday);
      setRacePlan(savedState.racePlan);
      setUndoHistory(savedState.undoHistory || []);
    } else {
      // Initialize with default state
      const newPlan = repo.find("");
      const newEndDate = addWeeks(endOfWeek(new Date(), { weekStartsOn: WeekStartsOnValues.Monday }), 20);
      const newUnits = getLocaleUnits();
      const newWeekStartsOn = WeekStartsOnValues.Monday;
      
      const builtPlan = build(await repo.fetch(newPlan), newEndDate, newWeekStartsOn);
      setSelectedPlan(newPlan);
      setPlanEndDate(newEndDate);
      setSelectedUnits(newUnits);
      setWeekStartsOn(newWeekStartsOn);
      setRacePlan(builtPlan);
      setUndoHistory([builtPlan]);
      saveState(newPlan, newEndDate, newUnits, newWeekStartsOn, builtPlan, [builtPlan]);
    }
  };

  return (
    <>
      <PlanAndDate
        availablePlans={repo.available}
        selectedPlan={selectedPlan}
        selectedDate={planEndDate}
        dateChangeHandler={onSelectedEndDateChange}
        selectedPlanChangeHandler={onSelectedPlanChange}
        weekStartsOn={weekStartsOn}
        weekStartsOnChangeHandler={onWeekStartsOnChanged}
        selectedUnits={selectedUnits}
        unitsChangeHandler={onSelectedUnitsChanged}
      />
      <PlanDetailsCard racePlan={racePlan} />
      <PacesPanel onUserChange={handleUserChange} />
      <div className="second-toolbar">
        <button className="app-button" onClick={downloadIcalHandler}>Download iCal</button>
        <button className="app-button" onClick={downloadCsvHandler}>Download CSV</button>
        <UndoButton
          disabled={undoHistory.length <= 1}
          undoHandler={undoHandler}
        />
      </div>
      <div className="main-ui">
        {racePlan && (
          <CalendarGrid
            racePlan={racePlan}
            units={selectedUnits}
            weekStartsOn={weekStartsOn}
            swapDates={swapDates}
            swapDow={doSwapDow}
          />
        )}
      </div>
    </>
  );
};

export default App;
