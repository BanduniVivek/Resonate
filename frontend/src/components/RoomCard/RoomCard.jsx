import styles from './RoomCard.module.css';
import { useNavigate } from 'react-router-dom';
import { formatStartedAgo, formatEndedAgo } from '../../utils/formatRoomTime';

const RoomCard = ({ room, isClosed = false }) => {
    const navigate = useNavigate();
    const speakers = Array.isArray(room.speakers) ? room.speakers : [];
    const participantCount =
        room.participantCount ?? speakers.length ?? 0;

    const timeLabel = isClosed
        ? formatEndedAgo(room.endedAt)
        : formatStartedAgo(room.createdAt);

    const handleClick = () => {
        if (isClosed) return;
        navigate(`/room/${room.id}`);
    };

    return (
        <div
            role={isClosed ? undefined : 'button'}
            tabIndex={isClosed ? undefined : 0}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (isClosed) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    handleClick();
                }
            }}
            className={`${styles.card} ${isClosed ? styles.cardClosed : ''}`}
        >
            <h3 className={styles.topic}>{room.topic}</h3>

            <div
                className={`${styles.speakers} ${
                    speakers.length === 1 ? styles.singleSpeaker : ''
                }`}
            >
                <div className={styles.avatars}>
                    {speakers.slice(0, 2).map((speaker) => (
                        <img
                            key={speaker._id ?? speaker.id}
                            src={
                                speaker.avatar ||
                                '/images/monkey-avatar.png'
                            }
                            alt=""
                        />
                    ))}
                </div>
                <div className={styles.names}>
                    {speakers.slice(0, 2).map((speaker) => (
                        <div
                            key={speaker._id ?? speaker.id}
                            className={styles.nameWrapper}
                        >
                            <span>{speaker.name || 'Speaker'}</span>
                            <img
                                src="/images/chat-bubble.png"
                                alt=""
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.meta}>
                <div className={styles.peopleCount}>
                    <img src="/images/user-icon.png" alt="" />
                    <span>
                        {participantCount}{' '}
                        {participantCount === 1
                            ? 'participant'
                            : 'participants'}
                    </span>
                </div>
                <span className={styles.time}>{timeLabel}</span>
            </div>

            {isClosed && (
                <span className={styles.closedBadge}>Ended</span>
            )}
            {!isClosed && room.roomType === 'private' && (
                <span className={styles.privateBadge}>Private</span>
            )}
        </div>
    );
};

export default RoomCard;
