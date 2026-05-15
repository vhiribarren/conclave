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
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Share2, Eye, Settings } from 'lucide-react';
import { Modal, ModalTitle } from './Modal';
import Button from './Button';
import styles from './WelcomeModal.module.css';

interface WelcomeModalProps {
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal onClose={onClose}>
      <ModalTitle>{t('help.title')}</ModalTitle>
      <div className={styles.content}>
        <section className={styles.section}>
          <h3><Share2 size={16} className={styles.sectionIcon} /> {t('help.shareTitle')}</h3>
          <p>{t('help.shareDescription')}</p>
        </section>
        <section className={styles.section}>
          <h3><Smartphone size={16} className={styles.sectionIcon} /> {t('help.remoteTitle')}</h3>
          <p>{t('help.remoteDescription')}</p>
        </section>
        <section className={styles.section}>
          <h3><Eye size={16} className={styles.sectionIcon} /> {t('help.votingTitle')}</h3>
          <p>{t('help.votingDescription')}</p>
        </section>
        <section className={styles.section}>
          <h3><Settings size={16} className={styles.sectionIcon} /> {t('help.settingsTitle')}</h3>
          <p>{t('help.settingsDescription')}</p>
        </section>
      </div>
      <Button onClick={onClose}>
        {t('help.dismiss')}
      </Button>
    </Modal>
  );
};

export default WelcomeModal;
