<template lang="pug">
#profile
	h1 Profile
	h2 Username and password
	.mb-2
		span You are signed in as
			|
			|
			b {{appState.user.username}}
	form(@submit.prevent="updateUser()")
		input(v-model="newUser.username" hidden autocomplete="username")
		label(for="password-input") Password
		input#password-input.block.my-2(
			type="password"
			v-model="newUser.password"
			autocomplete="new-password")
		label(for="password-repeat-input") Repeat password
		input#password-repeat-input.block.my-2(
			type="password"
			v-model="passwordRepeat"
			autocomplete="new-password")
		p.mb-2.text-red(v-if="(newUser.password ?? '') !== passwordRepeat") Passwords do not match
		button(type="submit" :class="{disabled: !formValid}" :disabled="!formValid") Save
	.sessions
		h2 Active sessions
		table.w-full
			thead
				tr
					th Location
					th Device
					th Created at
			tbody
				tr(v-for="session in sessions" :key="session.id")
					td {{session.ip}}
					td {{parseUA(session.ua)}}
					td {{new Date(session.time).toLocaleString()}}
					td
						button(@click="logout(session)") Sign out
			button(@click="logoutAll()") Sign out everywhere
			button.red(@click="deleteAccount()") Delete your account
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';

import appState from '../scripts/store';
import store from '../scripts/store';
import Api from '../scripts/api';
import type {Session, UpdateUser} from '../scripts/types';
import {alert, confirm, PopupColor} from '../scripts/popups';
import {parseUA} from '../scripts/util';

const sessions = ref<Session[]>([]);
const newUser = ref<UpdateUser>({id: appState.user.id});
const passwordRepeat = ref<string>('');
const formValid = computed<boolean>(
	() =>
		(newUser.value.password?.length
			? passwordRepeat.value.length && newUser.value.password === passwordRepeat.value
			: false) || !!newUser.value.username?.length
);

window.document.title = 'Profile | Crash Course';

function updateUser() {
	if (
		newUser.value.password?.length &&
		passwordRepeat.value.length &&
		newUser.value.password !== passwordRepeat.value
	) {
		alert(
			'Passwords do not match',
			PopupColor.Red,
			'Please check that both passwords are the same'
		);
		return;
	}

	Api.auth
		.edit(newUser.value)
		.then(() => {
			alert(
				'Information changed',
				PopupColor.Green,
				'Your user info was successfully changed. Consider signing out your active sessions'
			);
			store.user.username = newUser.value.username;
			newUser.value.username = newUser.value.password = passwordRepeat.value = '';
		})
		.catch((err) => alert('Could not change your password', PopupColor.Red, err.message));
}

function logout(session: Session) {
	Api.sessions
		.logout(session.id)
		.catch((err) => alert('Failed to sign out', PopupColor.Red, err.message));
	sessions.value.splice(sessions.value.indexOf(session), 1);
}

function logoutAll() {
	Api.sessions.logoutAll().catch((err) => alert('Failed to sign out', PopupColor.Red, err.message));
}

async function deleteAccount() {
	if (
		!(await confirm(
			'Are you sure you want to delete your account?',
			PopupColor.Red,
			'Warning, your account and all application data will be deleted. Please confirm to proceed.'
		))
	) {
		return;
	}

	Api.auth.delete().catch((err) => alert('Failed to delete account', PopupColor.Red, err.message));
}

onMounted(() =>
	Api.sessions
		.getAll()
		.then((s) => (sessions.value = s))
		.catch((err) => alert('Could not load sessions', PopupColor.Red, err.message))
);
</script>

<style scoped>
th {
	text-align: left;
}
</style>
