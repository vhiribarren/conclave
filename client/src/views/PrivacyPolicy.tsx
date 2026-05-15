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
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './PrivacyPolicy.module.css';

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  const renderParagraphs = (text: string) =>
    text.split('\n').map((paragraph, index) => <p key={index}>{paragraph}</p>);

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <header className={`${styles.header} glass`}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={18} />
          {t('privacy.home')}
        </Link>
        <div>
          <h1 className={styles.title}>{t('privacy.title')}</h1>
          <p className={styles.updated}>{t('privacy.lastUpdated')}</p>
        </div>
      </header>

      <main className={styles.content}>
        <section className={`${styles.section} glass`}>
          <p>{t('privacy.intro')}</p>
        </section>

        <section className={`${styles.section} glass`}>
          <h2>{t('privacy.hostingTitle')}</h2>
          {renderParagraphs(t('privacy.hostingBody'))}
        </section>

        <section className={`${styles.section} glass`}>
          <h2>{t('privacy.analyticsTitle')}</h2>
          <p>{t('privacy.analyticsBody')}</p>
        </section>

        <section className={`${styles.section} glass`}>
          <h2>{t('privacy.cookiesTitle')}</h2>
          {renderParagraphs(t('privacy.cookiesBody'))}
        </section>

        <section className={`${styles.section} glass`}>
          <h2>{t('privacy.rightsTitle')}</h2>
          {renderParagraphs(t('privacy.rightsBody'))}
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
