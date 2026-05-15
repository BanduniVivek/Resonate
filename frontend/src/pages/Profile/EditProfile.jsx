import styles from './Profile.module.css';

const EditProfile = ({
    editName,
    setEditName,
    editBio,
    setEditBio,
    setEditAvatar,
    actionLoading,
    onSubmit,
}) => {
    return (
        <>
            <section className={styles.section}>
                <div className={styles.editHeader}>
                    <h2 className={styles.sectionTitle}>
                        Edit profile
                    </h2>

                </div>

                <form onSubmit={onSubmit}>
                    <div className={styles.field}>
                        <label className={styles.label}>
                            Display name
                        </label>

                        <input
                            className={styles.input}
                            value={editName}
                            onChange={(e) =>
                                setEditName(e.target.value)
                            }
                            required
                            minLength={1}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>
                            Bio
                        </label>

                        <textarea
                            className={styles.textarea}
                            rows={4}
                            value={editBio}
                            onChange={(e) =>
                                setEditBio(e.target.value)
                            }
                            placeholder="Tell others about you"
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>
                            New photo
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            className={styles.file}
                            onChange={(e) =>
                                setEditAvatar(
                                    e.target.files?.[0] || null
                                )
                            }
                        />
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="submit"
                            className={styles.primaryBtn}
                            disabled={actionLoading}
                        >
                            Save changes
                        </button>
                    </div>
                </form>
            </section>
        </>
    );
};

export default EditProfile;