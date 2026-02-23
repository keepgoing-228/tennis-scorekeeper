import { HashRouter, Routes, Route, Navigate } from "react-router";
import NewMatch from "./ui/pages/NewMatch.tsx";
import Scoring from "./ui/pages/Scoring.tsx";
import MatchHistory from "./ui/pages/MatchHistory.tsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<NewMatch />} />
        <Route path="/match/:id" element={<Scoring />} />
        <Route path="/history" element={<MatchHistory />} />
      </Routes>
    </HashRouter>
  );
}
