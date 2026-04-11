import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { path: "/new", labelKey: "newMatch" },
  { path: "/players", labelKey: "players" },
  { path: "/history", labelKey: "matchHistory" },
] as const;

export default function NavBar() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="flex justify-center gap-4 text-sm">
      {NAV_ITEMS.map(({ path, labelKey }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`transition-colors ${
              isActive
                ? "text-blue-400 font-medium"
                : "text-gray-500 hover:text-gray-400"
            }`}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
