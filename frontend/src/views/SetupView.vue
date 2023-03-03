<template lang="pug">
#setup(v-if="app")
	h1 App setup
	.row
		.card.accent.m-4
			h2 Audience
			p.mb-4 To start collecting audience data, please add the following script to every page of your website:
			pre.code.snippet.
				&lt;script async type="module" src="{{appState.backendURL + '/cc?k=' + app.audienceKey}}"&gt;
				&lt;script&gt;
					window.cc = window.cc || [];

					window.cc.pop(); // This line will record every time the page is opened.
				&lt;/script&gt;
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
					input#name-input(type="text" name="name" v-model="app.name")
				.mb-3
					label(for="description-input") App description
					textarea#description-input(name="description" v-model="app.description")
				button(type="submit") Save changes
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import type {App} from '../scripts/types';
import Api from '../scripts/api';
import appState from '../scripts/store';
import {alert, PopupColor} from '../scripts/popups';

const route = useRoute();
const app = ref<App | null>(null);

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));

function saveChanges() {
	Api.apps
		.edit(app.value)
		.then(() => alert('Changes saved', PopupColor.Green, 'Changes saved successfully!'));
}
</script>

<style scoped>
.card {
	@apply basis-1/3;
}
</style>
