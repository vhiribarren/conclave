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
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../components/LanguageSelector';
import licenseText from '../../../LICENSE?raw';
import thirdPartyNotices from '../../../THIRD_PARTY_LICENSES.md?raw';
import './About.css';

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

const getLicenseSummary = () => {
  const [title, copyright] = licenseText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    title: title || 'MIT License',
    copyright: copyright || 'Copyright (c) 2026 Vincent Hiribarren',
  };
};

const notices = parseThirdPartyNotices();
const license = getLicenseSummary();

const About = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const from = location.state && typeof location.state === 'object' && 'from' in location.state
    ? location.state.from
    : null;
  const backTarget = typeof from === 'string' && from.startsWith('/') ? from : '/';
  const backLabel = backTarget.startsWith('/room/') ? t('about.backToRoom') : t('about.home');

  return (
    <div className="about-page animate-fade-in">
      <header className="about-header glass">
        <Link to={backTarget} className="about-back-link">
          <ArrowLeft size={18} />
          {backLabel}
        </Link>
        <div>
          <h1 className="about-title">{t('about.title')}</h1>
          <p className="about-subtitle">{t('about.subtitle')}</p>
        </div>
        <LanguageSelector />
      </header>

      <main className="about-content">
        <section className="about-section glass">
          <h2>{t('about.project')}</h2>
          <dl className="about-facts">
            <div>
              <dt>{t('about.author')}</dt>
              <dd>Vincent Hiribarren</dd>
            </div>
            <div>
              <dt>{t('about.license')}</dt>
              <dd>{license.title}</dd>
            </div>
            <div>
              <dt>{t('about.copyright')}</dt>
              <dd>{license.copyright}</dd>
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

        <section className="about-section glass">
          <h2>{t('about.usageTerms')}</h2>
          <div className="about-notice-list">
            <p>{t('about.usageTerms1')}</p>
            <p>{t('about.usageTerms2')}</p>
            <p>{t('about.usageTerms3')}</p>
          </div>
        </section>

        <section className="about-section glass">
          <h2>{t('about.dataUsage')}</h2>
          <div className="about-notice-list">
            <p>{t('about.dataUsage1')}</p>
            <p>{t('about.dataUsage2')}</p>
            <p>{t('about.dataUsage3')}</p>
            <p>{t('about.dataUsage4')}</p>
          </div>
        </section>

        <section className="about-section glass">
          <div className="about-section-heading">
            <h2>{t('about.thirdParty')}</h2>
            <span>{t('about.packages', { count: notices.length })}</span>
          </div>
          <div className="license-list" aria-label="Third-party licenses">
            {notices.map((notice, index) => (
              <a
                key={`${notice.name}-${index}`}
                className="license-row"
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
