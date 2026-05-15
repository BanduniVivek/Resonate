import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AddRoomModel from '../../components/AddRoomModal/AddRoomModal';
import JoinWithCodeModal from '../../components/JoinWithCodeModal/JoinWithCodeModal';
import styles from './Rooms.module.css';
import RoomCard from '../../components/RoomCard/RoomCard';
import { getAllRooms, getClosedRooms, searchRooms } from '../../http';

const TABS = [
    { id: 'open', label: 'Open' },
    { id: 'subscriber', label: 'Subscriber' },
    { id: 'closed', label: 'Closed' },
];

function isActiveRoom(room) {
    return room.status !== 'closed';
}

const Rooms = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const accessDeniedMessage = location.state?.accessDeniedMessage;
    const [showModal, setShowModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [allRooms, setAllRooms] = useState([]);
    const [closedRooms, setClosedRooms] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [activeTab, setActiveTab] = useState('open');
    const [visibleDeniedMessage, setVisibleDeniedMessage] = useState(
        accessDeniedMessage || null
    );

    useEffect(() => {
        if (!accessDeniedMessage) return undefined;
        let cancelled = false;
        (async () => {
            await Promise.resolve();
            if (cancelled) return;
            setVisibleDeniedMessage(accessDeniedMessage);
            navigate(location.pathname, { replace: true, state: {} });
        })();
        const timer = setTimeout(() => setVisibleDeniedMessage(null), 3000);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [accessDeniedMessage, location.pathname, navigate]);

    function openModal() {
        setShowModal(true);
    }

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const [activeRes, closedRes] = await Promise.all([
                    getAllRooms(),
                    getClosedRooms(),
                ]);
                setAllRooms(
                    Array.isArray(activeRes.data) ? activeRes.data : []
                );
                setClosedRooms(
                    Array.isArray(closedRes.data) ? closedRes.data : []
                );
            } catch {
                setAllRooms([]);
                setClosedRooms([]);
            }
        };
        fetchRooms();
        const interval = setInterval(fetchRooms, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Promise.resolve();
            if (cancelled) return;
            const q = searchQuery.trim();
            if (!q) {
                setSearchResults(null);
                return;
            }
            await new Promise((r) => setTimeout(r, 320));
            if (cancelled) return;
            try {
                const { data } = await searchRooms(q);
                if (!cancelled) {
                    setSearchResults(Array.isArray(data) ? data : []);
                }
            } catch {
                if (!cancelled) setSearchResults([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [searchQuery]);

    const sourceRooms = searchResults === null ? allRooms : searchResults;

    const { openRooms, subscriberRooms } = useMemo(() => {
        const open = [];
        const subscriber = [];

        for (const room of sourceRooms) {
            if (!isActiveRoom(room)) continue;

            if (room.roomType === 'subscriber') {
                subscriber.push(room);
            } else if (room.roomType === 'open') {
                open.push(room);
            }
        }

        return {
            openRooms: open,
            subscriberRooms: subscriber,
        };
    }, [sourceRooms]);

    const filteredClosedRooms = useMemo(() => {
        if (searchResults === null) return closedRooms;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return closedRooms;
        return closedRooms.filter((room) =>
            (room.topic || '').toLowerCase().includes(q)
        );
    }, [closedRooms, searchResults, searchQuery]);

    const tabCounts = useMemo(
        () => ({
            open: openRooms.length,
            subscriber: subscriberRooms.length,
            closed: filteredClosedRooms.length,
        }),
        [openRooms.length, subscriberRooms.length, filteredClosedRooms.length]
    );

    const displayedRooms =
        activeTab === 'open'
            ? openRooms
            : activeTab === 'subscriber'
              ? subscriberRooms
              : filteredClosedRooms;

    const emptyMessage =
        searchQuery.trim() && displayedRooms.length === 0
            ? 'No rooms match that search in this tab.'
            : activeTab === 'closed'
              ? 'No rooms ended in the last 24 hours.'
              : activeTab === 'subscriber'
                ? 'No subscriber rooms. Follow creators to see theirs here.'
                : 'No open rooms yet. Start one!';

    return (
        <>
            <div className="container">
                {visibleDeniedMessage && (
                    <p className={styles.accessDenied} role="alert">
                        {visibleDeniedMessage}
                    </p>
                )}
                <div className={styles.roomsHeader}>
                    <div className={styles.left}>
                        <span className={styles.heading}>Voice rooms</span>
                        <div className={styles.searchBox}>
                            <img src="/images/search-icon.png" alt="" />
                            <input
                                type="search"
                                className={styles.searchInput}
                                placeholder="Search rooms by topic"
                                value={searchQuery}
                                onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                }
                                aria-label="Search rooms by topic"
                            />
                        </div>
                    </div>
                    <div className={styles.right}>
                        <button
                            type="button"
                            onClick={() => setShowJoinModal(true)}
                            className={styles.joinCodeButton}
                        >
                            <img src="/images/lock.png" alt="" />
                            <span>Join with code</span>
                        </button>
                        <button
                            type="button"
                            onClick={openModal}
                            className={styles.startRoomButton}
                        >
                            <img
                                src="/images/add-room-icon.png"
                                alt="add-room"
                            />
                            <span>Start a room</span>
                        </button>
                    </div>
                </div>

                <div
                    className={styles.tabs}
                    role="tablist"
                    aria-label="Room categories"
                >
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`${styles.tab} ${
                                activeTab === tab.id ? styles.tabActive : ''
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label} ({tabCounts[tab.id]})
                        </button>
                    ))}
                </div>

                <div className={styles.roomList} role="tabpanel">
                    {displayedRooms.length === 0 && (
                        <p className={styles.emptyHint}>{emptyMessage}</p>
                    )}
                    {displayedRooms.map((room) => (
                        <RoomCard
                            key={room.id}
                            room={room}
                            isClosed={activeTab === 'closed'}
                        />
                    ))}
                </div>
            </div>
            {showModal && (
                <AddRoomModel onClose={() => setShowModal(false)} />
            )}
            {showJoinModal && (
                <JoinWithCodeModal onClose={() => setShowJoinModal(false)} />
            )}
        </>
    );
};

export default Rooms;
