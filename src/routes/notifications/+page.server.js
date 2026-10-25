import { redirect } from '@sveltejs/kit';

export async function load({ parent }) {
	const { me } = await parent();
	if (!me) redirect(303, '/login?next=/notifications');
	return {};
}
