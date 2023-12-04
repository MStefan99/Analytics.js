<template lang="pug">
#apps
	h1 Your apps
	#apps-container(v-if="apps.length")
		RouterLink.block.card.my-4(
			v-for="app in apps"
			:key="app.id"
			:to="{name: 'status', params: {id: app.id}}")
			h2 {{app.name}}
			p {{app.description}}
		.d-flex
			button.mt-4(@click="newApp = emptyApp") Add an app
	div(v-else)
		h2 No apps yet
		p Add an app to start
		button.mt-4(@click="newApp = emptyApp") Add an app
	Transition(name="popup")
		.popup-wrapper(v-if="newApp" @click.self="newApp = null")
			.popup
				h2.popup-title New app
				form.popup-content(@submit.prevent="addApp")
					.mb-3
						label(for="name-input") Name
						input#name-input.w-full(type="text" placeholder="Name" v-model="newApp.name")
					.mb-3
						label(for="description-input") Description
						input#description-input.w-full(
							type="text"
							placeholder="Description"
							v-model="newApp.description")
					.mb-3
						button.w-full(type="submit") Add an app
</template>

<script setup lang="ts">
import {ref} from 'vue';
import type {App, NewApp} from '../scripts/types';
import Api from '../scripts/api';
import {useRouter} from 'vue-router';
import {alert, PopupColor} from '../scripts/popups';

const apps = ref<App[]>([]);
const newApp = ref<NewApp | null>(null);
const emptyApp: NewApp = {name: '', description: ''};
const router = useRouter();

window.document.title = 'Apps | Crash Course';

Api.apps
	.getAll()
	.then((a) => (apps.value = a))
	.catch((err) => alert('Failed to load apps', PopupColor.Red, err.message));

function addApp() {
	Api.apps
		.add(newApp.value)
		.then((a) => {
			router.replace({name: 'settings', params: {id: a.id}});
		})
		.catch((err) => alert('Failed to save the app', PopupColor.Red, err.message));
}
</script>

<style scoped></style>
