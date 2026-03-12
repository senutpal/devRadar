export interface ThemePreset {
  id: string;
  name: string;
  colors: {
    accent: string;
    accentForeground: string;
    primary: string;
    secondary: string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default',
    colors: {
      accent: '#f5f5f5',
      accentForeground: '#262626',
      primary: '#171717',
      secondary: '#f5f5f5',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    colors: {
      accent: '#a6e22e',
      accentForeground: '#000000',
      primary: '#a6e22e',
      secondary: '#7e57c2',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      accent: '#bd93f9',
      accentForeground: '#282a36',
      primary: '#bd93f9',
      secondary: '#50fa7b',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: {
      accent: '#81a1c1',
      accentForeground: '#2e3440',
      primary: '#81a1c1',
      secondary: '#8fbcbb',
    },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    colors: {
      accent: '#2aa198',
      accentForeground: '#073642',
      primary: '#2aa198',
      secondary: '#cb4b16',
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    colors: {
      accent: '#1f6feb',
      accentForeground: '#ffffff',
      primary: '#1f6feb',
      secondary: '#2ea043',
    },
  },
];

export function getPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}
