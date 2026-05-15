import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { searchUsers } from '../../../http';
import styles from './NavFindPeople.module.css';

const avatarFallback = '/images/monkey-avatar.png';

function normalizeId(raw) {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && typeof raw.toString === 'function') {
        return raw.toString();
    }
    return String(raw);
}

export default function NavFindPeople() {
    const me = useSelector((state) => state.auth.user);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    useEffect(() => {
        //debounce function to prevent multiple requests
        let cancelled = false;
        (async () => {
            if (cancelled) return;
            const q = query.trim();
            if (!q) {
                setResults([]);
                return;
            }
            await new Promise((r) => setTimeout(r, 320));
            if (cancelled) return;
            try {
                const { data } = await searchUsers(q);
                if (!cancelled) {
                    setResults(Array.isArray(data) ? data : []);
                }
            } catch {
                if (!cancelled) setResults([]);
            }
        })();
        return () => {
            cancelled = true; 
            //if user types again first return is executed and makes previous request stale
        };
    }, [query]);

    const filtered = results.filter(
        (u) => normalizeId(u._id ?? u.id) !== normalizeId(me?.id)
    );

    const handlePick = () => {
        setQuery('');
        setResults([]);
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.searchRow}>
                <img
                    src="/images/search-icon.png"
                    alt=""
                    className={styles.icon}
                />
                <input
                    type="search"
                    className={styles.input}
                    placeholder="Find people"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Find people by name"
                />
            </div>
            {query.trim() && filtered.length > 0 && (
                <ul className={styles.dropdown}>
                    {filtered.map((u) => {
                        const id = normalizeId(u._id ?? u.id);
                        return (
                            <li key={id}>
                                <Link
                                    className={styles.resultRow}
                                    to={`/profile/${id}`}
                                    onClick={handlePick}
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
            )}
        </div>
    );
}
