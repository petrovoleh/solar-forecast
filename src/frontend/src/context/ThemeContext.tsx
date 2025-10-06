import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'theme-preference';

const getStoredTheme = (): Theme => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }

    return 'system';
};

const getSystemTheme = (): ResolvedTheme => {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
};

const applyDocumentTheme = (theme: ResolvedTheme) => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.setAttribute('data-theme', theme);

    if (document.body) {
        document.body.setAttribute('data-theme', theme);
        document.body.classList.toggle('dark-theme', theme === 'dark');
        document.body.classList.toggle('light-theme', theme === 'light');
    }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
        const initial = getStoredTheme();
        return initial === 'system' ? getSystemTheme() : initial;
    });

    useEffect(() => {
        const systemTheme = getSystemTheme();
        const effectiveTheme = theme === 'system' ? systemTheme : theme;

        setResolvedTheme(effectiveTheme);
        applyDocumentTheme(effectiveTheme);

        if (typeof window !== 'undefined') {
            if (theme === 'system') {
                window.localStorage.removeItem(STORAGE_KEY);
            } else {
                window.localStorage.setItem(STORAGE_KEY, theme);
            }
        }
    }, [theme]);

    useEffect(() => {
        if (typeof window === 'undefined' || theme !== 'system') {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const updateTheme = (matches: boolean) => {
            const nextTheme: ResolvedTheme = matches ? 'dark' : 'light';
            setResolvedTheme(nextTheme);
            applyDocumentTheme(nextTheme);
        };

        updateTheme(mediaQuery.matches);

        const handler = (event: MediaQueryListEvent) => updateTheme(event.matches);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }

        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
    }, [theme]);

    const setTheme = useCallback((nextTheme: Theme) => {
        setThemeState(nextTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            if (prev === 'system') {
                return 'dark';
            }
            if (prev === 'dark') {
                return 'light';
            }
            return 'system';
        });
    }, []);

    const value = useMemo<ThemeContextValue>(() => ({
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme
    }), [theme, resolvedTheme, setTheme, toggleTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
};

