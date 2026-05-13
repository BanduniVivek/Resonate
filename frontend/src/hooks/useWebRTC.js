import { useEffect, useState, useRef, useCallback } from 'react';
import { useStateWithCallback } from './useStateWithCallback';
import socketInit from '../socket';
import freeice from 'freeice';
import { ACTIONS } from '../actions';
// const users = [
//     {
//         id: 1,
//         name : 'rakesh'
//     },
//     {
//         id: 2,
//         name : 'vivek'
//     }
// ]
export const useWebRTC = (roomId, user) =>{
    const [clients, setClients] = useStateWithCallback([]);
       //set client can now also have a callback


    const audioElements = useRef({});  //Stores references to <audio> DOM elements.
    const connections = useRef({}); //Stores WebRTC peer connections.
    const socket = useRef(null);  //Stores Socket.IO connection.
    const localMediaStream = useRef(null);  //Stores your microphone audio stream.
    const clientsRef = useRef([]);  //Stores latest clients array

    useEffect(() => {
        socket.current = socketInit();
    }, []);


    const provideRef = (instance, userId) => {
        audioElements.current[userId] = instance;
    };

    //start capturing
    useEffect(() => {
        const startCapture = async () => {
            // Start capturing local audio stream.
            localMediaStream.current =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
        };

        startCapture().then(() => {
            // add user to clients list
            addNewClient({ ...user, muted: true }, () => {
                const localElement = audioElements.current[user.id];
                if (localElement) {
                    localElement.volume = 0;
                    localElement.srcObject = localMediaStream.current;
                }
            });
            console.log("joined")
            // Emit the action to join
            socket.current.emit(ACTIONS.JOIN, {
                roomId,
                user,
            });
        });

        // Leaving the room
        //cleanupfunction works when the room component unmounts
        return () => {
            localMediaStream.current
                .getTracks()
                .forEach((track) => track.stop());
            socket.current.emit(ACTIONS.LEAVE, { roomId });
        };
    }, []);


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
        [clients, setClients]
    );

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
        const handleRemovePeer = ({ peerID, userId }) => {
            console.log('leaving', peerID, userId);

            if (connections.current[peerID]) {
                connections.current[peerID].close();
            }

            delete connections.current[peerID];
            delete audioElements.current[peerID];

            setClients((list) => list.filter((c) => c.id !== userId));
        };

        socket.current.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

        return () => {
            socket.current.off(ACTIONS.REMOVE_PEER);
        };
    }, []);


    return {
        clients,
        provideRef,
        // handleMute,
        localStream: localMediaStream.current,
    };

    
}