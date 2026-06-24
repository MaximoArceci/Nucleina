import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { lazy, Suspense, useState, useEffect } from "react";

import Login from "views/pages/authentication/authentication3/Login3";
import Navbar from "menu-items/Navigation";
import UsersAreasManagement from "views/application/crm/ContactManagement/ContactList/index";
import { useAuth } from "contexts/Auth0Context"; // Asegurate que esté retornando: { id, role, loading, isAuthenticated }
import Landing from "views/pages/Landing/pages/Landing";

// Lazy load components
const Calendar = lazy(() => import("views/application/calendar/index"));
const Kanban = lazy(() => import("views/application/kanban/index"));
const Docs = lazy(() => import("views/application/docs/index"));
const Sheets = lazy(() => import("views/application/sheets/index"));
const Availability = lazy(() => import("views/application/availability/index"));
const Contacts = lazy(() => import("views/application/contacts/index"));
const Loader = lazy(() => import("ui-component/Loader"));
const Header = lazy(() => import("ui-component/Header"));
import Detas from "views/pages/Landing/pages/components/Detas"
import Terms from "views/pages/Landing/pages/components/Terms"

const AppRouter = () => {
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const { isLoading, isProcessingAuth, isAuthenticated } = useAuth();
  const toggleNavbar = () => setIsNavbarVisible((prev) => !prev);

  
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 500);
  }, [isNavbarVisible]);
  // 🔎 Detecta si vienen params de auth (ajusta si tu backend manda otros)
  const search = new URLSearchParams(location.search);
  const hasAuthParams =
    !!search.get("email") || !!search.get("name") || !!search.get("picture");

  // Mientras esté procesando auth o haya params de auth, bloqueo todo con Loader
  console.log(isProcessingAuth);
  if (isLoading || isProcessingAuth) return <Loader />;

  // 🔐 Si no está autenticado, redirige todo excepto /login y /
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/politica" element={<Detas />} />
        <Route path="/terminos" element={<Terms />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
      <Route path="/politica" element={<Detas />} />
      <Route path="/terminos" element={<Terms />} />
        <Route path="/" element={<Landing />} />
        <Route
          path="/*"
          element={
            <>
              <Header toggleNavbar={toggleNavbar} />
              <div className="app-container min-h-screen bg-primary flex">
                <div className={`sidebar ${isNavbarVisible ? "" : ""} rounded-xl`}>
                  <Navbar toggleNavbar={isNavbarVisible} />
                </div>

                <div
                  className={`content ${isNavbarVisible ? "expanded" : "collapsed"} 
                    p-6 rounded-tl-xl transition-all duration-300 flex-1 pt-10`}
                >
                  <Routes>
                    <Route path="/home" element={<Calendar />} />
                    <Route path="/kanban" element={<Kanban />} />
                    <Route path="/docs" element={<Docs />} />
                    <Route path="/sheets" element={<Sheets />} />
                    <Route path="/availability" element={<Availability />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/usuarios" element={<UsersAreasManagement />} />
                    <Route path="/areas" element={<UsersAreasManagement />} />
                    <Route path="/terapeuta" element={<Navigate to="/usuarios" replace />} />
                    <Route path="/candidato" element={<Navigate to="/usuarios" replace />} />
                    <Route path="/paciente" element={<Navigate to="/usuarios" replace />} />
                    <Route path="*" element={<Navigate to="/home" replace />} />
                  </Routes>
                </div>
              </div>
            </>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
