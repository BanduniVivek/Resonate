export function formatStartedAgo(isoDate) {
    if (!isoDate) return '';
    const started = new Date(isoDate);
    const now = Date.now();
    const diffMs = Math.max(0, now - started.getTime());
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day > 0) return `Started ${day}d ago`;
    if (hr > 0) return `Started ${hr}h ago`;
    if (min > 0) return `Started ${min}m ago`;
    return 'Started just now';
}

export function formatEndedAgo(isoDate) {
    if (!isoDate) return 'Ended';
    const ended = new Date(isoDate);
    const now = Date.now();
    const diffMs = Math.max(0, now - ended.getTime());
    const min = Math.floor(diffMs / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day > 0) return `Ended ${day}d ago`;
    if (hr > 0) return `Ended ${hr}h ago`;
    if (min > 0) return `Ended ${min}m ago`;
    return 'Ended just now';
}
