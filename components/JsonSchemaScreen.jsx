"use client";
import { useState } from "react";

const SCHEMA_TEXT = `{
  "version": 1,              // Always 1
  "library": [               // Reusable exercise definitions
    {
      "id": "string",        // Unique ID (any string)
      "name": "string"       // Exercise display name
    }
  ],
  "routines": [
    {
      "id": "string",        // Unique ID
      "name": "string",      // Routine display name
      "createdAt": 0,        // Unix timestamp in ms (Date.now())
      "stretches": [
        {
          "id": "string",              // Unique ID
          "libraryId": "string",       // Must match a library[].id
          "name": "string",            // Display name
          "exerciseType": "timed",     // "timed" | "reps" | "rep_hold"
          "duration": 30,             // [timed] Hold time in seconds
          "reps": 10,                 // [reps, rep_hold] Number of reps
          "holdPerRep": 8,            // [rep_hold] Seconds to hold each rep
          "instructions": "string",   // [reps, rep_hold] Optional reminder text
          "gifUrl": "string",         // Optional GIF/image URL shown during exercise
          "switchSides": true,        // If true, repeat on each side separately
          "transitionTime": 5         // Prep seconds before exercise starts
        }
      ]
    }
  ]
}`;

const EXAMPLE_TEXT = `{
  "version": 1,
  "library": [
    { "id": "lib1", "name": "Hamstring Stretch" },
    { "id": "lib2", "name": "Hip Flexor" },
    { "id": "lib3", "name": "Shoulder Roll" }
  ],
  "routines": [
    {
      "id": "r1",
      "name": "Morning Routine",
      "createdAt": 1716000000000,
      "stretches": [
        {
          "id": "s1",
          "libraryId": "lib1",
          "name": "Hamstring Stretch",
          "exerciseType": "timed",
          "duration": 30,
          "switchSides": true,
          "transitionTime": 5
        },
        {
          "id": "s2",
          "libraryId": "lib2",
          "name": "Hip Flexor",
          "exerciseType": "timed",
          "duration": 45,
          "switchSides": true,
          "transitionTime": 5
        },
        {
          "id": "s3",
          "libraryId": "lib3",
          "name": "Shoulder Roll",
          "exerciseType": "timed",
          "duration": 20,
          "switchSides": false,
          "transitionTime": 3
        }
      ]
    }
  ]
}`;

const LIMBER11_TEXT = `{
  "version": 1,
  "library": [
    { "id": "l1", "name": "Foam Roll IT Band" },
    { "id": "l2", "name": "Foam Roll Adductors" },
    { "id": "l3", "name": "Lacrosse Ball Glutes" },
    { "id": "l4", "name": "Bent-Knee Iron Crosses" },
    { "id": "l5", "name": "Rollovers into V-Sits" },
    { "id": "l6", "name": "Rocking Frog Stretch" },
    { "id": "l7", "name": "Fire Hydrant Circles" },
    { "id": "l8", "name": "Mountain Climbers" },
    { "id": "l9", "name": "Cossack Squats" },
    { "id": "l10", "name": "Seated Piriformis Stretch" },
    { "id": "l11", "name": "RFE Hip Flexor Stretch" }
  ],
  "routines": [
    {
      "id": "r-limber11",
      "name": "Limber 11",
      "createdAt": 1716100000000,
      "stretches": [
        {
          "id": "s-l1", "libraryId": "l1", "name": "Foam Roll IT Band",
          "exerciseType": "reps", "reps": 12,
          "instructions": "Slow passes along the outer thigh",
          "gifUrl": "https://i.imgur.com/Kqdnf7r.gif",
          "switchSides": true, "transitionTime": 5
        },
        {
          "id": "s-l2", "libraryId": "l2", "name": "Foam Roll Adductors",
          "exerciseType": "reps", "reps": 12,
          "instructions": "Roll inner thigh from hip to knee",
          "gifUrl": "https://i.imgur.com/kC5YQWJ.gif",
          "switchSides": true, "transitionTime": 5
        },
        {
          "id": "s-l3", "libraryId": "l3", "name": "Lacrosse Ball Glutes",
          "exerciseType": "timed", "duration": 60,
          "gifUrl": "https://i.imgur.com/oJOi6t8.gif",
          "switchSides": true, "transitionTime": 5
        },
        {
          "id": "s-l4", "libraryId": "l4", "name": "Bent-Knee Iron Crosses",
          "exerciseType": "reps", "reps": 15,
          "instructions": "Knees sweep left and right, shoulders stay flat",
          "gifUrl": "https://i.imgur.com/tRZxRZ7.gif",
          "switchSides": false, "transitionTime": 5
        },
        {
          "id": "s-l5", "libraryId": "l5", "name": "Rollovers into V-Sits",
          "exerciseType": "reps", "reps": 10,
          "instructions": "Roll back over hips, then forward into V-sit",
          "gifUrl": "https://i.imgur.com/KduHp43.gif",
          "switchSides": false, "transitionTime": 5
        },
        {
          "id": "s-l6", "libraryId": "l6", "name": "Rocking Frog Stretch",
          "exerciseType": "reps", "reps": 10,
          "instructions": "Knees wide, rock forward into frog and back",
          "gifUrl": "https://i.imgur.com/OsX8ztP.gif",
          "switchSides": false, "transitionTime": 5
        },
        {
          "id": "s-l7", "libraryId": "l7", "name": "Fire Hydrant Circles",
          "exerciseType": "reps", "reps": 20,
          "instructions": "10 circles forward + 10 backward per leg",
          "gifUrl": "https://i.imgur.com/E6j7Bov.gif",
          "switchSides": true, "transitionTime": 5
        },
        {
          "id": "s-l8", "libraryId": "l8", "name": "Mountain Climbers",
          "exerciseType": "reps", "reps": 20,
          "instructions": "Drive each knee to chest, 10 reps per leg",
          "gifUrl": "https://i.imgur.com/1hgnQwi.gif",
          "switchSides": false, "transitionTime": 5
        },
        {
          "id": "s-l9", "libraryId": "l9", "name": "Cossack Squats",
          "exerciseType": "reps", "reps": 8,
          "instructions": "Lateral squat, alternating sides each rep",
          "gifUrl": "https://i.imgur.com/QhVGZ8Y.gif",
          "switchSides": false, "transitionTime": 5
        },
        {
          "id": "s-l10", "libraryId": "l10", "name": "Seated Piriformis Stretch",
          "exerciseType": "timed", "duration": 30,
          "gifUrl": "https://i.imgur.com/gG3Kpy4.gif",
          "switchSides": true, "transitionTime": 5
        },
        {
          "id": "s-l11", "libraryId": "l11", "name": "RFE Hip Flexor Stretch",
          "exerciseType": "rep_hold", "reps": 7, "holdPerRep": 3,
          "instructions": "Rear foot elevated, drive hips forward",
          "gifUrl": "https://i.imgur.com/WdqxaWd.gif",
          "switchSides": true, "transitionTime": 5
        }
      ]
    }
  ]
}`;

const MCGILL_TEXT = `{
  "version": 1,
  "library": [
    { "id": "m-curl", "name": "Modified Curl-Up" },
    { "id": "m-side", "name": "Side Plank" },
    { "id": "m-bird", "name": "Bird Dog" }
  ],
  "routines": [
    {
      "id": "r-mcgill",
      "name": "McGill Big Three",
      "createdAt": 1716200000000,
      "stretches": [
        {
          "id": "s-curl-5", "libraryId": "m-curl", "name": "Modified Curl-Up",
          "exerciseType": "rep_hold", "reps": 5, "holdPerRep": 8,
          "instructions": "Hands under lower back, lift head a few inches — no crunching",
          "switchSides": false, "transitionTime": 5
        },
        {
          "id": "s-curl-3", "libraryId": "m-curl", "name": "Modified Curl-Up",
          "exerciseType": "rep_hold", "reps": 3, "holdPerRep": 8,
          "instructions": "Switch which knee is bent from the previous set",
          "switchSides": false, "transitionTime": 10
        },
        {
          "id": "s-curl-1", "libraryId": "m-curl", "name": "Modified Curl-Up",
          "exerciseType": "rep_hold", "reps": 1, "holdPerRep": 8,
          "switchSides": false, "transitionTime": 10
        },
        {
          "id": "s-side-5", "libraryId": "m-side", "name": "Side Plank",
          "exerciseType": "rep_hold", "reps": 5, "holdPerRep": 8,
          "switchSides": true, "transitionTime": 10
        },
        {
          "id": "s-side-3", "libraryId": "m-side", "name": "Side Plank",
          "exerciseType": "rep_hold", "reps": 3, "holdPerRep": 8,
          "switchSides": true, "transitionTime": 10
        },
        {
          "id": "s-side-1", "libraryId": "m-side", "name": "Side Plank",
          "exerciseType": "rep_hold", "reps": 1, "holdPerRep": 8,
          "switchSides": true, "transitionTime": 10
        },
        {
          "id": "s-bird-5", "libraryId": "m-bird", "name": "Bird Dog",
          "exerciseType": "rep_hold", "reps": 5, "holdPerRep": 8,
          "instructions": "Extend opposite arm and leg, hold flat and stable",
          "switchSides": true, "transitionTime": 10
        },
        {
          "id": "s-bird-3", "libraryId": "m-bird", "name": "Bird Dog",
          "exerciseType": "rep_hold", "reps": 3, "holdPerRep": 8,
          "switchSides": true, "transitionTime": 10
        },
        {
          "id": "s-bird-1", "libraryId": "m-bird", "name": "Bird Dog",
          "exerciseType": "rep_hold", "reps": 1, "holdPerRep": 8,
          "switchSides": true, "transitionTime": 10
        }
      ]
    }
  ]
}`;

const AI_PROMPT_TEXT = `You are helping me build a stretch/exercise routine for the Simple Stretch app. The app imports JSON in this exact format:

{
  "version": 1,
  "library": [
    { "id": "<unique-string>", "name": "<exercise name>" }
  ],
  "routines": [
    {
      "id": "<unique-string>",
      "name": "<routine name>",
      "createdAt": <unix timestamp ms>,
      "stretches": [
        {
          "id": "<unique-string>",
          "libraryId": "<matches a library entry id>",
          "name": "<display name>",
          "exerciseType": "<timed|reps|rep_hold>",
          "duration": <seconds>,          // timed only
          "reps": <count>,                // reps and rep_hold
          "holdPerRep": <seconds>,        // rep_hold only
          "instructions": "<reminder>",  // optional for reps/rep_hold
          "gifUrl": "<url>",             // optional GIF shown during exercise
          "switchSides": <true|false>,
          "transitionTime": <prep seconds>
        }
      ]
    }
  ]
}

Exercise types:
- "timed": single countdown timer (e.g. hold a stretch for 30s)
- "reps": user-paced rep counter with a tap-to-count button (e.g. 12 foam rolling passes)
- "rep_hold": each rep has its own countdown (e.g. 5 reps × 8s hold — the McGill Big Three pattern)

Please guide me through creating a routine step by step:

1. Ask me what I want to name this routine.
2. Ask me what exercises I want to include — take them one at a time. Suggest common options if I'm unsure.
3. For each exercise, ask:
   a. What type: timed hold, rep-based (user taps to count), or rep × hold (countdown per rep)
   b. The relevant numbers: duration (timed), rep count (reps/rep_hold), hold per rep (rep_hold)
   c. Any instructions or reminder text to show on screen during the exercise
   d. Does it switch sides? (left/right — the app will cue each side separately)
   e. Transition/prep time before the exercise starts (typically 3–10s)
4. After collecting all exercises, ask: "Would you like me to find demo GIFs for these exercises? I can search for animated GIFs showing proper form and include them in the JSON so they display during each exercise in the app."
   - If yes: search the web for each exercise and find a direct GIF URL (preferably from i.imgur.com or a CDN). Include "gifUrl" on each stretch that has one.
   - If no: omit the gifUrl field entirely.
5. After all exercises are entered, show a summary and ask me to confirm.
6. Once confirmed, output the complete valid JSON ready to paste into Simple Stretch's Import JSON dialog.

Rules for the JSON output:
- Use short unique IDs (e.g. "r1", "lib1", "s1", etc.)
- Every exercise in the routine must have a matching library entry with the same libraryId
- Use a realistic createdAt value (13-digit Unix ms timestamp, e.g. 1716000000000)
- For the McGill Big Three pyramid (5→3→1), create each set as a separate routine entry — the instructions field can remind the user which set it is
- gifUrl must be a direct URL to a GIF or image (ends in .gif, .webp, .jpg, etc.) — not a page URL

Start now: ask me what I'd like to name my routine.`;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-sm text-teal-400 active:text-teal-300 font-medium flex-shrink-0"
    >
      {copied ? (
        "Copied!"
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function Section({ title, subtitle, text, codeBlock }) {
  return (
    <div className="bg-neutral-900 rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3 border-b border-neutral-800">
        <div>
          <h2 className="font-semibold text-white text-sm">{title}</h2>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <CopyButton text={text} />
      </div>
      {codeBlock ? (
        <pre className="p-4 text-xs text-neutral-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
          {text}
        </pre>
      ) : (
        <p className="px-4 py-3 text-sm text-neutral-400 leading-relaxed">
          {text}
        </p>
      )}
    </div>
  );
}

export default function JsonSchemaScreen({ goBack }) {
  return (
    <div
      className="flex flex-col min-h-screen bg-neutral-950"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-neutral-800 flex-shrink-0">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center text-neutral-400 active:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">
            JSON Schema Reference
          </h1>
          <p className="text-xs text-neutral-500">
            Structure for importing &amp; exporting routines
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Section
          title="Schema Structure"
          subtitle="Field types and descriptions — not valid JSON (has comments)"
          text={SCHEMA_TEXT}
          codeBlock
        />

        <Section
          title="Example: Basic Routine"
          subtitle="Timed holds — a complete valid file you can import"
          text={EXAMPLE_TEXT}
          codeBlock
        />

        <Section
          title="Example: Limber 11"
          subtitle="Mix of timed, rep-based, and rep×hold exercise types"
          text={LIMBER11_TEXT}
          codeBlock
        />

        <Section
          title="Example: McGill Big Three"
          subtitle="5→3→1 pyramid using rep×hold — each set is a separate entry"
          text={MCGILL_TEXT}
          codeBlock
        />

        <div className="bg-neutral-900 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800">
            <h2 className="font-semibold text-white text-sm">Create with AI</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Paste this prompt into Claude or any AI assistant
            </p>
          </div>
          <div className="px-4 py-3 space-y-3">
            <p className="text-sm text-neutral-400 leading-relaxed">
              The AI will walk you through your routine exercise by exercise — asking
              for names, type (timed / rep-based / rep×hold), durations, instructions,
              side-switching, and transition times — then confirm and output valid JSON
              ready to import.
            </p>
            <CopyButton text={AI_PROMPT_TEXT} />
          </div>
        </div>

        <div className="pb-2" />
      </div>
    </div>
  );
}
