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
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, History, Clock, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { getUserName, setUserName, getUserEmoji, setUserEmoji, getUserId } from '../services/user';
import Button from '../components/Button';
import Input from '../components/Input';
import { LanguageSelector } from '../components/LanguageSelector';
import { Modal, ModalTitle, ModalSubtitle } from '../components/Modal';
import styles from './Landing.module.css';
import { getHistory, type HistoryEntry } from '../services/history';

const Landing = () => {
  const [roomName, setRoomName] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [userName, setUserNameInput] = useState(getUserName());
  const [mood, setMood] = useState(getUserEmoji());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [history] = useState<HistoryEntry[]>(getHistory());
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);

  const createRoom = async () => {
    if (userName.trim()) {
      setUserName(userName.trim());
    }
    try {
      setIsLoading(true);
      const res = await fetch(`/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomTitle, adminId: getUserId() }),
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/room/${data.roomId}`);
      }
    } catch (err) {
      console.error('Failed to create room', err);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setUserName(userName.trim());
    }
    if (roomName.trim()) {
      navigate(`/room/${roomName.trim()}`);
    }
  };

  return (
    <>
    <div className="page-container animate-fade-in">
      <div className={`${styles.card} glass`}>
        <div className={styles.glow1}></div>
        <div className={styles.glow2}></div>
        
        <div className={styles.header}>
          <h1 className={styles.title}>
            Conclave
          </h1>
          <p className={styles.subtitle}>
            {t('landing.subtitle')}
          </p>
          <LanguageSelector />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '-0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {t('landing.yourProfile')}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              type="button" 
              style={{ fontSize: '2rem', padding: '0.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '1rem', border: 'none', cursor: 'pointer' }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              {mood}
            </button>
            <Input
              type="text"
              placeholder={t('landing.namePlaceholder')}
              value={userName}
              onChange={(e) => {
                const newName = e.target.value;
                setUserNameInput(newName);
                setUserName(newName);
              }}
              style={{ textAlign: 'center', fontWeight: 'bold', flex: 1 }}
            />
          </div>

          {showEmojiPicker && (
            <Modal onClose={() => setShowEmojiPicker(false)} transparent>
              <EmojiPicker 
                onEmojiClick={(emojiData) => {
                  setMood(emojiData.emoji);
                  setUserEmoji(emojiData.emoji);
                  setShowEmojiPicker(false);
                }}
                theme={Theme.LIGHT}
                lazyLoadEmojis={true}
                height={400}
                width={300}
              />
            </Modal>
          )}

          <div className={styles.divider} style={{ margin: '0.5rem 0' }}>
            <div className={styles.dividerLine}></div>
          </div>

          <form onSubmit={joinRoom}>
            <Input
              type="text"
              placeholder={t('landing.roomIdPlaceholder')}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={{ textAlign: 'center' }}
            />
            <Button type="submit" disabled={!roomName.trim()}>
              {t('landing.joinRoom')}
              <ArrowRight size={18} />
            </Button>
          </form>
          
          <div className={styles.divider}>
            <div className={styles.dividerLine}></div>
            <span className={styles.dividerText}>{t('landing.or')}</span>
            <div className={styles.dividerLine}></div>
          </div>

          <Button onClick={() => setShowCreateModal(true)} disabled={isLoading} variant="secondary">
            <Plus size={18} />
            {isLoading ? t('landing.creating') : t('landing.createNewRoom')}
          </Button>
        </div>

        {history.length > 0 && (
          <div className={`${styles.history} glass`}>
            <div className={styles.historyHeader}>
              <History size={16} />
              <span>{t('landing.recentRooms')}</span>
            </div>
            <div className={styles.historyList}>
              {history.map(entry => (
                <div 
                  key={entry.id} 
                  className={styles.historyItem}
                  onClick={() => navigate(`/room/${entry.id}`)}
                >
                  <div className={styles.historyInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className={styles.historyName}>{entry.name || entry.id}</span>
                      {entry.isAdmin && <Crown size={14} color="#f59e0b" fill="#f59e0b" style={{ opacity: 0.8 }} />}
                    </div>
                    <span className={styles.historyId}>{entry.id}</span>
                  </div>
                  <div className={styles.historyMeta}>
                    <Clock size={12} />
                    <span>{new Date(entry.visitedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <Link to="/about">{t('landing.footerLink')}</Link>
          <Link to="/privacy">{t('landing.privacyLink')}</Link>
        </footer>
      </div>
    </div>

    {showCreateModal && (
      <Modal onClose={() => setShowCreateModal(false)}>
          <ModalTitle>{t('landing.createModal.title')}</ModalTitle>
          <ModalSubtitle>{t('landing.createModal.subtitle')}</ModalSubtitle>
          <form onSubmit={(e) => { e.preventDefault(); createRoom(); }}>
            <div style={{ textAlign: 'center', marginBottom: '-0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {t('landing.createModal.roomTitle')}
            </div>
            <Input
              type="text"
              placeholder={t('landing.createModal.placeholder')}
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              style={{ textAlign: 'center' }}
              autoFocus
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('landing.creating') : t('landing.createModal.confirm')}
            </Button>
            <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary">
              {t('common.cancel')}
            </Button>
          </form>
      </Modal>
    )}
  </>
  );
};

export default Landing;
