// Application status → badge, timeline and notifications shown in the app.
const TZ = 'Africa/Lagos';

export function fmtDate(ts) {
	if (!ts) return '';
	const d = new Date(ts);
	const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ });
	const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
	return `${date} • ${time}`;
}

export function statusView(status) {
	return (
		{
			submitted: { label: 'Submitted', tone: 'green' },
			reviewed: { label: 'Under Review', tone: 'amber' },
			approved: { label: 'Approved', tone: 'green' },
			rejected: { label: 'Not Successful', tone: 'red' },
			done: { label: 'Completed', tone: 'gray' }
		}[status] || { label: status || 'Submitted', tone: 'green' }
	);
}

/** Three-step timeline: Form Submitted → Under Review → Admission Status. state: done | pending | bad */
export function timeline(status, submittedAt) {
	const reviewed = ['reviewed', 'approved', 'rejected', 'done'].includes(status);
	const decided = ['approved', 'rejected', 'done'].includes(status);
	return [
		{ key: 'submitted', title: 'Form Submitted', sub: fmtDate(submittedAt), state: 'done' },
		{ key: 'review', title: 'Under Review', sub: reviewed ? 'Completed' : 'Pending', state: reviewed ? 'done' : 'pending' },
		{
			key: 'admission',
			title: 'Admission Status',
			sub: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Not successful' : status === 'done' ? 'Completed' : 'Pending',
			state: status === 'rejected' ? 'bad' : decided ? 'done' : 'pending'
		}
	];
}

/** Notifications are the finished steps of the timeline, newest first. */
export function notifications(me) {
	if (!me) return [];
	const list = [{ id: 'submitted', title: 'Application submitted', text: `Your application ${me.number} was received.`, at: me.submittedAt }];
	if (['reviewed', 'approved', 'rejected', 'done'].includes(me.status)) list.push({ id: 'review', title: 'Application reviewed', text: 'Your application has been reviewed by the admissions team.' });
	if (me.status === 'approved') list.push({ id: 'approved', title: 'Admission approved', text: 'Congratulations! Your application has been approved.' });
	if (me.status === 'rejected') list.push({ id: 'rejected', title: 'Application not successful', text: 'Your application was not successful. Contact support for help.' });
	if (me.status === 'done') list.push({ id: 'done', title: 'Application completed', text: 'Your application is complete and locked.' });
	return list.reverse();
}

// how many notifications this device has already opened (per application)
const key = (n) => `elitereg_seen_${n}`;
export function seenCount(n) {
	try {
		return Number(localStorage.getItem(key(n))) || 0;
	} catch {
		return 0;
	}
}
export function markSeen(n, count) {
	try {
		localStorage.setItem(key(n), String(count));
	} catch {
		/* ignore */
	}
}
