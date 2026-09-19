export const workdayStart = 9 * 60;
export const workdayEnd = 18 * 60;
export const lunchEarliest = 11 * 60 + 30;
export const lunchLatest = 13 * 60;
export const lunchMinutes = 60;
export const estimatedTravelMinutes = 15;

/** Returns the first workable time; the planner inserts lunch dynamically. */
export const nextWorkableStart = (availableMinutes: number, durationMinutes: number) => {
  void durationMinutes;
  return Math.max(workdayStart, availableMinutes);
};

export const hasRoomForVisit = (startMinutes: number, durationMinutes: number) => startMinutes + durationMinutes <= workdayEnd;

/** Lunch is placed separately, so travel always starts immediately after a visit. */
export const travelStartAfterVisit = (visitEndMinutes: number) => {
  return Math.max(workdayStart, visitEndMinutes);
};

export const nextAvailableAfterVisit = (visitStartMinutes: number, durationMinutes: number, travelMinutes = estimatedTravelMinutes) => {
  const travelStart = travelStartAfterVisit(visitStartMinutes + durationMinutes);
  return travelStart + travelMinutes;
};
