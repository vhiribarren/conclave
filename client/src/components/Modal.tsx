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
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface Props {
  children: React.ReactNode;
  /** Called when clicking the overlay. If omitted the modal is non-dismissible. */
  onClose?: () => void;
  /** Max-width applied to the content container. */
  maxWidth?: string;
  /** Use transparent content (e.g. for emoji picker). */
  transparent?: boolean;
  /** Override the default content class (e.g. for custom modal layouts). */
  contentClassName?: string;
}

export const Modal: React.FC<Props> = ({ children, onClose, maxWidth, transparent, contentClassName }) =>
  createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${contentClassName ?? (transparent ? styles.contentTransparent : styles.content)} animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
        style={maxWidth ? { maxWidth } : undefined}
      >
        {children}
      </div>
    </div>,
    document.body
  );

const ModalTitle: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <h2 className={styles.title} style={style}>{children}</h2>
);

const ModalSubtitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={styles.subtitle}>{children}</p>
);

export { ModalTitle, ModalSubtitle };
