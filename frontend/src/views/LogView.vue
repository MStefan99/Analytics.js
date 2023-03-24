<template lang="pug">
#logs
	h1 {{$route.params.type === 'client' ? 'Client' : 'Server'}} logs
	.row.py-3.sticky.top-0.glass
		.input
			label(for="date-input") Starting from
			DatePicker#date-input(type="date" v-model="startTime" @change="loadLogs()")
		.input
			label(for="level-input") Minimum level
			DropdownSelect#level-input(:options="levels" v-model="level" @change="loadLogs()")
	table.cells
		thead
			tr
				th Level
				th Tag
				th Time
				th Message
		tbody
			tr.log-row(:class="'log-' + log.level" v-for="log in logs" :key="log.time")
				td.log-level(:class="'log-' + log.level") {{levels[log.level]}}
				td {{log.tag}}
				td {{new Date(log.time).toLocaleString()}}
				td.code {{log.message}}
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router';
import {onUnmounted, ref} from 'vue';
import type {Log} from '../scripts/types';
import DropdownSelect from '../components/DropdownSelect.vue';
import DatePicker from '../components/DatePicker.vue';
import {alert, PopupColor} from '../scripts/popups';
import Api from '../scripts/api';

const route = useRoute();
const logs = ref<Log[]>([]);
const dayLength = 1000 * 60 * 60 * 24;
const initialDate = new Date(Date.now() - dayLength);
const levels = ['Debug', 'Information', 'Warning', 'Error', 'Critical'];

const startTime = ref<Date>(initialDate);
const level = ref<number>(1);

window.document.title = 'Logs | Crash Course';

function loadLogs() {
	Api.apps
		.getLogs(
			+route.params.id,
			route.params.type === 'client' ? 'client' : 'server',
			startTime.value.getTime(),
			level.value
		)
		.then((l) => (logs.value = l))
		.catch((err) => alert('Failed to load logs', PopupColor.Red, err.message));
}

loadLogs();
const interval = setInterval(loadLogs, 1000 * 30);
onUnmounted(() => clearInterval(interval));
</script>

<style scoped></style>
