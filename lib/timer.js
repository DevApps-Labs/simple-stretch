export function buildQueue(routine) {
  const queue = [];
  const stretches = routine.stretches;

  for (let i = 0; i < stretches.length; i++) {
    const stretch = stretches[i];
    const nextExerciseName = stretches[i + 1]?.name ?? null;
    const type = stretch.exerciseType ?? "timed";

    if (stretch.transitionTime > 0) {
      queue.push({
        type: "transition",
        stretchName: stretch.name,
        duration: stretch.transitionTime,
        nextStretchName: null,
      });
    }

    if (type === "reps") {
      if (stretch.switchSides) {
        queue.push({
          type: "reps",
          stretchName: stretch.name,
          reps: stretch.reps ?? 10,
          instructions: stretch.instructions ?? "",
          sideLabel: "First side",
          duration: 0,
          nextStretchName: null,
        });
        queue.push({
          type: "side_switch",
          stretchName: stretch.name,
          duration: 5,
          nextStretchName: null,
        });
        queue.push({
          type: "reps",
          stretchName: stretch.name,
          reps: stretch.reps ?? 10,
          instructions: stretch.instructions ?? "",
          sideLabel: "Second side",
          duration: 0,
          nextStretchName: nextExerciseName,
        });
      } else {
        queue.push({
          type: "reps",
          stretchName: stretch.name,
          reps: stretch.reps ?? 10,
          instructions: stretch.instructions ?? "",
          sideLabel: null,
          duration: 0,
          nextStretchName: nextExerciseName,
        });
      }
    } else if (type === "rep_hold") {
      const totalReps = stretch.reps ?? 5;
      const holdDur = stretch.holdPerRep ?? 8;

      if (stretch.switchSides) {
        for (let r = 0; r < totalReps; r++) {
          queue.push({
            type: "rep_hold",
            stretchName: stretch.name,
            repNum: r + 1,
            totalReps,
            sideLabel: "First side",
            duration: holdDur,
            nextStretchName: null,
          });
        }
        queue.push({
          type: "side_switch",
          stretchName: stretch.name,
          duration: 5,
          nextStretchName: null,
        });
        for (let r = 0; r < totalReps; r++) {
          queue.push({
            type: "rep_hold",
            stretchName: stretch.name,
            repNum: r + 1,
            totalReps,
            sideLabel: "Second side",
            duration: holdDur,
            nextStretchName: r === totalReps - 1 ? nextExerciseName : null,
          });
        }
      } else {
        for (let r = 0; r < totalReps; r++) {
          queue.push({
            type: "rep_hold",
            stretchName: stretch.name,
            repNum: r + 1,
            totalReps,
            sideLabel: null,
            duration: holdDur,
            nextStretchName: r === totalReps - 1 ? nextExerciseName : null,
          });
        }
      }
    } else {
      // timed (default)
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
    case "rep_hold":
      return item.sideLabel
        ? `${item.sideLabel} — Rep ${item.repNum} of ${item.totalReps}`
        : `Rep ${item.repNum} of ${item.totalReps}`;
    case "reps":
      return item.sideLabel ?? "";
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
  return routine.stretches.reduce((sum, s) => {
    const type = s.exerciseType ?? "timed";
    const sideSwitch = s.switchSides ? 5 : 0;
    const transition = s.transitionTime ?? 0;

    if (type === "reps") {
      return sum + transition + sideSwitch;
    } else if (type === "rep_hold") {
      const sides = s.switchSides ? 2 : 1;
      return sum + transition + (s.reps ?? 5) * (s.holdPerRep ?? 8) * sides + sideSwitch;
    } else {
      return sum + (s.duration ?? 0) + transition + sideSwitch;
    }
  }, 0);
}
