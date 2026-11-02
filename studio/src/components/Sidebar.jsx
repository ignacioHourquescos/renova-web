import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getSite, publishSite } from "../api.js";
import { PublishModal } from "./PublishModal.jsx";
import { Spinner } from "./Spinner.jsx";

export function Sidebar() {
  const [landings, setLandings] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishAsk, setPublishAsk] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [publishError, setPublishError] = useState("");
  const [listVersion, setListVersion] = useState(0);
  const publishingRef = useRef(false);
  const reloadLandings = useCallback(() => setListVersion((version) => version + 1), []);

  useEffect(() => {
    let active = true;
    getSite()
      .then((data) => {
        if (active) setLandings(data.landings);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [listVersion]);

  function onPublish() {
    if (publishingRef.current) return;
    setPublishError("");
    setPublishAsk(true);
  }

  function closePublish() {
    if (publishingRef.current) return;
    setPublishAsk(false);
  }

  async function confirmPublish() {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    setPublishNote("");
    setPublishError("");
    try {
      const result = await publishSite();
      setPublishNote(result.message || "Publicado");
      setPublishAsk(false);
    } catch (error) {
      setPublishError(error.message);
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="topbar__nav" aria-label="Páginas">
          <NavLink
            to="/landings"
            className="topbar__item topbar__item--home"
            end
            aria-label="Páginas"
            title="Páginas"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10.5 12 3l9 7.5M5.5 8.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V8.5"
              />
            </svg>
          </NavLink>
          <div className="topbar__links">
            {landings.map((landing) => (
              <NavLink
                key={landing.slug}
                className="topbar__item"
                to={`/landings/${landing.slug}`}
                title={landing.slug}
              >
                {landing.slug}
              </NavLink>
            ))}
            <NavLink className="topbar__item topbar__item--alta" to="/alta" title="Alta de cliente">
              Alta
            </NavLink>
          </div>
          <div className="topbar__foot">
            <button
              type="button"
              className={publishing ? "topbar__publish topbar__publish--busy" : "topbar__publish"}
              onClick={onPublish}
              disabled={publishing}
            >
              {publishing ? <Spinner /> : null}
              {publishing ? "Publicando" : "Publicar"}
            </button>
            {publishNote ? (
              <p className="topbar__note" role="status">
                {publishNote}
              </p>
            ) : null}
          </div>
        </nav>
      </header>
      <div className="app-main">
        <Outlet context={{ reloadLandings }} />
      </div>
      {publishAsk ? (
        <PublishModal
          busy={publishing}
          error={publishError}
          onConfirm={confirmPublish}
          onClose={closePublish}
        />
      ) : null}
    </div>
  );
}
