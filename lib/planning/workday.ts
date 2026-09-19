export const workdayStart = 9 * 60;
export const workdayEnd = 18 * 60;
export const lunchStart = 12 * 60;
export const lunchEnd = 13 * 60;
export const estimatedTravelMinutes = 15;

/** Returns the first workable time, keeping a one-hour midday break free. */
export const nextWorkableStart = (availableMinutes: number, durationMinutes: number) => {
  let start = Math.max(workdayStart, availableMinutes);
  if (start < lunchEnd && start + durationMinutes > lunchStart) start = lunchEnd;
  return start;
};

export const hasRoomForVisit = (startMinutes: number, durationMinutes: number) => startMinutes + durationMinutes <= workdayEnd;

/** Travel may never consume the fixed lunch break. */
export const travelStartAfterVisit = (visitEndMinutes: number, travelMinutes = estimatedTravelMinutes) => {
  const start = Math.max(workdayStart, visitEndMinutes);
  if (start >= lunchStart && start < lunchEnd) return lunchEnd;
  if (start < lunchStart && start + travelMinutes > lunchStart) return lunchEnd;
  return start;
};

export const nextAvailableAfterVisit = (visitStartMinutes: number, durationMinutes: number, travelMinutes = estimatedTravelMinutes) => {
  const travelStart = travelStartAfterVisit(visitStartMinutes + durationMinutes, travelMinutes);
  return travelStart + travelMinutes;
};
