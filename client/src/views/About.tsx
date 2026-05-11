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
  const from = location.state && typeof location.state === 'object' && 'from' in location.state
    ? location.state.from
    : null;
  const backTarget = typeof from === 'string' && from.startsWith('/') ? from : '/';
  const backLabel = backTarget.startsWith('/room/') ? 'Back to room' : 'Home';

  return (
    <div className="about-page animate-fade-in">
      <header className="about-header glass">
        <Link to={backTarget} className="about-back-link">
          <ArrowLeft size={18} />
          {backLabel}
        </Link>
        <div>
          <h1 className="about-title">About Conclave</h1>
          <p className="about-subtitle">Author, license, data notice, and third-party licenses.</p>
        </div>
      </header>

      <main className="about-content">
        <section className="about-section glass">
          <h2>Project</h2>
          <dl className="about-facts">
            <div>
              <dt>Author</dt>
              <dd>Vincent Hiribarren</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>{license.title}</dd>
            </div>
            <div>
              <dt>Copyright</dt>
              <dd>{license.copyright}</dd>
            </div>
            <div>
              <dt>Repository</dt>
              <dd>
                <a href="https://github.com/vhiribarren/conclave" target="_blank" rel="noreferrer">
                  github.com/vhiribarren/conclave
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <section className="about-section glass">
          <h2>Usage Terms</h2>
          <div className="about-notice-list">
            <p>This tool is provided as-is, without warranty or support of any kind.</p>
            <p>The author makes no guarantee regarding data integrity, compatibility across versions, or fitness for any particular purpose.</p>
            <p>You are responsible for maintaining your own backups. The author shall not be liable for any data loss, corruption, or damages arising from the use of this software.</p>
          </div>
        </section>

        <section className="about-section glass">
          <h2>Data Usage</h2>
          <div className="about-notice-list">
            <p>Room data is stored by the service only for the lifetime of the room.</p>
            <p>Rooms are deleted after 48 hours of inactivity.</p>
            <p>Your local profile and recent room history are stored in your web browser local storage.</p>
            <p>Cloudflare Analytics may be used, but no cookies are used and no per-user data is collected.</p>
          </div>
        </section>

        <section className="about-section glass">
          <div className="about-section-heading">
            <h2>Third-party Licenses</h2>
            <span>{notices.length} packages</span>
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
