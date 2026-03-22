import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex justify-center">
      <div className="inline-flex bg-gray-800 rounded-full p-0.5">
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => i18n.changeLanguage(code)}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors duration-150 ${
              i18n.resolvedLanguage === code
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
