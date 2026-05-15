/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { useTranslation } from 'react-i18next';
import styles from './LanguageSelector.module.css';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
] as const;

export const LanguageSelector = ({ variant = 'pill' }: { variant?: 'pill' | 'menu-item' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  if (variant === 'menu-item') {
    return (
      <div className={styles.menuRow}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            className={`${styles.menuOption} ${currentLang === lang.code ? styles.active : ''}`}
            onClick={() => i18n.changeLanguage(lang.code)}
            aria-label={lang.label}
          >
            <span className={styles.menuFlag}>{lang.flag}</span>
            <span className={styles.menuLabel}>{lang.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.pill} role="radiogroup" aria-label="Language">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          className={`${styles.pillBtn} ${currentLang === lang.code ? styles.active : ''}`}
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-label={lang.label}
          role="radio"
          aria-checked={currentLang === lang.code}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
};
