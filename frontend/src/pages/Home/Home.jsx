import React from 'react';
import styles from './Home.module.css';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/shared/Card/Card';
import Button from '../../components/shared/Button/Button';


const Home = () => {
    const signInLinkStyle = {
        color: '#0077ff',
        fontWeight: 'bold',
        textDecoration: 'none',
        marginLeft: '10px',
    };
    const navigate = useNavigate();
    function startRegister() {
        navigate('/register');
    }
    return (
        <div className={styles.cardWrapper}>
            <Card title="Welcome to Resonate!" icon="logo">
                <p className={styles.text}>
                A space where talk feels natural and ideas flow freely. Join a room, share your voice, and find the people who speak your language, all in real time.
                </p>
                <div>
                    <Button onClick={startRegister} text="Get your username" />
                </div>
                
                <div className={styles.signinWrapper}>
                    <span className={styles.hasInvite}>
                        Have an invite text?
                    </span>
                    <Link style={signInLinkStyle} to="/login">
                        Sign in
                    </Link>
                </div>
            </Card>
        </div>
    );
};

export default Home;