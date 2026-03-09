'use client';

type SidebarProps = {
  theme: 'dark' | 'light' | 'system';
  onThemeChange: (value: 'dark' | 'light' | 'system') => void;
};

const CHANGELOG = `Version 0.1.0

what's new
• exact IV matching checks every IV from 0 to 31
• polished web dashboard based on the desktop layout
• live Pokémon lookup from the backend
• color-coded stat rows and progress bars
• dark, light, and system theme support
• API-first architecture for future public deployment`;

const HELP = `Quick tips

Pokémon names
-----------------------
• typing filters results in real time
• full form names work when supported by the API
• click a suggestion to lock it in

Best results
-----------------------
• level 100 gives the tightest results
• exact EVs matter a lot
• impossible stat lines will show N/A

UI notes
-----------------------
• stat colors match their Pokémon-style presentation
• 31 IV possibilities are highlighted in the summary`;

export function Sidebar({ theme, onThemeChange }: SidebarProps) {
  return (
    <aside className="sidebar-card">
      <div>
        <h1 className="sidebar-title">Ultimate IV Calculator</h1>
        <a className="sidebar-link" href="https://github.com/brendonbusker" target="_blank" rel="noreferrer">
          github.com/brendonbusker
        </a>
      </div>

      <div className="sidebar-tabs">
        <div className="panel-card compact-card">
          <h2 className="panel-title">Updates</h2>
          <pre className="sidebar-pre">{CHANGELOG}</pre>
        </div>
        <div className="panel-card compact-card">
          <h2 className="panel-title">Help</h2>
          <pre className="sidebar-pre">{HELP}</pre>
        </div>
      </div>

      <div className="panel-card compact-card">
        <h2 className="panel-title">Appearance Mode</h2>
        <div className="theme-switcher">
          {(['dark', 'light', 'system'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`theme-pill ${theme === option ? 'theme-pill-active' : ''}`}
              onClick={() => onThemeChange(option)}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
