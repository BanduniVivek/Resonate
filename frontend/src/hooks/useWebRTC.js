import { useEffect, useRef, useCallback } from 'react';
import { useStateWithCallback } from './useStateWithCallback';
import socketInit from '../socket';
import freeice from 'freeice';
import { ACTIONS } from '../actions';

function resolveIsSpeaker(speakMode, userId, roomOwnerId, speakerIds) {
    if (roomOwnerId && String(userId) === String(roomOwnerId)) return true;
    if (speakMode === 'open') return true;
    return (speakerIds || []).some((id) => String(id) === String(userId));
}

function normalizeSpeakerIds(speakers) {
    if (!Array.isArray(speakers)) return [];
    return speakers.map((s) => String(s._id ?? s.id ?? s));
}

export const useWebRTC = (
    roomId,
    user,
    roomOwnerId,
    speakMode,
    initialSpeakers,
    onRoomEnded,
) => {
    const [clients, setClients] = useStateWithCallback([]);

    const audioElements = useRef({});
    const connections = useRef({});
    const socket = useRef(null);
    const localMediaStream = useRef(null);
    const clientsRef = useRef([]);
    const onRoomEndedRef = useRef(onRoomEnded);
    const userRef = useRef(user);
    const speakModeRef = useRef(speakMode);
    const speakerIdsRef = useRef(normalizeSpeakerIds(initialSpeakers));

    useEffect(() => {
        socket.current = socketInit();
    }, []);

    useEffect(() => {
        clientsRef.current = clients;
    }, [clients]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        speakModeRef.current = speakMode;
    }, [speakMode]);

    useEffect(() => {
        speakerIdsRef.current = normalizeSpeakerIds(initialSpeakers);
    }, [initialSpeakers]);

    useEffect(() => {
        onRoomEndedRef.current = onRoomEnded;
    }, [onRoomEnded]);

    const provideRef = (instance, userId) => {
        audioElements.current[userId] = instance;
    };

    const addNewClient = useCallback((newClient, cb) => {
        setClients((existingClients) => {
            if (existingClients.some((c) => c.id === newClient.id)) {
                return existingClients;
            }
            return [...existingClients, newClient];
        }, cb);
    }, [setClients]);

    const updateClient = useCallback(
        (userId, patch) => {
            setClients((list) =>
                list.map((c) =>
                    c.id === userId ? { ...c, ...patch } : c
                )
            );
        },
        [setClients]
    );

    useEffect(() => {
        const handler = (payload) => {
            onRoomEndedRef.current?.(payload?.message);
        };
        if (!socket.current) return undefined;
        socket.current.on(ACTIONS.ROOM_ENDED, handler);
        return () => {
            socket.current?.off(ACTIONS.ROOM_ENDED, handler);
        };
    }, []);

    useEffect(() => {
        if (!roomOwnerId) return undefined;

        let cancelled = false;

        (async () => {
            if (cancelled) return;

            try {
                localMediaStream.current =
                    await navigator.mediaDevices.getUserMedia({
                        audio: true,
                    });
            } catch (err) {
                console.log(err);
                return;
            }

            if (cancelled || !socket.current) return;

            const u = userRef.current;
            const isSpeaker = resolveIsSpeaker(
                speakModeRef.current,
                u.id,
                roomOwnerId,
                speakerIdsRef.current
            );
            addNewClient({ ...u, muted: true, isSpeaker }, () => {
                const localElement = audioElements.current[u.id];
                if (localElement) {
                    localElement.volume = 0;
                    localElement.srcObject = localMediaStream.current;
                }
            });
            socket.current.emit(ACTIONS.JOIN, {
                roomId,
                user: u,
                ownerId: roomOwnerId,
            });
        })();

        return () => {
            cancelled = true;
            if (localMediaStream.current) {
                localMediaStream.current
                    .getTracks()
                    .forEach((track) => track.stop());
                localMediaStream.current = null;
            }
            socket.current?.emit(ACTIONS.LEAVE, { roomId });
        };
    }, [roomId, user?.id, roomOwnerId]);

    useEffect(() => {
        const handleNewPeer = async ({
            peerId,
            createOffer,
            user: remoteUser,
        }) => {
            if (peerId in connections.current) {
                return console.warn(
                    `You are already connected with ${peerId}`
                );
            }

            connections.current[peerId] = new RTCPeerConnection({
                iceServers: freeice(),
            });

            connections.current[peerId].onicecandidate = (event) => {
                socket.current.emit(ACTIONS.RELAY_ICE, {
                    peerId,
                    icecandidate: event.candidate,
                });
            };

            connections.current[peerId].ontrack = ({
                streams: [remoteStream],
            }) => {
                const peerClient = {
                    ...remoteUser,
                    muted: remoteUser.muted ?? true,
                    isSpeaker: remoteUser.isSpeaker ?? false,
                };
                addNewClient(peerClient, () => {
                    if (audioElements.current[remoteUser.id]) {
                        audioElements.current[remoteUser.id].srcObject =
                            remoteStream;
                    } else {
                        let settled = false;
                        const interval = setInterval(() => {
                            if (audioElements.current[remoteUser.id]) {
                                audioElements.current[remoteUser.id].srcObject =
                                    remoteStream;
                                settled = true;
                            }
                            if (settled) {
                                clearInterval(interval);
                            }
                        }, 1000);
                    }
                });
            };

            localMediaStream.current.getTracks().forEach((track) => {
                connections.current[peerId].addTrack(
                    track,
                    localMediaStream.current
                );
            });

            if (createOffer) {
                const offer = await connections.current[peerId].createOffer();
                await connections.current[peerId].setLocalDescription(offer);
                socket.current.emit(ACTIONS.RELAY_SDP, {
                    peerId,
                    sessionDescription: offer,
                });
            }
        };

        socket.current?.on(ACTIONS.ADD_PEER, handleNewPeer);
        return () => {
            socket.current?.off(ACTIONS.ADD_PEER, handleNewPeer);
        };
    }, [addNewClient]);

    useEffect(() => {
        const onIce = ({ peerId, icecandidate }) => {
            if (icecandidate) {
                connections.current[peerId]?.addIceCandidate(icecandidate);
            }
        };
        socket.current?.on(ACTIONS.ICE_CANDIDATE, onIce);
        return () => {
            socket.current?.off(ACTIONS.ICE_CANDIDATE, onIce);
        };
    }, []);

    useEffect(() => {
        const setRemoteMedia = async ({
            peerId,
            sessionDescription: remoteSessionDescription,
        }) => {
            connections.current[peerId].setRemoteDescription(
                new RTCSessionDescription(remoteSessionDescription)
            );

            if (remoteSessionDescription.type === 'offer') {
                const connection = connections.current[peerId];
                const answer = await connection.createAnswer();
                connection.setLocalDescription(answer);
                socket.current.emit(ACTIONS.RELAY_SDP, {
                    peerId,
                    sessionDescription: answer,
                });
            }
        };

        socket.current?.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
        return () => {
            socket.current?.off(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
        };
    }, []);

    useEffect(() => {
        const handleRemovePeer = ({ peerId, userId }) => {
            if (connections.current[peerId]) {
                connections.current[peerId].close();
            }
            delete connections.current[peerId];
            delete audioElements.current[peerId];
            setClients((list) => list.filter((c) => c.id !== userId));
        };

        socket.current?.on(ACTIONS.REMOVE_PEER, handleRemovePeer);
        return () => {
            socket.current?.off(ACTIONS.REMOVE_PEER, handleRemovePeer);
        };
    }, [setClients]);

    useEffect(() => {
        const setMute = (mute, userId) => {
            const clientIdx = clientsRef.current
                .map((client) => client.id)
                .indexOf(userId);
            if (clientIdx === -1) return;

            const connectedClientsClone = JSON.parse(
                JSON.stringify(clientsRef.current)
            );
            connectedClientsClone[clientIdx].muted = mute;
            setClients(() => connectedClientsClone);
        };

        socket.current?.on(ACTIONS.MUTE, ({ userId }) => {
            setMute(true, userId);
        });
        socket.current?.on(ACTIONS.UNMUTE, ({ userId }) => {
            setMute(false, userId);
        });

        return () => {
            socket.current?.off(ACTIONS.MUTE);
            socket.current?.off(ACTIONS.UNMUTE);
        };
    }, [setClients]);

    useEffect(() => {
        const onPromoted = ({ userId }) => {
            updateClient(userId, { isSpeaker: true });
        };

        const onDemoted = ({ userId }) => {
            updateClient(userId, { isSpeaker: false, muted: true });
            if (userId === userRef.current?.id) {
                if (localMediaStream.current) {
                    localMediaStream.current.getTracks()[0].enabled = false;
                }
                socket.current?.emit(ACTIONS.MUTE, {
                    roomId,
                    userId,
                });
            }
        };

        socket.current?.on(ACTIONS.SPEAKER_PROMOTED, onPromoted);
        socket.current?.on(ACTIONS.SPEAKER_DEMOTED, onDemoted);
        return () => {
            socket.current?.off(ACTIONS.SPEAKER_PROMOTED, onPromoted);
            socket.current?.off(ACTIONS.SPEAKER_DEMOTED, onDemoted);
        };
    }, [roomId, updateClient]);

    const handleMute = useCallback(
        (isMute, userId) => {
            const client = clientsRef.current.find((c) => c.id === userId);
            if (!client?.isSpeaker) return;

            if (userId !== userRef.current?.id) return;

            let settled = false;
            const interval = setInterval(() => {
                if (localMediaStream.current) {
                    localMediaStream.current.getTracks()[0].enabled = !isMute;
                    if (isMute) {
                        socket.current.emit(ACTIONS.MUTE, {
                            roomId,
                            userId,
                        });
                    } else {
                        socket.current.emit(ACTIONS.UNMUTE, {
                            roomId,
                            userId,
                        });
                    }
                    settled = true;
                }
                if (settled) {
                    clearInterval(interval);
                }
            }, 200);
        },
        [roomId]
    );

    useEffect(() => {
        return () => {
            Object.values(connections.current).forEach((pc) => pc?.close());
            connections.current = {};
            audioElements.current = {};
        };
    }, []);

    return {
        clients,
        provideRef,
        handleMute,
    };
};
