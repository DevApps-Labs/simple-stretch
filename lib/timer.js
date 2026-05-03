export function buildQueue(routine) {
  const queue = [];
  const stretches = routine.stretches;

  for (let i = 0; i < stretches.length; i++) {
    const stretch = stretches[i];
    const nextExerciseName = stretches[i + 1]?.name ?? null;

    if (stretch.transitionTime > 0) {
      queue.push({
        type: "transition",
        stretchName: stretch.name,
        duration: stretch.transitionTime,
        nextStretchName: null,
      });
    }

    if (stretch.switchSides) {
      const half = Math.floor(stretch.duration / 2);
      queue.push({
        type: "stretch_first",
        stretchName: stretch.name,
        duration: half,
        nextStretchName: null,
      });
      queue.push({
        type: "side_switch",
        stretchName: stretch.name,
        duration: 5,
        nextStretchName: null,
      });
      queue.push({
        type: "stretch_second",
        stretchName: stretch.name,
        duration: stretch.duration - half,
        nextStretchName: nextExerciseName,
      });
    } else {
      queue.push({
        type: "stretch_full",
        stretchName: stretch.name,
        duration: stretch.duration,
        nextStretchName: nextExerciseName,
      });
    }
  }

  return queue;
}

export function getPhaseLabel(item) {
  switch (item.type) {
    case "transition":
      return "Get ready";
    case "stretch_first":
      return "First side";
    case "side_switch":
      return "Switch sides";
    case "stretch_second":
      return "Second side";
    default:
      return "";
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function totalRoutineSeconds(routine) {
  return routine.stretches.reduce(
    (sum, s) => sum + s.duration + s.transitionTime + (s.switchSides ? 5 : 0),
    0
  );
}
