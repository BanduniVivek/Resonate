import { useState, useEffect, useCallback } from 'react';
import styles from './Room.module.css';
import { useSelector } from 'react-redux';
import { getRoom, getRoomInviteCode } from '../../http';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../../hooks/useWebRTC';
import InviteCodeModal from '../../components/InviteCodeModal/InviteCodeModal';

function getRoomOwnerId(room) {
    if (!room?.ownerId) return null;
    const o = room.ownerId;
    return o._id ?? o.id ?? o;
}

function isRoomOwner(room, userId) {
    const ownerId = getRoomOwnerId(room);
    if (!ownerId || !userId) return false;
    return String(ownerId) === String(userId);
}

function RoomVoiceSession({ room, roomId }) {
    const user = useSelector((state) => state.auth.user);
    const navigate = useNavigate();
    const [roomEndedMessage, setRoomEndedMessage] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const ownerId = getRoomOwnerId(room);
    const isPrivateOwner =
        room.roomType === 'private' && isRoomOwner(room, user.id);

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
        onRoomEnded,
    );
    const [isMuted, setMuted] = useState(true);
    const [handRaised, setHandRaised] = useState(false);

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

    async function handleShowInviteCode() {
        setShowInviteModal(true);
        setInviteCode('');
        setInviteError('');
        setInviteLoading(true);
        try {
            const { data } = await getRoomInviteCode(roomId);
            setInviteCode(data.inviteCode);
        } catch (err) {
            setInviteError(
                err.response?.data?.message || 'Could not load invite code'
            );
        } finally {
            setInviteLoading(false);
        }
    }

    const selfClient = clients.find((c) => c.id === user.id);

    return (
        <div className={styles.roomPage}>
            {showInviteModal && (
                <InviteCodeModal
                    inviteCode={inviteCode}
                    loading={inviteLoading}
                    error={inviteError}
                    onClose={() => setShowInviteModal(false)}
                />
            )}
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
                    {isPrivateOwner && (
                        <div className={styles.actions}>
                            <button
                                type="button"
                                onClick={handleShowInviteCode}
                                className={`${styles.actionBtn} ${styles.inviteBtn}`}
                            >
                                <span>Show invite code</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className={styles.clientsList}>
                    {clients.map((client) => (
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
                                {client.muted && (
                                    <span
                                        className={styles.micBadge}
                                        aria-label="Muted"
                                    >
                                        <img
                                            src="/images/mic-mute.png"
                                            alt=""
                                        />
                                    </span>
                                )}
                            </div>
                            <h4>{client.name}</h4>
                        </div>
                    ))}
                </div>
            </div>

            <nav
                className={styles.bottomBar}
                aria-label="Room controls"
            >
                <div className={styles.bottomBarInner}>
                    <button
                        type="button"
                        onClick={() => setHandRaised((prev) => !prev)}
                        className={`${styles.barBtn} ${styles.barBtnRaise} ${
                            handRaised ? styles.barBtnActive : ''
                        }`}
                        aria-label={
                            handRaised ? 'Lower hand' : 'Raise hand'
                        }
                        title={handRaised ? 'Lower hand' : 'Raise hand'}
                    >
                        <img
    src={
        handRaised
            ? '/images/hand-stop.png'
            : '/images/hand-off.png'
    }
    alt=""
/>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMuteClick(user.id)}
                        className={`${styles.barBtn} ${styles.barBtnMic} ${
                            selfClient?.muted ? styles.barBtnMuted : ''
                        }`}
                        aria-label={
                            selfClient?.muted ? 'Unmute microphone' : 'Mute microphone'
                        }
                        title={selfClient?.muted ? 'Unmute' : 'Mute'}
                    >
                        <img
                            src={
                                selfClient?.muted
                                    ? '/images/mic-mute.png'
                                    : '/images/mic.png'
                            }
                            alt=""
                        />
                    </button>
                    <button
                        type="button"
                        onClick={handManualLeave}
                        className={`${styles.barBtn} ${styles.barBtnLeave}`}
                        title="Leave room"
                    >
                        <img src="/images/phone-off.png" alt="" />
                        
                    </button>
                </div>
            </nav>
        </div>
    );
}

const Room = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await getRoom(roomId);
                if (cancelled) return;
                setRoom(data);
            } catch(err){
                if (cancelled) return;
                setRoom(null);
                const message = err.response?.data?.message || 'Could not load this room.';
                navigate('/rooms', { state: { accessDeniedMessage: message } });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [roomId]);

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
