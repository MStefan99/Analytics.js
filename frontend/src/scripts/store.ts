import {reactive} from 'vue';

import type {User} from './types';

type Store = {
	backendURL: string | null;
	apiKey: string | null;
	user: User | null;
	setUrl: (url: string | null) => void;
	setApiKey: (key: string | null) => void;
	setConnectionDialogOpen: (open: boolean) => void;
	setUser: (user: User | null) => void;
};

export const appState = reactive({
	backendURL: localStorage.getItem('backendURL') ?? null,
	apiKey: localStorage.getItem('apiKey') ?? null,
	user: null,
	setUrl(url) {
		url = url?.replace(/\/$/, '') ?? null;
		this.backendURL = url;
		if (url !== null) {
			localStorage.setItem('backendURL', url);
		} else {
			localStorage.removeItem('backendURL');
		}
	},
	setApiKey(key) {
		this.apiKey = key;
		if (key !== null) {
			localStorage.setItem('apiKey', key);
		} else {
			localStorage.removeItem('apiKey');
		}
	},
	setUser(user: User | null): void {
		this.user = user;
	}
} as Store);

export default appState;
