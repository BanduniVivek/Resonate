import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './JoinWithCodeModal.module.css';
import TextInput from '../shared/TextInput/TextInput';
import { joinRoomByCode } from '../../http';

const JoinWithCodeModal = ({ onClose }) => {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleJoin() {
        const trimmed = code.trim();
        if (!trimmed) {
            setError('Enter an invite code');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const { data } = await joinRoomByCode(trimmed);
            navigate(`/room/${data.id}`);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    'Could not join with that code'
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.modalMask}>
            <div className={styles.modalBody}>
                <button
                    type="button"
                    onClick={onClose}
                    className={styles.closeButton}
                    aria-label="Close"
                >
                    <img src="/images/close.png" alt="" />
                </button>
                <div className={styles.modalHeader}>
                    <h3 className={styles.heading}>Join with invite code</h3>
                    <p className={styles.hint}>
                        Enter the code shared by the room host (e.g. X7K2P9QR)
                    </p>
                    <TextInput
                        fullwidth="true"
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value.toUpperCase());
                            setError('');
                        }}
                        placeholder="Invite code"
                    />
                    {error && (
                        <p className={styles.error} role="alert">
                            {error}
                        </p>
                    )}
                </div>
                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        onClick={handleJoin}
                        disabled={submitting}
                        className={styles.footerButton}
                    >
                        <span>{submitting ? 'Joining…' : 'Join room'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinWithCodeModal;
