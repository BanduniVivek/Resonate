import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './FollowersFollowingOverlay.module.css';

const avatarFallback = '/images/monkey-avatar.png';

function normalizeId(raw) {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && typeof raw.toString === 'function') {
        return raw.toString();
    }
    return String(raw);
}

export default function FollowersFollowingOverlay({ mode, users, onClose }) {
    useEffect(() => {
        if (!mode) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mode, onClose]);

    if (!mode) return null;

    const title = mode === 'followers' ? 'Followers' : 'Following';
    const list = Array.isArray(users) ? users : [];

    return (
        <div
            className={styles.root}
            role="dialog"
            aria-modal="true"
            aria-labelledby="follow-overlay-title"
        >
            <button
                type="button"
                className={styles.backdrop}
                aria-label="Close list"
                onClick={onClose}
            />
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h2 id="follow-overlay-title" className={styles.title}>
                        {title}
                    </h2>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
                <ul className={styles.list}>
                    {list.length === 0 && (
                        <li className={styles.empty}>
                            {mode === 'followers'
                                ? 'No followers yet.'
                                : 'Not following anyone yet.'}
                        </li>
                    )}
                    {list.map((u) => {
                        const fid = normalizeId(u._id ?? u.id);
                        return (
                            <li key={fid}>
                                <Link
                                    className={styles.row}
                                    to={`/profile/${fid}`}
                                    onClick={onClose}
                                >
                                    <img
                                        className={styles.avatar}
                                        src={u.avatar || avatarFallback}
                                        alt=""
                                    />
                                    <span>{u.name || 'User'}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
