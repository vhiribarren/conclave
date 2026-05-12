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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, LogOut, Smartphone, UserCog, ChevronRight, ChevronUp, CircleDot, LayoutGrid, Copy, Check, Edit2, X, Info, ListChecks, MoreVertical, Settings, Eye, RotateCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import PokerCard from '../components/PokerCard';
import './Room.css';
import EmojiPicker, { Theme } from 'emoji-picker-react';

import { setUserName, setUserEmoji } from '../services/user';
import { ParticipantsBoard, type LayoutMode } from '../components/ParticipantsBoard';
import { AggregationResult } from '../components/AggregationResult';
import { AdminPanel } from '../components/AdminPanel';
import { TimerDisplay } from '../components/TimerDisplay';
import { SidebarPanel } from '../components/SidebarPanel';
import { LanguageSelector } from '../components/LanguageSelector';
import { Modal } from '../components/Modal';
import { useCurrentRoomSession } from './RoomSessionLayout';


const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    actions,
    actionsRef,
    connectionError,
    connectionStatus,
    currentRound,
    currentTask,
    isAdmin,
    isJoined,
    isRevealed,
    mood,
    name,
    setIsJoined,
    setMood,
    setName,
    state,
    userId,
  } = useCurrentRoomSession();
  const [myVote, setMyVote] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isQRVisible, setIsQRVisible] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showEmojiPickerJoin, setShowEmojiPickerJoin] = useState(false);
  const [showEmojiPickerSettings, setShowEmojiPickerSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() =>
    window.innerWidth <= 768 ? 'grid' : 'auto'
  );
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const effectiveLayoutMode: LayoutMode = isMobile ? 'grid' : layoutMode;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [tempRoomName, setTempRoomName] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const isCircleLayout = effectiveLayoutMode === 'auto' && state.participants.length <= 12 && state.participants.length > 0;

  // Reset local vote when the round changes (e.g. admin reset)
  useEffect(() => {
    if (currentRound?.id) {
      setMyVote(null);
    }
  }, [currentRound?.id]);

  // Close mobile menu on outside click/touch
  useEffect(() => {
    if (!showMobileMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileMenu]);

  // Sidebar resize logic
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const containerRight = document.documentElement.clientWidth;
      const newWidth = containerRight - ev.clientX;
      setSidebarWidth(Math.max(280, Math.min(600, newWidth)));
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setUserName(name);
      setUserEmoji(mood);
      if (actionsRef.current) {
        actionsRef.current.userUpdateProfile(name, mood);
      }
      setIsJoined(true);
    }
  };

  const handleVote = (card: string) => {
    const newVote = myVote === card ? null : card;
    setMyVote(newVote);
    actionsRef.current?.userVote(newVote);
  };

  const handleReveal = () => actionsRef.current?.adminReveal();
  const handleReset = () => {
    actionsRef.current?.adminReset();
  };



  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleRenameRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempRoomName.trim() && actionsRef.current) {
      actionsRef.current.adminRenameRoom(tempRoomName.trim());
      setIsEditingRoomName(false);
    }
  };

  const startEditingRoomName = () => {
    setTempRoomName(state.name || roomId || '');
    setIsEditingRoomName(true);
  };


  const renderOnboardingModal = () => (
    <Modal>
      <h2 className="modal-title">{t('room.joinTitle')}</h2>
      <p className="modal-subtitle">{t('room.joinSubtitle')}</p>
      <form onSubmit={handleJoin} className="landing-form">
        <input
          type="text"
          placeholder={t('room.yourName')}
          className="premium-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('room.chooseAvatar')}</span>
          <button
            type="button"
            className="icon-button"
            style={{ fontSize: '2.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '1rem' }}
            onClick={() => setShowEmojiPickerJoin(!showEmojiPickerJoin)}
          >
            {mood}
          </button>

          {showEmojiPickerJoin && (
            <div style={{ position: 'absolute', zIndex: 100, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  setMood(emojiData.emoji);
                  setShowEmojiPickerJoin(false);
                }}
                theme={Theme.LIGHT}
                lazyLoadEmojis={true}
                searchDisabled={false}
                skinTonesDisabled={true}
                height={450}
                width={350}
              />
            </div>
          )}
        </div>

        <Button type="submit">{t('common.enterRoom')}</Button>
      </form>
    </Modal>
  );

  if (connectionError) {
    return (
      <div className="page-container animate-fade-in">
        <div className="landing-card glass" style={{ textAlign: 'center' }}>
          <h2 className="modal-title" style={{ color: 'var(--danger-color)' }}>{t('room.roomNotFound')}</h2>
          <p className="modal-subtitle">{connectionError}</p>
          <Button onClick={() => navigate('/')}>
            {t('common.returnHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isJoined && renderOnboardingModal()}
      <div className={`room-container ${!isJoined ? 'blurred' : ''}`}>
        {/* Header */}
        <header className="header glass">
          <div className="header-left">
            <div className="header-logo">C</div>
            <div>
              {isEditingRoomName ? (
                <form onSubmit={handleRenameRoom} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="text"
                    className="premium-input"
                    style={{ padding: '0.15rem 0.5rem', fontSize: '0.9rem', height: 'auto', width: '180px' }}
                    value={tempRoomName}
                    onChange={(e) => setTempRoomName(e.target.value)}
                    autoFocus
                    onBlur={() => {
                      // Small delay to allow clicking the save button
                      setTimeout(() => setIsEditingRoomName(false), 200);
                    }}
                  />
                  <button type="submit" className="icon-button success" title="Save">
                    <Check size={14} />
                  </button>
                  <button type="button" className="icon-button danger" onClick={() => setIsEditingRoomName(false)} title="Cancel">
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <div className="room-name-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h1 className="header-title">{state.name || roomId}</h1>
                  {isAdmin && (
                    <button onClick={startEditingRoomName} className="icon-button-subtle rename-btn" title={t('room.renameRoom')}>
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
              )}
              <div className="header-subtitle">
                <span className={`header-dot ${connectionStatus !== 'connected' ? 'disconnected' : ''}`}></span>
                {connectionStatus === 'connected'
                  ? `${state.participants.length} ${t('common.online')}`
                  : t('common.reconnecting')
                }
              </div>
            </div>
          </div>

          <div className="header-actions">
            <div className="header-actions-desktop">
              <LanguageSelector />
              <div className="layout-toggle-container" style={{ alignSelf: 'center' }}>
                <button
                  id="layout-btn-circle"
                  className={`layout-toggle-btn ${layoutMode === 'auto' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('auto')}
                  title={t('room.circleView')}
                  disabled={state.participants.length > 12 || state.participants.length === 0}
                >
                  <CircleDot size={16} />
                </button>
                <button
                  id="layout-btn-grid"
                  className={`layout-toggle-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('grid')}
                  title={t('room.gridView')}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              <div className="header-separator" />
              <button onClick={() => setShowShareModal(true)} className="icon-button" title={t('room.shareRoom')}>
                <Share2 size={18} />
              </button>
              {isAdmin && (
                <button onClick={() => setShowQR(true)} className="icon-button accent" title={t('room.remoteControl')}>
                  <Smartphone size={18} />
                </button>
              )}
              <button onClick={() => navigate(`/room/${roomId}/tasks`)} className="icon-button accent" title={isAdmin ? t('room.manageTasks') : t('room.viewTasks')}>
                <ListChecks size={18} />
              </button>
              <button onClick={() => setShowUserSettings(true)} className="icon-button" title={t('room.userSettings')}>
                <UserCog size={18} />
              </button>
              <button onClick={() => navigate('/about', { state: { from: window.location.pathname + window.location.search } })} className="icon-button" title={t('room.about')}>
                <Info size={18} />
              </button>
              <button onClick={() => navigate('/')} className="icon-button danger" title={t('room.leave')}>
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile: share + tasks always visible, rest in overflow */}
            <div className="header-actions-mobile">
              <button onClick={() => setShowShareModal(true)} className="icon-button" title={t('room.shareRoom')}>
                <Share2 size={18} />
              </button>
              <button onClick={() => navigate(`/room/${roomId}/tasks`)} className="icon-button accent" title={isAdmin ? t('room.manageTasks') : t('room.viewTasks')}>
                <ListChecks size={18} />
              </button>
              <div className="mobile-menu-wrapper" ref={mobileMenuRef}>
                <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="icon-button" title="Menu">
                  <MoreVertical size={18} />
                </button>
                {showMobileMenu && (
                  <div className="mobile-menu glass animate-fade-in">
                    <button onClick={() => { setShowUserSettings(true); setShowMobileMenu(false); }}>
                      <UserCog size={16} /> {t('room.userSettings')}
                    </button>
                    {isAdmin && (
                      <button onClick={() => { setShowQR(true); setShowMobileMenu(false); }}>
                        <Smartphone size={16} /> {t('room.remoteControl')}
                      </button>
                    )}
                    <button onClick={() => { navigate('/about', { state: { from: window.location.pathname + window.location.search } }); setShowMobileMenu(false); }}>
                      <Info size={16} /> {t('room.about')}
                    </button>
                    <div className="mobile-menu-separator" />
                    <LanguageSelector variant="menu-item" />
                    <div className="mobile-menu-separator" />

                    <button className="mobile-menu-danger" onClick={() => { navigate('/'); setShowMobileMenu(false); }}>
                      <LogOut size={16} /> {t('room.leave')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="room-layout">
            <>
              {/* ── Left column: participants ──────────────────────────── */}
              <main className="room-main">
                {!isCircleLayout && (state.timerEndAt || state.timerPausedRemainingMs !== null) && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <TimerDisplay
                      timerEndAt={state.timerEndAt}
                      timerPausedRemainingMs={state.timerPausedRemainingMs}
                    />
                  </div>
                )}

                <div className="participants-results-row">
                  <ParticipantsBoard
                    participants={state.participants}
                    isRevealed={isRevealed}
                    currentTaskName={currentTask?.name || ''}
                    myName={name}
                    layoutMode={effectiveLayoutMode}
                    timerEndAt={state.timerEndAt}
                    timerPausedRemainingMs={state.timerPausedRemainingMs}
                  />

                  {/* Right panel: voting cards or results */}
                  <div className={`results-panel ${isAdmin && !sidebarCollapsed ? 'hidden' : ''}`}>
                    <span className="sidebar-section-title">{t('room.votingOn')}</span>
                    <span className="results-panel-task-title">
                      {currentTask ? currentTask.name : t('admin.adhocVote')}
                    </span>
                    {isRevealed ? (
                      <>
                        <span className="sidebar-section-title">📊 {t('room.results')}</span>
                        <AggregationResult participants={state.participants} deck={state.deck} />
                      </>
                    ) : !isAdmin ? (
                      <div className="results-panel-voting">
                        <span className="sidebar-section-title">🎴 {t('room.pickACard')}</span>
                        <div className="results-panel-cards">
                          {(state.deck || []).map((card) => (
                            <PokerCard
                              key={card}
                              value={card}
                              selected={myVote === card}
                              small
                              onClick={() => handleVote(card)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Mobile-only: task title and results */}
                {isRevealed && (
                  <div className="mobile-results-section animate-fade-in">
                    <span className="sidebar-section-title">{t('room.votingOn')}</span>
                    <span className="results-panel-task-title">{currentTask ? currentTask.name : t('admin.adhocVote')}</span>
                    <span className="sidebar-section-title">📊 {t('room.results')}</span>
                    <AggregationResult participants={state.participants} deck={state.deck} />
                  </div>
                )}

                {/* Mobile-only: voting cards sticky bottom (non-admin) */}
                {!isRevealed && !isAdmin && (
                  <div className="voting-section glass mobile-voting">
                    <span className="voting-title">{t('room.pickACard')}</span>
                    <div className="voting-cards">
                      {(state.deck || []).map((card) => (
                        <PokerCard
                          key={card}
                          value={card}
                          selected={myVote === card}
                          onClick={() => handleVote(card)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile-only: admin bottom bar with expand */}
                {isAdmin && actions && (
                  <div className={`mobile-admin-bar ${mobileAdminOpen ? 'expanded' : ''}`}>
                    {/* Vote cards for admin — hidden when panel is expanded */}
                    {!isRevealed && !mobileAdminOpen && (
                      <div className="mobile-admin-vote-section">
                        <span className="mobile-admin-vote-title">{t('room.pickACard')}</span>
                        <div className="mobile-admin-vote-cards">
                          {(state.deck || []).map((card) => (
                            <PokerCard
                              key={card}
                              value={card}
                              selected={myVote === card}
                              small
                              onClick={() => handleVote(card)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick actions: reveal, reset, timer — hidden when panel is expanded */}
                    <div className="mobile-admin-bar-header">
                      {!mobileAdminOpen && (
                        <div className="mobile-admin-bar-actions">
                          <button onClick={handleReveal} disabled={isRevealed} className="premium-button">
                            <Eye size={15} /> {t('room.reveal')}
                          </button>
                          <button onClick={handleReset} className="premium-button secondary">
                            <RotateCcw size={15} /> {t('room.reset')}
                          </button>
                          {!isRevealed && (
                            state.timerPausedRemainingMs !== null ? (
                              <button onClick={() => actions.adminResumeTimer()} className="premium-button secondary" title={t('admin.resume')}>
                                ▶
                              </button>
                            ) : state.timerEndAt ? (
                              <button onClick={() => actions.adminPauseTimer()} className="premium-button secondary" title={t('admin.pause')}>
                                ⏸
                              </button>
                            ) : (
                              <button onClick={() => actions.adminSetTimer(30000)} className="premium-button secondary" title={t('admin.start')}>
                                ⏱
                              </button>
                            )
                          )}
                        </div>
                      )}
                      <button
                        className="mobile-admin-bar-toggle"
                        onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
                        aria-label={mobileAdminOpen ? 'Close panel' : 'Open panel'}
                      >
                        {mobileAdminOpen ? <X size={18} /> : <><Settings size={15} /> <ChevronUp size={15} /></>}
                      </button>
                    </div>

                    {/* Expanded: full admin panel */}
                    {mobileAdminOpen && (
                      <div className="mobile-admin-bar-content animate-fade-in">
                        <AdminPanel
                          state={state}
                          actions={actions}
                          isAdmin={true}
                          myVote={myVote}
                          onVote={handleVote}
                          roomId={roomId}
                          layout="remote"
                        />
                      </div>
                    )}
                  </div>
                )}
              </main>

              {/* ── Right column: sidebar (admin only) ─────────────────── */}
              {isAdmin && (
                <aside
                  ref={sidebarRef}
                  className={`room-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
                  style={!sidebarCollapsed ? { width: sidebarWidth } : undefined}
                >
                  <div className="sidebar-resize-handle" onMouseDown={handleResizeStart} />
                  <button
                    className="sidebar-toggle-btn"
                    onClick={() => setSidebarCollapsed((c) => !c)}
                    title={sidebarCollapsed ? t('room.expandPanel') : t('room.collapsePanel')}
                  >
                    <ChevronRight size={18} />
                  </button>
                  {actions && (
                    <SidebarPanel
                      state={state}
                      actions={actions}
                      isAdmin={!!isAdmin}
                      myVote={myVote}
                      onVote={handleVote}
                      roomId={roomId}
                    />
                  )}
                </aside>
              )}
            </>
        </div>
      </div>


      {showUserSettings && (
        <Modal onClose={() => setShowUserSettings(false)}>
            <h3 className="modal-title">{t('room.userSettings')}</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleJoin(e); setShowUserSettings(false); }} className="landing-form">
              <input
                type="text"
                placeholder={t('room.yourName')}
                className="premium-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('room.changeAvatar')}</span>
                <button
                  type="button"
                  className="icon-button"
                  style={{ fontSize: '2.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '1rem' }}
                  onClick={() => setShowEmojiPickerSettings(!showEmojiPickerSettings)}
                >
                  {mood}
                </button>

                {showEmojiPickerSettings && (
                  <div style={{ position: 'absolute', zIndex: 100, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setMood(emojiData.emoji);
                        setShowEmojiPickerSettings(false);
                      }}
                      theme={Theme.LIGHT}
                      lazyLoadEmojis={true}
                      height={450}
                      width={350}
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="premium-button">{t('room.updateProfile')}</button>
            </form>
            <button onClick={() => setShowUserSettings(false)} className="premium-button secondary">{t('common.cancel')}</button>
        </Modal>
      )}

      {showShareModal && (
        <Modal onClose={() => setShowShareModal(false)}>
            <h3 className="modal-title">{t('share.title')}</h3>
            <p className="modal-subtitle">{t('share.subtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', margin: '1rem 0' }}>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem' }} className="animate-fade-in">
                <QRCodeSVG value={window.location.href} size={180} />
              </div>

              <div style={{ width: '100%', textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('share.roomId')}</span>
                <div className="premium-input" style={{ marginTop: '0.25rem', background: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {roomId}
                </div>
              </div>

              <div style={{ width: '100%', textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('share.inviteLink')}</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="premium-input"
                    style={{ fontSize: '0.85rem', flex: 1 }}
                  />
                  <button onClick={handleCopyLink} className={`premium-button ${copySuccess ? 'success' : 'secondary'}`} style={{ padding: '0.5rem 1rem', flexShrink: 0 }}>
                    {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setShowShareModal(false)} className="premium-button secondary">{t('common.close')}</button>
        </Modal>
      )}

      {showQR && (
        <Modal onClose={() => { setShowQR(false); setIsQRVisible(false); }}>
            <h3 className="modal-title">{t('remoteModal.title')}</h3>
            <p className="modal-subtitle">{t('remoteModal.subtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', margin: '1rem 0' }}>
              <a
                href={`${window.location.origin}/room/${roomId}/remote?link=${btoa(userId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-button"
                style={{ textDecoration: 'none' }}
              >
                <Smartphone size={18} /> {t('remoteModal.openNewTab')}
              </a>

              <button
                onClick={() => setIsQRVisible(!isQRVisible)}
                className="premium-button secondary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                {isQRVisible ? t('remoteModal.hideQR') : t('remoteModal.showQR')}
              </button>

              {isQRVisible && (
                <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', alignSelf: 'center' }} className="animate-fade-in">
                  <QRCodeSVG value={`${window.location.origin}/room/${roomId}/remote?link=${btoa(userId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`} size={200} />
                </div>
              )}
            </div>

            <button onClick={() => { setShowQR(false); setIsQRVisible(false); }} className="premium-button secondary">{t('common.close')}</button>
        </Modal>
      )}
    </>
  );
};

export default Room;
