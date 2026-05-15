import { useState, useEffect, useCallback } from 'react';
import styles from './Room.module.css';
import { useSelector } from 'react-redux';
import { getRoom } from '../../http';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../../hooks/useWebRTC';

function getRoomOwnerId(room) {
    if (!room?.ownerId) return null;
    const o = room.ownerId;
    return o._id ?? o.id ?? o;
}

function RoomVoiceSession({ room, roomId }) {
    const user = useSelector((state) => state.auth.user);
    const navigate = useNavigate();
    const [roomEndedMessage, setRoomEndedMessage] = useState(null);
    const ownerId = getRoomOwnerId(room);

    const onRoomEnded = useCallback((message) => {
        setRoomEndedMessage(message || 'The room has ended');
        window.setTimeout(() => {
            navigate('/rooms');
        }, 2500);
    }, [navigate]);

    const { clients, provideRef, handleMute } = useWebRTC(
        roomId,
        user,
        String(ownerId),
        onRoomEnded
    );
    const [isMuted, setMuted] = useState(true);

    useEffect(() => {
        handleMute(isMuted, user.id);
    }, [isMuted, handleMute, user.id]);

    const handleMuteClick = (clientId) => {
        if (clientId !== user.id) return;
        setMuted((prev) => !prev);
    };

    const handManualLeave = () => {
        navigate('/rooms');
    };

    return (
        <div>
            {roomEndedMessage && (
                <div className={styles.roomEndedBanner} role="status">
                    {roomEndedMessage}
                </div>
            )}
            <div className="container">
                <button
                    type="button"
                    onClick={handManualLeave}
                    className={styles.goBack}
                >
                    <img src="/images/arrow-left.png" alt="arrow-left" />
                    <span>All voice rooms</span>
                </button>
            </div>

            <div className={styles.clientsWrap}>
                <div className={styles.header}>
                    {room && <h2 className={styles.topic}>{room.topic}</h2>}
                    <div className={styles.actions}>
                        <button type="button" className={styles.actionBtn}>
                            <img src="/images/palm.png" alt="palm-icon" />
                        </button>
                        <button
                            type="button"
                            onClick={handManualLeave}
                            className={styles.actionBtn}
                        >
                            <img src="/images/win.png" alt="win-icon" />
                            <span>Leave quietly</span>
                        </button>
                    </div>
                </div>
                <div className={styles.clientsList}>
                    {clients.map((client) => {
                        return (
                            <div className={styles.client} key={client.id}>
                                <div className={styles.userHead}>
                                    <img
                                        className={styles.userAvatar}
                                        src={
                                            client.avatar ||
                                            '/images/monkey-avatar.png'
                                        }
                                        alt=""
                                    />
                                    <audio
                                        autoPlay
                                        playsInline
                                        ref={(instance) => {
                                            provideRef(instance, client.id);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleMuteClick(client.id)
                                        }
                                        className={styles.micBtn}
                                    >
                                        {client.muted ? (
                                            <img
                                                className={styles.mic}
                                                src="/images/mic-mute.png"
                                                alt="mic"
                                            />
                                        ) : (
                                            <img
                                                className={styles.micImg}
                                                src="/images/mic.png"
                                                alt="mic"
                                            />
                                        )}
                                    </button>
                                </div>
                                <h4>{client.name}</h4>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const Room = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await getRoom(roomId);
                if (cancelled) return;
                setRoom(data);
                setLoadError(null);
            } catch {
                if (cancelled) return;
                setRoom(null);
                setLoadError('Could not load this room.');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [roomId]);

    if (loadError) {
        return (
            <div className="container">
                <p className={styles.loadError}>{loadError}</p>
                <button
                    type="button"
                    onClick={() => navigate('/rooms')}
                    className={styles.goBack}
                >
                    <img src="/images/arrow-left.png" alt="" />
                    <span>Back to rooms</span>
                </button>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="container">
                <p className={styles.loadingHint}>Loading room…</p>
            </div>
        );
    }

    const ownerId = getRoomOwnerId(room);
    if (!ownerId) {
        return (
            <div className="container">
                <p className={styles.loadError}>
                    This room is missing owner information.
                </p>
                <button
                    type="button"
                    onClick={() => navigate('/rooms')}
                    className={styles.goBack}
                >
                    <span>Back to rooms</span>
                </button>
            </div>
        );
    }

    return <RoomVoiceSession room={room} roomId={roomId} />;
};

export default Room;
