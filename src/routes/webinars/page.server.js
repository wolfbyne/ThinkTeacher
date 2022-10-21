import { error } from '@sveltejs/kit';
import { api } from '$lib/db'

export async function load() {
	const res = await api('GET', `webinars`);

	if (res.ok) {
		const data = await res.json().data;
		return { webinars: data };
	}

	throw error(res.status);
};