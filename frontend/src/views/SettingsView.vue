<template lang="pug">
#settings(v-if="app")
	h1 {{app.name}} settings
	.row
		.card.accent(v-if="hasPermissions([PERMISSIONS.VIEW_SETTINGS], app.permissions)")
			h2 Scripts
			p.mb-4 To start collecting audience data, please add the following script to every page of your website:
			pre.code.snippet.mb-4.
				&lt;script async type="module"&gt;
					import {sendHit} from '{{appState.backendURL + '/cc?k=' + app.audienceKey}}';
					sendHit();
				&lt;/script&gt;
			p.mb-4.
				The script above will send usage data to Crash Course every time someone opens your app.
				If you want to use more Crash Course functionality like sending logs, you can import the necessary library
				in your code like this:
			pre.code.snippet.
				import crashCourse from '{{appState.backendURL + '/cc?k=' + app.audienceKey}}';
		.card
			h2 Configuration
			h3 Host
			p.mb-2.
				When setting up an app, you will need to provide a URL for your app to find Crash Course.
			span Here is the URL you are using to access Crash Course:
			.code.snippet.border.mb-4 {{appState.backendURL}}
			h3 Audience Key
			p.mb-2.
				You will use this key to collect audience data, such as page views, logs, feedback, etc.
				It is also used in the audience script you will need to add to your website. Please note that this key must be
				publicly available for your app to be able to send information. However, this also means that your users
				might be able to retrieve this key and use it to send arbitrary information.
			div(v-if="hasPermissions([PERMISSIONS.VIEW_SETTINGS], app.permissions)")
				span Here is your audience key:
				.code.snippet.border.mb-4 {{app.audienceKey}}
			h3 Telemetry key
			p.mb-2.
				You will use this key to collect telemetry data from your server, such as logs and crash reports, hardware load
				and so on. This key is best kept private so that the data coming back can be fully trusted.
			div(v-if="hasPermissions([PERMISSIONS.VIEW_SETTINGS], app.permissions)")
				span Here is your telemetry key:
				.code.snippet.border.mb-4 {{app.telemetryKey}}
		.card.full(v-if="hasPermissions([PERMISSIONS.EDIT_SETTINGS], app.permissions)")
			h2 Edit app
			form(@submit.prevent="saveChanges()")
				.mb-3
					label(for="name-input") App name
					input#name-input.w-full(type="text" placeholder="Name" v-model="newName")
				.mb-3
					label(for="description-input") App description
					textarea#description-input.w-full(placeholder="Description" v-model="app.description")
				button.w-full(
					type="submit"
					v-if="hasPermissions([PERMISSIONS.EDIT_SETTINGS], app.permissions)") Save changes
		.card(v-if="hasPermissions([PERMISSIONS.EDIT_PERMISSIONS], app.permissions)")
			h2 Permissions
			.flex.flex-row.flex-wrap.gap-2
				.card.grow(v-for="p in permissions" :key="p.userID")
					h3 {{p.username}}
					PermissionSelector(v-model="p.permissions" :allowed="app.permissions")
					button.w-full.green(type="button" @click="setPermissions(p)") Save
					button.w-full.red(type="button" @click="revokePermissions(p)") Remove
				.card.grow
					input(type="text" placeholder="Username" v-model="newPermissions.username")
					PermissionSelector(v-model="newPermissions.permissions" :allowed="app.permissions")
					button.w-full.green(type="button" @click="addPermissions()") Add
			.mt-4
				button.w-full.red(
					type="button"
					v-if="hasPermissions([PERMISSIONS.EDIT_PERMISSIONS], app.permissions)"
					@click="deleteApp()") Delete app
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import type {App, AppPermissions} from '../scripts/types';
import Api from '../scripts/api';
import appState from '../scripts/store';
import {alert, confirm, PopupColor, prompt} from '../scripts/popups';
import {hasPermissions, PERMISSIONS} from '../../../common/permissions';
import PermissionSelector from '../components/PermissionSelector.vue';

const router = useRouter();
const route = useRoute();
const app = ref<App | null>(null);
const permissions = ref<AppPermissions[] | null>(null);
const newName = ref<string>('');
const newPermissions = ref<{username: string; permissions: number}>({
	username: '',
	permissions: 0
});

Api.apps
	.getByID(+route.params.id)
	.then((a) => {
		newName.value = a.name;
		app.value = a;
		window.document.title = a.name + ' settings | Crash Course';
	})
	.catch((err) => alert('Failed to load app', PopupColor.Red, err.message));

Api.apps.getPermissions(+route.params.id).then((p) => {
	permissions.value = p;
});

function saveChanges() {
	app.value.name = newName.value;

	Api.apps
		.edit(app.value)
		.then((a) => {
			app.value = a;
			alert('Changes saved', PopupColor.Green, 'Changes saved successfully!');
		})
		.catch((err) => alert('Failed to save app', PopupColor.Red, err.message));
}

async function addPermissions() {
	if (!newPermissions.value.username?.length) {
		alert('No username', PopupColor.Red, 'Please provide a username');
		return;
	}

	Api.apps
		.setPermissions(app.value.id, newPermissions.value.username, newPermissions.value.permissions)
		.then((p) => {
			permissions.value = p;
			newPermissions.value.username = '';
			newPermissions.value.permissions = 0;
			alert('Permissions saved', PopupColor.Green, 'Permissions were saved');
		})
		.catch((err) => alert('Failed to add a user', PopupColor.Red, err.message));
}

async function setPermissions(p: AppPermissions) {
	if (
		p.userID === appState.user.id &&
		!hasPermissions([PERMISSIONS.EDIT_PERMISSIONS], p.permissions) &&
		(await prompt(
			'You are about to revoke permissions from yourself!',
			PopupColor.Red,
			'If you proceed, you will lose the ability to edit permissions for this app! Type "Revoke my permissions" to proceed.'
		)) !== 'Revoke my permissions'
	) {
		return;
	}

	Api.apps
		.setPermissions(app.value.id, p.username, p.permissions)
		.then((p) => {
			permissions.value = p;
			alert('Permissions saved', PopupColor.Green, 'Permissions were saved');
		})
		.catch((err) => alert('Failed to save permissions', PopupColor.Red, err.message));
}

async function revokePermissions(p: AppPermissions) {
	if (p.userID === appState.user.id) {
		if (
			(await prompt(
				'You are about to lose access to this app!',
				PopupColor.Red,
				'If you proceed, you will lose access to this app! Type "Revoke my permissions" to proceed.'
			)) !== 'Revoke my permissions'
		) {
			return;
		}
	} else {
		if (
			!(await confirm(
				'Are you sure?',
				PopupColor.Red,
				'Are you sure you want to revoke ' + p.username + "'s access to this app?"
			))
		) {
			return;
		}
	}

	Api.apps
		.revokePermissions(app.value.id, p.username)
		.then((p) => {
			permissions.value = p;
			alert('Permissions saved', PopupColor.Green, 'Permissions were saved');
		})
		.catch((err) => alert('Failed to add a user', PopupColor.Red, err.message));
}

async function deleteApp() {
	if (
		(await prompt(
			'Are you sure you want to delete ' + app.value.name + '?',
			PopupColor.Red,
			'The application and all its data will be deleted. Do you still wish to delete ' +
				app.value.name +
				'? Type "Delete ' +
				app.value.name +
				'" to proceed.'
		)) !==
		'Delete ' + app.value.name
	) {
		return;
	}

	Api.apps
		.delete(app.value)
		.then((a) => {
			router.replace({name: 'apps'});
			alert(a.name + ' deleted', PopupColor.Green, 'App was successfully deleted');
		})
		.catch((err) => alert('Failed to delete app', PopupColor.Red, err.message));
}
</script>

<style scoped>
.row > .card {
	flex-basis: 500px;
}

.row > .card.full {
	flex-basis: 100%;
}
</style>
