<template lang="pug">
#logs
	h1 {{app?.name}} {{$route.params.type === 'client' ? 'client' : 'server'}} logs
	.row.py-3.sticky.top-0.glass
		.input
			label(for="date-input") Starting from
			DatePicker#date-input.w-full(v-model="start" @change="loadLogs()")
		.input
			label(for="date-input") Ending on
			DatePicker#date-input.w-full(v-model="end" @change="loadLogs()")
		.input
			label(for="level-input") Minimum level
			DropdownSelect#level-input.w-full(:options="levels" v-model="level" @change="loadLogs()")
	div(v-if="historicalLogs")
		TimedChart.history-chart(:data="chartData" end="data")
	table.cells.w-full
		thead
			tr
				th Level
				th Tag
				th Time
				th Message
		tbody
			tr.log-row(:class="'log-' + log.level" v-for="log in logs" :key="log.id")
				td.log-level(:class="'log-' + log.level") {{levels[log.level]}}
				td {{log.tag}}
				td {{new Date(log.time).toLocaleString()}}
				td.code {{log.message}}
			tr(v-if="!logs.length")
				td.text-center(colspan="4") No logs found matching your criteria
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router';
import {computed, onUnmounted, ref} from 'vue';
import type {App, Log, LogAggregate} from '../scripts/types';
import DropdownSelect from '../components/DropdownSelect.vue';
import DatePicker from '../components/DatePicker.vue';
import TimedChart from '../components/TimedChart.vue';
import {alert, PopupColor} from '../scripts/popups';
import Api from '../scripts/api';
import {useQuery} from '../scripts/composables';

const route = useRoute();
const app = ref<App | null>(null);
const logs = ref<Log[]>([]);
const historicalLogs = ref<LogAggregate | null>(null);
const dayLength = 1000 * 60 * 60 * 24;
const now = new Date();
const levels = ['Debug', 'Information', 'Warning', 'Error', 'Critical'];

const start = ref<Date>(new Date(now.getTime() - dayLength));
const end = ref<Date>(now);
const level = ref<number>(1);

const {query} = useQuery(
	computed(() => ({
		start: start.value.toISOString(),
		end: end.value.toISOString(),
		level: level.value.toString()
	}))
);
start.value = new Date(Array.isArray(query.value.start) ? query.value.start[0] : query.value.start);
end.value = new Date(Array.isArray(query.value.end) ? query.value.end[0] : query.value.end);
level.value = Array.isArray(query.value.level) ? +query.value.level[0] : +query.value.level;

const colors = {
	debug: '#4f46e5',
	info: '#059669',
	warning: '#ca8a04',
	error: '#ea580c',
	critical: '#e11d48'
};

const chartData = computed(() => [
	{
		label: 'Debug logs',
		color: colors.debug,
		data: historicalLogs.value['0']
	},
	{
		label: 'Info logs',
		color: colors.info,
		data: historicalLogs.value['1']
	},
	{
		label: 'Warnings',
		color: colors.warning,
		data: historicalLogs.value['2']
	},
	{
		label: 'Errors',
		color: colors.error,
		data: historicalLogs.value['3']
	},
	{
		label: 'Critical',
		color: colors.critical,
		data: historicalLogs.value['4']
	}
]);

const type = route.params.type === 'client' ? 'client' : 'server';

Api.apps.getByID(+route.params.id).then((a) => {
	app.value = a;
	window.document.title = a.name + ' logs | Crash Course';
});

function loadLogs() {
	if (Date.now() - end.value.getTime() < 1000 * 60) {
		end.value = new Date();
	}

	Api.apps
		.getLogAggregate(+route.params.id, type, start.value.getTime(), end.value.getTime())
		.then((l) => (historicalLogs.value = l));
	Api.apps
		.getLogs(+route.params.id, type, level.value, start.value.getTime(), end.value.getTime())
		.then((l) => (logs.value = l))
		.catch((err) => alert('Failed to load logs', PopupColor.Red, err.message));
}

loadLogs();

const refreshInterval = setInterval(loadLogs, 1000 * 20);
onUnmounted(() => clearInterval(refreshInterval));
</script>

<style scoped>
.history-chart {
	min-width: min(90vw, 1024px);
}
</style>
