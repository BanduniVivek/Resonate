import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import styles from './Profile.module.css';
import { getProfile, followUser, unfollowUser, updateProfile } from '../../http';
import { setAuth } from '../../store/authSlice';
import FollowersFollowingOverlay from './FollowersFollowingOverlay';
import EditProfile from './EditProfile';

const avatarFallback = '/images/monkey-avatar.png';

function normalizeId(raw) {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && typeof raw.toString === 'function') {
        return raw.toString();
    }
    return String(raw);
}

const Profile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const me = useSelector((state) => state.auth.user);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editAvatar, setEditAvatar] = useState(null);
    const [listOverlay, setListOverlay] = useState(null);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await getProfile(userId);
            setProfile(data);
        } catch (e) {
            setProfile(null);
            setError(
                e.response?.data?.message ||
                    'Could not load this profile.'
            );
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Promise.resolve();
            if (cancelled) return;
            await loadProfile();
        })();
        return () => {
            cancelled = true;
        };
    }, [loadProfile]);

    useEffect(() => {
        if (!listOverlay) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [listOverlay]);

    const goBack = () => {
        navigate('/rooms');
    };

    const startEditing = () => {
        if (!profile) return;
        setEditName(profile.name || '');
        setEditBio(profile.bio || '');
        setEditAvatar(null);
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setEditAvatar(null);
    };

    const handleFollowToggle = async () => {
        if (!profile || profile.isMe) return;
        setActionLoading(true);
        try {
            if (profile.isFollowing) {
                await unfollowUser(userId);
            } else {
                await followUser(userId);
            }
            await loadProfile();
        } catch (e) {
            console.log(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const fd = new FormData();
            if (editName.trim()) fd.append('name', editName.trim());
            fd.append('bio', editBio);
            if (editAvatar) fd.append('avatar', editAvatar);
            const { data } = await updateProfile(fd);
            const u = data.user;
            dispatch(
                setAuth({
                    user: {
                        ...me,
                        id: normalizeId(u._id ?? u.id),
                        name: u.name,
                        avatar: u.avatar,
                        activated: u.activated,
                        phone: u.phone,
                        bio: u.bio ?? '',
                        createdAt: u.createdAt,
                    },
                })
            );
            cancelEditing();
            await loadProfile();
        } catch (e) {
            console.log(e);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="cardWrapper">
                <div className={styles.shell}>
                    <p className={styles.muted}>Loading profile…</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="cardWrapper">
                <div className={styles.shell}>
                    <button
                        type="button"
                        onClick={goBack}
                        className={styles.back}
                    >
                        <img src="/images/arrow-left.png" alt="" />
                        <span>Back</span>
                    </button>
                    <p className={styles.error}>
                        {error || 'Profile not found.'}
                    </p>
                </div>
            </div>
        );
    }

    const displayName = editing
        ? editName || 'Your name'
        : profile.name || 'Member';

    const overlayUsers =
        listOverlay === 'followers'
            ? profile.followers
            : listOverlay === 'following'
              ? profile.following
              : [];

    return (
        <>
            <div className={`container ${styles.page}`}>
                <button type="button" onClick={goBack} className={styles.back}>
                    <img src="/images/arrow-left.png" alt="" />
                    <span>Back to rooms</span>
                </button>

                <div className={styles.card}>
                    <div className={styles.header}>
                        <img
                            className={styles.avatarLarge}
                            src={profile.avatar || avatarFallback}
                            alt=""
                        />
                        <div className={styles.headerText}>
                            <h1 className={styles.name}>{displayName}</h1>
                            <div className={styles.stats}>

                                <button
                                    type="button"
                                    className={styles.statInline}
                                    onClick={() => setListOverlay('followers')}
                                >
                                    <span className={styles.statInlineNum}>
                                        {profile.followersCount ?? 0}
                                    </span>
                                    <span className={styles.statInlineLabel}>
                                        Followers
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className={styles.statInline}
                                    onClick={() => setListOverlay('following')}
                                >
                                    <span className={styles.statInlineNum}>
                                        {profile.followingCount ?? 0}
                                    </span>
                                    <span className={styles.statInlineLabel}>
                                        Following
                                    </span>
                                </button>

                            </div>
                            {profile.isMe ? (
                                editing ? (
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={cancelEditing}
                                    >
                                        Cancel editing
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={startEditing}
                                    >
                                        Edit profile
                                    </button>
                                )
                            ) : (
                                <button
                                    type="button"
                                    className={
                                        profile.isFollowing
                                            ? styles.secondaryBtn
                                            : styles.primaryBtn
                                    }
                                    disabled={actionLoading}
                                    onClick={handleFollowToggle}
                                >
                                    {profile.isFollowing
                                        ? 'Unfollow'
                                        : 'Follow'}
                                </button>
                            )}
                        </div>
                    </div>

                    {editing && profile.isMe ? (
                        <EditProfile
                            editName={editName}
                            setEditName={setEditName}
                            editBio={editBio}
                            setEditBio={setEditBio}
                            setEditAvatar={setEditAvatar}
                            actionLoading={actionLoading}
                            onSubmit={handleSaveProfile}
                        />
                    ) : (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Bio</h2>
                            <p className={styles.bio}>
                                {profile.bio?.trim()
                                    ? profile.bio
                                    : 'No bio yet.'}
                            </p>
                        </section>
                    )}
                </div>
            </div>

            <FollowersFollowingOverlay
                mode={listOverlay}
                users={overlayUsers}
                onClose={() => setListOverlay(null)}
            />
        </>
    );
};

export default Profile;
