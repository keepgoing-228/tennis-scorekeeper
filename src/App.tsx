import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import NewMatch from "./ui/pages/NewMatch.tsx";
import Scoring from "./ui/pages/Scoring.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<NewMatch />} />
        <Route path="/match/:id" element={<Scoring />} />
      </Routes>
    </BrowserRouter>
  );
}
