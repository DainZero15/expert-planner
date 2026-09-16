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
