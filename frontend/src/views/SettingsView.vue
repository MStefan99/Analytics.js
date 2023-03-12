<template lang="pug">
#settings(v-if="app")
	h1 {{app.name}} settings
	.row
		.card.accent.m-4
			h2 Audience
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
		.card.m-4
			h2 Keys
			h3 Audience Key
			p.mb-2.
				You will use this key to collect audience data, such as page views, logs, feedback, etc.
				It is also used in the audience script you will need to add to your website. Please note that this key must be
				publicly available for your app to be able to send information. However, this also means that your users
				might be able to retrieve this key and use it to send arbitrary information. Here is your audience key:
			.code.snippet.border.mb-4 {{app.audienceKey}}
			h3 Telemetry key
			p.mb-2.
				You will use this key to collect telemetry data from your server, such as logs and crash reports, hardware load
				and so on. This key is best kept private so that the data coming back can be fully trusted.
				Here is your telemetry key:
			.code.snippet.border.mb-4 {{app.telemetryKey}}
		.card.m-4
			h2 Edit app
			form(@submit.prevent="saveChanges()")
				.mb-3
					label(for="name-input") App name
					input#name-input.w-full(type="text" placeholder="Name" v-model="newName")
				.mb-3
					label(for="description-input") App description
					textarea#description-input.w-full(placeholder="Description" v-model="app.description")
				button.w-full(type="submit") Save changes
			.mt-4
				button.w-full.red(type="button" @click="deleteApp()") Delete app
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import type {App} from '../scripts/types';
import Api from '../scripts/api';
import appState from '../scripts/store';
import {alert, confirm, PopupColor} from '../scripts/popups';

const route = useRoute();
const app = ref<App | null>(null);
const newName = ref<string>('');

Api.apps.getByID(+route.params.id).then((a) => {
	newName.value = a.name;
	app.value = a;
});

function saveChanges() {
	app.value.name = newName.value;

	Api.apps.edit(app.value).then((a) => {
		app.value = a;
		alert('Changes saved', PopupColor.Green, 'Changes saved successfully!');
	});
}

async function deleteApp() {
	if (
		!(await confirm(
			'Are you sure you want to delete ' + app.value.name + '?',
			PopupColor.Red,
			'Warning, all application data will be deleted. Please confirm to proceed.'
		))
	) {
		return;
	}

	Api.apps.delete(app.value).then((a) => {
		alert(a.name + ' deleted', PopupColor.Green, 'App was successfully deleted');
	});
}
</script>

<style scoped>
.row .card {
	flex-basis: 500px;
}
</style>
