<template lang="pug">
.chart.relative(ref="chart")
	Bar(:data="chartData" :options="options")
</template>

<script setup lang="ts">
//@ts-ignore
import {Bar} from 'vue-chartjs';

import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	BarElement,
	CategoryScale,
	LinearScale
	//@ts-ignore
} from 'chart.js';
import {computed, onUnmounted, ref} from 'vue';

const props = defineProps<{
	data: {label: string; color: string; data: {[key: string]: number}}[] | undefined;
	color?: string;
}>();
const sessionLength = 60 * 1000;

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
const chart = ref(null);
let lastResize = Date.now();

function updateResized() {
	lastResize = Date.now();
}

window.addEventListener('resize', updateResized);
onUnmounted(() => window.removeEventListener('resize', updateResized));

const options = ref({
	responsive: true,
	maintainAspectRatio: false,
	onResize(c: unknown, size: {width: number; height: number}) {
		// Attempts to fix Chart.js resize flickering
		// TODO: might not work in all situations
		if (Date.now() - lastResize < 20) {
			return; // Regular window resize
		}

		if (chart.value.parentNode.clientWidth > size.width) {
			return; // Size is probably already fine
		}

		console.log('Chart resize loop detected, attempting to fix');
		const computedStyle = window.getComputedStyle(chart.value.parentNode);
		chart.value.parentNode.style.width =
			chart.value.parentNode.clientWidth -
			parseFloat(computedStyle.paddingLeft) -
			parseFloat(computedStyle.paddingRight) +
			'px';

		// Attempting again if everything else failed
		chart.value.parentNode.clientWidth < size.width &&
			setTimeout(() => {
				options.value.onResize(c, {width: chart.value.parentNode.clientWidth, height: size.height});
			});
	},
	scales: {
		x: {stacked: true, ticks: {color: props.color ?? '#000000'}},
		y: {stacked: true, ticks: {color: props.color ?? '#000000'}}
	},
	plugins: {legend: {labels: {color: props.color ?? '#000000'}}}
});
const labels: string[] = [];
for (let i = 0; i <= 30; ++i) {
	labels.push(30 - i + ' min');
}

const chartData = computed(() => {
	const datasets: {label: string; backgroundColor: string; data: number[]}[] = [];
	const startTime = Date.now() - (Date.now() % sessionLength) - sessionLength * 30;

	for (const series of props.data) {
		const dataset = {label: series.label, backgroundColor: series.color, data: [] as number[]};

		for (let i = 0; i <= 30; ++i) {
			dataset.data[i] = series.data?.[startTime + sessionLength * i] ?? 0;
		}

		datasets.push(dataset);
	}

	return {
		labels,
		datasets
	};
});
</script>

<style scoped></style>
