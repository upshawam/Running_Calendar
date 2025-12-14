import { RacePlan } from "./dategrid";
import { Units, PlanSummary } from "types/app";
import { WeekStartsOn } from "./datecalc";

export interface CalendarState {
  racePlan: RacePlan;
  selectedPlan: PlanSummary;
  planEndDate: Date;
  selectedUnits: Units;
  weekStartsOn: WeekStartsOn;
  undoHistory: RacePlan[];
}

const STORAGE_PREFIX = "calendar_";

export const storageService = {
  /**
   * Save calendar state for a specific user
   */
  saveCalendarState(user: string, state: Partial<CalendarState>): void {
    const key = `${STORAGE_PREFIX}${user}`;
    try {
      // Convert dates to ISO strings for JSON serialization
      const serializable = {
        ...state,
        planEndDate: state.planEndDate?.toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(serializable));
    } catch (error) {
      console.error(`Failed to save calendar state for ${user}:`, error);
    }
  },

  /**
   * Load calendar state for a specific user
   */
  loadCalendarState(user: string): Partial<CalendarState> | null {
    const key = `${STORAGE_PREFIX}${user}`;
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;

      const parsed = JSON.parse(data);
      
      // Convert ISO strings back to dates
      if (parsed.planEndDate) {
        parsed.planEndDate = new Date(parsed.planEndDate);
      }

      return parsed;
    } catch (error) {
      console.error(`Failed to load calendar state for ${user}:`, error);
      return null;
    }
  },

  /**
   * Clear calendar state for a specific user
   */
  clearCalendarState(user: string): void {
    const key = `${STORAGE_PREFIX}${user}`;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to clear calendar state for ${user}:`, error);
    }
  },

  /**
   * Save the currently selected user
   */
  setCurrentUser(user: string): void {
    try {
      localStorage.setItem("current_calendar_user", user);
    } catch (error) {
      console.error("Failed to save current user:", error);
    }
  },

  /**
   * Get the currently selected user
   */
  getCurrentUser(): string {
    try {
      return localStorage.getItem("current_calendar_user") || "aaron";
    } catch (error) {
      console.error("Failed to get current user:", error);
      return "aaron";
    }
  },
};
