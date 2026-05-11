import React, { useState, useEffect } from 'react';
import Card from '../../../components/shared/Card/Card';
import Button from '../../../components/shared/Button/Button';
import styles from './StepAvatar.module.css';
import { useSelector, useDispatch } from 'react-redux';
import { setAvatar } from '../../../store/activateSlice';
import { activate } from '../../../http';
import { setAuth } from '../../../store/authSlice';
import Loader from '../../../components/shared/Loader/Loader';


const StepAvatar = ({ onNext }) => {
    const dispatch = useDispatch();
    const { name } = useSelector((state) => state.activate);  //add avatar also here if does not work anywhere

    const [image, setImage] = useState('/images/monkey-avatar.png');
    const [avatar, setAvatar] = useState(null);  //redux only support serializable data
    const [loading, setLoading] = useState(false);

    function captureImage(e) {
        const file = e.target.files[0];
        
        if (!file) return;
        setImage(URL.createObjectURL(file));
        setAvatar(file);  
    }

    async function submit() {
        if(!avatar) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('avatar', avatar);
            const { data } = await activate(formData); // send request to backend

            if (data.auth) {
                dispatch(setAuth(data));
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <Loader message="Activation in progress..." />;

    return (
        <>
            <Card title={`Okay, ${name}`} icon="monkey-emoji">
                <p className={styles.subHeading}>How’s this photo?</p>
                <div className={styles.avatarWrapper}>
                    <img
                        className={styles.avatarImage}
                        src={image}
                        alt="avatar"
                    />
                </div>
                <div>
                    <input
                        onChange={captureImage}
                        id="avatarInput"
                        type="file"
                        className={styles.avatarInput}
                    />
                    <label className={styles.avatarLabel} htmlFor="avatarInput">
                        Choose a different photo
                    </label>
                </div>
                <div>
                    <Button onClick={submit} text="Next" />
                </div>
            </Card>
        </>
    );
};

export default StepAvatar;