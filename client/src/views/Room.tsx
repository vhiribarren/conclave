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
import { Share2, LogOut, Smartphone, UserCog, ChevronRight, ChevronUp, CircleDot, LayoutGrid, Copy, Check, Edit2, X, Info, ListChecks, MoreVertical, Settings, Eye, RotateCcw, HelpCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import LinkButton from '../components/LinkButton';
import Input from '../components/Input';
import Logo from '../components/Logo';
import PokerCard from '../components/PokerCard';
import s from './Room.module.css';
import EmojiPicker, { Theme } from 'emoji-picker-react';

import { setUserName, setUserEmoji } from '../services/user';
import { settings } from '../services/settings';
import { ParticipantsBoard, type LayoutMode } from '../components/ParticipantsBoard';
import { AggregationResult } from '../components/AggregationResult';
import { AdminPanel } from '../components/AdminPanel';
import { TimerDisplay } from '../components/TimerDisplay';
import { SidebarPanel } from '../components/SidebarPanel';
import { LanguageSelector } from '../components/LanguageSelector';
import { Modal, ModalTitle, ModalSubtitle } from '../components/Modal';
import { useCurrentRoomSession } from './RoomSessionLayout';
import { useWelcomeModal } from '../hooks/useWelcomeModal';
import WelcomeModal from '../components/WelcomeModal';


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
  const { showWelcomeModal, openWelcomeModal, closeWelcomeModal } = useWelcomeModal(isAdmin);
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
  const [autoReveal, setAutoReveal] = useState(() => settings.getAutoReveal());
  const isCircleLayout = effectiveLayoutMode === 'auto' && state.participants.length <= 12 && state.participants.length > 0;

  // Reset local vote when the round changes (e.g. admin reset)
  useEffect(() => {
    if (currentRound?.id) {
      setMyVote(null);
    }
  }, [currentRound?.id]);

  // Auto-reveal when timer expires (admin-only, client-side)
  useEffect(() => {
    if (!autoReveal || !isAdmin || isRevealed || !state.timerEndAt) return;
    const remaining = state.timerEndAt - Date.now();
    if (remaining <= 0) {
      actionsRef.current?.adminReveal();
      return;
    }
    const timeout = setTimeout(() => {
      actionsRef.current?.adminReveal();
    }, remaining);
    return () => clearTimeout(timeout);
  }, [autoReveal, isAdmin, isRevealed, state.timerEndAt]);

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

  const handleAutoRevealChange = (enabled: boolean) => {
    setAutoReveal(enabled);
    settings.setAutoReveal(enabled);
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
      <ModalTitle>{t('room.joinTitle')}</ModalTitle>
      <ModalSubtitle>{t('room.joinSubtitle')}</ModalSubtitle>
      <form onSubmit={handleJoin}>
        <Input
          type="text"
          placeholder={t('room.yourName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className={s.avatarSection}>
          <span className={s.avatarLabel}>{t('room.chooseAvatar')}</span>
          <button
            type="button"
            className={s.avatarButton}
            onClick={() => setShowEmojiPickerJoin(!showEmojiPickerJoin)}
          >
            {mood}
          </button>
        </div>

        <Button type="submit">{t('common.enterRoom')}</Button>
      </form>
    </Modal>
  );

  if (connectionError) {
    return (
      <div className="page-container animate-fade-in">
        <Modal>
          <ModalTitle style={{ color: 'var(--color-danger-text)' }}>{t('room.roomNotFound')}</ModalTitle>
          <ModalSubtitle>{connectionError}</ModalSubtitle>
          <Button onClick={() => navigate('/')}>
            {t('common.returnHome')}
          </Button>
        </Modal>
      </div>
    );
  }

  return (
    <>
      {!isJoined && renderOnboardingModal()}
      <div className={`${s.container} ${!isJoined ? s.blurred : ''}`}>
        {/* Header */}
        <header className={`${s.header} glass`}>
          <div className={s.headerLeft}>
            <Logo />
            <div>
              {isEditingRoomName ? (
                <form onSubmit={handleRenameRoom} className={s.renameForm}>
                  <Input
                    type="text"
                    className={s.renameInput}
                    value={tempRoomName}
                    onChange={(e) => setTempRoomName(e.target.value)}
                    autoFocus
                    onBlur={() => {
                      // Small delay to allow clicking the save button
                      setTimeout(() => setIsEditingRoomName(false), 200);
                    }}
                  />
                  <IconButton type="submit" variant="success" title="Save">
                    <Check size={14} />
                  </IconButton>
                  <IconButton type="button" variant="danger" onClick={() => setIsEditingRoomName(false)} title="Cancel">
                    <X size={14} />
                  </IconButton>
                </form>
              ) : (
                <div className={s.roomNameContainer}>
                  <h1 className={s.headerTitle}>{state.name || roomId}</h1>
                  {isAdmin && (
                    <IconButton onClick={startEditingRoomName} variant="subtle" className={s.renameBtn} title={t('room.renameRoom')}>
                      <Edit2 size={12} />
                    </IconButton>
                  )}
                </div>
              )}
              <div className={s.headerSubtitle}>
                <span className={`${s.headerDot} ${connectionStatus !== 'connected' ? s.disconnected : ''}`}></span>
                {connectionStatus === 'connected'
                  ? `${state.participants.length} ${t('common.online')}`
                  : t('common.reconnecting')
                }
              </div>
            </div>
          </div>

          <div className={s.headerActions}>
            <div className={s.headerActionsDesktop}>
              <LanguageSelector />
              <div className={s.layoutToggleContainer}>
                <button
                  id="layout-btn-circle"
                  className={`${s.layoutToggleBtn} ${layoutMode === 'auto' ? s.active : ''}`}
                  onClick={() => setLayoutMode('auto')}
                  title={t('room.circleView')}
                  disabled={state.participants.length > 12 || state.participants.length === 0}
                >
                  <CircleDot size={16} />
                </button>
                <button
                  id="layout-btn-grid"
                  className={`${s.layoutToggleBtn} ${layoutMode === 'grid' ? s.active : ''}`}
                  onClick={() => setLayoutMode('grid')}
                  title={t('room.gridView')}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              <div className={s.headerSeparator} />
              <IconButton onClick={() => setShowShareModal(true)} title={t('room.shareRoom')}>
                <Share2 size={18} />
              </IconButton>
              {isAdmin && (
                <IconButton onClick={() => setShowQR(true)} variant="accent" title={t('room.remoteControl')}>
                  <Smartphone size={18} />
                </IconButton>
              )}
              <IconButton onClick={() => navigate(`/room/${roomId}/tasks`)} variant="accent" title={isAdmin ? t('room.manageTasks') : t('room.viewTasks')}>
                <ListChecks size={18} />
              </IconButton>
              <IconButton onClick={() => setShowUserSettings(true)} title={t('room.userSettings')}>
                <UserCog size={18} />
              </IconButton>
              <IconButton onClick={() => window.open('/about', '_blank')} title={t('room.about')}>
                <Info size={18} />
              </IconButton>
              {isAdmin && (
                <IconButton onClick={openWelcomeModal} title={t('help.tooltip')}>
                  <HelpCircle size={18} />
                </IconButton>
              )}
              <IconButton onClick={() => navigate('/')} variant="danger" title={t('room.leave')}>
                <LogOut size={18} />
              </IconButton>
            </div>

            {/* Mobile: share + tasks always visible, rest in overflow */}
            <div className={s.headerActionsMobile}>
              <IconButton onClick={() => setShowShareModal(true)} title={t('room.shareRoom')}>
                <Share2 size={18} />
              </IconButton>
              <IconButton onClick={() => navigate(`/room/${roomId}/tasks`)} variant="accent" title={isAdmin ? t('room.manageTasks') : t('room.viewTasks')}>
                <ListChecks size={18} />
              </IconButton>
              <div className={s.mobileMenuWrapper} ref={mobileMenuRef}>
                <IconButton onClick={() => setShowMobileMenu(!showMobileMenu)} title="Menu">
                  <MoreVertical size={18} />
                </IconButton>
                {showMobileMenu && (
                  <div className={`${s.mobileMenu} glass animate-fade-in`}>
                    <button onClick={() => { setShowUserSettings(true); setShowMobileMenu(false); }}>
                      <UserCog size={16} /> {t('room.userSettings')}
                    </button>
                    {isAdmin && (
                      <button onClick={() => { setShowQR(true); setShowMobileMenu(false); }}>
                        <Smartphone size={16} /> {t('room.remoteControl')}
                      </button>
                    )}
                    <button onClick={() => { window.open('/about', '_blank'); setShowMobileMenu(false); }}>
                      <Info size={16} /> {t('room.about')}
                    </button>
                    {isAdmin && (
                      <button onClick={() => { openWelcomeModal(); setShowMobileMenu(false); }}>
                        <HelpCircle size={16} /> {t('help.tooltip')}
                      </button>
                    )}
                    <div className={s.mobileMenuSeparator} />
                    <LanguageSelector variant="menu-item" />
                    <div className={s.mobileMenuSeparator} />

                    <button className={s.mobileMenuDanger} onClick={() => { navigate('/'); setShowMobileMenu(false); }}>
                      <LogOut size={16} /> {t('room.leave')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className={s.layout}>
            <>
              {/* ── Left column: participants ──────────────────────────── */}
              <main className={s.main}>
                {!isCircleLayout && (state.timerEndAt || state.timerPausedRemainingMs !== null) && (
                  <div className={s.timerWrapper}>
                    <TimerDisplay
                      timerEndAt={state.timerEndAt}
                      timerPausedRemainingMs={state.timerPausedRemainingMs}
                    />
                  </div>
                )}

                <div className={s.participantsResultsRow}>
                  {state.anonymousVoting && (
                    <div className={s.anonymousBadge}>
                      🕵️ {t('room.anonymousMode')}
                    </div>
                  )}
                  {autoReveal && isAdmin && (
                    <div className={s.anonymousBadge}>
                      ⏱ {t('room.autoRevealMode')}
                    </div>
                  )}
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
                  <div className={`${s.resultsPanel} ${isAdmin && !sidebarCollapsed ? s.hidden : ''}`}>
                    <span className={s.sidebarSectionTitle}>{t('room.votingOn')}</span>
                    <span className={s.resultsPanelTaskTitle}>
                      {currentTask ? currentTask.name : t('admin.adhocVote')}
                    </span>
                    <span className={s.voteProgress}>
                      🗳️ {state.participants.filter(p => p.vote !== null).length}/{state.participants.length}
                    </span>
                    {isRevealed ? (
                      <>
                        <span className={s.sidebarSectionTitle}>📊 {t('room.results')}</span>
                        <AggregationResult participants={state.participants} deck={state.deck} roundVotes={state.anonymousVoting && currentRound?.revealed ? currentRound.votes : undefined} />
                      </>
                    ) : !isAdmin ? (
                      <div className={s.resultsPanelVoting}>
                        <span className={s.sidebarSectionTitle}>🎴 {t('room.pickACard')}</span>
                        <div className={s.resultsPanelCards}>
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
                  <div className={`${s.mobileResultsSection} animate-fade-in`}>
                    <span className={s.resultsPanelTaskTitle}>{currentTask ? currentTask.name : t('admin.adhocVote')}</span>
                    <span className={s.voteProgress}>
                      🗳️ {state.participants.filter(p => p.vote !== null).length}/{state.participants.length}
                    </span>
                    <span className={s.sidebarSectionTitle}>📊 {t('room.results')}</span>
                    <AggregationResult participants={state.participants} deck={state.deck} roundVotes={state.anonymousVoting && currentRound?.revealed ? currentRound.votes : undefined} />
                  </div>
                )}

                {/* Mobile-only: voting cards sticky bottom (non-admin) */}
                {!isRevealed && !isAdmin && (
                  <div className={`${s.votingSection} glass ${s.mobileVoting}`}>
                    <span className={s.votingSubtitle}>{currentTask ? currentTask.name : t('admin.adhocVote')}</span>
                    <span className={s.voteProgress}>
                      🗳️ {state.participants.filter(p => p.vote !== null).length}/{state.participants.length}
                    </span>
                    <span className={s.votingTitle}>{t('room.pickACard')}</span>
                    <div className={s.votingCards}>
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
                  <div className={`${s.mobileAdminBar} ${mobileAdminOpen ? s.expanded : ''}`}>
                    {/* Vote cards for admin — hidden when panel is expanded */}
                    {!isRevealed && !mobileAdminOpen && (
                      <div className={s.mobileAdminVoteSection}>
                        <span className={s.mobileAdminVoteSubtitle}>{currentTask ? currentTask.name : t('admin.adhocVote')}</span>
                        <span className={s.voteProgress}>
                          🗳️ {state.participants.filter(p => p.vote !== null).length}/{state.participants.length}
                        </span>
                        <span className={s.mobileAdminVoteTitle}>{t('room.pickACard')}</span>
                        <div className={s.mobileAdminVoteCards}>
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
                    <div className={s.mobileAdminBarHeader}>
                      {!mobileAdminOpen && (
                        <div className={s.mobileAdminBarActions}>
                          {isRevealed ? (
                            <Button onClick={handleReset}>
                              <RotateCcw size={15} /> {t('room.newVote')}
                            </Button>
                          ) : (
                            <>
                              {state.timerPausedRemainingMs !== null ? (
                                <>
                                  <Button onClick={() => actions.adminResumeTimer()} variant="secondary" title={t('admin.resume')}>
                                    ▶
                                  </Button>
                                  <Button onClick={() => actions.adminSetTimer(null)} variant="secondary" title={t('admin.timer')}>
                                    ✕
                                  </Button>
                                </>
                              ) : state.timerEndAt ? (
                                <>
                                  <Button onClick={() => actions.adminPauseTimer()} variant="secondary" title={t('admin.pause')}>
                                    ⏸
                                  </Button>
                                  <Button onClick={() => actions.adminSetTimer(null)} variant="secondary" title={t('admin.timer')}>
                                    ✕
                                  </Button>
                                </>
                              ) : (
                                <Button onClick={() => actions.adminSetTimer(30000)} variant="secondary" title={t('admin.start')}>
                                  ▶ ⏱ 30s
                                </Button>
                              )}
                              <Button onClick={handleReveal} disabled={!state.participants.some(p => p.vote !== null)}>
                                <Eye size={15} /> {t('room.reveal')}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      <button
                        className={s.mobileAdminBarToggle}
                        onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
                        aria-label={mobileAdminOpen ? 'Close panel' : 'Open panel'}
                      >
                        {mobileAdminOpen ? <X size={18} /> : <><Settings size={15} /> <ChevronUp size={15} /></>}
                      </button>
                    </div>

                    {/* Expanded: full admin panel */}
                    {mobileAdminOpen && (
                      <div className={`${s.mobileAdminBarContent} animate-fade-in`}>
                        <AdminPanel
                          state={state}
                          actions={actions}
                          isAdmin={true}
                          myVote={myVote}
                          onVote={handleVote}
                          roomId={roomId}
                          layout="remote"
                          autoReveal={autoReveal}
                          onAutoRevealChange={handleAutoRevealChange}
                          hideVoteCards
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
                  className={`${s.sidebar} ${sidebarCollapsed ? s.collapsed : ''}`}
                  style={!sidebarCollapsed ? { width: sidebarWidth } : undefined}
                >
                  <div className={s.sidebarResizeHandle} onMouseDown={handleResizeStart} />
                  <button
                    className={s.sidebarToggleBtn}
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
                      autoReveal={autoReveal}
                      onAutoRevealChange={handleAutoRevealChange}
                      collapsed={sidebarCollapsed}
                    />
                  )}
                </aside>
              )}
            </>
        </div>
      </div>


      {showUserSettings && (
        <Modal onClose={() => setShowUserSettings(false)}>
            <ModalTitle>{t('room.userSettings')}</ModalTitle>
            <form onSubmit={(e) => { e.preventDefault(); handleJoin(e); setShowUserSettings(false); }}>
              <Input
                type="text"
                placeholder={t('room.yourName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />

              <div className={s.avatarSection}>
                <span className={s.avatarLabel}>{t('room.changeAvatar')}</span>
                <button
                  type="button"
                  className={s.avatarButton}
                  onClick={() => setShowEmojiPickerSettings(!showEmojiPickerSettings)}
                >
                  {mood}
                </button>
              </div>

              <Button type="submit">{t('room.updateProfile')}</Button>
            </form>
            <Button onClick={() => setShowUserSettings(false)} variant="secondary">{t('common.cancel')}</Button>
        </Modal>
      )}

      {showShareModal && (
        <Modal onClose={() => setShowShareModal(false)}>
            <ModalTitle>{t('share.title')}</ModalTitle>
            <ModalSubtitle>{t('share.subtitle')}</ModalSubtitle>

            <div className={s.shareContent}>
              <div className={`${s.qrWrapper} animate-fade-in`}>
                <QRCodeSVG value={window.location.href} size={180} />
              </div>

              <div className={s.shareField}>
                <span className={s.shareLabel}>{t('share.roomId')}</span>
                <Input
                  type="text"
                  readOnly
                  value={roomId}
                  className={s.shareInputMono}
                />
              </div>

              <div className={s.shareField}>
                <span className={s.shareLabel}>{t('share.inviteLink')}</span>
                <div className={s.shareLinkRow}>
                  <Input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className={s.shareLinkInput}
                  />
                  <Button onClick={handleCopyLink} variant={copySuccess ? 'success' : 'secondary'} className={s.copyButton}>
                    {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={() => setShowShareModal(false)} variant="secondary">{t('common.close')}</Button>
        </Modal>
      )}

      {showQR && (
        <Modal onClose={() => { setShowQR(false); setIsQRVisible(false); }}>
            <ModalTitle>{t('remoteModal.title')}</ModalTitle>
            <ModalSubtitle>{t('remoteModal.subtitle')}</ModalSubtitle>
            <p className={s.remoteWarning}>{t('remoteModal.warning')}</p>

            <div className={s.remoteContent}>
              <LinkButton
                href={`${window.location.origin}/room/${roomId}/remote?link=${btoa(userId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={s.remoteLink}
              >
                <Smartphone size={18} /> {t('remoteModal.openNewTab')}
              </LinkButton>

              <Button
                onClick={() => setIsQRVisible(!isQRVisible)}
                variant="secondary"
                className={s.remoteQrToggle}
              >
                {isQRVisible ? t('remoteModal.hideQR') : t('remoteModal.showQR')}
              </Button>

              {isQRVisible && (
                <div className={`${s.qrWrapper} animate-fade-in`}>
                  <QRCodeSVG value={`${window.location.origin}/room/${roomId}/remote?link=${btoa(userId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`} size={200} />
                </div>
              )}
            </div>

            <Button onClick={() => { setShowQR(false); setIsQRVisible(false); }} variant="secondary">{t('common.close')}</Button>
        </Modal>
      )}

      {showEmojiPickerJoin && (
        <Modal onClose={() => setShowEmojiPickerJoin(false)} transparent>
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
        </Modal>
      )}

      {showEmojiPickerSettings && (
        <Modal onClose={() => setShowEmojiPickerSettings(false)} transparent>
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              setMood(emojiData.emoji);
              setShowEmojiPickerSettings(false);
            }}
            theme={Theme.LIGHT}
            lazyLoadEmojis={true}
            skinTonesDisabled={true}
            height={450}
            width={350}
          />
        </Modal>
      )}

      {isJoined && showWelcomeModal && (
        <WelcomeModal onClose={closeWelcomeModal} />
      )}
    </>
  );
};

export default Room;
