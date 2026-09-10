import { useState } from "react";
import { clearToken, getToken } from "./api";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));

  function handleLogout() {
    clearToken();
    setAuthed(false);
  }

  if (!authed) {
    return <Login onLoggedIn={() => setAuthed(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
