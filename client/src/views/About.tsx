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
import licenseText from '../../../LICENSE?raw';
import thirdPartyNotices from '../../../THIRD_PARTY_LICENSES.md?raw';
import styles from './About.module.css';

type Notice = {
  name: string;
  url: string;
  license: string;
};

const stripPackageVersion = (name: string) => name.replace(/@\d.*$/, '');

const parseThirdPartyNotices = () =>
  thirdPartyNotices
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.match(/^\[(.+)]\((.+)\) - (.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map<Notice>((match) => ({
      name: stripPackageVersion(match[1] ?? 'Unknown package'),
      url: match[2] ?? '#',
      license: match[3] ?? 'Unknown license',
    }));

const getLicenseTitle = () => {
  const [title] = licenseText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return title || 'MIT License';
};

const notices = parseThirdPartyNotices();
const licenseTitle = getLicenseTitle();

const About = () => {
  const { t } = useTranslation();

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <header className={`${styles.header} glass`}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={18} />
          {t('about.home')}
        </Link>
        <div>
          <h1 className={styles.title}>{t('about.title')}</h1>
          <p className={styles.subtitle}>{t('about.subtitle')}</p>
        </div>
      </header>

      <main className={styles.content}>
        <section className={`${styles.section} glass`}>
          <h2>{t('about.project')}</h2>
          <dl className={styles.facts}>
            <div>
              <dt>{t('about.author')}</dt>
              <dd>Vincent Hiribarren</dd>
            </div>
            <div>
              <dt>{t('about.license')}</dt>
              <dd>{licenseTitle}</dd>
            </div>
            <div>
              <dt>{t('about.repository')}</dt>
              <dd>
                <a href="https://github.com/vhiribarren/conclave" target="_blank" rel="noreferrer">
                  github.com/vhiribarren/conclave
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <section className={`${styles.section} glass`}>
          <h2>{t('about.usageTerms')}</h2>
          <div className={styles.noticeList}>
            <p>{t('about.usageTerms1')}</p>
            <p>{t('about.usageTerms2')}</p>
            <p>{t('about.usageTerms3')}</p>
            <p>{t('about.usageTerms4')}</p>
            <p>{t('about.usageTerms5')}</p>
            <p>{t('about.usageTerms6')}</p>
            <p>{t('about.usageTerms7')}</p>
          </div>
        </section>

        <section className={`${styles.section} glass`}>
          <h2>{t('about.licenseText')}</h2>
          <pre className={styles.licenseFull}>{licenseText}</pre>
        </section>

        <section className={`${styles.section} glass`}>
          <h2>{t('about.dataUsage')}</h2>
          <div className={styles.noticeList}>
            <p>{t('about.dataUsage1')}</p>
            <p>{t('about.dataUsage2')}</p>
            <p>{t('about.dataUsage3')}</p>
            <p>{t('about.dataUsage4')}</p>
            <p>{t('about.dataUsage5')}</p>
            <p>
              <Link to="/privacy">{t('about.privacyLink')}</Link>
            </p>
          </div>
        </section>

        <section className={`${styles.section} glass`}>
          <div className={styles.sectionHeading}>
            <h2>{t('about.thirdParty')}</h2>
            <span>{t('about.packages', { count: notices.length })}</span>
          </div>
          <div className={styles.licenseList} aria-label="Third-party licenses">
            {notices.map((notice, index) => (
              <a
                key={`${notice.name}-${index}`}
                className={styles.licenseRow}
                href={notice.url}
                target="_blank"
                rel="noreferrer"
              >
                <span>{notice.name}</span>
                <strong>{notice.license}</strong>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
