import { useState } from 'react';
import styles from './InviteCodeModal.module.css';

const InviteCodeModal = ({ inviteCode, loading, error, onClose }) => {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        if (!inviteCode) return;
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className={styles.modalMask} onClick={onClose}>
            <div
                className={styles.modalBody}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className={styles.closeButton}
                    aria-label="Close"
                >
                    <img src="/images/close.png" alt="" />
                </button>
                <h3 className={styles.heading}>Invite code</h3>
                <p className={styles.hint}>
                    Share this code so others can join your private room
                </p>
                {loading && (
                    <p className={styles.status}>Loading code…</p>
                )}
                {error && (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                )}
                {!loading && !error && inviteCode && (
                    <>
                        <div className={styles.codeBox}>{inviteCode}</div>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={styles.copyButton}
                        >
                            {copied ? 'Copied!' : 'Copy code'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default InviteCodeModal;
