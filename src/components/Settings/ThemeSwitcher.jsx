// ThemeSwitcher.jsx
import { useEffect, useState } from 'react';

const THEMES = ['ocean', 'ocean-dark', 'emerald', 'emerald-dar', 'royal', 'royal-dark'];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <>
      {THEMES.map(t => (
        <li key={t}>
        <button
          className={`btn-primary flex items-center py-2 gap-3 px-6 -mx-6 transition focus:outline-none focus:ring-2 w-full`}
          onClick={() => setTheme(t)}
        >
          {t}
        </button>
        </li>
      ))}
    </>
  );
}