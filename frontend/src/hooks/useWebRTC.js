import { useEffect, useRef, useCallback } from 'react';
import { useStateWithCallback } from './useStateWithCallback';
import socketInit from '../socket';
import freeice from 'freeice';
import { ACTIONS } from '../actions';

export const useWebRTC = (roomId, user, roomOwnerId, onRoomEnded) => {
    const [clients, setClients] = useStateWithCallback([]);
       //set client can now also have a callback


    const audioElements = useRef({});  //Stores references to <audio> DOM elements.
    const connections = useRef({}); //Stores WebRTC peer connections.
    const socket = useRef(null);  //Stores Socket.IO connection.
    const localMediaStream = useRef(null);  //Stores your microphone audio stream.
    const clientsRef = useRef([]);  //Stores latest clients array
    const onRoomEndedRef = useRef(onRoomEnded);
    const userRef = useRef(user);

    useEffect(() => {
        socket.current = socketInit();
    }, []);

    useEffect(() => {
        clientsRef.current = clients;
    }, [clients]);

    const provideRef = (instance, userId) => {
        audioElements.current[userId] = instance;
    };

    const addNewClient = useCallback(
        (newClient, cb) => {
            //check if client is already in list
            const lookingFor = clients.find(
                (client) => client.id === newClient.id
            );
            console.log('clients', clients, lookingFor);

            if (lookingFor === undefined) {
                // new client gets added in clients and its audioelement gets created
                setClients((existingClients) => [...existingClients, newClient],
                    cb
                );
            }
        },
        [setClients]
    );

    
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    
    useEffect(() => {
        onRoomEndedRef.current = onRoomEnded;
    }, [onRoomEnded]);

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

        const startCapture = async () => {
            localMediaStream.current =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
        };

        let cancelled = false;

        startCapture().then(() => {
            if (cancelled || !socket.current) return;
            const u = userRef.current;
            addNewClient({ ...u, muted: true }, () => {
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
        });

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

     // Handle new peer
    useEffect(()=>{

        const handleNewPeer = async ({
            peerId,
            createOffer,
            user: remoteUser,
        }) => {
            // If already connected then prevent connecting again
            if (peerId in connections.current) {
                return console.warn(
                    `You are already connected with ${peerId} (${user.name})`
                );
            }

            // Store it to connections
            connections.current[peerId] = new RTCPeerConnection({
                iceServers: freeice(),
            });

            // Handle new ice candidate on this peer connection
            //whenever new ice candidate is found send an relay-ice event 
            
            connections.current[peerId].onicecandidate = (event) => {
                socket.current.emit(ACTIONS.RELAY_ICE, {
                    peerId,
                    icecandidate: event.candidate,
                });
            };

            // Handle on track event on this connection
            connections.current[peerId].ontrack = ({
                streams: [remoteStream],
            }) => {
                addNewClient({ ...remoteUser, muted: true }, () => {
                    // console.log('peer', audioElements.current, peerId);

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

            // Add our track to the remote user
            localMediaStream.current.getTracks().forEach((track) => {
                connections.current[peerId].addTrack(
                    track,
                    localMediaStream.current
                );
            });

            // Create an offer if required
            if (createOffer) {
                const offer = await connections.current[peerId].createOffer();

                // Set as local description
                await connections.current[peerId].setLocalDescription(offer);

                // send offer to the server
                socket.current.emit(ACTIONS.RELAY_SDP, {
                    peerId,
                    sessionDescription: offer,
                });
            }
        };

        
        // Listen for add peer event from ws
        socket.current.on(ACTIONS.ADD_PEER, handleNewPeer);
        return () => {
            socket.current.off(ACTIONS.ADD_PEER);
        };


    }, [clients]);



    // Handle ice candidate
    useEffect(() => {
        socket.current.on(ACTIONS.ICE_CANDIDATE, ({ peerId, icecandidate }) => {
            // console.log('ices', connections.current[peerId]);
            if (icecandidate) {
                connections.current[peerId].addIceCandidate(icecandidate);
            }
        });

        return () => {
            socket.current.off(ACTIONS.ICE_CANDIDATE);
        };
    }, []);


    // Handle session description

    useEffect(() => {
        const setRemoteMedia = async ({
            peerId,
            sessionDescription: remoteSessionDescription,
        }) => {
            connections.current[peerId].setRemoteDescription(
                new RTCSessionDescription(remoteSessionDescription)
            );

            // If session descrition is offer then create an answer
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

        socket.current.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
        return () => {
            socket.current.off(ACTIONS.SESSION_DESCRIPTION);
        };
    }, []);


    //handle remove peer
    useEffect(() => {
        const handleRemovePeer = ({ peerId, userId }) => {
            console.log('leaving', peerId, userId);

            if (connections.current[peerId]) {
                connections.current[peerId].close();
            }

            delete connections.current[peerId];
            delete audioElements.current[peerId];

            setClients((list) => list.filter((c) => c.id !== userId));
        };

        socket.current.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

        return () => {
            socket.current.off(ACTIONS.REMOVE_PEER);
        };
    }, []);


    // handle mute and unmute
    useEffect(() => {
        socket.current.on(ACTIONS.MUTE, ({ userId }) => {
            console.log('muting', userId);
            setMute(true, userId);
        });

        socket.current.on(ACTIONS.UNMUTE, ({ userId }) => {
            console.log('unmuting', userId);
            setMute(false, userId);
        });

        const setMute = (mute, userId) => {
            const clientIdx = clientsRef.current
                .map((client) => client.id)
                .indexOf(userId);

            // console.log('idx', clientIdx);

            // const connectedClients = clientsRef.current.filter(
            //     (client) => client.id !== userId
            // );

            const connectedClientsClone = JSON.parse(
                JSON.stringify(clientsRef.current)
            );

            if (clientIdx > -1) {
                connectedClientsClone[clientIdx].muted = mute;
                console.log('muuuu', connectedClientsClone);
                setClients((_) => connectedClientsClone);
            }
        };
    }, []);

    const handleMute = useCallback((isMute, userId) => {
        let settled = false;
        console.log("mute", isMute);

        if (userId === user.id) {
            let interval = setInterval(() => {
                if (localMediaStream.current) {
                    localMediaStream.current.getTracks()[0].enabled = !isMute;
                    if (isMute) {
                        socket.current.emit(ACTIONS.MUTE, {
                            roomId,
                            userId: user.id,
                        });
                    } else {
                        socket.current.emit(ACTIONS.UNMUTE, {
                            roomId,
                            userId: user.id,
                        });
                    }
                    // console.log(
                    //     'localMediaStream ',
                    //     localMediaStream.current.getTracks()
                    // );
                    settled = true;
                }
                if (settled) {
                    clearInterval(interval);
                }
            }, 200);
        }
    }, [roomId]);

    useEffect(() => {
        return () => {
            Object.values(connections.current).forEach(pc => pc?.close());
            connections.current = {};
            audioElements.current = {};
        };
    }, []);


    return {
        clients,
        provideRef,
        handleMute,
    };
}