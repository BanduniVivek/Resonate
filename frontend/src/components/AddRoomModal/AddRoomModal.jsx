import React, { useState } from 'react';
import styles from './AddRoomModal.module.css'; 
import TextInput from '../shared/TextInput/TextInput';
import { createRoom as create } from '../../http';
import { useNavigate } from 'react-router-dom';

const AddRoomModel = ({ onClose }) => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [roomType, setRoomType] = useState('open');
  const [speakMode, setSpeakMode] = useState('moderated');


  async function createRoom() {
    try {
        if (!topic) return;
        const { data } = await create({ topic, roomType, speakMode });
        navigate(`/room/${data.id}`);
        console.log(data);
    } catch (err) {
        console.log(err.message);
    }
}

  

  return (
    <div className={styles.modalMask}>
        <div className={styles.modalBody}>
            <button 
            onClick={onClose} 
            className={styles.closeButton}>
                <img src="/images/close.png" alt="close" />
            </button>
            <div className={styles.modalHeader}>
                <h3 className={styles.heading}>
                    Enter the topic to be disscussed
                </h3>
                <TextInput
                    fullwidth="true"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                />
                <h2 className={styles.subHeading}>Room types</h2>
                <div className={styles.roomTypes}>
                    <div
                        onClick={() => setRoomType('open')}
                        className={`${styles.typeBox} ${
                            roomType === 'open' ? styles.active : ''
                        }`}
                    >
                        <img src="/images/globe.png" alt="globe" />
                        <span>Open</span>
                    </div>
                    <div
                        onClick={() => setRoomType('subscriber')}
                        className={`${styles.typeBox} ${
                            roomType === 'subscriber' ? styles.active : ''
                        }`}
                    >
                        <img src="/images/social.png" alt="subscriber" />
                        <span>Subscriber</span>
                    </div>
                    <div
                        onClick={() => setRoomType('private')}
                        className={`${styles.typeBox} ${
                            roomType === 'private' ? styles.active : ''
                        }`}
                    >
                        <img src="/images/lock.png" alt="lock" />
                        <span>Private</span>
                    </div>
                </div>
                <h2 className={styles.subHeading}>Who can speak?</h2>
                <div className={styles.speakModes}>
                    <div
                        onClick={() => setSpeakMode('moderated')}
                        className={`${styles.speakModeBox} ${
                            speakMode === 'moderated' ? styles.active : ''
                        }`}
                    >
                        <span>Everyone joins muted</span>
                        <small>Listeners need host approval to speak</small>
                    </div>
                    <div
                        onClick={() => setSpeakMode('open')}
                        className={`${styles.speakModeBox} ${
                            speakMode === 'open' ? styles.active : ''
                        }`}
                    >
                        <span>Free to speak</span>
                        <small>Anyone can unmute when they join</small>
                    </div>
                </div>
            </div>
            <div className={styles.modalFooter}>
                <h2>
                    {roomType === 'private'
                        ? 'Start a private room — share the invite code with guests'
                        : roomType === 'subscriber'
                          ? 'Start a subscriber-only room'
                          : 'Start a room, open to everyone'}
                </h2>
                <button
                    onClick={createRoom}
                    className={styles.footerButton}
                >
                    <img src="/images/celebration.png" alt="celebration" />
                    <span>Let's go</span>
                </button>
            </div>
        </div>
    </div>
);
}

export default AddRoomModel