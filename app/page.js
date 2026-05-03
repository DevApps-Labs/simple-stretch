"use client";
import { useState } from "react";
import HomeScreen from "@/components/HomeScreen";
import RoutineEditScreen from "@/components/RoutineEditScreen";
import StretchConfigScreen from "@/components/StretchConfigScreen";
import SessionScreen from "@/components/SessionScreen";

export default function App() {
  const [stack, setStack] = useState([{ screen: "home", params: {} }]);
  const current = stack[stack.length - 1];

  function navigate(screen, params = {}) {
    setStack((s) => [...s, { screen, params }]);
  }

  function goBack() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  const props = { navigate, goBack, params: current.params };

  switch (current.screen) {
    case "home":
      return <HomeScreen {...props} />;
    case "routine-edit":
      return <RoutineEditScreen {...props} />;
    case "stretch-config":
      return <StretchConfigScreen {...props} />;
    case "session":
      return <SessionScreen {...props} />;
    default:
      return <HomeScreen {...props} />;
  }
}
