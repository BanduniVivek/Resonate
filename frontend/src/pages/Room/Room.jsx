import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Room.module.css';
import { useSelector } from 'react-redux';
import {
    getRoom,
    getRoomInviteCode,
    promoteSpeaker,
    demoteSpeaker,
} from '../../http';
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
    const [openMenuClientId, setOpenMenuClientId] = useState(null);
    const menuRef = useRef(null);
    const ownerId = getRoomOwnerId(room);
    const isHost = isRoomOwner(room, user.id);
    const speakMode = room.speakMode || 'moderated';
    const isPrivateOwner =
        room.roomType === 'private' && isHost;

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
        speakMode,
        room.speakers,
        onRoomEnded,
    );
    const [isMuted, setMuted] = useState(true);
    const [handRaised, setHandRaised] = useState(false);

    const selfClient = clients.find((c) => c.id === user.id);
    const speakers = clients.filter((c) => c.isSpeaker);
    const listeners = clients.filter((c) => !c.isSpeaker);

    useEffect(() => {
        handleMute(isMuted, user.id);
    }, [isMuted, handleMute, user.id]);

    useEffect(() => {
        if (selfClient?.muted) {
            setMuted(true);
        }
    }, [selfClient?.muted]);

    useEffect(() => {
        if (!openMenuClientId) return undefined;
        const onDocClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuClientId(null);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [openMenuClientId]);

    const handleMuteClick = () => {
        if (!selfClient?.isSpeaker) return;
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

    async function handlePromote(clientId) {
        setOpenMenuClientId(null);
        try {
            await promoteSpeaker(roomId, clientId);
        } catch (err) {
            console.log(err.response?.data?.message || err.message);
        }
    }

    async function handleDemote(clientId) {
        setOpenMenuClientId(null);
        try {
            await demoteSpeaker(roomId, clientId);
        } catch (err) {
            console.log(err.response?.data?.message || err.message);
        }
    }

    function getMenuOptions(client) {
        if (!isHost || String(client.id) === String(user.id)) return [];

        const options = [];
        if (!client.isSpeaker && speakMode === 'moderated') {
            options.push({
                label: 'Make speaker',
                action: () => handlePromote(client.id),
            });
        }
        if (client.isSpeaker) {
            options.push({
                label: 'Remove speaker',
                action: () => handleDemote(client.id),
            });
        }
        return options;
    }

    function renderClient(client) {
        const menuOptions = getMenuOptions(client);
        const showMenu = menuOptions.length > 0;

        return (
            <div className={styles.client} key={client.id}>
                <div
                    className={`${styles.userHead} ${
                        client.isSpeaker && !client.muted
                            ? styles.userHeadSpeaker
                            : ''
                    }`}
                >
                    <img
                        className={styles.userAvatar}
                        src={
                            client.avatar || '/images/monkey-avatar.png'
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
                            <img src="/images/mic-mute.png" alt="" />
                        </span>
                    )}
                    {showMenu && (
                        <div
                            className={styles.clientMenuWrap}
                            ref={
                                openMenuClientId === client.id
                                    ? menuRef
                                    : null
                            }
                        >
                            <button
                                type="button"
                                className={styles.clientMenuBtn}
                                aria-label="Speaker options"
                                onClick={() =>
                                    setOpenMenuClientId((prev) =>
                                        prev === client.id
                                            ? null
                                            : client.id
                                    )
                                }
                            >
                                ⋮
                            </button>
                            {openMenuClientId === client.id && (
                                <div className={styles.clientMenu}>
                                    {menuOptions.map((opt) => (
                                        <button
                                            key={opt.label}
                                            type="button"
                                            className={styles.clientMenuItem}
                                            onClick={opt.action}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <h4>{client.name}</h4>
            </div>
        );
    }

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
                <div className={styles.stage}>
                    <section
                        className={styles.speakersSection}
                        aria-label="Speakers"
                    >
                        <h3 className={styles.sectionLabel}>
                            Speakers
                            <span className={styles.sectionCount}>
                                {speakers.length}
                            </span>
                        </h3>
                        <div className={styles.clientsList}>
                            {speakers.length === 0 ? (
                                <p className={styles.sectionEmpty}>
                                    No speakers yet
                                </p>
                            ) : (
                                speakers.map(renderClient)
                            )}
                        </div>
                    </section>

                    <div
                        className={styles.stageDivider}
                        role="separator"
                        aria-hidden="true"
                    />

                    <section
                        className={styles.listenersSection}
                        aria-label="Listeners"
                    >
                        <h3 className={styles.sectionLabel}>
                            Listeners
                            <span className={styles.sectionCount}>
                                {listeners.length}
                            </span>
                        </h3>
                        <div className={styles.clientsList}>
                            {listeners.length === 0 ? (
                                <p className={styles.sectionEmpty}>
                                    No listeners
                                </p>
                            ) : (
                                listeners.map(renderClient)
                            )}
                        </div>
                    </section>
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
                        onClick={handleMuteClick}
                        disabled={!selfClient?.isSpeaker}
                        className={`${styles.barBtn} ${styles.barBtnMic} ${
                            selfClient?.muted ? styles.barBtnMuted : ''
                        } ${!selfClient?.isSpeaker ? styles.barBtnDisabled : ''}`}
                        aria-label={
                            !selfClient?.isSpeaker
                                ? 'Only speakers can unmute'
                                : selfClient?.muted
                                  ? 'Unmute microphone'
                                  : 'Mute microphone'
                        }
                        title={
                            !selfClient?.isSpeaker
                                ? 'Only speakers can unmute'
                                : selfClient?.muted
                                  ? 'Unmute'
                                  : 'Mute'
                        }
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
            } catch (err) {
                if (cancelled) return;
                setRoom(null);
                const message =
                    err.response?.data?.message ||
                    'Could not load this room.';
                navigate('/rooms', {
                    state: { accessDeniedMessage: message },
                });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [roomId, navigate]);

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
