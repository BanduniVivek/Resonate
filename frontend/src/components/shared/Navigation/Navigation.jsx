import { Link, useLocation } from 'react-router-dom';
import styles from './Navigation.module.css';
import { logout } from '../../../http';
import { useDispatch, useSelector } from 'react-redux';
import { setAuth } from '../../../store/authSlice';
import NavFindPeople from './NavFindPeople';

const Navigation = () => {
    const brandStyle = {
        color: '#fff',
        textDecoration: 'none',
        fontWeight: 'bold',
        fontSize: '22px',
        display: 'flex',
        alignItems: 'center',
    };

    const logoText = {
        marginLeft: '10px',
    };
    const dispatch = useDispatch();
    const { isAuth, user } = useSelector((state) => state.auth);

    async function logoutUser() {
        try {
            const { data } = await logout();
            dispatch(setAuth(data));
        } catch (err) {
            console.log(err);
        }
    }

    return (
        <nav className={`${styles.navbar} container`}>
            <div className={styles.navLeft}>
                <Link style={brandStyle} to="/">
                    <img src="/images/logo.png" alt="logo" />
                    <span style={logoText}> Resonate </span>
                </Link>
            </div>
            
            {isAuth && <div className={styles.navCenter}>
                <NavFindPeople />
            </div>}
            
            {isAuth && (
                <div className={styles.navRight}>
                    {user?.id ? (
                        <Link
                            to={`/profile/${user.id}`}
                            style={{
                                color: '#fff',
                                textDecoration: 'none',
                                marginRight: 8,
                            }}
                        >
                            <h3>{user?.name}</h3>
                        </Link>
                    ) : (
                        <h3>{user?.name}</h3>
                    )}
                    {user?.id ? (
                        <Link to={`/profile/${user.id}`}>
                            <img
                                className={styles.avatar}
                                src={
                                    user?.avatar
                                        ? user.avatar
                                        : '/images/monkey-avatar.png'
                                }
                                width="40"
                                height="40"
                                alt="avatar"
                            />
                        </Link>
                    ) : (
                        <img
                            className={styles.avatar}
                            src={
                                user?.avatar
                                    ? user.avatar
                                    : '/images/monkey-avatar.png'
                            }
                            width="40"
                            height="40"
                            alt="avatar"
                        />
                    )}
                    <button
                        className={styles.logoutButton}
                        onClick={logoutUser}
                    >
                        <img src="/images/logout.png" alt="logout" />
                    </button>
                </div>
            )}
        </nav>
    );
};

export default Navigation;
