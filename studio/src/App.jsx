import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar.jsx";
import { AltaPage } from "./pages/AltaPage.jsx";
import { FaqPage } from "./pages/FaqPage.jsx";
import { LandingEditor } from "./pages/LandingEditor.jsx";
import { LandingList } from "./pages/LandingList.jsx";
import { TermsPage } from "./pages/TermsPage.jsx";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/landings" replace />} />
        <Route element={<Sidebar />}>
          <Route path="/landings" element={<LandingList />} />
          <Route path="/landings/:slug" element={<LandingEditor />} />
          <Route path="/landings/:slug/preguntas" element={<FaqPage />} />
          <Route path="/landings/:slug/terminos" element={<TermsPage />} />
          <Route path="/alta" element={<AltaPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/landings" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
