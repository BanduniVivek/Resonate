import { useState, useEffect } from 'react';
import AddRoomModel from '../../components/AddRoomModal/AddRoomModal';
import styles from './Rooms.module.css';
import RoomCard from '../../components/RoomCard/RoomCard';
import { getAllRooms, searchRooms } from '../../http';

const Rooms = () => {
    const [showModal, setShowModal] = useState(false);
    const [allRooms, setAllRooms] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);

    function openModal() {
        setShowModal(true);
    }

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const { data } = await getAllRooms();
                setAllRooms(Array.isArray(data) ? data : []);
            } catch {
                setAllRooms([]);
            }
        };
        fetchRooms();
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

    const displayedRooms =
        searchResults === null ? allRooms : searchResults;

    return (
        <>
            <div className="container">
                <div className={styles.roomsHeader}>
                    <div className={styles.left}>
                        <span className={styles.heading}>All voice rooms</span>
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

                <div className={styles.roomList}>
                    {displayedRooms.length === 0 && (
                        <p className={styles.emptyHint}>
                            {searchQuery.trim()
                                ? 'No rooms match that topic.'
                                : 'No rooms yet. Start one!'}
                        </p>
                    )}
                    {displayedRooms.map((room) => (
                        <RoomCard key={room.id} room={room} />
                    ))}
                </div>
            </div>
            {showModal && (
                <AddRoomModel onClose={() => setShowModal(false)} />
            )}
        </>
    );
};

export default Rooms;
