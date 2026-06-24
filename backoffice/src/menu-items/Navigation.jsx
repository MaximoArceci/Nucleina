import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

// Importando iconos de MUI
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import StorageIcon from "@mui/icons-material/Storage";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import ArticleIcon from "@mui/icons-material/Article";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ContactsIcon from "@mui/icons-material/Contacts";
import GridOnIcon from "@mui/icons-material/GridOn";

function Navbar({ toggleNavbar }) {
  const location = useLocation();
  const [isBaseDeDatosOpen, setIsBaseDeDatosOpen] = useState(false);
  return (
    <div
      className={`z-50 min-h-full bg-secondary ${toggleNavbar ? "w-[4rem]" : "w-56"
        } pt-10 text-white transition-all duration-300 flex flex-col items-center`}
    >
        <ul className={`text-texto font-[500] space-y-4 pt-8 w-full ${!toggleNavbar && 'px-2'}`}>
          {/* Calendario */}
          <li className="mb-4 nav-menu">
            <Link
              to={"/home"}
              className={`flex items-center    ${toggleNavbar ? "w-[4rem] justify-center" : "w-52 justify-left"
                } ${location.pathname === "/" && "bg-hovercolor"
                }`}
            >
              <div className="flex items-center justify-center ">
                <CalendarMonthIcon className="min-w-max" />
                <span
                  className={`overflow-hidden transition-all duration-300 ${toggleNavbar ? "hidden" : "max-w-full opacity-100 ml-4"
                    }`}
                >
                  Calendario
                </span>
              </div>
            </Link>
          </li>

          <li className="mb-4 nav-menu">
            <Link
              to={"/kanban"}
              className={`flex items-center    ${toggleNavbar ? "w-[4rem] justify-center" : "w-52 justify-left"
                } ${location.pathname === "/kanban" && "bg-hovercolor"
                }`}
            >
              <div className="flex items-center justify-center ">
                <ViewKanbanIcon className="min-w-max" />
                <span
                  className={`overflow-hidden transition-all duration-300 ${toggleNavbar ? "hidden" : "max-w-full opacity-100 ml-4"
                    }`}
                >
                  Kanban
                </span>
              </div>
            </Link>
          </li>

          <li className="mb-4 nav-menu">
            <Link
              to={"/docs"}
              className={`flex items-center    ${toggleNavbar ? "w-[4rem] justify-center" : "w-52 justify-left"
                } ${location.pathname === "/docs" && "bg-hovercolor"
                }`}
            >
              <div className="flex items-center justify-center ">
                <ArticleIcon className="min-w-max" />
                <span
                  className={`overflow-hidden transition-all duration-300 ${toggleNavbar ? "hidden" : "max-w-full opacity-100 ml-4"
                    }`}
                >
                  Docs
                </span>
              </div>
            </Link>
          </li>

          <li className="mb-4 nav-menu">
            <Link
              to={"/sheets"}
              className={`flex items-center    ${toggleNavbar ? "w-[4rem] justify-center" : "w-52 justify-left"
                } ${location.pathname === "/sheets" && "bg-hovercolor"
                }`}
            >
              <div className="flex items-center justify-center ">
                <GridOnIcon className="min-w-max" />
                <span
                  className={`overflow-hidden transition-all duration-300 ${toggleNavbar ? "hidden" : "max-w-full opacity-100 ml-4"
                    }`}
                >
                  Planillas
                </span>
              </div>
            </Link>
          </li>

          <li className="mb-4 nav-menu">
            <Link
              to={"/availability"}
              className={`flex items-center    ${toggleNavbar ? "w-[4rem] justify-center" : "w-52 justify-left"
                } ${location.pathname === "/availability" && "bg-hovercolor"
                }`}
            >
              <div className="flex items-center justify-center ">
                <EventAvailableIcon className="min-w-max" />
                <span
                  className={`overflow-hidden transition-all duration-300 ${toggleNavbar ? "hidden" : "max-w-full opacity-100 ml-4"
                    }`}
                >
                  Disponibilidad
                </span>
              </div>
            </Link>
          </li>

          <li className="mb-4 nav-menu">
            <Link
              to={"/contacts"}
              className={`flex items-center    ${toggleNavbar ? "w-[4rem] justify-center" : "w-52 justify-left"
                } ${location.pathname === "/contacts" && "bg-hovercolor"
                }`}
            >
              <div className="flex items-center justify-center ">
                <ContactsIcon className="min-w-max" />
                <span
                  className={`overflow-hidden transition-all duration-300 ${toggleNavbar ? "hidden" : "max-w-full opacity-100 ml-4"
                    }`}
                >
                  Contactos
                </span>
              </div>
            </Link>
          </li>

          <li
            className="mb-4 nav-menu relative group"
            onMouseEnter={() => toggleNavbar && setIsBaseDeDatosOpen(true)}
            onMouseLeave={() => toggleNavbar && setIsBaseDeDatosOpen(false)}
          >
            <button
              onClick={() => !toggleNavbar && setIsBaseDeDatosOpen(!isBaseDeDatosOpen)}
              className={`flex justify-center  ${toggleNavbar ? "w-[4rem]" : "w-52"
                } items-center ${isBaseDeDatosOpen && !toggleNavbar ? "bg-hovercolor" : ""
                }`}
            >
              <div className="flex items-center justify-center w-full">
                <StorageIcon className="min-w-max" />
                <span
                  className={`overflow-hidden transition-all duration-300 ${toggleNavbar ? "hidden" : "min-w-fit opacity-100 ml-4"
                    }`}
                >
                  Gestion
                </span>
                {!toggleNavbar && <ExpandMoreIcon className="ml-auto" />}
              </div>
            </button>

            {/* Submenú en hover cuando está retraída */}
            {isBaseDeDatosOpen && toggleNavbar && (
              <ol className="absolute left-16 top-0 bg-secondary p-2 rounded-md shadow-2xl space-y-2 min-w-[10rem] z-[1001] list-disc">
                <div className="ml-5">
                  <li className="p-2 hover:bg-hovercolor">
                    <Link to="/usuarios">Usuarios</Link>
                  </li>
                  <li className="p-2 hover:bg-hovercolor">
                    <Link to="/areas">Areas</Link>
                  </li>
                </div>
              </ol>
            )}

            {/* Submenú cuando no está retraída */}
            {isBaseDeDatosOpen && !toggleNavbar && (
              <ol className="text-left space-y-3 pl-10 transition-all duration-300 pt-5 list-disc">
                <li className="submenu-item big-buttons p-2 w-full">
                  <Link to="/usuarios">Usuarios</Link>
                </li>
                <li className="submenu-item big-buttons p-2 w-full">
                  <Link to="/areas">Areas</Link>
                </li>
              </ol>
            )}
          </li>
        </ul>
    </div>
  );
}

export default Navbar;
